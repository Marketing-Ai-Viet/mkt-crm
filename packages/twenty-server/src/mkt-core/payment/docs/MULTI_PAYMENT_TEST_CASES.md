# Multi-Payment Test Cases

**Ngày tạo:** 2026-01-31
**Phiên bản:** 1.0.0
**Module:** PaymentConfirmationResolver

---

## Mục lục

1. [Test Environment Setup](#1-test-environment-setup)
2. [confirmPayment Mutation](#2-confirmpayment-mutation)
3. [rejectPayment Mutation](#3-rejectpayment-mutation)
4. [refundPayment Mutation](#4-refundpayment-mutation)
5. [Integration Test Scenarios](#5-integration-test-scenarios)
6. [Edge Cases](#6-edge-cases)

---

## 1. Test Environment Setup

### 1.1 Prerequisite Data

```typescript
// Test workspace
const testWorkspace = {
  id: 'ws-test-001',
  name: 'Test Workspace',
};

// Test user (workspace member)
const testUser = {
  id: 'user-test-001',
  workspaceMemberId: 'wm-test-001',
  email: 'test@example.com',
};

// Test order
const testOrder = {
  id: 'order-test-001',
  orderCode: 'ORD-2026-001',
  totalAmount: 2000000, // 2,000,000 VND
  paidAmount: 0,
  remainingAmount: 2000000,
  paymentStatus: 'UNPAID',
};

// Test payments
const testPayments = {
  pending: {
    id: 'payment-pending-001',
    amount: 1000000,
    status: 'PENDING',
    mktOrderId: 'order-test-001',
  },
  confirmed: {
    id: 'payment-confirmed-001',
    amount: 500000,
    status: 'CONFIRMED',
    mktOrderId: 'order-test-001',
    refundedAmount: 0,
  },
  partiallyRefunded: {
    id: 'payment-partial-001',
    amount: 800000,
    status: 'PARTIALLY_REFUNDED',
    mktOrderId: 'order-test-001',
    refundedAmount: 300000,
  },
};
```

### 1.2 GraphQL Headers

```json
{
  "Authorization": "Bearer <valid-jwt-token>",
  "x-workspace-id": "ws-test-001"
}
```

---

## 2. confirmPayment Mutation

### 2.1 Happy Path Tests

#### TC-CONFIRM-001: Xác nhận payment PENDING thành công

**Precondition:**
- Payment tồn tại với status = PENDING
- User có quyền trong workspace

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "payment-pending-001"
    note: "Đã xác nhận qua sao kê ngân hàng"
  }) {
    success
    message
    payment {
      id
      status
    }
    order {
      orderId
      paidAmount
      remainingAmount
      paymentStatus
      paidPercent
    }
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "confirmPayment": {
      "success": true,
      "message": "Payment action completed successfully",
      "payment": {
        "id": "payment-pending-001",
        "status": "CONFIRMED"
      },
      "order": {
        "orderId": "order-test-001",
        "paidAmount": 1000000,
        "remainingAmount": 1000000,
        "paymentStatus": "PARTIAL_PAID",
        "paidPercent": 50
      }
    }
  }
}
```

**Postcondition:**
- Payment status = CONFIRMED
- Payment.confirmedAt = timestamp hiện tại
- Payment.confirmedById = user ID
- Order.paidAmount được cập nhật
- PaymentHistory được tạo với action = CONFIRMED

---

#### TC-CONFIRM-002: Xác nhận payment và trigger license creation

**Precondition:**
- Order có totalAmount = 1,000,000 VND
- Payment amount = 1,000,000 VND (đủ để fully paid)
- Payment status = PENDING

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "payment-full-001"
  }) {
    success
    payment { id status }
    order {
      paymentStatus
      paidPercent
    }
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "confirmPayment": {
      "success": true,
      "payment": {
        "id": "payment-full-001",
        "status": "CONFIRMED"
      },
      "order": {
        "paymentStatus": "FULLY_PAID",
        "paidPercent": 100
      }
    }
  }
}
```

**Postcondition:**
- Order.paymentStatus = FULLY_PAID
- Event PAYMENT_COMPLETED được emit
- License creation được trigger (nếu có listener)

---

#### TC-CONFIRM-003: Xác nhận payment không có note

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "payment-pending-001"
  }) {
    success
    payment { id status }
  }
}
```

**Expected:** Success (note là optional)

---

### 2.2 Error Tests

#### TC-CONFIRM-ERR-001: Payment không tồn tại

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "non-existent-id"
  }) {
    success
    message
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "confirmPayment": {
      "success": false,
      "message": "Payment not found: non-existent-id"
    }
  }
}
```

