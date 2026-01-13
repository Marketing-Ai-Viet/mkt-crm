# Roadmap Triển Khai Hệ Thống RBAC Theo Role và Phòng Ban

## Tổng Quan

Roadmap này mô tả các giai đoạn triển khai hệ thống phân quyền RBAC (Role-Based Access Control) kết hợp với phân quyền theo phòng ban cho CRM.

**Cập nhật lần cuối:** 2026-01-13

---

## Trạng Thái Tổng Quan

| Phase | Trạng thái | Tiến độ |
|-------|-----------|---------|
| Phase 1: Foundation | ✅ Hoàn thành | 100% |
| Phase 2: Core Services | ⚪ Chưa bắt đầu | 0% |
| Phase 3: Integration | ⚪ Chưa bắt đầu | 0% |
| Phase 4: Data Seeding | 🟡 Đang thực hiện | ~85% |
| Phase 5: Testing | ⚪ Chưa bắt đầu | 0% |
| Phase 6: Documentation | ⚪ Chưa bắt đầu | 0% |
| Phase 7: Advanced | ⚪ Chưa bắt đầu | 0% |

---

## Phase 1: Foundation - Thiết Lập Nền Tảng ✅

### 1.1 Database Schema & Entities

| Task | Mô tả | Status | Records |
|------|-------|--------|---------|
| Tạo `MktOrganizationLevel` entity | Cấp bậc tổ chức | ✅ Done | 5 |
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

### 1.4 Issues Cần Xử Lý

| Issue | Mô tả | Priority |
|-------|-------|----------|
| ~~Organization Levels thiếu~~ | ~~Chỉ có 5 levels~~ → Đã thêm đủ 11 levels | ✅ Done |
| Resource Keys naming | Dùng `CUSTOMERS` thay vì `mktCustomer` - cần mapping | 🟡 Medium |

---

## Appendix A: Organization Levels Specification

### A.1 Thiết Kế 11 Cấp Bậc (Theo Tài Liệu Gốc)

| Level | Code | Name | Mô tả | Data Access Scope |
|-------|------|------|-------|-------------------|
| 1 | CEO | Tổng Giám Đốc | Highest level | ALL DEPARTMENTS |
| 2 | C_LEVEL | C-Suite Executive | CFO, CTO, COO | ALL DEPARTMENTS |
| 3 | VP | Vice President | Phó Tổng Giám Đốc | ALL DEPARTMENTS |
| 4 | SENIOR_DIRECTOR | Senior Director | Giám đốc cấp cao | OWN + CHILD DEPARTMENTS |
| 5 | DIRECTOR | Director | Giám đốc | OWN + CHILD DEPARTMENTS |
| 6 | SENIOR_MANAGER | Senior Manager | Quản lý cấp cao | OWN + CHILD DEPARTMENTS |
| 7 | MANAGER | Manager | Quản lý | OWN DEPARTMENT + TEAM |
| 8 | SENIOR_SPECIALIST | Senior Specialist | Chuyên viên cao cấp | OWN RECORDS |
| 9 | SPECIALIST | Specialist | Chuyên viên | OWN RECORDS |
| 10 | JUNIOR_SPECIALIST | Junior Specialist | Chuyên viên sơ cấp | OWN RECORDS |
| 11 | INTERN | Intern | Thực tập sinh | OWN RECORDS |

### A.2 Trạng Thái: ✅ Hoàn Thành

**Tất cả 11 levels đã được implement trong seeder file:**

`packages/twenty-server/src/mkt-core/seeder/constants/mkt-organization-level-data-seeds.constants.ts`

**Backward compatibility aliases đã được thêm:**
| Legacy Code | New Code |
|-------------|----------|
| ADMIN | → CEO |
| TEAM_LEAD | → SENIOR_SPECIALIST |
| STAFF | → SPECIALIST |

**Chạy seeder để cập nhật database:**
```bash
npx nx command twenty-server -- mkt-organization-level-data-seed-dev-workspace
```

---

## Appendix B: Helper Functions (Source Code) ✅

> **Ghi chú:** Các functions này được implement trong source code TypeScript thay vì database functions để dễ maintain và test.

**File:** `packages/twenty-server/src/mkt-core/seeder/constants/mkt-organization-level-data-seeds.constants.ts`

### B.1 getDataAccessScopeByLevel()

Xác định scope truy cập dữ liệu dựa trên hierarchy level.

```typescript
export const getDataAccessScopeByLevel = (hierarchyLevel: number): DataAccessScopeType => {
  if (hierarchyLevel <= 3) return DATA_ACCESS_SCOPE.ALL_DEPARTMENTS;
  if (hierarchyLevel <= 6) return DATA_ACCESS_SCOPE.OWN_AND_CHILD_DEPARTMENTS;
  if (hierarchyLevel === 7) return DATA_ACCESS_SCOPE.OWN_DEPARTMENT_AND_TEAM;
  return DATA_ACCESS_SCOPE.OWN_RECORDS;
};
```

### B.2 hasFullAccess()

Kiểm tra user có quyền truy cập toàn bộ dữ liệu (level 1-3: CEO, C_LEVEL, VP).

```typescript
export const hasFullAccess = (hierarchyLevel: number): boolean => hierarchyLevel <= 3;
```

### B.3 canManageTeam()

Kiểm tra user có thể quản lý team (level 1-7).

