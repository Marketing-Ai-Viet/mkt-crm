/**
 * RBAC Resolvers barrel export
 *
 * GraphQL resolvers for RBAC module
 *
 * Note: Resolvers are temporarily disabled until services are fully implemented.
 * To enable:
 * 1. Implement ValidationOrchestratorService.validatePermission() method
 * 2. Implement missing repository methods
 * 3. Uncomment the exports and array below
 */

// TODO: Enable when service methods are implemented
// export { PermissionCheckResolver } from './permission-check.resolver';
// export { PermissionAdminResolver } from './permission-admin.resolver';
// export { AuditLogResolver } from './audit-log.resolver';

/**
 * Array of all RBAC resolvers for module registration
 * Note: Currently empty - resolvers require additional service methods
 */
export const RBAC_RESOLVERS: unknown[] = [
  // PermissionCheckResolver,
  // PermissionAdminResolver,
  // AuditLogResolver,
];