---

#### TC-CONFIRM-ERR-002: Payment đã được confirm

**Precondition:** Payment status = CONFIRMED

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "payment-confirmed-001"
  }) {
    success
    message
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "confirmPayment": {
      "success": false,
      "message": "Payment already CONFIRMED, cannot confirm"
    }
  }
}
```

---

#### TC-CONFIRM-ERR-003: Payment đã bị reject

**Precondition:** Payment status = REJECTED

**Expected Output:**
```json
{
  "data": {
    "confirmPayment": {
      "success": false,
      "message": "Payment already REJECTED, cannot confirm"
    }
  }
}
```

---

#### TC-CONFIRM-ERR-004: Payment đã refunded

**Precondition:** Payment status = REFUNDED

**Expected Output:**
```json
{
  "data": {
    "confirmPayment": {
      "success": false,
      "message": "Payment already REFUNDED, cannot confirm"
    }
  }
}
```

---

#### TC-CONFIRM-ERR-005: Không có workspace member ID

**Precondition:** Request không có valid workspace member context

**Expected Output:**
```json
{
  "data": {
    "confirmPayment": {
      "success": false,
      "message": "Workspace member ID is required"
    }
  }
}
```

---

#### TC-CONFIRM-ERR-006: Invalid payment ID format

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "invalid-uuid"
  }) {
    success
    message
  }
}
```

**Expected:** Validation error hoặc "Payment not found"

---

## 3. rejectPayment Mutation

### 3.1 Happy Path Tests

#### TC-REJECT-001: Từ chối payment PENDING thành công

**Precondition:**
- Payment tồn tại với status = PENDING
- User có quyền trong workspace

**Input:**
```graphql
mutation {
  rejectPayment(input: {
    paymentId: "payment-pending-001"
    reason: "Không tìm thấy giao dịch trong sao kê ngân hàng"
  }) {
    success
    message
    payment {
      id
      status
    }
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "rejectPayment": {
      "success": true,
      "message": "Payment action completed successfully",
      "payment": {
        "id": "payment-pending-001",
        "status": "REJECTED"
      }
    }
  }
}
```

**Postcondition:**
- Payment status = REJECTED
- Payment.rejectedAt = timestamp hiện tại
- Payment.rejectedById = user ID
- Payment.rejectionReason = reason từ input
- Order totals KHÔNG thay đổi (vì payment chưa confirmed)
- PaymentHistory được tạo với action = REJECTED
- Event PAYMENT_REJECTED được emit

---

### 3.2 Error Tests

#### TC-REJECT-ERR-001: Thiếu reason (required field)

**Input:**
```graphql
mutation {
  rejectPayment(input: {
    paymentId: "payment-pending-001"
    reason: ""
  }) {
    success
    message
  }
}
```

**Expected:** Validation error - reason is required

---

#### TC-REJECT-ERR-002: Payment không ở trạng thái PENDING

**Precondition:** Payment status = CONFIRMED

**Input:**
```graphql
mutation {
  rejectPayment(input: {
    paymentId: "payment-confirmed-001"
    reason: "Test rejection"
  }) {
    success
    message
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "rejectPayment": {
      "success": false,
      "message": "Payment already CONFIRMED, cannot reject"
    }
  }
}
```

---

#### TC-REJECT-ERR-003: Payment không tồn tại

