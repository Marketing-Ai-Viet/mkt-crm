# Sale Payment Confirmation Implementation

## 1. Overview

### 1.1 Business Requirements

Hiện tại hệ thống tự động khóa license khi order quá hạn thanh toán (`paymentDeadline < now`). Tuy nhiên, trong thực tế:

- **Sale** có thể xác nhận khách hàng đã thanh toán (nhưng chưa có chứng từ)
- **Kế toán** xác nhận chính thức sau khi đối soát

Khi Sale đã xác nhận thanh toán, hệ thống **KHÔNG** nên tự động khóa license để tránh ảnh hưởng đến khách hàng.

### 1.2 Goals

1. Sale có thể xác nhận thanh toán để "bảo vệ" license khỏi bị khóa tự động
2. Kế toán xác nhận chính thức để hoàn tất order
3. Track được **ai** xác nhận và **khi nào** (audit trail)
4. Hỗ trợ **hủy xác nhận** nếu cần
5. **Đảm bảo data integrity** với transaction và optimistic locking
6. **Idempotency** để xử lý duplicate requests
7. **Role-based access control** cho từng action

### 1.3 Design Decision

**Hybrid Approach**: Kết hợp boolean field (quick check) và OrderHistory (audit trail)

| Component | Purpose |
|-----------|---------|
| `Order.salePaymentConfirmed` | Boolean để job scan filter nhanh (NOT NULL, default false) |
| `Order.accountingConfirmed` | Boolean xác nhận kế toán (đã có) |
| `Order.version` | Optimistic locking version |
| `OrderHistory` | Track chi tiết: ai, khi nào, lịch sử thay đổi |

---

## 2. Business Rules

### 2.1 State Transition Rules

```typescript
// constants/confirmation-rules.constants.ts

import { ORDER_STATUS } from './order-status.constants';
import { PAYMENT_STATUS } from './payment-status.constants';

/**
 * Business rules cho payment confirmation
 */
export const CONFIRMATION_RULES = {
  /**
   * Sale có thể confirm khi:
   * - Order status: PROCESSING hoặc PENDING_PAYMENT
   * - Payment status: PENDING hoặc PARTIAL (không confirm nếu đã PAID)
   * - Chưa được sale confirm trước đó
   */
  saleCanConfirm: {
    validOrderStatuses: [ORDER_STATUS.PROCESSING, ORDER_STATUS.PENDING_PAYMENT],
    validPaymentStatuses: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PARTIAL],
    excludePaymentStatuses: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.OVERPAID],
  },

  /**
   * Accounting có thể confirm khi:
   * - Order status: PROCESSING hoặc PENDING_PAYMENT
   * - Chưa được accounting confirm trước đó
   * - Có chứng từ thanh toán (paymentStatus = PAID hoặc có saleConfirmed)
   */
  accountingCanConfirm: {
    validOrderStatuses: [ORDER_STATUS.PROCESSING, ORDER_STATUS.PENDING_PAYMENT],
    requiresPaymentEvidence: true, // PAID hoặc salePaymentConfirmed
  },

  /**
   * Auto-complete order khi accounting confirm nếu:
   * - paymentStatus = PAID
   */
  autoCompleteConditions: {
    requiredPaymentStatus: PAYMENT_STATUS.PAID,
  },

  /**
   * Revoke rules:
   * - Sale revoke: Chỉ khi accounting chưa confirm
   * - Accounting revoke: Luôn được phép (sẽ revert COMPLETED → PROCESSING)
   */
  revokeRules: {
    saleRevokeBlockedIf: ['accountingConfirmed'],
    accountingRevokeRevertsStatus: {
      from: ORDER_STATUS.COMPLETED,
      to: ORDER_STATUS.PROCESSING,
    },
  },
} as const;
```

### 2.2 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      PAYMENT CONFIRMATION STATE MACHINE                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────┐                                                        │
│   │  PROCESSING /   │                                                        │
│   │ PENDING_PAYMENT │                                                        │
│   └────────┬────────┘                                                        │
│            │                                                                 │
│            ▼                                                                 │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                    DEADLINE EXCEEDED CHECK                          │    │
│   └────────────────────────────┬───────────────────────────────────────┘    │
│                                │                                             │
│         ┌──────────────────────┼──────────────────────┐                     │
│         ▼                      ▼                      ▼                     │
│  ┌──────────────┐     ┌───────────────┐     ┌────────────────┐             │
│  │ saleConfirmed│     │ saleConfirmed │     │ accounting     │             │
│  │   = false    │     │    = true     │     │ Confirmed=true │             │
│  │ accounting   │     │ accounting    │     │                │             │
│  │ Confirmed    │     │ Confirmed     │     │                │             │
│  │   = false    │     │   = false     │     │                │             │
│  └──────┬───────┘     └───────┬───────┘     └───────┬────────┘             │
│         │                     │                     │                       │
│         ▼                     ▼                     ▼                       │
│  ┌──────────────┐     ┌───────────────┐     ┌────────────────┐             │
│  │   LOCKED     │     │  PROTECTED    │     │   COMPLETED    │             │
│  │ (auto-lock)  │     │ (chờ kế toán) │     │   (hoàn tất)   │             │
│  └──────────────┘     └───────────────┘     └────────────────┘             │
│         │                     │                                             │
│         │              ┌──────┴──────┐                                      │
│         │              ▼             ▼                                      │
│         │     [Accounting     [Revoke sale                                  │
│         │      confirm]        confirm]                                     │
│         │         │               │                                         │
│         │         ▼               ▼                                         │
│         │   ┌──────────┐   ┌───────────────┐                               │
│         │   │COMPLETED │   │ VULNERABLE    │                               │
│         │   └──────────┘   │ (may be locked│                               │
│         │                  │  next scan)   │                               │
│         │                  └───────────────┘                               │
│         │                                                                   │
│         └──────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Protection Status Logic

```typescript
/**
 * Kiểm tra order có được bảo vệ khỏi auto-lock không
 *
 * QUAN TRỌNG: Sử dụng strict comparison (=== true) vì field có thể null
 */
export const isProtectedFromAutoLock = (order: {
  salePaymentConfirmed: boolean;
  accountingConfirmed: boolean;
}): boolean => {
  return order.salePaymentConfirmed === true || order.accountingConfirmed === true;
};

/**
 * Kiểm tra order có thể bị lock bởi overdue scan không
 *
 * Order sẽ bị lock nếu:
 * - Status là PROCESSING
 * - Đã quá paymentDeadline
 * - KHÔNG có salePaymentConfirmed = true
 * - KHÔNG có accountingConfirmed = true
 */
export const canBeLocked = (order: {
  status: string;
  paymentDeadline: Date | null;
  salePaymentConfirmed: boolean;
  accountingConfirmed: boolean;
}): boolean => {
  if (order.status !== ORDER_STATUS.PROCESSING) {
    return false;
  }

  if (!order.paymentDeadline) {
    return false;
  }

  const now = DateTimeUtils.now();
  const deadline = DateTimeUtils.fromDate(order.paymentDeadline);
  const isPastDeadline = DateTimeUtils.isBefore(deadline, now);

  if (!isPastDeadline) {
    return false;
  }

  // Chỉ lock nếu KHÔNG được protect
  return !isProtectedFromAutoLock(order);
};
```

---

## 3. Database Changes

### 3.1 Order Entity - New Field

**File**: `packages/twenty-server/src/mkt-core/order/objects/mkt-order.workspace-entity.ts`

```typescript
// Thêm vào sau accountingConfirmed field (line ~230)

/**
 * Sale payment confirmation flag
 *
 * IMPORTANT:
 * - NOT NULL với default = false để đảm bảo consistent comparison
 * - Sử dụng strict comparison (=== true) khi check
 */
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.salePaymentConfirmed,
  type: FieldMetadataType.BOOLEAN,
  label: msg`Sale Payment Confirmed`,
  description: msg`Whether sale has confirmed payment (protects license from auto-lock)`,
  icon: 'IconUserCheck',
  defaultValue: false,
})
salePaymentConfirmed: boolean;

/**
 * Optimistic locking version
 * Tự động tăng khi update, dùng để detect concurrent modifications
 */
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.version,
  type: FieldMetadataType.NUMBER,
  label: msg`Version`,
  description: msg`Optimistic locking version for concurrent update detection`,
  icon: 'IconRefresh',
  defaultValue: 1,
})
version: number;
```

### 3.2 Field ID Registration

**File**: `packages/twenty-server/src/mkt-core/constants/mkt-field-ids.ts`

```typescript
export const MKT_ORDER_FIELD_IDS = {
  // ... existing fields
  salePaymentConfirmed: '20250203-0001-4000-8000-000000000001',
  version: '20250203-0002-4000-8000-000000000002',
};
```

### 3.3 OrderHistory Action Types

**File**: `packages/twenty-server/src/mkt-core/order/constants/order-history-action.constants.ts`

