import { SYSTEM_ACTION_KEY } from 'src/mkt-core/mkt-permission-template/constants/permission-template-options.constants';

import { MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS } from './mkt-permission-template-data-seeds.constants';

// Template System Action IDs (valid UUID v4 values) - pre-generated for consistency
export const MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS = {
  // CEO system actions
  CEO_DATA_EXPORT: '24b71910-f016-4077-8978-a77b0b75065d',
  CEO_BULK_OPERATIONS: '60d14df5-4f23-4710-b56f-b48401504fbb',
  CEO_ADMIN_FUNCTIONS: 'a9e054ae-12cf-4101-9467-67992bb312e8',
  CEO_CROSS_DEPARTMENT_VIEW: 'c9d5ada9-b75f-472c-8eae-8b5805c074a2',
  CEO_ESCALATION_APPROVE: '2168f467-9f80-46e4-b878-f329fb96459d',
  CEO_BUDGET_APPROVE: 'eea454de-e231-461a-b63c-c3438fbd6901',
  CEO_SYSTEM_CONFIGURATION: 'b871c521-4ed2-4e9f-acbe-ce88d79a9e2b',
  CEO_USER_MANAGEMENT: '9b84a731-ba33-4f22-8d22-00da67b67eeb',

  // Vice President system actions
  VP_DATA_EXPORT: 'df4a91f7-9d1b-4fa5-8250-644e91642a64',
  VP_BULK_OPERATIONS: 'cd074a45-dc29-4449-8798-f4e66a8c617b',
  VP_CROSS_DEPARTMENT_VIEW: 'd4163045-fc0f-440d-bc49-c606d507662b',
  VP_ESCALATION_APPROVE: 'f22d92da-6594-448a-afb6-8f6002fe0634',
  VP_BUDGET_APPROVE: '913af2b7-525f-4308-8bb7-620e154b06ea',
  VP_USER_MANAGEMENT: '8d247a0f-23d7-4ad3-ab3a-63a072b8f25a',

  // Director system actions
  DIRECTOR_DATA_EXPORT: '56cafa28-e776-454c-b29e-4e86d9255315',
  DIRECTOR_BULK_OPERATIONS: 'cbac3131-7d97-4dff-95c0-8f28637c3c33',
  DIRECTOR_CROSS_DEPARTMENT_VIEW: '28d7663a-30a2-4338-9547-b1587c3082a5',
  DIRECTOR_ESCALATION_APPROVE: '68c64c68-7bf8-46bd-8da8-45f1fa963f02',
  DIRECTOR_BUDGET_APPROVE: '1a621657-a9e2-416d-b493-1bd70aac8cff',

  // Manager system actions
  MANAGER_DATA_EXPORT: '49156dac-bfd3-4322-8959-71bbecf4601d',
  MANAGER_BULK_OPERATIONS: 'afd9d84a-3224-4a8a-aac7-75fd9f5795b2',
  MANAGER_ESCALATION_APPROVE: 'e8a022a1-2cc6-4876-b4b5-30321da8b5ef',
  MANAGER_BUDGET_APPROVE: 'ff25844b-80fe-4fa5-bb8b-e90824046290',

  // Team Lead system actions
  TEAM_LEAD_DATA_EXPORT: 'aa8c760c-82fb-4d5a-8886-819489ddc75e',
  TEAM_LEAD_ESCALATION_APPROVE: '43bf4a44-30aa-41c6-a07e-811d5474925f',

  // Senior Staff system actions
  SENIOR_STAFF_DATA_EXPORT: 'ba01abc8-d8b6-4017-94db-88bd11c5a3b2',

  // Junior Staff - No system actions (too junior for system-level permissions)
  // Intern - No system actions (read-only access only)
};

type MktTemplateSystemActionDataSeed = {
  id: string;
  templateId: string;
  actionKey: string;
  isAllowed: boolean;
  configuration: string | null; // JSON string for database storage
  restrictions: string | null; // JSON string for database storage
  isActive: boolean;
};

export const MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_COLUMNS: (keyof MktTemplateSystemActionDataSeed)[] =
  [
    'id',
    'templateId',
    'actionKey',
    'isAllowed',
    'configuration',
    'restrictions',
    'isActive',
  ];

