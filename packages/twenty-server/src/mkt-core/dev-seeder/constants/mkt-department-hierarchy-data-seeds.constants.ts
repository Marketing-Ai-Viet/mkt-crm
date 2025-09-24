import { DateTime } from 'luxon';

import { MKT_DEPARTMENT_DATA_SEEDS_IDS } from './mkt-department-data-seeds.constants';

/**
 * Loại quan hệ phân cấp phòng ban trong Enterprise RBAC
 */
export enum MktDepartmentHierarchyRelationType {
  /** Quan hệ cha-con trực tiếp với quyền kế thừa đầy đủ */
  PARENT_CHILD = 'PARENT_CHILD',
  /** Quan hệ ma trận cho phép truy cập từ nhiều hướng */
  MATRIX = 'MATRIX',
  /** Quan hệ chức năng với quyền hạn chế */
  FUNCTIONAL = 'FUNCTIONAL',
  /** Quan hệ tạm thời có thời hạn */
  TEMPORARY = 'TEMPORARY',
  /** Quan hệ giám sát với quyền xem và kiểm soát */
  SUPERVISORY = 'SUPERVISORY',
  /** Quan hệ tư vấn không có quyền thực thi */
  ADVISORY = 'ADVISORY',
}

/**
 * Cấp độ bảo mật cho hierarchy RBAC
 */
export enum SecurityLevel {
  /** Công khai - không có hạn chế */
  PUBLIC = 'PUBLIC',
  /** Nội bộ - chỉ nhân viên công ty */
  INTERNAL = 'INTERNAL',
  /** Bảo mật - chỉ cấp quản lý */
  CONFIDENTIAL = 'CONFIDENTIAL',
  /** Tối mật - chỉ cấp điều hành */
  TOP_SECRET = 'TOP_SECRET',
}

/**
 * Cấu trúc dữ liệu seed cho phân cấp phòng ban với Enterprise RBAC
 */
