import { Logger } from '@nestjs/common';

import { Command, CommandRunner, Option } from 'nest-commander';

import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';

/**
 * Options for rbac:check command
 */
type CheckCommandOptions = {
  user?: string;
  workspace?: string;
  resource?: string;
  action?: string;
  verbose?: boolean;
};

/**
 * RBAC Check Command
 *
 * Check permission for user on resource/action.
 *
 * Usage:
 * ```bash
 * # Check permission
 * npx nx run twenty-server:command rbac:check -- \
 *   --user=550e8400-e29b-41d4-a716-446655440000 \
 *   --workspace=123e4567-e89b-12d3-a456-426614174000 \
 *   --resource=mktCustomer \
 *   --action=read
 *
 * # Verbose mode
 * npx nx run twenty-server:command rbac:check -- \
 *   --user=... --workspace=... --resource=... --action=... --verbose
 * ```
 */
@Command({
  name: 'rbac:check',
  description: 'Check RBAC permission for user on resource/action',
})
export class RbacCheckCommand extends CommandRunner {
  private readonly logger = new Logger(RbacCheckCommand.name);

  constructor(private readonly enforcerService: CasbinEnforcerService) {
    super();
  }

  async run(
    _passedParams: string[],
    options?: CheckCommandOptions,
  ): Promise<void> {
    // Validate required options
    if (
      !options?.user ||
      !options?.workspace ||
      !options?.resource ||
      !options?.action
    ) {
      this.logger.error(
        'All options required: --user, --workspace, --resource, --action',
      );
      this.logger.log('');
      this.logger.log('Example:');
      this.logger.log(
        '  rbac:check --user=550e8400-... --workspace=123e4567-... --resource=mktCustomer --action=read',
      );

      return;
    }

    const verbose = options.verbose ?? false;

    // Clean up prefixes if provided
    const userId = options.user.replace('user:', '');
    const workspaceId = options.workspace.replace('ws:', '');
    const resource = options.resource;
    const action = options.action;

    this.logger.log('');
    this.logger.log('=== PERMISSION CHECK ===');
    this.logger.log(`User:      ${userId}`);
    this.logger.log(`Workspace: ${workspaceId}`);
    this.logger.log(`Resource:  ${resource}`);
    this.logger.log(`Action:    ${action}`);
    this.logger.log('');

    try {
      const startTime = Date.now();

      const result = await this.enforcerService.checkPermission({
        userId,
        workspaceId,
        resource,
        action,
      });

      const latencyMs = Date.now() - startTime;

      // Display result
      this.logger.log('=== RESULT ===');
      this.logger.log(`Decision: ${result.allowed ? '✅ ALLOW' : '❌ DENY'}`);
      this.logger.log(`Latency:  ${result.latencyMs}ms`);

      if (result.reason) {
        this.logger.log(`Reason:   ${result.reason}`);
      }

      if (result.cached) {
        this.logger.log(`Cached:   ${result.cached}`);
      }

      // Verbose mode - get more info
      if (verbose) {
        this.logger.log('');
        this.logger.log('=== VERBOSE INFO ===');

        // Get user roles
        const roles = await this.enforcerService.getUserRoles(
          userId,
          workspaceId,
        );

        this.logger.log(
          `User roles: ${roles.length > 0 ? roles.join(', ') : '(none)'}`,
        );

        // Get user permissions
        const permissions = await this.enforcerService.getUserPermissions(
          userId,
          workspaceId,
        );

        this.logger.log(`Total permissions: ${permissions.length}`);

        if (permissions.length > 0 && permissions.length <= 20) {
          this.logger.log('Permissions:');
          for (const perm of permissions) {
            this.logger.log(`  ${JSON.stringify(perm)}`);
          }
        } else if (permissions.length > 20) {
          this.logger.log('First 20 permissions:');
          for (const perm of permissions.slice(0, 20)) {
            this.logger.log(`  ${JSON.stringify(perm)}`);
          }
          this.logger.log(`  ... and ${permissions.length - 20} more`);
        }

        // Get enforcer stats
        const stats = this.enforcerService.getStats();

        this.logger.log('');
        this.logger.log('Enforcer stats:');
        this.logger.log(`  Cached enforcers: ${stats.cachedEnforcers}`);
        this.logger.log(`  Watcher connected: ${stats.watcherConnected}`);
      }

      this.logger.log('');
      this.logger.log(`Total time: ${latencyMs}ms`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Check failed: ${errorMessage}`);

      if (error instanceof Error && error.stack) {
        this.logger.debug(error.stack);
      }
    }
  }

  @Option({
    flags: '-u, --user <user>',
    description: 'User ID (UUID format, with or without "user:" prefix)',
  })
  parseUser(val: string): string {
    return val;
  }

  @Option({
    flags: '-w, --workspace <workspace>',
    description: 'Workspace ID (UUID format, with or without "ws:" prefix)',
  })
  parseWorkspace(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --resource <resource>',
    description: 'Resource name (e.g., mktCustomer, mktOrder, mktInvoice)',
  })
  parseResource(val: string): string {
    return val;
  }

  @Option({
    flags: '-a, --action <action>',
    description: 'Action name (e.g., read, create, update, delete)',
  })
  parseAction(val: string): string {
    return val;
  }

  @Option({
    flags: '-v, --verbose',
    description: 'Show detailed information (user roles, permissions)',
  })
  parseVerbose(): boolean {
    return true;
  }
}
