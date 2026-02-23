# Roadmap triển khai Dual-Metric Revenue

> Ngày tạo: 2026-02-23
> Tham chiếu: `DUAL_METRIC_IMPLEMENTATION_GUIDE.md`, `REVENUE_TIME_REPORT.md`
> Module: `packages/twenty-server/src/mkt-core/mkt-dashboard`

---

## Tổng quan

Chuyển dashboard từ dùng `mktOrder.createdAt` (sai) sang hệ thống **Dual-Metric**:
- **Cash Basis**: doanh thu đã thu (`mktPayment.confirmedAt`)
- **Order Basis**: doanh số đơn hàng (`mktOrder.completedAt`)
- **Gap Analysis**: tỷ lệ thu, chênh lệch, thời gian thu tiền TB

**Tổng: 6 phase, ~20 bước, ảnh hưởng ~15 file**

---

## Phase 1: Data Model & Constants

> Mục tiêu: Thêm field mới vào entity + sync metadata + backfill data cũ

### Bước 1.1 — Thêm field IDs vào constants

**File**: `constants/mkt-field-ids.ts`

| Constant | Key mới | Giá trị |
|----------|---------|---------|
| `MKT_ORDER_FIELD_IDS` | `completedAt` | Generate UUID v4 |
| `MKT_PAYMENT_FIELD_IDS` | `refundedAt` | Generate UUID v4 |

**Checklist**:
- [ ] Generate 2 UUID v4 mới (không trùng với bất kỳ ID nào đã có)
- [ ] Thêm vào đúng vị trí trong object (theo nhóm field liên quan)

---

### Bước 1.2 — Thêm `completedAt` vào MktOrder entity

**File**: `order/objects/mkt-order.workspace-entity.ts`

```typescript
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.completedAt,
  type: FieldMetadataType.DATE_TIME,
  label: 'Completed At',
  description: 'Thời điểm đơn hàng chuyển sang trạng thái COMPLETED',
  icon: 'IconCheckbox',
})
@WorkspaceIsNullable()
completedAt: string | null;
```

**Checklist**:
- [ ] Import `MKT_ORDER_FIELD_IDS` nếu chưa có
- [ ] Đặt field gần `lockedAt` (cùng nhóm timestamp)
- [ ] `nullable: true` (đơn chưa hoàn tất sẽ null)

---

### Bước 1.3 — Thêm `refundedAt` vào MktPayment entity

**File**: `payment/objects/mkt-payment.workspace-entity.ts`

```typescript
@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.refundedAt,
  type: FieldMetadataType.DATE_TIME,
  label: 'Refunded At',
  description: 'Thời điểm hoàn tiền',
  icon: 'IconReceiptRefund',
})
@WorkspaceIsNullable()
refundedAt: string | null;
```

**Checklist**:
- [ ] Đặt gần `refundedAmount` (cùng nhóm refund)
- [ ] `nullable: true`

---

### Bước 1.4 — Sync metadata & Backfill

**Commands**:
```bash
# 1. Sync metadata (tạo column trong DB)
npx nx run twenty-server:command workspace:sync-metadata -f

# 2. Backfill completedAt cho order đã COMPLETED
# Chạy SQL trực tiếp hoặc tạo command

# 3. Backfill refundedAt cho payment có refundedAmount > 0
```

**SQL Backfill** (xem chi tiết tại `DUAL_METRIC_IMPLEMENTATION_GUIDE.md` mục 11):