```typescript
export enum ORDER_HISTORY_ACTION {
  // ... existing actions

  // Payment Confirmation Actions
  SALE_PAYMENT_CONFIRMED = 'SALE_PAYMENT_CONFIRMED',
  SALE_CONFIRMATION_REVOKED = 'SALE_CONFIRMATION_REVOKED',
  ACCOUNTING_CONFIRMED = 'ACCOUNTING_CONFIRMED',
  ACCOUNTING_CONFIRMATION_REVOKED = 'ACCOUNTING_CONFIRMATION_REVOKED',
}

// Thêm vào ORDER_HISTORY_ACTION_OPTIONS
{
  value: ORDER_HISTORY_ACTION.SALE_PAYMENT_CONFIRMED,
  label: 'Sale Payment Confirmed',
  color: 'green' as TagColor,
  position: 25,
},
{
  value: ORDER_HISTORY_ACTION.SALE_CONFIRMATION_REVOKED,
  label: 'Sale Confirmation Revoked',
  color: 'orange' as TagColor,
  position: 26,
},
{
  value: ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMED,
  label: 'Accounting Confirmed',
  color: 'green' as TagColor,
  position: 27,
},
{
  value: ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMATION_REVOKED,
  label: 'Accounting Confirmation Revoked',
  color: 'orange' as TagColor,
  position: 28,
},
```

### 3.4 Database Index

```sql
-- Index cho overdue scan query (composite index)
CREATE INDEX CONCURRENTLY idx_mkt_order_overdue_scan
ON "mktOrder" (
  "status",
  "paymentDeadline",
  "salePaymentConfirmed",
  "accountingConfirmed"
)
WHERE "deletedAt" IS NULL;

-- Index cho confirmation history lookup
CREATE INDEX CONCURRENTLY idx_mkt_order_history_confirmation
ON "mktOrderHistory" (
  "mktOrderId",
  "action",
  "createdAt" DESC
)
WHERE "action" IN (
  'SALE_PAYMENT_CONFIRMED',
  'SALE_CONFIRMATION_REVOKED',
  'ACCOUNTING_CONFIRMED',
  'ACCOUNTING_CONFIRMATION_REVOKED'
);
```

---

## 4. Exception Classes

**File**: `packages/twenty-server/src/mkt-core/order/exceptions/payment-confirmation.exceptions.ts`

```typescript
import { HttpStatus } from '@nestjs/common';

import { MktBusinessException } from 'src/mkt-core/common/exceptions';

export class OrderNotFoundException extends MktBusinessException {
  constructor(orderId: string) {
    super({
      code: 'ORDER_NOT_FOUND',
      message: `Order ${orderId} not found`,
      httpStatus: HttpStatus.NOT_FOUND,
      metadata: { orderId },
    });
  }
}

export class OrderAlreadyConfirmedException extends MktBusinessException {
  constructor(orderId: string, confirmationType: 'sale' | 'accounting') {
    super({
      code: 'ORDER_ALREADY_CONFIRMED',
      message: `Order ${orderId} already confirmed by ${confirmationType}`,
      httpStatus: HttpStatus.CONFLICT,
      metadata: { orderId, confirmationType },
    });
  }
}

export class InvalidOrderStatusException extends MktBusinessException {
  constructor(orderId: string, currentStatus: string, validStatuses: string[]) {
    super({
      code: 'INVALID_ORDER_STATUS',
      message: `Cannot perform operation on order ${orderId} in status ${currentStatus}. Valid statuses: ${validStatuses.join(', ')}`,
      httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
      metadata: { orderId, currentStatus, validStatuses },
    });
  }
}

export class OrderAlreadyPaidException extends MktBusinessException {
  constructor(orderId: string) {
    super({
      code: 'ORDER_ALREADY_PAID',
      message: `Order ${orderId} is already fully paid. Sale confirmation not needed.`,
      httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
      metadata: { orderId },
    });
  }
}

export class NoConfirmationToRevokeException extends MktBusinessException {
  constructor(orderId: string, confirmationType: 'sale' | 'accounting') {
    super({
      code: 'NO_CONFIRMATION_TO_REVOKE',
      message: `Order ${orderId} has no ${confirmationType} confirmation to revoke`,
      httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
      metadata: { orderId, confirmationType },
    });
  }
}

export class CannotRevokeSaleException extends MktBusinessException {
  constructor(orderId: string, reason: string) {
    super({
      code: 'CANNOT_REVOKE_SALE_CONFIRMATION',
      message: `Cannot revoke sale confirmation for order ${orderId}: ${reason}`,
      httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
      metadata: { orderId, reason },
    });
  }
}

export class ConcurrencyException extends MktBusinessException {
  constructor(orderId: string, detail: string) {
    super({
      code: 'CONCURRENCY_CONFLICT',
      message: `Concurrency conflict on order ${orderId}: ${detail}`,
      httpStatus: HttpStatus.CONFLICT,
      metadata: { orderId, detail },
    });
  }
}

export class InsufficientPermissionException extends MktBusinessException {
  constructor(action: string, requiredPermission: string) {
    super({
      code: 'INSUFFICIENT_PERMISSION',
      message: `Insufficient permission to ${action}. Required: ${requiredPermission}`,
      httpStatus: HttpStatus.FORBIDDEN,
      metadata: { action, requiredPermission },
    });
  }
}

export class MissingPaymentEvidenceException extends MktBusinessException {
  constructor(orderId: string) {
    super({
      code: 'MISSING_PAYMENT_EVIDENCE',
      message: `Cannot confirm accounting for order ${orderId}: no payment evidence (PAID status or sale confirmation)`,
      httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
      metadata: { orderId },
    });
  }
}
```

---

## 5. Types Definition

**File**: `packages/twenty-server/src/mkt-core/order/types/payment-confirmation.types.ts`

```typescript
import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';

/**
 * Loại xác nhận thanh toán
 */
export enum PaymentConfirmationType {
  SALE = 'SALE',
  ACCOUNTING = 'ACCOUNTING',
}

/**
 * Input cho xác nhận thanh toán
 */
export type ConfirmPaymentInput = {
  orderId: string;
  idempotencyKey?: string;
  note?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Input cho hủy xác nhận
 */
export type RevokeConfirmationInput = {
  orderId: string;
  type: PaymentConfirmationType;
  reason: string;
  idempotencyKey?: string;
};

/**
 * Thông tin actor cho response
 */
export type ActorInfo = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

/**
 * Impact của revoke action
 */
export type RevokeImpact = {
  willBeLocked: boolean;
  reason: string;
  statusChanged?: boolean;
  previousStatus?: string;
  newStatus?: string;
};

/**
 * Kết quả xác nhận
 */
export type ConfirmationResult = {
  success: boolean;
  orderId: string;
  confirmedAt: string;
  confirmedBy: ActorMetadata;
  type: PaymentConfirmationType;
  version: number;
  note?: string;
  impact?: RevokeImpact;
};

/**
 * Trạng thái xác nhận của order
 */
export type OrderConfirmationStatus = {
  orderId: string;
  saleConfirmed: boolean;
  saleConfirmedAt?: string;
  saleConfirmedBy?: ActorInfo;
  accountingConfirmed: boolean;
  accountingConfirmedAt?: string;
  accountingConfirmedBy?: ActorInfo;
  isProtectedFromAutoLock: boolean;
  protectionReason?: string;
};

/**
 * Chi tiết một lần xác nhận từ history
 */
export type ConfirmationDetail = {
  id: string;
  action: string;
  confirmedAt: string;
  confirmedBy: ActorInfo;
  note?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Lịch sử xác nhận của order
 */
export type ConfirmationHistory = {
  orderId: string;
  confirmations: ConfirmationDetail[];
};
```

---

## 6. Service Implementation

### 6.1 PaymentConfirmationService

