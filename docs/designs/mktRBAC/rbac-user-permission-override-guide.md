# RBAC User Permission Override - Hướng dẫn chi tiết

## 📋 Tổng quan

`MktUserPermissionOverride` là cơ chế **ghi đè quyền cá nhân** trong hệ thống RBAC, cho phép cấp hoặc thu hồi quyền đặc biệt cho một user cụ thể mà **không ảnh hưởng** đến Permission Template của user đó.

## 🎯 Vai trò trong hệ thống RBAC

### 1. Vị trí trong luồng kiểm tra quyền

```
User Request
    ↓
1️⃣ Check User Permission Overrides (PRIORITY HIGHEST)
    ↓
2️⃣ Check Permission Template (assigned templates)
    ↓
3️⃣ Check Access Limitations (template restrictions)
    ↓
4️⃣ Check Context & Conditions (data scope)
    ↓
Final Decision: ALLOW / DENY
```

**Override có priority cao nhất** - nếu có Override, hệ thống sẽ check Override trước tiên.

### 2. So sánh với Permission Template

| Tiêu chí | Permission Template | User Permission Override |
|----------|-------------------|-------------------------|
| **Phạm vi** | Áp dụng cho nhóm users (role-based) | Áp dụng cho 1 user cụ thể (user-specific) |
| **Tính chất** | Persistent, ổn định theo role | Temporary, có thể hết hạn |
| **Approval** | Không cần approve (system template) | **Bắt buộc approve** cho critical permissions |
| **Use case** | Quyền mặc định theo chức vụ | Exception, emergency, special project |
| **Priority** | Thấp hơn Override | **Cao nhất** trong hệ thống |

### 3. Hai loại Override

#### 🟢 GRANT Override (isAllowed = true)
Cấp thêm quyền mà user **không có** trong template

**Ví dụ:** STAFF được cấp quyền DELETE để xóa dữ liệu lỗi trong dự án đặc biệt

#### 🔴 REVOKE Override (isAllowed = false)
Thu hồi quyền mà user **đang có** trong template

**Ví dụ:** MANAGER bị thu hồi quyền APPROVE trong thời gian điều tra nội bộ

---

## 📊 Cấu trúc Entity

### Core Fields

```typescript
export class MktUserPermissionOverrideWorkspaceEntity {
  // User bị ảnh hưởng
  workspaceMemberId: string;

  // Resource & Action bị override
  resourceId: string;      // VD: CUSTOMERS, DEALS, INVOICES
  actionId: string;        // VD: DELETE, APPROVE, EXPORT

  // Override behavior
  isAllowed: boolean;      // true = GRANT, false = REVOKE

  // Context filter (optional)
  contextFilter?: object;  // JSON filter để giới hạn override

  // Expiration
  expiresAt?: Date;        // Khi nào override hết hạn

  // Audit trail
  reason: string;          // Lý do (enum: EMERGENCY_ACCESS, BUSINESS_EXCEPTION, etc)
  reasonDescription?: string;
  approvedBy?: WorkspaceMember;
  approvedAt?: Date;
  isActive: boolean;
}
```

---

## 🎬 Ví dụ chi tiết

### Scenario 1: Emergency Access (Truy cập khẩn cấp)

**Tình huống:**
- JANE là STAFF, chỉ có quyền READ customers (theo template)
- Khách hàng VIP gọi khẩn cấp lúc 10 PM, cần update thông tin ngay
- Manager JONY không online, JANE cần quyền UPDATE customers tạm thời

**Override Record:**

```typescript
{
  id: 'override-001',
  workspaceMemberId: 'JANE_ID',
  resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
  actionId: PERMISSION_ACTION_IDS.UPDATE,
  isAllowed: true,  // ✅ GRANT permission

  // Giới hạn: chỉ customer VIP này
  contextFilter: {
    customerId: 'customer-vip-123',
    scope: 'SINGLE_RECORD'
  },

  // Hết hạn sau 2 giờ
  expiresAt: '2024-10-01T12:00:00Z',

  reason: 'EMERGENCY_ACCESS',
  reasonDescription: 'Khách hàng VIP yêu cầu update thông tin khẩn cấp ngoài giờ',
  approvedById: 'TIM_ID',  // Admin approve qua phone
  approvedAt: '2024-10-01T10:05:00Z',
  isActive: true
}
```

