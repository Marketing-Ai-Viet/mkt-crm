import { Logger } from '@nestjs/common';

import { Command, CommandRunner, Option } from 'nest-commander';

import { RbacEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-enforcer.service';

/**
 * Options for rbac-seeder:check command
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
 * Check permission for user on resource/action using template-based RBAC.
 *
 * Usage:
 * ```bash
 * npx nx run twenty-server:command rbac-seeder:check -- \
 *   --user=550e8400-e29b-41d4-a716-446655440000 \
 *   --workspace=123e4567-e89b-12d3-a456-426614174000 \
 *   --resource=mktCustomer \
 *   --action=READ
 * ```
 */
@Command({
  name: 'rbac-seeder:check',
  description: 'Check RBAC permission for user on resource/action',
})
export class RbacCheckCommand extends CommandRunner {
  private readonly logger = new Logger(RbacCheckCommand.name);

  constructor(private readonly rbacEnforcerService: RbacEnforcerService) {
    super();
  }

  async run(
    _passedParams: string[],
    options?: CheckCommandOptions,
  ): Promise<void> {
    if (
      !options?.user ||
      !options?.workspace ||
      !options?.resource ||
      !options?.action
    ) {
      this.logger.error(
        'All options required: --user, --workspace, --resource, --action',
      );
      this.logger.log(
        'Example: rbac-seeder:check --user=550e8400-... --workspace=123e4567-... --resource=mktCustomer --action=READ',
      );

      return;
    }

    const userId = options.user.replace('user:', '');
    const workspaceId = options.workspace.replace('ws:', '');
    const resource = options.resource;
    const action = options.action;
    const verbose = options.verbose ?? false;

    this.logger.log('');
    this.logger.log('=== PERMISSION CHECK ===');
    this.logger.log(`User:      ${userId}`);
    this.logger.log(`Workspace: ${workspaceId}`);
    this.logger.log(`Resource:  ${resource}`);
    this.logger.log(`Action:    ${action}`);
    this.logger.log('');

    try {
      const result = await this.rbacEnforcerService.checkPermission(
        userId,
        workspaceId,
        resource,
        action,
      );

      this.logger.log('=== RESULT ===');
      this.logger.log(`Decision: ${result.allowed ? '✅ ALLOW' : '❌ DENY'}`);
      this.logger.log(`Latency:  ${result.latencyMs}ms`);

      if (result.reason) {
        this.logger.log(`Reason:   ${result.reason}`);
      }

      if (verbose) {
        this.logger.log('');
        this.logger.log('=== VERBOSE INFO ===');

        const summary = await this.rbacEnforcerService.getUserPermissionSummary(
          userId,
          workspaceId,
        );

        if (summary) {
          this.logger.log(
            `Templates (roles): ${summary.roles.length > 0 ? summary.roles.join(', ') : '(none)'}`,
          );
          this.logger.log(`Hierarchy level: ${summary.hierarchyLevel}`);
          this.logger.log(`Department: ${summary.departmentName ?? '(none)'}`);
          this.logger.log(`Total allowed actions: ${summary.permissionCount}`);

          if (summary.resources.length > 0) {
            this.logger.log('Resources:');
            for (const r of summary.resources) {
              this.logger.log(
                `  ${r.resourceKey}: allowed=[${r.allowedActions.join(',')}] denied=[${r.deniedActions.join(',')}]`,
              );
            }
          }
        }
      }

      this.logger.log('');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Check failed: ${errorMessage}`);
    }
  }

  @Option({
    flags: '-u, --user <user>',
    description: 'User ID (UUID format)',
  })
  parseUser(val: string): string {
    return val;
  }

  @Option({
    flags: '-w, --workspace <workspace>',
    description: 'Workspace ID (UUID format)',
  })
  parseWorkspace(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --resource <resource>',
    description: 'Resource name (e.g., mktCustomer, mktOrder)',
  })
  parseResource(val: string): string {
    return val;
  }

  @Option({
    flags: '-a, --action <action>',
    description: 'Action name (e.g., READ, CREATE, UPDATE, DELETE)',
  })
  parseAction(val: string): string {
    return val;
  }

  @Option({
    flags: '-v, --verbose',
    description: 'Show detailed information (templates, hierarchy, resources)',
  })
  parseVerbose(): boolean {
    return true;
  }
}
