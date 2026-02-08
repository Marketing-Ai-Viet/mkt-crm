# RBAC Enterprise Grade Module — Báo cáo kiểm tra

> **Ngày kiểm tra:** 2026-02-07
> **Module:** `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/`
> **Trạng thái tổng thể:** ~85% hoàn thiện

---

## 1. Tổng quan kiến trúc

### 1.1 Thành phần đã có

| Thành phần | Số lượng | Trạng thái |
|------------|----------|------------|
| Workspace Entities | 17 | Hoàn thiện |
| Services | 19 | 7 items chưa implement |
| Guards | 2 | 1 guard có logic chưa hoàn thiện |
| Interceptors | 1 | Hoàn thiện |
| Background Jobs | 2 | Hoàn thiện |
| Seeders | Có | Hoàn thiện |
| Unit Tests | 0 | Chưa có |

### 1.2 Entities (17)

| Entity | Mô tả |
|--------|-------|
| `mkt-permission-template` | Template phân quyền theo vai trò |
| `mkt-permission-resource` | Tài nguyên được bảo vệ |
| `mkt-permission-action` | Hành động trên tài nguyên (CRUD, export...) |
| `mkt-template-resource-permission` | Mapping template ↔ resource ↔ actions |
| `mkt-template-system-action` | System-level actions trong template |
| `mkt-template-access-limitation` | Giới hạn truy cập theo template |
| `mkt-user-permission-template` | Gán template cho user |
| `mkt-user-permission-override` | Override quyền riêng cho user |
| `mkt-permission-context` | Ngữ cảnh phân quyền (IP, time, device...) |
| `mkt-permission-priority-config` | Cấu hình độ ưu tiên permission |
| `mkt-data-access-policy` | Chính sách truy cập dữ liệu (row-level) |
| `mkt-permission-audit` | Audit log phân quyền |
| `mkt-casbin-rule` | Casbin policy rules |
| `mkt-policy-version` | Versioning cho policy |
| `mkt-policy-change-request` | Yêu cầu thay đổi policy |
| `mkt-policy-approval` | Phê duyệt thay đổi policy |
| `mkt-temporary-permission` | Quyền tạm thời có thời hạn |

### 1.3 Sơ đồ Permission Resolution Flow

```
Request vào Guard
    │
    ▼
┌─────────────────────────────────┐
│  Priority 2000: User Override   │ ← ❌ CHƯA IMPLEMENT
│  (mktUserPermissionOverride)    │
└────────────┬────────────────────┘
             │ không tìm thấy override
             ▼
┌─────────────────────────────────┐
│  Priority 1000: Template Check  │ ← ✅ Hoàn thiện
│  (mktUserPermissionTemplate)    │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Casbin Policy Evaluation       │ ← ✅ Hoàn thiện
│  (CasbinAuthzGuard)            │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Hierarchical Access Check      │ ← ⚠️ Thiếu peer manager
│  (HierarchicalAccessEvaluator) │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Data Scope Interceptor         │ ← ✅ Hoàn thiện
│  (Row-level security filter)   │
└─────────────────────────────────┘
```

---

## 2. Các thành phần ĐÃ hoàn thiện

### 2.1 Services hoạt động đầy đủ

| Service | Chức năng |
|---------|-----------|
| `RbacEnforcerService` | Permission checking logic chính |
| `RbacCacheService` | Multi-tier caching (memory + Redis) |
| `RbacContextService` | Resolve user context (roles, departments, level) |
| `RbacAuditService` | Audit logging và analysis |
| `FilterExpressionResolverService` | Resolve template variables trong filter |
| `DataAccessPolicyService` | CRUD + policy evaluation cho row-level security |

### 2.2 Guards & Interceptors hoạt động đầy đủ

| Component | Chức năng |
|-----------|-----------|
| `CasbinAuthzGuard` | Guard dựa trên Casbin policy engine |
| `DataScopeInterceptor` | Row-level security interceptor (APP_INTERCEPTOR) |

### 2.3 Background Jobs

| Job | Chức năng |
|-----|-----------|
| Policy Sync Job | Đồng bộ Casbin policies |
| Cache Warmup Job | Preload permission cache khi khởi động |

---

## 3. Các phần CHƯA hoàn thiện

### 3.1 HIGH PRIORITY — Lỗ hổng bảo mật

#### RBAC-001: `canGrantPermissions()` luôn trả về `true`

| | |
|---|---|
| **File** | `services/bases/temporary-permission.service.ts` ~line 685 |
| **Severity** | **CRITICAL** |
| **Mức độ** | ~30-50 LOC |

**Hiện trạng:**

```typescript
// TODO: Implement actual permission check
canGrantPermissions(): { canGrant: boolean } {
  return { canGrant: true };
}
```

**Rủi ro:** Bất kỳ user nào cũng có thể grant temporary permission cho người khác mà không bị kiểm tra quyền.

**Cần implement:**

- Kiểm tra người grant có quyền trên resource được grant không
- Validate granter's hierarchy level >= target user's level
- Enforce rule: chỉ grant được quyền mình đang có
- Log audit trail cho mọi grant action

---

#### RBAC-002: User Permission Override chưa implement

| | |
|---|---|
| **File** | `guards/department-authorization.guard.ts` ~line 140 |
| **Severity** | **HIGH** |
| **Mức độ** | ~50-80 LOC |

**Hiện trạng:**

```typescript
// Priority 2000: User Override (mktUserPermissionOverride)
// TODO: implement
```

**Rủi ro:** Entity `mktUserPermissionOverride` đã có nhưng không bao giờ được query → admin không thể override quyền cho user cụ thể.

**Cần implement:**

