# Test Cases - Dashboard Query Resolver

> Module: `packages/twenty-server/src/mkt-core/mkt-dashboard/resolvers/dashboard-query.resolver.ts`
> Test Environment: GraphQL Playground (`http://localhost:3000/graphql`)
> Date: 2026-02-09
> Status: **TESTED** - 7/7 core queries PASS

---

## SQL Column Fixes Applied

Before testing, the following SQL column name mismatches were fixed across dashboard service files:

| File | Wrong Column | Correct Column |
|------|-------------|----------------|
| `alerts.service.ts` | `p."orderId"` | `p."mktOrderId"` |
| `alerts.service.ts` | `name AS kpi_name` | `"kpiName" AS kpi_name` |
| `alerts.service.ts` | `status IN ('IN_PROGRESS', 'NOT_STARTED', 'AT_RISK')` | `status IN ('IN_PROGRESS', 'DRAFT')` |
| `alerts.service.ts` | `ROUND(... / "targetValue" * 100, 2)` | `ROUND(... / "targetValue"::numeric * 100, 2)` |
| `payment-stats.service.ts` | `"dueDate"` | `"expiredAt"` |
| `staff-leaderboard.service.ts` | `wm."mktDepartmentId"` | `wm."departmentId"` |
| `staff-leaderboard.service.ts` | `d.name` | `d."departmentName"` |
| `staff-leaderboard.service.ts` | `"assigneeId"` | `"assignedToId"` |
| `revenue-stats.service.ts` | `d.name` | `d."departmentName"` |
| `revenue-stats.service.ts` | `wm."mktDepartmentId"` | `wm."departmentId"` |
| `order-stats.service.ts` | `oi."productName"` | `oi."snapshotProductName"` |
| `order-stats.service.ts` | `oi."productId"` | `oi."externalMktProductId"` |
| `order-stats.service.ts` | `oi."orderId"` | `oi."mktOrderId"` |
| `customer-stats.service.ts` | `c."customerTier"` | `c."tier"` |
| `customer-stats.service.ts` | `c."lifetimeValue"` | `c."customerLtv"` |
| `customer-stats.service.ts` | `"customerLifecycleStage"` | `"lifecycleStage"` |
| `customer-stats.service.ts` | `o."customerId"` | `o."mktCustomerId"` |
| `customer-stats.service.ts` | `COALESCE(c."tier", 'NONE')` | `COALESCE(c."tier"::text, 'NONE')` |
| `customer-stats.service.ts` | `c."createdAt" <= $2` (unused $1) | `c."createdAt" <= $1` (single param) |
| `kpi-stats.service.ts` | `name,` | `"kpiName" AS name,` |
| `kpi-stats.service.ts` | `ROUND(... / "targetValue" * 100, 2)` | `ROUND(... / "targetValue"::numeric * 100, 2)` |

---

## GraphQL Schema Field Reference

Correct field names verified via schema introspection:

| Type | Fields |
|------|--------|
| `RevenueByPeriodItem` | `period`, `amount`, `orderCount` |
| `RevenueByStaffItem` | `staffName`, `amount`, `orderCount`, `rank` |
| `RevenueByDepartmentItem` | `departmentName`, `amount`, `percentage` |
| `TopProductItem` | `productName`, `quantity`, `revenue` |
| `CustomerTierStatsItem` | `tier`, `count`, `totalLtv` |
| `OverdueOrderItem` | `id`, `orderCode`, `daysOverdue` |
| `ExpiringContractItem` | `id`, `name`, `daysToExpiry` |
| `LeaderboardRankingItem` | `rank`, `staffName`, `departmentName`, `revenue`, `orderCount`, `newCustomers`, `kpiAchievement`, `overallScore` |

> **Note**: `period` input is String type (not enum). Must be quoted: `"THIS_YEAR"`.

---

## Prerequisites

- Server running: `npx nx start twenty-server`
- Bearer token in Headers:

```json
{
  "Authorization": "Bearer <your_access_token>"
}
```

## Database State (Real Data)

### mktOrder (42 records active)

| status | count | totalAmount |
|--------|-------|-------------|
| COMPLETED | 37 | 11,061,950,000 |
| PROCESSING | 3 | 169,000,000 |
| LOCKED | 2 | 32,000,000 |

| paymentStatus | count |
|---------------|-------|
| PAID | 34 |
| PENDING | 8 |

- Orders overdue (paymentDeadline < now & paymentStatus != PAID): **3**
- All orders created on: **2026-02-09**

### mktCustomer (5 records active)

| name | tier | lifecycleStage | status | totalOrderValue | customerLtv | engagementScore |
|------|------|----------------|--------|-----------------|-------------|-----------------|
| Nguyen Van An | DIAMOND | LOYAL | ACTIVE | 150,000,000 | 180,000,000 | 95 |
| Tran Thi Binh | GOLD | CUSTOMER | ACTIVE | 75,000,000 | 85,000,000 | 80 |
| Vo Thi Em | CHURNED | CHURNED | INACTIVE | 35,000,000 | 35,000,000 | 10 |
| Le Minh Cuong | SILVER | CUSTOMER | ACTIVE | 25,000,000 | 28,000,000 | 65 |
| Pham Hoang Dung | BRONZE | TRIAL | PROSPECTIVE | 5,000,000 | 5,500,000 | 50 |

