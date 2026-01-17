# Kiến trúc Hệ thống RBAC Enterprise

> Tài liệu mô tả chi tiết kiến trúc và các entity trong hệ thống RBAC

---

## 1. Tổng quan Kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          RBAC ENTERPRISE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                           TEMPLATE LAYER                                    │ │
│  │                     (Định nghĩa Role & Permission)                          │ │
│  │                                                                             │ │
│  │  PermissionTemplate ──┬── TemplateResourcePermission ── PermissionResource │ │
│  │        (Role)         │                                      (Object)       │ │
│  │                       ├── TemplateSystemAction                              │ │
│  │                       │                                                     │ │
│  │                       └── TemplateAccessLimitation                          │ │
│  │                                    │                                        │ │
│  │                                    └── PermissionContext (Filter Template)  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                          │
│                                      ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                          ASSIGNMENT LAYER                                   │ │
│  │                      (Gán Role cho User)                                    │ │
│  │                                                                             │ │
│  │  WorkspaceMember ──── UserPermissionTemplate ──── PermissionTemplate       │ │
│  │      (User)               (Assignment)                (Role)                │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                          │
│                                      ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                          OVERRIDE LAYER                                     │ │
│  │                    (Ngoại lệ cá nhân & Tạm thời)                            │ │
│  │                                                                             │ │
│  │  UserPermissionOverride  ────  PermissionResource + PermissionAction       │ │
│  │  (Ngoại lệ GRANT/DENY)            (Resource + Action cụ thể)               │ │
│  │                                                                             │ │
│  │  TemporaryPermission                                                        │ │
│  │  (Quyền tạm thời có thời hạn)                                               │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                          │
│                                      ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                           RUNTIME LAYER                                     │ │
│  │                    (Policy đã resolve & Casbin)                             │ │
│  │                                                                             │ │
│  │  DataAccessPolicy     CasbinRule       PolicyVersion                       │ │
│  │  (Filter đã resolve)   (Casbin rules)   (Version tracking)                 │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                          │
│                                      ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                           AUDIT & CONFIG                                    │ │
│  │                     (Logging & Cấu hình hệ thống)                           │ │
│  │                                                                             │ │
│  │  PermissionAudit      PermissionPriorityConfig     PolicyChangeRequest     │ │
│  │  (Audit log)          (Priority config)            (Approval workflow)     │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PERMISSION TEMPLATE                                 │
│  (Role definition - CEO, Manager, Staff, etc.)                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  templateKey: string (CEO, MANAGER, STAFF)                                       │
│  templateName: string                                                            │
│  templateType: ROLE_BASED | HIERARCHY_BASED | DEPARTMENT_BASED | CUSTOM         │
│  hierarchyLevel: number (1-11)                                                   │
│  priority: number                                                                │
│  resolutionStrategy: PRIORITY_BASED | MOST_RESTRICTIVE | MOST_PERMISSIVE        │
└────────┬───────────────────────────────────┬─────────────────────────────────────┘
         │                                   │
         │ 1:N                               │ 1:N
         ▼                                   ▼
┌─────────────────────────┐   ┌─────────────────────────────────────────────────┐
│ TEMPLATE RESOURCE       │   │ USER PERMISSION TEMPLATE                         │
│ PERMISSION              │   │ (User-Role Assignment)                           │
├─────────────────────────┤   ├─────────────────────────────────────────────────┤
│ templateId: FK          │   │ workspaceMemberId: FK                            │
│ resourceId: FK          │   │ templateId: FK                                   │
│ contextId: FK (optional)│   │ isActive: boolean                                │
│ allowedActions: string[]│   │ assignedAt: Date                                 │
│ deniedActions: string[] │   │ expiresAt: Date (optional)                       │
│ conditions: JSON        │   │ assignmentReason: string                         │
└────────┬───────┬────────┘   └─────────────────────────────────────────────────┘
         │       │
         │       │ N:1
         ▼       ▼
