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

### 1.3 Design Decision

**Hybrid Approach**: Kết hợp boolean field (quick check) và OrderHistory (audit trail)

| Component | Purpose |
|-----------|---------|
| `Order.salePaymentConfirmed` | Boolean để job scan filter nhanh |
| `Order.accountingConfirmed` | Boolean xác nhận kế toán (đã có) |
| `OrderHistory` | Track chi tiết: ai, khi nào, lịch sử thay đổi |

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GraphQL Layer                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  OrderConfirmationResolver                                               │
│  ├─ confirmPaymentBySale(orderId, input)                                │
│  ├─ confirmPaymentByAccounting(orderId, input)                          │
│  ├─ revokePaymentConfirmation(orderId, type)                            │
│  └─ getPaymentConfirmationHistory(orderId)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Service Layer                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  PaymentConfirmationService                                              │
│  ├─ confirmBySale()      → Update Order + Create History                │
│  ├─ confirmByAccounting() → Update Order + Create History + Complete    │
│  ├─ revokeConfirmation() → Update Order + Create History                │
│  └─ getConfirmationStatus() → Query Order + History                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────────────┐
│     MktOrderRepository      │   │     MktOrderHistoryRepository       │
├─────────────────────────────┤   ├─────────────────────────────────────┤
│ update()                    │   │ create()                            │
│ findById()                  │   │ findByOrderAndAction()              │
│ findOverdueOrders()         │   │ findConfirmationHistory()           │
└─────────────────────────────┘   └─────────────────────────────────────┘
```

### 2.2 Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    PAYMENT CONFIRMATION FLOW                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐       │
│   │   PENDING   │ ──────→ │ PROCESSING  │ ──────→ │  COMPLETED  │       │
│   │   PAYMENT   │ confirm │             │ account │             │       │
│   └─────────────┘  order  └──────┬──────┘ confirm └─────────────┘       │
│                                  │                                       │
│                           ┌──────┴──────┐                               │
│                           │  DEADLINE   │                               │
│                           │  EXCEEDED?  │                               │
│                           └──────┬──────┘                               │
│                                  │                                       │
│              ┌───────────────────┼───────────────────┐                  │
│              ▼                   ▼                   ▼                  │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│   │ saleConfirmed   │  │ saleConfirmed   │  │ accountConfirm  │        │
│   │    = false      │  │    = true       │  │    = true       │        │
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘        │
│            │                    │                    │                  │
│            ▼                    ▼                    ▼                  │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│   │     LOCKED      │  │   PROTECTED     │  │    COMPLETED    │        │
│   │ (license khóa)  │  │ (chờ kế toán)   │  │  (hoàn tất)     │        │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Changes

### 3.1 Order Entity - New Field

**File**: `packages/twenty-server/src/mkt-core/order/objects/mkt-order.workspace-entity.ts`

```typescript
// Thêm vào sau accountingConfirmed field (line ~230)

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.salePaymentConfirmed,
  type: FieldMetadataType.BOOLEAN,
  label: msg`Sale Payment Confirmed`,
  description: msg`Whether sale has confirmed payment (protects license from auto-lock)`,
  icon: 'IconUserCheck',
  defaultValue: false,
})
@WorkspaceIsNullable()
salePaymentConfirmed?: boolean;
```

### 3.2 Field ID Registration

**File**: `packages/twenty-server/src/mkt-core/constants/mkt-field-ids.ts`

```typescript
// Thêm vào MKT_ORDER_FIELD_IDS
export const MKT_ORDER_FIELD_IDS = {
  // ... existing fields
  salePaymentConfirmed: '20250203-0001-4000-8000-000000000001', // Generate new UUID
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

---

## 4. Types Definition

### 4.1 Confirmation Types

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
};

/**
 * Trạng thái xác nhận của order
 */
export type OrderConfirmationStatus = {
  orderId: string;
  saleConfirmed: boolean;
  saleConfirmedAt?: string;
  saleConfirmedBy?: ActorMetadata;
  accountingConfirmed: boolean;
  accountingConfirmedAt?: string;
  accountingConfirmedBy?: ActorMetadata;
};

/**
 * Chi tiết một lần xác nhận từ history
 */
