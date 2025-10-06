# Hệ thống RBAC SIMPLIFIED - 5 Bước

## Tổng quan

Hệ thống RBAC (Role-Based Access Control) của CRM sử dụng **SIMPLIFIED mode với 5 bước validation** để kiểm tra quyền truy cập theo module và hành động CRUD (Create, Read, Update, Delete).

### Mục tiêu

- ✅ **Đơn giản**: Chỉ 5 bước validation cơ bản
- ✅ **Hiệu năng cao**: Tối ưu cho CRUD operations (~10-20ms)
- ✅ **Template-based**: Quyền được quản lý qua Permission Templates
- ✅ **Module-level**: Phân quyền theo module (Company, Person, Opportunity, Task, etc.)
- ✅ **Action-level**: Hỗ trợ CREATE, READ, UPDATE, DELETE cho mỗi module

### Kiến trúc Database

```sql
-- 1. Permission Template (Role/Template definition)
mktPermissionTemplate {
  id: UUID
  templateKey: TEXT           -- VD: "MANAGER", "STAFF", "ADMIN"
  templateName: TEXT          -- VD: "Quản lý", "Nhân viên", "Quản trị"
  description: TEXT
  hierarchyLevel: NUMBER      -- Cấp bậc (1=CEO, 2=Manager, 3=Staff)
  isActive: BOOLEAN
  priority: NUMBER            -- Độ ưu tiên template
}

-- 2. User-Template Assignment
mktUserPermissionTemplate {
  id: UUID
  workspaceMemberId: UUID     -- FK to workspaceMember (User)
  templateId: UUID            -- FK to mktPermissionTemplate
  isActive: BOOLEAN
  assignedAt: TIMESTAMP
  expiresAt: TIMESTAMP        -- Optional: Template có thời hạn
}

-- 3. Template Resource Permissions (Module permissions)
mktTemplateResourcePermission {
  id: UUID
  templateId: UUID            -- FK to mktPermissionTemplate
  resourceId: UUID            -- FK to mktPermissionResource (Module)
  allowedActions: JSONB       -- ["CREATE", "READ", "UPDATE", "DELETE"]
  deniedActions: JSONB        -- Explicit denies (optional)
  conditions: JSONB           -- Điều kiện bổ sung (optional)
  restrictions: JSONB         -- Giới hạn (optional)
  isActive: BOOLEAN
}

-- 4. Permission Resources (Modules/Objects)
mktPermissionResource {
  id: UUID
  resourceKey: TEXT           -- VD: "COMPANY", "PERSON", "OPPORTUNITY"
  resourceName: TEXT          -- VD: "Công ty", "Liên hệ", "Cơ hội"
  resourceCategory: TEXT      -- VD: "CRM", "SALES", "ADMIN"
  isActive: BOOLEAN
}

-- 5. Permission Actions (CRUD actions)
mktPermissionAction {
  id: UUID
  actionKey: TEXT             -- VD: "CREATE", "READ", "UPDATE", "DELETE"
  actionName: TEXT            -- VD: "Tạo", "Xem", "Sửa", "Xóa"
  actionCategory: TEXT        -- VD: "BASIC_CRUD", "ADVANCED"
  riskLevel: TEXT             -- VD: "LOW", "MEDIUM", "HIGH"
  requiresApproval: BOOLEAN
  isActive: BOOLEAN
}
```

---

## 5 Bước Validation

### **Flow tổng quan:**

```
Request → Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Decision (PASS/FAIL)
```

---

### **Step 1: Pre-Validation** (Validation cơ bản)

**Mục đích:** Kiểm tra input cơ bản và điều kiện tiên quyết

**Kiểm tra:**
```typescript
✅ User có workspaceMemberId hợp lệ?
✅ Action có hợp lệ? (CREATE/READ/UPDATE/DELETE)
✅ Resource (module) có được chỉ định?
✅ Request có đầy đủ thông tin cần thiết?
```

**Output:**
- ✅ PASS: Tiếp tục Step 2
- ❌ FAIL: Dừng validation, trả về lỗi "Invalid input"

**Ví dụ:**
```json
{
  "userContext": {
    "workspaceMemberId": "uuid-123",
    "userId": "user-456"
  },
  "resourceContext": {
    "objectName": "company",  // Module: Company
    "resourceType": "CRM"
  },
  "action": "READ"
}
```

---

### **Step 2: User Context Resolution** (Giải quyết thông tin user)

