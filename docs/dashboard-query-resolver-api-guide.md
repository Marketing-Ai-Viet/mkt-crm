# Dashboard Query Resolver - API Response Guide

## Tổng quan

`DashboardQueryResolver` cung cấp 7 GraphQL queries để lấy dữ liệu dashboard tổng hợp. Tất cả queries đều yêu cầu xác thực (`WorkspaceAuthGuard` + `UserAuthGuard`) và kiểm soát quyền truy cập qua `@DataScope` decorator.

**Endpoint**: `POST /graphql`
**Authentication**: Bearer Token (header `Authorization: Bearer <token>`)

---

## Input chung

Tất cả queries (trừ `dashboardAlerts`) đều nhận tham số `period` với các giá trị:

| Giá trị | Ý nghĩa |
|---------|---------|
| `"TODAY"` | Ngày hôm nay |
| `"THIS_WEEK"` | Tuần hiện tại |
| `"THIS_MONTH"` | Tháng hiện tại |
| `"THIS_QUARTER"` | Quý hiện tại |
| `"THIS_YEAR"` | Năm hiện tại |
| `"CUSTOM"` | Khoảng thời gian tùy chỉnh (yêu cầu `startDate` + `endDate`) |

> **Lưu ý**: `period` là kiểu `String` (không phải enum), phải truyền dưới dạng chuỗi có dấu ngoặc kép trong GraphQL.

---

## 1. dashboardSummary

Tổng hợp toàn bộ dữ liệu dashboard trong một query duy nhất. Kết quả được cache theo workspace.

### Input: `DashboardSummaryInput`

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `period` | String | Yes | Khoảng thời gian |
| `departmentId` | String | No | Lọc theo phòng ban |
| `filters` | JSON | No | Bộ lọc nâng cao (dùng cho cache key) |
| `startDate` | String | No | Ngày bắt đầu (khi period = "CUSTOM") |
| `endDate` | String | No | Ngày kết thúc (khi period = "CUSTOM") |

### Output: `DashboardSummaryOutput`

```graphql
query {
  dashboardSummary(input: { period: "THIS_YEAR" }) {
    period { ... }
    revenue { ... }
    orders { ... }
    customers { ... }
    payments { ... }
    kpis { ... }
    contracts { ... }
    alerts { ... }
  }
}
```

#### `period` — Thông tin khoảng thời gian

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `start` | String | Ngày bắt đầu khoảng thời gian (ISO format, VD: `"2026-01-01"`) |
| `end` | String | Ngày kết thúc khoảng thời gian (ISO format, VD: `"2026-12-31"`) |
| `periodType` | String | Loại khoảng thời gian đã chọn (`"THIS_YEAR"`, `"THIS_MONTH"`, ...) |

#### `revenue` — Tổng quan doanh thu (`RevenueSummary`)

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `totalRevenue` | Float | Tổng doanh thu trong kỳ. Tính từ tổng `totalAmount` của các đơn hàng có status `COMPLETED` |
| `previousPeriodRevenue` | Float | Doanh thu kỳ trước (ước tính từ tỷ lệ tăng trưởng). Công thức: `totalRevenue - (growthRate/100 * totalRevenue)` |
| `percentageChange` | Float | Phần trăm thay đổi doanh thu so với kỳ trước (%). Giá trị dương = tăng, âm = giảm |
| `trend` | String | Xu hướng doanh thu, được phát hiện từ dữ liệu theo tháng. VD: `"UP"`, `"DOWN"`, `"STABLE"` |
| `revenueByMonth` | Array | Doanh thu chia theo từng tháng |

##### `revenueByMonth[]` — `RevenueByMonthItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `period` | String | Tháng (ISO timestamp dạng `"2026-01-01T00:00:00.000Z"`) |
| `amount` | Float | Tổng doanh thu trong tháng đó (VND). Chỉ tính đơn hàng `COMPLETED` |

