import { Module } from '@nestjs/common';

import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';

import { VariantGroupByResolver } from './resolvers/variant-group-by-v-2.resolver';
import { VariantGroupByService } from './services/variant-group-by-v-2.service';

@Module({
  imports: [TwentyORMModule],
  providers: [VariantGroupByService, VariantGroupByResolver],
  exports: [VariantGroupByService],
})
export class VariantModule {}
