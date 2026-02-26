# RBAC Refactor Plan — Loại bỏ Casbin, Triển khai 5 cấp độ dữ liệu

> **Ngày tạo**: 2026-02-26
> **Dựa trên**: Phân tích codebase + truy vấn database thực tế
> **Mục tiêu**: Làm cho hệ thống phân quyền dữ liệu hoạt động đúng với 5 cấp độ, loại bỏ dependency vào Casbin

---

## 1. Bối cảnh & Vấn đề Phát hiện

### 1.1 5 Cấp độ Dữ liệu Yêu cầu

| Cấp độ | Mô tả | Scope tương ứng |
|---|---|---|
| Dữ liệu cá nhân | Chỉ xem dữ liệu do bản thân tạo | `OWN_RECORDS` |
| Dữ liệu nhóm | Xem dữ liệu của tất cả thành viên trong team | `OWN_DEPARTMENT_AND_TEAM` |
| Dữ liệu phòng ban | Xem dữ liệu toàn bộ phòng ban (bao gồm sub-teams) | `OWN_AND_CHILD_DEPARTMENTS` |
| Dữ liệu công ty | Xem toàn bộ dữ liệu công ty | `ALL_DEPARTMENTS` |
| Dashboard tổng hợp | Truy cập dashboard và báo cáo phân tích | Hierarchy level ≤ 3 |

### 1.2 Phát hiện từ Database Thực tế

#### Vấn đề 1: Casbin hoàn toàn vô hiệu (CRITICAL)
```
mktCasbinRule: 6 records với subject là fake UUIDs
  user:00000000-0000-4000-8000-000000000001 → role:admin
  user:00000000-0000-4000-8000-000000000002 → role:manager
  ...

workspaceMember IDs thực:
  20202020-0687-4c41-b707-ed1bfca972a7 (Tim Apple)
  20202020-77d5-4cb6-b60a-f4a835a85d61 (Jony Ive)
  20202020-1553-45c6-a028-5a9064cce07f (Phil Schiler)
  81caea88-92a5-4e88-8a9a-614ec785d244 (Jane Austen)

Kết quả: matchedMember = NULL cho tất cả → Casbin không kiểm soát bất kỳ user thực nào
```

#### Vấn đề 2: contextId = NULL toàn bộ (CRITICAL)
```
mktTemplateResourcePermission: 50+ records, TẤT CẢ contextId = NULL

mktPermissionContext: 7 records đã được seed (own, team, department, all...)
→ nhưng KHÔNG được link với bất kỳ template resource permission nào

Hệ quả: USE_PERMISSION_CONTEXT=true sẽ luôn fallback về OWN_RECORDS
```

#### Vấn đề 3: Template-OrgLevel mismatch (HIGH)
```
Tim Apple:    organizationLevel=MANAGER(7)  nhưng template=CEO(1)
Phil Schiler: organizationLevel=SENIOR_SPECIALIST(8) nhưng template=VP(2)
Jony Ive:     organizationLevel=CEO(1)      nhưng template=DIRECTOR(3)
Jane Austen:  organizationLevel=SPECIALIST(9) → không có template nào
```

#### Vấn đề 4: Thiếu user ở level 4-6 (MEDIUM)
```
Levels hiện có:
  Level 1: Jony Ive (CEO)
  Level 7: Tim Apple (MANAGER)
  Level 8: Phil Schiler (SENIOR_SPECIALIST)
  Level 9: Jane Austen (SPECIALIST)

Thiếu: Level 4 (SENIOR_DIRECTOR), 5 (DIRECTOR), 6 (SENIOR_MANAGER)
→ Không có user để test "Dữ liệu phòng ban" (OWN_AND_CHILD_DEPARTMENTS)
```

#### Vấn đề 5: Dashboard không có hierarchy restriction (MEDIUM)
```
mktPermissionResource: DASHBOARD → dataClassification = 'INTERNAL'
→ RbacEnforcerService.checkDataClassification(): INTERNAL + READ → bypass Casbin, allow ALL
→ Tất cả user (kể cả Intern) đều đọc được Dashboard
```

