import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktCustomerTierUpdateCommand } from 'src/mkt-core/customer/commands/mkt-customer-tier-update.command';
import { MktCustomerTierCronJob } from 'src/mkt-core/customer/commands/mkt-customer-tier.cron.job';
import { MktCustomerTierUpdateJob } from 'src/mkt-core/customer/jobs/mkt-customer-tier-update.job';
import { MktCustomerEventListener } from 'src/mkt-core/customer/listeners/mkt-customer-event.listener';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktCustomerExportResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-export.resolver';
import { MktCustomerLicenseResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-license.resolver';
import { MktCustomerTierResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-tier.resolver';
import {
  MktCustomerCreationService,
  MktCustomerTierCalculationService,
  MktCustomerTierService,
  MktCustomerUpdateService,
} from 'src/mkt-core/customer/services';
import { MktCustomerCodeGenerationService } from 'src/mkt-core/customer/services/mkt-customer-code-generation.service';
import { MktCustomerExportService } from 'src/mkt-core/customer/services/mkt-customer-export.service';
import { MktCustomerLicenseService } from 'src/mkt-core/customer/services/mkt-customer-license.service';
import { MktCustomerQueueService } from 'src/mkt-core/customer/services/mkt-customer-queue.service';
import { MktCustomerTierRegistrationService } from 'src/mkt-core/customer/services/mkt-customer-tier-registration.service';
import { MktEmailModule } from 'src/mkt-core/email/mkt-email.module';
import { MktLicenseIntegrationModule } from 'src/mkt-core/mkt-license-integration/mkt-license-integration.module';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';

@Module({
  imports: [
    MktCommonModule,
    EmailModule,
    MktEmailModule,
    TokenModule,
    TwentyORMModule,
    WorkspaceCacheStorageModule,
    MktLicenseIntegrationModule,
  ],
  providers: [
    // Repositories
    MktCustomerRepository,
    MktOrderRepository,

    // Services
    MktCustomerCreationService,
    MktCustomerTierCalculationService,
    MktCustomerTierService,
    MktCustomerQueueService,
    MktCustomerUpdateService,
    MktCustomerTierRegistrationService,
    MktCustomerExportService,
    MktCustomerLicenseService,
    MktCustomerCodeGenerationService,

    // Resolvers (GraphQL)
    MktCustomerLicenseResolver,
    MktCustomerExportResolver,
    MktCustomerTierResolver,

    // Event Listeners
    MktCustomerEventListener,

    // Jobs & Commands
    MktCustomerTierUpdateJob,
    MktCustomerTierUpdateCommand,
    MktCustomerTierCronJob,
  ],
  exports: [
    // Repositories
    MktCustomerRepository,

    // Services
    MktCustomerCreationService,
    MktCustomerQueueService,
    MktCustomerTierRegistrationService,
    MktCustomerExportService,
    MktCustomerLicenseService,
    MktCustomerUpdateService,
    MktCustomerTierService,
  ],
})
export class CustomerModule {}
