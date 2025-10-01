# RBAC Template Access Limitation Guide

## Tổng quan

`MktTemplateAccessLimitationWorkspaceEntity` là entity quan trọng trong hệ thống RBAC, đóng vai trò định nghĩa các **giới hạn truy cập (Access Limitations)** cho từng Permission Template. Đây là lớp kiểm soát bổ sung **ngoài việc phân quyền actions và resources**, giúp hệ thống kiểm soát **điều kiện, thời gian, và phạm vi** người dùng có thể thực hiện các hành động.

## Vai trò trong kiến trúc RBAC

### 1. Vị trí trong hệ thống

```
Permission Template (1 template)
    ├── Resource Permissions (nhiều resources)
    ├── System Actions (nhiều actions)
    └── Access Limitations (nhiều limitations) ← Entity này
```

### 2. Mục đích chính

- **Temporal Control**: Giới hạn thời gian truy cập (giờ làm việc, ngày trong tuần)
- **Data Access Control**: Giới hạn số lượng và phạm vi dữ liệu truy cập
- **Operational Control**: Giới hạn hoạt động (số lượng request, tần suất thao tác)
- **Functional Control**: Giới hạn tính năng nâng cao (export size, bulk operations)

### 3. Khác biệt so với các entity khác

| Entity | Mục đích | Ví dụ |
|--------|----------|-------|
| **ResourcePermission** | Quyền trên tài nguyên | "Được phép READ CUSTOMERS" |
| **SystemAction** | Quyền thực hiện hành động hệ thống | "Được phép EXPORT DATA" |
| **Context** | Phạm vi dữ liệu | "Chỉ xem dữ liệu phòng ban" |
| **AccessLimitation** ⭐ | Điều kiện & giới hạn | "Chỉ truy cập 8h-18h, max 100 records/ngày" |

## Cấu trúc Entity

```typescript
MktTemplateAccessLimitationWorkspaceEntity {
  id: string                    // UUID
  templateId: string            // Foreign key to Permission Template

  limitationType: string        // TEMPORAL | DATA_ACCESS | OPERATIONAL | FUNCTIONAL
  limitationKey: string         // Mã định danh cụ thể
  limitationValue: object       // Cấu hình JSON chi tiết

  isEnforced: boolean           // Có áp dụng không (có thể tạm tắt)
  severity: string              // INFO | WARNING | BLOCKING
  isActive: boolean             // Trạng thái hoạt động
}
```

## 4 Loại Limitation Types

### 1. TEMPORAL (Time-based Limitations)

**Mục đích**: Giới hạn dựa trên thời gian

**Các limitation keys**:
- `working_hours`: Giờ làm việc
- `working_days`: Ngày làm việc trong tuần
- `session_timeout`: Thời gian timeout session
- `access_window`: Cửa sổ thời gian được phép truy cập
- `time_zone_restriction`: Giới hạn theo múi giờ

### 2. DATA_ACCESS (Data Access Limitations)

**Mục đích**: Giới hạn số lượng và phạm vi dữ liệu

**Các limitation keys**:
- `max_records_per_query`: Số bản ghi tối đa mỗi truy vấn
- `max_records_per_day`: Số bản ghi tối đa mỗi ngày
- `max_export_size`: Kích thước export tối đa
- `data_retention_days`: Số ngày lưu trữ dữ liệu
- `field_masking_rules`: Quy tắc che dấu dữ liệu nhạy cảm

### 3. OPERATIONAL (Operational Limitations)

**Mục đích**: Giới hạn hoạt động và tần suất thao tác

**Các limitation keys**:
- `max_requests_per_minute`: Số request tối đa mỗi phút
- `max_concurrent_sessions`: Số session đồng thời
- `bulk_operation_limit`: Giới hạn bulk operations
- `api_rate_limit`: Giới hạn API calls
- `concurrent_users`: Số người dùng đồng thời

### 4. FUNCTIONAL (Functional Limitations)

