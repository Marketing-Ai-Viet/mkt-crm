// Permission Action Categories
import { PermissionActionSeed } from 'src/mkt-core/mkt-permission-template/types/permissions.type';

export const PERMISSION_ACTION_CATEGORIES = {
  BASIC_CRUD: 'BASIC_CRUD',
  ADVANCED: 'ADVANCED',
  SYSTEM: 'SYSTEM',
  APPROVAL: 'APPROVAL',
  BULK_OPERATIONS: 'BULK_OPERATIONS',
  CONFIGURATION: 'CONFIGURATION',
  TEAM_MANAGEMENT: 'TEAM_MANAGEMENT',
  FINANCIAL: 'FINANCIAL',
} as const;

// Permission Action Keys aligned with 11-level hierarchy
export const PERMISSION_ACTION_KEYS = {
  // Basic CRUD operations
  READ: 'READ',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',

  // Advanced operations
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  SHARE: 'SHARE',
  PUBLISH: 'PUBLISH',
  ARCHIVE: 'ARCHIVE',
  RESTORE: 'RESTORE',

  // Approval operations
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  ESCALATE: 'ESCALATE',

  // System operations
  CONFIGURE: 'CONFIGURE',
  MONITOR: 'MONITOR',
  AUDIT: 'AUDIT',

  // Bulk operations
  BULK_CREATE: 'BULK_CREATE',
  BULK_UPDATE: 'BULK_UPDATE',
  BULK_DELETE: 'BULK_DELETE',
  BULK_EXPORT: 'BULK_EXPORT',

  // Team Management operations (for hierarchy levels)
  MANAGE_TEAM: 'MANAGE_TEAM',
  ASSIGN_TASKS: 'ASSIGN_TASKS',
  VIEW_TEAM_REPORTS: 'VIEW_TEAM_REPORTS',
  CONDUCT_REVIEWS: 'CONDUCT_REVIEWS',

  // Financial operations (sensitive for higher levels)
  ACCESS_SALARY_DATA: 'ACCESS_SALARY_DATA',
  APPROVE_TRANSACTIONS: 'APPROVE_TRANSACTIONS',
  VIEW_FINANCIAL_REPORTS: 'VIEW_FINANCIAL_REPORTS',
  BUDGET_MANAGEMENT: 'BUDGET_MANAGEMENT',

  // Sensitive data access (hierarchy-based)
  ACCESS_SENSITIVE_DATA: 'ACCESS_SENSITIVE_DATA',
  VIEW_CONFIDENTIAL_INFO: 'VIEW_CONFIDENTIAL_INFO',
  BYPASS_WORKFLOW_APPROVAL: 'BYPASS_WORKFLOW_APPROVAL',
} as const;

// Risk Levels
export const PERMISSION_RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