**Mục đích:** Lấy đầy đủ thông tin user và templates được assign

**Database queries:**
```sql
-- 1. Lấy thông tin workspace member
SELECT * FROM workspaceMember
WHERE id = :workspaceMemberId AND deletedAt IS NULL;

-- 2. Lấy templates được assign cho user (cached 15 phút)
SELECT
  upt.*,
  pt.templateKey,
  pt.templateName,
  pt.hierarchyLevel,
  pt.priority
FROM mktUserPermissionTemplate upt
JOIN mktPermissionTemplate pt ON pt.id = upt.templateId
WHERE upt.workspaceMemberId = :workspaceMemberId
  AND upt.isActive = true
  AND upt.deletedAt IS NULL
  AND pt.isActive = true
  AND pt.deletedAt IS NULL
  AND (upt.expiresAt IS NULL OR upt.expiresAt > NOW());
```

**Output:**
```typescript
{
  workspaceMemberId: "uuid-123",
  userId: "user-456",
  assignedTemplates: [
    {
      templateId: "template-1",
      templateKey: "MANAGER",
      templateName: "Quản lý",
      hierarchyLevel: 2,
      priority: 500
    }
  ],
  isActive: true
}
```

**Cache:**
- Key: `rbac:user:context:{workspaceMemberId}`
- TTL: 15 phút
- Hit rate mong đợi: 85-90%

---

### **Step 3: Resource Identification** (Xác định module/resource)

**Mục đích:** Xác định resource (module) đang được truy cập

**Database queries:**
```sql
-- Lấy thông tin resource (cached 24 giờ)
SELECT * FROM mktPermissionResource
WHERE resourceKey = :resourceKey  -- VD: 'COMPANY', 'PERSON'
  AND isActive = true
  AND deletedAt IS NULL;
```

**Mapping objectName → resourceKey:**
```typescript
const RESOURCE_MAPPING = {
  // CRM modules
  'company': 'COMPANY',
  'person': 'PERSON',
  'opportunity': 'OPPORTUNITY',
  'note': 'NOTE',
  'task': 'TASK',
  'attachment': 'ATTACHMENT',

  // Product modules
  'mktProduct': 'PRODUCT',
  'mktCategory': 'CATEGORY',
  'mktOrder': 'ORDER',

  // Admin modules
  'workspaceMember': 'USER_MANAGEMENT',
  'view': 'VIEW_MANAGEMENT',
};
```

**Output:**
```typescript
{
  objectName: "company",
  resourceType: "CRM",
  resourceKey: "COMPANY",
  resourceName: "Công ty",
  resourceCategory: "CRM_BASIC",
  isSensitive: false
}
```

**Cache:**
- Key: `rbac:config:resources:{workspaceId}:{resourceKey}`
- TTL: 24 giờ (config data rất ít thay đổi)

---

### **Step 4: Permission Template Check** (Kiểm tra template permissions)

**Mục đích:** Kiểm tra xem user có template nào cho phép truy cập resource này không

**Database queries:**
```sql
-- Lấy resource permissions cho tất cả templates của user (cached 10 phút)
SELECT
  trp.*,
  pr.resourceKey,
  pr.resourceName
FROM mktTemplateResourcePermission trp
JOIN mktPermissionResource pr ON pr.id = trp.resourceId
WHERE trp.templateId IN (:templateIds)  -- Từ Step 2
  AND trp.isActive = true
  AND trp.deletedAt IS NULL
  AND pr.isActive = true
  AND pr.deletedAt IS NULL;
```

**Logic kiểm tra:**
```typescript
// 1. Tìm permission cho resource này
const permission = templatePermissions.find(
  p => p.resourceKey === resourceContext.resourceKey
);

if (!permission) {
  return FAIL; // Không có permission cho resource này
}

// 2. Kiểm tra allowedActions
if (!permission.allowedActions.includes(action)) {
  return FAIL; // Action không được phép
}

// 3. Kiểm tra deniedActions (nếu có)
if (permission.deniedActions?.includes(action)) {
  return FAIL; // Action bị deny tường minh
}

return PASS; // Template cho phép action này
```

**Ví dụ permission data:**
```json
{
  "templateId": "template-manager-001",
  "resourceId": "resource-company-001",
  "resourceKey": "COMPANY",
  "allowedActions": ["CREATE", "READ", "UPDATE"],
  "deniedActions": ["DELETE"],
  "conditions": null,
  "restrictions": null
}
```

