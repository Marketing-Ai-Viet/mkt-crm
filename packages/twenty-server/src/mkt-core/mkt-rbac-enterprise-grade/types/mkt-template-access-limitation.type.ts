/**
 * Template Access Limitation Types
 *
 * File này định nghĩa các types cho limitationValue của MktTemplateAccessLimitation
 * Mỗi limitation type có cấu trúc JSON riêng tùy theo mục đích sử dụng
 *
 * 4 loại limitations chính:
 * 1. TEMPORAL - Giới hạn theo thời gian
 * 2. DATA_ACCESS - Giới hạn truy cập dữ liệu
 * 3. OPERATIONAL - Giới hạn hoạt động hệ thống
 * 4. FUNCTIONAL - Giới hạn tính năng
 */

// =============================================================================
// TEMPORAL LIMITATIONS - Giới hạn theo thời gian
// =============================================================================

/**
 * Working Hours Limitation
 * Giới hạn giờ làm việc - kiểm soát khi nào user có thể truy cập hệ thống
 */
export type WorkingHoursLimitation = {
  enabled: boolean; // Có bật giới hạn giờ làm việc không
  startHour: number; // Giờ bắt đầu (0-23), VD: 8 = 8 AM
  endHour: number; // Giờ kết thúc (0-23), VD: 18 = 6 PM
  timezone: string; // Múi giờ, VD: 'Asia/Ho_Chi_Minh'
  workingDays: number[]; // Các ngày làm việc (1=Monday, 7=Sunday), VD: [1,2,3,4,5]
  allowWeekendAccess?: boolean; // Có cho phép truy cập cuối tuần không
  allowAfterHoursEmergency?: boolean; // Có cho phép truy cập ngoài giờ khi khẩn cấp không
  emergencyApprovalRequired?: boolean; // Cần approval khi truy cập khẩn cấp
  strictEnforcement?: boolean; // Áp dụng nghiêm ngặt không có ngoại lệ
  gracePeriodMinutes?: number; // Thời gian gia hạn sau giờ kết thúc (phút)
  supervisorMustBeOnline?: boolean; // Supervisor phải online (cho intern/trainee)
  requiresCheckIn?: boolean; // Yêu cầu check-in khi bắt đầu làm việc
  autoLogoutIfSupervisorOffline?: boolean; // Tự động logout nếu supervisor offline
};

/**
 * Session Timeout Limitation
 * Giới hạn thời gian session - tự động logout khi idle hoặc quá thời gian
 */
export type SessionTimeoutLimitation = {
  idleTimeoutMinutes: number; // Timeout khi không hoạt động (phút), VD: 30
  maxSessionDurationMinutes: number; // Thời gian session tối đa (phút), VD: 480 (8 giờ)
  warningBeforeTimeoutMinutes: number; // Cảnh báo trước khi timeout (phút), VD: 5
  allowExtension: boolean; // Cho phép gia hạn session
  maxExtensions?: number; // Số lần gia hạn tối đa, VD: 2
  forceLogoutOnTimeout?: boolean; // Bắt buộc logout khi timeout
};

// =============================================================================
// DATA ACCESS LIMITATIONS - Giới hạn truy cập dữ liệu
// =============================================================================

/**
 * Data Access Limits
 * Giới hạn số lượng và phạm vi dữ liệu có thể truy cập
 */