┌────────────────────────┐   ┌────────────────────────────────────────────────────┐
│ PERMISSION RESOURCE    │   │ PERMISSION CONTEXT                                  │
│ (Object definition)    │   │ (Filter Template với $user.* variables)            │
├────────────────────────┤   ├────────────────────────────────────────────────────┤
│ resourceKey: string    │   │ contextKey: string (own, department, all)          │
│ resourceName: string   │   │ contextType: OWN_RECORDS | DEPARTMENT_RECORDS | ALL│
│ resourceCategory: enum │   │ filterExpression: { "$user.departmentId": ... }    │
│ isSystemResource: bool │   │ priority: number                                   │
└────────────────────────┘   └────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ PERMISSION ACTION                                                                │
│ (Action definition - READ, CREATE, UPDATE, DELETE)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│ actionKey: string (READ, CREATE, UPDATE, DELETE)                                 │
│ actionName: string                                                               │
│ actionCategory: DATA | SYSTEM | ADMIN                                            │
│ riskLevel: LOW | MEDIUM | HIGH | CRITICAL                                        │
│ requiresApproval: boolean                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ USER PERMISSION OVERRIDE                                                         │
│ (Ngoại lệ cá nhân - GRANT hoặc DENY)                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│ workspaceMemberId: FK                                                            │
│ resourceId: FK                                                                   │
│ actionId: FK                                                                     │
│ isAllowed: boolean (true=GRANT, false=DENY)                                      │
│ reason: SPECIAL_PROJECT | SECURITY_RESTRICTION | COMPLIANCE_REQUIREMENT         │
│ expiresAt: Date                                                                  │
│ approvedById: FK                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ TEMPORARY PERMISSION                                                             │
│ (Quyền tạm thời cho object/record cụ thể)                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ granteeWorkspaceMemberId: FK (người nhận)                                        │
│ granterWorkspaceMemberId: FK (người cấp)                                         │
│ objectName: string (mktOrder, mktCustomer, etc.)                                 │
│ recordId: UUID (optional - null = all records)                                   │
│ canRead, canUpdate, canDelete: boolean                                           │
│ expiresAt: Date                                                                  │
│ reason: string                                                                   │
│ purpose: CUSTOMER_SUPPORT | AUDIT | TEMPORARY_BACKUP | CROSS_TEAM_COLLABORATION │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ DATA ACCESS POLICY                                                               │
│ (Runtime Policy - Filter đã resolve)                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│ objectName: string                                                               │
│ departmentId: FK                                                                 │
│ filterConditions: { "departmentId": "dept-123" } (đã resolve)                    │
│ policyType: ROW_LEVEL | FIELD_LEVEL | COLUMN_LEVEL                               │
│ evaluationMode: STRICT | PERMISSIVE | BALANCED                                   │
│ riskLevel: LOW | MEDIUM | HIGH | CRITICAL                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Casbin Entities

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CASBIN INTEGRATION                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ CASBIN RULE                                                                  ││
│  │ (Raw Casbin policy rules)                                                    ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │ ptype: p (permission) | g (role) | g2 (resource group)                      ││
│  │ subject: user:uuid-123 | role:admin                                         ││
│  │ object: mktCustomer | crm_entities                                          ││
│  │ action: read | write | delete | *                                           ││
│  │ effect: allow | deny                                                        ││
│  │ condition: optional ABAC condition                                          ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │ Examples:                                                                    ││
│  │ - p, role:admin, mktCustomer, *, allow                                      ││
│  │ - g, user:uuid-123, role:admin                                              ││
│  │ - g2, mktCustomer, crm_entities                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ POLICY VERSION                                                               ││
│  │ (Version tracking for cache invalidation)                                    ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │ version: number                                                              ││
│  │ policyHash: SHA-256 hash                                                    ││
│  │ policyCount: number                                                          ││
│  │ syncedAt: timestamp                                                          ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ POLICY CHANGE REQUEST                                                        ││
│  │ (Approval workflow for high-risk changes)                                    ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │ title: string                                                                ││
│  │ status: PENDING | APPROVED | REJECTED | APPLIED | EXPIRED                   ││
│  │ changeType: CREATE | UPDATE | DELETE                                        ││
│  │ policyData: JSON                                                             ││
│  │ riskAssessment: JSON                                                         ││
│  │ requiredApprovals: 1 | 2 (dual-sign)                                        ││
│  │ currentApprovals: number                                                     ││
│  │ requestedById: FK                                                            ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      │ 1:N                                      │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ POLICY APPROVAL                                                              ││
│  │ (Individual approval records)                                                ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │ changeRequestId: FK                                                          ││
│  │ approverId: FK                                                               ││
│  │ decision: APPROVED | REJECTED                                               ││
│  │ reason: string                                                               ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Mô tả Chi tiết Các Entity

