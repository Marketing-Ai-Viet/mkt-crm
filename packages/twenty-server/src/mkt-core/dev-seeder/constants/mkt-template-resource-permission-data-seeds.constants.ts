import { PERMISSION_RESOURCE_IDS } from 'src/mkt-core/mkt-permission-template/constants/permission-resources.constants';

import { MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS } from './mkt-permission-template-data-seeds.constants';
import { MKT_PERMISSION_CONTEXT_DATA_SEED_IDS } from './mkt-permission-context-data-seeds.constants';

/**
 * Template Resource Permission Data Seeds - Simplified RBAC System (5 templates)
 * Based on RBAC_PERMISSIONS_MATRIX_GUIDE.md and RBAC_SIMPLIFIED_SETUP_GUIDE.md
 *
 * Resource access by template:
 * - ADMIN: 21/21 resources (100% - full access to all resources)
 * - MANAGER: 15/21 resources (71% - department-scoped access)
 * - TEAM_LEAD: 10/21 resources (48% - team-scoped access)
 * - STAFF: 7/21 resources (33% - own records access)
 * - INTERN: 5/21 resources (24% - read-only access)
 */

type MktTemplateResourcePermissionDataSeed = {
  id: string;
  templateId: string;
  resourceId: string;
  contextId: string | null;
  allowedActions: string; // JSON string for database storage
  deniedActions: string | null; // JSON string for database storage
  conditions: string | null; // JSON string for database storage
  restrictions: string | null; // JSON string for database storage
  isActive: boolean;
};

export const MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_COLUMNS: (keyof MktTemplateResourcePermissionDataSeed)[] =
  [
    'id',
    'templateId',
    'resourceId',
    'contextId',
    'allowedActions',
    'deniedActions',
    'conditions',
    'restrictions',
    'isActive',
  ];

/**
 * Static UUID v4 values for each template-resource combination
 * These are fixed UUIDs to ensure consistency across seeding operations
 */
