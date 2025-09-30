import { MKT_DEPARTMENT_DATA_SEEDS_IDS } from './mkt-department-data-seeds.constants';

/**
 * Simplified Data Access Policy for 4 core departments
 * Based on RBAC_SIMPLIFIED_SETUP_GUIDE.md
 */
type MktDataAccessPolicyDataSeed = {
  id: string;
  name: string;
  description?: string;
  departmentId?: string | null;
  specificMemberId?: string | null;
  organizationLevelId?: string | null;
  minHierarchyLevel?: number | null;
  maxHierarchyLevel?: number | null;
  permissionTemplateId?: string | null;
  objectName: string;
  filterConditions: object;
  priority?: number;
  isActive?: boolean;
  position: number;
};

export const MKT_DATA_ACCESS_POLICY_DATA_SEED_COLUMNS: (keyof MktDataAccessPolicyDataSeed)[] =
  [
    'id',
    'name',
    'description',
    'departmentId',
    'specificMemberId',
    'organizationLevelId',
    'minHierarchyLevel',
    'maxHierarchyLevel',
    'permissionTemplateId',
    'objectName',
    'filterConditions',
    'priority',
    'isActive',
    'position',
  ];

export const MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS = {
  // Department-based policies for 4 core departments
  SALES_CUSTOMER_ACCESS: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
  SALES_ORDER_OWNERSHIP: 'b2c3d4e5-f6a7-8b9c-0d1e-f2a3b4c5d6e7',
  SUPPORT_CUSTOMER_ACCESS: 'c3d4e5f6-a7b8-9c0d-1e2f-a3b4c5d6e7f8',
  ACCOUNTING_INVOICE_ACCESS: 'd4e5f6a7-b8c9-0d1e-2f3a-b4c5d6e7f8a9',
  ADMIN_FULL_ACCESS: 'e5f6a7b8-c9d0-1e2f-3a4b-c5d6e7f8a9b0',
};

export const MKT_DATA_ACCESS_POLICY_OBJECT_NAMES = {
  MKT_CUSTOMER: 'mktCustomer',
  MKT_ORDER: 'mktOrder',
  MKT_INVOICE: 'mktInvoice',
  MKT_LICENSE: 'mktLicense',
  MKT_KPI: 'mktKpi',
  MKT_PRODUCT: 'mktProduct',
  WORKSPACE_MEMBER: 'workspaceMember',
  MKT_CONTRACT: 'mktContract',
};

/**
 * Simplified Data Access Policies - Only 5 policies for 4 departments
 * Based on RBAC_SIMPLIFIED_SETUP_GUIDE.md
 */
export const MKT_DATA_ACCESS_POLICY_DATA_SEEDS: MktDataAccessPolicyDataSeed[] =
  [
    // ================= SALES DEPARTMENT POLICIES =================

    // Policy 1: Sales Customer Ownership
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SALES_CUSTOMER_ACCESS,
      name: 'Sales Customer Ownership Policy',
      description:
        'Sales team members can only access customers assigned to them (accountOwnerId filter)',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_CUSTOMER,
      filterConditions: {
        ownership: {
          enabled: true,
          field: 'accountOwnerId',
          allowShared: false,
        },
        status: {
          allowedValues: ['active', 'prospect', 'lead'],
          deniedValues: ['archived', 'blocked'],
        },
      },
      priority: 10,
      isActive: true,
      position: 1,
    },

    // Policy 2: Sales Order Access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SALES_ORDER_OWNERSHIP,
      name: 'Sales Order Access Policy',
      description:
        'Sales team can access orders from their customers only (accountOwnerId filter)',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_ORDER,
      filterConditions: {
        ownership: {
          enabled: true,
          field: 'accountOwnerId',
          allowShared: true,
        },
        timeRange: {
          field: 'createdAt',
          daysBack: 365, // Access orders from last year
        },
        status: {
          deniedValues: ['deleted', 'void'],
        },
      },
      priority: 8,
      isActive: true,
      position: 2,
    },

    // ================= SUPPORT DEPARTMENT POLICY =================

    // Policy 3: Support Customer Access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SUPPORT_CUSTOMER_ACCESS,
      name: 'Support Customer Access Policy',
      description:
        'Support team can access customers with active support tickets only',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_CUSTOMER,
      filterConditions: {
        timeRange: {
          field: 'updatedAt',
          daysBack: 90, // Only recent interactions
        },
        status: {
          allowedValues: ['active', 'pending_support'],
          deniedValues: ['archived'],
        },
        supportLevel: {
          enabled: true,
          maxLevel: 'tier2', // Tier 1 and 2 support only
        },
      },
      priority: 7,
      isActive: true,
      position: 3,
    },

    // ================= ACCOUNTING DEPARTMENT POLICY =================

    // Policy 4: Accounting Invoice Access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.ACCOUNTING_INVOICE_ACCESS,
      name: 'Accounting Invoice Access Policy',
      description:
        'Accounting team can access all invoices for financial management',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_INVOICE,
      filterConditions: {
        amount: {
          minValue: 0,
          maxValue: 10000000, // Up to 10M currency units
        },
        status: {
          allowedValues: ['draft', 'sent', 'paid', 'overdue'],
          deniedValues: ['void'],
        },
        confidential: {
          enabled: true, // Accounting can access confidential invoices
          auditRequired: true,
        },
      },
      priority: 9,
      isActive: true,
      position: 4,
    },

    // ================= ADMIN DEPARTMENT POLICY =================

    // Policy 5: Admin Full Access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.ADMIN_FULL_ACCESS,
      name: 'Admin Full System Access Policy',
      description:
        'Admin team has unrestricted access to all data with full audit logging',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: '*', // All objects
      filterConditions: {
        accessLevel: 'full',
        restrictions: {
          timeLimit: false,
          amountLimit: false,
          confidentialAccess: true,
          auditRequired: true,
        },
      },
      priority: 100, // Highest priority
      isActive: true,
      position: 5,
    },
  ];