#### Vấn đề 6: RbacEnforcerService hard-depends vào CasbinEnforcerService (MEDIUM)
```typescript
// rbac-enforcer.service.ts line 186
constructor(
  private readonly casbinEnforcerService: CasbinEnforcerService, // ← inject cứng
  ...
)
// line 269: checkPermission() gọi casbinEnforcerService.checkPermission()
```

---

## 2. Kiến trúc Hiện tại vs Mục tiêu

### 2.1 Kiến trúc Hiện tại (broken)
```
Request
  │
  ├─ CasbinAuthzGuard (@RequirePermission)
  │    └─ CasbinEnforcerService.checkPermission()
  │         └─ enforcer.enforce(fake_user, resource, action)  ← KHÔNG hoạt động
  │
  ├─ DepartmentAuthorizationGuard (@RequireDepartment)
  │    └─ RbacContextService.resolveContext()                  ← hoạt động
  │
  └─ DataScopeInterceptor (@DataScope)
       └─ RbacEnforcerService.getDataFilter()                  ← hoạt động
            └─ buildDataFilter() → buildDataFilterLegacy()     ← hoạt động
```

### 2.2 Kiến trúc Mục tiêu (simplified)
```
Request
  │
  ├─ DepartmentAuthorizationGuard (@RequireDepartment)
  │    ├─ UserOverride check (priority 2000)
  │    ├─ Executive check (level ≤ 3)
  │    ├─ Manager check (level ≤ 7)
  │    └─ Department membership check
  │
  └─ DataScopeInterceptor (@DataScope)
       └─ RbacEnforcerService.getDataFilter()
            └─ buildDataFilterLegacy()
                 ├─ OWN_RECORDS         → createdById = memberId
                 ├─ OWN_DEPT_AND_TEAM   → createdById IN [memberId, ...teamIds]
                 ├─ OWN_AND_CHILD_DEPTS → createdById IN [memberId, ...subordinateIds]
                 └─ ALL_DEPARTMENTS     → no filter
```

---

## 3. Các Bước Refactor

### Phase 1: Tách Casbin khỏi RbacEnforcerService (Bắt buộc)

**Mục tiêu**: `RbacEnforcerService` không còn depend vào `CasbinEnforcerService`

**File cần sửa**: `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-enforcer.service.ts`

#### Bước 1.1: Xóa CasbinEnforcerService khỏi constructor

```typescript
// TRƯỚC (line 185-194):
constructor(
  private readonly casbinEnforcerService: CasbinEnforcerService,  // XÓA
  private readonly rbacContextService: RbacContextService,
  private readonly dataAccessPolicyRepository: MktDataAccessPolicyRepository,
  private readonly permissionResourceRepository: MktPermissionResourceRepository,
  private readonly permissionContextService: PermissionContextService,
  private readonly filterExpressionResolver: FilterExpressionResolverService,
  private readonly dataAccessPolicyService: DataAccessPolicyService,
) {}

// SAU:
constructor(
  private readonly rbacContextService: RbacContextService,
  private readonly dataAccessPolicyRepository: MktDataAccessPolicyRepository,
  private readonly permissionResourceRepository: MktPermissionResourceRepository,
  private readonly permissionContextService: PermissionContextService,
  private readonly filterExpressionResolver: FilterExpressionResolverService,
  private readonly dataAccessPolicyService: DataAccessPolicyService,
) {}
```

#### Bước 1.2: Thay thế checkPermission() — bỏ Casbin call

