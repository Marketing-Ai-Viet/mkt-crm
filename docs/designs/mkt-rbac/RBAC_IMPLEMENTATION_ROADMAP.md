# Roadmap Triển Khai Hệ Thống RBAC Theo Role và Phòng Ban

## Tổng Quan

Roadmap này mô tả các giai đoạn triển khai hệ thống phân quyền RBAC (Role-Based Access Control) kết hợp với phân quyền theo phòng ban cho CRM.

**Cập nhật lần cuối:** 2025-01-14

---

## Trạng Thái Tổng Quan

| Phase | Trạng thái | Tiến độ |
|-------|-----------|---------|
| Phase 1: Foundation | ✅ Hoàn thành | 100% |
| Phase 2: Core Services | ✅ Hoàn thành | 100% |
| Phase 3: Integration | ✅ Hoàn thành | 100% |
| Phase 4: Data Seeding | ✅ Hoàn thành | 100% |
| Phase 5: Advanced Features | 🟡 Đang thực hiện | ~60% |
| Phase 6: Documentation & CLI | ⚪ Chưa bắt đầu | 0% |

---

## Phase 1: Foundation - Thiết Lập Nền Tảng ✅ 100%

### 1.1 Database Schema & Entities

| Task | Mô tả | Status | Records |
|------|-------|--------|---------|
| Tạo `MktOrganizationLevel` entity | Cấp bậc tổ chức | ✅ Done | 11 |
| Tạo `MktPermissionResource` entity | Định nghĩa resources | ✅ Done | 12 |
| Tạo `MktPermissionTemplate` entity | Template quyền | ✅ Done | 8 |
| Tạo `MktTemplateResourcePermission` entity | Mapping template → resource | ✅ Done | 22 |
| Tạo `MktUserPermissionTemplate` entity | Gán template cho user | ✅ Done | 3 |
| Tạo `MktDataAccessPolicy` entity | Row-level security | ✅ Done | 8 |
| Tạo `MktCasbinRule` entity | Casbin policy storage | ✅ Done | 24 |
| Tạo `MktTemporaryPermission` entity | Quyền tạm thời | ✅ Done | 8 |
| Tạo `MktPermissionAudit` entity | Audit log | ✅ Done | 10 |
| Tạo `MktPermissionAction` entity | Định nghĩa actions | ✅ Done | 12 |
| Tạo `MktTemplateSystemAction` entity | System actions | ✅ Done | 45 |
| Tạo `MktDepartmentAncestry` entity | Ancestry tracking | ✅ Done | 19 |

### 1.2 Cập Nhật Entities Hiện Có

| Task | Mô tả | Status |
|------|-------|--------|
| Thêm `organizationLevelId` vào `workspaceMember` | Liên kết cấp bậc | ✅ Done |
| Thêm `supportForMemberId` vào `workspaceMember` | Hỗ trợ support access | ✅ Done |
| Thêm `departmentId` vào `workspaceMember` | Liên kết phòng ban | ✅ Done |
| Cập nhật `MktDepartment` với `managerId` | Xác định người quản lý | ✅ Done |
| Tạo `MktDepartmentSubManager` entity | Phó quản lý | ✅ Done |
| Tạo `MktDepartmentHierarchy` entity | Tree structure | ✅ Done (19 records) |

### 1.3 Helper Functions (Source Code)

| Task | Mô tả | Status |
|------|-------|--------|
| `getDataAccessScopeByLevel()` | Lấy scope theo hierarchy level | ✅ Done |
| `hasFullAccess()` | Check level có full access (1-3) | ✅ Done |
| `canManageTeam()` | Check level có thể quản lý team (1-7) | ✅ Done |
| `canViewSubordinates()` | Check level có thể xem cấp dưới (1-7) | ✅ Done |
| `getSubordinateLevels()` | Lấy các levels cấp dưới | ✅ Done |
| `getSuperiorLevels()` | Lấy các levels cấp trên | ✅ Done |

---

## Phase 2: Core Services - Xây Dựng Services Chính ✅ 100%

### 2.1 RBAC Core Services

