import { safeJsonStringify } from 'src/mkt-core/utils/json.util';

// ============================================
// SEED DATA TYPE
// ============================================

type WidgetOrderItem = {
  widgetCode: string;
  gridCol: number;
  gridRow: number;
  colSpan: number;
  rowSpan: number;
  isVisible: boolean;
};

type MktDashboardLayoutDataSeed = {
  id: string;
  name: string;
  layoutType: string;
  widgetOrder: string;
  globalFilters: string | null;
  isDefault: boolean;
  isActive: boolean;
  position: number;
};

// prettier-ignore
export const MKT_DASHBOARD_LAYOUT_DATA_SEED_COLUMNS: (keyof MktDashboardLayoutDataSeed)[] = [
  'id',
  'name',
  'layoutType',
  'widgetOrder',
  'globalFilters',
  'isDefault',
  'isActive',
  'position',
];

export const MKT_DASHBOARD_LAYOUT_DATA_SEEDS_IDS = {
  SYSTEM_DEFAULT: 'b2c3d4e5-0001-4000-8000-000000000001',
};

// prettier-ignore
const DEFAULT_LAYOUT_WIDGET_ORDER: WidgetOrderItem[] = [
  { widgetCode: 'TOTAL_REVENUE',      gridCol: 1,  gridRow: 1,  colSpan: 3,  rowSpan: 1, isVisible: true },
  { widgetCode: 'TOTAL_ORDERS',       gridCol: 4,  gridRow: 1,  colSpan: 3,  rowSpan: 1, isVisible: true },
  { widgetCode: 'TOTAL_CUSTOMERS',    gridCol: 7,  gridRow: 1,  colSpan: 3,  rowSpan: 1, isVisible: true },
  { widgetCode: 'COLLECTION_RATE',    gridCol: 10, gridRow: 1,  colSpan: 3,  rowSpan: 1, isVisible: true },
  { widgetCode: 'REVENUE_TREND',      gridCol: 1,  gridRow: 2,  colSpan: 6,  rowSpan: 2, isVisible: true },
  { widgetCode: 'ORDER_STATUS_DIST',  gridCol: 7,  gridRow: 2,  colSpan: 6,  rowSpan: 2, isVisible: true },
  { widgetCode: 'CUSTOMER_TIER_DIST', gridCol: 1,  gridRow: 4,  colSpan: 6,  rowSpan: 2, isVisible: true },
  { widgetCode: 'CUSTOMER_GROWTH',    gridCol: 7,  gridRow: 4,  colSpan: 6,  rowSpan: 2, isVisible: true },
  { widgetCode: 'TOP_CUSTOMERS',      gridCol: 1,  gridRow: 6,  colSpan: 6,  rowSpan: 2, isVisible: true },
  { widgetCode: 'PAYMENT_STATUS',     gridCol: 7,  gridRow: 6,  colSpan: 6,  rowSpan: 2, isVisible: true },
  { widgetCode: 'KPI_SCORECARD',      gridCol: 1,  gridRow: 8,  colSpan: 12, rowSpan: 2, isVisible: true },
  { widgetCode: 'CONTRACT_SUMMARY',   gridCol: 1,  gridRow: 10, colSpan: 6,  rowSpan: 2, isVisible: true },
  { widgetCode: 'STAFF_LEADERBOARD',  gridCol: 7,  gridRow: 10, colSpan: 6,  rowSpan: 2, isVisible: true },
  { widgetCode: 'ALERTS_PANEL',       gridCol: 1,  gridRow: 12, colSpan: 12, rowSpan: 2, isVisible: true },
];

export const MKT_DASHBOARD_LAYOUT_DATA_SEEDS: MktDashboardLayoutDataSeed[] = [
  {
    id: MKT_DASHBOARD_LAYOUT_DATA_SEEDS_IDS.SYSTEM_DEFAULT,
    name: 'Default Dashboard',
    layoutType: 'SYSTEM_DEFAULT',
    widgetOrder: safeJsonStringify(DEFAULT_LAYOUT_WIDGET_ORDER) ?? '[]',
    globalFilters: null,
    isDefault: true,
    isActive: true,
    position: 0,
  },
];
