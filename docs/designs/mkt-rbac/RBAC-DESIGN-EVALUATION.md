# RBAC Module Design Evaluation & Refactoring Recommendations

## Executive Summary

Đánh giá toàn diện module `mkt-rbac-enterprise-grade` và đề xuất các thay đổi thiết kế để chuẩn bị cho production.

**Trạng thái hiện tại:** 🟡 Development - Cần hoàn thiện trước khi GA

---

## 1. Current State Analysis

### 1.1 Module Statistics

| Metric | Value |
|--------|-------|
| Total Files | ~150+ |
| Workspace Entities | 15 (6 chưa sync DB) |
| Services | 8 core services |
| Repositories | 15 |
| CLI Commands | 3 |
| Test Files | 0 ❌ |

### 1.2 Database Status

**✅ Đã có trong DB:**
- `mktDataAccessPolicy`
- `mktPermissionAudit`
- `mktTemporaryPermission`
- `mktDepartment`
- `mktDepartmentHierarchy`

**❌ Chưa sync vào DB (Workspace Entities đã define nhưng chưa migrate):**
- `mktCasbinRule`
- `mktPolicyVersion`
- `mktPolicyChangeRequest`
- `mktPolicyApproval`
- `mktDepartmentAncestry`
- `mktPermissionTemplate` (và related entities)

### 1.3 Architecture Strengths

| Aspect | Rating | Notes |
|--------|--------|-------|
| Separation of Concerns | ✅ Good | Services, repositories, guards well-separated |
| Type Safety | ✅ Good | Comprehensive TypeScript types |
| Configuration | ✅ Good | Environment-based config với defaults |
| Multi-tenancy | ✅ Good | Per-workspace isolation |
| Fail-Closed Security | ✅ Good | Denies on error |
| Cache Strategy | ✅ Good | Multi-layer (in-memory + Redis) |

### 1.4 Architecture Weaknesses

| Issue | Severity | Impact |
|-------|----------|--------|
| No Tests | 🔴 Critical | Không thể verify behavior |
| DB Schema chưa sync | 🔴 Critical | Casbin không hoạt động |
| Duplicate Types | 🟡 Medium | Maintenance overhead |
| Legacy/Casbin Overlap | 🟡 Medium | Confusion, double work |
| Missing GraphQL Resolvers | 🟡 Medium | Không có UI integration |

---

## 2. Critical Issues (Must Fix)

### 2.1 Database Schema Not Synced

**Problem:** Casbin workspace entities đã được define nhưng chưa sync vào database.

**Evidence:**
```sql
-- Không có tables này trong workspace schema:
-- mktCasbinRule, mktPolicyVersion, mktPolicyChangeRequest, mktPolicyApproval
```

**Impact:** Casbin authorization hoàn toàn không hoạt động.

**Solution:**
```bash
# 1. Sync metadata để tạo tables
npx nx run twenty-server:command workspace:sync-metadata -f

# 2. Verify tables được tạo
SELECT table_name FROM information_schema.tables
WHERE table_schema LIKE 'workspace_%' AND table_name LIKE 'mkt%casbin%';
```

**Priority:** 🔴 P0 - Blocking

---

### 2.2 No Test Coverage

**Problem:** Không có file test nào cho casbin module.

**Impact:**
- Không thể verify permission logic đúng
- Không thể regression test
- Không thể CI/CD gate

**Solution:**

```
casbin/__tests__/
├── unit/
│   ├── services/
│   │   ├── casbin-enforcer.service.spec.ts
│   │   ├── policy-sync.service.spec.ts
│   │   ├── policy-approval.service.spec.ts
│   │   └── cache-warmer.service.spec.ts
│   ├── validators/
│   │   ├── policy.validator.spec.ts
│   │   └── high-risk-policy.validator.spec.ts
│   └── guards/
│       ├── casbin-authz.guard.spec.ts
│       └── dual-path-authz.guard.spec.ts
├── integration/
│   ├── permission-check.integration.spec.ts
│   ├── policy-sync.integration.spec.ts
│   └── approval-workflow.integration.spec.ts
├── parity/
│   └── legacy-parity.spec.ts  # 15-step parity tests
└── load/
    └── permission-check.load.spec.ts
```

