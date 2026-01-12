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