**Mục đích**: Giới hạn tính năng và khả năng

**Các limitation keys**:
- `export_formats`: Định dạng export được phép
- `import_sources`: Nguồn import được phép
- `advanced_search`: Có được dùng tìm kiếm nâng cao không
- `custom_reports`: Có được tạo báo cáo tùy chỉnh không
- `api_access`: Có được truy cập API không

## Severity Levels

### INFO (Informational)
- Chỉ ghi log, không chặn
- Dùng cho tracking và monitoring
- Ví dụ: "User đã đăng nhập ngoài giờ làm việc"

### WARNING (Warning)
- Hiển thị cảnh báo nhưng vẫn cho phép
- Yêu cầu xác nhận bổ sung
- Ví dụ: "Bạn đang vượt quá 80% limit records/ngày"

### BLOCKING (Blocking)
- Chặn hoàn toàn, không cho phép thực hiện
- Dùng cho các giới hạn nghiêm ngặt
- Ví dụ: "Truy cập bị từ chối ngoài giờ làm việc"

## Ví dụ chi tiết theo Role

### Ví dụ 1: ADMIN Template - Ít giới hạn

```typescript
// TEMPORAL: Không giới hạn giờ làm việc (24/7 access)
{
  id: "uuid-1",
  templateId: "ADMIN_TEMPLATE_ID",
  limitationType: "TEMPORAL",
  limitationKey: "working_hours",
  limitationValue: {
    enabled: false,  // ADMIN có thể truy cập 24/7
    message: "Admin có quyền truy cập không giới hạn thời gian"
  },
  isEnforced: false,
  severity: "INFO",
  isActive: true
}

// DATA_ACCESS: Giới hạn lỏng cho security
{
  id: "uuid-2",
  templateId: "ADMIN_TEMPLATE_ID",
  limitationType: "DATA_ACCESS",
  limitationKey: "max_export_size",
  limitationValue: {
    maxRecords: 100000,  // 100K records
    maxSizeMB: 500,      // 500MB
    requiresMFA: true,   // Yêu cầu MFA cho export lớn
    auditLog: true
  },
  isEnforced: true,
  severity: "WARNING",
  isActive: true
}

// OPERATIONAL: Rate limiting cho bảo vệ hệ thống
{
  id: "uuid-3",
  templateId: "ADMIN_TEMPLATE_ID",
  limitationType: "OPERATIONAL",
  limitationKey: "api_rate_limit",
  limitationValue: {
    requestsPerMinute: 1000,  // 1000 req/min
    requestsPerHour: 50000,   // 50K req/hour
    burstSize: 2000,
    quotaResetTime: "hourly"
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}
```

**Kết quả**:
- ✅ ADMIN có thể làm việc 24/7
- ✅ Export lớn nhưng cần MFA
- ✅ API rate limit cao để không bị gián đoạn công việc

---

### Ví dụ 2: MANAGER Template - Giới hạn vừa phải

