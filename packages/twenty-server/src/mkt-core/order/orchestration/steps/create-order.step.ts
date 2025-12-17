import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
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

export type CreateOrderStepOutput = {
  order: MktOrderWorkspaceEntity;
  orderCode: string;
};

// ============================================
// ORDER CODE CONSTANTS
// ============================================

const ORDER_CODE_PREFIX = 'MKT';
const ORDER_CODE_NUMBER_LENGTH = 3;

/**
 * CreateOrderStep - Step 1: Tạo order entity
 *
 * Thực hiện:
 * - Generate order code unique
 * - Tạo order với status DRAFT hoặc tương ứng với action
 * - Lưu orderId và orderCode vào context
 *
 * Compensate:
 * - Hard delete order nếu step sau fail
 */
@Injectable()
export class CreateOrderStep extends SagaStep<
  CreateOrderWithItemsInput,
  CreateOrderStepOutput
> {
  readonly name = 'create_order';
  readonly description = 'Create order entity with generated order code';

  private readonly logger = new Logger(CreateOrderStep.name);

  constructor(private readonly twentyORMGlobalManager: TwentyORMGlobalManager) {
    super();
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateOrderStepOutput>> {
    try {
      this.logger.log(`Creating order for workspace: ${context.workspaceId}`);

      // Generate unique order code
      const orderCode = await this.generateOrderCode(context.workspaceId);

      // Determine initial status based on action
      const initialStatus = this.getInitialStatus(input.action);

      // Determine if trial license
      const isTrialLicense = input.action === ORDER_ACTION.TRIAL;

      // Create order entity
      const repository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          context.workspaceId,
          MktOrderWorkspaceEntity,
          { shouldBypassPermissionChecks: true },
        );

      const orderData: Partial<MktOrderWorkspaceEntity> = {
        name: input.name ?? `Đơn hàng ${orderCode}`,
        orderCode,
        status: initialStatus,
        mktCustomerId: input.customerId,
        currency: input.currency ?? 'VND',
        note: input.note,
        requireContract: input.requireContract ?? false,
        trialLicense: isTrialLicense,
        // Initialize amounts (will be updated in CreateOrderItemsStep)
        subtotal: 0,
        tax: 0,
        discount: 0,
        totalAmount: 0,
      };

      const order = repository.create(orderData);

      // Save using queryRunner for transaction support
      const savedOrder = await queryRunner.manager.save(order);

      this.logger.log(
        `Created order: ${savedOrder.id} with code: ${orderCode}`,
      );

      // Store in context for subsequent steps
      context.orderId = savedOrder.id;
      context.orderCode = orderCode;
      context.metadata.set('orderStatus', initialStatus);
      context.metadata.set('trialLicense', isTrialLicense);

      // Store rollback data
      context.rollbackData.set(this.name, { orderId: savedOrder.id });

      return {
        success: true,
        data: {
          order: savedOrder,
          orderCode,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create order', error);

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
      orderId: string;
    } | null;

    if (!data?.orderId) {
      this.logger.warn('No order to compensate');

      return;
    }

    try {
      this.logger.warn(`Hard deleting order: ${data.orderId}`);

      await queryRunner.manager.delete(MktOrderWorkspaceEntity, {
        id: data.orderId,
      });

      this.logger.log(`Order ${data.orderId} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete order ${data.orderId}`, error);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Generate unique order code: MKT + YYYYMMDD + 3-digit number
   */
  private async generateOrderCode(workspaceId: string): Promise<string> {
    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktOrderWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find the highest order number for today
    const todayPattern = `${ORDER_CODE_PREFIX}${datePrefix}%`;
    const latestOrder = await repository
      .createQueryBuilder('order')
      .where('order.orderCode LIKE :pattern', { pattern: todayPattern })
      .orderBy('order.orderCode', 'DESC')
      .limit(1)
      .getOne();

    let nextNumber = 1;

    if (latestOrder?.orderCode) {
      // Extract number from existing order code (e.g., MKT20241201001 -> 1)
      const numberPart = latestOrder.orderCode.slice(
        ORDER_CODE_PREFIX.length + 8,
      );
      const parsedNumber = parseInt(numberPart, 10);

      if (!isNaN(parsedNumber)) {
        nextNumber = parsedNumber + 1;
      }
    }

    // Generate new order code
    const orderCode = `${ORDER_CODE_PREFIX}${datePrefix}${String(nextNumber).padStart(ORDER_CODE_NUMBER_LENGTH, '0')}`;

    // Double-check uniqueness
    const existingOrder = await repository.findOne({
      where: { orderCode },
    });

    if (existingOrder) {
      // If somehow duplicate, add timestamp
      const timestamp = Date.now().toString().slice(-6);

      return `${ORDER_CODE_PREFIX}${datePrefix}${timestamp}`;
    }

    this.logger.log(`Generated order code: ${orderCode}`);

    return orderCode;
  }

  /**
   * Get initial order status based on action
   */
  private getInitialStatus(action: ORDER_ACTION): ORDER_STATUS {
    switch (action) {
      case ORDER_ACTION.TRIAL:
        return ORDER_STATUS.TRIAL;
      case ORDER_ACTION.WAIT:
      case ORDER_ACTION.LICENSE_RENEWING:
        return ORDER_STATUS.WAIT;
      case ORDER_ACTION.TRIAL_TO_PAID:
        return ORDER_STATUS.WAIT;
      default:
        return ORDER_STATUS.DRAFT;
    }
  }
}
