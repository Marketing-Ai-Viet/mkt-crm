import { Module } from '@nestjs/common';

import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktContractModule } from 'src/mkt-core/contract/mkt-contract.module';
import { CustomerModule } from 'src/mkt-core/customer/customer.module';
import { MktInvoiceModule } from 'src/mkt-core/invoice/mkt-invoice.module';
import { MktLicenseIntegrationModule } from 'src/mkt-core/mkt-license-integration/mkt-license-integration.module';
import { MktProductIntegrationModule } from 'src/mkt-core/mkt-product-integration';
import { MktPromotionModule } from 'src/mkt-core/mkt-promotion/mkt-promotion.module';
import { MktOrderOverdueCronJob } from 'src/mkt-core/order/commands/mkt-order-overdue.cron.job';
import { MktPaymentModule } from 'src/mkt-core/payment/mkt-payment.module';
import { MktEmailModule } from 'src/mkt-core/email/mkt-email.module';
import {
  MktOrderRepository,
  MktOrderItemRepository,
} from 'src/mkt-core/order/repositories';

import {
  // Core Services
  OrderCalculationService,
  OrderValidationService,
  OrderStatusService,
  OrderEventService,
  // Domain Services
  OrderCrudService,
  OrderItemService,
  OrderLicenseQueryService,
  // Application Services
  OrderOrchestrationService,
  // Legacy Services
  OrderService,
  OrderActionService,
  OrderConfirmService,
  OrderPayloadService,
  OrderLicenseRenewService,
  MktOrderOverdueService,
  MktOrderOverdueRegistrationService,
} from './services';
import { OrderMutationResolver, OrderItemMutationResolver } from './resolvers';
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
  OrderProductIntegrationService,
  OrderLicenseIntegrationService,
  OrderPromotionIntegrationService,
} from './services/integration';

@Module({
  imports: [
    EmailModule,
    MktEmailModule,
    MessageQueueModule,
    RecordPositionModule,
    MktPaymentModule,
    MktInvoiceModule,
    MktProductIntegrationModule, // External MKT Server product integration
    MktLicenseIntegrationModule, // External MKT Server license integration
    MktPromotionModule, // Promotion and coupon management
    MktCommonModule,
    MktContractModule,
    CustomerModule,
  ],
  providers: [
    // Event Listeners
    MktOrderCustomEventListener,
    LicenseLifecycleListener,

    // Repositories (Data Access Layer)
    MktOrderRepository,
    MktOrderItemRepository,

    // Core Services (stateless business logic)
    OrderStatusService,
    OrderCalculationService,
    OrderValidationService,
    OrderEventService,

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

    // Saga Steps
    CreateOrderStep,
    CreateOrderItemsStep,
    CreateLicensesStep,
    CreatePaymentStep,
    FinalizeOrderStep,
    // New steps for snapshots and promotions
    CreateSnapshotsStep,
    CalculatePromotionStep,
    RecordPromotionUsageStep,

    // Integration Services (bridge to other MKT modules)
    OrderProductIntegrationService,
    OrderLicenseIntegrationService,
    OrderPromotionIntegrationService,

    // Legacy Services (backward compatibility)
    OrderService,
    OrderActionService,
    OrderConfirmService,
    OrderPayloadService,
    OrderLicenseRenewService,
    MktOrderOverdueService,
    MktOrderOverdueRegistrationService,
    MktOrderOverdueCronJob,

    // GraphQL Resolvers
    OrderMutationResolver,
    OrderItemMutationResolver,
  ],
  exports: [
    // Repositories
    MktOrderRepository,
    MktOrderItemRepository,
    // Services
    OrderStatusService,
    OrderEventService,
    OrderItemService,
    OrderCrudService,
    OrderLicenseQueryService,
    OrderOrchestrationService,
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
