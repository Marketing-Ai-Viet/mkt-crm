// ============================================
// SEED DATA TYPE
// ============================================

type MktDashboardWidgetDataSeed = {
  id: string;
  widgetName: string;
  widgetCode: string;
  widgetType: string;
  dataSource: string;
  defaultColSpan: number;
  defaultRowSpan: number;
  defaultPeriod: string;
  filterConfig: object | null;
  visibility: string;
  isActive: boolean;
  isSystemDefault: boolean;
  displayOrder: number;
  cacheTtlSeconds: number;
  widgetConfig: object | null;
  description: string;
  position: number;
};

// prettier-ignore
export const MKT_DASHBOARD_WIDGET_DATA_SEED_COLUMNS: (keyof MktDashboardWidgetDataSeed)[] = [
  'id',
  'widgetName',
  'widgetCode',
  'widgetType',
  'dataSource',
  'defaultColSpan',
  'defaultRowSpan',
  'defaultPeriod',
  'filterConfig',
  'visibility',
  'isActive',
  'isSystemDefault',
  'displayOrder',
  'cacheTtlSeconds',
  'widgetConfig',
  'description',
  'position',
];

// prettier-ignore
export const MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS = {
  TOTAL_REVENUE:       'a1b2c3d4-0001-4000-8000-000000000001',
  REVENUE_TREND:       'a1b2c3d4-0002-4000-8000-000000000002',
  TOTAL_ORDERS:        'a1b2c3d4-0003-4000-8000-000000000003',
  ORDER_STATUS_DIST:   'a1b2c3d4-0004-4000-8000-000000000004',
  TOTAL_CUSTOMERS:     'a1b2c3d4-0005-4000-8000-000000000005',
  CUSTOMER_TIER_DIST:  'a1b2c3d4-0006-4000-8000-000000000006',
  CUSTOMER_GROWTH:     'a1b2c3d4-0007-4000-8000-000000000007',
  TOP_CUSTOMERS:       'a1b2c3d4-0008-4000-8000-000000000008',
  COLLECTION_RATE:     'a1b2c3d4-0009-4000-8000-000000000009',
  PAYMENT_STATUS:      'a1b2c3d4-000a-4000-8000-00000000000a',
  KPI_SCORECARD:       'a1b2c3d4-000b-4000-8000-00000000000b',
  CONTRACT_SUMMARY:    'a1b2c3d4-000c-4000-8000-00000000000c',
  STAFF_LEADERBOARD:   'a1b2c3d4-000d-4000-8000-00000000000d',
  ALERTS_PANEL:        'a1b2c3d4-000e-4000-8000-00000000000e',
};

const DEFAULT_WIDGET_FIELDS = {
  isActive: true,
  isSystemDefault: true,
  visibility: 'ALL',
  defaultPeriod: 'THIS_MONTH',
  cacheTtlSeconds: 300,
  filterConfig: null,
  widgetConfig: null,
};

