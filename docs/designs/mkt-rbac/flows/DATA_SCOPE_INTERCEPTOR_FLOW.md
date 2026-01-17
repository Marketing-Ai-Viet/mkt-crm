# DataScope Interceptor Flow

Tài liệu giải thích chi tiết các bước xử lý trong `DataScopeInterceptor` - NestJS Interceptor cho Row-Level Security.

## Tổng Quan

`DataScopeInterceptor` tự động resolve data filters dựa trên user context và access policies. Interceptor được trigger bởi `@DataScope` decorator và attach filter vào `request.dataScope` cho downstream handlers sử dụng.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DataScopeInterceptor Flow                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GraphQL Request                                                             │
│       │                                                                      │
│       ▼                                                                      │
│  ┌───────────────────────────────┐                                          │
│  │ @DataScope({ resource: ... }) │  ← Decorator trigger Interceptor          │
│  └───────────────────────────────┘                                          │
│       │                                                                      │
│       ▼                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    DataScopeInterceptor.intercept()                    │  │
│  │                                                                        │  │
│  │  [Get Metadata] → [Extract Context] → [Validate] → [Resolve Scope]     │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│       │                                                                      │
│       ▼                                                                      │
│  ┌───────────────────────────────┐                                          │
│  │ request.dataScope = {         │                                          │
│  │   filter: { ... },            │  ← Attached to request                   │
│  │   hasFullAccess: boolean,     │                                          │
│  │   userContext: { ... }        │                                          │
│  │ }                             │                                          │
│  └───────────────────────────────┘                                          │
│       │                                                                      │
│       ▼                                                                      │
│  Resolver receives ctx.req.dataScope                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Thứ Tự Xử Lý (Processing Steps)

| Step | Method/Action | Mô tả | Output |
|------|---------------|-------|--------|
| 1 | Get Metadata | Lấy metadata từ `@DataScope` decorator | `DataScopeMetadata` |
| 2 | Extract Context | Extract userId, workspaceId từ request | Context objects |
| 3 | Validate Context | Kiểm tra userId và workspaceId | Error hoặc continue |
| 4 | Handle SKIP Mode | Nếu mode = 'SKIP', skip filtering | `skipped: true` |
| 5 | Resolve Data Scope | Resolve user context và data filter | `DataScopeContext` |
| 6 | Attach to Request | Gắn dataScope vào request | `request.dataScope` |

---

## Chi Tiết Từng Bước Xử Lý

### Step 1: Get Metadata

**Action**: Reflector lấy metadata từ `@DataScope` decorator

**Code Reference**: `data-scope.interceptor.ts:88-96`

```typescript
const metadata = this.reflector.get<DataScopeMetadata>(
  DATA_SCOPE_METADATA_KEY,
  context.getHandler(),
);

// No metadata - skip interceptor
if (!metadata) {
  return next.handle();
}
```

**Logic**:
```
IF không có @DataScope decorator
   → SKIP interceptor, tiếp tục request bình thường

ELSE
   → Extract metadata: resource, mode, enableCache, auditLevel, etc.
```

**DataScopeMetadata Structure**:
```typescript
type DataScopeMetadata = {
  resource: string;           // Required: 'mktOrder', 'mktCustomer'
  mode: 'AUTO' | 'MANUAL' | 'SKIP';
  enableCache: boolean;       // Default: true
  cacheTTL: number;           // Default: 300000 (5 minutes)
  auditLevel: 'low' | 'medium' | 'high';
  errorMessage: string;
  allowUnscoped: boolean;     // Default: false
  excludeFields?: string[];
  additionalConditions?: FilterConditionItem[];
};
```

---

### Step 2: Extract Context

**Method**: `extractContext()`

**Code Reference**: `data-scope.interceptor.ts:180-208`

**Mục đích**: Extract userId và workspaceId từ ExecutionContext (GraphQL hoặc HTTP)

**Logic**:
```
IF contextType === 'graphql'
   → GqlExecutionContext.create(context)
   → Extract từ ctx.req

ELSE (HTTP)
   → context.switchToHttp().getRequest()
   → Extract từ request object
```

**Context Extraction Sources**:
| Field | Primary Source | Fallback Source |
|-------|---------------|-----------------|
| `userId` | `request.user?.id` | - |
| `workspaceId` | `request.workspace?.id` | `request.workspaceId` |

**Ví dụ GraphQL Context**:
```typescript
// GraphQL context structure
{
  req: {
    user: { id: 'user-123' },
    workspace: { id: 'workspace-456' },
    // dataScope sẽ được attach ở đây
  }
}
```

---

### Step 3: Validate Context

