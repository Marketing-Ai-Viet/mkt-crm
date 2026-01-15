# Hướng dẫn Nghiệp vụ: Gán Quyền cho User

> Tài liệu giải thích sự khác biệt và cách sử dụng `MktUserPermissionTemplate` và `MktUserPermissionOverride`

---

## 1. Tổng quan

Hệ thống RBAC có 2 cách gán quyền cho user:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PERMISSION ASSIGNMENT SYSTEM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐         ┌──────────────────────────┐              │
│  │  UserPermission     │         │  UserPermission          │              │
│  │  Template           │    VS   │  Override                │              │
│  │  (Gán Role)         │         │  (Ngoại lệ cá nhân)      │              │
│  └─────────────────────┘         └──────────────────────────┘              │
│           │                                  │                              │
│           ▼                                  ▼                              │
│  ┌─────────────────────┐         ┌──────────────────────────┐              │
│  │ "Anh Minh là        │         │ "Anh Minh KHÔNG được     │              │
│  │  Manager"           │         │  xóa Order, dù là        │              │
│  │                     │         │  Manager"                │              │
│  └─────────────────────┘         └──────────────────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MktUserPermissionTemplate - Gán Role cho User

### 2.1. Khái niệm

**UserPermissionTemplate** là bảng liên kết (junction table) giữa **User** và **PermissionTemplate**.

```
┌─────────────────┐      ┌─────────────────────────┐      ┌─────────────────────┐
│ WorkspaceMember │──────│ UserPermissionTemplate  │──────│  PermissionTemplate │
│                 │  N:M │                         │  M:1 │                     │
│  - Anh Minh     │      │  - templateId           │      │  - CEO              │
│  - Chị Lan      │      │  - workspaceMemberId    │      │  - Manager          │
│  - Anh Hùng     │      │  - isActive             │      │  - Staff            │
│                 │      │  - expiresAt            │      │                     │
└─────────────────┘      └─────────────────────────┘      └─────────────────────┘
```

### 2.2. Dữ liệu thực tế

Từ database:

| User | Template | Lý do |
|------|----------|-------|
| WorkspaceMember #1 | CEO | Initial system setup - CEO role |
| WorkspaceMember #2 | Director | Design department director |
| WorkspaceMember #3 | VP | VP Operations role |

### 2.3. Các trường quan trọng

| Field | Mô tả | Ví dụ |
|-------|-------|-------|
| `workspaceMemberId` | User được gán | `uuid-member-123` |
| `templateId` | Role/Template được gán | `uuid-ceo-template` |
| `isActive` | Assignment còn hiệu lực? | `true` |
| `assignedAt` | Thời điểm gán | `2024-01-01` |
| `expiresAt` | Thời điểm hết hạn (optional) | `2025-12-31` hoặc `null` |
| `assignmentReason` | Lý do gán | "Promoted to Manager" |
| `assignedById` | Ai đã gán? | `uuid-admin-456` |

### 2.4. Khi nào sử dụng?

✅ **Sử dụng UserPermissionTemplate khi:**
- Gán role tiêu chuẩn cho user (CEO, Manager, Staff, etc.)
- Thăng chức/giáng chức nhân viên
- Gán nhiều role cho 1 user (ví dụ: vừa là Manager vừa là Trainer)
- Cần theo dõi ai đã gán role và khi nào

```typescript
// Ví dụ: Gán role Manager cho anh Minh
const assignment = {
  workspaceMemberId: 'uuid-anh-minh',
  templateId: 'uuid-manager-template',
  isActive: true,
  assignedAt: new Date(),
  assignmentReason: 'Thăng chức từ Staff lên Manager',
  assignedById: 'uuid-hr-admin',
};
```

---

## 3. MktUserPermissionOverride - Ngoại lệ Cá nhân

### 3.1. Khái niệm

**UserPermissionOverride** cho phép GRANT hoặc DENY quyền CỤ THỂ cho từng user, ghi đè (override) quyền từ template.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION OVERRIDE FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User: Anh Minh (Manager)                                                   │
│                                                                             │
│  Template: Manager                                                          │
│  ├── ✅ read:order                                                          │
│  ├── ✅ create:order                                                        │
│  ├── ✅ update:order                                                        │
│  └── ✅ delete:order  ←─── Template cho phép                                │
│                              │                                              │
│                              │ NHƯNG                                        │
│                              ▼                                              │
│  Override: Anh Minh                                                         │
│  └── ❌ delete:order  ←─── Override từ chối!                                │
│                                                                             │
│  KẾT QUẢ: Anh Minh KHÔNG THỂ xóa order                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Các trường quan trọng

