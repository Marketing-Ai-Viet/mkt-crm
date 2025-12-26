import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { MktFirebaseService } from 'src/mkt-core/common/service/mkt-firebase.service';

/**
 * MktCommonModule - Common services shared across modules
 *
 * Note: Order-related services (MktCommonOrderService, MktOrderCommonConfirmService)
 * have been moved to MktOrderModule for better code organization.
 */
@Module({
  imports: [HttpModule, RecordPositionModule],
  providers: [MktFirebaseService],
  exports: [MktFirebaseService],
})
export class MktCommonModule {}