**Code Reference**: `data-scope.interceptor.ts:112-143`

**Mục đích**: Đảm bảo có đủ thông tin user và workspace để resolve scope

**Logic**:
```
IF userId không tồn tại
   IF allowUnscoped = true
      → attachEmptyScope() và continue
   ELSE
      → throw ForbiddenException

IF workspaceId không tồn tại
   IF allowUnscoped = true
      → attachEmptyScope() và continue
   ELSE
      → throw ForbiddenException
```

**Error Messages**:
| Condition | Message |
|-----------|---------|
| No user | `'User not found in request context'` |
| No workspace | `'Workspace not found in request context'` |
| Custom | `options.errorMessage` |

**Empty Scope Structure**:
```typescript
{
  resource: 'mktOrder',
  filter: null,
  userContext: null,
  hasFullAccess: false,
  skipped: false,
  reason: 'No user context',
  resolvedAt: '2024-01-15T10:30:00.000Z',
  latencyMs: 5
}
```

---

### Step 4: Handle SKIP Mode

**Code Reference**: `data-scope.interceptor.ts:146-153`

**Mục đích**: Cho phép admin endpoints bypass filtering hoàn toàn

**Logic**:
```
IF mode === 'SKIP'
   → Log skip reason
   → attachSkippedScope()
   → return next.handle()
```

**Skipped Scope Structure**:
```typescript
{
  resource: 'mktOrder',
  filter: null,
  userContext: null,
  hasFullAccess: true,   // Full access khi skip
  skipped: true,         // Mark as skipped
  reason: 'Data scope skipped by configuration',
  resolvedAt: '2024-01-15T10:30:00.000Z',
  latencyMs: 2
}
```

**Use Case**: Admin endpoints
```typescript
@Query(() => [MktOrder])
@DataScope({
  resource: 'mktOrder',
  mode: 'SKIP',  // Skip filtering cho admin
  auditLevel: 'high'  // Log admin access
})
async adminGetAllOrders() { ... }
```

---

### Step 5: Resolve Data Scope

**Method**: `resolveDataScope()`

**Code Reference**: `data-scope.interceptor.ts:213-331`

**Mục đích**: Resolve user context và data filter dựa trên hierarchy level

**Sub-steps**:

#### 5.1 Check Cache

```
IF enableCache = true
   → Check rbacCacheService.getDataFilter()

IF cache hit
   → Return cached filter với userContext
   → Log "Data scope cache hit for {resource}"

ELSE
   → Log "Data scope cache miss for {resource}"
   → Continue to resolve
```

#### 5.2 Get User Context

```typescript
const userContext = await this.rbacContextService.resolveContext(
  userId,
  workspaceId,
);
```

**UserContext Structure**:
```typescript
type UserContext = {
  workspaceMemberId: string;
  userId: string;
  workspaceId: string;
  hierarchyLevel: number;
  departmentCode: string | null;
  departmentAncestorCodes: string[];
  teamId: string | null;
  teamMemberIds: string[];
  subordinateMemberIds: string[];
  templates: MktPermissionTemplateWorkspaceEntity[];
  templateKeys: string[];
  hasFullAccess: boolean;
  isManager: boolean;
};
```

#### 5.3 Handle User Not Found

```
IF userContext = null
   → Return scope với filter: null và reason: 'User context not found'
```

#### 5.4 Handle Full Access Users

```
IF userContext.hasFullAccess = true (Executive level 1-3)
   → Return scope với filter chỉ từ additionalConditions (nếu có)
   → hasFullAccess: true
   → Log "User has full access - no data scope applied"
```

**Full Access Levels**:
| Level | Role | hasFullAccess |
|-------|------|---------------|
| 1 | CEO | true |
| 2 | C_LEVEL | true |
| 3 | VP | true |
| 4+ | Others | false |

#### 5.5 Get Data Filter

```typescript
const filter = await this.rbacEnforcerService.getDataFilter(
  userId,
  workspaceId,
  resource,
);
```

**Filter Structure (từ RbacEnforcerService)**:
```typescript
type FilterCondition = {
  type: 'AND' | 'OR';
  conditions: FilterConditionItem[];
};

type FilterConditionItem = {
  field: string;           // 'createdById', 'departmentId'
  operator: FilterOperator; // '=', 'IN', 'IS_NULL', etc.
  value: unknown;
  description?: string;
};
```

**Filter Examples theo Access Scope**:

| Access Scope | Filter |
|--------------|--------|
| ALL | `null` (no filter) |
| REPORTING_CHAIN | `{ createdById: { in: [self, subordinates, team] } }` |
| DIRECT_SUBORDINATES | `{ createdById: { in: [self, directSubordinates] } }` |
| SELF | `{ createdById: { eq: userId } }` |