export type DataAccessLimitation = {
  maxRecordsPerQuery?: number; // Số records tối đa mỗi query, VD: 100
  maxRecordsPerDay?: number; // Số records tối đa mỗi ngày, VD: 1000
  maxExportPerDay?: number; // Số records export tối đa mỗi ngày, VD: 200

  // Scope restrictions - Giới hạn phạm vi
  ownRecordsOnly?: boolean; // Chỉ xem own records
  teamScopeOnly?: boolean; // Chỉ xem records trong team
  departmentScopeOnly?: boolean; // Chỉ xem records trong department
  maxTeamSize?: number; // Số người tối đa trong team, VD: 20

  // Cross-scope access - Truy cập cross-scope
  crossTeamViewRequiresApproval?: boolean; // Xem cross-team cần approval
  crossDepartmentRequiresApproval?: boolean; // Xem cross-department cần approval

  // Sensitive data - Dữ liệu nhạy cảm
  sensitiveFieldsMasked?: boolean; // Che dấu các trường nhạy cảm
  piiAccessRestricted?: boolean; // Hạn chế truy cập PII (Personal Identifiable Info)
  piiCompletelyHidden?: boolean; // Ẩn hoàn toàn PII
  financialDataHidden?: boolean; // Ẩn dữ liệu tài chính
  financialDataMasked?: boolean; // Che dấu dữ liệu tài chính
  sensitiveDataHidden?: boolean; // Ẩn dữ liệu nhạy cảm
  sensitiveDataAccess?: boolean; // Có quyền truy cập dữ liệu nhạy cảm

  // Historical data - Dữ liệu lịch sử
  historicalDataLimited?: boolean; // Giới hạn dữ liệu lịch sử

  // Tracking & notifications - Theo dõi & thông báo
  requiresJustification?: boolean; // Yêu cầu lý do khi truy cập
  requiresJustificationAt?: number; // Yêu cầu lý do khi đạt % quota, VD: 0.8 (80%)
  notifyAt?: number; // Thông báo khi đạt % quota, VD: 0.9 (90%)
  resetTime?: string; // Thời điểm reset quota, VD: '00:00'
  trackingEnabled?: boolean; // Bật tracking

  // Training/Read-only modes
  readOnlyMode?: boolean; // Chỉ ở chế độ đọc
  publicDataOnly?: boolean; // Chỉ dữ liệu public
  trainingMode?: boolean; // Chế độ training
  allActionsLogged?: boolean; // Log tất cả actions
  supervisorNotification?: boolean; // Thông báo supervisor

  // Field-level restrictions
  dataFieldsLimited?: boolean; // Giới hạn các trường dữ liệu được xem
};

// =============================================================================
// OPERATIONAL LIMITATIONS - Giới hạn hoạt động hệ thống
// =============================================================================

/**
 * Audit Logging Limitation
 * Cấu hình ghi log audit - tuân thủ compliance
 */
export type AuditLoggingLimitation = {
  logLevel: 'ALL_ACTIONS' | 'HIGH_PRIVILEGE' | 'SENSITIVE_ONLY'; // Mức độ log
  includeSystemActions: boolean; // Ghi log system actions
  includeDataAccess: boolean; // Ghi log data access
  includeSensitiveOperations?: boolean; // Ghi log sensitive operations
  retentionDays: number; // Thời gian lưu trữ log (ngày), VD: 2555 (7 năm)
  realTimeMonitoring: boolean; // Giám sát real-time
  immutableLogs?: boolean; // Log không thể chỉnh sửa
  blockchainBacked?: boolean; // Backup log trên blockchain
};

/**
 * Security Monitoring Limitation
 * Giám sát bảo mật - phát hiện anomaly và cảnh báo
 */
export type SecurityMonitoringLimitation = {
  anomalyDetection: boolean; // Phát hiện hành vi bất thường
  privilegedAccessMonitoring: boolean; // Giám sát truy cập đặc quyền
  alertOnSensitiveActions: boolean; // Cảnh báo khi có sensitive actions
  alertThresholds?: {
    // Ngưỡng cảnh báo
    bulkDelete?: number; // Ngưỡng bulk delete, VD: 100 records
    dataExport?: number; // Ngưỡng export, VD: 10000 records
    userCreation?: number; // Ngưỡng tạo user, VD: 10 users
    permissionChange?: number; // Ngưỡng thay đổi permission, VD: 5 changes
  };
  notificationChannels: Array<'email' | 'slack' | 'sms'>; // Kênh thông báo
  notifySecurityTeam?: boolean; // Thông báo security team
};

