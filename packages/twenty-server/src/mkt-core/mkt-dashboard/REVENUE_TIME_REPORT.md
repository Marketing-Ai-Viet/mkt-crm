# Báo cáo đánh giá: Cách xác định thời điểm tính doanh số (mkt-dashboard)

> Ngày: 2026-02-23  
> Module: `packages/twenty-server/src/mkt-core/mkt-dashboard`  
> Phạm vi: Tất cả service tính doanh số, thống kê đơn hàng, thanh toán, leaderboard trong dashboard

---

## 1. Hiện trạng

### 1.1 Timestamp đang dùng

Toàn bộ dashboard hiện tại dùng **`mktOrder.createdAt`** (thời điểm tạo đơn) làm mốc thời gian để tính doanh số và thống kê.

| Service | File | Timestamp dùng | Bảng chính |
|---------|------|----------------|------------|
| `RevenueStatsService` | `services/domain/revenue-stats.service.ts` | `mktOrder.createdAt` | `mktOrder` |
| `OrderStatsService` | `services/domain/order-stats.service.ts` | `mktOrder.createdAt` | `mktOrder` |
| `PaymentStatsService` | `services/domain/payment-stats.service.ts` | `mktPayment.createdAt` | `mktPayment` |
| `StaffLeaderboardService` | `services/domain/staff-leaderboard.service.ts` | `mktOrder.createdAt` | `mktOrder` |
| `CustomerStatsService` | `services/domain/customer-stats.service.ts` | `mktOrder.createdAt` | `mktOrder` (top customers) |

### 1.2 Điều kiện lọc hiện tại

Tất cả các query doanh số đều theo pattern:

```sql
WHERE "deletedAt" IS NULL
  AND status = 'COMPLETED'
  AND "createdAt" BETWEEN $1 AND $2
```

### 1.3 Các field timestamp có sẵn trong data model

| Entity | Field | Ý nghĩa | Có sẵn? |
|--------|-------|---------|---------|
| `mktOrder` | `createdAt` | Thời điểm tạo đơn | ✅ Có |
| `mktOrder` | `updatedAt` | Lần cập nhật cuối | ✅ Có |
| `mktOrder` | `paymentDeadline` | Hạn thanh toán | ✅ Có |
| `mktOrder` | `lockedAt` | Thời điểm bị khóa | ✅ Có |
| `mktOrder` | **`completedAt`** | **Thời điểm hoàn tất đơn** | ❌ **Chưa có** |
| `mktPayment` | `createdAt` | Thời điểm tạo payment | ✅ Có |
| `mktPayment` | `confirmedAt` | Thời điểm xác nhận thanh toán | ✅ Có |
| `mktPayment` | `paymentDate` | Ngày thực tế thanh toán | ✅ Có |
| `mktPayment` | `refundedAmount` | Số tiền đã hoàn | ✅ Có |
| `mktPayment` | **`refundedAt`** | **Thời điểm hoàn tiền** | ❌ **Chưa có** |

---

## 2. Phân tích vấn đề

### 2.1 Tại sao dùng `createdAt` là sai?

`createdAt` là thời điểm nhân viên **tạo đơn hàng**, không phải thời điểm:
- Khách hàng **thanh toán**
- Kế toán **xác nhận thu tiền**
- Đơn hàng **hoàn tất**

**Ví dụ thực tế:**
- Đơn hàng tạo ngày 28/01 → khách thanh toán ngày 05/02 → xác nhận ngày 06/02
- **Hiện tại**: Doanh số tháng 1 (vì createdAt = 28/01)
- **Đúng (cash basis)**: Doanh số tháng 2 (vì confirmedAt = 06/02)

### 2.2 Các rủi ro cụ thể

