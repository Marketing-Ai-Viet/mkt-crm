/**
 * Enterprise RBAC Core Constants
 *
 * Single Source of Truth for all RBAC constants
 */

// ============================================================================
// RESOURCES
// ============================================================================

/**
 * Resource Keys - Canonical keys used across the system
 * Format: UPPER_CASE, singular form
 */
export const RBAC_RESOURCE_KEY = {
  // Core Business Entities
  CUSTOMER: 'CUSTOMER',
  ORDER: 'ORDER',
  ORDER_ITEM: 'ORDER_ITEM',
  INVOICE: 'INVOICE',
  LICENSE: 'LICENSE',
  PAYMENT: 'PAYMENT',
  PRODUCT: 'PRODUCT',
  PRODUCT_VARIANT: 'PRODUCT_VARIANT',
  COMBO: 'COMBO',
  CONTRACT: 'CONTRACT',

  // Organization Entities
  DEPARTMENT: 'DEPARTMENT',
  ORGANIZATION_LEVEL: 'ORGANIZATION_LEVEL',
  WORKSPACE_MEMBER: 'WORKSPACE_MEMBER',
  RESELLER: 'RESELLER',

  // RBAC Entities
  PERMISSION_TEMPLATE: 'PERMISSION_TEMPLATE',
  USER_TEMPLATE: 'USER_TEMPLATE',
  TEMPORARY_PERMISSION: 'TEMPORARY_PERMISSION',
  DATA_ACCESS_POLICY: 'DATA_ACCESS_POLICY',
  PERMISSION_AUDIT: 'PERMISSION_AUDIT',

  // KPI Entities
  KPI: 'KPI',
  KPI_TEMPLATE: 'KPI_TEMPLATE',

  // Financial/Sensitive
  SALARY: 'SALARY',
  FINANCIAL_DATA: 'FINANCIAL_DATA',
  BUDGET: 'BUDGET',
  TRANSACTION: 'TRANSACTION',

  // Reporting
  REPORT: 'REPORT',
  ANALYTICS: 'ANALYTICS',
  PERFORMANCE_REVIEW: 'PERFORMANCE_REVIEW',

  // System
  SYSTEM_CONFIG: 'SYSTEM_CONFIG',
  AUDIT_LOG: 'AUDIT_LOG',
  WORKFLOW: 'WORKFLOW',
  INTEGRATION: 'INTEGRATION',
  SETTING: 'SETTING',
  CONFIDENTIAL_INFO: 'CONFIDENTIAL_INFO',

  // Communication
  EMAIL: 'EMAIL',
  TEMPLATE: 'TEMPLATE',

  // Special System Resources
  RBAC_POLICY: 'RBAC_POLICY',
  TEAM_MANAGEMENT: 'TEAM_MANAGEMENT',

  // Resource Groups (for hierarchical policies)
  BUSINESS_DATA: 'BUSINESS_DATA',
  SENSITIVE_DATA: 'SENSITIVE_DATA',
  ORGANIZATION_DATA: 'ORGANIZATION_DATA',

  // Wildcard
  ALL: '*',
} as const;

export type RbacResourceKey =
  (typeof RBAC_RESOURCE_KEY)[keyof typeof RBAC_RESOURCE_KEY];

/**
 * Resource Entity Name Mapping
 * Maps resource keys to actual entity names in the database
 */
/**
 * Union type of all entity names used in RESOURCE_ENTITY_MAP.
 * Must be kept in sync when adding new resource mappings.
 */
export type ResourceEntityName =
  | 'mktCustomer'
  | 'mktOrder'
  | 'mktOrderItem'
  | 'mktInvoice'
  | 'mktLicense'
  | 'mktPayment'
  | 'mktProduct'
  | 'mktProductVariant'
  | 'mktCombo'
  | 'mktContract'
  | 'mktDepartment'
  | 'mktOrganizationLevel'
  | 'workspaceMember'
  | 'mktReseller'
  | 'mktPermissionTemplate'
  | 'mktUserPermissionTemplate'
  | 'mktTemporaryPermission'
  | 'mktDataAccessPolicy'
  | 'mktPermissionAudit'
  | 'mktKpi'
  | 'mktKpiTemplate'
  | 'auditLog'
  | 'systemConfig';

