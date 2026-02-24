# Dashboard API - Frontend Developer Guide

## Overview

API GraphQL cung cấp dữ liệu tổng hợp cho bảng điều khiển (Dashboard) của hệ thống CRM. Module bao gồm 10 query endpoints cung cấp các chỉ số về doanh thu, đơn hàng, khách hàng, KPI, xếp hạng nhân viên, cảnh báo và doanh thu theo ngày/tuần/tháng/quý.

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Bearer Token (bắt buộc)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Resolver:** `DashboardQueryResolver`
**Resource RBAC:** `DASHBOARD` (Phân loại dữ liệu: `INTERNAL` - tất cả nhân viên có thể đọc)

---

## API Categories

### Query APIs (8 endpoints)

| # | Query | Mức kiểm toán | Mô tả |
|---|-------|-------------|-------|
| 1 | `dashboardSummary` | `low` | Tổng hợp tất cả metrics (revenue, order, customer, KPI, payment, contract, alerts) |
| 2 | `revenueStats` | `medium` | Doanh thu theo kỳ, nhân viên, phòng ban. Hỗ trợ so sánh kỳ trước & dự kiến |
| 3 | `orderStats` | `medium` | Đơn hàng theo trạng thái, xu hướng, top sản phẩm, doanh thu sản phẩm theo kỳ |
| 4 | `customerStats` | `medium` | Khách hàng theo tier, tăng trưởng, LTV, churn rate, top khách hàng |
| 5 | `kpiScorecard` | `medium` | KPI theo danh mục, chi tiết, xu hướng |
| 6 | `staffLeaderboard` | `medium` | Xếp hạng nhân viên theo doanh thu, đơn hàng, khách hàng |
| 7 | `dashboardAlerts` | `low` | Cảnh báo: đơn hàng quá hạn, hợp đồng sắp hết, thanh toán chờ xử lý, KPI kém |
| 8 | `revenueDailyByWeek` | `medium` | Doanh thu chi tiết theo ngày trong tuần (ISO week). Hỗ trợ CASH/ORDER/DUAL, phân tách theo team/phòng ban |
| 9 | `revenueDailyByMonth` | `medium` | Doanh thu theo thang, breakdown theo tuan. Tuan bien chi gom ngay thuoc thang. Ho tro CASH/ORDER/DUAL, phan tach theo team/phong ban |
| 10 | `revenueDailyByQuarter` | `medium` | Doanh thu theo quy, breakdown theo 3 thang. Moi thang co totalRevenue + dailyRevenue. Ho tro CASH/ORDER/DUAL, phan tach theo team/phong ban |

---

## Shared Concepts

### DashboardPeriod Enum

Tất cả 6/7 queries (trừ `dashboardAlerts`) yêu cầu tham số `period`:

| Giá trị | Mô tả | DATE_TRUNC Interval |
|--------|-------|-------------------|
| `TODAY` | Hôm nay | `hour` |
| `THIS_WEEK` | Tuần này | `day` |
| `THIS_MONTH` | Tháng này | `week` |
| `THIS_QUARTER` | Quý này | `month` |
| `THIS_YEAR` | Năm này | `month` |
| `CUSTOM` | Tùy chỉnh (cần `startDate` + `endDate`) | `month` |

> **DATE_TRUNC Interval** quyết định độ chi tiết của dữ liệu tìme-series (revenueByPeriod, orderTrend, customerGrowth, productRevenueTrend). Ví dụ: period = `THIS_WEEK` sẽ trả dữ liệu nhóm theo **ngày**, period = `THIS_MONTH` sẽ nhóm theo **tuần**.

### RevenueMode Enum (Dual-Metric)

Query `revenueStats` hỗ trợ tham số `revenueMode` để chọn chế độ tính doanh thu:

| Giá trị | Mô tả | Tương thích ngược |
|--------|-------|---------------------|
| `DUAL` | Hiển thị song song Cash + Order kèm gap analysis | **Mặc định** — frontend cũ không gửi field này vẫn hoạt động |
| `CASH` | Chỉ doanh thu đã thu (mktPayment.confirmedAt) | |
| `ORDER` | Chỉ doanh số đơn hàng (mktOrder.completedAt) | |

> **Dual-Metric Revenue:** Hệ thống hỗ trợ 2 góc nhìn doanh thu:
> - **Cash Basis (Collected):** Tiền thực tế đã thu — dựa trên `mktPayment.confirmedAt`
> - **Order Basis (Accrual):** Doanh số đơn hàng hoàn tất — dựa trên `mktOrder.completedAt`
>
> Khi `revenueMode = DUAL`, response trả về cả 2 bộ chỉ số (`collected`, `order`) kèm `gap` analysis (tỷ lệ thu tiền, chênh lệch, số ngày thu tiền trung bình).

### DepartmentScope Enum

Query `revenueDailyByWeek` hỗ trợ tham số `departmentScope` để chọn cách nhóm dữ liệu theo phòng ban:

| Giá trị | Mô tả |
|--------|-------|
| `ALL` | Tổng hợp toàn bộ, không phân tách theo phòng ban. **Mặc định** |
| `BY_TEAM` | Phân tách theo team (departmentType = TEAM) |
| `BY_DEPARTMENT` | Phân tách theo phòng ban (departmentType = DEPARTMENT) |

> Khi `departmentScope != ALL`, response trả về `departmentBreakdown[]` với doanh thu chi tiết từng ngày của mỗi phòng ban/team.

### Department Filtering

Khi truyền `departmentId`, hệ thống tự động resolve hierarchy (phòng ban + tất cả team con) và lọc dữ liệu tương ứng. Có mặt ở 7/8 endpoints (trừ `dashboardAlerts`).

### Staff Filtering

Khi truyền `staffId` (workspaceMemberId), hệ thống chỉ trả dữ liệu của nhân viên đó. Chỉ có ở `revenueStats` và `staffLeaderboard`.

---

## Queries

### 1. dashboardSummary

Lấy toàn bộ dữ liệu tổng hợp của dashboard trong 1 request. Bao gồm: revenue, orders, customers, payments, KPIs, contracts, alerts.

**Query:**
```graphql
query DashboardSummary($input: DashboardSummaryInput!) {
  dashboardSummary(input: $input) {
    period {
      start
      end
      periodType
    }
    revenue {
      totalRevenue
      previousPeriodRevenue
      percentageChange
      trend
      revenueByMonth {
        period
        amount
      }
      # ─── Dual-Metric fields (v1.1) ─────────────
      collectedRevenue
      orderRevenue
      collectionRate
      revenueGap
      collectedByMonth {
        period
        amount
        orderCount
      }
      orderByMonth {
        period
        amount
        orderCount
      }
    }
    orders {
      totalOrders
      ordersByStatus {
        status
        count
        totalAmount
      }
      newOrdersThisPeriod
      previousPeriodOrders
      percentageChange
      averageOrderValue
    }
    customers {
      totalCustomers
      newCustomersThisPeriod
      previousPeriodNewCustomers
      percentageChange
      customersByTier {
        tier
        count
      }
      customersByLifecycle {
        stage
        count
      }
      churnRate
      topCustomers {
        id
        name
        totalOrderValue
        tier
      }
    }
    payments {
      totalCollected
      pendingAmount
      collectionRate
      paymentsByStatus {
        status
        count
        amount
      }
      overduePayments
    }
    kpis {
      totalKpis
      achievedCount
      inProgressCount
      achievementRate
      kpisByCategory {
        category
        total
        achieved
        rate
      }
      topKpis {
        kpiName
        targetValue
        actualValue
        progress
      }
    }
    contracts {
      totalActive
      expiringThisMonth
      newThisPeriod
    }
    alerts {
      overdueOrders {
        id
        orderCode
        daysOverdue
      }
      expiringContracts {
        id
        name
        daysToExpiry
      }
      pendingPayments {
        id
        name
        amount
        daysPending
      }
      underperformingKpis {
        kpiName
        progress
        target
      }
    }
  }
}
```

**Biến (tối thiểu):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Biến (đầy đủ):**
```json
{
  "input": {
    "period": "THIS_MONTH",
    "departmentId": "dept-uuid-here",
    "startDate": "2026-01-01",
    "endDate": "2026-01-31",
    "filters": {
      "customKey": "customValue"
    }
  }
}
```

**Tham số đầu vào:**

| Trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Có** | - | Kỳ báo cáo (TODAY, THIS_WEEK, THIS_MONTH, THIS_QUARTER, THIS_YEAR, CUSTOM) |
| `departmentId` | String | Không | `null` | Lọc theo phòng ban (tự động bao gồm team con) |
| `startDate` | String | Không | `null` | Ngày bắt đầu (dùng với period = CUSTOM) |
| `endDate` | String | Không | `null` | Ngày kết thúc (dùng với period = CUSTOM) |
| `filters` | JSON | Không | `null` | Bộ lọc tùy chỉnh |

**Phản hồi thành công:**
```json
{
  "data": {
    "dashboardSummary": {
      "period": {
        "start": "2026-02-01T00:00:00.000Z",
        "end": "2026-02-28T23:59:59.999Z",
        "periodType": "THIS_MONTH"
      },
      "revenue": {
        "totalRevenue": 11000000000,
        "previousPeriodRevenue": 9500000000,
        "percentageChange": 15.79,
        "trend": "UP",
        "revenueByMonth": [
          { "period": "1738368000000", "amount": 3500000000 },
          { "period": "1738972800000", "amount": 4200000000 },
          { "period": "1739577600000", "amount": 3300000000 }
        ],
        "collectedRevenue": 1046100000,
        "orderRevenue": 6604000000,
        "collectionRate": 15.84,
        "revenueGap": 5557900000,
        "collectedByMonth": [
          { "period": "1738368000000", "amount": 0, "orderCount": 0 },
          { "period": "1738972800000", "amount": 618100000, "orderCount": 8 },
          { "period": "1739577600000", "amount": 428000000, "orderCount": 6 }
        ],
        "orderByMonth": [
          { "period": "1738368000000", "amount": 4449950000, "orderCount": 10 },
          { "period": "1738972800000", "amount": 2154050000, "orderCount": 11 },
          { "period": "1739577600000", "amount": 0, "orderCount": 0 }
        ]
      },
      "orders": {
        "totalOrders": 150,
        "ordersByStatus": [
          { "status": "COMPLETED", "count": 85, "totalAmount": 8500000000 },
          { "status": "PENDING", "count": 40, "totalAmount": 1800000000 },
          { "status": "CONFIRMED", "count": 25, "totalAmount": 700000000 }
        ],
        "newOrdersThisPeriod": 45,
        "previousPeriodOrders": 38,
        "percentageChange": 18.42,
        "averageOrderValue": 73333333
      },
      "customers": {
        "totalCustomers": 320,
        "newCustomersThisPeriod": 18,
        "previousPeriodNewCustomers": 12,
        "percentageChange": 50.0,
        "customersByTier": [
          { "tier": "DIAMOND", "count": 15 },
          { "tier": "GOLD", "count": 45 },
          { "tier": "SILVER", "count": 80 },
          { "tier": "STANDARD", "count": 180 }
        ],
        "customersByLifecycle": [
          { "stage": "ACTIVE", "count": 280 },
          { "stage": "INACTIVE", "count": 40 }
        ],
        "churnRate": 2.5,
        "topCustomers": [
          { "id": "cust-001", "name": "TechCorp VN", "totalOrderValue": 2500000000, "tier": "DIAMOND" }
        ]
      },
      "payments": {
        "totalCollected": 9200000000,
        "pendingAmount": 1800000000,
        "collectionRate": 83.64,
        "paymentsByStatus": [
          { "status": "COMPLETED", "count": 85, "amount": 9200000000 },
          { "status": "PENDING", "count": 15, "amount": 1800000000 }
        ],
        "overduePayments": 3
      },
      "kpis": {
        "totalKpis": 24,
        "achievedCount": 18,
        "inProgressCount": 6,
        "achievementRate": 75.0,
        "kpisByCategory": [
          { "category": "SALES", "total": 10, "achieved": 8, "rate": 80.0 }
        ],
        "topKpis": [
          { "kpiName": "Doanh thu thang", "targetValue": 10000000000, "actualValue": 11000000000, "progress": 110.0 }
        ]
      },
      "contracts": {
        "totalActive": 95,
        "expiringThisMonth": 5,
        "newThisPeriod": 12
      },
      "alerts": {
        "overdueOrders": [
          { "id": "order-001", "orderCode": "ORD-2026-0142", "daysOverdue": 5 }
        ],
        "expiringContracts": [
          { "id": "contract-001", "name": "TechCorp License Agreement", "daysToExpiry": 7 }
        ],
        "pendingPayments": [
          { "id": "payment-001", "name": "Invoice #INV-2026-055", "amount": 150000000, "daysPending": 12 }
        ],
        "underperformingKpis": [
          { "kpiName": "Số khách hàng mới", "progress": 45.0, "target": 100.0 }
        ]
      }
    }
  }
}
```

