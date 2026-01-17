import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';
import { MKT_DEPARTMENT_DATA_SEEDS_IDS } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import { RBAC_RESOURCE_KEY } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import { getEntityName } from 'src/mkt-core/mkt-rbac-enterprise-grade/utils/resource-mapper.utils';

type MktDataAccessPolicyDataSeed = {
  id: string;
  name: string;
  description?: string;
  departmentId?: string | null;
  specificMemberId?: string | null;
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
    'objectName',
    'filterConditions',
    'priority',
    'isActive',
    'position',
  ];

export const MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS = {
  SALES_CUSTOMER_ACCESS: '60940c20-89bf-484e-a694-44b5c02ea86d',
  SALES_ORDER_OWNERSHIP: '032cbac7-458f-4c28-ac07-7c7184f415d7',
  SUPPORT_TICKET_TIME_LIMIT: '7f745bda-0c58-4d5b-95fd-68ec8fe3b4bc',
  ACCOUNTING_INVOICE_FILTER: '7d222e6d-97e3-4b8b-9657-0e41a6c4569e',
  HR_CONFIDENTIAL_ACCESS: '2a957af1-13c4-47f6-a5ab-dfa80f37d24d',
  TECH_SYSTEM_ADMIN: '0a8e610a-a9fe-4044-a528-fa006281c858',
  MANAGER_TEAM_VIEW: 'f9eb4279-af8b-42ee-b5cb-d74904a1f8af',
  DEPARTMENT_HEAD_POLICY: 'fea20581-d433-4a05-9f4a-fa35519ad842',
};

export const MKT_DATA_ACCESS_POLICY_DATA_SEEDS: MktDataAccessPolicyDataSeed[] =
  [
    // Sales department: Customer ownership policy
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SALES_CUSTOMER_ACCESS,
      name: 'Sales Customer Ownership Policy',
      description:
        'Sales team members can only access customers assigned to them',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      specificMemberId: null,
      objectName: getEntityName(RBAC_RESOURCE_KEY.CUSTOMER),
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

    // Sales department: Order hierarchy access policy
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SALES_ORDER_OWNERSHIP,
      name: 'Sales Order Hierarchy Access Policy',
      description:
        'Phân quyền đơn hàng theo cấp bậc: Staff xem đơn mình tạo, Manager xem đơn cấp dưới, cấp trên xem toàn chuỗi, peer manager không xem được đơn của nhau',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      specificMemberId: null,
      objectName: getEntityName(RBAC_RESOURCE_KEY.ORDER),
      filterConditions: {
        hierarchicalAccess: {
          enabled: true,
          ownershipField: 'createdById',
          rules: [
            {
              name: 'STAFF_SELF_ONLY',
              description: 'Nhân viên chỉ xem đơn hàng do mình tạo',
              minHierarchyLevel: 8,
              maxHierarchyLevel: 11,
              accessScope: 'SELF',
            },
            {
              name: 'MANAGER_SUBORDINATES',
              description: 'Quản lý xem đơn hàng của cấp dưới trực tiếp',
              minHierarchyLevel: 7,
              maxHierarchyLevel: 7,
              accessScope: 'DIRECT_SUBORDINATES',
            },
            {
              name: 'UPPER_MANAGEMENT_CHAIN',
              description: 'Cấp trên xem toàn bộ chuỗi báo cáo',
              minHierarchyLevel: 1,
              maxHierarchyLevel: 6,
              accessScope: 'REPORTING_CHAIN',
            },
          ],
          peerRestriction: {
            enabled: true,
            description: 'Quản lý ngang hàng không xem được đơn hàng của nhau',
            blockPeerAccess: true,
            peerDefinition: 'SAME_HIERARCHY_LEVEL_SAME_PARENT',
          },
        },
        departmentScope: {
          enabled: true,
          allowedDepartments: [
            'SALES',
            'SALES_DOMESTIC',
            'SALES_INTERNATIONAL',
            'SALES_ONLINE',
            'SALES_PARTNER',
          ],
          crossDepartmentAccess: false,
        },
        status: {
          deniedValues: ['deleted', 'void'],
        },
      },
      priority: 8,
      isActive: true,
      position: 2,
    },

    // Support department: Recent ticket access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SUPPORT_TICKET_TIME_LIMIT,
      name: 'Support Recent Access Policy',
      description: 'Support team can only access recent customer interactions',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      specificMemberId: null,
      objectName: getEntityName(RBAC_RESOURCE_KEY.CUSTOMER),
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

    // Accounting department: Invoice access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.ACCOUNTING_INVOICE_FILTER,
      name: 'Accounting Invoice Access Policy',
      description:
        'Accounting team can access all invoices but with specific filters',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      specificMemberId: null,
      objectName: getEntityName(RBAC_RESOURCE_KEY.INVOICE),
      filterConditions: {
        amount: {
          minValue: 0,
          maxValue: 1000000, // Up to 1M currency units
        },
        status: {
          allowedValues: ['draft', 'sent', 'paid', 'overdue'],
          deniedValues: ['void'],
        },
        confidential: {
          enabled: false, // No access to confidential invoices by default
        },
      },
      priority: 9,
      isActive: true,
      position: 4,
    },

    // HR department: Confidential access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.HR_CONFIDENTIAL_ACCESS,
      name: 'HR Confidential Data Policy',
      description:
        'HR team has controlled access to employee confidential data',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
      specificMemberId: null,
      objectName: getEntityName(RBAC_RESOURCE_KEY.WORKSPACE_MEMBER),
      filterConditions: {
        confidential: {
          enabled: true,
          requiresApproval: true,
        },
        employmentStatus: {
          allowedStatuses: ['active', 'on_leave'],
          deniedStatuses: ['terminated'],
        },
        dataFields: {
          allowedFields: ['name', 'email', 'department', 'role', 'startDate'],
          restrictedFields: ['salary', 'personalInfo', 'evaluations'],
        },
      },
      priority: 15, // High priority for HR policies
      isActive: true,
      position: 5,
    },

    // Tech department: System admin access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.TECH_SYSTEM_ADMIN,
      name: 'Tech System Administration Policy',
      description: 'Tech team system-level access with audit logging',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      specificMemberId: null,
      objectName: getEntityName(RBAC_RESOURCE_KEY.KPI),
      filterConditions: {
        systemAccess: {
          enabled: true,
          auditRequired: true,
        },
        operationType: {
          allowedOps: ['read', 'update'],
          deniedOps: ['delete'], // No deletion without special approval
        },
        dataCategory: {
          allowedCategories: ['performance', 'system', 'usage'],
          deniedCategories: ['financial', 'personal'],
        },
      },
      priority: 12,
      isActive: true,
      position: 6,
    },

    // Specific member: Team manager policy
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.MANAGER_TEAM_VIEW,
      name: 'Team Manager View Policy',
      description: 'Team managers can view their team members data',
      departmentId: null,
      specificMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY, // Sales Manager
      objectName: getEntityName(RBAC_RESOURCE_KEY.PRODUCT),
      filterConditions: {
        teamAccess: {
          enabled: true,
          field: 'accountOwnerId',
          includeTeamMembers: true,
        },
        hierarchical: {
          enabled: true,
          maxLevels: 2, // Direct reports and their reports
        },
        dataScope: {
          includeMetrics: true,
          includePersonalNotes: false,
        },
      },
      priority: 11,
      isActive: true,
      position: 7,
    },

    // Department head override policy
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.DEPARTMENT_HEAD_POLICY,
      name: 'Department Head Override Policy',
      description: 'Department heads have broader access within their domain',
      departmentId: null,
      specificMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL, // Admin Manager
      objectName: getEntityName(RBAC_RESOURCE_KEY.CONTRACT),
      filterConditions: {
        departmentOverride: {
          enabled: true,
          scope: 'department',
        },
        approvalLevel: {
          maxAmount: 500000, // Up to 500K
          requiresDualApproval: true,
        },
        confidential: {
          enabled: true,
          auditTrail: true,
        },
        timeRange: {
          field: 'createdAt',
          daysBack: 1095, // 3 years of data
        },
      },
      priority: 20, // Highest priority
      isActive: true,
      position: 8,
    },
  ];

