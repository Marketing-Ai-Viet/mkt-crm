import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/license.constants';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktReportWorkspaceEntity } from 'src/mkt-core/report/objects/mkt-report.workspace-entity';

export interface ReportMetadataStatistics {
  totalLicenses: {
    count: number;
    lastMonthCount: number;
    percentageChange: number;
    currentMonthCount: number;
  };
  trialLicenses: {
    count: number;
    currentMonthCount: number;
    lastMonthCount: number;
    percentageChange: number;
  };
  activeLicenses: {
    count: number;
    todayCount: number;
    dailyChange: number;
    yesterdayCount: number;
  };
  expiringInDays: {
    count: number;
    daysToExpire: number;
  };
  refundedAmount: {
    currentAmount: number;
    lastMonthAmount: number;
    currentCount: number;
    lastMonthCount: number;
    percentageChange: number;
  };
  expiredLicenses: {
    currentCount: number;
    lastMonthCount: number;
    percentageChange: number;
  };
  usageStatistics: {
    activeToday: number;
    activeThisWeek: number;
    activeThisMonth: number;
  };
}

export interface ReportMetadata {
  statistics: ReportMetadataStatistics;
  generatedAt: string;
  workspaceId: string;
  reportVersion: string;
}

export interface LicenseDashboardStatistics {
  //workspaceName: string;
  generatedAt: string;
  totalLicenses: {
    count: number;
    thisMonth: number;
    lastMonth: number;
    changePercentage: number;
  };
  activeLicenses: {
    count: number;
    activeToday: number;
    activeYesterday: number;
    dailyChange: number;
    percentage: number;
  };
  trialLicenses: {
    count: number;
    thisMonth: number;
    lastMonth: number;
    changePercentage: number;
  };
  expiredLicenses: {
    count: number;
    thisMonth: number;
    lastMonth: number;
    changePercentage: number;
  };
  refundedAmount: {
    amount: number;
    count: number;
    thisMonth: number;
    lastMonth: number;
    thisMonthAmount: number;
    lastMonthAmount: number;
    changePercentage: number;
  };
  currentSituation: {
    expiringSoon: number;
    activeToday: number;
    activeThisWeek: number;
    activeThisMonth: number;
  };
}

export interface CsvExportData {
  reportType: string;
  // workspaceName: string;
  generatedAt: string;
  data: string; // CSV formatted string
  metadata: LicenseDashboardStatistics;
}