**Luồng kiểm tra quyền:**

```
1. JANE request: UPDATE customer-vip-123
2. System check overrides:
   ✅ Found active override for JANE + CUSTOMERS + UPDATE
   ✅ Check contextFilter: customerId matches
   ✅ Check expiresAt: chưa hết hạn
   ✅ Check isActive: true
3. Result: ALLOW (không cần check template)
```

---

### Scenario 2: Business Exception (Ngoại lệ nghiệp vụ)

**Tình huống:**
- PHIL là TEAM_LEAD, có quyền EXPORT tối đa 5,000 records/day
- Dự án đặc biệt cần export 50,000 customer records để migrate sang hệ thống mới
- Dự án kéo dài 7 ngày

**Override Record:**

```typescript
{
  id: 'override-002',
  workspaceMemberId: 'PHIL_ID',
  resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
  actionId: PERMISSION_ACTION_IDS.EXPORT,
  isAllowed: true,  // ✅ GRANT enhanced permission

  // Override context: tăng limit lên 60,000/day
  contextFilter: {
    maxRecordsPerDay: 60000,
    dataCategory: 'MIGRATION_PROJECT',
    projectCode: 'PROJ-2024-MIG-001'
  },

  // Hết hạn sau 7 ngày
  expiresAt: '2024-10-08T23:59:59Z',

  reason: 'SPECIAL_PROJECT',
  reasonDescription: 'Migration project - Export toàn bộ customer data sang hệ thống CRM mới',
  approvedById: 'JONY_ID',  // Manager approve
  approvedAt: '2024-10-01T08:00:00Z',
  isActive: true
}
```

**Permission check flow:**

```
1. PHIL request: EXPORT 50,000 customers
2. Check template: TEAM_LEAD has EXPORT but limit 5,000/day
3. Check overrides:
   ✅ Found override for PHIL + CUSTOMERS + EXPORT
   ✅ contextFilter.maxRecordsPerDay: 60,000 (enough)
   ✅ Check expiresAt: còn 6 ngày
4. Result: ALLOW với limit 60,000
```

---

### Scenario 3: Temporary Revocation (Thu hồi tạm thời)

**Tình huống:**
- JONY là MANAGER, có quyền APPROVE deals up to 100M VND
- Công ty đang điều tra conflict of interest với nhà cung cấp
- Thu hồi quyền APPROVE của JONY trong thời gian điều tra (30 ngày)

**Override Record:**

```typescript
{
  id: 'override-003',
  workspaceMemberId: 'JONY_ID',
  resourceId: PERMISSION_RESOURCE_IDS.DEALS,
  actionId: PERMISSION_ACTION_IDS.APPROVE,
  isAllowed: false,  // ❌ REVOKE permission

  // Thu hồi toàn bộ, không có filter
  contextFilter: null,

  // Hết hạn sau 30 ngày (kết thúc điều tra)
  expiresAt: '2024-10-31T23:59:59Z',

  reason: 'AUDIT_REQUIREMENT',
  reasonDescription: 'Thu hồi quyền approve trong thời gian điều tra conflict of interest',
  approvedById: 'TIM_ID',  // Admin/CEO approve
  approvedAt: '2024-10-01T09:00:00Z',
  isActive: true
}
```

**Permission check flow:**

```
1. JONY request: APPROVE deal-50M
2. Check overrides:
   ⚠️ Found REVOKE override for JONY + DEALS + APPROVE
   ❌ isAllowed: false
3. Result: DENY (không check template, block ngay)
```

---

### Scenario 4: System Maintenance (Bảo trì hệ thống)

**Tình huống:**
- TIM là ADMIN, có full permissions
- Hệ thống đang migrate database, cần block ALL DELETE operations
- Block cả ADMIN trong 2 giờ maintenance