**Output:**
```typescript
{
  hasPermission: true,
  matchingTemplate: {
    templateKey: "MANAGER",
    priority: 500
  },
  allowedActions: ["CREATE", "READ", "UPDATE"],
  deniedActions: ["DELETE"]
}
```

**Cache:**
- Key: `rbac:template:permissions:user:{workspaceMemberId}`
- TTL: 10 phút
- Hit rate mong đợi: 90-95%

---

### **Step 5: Action Permission Validation** (Validation hành động CRUD)

**Mục đích:** Validation chi tiết action cụ thể và phân loại risk

**Database queries:**
```sql
-- Lấy thông tin action (cached 24 giờ)
SELECT * FROM mktPermissionAction
WHERE actionKey = :actionKey  -- 'CREATE', 'READ', 'UPDATE', 'DELETE'
  AND isActive = true
  AND deletedAt IS NULL;
```

**Logic phân loại action:**
```typescript
// Action classification
const actionClassification = {
  actionCategory: 'BASIC_CRUD',  // BASIC_CRUD | ADVANCED | BULK_OPERATIONS
  riskLevel: 'LOW',              // LOW | MEDIUM | HIGH | CRITICAL
  requiresApproval: false,
  isSystemAction: false,
  isBulkOperation: false
};

// Risk level dựa trên action + resource
if (action === 'DELETE') {
  actionClassification.riskLevel = 'MEDIUM';
}

if (action === 'DELETE' && resourceCategory === 'FINANCIAL') {
  actionClassification.riskLevel = 'HIGH';
}

if (action === 'BULK_DELETE') {
  actionClassification.riskLevel = 'CRITICAL';
  actionClassification.requiresApproval = true;
}
```

**Output:**
```typescript
{
  actionType: "READ",
  actionCategory: "BASIC_CRUD",
  riskLevel: "LOW",
  requiresApproval: false,
  isSystemAction: false,
  constraints: {}
}
```

**Cache:**
- Key: `rbac:config:actions:{workspaceId}:{actionKey}`
- TTL: 24 giờ

---

## Decision Logic (Aggregation)

Sau 5 steps, orchestrator sử dụng `aggregateStepResults()` để tạo decision:

```typescript
function aggregateStepResults(steps) {
  let allowed = true;

  // Nếu BẤT KỲ step nào FAIL → FAIL
  for (const step of steps) {
    if (step.result === 'FAIL' || step.result === 'ERROR') {
      allowed = false;
      break;
    }
  }

  return {
    result: allowed ? 'PASS' : 'FAIL',
    reason: allowed
      ? 'Permission granted'
      : 'Permission denied - see step failures',
    stepResults: steps
  };
}
```

**Decision outcomes:**
- ✅ **PASS**: Tất cả 5 steps pass → Cho phép truy cập
- ❌ **FAIL**: Bất kỳ step nào fail → Từ chối truy cập

**Không có:**
- ❌ Weighted scoring (tất cả steps đều quan trọng)
- ❌ CONDITIONAL_GRANT (chỉ PASS/FAIL)
- ❌ REQUIRE_APPROVAL (workflow phức tạp)
- ❌ ESCALATE (không cần trong SIMPLIFIED mode)

---

## Performance Metrics

### Target Performance

| Metric | Target | Thực tế |
|--------|--------|---------|
| Total validation time | < 20ms | 10-15ms (with cache) |
| Step 1 (Pre-validation) | < 1ms | ~0.5ms |
| Step 2 (User context) | < 5ms | 2ms (cached), 8ms (DB) |
| Step 3 (Resource ID) | < 3ms | 1ms (cached), 5ms (DB) |
| Step 4 (Template check) | < 8ms | 3ms (cached), 10ms (DB) |
| Step 5 (Action validation) | < 3ms | 1ms (cached), 4ms (DB) |

### Cache Strategy

| Cache Type | Key Pattern | TTL | Expected Hit Rate |
|------------|-------------|-----|-------------------|
| User Context | `rbac:user:context:{memberId}` | 15 min | 85-90% |
| Template Permissions | `rbac:template:permissions:user:{memberId}` | 10 min | 90-95% |
| Config Resources | `rbac:config:resources:{workspaceId}:{key}` | 24h | 95-99% |
| Config Actions | `rbac:config:actions:{workspaceId}:{key}` | 24h | 95-99% |

---

## Ví dụ Use Cases

