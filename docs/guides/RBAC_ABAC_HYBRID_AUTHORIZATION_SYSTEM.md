# Hybrid RBAC + ABAC Authorization System

> Tài liệu chi tiết về cách kết hợp Twenty CRM Default Permission System với module mkt-rbac-enterprise-grade để đạt được hệ thống phân quyền toàn diện.

---

## 1. Executive Summary

### 1.1 Problem Statement

Twenty CRM cung cấp hệ thống RBAC (Role-Based Access Control) cơ bản với:
- Role-Object permissions (canRead, canUpdate, canSoftDelete, canDestroy)
- Permission flags cho settings/tools
- Object/Field level permissions

Tuy nhiên, hệ thống này **thiếu các tính năng enterprise-grade**:
- Attribute-Based Access Control (ABAC) - điều kiện động dựa trên attributes
- Row-Level Security (RLS) - filter data dựa trên user context
- Hierarchical Access - phân quyền theo cấu trúc phòng ban
- Policy Management - template permission với template variables
- Audit Logging - tracking chi tiết permission checks

### 1.2 Solution Overview

Module `mkt-rbac-enterprise-grade` bổ sung **Layer 2 (ABAC Layer)** phía trên Twenty's RBAC:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AUTHORIZATION FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                         LAYER 2: ABAC (mkt-rbac-enterprise-grade)           ││
│  │                                                                              ││
│  │  PermissionTemplate → PermissionContext → FilterExpressionResolver          ││
│  │         ↓                     ↓                       ↓                     ││
│  │  Role Definition    Template Variables ($user.*)  Resolved Filters          ││
│  │                                                                              ││
│  │  Features:                                                                   ││
│  │  - Template-based permissions                                                ││
│  │  - Dynamic filter resolution                                                 ││
│  │  - Row-level security via Pre-Query Hooks                                    ││
│  │  - Hierarchical department access                                            ││
│  │  - Casbin policy engine                                                      ││
│  │  - Temporary permissions & overrides                                         ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                           Extends & Enhances                                    │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                         LAYER 1: RBAC (Twenty Default)                      ││
│  │                                                                              ││
│  │  RoleEntity → ObjectPermissionEntity → FieldPermissionEntity                ││
│  │       ↓                  ↓                       ↓                          ││
│  │  Basic Roles    Object-level CRUD       Field-level R/W                     ││
│  │                                                                              ││
│  │  Features:                                                                   ││
│  │  - canReadAllObjectRecords, canUpdateAllObjectRecords                       ││
│  │  - canSoftDeleteAllObjectRecords, canDestroyAllObjectRecords                ││
│  │  - Per-object permission overrides                                           ││
│  │  - Permission flags for settings/tools                                       ││
│  │  - Redis cache for performance                                               ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Key Benefits

| Benefit | Description |
|---------|-------------|
| **Separation of Concerns** | Twenty RBAC handles object-level, mkt-rbac handles row-level |
| **Backward Compatible** | Existing Twenty permissions continue to work |
| **Dynamic Policies** | Template variables resolved at runtime |
| **Hierarchical Access** | Department-based data isolation |
| **Audit Trail** | Complete logging of permission decisions |
| **Performance** | Multi-tier caching (Redis + In-memory) |

---

## 2. Kien truc Hybrid RBAC + ABAC

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        HYBRID AUTHORIZATION ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                           API REQUEST                                     │  │
│  │                      (GraphQL / REST)                                     │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                        AUTHENTICATION LAYER                               │  │
│  │                     (JwtAuthGuard, WorkspaceGuard)                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│            ┌─────────────────────────┼─────────────────────────┐               │
│            ▼                         ▼                         ▼               │
│  ┌──────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐   │
│  │  TWENTY RBAC     │   │  MKT-RBAC GUARDS     │   │  MKT-RBAC HOOKS      │   │
│  │  (Layer 1)       │   │  (Layer 2 Guards)    │   │  (Layer 2 Filters)   │   │
│  ├──────────────────┤   ├──────────────────────┤   ├──────────────────────┤   │
│  │ ObjectPermission │   │ CasbinAuthzGuard     │   │ HierarchicalAccess   │   │
│  │ FieldPermission  │   │ DepartmentAuthGuard  │   │ PreQueryHook         │   │
│  │ PermissionFlags  │   │ DataScopeInterceptor │   │                      │   │
│  └────────┬─────────┘   └──────────┬───────────┘   └──────────┬───────────┘   │
│           │                        │                          │               │
│           │                        ▼                          │               │
│           │             ┌──────────────────────┐              │               │
│           │             │  RBAC ENFORCER       │              │               │
│           │             │  SERVICE             │◄─────────────┘               │
│           │             ├──────────────────────┤                              │
│           │             │ - checkPermission()  │                              │
│           │             │ - getDataFilter()    │                              │
│           │             │ - getUserRoles()     │                              │
│           │             └──────────┬───────────┘                              │
│           │                        │                                          │
│           │                        ▼                                          │
│           │             ┌──────────────────────┐                              │
│           │             │  PERMISSION CONTEXT  │                              │
│           │             │  RESOLUTION          │                              │
│           │             ├──────────────────────┤                              │
│           │             │ TemplateFilter →     │                              │
│           │             │ ResolvedFilter       │                              │
│           │             │ ($user.* → values)   │                              │
│           │             └──────────┬───────────┘                              │
│           │                        │                                          │
│           ▼                        ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         DATABASE QUERY                                    │  │
│  │              (with RBAC object check + ABAC row filter)                   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Description

