import { Module } from '@nestjs/common';

import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktCustomerTierUpdateCommand } from 'src/mkt-core/customer/commands/mkt-customer-tier-update.command';
import { MktCustomerTierCronJob } from 'src/mkt-core/customer/commands/mkt-customer-tier.cron.job';
import { MktCustomerTierUpdateJob } from 'src/mkt-core/customer/jobs/mkt-customer-tier-update.job';
import { MktCustomerEventListener } from 'src/mkt-core/customer/listeners/mkt-customer-event.listener';
import {
  MktCustomerTierCalculationService,
  MktCustomerTierService,
} from 'src/mkt-core/customer/services';
import { MktCustomerQueueService } from 'src/mkt-core/customer/services/mkt-customer-queue.service';
import { MktCustomerTierRegistrationService } from 'src/mkt-core/customer/services/mkt-customer-tier-registration.service';

@Module({
  imports: [MktCommonModule, EmailModule],
  providers: [
    MktCustomerTierCalculationService,
    MktCustomerTierService,
    MktCustomerQueueService,
    MktCustomerEventListener,
    MktCustomerTierUpdateJob,
    MktCustomerTierUpdateCommand,
    MktCustomerTierCronJob,
    MktCustomerTierRegistrationService,
  ],
  exports: [MktCustomerQueueService, MktCustomerTierRegistrationService],
})
export class CustomerModule {}