#### `orders` — Tổng quan đơn hàng (`OrdersSummary`)

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `totalOrders` | Int | Tổng số đơn hàng trong kỳ (tất cả trạng thái) |
| `ordersByStatus` | Array | Phân bổ đơn hàng theo trạng thái |
| `newOrdersThisPeriod` | Int | Số đơn hàng mới trong kỳ (hiện tại = `totalOrders`) |
| `previousPeriodOrders` | Int | Số đơn hàng kỳ trước (hiện tại luôn = `0`, chưa implement) |
| `percentageChange` | Float | Phần trăm thay đổi so với kỳ trước (hiện tại = `0`) |
| `averageOrderValue` | Float | Giá trị đơn hàng trung bình (VND). Tính = `AVG(totalAmount)` của tất cả đơn hàng trong kỳ |

##### `ordersByStatus[]` — `OrdersByStatusItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `status` | String | Trạng thái đơn hàng: `PENDING`, `CONFIRMED`, `PROCESSING`, `COMPLETED`, `CANCELLED`, `LOCKED`, `BLOCKED`, `OVERDUE` |
| `count` | Int | Số lượng đơn hàng ở trạng thái này |
| `totalAmount` | Float | Tổng giá trị đơn hàng ở trạng thái này (VND) |

#### `customers` — Tổng quan khách hàng (`CustomersSummary`)

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `totalCustomers` | Int | Tổng số khách hàng (tính từ tổng các tier) |
| `newCustomersThisPeriod` | Int | Số khách hàng mới trong kỳ (tổng `newCustomers` từ dữ liệu tăng trưởng) |
| `previousPeriodNewCustomers` | Int | Khách hàng mới kỳ trước (hiện tại = `0`, chưa implement) |
| `percentageChange` | Float | Phần trăm thay đổi so với kỳ trước (hiện tại = `0`) |
| `customersByTier` | Array | Phân bổ khách hàng theo hạng (tier) |
| `customersByLifecycle` | Array | Phân bổ theo vòng đời (hiện tại = `[]`, chưa implement) |
| `churnRate` | Float | Tỷ lệ rời bỏ (%). Công thức: `(khách hàng CHURNED / tổng khách hàng) * 100` |
| `topCustomers` | Array | Danh sách khách hàng có doanh thu cao nhất |

##### `customersByTier[]` — `CustomersByTierItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `tier` | String | Hạng khách hàng: `VIP`, `PREMIUM`, `STANDARD`, `BASIC`, `NONE` (không có tier) |
| `count` | Int | Số lượng khách hàng ở hạng này |

##### `topCustomers[]` — `TopCustomerItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `id` | String | ID khách hàng (trong summary hiện tại = `""`) |
| `name` | String | Tên khách hàng |
| `totalOrderValue` | Float | Tổng giá trị đơn hàng `COMPLETED` của khách hàng (VND) |
| `tier` | String? | Hạng khách hàng (trong summary hiện tại = `null`) |

#### `payments` — Tổng quan thanh toán (`PaymentsSummary`)

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `totalCollected` | Float | Tổng số tiền đã thu (VND). Gồm thanh toán có status `COMPLETED` hoặc `CONFIRMED` |
| `pendingAmount` | Float | Số tiền đang chờ xử lý (VND). Gồm thanh toán có status `PENDING` hoặc `PROCESSING` |
| `collectionRate` | Float | Tỷ lệ thu hồi (%). Công thức: `(totalCollected / totalAmount) * 100` |
| `paymentsByStatus` | Array | Phân bổ thanh toán theo trạng thái |
| `overduePayments` | Int | Số lượng thanh toán quá hạn. Tính = thanh toán có status `PENDING`/`PROCESSING` và `expiredAt < NOW()` |

##### `paymentsByStatus[]` — `PaymentsByStatusItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `status` | String | Trạng thái thanh toán: `PENDING`, `PROCESSING`, `COMPLETED`, `CONFIRMED`, `FAILED`, `CANCELLED`, `REFUNDED` |
| `count` | Int | Số lượng thanh toán ở trạng thái này |
| `amount` | Float | Tổng số tiền ở trạng thái này (VND) |