| Task | Mô tả | Status | File |
|------|-------|--------|------|
| `RbacContextService` | Resolve user context (dept, level, team) | ✅ Done | `services/rbac-context.service.ts` |
| `RbacEnforcerService` | Permission check chính | ✅ Done | `services/rbac-enforcer.service.ts` |
| `RbacCacheService` | Cache permissions trong Redis | ✅ Done | `services/rbac-cache.service.ts` |
| `CasbinEnforcerService` | Casbin enforcer management | ✅ Done | `casbin/services/casbin-enforcer.service.ts` |
| `PolicySyncService` | Sync policies to Casbin rules | ✅ Done | `casbin/services/policy-sync.service.ts` |
| `RbacMetricsService` | Metrics và monitoring | ✅ Done | `casbin/services/rbac-metrics.service.ts` |
| `RoleInheritanceCacheService` | Cache role inheritance | ✅ Done | `casbin/services/role-inheritance-cache.service.ts` |
| `CacheWarmerService` | Warm cache on startup | ✅ Done | `casbin/services/cache-warmer.service.ts` |
| `PolicyApprovalService` | Policy approval workflow | ✅ Done | `casbin/services/policy-approval.service.ts` |

### 2.2 Department Hierarchy Services

| Task | Mô tả | Status | File |
|------|-------|--------|------|
| `DepartmentTreeService` | Quản lý tree structure | ✅ Done | `mkt-department/services/department-tree.service.ts` |
| `DepartmentAncestryService` | Ancestry tracking | ✅ Done | `mkt-department/services/department-ancestry.service.ts` |
| `DepartmentService` | Department CRUD | ✅ Done | `mkt-department/services/department.service.ts` |

### 2.3 Permission Services

| Task | Mô tả | Status | File |
|------|-------|--------|------|
| `PermissionTemplateService` | CRUD cho permission templates | ✅ Done | `services/permission-template.service.ts` |
| `UserPermissionTemplateService` | Gán/thu hồi template cho user | ✅ Done | `services/user-permission-template.service.ts` |

### 2.4 Permission Services - Hoàn Thành

| Task | Mô tả | Status | File |
|------|-------|--------|------|
| `TemplateResourcePermissionService` | Quản lý resource permissions | ✅ Done | `services/template-resource-permission.service.ts` |
| `DataAccessPolicyService` | CRUD cho data access policies | ✅ Done | `services/data-access-policy.service.ts` |
| `TemporaryPermissionService` | Quản lý quyền tạm thời | ✅ Done | `services/temporary-permission.service.ts` |
| `RbacAuditService` | Logging permission checks | ✅ Done | `services/rbac-audit.service.ts` |

---

## Phase 3: Integration - Tích Hợp Vào Hệ Thống ✅ 100%

### 3.1 Guards & Decorators

| Task | Mô tả | Status | File |
|------|-------|--------|------|
| `CasbinAuthzGuard` | NestJS guard cho permission check | ✅ Done | `casbin/guards/casbin-authz.guard.ts` |
| `@RequirePermission()` decorator | Decorator cho controllers | ✅ Done | `casbin/decorators/require-permission.decorator.ts` |
| `@Permission()` decorator | Permission decorator | ✅ Done | `decorators/permission.decorator.ts` |

### 3.2 GraphQL Resolvers

| Task | Mô tả | Status | File |
|------|-------|--------|------|
| `PolicyManagementResolver` | CRUD policies | ✅ Done | `resolvers/policy-management.resolver.ts` |
| `PermissionCheckResolver` | Permission check queries | ✅ Done | `resolvers/permission-check.resolver.ts` |
| `AuditLogResolver` | Audit log queries | ✅ Done | `resolvers/audit-log.resolver.ts` |

### 3.3 Interceptors & Hooks

| Task | Mô tả | Status | File |
|------|-------|--------|------|
| `DataScopeInterceptor` | Apply data filters tự động | ✅ Done | `interceptors/data-scope.interceptor.ts` |
| `@DataScope()` decorator | Decorator cho data filtering | ✅ Done | `decorators/data-scope.decorator.ts` |
| `filterToWhere()` utils | Convert filters to TypeORM WHERE | ✅ Done | `interceptors/utils/filter-to-where.utils.ts` |

### 3.4 Hooks

