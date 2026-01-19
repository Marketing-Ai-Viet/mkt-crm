# Test Documentation: Order Mutation Resolver

> **File**: `packages/twenty-server/src/mkt-core/order/resolvers/order-mutation.resolver.ts`
> **Ngày tạo**: 2026-01-19
> **Mục đích**: Test tất cả mutations trong OrderMutationResolver

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

### 2.1. Customers

| ID | Tên | Email | Tier |
|----|-----|-------|------|
| `49868053-4758-457f-9332-6ebd48af7ca6` | Nguyễn Văn An | nguyen.van.an@techcorp.vn | DIAMOND |
| `9c500415-1e6a-4320-8770-a6a33d03f0a2` | Lê Minh Cường | le.minh.cuong@gmail.com | SILVER |
| `cbdb1f84-693c-4f66-8049-93169a0231c4` | Phạm Hoàng Dung | pham.hoang.dung@startup.vn | BRONZE |

### 2.2. External Products (từ Redis Cache)

**Product 1: Enterprise Tự động hóa Marketing**

| Field | Value |
|-------|-------|
| productId | `0199e0fd-fe2b-714f-b502-11dff2d3b28e` |
| code | `PRODUCT_001_2026` |

**Packages:**

| packageId | Tên | Giá | Billing |
|-----------|-----|-----|---------|
| `0199e6e1-7935-714e-b8fa-7a2f2e78c643` | Gói Cơ Bản - Tháng | 299,000 VND | monthly |
| `0199e6e1-7935-714e-b8fa-7c6cbc5a7f30` | Gói Chuyên Nghiệp - Năm | 2,990,000 VND | yearly |
| `0199e6e1-7935-714e-b8fa-8370ec4b8f16` | Gói Doanh Nghiệp - Vĩnh Viễn | 19,990,000 VND | lifetime |

**Product 2: Smart Phân tích & Báo cáo**

| Field | Value |
|-------|-------|
| productId | `0199e0fd-fe2e-718d-bafd-533d14117ca5` |
| code | `PRODUCT_003_2026` |

**Packages:**

| packageId | Tên | Giá | Billing |
|-----------|-----|-----|---------|
| `0199e6e1-7935-714e-b8fa-a04c464b1cfc` | Gói Phân Tích Cơ Bản - Tháng | 149,000 VND | monthly |
| `0199e6e1-7935-714e-b8fa-a4b9618ac450` | Gói Phân Tích Nâng Cao - Năm | 1,490,000 VND | yearly |

### 2.3. Orders từ Database

**PROCESSING Orders:**

| orderId | orderCode | totalAmount |
|---------|-----------|-------------|
| `c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab` | MKT-PROC-2024-038 | 16,500,000 |
| `d2b3c4d5-e6f7-a8b9-c0d1-234567890abc` | MKT-PROC-2024-039 | 52,500,000 |

**LOCKED Orders:**

| orderId | orderCode | totalAmount |
|---------|-----------|-------------|
| `f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde` | MKT-LOCK-2024-041 | 5,500,000 |
| `a5e6f7a8-b9c0-d1e2-f3a4-567890abcdef` | MKT-LOCK-2024-042 | 26,500,000 |

---

## 3. Mutations

### 3.1. createOrderWithItems

> Tạo đơn hàng mới với items từ MKT Server

**Input DTO: CreateOrderWithItemsInputDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customerId | String (UUID) | Yes | ID khách hàng |
| action | CREATE_ORDER_ACTION | Yes | NEW_ORDER, LICENSE_RENEWING, TRIAL_TO_PAID |
| externalProducts | [ExternalMktProductInputDto] | No | Danh sách sản phẩm từ MKT Server |
| combos | [ComboOrderInputDto] | No | Danh sách combo |
| isDraft | Boolean | No | Tạo draft (default: false) |
| couponCode | String | No | Mã coupon |
| applyAutoPromotions | Boolean | No | Auto áp dụng khuyến mãi (default: true) |
| note | String | No | Ghi chú |
| currency | String | No | Tiền tệ (default: VND) |
| orderLanguage | String | No | Ngôn ngữ (vi/en/ko, default: vi) |