/**
 * High Risk Operations Limitation
 * Giới hạn các thao tác nguy hiểm - yêu cầu MFA và cooldown
 */
export type HighRiskOperationsLimitation = {
  mfaRequired: boolean; // Yêu cầu MFA cho các thao tác nguy hiểm
  mfaForActions?: string[]; // Danh sách actions cần MFA
  cooldownPeriod?: {
    // Thời gian chờ giữa các thao tác (giây)
    bulkDelete?: number; // VD: 300 (5 phút)
    userDeletion?: number; // VD: 600 (10 phút)
  };
  requiresJustification?: {
    // Yêu cầu lý do
    bulkDelete?: boolean;
    sensitiveExport?: boolean;
  };
};

/**
 * Bulk Operations Limitation
 * Giới hạn bulk operations - tạo/sửa/xóa hàng loạt
 */
export type BulkOperationsLimitation = {
  maxBulkCreate?: number; // Số records tạo tối đa, VD: 500
  maxBulkUpdate?: number; // Số records update tối đa, VD: 1000
  maxBulkDelete?: number; // Số records xóa tối đa, VD: 100
  requiresApproval?: {
    // Yêu cầu approval
    delete?: boolean;
    update?: boolean;
    create?: boolean;
  };
  approvalThreshold?: {
    // Ngưỡng cần approval
    delete?: number; // VD: 50 records
  };
  cooldownMinutes?: number; // Thời gian chờ giữa các bulk ops (phút), VD: 5
  maxConcurrentOps?: number; // Số bulk ops đồng thời, VD: 2
};

/**
 * Concurrent Sessions Limitation
 * Giới hạn số session đồng thời
 */
export type ConcurrentSessionsLimitation = {
  maxSessions: number; // Số session tối đa, VD: 2
  sessionTimeoutMinutes?: number; // Timeout session (phút)
  idleTimeoutMinutes?: number; // Idle timeout (phút)
  forceLogoutOnNewLogin?: boolean; // Logout session cũ khi login mới
  singleDeviceOnly?: boolean; // Chỉ cho phép 1 thiết bị
};

/**
 * Operation Limits
 * Giới hạn số lượng thao tác - rate limiting
 */
export type OperationLimitsLimitation = {
  maxActionsPerMinute?: number; // Số actions tối đa mỗi phút, VD: 30
  maxActionsPerHour?: number; // Số actions tối đa mỗi giờ, VD: 1000
  burstAllowance?: number; // Cho phép burst bao nhiêu, VD: 50
  throttleOnExcess?: boolean; // Throttle khi vượt limit
  blockOnAbuse?: boolean; // Block khi abuse
  cooldownSeconds?: number; // Thời gian chờ (giây), VD: 60
};

/**
 * API Rate Limit
 * Giới hạn API calls - quota management
 */
export type ApiRateLimitLimitation = {
  requestsPerMinute: number; // Requests tối đa mỗi phút, VD: 30
  requestsPerHour: number; // Requests tối đa mỗi giờ, VD: 1000
  burstSize: number; // Kích thước burst, VD: 50
  quotaResetTime: 'hourly' | 'daily' | 'monthly'; // Thời điểm reset quota
  throttleOnExcess: boolean; // Throttle khi vượt
  blockOnAbuse: boolean; // Block khi abuse
};

/**
 * Supervision Limitation
 * Giám sát và theo dõi - cho intern/trainee
 */
export type SupervisionLimitation = {
  screenRecordingEnabled?: boolean; // Ghi hình màn hình
  activityMonitoring?: 'strict' | 'moderate' | 'light'; // Mức độ giám sát
  activityLogging?: 'comprehensive' | 'detailed' | 'basic'; // Mức độ logging
  randomAudits?: boolean; // Kiểm tra ngẫu nhiên
  supervisorNotifications?: boolean; // Thông báo supervisor
  mentorAssignment?: boolean; // Gán mentor
  dailyReviewRequired?: boolean; // Yêu cầu review hàng ngày
  weeklyProgressReview?: boolean; // Review tiến độ hàng tuần
};

