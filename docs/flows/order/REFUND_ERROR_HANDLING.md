# Refund Error Handling

## Overview

Tài liệu này mô tả các giải pháp xử lý khi thao tác refund bị sai. Do `REFUND` là **terminal status** (không thể thay đổi), cần có cơ chế phòng ngừa và khắc phục.

---

## Option 1: Confirmation Flow (Phòng ngừa)

### Mục đích

Ngăn ngừa sai sót trước khi refund được thực hiện bằng cách yêu cầu xác nhận nhiều bước.

### Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    REFUND REQUEST                            │
│                    (Admin action)                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 1: Validation                              │
│              ─────────────────                               │
│              - Check order status (CONFIRMED/COMPLETED)      │
│              - Check refund eligibility                      │
│              - Verify licenses exist                         │
│              - Calculate refund amount                       │
│                                                              │
│              If invalid → Return error, stop flow            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 2: Preview & Confirmation                  │
│              ──────────────────────────                      │
│              Return preview to client:                       │
│              {                                               │
│                orderId: "xxx",                               │
│                orderCode: "ORD-001",                         │
│                customer: "Nguyễn Văn A",                     │
│                totalAmount: 1000000,                         │
│                refundAmount: 1000000,                        │
│                licensesToRevoke: ["LIC-001", "LIC-002"],     │
│                warning: "Hành động này không thể hoàn tác"   │
│              }                                               │
│                                                              │
│              Client must call confirmRefund() to proceed     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 3: Confirm Refund                          │
│              ─────────────────────                           │
│              Input:                                          │
│              {                                               │
│                orderId: "xxx",                               │
│                confirmationCode: "REFUND-xxx-timestamp",     │
│                reason: "Lý do hoàn tiền",                    │
│                adminNote: "Ghi chú của admin"                │
│              }                                               │
│                                                              │
│              Validate confirmationCode matches preview       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 4: Execute Refund                          │
│              ─────────────────────                           │
│              - Update order status → REFUND                  │
│              - Revoke all licenses                           │
│              - Record refund reason in metadata              │
│              - Create order history entry                    │
│              - Send notification to customer                 │
└─────────────────────────────────────────────────────────────┘
```

### API Design

#### 1. Preview Refund

```graphql
mutation PreviewRefund($input: PreviewRefundInput!) {
  previewRefund(input: $input) {
    success
    preview {
      orderId
      orderCode
      customerName
      totalAmount
      refundAmount
      licensesToRevoke
      confirmationCode  # Expires in 5 minutes
      expiresAt
    }
    warnings
    error
  }
}

input PreviewRefundInput {
  orderId: String!
  licenseIds: [String!]  # Optional: specific licenses to refund
  refundAmount: Float    # Optional: partial refund amount
}
```

#### 2. Confirm Refund

```graphql
mutation ConfirmRefund($input: ConfirmRefundInput!) {
  confirmRefund(input: $input) {
    success
    orderId
    newStatus
    refundedAmount
    revokedLicenses
    error
  }
}

input ConfirmRefundInput {
  orderId: String!
  confirmationCode: String!  # From preview
  reason: String!
  adminNote: String
}
```

### Confirmation Code Logic

```typescript
// Generate confirmation code
const generateConfirmationCode = (orderId: string): string => {
  const timestamp = Date.now();
  const hash = crypto
    .createHash('sha256')
    .update(`${orderId}-${timestamp}-${SECRET}`)
    .digest('hex')
    .substring(0, 8);
  return `REFUND-${hash}-${timestamp}`;
};

