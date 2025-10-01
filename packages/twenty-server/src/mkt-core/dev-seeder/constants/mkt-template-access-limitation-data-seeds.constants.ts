import {
  ACCESS_LIMITATION_TYPE,
  LIMITATION_SEVERITY,
} from 'src/mkt-core/mkt-permission-template/constants/permission-template-options.constants';

import { MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS } from './mkt-permission-template-data-seeds.constants';

/**
 * Template Access Limitation Data Seeds - Simplified RBAC System (5 roles)
 * Based on RBAC_SIMPLIFIED_SETUP_GUIDE.md and rbac-template-access-limitation-guide.md
 *
 * Limitation hierarchy by role:
 * - ADMIN: Minimal limitations (compliance only)
 * - MANAGER: Moderate limitations (department-scoped, extended hours)
 * - TEAM_LEAD: Standard limitations (team-scoped, business hours)
 * - STAFF: Strict limitations (own records, limited operations)
 * - INTERN: Maximum limitations (training mode, supervised)
 */

// Template Access Limitation IDs (UUID v4) - pre-generated for consistency
export const MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS = {
  // ADMIN limitations (compliance only)
  ADMIN_AUDIT_LOGGING: 'f1e2d3c4-b5a6-4001-9001-100000000001',
  ADMIN_SECURITY_MONITORING: 'f1e2d3c4-b5a6-4001-9001-100000000002',
  ADMIN_HIGH_RISK_OPS: 'f1e2d3c4-b5a6-4001-9001-100000000003',

  // MANAGER limitations (moderate)
  MANAGER_WORKING_HOURS: 'f1e2d3c4-b5a6-4001-9002-200000000004',
  MANAGER_SESSION_TIMEOUT: 'f1e2d3c4-b5a6-4001-9002-200000000005',
  MANAGER_DATA_LIMITS: 'f1e2d3c4-b5a6-4001-9002-200000000006',
  MANAGER_BULK_OPS: 'f1e2d3c4-b5a6-4001-9002-200000000007',
  MANAGER_EXPORT_LIMITS: 'f1e2d3c4-b5a6-4001-9002-200000000008',

  // TEAM_LEAD limitations (standard)
  TEAM_LEAD_WORKING_HOURS: 'f1e2d3c4-b5a6-4001-9003-300000000009',
  TEAM_LEAD_SESSION_TIMEOUT: 'f1e2d3c4-b5a6-4001-9003-300000000010',
  TEAM_LEAD_DATA_LIMITS: 'f1e2d3c4-b5a6-4001-9003-300000000011',
  TEAM_LEAD_CONCURRENT_SESSIONS: 'f1e2d3c4-b5a6-4001-9003-300000000012',
  TEAM_LEAD_OPERATION_LIMITS: 'f1e2d3c4-b5a6-4001-9003-300000000013',

  // STAFF limitations (strict)
  STAFF_WORKING_HOURS: 'f1e2d3c4-b5a6-4001-9004-400000000014',
  STAFF_SESSION_TIMEOUT: 'f1e2d3c4-b5a6-4001-9004-400000000015',
  STAFF_DATA_LIMITS: 'f1e2d3c4-b5a6-4001-9004-400000000016',
  STAFF_OPERATION_LIMITS: 'f1e2d3c4-b5a6-4001-9004-400000000017',
  STAFF_API_RATE_LIMIT: 'f1e2d3c4-b5a6-4001-9004-400000000018',
  STAFF_FEATURE_LIMITS: 'f1e2d3c4-b5a6-4001-9004-400000000019',

  // INTERN limitations (maximum restrictions)
  INTERN_WORKING_HOURS: 'f1e2d3c4-b5a6-4001-9005-500000000020',
  INTERN_SESSION_TIMEOUT: 'f1e2d3c4-b5a6-4001-9005-500000000021',
  INTERN_DATA_LIMITS: 'f1e2d3c4-b5a6-4001-9005-500000000022',
  INTERN_OPERATION_LIMITS: 'f1e2d3c4-b5a6-4001-9005-500000000023',
  INTERN_SUPERVISION: 'f1e2d3c4-b5a6-4001-9005-500000000024',
  INTERN_TRAINING_MODE: 'f1e2d3c4-b5a6-4001-9005-500000000025',
  INTERN_APPROVAL_REQUIRED: 'f1e2d3c4-b5a6-4001-9005-500000000026',
};