/**
 * IP Restriction
 * Giới hạn theo IP/location - bảo mật mạng
 */
export type IpRestrictionLimitation = {
  allowedNetworks: Array<'CORPORATE_NETWORK' | 'VPN' | string>; // Mạng được phép
  blockUnknownCountries?: boolean; // Block các quốc gia không xác định
  allowMobileAccess?: boolean; // Cho phép truy cập mobile
  geoLocationTracking?: boolean; // Theo dõi địa lý
};

// =============================================================================
// FUNCTIONAL LIMITATIONS - Giới hạn tính năng
// =============================================================================

/**
 * Export Limitations
 * Giới hạn export dữ liệu - format, size, security
 */
export type ExportLimitation = {
  allowedFormats: Array<'csv' | 'xlsx' | 'pdf' | 'json' | 'xml'>; // Định dạng cho phép
  maxColumnsPerExport?: number; // Số cột tối đa, VD: 50
  sensitiveDataMasking?: boolean; // Che dấu dữ liệu nhạy cảm
  watermarkRequired?: boolean; // Yêu cầu watermark
  expiryDays?: number; // File hết hạn sau bao nhiêu ngày, VD: 7
  maxFileSizeMB?: number; // Kích thước file tối đa (MB), VD: 100
  piiFieldsHidden?: boolean; // Ẩn PII fields khi export
  financialDataMasked?: boolean; // Che dấu financial data khi export
};

/**
 * Operation Limits (Functional)
 * Giới hạn số lượng operations - daily/weekly quotas
 */
export type FunctionalOperationLimits = {
  maxRecordsPerDay?: number; // Records tối đa mỗi ngày, VD: 100
  maxExportsPerWeek?: number; // Exports tối đa mỗi tuần, VD: 5
  maxBulkOperationSize?: number; // Kích thước bulk operation, VD: 50
  requiresApprovalAbove?: number; // Cần approval khi vượt, VD: 25
  allowedOperations?: string[]; // Danh sách operations được phép
  restrictedOperations?: string[]; // Danh sách operations bị hạn chế
  allOtherOperationsBlocked?: boolean; // Block tất cả operations khác
};

/**
 * Feature Limitations
 * Giới hạn các tính năng - feature flags
 */
export type FeatureLimitation = {
  advancedSearch?: boolean; // Cho phép advanced search
  customReports?: boolean; // Cho phép tạo custom reports
  bulkOperations?: boolean; // Cho phép bulk operations
  apiAccess?: boolean; // Cho phép API access
  exportFormats?: string[]; // Định dạng export được phép
  importDisabled?: boolean; // Tắt import
  dashboardWidgets?: 'full' | 'basic' | 'minimal'; // Loại dashboard widgets
};

/**
 * Training Mode Limitation
 * Chế độ training - sandbox environment
 */
export type TrainingModeLimitation = {
  trainingModeEnabled: boolean; // Bật training mode
  sandboxEnvironment?: boolean; // Môi trường sandbox
  realDataRestricted?: boolean; // Hạn chế dữ liệu thật
  simulationMode?: boolean; // Chế độ simulation
  guidedTutorials?: boolean; // Hướng dẫn từng bước
  progressTracking?: boolean; // Theo dõi tiến độ
  competencyTests?: boolean; // Kiểm tra năng lực
  certificationRequired?: boolean; // Yêu cầu chứng chỉ
};

/**
 * Approval Required Limitation
 * Yêu cầu phê duyệt - approval workflow
 */
