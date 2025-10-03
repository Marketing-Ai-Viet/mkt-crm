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

// Permission Context Types (Expanded for Enterprise)
export enum CONTEXT_TYPE {
  // Basic Hierarchy Contexts (Existing)
  OWN_RECORDS = 'OWN_RECORDS',
  DEPARTMENT_RECORDS = 'DEPARTMENT_RECORDS',
  TEAM_RECORDS = 'TEAM_RECORDS',
  ALL_RECORDS = 'ALL_RECORDS',
  CUSTOM_FILTER = 'CUSTOM_FILTER',
  TIME_LIMITED = 'TIME_LIMITED',
  LOCATION_LIMITED = 'LOCATION_LIMITED',

  // Advanced Hierarchy Contexts (Enterprise)
  REGION_RECORDS = 'REGION_RECORDS',
  DIVISION_RECORDS = 'DIVISION_RECORDS',
  BUSINESS_UNIT_RECORDS = 'BUSINESS_UNIT_RECORDS',
  SUBSIDIARY_RECORDS = 'SUBSIDIARY_RECORDS',
  BRANCH_RECORDS = 'BRANCH_RECORDS',

  // Data Classification Contexts (Enterprise)
  CONFIDENTIAL_ONLY = 'CONFIDENTIAL_ONLY',
  PUBLIC_RECORDS = 'PUBLIC_RECORDS',
  RESTRICTED_DATA = 'RESTRICTED_DATA',
  FINANCIAL_SENSITIVE = 'FINANCIAL_SENSITIVE',
  PII_PROTECTED = 'PII_PROTECTED',

  // Compliance & Regulatory Contexts (Enterprise)
  GDPR_COMPLIANT = 'GDPR_COMPLIANT',
  SOX_CONTROLLED = 'SOX_CONTROLLED',
  HIPAA_PROTECTED = 'HIPAA_PROTECTED',
  AUDIT_TRACKED = 'AUDIT_TRACKED',
  RETENTION_POLICY = 'RETENTION_POLICY',

  // Advanced Security Contexts (Enterprise)
  DEVICE_LIMITED = 'DEVICE_LIMITED',
  IP_WHITELIST = 'IP_WHITELIST',
  VPN_REQUIRED = 'VPN_REQUIRED',
  MFA_PROTECTED = 'MFA_PROTECTED',
  CERTIFICATE_BASED = 'CERTIFICATE_BASED',

  // Dynamic & Conditional Contexts (Enterprise)
  VALUE_BASED = 'VALUE_BASED',
  RISK_BASED = 'RISK_BASED',
  APPROVAL_CHAIN = 'APPROVAL_CHAIN',
  WORKFLOW_STATE = 'WORKFLOW_STATE',
  DELEGATION_CHAIN = 'DELEGATION_CHAIN',

  // Multi-Tenant & Cross-Org Contexts (Enterprise)
  TENANT_ISOLATED = 'TENANT_ISOLATED',
  CROSS_TENANT = 'CROSS_TENANT',
  PARTNER_SHARED = 'PARTNER_SHARED',
  VENDOR_ACCESS = 'VENDOR_ACCESS',
  CLIENT_PORTAL = 'CLIENT_PORTAL',
}

