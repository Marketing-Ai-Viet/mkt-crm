import { DateTime } from 'luxon';

import { MKT_DEPARTMENT_DATA_SEEDS_IDS } from './mkt-department-data-seeds.constants';

/**
 * Simplified Department Hierarchy Relation Types
 * Based on RBAC_SIMPLIFIED_SETUP_GUIDE.md - Only 4 core departments
 */
export enum MktDepartmentHierarchyRelationType {
  /** Quan hệ cha-con trực tiếp với quyền kế thừa đầy đủ */
  PARENT_CHILD = 'PARENT_CHILD',
  /** Quan hệ ma trận cho phép truy cập từ nhiều hướng */
  MATRIX = 'MATRIX',
  /** Quan hệ chức năng với quyền hạn chế */
  FUNCTIONAL = 'FUNCTIONAL',
  /** Quan hệ giám sát với quyền xem và kiểm soát */
  SUPERVISORY = 'SUPERVISORY',
  /** Quan hệ ngang cấp đồng đẳng */
  PEER = 'PEER',
  /** Liên chức năng giữa các phòng ban */
  CROSS_FUNCTIONAL = 'CROSS_FUNCTIONAL',
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
 * Cấu trúc dữ liệu seed cho phân cấp phòng ban với Simplified RBAC
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
 * Simplified Hierarchy IDs - 4 core departments + Sales teams hierarchy
 * Based on RBAC_SIMPLIFIED_SETUP_GUIDE.md
 */
export const MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS = {
  /** Admin quản lý Sales */
  ADMIN_TO_SALES: 'e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b',
  /** Admin quản lý Support */
  ADMIN_TO_SUPPORT: 'f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c',
  /** Admin quản lý Accounting */
  ADMIN_TO_ACCOUNTING: 'b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
  /** Sales hỗ trợ Support (cross-functional) */
  SALES_TO_SUPPORT: '7d8e9f0a-1b2c-3d4e-5f6a-7b8c9d0e1f2a',
  /** Sales -> Accounting (theo dõi doanh thu) */
  SALES_TO_ACCOUNTING: '8e9f0a1b-2c3d-4e5f-6a7b-8c9d0e1f2a3b',

  // Sales sub-department hierarchies
  /** Sales -> Sales Team A */
  SALES_TO_TEAM_A: 'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a',
  /** Sales -> Sales Team B */
  SALES_TO_TEAM_B: 'e2f3a4b5-6c7d-8e9f-0a1b-2c3d4e5f6a7b',
  /** Sales -> Sales Team C */
  SALES_TO_TEAM_C: 'f3a4b5c6-7d8e-9f0a-1b2c-3d4e5f6a7b8c',
};

/**
 * Simplified Department Hierarchy Data Seeds
 * Only 4 departments with minimal hierarchical relationships
 */
export const MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS: MktDepartmentHierarchyDataSeed[] =
  [
    // ================= ADMIN -> SALES =================
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_TO_SALES,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.SUPERVISORY,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 1,
      notes: 'Admin giám sát Sales department, có quyền xem và quản lý',
      isActive: true,
      position: 1,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',

      // RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,

      // Enhanced RBAC
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: true,
      canDelegate: true,
      canAudit: true,
      canManageUsers: true,
      canAccessSensitiveData: true,

      // Business rules
      canOverrideSubordinates: true,
      requiresDualApproval: false,
      requiresMFA: true,
      canAccessAfterHours: true,

      // Compliance
      requiresFullAuditTrail: true,
      canDeleteData: true,
      gdprCompliant: true,

      // Metadata
      priorityLevel: 10,
      permissionWeight: 100,
      securityNotes: 'Admin có full access vào Sales department',
    },

    // ================= ADMIN -> SUPPORT =================
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_TO_SUPPORT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.SUPERVISORY,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 2,
      notes: 'Admin giám sát Support department, có quyền xem và quản lý',
      isActive: true,
      position: 2,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',

      // RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,

      // Enhanced RBAC
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: true,
      canDelegate: true,
      canAudit: true,
      canManageUsers: true,
      canAccessSensitiveData: true,

      // Business rules
      canOverrideSubordinates: true,
      requiresDualApproval: false,
      requiresMFA: true,
      canAccessAfterHours: true,

