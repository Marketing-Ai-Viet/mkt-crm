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
 * Log context for Casbin module
 */
export const CASBIN_LOG_CONTEXT = 'MktRbac:Casbin';

/**
 * Casbin-specific messages for logging and error handling
 */
export const CASBIN_MESSAGES = {
  LOG: {
    // Enforcer
    ENFORCER_CREATED: (workspaceId: string) =>
      `Casbin enforcer created for workspace: ${workspaceId}`,
    ENFORCER_LOADED: (workspaceId: string, policyCount: number) =>
      `Loaded ${policyCount} policies for workspace: ${workspaceId}`,
    PERMISSION_CHECK_START: (
      userId: string,
      resource: string,
      action: string,
    ) =>
      `Checking permission: user=${userId}, resource=${resource}, action=${action}`,
    PERMISSION_CHECK_RESULT: (result: boolean, latencyMs: number) =>
      `Permission check result: ${result ? 'ALLOW' : 'DENY'} (${latencyMs}ms)`,

    // Sync
    SYNC_START: (workspaceId: string) =>
      `Starting policy sync for workspace: ${workspaceId}`,
    SYNC_SUCCESS: (workspaceId: string, count: number, latencyMs: number) =>
      `Synced ${count} policies for ${workspaceId} in ${latencyMs}ms`,
    SYNC_SKIPPED: (workspaceId: string, reason: string) =>
      `Sync skipped for ${workspaceId}: ${reason}`,
    SYNC_RETRY: (workspaceId: string, attempt: number) =>
      `Retrying sync for ${workspaceId} (attempt ${attempt})`,

    // Cache
    CACHE_WARM_START: (count: number) =>
      `Warming caches for ${count} workspaces`,
    CACHE_WARM_COMPLETE: (latencyMs: number) =>
      `Cache warming completed in ${latencyMs}ms`,
    CACHE_HIT: (key: string) => `Cache hit: ${key}`,
    CACHE_MISS: (key: string) => `Cache miss: ${key}`,

    // Watcher
    WATCHER_CONNECTED: 'PG NOTIFY watcher connected',
    WATCHER_NOTIFICATION: (payload: string) =>
      `Policy update received: ${payload}`,
    WATCHER_CLOSED: 'PG NOTIFY watcher closed',

    // Module
    MODULE_INITIALIZED: 'Casbin authorization module initialized',
    POLICIES_RELOADED: (count: number) => `Policies reloaded: ${count} entries`,
  },

  WARN: {
    // Sync
    SYNC_IN_PROGRESS: (workspaceId: string) =>
      `Sync already in progress for ${workspaceId}`,
    SYNC_NO_CHANGES: (workspaceId: string) =>
      `No policy changes detected for ${workspaceId}`,
    POLICY_LIMIT_APPROACHING: (
      workspaceId: string,
      count: number,
      limit: number,
    ) => `Workspace ${workspaceId} approaching policy limit: ${count}/${limit}`,
    POLICY_LIMIT_EXCEEDED: (
      workspaceId: string,
      count: number,
      limit: number,
    ) => `Workspace ${workspaceId} exceeded policy limit: ${count}/${limit}`,

    // Watcher
    WATCHER_RECONNECTING: (attempt: number, delayMs: number) =>
      `Reconnecting watcher in ${delayMs}ms (attempt ${attempt})`,
    WATCHER_DISCONNECTED: 'PG NOTIFY watcher disconnected',

    // Security
    CROSS_TENANT_REJECTED: (domain: string) =>
      `Cross-tenant policy rejected: domain ${domain} not allowed`,
    ESCALATION_DETECTED: (subject: string) =>
      `Potential privilege escalation detected for ${subject}`,
    SELF_ESCALATION_BLOCKED: (userId: string) =>
      `Self-escalation attempt blocked for user ${userId}`,

    // Fallback
    FAIL_CLOSED_TRIGGERED: 'Fail-closed: denying permission due to error',
    USING_CACHED_POLICY: (workspaceId: string) =>
      `Using cached policy for ${workspaceId} due to sync failure`,
  },

  ERROR: {
    // Enforcer
    ENFORCER_CREATE_FAILED: (workspaceId: string, error: string) =>
      `Failed to create enforcer for ${workspaceId}: ${error}`,
    ENFORCEMENT_FAILED: (error: string) =>
      `Permission enforcement failed: ${error}`,
    POLICY_LOAD_FAILED: (workspaceId: string, error: string) =>
      `Failed to load policies for ${workspaceId}: ${error}`,

    // Sync
    SYNC_FAILED: (workspaceId: string, error: string) =>
      `Policy sync failed for ${workspaceId}: ${error}`,
    SYNC_FAILED_PERMANENTLY: (workspaceId: string, retries: number) =>
      `Workspace ${workspaceId} sync failed after ${retries} retries`,
    SYNC_LOCK_FAILED: (workspaceId: string) =>
      `Failed to acquire sync lock for ${workspaceId}`,

    // Watcher
    WATCHER_CONNECTION_FAILED: (error: string) =>
      `Failed to connect PG watcher: ${error}`,
    WATCHER_MAX_RECONNECTS: 'Max reconnect attempts reached for watcher',
    WATCHER_NOTIFY_FAILED: (error: string) => `Failed to send NOTIFY: ${error}`,

    // Validation
    INVALID_POLICY: (errors: string[]) =>
      `Invalid policy: ${errors.join(', ')}`,
    INVALID_SUBJECT_FORMAT: (subject: string) =>
      `Invalid subject format: ${subject}`,
    INVALID_DOMAIN_FORMAT: (domain: string) =>
      `Invalid domain format: ${domain}`,

    // Context
    WORKSPACE_NOT_FOUND: 'Workspace ID not found in context',
    USER_NOT_FOUND: 'User ID not found in context',
    CONTEXT_EXTRACTION_FAILED: (error: string) =>
      `Failed to extract context: ${error}`,

    // Database
    DATABASE_CONNECTION_LOST: 'Database connection lost',
    DATABASE_QUERY_FAILED: (error: string) => `Database query failed: ${error}`,
  },

  INFO: {
    PERMISSION_GRANTED: (userId: string, resource: string, action: string) =>
      `Permission granted: user=${userId}, resource=${resource}, action=${action}`,
    PERMISSION_DENIED: (userId: string, resource: string, action: string) =>
      `Permission denied: user=${userId}, resource=${resource}, action=${action}`,
    POLICY_UPDATED: (workspaceId: string) =>
      `Policies updated for workspace: ${workspaceId}`,
    TEMPLATE_SYNCED: (templateId: string) =>
      `Template ${templateId} synced to Casbin policies`,
  },
} as const;
