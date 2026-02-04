# Payment Confirmation API - Frontend Developer Guide

## Overview

API GraphQL để xác nhận thanh toán đơn hàng bởi Sale và Accounting trong hệ thống CRM.

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Bearer Token (required)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## Business Context

### Payment Confirmation Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Order Created │────▶│  Sale Confirms  │────▶│Accounting Confirms│
│   (PROCESSING)  │     │   (Protected)   │     │   (Complete)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │                        │
                              ▼                        ▼
                     License protected        Order may be COMPLETED
                     from auto-lock           if paymentStatus = PAID
```

### Protection Rules

| State | Protected from Auto-Lock | Description |
|-------|-------------------------|-------------|
| `saleConfirmed = true` | ✅ Yes | Sale xác nhận khách đã thanh toán |
| `accountingConfirmed = true` | ✅ Yes | Kế toán xác nhận đã đối soát |
| Both `false` | ❌ No | Order có thể bị auto-lock nếu quá deadline |

---

## API Categories

### Mutation APIs
- `confirmPaymentBySale` - Sale xác nhận thanh toán
- `confirmPaymentByAccounting` - Kế toán xác nhận thanh toán
- `revokePaymentConfirmation` - Thu hồi xác nhận

### Query APIs
- `getPaymentConfirmationStatus` - Lấy trạng thái xác nhận
- `getPaymentConfirmationHistory` - Lấy lịch sử xác nhận

---

## Mutations

### 1. confirmPaymentBySale

Sale xác nhận khách hàng đã thanh toán. **Bảo vệ license khỏi bị auto-lock.**

**Use case:** Khi sale nhận được thông báo khách đã chuyển khoản nhưng chưa đối soát xong.

**Mutation:**
```graphql
mutation ConfirmPaymentBySale($input: PaymentConfirmationInputDto!) {
  confirmPaymentBySale(input: $input) {
    success
    orderId
    confirmedAt
    type
    version
    actor {
      id
      name
    }
    note
  }
}
```

**Variables:**
```json
{
  "input": {
    "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea",
    "note": "Khách đã gửi ảnh chuyển khoản",
    "metadata": {
      "bankRef": "TXN123456",
      "amount": 149000
    }
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | String (UUID) | **Yes** | ID của order cần xác nhận |
| `idempotencyKey` | String | No | Key để tránh xử lý trùng lặp |
| `note` | String | No | Ghi chú cho việc xác nhận |
| `metadata` | JSON | No | Dữ liệu bổ sung (bankRef, amount, etc.) |

**Response Success:**
```json
{
  "data": {
    "confirmPaymentBySale": {
      "success": true,
      "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea",
      "confirmedAt": "2026-02-04T04:15:00.000Z",
      "type": "SALE",
      "version": 6,
      "actor": {
        "id": "20202020-0687-4c41-b707-ed1bfca972a7",
        "name": "Unknown"
      },
      "note": "Khách đã gửi ảnh chuyển khoản"
    }
  }
}
```

**Error - Order không tồn tại:**
```json
{
  "errors": [{
    "message": "Order not found: 785502a8-...",
    "extensions": { "code": "NOT_FOUND" }
  }],
  "data": null
}
```

**Error - Đã xác nhận rồi:**
```json
{
  "errors": [{
    "message": "Order 785502a8-... has already been confirmed by sale",
    "extensions": { "code": "CONFLICT" }
  }],
  "data": null
}
```

**Error - Status không hợp lệ:**
```json
{
  "errors": [{
    "message": "Cannot perform operation on order ... in status COMPLETED. Valid statuses: PROCESSING, PENDING_PAYMENT",
    "extensions": { "code": "BAD_REQUEST" }
  }],
  "data": null
}
```

---

### 2. confirmPaymentByAccounting

Kế toán xác nhận thanh toán đã được đối soát. **Có thể complete order nếu paymentStatus = PAID.**

**Use case:** Khi kế toán đã đối soát với sao kê ngân hàng.

**Mutation:**
```graphql
mutation ConfirmPaymentByAccounting($input: PaymentConfirmationInputDto!) {
  confirmPaymentByAccounting(input: $input) {
    success
    orderId
    confirmedAt
    type
    version
    actor {
      id
      name
    }
    note
  }
}
```

**Variables:**
```json
{
  "input": {
    "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea",
    "note": "Đã đối soát sao kê ngân hàng"
  }
}
```

**Input Parameters:** (Giống `confirmPaymentBySale`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | String (UUID) | **Yes** | ID của order cần xác nhận |
| `idempotencyKey` | String | No | Key để tránh xử lý trùng lặp |
| `note` | String | No | Ghi chú cho việc xác nhận |
| `metadata` | JSON | No | Dữ liệu bổ sung |

**Response Success:**
```json
{
  "data": {
    "confirmPaymentByAccounting": {
      "success": true,
      "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea",
      "confirmedAt": "2026-02-04T04:20:00.000Z",
      "type": "ACCOUNTING",
      "version": 7,
      "actor": {
        "id": "20202020-0687-4c41-b707-ed1bfca972a7",
        "name": "Unknown"
      },
      "note": "Đã đối soát sao kê ngân hàng"
    }
  }
}
```

**Error - Thiếu payment evidence:**
```json
{
  "errors": [{
    "message": "Cannot confirm accounting for order ...: no payment evidence (PAID status or sale confirmation)",
    "extensions": { "code": "BAD_REQUEST" }
  }],
  "data": null
}
```

---

### 3. revokePaymentConfirmation

Thu hồi xác nhận thanh toán. **⚠️ WARNING: Có thể gây auto-lock nếu quá deadline!**

**Use case:** Khi phát hiện xác nhận sai hoặc cần điều chỉnh.

**Mutation:**
```graphql
mutation RevokePaymentConfirmation($input: RevokeConfirmationInputDto!) {
  revokePaymentConfirmation(input: $input) {
    success
    orderId
    confirmedAt
    type
    version
    note
    impact {
      willBeLocked
      reason
      statusChanged
      previousStatus
      newStatus
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea",
    "type": "SALE",
    "reason": "Khách hàng thông báo chuyển nhầm"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | String (UUID) | **Yes** | ID của order |
| `type` | PaymentConfirmationType | **Yes** | `SALE` hoặc `ACCOUNTING` |
| `reason` | String | **Yes** | Lý do thu hồi |
| `idempotencyKey` | String | No | Key để tránh xử lý trùng lặp |

**PaymentConfirmationType Enum:**
- `SALE` - Thu hồi xác nhận của Sale
- `ACCOUNTING` - Thu hồi xác nhận của Kế toán

**Response Success:**
```json
{
  "data": {
    "revokePaymentConfirmation": {
      "success": true,
      "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea",
      "confirmedAt": "2026-02-04T04:25:00.000Z",
      "type": "SALE",
      "version": 8,
      "note": "Khách hàng thông báo chuyển nhầm",
      "impact": {
        "willBeLocked": false,
        "reason": "Order is still within payment deadline",
        "statusChanged": null,
        "previousStatus": null,
        "newStatus": null
      }
    }
  }
}
```

**Response - Order sẽ bị lock:**
```json
{
  "data": {
    "revokePaymentConfirmation": {
      "success": true,
      "orderId": "...",
      "impact": {
        "willBeLocked": true,
        "reason": "Order is past payment deadline and will lose protection after revoke"
      }
    }
  }
}
```

**Error - Không thể revoke sale khi đã có accounting:**
```json
{
  "errors": [{
    "message": "Cannot revoke sale confirmation: Accounting has already confirmed. Revoke accounting confirmation first.",
    "extensions": { "code": "BAD_REQUEST" }
  }],
  "data": null
}
```

**Error - Không có gì để revoke:**
```json
{
  "errors": [{
    "message": "No sale confirmation to revoke for order ...",
    "extensions": { "code": "BAD_REQUEST" }
  }],
  "data": null
}
```

---

## Queries

### 1. getPaymentConfirmationStatus

Lấy trạng thái xác nhận hiện tại của order.

**Query:**
```graphql
query GetPaymentConfirmationStatus($orderId: String!) {
  getPaymentConfirmationStatus(orderId: $orderId) {
    orderId
    saleConfirmed
    saleConfirmedAt
    saleConfirmedBy {
      id
      name
      email
    }
    accountingConfirmed
    accountingConfirmedAt
    accountingConfirmedBy {
      id
      name
      email
    }
    isProtectedFromAutoLock
    protectionReason
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
    "getPaymentConfirmationStatus": {
      "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea",
      "saleConfirmed": true,
      "saleConfirmedAt": "2026-02-04T04:15:00.000Z",
      "saleConfirmedBy": {
        "id": "20202020-0687-4c41-b707-ed1bfca972a7",
        "name": "Tim Apple",
        "email": null
      },
      "accountingConfirmed": true,
      "accountingConfirmedAt": "2026-02-04T04:20:00.000Z",
      "accountingConfirmedBy": {
        "id": "20202020-0687-4c41-b707-ed1bfca972a7",
        "name": "Tim Apple",
        "email": null
      },
      "isProtectedFromAutoLock": true,
      "protectionReason": "Protected by accounting confirmation"
    }
  }
}
```

**Response - Chưa xác nhận:**
```json
{
  "data": {
    "getPaymentConfirmationStatus": {
      "orderId": "...",
      "saleConfirmed": false,
      "saleConfirmedAt": null,
      "saleConfirmedBy": null,
      "accountingConfirmed": false,
      "accountingConfirmedAt": null,
      "accountingConfirmedBy": null,
      "isProtectedFromAutoLock": false,
      "protectionReason": "Not protected - may be auto-locked if past deadline"
    }
  }
}
```

---

### 2. getPaymentConfirmationHistory

Lấy lịch sử các thao tác xác nhận của order.

**Query:**
```graphql
query GetPaymentConfirmationHistory($orderId: String!) {
  getPaymentConfirmationHistory(orderId: $orderId) {
    orderId
    confirmations {
      id
      action
      confirmedAt
      actor {
        id
        name
      }
      note
      reason
      metadata
    }
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
    "getPaymentConfirmationHistory": {
      "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea",
      "confirmations": [
        {
          "id": "history-uuid-1",
          "action": "ACCOUNTING_CONFIRMED",
          "confirmedAt": "2026-02-04T04:20:00.000Z",
          "actor": {
            "id": "...",
            "name": "Tim Apple"
          },
          "note": "Đã đối soát sao kê ngân hàng",
          "reason": null,
          "metadata": null
        },
        {
          "id": "history-uuid-2",
          "action": "SALE_PAYMENT_CONFIRMED",
          "confirmedAt": "2026-02-04T04:15:00.000Z",
          "actor": {
            "id": "...",
            "name": "Tim Apple"
          },
          "note": "Khách đã gửi ảnh chuyển khoản",
          "reason": null,
          "metadata": {
            "bankRef": "TXN123456",
            "amount": 149000
          }
        }
      ]
    }
  }
}
```

**Action Types:**

| Action | Description |
|--------|-------------|
| `SALE_PAYMENT_CONFIRMED` | Sale xác nhận thanh toán |
| `SALE_CONFIRMATION_REVOKED` | Thu hồi xác nhận của Sale |
| `ACCOUNTING_CONFIRMED` | Kế toán xác nhận |
| `ACCOUNTING_CONFIRMATION_REVOKED` | Thu hồi xác nhận của Kế toán |

---

## Types

### PaymentConfirmationInputDto

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | String (UUID) | **Yes** | ID của order |
| `idempotencyKey` | String | No | Key chống duplicate |
| `note` | String | No | Ghi chú |
| `metadata` | JSON | No | Dữ liệu bổ sung |

### RevokeConfirmationInputDto

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | String (UUID) | **Yes** | ID của order |
| `type` | PaymentConfirmationType | **Yes** | `SALE` hoặc `ACCOUNTING` |
| `reason` | String | **Yes** | Lý do thu hồi |
| `idempotencyKey` | String | No | Key chống duplicate |

### ConfirmationResultOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Thành công hay không |
| `orderId` | String | No | Order ID |
| `confirmedAt` | String | No | Timestamp (ISO) |
| `type` | PaymentConfirmationType | No | `SALE` hoặc `ACCOUNTING` |
| `actor` | ActorInfoOutput | No | Thông tin người thực hiện |
| `note` | String | Yes | Ghi chú |
| `version` | Int | No | Version mới của order |
| `impact` | RevokeImpactOutput | Yes | Chỉ có khi revoke |

### OrderConfirmationStatusOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `orderId` | String | No | Order ID |
| `saleConfirmed` | Boolean | No | Sale đã xác nhận? |
| `saleConfirmedAt` | String | Yes | Thời gian xác nhận |
| `saleConfirmedBy` | ActorInfoOutput | Yes | Người xác nhận |
| `accountingConfirmed` | Boolean | No | Kế toán đã xác nhận? |
| `accountingConfirmedAt` | String | Yes | Thời gian xác nhận |
| `accountingConfirmedBy` | ActorInfoOutput | Yes | Người xác nhận |
| `isProtectedFromAutoLock` | Boolean | No | Có được bảo vệ? |
| `protectionReason` | String | Yes | Lý do bảo vệ |

### RevokeImpactOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `willBeLocked` | Boolean | No | Order sẽ bị lock? |
| `reason` | String | No | Giải thích |
| `statusChanged` | Boolean | Yes | Status có thay đổi? |
| `previousStatus` | String | Yes | Status trước |
| `newStatus` | String | Yes | Status mới |

### ActorInfoOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Workspace member ID |
| `name` | String | No | Tên |
| `email` | String | Yes | Email |
| `role` | String | Yes | Vai trò |

---

## Order Status Validation

### Valid Statuses for Confirmation

| Mutation | Valid Statuses |
|----------|---------------|
| `confirmPaymentBySale` | PROCESSING, PENDING_PAYMENT |
| `confirmPaymentByAccounting` | PROCESSING, PENDING_PAYMENT |
| `revokePaymentConfirmation` | PROCESSING, PENDING_PAYMENT |

### Status không hợp lệ

- `DRAFT` - Chưa publish
- `COMPLETED` - Đã hoàn thành
- `CANCELLED` - Đã hủy
- `LOCKED` - Đã bị khóa

---

## Error Handling

### Common Errors

| Error Code | Message | Description |
|------------|---------|-------------|
| `NOT_FOUND` | Order not found: xxx | Order không tồn tại |
| `CONFLICT` | Order xxx has already been confirmed by sale | Đã xác nhận rồi |
| `BAD_REQUEST` | Cannot perform operation on order in status COMPLETED | Status không hợp lệ |
| `BAD_REQUEST` | No payment evidence | Thiếu evidence (chưa PAID, chưa sale confirm) |
| `BAD_REQUEST` | Cannot revoke sale: Accounting has already confirmed | Phải revoke accounting trước |
| `UNAUTHENTICATED` | You must be authenticated | Chưa đăng nhập |

### Error Handling Code Example

```typescript
const handleConfirmPayment = async (orderId: string, note: string) => {
  try {
    const result = await confirmPaymentBySale({
      variables: {
        input: { orderId, note }
      }
    });

    if (result.data?.confirmPaymentBySale.success) {
      showSuccess('Xác nhận thanh toán thành công');
    }
  } catch (error) {
    const graphQLError = error.graphQLErrors?.[0];

    switch (graphQLError?.extensions?.code) {
      case 'NOT_FOUND':
        showError('Không tìm thấy đơn hàng');
        break;
      case 'CONFLICT':
        showError('Đơn hàng đã được xác nhận');
        break;
      case 'BAD_REQUEST':
        showError(graphQLError.message);
        break;
      default:
        showError('Có lỗi xảy ra');
    }
  }
};
```

---

## Best Practices

### 1. Kiểm tra status trước khi confirm

```graphql
# Check status first
query {
  getPaymentConfirmationStatus(orderId: "...") {
    saleConfirmed
    accountingConfirmed
  }
}

# Then confirm if not confirmed
mutation {
  confirmPaymentBySale(input: { orderId: "..." }) {
    success
  }
}
```

### 2. Sử dụng idempotencyKey cho các thao tác quan trọng

```graphql
mutation {
  confirmPaymentBySale(input: {
    orderId: "..."
    idempotencyKey: "confirm-sale-order123-user456-20260204"
  }) {
    success
  }
}
```

### 3. Luôn hiển thị impact khi revoke

```typescript
const handleRevoke = async () => {
  const result = await revokePaymentConfirmation({...});

  if (result.data?.revokePaymentConfirmation.impact?.willBeLocked) {
    // Show warning to user
    showWarning('⚠️ Đơn hàng sẽ bị khóa do đã quá hạn thanh toán!');
  }
};
```

### 4. Refresh status sau mỗi thao tác

```typescript
// After mutation, refetch status
await refetchPaymentConfirmationStatus({ orderId });
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-04 | Initial release |
| 1.0.1 | 2026-02-04 | Disabled idempotency temporarily for testing |
