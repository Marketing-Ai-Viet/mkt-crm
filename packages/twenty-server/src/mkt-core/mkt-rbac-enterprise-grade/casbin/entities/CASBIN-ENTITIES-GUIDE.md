# Casbin Entities Guide

Tài liệu giải thích các WorkspaceEntity trong hệ thống Casbin RBAC.

## Tổng quan

Thư mục `entities/` chứa 4 workspace entity phục vụ hệ thống authorization Casbin:

| Entity | Mục đích | Quan hệ |
|--------|----------|---------|
| `MktCasbinRuleWorkspaceEntity` | Lưu trữ policy rules | Standalone |
| `MktPolicyVersionWorkspaceEntity` | Theo dõi phiên bản sync | Standalone |
| `MktPolicyChangeRequestWorkspaceEntity` | Yêu cầu thay đổi policy | 1:N với Approval |
| `MktPolicyApprovalWorkspaceEntity` | Phê duyệt thay đổi | N:1 với ChangeRequest |

---

## 1. MktCasbinRuleWorkspaceEntity

**File:** `mkt-casbin-rule.workspace-entity.ts`

### Mục đích
Lưu trữ các policy rules của Casbin trong mỗi workspace schema. Mỗi workspace có bộ policies riêng biệt (multi-tenant isolation).

### Policy Types (ptype)

| ptype | Tên | Mô tả | Ví dụ |
|-------|-----|-------|-------|
| `p` | Permission | Quyền truy cập resource | `p, role:admin, mktCustomer, read, allow` |
| `g` | Role Assignment | Gán user vào role | `g, user:uuid-123, role:admin` |
| `g2` | Resource Grouping | Nhóm resources | `g2, mktCustomer, crm_entities` |

### Fields

```typescript
{
  ptype: string;      // 'p', 'g', hoặc 'g2'
  subject: string;    // user:id hoặc role:name
  object: string;     // Resource target (mktCustomer, mktOrder, ...)
  action: string;     // read, create, update, delete, *
  effect: string;     // 'allow' hoặc 'deny'
  condition: string;  // ABAC condition (optional)
}
```

### Indexes
- `ptype` - Lọc theo loại policy
- `subject` - Tìm policies của user/role
- `ptype + subject` - Composite lookup
- `ptype + subject + object` - Full policy lookup

### Use Cases
- CasbinEnforcerService load policies vào enforcer
- PolicySyncService tạo policies từ permission templates
- WorkspaceCasbinRuleRepository CRUD operations

---

## 2. MktPolicyVersionWorkspaceEntity

**File:** `mkt-policy-version.workspace-entity.ts`

### Mục đích
Theo dõi phiên bản policy sync của mỗi workspace để:
- Cache invalidation khi policies thay đổi
- Optimistic locking cho concurrent updates
- Audit tracking cho compliance

### Fields

```typescript
{
  version: number;       // Số phiên bản (tăng sau mỗi sync)
  policyHash: string;    // SHA-256 hash của tất cả policies
  policyCount: number;   // Tổng số policies
  syncedAt: Date;        // Thời điểm sync cuối
}
```

### Workflow

```
1. PolicySyncService chạy sync
2. Tính hash mới của policies
3. So sánh với policyHash hiện tại
4. Nếu khác → tăng version, cập nhật hash
5. CasbinEnforcerService check version để invalidate cache
```

### Use Cases
- PolicyVersionRepository.getCurrentVersion()
- PolicyVersionRepository.incrementVersion()
- Cache invalidation trigger

---

## 3. MktPolicyChangeRequestWorkspaceEntity

**File:** `mkt-policy-change-request.workspace-entity.ts`

### Mục đích
Quản lý workflow phê duyệt cho các thay đổi policy có rủi ro cao (high-risk changes).

### Tại sao cần?
Một số policy changes có thể gây rủi ro bảo mật:
- Wildcard permissions (`action: *`)
- Admin role assignments
- Sensitive resource access
- Permission template modifications

Những thay đổi này cần qua quy trình phê duyệt (approval workflow).

