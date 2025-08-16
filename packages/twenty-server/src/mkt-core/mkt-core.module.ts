import { Module } from '@nestjs/common';

import { VariantModule } from './variant/variant.module';

@Module({
  imports: [VariantModule],
  exports: [VariantModule],
})
export class MktCoreModule {}
