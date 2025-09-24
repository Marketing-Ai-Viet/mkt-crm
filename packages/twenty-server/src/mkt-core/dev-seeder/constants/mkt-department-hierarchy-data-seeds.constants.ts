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
  /** Báo cáo gián tiếp qua dotted line */
  DOTTED_LINE = 'DOTTED_LINE',
  /** Quan hệ ngang cấp đồng đẳng */
  PEER = 'PEER',
  /** Liên chức năng giữa các phòng ban */
  CROSS_FUNCTIONAL = 'CROSS_FUNCTIONAL',
  /** Team ảo cho dự án remote */
  VIRTUAL = 'VIRTUAL',
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
 * Cấu trúc dữ liệu seed cho phân cấp phòng ban với Enterprise RBAC (Streamlined)
 * Chỉ chứa các field cần thiết phù hợp với workspace entity
 */
type MktDepartmentHierarchyDataSeed = {
  /** ID duy nhất của quan hệ phân cấp */
  id: string;
  /** ID phòng ban cha */
  parentDepartmentId: string | null;
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
  /** Có quyền truy cập dữ liệu nhạy cảm không */
  canAccessSensitiveData?: boolean;

  // ================= BUSINESS RULE FIELDS =================
  /** Có thể override quyết định cấp dưới không */
  canOverrideSubordinates?: boolean;
  /** Yêu cầu dual approval không */
  requiresDualApproval?: boolean;
  /** Yêu cầu MFA không */
  requiresMFA?: boolean;
  /** Có thể truy cập ngoài giờ không */
  canAccessAfterHours?: boolean;

  // ================= COMPLIANCE FIELDS =================
  /** Cần tracking đầy đủ không */
  requiresFullAuditTrail?: boolean;
  /** Có thể xóa dữ liệu không */
  canDeleteData?: boolean;
  /** Tuân thủ GDPR không */
  gdprCompliant?: boolean;

  // ================= METADATA FIELDS =================
  /** Mức độ ưu tiên (1-10, 10=cao nhất) */
  priorityLevel?: number;
  /** Trọng số quyền (0-100) */
  permissionWeight?: number;
  /** Ghi chú bảo mật */
  securityNotes?: string;
};

/**
 * Danh sách các cột cần thiết cho bảng MktDepartmentHierarchy
 * Được sử dụng để validation và migration (Streamlined)
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
    'canAccessSensitiveData',

    // Business rule fields
    'canOverrideSubordinates',
    'requiresDualApproval',
    'requiresMFA',
    'canAccessAfterHours',

    // Compliance fields
    'requiresFullAuditTrail',
    'canDeleteData',
    'gdprCompliant',

    // Metadata fields
    'priorityLevel',
    'permissionWeight',
    'securityNotes',
  ];

/**
 * ID constants cho các quan hệ phân cấp phòng ban
 * Được tổ chức theo cấp độ hierarchy và loại quan hệ
 */
