import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktLicenseUpdateOnePostQueryHook } from 'src/mkt-core/license/hooks/mkt-license-update-one.post-query.hook';
import { MktLicenseUpdateOnePreQueryHook } from 'src/mkt-core/license/hooks/mkt-license-update-one.pre-query.hook';
import { MktLicenseApiService } from 'src/mkt-core/license/integration/mkt-license-api.service';
import { LicenseGenerationJob } from 'src/mkt-core/license/jobs/license-generation.job';
import { MktLicenseCreateOnePreQueryHook } from 'src/mkt-core/license/mkt-license-create-one.pre-query.hook';
import { MktLicenseHistoryService } from 'src/mkt-core/license/mkt-license-history.service';
import { MktLicenseService } from 'src/mkt-core/license/mkt-license.service';
import { MktLicenseEventService } from 'src/mkt-core/license/services/mkt-license.event.service';
import { MktLicenseRenewService } from 'src/mkt-core/license/services/mkt-license.renew.service';
@Module({
  imports: [HttpModule, MktCommonModule],
  providers: [
    MktLicenseService,
    MktLicenseCreateOnePreQueryHook,
    MktLicenseApiService,
    LicenseGenerationJob,
    MktLicenseUpdateOnePreQueryHook,
    MktLicenseEventService,
    MktLicenseHistoryService,
    MktLicenseUpdateOnePostQueryHook,
    MktLicenseRenewService,
  ],
  exports: [MktLicenseService, MktLicenseEventService],
})
export class MktLicenseModule {}
