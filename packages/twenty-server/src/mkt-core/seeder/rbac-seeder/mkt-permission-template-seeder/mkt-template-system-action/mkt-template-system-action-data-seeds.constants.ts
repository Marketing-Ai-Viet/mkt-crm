/**
 * Template System Action Seed Data Constants
 *
 * System-level actions that templates can be granted
 * Examples: user management, API access, bulk operations, etc.
 */

import { MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-template/mkt-permission-template-data-seeds.constants';

const TEMPLATES = MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS;

// System Action Keys
const SYSTEM_ACTION_KEYS = {
  // User Management
  MANAGE_USERS: 'system:manage_users',
  INVITE_USERS: 'system:invite_users',
  REMOVE_USERS: 'system:remove_users',
  ASSIGN_ROLES: 'system:assign_roles',

  // Workspace Settings
  MANAGE_SETTINGS: 'system:manage_settings',
  MANAGE_INTEGRATIONS: 'system:manage_integrations',
  MANAGE_BILLING: 'system:manage_billing',

  // Data Operations
  BULK_EXPORT: 'system:bulk_export',
  BULK_IMPORT: 'system:bulk_import',
  BULK_DELETE: 'system:bulk_delete',

  // API Access
  API_ACCESS: 'system:api_access',
  WEBHOOK_MANAGEMENT: 'system:webhook_management',

  // Audit & Compliance
  VIEW_AUDIT_LOGS: 'system:view_audit_logs',
  MANAGE_COMPLIANCE: 'system:manage_compliance',

  // Admin Functions
  IMPERSONATE_USER: 'system:impersonate_user',
  SYSTEM_ADMINISTRATION: 'system:administration',
} as const;

type MktTemplateSystemActionDataSeed = {
  id: string;
  templateId: string;
  actionKey: string;
  isAllowed: boolean;
  configuration: object | null;
  restrictions: object | null;
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

// Pre-generated UUIDs for consistent seed data
export const MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS_IDS = {
  // CEO Template - All system actions allowed
  CEO_MANAGE_USERS: '44444444-0001-4000-8000-000000000001',
  CEO_INVITE_USERS: '44444444-0001-4000-8000-000000000002',
  CEO_REMOVE_USERS: '44444444-0001-4000-8000-000000000003',
  CEO_ASSIGN_ROLES: '44444444-0001-4000-8000-000000000004',
  CEO_MANAGE_SETTINGS: '44444444-0001-4000-8000-000000000005',
  CEO_MANAGE_INTEGRATIONS: '44444444-0001-4000-8000-000000000006',
  CEO_MANAGE_BILLING: '44444444-0001-4000-8000-000000000007',
  CEO_BULK_EXPORT: '44444444-0001-4000-8000-000000000008',
  CEO_BULK_IMPORT: '44444444-0001-4000-8000-000000000009',
  CEO_BULK_DELETE: '44444444-0001-4000-8000-000000000010',
  CEO_API_ACCESS: '44444444-0001-4000-8000-000000000011',
  CEO_WEBHOOK_MANAGEMENT: '44444444-0001-4000-8000-000000000012',
  CEO_VIEW_AUDIT_LOGS: '44444444-0001-4000-8000-000000000013',
  CEO_MANAGE_COMPLIANCE: '44444444-0001-4000-8000-000000000014',
  CEO_IMPERSONATE_USER: '44444444-0001-4000-8000-000000000015',
  CEO_SYSTEM_ADMINISTRATION: '44444444-0001-4000-8000-000000000016',

  // VP Template - Most system actions except critical admin
  VP_MANAGE_USERS: '44444444-0002-4000-8000-000000000001',
  VP_INVITE_USERS: '44444444-0002-4000-8000-000000000002',
  VP_REMOVE_USERS: '44444444-0002-4000-8000-000000000003',
  VP_ASSIGN_ROLES: '44444444-0002-4000-8000-000000000004',
  VP_MANAGE_SETTINGS: '44444444-0002-4000-8000-000000000005',
  VP_MANAGE_INTEGRATIONS: '44444444-0002-4000-8000-000000000006',
  VP_BULK_EXPORT: '44444444-0002-4000-8000-000000000007',
  VP_BULK_IMPORT: '44444444-0002-4000-8000-000000000008',
  VP_API_ACCESS: '44444444-0002-4000-8000-000000000009',
  VP_VIEW_AUDIT_LOGS: '44444444-0002-4000-8000-000000000010',

  // Director Template - User and data management
  DIRECTOR_INVITE_USERS: '44444444-0003-4000-8000-000000000001',
  DIRECTOR_ASSIGN_ROLES: '44444444-0003-4000-8000-000000000002',
  DIRECTOR_BULK_EXPORT: '44444444-0003-4000-8000-000000000003',
  DIRECTOR_BULK_IMPORT: '44444444-0003-4000-8000-000000000004',
  DIRECTOR_API_ACCESS: '44444444-0003-4000-8000-000000000005',
  DIRECTOR_VIEW_AUDIT_LOGS: '44444444-0003-4000-8000-000000000006',

  // Manager Template - Team management and data
  MANAGER_INVITE_USERS: '44444444-0004-4000-8000-000000000001',
  MANAGER_BULK_EXPORT: '44444444-0004-4000-8000-000000000002',
  MANAGER_BULK_IMPORT: '44444444-0004-4000-8000-000000000003',
  MANAGER_API_ACCESS: '44444444-0004-4000-8000-000000000004',

  // Team Lead Template - Limited system actions
  TEAM_LEAD_INVITE_USERS: '44444444-0005-4000-8000-000000000001',
  TEAM_LEAD_BULK_EXPORT: '44444444-0005-4000-8000-000000000002',
  TEAM_LEAD_API_ACCESS: '44444444-0005-4000-8000-000000000003',

  // Senior Template - Basic system actions
  SENIOR_BULK_EXPORT: '44444444-0006-4000-8000-000000000001',
  SENIOR_API_ACCESS: '44444444-0006-4000-8000-000000000002',

  // Junior Template - Very limited
  JUNIOR_API_ACCESS: '44444444-0007-4000-8000-000000000001',

  // Finance Analyst - Export for reporting
  FINANCE_ANALYST_BULK_EXPORT: '44444444-0010-4000-8000-000000000001',
  FINANCE_ANALYST_API_ACCESS: '44444444-0010-4000-8000-000000000002',
  FINANCE_ANALYST_VIEW_AUDIT_LOGS: '44444444-0010-4000-8000-000000000003',
};

const IDS = MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS_IDS;

export const MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS: MktTemplateSystemActionDataSeed[] =
  [
    // ============================================
    // CEO Template - Full system access
    // ============================================
    {
      id: IDS.CEO_MANAGE_USERS,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.MANAGE_USERS,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_INVITE_USERS,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.INVITE_USERS,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_REMOVE_USERS,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.REMOVE_USERS,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_ASSIGN_ROLES,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.ASSIGN_ROLES,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_MANAGE_SETTINGS,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.MANAGE_SETTINGS,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_MANAGE_INTEGRATIONS,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.MANAGE_INTEGRATIONS,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_MANAGE_BILLING,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.MANAGE_BILLING,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_BULK_EXPORT,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.BULK_EXPORT,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_BULK_IMPORT,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.BULK_IMPORT,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_BULK_DELETE,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.BULK_DELETE,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_API_ACCESS,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.API_ACCESS,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_WEBHOOK_MANAGEMENT,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.WEBHOOK_MANAGEMENT,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_VIEW_AUDIT_LOGS,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.VIEW_AUDIT_LOGS,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_MANAGE_COMPLIANCE,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.MANAGE_COMPLIANCE,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_IMPERSONATE_USER,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.IMPERSONATE_USER,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.CEO_SYSTEM_ADMINISTRATION,
      templateId: TEMPLATES.CEO,
      actionKey: SYSTEM_ACTION_KEYS.SYSTEM_ADMINISTRATION,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },

    // ============================================
    // VP Template - Most actions except critical admin
    // ============================================
    {
      id: IDS.VP_MANAGE_USERS,
      templateId: TEMPLATES.VP,
      actionKey: SYSTEM_ACTION_KEYS.MANAGE_USERS,
      isAllowed: true,
      configuration: { scope: 'division' },
      restrictions: { excludeAdmins: true },
      isActive: true,
    },
    {
      id: IDS.VP_INVITE_USERS,
      templateId: TEMPLATES.VP,
      actionKey: SYSTEM_ACTION_KEYS.INVITE_USERS,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.VP_REMOVE_USERS,
      templateId: TEMPLATES.VP,
      actionKey: SYSTEM_ACTION_KEYS.REMOVE_USERS,
      isAllowed: true,
      configuration: { scope: 'division' },
      restrictions: { excludeAdmins: true },
      isActive: true,
    },
    {
      id: IDS.VP_ASSIGN_ROLES,
      templateId: TEMPLATES.VP,
      actionKey: SYSTEM_ACTION_KEYS.ASSIGN_ROLES,
      isAllowed: true,
      configuration: { maxLevel: 3 },
      restrictions: { excludeAdminRoles: true },
      isActive: true,
    },
    {
      id: IDS.VP_MANAGE_SETTINGS,
      templateId: TEMPLATES.VP,
      actionKey: SYSTEM_ACTION_KEYS.MANAGE_SETTINGS,
      isAllowed: true,
      configuration: { scope: 'division' },
      restrictions: { excludeSystemSettings: true },
      isActive: true,
    },
    {
      id: IDS.VP_MANAGE_INTEGRATIONS,
      templateId: TEMPLATES.VP,
      actionKey: SYSTEM_ACTION_KEYS.MANAGE_INTEGRATIONS,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.VP_BULK_EXPORT,
      templateId: TEMPLATES.VP,
      actionKey: SYSTEM_ACTION_KEYS.BULK_EXPORT,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.VP_BULK_IMPORT,
      templateId: TEMPLATES.VP,
      actionKey: SYSTEM_ACTION_KEYS.BULK_IMPORT,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.VP_API_ACCESS,
      templateId: TEMPLATES.VP,
      actionKey: SYSTEM_ACTION_KEYS.API_ACCESS,
      isAllowed: true,
      configuration: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.VP_VIEW_AUDIT_LOGS,
      templateId: TEMPLATES.VP,
      actionKey: SYSTEM_ACTION_KEYS.VIEW_AUDIT_LOGS,
      isAllowed: true,
      configuration: { scope: 'division' },
      restrictions: null,
      isActive: true,
    },

    // ============================================
    // Director Template - Department management
    // ============================================
    {
      id: IDS.DIRECTOR_INVITE_USERS,
      templateId: TEMPLATES.DIRECTOR,
      actionKey: SYSTEM_ACTION_KEYS.INVITE_USERS,
      isAllowed: true,
      configuration: { scope: 'department' },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.DIRECTOR_ASSIGN_ROLES,
      templateId: TEMPLATES.DIRECTOR,
      actionKey: SYSTEM_ACTION_KEYS.ASSIGN_ROLES,
      isAllowed: true,
      configuration: { maxLevel: 5 },
      restrictions: { excludeManagementRoles: true },
      isActive: true,
    },
    {
      id: IDS.DIRECTOR_BULK_EXPORT,
      templateId: TEMPLATES.DIRECTOR,
      actionKey: SYSTEM_ACTION_KEYS.BULK_EXPORT,
      isAllowed: true,
      configuration: { scope: 'department' },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.DIRECTOR_BULK_IMPORT,
      templateId: TEMPLATES.DIRECTOR,
      actionKey: SYSTEM_ACTION_KEYS.BULK_IMPORT,
      isAllowed: true,
      configuration: { scope: 'department' },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.DIRECTOR_API_ACCESS,
      templateId: TEMPLATES.DIRECTOR,
      actionKey: SYSTEM_ACTION_KEYS.API_ACCESS,
      isAllowed: true,
      configuration: { readOnly: false },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.DIRECTOR_VIEW_AUDIT_LOGS,
      templateId: TEMPLATES.DIRECTOR,
      actionKey: SYSTEM_ACTION_KEYS.VIEW_AUDIT_LOGS,
      isAllowed: true,
      configuration: { scope: 'department' },
      restrictions: null,
      isActive: true,
    },

    // ============================================
    // Manager Template - Team management
    // ============================================
    {
      id: IDS.MANAGER_INVITE_USERS,
      templateId: TEMPLATES.MANAGER,
      actionKey: SYSTEM_ACTION_KEYS.INVITE_USERS,
      isAllowed: true,
      configuration: { scope: 'team', requiresApproval: true },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.MANAGER_BULK_EXPORT,
      templateId: TEMPLATES.MANAGER,
      actionKey: SYSTEM_ACTION_KEYS.BULK_EXPORT,
      isAllowed: true,
      configuration: { scope: 'team' },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.MANAGER_BULK_IMPORT,
      templateId: TEMPLATES.MANAGER,
      actionKey: SYSTEM_ACTION_KEYS.BULK_IMPORT,
      isAllowed: true,
      configuration: { scope: 'team', requiresReview: true },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.MANAGER_API_ACCESS,
      templateId: TEMPLATES.MANAGER,
      actionKey: SYSTEM_ACTION_KEYS.API_ACCESS,
      isAllowed: true,
      configuration: { readOnly: false },
      restrictions: null,
      isActive: true,
    },

    // ============================================
    // Team Lead Template - Limited system actions
    // ============================================
    {
      id: IDS.TEAM_LEAD_INVITE_USERS,
      templateId: TEMPLATES.TEAM_LEAD,
      actionKey: SYSTEM_ACTION_KEYS.INVITE_USERS,
      isAllowed: true,
      configuration: { scope: 'team', requiresApproval: true },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.TEAM_LEAD_BULK_EXPORT,
      templateId: TEMPLATES.TEAM_LEAD,
      actionKey: SYSTEM_ACTION_KEYS.BULK_EXPORT,
      isAllowed: true,
      configuration: { scope: 'team' },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.TEAM_LEAD_API_ACCESS,
      templateId: TEMPLATES.TEAM_LEAD,
      actionKey: SYSTEM_ACTION_KEYS.API_ACCESS,
      isAllowed: true,
      configuration: { readOnly: true },
      restrictions: null,
      isActive: true,
    },

    // ============================================
    // Senior Template - Basic system actions
    // ============================================
    {
      id: IDS.SENIOR_BULK_EXPORT,
      templateId: TEMPLATES.SENIOR,
      actionKey: SYSTEM_ACTION_KEYS.BULK_EXPORT,
      isAllowed: true,
      configuration: { scope: 'own' },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.SENIOR_API_ACCESS,
      templateId: TEMPLATES.SENIOR,
      actionKey: SYSTEM_ACTION_KEYS.API_ACCESS,
      isAllowed: true,
      configuration: { readOnly: true },
      restrictions: null,
      isActive: true,
    },

    // ============================================
    // Junior Template - Very limited
    // ============================================
    {
      id: IDS.JUNIOR_API_ACCESS,
      templateId: TEMPLATES.JUNIOR,
      actionKey: SYSTEM_ACTION_KEYS.API_ACCESS,
      isAllowed: true,
      configuration: { readOnly: true },
      restrictions: { limitedEndpoints: true },
      isActive: true,
    },

    // ============================================
    // Finance Analyst Template - Export and audit
    // ============================================
    {
      id: IDS.FINANCE_ANALYST_BULK_EXPORT,
      templateId: TEMPLATES.FINANCE_ANALYST,
      actionKey: SYSTEM_ACTION_KEYS.BULK_EXPORT,
      isAllowed: true,
      configuration: { includeFinancialData: true },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.FINANCE_ANALYST_API_ACCESS,
      templateId: TEMPLATES.FINANCE_ANALYST,
      actionKey: SYSTEM_ACTION_KEYS.API_ACCESS,
      isAllowed: true,
      configuration: { readOnly: false, financialEndpoints: true },
      restrictions: null,
      isActive: true,
    },
    {
      id: IDS.FINANCE_ANALYST_VIEW_AUDIT_LOGS,
      templateId: TEMPLATES.FINANCE_ANALYST,
      actionKey: SYSTEM_ACTION_KEYS.VIEW_AUDIT_LOGS,
      isAllowed: true,
      configuration: { financialLogsOnly: true },
      restrictions: null,
      isActive: true,
    },
  ];
