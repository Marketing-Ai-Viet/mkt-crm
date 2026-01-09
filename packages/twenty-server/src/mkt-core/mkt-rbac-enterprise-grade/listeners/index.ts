/**
 * RBAC Listeners barrel export
 *
 * Event listeners for RBAC module events
 *
 * Note: Listeners are temporarily disabled until services are fully implemented.
 * To enable:
 * 1. Implement MktPermissionAuditRepository.create() method
 * 2. Implement missing cache service methods
 * 3. Uncomment the exports and array below
 */

// TODO: Enable when service methods are implemented
// export { PermissionTemplateListener } from './permission-template.listener';
// export { UserRoleListener } from './user-role.listener';
// export { PolicyListener } from './policy.listener';

/**
 * Array of all RBAC listeners for module registration
 * Note: Currently empty - listeners require additional service methods
 */
export const RBAC_LISTENERS: unknown[] = [
  // PermissionTemplateListener,
  // UserRoleListener,
  // PolicyListener,
];
