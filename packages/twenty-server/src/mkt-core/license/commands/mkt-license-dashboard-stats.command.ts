import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Command, CommandRunner, Option } from 'nest-commander';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
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

interface DashboardOptions {
  workspaceId?: string;
  format?: 'json' | 'table';
  detailed?: boolean;
}

interface _LicenseReportMetadata {
  generatedAt: string;
  workspaceId: string;
  statistics: LicenseStats;
}

@Command({
  name: 'workspace:license:dashboard:stats',
  description:
    'Generate comprehensive license dashboard statistics and analytics',
})
export class MktLicenseDashboardStatsCommand extends CommandRunner {
  private readonly logger = new Logger(MktLicenseDashboardStatsCommand.name);

  constructor(
    @InjectRepository(Workspace, 'core')
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly objectMetadataService: ObjectMetadataService,
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
    private readonly workspaceCacheStorageService: WorkspaceCacheStorageService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {
    super();
  }

  @Option({
    flags: '-w, --workspace-id [workspace_id]',
    description: 'Workspace ID to generate statistics for',
  })
  parseWorkspaceId(value: string): string {
    return value;
  }

  @Option({
    flags: '-f, --format [format]',
    description: 'Output format: json or table (default: table)',
    defaultValue: 'table',
  })
  parseFormat(value: string): 'json' | 'table' {
    return value === 'json' ? 'json' : 'table';
  }

  @Option({
    flags: '-d, --detailed',
    description:
      'Show detailed information including lists of expiring licenses',
  })
  parseDetailed(): boolean {
    return true;
  }

  async run(passedParam: string[], options: DashboardOptions): Promise<void> {
    let workspaces: Workspace[] = [];

    try {
      if (options.workspaceId) {
        const workspace = await this.workspaceRepository.findOne({
          where: { id: options.workspaceId },
        });

        if (workspace) {
          workspaces = [workspace];
        } else {
          this.logger.error(`Workspace ${options.workspaceId} not found`);

          return;
        }
      } else {
        // Generate stats for all active workspaces
        workspaces = await this.workspaceRepository.find({
          where: {
            activationStatus: WorkspaceActivationStatus.ACTIVE,
          },
        });
      }

      for (const workspace of workspaces) {
        try {
          this.logger.log(
            `🚀 Generating license dashboard statistics for workspace: ${workspace.displayName || workspace.id}`,
          );

          const stats = await this.getLicenseStatsForWorkspace(workspace.id);

          if (!stats) {
            this.logger.warn(
              `⚠️ Could not generate statistics for workspace ${workspace.id} - license table may not exist`,
            );
            continue;
          }

          // Save results to mktReport
          await this.saveLicenseStatsToReport(workspace.id, stats);

          // Output the results
          if (options.format === 'json') {
            await this.outputJSON(workspace, stats);
          } else {
            await this.outputTable(workspace, stats, options);
          }

          this.logger.log(
            `✅ License dashboard statistics generated and saved to report for workspace: ${workspace.id}`,
          );
        } catch (error) {
          this.logger.error(
            `❌ Failed to generate license statistics for workspace ${workspace.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        '❌ Fatal error in license dashboard stats command:',
        error,
      );
    } finally {
      // Add a small delay to allow any pending async operations to complete
      this.logger.debug('🔄 Waiting for async operations to complete...');
      await new Promise((resolve) => setTimeout(resolve, 200));
      this.logger.debug('✅ License dashboard stats command completed');

      // Force cleanup of any remaining connections
      try {
        // Give a bit more time for cleanup
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (cleanupError) {
        this.logger.warn('⚠️ Minor cleanup error:', cleanupError?.message);
      }
    }
  }

  private async validateConnection(dataSource: {
    isInitialized: boolean;
    query: (sql: string) => Promise<unknown>;
  }): Promise<boolean> {
    try {
      if (!dataSource || !dataSource.isInitialized) {
        this.logger.warn('⚠️ Data source is not initialized');

        return false;
      }

      // Try a simple query to test connection
      await dataSource.query('SELECT 1');

      return true;
    } catch (error) {
      this.logger.warn(`⚠️ Connection validation failed: ${error?.message}`);

      return false;
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

        // Debug date ranges
        this.logger.debug(`📅 Date ranges for expired license calculations:`);
        this.logger.debug(
          `   Current month: ${DateRangeUtils.toISOString(currentMonth.start)} to ${DateRangeUtils.toISOString(new Date(currentMonth.start.getFullYear(), currentMonth.start.getMonth() + 1, 1))}`,
        );
        this.logger.debug(
          `   Last month: ${DateRangeUtils.toISOString(lastMonth.start)} to ${DateRangeUtils.toISOString(currentMonth.start)}`,
        );

        // Get total licenses count (all time)
        this.logger.debug(`🔍 Query 1: Getting total licenses count`);
        if (!(await this.validateConnection(mainDataSource))) {
          throw new Error('Connection lost before Query 1');
        }
        const totalLicensesAllTime = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense"`,
        );

        this.logger.debug(
          `✅ Query 1 completed: ${totalLicensesAllTime?.[0]?.count || '0'} total licenses`,
        );

        // Get current month license count
        this.logger.debug(`🔍 Query 2: Getting current month license count`);
        const currentMonthLicensesQuery = `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "createdAt" >= $1`;
        const currentMonthLicenses = await mainDataSource.query(
          currentMonthLicensesQuery,
          [DateRangeUtils.toISOString(currentMonth.start)],
        );

        this.logger.log(
          `✅ Query 2 completed: ${currentMonthLicensesQuery} current month licenses`,
          DateRangeUtils.toISOString(currentMonth.start),
        );

        // Get last month license count
        this.logger.debug(`🔍 Query 3: Getting last month license count`);
        const lastMonthLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "createdAt" >= $1 AND "createdAt" <= $2`,
          [
            DateRangeUtils.toISOString(lastMonth.start),
            DateRangeUtils.toISOString(lastMonth.end),
          ],
        );

        this.logger.debug(
          `✅ Query 3 completed: ${lastMonthLicenses?.[0]?.count || '0'} last month licenses`,
        );

        // Get total active licenses
        this.logger.debug(`🔍 Query 4: Getting active licenses count`);
        const activeLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1`,
          ['ACTIVE'],
        );

        this.logger.debug(
          `✅ Query 4 completed: ${activeLicenses?.[0]?.count || '0'} active licenses`,
        );

        // Get today and yesterday date ranges for active license comparison
        const today = DateRangeUtils.getToday();
        const yesterday = DateRangeUtils.getYesterday();

        // Get active licenses with login today
        this.logger.debug(`🔍 Query 5: Getting today's active licenses`);
        const todayActiveLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "lastLoginAt" >= $2`,
          ['ACTIVE', DateRangeUtils.toISOString(today.start)],
        );

        this.logger.debug(
          `✅ Query 5 completed: ${todayActiveLicenses?.[0]?.count || '0'} today's active licenses`,
        );

        // Get active licenses with login yesterday
        this.logger.debug(`🔍 Query 6: Getting yesterday's active licenses`);
        const yesterdayActiveLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "lastLoginAt" >= $2 AND "lastLoginAt" <= $3`,
          [
            'ACTIVE',
            DateRangeUtils.toISOString(yesterday.start),
            DateRangeUtils.toISOString(yesterday.end),
          ],
        );

        this.logger.debug(
          `✅ Query 6 completed: ${yesterdayActiveLicenses?.[0]?.count || '0'} yesterday's active licenses`,
        );

        this.logger.debug(`🔍 Query 7: Getting trial licenses count`);
        const trialLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1`,
          ['TRIAL'],
        );

        this.logger.debug(
          `✅ Query 7 completed: ${trialLicenses?.[0]?.count || '0'} trial licenses`,
        );

        // Get current month trial license count
        this.logger.debug(
          `🔍 Query 7a: Getting current month trial license count`,
        );
        const currentMonthTrialLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "createdAt" >= $2`,
          ['TRIAL', DateRangeUtils.toISOString(currentMonth.start)],
        );

        this.logger.debug(
          `✅ Query 7a completed: ${currentMonthTrialLicenses?.[0]?.count || '0'} current month trial licenses`,
        );

        // Get last month trial license count
        this.logger.debug(
          `🔍 Query 7b: Getting last month trial license count`,
        );
        const lastMonthTrialLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "createdAt" >= $2 AND "createdAt" <= $3`,
          [
            'TRIAL',
            DateRangeUtils.toISOString(lastMonth.start),
            DateRangeUtils.toISOString(lastMonth.end),
          ],
        );

        this.logger.debug(
          `✅ Query 7b completed: ${lastMonthTrialLicenses?.[0]?.count || '0'} last month trial licenses`,
        );

        // Get total expired licenses count
        this.logger.debug(`🔍 Query 8: Getting total expired licenses count`);
        const totalExpiredLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1`,
          ['EXPIRED'],
        );

