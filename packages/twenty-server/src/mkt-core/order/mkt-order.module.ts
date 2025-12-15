import { Module } from '@nestjs/common';

import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktContractModule } from 'src/mkt-core/contract/mkt-contract.module';
import { CustomerModule } from 'src/mkt-core/customer/customer.module';
import { MktInvoiceModule } from 'src/mkt-core/invoice/mkt-invoice.module';
import { MktLicenseModule } from 'src/mkt-core/license/mkt-license.module';
import { MktOrderOverdueCronJob } from 'src/mkt-core/order/commands/mkt-order-overdue.cron.job';
import { MktPaymentModule } from 'src/mkt-core/payment/mkt-payment.module';
import { MktProductModule } from 'src/mkt-core/product/mkt-product.module';
import { MktEmailModule } from 'src/mkt-core/email/mkt-email.module';

// Clean Architecture Services
import {
  // Core Services
  OrderCalculationService,
  OrderValidationService,
  OrderStatusService,
  OrderEventService,
  // Domain Services
  OrderCrudService,
  OrderItemService,
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

import { MktOrderCustomEventListener } from './listeners/mkt-order-custom-event.listener';
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
} from './orchestration/steps';

@Module({
  imports: [
    EmailModule,
    MktEmailModule,
    MessageQueueModule,
    RecordPositionModule,
    MktPaymentModule,
    MktLicenseModule,
    MktInvoiceModule,
    MktProductModule,
    MktCommonModule,
    MktContractModule,
    CustomerModule,
  ],
  providers: [
    // Event Listeners
    MktOrderCustomEventListener,

    // Core Services (stateless business logic)
    OrderStatusService,
    OrderCalculationService,
    OrderValidationService,
    OrderEventService,

    // Domain Services (domain operations)
    OrderCrudService,
    OrderItemService,

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
    // Services
    OrderStatusService,
    OrderEventService,
    OrderItemService,
    OrderOrchestrationService,
    // Sagas
    ConfirmOrderSaga,
    UpdateOrderSaga,
    RefundOrderSaga,
  ],
})
export class MktOrderModule {}
