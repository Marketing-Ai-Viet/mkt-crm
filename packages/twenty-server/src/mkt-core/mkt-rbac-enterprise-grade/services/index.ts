/**
 * RBAC Core Services barrel export
 */

// Core Services
export {
  RbacContextService,
  UserContext,
  DepartmentTree,
} from './rbac-context.service';
export { RbacEnforcerService } from './rbac-enforcer.service';
export type {
  RbacCheckPermissionResult,
  RbacPermissionSummary,
  RbacFilterCondition,
  RbacFilterConditionItem,
  RbacFilterOperator,
  RbacAppliedPolicy,
  RbacResourcePermission,
  RbacActivePolicy,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';
export { RbacCacheService } from './rbac-cache.service';

// Base Services
export { PermissionTemplateService } from './bases/permission-template.service';
export { UserPermissionTemplateService } from './bases/user-permission-template.service';
export { DataAccessPolicyService } from './bases/data-access-policy.service';
export { TemplateResourcePermissionService } from './bases/template-resource-permission.service';
export {
  TemporaryPermissionService,
  TemporaryPermissionPurpose,
  RevokeReason,
} from './bases/temporary-permission.service';
export { PermissionContextService } from './bases/permission-context.service';
export { RbacAuditService } from './rbac-audit.service';
export { HierarchicalAccessEvaluatorService } from './hierarchical-access-evaluator.service';
export { FilterExpressionResolverService } from './filter-expression-resolver.service';

// Re-export types from types folder for backward compatibility
export type {
  // Permission Template types
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateQueryOptions,
  TemplateListResult,
  // User Permission Template types
  AssignTemplateInput,
  BulkAssignTemplateInput,
  UpdateAssignmentInput,
  UserAssignmentSummary,
  TemplateUsageStats,
  // Data Access Policy types
  CreatePolicyInput,
  UpdatePolicyInput,
  PolicyQueryOptions,
  PolicyListResult,
  PolicyFilterCondition,
  FilterConditions,
  ServicePolicyEvaluationContext,
  ServicePolicyEvaluationResult,
  // Template Resource Permission types
  CreateResourcePermissionInput,
  UpdateResourcePermissionInput,
  BulkCreateResourcePermissionInput,
  ResourcePermissionQueryOptions,
  ResourcePermissionListResult,
  PermissionConditions,
  PermissionRestrictions,
  TemplatePermissionSummary,
  EffectiveResourcePermission,
  // Temporary Permission types
  CreateTemporaryPermissionInput,
  GrantTemporaryAccessInput,
  RevokeTemporaryPermissionInput,
  TemporaryPermissionQueryOptions,
  TemporaryPermissionListResult,
  TemporaryPermissionCheckResult,
  UserTemporaryPermissionsSummary,
  // Audit types
  CreateAuditLogInput,
  AuditQueryOptions,
  PaginatedAuditLogResult,
  AuditStatistics,
  UserAuditSummary,
  ServiceSecurityAlert as SecurityAlert,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';