// Template System Action Data Seeds
export const MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS: MktTemplateSystemActionDataSeed[] =
  [
    // CEO (Level 1) - Full system access
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.CEO_DATA_EXPORT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      actionKey: SYSTEM_ACTION_KEY.DATA_EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        maxRecords: -1, // Unlimited
        formats: ['CSV', 'XLSX', 'JSON', 'PDF'],
        includeSystemData: true,
        includeAuditLogs: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.CEO_BULK_OPERATIONS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      actionKey: SYSTEM_ACTION_KEY.BULK_OPERATIONS,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBatchSize: -1, // Unlimited
        allowedOperations: ['CREATE', 'UPDATE', 'DELETE', 'MERGE'],
        requiresConfirmation: false,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.CEO_ADMIN_FUNCTIONS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      actionKey: SYSTEM_ACTION_KEY.ADMIN_FUNCTIONS,
      isAllowed: true,
      configuration: JSON.stringify({
        fullAdminAccess: true,
        canModifySystemSettings: true,
        canAccessDeveloperTools: true,
        canManageIntegrations: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.CEO_CROSS_DEPARTMENT_VIEW,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      actionKey: SYSTEM_ACTION_KEY.CROSS_DEPARTMENT_VIEW,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_DEPARTMENTS',
        includeFinancialData: true,
        includePersonnelData: true,
        includeSensitiveData: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.CEO_ESCALATION_APPROVE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      actionKey: SYSTEM_ACTION_KEY.ESCALATION_APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxApprovalAmount: -1, // Unlimited
        canOverrideDecisions: true,
        canDelegateApproval: true,
        emergencyApproval: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.CEO_BUDGET_APPROVE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      actionKey: SYSTEM_ACTION_KEY.BUDGET_APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBudgetAmount: -1, // Unlimited
        canApproveCapexBudgets: true,
        canApproveOpexBudgets: true,
        canModifyBudgetAllocations: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.CEO_SYSTEM_CONFIGURATION,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      actionKey: SYSTEM_ACTION_KEY.SYSTEM_CONFIGURATION,
      isAllowed: true,
      configuration: JSON.stringify({
        canModifyGlobalSettings: true,
        canConfigureSecurityPolicies: true,
        canManageSystemMaintenance: true,
        canConfigureBackupRestore: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.CEO_USER_MANAGEMENT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      actionKey: SYSTEM_ACTION_KEY.USER_MANAGEMENT,
      isAllowed: true,
      configuration: JSON.stringify({
        canCreateUsers: true,
        canDeleteUsers: true,
        canModifyRoles: true,
        canResetPasswords: true,
        canManagePermissions: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // VICE PRESIDENT (Level 2) - High-level system access with some restrictions
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.VP_DATA_EXPORT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      actionKey: SYSTEM_ACTION_KEY.DATA_EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        maxRecords: 1000000,
        formats: ['CSV', 'XLSX', 'JSON'],
        includeSystemData: false,
        includeAuditLogs: false,
      }),
      restrictions: JSON.stringify({
        requiresApproval: false,
        auditLog: true,
        timeLimit: '24h',
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.VP_BULK_OPERATIONS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      actionKey: SYSTEM_ACTION_KEY.BULK_OPERATIONS,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBatchSize: 10000,
        allowedOperations: ['CREATE', 'UPDATE', 'MERGE'],
        requiresConfirmation: true,
      }),
      restrictions: JSON.stringify({
        requiresApproval: true,
        approvalThreshold: 1000,
        auditLog: true,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.VP_CROSS_DEPARTMENT_VIEW,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      actionKey: SYSTEM_ACTION_KEY.CROSS_DEPARTMENT_VIEW,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ASSIGNED_DEPARTMENTS',
        includeFinancialData: true,
        includePersonnelData: false,
        includeSensitiveData: false,
      }),
      restrictions: JSON.stringify({
        auditLog: true,
        timeRestrictions: '8:00-18:00',
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.VP_ESCALATION_APPROVE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      actionKey: SYSTEM_ACTION_KEY.ESCALATION_APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxApprovalAmount: 500000,
        canOverrideDecisions: false,
        canDelegateApproval: true,
        emergencyApproval: false,
      }),
      restrictions: JSON.stringify({
        requiresNotification: true,
        auditLog: true,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.VP_BUDGET_APPROVE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      actionKey: SYSTEM_ACTION_KEY.BUDGET_APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBudgetAmount: 1000000,
        canApproveCapexBudgets: false,
        canApproveOpexBudgets: true,
        canModifyBudgetAllocations: false,
      }),
      restrictions: JSON.stringify({
        requiresNotification: true,
        auditLog: true,
        quarterlyLimit: true,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.VP_USER_MANAGEMENT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      actionKey: SYSTEM_ACTION_KEY.USER_MANAGEMENT,
      isAllowed: true,
      configuration: JSON.stringify({
        canCreateUsers: true,
        canDeleteUsers: false,
        canModifyRoles: false,
        canResetPasswords: true,
        canManagePermissions: false,
      }),
      restrictions: JSON.stringify({
        departmentScope: true,
        requiresApproval: true,
        auditLog: true,
      }),
      isActive: true,
    },

    // DIRECTOR (Level 3) - Departmental system access
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.DIRECTOR_DATA_EXPORT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.DIRECTOR,
      actionKey: SYSTEM_ACTION_KEY.DATA_EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        maxRecords: 100000,
        formats: ['CSV', 'XLSX'],
        includeSystemData: false,
        includeAuditLogs: false,
      }),
      restrictions: JSON.stringify({
        requiresApproval: true,
        auditLog: true,
        departmentScope: true,
        timeLimit: '8h',
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.DIRECTOR_BULK_OPERATIONS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.DIRECTOR,
      actionKey: SYSTEM_ACTION_KEY.BULK_OPERATIONS,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBatchSize: 5000,
        allowedOperations: ['CREATE', 'UPDATE'],
        requiresConfirmation: true,
      }),
      restrictions: JSON.stringify({
        requiresApproval: true,
        approvalThreshold: 500,
        auditLog: true,
        departmentScope: true,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.DIRECTOR_CROSS_DEPARTMENT_VIEW,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.DIRECTOR,
      actionKey: SYSTEM_ACTION_KEY.CROSS_DEPARTMENT_VIEW,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'RELATED_DEPARTMENTS',
        includeFinancialData: false,
        includePersonnelData: false,
        includeSensitiveData: false,
      }),
      restrictions: JSON.stringify({
        auditLog: true,
        timeRestrictions: '8:00-18:00',
        requiresJustification: true,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.DIRECTOR_ESCALATION_APPROVE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.DIRECTOR,
      actionKey: SYSTEM_ACTION_KEY.ESCALATION_APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxApprovalAmount: 100000,
        canOverrideDecisions: false,
        canDelegateApproval: false,
        emergencyApproval: false,
      }),
      restrictions: JSON.stringify({
        requiresNotification: true,
        auditLog: true,
        departmentScope: true,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.DIRECTOR_BUDGET_APPROVE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.DIRECTOR,
      actionKey: SYSTEM_ACTION_KEY.BUDGET_APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBudgetAmount: 250000,
        canApproveCapexBudgets: false,
        canApproveOpexBudgets: true,
        canModifyBudgetAllocations: false,
      }),
      restrictions: JSON.stringify({
        requiresNotification: true,
        auditLog: true,
        departmentScope: true,
        monthlyLimit: true,
      }),
      isActive: true,
    },

    // MANAGER (Level 4) - Team-level system access
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.MANAGER_DATA_EXPORT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: SYSTEM_ACTION_KEY.DATA_EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        maxRecords: 25000,
        formats: ['CSV', 'XLSX'],
        includeSystemData: false,
        includeAuditLogs: false,
      }),
      restrictions: JSON.stringify({
        requiresApproval: true,
        auditLog: true,
        teamScope: true,
        timeLimit: '4h',
        dailyLimit: 3,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.MANAGER_BULK_OPERATIONS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: SYSTEM_ACTION_KEY.BULK_OPERATIONS,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBatchSize: 1000,
        allowedOperations: ['CREATE', 'UPDATE'],
        requiresConfirmation: true,
      }),
      restrictions: JSON.stringify({
        requiresApproval: true,
        approvalThreshold: 100,
        auditLog: true,
        teamScope: true,
        dailyLimit: 5,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.MANAGER_ESCALATION_APPROVE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: SYSTEM_ACTION_KEY.ESCALATION_APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxApprovalAmount: 25000,
        canOverrideDecisions: false,
        canDelegateApproval: false,
        emergencyApproval: false,
      }),
      restrictions: JSON.stringify({
        requiresNotification: true,
        auditLog: true,
        teamScope: true,
        workingHours: '8:00-18:00',
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.MANAGER_BUDGET_APPROVE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: SYSTEM_ACTION_KEY.BUDGET_APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBudgetAmount: 50000,
        canApproveCapexBudgets: false,
        canApproveOpexBudgets: true,
        canModifyBudgetAllocations: false,
      }),
      restrictions: JSON.stringify({
        requiresNotification: true,
        auditLog: true,
        teamScope: true,
        monthlyLimit: true,
        workingHours: '8:00-18:00',
      }),
      isActive: true,
    },

    // TEAM_LEAD (Level 5) - Limited system access
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.TEAM_LEAD_DATA_EXPORT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: SYSTEM_ACTION_KEY.DATA_EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        maxRecords: 5000,
        formats: ['CSV'],
        includeSystemData: false,
        includeAuditLogs: false,
      }),
      restrictions: JSON.stringify({
        requiresApproval: true,
        auditLog: true,
        teamScope: true,
        timeLimit: '2h',
        dailyLimit: 2,
        workingHours: '8:00-18:00',
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.TEAM_LEAD_ESCALATION_APPROVE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: SYSTEM_ACTION_KEY.ESCALATION_APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxApprovalAmount: 10000,
        canOverrideDecisions: false,
        canDelegateApproval: false,
        emergencyApproval: false,
      }),
      restrictions: JSON.stringify({
        requiresNotification: true,
        auditLog: true,
        teamScope: true,
        workingHours: '8:00-18:00',
        requiresSupervisorApproval: true,
      }),
      isActive: true,
    },

    // SENIOR_STAFF (Level 6) - Very limited system access
    {
      id: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_IDS.SENIOR_STAFF_DATA_EXPORT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.SENIOR_STAFF,
      actionKey: SYSTEM_ACTION_KEY.DATA_EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        maxRecords: 1000,
        formats: ['CSV'],
        includeSystemData: false,
        includeAuditLogs: false,
      }),
      restrictions: JSON.stringify({
        requiresApproval: true,
        auditLog: true,
        assignedDataOnly: true,
        timeLimit: '1h',
        dailyLimit: 1,
        workingHours: '8:00-17:00',
        requiresSupervisorApproval: true,
      }),
      isActive: true,
    },

    // JUNIOR_STAFF (Level 7) - No system actions
    // INTERN (Level 8) - No system actions
  ];
