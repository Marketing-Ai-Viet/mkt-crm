import { Module } from '@nestjs/common';

import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { SepayPaymentController } from 'src/mkt-core/payment/sepay-payment/sepay-payment.controller';

import { MktPaymentCreateOnePreQueryHook } from './hooks/mkt-payment-create-one.pre-query.hook';
import { MktPaymentUpdateOnePreQueryHook } from './hooks/mkt-payment-update-one.pre-query.hook';
import { MktPaymentPrepareService } from './services/mkt-payment-prepare.service';
import { MktPaymentService } from './services/mkt-payment.service';

@Module({
  controllers: [SepayPaymentController],
  imports: [RecordPositionModule, MktCommonModule],
  providers: [
    MktPaymentCreateOnePreQueryHook,
    MktPaymentUpdateOnePreQueryHook,
    MktPaymentPrepareService,
    MktPaymentService,
  ],
  exports: [MktPaymentPrepareService, MktPaymentService],
})
export class MktPaymentModule {}
