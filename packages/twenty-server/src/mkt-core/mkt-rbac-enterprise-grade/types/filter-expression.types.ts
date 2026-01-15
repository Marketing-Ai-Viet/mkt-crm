/**
 * Filter Expression Types for RBAC
 *
 * Hệ thống có 2 loại filter khác nhau, cần phân biệt rõ:
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                    PERMISSION CONTEXT (Template Layer)                      │
 * │                                                                             │
 * │  Entity: MktPermissionContextWorkspaceEntity                                │
 * │  Field: filterExpression                                                    │
 * │  Type: TemplateFilterExpression                                             │
 * │                                                                             │
 * │  Mục đích: Định nghĩa TEMPLATE filter với biến động ($user.*, $context.*)   │
 * │  Ai tạo: Admin/System seed                                                  │
 * │  Khi nào: Design time (khi setup permissions)                               │
 * │                                                                             │
 * │  Ví dụ:                                                                     │
 * │  {                                                                          │
 * │    "createdById": "$user.workspaceMemberId",                                │
 * │    "departmentId": { "$in": "$user.departmentDescendantIds" }               │
 * │  }                                                                          │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *                                      │
 *                                      │ Runtime Resolution
 *                                      ▼
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                    DATA ACCESS POLICY (Runtime Layer)                       │
 * │                                                                             │
 * │  Entity: MktDataAccessPolicyWorkspaceEntity                                 │
 * │  Field: filterConditions                                                    │
 * │  Type: ResolvedFilterConditions                                             │
 * │                                                                             │
 * │  Mục đích: Filter ĐÃ RESOLVE với giá trị cụ thể, sẵn sàng apply vào query   │
 * │  Ai tạo: System generate từ template + user context                         │
 * │  Khi nào: Runtime (khi user request data)                                   │
 * │                                                                             │
 * │  Ví dụ:                                                                     │
 * │  {                                                                          │
 * │    "createdById": "member-uuid-123",                                        │
 * │    "departmentId": { "$in": ["dept-1", "dept-2", "dept-3"] }                │
 * │  }                                                                          │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// ============================================
// TEMPLATE FILTER (PermissionContext)
// ============================================

/**
 * Các biến được hỗ trợ trong template filter
 * Được resolve runtime từ RBACUserContext
 */
export const TEMPLATE_VARIABLES = {
  // User identifiers
  USER_ID: '$user.userId',
  WORKSPACE_MEMBER_ID: '$user.workspaceMemberId',
  WORKSPACE_ID: '$user.workspaceId',

  // Department
  DEPARTMENT_ID: '$user.departmentId',
  DEPARTMENT_ANCESTOR_IDS: '$user.departmentAncestorIds',
  DEPARTMENT_DESCENDANT_IDS: '$user.departmentDescendantIds',

  // Team & relationships
  TEAM_MEMBER_IDS: '$user.teamMemberIds',
  SUBORDINATE_MEMBER_IDS: '$user.subordinateMemberIds',
  SUPPORTING_MEMBER_IDS: '$user.supportingMemberIds',

  // Hierarchy
  HIERARCHY_LEVEL: '$user.hierarchyLevel',
  ORGANIZATION_LEVEL_ID: '$user.organizationLevelId',

  // Conditional context (từ request)
  CONTEXT_VALUE: '$context.value',
  CONTEXT_MAX_VALUE: '$context.maxValue',
  CONTEXT_MIN_VALUE: '$context.minValue',
} as const;

export type TemplateVariable =
  (typeof TEMPLATE_VARIABLES)[keyof typeof TEMPLATE_VARIABLES];

/**
 * Operators được hỗ trợ trong filter expression
 */
export const FILTER_OPERATORS = {
  // Comparison
  EQ: '$eq',
  NE: '$ne',
  GT: '$gt',
  GTE: '$gte',
  LT: '$lt',
  LTE: '$lte',

  // Array/Set
  IN: '$in',
  NIN: '$nin',

  // String
  CONTAINS: '$contains',
  STARTS_WITH: '$startsWith',
  ENDS_WITH: '$endsWith',
  REGEX: '$regex',

  // Logical
  AND: '$and',
  OR: '$or',
  NOT: '$not',

  // Existence
  EXISTS: '$exists',
  IS_NULL: '$isNull',
} as const;

export type FilterOperator =
  (typeof FILTER_OPERATORS)[keyof typeof FILTER_OPERATORS];

/**
 * Filter condition có thể là:
 * - Giá trị trực tiếp (string, number, boolean)
 * - Template variable ($user.*, $context.*)
 * - Object với operator
 */
export type TemplateFilterValue =
  | string
  | number
  | boolean
  | null
  | TemplateVariable
  | { [K in FilterOperator]?: TemplateFilterValue | TemplateFilterValue[] };

/**
 * Template Filter Expression - dùng trong PermissionContext.filterExpression
 * Chứa các biến động sẽ được resolve runtime
 */
export type TemplateFilterExpression = {
  [fieldName: string]: TemplateFilterValue;
};

// ============================================
// RESOLVED FILTER (DataAccessPolicy)
// ============================================

/**
 * Resolved filter value - đã replace tất cả template variables
 * thành giá trị thực tế
 */
export type ResolvedFilterValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | { [K in FilterOperator]?: ResolvedFilterValue | ResolvedFilterValue[] };

/**
 * Resolved Filter Conditions - dùng trong DataAccessPolicy.filterConditions
 * Đã resolve tất cả variables, sẵn sàng apply vào database query
 */
export type ResolvedFilterConditions = {
  [fieldName: string]: ResolvedFilterValue;
};

// ============================================
// FILTER RESOLUTION
// ============================================

/**
 * Context để resolve template variables
 */
export type FilterResolutionContext = {
  user: {
    userId: string;
    workspaceMemberId: string;
    workspaceId: string;
    departmentId: string | null;
    departmentAncestorIds: string[];
    departmentDescendantIds: string[];
    teamMemberIds: string[];
    subordinateMemberIds: string[];
    supportingMemberIds: string[];
    hierarchyLevel: number;
    organizationLevelId: string | null;
  };
  context?: {
    value?: unknown;
    maxValue?: number;
    minValue?: number;
    [key: string]: unknown;
  };
};

/**
 * Result của việc resolve filter
 */
export type FilterResolutionResult = {
  success: boolean;
  resolvedFilter: ResolvedFilterConditions | null;
  unresolvedVariables: string[];
  errors: string[];
};

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Check xem value có phải template variable không
 */
export const isTemplateVariable = (value: unknown): value is TemplateVariable =>
  typeof value === 'string' &&
  (value.startsWith('$user.') || value.startsWith('$context.'));

/**
 * Check xem filter có chứa template variables không
 * (để phân biệt TemplateFilterExpression vs ResolvedFilterConditions)
 */
export const hasTemplateVariables = (filter: unknown): boolean => {
  if (filter === null || filter === undefined) {
    return false;
  }

  if (typeof filter === 'string') {
    return isTemplateVariable(filter);
  }

  if (Array.isArray(filter)) {
    return filter.some((item) => hasTemplateVariables(item));
  }

  if (typeof filter === 'object') {
    return Object.values(filter).some((value) => hasTemplateVariables(value));
  }

  return false;
};
