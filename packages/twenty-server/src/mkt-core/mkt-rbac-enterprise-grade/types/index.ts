export * from './enhanced-permission-context.type';
export * from './hierarchy-context.type';
export * from './resource-identification.types';

// Export from policy-context.type (canonical source for policy types)
export {
  type PolicyCondition,
  type PolicyEvaluationResult,
  type DataAccessPolicy,
  type PolicyEvaluationContext,
  type PolicyEngineConfig,
  type ConditionGroup,
  type PolicyFilter,
  type PolicyTemplate,
  type ConflictResolutionStrategy,
  type PolicyPerformanceMetrics,
  type PolicyCache,
} from './policy-context.type';

// Export from audit.types (canonical source for audit types)
export {
  type ComplianceViolation,
  type AuditLogEntry,
  type SecurityIncident,
  type AlertSummary,
  type SecurityAlert,
  type ComplianceReport,
  type AuditConfiguration,
  type AuditMetrics,
  type AuditFilter,
  type AuditSearchResult,
  type AuditExportRequest,
  type AuditExportResult,
  type AuditRetentionPolicy,
  type AuditNotification,
} from './audit.types';

// Export from validation-step.types (data types only)
export {
  // Validation result types
  type StepValidationResult,
  type StepExecutionMetrics,
  type PermissionValidationStatistics,
  // User and organization types
  type UserHierarchyInfo,
  type DepartmentInfo,
  type PermissionTemplate,
  type ResourceOwnership,
  type AccessControlEntry,
  type ReportingRelationship,
  // Template and policy types
  type TemplateConflictResolution,
  type PolicyEvaluationResult as ValidationPolicyEvaluationResult,
  type DataFilter,
  type TimeRestriction,
  // Emergency access types
  type EmergencyAccess,
  type EmergencyAccessLog,
  // Performance types
  type PerformanceCacheData,
  // Business rule types
  type BusinessRuleEvaluationResult,
  type ApprovalRequirement,
  type ResourceRestriction,
  type HierarchyFilteringResult,
  // Compliance types
  type ComplianceRequirementResult,
  type ComplianceRule,
  // Dynamic condition types
  type DynamicConditionResult,
  type PerformanceOptimizationResult,
  type ComplianceReportData,
  // Final decision types
  type FinalDecisionResult,
  type ConflictResolutionResult,
} from './validation-step.types';

// Casbin-specific types (re-export from casbin/types for backward compatibility)
export * from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';

// Permission template types
export * from './mkt-template-access-limitation.type';
export * from './permissions.type';

// Service types - centralized type definitions for RBAC services
export * from './permission-template.types';
export * from './user-permission-template.types';
export * from './data-access-policy.types';
export * from './template-resource-permission.types';
export * from './temporary-permission.types';
export {
  type CreateAuditLogInput,
  type AuditQueryOptions,
  type PaginatedAuditLogResult,
  type AuditStatistics,
  type UserAuditSummary,
  type SecurityAlert as ServiceSecurityAlert,
  type SecurityAlertType,
  type SecurityAlertSeverity,
} from './rbac-audit.types';

// Department authorization types
export * from './department-authorization.types';

// Hierarchical access types
export * from './hierarchical-access.types';

// RBAC Context types
export * from './rbac-context.types';

// Filter expression types (Template layer)
export * from './filter-expression.types';