| Field | Mô tả | Ví dụ |
|-------|-------|-------|
| `workspaceMemberId` | User bị override | `uuid-anh-minh` |
| `resourceId` | Resource bị override | `uuid-order-resource` |
| `actionId` | Action bị override | `uuid-delete-action` |
| `isAllowed` | Cho phép hay từ chối? | `false` = DENY |
| `contextFilter` | Filter bổ sung (optional) | `{"departmentId": "$user.departmentId"}` |
| `expiresAt` | Hết hạn khi nào? | `2025-06-30` |
| `reason` | Lý do (enum) | `SECURITY_RESTRICTION` |
| `reasonDescription` | Mô tả chi tiết | "Đang bị điều tra, tạm cấm xóa dữ liệu" |
| `approvedById` | Ai đã phê duyệt? | `uuid-cto` |
| `approvedAt` | Thời điểm phê duyệt | `2024-12-01` |

### 3.3. Reason Options

```typescript
// Các lý do override được hệ thống hỗ trợ
OVERRIDE_REASON_OPTIONS = {
  SPECIAL_PROJECT: "Dự án đặc biệt",
  TEMPORARY_ACCESS: "Truy cập tạm thời",
  SECURITY_RESTRICTION: "Hạn chế bảo mật",
  COMPLIANCE_REQUIREMENT: "Yêu cầu tuân thủ",
  TRAINING_PERIOD: "Đang trong thời gian đào tạo",
  PROBATION_PERIOD: "Đang trong thời gian thử việc",
  OTHER: "Lý do khác",
}
```

### 3.4. Khi nào sử dụng?

✅ **Sử dụng UserPermissionOverride khi:**
- Cấm 1 user cụ thể thực hiện 1 action cụ thể
- Cấp quyền ĐẶC BIỆT cho user mà template không có
- Hạn chế tạm thời (với expiresAt)
- Cần approval workflow và audit trail

```typescript
// Ví dụ 1: CẤM anh Minh xóa Order
const denyOverride = {
  workspaceMemberId: 'uuid-anh-minh',
  resourceId: 'uuid-order-resource',
  actionId: 'uuid-delete-action',
  isAllowed: false,  // DENY
  reason: 'SECURITY_RESTRICTION',
  reasonDescription: 'Đang bị điều tra vi phạm, tạm cấm xóa dữ liệu',
  expiresAt: new Date('2025-06-30'),
  approvedById: 'uuid-cto',
  approvedAt: new Date(),
};

// Ví dụ 2: CẤP quyền đặc biệt cho chị Lan xem báo cáo tài chính
const grantOverride = {
  workspaceMemberId: 'uuid-chi-lan',
  resourceId: 'uuid-financial-report-resource',
  actionId: 'uuid-read-action',
  isAllowed: true,  // GRANT
  reason: 'SPECIAL_PROJECT',
  reasonDescription: 'Cần xem báo cáo để hoàn thành dự án audit',
  expiresAt: new Date('2025-03-31'),
  approvedById: 'uuid-cfo',
  approvedAt: new Date(),
};
```

---

## 4. So sánh Chi tiết

### 4.1. Bảng So sánh

| Tiêu chí | UserPermissionTemplate | UserPermissionOverride |
|----------|------------------------|------------------------|
| **Mục đích** | Gán ROLE tiêu chuẩn | Tạo NGOẠI LỆ cá nhân |
| **Phạm vi** | Toàn bộ permissions của template | 1 resource + 1 action cụ thể |
| **Loại** | Chỉ GRANT (gán role) | GRANT hoặc DENY |
| **Audit** | Ai gán, khi nào | Ai phê duyệt, khi nào, lý do gì |
| **Hết hạn** | Optional (expiresAt) | Thường có (expiresAt) |
| **Số lượng** | Ít (theo số role) | Nhiều (theo từng case) |
| **Approval** | Không bắt buộc | Thường bắt buộc |