#### 5.6 Merge Filters

```typescript
const mergedFilter = this.mergeFilters(filter, additionalConditions);
```

**Merge Logic**:
```
IF additionalConditions rỗng
   → Return base filter

IF base filter null
   → Return { type: 'AND', conditions: additionalConditions }

ELSE
   → Return { type: 'AND', conditions: [...filter.conditions, ...additionalConditions] }
```

**Ví dụ**:
```typescript
// Base filter (từ hierarchy)
{ type: 'AND', conditions: [
  { field: 'createdById', operator: 'IN', value: ['user1', 'user2'] }
]}

// Additional conditions (từ decorator)
[{ field: 'status', operator: '!=', value: 'DELETED' }]

// Merged result
{ type: 'AND', conditions: [
  { field: 'createdById', operator: 'IN', value: ['user1', 'user2'] },
  { field: 'status', operator: '!=', value: 'DELETED' }
]}
```

#### 5.7 Cache Result

```
IF enableCache = true AND filter exists
   → rbacCacheService.setDataFilter(userId, workspaceId, resource, filter, cacheTTL)
```

---

### Step 6: Attach to Request

**Code Reference**: `data-scope.interceptor.ts:165`

**Action**: Gắn resolved DataScopeContext vào request

```typescript
request.dataScope = dataScopeContext;
```

**Final DataScopeContext Structure**:
```typescript
type DataScopeContext = {
  resource: string;
  filter: FilterCondition | null;
  userContext: UserContext | null;
  hasFullAccess: boolean;
  skipped: boolean;
  reason?: string;
  resolvedAt: string;    // ISO timestamp
  latencyMs: number;     // Resolution time
};
```

---

