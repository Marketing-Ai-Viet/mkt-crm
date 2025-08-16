import { Module } from '@nestjs/common';

import { ConfigurationModule } from './configuration/configuration.module';
import { VariantModule } from './variant/variant.module';

@Module({
  imports: [VariantModule, ConfigurationModule],
  exports: [VariantModule, ConfigurationModule],
})
export class MktCoreModule {}
