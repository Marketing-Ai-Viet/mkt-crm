# Order Query API - Frontend Developer Guide

## Overview

API GraphQL để truy vấn đơn hàng trong hệ thống CRM với hỗ trợ phân quyền theo cấp bậc tổ chức.

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Bearer Token (required)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## Access Control (Hierarchical Filtering)

Tất cả queries tự động áp dụng filter theo cấp bậc của user:

| Level | Role | Access Scope |
|-------|------|--------------|
| 8-11 | Staff | Chỉ xem đơn hàng do mình tạo |
| 7 | Manager | Xem đơn hàng của cấp dưới trực tiếp |
| 4-6 | Upper Management | Xem đơn hàng trong reporting chain |
| 1-3 | Executive | Xem tất cả đơn hàng |

---

## API Summary

| Query | Description |
|-------|-------------|
| `getOrders` | Lấy danh sách đơn hàng có phân trang, sắp xếp và lọc |
| `getOrderById` | Lấy chi tiết đơn hàng theo ID |
| `getOrderByCode` | Lấy chi tiết đơn hàng theo mã |
| `getOrdersByCustomer` | Lấy đơn hàng theo khách hàng |
| `getOrdersByStatus` | Lấy đơn hàng theo trạng thái |
| `getOrderPaymentSummary` | Lấy tổng hợp thanh toán |
| `getCustomerOrderStats` | Lấy thống kê đơn hàng của khách |

---

## Queries

### 1. getOrders

Lấy danh sách đơn hàng có phân trang, sắp xếp và lọc.

**Query:**
```graphql
query GetOrders($input: GetOrdersInput) {
  getOrders(input: $input) {
    orders {
      id
      orderCode
      name
      status
      totalAmount
      paidAmount
      remainingAmount
      paymentStatus
      accountingConfirmed
      createdAt
      updatedAt
      paymentDeadline
      sInvoiceStatus
      customer {
        id
        name
        email
        phone
      }
      salesStaff {
        id
        name
        email
      }
      orderItems {
        id
        name
        productName
        packageName
        quantity
        unitPrice
        totalPrice
        discount
      }
      paymentMethod {
        id
        name
        type
        description
      }
      lastPaymentDate
    }
    totalCount
    pageInfo {
      currentPage
      totalPages
      pageSize
      hasNextPage
      hasPreviousPage
    }
  }
}
```

**Variables - Basic pagination:**
```json
{
  "input": {
    "pagination": {
      "page": 1,
      "limit": 20
    }
  }
}
```

**Variables - With filter and sort:**
```json
{
  "input": {
    "pagination": {
      "page": 1,
      "limit": 20
    },
    "filter": {
      "status": "PROCESSING",
      "paymentStatus": "PENDING",
      "search": "DEV2026"
    },
    "sort": {
      "field": "CREATED_AT",
      "direction": "DESC"
    }
  }
}
```

**Variables - Filter by customer:**
```json
{
  "input": {
    "filter": {
      "customerId": "customer-uuid-123"
    }
  }
}
```

**Variables - Filter by sales staff:**
```json
{
  "input": {
    "filter": {
      "salesStaffId": "member-uuid-456"
    }
  }
}
```

**Response Success:**
```json
{
  "data": {
    "getOrders": {
      "orders": [
        {
          "id": "785502a8-282a-4577-96a7-c4e9b60c64ea",
          "orderCode": "DEV20260204001",
          "name": "Order DEV20260204001",
          "status": "PROCESSING",
          "totalAmount": 149000,
          "paidAmount": 0,
          "remainingAmount": 149000,
          "paymentStatus": "PENDING",
          "accountingConfirmed": false,
          "createdAt": "2026-02-04T03:00:00.000Z",
          "updatedAt": "2026-02-04T04:00:00.000Z",
          "paymentDeadline": "2026-02-11T03:00:00.000Z",
          "sInvoiceStatus": null,
          "customer": {
            "id": "cust-123",
            "name": "Nguyen Van A",
            "email": "nguyenvana@example.com",
            "phone": "0901234567"
          },
          "salesStaff": {
            "id": "staff-456",
            "name": "Tim Apple",
            "email": "tim@example.com"
          },
          "orderItems": [
            {
              "id": "item-1",
              "name": "MKT Tool Pro - 1 Month",
              "productName": "MKT Tool Pro",
              "packageName": "1 Month License",
              "quantity": 1,
              "unitPrice": 149000,
              "totalPrice": 149000,
              "discount": 0
            }
          ],
          "paymentMethod": null,
          "lastPaymentDate": null
        }
      ],
      "totalCount": 1,
      "pageInfo": {
        "currentPage": 1,
        "totalPages": 1,
        "pageSize": 20,
        "hasNextPage": false,
        "hasPreviousPage": false
      }
    }
  }
}
```