## Flow Diagram Chi Tiết

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         DataScopeInterceptor.intercept()                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Input: ExecutionContext + CallHandler                                        │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Step 1: Get Metadata                                                     │ │
│  │                                                                          │ │
│  │  @DataScope decorator exists?                                            │ │
│  │         │                                                                │ │
│  │    ┌────┴────┐                                                           │ │
│  │   No        Yes                                                          │ │
│  │    │         │                                                           │ │
│  │    ▼         ▼                                                           │ │
│  │ SKIP    Extract: resource, mode, enableCache, etc.                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                   │                                           │
│                                   ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Step 2: Extract Context                                                  │ │
│  │                                                                          │ │
│  │  contextType === 'graphql'?                                              │ │
│  │         │                                                                │ │
│  │    ┌────┴────┐                                                           │ │
│  │   Yes       No                                                           │ │
│  │    │         │                                                           │ │
│  │    ▼         ▼                                                           │ │
│  │ GqlContext  HttpRequest                                                  │ │
│  │    │         │                                                           │ │
│  │    └────┬────┘                                                           │ │
│  │         ▼                                                                │ │
│  │  Extract: userId, workspaceId, request                                   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                   │                                           │
│                                   ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Step 3: Validate Context                                                 │ │
│  │                                                                          │ │
│  │  userId exists?────────────────────────────────────────┐                 │ │
│  │         │                                              │                 │ │
│  │        No                                             Yes                │ │
│  │         │                                              │                 │ │
│  │         ▼                                              ▼                 │ │
│  │  allowUnscoped?                               workspaceId exists?        │ │
│  │    │       │                                      │       │              │ │
│  │   Yes     No                                     No      Yes             │ │
│  │    │       │                                      │       │              │ │
│  │    ▼       ▼                                      ▼       │              │ │
│  │ Empty   THROW                              allowUnscoped? │              │ │
│  │ Scope  ForbiddenException                    │     │      │              │ │
│  │    │                                        Yes   No      │              │ │
│  │    │                                         │     │      │              │ │
│  │    │                                         ▼     ▼      │              │ │
│  │    │                                      Empty  THROW    │              │ │
│  │    │                                      Scope  Forbidden│              │ │
│  │    └─────────────────────────────────────────┴────────────┘              │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                   │                                           │
│                                   ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Step 4: Handle SKIP Mode                                                 │ │
│  │                                                                          │ │
│  │  mode === 'SKIP'?                                                        │ │
│  │         │                                                                │ │
│  │    ┌────┴────┐                                                           │ │
│  │   Yes       No                                                           │ │
│  │    │         │                                                           │ │
│  │    ▼         │                                                           │ │
│  │ attachSkippedScope()                                                     │ │
│  │ return next.handle()                                                     │ │
│  │    │         │                                                           │ │
│  │  EXIT        ▼                                                           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                   │                                           │
│                                   ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Step 5: resolveDataScope()                                               │ │
│  │                                                                          │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │ │
│  │  │ 5.1 Check Cache                                                  │    │ │
│  │  │                                                                  │    │ │
│  │  │  enableCache && cached filter exists?                            │    │ │
│  │  │         │                                                        │    │ │
│  │  │    ┌────┴────┐                                                   │    │ │
│  │  │   Yes       No                                                   │    │ │
│  │  │    │         │                                                   │    │ │
│  │  │    ▼         ▼                                                   │    │ │
│  │  │ Return   Continue                                                │    │ │
│  │  │ cached                                                           │    │ │
│  │  └─────────────────────────────────────────────────────────────────┘    │ │
│  │                                   │                                      │ │
│  │                                   ▼                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │ │
│  │  │ 5.2 Get User Context                                             │    │ │
│  │  │                                                                  │    │ │
│  │  │  rbacContextService.resolveContext(userId, workspaceId)          │    │ │
│  │  │         │                                                        │    │ │
│  │  │         ▼                                                        │    │ │
│  │  │  userContext found?                                              │    │ │
│  │  │    │       │                                                     │    │ │
│  │  │   No      Yes                                                    │    │ │
│  │  │    │       │                                                     │    │ │
│  │  │    ▼       │                                                     │    │ │
│  │  │ Return     │                                                     │    │ │
│  │  │ filter:null│                                                     │    │ │
│  │  └─────────────────────────────────────────────────────────────────┘    │ │
│  │                                   │                                      │ │
│  │                                   ▼                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │ │
│  │  │ 5.3 Check Full Access                                            │    │ │
│  │  │                                                                  │    │ │
│  │  │  userContext.hasFullAccess? (Executive level 1-3)                │    │ │
│  │  │         │                                                        │    │ │
│  │  │    ┌────┴────┐                                                   │    │ │
│  │  │   Yes       No                                                   │    │ │
│  │  │    │         │                                                   │    │ │
│  │  │    ▼         │                                                   │    │ │
│  │  │ Return       │                                                   │    │ │
│  │  │ hasFullAccess:true                                               │    │ │
│  │  │ filter: additionalConditions only                                │    │ │
│  │  └─────────────────────────────────────────────────────────────────┘    │ │
│  │                                   │                                      │ │
│  │                                   ▼                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │ │
│  │  │ 5.4 Get Data Filter                                              │    │ │
│  │  │                                                                  │    │ │
│  │  │  rbacEnforcerService.getDataFilter(userId, workspaceId, resource)│    │ │
│  │  │         │                                                        │    │ │
│  │  │         ▼                                                        │    │ │
│  │  │  Merge với additionalConditions                                  │    │ │
│  │  │         │                                                        │    │ │
│  │  │         ▼                                                        │    │ │
│  │  │  Cache result (if enableCache)                                   │    │ │
│  │  │         │                                                        │    │ │
│  │  │         ▼                                                        │    │ │
│  │  │  Return DataScopeContext                                         │    │ │
│  │  └─────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                   │                                           │
│                                   ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Step 6: Attach to Request                                                │ │
│  │                                                                          │ │
│  │  request.dataScope = dataScopeContext                                    │ │
│  │  return next.handle()                                                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Access Scope Reference

### Access Scope theo Hierarchy Level

| Hierarchy Level | Role | Access Scope | hasFullAccess | Filter Applied |
|-----------------|------|--------------|---------------|----------------|
| 1 | CEO | ALL | true | None |
| 2 | C_LEVEL | ALL | true | None |
| 3 | VP | ALL | true | None |
| 4 | SENIOR_DIRECTOR | REPORTING_CHAIN | false | createdById IN [self, subordinates, team] |
| 5 | DIRECTOR | REPORTING_CHAIN | false | createdById IN [self, subordinates, team] |
| 6 | SENIOR_MANAGER | REPORTING_CHAIN | false | createdById IN [self, subordinates, team] |
| 7 | MANAGER | DIRECT_SUBORDINATES | false | createdById IN [self, directSubordinates] |
| 8 | TEAM_LEAD | SELF | false | createdById = self |
| 9 | SENIOR | SELF | false | createdById = self |
| 10 | STAFF | SELF | false | createdById = self |
| 11 | INTERN | SELF | false | createdById = self |

---

## Ví Dụ Sử Dụng

### Basic Usage

```typescript
@Query(() => [MktOrder])
@DataScope({ resource: 'mktOrder' })
async getOrders(@Context() ctx: GraphQLContext): Promise<MktOrder[]> {
  const dataScope = ctx.req.dataScope;

  // Check full access
  if (dataScope?.hasFullAccess) {
    return this.orderService.findAll();
  }

  // Apply hierarchical filter
  const where = filterToWhere(dataScope?.filter);
  return this.orderService.findWithFilter(where);
}
```