### 4.2. Luồng Đánh giá Quyền

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PERMISSION EVALUATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User request: Anh Minh muốn DELETE Order #123                              │
│                                                                             │
│  Step 1: Kiểm tra UserPermissionOverride                                    │
│  ┌─────────────────────────────────────────┐                                │
│  │ SELECT * FROM mktUserPermissionOverride │                                │
│  │ WHERE workspaceMemberId = 'anh-minh'    │                                │
│  │ AND resourceId = 'order-resource'       │                                │
│  │ AND actionId = 'delete-action'          │                                │
│  │ AND isActive = true                     │                                │
│  │ AND (expiresAt IS NULL OR expiresAt > NOW())                             │
│  └─────────────────────────────────────────┘                                │
│           │                                                                 │
│           ├── Có Override?                                                  │
│           │   ├── isAllowed = false → ❌ DENY (dừng lại)                    │
│           │   └── isAllowed = true  → ✅ ALLOW (dừng lại)                   │
│           │                                                                 │
│           └── Không có Override → Tiếp tục Step 2                           │
│                                                                             │
│  Step 2: Kiểm tra UserPermissionTemplate                                    │
│  ┌─────────────────────────────────────────┐                                │
│  │ SELECT t.* FROM mktPermissionTemplate t │                                │
│  │ JOIN mktUserPermissionTemplate upt      │                                │
│  │   ON t.id = upt.templateId              │                                │
│  │ JOIN mktTemplateResourcePermission trp  │                                │
│  │   ON t.id = trp.templateId              │                                │
│  │ WHERE upt.workspaceMemberId = 'anh-minh'│                                │
│  │ AND trp.resourceId = 'order-resource'   │                                │
│  │ AND trp.actionId = 'delete-action'      │                                │
│  │ AND upt.isActive = true                 │                                │
│  └─────────────────────────────────────────┘                                │
│           │                                                                 │
│           ├── Template có quyền này?                                        │
│           │   └── Có → ✅ ALLOW                                             │
│           │                                                                 │
│           └── Không → ❌ DENY (không có quyền)                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3. Ưu tiên (Priority)

```
Override DENY > Override GRANT > Template Permission > Default DENY

1. Nếu có Override với isAllowed=false → DENY (cao nhất)
2. Nếu có Override với isAllowed=true → ALLOW
3. Nếu không có Override → Kiểm tra Template
4. Nếu Template có quyền → ALLOW
5. Mặc định → DENY (thấp nhất)
```

---

## 5. Kịch bản Thực tế

### 5.1. Kịch bản 1: Nhân viên mới thử việc

**Tình huống:** Anh Hùng mới vào làm, đang thử việc 2 tháng.

**Giải pháp:**
```typescript
// 1. Gán role Staff cho anh Hùng (qua UserPermissionTemplate)
const staffAssignment = {
  workspaceMemberId: 'uuid-anh-hung',
  templateId: 'uuid-staff-template',
  isActive: true,
  assignedAt: new Date(),
  assignmentReason: 'Nhân viên mới, bắt đầu thử việc',
};

// 2. Hạn chế quyền xóa trong thời gian thử việc (qua UserPermissionOverride)
const probationRestriction = {
  workspaceMemberId: 'uuid-anh-hung',
  resourceId: 'uuid-order-resource',
  actionId: 'uuid-delete-action',
  isAllowed: false,  // DENY
  reason: 'PROBATION_PERIOD',
  reasonDescription: 'Không được xóa Order trong thời gian thử việc',
  expiresAt: new Date('2025-03-01'),  // Hết hạn sau 2 tháng
  approvedById: 'uuid-hr-manager',
  approvedAt: new Date(),
};
```

### 5.2. Kịch bản 2: Dự án đặc biệt

**Tình huống:** Chị Lan (Staff) cần xem báo cáo doanh thu để làm dự án audit.

**Giải pháp:**
```typescript
// Cấp quyền đặc biệt tạm thời (qua UserPermissionOverride)
const specialAccess = {
  workspaceMemberId: 'uuid-chi-lan',
  resourceId: 'uuid-revenue-report-resource',
  actionId: 'uuid-read-action',
  isAllowed: true,  // GRANT
  reason: 'SPECIAL_PROJECT',
  reasonDescription: 'Dự án audit Q1/2025, cần xem báo cáo doanh thu',
  expiresAt: new Date('2025-04-30'),
  approvedById: 'uuid-cfo',
  approvedAt: new Date(),
};
```

### 5.3. Kịch bản 3: Hạn chế bảo mật

**Tình huống:** Anh Minh (Manager) đang bị điều tra vi phạm, cần hạn chế quyền.

**Giải pháp:**
```typescript
// Cấm các quyền nhạy cảm (qua UserPermissionOverride)
const securityRestrictions = [
  {
    workspaceMemberId: 'uuid-anh-minh',
    resourceId: 'uuid-order-resource',
    actionId: 'uuid-delete-action',
    isAllowed: false,  // DENY
    reason: 'SECURITY_RESTRICTION',
    reasonDescription: 'Đang điều tra, cấm xóa Order',
    approvedById: 'uuid-ceo',
  },
  {
    workspaceMemberId: 'uuid-anh-minh',
    resourceId: 'uuid-payment-resource',
    actionId: 'uuid-create-action',
    isAllowed: false,  // DENY
    reason: 'SECURITY_RESTRICTION',
    reasonDescription: 'Đang điều tra, cấm tạo Payment',
    approvedById: 'uuid-ceo',
  },
];
// Không cần thay đổi UserPermissionTemplate - anh Minh vẫn là Manager
```

