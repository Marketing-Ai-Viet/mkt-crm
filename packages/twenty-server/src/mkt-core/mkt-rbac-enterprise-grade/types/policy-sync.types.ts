/**
 * Policy sync related types
 */

/**
 * Sync result status
 */
export type SyncStatus = 'success' | 'skipped' | 'failed';

/**
 * Policy sync result
 */
export type SyncResult = {
  status: SyncStatus;
  reason?: string;
  policiesAdded?: number;
  policiesRemoved?: number;
  latencyMs?: number;
  version?: number;
};

/**
 * Policy diff between current and proposed
 */
export type PolicyDiff = {
  added: string[][];
  removed: string[][];
  unchanged: number;
};

/**
 * Manual sync result with diff (for dry-run)
 */
export type ManualSyncResult =
  | SyncResult
  | {
      dryRun: true;
      current: string[][];
      proposed: string[][];
      diff: PolicyDiff;
    };

/**
 * Sync failed event payload
 */
export type SyncFailedEvent = {
  workspaceId: string;
  error: string;
  retryCount?: number;
  timestamp: Date;
};

/**
 * Permission change event payload
 */
export type PermissionChangeEvent = {
  workspaceId: string;
  templateId?: string;
  userId?: string;
  action: 'created' | 'updated' | 'deleted';
  timestamp: Date;
};

/**
 * Policy version entry
 */
export type PolicyVersion = {
  workspaceId: string;
  version: number;
  policyHash: string;
  updatedAt: Date;
};

/**
 * Validation result for policy
 */
export type PolicyValidationResult = {
  valid: boolean;
  errors: string[];
  warnings?: string[];
};

/**
 * Dead letter queue entry for failed syncs
 */
export type SyncDeadLetterEntry = {
  id: string;
  workspaceId: string;
  failedAt: Date;
  lastError: string;
  retryCount: number;
  resolvedAt?: Date;
};
