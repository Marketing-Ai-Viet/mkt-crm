/**
 * DataScopeInterceptor - Row-Level Security Interceptor
 *
 * Automatically applies data filters based on user context and access policies.
 * Works with @DataScope decorator to provide row-level security.
 *
 * Features:
 * - Resolves user context from request
 * - Gets data filter from RbacEnforcerService
 * - Attaches filter to request for downstream handlers
 * - Supports GraphQL and HTTP contexts
 * - Integrates with caching for performance
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Observable } from 'rxjs';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { RbacEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-enforcer.service';
import { RbacContextService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-context.service';
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache.service';

import {
  DataScopeMetadata,
  DataScopeContext,
  DataScopedRequest,
  DATA_SCOPE_METADATA_KEY,
  DATA_SCOPE_LOG_CONTEXT,
  DATA_SCOPE_MESSAGES,
  RbacFilterCondition,
} from './types';

/**
 * DataScopeInterceptor
 *
 * NestJS interceptor that resolves data scope filters based on user context
 * and attaches them to the request for row-level security.
 *
 * ## How It Works
 *
 * 1. Extracts user ID and workspace ID from request context
 * 2. Gets data scope metadata from @DataScope decorator
 * 3. Resolves user context via RbacContextService
 * 4. Gets data filter from RbacEnforcerService
 * 5. Attaches filter to request as `req.dataScope`
 *
 * ## Usage
 *
 * The interceptor is automatically applied by @DataScope decorator.
 *
 * ```typescript
 * @Query(() => [MktOrder])
 * @DataScope({ resource: 'mktOrder' })
 * async getOrders(@Context() ctx: GraphQLContext): Promise<MktOrder[]> {
 *   const filter = ctx.req.dataScope?.filter;
 *   return this.orderService.findWithFilter(filter);
 * }
 * ```
 */
@Injectable()
export class DataScopeInterceptor implements NestInterceptor, OnModuleInit {
  /**
   * DI-resolved singleton instance.
   *
   * Factory trong MktRbacEnterpriseGradeModule gọi setFactoryInstance() ngay khi tạo,
   * TRƯỚC bất kỳ onModuleInit nào, đảm bảo factory instance luôn được sử dụng.
   */
  private static resolvedInstance: DataScopeInterceptor | null = null;