- Query `mktUserPermissionOverride` theo userId + resource + action
- Check expiration date nếu có
- Return override result với priority 2000 (cao nhất)
- Cache kết quả trong `RbacCacheService`

---

### 3.2 MEDIUM PRIORITY — Thiếu tính năng

#### RBAC-003: Peer Manager Resolution trả về mảng rỗng

| | |
|---|---|
| **File** | `services/hierarchical-access-evaluator.service.ts` ~line 478 |
| **Severity** | **MEDIUM** |
| **Mức độ** | ~40-60 LOC |

**Hiện trạng:**

```typescript
resolvePeerManagers(): string[] {
  // TODO: Implement peer manager resolution
  return [];
}
```

**Hậu quả:** Peer restriction không hoạt động — manager A có thể thấy data của team manager B cùng cấp.

**Cần implement:**

1. Lấy department hiện tại của user → tìm `parentDepartmentId`
2. Query tất cả departments có cùng `parentDepartmentId`
3. Lấy `managerId` của các departments đó (trừ user hiện tại)
4. Return danh sách peer manager IDs

---

#### RBAC-004: Department Ancestor Code Mapping trả về mảng rỗng

| | |
|---|---|
| **File** | `guards/department-authorization.guard.ts` ~line 428 |
| **Severity** | **MEDIUM** |
| **Mức độ** | ~15-30 LOC |

**Hiện trạng:**

```typescript
extractAncestorCodes(): string[] {
  // TODO: Implement logic để map ancestor IDs sang ancestor codes
  return [];
}
```

**Hậu quả:** Hierarchical department authorization check dựa trên code không hoạt động.

**Cần implement:**

- Query `mktDepartmentAncestry` để lấy ancestor IDs
- Map sang department codes qua `mktDepartment` entity
- Cache kết quả trong user context

---

#### RBAC-005: Permission Context Caching không hoạt động

| | |
|---|---|
| **File** | `services/bases/permission-context.service.ts` ~line 411, 423 |
| **Severity** | **MEDIUM** |
| **Mức độ** | ~20-40 LOC |

**Hiện trạng:**

```typescript
getCachedContext() {
  // TODO: Implement caching cho permission context trong RbacCacheService
  return null;
}

setCachedContext() {
  // TODO: Implement caching cho permission context trong RbacCacheService
}
```

**Hậu quả:** Mỗi request đều resolve permission context từ DB → performance impact khi traffic cao.

**Cần implement:**

- Sử dụng `RbacCacheService` (đã có sẵn multi-tier cache)
- Cache key: `perm-ctx:{userId}:{resource}:{action}`
- TTL: 5-10 phút (configurable)

---

### 3.3 LOW PRIORITY — Enhancement

#### RBAC-006: Template Cloning chỉ copy metadata

| | |
|---|---|
| **File** | `services/bases/permission-template.service.ts` ~line 403 |
| **Severity** | **LOW** |
| **Mức độ** | ~25-40 LOC |

**Hiện trạng:**

```typescript
// TODO: Clone resource permissions and system actions
```

**Cần implement:**

- Clone `mktTemplateResourcePermission` records với template ID mới
- Clone `mktTemplateSystemAction` records
- Remap tất cả foreign keys

---

#### RBAC-007: Manager ID Resolution trả về `null`

| | |
|---|---|
| **File** | `services/hierarchical-access-evaluator.service.ts` ~line 182 |
| **Severity** | **LOW** |
| **Mức độ** | ~5-10 LOC |

**Hiện trạng:**

```typescript
currentManagerId: null, // TODO: Resolve from department
```

**Cần implement:** Query `department.managerId` từ department entity của user hiện tại.

---

## 4. Ma trận đánh giá

| ID | Tên | Severity | LOC ước tính | Dependencies |
|----|-----|----------|-------------|--------------|
| RBAC-001 | canGrantPermissions validation | CRITICAL | 30-50 | RbacEnforcerService |
| RBAC-002 | User Permission Override | HIGH | 50-80 | UserPermissionOverride repo, RbacCacheService |
| RBAC-003 | Peer Manager Resolution | MEDIUM | 40-60 | Department repo, Hierarchy repo |
| RBAC-004 | Ancestor Code Mapping | MEDIUM | 15-30 | DepartmentAncestry repo |
| RBAC-005 | Permission Context Caching | MEDIUM | 20-40 | RbacCacheService |
| RBAC-006 | Template Cloning | LOW | 25-40 | ResourcePermission/SystemAction repos |
| RBAC-007 | Manager ID Resolution | LOW | 5-10 | Department repo |
| **Tổng** | | | **~185-310** | |

---

## 5. Thứ tự implement đề xuất

### Phase 1 — Security (bắt buộc trước production nếu RBAC đã bật)

1. **RBAC-001**: Fix `canGrantPermissions()` — ngăn chặn unauthorized permission grant
2. **RBAC-002**: Implement User Permission Override — hoàn thiện permission resolution flow

### Phase 2 — Hierarchical Access (cần cho multi-department)

3. **RBAC-003**: Peer Manager Resolution
4. **RBAC-004**: Ancestor Code Mapping
5. **RBAC-007**: Manager ID Resolution

### Phase 3 — Performance & Enhancement

6. **RBAC-005**: Permission Context Caching
7. **RBAC-006**: Template Cloning

---

## 6. Ghi chú

- Module được đánh dấu `@Global()` nên tự đăng ký, không cần import trong `mkt-core.module.ts`
- Casbin engine đã hoạt động đầy đủ với policy sync
- Row-level security (DataScopeInterceptor) đã hoạt động
- Audit logging đã hoàn thiện
- Nếu RBAC chưa bật (chưa apply `@UseGuards` lên resolver), tất cả các items trên có thể defer mà không ảnh hưởng hệ thống