#### `kpis` — Tổng quan KPI (`KpisSummary`)

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `totalKpis` | Int | Tổng số KPI (đếm từ tất cả các category) |
| `achievedCount` | Int | Số KPI đã đạt (status = `ACHIEVED` hoặc `EXCEEDED`) |
| `inProgressCount` | Int | Số KPI đang thực hiện (status = `IN_PROGRESS`) |
| `achievementRate` | Float | Tỷ lệ đạt KPI chung (%). Công thức: `(achievedCount / totalKpis) * 100` |
| `kpisByCategory` | Array | Phân bổ KPI theo danh mục |
| `topKpis` | Array | Top 5 KPI nổi bật |

##### `kpisByCategory[]` — `KpisByCategoryItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `category` | String | Danh mục KPI. VD: `"SALES"`, `"CUSTOMER"`, `"OPERATIONAL"` |
| `total` | Int | Tổng số KPI trong danh mục |
| `achieved` | Int | Số KPI đã đạt trong danh mục |
| `rate` | Float | Tỷ lệ đạt KPI của danh mục (%) |

##### `topKpis[]` — `TopKpiItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `kpiName` | String | Tên KPI |
| `targetValue` | Float | Giá trị mục tiêu |
| `actualValue` | Float | Giá trị thực tế đạt được |
| `progress` | Float | Tiến độ (%). Công thức: `(actualValue / targetValue) * 100` |

#### `contracts` — Tổng quan hợp đồng (`ContractsSummary`)

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `totalActive` | Int | Tổng số hợp đồng đang hoạt động. Điều kiện: status != `TERMINATED` và `endDate >= today` hoặc `endDate IS NULL` |
| `expiringThisMonth` | Int | Số hợp đồng sắp hết hạn trong 30 ngày tới |
| `newThisPeriod` | Int | Số hợp đồng mới được tạo trong kỳ |

#### `alerts` — Cảnh báo (`AlertsOutput`)

