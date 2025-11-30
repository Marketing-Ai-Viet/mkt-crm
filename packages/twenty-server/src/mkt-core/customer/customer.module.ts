import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktCustomerTierUpdateCommand } from 'src/mkt-core/customer/commands/mkt-customer-tier-update.command';
import { MktCustomerTierCronJob } from 'src/mkt-core/customer/commands/mkt-customer-tier.cron.job';
import { MktCustomerExportController } from 'src/mkt-core/customer/controllers/mkt-customer-export.controller';
import { MktCustomerTierUpdateJob } from 'src/mkt-core/customer/jobs/mkt-customer-tier-update.job';
import { MktCustomerLicenseResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-license.resolver';
import {
  MktCustomerCreationService,
  MktCustomerTierCalculationService,
  MktCustomerTierService,
  MktCustomerUpdateService,
} from 'src/mkt-core/customer/services';
import { MktCustomerExportService } from 'src/mkt-core/customer/services/mkt-customer-export.service';
import { MktCustomerLicenseService } from 'src/mkt-core/customer/services/mkt-customer-license.service';
import { MktCustomerQueueService } from 'src/mkt-core/customer/services/mkt-customer-queue.service';
import { MktCustomerTierRegistrationService } from 'src/mkt-core/customer/services/mkt-customer-tier-registration.service';
import { MktCustomerCodeGenerationService } from 'src/mkt-core/customer/services/mkt-customer-code-generation.service';
import { MktEmailModule } from 'src/mkt-core/email/mkt-email.module';

@Module({
  imports: [
    MktCommonModule,
    EmailModule,
    MktEmailModule,
    TokenModule,
    TwentyORMModule,
    WorkspaceCacheStorageModule,
  ],
  controllers: [MktCustomerExportController],
  providers: [
    MktCustomerCreationService,
    MktCustomerTierCalculationService,
    MktCustomerTierService,
    MktCustomerQueueService,
    MktCustomerUpdateService,
    //MktCustomerEventListener,
    MktCustomerTierUpdateJob,
    MktCustomerTierUpdateCommand,
    MktCustomerTierCronJob,
    MktCustomerTierRegistrationService,
    MktCustomerExportService,
    MktCustomerLicenseService,
    MktCustomerLicenseResolver,
    MktCustomerCodeGenerationService,
  ],
  exports: [
    MktCustomerCreationService,
    MktCustomerQueueService,
    MktCustomerTierRegistrationService,
    MktCustomerExportService,
    MktCustomerLicenseService,
    MktCustomerUpdateService,
  ],
})
export class CustomerModule {}
