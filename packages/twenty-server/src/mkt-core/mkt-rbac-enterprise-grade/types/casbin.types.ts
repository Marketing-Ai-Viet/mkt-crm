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
 */
export type CasbinPolicy = {
  ptype: 'p';
  subject: string;
  domain: string;
  object: string;
  action: string;
  effect: 'allow' | 'deny';
  condition?: string;
};

/**
 * Grouping policy (g type) - Role assignment
 */
export type GroupingPolicy = {
  ptype: 'g';
  subject: string;
  role: string;
  domain: string;
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
 */
export type CasbinRuleRow = {
  id: number;
  ptype: string;
  v0: string;
  v1: string;
  v2: string;
  v3: string;
  v4: string;
  v5: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Policy statistics
 */
export type PolicyStatistics = {
  totalPolicies: number;
  roleAssignments: number;
  resourceGroups: number;
  workspaceId: string;
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
