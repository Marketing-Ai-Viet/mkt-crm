# Order Multi-Payment Implementation Plan

## Overview

Tài liệu triển khai hỗ trợ thanh toán nhiều phương thức kết hợp cho **Order entity**.

**Scope**: Chỉ Order module, Payment module sẽ triển khai sau.

---

## Phase 1: Order Entity Extension

### 1.1 Thêm Fields vào MktOrderWorkspaceEntity

```typescript
// File: packages/twenty-server/src/mkt-core/order/objects/mkt-order.workspace-entity.ts

// === NEW FIELDS ===

/** Tổng số tiền đã thanh toán (chỉ tính CONFIRMED) */
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.paidAmount,
  type: FieldMetadataType.NUMBER,
  label: 'Paid Amount',
  description: 'Total confirmed payment amount',
  icon: 'IconCash',
})
@WorkspaceIsNullable()
paidAmount: number | null;

/** Số tiền còn lại cần thanh toán */
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.remainingAmount,
  type: FieldMetadataType.NUMBER,
  label: 'Remaining Amount',
  description: 'Remaining amount to be paid',
  icon: 'IconCashBanknote',
})
@WorkspaceIsNullable()
remainingAmount: number | null;

/** Trạng thái thanh toán */
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.paymentStatus,
  type: FieldMetadataType.SELECT,
  label: 'Payment Status',  
  description: 'Payment status of the order',
  icon: 'IconCreditCard',
  options: PAYMENT_STATUS_OPTIONS.options,
})
@WorkspaceIsNullable()
paymentStatus: string | null;
```

### 1.2 Định nghĩa Payment Status

```typescript
// File: packages/twenty-server/src/mkt-core/order/constants/payment-status.constants.ts

export enum PAYMENT_STATUS {
  /** Chưa thanh toán */
  PENDING = 'PENDING',
  /** Thanh toán một phần */
  PARTIAL = 'PARTIAL',
  /** Đã thanh toán đủ */
  PAID = 'PAID',
  /** Thanh toán thừa */
  OVERPAID = 'OVERPAID',
}

export const PAYMENT_STATUS_OPTIONS = {
  options: [
    { value: PAYMENT_STATUS.PENDING, label: 'Chưa thanh toán', color: 'gray' },
    { value: PAYMENT_STATUS.PARTIAL, label: 'Thanh toán một phần', color: 'orange' },
    { value: PAYMENT_STATUS.PAID, label: 'Đã thanh toán', color: 'green' },
    { value: PAYMENT_STATUS.OVERPAID, label: 'Thanh toán thừa', color: 'blue' },
  ],
};
```

### 1.3 Thêm Field IDs

```typescript
// File: packages/twenty-server/src/mkt-core/constants/mkt-field-ids.ts

// Thêm vào MKT_ORDER_FIELD_IDS
export const MKT_ORDER_FIELD_IDS = {
  // ... existing fields
  paidAmount: 'mkt-order-paid-amount-field-id',
  remainingAmount: 'mkt-order-remaining-amount-field-id',
  paymentStatus: 'mkt-order-payment-status-field-id',
};
```

---

## Phase 2: Order Payment Calculation Service

### 2.1 Tạo Service mới

```typescript
// File: packages/twenty-server/src/mkt-core/order/services/core/order-payment-calculation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';

type PaymentSummary = {
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PAYMENT_STATUS;
};

type ConfirmedPayment = {
  amount: number;
  refundedAmount?: number;
};

@Injectable()
export class OrderPaymentCalculationService {
  private readonly logger = new Logger(OrderPaymentCalculationService.name);

  /**
   * Tính toán payment summary từ danh sách payments đã confirm
   */
  calculatePaymentSummary(
    totalAmount: number,
    confirmedPayments: ConfirmedPayment[],
  ): PaymentSummary {
    // Tính tổng đã thanh toán (trừ refund)
    const paidAmount = confirmedPayments.reduce((sum, payment) => {
      const effectiveAmount = MoneyUtils.subtract(
        payment.amount,
        payment.refundedAmount ?? 0,
      ).toNumber();
      return MoneyUtils.add(sum, effectiveAmount).toNumber();
    }, 0);

    // Tính số còn lại
    const remainingAmount = MoneyUtils.subtract(totalAmount, paidAmount).toNumber();

    // Xác định trạng thái
    const paymentStatus = this.determinePaymentStatus(paidAmount, remainingAmount);

    return { paidAmount, remainingAmount, paymentStatus };
  }

  /**
   * Xác định payment status dựa trên số tiền
   */
  private determinePaymentStatus(
    paidAmount: number,
    remainingAmount: number,
  ): PAYMENT_STATUS {
    if (remainingAmount < 0) {
      return PAYMENT_STATUS.OVERPAID;
    }
    if (remainingAmount === 0) {
      return PAYMENT_STATUS.PAID;
    }
    if (paidAmount > 0) {
      return PAYMENT_STATUS.PARTIAL;
    }
    return PAYMENT_STATUS.PENDING;
  }

  /**
   * Check nếu order đủ điều kiện tạo license
   */
  isEligibleForLicenseCreation(
    paymentStatus: PAYMENT_STATUS,
    partialPaymentPolicy?: string,
    paidPercent?: number,
    thresholdPercent?: number,
  ): boolean {
    // Đã thanh toán đủ hoặc thừa
    if (paymentStatus === PAYMENT_STATUS.PAID || paymentStatus === PAYMENT_STATUS.OVERPAID) {
      return true;
    }

    // Thanh toán một phần với policy cho phép
    if (paymentStatus === PAYMENT_STATUS.PARTIAL && partialPaymentPolicy) {
      if (partialPaymentPolicy === 'THRESHOLD' && paidPercent && thresholdPercent) {
        return paidPercent >= thresholdPercent;
      }
      if (partialPaymentPolicy === 'PRO_RATA') {
        return true; // Tạo license tỷ lệ với số tiền đã trả
      }
    }

    return false;
  }
}
```