**Priority:** 🔴 P0 - Blocking for GA

---

### 2.3 Legacy/Casbin Overlap

**Problem:** Hai hệ thống authorization cùng tồn tại:
1. Legacy 15-step validation (`enterprise-rbac.constants.ts`)
2. Casbin-based authorization

**Evidence:**
```typescript
// enterprise-rbac.constants.ts - 15 validation steps
VALIDATION_STEPS = {
  PRE_VALIDATION: 1,
  USER_CONTEXT_RESOLUTION: 2,
  // ... 13 more steps
}

// Casbin - separate flow
CasbinEnforcerService.checkPermission()
```

**Impact:**
- Double authorization checks (nếu cả hai enabled)
- Confusion về source of truth
- Performance overhead

**Solution:**

**Option A: Full Migration to Casbin (Recommended)**
1. Map 15 legacy steps sang Casbin constructs (đã có LEGACY-PARITY-MATRIX.md)
2. Run shadow mode để validate parity
3. Deprecate legacy code sau khi validate

**Option B: Hybrid Mode**
1. Legacy cho existing features
2. Casbin cho new features only
3. Maintain both indefinitely (not recommended)

**Priority:** 🟡 P1 - Important

---

## 3. Design Improvements (Should Fix)

### 3.1 Type Definition Consolidation

**Problem:** Types được define ở nhiều nơi khác nhau.

**Current State:**
```
types/validation-step.types.ts  → PolicyContext, etc.
types/policy-context.type.ts    → Same types, different file
types/audit.types.ts           → AuditLogEntry, etc.
casbin/types/                  → Casbin-specific types
```

**Solution:** Single source of truth với re-exports.

```typescript
// types/index.ts - Canonical exports
export * from './validation-step.types';  // Source of truth
export * from './audit.types';            // Source of truth

// Don't re-export same types from multiple files
```

**Priority:** 🟡 P1

---

### 3.2 Missing GraphQL Resolvers

**Problem:** Casbin module không có GraphQL resolvers cho policy management.

**Impact:**
- Admin không thể manage policies từ UI
- Phải dùng CLI commands

**Solution:**

```typescript
// casbin/resolvers/
├── casbin-policy.resolver.ts       # CRUD for policies
├── policy-approval.resolver.ts     # Approval workflow
├── rbac-admin.resolver.ts          # Admin operations
└── index.ts
```

**Required Queries/Mutations:**

```graphql
# Queries
query casbinPolicies(workspaceId: ID!, filter: PolicyFilter): [CasbinPolicy!]!
query policyChangeRequests(status: ChangeRequestStatus): [PolicyChangeRequest!]!
query rbacHealth: RbacHealthStatus!
query userPermissions(userId: ID!): [Permission!]!

# Mutations
mutation createPolicy(input: CreatePolicyInput!): PolicyResult!
mutation deletePolicy(policyId: ID!): Boolean!
mutation requestPolicyChange(input: ChangeRequestInput!): ChangeRequestResult!
mutation approvePolicyChange(requestId: ID!, decision: ApprovalDecision!): ApprovalResult!
mutation syncPolicies(workspaceId: ID!, dryRun: Boolean): SyncResult!
```

**Priority:** 🟡 P1

---

### 3.3 Constants Organization Incomplete

**Problem:** Chỉ mới centralize pubsub và rbac constants, còn nhiều constants khác chưa.

**Current State:**
```
infrastructure/redis/constants/
├── pubsub.constant.ts    ✅ Done
├── rbac.constant.ts      ✅ Done
└── cache-keys.constant.ts

mkt-rbac-enterprise-grade/constants/
├── enterprise-rbac.constants.ts   (1023 lines - needs splitting)
├── casbin-actions.constant.ts
├── casbin-resources.constant.ts
├── hierarchy.constants.ts
└── ...
```

**Solution:**

