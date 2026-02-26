/**
 * RBAC Resolvers barrel export
 *
 * GraphQL resolvers for RBAC module.
 */

export { PermissionCheckResolver } from './permission-check.resolver';

import { PermissionCheckResolver } from './permission-check.resolver';

/**
 * Array of all active RBAC resolvers for module registration
 */
export const RBAC_RESOLVERS = [PermissionCheckResolver];
