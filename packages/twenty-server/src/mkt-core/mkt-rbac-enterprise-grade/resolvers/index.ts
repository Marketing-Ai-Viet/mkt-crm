/**
 * RBAC Resolvers barrel export
 *
 * GraphQL resolvers for RBAC module.
 *
 * Note: PolicyManagementResolver and AuditLogResolver have been removed from
 * RBAC_RESOLVERS as they depended on Casbin-specific services (PolicyApprovalService,
 * WorkspaceCasbinRuleRepository) which are no longer available after Casbin removal.
 * They remain as files but are not registered with the module.
 */

export { PermissionCheckResolver } from './permission-check.resolver';

import { PermissionCheckResolver } from './permission-check.resolver';

/**
 * Array of all active RBAC resolvers for module registration
 */
export const RBAC_RESOLVERS = [PermissionCheckResolver];
