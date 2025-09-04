/**
 * Centralized RBAC Enums
 * All enums use lowercase values for consistency
 */

// Module names
export enum ModuleName {
  ORDER = 'mktOrderModule',
  KPI = 'kpi',
  PERMISSION = 'permission',
  ANALYTICS = 'analytics',
  FINANCE = 'finance',
  CUSTOMER = 'customer',
  PRODUCT = 'product',
  USER = 'user',
}

// Permission actions (internal logic - uppercase)
export enum PermissionAction {
  QUERY = 'QUERY',
  MUTATION = 'MUTATION',
  SUBSCRIPTION = 'SUBSCRIPTION',
  FIELD_READ = 'FIELD_READ',
  FIELD_WRITE = 'FIELD_WRITE',
  MODULE_ACCESS = 'MODULE_ACCESS',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',
  RESTORE = 'RESTORE',
  ARCHIVE = 'ARCHIVE',
}

// Permission audit actions (database enum values - lowercase)
export enum PermissionAuditAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
}

// Permission sources (database enum values - lowercase)
export enum PermissionSource {
  ROLE = 'role',
  TEMPORARY = 'temporary',
  SUPPORT_ASSIGNMENT = 'support_assignment',
  DEPARTMENT = 'department',
  DATA_ACCESS_POLICY = 'data_access_policy',
  ROLE_BASED = 'role_based',
  OWNER_ACCESS = 'owner_access',
  PUBLIC_ACCESS = 'public_access',
  DEPARTMENT_ACCESS = 'department_access',
  TEMPORARY_PERMISSION = 'temporary_permission',
}

// Check results (database enum values - lowercase)
export enum CheckResult {
  GRANTED = 'granted',
  DENIED = 'denied',
  PARTIAL = 'partial',
}

// GraphQL operation types (lowercase)
export enum GraphQLOperationType {
  QUERY = 'query',
  MUTATION = 'mutation',
  SUBSCRIPTION = 'subscription',
}

/**
 * Mapping functions - consistent lowercase approach
 */
export class RbacEnumMapper {
  // Map PermissionAction to PermissionAuditAction
  static toAuditAction(action: PermissionAction): PermissionAuditAction {
    const mapping: Record<PermissionAction, PermissionAuditAction> = {
      [PermissionAction.QUERY]: PermissionAuditAction.READ,
      [PermissionAction.MUTATION]: PermissionAuditAction.UPDATE,
      [PermissionAction.SUBSCRIPTION]: PermissionAuditAction.READ,
      [PermissionAction.FIELD_READ]: PermissionAuditAction.READ,
      [PermissionAction.FIELD_WRITE]: PermissionAuditAction.UPDATE,
      [PermissionAction.MODULE_ACCESS]: PermissionAuditAction.READ,
      [PermissionAction.CREATE]: PermissionAuditAction.CREATE,
      [PermissionAction.UPDATE]: PermissionAuditAction.UPDATE,
      [PermissionAction.DELETE]: PermissionAuditAction.DELETE,
      [PermissionAction.LIST]: PermissionAuditAction.READ,
      [PermissionAction.EXPORT]: PermissionAuditAction.EXPORT,
      [PermissionAction.IMPORT]: PermissionAuditAction.CREATE,
      [PermissionAction.BULK_UPDATE]: PermissionAuditAction.UPDATE,
      [PermissionAction.BULK_DELETE]: PermissionAuditAction.DELETE,
      [PermissionAction.RESTORE]: PermissionAuditAction.UPDATE,
      [PermissionAction.ARCHIVE]: PermissionAuditAction.UPDATE,
    };

    return mapping[action];
  }

  // Map logic strings to database enum (lowercase)
  static toPermissionSource(logicSource: string): PermissionSource {
    const mapping: Record<string, PermissionSource> = {
      role_based: PermissionSource.ROLE_BASED,
      data_access_policy: PermissionSource.DATA_ACCESS_POLICY,
      temporary_permission: PermissionSource.TEMPORARY,
      owner_access: PermissionSource.OWNER_ACCESS,
      public_access: PermissionSource.PUBLIC_ACCESS,
      department_access: PermissionSource.DEPARTMENT_ACCESS,
    };

    return mapping[logicSource] || PermissionSource.ROLE_BASED;
  }

  // Check if module is protected
  static isProtectedModule(module: string): module is ModuleName {
    const protectedModules: ModuleName[] = [
      ModuleName.ORDER,
      ModuleName.KPI,
      ModuleName.PERMISSION,
      ModuleName.ANALYTICS,
      ModuleName.FINANCE,
      ModuleName.CUSTOMER,
      ModuleName.PRODUCT,
    ];

    return protectedModules.includes(module as ModuleName);
  }

  // Get all protected modules
  static getProtectedModules(): ModuleName[] {
    return [
      ModuleName.ORDER,
      ModuleName.KPI,
      ModuleName.PERMISSION,
      ModuleName.ANALYTICS,
      ModuleName.FINANCE,
      ModuleName.CUSTOMER,
      ModuleName.PRODUCT,
    ];
  }
}
