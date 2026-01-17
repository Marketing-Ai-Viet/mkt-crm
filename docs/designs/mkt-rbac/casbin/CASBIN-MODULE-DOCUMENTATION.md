# Casbin RBAC Module Documentation

## Overview

Module Casbin RBAC cung cấp hệ thống phân quyền enterprise-grade cho Twenty CRM, sử dụng [Casbin](https://casbin.org/) làm authorization engine với hỗ trợ:

- **RBAC**: Role-Based Access Control với role inheritance
- **ABAC**: Attribute-Based Access Control với dynamic conditions
- **Multi-tenant**: Workspace isolation với per-workspace enforcer
- **High Availability**: Cross-region invalidation, cache warming, fail-closed security

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GraphQL Request                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     @RequirePermission Decorator                             │
│                                                                              │
│  @Query(() => [MktCustomer])                                                │
│  @RequirePermission('mktCustomer', 'read')                                  │
│  async customers() { ... }                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CasbinAuthzGuard                                  │
│                                                                              │
│  - Extract user context từ request                                          │
│  - Gọi CasbinEnforcerService.checkPermission()                             │
│  - Throw PermissionDeniedError nếu bị denied                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CasbinEnforcerService                               │
│                                                                              │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐               │
│  │  In-Memory    │◄───│   Enforcer    │◄───│ PG NOTIFY     │               │
│  │  Cache (LRU)  │    │   Factory     │    │ Watcher       │               │
│  └───────────────┘    └───────────────┘    └───────────────┘               │
│                              │                                              │
│                              ▼                                              │
│                    ┌───────────────────┐                                   │
│                    │ WorkspaceCasbin   │                                   │
│                    │ Adapter           │                                   │
│                    └───────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Database (PostgreSQL)                              │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │ mktCasbinRule   │  │ mktPolicyVersion│  │ mktPolicyChange │            │
│  │                 │  │                 │  │ Request         │            │
│  │ - ptype (p/g)   │  │ - version       │  │                 │            │
│  │ - subject       │  │ - policyHash    │  │ - status        │            │
│  │ - object        │  │ - policyCount   │  │ - riskAssess    │            │
│  │ - action        │  │ - syncedAt      │  │ - approvals     │            │
│  │ - effect        │  │                 │  │                 │            │
│  │ - condition     │  │                 │  │                 │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
casbin/
├── adapters/                    # Database adapters cho Casbin
│   ├── workspace-casbin.adapter.ts
│   └── index.ts
│
├── config/                      # Configuration management
│   ├── rbac.config.ts           # NestJS ConfigModule registration
│   ├── rbac-config.defaults.ts  # Default values
│   ├── rbac-config.types.ts     # Config type definitions
│   └── index.ts
│
├── constants/                   # Constants và enums
│   ├── enforcer.constants.ts    # Casbin model definition
│   ├── metrics.constants.ts     # Metrics config (re-export)
│   ├── policy-version.constants.ts
│   └── index.ts
│
├── decorators/                  # NestJS decorators
│   ├── require-permission.decorator.ts
│   └── index.ts
│
├── entities/                    # Workspace entities (ORM)
│   ├── mkt-casbin-rule.workspace-entity.ts
│   ├── mkt-policy-version.workspace-entity.ts
│   ├── mkt-policy-change-request.workspace-entity.ts
│   ├── mkt-policy-approval.workspace-entity.ts
│   └── index.ts
│
├── errors/                      # Error classes
│   ├── permission-denied.error.ts
│   └── index.ts
│
├── guards/                      # Authorization guards
│   ├── casbin-authz.guard.ts
│   └── index.ts
│
├── health/                      # Health indicators
│   ├── rbac-health.indicator.ts
│   └── index.ts
│
├── jobs/                        # Scheduled jobs (cron)
│   ├── cache-warmer.job.ts
│   ├── cross-region-reload.job.ts
│   └── index.ts
│
├── pubsub/                      # Cross-region invalidation
│   ├── cross-region-invalidation.pubsub.ts
│   ├── constants/
│   ├── types/
│   └── index.ts
│
├── repositories/                # Data access layer
│   ├── workspace-casbin-rule.repository.ts
│   ├── policy-version.repository.ts
│   ├── policy-change-request.repository.ts
│   ├── policy-approval.repository.ts
│   └── index.ts
│
├── services/                    # Business logic
│   ├── casbin-enforcer.service.ts    # Core enforcer management
│   ├── policy-sync.service.ts        # Sync từ templates
│   ├── cache-warmer.service.ts       # Cache warming
│   ├── rbac-metrics.service.ts       # Metrics collection
│   ├── policy-approval.service.ts    # Approval workflow
│   └── index.ts
│
├── types/                       # TypeScript types
│   ├── casbin.types.ts          # Core Casbin types
│   ├── policy-sync.types.ts     # Sync types
│   ├── policy-change-request.types.ts
│   ├── rbac-config.types.ts
│   └── index.ts
│
├── validators/                  # Policy validators
│   ├── policy.validator.ts           # Format validation
│   ├── high-risk-policy.validator.ts # Risk assessment
│   └── index.ts
│
├── watchers/                    # Database watchers
│   ├── pg-notify.watcher.ts     # PostgreSQL NOTIFY
│   └── index.ts
│
├── casbin.module.ts             # Module definition
└── index.ts                     # Exports
```

---

## Core Components

### 1. Entities (Workspace Entities)

#### MktCasbinRuleWorkspaceEntity

Lưu trữ Casbin policy rules trong workspace schema.

| Field | Type | Description |
|-------|------|-------------|
| `ptype` | TEXT | Policy type: 'p' (permission), 'g' (role), 'g2' (resource group) |
| `subject` | TEXT | User ID hoặc role name (user:uuid, role:name) |
| `object` | TEXT | Resource identifier |
| `action` | TEXT | Action: read, write, delete, * |
| `effect` | TEXT | allow hoặc deny |
| `condition` | TEXT | ABAC condition expression (optional) |

**Policy Examples:**
```
# RBAC Permission
p, role:admin, mktOrder, *, allow

# ABAC với condition
p, role:viewer, mktOrder, read, allow, "r.attr.clearance >= 2"

# Role assignment
g, user:uuid-123, role:admin

# Resource grouping
g2, mktCustomer, crm_entities
```

#### MktPolicyVersionWorkspaceEntity

Track policy sync versions cho cache invalidation.

| Field | Type | Description |
|-------|------|-------------|
| `version` | NUMBER | Policy version (incremented mỗi sync) |
| `policyHash` | TEXT | SHA-256 hash của all policies |
| `policyCount` | NUMBER | Total policies |
| `syncedAt` | DATETIME | Last sync timestamp |

#### MktPolicyChangeRequestWorkspaceEntity

High-risk policy change requests với approval workflow.

| Field | Type | Description |
|-------|------|-------------|
| `status` | SELECT | PENDING, APPROVED, REJECTED, APPLIED, EXPIRED |
| `changeType` | SELECT | CREATE, UPDATE, DELETE |
| `policyData` | JSON | Policy data |
| `riskAssessment` | JSON | Risk assessment result |
| `requiredApprovals` | NUMBER | Required approvals (1 or 2) |
| `currentApprovals` | NUMBER | Current approvals count |
| `requestedById` | UUID | Requester |

#### MktPolicyApprovalWorkspaceEntity

Individual approvals cho change requests.

| Field | Type | Description |
|-------|------|-------------|
| `decision` | SELECT | APPROVED, REJECTED |
| `reason` | TEXT | Approval/rejection reason |
| `changeRequestId` | UUID | Related change request |
| `approverId` | UUID | Approver |

---

### 2. Services

#### CasbinEnforcerService (Core)

Main entry point cho permission checks.

```typescript
// Check single permission
const result = await enforcerService.checkPermission({
  userId: 'user-uuid',
  workspaceId: 'workspace-uuid',
  resource: 'mktCustomer',
  action: 'read',
  attributes: { clearance: 3 }, // Optional ABAC attributes
});

// Batch check permissions
const batchResult = await enforcerService.batchCheckPermission({
  userId: 'user-uuid',
  workspaceId: 'workspace-uuid',
  checks: [
    { resource: 'mktCustomer', action: 'read' },
    { resource: 'mktOrder', action: 'create' },
  ],
});

// Get user roles
const roles = await enforcerService.getUserRoles(userId, workspaceId);

// Get enforcer stats
const stats = enforcerService.getStats();
// { cachedEnforcers: 15, watcherConnected: true }
```

**Features:**
- Per-workspace enforcer isolation
- In-memory LRU cache
- Fail-closed security (deny nếu có error)
- Auto-reload via PG NOTIFY watcher

#### PolicySyncService

Sync policies từ Permission Templates sang Casbin rules.

```typescript
// Manual sync
const result = await policySyncService.manualSync(workspaceId, {
  dryRun: false, // true để preview changes
  force: false,  // true để bypass hash check
});

// Result structure
{
  status: 'success' | 'skipped' | 'failed',
  policiesAdded: 10,
  policiesRemoved: 2,
  latencyMs: 150,
  version: 5,
}
```

**Sync Flow:**
1. Listen to `permission.changed` events
2. Debounce (100ms default)
3. Acquire distributed lock
4. Generate policies từ templates
5. Validate policies
6. Compute diff (added/removed)
7. Apply diff to database
8. Update policy version
9. Notify via PG NOTIFY

#### CacheWarmerService

Pre-load enforcer caches.

```typescript
// Warm all workspaces
await cacheWarmerService.warmAllCaches();

// Warm specific workspaces
await cacheWarmerService.warmWorkspaces(['ws-1', 'ws-2']);

// Get status
const status = cacheWarmerService.getStatus();
```

#### RbacMetricsService

Collect và analyze RBAC metrics.

```typescript
// Record check
await metricsService.recordCheck({
  workspaceId: 'ws-uuid',
  latencyMs: 5,
  allowed: true,
  cached: true,
});

// Get metrics
const metrics = await metricsService.getMetrics({
  workspaceId: 'ws-uuid', // Optional filter
  timeRangeMs: 3600000,   // Last hour
});

// Result
{
  totalChecks: 1000,
  allowedCount: 950,
  deniedCount: 50,
  avgLatencyMs: 3,
  p50LatencyMs: 2,
  p95LatencyMs: 8,
  p99LatencyMs: 15,
  cacheHitRate: 95,
}

// Get health status
const health = await metricsService.getHealth();
```

#### PolicyApprovalService

High-risk policy change approval workflow.

```typescript
// Create change request
const result = await approvalService.createChangeRequest({
  policy: { ptype: 'p', subject: 'role:admin', object: '*', action: '*', effect: 'allow' },
  changeType: 'CREATE',
  requesterId: 'user-uuid',
  requestReason: 'Need admin access for deployment',
});

// Process approval
await approvalService.processApproval({
  changeRequestId: 'request-uuid',
  approverId: 'approver-uuid',
  decision: 'APPROVED',
  reason: 'Approved for production deployment',
});
```

---

### 3. Guards

#### CasbinAuthzGuard

Main authorization guard cho GraphQL resolvers.

```typescript
@Query(() => [MktCustomer])
@UseGuards(CasbinAuthzGuard)
@RequirePermission('mktCustomer', 'read')
async customers(): Promise<MktCustomer[]> {
  // Only executed if permission granted
}
```

---

### 4. Decorators

```typescript
// Single permission
@RequirePermission('mktCustomer', 'read')

// Any of multiple permissions
@RequireAnyPermission([
  { resource: 'mktCustomer', action: 'delete' },
  { resource: 'mktCustomer', action: 'admin' },
])

// All permissions required
@RequireAllPermissions([
  { resource: 'mktReport', action: 'read' },
  { resource: 'mktReport', action: 'sensitive_data' },
])

// Public (skip authorization)
@Public()
```

---

### 5. Validators

#### PolicyValidator

Validate policy format và security.

```typescript
const validation = policyValidator.validatePolicy({
  ptype: 'p',
  subject: 'role:admin',
  object: 'mktCustomer',
  action: 'read',
  effect: 'allow',
});

if (!validation.valid) {
  console.log(validation.errors);
}
```

**Validation Rules:**
- Subject format: `^(user|role):[a-zA-Z0-9-_]+$`
- Object format: Valid resource name
- Action: Valid action from CASBIN_ACTIONS
- Self-escalation prevention

#### HighRiskPolicyValidator

Detect high-risk policies requiring approval.

```typescript
const assessment = highRiskValidator.assessPolicy(policy);

// Result
{
  isHighRisk: true,
  riskLevel: 'CRITICAL', // LOW, MEDIUM, HIGH, CRITICAL
  patterns: ['WILDCARD_ACTION', 'ADMIN_ROLE'],
  requiredApprovals: 2, // Dual-sign required
  recommendations: ['Consider narrowing scope'],
}
```

**Risk Patterns:**
| Pattern | Risk Level | Description |
|---------|-----------|-------------|
| WILDCARD_ACTION | HIGH | Policy grants all actions (*) |
| WILDCARD_RESOURCE | HIGH | Policy grants all resources (*) |
| ADMIN_ROLE | CRITICAL | Involves admin/superadmin |
| RBAC_MANAGE | CRITICAL | Full RBAC management access |

---

### 6. Watchers & Pub/Sub

#### PgNotifyWatcher

Real-time policy update via PostgreSQL NOTIFY.

```typescript
// Channel: casbin_policy_update
// Triggers enforcer reload khi có policy change
```

#### CrossRegionInvalidationPubSub

Distributed invalidation via Redis Pub/Sub.

```typescript
// Publish invalidation
await pubsub.publishInvalidation(workspaceId, 'policy_updated');

// Subscribe (automatic in service)
// Channel: rbac:policy:invalidation
```

---

### 7. Jobs (Scheduled)

| Job | Schedule | Purpose |
|-----|----------|---------|
| CacheWarmerJob | Every hour | Đảm bảo cache luôn warm |
| CrossRegionReloadJob | Every hour | Safety net cho cross-region sync |

---

## Configuration

### Environment Variables

```bash
# Enforcer
RBAC_ENFORCER_FAIL_CLOSED=true
RBAC_ENFORCER_CACHE_ENABLED=true
RBAC_ENFORCER_MAX_IN_MEMORY=100
RBAC_ENFORCER_TTL_MS=3600000

# Cache Warming
RBAC_CACHE_WARM_ENABLED=true
RBAC_CACHE_WARM_ON_STARTUP=true
RBAC_CACHE_WARM_CONCURRENCY=5
RBAC_PRIORITY_WORKSPACES=ws-1,ws-2

# Sync
RBAC_SYNC_MAX_RETRIES=3
RBAC_SYNC_RETRY_DELAY_MS=1000
RBAC_SYNC_DEBOUNCE_MS=100
RBAC_SYNC_MAX_POLICIES=10000

# Pub/Sub (Cross-region)
RBAC_MULTI_REGION_ENABLED=true
RBAC_FALLBACK_RELOAD_INTERVAL_MS=3600000
RBAC_INVALIDATION_DEBOUNCE_MS=100
```

---

## CLI Commands

```bash
# Sync policies cho workspace
npx nx run twenty-server:command rbac-seeder:sync -- --workspace=<uuid>

# Dry-run (preview changes)
npx nx run twenty-server:command rbac-seeder:sync -- --workspace=<uuid> --dry-run

# Check permission
npx nx run twenty-server:command rbac-seeder:check -- \
  --user=<uuid> --workspace=<uuid> --resource=mktCustomer --action=read

# Warm cache
npx nx run twenty-server:command rbac-seeder:warm-cache -- --all

# Show stats
npx nx run twenty-server:command rbac-seeder:warm-cache -- --stats
```

---

## Casbin Model

```ini
[request_definition]
r = sub, obj, act, attr

[policy_definition]
p = sub, obj, act, eft, condition

[role_definition]
g = _, _      # User -> Role
g2 = _, _     # Resource -> Group

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub) &&
    (g2(r.obj, p.obj) || r.obj == p.obj) &&
    (r.act == p.act || p.act == "*") &&
    (p.condition == "" || eval(p.condition))