  private readonly logger = new Logger(DATA_SCOPE_LOG_CONTEXT);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacEnforcerService: RbacEnforcerService,
    private readonly rbacContextService: RbacContextService,
    private readonly rbacCacheService: RbacCacheService,
  ) {}

  /**
   * Set factory-created instance as the resolved singleton.
   * Called from factory IMMEDIATELY after construction, before any onModuleInit.
   */
  static setFactoryInstance(instance: DataScopeInterceptor): void {
    DataScopeInterceptor.resolvedInstance = instance;
    instance.logger.log('DataScopeInterceptor factory instance registered');
  }

  /**
   * OnModuleInit - fallback nếu factory chưa set resolvedInstance.
   * Validate instance có logger trước khi chấp nhận.
   */
  onModuleInit() {
    if (!DataScopeInterceptor.resolvedInstance && this.logger) {
      DataScopeInterceptor.resolvedInstance = this;
      this.logger.log(
        'DataScopeInterceptor DI instance initialized (fallback)',
      );
    }
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    // Delegate sang DI instance nếu instance này không phải DI-resolved
    const resolved = DataScopeInterceptor.resolvedInstance;

    if (resolved && resolved !== this) {
      return resolved.intercept(context, next);
    }

    const startTime = DateTimeUtils.now();

    // Get metadata from decorator
    const metadata = this.reflector.get<DataScopeMetadata>(
      DATA_SCOPE_METADATA_KEY,
      context.getHandler(),
    );

    // No metadata - skip interceptor
    if (!metadata) {
      return next.handle();
    }

    const {
      resource,
      mode,
      allowUnscoped,
      errorMessage,
      additionalConditions,
    } = metadata;

    this.logger.debug(DATA_SCOPE_MESSAGES.RESOLVE_START(resource));

    // Extract user and workspace from context
    const { userId, workspaceId, request } = this.extractContext(context);

    // Validate context
    if (!userId) {
      this.logger.warn(DATA_SCOPE_MESSAGES.NO_USER);

      if (!allowUnscoped) {
        throw new ForbiddenException(
          errorMessage ?? DATA_SCOPE_MESSAGES.NO_USER,
        );
      }

      this.attachEmptyScope(request, resource, startTime, 'No user context');

      return next.handle();
    }

    if (!workspaceId) {
      this.logger.warn(DATA_SCOPE_MESSAGES.NO_WORKSPACE);

      if (!allowUnscoped) {
        throw new ForbiddenException(
          errorMessage ?? DATA_SCOPE_MESSAGES.NO_WORKSPACE,
        );
      }

      this.attachEmptyScope(
        request,
        resource,
        startTime,
        'No workspace context',
      );

      return next.handle();
    }

    // Handle SKIP mode
    if (mode === 'SKIP') {
      this.logger.debug(
        DATA_SCOPE_MESSAGES.RESOLVE_SKIP(resource, 'Mode is SKIP'),
      );
      this.attachSkippedScope(request, resource, startTime);

      return next.handle();
    }

    // Resolve user context and data filter
    const dataScopeContext = await this.resolveDataScope(
      userId,
      workspaceId,
      resource,
      metadata,
      additionalConditions,
    );

    // Attach to request
    request.dataScope = dataScopeContext;

    const latencyMs = DateTimeUtils.diffInMillis(
      startTime,
      DateTimeUtils.now(),
    );

    this.logger.debug(DATA_SCOPE_MESSAGES.RESOLVE_SUCCESS(resource, latencyMs));

    return next.handle();
  }

  /**
   * Extract user, workspace, and request from execution context
   */
  private extractContext(context: ExecutionContext): {
    userId: string | undefined;
    workspaceId: string | undefined;
    request: DataScopedRequest;
  } {
    const contextType = context.getType<string>();

    // Handle GraphQL context
    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const ctx = gqlContext.getContext();
      const request = ctx.req as DataScopedRequest;

      // Debug logging
      this.logger.debug(
        `[extractContext] GraphQL request - user: ${request?.user?.id}, workspace: ${request?.workspace?.id}, workspaceId: ${request?.workspaceId}`,
      );

      return {
        userId: request?.user?.id,
        workspaceId: request?.workspace?.id ?? request?.workspaceId,
        request,
      };
    }

    // Handle HTTP context
    const request = context.switchToHttp().getRequest() as DataScopedRequest;

    // Debug logging
    this.logger.debug(
      `[extractContext] HTTP request - user: ${request?.user?.id}, workspace: ${request?.workspace?.id}, workspaceId: ${request?.workspaceId}`,
    );

    return {
      userId: request?.user?.id,
      workspaceId: request?.workspace?.id ?? request?.workspaceId,
      request,
    };
  }

  /**
   * Resolve data scope for user and resource
   */
  private async resolveDataScope(
    userId: string,
    workspaceId: string,
    resource: string,
    metadata: DataScopeMetadata,
    additionalConditions?: DataScopeMetadata['additionalConditions'],
  ): Promise<DataScopeContext> {
    const startTime = DateTimeUtils.now();

    // Check cache first
    if (metadata.enableCache) {
      const cached = await this.rbacCacheService.getDataFilter(
        userId,
        workspaceId,
        resource,
      );

      if (cached) {
        this.logger.debug(DATA_SCOPE_MESSAGES.CACHE_HIT(resource));

        const userContext = await this.rbacContextService.resolveContext(
          userId,
          workspaceId,
        );

        return {
          resource,
          filter: this.mergeFilters(cached, additionalConditions),
          userContext,
          hasFullAccess: userContext?.hasFullAccess ?? false,
          skipped: false,
          resolvedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
          latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
        };
      }

      this.logger.debug(DATA_SCOPE_MESSAGES.CACHE_MISS(resource));
    }

    // Get user context
    const userContext = await this.rbacContextService.resolveContext(
      userId,
      workspaceId,
    );

    // User not found
    if (!userContext) {
      return {
        resource,
        filter: null,
        userContext: null,
        hasFullAccess: false,
        skipped: false,
        reason: 'User context not found',
        resolvedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
      };
    }

    // Full access users have no filter
    if (userContext.hasFullAccess) {
      this.logger.debug(DATA_SCOPE_MESSAGES.FULL_ACCESS);

      return {
        resource,
        filter: this.buildFilterFromAdditional(additionalConditions),
        userContext,
        hasFullAccess: true,
        skipped: false,
        reason: 'User has full access',
        resolvedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
      };
    }

    // Get data filter from enforcer service
    const filter = await this.rbacEnforcerService.getDataFilter(
      userId,
      workspaceId,
      resource,
    );

    // Merge with additional conditions if provided
    const mergedFilter = this.mergeFilters(filter, additionalConditions);

    // Cache the filter
    if (metadata.enableCache && filter) {
      await this.rbacCacheService.setDataFilter(
        userId,
        workspaceId,
        resource,
        filter,
        metadata.cacheTTL,
      );
    }

    const latencyMs = DateTimeUtils.diffInMillis(
      startTime,
      DateTimeUtils.now(),
    );

    if (mergedFilter) {
      this.logger.debug(
        DATA_SCOPE_MESSAGES.FILTER_APPLIED(
          mergedFilter.conditions?.length ?? 0,
        ),
      );
    }

    return {
      resource,
      filter: mergedFilter,
      userContext,
      hasFullAccess: false,
      skipped: false,
      resolvedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      latencyMs,
    };
  }

  /**
   * Merge base filter with additional conditions
   */
  private mergeFilters(
    baseFilter: RbacFilterCondition | null,
    additionalConditions?: DataScopeMetadata['additionalConditions'],
  ): RbacFilterCondition | null {
    // No additional conditions
    if (!additionalConditions || additionalConditions.length === 0) {
      return baseFilter;
    }

    // Only additional conditions
    if (!baseFilter) {
      return {
        type: 'AND',
        conditions: additionalConditions,
      };
    }

    // Merge both
    return {
      type: 'AND',
      conditions: [...baseFilter.conditions, ...additionalConditions],
    };
  }

  /**
   * Build filter from additional conditions only
   */
  private buildFilterFromAdditional(
    additionalConditions?: DataScopeMetadata['additionalConditions'],
  ): RbacFilterCondition | null {
    if (!additionalConditions || additionalConditions.length === 0) {
      return null;
    }

    return {
      type: 'AND',
      conditions: additionalConditions,
    };
  }

  /**
   * Attach empty scope to request (no filter applied)
   */
  private attachEmptyScope(
    request: DataScopedRequest,
    resource: string,
    startTime: ReturnType<typeof DateTimeUtils.now>,
    reason: string,
  ): void {
    request.dataScope = {
      resource,
      filter: null,
      userContext: null,
      hasFullAccess: false,
      skipped: false,
      reason,
      resolvedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
    };
  }

  /**
   * Attach skipped scope to request
   */
  private attachSkippedScope(
    request: DataScopedRequest,
    resource: string,
    startTime: ReturnType<typeof DateTimeUtils.now>,
  ): void {
    request.dataScope = {
      resource,
      filter: null,
      userContext: null,
      hasFullAccess: true,
      skipped: true,
      reason: 'Data scope skipped by configuration',
      resolvedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
    };
  }
}
