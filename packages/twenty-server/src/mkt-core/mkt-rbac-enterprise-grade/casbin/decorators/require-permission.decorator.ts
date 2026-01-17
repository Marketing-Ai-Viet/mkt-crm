import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { CasbinAuthzGuard } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/guards/casbin-authz.guard';

/**
 * Permission metadata stored in decorator
 */
export type PermissionMetadata = {
  resource: string;
  action: string;
  checkOwnership?: boolean;
  auditLevel?: 'low' | 'medium' | 'high';
};

/**
 * Permission options for decorator
 */
export type PermissionOptions = {
  /** Kiểm tra ownership của resource (user phải sở hữu resource) */
  checkOwnership?: boolean;
  /** Mức độ audit logging: low (basic), medium (detailed), high (full trace) */
  auditLevel?: 'low' | 'medium' | 'high';
};

/**
 * @RequirePermission decorator
 *
 * Apply to resolver methods to require permission check via Casbin.
 * Automatically applies CasbinAuthzGuard.
 *
 * @example Basic usage
 * ```typescript
 * @Query(() => [MktCustomer])
 * @RequirePermission('mktCustomer', 'read')
 * async customers(): Promise<MktCustomer[]> {
 *   // ...
 * }
 * ```
 *
 * @example With options
 * ```typescript
 * @Mutation(() => Boolean)
 * @RequirePermission('mktCustomer', 'delete', { auditLevel: 'high' })
 * async deleteCustomer(@Args('id') id: string): Promise<boolean> {
 *   // ...
 * }
 * ```
 *
 * @example With ownership check
 * ```typescript
 * @Mutation(() => MktOrder)
 * @RequirePermission('mktOrder', 'update', { checkOwnership: true })
 * async updateOrder(@Args('id') id: string, @Args('input') input: UpdateOrderInput): Promise<MktOrder> {
 *   // Guard will verify user owns this order
 * }
 * ```
 *
 * @param resource - Resource type (e.g., 'mktCustomer', 'mktOrder', 'mktInvoice')
 * @param action - Action to perform (e.g., 'read', 'create', 'update', 'delete')
 * @param options - Optional settings for ownership check and audit level
 */
export const RequirePermission = (
  resource: string,
  action: string,
  options?: PermissionOptions,
): MethodDecorator => {
  const metadata: PermissionMetadata = {
    resource,
    action,
    ...options,
  };

  return applyDecorators(
    SetMetadata('permission', metadata),
    UseGuards(CasbinAuthzGuard),
  );
};

/**
 * @RequireAnyPermission decorator
 *
 * Apply when user needs ANY of the specified permissions.
 * Useful for OR logic (e.g., admin OR owner can delete).
 *
 * @example
 * ```typescript
 * @Mutation(() => Boolean)
 * @RequireAnyPermission([
 *   { resource: 'mktCustomer', action: 'delete' },
 *   { resource: 'mktCustomer', action: 'admin' },
 * ])
 * async deleteCustomer(@Args('id') id: string): Promise<boolean> {
 *   // User needs either 'delete' OR 'admin' permission
 * }
 * ```
 */
export const RequireAnyPermission = (
  permissions: Array<{ resource: string; action: string }>,
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('permissions_any', permissions),
    UseGuards(CasbinAuthzGuard),
  );
};

/**
 * @RequireAllPermissions decorator
 *
 * Apply when user needs ALL of the specified permissions.
 * Useful for AND logic (e.g., both 'read' AND 'sensitive_data' access).
 *
 * @example
 * ```typescript
 * @Query(() => SensitiveReport)
 * @RequireAllPermissions([
 *   { resource: 'mktReport', action: 'read' },
 *   { resource: 'mktReport', action: 'sensitive_data' },
 * ])
 * async sensitiveReport(): Promise<SensitiveReport> {
 *   // User needs BOTH permissions
 * }
 * ```
 */
export const RequireAllPermissions = (
  permissions: Array<{ resource: string; action: string }>,
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('permissions_all', permissions),
    UseGuards(CasbinAuthzGuard),
  );
};

/**
 * @Public decorator
 *
 * Marks endpoint as public (no authentication/authorization required).
 * Use sparingly for truly public endpoints.
 *
 * @example
 * ```typescript
 * @Query(() => HealthStatus)
 * @Public()
 * async health(): Promise<HealthStatus> {
 *   // No auth required
 * }
 * ```
 */
export const Public = (): MethodDecorator => {
  return SetMetadata('isPublic', true);
};
