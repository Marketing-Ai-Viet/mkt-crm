# RBAC Dependency Injection Fix Report

## Issue Summary

**Date**: 2026-02-03
**Severity**: Critical
**Affected Module**: `mkt-rbac-enterprise-grade`
**Error Message**: `Workspace not found in context`

---

## Root Cause Analysis

### Problem Description

Khi gọi GraphQL query `getOrderById` với access token hợp lệ, hệ thống trả về lỗi:

```json
{
  "errors": [
    {
      "message": "Workspace not found in context",
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR"
      }
    }
  ]
}
```

### Technical Root Cause

Lỗi xảy ra do **workspace context không khả dụng** khi repository methods được gọi từ global interceptor context.

#### Flow gây lỗi:

```
1. Request → GraphQL endpoint với Bearer token
2. Middleware → Set request.workspace từ token
3. Guards → WorkspaceAuthGuard, UserAuthGuard (PASS)
4. Global Interceptor → DataScopeInterceptor chạy
   └── RbacContextService.resolveContext() được gọi
       └── Repository methods gọi getRepository() KHÔNG có workspaceId
           └── ScopedWorkspaceContextFactory.create().workspaceId = null
               └── ❌ THROW: "Workspace not found in context"
```

#### Nguyên nhân gốc:

`ScopedWorkspaceContextFactory` là **REQUEST-scoped** provider, được thiết kế để hoạt động trong HTTP request context thông thường. Tuy nhiên, khi chạy từ **global interceptor** (registered via `APP_INTERCEPTOR`), factory không thể resolve workspace context đúng cách.

---

## Files Affected

| File | Issue |
|------|-------|
| `mkt-rbac-enterprise-grade.module.ts` | Global interceptor registration |
| `data-scope.interceptor.ts` | Extract workspace từ request |
| `rbac-context.service.ts` | Gọi repository methods không có workspaceId |
| `base-workspace.repository.ts` | getRepository() throw error khi không có workspace |
| `mkt-department.repository.ts` | Thiếu workspace-scoped methods |
| `mkt-workspace-member.repository.ts` | Thiếu workspace-scoped methods |
| `mkt-order.repository.ts` | Thiếu workspace-scoped methods |
| `order-query.resolver.ts` | Không truyền workspaceId cho repository |

---

## Solution Implementation

### 1. Global Interceptor Registration (Already Fixed)

**File**: `mkt-rbac-enterprise-grade.module.ts`

```typescript
// BEFORE: useClass không inject dependencies đúng cách
{
  provide: APP_INTERCEPTOR,
  useClass: DataScopeInterceptor,
}

// AFTER: Factory provider với explicit dependency injection
{
  provide: APP_INTERCEPTOR,
  useFactory: (
    reflector: Reflector,
    rbacEnforcerService: RbacEnforcerService,
    rbacContextService: RbacContextService,
    rbacCacheService: RbacCacheService,
  ) =>
    new DataScopeInterceptor(
      reflector,
      rbacEnforcerService,
      rbacContextService,
      rbacCacheService,
    ),
  inject: [
    Reflector,
    RbacEnforcerService,
    RbacContextService,
    RbacCacheService,
  ],
}
```

### 2. Workspace-Scoped Repository Methods

**Pattern**: Thêm methods với explicit `workspaceId` parameter.

#### MktDepartmentRepository

```typescript
// NEW METHOD
async findByManagerIdWithWorkspace(
  workspaceId: string,
  managerId: string,
): Promise<MktDepartmentWorkspaceEntity[]> {
  const repository = await this.getRepository(workspaceId);
  return repository.find({ where: { managerId } });
}
```

#### MktWorkspaceMemberRepository

```typescript
// NEW METHODS
async findByUserIdWithWorkspace(
  workspaceId: string,
  userId: string,
  options?: FindWorkspaceMemberOptions,
): Promise<WorkspaceMemberWorkspaceEntity | null>

async findByDepartmentWithWorkspace(
  workspaceId: string,
  departmentId: string,
  options?: FindWorkspaceMemberOptions,
): Promise<WorkspaceMemberWorkspaceEntity[]>

async findAllActiveWithWorkspace(
  workspaceId: string,
  options?: FindWorkspaceMemberOptions,
): Promise<WorkspaceMemberWorkspaceEntity[]>

async findManyMembersWithWorkspace(
  workspaceId: string,
  where: FindOptionsWhere<WorkspaceMemberWorkspaceEntity>,
  options?: FindWorkspaceMemberOptions,
): Promise<WorkspaceMemberWorkspaceEntity[]>
```

#### MktOrderRepository

```typescript
// NEW METHODS
async findOneWithWhereWorkspace(
  workspaceId: string,
  where: FindOptionsWhere<MktOrderWorkspaceEntity> | FindOptionsWhere<MktOrderWorkspaceEntity>[],
  options?: FindOrderOptions,
): Promise<MktOrderWorkspaceEntity | null>

async findManyWithWhereWorkspace(
  workspaceId: string,
  where: FindOptionsWhere<MktOrderWorkspaceEntity> | FindOptionsWhere<MktOrderWorkspaceEntity>[],
  options?: FindOrderOptions,
): Promise<MktOrderWorkspaceEntity[]>

async getCustomerOrderStatsWithWorkspace(
  workspaceId: string,
  customerId: string,
): Promise<CustomerOrderStats>
```

### 3. RbacContextService Updates

**File**: `rbac-context.service.ts`

