import { Module } from '@nestjs/common';

import { MktPaymentCreateOnePreQueryHook } from './hooks/mkt-payment-create-one.pre-query.hook';
import { MktPaymentUpdateOnePreQueryHook } from './hooks/mkt-payment-update-one.pre-query.hook';

@Module({
  providers: [MktPaymentCreateOnePreQueryHook, MktPaymentUpdateOnePreQueryHook],
  exports: [],
})
export class MktPaymentModule {}
