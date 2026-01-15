/**
 * Core RBAC constants
 * - Enterprise RBAC: Main enterprise RBAC definitions
 * - Hierarchy: Organization hierarchy constants (from mkt-department)
 * - Policy: Policy-related constants
 */
export * from './enterprise-rbac.constants';
export * from './policy.constants';

// Re-export hierarchy constants from centralized location
export {
  HierarchyLevel,
  DepartmentCode,
  ReportingRelationship,
  HIERARCHY_CONSTANTS,
  TEMPLATE_PRIORITY,
  RESOLUTION_STRATEGY,
  type ResolutionStrategyType,
} from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
