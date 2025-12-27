import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';

/**
 * MktCommonModule - Common services shared across modules
 *
 * Note: Order-related services (MktCommonOrderService, MktOrderCommonConfirmService)
 * have been moved to MktOrderModule for better code organization.
 */
@Module({
  imports: [HttpModule, RecordPositionModule],
  providers: [],
  exports: [],
})
export class MktCommonModule {}
