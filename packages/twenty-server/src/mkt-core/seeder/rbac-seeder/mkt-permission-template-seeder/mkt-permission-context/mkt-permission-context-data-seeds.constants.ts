import { CONTEXT_TYPE } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/permission-template/options.constants';

/**
 * Permission Context Data Seeds
 *
 * Định nghĩa các system default contexts cho RBAC template layer.
 * Các context này chứa filterExpression với template variables ($user.*, $context.*)
 * sẽ được resolve runtime thành actual values.
 *
 * @see /docs/RBAC-REFACTOR-PLAN.md
 */

type MktPermissionContextDataSeed = {
  id: string;
  name: string;
  description?: string;
  contextType: string;
  contextKey: string;
  filterExpression: object;
  priority: number;
  isActive: boolean;
  isSystemDefault: boolean;
  position: number;
  validationRules?: object;
};

export const MKT_PERMISSION_CONTEXT_DATA_SEED_COLUMNS: (keyof MktPermissionContextDataSeed)[] =
  [
    'id',
    'name',
    'description',
    'contextType',
    'contextKey',
    'filterExpression',
    'priority',
    'isActive',
    'isSystemDefault',
    'position',
    'validationRules',
  ];

export const MKT_PERMISSION_CONTEXT_DATA_SEED_IDS = {
  // Core contexts
  OWN_RECORDS: '8c6a3b2d-1e4f-5a6b-7c8d-9e0f1a2b3c4d',
  OWN_AND_SUPPORTING: '1b6ee951-c060-4073-850a-1bf3688464d5',
  TEAM_RECORDS: '1a15212b-9ce0-4ae0-8479-93e7fba70f2b',
  HIERARCHICAL_RECORDS: 'abcd2107-b8c4-448d-a5ec-d63097b85284',
  DEPARTMENT_RECORDS: '9cb0b9a2-3bcc-49ff-ab92-4895cefcdd01',
  ALL_RECORDS: 'ca257a1d-232f-42fd-b374-9a1c71e0fe7c',
  // Data classification contexts
  INTERNAL_COMPANY: 'e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b',
} as const;

/**
 * System default permission contexts
 *
 * Các context này được seed 1 lần khi khởi tạo workspace.
 * filterExpression chứa template variables sẽ được resolve runtime.
 */