type MktDepartmentHierarchyDataSeed = {
  /** ID duy nhất của quan hệ phân cấp */
  id: string;
  /** ID phòng ban cha */
  parentDepartmentId: string;
  /** ID phòng ban con */
  childDepartmentId: string;
  /** Cấp độ trong hierarchy (1=cao nhất) */
  hierarchyLevel: number;
  /** Loại quan hệ phân cấp */
  relationshipType: MktDepartmentHierarchyRelationType;
  /** Ngày bắt đầu có hiệu lực */
  validFrom?: Date | null;
  /** Ngày kết thúc hiệu lực (null = vô thời hạn) */
  validTo?: Date | null;
  /** Có kế thừa quyền từ cấp cha không */
  inheritsPermissions?: boolean;
  /** Có thể escalate lên cấp cha không */
  canEscalateToParent?: boolean;
  /** Cho phép truy cập cross-branch không */
  allowsCrossBranchAccess?: boolean;
  /** Thứ tự hiển thị */
  displayOrder?: number;
  /** Ghi chú về quan hệ */
  notes?: string;
  /** Trạng thái hoạt động */
  isActive?: boolean;
  /** Vị trí trong danh sách */
  position: number;
  /** Nguồn tạo dữ liệu */
  createdBySource: string;
  /** ID workspace member tạo */
  createdByWorkspaceMemberId: string | null;
  /** Tên người tạo */
  createdByName: string;

  // ================= RBAC FIELDS =================
  /** Đường dẫn hierarchy từ root đến node hiện tại */
  hierarchyPath?: string[];
  /** Có kế thừa quyền từ tất cả cấp cha không */
  inheritsParentPermissions?: boolean;
  /** Có thể xem dữ liệu team không */
  canViewTeamData?: boolean;
  /** Có thể chỉnh sửa dữ liệu team không */
  canEditTeamData?: boolean;
  /** Có thể export dữ liệu team không */
  canExportTeamData?: boolean;

  // ================= ENHANCED RBAC FIELDS =================
  /** Cấp độ bảo mật tối thiểu được phép */
  minimumSecurityLevel?: SecurityLevel;
  /** Có quyền phê duyệt không */
  canApprove?: boolean;
  /** Có quyền delegate không */
  canDelegate?: boolean;
  /** Có quyền audit không */
  canAudit?: boolean;
  /** Có quyền quản lý user không */
  canManageUsers?: boolean;
  /** Có quyền cấu hình hệ thống không */
  canConfigureSystem?: boolean;
  /** Có quyền xem báo cáo tài chính không */
  canViewFinancialReports?: boolean;
  /** Có quyền truy cập dữ liệu nhạy cảm không */
  canAccessSensitiveData?: boolean;

  // ================= BUSINESS RULE FIELDS =================
  /** Có thể override quyết định cấp dưới không */
  canOverrideSubordinates?: boolean;
  /** Yêu cầu dual approval không */
  requiresDualApproval?: boolean;
  /** Giới hạn thời gian truy cập (giờ) */
  accessTimeLimit?: number;
  /** Yêu cầu MFA không */
  requiresMFA?: boolean;
  /** Có thể truy cập ngoài giờ không */
  canAccessAfterHours?: boolean;
  /** Có thể truy cập từ xa không */
  canAccessRemotely?: boolean;

  // ================= COMPLIANCE FIELDS =================
  /** Cần tracking đầy đủ không */
  requiresFullAuditTrail?: boolean;
  /** Có thể xóa dữ liệu không */
  canDeleteData?: boolean;
  /** Có thể khôi phục dữ liệu không */
  canRestoreData?: boolean;
  /** Tuân thủ GDPR không */
  gdprCompliant?: boolean;
  /** Tuân thủ SOX không */
  soxCompliant?: boolean;

  // ================= METADATA FIELDS =================
  /** Mức độ ưu tiên (1-10, 10=cao nhất) */
  priorityLevel?: number;
  /** Trọng số quyền (0-100) */
  permissionWeight?: number;
  /** Có thể cache không */
  cacheable?: boolean;
  /** TTL cache (giây) */
  cacheTTL?: number;
  /** Ghi chú bảo mật */
  securityNotes?: string;
};

/**
 * Danh sách các cột cần thiết cho bảng MktDepartmentHierarchy
 * Được sử dụng để validation và migration
 */
export const MKT_DEPARTMENT_HIERARCHY_DATA_SEED_COLUMNS: (keyof MktDepartmentHierarchyDataSeed)[] =
  [
    // Core fields
    'id',
    'parentDepartmentId',
    'childDepartmentId',
    'hierarchyLevel',
    'relationshipType',
    'validFrom',
    'validTo',
    'inheritsPermissions',
    'canEscalateToParent',
    'allowsCrossBranchAccess',
    'displayOrder',
    'notes',
    'isActive',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',

    // Basic RBAC fields
    'hierarchyPath',
    'inheritsParentPermissions',
    'canViewTeamData',
    'canEditTeamData',
    'canExportTeamData',

    // Enhanced RBAC fields
    'minimumSecurityLevel',
    'canApprove',
    'canDelegate',
    'canAudit',
    'canManageUsers',
    'canConfigureSystem',
    'canViewFinancialReports',
    'canAccessSensitiveData',

    // Business rule fields
    'canOverrideSubordinates',
    'requiresDualApproval',
    'accessTimeLimit',
    'requiresMFA',
    'canAccessAfterHours',
    'canAccessRemotely',

    // Compliance fields
    'requiresFullAuditTrail',
    'canDeleteData',
    'canRestoreData',
    'gdprCompliant',
    'soxCompliant',

    // Metadata fields
    'priorityLevel',
    'permissionWeight',
    'cacheable',
    'cacheTTL',
    'securityNotes',
  ];

/**
 * ID constants cho các quan hệ phân cấp phòng ban
 * Được tổ chức theo cấp độ hierarchy và loại quan hệ
 */
