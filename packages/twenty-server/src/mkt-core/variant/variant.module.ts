import { Module } from '@nestjs/common';

import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';

import { VariantGroupByResolver } from './resolvers/variant-group-by.resolver';
import { VariantGroupByService } from './services/variant-group-by.service';

@Module({
  imports: [TwentyORMModule],
  providers: [VariantGroupByService, VariantGroupByResolver],
  exports: [VariantGroupByService],
})
export class VariantModule {}
