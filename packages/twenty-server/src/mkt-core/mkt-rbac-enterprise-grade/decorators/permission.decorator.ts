/**
 * Permission Decorator for Enterprise RBAC
 * Used to mark controllers and resolvers with permission requirements
 */

import { SetMetadata } from '@nestjs/common';

import { PermissionAction } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';

/**
 * Permission metadata interface
 */
export interface PermissionMetadata {
  action: PermissionAction;
  objectName?: string;
  skipValidation?: boolean;
  requireOwnership?: boolean;
  allowedRoles?: string[];
  minimumLevel?: number;
}

/**
 * Permission metadata decorator key
 */
export const PERMISSION_KEY = 'enterprise_rbac_permission';

/**
 * Permission decorator for controllers and resolvers
 *
 * @param metadata Permission metadata
 *
 * @example
 * ```typescript
 * @Permission({ action: 'READ', objectName: 'Order' })
 * @Query(() => [Order])
 * async getOrders() {
 *   // Implementation
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Permission({
 *   action: 'UPDATE',
 *   objectName: 'Order',
 *   requireOwnership: true,
 *   minimumLevel: 5
 * })
 * @Mutation(() => Order)
 * async updateOrder() {
 *   // Implementation
 * }
 * ```
 */
export const Permission = (metadata: PermissionMetadata) =>
  SetMetadata(PERMISSION_KEY, metadata);
