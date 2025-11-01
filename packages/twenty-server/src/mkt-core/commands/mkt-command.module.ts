import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { ObjectMetadataModule } from 'src/engine/metadata-modules/object-metadata/object-metadata.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { WorkspaceDataSourceModule } from 'src/engine/workspace-datasource/workspace-datasource.module';
import { MktCronRegisterCommand } from 'src/mkt-core/commands/mkt-cron-register.command';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktLicenseDashboardStatsCronJob } from 'src/mkt-core/license/commands/mkt-license-dashboard-stats.cron.job';
import { MktLicenseDashboardStatsRegistrationService } from 'src/mkt-core/license/services/mkt-license-dashboard-stats-registration.service';
import { MktLicenseDashboardStatsService } from 'src/mkt-core/license/services/mkt-license-dashboard-stats.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace], 'core'),
    MessageQueueModule,
    MktCommonModule,
    ObjectMetadataModule,
    TwentyORMModule,
    WorkspaceCacheStorageModule,
    WorkspaceDataSourceModule,
  ],
  providers: [
    MktCronRegisterCommand,
    MktLicenseDashboardStatsCronJob,
    MktLicenseDashboardStatsService,
    MktLicenseDashboardStatsRegistrationService,
  ],
  exports: [
    MktCronRegisterCommand,
    MktLicenseDashboardStatsCronJob,
    MktLicenseDashboardStatsService,
    MktLicenseDashboardStatsRegistrationService,
  ],
})
export class MktCommandModule {}