// Export for specific use cases
export const ACTIVE_DATA_ACCESS_POLICIES =
  MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter((policy) => policy.isActive);

export const DEPARTMENT_POLICIES = MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
  (policy) => policy.departmentId !== null,
);

export const MEMBER_SPECIFIC_POLICIES =
  MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.specificMemberId !== null,
  );

// Export for easy lookup by department
export const POLICIES_BY_DEPARTMENT = {
  SALES: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.departmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
  ),
  SUPPORT: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.departmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
  ),
  ACCOUNTING: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) =>
      policy.departmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
  ),
  HR: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.departmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
  ),
  TECH: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.departmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
  ),
  ADMIN: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.departmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
  ),
};

// Export for easy lookup by resource key
export const POLICIES_BY_RESOURCE = {
  [RBAC_RESOURCE_KEY.CUSTOMER]: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.objectName === getEntityName(RBAC_RESOURCE_KEY.CUSTOMER),
  ),
  [RBAC_RESOURCE_KEY.ORDER]: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.objectName === getEntityName(RBAC_RESOURCE_KEY.ORDER),
  ),
  [RBAC_RESOURCE_KEY.INVOICE]: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.objectName === getEntityName(RBAC_RESOURCE_KEY.INVOICE),
  ),
  [RBAC_RESOURCE_KEY.WORKSPACE_MEMBER]:
    MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
      (policy) =>
        policy.objectName === getEntityName(RBAC_RESOURCE_KEY.WORKSPACE_MEMBER),
    ),
  [RBAC_RESOURCE_KEY.KPI]: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.objectName === getEntityName(RBAC_RESOURCE_KEY.KPI),
  ),
  [RBAC_RESOURCE_KEY.PRODUCT]: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.objectName === getEntityName(RBAC_RESOURCE_KEY.PRODUCT),
  ),
  [RBAC_RESOURCE_KEY.CONTRACT]: MKT_DATA_ACCESS_POLICY_DATA_SEEDS.filter(
    (policy) => policy.objectName === getEntityName(RBAC_RESOURCE_KEY.CONTRACT),
  ),
};
