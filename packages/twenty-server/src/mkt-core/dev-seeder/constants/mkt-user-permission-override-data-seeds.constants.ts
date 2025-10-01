import { parseISO, formatISO, addDays, addMonths } from 'date-fns';

import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';
import { PERMISSION_RESOURCE_IDS } from 'src/mkt-core/mkt-permission-template/constants/permission-resources.constants';
import { PERMISSION_ACTION_IDS } from 'src/mkt-core/dev-seeder/constants/mkt-permission-action-data-seeds.constants';

/**
 * User Permission Override Data Seeds - Simplified RBAC System
 *
 * Override Priority: HIGHEST trong hệ thống permission check
 *
 * Mapping với scenarios trong rbac-user-permission-override-guide.md:
 * 1. Emergency Access - JANE cần UPDATE customer VIP khẩn cấp
 * 2. Business Exception - PHIL tăng export limit cho migration project
 * 3. Temporary Revocation - JONY bị thu hồi APPROVE trong điều tra
 * 4. System Maintenance - Block DELETE operations cho maintenance
 * 5. Compliance Requirement - PHIL bị thu hồi EXPORT PII trong GDPR audit
 * 6. Special Project - JANE được APPROVE cho special project
 * 7. Expired Override - TIM có override đã expired để test cleanup
 */

type MktUserPermissionOverrideDataSeed = {
  id: string;
  workspaceMemberId: string;
  resourceId: string;
  actionId: string;
  isAllowed: boolean; // true = GRANT, false = REVOKE
  contextFilter?: string; // JSON string for database storage
  expiresAt?: string; // ISO string for database storage
  reason: string; // OVERRIDE_REASON enum
  reasonDescription?: string;
  approvedById?: string;
  approvedAt?: string; // ISO string for database storage
  isActive: boolean;
  position: number; // For seeding order
};

export const MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_COLUMNS: (keyof MktUserPermissionOverrideDataSeed)[] =
  [
    'id',
    'workspaceMemberId',
    'resourceId',
    'actionId',
    'isAllowed',
    'contextFilter',
    'expiresAt',
    'reason',
    'reasonDescription',
    'approvedById',
    'approvedAt',
    'isActive',
    'position',
  ];

/**
 * Permission Override Assignment IDs (UUID v4)
 * Mỗi override có ID riêng để track lịch sử override
 */
export const MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS = {
  // Active overrides
  JANE_EMERGENCY_UPDATE_CUSTOMER: 'b1c2d3e4-f5a6-4000-9000-200000000001',
  PHIL_ENHANCED_EXPORT_CUSTOMERS: 'b1c2d3e4-f5a6-4000-9000-200000000002',
  JONY_REVOKE_APPROVE_ORDERS: 'b1c2d3e4-f5a6-4000-9000-200000000003',
  TIM_BLOCK_DELETE_CUSTOMERS: 'b1c2d3e4-f5a6-4000-9000-200000000004',
  PHIL_REVOKE_EXPORT_FINANCIAL: 'b1c2d3e4-f5a6-4000-9000-200000000005',
  JANE_GRANT_APPROVE_ORDERS: 'b1c2d3e4-f5a6-4000-9000-200000000006',

  // Expired/inactive overrides for testing
  TIM_EXPIRED_TEMP_ADMIN: 'b1c2d3e4-f5a6-4000-9000-200000000007',
  JONY_INACTIVE_EXPORT: 'b1c2d3e4-f5a6-4000-9000-200000000008',
};

/**
 * Base timestamp for relative date calculations
 */
const BASE_DATE = new Date('2024-10-01T00:00:00.000Z');

