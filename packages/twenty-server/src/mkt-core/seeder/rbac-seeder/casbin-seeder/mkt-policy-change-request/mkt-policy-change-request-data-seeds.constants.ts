/**
 * Policy Change Request Seed Data Constants
 *
 * Contains seed data for MktPolicyChangeRequestWorkspaceEntity
 * Tracks high-risk policy change requests that require approval workflow.
 */

import {
  POLICY_CHANGE_REQUEST_STATUS,
  POLICY_CHANGE_TYPE,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-change-request.workspace-entity';

type MktPolicyChangeRequestDataSeed = {
  id: string;
  title: string;
  status: string;
  changeType: string;
  policyData: object;
  riskAssessment: object;
  requiredApprovals: number;
  currentApprovals: number;
  requestReason: string | null;
  requestedById: string;
  position: number | null;
};

export const MKT_POLICY_CHANGE_REQUEST_DATA_SEED_COLUMNS: (keyof MktPolicyChangeRequestDataSeed)[] =
  [
    'id',
    'title',
    'status',
    'changeType',
    'policyData',
    'riskAssessment',
    'requiredApprovals',
    'currentApprovals',
    'requestReason',
    'requestedById',
    'position',
  ];

export const MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS = {
  // Pending requests
  PENDING_WILDCARD_POLICY: '33333333-0001-4000-8000-000000000001',
  PENDING_ADMIN_ROLE_GRANT: '33333333-0001-4000-8000-000000000002',
  // Approved requests
  APPROVED_DEPARTMENT_POLICY: '33333333-0002-4000-8000-000000000001',
  // Applied requests
  APPLIED_READ_POLICY: '33333333-0003-4000-8000-000000000001',
  // Rejected requests
  REJECTED_HIGH_RISK_POLICY: '33333333-0004-4000-8000-000000000001',
};

// Sample workspace member IDs for demo
const SAMPLE_USER_IDS = {
  ADMIN: '00000000-0000-4000-8000-000000000001',
  MANAGER: '00000000-0000-4000-8000-000000000002',
  SALES_REP: '00000000-0000-4000-8000-000000000003',
};

export const MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS: MktPolicyChangeRequestDataSeed[] =
  [
    // Pending: Wildcard policy (high risk - requires dual approval)
    {
      id: MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS.PENDING_WILDCARD_POLICY,
      title: 'PCR-001: Super Admin Wildcard Access',
      status: POLICY_CHANGE_REQUEST_STATUS.PENDING,
      changeType: POLICY_CHANGE_TYPE.CREATE,
      policyData: {
        ptype: 'p',
        subject: 'role:super_admin',
        object: '*',
        action: '*',
        effect: 'allow',
      },
      riskAssessment: {
        isHighRisk: true,
        reasons: ['WILDCARD_ACTION', 'WILDCARD_RESOURCE'],
        riskScore: 10,
      },
      requiredApprovals: 2,
      currentApprovals: 0,
      requestReason: 'Need super admin access for system maintenance',
      requestedById: SAMPLE_USER_IDS.MANAGER,
      position: 1,
    },

    // Pending: Admin role grant (high risk)
    {
      id: MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS.PENDING_ADMIN_ROLE_GRANT,
      title: 'PCR-002: Admin Role Grant for New User',
      status: POLICY_CHANGE_REQUEST_STATUS.PENDING,
      changeType: POLICY_CHANGE_TYPE.CREATE,
      policyData: {
        ptype: 'g',
        subject: 'user:new-admin-001',
        object: 'role:admin',
      },
      riskAssessment: {
        isHighRisk: true,
        reasons: ['ADMIN_ROLE', 'ROLE_GRANT'],
        riskScore: 8,
      },
      requiredApprovals: 2,
      currentApprovals: 1,
      requestReason: 'Promote John to admin role',
      requestedById: SAMPLE_USER_IDS.ADMIN,
      position: 2,
    },

    // Approved: Department-specific policy
    {
      id: MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS.APPROVED_DEPARTMENT_POLICY,
      title: 'PCR-003: Sales Manager Customer Access',
      status: POLICY_CHANGE_REQUEST_STATUS.APPROVED,
      changeType: POLICY_CHANGE_TYPE.CREATE,
      policyData: {
        ptype: 'p',
        subject: 'role:sales_manager',
        object: 'mktCustomer',
        action: 'manage',
        effect: 'allow',
        condition: 'r.attr.departmentId == u.attr.departmentId',
      },
      riskAssessment: {
        isHighRisk: false,
        reasons: [],
        riskScore: 3,
      },
      requiredApprovals: 1,
      currentApprovals: 1,
      requestReason:
        'Sales managers need customer management within their department',
      requestedById: SAMPLE_USER_IDS.MANAGER,
      position: 3,
    },

    // Applied: Read-only policy
    {
      id: MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS.APPLIED_READ_POLICY,
      title: 'PCR-004: Viewer Read Order Access',
      status: POLICY_CHANGE_REQUEST_STATUS.APPLIED,
      changeType: POLICY_CHANGE_TYPE.CREATE,
      policyData: {
        ptype: 'p',
        subject: 'role:viewer',
        object: 'mktOrder',
        action: 'read',
        effect: 'allow',
      },
      riskAssessment: {
        isHighRisk: false,
        reasons: [],
        riskScore: 1,
      },
      requiredApprovals: 1,
      currentApprovals: 1,
      requestReason: 'Viewers should be able to see orders',
      requestedById: SAMPLE_USER_IDS.SALES_REP,
      position: 4,
    },

    // Rejected: High-risk RBAC manage policy
    {
      id: MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS_IDS.REJECTED_HIGH_RISK_POLICY,
      title: 'PCR-005: Developer RBAC Policy Management',
      status: POLICY_CHANGE_REQUEST_STATUS.REJECTED,
      changeType: POLICY_CHANGE_TYPE.CREATE,
      policyData: {
        ptype: 'p',
        subject: 'role:developer',
        object: 'rbacPolicy',
        action: '*',
        effect: 'allow',
      },
      riskAssessment: {
        isHighRisk: true,
        reasons: ['RBAC_MANAGE', 'WILDCARD_ACTION'],
        riskScore: 9,
      },
      requiredApprovals: 2,
      currentApprovals: 0,
      requestReason: 'Developers need to manage RBAC policies',
      requestedById: SAMPLE_USER_IDS.SALES_REP,
      position: 5,
    },
  ];
