# Dashboard API - Frontend Developer Guide

## Overview

API GraphQL cung cap du lieu tong hop cho bang dieu khien (Dashboard) cua he thong CRM. Module bao gom 7 query endpoints cung cap cac chi so ve doanh thu, don hang, khach hang, KPI, xep hang nhan vien va canh bao.

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Bearer Token (required)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Resolver:** `DashboardQueryResolver`
**Resource RBAC:** `DASHBOARD` (Data Classification: `INTERNAL` - tat ca nhan vien co the doc)

---

## API Categories

### Query APIs (7 endpoints)

| # | Query | Audit Level | Mo ta |
|---|-------|-------------|-------|
| 1 | `dashboardSummary` | `low` | Tong hop tat ca metrics (revenue, order, customer, KPI, payment, contract, alerts) |
| 2 | `revenueStats` | `medium` | Doanh thu theo ky, nhan vien, phong ban. Ho tro so sanh ky truoc & du kien |
| 3 | `orderStats` | `medium` | Don hang theo trang thai, xu huong, top san pham, doanh thu san pham theo ky |
| 4 | `customerStats` | `medium` | Khach hang theo tier, tang truong, LTV, churn rate, top khach hang |
| 5 | `kpiScorecard` | `medium` | KPI theo danh muc, chi tiet, xu huong |
| 6 | `staffLeaderboard` | `medium` | Xep hang nhan vien theo doanh thu, don hang, khach hang |
| 7 | `dashboardAlerts` | `low` | Canh bao: don hang qua han, hop dong sap het, thanh toan cho xu ly, KPI kem |

---

## Shared Concepts

### DashboardPeriod Enum

Tat ca 6/7 queries (tru `dashboardAlerts`) yeu cau tham so `period`:

| Value | Mo ta | DATE_TRUNC Interval |
|-------|-------|-------------------|
| `TODAY` | Hom nay | `hour` |
| `THIS_WEEK` | Tuan nay | `day` |
| `THIS_MONTH` | Thang nay | `week` |
| `THIS_QUARTER` | Quy nay | `month` |
| `THIS_YEAR` | Nam nay | `month` |
| `CUSTOM` | Tuy chinh (can `startDate` + `endDate`) | `month` |

> **DATE_TRUNC Interval** quyet dinh do chi tiet cua du lieu time-series (revenueByPeriod, orderTrend, customerGrowth, productRevenueTrend). Vi du: period = `THIS_WEEK` se tra du lieu nhom theo **ngay**, period = `THIS_MONTH` se nhom theo **tuan**.

### Department Filtering

Khi truyen `departmentId`, he thong tu dong resolve hierarchy (phong ban + tat ca team con) va loc du lieu tuong ung. Co mat o 6/7 endpoints (tru `dashboardAlerts`).

### Staff Filtering

Khi truyen `staffId` (workspaceMemberId), he thong chi tra du lieu cua nhan vien do. Chi co o `revenueStats` va `staffLeaderboard`.

---

## Queries

### 1. dashboardSummary

Lay toan bo du lieu tong hop cua dashboard trong 1 request. Bao gom: revenue, orders, customers, payments, KPIs, contracts, alerts.

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

**Variables (toi thieu):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Variables (day du):**
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

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Yes** | - | Ky bao cao (TODAY, THIS_WEEK, THIS_MONTH, THIS_QUARTER, THIS_YEAR, CUSTOM) |
| `departmentId` | String | No | `null` | Loc theo phong ban (tu dong bao gom team con) |
| `startDate` | String | No | `null` | Ngay bat dau (dung voi period = CUSTOM) |
| `endDate` | String | No | `null` | Ngay ket thuc (dung voi period = CUSTOM) |
| `filters` | JSON | No | `null` | Bo loc tuy chinh |