**File**: `packages/twenty-server/src/mkt-core/order/services/domain/payment-confirmation.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { TransactionScopeService } from 'src/mkt-core/infrastructure/transaction';
import { IdempotencyService } from 'src/mkt-core/common/idempotency';
import { ORDER_HISTORY_ACTION } from 'src/mkt-core/order/constants';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import { CONFIRMATION_RULES } from 'src/mkt-core/order/constants/confirmation-rules.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MktOrderHistoryRepository } from 'src/mkt-core/order/repositories/mkt-order-history.repository';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderEventService } from 'src/mkt-core/order/services/core/order-event.service';
import {
  OrderNotFoundException,
  OrderAlreadyConfirmedException,
  InvalidOrderStatusException,
  OrderAlreadyPaidException,
  NoConfirmationToRevokeException,
  CannotRevokeSaleException,
  ConcurrencyException,
  MissingPaymentEvidenceException,
} from 'src/mkt-core/order/exceptions/payment-confirmation.exceptions';
import {
  ConfirmPaymentInput,
  ConfirmationResult,
  ConfirmationHistory,
  ConfirmationDetail,
  OrderConfirmationStatus,
  PaymentConfirmationType,
  RevokeConfirmationInput,
  RevokeImpact,
  ActorInfo,
} from 'src/mkt-core/order/types/payment-confirmation.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

const CONFIRMATION_ACTIONS = [
  ORDER_HISTORY_ACTION.SALE_PAYMENT_CONFIRMED,
  ORDER_HISTORY_ACTION.SALE_CONFIRMATION_REVOKED,
  ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMED,
  ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMATION_REVOKED,
];

const IDEMPOTENCY_TTL_SECONDS = 300; // 5 minutes

/**
 * PaymentConfirmationService
 *
 * Xử lý logic xác nhận thanh toán từ Sale và Kế toán.
 *
 * Features:
 * - Transaction safety: Wrap all updates in transaction
 * - Optimistic locking: Detect concurrent modifications
 * - Idempotency: Handle duplicate requests gracefully
 * - Audit trail: Record all actions to OrderHistory
 *
 * Flow:
 * 1. Sale xác nhận → Order.salePaymentConfirmed = true + OrderHistory
 * 2. Kế toán xác nhận → Order.accountingConfirmed = true + OrderHistory + Complete order
 */
@Injectable()
export class PaymentConfirmationService {
  private readonly logger = new Logger(PaymentConfirmationService.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderHistoryRepository: MktOrderHistoryRepository,
    private readonly transactionScope: TransactionScopeService,
    private readonly idempotencyService: IdempotencyService,
    private readonly orderEventService: OrderEventService,
  ) {}

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Sale xác nhận thanh toán
   *
   * - Cập nhật Order.salePaymentConfirmed = true
   * - Tạo OrderHistory với action SALE_PAYMENT_CONFIRMED
   * - License được "bảo vệ" khỏi auto-lock
   *
   * @throws OrderNotFoundException - Order không tồn tại
   * @throws OrderAlreadyConfirmedException - Đã được confirm trước đó
   * @throws InvalidOrderStatusException - Order không ở trạng thái hợp lệ
   * @throws OrderAlreadyPaidException - Order đã PAID, không cần sale confirm
   * @throws ConcurrencyException - Concurrent modification detected
   */
  async confirmBySale(
    input: ConfirmPaymentInput,
    workspaceId: string,
    actor: ActorMetadata,
  ): Promise<ConfirmationResult> {
    const { orderId, idempotencyKey, note, metadata } = input;

    // Generate idempotency key nếu không có
    const key = idempotencyKey ?? this.generateIdempotencyKey('sale-confirm', orderId, actor);

    // Check idempotency
    const cached = await this.idempotencyService.checkAndLock<ConfirmationResult>(
      key,
      { ttlSeconds: IDEMPOTENCY_TTL_SECONDS },
    );

    if (cached.exists) {
      this.logger.log(`Duplicate sale confirmation request for order ${orderId}, returning cached result`);

      return cached.result;
    }

    try {
      const result = await this.doConfirmBySale(orderId, workspaceId, actor, note, metadata);

      // Store result for idempotency
      await this.idempotencyService.storeResult(key, result);

      return result;
    } catch (error) {
      await this.idempotencyService.releaseLock(key);
      throw error;
    }
  }

  /**
   * Kế toán xác nhận thanh toán
   *
   * - Cập nhật Order.accountingConfirmed = true
   * - Tạo OrderHistory với action ACCOUNTING_CONFIRMED
   * - Nếu paymentStatus = PAID, chuyển order sang COMPLETED
   *
   * @throws OrderNotFoundException - Order không tồn tại
   * @throws OrderAlreadyConfirmedException - Đã được confirm trước đó
   * @throws InvalidOrderStatusException - Order không ở trạng thái hợp lệ
   * @throws MissingPaymentEvidenceException - Không có bằng chứng thanh toán
   * @throws ConcurrencyException - Concurrent modification detected
   */
  async confirmByAccounting(
    input: ConfirmPaymentInput,
    workspaceId: string,
    actor: ActorMetadata,
  ): Promise<ConfirmationResult> {
    const { orderId, idempotencyKey, note, metadata } = input;

    const key = idempotencyKey ?? this.generateIdempotencyKey('accounting-confirm', orderId, actor);

    const cached = await this.idempotencyService.checkAndLock<ConfirmationResult>(
      key,
      { ttlSeconds: IDEMPOTENCY_TTL_SECONDS },
    );

    if (cached.exists) {
      this.logger.log(`Duplicate accounting confirmation request for order ${orderId}, returning cached result`);

      return cached.result;
    }

    try {
      const result = await this.doConfirmByAccounting(orderId, workspaceId, actor, note, metadata);

      await this.idempotencyService.storeResult(key, result);

      return result;
    } catch (error) {
      await this.idempotencyService.releaseLock(key);
      throw error;
    }
  }

  /**
   * Hủy xác nhận thanh toán
   *
   * WARNING: Revoke có thể khiến order bị lock nếu đã quá deadline!
   *
   * @throws OrderNotFoundException - Order không tồn tại
   * @throws NoConfirmationToRevokeException - Không có confirmation để revoke
   * @throws CannotRevokeSaleException - Không thể revoke sale (accounting đã confirm)
   * @throws ConcurrencyException - Concurrent modification detected
   */
  async revokeConfirmation(
    input: RevokeConfirmationInput,
    workspaceId: string,
    actor: ActorMetadata,
  ): Promise<ConfirmationResult> {
    const { orderId, type, reason, idempotencyKey } = input;

    const key = idempotencyKey ?? this.generateIdempotencyKey(`revoke-${type.toLowerCase()}`, orderId, actor);

    const cached = await this.idempotencyService.checkAndLock<ConfirmationResult>(
      key,
      { ttlSeconds: IDEMPOTENCY_TTL_SECONDS },
    );

    if (cached.exists) {
      this.logger.log(`Duplicate revoke request for order ${orderId}, returning cached result`);

      return cached.result;
    }

    try {
      const result = await this.doRevokeConfirmation(orderId, type, reason, workspaceId, actor);

      await this.idempotencyService.storeResult(key, result);

      return result;
    } catch (error) {
      await this.idempotencyService.releaseLock(key);
      throw error;
    }
  }

  /**
   * Lấy trạng thái xác nhận hiện tại của order
   */
  async getConfirmationStatus(
    orderId: string,
    workspaceId: string,
  ): Promise<OrderConfirmationStatus> {
    const order = await this.orderRepository.findById(orderId, workspaceId);

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    // Get latest confirmation history for each type
    const [saleHistory, accountingHistory] = await Promise.all([
      this.orderHistoryRepository.findLatestByAction(
        orderId,
        ORDER_HISTORY_ACTION.SALE_PAYMENT_CONFIRMED,
      ),
      this.orderHistoryRepository.findLatestByAction(
        orderId,
        ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMED,
      ),
    ]);

    const isProtected = this.isProtectedFromAutoLock(order);

    return {
      orderId,
      saleConfirmed: order.salePaymentConfirmed === true,
      saleConfirmedAt: saleHistory?.createdAt
        ? DateTimeUtils.toISO(DateTimeUtils.fromDate(saleHistory.createdAt))
        : undefined,
      saleConfirmedBy: saleHistory?.createdBy
        ? this.mapActorInfo(saleHistory.createdBy)
        : undefined,
      accountingConfirmed: order.accountingConfirmed === true,
      accountingConfirmedAt: accountingHistory?.createdAt
        ? DateTimeUtils.toISO(DateTimeUtils.fromDate(accountingHistory.createdAt))
        : undefined,
      accountingConfirmedBy: accountingHistory?.createdBy
        ? this.mapActorInfo(accountingHistory.createdBy)
        : undefined,
      isProtectedFromAutoLock: isProtected,
      protectionReason: this.getProtectionReason(order),
    };
  }

  /**
   * Lấy toàn bộ lịch sử xác nhận của order
   */
  async getConfirmationHistory(
    orderId: string,
    workspaceId: string,
  ): Promise<ConfirmationHistory> {
    // Verify order exists
    const order = await this.orderRepository.findById(orderId, workspaceId);

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    const histories = await this.orderHistoryRepository.findByOrderAndActions(
      orderId,
      CONFIRMATION_ACTIONS,
    );

    const confirmations: ConfirmationDetail[] = histories.map((h) => ({
      id: h.id,
      action: h.action,
      confirmedAt: DateTimeUtils.toISO(DateTimeUtils.fromDate(h.createdAt)),
      confirmedBy: this.mapActorInfo(h.createdBy),
      note: h.note ?? undefined,
      reason: this.extractReason(h),
      metadata: h.metadata as Record<string, unknown> | undefined,
    }));

    return {
      orderId,
      confirmations,
    };
  }

  /**
   * Check if order is protected from auto-lock
   */
  isProtectedFromAutoLock(order: {
    salePaymentConfirmed: boolean;
    accountingConfirmed: boolean;
  }): boolean {
    return order.salePaymentConfirmed === true || order.accountingConfirmed === true;
  }

  // ============================================
  // PRIVATE METHODS - CORE LOGIC
  // ============================================

  private async doConfirmBySale(
    orderId: string,
    workspaceId: string,
    actor: ActorMetadata,
    note?: string,
    metadata?: Record<string, unknown>,
  ): Promise<ConfirmationResult> {
    this.logger.log(`Sale confirming payment for order ${orderId}`);

    return this.transactionScope.runInTransaction(async () => {
      // 1. Fetch with pessimistic lock
      const order = await this.orderRepository.findByIdForUpdate(orderId, workspaceId);

      // 2. Validate
      this.validateSaleConfirmation(order, orderId);

      const now = DateTimeUtils.now();
      const confirmedAt = DateTimeUtils.toISO(now);

      // 3. Update with optimistic lock
      const updateResult = await this.orderRepository.updateWithVersion(
        orderId,
        { salePaymentConfirmed: true },
        order!.version,
      );

      if (!updateResult.affected) {
        throw new ConcurrencyException(orderId, 'Order was modified by another process');
      }

      const newVersion = order!.version + 1;

      // 4. Create history record
      await this.orderHistoryRepository.create({
        mktOrderId: orderId,
        action: ORDER_HISTORY_ACTION.SALE_PAYMENT_CONFIRMED,
        name: 'Sale confirmed payment',
        note: note ?? 'Payment confirmed by sale - license protected from auto-lock',
        createdBy: actor,
        oldValue: 'false',
        newValue: 'true',
        fieldName: 'salePaymentConfirmed',
        metadata: {
          confirmedAt,
          version: newVersion,
          ...metadata,
        },
      });

      this.logger.log(`Order ${orderId} payment confirmed by sale (version: ${newVersion})`);

      return {
        success: true,
        orderId,
        confirmedAt,
        confirmedBy: actor,
        type: PaymentConfirmationType.SALE,
        version: newVersion,
        note,
      };
    });
  }

  private async doConfirmByAccounting(
    orderId: string,
    workspaceId: string,
    actor: ActorMetadata,
    note?: string,
    metadata?: Record<string, unknown>,
  ): Promise<ConfirmationResult> {
    this.logger.log(`Accounting confirming payment for order ${orderId}`);

    return this.transactionScope.runInTransaction(async () => {
      // 1. Fetch with pessimistic lock
      const order = await this.orderRepository.findByIdForUpdate(orderId, workspaceId);

      // 2. Validate
      this.validateAccountingConfirmation(order, orderId);

      const now = DateTimeUtils.now();
      const confirmedAt = DateTimeUtils.toISO(now);

      // 3. Determine if should auto-complete
      const shouldComplete = order!.paymentStatus === PAYMENT_STATUS.PAID;

      const updateData: Partial<MktOrderWorkspaceEntity> = {
        accountingConfirmed: true,
      };

      if (shouldComplete) {
        updateData.status = ORDER_STATUS.COMPLETED;
      }

      // 4. Update with optimistic lock
      const updateResult = await this.orderRepository.updateWithVersion(
        orderId,
        updateData,
        order!.version,
      );

      if (!updateResult.affected) {
        throw new ConcurrencyException(orderId, 'Order was modified by another process');
      }

      const newVersion = order!.version + 1;

      // 5. Create history record
      await this.orderHistoryRepository.create({
        mktOrderId: orderId,
        action: ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMED,
        name: 'Accounting confirmed payment',
        note: note ?? 'Payment verified by accounting department',
        createdBy: actor,
        oldValue: 'false',
        newValue: 'true',
        fieldName: 'accountingConfirmed',
        metadata: {
          confirmedAt,
          orderCompleted: shouldComplete,
          previousStatus: order!.status,
          version: newVersion,
          ...metadata,
        },
      });

      this.logger.log(
        `Order ${orderId} payment confirmed by accounting (version: ${newVersion})${shouldComplete ? ' - order completed' : ''}`,
      );

      return {
        success: true,
        orderId,
        confirmedAt,
        confirmedBy: actor,
        type: PaymentConfirmationType.ACCOUNTING,
        version: newVersion,
        note,
      };
    });
  }

  private async doRevokeConfirmation(
    orderId: string,
    type: PaymentConfirmationType,
    reason: string,
    workspaceId: string,
    actor: ActorMetadata,
  ): Promise<ConfirmationResult> {
    this.logger.log(`Revoking ${type} confirmation for order ${orderId}`);

    return this.transactionScope.runInTransaction(async () => {
      // 1. Fetch with pessimistic lock
      const order = await this.orderRepository.findByIdForUpdate(orderId, workspaceId);

      if (!order) {
        throw new OrderNotFoundException(orderId);
      }

      const now = DateTimeUtils.now();
      const revokedAt = DateTimeUtils.toISO(now);

      let impact: RevokeImpact;

      if (type === PaymentConfirmationType.SALE) {
        impact = await this.revokeSaleConfirmation(order, reason, actor, revokedAt);
      } else {
        impact = await this.revokeAccountingConfirmation(order, reason, actor, revokedAt);
      }

      // Schedule immediate re-check for overdue if needed
      if (impact.willBeLocked) {
        await this.orderEventService.emit({
          type: 'CONFIRMATION_REVOKED',
          payload: { orderId, workspaceId, impact },
        });
      }

      return {
        success: true,
        orderId,
        confirmedAt: revokedAt,
        confirmedBy: actor,
        type,
        version: order.version + 1,
        note: reason,
        impact,
      };
    });
  }

  private async revokeSaleConfirmation(
    order: MktOrderWorkspaceEntity,
    reason: string,
    actor: ActorMetadata,
    revokedAt: string,
  ): Promise<RevokeImpact> {
    if (order.salePaymentConfirmed !== true) {
      throw new NoConfirmationToRevokeException(order.id, 'sale');
    }

    // Cannot revoke sale if accounting already confirmed
    if (order.accountingConfirmed === true) {
      throw new CannotRevokeSaleException(
        order.id,
        'Accounting has already confirmed. Revoke accounting confirmation first.',
      );
    }

    // Calculate impact before update
    const impact = this.calculateRevokeImpact(order, 'sale');

    // Update with optimistic lock
    const updateResult = await this.orderRepository.updateWithVersion(
      order.id,
      { salePaymentConfirmed: false },
      order.version,
    );

    if (!updateResult.affected) {
      throw new ConcurrencyException(order.id, 'Order was modified by another process');
    }

    // Create history
    await this.orderHistoryRepository.create({
      mktOrderId: order.id,
      action: ORDER_HISTORY_ACTION.SALE_CONFIRMATION_REVOKED,
      name: 'Sale confirmation revoked',
      note: reason,
      createdBy: actor,
      oldValue: 'true',
      newValue: 'false',
      fieldName: 'salePaymentConfirmed',
      metadata: {
        revokedAt,
        reason,
        impact,
        version: order.version + 1,
      },
    });

    this.logger.warn(
      `Sale confirmation revoked for order ${order.id}. ` +
      `Will be locked: ${impact.willBeLocked}. Reason: ${reason}`,
    );

    return impact;
  }

  private async revokeAccountingConfirmation(
    order: MktOrderWorkspaceEntity,
    reason: string,
    actor: ActorMetadata,
    revokedAt: string,
  ): Promise<RevokeImpact> {
    if (order.accountingConfirmed !== true) {
      throw new NoConfirmationToRevokeException(order.id, 'accounting');
    }

    const updateData: Partial<MktOrderWorkspaceEntity> = {
      accountingConfirmed: false,
    };

    let statusChanged = false;
    let previousStatus: string | undefined;
    let newStatus: string | undefined;

    // Revert COMPLETED to PROCESSING
    if (order.status === ORDER_STATUS.COMPLETED) {
      statusChanged = true;
      previousStatus = order.status;
      newStatus = ORDER_STATUS.PROCESSING;
      updateData.status = ORDER_STATUS.PROCESSING;
    }

    // Calculate impact
    const impact = this.calculateRevokeImpact(order, 'accounting');

    impact.statusChanged = statusChanged;
    impact.previousStatus = previousStatus;
    impact.newStatus = newStatus;

    // Update with optimistic lock
    const updateResult = await this.orderRepository.updateWithVersion(
      order.id,
      updateData,
      order.version,
    );

    if (!updateResult.affected) {
      throw new ConcurrencyException(order.id, 'Order was modified by another process');
    }

    // Create history
    await this.orderHistoryRepository.create({
      mktOrderId: order.id,
      action: ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMATION_REVOKED,
      name: 'Accounting confirmation revoked',
      note: reason,
      createdBy: actor,
      oldValue: 'true',
      newValue: 'false',
      fieldName: 'accountingConfirmed',
      metadata: {
        revokedAt,
        reason,
        statusChanged,
        previousStatus,
        newStatus,
        impact,
        version: order.version + 1,
      },
    });

    this.logger.warn(
      `Accounting confirmation revoked for order ${order.id}. ` +
      `Status changed: ${statusChanged}. Will be locked: ${impact.willBeLocked}. Reason: ${reason}`,
    );

    return impact;
  }

  // ============================================
  // PRIVATE METHODS - VALIDATION
  // ============================================

  private validateSaleConfirmation(
    order: MktOrderWorkspaceEntity | null,
    orderId: string,
  ): void {
    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    if (order.salePaymentConfirmed === true) {
      throw new OrderAlreadyConfirmedException(orderId, 'sale');
    }

    const { validOrderStatuses, excludePaymentStatuses } = CONFIRMATION_RULES.saleCanConfirm;

    if (!validOrderStatuses.includes(order.status as ORDER_STATUS)) {
      throw new InvalidOrderStatusException(orderId, order.status, validOrderStatuses);
    }

    if (excludePaymentStatuses.includes(order.paymentStatus as PAYMENT_STATUS)) {
      throw new OrderAlreadyPaidException(orderId);
    }
  }

  private validateAccountingConfirmation(
    order: MktOrderWorkspaceEntity | null,
    orderId: string,
  ): void {
    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    if (order.accountingConfirmed === true) {
      throw new OrderAlreadyConfirmedException(orderId, 'accounting');
    }

    const { validOrderStatuses } = CONFIRMATION_RULES.accountingCanConfirm;

    if (!validOrderStatuses.includes(order.status as ORDER_STATUS)) {
      throw new InvalidOrderStatusException(orderId, order.status, validOrderStatuses);
    }

    // Accounting cần có payment evidence
    const hasPaymentEvidence =
      order.paymentStatus === PAYMENT_STATUS.PAID ||
      order.salePaymentConfirmed === true;

    if (!hasPaymentEvidence) {
      throw new MissingPaymentEvidenceException(orderId);
    }
  }

  // ============================================
  // PRIVATE METHODS - HELPERS
  // ============================================

  private generateIdempotencyKey(
    action: string,
    orderId: string,
    actor: ActorMetadata,
  ): string {
    return `payment-confirm:${action}:${orderId}:${actor.workspaceMemberId}`;
  }

  private calculateRevokeImpact(
    order: MktOrderWorkspaceEntity,
    revokeType: 'sale' | 'accounting',
  ): RevokeImpact {
    const now = DateTimeUtils.now();
    const deadline = order.paymentDeadline
      ? DateTimeUtils.fromDate(order.paymentDeadline)
      : null;

    if (!deadline) {
      return {
        willBeLocked: false,
        reason: 'No payment deadline set',
      };
    }

    const isPastDeadline = DateTimeUtils.isBefore(deadline, now);

    // After revoke, check if still protected
    const stillProtected = revokeType === 'sale'
      ? order.accountingConfirmed === true // Still protected by accounting
      : order.salePaymentConfirmed === true; // Still protected by sale

    if (isPastDeadline && !stillProtected) {
      return {
        willBeLocked: true,
        reason: 'Order is past payment deadline and will lose protection after revoke',
      };
    }

    if (isPastDeadline && stillProtected) {
      return {
        willBeLocked: false,
        reason: `Order is past deadline but still protected by ${revokeType === 'sale' ? 'accounting' : 'sale'} confirmation`,
      };
    }

    return {
      willBeLocked: false,
      reason: 'Order is still within payment deadline',
    };
  }

  private getProtectionReason(order: MktOrderWorkspaceEntity): string {
    if (order.accountingConfirmed === true) {
      return 'Protected by accounting confirmation';
    }

    if (order.salePaymentConfirmed === true) {
      return 'Protected by sale confirmation';
    }

    return 'Not protected - may be auto-locked if past deadline';
  }

  private mapActorInfo(actor: ActorMetadata | undefined): ActorInfo {
    if (!actor) {
      return {
        id: 'unknown',
        name: 'Unknown',
      };
    }

    return {
      id: actor.workspaceMemberId ?? 'system',
      name: actor.name ?? 'Unknown',
      email: undefined, // Actor doesn't have email, can be enriched later
      role: undefined,
    };
  }

  private extractReason(history: { note?: string | null; metadata?: unknown }): string | undefined {
    // For revoke actions, reason is stored in note
    if (history.note) {
      return history.note;
    }

    // Or in metadata.reason
    const metadata = history.metadata as Record<string, unknown> | undefined;

    if (metadata?.reason && typeof metadata.reason === 'string') {
      return metadata.reason;
    }

    return undefined;
  }
}
```

