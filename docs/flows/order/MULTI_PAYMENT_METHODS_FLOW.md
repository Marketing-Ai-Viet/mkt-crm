# Multi-Payment Methods Flow (Nhiều Phương Thức Thanh Toán)

## Overview

Tài liệu này mô tả kiến trúc và best practices xử lý nhiều phương thức thanh toán cho một đơn hàng trong hệ thống MKT CRM.

**Vấn đề cần giải quyết:**
- Một đơn hàng có thể được thanh toán bằng nhiều phương thức khác nhau
- Cần theo dõi từng giao dịch thanh toán riêng biệt
- Cần aggregate tổng thanh toán để xác định trạng thái order

---

## Data Model

### Entity Relationship

```
┌──────────────────────────────────────────────────────────────────┐
│                          ORDER                                    │
│  id | totalAmount | paidAmount | remainingAmount | paymentStatus  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ 1 : N
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                         PAYMENTS                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │Payment 1│  │Payment 2│  │Payment 3│  │Payment N│              │
│  │CONFIRMED│  │CONFIRMED│  │PENDING  │  │...      │              │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ 1 : N (Audit)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     PAYMENT_HISTORY                               │
│  paymentId | action | performedBy | performedAt | note            │
└──────────────────────────────────────────────────────────────────┘
```

### Order Entity (Extended)

```typescript
interface Order {
  id: UUID;
  orderCode: string;
  customerId: UUID;
  
  // Amounts
  totalAmount: number;           // Tổng giá trị đơn hàng
  paidAmount: number;            // Tổng đã thanh toán (aggregate)
  remainingAmount: number;       // Còn lại = total - paid
  
  // Status
  status: OrderStatus;
  paymentStatus: PaymentStatus;  // PENDING | PARTIAL | PAID | OVERPAID
  
  // Relations
  payments: Payment[];           // 1:N relationship
  
  // Partial payment config
  partialPaymentPolicy: PartialPaymentPolicy;
  paymentThresholdPercent: number;
}
```

### Payment Entity (New)

```typescript
interface Payment {
  id: UUID;
  orderId: UUID;                 // FK to Order
  
  // Payment details
  method: PaymentMethod;
  amount: number;
  currency: string;              // Default: VND
  
  // Transaction info
  transactionRef: string;        // Mã giao dịch ngân hàng/ví
  transactionDate: DateTime;     // Ngày giao dịch thực tế
  
  // Status & Confirmation
  status: PaymentTransactionStatus;
  confirmedAt: DateTime | null;
  confirmedBy: UUID | null;      // User ID của kế toán
  rejectedAt: DateTime | null;
  rejectedBy: UUID | null;
  rejectionReason: string | null;
  
  // Metadata
  note: string;
  metadata: JsonObject;          // Provider-specific data
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Payment Method Enum

```typescript
enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',   // Chuyển khoản ngân hàng
  SEPAY = 'SEPAY',                   // SEPay QR
  CASH = 'CASH',                     // Tiền mặt
  CREDIT_CARD = 'CREDIT_CARD',       // Thẻ tín dụng
  MOMO = 'MOMO',                     // Ví MoMo
  VNPAY = 'VNPAY',                   // VNPay
  ZALOPAY = 'ZALOPAY',               // ZaloPay
  CREDIT_NOTE = 'CREDIT_NOTE',       // Sử dụng credit từ đơn trước
  OTHER = 'OTHER',                   // Khác
}
```

### Payment Transaction Status Enum

```typescript
enum PaymentTransactionStatus {
  PENDING = 'PENDING',           // Đang chờ xác nhận
  CONFIRMED = 'CONFIRMED',       // Đã xác nhận
  FAILED = 'FAILED',             // Thất bại
  REJECTED = 'REJECTED',         // Bị từ chối
  REFUNDED = 'REFUNDED',         // Đã hoàn tiền
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED', // Hoàn một phần
}
```

### Payment History Entity (Audit Trail)

```typescript
interface PaymentHistory {
  id: UUID;
  paymentId: UUID;
  