| Component | Layer | Responsibility |
|-----------|-------|----------------|
| `JwtAuthGuard` | Authentication | Validate JWT token, extract user |
| `WorkspaceGuard` | Authentication | Validate workspace membership |
| `PermissionsService` | Layer 1 (RBAC) | Object/field level permissions |
| `WorkspacePermissionsCacheService` | Layer 1 (RBAC) | Cache role permissions |
| `CasbinEnforcerService` | Layer 2 (ABAC) | Casbin policy enforcement |
| `RbacEnforcerService` | Layer 2 (ABAC) | Permission check + data filter |
| `FilterExpressionResolverService` | Layer 2 (ABAC) | Resolve template variables |
| `HierarchicalAccessPreQueryHook` | Layer 2 (ABAC) | Inject row filters into queries |
| `DataScopeInterceptor` | Layer 2 (ABAC) | Attach filters to request context |
| `DepartmentAuthorizationGuard` | Layer 2 (ABAC) | Department-based access control |

---

## 3. Twenty CRM Default Permissions (Layer 1)

### 3.1 Entity Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         TWENTY DEFAULT PERMISSION MODEL                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────┐                                            │
│  │         RoleEntity              │                                            │
│  ├─────────────────────────────────┤                                            │
│  │ id: UUID                        │                                            │
│  │ label: string                   │                                            │
│  │ workspaceId: UUID               │                                            │
│  │ canUpdateAllSettings: boolean   │──┐                                         │
│  │ canAccessAllTools: boolean      │  │ Global Flags                            │
│  │ canReadAllObjectRecords: bool   │  │ (bypass per-object)                     │
│  │ canUpdateAllObjectRecords: bool │  │                                         │
│  │ canSoftDeleteAllObjectRecords   │  │                                         │
│  │ canDestroyAllObjectRecords      │──┘                                         │
│  │ isEditable: boolean             │                                            │
│  └─────────────┬───────────────────┘                                            │
│                │                                                                 │
│                │ 1:N                                                             │
│                ▼                                                                 │
│  ┌─────────────────────────────────┐     ┌─────────────────────────────────┐   │
│  │    ObjectPermissionEntity       │     │    FieldPermissionEntity        │   │
│  ├─────────────────────────────────┤     ├─────────────────────────────────┤   │
│  │ roleId: UUID (FK)               │     │ roleId: UUID (FK)               │   │
│  │ objectMetadataId: UUID (FK)     │     │ objectMetadataId: UUID          │   │
│  │ canReadObjectRecords?: boolean  │     │ fieldMetadataId: UUID           │   │
│  │ canUpdateObjectRecords?: bool   │     │ canReadFieldValue?: boolean     │   │
│  │ canSoftDeleteObjectRecords?     │     │ canUpdateFieldValue?: boolean   │   │
│  │ canDestroyObjectRecords?: bool  │     │                                 │   │
│  │ workspaceId: UUID               │     │ workspaceId: UUID               │   │
│  └─────────────────────────────────┘     └─────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────┐     ┌─────────────────────────────────┐   │
│  │     PermissionFlagEntity        │     │     RoleTargetsEntity           │   │
│  ├─────────────────────────────────┤     ├─────────────────────────────────┤   │
│  │ roleId: UUID (FK)               │     │ roleId: UUID (FK)               │   │
│  │ flag: PermissionFlagType        │     │ userWorkspaceId: UUID           │   │
│  │   - API_KEYS_AND_WEBHOOKS       │     │ workspaceId: UUID               │   │
│  │   - WORKSPACE                   │     │                                 │   │
│  │   - WORKSPACE_MEMBERS           │     │ Assigns role to user            │   │
│  │   - ROLES                       │     │                                 │   │
│  │   - DATA_MODEL                  │     │                                 │   │
│  │   - ADMIN_PANEL                 │     │                                 │   │
│  │   - SECURITY                    │     │                                 │   │
│  │   - WORKFLOWS                   │     │                                 │   │
│  │   - SEND_EMAIL_TOOL             │     │                                 │   │
│  │   - IMPORT_CSV                  │     │                                 │   │
│  │   - EXPORT_CSV                  │     │                                 │   │
│  └─────────────────────────────────┘     └─────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Permission Resolution Flow