### 6.2 Update MktOrderRepository

**File**: `packages/twenty-server/src/mkt-core/order/repositories/mkt-order.repository.ts`

```typescript
// Thêm imports
import { UpdateResult } from 'typeorm';

// Thêm type cho filter options
export type FindOverdueOrdersOptions = {
  status: string;
  paymentDeadlineBefore: Date;
  salePaymentConfirmed?: boolean;
  accountingConfirmed?: boolean;
};

// Thêm methods mới

/**
 * Find order with pessimistic lock (FOR UPDATE)
 * Dùng khi cần update atomic, tránh race condition
 */
async findByIdForUpdate(
  orderId: string,
  workspaceId: string,
): Promise<MktOrderWorkspaceEntity | null> {
  return this.getQueryBuilder(workspaceId)
    .setLock('pessimistic_write')
    .where('order.id = :orderId', { orderId })
    .getOne();
}

/**
 * Update with optimistic locking
 * Chỉ update nếu version match, tránh lost updates
 */
async updateWithVersion(
  orderId: string,
  data: Partial<MktOrderWorkspaceEntity>,
  expectedVersion: number,
): Promise<UpdateResult> {
  return this.repository.update(
    {
      id: orderId,
      version: expectedVersion,
    },
    {
      ...data,
      version: expectedVersion + 1,
    },
  );
}

/**
 * Find overdue orders that are NOT protected
 */
async findOverdueOrders(
  workspaceId: string,
  options: FindOverdueOrdersOptions,
): Promise<MktOrderWorkspaceEntity[]> {
  const {
    status,
    paymentDeadlineBefore,
    salePaymentConfirmed,
    accountingConfirmed,
  } = options;

  const queryBuilder = this.getQueryBuilder(workspaceId);

  queryBuilder
    .where('order.status = :status', { status })
    .andWhere('order.paymentDeadline < :deadline', { deadline: paymentDeadlineBefore });

  // Chỉ lấy orders chưa được xác nhận (strict comparison với false)
  if (salePaymentConfirmed === false) {
    queryBuilder.andWhere('order.salePaymentConfirmed = :saleConfirmed', {
      saleConfirmed: false,
    });
  }

  if (accountingConfirmed === false) {
    queryBuilder.andWhere('order.accountingConfirmed = :accountingConfirmed', {
      accountingConfirmed: false,
    });
  }

  return queryBuilder.getMany();
}
```