  action: PaymentAction;
  previousStatus: PaymentTransactionStatus;
  newStatus: PaymentTransactionStatus;
  
  performedBy: UUID;             // User ID
  performedAt: DateTime;
  
  note: string;
  metadata: JsonObject;
}

enum PaymentAction {
  CREATED = 'CREATED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
}
```

---

## Architecture Flow

### Multi-Payment Processing Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Order (totalAmount: 10,000,000 VND)          │
└─────────────────────────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │ Payment #1  │         │ Payment #2  │         │ Payment #3  │
   │ BANK_TRANSFER│        │ CASH        │         │ MOMO        │
   │ 5,000,000   │         │ 3,000,000   │         │ 2,000,000   │
   │ ✓ CONFIRMED │         │ ✓ CONFIRMED │         │ ⏳ PENDING  │
   └─────────────┘         └─────────────┘         └─────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  ▼
                    ┌──────────────────────────┐
                    │ Aggregate Confirmed Only │
                    │ paidAmount = 8,000,000   │
                    │ remainingAmount = 2,000,000│
                    │ paymentStatus = PARTIAL  │
                    └──────────────────────────┘
```

### Payment Lifecycle

```
                    ┌──────────┐
                    │ CREATED  │
                    │ (PENDING)│
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │CONFIRMED │    │ REJECTED │    │  FAILED  │
   │          │    │          │    │          │
   └────┬─────┘    └──────────┘    └──────────┘
        │
        │ (After confirmation)
        │
        ├─────────────────┐
        │                 │
        ▼                 ▼
  ┌──────────┐    ┌────────────────┐
  │ REFUNDED │    │PARTIALLY_REFUNDED│
  │          │    │                  │
  └──────────┘    └────────────────┘
```

---

## API Design

### GraphQL Mutations

#### Add Payment to Order

```graphql
mutation AddPaymentToOrder($input: AddPaymentInput!) {
  mktAddPayment(input: $input) {
    payment {
      id
      method
      amount
      status
      transactionRef
    }
    order {
      paidAmount
      remainingAmount
      paymentStatus
    }
  }
}

input AddPaymentInput {
  orderId: ID!
  method: PaymentMethod!
  amount: Float!
  transactionRef: String
  transactionDate: DateTime
  note: String
  metadata: JSON
}
```

#### Confirm Payment

```graphql
mutation ConfirmPayment($input: ConfirmPaymentInput!) {
  mktConfirmPayment(input: $input) {
    success
    payment {
      id
      status
      confirmedAt
      confirmedBy
    }
    order {
      paidAmount
      remainingAmount
      paymentStatus
      # Nếu paymentStatus = PAID → licenses đã được tạo
      licenses {
        id
        licenseKey
      }
    }
  }
}

input ConfirmPaymentInput {
  paymentId: ID!
  confirmed: Boolean!          # true = confirm, false = reject
  rejectionReason: String      # Required if confirmed = false
  note: String
}
```

#### Refund Payment

```graphql
mutation RefundPayment($input: RefundPaymentInput!) {
  mktRefundPayment(input: $input) {
    success
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
    # Nếu có license bị revoke
    revokedLicenses {
      id
      licenseKey
    }
  }
}

input RefundPaymentInput {
  paymentId: ID!
  amount: Float                # Partial refund amount (null = full refund)
  reason: String!
  note: String
}
```

### GraphQL Queries

#### Get Order with Payments

```graphql
query GetOrderWithPayments($orderId: ID!) {
  mktOrder(id: $orderId) {
    id
    orderCode
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    
    payments {
      id
      method
      amount
      status
      transactionRef
      transactionDate
      confirmedAt
      confirmedBy {
        id
        name
      }
      note
    }
    
    # Payment summary by method
    paymentSummary {
      method
      totalAmount
      confirmedAmount
      pendingAmount
      count
    }
  }
}
```

