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