### 6.3 Update MktOrderHistoryRepository

**File**: `packages/twenty-server/src/mkt-core/order/repositories/mkt-order-history.repository.ts`

```typescript
// Thêm imports
import { In } from 'typeorm';

// Thêm methods mới

/**
 * Tìm history record mới nhất theo action
 */
async findLatestByAction(
  orderId: string,
  action: ORDER_HISTORY_ACTION,
): Promise<MktOrderHistoryWorkspaceEntity | null> {
  return this.repository.findOne({
    where: {
      mktOrderId: orderId,
      action,
    },
    order: {
      createdAt: 'DESC',
    },
  });
}

/**
 * Tìm tất cả history records theo danh sách actions
 */
async findByOrderAndActions(
  orderId: string,
  actions: ORDER_HISTORY_ACTION[],
): Promise<MktOrderHistoryWorkspaceEntity[]> {
  return this.repository.find({
    where: {
      mktOrderId: orderId,
      action: In(actions),
    },
    order: {
      createdAt: 'DESC',
    },
  });
}
```

### 6.4 Update PaymentOverdueScanService

**File**: `packages/twenty-server/src/mkt-core/order/services/core/payment-overdue-scan.service.ts`

```typescript
// Thay đổi trong method scanAndLockOverdueOrders

async scanAndLockOverdueOrders(
  workspaceId: string,
): Promise<PaymentOverdueScanResult> {
  const now = DateTimeUtils.toDateRequired(DateTimeUtils.now());

  // Tìm orders đang PROCESSING, quá deadline, VÀ CHƯA ĐƯỢC XÁC NHẬN
  // Sử dụng strict comparison: salePaymentConfirmed = false
  const overdueOrders = await this.orderRepository.findOverdueOrders(
    workspaceId,
    {
      status: ORDER_STATUS.PROCESSING,
      paymentDeadlineBefore: now,
      salePaymentConfirmed: false,   // Strict: chỉ lấy false, không lấy null
      accountingConfirmed: false,     // Strict: chỉ lấy false, không lấy null
    },
  );

  this.logger.log(
    `Found ${overdueOrders.length} unprotected overdue orders to process`,
  );

  // ... rest of the method
}
```

---

## 7. GraphQL API

### 7.1 DTOs

**File**: `packages/twenty-server/src/mkt-core/order/dto/payment-confirmation.dto.ts`

