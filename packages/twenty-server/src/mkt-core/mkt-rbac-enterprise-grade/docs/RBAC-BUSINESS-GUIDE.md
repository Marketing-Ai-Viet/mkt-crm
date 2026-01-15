# RBAC Enterprise - Hướng dẫn Nghiệp vụ

> Tài liệu giải thích chi tiết về hệ thống phân quyền RBAC trong mkt-core

## Mục lục

1. [Tổng quan RBAC](#1-tổng-quan-rbac)
2. [Các Entity chính](#2-các-entity-chính)
3. [PermissionContext vs DataAccessPolicy](#3-permissioncontext-vs-dataaccesspolicy)
4. [Flow xử lý khi User request data](#4-flow-xử-lý-khi-user-request-data)
5. [Ví dụ nghiệp vụ cụ thể](#5-ví-dụ-nghiệp-vụ-cụ-thể)
6. [Hướng dẫn sử dụng](#6-hướng-dẫn-sử-dụng)

---

## 1. Tổng quan RBAC

### RBAC là gì?

**Role-Based Access Control (RBAC)** là hệ thống phân quyền dựa trên:
- **Role/Template**: Nhóm các quyền theo vai trò (Sales Staff, Manager, CEO)
- **Resource**: Đối tượng được bảo vệ (SalesOrder, Customer, Invoice)
- **Action**: Hành động trên resource (READ, CREATE, UPDATE, DELETE)
- **Context**: Phạm vi áp dụng (chỉ của mình, phòng ban, tất cả)

### Mô hình RBAC trong hệ thống

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION TEMPLATE                                 │
│                        (Sales Staff Template)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              TEMPLATE RESOURCE PERMISSION                            │   │
│  ├──────────────┬─────────────────┬─────────────────────────────────────┤   │
│  │   Resource   │     Actions     │           Context                   │   │
│  ├──────────────┼─────────────────┼─────────────────────────────────────┤   │
│  │ SalesOrder   │ READ, CREATE    │ → OWN_RECORDS                       │   │
│  │ Customer     │ READ            │ → DEPARTMENT_RECORDS                │   │
│  │ Invoice      │ READ            │ → OWN_RECORDS                       │   │
│  └──────────────┴─────────────────┴─────────────────────────────────────┘   │
│                                              │                              │
└──────────────────────────────────────────────│──────────────────────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────┐
                              │      PERMISSION CONTEXT        │
                              │         (Catalog)              │
                              ├────────────────────────────────┤
                              │ OWN_RECORDS                    │
                              │ DEPARTMENT_RECORDS             │
                              │ TEAM_RECORDS                   │
                              │ ALL_RECORDS                    │
                              └────────────────────────────────┘
```

---

## 2. Các Entity chính

### 2.1. MktPermissionTemplate

**Mục đích**: Định nghĩa một "role" với tập hợp các quyền.

```typescript
// Ví dụ: Template cho Sales Staff
{
  templateKey: "SALES_STAFF",
  templateName: "Sales Staff",
  description: "Quyền cho nhân viên Sales",
  hierarchyLevel: 9,  // Staff level
  isActive: true
}
```

### 2.2. MktTemplateResourcePermission

**Mục đích**: Map template với resource + actions + context.

```typescript
// Ví dụ: Sales Staff có quyền READ, CREATE trên SalesOrder
{
  templateId: "template-sales-staff",
  resourceId: "resource-sales-order",
  contextId: "ctx-own-records",        // ← Liên kết với PermissionContext
  allowedActions: ["READ", "CREATE"],
  deniedActions: ["DELETE"],
  isActive: true
}
```

### 2.3. MktPermissionContext

**Mục đích**: Định nghĩa các loại "phạm vi" permission có thể dùng.

```typescript
// Ví dụ: Context "chỉ records của mình"
{
  contextKey: "own",
  contextType: "OWN_RECORDS",
  name: "Chỉ records của mình",
  filterExpression: {
    "createdById": "$user.workspaceMemberId"  // ← Template variable
  },
  isSystemDefault: true
}
```

### 2.4. MktDataAccessPolicy

**Mục đích**: Định nghĩa policy cụ thể cho department/member/object.

```typescript
// Ví dụ: Policy cho phòng HCM xem tất cả đơn hàng
{
  name: "HCM Full Access",
  objectName: "mktSalesOrder",
  departmentId: "dept-hcm",
  filterConditions: {},  // ← Không filter = xem tất cả
  policyType: "ROW_LEVEL",
  priority: 100,
  isActive: true
}
```

---

## 3. PermissionContext vs DataAccessPolicy

### 3.1. So sánh tổng quan

| Aspect | PermissionContext | DataAccessPolicy |
|--------|-------------------|------------------|
| **Layer** | Template Layer | Override Layer |
| **Khi nào tạo** | Setup hệ thống (1 lần) | Khi cần custom/override |
| **Ai tạo** | Admin/System seed | Admin tạo manual |
| **Số lượng** | Ít (~10-20 loại) | Nhiều (theo nhu cầu) |
| **Scope** | Global (dùng chung) | Specific (dept/member) |
| **Filter** | Template (`$user.*`) | Resolved (giá trị cụ thể) |
| **Priority** | Thấp (default) | Cao (có thể override) |

### 3.2. Sơ đồ quan hệ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION CONTEXT                                  │
│                         (Template Layer)                                    │
│                                                                             │
│  Định nghĩa QUY TẮC CHUNG với template variables                            │
│                                                                             │
│  Ví dụ: "Mọi nhân viên chỉ xem đơn của mình"                                │
│  filterExpression: { "createdById": "$user.workspaceMemberId" }             │
│                                                                             │
│  → Áp dụng cho TẤT CẢ users được assign template này                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ CÓ THỂ BỊ OVERRIDE BỞI
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA ACCESS POLICY                                  │
│                         (Override Layer)                                    │
│                                                                             │
│  Định nghĩa NGOẠI LỆ với giá trị đã resolve                                 │
│                                                                             │
│  Ví dụ: "Riêng phòng HCM xem tất cả đơn"                                    │
│  departmentId: "dept-hcm"                                                   │
│  filterConditions: {} (không filter)                                        │
│                                                                             │
│  → Chỉ áp dụng cho users thuộc phòng HCM                                    │
│  → Override quy tắc chung của PermissionContext                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3. Filter Expression vs Filter Conditions

#### PermissionContext.filterExpression (Template)

Chứa **biến động** được resolve runtime:

```json
{
  "createdById": "$user.workspaceMemberId",
  "departmentId": { "$in": "$user.departmentDescendantIds" }
}
```

**Các biến được hỗ trợ:**

| Variable | Mô tả |
|----------|-------|
| `$user.userId` | ID user hiện tại |
| `$user.workspaceMemberId` | ID workspace member |
| `$user.departmentId` | ID phòng ban của user |
| `$user.departmentAncestorIds` | IDs phòng ban cha |
| `$user.departmentDescendantIds` | IDs phòng ban con |
| `$user.teamMemberIds` | IDs members trong team |
| `$user.subordinateMemberIds` | IDs cấp dưới |
| `$user.hierarchyLevel` | Level trong hierarchy (1-11) |

#### DataAccessPolicy.filterConditions (Resolved)

Chứa **giá trị cụ thể**, sẵn sàng apply:

```json
{
  "createdById": "member-uuid-123",
  "departmentId": { "$in": ["dept-1", "dept-2", "dept-3"] }
}
```

---

## 4. Flow xử lý khi User request data

### 4.1. Flow tổng quan

```
User Request
     │
     ▼
┌────────────────────────────────────────┐
│ 1. Xác định User Context               │
│    - workspaceMemberId                 │
│    - departmentId                      │
│    - hierarchyLevel                    │
└────────────────────┬───────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│ 2. Check DataAccessPolicy              │
│    (Priority cao, check trước)         │
│                                        │
│    Có policy match?                    │
│    ├─ YES → Dùng filterConditions      │
│    └─ NO  → Tiếp tục bước 3            │
└────────────────────┬───────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│ 3. Get PermissionTemplate              │
│    - Tìm template được assign cho user │
│    - Lấy TemplateResourcePermission    │
└────────────────────┬───────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│ 4. Get PermissionContext               │
│    - Lấy context từ permission         │
│    - Lấy filterExpression              │
└────────────────────┬───────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│ 5. Resolve Template Variables          │
│                                        │
│    $user.departmentId → "dept-hn"      │
│    $user.workspaceMemberId → "member-1"│
└────────────────────┬───────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│ 6. Apply Filter to Query               │
│                                        │
│    SELECT * FROM table                 │
│    WHERE resolved_conditions...        │
└────────────────────────────────────────┘
```

### 4.2. Ví dụ chi tiết

**Scenario**: Staff E (Sales HN) request xem đơn hàng

```
┌─────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: Xác định User Context                                       │
├─────────────────────────────────────────────────────────────────────┤
│ UserContext của Staff E:                                            │
│ {                                                                   │
│   userId: "user-E",                                                 │
│   workspaceMemberId: "member-E",                                    │
│   departmentId: "dept-hn",                                          │
│   hierarchyLevel: 9                                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BƯỚC 2: Check DataAccessPolicy                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Query: Có policy nào cho dept-hn và object mktSalesOrder?           │
│                                                                     │
│ Kết quả: KHÔNG TÌM THẤY                                             │
│ → Tiếp tục với PermissionContext                                    │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BƯỚC 3: Get Permission Template                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Staff E được assign template "Sales Staff"                          │
│                                                                     │
│ TemplateResourcePermission cho mktSalesOrder:                       │
│ {                                                                   │
│   allowedActions: ["READ", "CREATE"],                               │
│   contextId: "ctx-own-records"                                      │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BƯỚC 4: Get PermissionContext                                       │
├─────────────────────────────────────────────────────────────────────┤
│ PermissionContext "ctx-own-records":                                │
│ {                                                                   │
│   contextType: "OWN_RECORDS",                                       │
│   filterExpression: {                                               │
│     "createdById": "$user.workspaceMemberId"                        │
│   }                                                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BƯỚC 5: Resolve Template Variables                                  │
├─────────────────────────────────────────────────────────────────────┤
│ "$user.workspaceMemberId" → "member-E"                              │
│                                                                     │
│ Resolved filter:                                                    │
│ {                                                                   │
│   "createdById": "member-E"                                         │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BƯỚC 6: Apply to SQL Query                                          │
├─────────────────────────────────────────────────────────────────────┤
│ SELECT * FROM mkt_sales_order                                       │
│ WHERE "createdById" = 'member-E'                                    │
│ AND "deletedAt" IS NULL                                             │
│                                                                     │
│ KẾT QUẢ: Staff E chỉ thấy đơn hàng do mình tạo ✓                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Ví dụ nghiệp vụ cụ thể

### 5.1. Scenario: Công ty với 3 phòng Sales

```
                    ┌─────────────────┐
                    │   CEO (Level 1) │
                    │   Nguyễn A      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐   ┌────────────┐   ┌────────────┐
     │ Sales HN   │   │ Sales ĐN   │   │ Sales HCM  │
     │ Manager: B │   │ Manager: C │   │ Manager: D │
     │ (Level 7)  │   │ (Level 7)  │   │ (Level 7)  │
     └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
           │                │                │
     ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐
     │ Staff: E  │    │ Staff: G  │    │ Staff: I  │
     │ Staff: F  │    │ Staff: H  │    │ Staff: J  │
     │ (Level 9) │    │ (Level 9) │    │ (Level 9) │
     └───────────┘    └───────────┘    └───────────┘
```

### 5.2. Yêu cầu nghiệp vụ

| Yêu cầu | Giải pháp |
|---------|-----------|
| Staff chỉ xem đơn của mình | PermissionContext `OWN_RECORDS` |
| Manager xem đơn của team | PermissionContext `TEAM_RECORDS` |
| CEO xem tất cả | PermissionContext `ALL_RECORDS` |
| **Riêng HCM xem tất cả đơn** | DataAccessPolicy cho dept-hcm |

### 5.3. Cấu hình hệ thống

#### PermissionContext (System seed - 1 lần)

```json
// ctx-own-records
{
  "contextKey": "own",
  "contextType": "OWN_RECORDS",
  "filterExpression": {
    "createdById": "$user.workspaceMemberId"
  }
}

// ctx-team-records
{
  "contextKey": "team",
  "contextType": "TEAM_RECORDS",
  "filterExpression": {
    "createdById": { "$in": "$user.teamMemberIds" }
  }
}

// ctx-all-records
{
  "contextKey": "all",
  "contextType": "ALL_RECORDS",
  "filterExpression": {}
}
```

#### Permission Templates

```json
// Template: Sales Staff (Level 9)
{
  "templateKey": "SALES_STAFF",
  "resourcePermissions": [
    {
      "resource": "mktSalesOrder",
      "actions": ["READ", "CREATE"],
      "context": "ctx-own-records"  // ← Chỉ của mình
    }
  ]
}

// Template: Sales Manager (Level 7)
{
  "templateKey": "SALES_MANAGER",
  "resourcePermissions": [
    {
      "resource": "mktSalesOrder",
      "actions": ["READ", "CREATE", "UPDATE"],
      "context": "ctx-team-records"  // ← Của team
    }
  ]
}

// Template: CEO (Level 1)
{
  "templateKey": "CEO",
  "resourcePermissions": [
    {
      "resource": "mktSalesOrder",
      "actions": ["READ", "CREATE", "UPDATE", "DELETE"],
      "context": "ctx-all-records"  // ← Tất cả
    }
  ]
}
```

#### DataAccessPolicy (Override cho HCM)

```json
// Policy đặc biệt cho phòng HCM
{
  "name": "HCM Full Sales Order Access",
  "objectName": "mktSalesOrder",
  "departmentId": "dept-hcm",
  "filterConditions": {},  // Không filter = xem tất cả
  "policyType": "ROW_LEVEL",
  "priority": 100,
  "isActive": true
}
```

### 5.4. Kết quả

| User | Phòng | Không có Policy | Có Policy HCM |
|------|-------|-----------------|---------------|
| Staff E | HN | Chỉ đơn của E | - |
| Staff F | HN | Chỉ đơn của F | - |
| Manager B | HN | Đơn của team HN | - |
| **Staff I** | **HCM** | Chỉ đơn của I | **TẤT CẢ đơn** |
| **Staff J** | **HCM** | Chỉ đơn của J | **TẤT CẢ đơn** |
| CEO A | - | Tất cả | Tất cả |

---

## 6. Hướng dẫn sử dụng

### 6.1. Khi nào dùng PermissionContext?

✅ **Nên dùng khi:**
- Định nghĩa quy tắc chung áp dụng cho nhiều người
- Filter logic dựa trên thuộc tính của user
- Setup ban đầu cho hệ thống

**Ví dụ:**
```
"Tất cả Staff chỉ xem records của mình"
→ Tạo 1 PermissionContext OWN_RECORDS
→ Assign cho template Sales Staff
```

### 6.2. Khi nào dùng DataAccessPolicy?

✅ **Nên dùng khi:**
- Cần exception/override cho một nhóm cụ thể
- Business rule phức tạp không fit vào template
- Temporary access (dự án đặc biệt)
- Compliance requirements

**Ví dụ:**
```
"Riêng phòng HCM được xem tất cả đơn vì họ support cross-region"
→ Tạo 1 DataAccessPolicy cho departmentId = "dept-hcm"
→ filterConditions = {} (không filter)
```

### 6.3. Best Practices

1. **Ưu tiên PermissionContext** cho quy tắc chung
2. **Chỉ dùng DataAccessPolicy** khi thật sự cần exception
3. **Document lý do** khi tạo DataAccessPolicy
4. **Set expiration** cho temporary policies
5. **Review định kỳ** các DataAccessPolicy để cleanup

### 6.4. Tóm tắt 1 câu

> **PermissionContext** = Quy tắc MẶC ĐỊNH cho tất cả
> **DataAccessPolicy** = NGOẠI LỆ cho một số người/phòng ban cụ thể

---

## Phụ lục

### A. Danh sách Context Types

| Context Type | Mô tả | Use Case |
|--------------|-------|----------|
| `OWN_RECORDS` | Chỉ records của mình | Staff level |
| `TEAM_RECORDS` | Records của team | Team Lead |
| `DEPARTMENT_RECORDS` | Records của phòng ban | Manager |
| `ALL_RECORDS` | Tất cả records | CEO, Admin |
| `VALUE_BASED` | Theo giá trị (amount < X) | Financial limits |
| `TIME_LIMITED` | Giới hạn thời gian | Temporary access |

### B. Hierarchy Levels

| Level | Tên | Data Access Scope |
|-------|-----|-------------------|
| 1 | CEO | ALL_DEPARTMENTS |
| 2 | C-Level | ALL_DEPARTMENTS |
| 3 | VP | ALL_DEPARTMENTS |
| 4-6 | Director/Manager | OWN_AND_CHILD_DEPARTMENTS |
| 7 | Team Lead | OWN_DEPARTMENT_AND_TEAM |
| 8-11 | Staff/Intern | OWN_RECORDS |

### C. Files liên quan

```
mkt-rbac-enterprise-grade/
├── workspace-entities/
│   ├── config/
│   │   └── mkt-permission-context.workspace-entity.ts
│   ├── policy/
│   │   └── mkt-data-access-policy.workspace-entity.ts
│   └── template/
│       ├── mkt-permission-template.workspace-entity.ts
│       └── mkt-template-resource-permission.workspace-entity.ts
├── types/
│   ├── filter-expression.types.ts    # Template vs Resolved filter types
│   ├── user-context.types.ts         # UserContext type
│   └── data-access-scope.types.ts    # DATA_ACCESS_SCOPE constants
└── services/
    ├── rbac-context.service.ts       # Resolve user context
    └── hierarchical-access-evaluator.service.ts
```

---

*Cập nhật lần cuối: 2025-01*