export const CONTEXT_TYPE_OPTIONS = [
  // Basic Hierarchy Contexts (Existing)
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

  // Advanced Hierarchy Contexts (Enterprise)
  {
    value: CONTEXT_TYPE.REGION_RECORDS,
    label: 'Region Records',
    color: 'blue' as TagColor,
    position: 7,
  },
  {
    value: CONTEXT_TYPE.DIVISION_RECORDS,
    label: 'Division Records',
    color: 'green' as TagColor,
    position: 8,
  },
  {
    value: CONTEXT_TYPE.BUSINESS_UNIT_RECORDS,
    label: 'Business Unit Records',
    color: 'purple' as TagColor,
    position: 9,
  },
  {
    value: CONTEXT_TYPE.SUBSIDIARY_RECORDS,
    label: 'Subsidiary Records',
    color: 'orange' as TagColor,
    position: 10,
  },
  {
    value: CONTEXT_TYPE.BRANCH_RECORDS,
    label: 'Branch Records',
    color: 'teal' as TagColor,
    position: 11,
  },

  // Data Classification Contexts (Enterprise)
  {
    value: CONTEXT_TYPE.CONFIDENTIAL_ONLY,
    label: 'Confidential Data Only',
    color: 'red' as TagColor,
    position: 12,
  },
  {
    value: CONTEXT_TYPE.PUBLIC_RECORDS,
    label: 'Public Records',
    color: 'green' as TagColor,
    position: 13,
  },
  {
    value: CONTEXT_TYPE.RESTRICTED_DATA,
    label: 'Restricted Data',
    color: 'orange' as TagColor,
    position: 14,
  },
  {
    value: CONTEXT_TYPE.FINANCIAL_SENSITIVE,
    label: 'Financial Sensitive Data',
    color: 'red' as TagColor,
    position: 15,
  },
  {
    value: CONTEXT_TYPE.PII_PROTECTED,
    label: 'PII Protected Data',
    color: 'red' as TagColor,
    position: 16,
  },

  // Compliance & Regulatory Contexts (Enterprise)
  {
    value: CONTEXT_TYPE.GDPR_COMPLIANT,
    label: 'GDPR Compliant Access',
    color: 'blue' as TagColor,
    position: 17,
  },
  {
    value: CONTEXT_TYPE.SOX_CONTROLLED,
    label: 'SOX Controlled Data',
    color: 'red' as TagColor,
    position: 18,
  },
  {
    value: CONTEXT_TYPE.HIPAA_PROTECTED,
    label: 'HIPAA Protected Data',
    color: 'red' as TagColor,
    position: 19,
  },
  {
    value: CONTEXT_TYPE.AUDIT_TRACKED,
    label: 'Audit Tracked Access',
    color: 'yellow' as TagColor,
    position: 20,
  },
  {
    value: CONTEXT_TYPE.RETENTION_POLICY,
    label: 'Retention Policy Governed',
    color: 'gray' as TagColor,
    position: 21,
  },

  // Advanced Security Contexts (Enterprise)
  {
    value: CONTEXT_TYPE.DEVICE_LIMITED,
    label: 'Device Limited Access',
    color: 'orange' as TagColor,
    position: 22,
  },
  {
    value: CONTEXT_TYPE.IP_WHITELIST,
    label: 'IP Whitelist Only',
    color: 'red' as TagColor,
    position: 23,
  },
  {
    value: CONTEXT_TYPE.VPN_REQUIRED,
    label: 'VPN Required Access',
    color: 'blue' as TagColor,
    position: 24,
  },
  {
    value: CONTEXT_TYPE.MFA_PROTECTED,
    label: 'MFA Protected Access',
    color: 'red' as TagColor,
    position: 25,
  },
  {
    value: CONTEXT_TYPE.CERTIFICATE_BASED,
    label: 'Certificate Based Access',
    color: 'purple' as TagColor,
    position: 26,
  },

  // Dynamic & Conditional Contexts (Enterprise)
  {
    value: CONTEXT_TYPE.VALUE_BASED,
    label: 'Value Based Access',
    color: 'green' as TagColor,
    position: 27,
  },
  {
    value: CONTEXT_TYPE.RISK_BASED,
    label: 'Risk Based Access',
    color: 'orange' as TagColor,
    position: 28,
  },
  {
    value: CONTEXT_TYPE.APPROVAL_CHAIN,
    label: 'Approval Chain Context',
    color: 'yellow' as TagColor,
    position: 29,
  },
  {
    value: CONTEXT_TYPE.WORKFLOW_STATE,
    label: 'Workflow State Context',
    color: 'teal' as TagColor,
    position: 30,
  },
  {
    value: CONTEXT_TYPE.DELEGATION_CHAIN,
    label: 'Delegation Chain Context',
    color: 'purple' as TagColor,
    position: 31,
  },

  // Multi-Tenant & Cross-Org Contexts (Enterprise)
  {
    value: CONTEXT_TYPE.TENANT_ISOLATED,
    label: 'Tenant Isolated Access',
    color: 'blue' as TagColor,
    position: 32,
  },
  {
    value: CONTEXT_TYPE.CROSS_TENANT,
    label: 'Cross Tenant Access',
    color: 'orange' as TagColor,
    position: 33,
  },
  {
    value: CONTEXT_TYPE.PARTNER_SHARED,
    label: 'Partner Shared Access',
    color: 'green' as TagColor,
    position: 34,
  },
  {
    value: CONTEXT_TYPE.VENDOR_ACCESS,
    label: 'Vendor Access Only',
    color: 'gray' as TagColor,
    position: 35,
  },
  {
    value: CONTEXT_TYPE.CLIENT_PORTAL,
    label: 'Client Portal Access',
    color: 'teal' as TagColor,
    position: 36,
  },
];

// Permission Source Types (for Priority Config)
export enum SOURCE_TYPE {
  TEMPLATE = 'TEMPLATE',
  OVERRIDE = 'OVERRIDE',
  POLICY = 'POLICY',
}

export const SOURCE_TYPE_OPTIONS = [
  {
    value: SOURCE_TYPE.TEMPLATE,
    label: 'Permission Template',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: SOURCE_TYPE.OVERRIDE,
    label: 'User Override',
    color: 'red' as TagColor,
    position: 1,
  },
  {
    value: SOURCE_TYPE.POLICY,
    label: 'Data Access Policy',
    color: 'green' as TagColor,
    position: 2,
  },
];

