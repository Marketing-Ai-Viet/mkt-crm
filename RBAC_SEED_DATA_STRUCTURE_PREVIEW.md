# RBAC Seed Data Structure Preview

## Overview

Tài liệu này mô tả cấu trúc seed data đầy đủ cho 5 Permission Templates với:
- **Resource Permissions**: 21 resources × 5 templates = 105 entries
- **System Actions**: 113 actions × 5 templates = 565 entries (filtered by role)
- **Access Limitations**: ~5-10 limitations per template = 25-50 entries

## Data Structure

### 1. Permission Template

```typescript
type MktPermissionTemplateDataSeed = {
  id: string;
  templateKey: string;              // 'ADMIN', 'MANAGER', 'TEAM_LEAD', 'STAFF', 'INTERN'
  templateName: string;
  description?: string;
  hierarchyLevel: number;           // 1-5
  applicableToLevels: string;       // JSON string: [1] or [2] etc.
  version: string;
  isSystemTemplate: boolean;
  isActive: boolean;
  priority: number;                 // 1000, 700, 600, 500, 300
  createdBySource: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  position?: number;
};
```

### 2. Resource Permission (MktTemplateResourcePermission)

```typescript
type ResourcePermissionSeed = {
  id: string;                       // UUID
  templateId: string;               // Links to Permission Template
  resourceId: string;               // Links to Permission Resource
  actionKey: string;                // 'READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'
  isAllowed: boolean;               // true/false
  configuration?: object;           // JSON config
  restrictions?: object;            // JSON restrictions
  isActive: boolean;
};
```

### 3. System Action Permission (MktTemplateSystemAction)

```typescript
type SystemActionSeed = {
  id: string;                       // UUID
  templateId: string;               // Links to Permission Template
  actionKey: string;                // Action key from PERMISSION_ACTION_KEYS
  isAllowed: boolean;               // true/false
  configuration?: object;           // JSON config
  restrictions?: object;            // JSON restrictions
  isActive: boolean;
};
```

### 4. Access Limitation (MktTemplateAccessLimitation)

```typescript
type AccessLimitationSeed = {
  id: string;                       // UUID
  templateId: string;               // Links to Permission Template
  limitationType: string;           // 'RECORD_VALUE', 'PRIORITY_LEVEL', 'TIME_RESTRICTION', etc.
  limitationKey: string;            // Unique key for limitation
  limitationValue: object;          // JSON value
  isEnforced: boolean;
  severity: string;                 // 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
  isActive: boolean;
};
```

## Example Seed Structure for ADMIN Template

### ADMIN - Resource Permissions (21 resources × ~5 actions each = ~105 entries)

```typescript
{
  id: 'uuid-1',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
  resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
  actionKey: 'READ',
  isAllowed: true,
  configuration: {
    scope: 'ALL_RECORDS',
    contextFilter: null  // No filter - can access all
  },
  restrictions: null,
  isActive: true
},
{
  id: 'uuid-2',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
  resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
  actionKey: 'CREATE',
  isAllowed: true,
  configuration: {
    scope: 'ALL_RECORDS',
    requiresApproval: false
  },
  restrictions: null,
  isActive: true
},
// ... 103 more entries for ADMIN
```

### ADMIN - System Actions (113 actions)

```typescript
{
  id: 'uuid-action-1',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
  actionKey: 'BYPASS_WORKFLOW_APPROVAL',
  isAllowed: true,
  configuration: {
    requiresMFA: true,
    auditLevel: 'COMPREHENSIVE'
  },
  restrictions: null,
  isActive: true
},
{
  id: 'uuid-action-2',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
  actionKey: 'ACCESS_SALARY_DATA',
  isAllowed: true,
  configuration: {
    requiresMFA: true,
    requiresReason: true,
    auditLevel: 'COMPREHENSIVE'
  },
  restrictions: null,
  isActive: true
},
// ... 111 more actions
```

### ADMIN - Access Limitations (Minimal)

```typescript
{
  id: 'uuid-limit-1',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
  limitationType: 'MFA_REQUIRED',
  limitationKey: 'SENSITIVE_DATA_MFA',
  limitationValue: {
    requiredFor: ['SALARY_DATA', 'CONFIDENTIAL_INFO'],
    mfaMethod: ['TOTP', 'SMS']
  },
  isEnforced: true,
  severity: 'CRITICAL',
  isActive: true
}
```

## Example Seed Structure for MANAGER Template

### MANAGER - Resource Permissions (Filtered by department scope)