### 4.1. Template Layer

#### MktPermissionTemplateWorkspaceEntity
**Vai trò:** Định nghĩa ROLE (CEO, Manager, Staff, etc.)

| Field | Mô tả |
|-------|-------|
| `templateKey` | Key duy nhất (CEO, MANAGER, STAFF) |
| `templateName` | Tên hiển thị (Chief Executive Officer) |
| `templateType` | Loại template (ROLE_BASED, HIERARCHY_BASED) |
| `hierarchyLevel` | Cấp độ trong tổ chức (1-11) |
| `priority` | Độ ưu tiên khi resolve xung đột |
| `resolutionStrategy` | Chiến lược resolve (PRIORITY_BASED, MOST_RESTRICTIVE) |

#### MktTemplateResourcePermissionWorkspaceEntity
**Vai trò:** Map template → resource với actions được phép

| Field | Mô tả |
|-------|-------|
| `templateId` | FK → PermissionTemplate |
| `resourceId` | FK → PermissionResource |
| `contextId` | FK → PermissionContext (optional) |
| `allowedActions` | Array actions được phép: ['READ', 'CREATE'] |
| `deniedActions` | Array actions bị từ chối: ['DELETE'] |
| `conditions` | Điều kiện bổ sung (JSON) |

#### MktTemplateSystemActionWorkspaceEntity
**Vai trò:** Định nghĩa system-level actions cho template

| Field | Mô tả |
|-------|-------|
| `templateId` | FK → PermissionTemplate |
| `actionKey` | Key action (EXPORT_DATA, BULK_DELETE) |
| `isAllowed` | Cho phép hay không |
| `configuration` | Cấu hình action (JSON) |
| `restrictions` | Hạn chế (JSON) |

#### MktTemplateAccessLimitationWorkspaceEntity
**Vai trò:** Định nghĩa hạn chế truy cập cho template

| Field | Mô tả |
|-------|-------|
| `templateId` | FK → PermissionTemplate |
| `limitationType` | Loại hạn chế (TIME_BASED, IP_BASED, etc.) |
| `limitationKey` | Key (working_hours, session_timeout) |
| `limitationValue` | Giá trị cấu hình (JSON) |
| `severity` | Mức độ nghiêm trọng (LOW, MEDIUM, HIGH) |

### 4.2. Permission Building Blocks

#### MktPermissionResourceWorkspaceEntity
**Vai trò:** Định nghĩa OBJECT có thể áp dụng permission

| Field | Mô tả |
|-------|-------|
| `resourceKey` | Key (CUSTOMERS, ORDERS, PRODUCTS) |
| `resourceName` | Tên hiển thị |
| `resourceCategory` | Phân loại (CRM, FINANCE, ADMIN) |
| `isSystemResource` | Resource hệ thống? |

#### MktPermissionActionWorkspaceEntity
**Vai trò:** Định nghĩa ACTION có thể thực hiện

| Field | Mô tả |
|-------|-------|
| `actionKey` | Key (READ, CREATE, UPDATE, DELETE) |
| `actionName` | Tên hiển thị |
| `actionCategory` | Phân loại (DATA, SYSTEM, ADMIN) |
| `riskLevel` | Mức rủi ro (LOW, MEDIUM, HIGH, CRITICAL) |
| `requiresApproval` | Cần approval mặc định? |

#### MktPermissionContextWorkspaceEntity
**Vai trò:** Định nghĩa CONTEXT filter với template variables