```typescript
// TRƯỚC (line 200-313): gọi casbinEnforcerService.checkPermission()

// SAU: dùng hierarchy-based check
async checkPermission(
  userId: string,
  workspaceId: string,
  resource: string,
  action: string,
): Promise<RbacCheckPermissionResult> {
  const startTime = DateTimeUtils.now();

  const userContext = await this.rbacContextService.resolveContext(userId, workspaceId);

  if (!userContext) {
    return RbacEnforcerService.createFailedResult('User context not found', startTime);
  }

  // Data Classification pre-check (giữ nguyên logic này)
  const classificationResult = await this.checkDataClassification(workspaceId, resource, action);
  if (classificationResult.bypass) {
    return {
      allowed: classificationResult.allowed ?? false,
      reason: classificationResult.reason ?? '',
      latencyMs: RbacEnforcerService.calculateLatency(startTime),
      cached: false,
      appliedPolicies: [],
      dataFilter: null,
    };
  }

  // TOP_SECRET: chỉ level 1-2
  if (classificationResult.minimumTemplatePriority) {
    if ((userContext.hierarchyLevel ?? 11) > 2) {
      return RbacEnforcerService.createFailedResult(
        'Resource requires TOP_SECRET access (level ≤ 2)',
        startTime,
      );
    }
  }

  // Template-based check: dùng mktTemplateResourcePermission
  const templateAllowed = await this.checkTemplatePermission(
    workspaceId, userContext, resource, action,
  );

  const dataFilter = templateAllowed
    ? await this.buildDataFilter(workspaceId, userContext, resource)
    : null;

  return {
    allowed: templateAllowed,
    reason: templateAllowed ? 'Allowed by permission template' : 'No matching template permission',
    latencyMs: RbacEnforcerService.calculateLatency(startTime),
    cached: false,
    appliedPolicies: [],
    dataFilter,
  };
}

// Helper mới: check từ mktTemplateResourcePermission
private async checkTemplatePermission(
  workspaceId: string,
  userContext: UserContext,
  resource: string,
  action: string,
): Promise<boolean> {
  // Full access (level 1-3) → always allow
  if (userContext.hasFullAccess) return true;

  // Kiểm tra từ template được assign cho user
  for (const template of userContext.templates) {
    const resourcePermission =
      await this.permissionResourceRepository.findByResourceKeyInWorkspace(workspaceId, resource);
    if (!resourcePermission) continue;

    const templateResource =
      await this.templateResourcePermissionRepository.findByTemplateAndResource(
        template.id,
        resourcePermission.id,
      );
    if (!templateResource) continue;

    const denied = (templateResource.deniedActions ?? []).includes(action);
    if (denied) return false;

    const allowed = (templateResource.allowedActions ?? []).includes(action);
    if (allowed) return true;
  }

  return false;
}
```

#### Bước 1.3: Thay thế getUserPermissionSummary() — bỏ Casbin calls

```typescript
// Xóa: casbinEnforcerService.getUserRoles(), getUserPermissions()
// Thay bằng: lấy từ userContext.templates và templateResourcePermissions
async getUserPermissionSummary(
  userId: string,
  workspaceId: string,
): Promise<RbacPermissionSummary | null> {
  const userContext = await this.rbacContextService.resolveContext(userId, workspaceId);
  if (!userContext) return null;

  const roles = userContext.templateKeys;  // dùng templateKeys thay cho Casbin roles
  const activePolicies = await this.getActivePoliciesForUser(workspaceId, userContext);
  const hasFilter = await this.hasDataFilter(userContext);

  // Build resource permissions từ templates
  const resources = await this.buildResourcePermissionsFromTemplates(
    workspaceId, userContext,
  );

  return {
    userId,
    workspaceMemberId: userContext.workspaceMemberId,
    departmentId: userContext.departmentId,
    departmentName: userContext.departmentName,
    hierarchyLevel: userContext.hierarchyLevel,
    levelCode: userContext.levelCode,
    roles,
    permissionCount: resources.reduce((sum, r) => sum + r.allowedActions.length, 0),
    resources,
    activePolicies: this.mapPoliciesToActivePolicy(activePolicies),
  };
}
```

#### Bước 1.4: Xóa import Casbin

```typescript
// Xóa dòng này:
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
```

---

### Phase 2: Cập nhật Module — Bỏ CasbinModule (Bắt buộc)

**File cần sửa**: `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module.ts`

