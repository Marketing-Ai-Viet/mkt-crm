export const DASHBOARD_CACHE_PREFIX = {
  SUMMARY: 'mkt:dashboard:summary',
  STATS: 'mkt:dashboard:stats',
  ALERTS: 'mkt:dashboard:alerts',
  LEADERBOARD: 'mkt:dashboard:leaderboard',
  WIDGET: 'mkt:dashboard:widget',
  LAYOUT: 'mkt:dashboard:layout',
} as const;

export const DASHBOARD_CACHE_TTL = {
  SUMMARY: 300,
  STATS: 300,
  ALERTS: 120,
  LEADERBOARD: 600,
  WIDGET: 3600,
  LAYOUT: 3600,
} as const;