```typescript
// PermissionsService.getUserWorkspacePermissions()
async getUserWorkspacePermissions({
  userWorkspaceId,
  workspaceId,
}): Promise<UserWorkspacePermissions> {
  // 1. Get role for user
  const [role] = await this.userRoleService.getRolesByUserWorkspaces({
    userWorkspaceIds: [userWorkspaceId],
    workspaceId,
  });

  // 2. Build permission flags
  const permissionFlags = Object.keys(PermissionFlagType).reduce(
    (acc, feature) => ({
      ...acc,
      [feature]:
        role.canUpdateAllSettings ||
        role.permissionFlags.some((pf) => pf.flag === feature),
    }),
    {},
  );

  // 3. Get object permissions from cache
  const { data: rolesPermissions } =
    await this.workspacePermissionsCacheService.getRolesPermissionsFromCache({
      workspaceId,
    });

  const objectPermissions = rolesPermissions[role.id] ?? {};

  // 4. Build object records permissions
  const objectRecordsPermissions = {
    READ_ALL_OBJECT_RECORDS: role.canReadAllObjectRecords,
    UPDATE_ALL_OBJECT_RECORDS: role.canUpdateAllObjectRecords,
    SOFT_DELETE_ALL_OBJECT_RECORDS: role.canSoftDeleteAllObjectRecords,
    DESTROY_ALL_OBJECT_RECORDS: role.canDestroyAllObjectRecords,
  };

  return {
    permissionFlags,
    objectRecordsPermissions,
    objectPermissions,
  };
}
```

### 3.3 Limitations of Twenty Default RBAC

| Limitation | Impact |
|------------|--------|
| **No Row-Level Security** | User with READ permission can see ALL records |
| **No Dynamic Conditions** | Cannot filter based on user attributes |
| **No Department Hierarchy** | Cannot implement "see own department only" |
| **No Temporary Permissions** | Cannot grant time-limited access |
| **No Policy Versioning** | No audit trail for permission changes |
| **No Override System** | Cannot grant/deny specific user exceptions |

---

## 4. mkt-rbac-enterprise-grade ABAC (Layer 2)

### 4.1 Entity Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        MKT-RBAC-ENTERPRISE-GRADE MODEL                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                           TEMPLATE LAYER                                    │ │
│  │                     (Dinh nghia Role & Permission)                          │ │
│  │                                                                             │ │
│  │  PermissionTemplate ──┬── TemplateResourcePermission ── PermissionResource │ │
│  │        (Role)         │                                      (Object)       │ │
│  │                       ├── TemplateSystemAction                              │ │
│  │                       │                                                     │ │
│  │                       └── TemplateAccessLimitation                          │ │
│  │                                    │                                        │ │
│  │                                    └── PermissionContext (Filter Template)  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                          │
│                                      ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                          ASSIGNMENT LAYER                                   │ │
│  │                      (Gan Role cho User)                                    │ │
│  │                                                                             │ │
│  │  WorkspaceMember ──── UserPermissionTemplate ──── PermissionTemplate       │ │
│  │      (User)               (Assignment)                (Role)                │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                          │
│                                      ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                          OVERRIDE LAYER                                     │ │
│  │                    (Ngoai le ca nhan & Tam thoi)                            │ │
│  │                                                                             │ │
│  │  UserPermissionOverride  ────  PermissionResource + PermissionAction       │ │
│  │  (Ngoai le GRANT/DENY)            (Resource + Action cu the)               │ │
│  │                                                                             │ │
│  │  TemporaryPermission                                                        │ │
│  │  (Quyen tam thoi co thoi han)                                               │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                          │
│                                      ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                           RUNTIME LAYER                                     │ │
│  │                    (Policy da resolve & Casbin)                             │ │
│  │                                                                             │ │
│  │  DataAccessPolicy     CasbinRule       PolicyVersion                       │ │
│  │  (Filter da resolve)   (Casbin rules)   (Version tracking)                 │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                          │
│                                      ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                           AUDIT & CONFIG                                    │ │
│  │                     (Logging & Cau hinh he thong)                           │ │
│  │                                                                             │ │
│  │  PermissionAudit      PermissionPriorityConfig     PolicyChangeRequest     │ │
│  │  (Audit log)          (Priority config)            (Approval workflow)     │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Key Entities Description

#### 4.2.1 MktPermissionTemplateWorkspaceEntity

Dinh nghia ROLE (CEO, Manager, Staff, etc.)

| Field | Type | Description |
|-------|------|-------------|
| `templateKey` | string | Key duy nhat (CEO, MANAGER, STAFF) |
| `templateName` | string | Ten hien thi |
| `templateType` | enum | ROLE_BASED, HIERARCHY_BASED, DEPARTMENT_BASED, CUSTOM |
| `hierarchyLevel` | number | Cap do trong to chuc (1-11) |
| `priority` | number | Do uu tien khi resolve xung dot |
| `resolutionStrategy` | enum | PRIORITY_BASED, MOST_RESTRICTIVE, MOST_PERMISSIVE |

#### 4.2.2 MktPermissionContextWorkspaceEntity

Dinh nghia CONTEXT filter voi template variables

| Field | Type | Description |
|-------|------|-------------|
| `contextKey` | string | Key (own, department, all) |
| `contextType` | enum | OWN_RECORDS, DEPARTMENT_RECORDS, ALL_RECORDS |
| `filterExpression` | JSON | Filter voi $user.* variables |

**Filter Expression Examples:**

```json
// OWN_RECORDS context
{
  "$or": [
    { "createdById": "$user.workspaceMemberId" },
    { "accountOwnerId": "$user.workspaceMemberId" }
  ]
}

// DEPARTMENT_RECORDS context
{
  "$or": [
    { "createdById": { "$in": "$user.teamMemberIds" } },
    { "createdById": { "$in": "$user.subordinateMemberIds" } }
  ]
}

// ALL_RECORDS context
{} // Empty = no filter = full access
```

