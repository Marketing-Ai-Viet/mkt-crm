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

// Permission Action Categories (expanded for CRM-specific operations and Enterprise requirements)
export enum PERMISSION_ACTION_CATEGORY {
  // Core Operations
  BASIC_CRUD = 'BASIC_CRUD',
  ADVANCED = 'ADVANCED',
  SYSTEM = 'SYSTEM',
  APPROVAL = 'APPROVAL',
  BULK_OPERATIONS = 'BULK_OPERATIONS',
  CONFIGURATION = 'CONFIGURATION',
  TEAM_MANAGEMENT = 'TEAM_MANAGEMENT',
  FINANCIAL = 'FINANCIAL',

  // CRM-specific categories
  CUSTOMER_MANAGEMENT = 'CUSTOMER_MANAGEMENT',
  COMMUNICATION = 'COMMUNICATION',
  DEAL_MANAGEMENT = 'DEAL_MANAGEMENT',
  REPORTING = 'REPORTING',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  AUTOMATION = 'AUTOMATION',

  // Security & Compliance (Enterprise)
  SECURITY_OPERATIONS = 'SECURITY_OPERATIONS',
  AUDIT_OPERATIONS = 'AUDIT_OPERATIONS',
  COMPLIANCE_OPERATIONS = 'COMPLIANCE_OPERATIONS',
  DATA_GOVERNANCE = 'DATA_GOVERNANCE',
  PRIVACY_OPERATIONS = 'PRIVACY_OPERATIONS',

  // Integration & API Management (Enterprise)
  API_MANAGEMENT = 'API_MANAGEMENT',
  INTEGRATION_OPERATIONS = 'INTEGRATION_OPERATIONS',
  WEBHOOK_MANAGEMENT = 'WEBHOOK_MANAGEMENT',
  THIRD_PARTY_SERVICES = 'THIRD_PARTY_SERVICES',

  // Advanced Enterprise Features
  WORKFLOW_ORCHESTRATION = 'WORKFLOW_ORCHESTRATION',
  BUSINESS_INTELLIGENCE = 'BUSINESS_INTELLIGENCE',
  ANALYTICS_OPERATIONS = 'ANALYTICS_OPERATIONS',
  CUSTOM_DEVELOPMENT = 'CUSTOM_DEVELOPMENT',
  TENANT_MANAGEMENT = 'TENANT_MANAGEMENT',

  // Operational Excellence (Enterprise)
  MONITORING_OPERATIONS = 'MONITORING_OPERATIONS',
  BACKUP_RECOVERY = 'BACKUP_RECOVERY',
  PERFORMANCE_TUNING = 'PERFORMANCE_TUNING',
  CAPACITY_MANAGEMENT = 'CAPACITY_MANAGEMENT',

  // Data & Content Management (Enterprise)
  DATA_MIGRATION = 'DATA_MIGRATION',
  CONTENT_MANAGEMENT = 'CONTENT_MANAGEMENT',
  DOCUMENT_OPERATIONS = 'DOCUMENT_OPERATIONS',
  KNOWLEDGE_MANAGEMENT = 'KNOWLEDGE_MANAGEMENT',

  // Advanced CRM & Sales Operations (Enterprise)
  TERRITORY_MANAGEMENT = 'TERRITORY_MANAGEMENT',
  QUOTA_MANAGEMENT = 'QUOTA_MANAGEMENT',
  COMMISSION_OPERATIONS = 'COMMISSION_OPERATIONS',
  FORECAST_OPERATIONS = 'FORECAST_OPERATIONS',

  // Multi-level Approval Workflows (Enterprise)
  MULTI_LEVEL_APPROVAL = 'MULTI_LEVEL_APPROVAL',
  ESCALATION_MANAGEMENT = 'ESCALATION_MANAGEMENT',
  DELEGATION_OPERATIONS = 'DELEGATION_OPERATIONS',
}