export const MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS = {
  // ================= LEVEL 0: ROOT HIERARCHIES =================
  // Admin là root department quản lý tất cả các phòng ban khác

  /** Admin -> Sales: Quan hệ quản lý chiến lược */
  ADMIN_SALES: 'e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b',
  /** Admin -> Tech: Quan hệ quản lý kỹ thuật */
  ADMIN_TECH: 'd3e4f5a6-7b8c-9d0e-1f2a-3b4c5d6e7f8a',
  /** Admin -> HR: Quan hệ quản lý nhân sự */
  ADMIN_HR: 'a0b1c2d3-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
  /** Admin -> Accounting: Quan hệ quản lý tài chính */
  ADMIN_ACCOUNTING: 'b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
  /** Admin -> Support: Quan hệ giám sát hỗ trợ */
  ADMIN_SUPPORT: 'f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c',

  // ================= LEVEL 1: CROSS-FUNCTIONAL RELATIONSHIPS =================
  // Quan hệ ma trận và chức năng giữa các phòng ban

  /** Sales -> Support: Hỗ trợ khách hàng sau bán */
  SALES_SUPPORT: '7d8e9f0a-1b2c-3d4e-5f6a-7b8c9d0e1f2a',
  /** Sales -> Accounting: Theo dõi doanh thu */
  SALES_ACCOUNTING: '8e9f0a1b-2c3d-4e5f-6a7b-8c9d0e1f2a3b',
  /** Tech -> Support: Hỗ trợ kỹ thuật */
  TECH_SUPPORT: '9f0a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c',
  /** Sales <-> Tech: Phối hợp phát triển sản phẩm */
  SALES_TECH_MATRIX: 'c2d3e4f5-6a7b-8c9d-0e1f-2a3b4c5d6e7f',
  /** HR <-> Tech: Quản lý IT nhân sự */
  HR_TECH_MATRIX: 'f5a6b7c8-9d0e-1f2a-3b4c-5d6e7f8a9b0c',
  /** HR -> Support: Đào tạo và chính sách */
  HR_SUPPORT_FUNCTIONAL: 'a6b7c8d9-0e1f-2a3b-4c5d-6e7f8a9b0c1d',
  /** Accounting -> Support: Theo dõi chi phí */
  ACCOUNTING_SUPPORT_FUNCTIONAL: 'b7c8d9e0-1f2a-3b4c-5d6e-7f8a9b0c1d2e',

  // ================= LEVEL 2: DEPARTMENTAL SUBDIVISIONS =================
  // Phân chia các phòng ban chính thành các bộ phận chuyên biệt

  /** Sales -> Sales Domestic: Kinh doanh nội địa */
  SALES_TO_SALES_DOMESTIC: 'c8d9e0f1-2a3b-4c5d-6e7f-8a9b0c1d2e3f',
  /** Sales -> Sales Export: Kinh doanh xuất khẩu */
  SALES_TO_SALES_EXPORT: 'd9e0f1a2-3b4c-5d6e-7f8a-9b0c1d2e3f4a',

  /** Tech -> Tech Frontend: Kỹ thuật Frontend */
  TECH_TO_TECH_FRONTEND: 'e0f1a2b3-4c5d-6e7f-8a9b-0c1d2e3f4a5b',
  /** Tech -> Tech Backend: Kỹ thuật Backend */
  TECH_TO_TECH_BACKEND: 'f1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',

  // ================= LEVEL 3 HIERARCHIES =================
  // Sales Domestic -> Sales North & Sales South
  SALES_DOMESTIC_TO_SALES_NORTH: 'a2b3c4d5-6e7f-8a9b-0c1d-2e3f4a5b6c7d',
  SALES_DOMESTIC_TO_SALES_SOUTH: 'b3c4d5e6-7f8a-9b0c-1d2e-3f4a5b6c7d8e',

  // Sales Export -> Sales EU & Sales Asia
  SALES_EXPORT_TO_SALES_EU: 'c4d5e6f7-8a9b-0c1d-2e3f-4a5b6c7d8e9f',
  SALES_EXPORT_TO_SALES_ASIA: 'd5e6f7a8-9b0c-1d2e-3f4a-5b6c7d8e9f0a',

  // Tech Frontend -> Tech React & Tech Mobile
  TECH_FRONTEND_TO_TECH_REACT: 'e6f7a8b9-0c1d-2e3f-4a5b-6c7d8e9f0a1b',
  TECH_FRONTEND_TO_TECH_MOBILE: 'f7a8b9c0-1d2e-3f4a-5b6c-7d8e9f0a1b2c',

  // Tech Backend -> Tech API & Tech Database
  TECH_BACKEND_TO_TECH_API: 'a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d',
  TECH_BACKEND_TO_TECH_DATABASE: 'b9c0d1e2-3f4a-5b6c-7d8e-9f0a1b2c3d4e',

  // ================= LEVEL 4 HIERARCHIES =================
  // Sales North -> Sales Hanoi
  SALES_NORTH_TO_SALES_HANOI: 'c0d1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f',

  // Sales South -> Sales HCMC
  SALES_SOUTH_TO_SALES_HCMC: 'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a',

  // Sales EU -> Sales Germany
  SALES_EU_TO_SALES_GERMANY: 'e2f3a4b5-6c7d-8e9f-0a1b-2c3d4e5f6a7b',

  // Sales Asia -> Sales Japan
  SALES_ASIA_TO_SALES_JAPAN: 'f3a4b5c6-7d8e-9f0a-1b2c-3d4e5f6a7b8c',

  // Tech React -> Tech Web & Tech Components
  TECH_REACT_TO_TECH_WEB: 'a4b5c6d7-8e9f-0a1b-2c3d-4e5f6a7b8c9d',
  TECH_REACT_TO_TECH_COMPONENTS: 'b5c6d7e8-9f0a-1b2c-3d4e-5f6a7b8c9d0e',

  // Tech Mobile -> Tech iOS & Tech Android
  TECH_MOBILE_TO_TECH_IOS: 'c6d7e8f9-0a1b-2c3d-4e5f-6a7b8c9d0e1f',
  TECH_MOBILE_TO_TECH_ANDROID: 'd7e8f9a0-1b2c-3d4e-5f6a-7b8c9d0e1f2a',

  // ================= LEVEL 5 HIERARCHIES =================
  // Sales Hanoi -> Sales Hanoi Retail & Sales Hanoi B2B
  SALES_HANOI_TO_SALES_HANOI_RETAIL: 'e8f9a0b1-2c3d-4e5f-6a7b-8c9d0e1f2a3b',
  SALES_HANOI_TO_SALES_HANOI_B2B: 'f9a0b1c2-3d4e-5f6a-7b8c-9d0e1f2a3b4c',

  // Sales HCMC -> Sales HCMC Retail & Sales HCMC B2B
  SALES_HCMC_TO_SALES_HCMC_RETAIL: 'a0b1c2d3-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
  SALES_HCMC_TO_SALES_HCMC_B2B: 'b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e',

  // Tech Components -> Tech UI Library & Tech Design System
  TECH_COMPONENTS_TO_TECH_UI_LIBRARY: 'c2d3e4f5-6a7b-8c9d-0e1f-2a3b4c5d6e7f',
  TECH_COMPONENTS_TO_TECH_DESIGN_SYSTEM: 'd3e4f5a6-7b8c-9d0e-1f2a-3b4c5d6e7f8a',

  // ================= LEVEL 6 HIERARCHIES =================
  // Sales Hanoi Retail -> Sales Hanoi Retail Online & Sales Hanoi Retail Offline
  SALES_HANOI_RETAIL_TO_ONLINE: 'e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b',
  SALES_HANOI_RETAIL_TO_OFFLINE: 'f5a6b7c8-9d0e-1f2a-3b4c-5d6e7f8a9b0c',

  // Tech UI Library -> Tech Component Library
  TECH_UI_LIBRARY_TO_TECH_COMPONENT_LIB: 'a6b7c8d9-0e1f-2a3b-4c5d-6e7f8a9b0c1d',

  // Tech Design System -> Tech Theme System
  TECH_DESIGN_SYSTEM_TO_TECH_THEME_SYSTEM:
    'b7c8d9e0-1f2a-3b4c-5d6e-7f8a9b0c1d2e',

  // ================= LEVEL 7 HIERARCHIES =================
  // Sales Hanoi Retail Online -> Sales Hanoi E-commerce & Sales Hanoi Social Commerce
  SALES_HANOI_RETAIL_ONLINE_TO_ECOMMERCE:
    'c8d9e0f1-2a3b-4c5d-6e7f-8a9b0c1d2e3f',
  SALES_HANOI_RETAIL_ONLINE_TO_SOCIAL: 'd9e0f1a2-3b4c-5d6e-7f8a-9b0c1d2e3f4a',
};

