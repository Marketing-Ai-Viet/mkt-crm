import { VALIDATION_STEPS } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';

/**
 * Step Names for Logging and Monitoring
 */
export const VALIDATION_STEP_NAMES = {
  [VALIDATION_STEPS.PRE_VALIDATION]: 'Pre-validation',
  [VALIDATION_STEPS.USER_CONTEXT_RESOLUTION]: 'User Context Resolution',
  [VALIDATION_STEPS.RESOURCE_IDENTIFICATION]: 'Resource Identification',
  [VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK]: 'Permission Template Check',
  [VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION]:
    'Action Permission Validation',
  [VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK]: 'Resource Permission Check',
  [VALIDATION_STEPS.HIERARCHY_VALIDATION]: 'Hierarchy-based Validation',
  [VALIDATION_STEPS.DATA_ACCESS_POLICY_CHECK]: 'Data Access Policy Check',
  [VALIDATION_STEPS.SPECIAL_PERMISSIONS]: 'Special Permissions',
  [VALIDATION_STEPS.SENSITIVE_DATA_CHECKS]: 'Financial/Sensitive Data Checks',
  [VALIDATION_STEPS.DEPARTMENT_RESTRICTIONS]: 'Department & Team Restrictions',
  [VALIDATION_STEPS.DYNAMIC_CONDITIONS]: 'Dynamic Conditions',
  [VALIDATION_STEPS.CACHE_PERFORMANCE]: 'Cache & Performance',
  [VALIDATION_STEPS.AUDIT_LOGGING]: 'Audit & Logging',
  [VALIDATION_STEPS.FINAL_DECISION]: 'Final Decision & Response',
} as const;

/**
 * Step Descriptions for Documentation
 */
export const VALIDATION_STEP_DESCRIPTIONS = {
  [VALIDATION_STEPS.PRE_VALIDATION]:
    'Validate basic prerequisites before proceeding with complex permission logic',
  [VALIDATION_STEPS.USER_CONTEXT_RESOLUTION]:
    'Extract and validate user information from request context',
  [VALIDATION_STEPS.RESOURCE_IDENTIFICATION]:
    'Identify and validate target resource for requested action',
  [VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK]:
    'Resolve applicable permission templates based on user role and hierarchy',
  [VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION]:
    'Validate if user has permission to perform specific action',
  [VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK]:
    'Verify user has appropriate permissions on specific resource type',
  [VALIDATION_STEPS.HIERARCHY_VALIDATION]:
    'Apply organization hierarchy rules for permission inheritance and restrictions',
  [VALIDATION_STEPS.DATA_ACCESS_POLICY_CHECK]:
    'Apply dynamic data access policies and filtering rules',
  [VALIDATION_STEPS.SPECIAL_PERMISSIONS]:
    'Handle special permission cases and overrides',
  [VALIDATION_STEPS.SENSITIVE_DATA_CHECKS]:
    'Apply extra security for financial and sensitive data access',
  [VALIDATION_STEPS.DEPARTMENT_RESTRICTIONS]:
    'Apply department and team-based access controls',
  [VALIDATION_STEPS.DYNAMIC_CONDITIONS]:
    'Evaluate context-specific and time-based conditions',
  [VALIDATION_STEPS.CACHE_PERFORMANCE]:
    'Optimize performance through intelligent caching',
  [VALIDATION_STEPS.AUDIT_LOGGING]:
    'Maintain comprehensive audit trail for security and compliance',
  [VALIDATION_STEPS.FINAL_DECISION]:
    'Combine all checks and return final authorization decision',
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

/**
 * Log context for RBAC module
 */
export const RBAC_LOG_CONTEXT = 'MktRbac';