```sql
-- completedAt: từ orderHistory
UPDATE "mktOrder" o
SET "completedAt" = (
  SELECT MIN(h."createdAt") FROM "mktOrderHistory" h
  WHERE h."mktOrderId" = o.id AND h.action = 'STATUS_CHANGED' AND h."newValue" = 'COMPLETED'
)
WHERE o.status = 'COMPLETED' AND o."completedAt" IS NULL;

-- completedAt: fallback dùng updatedAt
UPDATE "mktOrder" SET "completedAt" = "updatedAt"
WHERE status = 'COMPLETED' AND "completedAt" IS NULL;

-- confirmedAt: backfill nếu thiếu
UPDATE "mktPayment" SET "confirmedAt" = COALESCE("paymentDate", "updatedAt")
WHERE status IN ('COMPLETED', 'CONFIRMED') AND "confirmedAt" IS NULL;

-- refundedAt
UPDATE "mktPayment" SET "refundedAt" = "updatedAt"
WHERE "refundedAmount" > 0 AND "refundedAt" IS NULL;
```

---

### Bước 1.5 — Set `completedAt` trong state machine

**Cần kiểm tra và cập nhật**:

| File | Hành động |
|------|-----------|
| `order/states/completed-state.ts` | Set `completedAt = DateTimeUtils.toISO(DateTimeUtils.now())` khi enter |
| `order/orchestration/steps/confirm-order/update-status.step.ts` (dòng ~108) | Set `completedAt` khi status → COMPLETED |

---

### Bước 1.6 — Set `refundedAt` trong refund flow

| File | Hành động |
|------|-----------|
| `payment/services/core/payment-refund.service.ts` | Set `refundedAt = DateTimeUtils.toISO(DateTimeUtils.now())` khi refund |

---

**Phase 1 Done Criteria**:
- [ ] 2 field mới có trong DB (verify bằng SQL `SELECT column_name FROM information_schema.columns`)
- [ ] Data cũ được backfill (no NULL cho COMPLETED orders / refunded payments)
- [ ] Order mới chuyển COMPLETED → `completedAt` được set
- [ ] Payment refund → `refundedAt` được set

---

## Phase 2: DTO & Types

> Mục tiêu: Mở rộng input/output DTOs, tạo enum RevenueMode, giữ backward compatibility

### Bước 2.1 — Tạo `types/revenue-mode.type.ts` (FILE MỚI)

```typescript
import { registerEnumType } from '@nestjs/graphql';

export enum RevenueMode {
  CASH = 'CASH',
  ORDER = 'ORDER',
  DUAL = 'DUAL',
}

registerEnumType(RevenueMode, {
  name: 'RevenueMode',
  description: 'Chế độ tính doanh thu: CASH (đã thu), ORDER (đơn hàng), DUAL (cả hai)',
});
```

**Checklist**:
- [ ] Export từ `types/index.ts`

---

### Bước 2.2 — Mở rộng `dto/input/revenue-stats.input.ts`

Thêm field:

```typescript
@Field(() => RevenueMode, { nullable: true, defaultValue: RevenueMode.DUAL })
revenueMode?: RevenueMode;
```

**Checklist**:
- [ ] Import `RevenueMode` từ `../../types`
- [ ] Default = `DUAL` (backward compat: frontend cũ không gửi → vẫn chạy DUAL)

---

### Bước 2.3 — Mở rộng `dto/output/revenue-stats.output.ts`

Tạo 3 sub-types mới + thêm field vào output:

```
RevenueMetricOutput (dùng chung cho collected & order):
  ├── totalRevenue: Float
  ├── revenueByPeriod: [RevenueByPeriodItem]
  ├── revenueByDepartment: [RevenueByDepartmentItem]
  ├── revenueByStaff: [RevenueByStaffItem]
  ├── growthRate: Float
  └── projectedRevenue: Float?

GapAnalysisOutput:
  ├── collectionRate: Float
  ├── revenueGap: Float
  └── avgCollectionDays: Float?

RevenueStatsOutput (mở rộng):
  ├── ... (giữ nguyên tất cả field cũ — backward compat)
  ├── collected: RevenueMetricOutput?  (null khi mode=ORDER)
  ├── order: RevenueMetricOutput?      (null khi mode=CASH)
  └── gap: GapAnalysisOutput?          (chỉ khi mode=DUAL)
```