```typescript
// TRƯỚC:
imports: [
  TwentyORMModule,
  CacheStorageModule,
  WorkspaceCacheStorageModule,
  TokenModule,
  CasbinModule,        // ← XÓA
  MktDepartmentModule,
  MktOrganizationLevelModule,
  UserManagementModule,
],

// SAU:
imports: [
  TwentyORMModule,
  CacheStorageModule,
  WorkspaceCacheStorageModule,
  TokenModule,
  MktDepartmentModule,
  MktOrganizationLevelModule,
  UserManagementModule,
],

// exports: xóa CasbinModule
exports: [
  MktDepartmentModule,
  ENTERPRISE_RBAC_CONFIG_TOKEN,
  ...RBAC_REPOSITORIES,
  DepartmentTreeService,
  RbacCacheService,
  RbacContextService,
  RbacEnforcerService,
  HierarchicalAccessEvaluatorService,
  PermissionContextService,
  FilterExpressionResolverService,
  DataAccessPolicyService,
],
```

---

### Phase 3: Fix Dữ liệu Database (Bắt buộc)

#### Bước 3.1: Fix Template-OrgLevel mismatch

```sql
-- Xem ID của từng org level
SELECT id, "levelCode", "hierarchyLevel"
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktOrganizationLevel"
ORDER BY "hierarchyLevel";

-- Fix: Tim Apple (MANAGER level 7) → gán template MANAGER hoặc TEAM_LEAD
-- (không phải CEO)
UPDATE workspace_1wgvd1injqtife6y4rvfbu3h5."mktUserPermissionTemplate" upt
SET "templateId" = (
  SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionTemplate"
  WHERE "templateKey" = 'MANAGER'
)
WHERE "workspaceMemberId" = '20202020-0687-4c41-b707-ed1bfca972a7';  -- Tim Apple

-- Fix: Phil Schiler (SENIOR_SPECIALIST level 8) → gán template SENIOR
UPDATE workspace_1wgvd1injqtife6y4rvfbu3h5."mktUserPermissionTemplate" upt
SET "templateId" = (
  SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionTemplate"
  WHERE "templateKey" = 'SENIOR'
)
WHERE "workspaceMemberId" = '20202020-1553-45c6-a028-5a9064cce07f';  -- Phil Schiler

-- Fix: Jony Ive (CEO level 1) → gán template CEO
UPDATE workspace_1wgvd1injqtife6y4rvfbu3h5."mktUserPermissionTemplate" upt
SET "templateId" = (
  SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionTemplate"
  WHERE "templateKey" = 'CEO'
)
WHERE "workspaceMemberId" = '20202020-77d5-4cb6-b60a-f4a835a85d61';  -- Jony Ive

-- Fix: Jane Austen (SPECIALIST level 9) → thêm template JUNIOR
INSERT INTO workspace_1wgvd1injqtife6y4rvfbu3h5."mktUserPermissionTemplate"
  ("workspaceMemberId", "templateId", "isActive", "assignedAt", "id")
VALUES (
  '81caea88-92a5-4e88-8a9a-614ec785d244',
  (SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionTemplate" WHERE "templateKey" = 'JUNIOR'),
  true,
  NOW(),
  gen_random_uuid()
);
```

#### Bước 3.2: Thêm user ở level 4-6 (để test Dữ liệu Phòng Ban)

Trong seeder `packages/twenty-server/src/mkt-core/dev-seeder/`, thêm seed data cho workspace member với `organizationLevel` ở level 4, 5, 6:

```typescript
// Ví dụ seed member DIRECTOR (level 5) trong phòng SALES
{
  nameFirstName: 'Sales',
  nameLastName: 'Director',
  userEmail: 'sales.director@apple.dev',
  organizationLevelId: DIRECTOR_LEVEL_ID,    // hierarchyLevel = 5
  departmentId: SALES_DEPARTMENT_ID,
}
// → dataAccessScope sẽ = OWN_AND_CHILD_DEPARTMENTS
// → có thể xem SALES + SALES_DOMESTIC + SALES_INTERNATIONAL + SALES_ONLINE + SALES_PARTNER
```

#### Bước 3.3: Link contextId vào TemplateResourcePermission

