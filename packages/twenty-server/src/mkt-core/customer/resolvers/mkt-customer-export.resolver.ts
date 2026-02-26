import { Logger, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  CustomerExportInput,
  CustomerExportStatisticsInput,
} from 'src/mkt-core/customer/dto/customer-export.input';
import {
  CustomerExportOutput,
  CustomerExportStatisticsOutput,
} from 'src/mkt-core/customer/dto/customer-export.output';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerExportService } from 'src/mkt-core/customer/services/export/mkt-customer-export.service';
import { CustomerExportFilter } from 'src/mkt-core/customer/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { CUSTOMER_DATA_SCOPE } from 'src/mkt-core/customer/constants';
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';

/**
 * MktCustomerExportResolver - GraphQL resolver for customer export operations
 *
 * Replaces:
 * - GET /api/mkt/customer/export-csv
 * - GET /api/mkt/customer/export-statistics
 */
@Resolver()
export class MktCustomerExportResolver {
  private readonly logger = new Logger(MktCustomerExportResolver.name);

  constructor(
    private readonly customerExportService: MktCustomerExportService,
  ) {}

  /**
   * Export customers to CSV format
   * Replaces GET /api/mkt/customer/export-csv
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(CUSTOMER_DATA_SCOPE.QUERY_EXPORT)
  @Query(() => CustomerExportOutput, {
    name: 'mktCustomerExportCsv',
    description: 'Export customers to CSV format',
  })
  async exportCustomersCsv(
    @AuthWorkspace() workspace: Workspace,
    @Args('input', { nullable: true }) input?: CustomerExportInput,
  ): Promise<CustomerExportOutput> {
    this.logger.log(CUSTOMER_MESSAGES.LOG.EXPORT_START(workspace.id));

    const filters = this.buildFilters(input);

    const exportData = await this.customerExportService.exportCustomersToCsv(
      workspace.id,
      filters,
    );

    this.logger.log(
      CUSTOMER_MESSAGES.LOG.EXPORT_COMPLETE(exportData.totalRecords),
    );

    return {
      success: true,
      data: exportData.data,
      fileName: exportData.fileName,
      totalRecords: exportData.totalRecords,
      generatedAt: exportData.generatedAt,
    };
  }

  /**
   * Get export statistics
   * Replaces GET /api/mkt/customer/export-statistics
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(CUSTOMER_DATA_SCOPE.QUERY_AGGREGATION)
  @Query(() => CustomerExportStatisticsOutput, {
    name: 'mktCustomerExportStatistics',
    description: 'Get customer export statistics without exporting',
  })
  async getExportStatistics(
    @AuthWorkspace() workspace: Workspace,
    @Args('input', { nullable: true }) input?: CustomerExportStatisticsInput,
  ): Promise<CustomerExportStatisticsOutput> {
    const filters = this.buildFilters(input);

    const statistics = await this.customerExportService.getExportStatistics(
      workspace.id,
      filters,
    );

    return {
      success: true,
      totalRecords: statistics.totalRecords,
      byStatus: statistics.byStatus,
      byTier: statistics.byTier,
      byType: statistics.byType,
      generatedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    };
  }

  private buildFilters(
    input?: CustomerExportInput | CustomerExportStatisticsInput,
  ): CustomerExportFilter {
    if (!input) {
      return {};
    }

    const filters: CustomerExportFilter = {};

    if (input.status) {
      filters.status = input.status;
    }

    if (input.tier) {
      filters.tier = input.tier;
    }

    if (input.type) {
      filters.type = input.type;
    }

    if ('fromDate' in input && input.fromDate) {
      filters.fromDate = new Date(input.fromDate);
    }

    if ('toDate' in input && input.toDate) {
      filters.toDate = new Date(input.toDate);
    }

    return filters;
  }
}
