import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { MktCommonOrderService } from 'src/mkt-core/common/service/mkt-common-order.service';
import { MktFirebaseService } from 'src/mkt-core/common/service/mkt-firebase.service';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktOrderCommonConfirmService } from 'src/mkt-core/common/service/mkt.common-order.confirm.service';

@Module({
  imports: [RecordPositionModule, HttpModule],
  providers: [
    MktRepositoryService,
    MktFirebaseService,
    MktCommonOrderService,
    MktOrderCommonConfirmService,
  ],
  exports: [
    MktRepositoryService,
    MktFirebaseService,
    MktCommonOrderService,
    MktOrderCommonConfirmService,
  ],
})
export class MktCommonModule {}
