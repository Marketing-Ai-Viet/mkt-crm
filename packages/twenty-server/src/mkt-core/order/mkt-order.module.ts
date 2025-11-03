import { Module } from '@nestjs/common';

import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktInvoiceModule } from 'src/mkt-core/invoice/mkt-invoice.module';
import { MktLicenseModule } from 'src/mkt-core/license/mkt-license.module';
import { MktOrderOverdueCronJob } from 'src/mkt-core/order/commands/mkt-order-overdue.cron.job';
import { MktOrderUpdateOnePostQueryHook } from 'src/mkt-core/order/hooks/mkt-order-update-one.post-query.hook';
import { MktOrderOverdueRegistrationService } from 'src/mkt-core/order/services/mkt-order-overdue-registration.service';
import { MktOrderOverdueService } from 'src/mkt-core/order/services/mkt-order-overdue.service';
import { OrderActionService } from 'src/mkt-core/order/services/order.action.service';
import { OrderConfirmService } from 'src/mkt-core/order/services/order.confirm.service';
import { OrderPayloadService } from 'src/mkt-core/order/services/order.payload.service';
import { OrderService } from 'src/mkt-core/order/services/order.service';
import { OrderStatusValidationService } from 'src/mkt-core/order/utils/order-status-validation.service';
import { MktPaymentModule } from 'src/mkt-core/payment/mkt-payment.module';
import { MktProductModule } from 'src/mkt-core/product/mkt-product.module';

import { MktOrderResolver } from './mkt-order.resolver';
import { MktOrderService } from './mkt-order.service';

import { MktOrderCreateOnePostQueryHook } from './hooks/mkt-order-create-one.post-query.hook';
import { MktOrderCreateOnePreQueryHook } from './hooks/mkt-order-create-one.pre-query.hook';
import { MktOrderItemUpdateOnePreQueryHook } from './hooks/mkt-order-item-update-one.pre-query.hook';
import { MktOrderUpdateOnePreQueryHook } from './hooks/mkt-order-update-one.pre-query.hook';
import { MktOrderCustomEventListener } from './listeners/mkt-order-custom-event.listener';
import { OrderLicenseRenewService } from './services/order.license-renew.service';

@Module({
  imports: [
    MessageQueueModule,
    RecordPositionModule,
    MktPaymentModule,
    MktLicenseModule,
    MktInvoiceModule,
    MktProductModule,
    MktCommonModule,
  ],
  providers: [
    MktOrderResolver,
    MktOrderService,
    OrderStatusValidationService,
    MktOrderCreateOnePreQueryHook,
    MktOrderUpdateOnePreQueryHook,
    MktOrderItemUpdateOnePreQueryHook,
    MktOrderCreateOnePostQueryHook,
    MktOrderUpdateOnePostQueryHook,
    MktOrderCustomEventListener,
    OrderPayloadService,
    OrderActionService,
    OrderConfirmService,
    OrderService,
    OrderLicenseRenewService,
    MktOrderOverdueService,
    MktOrderOverdueRegistrationService,
    MktOrderOverdueCronJob,
  ],
  exports: [MktOrderService],
})
export class MktOrderModule {}
