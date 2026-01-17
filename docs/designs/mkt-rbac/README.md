# MKT RBAC Enterprise-Grade Module

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Core Components](#4-core-components)
5. [Permission Model](#5-permission-model)
6. [WorkspaceEntities](#6-workspaceentities)
7. [Services](#7-services)
8. [Decorators](#8-decorators)
9. [Guards](#9-guards)
10. [GraphQL API](#10-graphql-api)
11. [Configuration](#11-configuration)
12. [Caching Strategy](#12-caching-strategy)
13. [Real-time Updates](#13-real-time-updates)
14. [Implementation Guide](#14-implementation-guide)
15. [Working Flow](#15-working-flow)
16. [CLI Commands](#16-cli-commands)
17. [Performance Optimizations](#17-performance-optimizations)
18. [Error Handling](#18-error-handling)
19. [Testing](#19-testing)

---

## 1. Overview

Module **mkt-rbac-enterprise-grade** cung cap he thong Role-Based Access Control (RBAC) cap doanh nghiep, duoc xay dung tren [Casbin](https://casbin.org/) - authorization library manh me ho tro RBAC, ABAC va ACL.

### Key Features

- **Casbin-powered authorization**: RBAC + ABAC support
- **Workspace isolation**: Multi-tenant voi hoan toan cach ly du lieu
- **High performance**: Enforcer caching, permission caching, batch checks
- **Real-time sync**: PostgreSQL NOTIFY + Event Emitter
- **Enterprise features**: Hierarchy levels, data access policies, temporary permissions
- **Audit trail**: Ghi lai tat ca thay doi va kiem tra quyen
- **Fail-closed security**: Tu choi truy cap khi gap loi (bao mat)
- **Type-safe configuration**: Zod validation + Symbol DI tokens
- **Flexible validation**: SIMPLIFIED (6 buoc) hoac FULL (15 buoc)
- **Health monitoring**: Metrics va health indicators

### Tech Stack

| Component | Technology |
|-----------|------------|
| Authorization Engine | Casbin |
| Database | PostgreSQL (TypeORM) |
| Cache | Redis |
| Validation | Zod |
| Framework | NestJS |
| API | GraphQL |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GraphQL Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │PermissionCheck│  │PolicyManagement│ │   AuditLog          │   │
│  │   Resolver    │  │   Resolver     │ │   Resolver          │   │
│  └───────┬───────┘  └───────┬────────┘ └──────────┬──────────┘   │
└──────────┼──────────────────┼─────────────────────┼──────────────┘
           │                  │                     │
┌──────────┼──────────────────┼─────────────────────┼──────────────┐
│          ▼                  ▼                     ▼              │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                    CasbinAuthzGuard                        │   │
│  │              (Permission Decorator Metadata)               │   │
│  └────────────────────────┬──────────────────────────────────┘   │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                 CasbinEnforcerService                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │   │
│  │  │  Enforcer   │  │   Cache     │  │     Metrics     │    │   │
│  │  │   Cache     │  │  (Redis)    │  │    Tracking     │    │   │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────────┘    │   │
│  └─────────┼────────────────┼────────────────────────────────┘   │
│            │                │                                    │
│  ┌─────────▼────────────────▼────────────────────────────────┐   │
│  │                    PolicySyncService                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │   │
│  │  │  Template   │  │   Policy    │  │     Event       │    │   │
│  │  │   Sync      │  │  Validator  │  │    Handler      │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘    │   │
│  └───────────────────────────────────────────────────────────┘   │
│                           Service Layer                          │
└──────────────────────────────────────────────────────────────────┘
           │                  │                     │
┌──────────┼──────────────────┼─────────────────────┼──────────────┐
│          ▼                  ▼                     ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ CasbinRule   │  │ Permission   │  │     Audit            │   │
│  │ Repository   │  │ Repository   │  │   Repository         │   │
│  └──────┬───────┘  └───────┬──────┘  └──────────┬───────────┘   │
│         │                  │                     │               │
│  ┌──────▼──────────────────▼─────────────────────▼───────────┐   │
│  │                    PostgreSQL Database                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │   │
│  │  │MktCasbinRule│  │MktPermission│  │MktPermissionAudit│   │   │
│  │  │             │  │  Template   │  │                  │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘    │   │
│  └───────────────────────────────────────────────────────────┘   │
│                        Data Layer                                │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Dependencies

```
MktRbacEnterpriseGradeModule
    │
    ├── CasbinModule
    │   ├── CasbinEnforcerService
    │   ├── PolicySyncService
    │   ├── CacheWarmerService
    │   ├── RoleInheritanceCacheService
    │   ├── RbacMetricsService
    │   └── PolicyApprovalService
    │
    ├── Repositories
    │   ├── Permission Repositories
    │   ├── Template Repositories
    │   ├── Audit Repositories
    │   └── Policy Repositories
    │
    └── Resolvers
        ├── PermissionCheckResolver
        ├── PolicyManagementResolver
        └── AuditLogResolver
```

---

## 3. Directory Structure

```
mkt-rbac-enterprise-grade/
├── casbin/                           # Casbin authorization engine
│   ├── adapters/                     # Database adapters
│   │   └── workspace-casbin.adapter.ts
│   ├── config/                       # Zod-validated configuration
│   │   ├── rbac-config.defaults.ts
│   │   ├── rbac-config.schema.ts
│   │   └── rbac.config.ts
│   ├── constants/                    # Casbin constants
│   │   ├── actions.constant.ts
│   │   ├── cache-keys.constant.ts
│   │   ├── error-codes.constant.ts
│   │   └── resources.constant.ts
│   ├── decorators/                   # Casbin decorators
│   │   └── require-permission.decorator.ts
│   ├── entities/                     # Casbin workspace entities
│   │   ├── mkt-casbin-rule.workspace-entity.ts
│   │   ├── mkt-policy-approval.workspace-entity.ts
│   │   └── mkt-policy-version.workspace-entity.ts
│   ├── errors/                       # Custom errors
│   │   └── permission-denied.error.ts
│   ├── guards/                       # NestJS guards
│   │   └── casbin-authz.guard.ts
│   ├── health/                       # Health indicators
│   │   └── rbac-health.indicator.ts
│   ├── jobs/                         # Cron jobs
│   │   ├── cache-warmer.job.ts
│   │   └── cross-region-reload.job.ts
│   ├── pubsub/                       # Cross-region pub/sub
│   │   └── cross-region-invalidation.pubsub.ts
│   ├── repositories/                 # Casbin repositories
│   │   ├── workspace-casbin-rule.repository.ts
│   │   └── policy-version.repository.ts
│   ├── services/                     # Core services
│   │   ├── casbin-enforcer.service.ts
│   │   ├── policy-sync.service.ts
│   │   ├── cache-warmer.service.ts
│   │   ├── rbac-metrics.service.ts
│   │   └── role-inheritance-cache.service.ts
│   ├── types/                        # TypeScript types
│   │   └── casbin.types.ts
│   ├── validators/                   # Policy validators
│   │   ├── policy.validator.ts
│   │   └── high-risk-policy.validator.ts
│   ├── watchers/                     # Real-time watchers
│   │   └── pg-notify.watcher.ts
│   └── casbin.module.ts
│
├── commands/                         # CLI commands
│   ├── rbac-check.command.ts
│   ├── rbac-sync.command.ts
│   └── rbac-warm-cache.command.ts
│
├── configs/                          # Module configuration
│   └── mkt-rbac.config.ts
│
├── constants/                        # Constants & enums
│   ├── cache/
│   │   └── rbac-cache.constants.ts
│   ├── core/
│   │   ├── enterprise-rbac.constants.ts
│   │   ├── hierarchy.constants.ts
│   │   └── policy.constants.ts
│   └── permission-template/
│       └── resources.constants.ts
│
├── decorators/                       # Permission decorators
│   └── permission.decorator.ts
│
├── dto/                              # GraphQL DTOs
│   ├── inputs/
│   │   ├── check-permission.input.ts
│   │   ├── role-assignment.input.ts
│   │   └── temporary-permission.input.ts
│   └── outputs/
│       ├── permission-result.output.ts
│       └── user-permission-summary.output.ts
│
├── errors/                           # Custom errors
│   └── rbac.errors.ts
│
├── events/                           # Event definitions
│   └── rbac.events.ts
│
├── repositories/                     # Business repositories
│   ├── audit/
│   │   └── mkt-permission-audit.repository.ts
│   ├── override/
│   │   └── mkt-temporary-permission.repository.ts
│   ├── permission/
│   │   ├── mkt-permission-action.repository.ts
│   │   └── mkt-permission-resource.repository.ts
│   ├── policy/
│   │   └── mkt-data-access-policy.repository.ts
│   └── template/
│       ├── mkt-permission-template.repository.ts
│       └── mkt-user-permission-template.repository.ts
│
├── resolvers/                        # GraphQL resolvers
│   ├── audit-log.resolver.ts
│   ├── permission-check.resolver.ts
│   └── policy-management.resolver.ts
│
├── types/                            # Type definitions
│   ├── audit.types.ts
│   ├── hierarchy.types.ts
│   ├── permissions.type.ts
│   └── policy.types.ts
│
├── utils/                            # Utilities
│   ├── cache-key-builder.utils.ts
│   ├── permission-mapper.utils.ts
│   └── policy-evaluator.utils.ts
│
├── workspace-entities/               # WorkspaceEntity definitions
│   ├── audit/
│   │   └── mkt-permission-audit.workspace-entity.ts
│   ├── override/
│   │   ├── mkt-temporary-permission.workspace-entity.ts
│   │   └── mkt-user-permission-override.workspace-entity.ts
│   ├── permission/
│   │   ├── mkt-permission-action.workspace-entity.ts
│   │   └── mkt-permission-resource.workspace-entity.ts
│   ├── policy/
│   │   └── mkt-data-access-policy.workspace-entity.ts
│   └── template/
│       ├── mkt-permission-template.workspace-entity.ts
│       ├── mkt-template-resource-permission.workspace-entity.ts
│       └── mkt-user-permission-template.workspace-entity.ts
│
└── mkt-rbac-enterprise-grade.module.ts
```

---

## 4. Core Components

### 4.1 Casbin Model

Module su dung Casbin voi RBAC model:

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act, eft

[role_definition]
g = _, _
g2 = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

**Giai thich:**
- `r = sub, obj, act`: Request gom subject, object, action
- `p = sub, obj, act, eft`: Policy co them effect (allow/deny)
- `g = _, _`: Role assignment (user -> role)
- `g2 = _, _`: Resource grouping (resource -> group)
- `e = ...`: Cho phep neu co allow VA khong co deny
- `m = ...`: Matcher kiem tra role inheritance va exact match

### 4.2 Policy Types

| Type | Format | Mo ta | Vi du |
|------|--------|-------|-------|
| `p` | `(subject, object, action, effect)` | Permission policy | `p, role:admin, mktCustomer, *, allow` |
| `g` | `(user, role)` | Role assignment | `g, user:uuid-123, role:manager` |
| `g2` | `(resource, group)` | Resource grouping | `g2, mktCustomer, crm_entities` |

### 4.3 Subject Naming Convention

```
user:{userId}     # User identifier
role:{roleName}   # Role identifier
dept:{deptId}     # Department identifier
```

---

## 5. Permission Model

### 5.1 Permission Actions

```typescript
enum PermissionAction {
  // Basic CRUD
  READ = 'READ',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',

  // Advanced operations
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  SHARE = 'SHARE',
  PUBLISH = 'PUBLISH',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',

  // Approval operations
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ESCALATE = 'ESCALATE',

  // System operations
  CONFIGURE = 'CONFIGURE',
  MONITOR = 'MONITOR',
  AUDIT = 'AUDIT',

  // Bulk operations
  BULK_CREATE = 'BULK_CREATE',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',
  BULK_EXPORT = 'BULK_EXPORT',

  // Team management
  MANAGE_TEAM = 'MANAGE_TEAM',
  ASSIGN_TASKS = 'ASSIGN_TASKS',
  VIEW_TEAM_REPORTS = 'VIEW_TEAM_REPORTS',

  // Financial operations
  ACCESS_SALARY_DATA = 'ACCESS_SALARY_DATA',
  APPROVE_TRANSACTIONS = 'APPROVE_TRANSACTIONS',
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',

  // Sensitive data
  ACCESS_SENSITIVE_DATA = 'ACCESS_SENSITIVE_DATA',
  VIEW_CONFIDENTIAL_INFO = 'VIEW_CONFIDENTIAL_INFO',
}
```

### 5.2 Hierarchy Levels

```typescript
const HIERARCHY_LEVELS = {
  CEO: 1,
  C_LEVEL: 2,
  VP: 3,
  SENIOR_DIRECTOR: 4,
  DIRECTOR: 5,
  SENIOR_MANAGER: 6,
  MANAGER: 7,
  SENIOR_SPECIALIST: 8,
  SPECIALIST: 9,
  JUNIOR_SPECIALIST: 10,
  INTERN: 11,
} as const;
```

### 5.3 Validation Modes

**SIMPLIFIED Mode (6 steps):**
1. Pre-validation
2. User Context Resolution
3. Resource Identification
4. Permission Template Check
5. Action Permission Validation
6. Final Decision

**FULL Mode (15 steps):**
Them cac buoc:
- Resource Check
- Hierarchy Validation
- Data Access Policies
- Special Permissions
- Sensitive Data Check
- Department Restrictions
- Dynamic Conditions
- Cache Operations
- Audit Logging

---

## 6. WorkspaceEntities

### 6.1 MktCasbinRule

Luu tru Casbin policy rules (workspace-isolated).

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCasbinRule,
  namePlural: 'mktCasbinRules',
  labelSingular: 'Casbin Rule',
  icon: 'IconShield',
})
export class MktCasbinRuleWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({ type: FieldMetadataType.TEXT })
  ptype: string;  // p, g, g2

  @WorkspaceField({ type: FieldMetadataType.TEXT })
  subject: string;  // user:id or role:name

  @WorkspaceField({ type: FieldMetadataType.TEXT })
  object: string;  // resource or role target

  @WorkspaceField({ type: FieldMetadataType.TEXT })
  action: string;  // read, write, delete, *

  @WorkspaceField({ type: FieldMetadataType.TEXT })
  effect: string;  // allow or deny

  @WorkspaceField({ type: FieldMetadataType.TEXT })
  condition?: string;  // Optional ABAC condition
}
```

**Indexes:** `[ptype]`, `[subject]`, `[ptype, subject]`, `[ptype, subject, object]`

### 6.2 MktPermissionTemplate

Dinh nghia permission sets cho organization levels/roles.

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPermissionTemplate,
  namePlural: 'mktPermissionTemplates',
  labelSingular: 'Permission Template',
  icon: 'IconTemplate',
})
export class MktPermissionTemplateWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({ type: FieldMetadataType.TEXT })
  templateKey: string;  // CEO, VP, DIRECTOR

  @WorkspaceField({ type: FieldMetadataType.TEXT })
  templateName: string;

  @WorkspaceField({ type: FieldMetadataType.SELECT })
  templateType: string;  // ROLE_BASED, HIERARCHY_BASED, DEPARTMENT_BASED

  @WorkspaceField({ type: FieldMetadataType.NUMBER })
  hierarchyLevel: number;  // 1-11

  @WorkspaceField({ type: FieldMetadataType.NUMBER })
  priority: number;

  @WorkspaceField({ type: FieldMetadataType.SELECT })
  resolutionStrategy: string;  // PRIORITY_BASED, MOST_RESTRICTIVE, MOST_PERMISSIVE

  @WorkspaceRelation({ type: RelationMetadataType.ONE_TO_MANY })
  resourcePermissions: MktTemplateResourcePermissionWorkspaceEntity[];

  @WorkspaceRelation({ type: RelationMetadataType.ONE_TO_MANY })
  userAssignments: MktUserPermissionTemplateWorkspaceEntity[];
}
```

### 6.3 MktPermissionResource

Dinh nghia cac resources co the phan quyen.

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPermissionResource,
  namePlural: 'mktPermissionResources',
  labelSingular: 'Permission Resource',
  icon: 'IconBox',
})
export class MktPermissionResourceWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({ type: FieldMetadataType.TEXT })
  resourceKey: string;  // CUSTOMERS, ORDERS, PRODUCTS

  @WorkspaceField({ type: FieldMetadataType.TEXT })
  resourceName: string;

  @WorkspaceField({ type: FieldMetadataType.SELECT })
  resourceCategory: string;

  @WorkspaceField({ type: FieldMetadataType.BOOLEAN })
  isSystemResource: boolean;

  @WorkspaceField({ type: FieldMetadataType.BOOLEAN })
  isActive: boolean;
}
```

### 6.4 MktDataAccessPolicy

Business rules cho data filtering va access control.

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDataAccessPolicy,
  namePlural: 'mktDataAccessPolicies',
  labelSingular: 'Data Access Policy',
  icon: 'IconFilter',
})
export class MktDataAccessPolicyWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({ type: FieldMetadataType.TEXT })
  name: string;

  @WorkspaceField({ type: FieldMetadataType.SELECT })
  policyType: string;  // ROW_LEVEL, COLUMN_LEVEL, FIELD_LEVEL

  @WorkspaceField({ type: FieldMetadataType.TEXT })
  objectName: string;

  @WorkspaceField({ type: FieldMetadataType.NUMBER })
  priority: number;

  @WorkspaceField({ type: FieldMetadataType.SELECT })
  evaluationMode: string;  // AND, OR, PRIORITY

  @WorkspaceRelation({ type: RelationMetadataType.MANY_TO_ONE })
  department: MktDepartmentWorkspaceEntity;

  @WorkspaceRelation({ type: RelationMetadataType.MANY_TO_ONE })
  permissionTemplate: MktPermissionTemplateWorkspaceEntity;
}
```

---

## 7. Services

### 7.1 CasbinEnforcerService

Core service cho permission checking.

**File:** `casbin/services/casbin-enforcer.service.ts`

**Key Methods:**

```typescript
// Kiem tra mot quyen
async checkPermission(input: PermissionCheckInput): Promise<PermissionCheckResult> {
  // 1. Check cache
  // 2. Get/create enforcer
  // 3. Casbin.enforce()
  // 4. Cache result
  // 5. Return { allowed, reason, latencyMs }
}

// Kiem tra nhieu quyen cung luc
async checkPermissionBatch(request: BatchPermissionCheckRequest): Promise<BatchPermissionCheckResult> {
  // Batch check for performance
}

// Kiem tra user co role
async hasRole(userId: string, workspaceId: string, roleName: string): Promise<boolean>

// Lay tat ca roles cua user
async getUserRoles(userId: string, workspaceId: string): Promise<string[]>

// Lay tat ca permissions cua user
async getUserPermissions(userId: string, workspaceId: string): Promise<string[][]>

// Reload policies cho workspace
async reloadPolicies(workspaceId: string): Promise<void>
```

**Implementation Details:**

```typescript
// In-memory enforcer cache per workspace
private readonly enforcers = new Map<string, EnforcerWithMeta>();

// LRU eviction khi cache day
private evictLRU(): void {
  const oldest = _.minBy([...this.enforcers.entries()], ([, meta]) => meta.loadedAt);
  if (oldest) {
    this.enforcers.delete(oldest[0]);
  }
}
```

### 7.2 PolicySyncService

Dong bo permission templates thanh Casbin policies.

**File:** `casbin/services/policy-sync.service.ts`

**Key Methods:**

```typescript
// Event handler khi permission thay doi
async handlePermissionChange(event: PermissionChangedEvent): Promise<void>

// Sync policies cho workspace
async syncPolicies(workspaceId: string): Promise<SyncResult>

// Tinh toan su khac biet cua policies
async computePermissionDiff(): Promise<PolicyDiff>

// Validate truoc khi apply
async validateAndApplyPolicies(): Promise<ValidationResult>
```

**Features:**
- Event-driven sync
- Debouncing to batch rapid changes
- Retry with exponential backoff
- Dead letter queue for failures
- Dry-run mode

### 7.3 CacheWarmerService

Pre-load enforcers cho tat ca workspaces.

**File:** `casbin/services/cache-warmer.service.ts`

```typescript
// Warm cache on startup
async warmCache(): Promise<WarmCacheResult>

// Warm specific workspace
async warmWorkspace(workspaceId: string): Promise<void>

// Priority workspace handling
async warmPriorityWorkspaces(workspaceIds: string[]): Promise<void>
```

### 7.4 RbacMetricsService

Thu thap metrics hieu suat.

**File:** `casbin/services/rbac-metrics.service.ts`

```typescript
// Ghi lai latency
recordCheckLatency(latencyMs: number): void

// Ghi lai cache hit/miss
recordCacheHit(): void
recordCacheMiss(): void

// Lay thong ke
getMetrics(): RbacMetrics
```

---

## 8. Decorators

### 8.1 @Permission() Decorator

Danh dau methods can kiem tra quyen.

**File:** `decorators/permission.decorator.ts`

**Usage:**

```typescript
// Basic usage
@Permission({
  resource: 'mktCustomer',
  action: PermissionAction.READ,
})
async getCustomers(): Promise<Customer[]> { }

// Voi record ID
@Permission({
  resource: 'mktOrder',
  action: PermissionAction.UPDATE,
  recordIdParam: 'id',
  errorMessage: 'Khong the cap nhat don hang',
})
async updateOrder(@Args('id') id: string): Promise<Order> { }

// Voi custom options
@Permission({
  resource: 'mktInvoice',
  action: PermissionAction.DELETE,
  enableCache: false,  // Khong cache
  requireOwnership: true,  // Chi owner moi xoa duoc
})
async deleteInvoice(@Args('id') id: string): Promise<boolean> { }
```

**Metadata Structure:**

```typescript
type PermissionMetadata = {
  // Core
  resource?: string;
  action: PermissionAction;

  // Record identification
  recordIdParam?: string;
  recordIdPath?: string;

  // Performance
  enableCache?: boolean;
  cacheTTL?: number;

  // Error handling
  errorMessage?: string;
  allowAnonymous?: boolean;

  // Advanced (FULL mode)
  skipValidation?: boolean;
  requireOwnership?: boolean;
  minimumLevel?: number;
  requiredFields?: string[];
};
```

### 8.2 PermissionBuilder

Fluent API de xay dung permissions:

```typescript
@PermissionFor('ORDERS')
  .withAction(PermissionAction.UPDATE)
  .withRecordIdParam('id')
  .withErrorMessage('Cannot update order')
  .withCache(true, 300000)
  .build()
async updateOrder(): Promise<Order> { }
```

### 8.3 @RequirePermission() Decorator

Casbin-specific decorator:

**File:** `casbin/decorators/require-permission.decorator.ts`

```typescript
@RequirePermission('mktCustomer', 'read')
async customers(): Promise<Customer[]> { }
```

---

## 9. Guards

### 9.1 CasbinAuthzGuard

NestJS guard cho GraphQL authorization.

**File:** `casbin/guards/casbin-authz.guard.ts`

**How it works:**

```typescript
@Injectable()
export class CasbinAuthzGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Extract permission metadata from @RequirePermission
    const { resource, action } = this.reflector.get<RequirePermissionMetadata>(
      REQUIRE_PERMISSION_KEY,
      context.getHandler(),
    );

    // 2. Get userId and workspaceId from request
    const { userId, workspaceId } = this.extractContext(context);

    // 3. Check permission via CasbinEnforcerService
    const result = await this.enforcerService.checkPermission({
      userId,
      workspaceId,
      resource,
      action,
    });

    // 4. Throw if denied
    if (!result.allowed) {
      throw new PermissionDeniedError({
        resource,
        action,
        reason: result.reason,
        userId,
        workspaceId,
      });
    }

    return true;
  }
}
```

**Usage trong Resolver:**

```typescript
@Resolver(() => MktCustomer)
@UseGuards(CasbinAuthzGuard)
export class MktCustomerResolver {
  @Query(() => [MktCustomer])
  @RequirePermission('mktCustomer', 'read')
  async customers(): Promise<MktCustomer[]> {
    // Permission da duoc kiem tra truoc khi vao day
  }
}
```

---

## 10. GraphQL API

### 10.1 PermissionCheckResolver

**File:** `resolvers/permission-check.resolver.ts`

**Queries:**

```graphql
# Kiem tra mot quyen
query {
  rbacCheckPermission(input: {
    resource: "mktCustomer"
    action: "READ"
  }) {
    allowed
    reason
    latencyMs
    cached
  }
}

# Kiem tra nhieu quyen
query {
  rbacCheckPermissionBatch(input: {
    checks: [
      { resource: "mktCustomer", action: "READ" }
      { resource: "mktOrder", action: "CREATE" }
    ]
  }) {
    results {
      resource
      action
      allowed
    }
  }
}

# Lay tat ca permissions cua user
query {
  rbacUserPermissions
}

# Lay tat ca roles cua user
query {
  rbacUserRoles
}

# Lay permission summary
query {
  rbacUserPermissionSummary {
    userId
    roles
    permissionCount
    resources {
      resource
      actions
    }
  }
}
```

### 10.2 Input/Output Types

**CheckPermissionInput:**

```typescript
@InputType()
export class CheckPermissionInput {
  @Field()
  resource: string;

  @Field()
  action: string;

  @Field(() => GraphQLJSON, { nullable: true })
  attributes?: Record<string, unknown>;
}
```

**PermissionResultOutput:**

```typescript
@ObjectType()
export class PermissionResultOutput {
  @Field()
  allowed: boolean;

  @Field({ nullable: true })
  reason?: string;

  @Field()
  latencyMs: number;

  @Field({ nullable: true })
  cached?: boolean;
}
```

---

## 11. Configuration

### 11.1 RBAC Configuration

**File:** `configs/mkt-rbac.config.ts`

```typescript
export const ENTERPRISE_RBAC_CONFIG_TOKEN = Symbol('ENTERPRISE_RBAC_CONFIG');

export type EnterpriseRbacConfigType = {
  // Validation mode
  validationMode: 'SIMPLIFIED' | 'FULL';

  // Enforcer settings
  enforcer: {
    ttlMs: number;           // Default: 1800000 (30 min)
    maxEnforcersInMemory: number;  // Default: 10
    failClosed: boolean;     // Default: true
  };

  // Cache settings
  cache: {
    enabled: boolean;
    ttlMs: number;           // Default: 300000 (5 min)
    prefix: string;
  };

  // Sync settings
  sync: {
    debounceMs: number;      // Default: 1000
    maxRetries: number;      // Default: 3
    retryDelayMs: number;    // Default: 5000
  };
};
```

**Usage:**

```typescript
@Injectable()
export class MyService {
  constructor(
    @Inject(ENTERPRISE_RBAC_CONFIG_TOKEN)
    private readonly config: EnterpriseRbacConfigType,
  ) {}
}
```

### 11.2 Casbin Config (Zod-validated)

**File:** `casbin/config/rbac-config.schema.ts`

```typescript
export const rbacConfigSchema = z.object({
  enforcer: z.object({
    ttlMs: z.number().min(0).default(1800000),
    maxEnforcersInMemory: z.number().min(1).default(10),
    failClosed: z.boolean().default(true),
    watcherEnabled: z.boolean().default(true),
  }),
  sync: z.object({
    debounceMs: z.number().min(0).default(1000),
    maxRetries: z.number().min(0).default(3),
    retryDelayMs: z.number().min(0).default(5000),
    maxPoliciesPerSync: z.number().min(1).default(10000),
  }),
  cacheWarmer: z.object({
    enabled: z.boolean().default(true),
    concurrency: z.number().min(1).default(5),
    priorityWorkspaces: z.array(z.string()).default([]),
  }),
  health: z.object({
    maxEnforcerLoadTimeMs: z.number().default(5000),
    maxPolicyLoadTimeMs: z.number().default(10000),
  }),
});
```

### 11.3 Environment Variables

```bash
# Validation mode
RBAC_VALIDATION_MODE=SIMPLIFIED  # hoac FULL

# Enforcer settings
RBAC_ENFORCER_TTL_MS=1800000
RBAC_MAX_ENFORCERS=10
RBAC_FAIL_CLOSED=true

# Cache settings
RBAC_CACHE_ENABLED=true
RBAC_CACHE_TTL_MS=300000

# Sync settings
RBAC_SYNC_DEBOUNCE_MS=1000
RBAC_SYNC_MAX_RETRIES=3

# Watcher
RBAC_WATCHER_ENABLED=true
```

---

## 12. Caching Strategy

### 12.1 Cache Layers

```
┌─────────────────────────────────────────────────────┐
│                  Application Layer                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │           In-Memory Enforcer Cache           │    │
│  │  - LRU eviction                              │    │
│  │  - Max 10 enforcers                          │    │
│  │  - TTL: 30 minutes                           │    │
│  └─────────────────────────────────────────────┘    │
│                          │                           │
│                          ▼                           │
│  ┌─────────────────────────────────────────────┐    │
│  │           Redis Permission Cache             │    │
│  │  - Per-user/resource/action                  │    │
│  │  - TTL: 5 minutes                            │    │
│  └─────────────────────────────────────────────┘    │
│                          │                           │
│                          ▼                           │
│  ┌─────────────────────────────────────────────┐    │
│  │           Redis Role Cache                   │    │
│  │  - Role inheritance                          │    │
│  │  - TTL: 10 minutes                           │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 12.2 Cache Keys

**Format:** `rbac:{workspaceId}:{type}:{key}`

| Type | Key Pattern | TTL | Description |
|------|-------------|-----|-------------|
| `enforcer` | `enforcer:{workspaceId}` | 30min | Cached Casbin enforcer |
| `permission` | `permission:{userId}:{resource}:{action}` | 5min | Permission check result |
| `role` | `role:{userId}` | 10min | User roles |
| `policy` | `policy:version:{workspaceId}` | 1hour | Policy version |
| `template` | `template:{templateId}` | 30min | Permission template |

### 12.3 Cache Invalidation

**Triggers:**
- Policy updated via API
- Permission template changed
- Role assignment changed
- PostgreSQL NOTIFY event
- Manual invalidation

**Strategy:**

```typescript
// PostgreSQL NOTIFY listener
await connection.query(`LISTEN casbin_policy_update`);

connection.on('notification', async (msg) => {
  const { workspaceId } = JSON.parse(msg.payload);
  await this.invalidateCache(workspaceId);
});

// Invalidate cache
async invalidateCache(workspaceId: string): Promise<void> {
  // 1. Remove enforcer from memory
  this.enforcers.delete(workspaceId);

  // 2. Clear Redis cache
  await this.redis.del(`rbac:${workspaceId}:*`);

  // 3. Increment policy version
  await this.policyVersionRepository.increment(workspaceId);
}
```

---

## 13. Real-time Updates

### 13.1 PostgreSQL NOTIFY Watcher

**File:** `casbin/watchers/pg-notify.watcher.ts`

```typescript
@Injectable()
export class PgNotifyWatcher implements OnModuleInit, OnModuleDestroy {
  private connection: PoolClient;
  private reconnectAttempts = 0;

  async onModuleInit(): Promise<void> {
    await this.connect();
    await this.listen();
  }

  private async listen(): Promise<void> {
    await this.connection.query('LISTEN casbin_policy_update');

    this.connection.on('notification', async (msg) => {
      const payload = JSON.parse(msg.payload);
      await this.handlePolicyUpdate(payload);
    });
  }

  private async handlePolicyUpdate(payload: PolicyUpdatePayload): Promise<void> {
    const { workspaceId, action, timestamp } = payload;

    // Invalidate enforcer cache
    await this.enforcerService.invalidateCache(workspaceId);

    // Emit event for other handlers
    this.eventEmitter.emit('rbac.policy.updated', payload);
  }
}
```

### 13.2 Cross-Region Invalidation

**File:** `casbin/pubsub/cross-region-invalidation.pubsub.ts`

Su dung Redis Pub/Sub cho multi-region deployments:

```typescript
@Injectable()
export class CrossRegionInvalidationPubSub {
  private readonly channel = 'rbac:invalidation';

  async publishInvalidation(workspaceId: string): Promise<void> {
    await this.redis.publish(this.channel, JSON.stringify({
      workspaceId,
      region: process.env.REGION,
      timestamp: Date.now(),
    }));
  }

  async subscribe(): Promise<void> {
    await this.redis.subscribe(this.channel, (message) => {
      const { workspaceId, region } = JSON.parse(message);

      // Skip if from same region
      if (region === process.env.REGION) return;

      // Invalidate local cache
      this.enforcerService.invalidateCache(workspaceId);
    });
  }
}
```

---

## 14. Implementation Guide

### 14.1 Them Permission Check vao Resolver

**Buoc 1:** Import decorator va guard

```typescript
import { Permission } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import { PermissionAction } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';
```

**Buoc 2:** Ap dung decorator

```typescript
@Resolver(() => MktOrder)
export class MktOrderResolver {
  @Query(() => [MktOrder])
  @Permission({
    resource: 'mktOrder',
    action: PermissionAction.READ,
  })
  async orders(): Promise<MktOrder[]> {
    return this.orderService.findAll();
  }

  @Mutation(() => MktOrder)
  @Permission({
    resource: 'mktOrder',
    action: PermissionAction.CREATE,
  })
  async createOrder(
    @Args('input') input: CreateOrderInput,
  ): Promise<MktOrder> {
    return this.orderService.create(input);
  }

  @Mutation(() => MktOrder)
  @Permission({
    resource: 'mktOrder',
    action: PermissionAction.UPDATE,
    recordIdParam: 'id',
  })
  async updateOrder(
    @Args('id') id: string,
    @Args('input') input: UpdateOrderInput,
  ): Promise<MktOrder> {
    return this.orderService.update(id, input);
  }

  @Mutation(() => Boolean)
  @Permission({
    resource: 'mktOrder',
    action: PermissionAction.DELETE,
    recordIdParam: 'id',
    errorMessage: 'Ban khong co quyen xoa don hang nay',
  })
  async deleteOrder(@Args('id') id: string): Promise<boolean> {
    return this.orderService.delete(id);
  }
}
```

### 14.2 Manual Permission Check trong Service

```typescript
@Injectable()
export class MktOrderService {
  constructor(
    private readonly enforcerService: CasbinEnforcerService,
  ) {}

  async performSensitiveAction(
    userId: string,
    workspaceId: string,
    orderId: string,
  ): Promise<void> {
    // Kiem tra quyen thu cong
    const result = await this.enforcerService.checkPermission({
      userId,
      workspaceId,
      resource: 'mktOrder',
      action: 'ACCESS_SENSITIVE_DATA',
    });

    if (!result.allowed) {
      throw new PermissionDeniedError({
        resource: 'mktOrder',
        action: 'ACCESS_SENSITIVE_DATA',
        reason: result.reason,
        userId,
        workspaceId,
      });
    }

    // Thuc hien action
    await this.doSensitiveAction(orderId);
  }
}
```

### 14.3 Tao Permission Template moi

**Buoc 1:** Tao template trong database

```typescript
const template = await this.templateRepository.create({
  templateKey: 'SALES_MANAGER',
  templateName: 'Sales Manager',
  templateType: 'ROLE_BASED',
  hierarchyLevel: 7,  // MANAGER level
  priority: 100,
  resolutionStrategy: 'PRIORITY_BASED',
  isActive: true,
});
```

**Buoc 2:** Them resource permissions

```typescript
const permissions = [
  { resourceKey: 'mktCustomer', actions: ['READ', 'CREATE', 'UPDATE'] },
  { resourceKey: 'mktOrder', actions: ['READ', 'CREATE', 'UPDATE', 'DELETE'] },
  { resourceKey: 'mktInvoice', actions: ['READ'] },
];

for (const perm of permissions) {
  await this.resourcePermissionRepository.create({
    template: { id: template.id },
    resourceKey: perm.resourceKey,
    allowedActions: perm.actions,
  });
}
```

**Buoc 3:** Gan template cho user

```typescript
await this.userTemplateRepository.create({
  userId: 'user-uuid',
  template: { id: template.id },
  assignedBy: 'admin-uuid',
  effectiveFrom: DateTimeUtils.now(),
});
```

**Buoc 4:** Sync policies

```typescript
await this.policySyncService.syncPolicies(workspaceId);
```

### 14.4 Them Resource moi

**Buoc 1:** Dinh nghia trong constants

```typescript
// constants/core/enterprise-rbac.constants.ts
export const RESOURCES = {
  // ... existing resources
  MKT_CAMPAIGN: 'mktCampaign',
} as const;
```

**Buoc 2:** Tao record trong database

```typescript
await this.resourceRepository.create({
  resourceKey: 'mktCampaign',
  resourceName: 'Marketing Campaign',
  resourceCategory: 'MARKETING',
  isSystemResource: false,
  isActive: true,
});
```

**Buoc 3:** Cap nhat permission templates

```typescript
// Them resource vao cac templates can thiet
await this.resourcePermissionRepository.create({
  template: { id: marketingManagerTemplateId },
  resourceKey: 'mktCampaign',
  allowedActions: ['READ', 'CREATE', 'UPDATE', 'DELETE'],
});
```

---

## 15. Working Flow

### 15.1 Permission Check Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      GraphQL Request                              │
│                  (Query/Mutation with @Permission)                │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    CasbinAuthzGuard                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Extract @Permission metadata (resource, action)         │  │
│  │ 2. Extract userId, workspaceId from context                │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│               CasbinEnforcerService.checkPermission()            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 3. Build cache key: rbac:{wsId}:perm:{userId}:{res}:{act} │  │
│  │ 4. Check Redis cache                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌─────────────────────┐      ┌─────────────────────────────────────┐
│    Cache HIT        │      │           Cache MISS                 │
│  Return cached      │      │  ┌─────────────────────────────────┐│
│  result             │      │  │ 5. Get/create workspace enforcer││
└─────────────────────┘      │  │    - Check in-memory cache      ││
                             │  │    - Load from DB if needed     ││
                             │  └─────────────────────────────────┘│
                             │  ┌─────────────────────────────────┐│
                             │  │ 6. Casbin.enforce()              ││
                             │  │    - user:id, resource, action  ││
                             │  │    - Check role inheritance     ││
                             │  │    - Apply deny-override         ││
                             │  └─────────────────────────────────┘│
                             │  ┌─────────────────────────────────┐│
                             │  │ 7. Cache result (TTL: 5min)     ││
                             │  └─────────────────────────────────┘│
                             └───────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Return PermissionCheckResult                   │
│         { allowed: boolean, reason?: string, latencyMs }         │
└───────────────────────────┬──────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌─────────────────────┐      ┌─────────────────────────────────────┐
│    allowed: true    │      │         allowed: false              │
│  Continue to        │      │  Throw PermissionDeniedError        │
│  resolver logic     │      │  { resource, action, reason }       │
└─────────────────────┘      └─────────────────────────────────────┘
```

### 15.2 Policy Sync Flow

```
┌──────────────────────────────────────────────────────────────────┐
│              Permission Template Updated                          │
│  (via API, Admin UI, or CLI)                                     │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Emit 'permission.changed' Event                   │
│  { workspaceId, templateId, changeType, timestamp }              │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│          PolicySyncService.handlePermissionChange()               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Debounce rapid changes (wait 1s for more changes)       │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│              Convert Template to Casbin Policies                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 2. Load template with relations                            │  │
│  │ 3. For each resourcePermission:                            │  │
│  │    - Create policy: p, role:{template}, {resource}, {act}  │  │
│  │ 4. For each userAssignment:                                │  │
│  │    - Create grouping: g, user:{userId}, role:{template}    │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PolicyValidator.validate()                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 5. Validate syntax                                         │  │
│  │ 6. Check resource existence                                │  │
│  │ 7. Validate action values                                  │  │
│  │ 8. Check for conflicts                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌─────────────────────┐      ┌─────────────────────────────────────┐
│  Validation FAILED  │      │        Validation PASSED            │
│  ┌─────────────────┐│      │  ┌─────────────────────────────────┐│
│  │ - Log error     ││      │  │ 9. Upsert to MktCasbinRule      ││
│  │ - Add to DLQ    ││      │  │    - Delete old policies        ││
│  │ - Notify admin  ││      │  │    - Insert new policies        ││
│  └─────────────────┘│      │  └─────────────────────────────────┘│
└─────────────────────┘      │  ┌─────────────────────────────────┐│
                             │  │ 10. Increment policy version     ││
                             │  └─────────────────────────────────┘│
                             │  ┌─────────────────────────────────┐│
                             │  │ 11. PostgreSQL NOTIFY            ││
                             │  │     casbin_policy_update         ││
                             │  └─────────────────────────────────┘│
                             └───────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│           All Instances Receive Notification                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 12. PgNotifyWatcher.handlePolicyUpdate()                   │  │
│  │ 13. CasbinEnforcerService.invalidateCache(workspaceId)     │  │
│  │     - Remove enforcer from memory                          │  │
│  │     - Clear Redis permission cache                         │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│             Next Permission Check                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 14. Cache miss → Reload enforcer with new policies         │  │
│  │ 15. New permission rules take effect                       │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 15.3 Cache Warming Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   Application Startup                             │
│                 hoac Scheduled Cron Job                           │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│              CacheWarmerService.warmCache()                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Get list of all active workspaces                       │  │
│  │ 2. Identify priority workspaces (from config)              │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│              Warm Priority Workspaces First                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 3. For each priority workspace (sequentially):             │  │
│  │    - Load policies from database                           │  │
│  │    - Create enforcer                                       │  │
│  │    - Cache in memory                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│              Warm Remaining Workspaces                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 4. Process remaining workspaces with concurrency limit     │  │
│  │    - Default: 5 concurrent loads                           │  │
│  │    - Track success/failure for each                        │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Return WarmCacheResult                         │
│  { totalWorkspaces, warmedCount, failedCount, duration }         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 16. CLI Commands

### 16.1 Sync Policies

```bash
# Sync policies cho tat ca workspaces
npx nx command twenty-server -- rbac-seeder:sync

# Sync cho workspace cu the
npx nx command twenty-server -- rbac-seeder:sync --workspace-id=<id>
```

### 16.2 Check RBAC Health

```bash
# Kiem tra health cua RBAC system
npx nx command twenty-server -- rbac-seeder:check

# Output:
# ✓ Database connection: OK
# ✓ Redis connection: OK
# ✓ Enforcer cache: 5 workspaces loaded
# ✓ Policy count: 1234 policies
# ✓ Watcher status: Connected
```

### 16.3 Warm Cache

```bash
# Pre-load enforcers cho tat ca workspaces
npx nx command twenty-server -- rbac-seeder:warm-cache

# Chi warm priority workspaces
npx nx command twenty-server -- rbac-seeder:warm-cache --priority-only
```

### 16.4 Debug Permission

```bash
# Kiem tra permission cua user
npx nx command twenty-server -- rbac-seeder:debug \
  --user-id=<userId> \
  --workspace-id=<wsId> \
  --resource=mktCustomer \
  --action=READ
```

---

## 17. Performance Optimizations

### 17.1 Enforcer Caching

- **In-memory LRU cache** per workspace
- **Max enforcers**: 10 (configurable)
- **TTL**: 30 minutes
- **Eviction**: Least Recently Used

```typescript
// Configuration
{
  enforcer: {
    maxEnforcersInMemory: 10,
    ttlMs: 1800000,  // 30 minutes
  }
}
```

### 17.2 Permission Caching

- **Redis-backed** permission check cache
- **TTL**: 5 minutes (configurable)
- **Key format**: `rbac:{wsId}:perm:{userId}:{resource}:{action}`

```typescript
// Bypass cache khi can
@Permission({
  resource: 'mktOrder',
  action: PermissionAction.DELETE,
  enableCache: false,  // Always check fresh
})
```

### 17.3 Batch Operations

```typescript
// Kiem tra nhieu quyen cung luc
const results = await this.enforcerService.checkPermissionBatch({
  userId,
  workspaceId,
  checks: [
    { resource: 'mktCustomer', action: 'READ' },
    { resource: 'mktOrder', action: 'CREATE' },
    { resource: 'mktInvoice', action: 'UPDATE' },
  ],
});
```

### 17.4 Debounced Sync

- Batch rapid policy changes
- Default debounce: 1 second
- Reduces database writes

---

## 18. Error Handling

### 18.1 PermissionDeniedError

```typescript
throw new PermissionDeniedError({
  resource: 'mktCustomer',
  action: 'delete',
  reason: 'User lacks delete permission for customers',
  userId: 'uuid-123',
  workspaceId: 'ws-123',
});
```

**GraphQL Response:**

```json
{
  "errors": [{
    "message": "Permission denied",
    "extensions": {
      "code": "PERMISSION_DENIED",
      "resource": "mktCustomer",
      "action": "delete",
      "reason": "User lacks delete permission for customers"
    }
  }]
}
```

### 18.2 Fail-Closed Security

Khi gap loi, he thong se **tu choi truy cap** (khong phai cho phep):

```typescript
// Configuration
{
  enforcer: {
    failClosed: true,  // Default: true
  }
}

// Behavior
try {
  const result = await enforcer.enforce(user, resource, action);
  return { allowed: result };
} catch (error) {
  if (this.config.enforcer.failClosed) {
    return { allowed: false, reason: 'System error - access denied' };
  }
  throw error;
}
```

### 18.3 Audit Logging

Moi permission check va thay doi deu duoc ghi lai:

```typescript
// Permission check audit
{
  userId: 'uuid-123',
  workspaceId: 'ws-123',
  resource: 'mktCustomer',
  action: 'DELETE',
  allowed: false,
  reason: 'Insufficient permissions',
  latencyMs: 5,
  timestamp: '2024-01-15T10:30:00Z',
  source: 'GraphQL',
  requestId: 'req-456',
}
```

---

## 19. Testing

### 19.1 Unit Tests

```typescript
describe('CasbinEnforcerService', () => {
  describe('checkPermission', () => {
    it('should allow admin to access all resources', async () => {
      const result = await service.checkPermission({
        userId: adminUserId,
        workspaceId,
        resource: 'mktCustomer',
        action: 'DELETE',
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny user without permission', async () => {
      const result = await service.checkPermission({
        userId: regularUserId,
        workspaceId,
        resource: 'mktCustomer',
        action: 'DELETE',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('lacks permission');
    });

    it('should use cache on subsequent checks', async () => {
      // First call
      await service.checkPermission(input);

      // Second call should hit cache
      const result = await service.checkPermission(input);

      expect(result.cached).toBe(true);
    });
  });
});
```

### 19.2 Integration Tests

```typescript
describe('RBAC Integration', () => {
  it('should sync template changes to Casbin', async () => {
    // Update template
    await templateRepository.update(templateId, {
      resourcePermissions: [...newPermissions],
    });

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check permission reflects change
    const result = await enforcerService.checkPermission({
      userId,
      workspaceId,
      resource: 'mktCustomer',
      action: 'DELETE',
    });

    expect(result.allowed).toBe(true);
  });

  it('should invalidate cache on policy update', async () => {
    // Cache permission
    await enforcerService.checkPermission(input);

    // Update policy via PostgreSQL NOTIFY
    await connection.query(`
      NOTIFY casbin_policy_update, '{"workspaceId": "${workspaceId}"}'
    `);

    // Wait for invalidation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Next check should reload
    const result = await enforcerService.checkPermission(input);

    expect(result.cached).toBe(false);
  });
});
```

### 19.3 Test Utilities

```typescript
// Test helper de setup permissions
export const setupTestPermissions = async (
  workspaceId: string,
  permissions: TestPermission[],
) => {
  for (const perm of permissions) {
    await casbinRuleRepository.create({
      ptype: 'p',
      subject: `user:${perm.userId}`,
      object: perm.resource,
      action: perm.action,
      effect: perm.effect,
    });
  }

  // Trigger sync
  await enforcerService.reloadPolicies(workspaceId);
};
```

---

## Summary

Module **mkt-rbac-enterprise-grade** cung cap:

| Feature | Implementation |
|---------|----------------|
| Authorization Engine | Casbin RBAC + ABAC |
| Workspace Isolation | Per-workspace enforcer |
| High Performance | LRU cache + Redis |
| Real-time Sync | PostgreSQL NOTIFY |
| Enterprise Features | Hierarchy, Data Policies |
| Audit Trail | Full logging |
| Security | Fail-closed pattern |
| Type Safety | Zod + Symbol DI tokens |
| Flexibility | SIMPLIFIED/FULL modes |
| Monitoring | Metrics + Health checks |

Khi can tro giup hoac co cau hoi, vui long lien he team backend.