// Pre-generated UUIDs for consistent seeding (expanded for 11-level hierarchy)
export const PERMISSION_ACTION_IDS = {
  // Basic CRUD
  READ: '7cf5c2fd-7bba-4036-bb2b-a90d829db4a4',
  CREATE: 'f1bb3937-ddac-43dc-9e2f-1308ea1b04a2',
  UPDATE: 'd877057b-cd1d-4954-80da-c2a73a774c8a',
  DELETE: '5796b5b2-56de-40fa-9d15-ed13cfccc12c',

  // Advanced operations
  EXPORT: '11397e02-61d2-4c38-9799-d6787046d0e2',
  IMPORT: 'c991e6ac-cede-4631-9dc1-13766bdd8b77',
  SHARE: 'a29b11bd-c28d-43ea-aed1-0da0db1d258c',
  PUBLISH: '4b80da91-dd46-44bc-8327-4f5807c18e0c',
  ARCHIVE: '16dabbbd-850f-479b-bb52-45706f673503',
  RESTORE: '950b7a59-1704-4edc-a4b4-99cf9f0b3582',

  // Approval operations
  APPROVE: '4c07b8d0-25bd-4b34-9f3a-be496869a892',
  REJECT: '6fe13464-840f-4d5e-97a7-7d7de20117f2',
  ESCALATE: '7de8446c-118e-43fb-8088-9bb4940e70c7',

  // System operations
  CONFIGURE: '97ce80ce-5458-40f1-b257-20221b20a447',
  MONITOR: '1cd59971-44d7-4406-a50e-2586c0840a1d',
  AUDIT: 'c89d1f16-3c1a-4586-922c-cd26ed0058cd',

  // Bulk operations
  BULK_CREATE: 'f88ffb1d-fd73-4d7e-b9a3-401c4444aa7b',
  BULK_UPDATE: '4a12f369-14d7-4a7d-8e01-f23493210fbd',
  BULK_DELETE: 'df2a4bfb-6fc0-4302-a15f-f747d06e0bb7',
  BULK_EXPORT: 'f8a5a4ec-73a5-4e3f-b082-f220eb8b84b7',

  // Team Management operations (new for 11-level hierarchy)
  MANAGE_TEAM: 'f347fdba-134d-420e-a5ac-5128047c2ed3',
  ASSIGN_TASKS: 'd79e3e2d-9381-45b4-b9ba-21d3638ab266',
  VIEW_TEAM_REPORTS: '1e18997d-5112-4a4b-bfc1-8784a24b71f9',
  CONDUCT_REVIEWS: 'd91b6f2c-5e66-4bba-a1a4-b74c82eec75a',

  // Financial operations (new for hierarchy-based permissions)
  ACCESS_SALARY_DATA: 'd66112f7-26aa-4458-8165-a6df145eaf39',
  APPROVE_TRANSACTIONS: 'c77cd444-9775-4547-bab4-cf17db144b7f',
  VIEW_FINANCIAL_REPORTS: '1516a1e2-9baf-4854-a1cf-5f1c32c57e29',
  BUDGET_MANAGEMENT: 'e70d5ad4-104c-4bdd-84aa-a8b81246196a',

  // Sensitive data access (hierarchy-based)
  ACCESS_SENSITIVE_DATA: 'b66a2c4e-fee4-40ad-8660-6c787100f6c2',
  VIEW_CONFIDENTIAL_INFO: '4423b0bb-4af6-41b0-888c-76af6202082f',
  BYPASS_WORKFLOW_APPROVAL: 'e401c4ec-5ebf-47cc-9af6-5ff67c800480',
} as const;

