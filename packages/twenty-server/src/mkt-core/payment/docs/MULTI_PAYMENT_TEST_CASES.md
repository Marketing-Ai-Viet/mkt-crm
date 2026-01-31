# Multi-Payment Test Cases

**Ngày tạo:** 2026-01-31
**Phiên bản:** 1.1.0
**Module:** PaymentConfirmationResolver
**Database:** PostgreSQL (workspace_1wgvd1injqtife6y4rvfbu3h5)

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

### 1.1 Prerequisite Data (Real Database Values)

```typescript
// Workspace
const workspace = {
  id: '20202020-1c25-4d02-bf25-6aeccf7ea419',
  displayName: 'MKT CRM',
  subdomain: 'mkt-crm',
};

// Workspace Members
const workspaceMembers = {
  timApple: {
    id: '20202020-0687-4c41-b707-ed1bfca972a7',
    userId: '20202020-9e3b-46d4-a556-88b9ddc2b034',
    email: 'tim@apple.dev',
    name: 'Tim Apple',
  },
  jonyIve: {
    id: '20202020-77d5-4cb6-b60a-f4a835a85d61',
    userId: '20202020-3957-4908-9c36-2929a23f8357',
    email: 'jony.ive@apple.dev',
    name: 'Jony Ive',
  },
  janeAusten: {
    id: '81caea88-92a5-4e88-8a9a-614ec785d244',
    userId: '20202020-e6b5-4680-8a32-b8209737156b',
    email: 'jane.austen@apple.dev',
    name: 'Jane Austen',
  },
  philSchiler: {
    id: '20202020-1553-45c6-a028-5a9064cce07f',
    userId: '20202020-7169-42cf-bc47-1cfef15264b8',
    email: 'phil.schiler@apple.dev',
    name: 'Phil Schiler',
  },
};

// Orders với paymentStatus = PENDING (chưa thanh toán)
const pendingOrders = {
  uidOrder: {
    id: '0200e865-6bb2-4645-904c-1ee9fc021c1e',
    orderCode: 'MKT-UID-2024-003',
    totalAmount: 6600000,
    paidAmount: 0,
    remainingAmount: 6600000,
    paymentStatus: 'PENDING',
  },
  twitterOrder: {
    id: '28e054f6-4ce2-48aa-93cc-89519a3cf267',
    orderCode: 'MKT-TWITTER-2024-009',
    totalAmount: 3300000,
    paidAmount: 0,
    remainingAmount: 3300000,
    paymentStatus: 'PENDING',
  },
};

// Orders với paymentStatus = PAID (đã thanh toán đủ)
const paidOrders = {
  viralOrder: {
    id: '09f33908-d459-44c3-999e-97f42faf6d30',
    orderCode: 'MKT-VIRAL-2024-002',
    totalAmount: 17100000,
    paidAmount: 17100000,
    remainingAmount: 0,
    paymentStatus: 'PAID',
  },
  instaOrder: {
    id: 'd4a05376-ec12-4f11-92d9-cd5722d70c0b',
    orderCode: 'MKT-INSTA-2024-004',
    totalAmount: 16500000,
    paidAmount: 16500000,
    remainingAmount: 0,
    paymentStatus: 'PAID',
  },
};

// Payments theo status
const payments = {
  // PENDING payments
  pending: {
    pay002: {
      id: 'f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c',
      name: 'PAY-2024-002',
      amount: 1200000,
      status: 'PENDING',
      providerType: 'VNPAY',
      refundedAmount: 0,
    },
    pay010: {
      id: '5e6f7a8b-9c0d-4eb1-c2d3-b4c5d6e7f8a9',
      name: 'PAY-2024-010',
      amount: 1500000,
      status: 'PENDING',
      providerType: 'CREDIT_CARD',
      refundedAmount: 0,
    },
  },
  // CONFIRMED payments
  confirmed: {
    pay001: {
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      name: 'PAY-2024-001',
      amount: 500000,
      status: 'CONFIRMED',
      providerType: 'SEPAY',
      refundedAmount: 0,
      confirmedAt: '2024-01-15T10:35:00Z',
    },
    pay007: {
      id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6f',
      name: 'PAY-2024-007',
      amount: 450000,
      status: 'CONFIRMED',
      providerType: 'CASH',
      refundedAmount: 0,
      confirmedAt: '2024-01-22T11:00:00Z',
    },
  },
  // REJECTED payment
  rejected: {
    pay004: {
      id: 'd5e4f3a2-b1c0-4d9e-8f7a-6b5c4d3e2f1a',
      name: 'PAY-2024-004',
      amount: 2500000,
      status: 'REJECTED',
      providerType: 'BANK_TRANSFER',
      refundedAmount: 0,
      rejectedAt: '2024-01-18T09:45:00Z',
      rejectionReason: 'Số tiền không khớp với đơn hàng',
    },
  },
  // REFUNDED payment
  refunded: {
    pay003: {
      id: 'c6b5a4f3-e2d1-4c0b-a9b8-7c6d5e4f3a2b',
      name: 'PAY-2024-003',
      amount: 350000,
      status: 'REFUNDED',
      providerType: 'MOMO',
      refundedAmount: 350000,
      confirmedAt: '2024-01-10T14:25:00Z',
    },
  },
  // PARTIALLY_REFUNDED payment
  partiallyRefunded: {
    pay005: {
      id: 'e8f7a6b5-c4d3-4e2f-b1a0-f9e8d7c6b5a4',
      name: 'PAY-2024-005',
      amount: 800000,
      status: 'PARTIALLY_REFUNDED',
      providerType: 'ZALOPAY',
      refundedAmount: 200000,
      availableForRefund: 600000, // 800000 - 200000
      confirmedAt: '2024-01-08T16:05:00Z',
    },
  },
  // Other statuses
  processing: {
    pay006: {
      id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5e',
      name: 'PAY-2024-006',
      amount: 150000,
      status: 'PROCESSING',
      providerType: 'SEPAY',
    },
  },
  failed: {
    pay008: {
      id: '3c4d5e6f-7a8b-4c9d-a0b1-f2a3b4c5d6e7',
      name: 'PAY-2024-008',
      amount: 3000000,
      status: 'FAILED',
      providerType: 'VNPAY',
    },
  },
  cancelled: {
    pay009: {
      id: '4d5e6f7a-8b9c-4da0-b1c2-a3b4c5d6e7f8',
      name: 'PAY-2024-009',
      amount: 680000,
      status: 'CANCELLED',
      providerType: 'MOMO',
    },
  },
};

// Payment History samples
const paymentHistories = [
  {
    id: '7e78c48b-b437-469d-a726-5f2b6679fef1',
    name: 'Payment Created - PAY-2024-001',
    paymentType: 'PAYMENT',
    amount: 500000,
    note: 'Tạo thanh toán mới qua SEPay',
    mktPaymentId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  },
  {
    id: '26cd1db7-0a36-4951-b1f5-2d41ed0b5b68',
    name: 'Payment Confirmed - PAY-2024-001',
    paymentType: 'PAYMENT',
    amount: 500000,
    note: 'Thanh toán đã được xác nhận thành công',
    mktPaymentId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  },
  {
    id: 'd1a2b3c4-5678-4901-23de-f12345678901',
    name: 'Partial Refund - PAY-2024-005',
    paymentType: 'REFUND',
    amount: 200000,
    note: 'Hoàn tiền một phần do sản phẩm hết hàng',
    mktPaymentId: 'e8f7a6b5-c4d3-4e2f-b1a0-f9e8d7c6b5a4',
  },
];
```