#### Get Payment History

```graphql
query GetPaymentHistory($paymentId: ID!) {
  mktPaymentHistory(paymentId: $paymentId) {
    id
    action
    previousStatus
    newStatus
    performedBy {
      id
      name
    }
    performedAt
    note
  }
}
```

---

## Business Logic

### Payment Confirmation Logic

```typescript
@Injectable()
export class PaymentConfirmationService {
  
  async confirmPayment(input: ConfirmPaymentInput, confirmedBy: UUID) {
    const payment = await this.paymentRepository.findById(input.paymentId);
    
    // 1. Validate payment status
    if (payment.status !== 'PENDING') {
      throw new Error(`Payment already ${payment.status}`);
    }
    
    // 2. Update payment status
    if (input.confirmed) {
      payment.status = 'CONFIRMED';
      payment.confirmedAt = DateTimeUtils.now();
      payment.confirmedBy = confirmedBy;
    } else {
      payment.status = 'REJECTED';
      payment.rejectedAt = DateTimeUtils.now();
      payment.rejectedBy = confirmedBy;
      payment.rejectionReason = input.rejectionReason;
    }
    
    await this.paymentRepository.save(payment);
    
    // 3. Record history
    await this.paymentHistoryService.record({
      paymentId: payment.id,
      action: input.confirmed ? 'CONFIRMED' : 'REJECTED',
      previousStatus: 'PENDING',
      newStatus: payment.status,
      performedBy: confirmedBy,
      note: input.note,
    });
    
    // 4. Recalculate order totals
    const order = await this.recalculateOrderPayment(payment.orderId);
    
    // 5. Check if should create licenses
    if (order.paymentStatus === 'PAID' || 
        this.meetsPartialPaymentPolicy(order)) {
      await this.licenseCreationSaga.execute(order);
    }
    
    return { payment, order };
  }
  
  private async recalculateOrderPayment(orderId: UUID) {
    const order = await this.orderRepository.findById(orderId, {
      relations: ['payments'],
    });
    
    // Only count CONFIRMED payments
    const confirmedPayments = order.payments.filter(
      p => p.status === 'CONFIRMED'
    );
    
    const paidAmount = MoneyUtils.sumBy(confirmedPayments, 'amount').toNumber();
    const remainingAmount = MoneyUtils.subtract(
      order.totalAmount, 
      paidAmount
    ).toNumber();
    
    // Determine payment status
    let paymentStatus: PaymentStatus;
    if (remainingAmount < 0) {
      paymentStatus = 'OVERPAID';
    } else if (remainingAmount === 0) {
      paymentStatus = 'PAID';
    } else if (paidAmount > 0) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'PENDING';
    }
    
    // Update order
    order.paidAmount = paidAmount;
    order.remainingAmount = remainingAmount;
    order.paymentStatus = paymentStatus;
    
    await this.orderRepository.save(order);
    
    return order;
  }
}
```

### Refund Logic

