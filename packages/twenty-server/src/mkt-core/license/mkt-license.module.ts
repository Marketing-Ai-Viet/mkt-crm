import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { ObjectMetadataModule } from 'src/engine/metadata-modules/object-metadata/object-metadata.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { WorkspaceDataSourceModule } from 'src/engine/workspace-datasource/workspace-datasource.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktLicenseUpdateOnePostQueryHook } from 'src/mkt-core/license/hooks/mkt-license-update-one.post-query.hook';
import { MktLicenseUpdateOnePreQueryHook } from 'src/mkt-core/license/hooks/mkt-license-update-one.pre-query.hook';
import { MktLicenseApiService } from 'src/mkt-core/license/integration/mkt-license-api.service';
import { MktLicenseCsvExportController } from 'src/mkt-core/license/integration/mkt-license-csv-export.controller';
import { MktLicenseCsvExportService } from 'src/mkt-core/license/integration/mkt-license-csv-export.service';
import { LicenseGenerationJob } from 'src/mkt-core/license/jobs/license-generation.job';
import { MktLicenseCreateOnePreQueryHook } from 'src/mkt-core/license/mkt-license-create-one.pre-query.hook';
import { MktLicenseHistoryService } from 'src/mkt-core/license/mkt-license-history.service';
import { MktLicenseService } from 'src/mkt-core/license/mkt-license.service';
import { MktLicenseExportResolver } from 'src/mkt-core/license/resolvers/mkt-license-export.resolver';
import { MktLicenseDashboardService } from 'src/mkt-core/license/services/mkt-license.dashboard.service';
import { MktLicenseEventService } from 'src/mkt-core/license/services/mkt-license.event.service';
import { MktLicenseRenewService } from 'src/mkt-core/license/services/mkt-license.renew.service';

@Module({
  imports: [
    HttpModule,
    MktCommonModule,
    TokenModule,
    ObjectMetadataModule,
    TwentyORMModule,
    WorkspaceCacheStorageModule,
    WorkspaceDataSourceModule,
    TypeOrmModule.forFeature([Workspace], 'core'),
  ],
  controllers: [MktLicenseCsvExportController],
  providers: [
    MktLicenseService,
    MktLicenseCreateOnePreQueryHook,
    MktLicenseApiService,
    MktLicenseCsvExportService,
    MktLicenseExportResolver,
    LicenseGenerationJob,
    MktLicenseUpdateOnePreQueryHook,
    MktLicenseEventService,
    MktLicenseHistoryService,
    MktLicenseUpdateOnePostQueryHook,
    MktLicenseRenewService,
    MktLicenseDashboardService,
  ],
  exports: [
    MktLicenseService,
    MktLicenseApiService,
    MktLicenseEventService,
    MktLicenseDashboardService,
    MktLicenseCsvExportService,
  ],
})
export class MktLicenseModule {}
