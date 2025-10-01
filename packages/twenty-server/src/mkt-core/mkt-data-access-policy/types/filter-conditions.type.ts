/**
 * Định nghĩa Types cho Data Access Policy Filter Conditions
 *
 * Hệ thống type toàn diện cho field filterConditions trong MktDataAccessPolicyWorkspaceEntity
 * Hỗ trợ nhiều chiến lược filtering linh hoạt để kiểm soát quyền truy cập dữ liệu
 */

/**
 * Policy Scope Types - Các kiểu phạm vi chính sách
 * Định nghĩa phạm vi rộng hẹp của quyền truy cập dữ liệu
 */
export type PolicyScope =
  | 'GLOBAL' // Truy cập toàn bộ dữ liệu trong workspace
  | 'CROSS_DEPARTMENT' // Truy cập xuyên nhiều phòng ban
  | 'DEPARTMENT' // Truy cập trong phòng ban của mình
  | 'TEAM' // Truy cập trong team
  | 'OWNED' // Chỉ các records được sở hữu/phân công
  | 'SELF' // Chỉ các records của chính mình
  | 'LIMITED' // Tập con bị giới hạn
  | 'SUPPORT_ASSIGNED' // Phân công ticket hỗ trợ
  | 'SUPPORT_HISTORY' // Lịch sử tương tác hỗ trợ
  | 'DEPARTMENT_OWNERSHIP' // Quyền sở hữu dựa trên phòng ban
  | 'CUSTOMER_ORDERS' // Đơn hàng từ khách hàng
  | 'FULL_CATALOG' // Catalog sản phẩm đầy đủ
  | 'PUBLIC_CATALOG' // Catalog sản phẩm công khai
  | 'ALL_COMPANY' // Truy cập toàn công ty
  | 'ALL_USERS' // Tất cả user records
  | 'ALL_LOGS' // Tất cả log records
  | 'TEAM_HIERARCHY'; // Truy cập theo hierarchy team

/**
 * Access Level Types - Các cấp độ truy cập
 */
export type AccessLevel = 'FULL' | 'LIMITED' | 'READ_ONLY' | 'RESTRICTED';

/**
 * Access Type - Kiểu truy cập
 */
export type AccessType = 'READ_ONLY' | 'READ_WRITE' | 'FULL';

/**
 * Audit Level Types - Các cấp độ audit
 */
export type AuditLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Ownership Filter Configuration - Cấu hình bộ lọc quyền sở hữu
 * Kiểm soát quyền truy cập dựa trên quyền sở hữu record
 */
export interface OwnershipFilter {
  enabled: boolean; // Bật/tắt filtering theo ownership
  field: string; // Tên field chứa owner ID (ví dụ: 'accountOwnerId', 'ownerId')
  allowShared?: boolean; // Cho phép truy cập records được chia sẻ
  sharedTypes?: string[]; // Các kiểu sharing được phép (ví dụ: ['TEAM_SHARED', 'EXPLICIT_SHARE'])
  includeTeamMembers?: boolean; // Bao gồm records của thành viên team
  includeUnassigned?: boolean; // Bao gồm records chưa được phân công
  restrictToAssigned?: boolean; // Giới hạn chỉ records được phân công rõ ràng
}

/**
 * Status Filter Configuration - Cấu hình bộ lọc trạng thái
 * Kiểm soát quyền truy cập dựa trên trạng thái record
 */
export interface StatusFilter {
  allowedValues?: string[]; // Các trạng thái ĐƯỢC phép truy cập
  deniedValues?: string[]; // Các trạng thái KHÔNG được phép truy cập
}

/**
 * Time Range Filter Configuration - Cấu hình bộ lọc khoảng thời gian
 * Kiểm soát quyền truy cập dựa trên các field thời gian/ngày tháng
 */
export interface TimeRangeFilter {
  field: string; // Tên field để lọc theo thời gian (ví dụ: 'createdAt', 'updatedAt')
  daysBack?: number; // Số ngày nhìn lại
  monthsBack?: number; // Số tháng nhìn lại
  yearsBack?: number; // Số năm nhìn lại
  startDate?: string; // Ngày bắt đầu (ISO date string)
  endDate?: string; // Ngày kết thúc (ISO date string)
}