export type ConfirmationDetail = {
  id: string;
  action: string;
  confirmedAt: string;
  confirmedBy: ActorMetadata;
  note?: string;
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

## 5. Service Implementation

### 5.1 PaymentConfirmationService

**File**: `packages/twenty-server/src/mkt-core/order/services/domain/payment-confirmation.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { ORDER_HISTORY_ACTION } from 'src/mkt-core/order/constants';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MktOrderHistoryRepository } from 'src/mkt-core/order/repositories/mkt-order-history.repository';
import {
  ConfirmPaymentInput,
  ConfirmationResult,
  ConfirmationHistory,
  ConfirmationDetail,
  OrderConfirmationStatus,
  PaymentConfirmationType,
  RevokeConfirmationInput,
} from 'src/mkt-core/order/types/payment-confirmation.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

const CONFIRMATION_ACTIONS = [
  ORDER_HISTORY_ACTION.SALE_PAYMENT_CONFIRMED,
  ORDER_HISTORY_ACTION.SALE_CONFIRMATION_REVOKED,
  ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMED,
  ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMATION_REVOKED,
];

/**
 * PaymentConfirmationService
 *
 * Xử lý logic xác nhận thanh toán từ Sale và Kế toán.
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
  ) {}

  /**
   * Sale xác nhận thanh toán
   *
   * - Cập nhật Order.salePaymentConfirmed = true
   * - Tạo OrderHistory với action SALE_PAYMENT_CONFIRMED
   * - License được "bảo vệ" khỏi auto-lock
   */
  async confirmBySale(
    input: ConfirmPaymentInput,
    workspaceId: string,
    actor: ActorMetadata,
  ): Promise<ConfirmationResult> {
    const { orderId, note, metadata } = input;

    this.logger.log(`Sale confirming payment for order ${orderId}`);

    // 1. Validate order exists and is in valid state
    const order = await this.orderRepository.findById(orderId, workspaceId);

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.salePaymentConfirmed) {
      throw new Error(`Order ${orderId} already confirmed by sale`);
    }

    const validStatuses = [ORDER_STATUS.PROCESSING, ORDER_STATUS.PENDING_PAYMENT];

    if (!validStatuses.includes(order.status as string)) {
      throw new Error(
        `Cannot confirm payment for order in status: ${order.status}`,
      );
    }

    const now = DateTimeUtils.now();
    const confirmedAt = DateTimeUtils.toISO(now);

    // 2. Update order
    await this.orderRepository.update(orderId, {
      salePaymentConfirmed: true,
    });

    // 3. Create history record
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
        ...metadata,
      },
    });

    this.logger.log(`Order ${orderId} payment confirmed by sale`);

    return {
      success: true,
      orderId,
      confirmedAt,
      confirmedBy: actor,
      type: PaymentConfirmationType.SALE,
    };
  }

  /**
   * Kế toán xác nhận thanh toán
   *
   * - Cập nhật Order.accountingConfirmed = true
   * - Tạo OrderHistory với action ACCOUNTING_CONFIRMED
   * - Nếu đủ điều kiện, chuyển order sang COMPLETED
   */
  async confirmByAccounting(
    input: ConfirmPaymentInput,
    workspaceId: string,
    actor: ActorMetadata,
  ): Promise<ConfirmationResult> {
    const { orderId, note, metadata } = input;

    this.logger.log(`Accounting confirming payment for order ${orderId}`);

    // 1. Validate order
    const order = await this.orderRepository.findById(orderId, workspaceId);

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.accountingConfirmed) {
      throw new Error(`Order ${orderId} already confirmed by accounting`);
    }

    const now = DateTimeUtils.now();
    const confirmedAt = DateTimeUtils.toISO(now);

    // 2. Update order - accounting confirmation completes the order
    const updateData: Record<string, unknown> = {
      accountingConfirmed: true,
    };

    // Auto-complete if payment is fully confirmed
    const shouldComplete = order.paymentStatus === 'PAID' || order.salePaymentConfirmed;

    if (shouldComplete) {
      updateData.status = ORDER_STATUS.COMPLETED;
    }

    await this.orderRepository.update(orderId, updateData);

    // 3. Create history record
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
        ...metadata,
      },
    });

    this.logger.log(
      `Order ${orderId} payment confirmed by accounting${shouldComplete ? ' - order completed' : ''}`,
    );

    return {
      success: true,
      orderId,
      confirmedAt,
      confirmedBy: actor,
      type: PaymentConfirmationType.ACCOUNTING,
    };
  }

  /**
   * Hủy xác nhận thanh toán
   *
   * Cho phép hủy xác nhận của Sale hoặc Kế toán nếu cần
   */
  async revokeConfirmation(
    input: RevokeConfirmationInput,
    workspaceId: string,
    actor: ActorMetadata,
  ): Promise<ConfirmationResult> {
    const { orderId, type, reason } = input;

    this.logger.log(`Revoking ${type} confirmation for order ${orderId}`);

    const order = await this.orderRepository.findById(orderId, workspaceId);

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const now = DateTimeUtils.now();
    const revokedAt = DateTimeUtils.toISO(now);

    if (type === PaymentConfirmationType.SALE) {
      if (!order.salePaymentConfirmed) {
        throw new Error(`Order ${orderId} has no sale confirmation to revoke`);
      }

      await this.orderRepository.update(orderId, {
        salePaymentConfirmed: false,
      });

      await this.orderHistoryRepository.create({
        mktOrderId: orderId,
        action: ORDER_HISTORY_ACTION.SALE_CONFIRMATION_REVOKED,
        name: 'Sale confirmation revoked',
        note: reason,
        createdBy: actor,
        oldValue: 'true',
        newValue: 'false',
        fieldName: 'salePaymentConfirmed',
        metadata: { revokedAt, reason },
      });
    } else {
      if (!order.accountingConfirmed) {
        throw new Error(`Order ${orderId} has no accounting confirmation to revoke`);
      }

      await this.orderRepository.update(orderId, {
        accountingConfirmed: false,
        // Revert to PROCESSING if was COMPLETED
        ...(order.status === ORDER_STATUS.COMPLETED && {
          status: ORDER_STATUS.PROCESSING,
        }),
      });

      await this.orderHistoryRepository.create({
        mktOrderId: orderId,
        action: ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMATION_REVOKED,
        name: 'Accounting confirmation revoked',
        note: reason,
        createdBy: actor,
        oldValue: 'true',
        newValue: 'false',
        fieldName: 'accountingConfirmed',
        metadata: { revokedAt, reason },
      });
    }

    this.logger.log(`${type} confirmation revoked for order ${orderId}`);

    return {
      success: true,
      orderId,
      confirmedAt: revokedAt,
      confirmedBy: actor,
      type,
    };
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
      throw new Error(`Order ${orderId} not found`);
    }

    // Get latest confirmation history for each type
    const saleHistory = await this.orderHistoryRepository.findLatestByAction(
      orderId,
      ORDER_HISTORY_ACTION.SALE_PAYMENT_CONFIRMED,
    );

    const accountingHistory = await this.orderHistoryRepository.findLatestByAction(
      orderId,
      ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMED,
    );

    return {
      orderId,
      saleConfirmed: order.salePaymentConfirmed ?? false,
      saleConfirmedAt: saleHistory?.createdAt
        ? DateTimeUtils.toISO(DateTimeUtils.fromDate(saleHistory.createdAt))
        : undefined,
      saleConfirmedBy: saleHistory?.createdBy,
      accountingConfirmed: order.accountingConfirmed ?? false,
      accountingConfirmedAt: accountingHistory?.createdAt
        ? DateTimeUtils.toISO(DateTimeUtils.fromDate(accountingHistory.createdAt))
        : undefined,
      accountingConfirmedBy: accountingHistory?.createdBy,
    };
  }

  /**
   * Lấy toàn bộ lịch sử xác nhận của order
   */
  async getConfirmationHistory(
    orderId: string,
    workspaceId: string,
  ): Promise<ConfirmationHistory> {
    const histories = await this.orderHistoryRepository.findByOrderAndActions(
      orderId,
      CONFIRMATION_ACTIONS,
    );

    const confirmations: ConfirmationDetail[] = histories.map((h) => ({
      id: h.id,
      action: h.action,
      confirmedAt: DateTimeUtils.toISO(DateTimeUtils.fromDate(h.createdAt)),
      confirmedBy: h.createdBy,
      note: h.note,
      metadata: h.metadata as Record<string, unknown>,
    }));

    return {
      orderId,
      confirmations,
    };
  }

  /**
   * Check if order is protected from auto-lock
   * (Sale đã xác nhận hoặc Kế toán đã xác nhận)
   */
  isProtectedFromAutoLock(order: {
    salePaymentConfirmed?: boolean;
    accountingConfirmed?: boolean;
  }): boolean {
    return order.salePaymentConfirmed === true || order.accountingConfirmed === true;
  }
}
```

### 5.2 Update PaymentOverdueScanService

**File**: `packages/twenty-server/src/mkt-core/order/services/core/payment-overdue-scan.service.ts`

```typescript
// Thay đổi trong method scanAndLockOverdueOrders

async scanAndLockOverdueOrders(
  workspaceId: string,
): Promise<PaymentOverdueScanResult> {
  const now = DateTimeUtils.toDateRequired(DateTimeUtils.now());

  // Tìm orders đang PROCESSING, quá deadline, VÀ CHƯA ĐƯỢC SALE XÁC NHẬN
  const overdueOrders = await this.orderRepository.findOverdueOrders(
    workspaceId,
    {
      status: ORDER_STATUS.PROCESSING,
      paymentDeadlineBefore: now,
      salePaymentConfirmed: false,      // ← THÊM ĐIỀU KIỆN NÀY
      accountingConfirmed: false,        // ← VÀ ĐIỀU KIỆN NÀY
    },
  );

  // ... rest of the method
}
```

### 5.3 Update MktOrderRepository

**File**: `packages/twenty-server/src/mkt-core/order/repositories/mkt-order.repository.ts`

```typescript
// Thêm type cho filter options
export type FindOverdueOrdersOptions = {
  status: string;
  paymentDeadlineBefore: Date;
  salePaymentConfirmed?: boolean;
  accountingConfirmed?: boolean;
};

// Update method findOverdueOrders
async findOverdueOrders(
  workspaceId: string,
  options: FindOverdueOrdersOptions,
): Promise<MktOrderWorkspaceEntity[]> {
  const { status, paymentDeadlineBefore, salePaymentConfirmed, accountingConfirmed } = options;

  const queryBuilder = this.repository.createQueryBuilder('order');

  queryBuilder
    .where('order.status = :status', { status })
    .andWhere('order.paymentDeadline < :deadline', { deadline: paymentDeadlineBefore });

  // Chỉ lấy orders chưa được xác nhận
  if (salePaymentConfirmed !== undefined) {
    queryBuilder.andWhere(
      '(order.salePaymentConfirmed = :saleConfirmed OR order.salePaymentConfirmed IS NULL)',
      { saleConfirmed: salePaymentConfirmed },
    );
  }

  if (accountingConfirmed !== undefined) {
    queryBuilder.andWhere(
      '(order.accountingConfirmed = :accountingConfirmed OR order.accountingConfirmed IS NULL)',
      { accountingConfirmed },
    );
  }

  return queryBuilder.getMany();
}
```

### 5.4 Update MktOrderHistoryRepository

**File**: `packages/twenty-server/src/mkt-core/order/repositories/mkt-order-history.repository.ts`

```typescript
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

---

## 6. GraphQL API

### 6.1 DTOs

**File**: `packages/twenty-server/src/mkt-core/order/dto/payment-confirmation.dto.ts`

```typescript
import { Field, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

import { PaymentConfirmationType } from 'src/mkt-core/order/types/payment-confirmation.types';

// Register enum for GraphQL
registerEnumType(PaymentConfirmationType, {
  name: 'PaymentConfirmationType',
  description: 'Type of payment confirmation',
});

@InputType()
export class ConfirmPaymentInput {
  @Field()
  orderId: string;

  @Field({ nullable: true })
  note?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;
}

@InputType()
export class RevokeConfirmationInput {
  @Field()
  orderId: string;

  @Field(() => PaymentConfirmationType)
  type: PaymentConfirmationType;

  @Field()
  reason: string;
}

@ObjectType()
export class ConfirmationResultOutput {
  @Field()
  success: boolean;

  @Field()
  orderId: string;

  @Field()
  confirmedAt: string;

  @Field(() => PaymentConfirmationType)
  type: PaymentConfirmationType;
}

@ObjectType()
export class OrderConfirmationStatusOutput {
  @Field()
  orderId: string;

  @Field()
  saleConfirmed: boolean;

  @Field({ nullable: true })
  saleConfirmedAt?: string;

  @Field({ nullable: true })
  saleConfirmedByName?: string;

  @Field()
  accountingConfirmed: boolean;

  @Field({ nullable: true })
  accountingConfirmedAt?: string;

  @Field({ nullable: true })
  accountingConfirmedByName?: string;
}

@ObjectType()
export class ConfirmationDetailOutput {
  @Field()
  id: string;

  @Field()
  action: string;

  @Field()
  confirmedAt: string;

  @Field({ nullable: true })
  confirmedByName?: string;

  @Field({ nullable: true })
  note?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;
}

@ObjectType()
export class ConfirmationHistoryOutput {
  @Field()
  orderId: string;

  @Field(() => [ConfirmationDetailOutput])
  confirmations: ConfirmationDetailOutput[];
}
```

### 6.2 Resolver

**File**: `packages/twenty-server/src/mkt-core/order/resolvers/payment-confirmation.resolver.ts`

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { JwtAuthGuard } from 'src/engine/guards/jwt.auth.guard';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceMember } from 'src/engine/core-modules/user/dtos/workspace-member.dto';
import { AuthWorkspaceMember } from 'src/engine/decorators/auth/auth-workspace-member.decorator';
import { PaymentConfirmationService } from 'src/mkt-core/order/services/domain/payment-confirmation.service';
import {
  ConfirmPaymentInput,
  RevokeConfirmationInput,
  ConfirmationResultOutput,
  OrderConfirmationStatusOutput,
  ConfirmationHistoryOutput,
} from 'src/mkt-core/order/dto/payment-confirmation.dto';

@Resolver()
@UseGuards(JwtAuthGuard)
export class PaymentConfirmationResolver {
  constructor(
    private readonly paymentConfirmationService: PaymentConfirmationService,
  ) {}

  /**
   * Sale xác nhận thanh toán
   * Bảo vệ license khỏi bị khóa tự động
   */
  @Mutation(() => ConfirmationResultOutput)
  async confirmPaymentBySale(
    @Args('input') input: ConfirmPaymentInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMember() workspaceMember: WorkspaceMember,
  ): Promise<ConfirmationResultOutput> {
    const actor = {
      source: 'MANUAL' as const,
      name: workspaceMember.name?.firstName ?? 'Unknown',
      workspaceMemberId: workspaceMember.id,
    };

    const result = await this.paymentConfirmationService.confirmBySale(
      input,
      workspace.id,
      actor,
    );

    return {
      success: result.success,
      orderId: result.orderId,
      confirmedAt: result.confirmedAt,
      type: result.type,
    };
  }

  /**
   * Kế toán xác nhận thanh toán
   * Hoàn tất order nếu đủ điều kiện
   */
  @Mutation(() => ConfirmationResultOutput)
  async confirmPaymentByAccounting(
    @Args('input') input: ConfirmPaymentInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMember() workspaceMember: WorkspaceMember,
  ): Promise<ConfirmationResultOutput> {
    const actor = {
      source: 'MANUAL' as const,
      name: workspaceMember.name?.firstName ?? 'Unknown',
      workspaceMemberId: workspaceMember.id,
    };

    const result = await this.paymentConfirmationService.confirmByAccounting(
      input,
      workspace.id,
      actor,
    );

    return {
      success: result.success,
      orderId: result.orderId,
      confirmedAt: result.confirmedAt,
      type: result.type,
    };
  }

  /**
   * Hủy xác nhận thanh toán
   */
  @Mutation(() => ConfirmationResultOutput)
  async revokePaymentConfirmation(
    @Args('input') input: RevokeConfirmationInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMember() workspaceMember: WorkspaceMember,
  ): Promise<ConfirmationResultOutput> {
    const actor = {
      source: 'MANUAL' as const,
      name: workspaceMember.name?.firstName ?? 'Unknown',
      workspaceMemberId: workspaceMember.id,
    };

    const result = await this.paymentConfirmationService.revokeConfirmation(
      input,
      workspace.id,
      actor,
    );

    return {
      success: result.success,
      orderId: result.orderId,
      confirmedAt: result.confirmedAt,
      type: result.type,
    };
  }

  /**
   * Lấy trạng thái xác nhận hiện tại
   */
  @Query(() => OrderConfirmationStatusOutput)
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
      saleConfirmedByName: status.saleConfirmedBy?.name,
      accountingConfirmed: status.accountingConfirmed,
      accountingConfirmedAt: status.accountingConfirmedAt,
      accountingConfirmedByName: status.accountingConfirmedBy?.name,
    };
  }

  /**
   * Lấy lịch sử xác nhận
   */
  @Query(() => ConfirmationHistoryOutput)
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
        confirmedByName: c.confirmedBy?.name,
        note: c.note,
        metadata: c.metadata,
      })),
    };
  }
}
```

---

## 7. Module Registration

**File**: `packages/twenty-server/src/mkt-core/order/mkt-order.module.ts`

```typescript
// Thêm imports
import { PaymentConfirmationService } from './services/domain/payment-confirmation.service';
import { PaymentConfirmationResolver } from './resolvers/payment-confirmation.resolver';

@Module({
  // ...
  providers: [
    // ... existing providers
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

## 8. GraphQL Examples

### 8.1 Sale Confirm Payment

```graphql
mutation ConfirmPaymentBySale {
  confirmPaymentBySale(input: {
    orderId: "order-uuid-here"
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
  }
}
```

### 8.2 Accounting Confirm Payment

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
  }
}
```

### 8.3 Revoke Confirmation

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
  }
}
```

### 8.4 Get Confirmation Status

```graphql
query GetConfirmationStatus {
  getPaymentConfirmationStatus(orderId: "order-uuid-here") {
    orderId
    saleConfirmed
    saleConfirmedAt
    saleConfirmedByName
    accountingConfirmed
    accountingConfirmedAt
    accountingConfirmedByName
  }
}
```

### 8.5 Get Confirmation History

```graphql
query GetConfirmationHistory {
  getPaymentConfirmationHistory(orderId: "order-uuid-here") {
    orderId
    confirmations {
      id
      action
      confirmedAt
      confirmedByName
      note
      metadata
    }
  }
}
```

---

## 9. Testing Checklist

### 9.1 Unit Tests

- [ ] `PaymentConfirmationService.confirmBySale()` - success case
- [ ] `PaymentConfirmationService.confirmBySale()` - order not found
- [ ] `PaymentConfirmationService.confirmBySale()` - already confirmed
- [ ] `PaymentConfirmationService.confirmBySale()` - invalid status
- [ ] `PaymentConfirmationService.confirmByAccounting()` - success case
- [ ] `PaymentConfirmationService.confirmByAccounting()` - auto-complete order
- [ ] `PaymentConfirmationService.revokeConfirmation()` - sale type
- [ ] `PaymentConfirmationService.revokeConfirmation()` - accounting type
- [ ] `PaymentConfirmationService.getConfirmationStatus()` - with history
- [ ] `PaymentConfirmationService.isProtectedFromAutoLock()` - various cases

### 9.2 Integration Tests

- [ ] Sale confirm → Order.salePaymentConfirmed = true
- [ ] Sale confirm → OrderHistory created with correct action
- [ ] Accounting confirm → Order completed when conditions met
- [ ] Overdue scan skips confirmed orders
- [ ] Revoke confirmation → Order field reset
- [ ] Revoke accounting → Order status reverts to PROCESSING

### 9.3 E2E Tests

- [ ] Full flow: Create order → Sale confirm → Deadline passes → License NOT locked
- [ ] Full flow: Create order → No confirm → Deadline passes → License locked
- [ ] Full flow: Sale confirm → Accounting confirm → Order completed

---

## 10. Migration Steps

### Step 1: Add Field ID

```typescript
// mkt-field-ids.ts
salePaymentConfirmed: '20250203-0001-4000-8000-000000000001',
```

### Step 2: Add Entity Field

```typescript
// mkt-order.workspace-entity.ts
@WorkspaceField({...})
salePaymentConfirmed?: boolean;
```

### Step 3: Sync Metadata

```bash
npx nx run twenty-server:command workspace:sync-metadata -f
```

### Step 4: Add History Actions

```typescript
// order-history-action.constants.ts
SALE_PAYMENT_CONFIRMED = 'SALE_PAYMENT_CONFIRMED',
// ... other actions
```

### Step 5: Implement Service & Resolver

Follow sections 5 and 6 above.

### Step 6: Update Overdue Scan

Modify `findOverdueOrders` to exclude confirmed orders.

### Step 7: Test & Deploy

Run all tests and deploy.

---

## 11. Security Considerations

### 11.1 Authorization

- **Sale confirm**: Requires role with `order:confirm:sale` permission
- **Accounting confirm**: Requires role with `order:confirm:accounting` permission
- **Revoke**: Requires role with `order:confirm:revoke` permission

### 11.2 Audit Trail

Tất cả actions được ghi vào OrderHistory với:
- `createdBy`: Actor metadata (name, workspaceMemberId)
- `createdAt`: Timestamp
- `metadata`: Additional context

### 11.3 Data Integrity

- Boolean fields ensure quick, atomic checks
- OrderHistory provides immutable audit trail
- Optimistic locking prevents race conditions

---

## 12. Future Enhancements

1. **Email notifications** khi Sale/Accounting xác nhận
2. **Slack integration** cho team notifications
3. **Deadline extension** khi Sale confirm (gia hạn thêm X ngày)
4. **Multi-level approval** (Manager approve sau Sale)
5. **Batch confirmation** cho multiple orders
