import {
  CasbinPolicy,
  GroupingPolicy,
  HighRiskAssessment,
  PolicyChangeRequestStatus,
  PolicyChangeType,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin';

/**
 * Default expiration hours for pending requests
 */
export const DEFAULT_EXPIRATION_HOURS = 72;

/**
 * Create change request input
 */
export type CreateChangeRequestData = {
  status: PolicyChangeRequestStatus;
  changeType: PolicyChangeType;
  policyData: CasbinPolicy | GroupingPolicy;
  riskAssessment: HighRiskAssessment;
  requiredApprovals: number;
  currentApprovals: number;
  requestReason?: string | null;
  requestedById: string;
};

/**
 * Query options for change requests
 */
export type ChangeRequestQueryOptions = {
  status?: PolicyChangeRequestStatus | PolicyChangeRequestStatus[];
  requestedById?: string;
  changeType?: PolicyChangeType;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
};
