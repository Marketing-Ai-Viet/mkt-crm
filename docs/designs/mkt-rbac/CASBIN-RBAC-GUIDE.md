# Casbin RBAC Enterprise Guide

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Kiến trúc Module](#2-kiến-trúc-module)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Các thành phần chính](#4-các-thành-phần-chính)
5. [Data Flow](#5-data-flow)
6. [Hướng dẫn triển khai](#6-hướng-dẫn-triển-khai)
7. [API Reference](#7-api-reference)
8. [Best Practices](#8-best-practices)

---

## 1. Giới thiệu

### 1.1. Casbin là gì?

Casbin là thư viện authorization mạnh mẽ hỗ trợ nhiều mô hình access control:
- **RBAC** (Role-Based Access Control)
- **ABAC** (Attribute-Based Access Control)
- **ACL** (Access Control List)

### 1.2. Tại sao chọn Casbin?

| Tính năng | Mô tả |
|-----------|-------|
| **Flexible** | Hỗ trợ nhiều mô hình authorization qua config |
| **Policy Storage** | Lưu trữ policies trong database |
| **Workspace Isolation** | Mỗi workspace có schema riêng |
| **Role Hierarchy** | RBAC với role inheritance |
| **Real-time** | Sync policies qua PG NOTIFY |
| **Performance** | In-memory enforcer với LRU cache |

### 1.3. Unified RBAC+ABAC Model

Module sử dụng **unified model** kết hợp RBAC và ABAC:

```conf
[request_definition]
r = sub, obj, act, attr

[policy_definition]
p = sub, obj, act, eft, condition

[role_definition]
g = _, _      # user -> role
g2 = _, _     # resource grouping

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub) && (g2(r.obj, p.obj) || r.obj == p.obj) && (r.act == p.act || p.act == "*") && (p.condition == "" || eval(p.condition))
```

**Tại sao unified model?**
- **Backwards-compatible**: Policies không có condition = RBAC thuần
- **Linh hoạt**: Thêm conditions khi cần mà không đổi model
- **Đơn giản**: Một model duy nhất cho mọi use case

**Giải thích parameters:**
| Parameter | Mô tả | Ví dụ |
|-----------|-------|-------|
| `sub` | Subject (user/role) | `user:uuid`, `role:admin` |
| `obj` | Object/Resource | `mktOrder`, `mktCustomer` |
| `act` | Action | `read`, `write`, `delete`, `*` |
| `eft` | Effect | `allow`, `deny` |
| `attr` | Attributes (optional) | `{ clearance: 3, time: '...' }` |
| `condition` | JS expression | `""` hoặc `"r.attr.clearance >= 2"` |

**Ví dụ policies:**
```
# Pure RBAC (condition empty)
p, role:admin, mktOrder, *, allow, ""

# ABAC với clearance check
p, role:viewer, mktOrder, read, allow, "r.attr.clearance >= 2"

# Time-based permission
p, role:temp, mktOrder, read, allow, "r.attr.currentTime <= '2026-03-31'"

# Role assignment
g, user:uuid-123, role:admin
```

---

## 2. Kiến trúc Module

### 2.1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GraphQL/REST Request                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              @RequirePermission Decorator                        │
│                   CasbinAuthzGuard                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CasbinEnforcerService                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ In-memory    │  │ Permission   │  │  Policy Version      │   │
│  │ Enforcer     │  │ Check        │  │  Tracking            │   │
│  │ Cache (LRU)  │  │ Engine       │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌───────────────┐ ┌───────────────────────────┐
│ WorkspaceCasbin │ │ PgNotify      │ │ PolicySyncService         │
│ Adapter         │ │ Watcher       │ │ (Template → Casbin)       │
│ (Per-schema)    │ │ (Real-time)   │ │                           │
└────────┬────────┘ └───────────────┘ └───────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│           workspace_{base36}.mktCasbinRule table                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. Security Patterns

**Fail-Closed Pattern:**
```typescript
// Deny all on errors
if (this.config.failClosed) {
  return { allowed: false, reason: 'Enforcement failed' };
}
```

**Workspace-Per-Schema Isolation:**
```
Workspace A (workspace_abc123)     Workspace B (workspace_xyz789)
┌────────────────────────────┐    ┌────────────────────────────┐
│ Schema: workspace_abc123   │    │ Schema: workspace_xyz789   │
│ ┌────────────────────────┐ │    │ ┌────────────────────────┐ │
│ │ mktCasbinRule table    │ │    │ │ mktCasbinRule table    │ │
│ │ - role:admin policies  │ │    │ │ - role:admin policies  │ │
│ │ - user:1 assignments   │ │    │ │ - user:2 assignments   │ │
│ └────────────────────────┘ │    │ └────────────────────────┘ │
│                            │    │                            │
│ Enforcer Cache: A          │    │ Enforcer Cache: B          │
└────────────────────────────┘    └────────────────────────────┘
              │                               │
              └───────────┬───────────────────┘
                          ▼
              Cross-workspace access: IMPOSSIBLE
              (Different schemas, no domain needed)
```

---

## 3. Cấu trúc thư mục

```
casbin/
├── adapters/
│   └── workspace-casbin.adapter.ts   # TwentyORM-based adapter
├── config/
│   ├── rbac-config.defaults.ts       # Default values
│   ├── rbac-config.types.ts          # Type definitions
│   ├── rbac.config.ts                # NestJS ConfigModule
│   └── index.ts
├── constants/
│   ├── enforcer.constants.ts         # CASBIN_MODEL
│   ├── metrics.constants.ts
│   └── policy-version.constants.ts
├── decorators/
│   └── require-permission.decorator.ts
├── entities/
│   ├── mkt-casbin-rule.workspace-entity.ts
│   └── mkt-policy-version.workspace-entity.ts
├── guards/
│   ├── casbin-authz.guard.ts
│   └── dual-path-authz.guard.ts
├── health/
│   └── rbac-health.indicator.ts
├── repositories/
│   ├── workspace-casbin-rule.repository.ts
│   └── policy-version.repository.ts
├── services/
│   ├── casbin-enforcer.service.ts
│   ├── policy-sync.service.ts
│   ├── rbac-metrics.service.ts
│   └── cache-warmer.service.ts
├── types/
│   ├── casbin.types.ts
│   ├── policy-sync.types.ts
│   └── rbac-config.types.ts
├── validators/
│   └── policy.validator.ts
├── watchers/
│   └── pg-notify.watcher.ts
├── casbin.module.ts
└── index.ts
```

---

## 4. Các thành phần chính

### 4.1. CasbinEnforcerService

Core service quản lý Casbin enforcers per workspace.

```typescript
// Check permission (RBAC)
const result = await enforcerService.checkPermission({
  userId: 'user-uuid',
  workspaceId: 'workspace-uuid',
  resource: 'mktCustomer',
  action: 'read',
});

// Check permission with ABAC attributes
const result = await enforcerService.checkPermission({
  userId: 'user-uuid',
  workspaceId: 'workspace-uuid',
  resource: 'mktOrder',
  action: 'read',
  attributes: {
    clearance: 3,
    currentTime: '2026-01-09',
  },
});

// Batch check
const batchResult = await enforcerService.checkPermissionBatch({
  userId: 'user-uuid',
  workspaceId: 'workspace-uuid',
  checks: [
    { resource: 'mktCustomer', action: 'read' },
    { resource: 'mktOrder', action: 'write', attributes: { clearance: 2 } },
  ],
});

// Check role
const hasRole = await enforcerService.hasRole(userId, workspaceId, 'admin');

// Get user roles
const roles = await enforcerService.getUserRoles(userId, workspaceId);
```

### 4.2. PolicySyncService

Đồng bộ Permission Templates sang Casbin policies.

```typescript
// Sync workspace
const result = await policySyncService.syncWorkspace(workspaceId);

// Dry-run (preview changes)
const preview = await policySyncService.manualSync(workspaceId, { dryRun: true });

// Sync with retry
const result = await policySyncService.syncWithRetry(workspaceId, 3);

// Get sync status
const status = await policySyncService.getSyncStatus(workspaceId);
// { version: 5, lastSync: Date, isInDeadLetter: false, isSyncing: false }
```

### 4.3. WorkspaceCasbinAdapter

Custom adapter cho TwentyORM workspace entities.

```typescript
// Created automatically by CasbinEnforcerService
const adapter = await WorkspaceCasbinAdapter.newAdapter(
  repository,  // TwentyORM repository
  workspaceId,
);

// Load policies from workspace schema
await adapter.loadPolicy(model);

// Get policy count
const count = await adapter.getPolicyCount();
```

### 4.4. @RequirePermission Decorator

```typescript
@Resolver(() => MktCustomer)
export class MktCustomerResolver {
  @Query(() => [MktCustomer])
  @RequirePermission('mktCustomer', 'read')
  async customers(): Promise<MktCustomer[]> {
    // Only executed if user has permission
  }

  @Mutation(() => MktCustomer)
  @RequirePermission('mktCustomer', 'write')
  async createCustomer(): Promise<MktCustomer> {
    // ...
  }
}

// Multiple permissions (AND)
@RequireAllPermissions([
  { resource: 'mktOrder', action: 'read' },
  { resource: 'mktPayment', action: 'read' },
])

// Multiple permissions (OR)
@RequireAnyPermission([
  { resource: 'mktOrder', action: 'write' },
  { resource: 'admin', action: '*' },
])

// Public endpoint
@Public()
```

---

## 5. Data Flow

### 5.1. Permission Check Flow

```
1. Request arrives
   ↓
2. @RequirePermission extracts (resource, action)
   ↓
3. CasbinAuthzGuard.canActivate()
   ↓
4. Extract (userId, workspaceId) from context
   ↓
5. CasbinEnforcerService.checkPermission()
   ↓
6. Check enforcer cache (LRU)
   │
   ├── Cache HIT → Use cached enforcer
   │
   └── Cache MISS → Create new enforcer
       │
       └── WorkspaceCasbinAdapter.loadPolicy()
           │
           └── SELECT * FROM workspace_{base36}.mktCasbinRule
   ↓
7. Casbin enforce(sub, obj, act, attr)
   ↓
8. Matcher evaluation (RBAC + optional ABAC condition)
   │
   ├── ALLOW → Continue to resolver
   │
   └── DENY → Throw PermissionDeniedError
```

### 5.2. Policy Sync Flow

```
1. Permission template updated
   ↓
2. Emit 'permission.changed' event
   ↓
3. PolicySyncService.handlePermissionChange()
   ↓
4. Debounce (500ms default)
   ↓
5. Acquire sync lock (Redis)
   ↓
6. Generate policies from templates
   ↓
7. Calculate hash → Check if changed
   │
   ├── No changes → Skip
   │
   └── Has changes → Continue
   ↓
8. Validate policies
   ↓
9. WorkspaceCasbinRuleRepository.bulkReplace() (atomic)
   ↓
10. Update policy version
   ↓
11. Invalidate enforcer cache
   ↓
12. PgNotifyWatcher.update() → NOTIFY
   ↓
13. Other instances receive → Clear cache
```

---

## 6. Hướng dẫn triển khai

### 6.1. Prerequisites

```bash
yarn add casbin
yarn add @nestjs/terminus  # Health checks
yarn add @nestjs/schedule  # Cache warming cron
```

### 6.2. Environment Variables

```env
# PostgreSQL connection for PG NOTIFY watcher
PG_DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Cache warming
RBAC_CACHE_WARM_ENABLED=true
RBAC_CACHE_WARM_ON_STARTUP=true
RBAC_CACHE_WARM_CONCURRENCY=5
RBAC_PRIORITY_WORKSPACES=workspace-1,workspace-2

# Sync settings
RBAC_SYNC_MAX_RETRIES=3
RBAC_SYNC_RETRY_DELAY_MS=1000
RBAC_SYNC_DEBOUNCE_MS=500
RBAC_MAX_POLICIES_PER_WORKSPACE=10000

# Enforcer settings
RBAC_FAIL_CLOSED=true
RBAC_CACHE_ENABLED=true
RBAC_MAX_ENFORCERS_IN_MEMORY=100
RBAC_ENFORCER_TTL_MS=3600000
```

### 6.3. Module Import

```typescript
// mkt-core.module.ts
import { CasbinModule } from './mkt-rbac-enterprise-grade/casbin';

@Module({
  imports: [
    CasbinModule,
    // ... other modules
  ],
})
export class MktCoreModule {}
```

### 6.4. WorkspaceEntity Definition

```typescript
// mkt-casbin-rule.workspace-entity.ts
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCasbinRule,
  namePlural: 'mktCasbinRules',
  labelSingular: 'Casbin Rule',
  labelPlural: 'Casbin Rules',
  icon: 'IconShield',
})
export class MktCasbinRuleWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktCasbinRule.ptype,
    type: FieldMetadataType.TEXT,
    label: 'Policy Type',
  })
  ptype: string;  // 'p' or 'g'

  @WorkspaceField({ ... })
  v0: string;  // subject

  @WorkspaceField({ ... })
  v1: string;  // object (for p) or role (for g)

  @WorkspaceField({ ... })
  v2: string;  // action (for p)

  @WorkspaceField({ ... })
  v3: string;  // effect (for p)

  @WorkspaceField({ ... })
  v4: string;  // condition (for p)

  @WorkspaceField({ ... })
  v5: string;  // reserved
}
```

### 6.5. Tạo Policies

```typescript
// Sử dụng WorkspaceCasbinRuleRepository
@Injectable()
export class PolicySetupService {
  constructor(
    private readonly casbinRuleRepo: WorkspaceCasbinRuleRepository,
  ) {}

  async setupAdminRole() {
    // Add permission policy (RBAC)
    await this.casbinRuleRepo.addRule('p', [
      'role:admin',     // v0: subject
      'mktCustomer',    // v1: object
      '*',              // v2: action
      'allow',          // v3: effect
      '',               // v4: condition (empty = pure RBAC)
    ]);

    // Add permission policy (ABAC)
    await this.casbinRuleRepo.addRule('p', [
      'role:viewer',
      'mktOrder',
      'read',
      'allow',
      'r.attr.clearance >= 2',  // ABAC condition
    ]);

    // Add role assignment
    await this.casbinRuleRepo.addRule('g', [
      'user:user-uuid',  // v0: user
      'role:admin',      // v1: role
    ]);
  }
}
```

### 6.6. Sử dụng trong Service

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly enforcerService: CasbinEnforcerService,
  ) {}

  async processOrder(orderId: string, userId: string, workspaceId: string) {
    // Check permission với attributes
    const canProcess = await this.enforcerService.checkPermission({
      userId,
      workspaceId,
      resource: 'mktOrder',
      action: 'process',
      attributes: {
        orderId,
        currentTime: new Date().toISOString(),
      },
    });

    if (!canProcess.allowed) {
      throw new ForbiddenException(canProcess.reason);
    }

    // Process order...
  }

  async getOrdersForUser(userId: string, workspaceId: string) {
    // Batch check permissions
    const orderIds = ['order-1', 'order-2', 'order-3'];

    const permissions = await this.enforcerService.checkPermissionBatch({
      userId,
      workspaceId,
      checks: orderIds.map(id => ({
        resource: 'mktOrder',
        resourceId: id,
        action: 'read',
      })),
    });

    // Filter orders by permission
    return orderIds.filter(id =>
      permissions.results.get(`mktOrder:${id}:read`)
    );
  }
}
```

### 6.7. ABAC Conditions Examples

```typescript
// Time-based access
const policy = {
  ptype: 'p',
  subject: 'role:temp-contractor',
  object: 'mktOrder',
  action: 'read',
  effect: 'allow',
  condition: "r.attr.currentTime >= '2026-01-01' && r.attr.currentTime <= '2026-03-31'",
};

// Clearance level
const policy2 = {
  ptype: 'p',
  subject: 'role:analyst',
  object: 'mktReport',
  action: 'read',
  effect: 'allow',
  condition: 'r.attr.userClearance >= 3',
};

// Owner check
const policy3 = {
  ptype: 'p',
  subject: 'role:user',
  object: 'mktOrder',
  action: 'update',
  effect: 'allow',
  condition: 'r.attr.ownerId === r.attr.userId',
};

// Check with attributes
await enforcerService.checkPermission({
  userId: 'user-123',
  workspaceId: 'ws-456',
  resource: 'mktOrder',
  action: 'update',
  attributes: {
    userId: 'user-123',
    ownerId: 'user-123',  // owner matches
    currentTime: '2026-02-15',
    userClearance: 4,
  },
});
```

---

## 7. API Reference

### 7.1. CasbinEnforcerService

| Method | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `checkPermission` | `PermissionCheckInput` | `PermissionCheckResult` | Check single permission |
| `checkPermissionBatch` | `BatchPermissionRequest` | `BatchPermissionResult` | Check multiple permissions |
| `hasRole` | `userId, workspaceId, roleName` | `boolean` | Check if user has role |
| `getUserRoles` | `userId, workspaceId` | `string[]` | Get all roles for user |
| `getUserPermissions` | `userId, workspaceId` | `string[][]` | Get all permissions |
| `reloadPolicies` | `workspaceId` | `void` | Reload policies |
| `invalidateCache` | `workspaceId` | `void` | Invalidate workspace cache |
| `invalidateAllCaches` | - | `void` | Invalidate all caches |
| `getStats` | - | `object` | Get enforcer stats |

### 7.2. Types

```typescript
type PermissionCheckInput = {
  userId: string;
  workspaceId: string;
  resource: string;
  action: string;
  attributes?: Record<string, unknown>;  // For ABAC conditions
};

type PermissionCheckResult = {
  allowed: boolean;
  reason?: string;
  latencyMs: number;
  cached?: boolean;
};

type BatchPermissionRequest = {
  userId: string;
  workspaceId: string;
  checks: Array<{
    resource: string;
    resourceId?: string;
    action: string;
    attributes?: Record<string, unknown>;
  }>;
};
```

### 7.3. PolicySyncService

| Method | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `syncWorkspace` | `workspaceId` | `SyncResult` | Sync workspace |
| `syncWithRetry` | `workspaceId, maxRetries` | `SyncResult` | Sync with retry |
| `manualSync` | `workspaceId, options` | `ManualSyncResult` | Manual/dry-run sync |
| `dryRunSync` | `workspaceId` | `ManualSyncResult` | Preview changes |
| `getSyncStatus` | `workspaceId` | `object` | Get sync status |

---

## 8. Best Practices

### 8.1. Performance

1. **Use batch permission checks** khi cần check nhiều permissions
2. **Enable cache warming** để pre-load enforcers on startup
3. **Set appropriate TTL** cho enforcer cache (default: 1 hour)
4. **Monitor latency metrics** để detect slow checks

### 8.2. Security

1. **Luôn sử dụng @RequirePermission** cho protected endpoints
2. **Validate condition expressions** trước khi save policies
3. **Review policies** định kỳ
4. **Enable fail-closed** mode (default)
5. **Audit log** sensitive operations

### 8.3. ABAC Guidelines

1. **Keep conditions simple** - tránh complex logic
2. **Validate attributes** trước khi pass vào checkPermission
3. **Use consistent attribute names** across policies
4. **Document conditions** trong policy comments
5. **Test conditions** với different attribute values

### 8.4. Troubleshooting

**Permission denied unexpectedly:**
```typescript
// Check user roles
const roles = await enforcerService.getUserRoles(userId, workspaceId);
console.log('User roles:', roles);

// Check user permissions
const permissions = await enforcerService.getUserPermissions(userId, workspaceId);
console.log('User permissions:', permissions);

// Check specific policy exists
const rules = await casbinRuleRepo.findAll();
console.log('All rules:', rules);
```

**Sync not working:**
```typescript
// Check sync status
const status = await policySyncService.getSyncStatus(workspaceId);
console.log('Sync status:', status);

// Force manual sync
await policySyncService.manualSync(workspaceId);
```

**Cache issues:**
```typescript
// Invalidate specific workspace
await enforcerService.invalidateCache(workspaceId);

// Or invalidate all
await enforcerService.invalidateAllCaches();
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial Casbin RBAC implementation |
| 1.1.0 | 2025-01 | Add PgNotifyWatcher for real-time sync |
| 1.2.0 | 2025-01 | Add metrics and health monitoring |
| 2.0.0 | 2026-01 | Migrate to workspace-per-schema architecture |
| 2.1.0 | 2026-01 | Unified RBAC+ABAC model with optional conditions |

---

## References

- [Casbin Documentation](https://casbin.org/docs/overview)
- [Casbin Node.js](https://github.com/casbin/node-casbin)
- [ABAC Tutorial](https://casbin.org/docs/abac)