**Input:**
```graphql
mutation {
  rejectPayment(input: {
    paymentId: "non-existent-id"
    reason: "Test"
  }) {
    success
    message
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "rejectPayment": {
      "success": false,
      "message": "Payment not found: non-existent-id"
    }
  }
}
```

---

#### TC-REJECT-ERR-004: Không có workspace member ID

**Expected Output:**
```json
{
  "data": {
    "rejectPayment": {
      "success": false,
      "message": "Workspace member ID is required"
    }
  }
}
```

---

## 4. refundPayment Mutation

### 4.1 Happy Path Tests

#### TC-REFUND-001: Hoàn tiền đầy đủ (full refund)

**Precondition:**
- Payment status = CONFIRMED
- Payment amount = 1,000,000 VND
- Payment refundedAmount = 0

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "payment-confirmed-001"
    reason: "Khách hàng yêu cầu hủy đơn"
  }) {
    success
    message
    payment {
      id
      status
      refundedAmount
    }
    order {
      paidAmount
      remainingAmount
      paymentStatus
    }
    refundedAmount
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "refundPayment": {
      "success": true,
      "message": "Payment refunded successfully",
      "payment": {
        "id": "payment-confirmed-001",
        "status": "REFUNDED",
        "refundedAmount": 1000000
      },
      "order": {
        "paidAmount": 0,
        "remainingAmount": 2000000,
        "paymentStatus": "UNPAID"
      },
      "refundedAmount": 1000000
    }
  }
}
```

**Postcondition:**
- Payment status = REFUNDED
- Payment.refundedAmount = payment.amount
- Order.paidAmount giảm
- PaymentHistory được tạo với action = REFUNDED
- Event PAYMENT_REFUNDED được emit với isFullRefund = true

---

#### TC-REFUND-002: Hoàn tiền một phần (partial refund)

**Precondition:**
- Payment status = CONFIRMED
- Payment amount = 1,000,000 VND
- Payment refundedAmount = 0

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "payment-confirmed-001"
    amount: 300000
    reason: "Hoàn tiền sản phẩm bị lỗi"
  }) {
    success
    payment {
      id
      status
      refundedAmount
    }
    refundedAmount
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "refundPayment": {
      "success": true,
      "payment": {
        "id": "payment-confirmed-001",
        "status": "PARTIALLY_REFUNDED",
        "refundedAmount": 300000
      },
      "refundedAmount": 300000
    }
  }
}
```

**Postcondition:**
- Payment status = PARTIALLY_REFUNDED
- Payment.refundedAmount = 300,000
- Available for next refund = 700,000

---

#### TC-REFUND-003: Hoàn tiền tiếp từ PARTIALLY_REFUNDED

**Precondition:**
- Payment status = PARTIALLY_REFUNDED
- Payment amount = 800,000 VND
- Payment refundedAmount = 300,000 VND
- Available = 500,000 VND

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "payment-partial-001"
    amount: 200000
    reason: "Hoàn tiền thêm"
  }) {
    success
    payment {
      status
      refundedAmount
    }
    refundedAmount
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "refundPayment": {
      "success": true,
      "payment": {
        "status": "PARTIALLY_REFUNDED",
        "refundedAmount": 500000
      },
      "refundedAmount": 200000
    }
  }
}
```

---

#### TC-REFUND-004: Hoàn hết số tiền còn lại (amount = null)

**Precondition:**
- Payment status = PARTIALLY_REFUNDED
- Payment amount = 800,000 VND
- Payment refundedAmount = 500,000 VND
- Available = 300,000 VND

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "payment-partial-001"
    reason: "Hoàn hết số còn lại"
  }) {
    success
    payment {
      status
      refundedAmount
    }
    refundedAmount
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "refundPayment": {
      "success": true,
      "payment": {
        "status": "REFUNDED",
        "refundedAmount": 800000
      },
      "refundedAmount": 300000
    }
  }
}
```

---

### 4.2 Error Tests

#### TC-REFUND-ERR-001: Payment chưa được confirm