/**
 * Amount Filter Configuration - Cấu hình bộ lọc số tiền
 * Kiểm soát quyền truy cập dựa trên các field số tiền
 */
export interface AmountFilter {
  minValue?: number; // Giá trị tối thiểu
  maxValue?: number | null; // Giá trị tối đa (null = không giới hạn)
}

/**
 * Sensitive Data Filter Configuration - Cấu hình bộ lọc dữ liệu nhạy cảm
 * Kiểm soát fields nào nên được loại trừ vì lý do bảo mật/riêng tư
 */
export interface SensitiveDataFilter {
  excludeFields?: string[]; // Các fields cần loại trừ khỏi kết quả
  includeFields?: string[]; // Chỉ bao gồm các fields này
  requireApprovalForExport?: boolean; // Yêu cầu phê duyệt để export dữ liệu nhạy cảm
}

/**
 * Confidential Data Configuration - Cấu hình dữ liệu mật
 * Kiểm soát quyền truy cập vào thông tin mật
 */
export interface ConfidentialDataConfig {
  enabled: boolean; // Có thể truy cập dữ liệu mật
  auditRequired?: boolean; // Yêu cầu audit logging khi truy cập
}

/**
 * Audit Configuration - Cấu hình audit
 * Kiểm soát yêu cầu về audit logging
 */
export interface AuditConfig {
  required: boolean; // Audit logging có bắt buộc không
  level: AuditLevel; // Mức độ chi tiết của audit
  logAllAccess?: boolean; // Log mọi lần truy cập (cho tài nguyên nhạy cảm)
}

/**
 * Restrictions Configuration - Cấu hình hạn chế
 * Các hạn chế chung về quyền truy cập dữ liệu
 */
export interface RestrictionsConfig {
  timeLimit?: boolean; // Có hạn chế theo thời gian
  amountLimit?: boolean; // Có hạn chế theo số tiền
  departmentLimit?: boolean; // Giới hạn trong phòng ban
  confidentialAccess?: boolean; // Có thể truy cập dữ liệu mật
}

/**
 * Hierarchy Filter Configuration - Cấu hình bộ lọc phân cấp
 * Kiểm soát quyền truy cập dựa trên cấu trúc phân cấp tổ chức
 */
export interface HierarchyFilter {
  includeSubordinates: boolean; // Bao gồm dữ liệu của cấp dưới
  maxDepth?: number; // Số cấp tối đa xuống dưới được bao gồm
}

/**
 * Support Level Configuration - Cấu hình cấp độ hỗ trợ
 * Cho các cấp độ truy cập của team hỗ trợ
 */
export interface SupportLevelConfig {
  enabled: boolean; // Bật/tắt filtering theo support level
  maxLevel?: string; // Cấp độ hỗ trợ tối đa (ví dụ: 'tier1', 'tier2', 'tier3')
}

/**
 * Filter By Configuration - Cấu hình lọc theo điều kiện
 * Các tiêu chí lọc bổ sung
 */
export interface FilterByConfig {
  hasActiveTickets?: boolean; // Có tickets đang hoạt động
  ticketStatus?: string[]; // Trạng thái của tickets
  [key: string]: unknown; // Cho phép thêm filters tùy chỉnh
}

/**
 * Time Window Configuration - Cấu hình cửa sổ thời gian
 * Cho các hạn chế theo thời gian (ví dụ: cửa sổ maintenance)
 */
export interface TimeWindowConfig {
  startTime: string; // Thời gian bắt đầu (ISO datetime string)
  endTime: string; // Thời gian kết thúc (ISO datetime string)
  timezone: string; // Múi giờ (ví dụ: 'UTC', 'America/New_York')
}

/**
 * Data Classification Configuration - Cấu hình phân loại dữ liệu
 * Cho việc lọc theo compliance và phân loại dữ liệu
 */
export interface DataClassificationConfig {
  allowedClassifications?: string[]; // Các phân loại được phép (ví dụ: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'])
  deniedClassifications?: string[]; // Các phân loại bị chặn
}

/**
 * Field Restrictions Configuration - Cấu hình hạn chế field
 * Hạn chế chi tiết ở cấp độ field
 */
export interface FieldRestrictionsConfig {
  allowedFields?: string[]; // Chỉ các fields này được truy cập
  deniedFields?: string[]; // Các fields này bị chặn
  maskedFields?: string[]; // Các fields này cần được che/redacted
}

