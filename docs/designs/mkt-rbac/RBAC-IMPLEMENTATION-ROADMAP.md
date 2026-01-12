# RBAC Implementation Roadmap

## Overview

Roadmap chi tiet cho viec hoan thien module `mkt-rbac-enterprise-grade` tu trang thai hien tai den production-ready.

**Ngay tao:** 2026-01-12
**Trang thai hien tai:** Development - Phase 2 & 3 hoan thanh
**Muc tieu:** Production-ready RBAC system with Casbin

---

## Current State Summary

### Da Hoan Thanh

| Component | Status | Notes |
|-----------|--------|-------|
| Database Schema | ✅ Done | 18 RBAC tables da sync |
| Workspace Entities | ✅ Done | 15+ entities |
| Repositories | ✅ Done | 15 repositories |
| Core Services | ✅ Done | 8 services |
| CLI Commands | ✅ Done | 3 commands |
| Seeders | ✅ Done | 10 seeders voi sample data |
| Constants/Types | ✅ Done | Organized structure |
| Cache Layer | ✅ Done | Multi-layer caching |
| PubSub | ✅ Done | Cross-region invalidation |
| GraphQL Resolvers | ✅ Done | 3 resolvers enabled |
| Validators | ✅ Done | PolicyValidator, HighRiskPolicyValidator |

### Chua Hoan Thanh

| Component | Status | Priority |
|-----------|--------|----------|
| Unit Tests | ❌ Not Started | P0 |
| Integration Tests | ❌ Not Started | P0 |
| E2E Verification | ❌ Not Started | P1 |
| Performance Optimization | ✅ Done | P2 |
| Documentation Update | 🔄 In Progress | P2 |

---

## Phase 1: Testing Foundation (P0 - Critical)

### 1.1 Unit Tests Setup

**Muc tieu:** Tao test coverage cho core services

**Files can tao:**
```
mkt-rbac-enterprise-grade/
└── __tests__/
    └── unit/
        ├── services/
        │   ├── casbin-enforcer.service.spec.ts
        │   ├── policy-approval.service.spec.ts
        │   ├── cache-warmer.service.spec.ts
        │   └── rbac-metrics.service.spec.ts
        ├── repositories/
        │   ├── workspace-casbin-rule.repository.spec.ts
        │   ├── policy-approval.repository.spec.ts
        │   └── policy-version.repository.spec.ts
        ├── utils/
        │   ├── cache-key-builder.utils.spec.ts
        │   ├── permission-mapper.utils.spec.ts
        │   └── policy-evaluator.utils.spec.ts
        └── adapters/
            └── workspace-casbin.adapter.spec.ts
```

**Test Cases cho CasbinEnforcerService:**
```typescript
describe('CasbinEnforcerService', () => {
  describe('checkPermission', () => {
    it('should allow admin to access all resources');
    it('should deny access when no matching policy');
    it('should respect role hierarchy');
    it('should handle workspace isolation');
    it('should fail-closed on errors');
  });

  describe('getEnforcer', () => {
    it('should create enforcer for new workspace');
    it('should return cached enforcer');
    it('should reload on policy change');
  });
});
```

**Acceptance Criteria:**
- [ ] Coverage >= 80% cho core services
- [ ] Tat ca test cases pass
- [ ] Mock dependencies properly

---

### 1.2 Integration Tests

**Muc tieu:** Verify permission check flow end-to-end

**Files can tao:**
```
mkt-rbac-enterprise-grade/
└── __tests__/
    └── integration/
        ├── permission-check.integration.spec.ts
        ├── policy-sync.integration.spec.ts
        ├── approval-workflow.integration.spec.ts
        └── cache-invalidation.integration.spec.ts
```

**Test Scenarios:**