**Precondition:** Payment status = PENDING

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "payment-pending-001"
    reason: "Test refund"
  }) {
    success
    message
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "refundPayment": {
      "success": false,
      "message": "Can only refund CONFIRMED payments, current status: PENDING"
    }
  }
}
```

---

#### TC-REFUND-ERR-002: Số tiền refund vượt quá available

**Precondition:**
- Payment amount = 1,000,000 VND
- Payment refundedAmount = 800,000 VND
- Available = 200,000 VND

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "payment-partial-001"
    amount: 500000
    reason: "Test"
  }) {
    success
    message
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "refundPayment": {
      "success": false,
      "message": "Refund amount (500000) exceeds available amount (200000)"
    }
  }
}
```

---

#### TC-REFUND-ERR-003: Payment đã refund hết

**Precondition:** Payment status = REFUNDED (refundedAmount = amount)

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "payment-refunded-001"
    amount: 100000
    reason: "Test"
  }) {
    success
    message
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "refundPayment": {
      "success": false,
      "message": "Can only refund CONFIRMED payments, current status: REFUNDED"
    }
  }
}
```

---

#### TC-REFUND-ERR-004: Refund amount = 0

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "payment-confirmed-001"
    amount: 0
    reason: "Test"
  }) {
    success
    message
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "refundPayment": {
      "success": false,
      "message": "Refund amount must be greater than 0"
    }
  }
}
```

---

#### TC-REFUND-ERR-005: Refund amount âm

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "payment-confirmed-001"
    amount: -100000
    reason: "Test"
  }) {
    success
    message
  }
}
```

**Expected:** Validation error từ DTO (@Min(0))

---

#### TC-REFUND-ERR-006: Thiếu reason (required field)

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "payment-confirmed-001"
    amount: 100000
    reason: ""
  }) {
    success
    message
  }
}
```

**Expected:** Validation error - reason is required

---

#### TC-REFUND-ERR-007: Payment không tồn tại

**Expected Output:**
```json
{
  "data": {
    "refundPayment": {
      "success": false,
      "message": "Payment not found: non-existent-id"
    }
  }
}
```

---

## 5. Integration Test Scenarios

### 5.1 Full Payment Lifecycle

#### TC-INT-001: Create → Confirm → Full Refund

```
Step 1: Create payment
  - Order totalAmount = 1,000,000
  - Payment amount = 1,000,000
  - Payment status = PENDING
  - Order paymentStatus = UNPAID

Step 2: Confirm payment
  - Payment status → CONFIRMED
  - Order paidAmount = 1,000,000
  - Order paymentStatus = FULLY_PAID
  - License creation triggered ✓

Step 3: Full refund
  - Payment status → REFUNDED
  - Payment refundedAmount = 1,000,000
  - Order paidAmount = 0
  - Order paymentStatus = UNPAID
  - License revocation triggered ✓
```

---

#### TC-INT-002: Multiple Partial Payments

```
Order: totalAmount = 2,000,000

Step 1: Create Payment 1 (1,000,000) → PENDING
Step 2: Confirm Payment 1
  - Order paidAmount = 1,000,000
  - Order paymentStatus = PARTIAL_PAID

Step 3: Create Payment 2 (500,000) → PENDING
Step 4: Confirm Payment 2
  - Order paidAmount = 1,500,000
  - Order paymentStatus = PARTIAL_PAID

Step 5: Create Payment 3 (500,000) → PENDING
Step 6: Confirm Payment 3
  - Order paidAmount = 2,000,000
  - Order paymentStatus = FULLY_PAID
  - License creation triggered ✓
```

---

#### TC-INT-003: Partial Refund không ảnh hưởng license

```
Precondition:
  - Order totalAmount = 2,000,000
  - Payment 1: 2,000,000 CONFIRMED
  - Order paymentStatus = FULLY_PAID
  - Licenses đã được tạo

Step 1: Partial refund 500,000
  - Payment status → PARTIALLY_REFUNDED
  - Payment refundedAmount = 500,000
  - Order paidAmount = 1,500,000
  - Order paymentStatus = PARTIAL_PAID
  - Licenses vẫn ACTIVE (vì partial refund)
```

