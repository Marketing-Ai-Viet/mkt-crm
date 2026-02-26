import { Logger, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  CustomerTierStatisticsOutput,
  CustomerUpgradeEligibilityOutput,
} from 'src/mkt-core/customer/dto/customer-tier.output';
import { MktCustomerTierService } from 'src/mkt-core/customer/services/tier/mkt-customer-tier.service';
import { CUSTOMER_DATA_SCOPE } from 'src/mkt-core/customer/constants';
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';

/**
 * MktCustomerTierResolver - GraphQL resolver for customer tier operations
 */
@Resolver()
export class MktCustomerTierResolver {
  private readonly logger = new Logger(MktCustomerTierResolver.name);

  constructor(private readonly customerTierService: MktCustomerTierService) {}

  /**
   * Get customer tier statistics
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(CUSTOMER_DATA_SCOPE.QUERY_AGGREGATION)
  @Query(() => CustomerTierStatisticsOutput, {
    name: 'mktCustomerTierStatistics',
    description: 'Get customer tier distribution and statistics',
  })
  async getCustomerTierStatistics(
    @AuthWorkspace() workspace: Workspace,
  ): Promise<CustomerTierStatisticsOutput> {
    this.logger.log(`Getting tier statistics for workspace ${workspace.id}`);

    const statistics = await this.customerTierService.getCustomerTierStatistics(
      workspace.id,
    );

    return {
      tierDistribution: statistics.tierDistribution,
      totalCustomers: statistics.totalCustomers,
      averageOrderValue: statistics.averageOrderValue,
      averageOrderCount: statistics.averageOrderCount,
    };
  }

  /**
   * Check customer upgrade eligibility
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(CUSTOMER_DATA_SCOPE.QUERY_SINGLE)
  @Query(() => CustomerUpgradeEligibilityOutput, {
    name: 'mktCustomerUpgradeEligibility',
    description: 'Check if a customer is eligible for tier upgrade',
  })
  async checkCustomerUpgradeEligibility(
    @Args('customerId', { type: () => String }) customerId: string,
  ): Promise<CustomerUpgradeEligibilityOutput> {
    this.logger.log(`Checking upgrade eligibility for customer ${customerId}`);

    const eligibility =
      await this.customerTierService.checkCustomerUpgradeEligibility(
        customerId,
      );

    return {
      currentTier: eligibility.currentTier,
      canUpgrade: eligibility.canUpgrade,
      nextTier: eligibility.nextTier,
      requirements: eligibility.requirements,
    };
  }
}