/**
 * Compliance Framework Configuration - Cấu hình khung tuân thủ
 * Cho việc lọc theo các tiêu chuẩn compliance cụ thể
 */
export interface ComplianceConfig {
  framework?: 'GDPR' | 'SOX' | 'PCI_DSS' | 'HIPAA' | 'ISO_27001'; // Khung tuân thủ
  auditPeriod?: string; // Kỳ audit (ví dụ: '2024-Q4')
  alternativeAccess?: string; // Phương thức truy cập thay thế (ví dụ: 'REQUEST_DPO_APPROVAL')
}

/**
 * Project-Based Access Configuration - Cấu hình truy cập theo dự án
 * Cho quyền truy cập theo dự án/ngữ cảnh cụ thể
 */
export interface ProjectAccessConfig {
  projectCode?: string; // Mã dự án
  maxAmount?: number; // Số tiền tối đa cho dự án
  currency?: string; // Mã tiền tệ
  requiresSecondApproval?: boolean; // Yêu cầu người phê duyệt thứ hai
  secondApprover?: string; // ID của người phê duyệt thứ hai
  notifyOnApproval?: boolean; // Gửi thông báo khi phê duyệt
}

/**
 * Data Category Configuration - Cấu hình danh mục dữ liệu
 * Để phân loại quyền truy cập dữ liệu
 */
export type DataCategory =
  | 'MIGRATION_PROJECT' // Dự án di chuyển dữ liệu
  | 'REPORTING' // Báo cáo
  | 'ANALYTICS' // Phân tích
  | 'EXPORT' // Xuất dữ liệu
  | 'INTEGRATION'; // Tích hợp

/**
 * Export Format Configuration - Các định dạng xuất dữ liệu
 */
export type ExportFormat = 'CSV' | 'XLSX' | 'JSON' | 'XML' | 'PDF';

/**
 * Report Types - Các loại báo cáo
 */
export type ReportType =
  | 'PERFORMANCE' // Báo cáo hiệu suất
  | 'KPI' // Chỉ số KPI
  | 'ACTIVITY' // Hoạt động
  | 'PRODUCTIVITY' // Năng suất
  | 'INDIVIDUAL' // Cá nhân
  | 'TEAM' // Nhóm
  | 'DEPARTMENT' // Phòng ban
  | 'COMPARATIVE' // So sánh
  | 'FINANCIAL'; // Tài chính

/**
 * KPI Types - Các loại KPI
 */
export type KpiType =
  | 'INDIVIDUAL' // KPI cá nhân
  | 'TEAM' // KPI nhóm
  | 'ACTIVITY' // KPI hoạt động
  | 'PERFORMANCE' // KPI hiệu suất
  | 'SALES' // KPI bán hàng
  | 'REVENUE'; // KPI doanh thu

/**
 * Budget Categories - Các danh mục ngân sách
 */
export type BudgetCategory =
  | 'OPERATIONAL' // Ngân sách vận hành
  | 'TEAM' // Ngân sách nhóm
  | 'PROJECT' // Ngân sách dự án
  | 'EXECUTIVE_COMPENSATION' // Lương thưởng cấp cao
  | 'STRATEGIC_RESERVE'; // Dự phòng chiến lược

/**
 * Data Types - Các loại dữ liệu (cho tài chính/báo cáo)
 */
export type FinancialDataType =
  | 'REVENUE' // Doanh thu
  | 'EXPENSES' // Chi phí
  | 'PROFIT' // Lợi nhuận
  | 'CASH_FLOW' // Dòng tiền
  | 'BALANCE_SHEET'; // Bảng cân đối kế toán

/**
 * Transaction Types - Các loại giao dịch
 */
export type TransactionType =
  | 'PAYMENT' // Thanh toán
  | 'REFUND' // Hoàn tiền
  | 'ADJUSTMENT' // Điều chỉnh
  | 'TRANSFER' // Chuyển khoản
  | 'CHARGE'; // Tính phí

/**
 * Log Types - Các loại log
 */
export type LogType =
  | 'ACCESS' // Log truy cập
  | 'MODIFICATION' // Log sửa đổi
  | 'DELETION' // Log xóa
  | 'PERMISSION_CHANGE' // Log thay đổi quyền
  | 'SECURITY'; // Log bảo mật

