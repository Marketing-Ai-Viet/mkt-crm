import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

// Permission Resource Categories
export enum PERMISSION_RESOURCE_CATEGORY {
  BUSINESS_DATA = 'BUSINESS_DATA',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  USER_MGMT = 'USER_MGMT',
  FINANCIAL = 'FINANCIAL',
  REPORTING = 'REPORTING',
}

export const PERMISSION_RESOURCE_CATEGORY_OPTIONS = [
  {
    value: PERMISSION_RESOURCE_CATEGORY.BUSINESS_DATA,
    label: 'Business Data',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: PERMISSION_RESOURCE_CATEGORY.SYSTEM_CONFIG,
    label: 'System Configuration',
    color: 'gray' as TagColor,
    position: 1,
  },
  {
    value: PERMISSION_RESOURCE_CATEGORY.USER_MGMT,
    label: 'User Management',
    color: 'green' as TagColor,
    position: 2,
  },
  {
    value: PERMISSION_RESOURCE_CATEGORY.FINANCIAL,
    label: 'Financial Data',
    color: 'orange' as TagColor,
    position: 3,
  },
  {
    value: PERMISSION_RESOURCE_CATEGORY.REPORTING,
    label: 'Reporting',
    color: 'purple' as TagColor,
    position: 4,
  },
];

// Permission Action Categories (expanded for 11-level hierarchy)
export enum PERMISSION_ACTION_CATEGORY {
  BASIC_CRUD = 'BASIC_CRUD',
  ADVANCED = 'ADVANCED',
  SYSTEM = 'SYSTEM',
  APPROVAL = 'APPROVAL',
  BULK_OPERATIONS = 'BULK_OPERATIONS',
  CONFIGURATION = 'CONFIGURATION',
  TEAM_MANAGEMENT = 'TEAM_MANAGEMENT',
  FINANCIAL = 'FINANCIAL',
}

export const PERMISSION_ACTION_CATEGORY_OPTIONS = [
  {
    value: PERMISSION_ACTION_CATEGORY.BASIC_CRUD,
    label: 'Basic CRUD',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.ADVANCED,
    label: 'Advanced Operations',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.SYSTEM,
    label: 'System Operations',
    color: 'gray' as TagColor,
    position: 2,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.APPROVAL,
    label: 'Approval Actions',
    color: 'yellow' as TagColor,
    position: 3,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.BULK_OPERATIONS,
    label: 'Bulk Operations',
    color: 'orange' as TagColor,
    position: 4,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.CONFIGURATION,
    label: 'Configuration',
    color: 'red' as TagColor,
    position: 5,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.TEAM_MANAGEMENT,
    label: 'Team Management',
    color: 'teal' as TagColor,
    position: 6,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.FINANCIAL,
    label: 'Financial Operations',
    color: 'purple' as TagColor,
    position: 7,
  },
];

