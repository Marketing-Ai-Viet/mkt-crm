import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktCustomerCreateOnePreQueryHook } from 'src/mkt-core/customer/hooks/mkt-customer-create-one.pre-query.hook';
import { MktCustomerUpdateOnePreQueryHook } from 'src/mkt-core/customer/hooks/mkt-customer-update-one.pre-query.hook';
import { MktCustomerEventListener } from 'src/mkt-core/customer/listeners/mkt-customer-event.listener';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktCustomerTierHistoryRepository } from 'src/mkt-core/customer/repositories/mkt-customer-tier-history.repository';
import { MktCustomerExportResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-export.resolver';
import { MktCustomerLicenseResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-license.resolver';
import { MktCustomerTierResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-tier.resolver';
import { MktCustomerTierHistoryResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-tier-history.resolver';
// Services - organized by domain
import {
  // Core
  MktCustomerCodeGenerationService,
  MktCustomerCreationService,
  MktCustomerUpdateService,
  // Tier
  MktCustomerDowngradePolicyService,
  MktCustomerQueueService,
  MktCustomerTierCalculationService,
  MktCustomerTierHistoryService,
  MktCustomerTierRegistrationService,
  MktCustomerTierService,
  // Lifecycle
  MktCustomerAutoAssignService,
  MktCustomerCategorizationService,
  // Account
  MktCustomerAccountService,
  // License
  MktCustomerLicenseService,
  // Export
  MktCustomerExportService,
} from 'src/mkt-core/customer/services';
import { MktEmailModule } from 'src/mkt-core/email/mkt-email.module';
import { MktLicenseIntegrationModule } from 'src/mkt-core/mkt-license-integration/mkt-license-integration.module';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import {
  MktCustomerCategorizationCronJob,
  MktCustomerTierCronJob,
  MktCustomerTierUpdateJob,
} from 'src/mkt-core/customer/jobs';

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
    MktCustomerTierHistoryRepository,
    MktOrderRepository,

    // Services
    MktCustomerCreationService,
    MktCustomerAccountService,
    MktCustomerTierCalculationService,
    MktCustomerTierHistoryService,
    MktCustomerTierService,
    MktCustomerQueueService,
    MktCustomerUpdateService,
    MktCustomerTierRegistrationService,
    MktCustomerExportService,
    MktCustomerLicenseService,
    MktCustomerCodeGenerationService,
    MktCustomerCategorizationService,
    MktCustomerAutoAssignService,
    MktCustomerDowngradePolicyService,

    // Resolvers (GraphQL)
    MktCustomerLicenseResolver,
    MktCustomerExportResolver,
    MktCustomerTierResolver,
    MktCustomerTierHistoryResolver,

    // Pre-Query Hooks (Validation)
    MktCustomerCreateOnePreQueryHook,
    MktCustomerUpdateOnePreQueryHook,

    // Event Listeners
    MktCustomerEventListener,

    // Jobs & Commands
    MktCustomerTierUpdateJob,
    MktCustomerTierCronJob,
    MktCustomerCategorizationCronJob,
  ],
  exports: [
    // Repositories
    MktCustomerRepository,
    MktCustomerTierHistoryRepository,

    // Services
    MktCustomerCreationService,
    MktCustomerAccountService,
    MktCustomerQueueService,
    MktCustomerTierHistoryService,
    MktCustomerTierRegistrationService,
    MktCustomerExportService,
    MktCustomerLicenseService,
    MktCustomerUpdateService,
    MktCustomerTierService,
    MktCustomerCategorizationService,
    MktCustomerAutoAssignService,
    MktCustomerCodeGenerationService,
    MktCustomerDowngradePolicyService,
  ],
})
export class CustomerModule {}
