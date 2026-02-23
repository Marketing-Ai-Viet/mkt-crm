# Dual-Metric Revenue — Test Plan & Workflow Verification

> Feature branch: `feature/dual-metric-revenue`
> Phases covered: 1 (Data Model) → 2 (DTO) → 3 (Service) → 4 (Leaderboard) → 5 (Cache & Events)

---

## Table of Contents

1. [Test Data Prerequisites](#1-test-data-prerequisites)
2. [Phase 1 — Data Model & Constants](#2-phase-1--data-model--constants)
3. [Phase 2 — DTO & Types](#3-phase-2--dto--types)
4. [Phase 3 — Service Layer (Revenue Queries)](#4-phase-3--service-layer-revenue-queries)
5. [Phase 4 — Leaderboard & Transformer & Orchestrator](#5-phase-4--leaderboard--transformer--orchestrator)
6. [Phase 5 — Cache & Events](#6-phase-5--cache--events)
7. [End-to-End Workflow Tests](#7-end-to-end-workflow-tests)
8. [Edge Cases & Boundary Tests](#8-edge-cases--boundary-tests)
9. [Backward Compatibility Tests](#9-backward-compatibility-tests)
10. [Performance Tests](#10-performance-tests)

---

## 1. Test Data Prerequisites

### 1.1 Required Seed Data

Trước khi chạy test, đảm bảo database có đủ dữ liệu sau:

| Entity | Yêu cầu | Ghi chú |
|--------|----------|---------|
| `workspaceMember` | >= 5 members | Thuộc ít nhất 2 department khác nhau |
| `mktDepartment` | >= 2 departments | Có cấu trúc hierarchy |
| `mktOrder` | >= 10 orders | Đa dạng status: COMPLETED, CONFIRMED, PENDING, CANCELLED |
| `mktPayment` | >= 8 payments | Đa dạng status: CONFIRMED, PENDING, REFUNDED, PARTIALLY_REFUNDED |
| `mktOrder.completedAt` | >= 5 orders có giá trị | Field mới, cần set cho orders COMPLETED |
| `mktPayment.confirmedAt` | >= 5 payments có giá trị | Payments CONFIRMED phải có confirmedAt |
| `mktPayment.refundedAt` | >= 2 payments có giá trị | Payments REFUNDED phải có refundedAt |

### 1.2 SQL Setup Script

```sql
-- Verify completedAt is populated for COMPLETED orders
SELECT id, "orderCode", status, "completedAt", "totalAmount", "refundAmount"
FROM "mktOrder"
WHERE status = 'COMPLETED'
ORDER BY "completedAt" DESC NULLS LAST
LIMIT 10;

-- Verify confirmedAt is populated for CONFIRMED payments
SELECT id, status, amount, "confirmedAt", "refundedAmount", "refundedAt", "mktOrderId"
FROM "mktPayment"
WHERE status IN ('CONFIRMED', 'COMPLETED')
ORDER BY "confirmedAt" DESC NULLS LAST
LIMIT 10;

-- If completedAt is NULL for COMPLETED orders, backfill:
UPDATE "mktOrder"
SET "completedAt" = "updatedAt"
WHERE status = 'COMPLETED' AND "completedAt" IS NULL;

-- If confirmedAt is NULL for CONFIRMED payments, backfill:
UPDATE "mktPayment"
SET "confirmedAt" = "paymentDate"
WHERE status IN ('CONFIRMED', 'COMPLETED') AND "confirmedAt" IS NULL;
```

---

## 2. Phase 1 — Data Model & Constants

### TC-1.1: `mktOrder.completedAt` field exists

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Query `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'mktOrder' AND column_name = 'completedAt'` | Row returned, type = `timestamp with time zone` | [ ] |
| 2 | Check field ID in `constants/mkt-field-ids.ts` | `completedAt: '7aa03cd8-7e02-4239-aa4b-deb0f62160e7'` | [ ] |
| 3 | Verify nullable: `INSERT ... completedAt = NULL` | Succeeds (nullable) | [ ] |

### TC-1.2: `mktPayment.refundedAt` field exists

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Query `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'mktPayment' AND column_name = 'refundedAt'` | Row returned, type = `timestamp with time zone` | [ ] |
| 2 | Check field ID in `constants/mkt-field-ids.ts` | `refundedAt: 'f27abc4e-00df-4c78-b594-8aa5f23d157e'` | [ ] |
| 3 | Verify nullable: payment without refund has `refundedAt = NULL` | Correct | [ ] |

### TC-1.3: Workspace sync

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Run `npx nx run twenty-server:command workspace:sync-metadata -f` | No errors | [ ] |
| 2 | Verify fields appear in metadata tables | completedAt + refundedAt registered | [ ] |

---

## 3. Phase 2 — DTO & Types

### TC-2.1: RevenueMode enum registered

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Query GraphQL introspection: `{ __type(name: "RevenueMode") { enumValues { name } } }` | Returns `CASH`, `ORDER`, `DUAL` | [ ] |
| 2 | Verify descriptions in schema | CASH = "Doanh thu da thu", ORDER = "Doanh so don hang", DUAL = "Song song" | [ ] |

### TC-2.2: RevenueStatsInput accepts revenueMode

```graphql
# TC-2.2a: Explicit CASH mode
query {
  mktRevenueStats(input: { period: THIS_MONTH, revenueMode: CASH }) {
    totalRevenue
    collected { totalRevenue }
    order { totalRevenue }
    gap { collectionRate }
  }
}
```

| # | Input | Expected | Status |
|---|-------|----------|--------|
| a | `revenueMode: CASH` | Accepted, no validation error | [ ] |
| b | `revenueMode: ORDER` | Accepted, no validation error | [ ] |
| c | `revenueMode: DUAL` | Accepted, no validation error | [ ] |
| d | `revenueMode` omitted | Defaults to DUAL | [ ] |
| e | `revenueMode: INVALID` | GraphQL validation error | [ ] |

### TC-2.3: RevenueStatsOutput structure

```graphql
query {
  mktRevenueStats(input: { period: THIS_MONTH }) {
    # Backward-compatible fields
    totalRevenue
    revenueByPeriod { period amount orderCount }
    revenueByDepartment { departmentName amount percentage }
    revenueByStaff { staffName amount orderCount rank }
    growthRate
    projectedRevenue
    # New dual-metric fields
    collected {
      totalRevenue
      revenueByPeriod { period amount orderCount }
      revenueByDepartment { departmentName amount percentage }
      revenueByStaff { staffName amount orderCount rank }
      growthRate
      projectedRevenue
    }
    order {
      totalRevenue
      revenueByPeriod { period amount orderCount }
      revenueByDepartment { departmentName amount percentage }
      revenueByStaff { staffName amount orderCount rank }
      growthRate
      projectedRevenue
    }
    gap {
      collectionRate
      revenueGap
      avgCollectionDays
    }
  }
}
```

| # | Field | Expected | Status |
|---|-------|----------|--------|
| 1 | `collected` | Not null in DUAL/CASH mode | [ ] |
| 2 | `order` | Not null in DUAL/ORDER mode | [ ] |
| 3 | `gap` | Not null only in DUAL mode | [ ] |
| 4 | All backward-compat fields | Always populated | [ ] |

### TC-2.4: Dashboard summary output includes dual-metric fields

```graphql
query {
  mktDashboardSummary(input: { period: THIS_MONTH }) {
    revenue {
      totalRevenue
      collectedRevenue
      orderRevenue
      collectionRate
      revenueGap
      collectedByMonth { period amount orderCount }
      orderByMonth { period amount orderCount }
    }
  }
}
```

| # | Field | Expected | Status |
|---|-------|----------|--------|
| 1 | `collectedRevenue` | Number or null | [ ] |
| 2 | `orderRevenue` | Number or null | [ ] |
| 3 | `collectionRate` | 0-100 (%) or null | [ ] |
| 4 | `revenueGap` | >= 0 or null | [ ] |
| 5 | `collectedByMonth` | Array or null | [ ] |
| 6 | `orderByMonth` | Array or null | [ ] |

### TC-2.5: Leaderboard output includes collectedRevenue

```graphql
query {
  mktStaffLeaderboard(input: { period: THIS_MONTH }) {
    rankings {
      rank staffName revenue collectedRevenue overallScore
    }
  }
}
```

| # | Field | Expected | Status |
|---|-------|----------|--------|
| 1 | `collectedRevenue` | Number or null per staff | [ ] |
| 2 | `revenue` | Order-based revenue (old field) | [ ] |
| 3 | Rankings sorted by `collectedRevenue DESC` | Verify order | [ ] |

---

## 4. Phase 3 — Service Layer (Revenue Queries)

### TC-3.1: CASH mode — only cash queries run

```graphql
query {
  mktRevenueStats(input: { period: THIS_MONTH, revenueMode: CASH }) {
    totalRevenue
    collected { totalRevenue revenueByPeriod { period amount } }
    order { totalRevenue }
    gap { collectionRate }
  }
}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | `collected` | Not null, has data | [ ] |
| 2 | `order` | **null** | [ ] |
| 3 | `gap` | **null** | [ ] |
| 4 | `totalRevenue` | == `collected.totalRevenue` | [ ] |
| 5 | `revenueByPeriod` | == `collected.revenueByPeriod` | [ ] |

### TC-3.2: ORDER mode — only order queries run

```graphql
query {
  mktRevenueStats(input: { period: THIS_MONTH, revenueMode: ORDER }) {
    totalRevenue
    collected { totalRevenue }
    order { totalRevenue revenueByPeriod { period amount } }
    gap { collectionRate }
  }
}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | `collected` | **null** | [ ] |
| 2 | `order` | Not null, has data | [ ] |
| 3 | `gap` | **null** | [ ] |
| 4 | `totalRevenue` | == `order.totalRevenue` | [ ] |

### TC-3.3: DUAL mode — both metrics + gap analysis

```graphql
query {
  mktRevenueStats(input: { period: THIS_MONTH, revenueMode: DUAL }) {
    totalRevenue
    collected { totalRevenue }
    order { totalRevenue }
    gap { collectionRate revenueGap avgCollectionDays }
  }
}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | `collected` | Not null | [ ] |
| 2 | `order` | Not null | [ ] |
| 3 | `gap` | Not null | [ ] |
| 4 | `gap.collectionRate` | == `(collected.totalRevenue / order.totalRevenue) * 100` | [ ] |
| 5 | `gap.revenueGap` | == `order.totalRevenue - collected.totalRevenue` | [ ] |
| 6 | `gap.avgCollectionDays` | >= 0 (or null if no data) | [ ] |
| 7 | `totalRevenue` | == `collected.totalRevenue` (default = cash) | [ ] |

### TC-3.4: Cash revenue SQL accuracy

Kiểm tra bằng SQL trực tiếp:

```sql
-- Expected cash revenue for THIS_MONTH
SELECT
  SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) AS expected_cash_revenue
FROM "mktPayment" p
JOIN "mktOrder" o ON p."mktOrderId" = o.id
WHERE p."deletedAt" IS NULL
  AND p.status IN ('COMPLETED', 'CONFIRMED')
  AND p."confirmedAt" >= DATE_TRUNC('month', NOW())
  AND p."confirmedAt" < DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | GraphQL `collected.totalRevenue` matches SQL result | Values equal | [ ] |
| 2 | Refunded amounts are subtracted | `SUM(amount) - SUM(refundedAmount)` | [ ] |
| 3 | Only CONFIRMED/COMPLETED payments counted | Status filter correct | [ ] |
| 4 | Uses `confirmedAt` (not `createdAt`) | Date range on confirmedAt | [ ] |

### TC-3.5: Order revenue SQL accuracy

```sql
-- Expected order revenue for THIS_MONTH
SELECT
  SUM("totalAmount") - SUM(COALESCE("refundAmount", 0)) AS expected_order_revenue
FROM "mktOrder"
WHERE "deletedAt" IS NULL
  AND status = 'COMPLETED'
  AND "completedAt" IS NOT NULL
  AND "completedAt" >= DATE_TRUNC('month', NOW())
  AND "completedAt" < DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | GraphQL `order.totalRevenue` matches SQL result | Values equal | [ ] |
| 2 | Refund amounts subtracted | `SUM(totalAmount) - SUM(refundAmount)` | [ ] |
| 3 | Only COMPLETED orders counted | Status = COMPLETED | [ ] |
| 4 | Uses `completedAt` (not `createdAt`) | Date range on completedAt | [ ] |
| 5 | `completedAt IS NOT NULL` filter applied | Orders without completedAt excluded | [ ] |

### TC-3.6: Revenue by staff — cash vs order

```graphql
query {
  mktRevenueStats(input: { period: THIS_MONTH, revenueMode: DUAL }) {
    collected {
      revenueByStaff { staffName amount rank }
    }
    order {
      revenueByStaff { staffName amount rank }
    }
  }
}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | Cash staff list may differ from order staff list | Different amounts/rankings | [ ] |
| 2 | Cash staff linked via `mktPayment → mktOrder.accountOwnerId` | Correct join path | [ ] |
| 3 | Order staff linked via `mktOrder.accountOwnerId` | Direct relationship | [ ] |
| 4 | Rankings ordered by amount DESC | Highest first | [ ] |

### TC-3.7: Revenue by department

```graphql
query {
  mktRevenueStats(input: { period: THIS_MONTH, revenueMode: DUAL }) {
    collected {
      revenueByDepartment { departmentName amount percentage }
    }
    order {
      revenueByDepartment { departmentName amount percentage }
    }
  }
}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | Percentage sums to ~100% (or less if some depts have 0) | <= 100% | [ ] |
| 2 | Departments with 0 revenue excluded | `HAVING SUM > 0` | [ ] |
| 3 | Department names correct | Match mktDepartment.departmentName | [ ] |

### TC-3.8: Growth rate calculation

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | Growth rate when previous period has data | `((current - previous) / previous) * 100` | [ ] |
| 2 | Growth rate when previous period = 0 | Returns 0 (no division by zero) | [ ] |
| 3 | Negative growth rate when current < previous | Negative percentage | [ ] |

### TC-3.9: Average collection days

```sql
-- Verify manually
SELECT
  AVG(EXTRACT(EPOCH FROM (p."confirmedAt" - o."completedAt")) / 86400) AS avg_days
FROM "mktPayment" p
JOIN "mktOrder" o ON p."mktOrderId" = o.id
WHERE p."deletedAt" IS NULL
  AND o."deletedAt" IS NULL
  AND p.status IN ('COMPLETED', 'CONFIRMED')
  AND o."completedAt" IS NOT NULL
  AND p."confirmedAt" >= DATE_TRUNC('month', NOW())
  AND p."confirmedAt" < DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | `gap.avgCollectionDays` matches SQL | Values equal (rounded to 2 decimals) | [ ] |
| 2 | Negative days if payment before completion | Can be negative (pre-payment) | [ ] |
| 3 | Null if no matching records | Returns 0 (COALESCE) | [ ] |

### TC-3.10: Department & staff filtering

```graphql
query {
  mktRevenueStats(input: {
    period: THIS_MONTH
    revenueMode: DUAL
    departmentId: "<department-id>"
  }) {
    collected { totalRevenue }
    order { totalRevenue }
  }
}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | With departmentId filter | Only that department's data | [ ] |
| 2 | With staffId filter | Only that staff's data | [ ] |
| 3 | Without filters | All data | [ ] |
| 4 | Invalid departmentId | Returns 0 revenue (no error) | [ ] |

### TC-3.11: Period variations

| # | Period | Expected | Status |
|---|--------|----------|--------|
| 1 | `TODAY` | Revenue for today only | [ ] |
| 2 | `THIS_WEEK` | Revenue from Monday to now | [ ] |
| 3 | `THIS_MONTH` | Revenue from 1st to now | [ ] |
| 4 | `THIS_QUARTER` | Revenue from quarter start | [ ] |
| 5 | `THIS_YEAR` | Revenue from Jan 1 | [ ] |
| 6 | Custom `startDate` + `endDate` | Revenue within range | [ ] |

---

## 5. Phase 4 — Leaderboard & Transformer & Orchestrator

### TC-4.1: Leaderboard rankings use collected revenue

```graphql
query {
  mktStaffLeaderboard(input: { period: THIS_MONTH }) {
    rankings {
      rank staffName revenue collectedRevenue overallScore
    }
  }
}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | Rankings sorted by `collectedRevenue` DESC | Highest cash collector is #1 | [ ] |
| 2 | `collectedRevenue` != `revenue` (usually) | Different data sources | [ ] |
| 3 | `revenue` uses `completedAt` + COMPLETED status | Order basis | [ ] |
| 4 | `collectedRevenue` uses `confirmedAt` + CONFIRMED status | Cash basis | [ ] |

### TC-4.2: Leaderboard SQL accuracy

```sql
-- Verify cash_stats subquery
SELECT
  o."accountOwnerId",
  SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) AS collected_revenue
FROM "mktPayment" p
JOIN "mktOrder" o ON p."mktOrderId" = o.id
WHERE p."deletedAt" IS NULL
  AND p.status IN ('COMPLETED', 'CONFIRMED')
  AND p."confirmedAt" >= DATE_TRUNC('month', NOW())
  AND p."confirmedAt" < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
GROUP BY o."accountOwnerId"
ORDER BY collected_revenue DESC;
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | GraphQL `collectedRevenue` matches SQL per staff | Values equal | [ ] |
| 2 | Refunded amounts subtracted from cash | Correct deduction | [ ] |
| 3 | Staff with only cash (no completed orders) still appears | `OR cash_stats.collected_revenue > 0` | [ ] |

### TC-4.3: Overall score calculation

```
overallScore = revenueForScore * 0.4 + orderCount * 0.2 + newCustomers * 0.2 + kpiAchievement * 0.2
where revenueForScore = collectedRevenue ?? revenue
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | When `collectedRevenue` is not null | Uses `collectedRevenue` for 40% weight | [ ] |
| 2 | When `collectedRevenue` is null (0) | Falls back to `revenue` for 40% weight | [ ] |
| 3 | Score is non-negative | >= 0 | [ ] |

### TC-4.4: Orchestrator maps dual-metric to summary

```graphql
query {
  mktDashboardSummary(input: { period: THIS_MONTH }) {
    revenue {
      totalRevenue
      collectedRevenue
      orderRevenue
      collectionRate
      revenueGap
      collectedByMonth { period amount }
      orderByMonth { period amount }
    }
  }
}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | `collectedRevenue` == revenue service `collected.totalRevenue` | Mapping correct | [ ] |
| 2 | `orderRevenue` == revenue service `order.totalRevenue` | Mapping correct | [ ] |
| 3 | `collectionRate` == revenue service `gap.collectionRate` | Mapping correct | [ ] |
| 4 | `revenueGap` == revenue service `gap.revenueGap` | Mapping correct | [ ] |
| 5 | `collectedByMonth` matches `collected.revenueByPeriod` | Array mapped | [ ] |
| 6 | `orderByMonth` matches `order.revenueByPeriod` | Array mapped | [ ] |
| 7 | `totalRevenue` uses cash basis (backward compat) | == `collectedRevenue` | [ ] |

---

## 6. Phase 5 — Cache & Events

### TC-5.1: Payment confirmation emits dashboard invalidation

**Workflow**: Confirm a PENDING payment

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Create a PENDING payment | Payment created | [ ] |
| 2 | Call dashboard summary (cache populated) | Returns data, cache SET logged | [ ] |
| 3 | Confirm the payment | Payment status → CONFIRMED | [ ] |
| 4 | Check server logs | `DASHBOARD_INVALIDATION_EVENTS.PAYMENT_CHANGED` emitted | [ ] |
| 5 | Check server logs | `Invalidating dashboard caches for payment change` logged | [ ] |
| 6 | Call dashboard summary again | Data refreshed (not stale cache) | [ ] |

**File**: `payment/services/core/payment-confirmation.service.ts:166`
```typescript
this.eventEmitter.emit(DASHBOARD_INVALIDATION_EVENTS.PAYMENT_CHANGED, {
  workspaceId,
  entityId: paymentId,
});
```

### TC-5.2: Payment rejection emits dashboard invalidation

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Create a PENDING payment | Payment created | [ ] |
| 2 | Reject the payment | Payment status → REJECTED | [ ] |
| 3 | Check server logs | `PAYMENT_CHANGED` event emitted | [ ] |
| 4 | Dashboard cache invalidated | PAYMENTS + REVENUE + LEADERBOARD caches cleared | [ ] |

**File**: `payment/services/core/payment-confirmation.service.ts:262`

### TC-5.3: Payment refund emits dashboard invalidation

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Have a CONFIRMED payment | Payment exists | [ ] |
| 2 | Refund the payment (full or partial) | refundedAmount updated | [ ] |
| 3 | Check server logs | `PAYMENT_CHANGED` event emitted | [ ] |
| 4 | Revenue stats refresh | Cash revenue decreased by refund amount | [ ] |

**File**: `payment/services/core/payment-refund.service.ts:180`

### TC-5.4: Order confirm emits dashboard invalidation

**Workflow**: Confirm an order via ConfirmOrderSaga

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Create a PENDING order | Order exists | [ ] |
| 2 | Confirm the order (CONFIRM_ORDER action) | Status → CONFIRMED | [ ] |
| 3 | Check server logs | `ORDER_CHANGED` event emitted | [ ] |
| 4 | Dashboard cache invalidated | REVENUE + ORDERS + LEADERBOARD caches cleared | [ ] |

**File**: `order/orchestration/saga/confirm-order.saga.ts:172`
```typescript
this.eventEmitter.emit(DASHBOARD_INVALIDATION_EVENTS.ORDER_CHANGED, {
  workspaceId: typedContext.workspaceId,
  entityId: typedContext.orderId,
});
```

### TC-5.5: Order refund emits dashboard invalidation

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Have a COMPLETED order | Order exists | [ ] |
| 2 | Refund the order | Status → REFUND or REFUND_PARTIAL | [ ] |
| 3 | Check server logs | `ORDER_CHANGED` event emitted | [ ] |
| 4 | Revenue stats refresh | Order revenue decreased | [ ] |

**File**: `order/orchestration/saga/refund-order.saga.ts:303`

### TC-5.6: Leaderboard cache invalidation on order change

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Query leaderboard (cache populated) | Data returned, cache SET | [ ] |
| 2 | Complete an order (or change status) | ORDER_CHANGED emitted | [ ] |
| 3 | Check cache | Leaderboard keys deleted for all periods | [ ] |
| 4 | Query leaderboard again | Fresh data from DB | [ ] |

**Listener**: `handleOrderChanged` → `invalidateLeaderboard()`

### TC-5.7: Leaderboard cache invalidation on payment change

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Query leaderboard (cache populated) | Data returned, cache SET | [ ] |
| 2 | Confirm a payment | PAYMENT_CHANGED emitted | [ ] |
| 3 | Check cache | Leaderboard keys deleted for all periods | [ ] |
| 4 | Query leaderboard again | Fresh data with updated collectedRevenue | [ ] |

**Listener**: `handlePaymentChanged` → `invalidateLeaderboard()`

### TC-5.8: Cache invalidation covers all periods

| # | Period invalidated | handleOrderChanged | handlePaymentChanged | Status |
|---|-------------------|--------------------|---------------------|--------|
| 1 | TODAY | REVENUE + ORDERS + LEADERBOARD | PAYMENTS + REVENUE + LEADERBOARD | [ ] |
| 2 | THIS_WEEK | REVENUE + ORDERS + LEADERBOARD | PAYMENTS + REVENUE + LEADERBOARD | [ ] |
| 3 | THIS_MONTH | REVENUE + ORDERS + LEADERBOARD | PAYMENTS + REVENUE + LEADERBOARD | [ ] |
| 4 | THIS_QUARTER | REVENUE + ORDERS + LEADERBOARD | PAYMENTS + REVENUE + LEADERBOARD | [ ] |
| 5 | THIS_YEAR | REVENUE + ORDERS + LEADERBOARD | PAYMENTS + REVENUE + LEADERBOARD | [ ] |

### TC-5.9: DashboardCacheService.invalidateLeaderboard method

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | Call `invalidateLeaderboard(wsId, ['THIS_MONTH'])` | Deletes `LEADERBOARD:wsId:THIS_MONTH` key | [ ] |
| 2 | Call with multiple periods | Deletes key per period | [ ] |
| 3 | Call with non-existent key | No error (silent) | [ ] |

---

## 7. End-to-End Workflow Tests

### TC-E2E-1: Full order-to-payment lifecycle

```
Scenario: Order created → Confirmed → Payment → Dashboard reflects all changes
```

| # | Step | Verify Dashboard | Status |
|---|------|-----------------|--------|
| 1 | Create order (PENDING) | Order count +1 in `orders.totalOrders` | [ ] |
| 2 | Confirm order → CONFIRMED | ORDER_CHANGED emitted, cache refreshed | [ ] |
| 3 | Complete order → COMPLETED (set completedAt) | `order.totalRevenue` increases | [ ] |
| 4 | Create payment (PENDING) | No revenue change yet | [ ] |
| 5 | Confirm payment (set confirmedAt) | `collected.totalRevenue` increases | [ ] |
| 6 | Check gap analysis | `collectionRate` reflects new payment | [ ] |
| 7 | Check leaderboard | Staff's `collectedRevenue` updated | [ ] |

### TC-E2E-2: Refund workflow affects dual metrics

```
Scenario: Payment refund reduces cash revenue but not order revenue
```

| # | Step | Cash Revenue | Order Revenue | Gap | Status |
|---|------|-------------|--------------|-----|--------|
| 1 | Before refund | X | Y | Y - X | [ ] |
| 2 | Partial refund (50%) | X - refund | Y (unchanged) | Y - (X - refund) | [ ] |
| 3 | Full refund | X - totalAmount | Y (unchanged) | Gap widens | [ ] |
| 4 | `collectionRate` decreases | Lower % | - | Verified | [ ] |

### TC-E2E-3: Order refund affects both metrics

```
Scenario: Order refund reduces order revenue
```

| # | Step | Cash Revenue | Order Revenue | Status |
|---|------|-------------|--------------|--------|
| 1 | Before refund | X | Y | [ ] |
| 2 | Order refund (refundAmount set) | X (unchanged) | Y - refundAmount | [ ] |
| 3 | Both revenue stats updated | Verify via queries | [ ] |

### TC-E2E-4: Multi-department comparison

```graphql
# Department A stats
query { mktRevenueStats(input: { period: THIS_MONTH, departmentId: "dept-a-id" }) {
  collected { totalRevenue } order { totalRevenue }
}}

# Department B stats
query { mktRevenueStats(input: { period: THIS_MONTH, departmentId: "dept-b-id" }) {
  collected { totalRevenue } order { totalRevenue }
}}

# All departments (no filter)
query { mktRevenueStats(input: { period: THIS_MONTH }) {
  collected { totalRevenue } order { totalRevenue }
}}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | Sum of departments <= total (some staff may not have dept) | `deptA + deptB <= total` | [ ] |
| 2 | Each department has independent cash/order metrics | Different values | [ ] |

---

## 8. Edge Cases & Boundary Tests

### TC-EDGE-1: No data scenarios

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | No COMPLETED orders in period | `order.totalRevenue = 0`, empty arrays | [ ] |
| 2 | No CONFIRMED payments in period | `collected.totalRevenue = 0` | [ ] |
| 3 | No data at all | Both metrics = 0, gap = null or 0% | [ ] |
| 4 | `gap.collectionRate` when order = 0 | 0 (no division by zero) | [ ] |
| 5 | `gap.avgCollectionDays` when no matching pairs | 0 (COALESCE) | [ ] |

### TC-EDGE-2: Refund edge cases

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | Payment fully refunded (`refundedAmount = amount`) | Cash revenue = 0 for that payment | [ ] |
| 2 | Order with `refundAmount > 0` | Order revenue reduced | [ ] |
| 3 | `refundedAmount` is NULL (no refund) | Treated as 0 (`COALESCE`) | [ ] |
| 4 | `refundAmount` is NULL on order | Treated as 0 (`COALESCE`) | [ ] |

### TC-EDGE-3: Timestamp edge cases

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | `completedAt` is NULL for COMPLETED order | Order excluded from revenue (WHERE completedAt IS NOT NULL) | [ ] |
| 2 | `confirmedAt` is NULL for CONFIRMED payment | Payment excluded from cash revenue | [ ] |
| 3 | Payment `confirmedAt` before order `completedAt` | Negative `avgCollectionDays` (pre-payment) | [ ] |
| 4 | Payment and order on different months | Each counted in their respective periods | [ ] |

### TC-EDGE-4: Deleted records

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | Soft-deleted order (`deletedAt IS NOT NULL`) | Excluded from all queries | [ ] |
| 2 | Soft-deleted payment (`deletedAt IS NOT NULL`) | Excluded from cash queries | [ ] |

### TC-EDGE-5: Large numbers

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | Order totalAmount = 999,999,999,999 | No overflow, MoneyUtils handles | [ ] |
| 2 | Thousands of orders/payments | Query completes < 5s | [ ] |

---

## 9. Backward Compatibility Tests

### TC-BC-1: Old frontend (no revenueMode) still works

```graphql
# Old query format (no revenueMode field)
query {
  mktRevenueStats(input: { period: THIS_MONTH }) {
    totalRevenue
    revenueByPeriod { period amount orderCount }
    revenueByStaff { staffName amount }
    growthRate
    projectedRevenue
  }
}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | Query succeeds (no error) | Returns data | [ ] |
| 2 | `totalRevenue` populated | Uses cash basis (default DUAL) | [ ] |
| 3 | `revenueByPeriod` populated | Cash basis data | [ ] |
| 4 | `growthRate` populated | Based on cash metric | [ ] |
| 5 | New fields (`collected`, `order`, `gap`) exist but ignored by old frontend | No breaking change | [ ] |

### TC-BC-2: Old dashboard summary query works

```graphql
# Old query without new fields
query {
  mktDashboardSummary(input: { period: THIS_MONTH }) {
    revenue {
      totalRevenue
      percentageChange
      trend
      revenueByMonth { period amount }
    }
    orders { totalOrders }
    payments { totalCollected }
  }
}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | Query succeeds | Returns data | [ ] |
| 2 | `totalRevenue` still meaningful | Cash basis revenue | [ ] |
| 3 | New fields not requested = no extra cost | GraphQL resolves only requested fields | [ ] |

### TC-BC-3: Leaderboard backward compatibility

```graphql
# Old query without collectedRevenue
query {
  mktStaffLeaderboard(input: { period: THIS_MONTH }) {
    rankings { rank staffName revenue overallScore }
  }
}
```

| # | Assertion | Expected | Status |
|---|-----------|----------|--------|
| 1 | `revenue` field still returned | Order-based revenue | [ ] |
| 2 | `overallScore` uses collectedRevenue internally | Score may differ from old calculation | [ ] |
| 3 | Ranking order changed (by collectedRevenue) | **Breaking change** — rankings may differ | [ ] |

> **Note**: TC-BC-3.3 is a known behavioral change. Leaderboard now sorts by `collectedRevenue DESC` instead of `total_revenue DESC`. This is intentional but should be communicated to stakeholders.

---

## 10. Performance Tests

### TC-PERF-1: Query execution time

| # | Mode | Expected max time | Queries | Status |
|---|------|-------------------|---------|--------|
| 1 | CASH | < 1s | 4 parallel | [ ] |
| 2 | ORDER | < 1s | 4 parallel | [ ] |
| 3 | DUAL | < 2s | 9 parallel (8 + avgDays) | [ ] |
| 4 | Dashboard Summary | < 3s | All domain stats parallel | [ ] |
| 5 | Leaderboard | < 2s | Complex JOIN query | [ ] |

### TC-PERF-2: Cache effectiveness

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | First call (cache miss) | Full query execution | [ ] |
| 2 | Second call (cache hit) | < 50ms response | [ ] |
| 3 | After invalidation event | Cache miss, re-query | [ ] |
| 4 | TTL expiry | Auto-refresh on next call | [ ] |

### TC-PERF-3: SQL EXPLAIN check

```sql
-- Verify index usage for cash queries
EXPLAIN ANALYZE
SELECT SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0))
FROM "mktPayment" p
JOIN "mktOrder" o ON p."mktOrderId" = o.id
WHERE p."deletedAt" IS NULL
  AND p.status IN ('COMPLETED', 'CONFIRMED')
  AND p."confirmedAt" BETWEEN '2026-02-01' AND '2026-02-28';

-- Verify index usage for order queries
EXPLAIN ANALYZE
SELECT SUM("totalAmount") - SUM(COALESCE("refundAmount", 0))
FROM "mktOrder"
WHERE "deletedAt" IS NULL
  AND status = 'COMPLETED'
  AND "completedAt" IS NOT NULL
  AND "completedAt" BETWEEN '2026-02-01' AND '2026-02-28';
```

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | Cash query uses index on `mktPayment.confirmedAt` | Index Scan (not Seq Scan) | [ ] |
| 2 | Order query uses index on `mktOrder.completedAt` | Index Scan (not Seq Scan) | [ ] |
| 3 | If Seq Scan detected | Create index: `CREATE INDEX idx_mkt_payment_confirmed_at ON "mktPayment" ("confirmedAt") WHERE "deletedAt" IS NULL` | [ ] |
| 4 | If Seq Scan detected | Create index: `CREATE INDEX idx_mkt_order_completed_at ON "mktOrder" ("completedAt") WHERE "deletedAt" IS NULL` | [ ] |

---

## Summary Checklist

| Phase | Total TCs | Description |
|-------|-----------|-------------|
| Phase 1 | 3 | Data model fields & workspace sync |
| Phase 2 | 5 | DTO types, GraphQL schema, enum |
| Phase 3 | 11 | Revenue queries (cash/order/dual), SQL accuracy, filters, periods |
| Phase 4 | 4 | Leaderboard ranking, score, orchestrator mapping |
| Phase 5 | 9 | Cache invalidation events, leaderboard cache |
| E2E | 4 | Full lifecycle, refund workflow, multi-department |
| Edge Cases | 5 | No data, refunds, timestamps, deleted records, large numbers |
| Backward Compat | 3 | Old frontend, old summary, old leaderboard |
| Performance | 3 | Query time, cache, SQL EXPLAIN |
| **Total** | **47** | |

---

## Files Modified (Cross-Reference)

| File | Phase | Change |
|------|-------|--------|
| `constants/mkt-field-ids.ts` | 1 | Added completedAt, refundedAt field IDs |
| `order/objects/mkt-order.workspace-entity.ts` | 1 | Added `completedAt` field |
| `payment/objects/mkt-payment.workspace-entity.ts` | 1 | Added `refundedAt` field |
| `mkt-dashboard/types/revenue-mode.type.ts` | 2 | **New** — RevenueMode enum |
| `mkt-dashboard/dto/input/revenue-stats.input.ts` | 2 | Added `revenueMode` field |
| `mkt-dashboard/dto/output/revenue-stats.output.ts` | 2 | Added `RevenueMetricOutput`, `GapAnalysisOutput`, extended output |
| `mkt-dashboard/dto/output/dashboard-summary.output.ts` | 2 | Added dual-metric fields to RevenueSummary |
| `mkt-dashboard/dto/output/leaderboard.output.ts` | 2 | Added `collectedRevenue` field |
| `mkt-dashboard/services/domain/revenue-stats.service.ts` | 3 | Major refactor — 4 cash + 4 order + 1 gap methods |
| `mkt-dashboard/services/domain/staff-leaderboard.service.ts` | 4 | Added cash_stats subquery, ORDER BY collectedRevenue |
| `mkt-dashboard/utils/dashboard-data.transformer.ts` | 4 | Extended RawLeaderboardRow, updated overallScore |
| `mkt-dashboard/services/application/dashboard-orchestrator.service.ts` | 4 | Mapped dual-metric fields to summary |
| `payment/services/core/payment-confirmation.service.ts` | 5 | Emits PAYMENT_CHANGED |
| `payment/services/core/payment-refund.service.ts` | 5 | Emits PAYMENT_CHANGED |
| `order/orchestration/saga/confirm-order.saga.ts` | 5 | Emits ORDER_CHANGED |
| `order/orchestration/saga/refund-order.saga.ts` | 5 | Emits ORDER_CHANGED |
| `mkt-dashboard/services/core/dashboard-cache.service.ts` | 5 | Added `invalidateLeaderboard()` |
| `mkt-dashboard/listeners/dashboard-cache-invalidation.listener.ts` | 5 | Added leaderboard invalidation in order/payment handlers |
