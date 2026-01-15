import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// PERMISSION MESSAGES
// ============================================

export const PERMISSION_MESSAGES = createModuleMessages({
  entityName: 'Permission',
  entityNamePlural: 'Permissions',
  customSuccess: {
    PERMISSION_GRANTED: 'Permission granted',
    PERMISSION_CHECKED: 'Permission checked successfully',
    TEMPLATE_LOADED: 'Permission template loaded successfully',
    CACHE_HIT: 'Permission cache hit',
    PERMISSION_ASSIGNED: 'Permission assigned successfully',
    PERMISSION_REVOKED: 'Permission revoked successfully',
  },
  customError: {
    PERMISSION_DENIED: 'Permission denied',
    TEMPLATE_NOT_FOUND: 'Permission template not found',
    INVALID_CONTEXT: 'Invalid permission context',
    VALIDATION_FAILED: 'Permission validation failed',
    CACHE_MISS: 'Permission cache miss',
    PERMISSION_EXPIRED: 'Permission has expired',
    USER_NOT_AUTHORIZED: 'User is not authorized for this action',
  },
  customOperation: {
    CHECK_PERMISSION: 'Checking permission',
    LOAD_TEMPLATE: 'Loading permission template',
    VALIDATE_ACTION: 'Validating action permission',
    EVALUATE_POLICY: 'Evaluating permission policy',
    RESOLVE_HIERARCHY: 'Resolving permission hierarchy',
    ASSIGN_PERMISSION: 'Assigning permission',
    REVOKE_PERMISSION: 'Revoking permission',
  },
});

// ============================================
// VALIDATION MESSAGES
// ============================================

export const VALIDATION_MESSAGES = createModuleMessages({
  entityName: 'Validation',
  entityNamePlural: 'Validations',
  customSuccess: {
    VALIDATION_PASSED: 'Validation passed',
    STEP_COMPLETED: 'Validation step completed',
    ALL_STEPS_COMPLETED: 'All validation steps completed',
  },
  customError: {
    VALIDATION_FAILED: 'Validation failed',
    STEP_FAILED: 'Validation step failed',
    PRE_VALIDATION_FAILED: 'Pre-validation failed',
    TIMEOUT: 'Validation timed out',
  },
  customOperation: {
    EXECUTE_VALIDATION: 'Executing validation',
    RUN_STEP: 'Running validation step',
    ORCHESTRATE: 'Orchestrating validation steps',
  },
});

// ============================================
// POLICY MESSAGES
// ============================================

export const POLICY_MESSAGES = createModuleMessages({
  entityName: 'Policy',
  entityNamePlural: 'Policies',
  customSuccess: {
    POLICY_EVALUATED: 'Policy evaluated successfully',
    POLICY_MATCHED: 'Policy matched',
    CONDITION_MET: 'Policy condition met',
    POLICY_APPLIED: 'Policy applied successfully',
  },
  customError: {
    POLICY_NOT_FOUND: 'Policy not found',
    POLICY_EVALUATION_FAILED: 'Policy evaluation failed',
    INVALID_CONDITION: 'Invalid policy condition',
    CONDITION_NOT_MET: 'Policy condition not met',
  },
  customOperation: {
    EVALUATE_POLICY: 'Evaluating policy',
    CHECK_CONDITION: 'Checking policy condition',
    APPLY_POLICY: 'Applying policy',
    LOAD_POLICIES: 'Loading policies',
  },
});

// ============================================
// HIERARCHY MESSAGES
// ============================================

export const HIERARCHY_MESSAGES = createModuleMessages({
  entityName: 'Hierarchy',
  entityNamePlural: 'Hierarchies',
  customSuccess: {
    HIERARCHY_RESOLVED: 'Hierarchy resolved successfully',
    LEVEL_DETERMINED: 'Hierarchy level determined',
    ACCESS_GRANTED: 'Hierarchy access granted',
  },
  customError: {
    HIERARCHY_NOT_FOUND: 'Hierarchy not found',
    INVALID_HIERARCHY: 'Invalid hierarchy structure',
    LEVEL_MISMATCH: 'Hierarchy level mismatch',
    ACCESS_DENIED: 'Hierarchy access denied',
  },
  customOperation: {
    RESOLVE_HIERARCHY: 'Resolving hierarchy',
    CHECK_LEVEL: 'Checking hierarchy level',
    VALIDATE_HIERARCHY: 'Validating hierarchy',
    DETERMINE_LEVEL: 'Determining hierarchy level',
  },
});

// ============================================
// AUDIT MESSAGES
// ============================================