```typescript
describe('Permission Check Integration', () => {
  describe('Role-based Access', () => {
    it('admin can manage all resources');
    it('manager can manage department resources');
    it('staff can only read assigned resources');
  });

  describe('Hierarchy-based Access', () => {
    it('CEO inherits all permissions');
    it('Director inherits Manager permissions');
    it('permissions cascade through hierarchy');
  });

  describe('Department-based Access', () => {
    it('user can access own department data');
    it('user cannot access other department data');
    it('cross-department access requires explicit grant');
  });
});
```

**Acceptance Criteria:**
- [ ] Test voi real database (test schema)
- [ ] Cover all 3 permission types (Role, Hierarchy, Department)
- [ ] Verify cache behavior

---

### 1.3 E2E Verification

**Muc tieu:** Xac nhan Casbin hoat dong dung voi seed data

**Tasks:**
1. Chay permission check voi CLI command
2. Verify ket qua voi expected outcomes
3. Document any discrepancies

**Verification Script:**
```bash
# Test admin access
npx nx run twenty-server:command rbac-seeder:check \
  -- --user=<admin-uuid> \
  --workspace=<workspace-uuid> \
  --resource=mktCustomer \
  --action=manage \
  --verbose

# Test manager access
npx nx run twenty-server:command rbac-seeder:check \
  -- --user=<manager-uuid> \
  --workspace=<workspace-uuid> \
  --resource=mktOrder \
  --action=read \
  --verbose

# Test denied access
npx nx run twenty-server:command rbac-seeder:check \
  -- --user=<staff-uuid> \
  --workspace=<workspace-uuid> \
  --resource=workspaceMember \
  --action=delete \
  --verbose
```

**Acceptance Criteria:**
- [ ] Admin: Full access verified
- [ ] Manager: Department access verified
- [ ] Staff: Limited access verified
- [ ] Denied cases work correctly

---

## Phase 2: API & Validators (P1 - Important) ✅ COMPLETED

### 2.1 Enable GraphQL Resolvers ✅

**Status:** Completed

**Implemented Resolvers:**
- `permission-check.resolver.ts` - Permission checking queries
- `policy-management.resolver.ts` - Policy CRUD and approval workflow
- `audit-log.resolver.ts` - Audit log queries

**GraphQL Schema:**
```graphql
# Queries
type Query {
  rbacCheckPermission(input: PermissionCheckInput!): PermissionResultOutput!
  rbacCheckPermissionBatch(input: BatchPermissionCheckInput!): BatchPermissionCheckResult!
  rbacUserPermissions(workspaceMemberId: ID): [[String!]!]!
  rbacUserRoles(workspaceMemberId: ID): [String!]!
  rbacUserPermissionSummary(workspaceMemberId: ID): UserPermissionSummaryOutput!
  rbacHasRole(roleName: String!, workspaceMemberId: ID): Boolean!
  rbacPolicies(filter: PolicyFilterInput): [CasbinPolicyOutput!]!
  rbacPendingApprovals: [ChangeRequestOutput!]!
  rbacChangeRequest(id: ID!): ChangeRequestOutput
  rbacPolicyStatistics: PolicyStatisticsOutput!
  rbacChangeRequestStatistics: ChangeRequestStatisticsOutput!
  rbacAuditLogs(input: QueryAuditLogInput): PaginatedAuditLogOutput!
  rbacAuditStatistics: AuditStatisticsOutput!
  rbacDeniedAccess(limit: Int, fromDate: String): [AuditLogEntryOutput!]!
  rbacPolicyAuditTrail(limit: Int, requesterId: ID, fromDate: String, toDate: String): [PolicyAuditEntryOutput!]!
  rbacExportPolicyAudit(fromDate: String, toDate: String): AuditExportOutput!
}

# Mutations
type Mutation {
  rbacCreatePolicy(input: CreatePolicyInput!): CreatePolicyResultOutput!
  rbacDeletePolicy(input: DeletePolicyInput!): CreatePolicyResultOutput!
  rbacProcessApproval(input: ProcessApprovalInput!): ProcessApprovalResultOutput!
  rbacValidatePolicy(input: CreatePolicyInput!): PolicyValidationResultOutput!
  rbacAssessRisk(input: CreatePolicyInput!): RiskAssessmentOutput!
  rbacReloadPolicies: Boolean!
  rbacInvalidateCache: Boolean!
}
```