export const RESOURCE_ENTITY_MAP: Record<string, ResourceEntityName> = {
  [RBAC_RESOURCE_KEY.CUSTOMER]: 'mktCustomer',
  [RBAC_RESOURCE_KEY.ORDER]: 'mktOrder',
  [RBAC_RESOURCE_KEY.ORDER_ITEM]: 'mktOrderItem',
  [RBAC_RESOURCE_KEY.INVOICE]: 'mktInvoice',
  [RBAC_RESOURCE_KEY.LICENSE]: 'mktLicense',
  [RBAC_RESOURCE_KEY.PAYMENT]: 'mktPayment',
  [RBAC_RESOURCE_KEY.PRODUCT]: 'mktProduct',
  [RBAC_RESOURCE_KEY.PRODUCT_VARIANT]: 'mktProductVariant',
  [RBAC_RESOURCE_KEY.COMBO]: 'mktCombo',
  [RBAC_RESOURCE_KEY.CONTRACT]: 'mktContract',
  [RBAC_RESOURCE_KEY.DEPARTMENT]: 'mktDepartment',
  [RBAC_RESOURCE_KEY.ORGANIZATION_LEVEL]: 'mktOrganizationLevel',
  [RBAC_RESOURCE_KEY.WORKSPACE_MEMBER]: 'workspaceMember',
  [RBAC_RESOURCE_KEY.RESELLER]: 'mktReseller',
  [RBAC_RESOURCE_KEY.PERMISSION_TEMPLATE]: 'mktPermissionTemplate',
  [RBAC_RESOURCE_KEY.USER_TEMPLATE]: 'mktUserPermissionTemplate',
  [RBAC_RESOURCE_KEY.TEMPORARY_PERMISSION]: 'mktTemporaryPermission',
  [RBAC_RESOURCE_KEY.DATA_ACCESS_POLICY]: 'mktDataAccessPolicy',
  [RBAC_RESOURCE_KEY.PERMISSION_AUDIT]: 'mktPermissionAudit',
  [RBAC_RESOURCE_KEY.KPI]: 'mktKpi',
  [RBAC_RESOURCE_KEY.KPI_TEMPLATE]: 'mktKpiTemplate',
  [RBAC_RESOURCE_KEY.AUDIT_LOG]: 'auditLog',
  [RBAC_RESOURCE_KEY.SYSTEM_CONFIG]: 'systemConfig',
};

/**
 * Reverse mapping: Entity name to Resource key
 */
export const ENTITY_RESOURCE_MAP: Record<string, string> = Object.entries(
  RESOURCE_ENTITY_MAP,
).reduce(
  (acc, [key, value]) => {
    acc[value] = key;

    return acc;
  },
  {} as Record<string, string>,
);

// ============================================================================
// OWNERSHIP FIELD CONFIGURATION
// ============================================================================

/**
 * Default ownership field for row-level security filtering
 * Most mkt-core entities use 'createdById' to track record ownership
 */
export const DEFAULT_OWNERSHIP_FIELD = 'createdById' as const;

/**
 * Resource-specific ownership field overrides
 * Use this when a resource uses a different field for ownership
 */
export const RESOURCE_OWNERSHIP_FIELD: Record<string, string> = {
  // Default for most resources is 'createdById'
  // Add overrides here if needed, e.g.:
  // 'workspaceMember': 'id',
  // 'auditLog': 'userId',
};

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Action Keys - Canonical action identifiers
 * Format: UPPER_CASE
 */
export const RBAC_ACTION = {
  // CRUD Operations
  READ: 'READ',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',

  // List Operations
  LIST: 'LIST',
  SEARCH: 'SEARCH',

  // Data Operations
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  DOWNLOAD: 'DOWNLOAD',
  UPLOAD: 'UPLOAD',

  // Workflow Operations
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  SUBMIT: 'SUBMIT',
  CANCEL: 'CANCEL',
  PROCESS: 'PROCESS',

  // Admin Operations
  MANAGE: 'MANAGE',
  ASSIGN: 'ASSIGN',
  CONFIGURE: 'CONFIGURE',

  // Record Management
  SHARE: 'SHARE',
  PUBLISH: 'PUBLISH',
  ARCHIVE: 'ARCHIVE',
  RESTORE: 'RESTORE',

  // Special Operations
  VIEW_SENSITIVE: 'VIEW_SENSITIVE',
  AUDIT: 'AUDIT',
  SYNC: 'SYNC',
  ESCALATE: 'ESCALATE',
  MONITOR: 'MONITOR',

  // Wildcard
  ALL: '*',
} as const;

export type RbacAction = (typeof RBAC_ACTION)[keyof typeof RBAC_ACTION];

/**
 * Action Groups - Logical groupings of actions
 */
export const RBAC_ACTION_GROUP = {
  READ_ONLY: [RBAC_ACTION.READ, RBAC_ACTION.LIST, RBAC_ACTION.SEARCH] as const,
  CRUD: [
    RBAC_ACTION.READ,
    RBAC_ACTION.CREATE,
    RBAC_ACTION.UPDATE,
    RBAC_ACTION.DELETE,
  ] as const,
  DATA_TRANSFER: [
    RBAC_ACTION.EXPORT,
    RBAC_ACTION.IMPORT,
    RBAC_ACTION.DOWNLOAD,
    RBAC_ACTION.UPLOAD,
  ] as const,
  WORKFLOW: [
    RBAC_ACTION.APPROVE,
    RBAC_ACTION.REJECT,
    RBAC_ACTION.SUBMIT,
    RBAC_ACTION.CANCEL,
    RBAC_ACTION.PROCESS,
  ] as const,
  ADMIN: [
    RBAC_ACTION.MANAGE,
    RBAC_ACTION.ASSIGN,
    RBAC_ACTION.CONFIGURE,
  ] as const,
} as const;