**ExternalMktProductInputDto:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| productId | String | Yes | Product ID từ MKT Server (UUIDv7) |
| packageId | String | No | Package ID từ MKT Server |
| maxDevices | Int | No | Số thiết bị tối đa (default: 1) |
| splitLicenses | Boolean | No | Tách thành nhiều license (default: false) |

**GraphQL:**

```graphql
mutation CreateOrderWithItems {
  createOrderWithItems(input: {
    customerId: "49868053-4758-457f-9332-6ebd48af7ca6"
    action: NEW_ORDER
    isDraft: true
    externalProducts: [
      {
        productId: "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
        packageId: "0199e6e1-7935-714e-b8fa-7a2f2e78c643"
        maxDevices: 1
      }
    ]
    note: "Test order - Draft"
  }) {
    success
    orderId
    orderCode
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    error
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{"query":"mutation CreateOrderWithItems { createOrderWithItems(input: { customerId: \"49868053-4758-457f-9332-6ebd48af7ca6\", action: NEW_ORDER, isDraft: true, externalProducts: [{ productId: \"0199e0fd-fe2b-714f-b502-11dff2d3b28e\", packageId: \"0199e6e1-7935-714e-b8fa-7a2f2e78c643\", maxDevices: 1 }], note: \"Test order - Draft\" }) { success orderId orderCode totalAmount paidAmount remainingAmount paymentStatus error } }"}'
```

**Expected Response:**

```json
{
  "data": {
    "createOrderWithItems": {
      "success": true,
      "orderId": "uuid-order-id",
      "orderCode": "MKT-XXXX-XXXX-XXX",
      "totalAmount": 299000,
      "paidAmount": 0,
      "remainingAmount": 299000,
      "paymentStatus": "PENDING",
      "error": null
    }
  }
}
```

---

### 3.2. confirmOrder (Legacy)

> Xác nhận thanh toán đơn hàng (chuyển PENDING_PAYMENT → CONFIRMED)

**Input DTO: ConfirmOrderInputDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | String (UUID) | Yes | ID đơn hàng |
| action | CONFIRM_ORDER_ACTION | Yes | ACCOUNTING_CONFIRMED |
| note | String | No | Ghi chú |

**GraphQL:**

```graphql
mutation ConfirmOrder {
  confirmOrder(input: {
    orderId: "{ORDER_ID}"
    action: ACCOUNTING_CONFIRMED
    note: "Payment received"
  }) {
    success
    orderId
    orderCode
    newStatus
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    error
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"query":"mutation ConfirmOrder { confirmOrder(input: { orderId: \"{ORDER_ID}\", action: ACCOUNTING_CONFIRMED, note: \"Payment received\" }) { success orderId orderCode newStatus totalAmount paidAmount remainingAmount paymentStatus error } }"}'
```

---

### 3.3. updateOrderStatus

> Cập nhật trạng thái đơn hàng với state machine validation

**Input DTO: UpdateOrderStatusInputDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | String (UUID) | Yes | ID đơn hàng |
| action | ORDER_ACTION | Yes | Action to perform |
| note | String | No | Ghi chú |

**ORDER_ACTION enum:**

| Action | Description |
|--------|-------------|
| CANCEL | Hủy đơn hàng |
| COMPLETE | Hoàn thành đơn hàng |
| BLOCK | Chặn đơn hàng |

**GraphQL:**

```graphql
mutation UpdateOrderStatus {
  updateOrderStatus(input: {
    orderId: "{ORDER_ID}"
    action: CANCEL
    note: "Customer requested cancellation"
  }) {
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

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"query":"mutation UpdateOrderStatus { updateOrderStatus(input: { orderId: \"{ORDER_ID}\", action: CANCEL, note: \"Customer requested cancellation\" }) { success orderId previousStatus newStatus totalAmount paidAmount remainingAmount paymentStatus message error } }"}'
```

