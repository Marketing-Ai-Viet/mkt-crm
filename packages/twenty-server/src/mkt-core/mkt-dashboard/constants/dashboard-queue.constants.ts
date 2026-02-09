export const DASHBOARD_QUEUE_NAMES = {
  SNAPSHOT: 'mkt-dashboard-snapshot-queue',
  CACHE_WARMUP: 'mkt-dashboard-cache-warmup-queue',
  CLEANUP: 'mkt-dashboard-cleanup-queue',
} as const;

export const DASHBOARD_JOB_NAMES = {
  SNAPSHOT_DAILY: 'mkt-dashboard-snapshot-daily',
  CACHE_WARMUP: 'mkt-dashboard-cache-warmup',
  SNAPSHOT_CLEANUP: 'mkt-dashboard-snapshot-cleanup',
} as const;
