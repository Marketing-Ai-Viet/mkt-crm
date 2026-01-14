/**
 * Data Access Policy Types
 *
 * Types for data access policy management operations
 */

import {
  DataAccessPolicyType,
  EvaluationMode,
  RiskLevel,
  ConflictResolution,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * Filter condition structure for policies
 */
export type PolicyFilterCondition = {
  field: string;
  operator: string;
  value: unknown;
  description?: string;
};

/**
 * Filter conditions container
 */
export type FilterConditions = {
  type?: 'AND' | 'OR';
  conditions?: PolicyFilterCondition[];
  ownership?: {
    enabled: boolean;
    field: string;
    allowShared?: boolean;
  };
  timeRange?: {
    field: string;
    daysBack?: number;
    startDate?: string;
    endDate?: string;
  };
  status?: {
    allowedValues?: string[];
    deniedValues?: string[];
  };
  [key: string]: unknown;
};

/**
 * Create policy input
 */
export type CreatePolicyInput = {
  name: string;
  description?: string;
  objectName: string;
  filterConditions: FilterConditions;
  departmentId?: string;
  specificMemberId?: string;
  organizationLevelId?: string;
  permissionTemplateId?: string;
  policyType?: DataAccessPolicyType;
  evaluationMode?: EvaluationMode;
  riskLevel?: RiskLevel;
  conflictResolution?: ConflictResolution;
  priority?: number;
  isActive?: boolean;
};

/**
 * Update policy input
 */
export type UpdatePolicyInput = {
  name?: string;
  description?: string;
  filterConditions?: FilterConditions;
  departmentId?: string | null;
  specificMemberId?: string | null;
  organizationLevelId?: string | null;
  permissionTemplateId?: string | null;
  policyType?: DataAccessPolicyType;
  evaluationMode?: EvaluationMode;
  riskLevel?: RiskLevel;
  conflictResolution?: ConflictResolution;
  priority?: number;
  isActive?: boolean;
};

/**
 * Policy query options
 */
export type PolicyQueryOptions = {
  includeRelations?: boolean;
  includeInactive?: boolean;
  objectName?: string;
  departmentId?: string;
  organizationLevelId?: string;
  policyType?: DataAccessPolicyType;
  riskLevel?: RiskLevel;
};

/**
 * Policy list result
 */
export type PolicyListResult = {
  policies: MktDataAccessPolicyWorkspaceEntity[];
  total: number;
};

/**
 * Policy evaluation context (service-specific)
 * Note: Different from policy-context.type.ts PolicyEvaluationContext
 */
export type ServicePolicyEvaluationContext = {
  workspaceId: string;
  userId: string;
  workspaceMemberId: string;
  objectName: string;
  action: string;
  departmentId?: string;
  organizationLevelId?: string;
};

/**
 * Policy evaluation result (service-specific)
 * Note: Different from policy-context.type.ts PolicyEvaluationResult
 */
export type ServicePolicyEvaluationResult = {
  allowed: boolean;
  appliedPolicies: MktDataAccessPolicyWorkspaceEntity[];
  filterConditions: FilterConditions | null;
  deniedBy?: string;
  reason?: string;
};