```typescript
// TEMPORAL: Giới hạn giờ làm việc mở rộng
{
  id: "uuid-4",
  templateId: "MANAGER_TEMPLATE_ID",
  limitationType: "TEMPORAL",
  limitationKey: "working_hours",
  limitationValue: {
    enabled: true,
    startHour: 6,           // 6h sáng
    endHour: 22,            // 10h tối
    timezone: "Asia/Ho_Chi_Minh",
    workingDays: [1, 2, 3, 4, 5, 6],  // T2-T7
    allowWeekendAccess: true,
    allowAfterHoursEmergency: true,   // Cho phép truy cập khẩn cấp
    emergencyApprovalRequired: true
  },
  isEnforced: true,
  severity: "WARNING",     // Warning thay vì BLOCKING
  isActive: true
}

// DATA_ACCESS: Giới hạn phạm vi phòng ban
{
  id: "uuid-5",
  templateId: "MANAGER_TEMPLATE_ID",
  limitationType: "DATA_ACCESS",
  limitationKey: "max_records_per_day",
  limitationValue: {
    maxRecordsPerQuery: 1000,        // 1K records/query
    maxRecordsPerDay: 10000,         // 10K records/day
    maxExportPerDay: 5000,           // 5K records export/day
    departmentScopeOnly: true,       // Chỉ trong phòng ban
    requiresJustification: true,     // Cần lý do khi vượt 80%
    notifyAt: 0.8,                   // Thông báo ở 80% quota
    resetTime: "00:00",
    trackingEnabled: true
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}

// OPERATIONAL: Giới hạn bulk operations
{
  id: "uuid-6",
  templateId: "MANAGER_TEMPLATE_ID",
  limitationType: "OPERATIONAL",
  limitationKey: "bulk_operation_limit",
  limitationValue: {
    maxBulkCreate: 500,       // Tạo tối đa 500 records
    maxBulkUpdate: 1000,      // Cập nhật tối đa 1K records
    maxBulkDelete: 100,       // Xóa tối đa 100 records (cẩn trọng)
    requiresApproval: {
      delete: true,           // Bulk delete cần approval
      update: false,
      create: false
    },
    cooldownMinutes: 5,       // Phải đợi 5 phút giữa các bulk ops
    maxConcurrentOps: 2
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}

// FUNCTIONAL: Giới hạn tính năng
{
  id: "uuid-7",
  templateId: "MANAGER_TEMPLATE_ID",
  limitationType: "FUNCTIONAL",
  limitationKey: "export_formats",
  limitationValue: {
    allowedFormats: ["csv", "xlsx", "pdf"],  // Không có raw SQL export
    maxColumnsPerExport: 50,
    sensitiveDataMasking: true,
    watermarkRequired: true,
    expiryDays: 7           // File export hết hạn sau 7 ngày
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}
```

**Kết quả**:
- ⏰ MANAGER làm việc 6h-22h, T2-T7
- 📊 Tối đa 10K records/ngày trong phạm vi phòng ban
- 🔄 Bulk operations có giới hạn, delete cần approval
- 💾 Export giới hạn format và có watermark

---

### Ví dụ 3: TEAM_LEAD Template - Giới hạn team scope

```typescript
// TEMPORAL: Giờ làm việc tiêu chuẩn
{
  id: "uuid-8",
  templateId: "TEAM_LEAD_TEMPLATE_ID",
  limitationType: "TEMPORAL",
  limitationKey: "working_hours",
  limitationValue: {
    enabled: true,
    startHour: 8,           // 8h sáng
    endHour: 20,            // 8h tối
    timezone: "Asia/Ho_Chi_Minh",
    workingDays: [1, 2, 3, 4, 5],    // T2-T6 only
    allowWeekendAccess: false,
    allowAfterHoursEmergency: false  // Không cho phép khẩn cấp
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}

// DATA_ACCESS: Giới hạn team scope
{
  id: "uuid-9",
  templateId: "TEAM_LEAD_TEMPLATE_ID",
  limitationType: "DATA_ACCESS",
  limitationKey: "max_records_per_day",
  limitationValue: {
    maxRecordsPerQuery: 500,         // 500 records/query
    maxRecordsPerDay: 5000,          // 5K records/day
    maxExportPerDay: 1000,           // 1K records export/day
    teamScopeOnly: true,             // Chỉ trong team
    maxTeamSize: 20,                 // Team tối đa 20 người
    crossTeamViewRequiresApproval: true
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}

// OPERATIONAL: Session và concurrency limits
{
  id: "uuid-10",
  templateId: "TEAM_LEAD_TEMPLATE_ID",
  limitationType: "OPERATIONAL",
  limitationKey: "max_concurrent_sessions",
  limitationValue: {
    maxSessions: 2,              // Tối đa 2 sessions đồng thời
    sessionTimeoutMinutes: 120,  // 2 giờ timeout
    idleTimeoutMinutes: 30,      // 30 phút idle
    forceLogoutOnNewLogin: true, // Đăng xuất session cũ
    singleDeviceOnly: false      // Cho phép nhiều thiết bị
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}
```

