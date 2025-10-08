import { PERMISSION_RESOURCE_KEYS } from 'src/mkt-core/mkt-permission-template/constants/permission-resources.constants';

import { MKT_DEPARTMENT_DATA_SEEDS_IDS } from './mkt-department-data-seeds.constants';
import { MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS } from './mkt-organization-level-data-seeds.constants';

/**
 * Data Access Policy Seeds for Simplified 5-Role RBAC System
 *
 * Design Principles:
 * - Role-based policies (ADMIN, MANAGER, TEAM_LEAD, STAFF, INTERN)
 * - Department-scoped data access
 * - Hierarchy-based filtering (minHierarchyLevel, maxHierarchyLevel)
 * - Progressive access levels matching organization structure
 *
 * Mapping to Permission Template System:
 * - Each policy can be linked to permissionTemplateId for auto-generation
 * - Policies define HOW MUCH data is accessible AFTER permission is granted
 * - Permission Templates define WHAT actions are allowed
 *
 * Priority System:
 * - 100: Admin (full access)
 * - 70-79: Manager level policies
 * - 60-69: Team Lead level policies
 * - 50-59: Staff level policies
 * - 30-39: Intern level policies
 * - 10-19: Department-specific policies
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
  // ==================== HIERARCHY-BASED POLICIES ====================
  // Admin level (priority 100)
  ADMIN_FULL_ACCESS: 'cdd29152-dd02-4c9d-9b34-5490e6b44e3e',

  // Manager level (priority 70-79)
  MANAGER_CROSS_DEPT_CUSTOMERS: '2585da7c-e9a6-4824-b5fc-5002380c11a7',
  MANAGER_CROSS_DEPT_ORDERS: '49039fff-7380-4c58-a3ff-9f1a24f78928',
  MANAGER_TEAM_REPORTS: 'b10d4fe4-4542-4532-8f86-46d85d08ccad',
  MANAGER_BUDGET_DATA: '8923d63f-24b2-40ef-abad-39573c6316ef',
  MANAGER_ALL_OBJECTS_FALLBACK: 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',

  // Team Lead level (priority 60-69)
  TEAM_LEAD_DEPT_CUSTOMERS: '43fa18e3-0ee5-4aa0-a674-809cb385c6ae',
  TEAM_LEAD_DEPT_ORDERS: 'fd373352-48e8-4850-bb91-59f4f025d02e',
  TEAM_LEAD_TEAM_KPIS: 'da9503ff-93d7-4571-b0a1-da7327185322',
  TEAM_LEAD_ALL_OBJECTS_FALLBACK: 'f2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d',

  // Staff level (priority 50-59)
  STAFF_OWNED_CUSTOMERS: '1f24eaf2-88c4-439f-80e1-e3634729b64b',
  STAFF_OWNED_ORDERS: '36590e01-4edd-4dd0-b861-a7b4b137f3d8',
  STAFF_OWN_REPORTS: '8054ea79-a404-476f-a90f-925408b99df3',
  STAFF_ALL_OBJECTS_FALLBACK: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',

  // Intern level (priority 30-39)
  INTERN_READ_ONLY_CUSTOMERS: 'dc1f4702-ad71-45f6-83b8-f0b606f33582',
  INTERN_READ_ONLY_PRODUCTS: 'd86887f2-7cfc-4111-a825-83def0610c52',

  // ==================== DEPARTMENT-SPECIFIC POLICIES ====================
  // Sales department (priority 10-19)
  SALES_CUSTOMER_OWNERSHIP: '4fab9fd0-6cb9-4a2f-be1d-83c07875208b',
  SALES_ORDER_ACCESS: 'fc208cf3-cc8b-4401-a70c-c7b53773535a',
  SALES_PRODUCT_CATALOG: 'cdf195b9-0569-45da-8a2c-e5ffaa11cb6a',

  // Accounting department (priority 10-19)
  ACCOUNTING_INVOICE_ACCESS: 'c9099042-3c14-4d42-9c75-3d0b4becc51d',
  ACCOUNTING_FINANCIAL_DATA: '5efb2cc7-4a7b-442c-814b-0c03b93bfd09',
  ACCOUNTING_TRANSACTION_HISTORY: 'cf46c910-bf52-4fa6-855a-3d9801579d00',

  // Support department (priority 10-19)
  SUPPORT_CUSTOMER_TICKETS: 'a313f118-5276-4cc4-bb79-dcabebc9445a',
  SUPPORT_CUSTOMER_HISTORY: '61a80203-f1ab-4b4a-958d-4b3a8ac68ef8',

  // Admin department (priority 10-19)
  ADMIN_DEPT_USER_MANAGEMENT: 'a023cbb1-5aa7-4c94-ac6a-f3afe68e6ed5',
  ADMIN_DEPT_AUDIT_LOGS: '8c35388a-8b02-4b37-bc73-9c9f41578fa9',
};

/**
 * Data Access Policy Seeds
 * Tổng 25 policies covering:
 * - 5 hierarchy-based policies (Admin, Manager, Team Lead, Staff, Intern)
 * - 20 department-specific policies (Sales: 3, Accounting: 3, Support: 2, Admin: 2)
 */