```typescript
export const canManageTeam = (hierarchyLevel: number): boolean => hierarchyLevel <= 7;
```

### B.4 canViewSubordinates()

Kiểm tra user có thể xem dữ liệu của cấp dưới (level 1-7).

```typescript
export const canViewSubordinates = (hierarchyLevel: number): boolean => hierarchyLevel <= 7;
```

### B.5 getSubordinateLevels()

Lấy danh sách các level cấp dưới.

```typescript
export const getSubordinateLevels = (hierarchyLevel: number): number[] => {
  const levels: number[] = [];
  for (let i = hierarchyLevel + 1; i <= 11; i++) {
    levels.push(i);
  }
  return levels;
};
```

### B.6 getSuperiorLevels()

Lấy danh sách các level cấp trên.

```typescript
export const getSuperiorLevels = (hierarchyLevel: number): number[] => {
  const levels: number[] = [];
  for (let i = 1; i < hierarchyLevel; i++) {
    levels.push(i);
  }
  return levels;
};
```

### B.7 Các Functions Phức Tạp (Phase 2)

Các functions phức tạp sau sẽ được implement trong Phase 2 (Core Services):

| Function | Service | Mô tả |
|----------|---------|-------|
| `getSubordinateMemberIds()` | `RbacContextService` | Lấy member IDs cấp dưới trong department tree |
| `getSupportingMemberIds()` | `RbacContextService` | Lấy IDs của members được support |
| `getDepartmentAncestors()` | `DepartmentTreeService` | Lấy các phòng ban cha |
| `getDepartmentDescendants()` | `DepartmentTreeService` | Lấy các phòng ban con |

---

## Appendix C: Resource Keys Mapping

### C.1 Hiện Trạng vs Thiết Kế

| Current Key (DB) | Expected Key | Entity Name | Category |
|------------------|--------------|-------------|----------|
| CUSTOMERS | mktCustomer | MktCustomerWorkspaceEntity | CRM |
| CONTRACTS | mktContract | MktContractWorkspaceEntity | CRM |
| ORDERS | mktOrder | MktOrderWorkspaceEntity | SALES |
| PRODUCTS | mktProduct | N/A (external) | PRODUCT |
| LICENSES | mktLicense | MktLicenseWorkspaceEntity | PRODUCT |
| INVOICES | mktInvoice | MktInvoiceWorkspaceEntity | FINANCE |
| PAYMENTS | mktPayment | MktPaymentWorkspaceEntity | FINANCE |
| DEPARTMENTS | mktDepartment | MktDepartmentWorkspaceEntity | HR |
| USERS | workspaceMember | WorkspaceMemberWorkspaceEntity | HR |
| SETTINGS | mktOption | MktOptionWorkspaceEntity | SYSTEM |
| REPORTS | mktReport | MktReportWorkspaceEntity | REPORTING |
| DASHBOARD | N/A | N/A | REPORTING |

### C.2 Resources Cần Thêm

| Resource Key | Entity Name | Category | Priority |
|--------------|-------------|----------|----------|
| mktKpi | MktKpiWorkspaceEntity | REPORTING | Medium |
| mktPromotion | MktPromotionWorkspaceEntity | SALES | Low |
| mktCoupon | MktCouponWorkspaceEntity | SALES | Low |

### C.3 Migration Strategy

**Option 1: Rename (Breaking Change)**
```sql
UPDATE "mktPermissionResource" SET "resourceKey" = 'mktCustomer' WHERE "resourceKey" = 'CUSTOMERS';
-- ... repeat for all resources
```

**Option 2: Add Mapping Field (Non-Breaking)**
```sql
ALTER TABLE "mktPermissionResource" ADD COLUMN "entityName" TEXT;
UPDATE "mktPermissionResource" SET "entityName" = 'mktCustomer' WHERE "resourceKey" = 'CUSTOMERS';
```

**Recommended: Option 2** - Giữ backward compatibility

---

## Appendix D: Permission Actions

### D.1 CRUD Actions

| Action | Code | Mô tả |
|--------|------|-------|
| Read | READ | Xem dữ liệu |
| Create | CREATE | Tạo mới |
| Update | UPDATE | Cập nhật |
| Delete | DELETE | Xóa |

### D.2 Bulk Operations

| Action | Code | Mô tả |
|--------|------|-------|
| Bulk Create | BULK_CREATE | Tạo nhiều records |
| Bulk Update | BULK_UPDATE | Cập nhật nhiều records |
| Bulk Delete | BULK_DELETE | Xóa nhiều records |

### D.3 Import/Export

| Action | Code | Mô tả |
|--------|------|-------|
| Export | EXPORT | Xuất dữ liệu |
| Import | IMPORT | Nhập dữ liệu |

### D.4 Workflow Actions

| Action | Code | Mô tả |
|--------|------|-------|
| Approve | APPROVE | Phê duyệt |
| Reject | REJECT | Từ chối |

### D.5 Management Actions

| Action | Code | Mô tả |
|--------|------|-------|
| Manage Team | MANAGE_TEAM | Quản lý team |
| Assign Tasks | ASSIGN_TASKS | Gán công việc |
| View Team Reports | VIEW_TEAM_REPORTS | Xem báo cáo team |

### D.6 Sensitive Data Actions

