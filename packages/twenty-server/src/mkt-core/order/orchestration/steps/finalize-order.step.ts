import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { MktContractService } from 'src/mkt-core/contract/services/mkt-contract.service';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { CreateOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types/order-saga.interface';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import {
  CreateOrderWithItemsInput,
  FinalizeOrderStepOutput,
} from 'src/mkt-core/order/types';
import {
  DATE_TIME_FORMATS,
  DateTimeUtils,
} from 'src/mkt-core/utils/date-time.utils';

/**
 * FinalizeOrderStep - Step 5: Finalize order và tạo contract nếu cần
 *
 * Thực hiện:
 * - Update order status cuối cùng
 * - Tạo contract nếu requireContract = true
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
    private readonly orderRepository: MktOrderRepository,
    private readonly mktContractService: MktContractService,
  ) {
    super();
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<FinalizeOrderStepOutput>> {
    try {
      if (!context.orderId) {
        return {
          success: false,
          error: new Error('Order ID is required from previous step'),
        };
      }

      this.logger.log(`Finalizing order: ${context.orderId}`);

      // Get order for contract creation (pass workspaceId for saga context)
      const order = await this.orderRepository.findByIdWithOptions(
        context.orderId,
        { relations: { orderItems: true } },
        context.workspaceId,
      );

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

      // Cast to typed context
      const typedContext = context as CreateOrderSagaContext;

      // Update order with contract and generate name if needed
      const orderName = this.generateOrderName(order);

      // Use repository for update - pass workspaceId for saga context
      await this.orderRepository.updateOrder(
        context.orderId,
        {
          name: orderName,
          mktContractId: contractId ?? undefined,
        },
        context.workspaceId,
      );

      // Get final status from typed context (set by CreateOrderStep)
      const finalStatus = typedContext.finalStatus ?? ORDER_STATUS.DRAFT;

      this.logger.log(
        `Order ${context.orderId} finalized with status: ${finalStatus}`,
      );

      // Store rollback data (keep Map for contract since it's not in typed context)
      context.rollbackData.set(this.name, {
        contractId,
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
    _queryRunner: QueryRunner,
  ): Promise<void> {
    const data = context.rollbackData.get(this.name) as {
      contractId?: string;
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
   * Generate order name from order items
   */
  private generateOrderName(order: MktOrderWorkspaceEntity): string {
    if (!order.orderItems || order.orderItems.length === 0) {
      const dateStr = DateTimeUtils.format(
        DateTimeUtils.now(),
        DATE_TIME_FORMATS.DISPLAY_DATE,
      );

      return `Đơn hàng ${dateStr}`;
    }

    const productNames = order.orderItems.map((item) => {
      return item.snapshotProductName ?? item.name ?? 'Sản phẩm';
    });

    let orderName: string | undefined = '';

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