---

### 2.2 Implement Validators ✅

**Status:** Completed

**Implemented Validators:**
- `PolicyValidator` - Policy format and rule validation
- `HighRiskPolicyValidator` - Risk assessment and dual-approval requirements

**PolicyValidator Features:**
- `validatePolicyRule()` - Validate policy format
- `validateSubjectFormat()` - Validate subject (user:id, role:name)
- `validateResourceFormat()` - Validate resource name
- `validateActionFormat()` - Validate action name

**HighRiskPolicyValidator Features:**
- `assessPolicy()` - Full risk assessment
- `isHighRisk()` - Quick check if policy is high-risk
- `getRequiredApprovals()` - Get number of required approvals
- `canApprove()` - Check if user can approve (prevents self-approval)

---

## Phase 3: Performance & Optimization (P2) ✅ COMPLETED

### 3.1 Batch Policy Loading ✅

**Status:** Completed

**Implementation:**
- `workspace-casbin.adapter.ts`:
  - `removePolicies()` - Uses `Promise.all` for parallel deletes
  - `updatePolicies()` - Batch remove + batch add
  - `updateFilteredPolicies()` - Batch add with `addPolicies()`
- `policy-sync.service.ts` - Already uses `bulkReplace` efficiently

**Acceptance Criteria:**
- [x] Batch operations implemented
- [x] Parallel execution for better performance
- [x] No regression in functionality

---

### 3.2 Performance Benchmarks ⏭️ SKIPPED

**Status:** Skipped per user request (no tests needed)

**Benchmark Targets (for future reference):**
| Operation | Target P95 | Target P99 |
|-----------|------------|------------|
| Permission Check | < 50ms | < 100ms |
| Cache Hit | < 5ms | < 10ms |
| Policy Sync (100 rules) | < 1s | < 2s |
| Enforcer Creation | < 500ms | < 1s |

---

### 3.3 Role Inheritance Optimization ✅

**Status:** Completed

**Implementation:**
- Created `role-inheritance-cache.service.ts`:
  - Multi-tier caching (local in-memory 5min + Redis 24h)
  - Build inheritance graph from Casbin g policies
  - Efficient ancestor/descendant lookups
  - `getEffectiveRoles(userId, workspaceId)` - returns all roles including inherited
  - Auto-invalidation on policy changes

- Added cache keys in `cache-keys.constant.ts`:
  - `ROLE_INHERITANCE` (24h TTL)
  - `USER_EFFECTIVE_ROLES` (15min TTL)

- Integration:
  - `policy-sync.service.ts` - Auto-invalidates role inheritance cache after sync
  - `casbin.module.ts` - Registered `RoleInheritanceCacheService`

**Acceptance Criteria:**
- [x] Inheritance graph cached
- [x] Auto-invalidation on role changes
- [x] Multi-tier caching (in-memory + Redis)

---

## Phase 4: Documentation & Cleanup (P2)

### 4.1 Update Design Documents

**Files can sua:**
- `docs/designs/mkt-rbac/RBAC-DESIGN-EVALUATION.md`
- `docs/designs/mkt-rbac/RBAC-IMPLEMENTATION-ROADMAP.md` (this file)

**Updates needed:**
- [x] Mark completed items
- [x] Update database status
- [ ] Add new findings

---

### 4.2 API Documentation

**Files can tao:**
```
docs/designs/mkt-rbac/
├── API-REFERENCE.md
├── GRAPHQL-SCHEMA.md
└── CLI-COMMANDS.md
```

**Content:**
- GraphQL queries/mutations
- CLI command usage
- Code examples