type MktTemplateAccessLimitationDataSeed = {
  id: string;
  templateId: string;
  limitationType: string;
  limitationKey: string;
  limitationValue: string; // JSON string for database storage
  isEnforced: boolean;
  severity: string;
  isActive: boolean;
};

export const MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_COLUMNS: (keyof MktTemplateAccessLimitationDataSeed)[] =
  [
    'id',
    'templateId',
    'limitationType',
    'limitationKey',
    'limitationValue',
    'isEnforced',
    'severity',
    'isActive',
  ];

/**
 * Template Access Limitation Data Seeds
 * Defines access limitations for each permission template
 */
export const MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEEDS: MktTemplateAccessLimitationDataSeed[] =
  [
    // ==================================================================================
    // ADMIN TEMPLATE - Minimal limitations for compliance
    // Priority: 1000 | Scope: ALL_RECORDS | 24/7 access with MFA for sensitive ops
    // ==================================================================================

    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.ADMIN_AUDIT_LOGGING,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      limitationType: ACCESS_LIMITATION_TYPE.OPERATIONAL,
      limitationKey: 'audit_logging',
      limitationValue: JSON.stringify({
        logLevel: 'ALL_ACTIONS',
        includeSystemActions: true,
        includeDataAccess: true,
        includeSensitiveOperations: true,
        retentionDays: 2555, // 7 years for compliance
        realTimeMonitoring: true,
        immutableLogs: true,
        blockchainBacked: false,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.INFO, // Just logging, not blocking
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.ADMIN_SECURITY_MONITORING,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      limitationType: ACCESS_LIMITATION_TYPE.OPERATIONAL,
      limitationKey: 'security_monitoring',
      limitationValue: JSON.stringify({
        anomalyDetection: true,
        privilegedAccessMonitoring: true,
        alertOnSensitiveActions: true,
        alertThresholds: {
          bulkDelete: 100,
          dataExport: 10000,
          userCreation: 10,
          permissionChange: 5,
        },
        notificationChannels: ['email', 'slack', 'sms'],
        notifySecurityTeam: true,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.WARNING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.ADMIN_HIGH_RISK_OPS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      limitationType: ACCESS_LIMITATION_TYPE.OPERATIONAL,
      limitationKey: 'high_risk_operations',
      limitationValue: JSON.stringify({
        mfaRequired: true, // MFA for sensitive operations
        mfaForActions: [
          'BULK_DELETE',
          'EXPORT_SENSITIVE_DATA',
          'CHANGE_PERMISSIONS',
          'DELETE_USER',
        ],
        cooldownPeriod: {
          bulkDelete: 300, // 5 minutes between bulk deletes
          userDeletion: 600, // 10 minutes
        },
        requiresJustification: {
          bulkDelete: true,
          sensitiveExport: true,
        },
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },

    // ==================================================================================
    // MANAGER TEMPLATE - Moderate limitations
    // Priority: 700 | Scope: DEPARTMENT_RECORDS | 6h-22h, department-scoped
    // ==================================================================================

    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.MANAGER_WORKING_HOURS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      limitationType: ACCESS_LIMITATION_TYPE.TEMPORAL,
      limitationKey: 'working_hours',
      limitationValue: JSON.stringify({
        enabled: true,
        startHour: 6, // 6 AM
        endHour: 22, // 10 PM
        timezone: 'Asia/Ho_Chi_Minh',
        workingDays: [1, 2, 3, 4, 5, 6], // Monday-Saturday
        allowWeekendAccess: true,
        allowAfterHoursEmergency: true,
        emergencyApprovalRequired: false, // Manager can self-approve
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.WARNING, // Warning, not blocking
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.MANAGER_SESSION_TIMEOUT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      limitationType: ACCESS_LIMITATION_TYPE.TEMPORAL,
      limitationKey: 'session_timeout',
      limitationValue: JSON.stringify({
        idleTimeoutMinutes: 120, // 2 hours
        maxSessionDurationMinutes: 600, // 10 hours
        warningBeforeTimeoutMinutes: 10,
        allowExtension: true,
        maxExtensions: 2,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.WARNING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.MANAGER_DATA_LIMITS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      limitationType: ACCESS_LIMITATION_TYPE.DATA_ACCESS,
      limitationKey: 'data_access_limits',
      limitationValue: JSON.stringify({
        maxRecordsPerQuery: 1000,
        maxRecordsPerDay: 10000,
        maxExportPerDay: 5000,
        departmentScopeOnly: true,
        requiresJustificationAt: 0.8, // At 80% of quota
        notifyAt: 0.9, // Notify at 90%
        resetTime: '00:00',
        trackingEnabled: true,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.MANAGER_BULK_OPS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      limitationType: ACCESS_LIMITATION_TYPE.OPERATIONAL,
      limitationKey: 'bulk_operations',
      limitationValue: JSON.stringify({
        maxBulkCreate: 500,
        maxBulkUpdate: 1000,
        maxBulkDelete: 100, // More restrictive for delete
        requiresApproval: {
          delete: true, // Bulk delete needs approval
          update: false,
          create: false,
        },
        approvalThreshold: {
          delete: 50, // >50 records needs approval
        },
        cooldownMinutes: 5, // 5 minutes between bulk ops
        maxConcurrentOps: 2,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.MANAGER_EXPORT_LIMITS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      limitationType: ACCESS_LIMITATION_TYPE.FUNCTIONAL,
      limitationKey: 'export_limitations',
      limitationValue: JSON.stringify({
        allowedFormats: ['csv', 'xlsx', 'pdf'],
        maxColumnsPerExport: 50,
        sensitiveDataMasking: true,
        watermarkRequired: true,
        expiryDays: 7, // Export files expire after 7 days
        maxFileSizeMB: 100,
        piiFieldsHidden: false, // Can export PII but logged
        financialDataMasked: false,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },

    // ==================================================================================
    // TEAM_LEAD TEMPLATE - Standard limitations
    // Priority: 600 | Scope: TEAM_RECORDS | 8h-20h, team-scoped
    // ==================================================================================

    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.TEAM_LEAD_WORKING_HOURS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      limitationType: ACCESS_LIMITATION_TYPE.TEMPORAL,
      limitationKey: 'working_hours',
      limitationValue: JSON.stringify({
        enabled: true,
        startHour: 8, // 8 AM
        endHour: 20, // 8 PM
        timezone: 'Asia/Ho_Chi_Minh',
        workingDays: [1, 2, 3, 4, 5], // Monday-Friday only
        allowWeekendAccess: false,
        allowAfterHoursEmergency: false,
        strictEnforcement: true,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.TEAM_LEAD_SESSION_TIMEOUT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      limitationType: ACCESS_LIMITATION_TYPE.TEMPORAL,
      limitationKey: 'session_timeout',
      limitationValue: JSON.stringify({
        idleTimeoutMinutes: 60, // 1 hour
        maxSessionDurationMinutes: 480, // 8 hours
        warningBeforeTimeoutMinutes: 5,
        allowExtension: false,
        forceLogoutOnTimeout: true,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.TEAM_LEAD_DATA_LIMITS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      limitationType: ACCESS_LIMITATION_TYPE.DATA_ACCESS,
      limitationKey: 'data_access_limits',
      limitationValue: JSON.stringify({
        maxRecordsPerQuery: 500,
        maxRecordsPerDay: 5000,
        maxExportPerDay: 1000,
        teamScopeOnly: true,
        maxTeamSize: 20,
        crossTeamViewRequiresApproval: true,
        resetTime: '00:00',
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.TEAM_LEAD_CONCURRENT_SESSIONS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      limitationType: ACCESS_LIMITATION_TYPE.OPERATIONAL,
      limitationKey: 'concurrent_sessions',
      limitationValue: JSON.stringify({
        maxSessions: 2, // Max 2 concurrent sessions
        sessionTimeoutMinutes: 120,
        idleTimeoutMinutes: 30,
        forceLogoutOnNewLogin: true, // Log out old sessions
        singleDeviceOnly: false, // Allow multiple devices
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.TEAM_LEAD_OPERATION_LIMITS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      limitationType: ACCESS_LIMITATION_TYPE.FUNCTIONAL,
      limitationKey: 'operation_limits',
      limitationValue: JSON.stringify({
        maxRecordsPerDay: 100,
        maxExportsPerWeek: 5,
        maxBulkOperationSize: 50,
        requiresApprovalAbove: 25,
        allowedOperations: ['READ', 'CREATE', 'UPDATE'],
        restrictedOperations: ['DELETE', 'BULK_DELETE'],
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },

    // ==================================================================================
    // STAFF TEMPLATE - Strict limitations
    // Priority: 500 | Scope: OWN_RECORDS | 8h-18h, own records only
    // ==================================================================================

    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.STAFF_WORKING_HOURS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      limitationType: ACCESS_LIMITATION_TYPE.TEMPORAL,
      limitationKey: 'working_hours',
      limitationValue: JSON.stringify({
        enabled: true,
        startHour: 8,
        endHour: 18, // 8 AM - 6 PM only
        timezone: 'Asia/Ho_Chi_Minh',
        workingDays: [1, 2, 3, 4, 5], // Monday-Friday
        allowWeekendAccess: false,
        allowAfterHoursEmergency: false,
        strictEnforcement: true,
        gracePeriodMinutes: 0, // No grace period
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.STAFF_SESSION_TIMEOUT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      limitationType: ACCESS_LIMITATION_TYPE.TEMPORAL,
      limitationKey: 'session_timeout',
      limitationValue: JSON.stringify({
        idleTimeoutMinutes: 30,
        maxSessionDurationMinutes: 480, // 8 hours
        warningBeforeTimeoutMinutes: 3,
        allowExtension: false,
        forceLogoutOnTimeout: true,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.STAFF_DATA_LIMITS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      limitationType: ACCESS_LIMITATION_TYPE.DATA_ACCESS,
      limitationKey: 'data_access_limits',
      limitationValue: JSON.stringify({
        maxRecordsPerQuery: 100,
        maxRecordsPerDay: 1000,
        maxExportPerDay: 200,
        ownRecordsOnly: true,
        sensitiveFieldsMasked: true, // Mask sensitive data
        piiAccessRestricted: true,
        financialDataHidden: true, // Hide financial data
        resetTime: '00:00',
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.STAFF_OPERATION_LIMITS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      limitationType: ACCESS_LIMITATION_TYPE.OPERATIONAL,
      limitationKey: 'operation_limits',
      limitationValue: JSON.stringify({
        maxActionsPerMinute: 30,
        maxActionsPerHour: 1000,
        burstAllowance: 50,
        throttleOnExcess: true,
        blockOnAbuse: true,
        cooldownSeconds: 60,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.STAFF_API_RATE_LIMIT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      limitationType: ACCESS_LIMITATION_TYPE.OPERATIONAL,
      limitationKey: 'api_rate_limit',
      limitationValue: JSON.stringify({
        requestsPerMinute: 30,
        requestsPerHour: 1000,
        burstSize: 50,
        quotaResetTime: 'hourly',
        throttleOnExcess: true,
        blockOnAbuse: true,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.STAFF_FEATURE_LIMITS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      limitationType: ACCESS_LIMITATION_TYPE.FUNCTIONAL,
      limitationKey: 'feature_limitations',
      limitationValue: JSON.stringify({
        advancedSearch: false, // No advanced search
        customReports: false, // No custom reports
        bulkOperations: false, // No bulk operations
        apiAccess: false, // No API access
        exportFormats: ['csv'], // CSV only
        importDisabled: true, // No import
        dashboardWidgets: 'basic', // Basic dashboard only
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },

    // ==================================================================================
    // INTERN TEMPLATE - Maximum restrictions (Training mode)
    // Priority: 300 | Scope: OWN_RECORDS | 9h-17h, read-only, supervised
    // ==================================================================================

    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.INTERN_WORKING_HOURS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      limitationType: ACCESS_LIMITATION_TYPE.TEMPORAL,
      limitationKey: 'working_hours',
      limitationValue: JSON.stringify({
        enabled: true,
        startHour: 9,
        endHour: 17, // 9 AM - 5 PM (training hours)
        timezone: 'Asia/Ho_Chi_Minh',
        workingDays: [1, 2, 3, 4, 5],
        allowWeekendAccess: false,
        allowAfterHoursEmergency: false,
        supervisorMustBeOnline: true, // Supervisor must be online
        requiresCheckIn: true,
        autoLogoutIfSupervisorOffline: true,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.INTERN_SESSION_TIMEOUT,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      limitationType: ACCESS_LIMITATION_TYPE.TEMPORAL,
      limitationKey: 'session_timeout',
      limitationValue: JSON.stringify({
        idleTimeoutMinutes: 15,
        maxSessionDurationMinutes: 240, // 4 hours max
        warningBeforeTimeoutMinutes: 2,
        allowExtension: false,
        forceLogoutOnTimeout: true,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.INTERN_DATA_LIMITS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      limitationType: ACCESS_LIMITATION_TYPE.DATA_ACCESS,
      limitationKey: 'data_access_limits',
      limitationValue: JSON.stringify({
        maxRecordsPerQuery: 50,
        maxRecordsPerDay: 500,
        readOnlyMode: true, // Read-only access
        publicDataOnly: true, // Only public data
        piiCompletelyHidden: true, // Hide all PII
        financialDataHidden: true,
        sensitiveDataHidden: true,
        allActionsLogged: true, // Log everything
        supervisorNotification: true, // Notify supervisor
        trainingMode: true,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.INTERN_OPERATION_LIMITS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      limitationType: ACCESS_LIMITATION_TYPE.FUNCTIONAL,
      limitationKey: 'operation_limits',
      limitationValue: JSON.stringify({
        maxRecordsPerDay: 10,
        maxExportsPerWeek: 0, // No exports
        maxBulkOperationSize: 0, // No bulk ops
        requiresApprovalAbove: 1, // Everything needs approval
        allowedOperations: ['READ'], // Read-only
        allOtherOperationsBlocked: true,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.INTERN_SUPERVISION,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      limitationType: ACCESS_LIMITATION_TYPE.OPERATIONAL,
      limitationKey: 'supervision',
      limitationValue: JSON.stringify({
        screenRecordingEnabled: true, // Record screen
        activityMonitoring: 'strict', // Strict monitoring
        activityLogging: 'comprehensive',
        randomAudits: true,
        supervisorNotifications: true,
        mentorAssignment: true,
        dailyReviewRequired: true,
        weeklyProgressReview: true,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.INFO,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.INTERN_TRAINING_MODE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      limitationType: ACCESS_LIMITATION_TYPE.FUNCTIONAL,
      limitationKey: 'training_mode',
      limitationValue: JSON.stringify({
        trainingModeEnabled: true,
        sandboxEnvironment: true, // Sandbox only
        realDataRestricted: true,
        simulationMode: true,
        guidedTutorials: true,
        progressTracking: true,
        competencyTests: true,
        certificationRequired: false,
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.INFO,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_IDS.INTERN_APPROVAL_REQUIRED,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      limitationType: ACCESS_LIMITATION_TYPE.FUNCTIONAL,
      limitationKey: 'approval_required',
      limitationValue: JSON.stringify({
        requiresApprovalFor: ['ALL_ACTIONS'],
        approverRole: 'STAFF', // Approved by STAFF or higher
        timeoutForApprovalMinutes: 30,
        escalationRules: true,
        autoRejectOnTimeout: false, // Keep pending
        notifyApproverChannels: ['email', 'slack'],
      }),
      isEnforced: true,
      severity: LIMITATION_SEVERITY.BLOCKING,
      isActive: true,
    },
  ];
