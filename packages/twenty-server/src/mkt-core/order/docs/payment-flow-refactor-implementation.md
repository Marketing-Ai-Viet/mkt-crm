# Implementation Plan: Refactor Payment Flow

## Mục lục

1. [Tổng quan thay đổi](#1-tổng-quan-thay-đổi)
2. [So sánh luồng hiện tại vs luồng mới](#2-so-sánh-luồng-hiện-tại-vs-luồng-mới)
3. [Thay đổi Schema/Entity](#3-thay-đổi-schemaentity)
4. [Thay đổi Constants & Enums](#4-thay-đổi-constants--enums)
5. [Thay đổi Services](#5-thay-đổi-services)
6. [Thay đổi Saga/Steps](#6-thay-đổi-sagasteps)
7. [Thêm Cronjobs](#7-thêm-cronjobs)
8. [Thay đổi State Machine](#8-thay-đổi-state-machine)
9. [API/Resolver Changes](#9-apiresolver-changes)
10. [Configuration System](#10-configuration-system)
11. [Migration Strategy](#11-migration-strategy)
12. [Testing Plan](#12-testing-plan)

---

## 1. Tổng quan thay đổi

### 1.1. Điểm khác biệt chính

| Aspect | Luồng hiện tại | Luồng mới |
|--------|---------------|-----------|
| **License creation** | Sau khi thanh toán được xác nhận | Ngay khi đơn hàng CONFIRMED |
| **License initial status** | ACTIVE | PENDING_PAYMENT (sử dụng được) |
| **Payment deadline** | Không có | Configurable (default 24h) |
| **Overdue handling** | OVERDUE status (order only) | LOCKED status + khóa license trên Server |
| **Order flow** | DRAFT → PENDING_PAYMENT → CONFIRMED → COMPLETED | DRAFT → CONFIRMED → PROCESSING → COMPLETED/LOCKED |

### 1.2. Luồng mới tổng quan

```
┌──────────┐    ┌──────────┐    ┌─────────────────────────────────┐
│  DRAFT   │ →  │ CONFIRMED│ →  │ PROCESSING + License cấp ngay  │
└──────────┘    └──────────┘    │ (License: PENDING_PAYMENT)     │
                                └───────────────┬─────────────────┘
                                                │
                        ┌───────────────────────┴────────────────────┐
                        ↓                                            ↓
               ┌────────────────┐                          ┌─────────────────┐
               │ THANH TOÁN OK  │                          │    QUÁ HẠN      │
               │ → License: ACTIVE │                       │ → License: LOCKED│
               │ → Order: COMPLETED│                       │ → Order: LOCKED  │
               └────────────────┘                          └─────────────────┘
                                                                    │
                                                           Thanh toán muộn
                                                                    ↓
                                                           ┌─────────────────┐
                                                           │ License: ACTIVE │
                                                           │ Order: COMPLETED│
                                                           └─────────────────┘
```

---

## 2. So sánh luồng hiện tại vs luồng mới

### 2.1. Luồng hiện tại (Current Implementation)

**File references:**
- `order/constants/order-status.constants.ts`
- `order/orchestration/saga/confirm-order.saga.ts`
- `order/services/core/order-payment-calculation.service.ts`

```typescript
// Current order status flow
DRAFT → PENDING_PAYMENT → CONFIRMED → COMPLETED

// Current license creation trigger
// File: order/orchestration/steps/create-licenses-on-confirm.step.ts
// License được tạo SAU KHI accounting confirm payment
```

### 2.2. Luồng mới (New Implementation)

```typescript
// New order status flow
DRAFT → CONFIRMED → PROCESSING → COMPLETED | LOCKED

// New license creation trigger
// License được tạo NGAY KHI order CONFIRMED
// License status: PENDING_PAYMENT (usable)
// Nếu quá hạn: License → LOCKED, Order → LOCKED
// Nếu thanh toán sau khi LOCKED: License → ACTIVE, Order → COMPLETED
```

---

## 3. Thay đổi Schema/Entity

### 3.1. MktOrderWorkspaceEntity

**File:** `order/objects/mkt-order.workspace-entity.ts`

```typescript
// === THÊM FIELDS MỚI ===

@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktOrder.paymentDeadline,
  type: FieldMetadataType.DATE_TIME,
  label: 'Payment Deadline',
  description: 'Hạn thanh toán',
  icon: 'IconClock',
})
@WorkspaceIsNullable()
paymentDeadline: Date | null;

@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktOrder.paymentDeadlineSource,
  type: FieldMetadataType.SELECT,
  label: 'Payment Deadline Source',
  description: 'Nguồn cấu hình deadline',
  icon: 'IconSettings',
  options: [
    { value: 'GLOBAL', label: 'Global Setting', position: 0, color: 'gray' },
    { value: 'PRODUCT', label: 'Product Config', position: 1, color: 'blue' },
    { value: 'CUSTOMER_TYPE', label: 'Customer Type', position: 2, color: 'green' },
    { value: 'RESELLER_TIER', label: 'Reseller Tier', position: 3, color: 'purple' },
    { value: 'MANUAL', label: 'Manual Override', position: 4, color: 'orange' },
  ],
})
@WorkspaceIsNullable()
paymentDeadlineSource: string | null;

@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktOrder.lockedAt,
  type: FieldMetadataType.DATE_TIME,
  label: 'Locked At',
  description: 'Thời điểm bị khóa do quá hạn',
  icon: 'IconLock',
})
@WorkspaceIsNullable()
lockedAt: Date | null;

@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktOrder.lockedReason,
  type: FieldMetadataType.TEXT,
  label: 'Locked Reason',
  description: 'Lý do bị khóa',
  icon: 'IconAlertTriangle',
})
@WorkspaceIsNullable()
lockedReason: string | null;

@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktOrder.remindersSent,
  type: FieldMetadataType.NUMBER,
  label: 'Reminders Sent',
  description: 'Số lần đã gửi nhắc nhở',
  icon: 'IconBell',
  defaultValue: 0,
})
remindersSent: number;

@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktOrder.lastReminderAt,
  type: FieldMetadataType.DATE_TIME,
  label: 'Last Reminder At',
  description: 'Thời điểm gửi nhắc nhở cuối',
  icon: 'IconBellRinging',
})
@WorkspaceIsNullable()
lastReminderAt: Date | null;
```

### 3.2. MktLicenseWorkspaceEntity

**File:** `license/objects/mkt-license.workspace-entity.ts`

```typescript
// === THÊM/SỬA FIELDS ===

// Thêm PENDING_PAYMENT vào LICENSE_STATUS options
@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktLicense.status,
  type: FieldMetadataType.SELECT,
  label: 'Status',
  options: [
    { value: 'PENDING_PAYMENT', label: 'Pending Payment', position: 0, color: 'yellow' },
    { value: 'ACTIVE', label: 'Active', position: 1, color: 'green' },
    { value: 'INACTIVE', label: 'Inactive', position: 2, color: 'gray' },
    { value: 'EXPIRED', label: 'Expired', position: 3, color: 'red' },
    { value: 'LOCKED', label: 'Locked', position: 4, color: 'red' },
    { value: 'TRIAL', label: 'Trial', position: 5, color: 'blue' },
    { value: 'RENEWING', label: 'Renewing', position: 6, color: 'orange' },
  ],
})
status: string;

// Thêm payment deadline cho license
@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktLicense.paymentDeadline,
  type: FieldMetadataType.DATE_TIME,
  label: 'Payment Deadline',
  description: 'Hạn thanh toán license',
  icon: 'IconClock',
})
@WorkspaceIsNullable()
paymentDeadline: Date | null;

@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktLicense.lockedAt,
  type: FieldMetadataType.DATE_TIME,
  label: 'Locked At',
  description: 'Thời điểm bị khóa',
  icon: 'IconLock',
})
@WorkspaceIsNullable()
lockedAt: Date | null;

@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktLicense.lockedReason,
  type: FieldMetadataType.TEXT,
  label: 'Locked Reason',
  description: 'Lý do bị khóa',
  icon: 'IconAlertTriangle',
})
@WorkspaceIsNullable()
lockedReason: string | null;
```

### 3.3. MktInvoiceWorkspaceEntity (nếu có)

**File:** `invoice/objects/mkt-invoice.workspace-entity.ts`

```typescript
// Thêm OVERDUE status vào options
@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktInvoice.status,
  type: FieldMetadataType.SELECT,
  options: [
    { value: 'DRAFT', label: 'Draft', position: 0 },
    { value: 'PENDING_PAYMENT', label: 'Pending Payment', position: 1 },
    { value: 'PAID', label: 'Paid', position: 2 },
    { value: 'OVERDUE', label: 'Overdue', position: 3 },  // NEW
    { value: 'CANCELLED', label: 'Cancelled', position: 4 },
    { value: 'REFUNDED', label: 'Refunded', position: 5 },
  ],
})
status: string;

@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktInvoice.paymentDeadline,
  type: FieldMetadataType.DATE_TIME,
  label: 'Payment Deadline',
  description: 'Hạn thanh toán',
})
@WorkspaceIsNullable()
paymentDeadline: Date | null;
```

### 3.4. Field IDs cần thêm

**File:** `constants/mkt-field-ids.ts`

```typescript
export const MKT_FIELD_IDS = {
  mktOrder: {
    // ... existing fields
    paymentDeadline: '20000000-0000-0000-0000-000000000101',
    paymentDeadlineSource: '20000000-0000-0000-0000-000000000102',
    lockedAt: '20000000-0000-0000-0000-000000000103',
    lockedReason: '20000000-0000-0000-0000-000000000104',
    remindersSent: '20000000-0000-0000-0000-000000000105',
    lastReminderAt: '20000000-0000-0000-0000-000000000106',
  },
  mktLicense: {
    // ... existing fields
    paymentDeadline: '20000000-0000-0000-0000-000000000201',
    lockedAt: '20000000-0000-0000-0000-000000000202',
    lockedReason: '20000000-0000-0000-0000-000000000203',
  },
  mktInvoice: {
    // ... existing fields
    paymentDeadline: '20000000-0000-0000-0000-000000000301',
  },
};
```

---

## 4. Thay đổi Constants & Enums

### 4.1. Order Status

**File:** `order/constants/order-status.constants.ts`

```typescript
// === SỬA ORDER_STATUS ===
export const ORDER_STATUS = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',           // Đã xác nhận, sẵn sàng tạo license
  PROCESSING: 'PROCESSING',         // NEW: Đang xử lý, license đã cấp, chờ thanh toán
  COMPLETED: 'COMPLETED',
  LOCKED: 'LOCKED',                 // NEW: Bị khóa do quá hạn thanh toán
  TRIAL: 'TRIAL',
  TRIAL_EXPIRED: 'TRIAL_EXPIRED',
  CANCELED: 'CANCELED',
  OVERDUE: 'OVERDUE',               // DEPRECATED - sử dụng LOCKED thay thế
  BLOCKED: 'BLOCKED',
  REFUND: 'REFUND',
  REFUND_PARTIAL: 'REFUND_PARTIAL',
} as const;

// === SỬA VALID_STATUS_TRANSITIONS ===
export const VALID_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  [ORDER_STATUS.DRAFT]: [
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.TRIAL,
    ORDER_STATUS.CANCELED,
  ],
  [ORDER_STATUS.CONFIRMED]: [
    ORDER_STATUS.PROCESSING,        // NEW: confirm → processing (sau khi tạo license)
    ORDER_STATUS.CANCELED,
  ],
  [ORDER_STATUS.PROCESSING]: [      // NEW
    ORDER_STATUS.COMPLETED,         // Thanh toán OK
    ORDER_STATUS.LOCKED,            // Quá hạn
    ORDER_STATUS.CANCELED,
    ORDER_STATUS.REFUND,
    ORDER_STATUS.REFUND_PARTIAL,
  ],
  [ORDER_STATUS.LOCKED]: [          // NEW
    ORDER_STATUS.COMPLETED,         // Thanh toán muộn → unlock
    ORDER_STATUS.CANCELED,
  ],
  [ORDER_STATUS.COMPLETED]: [
    ORDER_STATUS.REFUND,
    ORDER_STATUS.REFUND_PARTIAL,
  ],
  // ... giữ nguyên các transition khác cho TRIAL, TRIAL_EXPIRED, etc.
} as const;
```

### 4.2. Order Action

**File:** `order/constants/order-action.constants.ts`

```typescript
export const ORDER_ACTION = {
  NEW_ORDER: 'NEW_ORDER',
  TRIAL: 'TRIAL',
  LICENSE_RENEWING: 'LICENSE_RENEWING',
  CHANGE_VARIANT: 'CHANGE_VARIANT',
  CONFIRM_ORDER: 'CONFIRM_ORDER',           // Xác nhận đơn hàng (tạo license)
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',   // Thanh toán được xác nhận
  LOCK_OVERDUE: 'LOCK_OVERDUE',             // Khóa do quá hạn
  UNLOCK_AFTER_PAYMENT: 'UNLOCK_AFTER_PAYMENT', // Mở khóa sau thanh toán muộn
  COMPLETE: 'COMPLETE',
  CANCEL: 'CANCEL',
  BLOCK: 'BLOCK',
  TRIAL_TO_PAID: 'TRIAL_TO_PAID',
  REFUND: 'REFUND',
  REFUND_PARTIAL: 'REFUND_PARTIAL',
} as const;
```

### 4.3. License Status

**File:** `license/constants/license-status.constants.ts`

```typescript
export const LICENSE_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',   // NEW: Đã cấp, chờ thanh toán (sử dụng được)
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
  LOCKED: 'LOCKED',                     // Bị khóa do quá hạn thanh toán
  TRIAL: 'TRIAL',
  RENEWING: 'RENEWING',
} as const;

// License có thể sử dụng (check trên MKT Server)
export const USABLE_LICENSE_STATUSES = [
  LICENSE_STATUS.PENDING_PAYMENT,
  LICENSE_STATUS.ACTIVE,
  LICENSE_STATUS.TRIAL,
] as const;
```

### 4.4. Payment Deadline Config

**File:** `order/constants/payment-deadline.constants.ts` (NEW)

```typescript
export const PAYMENT_DEADLINE_SOURCE = {
  GLOBAL: 'GLOBAL',
  PRODUCT: 'PRODUCT',
  CUSTOMER_TYPE: 'CUSTOMER_TYPE',
  RESELLER_TIER: 'RESELLER_TIER',
  MANUAL: 'MANUAL',
} as const;

export const PAYMENT_DEADLINE_CONFIG = {
  DEFAULT_HOURS: 24,

  // Reminder schedule (hours before deadline)
  REMINDER_SCHEDULE: [6, 2, 0.5] as const, // 6h, 2h, 30min

  // Cronjob interval
  CHECK_INTERVAL_CRON: '0 */1 * * * *', // Mỗi 1 phút check

  // Max reminders to send
  MAX_REMINDERS: 3,
} as const;

// Payment deadline by customer type (hours)
export const PAYMENT_DEADLINE_BY_CUSTOMER_TYPE: Record<string, number> = {
  VIP: 72,
  ENTERPRISE: 48,
  STANDARD: 24,
} as const;

// Payment deadline by reseller tier (hours)
export const PAYMENT_DEADLINE_BY_RESELLER_TIER: Record<string, number> = {
  DIAMOND: 168,   // 7 days
  GOLD: 120,      // 5 days
  SILVER: 72,     // 3 days
  BRONZE: 48,     // 2 days
} as const;
```

---

## 5. Thay đổi Services

### 5.1. OrderConfirmService (NEW)

**File:** `order/services/core/order-confirm.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

@Injectable()
export class OrderConfirmService {
  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly licenseIntegrationService: OrderLicenseIntegrationService,
    private readonly invoiceService: MktInvoiceService,
    private readonly paymentDeadlineService: PaymentDeadlineService,
    private readonly eventService: OrderEventService,
  ) {}

  /**
   * Xác nhận đơn hàng: Tạo Invoice + Cấp License ngay
   * Order: DRAFT/CONFIRMED → PROCESSING
   */
  async confirmOrder(
    orderId: string,
    workspaceId: string,
    options?: { manualDeadlineHours?: number },
  ): Promise<ConfirmOrderResult> {
    const order = await this.orderRepository.findById(orderId, workspaceId);

    // 1. Validate order can be confirmed
    this.validateOrderForConfirm(order);

    // 2. Calculate payment deadline
    const deadline = await this.paymentDeadlineService.calculateDeadline(
      order,
      workspaceId,
      options?.manualDeadlineHours,
    );

    // 3. Create Invoice with deadline
    const invoice = await this.invoiceService.createFromOrder(order, {
      paymentDeadline: deadline.deadline,
      status: INVOICE_STATUS.PENDING_PAYMENT,
    });

    // 4. Create Licenses with PENDING_PAYMENT status
    const licenses = await this.licenseIntegrationService.createLicensesForOrder(
      order,
      workspaceId,
      {
        status: LICENSE_STATUS.PENDING_PAYMENT,
        paymentDeadline: deadline.deadline,
      },
    );

    // 5. Update order status → PROCESSING
    await this.orderRepository.update(orderId, workspaceId, {
      status: ORDER_STATUS.PROCESSING,
      paymentDeadline: deadline.deadline,
      paymentDeadlineSource: deadline.source,
      licenseStatus: LICENSE_CREATION_STATUS.CREATED,
    });

    // 6. Schedule reminder jobs
    await this.schedulePaymentReminders(order, deadline.deadline);

    // 7. Emit event
    await this.eventService.emitOrderConfirmed(order, { invoice, licenses });

    return {
      order,
      invoice,
      licenses,
      paymentDeadline: deadline.deadline,
    };
  }

  private validateOrderForConfirm(order: MktOrder): void {
    const allowedStatuses = [ORDER_STATUS.DRAFT, ORDER_STATUS.CONFIRMED];
    if (!allowedStatuses.includes(order.status)) {
      throw new OrderValidationException(
        `Cannot confirm order with status: ${order.status}`,
      );
    }
  }

  private async schedulePaymentReminders(
    order: MktOrder,
    deadline: Date,
  ): Promise<void> {
    const now = DateTimeUtils.now();
    const deadlineTime = DateTimeUtils.fromDate(deadline);

    for (const hoursBeforeDeadline of PAYMENT_DEADLINE_CONFIG.REMINDER_SCHEDULE) {
      const reminderTime = DateTimeUtils.subtract(deadlineTime, {
        hours: hoursBeforeDeadline
      });

      if (DateTimeUtils.isAfter(reminderTime, now)) {
        await this.queueService.add(
          PAYMENT_REMINDER_JOB,
          { orderId: order.id, reminderNumber: hoursBeforeDeadline },
          { delay: DateTimeUtils.toMillis(reminderTime) - DateTimeUtils.toMillis(now) },
        );
      }
    }
  }
}
```

### 5.2. PaymentDeadlineService (NEW)

**File:** `order/services/core/payment-deadline.service.ts`

```typescript
@Injectable()
export class PaymentDeadlineService {
  constructor(
    private readonly configService: ConfigService,
    private readonly customerService: CustomerService,
    private readonly productService: ProductService,
  ) {}

  /**
   * Calculate payment deadline based on priority:
   * 1. Manual override (highest)
   * 2. Reseller tier
   * 3. Customer type
   * 4. Product config
   * 5. Global setting (lowest)
   */
  async calculateDeadline(
    order: MktOrder,
    workspaceId: string,
    manualHours?: number,
  ): Promise<PaymentDeadlineResult> {
    const now = DateTimeUtils.now();

    // 1. Manual override
    if (manualHours !== undefined) {
      return {
        deadline: DateTimeUtils.toDate(DateTimeUtils.add(now, { hours: manualHours })),
        source: PAYMENT_DEADLINE_SOURCE.MANUAL,
        hours: manualHours,
      };
    }

    // 2. Check reseller tier
    const customer = await this.customerService.findById(
      order.mktCustomerId,
      workspaceId,
    );

    if (customer?.resellerTier) {
      const hours = PAYMENT_DEADLINE_BY_RESELLER_TIER[customer.resellerTier];
      if (hours) {
        return {
          deadline: DateTimeUtils.toDate(DateTimeUtils.add(now, { hours })),
          source: PAYMENT_DEADLINE_SOURCE.RESELLER_TIER,
          hours,
        };
      }
    }

    // 3. Check customer type
    if (customer?.customerType) {
      const hours = PAYMENT_DEADLINE_BY_CUSTOMER_TYPE[customer.customerType];
      if (hours) {
        return {
          deadline: DateTimeUtils.toDate(DateTimeUtils.add(now, { hours })),
          source: PAYMENT_DEADLINE_SOURCE.CUSTOMER_TYPE,
          hours,
        };
      }
    }

    // 4. Check product config (lấy max deadline từ các products trong order)
    const productDeadlines = await this.getProductDeadlines(order, workspaceId);
    if (productDeadlines.length > 0) {
      const maxHours = Math.max(...productDeadlines);
      return {
        deadline: DateTimeUtils.toDate(DateTimeUtils.add(now, { hours: maxHours })),
        source: PAYMENT_DEADLINE_SOURCE.PRODUCT,
        hours: maxHours,
      };
    }

    // 5. Global setting
    const globalHours = this.configService.get<number>(
      'MKT_PAYMENT_DEADLINE_HOURS',
      PAYMENT_DEADLINE_CONFIG.DEFAULT_HOURS,
    );

    return {
      deadline: DateTimeUtils.toDate(DateTimeUtils.add(now, { hours: globalHours })),
      source: PAYMENT_DEADLINE_SOURCE.GLOBAL,
      hours: globalHours,
    };
  }

  private async getProductDeadlines(
    order: MktOrder,
    workspaceId: string,
  ): Promise<number[]> {
    // Lấy payment deadline config từ các products trong order items
    const productIds = order.orderItems
      ?.map(item => item.mktProductId)
      .filter(Boolean) ?? [];

    if (productIds.length === 0) return [];

    const products = await this.productService.findByIds(productIds, workspaceId);
    return products
      .map(p => p.paymentDeadlineHours)
      .filter((h): h is number => h !== null && h !== undefined);
  }
}

type PaymentDeadlineResult = {
  deadline: Date;
  source: string;
  hours: number;
};
```

### 5.3. OrderLockService (NEW)

**File:** `order/services/core/order-lock.service.ts`

```typescript
@Injectable()
export class OrderLockService {
  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly licenseIntegrationService: OrderLicenseIntegrationService,
    private readonly invoiceService: MktInvoiceService,
    private readonly eventService: OrderEventService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Khóa đơn hàng do quá hạn thanh toán
   */
  async lockOverdueOrder(
    orderId: string,
    workspaceId: string,
  ): Promise<LockOrderResult> {
    const order = await this.orderRepository.findById(orderId, workspaceId);

    // Validate
    if (order.status !== ORDER_STATUS.PROCESSING) {
      throw new OrderValidationException(
        `Cannot lock order with status: ${order.status}`,
      );
    }

    const now = DateTimeUtils.now();
    const reason = 'Payment overdue - deadline exceeded';

    // 1. Lock licenses on MKT Server
    const lockResults = await this.licenseIntegrationService.lockLicensesForOrder(
      order,
      workspaceId,
      {
        reason,
        lockedAt: DateTimeUtils.toDate(now),
      },
    );

    // 2. Update invoice → OVERDUE
    await this.invoiceService.updateStatusByOrder(
      orderId,
      workspaceId,
      INVOICE_STATUS.OVERDUE,
    );

    // 3. Update order → LOCKED
    await this.orderRepository.update(orderId, workspaceId, {
      status: ORDER_STATUS.LOCKED,
      lockedAt: DateTimeUtils.toDate(now),
      lockedReason: reason,
    });

    // 4. Notify
    await this.notificationService.sendLicenseLockedNotification(order);

    // 5. Emit event
    await this.eventService.emitOrderLocked(order, { reason });

    return {
      order,
      lockedLicenses: lockResults,
    };
  }

  /**
   * Mở khóa đơn hàng sau khi thanh toán muộn
   */
  async unlockAfterPayment(
    orderId: string,
    workspaceId: string,
    paymentInfo: PaymentConfirmation,
  ): Promise<UnlockOrderResult> {
    const order = await this.orderRepository.findById(orderId, workspaceId);

    // Validate
    if (order.status !== ORDER_STATUS.LOCKED) {
      throw new OrderValidationException(
        `Cannot unlock order with status: ${order.status}`,
      );
    }

    // 1. Unlock licenses on MKT Server
    const unlockResults = await this.licenseIntegrationService.unlockLicensesForOrder(
      order,
      workspaceId,
    );

    // 2. Update invoice → PAID
    await this.invoiceService.updateStatusByOrder(
      orderId,
      workspaceId,
      INVOICE_STATUS.PAID,
    );

    // 3. Update order → COMPLETED
    await this.orderRepository.update(orderId, workspaceId, {
      status: ORDER_STATUS.COMPLETED,
      paidAmount: order.totalAmount,
      remainingAmount: 0,
      paymentStatus: PAYMENT_STATUS.PAID,
    });

    // 4. Notify
    await this.notificationService.sendLicenseUnlockedNotification(order);

    // 5. Emit event
    await this.eventService.emitOrderUnlocked(order, { paymentInfo });

    return {
      order,
      unlockedLicenses: unlockResults,
    };
  }
}
```

### 5.4. OrderPaymentService (Refactor)

**File:** `order/services/core/order-payment.service.ts`

```typescript
@Injectable()
export class OrderPaymentService {
  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderLockService: OrderLockService,
    private readonly paymentCalculationService: OrderPaymentCalculationService,
    private readonly licenseIntegrationService: OrderLicenseIntegrationService,
  ) {}

  /**
   * Xác nhận thanh toán cho đơn hàng
   * Xử lý cả 3 luồng: SEPAY (auto), BANK_TRANSFER (sales), CASH (accounting)
   */
  async confirmPayment(
    orderId: string,
    workspaceId: string,
    paymentInfo: PaymentConfirmationInput,
  ): Promise<PaymentConfirmResult> {
    const order = await this.orderRepository.findById(orderId, workspaceId);

    // Case 1: Order đang PROCESSING (chưa quá hạn)
    if (order.status === ORDER_STATUS.PROCESSING) {
      return this.confirmPaymentForProcessingOrder(order, workspaceId, paymentInfo);
    }

    // Case 2: Order đã bị LOCKED (quá hạn)
    if (order.status === ORDER_STATUS.LOCKED) {
      return this.confirmPaymentForLockedOrder(order, workspaceId, paymentInfo);
    }

    throw new OrderValidationException(
      `Cannot confirm payment for order with status: ${order.status}`,
    );
  }

  private async confirmPaymentForProcessingOrder(
    order: MktOrder,
    workspaceId: string,
    paymentInfo: PaymentConfirmationInput,
  ): Promise<PaymentConfirmResult> {
    // 1. Update payment record
    await this.updatePaymentRecord(order, paymentInfo);

    // 2. Calculate payment summary
    const summary = await this.paymentCalculationService.recalculateFromPayments(
      order.totalAmount,
      await this.getConfirmedPayments(order.id, workspaceId),
    );

    // 3. Update license status → ACTIVE
    await this.licenseIntegrationService.activateLicensesForOrder(
      order,
      workspaceId,
    );

    // 4. Update invoice → PAID
    // 5. Update order → COMPLETED
    await this.orderRepository.update(order.id, workspaceId, {
      status: ORDER_STATUS.COMPLETED,
      paidAmount: summary.paidAmount,
      remainingAmount: summary.remainingAmount,
      paymentStatus: summary.paymentStatus,
    });

    return { order, summary };
  }

  private async confirmPaymentForLockedOrder(
    order: MktOrder,
    workspaceId: string,
    paymentInfo: PaymentConfirmationInput,
  ): Promise<PaymentConfirmResult> {
    // Delegate to unlock service
    const result = await this.orderLockService.unlockAfterPayment(
      order.id,
      workspaceId,
      paymentInfo,
    );

    return {
      order: result.order,
      summary: {
        paidAmount: order.totalAmount,
        remainingAmount: 0,
        paymentStatus: PAYMENT_STATUS.PAID,
        paidPercent: 100,
      },
    };
  }
}
```

---

## 6. Thay đổi Saga/Steps

### 6.1. ConfirmOrderSaga (Refactor)

**File:** `order/orchestration/saga/confirm-order.saga.ts`

```typescript
/**
 * REFACTORED: ConfirmOrderSaga
 *
 * Luồng cũ: Validate → UpdateStatus → CreateLicenses (after payment)
 * Luồng mới: Validate → CreateLicenses (PENDING_PAYMENT) → CreateInvoice → UpdateStatus → ScheduleReminders
 */
@Injectable()
export class ConfirmOrderSaga extends BaseSaga<ConfirmOrderContext> {
  constructor(
    private readonly validateOrderStep: ValidateOrderStep,
    private readonly validateTransitionStep: ValidateTransitionStep,
    private readonly createLicensesStep: CreateLicensesOnConfirmStep,
    private readonly createInvoiceStep: CreateInvoiceStep,
    private readonly calculateDeadlineStep: CalculatePaymentDeadlineStep,
    private readonly updateStatusStep: UpdateOrderStatusStep,
    private readonly scheduleRemindersStep: SchedulePaymentRemindersStep,
    private readonly emitEventStep: EmitOrderConfirmedEventStep,
  ) {
    super();
  }

  protected getSteps(): SagaStep<ConfirmOrderContext>[] {
    return [
      this.validateOrderStep,
      this.validateTransitionStep,
      this.calculateDeadlineStep,       // NEW
      this.createLicensesStep,          // Moved before payment
      this.createInvoiceStep,           // NEW
      this.updateStatusStep,
      this.scheduleRemindersStep,       // NEW
      this.emitEventStep,
    ];
  }
}
```

### 6.2. CreateLicensesOnConfirmStep (Refactor)

**File:** `order/orchestration/steps/create-licenses-on-confirm.step.ts`

```typescript
@Injectable()
export class CreateLicensesOnConfirmStep extends BaseSagaStep<ConfirmOrderContext> {
  constructor(
    private readonly licenseIntegrationService: OrderLicenseIntegrationService,
  ) {
    super();
  }

  async execute(context: ConfirmOrderContext): Promise<ConfirmOrderContext> {
    const { order, workspaceId, paymentDeadline } = context;

    // Tạo license với status PENDING_PAYMENT thay vì ACTIVE
    const licenses = await this.licenseIntegrationService.createLicensesForOrder(
      order,
      workspaceId,
      {
        status: LICENSE_STATUS.PENDING_PAYMENT,  // CHANGED
        paymentDeadline,                          // NEW
        // License sử dụng được ngay, nhưng sẽ bị khóa nếu không thanh toán
      },
    );

    return {
      ...context,
      createdLicenses: licenses,
    };
  }

  async compensate(context: ConfirmOrderContext): Promise<void> {
    // Rollback: Delete created licenses if saga fails
    if (context.createdLicenses?.length) {
      await this.licenseIntegrationService.deleteLicenses(
        context.createdLicenses.map(l => l.id),
        context.workspaceId,
      );
    }
  }
}
```

### 6.3. New Steps

**File:** `order/orchestration/steps/calculate-payment-deadline.step.ts`

```typescript
@Injectable()
export class CalculatePaymentDeadlineStep extends BaseSagaStep<ConfirmOrderContext> {
  constructor(
    private readonly paymentDeadlineService: PaymentDeadlineService,
  ) {
    super();
  }

  async execute(context: ConfirmOrderContext): Promise<ConfirmOrderContext> {
    const { order, workspaceId, manualDeadlineHours } = context;

    const deadlineResult = await this.paymentDeadlineService.calculateDeadline(
      order,
      workspaceId,
      manualDeadlineHours,
    );

    return {
      ...context,
      paymentDeadline: deadlineResult.deadline,
      paymentDeadlineSource: deadlineResult.source,
    };
  }
}
```

**File:** `order/orchestration/steps/create-invoice.step.ts`

```typescript
@Injectable()
export class CreateInvoiceStep extends BaseSagaStep<ConfirmOrderContext> {
  constructor(
    private readonly invoiceService: MktInvoiceService,
  ) {
    super();
  }

  async execute(context: ConfirmOrderContext): Promise<ConfirmOrderContext> {
    const { order, workspaceId, paymentDeadline } = context;

    const invoice = await this.invoiceService.createFromOrder(order, {
      status: INVOICE_STATUS.PENDING_PAYMENT,
      paymentDeadline,
    });

    return {
      ...context,
      createdInvoice: invoice,
    };
  }

  async compensate(context: ConfirmOrderContext): Promise<void> {
    if (context.createdInvoice) {
      await this.invoiceService.delete(
        context.createdInvoice.id,
        context.workspaceId,
      );
    }
  }
}
```

**File:** `order/orchestration/steps/schedule-payment-reminders.step.ts`

```typescript
@Injectable()
export class SchedulePaymentRemindersStep extends BaseSagaStep<ConfirmOrderContext> {
  constructor(
    private readonly queueService: MessageQueueService,
  ) {
    super();
  }

  async execute(context: ConfirmOrderContext): Promise<ConfirmOrderContext> {
    const { order, paymentDeadline } = context;
    const now = DateTimeUtils.now();
    const deadlineTime = DateTimeUtils.fromDate(paymentDeadline);

    const scheduledJobs: string[] = [];

    // Schedule reminders: 6h, 2h, 30min before deadline
    for (const hoursBeforeDeadline of PAYMENT_DEADLINE_CONFIG.REMINDER_SCHEDULE) {
      const reminderTime = DateTimeUtils.subtract(deadlineTime, {
        hours: hoursBeforeDeadline
      });

      if (DateTimeUtils.isAfter(reminderTime, now)) {
        const delayMs = DateTimeUtils.toMillis(reminderTime) - DateTimeUtils.toMillis(now);

        const jobId = await this.queueService.add(
          ORDER_PAYMENT_QUEUE,
          PAYMENT_REMINDER_JOB,
          {
            orderId: order.id,
            workspaceId: context.workspaceId,
            reminderType: this.getReminderType(hoursBeforeDeadline),
          },
          { delay: delayMs, jobId: `reminder-${order.id}-${hoursBeforeDeadline}` },
        );

        scheduledJobs.push(jobId);
      }
    }

    // Schedule deadline check job
    const deadlineCheckDelay = DateTimeUtils.toMillis(deadlineTime) - DateTimeUtils.toMillis(now);
    await this.queueService.add(
      ORDER_PAYMENT_QUEUE,
      PAYMENT_DEADLINE_CHECK_JOB,
      {
        orderId: order.id,
        workspaceId: context.workspaceId,
      },
      { delay: deadlineCheckDelay, jobId: `deadline-check-${order.id}` },
    );

    return {
      ...context,
      scheduledReminderJobs: scheduledJobs,
    };
  }

  private getReminderType(hoursBeforeDeadline: number): string {
    if (hoursBeforeDeadline >= 6) return 'FIRST_REMINDER';
    if (hoursBeforeDeadline >= 2) return 'SECOND_REMINDER';
    return 'URGENT_REMINDER';
  }
}
```

---

## 7. Thêm Cronjobs

### 7.1. Payment Deadline Cronjob

**File:** `order/jobs/payment-deadline.job.ts`

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

export const ORDER_PAYMENT_QUEUE = 'order-payment-queue';
export const PAYMENT_DEADLINE_CHECK_JOB = 'payment-deadline-check';
export const PAYMENT_REMINDER_JOB = 'payment-reminder';
export const PAYMENT_OVERDUE_SCAN_JOB = 'payment-overdue-scan';

@Processor(ORDER_PAYMENT_QUEUE)
export class PaymentDeadlineProcessor {
  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderLockService: OrderLockService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Check single order deadline
   */
  @Process(PAYMENT_DEADLINE_CHECK_JOB)
  async handleDeadlineCheck(job: Job<PaymentDeadlineCheckPayload>): Promise<void> {
    const { orderId, workspaceId } = job.data;

    const order = await this.orderRepository.findById(orderId, workspaceId);

    // Skip if already paid or cancelled
    if (order.status !== ORDER_STATUS.PROCESSING) {
      return;
    }

    // Check if deadline passed
    const now = DateTimeUtils.now();
    const deadline = DateTimeUtils.fromDate(order.paymentDeadline);

    if (DateTimeUtils.isAfter(now, deadline)) {
      // Lock the order
      await this.orderLockService.lockOverdueOrder(orderId, workspaceId);
    }
  }

  /**
   * Send payment reminder
   */
  @Process(PAYMENT_REMINDER_JOB)
  async handleReminder(job: Job<PaymentReminderPayload>): Promise<void> {
    const { orderId, workspaceId, reminderType } = job.data;

    const order = await this.orderRepository.findById(orderId, workspaceId);

    // Skip if already paid or cancelled
    if (order.status !== ORDER_STATUS.PROCESSING) {
      return;
    }

    await this.notificationService.sendPaymentReminder(order, reminderType);

    // Update reminders sent count
    await this.orderRepository.update(orderId, workspaceId, {
      remindersSent: order.remindersSent + 1,
      lastReminderAt: DateTimeUtils.toDate(DateTimeUtils.now()),
    });
  }
}
```

### 7.2. Scheduled Overdue Scan

**File:** `order/jobs/payment-overdue-scan.job.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PaymentOverdueScanService {
  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderLockService: OrderLockService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  /**
   * Scan all workspaces for overdue orders
   * Runs every minute to catch any missed deadline checks
   */
  @Cron('0 * * * * *') // Every minute
  async scanOverdueOrders(): Promise<void> {
    const workspaces = await this.workspaceService.findAll();

    for (const workspace of workspaces) {
      await this.scanWorkspaceOverdueOrders(workspace.id);
    }
  }

  private async scanWorkspaceOverdueOrders(workspaceId: string): Promise<void> {
    const now = DateTimeUtils.now();

    // Find orders that are PROCESSING and past deadline
    const overdueOrders = await this.orderRepository.findMany(workspaceId, {
      where: {
        status: ORDER_STATUS.PROCESSING,
        paymentDeadline: { lt: DateTimeUtils.toDate(now) },
      },
    });

    for (const order of overdueOrders) {
      try {
        await this.orderLockService.lockOverdueOrder(order.id, workspaceId);
      } catch (error) {
        console.error(`Failed to lock overdue order ${order.id}:`, error);
      }
    }
  }
}
```

---

## 8. Thay đổi State Machine

### 8.1. New States

**File:** `order/states/processing.state.ts` (NEW)

```typescript
@Injectable()
export class ProcessingState extends BaseOrderState {
  getStatus(): string {
    return ORDER_STATUS.PROCESSING;
  }

  getValidTransitions(): string[] {
    return [
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.LOCKED,
      ORDER_STATUS.CANCELED,
      ORDER_STATUS.REFUND,
      ORDER_STATUS.REFUND_PARTIAL,
    ];
  }

  async onEnter(order: MktOrder, context: StateContext): Promise<void> {
    // License đã được cấp với status PENDING_PAYMENT
    // Không cần action gì thêm
  }

  async onExit(order: MktOrder, context: StateContext): Promise<void> {
    // Cancel scheduled reminder jobs nếu transition sang COMPLETED/CANCELED
    if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELED].includes(context.targetStatus)) {
      await this.cancelScheduledJobs(order.id);
    }
  }
}
```

**File:** `order/states/locked.state.ts` (NEW)

```typescript
@Injectable()
export class LockedState extends BaseOrderState {
  getStatus(): string {
    return ORDER_STATUS.LOCKED;
  }

  getValidTransitions(): string[] {
    return [
      ORDER_STATUS.COMPLETED,  // After late payment
      ORDER_STATUS.CANCELED,
    ];
  }

  async onEnter(order: MktOrder, context: StateContext): Promise<void> {
    // Licenses đã bị khóa trong OrderLockService
    // Log audit entry
    await this.auditService.log({
      action: 'ORDER_LOCKED_PAYMENT_OVERDUE',
      orderId: order.id,
      workspaceId: context.workspaceId,
      reason: order.lockedReason,
      timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
    });
  }

  async onExit(order: MktOrder, context: StateContext): Promise<void> {
    if (context.targetStatus === ORDER_STATUS.COMPLETED) {
      // Log unlock audit entry
      await this.auditService.log({
        action: 'ORDER_UNLOCKED_AFTER_PAYMENT',
        orderId: order.id,
        workspaceId: context.workspaceId,
        timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
      });
    }
  }
}
```

### 8.2. Update State Machine

**File:** `order/states/order-state-machine.ts`

```typescript
@Injectable()
export class OrderStateMachine {
  private readonly states: Map<string, BaseOrderState>;

  constructor(
    draftState: DraftState,
    confirmedState: ConfirmedState,
    processingState: ProcessingState,      // NEW
    lockedState: LockedState,              // NEW
    completedState: CompletedState,
    canceledState: CanceledState,
    // ... other states
  ) {
    this.states = new Map([
      [ORDER_STATUS.DRAFT, draftState],
      [ORDER_STATUS.CONFIRMED, confirmedState],
      [ORDER_STATUS.PROCESSING, processingState],    // NEW
      [ORDER_STATUS.LOCKED, lockedState],            // NEW
      [ORDER_STATUS.COMPLETED, completedState],
      [ORDER_STATUS.CANCELED, canceledState],
      // ... other states
    ]);
  }

  async transition(
    order: MktOrder,
    targetStatus: string,
    context: StateContext,
  ): Promise<MktOrder> {
    const currentState = this.states.get(order.status);
    if (!currentState) {
      throw new InvalidStateException(`Unknown state: ${order.status}`);
    }

    // Validate transition
    if (!currentState.canTransitionTo(targetStatus)) {
      throw new InvalidTransitionException(
        `Cannot transition from ${order.status} to ${targetStatus}`,
      );
    }

    // Execute onExit for current state
    await currentState.onExit(order, { ...context, targetStatus });

    // Update order status
    order.status = targetStatus;

    // Execute onEnter for new state
    const newState = this.states.get(targetStatus);
    if (newState) {
      await newState.onEnter(order, context);
    }

    return order;
  }
}
```

---

## 9. API/Resolver Changes

### 9.1. OrderMutationResolver Updates

**File:** `order/resolvers/order-mutation.resolver.ts`

```typescript
@Resolver()
export class OrderMutationResolver {
  // === THÊM MUTATIONS MỚI ===

  /**
   * Xác nhận đơn hàng: Tạo Invoice + Cấp License ngay
   * Department: SALES
   */
  @Mutation(() => ConfirmOrderOutput)
  @RequireDepartment([DEPARTMENT.SALES])
  async confirmOrderWithLicense(
    @Args('input') input: ConfirmOrderWithLicenseInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ): Promise<ConfirmOrderOutput> {
    return this.orderConfirmService.confirmOrder(
      input.orderId,
      workspace.id,
      {
        manualDeadlineHours: input.paymentDeadlineHours,
      },
    );
  }

  /**
   * Xác nhận thanh toán (SEPAY webhook, Bank transfer, Cash)
   * Department: SALES (bank transfer), ACCOUNTING (cash)
   */
  @Mutation(() => PaymentConfirmOutput)
  @RequireDepartment([DEPARTMENT.SALES, DEPARTMENT.ACCOUNTING])
  async confirmOrderPayment(
    @Args('input') input: ConfirmPaymentInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ): Promise<PaymentConfirmOutput> {
    // Validate quyền theo payment method
    this.validatePaymentConfirmPermission(input.paymentMethod, user);

    return this.orderPaymentService.confirmPayment(
      input.orderId,
      workspace.id,
      {
        paymentMethod: input.paymentMethod,
        amount: input.amount,
        transactionId: input.transactionId,
        confirmedBy: user.id,
      },
    );
  }

  /**
   * Mở khóa đơn hàng sau thanh toán muộn (manual)
   * Department: ACCOUNTING
   */
  @Mutation(() => UnlockOrderOutput)
  @RequireDepartment([DEPARTMENT.ACCOUNTING])
  async unlockOrderAfterPayment(
    @Args('input') input: UnlockOrderInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ): Promise<UnlockOrderOutput> {
    return this.orderLockService.unlockAfterPayment(
      input.orderId,
      workspace.id,
      {
        amount: input.amount,
        transactionId: input.transactionId,
        confirmedBy: user.id,
        note: input.note,
      },
    );
  }

  private validatePaymentConfirmPermission(
    paymentMethod: string,
    user: User,
  ): void {
    // CASH/OTHER requires ACCOUNTING department
    if (['CASH', 'OTHER'].includes(paymentMethod)) {
      if (!user.departments?.includes(DEPARTMENT.ACCOUNTING)) {
        throw new ForbiddenException(
          'Cash payments must be confirmed by Accounting department',
        );
      }
    }
  }
}
```

### 9.2. New DTOs

**File:** `order/dto/confirm-order-with-license.input.ts`

```typescript
@InputType()
export class ConfirmOrderWithLicenseInput {
  @Field(() => ID)
  orderId: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  @Max(720) // Max 30 days
  paymentDeadlineHours?: number;
}

@ObjectType()
export class ConfirmOrderOutput {
  @Field(() => MktOrder)
  order: MktOrder;

  @Field(() => MktInvoice)
  invoice: MktInvoice;

  @Field(() => [MktLicense])
  licenses: MktLicense[];

  @Field(() => Date)
  paymentDeadline: Date;

  @Field(() => String)
  paymentDeadlineSource: string;
}
```

**File:** `order/dto/confirm-payment.input.ts`

```typescript
@InputType()
export class ConfirmPaymentInput {
  @Field(() => ID)
  orderId: string;

  @Field(() => String)
  @IsIn(['SEPAY', 'BANK_TRANSFER', 'CASH', 'OTHER'])
  paymentMethod: string;

  @Field(() => Float)
  @Min(0)
  amount: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  transactionId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  note?: string;
}

@ObjectType()
export class PaymentConfirmOutput {
  @Field(() => MktOrder)
  order: MktOrder;

  @Field(() => PaymentSummary)
  paymentSummary: PaymentSummary;

  @Field(() => String)
  newStatus: string;
}
```

### 9.3. Webhook Controller for SEPay

**File:** `order/controllers/sepay-webhook.controller.ts`

```typescript
@Controller('api/v1/webhooks')
export class SepayWebhookController {
  constructor(
    private readonly orderPaymentService: OrderPaymentService,
    private readonly orderRepository: MktOrderRepository,
  ) {}

  @Post('sepay')
  @HttpCode(200)
  async handleSepayWebhook(
    @Body() payload: SepayWebhookPayload,
    @Headers('x-sepay-signature') signature: string,
  ): Promise<{ success: boolean }> {
    // 1. Validate signature
    if (!this.validateSignature(payload, signature)) {
      throw new UnauthorizedException('Invalid signature');
    }

    // 2. Parse order info from description
    const orderInfo = this.parseOrderFromDescription(payload.description);
    if (!orderInfo) {
      return { success: false };
    }

    // 3. Find order
    const order = await this.orderRepository.findByCode(
      orderInfo.orderCode,
      orderInfo.workspaceId,
    );

    if (!order) {
      return { success: false };
    }

    // 4. Confirm payment
    await this.orderPaymentService.confirmPayment(
      order.id,
      orderInfo.workspaceId,
      {
        paymentMethod: 'SEPAY',
        amount: payload.amount,
        transactionId: payload.transactionId,
      },
    );

    return { success: true };
  }

  private validateSignature(payload: any, signature: string): boolean {
    // Implement SEPay signature validation
    return true;
  }

  private parseOrderFromDescription(
    description: string,
  ): { orderCode: string; workspaceId: string } | null {
    // Parse format: "ORD-2024-000001 WS-xxx"
    const match = description.match(/^(ORD-\d{4}-\d{6})\s+(WS-[\w-]+)$/);
    if (!match) return null;
    return { orderCode: match[1], workspaceId: match[2] };
  }
}
```

---

## 10. Configuration System

### 10.1. Payment Deadline Configuration Entity

**File:** `order/objects/mkt-payment-deadline-config.workspace-entity.ts`

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPaymentDeadlineConfig,
  namePlural: 'mktPaymentDeadlineConfigs',
  labelSingular: 'Payment Deadline Config',
  labelPlural: 'Payment Deadline Configs',
  icon: 'IconClock',
})
export class MktPaymentDeadlineConfigWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktPaymentDeadlineConfig.configType,
    type: FieldMetadataType.SELECT,
    label: 'Config Type',
    options: [
      { value: 'GLOBAL', label: 'Global', position: 0 },
      { value: 'PRODUCT', label: 'Product', position: 1 },
      { value: 'CUSTOMER_TYPE', label: 'Customer Type', position: 2 },
      { value: 'RESELLER_TIER', label: 'Reseller Tier', position: 3 },
    ],
  })
  configType: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktPaymentDeadlineConfig.targetId,
    type: FieldMetadataType.TEXT,
    label: 'Target ID',
    description: 'Product ID, Customer Type, or Reseller Tier code',
  })
  @WorkspaceIsNullable()
  targetId: string | null;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktPaymentDeadlineConfig.deadlineHours,
    type: FieldMetadataType.NUMBER,
    label: 'Deadline Hours',
    description: 'Payment deadline in hours',
  })
  deadlineHours: number;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktPaymentDeadlineConfig.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: 'Is Active',
    defaultValue: true,
  })
  isActive: boolean;
}
```

### 10.2. Environment Variables

```env
# Payment Deadline Configuration
MKT_PAYMENT_DEADLINE_HOURS=24
MKT_PAYMENT_REMINDER_ENABLED=true
MKT_PAYMENT_OVERDUE_SCAN_ENABLED=true
MKT_PAYMENT_OVERDUE_SCAN_CRON="0 * * * * *"
```

---

## 11. Migration Strategy

### 11.1. Database Migration

**File:** `database/typeorm/core/migrations/YYYYMMDDHHMMSS-add-payment-deadline-fields.ts`

```typescript
export class AddPaymentDeadlineFields1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add fields to mktOrder
    await queryRunner.query(`
      ALTER TABLE "mktOrder"
      ADD COLUMN "paymentDeadline" TIMESTAMP,
      ADD COLUMN "paymentDeadlineSource" VARCHAR(50),
      ADD COLUMN "lockedAt" TIMESTAMP,
      ADD COLUMN "lockedReason" TEXT,
      ADD COLUMN "remindersSent" INTEGER DEFAULT 0,
      ADD COLUMN "lastReminderAt" TIMESTAMP
    `);

    // Add fields to mktLicense
    await queryRunner.query(`
      ALTER TABLE "mktLicense"
      ADD COLUMN "paymentDeadline" TIMESTAMP,
      ADD COLUMN "lockedAt" TIMESTAMP,
      ADD COLUMN "lockedReason" TEXT
    `);

    // Add PENDING_PAYMENT to license status if not exists
    // (This depends on how status is stored - enum or varchar)

    // Add index for overdue scan
    await queryRunner.query(`
      CREATE INDEX "IDX_mktOrder_status_paymentDeadline"
      ON "mktOrder" ("status", "paymentDeadline")
      WHERE "status" = 'PROCESSING'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_mktOrder_status_paymentDeadline"`);

    await queryRunner.query(`
      ALTER TABLE "mktOrder"
      DROP COLUMN "paymentDeadline",
      DROP COLUMN "paymentDeadlineSource",
      DROP COLUMN "lockedAt",
      DROP COLUMN "lockedReason",
      DROP COLUMN "remindersSent",
      DROP COLUMN "lastReminderAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "mktLicense"
      DROP COLUMN "paymentDeadline",
      DROP COLUMN "lockedAt",
      DROP COLUMN "lockedReason"
    `);
  }
}
```

### 11.2. Data Migration for Existing Orders

```typescript
@Injectable()
export class PaymentFlowMigrationService {
  async migrateExistingOrders(workspaceId: string): Promise<void> {
    // 1. Orders với status PENDING_PAYMENT → giữ nguyên hoặc migrate
    // 2. Orders với status CONFIRMED mà chưa tạo license → tạo license
    // 3. Orders với status OVERDUE → migrate sang LOCKED

    // Note: Cần xem xét kỹ logic migration tùy theo dữ liệu thực tế
  }
}
```

---

## 12. Testing Plan

### 12.1. Unit Tests

```typescript
describe('OrderConfirmService', () => {
  describe('confirmOrder', () => {
    it('should create licenses with PENDING_PAYMENT status', async () => {});
    it('should create invoice with correct deadline', async () => {});
    it('should schedule reminder jobs', async () => {});
    it('should update order status to PROCESSING', async () => {});
  });
});

describe('PaymentDeadlineService', () => {
  describe('calculateDeadline', () => {
    it('should use manual override when provided', async () => {});
    it('should use reseller tier config', async () => {});
    it('should use customer type config', async () => {});
    it('should use product config', async () => {});
    it('should fallback to global config', async () => {});
  });
});

describe('OrderLockService', () => {
  describe('lockOverdueOrder', () => {
    it('should lock licenses on MKT Server', async () => {});
    it('should update invoice to OVERDUE', async () => {});
    it('should update order to LOCKED', async () => {});
    it('should send notification', async () => {});
  });

  describe('unlockAfterPayment', () => {
    it('should unlock licenses on MKT Server', async () => {});
    it('should update invoice to PAID', async () => {});
    it('should update order to COMPLETED', async () => {});
  });
});
```

### 12.2. Integration Tests

```typescript
describe('Payment Flow Integration', () => {
  it('should complete full flow: confirm → processing → paid → completed', async () => {});
  it('should handle overdue: confirm → processing → locked', async () => {});
  it('should handle late payment: locked → completed', async () => {});
  it('should handle SEPay webhook correctly', async () => {});
  it('should send reminders at correct intervals', async () => {});
});
```

### 12.3. E2E Test Scenarios

1. **Happy Path**: Tạo đơn → Confirm → Thanh toán → Completed
2. **Overdue Path**: Tạo đơn → Confirm → Quá hạn → Locked
3. **Late Payment**: Tạo đơn → Confirm → Quá hạn → Locked → Thanh toán muộn → Completed
4. **Cancel Before Payment**: Tạo đơn → Confirm → Cancel
5. **SEPay Webhook**: Webhook nhận → Auto confirm → Completed

---

## 13. Checklist Implementation

### Phase 1: Schema & Constants
- [ ] Thêm fields mới vào MktOrderWorkspaceEntity
- [ ] Thêm fields mới vào MktLicenseWorkspaceEntity
- [ ] Thêm fields mới vào MktInvoiceWorkspaceEntity
- [ ] Thêm field IDs mới
- [ ] Update ORDER_STATUS constants
- [ ] Update ORDER_ACTION constants
- [ ] Update LICENSE_STATUS constants
- [ ] Tạo PAYMENT_DEADLINE constants

### Phase 2: Services
- [ ] Tạo PaymentDeadlineService
- [ ] Tạo OrderConfirmService
- [ ] Tạo OrderLockService
- [ ] Refactor OrderPaymentService
- [ ] Update OrderLicenseIntegrationService

### Phase 3: Saga & Steps
- [ ] Refactor ConfirmOrderSaga
- [ ] Tạo CalculatePaymentDeadlineStep
- [ ] Tạo CreateInvoiceStep
- [ ] Tạo SchedulePaymentRemindersStep
- [ ] Refactor CreateLicensesOnConfirmStep

### Phase 4: State Machine
- [ ] Tạo ProcessingState
- [ ] Tạo LockedState
- [ ] Update OrderStateMachine

### Phase 5: Jobs & Cron
- [ ] Tạo PaymentDeadlineProcessor
- [ ] Tạo PaymentOverdueScanService
- [ ] Setup BullMQ queues

### Phase 6: API
- [ ] Update OrderMutationResolver
- [ ] Tạo DTOs mới
- [ ] Tạo SepayWebhookController

### Phase 7: Configuration
- [ ] Tạo MktPaymentDeadlineConfigWorkspaceEntity
- [ ] Thêm environment variables

### Phase 8: Migration
- [ ] Tạo database migration
- [ ] Tạo data migration service

### Phase 9: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests

---

## 14. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| License bị khóa sai do cronjob chạy trước deadline | High | Sử dụng job delay thay vì scan định kỳ |
| Race condition khi thanh toán ngay trước deadline | Medium | Lock order trước khi check deadline |
| SEPay webhook bị miss | Medium | Có scan định kỳ backup |
| Migration dữ liệu cũ không tương thích | High | Chạy migration trên staging trước |
| Performance khi scan nhiều orders | Medium | Index trên status + paymentDeadline |

---

## 15. Appendix: Sequence Diagrams

### 15.1. Confirm Order Flow

```
┌────────┐     ┌────────────┐     ┌─────────────┐     ┌───────────┐     ┌────────┐
│ Sales  │     │OrderConfirm│     │ LicenseIntg │     │ MKTServer │     │ Invoice│
└───┬────┘     └─────┬──────┘     └──────┬──────┘     └─────┬─────┘     └───┬────┘
    │                │                    │                  │               │
    │ confirmOrder   │                    │                  │               │
    │───────────────>│                    │                  │               │
    │                │                    │                  │               │
    │                │ calculateDeadline  │                  │               │
    │                │───────────────────>│                  │               │
    │                │<───────────────────│                  │               │
    │                │                    │                  │               │
    │                │ createLicenses     │                  │               │
    │                │───────────────────>│                  │               │
    │                │                    │ POST /license    │               │
    │                │                    │ (PENDING_PAYMENT)│               │
    │                │                    │─────────────────>│               │
    │                │                    │<─────────────────│               │
    │                │<───────────────────│                  │               │
    │                │                    │                  │               │
    │                │ createInvoice      │                  │               │
    │                │──────────────────────────────────────────────────────>│
    │                │<──────────────────────────────────────────────────────│
    │                │                    │                  │               │
    │                │ scheduleReminders  │                  │               │
    │                │───────────────────>│                  │               │
    │                │                    │                  │               │
    │ Response       │                    │                  │               │
    │<───────────────│                    │                  │               │
```

### 15.2. Payment Confirmation Flow

```
┌────────┐     ┌──────────────┐     ┌─────────────┐     ┌───────────┐
│ SEPay  │     │OrderPayment  │     │ LicenseIntg │     │ MKTServer │
└───┬────┘     └──────┬───────┘     └──────┬──────┘     └─────┬─────┘
    │                 │                    │                  │
    │ webhook         │                    │                  │
    │────────────────>│                    │                  │
    │                 │                    │                  │
    │                 │ activateLicenses   │                  │
    │                 │───────────────────>│                  │
    │                 │                    │ PUT /license     │
    │                 │                    │ (ACTIVE)         │
    │                 │                    │─────────────────>│
    │                 │                    │<─────────────────│
    │                 │<───────────────────│                  │
    │                 │                    │                  │
    │                 │ updateOrder        │                  │
    │                 │ (COMPLETED)        │                  │
    │                 │───────────────────>│                  │
    │                 │                    │                  │
    │ 200 OK          │                    │                  │
    │<────────────────│                    │                  │
```

### 15.3. Overdue Lock Flow

```
┌────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────────┐
│ Cron   │     │ LockService │     │ LicenseIntg │     │ MKTServer │
└───┬────┘     └──────┬──────┘     └──────┬──────┘     └─────┬─────┘
    │                 │                    │                  │
    │ checkDeadline   │                    │                  │
    │────────────────>│                    │                  │
    │                 │                    │                  │
    │                 │ lockLicenses       │                  │
    │                 │───────────────────>│                  │
    │                 │                    │ PUT /license     │
    │                 │                    │ (LOCKED)         │
    │                 │                    │─────────────────>│
    │                 │                    │ revoke secrets   │
    │                 │                    │<─────────────────│
    │                 │<───────────────────│                  │
    │                 │                    │                  │
    │                 │ updateOrder        │                  │
    │                 │ (LOCKED)           │                  │
    │                 │───────────────────>│                  │
    │                 │                    │                  │
    │                 │ sendNotification   │                  │
    │                 │───────────────────>│                  │
```

---

*Document created: 2026-01-16*
*Author: Claude Code*
*Version: 1.0*