| Task | Mô tả | Status | File |
|------|-------|--------|------|
| `RbacDataFilterHook` | Apply data filters | ✅ Done | `hooks/rbac-data-filter.pre-query.hook.ts` |
| `RbacPermissionCheckHook` | Check permission trước mutation | ✅ Done | `hooks/rbac-permission-check.pre-query.hook.ts` |
| `RbacAuditHook` | Audit logging sau query | ✅ Done | `hooks/rbac-audit.post-query.hook.ts` |

---

## Phase 4: Data Seeding - Dữ Liệu Khởi Tạo ✅ 100%

### 4.1 System Data

| Task | Mô tả | Status | Notes |
|------|-------|--------|-------|
| Seed Organization Levels | Cấp bậc mặc định | ✅ Done | 11 levels |
| Seed Permission Resources | Resources cho mkt-core | ✅ Done | 12 resources |
| Seed System Templates | Templates quyền | ✅ Done | 8 templates |
| Seed Default Policies | Row-level policies | ✅ Done | 8 policies |
| Seed Permission Actions | Actions (CRUD...) | ✅ Done | 12 actions |
| Seed Casbin Rules | Casbin rules | ✅ Done | 24 rules |

### 4.2 Seeder Commands

| Task | Mô tả | Status | File |
|------|-------|--------|------|
| `mkt-organization-level-seed` | Seed organization levels | ✅ Done | `commands/mkt-organization-level-data-seed-dev-workspace.command.ts` |
| `mkt-permission-resource-seed` | Seed resources | ✅ Done | `rbac-seeder/mkt-permission-resource/...command.ts` |
| `mkt-permission-template-seed` | Seed templates | ✅ Done | `rbac-seeder/mkt-permission-template/...command.ts` |
| `mkt-data-access-policy-seed` | Seed policies | ✅ Done | `commands/mkt-data-access-policy-data-seed-dev-workspace.command.ts` |
| `mkt-casbin-rule-seed` | Seed Casbin rules | ✅ Done | `rbac-seeder/casbin-seeder/mkt-casbin-rule/...command.ts` |
| `rbac-seeder:sync` | Sync to Casbin | ✅ Done | `mkt-rbac-enterprise-grade/commands/rbac-sync.command.ts` |

---

## Phase 5: Advanced Features 🟡 ~60%

### 5.1 Real-time Sync

| Task | Mô tả | Status | File |
|------|-------|--------|------|
| PostgreSQL NOTIFY watcher | Notify khi policy thay đổi | ✅ Done | `casbin/watchers/pg-notify.watcher.ts` |
| Fallback periodic reload | Reload khi watcher fail | ✅ Done | `casbin/services/casbin-enforcer.service.ts` |
| Circuit breaker pattern | Fault tolerance | ✅ Done | `casbin/services/casbin-enforcer.service.ts` |
| Policy version validation | Cache staleness check | ✅ Done | `casbin/services/casbin-enforcer.service.ts` |

### 5.2 Health & Monitoring

| Task | Mô tả | Status | File |
|------|-------|--------|------|
| `RbacHealthIndicator` | Health checks | ✅ Done | `casbin/health/rbac-health.indicator.ts` |
| Structured metrics | Counters, histograms | ✅ Done | `casbin/services/rbac-metrics.service.ts` |
| Dead letter queue | Failed sync tracking | ✅ Done | `casbin/repositories/policy-version.repository.ts` |

### 5.3 Analytics & Monitoring - Còn Thiếu

| Task | Mô tả | Status | Priority |
|------|-------|--------|----------|
| Prometheus metrics export | Permission metrics | ⚪ Pending | 🟢 Low |
| Audit dashboard | Admin UI cho audit logs | ⚪ Pending | 🟢 Low |
| Alert rules | Alert khi deny rate cao | ⚪ Pending | 🟢 Low |

---

## Phase 6: Documentation & CLI Tools ⚪ 0%

### 6.1 Documentation

| Task | Mô tả | Status | Priority |
|------|-------|--------|----------|
| API Documentation | GraphQL schema docs | ⚪ Pending | 🟢 Low |
| Admin Guide | Hướng dẫn cấu hình | ⚪ Pending | 🟢 Low |
| Developer Guide | Hướng dẫn tích hợp | ⚪ Pending | 🟢 Low |

### 6.2 CLI Tools

