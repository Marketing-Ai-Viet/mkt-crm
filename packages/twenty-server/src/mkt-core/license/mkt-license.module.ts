import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';

import { MktLicenseUpdateOnePreQueryHook } from 'src/mkt-core/license/hooks/mkt-license-update-one.pre-query.hook';
import { MktLicenseApiService } from 'src/mkt-core/license/integration/mkt-license-api.service';
import { LicenseGenerationJob } from 'src/mkt-core/license/jobs/license-generation.job';
import { MktLicenseCreateOnePreQueryHook } from 'src/mkt-core/license/mkt-license-create-one.pre-query.hook';
import { MktLicenseService } from 'src/mkt-core/license/mkt-license.service';
import { MktLicenseEventService } from 'src/mkt-core/license/services/mkt-license.event.service';
@Module({
  imports: [HttpModule, MktCommonModule],
  providers: [
    MktLicenseService,
    MktLicenseCreateOnePreQueryHook,
    MktLicenseApiService,
    LicenseGenerationJob,
    MktLicenseUpdateOnePreQueryHook,
    MktLicenseEventService,
  ],
  exports: [MktLicenseService, MktLicenseEventService],
})
export class MktLicenseModule {}