// Permission Actions Seed Data
export const PERMISSION_ACTIONS_SEED: PermissionActionSeed[] = [
  // Basic CRUD Operations
  {
    id: PERMISSION_ACTION_IDS.READ,
    actionKey: PERMISSION_ACTION_KEYS.READ,
    actionName: 'Read',
    actionCategory: PERMISSION_ACTION_CATEGORIES.BASIC_CRUD,
    description: 'View and read records without modification',
    riskLevel: PERMISSION_RISK_LEVELS.LOW,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.CREATE,
    actionKey: PERMISSION_ACTION_KEYS.CREATE,
    actionName: 'Create',
    actionCategory: PERMISSION_ACTION_CATEGORIES.BASIC_CRUD,
    description: 'Create new records and entries',
    riskLevel: PERMISSION_RISK_LEVELS.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.UPDATE,
    actionKey: PERMISSION_ACTION_KEYS.UPDATE,
    actionName: 'Update',
    actionCategory: PERMISSION_ACTION_CATEGORIES.BASIC_CRUD,
    description: 'Modify and update existing records',
    riskLevel: PERMISSION_RISK_LEVELS.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.DELETE,
    actionKey: PERMISSION_ACTION_KEYS.DELETE,
    actionName: 'Delete',
    actionCategory: PERMISSION_ACTION_CATEGORIES.BASIC_CRUD,
    description: 'Delete records permanently or soft delete',
    riskLevel: PERMISSION_RISK_LEVELS.HIGH,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },

  // Advanced Operations
  {
    id: PERMISSION_ACTION_IDS.EXPORT,
    actionKey: PERMISSION_ACTION_KEYS.EXPORT,
    actionName: 'Export',
    actionCategory: PERMISSION_ACTION_CATEGORIES.ADVANCED,
    description: 'Export data to external formats (CSV, PDF, etc.)',
    riskLevel: PERMISSION_RISK_LEVELS.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.IMPORT,
    actionKey: PERMISSION_ACTION_KEYS.IMPORT,
    actionName: 'Import',
    actionCategory: PERMISSION_ACTION_CATEGORIES.ADVANCED,
    description: 'Import data from external sources',
    riskLevel: PERMISSION_RISK_LEVELS.HIGH,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.SHARE,
    actionKey: PERMISSION_ACTION_KEYS.SHARE,
    actionName: 'Share',
    actionCategory: PERMISSION_ACTION_CATEGORIES.ADVANCED,
    description: 'Share records with other users or external parties',
    riskLevel: PERMISSION_RISK_LEVELS.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.PUBLISH,
    actionKey: PERMISSION_ACTION_KEYS.PUBLISH,
    actionName: 'Publish',
    actionCategory: PERMISSION_ACTION_CATEGORIES.ADVANCED,
    description: 'Publish content or records for public access',
    riskLevel: PERMISSION_RISK_LEVELS.HIGH,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.ARCHIVE,
    actionKey: PERMISSION_ACTION_KEYS.ARCHIVE,
    actionName: 'Archive',
    actionCategory: PERMISSION_ACTION_CATEGORIES.ADVANCED,
    description: 'Archive records for long-term storage',
    riskLevel: PERMISSION_RISK_LEVELS.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.RESTORE,
    actionKey: PERMISSION_ACTION_KEYS.RESTORE,
    actionName: 'Restore',
    actionCategory: PERMISSION_ACTION_CATEGORIES.ADVANCED,
    description: 'Restore archived or deleted records',
    riskLevel: PERMISSION_RISK_LEVELS.HIGH,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },

  // Approval Operations
  {
    id: PERMISSION_ACTION_IDS.APPROVE,
    actionKey: PERMISSION_ACTION_KEYS.APPROVE,
    actionName: 'Approve',
    actionCategory: PERMISSION_ACTION_CATEGORIES.APPROVAL,
    description: 'Approve pending actions or requests',
    riskLevel: PERMISSION_RISK_LEVELS.HIGH,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.REJECT,
    actionKey: PERMISSION_ACTION_KEYS.REJECT,
    actionName: 'Reject',
    actionCategory: PERMISSION_ACTION_CATEGORIES.APPROVAL,
    description: 'Reject pending actions or requests',
    riskLevel: PERMISSION_RISK_LEVELS.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.ESCALATE,
    actionKey: PERMISSION_ACTION_KEYS.ESCALATE,
    actionName: 'Escalate',
    actionCategory: PERMISSION_ACTION_CATEGORIES.APPROVAL,
    description: 'Escalate requests to higher authority',
    riskLevel: PERMISSION_RISK_LEVELS.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },

  // System Operations
  {
    id: PERMISSION_ACTION_IDS.CONFIGURE,
    actionKey: PERMISSION_ACTION_KEYS.CONFIGURE,
    actionName: 'Configure',
    actionCategory: PERMISSION_ACTION_CATEGORIES.SYSTEM,
    description: 'Configure system settings and parameters',
    riskLevel: PERMISSION_RISK_LEVELS.CRITICAL,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.MONITOR,
    actionKey: PERMISSION_ACTION_KEYS.MONITOR,
    actionName: 'Monitor',
    actionCategory: PERMISSION_ACTION_CATEGORIES.SYSTEM,
    description: 'Monitor system performance and user activities',
    riskLevel: PERMISSION_RISK_LEVELS.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.AUDIT,
    actionKey: PERMISSION_ACTION_KEYS.AUDIT,
    actionName: 'Audit',
    actionCategory: PERMISSION_ACTION_CATEGORIES.SYSTEM,
    description: 'Access audit logs and security information',
    riskLevel: PERMISSION_RISK_LEVELS.HIGH,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },

  // Bulk Operations
  {
    id: PERMISSION_ACTION_IDS.BULK_CREATE,
    actionKey: PERMISSION_ACTION_KEYS.BULK_CREATE,
    actionName: 'Bulk Create',
    actionCategory: PERMISSION_ACTION_CATEGORIES.BULK_OPERATIONS,
    description: 'Create multiple records in batch operations',
    riskLevel: PERMISSION_RISK_LEVELS.HIGH,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.BULK_UPDATE,
    actionKey: PERMISSION_ACTION_KEYS.BULK_UPDATE,
    actionName: 'Bulk Update',
    actionCategory: PERMISSION_ACTION_CATEGORIES.BULK_OPERATIONS,
    description: 'Update multiple records in batch operations',
    riskLevel: PERMISSION_RISK_LEVELS.HIGH,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.BULK_DELETE,
    actionKey: PERMISSION_ACTION_KEYS.BULK_DELETE,
    actionName: 'Bulk Delete',
    actionCategory: PERMISSION_ACTION_CATEGORIES.BULK_OPERATIONS,
    description: 'Delete multiple records in batch operations',
    riskLevel: PERMISSION_RISK_LEVELS.CRITICAL,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.BULK_EXPORT,
    actionKey: PERMISSION_ACTION_KEYS.BULK_EXPORT,
    actionName: 'Bulk Export',
    actionCategory: PERMISSION_ACTION_CATEGORIES.BULK_OPERATIONS,
    description: 'Export large datasets in batch operations',
    riskLevel: PERMISSION_RISK_LEVELS.HIGH,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },

  // Team Management Operations (for 11-level hierarchy)
  {
    id: PERMISSION_ACTION_IDS.MANAGE_TEAM,
    actionKey: PERMISSION_ACTION_KEYS.MANAGE_TEAM,
    actionName: 'Manage Team',
    actionCategory: PERMISSION_ACTION_CATEGORIES.TEAM_MANAGEMENT,
    description: 'Manage team members, assign roles and responsibilities',
    riskLevel: PERMISSION_RISK_LEVELS.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.ASSIGN_TASKS,
    actionKey: PERMISSION_ACTION_KEYS.ASSIGN_TASKS,
    actionName: 'Assign Tasks',
    actionCategory: PERMISSION_ACTION_CATEGORIES.TEAM_MANAGEMENT,
    description: 'Assign tasks and projects to team members',
    riskLevel: PERMISSION_RISK_LEVELS.LOW,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.VIEW_TEAM_REPORTS,
    actionKey: PERMISSION_ACTION_KEYS.VIEW_TEAM_REPORTS,
    actionName: 'View Team Reports',
    actionCategory: PERMISSION_ACTION_CATEGORIES.TEAM_MANAGEMENT,
    description: 'View team performance reports and analytics',
    riskLevel: PERMISSION_RISK_LEVELS.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.CONDUCT_REVIEWS,
    actionKey: PERMISSION_ACTION_KEYS.CONDUCT_REVIEWS,
    actionName: 'Conduct Reviews',
    actionCategory: PERMISSION_ACTION_CATEGORIES.TEAM_MANAGEMENT,
    description: 'Conduct performance reviews and evaluations',
    riskLevel: PERMISSION_RISK_LEVELS.HIGH,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },

  // Financial Operations (for higher hierarchy levels)
  {
    id: PERMISSION_ACTION_IDS.ACCESS_SALARY_DATA,
    actionKey: PERMISSION_ACTION_KEYS.ACCESS_SALARY_DATA,
    actionName: 'Access Salary Data',
    actionCategory: PERMISSION_ACTION_CATEGORIES.FINANCIAL,
    description: 'Access salary and compensation information',
    riskLevel: PERMISSION_RISK_LEVELS.CRITICAL,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.APPROVE_TRANSACTIONS,
    actionKey: PERMISSION_ACTION_KEYS.APPROVE_TRANSACTIONS,
    actionName: 'Approve Transactions',
    actionCategory: PERMISSION_ACTION_CATEGORIES.FINANCIAL,
    description: 'Approve financial transactions and expenditures',
    riskLevel: PERMISSION_RISK_LEVELS.CRITICAL,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.VIEW_FINANCIAL_REPORTS,
    actionKey: PERMISSION_ACTION_KEYS.VIEW_FINANCIAL_REPORTS,
    actionName: 'View Financial Reports',
    actionCategory: PERMISSION_ACTION_CATEGORIES.FINANCIAL,
    description: 'View financial reports and budget information',
    riskLevel: PERMISSION_RISK_LEVELS.HIGH,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.BUDGET_MANAGEMENT,
    actionKey: PERMISSION_ACTION_KEYS.BUDGET_MANAGEMENT,
    actionName: 'Budget Management',
    actionCategory: PERMISSION_ACTION_CATEGORIES.FINANCIAL,
    description: 'Manage department and project budgets',
    riskLevel: PERMISSION_RISK_LEVELS.CRITICAL,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },

  // Sensitive Data Access (hierarchy-based permissions)
  {
    id: PERMISSION_ACTION_IDS.ACCESS_SENSITIVE_DATA,
    actionKey: PERMISSION_ACTION_KEYS.ACCESS_SENSITIVE_DATA,
    actionName: 'Access Sensitive Data',
    actionCategory: PERMISSION_ACTION_CATEGORIES.SYSTEM,
    description: 'Access sensitive and confidential business data',
    riskLevel: PERMISSION_RISK_LEVELS.CRITICAL,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.VIEW_CONFIDENTIAL_INFO,
    actionKey: PERMISSION_ACTION_KEYS.VIEW_CONFIDENTIAL_INFO,
    actionName: 'View Confidential Info',
    actionCategory: PERMISSION_ACTION_CATEGORIES.SYSTEM,
    description: 'View confidential information and documents',
    riskLevel: PERMISSION_RISK_LEVELS.CRITICAL,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },
  {
    id: PERMISSION_ACTION_IDS.BYPASS_WORKFLOW_APPROVAL,
    actionKey: PERMISSION_ACTION_KEYS.BYPASS_WORKFLOW_APPROVAL,
    actionName: 'Bypass Workflow Approval',
    actionCategory: PERMISSION_ACTION_CATEGORIES.SYSTEM,
    description: 'Bypass standard workflow approval processes',
    riskLevel: PERMISSION_RISK_LEVELS.CRITICAL,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
  },
];

