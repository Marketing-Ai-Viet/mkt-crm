import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceCacheStorageService } from 'src/engine/workspace-cache-storage/workspace-cache-storage.service';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { MktReportWorkspaceEntity } from 'src/mkt-core/report/objects/mkt-report.workspace-entity';
import { DateRangeUtils } from 'src/mkt-core/utils';
import {
  DashboardDataTransformer,
  LicenseStats,
} from 'src/mkt-core/utils/dashboard-data-transformer.utils';

@Injectable()
export class MktLicenseDashboardStatsService {
  private readonly logger = new Logger(MktLicenseDashboardStatsService.name);

  constructor(
    @InjectRepository(Workspace, 'core')
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly objectMetadataService: ObjectMetadataService,
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly workspaceCacheStorageService: WorkspaceCacheStorageService,
  ) {}

  async generateStatsForWorkspace(workspaceId: string): Promise<void> {
    try {
      this.logger.log(
        `🚀 Generating license dashboard statistics for workspace: ${workspaceId}`,
      );

      const workspace = await this.workspaceRepository.findOne({
        where: { id: workspaceId },
      });

      if (!workspace) {
        this.logger.error(`Workspace ${workspaceId} not found`);

        return;
      }

      const stats = await this.getLicenseStatsForWorkspace(workspaceId);

      if (!stats) {
        this.logger.warn(
          `⚠️ Could not generate statistics for workspace ${workspaceId} - license table may not exist`,
        );

        return;
      }

      // Save results to mktReport
      await this.saveLicenseStatsToReport(workspaceId, stats);

      this.logger.log(
        `✅ License dashboard statistics generated and saved to report for workspace: ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to generate license statistics for workspace ${workspaceId}:`,
        error,
      );
      throw error;
    }
  }

  private async getLicenseStatsForWorkspace(
    workspaceId: string,
  ): Promise<LicenseStats | null> {
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        this.logger.debug(
          `🔌 Attempt ${retryCount + 1}: Connecting to main data source for workspace ${workspaceId}`,
        );
        const mainDataSource =
          await this.workspaceDataSourceService.connectToMainDataSource();

        if (!mainDataSource) {
          throw new Error('Could not connect to main data source');
        }

        this.logger.debug(
          `✅ Connected to data source, isInitialized: ${mainDataSource.isInitialized}`,
        );

        // Add connection validation
        if (!mainDataSource.isInitialized) {
          throw new Error('Data source is not initialized');
        }

        this.logger.debug(
          `📋 Fetching object metadata for workspace ${workspaceId}`,
        );
        const objectMetadataItems =
          await this.objectMetadataService.findManyWithinWorkspace(workspaceId);

        // Find license object metadata
        const licenseObjectMetadata = objectMetadataItems.find(
          (item) => item.nameSingular === 'mktLicense',
        );

        if (!licenseObjectMetadata) {
          this.logger.log(
            `License object not found in workspace ${workspaceId}, skipping...`,
          );

          return null;
        }

        const schemaName = getWorkspaceSchemaName(workspaceId);

        this.logger.debug(`📊 Using schema: ${schemaName}`);

        // Get date ranges for comparison
        const currentMonth = DateRangeUtils.getCurrentMonth();
        const lastMonth = DateRangeUtils.getLastMonth();

        // Get total licenses count (all time)
        const totalLicensesAllTime = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense"`,
        );