      // Compliance
      requiresFullAuditTrail: true,
      canDeleteData: true,
      gdprCompliant: true,

      // Metadata
      priorityLevel: 10,
      permissionWeight: 100,
      securityNotes: 'Admin có full access vào Support department',
    },

    // ================= ADMIN -> ACCOUNTING =================
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_TO_ACCOUNTING,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.SUPERVISORY,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 3,
      notes: 'Admin giám sát Accounting department, có quyền xem và quản lý',
      isActive: true,
      position: 3,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',

      // RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,

      // Enhanced RBAC
      minimumSecurityLevel: SecurityLevel.CONFIDENTIAL,
      canApprove: true,
      canDelegate: true,
      canAudit: true,
      canManageUsers: true,
      canAccessSensitiveData: true,

      // Business rules
      canOverrideSubordinates: true,
      requiresDualApproval: false,
      requiresMFA: true,
      canAccessAfterHours: true,

      // Compliance
      requiresFullAuditTrail: true,
      canDeleteData: true,
      gdprCompliant: true,

      // Metadata
      priorityLevel: 10,
      permissionWeight: 100,
      securityNotes: 'Admin có full access vào Accounting department',
    },

    // ================= SALES -> SUPPORT (Cross-functional) =================
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TO_SUPPORT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.CROSS_FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 4,
      notes:
        'Sales có thể xem dữ liệu Support để theo dõi customer issues sau bán hàng',
      isActive: true,
      position: 4,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',

      // RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: false,

      // Enhanced RBAC
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,

      // Business rules
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: true,

      // Compliance
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,

      // Metadata
      priorityLevel: 5,
      permissionWeight: 30,
      securityNotes:
        'Sales chỉ có quyền xem dữ liệu Support, không được chỉnh sửa',
    },

    // ================= SALES -> ACCOUNTING (Cross-functional) =================
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TO_ACCOUNTING,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.CROSS_FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 5,
      notes:
        'Sales có thể xem dữ liệu Accounting để theo dõi doanh thu và báo cáo tài chính',
      isActive: true,
      position: 5,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',

      // RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: false,

      // Enhanced RBAC
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,

      // Business rules
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: true,

      // Compliance
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,

      // Metadata
      priorityLevel: 6,
      permissionWeight: 40,
      securityNotes:
        'Sales có quyền xem dữ liệu Accounting (doanh thu), không được chỉnh sửa',
    },

    // ================= SALES -> SALES TEAM A =================
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TO_TEAM_A,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_TEAM_A,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 6,
      notes: 'Sales Team A thuộc Sales department, kế thừa permissions',
      isActive: true,
      position: 6,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',

      // RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_TEAM_A,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,

      // Enhanced RBAC
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,

      // Business rules
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: true,

      // Compliance
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,

      // Metadata
      priorityLevel: 7,
      permissionWeight: 70,
      securityNotes: 'Sales Team A kế thừa permissions từ Sales department',
    },

    // ================= SALES -> SALES TEAM B =================
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TO_TEAM_B,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_TEAM_B,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 7,
      notes: 'Sales Team B thuộc Sales department, kế thừa permissions',
      isActive: true,
      position: 7,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',

      // RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_TEAM_B,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,

      // Enhanced RBAC
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,

      // Business rules
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: true,

      // Compliance
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,

      // Metadata
      priorityLevel: 7,
      permissionWeight: 70,
      securityNotes: 'Sales Team B kế thừa permissions từ Sales department',
    },

    // ================= SALES -> SALES TEAM C =================
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TO_TEAM_C,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_TEAM_C,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 8,
      notes: 'Sales Team C thuộc Sales department, kế thừa permissions',
      isActive: true,
      position: 8,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',

      // RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_TEAM_C,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,

      // Enhanced RBAC
      minimumSecurityLevel: SecurityLevel.INTERNAL,
      canApprove: false,
      canDelegate: false,
      canAudit: false,
      canManageUsers: false,
      canAccessSensitiveData: false,

      // Business rules
      canOverrideSubordinates: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: true,

      // Compliance
      requiresFullAuditTrail: true,
      canDeleteData: false,
      gdprCompliant: true,

      // Metadata
      priorityLevel: 7,
      permissionWeight: 70,
      securityNotes: 'Sales Team C kế thừa permissions từ Sales department',
    },
  ];