| Action | Code | Mô tả |
|--------|------|-------|
| Access Salary Data | ACCESS_SALARY_DATA | Xem dữ liệu lương |
| View Financial Reports | VIEW_FINANCIAL_REPORTS | Xem báo cáo tài chính |

---

## Appendix E: Filter Condition Syntax

### E.1 Filter Condition Structure

```typescript
type FilterCondition = {
  type: 'AND' | 'OR';
  conditions: Array<{
    field: string;           // Column name or '*' for all
    operator: FilterOperator;
    value: unknown;          // Static value or ${user.xxx} placeholder
    description?: string;    // Optional description
  }>;
};
```

### E.2 Filter Operators

| Operator | SQL Equivalent | Mô tả |
|----------|----------------|-------|
| `=` | `=` | Equal |
| `!=` | `<>` | Not equal |
| `>` | `>` | Greater than |
| `>=` | `>=` | Greater than or equal |
| `<` | `<` | Less than |
| `<=` | `<=` | Less than or equal |
| `IN` | `IN` | In array |
| `NOT_IN` | `NOT IN` | Not in array |
| `LIKE` | `LIKE` | Pattern match |
| `IS_NULL` | `IS NULL` | Is null |
| `IS_NOT_NULL` | `IS NOT NULL` | Is not null |
| `ALL` | `TRUE` | All records (full access) |

### E.3 Dynamic Placeholders

| Placeholder | Mô tả | Example Value |
|-------------|-------|---------------|
| `${user.id}` | Current user ID | uuid |
| `${user.workspaceMemberId}` | Workspace member ID | uuid |
| `${user.departmentId}` | User's department | uuid |
| `${user.teamMemberIds}` | IDs của team members | [uuid, uuid] |
| `${user.subordinateMemberIds}` | IDs của cấp dưới | [uuid, uuid] |
| `${user.supportingMemberIds}` | IDs được support | [uuid, uuid] |
| `${user.hierarchyLevel}` | User's level (1-11) | 7 |
| `${user.departmentAncestorIds}` | Parent department IDs | [uuid] |
| `${user.departmentDescendantIds}` | Child department IDs | [uuid, uuid] |

### E.4 Example Filter Conditions

**Sales Staff - Own Customers Only:**
```json
{
  "type": "OR",
  "conditions": [
    {
      "field": "accountOwnerId",
      "operator": "=",
      "value": "${user.workspaceMemberId}",
      "description": "Customer do user sở hữu"
    },
    {
      "field": "accountOwnerId",
      "operator": "IN",
      "value": "${user.supportingMemberIds}",
      "description": "Customer của người được support"
    }
  ]
}
```

**Manager - Team Data Access:**
```json
{
  "type": "OR",
  "conditions": [
    {
      "field": "createdByWorkspaceMemberId",
      "operator": "IN",
      "value": "${user.subordinateMemberIds}",
      "description": "Records của cấp dưới"
    },
    {
      "field": "departmentId",
      "operator": "=",
      "value": "${user.departmentId}",
      "description": "Records trong phòng ban"
    }
  ]
}
```

---

## Appendix F: Data Access Scope by Level

