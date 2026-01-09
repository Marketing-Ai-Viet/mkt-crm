/**
 * RBAC Hooks barrel export
 *
 * Pre/post query hooks for RBAC workspace entities
 *
 * Note: Hooks are temporarily disabled until repositories are fully implemented.
 * To enable:
 * 1. Implement missing repository methods (existsByCode, etc.)
 * 2. Implement missing cache service methods
 * 3. Uncomment the exports and array below
 */

// TODO: Enable when repository methods are implemented
// export { PermissionTemplateCreateOnePreQueryHook } from './permission-template-create-one.pre-query.hook';
// export { PermissionTemplateCreateOnePostQueryHook } from './permission-template-create-one.post-query.hook';
// export { PermissionTemplateUpdateOnePreQueryHook } from './permission-template-update-one.pre-query.hook';
// export { PermissionTemplateUpdateOnePostQueryHook } from './permission-template-update-one.post-query.hook';
// export { PermissionTemplateDeleteOnePreQueryHook } from './permission-template-delete-one.pre-query.hook';
// export { PermissionTemplateDeleteOnePostQueryHook } from './permission-template-delete-one.post-query.hook';

/**
 * Array of all RBAC hooks for module registration
 * Note: Currently empty - hooks require additional repository methods
 */
export const RBAC_HOOKS: unknown[] = [
  // Permission Template Hooks - enable when ready
  // PermissionTemplateCreateOnePreQueryHook,
  // PermissionTemplateCreateOnePostQueryHook,
  // PermissionTemplateUpdateOnePreQueryHook,
  // PermissionTemplateUpdateOnePostQueryHook,
  // PermissionTemplateDeleteOnePreQueryHook,
  // PermissionTemplateDeleteOnePostQueryHook,
];
