# Multi-Payment Flow Documentation

**Ngày tạo:** 2026-01-31
**Phiên bản:** 1.0.0

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Payment Status Flow](#2-payment-status-flow)
3. [Confirmation Flow](#3-confirmation-flow)
4. [Rejection Flow](#4-rejection-flow)
5. [Refund Flow](#5-refund-flow)
6. [Order Payment Calculation](#6-order-payment-calculation)
7. [Event System](#7-event-system)
8. [GraphQL API](#8-graphql-api)
9. [Sequence Diagrams](#9-sequence-diagrams)

---

## 1. Tổng quan

### 1.1 Mục đích

Multi-Payment cho phép:
- Một đơn hàng có thể có nhiều thanh toán (partial payments)
- Xác nhận/từ chối thanh toán thủ công
- Hoàn tiền đầy đủ hoặc một phần
- Theo dõi lịch sử thay đổi trạng thái

### 1.2 Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                        GraphQL Layer                             │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │ PaymentMutation     │  │ PaymentConfirmationResolver     │   │
│  │ Resolver            │  │ - confirmPayment                │   │
│  │ - createPayment     │  │ - rejectPayment                 │   │
│  │ - updatePayment     │  │ - refundPayment                 │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                             │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐  │
│  │ PaymentConfirm   │ │ PaymentRefund    │ │ PaymentHistory  │  │
│  │ ationService     │ │ Service          │ │ Service         │  │
│  │                  │ │                  │ │                 │  │
│  │ - confirmPayment │ │ - refundPayment  │ │ - record        │  │
│  │ - rejectPayment  │ │                  │ │ - getByPayment  │  │
│  └──────────────────┘ └──────────────────┘ └─────────────────┘  │
│                                    │                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              OrderPaymentCalculationService              │    │
│  │              - calculatePaymentSummary                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Repository Layer                            │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐  │
│  │ MktPayment       │ │ MktPaymentHistory│ │ MktOrder        │  │
│  │ Repository       │ │ Repository       │ │ Repository      │  │
│  └──────────────────┘ └──────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Event System                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    EventEmitter2                         │    │
│  │  PAYMENT_CONFIRMED │ PAYMENT_REJECTED │ PAYMENT_REFUNDED │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              PaymentNotificationListener                 │    │
│  │  - handlePaymentConfirmed                                │    │
│  │  - handlePaymentRejected                                 │    │
│  │  - handlePaymentRefunded                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Payment Status Flow

### 2.1 Trạng thái Payment

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT STATUS FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                         ┌─────────┐                              │
│                         │ PENDING │                              │
│                         └────┬────┘                              │
│                              │                                   │
│              ┌───────────────┼───────────────┐                   │
│              │               │               │                   │
│              ▼               ▼               ▼                   │
│       ┌───────────┐   ┌───────────┐   ┌───────────┐             │
│       │ CONFIRMED │   │ REJECTED  │   │  FAILED   │             │
│       └─────┬─────┘   └───────────┘   └───────────┘             │
│             │                                                    │
│     ┌───────┴───────┐                                           │
│     │               │                                           │
│     ▼               ▼                                           │
│ ┌─────────────┐ ┌──────────────────┐                            │
│ │  REFUNDED   │ │PARTIALLY_REFUNDED│                            │
│ └─────────────┘ └────────┬─────────┘                            │
│                          │                                       │
│                          ▼                                       │
│                    ┌───────────┐                                 │
│                    │ REFUNDED  │ (khi refund hết)                │
│                    └───────────┘                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Mô tả trạng thái

| Status | Mô tả | Cho phép hành động |
|--------|-------|-------------------|
| `PENDING` | Đang chờ xác nhận | Confirm, Reject |
| `CONFIRMED` | Đã xác nhận, tiền đã nhận | Refund (full/partial) |
| `REJECTED` | Bị từ chối | Không |
| `FAILED` | Thanh toán thất bại (lỗi hệ thống) | Không |
| `REFUNDED` | Đã hoàn tiền đầy đủ | Không |
| `PARTIALLY_REFUNDED` | Đã hoàn tiền một phần | Refund (còn lại) |
| `CANCELLED` | Đã hủy | Không |

---

## 3. Confirmation Flow

### 3.1 Điều kiện xác nhận

- Payment phải ở trạng thái `PENDING`
- User phải có quyền xác nhận (WorkspaceMember)

### 3.2 Quy trình xác nhận

```
┌──────────────────────────────────────────────────────────────────┐
│                    CONFIRMATION FLOW                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. User gọi confirmPayment mutation                              │
│     │                                                             │
│     ▼                                                             │
│  2. Validate payment status = PENDING                             │
│     │                                                             │
│     ▼                                                             │
│  3. Update payment:                                               │
│     - status = CONFIRMED                                          │
│     - confirmedAt = now()                                         │
│     - confirmedById = userId                                      │
│     │                                                             │
│     ▼                                                             │
│  4. Record payment history                                        │
│     │                                                             │
│     ▼                                                             │
│  5. Recalculate order totals:                                     │
│     - paidAmount = sum(confirmed payments - refunded)             │
│     - remainingAmount = totalAmount - paidAmount                  │
│     - paymentStatus = UNPAID | PARTIAL_PAID | FULLY_PAID         │
│     │                                                             │
│     ▼                                                             │
│  6. Check license creation eligibility:                           │
│     - If paymentStatus = FULLY_PAID or OVERPAID                  │
│     - Emit PAYMENT_COMPLETED event                                │
│     │                                                             │
│     ▼                                                             │
│  7. Return result with order summary                              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.3 Code Flow

```typescript
// PaymentConfirmationService.confirmPayment()

async confirmPayment(input, confirmedById, workspaceId) {
  // 1. Get and validate
  const payment = await this.mktPaymentRepository.findByIdWithRelations(paymentId);

  if (payment.status !== 'PENDING') {
    return { success: false, error: 'Cannot confirm' };
  }

  // 2. Update payment
  await this.mktPaymentRepository.updatePayment(paymentId, {
    status: 'CONFIRMED',
    confirmedAt: now,
    confirmedById,
  });

  // 3. Record history
  await this.recordHistory({ action: 'CONFIRMED', ... });

  // 4. Recalculate order
  const orderResult = await this.recalculateOrderPayment(orderId);

  // 5. Check license creation
  if (orderResult.paymentStatus === 'FULLY_PAID') {
    this.eventEmitter.emit('payment.completed', { ... });
  }

  return { success: true, payment, order: orderResult };
}
```

---

## 4. Rejection Flow

### 4.1 Điều kiện từ chối

- Payment phải ở trạng thái `PENDING`
- Phải cung cấp lý do từ chối (`rejectionReason`)

### 4.2 Quy trình từ chối

```
┌──────────────────────────────────────────────────────────────────┐
│                      REJECTION FLOW                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. User gọi rejectPayment mutation                               │
│     │                                                             │
│     ▼                                                             │
│  2. Validate:                                                     │
│     - payment status = PENDING                                    │
│     - rejectionReason không rỗng                                  │
│     │                                                             │
│     ▼                                                             │
│  3. Update payment:                                               │
│     - status = REJECTED                                           │
│     - rejectedAt = now()                                          │
│     - rejectedById = userId                                       │
│     - rejectionReason = reason                                    │
│     │                                                             │
│     ▼                                                             │
│  4. Record payment history                                        │
│     │                                                             │
│     ▼                                                             │
│  5. Emit PAYMENT_REJECTED event                                   │
│     │                                                             │
│     ▼                                                             │
│  6. Return result                                                 │
│     (Order totals không thay đổi vì payment chưa confirmed)       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 Lưu ý

- Payment bị reject **không ảnh hưởng** đến `paidAmount` của Order
- Vì payment chưa được confirmed nên chưa được tính vào order

---

## 5. Refund Flow

### 5.1 Điều kiện hoàn tiền

- Payment phải ở trạng thái `CONFIRMED` hoặc `PARTIALLY_REFUNDED`
- Số tiền hoàn không vượt quá số tiền còn lại (amount - refundedAmount)

### 5.2 Quy trình hoàn tiền

```
┌──────────────────────────────────────────────────────────────────┐
│                        REFUND FLOW                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. User gọi refundPayment mutation                               │
│     - paymentId: ID của payment                                   │
│     - amount: số tiền hoàn (null = hoàn hết)                      │
│     - reason: lý do hoàn                                          │
│     │                                                             │
│     ▼                                                             │
│  2. Validate:                                                     │
│     - payment.status in [CONFIRMED, PARTIALLY_REFUNDED]           │
│     - refundAmount <= (payment.amount - payment.refundedAmount)   │
│     │                                                             │
│     ▼                                                             │
│  3. Calculate:                                                    │
│     - actualRefundAmount = input.amount ?? availableForRefund     │
│     - newRefundedAmount = previousRefunded + actualRefundAmount   │
│     - isFullRefund = (newRefundedAmount >= payment.amount)        │
│     │                                                             │
│     ▼                                                             │
│  4. Update payment:                                               │
│     - status = REFUNDED (nếu full) | PARTIALLY_REFUNDED           │
│     - refundedAmount = newRefundedAmount                          │
│     │                                                             │
│     ▼                                                             │
│  5. Record payment history                                        │
│     │                                                             │
│     ▼                                                             │
│  6. Recalculate order totals:                                     │
│     - paidAmount giảm theo refund amount                          │
│     - remainingAmount tăng lên                                    │
│     - paymentStatus có thể thay đổi                               │
│     │                                                             │
│     ▼                                                             │
│  7. Emit PAYMENT_REFUNDED event                                   │
│     (để xử lý license revocation nếu cần)                         │
│     │                                                             │
│     ▼                                                             │
│  8. Return result with refunded amount                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 Ví dụ hoàn tiền

```
Payment gốc: 1,000,000 VND
├─ Hoàn lần 1: 300,000 VND
│  └─ refundedAmount = 300,000
│  └─ status = PARTIALLY_REFUNDED
│  └─ availableForRefund = 700,000
│
├─ Hoàn lần 2: 500,000 VND
│  └─ refundedAmount = 800,000
│  └─ status = PARTIALLY_REFUNDED
│  └─ availableForRefund = 200,000
│
└─ Hoàn lần 3: null (hoàn hết)
   └─ refundedAmount = 1,000,000
   └─ status = REFUNDED
   └─ availableForRefund = 0
```

---

## 6. Order Payment Calculation

### 6.1 Công thức tính

```typescript
// OrderPaymentCalculationService.calculatePaymentSummary()

function calculatePaymentSummary(totalAmount, confirmedPayments) {
  // Chỉ tính các payment đã CONFIRMED (trừ phần đã refund)
  const paidAmount = confirmedPayments.reduce((sum, p) => {
    const netAmount = p.amount - (p.refundedAmount ?? 0);
    return sum + netAmount;
  }, 0);

  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const paidPercent = (paidAmount / totalAmount) * 100;

  // Determine payment status
  let paymentStatus;
  if (paidAmount <= 0) {
    paymentStatus = 'UNPAID';
  } else if (paidAmount < totalAmount) {
    paymentStatus = 'PARTIAL_PAID';
  } else if (paidAmount === totalAmount) {
    paymentStatus = 'FULLY_PAID';
  } else {
    paymentStatus = 'OVERPAID';
  }

  return { paidAmount, remainingAmount, paymentStatus, paidPercent };
}
```

### 6.2 Ví dụ tính toán

```
Order: totalAmount = 2,000,000 VND

Payments:
├─ Payment 1: amount=1,000,000, status=CONFIRMED, refundedAmount=0
├─ Payment 2: amount=500,000, status=CONFIRMED, refundedAmount=200,000
├─ Payment 3: amount=300,000, status=PENDING (không tính)
└─ Payment 4: amount=200,000, status=REJECTED (không tính)

Calculation:
├─ Payment 1 net: 1,000,000 - 0 = 1,000,000
├─ Payment 2 net: 500,000 - 200,000 = 300,000
├─ paidAmount = 1,000,000 + 300,000 = 1,300,000
├─ remainingAmount = 2,000,000 - 1,300,000 = 700,000
├─ paidPercent = 65%
└─ paymentStatus = PARTIAL_PAID
```

---

## 7. Event System

### 7.1 Event Types

| Event | Trigger | Payload |
|-------|---------|---------|
| `payment.confirmed` | Sau khi confirm thành công | paymentId, orderId, orderCode, amount, confirmedById, workspaceId |
| `payment.rejected` | Sau khi reject | paymentId, orderId, rejectedById, rejectionReason, workspaceId |
| `payment.refunded` | Sau khi refund | paymentId, orderId, refundAmount, totalRefunded, isFullRefund, workspaceId |
| `payment.completed` | Khi order được thanh toán đủ | paymentId, orderId, orderCode, totalPaidAmount, workspaceId |

### 7.2 Event Handlers

```typescript
// PaymentNotificationListener

@OnEvent('payment.confirmed')
async handlePaymentConfirmed(event: PaymentConfirmedEvent) {
  // - Send confirmation email
  // - Log for audit
  // - Notify relevant teams
}

@OnEvent('payment.rejected')
async handlePaymentRejected(event: PaymentRejectedEvent) {
  // - Send rejection notification
  // - Create follow-up task
  // - Log rejection reason
}

@OnEvent('payment.refunded')
async handlePaymentRefunded(event: PaymentRefundedEvent) {
  // - Send refund confirmation email
  // - Update accounting records
  // - If full refund: trigger license revocation
}

@OnEvent('payment.completed')
async handlePaymentCompleted(event: PaymentCompletedEvent) {
  // - Trigger license creation
  // - Send order confirmation email
  // - Update CRM records
}
```

### 7.3 License Revocation Logic

```
┌──────────────────────────────────────────────────────────────────┐
│              LICENSE REVOCATION ON REFUND                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PAYMENT_REFUNDED event received                                  │
│     │                                                             │
│     ▼                                                             │
│  Is full refund? ─────────────────────────────────────────────┐   │
│     │                                                         │   │
│     │ Yes                                                     │   │
│     ▼                                                         │   │
│  Check order payment status                                   │   │
│     │                                                         │   │
│     ▼                                                         │   │
│  If paymentStatus changed from FULLY_PAID to PARTIAL/UNPAID   │   │
│     │                                                         │   │
│     ▼                                                         │   │
│  Revoke licenses associated with order                        │   │
│     - Set license status = INACTIVE                           │   │
│     - Record license history                                  │   │
│                                                               │   │
│                                             No ───────────────┘   │
│                                             │                     │
│                                             ▼                     │
│                                     No license change             │
│                                     (partial refund ok)           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. GraphQL API

### 8.1 Mutations

#### confirmPayment

```graphql
mutation ConfirmPayment($input: ConfirmPaymentInputDto!) {
  confirmPayment(input: $input) {
    success
    message
    payment {
      id
      status
      refundedAmount
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

# Variables
{
  "input": {
    "paymentId": "uuid-here",
    "note": "Đã xác nhận qua bank statement"
  }
}
```

#### rejectPayment

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

# Variables
{
  "input": {
    "paymentId": "uuid-here",
    "reason": "Không tìm thấy giao dịch trong sao kê"
  }
}
```

#### refundPayment

```graphql
mutation RefundPayment($input: RefundPaymentInputDto!) {
  refundPayment(input: $input) {
    success
    message
    payment {
      id
      status
      refundedAmount
    }
    order {
      orderId
      paidAmount
      remainingAmount
      paymentStatus
    }
    refundedAmount
  }
}

# Variables - Partial refund
{
  "input": {
    "paymentId": "uuid-here",
    "amount": 500000,
    "reason": "Khách yêu cầu hoàn một phần"
  }
}

# Variables - Full refund (amount = null)
{
  "input": {
    "paymentId": "uuid-here",
    "reason": "Khách hủy đơn hàng"
  }
}
```

### 8.2 Input/Output Types

```typescript
// Input Types
type ConfirmPaymentInputDto = {
  paymentId: string;
  note?: string;
};

type RejectPaymentInputDto = {
  paymentId: string;
  reason: string;  // Required
};

type RefundPaymentInputDto = {
  paymentId: string;
  amount?: number;  // null = full refund
  reason: string;
};

// Output Types
type PaymentActionResponseDto = {
  success: boolean;
  message?: string;
  payment?: {
    id: string;
    status: string;
    refundedAmount?: number;
  };
  order?: {
    orderId: string;
    orderCode?: string;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: string;
    paidPercent: number;
  };
  refundedAmount?: number;
};
```

---

## 9. Sequence Diagrams

### 9.1 Confirm Payment Sequence

```
┌──────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐    ┌───────┐    ┌────────┐
│Client│    │ Resolver │    │ConfirmSvc │    │PaymentRepo│    │OrderRepo│   │EventBus│
└──┬───┘    └────┬─────┘    └─────┬──────┘    └────┬─────┘    └───┬────┘    └───┬────┘
   │             │                │                │              │             │
   │ confirmPayment(input)        │                │              │             │
   │────────────>│                │                │              │             │
   │             │                │                │              │             │
   │             │ confirmPayment(input, userId, wsId)            │             │
   │             │───────────────>│                │              │             │
   │             │                │                │              │             │
   │             │                │ findByIdWithRelations(id)     │             │
   │             │                │───────────────>│              │             │
   │             │                │                │              │             │
   │             │                │<───────────────│ payment      │             │
   │             │                │                │              │             │
   │             │                │ validate status=PENDING       │             │
   │             │                │                │              │             │
   │             │                │ updatePayment(id, data)       │             │
   │             │                │───────────────>│              │             │
   │             │                │                │              │             │
   │             │                │ recordHistory()│              │             │
   │             │                │───────────────>│              │             │
   │             │                │                │              │             │
   │             │                │ findByIdWithPayments(orderId) │             │
   │             │                │────────────────────────────────>            │
   │             │                │                │              │             │
   │             │                │<────────────────────────────────order       │
   │             │                │                │              │             │
   │             │                │ calculatePaymentSummary()     │             │
   │             │                │                │              │             │
   │             │                │ updateOrder(id, summary)      │             │
   │             │                │────────────────────────────────>            │
   │             │                │                │              │             │
   │             │                │ if FULLY_PAID: emit(PAYMENT_COMPLETED)      │
   │             │                │────────────────────────────────────────────>│
   │             │                │                │              │             │
   │             │<───────────────│ result         │              │             │
   │             │                │                │              │             │
   │<────────────│ response       │                │              │             │
   │             │                │                │              │             │
```

### 9.2 Refund Payment Sequence

```
┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────┐    ┌────────┐
│Client│    │ Resolver │    │RefundSvc │    │PaymentRepo│    │OrderRepo│   │EventBus│
└──┬───┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └───┬────┘    └───┬────┘
   │             │               │               │              │             │
   │ refundPayment(input)        │               │              │             │
   │────────────>│               │               │              │             │
   │             │               │               │              │             │
   │             │ refundPayment(input, userId, wsId)           │             │
   │             │──────────────>│               │              │             │
   │             │               │               │              │             │
   │             │               │ findById(id)  │              │             │
   │             │               │──────────────>│              │             │
   │             │               │               │              │             │
   │             │               │<──────────────│ payment      │             │
   │             │               │               │              │             │
   │             │               │ validate:                    │             │
   │             │               │ - status in [CONFIRMED, PARTIALLY_REFUNDED]│
   │             │               │ - refundAmount <= available  │             │
   │             │               │               │              │             │
   │             │               │ calculate newRefundedAmount  │             │
   │             │               │               │              │             │
   │             │               │ updatePayment(id, {          │             │
   │             │               │   status, refundedAmount     │             │
   │             │               │ })            │              │             │
   │             │               │──────────────>│              │             │
   │             │               │               │              │             │
   │             │               │ recordHistory()              │             │
   │             │               │──────────────>│              │             │
   │             │               │               │              │             │
   │             │               │ recalculateOrderPayment()    │             │
   │             │               │────────────────────────────────>            │
   │             │               │               │              │             │
   │             │               │ emit(PAYMENT_REFUNDED)       │             │
   │             │               │────────────────────────────────────────────>│
   │             │               │               │              │             │
   │             │<──────────────│ result        │              │             │
   │             │               │               │              │             │
   │<────────────│ response      │               │              │             │
   │             │               │               │              │             │
```

---

## Appendix: Payment History Tracking

Mỗi thay đổi trạng thái payment được lưu vào `mktPaymentHistory`:

| Field | Description |
|-------|-------------|
| `name` | Tên action (e.g., "CONFIRMED → CONFIRMED") |
| `action` | Action type: CREATED, CONFIRMED, REJECTED, REFUNDED, PARTIALLY_REFUNDED |
| `previousStatus` | Trạng thái trước |
| `newStatus` | Trạng thái sau |
| `amount` | Số tiền liên quan |
| `performedById` | User thực hiện |
| `performedAt` | Thời điểm thực hiện |
| `note` | Ghi chú |
| `paymentType` | PAYMENT hoặc REFUND |

---

## Related Documents

- [MULTI_PAYMENT_IMPLEMENTATION_GUIDE.md](./MULTI_PAYMENT_IMPLEMENTATION_GUIDE.md) - Hướng dẫn triển khai chi tiết
- [MULTI_PAYMENT_METHODS_FLOW.md](../../../../../../docs/flows/order/MULTI_PAYMENT_METHODS_FLOW.md) - Thiết kế tổng quan
- [MULTI_GATEWAY_EXTENSION_DESIGN.md](../../../../../../docs/flows/order/MULTI_GATEWAY_EXTENSION_DESIGN.md) - Thiết kế mở rộng multi-gateway
