import { Logger } from '@nestjs/common';

import { Command, CommandRunner, Option } from 'nest-commander';

/**
 * RBAC Sync Command (deprecated)
 *
 * Previously synced permission templates to external policy engine.
 * Template-based permissions are now resolved directly
 * from mktTemplateResourcePermission at runtime — no sync needed.
 *
 * This command is kept for backward compatibility but is now a no-op.
 */
@Command({
  name: 'rbac-seeder:sync',
  description: '[Deprecated] Policy sync is no longer needed',
})
export class RbacSyncCommand extends CommandRunner {
  private readonly logger = new Logger(RbacSyncCommand.name);

  async run(
    _passedParams: string[],
    _options?: { workspace?: string; dryRun?: boolean; force?: boolean },
  ): Promise<void> {
    this.logger.warn(
      'rbac-seeder:sync is deprecated. Template-based permissions are resolved directly at runtime.',
    );
    this.logger.log(
      'To verify permissions, use: rbac-seeder:check --user=<id> --workspace=<id> --resource=<resource> --action=<action>',
    );
  }

  @Option({
    flags: '-w, --workspace <workspace>',
    description: 'Workspace ID (deprecated, no effect)',
  })
  parseWorkspace(val: string): string {
    return val;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Dry run mode (deprecated, no effect)',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --force',
    description: 'Force sync (deprecated, no effect)',
  })
  parseForce(): boolean {
    return true;
  }
}