/**
 * Log Severity - Mức độ nghiêm trọng của log
 */
export type LogSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Order Stages - Các giai đoạn đơn hàng
 */
export type OrderStage =
  | 'DRAFT' // Nháp
  | 'PENDING' // Đang chờ
  | 'CONFIRMED' // Đã xác nhận
  | 'IN_PROGRESS' // Đang xử lý
  | 'COMPLETED' // Hoàn thành
  | 'CANCELLED' // Đã hủy
  | 'REVIEW'; // Đang xem xét

/**
 * Data Include Types - Các kiểu dữ liệu bao gồm (cho việc lựa chọn dữ liệu)
 */
export type DataIncludeType =
  | 'supportTickets' // Tickets hỗ trợ
  | 'interactions' // Tương tác
  | 'resolutions' // Giải pháp
  | 'feedback' // Phản hồi
  | 'orders' // Đơn hàng
  | 'invoices' // Hóa đơn
  | 'financialData' // Dữ liệu tài chính
  | 'profile' // Hồ sơ
  | 'permissions' // Quyền
  | 'roles' // Vai trò
  | 'department' // Phòng ban
  | 'organizationLevel' // Cấp độ tổ chức
  | 'activity'; // Hoạt động

/**
 * Complete Filter Conditions Type - Type đầy đủ cho điều kiện lọc
 * Type chính cho field filterConditions
 */
export interface DataAccessFilterConditions {
  // Core Filters - Các bộ lọc cốt lõi
  scope?: PolicyScope; // Phạm vi chính sách
  accessLevel?: AccessLevel; // Cấp độ truy cập
  accessType?: AccessType; // Kiểu truy cập

  // Ownership and Assignment - Quyền sở hữu và phân công
  ownership?: OwnershipFilter; // Bộ lọc quyền sở hữu

  // Status and State - Trạng thái
  status?: StatusFilter; // Bộ lọc trạng thái

  // Time-based Filters - Bộ lọc theo thời gian
  timeRange?: TimeRangeFilter; // Khoảng thời gian
  timeWindow?: TimeWindowConfig; // Cửa sổ thời gian

  // Amount and Limits - Số tiền và giới hạn
  amount?: AmountFilter; // Bộ lọc số tiền
  maxRecords?: number; // Số lượng records tối đa
  maxRecordsPerDay?: number; // Số records tối đa mỗi ngày
  maxRecordsPerQuery?: number; // Số records tối đa mỗi query

  // Data Protection - Bảo vệ dữ liệu
  sensitiveData?: SensitiveDataFilter; // Bộ lọc dữ liệu nhạy cảm
  confidential?: ConfidentialDataConfig; // Cấu hình dữ liệu mật
  dataClassification?: string[] | DataClassificationConfig; // Phân loại dữ liệu
  fieldRestrictions?: string[] | FieldRestrictionsConfig; // Hạn chế field

  // Organizational Filters - Bộ lọc tổ chức
  hierarchyFilter?: HierarchyFilter; // Bộ lọc phân cấp
  departmentFilter?: {
    allowedDepartments?: string[]; // Các phòng ban được phép
    deniedDepartments?: string[]; // Các phòng ban bị chặn
  };

  // Compliance and Security - Tuân thủ và bảo mật
  audit?: AuditConfig; // Cấu hình audit
  restrictions?: RestrictionsConfig; // Các hạn chế
  complianceFramework?: string | ComplianceConfig; // Khung tuân thủ

  // Specialized Filters - Bộ lọc chuyên biệt
  supportLevel?: SupportLevelConfig; // Cấu hình cấp độ hỗ trợ
  filterBy?: FilterByConfig; // Lọc theo điều kiện

  // Project and Context - Dự án và ngữ cảnh
  dataCategory?: DataCategory; // Danh mục dữ liệu
  projectCode?: string; // Mã dự án
  exportFormat?: ExportFormat | ExportFormat[]; // Định dạng xuất
  includeMetadata?: boolean; // Bao gồm metadata
  auditLogging?: 'MANDATORY' | 'OPTIONAL' | 'DISABLED'; // Audit logging bắt buộc/tùy chọn/tắt

