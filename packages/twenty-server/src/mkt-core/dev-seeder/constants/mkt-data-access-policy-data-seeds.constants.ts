import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';

import { MKT_DEPARTMENT_DATA_SEEDS_IDS } from './mkt-department-data-seeds.constants';
import { MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS } from './mkt-organization-level-data-seeds.constants';

type MktDataAccessPolicyDataSeed = {
  id: string;
  name: string;
  description?: string;
  departmentId?: string | null;
  specificMemberId?: string | null;
  // Organization Level Targeting (new for 11-level hierarchy)
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
    // Organization Level Targeting fields
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
  // Legacy department-based policies
  SALES_CUSTOMER_ACCESS: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
  SALES_ORDER_OWNERSHIP: 'b2c3d4e5-f6a7-8b9c-0d1e-f2a3b4c5d6e7',
  SUPPORT_TICKET_TIME_LIMIT: 'c3d4e5f6-a7b8-9c0d-1e2f-a3b4c5d6e7f8',
  ACCOUNTING_INVOICE_FILTER: 'd4e5f6a7-b8c9-0d1e-2f3a-b4c5d6e7f8a9',
  HR_CONFIDENTIAL_ACCESS: 'e5f6a7b8-c9d0-1e2f-3a4b-c5d6e7f8a9b0',
  TECH_SYSTEM_ADMIN: 'f6a7b8c9-d0e1-2f3a-4b5c-d6e7f8a9b0c1',
  MANAGER_TEAM_VIEW: 'a7b8c9d0-e1f2-3a4b-5c6d-e7f8a9b0c1d2',
  DEPARTMENT_HEAD_POLICY: 'b8c9d0e1-f2a3-4b5c-6d7e-f8a9b0c1d2e3',

  // New organization level-based policies (11-level hierarchy)
  CEO_FULL_ACCESS: 'c9d0e1f2-a3b4-5c6d-7e8f-a9b0c1d2e3f4',
  VP_STRATEGIC_ACCESS: 'd0e1f2a3-b4c5-6d7e-8f9a-b0c1d2e3f4a5',
  DIRECTOR_DEPT_ACCESS: 'e1f2a3b4-c5d6-7e8f-9a0b-c1d2e3f4a5b6',
  MANAGER_TEAM_ACCESS: 'f2a3b4c5-d6e7-8f9a-0b1c-d2e3f4a5b6c7',
  SENIOR_STAFF_PROJECT_ACCESS: 'a3b4c5d6-e7f8-9a0b-1c2d-e3f4a5b6c7d8',
  JUNIOR_STAFF_LIMITED_ACCESS: 'b4c5d6e7-f8a9-0b1c-2d3e-f4a5b6c7d8e9',
  INTERN_READ_ONLY_ACCESS: 'c5d6e7f8-a9b0-1c2d-3e4f-a5b6c7d8e9f0',
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

    // Sales department: Order access policy
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SALES_ORDER_OWNERSHIP,
      name: 'Sales Order Access Policy',
      description: 'Sales team can access orders from their customers only',
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

    // Support department: Recent ticket access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SUPPORT_TICKET_TIME_LIMIT,
      name: 'Support Recent Access Policy',
      description: 'Support team can only access recent customer interactions',
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

    // Accounting department: Invoice access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.ACCOUNTING_INVOICE_FILTER,
      name: 'Accounting Invoice Access Policy',
      description:
        'Accounting team can access all invoices but with specific filters',
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
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.WORKSPACE_MEMBER,
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
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_KPI,
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
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_PRODUCT,
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
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_CONTRACT,
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

    // Organization Level-based Policies (11-level hierarchy)

    // CEO: Full system access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.CEO_FULL_ACCESS,
      name: 'CEO Full System Access Policy',
      description: 'CEO has unrestricted access to all data and operations',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.CEO,
      minHierarchyLevel: 1,
      maxHierarchyLevel: 1,
      permissionTemplateId: null, // Will be linked to CEO template when implemented
      objectName: '*', // All objects
      filterConditions: {
        policyType: 'organization_level_hierarchy',
        accessLevel: 'full',
        version: '2.0.0',
        restrictions: {
          timeLimit: false,
          amountLimit: false,
          confidentialAccess: true,
          auditRequired: true,
        },
      },
      priority: 100, // Highest priority
      isActive: true,
      position: 9,
    },

    // VP: Strategic level access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.VP_STRATEGIC_ACCESS,
      name: 'VP Strategic Access Policy',
      description:
        'Vice Presidents have strategic-level access across departments',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.VICE_PRESIDENT,
      minHierarchyLevel: 2,
      maxHierarchyLevel: 2,
      permissionTemplateId: null, // Will be linked to VP template
      objectName: '*',
      filterConditions: {
        policyType: 'organization_level_hierarchy',
        accessLevel: 'strategic',
        version: '2.0.0',
        restrictions: {
          timeLimit: false,
          amountLimit: 5000000, // 5M limit
          confidentialAccess: true,
          auditRequired: true,
        },
      },
      priority: 95,
      isActive: true,
      position: 10,
    },

    // Director: Department-wide access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.DIRECTOR_DEPT_ACCESS,
      name: 'Director Department Access Policy',
      description: 'Directors have full access within their department scope',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
      minHierarchyLevel: 3,
      maxHierarchyLevel: 3,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_CUSTOMER,
      filterConditions: {
        policyType: 'organization_level_hierarchy',
        accessLevel: 'departmental',
        version: '2.0.0',
        scope: {
          departmentBased: true,
          crossDepartment: false,
        },
        restrictions: {
          amountLimit: 1000000, // 1M limit
          confidentialAccess: true,
          timeRange: { daysBack: 1095 }, // 3 years
        },
      },
      priority: 90,
      isActive: true,
      position: 11,
    },

    // Manager: Team-level access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.MANAGER_TEAM_ACCESS,
      name: 'Manager Team Access Policy',
      description: 'Managers have comprehensive access to their team data',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      minHierarchyLevel: 4,
      maxHierarchyLevel: 4,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_ORDER,
      filterConditions: {
        policyType: 'organization_level_hierarchy',
        accessLevel: 'team_management',
        version: '2.0.0',
        scope: {
          teamBased: true,
          hierarchicalDown: true,
          maxSubLevels: 3,
        },
        restrictions: {
          amountLimit: 250000, // 250K limit
          confidentialAccess: false,
          timeRange: { daysBack: 365 },
        },
      },
      priority: 80,
      isActive: true,
      position: 12,
    },

    // Senior Staff: Project-level access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SENIOR_STAFF_PROJECT_ACCESS,
      name: 'Senior Staff Project Access Policy',
      description:
        'Senior staff have access to their projects and mentor responsibilities',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SENIOR_STAFF,
      minHierarchyLevel: 6,
      maxHierarchyLevel: 6,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_PRODUCT,
      filterConditions: {
        policyType: 'organization_level_hierarchy',
        accessLevel: 'project_based',
        version: '2.0.0',
        scope: {
          projectBased: true,
          mentorAccess: true,
          peerCollaboration: true,
        },
        restrictions: {
          amountLimit: 50000, // 50K limit
          confidentialAccess: false,
          timeRange: { daysBack: 180 },
        },
      },
      priority: 70,
      isActive: true,
      position: 13,
    },

    // Junior Staff: Limited access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.JUNIOR_STAFF_LIMITED_ACCESS,
      name: 'Junior Staff Limited Access Policy',
      description:
        'Junior staff have access to assigned tasks and learning materials',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.JUNIOR_STAFF,
      minHierarchyLevel: 7,
      maxHierarchyLevel: 7,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_CUSTOMER,
      filterConditions: {
        policyType: 'organization_level_hierarchy',
        accessLevel: 'task_based',
        version: '2.0.0',
        scope: {
          assignedOnly: true,
          learningAccess: true,
          supervisorGuidance: true,
        },
        restrictions: {
          amountLimit: 10000, // 10K limit
          confidentialAccess: false,
          timeRange: { daysBack: 90 },
          requiresApproval: ['update', 'delete'],
        },
      },
      priority: 60,
      isActive: true,
      position: 14,
    },

    // Intern: Read-only access
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.INTERN_READ_ONLY_ACCESS,
      name: 'Intern Read-Only Access Policy',
      description:
        'Interns have supervised read-only access for learning purposes',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.INTERN,
      minHierarchyLevel: 8,
      maxHierarchyLevel: 8,
      permissionTemplateId: null,
      objectName: MKT_DATA_ACCESS_POLICY_OBJECT_NAMES.MKT_CUSTOMER,
      filterConditions: {
        policyType: 'organization_level_hierarchy',
        accessLevel: 'read_only',
        version: '2.0.0',
        scope: {
          learningPurpose: true,
          supervisedAccess: true,
          basicDataOnly: true,
        },
        restrictions: {
          readOnly: true,
          amountLimit: 0,
          confidentialAccess: false,
          timeRange: { daysBack: 30 },
          allowedOperations: ['read'],
        },
      },
      priority: 50,
      isActive: true,
      position: 15,
    },
  ];
