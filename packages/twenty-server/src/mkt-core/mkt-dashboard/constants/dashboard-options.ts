import { FieldMetadataComplexOption } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export const MKT_DASHBOARD_WIDGET_TYPE_OPTIONS: FieldMetadataComplexOption[] = [
  { value: 'STAT_CARD', label: 'Stat Card', color: 'blue', position: 0 },
  { value: 'LINE_CHART', label: 'Line Chart', color: 'green', position: 1 },
  { value: 'BAR_CHART', label: 'Bar Chart', color: 'purple', position: 2 },
  { value: 'PIE_CHART', label: 'Pie Chart', color: 'orange', position: 3 },
  { value: 'TABLE', label: 'Data Table', color: 'gray', position: 4 },
  {
    value: 'KPI_SCORECARD',
    label: 'KPI Scorecard',
    color: 'red',
    position: 5,
  },
  {
    value: 'LEADERBOARD',
    label: 'Leaderboard',
    color: 'yellow',
    position: 6,
  },
  {
    value: 'TREND_CHART',
    label: 'Trend Chart',
    color: 'turquoise',
    position: 7,
  },
];

export const MKT_DASHBOARD_DATA_SOURCE_OPTIONS: FieldMetadataComplexOption[] = [
  { value: 'REVENUE', label: 'Revenue', color: 'green', position: 0 },
  { value: 'ORDERS', label: 'Orders', color: 'blue', position: 1 },
  { value: 'CUSTOMERS', label: 'Customers', color: 'purple', position: 2 },
  { value: 'PAYMENTS', label: 'Payments', color: 'orange', position: 3 },
  { value: 'KPIS', label: 'KPIs', color: 'red', position: 4 },
  { value: 'CONTRACTS', label: 'Contracts', color: 'gray', position: 5 },
  { value: 'COMBINED', label: 'Combined', color: 'turquoise', position: 6 },
];

export const MKT_DASHBOARD_PERIOD_OPTIONS: FieldMetadataComplexOption[] = [
  { value: 'TODAY', label: 'Today', color: 'blue', position: 0 },
  { value: 'THIS_WEEK', label: 'This Week', color: 'green', position: 1 },
  { value: 'THIS_MONTH', label: 'This Month', color: 'purple', position: 2 },
  {
    value: 'THIS_QUARTER',
    label: 'This Quarter',
    color: 'orange',
    position: 3,
  },
  { value: 'THIS_YEAR', label: 'This Year', color: 'red', position: 4 },
  { value: 'CUSTOM', label: 'Custom Range', color: 'gray', position: 5 },
];

export const MKT_DASHBOARD_VISIBILITY_OPTIONS: FieldMetadataComplexOption[] = [
  { value: 'ALL', label: 'All Employees', color: 'green', position: 0 },
  { value: 'ROLE_BASED', label: 'Role Based', color: 'blue', position: 1 },
  { value: 'PERSONAL', label: 'Personal Only', color: 'gray', position: 2 },
];

export const MKT_DASHBOARD_SNAPSHOT_TYPE_OPTIONS: FieldMetadataComplexOption[] =
  [
    { value: 'DAILY', label: 'Daily', color: 'green', position: 0 },
    { value: 'WEEKLY', label: 'Weekly', color: 'blue', position: 1 },
    { value: 'MONTHLY', label: 'Monthly', color: 'purple', position: 2 },
    { value: 'QUARTERLY', label: 'Quarterly', color: 'orange', position: 3 },
    { value: 'ON_DEMAND', label: 'On Demand', color: 'gray', position: 4 },
  ];

export const MKT_DASHBOARD_LAYOUT_TYPE_OPTIONS: FieldMetadataComplexOption[] = [
  { value: 'PERSONAL', label: 'Personal', color: 'blue', position: 0 },
  { value: 'ROLE_BASED', label: 'Role Based', color: 'green', position: 1 },
  {
    value: 'SYSTEM_DEFAULT',
    label: 'System Default',
    color: 'purple',
    position: 2,
  },
];
