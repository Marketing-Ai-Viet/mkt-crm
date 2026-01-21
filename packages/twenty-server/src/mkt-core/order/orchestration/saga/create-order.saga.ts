import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { TransactionScopeService } from 'src/mkt-core/common/transaction';
import {
  CreateOrderSagaContext,
  createCreateOrderContext,
} from 'src/mkt-core/order/orchestration/context';
import {
  CreateOrderStep,
  CreateSnapshotsStep,
  CreateOrderItemsStep,
  CalculatePromotionStep,
  CreateLicensesStep,
  CreatePaymentStep,
  FinalizeOrderStep,
} from 'src/mkt-core/order/orchestration/steps';
import {
  MKT_ORDER_EVENT_TYPES,
  CreateOrderWithItemsInput,
  CreateOrderResponse,
  SagaContext,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

import { BaseSaga } from './base/base-saga';

/**
 * CreateOrderSaga - Saga orchestrator for creating orders
 *
 * Extends BaseSaga for unified step execution pattern:
 * - Step timeout protection (30s/step)
 * - Compensate retry with exponential backoff
 * - Critical error alerting
 *
 * Steps:
 * 1. CreateOrderStep - Create order entity
 * 2. CreateSnapshotsStep - Validate & create product/package snapshots
 * 3. CreateOrderItemsStep - Create order items with snapshots
 * 4. CalculatePromotionStep - Calculate and apply promotions
 * 5. CreateLicensesStep - Create licenses for order items
 * 6. CreatePaymentStep - Create payment (if not TRIAL)
 * 7. FinalizeOrderStep - Finalize order status
 */
@Injectable()
export class CreateOrderSaga
  extends BaseSaga<CreateOrderWithItemsInput, CreateOrderResponse>
  implements OnModuleInit
{
  protected readonly logger = new Logger(CreateOrderSaga.name);
  protected readonly sagaName = 'CreateOrderSaga';

  constructor(
    transactionScopeService: TransactionScopeService,
    eventEmitter: EventEmitter2,
    // Inject steps directly
    private readonly createOrderStep: CreateOrderStep,
    private readonly createSnapshotsStep: CreateSnapshotsStep,
    private readonly createOrderItemsStep: CreateOrderItemsStep,
    private readonly calculatePromotionStep: CalculatePromotionStep,
    private readonly createLicensesStep: CreateLicensesStep,
    private readonly createPaymentStep: CreatePaymentStep,
    private readonly finalizeOrderStep: FinalizeOrderStep,
  ) {
    super(transactionScopeService, eventEmitter);
    this.initializeSteps();
  }

  /**
   * Initialize and register steps
   */
  private initializeSteps(): void {
    // Validate all steps are injected
    const injectedSteps = [
      { name: 'createOrderStep', instance: this.createOrderStep },
      { name: 'createSnapshotsStep', instance: this.createSnapshotsStep },
      { name: 'createOrderItemsStep', instance: this.createOrderItemsStep },
      { name: 'calculatePromotionStep', instance: this.calculatePromotionStep },
      { name: 'createLicensesStep', instance: this.createLicensesStep },
      { name: 'createPaymentStep', instance: this.createPaymentStep },
      { name: 'finalizeOrderStep', instance: this.finalizeOrderStep },
    ];

    const missingSteps = injectedSteps
      .filter((s) => !s.instance)
      .map((s) => s.name);

    if (missingSteps.length > 0) {
      this.logger.error(
        `[${this.sagaName}] Failed to inject steps: ${missingSteps.join(', ')}`,
      );
      throw new Error(
        `${this.sagaName} initialization failed: Missing steps: ${missingSteps.join(', ')}`,
      );
    }

    this.registerSteps([
      this.createOrderStep,
      this.createSnapshotsStep,
      this.createOrderItemsStep,
      this.calculatePromotionStep,
      this.createLicensesStep,
      this.createPaymentStep,
      this.finalizeOrderStep,
    ]);
  }

  /**
   * OnModuleInit - fallback if constructor initialization didn't run
   */
  onModuleInit(): void {
    if (this.steps.length === 0) {
      this.initializeSteps();
    }
  }

  /**
   * Create typed context for CreateOrderSaga
   */
  protected createContext(
    workspaceId: string,
    workspaceMemberId?: string,
  ): CreateOrderSagaContext {
    return createCreateOrderContext(workspaceId, workspaceMemberId);
  }

  /**
   * Build success response from context
   */
  protected buildSuccessResponse(context: SagaContext): CreateOrderResponse {
    const typedContext = context as CreateOrderSagaContext;

    return {
      success: true,
      orderId: typedContext.orderId,
      orderCode: typedContext.orderCode,
      paymentQrCode: typedContext.paymentQrCode,
    };
  }

  /**
   * Emit success event after saga completion
   */
  protected emitSuccessEvent(
    context: SagaContext,
    _input: CreateOrderWithItemsInput,
  ): void {
    const typedContext = context as CreateOrderSagaContext;

    if (!typedContext.orderId) {
      return;
    }

    const now = DateTimeUtils.now();
    const nowDate = DateTimeUtils.toDate(now);

    this.eventEmitter.emit(MKT_ORDER_EVENT_TYPES.ORDER_CREATED, {
      name: MKT_ORDER_EVENT_TYPES.ORDER_CREATED,
      workspaceId: typedContext.workspaceId,
      events: [
        {
          eventType: MKT_ORDER_EVENT_TYPES.ORDER_CREATED,
          orderId: typedContext.orderId,
          workspaceId: typedContext.workspaceId,
          orderData: {
            id: typedContext.orderId,
            status: typedContext.finalStatus,
            trialLicense: typedContext.trialLicense,
            createdAt: nowDate,
            updatedAt: nowDate,
          },
          timestamp: DateTimeUtils.toISO(now),
        },
      ],
    });

    this.logger.log(
      `[${this.sagaName}] Emitted ORDER_CREATED event for order: ${typedContext.orderId}`,
    );
  }
}
