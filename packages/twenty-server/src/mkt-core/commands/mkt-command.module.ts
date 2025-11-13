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
import { CustomerModule } from 'src/mkt-core/customer/customer.module';
import { MktCustomerTierRegistrationService } from 'src/mkt-core/customer/services/mkt-customer-tier-registration.service';
import { MktLicenseDashboardStatsCronJob } from 'src/mkt-core/license/commands/mkt-license-dashboard-stats.cron.job';
import { MktLicenseDashboardStatsRegistrationService } from 'src/mkt-core/license/services/mkt-license-dashboard-stats-registration.service';
import { MktLicenseDashboardStatsService } from 'src/mkt-core/license/services/mkt-license-dashboard-stats.service';
import { MktOrderOverdueRegistrationService } from 'src/mkt-core/order/services/mkt-order-overdue-registration.service';
import { MktPeopleSyncRegistrationService } from 'src/mkt-core/user-management/services/mkt-people-sync-registration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace], 'core'),
    MessageQueueModule,
    MktCommonModule,
    CustomerModule,
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
    MktOrderOverdueRegistrationService,
    MktPeopleSyncRegistrationService,
    MktCustomerTierRegistrationService,
  ],
  exports: [
    MktCronRegisterCommand,
    MktLicenseDashboardStatsCronJob,
    MktLicenseDashboardStatsService,
    MktLicenseDashboardStatsRegistrationService,
    MktOrderOverdueRegistrationService,
    MktPeopleSyncRegistrationService,
    MktCustomerTierRegistrationService,
  ],
})
export class MktCommandModule {}
