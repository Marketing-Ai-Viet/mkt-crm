import {
  ApprovalDecision,
  CasbinPolicy,
  GroupingPolicy,
  HighRiskAssessment,
  PolicyChangeRequestStatus,
  PolicyChangeType,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin';

/**
 * Sync result status
 */
export type SyncStatus = 'success' | 'skipped' | 'failed';

/**
 * Policy sync result
 */
export type SyncResult = {
  status: SyncStatus;
  reason?: string;
  policiesAdded?: number;
  policiesRemoved?: number;
  latencyMs?: number;
  version?: number;
};

/**
 * Policy diff between current and proposed
 */
export type PolicyDiff = {
  added: string[][];
  removed: string[][];
  unchanged: number;
};

/**
 * Manual sync result with diff (for dry-run)
 */
export type ManualSyncResult =
  | SyncResult
  | {
      dryRun: true;
      current: string[][];
      proposed: string[][];
      diff: PolicyDiff;
    };

/**
 * Sync failed event payload
 */
export type SyncFailedEvent = {
  workspaceId: string;
  error: string;
  retryCount?: number;
  timestamp: Date;
};

/**
 * Permission change event payload
 */
export type PermissionChangeEvent = {
  workspaceId: string;
  templateId?: string;
  userId?: string;
  action: 'created' | 'updated' | 'deleted';
  timestamp: Date;
};

/**
 * Policy version entry
 */
export type PolicyVersion = {
  workspaceId: string;
  version: number;
  policyHash: string;
  updatedAt: Date;
};

/**
 * Validation result for policy
 */
export type PolicyValidationResult = {
  valid: boolean;
  errors: string[];
  warnings?: string[];
};

/**
 * Dead letter queue entry for failed syncs
 */
export type SyncDeadLetterEntry = {
  id: string;
  workspaceId: string;
  failedAt: Date;
  lastError: string;
  retryCount: number;
  resolvedAt?: Date;
};

/**
 * Change request creation input
 */
export type CreateChangeRequestInput = {
  policy: CasbinPolicy | GroupingPolicy;
  changeType: PolicyChangeType;
  requesterId: string;
  requestReason?: string;
};

/**
 * Change request result
 */
export type ChangeRequestResult = {
  id: string;
  status: PolicyChangeRequestStatus;
  riskAssessment: HighRiskAssessment;
  requiresApproval: boolean;
  requiredApprovals: number;
};

/**
 * Process approval input
 */
export type ProcessApprovalInput = {
  changeRequestId: string;
  approverId: string;
  decision: ApprovalDecision;
  reason?: string;
};

/**
 * Process approval result
 */
export type ProcessApprovalResult = {
  success: boolean;
  message: string;
  changeRequest?: {
    id: string;
    status: PolicyChangeRequestStatus;
    currentApprovals: number;
    requiredApprovals: number;
  };
  policyApplied?: boolean;
};

/**
 * Audit entry for policy changes
 */
export type PolicyAuditEntry = {
  id: string;
  changeType: PolicyChangeType;
  status: PolicyChangeRequestStatus;
  policyData: object;
  riskAssessment: object;
  requesterId: string;
  requestReason: string | null;
  requiredApprovals: number;
  currentApprovals: number;
  approvals: Array<{
    approverId: string;
    decision: ApprovalDecision;
    reason: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

/**
 * Audit query options
 */
export type AuditQueryOptions = {
  status?: PolicyChangeRequestStatus;
  requesterId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
};

/**
 * Create approval input
 */
export type CreateApprovalData = {
  decision: ApprovalDecision;
  reason?: string | null;
  changeRequestId: string;
  approverId: string;
};

/**
 * Query options for approvals
 */
export type ApprovalQueryOptions = {
  changeRequestId?: string;
  approverId?: string;
  decision?: ApprovalDecision;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
};