  // Business Logic - Logic nghiệp vụ
  reportTypes?: ReportType | ReportType[]; // Các loại báo cáo
  excludeReportTypes?: ReportType[]; // Loại trừ các loại báo cáo
  kpiTypes?: KpiType | KpiType[]; // Các loại KPI
  budgetCategories?: BudgetCategory | BudgetCategory[]; // Các danh mục ngân sách
  excludeCategories?: BudgetCategory[]; // Loại trừ danh mục
  dataTypes?: FinancialDataType | FinancialDataType[]; // Các loại dữ liệu tài chính
  transactionTypes?: TransactionType | TransactionType[]; // Các loại giao dịch
  logTypes?: LogType | LogType[]; // Các loại log
  severity?: LogSeverity | LogSeverity[]; // Mức độ nghiêm trọng
  includeStages?: OrderStage | OrderStage[]; // Bao gồm giai đoạn

  // Field Selection - Lựa chọn field
  includeFields?: string[] | DataIncludeType[]; // Bao gồm các fields
  excludeFields?: string[]; // Loại trừ các fields
  includeData?: DataIncludeType[]; // Bao gồm dữ liệu
  excludeData?: string[]; // Loại trừ dữ liệu

  // Special Conditions - Điều kiện đặc biệt
  blockReason?: string; // Lý do chặn
  maintenanceType?: 'CRITICAL' | 'SCHEDULED' | 'EMERGENCY'; // Loại bảo trì: Khẩn cấp/Đã lên lịch/Khẩn cấp
  affectedOperations?: string[]; // Các thao tác bị ảnh hưởng
  escalateTo?: string; // Chuyển lên cho
  notifyOnAttempt?: boolean; // Thông báo khi thử truy cập
  blockAllApprovals?: boolean; // Chặn tất cả phê duyệt
  alternativeAccess?: string; // Cách truy cập thay thế

  // Validation and Context - Xác thực và ngữ cảnh
  validityReason?: string; // Lý do hợp lệ
  requiresSecondApproval?: boolean; // Yêu cầu phê duyệt thứ hai
  secondApprover?: string; // Người phê duyệt thứ hai
  notifyOnApproval?: boolean; // Thông báo khi phê duyệt

  // Custom Extensions - Mở rộng tùy chỉnh
  [key: string]: unknown; // Cho phép thêm filters tùy chỉnh cho các mở rộng tương lai
}

/**
 * Type guard để kiểm tra object có phải DataAccessFilterConditions hợp lệ không
 */
export function isDataAccessFilterConditions(
  obj: unknown,
): obj is DataAccessFilterConditions {
  return typeof obj === 'object' && obj !== null;
}

/**
 * Helper type cho partial filter conditions (dùng cho updates)
 */
export type PartialFilterConditions = Partial<DataAccessFilterConditions>;

/**
 * Type cho kết quả validation filter condition
 */
export interface FilterConditionValidationResult {
  isValid: boolean; // Hợp lệ hay không
  errors?: string[]; // Danh sách lỗi
  warnings?: string[]; // Danh sách cảnh báo
}

/**
 * Common filter condition presets for reuse - Các preset điều kiện lọc phổ biến để tái sử dụng
 */