---

#### TC-INT-004: Reject không ảnh hưởng order totals

```
Precondition:
  - Order totalAmount = 1,000,000
  - Payment 1: 500,000 CONFIRMED → paidAmount = 500,000
  - Payment 2: 500,000 PENDING

Step 1: Reject Payment 2
  - Payment 2 status → REJECTED
  - Order paidAmount vẫn = 500,000 (không đổi)
  - Order paymentStatus vẫn = PARTIAL_PAID
```

---

### 5.2 Concurrent Operations

#### TC-INT-005: Confirm cùng lúc 2 payments

```
Setup:
  - Payment 1: PENDING
  - Payment 2: PENDING

Concurrent:
  - Thread 1: Confirm Payment 1
  - Thread 2: Confirm Payment 2

Expected:
  - Cả 2 payments đều CONFIRMED
  - Order paidAmount = sum of both payments
  - PaymentHistory có 2 records
```

---

## 6. Edge Cases

### 6.1 Boundary Value Tests

#### TC-EDGE-001: Refund exact remaining amount

**Precondition:**
- Payment amount = 1,000,000
- Payment refundedAmount = 999,999
- Available = 1

**Input:** refund amount = 1

**Expected:**
- Success
- Payment status = REFUNDED
- refundedAmount = 1,000,000

---

#### TC-EDGE-002: Very large amount

**Input:** Payment amount = 999,999,999,999 (gần max int)

**Expected:** Xử lý đúng với MoneyUtils

---

#### TC-EDGE-003: Decimal amounts

**Note:** VND không có decimal, nhưng nếu có:

**Input:** refund amount = 100000.50

**Expected:** Rounded hoặc validation error

---

### 6.2 Special Characters

#### TC-EDGE-004: Unicode trong reason

**Input:**
```graphql
mutation {
  rejectPayment(input: {
    paymentId: "payment-001"
    reason: "Lý do: 中文 日本語 한국어 🎉"
  }) {
    success
  }
}
```

**Expected:** Success, reason được lưu đúng

---

#### TC-EDGE-005: Very long reason

**Input:** reason với 10,000 ký tự

**Expected:** Success hoặc validation error nếu có limit

---

### 6.3 Database Constraints

#### TC-EDGE-006: Soft deleted payment

**Precondition:** Payment có deletedAt != null

**Expected:** "Payment not found" (vì filter deletedAt = null)

---

#### TC-EDGE-007: Order bị deleted sau khi có payment

**Precondition:**
- Payment CONFIRMED
- Order bị soft delete

**Input:** Refund payment

**Expected:** Xử lý gracefully (order = null trong response)

---

## Appendix: Test Data SQL

```sql
-- Create test order
INSERT INTO "workspace_test"."mktOrder" (
  id, "orderCode", "totalAmount", "paidAmount", "remainingAmount", "paymentStatus"
) VALUES (
  'order-test-001', 'ORD-2026-001', 2000000, 0, 2000000, 'UNPAID'
);

-- Create test payments
INSERT INTO "workspace_test"."mktPayment" (
  id, name, amount, status, "mktOrderId", "refundedAmount"
) VALUES
  ('payment-pending-001', 'Payment 1', 1000000, 'PENDING', 'order-test-001', 0),
  ('payment-confirmed-001', 'Payment 2', 500000, 'CONFIRMED', 'order-test-001', 0),
  ('payment-partial-001', 'Payment 3', 800000, 'PARTIALLY_REFUNDED', 'order-test-001', 300000);
```

---

## Related Documents

- [MULTI_PAYMENT_FLOW.md](./MULTI_PAYMENT_FLOW.md) - Flow documentation
- [MULTI_PAYMENT_IMPLEMENTATION_GUIDE.md](./MULTI_PAYMENT_IMPLEMENTATION_GUIDE.md) - Implementation guide