```typescript
import { Field, InputType, ObjectType, Int, registerEnumType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaymentConfirmationType } from 'src/mkt-core/order/types/payment-confirmation.types';

// Register enum for GraphQL
registerEnumType(PaymentConfirmationType, {
  name: 'PaymentConfirmationType',
  description: 'Type of payment confirmation',
});

// ============================================
// INPUT TYPES
// ============================================

@InputType({ description: 'Input for confirming payment' })
export class ConfirmPaymentInput {
  @Field({ description: 'Order ID to confirm' })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @Field({
    nullable: true,
    description: 'Idempotency key to prevent duplicate processing',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @Field({ nullable: true, description: 'Note for the confirmation' })
  @IsOptional()
  @IsString()
  note?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Additional metadata (bankRef, amount, etc.)',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

@InputType({ description: 'Input for revoking confirmation' })
export class RevokeConfirmationInput {
  @Field({ description: 'Order ID to revoke confirmation' })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @Field(() => PaymentConfirmationType, {
    description: 'Type of confirmation to revoke',
  })
  @IsNotEmpty()
  type: PaymentConfirmationType;

  @Field({ description: 'Reason for revoking (required)' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @Field({
    nullable: true,
    description: 'Idempotency key to prevent duplicate processing',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

// ============================================
// OUTPUT TYPES
// ============================================

@ObjectType({ description: 'Actor information' })
export class ActorInfoOutput {
  @Field({ description: 'Actor ID (workspace member ID)' })
  id: string;

  @Field({ description: 'Actor name' })
  name: string;

  @Field({ nullable: true, description: 'Actor email' })
  email?: string;

  @Field({ nullable: true, description: 'Actor role' })
  role?: string;
}

@ObjectType({ description: 'Impact of revoke action' })
export class RevokeImpactOutput {
  @Field({ description: 'Whether the order will be auto-locked after revoke' })
  willBeLocked: boolean;

  @Field({ description: 'Reason explaining the impact' })
  reason: string;

  @Field({ nullable: true, description: 'Whether status changed' })
  statusChanged?: boolean;

  @Field({ nullable: true, description: 'Previous status before revoke' })
  previousStatus?: string;

  @Field({ nullable: true, description: 'New status after revoke' })
  newStatus?: string;
}

@ObjectType({ description: 'Result of confirmation action' })
export class ConfirmationResultOutput {
  @Field({ description: 'Whether the action was successful' })
  success: boolean;

  @Field({ description: 'Order ID' })
  orderId: string;

  @Field({ description: 'Timestamp of the action (ISO format)' })
  confirmedAt: string;

  @Field(() => PaymentConfirmationType, { description: 'Type of confirmation' })
  type: PaymentConfirmationType;

  @Field(() => ActorInfoOutput, { description: 'Who performed the action' })
  actor: ActorInfoOutput;

  @Field({ nullable: true, description: 'Note provided with the action' })
  note?: string;

  @Field(() => Int, { description: 'New order version after update' })
  version: number;

  @Field(() => RevokeImpactOutput, {
    nullable: true,
    description: 'Impact info (only for revoke actions)',
  })
  impact?: RevokeImpactOutput;
}

@ObjectType({ description: 'Current confirmation status of an order' })
export class OrderConfirmationStatusOutput {
  @Field({ description: 'Order ID' })
  orderId: string;

  // Sale confirmation
  @Field({ description: 'Whether sale has confirmed payment' })
  saleConfirmed: boolean;

  @Field({ nullable: true, description: 'When sale confirmed (ISO format)' })
  saleConfirmedAt?: string;

  @Field(() => ActorInfoOutput, {
    nullable: true,
    description: 'Who confirmed (sale)',
  })
  saleConfirmedBy?: ActorInfoOutput;

  // Accounting confirmation
  @Field({ description: 'Whether accounting has confirmed payment' })
  accountingConfirmed: boolean;

  @Field({
    nullable: true,
    description: 'When accounting confirmed (ISO format)',
  })
  accountingConfirmedAt?: string;

  @Field(() => ActorInfoOutput, {
    nullable: true,
    description: 'Who confirmed (accounting)',
  })
  accountingConfirmedBy?: ActorInfoOutput;

  // Protection status
  @Field({ description: 'Whether order is protected from auto-lock' })
  isProtectedFromAutoLock: boolean;

  @Field({ nullable: true, description: 'Reason for protection status' })
  protectionReason?: string;
}

@ObjectType({ description: 'Single confirmation detail from history' })
export class ConfirmationDetailOutput {
  @Field({ description: 'History record ID' })
  id: string;

  @Field({ description: 'Action type' })
  action: string;

  @Field({ description: 'When the action was performed (ISO format)' })
  confirmedAt: string;

  @Field(() => ActorInfoOutput, { description: 'Who performed the action' })
  actor: ActorInfoOutput;

  @Field({ nullable: true, description: 'Note' })
  note?: string;

  @Field({ nullable: true, description: 'Reason (for revoke actions)' })
  reason?: string;

  @Field(() => GraphQLJSON, { nullable: true, description: 'Additional metadata' })
  metadata?: Record<string, unknown>;
}

@ObjectType({ description: 'Confirmation history of an order' })
export class ConfirmationHistoryOutput {
  @Field({ description: 'Order ID' })
  orderId: string;

  @Field(() => [ConfirmationDetailOutput], {
    description: 'List of confirmation actions (newest first)',
  })
  confirmations: ConfirmationDetailOutput[];
}
```

### 7.2 Resolver

**File**: `packages/twenty-server/src/mkt-core/order/resolvers/payment-confirmation.resolver.ts`

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceMember } from 'src/engine/core-modules/user/dtos/workspace-member.dto';
import { AuthWorkspaceMember } from 'src/engine/decorators/auth/auth-workspace-member.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import { PaymentConfirmationService } from 'src/mkt-core/order/services/domain/payment-confirmation.service';
import {
  ConfirmPaymentInput,
  RevokeConfirmationInput,
  ConfirmationResultOutput,
  OrderConfirmationStatusOutput,
  ConfirmationHistoryOutput,
  ActorInfoOutput,
} from 'src/mkt-core/order/dto/payment-confirmation.dto';

const CONFIRMATION_RESOURCE = 'mktOrderConfirmation';