export const FILTER_CONDITION_PRESETS = {
  /**
   * Full unrestricted access (for admins) - Truy cập đầy đủ không giới hạn (cho admins)
   */
  FULL_ACCESS: {
    scope: 'GLOBAL',
    accessLevel: 'FULL',
    restrictions: {
      timeLimit: false,
      amountLimit: false,
      departmentLimit: false,
      confidentialAccess: true,
    },
    audit: {
      required: true,
      level: 'HIGH',
      logAllAccess: true,
    },
  } as DataAccessFilterConditions,

  /**
   * Department-scoped ownership (common for staff) - Quyền sở hữu theo phòng ban (phổ biến cho nhân viên)
   */
  DEPARTMENT_OWNERSHIP: {
    scope: 'DEPARTMENT',
    ownership: {
      enabled: true,
      field: 'accountOwnerId',
      allowShared: true,
      sharedTypes: ['TEAM_SHARED'],
    },
    status: {
      deniedValues: ['archived', 'deleted'],
    },
    audit: {
      required: true,
      level: 'MEDIUM',
    },
  } as DataAccessFilterConditions,

  /**
   * Read-only limited access (for interns) - Truy cập chỉ đọc có giới hạn (cho thực tập sinh)
   */
  READ_ONLY_LIMITED: {
    scope: 'LIMITED',
    accessType: 'READ_ONLY',
    maxRecords: 100,
    timeRange: {
      field: 'updatedAt',
      daysBack: 7,
    },
    sensitiveData: {
      excludeFields: ['email', 'phone', 'address', 'ssn', 'creditCard'],
    },
    audit: {
      required: true,
      level: 'HIGH',
    },
  } as DataAccessFilterConditions,

  /**
   * Cross-department manager access - Quyền truy cập xuyên phòng ban cho quản lý
   */
  CROSS_DEPARTMENT_MANAGER: {
    scope: 'CROSS_DEPARTMENT',
    timeRange: {
      field: 'updatedAt',
      daysBack: 180,
    },
    sensitiveData: {
      excludeFields: ['creditCard', 'bankAccount', 'ssn'],
      requireApprovalForExport: true,
    },
    audit: {
      required: true,
      level: 'MEDIUM',
    },
  } as DataAccessFilterConditions,

  /**
   * Financial data access (accounting) - Truy cập dữ liệu tài chính (kế toán)
   */
  FINANCIAL_FULL_ACCESS: {
    scope: 'ALL_COMPANY',
    confidential: {
      enabled: true,
      auditRequired: true,
    },
    timeRange: {
      field: 'createdAt',
      yearsBack: 7, // Legal compliance
    },
    audit: {
      required: true,
      level: 'HIGH',
    },
  } as DataAccessFilterConditions,

  /**
   * Support team ticket access - Truy cập ticket của team hỗ trợ
   */
  SUPPORT_TICKET_ACCESS: {
    scope: 'SUPPORT_ASSIGNED',
    filterBy: {
      hasActiveTickets: true,
      ticketStatus: ['open', 'pending', 'in_progress'],
    },
    timeRange: {
      field: 'lastSupportInteraction',
      daysBack: 90,
    },
    sensitiveData: {
      excludeFields: ['creditCard', 'bankAccount', 'ssn', 'financialData'],
    },
    audit: {
      required: true,
      level: 'MEDIUM',
    },
  } as DataAccessFilterConditions,
} as const;

/**
 * Filter Condition Builder (Fluent API) - Builder cho điều kiện lọc (Fluent API)
 * Giúp xây dựng filter conditions một cách lập trình
 */
export class FilterConditionBuilder {
  private conditions: Partial<DataAccessFilterConditions> = {};

  /** Thiết lập phạm vi chính sách */
  setScope(scope: PolicyScope): this {
    this.conditions.scope = scope;

    return this;
  }

  /** Thiết lập cấp độ truy cập */
  setAccessLevel(level: AccessLevel): this {
    this.conditions.accessLevel = level;

    return this;
  }

  /** Thiết lập bộ lọc quyền sở hữu */
  setOwnership(config: OwnershipFilter): this {
    this.conditions.ownership = config;

    return this;
  }

  /** Thiết lập bộ lọc trạng thái */
  setStatus(config: StatusFilter): this {
    this.conditions.status = config;

    return this;
  }

  /** Thiết lập khoảng thời gian */
  setTimeRange(config: TimeRangeFilter): this {
    this.conditions.timeRange = config;

    return this;
  }

  /** Thiết lập bộ lọc số tiền */
  setAmount(config: AmountFilter): this {
    this.conditions.amount = config;

    return this;
  }

  /** Thiết lập bộ lọc dữ liệu nhạy cảm */
  setSensitiveData(config: SensitiveDataFilter): this {
    this.conditions.sensitiveData = config;

    return this;
  }

  /** Thiết lập cấu hình audit */
  setAudit(config: AuditConfig): this {
    this.conditions.audit = config;

    return this;
  }

  /** Xây dựng và trả về filter conditions hoàn chỉnh */
  build(): DataAccessFilterConditions {
    return this.conditions as DataAccessFilterConditions;
  }

  /** Tạo builder từ preset có sẵn */
  static fromPreset(
    preset: keyof typeof FILTER_CONDITION_PRESETS,
  ): FilterConditionBuilder {
    const builder = new FilterConditionBuilder();

    builder.conditions = { ...FILTER_CONDITION_PRESETS[preset] };

    return builder;
  }
}