> **Lưu ý về cáche:** Response được cáche theo `period` + `departmentId` + `filters`. Cùng `period` nhưng khác `departmentId` sẽ trả kết quả khác nhau.

---

### 2. revenueStats

Lấy chi tiết thống kê doanh thu: theo thời gian, phòng ban, nhân viên. Hỗ trợ so sánh với kỳ trước và dự báo doanh thu.

**Query (Dual-Metric — được khuyên dùng):**
```graphql
query RevenueStats($input: RevenueStatsInput!) {
  revenueStats(input: $input) {
    # ─── Backward compatible fields ────────────────
    totalRevenue
    revenueByPeriod {
      period
      amount
      orderCount
    }
    revenueByDepartment {
      departmentName
      amount
      percentage
    }
    revenueByStaff {
      staffName
      amount
      orderCount
      rank
    }
    growthRate
    projectedRevenue

    # ─── Dual-Metric fields (v1.1) ────────────────
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

**Biến (tối thiểu — tương thích ngược, revenueMode mặc định = DUAL):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Biến (chỉ định revenueMode):**
```json
{
  "input": {
    "period": "THIS_MONTH",
    "revenueMode": "DUAL"
  }
}
```

**Biến (chỉ xem doanh thu đã thu):**
```json
{
  "input": {
    "period": "THIS_MONTH",
    "revenueMode": "CASH"
  }
}
```

**Biến (lọc theo phòng ban):**
```json
{
  "input": {
    "period": "THIS_QUARTER",
    "departmentId": "dept-sales-uuid"
  }
}
```

**Biến (lọc theo nhân viên cụ thể):**
```json
{
  "input": {
    "period": "THIS_MONTH",
    "staffId": "workspace-member-uuid",
    "limit": 5
  }
}
```

**Biến (khoảng thời gian tùy chỉnh):**
```json
{
  "input": {
    "period": "CUSTOM",
    "startDate": "2026-01-01",
    "endDate": "2026-01-31",
    "limit": 20
  }
}
```

**Tham số đầu vào:**

| Trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Yes** | - | Kỳ báo cáo |
| `revenueMode` | RevenueMode | No | `DUAL` | Chế độ tinh doanh thu: `CASH`, `ORDER`, `DUAL` |
| `departmentId` | String | No | `null` | Lọc theo phòng ban (+ team con) |
| `staffId` | String | No | `null` | Lọc theo nhân viên cu thế(workspaceMemberId) |
| `startDate` | String | No | `null` | Ngày bắt đầu (dùng với CUSTOM) |
| `endDate` | String | No | `null` | Ngày kết thúc (dùng với CUSTOM) |
| `limit` | Int | No | `10` | Số lượng top nhân viên trả về (min: 1) |

**Response Success (revenueMode = DUAL — mặc định):**
```json
{
  "data": {
    "revenueStats": {
      "totalRevenue": 1046100000,
      "revenueByPeriod": [
        { "period": "1738368000000", "amount": 0, "orderCount": 0 },
        { "period": "1738972800000", "amount": 618100000, "orderCount": 8 },
        { "period": "1739577600000", "amount": 428000000, "orderCount": 6 }
      ],
      "revenueByDepartment": [
        { "departmentName": "Frontend", "amount": 373100000, "percentage": 35.67 },
        { "departmentName": "Kinh doanh", "amount": 345000000, "percentage": 32.98 }
      ],
      "revenueByStaff": [
        { "staffName": "Jony Ive", "amount": 373100000, "orderCount": 5, "rank": 1 },
        { "staffName": "Tim Cook", "amount": 345000000, "orderCount": 4, "rank": 2 }
      ],
      "growthRate": 100,
      "projectedRevenue": null,
      "collected": {
        "totalRevenue": 1046100000,
        "revenueByPeriod": [
          { "period": "1738368000000", "amount": 0, "orderCount": 0 },
          { "period": "1738972800000", "amount": 618100000, "orderCount": 8 }
        ],
        "revenueByDepartment": [
          { "departmentName": "Frontend", "amount": 373100000, "percentage": 35.67 }
        ],
        "revenueByStaff": [
          { "staffName": "Jony Ive", "amount": 373100000, "orderCount": 5, "rank": 1 }
        ],
        "growthRate": 100,
        "projectedRevenue": null
      },
      "order": {
        "totalRevenue": 6604000000,
        "revenueByPeriod": [
          { "period": "1738368000000", "amount": 4449950000, "orderCount": 10 },
          { "period": "1738972800000", "amount": 2154050000, "orderCount": 11 }
        ],
        "revenueByDepartment": [
          { "departmentName": "Frontend", "amount": 2500000000, "percentage": 37.86 }
        ],
        "revenueByStaff": [
          { "staffName": "Jony Ive", "amount": 2500000000, "orderCount": 8, "rank": 1 }
        ],
        "growthRate": 48.41,
        "projectedRevenue": null
      },
      "gap": {
        "collectionRate": 15.84,
        "revenueGap": 5557900000,
        "avgCollectionDays": 13.75
      }
    }
  }
}
```

**Response Success (revenueMode = CASH — chỉ cash):**
```json
{
  "data": {
    "revenueStats": {
      "totalRevenue": 1046100000,
      "revenueByPeriod": [ ... ],
      "growthRate": 100,
      "collected": {
        "totalRevenue": 1046100000,
        "revenueByPeriod": [ ... ],
        "growthRate": 100,
        "projectedRevenue": null
      },
      "order": null,
      "gap": null
    }
  }
}
```

**Response Success (revenueMode = ORDER — chỉ order):**
```json
{
  "data": {
    "revenueStats": {
      "totalRevenue": 6604000000,
      "revenueByPeriod": [ ... ],
      "growthRate": 48.41,
      "collected": null,
      "order": {
        "totalRevenue": 6604000000,
        "revenueByPeriod": [ ... ],
        "growthRate": 48.41,
        "projectedRevenue": null
      },
      "gap": null
    }
  }
}
```

**Ghi chú:**
- `period` trong `revenueByPeriod` làtimestamp (milliseconds) dạng string. Frontend cần convert: `new Date(Number(period))`.
- `projectedRevenue` có thể là `null` nếu đãhết kỳ (ví dụ: period = THIS_MONTH vàhôm nay làngày cuối tháng).
- `growthRate` là% thay đổi so vớikỳ trước. Gia tri âm= giảm. Gia tri `100` khi kỳ trước = 0.
- Khi truyền `departmentId`, `revenueByDepartment` chi hiển thị các team con (team revenue breakdown).
- **Backward compatible:** Các field góc (`totalRevenue`, `revenueByPeriod`, ...) vẫn hoạt động. Khi mode = DUAL/CASH, chúngtrả dữ liệu cash basis. Khi mode = ORDER, chúngtrả dữ liệu order basis.
- **`collected`** = null khi `revenueMode = ORDER`.
- **`order`** = null khi `revenueMode = CASH`.
- **`gap`** chỉ có khi `revenueMode = DUAL` (cần cả 2 bộ dữ liệu đểso sánh).

---

### 3. orderStats

Lấy thống kê đơn hàng: phân bố theo trạng thái, xu hướng theo thời gian, top sản phẩm, giá trị trung bình, doanh thu sản phẩm theo kỳ.

**Query:**
```graphql
query OrderStats($input: OrderStatsInput!) {
  orderStats(input: $input) {
    ordersByStatus {
      status
      count
      totalAmount
    }
    orderTrend {
      period
      count
      amount
    }
    averageOrderValue
    averageProcessingTime
    conversionRate
    topProducts {
      productName
      quantity
      revenue
    }
    productRevenueTrend {
      period
      productName
      quantity
      revenue
    }
  }
}
```

**Biến (tối thiểu):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Biến (đầy đủ):**
```json
{
  "input": {
    "period": "THIS_QUARTER",
    "departmentId": "dept-uuid",
    "topProductsLimit": 5
  }
}
```

**Tham số đầu vào:**

| Trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Yes** | - | Kỳ báo cáo |
| `departmentId` | String | No | `null` | Lọc theo phòng ban (+ team con) |
| `startDate` | String | No | `null` | Ngày bắt đầu (dùng với CUSTOM) |
| `endDate` | String | No | `null` | Ngày kết thúc (dùng với CUSTOM) |
| `topProductsLimit` | Int | No | `10` | Số lượng top sản phẩm trả về (min: 1) |

**Phản hồi thành công:**
```json
{
  "data": {
    "orderStats": {
      "ordersByStatus": [
        { "status": "COMPLETED", "count": 85, "totalAmount": 8500000000 },
        { "status": "PENDING", "count": 40, "totalAmount": 1800000000 },
        { "status": "CONFIRMED", "count": 15, "totalAmount": 500000000 },
        { "status": "BLOCKED", "count": 5, "totalAmount": 120000000 },
        { "status": "OVERDUE", "count": 5, "totalAmount": 80000000 }
      ],
      "orderTrend": [
        { "period": "1738368000000", "count": 48, "amount": 3500000000 },
        { "period": "1738972800000", "count": 55, "amount": 4200000000 },
        { "period": "1739577600000", "count": 47, "amount": 3300000000 }
      ],
      "averageOrderValue": 73333333,
      "averageProcessingTime": 3.5,
      "conversionRate": 56.67,
      "topProducts": [
        { "productName": "MKT Enterprise License", "quantity": 120, "revenue": 3600000000 },
        { "productName": "MKT Pro License", "quantity": 85, "revenue": 1700000000 },
        { "productName": "MKT Standard License", "quantity": 200, "revenue": 1000000000 }
      ],
      "productRevenueTrend": [
        { "period": "1738368000000", "productName": "MKT Enterprise License", "quantity": 40, "revenue": 1200000000 },
        { "period": "1738368000000", "productName": "MKT Pro License", "quantity": 30, "revenue": 600000000 },
        { "period": "1738972800000", "productName": "MKT Enterprise License", "quantity": 45, "revenue": 1350000000 },
        { "period": "1738972800000", "productName": "MKT Pro License", "quantity": 28, "revenue": 560000000 }
      ]
    }
  }
}
```

**Ghi chú:**
- `averageProcessingTime` đơn vị là **ngày** (tính từ lúc tạo đơn đến khi COMPLETED).
- `conversionRate` là % đơn hang COMPLETED / tổng đơn hàng.
- `topProducts` trả về sản phẩm có doanh thu cao nhất trong kỳ.
- `productRevenueTrend` trả về doanh thu theo sản phẩm + theo kỳ thời gian (kết hợp). Dữ liệu sắp xếp theo period ASC, trong mỗi period sắp xếp theo revenue DESC.
- `period` trong `orderTrend` và `productRevenueTrend` là timestamp (milliseconds) dạng string.

---

### 4. customerStats

Lấy thống kê khách hàng: phân bố theo tier, tăng trưởng, LTV, churn rate, top khách hàng.

**Query:**
```graphql
query CustomerStats($input: CustomerStatsInput!) {
  customerStats(input: $input) {
    customersByTier {
      tier
      count
      totalLtv
    }
    customerGrowth {
      period
      newCustomers
      churnedCustomers
      netGrowth
    }
    averageLtv
    churnRate
    engagementDistribution {
      range
      count
    }
    topCustomersByRevenue {
      name
      revenue
      orderCount
    }
  }
}
```

**Biến (tối thiểu):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Biến (đầy đủ):**
```json
{
  "input": {
    "period": "THIS_QUARTER",
    "departmentId": "dept-uuid",
    "topCustomersLimit": 5
  }
}
```

**Tham số đầu vào:**

| Trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Yes** | - | Kỳ báo cáo |
| `departmentId` | String | No | `null` | Lọc theo phòng ban (+ team con) |
| `startDate` | String | No | `null` | Ngày bắt đầu (dùng với CUSTOM) |
| `endDate` | String | No | `null` | Ngày kết thúc (dùng với CUSTOM) |
| `topCustomersLimit` | Int | No | `10` | Số lượng top khách hàng trả về (min: 1) |

**Phản hồi thành công:**
```json
{
  "data": {
    "customerStats": {
      "customersByTier": [
        { "tier": "DIAMOND", "count": 15, "totalLtv": 45000000000 },
        { "tier": "GOLD", "count": 45, "totalLtv": 67500000000 },
        { "tier": "SILVER", "count": 80, "totalLtv": 40000000000 },
        { "tier": "STANDARD", "count": 180, "totalLtv": 18000000000 }
      ],
      "customerGrowth": [
        { "period": "1738368000000", "newCustomers": 8, "churnedCustomers": 1, "netGrowth": 7 },
        { "period": "1738972800000", "newCustomers": 6, "churnedCustomers": 0, "netGrowth": 6 },
        { "period": "1739577600000", "newCustomers": 4, "churnedCustomers": 2, "netGrowth": 2 }
      ],
      "averageLtv": 534375000,
      "churnRate": 2.5,
      "engagementDistribution": [
        { "range": "0-30", "count": 45 },
        { "range": "31-90", "count": 120 },
        { "range": "91-180", "count": 95 },
        { "range": "180+", "count": 60 }
      ],
      "topCustomersByRevenue": [
        { "name": "TechCorp VN", "revenue": 2500000000, "orderCount": 12 },
        { "name": "Digital Solutions", "revenue": 1800000000, "orderCount": 8 },
        { "name": "CloudFirst Ltd", "revenue": 1200000000, "orderCount": 6 }
      ]
    }
  }
}
```

**Ghi chú:**
- `customerGrowth` sử dụng dynamic DATE_TRUNC tương tự revenueByPeriod (TODAY=hour, THIS_WEEK=day, THIS_MONTH=week, ...).
- `churnRate` là% khách hàng rời bỏ trong kỳ.
- `engagementDistribution` phân bố theo so ngày hoat dong.
- `period` trong `customerGrowth` làtimestamp (milliseconds) dạng string.

---

### 5. kpiScorecard

Lấy bang diem KPI: tỷ lệ dat tổng, chi tiết theo danh muc, xu hướng KPI.

**Query:**
```graphql
query KpiScorecard($input: KpiScorecardInput!) {
  kpiScorecard(input: $input) {
    overallAchievementRate
    kpisByCategory {
      category
      kpis {
        name
        target
        actual
        progress
        status
      }
    }
    trends {
      period
      achievementRate
    }
  }
}
```

**Biến (tối thiểu):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Biến (đầy đủ):**
```json
{
  "input": {
    "period": "THIS_YEAR",
    "departmentId": "dept-uuid",
    "year": 2026,
    "category": "SALES"
  }
}
```

**Tham số đầu vào:**

| Trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Yes** | - | Kỳ báo cáo |
| `departmentId` | String | No | `null` | Lọc theo phòng ban (+ team con) |
| `year` | Int | No | `null` | Lọc theo nam (ví dụ: 2026) |
| `category` | String | No | `null` | Lọc theo danh muc KPI (ví dụ: SALES, MARKETING) |

**Phản hồi thành công:**
```json
{
  "data": {
    "kpiScorecard": {
      "overallAchievementRate": 75.0,
      "kpisByCategory": [
        {
          "category": "SALES",
          "kpis": [
            { "name": "Doanh thu thang", "target": 10000000000, "actual": 11000000000, "progress": 110.0, "status": "ACHIEVED" },
            { "name": "Số đơn hàng mới", "target": 50, "actual": 45, "progress": 90.0, "status": "IN_PROGRESS" }
          ]
        },
        {
          "category": "MARKETING",
          "kpis": [
            { "name": "Số khách hàng mới", "target": 20, "actual": 18, "progress": 90.0, "status": "IN_PROGRESS" }
          ]
        }
      ],
      "trends": [
        { "period": "2026-01", "achievementRate": 72.0 },
        { "period": "2026-02", "achievementRate": 75.0 }
      ]
    }
  }
}
```

---

### 6. staffLeaderboard

Lấy bang xếp hạng nhân viên theo hieu suat: doanh thu, đơn hàng, khách hàng mới, KPI. Ho tro phân trang.

**Query:**
```graphql
query StaffLeaderboard($input: LeaderboardInput!) {
  staffLeaderboard(input: $input) {
    rankings {
      rank
      staffName
      departmentName
      revenue
      collectedRevenue
      previousMonthRevenue
      orderCount
      newCustomers
      kpiAchievement
      overallScore
    }
    period {
      start
      end
    }
  }
}
```

**Biến (tối thiểu):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Variables (loc theo phòng ban + phân trang):**
```json
{
  "input": {
    "period": "THIS_QUARTER",
    "departmentId": "dept-sales-uuid",
    "limit": 10,
    "offset": 0
  }
}
```

**Variables (loc 1 nhân viên cụ thể):**
```json
{
  "input": {
    "period": "THIS_MONTH",
    "staffId": "workspace-member-uuid"
  }
}
```

**Tham số đầu vào:**

| Trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Yes** | - | Kỳ báo cáo |
| `departmentId` | String | No | `null` | Lọc theo phòng ban (+ team con) |
| `staffId` | String | No | `null` | Lọc theo nhân viên cu thế(workspaceMemberId) |
| `startDate` | String | No | `null` | Ngày bắt đầu (dùng với CUSTOM) |
| `endDate` | String | No | `null` | Ngày kết thúc (dùng với CUSTOM) |
| `limit` | Int | No | `20` | Số lượng kết quả trả về (min: 1, max: 50) |
| `offset` | Int | No | `0` | Vi tri bat dau (min: 0) |

**Phản hồi thành công:**
```json
{
  "data": {
    "staffLeaderboard": {
      "rankings": [
        {
          "rank": 1,
          "staffName": "Jony Ive",
          "departmentName": "Frontend",
          "revenue": 2500000000,
          "collectedRevenue": 373100000,
          "previousMonthRevenue": 1200000000,
          "orderCount": 8,
          "newCustomers": 5,
          "kpiAchievement": 110.0,
          "overallScore": 95.5
        },
        {
          "rank": 2,
          "staffName": "Tim Cook",
          "departmentName": "Kinh doanh",
          "revenue": 2200000000,
          "collectedRevenue": 345000000,
          "previousMonthRevenue": 900000000,
          "orderCount": 6,
          "newCustomers": 3,
          "kpiAchievement": 95.0,
          "overallScore": 88.2
        }
      ],
      "period": {
        "start": "2026-02-01T00:00:00.000Z",
        "end": "2026-02-28T23:59:59.999Z"
      }
    }
  }
}
```

**Response Success (loc theo staffId - 1 nhân viên):**
```json
{
  "data": {
    "staffLeaderboard": {
      "rankings": [
        {
          "rank": 1,
          "staffName": "Jony Ive",
          "departmentName": "Frontend",
          "revenue": 2500000000,
          "collectedRevenue": 373100000,
          "previousMonthRevenue": 1200000000,
          "orderCount": 8,
          "newCustomers": 5,
          "kpiAchievement": 110.0,
          "overallScore": 95.5
        }
      ],
      "period": {
        "start": "2026-02-01T00:00:00.000Z",
        "end": "2026-02-28T23:59:59.999Z"
      }
    }
  }
}
```

**Ghi chú:**
- `revenue` = doanh so đơn hàng (order basis — `mktOrder.completedAt`).
- `collectedRevenue` = doanh thu đãthu (cash basis — `mktPayment.confirmedAt`). Co thế`null` nếu nhân viên chưa cópayment nao confirmed.
- `previousMonthRevenue` = doanh thu order basis cua tháng trước (dung đểso sánh tăng trưởng).
- `overallScore` = diem tổng hop. Cong thuc: `(collectedRevenue ?? revenue) * 0.4 + orderCount * 0.2 + newCustomers * 0.2 + kpiAchievement * 0.2`. Khi có`collectedRevenue`, score sử dụng doanh thu đãthu đểxếp hạng.
- Khi dung `staffId`, trả về dung 1 nhân viên vớirank cua hỗ trợng phòng ban/toàn công ty.
- `limit` và`offset` dung cho phân trang khi so luông nhân viên lon.

---

### 7. dashboardAlerts

Lấy danh sách cảnh báo: đơn hàng quá hạn, hợp đồng sắp hết, thanh toán cho xu ly, KPI kem hieu suat. Khong cầninput parameters.

**Query:**
```graphql
query DashboardAlerts {
  dashboardAlerts {
    overdueOrders {
      id
      orderCode
      daysOverdue
    }
    expiringContracts {
      id
      name
      daysToExpiry
    }
    pendingPayments {
      id
      name
      amount
      daysPending
    }
    underperformingKpis {
      kpiName
      progress
      target
    }
  }
}
```

**Variables:** Không cần.

**Phản hồi thành công:**
```json
{
  "data": {
    "dashboardAlerts": {
      "overdueOrders": [
        { "id": "order-001", "orderCode": "ORD-2026-0142", "daysOverdue": 5 },
        { "id": "order-002", "orderCode": "ORD-2026-0138", "daysOverdue": 12 }
      ],
      "expiringContracts": [
        { "id": "contract-001", "name": "TechCorp License Agreement", "daysToExpiry": 7 },
        { "id": "contract-002", "name": "CloudFirst Support Plan", "daysToExpiry": 14 }
      ],
      "pendingPayments": [
        { "id": "payment-001", "name": "Invoice #INV-2026-055", "amount": 150000000, "daysPending": 12 }
      ],
      "underperformingKpis": [
        { "kpiName": "Số khách hàng mới", "progress": 45.0, "target": 100.0 },
        { "kpiName": "Tỷ lệ chuyển đổi", "progress": 60.0, "target": 80.0 }
      ]
    }
  }
}
```

**Response - Không có cảnh báo:**
```json
{
  "data": {
    "dashboardAlerts": {
      "overdueOrders": [],
      "expiringContracts": [],
      "pendingPayments": [],
      "underperformingKpis": []
    }
  }
}
```

---

### 8. revenueDailyByWeek

Lấy doanh thu chi tiết theo từng ngày trong tuần (ISO week). Hỗ trợ dual-metric (CASH/ORDER/DUAL) và phân tách theo team/phòng ban. Luôn trả về 7 ngày (Thứ 2-Chủ nhật), ngày không có dữ liệu = 0.

**Query (Dual-Metric + Department breakdown):**
```graphql
query RevenueDailyByWeek($input: RevenueDailyInput!) {
  revenueDailyByWeek(input: $input) {
    year
    week
    weekStart
    weekEnd
    totalRevenue
    dailyRevenue {
      date
      dayOfWeek
      amount
      orderCount
    }
    collected {
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
    }
    order {
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
    }
    gap {
      collectionRate
      revenueGap
      avgCollectionDays
    }
    departmentBreakdown {
      departmentId
      departmentName
      departmentType
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
    }
  }
}
```

**Biến (tối thiểu):**
```json
{
  "input": {
    "year": 2026
  }
}
```

> Khi không truyền `week`, hệ thống tự động dùng tuần hiện tại (ISO week).

**Biến (chỉ định tuần + chế độ DUAL):**
```json
{
  "input": {
    "year": 2026,
    "week": 7,
    "revenueMode": "DUAL"
  }
}
```

**Biến (CASH + phân tách theo team):**
```json
{
  "input": {
    "year": 2026,
    "week": 7,
    "revenueMode": "CASH",
    "departmentScope": "BY_TEAM"
  }
}
```

**Biến (lọc theo phòng ban cụ thể):**
```json
{
  "input": {
    "year": 2026,
    "week": 7,
    "revenueMode": "CASH",
    "departmentId": "dept-uuid-here"
  }
}
```

**Biến (khoảng tuần — query nhiều tuần 1 lần):**
```json
{
  "input": {
    "year": 2026,
    "week": 7,
    "weekEnd": 10,
    "revenueMode": "DUAL"
  }
}
```

> Khi truyền `weekEnd`, response trả thêm `weeklyBreakdown[]` với chi tiết từng tuần. Top-level fields (`totalRevenue`, `collected`, `order`, `gap`) là tổng hợp toàn khoảng.

**Tham số đầu vào:**

| Trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
|--------|------|---------|---------|-------|
| `year` | Int | **Có** | - | Năm (ISO week year, >= 2020) |
| `week` | Int | Không | Tuần hiện tại | Số tuần ISO (1-53) |
| `weekEnd` | Int | Không | `null` | Tuần kết thúc (1-53). Khi truyền, query trả dữ liệu từ `week`→`weekEnd`. Phải >= `week`, max range 12 tuần. |
| `departmentScope` | DepartmentScope | Không | `ALL` | Cách nhóm: `ALL`, `BY_TEAM`, `BY_DEPARTMENT` |
| `departmentId` | String | Không | `null` | Lọc theo phòng ban cụ thể (+ team con) |
| `revenueMode` | RevenueMode | Không | `DUAL` | Chế độ tính doanh thu: `CASH`, `ORDER`, `DUAL` |

**Phản hồi thành công (revenueMode = DUAL, departmentScope = ALL):**
```json
{
  "data": {
    "revenueDailyByWeek": {
      "year": 2026,
      "week": 7,
      "weekStart": "2026-02-09",
      "weekEnd": "2026-02-15",
      "totalRevenue": 439250000,
      "dailyRevenue": [
        { "date": "2026-02-09", "dayOfWeek": "Monday", "amount": 105000000, "orderCount": 1 },
        { "date": "2026-02-10", "dayOfWeek": "Tuesday", "amount": 17100000, "orderCount": 1 },
        { "date": "2026-02-11", "dayOfWeek": "Wednesday", "amount": 130000000, "orderCount": 1 },
        { "date": "2026-02-12", "dayOfWeek": "Thursday", "amount": 450000, "orderCount": 1 },
        { "date": "2026-02-13", "dayOfWeek": "Friday", "amount": 12100000, "orderCount": 1 },
        { "date": "2026-02-14", "dayOfWeek": "Saturday", "amount": 6600000, "orderCount": 1 },
        { "date": "2026-02-15", "dayOfWeek": "Sunday", "amount": 168000000, "orderCount": 1 }
      ],
      "collected": {
        "totalRevenue": 439250000,
        "dailyRevenue": [
          { "date": "2026-02-09", "dayOfWeek": "Monday", "amount": 105000000, "orderCount": 1 },
          { "date": "2026-02-10", "dayOfWeek": "Tuesday", "amount": 17100000, "orderCount": 1 },
          { "date": "2026-02-11", "dayOfWeek": "Wednesday", "amount": 130000000, "orderCount": 1 },
          { "date": "2026-02-12", "dayOfWeek": "Thursday", "amount": 450000, "orderCount": 1 },
          { "date": "2026-02-13", "dayOfWeek": "Friday", "amount": 12100000, "orderCount": 1 },
          { "date": "2026-02-14", "dayOfWeek": "Saturday", "amount": 6600000, "orderCount": 1 },
          { "date": "2026-02-15", "dayOfWeek": "Sunday", "amount": 168000000, "orderCount": 1 }
        ]
      },
      "order": {
        "totalRevenue": 3416800000,
        "dailyRevenue": [
          { "date": "2026-02-09", "dayOfWeek": "Monday", "amount": 3300000, "orderCount": 1 },
          { "date": "2026-02-10", "dayOfWeek": "Tuesday", "amount": 2103300000, "orderCount": 2 },
          { "date": "2026-02-11", "dayOfWeek": "Wednesday", "amount": 0, "orderCount": 0 },
          { "date": "2026-02-12", "dayOfWeek": "Thursday", "amount": 33100000, "orderCount": 2 },
          { "date": "2026-02-13", "dayOfWeek": "Friday", "amount": 0, "orderCount": 0 },
          { "date": "2026-02-14", "dayOfWeek": "Saturday", "amount": 1277100000, "orderCount": 2 },
          { "date": "2026-02-15", "dayOfWeek": "Sunday", "amount": 0, "orderCount": 0 }
        ]
      },
      "gap": {
        "collectionRate": 12.86,
        "revenueGap": 2977550000,
        "avgCollectionDays": 14.13
      },
      "departmentBreakdown": null
    }
  }
}
```

**Phản hồi thành công (revenueMode = CASH, departmentScope = BY_TEAM):**
```json
{
  "data": {
    "revenueDailyByWeek": {
      "year": 2026,
      "week": 7,
      "weekStart": "2026-02-09",
      "weekEnd": "2026-02-15",
      "totalRevenue": 439250000,
      "dailyRevenue": [ "...7 items..." ],
      "collected": {
        "totalRevenue": 439250000,
        "dailyRevenue": [ "...7 items..." ]
      },
      "order": null,
      "gap": null,
      "departmentBreakdown": [
        {
          "departmentId": "uuid-devops",
          "departmentName": "Đội DevOps",
          "departmentType": "TEAM",
          "totalRevenue": 168000000,
          "dailyRevenue": [
            { "date": "2026-02-09", "dayOfWeek": "Monday", "amount": 0, "orderCount": 0 },
            { "date": "2026-02-10", "dayOfWeek": "Tuesday", "amount": 0, "orderCount": 0 },
            { "date": "2026-02-11", "dayOfWeek": "Wednesday", "amount": 0, "orderCount": 0 },
            { "date": "2026-02-12", "dayOfWeek": "Thursday", "amount": 0, "orderCount": 0 },
            { "date": "2026-02-13", "dayOfWeek": "Friday", "amount": 0, "orderCount": 0 },
            { "date": "2026-02-14", "dayOfWeek": "Saturday", "amount": 0, "orderCount": 0 },
            { "date": "2026-02-15", "dayOfWeek": "Sunday", "amount": 168000000, "orderCount": 1 }
          ]
        },
        {
          "departmentId": "uuid-backend",
          "departmentName": "Đội phát triển Backend",
          "departmentType": "TEAM",
          "totalRevenue": 247550000,
          "dailyRevenue": [ "...7 items..." ]
        },
        {
          "departmentId": "uuid-frontend",
          "departmentName": "Đội phát triển Frontend",
          "departmentType": "TEAM",
          "totalRevenue": 23700000,
          "dailyRevenue": [ "...7 items..." ]
        }
      ]
    }
  }
}
```

> **Xác mình chéo:** Tổng departmentBreakdown[].totalRevenue = totalRevenue tổng (168M + 247.55M + 23.7M = 439,250,000).

**Phản hồi thành công (revenueMode = CASH, lọc theo departmentId):**
```json
{
  "data": {
    "revenueDailyByWeek": {
      "year": 2026,
      "week": 7,
      "weekStart": "2026-02-09",
      "weekEnd": "2026-02-15",
      "totalRevenue": 247550000,
      "dailyRevenue": [
        { "date": "2026-02-09", "dayOfWeek": "Monday", "amount": 105000000, "orderCount": 1 },
        { "date": "2026-02-10", "dayOfWeek": "Tuesday", "amount": 0, "orderCount": 0 },
        { "date": "2026-02-11", "dayOfWeek": "Wednesday", "amount": 130000000, "orderCount": 1 },
        { "date": "2026-02-12", "dayOfWeek": "Thursday", "amount": 450000, "orderCount": 1 },
        { "date": "2026-02-13", "dayOfWeek": "Friday", "amount": 12100000, "orderCount": 1 },
        { "date": "2026-02-14", "dayOfWeek": "Saturday", "amount": 0, "orderCount": 0 },
        { "date": "2026-02-15", "dayOfWeek": "Sunday", "amount": 0, "orderCount": 0 }
      ],
      "collected": { "totalRevenue": 247550000, "dailyRevenue": [ "...7 items..." ] },
      "order": null,
      "gap": null,
      "departmentBreakdown": null
    }
  }
}
```

**Response — Tuần trống (không có dữ liệu):**
```json
{
  "data": {
    "revenueDailyByWeek": {
      "year": 2020,
      "week": 1,
      "weekStart": "2019-12-30",
      "weekEnd": "2020-01-05",
      "totalRevenue": 0,
      "dailyRevenue": [
        { "date": "2019-12-30", "dayOfWeek": "Monday", "amount": 0, "orderCount": 0 },
        { "date": "2019-12-31", "dayOfWeek": "Tuesday", "amount": 0, "orderCount": 0 },
        { "date": "2020-01-01", "dayOfWeek": "Wednesday", "amount": 0, "orderCount": 0 },
        { "date": "2020-01-02", "dayOfWeek": "Thursday", "amount": 0, "orderCount": 0 },
        { "date": "2020-01-03", "dayOfWeek": "Friday", "amount": 0, "orderCount": 0 },
        { "date": "2020-01-04", "dayOfWeek": "Saturday", "amount": 0, "orderCount": 0 },
        { "date": "2020-01-05", "dayOfWeek": "Sunday", "amount": 0, "orderCount": 0 }
      ],
      "collected": { "totalRevenue": 0, "dailyRevenue": [ "...7 items all 0..." ] },
      "order": null,
      "gap": null,
      "departmentBreakdown": null
    }
  }
}
```

**Phản hồi thành công (khoảng tuần: week=7, weekEnd=8, revenueMode=DUAL):**
```json
{
  "data": {
    "revenueDailyByWeek": {
      "year": 2026,
      "week": 7,
      "weekStart": "2026-02-09",
      "weekEnd": "2026-02-22",
      "totalRevenue": 600000000,
      "dailyRevenue": [ "...14 items (7 ngày × 2 tuần)..." ],
      "collected": {
        "totalRevenue": 600000000,
        "dailyRevenue": [ "...14 items..." ]
      },
      "order": {
        "totalRevenue": 5000000000,
        "dailyRevenue": [ "...14 items..." ]
      },
      "gap": {
        "collectionRate": 12.0,
        "revenueGap": 4400000000,
        "avgCollectionDays": 13.5
      },
      "weeklyBreakdown": [
        {
          "week": 7,
          "weekStart": "2026-02-09",
          "weekEnd": "2026-02-15",
          "totalRevenue": 439250000,
          "dailyRevenue": [ "...7 items..." ],
          "collected": { "totalRevenue": 439250000, "dailyRevenue": [ "...7 items..." ] },
          "order": { "totalRevenue": 3416800000, "dailyRevenue": [ "...7 items..." ] },
          "gap": { "collectionRate": 12.86, "revenueGap": 2977550000, "avgCollectionDays": 14.13 }
        },
        {
          "week": 8,
          "weekStart": "2026-02-16",
          "weekEnd": "2026-02-22",
          "totalRevenue": 160750000,
          "dailyRevenue": [ "...7 items..." ],
          "collected": { "totalRevenue": 160750000, "dailyRevenue": [ "...7 items..." ] },
          "order": { "totalRevenue": 1583200000, "dailyRevenue": [ "...7 items..." ] },
          "gap": { "collectionRate": 10.15, "revenueGap": 1422450000, "avgCollectionDays": 12.5 }
        }
      ],
      "departmentBreakdown": null
    }
  }
}
```

> **Xác minh chéo:** `weeklyBreakdown[0].totalRevenue + weeklyBreakdown[1].totalRevenue = totalRevenue` tổng.

**Ghi chú:**
- `weekStart`/`weekEnd` là chuỗi ngày ISO `yyyy-MM-dd` (không phải timestamp).
- `dailyRevenue` **luôn trả về 7 items** mỗi tuần (Thứ 2-Chủ nhật), ngày không có dữ liệu sẽ có `amount: 0`, `orderCount: 0`.
- Tuần ISO có thể bắt đầu ở năm trước (ví dụ: week 1/2020 -> weekStart = 2019-12-30).
- `totalRevenue` là tương thích ngược: khi mode = CASH/DUAL trả cash basis, khi mode = ORDER trả order basis.
- `collected` = null khi `revenueMode = ORDER`.
- `order` = null khi `revenueMode = CASH`.
- `gap` chỉ có khi `revenueMode = DUAL`.
- `weeklyBreakdown` chỉ có khi `weekEnd` được truyền (và > `week`). Mỗi item chứa 7 ngày dailyRevenue riêng, collected/order/gap riêng.
- Khi query 1 tuần (không truyền `weekEnd`), `weeklyBreakdown` = null — backward compatible.
- `departmentBreakdown` chỉ có khi `departmentScope != ALL`. Mỗi phòng ban có 7 ngày dailyRevenue riêng.
- Khi truyền `departmentId`, dữ liệu tự động lọc theo phòng ban đó (+ team con). `departmentBreakdown` = null trong trường hợp này.
- Tổng của `departmentBreakdown[].totalRevenue` luôn bằng `totalRevenue` tổng.

### 9. revenueDailyByMonth

Lay doanh thu chi tiet theo thang, breakdown theo tuan ISO. Tuan bien (dau/cuoi thang) chi gom ngay thuoc thang — loai bo ngay cua thang khac.

Vi du thang 2/2026 (Feb 1 = Sunday, Feb 28 = Saturday):
- Tuan 5 (Jan 26–Feb 1): chi tra Feb 1 (1 ngay)
- Tuan 6–8: day du 7 ngay
- Tuan 9 (Feb 23–Mar 1): chi tra Feb 23–28 (6 ngay)

**Query (Dual-Metric + Weekly breakdown):**
```graphql
query RevenueDailyByMonth($input: RevenueDailyByMonthInput!) {
  revenueDailyByMonth(input: $input) {
    year
    month
    monthStart
    monthEnd
    daysInMonth
    totalRevenue
    dailyRevenue {
      date
      dayOfWeek
      amount
      orderCount
    }
    collected {
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
    }
    order {
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
    }
    gap {
      collectionRate
      revenueGap
      avgCollectionDays
    }
    weeklyBreakdown {
      week
      weekStart
      weekEnd
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
      collected { totalRevenue dailyRevenue { date dayOfWeek amount orderCount } }
      order { totalRevenue dailyRevenue { date dayOfWeek amount orderCount } }
      gap { collectionRate revenueGap avgCollectionDays }
    }
    departmentBreakdown {
      departmentId
      departmentName
      departmentType
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
    }
  }
}
```

**Bien (thang 2/2026, DUAL mode):**
```json
{
  "input": {
    "year": 2026,
    "month": 2,
    "revenueMode": "DUAL"
  }
}
```

**Bien (CASH + phan tach theo team):**
```json
{
  "input": {
    "year": 2026,
    "month": 2,
    "revenueMode": "CASH",
    "departmentScope": "BY_TEAM"
  }
}
```

**Tham so dau vao:**

| Truong | Kieu | Bat buoc | Mac dinh | Mo ta |
|--------|------|---------|---------|-------|
| `year` | Int | **Co** | - | Nam (calendar year, >= 2020) |
| `month` | Int | **Co** | - | Thang (1-12) |
| `departmentScope` | DepartmentScope | Khong | `ALL` | Cach nhom: `ALL`, `BY_TEAM`, `BY_DEPARTMENT` |
| `departmentId` | String | Khong | `null` | Loc theo phong ban cu the (+ team con) |
| `revenueMode` | RevenueMode | Khong | `DUAL` | Che do tinh doanh thu: `CASH`, `ORDER`, `DUAL` |

**Phan hoi thanh cong (Feb 2026, revenueMode = DUAL):**
```json
{
  "data": {
    "revenueDailyByMonth": {
      "year": 2026,
      "month": 2,
      "monthStart": "2026-02-01",
      "monthEnd": "2026-02-28",
      "daysInMonth": 28,
      "totalRevenue": 1500000000,
      "dailyRevenue": [ "...28 items (Feb 1–28)..." ],
      "collected": {
        "totalRevenue": 1500000000,
        "dailyRevenue": [ "...28 items..." ]
      },
      "order": {
        "totalRevenue": 8500000000,
        "dailyRevenue": [ "...28 items..." ]
      },
      "gap": {
        "collectionRate": 17.65,
        "revenueGap": 7000000000,
        "avgCollectionDays": 12.5
      },
      "weeklyBreakdown": [
        {
          "week": 5,
          "weekStart": "2026-02-01",
          "weekEnd": "2026-02-01",
          "totalRevenue": 50000000,
          "dailyRevenue": [ "...1 item (Feb 1, Sunday)..." ],
          "collected": { "totalRevenue": 50000000 },
          "order": { "totalRevenue": 300000000 },
          "gap": { "collectionRate": 16.67, "revenueGap": 250000000, "avgCollectionDays": 10 }
        },
        {
          "week": 6,
          "weekStart": "2026-02-02",
          "weekEnd": "2026-02-08",
          "totalRevenue": 400000000,
          "dailyRevenue": [ "...7 items (Mon–Sun)..." ],
          "collected": { "totalRevenue": 400000000 },
          "order": { "totalRevenue": 2200000000 },
          "gap": { "collectionRate": 18.18, "revenueGap": 1800000000, "avgCollectionDays": 13 }
        },
        "...week 7, 8...",
        {
          "week": 9,
          "weekStart": "2026-02-23",
          "weekEnd": "2026-02-28",
          "totalRevenue": 350000000,
          "dailyRevenue": [ "...6 items (Feb 23–28, Mon–Sat)..." ],
          "collected": { "totalRevenue": 350000000 },
          "order": { "totalRevenue": 1800000000 },
          "gap": { "collectionRate": 19.44, "revenueGap": 1450000000, "avgCollectionDays": 11 }
        }
      ],
      "departmentBreakdown": null
    }
  }
}
```

> **Xac minh cheo:** `sum(weeklyBreakdown[].totalRevenue) == totalRevenue` tong.

**Ghi chu:**
- `monthStart`/`monthEnd` la chuoi ngay ISO `yyyy-MM-dd`.
- `daysInMonth` = so ngay trong thang (28/29/30/31).
- `dailyRevenue` top-level co dung `daysInMonth` items (tat ca ngay trong thang).
- `weeklyBreakdown` luon co (khong nullable). Tuan bien chi chua ngay thuoc thang.
- Tuan 5 (Feb 2026): chi 1 ngay (Feb 1, Sunday) — vi Jan 26–31 khong thuoc thang 2.
- Tuan 9 (Feb 2026): chi 6 ngay (Feb 23–28, Mon–Sat) — vi Mar 1 khong thuoc thang 2.
- `weekStart`/`weekEnd` trong `weeklyBreakdown` phan anh effective range (da clamp), khong phai full Mon–Sun.
- `collected`, `order`, `gap` hoat dong giong `revenueDailyByWeek`.
- `departmentBreakdown` chi co khi `departmentScope != ALL`.

### 10. revenueDailyByQuarter

Lay doanh thu chi tiet theo quy, breakdown theo 3 thang. Moi thang co `totalRevenue` + `dailyRevenue` cho tat ca ngay trong thang.

**2 che do:**
- **Single quarter** (`quarter` = 1-4): tra ve 1 quy, `monthlyBreakdown` 3 items, `quarterlyBreakdown = null`.
- **All quarters** (khong truyen `quarter`): tra ve ca nam, `monthlyBreakdown` 12 items, `quarterlyBreakdown` 4 items (moi item co `monthlyBreakdown` 3 items).

Vi du Q1/2026:
- monthlyBreakdown[0]: Jan (31 ngay, dailyRevenue 31 items)
- monthlyBreakdown[1]: Feb (28 ngay, dailyRevenue 28 items)
- monthlyBreakdown[2]: Mar (31 ngay, dailyRevenue 31 items)

Neu can chi tiet tuan trong 1 thang, frontend goi `revenueDailyByMonth` rieng.

**Query (Dual-Metric + Monthly breakdown):**
```graphql
query RevenueDailyByQuarter($input: RevenueDailyByQuarterInput!) {
  revenueDailyByQuarter(input: $input) {
    year
    quarter
    quarterStart
    quarterEnd
    totalDays
    totalRevenue
    dailyRevenue {
      date
      dayOfWeek
      amount
      orderCount
    }
    collected {
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
    }
    order {
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
    }
    gap {
      collectionRate
      revenueGap
      avgCollectionDays
    }
    monthlyBreakdown {
      month
      monthStart
      monthEnd
      daysInMonth
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
      collected { totalRevenue dailyRevenue { date dayOfWeek amount orderCount } }
      order { totalRevenue dailyRevenue { date dayOfWeek amount orderCount } }
      gap { collectionRate revenueGap avgCollectionDays }
    }
    quarterlyBreakdown {
      quarter
      quarterStart
      quarterEnd
      totalDays
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
      collected { totalRevenue dailyRevenue { date dayOfWeek amount orderCount } }
      order { totalRevenue dailyRevenue { date dayOfWeek amount orderCount } }
      gap { collectionRate revenueGap avgCollectionDays }
      monthlyBreakdown {
        month monthStart monthEnd daysInMonth totalRevenue
        dailyRevenue { date dayOfWeek amount orderCount }
        collected { totalRevenue dailyRevenue { date dayOfWeek amount orderCount } }
        order { totalRevenue dailyRevenue { date dayOfWeek amount orderCount } }
        gap { collectionRate revenueGap avgCollectionDays }
      }
    }
    departmentBreakdown {
      departmentId
      departmentName
      departmentType
      totalRevenue
      dailyRevenue { date dayOfWeek amount orderCount }
    }
  }
}
```

**Bien (Q1/2026, DUAL mode):**
```json
{
  "input": {
    "year": 2026,
    "quarter": 1,
    "revenueMode": "DUAL"
  }
}
```

**Bien (CASH + phan tach theo team):**
```json
{
  "input": {
    "year": 2026,
    "quarter": 2,
    "revenueMode": "CASH",
    "departmentScope": "BY_TEAM"
  }
}
```

**Bien (tat ca 4 quy — khong truyen quarter):**
```json
{
  "input": {
    "year": 2026,
    "revenueMode": "DUAL"
  }
}
```
> Khi khong truyen `quarter`, response tra ve `quarterlyBreakdown` voi 4 items (Q1-Q4), `monthlyBreakdown` 12 items (tat ca thang trong nam), `quarter = null`.

**Tham so dau vao:**

| Truong | Kieu | Bat buoc | Mac dinh | Mo ta |
|--------|------|---------|---------|-------|
| `year` | Int | **Co** | - | Nam (calendar year, >= 2020) |
| `quarter` | Int | Khong | `null` | Quy (1-4). Neu khong truyen, tra ve tat ca 4 quy voi `quarterlyBreakdown` |
| `departmentScope` | DepartmentScope | Khong | `ALL` | Cach nhom: `ALL`, `BY_TEAM`, `BY_DEPARTMENT` |
| `departmentId` | String | Khong | `null` | Loc theo phong ban cu the (+ team con) |
| `revenueMode` | RevenueMode | Khong | `DUAL` | Che do tinh doanh thu: `CASH`, `ORDER`, `DUAL` |

**Phan hoi thanh cong (Q1/2026, revenueMode = DUAL):**
```json
{
  "data": {
    "revenueDailyByQuarter": {
      "year": 2026,
      "quarter": 1,
      "quarterStart": "2026-01-01",
      "quarterEnd": "2026-03-31",
      "totalDays": 90,
      "totalRevenue": 4500000000,
      "dailyRevenue": [ "...90 items (Jan 1–Mar 31)..." ],
      "collected": {
        "totalRevenue": 4500000000,
        "dailyRevenue": [ "...90 items..." ]
      },
      "order": {
        "totalRevenue": 25000000000,
        "dailyRevenue": [ "...90 items..." ]
      },
      "gap": {
        "collectionRate": 18.0,
        "revenueGap": 20500000000,
        "avgCollectionDays": 13.2
      },
      "monthlyBreakdown": [
        {
          "month": 1,
          "monthStart": "2026-01-01",
          "monthEnd": "2026-01-31",
          "daysInMonth": 31,
          "totalRevenue": 1500000000,
          "dailyRevenue": [ "...31 items..." ],
          "collected": { "totalRevenue": 1500000000, "dailyRevenue": [ "...31 items..." ] },
          "order": { "totalRevenue": 8000000000, "dailyRevenue": [ "...31 items..." ] },
          "gap": { "collectionRate": 18.75, "revenueGap": 6500000000, "avgCollectionDays": 14.0 }
        },
        {
          "month": 2,
          "monthStart": "2026-02-01",
          "monthEnd": "2026-02-28",
          "daysInMonth": 28,
          "totalRevenue": 1200000000,
          "dailyRevenue": [ "...28 items..." ],
          "collected": { "totalRevenue": 1200000000, "dailyRevenue": [ "...28 items..." ] },
          "order": { "totalRevenue": 7000000000, "dailyRevenue": [ "...28 items..." ] },
          "gap": { "collectionRate": 17.14, "revenueGap": 5800000000, "avgCollectionDays": 12.5 }
        },
        {
          "month": 3,
          "monthStart": "2026-03-01",
          "monthEnd": "2026-03-31",
          "daysInMonth": 31,
          "totalRevenue": 1800000000,
          "dailyRevenue": [ "...31 items..." ],
          "collected": { "totalRevenue": 1800000000, "dailyRevenue": [ "...31 items..." ] },
          "order": { "totalRevenue": 10000000000, "dailyRevenue": [ "...31 items..." ] },
          "gap": { "collectionRate": 18.0, "revenueGap": 8200000000, "avgCollectionDays": 13.0 }
        }
      ],
      "quarterlyBreakdown": null,
      "departmentBreakdown": null
    }
  }
}
```

> **Xac minh cheo:** `sum(monthlyBreakdown[].totalRevenue) == totalRevenue` tong. `sum(monthlyBreakdown[].daysInMonth) == totalDays`. Khi query tat ca quy: `sum(quarterlyBreakdown[].totalRevenue) == totalRevenue`.

**Ghi chu:**
- `quarterStart`/`quarterEnd` la chuoi ngay ISO `yyyy-MM-dd`.
- `totalDays` = tong so ngay trong quy (90 cho Q1/2026, 91 cho Q2, etc). Khi query ca nam: 365 hoac 366.
- `dailyRevenue` top-level co dung `totalDays` items (tat ca ngay trong pham vi).
- **Single quarter** (truyen `quarter`): `monthlyBreakdown` = 3 items, `quarterlyBreakdown = null`.
- **All quarters** (khong truyen `quarter`): `monthlyBreakdown` = 12 items, `quarterlyBreakdown` = 4 items. `quarter` trong response = `null`.
- Moi `QuarterBreakdownItem` co `monthlyBreakdown` 3 items va du lieu tong hop rieng (totalRevenue, dailyRevenue, collected, order, gap).
- Moi `QuarterMonthItem` co `daysInMonth` items trong `dailyRevenue`.
- `collected`, `order`, `gap` hoat dong giong `revenueDailyByWeek` va `revenueDailyByMonth`.
- `departmentBreakdown` chi co khi `departmentScope != ALL`. Breakdown cho toan pham vi (khong tach theo thang/quy).
- Neu can breakdown theo tuan trong 1 thang cu the, frontend goi `revenueDailyByMonth` rieng.

---

### RevenueDailyByQuarterOutput (moi — v1.5)

Doanh thu chi tiet theo quy, breakdown theo 3 thang.

| Truong | Kieu | Co the null | Mo ta |
|--------|------|----------|-------|
| `year` | Int | Khong | Nam (calendar year) |
| `quarter` | Int | **Co** | Quy (1-4). Null khi query tat ca quy |
| `quarterStart` | String | Khong | Ngay dau pham vi (yyyy-MM-dd) |
| `quarterEnd` | String | Khong | Ngay cuoi pham vi (yyyy-MM-dd) |
| `totalDays` | Int | Khong | Tong so ngay trong pham vi |
| `totalRevenue` | Float | Khong | Tong doanh thu chinh |
| `dailyRevenue` | [DailyRevenueItem] | Khong | Doanh thu tung ngay (totalDays items) |
| `collected` | DailyRevenueMetric | **Co** | Cash Basis. Null khi mode = ORDER |
| `order` | DailyRevenueMetric | **Co** | Order Basis. Null khi mode = CASH |
| `gap` | GapAnalysisOutput | **Co** | Gap analysis. Chi co khi mode = DUAL |
| `monthlyBreakdown` | [QuarterMonthItem] | Khong | 3 items (single quarter) hoac 12 items (all quarters) |
| `quarterlyBreakdown` | [QuarterBreakdownItem] | **Co** | 4 items khi query ca nam. Null khi query 1 quy |
| `departmentBreakdown` | [DepartmentDailyRevenue] | **Co** | Phan tach theo phong ban/team. Null khi departmentScope = ALL |

### QuarterMonthItem (moi — v1.5)

Chi tiet doanh thu cho 1 thang trong quy.

| Truong | Kieu | Co the null | Mo ta |
|--------|------|----------|-------|
| `month` | Int | Khong | Thang (1-12) |
| `monthStart` | String | Khong | Ngay dau thang (yyyy-MM-dd) |
| `monthEnd` | String | Khong | Ngay cuoi thang (yyyy-MM-dd) |
| `daysInMonth` | Int | Khong | So ngay trong thang |
| `totalRevenue` | Float | Khong | Tong doanh thu chinh trong thang |
| `dailyRevenue` | [DailyRevenueItem] | Khong | daysInMonth items — doanh thu tung ngay |
| `collected` | DailyRevenueMetric | **Co** | Cash Basis. Null khi mode = ORDER |
| `order` | DailyRevenueMetric | **Co** | Order Basis. Null khi mode = CASH |
| `gap` | GapAnalysisOutput | **Co** | Gap analysis. Chi co khi mode = DUAL |

### QuarterBreakdownItem (moi — v1.6)

Chi tiet doanh thu cho 1 quy. Chi co trong `quarterlyBreakdown` khi query ca nam.

| Truong | Kieu | Co the null | Mo ta |
|--------|------|----------|-------|
| `quarter` | Int | Khong | Quy (1-4) |
| `quarterStart` | String | Khong | Ngay dau quy (yyyy-MM-dd) |
| `quarterEnd` | String | Khong | Ngay cuoi quy (yyyy-MM-dd) |
| `totalDays` | Int | Khong | Tong so ngay trong quy |
| `totalRevenue` | Float | Khong | Tong doanh thu chinh trong quy |
| `dailyRevenue` | [DailyRevenueItem] | Khong | totalDays items — doanh thu tung ngay |
| `collected` | DailyRevenueMetric | **Co** | Cash Basis. Null khi mode = ORDER |
| `order` | DailyRevenueMetric | **Co** | Order Basis. Null khi mode = CASH |
| `gap` | GapAnalysisOutput | **Co** | Gap analysis. Chi co khi mode = DUAL |
| `monthlyBreakdown` | [QuarterMonthItem] | Khong | 3 items — breakdown theo thang trong quy |

---

## Types

### DashboardSummaryOutput

| Field | Type | Description |
|-------|------|-------------|
| `period` | PeriodOutput | Thong tin kỳ bao cao |
| `revenue` | RevenueSummary | Tong hop doanh thu |
| `orders` | OrdersSummary | Tong hop đơn hàng |
| `customers` | CustomersSummary | Tong hop khách hàng |
| `payments` | PaymentsSummary | Tong hop thanh toán |
| `kpis` | KpisSummary | Tong hop KPI |
| `contracts` | ContractsSummary | Tong hop hợp đồng |
| `alerts` | AlertsOutput | Canh bao |

### PeriodOutput

| Field | Type | Description |
|-------|------|-------------|
| `start` | String | Ngày bắt đầu (ISO 8601) |
| `end` | String | Ngày kết thúc (ISO 8601) |
| `periodType` | String | Loai kỳ (TODAY, THIS_WEEK, ...) |

### RevenueSummary

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `totalRevenue` | Float | No | Tong doanh thu trong kỳ (backward compat) |
| `previousPeriodRevenue` | Float | No | Doanh thu kỳ trước |
| `percentageChange` | Float | No | % thay đổi so vớikỳ trước |
| `trend` | String | No | Xu hướng: `UP`, `DOWN`, `STABLE` |
| `revenueByMonth` | [RevenueByMonthItem] | No | Doanh thu theo thời gian |
| `collectedRevenue` | Float | **Yes** | Tong doanh thu đãthu (Cash Basis) |
| `orderRevenue` | Float | **Yes** | Tong doanh so đơn hàng (Order Basis) |
| `collectionRate` | Float | **Yes** | Tỷ lệ thu tiền (%) = collectedRevenue / orderRevenue * 100 |
| `revenueGap` | Float | **Yes** | Chenh lech = orderRevenue - collectedRevenue |
| `collectedByMonth` | [RevenueByPeriodItem] | **Yes** | Cash revenue theo tung kỳ |
| `orderByMonth` | [RevenueByPeriodItem] | **Yes** | Order revenue theo tung kỳ |

### RevenueStatsOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `totalRevenue` | Float | No | Tong doanh thu (backward compat: cash khi DUAL/CASH, order khi ORDER) |
| `revenueByPeriod` | [RevenueByPeriodItem] | No | Doanh thu theo thời gian (dynamic DATE_TRUNC) |
| `revenueByDepartment` | [RevenueByDepartmentItem] | No | Doanh thu theo phòng ban/team |
| `revenueByStaff` | [RevenueByStaffItem] | No | Doanh thu theo nhân viên |
| `growthRate` | Float | No | % tăng trưởng so vớikỳ trước |
| `projectedRevenue` | Float | **Yes** | Doanh thu du kien (null nếu đãhết kỳ) |
| `collected` | RevenueMetricOutput | **Yes** | Bo chi so Cash Basis. Null khi mode = ORDER |
| `order` | RevenueMetricOutput | **Yes** | Bo chi so Order Basis. Null khi mode = CASH |
| `gap` | GapAnalysisOutput | **Yes** | Gap analysis. Chi cókhi mode = DUAL |

### RevenueMetricOutput (mới — v1.1)

Mot bo chi so doanh thu day du, dung chúngcho ca cash basis vàorder basis.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `totalRevenue` | Float | No | Tong doanh thu |
| `revenueByPeriod` | [RevenueByPeriodItem] | No | Doanh thu theo thời gian |
| `revenueByDepartment` | [RevenueByDepartmentItem] | No | Doanh thu theo phòng ban |
| `revenueByStaff` | [RevenueByStaffItem] | No | Doanh thu theo nhân viên |
| `growthRate` | Float | No | % tăng trưởng so vớikỳ trước |
| `projectedRevenue` | Float | **Yes** | Doanh thu du kien |

### GapAnalysisOutput (mới — v1.1)

Phân tích chênh lệch giua doanh thu đãthu vàdoanh so đơn hàng.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `collectionRate` | Float | No | Tỷ lệ thu tiền (%) = collected / order * 100 |
| `revenueGap` | Float | No | Chenh lech = order - collected |
| `avgCollectionDays` | Float | **Yes** | Số ngày thu tiền trung bình sau khi đơn hoàn tất |

### RevenueDailyOutput (mới — v1.2)

Doanh thu chi tiết theo ngày trong 1 tuần ISO.

| Trường | Kiểu | Có thể null | Mô tả |
|--------|------|----------|-------|
| `year` | Int | Không | Năm (ISO week year) |
| `week` | Int | Không | Số tuần ISO |
| `weekStart` | String | Không | Ngày đầu tuần (Thứ 2, định dạng yyyy-MM-dd) |
| `weekEnd` | String | Không | Ngày cuối tuần (Chủ nhật, định dạng yyyy-MM-dd) |
| `totalRevenue` | Float | Không | Tổng doanh thu chính (cash khi CASH/DUAL, order khi ORDER) |
| `dailyRevenue` | [DailyRevenueItem] | Không | Doanh thu từng ngày (7 items khi 1 tuần, N×7 khi khoảng tuần) |
| `collected` | DailyRevenueMetric | **Có** | Doanh thu đã thu (Cash Basis). Null khi mode = ORDER |
| `order` | DailyRevenueMetric | **Có** | Doanh số đơn hàng (Order Basis). Null khi mode = CASH |
| `gap` | GapAnalysisOutput | **Có** | Phân tích khoảng cách. Chỉ có khi mode = DUAL |
| `weeklyBreakdown` | [RevenueDailyWeekItem] | **Có** | Chi tiết từng tuần. Null khi query 1 tuần (không truyền weekEnd) |
| `departmentBreakdown` | [DepartmentDailyRevenue] | **Có** | Phân tách theo phòng ban/team. Null khi departmentScope = ALL |

### DailyRevenueItem (mới — v1.2)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `date` | String | Ngày (chuỗi ngày ISO yyyy-MM-dd) |
| `dayOfWeek` | String | Tên ngày trong tuần (Monday, Tuesday, ..., Sunday) |
| `amount` | Float | Doanh thu trong ngày |
| `orderCount` | Int | Số đơn hàng trong ngày |

### DailyRevenueMetric (mới — v1.2)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `totalRevenue` | Float | Tổng doanh thu trong tuần |
| `dailyRevenue` | [DailyRevenueItem] | 7 items — doanh thu chi tiết từng ngày |

### RevenueDailyWeekItem (mới — v1.3)

Chi tiết doanh thu cho 1 tuần trong khoảng tuần.

| Trường | Kiểu | Có thể null | Mô tả |
|--------|------|----------|-------|
| `week` | Int | Không | Số tuần ISO |
| `weekStart` | String | Không | Ngày đầu tuần (Thứ 2, yyyy-MM-dd) |
| `weekEnd` | String | Không | Ngày cuối tuần (Chủ nhật, yyyy-MM-dd) |
| `totalRevenue` | Float | Không | Tổng doanh thu chính trong tuần |
| `dailyRevenue` | [DailyRevenueItem] | Không | 7 items — doanh thu từng ngày |
| `collected` | DailyRevenueMetric | **Có** | Cash Basis. Null khi mode = ORDER |
| `order` | DailyRevenueMetric | **Có** | Order Basis. Null khi mode = CASH |
| `gap` | GapAnalysisOutput | **Có** | Gap analysis. Chỉ có khi mode = DUAL |

### DepartmentDailyRevenue (mới — v1.2)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `departmentId` | String | ID phòng ban/team |
| `departmentName` | String | Tên phòng ban/team |
| `departmentType` | String | Loại: `TEAM` hoặc `DEPARTMENT` |
| `totalRevenue` | Float | Tổng doanh thu của phòng ban trong tuần |
| `dailyRevenue` | [DailyRevenueItem] | 7 items — doanh thu từng ngày của phòng ban |

### RevenueByPeriodItem

| Field | Type | Description |
|-------|------|-------------|
| `period` | String | Timestamp (milliseconds) dạng string |
| `amount` | Float | Doanh thu trong period |
| `orderCount` | Int | Số đơn hàng trong period |

### RevenueByDepartmentItem

| Field | Type | Description |
|-------|------|-------------|
| `departmentName` | String | Ten phòng ban |
| `amount` | Float | Doanh thu |
| `percentage` | Float | % so vớitổng |

### RevenueByStaffItem

| Field | Type | Description |
|-------|------|-------------|
| `staffName` | String | Ten nhân viên |
| `amount` | Float | Doanh thu |
| `orderCount` | Int | Số đơn hàng |
| `rank` | Int | Thứ hạng |

### OrderStatsOutput

| Field | Type | Description |
|-------|------|-------------|
| `ordersByStatus` | [OrderStatusItem] | Phan bo theo trạng thái |
| `orderTrend` | [OrderTrendItem] | Xu hướng theo thời gian (dynamic DATE_TRUNC) |
| `averageOrderValue` | Float | Gia tri đơn hàng trung bình |
| `averageProcessingTime` | Float | Thoi gian xu ly trung bình (ngay) |
| `conversionRate` | Float | Tỷ lệ chuyển đổi (%) |
| `topProducts` | [TopProductItem] | Top sản phẩm |
| `productRevenueTrend` | [ProductRevenueTrendItem] | Doanh thu sản phẩm theo thời gian |

### OrderStatusItem

| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Trang thai đơn hàng (PENDING, CONFIRMED, COMPLETED, BLOCKED, OVERDUE) |
| `count` | Int | Số lượng |
| `totalAmount` | Float | Tong giá trị |

### OrderTrendItem

| Field | Type | Description |
|-------|------|-------------|
| `period` | String | Timestamp (milliseconds) dạng string |
| `count` | Int | Số đơn hàng |
| `amount` | Float | Tong giá trị |

### TopProductItem

| Field | Type | Description |
|-------|------|-------------|
| `productName` | String | Ten sản phẩm |
| `quantity` | Int | Số lượng ban |
| `revenue` | Float | Doanh thu |

### ProductRevenueTrendItem

| Field | Type | Description |
|-------|------|-------------|
| `period` | String | Timestamp (milliseconds) dạng string |
| `productName` | String | Ten sản phẩm |
| `quantity` | Int | Số lượng ban trong period |
| `revenue` | Float | Doanh thu trong period |

### CustomerStatsOutput

| Field | Type | Description |
|-------|------|-------------|
| `customersByTier` | [CustomerTierStatsItem] | Phan bo theo tier |
| `customerGrowth` | [CustomerGrowthItem] | Tang truong theo thời gian (dynamic DATE_TRUNC) |
| `averageLtv` | Float | LTV trung bình |
| `churnRate` | Float | Tỷ lệ rời bỏ (%) |
| `engagementDistribution` | [EngagementDistributionItem] | Phan bo muc do tuong tac |
| `topCustomersByRevenue` | [TopCustomerByRevenueItem] | Top khách hàng theo doanh thu |

### CustomerTierStatsItem

| Field | Type | Description |
|-------|------|-------------|
| `tier` | String | Ten tier (STANDARD, SILVER, GOLD, DIAMOND) |
| `count` | Int | Số khách hàng |
| `totalLtv` | Float | Tong LTV cua tier |

### CustomerGrowthItem

| Field | Type | Description |
|-------|------|-------------|
| `period` | String | Timestamp (milliseconds) dạng string |
| `newCustomers` | Int | Khách hàng mới |
| `churnedCustomers` | Int | Khách hàng rời bỏ |
| `netGrowth` | Int | Tang truong rong (newCustomers - churnedCustomers) |

### KpiScorecardOutput

| Field | Type | Description |
|-------|------|-------------|
| `overallAchievementRate` | Float | Tỷ lệ đạt KPI tổng (%) |
| `kpisByCategory` | [KpiCategoryGroup] | KPI nhom theo danh muc |
| `trends` | [KpiTrendItem] | Xu hướng KPI theo thời gian |

### KpiCategoryGroup

| Field | Type | Description |
|-------|------|-------------|
| `category` | String | Ten danh muc (SALES, MARKETING, ...) |
| `kpis` | [KpiDetailItem] | Danh sach KPI trong danh muc |

### KpiDetailItem

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Ten KPI |
| `target` | Float | Gia tri muc tieu |
| `actual` | Float | Gia tri thuc te |
| `progress` | Float | Tien do (%) |
| `status` | String | Trang thai (ACHIEVED, IN_PROGRESS, NOT_STARTED) |

### StaffLeaderboardOutput

| Field | Type | Description |
|-------|------|-------------|
| `rankings` | [LeaderboardRankingItem] | Danh sach xếp hạng |
| `period` | LeaderboardPeriod | Thong tin kỳ |

### LeaderboardRankingItem

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `rank` | Int | No | Thứ hạng |
| `staffName` | String | No | Ten nhân viên |
| `departmentName` | String | No | Ten phòng ban |
| `revenue` | Float | No | Doanh so đơn hàng (order basis) |
| `collectedRevenue` | Float | **Yes** | Doanh thu đãthu (cash basis). Null nếu chưa cópayment confirmed |
| `previousMonthRevenue` | Float | No | Doanh thu order basis tháng trước |
| `orderCount` | Int | No | Số đơn hàng |
| `newCustomers` | Int | No | Khách hàng mới |
| `kpiAchievement` | Float | No | Tỷ lệ đạt KPI (%) |
| `overallScore` | Float | No | Diem tổng hop: `(collectedRevenue ?? revenue) * 0.4 + orderCount * 0.2 + newCustomers * 0.2 + kpiAchievement * 0.2` |

### AlertsOutput

| Field | Type | Description |
|-------|------|-------------|
| `overdueOrders` | [OverdueOrderItem] | Đơn hàng quá hạn |
| `expiringContracts` | [ExpiringContractItem] | Hop dong sắp hết han |
| `pendingPayments` | [PendingPaymentItem] | Thanh toan cho xu ly |
| `underperformingKpis` | [UnderperformingKpiItem] | KPI kem hieu suat |

### OverdueOrderItem

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | ID đơn hàng |
| `orderCode` | String | Ma đơn hàng |
| `daysOverdue` | Int | So ngày quá hạn |

### ExpiringContractItem

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | ID hợp đồng |
| `name` | String | Ten hợp đồng |
| `daysToExpiry` | Int | So ngày đến khi hết hạn |

### PendingPaymentItem

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | ID thanh toán |
| `name` | String | Ten/ma hoa don |
| `amount` | Float | Số tiền |
| `daysPending` | Int | Số ngày chờ |

### UnderperformingKpiItem

| Field | Type | Description |
|-------|------|-------------|
| `kpiName` | String | Ten KPI |
| `progress` | Float | Tien do hiện tại (%) |
| `target` | Float | Muc tieu (%) |

---

## Security Notes

### 2-Layer Access Control

Module Dashboard áp dụng 2 lớp bảo mật:

```
Layer 1: Guards (WorkspaceAuthGuard + UserAuthGuard)
    |