```typescript
// BEFORE: Gọi repository methods không có workspaceId
const managedDepts = await this.departmentRepository.findByManagerId(workspaceMemberId);
const members = await this.workspaceMemberRepository.findByDepartment(deptId);
const allMembers = await this.workspaceMemberRepository.findAllActive();

// AFTER: Sử dụng workspace-scoped methods
const managedDepts = await this.departmentRepository.findByManagerIdWithWorkspace(
  workspaceId,
  workspaceMemberId,
);
const members = await this.workspaceMemberRepository.findByDepartmentWithWorkspace(
  workspaceId,
  deptId,
);
const allMembers = await this.workspaceMemberRepository.findAllActiveWithWorkspace(
  workspaceId,
);
```

### 4. Resolver Updates

**File**: `order-query.resolver.ts`

```typescript
// BEFORE: Không có workspace context
async getOrderById(
  @Args('orderId') orderId: string,
  @Context() ctx: GraphQLContext,
): Promise<OrderOutput | null> {
  const order = await this.orderRepository.findOneWithWhere(whereClause);
  // ❌ FAIL: getRepository() không có workspaceId
}

// AFTER: Sử dụng @AuthWorkspace decorator
async getOrderById(
  @Args('orderId') orderId: string,
  @Context() ctx: GraphQLContext,
  @AuthWorkspace() workspace: Workspace,  // ✅ Lấy workspace từ request
): Promise<OrderOutput | null> {
  const order = await this.orderRepository.findOneWithWhereWorkspace(
    workspace.id,  // ✅ Truyền workspaceId explicitly
    whereClause,
  );
}
```

---

## Changes Summary

### New Repository Methods

| Repository | Method | Purpose |
|------------|--------|---------|
| `MktDepartmentRepository` | `findByManagerIdWithWorkspace()` | Find departments by manager with workspace |
| `MktWorkspaceMemberRepository` | `findByUserIdWithWorkspace()` | Find member by userId with workspace |
| `MktWorkspaceMemberRepository` | `findByDepartmentWithWorkspace()` | Find members by department with workspace |
| `MktWorkspaceMemberRepository` | `findAllActiveWithWorkspace()` | Find all active members with workspace |
| `MktWorkspaceMemberRepository` | `findManyMembersWithWorkspace()` | Find members with custom where + workspace |
| `MktOrderRepository` | `findOneWithWhereWorkspace()` | Find single order with workspace |
| `MktOrderRepository` | `findManyWithWhereWorkspace()` | Find orders with workspace |
| `MktOrderRepository` | `getCustomerOrderStatsWithWorkspace()` | Get customer stats with workspace |

### Updated Service Methods

| Service | Method | Changes |
|---------|--------|---------|
| `RbacContextService` | `getSubordinates()` | Use workspace-scoped repository methods |
| `RbacContextService` | `isUserManager()` | Use `findByManagerIdWithWorkspace()` |
| `RbacContextService` | `getTeamMembers()` | Use `findByDepartmentWithWorkspace()` |
| `RbacContextService` | `getSupportingMembers()` | Use `findManyMembersWithWorkspace()` |

### Updated Resolvers

| Resolver | Methods | Changes |
|----------|---------|---------|
| `OrderQueryResolver` | All query methods | Added `@AuthWorkspace()` decorator, use workspace-scoped repository methods |

---

## Testing

### Test Query

```graphql
query GetOrderById {
  getOrderById(orderId: "your-order-id") {
    id
    name
    orderCode
    status
    totalAmount
  }
}
```

### Expected Result

```json
{
  "data": {
    "getOrderById": {
      "id": "...",
      "name": "...",
      "orderCode": "ORD-...",
      "status": "PENDING",
      "totalAmount": 1000000
    }
  }
}
```

---

## Best Practices

### 1. Repository Method Naming Convention

```typescript
// Standard method (uses ScopedWorkspaceContextFactory)
async findByManagerId(managerId: string): Promise<Entity[]>

// Workspace-scoped method (explicit workspaceId)
async findByManagerIdWithWorkspace(workspaceId: string, managerId: string): Promise<Entity[]>
```

### 2. When to Use Workspace-Scoped Methods

| Context | Use Standard Method | Use Workspace-Scoped Method |
|---------|--------------------|-----------------------------|
| Service called from Controller | ✅ | |
| Service called from Resolver (with request context) | ✅ | |
| Service called from Global Interceptor | | ✅ |
| Service called from Background Job | | ✅ |
| Service called from Event Handler | | ✅ |

### 3. Resolver Pattern with @AuthWorkspace

```typescript
@Query(() => EntityOutput)
@DataScope({ resource: 'entity', mode: 'AUTO' })
async getEntity(
  @Args('id') id: string,
  @Context() ctx: GraphQLContext,
  @AuthWorkspace() workspace: Workspace,  // Always add this
): Promise<EntityOutput | null> {
  // Use workspace.id for repository calls
  return this.repository.findByIdWithWorkspace(workspace.id, id);
}
```

---

## Lessons Learned

1. **Global Interceptors** cần factory provider với explicit dependency injection
2. **REQUEST-scoped providers** không hoạt động đáng tin cậy trong global interceptor context
3. **Repository methods** nên có cả standard và workspace-scoped versions
4. **Resolvers** sử dụng `@DataScope` decorator nên luôn có `@AuthWorkspace()` parameter
5. **Debug logging** trong interceptor giúp diagnose workspace context issues

---

## Related Files

- `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module.ts`
- `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/interceptors/data-scope.interceptor.ts`
- `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-context.service.ts`
- `packages/twenty-server/src/mkt-core/common/repositories/base-workspace.repository.ts`
- `packages/twenty-server/src/mkt-core/mkt-department/repositories/mkt-department.repository.ts`
- `packages/twenty-server/src/mkt-core/workspace-member/repositories/mkt-workspace-member.repository.ts`
- `packages/twenty-server/src/mkt-core/order/repositories/mkt-order.repository.ts`
- `packages/twenty-server/src/mkt-core/order/resolvers/order-query.resolver.ts`
