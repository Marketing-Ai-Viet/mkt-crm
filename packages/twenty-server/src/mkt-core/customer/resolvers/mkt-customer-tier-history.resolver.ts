import { Logger, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  CustomerTierHistoryInput,
  CustomerTierHistoryListOutput,
  CustomerTierHistoryOutput,
  TierChangeStatisticsOutput,
  TierHistoryDateRangeInput,
} from 'src/mkt-core/customer/dto/customer-tier-history.output';
import { MktCustomerTierHistoryWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-tier-history.workspace-entity';
import { MktCustomerTierHistoryService } from 'src/mkt-core/customer/services/tier/mkt-customer-tier-history.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktCustomerTierHistoryResolver - GraphQL resolver for tier history queries
 *
 * Provides queries:
 * - mktCustomerTierHistory: Get tier history for a specific customer
 * - mktCustomerLatestTierChange: Get the most recent tier change for a customer
 * - mktTierHistoryByDateRange: Get tier changes within a date range
 * - mktTierChangeStatistics: Get overall tier change statistics
 */
@Resolver()
export class MktCustomerTierHistoryResolver {
  private readonly logger = new Logger(MktCustomerTierHistoryResolver.name);

  constructor(
    private readonly tierHistoryService: MktCustomerTierHistoryService,
  ) {}

  /**
   * Convert entity record to output format
   */
  private mapRecordToOutput(
    record: MktCustomerTierHistoryWorkspaceEntity,
  ): CustomerTierHistoryOutput {
    // createdAt from database is a string, use DateTimeUtils to parse and convert
    const createdAtDateTime = DateTimeUtils.parse(record.createdAt);
    const createdAtDate = DateTimeUtils.toDateRequired(createdAtDateTime);

    return {
      id: record.id,
      customerId: record.customerId ?? '',
      previousTier: record.previousTier,
      newTier: record.newTier,
      reason: record.reason,
      orderValueAtChange: record.orderValueAtChange ?? 0,
      orderCountAtChange: record.orderCountAtChange ?? 0,
      createdAt: createdAtDate,
    };
  }

  /**
   * Get tier history for a specific customer
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => CustomerTierHistoryListOutput, {
    name: 'mktCustomerTierHistory',
    description: 'Get tier change history for a specific customer',
  })
  async getCustomerTierHistory(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CustomerTierHistoryInput,
  ): Promise<CustomerTierHistoryListOutput> {
    this.logger.log(
      `Getting tier history for customer ${input.customerId} in workspace ${workspace.id}`,
    );

    const [history, totalCount] = await Promise.all([
      this.tierHistoryService.getTierHistory(workspace.id, input.customerId, {
        limit: input.limit,
        offset: input.offset,
      }),
      this.tierHistoryService.getCustomerTierChangeCount(
        workspace.id,
        input.customerId,
      ),
    ]);

    const items = history.map((record) => this.mapRecordToOutput(record));

    return {
      items,
      totalCount,
    };
  }

  /**
   * Get the most recent tier change for a customer
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => CustomerTierHistoryOutput, {
    name: 'mktCustomerLatestTierChange',
    nullable: true,
    description: 'Get the most recent tier change for a customer',
  })
  async getLatestTierChange(
    @AuthWorkspace() workspace: Workspace,
    @Args('customerId', { type: () => String }) customerId: string,
  ): Promise<CustomerTierHistoryOutput | null> {
    this.logger.log(
      `Getting latest tier change for customer ${customerId} in workspace ${workspace.id}`,
    );

    const record = await this.tierHistoryService.getLatestTierChange(
      workspace.id,
      customerId,
    );

    if (!record) {
      return null;
    }

    return this.mapRecordToOutput(record);
  }

  /**
   * Get tier history within a date range
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => [CustomerTierHistoryOutput], {
    name: 'mktTierHistoryByDateRange',
    description: 'Get tier changes within a date range',
  })
  async getTierHistoryByDateRange(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: TierHistoryDateRangeInput,
  ): Promise<CustomerTierHistoryOutput[]> {
    this.logger.log(
      `Getting tier history from ${input.startDate.toISOString()} to ${input.endDate.toISOString()} in workspace ${workspace.id}`,
    );

    const history = await this.tierHistoryService.getTierHistoryByDateRange(
      workspace.id,
      input.startDate,
      input.endDate,
      {
        limit: input.limit,
        offset: input.offset,
      },
    );

    return history.map((record) => this.mapRecordToOutput(record));
  }

  /**
   * Get tier change statistics for the workspace
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => TierChangeStatisticsOutput, {
    name: 'mktTierChangeStatistics',
    description: 'Get overall tier change statistics for the workspace',
  })
  async getTierChangeStatistics(
    @AuthWorkspace() workspace: Workspace,
  ): Promise<TierChangeStatisticsOutput> {
    this.logger.log(
      `Getting tier change statistics for workspace ${workspace.id}`,
    );

    const stats = await this.tierHistoryService.getTierChangeStats(
      workspace.id,
    );

    return {
      totalChanges: stats.totalChanges,
      upgradeCount: stats.upgradeCount,
      downgradeCount: stats.downgradeCount,
      changesByReason: stats.changesByReason.map((item) => ({
        reason: item.reason,
        count: item.count,
      })),
    };
  }
}
