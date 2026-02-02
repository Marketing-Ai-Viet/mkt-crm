# MKT Order API - Frontend Developer Guide

## Overview

API GraphQL để quản lý đơn hàng (Order) trong hệ thống CRM.

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Bearer Token (required)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## Queries

### 1. getOrderById

Lấy thông tin chi tiết một đơn hàng theo ID.

**Query:**
```graphql
query GetOrderById($orderId: String!) {
  getOrderById(orderId: $orderId) {
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
    paymentDeadline
    mktCustomerId
    accountOwnerId
    createdById
    createdAt
    updatedAt
  }
}
```

**Variables:**
```json
{
  "orderId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
}
```

**Response Success:**
```json
{
  "data": {
    "getOrderById": {
      "id": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
      "name": "Đơn hàng #ORD-2026-001",
      "orderCode": "ORD-2026-001",
      "status": "PROCESSING",
      "totalAmount": 5000000,
      "subtotal": 5000000,
      "tax": 0,
      "discount": 0,
      "currency": "VND",
      "paidAmount": 2500000,
      "remainingAmount": 2500000,
      "paymentStatus": "PARTIAL",
      "mktCustomerId": "...",
      "createdAt": "2026-01-15T10:30:00.000Z"
    }
  }
}
```

**Response null (not found or no access):**
```json
{
  "data": {
    "getOrderById": null
  }
}
```

---

### 2. getOrderByCode

Lấy thông tin chi tiết một đơn hàng theo mã đơn hàng.

**Query:**
```graphql
query GetOrderByCode($orderCode: String!) {
  getOrderByCode(orderCode: $orderCode) {
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
  }
}
```

**Variables:**
```json
{
  "orderCode": "ORD-2026-001"
}
```

---

### 3. getOrdersByCustomer

Lấy danh sách đơn hàng của một khách hàng.

**Query:**
```graphql
query GetOrdersByCustomer($customerId: String!) {
  getOrdersByCustomer(customerId: $customerId) {
    orders {
      id
      name
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
  "customerId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
}
```

**Response:**
```json
{
  "data": {
    "getOrdersByCustomer": {
      "orders": [
        {
          "id": "...",
          "orderCode": "ORD-2026-001",
          "status": "COMPLETED",
          "totalAmount": 5000000
        }
      ],
      "totalCount": 1
    }
  }
}
```

---

### 4. getOrdersByStatus

Lấy danh sách đơn hàng theo trạng thái.

**Query:**
```graphql
query GetOrdersByStatus($status: OrderStatus!) {
  getOrdersByStatus(status: $status) {
    orders {
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

---

### 5. getOrderPaymentSummary

Lấy tổng hợp thanh toán của một đơn hàng.

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
  "orderId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
}
```

**Response:**
```json
{
  "data": {
    "getOrderPaymentSummary": {
      "totalAmount": 5000000,
      "paidAmount": 2500000,
      "remainingAmount": 2500000,
      "paymentStatus": "PARTIAL",
      "paidPercent": 50.0
    }
  }
}
```

---

### 6. getCustomerOrderStats

