# Comprehensive Database Risk Audit Report - mkt-core Module

**Audit Date:** 2025-12-26
**Auditor:** Claude Code AI Assistant
**Module:** `/packages/twenty-server/src/mkt-core`
**Previous Report:** DATA_DATABASE_RISKS_REPORT.md (2025-12-26)

---

## Executive Summary

This audit extends the previous risk analysis with a more comprehensive review of all data and database operations in the mkt-core module. The audit identified several critical issues requiring immediate attention, along with recommendations for long-term improvements.

### Key Metrics

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Hard Deletes | 5 | - | - | - |
| N+1 Queries | - | 4 | - | - |
| DateTimeUtils Violations | - | 5 | 2 | - |
| Transaction Issues | - | 4 | - | - |
| Race Conditions | - | - | Well-Mitigated | - |
| JSON Safety | - | - | - | 2 |

---

## 1. CRITICAL: Hard Deletes (Data Loss Risk)

### Findings

Multiple locations perform permanent data deletion without soft delete semantics:

| File | Line | Method | Risk Level |
|------|------|--------|------------|
| `workspace-member/repositories/mkt-workspace-member.repository.ts` | 500 | `repository.delete(memberId)` | CRITICAL |
| `order/repositories/mkt-order-item.repository.ts` | 342, 367, 390 | `hardDelete()`, `hardDeleteMany()`, `hardDeleteByOrderId()` | CRITICAL |
| `order/repositories/mkt-order.repository.ts` | 355 | `repository.delete(orderId)` | CRITICAL |
| `user-management/services/mkt-user-deletion.service.ts` | 40-46 | Sequential deletes without transaction | HIGH |
| `order/repositories/mkt-order-history.repository.ts` | 289 | `manager.delete('MktOrderHistoryWorkspaceEntity')` | CRITICAL |
| `payment/repositories/mkt-payment.repository.ts` | 320, 338 | `repository.delete()` | CRITICAL |
| `payment/repositories/mkt-payment-history.repository.ts` | 272 | `repository.delete(historyId)` | CRITICAL |

### Impact

- **Permanent data loss** - No recovery possible
- **Audit trail destruction** - Compliance violations
- **Foreign key violations** - Orphaned references
- **Legal liability** - Financial records destruction

### Recommended Fix

```typescript
// BEFORE (dangerous)
async hardDelete(workspaceId: string, itemId: string): Promise<void> {
  const repository = await this.getRepository(workspaceId);
  await repository.delete(itemId);
}

// AFTER (safe)
async softDelete(workspaceId: string, itemId: string): Promise<void> {
  const repository = await this.getRepository(workspaceId);
  await repository.update(itemId, {
    deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
  });
}
```

---

## 2. HIGH: N+1 Query Patterns

### Findings

| File | Location | Pattern | Impact |
|------|----------|---------|--------|
| `customer/services/lifecycle/mkt-customer-auto-assign.service.ts` | 154-164 | `for` loop with `countByCreatedByMember()` | N queries for N members |
| `order/services/integration/order-product.integration.ts` | 101-139 | Loop with `getProduct()` + `getPackage()` | 2N HTTP requests |
| `order/services/integration/order-license.integration.ts` | 61-100, 138-162, 194-218 | Individual API calls per license | N API calls |
| `mkt-organization-level/repositories/mkt-organization-level.repository.ts` | 421-422 | Loop with `update()` | N update queries |
| `setting/repositories/mkt-option.repository.ts` | 248-249 | Loop with `setValue()` | N operations |

### Performance Impact

For an order with 10 items:
- Current: 10+ individual product queries
- Optimal: 1 batch query

For 20 sales members:
- Current: 20 COUNT queries
- Optimal: 1 aggregated query with GROUP BY

### Recommended Fix