Xem chi tiết tại [mục 7. dashboardAlerts](#7-dashboardalerts).

---

## 2. revenueStats

Thống kê doanh thu chi tiết với phân tích theo thời gian, phòng ban, và nhân viên.

### Input: `RevenueStatsInput`

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `period` | String | Yes | Khoảng thời gian |
| `departmentId` | String | No | Lọc theo phòng ban |
| `startDate` | String | No | Ngày bắt đầu (khi period = "CUSTOM") |
| `endDate` | String | No | Ngày kết thúc (khi period = "CUSTOM") |
| `limit` | Int | No | Giới hạn số nhân viên trả về (mặc định: 10) |

### Output: `RevenueStatsOutput`

```graphql
query {
  revenueStats(input: { period: "THIS_YEAR" }) {
    totalRevenue
    revenueByPeriod { period amount orderCount }
    revenueByDepartment { departmentName amount percentage }
    revenueByStaff { staffName amount orderCount rank }
    growthRate
    projectedRevenue
  }
}
```

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `totalRevenue` | Float | Tổng doanh thu trong kỳ (VND). Tổng `totalAmount` của đơn hàng `COMPLETED` |
| `revenueByPeriod` | Array | Doanh thu chia theo từng tháng |
| `revenueByDepartment` | Array | Doanh thu chia theo phòng ban |
| `revenueByStaff` | Array | Doanh thu chia theo nhân viên (xếp hạng từ cao xuống thấp) |
| `growthRate` | Float | Tỷ lệ tăng trưởng doanh thu so với kỳ trước (%). VD: `25.5` = tăng 25.5% |
| `projectedRevenue` | Float? | Doanh thu dự kiến cả kỳ (VND). Tính bằng ngoại suy tuyến tính: `(totalRevenue / elapsedDays) * totalDays`. Trả về `null` nếu kỳ đã kết thúc |

### Chi tiết các sub-types

#### `revenueByPeriod[]` — `RevenueByPeriodItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `period` | String | Tháng (ISO timestamp). Chỉ tính đơn hàng `COMPLETED` |
| `amount` | Float | Tổng doanh thu trong tháng (VND) |
| `orderCount` | Int | Số đơn hàng `COMPLETED` trong tháng |

#### `revenueByDepartment[]` — `RevenueByDepartmentItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `departmentName` | String | Tên phòng ban (từ `mktDepartment.departmentName`) |
| `amount` | Float | Tổng doanh thu phòng ban mang lại (VND). Tính qua: `mktDepartment → workspaceMember → mktOrder (COMPLETED)` |
| `percentage` | Float | Tỷ lệ đóng góp (%). Công thức: `(amount / totalRevenue) * 100` |

#### `revenueByStaff[]` — `RevenueByStaffItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `staffName` | String | Tên nhân viên (`nameFirstName + nameLastName` từ `workspaceMember`) |
| `amount` | Float | Tổng doanh thu nhân viên mang lại (VND). Liên kết qua `mktOrder.accountOwnerId` |
| `orderCount` | Int | Số đơn hàng `COMPLETED` mà nhân viên phụ trách |
| `rank` | Int | Thứ hạng (1 = doanh thu cao nhất) |

---

## 3. orderStats

Thống kê đơn hàng chi tiết với phân tích xu hướng và sản phẩm bán chạy.

### Input: `OrderStatsInput`

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `period` | String | Yes | Khoảng thời gian |
| `departmentId` | String | No | Lọc theo phòng ban |
| `startDate` | String | No | Ngày bắt đầu (khi period = "CUSTOM") |
| `endDate` | String | No | Ngày kết thúc (khi period = "CUSTOM") |
| `topProductsLimit` | Int | No | Giới hạn số sản phẩm top (mặc định: 10) |

### Output: `OrderStatsOutput`

```graphql
query {
  orderStats(input: { period: "THIS_YEAR" }) {
    ordersByStatus { status count totalAmount }
    orderTrend { period count amount }
    averageOrderValue
    averageProcessingTime
    conversionRate
    topProducts { productName quantity revenue }
  }
}
```

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `ordersByStatus` | Array | Phân bổ đơn hàng theo trạng thái (tất cả đơn hàng, không chỉ COMPLETED) |
| `orderTrend` | Array | Xu hướng đơn hàng theo tháng |
| `averageOrderValue` | Float | Giá trị đơn hàng trung bình (VND). Tính = `AVG(totalAmount)` của tất cả đơn hàng trong kỳ |
| `averageProcessingTime` | Float | Thời gian xử lý trung bình (ngày). Chỉ tính đơn hàng `COMPLETED`. Công thức: `AVG(updatedAt - createdAt)` |
| `conversionRate` | Float | Tỷ lệ hoàn thành (%). Công thức: `(đơn COMPLETED / tổng đơn) * 100` |
| `topProducts` | Array | Danh sách sản phẩm bán chạy nhất |

### Chi tiết các sub-types

#### `ordersByStatus[]` — `OrderStatusItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `status` | String | Trạng thái đơn hàng |
| `count` | Int | Số lượng đơn hàng |
| `totalAmount` | Float | Tổng giá trị (VND) |

#### `orderTrend[]` — `OrderTrendItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `period` | String | Tháng (ISO timestamp). Tính tất cả đơn hàng (không lọc status) |
| `count` | Int | Số đơn hàng trong tháng |
| `amount` | Float | Tổng giá trị đơn hàng trong tháng (VND) |

#### `topProducts[]` — `TopProductItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `productName` | String | Tên sản phẩm (từ `mktOrderItem.snapshotProductName` - snapshot tại thời điểm đặt hàng) |
| `quantity` | Int | Tổng số lượng đã bán |
| `revenue` | Float | Tổng doanh thu từ sản phẩm (VND). Tính = `SUM(mktOrderItem.totalPrice)` |

---

## 4. customerStats

Thống kê khách hàng chi tiết với phân tích theo tier, tăng trưởng, LTV và mức độ tương tác.

### Input: `CustomerStatsInput`

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `period` | String | Yes | Khoảng thời gian |
| `departmentId` | String | No | Lọc theo phòng ban |
| `startDate` | String | No | Ngày bắt đầu (khi period = "CUSTOM") |
| `endDate` | String | No | Ngày kết thúc (khi period = "CUSTOM") |
| `topCustomersLimit` | Int | No | Giới hạn số khách hàng top (mặc định: 10) |

### Output: `CustomerStatsOutput`

```graphql
query {
  customerStats(input: { period: "THIS_YEAR" }) {
    customersByTier { tier count totalLtv }
    customerGrowth { period newCustomers churnedCustomers netGrowth }
    averageLtv
    churnRate
    engagementDistribution { range count }
    topCustomersByRevenue { name revenue orderCount }
  }
}
```

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `customersByTier` | Array | Phân bổ khách hàng theo hạng (tier) |
| `customerGrowth` | Array | Tăng trưởng khách hàng theo tháng |
| `averageLtv` | Float | Giá trị vòng đời trung bình (VND). Tính = `AVG(customerLtv)` của tất cả khách hàng |
| `churnRate` | Float | Tỷ lệ rời bỏ (%). Tính = `(khách CHURNED / tổng khách hàng) * 100` |
| `engagementDistribution` | Array | Phân bổ mức độ tương tác (theo số đơn hàng) |
| `topCustomersByRevenue` | Array | Top khách hàng theo doanh thu |

### Chi tiết các sub-types

#### `customersByTier[]` — `CustomerTierStatsItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `tier` | String | Hạng khách hàng: `VIP`, `PREMIUM`, `STANDARD`, `BASIC`, `NONE`. Tính đến thời điểm `endDate` |
| `count` | Int | Số lượng khách hàng ở hạng này |
| `totalLtv` | Float | Tổng LTV (Lifetime Value) của khách hàng ở hạng này (VND). Tính = `SUM(customerLtv)` |

#### `customerGrowth[]` — `CustomerGrowthItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `period` | String | Tháng (ISO timestamp) |
| `newCustomers` | Int | Số khách hàng mới trong tháng (dựa trên `createdAt`) |
| `churnedCustomers` | Int | Số khách hàng rời bỏ trong tháng (hiện tại = `0`, chưa implement tracking churned theo tháng) |
| `netGrowth` | Int | Tăng trưởng ròng = `newCustomers - churnedCustomers` |

#### `engagementDistribution[]` — `EngagementDistributionItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `range` | String | Khoảng số đơn hàng: `"0 orders"`, `"1-5 orders"`, `"6-20 orders"`, `"20+ orders"` |
| `count` | Int | Số khách hàng thuộc khoảng tương tác này. Tính = `COUNT(DISTINCT customerId)` qua JOIN với `mktOrder` |

#### `topCustomersByRevenue[]` — `TopCustomerByRevenueItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `name` | String | Tên khách hàng |
| `revenue` | Float | Tổng doanh thu từ đơn hàng `COMPLETED` trong kỳ (VND) |
| `orderCount` | Int | Số đơn hàng `COMPLETED` trong kỳ |

---

## 5. kpiScorecard

Bảng đánh giá KPI theo năm với phân tích theo danh mục và xu hướng theo quý.

### Input: `KpiScorecardInput`

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `period` | String | Yes | Khoảng thời gian (ít dùng, chủ yếu dùng `year`) |
| `departmentId` | String | No | Lọc theo phòng ban |
| `year` | Int | No | Năm đánh giá (mặc định: năm hiện tại) |
| `category` | String | No | Lọc theo danh mục KPI |

### Output: `KpiScorecardOutput`

```graphql
query {
  kpiScorecard(input: { period: "THIS_YEAR" }) {
    overallAchievementRate
    kpisByCategory {
      category
      kpis { name target actual progress status }
    }
    trends { period achievementRate }
  }
}
```

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `overallAchievementRate` | Float | Tỷ lệ đạt KPI tổng thể (%). Tính = `(tổng KPI ACHIEVED+EXCEEDED / tổng KPI) * 100` |
| `kpisByCategory` | Array | KPI phân nhóm theo danh mục |
| `trends` | Array | Xu hướng đạt KPI theo quý |

### Chi tiết các sub-types

#### `kpisByCategory[]` — `KpiCategoryGroup`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `category` | String | Danh mục KPI. VD: `"SALES"`, `"CUSTOMER"`, `"OPERATIONAL"`, `"FINANCIAL"` |
| `kpis` | Array | Danh sách KPI trong danh mục |

#### `kpis[]` — `KpiDetailItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `name` | String | Tên KPI (từ `mktKpi.kpiName`) |
| `target` | Float | Giá trị mục tiêu (`mktKpi.targetValue`) |
| `actual` | Float | Giá trị thực tế đạt được (`mktKpi.actualValue`) |
| `progress` | Float | Tiến độ (%). Công thức: `(actual / target) * 100`. Trả về `0` nếu target = 0 |
| `status` | String | Trạng thái KPI: `DRAFT`, `IN_PROGRESS`, `ACHIEVED`, `EXCEEDED`, `NOT_ACHIEVED` |

#### `trends[]` — `KpiTrendItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `period` | String | Quý. VD: `"Q1"`, `"Q2"`, `"Q3"`, `"Q4"` |
| `achievementRate` | Float | Tỷ lệ đạt KPI trong quý (%). Chỉ tính KPI có `periodQuarter` != NULL |

---

## 6. staffLeaderboard

Bảng xếp hạng nhân viên dựa trên nhiều chỉ số hiệu suất.

### Input: `LeaderboardInput`

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `period` | String | Yes | Khoảng thời gian |
| `departmentId` | String | No | Lọc theo phòng ban |
| `startDate` | String | No | Ngày bắt đầu (khi period = "CUSTOM") |
| `endDate` | String | No | Ngày kết thúc (khi period = "CUSTOM") |
| `limit` | Int | No | Số nhân viên trả về (mặc định: 20, tối đa: 50) |
| `offset` | Int | No | Vị trí bắt đầu cho phân trang (mặc định: 0) |

### Output: `StaffLeaderboardOutput`

```graphql
query {
  staffLeaderboard(input: { period: "THIS_YEAR" }) {
    rankings {
      rank staffName departmentName
      revenue orderCount newCustomers
      kpiAchievement overallScore
    }
    period { start end }
  }
}
```

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `rankings` | Array | Danh sách nhân viên xếp hạng |
| `period` | Object | Khoảng thời gian đánh giá |

### Chi tiết các sub-types

#### `rankings[]` — `LeaderboardRankingItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `rank` | Int | Thứ hạng (1 = cao nhất). Xếp hạng theo tổng doanh thu giảm dần |
| `staffName` | String | Tên nhân viên (`nameFirstName + nameLastName`) |
| `departmentName` | String | Tên phòng ban. Trả về `""` nếu nhân viên chưa thuộc phòng ban nào |
| `revenue` | Float | Tổng doanh thu từ đơn hàng `COMPLETED` trong kỳ (VND) |
| `orderCount` | Int | Số đơn hàng `COMPLETED` trong kỳ |
| `newCustomers` | Int | Số khách hàng mới mà nhân viên phụ trách trong kỳ. Liên kết qua `mktCustomer.accountOwnerId` |
| `kpiAchievement` | Float | Tỷ lệ đạt KPI cá nhân (%). Tính = `(KPI ACHIEVED+EXCEEDED / tổng KPI được giao) * 100`. Chỉ tính KPI trong năm hiện tại |
| `overallScore` | Float | Điểm tổng hợp. Được tính từ weighted average của các chỉ số trên |

> **Lưu ý**: Chỉ hiển thị nhân viên có ít nhất 1 trong 3 chỉ số > 0 (order_count, new_customers, kpi_achievement).

#### `period` — `LeaderboardPeriod`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `start` | String | Ngày bắt đầu kỳ đánh giá (ISO format) |
| `end` | String | Ngày kết thúc kỳ đánh giá (ISO format) |

---

## 7. dashboardAlerts

Danh sách cảnh báo quan trọng cần chú ý. Không yêu cầu input (không có tham số period).

### Input: Không có

### Output: `AlertsOutput`

```graphql
query {
  dashboardAlerts {
    overdueOrders { id orderCode daysOverdue }
    expiringContracts { id name daysToExpiry }
    pendingPayments { id name amount daysPending }
    underperformingKpis { kpiName progress target }
  }
}
```

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `overdueOrders` | Array | Đơn hàng quá hạn thanh toán |
| `expiringContracts` | Array | Hợp đồng sắp hết hạn (trong 30 ngày) |
| `pendingPayments` | Array | Thanh toán đang chờ xử lý |
| `underperformingKpis` | Array | KPI đang có hiệu suất thấp (< 50% mục tiêu) |

### Chi tiết các sub-types

#### `overdueOrders[]` — `OverdueOrderItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `id` | String | ID đơn hàng (UUID) |
| `orderCode` | String | Mã đơn hàng (VD: `"ORD-001"`) |
| `daysOverdue` | Int | Số ngày quá hạn. Tính = `NOW() - paymentDeadline`. Chỉ lấy đơn có status `LOCKED` hoặc `PROCESSING` |

#### `expiringContracts[]` — `ExpiringContractItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `id` | String | ID hợp đồng (UUID) |
| `name` | String | Tên hợp đồng |
| `daysToExpiry` | Int | Số ngày còn lại trước khi hết hạn. Tính = `endDate - CURRENT_DATE`. Chỉ lấy hợp đồng hết hạn trong 30 ngày tới và status != `TERMINATED` |

#### `pendingPayments[]` — `PendingPaymentItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `id` | String | ID thanh toán (UUID) |
| `name` | String | Mã đơn hàng liên quan (từ `mktOrder.orderCode`). Trả về `"N/A"` nếu không có đơn hàng liên kết |
| `amount` | Float | Số tiền thanh toán (VND) |
| `daysPending` | Int | Số ngày chờ xử lý. Tính = `NOW() - createdAt`. Chỉ lấy thanh toán có status `PENDING` hoặc `PROCESSING` |

#### `underperformingKpis[]` — `UnderperformingKpiItem`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `kpiName` | String | Tên KPI |
| `progress` | Float | Tiến độ hiện tại (%). Công thức: `(actualValue / targetValue) * 100` |
| `target` | Float | Giá trị mục tiêu. Chỉ lấy KPI có status `IN_PROGRESS` hoặc `DRAFT`, trong năm hiện tại, và tiến độ < 50% |

---

## Nguồn dữ liệu

Bảng tổng hợp các bảng database được sử dụng bởi từng query:

| Query | Bảng chính | Bảng liên kết |
|-------|-----------|--------------|
| `dashboardSummary` | Tổng hợp tất cả | - |
| `revenueStats` | `mktOrder` | `workspaceMember`, `mktDepartment` |
| `orderStats` | `mktOrder` | `mktOrderItem` |
| `customerStats` | `mktCustomer` | `mktOrder` |
| `kpiScorecard` | `mktKpi` | - |
| `staffLeaderboard` | `workspaceMember` | `mktOrder`, `mktCustomer`, `mktKpi`, `mktDepartment` |
| `dashboardAlerts` | `mktOrder`, `mktContract`, `mktPayment`, `mktKpi` | `mktOrder` (cho pendingPayments) |

---

## Giới hạn mặc định

Các giới hạn được cấu hình trong `DASHBOARD_LIMITS`:

| Tham số | Giá trị | Áp dụng cho |
|---------|---------|-------------|
| `TOP_CUSTOMERS` | 10 | Số khách hàng top trong customerStats |
| `TOP_PRODUCTS` | 10 | Số sản phẩm top trong orderStats |
| `REVENUE_BY_PERIOD_MAX` | 12 | Số tháng tối đa trong revenueByPeriod/orderTrend |
| `KPIS_PER_CATEGORY` | 20 | Số KPI tối đa mỗi category |
| `LEADERBOARD_MAX` | 50 | Số nhân viên tối đa trong leaderboard |
| `OVERDUE_ORDERS` | 20 | Số cảnh báo đơn quá hạn |
| `EXPIRING_CONTRACTS` | 20 | Số cảnh báo hợp đồng sắp hết hạn |
| `PENDING_PAYMENTS` | 20 | Số cảnh báo thanh toán chờ |
| `UNDERPERFORMING_KPIS` | 10 | Số cảnh báo KPI yếu |