        // Get current month license count
        const currentMonthLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "createdAt" >= $1`,
          [DateRangeUtils.toISOString(currentMonth.start)],
        );

        // Get last month license count
        const lastMonthLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "createdAt" >= $1 AND "createdAt" <= $2`,
          [
            DateRangeUtils.toISOString(lastMonth.start),
            DateRangeUtils.toISOString(lastMonth.end),
          ],
        );

        // Get total active licenses
        const activeLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1`,
          ['ACTIVE'],
        );

        // Get today and yesterday date ranges for active license comparison
        const today = DateRangeUtils.getToday();
        const yesterday = DateRangeUtils.getYesterday();

        // Get active licenses with login today
        const todayActiveLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "lastLoginAt" >= $2`,
          ['ACTIVE', DateRangeUtils.toISOString(today.start)],
        );

        // Get active licenses with login yesterday
        const yesterdayActiveLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "lastLoginAt" >= $2 AND "lastLoginAt" <= $3`,
          [
            'ACTIVE',
            DateRangeUtils.toISOString(yesterday.start),
            DateRangeUtils.toISOString(yesterday.end),
          ],
        );

        const trialLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1`,
          ['TRIAL'],
        );

        // Get current month trial license count
        const currentMonthTrialLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "createdAt" >= $2`,
          ['TRIAL', DateRangeUtils.toISOString(currentMonth.start)],
        );

        // Get last month trial license count
        const lastMonthTrialLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "createdAt" >= $2 AND "createdAt" <= $3`,
          [
            'TRIAL',
            DateRangeUtils.toISOString(lastMonth.start),
            DateRangeUtils.toISOString(lastMonth.end),
          ],
        );

        // Get total expired licenses count
        const totalExpiredLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1`,
          ['EXPIRED'],
        );

        // Get expired licenses stats - current month count (licenses that expired this month)
        const currentExpiredLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "expiresAt" IS NOT NULL AND "expiresAt" >= $2 AND "expiresAt" < $3`,
          [
            'EXPIRED',
            DateRangeUtils.toISOString(currentMonth.start),
            DateRangeUtils.toISOString(
              new Date(
                currentMonth.start.getFullYear(),
                currentMonth.start.getMonth() + 1,
                1,
              ),
            ),
          ],
        );

        // Get expired licenses stats - last month count (licenses that expired last month)
        const lastMonthExpiredLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "expiresAt" IS NOT NULL AND "expiresAt" >= $2 AND "expiresAt" < $3`,
          [
            'EXPIRED',
            DateRangeUtils.toISOString(lastMonth.start),
            DateRangeUtils.toISOString(currentMonth.start),
          ],
        );

        // Get refunded amount for current month (via variant → orderItem → unitPrice)
        const currentRefundedAmount = await mainDataSource.query(
          `SELECT COALESCE(SUM(oi."unitPrice"), 0) as total_amount 
           FROM "${schemaName}"."mktLicense" l 
           JOIN "${schemaName}"."mktVariant" v ON l."mktVariantId" = v."id"
           JOIN "${schemaName}"."mktOrderItem" oi ON v."id" = oi."mktVariantId"
           WHERE l."status" = $1 AND l."updatedAt" >= $2`,
          ['REFUND', DateRangeUtils.toISOString(currentMonth.start)],
        );

        // Get refunded amount for last month (via variant → orderItem → unitPrice)
        const lastMonthRefundedAmount = await mainDataSource.query(
          `SELECT COALESCE(SUM(oi."unitPrice"), 0) as total_amount 
           FROM "${schemaName}"."mktLicense" l 
           JOIN "${schemaName}"."mktVariant" v ON l."mktVariantId" = v."id"
           JOIN "${schemaName}"."mktOrderItem" oi ON v."id" = oi."mktVariantId"
           WHERE l."status" = $1 AND l."updatedAt" >= $2 AND l."updatedAt" <= $3`,
          [
            'REFUND',
            DateRangeUtils.toISOString(lastMonth.start),
            DateRangeUtils.toISOString(lastMonth.end),
          ],
        );

        // Get current month refunded licenses count
        const currentRefundedLicensesCount = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "updatedAt" >= $2`,
          ['REFUND', DateRangeUtils.toISOString(currentMonth.start)],
        );

        // Get last month refunded licenses count
        const lastMonthRefundedLicensesCount = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "updatedAt" >= $2 AND "updatedAt" <= $3`,
          [
            'REFUND',
            DateRangeUtils.toISOString(lastMonth.start),
            DateRangeUtils.toISOString(lastMonth.end),
          ],
        );

        // Get licenses expiring in the next 30 days
        const thirtyDaysFromNow = new Date();

        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "expiresAt" IS NOT NULL AND "expiresAt" <= $2 AND "expiresAt" > $3`,
          ['ACTIVE', thirtyDaysFromNow.toISOString(), new Date().toISOString()],
        );

        // Get usage statistics
        const todayUsage = DateRangeUtils.getToday();
        const lastWeek = DateRangeUtils.getLastNDays(7);
        const lastMonthUsage = DateRangeUtils.getLastNDays(30);

        const activeTodayUsage = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "lastLoginAt" >= $2`,
          ['ACTIVE', DateRangeUtils.toISOString(todayUsage.start)],
        );

        const activeThisWeek = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "lastLoginAt" >= $2`,
          ['ACTIVE', DateRangeUtils.toISOString(lastWeek.start)],
        );

        const activeThisMonth = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "lastLoginAt" >= $2`,
          ['ACTIVE', DateRangeUtils.toISOString(lastMonthUsage.start)],
        );

        // Parse raw counts from database results
        const totalCount = parseInt(totalLicensesAllTime?.[0]?.count || '0');
        const currentMonthCount = parseInt(
          currentMonthLicenses?.[0]?.count || '0',
        );
        const lastMonthCountVal = parseInt(
          lastMonthLicenses?.[0]?.count || '0',
        );
        const activeLicensesCount = parseInt(activeLicenses?.[0]?.count || '0');
        const todayCount = parseInt(todayActiveLicenses?.[0]?.count || '0');
        const yesterdayCount = parseInt(
          yesterdayActiveLicenses?.[0]?.count || '0',
        );
        const totalExpiredCount = parseInt(
          totalExpiredLicenses?.[0]?.count || '0',
        );
        const currentExpiredCount = parseInt(
          currentExpiredLicenses?.[0]?.count || '0',
        );
        const lastMonthExpiredCount = parseInt(
          lastMonthExpiredLicenses?.[0]?.count || '0',
        );
        const expiringLicensesCount = parseInt(
          expiringLicenses?.[0]?.count || '0',
        );
        const currentRefundedAmountValue = parseFloat(
          currentRefundedAmount?.[0]?.total_amount || '0',
        );
        const lastMonthRefundedAmountValue = parseFloat(
          lastMonthRefundedAmount?.[0]?.total_amount || '0',
        );
        const currentRefundedCountValue = parseInt(
          currentRefundedLicensesCount?.[0]?.count || '0',
        );
        const lastMonthRefundedCountValue = parseInt(
          lastMonthRefundedLicensesCount?.[0]?.count || '0',
        );

        const usageActiveTodayCount = parseInt(
          activeTodayUsage?.[0]?.count || '0',
        );
        const usageActiveThisWeekCount = parseInt(
          activeThisWeek?.[0]?.count || '0',
        );
        const usageActiveThisMonthCount = parseInt(
          activeThisMonth?.[0]?.count || '0',
        );

        // Parse trial licenses counts
        const trialLicensesCount = parseInt(trialLicenses?.[0]?.count || '0');
        const currentMonthTrialCount = parseInt(
          currentMonthTrialLicenses?.[0]?.count || '0',
        );
        const lastMonthTrialCount = parseInt(
          lastMonthTrialLicenses?.[0]?.count || '0',
        );

        // Use DashboardDataTransformer for calculations
        const totalLicenseStats =
          DashboardDataTransformer.transformLicenseCountStats(
            totalCount,
            currentMonthCount,
            lastMonthCountVal,
          );

        const activeLicenseStats =
          DashboardDataTransformer.transformLicenseActivityStats(
            activeLicensesCount,
            todayCount,
            yesterdayCount,
          );

        const expiredLicenseStats =
          DashboardDataTransformer.transformExpiredLicenseStats(
            totalExpiredCount,
            currentExpiredCount,
            lastMonthExpiredCount,
          );

        const refundStats =
          DashboardDataTransformer.transformRefundStatsWithAmounts(
            currentRefundedAmountValue,
            lastMonthRefundedAmountValue,
            currentRefundedCountValue,
            lastMonthRefundedCountValue,
          );

        const expiringStats = DashboardDataTransformer.transformExpiringData(
          expiringLicensesCount,
          30,
        );

        const usageStats = DashboardDataTransformer.transformUsageStats(
          usageActiveTodayCount,
          usageActiveThisWeekCount,
          usageActiveThisMonthCount,
        );

        // Calculate trial licenses statistics
        const trialLicenseStats =
          DashboardDataTransformer.transformLicenseCountStats(
            trialLicensesCount,
            currentMonthTrialCount,
            lastMonthTrialCount,
          );

        return {
          totalLicenses: totalLicenseStats,
          activeLicenses: activeLicenseStats,
          trialLicenses: trialLicenseStats,
          expiredLicenses: expiredLicenseStats,
          refundedAmount: refundStats,
          expiringInDays: expiringStats,
          usageStatistics: usageStats,
        };
      } catch (error) {
        retryCount++;
        this.logger.error(
          `❌ Attempt ${retryCount} failed for workspace ${workspaceId}:`,
          {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
            code: error?.code,
          },
        );

        if (retryCount > maxRetries) {
          this.logger.error(
            `❌ All ${maxRetries + 1} attempts failed for workspace ${workspaceId}`,
          );

          return null;
        }

        // Wait a bit before retrying
        this.logger.warn(
          `⏰ Waiting ${retryCount * 1000}ms before retry ${retryCount + 1}/${maxRetries + 1}`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryCount * 1000));
      }
    }

    return null;
  }

  private async saveLicenseStatsToReport(
    workspaceId: string,
    stats: LicenseStats,
  ): Promise<void> {
    try {
      this.logger.debug(
        `📊 Starting to save license statistics to report for workspace: ${workspaceId}`,
      );

      // Get the repository for mktReport in the workspace
      const mktReportRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          workspaceId,
          MktReportWorkspaceEntity,
          {
            shouldBypassPermissionChecks: true,
          },
        );

      this.logger.debug(`✅ Repository obtained for workspace: ${workspaceId}`);

      // Use DashboardDataTransformer to create report data
      const reportData = DashboardDataTransformer.createLicenseReportData(
        workspaceId,
        stats as LicenseStats,
        '1.0',
      );

      this.logger.debug(`💾 Saving report data for workspace: ${workspaceId}`);
      const savedReport = await mktReportRepository.save(reportData);

      await this.workspaceCacheStorageService.flush(workspaceId, undefined);

      this.logger.debug(
        `✅ Report saved with ID: ${savedReport?.id || 'unknown'}`,
      );

      this.logger.log(
        `📊 License statistics saved to mktReport for workspace: ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to save license statistics to report for workspace ${workspaceId}:`,
        {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        },
      );

      // Don't throw the error, just log it so the main process continues
      if (error?.message?.includes('client is closed')) {
        this.logger.error(
          '🔌 Client closed error detected in saveLicenseStatsToReport',
        );
      }
    }
  }
}
