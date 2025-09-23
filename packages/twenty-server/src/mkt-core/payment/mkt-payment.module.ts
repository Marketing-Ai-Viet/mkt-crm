import { Module } from '@nestjs/common';

import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';

import { MktPaymentCreateOnePreQueryHook } from './hooks/mkt-payment-create-one.pre-query.hook';
import { MktPaymentUpdateOnePreQueryHook } from './hooks/mkt-payment-update-one.pre-query.hook';
import { MktPaymentPrepareService } from './services/mkt-payment-prepare.service';
import { MktPaymentService } from './services/mkt-payment.service';
@Module({
  imports: [RecordPositionModule],
  providers: [
    MktPaymentCreateOnePreQueryHook,
    MktPaymentUpdateOnePreQueryHook,
    MktPaymentPrepareService,
    MktPaymentService,
  ],
  exports: [MktPaymentPrepareService, MktPaymentService],
})
export class MktPaymentModule {}