### 1.2 GraphQL Headers

```json
{
  "Authorization": "Bearer <valid-jwt-token>",
  "x-workspace-id": "20202020-1c25-4d02-bf25-6aeccf7ea419"
}
```

---

## 2. confirmPayment Mutation

### 2.1 Happy Path Tests

#### TC-CONFIRM-001: Xác nhận payment PENDING thành công

**Precondition:**
- Payment `f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c` (PAY-2024-002) với status = PENDING, amount = 1,200,000
- User `tim@apple.dev` có quyền trong workspace

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c"
    note: "Đã xác nhận qua sao kê ngân hàng VNPAY"
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
        "id": "f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c",
        "status": "CONFIRMED"
      },
      "order": null
    }
  }
}
```

**Postcondition:**
- Payment status = CONFIRMED
- Payment.confirmedAt = timestamp hiện tại
- Payment.confirmedById = `20202020-0687-4c41-b707-ed1bfca972a7` (Tim Apple)
- PaymentHistory được tạo với action = CONFIRMED

---

#### TC-CONFIRM-002: Xác nhận payment với order và trigger license creation

**Precondition:**
- Tạo payment mới cho order `0200e865-6bb2-4645-904c-1ee9fc021c1e` (MKT-UID-2024-003)
- Order có totalAmount = 6,600,000 VND, paidAmount = 0
- Payment amount = 6,600,000 VND (đủ để fully paid)
- Payment status = PENDING

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "<new-payment-id>"
  }) {
    success
    payment { id status }
    order {
      orderId
      orderCode
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
        "id": "<new-payment-id>",
        "status": "CONFIRMED"
      },
      "order": {
        "orderId": "0200e865-6bb2-4645-904c-1ee9fc021c1e",
        "orderCode": "MKT-UID-2024-003",
        "paymentStatus": "PAID",
        "paidPercent": 100
      }
    }
  }
}
```

