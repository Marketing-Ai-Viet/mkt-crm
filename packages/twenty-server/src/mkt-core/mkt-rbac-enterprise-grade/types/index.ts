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

// Export from validation-step.types (excluding duplicates)
export {
  // Base validation step types
  type PermissionValidationStep,
  type StepValidationResult,
  type PermissionValidationOrchestrator,
  type ValidationExecutionPlan,
  // Step types
  type PreValidationStep,
  type UserContextResolutionStep,
  type ResourceIdentificationStep,
  type PermissionTemplateCheckStep,
  type ActionPermissionValidationStep,
  type ResourcePermissionCheckStep,
  type HierarchyValidationStep,
  type DataAccessPolicyCheckStep,
  type SpecialPermissionsStep,
  type SensitiveDataCheckStep,
  type DepartmentRestrictionsStep,
  type DynamicConditionsStep,
  type CachePerformanceStep,
  type AuditLoggingStep,
  type FinalDecisionStep,
  // Factory and middleware types
  type ValidationStepFactory,
  type ValidationMiddleware,
  type PermissionValidationMonitor,
  type StepExecutionMetrics,
  type PermissionValidationStatistics,
  // Specific types (migrated from interfaces)
  type UserHierarchyInfo,
  type DepartmentInfo,
  type PermissionTemplate,
  type ResourceOwnership,
  type AccessControlEntry,
  type ReportingRelationship,
  type TemplateConflictResolution,
  type DataFilter,
  type TimeRestriction,
  type EmergencyAccess,
  type EmergencyAccessLog,
  type PerformanceCacheData,
  type BusinessRuleEvaluationResult,
  type ApprovalRequirement,
  type ResourceRestriction,
  type HierarchyFilteringResult,
  type ComplianceRequirementResult,
  type ComplianceRule,
  type DynamicConditionResult,
  type PerformanceOptimizationResult,
  type ComplianceReportData,
  type FinalDecisionResult,
  type ConflictResolutionResult,
} from './validation-step.types';

// Note: hierarchy.types, policy.types, service.types have overlapping exports
// with other files. Import them directly if needed.

// Casbin-specific types
export * from './casbin.types';
export * from './policy-sync.types';
export * from './rbac-config.types';
