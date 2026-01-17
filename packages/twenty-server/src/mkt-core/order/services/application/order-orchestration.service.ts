import { Inject, Injectable, Logger } from '@nestjs/common';

// TODO: Re-enable idempotency after testing
// import {
//   IdempotencyService,
//   IdempotencyDomain,
//   IDEMPOTENCY_ORDER_ACTION,
// } from 'src/mkt-core/common/idempotency';
import { IdempotencyService } from 'src/mkt-core/common/idempotency';
import { ORDER_CONFIG_KEY, OrderConfig } from 'src/mkt-core/order/config';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MKT_TEMPLATE } from 'src/mkt-core/order/constants/mkt-template.constant';
import {
  MKT_ORDER_ORCHESTRATION_LOG_CONTEXT,
  MKT_ORDER_ORCHESTRATION_LOG_MESSAGES,
} from 'src/mkt-core/order/messages';
import {
  CreateOrderSaga,
  ConfirmOrderSaga,
  UpdateOrderSaga,
  RefundOrderSaga,
} from 'src/mkt-core/order/orchestration/saga';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import {
  OrderValidationService,
  OrderConfirmUtilsService,
} from 'src/mkt-core/order/services/core';
import { OrderOverdueSchedulerService } from 'src/mkt-core/order/services/core/order-overdue-scheduler.service';
import { OrderItemService } from 'src/mkt-core/order/services/domain';
import {
  CreateOrderWithItemsInput,
  CreateOrderResponse,
  ConfirmOrderInput,
  ConfirmOrderResponse,
  RefundOrderInput,
  RefundOrderResponse,
  UpdateOrderStatusInput,
  UpdateOrderStatusResponse,
  UpdateOrderItemInput,
  UpdateOrderItemResponse,
  PublishDraftOrderInput,
  PublishDraftOrderResponse,
} from 'src/mkt-core/order/types';
import { MktPaymentMethodRepository } from 'src/mkt-core/payment-method/repositories';
import { MktPaymentRepository } from 'src/mkt-core/payment/repositories';
import { DEFAULT_PAYMENT_CURRENCY } from 'src/mkt-core/payment/constants';
import { PaymentCurrency } from 'src/mkt-core/payment/types';
import { CreatePaymentData } from 'src/mkt-core/payment/types/repository.types';

const LOG = MKT_ORDER_ORCHESTRATION_LOG_MESSAGES;

/**
 * OrderOrchestrationService - Facade for order operations
 *
 * Provides a clean API for order operations by:
 * - Validating inputs before processing
 * - Orchestrating saga execution
 * - Handling errors gracefully
 *
 * Note: Saga steps are registered in each saga's onModuleInit()
 */
@Injectable()
export class OrderOrchestrationService {
  private readonly logger = new Logger(MKT_ORDER_ORCHESTRATION_LOG_CONTEXT);

  constructor(
    private readonly createOrderSaga: CreateOrderSaga,
    private readonly confirmOrderSaga: ConfirmOrderSaga,
    private readonly updateOrderSaga: UpdateOrderSaga,
    private readonly refundOrderSaga: RefundOrderSaga,
    private readonly validationService: OrderValidationService,
    private readonly orderItemService: OrderItemService,
    private readonly idempotencyService: IdempotencyService,
    // Dependencies for publishDraftOrder
    private readonly orderRepository: MktOrderRepository,
    private readonly paymentRepository: MktPaymentRepository,
    private readonly paymentMethodRepository: MktPaymentMethodRepository,
    private readonly orderConfirmUtilsService: OrderConfirmUtilsService,
    private readonly orderOverdueSchedulerService: OrderOverdueSchedulerService,
    @Inject(ORDER_CONFIG_KEY)
    private readonly config: OrderConfig,
  ) {}

  /**
   * Create order with items using saga pattern
   *
   * TODO: Re-enable idempotency after testing
   * Idempotency temporarily disabled for debugging
   */
  async createOrderWithItems(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: CreateOrderWithItemsInput,
  ): Promise<CreateOrderResponse> {
    this.logger.log(LOG.CREATE_START(input.customerId, input.action));

    // TODO: Re-enable idempotency after testing
    // const result =
    //   await this.idempotencyService.executeWithIdempotency<CreateOrderResponse>(
    //     {
    //       workspaceId,
    //       domain: 'order' as IdempotencyDomain,
    //       action: IDEMPOTENCY_ORDER_ACTION.CREATE_ORDER,
    //       requestBody: input,
    //     },
    //     async () =>
    //       this.executeCreateOrder(workspaceId, workspaceMemberId, input),
    //   );
    //
    // if (result.fromCache) {
    //   this.logger.log(LOG.CREATE_CACHED());
    // }
    //
    // return result.data;

    // Direct execution without idempotency (temporary)
    return this.executeCreateOrder(workspaceId, workspaceMemberId, input);
  }

