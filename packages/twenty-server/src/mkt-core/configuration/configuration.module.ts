import { Module } from '@nestjs/common';
import { ConfigurationResolver } from './configuration.resolver';
import { ConfigurationService } from './configuration.service';

@Module({
  providers: [ConfigurationResolver, ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