```typescript
{
  id: 'uuid-mgr-1',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
  resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
  actionKey: 'READ',
  isAllowed: true,
  configuration: {
    scope: 'DEPARTMENT_RECORDS',
    contextFilter: 'departmentId = :userDepartmentId'
  },
  restrictions: null,
  isActive: true
},
{
  id: 'uuid-mgr-2',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
  resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
  actionKey: 'DELETE',
  isAllowed: false,  // MANAGER cannot DELETE customers without approval
  configuration: {
    scope: 'DEPARTMENT_RECORDS',
    requiresApproval: true,
    approverLevel: 'ADMIN'
  },
  restrictions: {
    message: 'Delete action requires ADMIN approval'
  },
  isActive: true
},
{
  id: 'uuid-mgr-3',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
  resourceId: PERMISSION_RESOURCE_IDS.SALARY_DATA,
  actionKey: 'READ',
  isAllowed: false,  // MANAGER cannot access salary data
  configuration: null,
  restrictions: {
    message: 'Salary data access restricted to ADMIN only'
  },
  isActive: true
}
```

### MANAGER - System Actions (~75 actions)

```typescript
{
  id: 'uuid-mgr-action-1',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
  actionKey: 'APPROVE_TRANSACTIONS',
  isAllowed: true,
  configuration: {
    maxAmount: {
      SALES: 50000000,      // 50M VND for Sales dept
      ADMIN: 100000000,     // 100M VND for Admin dept
      DEFAULT: 50000000
    },
    requiresDocumentation: true
  },
  restrictions: {
    escalateIf: 'amount > configuration.maxAmount'
  },
  isActive: true
},
{
  id: 'uuid-mgr-action-2',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
  actionKey: 'BYPASS_WORKFLOW_APPROVAL',
  isAllowed: false,  // MANAGER cannot bypass workflows
  configuration: null,
  restrictions: {
    message: 'Workflow bypass restricted to ADMIN only'
  },
  isActive: true
}
```

### MANAGER - Access Limitations

```typescript
{
  id: 'uuid-mgr-limit-1',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
  limitationType: 'TRANSACTION_VALUE',
  limitationKey: 'MAX_APPROVAL_AMOUNT',
  limitationValue: {
    SALES: 50000000,
    ADMIN: 100000000,
    SUPPORT: 50000000,
    ACCOUNTING: 100000000
  },
  isEnforced: true,
  severity: 'ERROR',
  isActive: true
},
{
  id: 'uuid-mgr-limit-2',
  templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
  limitationType: 'TIME_RESTRICTION',
  limitationKey: 'WORKING_HOURS',
  limitationValue: {
    startTime: '07:00',
    endTime: '19:00',
    timezone: 'Asia/Ho_Chi_Minh',
    allowedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  },
  isEnforced: false,  // Warning only, not blocking
  severity: 'WARNING',
  isActive: true
}
```

## Complete Mapping Table

### Resource Permissions Matrix

| Resource | ADMIN | MANAGER | TEAM_LEAD | STAFF | INTERN |
|----------|-------|---------|-----------|-------|--------|
| **CUSTOMERS** | | | | | |
| - READ | ✅ All | ✅ Dept | ✅ Team | ✅ Own | ✅ Own (RO) |
| - CREATE | ✅ | ✅ | ✅ | ✅ | ⚠️ Approval |
| - UPDATE | ✅ | ✅ Dept | ✅ Team | ✅ Own | ❌ |
| - DELETE | ✅ | ⚠️ Approval | ❌ | ❌ | ❌ |
| - EXPORT | ✅ | ✅ Dept | ✅ Team | ✅ Own | ❌ |
| **ORDERS** | | | | | |
| - READ | ✅ All | ✅ Dept | ✅ Team | ✅ Own | ✅ Own (RO) |
| - CREATE | ✅ | ✅ | ✅ | ✅ | ⚠️ Approval |
| - UPDATE | ✅ | ✅ Dept | ✅ Team | ✅ Own | ❌ |
| - DELETE | ✅ | ⚠️ >50M | ❌ | ❌ | ❌ |
| - EXPORT | ✅ | ✅ Dept | ✅ Team | ✅ Own | ❌ |
| **SALARY_DATA** | | | | | |
| - READ | ✅ MFA | ❌ | ❌ | ❌ | ❌ |
| - CREATE | ✅ MFA | ❌ | ❌ | ❌ | ❌ |
| - UPDATE | ✅ MFA | ❌ | ❌ | ❌ | ❌ |
| - DELETE | ⚠️ Restricted | ❌ | ❌ | ❌ | ❌ |
| - EXPORT | ✅ MFA | ❌ | ❌ | ❌ | ❌ |

### System Actions Matrix

