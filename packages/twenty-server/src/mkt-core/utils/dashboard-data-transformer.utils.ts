import { StatisticsUtils } from './statistics.utils';

export interface LicenseStats {
  totalLicenses: {
    count: number;
    currentMonthCount: number;
    lastMonthCount: number;
    percentageChange: number;
  };
  activeLicenses: {
    count: number;
    todayCount: number;
    yesterdayCount: number;
    dailyChange: number;
  };
  trialLicenses: {
    count: number;
    currentMonthCount: number;
    lastMonthCount: number;
    percentageChange: number;
  };
  expiredLicenses: {
    currentCount: number;
    currentMonthCount: number;
    lastMonthCount: number;
    percentageChange: number;
  };
  refundedAmount: {
    currentAmount: number;
    lastMonthAmount: number;
    currentCount: number;
    lastMonthCount: number;
    percentageChange: number;
  };
  expiringInDays: {
    count: number;
    daysToExpire: number;
  };
  usageStatistics: {
    activeToday: number;
    activeThisWeek: number;
    activeThisMonth: number;
  };
}

/**
 * Interface for basic stats with comparison
 */
export interface StatsWithComparison {
  count: number;
  percentageChange: number;
}

/**
 * Interface for daily change stats
 */
export interface StatsWithDailyChange {
  count: number;
  dailyChange: number;
}

/**
 * Interface for amount stats
 */
export interface AmountStats {
  amount: number;
  percentageChange: number;
}

/**
 * Interface for expiring items stats
 */
export interface ExpiringStats {
  count: number;
  daysToExpire: number;
}

/**
 * Interface for usage statistics
 */
export interface UsageStats {
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
}

/**
 * Interface for license-specific stats with counts and percentages
 */
export interface LicenseCountStats {
  count: number;
  currentMonthCount: number;
  lastMonthCount: number;
  percentageChange: number;
}

/**
 * Interface for license activity stats
 */
export interface LicenseActivityStats {
  count: number;
  todayCount: number;
  yesterdayCount: number;
  dailyChange: number;
}

/**
 * Interface for expired license stats
 */
export interface ExpiredLicenseStats {
  currentCount: number;
  currentMonthCount: number;
  lastMonthCount: number;
  percentageChange: number;
}

/**
 * Interface for refund stats
 */
export interface RefundStats {
  currentAmount: number;
  lastMonthAmount: number;
  currentCount: number;
  lastMonthCount: number;
  percentageChange: number;
}

/**
 * Utilities for transforming raw data into dashboard statistics
 */
export class DashboardDataTransformer {
  /**
   * Transform count data with percentage comparison
   */
  static transformCountWithComparison(
    currentCount: number,
    previousCount: number,
  ): StatsWithComparison {
    return {
      count: currentCount,
      percentageChange: StatisticsUtils.calculatePercentageChange(
        currentCount,
        previousCount,
      ),
    };
  }

  /**
   * Transform count data with daily change
   */
  static transformCountWithDailyChange(
    todayCount: number,
    yesterdayCount: number,
  ): StatsWithDailyChange {
    return {
      count: todayCount,
      dailyChange: StatisticsUtils.calculateAbsoluteChange(
        todayCount,
        yesterdayCount,
      ),
    };
  }

  /**
   * Transform amount data with percentage comparison
   */
  static transformAmountWithComparison(
    currentAmount: number,
    previousAmount: number,
  ): AmountStats {
    return {
      amount: StatisticsUtils.roundToDecimal(currentAmount),
      percentageChange: StatisticsUtils.calculatePercentageChange(
        currentAmount,
        previousAmount,
      ),
    };
  }

  /**
   * Transform expiring items data
   */
  static transformExpiringData(
    count: number,
    daysToExpire = 30,
  ): ExpiringStats {
    return {
      count,
      daysToExpire,
    };
  }

  /**
   * Transform usage statistics
   */
  static transformUsageStats(
    activeToday: number,
    activeThisWeek: number,
    activeThisMonth: number,
  ): UsageStats {
    return {
      activeToday,
      activeThisWeek,
      activeThisMonth,
    };
  }