```typescript
@Injectable()
export class PaymentRefundService {
  
  async refundPayment(input: RefundPaymentInput, refundedBy: UUID) {
    const payment = await this.paymentRepository.findById(input.paymentId);
    
    // 1. Validate
    if (payment.status !== 'CONFIRMED') {
      throw new Error('Can only refund confirmed payments');
    }
    
    const refundAmount = input.amount ?? payment.amount;
    
    if (refundAmount > payment.amount) {
      throw new Error('Refund amount exceeds payment amount');
    }
    
    // 2. Update payment status
    if (refundAmount === payment.amount) {
      payment.status = 'REFUNDED';
      payment.refundedAmount = refundAmount;
    } else {
      payment.status = 'PARTIALLY_REFUNDED';
      payment.refundedAmount = refundAmount;
      // Effective amount = amount - refundedAmount
    }
    
    await this.paymentRepository.save(payment);
    
    // 3. Record history
    await this.paymentHistoryService.record({
      paymentId: payment.id,
      action: input.amount ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
      previousStatus: 'CONFIRMED',
      newStatus: payment.status,
      performedBy: refundedBy,
      note: input.reason,
    });
    
    // 4. Recalculate order
    const order = await this.recalculateOrderPayment(payment.orderId);
    
    // 5. Handle license revocation if needed
    const revokedLicenses = await this.handleLicenseRevocation(order);
    
    return { payment, order, revokedLicenses };
  }
  
  private async handleLicenseRevocation(order: Order) {
    if (order.partialPaymentPolicy === 'PRO_RATA') {
      const currentLicenses = order.licenses.length;
      const allowedLicenses = Math.floor(
        order.paidAmount / order.unitPrice
      );
      
      if (allowedLicenses < currentLicenses) {
        const licensesToRevoke = currentLicenses - allowedLicenses;
        return await this.licenseService.revokeLastN(
          order.id, 
          licensesToRevoke
        );
      }
    } else if (order.partialPaymentPolicy === 'THRESHOLD') {
      const threshold = MoneyUtils.percentage(
        order.totalAmount,
        order.paymentThresholdPercent
      ).toNumber();
      
      if (order.paidAmount < threshold) {
        // Suspend all licenses
        return await this.licenseService.suspendAll(order.id);
      }
    }
    
    return [];
  }
}
```

---

## Event-Driven Architecture

### Payment Events

```typescript
// Events emitted by payment system
interface PaymentCreatedEvent {
  paymentId: UUID;
  orderId: UUID;
  amount: number;
  method: PaymentMethod;
}

interface PaymentConfirmedEvent {
  paymentId: UUID;
  orderId: UUID;
  amount: number;
  confirmedBy: UUID;
  newOrderPaymentStatus: PaymentStatus;
}

interface PaymentRefundedEvent {
  paymentId: UUID;
  orderId: UUID;
  refundAmount: number;
  refundedBy: UUID;
  newOrderPaymentStatus: PaymentStatus;
}
```

### Event Listeners

```typescript
@Injectable()
export class PaymentEventListener {
  
  @OnEvent('payment.confirmed')
  async handlePaymentConfirmed(event: PaymentConfirmedEvent) {
    // 1. Send confirmation email to customer
    await this.emailService.sendPaymentConfirmation(event);
    
    // 2. Notify sales team
    await this.notificationService.notifySales(event);
    
    // 3. Update analytics
    await this.analyticsService.trackPayment(event);
    
    // 4. Trigger license creation if conditions met
    if (event.newOrderPaymentStatus === 'PAID') {
      await this.licenseCreationSaga.execute(event.orderId);
    }
  }
  
  @OnEvent('payment.refunded')
  async handlePaymentRefunded(event: PaymentRefundedEvent) {
    // 1. Send refund notification
    await this.emailService.sendRefundNotification(event);
    
    // 2. Update accounting records
    await this.accountingService.recordRefund(event);
    
    // 3. Check and revoke licenses if needed
    await this.licenseRevocationService.checkAndRevoke(event.orderId);
  }
}
```

---

## Webhook Integration

### SEPay Webhook Handler

```typescript
@Controller('webhooks')
export class PaymentWebhookController {
  
  @Post('sepay')
  async handleSepayWebhook(@Body() payload: SepayWebhookPayload) {
    // 1. Verify webhook signature
    if (!this.sepayService.verifySignature(payload)) {
      throw new UnauthorizedException('Invalid signature');
    }
    
    // 2. Extract order info from transaction ref
    const orderCode = this.extractOrderCode(payload.content);
    const order = await this.orderService.findByCode(orderCode);
    
    // 3. Create payment record
    const payment = await this.paymentService.create({
      orderId: order.id,
      method: 'SEPAY',
      amount: payload.transferAmount,
      transactionRef: payload.referenceCode,
      transactionDate: DateTimeUtils.fromISO(payload.transactionDate),
      metadata: payload,
    });
    
    // 4. Auto-confirm if amount matches
    if (this.shouldAutoConfirm(order, payload)) {
      await this.paymentService.confirm({
        paymentId: payment.id,
        confirmed: true,
        note: 'Auto-confirmed via SEPay webhook',
      });
    }
    
    return { success: true };
  }
  
  private shouldAutoConfirm(order: Order, payload: SepayWebhookPayload) {
    // Auto-confirm if remaining amount matches transfer amount
    return order.remainingAmount === payload.transferAmount;
  }
}
```