  /**
   * Execute order creation (validation + saga)
   */
  private async executeCreateOrder(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: CreateOrderWithItemsInput,
  ): Promise<CreateOrderResponse> {
    // Validate input
    const validationResult =
      await this.validationService.validateCreateOrderInput(input);

    this.logger.debug(LOG.CREATE_VALIDATION_RESULT(validationResult.valid));

    if (!validationResult.valid) {
      const errorMessages = validationResult.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join('; ');

      this.logger.warn(LOG.CREATE_VALIDATION_FAILED(errorMessages));

      return {
        success: false,
        error: LOG.CREATE_VALIDATION_FAILED(errorMessages),
      };
    }

    // Execute saga
    try {
      const result = await this.createOrderSaga.execute(
        workspaceId,
        workspaceMemberId,
        input,
      );

      if (result.success) {
        this.logger.log(
          LOG.CREATE_SUCCESS(result.orderId ?? '', result.orderCode ?? ''),
        );
      } else {
        this.logger.error(LOG.CREATE_FAILED(result.error ?? ''));
      }

      return result;
    } catch (error) {
      this.logger.error(LOG.CREATE_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Confirm order (change status) using ConfirmOrderSaga
   */
  async confirmOrder(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: ConfirmOrderInput,
  ): Promise<ConfirmOrderResponse> {
    this.logger.log(
      LOG.CONFIRM_START(
        input.orderId,
        input.action,
        workspaceMemberId ?? 'system',
      ),
    );

    // Validate input
    const validationResult =
      await this.validationService.validateConfirmOrderInput(input);

    if (!validationResult.valid) {
      const errorMessages = validationResult.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join('; ');

      return {
        success: false,
        error: LOG.CREATE_VALIDATION_FAILED(errorMessages),
      };
    }

    // Execute saga
    try {
      const result = await this.confirmOrderSaga.execute(
        workspaceId,
        workspaceMemberId,
        input,
      );

      if (result.success && result.data) {
        this.logger.log(
          LOG.CONFIRM_SUCCESS(
            result.data.orderId ?? '',
            result.data.newStatus ?? '',
          ),
        );

        return result.data;
      }

      this.logger.error(LOG.CONFIRM_FAILED(result.error ?? ''));

      return {
        success: false,
        error: result.error ?? LOG.CONFIRM_FAILED('Unknown error'),
      };
    } catch (error) {
      this.logger.error(LOG.CONFIRM_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update order status using UpdateOrderSaga
   */
  async updateOrderStatus(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: UpdateOrderStatusInput,
  ): Promise<UpdateOrderStatusResponse> {
    this.logger.log(
      LOG.UPDATE_STATUS_START(
        input.orderId,
        input.status,
        workspaceMemberId ?? 'system',
      ),
    );

    try {
      const result = await this.updateOrderSaga.execute(
        workspaceId,
        workspaceMemberId,
        input,
      );

      if (result.success) {
        this.logger.log(
          LOG.UPDATE_STATUS_SUCCESS(
            result.orderId ?? '',
            result.previousStatus ?? '',
            result.newStatus ?? '',
          ),
        );
      } else {
        this.logger.error(LOG.UPDATE_STATUS_FAILED(result.error ?? ''));
      }

      return result;
    } catch (error) {
      this.logger.error(LOG.UPDATE_STATUS_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Refund order using RefundOrderSaga
   */
  async refundOrder(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: RefundOrderInput,
  ): Promise<RefundOrderResponse> {
    this.logger.log(
      LOG.REFUND_START(
        input.orderId,
        input.isPartial ?? false,
        workspaceMemberId ?? 'system',
      ),
    );

    try {
      const result = await this.refundOrderSaga.execute(
        workspaceId,
        workspaceMemberId,
        input,
      );

      if (result.success) {
        this.logger.log(
          LOG.REFUND_SUCCESS(result.orderId ?? '', result.refundedAmount ?? 0),
        );
      } else {
        this.logger.error(LOG.REFUND_FAILED(result.error ?? ''));
      }

      return result;
    } catch (error) {
      this.logger.error(LOG.REFUND_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update order item using OrderItemService
   */
  async updateOrderItem(
    workspaceId: string,
    input: UpdateOrderItemInput,
  ): Promise<UpdateOrderItemResponse> {
    this.logger.log(LOG.UPDATE_ITEM_START(input.orderItemId));

    try {
      const result = await this.orderItemService.updateOrderItem(
        input.orderItemId,
        workspaceId,
        input,
      );

      if (result.success) {
        this.logger.log(LOG.UPDATE_ITEM_SUCCESS(result.orderItem?.id ?? ''));
      } else {
        this.logger.error(LOG.UPDATE_ITEM_FAILED(result.error ?? ''));
      }

      return {
        success: result.success,
        orderItemId: result.orderItem?.id,
        orderId: result.orderItem?.mktOrderId,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(LOG.UPDATE_ITEM_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Recalculate all order items for an order
   */
  async recalculateOrderItems(
    workspaceId: string,
    orderId: string,
  ): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
    this.logger.log(LOG.RECALCULATE_START(orderId));

    try {
      const result =
        await this.orderItemService.recalculateAllOrderItems(orderId);

      if (result.success) {
        this.logger.log(LOG.RECALCULATE_SUCCESS(result.updatedCount ?? 0));
      } else {
        this.logger.error(LOG.RECALCULATE_HAD_ERRORS());
      }

      return result;
    } catch (error) {
      this.logger.error(LOG.RECALCULATE_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate create order input without executing
   */
  async validateCreateOrderInput(
    workspaceId: string,
    input: CreateOrderWithItemsInput,
  ): Promise<{
    valid: boolean;
    errors: Array<{ field: string; message: string; code: string }>;
  }> {
    return this.validationService.validateCreateOrderInput(input);
  }

  // ============================================
  // PUBLISH DRAFT ORDER
  // ============================================

  /**
   * Publish a draft order - converts DRAFT to PENDING_PAYMENT
   *
   * Steps:
   * 1. Validate order exists and is in DRAFT status
   * 2. Create payment/QR code
   * 3. Update order status to PENDING_PAYMENT
   * 4. Schedule overdue check
   */
  async publishDraftOrder(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: PublishDraftOrderInput,
  ): Promise<PublishDraftOrderResponse> {
    this.logger.log(`[PublishDraft] Starting for order: ${input.orderId}`);

    try {
      // 1. Get and validate order
      const order = await this.orderRepository.findById(input.orderId);

      if (!order) {
        return {
          success: false,
          error: `Order ${input.orderId} not found`,
        };
      }

      if (order.status !== ORDER_STATUS.DRAFT) {
        return {
          success: false,
          error: `Order ${input.orderId} is not in DRAFT status. Current status: ${order.status}`,
        };
      }

      // 2. Create payments if payment methods provided
      let qrCodeUrl: string | undefined;

      if (input.paymentMethods && input.paymentMethods.length > 0) {
        const paymentResult = await this.createPaymentsForDraftOrder(
          workspaceId,
          order.id,
          order.orderCode,
          order.totalAmount ?? 0,
          order.currency ?? DEFAULT_PAYMENT_CURRENCY,
          input.paymentMethods,
        );

        qrCodeUrl = paymentResult.qrCodeUrl;
      }

      // 3. Update order status to PENDING_PAYMENT
      const updateNote = input.note
        ? `[PUBLISHED] ${input.note}`
        : '[PUBLISHED] Draft order published';

      await this.orderRepository.update(order.id, {
        status: ORDER_STATUS.PENDING_PAYMENT,
        note: order.note ? `${order.note}\n${updateNote}` : updateNote,
      });

      // 4. Schedule overdue check
      await this.orderOverdueSchedulerService.scheduleOverdueCheck(
        workspaceId,
        order.id,
        order.orderCode,
      );

      this.logger.log(
        `[PublishDraft] Success - Order ${order.id} published with status PENDING_PAYMENT`,
      );

      return {
        success: true,
        orderId: order.id,
        orderCode: order.orderCode,
        paymentQrCode: qrCodeUrl,
        newStatus: ORDER_STATUS.PENDING_PAYMENT,
      };
    } catch (error) {
      this.logger.error('[PublishDraft] Unexpected error', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create payments for a draft order
   */
  private async createPaymentsForDraftOrder(
    workspaceId: string,
    orderId: string,
    orderCode: string,
    totalAmount: number,
    currency: string,
    paymentMethods: PublishDraftOrderInput['paymentMethods'],
  ): Promise<{ qrCodeUrl?: string }> {
    if (!paymentMethods || paymentMethods.length === 0) {
      return {};
    }

    let primaryQrCodeUrl: string | undefined;

    // Get payment method entities
    const paymentMethodIds = paymentMethods.map((p) => p.paymentMethodId);
    const paymentMethodMap =
      await this.paymentMethodRepository.findManyByIdsAsMap(paymentMethodIds);

    for (const pmInput of paymentMethods) {
      const paymentMethod = paymentMethodMap.get(pmInput.paymentMethodId);

      if (!paymentMethod) {
        this.logger.warn(
          `[PublishDraft] Payment method ${pmInput.paymentMethodId} not found, skipping`,
        );
        continue;
      }

      // Generate QR code
      const { qrCodeUrl, expiredAt } =
        await this.orderConfirmUtilsService.generateSepayQrCodeUrl(
          paymentMethod,
          totalAmount,
          orderCode,
        );

      // Create payment record
      const paymentData: CreatePaymentData = {
        name: `Thanh toán - ${paymentMethod.name} - ${orderCode}`,
        amount: totalAmount,
        currency: currency as PaymentCurrency,
        mktOrderId: orderId,
        mktPaymentMethodId: pmInput.paymentMethodId,
        qrCodeUrl: qrCodeUrl ?? undefined,
        duration: pmInput.duration ?? undefined,
        expiredAt: expiredAt ?? undefined,
        paymentPageUrl: `${this.config.urls.serverUrl}${this.config.urls.paymentPagePath}/${orderCode}`,
        mktTemplateId: MKT_TEMPLATE.SEPAY,
      };

      await this.paymentRepository.createPayment(paymentData);

      // Set first QR code as primary
      if (!primaryQrCodeUrl && qrCodeUrl) {
        primaryQrCodeUrl = qrCodeUrl;
      }
    }

    return { qrCodeUrl: primaryQrCodeUrl };
  }
}
