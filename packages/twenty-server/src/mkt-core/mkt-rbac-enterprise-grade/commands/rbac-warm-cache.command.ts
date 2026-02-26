import { Logger } from '@nestjs/common';

import { Command, CommandRunner, Option } from 'nest-commander';

import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache.service';

/**
 * Options for rbac-seeder:warm-cache command
 */
type WarmCacheCommandOptions = {
  workspace?: string;
  all?: boolean;
};

/**
 * RBAC Warm Cache Command
 *
 * Invalidates the RBAC context/permission cache so fresh data is resolved
 * on the next request. Replaces the previous Casbin enforcer cache warming.
 *
 * Usage:
 * ```bash
 * # Invalidate cache for specific workspace
 * npx nx run twenty-server:command rbac-seeder:warm-cache -- --workspace=550e8400-...
 *
 * # Invalidate all caches
 * npx nx run twenty-server:command rbac-seeder:warm-cache -- --all
 * ```
 */
@Command({
  name: 'rbac-seeder:warm-cache',
  description:
    'Invalidate RBAC context cache to force fresh permission resolution',
})
export class RbacWarmCacheCommand extends CommandRunner {
  private readonly logger = new Logger(RbacWarmCacheCommand.name);

  constructor(private readonly rbacCacheService: RbacCacheService) {
    super();
  }

  async run(
    _passedParams: string[],
    options?: WarmCacheCommandOptions,
  ): Promise<void> {
    const workspaceId = options?.workspace;
    const invalidateAll = options?.all ?? false;

    if (!workspaceId && !invalidateAll) {
      this.logger.error('Either --workspace=<id> or --all is required');
      this.logger.log('Examples:');
      this.logger.log('  rbac-seeder:warm-cache --workspace=550e8400-...');
      this.logger.log('  rbac-seeder:warm-cache --all');

      return;
    }

    try {
      const startTime = Date.now();

      if (invalidateAll) {
        this.logger.log('Invalidating all RBAC caches...');
        await this.rbacCacheService.invalidateAll();
        this.logger.log(`All caches invalidated (${Date.now() - startTime}ms)`);
      } else if (workspaceId) {
        this.logger.log(`Invalidating cache for workspace: ${workspaceId}`);
        await this.rbacCacheService.invalidateWorkspace(workspaceId);
        this.logger.log(
          `Workspace cache invalidated (${Date.now() - startTime}ms)`,
        );
      }

      this.logger.log('');
      this.logger.log(
        'Note: Cache will be rebuilt on next permission check request.',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Cache invalidation failed: ${errorMessage}`);
    }
  }

  @Option({
    flags: '-w, --workspace <workspace>',
    description: 'Workspace ID to invalidate cache for',
  })
  parseWorkspace(val: string): string {
    return val;
  }

  @Option({
    flags: '-a, --all',
    description: 'Invalidate caches for all workspaces',
  })
  parseAll(): boolean {
    return true;
  }
}