const RESOURCE_PERMISSION_IDS = {
  // ADMIN template (21 resources)
  'ADMIN:CUSTOMERS': '2361b0ea-552f-4923-808e-2e46114ccec2',
  'ADMIN:ORDERS': '5becc7b4-599d-415f-9108-81a557544af7',
  'ADMIN:PRODUCTS': 'a3c4fc8d-3af6-4059-80ac-6e9197d75bc6',
  'ADMIN:USERS': 'adb5aba3-39d3-43dd-be04-3d69c4c0efd2',
  'ADMIN:DEPARTMENTS': '8261364c-8fb4-48bc-a5ea-0e317604e488',
  'ADMIN:ORGANIZATION_LEVELS': '9c962399-d863-43a3-94ea-e1c40ecfae8f',
  'ADMIN:TEAM_MANAGEMENT': 'a71f227c-df79-4b03-9baf-ec0613f7bfcd',
  'ADMIN:FINANCIAL_DATA': 'afef4a4f-9f5e-4c13-a678-c5fd503a0f5f',
  'ADMIN:SALARY_DATA': '9dcd3472-e000-4c43-a02d-476c0e9611fd',
  'ADMIN:BUDGET_DATA': 'a4515675-b619-4ca9-936f-07d081ed994b',
  'ADMIN:TRANSACTIONS': '22e43f37-fb5c-450b-9123-62b746d10a9c',
  'ADMIN:REPORTS': 'd60f0e18-7765-42d3-882e-6c590b8dc7d2',
  'ADMIN:ANALYTICS': 'c5da9f64-b297-41e5-99f6-e0bbed5f5117',
  'ADMIN:KPIS': 'bdae0aa5-7436-4a11-b4b3-08f8aeeba572',
  'ADMIN:PERFORMANCE_REVIEWS': '181b236c-5962-463d-b44e-aaba98b13ef8',
  'ADMIN:SETTINGS': '1fa4b6d5-9cf7-4f91-8b58-315f18f4c701',
  'ADMIN:WORKFLOWS': 'cd06cd00-69df-49d8-aeaa-4c573999e119',
  'ADMIN:INTEGRATIONS': '51f82b31-0c61-492e-8c9c-8fd329d36c55',
  'ADMIN:PERMISSIONS': '497a6eb0-c5cd-42b3-8cd8-a3ebd65934fe',
  'ADMIN:CONFIDENTIAL_INFO': '8bc6db72-0971-40aa-9b90-ff4d25096e51',
  'ADMIN:AUDIT_LOGS': 'd4492a75-ced1-435a-9bd7-d7865b6b9d44',

  // MANAGER template (15 resources)
  'MANAGER:CUSTOMERS': '907414c9-4dca-4b1f-9c38-798311c1a65c',
  'MANAGER:ORDERS': '8699bdca-b972-404e-a8db-15e77a304ca1',
  'MANAGER:PRODUCTS': '3a462a77-063f-4951-a2d2-482e9fa22d98',
  'MANAGER:USERS': '11149fc0-a223-46f6-b023-0d607a4fa9a3',
  'MANAGER:DEPARTMENTS': 'f176a9ad-7895-43ec-9588-e0917b1b803e',
  'MANAGER:TEAM_MANAGEMENT': '26e25c67-fd06-4165-b947-458a9352ad20',
  'MANAGER:BUDGET_DATA': '2b243aef-d912-4d50-88b0-25f6b593ad32',
  'MANAGER:TRANSACTIONS': '859189f2-9a3f-472f-83d8-63a842caa922',
  'MANAGER:REPORTS': '732e5da1-a72f-4e86-8ff6-642f632e36ce',
  'MANAGER:ANALYTICS': 'd4113e1c-4fb9-478c-913d-d83a9cc5300c',
  'MANAGER:KPIS': 'fda27910-3284-421f-ae5e-a36663d482a4',
  'MANAGER:PERFORMANCE_REVIEWS': '53bbe2bd-5c35-41a3-99f0-55a1fbcdb034',
  'MANAGER:WORKFLOWS': '5bcb61b5-fa11-4b84-87e3-cfa8800000c0',
  'MANAGER:INTEGRATIONS': 'b6ce4375-672b-4b0c-9dd1-5e6218610667',

  // TEAM_LEAD template (10 resources)
  'TEAM_LEAD:CUSTOMERS': 'ec24841c-6ce9-4c6a-99c9-1ecfa9343450',
  'TEAM_LEAD:ORDERS': '11911a91-a182-4ccb-be69-457c615a741e',
  'TEAM_LEAD:PRODUCTS': '1ac25006-5862-4924-9cbd-8e4fcaa938fa',
  'TEAM_LEAD:USERS': '17a4d3f8-7d5e-49a6-ba98-faf46e07f988',
  'TEAM_LEAD:TEAM_MANAGEMENT': 'f78876df-599c-4fbe-bc29-78f8c7eea0b3',
  'TEAM_LEAD:TRANSACTIONS': 'a17e8bd8-e44b-425c-9090-b590404ccc15',
  'TEAM_LEAD:REPORTS': 'a970bbb1-0bce-4557-8ceb-351df4e40251',
  'TEAM_LEAD:ANALYTICS': '5e557433-6344-471d-b68c-85dd831da25b',
  'TEAM_LEAD:KPIS': '5cf57add-00ab-4620-bb59-5db82632d47f',
  'TEAM_LEAD:WORKFLOWS': 'f4003aba-e462-45dd-89ff-6700cf455d1d',

  // STAFF template (7 resources)
  'STAFF:CUSTOMERS': 'd97160ca-e935-4b89-b862-94499c46edc4',
  'STAFF:ORDERS': '31ea5eab-5899-41b6-84e7-712b40544b74',
  'STAFF:PRODUCTS': 'a61bbdb6-119f-41a5-a3dd-85e8aa2eb261',
  'STAFF:TEAM_MANAGEMENT': '589f295a-a58d-4580-80be-35554c60a993',
  'STAFF:REPORTS': '9b692c96-d817-4775-abfe-515a60d5dc4c',
  'STAFF:ANALYTICS': 'd10d2a92-ed98-4df1-a713-e8ad5a4bf413',
  'STAFF:KPIS': '3a4c248b-8974-4247-b6bc-f1965175c477',

  // INTERN template (5 resources)
  'INTERN:CUSTOMERS': '099e6f94-3833-4f2b-959a-89138f3dc1c4',
  'INTERN:PRODUCTS': '1be6bcba-494b-4421-9864-efce85a1c5fb',
  'INTERN:TEAM_MANAGEMENT': 'e0c64373-792d-4399-a552-69e8610699af',
  'INTERN:REPORTS': '9e9bd9a7-c4dd-4372-a968-2a12ca52db20',
  'INTERN:ANALYTICS': 'b078b803-4e43-4a48-90b9-af836c56fc0c',
} as const;

