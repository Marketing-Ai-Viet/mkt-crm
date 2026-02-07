import { DashboardDataSource } from 'src/mkt-core/mkt-dashboard/types/dashboard-data-source.type';

export type DataSourceServiceKey =
  | 'revenue'
  | 'orders'
  | 'customers'
  | 'payments'
  | 'kpis'
  | 'contracts'
  | 'leaderboard'
  | 'alerts';

export const DATA_SOURCE_SERVICE_MAP: Record<
  Exclude<DashboardDataSource, 'COMBINED'>,
  DataSourceServiceKey
> = {
  REVENUE: 'revenue',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  PAYMENTS: 'payments',
  KPIS: 'kpis',
  CONTRACTS: 'contracts',
} as const;

export const WIDGET_CODE_DATA_SOURCE_MAP: Record<string, DashboardDataSource> =
  {
    TOTAL_REVENUE: 'REVENUE',
    REVENUE_TREND: 'REVENUE',
    TOTAL_ORDERS: 'ORDERS',
    ORDER_STATUS_DIST: 'ORDERS',
    TOTAL_CUSTOMERS: 'CUSTOMERS',
    CUSTOMER_TIER_DIST: 'CUSTOMERS',
    CUSTOMER_GROWTH: 'CUSTOMERS',
    TOP_CUSTOMERS: 'CUSTOMERS',
    COLLECTION_RATE: 'PAYMENTS',
    PAYMENT_STATUS: 'PAYMENTS',
    KPI_SCORECARD: 'KPIS',
    CONTRACT_SUMMARY: 'CONTRACTS',
    STAFF_LEADERBOARD: 'COMBINED',
    ALERTS_PANEL: 'COMBINED',
  } as const;