**Override Records:**

```typescript
// Override 1: Block DELETE cho TIM
{
  id: 'override-004-tim',
  workspaceMemberId: 'TIM_ID',
  resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
  actionId: PERMISSION_ACTION_IDS.DELETE,
  isAllowed: false,  // ❌ REVOKE
  contextFilter: null,
  expiresAt: '2024-10-01T14:00:00Z',  // 2 giờ
  reason: 'SYSTEM_MAINTENANCE',
  reasonDescription: 'Database migration - Block all DELETE operations',
  approvedById: 'TIM_ID',  // Self-approved
  approvedAt: '2024-10-01T12:00:00Z',
  isActive: true
}

// Override 2: Block DELETE cho JONY
{
  id: 'override-004-jony',
  workspaceMemberId: 'JONY_ID',
  resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
  actionId: PERMISSION_ACTION_IDS.DELETE,
  isAllowed: false,
  // ... same config
}

// ... tương tự cho all users
```

**Best practice:** Tạo batch overrides để block operations hàng loạt.

---

### Scenario 5: Compliance Requirement (Yêu cầu tuân thủ)

**Tình huống:**
- Công ty nhận audit GDPR
- Cần đảm bảo chỉ Data Protection Officer (DPO) mới có quyền EXPORT PII
- Thu hồi quyền EXPORT PII của tất cả users trừ DPO trong 90 ngày audit

**Override Records:**

```typescript
// Thu hồi EXPORT PII của MANAGER
{
  id: 'override-005-jony',
  workspaceMemberId: 'JONY_ID',
  resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
  actionId: PERMISSION_ACTION_IDS.EXPORT,
  isAllowed: false,  // ❌ REVOKE

  // Chỉ block EXPORT của PII fields
  contextFilter: {
    fieldRestrictions: ['email', 'phone', 'address', 'identityNumber'],
    dataClassification: 'PII_PROTECTED'
  },

  expiresAt: '2025-01-01T00:00:00Z',  // 90 ngày audit
  reason: 'COMPLIANCE_REQUIREMENT',
  reasonDescription: 'GDPR Audit - Restrict PII export to DPO only',
  approvedById: 'TIM_ID',
  approvedAt: '2024-10-01T08:00:00Z',
  isActive: true
}

// Cấp quyền EXPORT PII cho DPO (user mới, chưa có template)
{
  id: 'override-005-dpo',
  workspaceMemberId: 'DPO_USER_ID',
  resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
  actionId: PERMISSION_ACTION_IDS.EXPORT,
  isAllowed: true,  // ✅ GRANT

  contextFilter: {
    dataClassification: 'PII_PROTECTED',
    auditLogging: 'MANDATORY',
    mfaRequired: true
  },

  expiresAt: '2025-01-01T00:00:00Z',
  reason: 'COMPLIANCE_REQUIREMENT',
  reasonDescription: 'GDPR Audit - Grant PII export permission to DPO',
  approvedById: 'TIM_ID',
  approvedAt: '2024-10-01T08:00:00Z',
  isActive: true
}
```

---

## ⚙️ Context Filter Examples

### 1. Single Record Override

```json
{
  "scope": "SINGLE_RECORD",
  "recordId": "customer-123",
  "resourceType": "CUSTOMERS"
}
```

**Use case:** Cấp quyền cho 1 record cụ thể (VD: customer VIP)

### 2. Time-limited Override

```json
{
  "timeWindow": {
    "startHour": 18,
    "endHour": 22,
    "timezone": "Asia/Ho_Chi_Minh",
    "workingDays": [1, 2, 3, 4, 5]
  }
}
```

**Use case:** Chỉ cho phép quyền trong khung giờ cụ thể

### 3. Value-based Override

```json
{
  "maxAmount": 100000000,  // 100M VND
  "currency": "VND",
  "requiresSecondApproval": true
}
```

**Use case:** Tăng limit approve amount tạm thời

### 4. Field-level Override

