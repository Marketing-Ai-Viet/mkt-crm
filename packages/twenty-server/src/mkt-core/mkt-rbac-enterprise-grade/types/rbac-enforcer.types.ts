/**
 * RBAC Enforcer Service Types
 *
 * Types cho permission checking, data filtering và permission summary.
 * Prefix "Rbac" để phân biệt với các types khác trong hệ thống.
 */

// ============================================
// FILTER TYPES
// ============================================

/**
 * Filter operator cho data filtering
 * Các toán tử so sánh để lọc dữ liệu
 */
export type RbacFilterOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'IN'
  | 'NOT_IN'
  | 'LIKE'
  | 'IS_NULL'
  | 'IS_NOT_NULL'
  | 'ALL';

/**
 * Single filter condition - Một điều kiện lọc đơn lẻ
 */
export type RbacFilterConditionItem = {
  field: string;
  operator: RbacFilterOperator;
  value: unknown;
  description?: string;
};

/**
 * Filter condition group (AND/OR) - Nhóm điều kiện lọc
 */
export type RbacFilterCondition = {
  type: 'AND' | 'OR';
  conditions: RbacFilterConditionItem[];
};

// ============================================
// POLICY TYPES
// ============================================

/**
 * Applied policy info - Thông tin policy đã được áp dụng trong permission check
 */
export type RbacAppliedPolicy = {
  policyId: string;
  policyName: string;
  policyType: string;
  effect: 'allow' | 'deny';
};

/**
 * Active policy info - Thông tin policy đang hoạt động cho user
 */
export type RbacActivePolicy = {
  policyId: string;
  policyName: string;
  objectName: string;
  policyType: string;
};

// ============================================
// PERMISSION CHECK TYPES
// ============================================

/**
 * Permission check result - Kết quả kiểm tra quyền
 */
export type RbacCheckPermissionResult = {
  allowed: boolean;
  reason: string;
  latencyMs: number;
  cached: boolean;
  appliedPolicies: RbacAppliedPolicy[];
  dataFilter: RbacFilterCondition | null;
};

// ============================================
// PERMISSION SUMMARY TYPES
// ============================================

/**
 * Resource permission summary - Tóm tắt quyền cho một resource
 */
export type RbacResourcePermission = {
  resourceKey: string;
  resourceName: string;
  allowedActions: string[];
  deniedActions: string[];
  hasDataFilter: boolean;
};

/**
 * User permission summary - Tóm tắt toàn bộ quyền của user
 */
export type RbacPermissionSummary = {
  userId: string;
  workspaceMemberId: string;
  departmentId: string | null;
  departmentName: string | null;
  hierarchyLevel: number;
  levelCode: string;
  roles: string[];
  permissionCount: number;
  resources: RbacResourcePermission[];
  activePolicies: RbacActivePolicy[];
};

// ============================================
// INTERNAL TYPES
// ============================================

/**
 * Permission data grouped by resource - Dữ liệu quyền nhóm theo resource (internal)
 */
export type RbacResourcePermissionData = {
  allowed: string[];
  denied: string[];
};

/**
 * Permission entry format từ Casbin - [subject, object, action, effect?, condition?]
 */
export type RbacPermissionEntry = string[];

// ============================================
// OPERATOR MAPPING
// ============================================

/**
 * Filter expression operator mapping - Mapping từ filter expression operators sang RbacFilterOperator
 */
export const RBAC_FILTER_OPERATOR_MAP: Record<string, RbacFilterOperator> = {
  $eq: '=',
  $ne: '!=',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $in: 'IN',
  $nin: 'NOT_IN',
  $like: 'LIKE',
  $isNull: 'IS_NULL',
  $exists: 'IS_NOT_NULL',
};