```sql
-- Link context 'own' vào các template level 8-11 (OWN_RECORDS)
UPDATE workspace_1wgvd1injqtife6y4rvfbu3h5."mktTemplateResourcePermission" trp
SET "contextId" = (
  SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionContext"
  WHERE "contextKey" = 'own'
)
WHERE "templateId" IN (
  SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionTemplate"
  WHERE "hierarchyLevel" >= 8
);

-- Link context 'team' vào template level 7 (OWN_DEPARTMENT_AND_TEAM)
UPDATE workspace_1wgvd1injqtife6y4rvfbu3h5."mktTemplateResourcePermission" trp
SET "contextId" = (
  SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionContext"
  WHERE "contextKey" = 'team'
)
WHERE "templateId" IN (
  SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionTemplate"
  WHERE "hierarchyLevel" = 7
);

-- Link context 'department' vào template level 4-6
UPDATE workspace_1wgvd1injqtife6y4rvfbu3h5."mktTemplateResourcePermission" trp
SET "contextId" = (
  SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionContext"
  WHERE "contextKey" = 'department'
)
WHERE "templateId" IN (
  SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionTemplate"
  WHERE "hierarchyLevel" BETWEEN 4 AND 6
);

-- Link context 'all' vào template level 1-3
UPDATE workspace_1wgvd1injqtife6y4rvfbu3h5."mktTemplateResourcePermission" trp
SET "contextId" = (
  SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionContext"
  WHERE "contextKey" = 'all'
)
WHERE "templateId" IN (
  SELECT id FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionTemplate"
  WHERE "hierarchyLevel" <= 3
);
```

---

### Phase 4: Bảo vệ Dashboard (Bắt buộc)

**Thay đổi**: Dashboard resource từ `INTERNAL` → dùng `@RequireDepartment` guard

#### Option A: Đổi dataClassification của DASHBOARD

```sql
-- Đổi DASHBOARD từ INTERNAL → CONFIDENTIAL để không bypass Casbin
UPDATE workspace_1wgvd1injqtife6y4rvfbu3h5."mktPermissionResource"
SET "dataClassification" = 'CONFIDENTIAL'
WHERE "resourceKey" = 'DASHBOARD';
```

Sau đó thêm decorator vào dashboard resolvers:

```typescript
// packages/twenty-server/src/mkt-core/mkt-dashboard/ (hoặc resolver tương ứng)
@Query(() => DashboardOutput)
@RequireDepartment({
  allowExecutives: true,        // level ≤ 3 được phép
  allowManagers: false,         // level 4-7 không được
  allowedDepartments: [],       // không restrict theo phòng ban
})
async getDashboard(): Promise<DashboardOutput> { ... }
```

#### Option B: Dùng hierarchy check đơn giản hơn

```typescript
// Tạo decorator mới: @RequireHierarchyLevel
@Query(() => DashboardOutput)
@RequireHierarchyLevel({ maxLevel: 3 })  // chỉ CEO/C_LEVEL/VP
async getDashboard(): Promise<DashboardOutput> { ... }
```

---

### Phase 5: Thêm @DataScope vào Resolvers (Bắt buộc)

Đây là bước kết nối data scope filtering vào các endpoint thực tế.

**Các resolver cần thêm `@DataScope`:**

```typescript
// packages/twenty-server/src/mkt-core/order/resolvers/
@Query(() => [MktOrderWorkspaceEntity])
@DataScope({ resource: 'mktOrder', enableCache: true })
async mktOrders(@Context() ctx: GraphQLContext) {
  const filter = ctx.req.dataScope?.filter;
  // Áp dụng filter vào query
  return this.orderService.findWithFilter(filter);
}

// packages/twenty-server/src/mkt-core/customer/resolvers/
@Query(() => [MktCustomerWorkspaceEntity])
@DataScope({ resource: 'mktCustomer', enableCache: true })
async mktCustomers(@Context() ctx: GraphQLContext) {
  const filter = ctx.req.dataScope?.filter;
  return this.customerService.findWithFilter(filter);
}

// Tương tự cho: mktInvoice, mktPayment, mktLicense, mktContract
```

**Áp dụng filter trong service layer:**

