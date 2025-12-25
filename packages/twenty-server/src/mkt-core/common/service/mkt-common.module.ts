import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { MktCommonOrderService } from 'src/mkt-core/common/service/mkt-common-order.service';
import { MktFirebaseService } from 'src/mkt-core/common/service/mkt-firebase.service';
import { MktOrderCommonConfirmService } from 'src/mkt-core/common/service/mkt.common-order.confirm.service';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MktPaymentMethodRepository } from 'src/mkt-core/payment-method/repositories';
import { MktPaymentRepository } from 'src/mkt-core/payment/repositories';

@Module({
  imports: [RecordPositionModule, HttpModule],
  providers: [
    MktFirebaseService,
    MktCommonOrderService,
    MktOrderCommonConfirmService,
    MktOrderRepository,
    MktPaymentRepository,
    MktPaymentMethodRepository,
  ],
  exports: [
    MktFirebaseService,
    MktCommonOrderService,
    MktOrderCommonConfirmService,
    MktOrderRepository,
    MktPaymentRepository,
    MktPaymentMethodRepository,
  ],
})
export class MktCommonModule {}