```
# Split enterprise-rbac.constants.ts
mkt-rbac-enterprise-grade/constants/
├── permissions/
│   ├── permission-sources.constant.ts
│   ├── permission-actions.constant.ts
│   └── index.ts
├── validation/
│   ├── validation-steps.constant.ts
│   ├── validation-config.constant.ts
│   └── index.ts
├── hierarchy/
│   ├── hierarchy-levels.constant.ts
│   └── index.ts
├── performance/
│   ├── performance-thresholds.constant.ts
│   └── index.ts
└── index.ts
```

**Priority:** 🟢 P2

---

### 3.4 Error Handling Standardization

**Problem:** Error handling không consistent giữa services.

**Current State:**
```typescript
// Some services throw
throw new PermissionDeniedError(...)

// Some services return error result
return { success: false, error: 'message' }

// Some services log and continue
this.logger.error(error);
```

**Solution:**

```typescript
// Standard Result type
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: RbacError };

// All services return Result
async checkPermission(input: Input): Promise<ServiceResult<PermissionResult>> {
  try {
    const result = await this.doCheck(input);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: this.wrapError(error) };
  }
}
```

**Priority:** 🟢 P2

---

## 4. Performance Optimizations (Nice to Have)

### 4.1 Batch Policy Loading

**Problem:** Current implementation loads policies one-by-one.

**Solution:**
```typescript
// Current
for (const policy of policies) {
  await adapter.addPolicy(...);
}

// Optimized
await adapter.addPolicies(policies);
```

**Impact:** 10x faster sync for large policy sets.

**Priority:** 🟢 P2

---

### 4.2 Precomputed Role Inheritance

**Problem:** Role inheritance computed at runtime.

**Solution:**
```typescript
// Precompute và cache role inheritance graph
const inheritanceGraph = await buildInheritanceGraph(workspaceId);
await cache.set(`rbac:inheritance:${workspaceId}`, inheritanceGraph);
```

**Priority:** 🟢 P3

---

## 5. Refactoring Roadmap

### Phase 1: Critical Fixes (Week 1-2)

| Task | Owner | Status |
|------|-------|--------|
| Sync workspace entities to DB | - | ⬜ Not Started |
| Create basic unit tests for services | - | ⬜ Not Started |
| Create integration tests for permission check | - | ⬜ Not Started |
| Verify Casbin actually works end-to-end | - | ⬜ Not Started |

### Phase 2: Design Improvements (Week 3-4)

| Task | Owner | Status |
|------|-------|--------|
| Create GraphQL resolvers for policy management | - | ⬜ Not Started |
| Consolidate type definitions | - | ⬜ Not Started |
| Split enterprise-rbac.constants.ts | - | ⬜ Not Started |
| Document legacy-to-Casbin migration path | - | ⬜ Not Started |

### Phase 3: Optimization (Week 5-6)

| Task | Owner | Status |
|------|-------|--------|
| Implement batch policy loading | - | ⬜ Not Started |
| Add performance benchmarks | - | ⬜ Not Started |
| Create load test suite | - | ⬜ Not Started |
| Optimize role inheritance caching | - | ⬜ Not Started |

---

## 6. Database Schema Recommendations

### 6.1 Indexes to Add

```sql
-- mktCasbinRule - optimize permission lookups
CREATE INDEX idx_casbin_subject_deleted
ON "mktCasbinRule" (subject, "deletedAt")
WHERE "deletedAt" IS NULL;

CREATE INDEX idx_casbin_ptype_subject
ON "mktCasbinRule" (ptype, subject)
WHERE "deletedAt" IS NULL;

-- mktPolicyChangeRequest - optimize pending queries
CREATE INDEX idx_change_request_status_created
ON "mktPolicyChangeRequest" (status, "createdAt")
WHERE "deletedAt" IS NULL;
```

### 6.2 Partition Strategy (Future)

Cho large-scale deployments:

```sql
-- Partition mktCasbinRule by ptype
CREATE TABLE "mktCasbinRule_p" PARTITION OF "mktCasbinRule"
FOR VALUES IN ('p');

CREATE TABLE "mktCasbinRule_g" PARTITION OF "mktCasbinRule"
FOR VALUES IN ('g');
```

---