| # | Rủi ro | Mức độ | Mô tả |
|---|--------|--------|-------|
| R1 | **Doanh số sai kỳ** | 🔴 Cao | Đơn tạo cuối tháng, thanh toán đầu tháng sau → doanh số bị ghi nhận sai kỳ |
| R2 | **Thanh toán nhiều lần** | 🔴 Cao | Đơn hàng có nhiều payment (partial) → `totalAmount` bị tính 1 lần duy nhất tại `createdAt`, không phản ánh đúng từng lần thu |
| R3 | **Hoàn tiền không trừ** | 🟡 Trung bình | `refundedAmount` có sẵn nhưng dashboard không trừ doanh số khi hoàn tiền |
| R4 | **Leaderboard không chính xác** | 🟡 Trung bình | `StaffLeaderboardService` (dòng 129–135) dùng `createdAt` → nhân viên có đơn tạo nhiều nhưng chưa thu được tiền vẫn đứng top |
| R5 | **So sánh kỳ trước bị lệch** | 🟡 Trung bình | `getPreviousPeriodRevenue` so sánh 2 kỳ dựa trên `createdAt` → growth rate không phản ánh hiệu quả thu tiền |
| R6 | **Payment stats và Revenue stats không đồng nhất** | 🟡 Trung bình | `PaymentStatsService` dùng `mktPayment.createdAt`, còn `RevenueStatsService` dùng `mktOrder.createdAt` → 2 góc nhìn khác nhau cho cùng 1 kỳ |
| R7 | **Projected revenue sai** | 🟢 Thấp | Dự báo doanh số dựa trên `createdAt` → không phản ánh tốc độ thu tiền thực tế |

### 2.3 Tổng hợp các query bị ảnh hưởng (7 query)

| # | Method | File | Dòng | Bảng | Timestamp |
|---|--------|------|------|------|-----------|
| Q1 | `getRevenueByPeriod` | `revenue-stats.service.ts` | 167–185 | `mktOrder` | `createdAt` |
| Q2 | `getRevenueByStaff` | `revenue-stats.service.ts` | 222–243 | `mktOrder` | `createdAt` |
| Q3 | `getRevenueByDepartment` | `revenue-stats.service.ts` | 265–284 | `mktOrder` | `createdAt` |
| Q4 | `getPreviousPeriodRevenue` | `revenue-stats.service.ts` | 324–335 | `mktOrder` | `createdAt` |
| Q5 | `getOrderTrend` | `order-stats.service.ts` | 158–175 | `mktOrder` | `createdAt` |
| Q6 | `getTopProducts` | `order-stats.service.ts` | 204–222 | `mktOrder` | `createdAt` |
| Q7 | `getStaffRankings` | `staff-leaderboard.service.ts` | 113–181 | `mktOrder` | `createdAt` |

---

## 3. Các phương pháp tính doanh số (Best Practice)

### 3.1 Cash Basis (Cơ sở tiền mặt) — ⭐ Khuyến nghị

> **"Doanh số = tiền đã thu được, tính tại thời điểm xác nhận thanh toán"**

- **Timestamp**: `mktPayment.confirmedAt`
- **Bảng chính**: `mktPayment` (JOIN `mktOrder` để lấy thông tin bổ sung)
- **Số tiền**: `mktPayment.amount` (từng khoản thanh toán)
- **Hoàn tiền**: Trừ `refundedAmount` tại kỳ hoàn tiền

**Ưu điểm:**
- Phản ánh đúng dòng tiền thực tế
- Hỗ trợ tốt partial payment (mỗi payment có timestamp riêng)
- Khớp với báo cáo kế toán / ngân hàng
- Không phụ thuộc vào workflow đơn hàng

**Nhược điểm:**
- Đơn hàng chưa thanh toán không xuất hiện trong doanh số
- Cần `confirmedAt` luôn được set chính xác

### 3.2 Accrual Basis (Cơ sở dồn tích)

> **"Doanh số = giá trị đơn hàng hoàn tất, tính tại thời điểm đơn chuyển COMPLETED"**

