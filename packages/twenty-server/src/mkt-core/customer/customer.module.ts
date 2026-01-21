import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { CUSTOMER_BLOCK_HOOKS } from 'src/mkt-core/customer/hooks/customer-block.pre-query.hook';
import {
  MktCustomerCategorizationCronJob,
  MktCustomerTierCronJob,
  MktCustomerTierUpdateJob,
} from 'src/mkt-core/customer/jobs';
import { MktCustomerEventListener } from 'src/mkt-core/customer/listeners/mkt-customer-event.listener';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktCustomerTierHistoryRepository } from 'src/mkt-core/customer/repositories/mkt-customer-tier-history.repository';
import { CustomerMutationResolver } from 'src/mkt-core/customer/resolvers/customer-mutation.resolver';
import { CustomerQueryResolver } from 'src/mkt-core/customer/resolvers/customer-query.resolver';
import { MktCustomerExportResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-export.resolver';
import { MktCustomerLicenseResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-license.resolver';
import { MktCustomerLinkedAccountResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-linked-account.resolver';
import { MktCustomerTierResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-tier.resolver';
import { MktCustomerTierHistoryResolver } from 'src/mkt-core/customer/resolvers/mkt-customer-tier-history.resolver';
import {
  MktCustomerAccountService,
  MktCustomerAutoAssignService,
  MktCustomerCategorizationService,
  MktCustomerCodeGenerationService,
  MktCustomerCronRegistrationService,
  MktCustomerDowngradePolicyService,
  MktCustomerExportService,
  MktCustomerLicenseService,
  MktCustomerQueueService,
  MktCustomerTierCalculationService,
  MktCustomerTierHistoryService,
  MktCustomerTierService,
} from 'src/mkt-core/customer/services';
import { MktCustomerService } from 'src/mkt-core/customer/services/mkt-customer.service';
import { MktCustomerValidationService } from 'src/mkt-core/customer/services/validation/mkt-customer-validation.service';
import { MktEmailModule } from 'src/mkt-core/email/mkt-email.module';
import { MktLicenseIntegrationModule } from 'src/mkt-core/mkt-license-integration/mkt-license-integration.module';
import { MktSendmailTemplateModule } from 'src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.module';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';

@Module({
  imports: [
    EmailModule,
    MktEmailModule,
    MktSendmailTemplateModule,
    TokenModule,
    TwentyORMModule,
    WorkspaceCacheStorageModule,
    MktLicenseIntegrationModule,
    MessageQueueModule, // For cron job registration
    // For MktCustomerCronRegistrationService to access workspace list from core schema
    TypeOrmModule.forFeature([Workspace], 'core'),
  ],
  providers: [
    // Repositories
    MktCustomerRepository,
    MktCustomerTierHistoryRepository,
    MktWorkspaceMemberRepository,
    MktOrderRepository,

    // Services - Core
    MktCustomerService,
    MktCustomerValidationService,
    MktCustomerCodeGenerationService,

    // Services - Account & Tier
    MktCustomerAccountService,
    MktCustomerTierCalculationService,
    MktCustomerTierHistoryService,
    MktCustomerTierService,
    MktCustomerDowngradePolicyService,

    // Services - Lifecycle & Categorization
    MktCustomerCategorizationService,
    MktCustomerAutoAssignService,

    // Services - Integration & Export
    MktCustomerQueueService,
    MktCustomerExportService,
    MktCustomerLicenseService,
    MktCustomerCronRegistrationService,

    // Resolvers - CRUD
    CustomerQueryResolver,
    CustomerMutationResolver,

    // Resolvers - Domain-specific
    MktCustomerLicenseResolver,
    MktCustomerLinkedAccountResolver,
    MktCustomerExportResolver,
    MktCustomerTierResolver,
    MktCustomerTierHistoryResolver,

    // Hooks - Block auto-generated GraphQL operations
    ...CUSTOMER_BLOCK_HOOKS,

    // Event Listeners
    MktCustomerEventListener,

    // Jobs & Cron
    MktCustomerTierUpdateJob,
    MktCustomerTierCronJob,
    MktCustomerCategorizationCronJob,
  ],
  exports: [
    // Repositories
    MktCustomerRepository,
    MktCustomerTierHistoryRepository,

    // Services - Core
    MktCustomerService,
    MktCustomerValidationService,
    MktCustomerCodeGenerationService,

    // Services - Account & Tier
    MktCustomerAccountService,
    MktCustomerTierCalculationService,
    MktCustomerTierHistoryService,
    MktCustomerTierService,
    MktCustomerDowngradePolicyService,

    // Services - Lifecycle & Categorization
    MktCustomerCategorizationService,
    MktCustomerAutoAssignService,

    // Services - Integration & Export
    MktCustomerQueueService,
    MktCustomerExportService,
    MktCustomerLicenseService,
  ],
})
export class CustomerModule {}
