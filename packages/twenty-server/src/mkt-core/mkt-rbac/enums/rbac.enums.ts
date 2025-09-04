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
  DEPARTMENT = 'department',
  DEPARTMENT_HIERARCHY = 'departmentHierarchy',
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

  // Department specific actions
  CREATE_DEPARTMENT = 'CREATE_DEPARTMENT',
  READ_DEPARTMENT = 'READ_DEPARTMENT',
  UPDATE_DEPARTMENT = 'UPDATE_DEPARTMENT',
  DELETE_DEPARTMENT = 'DELETE_DEPARTMENT',
  VIEW_ALL_DEPARTMENTS = 'VIEW_ALL_DEPARTMENTS',
  VIEW_OWN_DEPARTMENT = 'VIEW_OWN_DEPARTMENT',
  VIEW_CHILD_DEPARTMENTS = 'VIEW_CHILD_DEPARTMENTS',
  VIEW_PARENT_DEPARTMENTS = 'VIEW_PARENT_DEPARTMENTS',
  VIEW_DEPARTMENT_HIERARCHY = 'VIEW_DEPARTMENT_HIERARCHY',
  CONFIGURE_DEPARTMENT_SETTINGS = 'CONFIGURE_DEPARTMENT_SETTINGS',
  MANAGE_DEPARTMENT_BUDGET = 'MANAGE_DEPARTMENT_BUDGET',
  SET_DEPARTMENT_KPI_TRACKING = 'SET_DEPARTMENT_KPI_TRACKING',
  CONFIGURE_CROSS_DEPARTMENT_ACCESS = 'CONFIGURE_CROSS_DEPARTMENT_ACCESS',
  MANAGE_DEPARTMENT_COLOR_AND_ICON = 'MANAGE_DEPARTMENT_COLOR_AND_ICON',
  CREATE_DEPARTMENT_HIERARCHY = 'CREATE_DEPARTMENT_HIERARCHY',
  UPDATE_DEPARTMENT_HIERARCHY = 'UPDATE_DEPARTMENT_HIERARCHY',
  DELETE_DEPARTMENT_HIERARCHY = 'DELETE_DEPARTMENT_HIERARCHY',
  VIEW_DEPARTMENT_HIERARCHY_DETAILS = 'VIEW_DEPARTMENT_HIERARCHY_DETAILS',
  CONFIGURE_HIERARCHY_PERMISSIONS = 'CONFIGURE_HIERARCHY_PERMISSIONS',
  MANAGE_HIERARCHY_ESCALATION_RULES = 'MANAGE_HIERARCHY_ESCALATION_RULES',
  ASSIGN_MEMBERS_TO_DEPARTMENT = 'ASSIGN_MEMBERS_TO_DEPARTMENT',
  REMOVE_MEMBERS_FROM_DEPARTMENT = 'REMOVE_MEMBERS_FROM_DEPARTMENT',
  VIEW_DEPARTMENT_MEMBERS = 'VIEW_DEPARTMENT_MEMBERS',
  TRANSFER_MEMBERS_BETWEEN_DEPARTMENTS = 'TRANSFER_MEMBERS_BETWEEN_DEPARTMENTS',
  CREATE_DEPARTMENT_DATA_POLICY = 'CREATE_DEPARTMENT_DATA_POLICY',
  UPDATE_DEPARTMENT_DATA_POLICY = 'UPDATE_DEPARTMENT_DATA_POLICY',
  DELETE_DEPARTMENT_DATA_POLICY = 'DELETE_DEPARTMENT_DATA_POLICY',
  VIEW_DEPARTMENT_DATA_POLICIES = 'VIEW_DEPARTMENT_DATA_POLICIES',
  APPLY_DATA_POLICIES = 'APPLY_DATA_POLICIES',
  EXPORT_DEPARTMENT_DATA = 'EXPORT_DEPARTMENT_DATA',
  IMPORT_DEPARTMENT_DATA = 'IMPORT_DEPARTMENT_DATA',
  BULK_DEPARTMENT_OPERATIONS = 'BULK_DEPARTMENT_OPERATIONS',
  VIEW_DEPARTMENT_AUDIT_LOG = 'VIEW_DEPARTMENT_AUDIT_LOG',
  VIEW_CROSS_DEPARTMENT_DATA = 'VIEW_CROSS_DEPARTMENT_DATA',
  EDIT_CROSS_DEPARTMENT_DATA = 'EDIT_CROSS_DEPARTMENT_DATA',
  EXPORT_CROSS_DEPARTMENT_DATA = 'EXPORT_CROSS_DEPARTMENT_DATA',
  VIEW_DEPARTMENT_REPORTS = 'VIEW_DEPARTMENT_REPORTS',
  CREATE_DEPARTMENT_REPORTS = 'CREATE_DEPARTMENT_REPORTS',
  VIEW_DEPARTMENT_ANALYTICS = 'VIEW_DEPARTMENT_ANALYTICS',
  VIEW_CROSS_DEPARTMENT_ANALYTICS = 'VIEW_CROSS_DEPARTMENT_ANALYTICS',
  MANAGE_DEPARTMENT_SYSTEM_SETTINGS = 'MANAGE_DEPARTMENT_SYSTEM_SETTINGS',
  BACKUP_DEPARTMENT_DATA = 'BACKUP_DEPARTMENT_DATA',
  RESTORE_DEPARTMENT_DATA = 'RESTORE_DEPARTMENT_DATA',
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

      // Department specific actions
      [PermissionAction.CREATE_DEPARTMENT]: PermissionAuditAction.CREATE,
      [PermissionAction.READ_DEPARTMENT]: PermissionAuditAction.READ,
      [PermissionAction.UPDATE_DEPARTMENT]: PermissionAuditAction.UPDATE,
      [PermissionAction.DELETE_DEPARTMENT]: PermissionAuditAction.DELETE,
      [PermissionAction.VIEW_ALL_DEPARTMENTS]: PermissionAuditAction.READ,
      [PermissionAction.VIEW_OWN_DEPARTMENT]: PermissionAuditAction.READ,
      [PermissionAction.VIEW_CHILD_DEPARTMENTS]: PermissionAuditAction.READ,
      [PermissionAction.VIEW_PARENT_DEPARTMENTS]: PermissionAuditAction.READ,
      [PermissionAction.VIEW_DEPARTMENT_HIERARCHY]: PermissionAuditAction.READ,
      [PermissionAction.CONFIGURE_DEPARTMENT_SETTINGS]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.MANAGE_DEPARTMENT_BUDGET]: PermissionAuditAction.UPDATE,
      [PermissionAction.SET_DEPARTMENT_KPI_TRACKING]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.CONFIGURE_CROSS_DEPARTMENT_ACCESS]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.MANAGE_DEPARTMENT_COLOR_AND_ICON]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.CREATE_DEPARTMENT_HIERARCHY]:
        PermissionAuditAction.CREATE,
      [PermissionAction.UPDATE_DEPARTMENT_HIERARCHY]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.DELETE_DEPARTMENT_HIERARCHY]:
        PermissionAuditAction.DELETE,
      [PermissionAction.VIEW_DEPARTMENT_HIERARCHY_DETAILS]:
        PermissionAuditAction.READ,
      [PermissionAction.CONFIGURE_HIERARCHY_PERMISSIONS]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.MANAGE_HIERARCHY_ESCALATION_RULES]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.ASSIGN_MEMBERS_TO_DEPARTMENT]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.REMOVE_MEMBERS_FROM_DEPARTMENT]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.VIEW_DEPARTMENT_MEMBERS]: PermissionAuditAction.READ,
      [PermissionAction.TRANSFER_MEMBERS_BETWEEN_DEPARTMENTS]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.CREATE_DEPARTMENT_DATA_POLICY]:
        PermissionAuditAction.CREATE,
      [PermissionAction.UPDATE_DEPARTMENT_DATA_POLICY]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.DELETE_DEPARTMENT_DATA_POLICY]:
        PermissionAuditAction.DELETE,
      [PermissionAction.VIEW_DEPARTMENT_DATA_POLICIES]:
        PermissionAuditAction.READ,
      [PermissionAction.APPLY_DATA_POLICIES]: PermissionAuditAction.UPDATE,
      [PermissionAction.EXPORT_DEPARTMENT_DATA]: PermissionAuditAction.EXPORT,
      [PermissionAction.IMPORT_DEPARTMENT_DATA]: PermissionAuditAction.CREATE,
      [PermissionAction.BULK_DEPARTMENT_OPERATIONS]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.VIEW_DEPARTMENT_AUDIT_LOG]: PermissionAuditAction.READ,
      [PermissionAction.VIEW_CROSS_DEPARTMENT_DATA]: PermissionAuditAction.READ,
      [PermissionAction.EDIT_CROSS_DEPARTMENT_DATA]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.EXPORT_CROSS_DEPARTMENT_DATA]:
        PermissionAuditAction.EXPORT,
      [PermissionAction.VIEW_DEPARTMENT_REPORTS]: PermissionAuditAction.READ,
      [PermissionAction.CREATE_DEPARTMENT_REPORTS]:
        PermissionAuditAction.CREATE,
      [PermissionAction.VIEW_DEPARTMENT_ANALYTICS]: PermissionAuditAction.READ,
      [PermissionAction.VIEW_CROSS_DEPARTMENT_ANALYTICS]:
        PermissionAuditAction.READ,
      [PermissionAction.MANAGE_DEPARTMENT_SYSTEM_SETTINGS]:
        PermissionAuditAction.UPDATE,
      [PermissionAction.BACKUP_DEPARTMENT_DATA]: PermissionAuditAction.EXPORT,
      [PermissionAction.RESTORE_DEPARTMENT_DATA]: PermissionAuditAction.CREATE,
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
      ModuleName.DEPARTMENT,
      ModuleName.DEPARTMENT_HIERARCHY,
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
      ModuleName.DEPARTMENT,
      ModuleName.DEPARTMENT_HIERARCHY,
    ];
  }
}