// prettier-ignore
export const MKT_DASHBOARD_WIDGET_DATA_SEEDS: MktDashboardWidgetDataSeed[] = [
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.TOTAL_REVENUE,
    widgetName: 'Total Revenue',
    widgetCode: 'TOTAL_REVENUE',
    widgetType: 'STAT_CARD',
    dataSource: 'REVENUE',
    defaultColSpan: 3,
    defaultRowSpan: 1,
    displayOrder: 0,
    position: 0,
    description: 'Total revenue for the selected period',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.REVENUE_TREND,
    widgetName: 'Revenue Trend',
    widgetCode: 'REVENUE_TREND',
    widgetType: 'LINE_CHART',
    dataSource: 'REVENUE',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    displayOrder: 1,
    position: 1,
    description: 'Revenue trend over time',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.TOTAL_ORDERS,
    widgetName: 'Total Orders',
    widgetCode: 'TOTAL_ORDERS',
    widgetType: 'STAT_CARD',
    dataSource: 'ORDERS',
    defaultColSpan: 3,
    defaultRowSpan: 1,
    displayOrder: 2,
    position: 2,
    description: 'Total orders for the selected period',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.ORDER_STATUS_DIST,
    widgetName: 'Order Status Distribution',
    widgetCode: 'ORDER_STATUS_DIST',
    widgetType: 'PIE_CHART',
    dataSource: 'ORDERS',
    defaultColSpan: 3,
    defaultRowSpan: 2,
    displayOrder: 3,
    position: 3,
    description: 'Distribution of orders by status',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.TOTAL_CUSTOMERS,
    widgetName: 'Total Customers',
    widgetCode: 'TOTAL_CUSTOMERS',
    widgetType: 'STAT_CARD',
    dataSource: 'CUSTOMERS',
    defaultColSpan: 3,
    defaultRowSpan: 1,
    displayOrder: 4,
    position: 4,
    description: 'Total customers count',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.CUSTOMER_TIER_DIST,
    widgetName: 'Customer Tier Distribution',
    widgetCode: 'CUSTOMER_TIER_DIST',
    widgetType: 'PIE_CHART',
    dataSource: 'CUSTOMERS',
    defaultColSpan: 3,
    defaultRowSpan: 2,
    displayOrder: 5,
    position: 5,
    description: 'Customers grouped by tier',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.CUSTOMER_GROWTH,
    widgetName: 'Customer Growth',
    widgetCode: 'CUSTOMER_GROWTH',
    widgetType: 'LINE_CHART',
    dataSource: 'CUSTOMERS',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    displayOrder: 6,
    position: 6,
    description: 'Customer growth trend over time',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.TOP_CUSTOMERS,
    widgetName: 'Top Customers',
    widgetCode: 'TOP_CUSTOMERS',
    widgetType: 'TABLE',
    dataSource: 'CUSTOMERS',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    displayOrder: 7,
    position: 7,
    description: 'Top customers by revenue',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.COLLECTION_RATE,
    widgetName: 'Collection Rate',
    widgetCode: 'COLLECTION_RATE',
    widgetType: 'STAT_CARD',
    dataSource: 'PAYMENTS',
    defaultColSpan: 3,
    defaultRowSpan: 1,
    displayOrder: 8,
    position: 8,
    description: 'Payment collection rate percentage',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.PAYMENT_STATUS,
    widgetName: 'Payment Status',
    widgetCode: 'PAYMENT_STATUS',
    widgetType: 'BAR_CHART',
    dataSource: 'PAYMENTS',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    displayOrder: 9,
    position: 9,
    description: 'Distribution of payments by status',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.KPI_SCORECARD,
    widgetName: 'KPI Scorecard',
    widgetCode: 'KPI_SCORECARD',
    widgetType: 'KPI_SCORECARD',
    dataSource: 'KPIS',
    defaultColSpan: 12,
    defaultRowSpan: 2,
    displayOrder: 10,
    position: 10,
    description: 'KPI achievement scorecard',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.CONTRACT_SUMMARY,
    widgetName: 'Contract Summary',
    widgetCode: 'CONTRACT_SUMMARY',
    widgetType: 'TABLE',
    dataSource: 'CONTRACTS',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    displayOrder: 11,
    position: 11,
    description: 'Contract summary statistics',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.STAFF_LEADERBOARD,
    widgetName: 'Staff Leaderboard',
    widgetCode: 'STAFF_LEADERBOARD',
    widgetType: 'LEADERBOARD',
    dataSource: 'COMBINED',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    displayOrder: 12,
    position: 12,
    description: 'Staff performance leaderboard',
    ...DEFAULT_WIDGET_FIELDS,
  },
  {
    id: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.ALERTS_PANEL,
    widgetName: 'Alerts Panel',
    widgetCode: 'ALERTS_PANEL',
    widgetType: 'TABLE',
    dataSource: 'COMBINED',
    defaultColSpan: 12,
    defaultRowSpan: 2,
    displayOrder: 13,
    position: 13,
    description: 'Active alerts and notifications',
    ...DEFAULT_WIDGET_FIELDS,
  },
];