// Validate confirmation code (expires in 5 minutes)
const validateConfirmationCode = (
  code: string,
  orderId: string,
): boolean => {
  const [prefix, hash, timestamp] = code.split('-');
  const age = Date.now() - parseInt(timestamp);
  const maxAge = 5 * 60 * 1000; // 5 minutes

  if (age > maxAge) return false;

  const expectedHash = crypto
    .createHash('sha256')
    .update(`${orderId}-${timestamp}-${SECRET}`)
    .digest('hex')
    .substring(0, 8);

  return hash === expectedHash;
};
```

### UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     REFUND ORDER                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Order: ORD-001                                              │
│  Customer: Nguyễn Văn A                                      │
│  Total Amount: 1,000,000 VND                                 │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ⚠️ CẢNH BÁO                                         │    │
│  │                                                      │    │
│  │  Hành động này sẽ:                                   │    │
│  │  • Hoàn tiền 1,000,000 VND                          │    │
│  │  • Thu hồi 2 licenses: LIC-001, LIC-002             │    │
│  │  • KHÔNG THỂ HOÀN TÁC                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Lý do hoàn tiền: [________________________]                 │
│                                                              │
│  Ghi chú: [________________________________]                 │
│                                                              │
│           [HỦY]                    [XÁC NHẬN HOÀN TIỀN]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Option 2: Tạo đơn mới để bù (Khắc phục)

### Mục đích

Khắc phục khi đã refund sai bằng cách tạo đơn hàng mới, giữ nguyên audit trail và đảm bảo kế toán rõ ràng.

### Flow

```
┌─────────────────────────────────────────────────────────────┐
│              ORIGINAL ORDER (Refunded by mistake)            │
│              ────────────────────────────────────            │
│              Order: ORD-001                                  │
│              Status: REFUND                                  │
│              Amount: 1,000,000 VND                           │
│              Licenses: LIC-001, LIC-002 (REVOKED)            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Admin realizes mistake
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 1: Create Reversal Order                   │
│              ─────────────────────────────                   │
│              - Copy customer info from ORD-001               │
│              - Copy product/license info                     │
│              - Set metadata.reversedFromOrderId = ORD-001    │
│              - Set metadata.reversalReason = "..."           │
│              - Auto-generate note                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 2: New Order Created                       │
│              ─────────────────────────                       │
│              Order: ORD-002                                  │
│              Status: PENDING_PAYMENT                         │
│              Amount: 1,000,000 VND                           │
│              Note: "Reversal của ORD-001 - Refund sai"       │
│              Metadata: {                                     │
│                reversedFromOrderId: "ORD-001",               │
│                reversalReason: "Admin refund sai",           │
│                originalLicenses: ["LIC-001", "LIC-002"]      │
│              }                                               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 3: Process New Order                       │
│              ─────────────────────────                       │
│              Option A: Customer pays again                   │
│                → Normal flow: CONFIRMED → COMPLETED          │
│                → New licenses created                        │
│                                                              │
│              Option B: Mark as paid (no actual payment)      │
│                → Admin confirms with note "Bù từ ORD-001"    │
│                → Skip payment, create licenses               │
└─────────────────────────────────────────────────────────────┘
```

### API Design

```graphql
mutation CreateReversalOrder($input: CreateReversalOrderInput!) {
  createReversalOrder(input: $input) {
    success
    newOrderId
    newOrderCode
    originalOrderId
    message
    error
  }
}

input CreateReversalOrderInput {
  originalOrderId: String!
  reason: String!
  adminNote: String
  skipPayment: Boolean  # If true, mark as paid immediately
}
```

### Implementation

```typescript
type CreateReversalOrderInput = {
  originalOrderId: string;
  reason: string;
  adminNote?: string;
  skipPayment?: boolean;
};

type CreateReversalOrderResponse = {
  success: boolean;
  newOrderId?: string;
  newOrderCode?: string;
  originalOrderId?: string;
  message?: string;
  error?: string;
};

async function createReversalOrder(
  workspaceId: string,
  input: CreateReversalOrderInput,
): Promise<CreateReversalOrderResponse> {
  // 1. Validate original order
  const originalOrder = await orderRepository.findById(
    workspaceId,
    input.originalOrderId,
    { relations: { orderItems: true, customer: true } },
  );

  if (!originalOrder) {
    return { success: false, error: 'Original order not found' };
  }

  if (originalOrder.status !== ORDER_STATUS.REFUND) {
    return {
      success: false,
      error: 'Can only create reversal for REFUND orders'
    };
  }

  // 2. Create new order with reference to original
  const newOrderInput: CreateOrderWithItemsInput = {
    customerId: originalOrder.customerId,
    currency: originalOrder.currency,
    note: `Reversal của ${originalOrder.orderCode} - ${input.reason}`,
    externalProducts: mapOrderItemsToExternalProducts(originalOrder.orderItems),
    action: ORDER_ACTION.NEW_ORDER,
  };

  // 3. Create the order
  const createResult = await createOrderWithItems(workspaceId, newOrderInput);

  if (!createResult.success) {
    return { success: false, error: createResult.error };
  }

  // 4. Update metadata with reversal reference
  await orderRepository.update(workspaceId, createResult.orderId, {
    metadata: safeJsonStringify({
      reversedFromOrderId: input.originalOrderId,
      reversalReason: input.reason,
      adminNote: input.adminNote,
      originalLicenses: originalOrder.orderItems.map(i => i.externalLicenseId),
    }),
  });

  // 5. If skipPayment, auto-confirm
  if (input.skipPayment) {
    await confirmOrder(workspaceId, {
      orderId: createResult.orderId,
      action: ORDER_ACTION.ACCOUNTING_CONFIRMED,
      accountingConfirmed: true,
      note: `Auto-confirmed: Bù từ ${originalOrder.orderCode}`,
    });
  }

  // 6. Update original order metadata
  await orderRepository.update(workspaceId, input.originalOrderId, {
    metadata: safeJsonStringify({
      ...parseJsonOrDefault(originalOrder.metadata, {}),
      reversedByOrderId: createResult.orderId,
      reversedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    }),
  });

  return {
    success: true,
    newOrderId: createResult.orderId,
    newOrderCode: createResult.orderCode,
    originalOrderId: input.originalOrderId,
    message: `Created reversal order ${createResult.orderCode}`,
  };
}
```

### Metadata Structure

```typescript
// Original order (after reversal created)
type OriginalOrderMetadata = {
  // ... existing fields
  reversedByOrderId?: string;   // Reference to reversal order
  reversedAt?: string;          // When reversal was created
};

