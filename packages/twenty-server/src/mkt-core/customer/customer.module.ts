import { Module } from '@nestjs/common';

import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktCustomerTierCronJob } from 'src/mkt-core/customer/commands/mkt-customer-tier.cron.job';
import { MktCustomerTierUpdateCommand } from 'src/mkt-core/customer/commands/mkt-customer-tier-update.command';
import { MktCustomerTierUpdateJob } from 'src/mkt-core/customer/jobs/mkt-customer-tier-update.job';
import {
  MktCustomerTierCalculationService,
  MktCustomerTierService,
} from 'src/mkt-core/customer/services';
import { MktCustomerQueueService } from 'src/mkt-core/customer/services/mkt-customer-queue.service';
import { MktCustomerTierRegistrationService } from 'src/mkt-core/customer/services/mkt-customer-tier-registration.service';

@Module({
  imports: [MktCommonModule],
  providers: [
    MktCustomerTierCalculationService,
    MktCustomerTierService,
    MktCustomerQueueService,
    MktCustomerTierUpdateJob,
    MktCustomerTierUpdateCommand,
    MktCustomerTierCronJob,
    MktCustomerTierRegistrationService,
  ],
  exports: [MktCustomerQueueService, MktCustomerTierRegistrationService],
})
export class CustomerModule {}