**Checklist**:
- [ ] Field cũ vẫn có giá trị (map từ collected khi DUAL/CASH, từ order khi ORDER)
- [ ] 3 field mới đều nullable

---

### Bước 2.4 — Mở rộng `dto/output/dashboard-summary.output.ts`

Thêm vào `RevenueSummary`:

| Field mới | Type | Nullable |
|-----------|------|----------|
| `collectedRevenue` | `Float` | Yes |
| `orderRevenue` | `Float` | Yes |
| `collectionRate` | `Float` | Yes |
| `revenueGap` | `Float` | Yes |
| `collectedByMonth` | `[RevenueByMonthItem]` | Yes |
| `orderByMonth` | `[RevenueByMonthItem]` | Yes |

---

### Bước 2.5 — Mở rộng `dto/output/leaderboard.output.ts`

Thêm field vào `LeaderboardRankingItem`:

| Field mới | Type | Mô tả |
|-----------|------|-------|
| `collectedRevenue` | `Float` | Doanh thu đã thu (cash) |

Giữ `revenue` = order revenue (backward compat).

---

**Phase 2 Done Criteria**:
- [ ] GraphQL schema generate thành công (`npx nx run twenty-front:graphql:generate`)
- [ ] Query `revenueStats(input: { period: THIS_MONTH })` (không có revenueMode) vẫn trả dữ liệu
- [ ] Các field cũ vẫn có trong response

---

## Phase 3: Service Layer — Cash Queries

> Mục tiêu: Thêm 4 method query Cash Basis mới vào `RevenueStatsService`

### Bước 3.1 — Thêm 4 getCashRevenue* methods

**File**: `services/domain/revenue-stats.service.ts`

| Method mới | Bảng nguồn | Timestamp | JOIN |
|------------|-----------|-----------|------|
| `getCashRevenueByPeriod()` | `mktPayment` | `confirmedAt` | `mktOrder` |
| `getCashRevenueByStaff()` | `mktPayment` | `confirmedAt` | `mktOrder` → `workspaceMember` |
| `getCashRevenueByDepartment()` | `mktPayment` | `confirmedAt` | `mktOrder` → `wm` → `mktDepartment` |
| `getCashPreviousPeriodRevenue()` | `mktPayment` | `confirmedAt` | `mktOrder` |

**SQL chi tiết**: Xem `DUAL_METRIC_IMPLEMENTATION_GUIDE.md` mục 5.2

**Checklist**:
- [ ] Filter: `p.status IN ('COMPLETED', 'CONFIRMED') AND p."deletedAt" IS NULL`
- [ ] Amount: `SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0))`
- [ ] Dùng `MoneyUtils` trong transform
- [ ] Hỗ trợ department filter (deptClause) và staff filter (staffClause)

---

### Bước 3.2 — Đổi 4 getOrderRevenue* methods (createdAt → completedAt)

**File**: `services/domain/revenue-stats.service.ts`

Đổi tên methods hiện có (hoặc tạo mới):

| Method | Thay đổi |
|--------|----------|
| `getRevenueByPeriod` → `getOrderRevenueByPeriod` | `createdAt` → `completedAt`, thêm `completedAt IS NOT NULL` |
| `getRevenueByStaff` → `getOrderRevenueByStaff` | Tương tự |
| `getRevenueByDepartment` → `getOrderRevenueByDepartment` | Tương tự |
| `getPreviousPeriodRevenue` → `getOrderPreviousPeriodRevenue` | Tương tự |

**Thêm trừ refund**: `SUM("totalAmount") - SUM(COALESCE("refundAmount", 0))`

---

### Bước 3.3 — Thêm `getAvgCollectionDays()`

**File**: `services/domain/revenue-stats.service.ts`