```typescript
// BEFORE (N+1)
for (const member of members) {
  const count = await this.countByCreatedByMember(member.id);
  results.push({ member, count });
}

// AFTER (single query)
const counts = await repository
  .createQueryBuilder('customer')
  .select('customer.createdByMemberId', 'memberId')
  .addSelect('COUNT(*)', 'count')
  .where('customer.createdByMemberId IN (:...memberIds)', {
    memberIds: members.map(m => m.id),
  })
  .groupBy('customer.createdByMemberId')
  .getRawMany();
```

---

## 3. HIGH: DateTimeUtils Violations

### Findings

| File | Line | Pattern | Status |
|------|------|---------|--------|
| `utils/date-range.utils.ts` | 9-103 | Entire file uses `new Date()` | **NEEDS FIX** |
| `infrastructure/redis/services/redis-lock.service.ts` | 160, 486 | Fallback `new Date()` | **NEEDS FIX** |
| `infrastructure/redis/utils/cache-ttl-jitter.util.ts` | 183 | Default parameter | **NEEDS FIX** |

### Already Fixed (from previous report)

- `customer/listeners/mkt-customer-event.listener.ts`
- `email/service/mkt-email.service.ts`
- `workspace-member/services/mkt-member-code-generation.service.ts`
- `oauth2-client/services/oauth2-client.service.ts`
- `mkt-combo/services/generic-combo-calculation.service.ts`
- `mkt-combo/services/generic-combo-snapshot.service.ts`
- `common/messages/message-builder.util.ts`
- `invoice/hooks/mkt-sinvoice-file-update-one.pre-query.hook.ts`

### Recommended Fix for DateRangeUtils

```typescript
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

export class DateRangeUtils {
  static today(): DateRange {
    const now = DateTimeUtils.now();
    const startOfDay = now.startOf('day');
    const endOfDay = now.endOf('day');

    return {
      start: DateTimeUtils.toDate(startOfDay),
      end: DateTimeUtils.toDate(endOfDay),
    };
  }
}
```

---

## 4. HIGH: Missing Transaction Handling

### Findings

| File | Operations | Risk |
|------|-----------|------|
| `user-management/services/mkt-user-deletion.service.ts` | Two sequential deletes | Partial deletion on failure |
| `order/services/integration/order-license.integration.ts` | Loop with creates | Partial state on failure |
| `mkt-promotion/repositories/mkt-coupon.repository.ts` | Create without QueryRunner | No rollback capability |

### Current Pattern (Risky)

```typescript
// Dangerous: not atomic
await this.roleTargetsRepository.delete({ userId });
await this.userWorkspaceRepository.delete({ userId }); // May fail, leaving orphaned role targets
```

### Recommended Fix