export const MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS: MktDepartmentHierarchyDataSeed[] =
  [
    // Sales Department supervises Support Department
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_SUPPORT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 1,
      notes:
        'Sales department provides strategic direction for customer support operations',
      isActive: true,
      position: 1,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: false,
    },

    // Sales Department has oversight of Accounting for revenue tracking
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_ACCOUNTING,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 2,
      notes:
        'Functional relationship for revenue tracking and financial reporting',
      isActive: true,
      position: 2,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: true,
    },

    // Tech Department provides technical support to Support Department
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_SUPPORT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.MATRIX,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 3,
      notes: 'Matrix relationship for technical escalation and product support',
      isActive: true,
      position: 3,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: false,
      canEditTeamData: false,
      canExportTeamData: false,
    },

    // Admin Department coordinates with HR Department
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_HR,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 4,
      notes: 'Administrative oversight of human resources activities',
      isActive: true,
      position: 4,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Admin Department coordinates with Accounting for administrative compliance
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_ACCOUNTING,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 5,
      notes: 'Administrative oversight for compliance and regulatory reporting',
      isActive: true,
      position: 5,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: true,
    },

    // Sales-Tech Matrix relationship for product development input
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TECH_MATRIX,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.MATRIX,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: false,
      allowsCrossBranchAccess: true,
      displayOrder: 6,
      notes:
        'Matrix relationship for product roadmap and customer feedback integration',
      isActive: true,
      position: 6,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: false,
      canEditTeamData: false,
      canExportTeamData: false,
    },

    // Admin Department manages Tech Department
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_TECH,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 7,
      notes: 'Administrative management of technology department operations',
      isActive: true,
      position: 7,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: false,
    },

    // Admin Department oversees Sales Department (strategic level)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_SALES,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 8,
      notes: 'Strategic oversight and coordination of sales operations',
      isActive: true,
      position: 8,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // HR-Tech Matrix relationship for employee technology needs
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.HR_TECH_MATRIX,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.MATRIX,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 9,
      notes:
        'Matrix relationship for employee IT support and system access management',
      isActive: true,
      position: 9,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: false,
      canEditTeamData: false,
      canExportTeamData: false,
    },

    // HR provides functional support to Support Department (training, policies)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.HR_SUPPORT_FUNCTIONAL,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 10,
      notes:
        'Functional relationship for employee training and policy compliance',
      isActive: true,
      position: 10,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: false,
    },

    // Accounting provides functional support to Support Department (cost tracking)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ACCOUNTING_SUPPORT_FUNCTIONAL,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: false,
      allowsCrossBranchAccess: false,
      displayOrder: 11,
      notes:
        'Functional relationship for cost center tracking and budget monitoring',
      isActive: true,
      position: 11,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: true,
    },

    // ================= LEVEL 2 HIERARCHIES =================

    // Sales -> Sales Domestic (Level 1 -> Level 2)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TO_SALES_DOMESTIC,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 11,
      notes: 'Sales department manages domestic sales operations',
      isActive: true,
      position: 11,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales -> Sales Export (Level 1 -> Level 2)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TO_SALES_EXPORT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 12,
      notes: 'Sales department manages export sales operations',
      isActive: true,
      position: 12,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech -> Tech Frontend (Level 1 -> Level 2)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_TO_TECH_FRONTEND,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 13,
      notes: 'Tech department manages frontend development',
      isActive: true,
      position: 13,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech -> Tech Backend (Level 1 -> Level 2)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_TO_TECH_BACKEND,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_BACKEND,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 14,
      notes: 'Tech department manages backend development',
      isActive: true,
      position: 14,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // ================= LEVEL 3 HIERARCHIES =================

    // Sales Domestic -> Sales North (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_DOMESTIC_TO_SALES_NORTH,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 21,
      notes: 'Domestic sales manages northern regional sales',
      isActive: true,
      position: 21,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Domestic -> Sales South (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_DOMESTIC_TO_SALES_SOUTH,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_SOUTH,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 22,
      notes: 'Domestic sales manages southern regional sales',
      isActive: true,
      position: 22,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Export -> Sales EU (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_EXPORT_TO_SALES_EU,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EU,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 23,
      notes: 'Export sales manages European market sales',
      isActive: true,
      position: 23,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Export -> Sales Asia (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_EXPORT_TO_SALES_ASIA,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_ASIA,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 24,
      notes: 'Export sales manages Asian market sales',
      isActive: true,
      position: 24,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Frontend -> Tech React (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_FRONTEND_TO_TECH_REACT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 25,
      notes: 'Frontend tech manages React development',
      isActive: true,
      position: 25,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Frontend -> Tech Mobile (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_FRONTEND_TO_TECH_MOBILE,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_MOBILE,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 26,
      notes: 'Frontend tech manages mobile development',
      isActive: true,
      position: 26,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Backend -> Tech API (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_BACKEND_TO_TECH_API,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_BACKEND,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_API,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 27,
      notes: 'Backend tech manages API development',
      isActive: true,
      position: 27,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_BACKEND,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Backend -> Tech Database (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_BACKEND_TO_TECH_DATABASE,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_BACKEND,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_DATABASE,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 28,
      notes: 'Backend tech manages database development',
      isActive: true,
      position: 28,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_BACKEND,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // ================= LEVEL 4 HIERARCHIES =================

    // Sales North -> Sales Hanoi (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_NORTH_TO_SALES_HANOI,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 31,
      notes: 'Northern sales manages Hanoi city sales',
      isActive: true,
      position: 31,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales South -> Sales HCMC (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_SOUTH_TO_SALES_HCMC,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_SOUTH,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 32,
      notes: 'Southern sales manages Ho Chi Minh City sales',
      isActive: true,
      position: 32,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_SOUTH,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales EU -> Sales Germany (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_EU_TO_SALES_GERMANY,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EU,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_GERMANY,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 33,
      notes: 'European sales manages Germany market',
      isActive: true,
      position: 33,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EU,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Asia -> Sales Japan (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_ASIA_TO_SALES_JAPAN,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_ASIA,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_JAPAN,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 34,
      notes: 'Asian sales manages Japan market',
      isActive: true,
      position: 34,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_ASIA,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech React -> Tech Web (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_REACT_TO_TECH_WEB,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_WEB,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 35,
      notes: 'React development manages web applications',
      isActive: true,
      position: 35,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech React -> Tech Components (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_REACT_TO_TECH_COMPONENTS,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 36,
      notes: 'React development manages component libraries',
      isActive: true,
      position: 36,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Mobile -> Tech iOS (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_MOBILE_TO_TECH_IOS,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_MOBILE,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_IOS,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 37,
      notes: 'Mobile development manages iOS applications',
      isActive: true,
      position: 37,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_MOBILE,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Mobile -> Tech Android (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_MOBILE_TO_TECH_ANDROID,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_MOBILE,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_ANDROID,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 38,
      notes: 'Mobile development manages Android applications',
      isActive: true,
      position: 38,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_MOBILE,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // ================= LEVEL 5 HIERARCHIES =================

    // Sales Hanoi -> Sales Hanoi Retail (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_TO_SALES_HANOI_RETAIL,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 41,
      notes: 'Hanoi sales manages retail operations',
      isActive: true,
      position: 41,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Hanoi -> Sales Hanoi B2B (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_TO_SALES_HANOI_B2B,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_B2B,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 42,
      notes: 'Hanoi sales manages B2B operations',
      isActive: true,
      position: 42,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales HCMC -> Sales HCMC Retail (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HCMC_TO_SALES_HCMC_RETAIL,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC_RETAIL,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 43,
      notes: 'HCMC sales manages retail operations',
      isActive: true,
      position: 43,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_SOUTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales HCMC -> Sales HCMC B2B (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HCMC_TO_SALES_HCMC_B2B,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC_B2B,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 44,
      notes: 'HCMC sales manages B2B operations',
      isActive: true,
      position: 44,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_SOUTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Components -> Tech UI Library (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_COMPONENTS_TO_TECH_UI_LIBRARY,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_UI_LIBRARY,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 45,
      notes: 'Component development manages UI libraries',
      isActive: true,
      position: 45,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Components -> Tech Design System (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_COMPONENTS_TO_TECH_DESIGN_SYSTEM,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_DESIGN_SYSTEM,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 46,
      notes: 'Component development manages design systems',
      isActive: true,
      position: 46,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // ================= LEVEL 6 HIERARCHIES =================

    // Sales Hanoi Retail -> Sales Hanoi Retail Online (Level 5 -> Level 6)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_RETAIL_TO_ONLINE,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
      childDepartmentId:
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_ONLINE,
      hierarchyLevel: 6,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 51,
      notes: 'Hanoi retail manages online sales channels',
      isActive: true,
      position: 51,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Hanoi Retail -> Sales Hanoi Retail Offline (Level 5 -> Level 6)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_RETAIL_TO_OFFLINE,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
      childDepartmentId:
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_OFFLINE,
      hierarchyLevel: 6,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 52,
      notes: 'Hanoi retail manages offline stores',
      isActive: true,
      position: 52,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech UI Library -> Tech Component Library (Level 5 -> Level 6)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_UI_LIBRARY_TO_TECH_COMPONENT_LIB,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_UI_LIBRARY,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENT_LIB,
      hierarchyLevel: 6,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 53,
      notes: 'UI Library manages component libraries',
      isActive: true,
      position: 53,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_UI_LIBRARY,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Design System -> Tech Theme System (Level 5 -> Level 6)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_DESIGN_SYSTEM_TO_TECH_THEME_SYSTEM,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_DESIGN_SYSTEM,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_THEME_SYSTEM,
      hierarchyLevel: 6,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 54,
      notes: 'Design System manages theming systems',
      isActive: true,
      position: 54,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_DESIGN_SYSTEM,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // ================= LEVEL 7 HIERARCHIES =================

    // Sales Hanoi Retail Online -> Sales Hanoi E-commerce (Level 6 -> Level 7)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_RETAIL_ONLINE_TO_ECOMMERCE,
      parentDepartmentId:
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_ONLINE,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_ECOMMERCE,
      hierarchyLevel: 7,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 61,
      notes: 'Online retail manages e-commerce platforms',
      isActive: true,
      position: 61,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_ONLINE,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Hanoi Retail Online -> Sales Hanoi Social Commerce (Level 6 -> Level 7)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_RETAIL_ONLINE_TO_SOCIAL,
      parentDepartmentId:
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_ONLINE,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_SOCIAL,
      hierarchyLevel: 7,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 62,
      notes: 'Online retail manages social commerce channels',
      isActive: true,
      position: 62,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_ONLINE,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },
  ];