export const PERMISSION_ACTION_CATEGORY_OPTIONS = [
  // Core Operations
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

  // CRM-specific categories
  {
    value: PERMISSION_ACTION_CATEGORY.CUSTOMER_MANAGEMENT,
    label: 'Customer Management',
    color: 'blue' as TagColor,
    position: 8,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.COMMUNICATION,
    label: 'Communication',
    color: 'green' as TagColor,
    position: 9,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.DEAL_MANAGEMENT,
    label: 'Deal Management',
    color: 'purple' as TagColor,
    position: 10,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.REPORTING,
    label: 'Reporting',
    color: 'teal' as TagColor,
    position: 11,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.USER_MANAGEMENT,
    label: 'User Management',
    color: 'gray' as TagColor,
    position: 12,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.AUTOMATION,
    label: 'Automation',
    color: 'orange' as TagColor,
    position: 13,
  },

  // Security & Compliance (Enterprise)
  {
    value: PERMISSION_ACTION_CATEGORY.SECURITY_OPERATIONS,
    label: 'Security Operations',
    color: 'red' as TagColor,
    position: 14,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.AUDIT_OPERATIONS,
    label: 'Audit Operations',
    color: 'yellow' as TagColor,
    position: 15,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.COMPLIANCE_OPERATIONS,
    label: 'Compliance Operations',
    color: 'red' as TagColor,
    position: 16,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.DATA_GOVERNANCE,
    label: 'Data Governance',
    color: 'blue' as TagColor,
    position: 17,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.PRIVACY_OPERATIONS,
    label: 'Privacy Operations',
    color: 'green' as TagColor,
    position: 18,
  },

  // Integration & API Management (Enterprise)
  {
    value: PERMISSION_ACTION_CATEGORY.API_MANAGEMENT,
    label: 'API Management',
    color: 'teal' as TagColor,
    position: 19,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.INTEGRATION_OPERATIONS,
    label: 'Integration Operations',
    color: 'purple' as TagColor,
    position: 20,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.WEBHOOK_MANAGEMENT,
    label: 'Webhook Management',
    color: 'orange' as TagColor,
    position: 21,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.THIRD_PARTY_SERVICES,
    label: 'Third Party Services',
    color: 'gray' as TagColor,
    position: 22,
  },

  // Advanced Enterprise Features
  {
    value: PERMISSION_ACTION_CATEGORY.WORKFLOW_ORCHESTRATION,
    label: 'Workflow Orchestration',
    color: 'yellow' as TagColor,
    position: 23,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.BUSINESS_INTELLIGENCE,
    label: 'Business Intelligence',
    color: 'blue' as TagColor,
    position: 24,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.ANALYTICS_OPERATIONS,
    label: 'Analytics Operations',
    color: 'green' as TagColor,
    position: 25,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.CUSTOM_DEVELOPMENT,
    label: 'Custom Development',
    color: 'red' as TagColor,
    position: 26,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.TENANT_MANAGEMENT,
    label: 'Tenant Management',
    color: 'purple' as TagColor,
    position: 27,
  },

  // Operational Excellence (Enterprise)
  {
    value: PERMISSION_ACTION_CATEGORY.MONITORING_OPERATIONS,
    label: 'Monitoring Operations',
    color: 'teal' as TagColor,
    position: 28,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.BACKUP_RECOVERY,
    label: 'Backup & Recovery',
    color: 'orange' as TagColor,
    position: 29,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.PERFORMANCE_TUNING,
    label: 'Performance Tuning',
    color: 'gray' as TagColor,
    position: 30,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.CAPACITY_MANAGEMENT,
    label: 'Capacity Management',
    color: 'yellow' as TagColor,
    position: 31,
  },

  // Data & Content Management (Enterprise)
  {
    value: PERMISSION_ACTION_CATEGORY.DATA_MIGRATION,
    label: 'Data Migration',
    color: 'blue' as TagColor,
    position: 32,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.CONTENT_MANAGEMENT,
    label: 'Content Management',
    color: 'green' as TagColor,
    position: 33,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.DOCUMENT_OPERATIONS,
    label: 'Document Operations',
    color: 'red' as TagColor,
    position: 34,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.KNOWLEDGE_MANAGEMENT,
    label: 'Knowledge Management',
    color: 'purple' as TagColor,
    position: 35,
  },

  // Advanced CRM & Sales Operations (Enterprise)
  {
    value: PERMISSION_ACTION_CATEGORY.TERRITORY_MANAGEMENT,
    label: 'Territory Management',
    color: 'teal' as TagColor,
    position: 36,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.QUOTA_MANAGEMENT,
    label: 'Quota Management',
    color: 'orange' as TagColor,
    position: 37,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.COMMISSION_OPERATIONS,
    label: 'Commission Operations',
    color: 'gray' as TagColor,
    position: 38,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.FORECAST_OPERATIONS,
    label: 'Forecast Operations',
    color: 'yellow' as TagColor,
    position: 39,
  },

  // Multi-level Approval Workflows (Enterprise)
  {
    value: PERMISSION_ACTION_CATEGORY.MULTI_LEVEL_APPROVAL,
    label: 'Multi-Level Approval',
    color: 'blue' as TagColor,
    position: 40,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.ESCALATION_MANAGEMENT,
    label: 'Escalation Management',
    color: 'green' as TagColor,
    position: 41,
  },
  {
    value: PERMISSION_ACTION_CATEGORY.DELEGATION_OPERATIONS,
    label: 'Delegation Operations',
    color: 'red' as TagColor,
    position: 42,
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

// Override Reason Types
export enum OVERRIDE_REASON {
  TEMPORARY_ESCALATION = 'TEMPORARY_ESCALATION',
  BUSINESS_EXCEPTION = 'BUSINESS_EXCEPTION',
  EMERGENCY_ACCESS = 'EMERGENCY_ACCESS',
  SPECIAL_PROJECT = 'SPECIAL_PROJECT',
  AUDIT_REQUIREMENT = 'AUDIT_REQUIREMENT',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  COMPLIANCE_REQUIREMENT = 'COMPLIANCE_REQUIREMENT',
}

export const OVERRIDE_REASON_OPTIONS = [
  {
    value: OVERRIDE_REASON.TEMPORARY_ESCALATION,
    label: 'Temporary Escalation',
    color: 'yellow' as TagColor,
    position: 0,
  },
  {
    value: OVERRIDE_REASON.BUSINESS_EXCEPTION,
    label: 'Business Exception',
    color: 'orange' as TagColor,
    position: 1,
  },
  {
    value: OVERRIDE_REASON.EMERGENCY_ACCESS,
    label: 'Emergency Access',
    color: 'red' as TagColor,
    position: 2,
  },
  {
    value: OVERRIDE_REASON.SPECIAL_PROJECT,
    label: 'Special Project',
    color: 'purple' as TagColor,
    position: 3,
  },
  {
    value: OVERRIDE_REASON.AUDIT_REQUIREMENT,
    label: 'Audit Requirement',
    color: 'blue' as TagColor,
    position: 4,
  },
  {
    value: OVERRIDE_REASON.SYSTEM_MAINTENANCE,
    label: 'System Maintenance',
    color: 'gray' as TagColor,
    position: 5,
  },
  {
    value: OVERRIDE_REASON.COMPLIANCE_REQUIREMENT,
    label: 'Compliance Requirement',
    color: 'green' as TagColor,
    position: 6,
  },
];

// Permission Context Types
export enum CONTEXT_TYPE {
  OWN_RECORDS = 'OWN_RECORDS',
  DEPARTMENT_RECORDS = 'DEPARTMENT_RECORDS',
  TEAM_RECORDS = 'TEAM_RECORDS',
  ALL_RECORDS = 'ALL_RECORDS',
  CUSTOM_FILTER = 'CUSTOM_FILTER',
  TIME_LIMITED = 'TIME_LIMITED',
  LOCATION_LIMITED = 'LOCATION_LIMITED',
}

export const CONTEXT_TYPE_OPTIONS = [
  {
    value: CONTEXT_TYPE.OWN_RECORDS,
    label: 'Own Records Only',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: CONTEXT_TYPE.DEPARTMENT_RECORDS,
    label: 'Department Records',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: CONTEXT_TYPE.TEAM_RECORDS,
    label: 'Team Records',
    color: 'purple' as TagColor,
    position: 2,
  },
  {
    value: CONTEXT_TYPE.ALL_RECORDS,
    label: 'All Records',
    color: 'orange' as TagColor,
    position: 3,
  },
  {
    value: CONTEXT_TYPE.CUSTOM_FILTER,
    label: 'Custom Filter',
    color: 'teal' as TagColor,
    position: 4,
  },
  {
    value: CONTEXT_TYPE.TIME_LIMITED,
    label: 'Time Limited',
    color: 'yellow' as TagColor,
    position: 5,
  },
  {
    value: CONTEXT_TYPE.LOCATION_LIMITED,
    label: 'Location Limited',
    color: 'gray' as TagColor,
    position: 6,
  },
];
