import { Enforcer } from 'casbin';

/**
 * Casbin policy types (ptype column)
 */
export type CasbinPolicyType = 'p' | 'g' | 'g2';

/**
 * Permission check input
 */
export type PermissionCheckInput = {
  userId: string;
  workspaceId: string;
  resource: string;
  action: string;
  attributes?: Record<string, unknown>;
};

/**
 * Permission check result
 */
export type PermissionCheckResult = {
  allowed: boolean;
  reason?: string;
  latencyMs: number;
  cached?: boolean;
};

/**
 * Casbin policy entry (p type)
 *
 * Format: subject, object, action, effect, condition
 * Note: No domain field - workspace isolation via schema
 */
export type CasbinPolicy = {
  ptype: 'p';
  subject: string;
  object: string;
  action: string;
  effect: 'allow' | 'deny';
  condition?: string;
};

/**
 * Grouping policy (g type) - Role assignment
 *
 * Format: subject, role
 * Note: No domain field - workspace isolation via schema
 */
export type GroupingPolicy = {
  ptype: 'g';
  subject: string;
  role: string;
};

/**
 * Resource grouping policy (g2 type)
 */
export type ResourceGroupingPolicy = {
  ptype: 'g2';
  resource: string;
  group: string;
};

/**
 * Union type for all policy types
 */
export type AnyPolicy = CasbinPolicy | GroupingPolicy | ResourceGroupingPolicy;

/**
 * Enforcer with metadata
 */
export type EnforcerWithMeta = {
  enforcer: Enforcer;
  workspaceId: string;
  loadedAt: Date;
  policyCount: number;
  version: number;
};

/**
 * Batch permission check request
 */
export type BatchPermissionRequest = {
  userId: string;
  workspaceId: string;
  checks: Array<{
    resource: string;
    resourceId?: string;
    action: string;
    attributes?: Record<string, unknown>;
  }>;
};

/**
 * Batch permission check result
 */
export type BatchPermissionResult = {
  results: Map<string, boolean>;
  latencyMs: number;
};

/**
 * Casbin rule row (from database)
 * Supports both core (number id) and workspace (string id) schemas
 */
export type CasbinRuleRow = {
  id: string | number;
  ptype: string;
  v0: string;
  v1: string;
  v2: string;
  v3: string;
  v4: string;
  v5: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

/**
 * Policy statistics
 */
export type PolicyStatistics = {
  totalPolicies: number;
  roleAssignments: number;
  resourceGroups: number;
  workspaceId?: string;
};

/**
 * Discrepancy record for shadow mode
 */
export type DiscrepancyRecord = {
  resource: string;
  action: string;
  casbinResult: boolean;
  legacyResult: boolean;
};

// ==================== Policy Version Types ====================

/**
 * Policy version entry stored in cache
 */
export type PolicyVersionEntry = {
  version: number;
  hash: string;
  updatedAt: string;
  policyCount: number;
};

/**
 * Dead letter entry for failed syncs (internal cache format)
 */
export type DeadLetterEntry = {
  workspaceId: string;
  failedAt: string;
  lastError: string;
  retryCount: number;
  resolvedAt?: string;
};

// ==================== Metrics Types ====================

/**
 * Metrics entry for permission check
 */
export type PermissionCheckMetric = {
  timestamp: number;
  workspaceId: string;
  latencyMs: number;
  allowed: boolean;
  cached: boolean;
};

/**
 * Aggregated metrics
 */
export type AggregatedMetrics = {
  totalChecks: number;
  allowedCount: number;
  deniedCount: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  cacheHitRate: number;
};

/**
 * System health status
 */
export type HealthStatus = {
  healthy: boolean;
  components: {
    enforcer: { healthy: boolean; message?: string };
    watcher: { healthy: boolean; message?: string };
    cache: { healthy: boolean; message?: string };
    database: { healthy: boolean; message?: string };
  };
  metrics: {
    activeWorkspaces: number;
    totalPolicies: number;
    cachedEnforcers: number;
    deadLetterCount: number;
  };
};

// ==================== Cache Warmer Types ====================

/**
 * Warm cache result
 */
export type WarmResult = {
  totalWorkspaces: number;
  warmed: number;
  failed: number;
  latencyMs: number;
  errors: Array<{ workspaceId: string; error: string }>;
};
