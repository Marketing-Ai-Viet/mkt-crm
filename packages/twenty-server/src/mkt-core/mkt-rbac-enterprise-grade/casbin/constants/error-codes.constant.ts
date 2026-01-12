/**
 * Permission error codes cho Casbin RBAC
 *
 * Sử dụng trong error responses và logging
 */
export const CASBIN_ERROR_CODES = {
  // ===== Permission Errors =====
  /**
   * Permission denied - user không có quyền
   */
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  /**
   * Role not assigned - user chưa được gán role
   */
  ROLE_NOT_ASSIGNED: 'ROLE_NOT_ASSIGNED',

  /**
   * Policy expired - temporary permission hết hạn
   */
  POLICY_EXPIRED: 'POLICY_EXPIRED',

  // ===== Security Errors =====
  /**
   * Cross tenant access - cố gắng truy cập workspace khác
   */
  CROSS_TENANT_ACCESS: 'CROSS_TENANT_ACCESS',

  /**
   * Privilege escalation - cố gắng nâng quyền
   */
  ESCALATION_PREVENTED: 'ESCALATION_PREVENTED',

  /**
   * Self modification - cố gắng sửa quyền của chính mình
   */
  SELF_MODIFICATION_DENIED: 'SELF_MODIFICATION_DENIED',

  // ===== Sync Errors =====
  /**
   * Sync failed - đồng bộ policy thất bại
   */
  SYNC_FAILED: 'SYNC_FAILED',

  /**
   * Sync in progress - đang có sync khác chạy
   */
  SYNC_IN_PROGRESS: 'SYNC_IN_PROGRESS',

  /**
   * Sync timeout - sync quá thời gian
   */
  SYNC_TIMEOUT: 'SYNC_TIMEOUT',

  // ===== Enforcer Errors =====
  /**
   * Enforcer error - lỗi từ Casbin enforcer
   */
  ENFORCER_ERROR: 'ENFORCER_ERROR',

  /**
   * Enforcer not initialized
   */
  ENFORCER_NOT_INITIALIZED: 'ENFORCER_NOT_INITIALIZED',

  /**
   * Policy load failed
   */
  POLICY_LOAD_FAILED: 'POLICY_LOAD_FAILED',

  // ===== Validation Errors =====
  /**
   * Invalid policy format
   */
  INVALID_POLICY_FORMAT: 'INVALID_POLICY_FORMAT',

  /**
   * Invalid subject format
   */
  INVALID_SUBJECT_FORMAT: 'INVALID_SUBJECT_FORMAT',

  /**
   * Invalid resource format
   */
  INVALID_RESOURCE_FORMAT: 'INVALID_RESOURCE_FORMAT',

  // ===== Context Errors =====
  /**
   * Workspace not found in context
   */
  WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',

  /**
   * User not found in context
   */
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // ===== Watcher Errors =====
  /**
   * Watcher disconnected
   */
  WATCHER_DISCONNECTED: 'WATCHER_DISCONNECTED',

  /**
   * Watcher reconnect failed
   */
  WATCHER_RECONNECT_FAILED: 'WATCHER_RECONNECT_FAILED',
} as const;

export type CasbinErrorCode =
  (typeof CASBIN_ERROR_CODES)[keyof typeof CASBIN_ERROR_CODES];

/**
 * Error messages mapping
 */
export const CASBIN_ERROR_MESSAGES: Record<CasbinErrorCode, string> = {
  [CASBIN_ERROR_CODES.PERMISSION_DENIED]:
    'Access denied: insufficient permissions',
  [CASBIN_ERROR_CODES.ROLE_NOT_ASSIGNED]:
    'Access denied: no role assigned to user',
  [CASBIN_ERROR_CODES.POLICY_EXPIRED]:
    'Access denied: temporary permission has expired',
  [CASBIN_ERROR_CODES.CROSS_TENANT_ACCESS]:
    'Access denied: cross-tenant access not allowed',
  [CASBIN_ERROR_CODES.ESCALATION_PREVENTED]:
    'Access denied: privilege escalation detected',
  [CASBIN_ERROR_CODES.SELF_MODIFICATION_DENIED]:
    'Access denied: cannot modify own permissions',
  [CASBIN_ERROR_CODES.SYNC_FAILED]: 'Policy synchronization failed',
  [CASBIN_ERROR_CODES.SYNC_IN_PROGRESS]:
    'Policy synchronization already in progress',
  [CASBIN_ERROR_CODES.SYNC_TIMEOUT]: 'Policy synchronization timed out',
  [CASBIN_ERROR_CODES.ENFORCER_ERROR]: 'Authorization engine error',
  [CASBIN_ERROR_CODES.ENFORCER_NOT_INITIALIZED]:
    'Authorization engine not initialized',
  [CASBIN_ERROR_CODES.POLICY_LOAD_FAILED]: 'Failed to load policies',
  [CASBIN_ERROR_CODES.INVALID_POLICY_FORMAT]: 'Invalid policy format',
  [CASBIN_ERROR_CODES.INVALID_SUBJECT_FORMAT]: 'Invalid subject format',
  [CASBIN_ERROR_CODES.INVALID_RESOURCE_FORMAT]: 'Invalid resource format',
  [CASBIN_ERROR_CODES.WORKSPACE_NOT_FOUND]: 'Workspace ID not found in context',
  [CASBIN_ERROR_CODES.USER_NOT_FOUND]: 'User ID not found in context',
  [CASBIN_ERROR_CODES.WATCHER_DISCONNECTED]: 'Policy watcher disconnected',
  [CASBIN_ERROR_CODES.WATCHER_RECONNECT_FAILED]:
    'Policy watcher reconnection failed',
};