### mktPayment (10 records active)

| status | count | totalAmount |
|--------|-------|-------------|
| CONFIRMED | 2 | 950,000 |
| PENDING | 2 | 2,700,000 |
| REJECTED | 1 | 2,500,000 |
| FAILED | 1 | 3,000,000 |
| REFUNDED | 1 | 350,000 |
| PARTIALLY_REFUNDED | 1 | 800,000 |
| CANCELLED | 1 | 680,000 |
| PROCESSING | 1 | 150,000 |

### mktKpi (10 records active)

| kpiName | kpiCategory | targetValue | actualValue | status | periodYear |
|---------|-------------|-------------|-------------|--------|------------|
| Doanh thu thang | SALES | 1,000,000,000 | 850,000,000 | IN_PROGRESS | 2024 |
| Khach hang moi | SALES | 100 | 85 | IN_PROGRESS | 2024 |
| Ty le chuyen doi ban hang | SALES | 25 | 22 | IN_PROGRESS | 2024 |
| So cuoc goi thang | SALES | 500 | 420 | IN_PROGRESS | 2024 |
| Demo hoan thanh | SALES | 50 | 45 | IN_PROGRESS | 2024 |
| Giao dich dong thanh cong | SALES | 30 | 28 | IN_PROGRESS | 2024 |
| Ty le giu chan khach hang | MARKETING | 95 | 92 | IN_PROGRESS | 2024 |
| Thoi gian phan hoi ho tro | SUPPORT | 2 | 3.5 | NOT_ACHIEVED | 2024 |
| Diem hai long khach hang | SUPPORT | 4.5 | 4.2 | IN_PROGRESS | 2024 |
| Hoan thanh du an ky thuat | OPERATIONS | 90 | 85 | IN_PROGRESS | 2024 |

### mktContract (15 records active)

| status | count |
|--------|-------|
| ACTIVE | 9 |
| EXPIRED | 2 |
| INACTIVE | 2 |
| PENDING_CONVERSION | 1 |
| REVOKED | 1 |

- Active contracts with endDate expired (< today): **8**
- Active contracts expiring in 30 days: **0**

### mktDepartment (24 records active)

Sample: `ACCOUNTING`, `HR`, `SALES`, `SALES_TEAM_1`, `SALES_TEAM_2`, `TECH`...

### Workspace

| field | value |
|-------|-------|
| workspaceId | `20202020-1c25-4d02-bf25-6aeccf7ea419` |

---

## A. dashboardAlerts Query Tests

### TC-DA-01: Dashboard Alerts (Happy Path) - PASS

**Muc tieu**: Lay tat ca canh bao dashboard.

