export const MKT_LICENSE_DASHBOARD_STATS_CRON_PATTERN = '0 2 * * *'; // Hàng ngày lúc 2:00 AM

export interface MktLicenseDashboardStatsJobData {
  workspaceId: string;
}

export interface MktLicenseDashboardStatsCronOptions {
  workspaceIds?: string;
  cronPattern?: string;
}