/**
 * Template Resource Permission Data Seeds
 * Defines which resources each template can access and what actions are allowed
 */
export const MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS: MktTemplateResourcePermissionDataSeed[] =
  [
    // ==================================================================================
    // ADMIN TEMPLATE - Full access to all 21 resources
    // Priority: 1000 | Scope: ALL_RECORDS | Full CRUD + special operations
    // ==================================================================================

    // Business Data (3/3)
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:CUSTOMERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'IMPORT',
        'SHARE',
        'ARCHIVE',
        'RESTORE',
        'ASSIGN_CUSTOMER',
        'TRANSFER_CUSTOMER',
        'MERGE_CUSTOMERS',
        'CONVERT_LEAD',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_RECORDS',
        includeDeleted: true,
        includeArchived: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:ORDERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'IMPORT',
        'APPROVE',
        'REJECT',
        'ARCHIVE',
        'RESTORE',
        'CLOSE_DEAL',
        'CHANGE_DEAL_STAGE',
        'APPROVE_DISCOUNT',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_RECORDS',
        maxAmount: -1, // Unlimited
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:PRODUCTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'IMPORT',
        'PUBLISH',
        'ARCHIVE',
        'RESTORE',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_RECORDS',
      }),
      restrictions: null,
      isActive: true,
    },

    // User Management (4/4)
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:USERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.USERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'MANAGE_USERS',
        'ASSIGN_ROLES',
        'RESET_PASSWORD',
        'VIEW_USER_ACTIVITY',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_USERS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:DEPARTMENTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.DEPARTMENTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'MANAGE_TEAM',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_DEPARTMENTS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:ORGANIZATION_LEVELS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.ORGANIZATION_LEVELS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE', 'DELETE']),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_LEVELS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:TEAM_MANAGEMENT'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.TEAM_MANAGEMENT,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'MANAGE_TEAM',
        'ASSIGN_TASKS',
        'VIEW_TEAM_REPORTS',
        'CONDUCT_REVIEWS',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_TEAMS',
      }),
      restrictions: null,
      isActive: true,
    },

    // Financial (4/4)
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:FINANCIAL_DATA'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.FINANCIAL_DATA,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'VIEW_FINANCIAL_REPORTS',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_RECORDS',
        requiresMFA: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:SALARY_DATA'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.SALARY_DATA,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'ACCESS_SALARY_DATA',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_RECORDS',
        requiresMFA: true,
        auditRequired: true,
      }),
      restrictions: JSON.stringify({
        sensitivityLevel: 'CRITICAL',
        complianceRequired: true,
      }),
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:BUDGET_DATA'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.BUDGET_DATA,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'BUDGET_MANAGEMENT',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_RECORDS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:TRANSACTIONS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.TRANSACTIONS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'APPROVE',
        'REJECT',
        'APPROVE_TRANSACTIONS',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_RECORDS',
        maxAmount: -1, // Unlimited
      }),
      restrictions: null,
      isActive: true,
    },

    // Reporting (4/4)
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:REPORTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.REPORTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'CREATE_REPORT',
        'SCHEDULE_REPORT',
        'VIEW_DASHBOARD',
        'EXPORT_ANALYTICS',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_REPORTS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:ANALYTICS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.ANALYTICS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_ANALYTICS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:KPIS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.KPIS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_KPIS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:PERFORMANCE_REVIEWS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.PERFORMANCE_REVIEWS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'CONDUCT_REVIEWS',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_REVIEWS',
      }),
      restrictions: null,
      isActive: true,
    },

    // System Configuration (6/6)
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:SETTINGS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.SETTINGS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'CONFIGURE',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_SETTINGS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:WORKFLOWS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.WORKFLOWS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'CREATE_WORKFLOW',
        'BYPASS_WORKFLOW_APPROVAL',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_WORKFLOWS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:INTEGRATIONS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.INTEGRATIONS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'CONFIGURE_INTEGRATION',
        'EXECUTE_API',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_INTEGRATIONS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:PERMISSIONS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.PERMISSIONS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'ASSIGN_ROLES',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_PERMISSIONS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:CONFIDENTIAL_INFO'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.CONFIDENTIAL_INFO,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'ACCESS_SENSITIVE_DATA',
        'VIEW_CONFIDENTIAL_INFO',
      ]),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'ALL_RECORDS',
        requiresMFA: true,
        auditRequired: true,
      }),
      restrictions: JSON.stringify({
        sensitivityLevel: 'CRITICAL',
        accessLogged: true,
      }),
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['ADMIN:AUDIT_LOGS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      resourceId: PERMISSION_RESOURCE_IDS.AUDIT_LOGS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'EXPORT',
        'AUDIT',
        'VIEW_SECURITY_LOGS',
      ]),
      deniedActions: JSON.stringify(['DELETE']), // Never delete audit logs
      conditions: JSON.stringify({
        scope: 'ALL_LOGS',
      }),
      restrictions: JSON.stringify({
        retentionRequired: true,
        immutable: true,
      }),
      isActive: true,
    },

    // ==================================================================================
    // MANAGER TEMPLATE - Department-scoped access to 15/21 resources
    // Priority: 700 | Scope: DEPARTMENT_RECORDS | Limited CRUD + approvals
    // ==================================================================================

    // Business Data (3/3)
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:CUSTOMERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'EXPORT',
        'ASSIGN_CUSTOMER',
        'TRANSFER_CUSTOMER',
      ]),
      deniedActions: JSON.stringify(['DELETE', 'MERGE_CUSTOMERS']),
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_RECORDS',
        contextFilter: 'departmentId = :userDepartmentId',
      }),
      restrictions: JSON.stringify({
        workingHours: '08:00-20:00',
      }),
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:ORDERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'APPROVE',
        'CLOSE_DEAL',
        'CHANGE_DEAL_STAGE',
        'APPROVE_DISCOUNT',
      ]),
      deniedActions: JSON.stringify(['DELETE']),
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_RECORDS',
        maxAmount: {
          SALES: 50000000, // 50M VND
          ADMIN: 100000000, // 100M VND
          DEFAULT: 50000000,
        },
      }),
      // TEMPORARILY DISABLED: Restrictions for testing
      // restrictions: JSON.stringify({
      //   escalateIf: 'amount > maxAmount',
      // }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:PRODUCTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'PUBLISH',
        'ARCHIVE',
      ]),
      deniedActions: JSON.stringify(['DELETE']),
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_PRODUCTS',
        contextFilter: 'departmentId = :userDepartmentId',
      }),
      restrictions: null,
      isActive: true,
    },

    // User Management (3/4) - No ORGANIZATION_LEVELS access
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:USERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.USERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'RESET_PASSWORD',
        'VIEW_USER_ACTIVITY',
      ]),
      deniedActions: JSON.stringify(['DELETE', 'ASSIGN_ROLES']),
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_USERS',
        contextFilter: 'departmentId = :userDepartmentId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:DEPARTMENTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.DEPARTMENTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify(['READ', 'UPDATE']),
      deniedActions: JSON.stringify(['CREATE', 'DELETE']),
      conditions: JSON.stringify({
        scope: 'OWN_DEPARTMENT',
        contextFilter: 'id = :userDepartmentId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:TEAM_MANAGEMENT'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.TEAM_MANAGEMENT,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'MANAGE_TEAM',
        'ASSIGN_TASKS',
        'VIEW_TEAM_REPORTS',
        'CONDUCT_REVIEWS',
      ]),
      deniedActions: JSON.stringify(['DELETE']),
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_TEAMS',
        contextFilter: 'departmentId = :userDepartmentId',
      }),
      restrictions: null,
      isActive: true,
    },

    // Financial (2/4) - No SALARY_DATA, limited BUDGET_DATA
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:BUDGET_DATA'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.BUDGET_DATA,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify(['READ', 'UPDATE', 'BUDGET_MANAGEMENT']),
      deniedActions: JSON.stringify(['CREATE', 'DELETE']),
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_BUDGET',
        contextFilter: 'departmentId = :userDepartmentId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:TRANSACTIONS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.TRANSACTIONS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'APPROVE',
        'APPROVE_TRANSACTIONS',
      ]),
      deniedActions: JSON.stringify(['DELETE']),
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_RECORDS',
        maxAmount: {
          SALES: 50000000,
          ADMIN: 100000000,
          DEFAULT: 50000000,
        },
      }),
      // TEMPORARILY DISABLED: Restrictions for testing
      // restrictions: JSON.stringify({
      //   escalateIf: 'amount > maxAmount',
      // }),
      restrictions: null,
      isActive: true,
    },

    // Reporting (4/4)
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:REPORTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.REPORTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'EXPORT',
        'CREATE_REPORT',
        'SCHEDULE_REPORT',
        'VIEW_DASHBOARD',
      ]),
      deniedActions: JSON.stringify(['DELETE']),
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_REPORTS',
        contextFilter: 'departmentId = :userDepartmentId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:ANALYTICS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.ANALYTICS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify(['READ', 'EXPORT']),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_ANALYTICS',
        contextFilter: 'departmentId = :userDepartmentId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:KPIS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.KPIS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE', 'EXPORT']),
      deniedActions: JSON.stringify(['DELETE']),
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_KPIS',
        contextFilter: 'departmentId = :userDepartmentId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:PERFORMANCE_REVIEWS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.PERFORMANCE_REVIEWS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'CONDUCT_REVIEWS',
      ]),
      deniedActions: JSON.stringify(['DELETE']),
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_REVIEWS',
        contextFilter:
          'revieweeId IN (SELECT id FROM users WHERE departmentId = :userDepartmentId)',
      }),
      restrictions: null,
      isActive: true,
    },

    // System Configuration (2/6) - Only WORKFLOWS and limited access
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:WORKFLOWS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.WORKFLOWS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE']),
      deniedActions: JSON.stringify(['DELETE', 'BYPASS_WORKFLOW_APPROVAL']),
      conditions: JSON.stringify({
        scope: 'DEPARTMENT_WORKFLOWS',
        simpleWorkflowsOnly: true,
      }),
      restrictions: JSON.stringify({
        complexityLimit: 'MEDIUM',
      }),
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['MANAGER:INTEGRATIONS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.INTEGRATIONS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: JSON.stringify([
        'CREATE',
        'UPDATE',
        'DELETE',
        'CONFIGURE_INTEGRATION',
        'EXECUTE_API',
      ]),
      conditions: JSON.stringify({
        scope: 'VIEW_ONLY',
      }),
      restrictions: null,
      isActive: true,
    },

    // ==================================================================================
    // TEAM_LEAD TEMPLATE - Team-scoped access to 10/21 resources
    // Priority: 600 | Scope: TEAM_RECORDS | Basic CRUD + team management
    // ==================================================================================

    // Business Data (3/3)
    {
      id: RESOURCE_PERMISSION_IDS['TEAM_LEAD:CUSTOMERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'EXPORT',
        'ASSIGN_CUSTOMER',
      ]),
      deniedActions: JSON.stringify(['DELETE', 'TRANSFER_CUSTOMER']),
      conditions: JSON.stringify({
        scope: 'TEAM_RECORDS',
        contextFilter: 'teamId = :userTeamId',
      }),
      restrictions: JSON.stringify({
        workingHours: '08:00-18:00',
        maxRecordsPerDay: 100,
      }),
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['TEAM_LEAD:ORDERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'CLOSE_DEAL',
        'CHANGE_DEAL_STAGE',
      ]),
      deniedActions: JSON.stringify(['DELETE', 'APPROVE_DISCOUNT']),
      conditions: JSON.stringify({
        scope: 'TEAM_RECORDS',
        maxAmount: 20000000, // 20M VND
      }),
      // TEMPORARILY DISABLED: Restrictions for testing
      // restrictions: JSON.stringify({
      //   escalateIf: 'amount > 20000000',
      // }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['TEAM_LEAD:PRODUCTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      allowedActions: JSON.stringify(['READ', 'UPDATE']),
      deniedActions: JSON.stringify(['CREATE', 'DELETE', 'PUBLISH']),
      conditions: JSON.stringify({
        scope: 'TEAM_PRODUCTS',
        contextFilter: 'assignedTeamId = :userTeamId',
      }),
      restrictions: null,
      isActive: true,
    },

    // User Management (2/4) - No DEPARTMENTS, ORGANIZATION_LEVELS access
    {
      id: RESOURCE_PERMISSION_IDS['TEAM_LEAD:USERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.USERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      allowedActions: JSON.stringify(['READ', 'VIEW_USER_ACTIVITY']),
      deniedActions: JSON.stringify([
        'CREATE',
        'UPDATE',
        'DELETE',
        'ASSIGN_ROLES',
      ]),
      conditions: JSON.stringify({
        scope: 'TEAM_MEMBERS',
        contextFilter: 'teamId = :userTeamId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['TEAM_LEAD:TEAM_MANAGEMENT'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.TEAM_MANAGEMENT,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'UPDATE',
        'MANAGE_TEAM',
        'ASSIGN_TASKS',
        'VIEW_TEAM_REPORTS',
      ]),
      deniedActions: JSON.stringify(['CREATE', 'DELETE', 'CONDUCT_REVIEWS']),
      conditions: JSON.stringify({
        scope: 'OWN_TEAM',
        contextFilter: 'id = :userTeamId',
      }),
      restrictions: null,
      isActive: true,
    },

    // Financial (1/4) - Only TRANSACTIONS with limits
    {
      id: RESOURCE_PERMISSION_IDS['TEAM_LEAD:TRANSACTIONS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.TRANSACTIONS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      allowedActions: JSON.stringify(['READ', 'CREATE']),
      deniedActions: JSON.stringify([
        'UPDATE',
        'DELETE',
        'APPROVE',
        'APPROVE_TRANSACTIONS',
      ]),
      conditions: JSON.stringify({
        scope: 'TEAM_RECORDS',
        maxAmount: 20000000,
        requiresApproval: true,
      }),
      restrictions: JSON.stringify({
        approverLevel: 'MANAGER',
      }),
      isActive: true,
    },

    // Reporting (3/4) - No PERFORMANCE_REVIEWS
    {
      id: RESOURCE_PERMISSION_IDS['TEAM_LEAD:REPORTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.REPORTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'EXPORT',
        'CREATE_REPORT',
        'VIEW_DASHBOARD',
      ]),
      deniedActions: JSON.stringify(['UPDATE', 'DELETE', 'SCHEDULE_REPORT']),
      conditions: JSON.stringify({
        scope: 'TEAM_REPORTS',
        contextFilter: 'teamId = :userTeamId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['TEAM_LEAD:ANALYTICS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.ANALYTICS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'TEAM_ANALYTICS',
        contextFilter: 'teamId = :userTeamId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['TEAM_LEAD:KPIS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.KPIS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      allowedActions: JSON.stringify(['READ', 'UPDATE']),
      deniedActions: JSON.stringify(['CREATE', 'DELETE']),
      conditions: JSON.stringify({
        scope: 'TEAM_KPIS',
        contextFilter: 'teamId = :userTeamId',
      }),
      restrictions: null,
      isActive: true,
    },

    // System Configuration (1/6) - No access to system configs
    {
      id: RESOURCE_PERMISSION_IDS['TEAM_LEAD:WORKFLOWS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.WORKFLOWS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: JSON.stringify([
        'CREATE',
        'UPDATE',
        'DELETE',
        'BYPASS_WORKFLOW_APPROVAL',
      ]),
      conditions: JSON.stringify({
        scope: 'TEAM_WORKFLOWS',
        viewOnly: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // ==================================================================================
    // STAFF TEMPLATE - Own records access to 7/21 resources
    // Priority: 500 | Scope: OWN_RECORDS | Basic operations only
    // ==================================================================================

    // Business Data (3/3)
    {
      id: RESOURCE_PERMISSION_IDS['STAFF:CUSTOMERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE', 'EXPORT']),
      deniedActions: JSON.stringify(['DELETE', 'ASSIGN_CUSTOMER']),
      conditions: JSON.stringify({
        scope: 'OWN_RECORDS',
        contextFilter: 'assignedTo = :userId OR createdBy = :userId',
      }),
      restrictions: JSON.stringify({
        workingHours: '08:00-18:00',
        maxRecordsPerDay: 50,
      }),
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['STAFF:ORDERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE']),
      deniedActions: JSON.stringify([
        'DELETE',
        'APPROVE',
        'CLOSE_DEAL',
        'APPROVE_DISCOUNT',
      ]),
      conditions: JSON.stringify({
        scope: 'OWN_RECORDS',
        maxAmount: 10000000, // 10M VND
      }),
      // TEMPORARILY DISABLED: Restrictions for testing
      // restrictions: JSON.stringify({
      //   escalateIf: 'amount > 10000000',
      //   requiresApproval: true,
      // }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['STAFF:PRODUCTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: JSON.stringify(['CREATE', 'UPDATE', 'DELETE']),
      conditions: JSON.stringify({
        scope: 'PUBLIC_PRODUCTS',
        publicDataOnly: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // User Management (1/4) - Only TEAM_MANAGEMENT view
    {
      id: RESOURCE_PERMISSION_IDS['STAFF:TEAM_MANAGEMENT'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.TEAM_MANAGEMENT,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: JSON.stringify([
        'CREATE',
        'UPDATE',
        'DELETE',
        'MANAGE_TEAM',
      ]),
      conditions: JSON.stringify({
        scope: 'OWN_TEAM_VIEW',
        viewOnly: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // Financial (0/4) - No financial access

    // Reporting (3/4) - Basic reporting only
    {
      id: RESOURCE_PERMISSION_IDS['STAFF:REPORTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.REPORTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'CREATE_REPORT',
        'VIEW_DASHBOARD',
      ]),
      deniedActions: JSON.stringify([
        'UPDATE',
        'DELETE',
        'EXPORT',
        'SCHEDULE_REPORT',
      ]),
      conditions: JSON.stringify({
        scope: 'OWN_REPORTS',
        contextFilter: 'createdBy = :userId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['STAFF:ANALYTICS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.ANALYTICS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'OWN_ANALYTICS',
        basicOnly: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['STAFF:KPIS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.KPIS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: JSON.stringify(['CREATE', 'UPDATE', 'DELETE']),
      conditions: JSON.stringify({
        scope: 'OWN_KPIS',
        viewOnly: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // System Configuration (0/6) - No system access

    // ==================================================================================
    // INTERN TEMPLATE - Limited read-only access to 5/21 resources
    // Priority: 300 | Scope: OWN_RECORDS (Read-only) | Training mode
    // ==================================================================================

    // Business Data (2/3) - No ORDERS access
    {
      id: RESOURCE_PERMISSION_IDS['INTERN:CUSTOMERS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: JSON.stringify(['CREATE', 'UPDATE', 'DELETE']),
      conditions: JSON.stringify({
        scope: 'OWN_RECORDS',
        contextFilter: 'assignedTo = :userId',
        publicDataOnly: true,
        requiresSupervisorApproval: true,
      }),
      restrictions: JSON.stringify({
        workingHours: '09:00-17:00',
        maxRecordsPerDay: 10,
        monitoringEnabled: true,
      }),
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['INTERN:PRODUCTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: JSON.stringify(['CREATE', 'UPDATE', 'DELETE']),
      conditions: JSON.stringify({
        scope: 'PUBLIC_PRODUCTS',
        publicDataOnly: true,
        trainingModeOnly: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // User Management (1/4) - Team view only
    {
      id: RESOURCE_PERMISSION_IDS['INTERN:TEAM_MANAGEMENT'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      resourceId: PERMISSION_RESOURCE_IDS.TEAM_MANAGEMENT,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: JSON.stringify([
        'CREATE',
        'UPDATE',
        'DELETE',
        'MANAGE_TEAM',
      ]),
      conditions: JSON.stringify({
        scope: 'OWN_TEAM_VIEW',
        viewOnly: true,
        trainingMode: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // Financial (0/4) - No financial access

    // Reporting (2/4) - Basic view only
    {
      id: RESOURCE_PERMISSION_IDS['INTERN:REPORTS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      resourceId: PERMISSION_RESOURCE_IDS.REPORTS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify(['READ', 'VIEW_DASHBOARD']),
      deniedActions: JSON.stringify([
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'CREATE_REPORT',
      ]),
      conditions: JSON.stringify({
        scope: 'PUBLIC_REPORTS',
        trainingReportsOnly: true,
        requiresSupervisorApproval: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: RESOURCE_PERMISSION_IDS['INTERN:ANALYTICS'],
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      resourceId: PERMISSION_RESOURCE_IDS.ANALYTICS,
      contextId: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'TRAINING_ANALYTICS',
        basicOnly: true,
        trainingMode: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // System Configuration (0/6) - No system access
  ];
