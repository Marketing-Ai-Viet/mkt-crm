/**
 * Centralized RBAC exports
 * Single entry point for all RBAC-related imports
 */

// Core enums - single source of truth
export {
  ModuleName,
  PermissionAction,
  PermissionAuditAction,
  PermissionSource,
  CheckResult,
  GraphQLOperationType,
  RbacEnumMapper,
} from './enums/rbac.enums';

// Services
export { MktRbacService } from './services/mkt-rbac.service';

// Guards
export {
  ModuleAccessGuard,
  RequireModuleAccess,
  MODULE_ACCESS_KEY,
} from './guards/module-access.guard';
export { GraphQLPermissionGuard } from './guards/graphql-permission.guard';
export { ActionPermissionGuard } from './guards/action-permission.guard';

// Decorators
export {
  RequireGraphQLPermission,
  RequireFieldPermission,
  RequireQuery,
  RequireQueryList,
  RequireMutation,
  RequireCreateMutation,
  RequireUpdateMutation,
  RequireDeleteMutation,
  RequireSubscription,
  RequireFieldRead,
  RequireFieldWrite,
  GRAPHQL_PERMISSION_KEY,
  GRAPHQL_FIELD_PERMISSION_KEY,
} from './decorators/graphql-permission.decorator';

// Types
export {
  PermissionContext,
  PermissionResult,
  GraphQLPermissionContext,
  GraphQLAuditContext,
  AuditContext,
  PermissionCheckResult,
} from './types/permission-context.type';

// Constants
export {
  PERMISSION_SOURCE_MAPPING,
  PERMISSION_RESULT_MAPPING,
  DEFAULT_PERMISSION_SETTINGS,
  GRAPHQL_OPERATIONS,
} from './constants/rbac.constants';

// Module
export { MktRbacModule } from './mkt-rbac.module';
