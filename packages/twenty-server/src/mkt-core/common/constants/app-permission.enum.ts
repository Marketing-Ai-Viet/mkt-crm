export enum AppPermission {
  // Common permissions
  // Full access to all features
  ADMIN = 'admin',
  // Read-only access to all features Report
  VIEW_REPORT_ALL = 'VIEW_REPORT:*',
  // Read-only access to all features dashboard
  VIEW_DASHBOARD_ALL = 'VIEW_DASHBOARD:*',
  VIEW_DASHBOARD_KPI = 'VIEW_DASHBOARD:KPI',
  VIEW_DASHBOARD_SALES = 'VIEW_DASHBOARD:SALES',
}
