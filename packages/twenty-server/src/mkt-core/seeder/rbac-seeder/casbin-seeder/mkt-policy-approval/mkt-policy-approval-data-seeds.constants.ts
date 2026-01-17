/**
 * Policy Approval Seed Data Constants
 *
 * Contains seed data for MktPolicyApprovalWorkspaceEntity
 * Records individual approvals for policy change requests.
 */

import { APPROVAL_DECISION } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-approval.workspace-entity';
import { MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-policy-change-request/mkt-policy-change-request-data-seeds.constants';

type MktPolicyApprovalDataSeed = {
  id: string;
  title: string;
  decision: string;
  reason: string | null;
  changeRequestId: string | null;
  approverId: string;
  position: number | null;
};

export const MKT_POLICY_APPROVAL_DATA_SEED_COLUMNS: (keyof MktPolicyApprovalDataSeed)[] =
  [
    'id',
    'title',
    'decision',
    'reason',
    'changeRequestId',
    'approverId',
    'position',
  ];

export const MKT_POLICY_APPROVAL_DATA_SEEDS_IDS = {
  // Approvals for admin role grant (pending request with 1 approval)
  ADMIN_ROLE_APPROVAL_1: '44444444-0001-4000-8000-000000000001',
  // Approvals for department policy (approved request)
  DEPT_POLICY_APPROVAL_1: '44444444-0002-4000-8000-000000000001',
  // Approvals for read policy (applied request)
  READ_POLICY_APPROVAL_1: '44444444-0003-4000-8000-000000000001',
  // Rejections for high-risk policy
  HIGH_RISK_REJECTION_1: '44444444-0004-4000-8000-000000000001',
  HIGH_RISK_REJECTION_2: '44444444-0004-4000-8000-000000000002',
};

// Sample workspace member IDs for demo (approvers)
const SAMPLE_APPROVER_IDS = {
  ADMIN: '00000000-0000-4000-8000-000000000001',
  SECURITY_OFFICER: '00000000-0000-4000-8000-000000000010',
  CTO: '00000000-0000-4000-8000-000000000011',
};

export const MKT_POLICY_APPROVAL_DATA_SEEDS: MktPolicyApprovalDataSeed[] = [
  // Approval for pending admin role grant (1 of 2 required)
  {
    id: MKT_POLICY_APPROVAL_DATA_SEEDS_IDS.ADMIN_ROLE_APPROVAL_1,
    title: 'PA-001: Security Officer Approval for Admin Grant',
    decision: APPROVAL_DECISION.APPROVED,
    reason: 'Verified identity and need for admin access',
    changeRequestId:
      MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS.PENDING_ADMIN_ROLE_GRANT,
    approverId: SAMPLE_APPROVER_IDS.SECURITY_OFFICER,
    position: 1,
  },

  // Approval for department policy (approved request)
  {
    id: MKT_POLICY_APPROVAL_DATA_SEEDS_IDS.DEPT_POLICY_APPROVAL_1,
    title: 'PA-002: Admin Approval for Dept Policy',
    decision: APPROVAL_DECISION.APPROVED,
    reason: 'Department policy is appropriate for sales managers',
    changeRequestId:
      MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS.APPROVED_DEPARTMENT_POLICY,
    approverId: SAMPLE_APPROVER_IDS.ADMIN,
    position: 2,
  },

  // Approval for read-only policy (applied request)
  {
    id: MKT_POLICY_APPROVAL_DATA_SEEDS_IDS.READ_POLICY_APPROVAL_1,
    title: 'PA-003: Admin Approval for Viewer Access',
    decision: APPROVAL_DECISION.APPROVED,
    reason: 'Read-only access is safe for viewers',
    changeRequestId:
      MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS.APPLIED_READ_POLICY,
    approverId: SAMPLE_APPROVER_IDS.ADMIN,
    position: 3,
  },

  // Rejections for high-risk RBAC manage policy
  {
    id: MKT_POLICY_APPROVAL_DATA_SEEDS_IDS.HIGH_RISK_REJECTION_1,
    title: 'PA-004: Security Officer Rejection',
    decision: APPROVAL_DECISION.REJECTED,
    reason: 'Developers should not have access to RBAC policy management',
    changeRequestId:
      MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS.REJECTED_HIGH_RISK_POLICY,
    approverId: SAMPLE_APPROVER_IDS.SECURITY_OFFICER,
    position: 4,
  },
  {
    id: MKT_POLICY_APPROVAL_DATA_SEEDS_IDS.HIGH_RISK_REJECTION_2,
    title: 'PA-005: CTO Rejection',
    decision: APPROVAL_DECISION.REJECTED,
    reason: 'This would violate separation of duties principle',
    changeRequestId:
      MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS.REJECTED_HIGH_RISK_POLICY,
    approverId: SAMPLE_APPROVER_IDS.CTO,
    position: 5,
  },
];