---

### 2. getOrderById

Lấy chi tiết đơn hàng theo ID.

**Query:**
```graphql
query GetOrderById($orderId: String!) {
  getOrderById(orderId: $orderId) {
    id
    orderCode
    name
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
    paymentDeadline
    sInvoiceStatus
    customer {
      id
      name
      email
      phone
    }
    salesStaff {
      id
      name
      email
    }
    orderItems {
      id
      name
      productName
      packageName
      quantity
      unitPrice
      totalPrice
      discount
    }
    paymentMethod {
      id
      name
      type
      description
    }
    lastPaymentDate
  }
}
```

**Variables:**
```json
{
  "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea"
}
```

**Response Success:**
```json
{
  "data": {
    "getOrderById": {
      "id": "785502a8-282a-4577-96a7-c4e9b60c64ea",
      "orderCode": "DEV20260204001",
      "name": "Order DEV20260204001",
      "status": "PROCESSING",
      "totalAmount": 149000,
      "subtotal": 149000,
      "tax": 0,
      "discount": 0,
      "promotionDiscount": 0,
      "comboDiscount": 0,
      "currency": "VND",
      "note": "Test order",
      "paidAmount": 0,
      "remainingAmount": 149000,
      "paymentStatus": "PENDING",
      "accountingConfirmed": false,
      "mktCustomerId": "cust-123",
      "accountOwnerId": null,
      "createdById": "staff-456",
      "createdAt": "2026-02-04T03:00:00.000Z",
      "updatedAt": "2026-02-04T04:00:00.000Z",
      "paymentDeadline": "2026-02-11T03:00:00.000Z",
      "sInvoiceStatus": null,
      "customer": {
        "id": "cust-123",
        "name": "Nguyen Van A",
        "email": "nguyenvana@example.com",
        "phone": "0901234567"
      },
      "salesStaff": {
        "id": "staff-456",
        "name": "Tim Apple",
        "email": "tim@example.com"
      },
      "orderItems": [...],
      "paymentMethod": null,
      "lastPaymentDate": null
    }
  }
}
```

**Response - Not found or no access:**
```json
{
  "data": {
    "getOrderById": null
  }
}
```

---

### 3. getOrderByCode

Lấy chi tiết đơn hàng theo mã đơn.

**Query:**
```graphql
query GetOrderByCode($orderCode: String!) {
  getOrderByCode(orderCode: $orderCode) {
    id
    orderCode
    name
    status
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    customer {
      id
      name
    }
    orderItems {
      id
      productName
      quantity
      totalPrice
    }
  }
}
```

**Variables:**
```json
{
  "orderCode": "DEV20260204001"
}
```

**Response Success:**
```json
{
  "data": {
    "getOrderByCode": {
      "id": "785502a8-...",
      "orderCode": "DEV20260204001",
      "name": "Order DEV20260204001",
      "status": "PROCESSING",
      "totalAmount": 149000,
      "paidAmount": 0,
      "remainingAmount": 149000,
      "paymentStatus": "PENDING",
      "customer": {
        "id": "cust-123",
        "name": "Nguyen Van A"
      },
      "orderItems": [...]
    }
  }
}
```

---

### 4. getOrdersByCustomer

Lấy tất cả đơn hàng của một khách hàng.