### F.1 Access Matrix

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         DATA ACCESS MATRIX                                │
├──────────────────┬─────────────┬──────────────┬──────────────┬───────────┤
│      Level       │  Own Data   │  Team Data   │  Dept Data   │ All Data  │
├──────────────────┼─────────────┼──────────────┼──────────────┼───────────┤
│ 1. CEO           │     ✓       │      ✓       │      ✓       │    ✓      │
│ 2. C_LEVEL       │     ✓       │      ✓       │      ✓       │    ✓      │
│ 3. VP            │     ✓       │      ✓       │      ✓       │    ✓      │
│ 4. SENIOR_DIR    │     ✓       │      ✓       │      ✓       │    ✗      │
│ 5. DIRECTOR      │     ✓       │      ✓       │      ✓       │    ✗      │
│ 6. SENIOR_MGR    │     ✓       │      ✓       │      ✓       │    ✗      │
│ 7. MANAGER       │     ✓       │      ✓       │      ✗       │    ✗      │
│ 8. SENIOR_SPEC   │     ✓       │      ✗       │      ✗       │    ✗      │
│ 9. SPECIALIST    │     ✓       │      ✗       │      ✗       │    ✗      │
│ 10. JUNIOR_SPEC  │     ✓       │      ✗       │      ✗       │    ✗      │
│ 11. INTERN       │     ✓       │      ✗       │      ✗       │    ✗      │
└──────────────────┴─────────────┴──────────────┴──────────────┴───────────┘
```

### F.2 Scope Definitions

| Scope | Definition | Filter Logic |
|-------|------------|--------------|
| Own Data | Records user tạo hoặc được assign | `createdById = user OR assignedToId = user` |
| Team Data | Records của team members | `createdById IN subordinateIds` |
| Dept Data | Records trong department tree | `departmentId IN descendantDeptIds` |
| All Data | Tất cả records trong workspace | No filter |

---

## Phase 2: Core Services - Xây Dựng Services Chính ⚪

### 2.1 Permission Services

| Task | Mô tả | Status |
|------|-------|--------|
| `PermissionTemplateService` | CRUD cho permission templates | ⚪ Pending |
| `TemplateResourcePermissionService` | Quản lý resource permissions | ⚪ Pending |
| `UserPermissionTemplateService` | Gán/thu hồi template cho user | ⚪ Pending |
| `DataAccessPolicyService` | CRUD cho data access policies | ⚪ Pending |
| `TemporaryPermissionService` | Quản lý quyền tạm thời | ⚪ Pending |

#### 2.1.1 PermissionTemplateService Specification

```typescript
type PermissionTemplateService = {
  // Queries
  findById(id: string): Promise<MktPermissionTemplate>;
  findByKey(templateKey: string): Promise<MktPermissionTemplate>;
  findAll(filter?: TemplateFilter): Promise<MktPermissionTemplate[]>;
  findByHierarchyLevel(level: number): Promise<MktPermissionTemplate[]>;
  findByDepartmentType(type: DepartmentType): Promise<MktPermissionTemplate[]>;

  // Mutations
  create(input: CreateTemplateInput): Promise<MktPermissionTemplate>;
  update(id: string, input: UpdateTemplateInput): Promise<MktPermissionTemplate>;
  delete(id: string): Promise<boolean>;
  duplicate(id: string, newKey: string): Promise<MktPermissionTemplate>;

  // Resource Permissions
  addResourcePermission(templateId: string, input: AddResourcePermissionInput): Promise<void>;
  removeResourcePermission(templateId: string, resourceId: string): Promise<void>;
  updateResourcePermission(templateId: string, resourceId: string, input: UpdateResourcePermissionInput): Promise<void>;
};
```

#### 2.1.2 DataAccessPolicyService Specification

```typescript
type DataAccessPolicyService = {
  // Queries
  findById(id: string): Promise<MktDataAccessPolicy>;
  findByObjectName(objectName: string): Promise<MktDataAccessPolicy[]>;
  findByDepartment(departmentId: string): Promise<MktDataAccessPolicy[]>;
  findByOrganizationLevel(levelId: string): Promise<MktDataAccessPolicy[]>;

  // Mutations
  create(input: CreatePolicyInput): Promise<MktDataAccessPolicy>;
  update(id: string, input: UpdatePolicyInput): Promise<MktDataAccessPolicy>;
  delete(id: string): Promise<boolean>;

  // Filter Building
  buildFilterConditions(policy: MktDataAccessPolicy, userContext: UserContext): FilterCondition;
  evaluatePolicy(policy: MktDataAccessPolicy, record: unknown, userContext: UserContext): boolean;
};
```

### 2.2 RBAC Core Services

| Task | Mô tả | Status |
|------|-------|--------|
| `RbacContextService` | Resolve user context (dept, level, team) | ⚪ Pending |
| `RbacEnforcerService` | Permission check chính | ⚪ Pending |
| `RbacCacheService` | Cache permissions trong Redis | ⚪ Pending |
| `RbacSyncService` | Sync policies to Casbin rules | ⚪ Pending |
| `RbacAuditService` | Logging permission checks | ⚪ Pending |

#### 2.2.1 RbacContextService Specification

```typescript
type UserContext = {
  userId: string;
  workspaceMemberId: string;
  workspaceId: string;

  // Department info
  departmentId: string | null;
  departmentType: DepartmentType | null;
  departmentAncestorIds: string[];
  departmentDescendantIds: string[];

  // Organization level
  organizationLevelId: string | null;
  hierarchyLevel: number;
  levelCode: string;

  // Team info
  isManager: boolean;
  isSubManager: boolean;
  subordinateMemberIds: string[];
  teamMemberIds: string[];
  supportingMemberIds: string[];

  // Templates
  templateKeys: string[];
  templates: MktPermissionTemplate[];
};

type RbacContextService = {
  resolveContext(userId: string, workspaceId: string): Promise<UserContext>;
  getSubordinates(workspaceMemberId: string): Promise<string[]>;
  getSupportingMembers(workspaceMemberId: string): Promise<string[]>;
  getDepartmentTree(departmentId: string): Promise<DepartmentTree>;
  invalidateCache(userId: string): Promise<void>;
};
```

#### 2.2.2 RbacEnforcerService Specification

```typescript
type CheckPermissionResult = {
  allowed: boolean;
  reason: string;
  latencyMs: number;
  cached: boolean;
  appliedPolicies: AppliedPolicy[];
  dataFilter: FilterCondition | null;
};

type RbacEnforcerService = {
  // Main check
  checkPermission(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string
  ): Promise<CheckPermissionResult>;

  // Batch check
  checkPermissions(
    userId: string,
    workspaceId: string,
    checks: Array<{ resource: string; action: string }>
  ): Promise<CheckPermissionResult[]>;

  // Get user permissions summary
  getUserPermissionSummary(userId: string, workspaceId: string): Promise<PermissionSummary>;

  // Get data filter for resource
  getDataFilter(
    userId: string,
    workspaceId: string,
    resource: string
  ): Promise<FilterCondition | null>;
};
```

#### 2.2.3 RbacCacheService Specification

```typescript
type CacheKey = {
  USER_CONTEXT: 'rbac:context:{userId}:{workspaceId}';
  PERMISSION_CHECK: 'rbac:check:{userId}:{resource}:{action}';
  PERMISSION_SUMMARY: 'rbac:summary:{userId}:{workspaceId}';
  DATA_FILTER: 'rbac:filter:{userId}:{resource}';
};