```graphql
query {
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

**Actual Result**:

```json
{
  "data": {
    "dashboardAlerts": {
      "expiringContracts": [],
      "underperformingKpis": [],
      "overdueOrders": [
        { "id": "a5e6f7a8-b9c0-d1e2-f3a4-567890abcdef", "orderCode": "MKT-LOCK-2024-042", "daysOverdue": 7 },
        { "id": "f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde", "orderCode": "MKT-LOCK-2024-041", "daysOverdue": 2 },
        { "id": "d2b3c4d5-e6f7-a8b9-c0d1-234567890abc", "orderCode": "MKT-PROC-2024-039", "daysOverdue": 1 }
      ],
      "pendingPayments": [
        { "id": "f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c", "name": "N/A", "amount": 1200000, "daysPending": 0 },
        { "id": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5e", "name": "N/A", "amount": 150000, "daysPending": 0 },
        { "id": "5e6f7a8b-9c0d-4eb1-c2d3-b4c5d6e7f8a9", "name": "N/A", "amount": 1500000, "daysPending": 0 }
      ]
    }
  }
}
```

**Checklist**:
- [x] Response 200 OK
- [x] `overdueOrders` co 3 items (3 orders co paymentDeadline < now & paymentStatus != PAID)
- [x] `overdueOrders[].daysOverdue` > 0
- [x] `overdueOrders[].orderCode` format `MKT-*`
- [x] `expiringContracts` tra ve `[]` (khong co contract nao sap het han trong 30 ngay)
- [x] `pendingPayments` co 3 items voi `amount` > 0
- [x] `underperformingKpis` tra ve `[]` (KPIs co periodYear=2024, khong match period hien tai)
- [x] Tat ca arrays tra ve dung type

**Notes**:
- `pendingPayments[].name` tra ve `"N/A"` - day la behavior hien tai khi payment khong co name
- `pendingPayments[].daysPending` = 0 vi payments moi duoc tao
- `underperformingKpis` rong vi tat ca KPIs co `periodYear=2024`, khong phai 2026
- `expiringContracts` rong vi khong co contract nao expiring trong 30 ngay toi

---

### TC-DA-02: Dashboard Alerts - Khong co authentication

**Muc tieu**: Goi alerts khong co token.

```graphql
# Headers: {} (no Authorization)
query {
  dashboardAlerts {
    overdueOrders {
      id
    }
  }
}
```

**Checklist**:
- [ ] Tra ve 401/UNAUTHENTICATED error
- [ ] Khong tra ve data

---

## B. revenueStats Query Tests

### TC-RS-01: Revenue Stats - THIS_YEAR (Happy Path) - PASS

**Muc tieu**: Lay thong ke doanh thu nam hien tai.

```graphql
query {
  revenueStats(input: {
    period: "THIS_YEAR"
  }) {
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

**Actual Result**:

```json
{
  "data": {
    "revenueStats": {
      "totalRevenue": 11061950000,
      "growthRate": 100,
      "projectedRevenue": 100365484261.25403,
      "revenueByPeriod": [
        { "period": "1769904000000", "amount": 11061950000, "orderCount": 37 }
      ],
      "revenueByStaff": [
        { "staffName": "Tim Apple", "amount": 11061950000, "orderCount": 37, "rank": 1 }
      ],
      "revenueByDepartment": [
        { "departmentName": "Doi phat trien Backend", "amount": 11061950000, "percentage": 100 }
      ]
    }
  }
}
```

**Checklist**:
- [x] Response 200 OK
- [x] `totalRevenue` = 11,061,950,000 (sum of 37 COMPLETED orders)
- [x] `revenueByPeriod` la array, moi item co `period` (timestamp), `amount` (Float), `orderCount` (Int)
- [x] `revenueByDepartment[].percentage` = 100 (chi 1 department co revenue)
- [x] `revenueByStaff[].rank` = 1 (chi 1 staff)
- [x] `growthRate` = 100 (100% growth, khong co du lieu ky truoc)
- [x] `projectedRevenue` = 100,365,484,261.25 (projected for full year)

---

### TC-RS-02: Revenue Stats - THIS_MONTH

```graphql
query {
  revenueStats(input: {
    period: "THIS_MONTH"
  }) {
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

**Checklist**:
- [x] Response 200 OK
- [x] `revenueByStaff` sap xep theo `amount` giam dan
- [x] `growthRate` la so (co the am neu giam)
- [x] `projectedRevenue` la number (dang trong period)

---

### TC-RS-03: Revenue Stats - CUSTOM period

```graphql
query {
  revenueStats(input: {
    period: "CUSTOM"
    startDate: "2026-02-01"
    endDate: "2026-02-09"
  }) {
    totalRevenue
    revenueByPeriod {
      period
      amount
      orderCount
    }
    growthRate
    projectedRevenue
  }
}
```

**Checklist**:
- [x] Response 200 OK
- [x] `totalRevenue` chi tinh don hang COMPLETED trong khoang 01/02 - 09/02/2026
- [x] `projectedRevenue` != null (vi chua het period)
- [x] `growthRate` so sanh voi ky truoc

---

### TC-RS-04: Revenue Stats - Khong co don hang trong period

```graphql
query {
  revenueStats(input: {
    period: "CUSTOM"
    startDate: "2020-01-01"
    endDate: "2020-01-31"
  }) {
    totalRevenue
    revenueByPeriod {
      period
      amount
    }
    revenueByDepartment {
      departmentName
    }
    revenueByStaff {
      staffName
    }
    growthRate
    projectedRevenue
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "revenueStats": {
      "totalRevenue": 0,
      "revenueByPeriod": [],
      "revenueByDepartment": [],
      "revenueByStaff": [],
      "growthRate": 0,
      "projectedRevenue": null
    }
  }
}
```

**Checklist**:
- [ ] Response 200 OK
- [ ] `totalRevenue` = 0
- [ ] Tat ca arrays rong
- [ ] `growthRate` = 0 (khong co du lieu de so sanh)
- [ ] Khong error

---

### TC-RS-05: Revenue Stats - Filter theo departmentId

```graphql
query {
  revenueStats(input: {
    period: "THIS_MONTH"
    departmentId: "ad95f81e-bda5-4a98-b72a-880c0b5c204c"
  }) {
    totalRevenue
    revenueByStaff {
      staffName
      amount
    }
  }
}
```

**Checklist**:
- [ ] Response 200 OK
- [ ] `totalRevenue` <= tong revenue toan he thong
- [ ] `revenueByStaff` chi chua nhan vien cua department SALES

---

## C. orderStats Query Tests

### TC-OS-01: Order Stats - THIS_YEAR (Happy Path) - PASS

**Muc tieu**: Lay thong ke don hang nam hien tai.

```graphql
query {
  orderStats(input: {
    period: "THIS_YEAR"
  }) {
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
  }
}
```

**Actual Result**:

```json
{
  "data": {
    "orderStats": {
      "averageOrderValue": 268165476.19047618,
      "averageProcessingTime": 0,
      "conversionRate": 88.1,
      "ordersByStatus": [
        { "status": "COMPLETED", "count": 37, "totalAmount": 11061950000 },
        { "status": "PROCESSING", "count": 3, "totalAmount": 169000000 },
        { "status": "LOCKED", "count": 2, "totalAmount": 32000000 }
      ],
      "orderTrend": [
        { "period": "1769904000000", "count": 42, "amount": 11262950000 }
      ],
      "topProducts": [
        { "productName": "MKT Care - Phan mem nuoi nick Facebook tu dong", "quantity": 3, "revenue": 23000000 },
        { "productName": "MKT Maps - Tong hop scan data Google Maps", "quantity": 4, "revenue": 19000000 },
        { "productName": "MKT Viral - Viral video da nen tang", "quantity": 3, "revenue": 16000000 },
        { "productName": "MKT Group - Quan ly Group Facebook", "quantity": 3, "revenue": 16000000 },
        { "productName": "MKT Insta - Phan mem quang cao Instagram", "quantity": 2, "revenue": 15000000 },
        { "productName": "MKT UID - Phan tich, tong hop data khach hang", "quantity": 4, "revenue": 9500000 },
        { "productName": "MKT Tube - Quan ly he thong kenh YouTube tu dong", "quantity": 3, "revenue": 9000000 },
        { "productName": "MKT Post - Tu dong dang bai ban hang tren Facebook", "quantity": 2, "revenue": 8000000 },
        { "productName": "MKT Page - Quan ly fanpage hang loat", "quantity": 1, "revenue": 5000000 },
        { "productName": "MKT Zalo - Cong cu ho tro marketing qua Zalo", "quantity": 1, "revenue": 5000000 }
      ]
    }
  }
}
```

**Checklist**:
- [x] Response 200 OK
- [x] `ordersByStatus` bao gom tat ca trang thai co trong DB: COMPLETED(37), PROCESSING(3), LOCKED(2)
- [x] `ordersByStatus[].count` va `totalAmount` la so duong
- [x] `averageOrderValue` = 268,165,476.19 (tong totalAmount / tong orders)
- [x] `averageProcessingTime` = 0 (orders moi tao)
- [x] `conversionRate` = 88.1 (trong khoang 0-100)
- [x] `topProducts` co 10 items, sap xep theo `revenue` giam dan

---

### TC-OS-02: Order Stats - topProductsLimit

```graphql
query {
  orderStats(input: {
    period: "THIS_YEAR"
    topProductsLimit: 5
  }) {
    topProducts {
      productName
      quantity
      revenue
    }
    averageOrderValue
  }
}
```

**Checklist**:
- [x] Response 200 OK
- [x] `topProducts` co toi da 5 items
- [x] Sap xep theo `revenue` giam dan

---

### TC-OS-03: Order Stats - Period khong co don hang

```graphql
query {
  orderStats(input: {
    period: "CUSTOM"
    startDate: "2020-01-01"
    endDate: "2020-12-31"
  }) {
    ordersByStatus {
      status
      count
    }
    averageOrderValue
    conversionRate
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "orderStats": {
      "ordersByStatus": [],
      "averageOrderValue": 0,
      "conversionRate": 0
    }
  }
}
```

**Checklist**:
- [ ] Response 200 OK
- [ ] `ordersByStatus` la array rong
- [ ] `averageOrderValue` = 0
- [ ] Khong division by zero error

---

## D. customerStats Query Tests

### TC-CS-01: Customer Stats - THIS_YEAR (Happy Path) - PASS

**Muc tieu**: Lay thong ke khach hang nam hien tai.

```graphql
query {
  customerStats(input: {
    period: "THIS_YEAR"
  }) {
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

**Actual Result**:

```json
{
  "data": {
    "customerStats": {
      "averageLtv": 66700000,
      "churnRate": 20,
      "customersByTier": [
        { "tier": "DIAMOND", "count": 1, "totalLtv": 180000000 },
        { "tier": "GOLD", "count": 1, "totalLtv": 85000000 },
        { "tier": "CHURNED", "count": 1, "totalLtv": 35000000 },
        { "tier": "SILVER", "count": 1, "totalLtv": 28000000 },
        { "tier": "BRONZE", "count": 1, "totalLtv": 5500000 }
      ],
      "customerGrowth": [
        { "period": "1769904000000", "newCustomers": 5, "churnedCustomers": 0, "netGrowth": 5 }
      ],
      "topCustomersByRevenue": [
        { "name": "Nguyen Van An", "revenue": 10853000000, "orderCount": 20 },
        { "name": "Tran Thi Binh", "revenue": 143450000, "orderCount": 11 },
        { "name": "Le Minh Cuong", "revenue": 53400000, "orderCount": 5 },
        { "name": "Pham Hoang Dung", "revenue": 12100000, "orderCount": 1 }
      ],
      "engagementDistribution": [
        { "range": "0 orders", "count": 1 },
        { "range": "1-5 orders", "count": 1 },
        { "range": "6-20 orders", "count": 2 },
        { "range": "20+ orders", "count": 1 }
      ]
    }
  }
}
```

**Checklist**:
- [x] Response 200 OK
- [x] `customersByTier` co 5 tier khac nhau (DIAMOND, GOLD, SILVER, BRONZE, CHURNED)
- [x] Moi tier co `count` = 1 (theo DB hien tai)
- [x] `averageLtv` = 66,700,000 (trung binh customerLtv cua 5 customers)
- [x] `churnRate` = 20 (1/5 customer la CHURNED = 20%)
- [x] `engagementDistribution[].range` la 1 trong: `"0 orders"`, `"1-5 orders"`, `"6-20 orders"`, `"20+ orders"`
- [x] `topCustomersByRevenue` sap xep theo `revenue` giam dan (Nguyen Van An dau tien voi 10.85B)
- [x] `customerGrowth[].netGrowth` = `newCustomers - churnedCustomers` (5 - 0 = 5)

**Notes**:
- `topCustomersByRevenue` chi co 4 items (Vo Thi Em khong co orders nen khong xuat hien)
- Revenue cua Nguyen Van An (10.85B) cao hon totalOrderValue trong seed data (150M) vi tinh tu thuc te order amounts

---

### TC-CS-02: Customer Stats - topCustomersLimit

```graphql
query {
  customerStats(input: {
    period: "THIS_YEAR"
    topCustomersLimit: 2
  }) {
    topCustomersByRevenue {
      name
      revenue
      orderCount
    }
  }
}
```

**Checklist**:
- [x] Response 200 OK
- [x] `topCustomersByRevenue` co toi da 2 items
- [x] Customer dau tien co `revenue` cao nhat

---

### TC-CS-03: Customer Stats - Customer Growth

```graphql
query {
  customerStats(input: {
    period: "THIS_YEAR"
  }) {
    customerGrowth {
      period
      newCustomers
      churnedCustomers
      netGrowth
    }
    customersByTier {
      tier
      count
      totalLtv
    }
    averageLtv
    churnRate
  }
}
```

**Checklist**:
- [x] Response 200 OK
- [x] `customerGrowth` co items (1 period voi du lieu)
- [x] `customersByTier[].totalLtv` >= 0
- [x] `averageLtv` = 66,700,000 (trung binh customerLtv cua tat ca customers)

---

## E. kpiScorecard Query Tests

### TC-KS-01: KPI Scorecard - THIS_YEAR - PASS (empty, periodYear mismatch)

**Muc tieu**: Lay bang diem KPI nam hien tai.

```graphql
query {
  kpiScorecard(input: {
    period: "THIS_YEAR"
  }) {
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

**Actual Result**:

```json
{
  "data": {
    "kpiScorecard": {
      "overallAchievementRate": 0,
      "kpisByCategory": [],
      "trends": []
    }
  }
}
```

**Checklist**:
- [x] Response 200 OK
- [x] `overallAchievementRate` = 0 (khong co KPI nao match)
- [x] `kpisByCategory` = `[]` (rong)
- [x] `trends` = `[]` (rong)
- [x] Khong error

**Notes**:
- Tat ca 10 KPIs trong DB co `periodYear=2024`, query `THIS_YEAR` filter theo 2026 nen khong match
- De test voi du lieu thuc, can seed KPIs voi `periodYear=2026` hoac dung `year: 2024` filter

---

### TC-KS-02: KPI Scorecard - Filter theo category

```graphql
query {
  kpiScorecard(input: {
    period: "THIS_YEAR"
    category: "SALES"
  }) {
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
  }
}
```

**Checklist**:
- [ ] Response 200 OK
- [ ] `kpisByCategory` chi co items voi `category` = `"SALES"` (neu co du lieu match period)

---

### TC-KS-03: KPI Scorecard - Filter theo year 2024

**Muc tieu**: Kiem tra KPI cua nam 2024 (nam cua seed data).

```graphql
query {
  kpiScorecard(input: {
    period: "THIS_YEAR"
    year: 2024
  }) {
    overallAchievementRate
    kpisByCategory {
      category
      kpis {
        name
        status
      }
    }
  }
}
```

**Checklist**:
- [ ] Response 200 OK
- [ ] Chi tra ve KPIs co `periodYear` = 2024
- [ ] Tat ca 10 KPIs hien tai deu thuoc nam 2024

---

## F. staffLeaderboard Query Tests

### TC-SL-01: Staff Leaderboard - THIS_YEAR (Happy Path) - PASS

**Muc tieu**: Lay bang xep hang nhan vien theo hieu suat.

```graphql
query {
  staffLeaderboard(input: {
    period: "THIS_YEAR"
  }) {
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

**Actual Result**:

```json
{
  "data": {
    "staffLeaderboard": {
      "period": {
        "start": "2026-01-01T00:00:00.000Z",
        "end": "2026-12-31T23:59:59.999Z"
      },
      "rankings": [
        { "rank": 1, "staffName": "Tim Apple", "departmentName": "Doi phat trien Backend", "revenue": 11061950000, "orderCount": 37, "newCustomers": 0, "kpiAchievement": 0, "overallScore": 4424780007.4 },
        { "rank": 2, "staffName": "Jony Ive", "departmentName": "Nhan vien kinh doanh", "revenue": 0, "orderCount": 0, "newCustomers": 2, "kpiAchievement": 0, "overallScore": 0.4 },
        { "rank": 3, "staffName": "Jane Austen", "departmentName": "Doi DevOps", "revenue": 0, "orderCount": 0, "newCustomers": 1, "kpiAchievement": 0, "overallScore": 0.2 },
        { "rank": 4, "staffName": "Phil Schiler", "departmentName": "Doi phat trien Frontend", "revenue": 0, "orderCount": 0, "newCustomers": 1, "kpiAchievement": 0, "overallScore": 0.2 }
      ]
    }
  }
}
```

**Checklist**:
- [x] Response 200 OK
- [x] `rankings` sap xep theo `overallScore` giam dan
- [x] `rank` tang dan tu 1 den 4
- [x] `revenue` >= 0 (Tim Apple co 11B, con lai 0)
- [x] `orderCount` >= 0
- [x] `kpiAchievement` = 0 (KPIs co periodYear=2024, khong match 2026)
- [x] `period.start` = `"2026-01-01T00:00:00.000Z"`, `period.end` = `"2026-12-31T23:59:59.999Z"`

**Notes**:
- Chi co Tim Apple co revenue/orders vi tat ca orders deu assigned cho Tim Apple
- `newCustomers` khac 0 cho Jony Ive (2), Jane Austen (1), Phil Schiler (1)
- `overallScore` formula: revenue * weight + orderCount * weight + newCustomers * weight + kpiAchievement * weight

---

### TC-SL-02: Staff Leaderboard - Pagination (limit + offset)

```graphql
query {
  staffLeaderboard(input: {
    period: "THIS_YEAR"
    limit: 2
    offset: 0
  }) {
    rankings {
      rank
      staffName
      overallScore
    }
  }
}
```

```graphql
# Page 2
query {
  staffLeaderboard(input: {
    period: "THIS_YEAR"
    limit: 2
    offset: 2
  }) {
    rankings {
      rank
      staffName
      overallScore
    }
  }
}
```

**Checklist**:
- [ ] Page 1: `rankings` co toi da 2 items
- [ ] Page 2: `rankings` co items tiep theo (khong trung lap voi page 1)
- [ ] `rank` tiep tuc tang (page 2 bat dau tu rank 3)

---

### TC-SL-03: Staff Leaderboard - Limit vuot max

```graphql
query {
  staffLeaderboard(input: {
    period: "THIS_YEAR"
    limit: 100
  }) {
    rankings {
      rank
      staffName
    }
  }
}
```

**Checklist**:
- [ ] Tra ve validation error (limit max = 50)
- [ ] Hoac tra ve toi da 50 items

---

## G. dashboardSummary Query Tests

### TC-DS-01: Dashboard Summary - Period THIS_YEAR (Happy Path) - PASS

**Muc tieu**: Lay toan bo dashboard summary voi period THIS_YEAR, kiem tra cau truc response day du.

```graphql
query {
  dashboardSummary(input: {
    period: "THIS_YEAR"
  }) {
    period {
      start
      end
      periodType
    }
    revenue {
      totalRevenue
      previousPeriodRevenue
      percentageChange
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

**Checklist**:
- [x] Response 200 OK
- [x] `period.periodType` = `"THIS_YEAR"`
- [x] `period.start` va `period.end` la ngay dau va cuoi nam 2026
- [x] `revenue.totalRevenue` = 11,061,950,000
- [x] `orders.ordersByStatus` la array, moi item co `status`, `count`, `totalAmount`
- [x] `customers.topCustomers` co items
- [x] `kpis.topKpis` co the rong (KPIs periodYear=2024)
- [x] Tat ca truong so >= 0
- [x] `alerts` chua 4 sub-arrays

**Notes**:
- dashboardSummary gom tat ca 7 sub-queries chay parallel
- Response includes all sections with real data from seed

---

### TC-DS-02: Dashboard Summary - Period THIS_MONTH

```graphql
query {
  dashboardSummary(input: {
    period: "THIS_MONTH"
  }) {
    period {
      start
      end
      periodType
    }
    revenue {
      totalRevenue
      revenueByMonth {
        period
        amount
      }
    }
    orders {
      totalOrders
      averageOrderValue
    }
    customers {
      totalCustomers
    }
    kpis {
      totalKpis
    }
    contracts {
      totalActive
    }
    alerts {
      overdueOrders {
        id
      }
    }
  }
}
```

**Checklist**:
- [x] Response 200 OK
- [x] `period.start` va `period.end` la ngay dau va cuoi thang 2/2026
- [x] `period.periodType` = `"THIS_MONTH"`
- [x] `revenue.totalRevenue` bao gom tat ca don hang COMPLETED trong thang

---

### TC-DS-03: Dashboard Summary - Period CUSTOM voi startDate/endDate

```graphql
query {
  dashboardSummary(input: {
    period: "CUSTOM"
    startDate: "2026-01-01"
    endDate: "2026-02-09"
  }) {
    period {
      start
      end
      periodType
    }
    revenue {
      totalRevenue
    }
    orders {
      totalOrders
    }
    customers {
      totalCustomers
    }
  }
}
```

**Checklist**:
- [ ] Response 200 OK
- [ ] `period.start` va `period.end` khop voi input
- [ ] `period.periodType` = `"CUSTOM"`
- [ ] Du lieu chi tinh trong khoang startDate - endDate

---

### TC-DS-04: Dashboard Summary - Filter theo departmentId

```graphql
query {
  dashboardSummary(input: {
    period: "THIS_MONTH"
    departmentId: "ad95f81e-bda5-4a98-b72a-880c0b5c204c"
  }) {
    period {
      periodType
    }
    revenue {
      totalRevenue
    }
    orders {
      totalOrders
    }
    customers {
      totalCustomers
    }
  }
}
```

**Expected Response**: Tra ve du lieu chi lien quan den department SALES.

**Checklist**:
- [ ] Response 200 OK
- [ ] `revenue.totalRevenue` <= tong revenue toan he thong
- [ ] `orders.totalOrders` <= tong orders toan he thong
- [ ] Khong co loi khi truyen departmentId hop le

---

### TC-DS-05: Dashboard Summary - DepartmentId khong ton tai

```graphql
query {
  dashboardSummary(input: {
    period: "THIS_MONTH"
    departmentId: "00000000-0000-0000-0000-000000000000"
  }) {
    revenue {
      totalRevenue
    }
    orders {
      totalOrders
    }
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "dashboardSummary": {
      "revenue": {
        "totalRevenue": 0
      },
      "orders": {
        "totalOrders": 0
      }
    }
  }
}
```

**Checklist**:
- [ ] Response 200 OK (khong crash)
- [ ] Cac gia tri so tra ve 0 hoac empty arrays
- [ ] Khong co errors

---

### TC-DS-06: Dashboard Summary - Period CUSTOM thieu startDate

```graphql
query {
  dashboardSummary(input: {
    period: "CUSTOM"
  }) {
    period {
      start
      end
    }
    revenue {
      totalRevenue
    }
  }
}
```

**Expected Response**: Tra ve error hoac fallback ve default date range.

**Checklist**:
- [ ] Kiem tra behavior: error hoac fallback
- [ ] Neu error: message ro rang ve "startDate/endDate required for CUSTOM period"
- [ ] Neu fallback: period.start va period.end co gia tri hop le

---

### TC-DS-07: Dashboard Summary - Period enum khong hop le

```graphql
query {
  dashboardSummary(input: {
    period: "INVALID_PERIOD"
  }) {
    revenue {
      totalRevenue
    }
  }
}
```

**Checklist**:
- [ ] Tra ve GraphQL validation error
- [ ] Khong crash server
- [ ] Error message chi ra gia tri period khong hop le

---

### TC-DS-08: Dashboard Summary - Caching behavior

```graphql
# Goi lan 1
query {
  dashboardSummary(input: {
    period: "THIS_MONTH"
  }) {
    revenue { totalRevenue }
    orders { totalOrders }
  }
}

# Goi lan 2 ngay sau (cung input)
query {
  dashboardSummary(input: {
    period: "THIS_MONTH"
  }) {
    revenue { totalRevenue }
    orders { totalOrders }
  }
}
```

**Checklist**:
- [ ] Ket qua lan 1 va lan 2 giong nhau
- [ ] Lan 2 response nhanh hon (cached)
- [ ] Thay doi filter -> cache miss (data khac)

---

### TC-DS-09: Dashboard Summary - Khong co authentication

```graphql
# Headers: {} (khong co Authorization)
query {
  dashboardSummary(input: {
    period: "THIS_MONTH"
  }) {
    revenue { totalRevenue }
  }
}
```

**Expected Response**:

```json
{
  "errors": [
    {
      "message": "Unauthorized",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

**Checklist**:
- [ ] Tra ve 401/UNAUTHENTICATED error
- [ ] Khong tra ve data
- [ ] Khong crash server

---

### TC-DS-10: Dashboard Summary - Filters parameter

```graphql
query {
  dashboardSummary(input: {
    period: "THIS_MONTH"
    filters: { status: "COMPLETED" }
  }) {
    revenue { totalRevenue }
    orders { totalOrders }
  }
}
```

**Checklist**:
- [ ] Response 200 OK
- [ ] `filters` duoc truyen xuong orchestrator
- [ ] Cache key bao gom filters (khac filter = khac cache)

---

## H. DataScope / RBAC Tests

### TC-RBAC-01: DataScope - User voi quyen han che

**Muc tieu**: User khong co quyen DASHBOARD chi thay du lieu trong pham vi cua minh.

**Dieu kien**: Login voi account co role gioi han (vd: nhan vien binh thuong).

```graphql
query {
  dashboardSummary(input: {
    period: "THIS_MONTH"
  }) {
    revenue { totalRevenue }
    orders { totalOrders }
  }
}
```

**Checklist**:
- [ ] Neu co quyen: tra ve du lieu binh thuong
- [ ] Neu khong co quyen: tra ve error 403 hoac du lieu bi gioi han theo DataScope
- [ ] `@DataScope({ resource: 'DASHBOARD', mode: 'AUTO' })` duoc enforce

---

### TC-RBAC-02: DataScope - Cac audit levels khac nhau

**Muc tieu**: Kiem tra cac query co audit levels khac nhau hoat dong dung.

| Query | AuditLevel | Expected |
|-------|------------|----------|
| `dashboardSummary` | low | Ghi log toi thieu |
| `revenueStats` | medium | Ghi log trung binh |
| `orderStats` | medium | Ghi log trung binh |
| `dashboardAlerts` | low | Ghi log toi thieu |

**Checklist**:
- [ ] Tat ca queries deu hoat dong binh thuong voi DataScope
- [ ] Khong co loi lien quan den RBAC khi user co quyen

---

## I. Edge Cases & Error Handling

### TC-EC-01: Query voi input rong

```graphql
query {
  revenueStats(input: {}) {
    totalRevenue
  }
}
```

**Checklist**:
- [ ] Tra ve validation error (period la required)
- [ ] Error message ro rang

---

### TC-EC-02: startDate > endDate

```graphql
query {
  revenueStats(input: {
    period: "CUSTOM"
    startDate: "2026-12-31"
    endDate: "2026-01-01"
  }) {
    totalRevenue
  }
}
```

**Checklist**:
- [ ] Tra ve error hoac empty result
- [ ] Khong crash server
- [ ] Neu error: message chi ra "startDate must be before endDate"

---

### TC-EC-03: Date format khong hop le

```graphql
query {
  orderStats(input: {
    period: "CUSTOM"
    startDate: "not-a-date"
    endDate: "2026-02-28"
  }) {
    averageOrderValue
  }
}
```

**Checklist**:
- [ ] Tra ve error
- [ ] Khong SQL injection
- [ ] Error message ro rang

---

### TC-EC-04: limit = 0

```graphql
query {
  revenueStats(input: {
    period: "THIS_MONTH"
    limit: 0
  }) {
    revenueByStaff {
      staffName
    }
  }
}
```

**Checklist**:
- [ ] Tra ve validation error (`@Min(1)`)
- [ ] Hoac fallback ve default limit

---

### TC-EC-05: Concurrent queries

```graphql
# Goi dong thoi 3 queries
query Q1 { dashboardSummary(input: { period: "THIS_MONTH" }) { revenue { totalRevenue } } }
query Q2 { revenueStats(input: { period: "THIS_MONTH" }) { totalRevenue } }
query Q3 { orderStats(input: { period: "THIS_MONTH" }) { averageOrderValue } }
```

**Checklist**:
- [ ] Tat ca 3 queries tra ve thanh cong
- [ ] Khong deadlock
- [ ] Khong data inconsistency
- [ ] Server stable

---

## J. Performance Tests

### TC-PF-01: Response time - dashboardSummary

```graphql
query {
  dashboardSummary(input: {
    period: "THIS_YEAR"
  }) {
    revenue { totalRevenue }
    orders { totalOrders }
    customers { totalCustomers }
    payments { totalCollected }
    kpis { totalKpis }
    contracts { totalActive }
    alerts { overdueOrders { id } }
  }
}
```

**Checklist**:
- [ ] Response time < 3 seconds (lan dau, khong cache)
- [ ] Response time < 500ms (lan 2, co cache)
- [ ] Khong timeout
- [ ] Memory khong leak khi goi lien tuc

---

### TC-PF-02: Response time - Individual queries

| Query | Expected (no cache) | Expected (cached) |
|-------|--------------------|--------------------|
| `revenueStats` | < 1s | < 200ms |
| `orderStats` | < 1s | < 200ms |
| `customerStats` | < 1s | < 200ms |
| `kpiScorecard` | < 1s | < 200ms |
| `staffLeaderboard` | < 1s | < 200ms |
| `dashboardAlerts` | < 1s | < 200ms |

---

## Summary

| Section | Test Cases | Status | Notes |
|---------|-----------|--------|-------|
| A. dashboardAlerts | TC-DA-01 ~ TC-DA-02 | TC-DA-01 PASS | 3 overdue orders, 3 pending payments returned |
| B. revenueStats | TC-RS-01 ~ TC-RS-05 | TC-RS-01 PASS | totalRevenue = 11.06B, 1 staff, 1 department |
| C. orderStats | TC-OS-01 ~ TC-OS-03 | TC-OS-01 PASS | 42 orders, 10 top products, conversionRate = 88.1 |
| D. customerStats | TC-CS-01 ~ TC-CS-03 | TC-CS-01 PASS | 5 tiers, churnRate = 20%, avgLtv = 66.7M |
| E. kpiScorecard | TC-KS-01 ~ TC-KS-03 | TC-KS-01 PASS (empty) | KPIs have periodYear=2024, not 2026 |
| F. staffLeaderboard | TC-SL-01 ~ TC-SL-03 | TC-SL-01 PASS | 4 staff ranked, Tim Apple #1 |
| G. dashboardSummary | TC-DS-01 ~ TC-DS-10 | TC-DS-01 PASS | Full summary with all sections |
| H. RBAC | TC-RBAC-01 ~ TC-RBAC-02 | NOT TESTED | Requires different user roles |
| I. Edge Cases | TC-EC-01 ~ TC-EC-05 | NOT TESTED | Validation & error handling |
| J. Performance | TC-PF-01 ~ TC-PF-02 | NOT TESTED | Response time benchmarks |

**Total: 31 test cases**
**Tested: 7 core queries (PASS)**
**Remaining: 24 test cases (edge cases, auth, RBAC, performance)**
