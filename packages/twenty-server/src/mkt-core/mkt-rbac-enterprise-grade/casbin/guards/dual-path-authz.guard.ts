import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';

import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { PermissionMetadata } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/decorators/require-permission.decorator';
import { RbacEngineMode } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { RbacMetricsService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/rbac-metrics.service';
import { PermissionDeniedError } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/errors/permission-denied.error';

/**
 * Context data extracted from request
 */
type ExtractedContext = {
  userId: string | undefined;
  workspaceId: string | undefined;
  resource: string;
  action: string;
};

/**
 * Discrepancy record for logging
 */
type DiscrepancyRecord = {
  userId: string;
  workspaceId: string;
  resource: string;
  action: string;
  casbinResult: boolean;
  legacyResult: boolean;
  timestamp: Date;
  latencyMs: number;
};

/**
 * Dual Path Authorization Guard
 *
 * Guard cho shadow mode - chạy cả Casbin và legacy,
 * log discrepancies để validate trước khi full migration.
 *
 * Modes:
 * - 'legacy': Only legacy validation (default)
 * - 'casbin': Only Casbin validation
 * - 'shadow': Run both, use legacy result
 * - 'shadow_casbin': Run both, use Casbin result
 *
 * Usage:
 * Set RBAC_ENGINE environment variable to change mode.
 */
@Injectable()
export class DualPathAuthzGuard implements CanActivate {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:DualPathAuthzGuard`,
  );

  private readonly DEFAULT_MODE: RbacEngineMode = 'legacy';

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly casbinEnforcer: CasbinEnforcerService,
    private readonly metricsService: RbacMetricsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get engine mode from environment
    const mode =
      this.configService.get<RbacEngineMode>('RBAC_ENGINE') ??
      this.DEFAULT_MODE;

    // Get permission metadata from decorator
    const permission = this.reflector.get<PermissionMetadata>(
      'permission',
      context.getHandler(),
    );

    // No permission required - allow access
    if (!permission) {
      return true;
    }

    // Extract context
    const { userId, workspaceId, resource, action } = this.extractContext(
      context,
      permission,
    );

    // Validate required context
    if (!userId) {
      this.logger.warn(CASBIN_MESSAGES.ERROR.USER_NOT_FOUND);
      throw new ForbiddenException(CASBIN_MESSAGES.ERROR.USER_NOT_FOUND);
    }

    if (!workspaceId) {
      this.logger.warn(CASBIN_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
      throw new ForbiddenException(CASBIN_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }

    const startTime = Date.now();

    // Execute based on mode
    switch (mode) {
      case 'casbin':
        return this.casbinCheck(userId, workspaceId, resource, action);

      case 'legacy':
        return this.legacyCheck(userId, workspaceId, resource, action);

      case 'shadow':
      case 'shadow_casbin':
        return this.shadowCheck(
          userId,
          workspaceId,
          resource,
          action,
          mode,
          startTime,
        );

      default:
        this.logger.warn(`Unknown RBAC_ENGINE mode: ${mode}, using legacy`);

        return this.legacyCheck(userId, workspaceId, resource, action);
    }
  }

  /**
   * Casbin-only permission check
   */
  private async casbinCheck(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const result = await this.casbinEnforcer.checkPermission({
      userId,
      workspaceId,
      resource,
      action,
    });

    if (!result.allowed) {
      throw new PermissionDeniedError({
        resource,
        action,
        reason: result.reason,
        userId,
        workspaceId,
      });
    }

    return true;
  }

  /**
   * Legacy permission check
   * TODO: Integrate với ValidationOrchestratorService khi cần
   */
  private async legacyCheck(
    _userId: string,
    _workspaceId: string,
    _resource: string,
    _action: string,
  ): Promise<boolean> {
    // TODO: Implement legacy validation integration
    // return this.legacyOrchestrator.validatePermission(...);

    // For now, allow all - legacy validation handled elsewhere
    return true;
  }

  /**
   * Shadow mode - run both engines and compare
   */
  private async shadowCheck(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
    mode: RbacEngineMode,
    startTime: number,
  ): Promise<boolean> {
    // Run both checks in parallel
    const [casbinResultPromise, legacyResultPromise] = [
      this.casbinCheckSafe(userId, workspaceId, resource, action),
      this.legacyCheckSafe(userId, workspaceId, resource, action),
    ];

    const [casbinResult, legacyResult] = await Promise.all([
      casbinResultPromise,
      legacyResultPromise,
    ]);

    const latencyMs = Date.now() - startTime;

    // Log discrepancy if results differ
    if (casbinResult !== legacyResult) {
      this.logDiscrepancy({
        userId,
        workspaceId,
        resource,
        action,
        casbinResult,
        legacyResult,
        timestamp: new Date(),
        latencyMs,
      });
    }

    // Decide which result to use
    const finalResult = mode === 'shadow_casbin' ? casbinResult : legacyResult;

    if (!finalResult) {
      throw new PermissionDeniedError({
        resource,
        action,
        reason: `Shadow mode (${mode}): permission denied`,
        userId,
        workspaceId,
      });
    }

    return true;
  }

  /**
   * Safe Casbin check - returns boolean, no throw
   */
  private async casbinCheckSafe(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    try {
      const result = await this.casbinEnforcer.checkPermission({
        userId,
        workspaceId,
        resource,
        action,
      });

      return result.allowed;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Casbin check error: ${errorMessage}`);

      return false;
    }
  }

  /**
   * Safe legacy check - returns boolean, no throw
   */
  private async legacyCheckSafe(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    try {
      return await this.legacyCheck(userId, workspaceId, resource, action);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Legacy check error: ${errorMessage}`);

      return false;
    }
  }

  /**
   * Log discrepancy between engines
   */
  private logDiscrepancy(record: DiscrepancyRecord): void {
    this.logger.warn('RBAC discrepancy detected', {
      userId: record.userId,
      workspaceId: record.workspaceId,
      resource: record.resource,
      action: record.action,
      casbin: record.casbinResult ? 'ALLOW' : 'DENY',
      legacy: record.legacyResult ? 'ALLOW' : 'DENY',
      latencyMs: record.latencyMs,
    });

    // Record metric
    this.metricsService.recordDiscrepancy({
      resource: record.resource,
      action: record.action,
      casbinResult: record.casbinResult,
      legacyResult: record.legacyResult,
    });
  }

  /**
   * Extract context from execution context
   */
  private extractContext(
    context: ExecutionContext,
    permission: PermissionMetadata,
  ): ExtractedContext {
    const contextType = context.getType<string>();

    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const ctx = gqlContext.getContext();

      return {
        userId: ctx.req?.user?.id,
        workspaceId: ctx.req?.workspace?.id ?? ctx.req?.workspaceId,
        resource: permission.resource,
        action: permission.action,
      };
    }

    const request = context.switchToHttp().getRequest();

    return {
      userId: request.user?.id,
      workspaceId: request.workspace?.id ?? request.workspaceId,
      resource: permission.resource,
      action: permission.action,
    };
  }
}