type RbacCacheService = {
  // Context caching
  getContext(userId: string, workspaceId: string): Promise<UserContext | null>;
  setContext(userId: string, workspaceId: string, context: UserContext, ttl?: number): Promise<void>;

  // Permission check caching
  getCheckResult(userId: string, resource: string, action: string): Promise<CheckPermissionResult | null>;
  setCheckResult(userId: string, resource: string, action: string, result: CheckPermissionResult, ttl?: number): Promise<void>;

  // Invalidation
  invalidateUser(userId: string): Promise<void>;
  invalidateResource(resource: string): Promise<void>;
  invalidateAll(): Promise<void>;

  // TTL defaults
  DEFAULT_CONTEXT_TTL: 300;      // 5 minutes
  DEFAULT_CHECK_TTL: 60;         // 1 minute
  DEFAULT_FILTER_TTL: 300;       // 5 minutes
};
```

### 2.3 Department Hierarchy Services

| Task | Mô tả | Status |
|------|-------|--------|
| `DepartmentTreeService` | Quản lý tree structure | ⚪ Pending |
| `SubordinateService` | Lấy danh sách cấp dưới | ⚪ Pending |
| `TeamMemberService` | Quản lý team members | ⚪ Pending |

#### 2.3.1 DepartmentTreeService Specification

```typescript
type DepartmentTree = {
  id: string;
  departmentCode: string;
  departmentName: string;
  managerId: string | null;
  children: DepartmentTree[];
  depth: number;
  path: string[];
};

type DepartmentTreeService = {
  // Tree queries
  getTree(rootDepartmentId?: string): Promise<DepartmentTree>;
  getAncestors(departmentId: string): Promise<MktDepartment[]>;
  getDescendants(departmentId: string): Promise<MktDepartment[]>;
  getSiblings(departmentId: string): Promise<MktDepartment[]>;

  // Path queries
  getPath(departmentId: string): Promise<string[]>;
  getDepth(departmentId: string): Promise<number>;
  isAncestor(ancestorId: string, descendantId: string): Promise<boolean>;
  isDescendant(descendantId: string, ancestorId: string): Promise<boolean>;

  // Mutations
  moveDepartment(departmentId: string, newParentId: string): Promise<void>;
  rebuildHierarchy(): Promise<void>;
};
```

---

## Phase 3: Integration - Tích Hợp Vào Hệ Thống ⚪

### 3.1 Guards & Interceptors

| Task | Mô tả | Status |
|------|-------|--------|
| `RbacGuard` | NestJS guard cho permission check | ⚪ Pending |
| `DataScopeInterceptor` | Apply data filters tự động | ⚪ Pending |
| `@RequirePermission()` decorator | Decorator cho controllers | ⚪ Pending |
| `@DataScope()` decorator | Decorator cho data filtering | ⚪ Pending |

#### 3.1.1 RbacGuard Implementation

```typescript
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly rbacEnforcer: RbacEnforcerService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<RequiredPermission>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true; // No permission required
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const workspaceId = request.headers['x-workspace-id'];

    const result = await this.rbacEnforcer.checkPermission(
      userId,
      workspaceId,
      requiredPermission.resource,
      requiredPermission.action,
    );

    if (!result.allowed) {
      throw new ForbiddenException({
        message: 'Permission denied',
        resource: requiredPermission.resource,
        action: requiredPermission.action,
        reason: result.reason,
      });
    }

    // Attach data filter to request for later use
    request.rbacDataFilter = result.dataFilter;

    return true;
  }
}
```

#### 3.1.2 @RequirePermission Decorator

```typescript
const PERMISSION_KEY = 'rbac:permission';

type RequiredPermission = {
  resource: string;
  action: string;
};

const RequirePermission = (resource: string, action: string): MethodDecorator => {
  return SetMetadata(PERMISSION_KEY, { resource, action });
};

// Usage example
@RequirePermission('mktCustomer', 'READ')
@Query(() => [MktCustomer])
async findAllCustomers() {
  // ...
}
```

### 3.2 GraphQL Integration

| Task | Mô tả | Status |
|------|-------|--------|
| `RbacResolver` | GraphQL queries/mutations | ⚪ Pending |
| `CheckPermissionInput` DTO | Input type cho permission check | ⚪ Pending |
| `PermissionSummaryOutput` DTO | Output type cho user permissions | ⚪ Pending |
| `AssignTemplateInput` DTO | Input type cho gán template | ⚪ Pending |

#### 3.2.1 GraphQL Schema

```graphql
# Input Types
input CheckPermissionInput {
  resource: String!
  action: String!
}

input AssignTemplateInput {
  workspaceMemberId: ID!
  templateKey: String!
  reason: String
  expiresAt: DateTime
}

input CreateDataAccessPolicyInput {
  name: String!
  objectName: String!
  policyType: PolicyType!
  departmentId: ID
  organizationLevelId: ID
  filterConditions: JSON!
  priority: Int
  evaluationMode: EvaluationMode
}

# Output Types
type CheckPermissionResult {
  allowed: Boolean!
  reason: String
  latencyMs: Float!
  cached: Boolean!
  appliedPolicies: [AppliedPolicy!]!
  dataFilter: JSON
}

type AppliedPolicy {
  policyName: String!
  effect: String!
}

type PermissionSummary {
  userId: ID!
  workspaceMemberId: ID!
  departmentId: ID
  departmentName: String
  hierarchyLevel: Int!
  levelCode: String!
  roles: [String!]!
  permissionCount: Int!
  resources: [ResourcePermission!]!
  activePolicies: [ActivePolicy!]!
}

