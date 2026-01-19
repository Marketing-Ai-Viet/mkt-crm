# Test Documentation: Order Query Resolver

> **File**: `packages/twenty-server/src/mkt-core/order/resolvers/order-query.resolver.ts`
> **Ngày tạo**: 2026-01-19
> **Mục đích**: Test tất cả queries trong OrderQueryResolver

---

## 1. Thông tin kết nối

### 1.1. Endpoint

```
URL: http://localhost:3000/graphql
Method: POST
Content-Type: application/json
```

### 1.2. Authorization Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4
```

---

## 2. Test Data

### 2.1. Orders từ Database

| orderId | orderCode | status | totalAmount | customerId |
|---------|-----------|--------|-------------|------------|
| `c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab` | MKT-PROC-2024-038 | PROCESSING | 16,500,000 | Trần Thị Bình |
| `d2b3c4d5-e6f7-a8b9-c0d1-234567890abc` | MKT-PROC-2024-039 | PROCESSING | 52,500,000 | Nguyễn Văn An |
| `f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde` | MKT-LOCK-2024-041 | LOCKED | 5,500,000 | Phạm Hoàng Dung |

### 2.2. Customers

| customerId | Tên | Tier |
|------------|-----|------|
| `49868053-4758-457f-9332-6ebd48af7ca6` | Nguyễn Văn An | DIAMOND |
| `9c500415-1e6a-4320-8770-a6a33d03f0a2` | Lê Minh Cường | SILVER |
| `cbdb1f84-693c-4f66-8049-93169a0231c4` | Phạm Hoàng Dung | BRONZE |

---

## 3. Queries

### 3.1. getOrderById

> Lấy order theo ID với hierarchical access filtering

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | String | Yes | ID của đơn hàng |

**Response: OrderOutput**

| Field | Type | Description |
|-------|------|-------------|
| id | String | Order ID |
| name | String | Tên order |
| orderCode | String | Mã order |
| status | ORDER_STATUS | Trạng thái |
| totalAmount | Number | Tổng tiền |
| subtotal | Number | Subtotal |
| tax | Number | Thuế |
| discount | Number | Giảm giá |
| promotionDiscount | Number | Giảm giá khuyến mãi |
| comboDiscount | Number | Giảm giá combo |
| currency | String | Tiền tệ |
| note | String | Ghi chú |
| paidAmount | Number | Đã thanh toán |
| remainingAmount | Number | Còn lại |
| paymentStatus | PAYMENT_STATUS | Trạng thái thanh toán |
| accountingConfirmed | Boolean | Kế toán xác nhận |
| mktCustomerId | String | Customer ID |
| accountOwnerId | String | Account owner ID |
| createdById | String | Created by ID |
| createdAt | String | Ngày tạo |
| updatedAt | String | Ngày cập nhật |

**GraphQL:**

```graphql
query GetOrderById {
  getOrderById(orderId: "c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab") {
    id
    name
    orderCode
    status
    totalAmount
    subtotal
    tax
    discount
    promotionDiscount
    comboDiscount
    currency
    note
    paidAmount
    remainingAmount
    paymentStatus
    accountingConfirmed
    mktCustomerId
    accountOwnerId
    createdById
    createdAt
    updatedAt
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{"query":"query GetOrderById { getOrderById(orderId: \"c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab\") { id name orderCode status totalAmount subtotal tax discount promotionDiscount comboDiscount currency note paidAmount remainingAmount paymentStatus accountingConfirmed mktCustomerId accountOwnerId createdById createdAt updatedAt } }"}'
```

**Expected Response:**

```json
{
  "data": {
    "getOrderById": {
      "id": "c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab",
      "name": "Order #MKT-PROC-2024-038",
      "orderCode": "MKT-PROC-2024-038",
      "status": "PROCESSING",
      "totalAmount": 16500000,
      "subtotal": 16500000,
      "tax": 0,
      "discount": 0,
      "promotionDiscount": 0,
      "comboDiscount": 0,
      "currency": "VND",
      "note": null,
      "paidAmount": 0,
      "remainingAmount": 16500000,
      "paymentStatus": "PENDING",
      "accountingConfirmed": false,
      "mktCustomerId": "customer-id",
      "accountOwnerId": "owner-id",
      "createdById": "user-id",
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z"
    }
  }
}
```

---

### 3.2. getOrderByCode

> Lấy order theo order code với hierarchical access filtering

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderCode | String | Yes | Mã đơn hàng |

**GraphQL:**

```graphql
query GetOrderByCode {
  getOrderByCode(orderCode: "MKT-PROC-2024-038") {
    id
    name
    orderCode
    status
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    mktCustomerId
    createdAt
    updatedAt
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{"query":"query GetOrderByCode { getOrderByCode(orderCode: \"MKT-PROC-2024-038\") { id name orderCode status totalAmount paidAmount remainingAmount paymentStatus mktCustomerId createdAt updatedAt } }"}'
```

---

### 3.3. getOrdersByCustomer

> Lấy danh sách orders theo customer ID với hierarchical access filtering

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customerId | String | Yes | ID khách hàng |

**Response: OrderListOutput**

| Field | Type | Description |
|-------|------|-------------|
| orders | [OrderOutput] | Danh sách orders |
| totalCount | Number | Tổng số orders |

**GraphQL:**

```graphql
query GetOrdersByCustomer {
  getOrdersByCustomer(customerId: "49868053-4758-457f-9332-6ebd48af7ca6") {
    orders {
      id
      orderCode
      status
      totalAmount
      paidAmount
      remainingAmount
      paymentStatus
      createdAt
    }
    totalCount
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{"query":"query GetOrdersByCustomer { getOrdersByCustomer(customerId: \"49868053-4758-457f-9332-6ebd48af7ca6\") { orders { id orderCode status totalAmount paidAmount remainingAmount paymentStatus createdAt } totalCount } }"}'
```

**Expected Response:**

```json
{
  "data": {
    "getOrdersByCustomer": {
      "orders": [
        {
          "id": "d2b3c4d5-e6f7-a8b9-c0d1-234567890abc",
          "orderCode": "MKT-PROC-2024-039",
          "status": "PROCESSING",
          "totalAmount": 52500000,
          "paidAmount": 0,
          "remainingAmount": 52500000,
          "paymentStatus": "PENDING",
          "createdAt": "2026-01-16T10:00:00.000Z"
        }
      ],
      "totalCount": 1
    }
  }
}
```

---

### 3.4. getOrdersByStatus

> Lấy danh sách orders theo status với hierarchical access filtering

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | ORDER_STATUS | Yes | Trạng thái đơn hàng |

**ORDER_STATUS enum:**

| Status | Description |
|--------|-------------|
| DRAFT | Đơn hàng đang soạn |
| PENDING_PAYMENT | Chờ thanh toán (legacy) |
| CONFIRMED | Đã xác nhận |
| PROCESSING | Đang xử lý (license đã tạo) |
| COMPLETED | Hoàn thành |
| LOCKED | Bị khóa do quá hạn |
| TRIAL | Đơn dùng thử |
| TRIAL_EXPIRED | Hết hạn dùng thử |
| CANCELED | Đã hủy |
| OVERDUE | Quá hạn (legacy) |
| BLOCKED | Bị chặn |
| REFUND | Hoàn tiền toàn bộ |
| REFUND_PARTIAL | Hoàn tiền một phần |

**GraphQL:**

```graphql
query GetOrdersByStatus {
  getOrdersByStatus(status: PROCESSING) {
    orders {
      id
      orderCode
      status
      totalAmount
      paidAmount
      remainingAmount
      paymentStatus
      mktCustomerId
      createdAt
    }
    totalCount
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{"query":"query GetOrdersByStatus { getOrdersByStatus(status: PROCESSING) { orders { id orderCode status totalAmount paidAmount remainingAmount paymentStatus mktCustomerId createdAt } totalCount } }"}'
```

---

### 3.5. getOrderPaymentSummary

> Lấy thông tin tổng hợp thanh toán của order

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | String | Yes | ID đơn hàng |

**Response: OrderPaymentSummaryOutput**

| Field | Type | Description |
|-------|------|-------------|
| totalAmount | Number | Tổng tiền đơn hàng |
| paidAmount | Number | Đã thanh toán |
| remainingAmount | Number | Còn lại |
| paymentStatus | PAYMENT_STATUS | Trạng thái thanh toán |
| paidPercent | Number | Phần trăm đã thanh toán (0-100) |

**PAYMENT_STATUS enum:**

| Status | Description |
|--------|-------------|
| PENDING | Chưa thanh toán |
| PARTIAL | Thanh toán một phần |
| PAID | Đã thanh toán đủ |
| OVERPAID | Thanh toán thừa |

**GraphQL:**

```graphql
query GetOrderPaymentSummary {
  getOrderPaymentSummary(orderId: "c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab") {
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    paidPercent
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{"query":"query GetOrderPaymentSummary { getOrderPaymentSummary(orderId: \"c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab\") { totalAmount paidAmount remainingAmount paymentStatus paidPercent } }"}'
```

**Expected Response:**

```json
{
  "data": {
    "getOrderPaymentSummary": {
      "totalAmount": 16500000,
      "paidAmount": 0,
      "remainingAmount": 16500000,
      "paymentStatus": "PENDING",
      "paidPercent": 0
    }
  }
}
```

---

### 3.6. getCustomerOrderStats

> Lấy thống kê đơn hàng của khách hàng

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customerId | String | Yes | ID khách hàng |

**Response: CustomerOrderStatsOutput**

| Field | Type | Description |
|-------|------|-------------|
| orderCount | Number | Tổng số đơn hàng |
| totalValue | Number | Tổng giá trị đơn hàng |
| firstOrderDate | String | Ngày đơn hàng đầu tiên |
| lastOrderDate | String | Ngày đơn hàng gần nhất |
| averageOrderInterval | Number | Khoảng cách trung bình giữa các đơn (ngày) |

**GraphQL:**

```graphql
query GetCustomerOrderStats {
  getCustomerOrderStats(customerId: "49868053-4758-457f-9332-6ebd48af7ca6") {
    orderCount
    totalValue
    firstOrderDate
    lastOrderDate
    averageOrderInterval
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{"query":"query GetCustomerOrderStats { getCustomerOrderStats(customerId: \"49868053-4758-457f-9332-6ebd48af7ca6\") { orderCount totalValue firstOrderDate lastOrderDate averageOrderInterval } }"}'
```

**Expected Response:**

```json
{
  "data": {
    "getCustomerOrderStats": {
      "orderCount": 5,
      "totalValue": 75000000,
      "firstOrderDate": "2024-06-15",
      "lastOrderDate": "2026-01-16",
      "averageOrderInterval": 45
    }
  }
}
```

---

## 4. Hierarchical Access Filtering

> **Lưu ý**: Queries sử dụng `@DataScope` decorator để áp dụng hierarchical access filtering

### Access Rules

| Level | Role | Access |
|-------|------|--------|
| 8-11 | Staff | Chỉ thấy orders do mình tạo (createdById = self) |
| 7 | Manager | Thấy orders của direct subordinates |
| 4-6 | Upper Management | Thấy orders trong reporting chain |
| 1-3 | Executive | Thấy tất cả orders |

### DataScope Configuration

| Query | Mode | Audit Level |
|-------|------|-------------|
| getOrderById | AUTO | medium |
| getOrderByCode | AUTO | medium |
| getOrdersByCustomer | AUTO | low |
| getOrdersByStatus | AUTO | low |
| getOrderPaymentSummary | AUTO | medium |
| getCustomerOrderStats | SKIP | low |

---

## 5. Error Cases

| Scenario | Expected Response |
|----------|-------------------|
| Order không tồn tại | `null` |
| Customer không tồn tại | `{ orders: [], totalCount: 0 }` |
| Invalid UUID format | GraphQL validation error |
| Unauthorized | 401 Unauthorized |

---

*Tài liệu được tạo tự động bởi Claude Code vào 2026-01-19*