**Query:**
```graphql
query GetOrdersByCustomer($customerId: String!) {
  getOrdersByCustomer(customerId: $customerId) {
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

**Variables:**
```json
{
  "customerId": "customer-uuid-123"
}
```

**Response Success:**
```json
{
  "data": {
    "getOrdersByCustomer": {
      "orders": [
        {
          "id": "order-1",
          "orderCode": "DEV20260204001",
          "status": "PROCESSING",
          "totalAmount": 149000,
          "paidAmount": 0,
          "remainingAmount": 149000,
          "paymentStatus": "PENDING",
          "createdAt": "2026-02-04T03:00:00.000Z"
        },
        {
          "id": "order-2",
          "orderCode": "DEV20260201001",
          "status": "COMPLETED",
          "totalAmount": 299000,
          "paidAmount": 299000,
          "remainingAmount": 0,
          "paymentStatus": "PAID",
          "createdAt": "2026-02-01T10:00:00.000Z"
        }
      ],
      "totalCount": 2
    }
  }
}
```

---

### 5. getOrdersByStatus

Lấy đơn hàng theo trạng thái.

**Query:**
```graphql
query GetOrdersByStatus($status: OrderStatus!) {
  getOrdersByStatus(status: $status) {
    orders {
      id
      orderCode
      totalAmount
      paidAmount
      remainingAmount
      paymentStatus
      customer {
        id
        name
      }
      createdAt
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "status": "PROCESSING"
}
```

**Response Success:**
```json
{
  "data": {
    "getOrdersByStatus": {
      "orders": [
        {
          "id": "order-1",
          "orderCode": "DEV20260204001",
          "totalAmount": 149000,
          "paidAmount": 0,
          "remainingAmount": 149000,
          "paymentStatus": "PENDING",
          "customer": {
            "id": "cust-123",
            "name": "Nguyen Van A"
          },
          "createdAt": "2026-02-04T03:00:00.000Z"
        }
      ],
      "totalCount": 1
    }
  }
}
```

---

### 6. getOrderPaymentSummary

Lấy tổng hợp thanh toán của đơn hàng.

**Query:**
```graphql
query GetOrderPaymentSummary($orderId: String!) {
  getOrderPaymentSummary(orderId: $orderId) {
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    paidPercent
  }
}
```

**Variables:**
```json
{
  "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea"
}
```

**Response Success - Chưa thanh toán:**
```json
{
  "data": {
    "getOrderPaymentSummary": {
      "totalAmount": 149000,
      "paidAmount": 0,
      "remainingAmount": 149000,
      "paymentStatus": "PENDING",
      "paidPercent": 0
    }
  }
}
```

**Response Success - Thanh toán một phần:**
```json
{
  "data": {
    "getOrderPaymentSummary": {
      "totalAmount": 500000,
      "paidAmount": 200000,
      "remainingAmount": 300000,
      "paymentStatus": "PARTIAL",
      "paidPercent": 40
    }
  }
}
```

**Response Success - Đã thanh toán đủ:**
```json
{
  "data": {
    "getOrderPaymentSummary": {
      "totalAmount": 149000,
      "paidAmount": 149000,
      "remainingAmount": 0,
      "paymentStatus": "PAID",
      "paidPercent": 100
    }
  }
}
```

---

### 7. getCustomerOrderStats

Lấy thống kê đơn hàng của khách hàng.

**Note:** Query này KHÔNG áp dụng hierarchical filter vì trả về dữ liệu tổng hợp.

**Query:**
```graphql
query GetCustomerOrderStats($customerId: String!) {
  getCustomerOrderStats(customerId: $customerId) {
    orderCount
    totalValue
    firstOrderDate
    lastOrderDate
    averageOrderInterval
  }
}
```

**Variables:**
```json
{
  "customerId": "customer-uuid-123"
}
```

**Response Success:**
```json
{
  "data": {
    "getCustomerOrderStats": {
      "orderCount": 5,
      "totalValue": 1500000,
      "firstOrderDate": "2025-06-15T10:00:00.000Z",
      "lastOrderDate": "2026-02-04T03:00:00.000Z",
      "averageOrderInterval": 45.5
    }
  }
}
```

**Response - Khách chưa có đơn:**
```json
{
  "data": {
    "getCustomerOrderStats": {
      "orderCount": 0,
      "totalValue": 0,
      "firstOrderDate": null,
      "lastOrderDate": null,
      "averageOrderInterval": 0
    }
  }
}
```

---

## Input Types

### GetOrdersInput

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pagination` | PaginationInput | No | Phân trang |
| `sort` | OrderSortInput | No | Sắp xếp |
| `filter` | OrderFilterInput | No | Lọc |

### PaginationInput

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Int | 1 | Số trang (bắt đầu từ 1) |
| `limit` | Int | 20 | Số items mỗi trang (max 100) |

### OrderSortInput

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `field` | OrderSortField | `CREATED_AT` | Trường để sắp xếp |
| `direction` | SortDirection | `DESC` | Hướng sắp xếp |

### OrderSortField Enum

| Value | Description |
|-------|-------------|
| `CREATED_AT` | Ngày tạo |
| `UPDATED_AT` | Ngày cập nhật |
| `ORDER_CODE` | Mã đơn hàng |
| `TOTAL_AMOUNT` | Tổng tiền |
| `STATUS` | Trạng thái |
| `PAYMENT_STATUS` | Trạng thái thanh toán |
| `PAYMENT_DEADLINE` | Hạn thanh toán |

### SortDirection Enum

| Value | Description |
|-------|-------------|
| `ASC` | Tăng dần |
| `DESC` | Giảm dần |

### OrderFilterInput

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | String | No | Tìm theo orderCode, tên/email/phone khách |
| `status` | OrderStatus | No | Lọc theo trạng thái đơn |
| `paymentStatus` | PaymentStatus | No | Lọc theo trạng thái thanh toán |
| `customerId` | String | No | Lọc theo ID khách hàng |
| `salesStaffId` | String | No | Lọc theo ID nhân viên sale |

---

## Output Types

### OrderOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Order ID (UUID) |
| `orderCode` | String | Yes | Mã đơn hàng (e.g., DEV20260204001) |
| `name` | String | Yes | Tên đơn hàng |
| `status` | OrderStatus | Yes | Trạng thái đơn |
| `totalAmount` | Float | Yes | Tổng tiền |
| `subtotal` | Float | Yes | Tổng phụ (chưa VAT/chiết khấu) |
| `tax` | Float | Yes | Thuế VAT |
| `discount` | Float | Yes | Chiết khấu |
| `promotionDiscount` | Float | Yes | Giảm giá khuyến mãi |
| `comboDiscount` | Float | Yes | Giảm giá combo |
| `currency` | String | Yes | Đơn vị tiền tệ (default: VND) |
| `note` | String | Yes | Ghi chú |
| `paidAmount` | Float | Yes | Số tiền đã thanh toán |
| `remainingAmount` | Float | Yes | Số tiền còn lại |
| `paymentStatus` | PaymentStatus | Yes | Trạng thái thanh toán |
| `accountingConfirmed` | Boolean | Yes | Kế toán đã xác nhận? |
| `mktCustomerId` | String | Yes | ID khách hàng |
| `accountOwnerId` | String | Yes | ID người phụ trách |
| `createdById` | String | Yes | ID người tạo |
| `createdAt` | String | Yes | Ngày tạo (ISO format) |
| `updatedAt` | String | Yes | Ngày cập nhật (ISO format) |
| `paymentDeadline` | String | Yes | Hạn thanh toán (ISO format) |
| `sInvoiceStatus` | String | Yes | Trạng thái S-Invoice |
| `customer` | OrderCustomerInfo | Yes | Thông tin khách hàng |
| `salesStaff` | OrderSalesStaffInfo | Yes | Thông tin nhân viên sale |
| `orderItems` | [OrderItemOutput] | Yes | Danh sách items |
| `paymentMethod` | OrderPaymentMethodInfo | Yes | Phương thức thanh toán |
| `lastPaymentDate` | String | Yes | Ngày thanh toán gần nhất |

### OrderCustomerInfo

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | Yes | Customer ID |
| `name` | String | Yes | Tên khách hàng |
| `email` | String | Yes | Email |
| `phone` | String | Yes | Số điện thoại |

### OrderSalesStaffInfo

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | Yes | Staff ID |
| `name` | String | Yes | Tên nhân viên |
| `email` | String | Yes | Email |

### OrderItemOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Item ID |
| `name` | String | Yes | Tên item |
| `productName` | String | Yes | Tên sản phẩm (từ snapshot) |
| `packageName` | String | Yes | Tên gói (từ snapshot) |
| `quantity` | Int | Yes | Số lượng |
| `unitPrice` | Float | Yes | Đơn giá |
| `totalPrice` | Float | Yes | Thành tiền |
| `discount` | Float | Yes | Chiết khấu item |

### OrderPaymentMethodInfo

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | Yes | Payment method ID |
| `name` | String | Yes | Tên phương thức |
| `type` | String | Yes | Loại (BANK_TRANSFER, QR_CODE, CASH) |
| `description` | String | Yes | Mô tả |

### PaginatedOrdersOutput

| Field | Type | Description |
|-------|------|-------------|
| `orders` | [OrderOutput] | Danh sách đơn hàng |
| `totalCount` | Int | Tổng số đơn hàng |
| `pageInfo` | OffsetPageInfo | Thông tin phân trang |

### OffsetPageInfo

| Field | Type | Description |
|-------|------|-------------|
| `currentPage` | Int | Trang hiện tại |
| `totalPages` | Int | Tổng số trang |
| `pageSize` | Int | Số items mỗi trang |
| `hasNextPage` | Boolean | Có trang sau? |
| `hasPreviousPage` | Boolean | Có trang trước? |

### OrderListOutput

| Field | Type | Description |
|-------|------|-------------|
| `orders` | [OrderOutput] | Danh sách đơn hàng |
| `totalCount` | Int | Tổng số đơn hàng |

### OrderPaymentSummaryOutput

| Field | Type | Description |
|-------|------|-------------|
| `totalAmount` | Float | Tổng tiền đơn hàng |
| `paidAmount` | Float | Số tiền đã thanh toán |
| `remainingAmount` | Float | Số tiền còn lại |
| `paymentStatus` | PaymentStatus | Trạng thái thanh toán |
| `paidPercent` | Float | Phần trăm đã thanh toán (0-100) |

### CustomerOrderStatsOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `orderCount` | Int | No | Tổng số đơn hàng |
| `totalValue` | Float | No | Tổng giá trị đơn hàng |
| `firstOrderDate` | String | Yes | Ngày đặt đơn đầu tiên |
| `lastOrderDate` | String | Yes | Ngày đặt đơn gần nhất |
| `averageOrderInterval` | Float | No | Khoảng cách trung bình giữa các đơn (ngày) |

---

## Enums

### OrderStatus

| Value | Description |
|-------|-------------|
| `DRAFT` | Đơn nháp, chưa publish |
| `PENDING_PAYMENT` | Chờ thanh toán |
| `CONFIRMED` | Đã xác nhận |
| `PROCESSING` | Đang xử lý |
| `COMPLETED` | Hoàn thành |
| `CANCELLED` | Đã hủy |
| `LOCKED` | Đã khóa (quá hạn) |
| `BLOCKED` | Bị chặn |
| `OVERDUE` | Quá hạn |
| `TRIAL` | Dùng thử |
| `TRIAL_EXPIRED` | Trial hết hạn |
| `REFUND` | Hoàn tiền toàn bộ |
| `REFUND_PARTIAL` | Hoàn tiền một phần |

### PaymentStatus

| Value | Description |
|-------|-------------|
| `PENDING` | Chưa thanh toán |
| `PARTIAL` | Thanh toán một phần |
| `PAID` | Đã thanh toán đủ |
| `OVERPAID` | Thanh toán thừa |

---

## Error Handling

### Common Errors

| Error Code | Message | Description |
|------------|---------|-------------|
| `UNAUTHENTICATED` | You must be authenticated | Chưa đăng nhập |
| `FORBIDDEN` | Access denied | Không có quyền truy cập |

### Error Handling Code Example

```typescript
const handleGetOrders = async (input: GetOrdersInput) => {
  try {
    const result = await getOrders({ variables: { input } });
    return result.data?.getOrders;
  } catch (error) {
    const graphQLError = error.graphQLErrors?.[0];

    switch (graphQLError?.extensions?.code) {
      case 'UNAUTHENTICATED':
        redirectToLogin();
        break;
      case 'FORBIDDEN':
        showError('Bạn không có quyền xem đơn hàng này');
        break;
      default:
        showError('Có lỗi xảy ra khi tải dữ liệu');
    }
  }
};
```

---

## Best Practices

### 1. Basic Pagination

```graphql
query {
  getOrders(input: {
    pagination: { page: 1, limit: 50 }
  }) {
    orders { id orderCode status }
    totalCount
    pageInfo {
      hasNextPage
      totalPages
    }
  }
}
```

### 2. Infinite Scroll

```typescript
const loadMore = async () => {
  if (!pageInfo.hasNextPage || loading) return;

  await fetchMore({
    variables: {
      input: {
        pagination: {
          page: pageInfo.currentPage + 1,
          limit: 20
        }
      }
    },
    updateQuery: (prev, { fetchMoreResult }) => ({
      getOrders: {
        ...fetchMoreResult.getOrders,
        orders: [
          ...prev.getOrders.orders,
          ...fetchMoreResult.getOrders.orders
        ]
      }
    })
  });
};
```

### 3. Search with Debounce

```typescript
const [searchTerm, setSearchTerm] = useState('');

useEffect(() => {
  const handler = setTimeout(() => {
    refetch({
      input: {
        filter: { search: searchTerm },
        pagination: { page: 1, limit: 20 }
      }
    });
  }, 300);

  return () => clearTimeout(handler);
}, [searchTerm]);
```

### 4. Combined Filters

```graphql
# Filter: processing + pending payment + specific customer
query {
  getOrders(input: {
    filter: {
      status: PROCESSING
      paymentStatus: PENDING
      customerId: "customer-uuid"
    }
    sort: {
      field: PAYMENT_DEADLINE
      direction: ASC
    }
  }) {
    orders {
      id
      orderCode
      paymentDeadline
    }
    totalCount
  }
}
```

### 5. Payment Summary Dashboard

```typescript
const OrderPaymentProgress = ({ orderId }: { orderId: string }) => {
  const { data } = useQuery(GET_ORDER_PAYMENT_SUMMARY, {
    variables: { orderId }
  });

  const summary = data?.getOrderPaymentSummary;
  if (!summary) return null;

  return (
    <div>
      <ProgressBar value={summary.paidPercent} />
      <span>{summary.paidAmount.toLocaleString()} / {summary.totalAmount.toLocaleString()} VND</span>
      <Badge status={summary.paymentStatus} />
    </div>
  );
};
```

### 6. Customer Statistics Card

```typescript
const CustomerStats = ({ customerId }: { customerId: string }) => {
  const { data } = useQuery(GET_CUSTOMER_ORDER_STATS, {
    variables: { customerId }
  });

  const stats = data?.getCustomerOrderStats;
  if (!stats) return null;

  return (
    <Card>
      <Stat label="Tổng đơn" value={stats.orderCount} />
      <Stat label="Tổng giá trị" value={formatCurrency(stats.totalValue)} />
      <Stat label="Đơn gần nhất" value={formatDate(stats.lastOrderDate)} />
      <Stat label="Chu kỳ mua" value={`${stats.averageOrderInterval} ngày`} />
    </Card>
  );
};
```

---

## Related APIs

| API | Resolver | Purpose |
|-----|----------|---------|
| `createOrderWithItems` | order.resolver.ts | Tạo đơn hàng mới |
| `updateOrderStatus` | order.resolver.ts | Cập nhật trạng thái đơn |
| `confirmOrderWithLicense` | order.resolver.ts | Xác nhận đơn và tạo license |
| `confirmPaymentBySale` | payment-confirmation.resolver.ts | Sale xác nhận thanh toán |
| `confirmPaymentByAccounting` | payment-confirmation.resolver.ts | Kế toán xác nhận thanh toán |
| `getPaymentConfirmationStatus` | payment-confirmation.resolver.ts | Lấy trạng thái xác nhận |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-03 | Initial release |
| 1.1.0 | 2026-02-04 | Update với hierarchical access control và paginated query |