type ResourcePermission {
  resourceKey: String!
  resourceName: String!
  allowedActions: [String!]!
  deniedActions: [String!]!
  hasDataFilter: Boolean!
}

type ActivePolicy {
  policyName: String!
  objectName: String!
  policyType: String!
}

type TemplateAssignment {
  id: ID!
  workspaceMemberId: ID!
  templateKey: String!
  assignedAt: DateTime!
  expiresAt: DateTime
}

# Queries
type Query {
  rbacCheckPermission(input: CheckPermissionInput!): CheckPermissionResult!
  rbacUserPermissionSummary: PermissionSummary!
  rbacTemplates: [MktPermissionTemplate!]!
  rbacResources: [MktPermissionResource!]!
  rbacPolicies(objectName: String): [MktDataAccessPolicy!]!
}

# Mutations
type Mutation {
  rbacAssignTemplate(input: AssignTemplateInput!): TemplateAssignment!
  rbacRevokeTemplate(workspaceMemberId: ID!, templateKey: String!): Boolean!
  rbacCreatePolicy(input: CreateDataAccessPolicyInput!): MktDataAccessPolicy!
  rbacUpdatePolicy(id: ID!, input: CreateDataAccessPolicyInput!): MktDataAccessPolicy!
  rbacDeletePolicy(id: ID!): Boolean!
  rbacSyncCasbinRules: Boolean!
  rbacInvalidateCache(userId: ID): Boolean!
}
```

### 3.3 Hook Integration

| Task | Mô tả | Status |
|------|-------|--------|
| `RbacPreQueryHook` | Check permission trước query | ⚪ Pending |
| `RbacDataFilterHook` | Apply data filters | ⚪ Pending |
| `RbacPostQueryHook` | Audit logging sau query | ⚪ Pending |

#### 3.3.1 Hook Integration Points

```typescript
// Pre-query hook: Check permission before executing query
type RbacPreQueryHook = {
  name: 'rbac.preQuery';
  priority: 10;
  async execute(context: QueryContext): Promise<void> {
    const { userId, workspaceId, objectName, operation } = context;

    const actionMap = {
      findMany: 'READ',
      findOne: 'READ',
      createOne: 'CREATE',
      createMany: 'BULK_CREATE',
      updateOne: 'UPDATE',
      updateMany: 'BULK_UPDATE',
      deleteOne: 'DELETE',
      deleteMany: 'BULK_DELETE',
    };

    const action = actionMap[operation];
    const result = await rbacEnforcer.checkPermission(userId, workspaceId, objectName, action);

    if (!result.allowed) {
      throw new PermissionDeniedError(objectName, action, result.reason);
    }

    // Attach data filter to context
    context.rbacFilter = result.dataFilter;
  };
};

// Data filter hook: Apply row-level security
type RbacDataFilterHook = {
  name: 'rbac.dataFilter';
  priority: 20;
  async execute(context: QueryContext): Promise<void> {
    if (context.rbacFilter) {
      context.where = mergeFilters(context.where, context.rbacFilter);
    }
  };
};

// Post-query hook: Audit logging
type RbacPostQueryHook = {
  name: 'rbac.postQuery';
  priority: 100;
  async execute(context: QueryContext, result: unknown): Promise<void> {
    await rbacAudit.log({
      userId: context.userId,
      workspaceId: context.workspaceId,
      resource: context.objectName,
      action: context.operation,
      recordCount: Array.isArray(result) ? result.length : 1,
      timestamp: new Date(),
    });
  };
};
```

---

## Phase 4: Data Seeding - Dữ Liệu Khởi Tạo 🟡

### 4.1 System Data

| Task | Mô tả | Status | Notes |
|------|-------|--------|-------|
| Seed Organization Levels | Cấp bậc mặc định | ⚠️ Partial | Có 5/11 levels |
| Seed Permission Resources | Resources cho mkt-core | ✅ Done | 12 resources |
| Seed System Templates | Templates quyền | ✅ Done | 8 templates |
| Seed Default Policies | Row-level policies | ✅ Done | 8 policies |
| Seed Permission Actions | Actions (CRUD...) | ✅ Done | 12 actions |
| Seed Casbin Rules | Casbin rules | ✅ Done | 24 rules |

### 4.2 Seeder Commands

| Task | Mô tả | Status |
|------|-------|--------|
| `mkt-rbac-organization-level-seed` | Seed organization levels | ⚪ Pending |
| `mkt-rbac-permission-resource-seed` | Seed resources | ⚪ Pending |
| `mkt-rbac-template-seed` | Seed templates | ⚪ Pending |
| `mkt-rbac-policy-seed` | Seed policies | ⚪ Pending |
| `mkt-rbac-sync` | Sync to Casbin | ⚪ Pending |

### 4.3 Default Templates Specification

| Template Key | Name | Type | Level | Department | Actions |
|--------------|------|------|-------|------------|---------|
| CEO_FULL_ACCESS | CEO - Toàn quyền | HIERARCHY_BASED | 1 | EXECUTIVE | ALL |
| VP_ACCESS | VP - Quản lý cấp cao | HIERARCHY_BASED | 3 | EXECUTIVE | ALL except ACCESS_SALARY_DATA |
| DIRECTOR_DEPT | Director - Quản lý phòng | HIERARCHY_BASED | 5 | * | CRUD, APPROVE, MANAGE_TEAM |
| MANAGER_TEAM | Manager - Quản lý team | HIERARCHY_BASED | 7 | * | CRUD, VIEW_TEAM_REPORTS |
| SALES_STAFF | Nhân viên Sales | DEPARTMENT_BASED | 9 | SALES | READ, CREATE, UPDATE |
| FINANCE_STAFF | Nhân viên Finance | DEPARTMENT_BASED | 9 | FINANCE | READ, VIEW_FINANCIAL_REPORTS |
| HR_STAFF | Nhân viên HR | DEPARTMENT_BASED | 9 | HR | READ, UPDATE on workspaceMember |
| SUPPORT_STAFF | Nhân viên Support | DEPARTMENT_BASED | 9 | CUSTOMER_SERVICE | READ on mktCustomer |

---

## Phase 5: Testing & Validation ⚪

### 5.1 Unit Tests

| Task | Mô tả | Status |
|------|-------|--------|
| Test `RbacContextService` | User context resolution | ⚪ Pending |
| Test `RbacEnforcerService` | Permission check logic | ⚪ Pending |
| Test `DataAccessPolicyService` | Filter condition parsing | ⚪ Pending |
| Test `DepartmentTreeService` | Tree queries | ⚪ Pending |

### 5.2 Integration Tests

| Task | Mô tả | Status |
|------|-------|--------|
| Test Sales Staff Access | Chỉ xem data của mình | ⚪ Pending |
| Test Manager Access | Xem data của team | ⚪ Pending |
| Test Director Access | Xem data của departments | ⚪ Pending |
| Test Support Access | Xem data được support | ⚪ Pending |
| Test Cross-Dept Denied | Từ chối cross-department | ⚪ Pending |

### 5.3 Test Scenarios

#### Scenario 1: Sales Staff Xem Customer

```
User: Nguyen Van A
Department: SALES-HN
Level: SPECIALIST (9)
Template: SALES_STAFF

