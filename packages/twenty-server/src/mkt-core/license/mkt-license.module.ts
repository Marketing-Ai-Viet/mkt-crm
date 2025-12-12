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
import { MktLicenseCreateOnePreQueryHook } from 'src/mkt-core/license/hooks/mkt-license-create-one.pre-query.hook';
import { MktLicenseUpdateOnePostQueryHook } from 'src/mkt-core/license/hooks/mkt-license-update-one.post-query.hook';
import { MktLicenseUpdateOnePreQueryHook } from 'src/mkt-core/license/hooks/mkt-license-update-one.pre-query.hook';
import { MktLicenseApiService } from 'src/mkt-core/license/integration/mkt-license-api.service';
import { MktLicenseCsvExportController } from 'src/mkt-core/license/integration/mkt-license-csv-export.controller';
import { MktLicenseCsvExportService } from 'src/mkt-core/license/integration/mkt-license-csv-export.service';
import { LicenseGenerationJob } from 'src/mkt-core/license/jobs/license-generation.job';
import { MktLicenseRepository } from 'src/mkt-core/license/repositories/mkt-license.repository';
import { MktLicenseExportResolver } from 'src/mkt-core/license/resolvers/mkt-license-export.resolver';
import { MktLicenseDashboardService } from 'src/mkt-core/license/services/mkt-license.dashboard.service';
import { MktLicenseEventService } from 'src/mkt-core/license/services/mkt-license.event.service';
import { MktLicenseHistoryService } from 'src/mkt-core/license/services/mkt-license-history.service';
import { MktLicenseRenewService } from 'src/mkt-core/license/services/mkt-license.renew.service';
import { MktLicenseService } from 'src/mkt-core/license/services/mkt-license.service';

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
    MktLicenseRepository,
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
    MktLicenseRepository,
    MktLicenseService,
    MktLicenseEventService,
    MktLicenseDashboardService,
    MktLicenseCsvExportService,
  ],
})
export class MktLicenseModule {}