export const MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS = {
  // ================= LEVEL 0: ROOT HIERARCHIES =================
  // Admin là root department quản lý tất cả các phòng ban khác
  CEO: '8795ae87-12e1-4193-9b24-cf4f2894a3b0',

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
      relationshipType: MktDepartmentHierarchyRelationType.SUPERVISORY,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 1,
      notes:
        'Sales supervises Support operations with direct oversight authority',
      isActive: true,
      position: 1,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: false,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,
      // Business rule fields
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: false,
      // Compliance fields
      requiresFullAuditTrail: false,
      canDeleteData: false,
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 3,
      permissionWeight: 25,
      securityNotes: 'Standard sales-support hierarchy relationship',
    },

    // Sales Department has oversight of Accounting for revenue tracking
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_ACCOUNTING,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.CROSS_FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 2,
      notes:
        'Cross-functional collaboration for revenue tracking and financial reporting',
      isActive: true,
      position: 2,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: true,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.CONFIDENTIAL,
      canApprove: false,
      canDelegate: false,
      canAudit: true,
      canManageUsers: false,
      canAccessSensitiveData: true,
      // Business rule fields
      canOverrideSubordinates: false,
      requiresDualApproval: true,
      requiresMFA: true,
      canAccessAfterHours: true,
      // Compliance fields
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 8,
      permissionWeight: 75,
      securityNotes:
        'High security functional relationship for financial oversight',
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
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: false,
      canEditTeamData: false,
      canExportTeamData: false,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,
      // Business rule fields
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: true,
      // Compliance fields
      requiresFullAuditTrail: false,
      canDeleteData: false,
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 4,
      permissionWeight: 30,
      securityNotes:
        'Matrix technical support relationship with limited permissions',
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
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.CONFIDENTIAL,
      canApprove: true,
      canDelegate: true,
      canAudit: true,
      canManageUsers: true,
      canAccessSensitiveData: true,
      // Business rule fields
      canOverrideSubordinates: true,
      requiresDualApproval: true,
      requiresMFA: true,
      canAccessAfterHours: true,
      // Compliance fields
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 9,
      permissionWeight: 85,
      securityNotes:
        'High-level administrative control over HR with sensitive data access',
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
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: true,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.TOP_SECRET,
      canApprove: true,
      canDelegate: false,
      canAudit: true,
      canManageUsers: false,
      canAccessSensitiveData: true,
      // Business rule fields
      canOverrideSubordinates: true,
      requiresDualApproval: true,
      requiresMFA: true,
      canAccessAfterHours: true,
      // Compliance fields
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 10,
      permissionWeight: 95,
      securityNotes:
        'Critical administrative-financial oversight with maximum security requirements',
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
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: false,
      canEditTeamData: false,
      canExportTeamData: false,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,
      // Business rule fields
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: false,
      // Compliance fields
      requiresFullAuditTrail: false,
      canDeleteData: false,
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 2,
      permissionWeight: 15,
      securityNotes: 'Low-risk matrix collaboration for product development',
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
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: false,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.CONFIDENTIAL,
      canApprove: true,
      canDelegate: true,
      canAudit: true,
      canManageUsers: true,
      canAccessSensitiveData: true,
      // Business rule fields
      canOverrideSubordinates: true,
      requiresDualApproval: false,
      requiresMFA: true,
      canAccessAfterHours: true,
      // Compliance fields
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 7,
      permissionWeight: 70,
      securityNotes:
        'Administrative control over technology operations with high security',
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
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.CONFIDENTIAL,
      canApprove: true,
      canDelegate: true,
      canAudit: true,
      canManageUsers: true,
      canAccessSensitiveData: true,
      // Business rule fields
      canOverrideSubordinates: true,
      requiresDualApproval: true,
      requiresMFA: true,
      canAccessAfterHours: true,
      // Compliance fields
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 8,
      permissionWeight: 80,
      securityNotes:
        'Strategic administrative oversight with high-level sales access',
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
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: false,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.CONFIDENTIAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: true,
      // Business rule fields
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: true,
      canAccessAfterHours: false,
      // Compliance fields
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 6,
      permissionWeight: 55,
      securityNotes:
        'HR-IT matrix for employee technology management with sensitive data access',
    },

    // Additional comprehensive hierarchy relationships

    // HR -> Support: Advisory relationship for employee support
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.HR_SUPPORT_FUNCTIONAL,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.ADVISORY,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 10,
      notes:
        'HR provides advisory guidance for employee support policies and training',
      isActive: true,
      position: 10,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: false,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,
      // Business rule fields
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: false,
      // Compliance fields
      requiresFullAuditTrail: false,
      canDeleteData: false,
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 4,
      permissionWeight: 35,
      securityNotes: 'Standard HR-Support functional relationship for training',
    },

    // Accounting -> Support: Financial tracking relationship
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ACCOUNTING_SUPPORT_FUNCTIONAL,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 11,
      notes:
        'Accounting tracks support department operational costs and resource usage',
      isActive: true,
      position: 11,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: true,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.CONFIDENTIAL,
      canApprove: false,
      canDelegate: false,
      canAudit: true,
      canManageUsers: false,
      canAccessSensitiveData: true,
      // Business rule fields
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: true,
      canAccessAfterHours: false,
      // Compliance fields
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 7,
      permissionWeight: 60,
      securityNotes:
        'Financial oversight relationship with confidential data access',
    },

    // CEO-level oversight relationships (high-security)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.CEO,
      parentDepartmentId: null, // CEO has no parent
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      hierarchyLevel: 0, // CEO level
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: false, // CEO is top level
      allowsCrossBranchAccess: true,
      displayOrder: 12,
      notes:
        'CEO has ultimate oversight and control over all administrative functions',
      isActive: true,
      position: 12,
      createdBySource: 'SYSTEM',
      createdByWorkspaceMemberId: null,
      createdByName: 'System Admin',
      // Basic RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.CEO,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
      // Enhanced RBAC fields
      minimumSecurityLevel: SecurityLevel.TOP_SECRET,
      canApprove: true,
      canDelegate: true,
      canAudit: true,
      canManageUsers: true,
      canAccessSensitiveData: true,
      // Business rule fields
      canOverrideSubordinates: true,
      requiresDualApproval: false, // CEO doesn't need dual approval
      requiresMFA: true,
      canAccessAfterHours: true,
      // Compliance fields
      requiresFullAuditTrail: true,
      canDeleteData: true, // CEO has ultimate authority
      gdprCompliant: true,
      // Metadata fields
      priorityLevel: 10,
      permissionWeight: 100,
      securityNotes:
        'Maximum security CEO oversight with ultimate authority and full permissions',
    },

    // Dotted Line Reporting: Admin to Support with dotted line supervision
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_SUPPORT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.DOTTED_LINE,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 13,
      notes:
        'Dotted line reporting from Admin to Support for oversight coordination',
      isActive: true,
      position: 13,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: false,
      canEditTeamData: false,
      canExportTeamData: false,
      minimumSecurityLevel: SecurityLevel.CONFIDENTIAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: true,
      canAccessAfterHours: true,
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,
      priorityLevel: 8,
      permissionWeight: 20,
      securityNotes: 'Dotted line reporting for strategic escalation only',
    },

    // Peer Relationship: Sales & Tech Department Heads
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TO_SALES_DOMESTIC,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.PEER,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: false,
      allowsCrossBranchAccess: true,
      displayOrder: 14,
      notes:
        'Peer collaboration between Sales and Tech for product development',
      isActive: true,
      position: 14,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: false,
      canEditTeamData: false,
      canExportTeamData: false,
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: false,
      requiresFullAuditTrail: false,
      canDeleteData: false,
      gdprCompliant: true,
      priorityLevel: 3,
      permissionWeight: 10,
      securityNotes: 'Standard peer relationship for collaborative projects',
    },

    // Virtual Team: Sales to Sales Export as virtual coordination
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TO_SALES_EXPORT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.VIRTUAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: DateTime.fromISO('2024-12-31').toJSDate(),
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 15,
      notes: 'Virtual coordination between Sales and Sales Export teams',
      isActive: true,
      position: 15,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: false,
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: true,
      canAccessAfterHours: true,
      requiresFullAuditTrail: false,
      canDeleteData: false,
      gdprCompliant: true,
      priorityLevel: 5,
      permissionWeight: 40,
      securityNotes: 'Virtual team with limited time-bound permissions',
    },

    // Temporary Project Team: Tech to Tech Frontend
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_TO_TECH_FRONTEND,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.TEMPORARY,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: DateTime.fromISO('2024-06-30').toJSDate(),
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 16,
      notes: 'Temporary project coordination between Tech and Tech Frontend',
      isActive: true,
      position: 16,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Sales Manager',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: false,
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: false,
      requiresFullAuditTrail: false,
      canDeleteData: false,
      gdprCompliant: true,
      priorityLevel: 4,
      permissionWeight: 30,
      securityNotes: 'Temporary team with inherited tech permissions',
    },
  ];
