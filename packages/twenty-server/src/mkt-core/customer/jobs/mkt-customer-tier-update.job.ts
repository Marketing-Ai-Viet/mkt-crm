import { Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { TIER_CHANGE_REASON } from 'src/mkt-core/customer/constants/mkt-customer-tier-history.constants';
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktCustomerTierHistoryService } from 'src/mkt-core/customer/services/tier/mkt-customer-tier-history.service';
import { MktCustomerTierService } from 'src/mkt-core/customer/services/tier/mkt-customer-tier.service';
import { MktCustomerDowngradePolicyService } from 'src/mkt-core/customer/services/tier/mkt-customer-downgrade-policy.service';

export type MktCustomerTierUpdateJobData = {
  customerId: string;
  workspaceId: string;
  reason?: 'order_completed' | 'manual';
};

@Processor(MessageQueue.customerQueue)
export class MktCustomerTierUpdateJob {
  private readonly logger = new Logger(MktCustomerTierUpdateJob.name);

  constructor(
    private readonly mktCustomerTierService: MktCustomerTierService,
    private readonly customerRepository: MktCustomerRepository,
    private readonly tierHistoryService: MktCustomerTierHistoryService,
    private readonly downgradePolicyService: MktCustomerDowngradePolicyService,
  ) {}

  @Process(MktCustomerTierUpdateJob.name)
  async handle(data: MktCustomerTierUpdateJobData): Promise<void> {
    const { customerId, workspaceId, reason = 'order_completed' } = data;
    const startTime = Date.now();

    this.logger.log('Processing customer tier update', {
      customerId,
      workspaceId,
      reason,
    });

    try {
      // Get customer's current tier before update
      const customer =
        await this.customerRepository.findCustomerById(customerId);
      const previousTier = (customer.tier as MKT_CUSTOMER_TIER) ?? null;

      // Update tier and get new result
      const result =
        await this.mktCustomerTierService.updateCustomerTier(customerId);

      const newTier = result.customerTier;
      const durationMs = Date.now() - startTime;

      this.logger.log('Customer tier updated', {
        customerId,
        previousTier,
        newTier,
        durationMs,
      });

      // Log tier history if tier changed
      if (previousTier !== newTier) {
        const changeReason =
          reason === 'order_completed'
            ? TIER_CHANGE_REASON.ORDER_COMPLETED
            : TIER_CHANGE_REASON.MANUAL_UPDATE;

        await this.tierHistoryService.logTierChange(
          workspaceId,
          customerId,
          previousTier,
          newTier,
          changeReason,
          {
            orderValue: result.totalOrderValue,
            orderCount: result.totalOrderCount,
          },
        );

        this.logger.debug('Logged tier change history', {
          customerId,
          previousTier,
          newTier,
          changeReason,
        });

        // Update lastTierUpgradeAt if this is an upgrade
        if (this.downgradePolicyService.isUpgrade(previousTier, newTier)) {
          await this.downgradePolicyService.updateLastTierUpgrade(
            workspaceId,
            customerId,
          );
          this.logger.debug('Updated lastTierUpgradeAt', { customerId });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to update customer tier', {
        customerId,
        workspaceId,
        error: errorMessage,
      });
      throw error;
    }
  }
}