**Kết quả**:
- ⏰ TEAM_LEAD chỉ làm 8h-20h, T2-T6, không có emergency access
- 👥 Truy cập giới hạn trong team (max 20 người)
- 🔒 Tối đa 2 sessions, timeout 2 giờ

---

### Ví dụ 4: STAFF Template - Giới hạn nghiêm ngặt

```typescript
// TEMPORAL: Giờ hành chính nghiêm ngặt
{
  id: "uuid-11",
  templateId: "STAFF_TEMPLATE_ID",
  limitationType: "TEMPORAL",
  limitationKey: "working_hours",
  limitationValue: {
    enabled: true,
    startHour: 8,
    endHour: 18,            // Chỉ 8h-18h
    timezone: "Asia/Ho_Chi_Minh",
    workingDays: [1, 2, 3, 4, 5],    // T2-T6 only
    allowWeekendAccess: false,
    allowAfterHoursEmergency: false,
    strictEnforcement: true,  // Không ngoại lệ
    gracePeriodMinutes: 0     // Không có grace period
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}

// DATA_ACCESS: Chỉ own records
{
  id: "uuid-12",
  templateId: "STAFF_TEMPLATE_ID",
  limitationType: "DATA_ACCESS",
  limitationKey: "max_records_per_day",
  limitationValue: {
    maxRecordsPerQuery: 100,         // 100 records/query
    maxRecordsPerDay: 1000,          // 1K records/day
    maxExportPerDay: 200,            // 200 records export/day
    ownRecordsOnly: true,            // Chỉ own records
    sensitiveFieldsMasked: true,     // Che dữ liệu nhạy cảm
    piiAccessRestricted: true,       // Hạn chế PII
    financialDataHidden: true        // Ẩn dữ liệu tài chính
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}

// OPERATIONAL: Rate limiting nghiêm ngặt
{
  id: "uuid-13",
  templateId: "STAFF_TEMPLATE_ID",
  limitationType: "OPERATIONAL",
  limitationKey: "api_rate_limit",
  limitationValue: {
    requestsPerMinute: 30,       // 30 req/min
    requestsPerHour: 1000,       // 1K req/hour
    burstSize: 50,
    quotaResetTime: "hourly",
    throttleOnExcess: true,      // Throttle khi vượt limit
    blockOnAbuse: true           // Block nếu abuse
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}

// FUNCTIONAL: Tính năng hạn chế
{
  id: "uuid-14",
  templateId: "STAFF_TEMPLATE_ID",
  limitationType: "FUNCTIONAL",
  limitationKey: "advanced_features",
  limitationValue: {
    advancedSearch: false,       // Không advanced search
    customReports: false,        // Không custom reports
    bulkOperations: false,       // Không bulk operations
    apiAccess: false,            // Không API access
    exportFormats: ["csv"],      // Chỉ CSV
    importDisabled: true,        // Không import
    dashboardWidgets: "basic"    // Dashboard cơ bản
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}
```

**Kết quả**:
- ⏰ STAFF chỉ 8h-18h T2-T6, không ngoại lệ
- 🔒 Chỉ xem own records, max 1K/ngày
- 🚫 Không có advanced features
- ⚠️ Rate limit rất thấp (30 req/min)

---

### Ví dụ 5: INTERN Template - Training mode