**Postcondition:**
- Order.paymentStatus = PAID
- Event PAYMENT_COMPLETED được emit
- License creation được trigger (nếu có listener)

---

#### TC-CONFIRM-003: Xác nhận payment không có note

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "5e6f7a8b-9c0d-4eb1-c2d3-b4c5d6e7f8a9"
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
    paymentId: "00000000-0000-0000-0000-000000000000"
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
      "message": "Payment not found: 00000000-0000-0000-0000-000000000000"
    }
  }
}
```

---

#### TC-CONFIRM-ERR-002: Payment đã được confirm

**Precondition:** Payment `a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d` (PAY-2024-001) có status = CONFIRMED

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
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

**Precondition:** Payment `d5e4f3a2-b1c0-4d9e-8f7a-6b5c4d3e2f1a` (PAY-2024-004) có status = REJECTED

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "d5e4f3a2-b1c0-4d9e-8f7a-6b5c4d3e2f1a"
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
      "message": "Payment already REJECTED, cannot confirm"
    }
  }
}
```

---

#### TC-CONFIRM-ERR-004: Payment đã refunded

**Precondition:** Payment `c6b5a4f3-e2d1-4c0b-a9b8-7c6d5e4f3a2b` (PAY-2024-003) có status = REFUNDED

**Input:**
```graphql
mutation {
  confirmPayment(input: {
    paymentId: "c6b5a4f3-e2d1-4c0b-a9b8-7c6d5e4f3a2b"
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
    paymentId: "invalid-uuid-format"
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
- Payment `f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c` (PAY-2024-002) với status = PENDING
- User `jony.ive@apple.dev` có quyền trong workspace

**Input:**
```graphql
mutation {
  rejectPayment(input: {
    paymentId: "f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c"
    reason: "Không tìm thấy giao dịch trong sao kê VNPAY"
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
        "id": "f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c",
        "status": "REJECTED"
      }
    }
  }
}
```

**Postcondition:**
- Payment status = REJECTED
- Payment.rejectedAt = timestamp hiện tại
- Payment.rejectedById = `20202020-77d5-4cb6-b60a-f4a835a85d61` (Jony Ive)
- Payment.rejectionReason = "Không tìm thấy giao dịch trong sao kê VNPAY"
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
    paymentId: "5e6f7a8b-9c0d-4eb1-c2d3-b4c5d6e7f8a9"
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

**Precondition:** Payment `a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d` (PAY-2024-001) có status = CONFIRMED

**Input:**
```graphql
mutation {
  rejectPayment(input: {
    paymentId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
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
    paymentId: "00000000-0000-0000-0000-000000000000"
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
      "message": "Payment not found: 00000000-0000-0000-0000-000000000000"
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
- Payment `a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d` (PAY-2024-001) có status = CONFIRMED
- Payment amount = 500,000 VND
- Payment refundedAmount = 0

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
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
        "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        "status": "REFUNDED",
        "refundedAmount": 500000
      },
      "order": null,
      "refundedAmount": 500000
    }
  }
}
```

**Postcondition:**
- Payment status = REFUNDED
- Payment.refundedAmount = 500,000 (= payment.amount)
- PaymentHistory được tạo với action = REFUNDED
- Event PAYMENT_REFUNDED được emit với isFullRefund = true

---

#### TC-REFUND-002: Hoàn tiền một phần (partial refund)

**Precondition:**
- Payment `2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6f` (PAY-2024-007) có status = CONFIRMED
- Payment amount = 450,000 VND
- Payment refundedAmount = 0

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6f"
    amount: 150000
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
        "id": "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6f",
        "status": "PARTIALLY_REFUNDED",
        "refundedAmount": 150000
      },
      "refundedAmount": 150000
    }
  }
}
```

