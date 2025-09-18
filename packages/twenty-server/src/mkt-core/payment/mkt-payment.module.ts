import { Module } from '@nestjs/common';

import { MktPaymentCreateOnePreQueryHook } from './hooks/mkt-payment-create-one.pre-query.hook';
import { MktPaymentUpdateOnePreQueryHook } from './hooks/mkt-payment-update-one.pre-query.hook';
import { MktPaymentPrepareService } from './services/mkt-payment-prepare.service';

@Module({
  providers: [
    MktPaymentCreateOnePreQueryHook,
    MktPaymentUpdateOnePreQueryHook,
    MktPaymentPrepareService,
  ],
  exports: [MktPaymentPrepareService],
})
export class MktPaymentModule {}