Lấy thống kê đơn hàng của một khách hàng.

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
  "customerId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
}
```

**Response:**
```json
{
  "data": {
    "getCustomerOrderStats": {
      "orderCount": 5,
      "totalValue": 25000000,
      "firstOrderDate": "2025-06-01",
      "lastOrderDate": "2026-01-15",
      "averageOrderInterval": 45
    }
  }
}
```

---

## Mutations

### 1. createOrderWithItems

Tạo đơn hàng mới với các items và licenses.

**Mutation:**
```graphql
mutation CreateOrderWithItems($input: CreateOrderWithItemsInputDto!) {
  createOrderWithItems(input: $input) {
    success
    orderId
    orderCode
    paymentQrCode
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "customerId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
    "currency": "VND",
    "note": "Đơn hàng mới",
    "action": "NEW_ORDER",
    "externalProducts": [
      {
        "productId": "0199e6e1-7935-714e-b8fa-7a2f2e78c643",
        "packageId": "0199e6e1-7935-714e-b8fa-7a2f2e78c644",
        "maxDevices": 1,
        "splitLicenses": false
      }
    ],
    "paymentMethods": [
      {
        "paymentMethodId": "0199e6e1-7935-714e-b8fa-7a2f2e78c645",
        "name": "BIDV Transfer",
        "amount": 5000000
      }
    ],
    "orderLanguage": "vi",
    "discountPercent": 0,
    "isDraft": false
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `customerId` | String (UUID) | **Yes** | - | ID khách hàng |
| `currency` | String | No | `VND` | Đơn vị tiền tệ |
| `note` | String | No | - | Ghi chú |
| `action` | CreateOrderAction | **Yes** | - | Loại action (xem enum) |
| `externalProducts` | Array | No* | - | Danh sách sản phẩm từ MKT Server |
| `combos` | Array | No* | - | Danh sách combo |
| `paymentMethods` | Array | No | - | Phương thức thanh toán |
| `orderLanguage` | String | No | `vi` | Ngôn ngữ (`vi`/`en`/`ko`) |
| `discountPercent` | Number | No | `0` | Phần trăm giảm giá (0-100) |
| `isDraft` | Boolean | No | `false` | Tạo đơn nháp |
| `licenseId` | String (UUID) | No | - | License ID (cho LICENSE_RENEWING) |
| `trialDurationDays` | Int | No | `1` | Số ngày trial (cho TRIAL_TO_PAID) |
| `mktServerEmail` | String | No | - | Email cho MKT Server |
| `requireContract` | Boolean | No | `false` | Yêu cầu hợp đồng |

*Ít nhất phải có `externalProducts` hoặc `combos`.

**ExternalMktProductInputDto:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `productId` | String | **Yes** | Product ID từ MKT Server |
| `packageId` | String | No | Package ID từ MKT Server |
| `maxDevices` | Int | No | Số thiết bị tối đa (default: 1) |
| `splitLicenses` | Boolean | No | Tách thành nhiều license (default: false) |

**Response Success:**
```json
{
  "data": {
    "createOrderWithItems": {
      "success": true,
      "orderId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
      "orderCode": "ORD-2026-001",
      "paymentQrCode": "https://qr.sepay.vn/...",
      "totalAmount": 5000000,
      "paidAmount": 0,
      "remainingAmount": 5000000,
      "paymentStatus": "PENDING",
      "error": null
    }
  }
}
```

---

### 2. updateOrderStatus

Cập nhật trạng thái đơn hàng với state machine validation.

**Mutation:**
```graphql
mutation UpdateOrderStatus($input: UpdateOrderStatusInputDto!) {
  updateOrderStatus(input: $input) {
    success
    orderId
    previousStatus
    newStatus
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    message
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "orderId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
    "action": "CANCEL",
    "note": "Khách hủy đơn",
    "expectedVersion": 2
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | String (UUID) | **Yes** | ID đơn hàng |
| `action` | OrderAction | **Yes** | Action cần thực hiện |
| `note` | String | No | Ghi chú |
| `expectedVersion` | Int | No | Version cho optimistic locking |

---

### 3. refundOrder

Hoàn tiền đơn hàng (toàn bộ hoặc một phần).

**Mutation:**
```graphql
mutation RefundOrder($input: RefundOrderInputDto!) {
  refundOrder(input: $input) {
    success
    orderId
    refundedAmount
    newStatus
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "orderId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
    "licenseIds": ["license-id-1", "license-id-2"],
    "refundAmount": 2500000,
    "reason": "Khách không hài lòng",
    "isPartial": true,
    "expectedVersion": 3
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `orderId` | String (UUID) | **Yes** | - | ID đơn hàng |
| `licenseIds` | Array[UUID] | No | - | License IDs cần hoàn tiền |
| `refundAmount` | Number | No | - | Số tiền hoàn |
| `reason` | String | No | - | Lý do hoàn tiền |
| `isPartial` | Boolean | No | `false` | Hoàn một phần |
| `expectedVersion` | Int | No | - | Version cho optimistic locking |

---

### 4. publishDraftOrder

Chuyển đơn nháp thành đơn hàng chờ thanh toán.

**Mutation:**
```graphql
mutation PublishDraftOrder($input: PublishDraftOrderInputDto!) {
  publishDraftOrder(input: $input) {
    success
    orderId
    orderCode
    paymentQrCode
    newStatus
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "orderId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
    "paymentMethods": [
      {
        "paymentMethodId": "pm-uuid",
        "name": "Bank Transfer",
        "amount": 5000000
      }
    ],
    "note": "Publish draft",
    "expectedVersion": 1
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | String (UUID) | **Yes** | ID đơn nháp |
| `paymentMethods` | Array | No | Phương thức thanh toán |
| `note` | String | No | Ghi chú |
| `expectedVersion` | Int | No | Version cho optimistic locking |

---

### 5. confirmOrderWithLicense

Xác nhận đơn hàng và tạo license ngay (status: PENDING_PAYMENT).

**Flow:** `DRAFT → CONFIRMED → PROCESSING`

**Mutation:**
```graphql
mutation ConfirmOrderWithLicense($input: ConfirmOrderWithLicenseInputDto!) {
  confirmOrderWithLicense(input: $input) {
    success
    orderId
    orderCode
    newStatus
    invoice {
      id
      invoiceNumber
      totalAmount
      status
    }
    licenses {
      id
      licenseCode
      status
      productName
      packageName
    }
    paymentDeadline
    paymentDeadlineSource
    paymentDeadlineHours
    totalAmount
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "orderId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
    "paymentDeadlineHours": 72,
    "note": "Đơn hàng ưu tiên",
    "expectedVersion": 1
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `orderId` | String (UUID) | **Yes** | - | ID đơn hàng |
| `paymentDeadlineHours` | Int | No | - | Override deadline (1-720 hours) |
| `note` | String | No | - | Ghi chú |
| `expectedVersion` | Int | No | - | Version cho optimistic locking |

**Payment Deadline Priority:**
1. `MANUAL` - paymentDeadlineHours trong input
2. `RESELLER_TIER` - Theo tier của reseller
3. `CUSTOMER_TYPE` - Theo loại khách hàng
4. `PRODUCT` - Theo cấu hình sản phẩm
5. `GLOBAL` - Cấu hình mặc định hệ thống

**Response Success:**
```json
{
  "data": {
    "confirmOrderWithLicense": {
      "success": true,
      "orderId": "...",
      "orderCode": "ORD-2026-001",
      "newStatus": "PROCESSING",
      "invoice": {
        "id": "...",
        "invoiceNumber": "INV-2026-001",
        "totalAmount": 5000000,
        "status": "PENDING"
      },
      "licenses": [
        {
          "id": "...",
          "licenseCode": "LIC-XXX-YYY",
          "status": "PENDING_PAYMENT",
          "productName": "Enterprise Marketing",
          "packageName": "Pro Package"
        }
      ],
      "paymentDeadline": "2026-01-18T10:30:00.000Z",
      "paymentDeadlineSource": "GLOBAL",
      "paymentDeadlineHours": 72,
      "totalAmount": 5000000,
      "error": null
    }
  }
}
```

---

### 6. confirmOrderPayment

Xác nhận thanh toán từ nhiều nguồn.

**Flow:** `PROCESSING → COMPLETED` (nếu thanh toán đủ)

**Mutation:**
```graphql
mutation ConfirmOrderPayment($input: ConfirmPaymentInputDto!) {
  confirmOrderPayment(input: $input) {
    success
    orderId
    orderCode
    previousStatus
    newStatus
    paymentSummary {
      totalAmount
      paidAmount
      remainingAmount
      paymentStatus
      paidPercent
    }
    licensesActivated
    message
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "orderId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
    "paymentMethod": "SEPAY",
    "amount": 5000000,
    "transactionId": "TXN-123456",
    "note": "Thanh toán qua SEPay",
    "expectedVersion": 2
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | String (UUID) | **Yes** | ID đơn hàng |
| `paymentMethod` | String | **Yes** | `SEPAY`, `BANK_TRANSFER`, `CASH`, `OTHER` |
| `amount` | Float | **Yes** | Số tiền thanh toán |
| `transactionId` | String | No | Mã giao dịch từ payment gateway |
| `note` | String | No | Ghi chú |
| `expectedVersion` | Int | No | Version cho optimistic locking |

**Authorization:**
- `SEPAY`, `BANK_TRANSFER`: SALES + Executives
- `CASH`, `OTHER`: ACCOUNTING department only + Executives

**Response Success:**
```json
{
  "data": {
    "confirmOrderPayment": {
      "success": true,
      "orderId": "...",
      "orderCode": "ORD-2026-001",
      "previousStatus": "PROCESSING",
      "newStatus": "COMPLETED",
      "paymentSummary": {
        "totalAmount": 5000000,
        "paidAmount": 5000000,
        "remainingAmount": 0,
        "paymentStatus": "PAID",
        "paidPercent": 100
      },
      "licensesActivated": true,
      "message": "Payment confirmed successfully",
      "error": null
    }
  }
}
```

---

### 7. unlockOrderAfterPayment

Mở khóa đơn hàng sau khi thanh toán muộn.

**Flow:** `LOCKED → COMPLETED`

**Mutation:**
```graphql
mutation UnlockOrderAfterPayment($input: UnlockOrderInputDto!) {
  unlockOrderAfterPayment(input: $input) {
    success
    orderId
    orderCode
    previousStatus
    newStatus
    unlockedLicenses {
      id
      licenseCode
      status
      productName
      packageName
    }
    unlockedAt
    message
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "orderId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
    "amount": 5000000,
    "transactionId": "TXN-789012",
    "note": "Khách thanh toán muộn",
    "expectedVersion": 3
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | String (UUID) | **Yes** | ID đơn hàng bị khóa |
| `amount` | Float | **Yes** | Số tiền thanh toán |
| `transactionId` | String | No | Mã giao dịch |
| `note` | String | No | Ghi chú |
| `expectedVersion` | Int | No | Version cho optimistic locking |

**Authorization:** ACCOUNTING department only + Executives

---

### 8. confirmPayment

Xác nhận thanh toán thủ công cho một payment record.

**Mutation:**
```graphql
mutation ConfirmPayment($input: ManualConfirmPaymentInputDto!) {
  confirmPayment(input: $input) {
    success
    message
    payment {
      id
      status
    }
    order {
      orderId
      orderCode
      paidAmount
      remainingAmount
      paymentStatus
      paidPercent
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "paymentId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
    "note": "Xác nhận thanh toán thủ công"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentId` | String (UUID) | **Yes** | ID của payment record |
| `note` | String | No | Ghi chú |

**Response Success:**
```json
{
  "data": {
    "confirmPayment": {
      "success": true,
      "message": "Payment action completed successfully",
      "payment": {
        "id": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
        "status": "CONFIRMED"
      },
      "order": {
        "orderId": "...",
        "orderCode": "ORD-2026-001",
        "paidAmount": 5000000,
        "remainingAmount": 0,
        "paymentStatus": "PAID",
        "paidPercent": 100
      }
    }
  }
}
```

**Note:** Mutation này khác với `confirmOrderPayment`:
- `confirmPayment`: Xác nhận một payment record cụ thể (theo paymentId)
- `confirmOrderPayment`: Xác nhận thanh toán cho đơn hàng (theo orderId, tạo payment mới)

---

### 9. rejectPayment

Từ chối một payment đang pending.

**Mutation:**
```graphql
mutation RejectPayment($input: RejectPaymentInputDto!) {
  rejectPayment(input: $input) {
    success
    message
    payment {
      id
      status
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "paymentId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
    "reason": "Thông tin chuyển khoản không khớp"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentId` | String (UUID) | **Yes** | ID của payment record |
| `reason` | String | **Yes** | Lý do từ chối |

---

### 10. updateOrderItem

Cập nhật một order item với optimistic locking.

**Mutation:**
```graphql
mutation UpdateOrderItem($input: UpdateOrderItemInputDto!) {
  updateOrderItem(input: $input) {
    success
    orderItemId
    orderId
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "orderItemId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
    "variantId": "new-variant-uuid",
    "quantity": 2,
    "unitPrice": 2500000,
    "note": "Đổi gói",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderItemId` | String (UUID) | **Yes** | ID order item |
| `variantId` | String (UUID) | No | ID variant mới |
| `quantity` | Int | No | Số lượng mới (min: 1) |
| `unitPrice` | Number | No | Đơn giá tùy chỉnh |
| `note` | String | No | Ghi chú |
| `updatedAt` | String | No | Timestamp cho optimistic locking |

---

### 11. recalculateOrderItems

Tính lại tất cả order items của một đơn hàng.

**Mutation:**
```graphql
mutation RecalculateOrderItems($orderId: String!) {
  recalculateOrderItems(orderId: $orderId) {
    success
    updatedCount
    error
  }
}
```

**Variables:**
```json
{
  "orderId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
}
```

**Response:**
```json
{
  "data": {
    "recalculateOrderItems": {
      "success": true,
      "updatedCount": 3,
      "error": null
    }
  }
}
```

---

## Types

### OrderOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Order ID (UUID) |
| `name` | String | Yes | Tên đơn hàng |
| `orderCode` | String | Yes | Mã đơn hàng (unique) |
| `status` | OrderStatus | Yes | Trạng thái đơn hàng |
| `totalAmount` | Number | Yes | Tổng tiền |
| `subtotal` | Number | Yes | Tạm tính |
| `tax` | Number | Yes | Thuế |
| `discount` | Number | Yes | Giảm giá trực tiếp |
| `promotionDiscount` | Number | Yes | Giảm giá promotion |
| `comboDiscount` | Number | Yes | Giảm giá combo |
| `currency` | String | Yes | Đơn vị tiền tệ |
| `note` | String | Yes | Ghi chú |
| `paidAmount` | Number | Yes | Số tiền đã thanh toán |
| `remainingAmount` | Number | Yes | Số tiền còn lại |
| `paymentStatus` | PaymentStatus | Yes | Trạng thái thanh toán |
| `paymentDeadline` | String | Yes | Hạn thanh toán (ISO 8601) |
| `mktCustomerId` | String | Yes | ID khách hàng |
| `accountOwnerId` | String | Yes | ID người phụ trách |
| `createdById` | String | Yes | ID người tạo |
| `createdAt` | String | Yes | Ngày tạo (ISO 8601) |
| `updatedAt` | String | Yes | Ngày cập nhật (ISO 8601) |

### OrderPaymentSummaryOutput

| Field | Type | Description |
|-------|------|-------------|
| `totalAmount` | Number | Tổng tiền đơn hàng |
| `paidAmount` | Number | Tổng tiền đã thanh toán |
| `remainingAmount` | Number | Số tiền còn lại |
| `paymentStatus` | PaymentStatus | Trạng thái thanh toán |
| `paidPercent` | Number | Phần trăm đã thanh toán (0-100) |

### LicenseInfoOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | License ID |
| `licenseCode` | String | Yes | Mã license |
| `status` | String | No | Trạng thái license |
| `productName` | String | Yes | Tên sản phẩm |
| `packageName` | String | Yes | Tên gói |

### InvoiceInfoOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Invoice ID |
| `invoiceNumber` | String | Yes | Số hóa đơn |
| `totalAmount` | Float | Yes | Tổng tiền |
| `status` | String | Yes | Trạng thái hóa đơn |

### CustomerOrderStatsOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `orderCount` | Number | No | Tổng số đơn hàng |
| `totalValue` | Number | No | Tổng giá trị đơn hàng |
| `firstOrderDate` | String | Yes | Ngày đặt đơn đầu tiên |
| `lastOrderDate` | String | Yes | Ngày đặt đơn gần nhất |
| `averageOrderInterval` | Number | No | Khoảng cách trung bình giữa các đơn (ngày) |

---

## Enums

### OrderStatus

| Value | Description |
|-------|-------------|
| `DRAFT` | Nháp - Đơn hàng đang được soạn |
| `PENDING_PAYMENT` | Chờ thanh toán |
| `CONFIRMED` | Đã xác nhận, sẵn sàng tạo license |
| `PROCESSING` | Đang xử lý - License đã cấp, chờ thanh toán |
| `COMPLETED` | Hoàn thành - License đã active |
| `LOCKED` | Khóa do quá hạn thanh toán |
| `TRIAL` | Đơn dùng thử |
| `TRIAL_EXPIRED` | Trial hết hạn |
| `CANCELED` | Đã hủy |
| `OVERDUE` | Quá hạn thanh toán |
| `BLOCKED` | Bị khóa do vi phạm |
| `REFUND` | Hoàn tiền toàn bộ |
| `REFUND_PARTIAL` | Hoàn tiền một phần |

### PaymentStatus

| Value | Description |
|-------|-------------|
| `PENDING` | Chưa thanh toán |
| `PARTIAL` | Thanh toán một phần |
| `PAID` | Đã thanh toán đủ |
| `OVERPAID` | Thanh toán thừa |

### CreateOrderAction

Actions cho phép khi tạo đơn hàng:

| Value | Description |
|-------|-------------|
| `NEW_ORDER` | Tạo đơn hàng mới |
| `LICENSE_RENEWING` | Gia hạn license (cần licenseId) |
| `TRIAL_TO_PAID` | Tạo trial rồi chuyển sang trả phí |

### ConfirmOrderAction

Actions cho phép khi xác nhận đơn hàng:

| Value | Description |
|-------|-------------|
| `CONFIRM_ORDER` | Xác nhận đơn hàng, tạo license với PENDING_PAYMENT |
| `PAYMENT_CONFIRMED` | Xác nhận thanh toán, kích hoạt license |

### OrderAction

Tất cả actions (cho updateOrderStatus):

| Value | Description |
|-------|-------------|
| `NEW_ORDER` | Tạo đơn hàng mới |
| `TRIAL` | Tạo đơn trial |
| `LICENSE_RENEWING` | Gia hạn license |
| `CHANGE_VARIANT` | Đổi gói |
| `CONFIRM_ORDER` | Xác nhận đơn hàng, tạo license PENDING_PAYMENT |
| `PAYMENT_CONFIRMED` | Xác nhận thanh toán, kích hoạt license |
| `LOCK_OVERDUE` | Khóa do quá hạn |
| `UNLOCK_AFTER_PAYMENT` | Mở khóa sau thanh toán muộn |
| `COMPLETE` | Hoàn thành đơn |
| `CANCEL` | Hủy đơn |
| `BLOCK` | Khóa đơn |
| `TRIAL_TO_PAID` | Chuyển trial sang trả phí |
| `REFUND` | Hoàn tiền toàn bộ |
| `REFUND_PARTIAL` | Hoàn tiền một phần |

---

## Order Status Flow

### Payment Flow

```
                                    ┌─────────────────────────────────────┐
                                    │         New Payment Flow            │
                                    └─────────────────────────────────────┘

DRAFT ──► CONFIRMED ──► PROCESSING ──────────────────────────► COMPLETED
              │              │                                      ▲
              │              │ License: PENDING_PAYMENT             │
              │              │ (đã cấp, chờ thanh toán)             │
              │              │                                      │
              │              ▼                                      │
              │          LOCKED ────────────────────────────────────┘
              │          (quá hạn thanh toán)              unlockOrderAfterPayment
              │          License: LOCKED trên MKT Server
              │
              └── confirmOrderWithLicense
```

**Mutations:**
1. `createOrderWithItems` với `isDraft: true` → `DRAFT`
2. `confirmOrderWithLicense` → `PROCESSING` (License: PENDING_PAYMENT - khách có thể dùng)
3. `confirmOrderPayment` → `COMPLETED` (License: ACTIVE)

**Overdue Flow:**
- Quá hạn thanh toán (tự động): `PROCESSING` → `LOCKED` (License bị LOCK trên MKT Server)
- Thanh toán muộn: `unlockOrderAfterPayment` → `COMPLETED` (License: ACTIVE)

---

## Hierarchical Access Filtering

Queries tự động áp dụng bộ lọc phân cấp dựa trên role người dùng:

| Level | Role | Access |
|-------|------|--------|
| 8-11 | Staff | Chỉ xem đơn do mình tạo |
| 7 | Manager | Xem đơn của cấp dưới trực tiếp |
| 4-6 | Upper Management | Xem đơn trong reporting chain |
| 1-3 | Executive | Xem tất cả đơn hàng |

---

## Error Handling

### Optimistic Locking

Tất cả mutations hỗ trợ `expectedVersion` để ngăn chặn conflict:

```json
{
  "data": {
    "updateOrderStatus": {
      "success": false,
      "error": "Version mismatch. Expected: 1, Current: 2. Order was modified by another user."
    }
  }
}
```

### Common Errors

| Error Message | Description |
|---------------|-------------|
| `Order not found with ID: xxx` | Đơn hàng không tồn tại |
| `Invalid status transition` | Chuyển trạng thái không hợp lệ |
| `Version mismatch` | Đơn hàng đã bị sửa bởi người khác |
| `Cash payments must be confirmed by Accounting` | CASH payment cần Accounting confirm |
| `Customer not found` | Khách hàng không tồn tại |
| `Product not found` | Sản phẩm không tồn tại trên MKT Server |
| `Package not found` | Gói không tồn tại |
| `License not found` | License không tồn tại (cho LICENSE_RENEWING) |
| `Order is not in DRAFT status` | Đơn không phải DRAFT (cho publishDraftOrder) |
| `Order is not in LOCKED status` | Đơn không bị khóa (cho unlockOrderAfterPayment) |

---

## Response Format

Tất cả responses đều có cấu trúc:

```json
{
  "success": true/false,
  "orderId": "...",
  "orderCode": "...",
  "error": "..." // Nếu success=false
}
```

**List Response** có thêm:
```json
{
  "orders": [...],
  "totalCount": 10
}
```