| Task | Mô tả | Status | Priority |
|------|-------|--------|----------|
| `rbac:debug` command | Debug permission cho user | ⚪ Pending | 🟢 Low |
| `rbac:sync` command | Sync policies | ⚪ Pending | 🟢 Low |
| `rbac:health` command | Health check | ⚪ Pending | 🟢 Low |

---

## Centralized Constants

### Infrastructure Constants

| File | Mô tả | Status |
|------|-------|--------|
| `infrastructure/redis/constants/rbac/casbin-cache.constants.ts` | Cache keys & TTL | ✅ Done |
| `infrastructure/redis/constants/rbac/rbac.constant.ts` | Metrics, sync, circuit breaker, health thresholds | ✅ Done |
| `infrastructure/redis/constants/pubsub.constant.ts` | Pub/Sub channels & defaults | ✅ Done |
| `infrastructure/redis/constants/cache-ttl.constant.ts` | Centralized TTL config | ✅ Done |

---

## Dependency Graph

```
Phase 1 (Foundation) ✅ 100%
    │
    ├──► Phase 2 (Core Services) ✅ 100%
    │        │
    │        ├──► Phase 3 (Integration) ✅ 100%
    │        │        │
    │        │        └──► Phase 5 (Advanced) 🟡 60%
    │        │
    │        └──► Phase 4 (Data Seeding) ✅ 100%
    │
    └──► Phase 6 (Documentation) ⚪ 0%
```

---

## Công Việc Tiếp Theo (Next Actions)

### 🔴 Ưu Tiên Cao

1. ~~**DataScopeInterceptor** + **@DataScope()**~~ - ✅ Done
2. ~~**PermissionTemplateService**~~ - ✅ Done
3. ~~**UserPermissionTemplateService**~~ - ✅ Done
4. ~~**Hook Integration**~~ - ✅ Done

### 🟡 Ưu Tiên Trung Bình

5. ~~**DataAccessPolicyService**~~ - ✅ Done
6. ~~**TemplateResourcePermissionService**~~ - ✅ Done
7. ~~**TemporaryPermissionService**~~ - ✅ Done
8. ~~**RbacAuditService**~~ - ✅ Done
9. ~~**Seeder Commands**~~ - ✅ Done

### 🟢 Ưu Tiên Thấp

9. Documentation
10. CLI tools (rbac:debug, rbac:health)
11. Prometheus metrics

---

## Checklist Tổng Hợp

### Phase 1: Foundation ✅ 100%
- [x] Tất cả entities đã tạo
- [x] Helper functions đã implement
- [x] Organization Levels: 11 levels với backward compatibility

### Phase 2: Core Services ✅ 100%
- [x] RbacContextService
- [x] RbacEnforcerService
- [x] RbacCacheService
- [x] CasbinEnforcerService
- [x] PolicySyncService
- [x] RbacMetricsService
- [x] DepartmentTreeService
- [x] PermissionTemplateService
- [x] UserPermissionTemplateService
- [x] DataAccessPolicyService
- [x] TemplateResourcePermissionService
- [x] TemporaryPermissionService
- [x] RbacAuditService

### Phase 3: Integration ✅ 100%
- [x] CasbinAuthzGuard
- [x] @RequirePermission() decorator
- [x] GraphQL Resolvers (3 resolvers)
- [x] DataScopeInterceptor
- [x] @DataScope() decorator
- [x] Hook integration (RbacDataFilterHook, RbacPermissionCheckHook, RbacAuditHook)

### Phase 4: Data Seeding ✅ 100%
- [x] All seed data
- [x] Seeder commands (organization level, permission resource, template, data access policy, casbin rule, rbac sync)

### Phase 5: Advanced Features 🟡 60%
- [x] PG NOTIFY watcher
- [x] Fallback reload
- [x] Circuit breaker
- [x] Health indicator
- [x] Structured metrics
- [ ] Prometheus export
- [ ] Alert rules

### Phase 6: Documentation & CLI ⚪ 0%
- [ ] API Documentation
- [ ] Admin Guide
- [ ] CLI tools

---

## Ghi Chú

- Bỏ qua phase Testing riêng biệt - tests sẽ được viết song song khi cần
- Ưu tiên hoàn thành Integration (Phase 3) trước để row-level security hoạt động
- Sử dụng centralized constants từ `infrastructure/redis/constants/`