export const MKT_USER_PERMISSION_OVERRIDE_DATA_SEEDS: MktUserPermissionOverrideDataSeed[] =
  [
    // ============================================================================
    // Scenario 1: Emergency Access
    // JANE (STAFF) cần UPDATE customer VIP khẩn cấp ngoài giờ
    // ============================================================================
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.JANE_EMERGENCY_UPDATE_CUSTOMER,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      actionId: PERMISSION_ACTION_IDS.UPDATE,
      isAllowed: true, // ✅ GRANT permission

      // Context: Chỉ cho customer VIP cụ thể
      contextFilter: JSON.stringify({
        scope: 'SINGLE_RECORD',
        recordId: 'customer-vip-123',
        resourceType: 'CUSTOMERS',
        maxRecords: 1,
        validityReason: 'VIP customer emergency update request',
      }),

      // Hết hạn sau 24 giờ (emergency access)
      expiresAt: formatISO(addDays(BASE_DATE, 1)),

      reason: 'EMERGENCY_ACCESS',
      reasonDescription:
        'Khách hàng VIP yêu cầu update thông tin khẩn cấp ngoài giờ làm việc - Customer called at 10 PM requiring immediate data correction',

      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Admin approve qua phone
      approvedAt: formatISO(BASE_DATE),

      isActive: true,
      position: 1,
    },

    // ============================================================================
    // Scenario 2: Business Exception
    // PHIL (TEAM_LEAD) tăng export limit từ 5K lên 60K records/day cho migration
    // ============================================================================
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.PHIL_ENHANCED_EXPORT_CUSTOMERS,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      actionId: PERMISSION_ACTION_IDS.EXPORT,
      isAllowed: true, // ✅ GRANT enhanced permission

      // Context: Tăng limit lên 60,000 records/day
      contextFilter: JSON.stringify({
        maxRecordsPerDay: 60000,
        maxRecordsPerQuery: 10000,
        dataCategory: 'MIGRATION_PROJECT',
        projectCode: 'PROJ-2024-MIG-001',
        exportFormat: ['CSV', 'XLSX', 'JSON'],
        includeMetadata: true,
        auditLogging: 'MANDATORY',
      }),

      // Hết hạn sau 7 ngày (migration project duration)
      expiresAt: formatISO(addDays(BASE_DATE, 7)),

      reason: 'SPECIAL_PROJECT',
      reasonDescription:
        'Migration project - Export toàn bộ customer data sang hệ thống CRM mới. Project duration: 7 days. Enhanced limit: 60K records/day',

      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY, // Manager approve
      approvedAt: formatISO(parseISO('2024-09-30T08:00:00.000Z')),

      isActive: true,
      position: 2,
    },

    // ============================================================================
    // Scenario 3: Temporary Revocation
    // JONY (MANAGER) bị thu hồi quyền APPROVE orders trong điều tra
    // ============================================================================
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.JONY_REVOKE_APPROVE_ORDERS,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      actionId: PERMISSION_ACTION_IDS.APPROVE,
      isAllowed: false, // ❌ REVOKE permission

      // Context: Thu hồi toàn bộ quyền APPROVE orders
      contextFilter: JSON.stringify({
        scope: 'ALL_RECORDS',
        blockAllApprovals: true,
        escalateTo: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
        notifyOnAttempt: true,
        auditLevel: 'HIGH',
      }),

      // Hết hạn sau 30 ngày (investigation period)
      expiresAt: formatISO(addDays(BASE_DATE, 30)),

      reason: 'AUDIT_REQUIREMENT',
      reasonDescription:
        'Thu hồi quyền approve orders trong thời gian điều tra conflict of interest với nhà cung cấp. Investigation period: 30 days',

      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Admin/CEO approve
      approvedAt: formatISO(parseISO('2024-09-29T09:00:00.000Z')),

      isActive: true,
      position: 3,
    },

    // ============================================================================
    // Scenario 4: System Maintenance
    // TIM (ADMIN) bị block DELETE customers trong maintenance window
    // ============================================================================
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.TIM_BLOCK_DELETE_CUSTOMERS,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      actionId: PERMISSION_ACTION_IDS.DELETE,
      isAllowed: false, // ❌ REVOKE permission

      // Context: Block DELETE trong maintenance window
      contextFilter: JSON.stringify({
        timeWindow: {
          startTime: '2024-10-01T12:00:00Z',
          endTime: '2024-10-01T14:00:00Z',
          timezone: 'UTC',
        },
        blockReason: 'DATABASE_MIGRATION',
        maintenanceType: 'CRITICAL',
        affectedOperations: ['DELETE', 'BULK_DELETE', 'ARCHIVE'],
      }),

      // Hết hạn sau 1 ngày (maintenance completion)
      expiresAt: formatISO(addDays(BASE_DATE, 1)),

      reason: 'SYSTEM_MAINTENANCE',
      reasonDescription:
        'Database migration - Block all DELETE operations during 2-hour maintenance window (12:00-14:00 UTC)',

      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Self-approved for system maintenance
      approvedAt: formatISO(parseISO('2024-09-30T10:00:00.000Z')),

      isActive: true,
      position: 4,
    },

    // ============================================================================
    // Scenario 5: Compliance Requirement
    // PHIL (TEAM_LEAD) bị thu hồi EXPORT financial data trong GDPR audit
    // ============================================================================
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.PHIL_REVOKE_EXPORT_FINANCIAL,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
      resourceId: PERMISSION_RESOURCE_IDS.FINANCIAL_DATA,
      actionId: PERMISSION_ACTION_IDS.EXPORT,
      isAllowed: false, // ❌ REVOKE permission

      // Context: Chỉ block EXPORT của PII/Financial fields
      contextFilter: JSON.stringify({
        dataClassification: ['PII_PROTECTED', 'FINANCIAL_SENSITIVE'],
        fieldRestrictions: [
          'salary',
          'commission',
          'bankAccount',
          'creditCard',
          'taxId',
          'ssn',
        ],
        complianceFramework: 'GDPR',
        auditPeriod: '2024-Q4',
        alternativeAccess: 'REQUEST_DPO_APPROVAL',
      }),

      // Hết hạn sau 90 ngày (GDPR audit completion)
      expiresAt: formatISO(addMonths(BASE_DATE, 3)),

      reason: 'COMPLIANCE_REQUIREMENT',
      reasonDescription:
        'GDPR Audit Q4 2024 - Restrict export of PII and financial sensitive data. Only DPO can approve exceptions. Audit duration: 90 days',

      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Compliance officer/Admin approve
      approvedAt: formatISO(parseISO('2024-09-28T08:00:00.000Z')),

      isActive: true,
      position: 5,
    },

    // ============================================================================
    // Scenario 6: Special Project
    // JANE (STAFF) được cấp quyền APPROVE orders cho special project
    // ============================================================================
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.JANE_GRANT_APPROVE_ORDERS,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      actionId: PERMISSION_ACTION_IDS.APPROVE,
      isAllowed: true, // ✅ GRANT permission

      // Context: Chỉ approve orders của special project, max 10M VND
      contextFilter: JSON.stringify({
        projectCode: 'PROJ-2024-SPECIAL-001',
        maxAmount: 10000000, // 10M VND
        currency: 'VND',
        orderStatus: ['PENDING_APPROVAL', 'REVIEW'],
        requiresSecondApproval: true,
        secondApprover: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
        notifyOnApproval: true,
        auditLevel: 'MEDIUM',
      }),

      // Hết hạn sau 14 ngày (project duration)
      expiresAt: formatISO(addDays(BASE_DATE, 14)),

      reason: 'SPECIAL_PROJECT',
      reasonDescription:
        'Special project assignment - JANE được approve orders up to 10M VND cho dự án đặc biệt. Requires second approval from PHIL. Duration: 14 days',

      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL, // Team lead approve
      approvedAt: formatISO(parseISO('2024-09-30T16:00:00.000Z')),

      isActive: true,
      position: 6,
    },

    // ============================================================================
    // EXPIRED OVERRIDES - For testing cleanup and audit trail
    // ============================================================================

    /**
     * Scenario 7: Expired Temporary Admin
     * TIM có temporary admin access đã hết hạn
     */
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.TIM_EXPIRED_TEMP_ADMIN,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      resourceId: PERMISSION_RESOURCE_IDS.SETTINGS,
      actionId: PERMISSION_ACTION_IDS.UPDATE,
      isAllowed: true, // ✅ GRANT (but expired)

      contextFilter: JSON.stringify({
        settingsScope: ['SYSTEM_CONFIG', 'ADVANCED_SETTINGS'],
        reason: 'Emergency system configuration',
      }),

      // Đã hết hạn 7 ngày trước
      expiresAt: formatISO(parseISO('2024-09-24T23:59:59.000Z')),

      reason: 'TEMPORARY_ESCALATION',
      reasonDescription:
        'Temporary escalation for emergency system configuration - EXPIRED',

      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      approvedAt: formatISO(parseISO('2024-09-15T08:00:00.000Z')),

      isActive: true, // Still active in DB but expired by date
      position: 7,
    },

    /**
     * Scenario 8: Inactive Override
     * JONY có override không active (đã bị revoke manually)
     */
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.JONY_INACTIVE_EXPORT,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      actionId: PERMISSION_ACTION_IDS.EXPORT,
      isAllowed: true, // ✅ GRANT (but inactive)

      contextFilter: JSON.stringify({
        maxRecordsPerDay: 20000,
        exportFormat: ['CSV'],
      }),

      // Chưa hết hạn nhưng đã bị deactivate
      expiresAt: formatISO(addDays(BASE_DATE, 30)),

      reason: 'BUSINESS_EXCEPTION',
      reasonDescription:
        'Export enhancement for Q3 reporting - MANUALLY REVOKED after project completion',

      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      approvedAt: formatISO(parseISO('2024-09-01T08:00:00.000Z')),

      isActive: false, // Manually deactivated
      position: 8,
    },
  ];