```typescript
// Ví dụ trong OrderService
async findWithFilter(filter: RbacFilterCondition | null) {
  const queryBuilder = this.repository.createQueryBuilder('order');

  if (filter) {
    // Chuyển RbacFilterCondition thành TypeORM WHERE clause
    this.applyFilter(queryBuilder, filter);
  }

  return queryBuilder.getMany();
}

private applyFilter(qb: SelectQueryBuilder<MktOrder>, filter: RbacFilterCondition) {
  if (filter.type === 'OR') {
    const conditions = filter.conditions.map(c =>
      `order.${c.field} ${this.mapOperator(c.operator)} :${c.field}`
    );
    qb.where(conditions.join(' OR '), this.buildParams(filter.conditions));
  } else {
    filter.conditions.forEach(c => {
      qb.andWhere(`order.${c.field} ${this.mapOperator(c.operator)} :${c.field}`, {
        [c.field]: c.value
      });
    });
  }
}
```

---

### Phase 6: Bật MKT_RBAC_CONFIG (Tùy chọn — sau Phase 3.3)

Sau khi đã link contextId (Phase 3.3), bật new flow:

**File**: `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/configs/mkt-rbac.config.ts`

```typescript
export const MKT_RBAC_CONFIG = {
  USE_PERMISSION_CONTEXT: true,     // ← đổi từ false → true
  FALLBACK_ON_ERROR: true,          // giữ fallback an toàn
  DEBUG_FILTER_RESOLUTION: false,   // bật khi debug
};
```

Khi bật, flow sẽ là:
1. Check `mktDataAccessPolicy` (override layer) trước
2. Nếu không có override → lấy `mktPermissionContext` qua contextId
3. Resolve `$user.*` variables → trả về filter

---

## 4. Thứ tự Thực hiện

```
Phase 1 ──────────────────────── Tách Casbin khỏi RbacEnforcerService
    │                              (code change, không break production)
    ▼
Phase 2 ──────────────────────── Xóa CasbinModule khỏi Module
    │                              (sau Phase 1 hoàn tất)
    ▼
Phase 3.1 ────────────────────── Fix template-orgLevel mismatch (SQL)
    │                              (data fix, có thể làm song song)
    ▼
Phase 3.2 ────────────────────── Thêm user test level 4-6 (seeder)
    │
    ▼
Phase 4 ──────────────────────── Fix Dashboard guard
    │
    ▼
Phase 5 ──────────────────────── Thêm @DataScope vào resolvers
    │                              (bước quan trọng nhất để phân quyền có hiệu lực)
    ▼
Phase 3.3 (optional) ─────────── Link contextId → bật new flow
    │
    ▼
Phase 6 (optional) ───────────── Bật USE_PERMISSION_CONTEXT=true
```

---

## 5. Kiểm tra Sau Refactor

### 5.1 Test Data Scope

```typescript
// Test case 1: Jony Ive (level 1 - CEO) → phải thấy tất cả orders
// Expected: filter = null (no restriction)

// Test case 2: Tim Apple (level 7 - MANAGER, TECH_BACKEND) → thấy orders của team
// Expected: filter = { type: 'OR', conditions: [
//   { field: 'createdById', operator: 'IN', value: [timId, ...techBackendTeamIds] }
// ]}

// Test case 3: Phil Schiler (level 8 - SENIOR_SPECIALIST) → chỉ thấy orders của mình
// Expected: filter = { type: 'OR', conditions: [
//   { field: 'createdById', operator: '=', value: philId },
//   { field: 'accountOwnerId', operator: '=', value: philId }
// ]}

// Test case 4: User ở level 5 (DIRECTOR, SALES) → thấy SALES + sub-teams
// Expected: filter = { type: 'OR', conditions: [
//   { field: 'createdById', operator: 'IN', value: [self, ...subordinateIds] }
// ]}
```

### 5.2 Test Dashboard Access

```typescript
// Test case 1: Jony Ive (level 1) → được vào dashboard
// Test case 2: Tim Apple (level 7) → bị deny dashboard
// Test case 3: Phil Schiler (level 8) → bị deny dashboard
```

### 5.3 Lệnh chạy test

```bash
# Sync metadata sau khi sửa entities
npx nx run twenty-server:command workspace:sync-metadata -f

# Run unit tests
npx nx test twenty-server --testFile=rbac

# Lint
npx nx lint twenty-server --fix
```

---

## 6. Mapping Hoàn chỉnh: Role → Data Scope → Filter

