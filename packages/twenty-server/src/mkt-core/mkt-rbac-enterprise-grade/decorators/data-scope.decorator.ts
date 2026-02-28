/**
 * @DataScope Decorator for Row-Level Security
 *
 * Apply to resolver methods or controllers to enable automatic
 * data filtering based on user context and access policies.
 *
 * Works with DataScopeInterceptor to apply row-level security.
 */

import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';

import {
  DataScopeOptions,
  DataScopeMetadata,
  DATA_SCOPE_METADATA_KEY,
  DATA_SCOPE_DEFAULTS,
  RbacFilterConditionItem,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/types';
import { ResourceEntityName } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import { DataScopeInterceptor } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/data-scope.interceptor';

/**
 * @DataScope decorator for row-level security
 *
 * Automatically applies data filters based on user context and access policies.
 * Works in conjunction with DataScopeInterceptor.
 *
 * ## Basic Usage
 *
 * @example
 * ```typescript
 * // Query with automatic data filtering
 * @Query(() => [MktOrder])
 * @DataScope({ resource: 'mktOrder' })
 * async getOrders(): Promise<MktOrder[]> {
 *   // Request will have dataScope attached with filter conditions
 *   return this.orderService.findAll();
 * }
 * ```
 *
 * ## With Filter Mode
 *
 * @example
 * ```typescript
 * // Manual mode - filters attached but not auto-applied
 * @Query(() => [MktCustomer])
 * @DataScope({ resource: 'mktCustomer', mode: 'MANUAL' })
 * async getCustomers(@Context() ctx: GraphQLContext): Promise<MktCustomer[]> {
 *   const filter = ctx.req.dataScope?.filter;
 *   // Apply filter manually in your query
 *   return this.customerService.findWithFilter(filter);
 * }
 * ```
 *
 * ## Skip Mode for Admin Endpoints
 *
 * @example
 * ```typescript
 * // Admin endpoint - skip data filtering
 * @Query(() => [MktOrder])
 * @DataScope({ resource: 'mktOrder', mode: 'SKIP' })
 * @RequirePermission('mktOrder', 'admin')
 * async adminGetAllOrders(): Promise<MktOrder[]> {
 *   return this.orderService.findAll();
 * }
 * ```
 *
 * ## With Audit Level
 *
 * @example
 * ```typescript
 * // High audit for sensitive data
 * @Query(() => SensitiveReport)
 * @DataScope({
 *   resource: 'mktReport',
 *   auditLevel: 'high',
 *   enableCache: false
 * })
 * async getSensitiveReport(): Promise<SensitiveReport> {
 *   return this.reportService.getSensitiveData();
 * }
 * ```
 *
 * ## With Additional Conditions
 *
 * @example
 * ```typescript
 * // Add static conditions in addition to dynamic filters
 * @Query(() => [MktOrder])
 * @DataScope({
 *   resource: 'mktOrder',
 *   additionalConditions: [
 *     { field: 'status', operator: '!=', value: 'DELETED' }
 *   ]
 * })
 * async getActiveOrders(): Promise<MktOrder[]> {
 *   return this.orderService.findAll();
 * }
 * ```
 *
 * @param options Data scope configuration options
 */
export const DataScope = (options: DataScopeOptions): MethodDecorator => {
  // Validate required fields
  if (!options.resource) {
    throw new Error(
      '@DataScope decorator requires "resource" field (e.g., resource: "mktOrder")',
    );
  }

  // Build metadata with defaults
  const metadata: DataScopeMetadata = {
    resource: options.resource,
    mode: options.mode ?? DATA_SCOPE_DEFAULTS.mode,
    enableCache: options.enableCache ?? DATA_SCOPE_DEFAULTS.enableCache,
    cacheTTL: options.cacheTTL ?? DATA_SCOPE_DEFAULTS.cacheTTL,
    auditLevel: options.auditLevel ?? DATA_SCOPE_DEFAULTS.auditLevel,
    errorMessage: options.errorMessage ?? DATA_SCOPE_DEFAULTS.errorMessage,
    allowUnscoped: options.allowUnscoped ?? DATA_SCOPE_DEFAULTS.allowUnscoped,
    excludeFields: options.excludeFields,
    additionalConditions: options.additionalConditions,
  };

  // Sets metadata AND applies interceptor. UseInterceptors triggers the
  // interceptor even with GraphQL Yoga, which doesn't support APP_INTERCEPTOR.
  // The interceptor uses static singleton delegation for DI workaround.
  return applyDecorators(
    SetMetadata(DATA_SCOPE_METADATA_KEY, metadata),
    UseInterceptors(DataScopeInterceptor),
  );
};

/**
 * Fluent builder for DataScope decorator
 *
 * @example
 * ```typescript
 * @Query(() => [MktOrder])
 * @DataScopeBuilder
 *   .forResource('mktOrder')
 *   .withAuditLevel('high')
 *   .withAdditionalCondition({ field: 'status', operator: '!=', value: 'DELETED' })
 *   .build()
 * async getOrders(): Promise<MktOrder[]> { }
 * ```
 */
export class DataScopeBuilder {
  private options: Partial<DataScopeOptions> = {};

  /**
   * Set resource name
   */
  forResource(resource: ResourceEntityName): this {
    this.options.resource = resource;

    return this;
  }

  /**
   * Set filter mode
   */
  withMode(mode: DataScopeOptions['mode']): this {
    this.options.mode = mode;

    return this;
  }

  /**
   * Enable/disable caching
   */
  withCache(enabled: boolean, ttl?: number): this {
    this.options.enableCache = enabled;
    if (ttl !== undefined) {
      this.options.cacheTTL = ttl;
    }

    return this;
  }

  /**
   * Set audit level
   */
  withAuditLevel(level: DataScopeOptions['auditLevel']): this {
    this.options.auditLevel = level;

    return this;
  }

  /**
   * Set custom error message
   */
  withErrorMessage(message: string): this {
    this.options.errorMessage = message;

    return this;
  }

  /**
   * Allow unscoped access
   */
  allowUnscoped(): this {
    this.options.allowUnscoped = true;

    return this;
  }

  /**
   * Exclude fields from filtering
   */
  excludeFields(fields: string[]): this {
    this.options.excludeFields = fields;

    return this;
  }

  /**
   * Add additional condition
   */
  withAdditionalCondition(condition: RbacFilterConditionItem): this {
    this.options.additionalConditions = [
      ...(this.options.additionalConditions ?? []),
      condition,
    ];

    return this;
  }

  /**
   * Set additional conditions
   */
  withAdditionalConditions(conditions: RbacFilterConditionItem[]): this {
    this.options.additionalConditions = conditions;

    return this;
  }

  /**
   * Build the decorator
   */
  build(): MethodDecorator {
    if (!this.options.resource) {
      throw new Error('DataScopeBuilder requires resource to be set');
    }

    return DataScope(this.options as DataScopeOptions);
  }
}

/**
 * Fluent API entry point for building data scope
 *
 * @example
 * ```typescript
 * @DataScopeFor('mktOrder')
 *   .withMode('AUTO')
 *   .withAuditLevel('medium')
 *   .build()
 * ```
 */
export const DataScopeFor = (resource: ResourceEntityName): DataScopeBuilder =>
  new DataScopeBuilder().forResource(resource);