#### 4.2.3 MktDataAccessPolicyWorkspaceEntity

Runtime Policy - Filter da resolve, san sang apply

| Field | Type | Description |
|-------|------|-------------|
| `objectName` | string | Object ap dung |
| `departmentId` | UUID | Department (optional) |
| `filterConditions` | JSON | Filter da resolve (khong co $user.*) |
| `policyType` | enum | ROW_LEVEL, FIELD_LEVEL, COLUMN_LEVEL |
| `evaluationMode` | enum | STRICT, PERMISSIVE, BALANCED |

### 4.3 Casbin Integration

Module su dung Casbin cho policy enforcement voi mo hinh RBAC+ABAC thong nhat:

```
# Casbin Model (RBAC + ABAC unified)
[request_definition]
r = sub, obj, act, attr

[policy_definition]
p = sub, obj, act, eft, condition

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act &&
    (p.condition == "" || eval(p.condition))
```

**Policy Examples:**

```
# Pure RBAC policies (no condition)
p, role:admin, mktOrder, read, allow
p, role:admin, mktOrder, create, allow
p, role:admin, mktOrder, update, allow
p, role:admin, mktOrder, delete, allow

# RBAC with ABAC conditions
p, role:manager, mktOrder, read, allow, r.attr.hierarchyLevel <= 7
p, role:staff, mktOrder, read, allow, r.attr.hierarchyLevel >= 8

# Role hierarchy
g, user:uuid-123, role:manager
g, role:manager, role:staff  # Managers inherit staff permissions
```

---

## 5. Integration Architecture