---

## 6. Best Practices

### 6.1. Khi nào dùng UserPermissionTemplate?

✅ **NÊN dùng khi:**
- Gán role chuẩn (CEO, Manager, Staff)
- Thăng chức / giáng chức
- User cần nhiều quyền theo nhóm

❌ **KHÔNG nên dùng khi:**
- Chỉ cần thêm/bớt 1 quyền cụ thể
- Cần hạn chế tạm thời

### 6.2. Khi nào dùng UserPermissionOverride?

✅ **NÊN dùng khi:**
- Cần cấp/cấm 1 quyền CỤ THỂ cho 1 user
- Có yêu cầu approval và audit trail
- Quyền có thời hạn (expiresAt)
- Trường hợp bảo mật, tuân thủ

❌ **KHÔNG nên dùng khi:**
- Cần thay đổi nhiều quyền → Dùng Template
- Override thường xuyên cho nhiều user → Tạo Template mới

### 6.3. Tránh Lạm dụng Override

```
⚠️ WARNING: Quá nhiều Override = Technical Debt

Nếu bạn thấy mình:
- Tạo cùng 1 override cho nhiều user → Tạo Template mới
- Override tồn tại lâu dài không hết hạn → Xem xét điều chỉnh Template
- Khó quản lý override → Cần review lại cấu trúc RBAC
```

---

## 7. Database Schema

### 7.1. mktUserPermissionTemplate

```sql
CREATE TABLE "mktUserPermissionTemplate" (
  id UUID PRIMARY KEY,
  "workspaceMemberId" UUID REFERENCES "workspaceMember"(id),
  "templateId" UUID REFERENCES "mktPermissionTemplate"(id),
  "isActive" BOOLEAN DEFAULT true,
  "assignedAt" TIMESTAMP NOT NULL,
  "expiresAt" TIMESTAMP,
  "assignmentReason" TEXT,
  "assignedById" UUID REFERENCES "workspaceMember"(id),
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP,
  "deletedAt" TIMESTAMP
);

-- Index cho query thường dùng
CREATE INDEX ON "mktUserPermissionTemplate" ("workspaceMemberId")
  WHERE "deletedAt" IS NULL AND "isActive" = true;
CREATE INDEX ON "mktUserPermissionTemplate" ("expiresAt")
  WHERE "deletedAt" IS NULL AND "expiresAt" IS NOT NULL AND "isActive" = true;
```

### 7.2. mktUserPermissionOverride

```sql
CREATE TABLE "mktUserPermissionOverride" (
  id UUID PRIMARY KEY,
  "workspaceMemberId" UUID REFERENCES "workspaceMember"(id),
  "resourceId" UUID REFERENCES "mktPermissionResource"(id),
  "actionId" UUID REFERENCES "mktPermissionAction"(id),
  "isAllowed" BOOLEAN DEFAULT false,
  "contextFilter" JSONB,
  "expiresAt" TIMESTAMP,
  "reason" VARCHAR,  -- ENUM: SPECIAL_PROJECT, SECURITY_RESTRICTION, etc.
  "reasonDescription" TEXT,
  "approvedById" UUID REFERENCES "workspaceMember"(id),
  "approvedAt" TIMESTAMP,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP,
  "deletedAt" TIMESTAMP
);

-- Index cho query thường dùng
CREATE INDEX ON "mktUserPermissionOverride" ("workspaceMemberId", "deletedAt");
CREATE INDEX ON "mktUserPermissionOverride" ("resourceId", "deletedAt");
CREATE INDEX ON "mktUserPermissionOverride" ("actionId", "deletedAt");
```

---

## 8. Tổng kết

| Entity | Vai trò | Ví dụ |
|--------|---------|-------|
| **UserPermissionTemplate** | Gán ROLE tiêu chuẩn cho user | "Anh Minh là Manager" |
| **UserPermissionOverride** | Tạo NGOẠI LỆ cho user cụ thể | "Anh Minh không được xóa Order" |

**Quy tắc đánh giá:**
1. Override DENY → Từ chối (cao nhất)
2. Override GRANT → Cho phép
3. Template Permission → Theo template
4. Default → Từ chối (thấp nhất)

---

*Tài liệu được tạo: 2025-01-15*
*Phiên bản: 1.0*