export const AUDIT_MESSAGES = createModuleMessages({
  entityName: 'Audit log',
  entityNamePlural: 'Audit logs',
  customSuccess: {
    LOG_RECORDED: 'Audit log recorded successfully',
    LOG_RETRIEVED: 'Audit log retrieved successfully',
    LOGS_CLEANED_UP: 'Audit logs cleaned up successfully',
  },
  customError: {
    LOG_NOT_FOUND: 'Audit log not found',
    LOG_RECORDING_FAILED: 'Audit log recording failed',
    CLEANUP_FAILED: 'Audit log cleanup failed',
  },
  customOperation: {
    RECORD_LOG: 'Recording audit log',
    QUERY_LOGS: 'Querying audit logs',
    CLEANUP_LOGS: 'Cleaning up audit logs',
  },
});

// ============================================
// CACHE MESSAGES
// ============================================

export const RBAC_CACHE_MESSAGES = createModuleMessages({
  entityName: 'RBAC cache',
  customSuccess: {
    CACHE_HIT: 'RBAC cache hit',
    CACHE_SET: 'RBAC cache set successfully',
    CACHE_INVALIDATED: 'RBAC cache invalidated successfully',
    CACHE_WARMED: 'RBAC cache warmed up successfully',
  },
  customError: {
    CACHE_OPERATION_FAILED: 'RBAC cache operation failed',
    INVALIDATION_FAILED: 'RBAC cache invalidation failed',
  },
  customInfo: {
    CACHE_MISS: 'RBAC cache miss',
    WARMING_CACHE: 'Warming up RBAC cache',
  },
});

// ============================================
// TEMPORARY PERMISSION MESSAGES
// ============================================

export const TEMPORARY_PERMISSION_MESSAGES = createModuleMessages({
  entityName: 'Temporary permission',
  entityNamePlural: 'Temporary permissions',
  customSuccess: {
    GRANTED: 'Temporary permission granted',
    EXTENDED: 'Temporary permission extended',
    REVOKED: 'Temporary permission revoked',
    CLEANED_UP: 'Expired temporary permissions cleaned up',
  },
  customError: {
    NOT_FOUND: 'Temporary permission not found',
    EXPIRED: 'Temporary permission has expired',
    GRANT_FAILED: 'Failed to grant temporary permission',
  },
  customOperation: {
    GRANT: 'Granting temporary permission',
    EXTEND: 'Extending temporary permission',
    REVOKE: 'Revoking temporary permission',
    CLEANUP: 'Cleaning up expired temporary permissions',
  },
});

// ============================================
// PERMISSION TEMPLATE SERVICE MESSAGES
// ============================================

export const TEMPLATE_SERVICE_MESSAGES = {
  CREATED: (key: string) => `Template created: ${key}`,
  UPDATED: (id: string) => `Template updated: ${id}`,
  DELETED: (id: string) => `Template deleted: ${id}`,
  ACTIVATED: (id: string) => `Template activated: ${id}`,
  DEACTIVATED: (id: string) => `Template deactivated: ${id}`,
  NOT_FOUND: (id: string) => `Template not found: ${id}`,
  DUPLICATE_KEY: (key: string) => `Template key already exists: ${key}`,
  SYSTEM_TEMPLATE_IMMUTABLE: 'System templates cannot be modified',
  CACHE_INVALIDATED: (workspaceId: string) =>
    `Template cache invalidated for workspace: ${workspaceId}`,
} as const;

// ============================================
// USER PERMISSION TEMPLATE SERVICE MESSAGES
// ============================================

export const USER_ASSIGNMENT_MESSAGES = {
  ASSIGNED: (memberId: string, templateKey: string) =>
    `Template ${templateKey} assigned to member ${memberId}`,
  REVOKED: (id: string) => `Assignment revoked: ${id}`,
  UPDATED: (id: string) => `Assignment updated: ${id}`,
  EXPIRED_DEACTIVATED: (count: number) =>
    `Deactivated ${count} expired assignments`,
  NOT_FOUND: (id: string) => `Assignment not found: ${id}`,
  ALREADY_ASSIGNED: (memberId: string, templateId: string) =>
    `Template ${templateId} already assigned to member ${memberId}`,
  TEMPLATE_NOT_FOUND: (templateId: string) =>
    `Template not found: ${templateId}`,
  INVALID_EXPIRY: 'Expiry date must be in the future',
  CACHE_INVALIDATED: (workspaceId: string, memberId: string) =>
    `Cache invalidated for member ${memberId} in workspace ${workspaceId}`,
} as const;

// ============================================
// DATA ACCESS POLICY SERVICE MESSAGES
// ============================================