| Field | Mô tả |
|-------|-------|
| `contextKey` | Key (own, department, all) |
| `contextType` | Loại (OWN_RECORDS, DEPARTMENT_RECORDS) |
| `filterExpression` | Filter với $user.* variables |

### 4.3. Override Layer

#### MktUserPermissionOverrideWorkspaceEntity
**Vai trò:** Ngoại lệ cá nhân (GRANT hoặc DENY)

| Field | Mô tả |
|-------|-------|
| `workspaceMemberId` | User bị override |
| `resourceId` | Resource cụ thể |
| `actionId` | Action cụ thể |
| `isAllowed` | true=GRANT, false=DENY |
| `reason` | Lý do (SECURITY_RESTRICTION, etc.) |
| `approvedById` | Người phê duyệt |
| `expiresAt` | Thời hạn |

#### MktTemporaryPermissionWorkspaceEntity
**Vai trò:** Quyền tạm thời có thời hạn

| Field | Mô tả |
|-------|-------|
| `granteeWorkspaceMemberId` | Người nhận quyền |
| `granterWorkspaceMemberId` | Người cấp quyền |
| `objectName` | Object (mktOrder, mktCustomer) |
| `recordId` | Record cụ thể (optional) |
| `canRead/Update/Delete` | Quyền cấp |
| `expiresAt` | Hết hạn khi nào |
| `purpose` | Mục đích (CUSTOMER_SUPPORT, AUDIT) |

### 4.4. Runtime Layer

#### MktDataAccessPolicyWorkspaceEntity
**Vai trò:** Policy đã resolve, sẵn sàng áp dụng

| Field | Mô tả |
|-------|-------|
| `objectName` | Object áp dụng |
| `departmentId` | Department (optional) |
| `filterConditions` | Filter đã resolve (không có $user.*) |
| `policyType` | ROW_LEVEL, FIELD_LEVEL, COLUMN_LEVEL |
| `evaluationMode` | STRICT, PERMISSIVE, BALANCED |

### 4.5. Audit & Config

#### MktPermissionAuditWorkspaceEntity
**Vai trò:** Audit log cho permission checks

| Field | Mô tả |
|-------|-------|
| `workspaceMemberId` | User thực hiện |
| `action` | Action thực hiện |
| `objectName` | Object truy cập |
| `recordId` | Record cụ thể |
| `checkResult` | ALLOWED, DENIED |
| `permissionSource` | Nguồn quyết định |
| `denialReason` | Lý do từ chối |
| `checkDurationMs` | Thời gian check |

#### MktPermissionPriorityConfigWorkspaceEntity
**Vai trò:** Cấu hình priority động cho RBAC

| Field | Mô tả |
|-------|-------|
| `sourceType` | TEMPLATE, OVERRIDE, POLICY |
| `sourceSubType` | EMERGENCY, COMPLIANCE, etc. |
| `basePriority` | Priority cơ sở |
| `priorityBoost` | Boost thêm |
| `priorityFormula` | Công thức tính |

---