```json
{
  "allowedFields": ["name", "email", "phone"],
  "deniedFields": ["creditCard", "bankAccount"],
  "fieldAccessLevel": "READ_ONLY"
}
```

**Use case:** Giới hạn quyền ở field level

### 5. Condition-based Override

```json
{
  "conditions": {
    "dealStage": ["NEGOTIATION", "PROPOSAL"],
    "assignedTo": "SELF",
    "createdByTeam": "TEAM_A"
  }
}
```

**Use case:** Override chỉ apply khi thỏa điều kiện

---

## 🔄 Permission Resolution Flow

### Complete Flow với Override

```typescript
async function checkPermission(
  userId: string,
  resource: string,
  action: string,
  context?: object
): Promise<boolean> {
  // 1️⃣ Check User Permission Overrides (HIGHEST PRIORITY)
  const overrides = await findActiveOverrides(userId, resource, action);

  if (overrides.length > 0) {
    // Sort by priority (most specific first)
    const sortedOverrides = sortOverridesBySpecificity(overrides);

    for (const override of sortedOverrides) {
      // Check expiration
      if (override.expiresAt && override.expiresAt < new Date()) {
        continue;
      }

      // Check context filter
      if (override.contextFilter) {
        const matchesContext = evaluateContextFilter(
          override.contextFilter,
          context
        );
        if (!matchesContext) {
          continue;
        }
      }

      // Found matching override
      if (!override.isAllowed) {
        // REVOKE: Deny immediately
        return false;
      } else {
        // GRANT: Allow immediately
        return true;
      }
    }
  }

  // 2️⃣ No matching override, check Permission Template
  const templates = await getUserTemplates(userId);
  const templatePermission = await checkTemplatePermissions(
    templates,
    resource,
    action
  );

  if (!templatePermission) {
    return false;
  }

  // 3️⃣ Check Access Limitations
  const limitations = await getTemplateLimitations(templates);
  const passesLimitations = await evaluateLimitations(
    limitations,
    context
  );

  if (!passesLimitations) {
    return false;
  }

  // 4️⃣ Check Context & Conditions
  const passesContext = await evaluateResourceContext(
    templates,
    resource,
    context
  );

  return passesContext;
}
```

---

## 📝 Best Practices

### 1. ✅ Khi nào nên dùng Override

- **Emergency access**: Cấp quyền khẩn cấp ngoài giờ
- **Temporary escalation**: Tăng quyền tạm thời cho dự án đặc biệt
- **Compliance audit**: Thu hồi/cấp quyền theo yêu cầu audit
- **System maintenance**: Block operations trong maintenance window
- **Business exception**: Exception cases không thể cover bằng template
- **User investigation**: Thu hồi quyền trong thời gian điều tra

### 2. ❌ Khi nào KHÔNG nên dùng Override

- **Permanent permission changes**: Nên update template thay vì override
- **Role-based permissions**: Nên tạo template mới thay vì override hàng loạt
- **Routine operations**: Override là exception, không phải rule
- **No approval**: Không nên dùng override cho critical permissions mà không có approval

### 3. 🔒 Security Guidelines

#### Mandatory Approval

```typescript
// Critical permissions REQUIRE approval
const REQUIRE_APPROVAL_ACTIONS = [
  'DELETE',
  'EXPORT',
  'APPROVE',
  'TRANSFER_OWNERSHIP',
  'GRANT_PERMISSION',
  'SYSTEM_CONFIGURATION'
];

// Cannot create override without approvedBy and approvedAt
if (REQUIRE_APPROVAL_ACTIONS.includes(action)) {
  if (!override.approvedById || !override.approvedAt) {
    throw new Error('Critical permission override requires approval');
  }
}
```

#### Expiration Policy

```typescript
// Override SHOULD have expiration for security
const MAX_OVERRIDE_DURATION = {
  EMERGENCY_ACCESS: 24 * 3600 * 1000,        // 24 hours
  BUSINESS_EXCEPTION: 30 * 24 * 3600 * 1000, // 30 days
  SPECIAL_PROJECT: 90 * 24 * 3600 * 1000,    // 90 days
  AUDIT_REQUIREMENT: 180 * 24 * 3600 * 1000  // 180 days
};

// Warn if override has no expiration
if (!override.expiresAt) {
  logger.warn('Override without expiration created', {
    overrideId: override.id,
    reason: override.reason
  });
}
```

