import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MktContractModule } from 'src/mkt-core/contract/mkt-contract.module';
import { CustomerModule } from 'src/mkt-core/customer/customer.module';
import { DelayedJobInfrastructureModule } from 'src/mkt-core/infrastructure/delayed-job';
import { orderConfig } from 'src/mkt-core/order/config';
// DISABLED: MktInvoiceModule - temporarily disabled
// import { MktInvoiceModule } from 'src/mkt-core/invoice/mkt-invoice.module';
import { MktLicenseIntegrationModule } from 'src/mkt-core/mkt-license-integration/mkt-license-integration.module';
import { MktProductIntegrationModule } from 'src/mkt-core/mkt-product-integration';
import { MktPromotionModule } from 'src/mkt-core/mkt-promotion/mkt-promotion.module';
import { MktComboModule } from 'src/mkt-core/mkt-combo/mkt-combo.module';
import { MktRbacEnterpriseGradeModule } from 'src/mkt-core/mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module';
import {
  PaymentDeadlineProcessor,
  PaymentOverdueScanJob,
} from 'src/mkt-core/order/jobs';
import { MktPaymentModule } from 'src/mkt-core/payment/mkt-payment.module';
import { MktEmailModule } from 'src/mkt-core/mkt-email/mkt-email.module';
import {
  MktOrderRepository,
  MktOrderItemRepository,
  MktOrderHistoryRepository,
} from 'src/mkt-core/order/repositories';
import { IdempotencyModule } from 'src/mkt-core/common/idempotency';
import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';

import {
  // Core Services
  OrderCalculationService,
  OrderValidationService,
  OrderStatusService,
  OrderEventService,
  OrderPaymentCalculationService,
  OrderConfirmUtilsService,
  OrderMetadataService,
  // New Payment Flow Services
  PaymentDeadlineService,
  OrderConfirmService,
  OrderLockService,
  PaymentOverdueScanService,
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
import { ORDER_MODULE_BLOCK_HOOKS } from './hooks';

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
  CreateContractOnConfirmStep,
  CompleteOrderAfterLicenseStep,
  // New Payment Flow Steps
  CalculatePaymentDeadlineStep,
  SchedulePaymentRemindersStep,
} from './orchestration/steps/confirm-order';
import {
  OrderProductIntegrationService,
  OrderLicenseIntegrationService,
  OrderPromotionIntegrationService,
  OrderComboIntegrationService,
} from './services/integration';

@Module({
  imports: [
    ConfigModule.forFeature(orderConfig), // Order module configuration
    TypeOrmModule.forFeature([Workspace], 'core'), // Workspace entity for migration service
    HttpModule, // For OrderConfirmUtilsService (BIDV SEPay API)
    EmailModule,
    MktEmailModule,
    MessageQueueModule,
    RecordPositionModule,
    WorkspaceCacheStorageModule, // Redis caching for idempotency
    DelayedJobInfrastructureModule, // BullMQ delayed jobs for overdue orders
    forwardRef(() => MktPaymentModule), // Circular dependency with MktPaymentModule
    // DISABLED: forwardRef(() => MktInvoiceModule),
    MktProductIntegrationModule, // External MKT Server product integration
    MktLicenseIntegrationModule, // External MKT Server license integration
    MktPromotionModule, // Promotion and coupon management
    MktComboModule, // Combo integration for order creation
    MktContractModule,
    CustomerModule,
    IdempotencyModule.register(), // Idempotency protection for order operations
    MktRbacEnterpriseGradeModule, // RBAC authorization for order operations
    TokenModule,
  ],
  providers: [
    // Block Hooks - Disable auto-generated GraphQL operations
    ...ORDER_MODULE_BLOCK_HOOKS,

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
    // New Payment Flow Services
    PaymentDeadlineService,
    OrderConfirmService,
    OrderLockService,
    PaymentOverdueScanService,

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
    CreateContractOnConfirmStep,
    CompleteOrderAfterLicenseStep,
    // New Payment Flow Steps
    CalculatePaymentDeadlineStep,
    SchedulePaymentRemindersStep,

    // Integration Services (bridge to other MKT modules)
    OrderProductIntegrationService,
    OrderLicenseIntegrationService,
    OrderPromotionIntegrationService,
    OrderComboIntegrationService,

    // Jobs - Payment Flow
    PaymentDeadlineProcessor,
    PaymentOverdueScanJob,

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
    // New Payment Flow Services
    PaymentDeadlineService,
    OrderConfirmService,
    OrderLockService,
    // Integration Services
    OrderProductIntegrationService,
    OrderLicenseIntegrationService,
    OrderPromotionIntegrationService,
    OrderComboIntegrationService,
    // Sagas
    ConfirmOrderSaga,
    UpdateOrderSaga,
    RefundOrderSaga,
  ],
})
export class MktOrderModule {}
