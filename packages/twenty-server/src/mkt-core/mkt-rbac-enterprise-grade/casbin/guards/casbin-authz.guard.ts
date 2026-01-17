import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { PermissionMetadata } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/decorators/require-permission.decorator';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
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
 * Casbin Authorization Guard
 *
 * Main guard cho GraphQL resolvers.
 * Reads permission metadata from @RequirePermission decorator.
 *
 * Usage:
 * ```typescript
 * @Query(() => [MktCustomer])
 * @RequirePermission('mktCustomer', 'read')
 * async customers(): Promise<MktCustomer[]> {
 *   // ...
 * }
 * ```
 */
@Injectable()
export class CasbinAuthzGuard implements CanActivate {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:AuthzGuard`);

  constructor(
    private readonly reflector: Reflector,
    private readonly enforcerService: CasbinEnforcerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    this.logger.debug(
      `Checking permission: user=${userId}, workspace=${workspaceId}, resource=${resource}, action=${action}`,
    );

    // Check permission
    const result = await this.enforcerService.checkPermission({
      userId,
      workspaceId,
      resource,
      action,
    });

    if (!result.allowed) {
      this.logger.debug(
        `Permission denied: user=${userId}, resource=${resource}, action=${action}, reason=${result.reason}`,
      );

      throw new PermissionDeniedError({
        resource,
        action,
        reason: result.reason,
        userId,
        workspaceId,
      });
    }

    this.logger.debug(
      `Permission granted: user=${userId}, resource=${resource}, action=${action}`,
    );

    return true;
  }

  /**
   * Extract context from execution context
   * Supports both GraphQL and REST contexts
   */
  private extractContext(
    context: ExecutionContext,
    permission: PermissionMetadata,
  ): ExtractedContext {
    const contextType = context.getType<string>();

    // Handle GraphQL context
    if (contextType === 'graphql') {
      return this.extractGraphQLContext(context, permission);
    }

    // Handle HTTP/REST context
    return this.extractHttpContext(context, permission);
  }

  /**
   * Extract context from GraphQL execution context
   */
  private extractGraphQLContext(
    context: ExecutionContext,
    permission: PermissionMetadata,
  ): ExtractedContext {
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext();

    // Get user and workspace from context (set by auth middleware)
    const userId = ctx.req?.user?.id;
    const workspaceId = ctx.req?.workspace?.id ?? ctx.req?.workspaceId;

    return {
      userId,
      workspaceId,
      resource: permission.resource,
      action: permission.action,
    };
  }

  /**
   * Extract context from HTTP execution context
   */
  private extractHttpContext(
    context: ExecutionContext,
    permission: PermissionMetadata,
  ): ExtractedContext {
    const request = context.switchToHttp().getRequest();

    // Get user and workspace from request (set by auth middleware)
    const userId = request.user?.id;
    const workspaceId = request.workspace?.id ?? request.workspaceId;

    return {
      userId,
      workspaceId,
      resource: permission.resource,
      action: permission.action,
    };
  }
}