  /**
   * Calculate revenue summary from payment data
   */
  static calculateRevenueSummary(payments: Array<{ amount?: number }>): number {
    const amounts = payments
      .map((payment) => payment.amount || 0)
      .filter((amount) => amount > 0);

    return StatisticsUtils.calculateSum(amounts);
  }

  /**
   * Group data by time period
   */
  static groupByTimePeriod<T extends { createdAt: string | Date }>(
    items: T[],
    period: 'day' | 'week' | 'month',
  ): Record<string, T[]> {
    const grouped: Record<string, T[]> = {};

    items.forEach((item) => {
      const date = new Date(item.createdAt);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week': {
          const weekStart = new Date(date);

          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  }

  /**
   * Calculate trend indicators
   */
  static calculateTrendIndicators(
    currentPeriodData: number[],
    previousPeriodData: number[],
  ) {
    const currentAverage = StatisticsUtils.calculateAverage(currentPeriodData);
    const previousAverage =
      StatisticsUtils.calculateAverage(previousPeriodData);
    const trend = StatisticsUtils.calculateTrend([
      previousAverage,
      currentAverage,
    ]);

    return {
      currentAverage: StatisticsUtils.roundToDecimal(currentAverage),
      previousAverage: StatisticsUtils.roundToDecimal(previousAverage),
      trend,
      percentageChange: StatisticsUtils.calculatePercentageChange(
        currentAverage,
        previousAverage,
      ),
    };
  }

  /**
   * Format dashboard summary
   */
  static formatDashboardSummary(data: {
    totalItems: number;
    activeItems: number;
    inactiveItems: number;
    revenue: number;
  }) {
    const activePercentage =
      data.totalItems > 0 ? (data.activeItems / data.totalItems) * 100 : 0;

    return {
      ...data,
      activePercentage: StatisticsUtils.roundToDecimal(activePercentage),
      formattedRevenue: StatisticsUtils.formatCurrency(data.revenue),
      formattedTotalItems: StatisticsUtils.formatNumber(data.totalItems),
    };
  }

  /**
   * Transform license count data with monthly comparison
   */
  static transformLicenseCountStats(
    totalCount: number,
    currentMonthCount: number,
    lastMonthCount: number,
  ): LicenseCountStats {
    return {
      count: totalCount,
      currentMonthCount,
      lastMonthCount,
      percentageChange: StatisticsUtils.calculatePercentageChange(
        currentMonthCount,
        lastMonthCount,
      ),
    };
  }

  /**
   * Transform license activity data with daily comparison
   */
  static transformLicenseActivityStats(
    totalActiveCount: number,
    todayCount: number,
    yesterdayCount: number,
  ): LicenseActivityStats {
    return {
      count: totalActiveCount,
      todayCount,
      yesterdayCount,
      dailyChange: StatisticsUtils.calculateAbsoluteChange(
        todayCount,
        yesterdayCount,
      ),
    };
  }

  /**
   * Transform expired license data
   */
  static transformExpiredLicenseStats(
    currentCount: number,
    currentMonthCount: number,
    lastMonthCount: number,
  ): ExpiredLicenseStats {
    return {
      currentCount,
      currentMonthCount,
      lastMonthCount,
      percentageChange: StatisticsUtils.calculatePercentageChange(
        currentMonthCount,
        lastMonthCount,
      ),
    };
  }

  /**
   * Transform refund data with amount calculation
   */
  static transformRefundStats(
    currentRefundedLicenses: number,
    lastMonthRefundedLicenses: number,
    averageRefundAmount = 100,
  ): RefundStats {
    const currentAmount = currentRefundedLicenses * averageRefundAmount;
    const lastMonthAmount = lastMonthRefundedLicenses * averageRefundAmount;

    return {
      currentAmount,
      lastMonthAmount,
      currentCount: currentRefundedLicenses,
      lastMonthCount: lastMonthRefundedLicenses,
      percentageChange: StatisticsUtils.calculatePercentageChange(
        currentAmount,
        lastMonthAmount,
      ),
    };
  }

  /**
   * Transform refund data with direct amounts and counts
   */
  static transformRefundStatsWithAmounts(
    currentAmount: number,
    lastMonthAmount: number,
    currentCount: number,
    lastMonthCount: number,
  ): RefundStats {
    return {
      currentAmount: Math.round(currentAmount), // Keep as integer for currency
      lastMonthAmount: Math.round(lastMonthAmount), // Keep as integer for currency
      currentCount,
      lastMonthCount,
      percentageChange: StatisticsUtils.calculatePercentageChange(
        currentAmount,
        lastMonthAmount,
      ),
    };
  }

  /**
   * Calculate active license percentage
   */
  static calculateActiveLicensePercentage(
    activeCount: number,
    totalCount: number,
  ): number {
    if (totalCount <= 0) return 0;

    return StatisticsUtils.roundToDecimal((activeCount / totalCount) * 100);
  }

  /**
   * Calculate trial license stats with comparison
   */
  static calculateTrialLicenseStats(
    currentCount: number,
    lastMonthCount: number,
  ): StatsWithComparison {
    return this.transformCountWithComparison(currentCount, lastMonthCount);
  }

  /**
   * Calculate days until expiry for a given date
   */
  static calculateDaysUntilExpiry(expiryDate: Date): number {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();

    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Format license display name
   */
  static formatLicenseDisplayName(name?: string, licenseKey?: string): string {
    return name || licenseKey || 'Unknown';
  }

  /**
   * Format percentage change text with sign
   */
  static formatPercentageChangeText(percentageChange: number): string {
    const sign = percentageChange >= 0 ? '+' : '';

    return `${sign}${percentageChange.toFixed(1)}%`;
  }

  /**
   * Format daily change text with sign
   */
  static formatDailyChangeText(dailyChange: number): string {
    const sign = dailyChange >= 0 ? '+' : '';

    return `${sign}${dailyChange}`;
  }

  /**
   * Create license report metadata
   */
  static createLicenseReportMetadata(
    workspaceId: string,
    statistics: LicenseStats,
    reportVersion = '1.0',
  ) {
    return {
      generatedAt: new Date().toISOString(),
      workspaceId,
      statistics,
      reportVersion,
    };
  }

  /**
   * Create license report data for database
   */
  static createLicenseReportData(
    workspaceId: string,
    statistics: LicenseStats,
    reportVersion = '1.0',
  ) {
    const metadata = this.createLicenseReportMetadata(
      workspaceId,
      statistics,
      reportVersion,
    );

    return {
      name: `License Dashboard Statistics - ${new Date().toLocaleDateString()}`,
      reportType: 'license',
      notes: `Automated license dashboard statistics report generated at ${new Date().toISOString()}`,
      metadata: metadata as unknown as JSON,
      position: Date.now(),
    };
  }

  /**
   * Format license stats for console output
   */
  static formatLicenseStatsForConsole(stats: {
    totalLicenses: LicenseCountStats;
    activeLicenses: LicenseActivityStats;
    expiredLicenses: ExpiredLicenseStats;
    refundedAmount: RefundStats;
    expiringInDays: ExpiringStats;
    usageStatistics: UsageStats;
    trialLicenses: LicenseCountStats;
  }) {
    const activePercentage = this.calculateActiveLicensePercentage(
      stats.activeLicenses.count,
      stats.totalLicenses.count,
    );

    return {
      totalLicenses: {
        ...stats.totalLicenses,
        changeText: this.formatPercentageChangeText(
          stats.totalLicenses.percentageChange,
        ),
      },
      activeLicenses: {
        ...stats.activeLicenses,
        dailyChangeText: this.formatDailyChangeText(
          stats.activeLicenses.dailyChange,
        ),
        activePercentage,
      },
      expiredLicenses: {
        ...stats.expiredLicenses,
        changeText: this.formatPercentageChangeText(
          stats.expiredLicenses.percentageChange,
        ),
      },
      refundedAmount: {
        ...stats.refundedAmount,
        changeText: this.formatPercentageChangeText(
          stats.refundedAmount.percentageChange,
        ),
      },
      expiringInDays: stats.expiringInDays,
      usageStatistics: stats.usageStatistics,
      trialLicenses: {
        ...stats.trialLicenses,
        changeText: this.formatPercentageChangeText(
          stats.trialLicenses.percentageChange,
        ),
      },
    };
  }
}