export const DATA_ACCESS_POLICY_MESSAGES = {
  CREATED: (name: string) => `Policy created: ${name}`,
  UPDATED: (id: string) => `Policy updated: ${id}`,
  DELETED: (id: string) => `Policy deleted: ${id}`,
  ACTIVATED: (id: string) => `Policy activated: ${id}`,
  DEACTIVATED: (id: string) => `Policy deactivated: ${id}`,
  NOT_FOUND: (id: string) => `Policy not found: ${id}`,
  DUPLICATE_NAME: (name: string, objectName: string) =>
    `Policy with name "${name}" already exists for object "${objectName}"`,
  INVALID_FILTER: 'Invalid filter conditions',
  CACHE_INVALIDATED: (workspaceId: string) =>
    `Policy cache invalidated for workspace: ${workspaceId}`,
} as const;

// ============================================
// TEMPLATE RESOURCE PERMISSION SERVICE MESSAGES
// ============================================

export const RESOURCE_PERMISSION_MESSAGES = {
  CREATED: (templateId: string, resourceId: string) =>
    `Resource permission created: template=${templateId}, resource=${resourceId}`,
  UPDATED: (id: string) => `Resource permission updated: ${id}`,
  DELETED: (id: string) => `Resource permission deleted: ${id}`,
  ACTIVATED: (id: string) => `Resource permission activated: ${id}`,
  DEACTIVATED: (id: string) => `Resource permission deactivated: ${id}`,
  NOT_FOUND: (id: string) => `Resource permission not found: ${id}`,
  TEMPLATE_NOT_FOUND: (id: string) => `Template not found: ${id}`,
  RESOURCE_NOT_FOUND: (id: string) => `Resource not found: ${id}`,
  DUPLICATE_PERMISSION: (templateId: string, resourceId: string) =>
    `Permission already exists for template=${templateId}, resource=${resourceId}`,
  BULK_CREATED: (count: number, templateId: string) =>
    `${count} resource permissions created for template ${templateId}`,
  CACHE_INVALIDATED: (workspaceId: string) =>
    `Permission cache invalidated for workspace: ${workspaceId}`,
  NO_ALLOWED_ACTIONS: 'At least one allowed action is required',
} as const;

// ============================================
// TEMPORARY PERMISSION SERVICE MESSAGES
// ============================================

export const TEMP_PERMISSION_SERVICE_MESSAGES = {
  CREATED: (grantee: string, object: string) =>
    `Temporary permission created for ${grantee} on ${object}`,
  REVOKED: (id: string, reason: string) =>
    `Temporary permission ${id} revoked: ${reason}`,
  EXTENDED: (id: string, newExpiry: string) =>
    `Temporary permission ${id} extended to ${newExpiry}`,
  NOT_FOUND: (id: string) => `Temporary permission not found: ${id}`,
  ALREADY_REVOKED: (id: string) => `Permission ${id} is already revoked`,
  ALREADY_EXPIRED: (id: string) => `Permission ${id} is already expired`,
  EXPIRED_DEACTIVATED: (count: number) =>
    `${count} expired permissions deactivated`,
  INVALID_DURATION: (maxHours: number) =>
    `Duration must be between 1 and ${maxHours} hours`,
  NO_PERMISSIONS_GRANTED:
    'At least one permission (read, update, delete) must be granted',
  CACHE_INVALIDATED: (workspaceId: string) =>
    `Temporary permission cache invalidated for workspace: ${workspaceId}`,
} as const;

// ============================================
// GRAPHQL DESCRIPTIONS
// ============================================

export const RBAC_GRAPHQL_DESCRIPTIONS = {
  // Queries
  CHECK_PERMISSION_QUERY: 'Check if user has permission for action on resource',
  GET_USER_PERMISSIONS_QUERY: 'Get all permissions for user',
  GET_PERMISSION_TEMPLATE_QUERY: 'Get permission template by ID',
  GET_AUDIT_LOGS_QUERY: 'Get paginated audit logs',
  GET_VALIDATION_RESULT_QUERY: 'Get detailed validation result with all steps',

  // Mutations
  GRANT_PERMISSION_MUTATION: 'Grant permission to user',
  REVOKE_PERMISSION_MUTATION: 'Revoke permission from user',
  UPDATE_PERMISSION_TEMPLATE_MUTATION: 'Update permission template',
  CLEAR_PERMISSION_CACHE_MUTATION: 'Clear permission cache',
  GRANT_TEMPORARY_PERMISSION_MUTATION: 'Grant temporary permission to user',
  REVOKE_TEMPORARY_PERMISSION_MUTATION: 'Revoke temporary permission from user',
} as const;

// ============================================
// DEPARTMENT AUTHORIZATION GUARD MESSAGES
// ============================================

