# Multi-Payment Methods - Implementation Guide

**Ngày tạo:** 2026-01-30
**Phiên bản:** 1.1.0
**Tài liệu thiết kế:** [MULTI_PAYMENT_METHODS_FLOW.md](../../../../../../docs/flows/order/MULTI_PAYMENT_METHODS_FLOW.md)
**Báo cáo trạng thái:** [MULTI_PAYMENT_IMPLEMENTATION_STATUS_REPORT.md](../../../../../../docs/flows/order/MULTI_PAYMENT_IMPLEMENTATION_STATUS_REPORT.md)
**Multi-Gateway Extension:** [MULTI_GATEWAY_EXTENSION_DESIGN.md](../../../../../../docs/flows/order/MULTI_GATEWAY_EXTENSION_DESIGN.md)

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Phase 1: Schema Enhancement](#2-phase-1-schema-enhancement)
   - [1.1 Multi-Gateway Provider Fields](#21-multi-gateway-provider-fields)
   - [1.2 Confirmation/Rejection Fields](#22-cập-nhật-mktpaymentworkspaceentity)
3. [Phase 2: Core Services](#3-phase-2-core-services)
4. [Phase 3: GraphQL API](#4-phase-3-graphql-api)
5. [Phase 4: Event Handlers](#5-phase-4-event-handlers)
6. [Testing Guide](#6-testing-guide)
7. [Migration Strategy](#7-migration-strategy)
8. [Multi-Gateway Extension](#8-multi-gateway-extension)

---

## 1. Tổng quan

### 1.1 Mục tiêu

Triển khai đầy đủ Multi-Payment Methods theo thiết kế, bao gồm:
- Xác nhận/từ chối thanh toán (confirm/reject)
- Hoàn tiền đầy đủ và một phần (refund)
- Audit trail cho mọi thay đổi payment status
- GraphQL API theo spec

### 1.2 Database Schema hiện tại

**mktOrder:**
```
paymentStatus: ENUM ['PENDING', 'PARTIAL', 'PAID', 'OVERPAID'] ✅
paidAmount: double precision ✅
remainingAmount: double precision ✅
```

**mktPayment:**
```
status: ENUM ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED']
amount: double precision
currency: ENUM ['VND', ...]
sepayTransactionId: text (indexed) ⚠️ SEPay-specific, cần thay bằng provider-agnostic fields
paymentDate: timestamp
description: text
mktOrderId: uuid (FK)
mktPaymentMethodId: uuid (FK)
```

**mktPaymentHistory:**
```
paymentType: ENUM ['PAYMENT', 'REFUND', 'CHANGE_VARIANT', 'RENEW']
amount: double precision
note: text
mktOrderId: uuid (FK)
mktPaymentId: uuid (FK)
accountOwnerId: uuid (FK)
```

### 1.3 Gaps cần xử lý

| Component | Gap | Priority |
|-----------|-----|----------|
| mktPayment | Thiếu confirmedAt, confirmedBy, rejectedAt, rejectedBy, rejectionReason, refundedAmount, metadata | HIGH |
| mktPayment | `sepayTransactionId` là SEPay-specific, cần provider-agnostic fields (providerType, providerTransactionId, providerResponse, providerMetadata) | HIGH |
| mktPaymentHistory | Thiếu action, previousStatus, newStatus để tracking transitions | HIGH |
| PaymentConfirmationService | Chưa có service riêng | HIGH |
| GraphQL mutations | Thiếu mktConfirmPayment, mktRefundPayment | MEDIUM |
| Multi-Gateway | Cần Provider pattern và configuration cho VNPay, MoMo, ZaloPay | MEDIUM |

---

## 2. Phase 1: Schema Enhancement

### 2.1 Multi-Gateway Provider Fields

> **Tham khảo chi tiết:** [MULTI_GATEWAY_EXTENSION_DESIGN.md](../../../../../../docs/flows/order/MULTI_GATEWAY_EXTENSION_DESIGN.md)

**Vấn đề:** `sepayTransactionId` là SEPay-specific, không mở rộng được cho các cổng thanh toán khác (VNPay, MoMo, ZaloPay).

**Giải pháp:** Thêm các fields provider-agnostic:

#### 2.1.1 Provider Type Enum

**File:** `packages/twenty-server/src/mkt-core/payment/constants/payment-provider.constants.ts`

```typescript
import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Payment Provider Types
 * Mở rộng khi thêm provider mới
 */
export const PAYMENT_PROVIDER_TYPE = {
  SEPAY: 'SEPAY',
  VNPAY: 'VNPAY',
  MOMO: 'MOMO',
  ZALOPAY: 'ZALOPAY',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
  CREDIT_CARD: 'CREDIT_CARD',
  OTHER: 'OTHER',
} as const;

export type PaymentProviderType = typeof PAYMENT_PROVIDER_TYPE[keyof typeof PAYMENT_PROVIDER_TYPE];

export const PAYMENT_PROVIDER_OPTIONS = [
  {
    value: PAYMENT_PROVIDER_TYPE.SEPAY,
    label: 'SEPay',
    position: 0,
    color: 'blue' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.VNPAY,
    label: 'VNPay',
    position: 1,
    color: 'green' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.MOMO,
    label: 'MoMo',
    position: 2,
    color: 'pink' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.ZALOPAY,
    label: 'ZaloPay',
    position: 3,
    color: 'sky' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.BANK_TRANSFER,
    label: 'Bank Transfer',
    position: 4,
    color: 'gray' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.CASH,
    label: 'Cash',
    position: 5,
    color: 'yellow' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.CREDIT_CARD,
    label: 'Credit Card',
    position: 6,
    color: 'purple' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.OTHER,
    label: 'Other',
    position: 7,
    color: 'gray' as TagColor,
  },
];

/**
 * Provider capabilities configuration
 */
export const PROVIDER_CAPABILITIES: Record<PaymentProviderType, {
  supportsQrCode: boolean;
  supportsWebhook: boolean;
  supportsRefund: boolean;
  supportsPartialRefund: boolean;
  requiresManualConfirmation: boolean;
}> = {
  [PAYMENT_PROVIDER_TYPE.SEPAY]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.VNPAY]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: true,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.MOMO]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: false,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.ZALOPAY]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: true,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.BANK_TRANSFER]: {
    supportsQrCode: false,
    supportsWebhook: false,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: true,
  },
  [PAYMENT_PROVIDER_TYPE.CASH]: {
    supportsQrCode: false,
    supportsWebhook: false,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: true,
  },
  [PAYMENT_PROVIDER_TYPE.CREDIT_CARD]: {
    supportsQrCode: false,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: true,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.OTHER]: {
    supportsQrCode: false,
    supportsWebhook: false,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: true,
  },
};
```

#### 2.1.2 Provider-Agnostic Entity Fields

**Thêm vào MktPaymentWorkspaceEntity:**

```typescript
// ============================================
// PROVIDER-AGNOSTIC TRANSACTION FIELDS
// ============================================

/**
 * providerType: Loại cổng thanh toán
 */
@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.providerType,
  type: FieldMetadataType.SELECT,
  label: msg`Provider Type`,
  description: msg`Payment gateway provider type`,
  icon: 'IconBuildingBank',
  options: PAYMENT_PROVIDER_OPTIONS,
})
@WorkspaceIsNullable()
providerType?: PaymentProviderType;

/**
 * providerTransactionId: Mã giao dịch từ provider (thay cho sepayTransactionId)
 */
@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.providerTransactionId,
  type: FieldMetadataType.TEXT,
  label: msg`Provider Transaction ID`,
  description: msg`Unique transaction ID from payment provider`,
  icon: 'IconHash',
})
@WorkspaceIsNullable()
@WorkspaceFieldIndex()
providerTransactionId?: string;

/**
 * providerResponse: Raw response từ provider
 */
@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.providerResponse,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Provider Response`,
  description: msg`Raw response data from payment provider`,
  icon: 'IconCode',
})
@WorkspaceIsNullable()
providerResponse?: Record<string, unknown>;

/**
 * providerMetadata: Provider-specific metadata
 */
@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.providerMetadata,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Provider Metadata`,
  description: msg`Provider-specific configuration and data`,
  icon: 'IconSettings',
})
@WorkspaceIsNullable()
providerMetadata?: Record<string, unknown>;

// Giữ lại sepayTransactionId để backward compatible
/**
 * @deprecated Use providerTransactionId instead
 */
@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.sepayTransactionId,
  type: FieldMetadataType.TEXT,
  label: msg`SePay Transaction ID (Deprecated)`,
  description: msg`[DEPRECATED] Use providerTransactionId instead`,
  icon: 'IconId',
})
@WorkspaceIsNullable()
@WorkspaceFieldIndex()
sepayTransactionId?: string;
```

#### 2.1.3 Field IDs

**Thêm vào mkt-field-ids.ts:**

```typescript
export const MKT_PAYMENT_FIELD_IDS = {
  // ... existing fields ...

  // Multi-gateway provider fields (2026-01-30)
  providerType: 'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f',
  providerTransactionId: 'd0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a',
  providerResponse: 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b',
  providerMetadata: 'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c',
};
```

### 2.2 Cập nhật MktPaymentWorkspaceEntity

**File:** `packages/twenty-server/src/mkt-core/payment/objects/mkt-payment.workspace-entity.ts`

**Fields cần thêm:**

```typescript
// ============================================
// CONFIRMATION FIELDS
// ============================================

@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.confirmedAt,
  type: FieldMetadataType.DATE_TIME,
  label: msg`Confirmed At`,
  description: msg`Timestamp when payment was confirmed`,
  icon: 'IconCheck',
})
@WorkspaceIsNullable()
confirmedAt?: string;

@WorkspaceRelation({
  standardId: MKT_PAYMENT_FIELD_IDS.confirmedBy,
  type: RelationType.MANY_TO_ONE,
  label: msg`Confirmed By`,
  description: msg`User who confirmed the payment`,
  icon: 'IconUserCheck',
  inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
  inverseSideFieldKey: 'confirmedPayments',
  onDelete: RelationOnDeleteAction.SET_NULL,
})
@WorkspaceIsNullable()
confirmedBy: Relation<WorkspaceMemberWorkspaceEntity> | null;

@WorkspaceJoinColumn('confirmedBy')
confirmedById: string | null;

// ============================================
// REJECTION FIELDS
// ============================================

@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.rejectedAt,
  type: FieldMetadataType.DATE_TIME,
  label: msg`Rejected At`,
  description: msg`Timestamp when payment was rejected`,
  icon: 'IconX',
})
@WorkspaceIsNullable()
rejectedAt?: string;

@WorkspaceRelation({
  standardId: MKT_PAYMENT_FIELD_IDS.rejectedBy,
  type: RelationType.MANY_TO_ONE,
  label: msg`Rejected By`,
  description: msg`User who rejected the payment`,
  icon: 'IconUserX',
  inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
  inverseSideFieldKey: 'rejectedPayments',
  onDelete: RelationOnDeleteAction.SET_NULL,
})
@WorkspaceIsNullable()
rejectedBy: Relation<WorkspaceMemberWorkspaceEntity> | null;

@WorkspaceJoinColumn('rejectedBy')
rejectedById: string | null;

@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.rejectionReason,
  type: FieldMetadataType.TEXT,
  label: msg`Rejection Reason`,
  description: msg`Reason for payment rejection`,
  icon: 'IconAlertCircle',
})
@WorkspaceIsNullable()
rejectionReason?: string;

// ============================================
// REFUND FIELDS
// ============================================

@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.refundedAmount,
  type: FieldMetadataType.NUMBER,
  label: msg`Refunded Amount`,
  description: msg`Amount that has been refunded`,
  icon: 'IconReceipt2',
  defaultValue: 0,
})
@WorkspaceIsNullable()
refundedAmount?: number;

// ============================================
// METADATA
// ============================================

@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.metadata,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Metadata`,
  description: msg`Provider-specific payment data`,
  icon: 'IconCode',
})
@WorkspaceIsNullable()
metadata?: Record<string, unknown>;

// ============================================
// TRANSACTION REF (Generic)
// ============================================

@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.transactionRef,
  type: FieldMetadataType.TEXT,
  label: msg`Transaction Reference`,
  description: msg`Generic transaction reference for any payment gateway`,
  icon: 'IconHash',
})
@WorkspaceIsNullable()
@WorkspaceFieldIndex()
transactionRef?: string;
```

### 2.2 Cập nhật mkt-field-ids.ts

**File:** `packages/twenty-server/src/mkt-core/constants/mkt-field-ids.ts`

```typescript
export const MKT_PAYMENT_FIELD_IDS = {
  // ... existing fields ...

  // New confirmation fields (2026-01-30)
  confirmedAt: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  confirmedBy: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  rejectedAt: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
  rejectedBy: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
  rejectionReason: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
  refundedAmount: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
  metadata: 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d',
  transactionRef: 'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e',
};
```

### 2.3 Cập nhật Payment Status Enum

**File:** `packages/twenty-server/src/mkt-core/payment/constants/payment-status.constants.ts`

```typescript
import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Payment Transaction Status
 *
 * Status flow:
 * PENDING → CONFIRMED → (REFUNDED | PARTIALLY_REFUNDED)
 * PENDING → REJECTED
 * PENDING → FAILED
 */
export const PAYMENT_TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',      // Changed from COMPLETED
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',        // NEW
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED', // NEW
  CANCELLED: 'CANCELLED',
} as const;

export type PaymentTransactionStatus = typeof PAYMENT_TRANSACTION_STATUS[keyof typeof PAYMENT_TRANSACTION_STATUS];

export const PAYMENT_TRANSACTION_STATUS_OPTIONS = [
  {
    value: PAYMENT_TRANSACTION_STATUS.PENDING,
    label: 'Đang chờ',
    position: 0,
    color: 'orange' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.CONFIRMED,
    label: 'Đã xác nhận',
    position: 1,
    color: 'green' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.REJECTED,
    label: 'Từ chối',
    position: 2,
    color: 'red' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.FAILED,
    label: 'Thất bại',
    position: 3,
    color: 'red' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.REFUNDED,
    label: 'Đã hoàn tiền',
    position: 4,
    color: 'purple' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.PARTIALLY_REFUNDED,
    label: 'Hoàn tiền một phần',
    position: 5,
    color: 'blue' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.CANCELLED,
    label: 'Đã hủy',
    position: 6,
    color: 'gray' as TagColor,
  },
];
```

### 2.4 Tạo Payment Action Constants

**File:** `packages/twenty-server/src/mkt-core/payment/constants/payment-action.constants.ts`

```typescript
import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Payment Action - Các hành động trên payment để lưu vào history
 */
export const PAYMENT_ACTION = {
  CREATED: 'CREATED',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  UPDATED: 'UPDATED',
  DELETED: 'DELETED',
} as const;

export type PaymentAction = typeof PAYMENT_ACTION[keyof typeof PAYMENT_ACTION];

export const PAYMENT_ACTION_OPTIONS = [
  {
    value: PAYMENT_ACTION.CREATED,
    label: 'Tạo mới',
    position: 0,
    color: 'blue' as TagColor,
  },
  {
    value: PAYMENT_ACTION.CONFIRMED,
    label: 'Xác nhận',
    position: 1,
    color: 'green' as TagColor,
  },
  {
    value: PAYMENT_ACTION.REJECTED,
    label: 'Từ chối',
    position: 2,
    color: 'red' as TagColor,
  },
  {
    value: PAYMENT_ACTION.REFUNDED,
    label: 'Hoàn tiền',
    position: 3,
    color: 'purple' as TagColor,
  },
  {
    value: PAYMENT_ACTION.PARTIALLY_REFUNDED,
    label: 'Hoàn tiền một phần',
    position: 4,
    color: 'orange' as TagColor,
  },
  {
    value: PAYMENT_ACTION.UPDATED,
    label: 'Cập nhật',
    position: 5,
    color: 'gray' as TagColor,
  },
  {
    value: PAYMENT_ACTION.DELETED,
    label: 'Xóa',
    position: 6,
    color: 'red' as TagColor,
  },
];
```

### 2.5 Cập nhật MktPaymentHistoryWorkspaceEntity

**File:** `packages/twenty-server/src/mkt-core/payment/objects/mkt-payment-history.workspace-entity.ts`

**Fields cần thêm:**

```typescript
// ============================================
// ACTION TRACKING FIELDS
// ============================================

@WorkspaceField({
  standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.action,
  type: FieldMetadataType.SELECT,
  label: msg`Action`,
  description: msg`Action performed on the payment`,
  icon: 'IconActivity',
  options: PAYMENT_ACTION_OPTIONS,
})
action: PaymentAction;

@WorkspaceField({
  standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.previousStatus,
  type: FieldMetadataType.TEXT,
  label: msg`Previous Status`,
  description: msg`Status before the action`,
  icon: 'IconArrowLeft',
})
@WorkspaceIsNullable()
previousStatus?: string;

@WorkspaceField({
  standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.newStatus,
  type: FieldMetadataType.TEXT,
  label: msg`New Status`,
  description: msg`Status after the action`,
  icon: 'IconArrowRight',
})
@WorkspaceIsNullable()
newStatus?: string;

@WorkspaceField({
  standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.metadata,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Metadata`,
  description: msg`Additional action metadata`,
  icon: 'IconCode',
})
@WorkspaceIsNullable()
metadata?: Record<string, unknown>;

@WorkspaceField({
  standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.performedAt,
  type: FieldMetadataType.DATE_TIME,
  label: msg`Performed At`,
  description: msg`Timestamp when action was performed`,
  icon: 'IconClock',
})
performedAt: string;

@WorkspaceRelation({
  standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.performedBy,
  type: RelationType.MANY_TO_ONE,
  label: msg`Performed By`,
  description: msg`User who performed the action`,
  icon: 'IconUser',
  inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
  inverseSideFieldKey: 'paymentHistoryActions',
  onDelete: RelationOnDeleteAction.SET_NULL,
})
@WorkspaceIsNullable()
performedBy: Relation<WorkspaceMemberWorkspaceEntity> | null;

@WorkspaceJoinColumn('performedBy')
performedById: string | null;
```

---

## 3. Phase 2: Core Services

### 3.1 PaymentConfirmationService

**File:** `packages/twenty-server/src/mkt-core/payment/services/core/payment-confirmation.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MktPaymentRepository } from 'src/mkt-core/payment/repositories';
import { MktPaymentHistoryRepository } from 'src/mkt-core/payment/repositories';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { OrderPaymentCalculationService } from 'src/mkt-core/order/services/core';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  PAYMENT_TRANSACTION_STATUS,
  PaymentTransactionStatus,
} from 'src/mkt-core/payment/constants/payment-status.constants';
import {
  PAYMENT_ACTION,
  PaymentAction,
} from 'src/mkt-core/payment/constants/payment-action.constants';
import { PAYMENT_EVENTS } from 'src/mkt-core/payment/events';
import {
  ConfirmPaymentInput,
  ConfirmPaymentResult,
} from 'src/mkt-core/payment/types';

/**
 * PaymentConfirmationService
 *
 * Handles payment confirmation and rejection workflow:
 * - Validate payment status
 * - Update payment status (CONFIRMED/REJECTED)
 * - Record payment history
 * - Recalculate order payment totals
 * - Trigger license creation if eligible
 * - Emit events for downstream processing
 */
@Injectable()
export class PaymentConfirmationService {
  private readonly logger = new Logger(PaymentConfirmationService.name);

  constructor(
    private readonly mktPaymentRepository: MktPaymentRepository,
    private readonly mktPaymentHistoryRepository: MktPaymentHistoryRepository,
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly orderPaymentCalculationService: OrderPaymentCalculationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Confirm a payment
   */
  async confirmPayment(
    input: ConfirmPaymentInput,
    confirmedById: string,
    workspaceId: string,
  ): Promise<ConfirmPaymentResult> {
    const { paymentId, note } = input;

    // Step 1: Get and validate payment
    const payment = await this.mktPaymentRepository.findByIdWithRelations(paymentId);

    if (!payment) {
      return {
        success: false,
        error: `Payment not found: ${paymentId}`,
      };
    }

    if (payment.status !== PAYMENT_TRANSACTION_STATUS.PENDING) {
      return {
        success: false,
        error: `Payment already ${payment.status}, cannot confirm`,
      };
    }

    const previousStatus = payment.status;
    const newStatus = PAYMENT_TRANSACTION_STATUS.CONFIRMED;
    const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

    // Step 2: Update payment status
    await this.mktPaymentRepository.updatePayment(paymentId, {
      status: newStatus,
      confirmedAt: nowISO,
      confirmedById,
    });

    // Step 3: Record history
    await this.recordHistory({
      paymentId,
      orderId: payment.mktOrderId,
      action: PAYMENT_ACTION.CONFIRMED,
      previousStatus,
      newStatus,
      performedById: confirmedById,
      note,
      amount: payment.amount ?? 0,
    });

    // Step 4: Recalculate order payment totals
    const orderResult = await this.recalculateOrderPayment(payment.mktOrderId);

    // Step 5: Check license creation eligibility
    let licensesCreated = false;
    if (orderResult && this.shouldCreateLicenses(orderResult.paymentStatus)) {
      // Trigger license creation via event
      this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
        paymentId,
        orderId: payment.mktOrderId,
        orderCode: orderResult.orderCode,
        amount: payment.amount,
        totalPaidAmount: orderResult.paidAmount,
        workspaceId,
      });
      licensesCreated = true;
    }

    this.logger.log({
      message: 'Payment confirmed',
      paymentId,
      orderId: payment.mktOrderId,
      previousStatus,
      newStatus,
      licensesCreated,
    });

    return {
      success: true,
      payment: {
        id: paymentId,
        status: newStatus,
        confirmedAt: nowISO,
        confirmedById,
      },
      order: orderResult,
      licensesCreated,
    };
  }

  /**
   * Reject a payment
   */
  async rejectPayment(
    input: ConfirmPaymentInput & { rejectionReason: string },
    rejectedById: string,
  ): Promise<ConfirmPaymentResult> {
    const { paymentId, rejectionReason, note } = input;

    // Step 1: Get and validate payment
    const payment = await this.mktPaymentRepository.findByIdWithRelations(paymentId);

    if (!payment) {
      return {
        success: false,
        error: `Payment not found: ${paymentId}`,
      };
    }

    if (payment.status !== PAYMENT_TRANSACTION_STATUS.PENDING) {
      return {
        success: false,
        error: `Payment already ${payment.status}, cannot reject`,
      };
    }

    const previousStatus = payment.status;
    const newStatus = PAYMENT_TRANSACTION_STATUS.REJECTED;
    const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

    // Step 2: Update payment status
    await this.mktPaymentRepository.updatePayment(paymentId, {
      status: newStatus,
      rejectedAt: nowISO,
      rejectedById,
      rejectionReason,
    });

    // Step 3: Record history
    await this.recordHistory({
      paymentId,
      orderId: payment.mktOrderId,
      action: PAYMENT_ACTION.REJECTED,
      previousStatus,
      newStatus,
      performedById: rejectedById,
      note: note ?? rejectionReason,
      amount: payment.amount ?? 0,
      metadata: { rejectionReason },
    });

    this.logger.log({
      message: 'Payment rejected',
      paymentId,
      rejectionReason,
    });

    return {
      success: true,
      payment: {
        id: paymentId,
        status: newStatus,
        rejectedAt: nowISO,
        rejectedById,
        rejectionReason,
      },
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async recalculateOrderPayment(orderId: string) {
    const order = await this.mktOrderRepository.findByIdWithPayments(orderId);

    if (!order) {
      return null;
    }

    const confirmedPayments = (order.mktPayments ?? [])
      .filter((p) => p.status === PAYMENT_TRANSACTION_STATUS.CONFIRMED)
      .map((p) => ({
        amount: p.amount ?? 0,
        refundedAmount: p.refundedAmount ?? 0,
      }));

    const summary = this.orderPaymentCalculationService.calculatePaymentSummary(
      order.totalAmount ?? 0,
      confirmedPayments,
    );

    // Update order
    await this.mktOrderRepository.updateOrder(orderId, {
      paidAmount: summary.paidAmount,
      remainingAmount: summary.remainingAmount,
      paymentStatus: summary.paymentStatus,
    });

    return {
      orderId,
      orderCode: order.orderCode,
      ...summary,
    };
  }

  private shouldCreateLicenses(paymentStatus: string): boolean {
    return (
      paymentStatus === 'PAID' ||
      paymentStatus === 'OVERPAID'
    );
  }

  private async recordHistory(data: {
    paymentId: string;
    orderId: string;
    action: PaymentAction;
    previousStatus: PaymentTransactionStatus;
    newStatus: PaymentTransactionStatus;
    performedById: string;
    note?: string;
    amount: number;
    metadata?: Record<string, unknown>;
  }) {
    const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

    await this.mktPaymentHistoryRepository.create({
      name: `${data.action} - ${data.newStatus}`,
      mktPaymentId: data.paymentId,
      mktOrderId: data.orderId,
      action: data.action,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      performedById: data.performedById,
      performedAt: nowISO,
      note: data.note,
      amount: data.amount,
      paymentType: 'PAYMENT',
      metadata: data.metadata,
    });
  }
}
```

### 3.2 PaymentRefundService

**File:** `packages/twenty-server/src/mkt-core/payment/services/core/payment-refund.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MktPaymentRepository } from 'src/mkt-core/payment/repositories';
import { MktPaymentHistoryRepository } from 'src/mkt-core/payment/repositories';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { OrderPaymentCalculationService } from 'src/mkt-core/order/services/core';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import {
  PAYMENT_TRANSACTION_STATUS,
} from 'src/mkt-core/payment/constants/payment-status.constants';
import { PAYMENT_ACTION } from 'src/mkt-core/payment/constants/payment-action.constants';
import { PAYMENT_EVENTS } from 'src/mkt-core/payment/events';
import {
  RefundPaymentInput,
  RefundPaymentResult,
} from 'src/mkt-core/payment/types';

/**
 * PaymentRefundService
 *
 * Handles payment refund workflow:
 * - Full refund: Payment status → REFUNDED
 * - Partial refund: Payment status → PARTIALLY_REFUNDED
 * - Update refundedAmount tracking
 * - Recalculate order totals
 * - Handle license revocation (if applicable)
 */
@Injectable()
export class PaymentRefundService {
  private readonly logger = new Logger(PaymentRefundService.name);

  constructor(
    private readonly mktPaymentRepository: MktPaymentRepository,
    private readonly mktPaymentHistoryRepository: MktPaymentHistoryRepository,
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly orderPaymentCalculationService: OrderPaymentCalculationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Refund a payment (full or partial)
   */
  async refundPayment(
    input: RefundPaymentInput,
    refundedById: string,
    workspaceId: string,
  ): Promise<RefundPaymentResult> {
    const { paymentId, amount: refundAmount, reason } = input;

    // Step 1: Get and validate payment
    const payment = await this.mktPaymentRepository.findByIdWithRelations(paymentId);

    if (!payment) {
      return {
        success: false,
        error: `Payment not found: ${paymentId}`,
      };
    }

    // Only CONFIRMED payments can be refunded
    if (payment.status !== PAYMENT_TRANSACTION_STATUS.CONFIRMED &&
        payment.status !== PAYMENT_TRANSACTION_STATUS.PARTIALLY_REFUNDED) {
      return {
        success: false,
        error: `Can only refund CONFIRMED payments, current status: ${payment.status}`,
      };
    }

    const paymentAmount = payment.amount ?? 0;
    const previousRefunded = payment.refundedAmount ?? 0;
    const availableForRefund = MoneyUtils.subtract(paymentAmount, previousRefunded).toNumber();

    // Determine refund amount (null = full remaining)
    const actualRefundAmount = refundAmount ?? availableForRefund;

    if (actualRefundAmount > availableForRefund) {
      return {
        success: false,
        error: `Refund amount (${actualRefundAmount}) exceeds available amount (${availableForRefund})`,
      };
    }

    const previousStatus = payment.status;
    const newRefundedAmount = MoneyUtils.add(previousRefunded, actualRefundAmount).toNumber();

    // Determine new status
    const isFullRefund = newRefundedAmount >= paymentAmount;
    const newStatus = isFullRefund
      ? PAYMENT_TRANSACTION_STATUS.REFUNDED
      : PAYMENT_TRANSACTION_STATUS.PARTIALLY_REFUNDED;
    const action = isFullRefund
      ? PAYMENT_ACTION.REFUNDED
      : PAYMENT_ACTION.PARTIALLY_REFUNDED;

    const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

    // Step 2: Update payment
    await this.mktPaymentRepository.updatePayment(paymentId, {
      status: newStatus,
      refundedAmount: newRefundedAmount,
    });

    // Step 3: Record history
    await this.recordHistory({
      paymentId,
      orderId: payment.mktOrderId,
      action,
      previousStatus,
      newStatus,
      performedById: refundedById,
      note: reason,
      amount: actualRefundAmount,
      metadata: {
        refundAmount: actualRefundAmount,
        totalRefunded: newRefundedAmount,
        reason,
      },
    });

    // Step 4: Recalculate order
    const orderResult = await this.recalculateOrderPayment(payment.mktOrderId);

    // Step 5: Emit refund event for license revocation handling
    this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_REFUNDED, {
      paymentId,
      orderId: payment.mktOrderId,
      orderCode: orderResult?.orderCode,
      refundAmount: actualRefundAmount,
      totalRefunded: newRefundedAmount,
      isFullRefund,
      refundedById,
      workspaceId,
    });

    this.logger.log({
      message: isFullRefund ? 'Payment fully refunded' : 'Payment partially refunded',
      paymentId,
      refundAmount: actualRefundAmount,
      totalRefunded: newRefundedAmount,
    });

    return {
      success: true,
      payment: {
        id: paymentId,
        status: newStatus,
        refundedAmount: newRefundedAmount,
      },
      order: orderResult,
      refundedAmount: actualRefundAmount,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async recalculateOrderPayment(orderId: string) {
    const order = await this.mktOrderRepository.findByIdWithPayments(orderId);

    if (!order) {
      return null;
    }

    // Only count CONFIRMED payments, subtract refunded amounts
    const confirmedPayments = (order.mktPayments ?? [])
      .filter((p) =>
        p.status === PAYMENT_TRANSACTION_STATUS.CONFIRMED ||
        p.status === PAYMENT_TRANSACTION_STATUS.PARTIALLY_REFUNDED ||
        p.status === PAYMENT_TRANSACTION_STATUS.REFUNDED
      )
      .map((p) => ({
        amount: p.amount ?? 0,
        refundedAmount: p.refundedAmount ?? 0,
      }));

    const summary = this.orderPaymentCalculationService.calculatePaymentSummary(
      order.totalAmount ?? 0,
      confirmedPayments,
    );

    await this.mktOrderRepository.updateOrder(orderId, {
      paidAmount: summary.paidAmount,
      remainingAmount: summary.remainingAmount,
      paymentStatus: summary.paymentStatus,
    });

    return {
      orderId,
      orderCode: order.orderCode,
      ...summary,
    };
  }

  private async recordHistory(data: {
    paymentId: string;
    orderId: string;
    action: string;
    previousStatus: string;
    newStatus: string;
    performedById: string;
    note?: string;
    amount: number;
    metadata?: Record<string, unknown>;
  }) {
    const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

    await this.mktPaymentHistoryRepository.create({
      name: `${data.action} - ${data.amount}`,
      mktPaymentId: data.paymentId,
      mktOrderId: data.orderId,
      action: data.action,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      performedById: data.performedById,
      performedAt: nowISO,
      note: data.note,
      amount: data.amount,
      paymentType: 'REFUND',
      metadata: data.metadata,
    });
  }
}
```

### 3.3 PaymentHistoryService

**File:** `packages/twenty-server/src/mkt-core/payment/services/core/payment-history.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { MktPaymentHistoryRepository } from 'src/mkt-core/payment/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { PaymentAction } from 'src/mkt-core/payment/constants/payment-action.constants';

type RecordHistoryInput = {
  paymentId: string;
  orderId?: string;
  action: PaymentAction;
  previousStatus?: string;
  newStatus?: string;
  performedById: string;
  note?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
};

/**
 * PaymentHistoryService
 *
 * Manages payment history audit trail.
 * All payment status changes should be recorded via this service.
 */
@Injectable()
export class PaymentHistoryService {
  private readonly logger = new Logger(PaymentHistoryService.name);

  constructor(
    private readonly mktPaymentHistoryRepository: MktPaymentHistoryRepository,
  ) {}

  /**
   * Record a payment history entry
   */
  async record(input: RecordHistoryInput): Promise<void> {
    const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

    await this.mktPaymentHistoryRepository.create({
      name: this.buildHistoryName(input),
      mktPaymentId: input.paymentId,
      mktOrderId: input.orderId,
      action: input.action,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      performedById: input.performedById,
      performedAt: nowISO,
      note: input.note,
      amount: input.amount,
      paymentType: this.mapActionToPaymentType(input.action),
      metadata: input.metadata,
    });

    this.logger.debug({
      message: 'Payment history recorded',
      paymentId: input.paymentId,
      action: input.action,
    });
  }

  /**
   * Get history for a payment
   */
  async getByPaymentId(paymentId: string) {
    return this.mktPaymentHistoryRepository.findByPaymentId(paymentId);
  }

  /**
   * Get history for an order
   */
  async getByOrderId(orderId: string) {
    return this.mktPaymentHistoryRepository.findByOrderId(orderId);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private buildHistoryName(input: RecordHistoryInput): string {
    const parts = [input.action];

    if (input.newStatus) {
      parts.push(`→ ${input.newStatus}`);
    }

    if (input.amount) {
      parts.push(`(${input.amount.toLocaleString()} VND)`);
    }

    return parts.join(' ');
  }

  private mapActionToPaymentType(action: PaymentAction): string {
    switch (action) {
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return 'REFUND';
      default:
        return 'PAYMENT';
    }
  }
}
```

---

## 4. Phase 3: GraphQL API

### 4.1 DTOs

**File:** `packages/twenty-server/src/mkt-core/payment/dto/confirm-payment.dto.ts`

```typescript
import { Field, Float, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';

// ============================================
// INPUT DTOs
// ============================================

@InputType()
export class ConfirmPaymentInputDto {
  @Field(() => ID, { description: 'Payment ID to confirm' })
  @IsUUID()
  paymentId: string;

  @Field(() => Boolean, { description: 'true = confirm, false = reject' })
  @IsNotEmpty()
  confirmed: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Required if confirmed = false',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @Field(() => String, { nullable: true, description: 'Optional note' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ============================================
// OUTPUT DTOs
// ============================================

@ObjectType()
export class PaymentInfoOutput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  status: string;

  @Field(() => Date, { nullable: true })
  confirmedAt?: Date;

  @Field(() => ID, { nullable: true })
  confirmedById?: string;

  @Field(() => Date, { nullable: true })
  rejectedAt?: Date;

  @Field(() => ID, { nullable: true })
  rejectedById?: string;

  @Field(() => String, { nullable: true })
  rejectionReason?: string;
}

@ObjectType()
export class OrderPaymentInfoOutput {
  @Field(() => ID)
  orderId: string;

  @Field(() => String, { nullable: true })
  orderCode?: string;

  @Field(() => Float)
  paidAmount: number;

  @Field(() => Float)
  remainingAmount: number;

  @Field(() => String)
  paymentStatus: string;

  @Field(() => Float)
  paidPercent: number;
}

@ObjectType()
export class ConfirmPaymentOutputDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => PaymentInfoOutput, { nullable: true })
  payment?: PaymentInfoOutput;

  @Field(() => OrderPaymentInfoOutput, { nullable: true })
  order?: OrderPaymentInfoOutput;

  @Field(() => Boolean, { nullable: true })
  licensesCreated?: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}
```

**File:** `packages/twenty-server/src/mkt-core/payment/dto/refund-payment.dto.ts`

```typescript
import { Field, Float, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, Min } from 'class-validator';

// ============================================
// INPUT DTOs
// ============================================

@InputType()
export class RefundPaymentInputDto {
  @Field(() => ID, { description: 'Payment ID to refund' })
  @IsUUID()
  paymentId: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Partial refund amount (null = full refund)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @Field(() => String, { description: 'Refund reason' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @Field(() => String, { nullable: true, description: 'Additional note' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ============================================
// OUTPUT DTOs
// ============================================

@ObjectType()
export class RefundPaymentInfoOutput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  status: string;

  @Field(() => Float)
  refundedAmount: number;
}

@ObjectType()
export class RefundPaymentOutputDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => RefundPaymentInfoOutput, { nullable: true })
  payment?: RefundPaymentInfoOutput;

  @Field(() => OrderPaymentInfoOutput, { nullable: true })
  order?: OrderPaymentInfoOutput;

  @Field(() => Float, { nullable: true, description: 'Amount refunded in this transaction' })
  refundedAmount?: number;

  @Field(() => [String], { nullable: true, description: 'License IDs revoked (if any)' })
  revokedLicenseIds?: string[];

  @Field(() => String, { nullable: true })
  error?: string;
}
```

### 4.2 Resolver

**File:** `packages/twenty-server/src/mkt-core/payment/resolvers/payment-confirmation.resolver.ts`

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

import { ConfirmPaymentInputDto, ConfirmPaymentOutputDto } from 'src/mkt-core/payment/dto/confirm-payment.dto';
import { RefundPaymentInputDto, RefundPaymentOutputDto } from 'src/mkt-core/payment/dto/refund-payment.dto';
import { PaymentConfirmationService } from 'src/mkt-core/payment/services/core/payment-confirmation.service';
import { PaymentRefundService } from 'src/mkt-core/payment/services/core/payment-refund.service';
import { PaymentHistoryService } from 'src/mkt-core/payment/services/core/payment-history.service';

@Resolver()
export class PaymentConfirmationResolver {
  constructor(
    private readonly paymentConfirmationService: PaymentConfirmationService,
    private readonly paymentRefundService: PaymentRefundService,
    private readonly paymentHistoryService: PaymentHistoryService,
  ) {}

  /**
   * Confirm or reject a payment
   *
   * @example
   * mutation {
   *   mktConfirmPayment(input: {
   *     paymentId: "uuid",
   *     confirmed: true,
   *     note: "Đã kiểm tra bank statement"
   *   }) {
   *     success
   *     payment { id status confirmedAt }
   *     order { paidAmount remainingAmount paymentStatus }
   *     licensesCreated
   *   }
   * }
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => ConfirmPaymentOutputDto, {
    description: 'Confirm or reject a payment',
  })
  async mktConfirmPayment(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @Args('input') input: ConfirmPaymentInputDto,
  ): Promise<ConfirmPaymentOutputDto> {
    if (input.confirmed) {
      return this.paymentConfirmationService.confirmPayment(
        { paymentId: input.paymentId, note: input.note },
        workspaceMemberId,
        workspace.id,
      );
    }

    // Reject requires rejectionReason
    if (!input.rejectionReason) {
      return {
        success: false,
        error: 'rejectionReason is required when confirmed = false',
      };
    }

    return this.paymentConfirmationService.rejectPayment(
      {
        paymentId: input.paymentId,
        rejectionReason: input.rejectionReason,
        note: input.note,
      },
      workspaceMemberId,
    );
  }

  /**
   * Refund a payment (full or partial)
   *
   * @example
   * mutation {
   *   mktRefundPayment(input: {
   *     paymentId: "uuid",
   *     amount: 500000,
   *     reason: "Khách yêu cầu hủy một phần"
   *   }) {
   *     success
   *     payment { id status refundedAmount }
   *     order { paidAmount remainingAmount paymentStatus }
   *     refundedAmount
   *   }
   * }
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => RefundPaymentOutputDto, {
    description: 'Refund a payment (full or partial)',
  })
  async mktRefundPayment(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @Args('input') input: RefundPaymentInputDto,
  ): Promise<RefundPaymentOutputDto> {
    return this.paymentRefundService.refundPayment(
      {
        paymentId: input.paymentId,
        amount: input.amount,
        reason: input.reason,
      },
      workspaceMemberId,
      workspace.id,
    );
  }

  /**
   * Get payment history
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => [PaymentHistoryOutput], {
    description: 'Get payment history by payment ID',
  })
  async mktPaymentHistory(
    @Args('paymentId') paymentId: string,
  ) {
    return this.paymentHistoryService.getByPaymentId(paymentId);
  }
}
```

---

## 5. Phase 4: Event Handlers

### 5.1 Cập nhật Payment Events

**File:** `packages/twenty-server/src/mkt-core/payment/events/payment.events.ts`

Thêm event type mới:

```typescript
export const PAYMENT_EVENTS = {
  // ... existing events ...

  /** Emitted when payment is confirmed */
  PAYMENT_CONFIRMED: 'payment.confirmed',

  /** Emitted when payment is rejected */
  PAYMENT_REJECTED: 'payment.rejected',

  /** Emitted when payment is refunded */
  PAYMENT_REFUNDED: 'payment.refunded',
} as const;

// Event payload types
export type PaymentConfirmedEvent = {
  paymentId: string;
  orderId: string;
  orderCode: string;
  amount: number;
  confirmedById: string;
  newOrderPaymentStatus: string;
  workspaceId: string;
};

export type PaymentRejectedEvent = {
  paymentId: string;
  orderId: string;
  rejectedById: string;
  rejectionReason: string;
  workspaceId: string;
};

export type PaymentRefundedEvent = {
  paymentId: string;
  orderId: string;
  orderCode?: string;
  refundAmount: number;
  totalRefunded: number;
  isFullRefund: boolean;
  refundedById: string;
  newOrderPaymentStatus?: string;
  workspaceId: string;
};
```

### 5.2 Cập nhật Listener

**File:** `packages/twenty-server/src/mkt-core/payment/listeners/payment-notification.listener.ts`

Thêm handlers cho events mới:

```typescript
@OnEvent(PAYMENT_EVENTS.PAYMENT_CONFIRMED)
async handlePaymentConfirmed(event: PaymentConfirmedEvent): Promise<void> {
  this.logger.log({
    message: 'Payment confirmed - triggering notifications',
    orderCode: event.orderCode,
    amount: event.amount,
    paymentStatus: event.newOrderPaymentStatus,
  });

  // TODO: Send confirmation email to customer
  // TODO: Notify accounting team
  // TODO: Update analytics
}

@OnEvent(PAYMENT_EVENTS.PAYMENT_REJECTED)
async handlePaymentRejected(event: PaymentRejectedEvent): Promise<void> {
  this.logger.warn({
    message: 'Payment rejected - notifying customer',
    paymentId: event.paymentId,
    reason: event.rejectionReason,
  });

  // TODO: Send rejection notification to customer
  // TODO: Create follow-up task
}

@OnEvent(PAYMENT_EVENTS.PAYMENT_REFUNDED)
async handlePaymentRefunded(event: PaymentRefundedEvent): Promise<void> {
  this.logger.log({
    message: 'Payment refunded - processing',
    orderCode: event.orderCode,
    refundAmount: event.refundAmount,
    isFullRefund: event.isFullRefund,
  });

  // TODO: Send refund confirmation to customer
  // TODO: Update accounting records
  // TODO: Trigger license revocation if needed
}
```

---

## 6. Testing Guide

### 6.1 Unit Tests

```bash
# Run payment service tests
npx nx test twenty-server --testPathPattern=payment-confirmation.service.spec.ts
npx nx test twenty-server --testPathPattern=payment-refund.service.spec.ts
```

### 6.2 Integration Tests

```bash
# Run with DB reset
npx nx run twenty-server:test:integration:with-db-reset --testPathPattern=payment
```

### 6.3 Manual Testing với GraphQL Playground

```graphql
# 1. Tạo payment
mutation {
  createPayment(input: {
    mktOrderId: "order-uuid"
    amount: 1000000
    mktPaymentMethodId: "payment-method-uuid"
  }) {
    success
    payment { id status }
  }
}

# 2. Confirm payment
mutation {
  mktConfirmPayment(input: {
    paymentId: "payment-uuid"
    confirmed: true
    note: "Đã kiểm tra"
  }) {
    success
    payment { id status confirmedAt }
    order { paidAmount remainingAmount paymentStatus }
    licensesCreated
  }
}

# 3. Refund (partial)
mutation {
  mktRefundPayment(input: {
    paymentId: "payment-uuid"
    amount: 500000
    reason: "Khách yêu cầu"
  }) {
    success
    payment { id status refundedAmount }
    refundedAmount
  }
}

# 4. Query history
query {
  mktPaymentHistory(paymentId: "payment-uuid") {
    id
    action
    previousStatus
    newStatus
    amount
    performedAt
    note
  }
}
```

---

## 7. Migration Strategy

### 7.1 Database Migration

Khi thêm fields mới vào entities, Twenty CRM sẽ tự động tạo migration khi chạy sync metadata.

```bash
# Sync metadata (sẽ tự tạo migration)
npx nx run twenty-server:command workspace:sync-metadata -f

# Hoặc generate migration thủ công
npx nx run twenty-server:typeorm migration:generate \
  src/database/typeorm/core/migrations/AddPaymentConfirmationFields \
  -d src/database/typeorm/core/core.datasource.ts
```

### 7.2 Backward Compatibility

**Status mapping:**
- `COMPLETED` → `CONFIRMED` (cần migration script)
- Các payments hiện có với status `COMPLETED` cần được update

```sql
-- Migration script
UPDATE "workspace_xxx"."mktPayment"
SET status = 'CONFIRMED'
WHERE status = 'COMPLETED';
```

### 7.3 Rollout Plan

1. **Stage 1:** Deploy schema changes (new fields nullable)
2. **Stage 2:** Deploy new services (backward compatible)
3. **Stage 3:** Run data migration for existing payments
4. **Stage 4:** Enable new mutations in GraphQL
5. **Stage 5:** Update frontend to use new APIs

---

## 8. Multi-Gateway Extension

> **Tài liệu chi tiết:** [MULTI_GATEWAY_EXTENSION_DESIGN.md](../../../../../../docs/flows/order/MULTI_GATEWAY_EXTENSION_DESIGN.md)

### 8.1 Tổng quan kiến trúc

Hệ thống đã có sẵn Provider pattern:
- `packages/twenty-server/src/mkt-core/payment/types/payment-provider.interface.ts`
- `packages/twenty-server/src/mkt-core/payment/providers/base/base-payment.provider.ts`
- `packages/twenty-server/src/mkt-core/payment/factory/payment-provider.factory.ts`

### 8.2 Cấu trúc Providers

```
packages/twenty-server/src/mkt-core/payment/providers/
├── base/
│   └── base-payment.provider.ts    ✅ Đã có
├── sepay/
│   ├── sepay.provider.ts           ✅ Đã có
│   └── sepay-webhook.handler.ts    ✅ Đã có
├── bidv/
│   └── bidv.provider.ts            ✅ Đã có
├── vnpay/                          🆕 Cần tạo
│   ├── vnpay.provider.ts
│   ├── vnpay-webhook.handler.ts
│   └── vnpay.config.ts
├── momo/                           🆕 Cần tạo
│   ├── momo.provider.ts
│   ├── momo-webhook.handler.ts
│   └── momo.config.ts
└── zalopay/                        🆕 Cần tạo
    ├── zalopay.provider.ts
    ├── zalopay-webhook.handler.ts
    └── zalopay.config.ts
```

### 8.3 Data Migration cho sepayTransactionId

```typescript
// Migration script để copy data sang field mới
async function migrateProviderTransactionIds(workspaceId: string) {
  const payments = await paymentRepository.find({
    where: {
      sepayTransactionId: Not(IsNull()),
      providerTransactionId: IsNull(),
    },
  });

  for (const payment of payments) {
    await paymentRepository.update(payment.id, {
      providerType: PAYMENT_PROVIDER_TYPE.SEPAY,
      providerTransactionId: payment.sepayTransactionId,
    });
  }
}
```

### 8.4 Backward Compatibility trong Repository

```typescript
// MktPaymentRepository - hỗ trợ cả 2 cách lookup
async findByTransactionId(
  transactionId: string,
  providerType?: PaymentProviderType,
): Promise<MktPaymentWorkspaceEntity | null> {
  // Ưu tiên tìm theo providerTransactionId mới
  let payment = await this.repository.findOne({
    where: {
      providerTransactionId: transactionId,
      ...(providerType && { providerType }),
      deletedAt: IsNull(),
    },
  });

  // Fallback: tìm theo sepayTransactionId cũ (backward compatible)
  if (!payment && (!providerType || providerType === PAYMENT_PROVIDER_TYPE.SEPAY)) {
    payment = await this.repository.findOne({
      where: {
        sepayTransactionId: transactionId,
        deletedAt: IsNull(),
      },
    });
  }

  return payment;
}
```

### 8.5 Environment Configuration

```env
# ============================================
# SEPAY (existing)
# ============================================
SEPAY_ENABLED=true
SEPAY_API_KEY=xxx
SEPAY_WORKSPACE_ID=xxx
SEPAY_WEBHOOK_SECRET=xxx

# ============================================
# VNPAY (future)
# ============================================
VNPAY_ENABLED=false
VNPAY_TMN_CODE=xxx
VNPAY_HASH_SECRET=xxx
VNPAY_API_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://your-domain.com/payment/vnpay/return

# ============================================
# MOMO (future)
# ============================================
MOMO_ENABLED=false
MOMO_PARTNER_CODE=xxx
MOMO_ACCESS_KEY=xxx
MOMO_SECRET_KEY=xxx
MOMO_API_URL=https://test-payment.momo.vn

# ============================================
# ZALOPAY (future)
# ============================================
ZALOPAY_ENABLED=false
ZALOPAY_APP_ID=xxx
ZALOPAY_KEY1=xxx
ZALOPAY_KEY2=xxx
ZALOPAY_API_URL=https://sb-openapi.zalopay.vn
```

### 8.6 Generic Webhook Controller

```typescript
@Controller('webhooks')
export class PaymentWebhookController {
  constructor(
    private readonly paymentFacadeService: PaymentFacadeService,
  ) {}

  // SEPay webhook (existing)
  @Post('sepay')
  async handleSepayWebhook(@Body() payload: SepayWebhookDto) {
    return this.paymentFacadeService.processWebhook(
      PAYMENT_PROVIDER_TYPE.SEPAY,
      payload,
    );
  }

  // VNPay webhook (future)
  @Post('vnpay')
  async handleVnpayWebhook(@Body() payload: VnpayWebhookDto) {
    return this.paymentFacadeService.processWebhook(
      PAYMENT_PROVIDER_TYPE.VNPAY,
      payload,
    );
  }

  // MoMo webhook (future)
  @Post('momo')
  async handleMomoWebhook(@Body() payload: MomoWebhookDto) {
    return this.paymentFacadeService.processWebhook(
      PAYMENT_PROVIDER_TYPE.MOMO,
      payload,
    );
  }

  // ZaloPay webhook (future)
  @Post('zalopay')
  async handleZalopayWebhook(@Body() payload: ZalopayWebhookDto) {
    return this.paymentFacadeService.processWebhook(
      PAYMENT_PROVIDER_TYPE.ZALOPAY,
      payload,
    );
  }
}
```

---

## Checklist triển khai

- [x] Phase 1: Schema Enhancement ✅ (Completed 2026-01-30)
  - [x] Thêm fields vào MktPaymentWorkspaceEntity
    - [x] confirmedAt, confirmedBy, rejectedAt, rejectedBy, rejectionReason
    - [x] refundedAmount, metadata, transactionRef
    - [x] **providerType, providerTransactionId, providerResponse, providerMetadata** (Multi-Gateway)
  - [x] Thêm field IDs vào mkt-field-ids.ts
  - [x] Tạo payment-provider.constants.ts (PAYMENT_PROVIDER_TYPE, PROVIDER_CAPABILITIES)
  - [x] Cập nhật payment status enum (thêm CONFIRMED, REJECTED, PARTIALLY_REFUNDED)
  - [x] Tạo payment action constants
  - [x] Cập nhật MktPaymentHistoryWorkspaceEntity
  - [x] Sync metadata / generate migration

- [x] Phase 2: Core Services ✅ (Completed 2026-01-30)
  - [x] Tạo PaymentConfirmationService
  - [x] Tạo PaymentRefundService
  - [x] Tạo PaymentHistoryService
  - [x] Cập nhật MktPaymentRepository (UpdatePaymentData types)
  - [x] Cập nhật MktPaymentHistoryRepository
  - [x] Register services trong MktPaymentModule
  - [x] Cập nhật PaymentStatus type để include CONFIRMED, REJECTED, PARTIALLY_REFUNDED

- [x] Phase 3: GraphQL API ✅ (Completed 2026-01-30)
  - [x] Tạo ConfirmPaymentInputDto, RejectPaymentInputDto, RefundPaymentInputDto (payment.input.ts)
  - [x] Tạo PaymentActionResponseDto, OrderPaymentSummaryDto (payment.output.ts)
  - [x] Tạo PaymentConfirmationResolver
  - [x] Register resolver trong module
  - [ ] Test với GraphQL Playground

- [x] Phase 4: Event Handlers ✅ (Completed 2026-01-30)
  - [x] Thêm event types mới (PAYMENT_CONFIRMED, PAYMENT_REJECTED, PAYMENT_REFUNDED)
  - [x] Thêm event payload types
  - [x] Cập nhật PaymentNotificationListener với handlers mới
  - [ ] Implement email notifications (optional - TODO)

- [ ] Multi-Gateway Extension (Future)
  - [ ] Migration script: copy sepayTransactionId → providerTransactionId, set providerType = SEPAY
  - [ ] Update webhook service để set providerType khi tạo payment
  - [ ] Test backward compatibility
  - [ ] (Future) Implement VNPay provider
  - [ ] (Future) Implement MoMo provider
  - [ ] (Future) Implement ZaloPay provider

- [ ] Testing
  - [ ] Unit tests cho services
  - [ ] Integration tests
  - [ ] Manual testing
  - [ ] Test dual-lookup trong repository

- [ ] Documentation
  - [ ] Update API documentation
  - [ ] Update README nếu cần

---

## Changelog

| Date       | Version | Changes |
|------------|---------|---------|
| 2026-01-30 | 1.2.0   | Completed Phase 1-4 implementation. Added PaymentConfirmationService, PaymentRefundService, PaymentHistoryService. Added GraphQL mutations (confirmPayment, rejectPayment, refundPayment). Updated event handlers. |
| 2026-01-30 | 1.1.0   | Thêm Multi-Gateway Extension design (provider-agnostic fields, migration strategy) |
| 2026-01-30 | 1.0.0   | Initial implementation guide |
