/**
 * RBAC Resolvers barrel export
 *
 * GraphQL resolvers for RBAC module
 *
 * Resolvers:
 * - PermissionCheckResolver: Permission checking queries and mutations
 * - PolicyManagementResolver: Policy CRUD and approval workflow
 * - AuditLogResolver: Audit log queries for compliance
 */

export { PermissionCheckResolver } from './permission-check.resolver';
export { PolicyManagementResolver } from './policy-management.resolver';
export { AuditLogResolver } from './audit-log.resolver';

import { PermissionCheckResolver } from './permission-check.resolver';
import { PolicyManagementResolver } from './policy-management.resolver';
import { AuditLogResolver } from './audit-log.resolver';

/**
 * Array of all RBAC resolvers for module registration
 */
export const RBAC_RESOLVERS = [
  PermissionCheckResolver,
  PolicyManagementResolver,
  AuditLogResolver,
];
