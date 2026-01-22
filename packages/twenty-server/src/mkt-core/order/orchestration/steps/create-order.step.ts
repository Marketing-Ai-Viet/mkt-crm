import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import { CreateOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types/order-saga.interface';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { OrderConfirmUtilsService } from 'src/mkt-core/order/services/core/order-confirm-utils.service';
import {
  CreateOrderStepOutput,
  CreateOrderWithItemsInput,
} from 'src/mkt-core/order/types';
import { buildOwnershipFields } from 'src/mkt-core/common/repositories/base-workspace.repository';

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

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderConfirmUtilsService: OrderConfirmUtilsService,
  ) {
    super();
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateOrderStepOutput>> {
    try {
      this.logger.log(`Creating order for workspace: ${context.workspaceId}`);

      // Generate unique order code with distributed locking
      const orderCode = await this.orderConfirmUtilsService.generateOrderCode(
        context.workspaceId,
      );

      if (!orderCode) {
        return {
          success: false,
          error: new Error('Failed to generate order code'),
        };
      }

      // Determine initial status based on action and draft mode
      const initialStatus = this.getInitialStatus(input.action, input.isDraft);

      // Note: Trial orders are handled by TrialOrderService, not this saga
      const isTrialLicense = false;

      // Build ownership fields (createdById, accountOwnerId)
      const ownershipFields = buildOwnershipFields({
        workspaceMemberId: context.workspaceMemberId,
      });

      // Create order using repository
      const savedOrder = await this.orderRepository.createOrder({
        name: `Đơn hàng ${orderCode}`,
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
        // Initialize payment fields (remainingAmount will be set = totalAmount in CreateOrderItemsStep)
        paidAmount: 0,
        remainingAmount: 0,
        paymentStatus: PAYMENT_STATUS.PENDING,
        // Set ownership fields
        ...ownershipFields,
      });

      this.logger.log(
        `Created order: ${savedOrder.id} with code: ${orderCode}`,
      );

      // Cast to typed context
      const typedContext = context as CreateOrderSagaContext;

      // Store in typed context for subsequent steps
      context.orderId = savedOrder.id;
      context.orderCode = orderCode;
      typedContext.order = savedOrder;
      typedContext.finalStatus = initialStatus;
      typedContext.trialLicense = isTrialLicense;

      // Store typed rollback data
      typedContext.rollbackOrder = {
        id: savedOrder.id,
        status: initialStatus,
      };

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
    _queryRunner: QueryRunner,
  ): Promise<void> {
    // Use typed context for rollback data
    const typedContext = context as CreateOrderSagaContext;
    const rollbackOrder = typedContext.rollbackOrder;

    if (!rollbackOrder?.id) {
      this.logger.warn('No order to compensate');

      return;
    }

    try {
      this.logger.warn(`Hard deleting order: ${rollbackOrder.id}`);

      // Use repository for delete - queryRunner.manager doesn't have workspace entity metadata
      await this.orderRepository.softDeleteOrder(rollbackOrder.id);

      this.logger.log(`Order ${rollbackOrder.id} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete order ${rollbackOrder.id}`, error);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get initial order status based on action and draft mode
   *
   * Flow chính:
   * - isDraft=true: Always DRAFT (no payment, no license)
   * - NEW_ORDER: PENDING_PAYMENT → CONFIRMED → COMPLETED
   * - Note: TRIAL orders are handled by TrialOrderService, not this saga
   */
  private getInitialStatus(
    action: ORDER_ACTION,
    isDraft?: boolean,
  ): ORDER_STATUS {
    // Draft mode: Always start with DRAFT status
    if (isDraft) {
      return ORDER_STATUS.DRAFT;
    }

    switch (action) {
      case ORDER_ACTION.NEW_ORDER:
      case ORDER_ACTION.LICENSE_RENEWING:
      case ORDER_ACTION.TRIAL_TO_PAID:
      case ORDER_ACTION.CHANGE_VARIANT:
        return ORDER_STATUS.PENDING_PAYMENT;
      default:
        return ORDER_STATUS.DRAFT;
    }
  }
}
