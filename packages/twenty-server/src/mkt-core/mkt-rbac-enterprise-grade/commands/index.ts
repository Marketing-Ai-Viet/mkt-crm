import { RbacSyncCommand } from './rbac-sync.command';
import { RbacCheckCommand } from './rbac-check.command';
import { RbacWarmCacheCommand } from './rbac-warm-cache.command';

export { RbacSyncCommand } from './rbac-sync.command';
export { RbacCheckCommand } from './rbac-check.command';
export { RbacWarmCacheCommand } from './rbac-warm-cache.command';

/**
 * All RBAC CLI commands
 */
export const RBAC_COMMANDS = [
  RbacSyncCommand,
  RbacCheckCommand,
  RbacWarmCacheCommand,
];