- **Timestamp**: `mktOrder.completedAt` (cần thêm field mới)
- **Bảng chính**: `mktOrder`
- **Số tiền**: `mktOrder.totalAmount`

**Ưu điểm:**
- Phản ánh hoạt động kinh doanh (bao nhiêu đơn đã xong)
- Dễ hiểu từ góc nhìn sales

**Nhược điểm:**
- Không phản ánh đã thu tiền hay chưa
- Cần thêm field `completedAt` và backfill data cũ

### 3.3 Dual-Metric (Kết hợp cả hai) — Khuyến nghị mở rộng

> **Hiển thị 2 chỉ số song song trên dashboard:**
> - **"Doanh thu đã thu"** (Cash basis — `mktPayment.confirmedAt`)
> - **"Doanh số đơn hàng"** (Accrual — `mktOrder.completedAt`)

---

## 4. Khuyến nghị triển khai

### 4.1 Phương án đề xuất

**Giai đoạn 1**: Chuyển sang **Cash Basis** dùng `mktPayment.confirmedAt`  
**Giai đoạn 2**: Thêm `mktOrder.completedAt` và hỗ trợ **Dual-Metric** (tùy chọn)

### 4.2 Thay đổi Data Model

#### Cần thêm (giai đoạn 1):

| Entity | Field mới | Kiểu | Mô tả |
|--------|-----------|------|-------|
| `mktPayment` | `refundedAt` | `DATE_TIME` | Thời điểm hoàn tiền (hiện chỉ có `refundedAmount`, thiếu timestamp) |

#### Cần thêm (giai đoạn 2):

| Entity | Field mới | Kiểu | Mô tả |
|--------|-----------|------|-------|
| `mktOrder` | `completedAt` | `DATE_TIME` | Thời điểm đơn chuyển sang COMPLETED |

### 4.3 Thay đổi Query (giai đoạn 1 — Cash Basis)

#### Nguyên tắc chung:

1. **Bảng chính** chuyển từ `mktOrder` sang `mktPayment`
2. **Timestamp** chuyển từ `mktOrder.createdAt` sang `mktPayment.confirmedAt`
3. **Số tiền** chuyển từ `mktOrder.totalAmount` sang `SUM(mktPayment.amount) - SUM(mktPayment.refundedAmount)`
4. **Điều kiện** chuyển từ `status = 'COMPLETED'` sang `mktPayment.status IN ('COMPLETED', 'CONFIRMED')`
5. **JOIN** thêm `mktOrder` để lấy `accountOwnerId` (lọc staff/department)

#### Chi tiết từng query:

**Q1 — getRevenueByPeriod** (revenue-stats.service.ts:167–185)
- FROM: `mktOrder` → `mktPayment p JOIN mktOrder o ON p.mktOrderId = o.id`
- WHERE: `o.createdAt BETWEEN` → `p.confirmedAt BETWEEN`
- SELECT: `SUM(o.totalAmount)` → `SUM(p.amount) - SUM(COALESCE(p.refundedAmount, 0))`
- DATE_TRUNC: trên `p.confirmedAt` thay vì `o.createdAt`

**Q2 — getRevenueByStaff** (revenue-stats.service.ts:222–243)
- Tương tự Q1, JOIN thêm `workspaceMember` qua `o.accountOwnerId`
- GROUP BY staff, SUM trên `p.amount`

**Q3 — getRevenueByDepartment** (revenue-stats.service.ts:265–284)
- FROM: `mktDepartment d → workspaceMember → mktOrder → mktPayment`
- Timestamp: `p.confirmedAt`

**Q4 — getPreviousPeriodRevenue** (revenue-stats.service.ts:324–335)
- Cùng pattern, chỉ đổi timestamp sang `p.confirmedAt`