## 5. Permission Evaluation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION EVALUATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  User Request: "User A wants to DELETE Order #123"                              │
│                                                                                  │
│  Step 1: Check Temporary Permission                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ SELECT * FROM mktTemporaryPermission                                        ││
│  │ WHERE granteeWorkspaceMemberId = 'user-a'                                   ││
│  │   AND objectName = 'mktOrder'                                               ││
│  │   AND (recordId = 'order-123' OR recordId IS NULL)                          ││
│  │   AND canDelete = true                                                      ││
│  │   AND isActive = true AND expiresAt > NOW()                                 ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│           │                                                                      │
│           ├── Found → ✅ ALLOW (stop)                                           │
│           └── Not found → Continue                                               │
│                                                                                  │
│  Step 2: Check User Override                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ SELECT * FROM mktUserPermissionOverride                                     ││
│  │ WHERE workspaceMemberId = 'user-a'                                          ││
│  │   AND resourceId = 'order-resource-id'                                      ││
│  │   AND actionId = 'delete-action-id'                                         ││
│  │   AND isActive = true                                                       ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│           │                                                                      │
│           ├── isAllowed = false → ❌ DENY (stop)                                │
│           ├── isAllowed = true → ✅ ALLOW (stop)                                │
│           └── Not found → Continue                                               │
│                                                                                  │
│  Step 3: Check Template Permission                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ SELECT trp.* FROM mktTemplateResourcePermission trp                         ││
│  │ JOIN mktUserPermissionTemplate upt ON upt.templateId = trp.templateId       ││
│  │ WHERE upt.workspaceMemberId = 'user-a' AND upt.isActive = true              ││
│  │   AND trp.resourceId = 'order-resource-id'                                  ││
│  │   AND 'DELETE' = ANY(trp.allowedActions)                                    ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│           │                                                                      │
│           ├── Found → ✅ ALLOW                                                  │
│           └── Not found → ❌ DENY (default)                                     │
│                                                                                  │
│  Step 4: Apply Data Access Policy (row-level filter)                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ Nếu ALLOW, áp dụng filterConditions từ DataAccessPolicy                     ││
│  │ vào query để filter records                                                 ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  Step 5: Log to PermissionAudit                                                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Priority Order

```
1. TemporaryPermission (cao nhất)  - Quyền tạm thời
2. UserOverride DENY               - Override từ chối
3. UserOverride GRANT              - Override cho phép
4. Template Permission             - Quyền từ role
5. Default DENY (thấp nhất)        - Mặc định từ chối
```

---

## 7. Quan hệ giữa các Entity

| Entity A | Relation | Entity B | Mô tả |
|----------|----------|----------|-------|
| PermissionTemplate | 1:N | TemplateResourcePermission | Template có nhiều resource permissions |
| PermissionTemplate | 1:N | TemplateSystemAction | Template có nhiều system actions |
| PermissionTemplate | 1:N | TemplateAccessLimitation | Template có nhiều hạn chế |
| PermissionTemplate | 1:N | UserPermissionTemplate | Template được gán cho nhiều users |
| PermissionTemplate | 1:N | DataAccessPolicy | Template sinh ra nhiều policies |
| WorkspaceMember | 1:N | UserPermissionTemplate | User được gán nhiều templates |
| WorkspaceMember | 1:N | UserPermissionOverride | User có nhiều overrides |
| WorkspaceMember | 1:N | TemporaryPermission | User được cấp nhiều quyền tạm thời |
| PermissionResource | 1:N | TemplateResourcePermission | Resource được dùng trong nhiều templates |
| PermissionResource | 1:N | UserPermissionOverride | Resource bị override |
| PermissionAction | 1:N | UserPermissionOverride | Action bị override |
| PermissionContext | 1:N | TemplateResourcePermission | Context được dùng trong nhiều permissions |
| PolicyChangeRequest | 1:N | PolicyApproval | Request có nhiều approvals |

---

## 8. Best Practices

### 8.1. Khi nào dùng từng entity?

| Tình huống | Entity sử dụng |
|------------|----------------|
| Tạo role mới | PermissionTemplate + TemplateResourcePermission |
| Gán role cho user | UserPermissionTemplate |
| Cấm 1 user làm 1 action | UserPermissionOverride (isAllowed=false) |
| Cấp quyền đặc biệt tạm thời | TemporaryPermission |
| Định nghĩa object mới | PermissionResource |
| Định nghĩa action mới | PermissionAction |
| Filter records theo phòng ban | PermissionContext + DataAccessPolicy |
| Hạn chế thời gian truy cập | TemplateAccessLimitation |
| Track policy changes | PolicyChangeRequest + PolicyApproval |

### 8.2. Audit Requirements

- **PermissionAudit**: Lưu TẤT CẢ permission checks
- **PolicyChangeRequest**: Lưu 7 năm (SOC2 compliance)
- **PolicyApproval**: Lưu 7 năm

---

*Tài liệu được tạo: 2025-01-15*
*Phiên bản: 1.0*
