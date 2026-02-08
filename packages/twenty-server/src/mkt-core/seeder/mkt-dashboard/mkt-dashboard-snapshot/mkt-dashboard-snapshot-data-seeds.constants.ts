import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/mkt-dashboard/mkt-dashboard-widget/mkt-dashboard-widget-data-seeds.constants';

// ============================================
// SEED DATA TYPE
// ============================================

type MktDashboardSnapshotDataSeed = {
  id: string;
  name: string;
  snapshotType: string;
  dataSource: string;
  snapshotAt: Date;
  periodStart: string | null;
  periodEnd: string | null;
  snapshotData: string;
  comparisonData: string | null;
  checksum: string;
  position: number;
  widgetId: string;
};

// prettier-ignore
export const MKT_DASHBOARD_SNAPSHOT_DATA_SEED_COLUMNS: (keyof MktDashboardSnapshotDataSeed)[] = [
  'id',
  'name',
  'snapshotType',
  'dataSource',
  'snapshotAt',
  'periodStart',
  'periodEnd',
  'snapshotData',
  'comparisonData',
  'checksum',
  'position',
  'widgetId',
];

export const MKT_DASHBOARD_SNAPSHOT_DATA_SEEDS_IDS = {
  DAILY_SNAPSHOT: 'c3d4e5f6-0001-4000-8000-000000000001',
  WEEKLY_SNAPSHOT: 'c3d4e5f6-0002-4000-8000-000000000002',
  MONTHLY_SNAPSHOT: 'c3d4e5f6-0003-4000-8000-000000000003',
};

const NOW = DateTimeUtils.now();
const YESTERDAY = DateTimeUtils.subtract(NOW, { days: 1 });
const LAST_WEEK = DateTimeUtils.subtract(NOW, { weeks: 1 });
const LAST_MONTH = DateTimeUtils.subtract(NOW, { months: 1 });

const DAILY_SNAPSHOT_DATA = {
  totalRevenue: 15200000,
  totalOrders: 12,
  newCustomers: 3,
  collectionRate: 87.5,
};

const WEEKLY_SNAPSHOT_DATA = {
  totalRevenue: 98500000,
  totalOrders: 67,
  newCustomers: 15,
  collectionRate: 91.2,
  topProduct: 'MKT Care Package',
};

const MONTHLY_SNAPSHOT_DATA = {
  totalRevenue: 425000000,
  totalOrders: 284,
  newCustomers: 52,
  collectionRate: 93.8,
  topProduct: 'MKT Enterprise Suite',
  churnRate: 2.1,
};

export const MKT_DASHBOARD_SNAPSHOT_DATA_SEEDS: MktDashboardSnapshotDataSeed[] =
  [
    {
      id: MKT_DASHBOARD_SNAPSHOT_DATA_SEEDS_IDS.DAILY_SNAPSHOT,
      name: 'Daily Revenue Snapshot',
      snapshotType: 'DAILY',
      dataSource: 'COMBINED',
      snapshotAt: DateTimeUtils.toDate(YESTERDAY) ?? new Date(),
      periodStart: DateTimeUtils.toISO(
        DateTimeUtils.subtract(YESTERDAY, { days: 1 }),
      ),
      periodEnd: DateTimeUtils.toISO(YESTERDAY),
      snapshotData: safeJsonStringify(DAILY_SNAPSHOT_DATA) ?? '{}',
      comparisonData: null,
      checksum: 'a1b2c3d4e5f6a7b8',
      position: 0,
      widgetId: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.TOTAL_REVENUE,
    },
    {
      id: MKT_DASHBOARD_SNAPSHOT_DATA_SEEDS_IDS.WEEKLY_SNAPSHOT,
      name: 'Weekly Orders Snapshot',
      snapshotType: 'WEEKLY',
      dataSource: 'COMBINED',
      snapshotAt: DateTimeUtils.toDate(LAST_WEEK) ?? new Date(),
      periodStart: DateTimeUtils.toISO(
        DateTimeUtils.subtract(LAST_WEEK, { weeks: 1 }),
      ),
      periodEnd: DateTimeUtils.toISO(LAST_WEEK),
      snapshotData: safeJsonStringify(WEEKLY_SNAPSHOT_DATA) ?? '{}',
      comparisonData: null,
      checksum: 'b2c3d4e5f6a7b8c9',
      position: 1,
      widgetId: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.TOTAL_ORDERS,
    },
    {
      id: MKT_DASHBOARD_SNAPSHOT_DATA_SEEDS_IDS.MONTHLY_SNAPSHOT,
      name: 'Monthly Customer Snapshot',
      snapshotType: 'MONTHLY',
      dataSource: 'COMBINED',
      snapshotAt: DateTimeUtils.toDate(LAST_MONTH) ?? new Date(),
      periodStart: DateTimeUtils.toISO(
        DateTimeUtils.subtract(LAST_MONTH, { months: 1 }),
      ),
      periodEnd: DateTimeUtils.toISO(LAST_MONTH),
      snapshotData: safeJsonStringify(MONTHLY_SNAPSHOT_DATA) ?? '{}',
      comparisonData: null,
      checksum: 'c3d4e5f6a7b8c9d0',
      position: 2,
      widgetId: MKT_DASHBOARD_WIDGET_DATA_SEEDS_IDS.TOTAL_CUSTOMERS,
    },
  ];