| HierarchyLevel | Role | dataAccessScope | Filter SQL |
|---|---|---|---|
| 1 (CEO) | Tổng Giám Đốc | ALL_DEPARTMENTS | — (no filter) |
| 2 (C_LEVEL) | Giám đốc điều hành | ALL_DEPARTMENTS | — (no filter) |
| 3 (VP) | Phó Tổng Giám Đốc | ALL_DEPARTMENTS | — (no filter) |
| 4 (SENIOR_DIRECTOR) | Giám đốc cấp cao | OWN_AND_CHILD_DEPARTMENTS | `createdById IN [self, subordinates]` |
| 5 (DIRECTOR) | Giám đốc | OWN_AND_CHILD_DEPARTMENTS | `createdById IN [self, subordinates]` |
| 6 (SENIOR_MANAGER) | Quản lý cấp cao | OWN_AND_CHILD_DEPARTMENTS | `createdById IN [self, subordinates]` |
| 7 (MANAGER) | Quản lý | OWN_DEPARTMENT_AND_TEAM | `createdById IN [self, teamMembers]` |
| 8 (SENIOR_SPECIALIST) | Chuyên viên cao cấp | OWN_RECORDS | `createdById = self` |
| 9 (SPECIALIST) | Chuyên viên | OWN_RECORDS | `createdById = self` |
| 10 (JUNIOR_SPECIALIST) | Chuyên viên sơ cấp | OWN_RECORDS | `createdById = self` |
| 11 (INTERN) | Thực tập sinh | OWN_RECORDS | `createdById = self` |

---

## 7. Files Cần Thay Đổi — Tổng Hợp

| File | Thay đổi | Phase |
|---|---|---|
| `services/rbac-enforcer.service.ts` | Xóa CasbinEnforcerService dependency, thay checkPermission() | 1 |
| `mkt-rbac-enterprise-grade.module.ts` | Xóa CasbinModule import/export | 2 |
| `resolvers/order/*.resolver.ts` | Thêm `@DataScope({ resource: 'mktOrder' })` | 5 |
| `resolvers/customer/*.resolver.ts` | Thêm `@DataScope({ resource: 'mktCustomer' })` | 5 |
| `resolvers/invoice/*.resolver.ts` | Thêm `@DataScope({ resource: 'mktInvoice' })` | 5 |
| `resolvers/dashboard/*.resolver.ts` | Thêm `@RequireDepartment({ allowExecutives: true })` | 4 |
| `dev-seeder/` | Thêm seed user level 4-6 | 3.2 |
| `configs/mkt-rbac.config.ts` | `USE_PERMISSION_CONTEXT: true` (sau Phase 3.3) | 6 |

**SQL Scripts:**
| Script | Nội dung | Phase |
|---|---|---|
| `fix-template-assignment.sql` | Fix mismatch giữa template và orgLevel | 3.1 |
| `fix-jane-template.sql` | Thêm template cho Jane Austen | 3.1 |
| `link-context-ids.sql` | Link contextId vào templateResourcePermission | 3.3 |
| `fix-dashboard-classification.sql` | Đổi DASHBOARD từ INTERNAL → CONFIDENTIAL | 4 |

---

## 8. Rủi ro & Lưu ý

| Rủi ro | Mức độ | Xử lý |
|---|---|---|
| Xóa Casbin làm mất `@RequirePermission` decorator | HIGH | Các resolver đang dùng decorator này sẽ compile error → cần kiểm tra và thay bằng `@RequireDepartment` |
| Legacy filter dùng `createdById` nhưng một số entity dùng field khác | MEDIUM | Kiểm tra `DEFAULT_OWNERSHIP_FIELD` constant và override per-resource nếu cần |
| `mktDepartmentAncestry` chỉ có depth=1 (không có grandchild) | LOW | Cấu trúc hiện tại là 2 cấp: Department → Team, đủ cho yêu cầu |
| User có thể có nhiều templates với levels khác nhau | MEDIUM | `RbacContextService.getAssignedTemplates()` lấy tất cả active templates, dùng template có priority cao nhất |
| Phase 3.3 (link contextId) cần migration cẩn thận | MEDIUM | Chạy trên staging trước, verify bằng query kiểm tra contextKey mapping |