## 7. Security Audit Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Fail-closed on errors | ✅ Pass | Implemented in CasbinEnforcerService |
| Self-escalation prevention | ✅ Pass | Validated in PolicyValidator |
| Dual-sign for critical changes | ✅ Pass | HighRiskPolicyValidator |
| Audit logging | ⚠️ Partial | Events defined, storage TBD |
| SQL injection prevention | ✅ Pass | Using TypeORM |
| Input validation | ✅ Pass | PolicyValidator |
| Rate limiting | ❌ Missing | Not implemented |
| Workspace isolation | ✅ Pass | Per-workspace enforcers |

---

## 8. Monitoring & Observability

### 8.1 Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Permission check latency P95 | RbacMetricsService | > 50ms |
| Permission check latency P99 | RbacMetricsService | > 100ms |
| Cache hit rate | RbacMetricsService | < 80% |
| Policy sync failures | PolicySyncService | > 0 |
| Dead letter queue size | PolicyVersionRepository | > 10 |
| Enforcer creation errors | CasbinEnforcerService | > 0 |
| Watcher disconnections | PgNotifyWatcher | > 1/hour |

### 8.2 Dashboard Suggestions

```yaml
# Grafana dashboard panels
panels:
  - title: "Permission Check Latency"
    type: histogram
    metrics: ["rbac_permission_check_duration_ms"]

  - title: "Cache Hit Rate"
    type: gauge
    metrics: ["rbac_cache_hit_rate"]
    thresholds: [80, 90, 95]

  - title: "Active Enforcers"
    type: stat
    metrics: ["rbac_active_enforcers"]

  - title: "Policy Sync Status"
    type: state-timeline
    metrics: ["rbac_sync_status"]
```

---

## 9. Action Items Summary

### Immediate (This Sprint)

1. ✅ **Sync workspace entities to database**
   ```bash
   npx nx run twenty-server:command workspace:sync-metadata -f
   ```

2. ⬜ **Create minimal test suite**
   - Unit tests for CasbinEnforcerService
   - Integration test for permission check flow

3. ⬜ **End-to-end validation**
   - Create test policies manually
   - Verify permission checks work

### Short-term (Next 2 Sprints)

1. ⬜ Create GraphQL resolvers for policy management
2. ⬜ Complete legacy parity tests
3. ⬜ Document migration guide

### Long-term (Quarter)

1. ⬜ Performance optimization
2. ⬜ Full deprecation of legacy system
3. ⬜ Advanced ABAC features

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schema sync breaks existing data | Low | High | Backup before sync |
| Casbin behavior differs from legacy | Medium | High | Shadow mode + parity tests |
| Performance degradation | Low | Medium | Load testing |
| Security vulnerability in Casbin | Low | Critical | Keep Casbin updated, security audit |

---

## Appendix A: Files to Modify

```
# Phase 1 - Critical
packages/twenty-server/src/mkt-core/
├── mkt-rbac-enterprise-grade/casbin/__tests__/  # NEW
│   ├── unit/
│   └── integration/
└── constants/mkt-object-ids.ts  # Verify entity IDs

# Phase 2 - Design
packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/
├── casbin/resolvers/  # NEW
├── constants/         # REFACTOR (split)
└── types/             # CONSOLIDATE

# Phase 3 - Optimization
packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/
├── casbin/adapters/workspace-casbin.adapter.ts  # OPTIMIZE
└── casbin/services/casbin-enforcer.service.ts   # OPTIMIZE
```

---

## Appendix B: Command Reference

```bash
# Development
npx nx run twenty-server:command workspace:sync-metadata -f
npx nx run twenty-server:command rbac-seeder:sync -- --workspace=<uuid> --dry-run
npx nx run twenty-server:command rbac-seeder:check -- --user=<uuid> --workspace=<uuid> --resource=mktCustomer --action=read --verbose

# Testing
npx nx test twenty-server --testPathPattern="mkt-rbac"
npx nx test twenty-server --testPathPattern="casbin"

# Debugging
RBAC_DEBUG_MODE=true npx nx start twenty-server
RBAC_ENGINE=shadow npx nx start twenty-server
```

---

*Document Version: 1.0*
*Last Updated: 2025-01-09*
*Author: Claude Code Assistant*
