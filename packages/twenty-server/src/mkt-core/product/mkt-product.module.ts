import { Module } from '@nestjs/common';

import { VariantService } from 'src/mkt-core/product/services/variant.service';

import { MktVariantValueUpdateOnePreQueryHook } from './hooks/mkt-variant-value-update-one.pre-query.hook';

@Module({
  providers: [MktVariantValueUpdateOnePreQueryHook, VariantService],
  exports: [],
})
export class MktProductModule {}
