import {
  PermissionContext,
  PermissionResult,
} from 'src/mkt-core/mkt-rbac/types/permission-context.type';

export interface IRbacService {
  /**
   * Check if a user has permission to perform a specific action
   */
  checkPermission(context: PermissionContext): Promise<PermissionResult>;

  /**
   * Check permissions for multiple contexts at once
   */
  checkMultiplePermissions(
    contexts: PermissionContext[],
  ): Promise<PermissionResult[]>;

  /**
   * Get all permissions for a workspace member on a specific object
   */
  getPermissionsForObject(
    workspaceMemberId: string,
    workspaceId: string,
    objectName: string,
    recordId?: string,
  ): Promise<PermissionResult[]>;

  /**
   * Validate if a permission check should be cached
   */
  shouldCachePermission(context: PermissionContext): boolean;

  /**
   * Clear permission cache for a specific user or object
   */
  clearPermissionCache(
    workspaceMemberId?: string,
    workspaceId?: string,
    objectName?: string,
  ): Promise<void>;
}