Layer 2: @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'low' | 'medium' })
```

#### Layer 1 - Authentication Guards

| Guard | Chức năng |
|-------|-----------|
| `WorkspaceAuthGuard` | Xác thực workspace từ token |
| `UserAuthGuard` | Xác thực user từ token |

#### Layer 2 - RBAC via @DataScope

| Query | Audit Level | Y nghia |
|-------|-------------|---------|
| `dashboardSummary` | `low` | Truy vấn tổng quát, ít nhất cấm |
| `dashboardAlerts` | `low` | Cảnh báo chung, ít nhất cấm |
| `revenueStats` | `medium` | Dữ liệu doanh thu chi tiết |
| `orderStats` | `medium` | Dữ liệu đơn hàng chi tiết |
| `customerStats` | `medium` | Dữ liệu khách hàng chi tiết |
| `kpiScorecard` | `medium` | Dữ liệu KPI chi tiết |
| `staffLeaderboard` | `medium` | Dữ liệu xếp hạng nhân viên |
| `revenueDailyByWeek` | `medium` | Dữ liệu doanh thu theo ngày/tuần |
| `revenueDailyByMonth` | `medium` | Dữ liệu doanh thu theo thang |
| `revenueDailyByQuarter` | `medium` | Dữ liệu doanh thu theo quy |

> **Lưu ý:** DASHBOARD được phân loại `INTERNAL` (Data Classification). Tất cả nhân viên có tài khoản active đều có thể READ. Tuy nhiên, user cần có casbin rule `ptype='g'` gán role để truy cập được. Nếu không có rule sẽ bị lỗi `Forbidden resource`.

### Department-Level Data Isolation

Khi truyền `departmentId`, dữ liệu tự động lọc theo phòng ban + team con. Điều này đảm bảo:
- Manager chỉ thấy dữ liệu của phòng ban mình
- Director thấy dữ liệu của phòng ban + tất cả team con
- Không truyền `departmentId` = thấy toàn công ty

---

## Error Handling

### Common Errors

| Error Type | Message | Description |
|------------|---------|-------------|
| `UNAUTHENTICATED` | You must be authenticated | Chưa đăng nhập hoặc token hết hạn |
| `FORBIDDEN` | Forbidden resource | User không có quyền truy cập DASHBOARD (thiếu casbin rule) |
| `BAD_REQUEST` | Invalid period | Period không hợp lệ |
| `INTERNAL_SERVER_ERROR` | Failed to get [stats type] | Lỗi truy vấn database |

### Error Response Pattern

```json
{
  "errors": [
    {
      "message": "Forbidden resource",
      "extensions": {
        "code": "FORBIDDEN"
      }
    }
  ],
  "data": null
}
```

### Handling in Frontend

```typescript
try {
  const result = await client.query({
    query: DASHBOARD_SUMMARY,
    variables: { input: { period: 'THIS_MONTH' } },
  });

  if (result.errors) {
    const error = result.errors[0];
    if (error.extensions?.code === 'FORBIDDEN') {
      showError('Bạn không có quyền truy cập Dashboard');
    } else {
      showError('Đã xảy ra lỗi: ' + error.message);
    }
    return;
  }

  // Su dung du lieu
  const summary = result.data.dashboardSummary;
} catch (networkError) {
  showError('Không thể kết nối đến server');
}
```

---

## Best Practices

### 1. Load dashboard tổng quat truoc, chi tiết sau

```typescript
// Buoc 1: Load tổng quat nhanh
const summary = await dashboardSummary({
  variables: { input: { period: 'THIS_MONTH' } },
});

