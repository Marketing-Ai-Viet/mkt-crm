import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

// ============================================
// Permission Template Types (Step 2.1)
// ============================================

export enum PermissionTemplateType {
  ROLE_BASED = 'ROLE_BASED',
  HIERARCHY_BASED = 'HIERARCHY_BASED',
  DEPARTMENT_BASED = 'DEPARTMENT_BASED',
  CUSTOM = 'CUSTOM',
}

export const PERMISSION_TEMPLATE_TYPE_OPTIONS = [
  {
    value: PermissionTemplateType.ROLE_BASED,
    label: 'Role Based',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: PermissionTemplateType.HIERARCHY_BASED,
    label: 'Hierarchy Based',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: PermissionTemplateType.DEPARTMENT_BASED,
    label: 'Department Based',
    color: 'purple' as TagColor,
    position: 2,
  },
  {
    value: PermissionTemplateType.CUSTOM,
    label: 'Custom',
    color: 'orange' as TagColor,
    position: 3,
  },
];

// ============================================
// Resolution Strategies (Step 2.1)
// ============================================

export enum ResolutionStrategy {
  PRIORITY_BASED = 'PRIORITY_BASED',
  MOST_RESTRICTIVE = 'MOST_RESTRICTIVE',
  MOST_PERMISSIVE = 'MOST_PERMISSIVE',
}

export const RESOLUTION_STRATEGY_OPTIONS = [
  {
    value: ResolutionStrategy.PRIORITY_BASED,
    label: 'Priority Based',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: ResolutionStrategy.MOST_RESTRICTIVE,
    label: 'Most Restrictive',
    color: 'red' as TagColor,
    position: 1,
  },
  {
    value: ResolutionStrategy.MOST_PERMISSIVE,
    label: 'Most Permissive',
    color: 'green' as TagColor,
    position: 2,
  },
];

// ============================================
// Data Access Policy Types (Step 2.2)
// ============================================

export enum PolicyType {
  ROW_LEVEL = 'ROW_LEVEL',
  FIELD_LEVEL = 'FIELD_LEVEL',
  COLUMN_LEVEL = 'COLUMN_LEVEL',
}

export const POLICY_TYPE_OPTIONS = [
  {
    value: PolicyType.ROW_LEVEL,
    label: 'Row Level',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: PolicyType.FIELD_LEVEL,
    label: 'Field Level',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: PolicyType.COLUMN_LEVEL,
    label: 'Column Level',
    color: 'purple' as TagColor,
    position: 2,
  },
];

// ============================================
// Evaluation Modes (Step 2.2)
// ============================================

export enum EvaluationMode {
  STRICT = 'STRICT',
  PERMISSIVE = 'PERMISSIVE',
  BALANCED = 'BALANCED',
}

export const EVALUATION_MODE_OPTIONS = [
  {
    value: EvaluationMode.STRICT,
    label: 'Strict',
    color: 'red' as TagColor,
    position: 0,
  },
  {
    value: EvaluationMode.PERMISSIVE,
    label: 'Permissive',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: EvaluationMode.BALANCED,
    label: 'Balanced',
    color: 'yellow' as TagColor,
    position: 2,
  },
];

// ============================================
// Risk Levels (Step 2.2) - reusing from permission-template-options
// ============================================

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const RISK_LEVEL_OPTIONS = [
  {
    value: RiskLevel.LOW,
    label: 'Low',
    color: 'green' as TagColor,
    position: 0,
  },
  {
    value: RiskLevel.MEDIUM,
    label: 'Medium',
    color: 'yellow' as TagColor,
    position: 1,
  },
  {
    value: RiskLevel.HIGH,
    label: 'High',
    color: 'orange' as TagColor,
    position: 2,
  },
  {
    value: RiskLevel.CRITICAL,
    label: 'Critical',
    color: 'red' as TagColor,
    position: 3,
  },
];

// ============================================
// Conflict Resolution Strategies (Step 2.2)
// ============================================

export enum ConflictResolution {
  DENY_WINS = 'DENY_WINS',
  ALLOW_WINS = 'ALLOW_WINS',
  HIGHEST_PRIORITY = 'HIGHEST_PRIORITY',
}

export const CONFLICT_RESOLUTION_OPTIONS = [
  {
    value: ConflictResolution.DENY_WINS,
    label: 'Deny Wins',
    color: 'red' as TagColor,
    position: 0,
  },
  {
    value: ConflictResolution.ALLOW_WINS,
    label: 'Allow Wins',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: ConflictResolution.HIGHEST_PRIORITY,
    label: 'Highest Priority',
    color: 'blue' as TagColor,
    position: 2,
  },
];

// ============================================
// Validation Modes (Step 2.3)
// ============================================

export enum ValidationMode {
  SIMPLIFIED = 'SIMPLIFIED',
  FULL = 'FULL',
}

export const VALIDATION_MODE_OPTIONS = [
  {
    value: ValidationMode.SIMPLIFIED,
    label: 'Simplified',
    color: 'green' as TagColor,
    position: 0,
  },
  {
    value: ValidationMode.FULL,
    label: 'Full',
    color: 'blue' as TagColor,
    position: 1,
  },
];