---

### 3.4. refundOrder

> Hoàn tiền đơn hàng (toàn bộ hoặc một phần)

**Input DTO: RefundOrderInputDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | String (UUID) | Yes | ID đơn hàng |
| licenseIds | [String] | No | License IDs cần hoàn (partial) |
| refundAmount | Number | No | Số tiền hoàn (optional) |
| reason | String | No | Lý do hoàn |
| isPartial | Boolean | No | Hoàn một phần (default: false) |

**GraphQL:**

```graphql
mutation RefundOrder {
  refundOrder(input: {
    orderId: "{ORDER_ID}"
    reason: "Customer not satisfied"
    isPartial: false
  }) {
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

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"query":"mutation RefundOrder { refundOrder(input: { orderId: \"{ORDER_ID}\", reason: \"Customer not satisfied\", isPartial: false }) { success orderId refundedAmount newStatus totalAmount paidAmount remainingAmount paymentStatus error } }"}'
```

---

### 3.5. publishDraftOrder

> Publish draft order - chuyển DRAFT → PENDING_PAYMENT

**Input DTO: PublishDraftOrderInputDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | String (UUID) | Yes | ID đơn hàng draft |
| paymentMethods | [OrderPaymentMethodInputDto] | No | Payment methods |
| note | String | No | Ghi chú |

**GraphQL:**

```graphql
mutation PublishDraftOrder {
  publishDraftOrder(input: {
    orderId: "{DRAFT_ORDER_ID}"
    note: "Publishing draft"
  }) {
    success
    orderId
    orderCode
    paymentQrCode
    newStatus
    error
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"query":"mutation PublishDraftOrder { publishDraftOrder(input: { orderId: \"{DRAFT_ORDER_ID}\", note: \"Publishing draft\" }) { success orderId orderCode paymentQrCode newStatus error } }"}'
```

---

### 3.6. confirmOrderWithLicense (New Payment Flow)

> Xác nhận order và tạo license - DRAFT → PROCESSING

**Input DTO: ConfirmOrderWithLicenseInputDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | String (UUID) | Yes | ID đơn hàng |
| paymentDeadlineHours | Int | No | Deadline thanh toán (hours) |
| note | String | No | Ghi chú |

**GraphQL:**

```graphql
mutation ConfirmOrderWithLicense {
  confirmOrderWithLicense(input: {
    orderId: "{DRAFT_ORDER_ID}"
    paymentDeadlineHours: 72
    note: "Confirm and create license"
  }) {
    success
    orderId
    orderCode
    newStatus
    invoice {
      id
      invoiceCode
      totalAmount
    }
    licenses {
      id
      licenseKey
      status
      productName
    }
    paymentDeadline
    paymentDeadlineSource
    paymentDeadlineHours
    totalAmount
    message
    error
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"query":"mutation ConfirmOrderWithLicense { confirmOrderWithLicense(input: { orderId: \"{DRAFT_ORDER_ID}\", paymentDeadlineHours: 72, note: \"Confirm and create license\" }) { success orderId orderCode newStatus invoice { id invoiceCode totalAmount } licenses { id licenseKey status productName } paymentDeadline paymentDeadlineSource paymentDeadlineHours totalAmount message error } }"}'
```

---

### 3.7. confirmOrderPayment (New Payment Flow)

> Xác nhận thanh toán - PROCESSING → COMPLETED

**Input DTO: ConfirmPaymentInputDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | String (UUID) | Yes | ID đơn hàng |
| paymentMethod | String | Yes | BANK_TRANSFER, SEPAY, CASH, OTHER |
| amount | Number | Yes | Số tiền thanh toán |
| transactionId | String | No | Mã giao dịch |
| note | String | No | Ghi chú |

**GraphQL:**

