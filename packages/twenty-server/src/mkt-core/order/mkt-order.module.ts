import { Module } from '@nestjs/common';

import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { MktLicenseModule } from 'src/mkt-core/license/mkt-license.module';
import { OrderActionService } from 'src/mkt-core/order/services/order.action.service';
import { OrderPayloadService } from 'src/mkt-core/order/services/order.payload.service';
import { MktPaymentModule } from 'src/mkt-core/payment/mkt-payment.module';
import { OrderConfirmService } from 'src/mkt-core/order/services/order.confirm.service';

import { MktOrderResolver } from './mkt-order.resolver';
import { MktOrderService } from './mkt-order.service';

import { MktOrderCreateOnePreQueryHook } from './hooks/mkt-order-create-one.pre-query.hook';
import { MktOrderCreateOnePostQueryHook } from './hooks/mkt-order-create-one.post-query.hook';
import { MktOrderItemUpdateOnePreQueryHook } from './hooks/mkt-order-item-update-one.pre-query.hook';
import { MktOrderUpdateOnePreQueryHook } from './hooks/mkt-order-update-one.pre-query.hook';
@Module({
  imports: [
    MessageQueueModule,
    RecordPositionModule,
    MktPaymentModule,
    MktLicenseModule,
  ],
  providers: [
    MktOrderResolver,
    MktOrderService,
    MktOrderCreateOnePreQueryHook,
    MktOrderUpdateOnePreQueryHook,
    MktOrderItemUpdateOnePreQueryHook,
    MktOrderCreateOnePostQueryHook,
    OrderPayloadService,
    OrderActionService,
    OrderConfirmService,
  ],
  exports: [MktOrderService],
})
export class MktOrderModule {}
