/**
 * RBAC Resource identifiers cho Casbin
 *
 * Format: {entity} hoặc {entity}:{id} cho specific resource
 * Sử dụng trong policy definitions và permission checks
 */
export const CASBIN_RESOURCES = {
  // ===== Business Entities =====
  MKT_CUSTOMER: 'mktCustomer',
  MKT_ORDER: 'mktOrder',
  MKT_ORDER_ITEM: 'mktOrderItem',
  MKT_INVOICE: 'mktInvoice',
  MKT_LICENSE: 'mktLicense',
  MKT_PAYMENT: 'mktPayment',
  MKT_PRODUCT: 'mktProduct',
  MKT_PRODUCT_VARIANT: 'mktProductVariant',
  MKT_COMBO: 'mktCombo',

  // ===== Organization Entities =====
  MKT_DEPARTMENT: 'mktDepartment',
  MKT_ORGANIZATION_LEVEL: 'mktOrganizationLevel',
  MKT_RESELLER: 'mktReseller',

  // ===== User Management =====
  WORKSPACE_MEMBER: 'workspaceMember',
  MKT_PERMISSION_TEMPLATE: 'mktPermissionTemplate',
  MKT_USER_TEMPLATE: 'mktUserTemplate',
  MKT_TEMPORARY_PERMISSION: 'mktTemporaryPermission',

  // ===== KPI =====
  MKT_KPI: 'mktKpi',
  MKT_KPI_TEMPLATE: 'mktKpiTemplate',

  // ===== System Resources =====
  RBAC_POLICY: 'rbac-seeder:policy',
  AUDIT_LOG: 'auditLog',
  SYSTEM_CONFIG: 'systemConfig',

  // ===== Resource Groupings (cho g2 policies) =====
  MKT_BUSINESS_DATA: 'mktBusinessData',
  MKT_SENSITIVE_DATA: 'mktSensitiveData',
  MKT_FINANCIAL_DATA: 'mktFinancialData',
  MKT_ORGANIZATION_DATA: 'mktOrganizationData',

  // ===== Wildcard =====
  ALL: '*',
} as const;

export type CasbinResource =
  (typeof CASBIN_RESOURCES)[keyof typeof CASBIN_RESOURCES];

/**
 * Resource groupings cho Casbin g2 policies
 * Định nghĩa hierarchy của resources
 */
export const CASBIN_RESOURCE_GROUPS = {
  // Business data group
  [CASBIN_RESOURCES.MKT_BUSINESS_DATA]: [
    CASBIN_RESOURCES.MKT_CUSTOMER,
    CASBIN_RESOURCES.MKT_ORDER,
    CASBIN_RESOURCES.MKT_ORDER_ITEM,
    CASBIN_RESOURCES.MKT_INVOICE,
    CASBIN_RESOURCES.MKT_LICENSE,
    CASBIN_RESOURCES.MKT_PAYMENT,
  ],

  // Financial data group
  [CASBIN_RESOURCES.MKT_FINANCIAL_DATA]: [
    CASBIN_RESOURCES.MKT_INVOICE,
    CASBIN_RESOURCES.MKT_PAYMENT,
  ],

  // Sensitive data group
  [CASBIN_RESOURCES.MKT_SENSITIVE_DATA]: [
    CASBIN_RESOURCES.MKT_PAYMENT,
    CASBIN_RESOURCES.MKT_PERMISSION_TEMPLATE,
    CASBIN_RESOURCES.AUDIT_LOG,
  ],

  // Organization data group
  [CASBIN_RESOURCES.MKT_ORGANIZATION_DATA]: [
    CASBIN_RESOURCES.MKT_DEPARTMENT,
    CASBIN_RESOURCES.MKT_ORGANIZATION_LEVEL,
    CASBIN_RESOURCES.WORKSPACE_MEMBER,
  ],
} as const;
