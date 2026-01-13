import { DateTime } from 'luxon';

import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';
import {
  PermissionAction,
  PermissionSource,
  CheckResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';

type MktPermissionAuditMetadata = {
  validationMode?: string;
  schemaVersion?: number;
  customFields?: Record<string, unknown>;
  [key: string]: unknown;
};

type MktPermissionAuditDataSeed = {
  id: string;
  workspaceMemberId: string;
  userId?: string | null;
  action: PermissionAction;
  objectName: string;
  recordId?: string | null;
  permissionSource?: PermissionSource | null;
  checkResult: CheckResult;
  denialReason?: string | null;
  requestContext?: object | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  checkDurationMs?: number | null;
  // Phase 2 fields
  stepResults?: object | null;
  cacheHit?: boolean;
  executionPath?: string | null;
  requestId?: string | null;
  metadata?: MktPermissionAuditMetadata | null;
  position: number;
  createdAt: string;
};

export const MKT_PERMISSION_AUDIT_DATA_SEED_COLUMNS: (keyof MktPermissionAuditDataSeed)[] =
  [
    'id',
    'workspaceMemberId',
    'userId',
    'action',
    'objectName',
    'recordId',
    'permissionSource',
    'checkResult',
    'denialReason',
    'requestContext',
    'ipAddress',
    'userAgent',
    'checkDurationMs',
    // Phase 2 fields
    'stepResults',
    'cacheHit',
    'executionPath',
    'requestId',
    'metadata',
    'position',
    'createdAt',
  ];

export const MKT_PERMISSION_AUDIT_DATA_SEED_IDS = {
  SALES_READ_CUSTOMER_GRANTED: 'f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0c',
  SUPPORT_READ_TICKET_GRANTED: 'a6b7c8d9-e0f1-2a3b-4c5d-6e7f8a9b0c1d',
  ADMIN_DELETE_USER_DENIED: 'b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e',
  TEMP_PERMISSION_READ_KPI: 'c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f',
  DEPT_POLICY_EXPORT_DATA: 'd9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a',
  UNAUTHORIZED_DELETE_ATTEMPT: 'e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b',
  ROLE_BASED_CREATE_ORDER: 'f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  HIGH_VOLUME_READ_ACCESS: 'a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d',
  AUDIT_TRAIL_COMPLIANCE: 'b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e',
  PERFORMANCE_SLOW_CHECK: 'c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f',
};

export const MKT_PERMISSION_AUDIT_OBJECT_NAMES = {
  MKT_CUSTOMER: 'mktCustomer',
  MKT_ORDER: 'mktOrder',
  MKT_INVOICE: 'mktInvoice',
  MKT_KPI: 'mktKpi',
  MKT_PRODUCT: 'mktProduct',
  WORKSPACE_MEMBER: 'workspaceMember',
  MKT_CONTRACT: 'mktContract',
  MKT_LICENSE: 'mktLicense',
};

export const MKT_PERMISSION_AUDIT_DATA_SEEDS: MktPermissionAuditDataSeed[] = [
  // Sales member successfully reading assigned customer
  {
    id: MKT_PERMISSION_AUDIT_DATA_SEED_IDS.SALES_READ_CUSTOMER_GRANTED,
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY, // Sales Manager
    userId: 'user-sales-001',
    action: PermissionAction.READ,
    objectName: MKT_PERMISSION_AUDIT_OBJECT_NAMES.MKT_CUSTOMER,
    recordId: 'customer-001',
    permissionSource: PermissionSource.ROLE,
    checkResult: CheckResult.PASS,
    denialReason: null,
    requestContext: {
      endpoint: '/api/customers/customer-001',
      method: 'GET',
      sessionId: 'sess-12345',
    },
    ipAddress: '192.168.1.100',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
    checkDurationMs: 15,
    // Phase 2 fields
    stepResults: {
      preValidation: { status: 'PASS', durationMs: 2 },
      userContextResolution: { status: 'PASS', durationMs: 5 },
      resourceIdentification: { status: 'PASS', durationMs: 3 },
      permissionTemplateCheck: { status: 'PASS', durationMs: 4 },
      actionPermissionValidation: { status: 'PASS', durationMs: 1 },
    },
    cacheHit: true,
    executionPath:
      'PRE_VALIDATION -> USER_CONTEXT -> RESOURCE_ID -> TEMPLATE_CHECK -> ACTION_VALIDATION',
    requestId: 'req-67890',
    metadata: {
      validationMode: 'SIMPLIFIED',
      schemaVersion: 1,
      customFields: {
        source: 'GraphQL',
        clientVersion: '2.0.0',
      },
    },
    position: 1,
    createdAt: DateTime.now().minus({ hours: 2 }).toISO(),
  },

  // Support member accessing ticket data
  {
    id: MKT_PERMISSION_AUDIT_DATA_SEED_IDS.SUPPORT_READ_TICKET_GRANTED,
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY, // Support member
    userId: 'user-support-001',
    action: PermissionAction.READ,
    objectName: MKT_PERMISSION_AUDIT_OBJECT_NAMES.MKT_CUSTOMER,
    recordId: 'customer-002',
    permissionSource: PermissionSource.DEPARTMENT_POLICY,
    checkResult: CheckResult.PASS,
    denialReason: null,
    requestContext: {
      endpoint: '/api/customers/customer-002/support-tickets',
      method: 'GET',
      supportCase: 'CASE-2024-001',
      priority: 'high',
    },
    ipAddress: '192.168.1.101',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36',
    checkDurationMs: 23,
    stepResults: null,
    cacheHit: false,
    executionPath: null,
    requestId: 'req-support-001',
    metadata: {
      validationMode: 'SIMPLIFIED',
      schemaVersion: 1,
    },
    position: 2,
    createdAt: DateTime.now().minus({ hours: 1, minutes: 30 }).toISO(),
  },

  // Admin attempting to delete user - denied due to insufficient permissions
  {
    id: MKT_PERMISSION_AUDIT_DATA_SEED_IDS.ADMIN_DELETE_USER_DENIED,
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL, // Admin member
    userId: 'user-admin-001',
    action: PermissionAction.DELETE,
    objectName: MKT_PERMISSION_AUDIT_OBJECT_NAMES.WORKSPACE_MEMBER,
    recordId: 'member-003',
    permissionSource: PermissionSource.ROLE,
    checkResult: CheckResult.FAIL,
    denialReason: 'Delete permission requires Super Admin role',
    requestContext: {
      endpoint: '/api/workspace-members/member-003',
      method: 'DELETE',
      attemptedAction: 'permanent_delete',
      adminLevel: 'standard',
    },
    ipAddress: '192.168.1.102',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edge/120.0.0.0',
    checkDurationMs: 8,
    stepResults: {
      preValidation: { status: 'PASS', durationMs: 1 },
      userContextResolution: { status: 'PASS', durationMs: 2 },
      resourceIdentification: { status: 'PASS', durationMs: 1 },
      permissionTemplateCheck: {
        status: 'FAIL',
        durationMs: 3,
        reason: 'Missing Super Admin role',
      },
      actionPermissionValidation: { status: 'SKIP', durationMs: 0 },
    },
    cacheHit: false,
    executionPath:
      'PRE_VALIDATION -> USER_CONTEXT -> RESOURCE_ID -> TEMPLATE_CHECK (DENIED)',
    requestId: 'req-admin-del-001',
    metadata: {
      validationMode: 'SIMPLIFIED',
      schemaVersion: 1,
      customFields: {
        securityAlert: true,
        alertLevel: 'medium',
      },
    },
    position: 3,
    createdAt: DateTime.now().minus({ hours: 1, minutes: 15 }).toISO(),
  },

  // Temporary permission being used to read KPI data
  {
    id: MKT_PERMISSION_AUDIT_DATA_SEED_IDS.TEMP_PERMISSION_READ_KPI,
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Tech member
    userId: 'user-tech-001',
    action: PermissionAction.READ,
    objectName: MKT_PERMISSION_AUDIT_OBJECT_NAMES.MKT_KPI,
    recordId: 'kpi-quarterly-001',
    permissionSource: PermissionSource.TEMPORARY_ELEVATION,
    checkResult: CheckResult.PASS,
    denialReason: null,
    requestContext: {
      endpoint: '/api/kpi/kpi-quarterly-001',
      method: 'GET',
      temporaryPermissionId: 'temp-perm-001',
      expiresAt: DateTime.now().plus({ hours: 24 }).toISO(),
      grantedBy: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
    },
    ipAddress: '192.168.1.103',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0',
    checkDurationMs: 42,
    stepResults: {
      preValidation: { status: 'PASS', durationMs: 3 },
      userContextResolution: { status: 'PASS', durationMs: 8 },
      resourceIdentification: { status: 'PASS', durationMs: 5 },
      temporaryPermissionCheck: {
        status: 'PASS',
        durationMs: 20,
        tempPermId: 'temp-perm-001',
      },
      actionPermissionValidation: { status: 'PASS', durationMs: 6 },
    },
    cacheHit: false,
    executionPath:
      'PRE_VALIDATION -> USER_CONTEXT -> RESOURCE_ID -> TEMP_PERMISSION_CHECK -> ACTION_VALIDATION',
    requestId: 'req-temp-kpi-001',
    metadata: {
      validationMode: 'SIMPLIFIED',
      schemaVersion: 1,
      customFields: {
        temporaryAccess: true,
        grantReason: 'Quarterly review preparation',
      },
    },
    position: 4,
    createdAt: DateTime.now().minus({ hours: 1 }).toISO(),
  },

  // Department policy allowing data export
  {
    id: MKT_PERMISSION_AUDIT_DATA_SEED_IDS.DEPT_POLICY_EXPORT_DATA,
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY, // Sales Manager
    userId: 'user-sales-001',
    action: PermissionAction.EXPORT,
    objectName: MKT_PERMISSION_AUDIT_OBJECT_NAMES.MKT_ORDER,
    recordId: null, // Bulk export
    permissionSource: PermissionSource.PERMISSION_TEMPLATE,
    checkResult: CheckResult.PASS,
    denialReason: null,
    requestContext: {
      endpoint: '/api/orders/export',
      method: 'POST',
      exportFormat: 'csv',
      recordCount: 1250,
      dateRange: {
        from: '2024-01-01',
        to: '2024-03-31',
      },
      policyId: 'policy-sales-export',
    },
    ipAddress: '192.168.1.100',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
    checkDurationMs: 156,
    stepResults: {
      preValidation: { status: 'PASS', durationMs: 5 },
      userContextResolution: { status: 'PASS', durationMs: 12 },
      resourceIdentification: { status: 'PASS', durationMs: 8 },
      permissionTemplateCheck: { status: 'PASS', durationMs: 45 },
      dataAccessPolicyCheck: {
        status: 'PASS',
        durationMs: 50,
        policyId: 'policy-sales-export',
      },
      actionPermissionValidation: { status: 'PASS', durationMs: 36 },
    },
    cacheHit: true,
    executionPath:
      'PRE_VALIDATION -> USER_CONTEXT -> RESOURCE_ID -> TEMPLATE_CHECK -> DATA_ACCESS_POLICY -> ACTION_VALIDATION',
    requestId: 'req-export-001',
    metadata: {
      validationMode: 'SIMPLIFIED',
      schemaVersion: 1,
      customFields: {
        exportType: 'bulk',
        recordCount: 1250,
        dataClassification: 'internal',
      },
    },
    position: 5,
    createdAt: DateTime.now().minus({ minutes: 45 }).toISO(),
  },

  // Unauthorized delete attempt from outside network
  {
    id: MKT_PERMISSION_AUDIT_DATA_SEED_IDS.UNAUTHORIZED_DELETE_ATTEMPT,
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE, // Support member
    userId: 'user-support-001',
    action: PermissionAction.DELETE,
    objectName: MKT_PERMISSION_AUDIT_OBJECT_NAMES.MKT_CONTRACT,
    recordId: 'contract-important-001',
    permissionSource: PermissionSource.ROLE,
    checkResult: CheckResult.FAIL,
    denialReason:
      'Delete action not permitted for Support role on Contract objects',
    requestContext: {
      endpoint: '/api/contracts/contract-important-001',
      method: 'DELETE',
      suspiciousActivity: true,
      riskScore: 8.5,
      ipReputationCheck: 'failed',
    },
    ipAddress: '203.0.113.45', // External IP
    userAgent: 'curl/7.81.0',
    checkDurationMs: 5,
    stepResults: {
      preValidation: { status: 'PASS', durationMs: 1 },
      userContextResolution: { status: 'PASS', durationMs: 1 },
      resourceIdentification: { status: 'PASS', durationMs: 1 },
      roleCheck: {
        status: 'FAIL',
        durationMs: 2,
        reason: 'Support role cannot delete Contract',
      },
      actionPermissionValidation: { status: 'SKIP', durationMs: 0 },
    },
    cacheHit: true,
    executionPath:
      'PRE_VALIDATION -> USER_CONTEXT -> RESOURCE_ID -> ROLE_CHECK (DENIED)',
    requestId: 'req-unauth-del-001',
    metadata: {
      validationMode: 'SIMPLIFIED',
      schemaVersion: 1,
      customFields: {
        securityIncident: true,
        riskScore: 8.5,
        externalIp: true,
        alertGenerated: true,
      },
    },
    position: 6,
    createdAt: DateTime.now().minus({ minutes: 30 }).toISO(),
  },

  // Role-based order creation
  {
    id: MKT_PERMISSION_AUDIT_DATA_SEED_IDS.ROLE_BASED_CREATE_ORDER,
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY, // Sales Manager
    userId: 'user-sales-001',
    action: PermissionAction.CREATE,
    objectName: MKT_PERMISSION_AUDIT_OBJECT_NAMES.MKT_ORDER,
    recordId: null, // Not yet created
    permissionSource: PermissionSource.ROLE,
    checkResult: CheckResult.PASS,
    denialReason: null,
    requestContext: {
      endpoint: '/api/orders',
      method: 'POST',
      orderValue: 45000,
      customerId: 'customer-vip-001',
      salesQuote: 'SQ-2024-001',
    },
    ipAddress: '192.168.1.100',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
    checkDurationMs: 28,
    stepResults: {
      preValidation: { status: 'PASS', durationMs: 3 },
      userContextResolution: { status: 'PASS', durationMs: 6 },
      resourceIdentification: { status: 'PASS', durationMs: 4 },
      roleCheck: { status: 'PASS', durationMs: 8, role: 'Sales Manager' },
      actionPermissionValidation: { status: 'PASS', durationMs: 7 },
    },
    cacheHit: true,
    executionPath:
      'PRE_VALIDATION -> USER_CONTEXT -> RESOURCE_ID -> ROLE_CHECK -> ACTION_VALIDATION',
    requestId: 'req-create-order-001',
    metadata: {
      validationMode: 'SIMPLIFIED',
      schemaVersion: 1,
      customFields: {
        orderValue: 45000,
        vipCustomer: true,
      },
    },
    position: 7,
    createdAt: DateTime.now().minus({ minutes: 15 }).toISO(),
  },

  // High volume read access showing good performance
  {
    id: MKT_PERMISSION_AUDIT_DATA_SEED_IDS.HIGH_VOLUME_READ_ACCESS,
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Tech member
    userId: 'user-tech-001',
    action: PermissionAction.READ,
    objectName: MKT_PERMISSION_AUDIT_OBJECT_NAMES.MKT_PRODUCT,
    recordId: null, // List view
    permissionSource: PermissionSource.ROLE,
    checkResult: CheckResult.PASS,
    denialReason: null,
    requestContext: {
      endpoint: '/api/products',
      method: 'GET',
      pagination: {
        limit: 100,
        offset: 0,
      },
      filters: {
        category: 'software',
        status: 'active',
      },
      totalRecords: 2847,
    },
    ipAddress: '192.168.1.103',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0',
    checkDurationMs: 12,
    stepResults: {
      preValidation: { status: 'PASS', durationMs: 2 },
      userContextResolution: { status: 'PASS', durationMs: 3 },
      resourceIdentification: { status: 'PASS', durationMs: 2 },
      roleCheck: { status: 'PASS', durationMs: 3 },
      actionPermissionValidation: { status: 'PASS', durationMs: 2 },
    },
    cacheHit: true,
    executionPath:
      'PRE_VALIDATION -> USER_CONTEXT -> RESOURCE_ID -> ROLE_CHECK -> ACTION_VALIDATION',
    requestId: 'req-high-vol-001',
    metadata: {
      validationMode: 'SIMPLIFIED',
      schemaVersion: 1,
      customFields: {
        listQuery: true,
        totalRecords: 2847,
        performanceOptimized: true,
      },
    },
    position: 8,
    createdAt: DateTime.now().minus({ minutes: 10 }).toISO(),
  },

  // Audit trail compliance check
  {
    id: MKT_PERMISSION_AUDIT_DATA_SEED_IDS.AUDIT_TRAIL_COMPLIANCE,
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL, // Admin member
    userId: 'user-admin-001',
    action: PermissionAction.READ,
    objectName: MKT_PERMISSION_AUDIT_OBJECT_NAMES.MKT_INVOICE,
    recordId: 'invoice-audit-001',
    permissionSource: PermissionSource.SPECIAL_OVERRIDE,
    checkResult: CheckResult.PASS,
    denialReason: null,
    requestContext: {
      endpoint: '/api/invoices/invoice-audit-001/audit-trail',
      method: 'GET',
      auditPurpose: 'compliance_review',
      reviewerId: 'auditor-ext-001',
      caseNumber: 'AUDIT-2024-Q1-001',
    },
    ipAddress: '192.168.1.102',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edge/120.0.0.0',
    checkDurationMs: 89,
    stepResults: {
      preValidation: { status: 'PASS', durationMs: 5 },
      userContextResolution: { status: 'PASS', durationMs: 10 },
      resourceIdentification: { status: 'PASS', durationMs: 8 },
      specialOverrideCheck: {
        status: 'PASS',
        durationMs: 35,
        overrideType: 'audit_compliance',
      },
      auditTrailValidation: { status: 'PASS', durationMs: 25 },
      actionPermissionValidation: { status: 'PASS', durationMs: 6 },
    },
    cacheHit: false,
    executionPath:
      'PRE_VALIDATION -> USER_CONTEXT -> RESOURCE_ID -> SPECIAL_OVERRIDE -> AUDIT_TRAIL -> ACTION_VALIDATION',
    requestId: 'req-audit-comp-001',
    metadata: {
      validationMode: 'SIMPLIFIED',
      schemaVersion: 1,
      customFields: {
        complianceReview: true,
        caseNumber: 'AUDIT-2024-Q1-001',
        externalAuditor: true,
      },
    },
    position: 9,
    createdAt: DateTime.now().minus({ minutes: 5 }).toISO(),
  },

  // Performance monitoring: slow permission check
  {
    id: MKT_PERMISSION_AUDIT_DATA_SEED_IDS.PERFORMANCE_SLOW_CHECK,
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL, // Support member
    userId: 'user-support-001',
    action: PermissionAction.UPDATE,
    objectName: MKT_PERMISSION_AUDIT_OBJECT_NAMES.MKT_LICENSE,
    recordId: 'license-complex-001',
    permissionSource: PermissionSource.PERMISSION_TEMPLATE,
    checkResult: CheckResult.PASS,
    denialReason: null,
    requestContext: {
      endpoint: '/api/licenses/license-complex-001',
      method: 'PATCH',
      complexPolicyEvaluation: true,
      hierarchyLevels: 4,
      policyRulesEvaluated: 12,
      temporaryPermissionsChecked: 3,
    },
    ipAddress: '192.168.1.101',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36',
    checkDurationMs: 347, // Slow performance flagged
    stepResults: {
      preValidation: { status: 'PASS', durationMs: 15 },
      userContextResolution: { status: 'PASS', durationMs: 45 },
      resourceIdentification: { status: 'PASS', durationMs: 28 },
      hierarchyResolution: { status: 'PASS', durationMs: 85, levels: 4 },
      policyRulesEvaluation: {
        status: 'PASS',
        durationMs: 120,
        rulesEvaluated: 12,
      },
      temporaryPermissionCheck: {
        status: 'PASS',
        durationMs: 35,
        permissionsChecked: 3,
      },
      actionPermissionValidation: { status: 'PASS', durationMs: 19 },
    },
    cacheHit: false,
    executionPath:
      'PRE_VALIDATION -> USER_CONTEXT -> RESOURCE_ID -> HIERARCHY -> POLICY_RULES -> TEMP_PERMISSION -> ACTION_VALIDATION',
    requestId: 'req-slow-perf-001',
    metadata: {
      validationMode: 'SIMPLIFIED',
      schemaVersion: 1,
      customFields: {
        performanceWarning: true,
        complexEvaluation: true,
        hierarchyDepth: 4,
        policyRulesCount: 12,
        slowThresholdMs: 200,
      },
    },
    position: 10,
    createdAt: DateTime.now().minus({ minutes: 2 }).toISO(),
  },
];