```typescript
// TEMPORAL: Supervised working hours
{
  id: "uuid-15",
  templateId: "INTERN_TEMPLATE_ID",
  limitationType: "TEMPORAL",
  limitationKey: "working_hours",
  limitationValue: {
    enabled: true,
    startHour: 9,
    endHour: 17,            // 9h-17h (training hours)
    timezone: "Asia/Ho_Chi_Minh",
    workingDays: [1, 2, 3, 4, 5],
    allowWeekendAccess: false,
    supervisorMustBeOnline: true,   // Supervisor phải online
    requiresCheckIn: true,          // Phải check-in
    autoLogoutIfSupervisorOffline: true
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}

// DATA_ACCESS: Read-only với giám sát
{
  id: "uuid-16",
  templateId: "INTERN_TEMPLATE_ID",
  limitationType: "DATA_ACCESS",
  limitationKey: "max_records_per_day",
  limitationValue: {
    maxRecordsPerQuery: 50,          // 50 records/query
    maxRecordsPerDay: 500,           // 500 records/day
    readOnlyMode: true,              // Chỉ đọc
    publicDataOnly: true,            // Chỉ public data
    piiCompletelyHidden: true,       // Ẩn hoàn toàn PII
    financialDataHidden: true,
    allActionsLogged: true,          // Log tất cả actions
    supervisorNotification: true,    // Thông báo supervisor
    trainingMode: true
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}

// OPERATIONAL: Strict monitoring
{
  id: "uuid-17",
  templateId: "INTERN_TEMPLATE_ID",
  limitationType: "OPERATIONAL",
  limitationKey: "max_concurrent_sessions",
  limitationValue: {
    maxSessions: 1,                  // Chỉ 1 session
    sessionTimeoutMinutes: 60,       // 1 giờ timeout
    idleTimeoutMinutes: 15,          // 15 phút idle
    forceLogoutOnNewLogin: true,
    singleDeviceOnly: true,          // Chỉ 1 thiết bị
    screenRecordingEnabled: true,    // Recording màn hình
    activityMonitoring: "strict"     // Monitor nghiêm ngặt
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}

// FUNCTIONAL: Training mode features
{
  id: "uuid-18",
  templateId: "INTERN_TEMPLATE_ID",
  limitationType: "FUNCTIONAL",
  limitationKey: "training_mode",
  limitationValue: {
    allFeaturesDisabled: true,       // Tắt hết features nâng cao
    readOnlyInterface: true,
    noExport: true,                  // Không export
    noImport: true,
    noDelete: true,
    noEdit: true,
    viewOnlyDashboard: true,
    tutorialMode: true,              // Tutorial hints
    sandboxEnvironment: true,        // Môi trường sandbox
    requiresSupervisorApproval: true // Mọi thao tác cần approval
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}
```

**Kết quả**:
- 👨‍🏫 INTERN chỉ 9h-17h khi supervisor online
- 📖 Read-only, chỉ public data
- 🎯 Training mode với sandbox
- 📹 Screen recording và monitoring nghiêm ngặt

---

## Use Cases thực tế

### Use Case 1: Compliance - GDPR Data Access Control

**Tình huống**: Cần tuân thủ GDPR khi truy cập dữ liệu khách hàng EU

```typescript
{
  id: "gdpr-limitation-1",
  templateId: "EU_DATA_ACCESS_TEMPLATE",
  limitationType: "DATA_ACCESS",
  limitationKey: "gdpr_data_access",
  limitationValue: {
    gdprConsentRequired: true,
    purposeLimitationEnforced: true,
    allowedPurposes: ["customer_support", "order_fulfillment"],
    dataMinimization: true,
    accessLogging: {
      enabled: true,
      retention: 3650,  // 10 năm
      immutable: true
    },
    rightToErasure: {
      enabled: true,
      autoDeleteDays: 90  // Auto delete sau 90 ngày không consent
    },
    dataPortability: true,
    automaticNotification: {
      onAccess: true,
      onExport: true,
      notifyDataSubject: true
    }
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}
```

### Use Case 2: Financial Compliance - SOX Controls

**Tình huống**: Tuân thủ Sarbanes-Oxley cho dữ liệu tài chính