// Permission Risk Levels
export enum PERMISSION_RISK_LEVEL {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const PERMISSION_RISK_LEVEL_OPTIONS = [
  {
    value: PERMISSION_RISK_LEVEL.LOW,
    label: 'Low Risk',
    color: 'green' as TagColor,
    position: 0,
  },
  {
    value: PERMISSION_RISK_LEVEL.MEDIUM,
    label: 'Medium Risk',
    color: 'yellow' as TagColor,
    position: 1,
  },
  {
    value: PERMISSION_RISK_LEVEL.HIGH,
    label: 'High Risk',
    color: 'orange' as TagColor,
    position: 2,
  },
  {
    value: PERMISSION_RISK_LEVEL.CRITICAL,
    label: 'Critical Risk',
    color: 'red' as TagColor,
    position: 3,
  },
];

// Template Created By Source
export enum TEMPLATE_CREATED_BY_SOURCE {
  SYSTEM = 'SYSTEM',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export const TEMPLATE_CREATED_BY_SOURCE_OPTIONS = [
  {
    value: TEMPLATE_CREATED_BY_SOURCE.SYSTEM,
    label: 'System',
    color: 'gray' as TagColor,
    position: 0,
  },
  {
    value: TEMPLATE_CREATED_BY_SOURCE.ADMIN,
    label: 'Admin',
    color: 'blue' as TagColor,
    position: 1,
  },
  {
    value: TEMPLATE_CREATED_BY_SOURCE.USER,
    label: 'User',
    color: 'green' as TagColor,
    position: 2,
  },
];

// System Action Keys
export enum SYSTEM_ACTION_KEY {
  DATA_EXPORT = 'DATA_EXPORT',
  BULK_OPERATIONS = 'BULK_OPERATIONS',
  ADMIN_FUNCTIONS = 'ADMIN_FUNCTIONS',
  CROSS_DEPARTMENT_VIEW = 'CROSS_DEPARTMENT_VIEW',
  ESCALATION_APPROVE = 'ESCALATION_APPROVE',
  BUDGET_APPROVE = 'BUDGET_APPROVE',
  SYSTEM_CONFIGURATION = 'SYSTEM_CONFIGURATION',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
}

export const SYSTEM_ACTION_KEY_OPTIONS = [
  {
    value: SYSTEM_ACTION_KEY.DATA_EXPORT,
    label: 'Data Export',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: SYSTEM_ACTION_KEY.BULK_OPERATIONS,
    label: 'Bulk Operations',
    color: 'orange' as TagColor,
    position: 1,
  },
  {
    value: SYSTEM_ACTION_KEY.ADMIN_FUNCTIONS,
    label: 'Admin Functions',
    color: 'red' as TagColor,
    position: 2,
  },
  {
    value: SYSTEM_ACTION_KEY.CROSS_DEPARTMENT_VIEW,
    label: 'Cross Department View',
    color: 'purple' as TagColor,
    position: 3,
  },
  {
    value: SYSTEM_ACTION_KEY.ESCALATION_APPROVE,
    label: 'Escalation Approval',
    color: 'yellow' as TagColor,
    position: 4,
  },
  {
    value: SYSTEM_ACTION_KEY.BUDGET_APPROVE,
    label: 'Budget Approval',
    color: 'green' as TagColor,
    position: 5,
  },
  {
    value: SYSTEM_ACTION_KEY.SYSTEM_CONFIGURATION,
    label: 'System Configuration',
    color: 'gray' as TagColor,
    position: 6,
  },
  {
    value: SYSTEM_ACTION_KEY.USER_MANAGEMENT,
    label: 'User Management',
    color: 'blue' as TagColor,
    position: 7,
  },
];

// Access Limitation Types
export enum ACCESS_LIMITATION_TYPE {
  TEMPORAL = 'TEMPORAL',
  DATA_ACCESS = 'DATA_ACCESS',
  OPERATIONAL = 'OPERATIONAL',
  FUNCTIONAL = 'FUNCTIONAL',
}

export const ACCESS_LIMITATION_TYPE_OPTIONS = [
  {
    value: ACCESS_LIMITATION_TYPE.TEMPORAL,
    label: 'Time-based Limitations',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: ACCESS_LIMITATION_TYPE.DATA_ACCESS,
    label: 'Data Access Limitations',
    color: 'orange' as TagColor,
    position: 1,
  },
  {
    value: ACCESS_LIMITATION_TYPE.OPERATIONAL,
    label: 'Operational Limitations',
    color: 'purple' as TagColor,
    position: 2,
  },
  {
    value: ACCESS_LIMITATION_TYPE.FUNCTIONAL,
    label: 'Functional Limitations',
    color: 'green' as TagColor,
    position: 3,
  },
];

// Limitation Severity
export enum LIMITATION_SEVERITY {
  INFO = 'INFO',
  WARNING = 'WARNING',
  BLOCKING = 'BLOCKING',
}

export const LIMITATION_SEVERITY_OPTIONS = [
  {
    value: LIMITATION_SEVERITY.INFO,
    label: 'Informational',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: LIMITATION_SEVERITY.WARNING,
    label: 'Warning',
    color: 'yellow' as TagColor,
    position: 1,
  },
  {
    value: LIMITATION_SEVERITY.BLOCKING,
    label: 'Blocking',
    color: 'red' as TagColor,
    position: 2,
  },
];