        this.logger.debug(
          `✅ Query 8 completed: ${totalExpiredLicenses?.[0]?.count || '0'} total expired licenses`,
        );

        // Get expired licenses stats - current month count (licenses that expired this month)
        this.logger.debug(
          `🔍 Query 8a: Getting current month expired licenses (by expiresAt)`,
        );
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

        this.logger.debug(
          `✅ Query 8a completed: ${currentExpiredLicenses?.[0]?.count || '0'} current month expired licenses`,
        );

        // Get expired licenses stats - last month count (licenses that expired last month)
        this.logger.debug(
          `🔍 Query 8b: Getting last month expired licenses (by expiresAt)`,
        );
        const lastMonthExpiredLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "expiresAt" IS NOT NULL AND "expiresAt" >= $2 AND "expiresAt" < $3`,
          [
            'EXPIRED',
            DateRangeUtils.toISOString(lastMonth.start),
            DateRangeUtils.toISOString(currentMonth.start), // End of last month = start of current month
          ],
        );

        this.logger.debug(
          `✅ Query 8b completed: ${lastMonthExpiredLicenses?.[0]?.count || '0'} last month expired licenses`,
        );

        // Debug query: Get detailed expired licenses info to understand the data
        this.logger.debug(`🔍 Debug: Getting expired licenses details`);
        const expiredLicensesDebug = await mainDataSource.query(
          `SELECT "licenseKey", "status", "expiresAt", "createdAt", "updatedAt" FROM "${schemaName}"."mktLicense" WHERE "status" = $1 ORDER BY "expiresAt" DESC LIMIT 10`,
          ['EXPIRED'],
        );

        this.logger.debug(
          `✅ Debug: Found ${expiredLicensesDebug?.length || '0'} expired licenses:`,
          expiredLicensesDebug?.map(
            (l: {
              licenseKey: string;
              expiresAt: string;
              createdAt: string;
              updatedAt: string;
            }) => ({
              key: l.licenseKey,
              expires: l.expiresAt,
              created: l.createdAt,
              updated: l.updatedAt,
            }),
          ),
        );

        this.logger.debug(`🔍 Debug Query: Getting expired licenses details`);
        const expiredLicensesDetails = await mainDataSource.query(
          `SELECT "id", "name", "status", "createdAt", "updatedAt" FROM "${schemaName}"."mktLicense" WHERE "status" = $1 ORDER BY "updatedAt" DESC LIMIT 10`,
          ['EXPIRED'],
        );

        this.logger.debug(
          `🔍 Expired Licenses Details (last 10):`,
          JSON.stringify(expiredLicensesDetails, null, 2),
        );

        // Get refunded amount for current month (via variant → orderItem → unitPrice)
        this.logger.debug(
          `🔍 Query 9: Getting current month refunded amount via variant`,
        );
        const currentRefundedAmount = await mainDataSource.query(
          `SELECT COALESCE(SUM(oi."unitPrice"), 0) as total_amount 
           FROM "${schemaName}"."mktLicense" l 
           JOIN "${schemaName}"."mktVariant" v ON l."mktVariantId" = v."id"
           JOIN "${schemaName}"."mktOrderItem" oi ON v."id" = oi."mktVariantId"
           WHERE l."status" = $1 AND l."updatedAt" >= $2`,
          ['REFUND', DateRangeUtils.toISOString(currentMonth.start)],
        );

        this.logger.debug(
          `✅ Query 9 completed: $${currentRefundedAmount?.[0]?.total_amount || '0'} current refunded amount via variant`,
        );

        // Get refunded amount for last month (via variant → orderItem → unitPrice)
        this.logger.debug(
          `🔍 Query 10: Getting last month refunded amount via variant`,
        );
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

        this.logger.debug(
          `✅ Query 10 completed: $${lastMonthRefundedAmount?.[0]?.total_amount || '0'} last month refunded amount via variant`,
        );

        // Get current month refunded licenses count
        this.logger.debug(
          `🔍 Query 10a: Getting current month refunded licenses count`,
        );
        const currentRefundedLicensesCount = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "updatedAt" >= $2`,
          ['REFUND', DateRangeUtils.toISOString(currentMonth.start)],
        );

        this.logger.debug(
          `✅ Query 10a completed: ${currentRefundedLicensesCount?.[0]?.count || '0'} current refunded licenses count`,
        );

        // Get last month refunded licenses count
        this.logger.debug(
          `🔍 Query 10b: Getting last month refunded licenses count`,
        );
        const lastMonthRefundedLicensesCount = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "updatedAt" >= $2 AND "updatedAt" <= $3`,
          [
            'REFUND',
            DateRangeUtils.toISOString(lastMonth.start),
            DateRangeUtils.toISOString(lastMonth.end),
          ],
        );

        this.logger.debug(
          `✅ Query 10b completed: ${lastMonthRefundedLicensesCount?.[0]?.count || '0'} last month refunded licenses count`,
        );

        // Get licenses expiring in the next 30 days
        this.logger.debug(`🔍 Query 11: Getting expiring licenses count`);
        const thirtyDaysFromNow = new Date();

        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringLicenses = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "expiresAt" IS NOT NULL AND "expiresAt" <= $2 AND "expiresAt" > $3`,
          ['ACTIVE', thirtyDaysFromNow.toISOString(), new Date().toISOString()],
        );

        this.logger.debug(
          `✅ Query 11 completed: ${expiringLicenses?.[0]?.count || '0'} expiring licenses`,
        );

        // Get usage statistics
        const todayUsage = DateRangeUtils.getToday();
        const lastWeek = DateRangeUtils.getLastNDays(7);
        const lastMonthUsage = DateRangeUtils.getLastNDays(30);

        this.logger.debug(`🔍 Query 12: Getting usage statistics - today`);
        const activeTodayUsage = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "lastLoginAt" >= $2`,
          ['ACTIVE', DateRangeUtils.toISOString(todayUsage.start)],
        );

        this.logger.debug(`🔍 Query 13: Getting usage statistics - this week`);
        const activeThisWeek = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "lastLoginAt" >= $2`,
          ['ACTIVE', DateRangeUtils.toISOString(lastWeek.start)],
        );

        this.logger.debug(`🔍 Query 14: Getting usage statistics - this month`);
        const activeThisMonth = await mainDataSource.query(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = $1 AND "lastLoginAt" >= $2`,
          ['ACTIVE', DateRangeUtils.toISOString(lastMonthUsage.start)],
        );

        this.logger.debug(
          `✅ Usage statistics completed: today=${activeTodayUsage?.[0]?.count || '0'}, week=${activeThisWeek?.[0]?.count || '0'}, month=${activeThisMonth?.[0]?.count || '0'}`,
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

        // Debug refund amounts
        this.logger.debug(
          `📊 Debug refund amounts: Current=$${currentRefundedAmountValue}, Last=$${lastMonthRefundedAmountValue}`,
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

        // Debug expired licenses calculation
        this.logger.debug(
          `🔍 Expired Licenses Debug: Total=${totalExpiredCount}, CurrentMonth=${currentExpiredCount}, LastMonth=${lastMonthExpiredCount}`,
        );
        this.logger.debug(
          `🔍 Date Ranges: CurrentMonth=${DateRangeUtils.toISOString(currentMonth.start)}, LastMonth=${DateRangeUtils.toISOString(lastMonth.start)} to ${DateRangeUtils.toISOString(lastMonth.end)}`,
        );

        const expiredLicenseStats =
          DashboardDataTransformer.transformExpiredLicenseStats(
            totalExpiredCount,
            currentExpiredCount,
            lastMonthExpiredCount,
          );

        this.logger.debug(
          `🔍 Expired License Stats Result: currentCount=${expiredLicenseStats.currentCount}, currentMonthCount=${expiredLicenseStats.currentMonthCount}, lastMonthCount=${expiredLicenseStats.lastMonthCount}, percentageChange=${expiredLicenseStats.percentageChange}`,
        );

        const refundStats =
          DashboardDataTransformer.transformRefundStatsWithAmounts(
            currentRefundedAmountValue,
            lastMonthRefundedAmountValue,
            currentRefundedCountValue,
            lastMonthRefundedCountValue,
          );

        this.logger.debug(
          `🔍 Refund Stats Debug: Raw values - currentAmount=${currentRefundedAmountValue}, lastMonthAmount=${lastMonthRefundedAmountValue}, currentCount=${currentRefundedCountValue}, lastMonthCount=${lastMonthRefundedCountValue}`,
        );
        this.logger.debug(
          `🔍 Refund Stats Result: currentAmount=${refundStats.currentAmount}, lastMonthAmount=${refundStats.lastMonthAmount}, currentCount=${refundStats.currentCount}, lastMonthCount=${refundStats.lastMonthCount}, percentageChange=${refundStats.percentageChange}`,
        );

        // Debug SQL queries for manual testing
        this.logger.debug(`\n=== DEBUG SQL QUERIES FOR MANUAL TESTING ===`);
        this.logger.debug(`Schema: "${schemaName}"`);
        this.logger.debug(
          `Current Month Start: ${DateRangeUtils.toISOString(currentMonth.start)}`,
        );
        this.logger.debug(
          `Last Month Start: ${DateRangeUtils.toISOString(lastMonth.start)}`,
        );
        this.logger.debug(
          `Last Month End: ${DateRangeUtils.toISOString(lastMonth.end)}`,
        );
        this.logger.debug(
          `\n-- Query 1: Current Month Refunded Amount (via variant → orderItem → unitPrice) --`,
        );
        this.logger
          .debug(`SELECT COALESCE(SUM(oi."unitPrice"), 0) as total_amount 
FROM "${schemaName}"."mktLicense" l 
JOIN "${schemaName}"."mktVariant" v ON l."mktVariantId" = v."id"
JOIN "${schemaName}"."mktOrderItem" oi ON v."id" = oi."mktVariantId"
WHERE l."status" = 'REFUND' AND l."updatedAt" >= '${DateRangeUtils.toISOString(currentMonth.start)}';`);
        this.logger.debug(
          `\n-- Query 2: Last Month Refunded Amount (via variant → orderItem → unitPrice) --`,
        );
        this.logger
          .debug(`SELECT COALESCE(SUM(oi."unitPrice"), 0) as total_amount 
FROM "${schemaName}"."mktLicense" l 
JOIN "${schemaName}"."mktVariant" v ON l."mktVariantId" = v."id"
JOIN "${schemaName}"."mktOrderItem" oi ON v."id" = oi."mktVariantId"
WHERE l."status" = 'REFUND' AND l."updatedAt" >= '${DateRangeUtils.toISOString(lastMonth.start)}' AND l."updatedAt" <= '${DateRangeUtils.toISOString(lastMonth.end)}';`);
        this.logger.debug(`\n-- Query 3: Current Month Refunded Count --`);
        this.logger.debug(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = 'REFUND' AND "updatedAt" >= '${DateRangeUtils.toISOString(currentMonth.start)}';`,
        );
        this.logger.debug(`\n-- Query 4: Last Month Refunded Count --`);
        this.logger.debug(
          `SELECT COUNT(*) as count FROM "${schemaName}"."mktLicense" WHERE "status" = 'REFUND' AND "updatedAt" >= '${DateRangeUtils.toISOString(lastMonth.start)}' AND "updatedAt" <= '${DateRangeUtils.toISOString(lastMonth.end)}';`,
        );
        this.logger.debug(
          `\n-- Query 5: Debug - All REFUND licenses with details --`,
        );
        this.logger
          .debug(`SELECT l."id", l."name", l."licenseKey", l."status", l."updatedAt", l."mktVariantId", v."name" as variant_name, oi."unitPrice" 
FROM "${schemaName}"."mktLicense" l 
LEFT JOIN "${schemaName}"."mktVariant" v ON l."mktVariantId" = v."id"
LEFT JOIN "${schemaName}"."mktOrderItem" oi ON v."id" = oi."mktVariantId"
WHERE l."status" = 'REFUND' 
ORDER BY l."updatedAt" DESC 
LIMIT 10;`);
        this.logger.debug(`=== END DEBUG SQL QUERIES ===\n`);

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

        // Check if it's a connection error
        if (
          error?.message?.includes('client is closed') ||
          error?.message?.includes('connection') ||
          error?.code === 'CONNECTION_LOST'
        ) {
          this.logger.error(
            '🔌 Database connection error detected. This may be due to connection pooling issues.',
          );
        }

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

  private async outputJSON(
    workspace: Workspace,
    stats: LicenseStats,
  ): Promise<void> {
    const output = {
      timestamp: new Date().toISOString(),
      workspace: {
        id: workspace.id,
        displayName: workspace.displayName,
      },
      statistics: stats,
    };

    this.logger.log(JSON.stringify(output, null, 2));
  }

  private async outputTable(
    workspace: Workspace,
    stats: LicenseStats,
    options: DashboardOptions,
  ): Promise<void> {
    this.logger.log('\n=== LICENSE DASHBOARD STATISTICS ===\n');
    this.logger.log(`🏢 Workspace: ${workspace.displayName || workspace.id}`);
    this.logger.log(`📊 Generated: ${new Date().toLocaleString()}\n`);

    // Use DashboardDataTransformer to format stats for console
    const formattedStats =
      DashboardDataTransformer.formatLicenseStatsForConsole(stats);

    // Basic Statistics
    this.logger.log('📊 1. TỔNG BẢN QUYỀN');
    this.logger.log(
      `   Số lượng: ${formattedStats.totalLicenses.count.toLocaleString()}`,
    );
    this.logger.log(
      `   Tháng này: ${formattedStats.totalLicenses.currentMonthCount.toLocaleString()}`,
    );
    this.logger.log(
      `   Tháng trước: ${formattedStats.totalLicenses.lastMonthCount.toLocaleString()}`,
    );
    this.logger.log(
      `   Thay đổi: ${formattedStats.totalLicenses.changeText} so với tháng trước\n`,
    );

    this.logger.log('🟢 2. ĐANG HOẠT ĐỘNG');
    this.logger.log(
      `   Số lượng: ${formattedStats.activeLicenses.count.toLocaleString()}`,
    );
    this.logger.log(
      `   Hoạt động hôm nay: ${formattedStats.activeLicenses.todayCount.toLocaleString()}`,
    );
    this.logger.log(
      `   Hoạt động hôm qua: ${formattedStats.activeLicenses.yesterdayCount.toLocaleString()}`,
    );
    this.logger.log(
      `   Thay đổi hàng ngày: ${formattedStats.activeLicenses.dailyChangeText} so với hôm qua`,
    );
    this.logger.log(
      `   Tỷ lệ: ${formattedStats.activeLicenses.activePercentage}% tổng số license\n`,
    );

    this.logger.log('🔄 3. SỐ BẢN QUYỀN DÙNG THỬ');
    this.logger.log(
      `   Số lượng: ${formattedStats.trialLicenses.count.toLocaleString()}`,
    );
    this.logger.log(
      `   Tháng này: ${formattedStats.trialLicenses.currentMonthCount.toLocaleString()}`,
    );
    this.logger.log(
      `   Tháng trước: ${formattedStats.trialLicenses.lastMonthCount.toLocaleString()}`,
    );
    this.logger.log(
      `   Thay đổi: ${formattedStats.trialLicenses.changeText} so với tháng trước\n`,
    );

    this.logger.log('❌ 4. BẢN QUYỀN HẾT HẠN');
    this.logger.log(
      `   Số lượng: ${formattedStats.expiredLicenses.currentCount.toLocaleString()}`,
    );
    this.logger.log(
      `   Tháng này: ${formattedStats.expiredLicenses.currentMonthCount.toLocaleString()}`,
    );
    this.logger.log(
      `   Tháng trước: ${formattedStats.expiredLicenses.lastMonthCount.toLocaleString()}`,
    );
    this.logger.log(
      `   Thay đổi: ${formattedStats.expiredLicenses.changeText} so với tháng trước\n`,
    );

    this.logger.log('💰 5. ĐÃ HOÀN TIỀN');
    this.logger.log('	Tháng này: ');
    this.logger.log(
      `		Số lượng: ${formattedStats.refundedAmount.currentCount.toLocaleString()}`,
    );
    this.logger.log(
      `		Số tiền (VND): ${Math.round(formattedStats.refundedAmount.currentAmount).toLocaleString('vi-VN')}`,
    );
    this.logger.log('	Tháng Trước:');
    this.logger.log(
      `		Số lượng: ${formattedStats.refundedAmount.lastMonthCount.toLocaleString()}`,
    );
    this.logger.log(
      `		Số tiền (VND): ${Math.round(formattedStats.refundedAmount.lastMonthAmount).toLocaleString('vi-VN')}`,
    );
    this.logger.log('	Thay đổi so với tháng trước:');
    this.logger.log(
      `		Số lượng: ${formattedStats.refundedAmount.currentCount - formattedStats.refundedAmount.lastMonthCount >= 0 ? '+' : ''}${formattedStats.refundedAmount.currentCount - formattedStats.refundedAmount.lastMonthCount}`,
    );
    this.logger.log(
      `		Số tiền chênh lệch (VND): ${formattedStats.refundedAmount.currentAmount - formattedStats.refundedAmount.lastMonthAmount >= 0 ? '+' : ''}${Math.round(formattedStats.refundedAmount.currentAmount - formattedStats.refundedAmount.lastMonthAmount).toLocaleString('vi-VN')}`,
    );
    this.logger.log(
      `		% chênh lệch: ${formattedStats.refundedAmount.changeText}\n`,
    );

    this.logger.log('📊 6. TÌNH HÌNH HIỆN TẠI');
    this.logger.log('   📍 License sắp hết hạn:');
    this.logger.log(
      `   - Số lượng: ${formattedStats.expiringInDays.count.toLocaleString()}`,
    );
    this.logger.log(
      `   - Trong ${formattedStats.expiringInDays.daysToExpire} ngày tới\n`,
    );

    this.logger.log('   📈 Tình hình sử dụng:');
    this.logger.log(
      `   - Hoạt động hôm nay: ${formattedStats.usageStatistics.activeToday.toLocaleString()}`,
    );
    this.logger.log(
      `   - Hoạt động tuần này: ${formattedStats.usageStatistics.activeThisWeek.toLocaleString()}`,
    );
    this.logger.log(
      `   - Hoạt động tháng này: ${formattedStats.usageStatistics.activeThisMonth.toLocaleString()}\n`,
    );

    if (options.detailed && stats.expiringInDays.count > 0) {
      this.logger.log('📋 CHI TIẾT LICENSE SẮP HẾT HẠN:');
      await this.outputExpiringLicenseDetails(workspace.id);
    }
  }

  private async outputExpiringLicenseDetails(
    workspaceId: string,
  ): Promise<void> {
    try {
      this.logger.debug(
        `🔌 Connecting for expiring license details for workspace ${workspaceId}`,
      );
      const dataSource =
        await this.workspaceDataSourceService.connectToMainDataSource();

      if (!dataSource) {
        this.logger.log('   (Could not connect to database)');

        return;
      }

      if (!(await this.validateConnection(dataSource))) {
        this.logger.log('   (Database connection validation failed)');

        return;
      }

      const schemaName = getWorkspaceSchemaName(workspaceId);
      const thirtyDaysFromNow = new Date();

      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      this.logger.debug(
        `🔍 Querying expiring licenses in schema: ${schemaName}`,
      );

      // Use direct query instead of query builder for consistency
      const expiringLicenses = await dataSource.query(
        `SELECT 
          "licenseKey" as license_licenseKey,
          "name" as license_name, 
          "expiresAt" as license_expiresAt
         FROM "${schemaName}"."mktLicense" 
         WHERE "expiresAt" IS NOT NULL 
           AND "expiresAt" <= $1 
           AND "expiresAt" > $2 
           AND "deletedAt" IS NULL 
         ORDER BY "expiresAt" ASC 
         LIMIT 10`,
        [thirtyDaysFromNow.toISOString(), new Date().toISOString()],
      );

      this.logger.debug(
        `✅ Expiring licenses query completed: ${expiringLicenses?.length || 0} results`,
      );

      if (expiringLicenses.length > 0) {
        expiringLicenses.forEach(
          (
            license: {
              license_expiresAt: string;
              license_name: string;
              license_licenseKey: string;
            },
            index: number,
          ) => {
            const expiryDate = new Date(license.license_expiresAt);
            const daysUntilExpiry =
              DashboardDataTransformer.calculateDaysUntilExpiry(expiryDate);
            const displayName =
              DashboardDataTransformer.formatLicenseDisplayName(
                license.license_name,
                license.license_licenseKey,
              );

            this.logger.log(
              `   ${index + 1}. ${displayName} - expires in ${daysUntilExpiry} days`,
            );
          },
        );

        if (expiringLicenses.length >= 10) {
          this.logger.log('   ... (showing first 10 licenses)');
        }
      } else {
        this.logger.log('   (No licenses expiring in the next 30 days)');
      }
    } catch (error) {
      this.logger.error('❌ Error getting expiring license details:', {
        message: error?.message,
        stack: error?.stack,
        workspaceId,
      });

      if (error?.message?.includes('client is closed')) {
        this.logger.error(
          '🔌 Client closed error in outputExpiringLicenseDetails',
        );
      }

      this.logger.log('   (Could not retrieve expiring licenses details)');
    }
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