```

---

## Health Monitoring

```typescript
// Health endpoint integration
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private rbacHealth: RbacHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.rbacHealth.isHealthy(),
    ]);
  }
}
```

**Health Response:**
```json
{
  "status": "up",
  "rbac": {
    "status": "up",
    "enforcer": { "status": "up", "cachedEnforcers": 15 },
    "watcher": { "status": "up", "connected": true },
    "cache": { "status": "up" },
    "database": { "status": "up" },
    "metrics": {
      "totalChecks": 1000,
      "avgLatencyMs": 2.5,
      "p95LatencyMs": 8.3,
      "cacheHitRate": 95
    }
  }
}
```

---

## Security Considerations

1. **Fail-Closed**: Luôn deny khi có error
2. **Self-Escalation Prevention**: Không cho user tự assign admin
3. **Dual-Sign Approval**: Critical policies cần 2 approvers
4. **Audit Trail**: 7 years retention cho SOC2
5. **Workspace Isolation**: Per-workspace enforcer
6. **Hash Verification**: SHA-256 cho policy integrity

---

## Performance Targets

| Metric | Target |
|--------|--------|
| P95 Latency | < 10ms (cached) |
| P99 Latency | < 50ms |
| Cache Hit Rate | > 85% |
| Memory Usage | < 100MB per enforcer |

---

## Integration với Permission Templates

```
MktPermissionTemplateWorkspaceEntity
    │
    │ PolicySyncService.generatePolicies()
    ▼
MktCasbinRuleWorkspaceEntity
    │
    │ WorkspaceCasbinAdapter.loadPolicy()
    ▼
Casbin Enforcer
    │
    │ enforce(sub, obj, act, attr)
    ▼
Permission Decision
```

---

## Troubleshooting

### Cache không update

```bash
# Force reload tất cả enforcers
npx nx run twenty-server:command rbac-seeder:warm-cache -- --all

# Check watcher connection
npx nx run twenty-server:command rbac-seeder:warm-cache -- --stats
```

### Permission denied bất thường

```bash
# Check permission với verbose
npx nx run twenty-server:command rbac-seeder:check -- \
  --user=<uuid> --workspace=<uuid> --resource=<resource> --action=<action> --verbose
```

### Sync failed

```bash
# Check dead letter queue
# View logs với RBAC_DEBUG_MODE=true
# Retry với force flag
npx nx run twenty-server:command rbac-seeder:sync -- --workspace=<uuid> --force
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial Casbin integration |
| 1.1.0 | 2024-02 | Add approval workflow |
| 1.2.0 | 2024-03 | Add cross-region invalidation |
| 2.0.0 | 2025-01 | Centralize constants to infrastructure |
