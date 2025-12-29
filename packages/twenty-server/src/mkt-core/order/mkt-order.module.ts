import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';

import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MktContractModule } from 'src/mkt-core/contract/mkt-contract.module';
import { CustomerModule } from 'src/mkt-core/customer/customer.module';
// DISABLED: MktInvoiceModule - temporarily disabled
// import { MktInvoiceModule } from 'src/mkt-core/invoice/mkt-invoice.module';
import { MktLicenseIntegrationModule } from 'src/mkt-core/mkt-license-integration/mkt-license-integration.module';
import { MktProductIntegrationModule } from 'src/mkt-core/mkt-product-integration';
import { MktPromotionModule } from 'src/mkt-core/mkt-promotion/mkt-promotion.module';
import { MktOrderOverdueJob } from 'src/mkt-core/order/jobs';
import { MktPaymentModule } from 'src/mkt-core/payment/mkt-payment.module';
import { MktEmailModule } from 'src/mkt-core/email/mkt-email.module';
import {
  MktOrderRepository,
  MktOrderItemRepository,
  MktOrderHistoryRepository,
} from 'src/mkt-core/order/repositories';
import { IdempotencyModule } from 'src/mkt-core/common/idempotency';

import {
  // Core Services
  OrderCalculationService,
  OrderValidationService,
  OrderStatusService,
  OrderEventService,
  OrderPaymentCalculationService,
  OrderConfirmUtilsService,
  OrderMetadataService,
  MktOrderOverdueService,
  // Domain Services
  OrderCrudService,
  OrderItemService,
  OrderLicenseQueryService,
  // Application Services
  OrderOrchestrationService,
} from './services';
import {
  OrderMutationResolver,
  OrderQueryResolver,
  OrderItemMutationResolver,
} from './resolvers';
import {
  MktOrderCustomEventListener,
  LicenseLifecycleListener,
} from './listeners';

import {
  CreateOrderSaga,
  ConfirmOrderSaga,
  UpdateOrderSaga,
  RefundOrderSaga,
} from './orchestration/saga';
import {
  CreateLicensesStep,
  CreateOrderItemsStep,
  CreateOrderStep,
  CreatePaymentStep,
  FinalizeOrderStep,
  // New steps for snapshots and promotions
  CreateSnapshotsStep,
  CalculatePromotionStep,
  RecordPromotionUsageStep,
} from './orchestration/steps';
import {
  ValidateOrderStep,
  ValidateTransitionStep,
  UpdateStatusStep,
  CreateLicensesOnConfirmStep,
  CompleteOrderAfterLicenseStep,
} from './orchestration/steps/confirm-order';
import {
  OrderProductIntegrationService,
  OrderLicenseIntegrationService,
  OrderPromotionIntegrationService,
} from './services/integration';

@Module({
  imports: [
    HttpModule, // For OrderConfirmUtilsService (BIDV SEPay API)
    EmailModule,
    MktEmailModule,
    MessageQueueModule,
    RecordPositionModule,
    WorkspaceCacheStorageModule, // Redis caching for idempotency
    forwardRef(() => MktPaymentModule), // Circular dependency with MktPaymentModule
    // DISABLED: forwardRef(() => MktInvoiceModule),
    MktProductIntegrationModule, // External MKT Server product integration
    MktLicenseIntegrationModule, // External MKT Server license integration
    MktPromotionModule, // Promotion and coupon management
    MktContractModule,
    CustomerModule,
    IdempotencyModule.register(), // Idempotency protection for order operations
  ],
  providers: [
    // Event Listeners
    MktOrderCustomEventListener,
    LicenseLifecycleListener,

    // Repositories (Data Access Layer)
    MktOrderRepository,
    MktOrderItemRepository,
    MktOrderHistoryRepository,

    // Core Services (stateless business logic)
    OrderStatusService,
    OrderCalculationService,
    OrderValidationService,
    OrderEventService,
    OrderPaymentCalculationService,
    OrderConfirmUtilsService,
    OrderMetadataService,
    MktOrderOverdueService,

    // Domain Services (domain operations)
    OrderCrudService,
    OrderItemService,
    OrderLicenseQueryService,

    // Application Services (orchestration)
    OrderOrchestrationService,

    // Sagas (workflow orchestration)
    CreateOrderSaga,
    ConfirmOrderSaga,
    UpdateOrderSaga,
    RefundOrderSaga,

    // Saga Steps - CreateOrder
    CreateOrderStep,
    CreateOrderItemsStep,
    CreateLicensesStep,
    CreatePaymentStep,
    FinalizeOrderStep,
    CreateSnapshotsStep,
    CalculatePromotionStep,
    RecordPromotionUsageStep,
    // Saga Steps - ConfirmOrder
    ValidateOrderStep,
    ValidateTransitionStep,
    UpdateStatusStep,
    CreateLicensesOnConfirmStep,
    CompleteOrderAfterLicenseStep,

    // Integration Services (bridge to other MKT modules)
    OrderProductIntegrationService,
    OrderLicenseIntegrationService,
    OrderPromotionIntegrationService,

    // Jobs
    MktOrderOverdueJob,

    // GraphQL Resolvers
    OrderMutationResolver,
    OrderQueryResolver,
    OrderItemMutationResolver,
  ],
  exports: [
    // Repositories
    MktOrderRepository,
    MktOrderItemRepository,
    MktOrderHistoryRepository,
    // Services
    OrderStatusService,
    OrderEventService,
    OrderItemService,
    OrderCrudService,
    OrderLicenseQueryService,
    OrderOrchestrationService,
    OrderPaymentCalculationService,
    OrderConfirmUtilsService,
    OrderMetadataService,
    // Integration Services
    OrderProductIntegrationService,
    OrderLicenseIntegrationService,
    OrderPromotionIntegrationService,
    // Sagas
    ConfirmOrderSaga,
    UpdateOrderSaga,
    RefundOrderSaga,
  ],
})
export class MktOrderModule {}