```sql
SELECT COALESCE(
  AVG(EXTRACT(EPOCH FROM (p."confirmedAt" - o."completedAt")) / 86400), 0
) AS avg_collection_days
FROM "mktPayment" p JOIN "mktOrder" o ON p."mktOrderId" = o.id
WHERE ... AND o."completedAt" IS NOT NULL AND p."confirmedAt" BETWEEN $1 AND $2
```

---

### Bước 3.4 — Refactor `getStats()` theo revenueMode

```
getStats(input):
  mode = input.revenueMode ?? RevenueMode.DUAL

  if CASH:  4 cash queries  → collected = ..., order = null, gap = null
  if ORDER: 4 order queries → collected = null, order = ..., gap = null
  if DUAL:  8 queries song song (Promise.all) → collected, order, gap

  // Backward compat: map field cũ
  totalRevenue = (mode === ORDER) ? order.totalRevenue : collected.totalRevenue
  revenueByPeriod = (mode === ORDER) ? order.revenueByPeriod : collected.revenueByPeriod
  ... tương tự cho các field còn lại
```

---

**Phase 3 Done Criteria**:
- [ ] `getStats({ period: THIS_MONTH, revenueMode: CASH })` trả đúng dữ liệu cash
- [ ] `getStats({ period: THIS_MONTH, revenueMode: ORDER })` trả đúng dữ liệu order
- [ ] `getStats({ period: THIS_MONTH, revenueMode: DUAL })` trả cả hai + gap
- [ ] `getStats({ period: THIS_MONTH })` (không có mode) → chạy DUAL, field cũ vẫn có giá trị
- [ ] Gap analysis: `collectionRate`, `revenueGap`, `avgCollectionDays` đúng
- [ ] Performance: DUAL mode < 2 giây (8 query song song)

---

## Phase 4: Leaderboard & Transformer & Orchestrator

> Mục tiêu: Cập nhật leaderboard thêm cash revenue, transformer thêm field, orchestrator map output mới

### Bước 4.1 — Cập nhật `StaffLeaderboardService`

**File**: `services/domain/staff-leaderboard.service.ts`

Thay đổi:
1. Thêm subquery `cash_stats` (JOIN `mktPayment` → `mktOrder`, GROUP BY `accountOwnerId`)
2. Đổi subquery `order_stats`: `createdAt` → `completedAt`
3. SELECT thêm: `COALESCE(cash_stats.collected_revenue, 0) AS collected_revenue`
4. ORDER BY: `collected_revenue DESC` (xếp hạng theo tiền đã thu)

**SQL chi tiết**: Xem `DUAL_METRIC_IMPLEMENTATION_GUIDE.md` mục 8.1

---

### Bước 4.2 — Mở rộng `RawLeaderboardRow` + `transformLeaderboard()`

**File**: `utils/dashboard-data.transformer.ts`

```typescript
// Thêm vào RawLeaderboardRow:
collected_revenue: string;

// Thêm vào transformLeaderboard():
collectedRevenue: MoneyUtils.from(row.collected_revenue).toNumber(),

// Cập nhật overallScore: dùng collectedRevenue cho weight Revenue (40%)
```

---

### Bước 4.3 — Cập nhật `mapToSummaryOutput()` trong Orchestrator

**File**: `services/application/dashboard-orchestrator.service.ts`

Thêm field mới vào `revenue` section:

```typescript
revenue: {
  // Giữ nguyên field cũ
  totalRevenue: revenueStats.totalRevenue,
  previousPeriodRevenue, percentageChange, trend, revenueByMonth,

  // Thêm mới
  collectedRevenue: revenueStats.collected?.totalRevenue ?? null,
  orderRevenue: revenueStats.order?.totalRevenue ?? null,
  collectionRate: revenueStats.gap?.collectionRate ?? null,
  revenueGap: revenueStats.gap?.revenueGap ?? null,
  collectedByMonth: revenueStats.collected?.revenueByPeriod?.map(...) ?? null,
  orderByMonth: revenueStats.order?.revenueByPeriod?.map(...) ?? null,
}
```