### Use Case 1: User xem danh sách công ty

```typescript
// Request
const context = {
  userContext: {
    workspaceMemberId: "member-123",
    userId: "user-456"
  },
  resourceContext: {
    objectName: "company",
    resourceType: "CRM"
  },
  action: "READ"
};

// Validation flow:
// Step 1: ✅ PASS - Input hợp lệ
// Step 2: ✅ PASS - User có template "STAFF"
// Step 3: ✅ PASS - Resource "COMPANY" tồn tại
// Step 4: ✅ PASS - Template "STAFF" có permission READ trên COMPANY
// Step 5: ✅ PASS - Action READ có risk level LOW, không cần approval

// Result: ✅ PASS - Cho phép xem danh sách công ty
```

### Use Case 2: User xóa công ty

```typescript
// Request
const context = {
  userContext: {
    workspaceMemberId: "member-789",
    userId: "user-101"
  },
  resourceContext: {
    objectName: "company",
    resourceType: "CRM"
  },
  action: "DELETE"
};

// Validation flow:
// Step 1: ✅ PASS - Input hợp lệ
// Step 2: ✅ PASS - User có template "STAFF"
// Step 3: ✅ PASS - Resource "COMPANY" tồn tại
// Step 4: ❌ FAIL - Template "STAFF" chỉ có READ/UPDATE, không có DELETE
// Step 5: (Skipped - Step 4 đã fail)

// Result: ❌ FAIL - Không có quyền xóa công ty
```

### Use Case 3: Manager tạo opportunity mới

```typescript
// Request
const context = {
  userContext: {
    workspaceMemberId: "member-555",
    userId: "user-666"
  },
  resourceContext: {
    objectName: "opportunity",
    resourceType: "SALES"
  },
  action: "CREATE"
};

// Validation flow:
// Step 1: ✅ PASS - Input hợp lệ
// Step 2: ✅ PASS - User có template "MANAGER"
// Step 3: ✅ PASS - Resource "OPPORTUNITY" tồn tại
// Step 4: ✅ PASS - Template "MANAGER" có permission CREATE trên OPPORTUNITY
// Step 5: ✅ PASS - Action CREATE có risk level LOW

// Result: ✅ PASS - Cho phép tạo opportunity
```

---

## Configuration

### Environment Variables

```bash
# Validation mode (SIMPLIFIED or FULL)
RBAC_VALIDATION_MODE=SIMPLIFIED

# Cache TTLs (milliseconds)
RBAC_CACHE_USER_CONTEXT_TTL=900000      # 15 minutes
RBAC_CACHE_TEMPLATE_PERMS_TTL=600000    # 10 minutes
RBAC_CACHE_CONFIG_TTL=86400000          # 24 hours

# Performance thresholds
RBAC_MAX_VALIDATION_TIME=50             # ms
RBAC_ENABLE_PARALLEL_STEPS=true
```

### Constants

```typescript
// File: enterprise-rbac.constants.ts
export const ENTERPRISE_RBAC_CONFIG = {
  VALIDATION_MODE: 'SIMPLIFIED',  // 5 steps only
  ENABLE_CACHING: true,
  ENABLE_PARALLEL_EXECUTION: true,
  MAX_VALIDATION_TIME: 50,        // ms
};

// Execution groups (parallel where possible)
const SIMPLIFIED_GROUPS = [
  [STEP_1_PRE_VALIDATION],                          // Group 1 (sequential)
  [STEP_2_USER_CONTEXT, STEP_3_RESOURCE_ID],       // Group 2 (parallel)
  [STEP_4_TEMPLATE_CHECK, STEP_5_ACTION_VALIDATION] // Group 3 (parallel)
];
```

---

## API Usage

### GraphQL Example

```graphql
mutation checkPermission {
  checkPermission(
    input: {
      workspaceMemberId: "member-123"
      objectName: "company"
      action: "READ"
    }
  ) {
    allowed
    reason
    validationTime
    stepResults {
      step
      name
      result
      duration
    }
  }
}
```

### REST API Example

