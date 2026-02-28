# RBAC Permission Check Flow

> Tài liệu mô tả chi tiết luồng kiểm tra quyền (permission check) trong module `mkt-rbac-enterprise-grade`.
>
> **Module path:** `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/`

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Luồng tổng thể khi request đến](#2-luồng-tổng-thể-khi-request-đến)
3. [Step 1 — NestJS Guards (Authentication)](#3-step-1--nestjs-guards-authentication)
4. [Step 2 — DepartmentAuthorizationGuard (APP_GUARD)](#4-step-2--departmentauthorizationguard-app_guard)
5. [Step 3 — DataScopeInterceptor (APP_INTERCEPTOR)](#5-step-3--datascopeinterceptor-app_interceptor)
6. [Step 4 — RbacContextService: Resolve User Context](#6-step-4--rbaccontextservice-resolve-user-context)
7. [Step 5 — RbacEnforcerService: Check Permission](#7-step-5--rbacenforcerservice-check-permission)
8. [Step 6 — Data Filter Building](#8-step-6--data-filter-building)
9. [Step 7 — PermissionContext Flow (New)](#9-step-7--permissioncontext-flow-new)
10. [Step 8 — Legacy Data Filter Flow](#10-step-8--legacy-data-filter-flow)
11. [Override Mechanisms](#11-override-mechanisms)
12. [Cache Layers](#12-cache-layers)
13. [Decorators Reference](#13-decorators-reference)
14. [Configuration](#14-configuration)
15. [Sequence Diagram](#15-sequence-diagram)

---

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GraphQL Request                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  WorkspaceAuthGuard  │  ← Authentication
                    │  UserAuthGuard       │
                    └──────────┬──────────┘
                               │
              ┌────────────────▼────────────────┐
              │  DepartmentAuthorizationGuard    │  ← APP_GUARD (Global)
              │  (chỉ khi có @RequireDepartment) │     Department + Hierarchy check
              └────────────────┬────────────────┘
                               │
                ┌──────────────▼──────────────┐
                │    DataScopeInterceptor      │  ← APP_INTERCEPTOR (Global)
                │  (chỉ khi có @DataScope)     │     Row-level security
                └──────────────┬──────────────┘
                               │
                     ┌─────────▼─────────┐
                     │   Route Handler    │  ← Business Logic
                     │   (Resolver/Ctrl)  │     req.dataScope available
                     └───────────────────┘
```

### Các thành phần chính

| Thành phần | File | Vai trò |
|-----------|------|---------|
| `DepartmentAuthorizationGuard` | `guards/department-authorization.guard.ts` | Kiểm tra department/hierarchy (APP_GUARD) |
| `DataScopeInterceptor` | `interceptors/data-scope.interceptor.ts` | Row-level data filtering (APP_INTERCEPTOR) |
| `RbacContextService` | `services/rbac-context.service.ts` | Resolve user context đầy đủ |
| `RbacEnforcerService` | `services/rbac-enforcer.service.ts` | Orchestrator: permission check + data filter |
| `PermissionContextService` | `services/bases/permission-context.service.ts` | Quản lý template filter (new flow) |
| `FilterExpressionResolverService` | `services/filter-expression-resolver.service.ts` | Resolve `$user.*` variables |
| `DataAccessPolicyService` | `services/bases/data-access-policy.service.ts` | Override filter bằng policy |
| `RbacCacheService` | `services/rbac-cache.service.ts` | Multi-tier cache (In-Memory + Redis) |
| `HierarchicalAccessEvaluatorService` | `services/hierarchical-access-evaluator.service.ts` | Đánh giá quyền theo hierarchy tree |

### Module Registration

```typescript
// mkt-rbac-enterprise-grade.module.ts
@Global()
@Module({
  providers: [
    // Global Guard — triggers on @RequireDepartment metadata
    { provide: APP_GUARD, useFactory: (...) => new DepartmentAuthorizationGuard(...) },

    // Global Interceptor — triggers on @DataScope metadata
    { provide: APP_INTERCEPTOR, useFactory: (...) => new DataScopeInterceptor(...) },

    // Core Services
    RbacCacheService, RbacContextService, RbacEnforcerService,
    PermissionContextService, FilterExpressionResolverService, DataAccessPolicyService,
  ],
})
export class MktRbacEnterpriseGradeModule {}
```

---

## 2. Luồng tổng thể khi request đến

```
Request → Auth Guards → DepartmentAuthGuard → DataScopeInterceptor → Handler
                              │                        │
                              ▼                        ▼
                     RbacContextService         RbacEnforcerService
                     (resolve user info)        (check permission + build filter)
                              │                        │
                              ▼                        ▼
                        UserContext              DataFilter (RbacFilterCondition)
                                                       │
                                           ┌───────────┴──────────┐
                                           ▼                      ▼
                                    New Flow (default)     Legacy Flow (fallback)
                                           │                      │
                                    PermissionContext       Hard-coded switch
                                    + FilterResolver       on dataAccessScope
                                           │
                                    DataAccessPolicy
                                    (override layer)
```

---

## 3. Step 1 — NestJS Guards (Authentication)

Trước khi vào RBAC, request phải qua authentication guards đặt trên resolver:

```typescript
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)  // ← Authentication
export class OrderMutationResolver { ... }
```

| Guard | File | Mô tả |
|-------|------|-------|
| `WorkspaceAuthGuard` | `engine/guards/workspace-auth.guard.ts` | Xác thực workspace context (JWT token) |
| `UserAuthGuard` | `engine/guards/user-auth.guard.ts` | Xác thực user identity |

Sau bước này, `request.user.id` và `request.workspace.id` đã có sẵn.

---

## 4. Step 2 — DepartmentAuthorizationGuard (APP_GUARD)

**File:** `guards/department-authorization.guard.ts`

Guard toàn cục, **chỉ kích hoạt khi method/class có `@RequireDepartment` metadata**.

### Trigger condition

```typescript
const options = this.reflector.getAllAndOverride<DepartmentAuthOptions>(
  DEPARTMENT_AUTH_KEY,
  [context.getHandler(), context.getClass()],
);

// Không có decorator → cho phép (return true)
if (!options) return true;
```

### Authorization Chain (theo priority giảm dần)

```
canActivate()
  │
  ├── 1. extractContext() → { userId, workspaceId }
  │
  ├── 2. rbacContextService.resolveContext(userId, workspaceId)
  │       → UserContext (department, hierarchy, templates, ...)
  │
  ├── 3. extractAncestorCodes(userContext, workspaceId)         // RBAC-004
  │       → departmentAncestorIds → department codes via DB
  │
  └── 4. checkAuthorization(authContext, options)
          │
          ├── Priority 1: checkHighPriorityTemplates()
          │     Templates có priority >= minTemplatePriority
          │     Sort by priority descending, lấy highest qualifying
          │
          ├── Priority 2: checkExecutiveAccess()
          │     hierarchyLevel <= 3 (CEO=1, C_LEVEL=2, VP=3)
          │
          ├── Priority 3: checkManagerAccess()
          │     hierarchyLevel <= 7 (MANAGER level)
          │
          └── Priority 4: checkDepartmentAccess()
                ├── checkDirectDepartment()
                │     departmentCode ∈ allowedDepartments
                └── checkAncestorDepartments()
                      departmentAncestorCodes ∩ allowedDepartments
```

### DepartmentAuthContext (input cho checkAuthorization)

```typescript
{
  userId: string;
  workspaceId: string;
  workspaceMemberId: string;
  departmentCode: string | null;
  departmentAncestorCodes: string[];   // resolved from IDs → codes
  hierarchyLevel: number;              // 1=CEO ... 11=INTERN
  isManager: boolean;
  templates: MktPermissionTemplateWorkspaceEntity[];
  templateKeys: string[];
}
```

### Kết quả

- **Allowed** → tiếp tục pipeline
- **Denied** → `throw ForbiddenException(message)`

---

## 5. Step 3 — DataScopeInterceptor (APP_INTERCEPTOR)

**File:** `interceptors/data-scope.interceptor.ts`

Interceptor toàn cục, **chỉ kích hoạt khi method có `@DataScope` metadata**.

### Flow chi tiết

```
intercept(context, next)
  │
  ├── 1. reflector.get(DATA_SCOPE_METADATA_KEY, handler)
  │       → DataScopeMetadata { resource, mode, enableCache, ... }
  │       → null → skip (return next.handle())
  │
  ├── 2. extractContext(ExecutionContext)
  │       ├── GraphQL: ctx.req.user.id, ctx.req.workspace.id
  │       └── HTTP: request.user.id, request.workspace.id
  │       → { userId, workspaceId, request }
  │
  ├── 3. Validate context
  │       ├── No userId → allowUnscoped ? attachEmptyScope : throw ForbiddenException
  │       └── No workspaceId → allowUnscoped ? attachEmptyScope : throw ForbiddenException
  │
  ├── 4. Handle SKIP mode
  │       → attachSkippedScope(request) → next.handle()
  │
  ├── 5. resolveDataScope(userId, workspaceId, resource, metadata)
  │       │
  │       ├── 5a. Check cache (if enableCache)
  │       │     rbacCacheService.getDataFilter(userId, workspaceId, resource)
  │       │
  │       ├── 5b. rbacContextService.resolveContext(userId, workspaceId)
  │       │     → UserContext
  │       │
  │       ├── 5c. Check hasFullAccess (hierarchy level 1-3)
  │       │     → filter = null (no restriction)
  │       │
  │       ├── 5d. rbacEnforcerService.getDataFilter(userId, workspaceId, resource)
  │       │     → RbacFilterCondition | null
  │       │
  │       ├── 5e. mergeFilters(filter, additionalConditions)
  │       │     → Combined filter
  │       │
  │       └── 5f. Cache result (if enableCache)
  │
  └── 6. request.dataScope = DataScopeContext
          → next.handle()
```

### DataScopeContext (attach vào request)

```typescript
type DataScopeContext = {
  resource: string;                    // e.g., 'mktOrder'
  filter: RbacFilterCondition | null;  // Row-level filter conditions
  userContext: UserContext | null;      // Full user context
  hasFullAccess: boolean;              // Level 1-3 → true
  skipped: boolean;                    // mode=SKIP → true
  reason?: string;
  resolvedAt: string;
  latencyMs: number;
};
```

### RbacFilterCondition (cấu trúc filter)

```typescript
type RbacFilterCondition = {
  type: 'AND' | 'OR';
  conditions: RbacFilterConditionItem[];
};

type RbacFilterConditionItem = {
  field: string;           // e.g., 'createdById'
  operator: RbacFilterOperator;  // '=', '!=', 'IN', 'NOT_IN', '>', '<', ...
  value: unknown;          // actual value or array
  description?: string;
};
```

---

## 6. Step 4 — RbacContextService: Resolve User Context

**File:** `services/rbac-context.service.ts`

### resolveContext(userId, workspaceId) → UserContext | null

```
resolveContext(userId, workspaceId)
  │
  ├── 1. workspaceMemberRepository.findByUserIdWithWorkspace(workspaceId, userId)
  │       → member { id, departmentId, organizationLevelId }
  │       → null → return null
  │
  ├── 2. organizationLevelRepository.findByIdWithWorkspace(workspaceId, member.organizationLevelId)
  │       → orgLevel { hierarchyLevel, levelCode, levelName }
  │       → null → defaults: { hierarchyLevel: 11 (INTERN), levelCode: 'INTERN' }
  │
  ├── 3. Resolve department info (if member.departmentId exists)
  │       ├── departmentRepository.findByIdWithWorkspace(...)
  │       │     → { departmentCode, departmentName, departmentType }
  │       ├── getDepartmentAncestors(workspaceId, departmentId)
  │       │     → string[] (ancestor department IDs)
  │       └── getDepartmentDescendants(workspaceId, departmentId)
  │             → string[] (descendant department IDs)
  │
  ├── 4. Resolve relationships (parallel)
  │       ├── getSubordinates(workspaceId, memberId, hierarchyLevel)
  │       │     → subordinateMemberIds: string[]
  │       ├── getTeamMembers(workspaceId, departmentId, memberId)
  │       │     → teamMemberIds: string[]
  │       └── getSupportingMembers(workspaceId, memberId)
  │             → supportingMemberIds: string[]
  │
  ├── 5. Check manager/sub-manager status (parallel)
  │       ├── isUserManager(workspaceId, memberId) → boolean
  │       └── isUserSubManager(workspaceId, memberId) → boolean
  │
  ├── 6. getAssignedTemplates(workspaceId, memberId)
  │       → { templateKeys: string[], templates: MktPermissionTemplateWorkspaceEntity[] }
  │
  └── 7. Calculate dataAccessScope
          getDataAccessScopeByLevel(hierarchyLevel)
          ├── Level 1-3  → ALL_DEPARTMENTS
          ├── Level 4-6  → OWN_AND_CHILD_DEPARTMENTS
          ├── Level 7    → OWN_DEPARTMENT_AND_TEAM
          └── Level 8-11 → OWN_RECORDS
```

### UserContext (RBACUserContext) — Output đầy đủ

```typescript
type RBACUserContext = {
  // Core
  userId: string;
  workspaceMemberId: string;
  workspaceId: string;

  // Department
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  departmentType: string | null;
  departmentAncestorIds: string[];
  departmentDescendantIds: string[];

  // Organization Level
  organizationLevelId: string | null;
  hierarchyLevel: HierarchyLevel;    // 1 (CEO) → 11 (INTERN)
  levelCode: string;
  levelName: string;

  // Data Access
  dataAccessScope: DataAccessScopeType;
  hasFullAccess: boolean;             // true khi level 1-3

  // Team
  isManager: boolean;
  isSubManager: boolean;
  canManageTeam: boolean;
  canViewSubordinates: boolean;

  // Relationships
  subordinateMemberIds: string[];
  teamMemberIds: string[];
  supportingMemberIds: string[];

  // Templates
  templateKeys: string[];
  templates: MktPermissionTemplateWorkspaceEntity[];

  // Metadata
  resolvedAt: string;
  cacheKey: string;
};
```

---

## 7. Step 5 — RbacEnforcerService: Check Permission

**File:** `services/rbac-enforcer.service.ts`

### checkPermission(userId, workspaceId, resource, action)

```
checkPermission(userId, workspaceId, resource, action)
  │
  ├── 1. rbacContextService.resolveContext(userId, workspaceId)
  │       → UserContext | null
  │       → null → return { allowed: false, reason: 'User context not found' }
  │
  ├── 2. checkDataClassification(workspaceId, resource, action)
  │       │
  │       │   Query: permissionResourceRepository.findByResourceKey(resource)
  │       │   → MktPermissionResource { dataClassification }
  │       │
  │       ├── PUBLIC + READ → bypass, allowed: true
  │       ├── INTERNAL + READ → bypass, allowed: true
  │       ├── RESTRICTED → continue (flag: requireAudit)
  │       ├── TOP_SECRET → continue (flag: minimumTemplatePriority: 900)
  │       └── CONFIDENTIAL → continue normally
  │
  ├── 3. TOP_SECRET check: hierarchyLevel > 2 → denied
  │
  ├── 4. checkTemplatePermission(workspaceId, userContext, resource, action)
  │       │
  │       ├── hasFullAccess (level 1-3) → allowed
  │       │
  │       ├── Get templateIds from userContext.templates
  │       │     → empty → denied: 'No permission templates assigned'
  │       │
  │       ├── templateResourcePermissionRepository.findActiveByTemplateIds(workspaceId, templateIds)
  │       │     → MktTemplateResourcePermission[] (with resource relation)
  │       │
  │       ├── Find matching: trp.resource.resourceKey === resource
  │       │     → not found → denied
  │       │
  │       ├── Check deny-wins: action ∈ deniedActions → denied
  │       │
  │       └── Check allow: action ∈ allowedActions → allowed
  │             → else → denied
  │
  └── 5. Build result (if allowed)
          ├── buildDataFilter(workspaceId, userContext, resource) → RbacFilterCondition | null
          ├── getAppliedPoliciesInfo(workspaceId, userContext, resource) → RbacAppliedPolicy[]
          └── Return RbacCheckPermissionResult
```

### RbacCheckPermissionResult

```typescript
type RbacCheckPermissionResult = {
  allowed: boolean;
  reason: string;
  latencyMs: number;
  cached: boolean;
  appliedPolicies: RbacAppliedPolicy[];
  dataFilter: RbacFilterCondition | null;
};
```

---

## 8. Step 6 — Data Filter Building

**File:** `services/rbac-enforcer.service.ts` → `buildDataFilter()`

### Decision tree

```
buildDataFilter(workspaceId, userContext, resource)
  │
  ├── hasFullAccess (level 1-3) → return null (no filter)
  │
  ├── MKT_RBAC_CONFIG.USE_PERMISSION_CONTEXT === true (default)
  │     │
  │     ├── try: buildDataFilterNew() → [Step 7]
  │     │
  │     └── catch error:
  │           ├── FALLBACK_ON_ERROR === true → buildDataFilterLegacy() → [Step 8]
  │           └── FALLBACK_ON_ERROR === false → return null
  │
  └── MKT_RBAC_CONFIG.USE_PERMISSION_CONTEXT === false
        └── buildDataFilterLegacy() → [Step 8]
```

---

## 9. Step 7 — PermissionContext Flow (New)

**Enabled by:** `RBAC_USE_PERMISSION_CONTEXT=true` (default kể từ Phase 6)

### buildDataFilterNew() — 4 bước

```
buildDataFilterNew(workspaceId, userContext, resource)
  │
  │  ╔══════════════════════════════════════════════╗
  │  ║  STEP 1: DataAccessPolicy (Override Layer)   ║
  │  ╚══════════════════════════════════════════════╝
  │
  ├── dataAccessPolicyService.getPoliciesForMember(
  │     workspaceId, workspaceMemberId, resource, departmentId, organizationLevelId
  │   )
  │   → MktDataAccessPolicy[] (sorted by priority)
  │
  ├── If found → use highest priority policy
  │     convertPolicyToFilterCondition(policy)
  │     → RbacFilterCondition { type: 'AND', conditions: [...] }
  │     → RETURN (skip Step 2-4)
  │
  │  ╔══════════════════════════════════════════════╗
  │  ║  STEP 2: PermissionContext (Template Layer)  ║
  │  ╚══════════════════════════════════════════════╝
  │
  ├── permissionContextService.getContextKeyForDataAccessScope(userContext.dataAccessScope)
  │     Mapping:
  │     ├── ALL_DEPARTMENTS          → 'all'
  │     ├── OWN_AND_CHILD_DEPARTMENTS → 'department'
  │     ├── OWN_DEPARTMENT_AND_TEAM  → 'team'
  │     └── OWN_RECORDS             → 'own'
  │
  ├── permissionContextService.getByContextKey(workspaceId, contextKey)
  │     → MktPermissionContext { filterExpression: { ... template variables ... } }
  │     → null → fallback to buildOwnRecordsFilter()
  │
  │  ╔══════════════════════════════════════════════╗
  │  ║  STEP 3: Resolve Template Variables          ║
  │  ╚══════════════════════════════════════════════╝
  │
  ├── filterExpressionResolver.resolveFilterExpression(
  │     permissionContext.filterExpression,   // Template: { createdById: '$user.workspaceMemberId' }
  │     userContext as RBACUserContext        // Actual values
  │   )
  │   │
  │   ├── Build FilterResolutionContext:
  │   │     user: { userId, workspaceMemberId, departmentId, teamMemberIds, ... }
  │   │     context: additionalContext (optional)
  │   │
  │   ├── resolveObject() — recursive
  │   │     ├── For each key-value in templateFilter:
  │   │     │     ├── String starts with '$' → resolveTemplateVariable()
  │   │     │     │     '$user.workspaceMemberId' → 'member-uuid-123'
  │   │     │     │     '$user.teamMemberIds' → ['member-1', 'member-2', ...]
  │   │     │     ├── Array → resolve each item
  │   │     │     ├── Object → recurse
  │   │     │     └── Primitive → keep as-is
  │   │     └── Track unresolved variables
  │   │
  │   └── Return FilterResolutionResult:
  │         { success, resolvedFilter, unresolvedVariables, errors }
  │
  │  Empty filter → return null (ALL_RECORDS, no filtering)
  │
  │  ╔══════════════════════════════════════════════╗
  │  ║  STEP 4: Convert to FilterCondition          ║
  │  ╚══════════════════════════════════════════════╝
  │
  └── convertResolvedFilterToCondition(resolvedFilter)
        → RbacFilterCondition { type: 'AND'|'OR', conditions: [...] }
```

### Supported Template Variables

| Variable | Type | Mô tả |
|----------|------|-------|
| `$user.userId` | `string` | User ID |
| `$user.workspaceMemberId` | `string` | Workspace member ID |
| `$user.workspaceId` | `string` | Workspace ID |
| `$user.departmentId` | `string \| null` | Department ID trực tiếp |
| `$user.departmentAncestorIds` | `string[]` | Danh sách department cha |
| `$user.departmentDescendantIds` | `string[]` | Danh sách department con |
| `$user.teamMemberIds` | `string[]` | Member IDs cùng team/department |
| `$user.subordinateMemberIds` | `string[]` | Member IDs cấp dưới |
| `$user.supportingMemberIds` | `string[]` | Member IDs hỗ trợ |
| `$user.hierarchyLevel` | `number` | Hierarchy level (1-11) |
| `$user.organizationLevelId` | `string \| null` | Organization level ID |

### PermissionContext Seed Data (7 contexts)

| contextKey | Mô tả | filterExpression (ví dụ) |
|-----------|-------|--------------------------|
| `own` | Chỉ bản ghi của mình | `{ createdById: '$user.workspaceMemberId' }` |
| `own_and_supporting` | Bản ghi mình + hỗ trợ | `{ $or: [{ createdById: '$user.workspaceMemberId' }, ...] }` |
| `team` | Bản ghi cả team | `{ createdById: { $in: '$user.teamMemberIds' } }` |
| `hierarchical` | Theo hierarchy | `{ createdById: { $in: '$user.subordinateMemberIds' } }` |
| `department` | Toàn department + con | Filter theo departmentDescendantIds |
| `internal_company` | Nội bộ công ty | Filter rộng hơn department |
| `all` | Tất cả bản ghi | `{}` (empty → no filter) |

### Hierarchy Level → Context Mapping (via seed data)

| Hierarchy Level | Chức vụ | DataAccessScope | contextKey |
|----------------|---------|-----------------|------------|
| 1-3 | CEO, C-Level, VP | ALL_DEPARTMENTS | `all` (nhưng hasFullAccess=true nên skip filter) |
| 4-6 | Director, Senior Manager, Department Head | OWN_AND_CHILD_DEPARTMENTS | `department` |
| 7 | Manager | OWN_DEPARTMENT_AND_TEAM | `team` |
| 8-11 | Team Lead, Senior, Staff, Intern | OWN_RECORDS | `own` |

---

## 10. Step 8 — Legacy Data Filter Flow

**Used khi:** `USE_PERMISSION_CONTEXT=false` hoặc new flow error + `FALLBACK_ON_ERROR=true`

### buildDataFilterLegacy()

```
buildDataFilterLegacy(workspaceId, userContext, resource)
  │
  ├── switch (userContext.dataAccessScope):
  │
  ├── ALL_DEPARTMENTS
  │     → return null (no filter)
  │
  ├── OWN_AND_CHILD_DEPARTMENTS
  │     memberIds = [workspaceMemberId, ...subordinateMemberIds]
  │     conditions:
  │       OR: createdById IN memberIds
  │       OR: accountOwnerId IN memberIds
  │
  ├── OWN_DEPARTMENT_AND_TEAM
  │     teamIds = [workspaceMemberId, ...teamMemberIds]
  │     conditions:
  │       OR: createdById IN teamIds
  │       OR: accountOwnerId IN teamIds
  │
  └── OWN_RECORDS (default)
        conditions:
          OR: createdById = workspaceMemberId
          OR: accountOwnerId = workspaceMemberId
          OR: createdById IN supportingMemberIds (if any)

  + Add policy-specific conditions from DataAccessPolicy.filterConditions

  → return { type: 'OR', conditions: [...] }
```

---

## 11. Override Mechanisms

### 11.1 DataAccessPolicy (Override Layer)

**Entity:** `mktDataAccessPolicy`
**Checked in:** `RbacEnforcerService.buildDataFilterNew()` Step 1

```
Cơ chế: Policy-based override cho data filtering
- Scope: specificMemberId, departmentId, hoặc organizationLevelId
- objectName: resource name (e.g., 'mktOrder')
- filterConditions: { ownership, status, conditions[] }
- priority: number (cao hơn → ưu tiên hơn)
- policyType: 'ROW_LEVEL' | 'FIELD_LEVEL' | 'COLUMN_LEVEL'

Nếu DataAccessPolicy tồn tại → SKIP PermissionContext template.
```

### 11.2 TemporaryPermission (Time-Limited)

**Entity:** `mktTemporaryPermission`
**Service:** `services/bases/temporary-permission.service.ts`

```
Cơ chế: Cấp quyền tạm thời cho user
- purpose: EMERGENCY_ACCESS | CROSS_DEPT_COLLAB | TEMPORARY_COVERAGE
- canRead, canUpdate, canDelete: boolean
- expiresAt: timestamp → Tự hết hạn
- granterWorkspaceMemberId: Ai cấp (phải có đủ quyền - RBAC-001)

Granter validation: phải có quyền tương ứng trên resource.
```

---

## 12. Cache Layers

### 12.1 RbacCacheService (Multi-tier)

```
┌─────────────────────────────────────────────┐
│  Tier 1: In-Memory Maps (TTL: 2 phút)      │
│  ├── contextCache: userId:workspaceId       │
│  ├── checkResultCache: userId:ws:res:action │
│  ├── summaryCache: userId:workspaceId       │
│  └── filterCache: userId:ws:resource        │
├─────────────────────────────────────────────┤
│  Tier 2: Redis (TTL: 5-15 phút)            │
│  ├── CacheStorageNamespace.RbacUser         │
│  │     USER_CONTEXT: 15 phút               │
│  └── CacheStorageNamespace.RbacPermission   │
│        PERMISSION_CHECK: 5 phút             │
│        SUMMARY: 5 phút                      │
│        FILTER: 5 phút                       │
└─────────────────────────────────────────────┘

Statistics: hits, misses, invalidations
```

### 12.2 PermissionContextService Cache (Local only)

```
Local Map: key → { data, timestamp }
- Key format: context:{workspaceId}:{contextKey}
- TTL: 5 phút
- Cleanup: khi > 500 entries → xóa expired
- Không dùng Redis (luôn query repo cho freshest data khi cache miss)
```

### 12.3 DepartmentAuthorizationGuard Cache

```
Ancestor Codes: __ancestor_codes:{ids} → codes string (via RbacCacheService)
```

---

## 13. Decorators Reference

### @DataScope — Row-Level Security

```typescript
// Cơ bản
@DataScope({ resource: 'mktOrder' })

// Với mode
@DataScope({ resource: 'mktOrder', mode: 'AUTO' })    // Tự động filter (default)
@DataScope({ resource: 'mktOrder', mode: 'MANUAL' })  // Attach filter, app tự apply
@DataScope({ resource: 'mktOrder', mode: 'SKIP' })    // Bỏ qua filter (cho create/aggregation)

// Với audit level
@DataScope({ resource: 'mktOrder', auditLevel: 'low' })     // Bulk queries
@DataScope({ resource: 'mktOrder', auditLevel: 'medium' })  // Single record
@DataScope({ resource: 'mktOrder', auditLevel: 'high' })    // Mutations, sensitive

// Với preset constants
@DataScope(ORDER_DATA_SCOPE.QUERY_LIST)
@DataScope(ORDER_DATA_SCOPE.MUTATION_CREATE)
@DataScope(CUSTOMER_DATA_SCOPE.QUERY_SINGLE)
@DataScope(PAYMENT_DATA_SCOPE.MUTATION_CONFIRM)
@DataScope(LICENSE_DATA_SCOPE.MUTATION_STATE_CHANGE)
```

### @RequireDepartment — Department Authorization

```typescript
// Chỉ department cụ thể
@RequireDepartment({ allowedDepartments: ['SALES'] })

// Department + managers
@RequireDepartment({ allowedDepartments: ['SALES'], allowManagers: true })

// Disable executive bypass
@RequireDepartment({ allowedDepartments: ['ACCOUNTING'], allowExecutives: false })

// Shorthand decorators
@RequireExecutive()              // Level ≤ 3 only
@RequireManager()                // Level ≤ 7
@RequireSalesDepartment()        // SALES dept + executives
@RequireAccountingDepartment()   // ACCOUNTING dept + executives
@RequireSalesOrManager()         // SALES dept OR any manager + executives
```

### DataScopeOptions (full interface)

```typescript
type DataScopeOptions = {
  resource: ResourceEntityName;                    // Required: 'mktOrder', 'mktCustomer', ...
  mode?: 'AUTO' | 'MANUAL' | 'SKIP';             // Default: 'AUTO'
  enableCache?: boolean;                           // Default: true
  cacheTTL?: number;                               // Default: from config
  auditLevel?: 'low' | 'medium' | 'high';        // Default: 'low'
  errorMessage?: string;                           // Custom error message
  allowUnscoped?: boolean;                         // Default: false
  excludeFields?: string[];                        // Fields to exclude from filter
  additionalConditions?: RbacFilterConditionItem[]; // Static conditions to merge
};
```

---

## 14. Configuration

**File:** `configs/mkt-rbac.config.ts`

### MKT_RBAC_CONFIG (Zod-validated from env vars)

| Config | Env Var | Default | Mô tả |
|--------|---------|---------|-------|
| `USE_PERMISSION_CONTEXT` | `RBAC_USE_PERMISSION_CONTEXT` | `true` | Bật new flow (PermissionContext) |
| `FALLBACK_ON_ERROR` | `RBAC_FALLBACK_ON_ERROR` | `true` | Fallback về legacy khi new flow lỗi |
| `DEBUG_FILTER_RESOLUTION` | `RBAC_DEBUG_FILTER_RESOLUTION` | `false` | Log chi tiết filter resolution |
| `CACHE_TTL_SECONDS` | `RBAC_CACHE_TTL_SECONDS` | `600` | Cache TTL (10 phút) |
| `ENABLE_HIERARCHY_VALIDATION` | `RBAC_ENABLE_HIERARCHY_VALIDATION` | `true` | Bật hierarchy validation |
| `ENABLE_POLICY_ENGINE` | `RBAC_ENABLE_POLICY_ENGINE` | `true` | Bật policy engine |
| `ENABLE_AUDIT_LOGGING` | `RBAC_ENABLE_AUDIT_LOGGING` | `true` | Bật audit logging |
| `ENABLE_CACHING` | `RBAC_ENABLE_CACHING` | `true` | Bật caching |

### ENTERPRISE_RBAC_CONFIG

| Config | Env Var | Default | Mô tả |
|--------|---------|---------|-------|
| `enableMetrics` | `RBAC_ENABLE_METRICS` | `true` | RBAC metrics |
| `enableDebugMode` | `RBAC_DEBUG_MODE` | `false` | Debug mode |

---

## 15. Sequence Diagram

```
┌──────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Client│  │Auth Guards │  │DeptGuard │  │DataScope  │  │RbacCtx   │  │RbacEnf   │  │PermCtx   │
│      │  │            │  │(APP_GUARD)│  │Interceptor│  │Service   │  │Service   │  │Service   │
└──┬───┘  └─────┬──────┘  └────┬─────┘  └────┬──────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
   │            │              │              │              │              │              │
   │  request   │              │              │              │              │              │
   ├───────────►│              │              │              │              │              │
   │            │              │              │              │              │              │
   │            │ JWT validate │              │              │              │              │
   │            ├──────────────┤              │              │              │              │
   │            │              │              │              │              │              │
   │            │  pass        │              │              │              │              │
   │            ├─────────────►│              │              │              │              │
   │            │              │              │              │              │              │
   │            │              │ resolveContext│              │              │              │
   │            │              ├──────────────┼─────────────►│              │              │
   │            │              │              │              │  UserContext  │              │
   │            │              │◄─────────────┼──────────────┤              │              │
   │            │              │              │              │              │              │
   │            │              │ checkHierarchy              │              │              │
   │            │              ├──┐           │              │              │              │
   │            │              │  │ level <=3?│              │              │              │
   │            │              │◄─┘           │              │              │              │
   │            │              │              │              │              │              │
   │            │              │  pass/deny   │              │              │              │
   │            │              ├─────────────►│              │              │              │
   │            │              │              │              │              │              │
   │            │              │              │ resolveCtx   │              │              │
   │            │              │              ├─────────────►│              │              │
   │            │              │              │              │  UserContext  │              │
   │            │              │              │◄─────────────┤              │              │
   │            │              │              │              │              │              │
   │            │              │              │ getDataFilter│              │              │
   │            │              │              ├──────────────┼─────────────►│              │
   │            │              │              │              │              │              │
   │            │              │              │              │              │ getContextKey│
   │            │              │              │              │              ├─────────────►│
   │            │              │              │              │              │  PermCtx     │
   │            │              │              │              │              │◄─────────────┤
   │            │              │              │              │              │              │
   │            │              │              │              │              │ resolveFilter│
   │            │              │              │              │              ├──┐           │
   │            │              │              │              │              │  │ $user.*   │
   │            │              │              │              │              │◄─┘           │
   │            │              │              │              │              │              │
   │            │              │              │  FilterCondition            │              │
   │            │              │              │◄─────────────┼──────────────┤              │
   │            │              │              │              │              │              │
   │            │              │              │ attach to req│              │              │
   │            │              │              ├──┐          │              │              │
   │            │              │              │  │dataScope │              │              │
   │            │              │              │◄─┘          │              │              │
   │            │              │              │              │              │              │
   │            │              │              │  next.handle()             │              │
   │            │              │              ├───────────────────────────────────────────►│
   │            │              │              │              │              │              │
   │  response  │              │              │              │              │              │
   │◄───────────┼──────────────┼──────────────┤              │              │              │
   │            │              │              │              │              │              │
```

---

## Tóm tắt luồng (1 câu)

> Request → **Auth Guards** (JWT) → **DepartmentAuthGuard** (template → executive → manager → department) → **DataScopeInterceptor** (resolveContext → checkPermission → buildDataFilter [DataAccessPolicy → PermissionContext → FilterExpressionResolver]) → **attach `req.dataScope`** → **Handler**.