**Postcondition:**
- Payment status = PARTIALLY_REFUNDED
- Payment.refundedAmount = 150,000
- Available for next refund = 300,000 (450,000 - 150,000)

---

#### TC-REFUND-003: Hoàn tiền tiếp từ PARTIALLY_REFUNDED

**Precondition:**
- Payment `e8f7a6b5-c4d3-4e2f-b1a0-f9e8d7c6b5a4` (PAY-2024-005) có status = PARTIALLY_REFUNDED
- Payment amount = 800,000 VND
- Payment refundedAmount = 200,000 VND
- Available = 600,000 VND

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "e8f7a6b5-c4d3-4e2f-b1a0-f9e8d7c6b5a4"
    amount: 300000
    reason: "Hoàn tiền thêm theo yêu cầu"
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
      "refundedAmount": 300000
    }
  }
}
```

---

#### TC-REFUND-004: Hoàn hết số tiền còn lại (amount = null)

**Precondition:**
- Payment `e8f7a6b5-c4d3-4e2f-b1a0-f9e8d7c6b5a4` (PAY-2024-005) sau TC-REFUND-003
- Payment amount = 800,000 VND
- Payment refundedAmount = 500,000 VND (after TC-REFUND-003)
- Available = 300,000 VND

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "e8f7a6b5-c4d3-4e2f-b1a0-f9e8d7c6b5a4"
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

**Precondition:** Payment `f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c` (PAY-2024-002) có status = PENDING

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c"
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
- Payment `e8f7a6b5-c4d3-4e2f-b1a0-f9e8d7c6b5a4` (PAY-2024-005)
- Payment amount = 800,000 VND
- Payment refundedAmount = 200,000 VND
- Available = 600,000 VND

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "e8f7a6b5-c4d3-4e2f-b1a0-f9e8d7c6b5a4"
    amount: 700000
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
      "message": "Refund amount (700000) exceeds available amount (600000)"
    }
  }
}
```

---

#### TC-REFUND-ERR-003: Payment đã refund hết

**Precondition:** Payment `c6b5a4f3-e2d1-4c0b-a9b8-7c6d5e4f3a2b` (PAY-2024-003) có status = REFUNDED

**Input:**
```graphql
mutation {
  refundPayment(input: {
    paymentId: "c6b5a4f3-e2d1-4c0b-a9b8-7c6d5e4f3a2b"
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
    paymentId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
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
    paymentId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
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
    paymentId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
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
      "message": "Payment not found: 00000000-0000-0000-0000-000000000000"
    }
  }
}
```

---

## 5. Integration Test Scenarios

### 5.1 Full Payment Lifecycle

#### TC-INT-001: Create → Confirm → Full Refund

```
Sử dụng Order: MKT-TWITTER-2024-009
  - ID: 28e054f6-4ce2-48aa-93cc-89519a3cf267
  - totalAmount: 3,300,000 VND
  - paymentStatus: PENDING

Step 1: Create payment
  - Tạo payment mới amount = 3,300,000
  - Payment status = PENDING
  - Order paymentStatus vẫn = PENDING

Step 2: Confirm payment
  - Payment status → CONFIRMED
  - Order paidAmount = 3,300,000
  - Order paymentStatus = PAID
  - License creation triggered ✓

Step 3: Full refund
  - Payment status → REFUNDED
  - Payment refundedAmount = 3,300,000
  - Order paidAmount = 0
  - Order paymentStatus = PENDING
  - License revocation triggered ✓
```

---

#### TC-INT-002: Multiple Partial Payments

```
Sử dụng Order: MKT-UID-2024-003
  - ID: 0200e865-6bb2-4645-904c-1ee9fc021c1e
  - totalAmount: 6,600,000 VND

Step 1: Create Payment 1 (3,000,000) → PENDING
Step 2: Confirm Payment 1
  - Order paidAmount = 3,000,000
  - Order paymentStatus = PARTIAL_PAID

Step 3: Create Payment 2 (2,000,000) → PENDING
Step 4: Confirm Payment 2
  - Order paidAmount = 5,000,000
  - Order paymentStatus = PARTIAL_PAID

Step 5: Create Payment 3 (1,600,000) → PENDING
Step 6: Confirm Payment 3
  - Order paidAmount = 6,600,000
  - Order paymentStatus = PAID
  - License creation triggered ✓
```