---

## Phase 3: Update Order Repository

### 3.1 Thêm methods mới

```typescript
// File: packages/twenty-server/src/mkt-core/order/repositories/mkt-order.repository.ts

// Thêm methods:

/**
 * Update payment amounts cho order
 */
async updatePaymentAmounts(
  workspaceId: string,
  orderId: string,
  data: {
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: string;
  },
): Promise<void> {
  const repository = await this.getRepository(workspaceId);
  await repository.update(orderId, {
    paidAmount: data.paidAmount,
    remainingAmount: data.remainingAmount,
    paymentStatus: data.paymentStatus,
    updatedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
  });
}

/**
 * Get order with payment summary
 */
async findByIdWithPaymentSummary(
  workspaceId: string,
  orderId: string,
): Promise<MktOrderWorkspaceEntity | null> {
  const repository = await this.getRepository(workspaceId);
  return repository.findOne({
    where: { id: orderId },
    relations: ['mktPayments'], // Relation to Payment entity (Phase 2)
  });
}
```

---

## Phase 4: Update CreateOrderSaga

### 4.1 Initialize payment fields khi tạo order

```typescript
// File: packages/twenty-server/src/mkt-core/order/orchestration/steps/create-order.step.ts

// Trong method create order:
const savedOrder = await this.orderRepository.create(
  context.workspaceId,
  {
    name: `Đơn hàng ${orderCode}`,
    orderCode,
    status: initialStatus,
    mktCustomerId: input.customerId,
    currency: input.currency ?? 'VND',
    note: input.note,
    requireContract: input.requireContract ?? false,
    trialLicense: isTrialLicense,
    // Initialize amounts
    subtotal: 0,
    tax: 0,
    discount: 0,
    totalAmount: 0,
    // === NEW: Initialize payment fields ===
    paidAmount: 0,
    remainingAmount: 0, // Will be set = totalAmount after calculation
    paymentStatus: PAYMENT_STATUS.PENDING,
  },
);
```

### 4.2 Update remainingAmount sau khi tính totalAmount

```typescript
// File: packages/twenty-server/src/mkt-core/order/orchestration/steps/create-order-items.step.ts

// Sau khi updateOrderTotals:
private async updateOrderTotals(
  context: CreateOrderSagaContext,
  totals: OrderCalculatedValues,
): Promise<void> {
  if (!context.orderId) return;

  await this.orderRepository.update(
    context.workspaceId,
    context.orderId,
    {
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      totalAmount: totals.totalAmount,
      // === NEW: Set remainingAmount = totalAmount ===
      remainingAmount: totals.totalAmount,
    },
  );
}
```

---

## Phase 5: GraphQL Types Update

### 5.1 Output Type Extension

```typescript
// File: packages/twenty-server/src/mkt-core/order/dto/order.output.ts

@ObjectType()
export class OrderPaymentSummaryOutput {
  @Field(() => Number)
  totalAmount: number;

  @Field(() => Number)
  paidAmount: number;

  @Field(() => Number)
  remainingAmount: number;

  @Field(() => String)
  paymentStatus: string;

  @Field(() => Number)
  paidPercent: number;
}
```

### 5.2 Query Resolver Extension

