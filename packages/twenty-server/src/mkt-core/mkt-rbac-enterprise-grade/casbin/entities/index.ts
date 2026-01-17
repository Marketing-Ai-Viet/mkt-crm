// Workspace entities for Casbin
export { MktCasbinRuleWorkspaceEntity } from './mkt-casbin-rule.workspace-entity';
export { MktPolicyVersionWorkspaceEntity } from './mkt-policy-version.workspace-entity';

// Policy approval workflow entities
export {
  MktPolicyChangeRequestWorkspaceEntity,
  POLICY_CHANGE_REQUEST_STATUS,
  POLICY_CHANGE_TYPE,
  type PolicyChangeRequestStatus,
  type PolicyChangeType,
} from './mkt-policy-change-request.workspace-entity';
export {
  MktPolicyApprovalWorkspaceEntity,
  APPROVAL_DECISION,
  type ApprovalDecision,
} from './mkt-policy-approval.workspace-entity';