```typescript
async deleteUserCompletely(workspaceId: string, userId: string): Promise<void> {
  const dataSource = await this.twentyORMGlobalManager.getDataSourceForWorkspace(workspaceId);
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    await queryRunner.manager.delete(RoleTargetEntity, { userId });
    await queryRunner.manager.delete(UserWorkspaceEntity, { userId });
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

---

## 5. MEDIUM: Race Conditions (Well-Mitigated)

### Current Status

The codebase has proper race condition handling:

| Component | Pattern | Status |
|-----------|---------|--------|
| Order Code Generation | Distributed Redis Lock | **FIXED** (this commit) |
| Idempotency Service | PENDING/COMPLETED states | **GOOD** |
| Redis Lock Service | Atomic operations | **GOOD** |
| Payment Webhooks | Idempotency check | **GOOD** |

### Remaining Considerations

- Member code generation could benefit from similar locking
- Invoice number generation should be reviewed

---

## 6. LOW: JSON Safety

### Findings

| File | Usage | Risk |
|------|-------|------|
| Invoice hooks | `JSON.stringify(input)` for logging | LOW - Logs only |
| Various files | Using `safeJsonStringify` | GOOD |

### Available Safe Utilities

```typescript
import {
  safeJsonStringify,
  safeJsonParse,
  parseJsonOrDefault
} from 'src/mkt-core/utils/json.util';
```

---

## 7. Positive Patterns Identified

### Good Practices in Use

1. **Repository Pattern**: Clean separation of data access
2. **MoneyUtils**: Proper financial calculations with Big.js
3. **Saga Pattern**: Compensation and rollback support
4. **Null Checks**: Most critical paths properly validated
5. **Idempotency**: Well-designed service for duplicate prevention
6. **Event Emission**: After commit, not within transaction

### Example of Good Pattern

```typescript
// MoneyUtils properly used in order calculations
const subtotal = MoneyUtils.multiply(quantity, unitPrice);
const tax = MoneyUtils.percentage(subtotal.toNumber(), taxRate);
const total = MoneyUtils.add(subtotal.toNumber(), tax.toNumber());
```

---

## 8. Action Plan

### Immediate (This Sprint)

| Action | Priority | Effort | Owner |
|--------|----------|--------|-------|
| Replace hard deletes with soft deletes | P0 | 4h | - |
| Fix DateRangeUtils to use DateTimeUtils | P1 | 2h | - |
| Add transaction to user deletion | P1 | 2h | - |

### Short-term (Next 2 Sprints)

| Action | Priority | Effort | Owner |
|--------|----------|--------|-------|
| Implement batch product/license APIs | P1 | 8h | - |
| Fix N+1 in customer auto-assign | P2 | 4h | - |
| Add soft delete columns to entities | P2 | 4h | - |
| Transaction wrapper utility | P2 | 4h | - |

### Long-term (Architectural)

| Action | Description |
|--------|-------------|
| Event Sourcing | For financial transactions (orders, payments) |
| CQRS | For read-heavy operations (dashboard, analytics) |
| Audit Logging | For all mutable operations |
| Database Sequences | For code generation instead of query-based |

---

## 9. Fixes Applied in This Commit

### 1. Race Condition - Order Code Generation

**File:** `order/services/core/order-confirm-utils.service.ts`

```typescript
// Added distributed locking
const lockResult = await this.idempotencyCacheRepository.acquireLock(
  lockKey,
  ORDER_CODE_LOCK_TIMEOUT_MS,
);
// Generate code within lock
// Always release lock in finally block
```

### 2. Saga Compensation Error Boundary

**File:** `order/orchestration/saga/base/base-saga.ts`

```typescript
// Added event emission for monitoring
if (!success) {
  this.emitCompensationFailureEvent(context, step.name);
}
```

### 3. Circular Dependency Fix

**File:** `order/mkt-order.module.ts`

```typescript
// Changed from direct import to forwardRef
forwardRef(() => MktPaymentModule),
```

---

## 10. Appendix: Files Requiring Review

### Critical Priority

| File | Issues |
|------|--------|
| `order/repositories/mkt-order.repository.ts` | Hard delete |
| `order/repositories/mkt-order-item.repository.ts` | Multiple hard deletes |
| `payment/repositories/mkt-payment.repository.ts` | Hard delete |
| `user-management/services/mkt-user-deletion.service.ts` | Hard delete + no transaction |
| `workspace-member/repositories/mkt-workspace-member.repository.ts` | Hard delete |

### High Priority

| File | Issues |
|------|--------|
| `customer/services/lifecycle/mkt-customer-auto-assign.service.ts` | N+1 queries |
| `order/services/integration/order-product.integration.ts` | N+1 API calls |
| `order/services/integration/order-license.integration.ts` | N+1 API calls |
| `utils/date-range.utils.ts` | DateTimeUtils violation |

### Medium Priority

| File | Issues |
|------|--------|
| `infrastructure/redis/services/redis-lock.service.ts` | Minor Date violations |
| `mkt-organization-level/repositories/mkt-organization-level.repository.ts` | N+1 updates |

---

*This audit report should be reviewed and updated after each major refactoring effort.*

*Generated by Claude Code AI Assistant on 2025-12-26*