---

**Phase 4 Done Criteria**:
- [ ] Leaderboard trả `collectedRevenue` cho mỗi staff
- [ ] Leaderboard xếp hạng theo `collectedRevenue`
- [ ] Dashboard summary có đầy đủ field mới (`collectedRevenue`, `orderRevenue`, `collectionRate`, `revenueGap`)
- [ ] Field cũ vẫn hoạt động

---

## Phase 5: Cache & Events

> Mục tiêu: Đảm bảo cache invalidate đúng khi có thay đổi dữ liệu

### Bước 5.1 — Kiểm tra emit events

**File cần kiểm tra**:

| File | Event | Trạng thái |
|------|-------|------------|
| `payment/services/core/payment-confirmation.service.ts` | `PAYMENT_CHANGED` | Kiểm tra |
| `payment/services/core/payment-refund.service.ts` | `PAYMENT_CHANGED` | Kiểm tra (cần thêm nếu thiếu) |
| `order/states/completed-state.ts` | `ORDER_CHANGED` | Kiểm tra |
| `order/states/refund-state.ts` | `ORDER_CHANGED` | Kiểm tra |
| `order/states/refund-partial-state.ts` | `ORDER_CHANGED` | Kiểm tra |

---

### Bước 5.2 — Cập nhật cache key

**File**: `constants/dashboard-cache-keys.ts` hoặc nơi generate cache key

Thêm `revenueMode` vào cache key:

```
cache key = `dashboard:revenue:${workspaceId}:${period}:${revenueMode}:${filterHash}`
```

---

### Bước 5.3 — Invalidate listener

**File**: `listeners/dashboard-cache-invalidation.listener.ts`

Kiểm tra:
- [ ] Event `PAYMENT_CHANGED` khi refund → invalidate cache
- [ ] Event `ORDER_CHANGED` khi refund → invalidate cache
- [ ] Invalidate tất cả 3 mode cache keys (CASH, ORDER, DUAL) khi có thay đổi

---

**Phase 5 Done Criteria**:
- [ ] Payment confirmed → cache revenue bị invalidate
- [ ] Payment refunded → cache revenue bị invalidate
- [ ] Order completed → cache revenue bị invalidate
- [ ] Lần gọi tiếp theo cache miss → query mới → dữ liệu fresh

---

## Phase 6: Test & QA

> Mục tiêu: Xác nhận toàn bộ tính năng hoạt động đúng

### Bước 6.1 — Unit Tests

| Test file | Scope |
|-----------|-------|
| `revenue-stats.service.spec.ts` | 3 mode: CASH, ORDER, DUAL; gap analysis; backward compat |
| `staff-leaderboard.service.spec.ts` | collectedRevenue field; ranking theo cash |
| `dashboard-data.transformer.spec.ts` | transformLeaderboard với collected_revenue |

---

### Bước 6.2 — QA Checklist (xem chi tiết mục 13 trong DUAL_METRIC_IMPLEMENTATION_GUIDE.md)

**Backward Compatibility**:
- [ ] Frontend cũ gọi không có `revenueMode` → vẫn trả dữ liệu đầy đủ
- [ ] `totalRevenue`, `revenueByPeriod`, `growthRate` vẫn có giá trị

**Cash Basis**:
- [ ] Đơn tạo 28/01, thanh toán 05/02 → doanh thu tháng 2
- [ ] Partial payment → mỗi kỳ ghi nhận đúng phần
- [ ] Hoàn tiền → kỳ hoàn tiền bị trừ

**Order Basis**:
- [ ] Đơn hoàn tất 15/01 → doanh số tháng 1
- [ ] `completedAt = null` → không tính

**Dual Mode**:
- [ ] `collected` và `order` đều có dữ liệu
- [ ] `collectionRate` = cash/order * 100
- [ ] `revenueGap` = order - cash