/**
 * PaymentConfirmationResolver
 *
 * GraphQL resolver cho payment confirmation operations.
 *
 * Permissions:
 * - confirmPaymentBySale: Requires 'confirm:sale' action
 * - confirmPaymentByAccounting: Requires 'confirm:accounting' action
 * - revokePaymentConfirmation: Requires 'confirm:revoke' action
 * - getPaymentConfirmationStatus: Requires 'view' action
 * - getPaymentConfirmationHistory: Requires 'view-history' action
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class PaymentConfirmationResolver {
  constructor(
    private readonly paymentConfirmationService: PaymentConfirmationService,
  ) {}

  /**
   * Sale xác nhận thanh toán
   * Bảo vệ license khỏi bị khóa tự động
   */
  @Mutation(() => ConfirmationResultOutput, {
    description: 'Confirm payment by sale staff. Protects license from auto-lock.',
  })
  @DataScope({
    resource: CONFIRMATION_RESOURCE,
    action: 'confirm:sale',
    mode: 'AUTO',
    auditLevel: 'high',
  })
  async confirmPaymentBySale(
    @Args('input') input: ConfirmPaymentInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMember() workspaceMember: WorkspaceMember,
  ): Promise<ConfirmationResultOutput> {
    const actor = this.buildActorMetadata(workspaceMember);

    const result = await this.paymentConfirmationService.confirmBySale(
      input,
      workspace.id,
      actor,
    );

    return this.mapToResultOutput(result, workspaceMember);
  }

  /**
   * Kế toán xác nhận thanh toán
   * Hoàn tất order nếu đủ điều kiện
   */
  @Mutation(() => ConfirmationResultOutput, {
    description: 'Confirm payment by accounting. May complete the order if payment is PAID.',
  })
  @DataScope({
    resource: CONFIRMATION_RESOURCE,
    action: 'confirm:accounting',
    mode: 'AUTO',
    auditLevel: 'high',
  })
  async confirmPaymentByAccounting(
    @Args('input') input: ConfirmPaymentInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMember() workspaceMember: WorkspaceMember,
  ): Promise<ConfirmationResultOutput> {
    const actor = this.buildActorMetadata(workspaceMember);

    const result = await this.paymentConfirmationService.confirmByAccounting(
      input,
      workspace.id,
      actor,
    );

    return this.mapToResultOutput(result, workspaceMember);
  }

  /**
   * Hủy xác nhận thanh toán
   *
   * WARNING: Revoke có thể khiến order bị lock nếu đã quá deadline!
   */
  @Mutation(() => ConfirmationResultOutput, {
    description: 'Revoke payment confirmation. WARNING: May cause auto-lock if past deadline!',
  })
  @DataScope({
    resource: CONFIRMATION_RESOURCE,
    action: 'confirm:revoke',
    mode: 'AUTO',
    auditLevel: 'critical',
  })
  async revokePaymentConfirmation(
    @Args('input') input: RevokeConfirmationInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMember() workspaceMember: WorkspaceMember,
  ): Promise<ConfirmationResultOutput> {
    const actor = this.buildActorMetadata(workspaceMember);

    const result = await this.paymentConfirmationService.revokeConfirmation(
      input,
      workspace.id,
      actor,
    );

    return this.mapToResultOutput(result, workspaceMember);
  }

  /**
   * Lấy trạng thái xác nhận hiện tại
   */
  @Query(() => OrderConfirmationStatusOutput, {
    description: 'Get current confirmation status of an order',
  })
  @DataScope({
    resource: CONFIRMATION_RESOURCE,
    action: 'view',
    mode: 'AUTO',
    auditLevel: 'low',
  })
  async getPaymentConfirmationStatus(
    @Args('orderId') orderId: string,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<OrderConfirmationStatusOutput> {
    const status = await this.paymentConfirmationService.getConfirmationStatus(
      orderId,
      workspace.id,
    );

    return {
      orderId: status.orderId,
      saleConfirmed: status.saleConfirmed,
      saleConfirmedAt: status.saleConfirmedAt,
      saleConfirmedBy: status.saleConfirmedBy
        ? this.mapActorInfoOutput(status.saleConfirmedBy)
        : undefined,
      accountingConfirmed: status.accountingConfirmed,
      accountingConfirmedAt: status.accountingConfirmedAt,
      accountingConfirmedBy: status.accountingConfirmedBy
        ? this.mapActorInfoOutput(status.accountingConfirmedBy)
        : undefined,
      isProtectedFromAutoLock: status.isProtectedFromAutoLock,
      protectionReason: status.protectionReason,
    };
  }

  /**
   * Lấy lịch sử xác nhận
   */
  @Query(() => ConfirmationHistoryOutput, {
    description: 'Get confirmation history of an order',
  })
  @DataScope({
    resource: CONFIRMATION_RESOURCE,
    action: 'view-history',
    mode: 'AUTO',
    auditLevel: 'low',
  })
  async getPaymentConfirmationHistory(
    @Args('orderId') orderId: string,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<ConfirmationHistoryOutput> {
    const history = await this.paymentConfirmationService.getConfirmationHistory(
      orderId,
      workspace.id,
    );

    return {
      orderId: history.orderId,
      confirmations: history.confirmations.map((c) => ({
        id: c.id,
        action: c.action,
        confirmedAt: c.confirmedAt,
        actor: this.mapActorInfoOutput(c.confirmedBy),
        note: c.note,
        reason: c.reason,
        metadata: c.metadata,
      })),
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private buildActorMetadata(workspaceMember: WorkspaceMember) {
    return {
      source: 'MANUAL' as const,
      name: this.getFullName(workspaceMember),
      workspaceMemberId: workspaceMember.id,
    };
  }

  private getFullName(workspaceMember: WorkspaceMember): string {
    const firstName = workspaceMember.name?.firstName ?? '';
    const lastName = workspaceMember.name?.lastName ?? '';

    return `${firstName} ${lastName}`.trim() || 'Unknown';
  }

  private mapToResultOutput(
    result: {
      success: boolean;
      orderId: string;
      confirmedAt: string;
      type: string;
      version: number;
      note?: string;
      impact?: {
        willBeLocked: boolean;
        reason: string;
        statusChanged?: boolean;
        previousStatus?: string;
        newStatus?: string;
      };
    },
    workspaceMember: WorkspaceMember,
  ): ConfirmationResultOutput {
    return {
      success: result.success,
      orderId: result.orderId,
      confirmedAt: result.confirmedAt,
      type: result.type as ConfirmationResultOutput['type'],
      actor: {
        id: workspaceMember.id,
        name: this.getFullName(workspaceMember),
        email: undefined,
        role: undefined,
      },
      note: result.note,
      version: result.version,
      impact: result.impact
        ? {
            willBeLocked: result.impact.willBeLocked,
            reason: result.impact.reason,
            statusChanged: result.impact.statusChanged,
            previousStatus: result.impact.previousStatus,
            newStatus: result.impact.newStatus,
          }
        : undefined,
    };
  }

  private mapActorInfoOutput(actor: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  }): ActorInfoOutput {
    return {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: actor.role,
    };
  }
}
```

---

## 8. Permission Configuration

**File**: `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/constants/permissions.constants.ts`

```typescript
/**
 * Payment confirmation permissions
 */
export const ORDER_CONFIRMATION_PERMISSIONS = {
  CONFIRM_SALE: 'order:confirm:sale',
  CONFIRM_ACCOUNTING: 'order:confirm:accounting',
  CONFIRM_REVOKE: 'order:confirm:revoke',
  VIEW: 'order:confirm:view',
  VIEW_HISTORY: 'order:confirm:view-history',
} as const;

/**
 * Role-permission mapping for confirmation
 */
export const CONFIRMATION_ROLE_PERMISSIONS = {
  // Sales staff can confirm their orders
  sale: [
    ORDER_CONFIRMATION_PERMISSIONS.CONFIRM_SALE,
    ORDER_CONFIRMATION_PERMISSIONS.VIEW,
  ],

  // Accounting can confirm and view
  accounting: [
    ORDER_CONFIRMATION_PERMISSIONS.CONFIRM_ACCOUNTING,
    ORDER_CONFIRMATION_PERMISSIONS.VIEW,
    ORDER_CONFIRMATION_PERMISSIONS.VIEW_HISTORY,
  ],

  // Managers can do everything except accounting confirm
  manager: [
    ORDER_CONFIRMATION_PERMISSIONS.CONFIRM_SALE,
    ORDER_CONFIRMATION_PERMISSIONS.CONFIRM_REVOKE,
    ORDER_CONFIRMATION_PERMISSIONS.VIEW,
    ORDER_CONFIRMATION_PERMISSIONS.VIEW_HISTORY,
  ],

  // Admins have all permissions
  admin: Object.values(ORDER_CONFIRMATION_PERMISSIONS),
} as const;
```

---

## 9. Module Registration

**File**: `packages/twenty-server/src/mkt-core/order/mkt-order.module.ts`

```typescript
// Thêm imports
import { PaymentConfirmationService } from './services/domain/payment-confirmation.service';
import { PaymentConfirmationResolver } from './resolvers/payment-confirmation.resolver';

@Module({
  imports: [
    // ... existing imports
    IdempotencyModule.register(), // Already imported for other operations
  ],
  providers: [
    // ... existing providers

    // Payment Confirmation
    PaymentConfirmationService,
    PaymentConfirmationResolver,
  ],
  exports: [
    // ... existing exports
    PaymentConfirmationService,
  ],
})
export class MktOrderModule {}
```

---

## 10. Migration

### 10.1 TypeORM Migration

**File**: `packages/twenty-server/src/database/typeorm/core/migrations/YYYYMMDDHHMMSS-add-sale-payment-confirmed.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalePaymentConfirmed1234567890123 implements MigrationInterface {
  name = 'AddSalePaymentConfirmed1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add salePaymentConfirmed column with default false
    await queryRunner.query(`
      ALTER TABLE "mktOrder"
      ADD COLUMN IF NOT EXISTS "salePaymentConfirmed" BOOLEAN NOT NULL DEFAULT false
    `);

    // 2. Add version column for optimistic locking
    await queryRunner.query(`
      ALTER TABLE "mktOrder"
      ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1
    `);

    // 3. Create index for overdue scan performance
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mkt_order_overdue_scan
      ON "mktOrder" ("status", "paymentDeadline", "salePaymentConfirmed", "accountingConfirmed")
      WHERE "deletedAt" IS NULL
    `);

    // 4. Create index for confirmation history
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mkt_order_history_confirmation
      ON "mktOrderHistory" ("mktOrderId", "action", "createdAt" DESC)
      WHERE "action" IN (
        'SALE_PAYMENT_CONFIRMED',
        'SALE_CONFIRMATION_REVOKED',
        'ACCOUNTING_CONFIRMED',
        'ACCOUNTING_CONFIRMATION_REVOKED'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_mkt_order_history_confirmation`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_mkt_order_overdue_scan`);
    await queryRunner.query(`ALTER TABLE "mktOrder" DROP COLUMN IF EXISTS "version"`);
    await queryRunner.query(`ALTER TABLE "mktOrder" DROP COLUMN IF EXISTS "salePaymentConfirmed"`);
  }
}
```

### 10.2 Migration Steps

```bash
# Step 1: Add Field IDs
# Edit mkt-field-ids.ts

# Step 2: Add Entity Fields
# Edit mkt-order.workspace-entity.ts

# Step 3: Add History Actions
# Edit order-history-action.constants.ts

# Step 4: Sync Metadata
npx nx run twenty-server:command workspace:sync-metadata -f

# Step 5: Run Migration
npx nx run twenty-server:typeorm migration:run

# Step 6: Verify
npx nx run twenty-server:command -- --help
```

---

## 11. GraphQL Examples

### 11.1 Sale Confirm Payment

```graphql
mutation ConfirmPaymentBySale {
  confirmPaymentBySale(input: {
    orderId: "order-uuid-here"
    idempotencyKey: "sale-confirm-order-uuid-timestamp"
    note: "Khách hàng đã chuyển khoản, chờ đối soát"
    metadata: {
      bankRef: "FT24123456789"
      amount: 5000000
    }
  }) {
    success
    orderId
    confirmedAt
    type
    actor {
      id
      name
    }
    version
  }
}
```

### 11.2 Accounting Confirm Payment

```graphql
mutation ConfirmPaymentByAccounting {
  confirmPaymentByAccounting(input: {
    orderId: "order-uuid-here"
    note: "Đã đối soát với ngân hàng"
    metadata: {
      invoiceNumber: "INV-2024-001234"
      verifiedAmount: 5000000
    }
  }) {
    success
    orderId
    confirmedAt
    type
    actor {
      id
      name
    }
    version
  }
}
```

### 11.3 Revoke Confirmation

```graphql
mutation RevokeConfirmation {
  revokePaymentConfirmation(input: {
    orderId: "order-uuid-here"
    type: SALE
    reason: "Phát hiện số tiền không khớp"
  }) {
    success
    orderId
    confirmedAt
    type
    version
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

### 11.4 Get Confirmation Status

```graphql
query GetConfirmationStatus {
  getPaymentConfirmationStatus(orderId: "order-uuid-here") {
    orderId
    saleConfirmed
    saleConfirmedAt
    saleConfirmedBy {
      id
      name
    }
    accountingConfirmed
    accountingConfirmedAt
    accountingConfirmedBy {
      id
      name
    }
    isProtectedFromAutoLock
    protectionReason
  }
}
```

### 11.5 Get Confirmation History

```graphql
query GetConfirmationHistory {
  getPaymentConfirmationHistory(orderId: "order-uuid-here") {
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

---

## 12. Testing

### 12.1 Unit Tests

```typescript
// payment-confirmation.service.spec.ts

describe('PaymentConfirmationService', () => {
  describe('confirmBySale', () => {
    it('should confirm when order is PROCESSING and payment is PENDING', async () => {});
    it('should throw OrderNotFoundException when order not exists', async () => {});
    it('should throw OrderAlreadyConfirmedException when already confirmed', async () => {});
    it('should throw InvalidOrderStatusException when order is COMPLETED', async () => {});
    it('should throw OrderAlreadyPaidException when paymentStatus is PAID', async () => {});
    it('should handle concurrent requests with optimistic lock', async () => {});
    it('should return cached result for duplicate idempotencyKey', async () => {});
  });

  describe('confirmByAccounting', () => {
    it('should confirm and complete order when paymentStatus is PAID', async () => {});
    it('should confirm without completing when paymentStatus is not PAID', async () => {});
    it('should throw MissingPaymentEvidenceException when no evidence', async () => {});
  });

  describe('revokeConfirmation', () => {
    it('should revoke sale confirmation and calculate impact', async () => {});
    it('should throw CannotRevokeSaleException when accounting already confirmed', async () => {});
    it('should revert COMPLETED order to PROCESSING when revoking accounting', async () => {});
    it('should throw NoConfirmationToRevokeException when nothing to revoke', async () => {});
    it('should emit event for overdue check when impact.willBeLocked', async () => {});
  });

  describe('isProtectedFromAutoLock', () => {
    it('should return true when salePaymentConfirmed is true', () => {});
    it('should return true when accountingConfirmed is true', () => {});
    it('should return false when both are false', () => {});
  });
});
```

### 12.2 Integration Tests

```typescript
// payment-confirmation.integration.spec.ts

describe('PaymentConfirmation Integration', () => {
  describe('Permission Tests', () => {
    it('should allow sale role to confirmBySale', async () => {});
    it('should deny sale role from confirmByAccounting', async () => {});
    it('should allow accounting role to confirmByAccounting', async () => {});
    it('should require manager role to revokeConfirmation', async () => {});
  });

  describe('Transaction Tests', () => {
    it('should rollback order update if history creation fails', async () => {});
    it('should not create history if order update fails', async () => {});
    it('should handle version conflict gracefully', async () => {});
  });

  describe('Race Condition Tests', () => {
    it('should handle concurrent sale confirmations', async () => {});
    it('should handle confirm + revoke race condition', async () => {});
  });

  describe('Overdue Scan Integration', () => {
    it('should skip confirmed orders in overdue scan', async () => {});
    it('should lock order after revoke if past deadline', async () => {});
  });
});
```

### 12.3 E2E Tests

```typescript
// payment-confirmation.e2e.spec.ts

describe('PaymentConfirmation E2E', () => {
  it('Full flow: Create → Sale confirm → Deadline passes → License NOT locked', async () => {});
  it('Full flow: Create → No confirm → Deadline passes → License locked', async () => {});
  it('Full flow: Sale confirm → Revoke → Deadline passes → License locked', async () => {});
  it('Full flow: Sale confirm → Accounting confirm → Order completed', async () => {});
  it('Full flow: Accounting confirm on PAID order → Immediate complete', async () => {});
});
```

---

## 13. Security Considerations

### 13.1 Authorization

| Action | Required Permission | Audit Level |
|--------|---------------------|-------------|
| Sale confirm | `order:confirm:sale` | HIGH |
| Accounting confirm | `order:confirm:accounting` | HIGH |
| Revoke | `order:confirm:revoke` | CRITICAL |
| View status | `order:confirm:view` | LOW |
| View history | `order:confirm:view-history` | LOW |

### 13.2 Audit Trail

Tất cả actions được ghi vào OrderHistory với:
- `createdBy`: Actor metadata (name, workspaceMemberId)
- `createdAt`: Timestamp
- `metadata`: Additional context (version, impact, etc.)
- `note/reason`: User-provided explanation

### 13.3 Data Integrity

- **NOT NULL constraints**: `salePaymentConfirmed` default false, never null
- **Optimistic locking**: Version field prevents lost updates
- **Transaction safety**: All updates wrapped in transaction
- **Idempotency**: Duplicate requests return cached result
- **Immutable history**: OrderHistory cannot be modified/deleted

---

## 14. Implementation Roadmap

### 14.1 Phase Overview

| Phase | Priority | Scope | Status |
|-------|----------|-------|--------|
| Phase 1 | Critical | Exceptions + Types + Constants | ✅ Done |
| Phase 2 | High | Service + Repository + Resolver | ⬜ Pending |
| Phase 3 | Medium | DTOs + Module Registration | ⬜ Pending |
| Phase 4 | Polish | Tests + Migration + Documentation | ⬜ Pending |

### 14.2 Phase 1: Foundation (Critical)

**Goal**: Thiết lập foundation với types, constants và exception classes.

**Tasks**:
- [x] Create `exceptions/payment-confirmation.exceptions.ts`
- [x] Create `constants/confirmation-rules.constants.ts`
- [x] Create `types/payment-confirmation.types.ts`
- [x] Add ORDER_HISTORY_ACTION enum values
- [x] Add repository methods (findByIdForUpdate, findLatestByAction)

**Files to create/modify**:
```
order/
├── exceptions/
│   └── payment-confirmation.exceptions.ts (NEW)
├── constants/
│   ├── confirmation-rules.constants.ts (NEW)
│   └── order-history-action.constants.ts (MODIFY)
├── types/
│   └── payment-confirmation.types.ts (NEW)
└── repositories/
    ├── mkt-order.repository.ts (MODIFY)
    └── mkt-order-history.repository.ts (MODIFY)
```

### 14.3 Phase 2: Core Implementation (High)

**Goal**: Implement service layer với transaction, optimistic locking.

**Tasks**:
- [ ] Create `PaymentConfirmationService` with transaction wrapping
- [ ] Implement `confirmBySale` method
- [ ] Implement `confirmByAccounting` method
- [ ] Implement `revokeConfirmation` method
- [ ] Implement `getConfirmationStatus` method
- [ ] Implement `getConfirmationHistory` method
- [ ] Create `PaymentConfirmationResolver`

**Files to create**:
```
order/
├── services/
│   └── domain/
│       └── payment-confirmation.service.ts (NEW)
└── resolvers/
    └── payment-confirmation.resolver.ts (NEW)
```

### 14.4 Phase 3: API Layer (Medium)

**Goal**: Complete GraphQL API với DTOs và module registration.

**Tasks**:
- [ ] Create `dto/payment-confirmation.dto.ts`
- [ ] Register in `mkt-order.module.ts`
- [ ] Add permission constants
- [ ] Update index exports

**Files to create/modify**:
```
order/
├── dto/
│   ├── payment-confirmation.dto.ts (NEW)
│   └── index.ts (MODIFY)
├── services/
│   └── domain/
│       └── index.ts (MODIFY)
├── resolvers/
│   └── index.ts (MODIFY)
└── mkt-order.module.ts (MODIFY)
```

### 14.5 Phase 4: Testing & Migration (Polish)

**Goal**: Complete với tests, migration và documentation.

**Tasks**:
- [ ] Create unit tests for PaymentConfirmationService
- [ ] Create integration tests
- [ ] Create TypeORM migration
- [ ] Update documentation

**Files to create**:
```
order/
├── __tests__/
│   └── payment-confirmation.service.spec.ts (NEW)
└── database/
    └── migrations/
        └── YYYYMMDDHHMMSS-add-sale-payment-confirmed.ts (NEW)
```

### 14.6 Checklist Progress

```
Phase 1: Foundation
[✅] exceptions/payment-confirmation.exceptions.ts
[✅] constants/confirmation-rules.constants.ts
[✅] types/payment-confirmation.types.ts
[✅] order-history-action.constants.ts (add 4 actions)
[✅] mkt-order.repository.ts (findByIdForUpdate)
[✅] mkt-order-history.repository.ts (findLatestByAction, findByOrderAndActions)

Phase 2: Core Implementation
[⬜] payment-confirmation.service.ts
[⬜] payment-confirmation.resolver.ts

Phase 3: API Layer
[⬜] payment-confirmation.dto.ts
[⬜] mkt-order.module.ts registration
[⬜] permissions.constants.ts
[⬜] index.ts exports

Phase 4: Testing & Migration
[⬜] Unit tests
[⬜] Integration tests
[⬜] TypeORM migration
[⬜] E2E tests
```

---

## 15. Future Enhancements

1. **Email notifications** khi Sale/Accounting xác nhận
2. **Slack integration** cho team notifications
3. **Deadline extension** khi Sale confirm (gia hạn thêm X ngày)
4. **Multi-level approval** (Manager approve sau Sale)
5. **Batch confirmation** cho multiple orders
6. **Auto-confirm** từ SEPay webhook khi match amount
7. **Dashboard widget** hiển thị orders cần confirm
8. **Reminder notifications** cho orders chưa được accounting confirm