```typescript
// File: packages/twenty-server/src/mkt-core/order/resolvers/order-query.resolver.ts

@ResolveField(() => OrderPaymentSummaryOutput)
async paymentSummary(
  @Parent() order: MktOrderWorkspaceEntity,
): Promise<OrderPaymentSummaryOutput> {
  const paidPercent = order.totalAmount > 0
    ? MoneyUtils.percentage(order.paidAmount ?? 0, order.totalAmount).toNumber()
    : 0;

  return {
    totalAmount: order.totalAmount ?? 0,
    paidAmount: order.paidAmount ?? 0,
    remainingAmount: order.remainingAmount ?? 0,
    paymentStatus: order.paymentStatus ?? PAYMENT_STATUS.PENDING,
    paidPercent,
  };
}
```

---

## Phase 6: License Creation Trigger Update

### 6.1 Update ConfirmOrderSaga

Khi nhận payment confirmation, check nếu đủ điều kiện tạo license:

```typescript
// File: packages/twenty-server/src/mkt-core/order/orchestration/steps/confirm-order/create-licenses-on-confirm.step.ts

shouldSkip(context: SagaContext, input: ConfirmOrderInput): boolean {
  const typedContext = context as ConfirmOrderSagaContext;
  const order = typedContext.currentOrder;

  // Skip nếu không phải ACCOUNTING_CONFIRMED
  if (input.action !== ORDER_ACTION.ACCOUNTING_CONFIRMED) {
    return true;
  }

  // Skip cho TRIAL orders
  if (typedContext.previousStatus === ORDER_STATUS.TRIAL) {
    return true;
  }

  // === NEW: Check payment status ===
  // Chỉ tạo license khi paymentStatus = PAID hoặc OVERPAID
  const paymentStatus = order?.paymentStatus as PAYMENT_STATUS;
  if (paymentStatus !== PAYMENT_STATUS.PAID && paymentStatus !== PAYMENT_STATUS.OVERPAID) {
    this.logger.debug(
      `Skipping: Payment status "${paymentStatus}" is not eligible for license creation`,
    );
    return true;
  }

  return false;
}
```

---

## Implementation Checklist

### Phase 1: Order Entity Extension
- [ ] Tạo `payment-status.constants.ts`
- [ ] Thêm field IDs vào `mkt-field-ids.ts`
- [ ] Thêm fields vào `mkt-order.workspace-entity.ts`
- [ ] Run database migration

### Phase 2: Services
- [ ] Tạo `OrderPaymentCalculationService`
- [ ] Register trong `MktOrderModule`

### Phase 3: Repository
- [ ] Thêm `updatePaymentAmounts` method
- [ ] Thêm `findByIdWithPaymentSummary` method

### Phase 4: Saga Updates
- [ ] Update `create-order.step.ts` - initialize payment fields
- [ ] Update `create-order-items.step.ts` - set remainingAmount

### Phase 5: GraphQL
- [ ] Tạo `OrderPaymentSummaryOutput` type
- [ ] Thêm `paymentSummary` resolver field

### Phase 6: License Creation Logic
- [ ] Update `create-licenses-on-confirm.step.ts` - check payment status

---

## Database Migration

```sql
-- Add payment fields to mkt_order table
ALTER TABLE "mkt_order"
ADD COLUMN "paidAmount" numeric DEFAULT 0,
ADD COLUMN "remainingAmount" numeric DEFAULT 0,
ADD COLUMN "paymentStatus" varchar(50) DEFAULT 'PENDING';

-- Update existing orders
UPDATE "mkt_order"
SET "remainingAmount" = "totalAmount",
    "paymentStatus" = 'PENDING'
WHERE "paymentStatus" IS NULL;

-- Index for queries
CREATE INDEX "idx_mkt_order_payment_status" ON "mkt_order" ("paymentStatus");
```

---

## Testing Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Create order | `paidAmount=0`, `remainingAmount=totalAmount`, `paymentStatus=PENDING` |
| Add 1 payment (partial) | `paymentStatus=PARTIAL`, license NOT created |
| Add payments = total | `paymentStatus=PAID`, trigger license creation |
| Add payments > total | `paymentStatus=OVERPAID`, license created |
| Refund partial | Recalculate, update `paymentStatus` accordingly |

---

## Next Steps (Payment Module)

Sau khi hoàn thành Order module, triển khai Payment module:
1. `MktPaymentWorkspaceEntity` - Payment entity
2. `MktPaymentHistoryWorkspaceEntity` - Audit trail
3. `PaymentService` - CRUD operations
4. `PaymentConfirmationService` - Confirm/Reject logic
5. Webhook integration (SEPay, etc.)

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-24 | 1.0.0 | Initial Order implementation plan |