```graphql
mutation ConfirmOrderPayment {
  confirmOrderPayment(input: {
    orderId: "c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab"
    paymentMethod: "BANK_TRANSFER"
    amount: 16500000
    transactionId: "TXN-123456789"
    note: "Payment confirmed via bank transfer"
  }) {
    success
    orderId
    orderCode
    previousStatus
    newStatus
    licensesActivated
    message
    error
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{"query":"mutation ConfirmOrderPayment { confirmOrderPayment(input: { orderId: \"c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab\", paymentMethod: \"BANK_TRANSFER\", amount: 16500000, transactionId: \"TXN-123456789\", note: \"Payment confirmed\" }) { success orderId orderCode previousStatus newStatus licensesActivated message error } }"}'
```

**Expected Response:**

```json
{
  "data": {
    "confirmOrderPayment": {
      "success": true,
      "orderId": "c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab",
      "orderCode": "MKT-PROC-2024-038",
      "previousStatus": "PROCESSING",
      "newStatus": "COMPLETED",
      "licensesActivated": true,
      "message": "Payment confirmed and licenses activated",
      "error": null
    }
  }
}
```

---

### 3.8. unlockOrderAfterPayment (New Payment Flow)

> Mở khóa order sau thanh toán muộn - LOCKED → COMPLETED

**Input DTO: UnlockOrderInputDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | String (UUID) | Yes | ID đơn hàng |
| amount | Number | Yes | Số tiền thanh toán |
| transactionId | String | No | Mã giao dịch |
| note | String | No | Ghi chú |

**GraphQL:**

```graphql
mutation UnlockOrderAfterPayment {
  unlockOrderAfterPayment(input: {
    orderId: "f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde"
    amount: 5500000
    transactionId: "TXN-LATE-123456"
    note: "Late payment received"
  }) {
    success
    orderId
    orderCode
    previousStatus
    newStatus
    unlockedAt
    message
    error
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{"query":"mutation UnlockOrderAfterPayment { unlockOrderAfterPayment(input: { orderId: \"f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde\", amount: 5500000, transactionId: \"TXN-LATE-123456\", note: \"Late payment received\" }) { success orderId orderCode previousStatus newStatus unlockedAt message error } }"}'
```

**Expected Response:**

```json
{
  "data": {
    "unlockOrderAfterPayment": {
      "success": true,
      "orderId": "f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde",
      "orderCode": "MKT-LOCK-2024-041",
      "previousStatus": "LOCKED",
      "newStatus": "COMPLETED",
      "unlockedAt": "2026-01-19T12:00:00.000Z",
      "message": "Order unlocked and licenses activated",
      "error": null
    }
  }
}
```

---

## 4. Test Scenarios

### 4.1. Full Flow Test - New Payment Flow

```
Step 1: createOrderWithItems (isDraft: true)
   ↓
Step 2: confirmOrderWithLicense
   ↓
Step 3a: confirmOrderPayment (happy path)
   OR
Step 3b: Order bị lock → unlockOrderAfterPayment
```

### 4.2. Error Cases

| Scenario | Expected Error |
|----------|----------------|
| Invalid orderId | "Order not found" |
| Invalid state transition | "Invalid state transition: Cannot transition from X to Y" |
| Customer not found | "Customer not found" |
| Product not found | "Product not found in MKT Server cache" |
| Invalid packageId | "Package not found for product" |

---

## 5. Authorization Notes

> **Lưu ý**: Permission checks đã được tạm thời disable để testing.

**Original Authorization:**

| Mutation | Department | Role |
|----------|------------|------|
| createOrderWithItems | SALES | Manager + Executives |
| confirmOrder | ACCOUNTING | Executives only |
| updateOrderStatus | SALES + ACCOUNTING | Manager + Executives |
| refundOrder | ACCOUNTING | Executives only |
| publishDraftOrder | SALES | Manager + Executives |
| confirmOrderWithLicense | SALES | Executives |
| confirmOrderPayment | SALES (bank) + ACCOUNTING (cash) | Executives |
| unlockOrderAfterPayment | ACCOUNTING | Executives only |

---

*Tài liệu được tạo tự động bởi Claude Code vào 2026-01-19*