Request: GET /customers

Expected:
- Permission: ALLOWED
- Filter: accountOwnerId = 'member-A-uuid' OR accountOwnerId IN (supportingMemberIds)
- Result: Chỉ thấy customers do A sở hữu + customers được support
```

#### Scenario 2: Manager Xem Báo Cáo Team

```
User: Tran Thi B
Department: SALES
Level: MANAGER (7)
Template: MANAGER_TEAM

Request: GET /customers

Expected:
- Permission: ALLOWED
- Filter: departmentId = 'sales-uuid' OR createdByWorkspaceMemberId IN (subordinateIds)
- Result: Thấy customers của team Sales + cấp dưới
```

#### Scenario 3: Cross-Department Access Denied

```
User: Pham Van C
Department: MARKETING
Level: SPECIALIST (9)
Template: MARKETING_STAFF

Request: GET /invoices

Expected:
- Permission: DENIED
- Reason: "No permission to access mktInvoice resource"
```

### 5.4 Performance Tests

| Task | Mô tả | Status |
|------|-------|--------|
| Benchmark permission check | < 10ms latency | ⚪ Pending |
| Benchmark tree queries | < 50ms cho 1000 nodes | ⚪ Pending |
| Cache hit rate validation | > 90% hit rate | ⚪ Pending |

---

## Phase 6: Documentation & Tooling ⚪

### 6.1 Documentation

| Task | Mô tả | Status |
|------|-------|--------|
| API Documentation | GraphQL schema docs | ⚪ Pending |
| Admin Guide | Hướng dẫn cấu hình | ⚪ Pending |
| Developer Guide | Hướng dẫn tích hợp | ⚪ Pending |

### 6.2 CLI Tools

| Task | Mô tả | Status |
|------|-------|--------|
| `rbac-seeder:debug` command | Debug permission cho user | ⚪ Pending |
| `rbac-seeder:sync` command | Sync policies | ⚪ Pending |
| `rbac-seeder:check` command | Health check | ⚪ Pending |

### 6.3 CLI Commands Specification

```bash
# Debug permission cho user cụ thể
npx nx command twenty-server -- rbac:debug \
  --user-id=<userId> \
  --workspace-id=<wsId> \
  --resource=mktCustomer \
  --action=READ

# Output:
# ┌──────────────────────────────────────────────┐
# │ Permission Debug Report                       │
# ├──────────────────────────────────────────────┤
# │ User: Nguyen Van A                           │
# │ Department: SALES-HN                         │
# │ Level: SPECIALIST (9)                        │
# │ Templates: [SALES_STAFF]                     │
# ├──────────────────────────────────────────────┤
# │ Resource: mktCustomer                        │
# │ Action: READ                                 │
# │ Result: ALLOWED                              │
# ├──────────────────────────────────────────────┤
# │ Applied Policies:                            │
# │ - Sales - Customer Access (ROW_LEVEL)        │
# │ Data Filter:                                 │
# │   accountOwnerId = 'user-uuid'               │
# │   OR accountOwnerId IN (supporting-ids)      │
# └──────────────────────────────────────────────┘

# Sync policies to Casbin
npx nx command twenty-server -- rbac:sync \
  --workspace-id=<wsId> \
  --clear-cache

# Health check
npx nx command twenty-server -- rbac:health