// Buoc 2: Khi user click vao tab Revenue -> load chi tiết
const revenueDetail = await revenueStats({
  variables: { input: { period: 'THIS_MONTH', limit: 20 } },
});
```

### 2. Lọc theo phòng ban cho manager

```typescript
// Manager chi thay du lieu phòng ban mình
const myDepartmentId = currentUser.departmentId;

const result = await dashboardSummary({
  variables: {
    input: {
      period: 'THIS_MONTH',
      departmentId: myDepartmentId,
    },
  },
});
```

### 3. Xem chi tiết 1 nhân viên

```typescript
// Khi manager click vao 1 nhân viên trong leaderboard
const staffDetail = await revenueStats({
  variables: {
    input: {
      period: 'THIS_MONTH',
      staffId: selectedStaffId,
    },
  },
});

// staffDetail.revenueByPeriod = doanh thu theo thời gian cua nhân viên do
// staffDetail.totalRevenue = tổng doanh thu cua nhân viên do
// staffDetail.growthRate = % tăng trưởng so vớikỳ trước cua nhân viên do
```

### 4. Bieu do sản phẩm theo thời gian

```typescript
const orderData = await orderStats({
  variables: {
    input: {
      period: 'THIS_MONTH', // DATE_TRUNC = 'week'
      topProductsLimit: 5,
    },
  },
});

