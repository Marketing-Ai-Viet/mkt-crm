import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { MktLicenseCsvExportService } from 'src/mkt-core/license/integration/mkt-license-csv-export.service';

@Resolver()
export class MktLicenseExportResolver {
  constructor(private readonly csvExportService: MktLicenseCsvExportService) {}

  @UseGuards(UserAuthGuard)
  @Query(() => String)
  async getLicenseDashboardReport(
    @Args('reportType', {
      type: () => String,
      defaultValue: 'license-dashboard',
    })
    reportType: string,
  ): Promise<string> {
    const exportData =
      await this.csvExportService.exportLicenseDashboardCsv(reportType);

    if (!exportData) {
      throw new Error('No report data found for the specified report type');
    }

    return this.csvExportService.generateDashboardReport(exportData.metadata);
  }

  @UseGuards(UserAuthGuard)
  @Query(() => String, {
    description: 'Get license dashboard statistics as JSON string',
  })
  async getLicenseDashboardStatistics(
    @Args('reportType', {
      type: () => String,
      defaultValue: 'license-dashboard',
    })
    reportType: string,
  ): Promise<string> {
    const exportData =
      await this.csvExportService.exportLicenseDashboardCsv(reportType);

    if (!exportData) {
      throw new Error('No report data found for the specified report type');
    }

    return JSON.stringify(exportData.metadata, null, 2);
  }

  @UseGuards(UserAuthGuard)
  @Query(() => String, {
    description: 'Get CSV export data for license dashboard',
  })
  async getLicenseDashboardCsv(
    @Args('reportType', {
      type: () => String,
      defaultValue: 'license-dashboard',
    })
    reportType: string,
  ): Promise<string> {
    const exportData =
      await this.csvExportService.exportLicenseDashboardCsv(reportType);

    if (!exportData) {
      throw new Error('No report data found for the specified report type');
    }

    return exportData.data;
  }
}
