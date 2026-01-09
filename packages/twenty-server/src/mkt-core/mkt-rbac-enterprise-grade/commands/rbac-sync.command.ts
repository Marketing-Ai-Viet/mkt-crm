import { Logger } from '@nestjs/common';

import { Command, CommandRunner, Option } from 'nest-commander';

import { PolicySyncService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/policy-sync.service';

/**
 * Options for rbac:sync command
 */
type SyncCommandOptions = {
  workspace?: string;
  dryRun?: boolean;
  force?: boolean;
};

/**
 * RBAC Sync Command
 *
 * Sync RBAC policies từ permission templates sang Casbin.
 *
 * Usage:
 * ```bash
 * # Sync for workspace
 * npx nx run twenty-server:command rbac:sync -- --workspace=550e8400-e29b-41d4-a716-446655440000
 *
 * # Dry-run (preview changes)
 * npx nx run twenty-server:command rbac:sync -- --workspace=550e8400-e29b-41d4-a716-446655440000 --dry-run
 *
 * # Force sync (ignore hash check)
 * npx nx run twenty-server:command rbac:sync -- --workspace=550e8400-e29b-41d4-a716-446655440000 --force
 * ```
 */
@Command({
  name: 'rbac:sync',
  description: 'Sync RBAC policies for workspace from permission templates',
})
export class RbacSyncCommand extends CommandRunner {
  private readonly logger = new Logger(RbacSyncCommand.name);

  constructor(private readonly policySyncService: PolicySyncService) {
    super();
  }

  async run(
    _passedParams: string[],
    options?: SyncCommandOptions,
  ): Promise<void> {
    const workspaceId = options?.workspace;
    const dryRun = options?.dryRun ?? false;
    const force = options?.force ?? false;

    if (!workspaceId) {
      this.logger.error('Workspace ID is required. Use --workspace=<id>');
      this.logger.log(
        'Example: rbac:sync --workspace=550e8400-e29b-41d4-a716-446655440000',
      );

      return;
    }

    this.logger.log(`Syncing policies for workspace: ${workspaceId}`);
    this.logger.log(`Options: dryRun=${dryRun}, force=${force}`);

    try {
      const startTime = Date.now();

      if (dryRun) {
        // Dry-run mode - show what would change
        const result = await this.policySyncService.manualSync(workspaceId, {
          dryRun: true,
        });

        if ('dryRun' in result && result.dryRun) {
          this.logger.log('');
          this.logger.log('=== DRY RUN RESULTS ===');
          this.logger.log(`Current policies: ${result.current.length}`);
          this.logger.log(`Proposed policies: ${result.proposed.length}`);
          this.logger.log('');
          this.logger.log('Changes:');
          this.logger.log(`  + Added: ${result.diff.added.length}`);
          this.logger.log(`  - Removed: ${result.diff.removed.length}`);
          this.logger.log(`  = Unchanged: ${result.diff.unchanged}`);

          if (result.diff.added.length > 0) {
            this.logger.log('');
            this.logger.log('Policies to add:');
            for (const policy of result.diff.added.slice(0, 10)) {
              this.logger.log(`  + ${JSON.stringify(policy)}`);
            }
            if (result.diff.added.length > 10) {
              this.logger.log(
                `  ... and ${result.diff.added.length - 10} more`,
              );
            }
          }

          if (result.diff.removed.length > 0) {
            this.logger.log('');
            this.logger.log('Policies to remove:');
            for (const policy of result.diff.removed.slice(0, 10)) {
              this.logger.log(`  - ${JSON.stringify(policy)}`);
            }
            if (result.diff.removed.length > 10) {
              this.logger.log(
                `  ... and ${result.diff.removed.length - 10} more`,
              );
            }
          }
        }
      } else {
        // Actual sync
        const result = await this.policySyncService.syncWorkspace(workspaceId);

        const latencyMs = Date.now() - startTime;

        this.logger.log('');
        this.logger.log('=== SYNC RESULTS ===');
        this.logger.log(`Status: ${result.status}`);

        if (result.status === 'success') {
          this.logger.log(`Policies synced: ${result.policiesAdded}`);
          this.logger.log(`Latency: ${result.latencyMs}ms`);
        } else if (result.status === 'skipped') {
          this.logger.log(`Reason: ${result.reason}`);
        }

        this.logger.log(`Total time: ${latencyMs}ms`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Sync failed: ${errorMessage}`);

      if (error instanceof Error && error.stack) {
        this.logger.debug(error.stack);
      }
    }
  }

  @Option({
    flags: '-w, --workspace <workspace>',
    description: 'Workspace ID to sync policies for',
  })
  parseWorkspace(val: string): string {
    return val;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Show changes without applying (preview mode)',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --force',
    description: 'Force sync even if no changes detected',
  })
  parseForce(): boolean {
    return true;
  }
}