**Edge Cases**:
- [ ] Đơn COMPLETED nhưng chưa payment → cash=0, order>0
- [ ] Payment không gắn order → không tính
- [ ] Kỳ trước không có data → growthRate=0 (không chia 0)

**Performance**:
- [ ] DUAL mode 8 query < 2 giây
- [ ] Cache hit lần 2

---

### Bước 6.3 — So sánh số liệu trước/sau

```sql
-- So sánh tổng doanh số trước (createdAt) và sau (cash/order)
-- để đánh giá mức độ chênh lệch
SELECT
  (SELECT SUM("totalAmount") FROM "mktOrder"
   WHERE status = 'COMPLETED' AND "createdAt" BETWEEN '2026-01-01' AND '2026-01-31') AS old_method,

  (SELECT SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) FROM "mktPayment" p
   JOIN "mktOrder" o ON p."mktOrderId" = o.id
   WHERE p.status IN ('COMPLETED','CONFIRMED') AND p."confirmedAt" BETWEEN '2026-01-01' AND '2026-01-31') AS cash_method,

  (SELECT SUM("totalAmount") - SUM(COALESCE("refundAmount", 0)) FROM "mktOrder"
   WHERE status = 'COMPLETED' AND "completedAt" BETWEEN '2026-01-01' AND '2026-01-31') AS order_method;
```

---

## Tóm tắt file thay đổi

| # | File | Phase | Mức độ |
|---|------|-------|--------|
| 1 | `constants/mkt-field-ids.ts` | 1 | Nhỏ |
| 2 | `order/objects/mkt-order.workspace-entity.ts` | 1 | Nhỏ |
| 3 | `payment/objects/mkt-payment.workspace-entity.ts` | 1 | Nhỏ |
| 4 | `order/states/completed-state.ts` | 1 | Nhỏ |
| 5 | `payment/services/core/payment-refund.service.ts` | 1 | Nhỏ |
| 6 | **`types/revenue-mode.type.ts`** (MỚI) | 2 | Nhỏ |
| 7 | `types/index.ts` | 2 | Nhỏ |
| 8 | `dto/input/revenue-stats.input.ts` | 2 | Nhỏ |
| 9 | `dto/output/revenue-stats.output.ts` | 2 | TB |
| 10 | `dto/output/dashboard-summary.output.ts` | 2 | TB |
| 11 | `dto/output/leaderboard.output.ts` | 2 | Nhỏ |
| 12 | `services/domain/revenue-stats.service.ts` | 3 | **Lớn** |
| 13 | `services/domain/staff-leaderboard.service.ts` | 4 | TB |
| 14 | `utils/dashboard-data.transformer.ts` | 4 | Nhỏ |
| 15 | `services/application/dashboard-orchestrator.service.ts` | 4 | TB |
| 16 | `constants/dashboard-cache-keys.ts` | 5 | Nhỏ |
| 17 | `listeners/dashboard-cache-invalidation.listener.ts` | 5 | Nhỏ |

**File mới**: 1 (`types/revenue-mode.type.ts`)
**File sửa**: 16
**File lớn nhất**: `revenue-stats.service.ts` (thêm ~8 methods mới + refactor getStats)

---

## Thứ tự ưu tiên & Dependencies

```
Phase 1 (Data Model)
  └──► Phase 2 (DTO & Types)
         ├──► Phase 3 (Service Logic) ─── depends on Phase 1 + 2
         │       └──► Phase 4 (Leaderboard/Orchestrator) ─── depends on Phase 3
         └──► Phase 5 (Cache) ─── có thể làm song song với Phase 3-4
                         └──► Phase 6 (Test & QA) ─── sau tất cả
```

**Song song hóa**:
- Phase 2 + Phase 1.5-1.6 có thể làm song song (DTO không phụ thuộc state machine code)
- Phase 5 có thể bắt đầu song song với Phase 3-4