export const DEPARTMENT_AUTH_MESSAGES = {
  // Error messages
  USER_NOT_FOUND: 'User not authenticated',
  WORKSPACE_NOT_FOUND: 'Workspace not found',
  CONTEXT_NOT_FOUND: 'Unable to resolve user context',
  ACCESS_DENIED: 'Access denied: insufficient department permissions',

  // Dynamic messages
  ACCESS_DENIED_CUSTOM: (message: string) => message,
  CHECKING: (userId: string, departments: string[]) =>
    `Checking department auth for user=${userId}, allowedDepartments=${departments.join(',')}`,
  ALLOWED_BY_TEMPLATE: (
    userId: string,
    templateKey: string,
    priority: number,
  ) =>
    `Access granted: user=${userId} has high-priority template=${templateKey} (priority=${priority})`,
  ALLOWED_BY_EXECUTIVE: (userId: string, level: number) =>
    `Access granted: user=${userId} is executive (level=${level})`,
  ALLOWED_BY_MANAGER: (userId: string, level: number) =>
    `Access granted: user=${userId} is manager (level=${level})`,
  ALLOWED_BY_DEPARTMENT: (userId: string, dept: string) =>
    `Access granted: user=${userId} belongs to allowed department=${dept}`,
  DENIED: (userId: string, userDept: string | null, allowed: string[]) =>
    `Access denied: user=${userId}, department=${userDept}, allowedDepartments=${allowed.join(',')}`,
} as const;

// ============================================
// HIERARCHICAL ACCESS MESSAGES
// ============================================

/**
 * Messages for hierarchical access decisions
 */
export const HIERARCHICAL_ACCESS_MESSAGES = {
  ALLOWED_SELF: 'Truy cập được phép: Bạn là người tạo record này',
  ALLOWED_SUBORDINATE: 'Truy cập được phép: Record thuộc cấp dưới trực tiếp',
  ALLOWED_REPORTING_CHAIN: 'Truy cập được phép: Record thuộc chuỗi báo cáo',
  ALLOWED_FULL_ACCESS: 'Truy cập được phép: Bạn có quyền truy cập đầy đủ',
  DENIED_NOT_OWNER: 'Từ chối truy cập: Bạn không phải người tạo record này',
  DENIED_NOT_SUBORDINATE:
    'Từ chối truy cập: Record không thuộc cấp dưới của bạn',
  DENIED_PEER_RESTRICTION:
    'Từ chối truy cập: Bạn không thể xem record của quản lý ngang cấp',
  DENIED_DEPARTMENT_MISMATCH: 'Từ chối truy cập: Record thuộc phòng ban khác',
  DENIED_NO_APPLICABLE_RULE:
    'Từ chối truy cập: Không có quy tắc phù hợp với cấp bậc của bạn',
  ERROR_MISSING_CONTEXT: 'Lỗi: Thiếu thông tin context để đánh giá quyền',
} as const;

/**
 * RBAC Messages for hooks, services, and error handling
 */
export const RBAC_MESSAGES = {
  ERRORS: {
    INVALID_INPUT_OR_WORKSPACE: 'Invalid input data or workspace context',
    TEMPLATE_CODE_REQUIRED: 'Template code is required',
    TEMPLATE_CODE_EXISTS: (code: string) =>
      `Permission template with code '${code}' already exists`,
    TEMPLATE_NOT_FOUND: (id: string) =>
      `Permission template with ID '${id}' not found`,
    PRIORITY_OUT_OF_RANGE: 'Priority must be between 0 and 1000',
    CANNOT_MODIFY_SYSTEM_TEMPLATE:
      'Cannot modify core properties of system templates',
    CANNOT_DELETE_SYSTEM_TEMPLATE: 'Cannot delete system templates',
    TEMPLATE_HAS_ACTIVE_ASSIGNMENTS: (count: number) =>
      `Cannot delete template with ${count} active user assignments`,
    USER_NOT_FOUND: (id: string) => `User with ID '${id}' not found`,
    PERMISSION_DENIED: 'Permission denied',
    INVALID_ACTION: 'Invalid action specified',
    INVALID_RESOURCE_TYPE: 'Invalid resource type specified',
    CACHE_ERROR: 'Cache operation failed',
  },
  SUCCESS: {
    TEMPLATE_CREATED: 'Permission template created successfully',
    TEMPLATE_UPDATED: 'Permission template updated successfully',
    TEMPLATE_DELETED: 'Permission template deleted successfully',
    ROLE_ASSIGNED: 'Role assigned successfully',
    ROLE_REVOKED: 'Role revoked successfully',
    PERMISSION_GRANTED: 'Temporary permission granted successfully',
    PERMISSION_REVOKED: 'Temporary permission revoked successfully',
  },
  INFO: {
    VALIDATING_TEMPLATE: 'Validating permission template data',
    CHECKING_UNIQUENESS: 'Checking template code uniqueness',
    CHECKING_ASSIGNMENTS: 'Checking active user assignments',
    CACHE_INVALIDATED: 'Cache invalidated successfully',
  },
} as const;