@Injectable()
export class MktLicenseCsvExportService {
  private readonly logger = new Logger(MktLicenseCsvExportService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async exportLicenseDashboardCsv(
    reportType: string,
    workspaceId?: string,
  ): Promise<CsvExportData | null> {
    let targetWorkspaceId = workspaceId;

    if (!targetWorkspaceId) {
      try {
        const context = this.scopedWorkspaceContextFactory.create();

        targetWorkspaceId = context?.workspaceId || undefined;
      } catch (error) {
        this.logger.error('Failed to get workspace context', error);
      }
    }

    if (!targetWorkspaceId) {
      throw new Error(
        'Workspace ID not found. Please provide workspaceId parameter or ensure proper authentication context.',
      );
    }

    try {
      // Get latest report data
      const reportData = await this.getLatestReportData(
        targetWorkspaceId,
        reportType,
      );

      if (!reportData) return null;

      // Get license statistics from report data
      const statistics = this.mapReportDataToStatistics(
        reportData.metadata as unknown as ReportMetadata,
        targetWorkspaceId,
      );

      this.logger.log(
        `Generated statistics for workspace ${targetWorkspaceId}: ${JSON.stringify(
          statistics,
        )}`,
      );
      // Generate CSV content
      const csvContent = this.generateCsvContent(statistics);

      return {
        reportType,
        //workspaceName: statistics.workspaceName,
        generatedAt: statistics.generatedAt,
        data: csvContent,
        metadata: statistics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to export CSV for report type: ${reportType}`,
        error,
      );
      throw error;
    }
  }

  private async getLatestReportData(
    workspaceId: string,
    reportType: string,
  ): Promise<MktReportWorkspaceEntity | null> {
    const reportRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktReportWorkspaceEntity>(
        workspaceId,
        'mktReport',
        { shouldBypassPermissionChecks: true },
      );

    return await reportRepository.findOne({
      where: { reportType },
      order: { createdAt: 'DESC' },
    });
  }

  private async generateLicenseStatistics(
    workspaceId: string,
  ): Promise<LicenseDashboardStatistics> {
    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
        workspaceId,
        'mktLicense',
        { shouldBypassPermissionChecks: true },
      );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);

    yesterday.setDate(yesterday.getDate() - 1);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(thisMonthStart);

    lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);

    const thisWeekStart = new Date(today);

    thisWeekStart.setDate(thisWeekStart.getDate() - today.getDay());

    const next30Days = new Date(now);

    next30Days.setDate(next30Days.getDate() + 30);

    // Get all licenses
    const allLicenses = await licenseRepository.find();

    // Calculate statistics
    const totalCount = allLicenses.length;
    const thisMonthCount = allLicenses.filter(
      (l) => l.createdAt && new Date(l.createdAt) >= thisMonthStart,
    ).length;
    const lastMonthCount = allLicenses.filter(
      (l) =>
        l.createdAt &&
        new Date(l.createdAt) >= lastMonthStart &&
        new Date(l.createdAt) <= lastMonthEnd,
    ).length;

    const activeLicenses = allLicenses.filter(
      (l) => l.status === MKT_LICENSE_STATUS.ACTIVE,
    );
    const activeCount = activeLicenses.length;

    const activeToday = activeLicenses.filter(
      (l) => l.lastLoginAt && new Date(l.lastLoginAt) >= today,
    ).length;

    const activeYesterday = activeLicenses.filter(
      (l) =>
        l.lastLoginAt &&
        new Date(l.lastLoginAt) >= yesterday &&
        new Date(l.lastLoginAt) < today,
    ).length;

    const activeThisWeek = activeLicenses.filter(
      (l) => l.lastLoginAt && new Date(l.lastLoginAt) >= thisWeekStart,
    ).length;

    const activeThisMonth = activeLicenses.filter(
      (l) => l.lastLoginAt && new Date(l.lastLoginAt) >= thisMonthStart,
    ).length;

    const trialCount = allLicenses.filter(
      (l) => l.status === MKT_LICENSE_STATUS.TRIAL,
    ).length;

    // Calculate expired licenses
    const expiredCount = allLicenses.filter(
      (l) => l.status === MKT_LICENSE_STATUS.EXPIRED,
    ).length;

    // Calculate expired licenses for this month (licenses that expired this month by expiresAt)
    const thisMonthExpiredCount = allLicenses.filter(
      (l) =>
        l.status === MKT_LICENSE_STATUS.EXPIRED &&
        l.expiresAt &&
        new Date(l.expiresAt) >= thisMonthStart &&
        new Date(l.expiresAt) <
          new Date(
            thisMonthStart.getFullYear(),
            thisMonthStart.getMonth() + 1,
            1,
          ),
    ).length;

    // Calculate expired licenses for last month (licenses that expired last month by expiresAt)
    const lastMonthExpiredCount = allLicenses.filter(
      (l) =>
        l.status === MKT_LICENSE_STATUS.EXPIRED &&
        l.expiresAt &&
        new Date(l.expiresAt) >= lastMonthStart &&
        new Date(l.expiresAt) < thisMonthStart,
    ).length;

    const expiringSoon = allLicenses.filter(
      (l) =>
        l.expiresAt &&
        new Date(l.expiresAt) <= next30Days &&
        new Date(l.expiresAt) > now,
    ).length;

    // Calculate percentages
    const totalChangePercentage =
      lastMonthCount > 0
        ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100
        : thisMonthCount > 0
          ? 100
          : 0;

    const activePercentage =
      totalCount > 0 ? (activeCount / totalCount) * 100 : 0;
    const dailyChange = activeToday - activeYesterday;

    // Calculate expired licenses percentage change
    const expiredChangePercentage =
      lastMonthExpiredCount > 0
        ? ((thisMonthExpiredCount - lastMonthExpiredCount) /
            lastMonthExpiredCount) *
          100
        : thisMonthExpiredCount > 0
          ? 100
          : 0;

    // Calculate refunded amounts for current month
    const refundedLicensesThisMonth = allLicenses.filter(
      (l) =>
        l.status === MKT_LICENSE_STATUS.REFUND &&
        l.updatedAt &&
        new Date(l.updatedAt) >= thisMonthStart,
    );

    // Calculate refunded amounts for last month
    const refundedLicensesLastMonth = allLicenses.filter(
      (l) =>
        l.status === MKT_LICENSE_STATUS.REFUND &&
        l.updatedAt &&
        new Date(l.updatedAt) >= lastMonthStart &&
        new Date(l.updatedAt) <= lastMonthEnd,
    );

    // NOTE: This is mock data calculation.
    // Real data should come from command using: license → variant → orderItem → unitPrice
    // For fallback/mock purposes only, use average amount per license
    const averageRefundAmount = 14450000; // Average VND amount based on typical license prices
    const thisMonthRefundedAmount =
      refundedLicensesThisMonth.length * averageRefundAmount;
    const lastMonthRefundedAmount =
      refundedLicensesLastMonth.length * averageRefundAmount;

    // Calculate refunded amount percentage change
    const refundedChangePercentage =
      lastMonthRefundedAmount > 0
        ? ((thisMonthRefundedAmount - lastMonthRefundedAmount) /
            lastMonthRefundedAmount) *
          100
        : thisMonthRefundedAmount > 0
          ? 100
          : 0;

    return {
      //workspaceName: 'YCombinator', // This should come from workspace data
      generatedAt: now.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      totalLicenses: {
        count: totalCount,
        thisMonth: thisMonthCount,
        lastMonth: lastMonthCount,
        changePercentage: totalChangePercentage,
      },
      activeLicenses: {
        count: activeCount,
        activeToday,
        activeYesterday,
        dailyChange,
        percentage: activePercentage,
      },
      trialLicenses: {
        count: trialCount,
        thisMonth: 0, // TODO: Calculate this month trial count
        lastMonth: 0, // TODO: Calculate last month trial count
        changePercentage: 100, // Mock data
      },
      expiredLicenses: {
        count: expiredCount,
        thisMonth: thisMonthExpiredCount,
        lastMonth: lastMonthExpiredCount,
        changePercentage: expiredChangePercentage,
      },
      refundedAmount: {
        amount: thisMonthRefundedAmount,
        count:
          refundedLicensesThisMonth.length + refundedLicensesLastMonth.length, // Total count
        thisMonth: refundedLicensesThisMonth.length,
        lastMonth: refundedLicensesLastMonth.length,
        thisMonthAmount: thisMonthRefundedAmount,
        lastMonthAmount: lastMonthRefundedAmount,
        changePercentage: refundedChangePercentage,
      },
      currentSituation: {
        expiringSoon,
        activeToday,
        activeThisWeek,
        activeThisMonth,
      },
    };
  }

  private mapReportDataToStatistics(
    metadata: ReportMetadata,
    _workspaceId: string,
  ): LicenseDashboardStatistics {
    const stats = metadata?.statistics;
    const now = new Date();

    if (!stats) {
      throw new Error('No statistics found in report metadata');
    }

    return {
      //workspaceName: 'YCombinator', // This should come from workspace data
      generatedAt: metadata?.generatedAt
        ? new Date(metadata.generatedAt).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })
        : now.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }),
      totalLicenses: {
        count: stats.totalLicenses?.count || 0,
        thisMonth: stats.totalLicenses?.currentMonthCount || 0,
        lastMonth: stats.totalLicenses?.lastMonthCount || 0,
        changePercentage: stats.totalLicenses?.percentageChange || 0,
      },
      activeLicenses: {
        count: stats.activeLicenses?.count || 0,
        activeToday: stats.activeLicenses?.todayCount || 0,
        activeYesterday: stats.activeLicenses?.yesterdayCount || 0,
        dailyChange: stats.activeLicenses?.dailyChange || 0,
        percentage:
          stats.activeLicenses?.count && stats.totalLicenses?.count
            ? (stats.activeLicenses.count / stats.totalLicenses.count) * 100
            : 0,
      },
      trialLicenses: {
        count: stats.trialLicenses?.count || 0,
        thisMonth: stats.trialLicenses?.currentMonthCount || 0,
        lastMonth: stats.trialLicenses?.lastMonthCount || 0,
        changePercentage: stats.trialLicenses?.percentageChange || 0,
      },
      expiredLicenses: {
        count: stats.expiredLicenses?.currentCount || 0,
        thisMonth: 0, // TODO: This should come from report metadata
        lastMonth: stats.expiredLicenses?.lastMonthCount || 0,
        changePercentage: stats.expiredLicenses?.percentageChange || 0,
      },
      refundedAmount: {
        amount: stats.refundedAmount?.currentAmount || 0,
        count: stats.refundedAmount?.currentCount || 0,
        thisMonth: stats.refundedAmount?.currentCount || 0,
        lastMonth: stats.refundedAmount?.lastMonthCount || 0,
        thisMonthAmount: stats.refundedAmount?.currentAmount || 0,
        lastMonthAmount: stats.refundedAmount?.lastMonthAmount || 0,
        changePercentage: stats.refundedAmount?.percentageChange || 0,
      },
      currentSituation: {
        expiringSoon: stats.expiringInDays?.count || 0,
        activeToday:
          stats.usageStatistics?.activeToday ||
          stats.activeLicenses?.todayCount ||
          0,
        activeThisWeek: stats.usageStatistics?.activeThisWeek || 0,
        activeThisMonth: stats.usageStatistics?.activeThisMonth || 0,
      },
    };
  }

  private generateCsvContent(statistics: LicenseDashboardStatistics): string {
    const csvRows = [
      // Header
      ['Chỉ số', 'Giá trị', 'Thông tin bổ sung'],

      // Basic info
      //['Không gian làm việc', statistics.workspaceName, ''],
      ['Thời điểm tạo', statistics.generatedAt, ''],
      ['', '', ''], // Empty row for separation

      // Total licenses
      ['Tổng số license', '', ''],
      ['Tổng số', statistics.totalLicenses.count.toString(), ''],
      ['Tháng này', statistics.totalLicenses.thisMonth.toString(), ''],
      ['Tháng trước', statistics.totalLicenses.lastMonth.toString(), ''],
      [
        'Thay đổi %',
        `${statistics.totalLicenses.changePercentage.toFixed(1)}%`,
        'so với tháng trước',
      ],
      ['', '', ''], // Empty row

      // Active licenses
      ['Đang hoạt động', '', ''],
      ['Số lượng', statistics.activeLicenses.count.toString(), ''],
      [
        'Hoạt động hôm nay',
        statistics.activeLicenses.activeToday.toString(),
        '',
      ],
      [
        'Hoạt động hôm qua',
        statistics.activeLicenses.activeYesterday.toString(),
        '',
      ],
      [
        'Thay đổi hàng ngày',
        statistics.activeLicenses.dailyChange.toString(),
        'so với hôm qua',
      ],
      ['Tỷ lệ', `${statistics.activeLicenses.percentage.toFixed(2)}%`, ''],
      ['', '', ''], // Empty row

      // Trial licenses
      ['BẢN QUYỀN DÙNG THỬ', '', ''],
      ['Số lượng', statistics.trialLicenses.count.toString(), ''],
      ['Tháng này', statistics.trialLicenses.thisMonth.toString(), ''],
      ['Tháng trước', statistics.trialLicenses.lastMonth.toString(), ''],
      [
        'Thay đổi %',
        `${statistics.trialLicenses.changePercentage.toFixed(1)}%`,
        'so với tháng trước',
      ],
      ['', '', ''], // Empty row

      // Expired licenses
      ['BẢN QUYỀN HẾT HẠN', '', ''],
      ['Số lượng', statistics.expiredLicenses.count.toString(), ''],
      ['Tháng này', statistics.expiredLicenses.thisMonth.toString(), ''],
      ['Tháng trước', statistics.expiredLicenses.lastMonth.toString(), ''],
      [
        'Thay đổi %',
        `${statistics.expiredLicenses.changePercentage.toFixed(1)}%`,
        'so với tháng trước',
      ],
      ['', '', ''], // Empty row

      // Refunded amount
      ['ĐÃ HOÀN TIỀN', '', ''],
      ['Tháng này:', '', ''],
      ['  Số lượng', statistics.refundedAmount.thisMonth.toString(), ''],
      [
        '  Số tiền (VND)',
        statistics.refundedAmount.thisMonthAmount.toLocaleString('vi-VN'),
        '',
      ],
      ['Tháng trước:', '', ''],
      ['  Số lượng', statistics.refundedAmount.lastMonth.toString(), ''],
      [
        '  Số tiền (VND)',
        statistics.refundedAmount.lastMonthAmount.toLocaleString('vi-VN'),
        '',
      ],
      ['Thay đổi so với tháng trước:', '', ''],
      [
        '  Số lượng',
        `${statistics.refundedAmount.thisMonth - statistics.refundedAmount.lastMonth >= 0 ? '+' : ''}${statistics.refundedAmount.thisMonth - statistics.refundedAmount.lastMonth}`,
        '',
      ],
      [
        '  Số tiền chênh lệch (VND)',
        `${statistics.refundedAmount.thisMonthAmount - statistics.refundedAmount.lastMonthAmount >= 0 ? '+' : ''}${(statistics.refundedAmount.thisMonthAmount - statistics.refundedAmount.lastMonthAmount).toLocaleString('vi-VN')}`,
        '',
      ],
      [
        '  % chênh lệch',
        `${statistics.refundedAmount.changePercentage >= 0 ? '+' : ''}${statistics.refundedAmount.changePercentage.toFixed(1)}%`,
        '',
      ],
      ['', '', ''], // Empty row

      // Current situation
      ['TÌNH HÌNH HIỆN TẠI', '', ''],
      [
        'Sắp hết hạn (30 ngày)',
        statistics.currentSituation.expiringSoon.toString(),
        '',
      ],
      [
        'Hoạt động hôm nay',
        statistics.currentSituation.activeToday.toString(),
        '',
      ],
      [
        'Hoạt động tuần này',
        statistics.currentSituation.activeThisWeek.toString(),
        '',
      ],
      [
        'Hoạt động tháng này',
        statistics.currentSituation.activeThisMonth.toString(),
        '',
      ],
    ];

    // Convert to CSV format
    return csvRows
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
  }

  generateDashboardReport(statistics: LicenseDashboardStatistics): string {
    return `=== LICENSE DASHBOARD STATISTICS ===

📊 Generated: ${statistics.generatedAt}

📊 1. TỔNG BẢN QUYỀN
   Số lượng: ${statistics.totalLicenses.count}
   Tháng này: ${statistics.totalLicenses.thisMonth}
   Tháng trước: ${statistics.totalLicenses.lastMonth}
   Thay đổi: ${statistics.totalLicenses.changePercentage >= 0 ? '+' : ''}${statistics.totalLicenses.changePercentage.toFixed(1)}% so với tháng trước

🟢 2. ĐANG HOẠT ĐỘNG
   Số lượng: ${statistics.activeLicenses.count}
   Hoạt động hôm nay: ${statistics.activeLicenses.activeToday}
   Hoạt động hôm qua: ${statistics.activeLicenses.activeYesterday}
   Thay đổi hàng ngày: ${statistics.activeLicenses.dailyChange >= 0 ? '+' : ''}${statistics.activeLicenses.dailyChange} so với hôm qua
   Tỷ lệ: ${statistics.activeLicenses.percentage.toFixed(2)}% tổng số license

🔄 3. SỐ BẢN QUYỀN DÙNG THỬ
   Số lượng: ${statistics.trialLicenses.count}
   Tháng này: ${statistics.trialLicenses.thisMonth}
   Tháng trước: ${statistics.trialLicenses.lastMonth}
   Thay đổi: ${statistics.trialLicenses.changePercentage >= 0 ? '+' : ''}${statistics.trialLicenses.changePercentage.toFixed(1)}% so với tháng trước

❌ 4. BẢN QUYỀN HẾT HẠN
   Số lượng: ${statistics.expiredLicenses.count}
   Tháng này: ${statistics.expiredLicenses.thisMonth}
   Tháng trước: ${statistics.expiredLicenses.lastMonth}
   Thay đổi: ${statistics.expiredLicenses.changePercentage >= 0 ? '+' : ''}${statistics.expiredLicenses.changePercentage.toFixed(1)}% so với tháng trước

💰 5. ĐÃ HOÀN TIỀN
	Tháng này: 
		Số lượng: ${statistics.refundedAmount.thisMonth}
		Số tiền (VND): ${statistics.refundedAmount.thisMonthAmount.toLocaleString('vi-VN')}
	Tháng Trước:
		Số lượng: ${statistics.refundedAmount.lastMonth}
		Số tiền (VND): ${statistics.refundedAmount.lastMonthAmount.toLocaleString('vi-VN')}
	Thay đổi so với tháng trước:
		Số lượng: ${statistics.refundedAmount.thisMonth - statistics.refundedAmount.lastMonth >= 0 ? '+' : ''}${statistics.refundedAmount.thisMonth - statistics.refundedAmount.lastMonth}
		Số tiền chênh lệch (VND): ${statistics.refundedAmount.thisMonthAmount - statistics.refundedAmount.lastMonthAmount >= 0 ? '+' : ''}${(statistics.refundedAmount.thisMonthAmount - statistics.refundedAmount.lastMonthAmount).toLocaleString('vi-VN')}
		% chênh lệch: ${statistics.refundedAmount.changePercentage >= 0 ? '+' : ''}${statistics.refundedAmount.changePercentage.toFixed(1)}%

📊 6. TÌNH HÌNH HIỆN TẠI
   📍 License sắp hết hạn:
   - Số lượng: ${statistics.currentSituation.expiringSoon}
   - Trong 30 ngày tới

   📈 Tình hình sử dụng:
   - Hoạt động hôm nay: ${statistics.currentSituation.activeToday}
   - Hoạt động tuần này: ${statistics.currentSituation.activeThisWeek}
   - Hoạt động tháng này: ${statistics.currentSituation.activeThisMonth}`;
  }
}