```typescript
{
  id: "sox-limitation-1",
  templateId: "FINANCIAL_ACCESS_TEMPLATE",
  limitationType: "OPERATIONAL",
  limitationKey: "sox_controls",
  limitationValue: {
    segregationOfDuties: true,
    dualApprovalRequired: {
      enabled: true,
      minimumApprovers: 2,
      approverRoles: ["CFO", "CONTROLLER"]
    },
    auditTrail: {
      enabled: true,
      immutable: true,
      blockchainBacked: true,
      retention: 2555      // 7 năm
    },
    accessRecertification: {
      enabled: true,
      frequencyDays: 90,
      automaticRevocation: true
    },
    preventiveControls: {
      noSinglePersonApproval: true,
      noAfterHoursChanges: true,
      changeFreezePeriods: ["year-end", "quarter-end"]
    }
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}
```

### Use Case 3: Security - High-Risk Operations

**Tình huống**: Giới hạn operations nguy hiểm (delete, bulk changes)

```typescript
{
  id: "high-risk-ops-1",
  templateId: "ADMIN_TEMPLATE_ID",
  limitationType: "OPERATIONAL",
  limitationKey: "high_risk_operations",
  limitationValue: {
    mfaRequired: true,
    approvalRequired: {
      bulkDelete: {
        enabled: true,
        threshold: 10,     // >10 records cần approval
        approvers: 2
      },
      dataExport: {
        enabled: true,
        threshold: 1000,   // >1000 records
        approvers: 1
      },
      schemaChanges: {
        enabled: true,
        approvers: 2,
        windowsOnly: ["weekend"]
      }
    },
    cooldownPeriod: {
      delete: 300,         // 5 phút giữa các delete operations
      bulkUpdate: 60,
      export: 30
    },
    alerting: {
      enabled: true,
      channels: ["email", "slack", "sms"],
      recipients: ["security-team", "manager"]
    }
  },
  isEnforced: true,
  severity: "BLOCKING",
  isActive: true
}
```

---

## Best Practices

### 1. Kết hợp nhiều limitations

```typescript
// MANAGER cần cả 3 limitations cho bảo mật tốt
const managerLimitations = [
  workingHoursLimitation,      // TEMPORAL
  departmentScopeLimitation,   // DATA_ACCESS
  rateLimitLimitation          // OPERATIONAL
];
```

### 2. Sử dụng severity phù hợp

- **BLOCKING**: Cho security-critical limitations
- **WARNING**: Cho business-rule limitations
- **INFO**: Cho monitoring và analytics

### 3. Temporary disable cho emergency

```typescript
// Có thể tạm tắt limitation trong trường hợp khẩn cấp
{
  isEnforced: false,  // Tạm tắt
  isActive: true,     // Nhưng vẫn active để track
  metadata: {
    disabledBy: "admin-user-id",
    disabledAt: "2024-01-15T10:30:00Z",
    reason: "Emergency system maintenance",
    autoReEnableAt: "2024-01-15T18:00:00Z"
  }
}
```

### 4. Audit và monitoring

Tất cả limitations nên được log:

```typescript
limitationValue: {
  // ... config
  auditLog: {
    enabled: true,
    logLevel: "detailed",
    retention: 365,
    anonymize: false
  }
}
```

---

## Tổng kết

### MktTemplateAccessLimitationWorkspaceEntity đóng vai trò:

1. **Bổ sung kiểm soát** cho permission system
2. **Tuân thủ compliance** (GDPR, SOX, HIPAA)
3. **Bảo vệ hệ thống** khỏi abuse và overload
4. **Quản lý chi phí** bằng cách giới hạn resources
5. **Training mode** cho người dùng mới

### Khi nào cần sử dụng:

- ✅ Cần giới hạn thời gian truy cập
- ✅ Cần kiểm soát số lượng data access
- ✅ Cần rate limiting và quota
- ✅ Cần tuân thủ compliance requirements
- ✅ Cần monitoring và audit

### Khi nào KHÔNG cần:

- ❌ Để định nghĩa quyền trên resource (dùng ResourcePermission)
- ❌ Để định nghĩa system actions (dùng SystemAction)
- ❌ Để định nghĩa data scope (dùng Context)