---

## UI/UX Considerations

### Payment Management UI Components

```
┌─────────────────────────────────────────────────────────────────┐
│  Order #ORD-2024-001234                                         │
│  Customer: Nguyễn Văn A                                         │
├─────────────────────────────────────────────────────────────────┤
│  Total Amount:     10,000,000 VND                               │
│  Paid Amount:       8,000,000 VND   ████████░░ 80%              │
│  Remaining:         2,000,000 VND                               │
│  Status: PARTIAL                                                │
├─────────────────────────────────────────────────────────────────┤
│  PAYMENTS                                           [+ Add New] │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ #1 | BANK_TRANSFER | 5,000,000 | ✓ Confirmed | 24/12/2024 │  │
│  │     BIDV - Ref: TXN123456789                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ #2 | CASH          | 3,000,000 | ✓ Confirmed | 24/12/2024 │  │
│  │     Nhận tại văn phòng                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ #3 | MOMO          | 2,000,000 | ⏳ Pending  | 24/12/2024 │  │
│  │     Chờ xác nhận                    [Confirm] [Reject]    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_AUTO_CONFIRM_ENABLED` | `false` | Tự động confirm webhook payments |
| `PAYMENT_AUTO_CONFIRM_METHODS` | `SEPAY,VNPAY` | Methods cho phép auto-confirm |
| `PAYMENT_CONFIRMATION_TIMEOUT_HOURS` | `72` | Timeout cho pending payments |
| `PAYMENT_HISTORY_RETENTION_DAYS` | `365` | Số ngày giữ history |

### Payment Method Configuration

```typescript
const PAYMENT_METHOD_CONFIG = {
  BANK_TRANSFER: {
    requiresManualConfirmation: true,
    supportsAutoReconciliation: false,
    defaultNote: 'Chuyển khoản ngân hàng',
  },
  SEPAY: {
    requiresManualConfirmation: false,
    supportsAutoReconciliation: true,
    webhookEnabled: true,
    defaultNote: 'Thanh toán qua SEPay',
  },
  CASH: {
    requiresManualConfirmation: true,
    supportsAutoReconciliation: false,
    defaultNote: 'Thanh toán tiền mặt',
  },
  MOMO: {
    requiresManualConfirmation: false,
    supportsAutoReconciliation: true,
    webhookEnabled: true,
    defaultNote: 'Thanh toán qua MoMo',
  },
};
```

---

## Error Handling

### Common Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `PAYMENT_ALREADY_CONFIRMED` | Payment đã được xác nhận | Không thể confirm lại |
| `PAYMENT_AMOUNT_EXCEEDS_REMAINING` | Số tiền vượt quá còn lại | Kiểm tra và điều chỉnh |
| `REFUND_EXCEEDS_PAYMENT` | Refund lớn hơn payment | Giảm số tiền refund |
| `INVALID_PAYMENT_METHOD` | Phương thức không hợp lệ | Chọn method khác |
| `DUPLICATE_TRANSACTION_REF` | Mã giao dịch trùng | Kiểm tra giao dịch đã tồn tại |

---

## Related Documents

| Document | Description |
|----------|-------------|
| [ORDER_LICENSE_CREATION_FLOW.md](ORDER_LICENSE_CREATION_FLOW.md) | Flow tạo order và license |
| [PARTIAL_PAYMENT_FLOW.md](PARTIAL_PAYMENT_FLOW.md) | Xử lý thanh toán một phần |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-24 | 1.0.0 | Initial documentation |