**Q5–Q6 — OrderStatsService** (order-stats.service.ts)
- `getOrderTrend`: giữ `mktOrder.createdAt` (vì đây là thống kê đơn hàng, không phải doanh thu)
- `getTopProducts`: nên đổi sang `p.confirmedAt` nếu muốn "sản phẩm bán chạy = sản phẩm thu được tiền"

**Q7 — getStaffRankings** (staff-leaderboard.service.ts:113–181)
- Subquery `order_stats`: đổi sang JOIN `mktPayment`, GROUP BY `o.accountOwnerId`
- Subquery `prev_month_stats`: tương tự

### 4.4 Cache Invalidation

Listener đã có sẵn tại `listeners/dashboard-cache-invalidation.listener.ts` với event `PAYMENT_CHANGED`.

Cần đảm bảo các event sau emit `dashboard.invalidate.payment`:
- Payment confirmed (đã có)
- Payment rejected
- Payment refunded (cần kiểm tra)

### 4.5 Backfill dữ liệu cũ

1. Với payment đã `status = 'COMPLETED'` hoặc `'CONFIRMED'` nhưng `confirmedAt IS NULL`:
   - Backfill từ `paymentDate` hoặc `updatedAt`
2. Nếu thêm `refundedAt`:
   - Backfill từ `updatedAt` của những payment có `refundedAmount > 0`
3. Nếu thêm `completedAt` (giai đoạn 2):
   - Backfill từ `mktOrderHistory` (action = status change to COMPLETED) hoặc `mktOrder.updatedAt`

### 4.6 Timezone

- `DashboardDateRangeService` đã dùng `DateTimeUtils` (UTC) — giữ nguyên
- `DATE_TRUNC` trong SQL cần đảm bảo dùng cùng timezone với frontend
- Nếu cần hiển thị theo timezone VN: `DATE_TRUNC('month', p."confirmedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh')`

---

## 5. Checklist QA sau triển khai

- [ ] Đơn hàng tạo tháng 1, thanh toán tháng 2 → doanh số phải nằm ở tháng 2
- [ ] Đơn hàng có 2 partial payment (tháng 1 và tháng 2) → mỗi tháng ghi nhận đúng phần đã thu
- [ ] Hoàn tiền 50% → doanh số kỳ hoàn tiền bị trừ đúng số
- [ ] Staff leaderboard → xếp hạng theo tiền đã thu, không theo giá trị đơn tạo
- [ ] So sánh kỳ trước (growthRate) → dùng cùng timestamp cho cả 2 kỳ
- [ ] Revenue stats và Payment stats → số liệu đồng nhất khi cùng kỳ
- [ ] Projected revenue → dự báo dựa trên tốc độ thu tiền thực tế
- [ ] Doanh số by department → khớp khi cộng lại với tổng doanh số

---

## 6. Tóm tắt tác động

| Thành phần | Mức độ thay đổi | Ghi chú |
|------------|-----------------|---------|
| `revenue-stats.service.ts` | 🔴 Lớn | Đổi hoàn toàn 4 query |
| `staff-leaderboard.service.ts` | 🔴 Lớn | Đổi subquery order_stats và prev_month_stats |
| `order-stats.service.ts` | 🟡 Trung bình | Đổi `getTopProducts`, giữ nguyên `getOrderTrend` |
| `customer-stats.service.ts` | 🟡 Trung bình | Đổi `getTopCustomersByRevenue` |
| `payment-stats.service.ts` | 🟢 Nhỏ | Chỉ đổi timestamp từ `createdAt` → `confirmedAt` |
| `dashboard-data.transformer.ts` | 🟡 Trung bình | Cập nhật transformer cho raw row mới |
| `dashboard-cache-invalidation.listener.ts` | 🟢 Nhỏ | Kiểm tra event refund |
| `mktPayment` entity | 🟢 Nhỏ | Thêm field `refundedAt` |
| `mktOrder` entity (giai đoạn 2) | 🟢 Nhỏ | Thêm field `completedAt` |
| Database migration | 🟡 Trung bình | Migration + backfill script |