#### Audit Logging

```typescript
// ALL override operations MUST be logged
async function createOverride(override: Override) {
  // Create override
  const created = await repository.save(override);

  // Log to audit trail
  await auditLog.create({
    action: 'PERMISSION_OVERRIDE_CREATED',
    userId: override.workspaceMemberId,
    resource: override.resourceId,
    permission: override.actionId,
    isAllowed: override.isAllowed,
    reason: override.reason,
    approvedBy: override.approvedById,
    expiresAt: override.expiresAt,
    timestamp: new Date()
  });

  // Send notification
  await notifySecurityTeam({
    type: 'PERMISSION_OVERRIDE',
    override: created
  });

  return created;
}
```

### 4. 📊 Monitoring & Alerting

#### Auto-expiration Job

```typescript
// Cron job chạy mỗi giờ để deactivate expired overrides
async function cleanupExpiredOverrides() {
  const expired = await repository.find({
    where: {
      isActive: true,
      expiresAt: LessThan(new Date())
    }
  });

  for (const override of expired) {
    override.isActive = false;
    await repository.save(override);

    await auditLog.create({
      action: 'PERMISSION_OVERRIDE_EXPIRED',
      overrideId: override.id,
      userId: override.workspaceMemberId
    });
  }
}
```

#### Alert on suspicious overrides

```typescript
// Alert nếu có override GRANT critical permission
const CRITICAL_PERMISSIONS = ['DELETE', 'GRANT_PERMISSION', 'SYSTEM_CONFIGURATION'];

if (override.isAllowed && CRITICAL_PERMISSIONS.includes(override.action)) {
  await alertSecurityTeam({
    level: 'HIGH',
    message: `Critical permission override created`,
    userId: override.workspaceMemberId,
    permission: override.action,
    approver: override.approvedById
  });
}
```

---

## 🎓 Summary

### Key Takeaways

1. **Override có priority cao nhất** trong hệ thống RBAC
2. **Hai loại:** GRANT (cấp thêm) và REVOKE (thu hồi)
3. **Use cases chính:** Emergency, Exception, Compliance, Maintenance
4. **Bắt buộc approval** cho critical permissions
5. **Nên có expiration** để đảm bảo security
6. **Context filter** để giới hạn phạm vi override
7. **Audit logging** mandatory cho compliance

### Relationship Map

```
User Permission Override (PRIORITY 1)
    ↓ (if no override matches)
Permission Template (PRIORITY 2)
    ↓ (applies)
Template Access Limitations (RESTRICTIONS)
    ↓ (filters)
Permission Context (DATA SCOPE)
    ↓ (final check)
Resource Permission (ALLOWED ACTIONS)
```

### Decision Tree

```
User makes request
    ↓
Check active overrides?
    ├─ Yes, REVOKE found → ❌ DENY (stop here)
    ├─ Yes, GRANT found → ✅ ALLOW (stop here)
    └─ No override → Continue to template check
                          ↓
                    Template has permission?
                          ├─ No → ❌ DENY
                          └─ Yes → Check limitations
                                        ↓
                                  Passes limitations?
                                        ├─ No → ❌ DENY
                                        └─ Yes → Check context
                                                    ↓
                                              Matches context?
                                                    ├─ No → ❌ DENY
                                                    └─ Yes → ✅ ALLOW
```

---

## 📚 Related Docs

- [RBAC Template Access Limitation Guide](./rbac-template-access-limitation-guide.md)
- [RBAC Simplified Setup Guide](./RBAC_SIMPLIFIED_SETUP_GUIDE.md)
- [Permission Context System](./rbac-permission-context-guide.md)

---

**Last Updated:** 2024-10-01
**Version:** 1.0.0
**Maintainer:** RBAC Development Team