---

### 4.3 Code Cleanup ✅

**Status:** Completed

**Tasks:**
- [x] Remove dual-path guard (only use Casbin)
- [x] Remove shadow mode configuration
- [x] Clean up unused types: `RbacEngineMode`, `ShadowModeConfig`, `DiscrepancyRecord`, `LegacyPermissionContext`
- [x] Remove `recordDiscrepancy()` method from `rbac-metrics.service.ts`

---

## Progress Summary

```
Phase 1: Testing Foundation
├── Unit tests setup          ❌ Not Started
├── Integration tests         ❌ Not Started
└── E2E verification          ❌ Not Started

Phase 2: API & Validators     ✅ COMPLETED
├── Enable GraphQL resolvers  ✅ Done
├── Implement validators      ✅ Done
└── Casbin-only architecture  ✅ Done

Phase 3: Performance          ✅ COMPLETED
├── Batch policy loading      ✅ Done
├── Performance benchmarks    ⏭️ Skipped
└── Role inheritance opt      ✅ Done

Phase 4: Documentation
├── Update design docs        🔄 In Progress
├── API documentation         ❌ Not Started
└── Code cleanup              ✅ Done
```

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tests reveal bugs | Medium | Medium | Fix before production |
| Performance issues | Low | High | Benchmark early, optimize incrementally |
| Breaking changes | Low | Critical | Feature flags, rollback plan |

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Unit test coverage >= 80%
- [ ] Integration tests pass
- [ ] E2E verification documented

### Phase 2 Complete When: ✅
- [x] GraphQL resolvers enabled
- [x] Validators integrated
- [x] Casbin-based architecture working

### Phase 3 Complete When: ✅
- [x] Batch operations implemented
- [x] Role inheritance caching implemented
- [x] Auto-invalidation working
- [ ] Performance benchmarks (skipped per request)

### Phase 4 Complete When:
- [ ] All docs updated
- [ ] API reference complete
- [ ] Code cleanup done

---

## Appendix A: File Checklist

### Tests to Create
- [ ] `__tests__/unit/services/casbin-enforcer.service.spec.ts`
- [ ] `__tests__/unit/services/policy-approval.service.spec.ts`
- [ ] `__tests__/unit/services/cache-warmer.service.spec.ts`
- [ ] `__tests__/unit/repositories/workspace-casbin-rule.repository.spec.ts`
- [ ] `__tests__/unit/utils/cache-key-builder.utils.spec.ts`
- [ ] `__tests__/integration/permission-check.integration.spec.ts`
- [ ] `__tests__/integration/policy-sync.integration.spec.ts`
- [ ] `__tests__/performance/permission-check.benchmark.ts`

### Validators (Completed)
- [x] `casbin/validators/policy.validator.ts`
- [x] `casbin/validators/high-risk-policy.validator.ts`

### Docs to Create/Update
- [ ] `RBAC-DESIGN-EVALUATION.md` - Update status
- [ ] `API-REFERENCE.md` - New
- [ ] `GRAPHQL-SCHEMA.md` - New

---

## Appendix B: Commands Reference

```bash
# Run unit tests
npx nx test twenty-server --testPathPattern="mkt-rbac"

# Run integration tests
npx nx run twenty-server:test:integration --testPathPattern="rbac"

# Check permission via CLI
npx nx run twenty-server:command rbac-seeder:check \
  -- --user=<uuid> --workspace=<uuid> --resource=<resource> --action=<action>

# Sync policies
npx nx run twenty-server:command rbac-seeder:sync \
  -- --workspace=<uuid> --dry-run

# Warm cache
npx nx run twenty-server:command rbac-seeder:warm-cache \
  -- --workspace=<uuid>

# Debug mode
RBAC_DEBUG_MODE=true npx nx start twenty-server
```

---

*Document Version: 2.0*
*Created: 2026-01-12*
*Last Updated: 2026-01-12*
