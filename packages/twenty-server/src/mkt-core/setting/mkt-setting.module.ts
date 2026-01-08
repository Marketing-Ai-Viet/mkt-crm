import { Module } from '@nestjs/common';

import { MktOptionRepository } from 'src/mkt-core/setting/repositories';

/**
 * MktSettingModule
 *
 * Module for managing workspace settings and options.
 * Provides configuration management through key-value storage.
 */
@Module({
  providers: [MktOptionRepository],
  exports: [MktOptionRepository],
})
export class MktSettingModule {}