| Action Category | ADMIN | MANAGER | TEAM_LEAD | STAFF | INTERN |
|----------------|-------|---------|-----------|-------|--------|
| **BASIC_CRUD** | 4/4 | 4/4 (scoped) | 4/4 (scoped) | 3/4 | 1/4 (READ) |
| **ADVANCED** | 6/6 | 5/6 | 3/6 | 2/6 | 0/6 |
| **SYSTEM** | 6/6 | 0/6 | 0/6 | 0/6 | 0/6 |
| **APPROVAL** | 3/3 | 3/3 (limited) | 2/3 (limited) | 0/3 | 0/3 |
| **BULK_OPERATIONS** | 4/4 | 2/4 | 0/4 | 0/4 | 0/4 |
| **TEAM_MANAGEMENT** | 4/4 | 4/4 | 3/4 | 0/4 | 0/4 |
| **FINANCIAL** | 4/4 | 2/4 | 0/4 | 0/4 | 0/4 |
| **CUSTOMER_MGMT** | 4/4 | 4/4 (dept) | 2/4 | 1/4 | 0/4 |
| **COMMUNICATION** | 4/4 | 4/4 | 4/4 | 4/4 | 3/4 |
| **DEAL_MANAGEMENT** | 3/3 | 3/3 (limited) | 2/3 (limited) | 1/3 | 0/3 |
| **REPORTING** | 4/4 | 4/4 | 3/4 | 2/4 | 1/4 |
| **USER_MANAGEMENT** | 4/4 | 2/4 | 1/4 | 0/4 | 0/4 |
| **AUTOMATION** | 3/3 | 1/3 | 0/3 | 0/3 | 0/3 |
| **SECURITY_OPS** | 3/3 | 0/3 | 0/3 | 0/3 | 0/3 |

## File Size Estimation

### Total Seeds Required:

```
Permission Templates: 5 templates

Resource Permissions:
- ADMIN: 21 resources × 5 actions = 105 entries
- MANAGER: 21 resources × 5 actions = 105 entries (many with restrictions)
- TEAM_LEAD: 21 resources × 5 actions = 105 entries (many isAllowed=false)
- STAFF: 21 resources × 5 actions = 105 entries (many isAllowed=false)
- INTERN: 21 resources × 5 actions = 105 entries (mostly isAllowed=false)
Total: ~525 entries

System Actions:
- ADMIN: 113 actions (all allowed)
- MANAGER: ~75 actions (filtered)
- TEAM_LEAD: ~50 actions (filtered)
- STAFF: ~30 actions (filtered)
- INTERN: ~15 actions (filtered)
Total: ~283 entries

Access Limitations:
- ADMIN: ~3 limitations
- MANAGER: ~10 limitations
- TEAM_LEAD: ~10 limitations
- STAFF: ~10 limitations
- INTERN: ~15 limitations
Total: ~48 entries

GRAND TOTAL: 5 + 525 + 283 + 48 = 861 entries
Estimated File Size: ~4,000-5,000 lines of code
```

## Implementation Strategy

### Option 1: Single Comprehensive File (Recommended for Review)
Tạo một file lớn với tất cả seed data, dễ review và maintain.

**Pros:**
- Tất cả ở một chỗ, dễ tìm kiếm
- Có thể review toàn bộ permissions một lần
- Dễ so sánh giữa các templates

**Cons:**
- File rất lớn (~4000-5000 dòng)
- Khó navigate khi edit

### Option 2: Split by Template (Better for Maintenance)
Tạo 5 files riêng cho mỗi template:
- `mkt-permission-template-admin-seeds.constants.ts`
- `mkt-permission-template-manager-seeds.constants.ts`
- `mkt-permission-template-team-lead-seeds.constants.ts`
- `mkt-permission-template-staff-seeds.constants.ts`
- `mkt-permission-template-intern-seeds.constants.ts`

**Pros:**
- Dễ navigate và maintain
- Có thể parallel develop
- Rõ ràng về responsibility

**Cons:**
- Khó so sánh cross-template
- Import phức tạp hơn

### Option 3: Split by Entity Type (Best for Scalability)
Tạo 3 files theo entity type:
- `mkt-template-resource-permissions-seeds.constants.ts` (525 entries)
- `mkt-template-system-actions-seeds.constants.ts` (283 entries)
- `mkt-template-access-limitations-seeds.constants.ts` (48 entries)

**Pros:**
- Logic separation rõ ràng
- Dễ scale khi thêm templates
- Type safety tốt hơn

**Cons:**
- Khó see big picture của một template

## Recommended Approach

**Phase 1**: Tạo file single comprehensive để review (Option 1)
**Phase 2**: Sau khi approved, refactor thành Option 3 cho production

Bạn muốn tôi proceed với option nào?

---

**Next Steps:**
1. ✅ Confirm approach
2. ⏳ Generate full seed data
3. ⏳ Add TypeScript types
4. ⏳ Add validation logic
5. ⏳ Create seeder service
6. ⏳ Add migration script
7. ⏳ Write tests