// Permission Source Sub Types (for Priority Config)
export enum SOURCE_SUBTYPE {
  // Override subtypes
  EMERGENCY = 'EMERGENCY',
  COMPLIANCE = 'COMPLIANCE',
  AUDIT = 'AUDIT',
  TEMPORARY_GRANT = 'TEMPORARY_GRANT',
  TEMPORARY_DENY = 'TEMPORARY_DENY',
  BUSINESS_EXCEPTION = 'BUSINESS_EXCEPTION',

  // Template subtypes
  ROLE_BASED = 'ROLE_BASED',
  HIERARCHY_BASED = 'HIERARCHY_BASED',
  DEPARTMENT_BASED = 'DEPARTMENT_BASED',
  SYSTEM_DEFAULT = 'SYSTEM_DEFAULT',

  // Policy subtypes
  HIERARCHY_FILTER = 'HIERARCHY_FILTER',
  DEPARTMENT_FILTER = 'DEPARTMENT_FILTER',
  CUSTOM_FILTER = 'CUSTOM_FILTER',
}

export const SOURCE_SUBTYPE_OPTIONS = [
  // Override subtypes
  {
    value: SOURCE_SUBTYPE.EMERGENCY,
    label: 'Emergency Access',
    color: 'red' as TagColor,
    position: 0,
  },
  {
    value: SOURCE_SUBTYPE.COMPLIANCE,
    label: 'Compliance/Legal',
    color: 'purple' as TagColor,
    position: 1,
  },
  {
    value: SOURCE_SUBTYPE.AUDIT,
    label: 'Audit Related',
    color: 'yellow' as TagColor,
    position: 2,
  },
  {
    value: SOURCE_SUBTYPE.TEMPORARY_GRANT,
    label: 'Temporary Grant',
    color: 'green' as TagColor,
    position: 3,
  },
  {
    value: SOURCE_SUBTYPE.TEMPORARY_DENY,
    label: 'Temporary Deny',
    color: 'orange' as TagColor,
    position: 4,
  },
  {
    value: SOURCE_SUBTYPE.BUSINESS_EXCEPTION,
    label: 'Business Exception',
    color: 'blue' as TagColor,
    position: 5,
  },

  // Template subtypes
  {
    value: SOURCE_SUBTYPE.ROLE_BASED,
    label: 'Role Based',
    color: 'teal' as TagColor,
    position: 6,
  },
  {
    value: SOURCE_SUBTYPE.HIERARCHY_BASED,
    label: 'Hierarchy Based',
    color: 'purple' as TagColor,
    position: 7,
  },
  {
    value: SOURCE_SUBTYPE.DEPARTMENT_BASED,
    label: 'Department Based',
    color: 'green' as TagColor,
    position: 8,
  },
  {
    value: SOURCE_SUBTYPE.SYSTEM_DEFAULT,
    label: 'System Default',
    color: 'gray' as TagColor,
    position: 9,
  },

  // Policy subtypes
  {
    value: SOURCE_SUBTYPE.HIERARCHY_FILTER,
    label: 'Hierarchy Filter',
    color: 'blue' as TagColor,
    position: 10,
  },
  {
    value: SOURCE_SUBTYPE.DEPARTMENT_FILTER,
    label: 'Department Filter',
    color: 'green' as TagColor,
    position: 11,
  },
  {
    value: SOURCE_SUBTYPE.CUSTOM_FILTER,
    label: 'Custom Filter',
    color: 'orange' as TagColor,
    position: 12,
  },
];

// Priority Formula Templates
export enum PRIORITY_FORMULA {
  BASE_PRIORITY = 'basePriority',
  HIERARCHY_BOOST = 'basePriority + (priorityBoost * (10 - hierarchyLevel))',
  HIERARCHY_FILTER_BOOST = 'basePriority + (priorityBoost * (10 - minHierarchyLevel))',
}

export const PRIORITY_FORMULA_OPTIONS = [
  {
    value: PRIORITY_FORMULA.BASE_PRIORITY,
    label: 'Fixed Base Priority',
    color: 'gray' as TagColor,
    position: 0,
  },
  {
    value: PRIORITY_FORMULA.HIERARCHY_BOOST,
    label: 'Hierarchy Level Boost',
    color: 'blue' as TagColor,
    position: 1,
  },
  {
    value: PRIORITY_FORMULA.HIERARCHY_FILTER_BOOST,
    label: 'Hierarchy Filter Boost',
    color: 'green' as TagColor,
    position: 2,
  },
];