// Helper function to get action by key
// eslint-disable-next-line @typescript-eslint/naming-convention
export const getActionByKey = (
  key: string,
): PermissionActionSeed | undefined => {
  return PERMISSION_ACTIONS_SEED.find((action) => action.actionKey === key);
};

// Helper function to get actions by category
// eslint-disable-next-line @typescript-eslint/naming-convention
export const getActionsByCategory = (
  category: string,
): PermissionActionSeed[] => {
  return PERMISSION_ACTIONS_SEED.filter(
    (action) => action.actionCategory === category,
  );
};

// Helper function to get actions by risk level
// eslint-disable-next-line @typescript-eslint/naming-convention
export const getActionsByRiskLevel = (
  riskLevel: string,
): PermissionActionSeed[] => {
  return PERMISSION_ACTIONS_SEED.filter(
    (action) => action.riskLevel === riskLevel,
  );
};

// Helper function to get actions requiring approval
// eslint-disable-next-line @typescript-eslint/naming-convention
export const getActionsRequiringApproval = (): PermissionActionSeed[] => {
  return PERMISSION_ACTIONS_SEED.filter((action) => action.requiresApproval);
};

// Validation function
// eslint-disable-next-line @typescript-eslint/naming-convention
export const validateActionSeed = (action: PermissionActionSeed): boolean => {
  return !!(
    action.id &&
    action.actionKey &&
    action.actionName &&
    action.actionCategory &&
    action.description &&
    action.riskLevel &&
    typeof action.requiresApproval === 'boolean' &&
    typeof action.isSystemAction === 'boolean' &&
    typeof action.isActive === 'boolean'
  );
};