```typescript
POST /api/v1/rbac/check-permission

Request:
{
  "workspaceMemberId": "member-123",
  "objectName": "company",
  "action": "READ"
}

Response (PASS):
{
  "allowed": true,
  "result": "PASS",
  "reason": "Permission granted",
  "confidence": 100,
  "validationTime": 12,
  "stepResults": [
    { "step": 1, "name": "Pre-Validation", "result": "PASS", "duration": 0.5 },
    { "step": 2, "name": "User Context", "result": "PASS", "duration": 2.0 },
    { "step": 3, "name": "Resource ID", "result": "PASS", "duration": 1.0 },
    { "step": 4, "name": "Template Check", "result": "PASS", "duration": 3.5 },
    { "step": 5, "name": "Action Validation", "result": "PASS", "duration": 1.0 }
  ]
}

Response (FAIL):
{
  "allowed": false,
  "result": "FAIL",
  "reason": "Permission denied - Template does not allow DELETE action",
  "confidence": 0,
  "validationTime": 8,
  "stepResults": [
    { "step": 1, "name": "Pre-Validation", "result": "PASS", "duration": 0.5 },
    { "step": 2, "name": "User Context", "result": "PASS", "duration": 2.0 },
    { "step": 3, "name": "Resource ID", "result": "PASS", "duration": 1.0 },
    { "step": 4, "name": "Template Check", "result": "FAIL", "duration": 3.5 },
    { "step": 5, "name": "Action Validation", "result": "SKIP", "duration": 0 }
  ]
}
```

---

## So sánh SIMPLIFIED vs FULL Mode

| Feature | SIMPLIFIED (5 steps) | FULL (15 steps) |
|---------|---------------------|-----------------|
| **Steps** | 5 core steps | 15 comprehensive steps |
| **Performance** | 10-20ms | 30-80ms |
| **Use Case** | Basic CRUD | Enterprise features |
| **Decision** | Binary (PASS/FAIL) | 6 outcomes (GRANT/DENY/CONDITIONAL/etc) |
| **Weighted Scoring** | ❌ No | ✅ Yes |
| **Hierarchy Validation** | ❌ No | ✅ Yes |
| **Data Access Policies** | ❌ No | ✅ Yes |
| **Dynamic Conditions** | ❌ No | ✅ Yes (time/location/device) |
| **Sensitive Data Checks** | ❌ No | ✅ Yes |
| **Approval Workflow** | ❌ No | ✅ Yes |
| **Audit Logging** | Basic | Comprehensive |
| **Step 15 (Final Decision)** | ❌ Not used | ✅ Used |

---

## Migration Path

Khi cần nâng cấp lên FULL mode:

```typescript
// 1. Change environment variable
RBAC_VALIDATION_MODE=FULL

// 2. System tự động sử dụng 15 steps
// 3. Step 15 (Final Decision) sẽ được kích hoạt
// 4. Hỗ trợ đầy đủ enterprise features:
//    - Weighted decision scoring
//    - Hierarchy validation
//    - Data access policies
//    - Approval workflows
//    - Cross-department controls
```

---

## Troubleshooting

### Debug Mode

```typescript
// Enable debug logging
RBAC_DEBUG_MODE=true
RBAC_LOG_LEVEL=debug

// Logs sẽ hiển thị:
// - Cache HIT/MISS cho mỗi step
// - Step execution time
// - Decision logic reasoning
```

### Common Issues

**Issue 1: Permission bị từ chối nhưng user có template**
```bash
Nguyên nhân: Template không có permission cho resource/action đó
Giải pháp: Kiểm tra mktTemplateResourcePermission, thêm action vào allowedActions
```

**Issue 2: Performance chậm (>50ms)**
```bash
Nguyên nhân: Cache miss rate cao
Giải pháp:
- Kiểm tra Redis connection
- Tăng cache TTL
- Warm up cache sau deploy
```

**Issue 3: User không thấy template mới**
```bash
Nguyên nhân: Cache user context chưa expire
Giải pháp:
- Đợi 15 phút (TTL)
- Hoặc invalidate cache: DELETE rbac:user:context:{memberId}
```

---

## Kết luận

Hệ thống RBAC SIMPLIFIED với 5 bước cung cấp:

✅ **Performance cao**: 10-20ms validation time
✅ **Đơn giản**: Chỉ cần hiểu Template → Resource → Action
✅ **Đủ dùng**: Đáp ứng 95% use cases CRUD cơ bản
✅ **Dễ maintain**: Ít moving parts, dễ debug
✅ **Scalable**: Cache strategy đảm bảo scale tốt

Phù hợp cho: **CRM basic operations, module-based permissions, CRUD workflows**

Không phù hợp cho: **Complex approval flows, cross-department policies, time-based restrictions** → Cần nâng cấp lên FULL mode (15 steps)