### With Additional Conditions

```typescript
@Query(() => [MktOrder])
@DataScope({
  resource: 'mktOrder',
  additionalConditions: [
    { field: 'status', operator: '!=', value: 'DELETED' },
    { field: 'deletedAt', operator: 'IS_NULL', value: true }
  ]
})
async getActiveOrders(@Context() ctx: GraphQLContext): Promise<MktOrder[]> {
  // Filter sẽ bao gồm cả hierarchical filter + additional conditions
  const where = filterToWhere(ctx.req.dataScope?.filter);
  return this.orderService.findWithFilter(where);
}
```

### Admin Endpoint (Skip Mode)

```typescript
@Query(() => [MktOrder])
@DataScope({
  resource: 'mktOrder',
  mode: 'SKIP',
  auditLevel: 'high'  // Log admin access
})
@RequirePermission('mktOrder', 'admin')
async adminGetAllOrders(): Promise<MktOrder[]> {
  // ctx.req.dataScope.skipped = true
  // ctx.req.dataScope.hasFullAccess = true
  return this.orderService.findAll();
}
```

### Manual Mode

```typescript
@Query(() => [MktOrder])
@DataScope({
  resource: 'mktOrder',
  mode: 'MANUAL'  // Filter attached but not auto-applied
})
async getOrdersWithCustomLogic(@Context() ctx: GraphQLContext): Promise<MktOrder[]> {
  const dataScope = ctx.req.dataScope;

  // Custom logic based on filter
  if (dataScope?.filter) {
    // Apply filter manually with custom transformations
    const customFilter = this.transformFilter(dataScope.filter);
    return this.orderService.findWithFilter(customFilter);
  }

  return this.orderService.findAll();
}
```

---

## Cấu Trúc DataScopeContext (Output)

```typescript
type DataScopeContext = {
  // Resource being accessed
  resource: string;  // 'mktOrder', 'mktCustomer', etc.

  // Data filter conditions to apply
  filter: FilterCondition | null;

  // User context used for filtering
  userContext: UserContext | null;

  // Whether user has full access (no filtering)
  hasFullAccess: boolean;

  // Whether filtering was skipped (mode: 'SKIP')
  skipped: boolean;

  // Reason for skip or null filter
  reason?: string;

  // Timestamp when scope was resolved (ISO)
  resolvedAt: string;

  // Latency in milliseconds
  latencyMs: number;
};
```

---

## Dependencies

| Service | Responsibility |
|---------|---------------|
| `Reflector` | Get metadata from @DataScope decorator |
| `RbacEnforcerService` | Get data filter based on user permissions |
| `RbacContextService` | Resolve user context (hierarchy, department, etc.) |
| `RbacCacheService` | Cache filter results for performance |

---

## Error Handling

| Error Type | Trigger Condition | Resolution |
|------------|-------------------|------------|
| `ForbiddenException` | No userId + allowUnscoped=false | Thêm auth guard hoặc set allowUnscoped=true |
| `ForbiddenException` | No workspaceId + allowUnscoped=false | Thêm workspace guard |
| Empty scope | User context not found | Assign organizationLevel cho user |
| No filter | hasFullAccess=true | Expected behavior cho executives |

---

## Performance Considerations

1. **Caching**: Enable cache (default) để giảm database queries
2. **Cache TTL**: Default 5 phút, có thể tùy chỉnh qua `cacheTTL`
3. **Early exit**: SKIP mode và full access users exit sớm
4. **Latency tracking**: Mỗi request ghi nhận `latencyMs`

---

## Audit Levels

| Level | Logging |
|-------|---------|
| `low` | Basic resolution logs |
| `medium` | Include filter details |
| `high` | Full request/response audit |

---

## Lưu Ý Quan Trọng

1. **Decorator Required**: Interceptor chỉ active khi có `@DataScope` decorator

2. **Guards Order**: Đặt auth guards TRƯỚC `@DataScope`:
   ```typescript
   @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
   @DataScope({ resource: 'mktOrder' })
   ```

3. **Context Type**: Hỗ trợ cả GraphQL và HTTP contexts

4. **Filter Null Cases**:
   - `filter: null` + `hasFullAccess: true` = Executive, không cần filter
   - `filter: null` + `hasFullAccess: false` = Error hoặc allowUnscoped

5. **Additional Conditions**: Luôn được apply, kể cả với full access users

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-16 | System | Initial documentation |
