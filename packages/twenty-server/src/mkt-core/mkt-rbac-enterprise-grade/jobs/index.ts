/**
 * RBAC Jobs barrel export
 *
 * Background jobs for RBAC module
 *
 * Note: Jobs are temporarily disabled until repositories are fully implemented.
 * To enable:
 * 1. Implement missing repository methods
 * 2. Implement missing cache service methods
 * 3. Uncomment the exports and array below
 */

// Job data types (can be used even when jobs are disabled)
export type RbacCacheWarmupJobData = {
  workspaceId: string;
};

export type TemporaryPermissionCleanupJobData = {
  workspaceId: string;
};

export type AuditLogCleanupJobData = {
  workspaceId: string;
  retentionDays?: number;
};

// TODO: Enable when repository methods are implemented
// export { RbacCacheWarmupJob } from './rbac-cache-warmup.job';
// export { TemporaryPermissionCleanupJob } from './temporary-permission-cleanup.job';
// export { AuditLogCleanupJob } from './audit-log-cleanup.job';

/**
 * Array of all RBAC jobs for module registration
 * Note: Currently empty - jobs require additional repository methods
 */
export const RBAC_JOBS: unknown[] = [
  // RbacCacheWarmupJob,
  // TemporaryPermissionCleanupJob,
  // AuditLogCleanupJob,
];