// productRevenueTrend: du lieu đãco sản phẩm + thời gian
// Chuyen doi thanh datasets cho chart library
const datasets = {};

for (const item of orderData.data.orderStats.productRevenueTrend) {
  if (!datasets[item.productName]) {
    datasets[item.productName] = [];
  }
  datasets[item.productName].push({
    x: new Date(Number(item.period)),
    y: item.revenue,
  });
}
```

### 5. Chuyen doi timestamp period

Tat ca các field `period` trong response trả về dang timestamp (milliseconds) làstring. Can convert:

```typescript
// Convert period timestamp sang Date
const date = new Date(Number(periodStr));

// Format theo locale
const label = date.toLocaleDateString('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
```

### 6. Xu ly dual-metric revenue

```typescript
const { collected, order, gap } = revenueData;

// Hien thi 2 cot song song
if (collected && order) {
  // Mode DUAL — hiển thị ca 2
  showDualChart({
    cashRevenue: collected.totalRevenue,
    orderRevenue: order.totalRevenue,
    collectionRate: gap?.collectionRate,
    revenueGap: gap?.revenueGap,
    avgCollectionDays: gap?.avgCollectionDays,
  });
} else if (collected) {
  // Mode CASH — chỉ cash
  showSingleChart('Doanh thu đãthu', collected.totalRevenue);
} else if (order) {
  // Mode ORDER — chi order
  showSingleChart('Doanh so đơn hàng', order.totalRevenue);
}
```

### 7. Xu ly projectedRevenue null

```typescript
const { totalRevenue, projectedRevenue } = revenueData;

if (projectedRevenue !== null) {
  // Hien thi du bao
  showProjection(projectedRevenue);
} else {
  // Da hết kỳ, không códu bao
  hideProjectionWidget();
}
```

### 8. Hien thi leaderboard vớidual-metric

```typescript
const { rankings } = leaderboardData;

for (const staff of rankings) {
  // revenue = order basis (luôn co)
  // collectedRevenue = cash basis (co thếnull)
  const displayRevenue = staff.collectedRevenue ?? staff.revenue;
  const collectionRate = staff.collectedRevenue !== null
    ? (staff.collectedRevenue / staff.revenue * 100).toFixed(1)
    : 'N/A';

  // So sánh với tháng trước
  const growth = staff.previousMonthRevenue > 0
    ? ((staff.revenue - staff.previousMonthRevenue) / staff.previousMonthRevenue * 100).toFixed(1)
    : 'N/A';

  renderRow({
    ...staff,
    collectionRate: `${collectionRate}%`,
    monthlyGrowth: `${growth}%`,
  });
}
```

### 9. Phan trang leaderboard

```typescript
const PAGE_SIZE = 20;
let currentPage = 0;

async function loadLeaderboard(page: number) {
  const result = await staffLeaderboard({
    variables: {
      input: {
        period: 'THIS_MONTH',
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      },
    },
  });

  return result.data.staffLeaderboard.rankings;
}

// Load trang tiếp theo
const nextPage = await loadLeaderboard(currentPage + 1);
```

### 10. Doanh thu theo khoảng tuần (week range)

```typescript
// Query 4 tuần liên tiếp trong 1 request (thay vì 4 request riêng)
const weeklyData = await revenueDailyByWeek({
  variables: {
    input: {
      year: 2026,
      week: 7,
      weekEnd: 10,
      revenueMode: 'DUAL',
    },
  },
});

const { weeklyBreakdown, totalRevenue, gap } =
  weeklyData.data.revenueDailyByWeek;

// weeklyBreakdown: mảng 4 tuần, mỗi tuần có 7 ngày
if (weeklyBreakdown) {
  for (const weekItem of weeklyBreakdown) {
    console.log(
      `Tuần ${weekItem.week}: ${weekItem.totalRevenue}`,
      `(${weekItem.weekStart} → ${weekItem.weekEnd})`,
    );
  }
}

// Top-level = tổng hợp cả khoảng
console.log('Tổng 4 tuần:', totalRevenue);
console.log('Collection rate:', gap?.collectionRate, '%');
```

### 11. So sánh doanh thu 2 phòng ban

```typescript
// Goi 2 query song song vớidepartmentId khac nhau
const [teamA, teamB] = await Promise.all([
  revenueStats({
    variables: {
      input: { period: 'THIS_MONTH', departmentId: 'team-a-uuid' },
    },
  }),
  revenueStats({
    variables: {
      input: { period: 'THIS_MONTH', departmentId: 'team-b-uuid' },
    },
  }),
]);

console.log('Team A:', teamA.data.revenueStats.totalRevenue);
console.log('Team B:', teamB.data.revenueStats.totalRevenue);
```

---

## Changelog

| Phiên bản | Ngày | Thay đổi |
|----------|------|--------|
| 1.6.0 | 2026-02-24 | **Optional Quarter** — `revenueDailyByQuarter`: `quarter` tro thanh optional. Khi khong truyen, tra ve tat ca 4 quy cua nam voi `quarterlyBreakdown[]` (4 items `QuarterBreakdownItem`), `monthlyBreakdown` 12 items, `quarter = null` trong response. Type moi: `QuarterBreakdownItem`. Backward compatible — truyen `quarter` hoat dong y het v1.5. |
| 1.5.0 | 2026-02-24 | **Revenue Daily By Quarter** — them query `revenueDailyByQuarter`: doanh thu theo quy, breakdown theo 3 thang. Moi thang co `totalRevenue` + `dailyRevenue`. Input moi: `RevenueDailyByQuarterInput` (year, quarter). Output moi: `RevenueDailyByQuarterOutput` voi `quarterStart`, `quarterEnd`, `totalDays`, `monthlyBreakdown[]` (3 items `QuarterMonthItem`). Tai su dung `DailyRevenueItem`, `DailyRevenueMetric`, `GapAnalysisOutput`, `DepartmentDailyRevenue`. |
| 1.4.0 | 2026-02-24 | **Revenue Daily By Month** — them query `revenueDailyByMonth`: doanh thu theo thang, breakdown theo tuan ISO. Tuan bien (dau/cuoi thang) chi gom ngay thuoc thang. Input moi: `RevenueDailyByMonthInput` (year, month). Output moi: `RevenueDailyByMonthOutput` voi `monthStart`, `monthEnd`, `daysInMonth`, `weeklyBreakdown[]`. Tai su dung `RevenueDailyWeekItem`, `DailyRevenueItem`, `GapAnalysisOutput`. |
| 1.3.0 | 2026-02-24 | **Week Range Support** — `revenueDailyByWeek`: thêm input `weekEnd` (query khoảng tuần, max 12 tuần). Output mới: `weeklyBreakdown[]` (`RevenueDailyWeekItem`) với chi tiết từng tuần. Top-level fields tổng hợp toàn khoảng. Backward compatible — không truyền `weekEnd` hoạt động y hệt v1.2. |
| 1.2.0 | 2026-02-24 | **Revenue Daily By Week** — thêm query `revenueDailyByWeek`: doanh thu chi tiết 7 ngày trong tuần theo ISO week. Hỗ trợ CASH/ORDER/DUAL, enum `DepartmentScope` (ALL/BY_TEAM/BY_DEPARTMENT), lọc theo `departmentId`. Output mới: `RevenueDailyOutput`, `DailyRevenueItem`, `DailyRevenueMetric`, `DepartmentDailyRevenue`. Tái sử dụng `GapAnalysisOutput` từ v1.1. |
| 1.1.0 | 2026-02-23 | **Dual-Metric Revenue** — `revenueStats`: thêm input `revenueMode` (CASH/ORDER/DUAL), output `collected`/`order`/`gap`. `staffLeaderboard`: thêm `collectedRevenue`, `previousMonthRevenue`. `dashboardSummary.revenue`: thêm `collectedRevenue`, `orderRevenue`, `collectionRate`, `revenueGap`, `collectedByMonth`, `orderByMonth`. Tương thích ngược — frontend cũ không cần thay đổi. |
| 1.0.0 | 2026-02-09 | Phiên bản ban đầu - 7 queries, lọc theo phòng ban, lọc theo nhân viên, DATE_TRUNC động, productRevenueTrend |
