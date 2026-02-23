# Tài liệu triển khai Dual-Metric Revenue (mkt-dashboard)

> Ngày: 2026-02-23
> Tham chiếu: `REVENUE_TIME_REPORT.md` — Mục 3.3 Dual-Metric

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Định nghĩa 2 chỉ số](#2-định-nghĩa-2-chỉ-số)
3. [Thay đổi Data Model](#3-thay-đổi-data-model)
4. [Thay đổi DTO (Input / Output)](#4-thay-đổi-dto)
5. [Thay đổi Service Layer](#5-thay-đổi-service-layer)
6. [Thay đổi Transformer](#6-thay-đổi-transformer)
7. [Thay đổi Orchestrator & Resolver](#7-thay-đổi-orchestrator--resolver)
8. [Thay đổi Leaderboard](#8-thay-đổi-leaderboard)
9. [Thay đổi Dashboard Summary](#9-thay-đổi-dashboard-summary)
10. [Cache Invalidation](#10-cache-invalidation)
11. [Database Migration & Backfill](#11-database-migration--backfill)
12. [Trình tự triển khai](#12-trình-tự-triển-khai)
13. [QA Checklist](#13-qa-checklist)

---

## 1. Tổng quan kiến trúc

### 1.1 Ý tưởng chính

Dashboard sẽ hiển thị **2 chỉ số song song**:

```
┌──────────────────────────────────────────────────────┐
│                  DOANH THU KỲ NÀY                    │
│                                                      │
│   Doanh thu đã thu (Cash)     Doanh số đơn hàng     │
│   ┌────────────────────┐      ┌──────────────────┐   │
│   │  150,000,000 VND   │      │ 200,000,000 VND  │   │
│   │  ▲ +12% vs kỳ trước│      │ ▲ +8% vs kỳ trước│   │
│   └────────────────────┘      └──────────────────┘   │
│                                                      │
│   Tỷ lệ thu: 75%    Chênh lệch: 50,000,000 VND     │
└──────────────────────────────────────────────────────┘
```

### 1.2 Luồng dữ liệu mới

```
RevenueStatsInput
  └─ revenueMode: 'CASH' | 'ORDER' | 'DUAL' (mặc định DUAL)
        │
        ├─► CASH  → query từ mktPayment (confirmedAt)
        ├─► ORDER → query từ mktOrder   (completedAt)
        └─► DUAL  → chạy song song cả 2, trả về cả 2 bộ số
```

### 1.3 File bị ảnh hưởng

```
Thay đổi:
├── dto/input/revenue-stats.input.ts        (thêm revenueMode)
├── dto/output/revenue-stats.output.ts      (thêm collected*, order*, gap fields)
├── dto/output/dashboard-summary.output.ts  (mở rộng RevenueSummary)
├── dto/output/leaderboard.output.ts        (thêm collectedRevenue)
├── types/dashboard-period.type.ts          (giữ nguyên)
├── types/revenue-mode.type.ts              (FILE MỚI)
├── services/domain/revenue-stats.service.ts
├── services/domain/staff-leaderboard.service.ts
├── services/domain/customer-stats.service.ts (getTopCustomersByRevenue)
├── services/application/dashboard-orchestrator.service.ts
├── utils/dashboard-data.transformer.ts     (thêm raw types + transform mới)
├── constants/dashboard-limits.ts           (giữ nguyên)
├── listeners/dashboard-cache-invalidation.listener.ts (thêm event REFUND)
├── resolvers/dashboard-query.resolver.ts   (giữ nguyên interface)

Thêm mới:
├── types/revenue-mode.type.ts
├── mktOrder entity                         (thêm completedAt)
├── mktPayment entity                       (thêm refundedAt)
├── Database migration
├── Backfill script
```

---

## 2. Định nghĩa 2 chỉ số

### 2.1 Doanh thu đã thu (Collected Revenue — Cash Basis)

| Thuộc tính | Giá trị |
|-----------|---------|
| **Bảng nguồn** | `mktPayment` |
| **Timestamp** | `mktPayment.confirmedAt` |
| **Số tiền** | `SUM(p.amount) - SUM(COALESCE(p.refundedAmount, 0))` |
| **Điều kiện** | `p.status IN ('COMPLETED', 'CONFIRMED') AND p."deletedAt" IS NULL` |
| **Ý nghĩa** | Tiền thực tế đã thu được trong kỳ |
| **Staff link** | `mktPayment → mktOrder.accountOwnerId → workspaceMember` |
| **Dept link** | `workspaceMember.departmentId → mktDepartment` |

### 2.2 Doanh số đơn hàng (Order Revenue — Accrual Basis)

| Thuộc tính | Giá trị |
|-----------|---------|
| **Bảng nguồn** | `mktOrder` |
| **Timestamp** | `mktOrder.completedAt` (field mới) |
| **Số tiền** | `SUM(o.totalAmount) - SUM(COALESCE(o.refundAmount, 0))` |
| **Điều kiện** | `o.status = 'COMPLETED' AND o."deletedAt" IS NULL AND o."completedAt" IS NOT NULL` |
| **Ý nghĩa** | Giá trị đơn hàng đã hoàn tất trong kỳ |
| **Staff link** | `mktOrder.accountOwnerId → workspaceMember` |
| **Dept link** | `workspaceMember.departmentId → mktDepartment` |

### 2.3 Chỉ số bổ sung (Gap Analysis)

| Chỉ số | Công thức | Ý nghĩa |
|--------|-----------|---------|
| `collectionRate` | `collectedRevenue / orderRevenue * 100` | Tỷ lệ thu tiền so với đơn hàng |
| `revenueGap` | `orderRevenue - collectedRevenue` | Số tiền chưa thu |
| `avgCollectionDays` | `AVG(p.confirmedAt - o.completedAt)` | Thời gian thu tiền trung bình |

---

## 3. Thay đổi Data Model

### 3.1 Thêm field `completedAt` vào mktOrder

**File**: `order/objects/mkt-order.workspace-entity.ts`

| Thuộc tính | Giá trị |
|-----------|---------|
| `standardId` | Thêm `MKT_ORDER_FIELD_IDS.completedAt` vào `constants/mkt-field-ids.ts` |
| `type` | `FieldMetadataType.DATE_TIME` |
| `label` | `Completed At` |
| `description` | `Thời điểm đơn hàng chuyển sang trạng thái COMPLETED` |
| `icon` | `IconCheckbox` |
| `nullable` | `true` |

**Nơi set giá trị**: Khi order chuyển sang `COMPLETED` trong state machine:
- `order/states/completed-state.ts`
- `order/orchestration/steps/confirm-order/update-status.step.ts` (dòng 108)

### 3.2 Thêm field `refundedAt` vào mktPayment

**File**: `payment/objects/mkt-payment.workspace-entity.ts`

| Thuộc tính | Giá trị |
|-----------|---------|
| `standardId` | Thêm `MKT_PAYMENT_FIELD_IDS.refundedAt` vào `constants/mkt-field-ids.ts` |
| `type` | `FieldMetadataType.DATE_TIME` |
| `label` | `Refunded At` |
| `description` | `Thời điểm hoàn tiền` |
| `icon` | `IconReceiptRefund` |
| `nullable` | `true` |

**Nơi set giá trị**: Khi payment bị refund:
- `payment/services/core/payment-refund.service.ts`

### 3.3 Thêm field IDs vào constants

**File**: `constants/mkt-field-ids.ts`

```
MKT_ORDER_FIELD_IDS:
  completedAt: '<generate-uuid>'

MKT_PAYMENT_FIELD_IDS:
  refundedAt: '<generate-uuid>'
```

---

## 4. Thay đổi DTO

### 4.1 Enum RevenueMode (FILE MỚI)

**File mới**: `types/revenue-mode.type.ts`

```
enum RevenueMode {
  CASH   = 'CASH'       — Chỉ doanh thu đã thu
  ORDER  = 'ORDER'      — Chỉ doanh số đơn hàng
  DUAL   = 'DUAL'       — Cả hai (mặc định)
}
```

### 4.2 RevenueStatsInput (mở rộng)

**File**: `dto/input/revenue-stats.input.ts`

Thêm field mới:

| Field | Type | Default | Mô tả |
|-------|------|---------|-------|
| `revenueMode` | `RevenueMode` | `DUAL` | Chế độ tính doanh thu |

Giữ nguyên: `period`, `departmentId`, `staffId`, `startDate`, `endDate`, `limit`

### 4.3 RevenueStatsOutput (mở rộng)

**File**: `dto/output/revenue-stats.output.ts`

Cấu trúc output mới:

```
RevenueStatsOutput
├── collected (nullable — null khi mode = ORDER)
│   ├── totalRevenue: Float
│   ├── revenueByPeriod: [RevenueByPeriodItem]
│   ├── revenueByDepartment: [RevenueByDepartmentItem]
│   ├── revenueByStaff: [RevenueByStaffItem]
│   ├── growthRate: Float
│   └── projectedRevenue: Float?
│
├── order (nullable — null khi mode = CASH)
│   ├── totalRevenue: Float
│   ├── revenueByPeriod: [RevenueByPeriodItem]
│   ├── revenueByDepartment: [RevenueByDepartmentItem]
│   ├── revenueByStaff: [RevenueByStaffItem]
│   ├── growthRate: Float
│   └── projectedRevenue: Float?
│
├── gap (nullable — chỉ có khi mode = DUAL)
│   ├── collectionRate: Float       (% đã thu)
│   ├── revenueGap: Float           (chênh lệch)
│   └── avgCollectionDays: Float?   (ngày thu tiền TB)
│
└── (giữ lại các field cũ cho backward compatibility)
    ├── totalRevenue: Float         (= collected.totalRevenue khi DUAL/CASH, = order khi ORDER)
    ├── revenueByPeriod             (= collected khi DUAL/CASH)
    ├── revenueByDepartment         (= collected khi DUAL/CASH)
    ├── revenueByStaff              (= collected khi DUAL/CASH)
    ├── growthRate                   (= collected khi DUAL/CASH)
    └── projectedRevenue             (= collected khi DUAL/CASH)
```

**Nguyên tắc backward compatibility**:
- Các field gốc (`totalRevenue`, `revenueByPeriod`, ...) vẫn giữ nguyên
- Mặc định map từ `collected` (cash basis) khi `mode = DUAL` hoặc `CASH`
- Map từ `order` khi `mode = ORDER`
- Frontend cũ vẫn hoạt động bình thường, frontend mới đọc thêm `collected` / `order` / `gap`

### 4.4 RevenueByPeriodItem (giữ nguyên cấu trúc)

```
RevenueByPeriodItem:
  period: String
  amount: Float
  orderCount: Int
```

Dùng chung cho cả cash và order metric (chỉ khác nguồn dữ liệu).

---

## 5. Thay đổi Service Layer

### 5.1 RevenueStatsService — Tổng quan

**File**: `services/domain/revenue-stats.service.ts`

Refactor method `getStats()`:

```
async getStats(input):
  dateRange = resolve(input.period, ...)
  mode = input.revenueMode ?? 'DUAL'

  switch (mode):
    CASH  → chỉ chạy getCashRevenue*()
    ORDER → chỉ chạy getOrderRevenue*()
    DUAL  → chạy song song cả 2 + tính gap
```

### 5.2 Query nhóm CASH (4 query mới)

Tất cả query **từ bảng `mktPayment`**, timestamp = `confirmedAt`.

#### getCashRevenueByPeriod

```sql
SELECT
  DATE_TRUNC('{interval}', p."confirmedAt") AS period,
  COUNT(DISTINCT o.id) AS order_count,
  SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) AS total_revenue
FROM "mktPayment" p
JOIN "mktOrder" o ON p."mktOrderId" = o.id
WHERE p."deletedAt" IS NULL
  AND p.status IN ('COMPLETED', 'CONFIRMED')
  AND p."confirmedAt" BETWEEN $1 AND $2
  {staffClause: AND o."accountOwnerId" = $N}
  {deptClause}
GROUP BY DATE_TRUNC('{interval}', p."confirmedAt")
ORDER BY period
LIMIT $3
```

#### getCashRevenueByStaff

```sql
SELECT
  wm."nameFirstName" || ' ' || wm."nameLastName" AS staff_name,
  wm.id AS staff_id,
  COUNT(DISTINCT o.id) AS order_count,
  SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) AS total_revenue,
  COALESCE(d."departmentName", '') AS department_name
FROM "mktPayment" p
JOIN "mktOrder" o ON p."mktOrderId" = o.id
JOIN "workspaceMember" wm ON o."accountOwnerId" = wm.id
LEFT JOIN "mktDepartment" d ON wm."departmentId" = d.id
WHERE p."deletedAt" IS NULL
  AND p.status IN ('COMPLETED', 'CONFIRMED')
  AND p."confirmedAt" BETWEEN $1 AND $2
  {staffClause}
  {deptClause}
GROUP BY wm.id, wm."nameFirstName", wm."nameLastName", d."departmentName"
ORDER BY total_revenue DESC
LIMIT $3
```

#### getCashRevenueByDepartment

```sql
SELECT
  d."departmentName" AS department_name,
  d.id AS department_id,
  COALESCE(SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)), 0) AS amount
FROM "mktDepartment" d
LEFT JOIN "workspaceMember" wm ON wm."departmentId" = d.id
LEFT JOIN "mktOrder" o ON o."accountOwnerId" = wm.id
  AND o."deletedAt" IS NULL
LEFT JOIN "mktPayment" p ON p."mktOrderId" = o.id
  AND p."deletedAt" IS NULL
  AND p.status IN ('COMPLETED', 'CONFIRMED')
  AND p."confirmedAt" BETWEEN $1 AND $2
WHERE d."deletedAt" IS NULL
  {deptClause}
GROUP BY d.id, d."departmentName"
HAVING COALESCE(SUM(p.amount), 0) > 0
ORDER BY amount DESC
```

#### getCashPreviousPeriodRevenue

```sql
SELECT COALESCE(
  SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)), 0
) AS total_revenue
FROM "mktPayment" p
JOIN "mktOrder" o ON p."mktOrderId" = o.id
WHERE p."deletedAt" IS NULL
  AND p.status IN ('COMPLETED', 'CONFIRMED')
  AND p."confirmedAt" BETWEEN $1 AND $2
  {staffClause}
  {deptClause}
```

### 5.3 Query nhóm ORDER (4 query cập nhật)

Giữ query gốc từ `mktOrder` nhưng **đổi timestamp từ `createdAt` → `completedAt`**.

#### getOrderRevenueByPeriod

```sql
-- Thay đổi so với hiện tại:
--   createdAt → completedAt
--   Thêm trừ refundAmount
SELECT
  DATE_TRUNC('{interval}', "completedAt") AS period,
  COUNT(*) AS order_count,
  SUM("totalAmount") - SUM(COALESCE("refundAmount", 0)) AS total_revenue,
  AVG("totalAmount") AS avg_order_value
FROM "mktOrder"
WHERE "deletedAt" IS NULL
  AND status = 'COMPLETED'
  AND "completedAt" IS NOT NULL
  AND "completedAt" BETWEEN $1 AND $2
  {staffClause}
  {deptClause}
GROUP BY DATE_TRUNC('{interval}', "completedAt")
ORDER BY period
LIMIT $3
```

Tương tự cho `getOrderRevenueByStaff`, `getOrderRevenueByDepartment`, `getOrderPreviousPeriodRevenue`.

### 5.4 Query Gap Analysis

```sql
-- Thời gian thu tiền trung bình (chỉ khi mode = DUAL)
SELECT
  COALESCE(
    AVG(EXTRACT(EPOCH FROM (p."confirmedAt" - o."completedAt")) / 86400),
    0
  ) AS avg_collection_days
FROM "mktPayment" p
JOIN "mktOrder" o ON p."mktOrderId" = o.id
WHERE p."deletedAt" IS NULL
  AND o."deletedAt" IS NULL
  AND p.status IN ('COMPLETED', 'CONFIRMED')
  AND o."completedAt" IS NOT NULL
  AND p."confirmedAt" BETWEEN $1 AND $2
  {staffClause}
  {deptClause}
```

### 5.5 Logic chạy song song trong getStats()

```
if (mode === 'DUAL'):
  // 8 query song song: 4 cash + 4 order
  const [
    cashByPeriod, cashByStaff, cashByDept, cashPrevious,
    orderByPeriod, orderByStaff, orderByDept, orderPrevious,
  ] = await Promise.all([...])

  // Sau đó tính gap
  const gap = {
    collectionRate: (cashTotal / orderTotal) * 100,
    revenueGap: orderTotal - cashTotal,
    avgCollectionDays: await getAvgCollectionDays(...)
  }

if (mode === 'CASH'):
  // 4 query cash
  collected = ...; order = null; gap = null;

if (mode === 'ORDER'):
  // 4 query order
  collected = null; order = ...; gap = null;
```

---

## 6. Thay đổi Transformer

**File**: `utils/dashboard-data.transformer.ts`

### 6.1 Raw types mới

```
RawCashRevenueRow (giống RawRevenueRow nhưng rõ nguồn):
  period: string
  order_count: string
  total_revenue: string

(Có thể dùng lại RawRevenueRow vì cấu trúc giống nhau)
```

### 6.2 Phương thức mới

Không cần thêm phương thức mới — dùng lại các `transform*` hiện có vì cấu trúc raw row giống nhau. Chỉ cần đảm bảo:

- `transformRevenueByPeriod()` — dùng chung cho cả cash và order
- `transformRevenueByStaff()` — dùng chung
- `transformRevenueByDepartment()` — dùng chung

---

## 7. Thay đổi Orchestrator & Resolver

### 7.1 DashboardOrchestratorService

**File**: `services/application/dashboard-orchestrator.service.ts`

Phương thức `getRevenueStats()` giữ nguyên signature, chỉ pass-through `revenueMode` từ input.

### 7.2 DashboardQueryResolver

**File**: `resolvers/dashboard-query.resolver.ts`

Giữ nguyên — input đã có `revenueMode` nên resolver không cần thay đổi.

### 7.3 DashboardSummaryOutput — mapToSummaryOutput()

Trong `dashboard-orchestrator.service.ts` dòng 237–383:

```
revenue: {
  totalRevenue: revenueStats.totalRevenue,        // backward compat (cash)
  ... (giữ nguyên các field cũ)

  // Thêm mới:
  collectedRevenue: revenueStats.collected?.totalRevenue ?? null,
  orderRevenue: revenueStats.order?.totalRevenue ?? null,
  collectionRate: revenueStats.gap?.collectionRate ?? null,
  revenueGap: revenueStats.gap?.revenueGap ?? null,
}
```

---

## 8. Thay đổi Leaderboard

### 8.1 StaffLeaderboardService

**File**: `services/domain/staff-leaderboard.service.ts`

Subquery `order_stats` (dòng 125–135) hiện dùng `mktOrder.createdAt`.

**Thay đổi**: Thêm subquery `cash_stats` song song:

```sql
-- Cash revenue per staff (MỚI)
LEFT JOIN (
  SELECT
    o."accountOwnerId",
    SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) AS collected_revenue
  FROM "mktPayment" p
  JOIN "mktOrder" o ON p."mktOrderId" = o.id
  WHERE p."deletedAt" IS NULL
    AND p.status IN ('COMPLETED', 'CONFIRMED')
    AND p."confirmedAt" BETWEEN $1 AND $2
  GROUP BY o."accountOwnerId"
) cash_stats ON cash_stats."accountOwnerId" = wm.id

-- Order revenue per staff (SỬA: createdAt → completedAt)
LEFT JOIN (
  SELECT
    "accountOwnerId",
    COUNT(*) AS order_count,
    SUM("totalAmount") - SUM(COALESCE("refundAmount", 0)) AS total_revenue
  FROM "mktOrder"
  WHERE "deletedAt" IS NULL
    AND status = 'COMPLETED'
    AND "completedAt" IS NOT NULL
    AND "completedAt" BETWEEN $1 AND $2
  GROUP BY "accountOwnerId"
) order_stats ON order_stats."accountOwnerId" = wm.id
```

**SELECT thêm**: `COALESCE(cash_stats.collected_revenue, 0) AS collected_revenue`

**ORDER BY**: `COALESCE(cash_stats.collected_revenue, 0) DESC` (xếp hạng theo tiền đã thu)

### 8.2 LeaderboardRankingItem (mở rộng)

**File**: `dto/output/leaderboard.output.ts`

Thêm field:

| Field | Type | Mô tả |
|-------|------|-------|
| `collectedRevenue` | `Float` | Doanh thu đã thu (cash) |

Giữ lại `revenue` → đổi nghĩa thành orderRevenue (backward compat bằng cách giữ tên cũ).

### 8.3 RawLeaderboardRow (mở rộng)

**File**: `utils/dashboard-data.transformer.ts`

Thêm: `collected_revenue: string`

### 8.4 transformLeaderboard (cập nhật)

Thêm mapping: `collectedRevenue: MoneyUtils.from(row.collected_revenue).toNumber()`

Cân nhắc đổi `overallScore` weight: dùng `collectedRevenue` thay vì `revenue` cho thành phần "Revenue weight: 40%".

---

## 9. Thay đổi Dashboard Summary

### 9.1 RevenueSummary (mở rộng)

**File**: `dto/output/dashboard-summary.output.ts`

Thêm field vào `RevenueSummary`:

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| `collectedRevenue` | `Float` | ✅ | Tổng doanh thu đã thu |
| `orderRevenue` | `Float` | ✅ | Tổng doanh số đơn hàng |
| `collectionRate` | `Float` | ✅ | Tỷ lệ thu (%) |
| `revenueGap` | `Float` | ✅ | Chênh lệch |
| `collectedByMonth` | `[RevenueByMonthItem]` | ✅ | Cash by period |
| `orderByMonth` | `[RevenueByMonthItem]` | ✅ | Order by period |

Giữ nguyên: `totalRevenue`, `previousPeriodRevenue`, `percentageChange`, `trend`, `revenueByMonth`

### 9.2 mapToSummaryOutput() — cập nhật

Trong `dashboard-orchestrator.service.ts`:

```
// Revenue summary — mở rộng
revenue: {
  // Backward compat (giữ nguyên)
  totalRevenue: revenueStats.totalRevenue,
  previousPeriodRevenue: ...,
  percentageChange: ...,
  trend: ...,
  revenueByMonth: ...,

  // Mới
  collectedRevenue: revenueStats.collected?.totalRevenue ?? null,
  orderRevenue: revenueStats.order?.totalRevenue ?? null,
  collectionRate: revenueStats.gap?.collectionRate ?? null,
  revenueGap: revenueStats.gap?.revenueGap ?? null,
  collectedByMonth: revenueStats.collected?.revenueByPeriod?.map(...) ?? null,
  orderByMonth: revenueStats.order?.revenueByPeriod?.map(...) ?? null,
}
```

---

## 10. Cache Invalidation

### 10.1 Các event cần emit

**File**: `listeners/dashboard-cache-invalidation.listener.ts`

| Event | Khi nào | Đã có? |
|-------|---------|--------|
| `dashboard.invalidate.payment` | Payment confirmed | ✅ Có |
| `dashboard.invalidate.payment` | Payment rejected | ✅ Có (comment dòng 77) |
| `dashboard.invalidate.payment` | **Payment refunded** | ⚠️ Cần kiểm tra |
| `dashboard.invalidate.order` | Order completed | ✅ Có |
| `dashboard.invalidate.order` | **Order refunded** | ⚠️ Cần kiểm tra |

### 10.2 Kiểm tra nơi emit event

Cần đảm bảo các service sau emit event khi thay đổi:
- `payment/services/core/payment-confirmation.service.ts` → emit `PAYMENT_CHANGED`
- `payment/services/core/payment-refund.service.ts` → emit `PAYMENT_CHANGED`
- `order/states/completed-state.ts` → emit `ORDER_CHANGED`
- `order/states/refund-state.ts` → emit `ORDER_CHANGED`
- `order/states/refund-partial-state.ts` → emit `ORDER_CHANGED`

### 10.3 Cache key strategy

Cache key hiện tại đã bao gồm `period` + `filters`. Khi thêm `revenueMode`, cache key cần bao gồm luôn `revenueMode`:

```
cache key = `dashboard:revenue:${workspaceId}:${period}:${revenueMode}:${filterHash}`
```

---

## 11. Database Migration & Backfill

### 11.1 Migration — Thêm field

**Bước 1**: Thêm field IDs vào `constants/mkt-field-ids.ts`:
- `MKT_ORDER_FIELD_IDS.completedAt`
- `MKT_PAYMENT_FIELD_IDS.refundedAt`

**Bước 2**: Thêm WorkspaceField vào entity (xem mục 3.1 và 3.2)

**Bước 3**: Chạy `npx nx run twenty-server:command workspace:sync-metadata -f`

### 11.2 Backfill — completedAt cho mktOrder

```sql
-- Cách 1: Dùng mktOrderHistory (chính xác nhất)
UPDATE "mktOrder" o
SET "completedAt" = (
  SELECT MIN(h."createdAt")
  FROM "mktOrderHistory" h
  WHERE h."mktOrderId" = o.id
    AND h.action = 'STATUS_CHANGED'
    AND h."newValue" = 'COMPLETED'
)
WHERE o.status = 'COMPLETED'
  AND o."completedAt" IS NULL;

-- Cách 2: Fallback dùng updatedAt (khi không có history)
UPDATE "mktOrder" o
SET "completedAt" = o."updatedAt"
WHERE o.status = 'COMPLETED'
  AND o."completedAt" IS NULL;
```

### 11.3 Backfill — confirmedAt cho mktPayment (nếu thiếu)

```sql
-- Payment đã confirmed nhưng thiếu confirmedAt
UPDATE "mktPayment"
SET "confirmedAt" = COALESCE("paymentDate", "updatedAt")
WHERE status IN ('COMPLETED', 'CONFIRMED')
  AND "confirmedAt" IS NULL;
```

### 11.4 Backfill — refundedAt cho mktPayment

```sql
UPDATE "mktPayment"
SET "refundedAt" = "updatedAt"
WHERE "refundedAmount" > 0
  AND "refundedAt" IS NULL;
```

---

## 12. Trình tự triển khai

### Phase 1: Data Model & Migration

```
Bước 1.1: Thêm field IDs vào constants/mkt-field-ids.ts
Bước 1.2: Thêm completedAt vào mkt-order.workspace-entity.ts
Bước 1.3: Thêm refundedAt vào mkt-payment.workspace-entity.ts
Bước 1.4: Chạy workspace:sync-metadata
Bước 1.5: Chạy backfill scripts
Bước 1.6: Xác nhận: set completedAt khi order → COMPLETED (state machine)
Bước 1.7: Xác nhận: set refundedAt khi payment refund
```

### Phase 2: DTO & Types

```
Bước 2.1: Tạo types/revenue-mode.type.ts
Bước 2.2: Mở rộng dto/input/revenue-stats.input.ts (thêm revenueMode)
Bước 2.3: Mở rộng dto/output/revenue-stats.output.ts (thêm collected/order/gap)
Bước 2.4: Mở rộng dto/output/dashboard-summary.output.ts
Bước 2.5: Mở rộng dto/output/leaderboard.output.ts
```

### Phase 3: Service Logic

```
Bước 3.1: Thêm 4 getCashRevenue* methods vào RevenueStatsService
Bước 3.2: Đổi 4 getOrderRevenue* methods (createdAt → completedAt)
Bước 3.3: Thêm getAvgCollectionDays()
Bước 3.4: Refactor getStats() theo revenueMode
Bước 3.5: Cập nhật StaffLeaderboardService (thêm cash_stats subquery)
Bước 3.6: Cập nhật CustomerStatsService.getTopCustomersByRevenue
```

### Phase 4: Orchestrator & Transformer

```
Bước 4.1: Mở rộng RawLeaderboardRow trong transformer
Bước 4.2: Cập nhật transformLeaderboard()
Bước 4.3: Cập nhật mapToSummaryOutput() trong orchestrator
```

### Phase 5: Cache & Events

```
Bước 5.1: Kiểm tra emit PAYMENT_CHANGED trên refund
Bước 5.2: Kiểm tra emit ORDER_CHANGED trên refund
Bước 5.3: Cập nhật cache key bao gồm revenueMode
```

### Phase 6: Test & QA

```
Bước 6.1: Chạy QA checklist (mục 13)
Bước 6.2: So sánh số liệu trước/sau
```

---

## 13. QA Checklist

### 13.1 Backward Compatibility

- [ ] Frontend hiện tại gọi `revenueStats(input)` KHÔNG có `revenueMode` → vẫn trả dữ liệu bình thường
- [ ] `totalRevenue`, `revenueByPeriod`, `growthRate` vẫn có giá trị (default = cash)
- [ ] `dashboardSummary` vẫn trả đầy đủ `revenue.*` các field cũ

### 13.2 Cash Basis (mode = CASH)

- [ ] Đơn tạo 28/01, thanh toán 05/02 → doanh thu xuất hiện ở tháng 2
- [ ] Partial payment: 50% tháng 1 + 50% tháng 2 → mỗi tháng ghi nhận đúng phần
- [ ] Hoàn tiền 30% vào tháng 3 → tháng 3 bị trừ 30%
- [ ] Staff leaderboard: xếp theo tiền đã thu
- [ ] Department revenue: tổng = SUM(tất cả departments)

### 13.3 Order Basis (mode = ORDER)

- [ ] Đơn hoàn tất 15/01 → doanh số xuất hiện ở tháng 1 (bất kể thanh toán khi nào)
- [ ] `completedAt` = null → đơn không tính vào doanh số
- [ ] Đơn có `refundAmount` → trừ đúng số tiền hoàn

### 13.4 Dual Mode (mode = DUAL)

- [ ] `collected` và `order` đều có dữ liệu
- [ ] `gap.collectionRate` = `collected.total / order.total * 100`
- [ ] `gap.revenueGap` = `order.total - collected.total`
- [ ] `gap.avgCollectionDays` > 0 khi có payment sau order
- [ ] Tổng cash <= tổng order (bình thường)
- [ ] Growth rate tính độc lập cho mỗi metric

### 13.5 Edge Cases

- [ ] Đơn COMPLETED nhưng chưa có payment → cash = 0, order > 0, gap > 0
- [ ] Payment không gắn với order (`mktOrderId` IS NULL) → không tính vào revenue
- [ ] Order cancelled sau khi đã thu tiền → refund trừ cash, order không thay đổi
- [ ] Kỳ trước không có data → growthRate = 0, không chia cho 0
- [ ] `projectedRevenue`: cash projection dựa trên tốc độ thu tiền, order dựa trên tốc độ hoàn tất đơn

### 13.6 Performance

- [ ] Query DUAL mode (8 query song song) < 2 giây
- [ ] Cache hoạt động đúng: lần 2 gọi cùng input → lấy từ cache
- [ ] Cache invalidate khi payment confirmed / order completed / refund