**Response Success:**
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
          { "kpiName": "So khach hang moi", "progress": 45.0, "target": 100.0 }
        ]
      }
    }
  }
}
```

> **Luu y ve cache:** Response duoc cache theo `period` + `departmentId` + `filters`. Cung `period` nhung khac `departmentId` se tra ket qua khac nhau.

---

### 2. revenueStats

Lay chi tiet thong ke doanh thu: theo thoi gian, phong ban, nhan vien. Ho tro so sanh voi ky truoc va du bao doanh thu.

**Query:**
```graphql
query RevenueStats($input: RevenueStatsInput!) {
  revenueStats(input: $input) {
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
  }
}
```

**Variables (toi thieu):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Variables (loc theo phong ban):**
```json
{
  "input": {
    "period": "THIS_QUARTER",
    "departmentId": "dept-sales-uuid"
  }
}
```

**Variables (loc theo nhan vien cu the):**
```json
{
  "input": {
    "period": "THIS_MONTH",
    "staffId": "workspace-member-uuid",
    "limit": 5
  }
}
```

**Variables (khoang thoi gian tuy chinh):**
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

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Yes** | - | Ky bao cao |
| `departmentId` | String | No | `null` | Loc theo phong ban (+ team con) |
| `staffId` | String | No | `null` | Loc theo nhan vien cu the (workspaceMemberId) |
| `startDate` | String | No | `null` | Ngay bat dau (dung voi CUSTOM) |
| `endDate` | String | No | `null` | Ngay ket thuc (dung voi CUSTOM) |
| `limit` | Int | No | `10` | So luong top nhan vien tra ve (min: 1) |

**Response Success:**
```json
{
  "data": {
    "revenueStats": {
      "totalRevenue": 11000000000,
      "revenueByPeriod": [
        { "period": "1738368000000", "amount": 3500000000, "orderCount": 28 },
        { "period": "1738972800000", "amount": 4200000000, "orderCount": 35 },
        { "period": "1739577600000", "amount": 3300000000, "orderCount": 22 }
      ],
      "revenueByDepartment": [
        { "departmentName": "Sales Team A", "amount": 5500000000, "percentage": 50.0 },
        { "departmentName": "Sales Team B", "amount": 3300000000, "percentage": 30.0 },
        { "departmentName": "Sales Team C", "amount": 2200000000, "percentage": 20.0 }
      ],
      "revenueByStaff": [
        { "staffName": "Jony Ive", "amount": 2800000000, "orderCount": 15, "rank": 1 },
        { "staffName": "Tim Cook", "amount": 2200000000, "orderCount": 12, "rank": 2 },
        { "staffName": "Craig Federighi", "amount": 1500000000, "orderCount": 8, "rank": 3 }
      ],
      "growthRate": 15.79,
      "projectedRevenue": 14500000000
    }
  }
}
```

**Response Success (loc theo staffId - 1 nhan vien):**
```json
{
  "data": {
    "revenueStats": {
      "totalRevenue": 2800000000,
      "revenueByPeriod": [
        { "period": "1738368000000", "amount": 900000000, "orderCount": 5 },
        { "period": "1738972800000", "amount": 1200000000, "orderCount": 7 },
        { "period": "1739577600000", "amount": 700000000, "orderCount": 3 }
      ],
      "revenueByDepartment": [
        { "departmentName": "Sales Team A", "amount": 2800000000, "percentage": 100.0 }
      ],
      "revenueByStaff": [
        { "staffName": "Jony Ive", "amount": 2800000000, "orderCount": 15, "rank": 1 }
      ],
      "growthRate": 22.5,
      "projectedRevenue": 3600000000
    }
  }
}
```

**Ghi chu:**
- `period` trong `revenueByPeriod` la timestamp (milliseconds) dang string. Frontend can convert: `new Date(Number(period))`.
- `projectedRevenue` co the la `null` neu da het ky (vi du: period = THIS_MONTH va hom nay la ngay cuoi thang).
- `growthRate` la % thay doi so voi ky truoc. Gia tri am = giam.
- Khi truyen `departmentId`, `revenueByDepartment` chi hien thi cac team con (team revenue breakdown).

---

### 3. orderStats

Lay thong ke don hang: phan bo theo trang thai, xu huong theo thoi gian, top san pham, gia tri trung binh, doanh thu san pham theo ky.

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

**Variables (toi thieu):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Variables (day du):**
```json
{
  "input": {
    "period": "THIS_QUARTER",
    "departmentId": "dept-uuid",
    "topProductsLimit": 5
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Yes** | - | Ky bao cao |
| `departmentId` | String | No | `null` | Loc theo phong ban (+ team con) |
| `startDate` | String | No | `null` | Ngay bat dau (dung voi CUSTOM) |
| `endDate` | String | No | `null` | Ngay ket thuc (dung voi CUSTOM) |
| `topProductsLimit` | Int | No | `10` | So luong top san pham tra ve (min: 1) |

**Response Success:**
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

**Ghi chu:**
- `averageProcessingTime` don vi la **ngay** (tinh tu luc tao don den khi COMPLETED).
- `conversionRate` la % don hang COMPLETED / tong don hang.
- `topProducts` tra ve san pham co doanh thu cao nhat trong ky.
- `productRevenueTrend` tra ve doanh thu theo san pham + theo ky thoi gian (ket hop). Du lieu sap xep theo period ASC, trong moi period sap xep theo revenue DESC.
- `period` trong `orderTrend` va `productRevenueTrend` la timestamp (milliseconds) dang string.

---

### 4. customerStats

Lay thong ke khach hang: phan bo theo tier, tang truong, LTV, churn rate, top khach hang.

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

**Variables (toi thieu):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Variables (day du):**
```json
{
  "input": {
    "period": "THIS_QUARTER",
    "departmentId": "dept-uuid",
    "topCustomersLimit": 5
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Yes** | - | Ky bao cao |
| `departmentId` | String | No | `null` | Loc theo phong ban (+ team con) |
| `startDate` | String | No | `null` | Ngay bat dau (dung voi CUSTOM) |
| `endDate` | String | No | `null` | Ngay ket thuc (dung voi CUSTOM) |
| `topCustomersLimit` | Int | No | `10` | So luong top khach hang tra ve (min: 1) |

**Response Success:**
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

**Ghi chu:**
- `customerGrowth` su dung dynamic DATE_TRUNC tuong tu revenueByPeriod (TODAY=hour, THIS_WEEK=day, THIS_MONTH=week, ...).
- `churnRate` la % khach hang roi bo trong ky.
- `engagementDistribution` phan bo theo so ngay hoat dong.
- `period` trong `customerGrowth` la timestamp (milliseconds) dang string.

---

### 5. kpiScorecard

Lay bang diem KPI: ty le dat tong, chi tiet theo danh muc, xu huong KPI.

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

**Variables (toi thieu):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Variables (day du):**
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

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Yes** | - | Ky bao cao |
| `departmentId` | String | No | `null` | Loc theo phong ban (+ team con) |
| `year` | Int | No | `null` | Loc theo nam (vi du: 2026) |
| `category` | String | No | `null` | Loc theo danh muc KPI (vi du: SALES, MARKETING) |

**Response Success:**
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
            { "name": "So don hang moi", "target": 50, "actual": 45, "progress": 90.0, "status": "IN_PROGRESS" }
          ]
        },
        {
          "category": "MARKETING",
          "kpis": [
            { "name": "So khach hang moi", "target": 20, "actual": 18, "progress": 90.0, "status": "IN_PROGRESS" }
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

Lay bang xep hang nhan vien theo hieu suat: doanh thu, don hang, khach hang moi, KPI. Ho tro phan trang.

**Query:**
```graphql
query StaffLeaderboard($input: LeaderboardInput!) {
  staffLeaderboard(input: $input) {
    rankings {
      rank
      staffName
      departmentName
      revenue
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

**Variables (toi thieu):**
```json
{
  "input": {
    "period": "THIS_MONTH"
  }
}
```

**Variables (loc theo phong ban + phan trang):**
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

**Variables (loc 1 nhan vien cu the):**
```json
{
  "input": {
    "period": "THIS_MONTH",
    "staffId": "workspace-member-uuid"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `period` | DashboardPeriod | **Yes** | - | Ky bao cao |
| `departmentId` | String | No | `null` | Loc theo phong ban (+ team con) |
| `staffId` | String | No | `null` | Loc theo nhan vien cu the (workspaceMemberId) |
| `startDate` | String | No | `null` | Ngay bat dau (dung voi CUSTOM) |
| `endDate` | String | No | `null` | Ngay ket thuc (dung voi CUSTOM) |
| `limit` | Int | No | `20` | So luong ket qua tra ve (min: 1, max: 50) |
| `offset` | Int | No | `0` | Vi tri bat dau (min: 0) |

**Response Success:**
```json
{
  "data": {
    "staffLeaderboard": {
      "rankings": [
        {
          "rank": 1,
          "staffName": "Jony Ive",
          "departmentName": "Sales Team A",
          "revenue": 2800000000,
          "orderCount": 15,
          "newCustomers": 5,
          "kpiAchievement": 110.0,
          "overallScore": 95.5
        },
        {
          "rank": 2,
          "staffName": "Tim Cook",
          "departmentName": "Sales Team A",
          "revenue": 2200000000,
          "orderCount": 12,
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

**Response Success (loc theo staffId - 1 nhan vien):**
```json
{
  "data": {
    "staffLeaderboard": {
      "rankings": [
        {
          "rank": 1,
          "staffName": "Jony Ive",
          "departmentName": "Sales Team A",
          "revenue": 2800000000,
          "orderCount": 15,
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

**Ghi chu:**
- `overallScore` la diem tong hop tu revenue, orderCount, newCustomers, kpiAchievement.
- Khi dung `staffId`, tra ve dung 1 nhan vien voi rank cua ho trong phong ban/toan cong ty.
- `limit` va `offset` dung cho phan trang khi so luong nhan vien lon.

---

### 7. dashboardAlerts

Lay danh sach canh bao: don hang qua han, hop dong sap het, thanh toan cho xu ly, KPI kem hieu suat. Khong can input parameters.

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

**Variables:** Khong can.

**Response Success:**
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
        { "kpiName": "So khach hang moi", "progress": 45.0, "target": 100.0 },
        { "kpiName": "Ty le chuyen doi", "progress": 60.0, "target": 80.0 }
      ]
    }
  }
}
```

**Response - Khong co canh bao:**
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

## Types

### DashboardSummaryOutput

| Field | Type | Description |
|-------|------|-------------|
| `period` | PeriodOutput | Thong tin ky bao cao |
| `revenue` | RevenueSummary | Tong hop doanh thu |
| `orders` | OrdersSummary | Tong hop don hang |
| `customers` | CustomersSummary | Tong hop khach hang |
| `payments` | PaymentsSummary | Tong hop thanh toan |
| `kpis` | KpisSummary | Tong hop KPI |
| `contracts` | ContractsSummary | Tong hop hop dong |
| `alerts` | AlertsOutput | Canh bao |

### PeriodOutput

| Field | Type | Description |
|-------|------|-------------|
| `start` | String | Ngay bat dau (ISO 8601) |
| `end` | String | Ngay ket thuc (ISO 8601) |
| `periodType` | String | Loai ky (TODAY, THIS_WEEK, ...) |

### RevenueSummary

| Field | Type | Description |
|-------|------|-------------|
| `totalRevenue` | Float | Tong doanh thu trong ky |
| `previousPeriodRevenue` | Float | Doanh thu ky truoc |
| `percentageChange` | Float | % thay doi so voi ky truoc |
| `trend` | String | Xu huong: `UP`, `DOWN`, `STABLE` |
| `revenueByMonth` | [RevenueByMonthItem] | Doanh thu theo thoi gian |

### RevenueStatsOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `totalRevenue` | Float | No | Tong doanh thu (chi COMPLETED orders) |
| `revenueByPeriod` | [RevenueByPeriodItem] | No | Doanh thu theo thoi gian (dynamic DATE_TRUNC) |
| `revenueByDepartment` | [RevenueByDepartmentItem] | No | Doanh thu theo phong ban/team |
| `revenueByStaff` | [RevenueByStaffItem] | No | Doanh thu theo nhan vien |
| `growthRate` | Float | No | % tang truong so voi ky truoc |
| `projectedRevenue` | Float | **Yes** | Doanh thu du kien (null neu da het ky) |

### RevenueByPeriodItem

| Field | Type | Description |
|-------|------|-------------|
| `period` | String | Timestamp (milliseconds) dang string |
| `amount` | Float | Doanh thu trong period |
| `orderCount` | Int | So don hang trong period |

### RevenueByDepartmentItem

| Field | Type | Description |
|-------|------|-------------|
| `departmentName` | String | Ten phong ban |
| `amount` | Float | Doanh thu |
| `percentage` | Float | % so voi tong |

### RevenueByStaffItem

| Field | Type | Description |
|-------|------|-------------|
| `staffName` | String | Ten nhan vien |
| `amount` | Float | Doanh thu |
| `orderCount` | Int | So don hang |
| `rank` | Int | Thu hang |

### OrderStatsOutput

| Field | Type | Description |
|-------|------|-------------|
| `ordersByStatus` | [OrderStatusItem] | Phan bo theo trang thai |
| `orderTrend` | [OrderTrendItem] | Xu huong theo thoi gian (dynamic DATE_TRUNC) |
| `averageOrderValue` | Float | Gia tri don hang trung binh |
| `averageProcessingTime` | Float | Thoi gian xu ly trung binh (ngay) |
| `conversionRate` | Float | Ty le chuyen doi (%) |
| `topProducts` | [TopProductItem] | Top san pham |
| `productRevenueTrend` | [ProductRevenueTrendItem] | Doanh thu san pham theo thoi gian |

### OrderStatusItem

| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Trang thai don hang (PENDING, CONFIRMED, COMPLETED, BLOCKED, OVERDUE) |
| `count` | Int | So luong |
| `totalAmount` | Float | Tong gia tri |

### OrderTrendItem

| Field | Type | Description |
|-------|------|-------------|
| `period` | String | Timestamp (milliseconds) dang string |
| `count` | Int | So don hang |
| `amount` | Float | Tong gia tri |

### TopProductItem

| Field | Type | Description |
|-------|------|-------------|
| `productName` | String | Ten san pham |
| `quantity` | Int | So luong ban |
| `revenue` | Float | Doanh thu |

### ProductRevenueTrendItem

| Field | Type | Description |
|-------|------|-------------|
| `period` | String | Timestamp (milliseconds) dang string |
| `productName` | String | Ten san pham |
| `quantity` | Int | So luong ban trong period |
| `revenue` | Float | Doanh thu trong period |

### CustomerStatsOutput

| Field | Type | Description |
|-------|------|-------------|
| `customersByTier` | [CustomerTierStatsItem] | Phan bo theo tier |
| `customerGrowth` | [CustomerGrowthItem] | Tang truong theo thoi gian (dynamic DATE_TRUNC) |
| `averageLtv` | Float | LTV trung binh |
| `churnRate` | Float | Ty le roi bo (%) |
| `engagementDistribution` | [EngagementDistributionItem] | Phan bo muc do tuong tac |
| `topCustomersByRevenue` | [TopCustomerByRevenueItem] | Top khach hang theo doanh thu |

### CustomerTierStatsItem

| Field | Type | Description |
|-------|------|-------------|
| `tier` | String | Ten tier (STANDARD, SILVER, GOLD, DIAMOND) |
| `count` | Int | So khach hang |
| `totalLtv` | Float | Tong LTV cua tier |

### CustomerGrowthItem

| Field | Type | Description |
|-------|------|-------------|
| `period` | String | Timestamp (milliseconds) dang string |
| `newCustomers` | Int | Khach hang moi |
| `churnedCustomers` | Int | Khach hang roi bo |
| `netGrowth` | Int | Tang truong rong (newCustomers - churnedCustomers) |

### KpiScorecardOutput

| Field | Type | Description |
|-------|------|-------------|
| `overallAchievementRate` | Float | Ty le dat KPI tong (%) |
| `kpisByCategory` | [KpiCategoryGroup] | KPI nhom theo danh muc |
| `trends` | [KpiTrendItem] | Xu huong KPI theo thoi gian |

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
| `rankings` | [LeaderboardRankingItem] | Danh sach xep hang |
| `period` | LeaderboardPeriod | Thong tin ky |

### LeaderboardRankingItem

| Field | Type | Description |
|-------|------|-------------|
| `rank` | Int | Thu hang |
| `staffName` | String | Ten nhan vien |
| `departmentName` | String | Ten phong ban |
| `revenue` | Float | Doanh thu |
| `orderCount` | Int | So don hang |
| `newCustomers` | Int | Khach hang moi |
| `kpiAchievement` | Float | Ty le dat KPI (%) |
| `overallScore` | Float | Diem tong hop |

### AlertsOutput

| Field | Type | Description |
|-------|------|-------------|
| `overdueOrders` | [OverdueOrderItem] | Don hang qua han |
| `expiringContracts` | [ExpiringContractItem] | Hop dong sap het han |
| `pendingPayments` | [PendingPaymentItem] | Thanh toan cho xu ly |
| `underperformingKpis` | [UnderperformingKpiItem] | KPI kem hieu suat |

### OverdueOrderItem

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | ID don hang |
| `orderCode` | String | Ma don hang |
| `daysOverdue` | Int | So ngay qua han |

### ExpiringContractItem

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | ID hop dong |
| `name` | String | Ten hop dong |
| `daysToExpiry` | Int | So ngay den khi het han |

### PendingPaymentItem

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | ID thanh toan |
| `name` | String | Ten/ma hoa don |
| `amount` | Float | So tien |
| `daysPending` | Int | So ngay cho |

### UnderperformingKpiItem

| Field | Type | Description |
|-------|------|-------------|
| `kpiName` | String | Ten KPI |
| `progress` | Float | Tien do hien tai (%) |
| `target` | Float | Muc tieu (%) |

---

## Security Notes

### 2-Layer Access Control

Module Dashboard ap dung 2 lop bao mat:

```
Layer 1: Guards (WorkspaceAuthGuard + UserAuthGuard)
    |
Layer 2: @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'low' | 'medium' })
```

#### Layer 1 - Authentication Guards

| Guard | Chuc nang |
|-------|-----------|
| `WorkspaceAuthGuard` | Xac thuc workspace tu token |
| `UserAuthGuard` | Xac thuc user tu token |

#### Layer 2 - RBAC via @DataScope

| Query | Audit Level | Y nghia |
|-------|-------------|---------|
| `dashboardSummary` | `low` | Truy van tong quat, it nhat cam |
| `dashboardAlerts` | `low` | Canh bao chung, it nhat cam |
| `revenueStats` | `medium` | Du lieu doanh thu chi tiet |
| `orderStats` | `medium` | Du lieu don hang chi tiet |
| `customerStats` | `medium` | Du lieu khach hang chi tiet |
| `kpiScorecard` | `medium` | Du lieu KPI chi tiet |
| `staffLeaderboard` | `medium` | Du lieu xep hang nhan vien |

> **Luu y:** DASHBOARD duoc phan loai `INTERNAL` (Data Classification). Tat ca nhan vien co tai khoan active deu co the READ. Tuy nhien, user can co casbin rule `ptype='g'` gan role moi truy cap duoc. Neu khong co rule se bi loi `Forbidden resource`.

### Department-Level Data Isolation

Khi truyen `departmentId`, du lieu tu dong loc theo phong ban + team con. Dieu nay dam bao:
- Manager chi thay du lieu cua phong ban minh
- Director thay du lieu cua phong ban + tat ca team con
- Khong truyen `departmentId` = thay toan cong ty

---

## Error Handling

### Common Errors

| Error Type | Message | Description |
|------------|---------|-------------|
| `UNAUTHENTICATED` | You must be authenticated | Chua dang nhap hoac token het han |
| `FORBIDDEN` | Forbidden resource | User khong co quyen truy cap DASHBOARD (thieu casbin rule) |
| `BAD_REQUEST` | Invalid period | Period khong hop le |
| `INTERNAL_SERVER_ERROR` | Failed to get [stats type] | Loi truy van database |

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
      showError('Ban khong co quyen truy cap Dashboard');
    } else {
      showError('Da xay ra loi: ' + error.message);
    }
    return;
  }

  // Su dung du lieu
  const summary = result.data.dashboardSummary;
} catch (networkError) {
  showError('Khong the ket noi den server');
}
```

---

## Best Practices

### 1. Load dashboard tong quat truoc, chi tiet sau

```typescript
// Buoc 1: Load tong quat nhanh
const summary = await dashboardSummary({
  variables: { input: { period: 'THIS_MONTH' } },
});

// Buoc 2: Khi user click vao tab Revenue -> load chi tiet
const revenueDetail = await revenueStats({
  variables: { input: { period: 'THIS_MONTH', limit: 20 } },
});
```

### 2. Loc theo phong ban cho manager

```typescript
// Manager chi thay du lieu phong ban minh
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

### 3. Xem chi tiet 1 nhan vien

```typescript
// Khi manager click vao 1 nhan vien trong leaderboard
const staffDetail = await revenueStats({
  variables: {
    input: {
      period: 'THIS_MONTH',
      staffId: selectedStaffId,
    },
  },
});

// staffDetail.revenueByPeriod = doanh thu theo thoi gian cua nhan vien do
// staffDetail.totalRevenue = tong doanh thu cua nhan vien do
// staffDetail.growthRate = % tang truong so voi ky truoc cua nhan vien do
```

### 4. Bieu do san pham theo thoi gian

```typescript
const orderData = await orderStats({
  variables: {
    input: {
      period: 'THIS_MONTH', // DATE_TRUNC = 'week'
      topProductsLimit: 5,
    },
  },
});

// productRevenueTrend: du lieu da co san pham + thoi gian
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

Tat ca cac field `period` trong response tra ve dang timestamp (milliseconds) la string. Can convert:

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

### 6. Xu ly projectedRevenue null

```typescript
const { totalRevenue, projectedRevenue } = revenueData;

if (projectedRevenue !== null) {
  // Hien thi du bao
  showProjection(projectedRevenue);
} else {
  // Da het ky, khong co du bao
  hideProjectionWidget();
}
```

### 7. Phan trang leaderboard

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

// Load trang tiep theo
const nextPage = await loadLeaderboard(currentPage + 1);
```

### 8. So sanh doanh thu 2 phong ban

```typescript
// Goi 2 query song song voi departmentId khac nhau
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

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-09 | Initial release - 7 queries, department filtering, staff filtering, dynamic DATE_TRUNC, productRevenueTrend |