// Reversal order
type ReversalOrderMetadata = {
  // ... existing fields
  reversedFromOrderId: string;  // Reference to original order
  reversalReason: string;       // Why reversal was needed
  adminNote?: string;           // Admin notes
  originalLicenses: string[];   // Original license IDs for reference
};
```

### UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   ORDER DETAILS: ORD-001                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Status: REFUND (Terminal)                                   │
│  Customer: Nguyễn Văn A                                      │
│  Amount: 1,000,000 VND                                       │
│  Refunded At: 2024-01-15 10:30:00                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ⚠️ Đơn hàng đã hoàn tiền, không thể thay đổi        │    │
│  │                                                      │    │
│  │  Nếu hoàn tiền sai, bạn có thể tạo đơn mới để bù:   │    │
│  │                                                      │    │
│  │  [TẠO ĐƠN BÙ]                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

                          │
                          │ Click "TẠO ĐƠN BÙ"
                          ▼

┌─────────────────────────────────────────────────────────────┐
│                   TẠO ĐƠN BÙ CHO ORD-001                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Đơn gốc: ORD-001                                            │
│  Customer: Nguyễn Văn A                                      │
│  Amount: 1,000,000 VND                                       │
│                                                              │
│  Lý do tạo đơn bù: [Refund sai________________]              │
│                                                              │
│  Ghi chú: [________________________________]                 │
│                                                              │
│  ☐ Bỏ qua thanh toán (đã nhận tiền từ đơn gốc)              │
│                                                              │
│           [HỦY]                    [TẠO ĐƠN BÙ]              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Audit Trail

```
┌─────────────────────────────────────────────────────────────┐
│                      ORDER HISTORY                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ORD-001:                                                    │
│  ├── 2024-01-10 09:00 - Created (DRAFT)                     │
│  ├── 2024-01-10 09:05 - Submitted (PENDING_PAYMENT)         │
│  ├── 2024-01-11 14:00 - Confirmed (CONFIRMED)               │
│  ├── 2024-01-11 14:05 - Completed (COMPLETED)               │
│  ├── 2024-01-15 10:30 - Refunded (REFUND) ⚠️                │
│  │   └── Reason: "Customer request"                         │
│  └── 2024-01-15 11:00 - Reversed by ORD-002                 │
│      └── Reason: "Refund sai - admin error"                 │
│                                                              │
│  ORD-002:                                                    │
│  ├── 2024-01-15 11:00 - Created (DRAFT)                     │
│  │   └── Reversal of ORD-001                                │
│  ├── 2024-01-15 11:00 - Submitted (PENDING_PAYMENT)         │
│  ├── 2024-01-15 11:05 - Auto-confirmed (CONFIRMED)          │
│  │   └── Skip payment: Bù từ ORD-001                        │
│  └── 2024-01-15 11:05 - Completed (COMPLETED)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## So sánh 2 Options

| Tiêu chí | Option 1: Confirmation | Option 2: Reversal Order |
|----------|------------------------|--------------------------|
| **Mục đích** | Phòng ngừa sai sót | Khắc phục sau sai sót |
| **Khi nào dùng** | Trước khi refund | Sau khi đã refund sai |
| **Complexity** | Medium | Medium |
| **Audit trail** | Không thay đổi | Tạo mới, link reference |
| **Kế toán** | Không ảnh hưởng | 2 transactions (refund + new order) |
| **License** | Không revoke nếu cancel | Tạo license mới |

---

## Recommendations

1. **Implement cả 2 options:**
   - Option 1: Bắt buộc cho tất cả refund operations
   - Option 2: Dùng khi cần khắc phục sai sót

2. **Thêm permission:**
   - `order.refund.preview` - Xem preview refund
   - `order.refund.confirm` - Confirm refund
   - `order.reversal.create` - Tạo đơn bù

3. **Logging:**
   - Log tất cả refund attempts (cả thành công và thất bại)
   - Log reversal orders với reference đầy đủ
