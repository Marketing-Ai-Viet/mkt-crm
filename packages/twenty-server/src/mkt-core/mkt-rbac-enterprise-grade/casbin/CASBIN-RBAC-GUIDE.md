# Casbin RBAC Enterprise Guide

## Mục lục

1. [Giới thiệu Casbin](#1-giới-thiệu-casbin)
2. [Kiến trúc Module](#2-kiến-trúc-module)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Các thành phần chính](#4-các-thành-phần-chính)
5. [Data Flow](#5-data-flow)
6. [Hướng dẫn triển khai](#6-hướng-dẫn-triển-khai)
7. [API Reference](#7-api-reference)
8. [Best Practices](#8-best-practices)

---

## 1. Giới thiệu Casbin

### 1.1. Casbin là gì?

Casbin là một thư viện authorization mạnh mẽ, hỗ trợ nhiều mô hình access control:
- **ACL** (Access Control List)
- **RBAC** (Role-Based Access Control)
- **ABAC** (Attribute-Based Access Control)
- **RESTful** authorization

### 1.2. Tại sao chọn Casbin?

| Tính năng | Mô tả |
|-----------|-------|
| **Flexible** | Hỗ trợ nhiều mô hình authorization qua file cấu hình |
| **Policy Storage** | Lưu trữ policies trong database (PostgreSQL, MySQL, Redis...) |
| **Multi-tenant** | Hỗ trợ domain/tenant isolation |
| **Role Hierarchy** | RBAC với role inheritance |
| **Real-time** | Hỗ trợ watcher để sync policies real-time |
| **Performance** | In-memory enforcer với caching |

### 1.3. Mô hình RBAC với Domain

Module này sử dụng **RBAC with Domains** để hỗ trợ multi-tenant:

```conf
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act, eft

[role_definition]
g = _, _, _      # user -> role trong domain
g2 = _, _        # resource grouping

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && (g2(r.obj, p.obj) || r.obj == p.obj) && (r.act == p.act || p.act == "*")
```

**Giải thích:**
- `sub` (subject): User hoặc Role (`user:uuid`, `role:admin`)
- `dom` (domain): Workspace (`ws:workspace-uuid`)
- `obj` (object): Resource (`mktCustomer`, `mktOrder`)
- `act` (action): Action (`read`, `write`, `delete`, `*`)
- `eft` (effect): `allow` hoặc `deny`

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
│                 CasbinAuthzGuard                                 │
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
│ TwentyTypeORM   │ │ PgNotify      │ │ PolicySyncService         │
│ Adapter         │ │ Watcher       │ │ (Template → Casbin)       │
│ (Multi-tenant)  │ │ (Real-time)   │ │                           │
└────────┬────────┘ └───────────────┘ └───────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (casbin_rule table)                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. Security Pattern: Fail-Closed

Module áp dụng pattern **Fail-Closed** - từ chối tất cả khi có lỗi:

```typescript
// Khi có lỗi xảy ra trong quá trình check permission
if (this.config.failClosed) {
  return { allowed: false, reason: 'Enforcement failed' };
}
```

### 2.3. Multi-Tenant Isolation

```
Workspace A (ws:uuid-a)          Workspace B (ws:uuid-b)
┌──────────────────────┐        ┌──────────────────────┐
│ Policies:            │        │ Policies:            │
│ - role:admin, dom:A  │        │ - role:admin, dom:B  │
│ - user:1, dom:A      │        │ - user:2, dom:B      │
│                      │        │                      │
│ Enforcer Cache: A    │        │ Enforcer Cache: B    │
└──────────────────────┘        └──────────────────────┘
         │                               │
         └───────────┬───────────────────┘
                     ▼
        Cross-tenant access: BLOCKED
```

---

## 3. Cấu trúc thư mục

```
casbin/
├── adapters/                    # Database adapters
│   └── twenty-typeorm.adapter.ts
├── config/                      # Configurations
│   ├── cache-warmer.config.ts
│   ├── enforcer.config.ts
│   └── sync.config.ts
├── constants/                   # Constants
│   ├── enforcer.constants.ts
│   ├── metrics.constants.ts
│   └── policy-version.constants.ts
├── decorators/                  # NestJS decorators
│   └── require-permission.decorator.ts
├── entities/                    # TypeORM entities
│   └── casbin-rule.entity.ts
├── errors/                      # Custom errors
│   └── permission-denied.error.ts
├── guards/                      # Authorization guards
│   ├── casbin-authz.guard.ts
│   └── dual-path-authz.guard.ts
├── health/                      # Health indicators
│   └── rbac-health.indicator.ts
├── models/                      # Casbin model configs
│   ├── rbac-domains.conf
│   └── abac-hybrid.conf
├── repositories/                # Data access
│   ├── casbin-rule.repository.ts
│   └── policy-version.repository.ts
├── services/                    # Business logic
│   ├── casbin-enforcer.service.ts
│   ├── policy-sync.service.ts
│   ├── rbac-metrics.service.ts
│   └── cache-warmer.service.ts
├── types/                       # TypeScript types
│   ├── casbin.types.ts
│   ├── policy-sync.types.ts
│   └── rbac-config.types.ts
├── validators/                  # Validators
│   └── policy.validator.ts
├── watchers/                    # Real-time sync
│   └── pg-notify.watcher.ts
├── casbin.module.ts             # Main module
└── index.ts                     # Exports
```

---

## 4. Các thành phần chính

### 4.1. CasbinEnforcerService

**Chức năng:** Core service quản lý Casbin enforcers

```typescript
// Check single permission
const result = await enforcerService.checkPermission({
  userId: 'user-uuid',
  workspaceId: 'workspace-uuid',
  resource: 'mktCustomer',
  action: 'read',
});

// Check batch permissions
const batchResult = await enforcerService.checkPermissionBatch({
  userId: 'user-uuid',
  workspaceId: 'workspace-uuid',
  checks: [
    { resource: 'mktCustomer', action: 'read' },
    { resource: 'mktOrder', action: 'write' },
  ],
});

// Check role
const hasRole = await enforcerService.hasRole(userId, workspaceId, 'admin');

// Get user roles
const roles = await enforcerService.getUserRoles(userId, workspaceId);
```

### 4.2. PolicySyncService

**Chức năng:** Đồng bộ Permission Templates sang Casbin policies

```typescript
// Manual sync
const result = await policySyncService.syncWorkspace(workspaceId);

// Dry-run (preview changes)
const preview = await policySyncService.manualSync(workspaceId, { dryRun: true });

// Sync with retry
const result = await policySyncService.syncWithRetry(workspaceId, 3);

// Get sync status
const status = await policySyncService.getSyncStatus(workspaceId);
```

### 4.3. TwentyTypeORMAdapter

**Chức năng:** Custom adapter cho multi-tenant

```typescript
// Tự động filter theo workspace
const adapter = await TwentyTypeORMAdapter.newAdapter(dataSource, {
  workspaceId: 'workspace-uuid',
});

// Load policies (filtered by workspace)
await adapter.loadPolicy(model);

// Security: Cross-tenant blocked
adapter.validateDomain(rule); // Throws if domain mismatch
```

### 4.4. PgNotifyWatcher

**Chức năng:** Real-time sync qua PostgreSQL NOTIFY

```typescript
// Initialize watcher
const watcher = new PgNotifyWatcher(connectionString, {
  channel: 'casbin_policy_update',
  maxReconnectAttempts: 5,
});

// Set callback
watcher.setUpdateCallback(() => {
  enforcerService.handlePolicyUpdate();
});

// Notify other instances
await watcher.update();
```

### 4.5. @RequirePermission Decorator

```typescript
@Resolver()
export class MktCustomerResolver {
  @Query(() => [MktCustomer])
  @RequirePermission('mktCustomer', 'read')
  async customers(): Promise<MktCustomer[]> {
    // Only executed if user has permission
  }

  @Mutation(() => MktCustomer)
  @RequirePermission('mktCustomer', 'write', { auditLevel: 'high' })
  async createCustomer(): Promise<MktCustomer> {
    // With audit logging
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

// Public endpoint (skip auth)
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
       └── TwentyTypeORMAdapter.loadPolicy()
           │
           └── SELECT * FROM casbin_rule WHERE v1 = 'ws:{workspaceId}'
   ↓
7. Casbin enforce(sub, dom, obj, act)
   ↓
8. Matcher evaluation
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
4. Debounce (500ms)
   ↓
5. Acquire sync lock
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
9. CasbinRuleRepository.bulkReplace() (atomic)
   ↓
10. Update policy version
   ↓
11. Invalidate enforcer cache
   ↓
12. PgNotifyWatcher.update() → NOTIFY
   ↓
13. Other instances receive → Clear cache
```

### 5.3. Real-time Sync Flow

```
┌──────────────────┐    NOTIFY     ┌──────────────────┐
│   Instance A     │──────────────→│   Instance B     │
│ Policy Updated   │               │ Receive NOTIFY   │
└──────────────────┘               └────────┬─────────┘
                                            │
                                            ▼
                                   Clear enforcer cache
                                            │
                                            ▼
                                   Next check loads fresh policies
```

---

## 6. Hướng dẫn triển khai

### 6.1. Prerequisites

```bash
# Install dependencies
yarn add casbin
yarn add @nestjs/terminus  # Health checks
```

### 6.2. Environment Variables

```env
# PostgreSQL connection for watcher
PG_DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Cache warming
RBAC_CACHE_WARM_ENABLED=true
RBAC_CACHE_WARM_ON_STARTUP=true
```

### 6.3. Module Import

```typescript
// app.module.ts
import { CasbinModule } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin';

@Module({
  imports: [
    CasbinModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 6.4. Database Migration

```sql
-- Create casbin_rule table
CREATE TABLE casbin_rule (
  id SERIAL PRIMARY KEY,
  ptype VARCHAR(10) NOT NULL,
  v0 VARCHAR(255) DEFAULT '',
  v1 VARCHAR(255) DEFAULT '',
  v2 VARCHAR(255) DEFAULT '',
  v3 VARCHAR(255) DEFAULT '',
  v4 VARCHAR(255) DEFAULT '',
  v5 VARCHAR(255) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_casbin_rule_ptype ON casbin_rule(ptype);
CREATE INDEX idx_casbin_rule_v0 ON casbin_rule(v0);
CREATE INDEX idx_casbin_rule_v1 ON casbin_rule(v1);
CREATE INDEX idx_casbin_rule_ptype_v0_v1 ON casbin_rule(ptype, v0, v1);

-- Create NOTIFY trigger
CREATE OR REPLACE FUNCTION notify_casbin_policy_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('casbin_policy_update', 'policy_updated');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER casbin_rule_notify
AFTER INSERT OR UPDATE OR DELETE ON casbin_rule
FOR EACH STATEMENT
EXECUTE FUNCTION notify_casbin_policy_update();
```

### 6.5. Tạo Policies

```typescript
// Using CasbinRuleRepository
const repository = inject(CasbinRuleRepository);

// Add permission policy
await repository.addRule('p', [
  'role:admin',           // subject
  'ws:workspace-uuid',    // domain
  'mktCustomer',          // object
  '*',                    // action
  'allow',                // effect
], workspaceId);

// Add role assignment
await repository.addRule('g', [
  'user:user-uuid',       // subject
  'role:admin',           // role
  'ws:workspace-uuid',    // domain
], workspaceId);
```

### 6.6. Sử dụng trong Resolver

```typescript
@Resolver(() => MktCustomer)
export class MktCustomerResolver {
  constructor(
    private readonly customerService: MktCustomerService,
  ) {}

  @Query(() => [MktCustomer])
  @RequirePermission('mktCustomer', 'read')
  async mktCustomers(
    @Args('workspaceId') workspaceId: string,
  ): Promise<MktCustomer[]> {
    return this.customerService.findAll(workspaceId);
  }

  @Mutation(() => MktCustomer)
  @RequirePermission('mktCustomer', 'write')
  async createMktCustomer(
    @Args('input') input: CreateCustomerInput,
  ): Promise<MktCustomer> {
    return this.customerService.create(input);
  }

  @Mutation(() => Boolean)
  @RequirePermission('mktCustomer', 'delete')
  async deleteMktCustomer(
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.customerService.delete(id);
  }
}
```

### 6.7. Manual Permission Check

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly enforcerService: CasbinEnforcerService,
  ) {}

  async processOrder(orderId: string, userId: string, workspaceId: string) {
    // Check permission manually
    const canProcess = await this.enforcerService.checkPermission({
      userId,
      workspaceId,
      resource: 'mktOrder',
      action: 'process',
    });

    if (!canProcess.allowed) {
      throw new ForbiddenException(canProcess.reason);
    }

    // Process order...
  }
}
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
| `invalidateCache` | `workspaceId` | `void` | Invalidate cache |
| `invalidateAllCaches` | - | `void` | Invalidate all caches |
| `getStats` | - | `object` | Get enforcer stats |

### 7.2. PolicySyncService

| Method | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `syncWorkspace` | `workspaceId` | `SyncResult` | Sync workspace |
| `syncWithRetry` | `workspaceId, maxRetries` | `SyncResult` | Sync with retry |
| `manualSync` | `workspaceId, options` | `ManualSyncResult` | Manual/dry-run sync |
| `dryRunSync` | `workspaceId` | `ManualSyncResult` | Preview changes |
| `syncAllWorkspaces` | - | `Map<string, SyncResult>` | Sync all workspaces |
| `getSyncStatus` | `workspaceId` | `object` | Get sync status |

### 7.3. CasbinRuleRepository

| Method | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `findByWorkspace` | `workspaceId` | `CasbinRuleRow[]` | Find all rules |
| `findPermissionPolicies` | `workspaceId` | `CasbinRuleRow[]` | Find p policies |
| `findRoleAssignments` | `workspaceId` | `CasbinRuleRow[]` | Find g policies |
| `findByUser` | `userId, workspaceId` | `CasbinRuleRow[]` | Find by user |
| `findByRole` | `roleName, workspaceId` | `CasbinRuleRow[]` | Find by role |
| `addRule` | `ptype, rule, workspaceId` | `CasbinRuleRow` | Add rule |
| `removeRule` | `ptype, rule, workspaceId` | `boolean` | Remove rule |
| `bulkReplace` | `rules, workspaceId` | `number` | Atomic replace |
| `getStatistics` | `workspaceId` | `PolicyStatistics` | Get stats |

---

## 8. Best Practices

### 8.1. Performance

1. **Use batch permission checks** khi cần check nhiều permissions
2. **Enable cache warming** để pre-load enforcers
3. **Set appropriate TTL** cho enforcer cache (default: 1 hour)
4. **Monitor metrics** để detect slow permission checks

### 8.2. Security

1. **Luôn sử dụng @RequirePermission** cho endpoints cần bảo vệ
2. **Validate input** trước khi tạo policies
3. **Review policies** định kỳ
4. **Monitor dead letter queue** cho failed syncs
5. **Enable audit logging** cho sensitive operations

### 8.3. Troubleshooting

**Permission denied unexpectedly:**
```typescript
// Check policies
const rules = await casbinRuleRepository.findByUser(userId, workspaceId);
console.log('User policies:', rules);

// Check roles
const roles = await enforcerService.getUserRoles(userId, workspaceId);
console.log('User roles:', roles);
```

**Sync not working:**
```typescript
// Check sync status
const status = await policySyncService.getSyncStatus(workspaceId);
console.log('Sync status:', status);

// Force sync
await policySyncService.manualSync(workspaceId);
```

**Cache issues:**
```typescript
// Invalidate cache
await enforcerService.invalidateCache(workspaceId);

// Or invalidate all
await enforcerService.invalidateAllCaches();
```

### 8.4. Testing

```typescript
describe('Permission Check', () => {
  it('should allow admin to read customers', async () => {
    // Setup: Add admin role to user
    await casbinRuleRepository.addRule('g', [
      'user:test-user',
      'role:admin',
      'ws:test-workspace',
    ], 'test-workspace');

    // Test
    const result = await enforcerService.checkPermission({
      userId: 'test-user',
      workspaceId: 'test-workspace',
      resource: 'mktCustomer',
      action: 'read',
    });

    expect(result.allowed).toBe(true);
  });
});
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial Casbin RBAC implementation |
| 1.1.0 | 2025-01 | Add PgNotifyWatcher for real-time sync |
| 1.2.0 | 2025-01 | Add metrics and health monitoring |

---

## References

- [Casbin Documentation](https://casbin.org/docs/overview)
- [Casbin Node.js](https://github.com/casbin/node-casbin)
- [RBAC with Domains](https://casbin.org/docs/rbac-with-domains)