---

#### TC-INT-003: Partial Refund không ảnh hưởng license

```
Precondition (sau TC-INT-002):
  - Order: MKT-UID-2024-003
  - totalAmount: 6,600,000
  - paidAmount: 6,600,000
  - paymentStatus: PAID
  - Licenses đã được tạo

Step 1: Partial refund 1,000,000 từ Payment 1
  - Payment 1 status → PARTIALLY_REFUNDED
  - Payment 1 refundedAmount = 1,000,000
  - Order paidAmount = 5,600,000
  - Order paymentStatus = PARTIAL_PAID
  - Licenses vẫn ACTIVE (vì partial refund không đủ để revoke)
```

---

#### TC-INT-004: Reject không ảnh hưởng order totals

```
Sử dụng Order: MKT-UID-2024-003
  - totalAmount: 6,600,000

Precondition:
  - Payment 1: 3,300,000 CONFIRMED → paidAmount = 3,300,000
  - Payment 2: 3,300,000 PENDING

Step 1: Reject Payment 2
  - Payment 2 status → REJECTED
  - Order paidAmount vẫn = 3,300,000 (không đổi)
  - Order paymentStatus vẫn = PARTIAL_PAID
```

---

### 5.2 Concurrent Operations

#### TC-INT-005: Confirm cùng lúc 2 payments

```
Setup:
  - Payment 1: 5e6f7a8b-9c0d-4eb1-c2d3-b4c5d6e7f8a9 (PENDING, 1,500,000)
  - Payment 2: f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c (PENDING, 1,200,000)
  - Cả 2 thuộc cùng 1 order

Concurrent:
  - Thread 1: Confirm Payment 1
  - Thread 2: Confirm Payment 2

Expected:
  - Cả 2 payments đều CONFIRMED
  - Order paidAmount = sum of both payments (2,700,000)
  - PaymentHistory có 2 records
```

---

## 6. Edge Cases

### 6.1 Boundary Value Tests

#### TC-EDGE-001: Refund exact remaining amount

**Precondition:**
- Payment `e8f7a6b5-c4d3-4e2f-b1a0-f9e8d7c6b5a4` (PAY-2024-005)
- Payment amount = 800,000
- Payment refundedAmount = 799,999
- Available = 1

**Input:** refund amount = 1

**Expected:**
- Success
- Payment status = REFUNDED
- refundedAmount = 800,000

---

#### TC-EDGE-002: Very large amount

**Input:** Payment amount = 999,999,999 VND (gần max safe integer)

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
    paymentId: "f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c"
    reason: "Lý do từ chối: Không tìm thấy giao dịch 中文 日本語"
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
-- Workspace info
-- ID: 20202020-1c25-4d02-bf25-6aeccf7ea419
-- Schema: workspace_1wgvd1injqtife6y4rvfbu3h5

-- View existing payments
SELECT id, name, amount, status, "refundedAmount", "providerType"
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPayment"
WHERE "deletedAt" IS NULL
ORDER BY "createdAt" DESC;

-- View existing orders
SELECT id, "orderCode", "totalAmount", "paidAmount", "remainingAmount", "paymentStatus"
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktOrder"
WHERE "deletedAt" IS NULL
ORDER BY "createdAt" DESC;

-- View payment history
SELECT id, name, "paymentType", amount, note, "mktPaymentId"
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktPaymentHistory"
WHERE "deletedAt" IS NULL
ORDER BY "createdAt" DESC;

-- Create test payment for order MKT-UID-2024-003
INSERT INTO workspace_1wgvd1injqtife6y4rvfbu3h5."mktPayment" (
  id, name, amount, status, "providerType", "mktOrderId", "refundedAmount"
) VALUES (
  uuid_generate_v4(),
  'TEST-PAY-001',
  6600000,
  'PENDING',
  'BANK_TRANSFER',
  '0200e865-6bb2-4645-904c-1ee9fc021c1e',
  0
);
```

---

## Related Documents

- [MULTI_PAYMENT_FLOW.md](./MULTI_PAYMENT_FLOW.md) - Flow documentation
- [MULTI_PAYMENT_IMPLEMENTATION_GUIDE.md](./MULTI_PAYMENT_IMPLEMENTATION_GUIDE.md) - Implementation guide
