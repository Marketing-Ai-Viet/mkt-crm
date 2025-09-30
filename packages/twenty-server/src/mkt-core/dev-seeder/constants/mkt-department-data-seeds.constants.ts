/**
 * Simplified Department Codes - 4 core departments + Sales sub-departments (teams)
 * Based on RBAC_SIMPLIFIED_SETUP_GUIDE.md
 */
export enum MktDepartmentCode {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
  SUPPORT = 'SUPPORT',
  ACCOUNTING = 'ACCOUNTING',

  // Sales sub-departments (teams)
  SALES_TEAM_A = 'SALES_TEAM_A',
  SALES_TEAM_B = 'SALES_TEAM_B',
  SALES_TEAM_C = 'SALES_TEAM_C',
}

type MktDepartmentDataSeed = {
  id: string;
  departmentCode: MktDepartmentCode;
  departmentName: string;
  departmentNameEn?: string;
  description?: string;
  budgetCode?: string;
  costCenter?: string;
  requiresKpiTracking?: boolean;
  allowsCrossDepartmentAccess?: boolean;
  defaultKpiCategory?: string;
  displayOrder: number;
  colorCode?: string;
  iconName?: string;
  isActive?: boolean;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_DEPARTMENT_DATA_SEED_COLUMNS: (keyof MktDepartmentDataSeed)[] =
  [
    'id',
    'departmentCode',
    'departmentName',
    'departmentNameEn',
    'description',
    'budgetCode',
    'costCenter',
    'requiresKpiTracking',
    'allowsCrossDepartmentAccess',
    'defaultKpiCategory',
    'displayOrder',
    'colorCode',
    'iconName',
    'isActive',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
  ];

/**
 * Simplified Department IDs - 4 core departments + Sales sub-departments
 */
export const MKT_DEPARTMENT_DATA_SEEDS_IDS = {
  ADMIN: '33fcf7fa-69ac-4d50-b92a-f822f5c865ff',
  SALES: '4eb569e8-256f-4ff8-b97d-da4b371ffe30',
  SUPPORT: 'aa3fe2f9-1d9f-4a62-b3eb-88c8c49c81c7',
  ACCOUNTING: '958dbe4a-fb6d-4a00-b18e-8692042ebaaf',

  // Sales sub-departments (teams)
  SALES_TEAM_A: 'a1b2c3d4-1111-2222-3333-444444444444',
  SALES_TEAM_B: 'b2c3d4e5-2222-3333-4444-555555555555',
  SALES_TEAM_C: 'c3d4e5f6-3333-4444-5555-666666666666',
};

/**
 * Simplified Department Data Seeds - Only 4 core departments for RBAC
 * Based on RBAC_SIMPLIFIED_SETUP_GUIDE.md
 */
export const MKT_DEPARTMENT_DATA_SEEDS: MktDepartmentDataSeed[] = [
  // Admin Department
  {
    id: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
    departmentCode: MktDepartmentCode.ADMIN,
    departmentName: 'Phòng Hành chính',
    departmentNameEn: 'Administration Department',
    description: 'Quản lý hành chính, hệ thống và toàn bộ dữ liệu công ty',
    budgetCode: 'BUD-ADMIN-2024',
    costCenter: 'CC-ADMIN',
    requiresKpiTracking: false,
    allowsCrossDepartmentAccess: true,
    defaultKpiCategory: 'ADMIN_PERFORMANCE',
    displayOrder: 1,
    colorCode: '#795548', // Brown
    iconName: 'IconBriefcase',
    isActive: true,
    position: 1,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin User',
  },

  // Sales Department
  {
    id: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
    departmentCode: MktDepartmentCode.SALES,
    departmentName: 'Phòng Kinh doanh',
    departmentNameEn: 'Sales Department',
    description:
      'Phụ trách bán hàng, tìm kiếm khách hàng và phát triển thị trường',
    budgetCode: 'BUD-SALES-2024',
    costCenter: 'CC-SALES',
    requiresKpiTracking: true,
    allowsCrossDepartmentAccess: true,
    defaultKpiCategory: 'SALES_PERFORMANCE',
    displayOrder: 2,
    colorCode: '#2196F3', // Blue
    iconName: 'IconTrendingUp',
    isActive: true,
    position: 2,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin User',
  },

  // Support Department
  {
    id: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
    departmentCode: MktDepartmentCode.SUPPORT,
    departmentName: 'Phòng Hỗ trợ khách hàng',
    departmentNameEn: 'Customer Support Department',
    description: 'Hỗ trợ khách hàng sử dụng sản phẩm và giải quyết vấn đề',
    budgetCode: 'BUD-SUPPORT-2024',
    costCenter: 'CC-SUPPORT',
    requiresKpiTracking: true,
    allowsCrossDepartmentAccess: false,
    defaultKpiCategory: 'SUPPORT_PERFORMANCE',
    displayOrder: 3,
    colorCode: '#4CAF50', // Green
    iconName: 'IconHeadphones',
    isActive: true,
    position: 3,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin User',
  },

  // Sales Team A (Sub-department)
  {
    id: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_TEAM_A,
    departmentCode: MktDepartmentCode.SALES_TEAM_A,
    departmentName: 'Nhóm Kinh doanh A',
    departmentNameEn: 'Sales Team A',
    description:
      'Nhóm kinh doanh A - Phụ trách khu vực miền Bắc và sản phẩm Enterprise',
    budgetCode: 'BUD-SALES-A-2024',
    costCenter: 'CC-SALES-A',
    requiresKpiTracking: true,
    allowsCrossDepartmentAccess: false,
    defaultKpiCategory: 'SALES_TEAM_PERFORMANCE',
    displayOrder: 21,
    colorCode: '#1976D2', // Darker Blue
    iconName: 'IconUsers',
    isActive: true,
    position: 21,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin User',
  },

  // Sales Team B (Sub-department)
  {
    id: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_TEAM_B,
    departmentCode: MktDepartmentCode.SALES_TEAM_B,
    departmentName: 'Nhóm Kinh doanh B',
    departmentNameEn: 'Sales Team B',
    description:
      'Nhóm kinh doanh B - Phụ trách khu vực miền Nam và sản phẩm SMB',
    budgetCode: 'BUD-SALES-B-2024',
    costCenter: 'CC-SALES-B',
    requiresKpiTracking: true,
    allowsCrossDepartmentAccess: false,
    defaultKpiCategory: 'SALES_TEAM_PERFORMANCE',
    displayOrder: 22,
    colorCode: '#1565C0', // Blue
    iconName: 'IconUsers',
    isActive: true,
    position: 22,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin User',
  },

  // Sales Team C (Sub-department)
  {
    id: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_TEAM_C,
    departmentCode: MktDepartmentCode.SALES_TEAM_C,
    departmentName: 'Nhóm Kinh doanh C',
    departmentNameEn: 'Sales Team C',
    description:
      'Nhóm kinh doanh C - Phụ trách thị trường Online và E-commerce',
    budgetCode: 'BUD-SALES-C-2024',
    costCenter: 'CC-SALES-C',
    requiresKpiTracking: true,
    allowsCrossDepartmentAccess: false,
    defaultKpiCategory: 'SALES_TEAM_PERFORMANCE',
    displayOrder: 23,
    colorCode: '#0D47A1', // Dark Blue
    iconName: 'IconUsers',
    isActive: true,
    position: 23,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin User',
  },

  // Support Department
  {
    id: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
    departmentCode: MktDepartmentCode.SUPPORT,
    departmentName: 'Phòng Hỗ trợ khách hàng',
    departmentNameEn: 'Customer Support Department',
    description: 'Hỗ trợ khách hàng sử dụng sản phẩm và giải quyết vấn đề',
    budgetCode: 'BUD-SUPPORT-2024',
    costCenter: 'CC-SUPPORT',
    requiresKpiTracking: true,
    allowsCrossDepartmentAccess: false,
    defaultKpiCategory: 'SUPPORT_PERFORMANCE',
    displayOrder: 3,
    colorCode: '#4CAF50', // Green
    iconName: 'IconHeadphones',
    isActive: true,
    position: 3,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin User',
  },

  // Accounting Department
  {
    id: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
    departmentCode: MktDepartmentCode.ACCOUNTING,
    departmentName: 'Phòng Kế toán',
    departmentNameEn: 'Accounting Department',
    description: 'Quản lý tài chính, kế toán và báo cáo tài chính',
    budgetCode: 'BUD-ACC-2024',
    costCenter: 'CC-ACCOUNTING',
    requiresKpiTracking: false,
    allowsCrossDepartmentAccess: true,
    defaultKpiCategory: 'FINANCIAL_PERFORMANCE',
    displayOrder: 4,
    colorCode: '#FF9800', // Orange
    iconName: 'IconCalculator',
    isActive: true,
    position: 4,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin User',
  },
];