export const MKT_PERMISSION_CONTEXT_DATA_SEEDS: MktPermissionContextDataSeed[] =
  [
    // ============================================
    // OWN_RECORDS - Nhân viên chỉ xem record của mình
    // ============================================
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS,
      name: 'Own Records Only',
      description:
        'User can only access records they created or are assigned to',
      contextType: CONTEXT_TYPE.OWN_RECORDS,
      contextKey: 'own',
      filterExpression: {
        // $or: Người dùng có thể xem nếu là người tạo HOẶC được assign
        $or: [
          { createdById: '$user.workspaceMemberId' },
          { accountOwnerId: '$user.workspaceMemberId' },
        ],
      },
      priority: 0, // Thấp nhất - default fallback
      isActive: true,
      isSystemDefault: true,
      position: 1,
      validationRules: {
        requiresWorkspaceMemberId: true,
        description: 'Requires user to be authenticated with workspaceMemberId',
      },
    },

    // ============================================
    // OWN_AND_SUPPORTING - Xem record mình và supporting members
    // ============================================
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_AND_SUPPORTING,
      name: 'Own and Supporting Records',
      description:
        'User can access own records and records of supporting members',
      contextType: CONTEXT_TYPE.OWN_RECORDS,
      contextKey: 'own_and_supporting',
      filterExpression: {
        $or: [
          // Record do mình tạo
          { createdById: '$user.workspaceMemberId' },
          // Record được assign cho mình
          { accountOwnerId: '$user.workspaceMemberId' },
          // Record do supporting members tạo
          { createdById: { $in: '$user.supportingMemberIds' } },
        ],
      },
      priority: 5,
      isActive: true,
      isSystemDefault: true,
      position: 2,
      validationRules: {
        requiresWorkspaceMemberId: true,
        requiresSupportingMembers: false, // Có thể rỗng
        description:
          'User sees own records plus records from supporting members',
      },
    },

    // ============================================
    // TEAM_RECORDS - Xem record của team
    // ============================================
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      name: 'Team Records',
      description: 'User can access records of their team members',
      contextType: CONTEXT_TYPE.TEAM_RECORDS,
      contextKey: 'team',
      filterExpression: {
        $or: [
          // Record do mình tạo
          { createdById: '$user.workspaceMemberId' },
          // Record do team members tạo
          { createdById: { $in: '$user.teamMemberIds' } },
          // Record được assign cho team members
          { accountOwnerId: { $in: '$user.teamMemberIds' } },
        ],
      },
      priority: 10,
      isActive: true,
      isSystemDefault: true,
      position: 3,
      validationRules: {
        requiresWorkspaceMemberId: true,
        requiresTeamMembers: false, // Có thể rỗng nếu không có team
        description:
          'User sees records from all team members within same department',
      },
    },

    // ============================================
    // HIERARCHICAL_RECORDS - Xem record theo chuỗi báo cáo
    // ============================================
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.HIERARCHICAL_RECORDS,
      name: 'Hierarchical Records',
      description: 'User can access records of subordinates in reporting chain',
      contextType: CONTEXT_TYPE.TEAM_RECORDS, // Sử dụng TEAM_RECORDS vì chưa có HIERARCHICAL trong options
      contextKey: 'hierarchical',
      filterExpression: {
        $or: [
          // Record do mình tạo
          { createdById: '$user.workspaceMemberId' },
          // Record do subordinates tạo (cấp dưới trực tiếp và gián tiếp)
          { createdById: { $in: '$user.subordinateMemberIds' } },
        ],
      },
      priority: 15,
      isActive: true,
      isSystemDefault: true,
      position: 4,
      validationRules: {
        requiresWorkspaceMemberId: true,
        requiresSubordinates: false, // Có thể rỗng nếu không có cấp dưới
        requiresManagerRole: false, // Không bắt buộc phải là manager
        description:
          'User sees own records and records from entire subordinate chain',
      },
    },

    // ============================================
    // DEPARTMENT_RECORDS - Xem record của phòng ban
    // ============================================
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      name: 'Department Records',
      description:
        'User can access records from own department and child departments',
      contextType: CONTEXT_TYPE.DEPARTMENT_RECORDS,
      contextKey: 'department',
      filterExpression: {
        $or: [
          // Record thuộc department của mình
          { departmentId: '$user.departmentId' },
          // Record thuộc các department con
          { departmentId: { $in: '$user.departmentDescendantIds' } },
        ],
      },
      priority: 20,
      isActive: true,
      isSystemDefault: true,
      position: 5,
      validationRules: {
        requiresDepartmentId: true,
        includeDescendants: true,
        description:
          'User sees all records from own department and child departments',
      },
    },

    // ============================================
    // INTERNAL_COMPANY - Toàn công ty xem được (READ only)
    // Dùng cho resource có dataClassification = PUBLIC hoặc INTERNAL
    // ============================================
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.INTERNAL_COMPANY,
      name: 'Internal Company Records',
      description:
        'All active employees can read PUBLIC and INTERNAL classified resources',
      contextType: CONTEXT_TYPE.ALL_RECORDS,
      contextKey: 'internal_company',
      filterExpression: {}, // Không lọc - tất cả records đều truy cập được
      priority: 50, // Giữa DEPARTMENT (20) và ALL (100)
      isActive: true,
      isSystemDefault: true,
      position: 7,
      validationRules: {
        description:
          'Company-wide read access for PUBLIC and INTERNAL classified resources',
        requiresActiveAccount: true,
        allowedActions: ['READ'],
      },
    },

    // ============================================
    // ALL_RECORDS - Xem tất cả (không filter)
    // ============================================
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      name: 'All Records',
      description: 'User can access all records without restriction',
      contextType: CONTEXT_TYPE.ALL_RECORDS,
      contextKey: 'all',
      filterExpression: {}, // Empty = no filter = all access
      priority: 100, // Cao nhất
      isActive: true,
      isSystemDefault: true,
      position: 6,
      validationRules: {
        noRestrictions: true,
        description:
          'Full access - typically for executives and system administrators',
      },
    },
  ];

// ============================================
// DERIVED CONSTANTS
// ============================================

/**
 * All active contexts
 */
export const ACTIVE_PERMISSION_CONTEXTS =
  MKT_PERMISSION_CONTEXT_DATA_SEEDS.filter((context) => context.isActive);

/**
 * System default contexts only
 */
export const SYSTEM_DEFAULT_CONTEXTS = MKT_PERMISSION_CONTEXT_DATA_SEEDS.filter(
  (context) => context.isSystemDefault,
);

/**
 * Mapping từ dataAccessScope sang contextKey
 * Dùng để map OrganizationLevel.dataAccessScope → PermissionContext.contextKey
 */
export const DATA_ACCESS_SCOPE_TO_CONTEXT_KEY: Record<string, string> = {
  ALL_DEPARTMENTS: 'all',
  OWN_AND_CHILD_DEPARTMENTS: 'department',
  OWN_DEPARTMENT_AND_TEAM: 'team',
  OWN_RECORDS: 'own',
};