// ============================================================================
// RESOURCE GROUPS
// ============================================================================

/**
 * Resource Group Definitions
 * Defines which resources belong to which groups
 */
export const RBAC_RESOURCE_GROUP = {
  [RBAC_RESOURCE_KEY.BUSINESS_DATA]: [
    RBAC_RESOURCE_KEY.CUSTOMER,
    RBAC_RESOURCE_KEY.ORDER,
    RBAC_RESOURCE_KEY.ORDER_ITEM,
    RBAC_RESOURCE_KEY.INVOICE,
    RBAC_RESOURCE_KEY.LICENSE,
    RBAC_RESOURCE_KEY.PAYMENT,
  ] as const,
  [RBAC_RESOURCE_KEY.FINANCIAL_DATA]: [
    RBAC_RESOURCE_KEY.INVOICE,
    RBAC_RESOURCE_KEY.PAYMENT,
    RBAC_RESOURCE_KEY.SALARY,
    RBAC_RESOURCE_KEY.BUDGET,
    RBAC_RESOURCE_KEY.TRANSACTION,
  ] as const,
  [RBAC_RESOURCE_KEY.SENSITIVE_DATA]: [
    RBAC_RESOURCE_KEY.PAYMENT,
    RBAC_RESOURCE_KEY.PERMISSION_TEMPLATE,
    RBAC_RESOURCE_KEY.AUDIT_LOG,
    RBAC_RESOURCE_KEY.SALARY,
    RBAC_RESOURCE_KEY.CONFIDENTIAL_INFO,
  ] as const,
  [RBAC_RESOURCE_KEY.ORGANIZATION_DATA]: [
    RBAC_RESOURCE_KEY.DEPARTMENT,
    RBAC_RESOURCE_KEY.ORGANIZATION_LEVEL,
    RBAC_RESOURCE_KEY.WORKSPACE_MEMBER,
  ] as const,
} as const;

// ============================================================================
// PERMISSION ENUMS
// ============================================================================

/**
 * Permission Source - Where the permission originates from
 */
export enum PermissionSource {
  ROLE = 'ROLE',
  USER = 'USER',
  WORKSPACE = 'WORKSPACE',
  SYSTEM = 'SYSTEM',
  PERMISSION_TEMPLATE = 'PERMISSION_TEMPLATE',
  HIERARCHY_INHERITANCE = 'HIERARCHY_INHERITANCE',
  DEPARTMENT_POLICY = 'DEPARTMENT_POLICY',
  SPECIAL_OVERRIDE = 'SPECIAL_OVERRIDE',
  DYNAMIC_CONDITION = 'DYNAMIC_CONDITION',
  EMERGENCY_ACCESS = 'EMERGENCY_ACCESS',
  TEMPORARY_ELEVATION = 'TEMPORARY_ELEVATION',
}

/**
 * Check Result - Result of permission check
 */
export enum CheckResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  SKIP = 'SKIP',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * GraphQL Operation Type
 */
export enum GraphQLOperationType {
  QUERY = 'QUERY',
  MUTATION = 'MUTATION',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

/**
 * Validation Steps for permission checking pipeline
 */
export const VALIDATION_STEPS = {
  PRE_VALIDATION: 'PRE_VALIDATION',
  USER_CONTEXT_RESOLUTION: 'USER_CONTEXT_RESOLUTION',
  RESOURCE_IDENTIFICATION: 'RESOURCE_IDENTIFICATION',
  PERMISSION_TEMPLATE_CHECK: 'PERMISSION_TEMPLATE_CHECK',
  ACTION_PERMISSION_VALIDATION: 'ACTION_PERMISSION_VALIDATION',
  RESOURCE_PERMISSION_CHECK: 'RESOURCE_PERMISSION_CHECK',
  HIERARCHY_VALIDATION: 'HIERARCHY_VALIDATION',
  DATA_ACCESS_POLICY_CHECK: 'DATA_ACCESS_POLICY_CHECK',
  SPECIAL_PERMISSIONS: 'SPECIAL_PERMISSIONS',
  SENSITIVE_DATA_CHECKS: 'SENSITIVE_DATA_CHECKS',
  DEPARTMENT_RESTRICTIONS: 'DEPARTMENT_RESTRICTIONS',
  DYNAMIC_CONDITIONS: 'DYNAMIC_CONDITIONS',
  CACHE_PERFORMANCE: 'CACHE_PERFORMANCE',
  AUDIT_LOGGING: 'AUDIT_LOGGING',
  FINAL_DECISION: 'FINAL_DECISION',
} as const;

export type ValidationStep = keyof typeof VALIDATION_STEPS;
