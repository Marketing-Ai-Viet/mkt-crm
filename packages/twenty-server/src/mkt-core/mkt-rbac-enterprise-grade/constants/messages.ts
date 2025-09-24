import { VALIDATION_STEPS } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';

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