export const MKT_DATA_ACCESS_POLICY_DATA_SEEDS: MktDataAccessPolicyDataSeed[] =
  [
    // ============================================================================
    // HIERARCHY-BASED POLICIES - Apply across all departments based on role
    // ============================================================================

    // ==================== ADMIN LEVEL (Priority 100) ====================
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.ADMIN_FULL_ACCESS,
      name: 'Admin Full System Access',
      description:
        'Quản trị viên có quyền truy cập không giới hạn vào tất cả dữ liệu trong toàn bộ phòng ban và đối tượng, bắt buộc ghi log kiểm toán',
      departmentId: null, // Applies to all departments
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.ADMIN,
      minHierarchyLevel: 1,
      maxHierarchyLevel: 1,
      permissionTemplateId: null, // Can be linked to Admin template
      objectName: '*',
      filterConditions: {
        accessLevel: 'FULL',
        scope: 'GLOBAL',
        restrictions: {
          timeLimit: false,
          amountLimit: false,
          departmentLimit: false,
          confidentialAccess: true,
        },
        audit: {
          required: true,
          level: 'HIGH',
          logAllAccess: true,
        },
      },
      priority: 100,
      isActive: true,
      position: 1,
    },

    // ==================== MANAGER LEVEL (Priority 70-79) ====================
    // Rule-Based Filters: Manager thấy TẤT CẢ records (không filter theo team)
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.MANAGER_CROSS_DEPT_CUSTOMERS,
      name: 'Manager Cross-Department Customer Access',
      description:
        'Quản lý có thể xem tất cả khách hàng xuyên phòng ban (chỉ exclude deleted)',
      departmentId: null, // Cross-department
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      minHierarchyLevel: 2,
      maxHierarchyLevel: 2,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.CUSTOMERS,
      filterConditions: {
        rules: [
          {
            field: 'deletedAt',
            operator: 'null',
            value: null,
            description: 'Not deleted',
          },
        ],
        combinator: 'and',
      },
      priority: 220, // Highest priority
      isActive: true,
      position: 2,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.MANAGER_CROSS_DEPT_ORDERS,
      name: 'Manager Cross-Department Order Access',
      description:
        'Quản lý có thể xem tất cả đơn hàng xuyên phòng ban (chỉ exclude deleted)',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      minHierarchyLevel: 2,
      maxHierarchyLevel: 2,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.ORDERS,
      filterConditions: {
        rules: [
          {
            field: 'deletedAt',
            operator: 'null',
            value: null,
            description: 'Not deleted',
          },
        ],
        combinator: 'and',
      },
      priority: 220,
      isActive: true,
      position: 3,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.MANAGER_TEAM_REPORTS,
      name: 'Manager Team Performance Reports',
      description:
        'Quản lý có thể truy cập báo cáo hiệu suất và KPI của thành viên nhóm trong cấu trúc phân cấp của họ',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      minHierarchyLevel: 2,
      maxHierarchyLevel: 2,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.REPORTS,
      filterConditions: {
        scope: 'TEAM_HIERARCHY',
        reportTypes: ['PERFORMANCE', 'KPI', 'ACTIVITY', 'PRODUCTIVITY'],
        hierarchyFilter: {
          includeSubordinates: true,
          maxDepth: 3, // Can see 3 levels down
        },
        excludeFields: ['salary', 'compensation', 'personalNotes'],
        timeRange: {
          field: 'reportDate',
          daysBack: 90,
        },
        audit: {
          required: true,
          level: 'MEDIUM',
        },
      },
      priority: 73,
      isActive: true,
      position: 4,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.MANAGER_BUDGET_DATA,
      name: 'Manager Department Budget Access',
      description:
        'Quản lý có thể xem dữ liệu ngân sách của phòng ban và các nhóm cấp dưới',
      departmentId: null, // Will be filtered by user's department
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      minHierarchyLevel: 2,
      maxHierarchyLevel: 2,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.BUDGET_DATA,
      filterConditions: {
        scope: 'DEPARTMENT',
        budgetCategories: ['OPERATIONAL', 'TEAM', 'PROJECT'],
        excludeCategories: ['EXECUTIVE_COMPENSATION', 'STRATEGIC_RESERVE'],
        amount: {
          maxValue: 50000000, // 50M visibility limit
        },
        timeRange: {
          field: 'budgetPeriod',
          monthsBack: 12,
        },
        audit: {
          required: true,
          level: 'HIGH',
        },
      },
      priority: 72,
      isActive: true,
      position: 5,
    },

    // ==================== TEAM LEAD LEVEL (Priority 60-69) ====================
    // Rule-Based Filters: Team Lead thấy records của team nhưng không thấy team khác
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.TEAM_LEAD_DEPT_CUSTOMERS,
      name: 'Team Lead Department Customer Access',
      description:
        'Trưởng nhóm có thể truy cập khách hàng của team (tự tạo hoặc team members tạo)',
      departmentId: null, // Filtered by user's department
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.TEAM_LEAD,
      minHierarchyLevel: 3,
      maxHierarchyLevel: 3,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.CUSTOMERS,
      filterConditions: {
        rules: [
          {
            field: 'createdByWorkspaceMemberId',
            operator: 'eq',
            value: '{{currentUserId}}',
            description: 'Created by Team Lead',
          },
          {
            field: 'accountOwnerId',
            operator: 'in',
            value: '{{teamMemberIds}}',
            description: 'Customers owned by team members',
          },
        ],
        combinator: 'or',
      },
      priority: 210, // Higher than Staff
      isActive: true,
      position: 6,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.TEAM_LEAD_DEPT_ORDERS,
      name: 'Team Lead Department Order Access',
      description:
        'Trưởng nhóm có thể xem đơn hàng của team (tự tạo hoặc team members tạo)',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.TEAM_LEAD,
      minHierarchyLevel: 3,
      maxHierarchyLevel: 3,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.ORDERS,
      filterConditions: {
        rules: [
          {
            field: 'createdByWorkspaceMemberId',
            operator: 'eq',
            value: '{{currentUserId}}',
            description: 'Created by Team Lead',
          },
          {
            field: 'accountOwnerId',
            operator: 'in',
            value: '{{teamMemberIds}}',
            description: 'Orders from team members',
          },
        ],
        combinator: 'or',
      },
      priority: 210,
      isActive: true,
      position: 7,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.TEAM_LEAD_TEAM_KPIS,
      name: 'Team Lead Team KPI Access',
      description:
        'Trưởng nhóm có thể xem KPI và chỉ số hiệu suất của thành viên trong nhóm',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.TEAM_LEAD,
      minHierarchyLevel: 3,
      maxHierarchyLevel: 3,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.KPIS,
      filterConditions: {
        scope: 'TEAM',
        kpiTypes: ['INDIVIDUAL', 'TEAM', 'ACTIVITY'],
        hierarchyFilter: {
          includeSubordinates: true,
          maxDepth: 2, // Can see 2 levels down (Staff, Intern)
        },
        timeRange: {
          field: 'measurementDate',
          daysBack: 30,
        },
        audit: {
          required: true,
          level: 'LOW',
        },
      },
      priority: 63,
      isActive: true,
      position: 8,
    },

    // ==================== STAFF LEVEL (Priority 50-59) ====================
    // Rule-Based Filters: Staff chỉ thấy records của chính mình
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.STAFF_OWNED_CUSTOMERS,
      name: 'Staff Owned Customer Access',
      description:
        'Nhân viên chỉ có thể truy cập khách hàng mà họ tạo hoặc được assign làm owner',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.STAFF,
      minHierarchyLevel: 4,
      maxHierarchyLevel: 4,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.CUSTOMERS,
      filterConditions: {
        rules: [
          {
            field: 'createdByWorkspaceMemberId',
            operator: 'eq',
            value: '{{currentUserId}}',
            description: 'Created by current user',
          },
          {
            field: 'accountOwnerId',
            operator: 'eq',
            value: '{{currentUserId}}',
            description: 'Owned by current user',
          },
        ],
        combinator: 'or',
      },
      priority: 200, // Higher priority to override old policies
      isActive: true,
      position: 9,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.STAFF_OWNED_ORDERS,
      name: 'Staff Owned Order Access',
      description: 'Nhân viên chỉ có thể truy cập đơn hàng mà họ tạo',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.STAFF,
      minHierarchyLevel: 4,
      maxHierarchyLevel: 4,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.ORDERS,
      filterConditions: {
        rules: [
          {
            field: 'createdByWorkspaceMemberId',
            operator: 'eq',
            value: '{{currentUserId}}',
            description: 'Created by current user',
          },
        ],
        combinator: 'and',
      },
      priority: 200,
      isActive: true,
      position: 10,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.STAFF_OWN_REPORTS,
      name: 'Staff Own Performance Reports',
      description:
        'Nhân viên chỉ có thể xem báo cáo hiệu suất và KPI của chính họ',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.STAFF,
      minHierarchyLevel: 4,
      maxHierarchyLevel: 4,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.REPORTS,
      filterConditions: {
        scope: 'SELF',
        reportTypes: ['INDIVIDUAL', 'ACTIVITY', 'PRODUCTIVITY'],
        excludeReportTypes: ['TEAM', 'DEPARTMENT', 'COMPARATIVE'],
        timeRange: {
          field: 'reportDate',
          daysBack: 90,
        },
        audit: {
          required: false,
          level: 'LOW',
        },
      },
      priority: 53,
      isActive: true,
      position: 11,
    },

    // ==================== INTERN LEVEL (Priority 30-39) ====================
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.INTERN_READ_ONLY_CUSTOMERS,
      name: 'Intern Read-Only Customer Access',
      description:
        'Thực tập sinh có quyền truy cập chỉ đọc giới hạn vào khách hàng để học tập',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.INTERN,
      minHierarchyLevel: 5,
      maxHierarchyLevel: 5,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.CUSTOMERS,
      filterConditions: {
        scope: 'LIMITED',
        accessType: 'READ_ONLY',
        ownership: {
          enabled: true,
          field: 'accountOwnerId',
          allowShared: false, // No shared access
          restrictToAssigned: true,
        },
        status: {
          allowedValues: ['active', 'prospect'], // Very limited
        },
        maxRecords: 100, // Limit number of accessible records
        timeRange: {
          field: 'updatedAt',
          daysBack: 7, // Only last week
        },
        sensitiveData: {
          excludeFields: [
            'creditCard',
            'bankAccount',
            'ssn',
            'taxId',
            'salary',
            'commission',
            'email',
            'phone',
            'address',
          ],
        },
        audit: {
          required: true,
          level: 'HIGH', // High audit for interns
        },
      },
      priority: 35,
      isActive: true,
      position: 12,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.INTERN_READ_ONLY_PRODUCTS,
      name: 'Intern Product Catalog Access',
      description:
        'Thực tập sinh có thể xem danh mục sản phẩm để học tập, không có dữ liệu giá/chi phí',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.INTERN,
      minHierarchyLevel: 5,
      maxHierarchyLevel: 5,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.PRODUCTS,
      filterConditions: {
        scope: 'PUBLIC_CATALOG',
        accessType: 'READ_ONLY',
        status: {
          allowedValues: ['active', 'published'],
        },
        excludeFields: ['cost', 'internalPrice', 'supplierInfo', 'margin'],
        audit: {
          required: false,
          level: 'LOW',
        },
      },
      priority: 34,
      isActive: true,
      position: 13,
    },

    // ============================================================================
    // DEPARTMENT-SPECIFIC POLICIES
    // Apply to all members of specific departments (override hierarchy defaults)
    // ============================================================================

    // ==================== SALES DEPARTMENT (Priority 10-19) ====================
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SALES_CUSTOMER_OWNERSHIP,
      name: 'Sales Customer Ownership Policy',
      description:
        'Thành viên bộ phận kinh doanh truy cập khách hàng qua accountOwnerId, có thể xem khách hàng được chia sẻ trong nhóm',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      specificMemberId: null,
      organizationLevelId: null, // Applies to all levels in department
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.CUSTOMERS,
      filterConditions: {
        scope: 'DEPARTMENT_OWNERSHIP',
        ownership: {
          enabled: true,
          field: 'accountOwnerId',
          allowShared: true,
          sharedTypes: ['SALES_TEAM'],
        },
        status: {
          allowedValues: ['active', 'prospect', 'lead', 'qualified'],
          deniedValues: ['archived', 'blocked'],
        },
        timeRange: {
          field: 'updatedAt',
          daysBack: 365,
        },
        audit: {
          required: true,
          level: 'MEDIUM',
        },
      },
      priority: 15,
      isActive: true,
      position: 14,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SALES_ORDER_ACCESS,
      name: 'Sales Order Access Policy',
      description:
        'Bộ phận kinh doanh có thể truy cập đơn hàng từ khách hàng của họ, bao gồm khả năng xem pipeline',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.ORDERS,
      filterConditions: {
        scope: 'CUSTOMER_ORDERS',
        ownership: {
          enabled: true,
          field: 'accountOwnerId',
          allowShared: true,
        },
        status: {
          deniedValues: ['deleted', 'void'],
        },
        includeStages: [
          'DRAFT',
          'PENDING',
          'CONFIRMED',
          'IN_PROGRESS',
          'COMPLETED',
        ],
        timeRange: {
          field: 'createdAt',
          daysBack: 365,
        },
        audit: {
          required: true,
          level: 'MEDIUM',
        },
      },
      priority: 14,
      isActive: true,
      position: 15,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SALES_PRODUCT_CATALOG,
      name: 'Sales Product Catalog Access',
      description:
        'Bộ phận kinh doanh có quyền truy cập đầy đủ vào danh mục sản phẩm bao gồm giá cả và lợi nhuận',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.PRODUCTS,
      filterConditions: {
        scope: 'FULL_CATALOG',
        status: {
          allowedValues: ['active', 'published', 'coming_soon'],
        },
        includeFields: [
          'price',
          'discount',
          'margin',
          'specifications',
          'availability',
        ],
        excludeFields: ['supplierCost', 'internalNotes'],
        audit: {
          required: false,
          level: 'LOW',
        },
      },
      priority: 13,
      isActive: true,
      position: 16,
    },

    // ==================== ACCOUNTING DEPARTMENT (Priority 10-19) ====================
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.ACCOUNTING_INVOICE_ACCESS,
      name: 'Accounting Invoice Full Access',
      description:
        'Bộ phận kế toán có quyền truy cập đầy đủ vào tất cả hóa đơn để quản lý tài chính',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.FINANCIAL_DATA,
      filterConditions: {
        scope: 'ALL_COMPANY',
        status: {
          allowedValues: [
            'draft',
            'sent',
            'paid',
            'overdue',
            'partial',
            'pending',
          ],
          deniedValues: ['void'],
        },
        amount: {
          minValue: 0,
          maxValue: null, // No limit for accounting
        },
        confidential: {
          enabled: true, // Can access confidential invoices
          auditRequired: true,
        },
        timeRange: {
          field: 'createdAt',
          daysBack: null, // Access all historical data
        },
        audit: {
          required: true,
          level: 'HIGH',
        },
      },
      priority: 18,
      isActive: true,
      position: 17,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.ACCOUNTING_FINANCIAL_DATA,
      name: 'Accounting Financial Data Access',
      description:
        'Bộ phận kế toán có quyền truy cập đầy đủ vào dữ liệu tài chính để báo cáo và tuân thủ',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.FINANCIAL_DATA,
      filterConditions: {
        scope: 'ALL_COMPANY',
        dataTypes: [
          'REVENUE',
          'EXPENSES',
          'PROFIT',
          'CASH_FLOW',
          'BALANCE_SHEET',
        ],
        confidential: {
          enabled: true,
          auditRequired: true,
        },
        timeRange: {
          field: 'periodDate',
          yearsBack: 7, // 7 years for legal compliance
        },
        audit: {
          required: true,
          level: 'HIGH',
        },
      },
      priority: 17,
      isActive: true,
      position: 18,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.ACCOUNTING_TRANSACTION_HISTORY,
      name: 'Accounting Transaction History',
      description:
        'Bộ phận kế toán có thể xem tất cả giao dịch tài chính để đối soát',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.TRANSACTIONS,
      filterConditions: {
        scope: 'ALL_COMPANY',
        transactionTypes: [
          'PAYMENT',
          'REFUND',
          'ADJUSTMENT',
          'TRANSFER',
          'CHARGE',
        ],
        status: {
          deniedValues: ['test', 'simulated'],
        },
        amount: {
          minValue: 0,
          maxValue: null, // No limit
        },
        timeRange: {
          field: 'transactionDate',
          yearsBack: 7,
        },
        audit: {
          required: true,
          level: 'HIGH',
        },
      },
      priority: 16,
      isActive: true,
      position: 19,
    },

    // ==================== SUPPORT DEPARTMENT (Priority 10-19) ====================
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SUPPORT_CUSTOMER_TICKETS,
      name: 'Support Customer Ticket Access',
      description:
        'Bộ phận hỗ trợ có thể truy cập khách hàng có ticket hỗ trợ đang hoạt động hoặc gần đây',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.CUSTOMERS,
      filterConditions: {
        scope: 'SUPPORT_ASSIGNED',
        filterBy: {
          hasActiveTickets: true,
          ticketStatus: ['open', 'pending', 'in_progress'],
        },
        status: {
          allowedValues: ['active', 'pending_support'],
          deniedValues: ['archived', 'deleted'],
        },
        timeRange: {
          field: 'lastSupportInteraction',
          daysBack: 90,
        },
        sensitiveData: {
          excludeFields: [
            'creditCard',
            'bankAccount',
            'ssn',
            'taxId',
            'salary',
            'financialData',
          ],
        },
        audit: {
          required: true,
          level: 'MEDIUM',
        },
      },
      priority: 12,
      isActive: true,
      position: 20,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.SUPPORT_CUSTOMER_HISTORY,
      name: 'Support Customer History Access',
      description:
        'Bộ phận hỗ trợ có thể xem lịch sử tương tác khách hàng để có ngữ cảnh',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.CUSTOMERS,
      filterConditions: {
        scope: 'SUPPORT_HISTORY',
        includeData: [
          'supportTickets',
          'interactions',
          'resolutions',
          'feedback',
        ],
        excludeData: ['orders', 'invoices', 'financialData'],
        timeRange: {
          field: 'updatedAt',
          daysBack: 180, // 6 months history
        },
        audit: {
          required: true,
          level: 'LOW',
        },
      },
      priority: 11,
      isActive: true,
      position: 21,
    },

    // ==================== ADMIN DEPARTMENT (Priority 10-19) ====================
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.ADMIN_DEPT_USER_MANAGEMENT,
      name: 'Admin Department User Management',
      description:
        'Thành viên bộ phận quản trị có thể truy cập tất cả hồ sơ người dùng để quản lý',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.USERS,
      filterConditions: {
        scope: 'ALL_USERS',
        status: {
          allowedValues: ['active', 'inactive', 'suspended'],
        },
        includeFields: [
          'profile',
          'permissions',
          'roles',
          'department',
          'organizationLevel',
          'activity',
        ],
        excludeFields: ['password', 'personalFinancialData'],
        audit: {
          required: true,
          level: 'HIGH',
        },
      },
      priority: 19,
      isActive: true,
      position: 22,
    },

    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.ADMIN_DEPT_AUDIT_LOGS,
      name: 'Admin Department Audit Log Access',
      description:
        'Bộ phận quản trị có thể truy cập nhật ký kiểm toán hệ thống để tuân thủ và bảo mật',
      departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      specificMemberId: null,
      organizationLevelId: null,
      minHierarchyLevel: null,
      maxHierarchyLevel: null,
      permissionTemplateId: null,
      objectName: PERMISSION_RESOURCE_KEYS.AUDIT_LOGS,
      filterConditions: {
        scope: 'ALL_LOGS',
        logTypes: [
          'ACCESS',
          'MODIFICATION',
          'DELETION',
          'PERMISSION_CHANGE',
          'SECURITY',
        ],
        severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        timeRange: {
          field: 'logDate',
          daysBack: 365,
        },
        audit: {
          required: true,
          level: 'HIGH',
          logAllAccess: true, // Audit log access is audited
        },
      },
      priority: 18,
      isActive: true,
      position: 23,
    },

    // ============================================================================
    // FALLBACK POLICIES - Apply to all objects (*) for each hierarchy level
    // Lower priority - only apply when no specific object policy exists
    // ============================================================================

    // Manager Fallback - All Objects
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.MANAGER_ALL_OBJECTS_FALLBACK,
      name: 'Manager All Objects Fallback',
      description:
        'Manager có thể xem tất cả records cho các objects không có policy riêng',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      minHierarchyLevel: 2,
      maxHierarchyLevel: 2,
      permissionTemplateId: null,
      objectName: '*', // All objects
      filterConditions: {
        rules: [
          {
            field: 'deletedAt',
            operator: 'null',
            value: null,
            description: 'Not deleted',
          },
        ],
        combinator: 'and',
      },
      priority: 70, // Lower than specific object policies (220)
      isActive: true,
      position: 24,
    },

    // Team Lead Fallback - All Objects
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.TEAM_LEAD_ALL_OBJECTS_FALLBACK,
      name: 'Team Lead All Objects Fallback',
      description:
        'Team Lead có thể xem records của team cho các objects không có policy riêng',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.TEAM_LEAD,
      minHierarchyLevel: 3,
      maxHierarchyLevel: 3,
      permissionTemplateId: null,
      objectName: '*',
      filterConditions: {
        rules: [
          {
            field: 'createdByWorkspaceMemberId',
            operator: 'eq',
            value: '{{currentUserId}}',
            description: 'Created by Team Lead',
          },
          {
            field: 'accountOwnerId',
            operator: 'in',
            value: '{{teamMemberIds}}',
            description: 'Owned by team members',
          },
        ],
        combinator: 'or',
      },
      priority: 60, // Lower than specific object policies (210)
      isActive: true,
      position: 25,
    },

    // Staff Fallback - All Objects
    {
      id: MKT_DATA_ACCESS_POLICY_DATA_SEED_IDS.STAFF_ALL_OBJECTS_FALLBACK,
      name: 'Staff All Objects Fallback',
      description:
        'Staff chỉ có thể xem own records cho các objects không có policy riêng',
      departmentId: null,
      specificMemberId: null,
      organizationLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.STAFF,
      minHierarchyLevel: 4,
      maxHierarchyLevel: 4,
      permissionTemplateId: null,
      objectName: '*',
      filterConditions: {
        rules: [
          {
            field: 'createdByWorkspaceMemberId',
            operator: 'eq',
            value: '{{currentUserId}}',
            description: 'Created by current user',
          },
        ],
        combinator: 'and',
      },
      priority: 50, // Lower than specific object policies (200)
      isActive: true,
      position: 26,
    },
  ];