# Output:
# ✓ Database connection: OK
# ✓ Redis connection: OK
# ✓ Templates loaded: 8
# ✓ Resources defined: 12
# ✓ Policies active: 8
# ✓ Casbin rules: 24
# ✓ Cache status: Connected
```

---

## Phase 7: Advanced Features ⚪

### 7.1 Real-time Sync

| Task | Mô tả | Status |
|------|-------|--------|
| PostgreSQL NOTIFY triggers | Notify khi policy thay đổi | ⚪ Pending |
| Redis pub/sub listener | Invalidate cache | ⚪ Pending |
| Casbin watcher | Auto-reload policies | ⚪ Pending |

### 7.2 Analytics & Monitoring

| Task | Mô tả | Status |
|------|-------|--------|
| Permission metrics | Prometheus metrics | ⚪ Pending |
| Audit dashboard | Admin UI cho audit logs | ⚪ Pending |
| Alert rules | Alert khi deny rate cao | ⚪ Pending |

---

## Dependency Graph

```
Phase 1 (Foundation) 🟡 90%
    │
    ├──► Phase 2 (Core Services) ⚪
    │        │
    │        ├──► Phase 3 (Integration) ⚪
    │        │        │
    │        │        └──► Phase 5 (Testing) ⚪
    │        │                 │
    │        │                 └──► Phase 6 (Documentation) ⚪
    │        │
    │        └──► Phase 4 (Data Seeding) 🟡 70%
    │
    └──► Phase 7 (Advanced) ⚪ ◄── Phase 3, 4, 5
```

---

## Công Việc Tiếp Theo (Next Actions)

### Đã Hoàn Thành ✅

- ~~**Hoàn thiện Organization Levels** - Đã thêm đủ 11 levels trong seeder~~
- ~~**Helper Functions** - Đã implement trong source code (không dùng database functions)~~

### Ưu Tiên Cao 🔴

1. **Bắt đầu Phase 2** - Implement RbacContextService trước
2. **Chạy seeder** - Cập nhật database với 11 organization levels

```bash
npx nx command twenty-server -- mkt-organization-level-data-seed-dev-workspace
```

### Ưu Tiên Trung Bình 🟡

3. **Chuẩn hóa Resource Keys** - Thêm entityName field (xem Appendix C.3)
4. **Implement DepartmentTreeService** - Queries cho department hierarchy

### Ưu Tiên Thấp 🟢

5. Viết unit tests cho helper functions
6. Chuẩn bị seeder commands

---

## Checklist Tổng Hợp

### Phase 1: Foundation ✅
- [x] Tạo MktOrganizationLevel entity
- [x] Tạo MktPermissionResource entity
- [x] Tạo MktPermissionTemplate entity
- [x] Tạo MktTemplateResourcePermission entity
- [x] Tạo MktUserPermissionTemplate entity
- [x] Tạo MktDataAccessPolicy entity
- [x] Tạo MktCasbinRule entity
- [x] Tạo MktTemporaryPermission entity
- [x] Tạo MktPermissionAudit entity
- [x] Tạo MktPermissionAction entity
- [x] Tạo MktTemplateSystemAction entity
- [x] Cập nhật workspaceMember với organizationLevelId
- [x] Cập nhật workspaceMember với supportForMemberId
- [x] Cập nhật workspaceMember với departmentId
- [x] Cập nhật MktDepartment với managerId
- [x] Tạo MktDepartmentSubManager entity
- [x] Tạo MktDepartmentHierarchy entity
- [x] Tạo MktDepartmentAncestry entity
- [x] Helper functions (source code): getDataAccessScopeByLevel, hasFullAccess, canManageTeam, etc.
- [x] Organization Levels: 11 levels với backward compatibility aliases

### Phase 2: Core Services
- [ ] PermissionTemplateService
- [ ] TemplateResourcePermissionService
- [ ] UserPermissionTemplateService
- [ ] DataAccessPolicyService
- [ ] TemporaryPermissionService
- [ ] RbacContextService
- [ ] RbacEnforcerService
- [ ] RbacCacheService
- [ ] RbacSyncService
- [ ] RbacAuditService
- [ ] DepartmentTreeService
- [ ] SubordinateService
- [ ] TeamMemberService

### Phase 3: Integration
- [ ] RbacGuard
- [ ] DataScopeInterceptor
- [ ] @RequirePermission() decorator
- [ ] @DataScope() decorator
- [ ] RbacResolver
- [ ] GraphQL DTOs
- [ ] Hook integration

### Phase 4: Data Seeding
- [x] Seed Permission Resources (12 resources)
- [x] Seed System Templates (8 templates)
- [x] Seed Default Policies (8 policies)
- [x] Seed Permission Actions (12 actions)
- [x] Seed Casbin Rules (24 rules)
- [x] Seed Organization Levels (11 levels đầy đủ)
- [ ] Seeder commands

### Phase 5: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance tests

### Phase 6: Documentation & Tooling
- [ ] API Documentation
- [ ] Admin Guide
- [ ] Developer Guide
- [ ] CLI tools

### Phase 7: Advanced Features
- [ ] Real-time sync
- [ ] Analytics & Monitoring

---

## Ghi Chú

- Mỗi phase nên được review và approve trước khi chuyển sang phase tiếp theo
- Ưu tiên viết tests song song với development
- Sử dụng feature flags để rollout từng phase một cách an toàn
- Tham khảo `DEPARTMENT_RBAC_IMPLEMENTATION.md` cho chi tiết use cases