export type ApprovalRequiredLimitation = {
  requiresApprovalFor: Array<'ALL_ACTIONS' | string>; // Actions cần approval
  approverRole: string; // Role của người phê duyệt, VD: 'STAFF', 'MANAGER'
  timeoutForApprovalMinutes: number; // Thời gian chờ approval (phút), VD: 30
  escalationRules?: boolean; // Có quy tắc escalation
  autoRejectOnTimeout?: boolean; // Tự động reject khi timeout
  notifyApproverChannels?: Array<'email' | 'slack' | 'sms'>; // Kênh thông báo approver
};

// =============================================================================
// UNION TYPE - Tất cả các limitation value types
// =============================================================================

/**
 * Template Access Limitation Value
 * Union type của tất cả các limitation value types
 * Dùng để type-safe khi làm việc với limitationValue
 */
export type TemplateAccessLimitationValue =
  // TEMPORAL
  | WorkingHoursLimitation
  | SessionTimeoutLimitation
  // DATA_ACCESS
  | DataAccessLimitation
  // OPERATIONAL
  | AuditLoggingLimitation
  | SecurityMonitoringLimitation
  | HighRiskOperationsLimitation
  | BulkOperationsLimitation
  | ConcurrentSessionsLimitation
  | OperationLimitsLimitation
  | ApiRateLimitLimitation
  | SupervisionLimitation
  | IpRestrictionLimitation
  // FUNCTIONAL
  | ExportLimitation
  | FunctionalOperationLimits
  | FeatureLimitation
  | TrainingModeLimitation
  | ApprovalRequiredLimitation;

// =============================================================================
// TYPE GUARDS - Helper functions để check type
// =============================================================================

/**
 * Type guard để check xem limitation value có phải WorkingHoursLimitation không
 */
export function isWorkingHoursLimitation(
  value: unknown,
): value is WorkingHoursLimitation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'enabled' in value &&
    'startHour' in value &&
    'endHour' in value
  );
}

/**
 * Type guard để check xem limitation value có phải SessionTimeoutLimitation không
 */
export function isSessionTimeoutLimitation(
  value: unknown,
): value is SessionTimeoutLimitation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'idleTimeoutMinutes' in value &&
    'maxSessionDurationMinutes' in value
  );
}

/**
 * Type guard để check xem limitation value có phải DataAccessLimitation không
 */
export function isDataAccessLimitation(
  value: unknown,
): value is DataAccessLimitation {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('maxRecordsPerQuery' in value ||
      'maxRecordsPerDay' in value ||
      'ownRecordsOnly' in value)
  );
}

// Có thể thêm các type guards khác tương tự...

// =============================================================================
// HELPER TYPES - Các types phụ trợ
// =============================================================================

/**
 * Limitation Key Type
 * Danh sách các limitation keys được sử dụng trong hệ thống
 */
export type LimitationKey =
  // TEMPORAL
  | 'working_hours'
  | 'session_timeout'
  // DATA_ACCESS
  | 'data_access_limits'
  // OPERATIONAL
  | 'audit_logging'
  | 'security_monitoring'
  | 'high_risk_operations'
  | 'bulk_operations'
  | 'concurrent_sessions'
  | 'operation_limits'
  | 'api_rate_limit'
  | 'supervision'
  | 'ip_restriction'
  // FUNCTIONAL
  | 'export_limitations'
  | 'feature_limitations'
  | 'training_mode'
  | 'approval_required';

/**
 * Limitation Severity
 * Mức độ nghiêm trọng của limitation
 */
export type LimitationSeverity = 'INFO' | 'WARNING' | 'BLOCKING';

/**
 * Limitation Type Category
 * Loại limitation
 */
export type LimitationType =
  | 'TEMPORAL' // Giới hạn theo thời gian
  | 'DATA_ACCESS' // Giới hạn truy cập dữ liệu
  | 'OPERATIONAL' // Giới hạn hoạt động
  | 'FUNCTIONAL'; // Giới hạn tính năng