### 5.1 Request Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE AUTHORIZATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. REQUEST ARRIVES                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  GraphQL: mutation { createMktOrder(input: {...}) { id } }                  ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  2. AUTHENTICATION (JwtAuthGuard)                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  - Validate JWT token                                                        ││
│  │  - Extract userId, workspaceId                                               ││
│  │  - Attach to request context                                                 ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  3. LAYER 1: TWENTY RBAC (Object-Level)                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  WorkspacePermissionsCacheService.getRolesPermissionsFromCache()            ││
│  │  → Check: canCreateObjectRecords for mktOrder?                              ││
│  │  → Result: ALLOWED (user role has CREATE permission)                        ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  4. LAYER 2: MKT-RBAC GUARDS (Department-Level)                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  @RequireDepartment({ allowedDepartments: ['SALES'], allowManagers: true }) ││
│  │                                                                              ││
│  │  DepartmentAuthorizationGuard:                                               ││
│  │  1. Check user templates → template.priority >= threshold? → ALLOW          ││
│  │  2. Check executive → hierarchyLevel <= 3? → ALLOW                          ││
│  │  3. Check manager → hierarchyLevel <= 7? → ALLOW                            ││
│  │  4. Check department → user.departmentCode in ['SALES']? → ALLOW            ││
│  │  → Result: ALLOWED (user is in SALES department)                            ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  5. LAYER 2: CASBIN POLICY CHECK (Resource-Action)                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  CasbinEnforcerService.checkPermission({                                    ││
│  │    userId: 'user-123',                                                       ││
│  │    workspaceId: 'ws-456',                                                    ││
│  │    resource: 'mktOrder',                                                     ││
│  │    action: 'create',                                                         ││
│  │    attributes: { hierarchyLevel: 8, departmentId: 'dept-sales' }            ││
│  │  })                                                                          ││
│  │  → Casbin enforce: g(user:user-123, role:staff) && mktOrder == mktOrder     ││
│  │  → Result: { allowed: true, reason: 'Permission granted' }                   ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  6. RESOLVER EXECUTION                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  @Mutation(() => MktOrder)                                                   ││
│  │  @RequireDepartment({ allowedDepartments: ['SALES'] })                       ││
│  │  @DataScope({ resource: 'mktOrder' })                                        ││
│  │  async createMktOrder(@Args() input: CreateOrderInput) {                     ││
│  │    return this.orderService.create(input);                                   ││
│  │  }                                                                           ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  7. RESPONSE                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  { "data": { "createMktOrder": { "id": "order-789" } } }                    ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Query with Row-Level Security

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         QUERY WITH ROW-LEVEL SECURITY                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. QUERY REQUEST                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  query { mktOrders(filter: { status: { eq: "ACTIVE" } }) { ... } }          ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  2. PRE-QUERY HOOK                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  @WorkspaceQueryHook('mktOrder.findMany')                                   ││
│  │  MktOrderHierarchicalAccessFindManyHook.execute(authContext, payload):      ││
│  │                                                                              ││
│  │  a) Resolve user context:                                                    ││
│  │     userContext = await rbacContextService.resolveContext(userId, wsId)     ││
│  │     → {                                                                      ││
│  │         hierarchyLevel: 8,                                                   ││
│  │         dataAccessScope: 'OWN_RECORDS',                                     ││
│  │         workspaceMemberId: 'member-123',                                     ││
│  │         subordinateMemberIds: [],                                            ││
│  │         teamMemberIds: ['member-456', 'member-789']                         ││
│  │       }                                                                      ││
│  │                                                                              ││
│  │  b) Get access scope:                                                        ││
│  │     accessScope = hierarchicalAccessEvaluator.getDefaultAccessScope(8)      ││
│  │     → 'SELF' (staff level = own records only)                               ││
│  │                                                                              ││
│  │  c) Build hierarchical filter:                                               ││
│  │     filter = { createdById: { eq: 'member-123' } }                          ││
│  │                                                                              ││
│  │  d) Merge with user filter:                                                  ││
│  │     payload.filter = {                                                       ││
│  │       and: [                                                                 ││
│  │         { status: { eq: "ACTIVE" } },       // User's filter                ││
│  │         { createdById: { eq: 'member-123' } } // RLS filter                 ││
│  │       ]                                                                      ││
│  │     }                                                                        ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  3. DATABASE QUERY                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  SELECT * FROM "workspace_schema"."mktOrder"                                ││
│  │  WHERE "status" = 'ACTIVE'                                                  ││
│  │    AND "createdById" = 'member-123'  -- RLS filter injected                 ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  4. FILTERED RESPONSE                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  Returns only orders created by member-123 (staff's own records)            ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Permission Context Resolution Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    PERMISSION CONTEXT RESOLUTION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────┐             │
│  │                 PermissionContext (Template)                    │             │
│  │  contextKey: 'DEPARTMENT_AND_SUBORDINATES'                      │             │
│  │  filterExpression: {                                            │             │
│  │    "$or": [                                                     │             │
│  │      { "createdById": "$user.workspaceMemberId" },              │             │
│  │      { "createdById": { "$in": "$user.subordinateMemberIds" } },│             │
│  │      { "accountOwnerId": "$user.workspaceMemberId" }            │             │
│  │    ]                                                            │             │
│  │  }                                                              │             │
│  └──────────────────────────────┬─────────────────────────────────┘             │
│                                 │                                               │
│                                 │ + RBACUserContext                             │
│                                 │ {                                             │
│                                 │   workspaceMemberId: 'member-mgr-1',          │
│                                 │   subordinateMemberIds: ['staff-1', 'staff-2'],│
│                                 │   hierarchyLevel: 7                           │
│                                 │ }                                             │
│                                 ▼                                               │
│  ┌────────────────────────────────────────────────────────────────┐             │
│  │              FilterExpressionResolverService                    │             │
│  │                                                                 │             │
│  │  resolveFilterExpression(templateFilter, userContext):          │             │
│  │                                                                 │             │
│  │  1. Parse template variables                                    │             │
│  │  2. Replace $user.workspaceMemberId → 'member-mgr-1'           │             │
│  │  3. Replace $user.subordinateMemberIds → ['staff-1', 'staff-2'] │             │
│  │  4. Return ResolvedFilterConditions                             │             │
│  └──────────────────────────────┬─────────────────────────────────┘             │
│                                 │                                               │
│                                 ▼                                               │
│  ┌────────────────────────────────────────────────────────────────┐             │
│  │              ResolvedFilterConditions (Runtime)                 │             │
│  │  {                                                              │             │
│  │    "$or": [                                                     │             │
│  │      { "createdById": "member-mgr-1" },                        │             │
│  │      { "createdById": { "$in": ["staff-1", "staff-2"] } },     │             │
│  │      { "accountOwnerId": "member-mgr-1" }                      │             │
│  │    ]                                                            │             │
│  │  }                                                              │             │
│  │                                                                 │             │
│  │  → Manager can see: own records + direct reports' records       │             │
│  └────────────────────────────────────────────────────────────────┘             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Details

### 6.1 Pre-Query Hook Implementation

```typescript
// File: packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/hooks/hierarchical-access.pre-query.hook.ts

@Injectable()
@WorkspaceQueryHook('mktOrder.findMany')
export class MktOrderHierarchicalAccessFindManyHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>,
  ): Promise<FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>> {
    // Build hierarchical filter based on user context
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    // Merge with existing filter using AND logic
    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}
```

### 6.2 @DataScope Decorator Usage

```typescript
// File: packages/twenty-server/src/mkt-core/order/resolvers/order-query.resolver.ts

@Query(() => [MktOrder])
@DataScope({
  resource: 'mktOrder',
  mode: 'AUTO',           // AUTO | MANUAL | SKIP
  enableCache: true,
  cacheTTL: 300,          // 5 minutes
  auditLevel: 'medium',
  additionalConditions: [
    { field: 'status', operator: '!=', value: 'DELETED' }
  ]
})
async getOrders(@Context() ctx: GraphQLContext): Promise<MktOrder[]> {
  // DataScopeInterceptor attaches filter to ctx.req.dataScope
  const filter = ctx.req.dataScope?.filter;
  return this.orderService.findWithFilter(filter);
}
```

### 6.3 @RequireDepartment Decorator Usage

```typescript
// File: packages/twenty-server/src/mkt-core/order/resolvers/order-mutation.resolver.ts

@Mutation(() => MktOrder)
@RequireDepartment({
  allowedDepartments: ['SALES', 'MARKETING'],
  allowManagers: true,          // Hierarchy level <= 7
  allowExecutives: true,        // Hierarchy level <= 3
  allowHighPriorityTemplates: true,
  minTemplatePriority: TEMPLATE_PRIORITY.MANAGER, // 500
  deniedMessage: 'Only Sales or Marketing team can create orders',
})
async createMktOrder(
  @Args('input') input: CreateOrderInput,
): Promise<MktOrder> {
  return this.orderService.create(input);
}
```

### 6.4 RbacEnforcerService Usage

```typescript
// File: packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-enforcer.service.ts

@Injectable()
export class RbacEnforcerService {
  /**
   * Check permission and get data filter
   *
   * Flow:
   * 1. Check Casbin permission (resource + action)
   * 2. If allowed, build data filter based on user context
   * 3. Return result with filter attached
   */
  async checkPermission(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
  ): Promise<CheckPermissionResult> {
    // 1. Get user context
    const userContext = await this.rbacContextService.resolveContext(
      userId,
      workspaceId,
    );

    // 2. Check Casbin permission
    const casbinResult = await this.casbinEnforcerService.checkPermission({
      userId,
      workspaceId,
      resource,
      action,
      attributes: this.buildAttributes(userContext),
    });

    // 3. Build data filter if allowed
    let dataFilter = null;
    if (casbinResult.allowed) {
      dataFilter = await this.buildDataFilter(
        workspaceId,
        userContext,
        resource,
      );
    }

    return {
      allowed: casbinResult.allowed,
      reason: casbinResult.reason,
      dataFilter,
      // ... other fields
    };
  }

  /**
   * Build data filter using PermissionContext + FilterExpressionResolver
   */
  private async buildDataFilter(
    workspaceId: string,
    userContext: UserContext,
    resource: string,
  ): Promise<FilterCondition | null> {
    // Full access users have no filter
    if (userContext.hasFullAccess) {
      return null;
    }

    // Get PermissionContext based on data access scope
    const contextKey = this.permissionContextService
      .getContextKeyForDataAccessScope(userContext.dataAccessScope);

    const permissionContext = await this.permissionContextService
      .getByContextKey(workspaceId, contextKey);

    // Resolve template variables
    const resolutionResult = this.filterExpressionResolver
      .resolveFilterExpression(
        permissionContext.filterExpression,
        userContext,
      );

    // Convert to FilterCondition format
    return this.convertResolvedFilterToCondition(
      resolutionResult.resolvedFilter,
    );
  }
}
```

### 6.5 Feature Flags Configuration

```typescript
// File: packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/configs/index.ts

export const MKT_RBAC_CONFIG = {
  // Enable new PermissionContext flow (vs legacy hard-coded logic)
  USE_PERMISSION_CONTEXT: process.env.RBAC_USE_PERMISSION_CONTEXT === 'true',

  // Fall back to legacy flow on error
  FALLBACK_ON_ERROR: process.env.RBAC_FALLBACK_ON_ERROR !== 'false',

  // Debug logging for filter resolution
  DEBUG_FILTER_RESOLUTION: process.env.RBAC_DEBUG_FILTER === 'true',
} as const;
```

---

## 7. Use Cases va Examples

### 7.1 Use Case 1: Staff Can Only See Own Orders

**Scenario:** A staff member (hierarchy level 8-11) should only see orders they created.

**Configuration:**

```typescript
// PermissionContext seed data
{
  contextKey: 'OWN_RECORDS',
  contextType: 'OWN_RECORDS',
  filterExpression: {
    "$or": [
      { "createdById": "$user.workspaceMemberId" },
      { "accountOwnerId": "$user.workspaceMemberId" }
    ]
  }
}

// PermissionTemplate assignment
{
  templateKey: 'STAFF',
  hierarchyLevel: 8,
  dataAccessScope: 'OWN_RECORDS'
}
```

**Result:** Staff sees only orders where `createdById = 'their-member-id'` OR `accountOwnerId = 'their-member-id'`

### 7.2 Use Case 2: Manager Can See Team's Orders

**Scenario:** A manager (hierarchy level 7) should see orders from their direct reports.

**Configuration:**

```typescript
// PermissionContext seed data
{
  contextKey: 'DEPARTMENT_AND_SUBORDINATES',
  contextType: 'DEPARTMENT_RECORDS',
  filterExpression: {
    "$or": [
      { "createdById": "$user.workspaceMemberId" },
      { "createdById": { "$in": "$user.subordinateMemberIds" } },
      { "createdById": { "$in": "$user.teamMemberIds" } }
    ]
  }
}

// PermissionTemplate assignment
{
  templateKey: 'MANAGER',
  hierarchyLevel: 7,
  dataAccessScope: 'OWN_DEPARTMENT_AND_TEAM'
}
```

**Result:** Manager sees orders from themselves + all direct subordinates + team members

### 7.3 Use Case 3: Executive Full Access

**Scenario:** Executives (hierarchy level 1-3) should see all orders.

**Configuration:**

```typescript
// PermissionContext seed data
{
  contextKey: 'ALL_RECORDS',
  contextType: 'ALL_RECORDS',
  filterExpression: {} // Empty = no filter = full access
}

// PermissionTemplate assignment
{
  templateKey: 'CEO',
  hierarchyLevel: 1,
  dataAccessScope: 'ALL_DEPARTMENTS'
}
```

**Result:** Executive sees all orders without any filter

### 7.4 Use Case 4: Temporary Access for Audit

**Scenario:** Grant temporary READ access to an auditor for 7 days.

**Implementation:**

```typescript
// Create TemporaryPermission
await temporaryPermissionService.grantTemporary({
  granteeWorkspaceMemberId: 'auditor-member-id',
  granterWorkspaceMemberId: 'admin-member-id',
  objectName: 'mktOrder',
  recordId: null, // All records
  canRead: true,
  canUpdate: false,
  canDelete: false,
  expiresAt: DateTimeUtils.add(DateTimeUtils.now(), { days: 7 }),
  purpose: 'AUDIT',
  reason: 'Annual financial audit',
});
```

**Result:** Auditor has READ access to all mktOrders for 7 days

### 7.5 Use Case 5: Department-Restricted Endpoint

**Scenario:** Only Finance department can access payment reports.

**Implementation:**

```typescript
@Query(() => PaymentReport)
@RequireDepartment({
  allowedDepartments: ['FINANCE', 'ACCOUNTING'],
  allowExecutives: true,
  deniedMessage: 'Payment reports are restricted to Finance team',
})
async getPaymentReport(): Promise<PaymentReport> {
  return this.reportService.getPaymentReport();
}
```

**Result:** Only users in FINANCE/ACCOUNTING departments or executives can access

---

## 8. Migration Guide

### 8.1 From Twenty RBAC Only to Hybrid System

#### Step 1: Keep Twenty RBAC for Object-Level

```typescript
// Existing Twenty permissions continue to work
const permissions = await permissionsService.getUserWorkspacePermissions({
  userWorkspaceId,
  workspaceId,
});

// canRead, canUpdate, canSoftDelete, canDestroy still enforced
if (!permissions.objectPermissions[objectMetadataId]?.canRead) {
  throw new ForbiddenException('No READ permission');
}
```

#### Step 2: Add mkt-rbac for Row-Level

```typescript
// Add Pre-Query Hook for row-level filtering
@Injectable()
@WorkspaceQueryHook('myObject.findMany')
export class MyObjectHierarchicalAccessHook
  implements WorkspacePreQueryHookInstance
{
  async execute(authContext, objectName, payload) {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );
    payload.filter = this.filterService.mergeFilters(payload.filter, filter);
    return payload;
  }
}
```

#### Step 3: Add Department Guards if Needed

```typescript
// Add @RequireDepartment for department-restricted endpoints
@Query(() => [MyObject])
@RequireDepartment({ allowedDepartments: ['DEPT_CODE'] })
async getMyObjects() { ... }
```

### 8.2 Gradual Migration Strategy

```
Phase 1: Enable Pre-Query Hooks
├── Add hooks for core entities (mktOrder, mktCustomer, mktInvoice)
├── Test with feature flag (RBAC_USE_PERMISSION_CONTEXT=false)
└── Monitor performance and correctness

Phase 2: Enable PermissionContext Flow
├── Seed PermissionContext data
├── Enable feature flag (RBAC_USE_PERMISSION_CONTEXT=true)
├── Test filter resolution
└── Enable audit logging

Phase 3: Add Department Guards
├── Identify department-restricted endpoints
├── Add @RequireDepartment decorators
├── Test with different user hierarchies
└── Document access patterns

Phase 4: Enable Casbin Policies
├── Seed Casbin policies from permission templates
├── Enable CasbinAuthzGuard
├── Test policy enforcement
└── Monitor circuit breaker status
```

### 8.3 Rollback Strategy

```typescript
// Feature flag allows instant rollback
export const MKT_RBAC_CONFIG = {
  // Set to false to disable new ABAC flow
  USE_PERMISSION_CONTEXT: false,

  // Enable fallback on any error
  FALLBACK_ON_ERROR: true,
};

// Pre-Query Hooks can be disabled by removing from module providers
@Module({
  providers: [
    // Comment out to disable
    // ...HIERARCHICAL_ACCESS_HOOKS,
  ],
})
export class MktRbacModule {}
```

---

## 9. Best Practices

### 9.1 When to Use Twenty Default Permissions

| Use Case | Recommendation |
|----------|----------------|
| Object-level CRUD control | Use Twenty RBAC |
| Field-level read/write control | Use Twenty FieldPermissions |
| Settings/tools access | Use Twenty PermissionFlags |
| Simple role-based access | Use Twenty Roles |

### 9.2 When to Use mkt-rbac ABAC

| Use Case | Recommendation |
|----------|----------------|
| Row-level security | Use Pre-Query Hooks |
| Department-based access | Use @RequireDepartment |
| Dynamic filtering | Use PermissionContext + FilterExpressionResolver |
| Hierarchical data access | Use HierarchicalAccessEvaluatorService |
| Temporary permissions | Use TemporaryPermission entity |
| User-specific overrides | Use UserPermissionOverride entity |
| Policy-based ABAC | Use Casbin integration |
| Audit logging | Use PermissionAudit entity |

### 9.3 Performance Considerations

```typescript
// 1. Enable caching for data filters
@DataScope({
  resource: 'mktOrder',
  enableCache: true,
  cacheTTL: 300  // 5 minutes
})

// 2. Use batch permission checks
const results = await rbacEnforcerService.checkPermissions(
  userId,
  workspaceId,
  [
    { resource: 'mktOrder', action: 'read' },
    { resource: 'mktOrder', action: 'create' },
    { resource: 'mktCustomer', action: 'read' },
  ]
);

// 3. Pre-warm cache for active users
await rbacCacheService.warmCacheForWorkspace(workspaceId);

// 4. Monitor circuit breaker status
const stats = casbinEnforcerService.getStats();
if (stats.circuitBreakersOpen > 0) {
  logger.warn('Circuit breakers open - check enforcer health');
}
```

### 9.4 Security Best Practices

1. **Fail-Closed Pattern:** Always deny on error (default behavior)
2. **Audit Everything:** Enable PermissionAudit for sensitive operations
3. **Least Privilege:** Start with OWN_RECORDS and expand as needed
4. **Version Tracking:** Use PolicyVersion for cache invalidation
5. **Approval Workflow:** Use PolicyChangeRequest for high-risk changes

---

## 10. Files Reference

### 10.1 Twenty CRM Default Permission Files

| File | Purpose |
|------|---------|
| `packages/twenty-server/src/engine/metadata-modules/role/role.entity.ts` | Role entity definition |
| `packages/twenty-server/src/engine/metadata-modules/role/role.service.ts` | Role CRUD operations |
| `packages/twenty-server/src/engine/metadata-modules/object-permission/object-permission.entity.ts` | Object permission entity |
| `packages/twenty-server/src/engine/metadata-modules/object-permission/object-permission.service.ts` | Object permission service |
| `packages/twenty-server/src/engine/metadata-modules/permissions/permissions.service.ts` | Permission resolution service |
| `packages/twenty-server/src/engine/metadata-modules/workspace-permissions-cache/workspace-permissions-cache.service.ts` | Permission caching |
| `packages/twenty-server/src/engine/metadata-modules/user-role/user-role.service.ts` | User-role assignments |

### 10.2 mkt-rbac-enterprise-grade Files

| File | Purpose |
|------|---------|
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module.ts` | Main module definition |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-enforcer.service.ts` | Permission check + data filter |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-context.service.ts` | User context resolution |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/services/filter-expression-resolver.service.ts` | Template variable resolution |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/services/hierarchical-access-evaluator.service.ts` | Hierarchical access scope |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/hooks/hierarchical-access.pre-query.hook.ts` | Pre-query RLS hooks |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/guards/department-authorization.guard.ts` | Department-based guard |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/decorators/data-scope.decorator.ts` | @DataScope decorator |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/decorators/require-department.decorator.ts` | @RequireDepartment decorator |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/interceptors/data-scope.interceptor.ts` | Data scope interceptor |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service.ts` | Casbin policy enforcement |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/types/filter-expression.types.ts` | Filter type definitions |

### 10.3 Workspace Entity Files

| File | Purpose |
|------|---------|
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities/template/mkt-permission-template.workspace-entity.ts` | Permission template entity |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities/template/mkt-template-resource-permission.workspace-entity.ts` | Template-resource mapping |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities/config/mkt-permission-context.workspace-entity.ts` | Permission context entity |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities/policy/mkt-data-access-policy.workspace-entity.ts` | Data access policy entity |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities/override/mkt-user-permission-override.workspace-entity.ts` | User override entity |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities/override/mkt-temporary-permission.workspace-entity.ts` | Temporary permission entity |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities/audit/mkt-permission-audit.workspace-entity.ts` | Audit log entity |

### 10.4 Documentation Files

| File | Purpose |
|------|---------|
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/docs/RBAC-ARCHITECTURE-GUIDE.md` | Architecture overview |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/docs/RBAC-BUSINESS-GUIDE.md` | Business usage guide |
| `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/docs/USER-PERMISSION-ASSIGNMENT-GUIDE.md` | User assignment guide |

---

## 11. Appendix: Permission Evaluation Priority

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION EVALUATION PRIORITY                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Priority Order (cao → thap):                                                    │
│                                                                                  │
│  1. TemporaryPermission (Priority: 3000)                                        │
│     └── Quyen tam thoi co thoi han                                              │
│     └── Check: expiresAt > NOW() && isActive = true                             │
│                                                                                  │
│  2. UserPermissionOverride DENY (Priority: 2000)                                │
│     └── Override tu choi cu the cho user                                        │
│     └── Check: isAllowed = false                                                │
│                                                                                  │
│  3. UserPermissionOverride GRANT (Priority: 1500)                               │
│     └── Override cho phep cu the cho user                                       │
│     └── Check: isAllowed = true                                                 │
│                                                                                  │
│  4. PermissionTemplate (Priority: 1000)                                         │
│     └── Quyen tu role/template duoc gan                                         │
│     └── Check: TemplateResourcePermission.allowedActions                        │
│                                                                                  │
│  5. DataAccessPolicy (Priority: 500)                                            │
│     └── Row-level filter tu policy                                              │
│     └── Apply: filterConditions vao query                                       │
│                                                                                  │
│  6. Default DENY (Priority: 0)                                                  │
│     └── Mac dinh tu choi neu khong co permission nao                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

*Tai lieu duoc tao: 2026-01-16*
*Phien ban: 1.0*
*Author: System Architecture Team*