### Status Flow

```
PENDING → APPROVED → APPLIED
       ↘ REJECTED
       ↘ EXPIRED (sau 72h không xử lý)
```

### Fields

```typescript
{
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'EXPIRED';
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  policyData: object;           // Policy JSON cần thay đổi
  riskAssessment: object;       // Kết quả đánh giá rủi ro
  requiredApprovals: number;    // Số approvals cần (1 hoặc 2)
  currentApprovals: number;     // Số approvals đã nhận
  requestReason: string;        // Lý do business
  requestedById: string;        // Người yêu cầu
  approvals: Approval[];        // Danh sách approvals
}
```

### Risk Assessment

HighRiskPolicyValidator đánh giá và xác định:
- Risk level: LOW, MEDIUM, HIGH, CRITICAL
- Detected patterns: WILDCARD_ACTION, ADMIN_ROLE, etc.
- Required approvals: 1 (HIGH) hoặc 2 (CRITICAL - dual-sign)

### Compliance
- Lưu trữ 7 năm cho SOC2 compliance
- Audit trail đầy đủ cho security review

---

## 4. MktPolicyApprovalWorkspaceEntity

**File:** `mkt-policy-approval.workspace-entity.ts`

### Mục đích
Ghi nhận từng approval/rejection cho policy change request.

### Fields

```typescript
{
  decision: 'APPROVED' | 'REJECTED';
  reason: string;              // Lý do approve/reject
  changeRequestId: string;     // FK đến ChangeRequest
  approverId: string;          // Người phê duyệt
}
```

### Business Rules
- **Self-approval prevention**: Người yêu cầu không thể tự approve
- **Dual-sign**: CRITICAL changes cần 2 approvers khác nhau
- **Immutable**: Approval không thể sửa sau khi tạo

### Workflow Example

```
1. User A tạo ChangeRequest (wildcard permission)
2. HighRiskPolicyValidator → CRITICAL, cần 2 approvals
3. User B approve (currentApprovals: 1)
4. User C approve (currentApprovals: 2 = requiredApprovals)
5. Status → APPROVED
6. PolicyApprovalService apply policy
7. Status → APPLIED
```

---

## Entity Relationships

```
┌─────────────────────────────────────────┐
│     MktPolicyChangeRequestWorkspaceEntity │
│                                         │
│  id: string                             │
│  status: PENDING|APPROVED|...           │
│  policyData: {...}                      │
│  requiredApprovals: 2                   │
│  currentApprovals: 1                    │
│                                         │
│  approvals: MktPolicyApprovalWorkspaceEntity[] ──┐
└─────────────────────────────────────────┘        │
                                                    │
      ┌────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│     MktPolicyApprovalWorkspaceEntity    │
│                                         │
│  id: string                             │
│  decision: APPROVED|REJECTED            │
│  reason: "LGTM"                         │
│  approverId: "user-uuid-456"            │
│                                         │
│  changeRequest ──────────────────────────┘
│  changeRequestId: "request-uuid-123"    │
└─────────────────────────────────────────┘
```

---

## Services sử dụng Entities

| Entity | Service | Operations |
|--------|---------|------------|
| CasbinRule | WorkspaceCasbinRuleRepository | find, save, remove |
| CasbinRule | CasbinEnforcerService | loadPolicies |
| CasbinRule | PolicySyncService | sync from templates |
| PolicyVersion | PolicyVersionRepository | get, increment |
| PolicyVersion | CacheWarmerService | check staleness |
| ChangeRequest | PolicyApprovalService | create, update status |
| Approval | PolicyApprovalService | create, validate |

---

## Indexes Strategy

Tất cả entities sử dụng partial index với điều kiện `"deletedAt" IS NULL` để:
- Tối ưu query performance
- Chỉ index active records
- Support soft delete pattern

---

## Migration Notes

Khi thêm entity mới:
1. Thêm standardId vào `mkt-object-ids.ts`
2. Thêm field IDs vào `mkt-field-ids.ts`
3. Export từ `entities/index.ts`
4. Run workspace:sync-metadata
