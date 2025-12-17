import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktContractService } from 'src/mkt-core/contract/services/mkt-contract.service';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga/order-saga.interface';
import { CreateOrderWithItemsInput } from 'src/mkt-core/order/types';

// ============================================
// STEP OUTPUT TYPE
// ============================================

export type FinalizeOrderStepOutput = {
  orderStatus: ORDER_STATUS;
  contractId?: string;
};

/**
 * FinalizeOrderStep - Step 5: Finalize order và tạo contract nếu cần
 *
 * Thực hiện:
 * - Update order status cuối cùng
 * - Tạo contract nếu requireContract = true
 * - Update trial order status nếu TRIAL_TO_PAID
 * - Prepare data cho event emission
 *
 * Compensate:
 * - Revert order status
 * - Delete contract nếu đã tạo
 */
@Injectable()
export class FinalizeOrderStep extends SagaStep<
  CreateOrderWithItemsInput,
  FinalizeOrderStepOutput
> {
  readonly name = 'finalize_order';
  readonly description =
    'Finalize order status and create contract if required';

  private readonly logger = new Logger(FinalizeOrderStep.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly mktContractService: MktContractService,
  ) {
    super();
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<FinalizeOrderStepOutput>> {
    try {
      if (!context.orderId) {
        return {
          success: false,
          error: new Error('Order ID is required from previous step'),
        };
      }

      this.logger.log(`Finalizing order: ${context.orderId}`);

      // Get order for contract creation
      const orderRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          context.workspaceId,
          MktOrderWorkspaceEntity,
          { shouldBypassPermissionChecks: true },
        );

      const order = await orderRepository.findOne({
        where: { id: context.orderId },
        relations: ['orderItems'],
      });

      if (!order) {
        return {
          success: false,
          error: new Error(`Order ${context.orderId} not found`),
        };
      }

      // Create contract if required
      let contractId: string | undefined;

      if (input.requireContract) {
        contractId = await this.createContract(context, input, order);
      }

      // Update trial order status if TRIAL_TO_PAID
      if (input.action === ORDER_ACTION.TRIAL_TO_PAID && input.trialOrderId) {
        await this.completeTrialOrder(context, input.trialOrderId, queryRunner);
      }

      // Update order with contract and generate name if needed
      const orderName = this.generateOrderName(order);

      await queryRunner.manager.update(
        MktOrderWorkspaceEntity,
        { id: context.orderId },
        {
          name: orderName,
          mktContractId: contractId ?? undefined,
        },
      );

      const finalStatus = context.metadata.get('orderStatus') as ORDER_STATUS;

      this.logger.log(
        `Order ${context.orderId} finalized with status: ${finalStatus}`,
      );

      // Store rollback data
      context.rollbackData.set(this.name, {
        contractId,
        trialOrderId: input.trialOrderId,
      });

      return {
        success: true,
        data: {
          orderStatus: finalStatus,
          contractId,
        },
      };
    } catch (error) {
      this.logger.error('Failed to finalize order', error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  async compensate(
    context: SagaContext,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const data = context.rollbackData.get(this.name) as {
      contractId?: string;
      trialOrderId?: string;
    } | null;

    if (!data) {
      this.logger.warn('No data to compensate');

      return;
    }

    try {
      // Note: Contract deletion would be handled by MktContractService if needed
      // For now, we just log the rollback
      if (data.contractId) {
        this.logger.warn(
          `Contract ${data.contractId} was created but saga failed. Manual cleanup may be needed.`,
        );
      }

      // Revert trial order status if it was updated
      if (data.trialOrderId) {
        await queryRunner.manager.update(
          MktOrderWorkspaceEntity,
          { id: data.trialOrderId },
          {
            status: ORDER_STATUS.TRIAL,
            note: '',
          },
        );
        this.logger.log(`Reverted trial order ${data.trialOrderId} status`);
      }
    } catch (error) {
      this.logger.error('Failed to compensate finalize step', error);
      throw error;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Create contract for order
   */
  private async createContract(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    order: MktOrderWorkspaceEntity,
  ): Promise<string | undefined> {
    try {
      this.logger.log(`Creating contract for order: ${context.orderId}`);

      const contract = await this.mktContractService.createContractForOrder(
        order,
        context.workspaceId,
        input.customerId,
        context.orderCode ?? '',
      );

      this.logger.log(
        `Created contract ${contract.contractNumber} for order ${context.orderId}`,
      );

      return contract.id;
    } catch (error) {
      this.logger.error(
        `Failed to create contract for order ${context.orderId}`,
        error,
      );
      // Don't fail the saga if contract creation fails
      // Contract can be created manually later

      return undefined;
    }
  }

  /**
   * Complete trial order when converting to paid
   */
  private async completeTrialOrder(
    context: SagaContext,
    trialOrderId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.update(
      MktOrderWorkspaceEntity,
      { id: trialOrderId },
      {
        status: ORDER_STATUS.COMPLETED,
        note: `Converted to paid order: ${context.orderId}`,
      },
    );

    this.logger.log(`Trial order ${trialOrderId} marked as COMPLETED`);
  }

  /**
   * Generate order name from order items
   */
  private generateOrderName(order: MktOrderWorkspaceEntity): string {
    if (!order.orderItems || order.orderItems.length === 0) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('vi-VN');

      return `Đơn hàng ${dateStr}`;
    }

    const productNames = order.orderItems.map((item) => {
      return item.snapshotProductName ?? item.name ?? 'Sản phẩm';
    });

    let orderName = '';

    if (productNames.length === 1) {
      orderName = productNames[0];
    } else if (productNames.length === 2) {
      orderName = `${productNames[0]} và ${productNames[1]}`;
    } else {
      orderName = `${productNames[0]} và ${productNames.length - 1} sản phẩm khác`;
    }

    const totalQuantity = order.orderItems.reduce(
      (sum, item) => sum + (item.quantity ?? 0),
      0,
    );

    if (totalQuantity > 1) {
      orderName += ` (${totalQuantity} sản phẩm)`;
    }

    return orderName;
  }
}
