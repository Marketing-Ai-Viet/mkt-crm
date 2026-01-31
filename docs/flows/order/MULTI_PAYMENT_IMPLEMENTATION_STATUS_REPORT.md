# Multi-Payment Methods - Implementation Status Report

**Ngày báo cáo:** 2026-01-30
**Tài liệu tham chiếu:** [MULTI_PAYMENT_METHODS_FLOW.md](./MULTI_PAYMENT_METHODS_FLOW.md)

---

## Tổng quan

Báo cáo này so sánh giữa thiết kế trong tài liệu `MULTI_PAYMENT_METHODS_FLOW.md` và implementation thực tế trong codebase, nhằm xác định những gì đã hoàn thành và những gì cần triển khai thêm.

---

## 1. Data Model

### 1.1 Order Entity

| Field | Tài liệu | Implementation | Trạng thái |
|-------|----------|----------------|------------|
| `id` | ✓ | ✓ | ✅ Đã có |
| `orderCode` | ✓ | ✓ | ✅ Đã có |
| `customerId` | ✓ | `mktCustomerId` | ✅ Đã có |
| `totalAmount` | ✓ | ✓ | ✅ Đã có |
| `paidAmount` | ✓ | ✓ | ✅ Đã có |
| `remainingAmount` | ✓ | ✓ | ✅ Đã có |
| `status` | ✓ | ✓ | ✅ Đã có |
| `paymentStatus` | ✓ | ✓ | ✅ Đã có |
| `payments` (1:N) | ✓ | `mktPayments` | ✅ Đã có |
| `partialPaymentPolicy` | ✓ | ❌ | ⚠️ Thiếu |
| `paymentThresholdPercent` | ✓ | ❌ | ⚠️ Thiếu |

**Nhận xét:** Order entity đã có hầu hết các fields cần thiết. Cần bổ sung `partialPaymentPolicy` và `paymentThresholdPercent` để hỗ trợ cấu hình partial payment ở cấp order.

### 1.2 Payment Entity

| Field | Tài liệu | Implementation | Trạng thái |
|-------|----------|----------------|------------|
| `id` | ✓ | ✓ | ✅ Đã có |
| `orderId` | ✓ | `mktOrderId` | ✅ Đã có |
| `method` | ✓ | `mktPaymentMethod` (relation) | ✅ Đã có |
| `amount` | ✓ | ✓ | ✅ Đã có |
| `currency` | ✓ | ✓ | ✅ Đã có |
| `transactionRef` | ✓ | `sepayTransactionId` | ⚠️ Partial (chỉ SEPay) |
| `transactionDate` | ✓ | `paymentDate` | ✅ Đã có |
| `status` | ✓ | ✓ | ✅ Đã có |
| `confirmedAt` | ✓ | ❌ | ❌ Thiếu |
| `confirmedBy` | ✓ | ❌ | ❌ Thiếu |
| `rejectedAt` | ✓ | ❌ | ❌ Thiếu |
| `rejectedBy` | ✓ | ❌ | ❌ Thiếu |
| `rejectionReason` | ✓ | ❌ | ❌ Thiếu |
| `note` | ✓ | `description` | ✅ Đã có |
| `metadata` | ✓ | ❌ | ❌ Thiếu |
| `refundedAmount` | ✓ | ❌ | ❌ Thiếu |

**Nhận xét:** Payment entity thiếu nhiều fields quan trọng cho workflow confirm/reject và refund tracking.

### 1.3 Payment History Entity (Audit Trail)

| Field | Tài liệu | Implementation | Trạng thái |
|-------|----------|----------------|------------|
| `id` | ✓ | ✓ | ✅ Đã có |
| `paymentId` | ✓ | `mktPaymentId` | ✅ Đã có |
| `action` | ✓ | `paymentType` | ⚠️ Khác tên/concept |
| `previousStatus` | ✓ | ❌ | ❌ Thiếu |
| `newStatus` | ✓ | ❌ | ❌ Thiếu |
| `performedBy` | ✓ | `accountOwnerId` | ⚠️ Partial |
| `performedAt` | ✓ | `createdAt` | ⚠️ Implicit |
| `note` | ✓ | ✓ | ✅ Đã có |
| `metadata` | ✓ | ❌ | ❌ Thiếu |

**Nhận xét:** PaymentHistory entity tồn tại nhưng cấu trúc khác với thiết kế. Cần refactor để tracking đầy đủ status transitions.

---

## 2. Enums & Constants

### 2.1 Payment Method Enum

| Method | Tài liệu | Implementation | Trạng thái |
|--------|----------|----------------|------------|
| `BANK_TRANSFER` | ✓ | ✓ | ✅ Đã có |
| `SEPAY` | ✓ | `QR_CODE` | ⚠️ Khác tên |
| `CASH` | ✓ | ✓ | ✅ Đã có |
| `CREDIT_CARD` | ✓ | ✓ | ✅ Đã có |
| `MOMO` | ✓ | ❌ | ❌ Thiếu |
| `VNPAY` | ✓ | ❌ | ❌ Thiếu |
| `ZALOPAY` | ✓ | ❌ | ❌ Thiếu |
| `CREDIT_NOTE` | ✓ | ❌ | ❌ Thiếu |
| `OTHER` | ✓ | ✓ | ✅ Đã có |

**File:** `payment/types/payment.type.ts`

### 2.2 Payment Transaction Status Enum

| Status | Tài liệu | Implementation | Trạng thái |
|--------|----------|----------------|------------|
| `PENDING` | ✓ | ✓ | ✅ Đã có |
| `CONFIRMED` | ✓ | `COMPLETED` | ⚠️ Khác tên |
| `FAILED` | ✓ | ✓ | ✅ Đã có |
| `REJECTED` | ✓ | ❌ | ❌ Thiếu |
| `REFUNDED` | ✓ | ✓ | ✅ Đã có |
| `PARTIALLY_REFUNDED` | ✓ | ❌ | ❌ Thiếu |

**File:** `payment/constants/payment-status.constants.ts`

### 2.3 Order Payment Status Enum

| Status | Tài liệu | Implementation | Trạng thái |
|--------|----------|----------------|------------|
| `PENDING` | ✓ | ✓ | ✅ Đã có |
| `PARTIAL` | ✓ | ✓ | ✅ Đã có |
| `PAID` | ✓ | ✓ | ✅ Đã có |
| `OVERPAID` | ✓ | ✓ | ✅ Đã có |

**File:** `order/constants/payment-status.constants.ts` - ✅ **Hoàn chỉnh**

### 2.4 Payment Action Enum (for History)

| Action | Tài liệu | Implementation | Trạng thái |
|--------|----------|----------------|------------|
| `CREATED` | ✓ | ❌ | ❌ Thiếu |
| `CONFIRMED` | ✓ | ❌ | ❌ Thiếu |
| `REJECTED` | ✓ | ❌ | ❌ Thiếu |
| `REFUNDED` | ✓ | ✓ (REFUND type) | ⚠️ Partial |
| `PARTIALLY_REFUNDED` | ✓ | ❌ | ❌ Thiếu |
| `UPDATED` | ✓ | ❌ | ❌ Thiếu |
| `DELETED` | ✓ | ❌ | ❌ Thiếu |

**Nhận xét:** PaymentAction enum chưa được implement theo thiết kế.

---

## 3. Business Logic Services

### 3.1 Payment Confirmation Service

| Feature | Tài liệu | Implementation | Trạng thái |
|---------|----------|----------------|------------|
| `confirmPayment()` | ✓ | ❌ | ❌ Thiếu |
| `rejectPayment()` | ✓ | ❌ | ❌ Thiếu |
| Validate payment status | ✓ | ❌ | ❌ Thiếu |
| Update confirm metadata | ✓ | ❌ | ❌ Thiếu |
| Record history | ✓ | ❌ | ❌ Thiếu |
| Recalculate order totals | ✓ | ✓ (OrderPaymentCalculationService) | ✅ Đã có |
| Trigger license creation | ✓ | ⚠️ Partial | ⚠️ Partial |

**Nhận xét:** Cần tạo `PaymentConfirmationService` riêng với đầy đủ workflow confirm/reject.

**File cần tham khảo:** `order/services/core/order-payment-calculation.service.ts` - Logic tính toán đã có.

### 3.2 Payment Refund Service

| Feature | Tài liệu | Implementation | Trạng thái |
|---------|----------|----------------|------------|
| `refundPayment()` | ✓ | ✓ (PaymentFacadeService) | ⚠️ Basic |
| Validate CONFIRMED status | ✓ | ⚠️ | ⚠️ Partial |
| Partial refund support | ✓ | ❌ | ❌ Thiếu |
| Update refundedAmount | ✓ | ❌ | ❌ Thiếu |
| Record history | ✓ | ❌ | ❌ Thiếu |
| License revocation | ✓ | ⚠️ (Removed from saga) | ❌ Thiếu |
| PRO_RATA policy | ✓ | ❌ | ❌ Thiếu |
| THRESHOLD policy | ✓ | Logic exists | ⚠️ Partial |

**Files liên quan:**
- `payment/services/core/payment-facade.service.ts` - Basic refund
- `order/orchestration/saga/refund-order.saga.ts` - Order refund (no license mgmt)

### 3.3 Order Payment Calculation Service

| Feature | Tài liệu | Implementation | Trạng thái |
|---------|----------|----------------|------------|
| `calculatePaymentSummary()` | ✓ | ✓ | ✅ Đã có |
| `recalculateFromPayments()` | ✓ | ✓ | ✅ Đã có |
| `isEligibleForLicenseCreation()` | ✓ | ✓ | ✅ Đã có |
| `calculateAllowedLicenses()` | ✓ | ✓ | ✅ Đã có |
| Filter confirmed payments | ✓ | ✓ | ✅ Đã có |
| Handle refunded amounts | ✓ | ✓ | ✅ Đã có |

**File:** `order/services/core/order-payment-calculation.service.ts` - ✅ **Hoàn chỉnh**

---

## 4. GraphQL API

### 4.1 Mutations

| Mutation | Tài liệu | Implementation | Trạng thái |
|----------|----------|----------------|------------|
| `mktAddPayment` | AddPaymentInput → payment + order | `createPayment` | ⚠️ Khác interface |
| `mktConfirmPayment` | ConfirmPaymentInput → success + payment + order | ❌ | ❌ Thiếu |
| `mktRefundPayment` | RefundPaymentInput → success + payment + order + revokedLicenses | ❌ | ❌ Thiếu |
| `createPayment` | N/A | ✓ | ✅ Có (khác design) |
| `updatePayment` | N/A | ✓ | ✅ Có (khác design) |

**Files:**
- `payment/resolvers/payment-mutation.resolver.ts` - Existing mutations
- `payment/dto/payment.input.ts` - Existing DTOs
- `payment/dto/payment.output.ts` - Existing DTOs

**Cần bổ sung DTOs:**
- `AddPaymentInput`, `AddPaymentOutput`
- `ConfirmPaymentInput`, `ConfirmPaymentOutput`
- `RefundPaymentInput`, `RefundPaymentOutput`

### 4.2 Queries

| Query | Tài liệu | Implementation | Trạng thái |
|-------|----------|----------------|------------|
| `mktOrder(id)` với payments | ✓ | ⚠️ (via standard Twenty ORM) | ⚠️ Partial |
| `paymentSummary` aggregation | ✓ | ❌ | ❌ Thiếu |
| `mktPaymentHistory(paymentId)` | ✓ | ❌ | ❌ Thiếu |

---

## 5. Webhook Integration

### 5.1 SEPay Webhook Handler

| Feature | Tài liệu | Implementation | Trạng thái |
|---------|----------|----------------|------------|
| Verify signature | ✓ | ✓ | ✅ Đã có |
| Extract order code | ✓ | ✓ | ✅ Đã có |
| Create payment record | ✓ | ✓ | ✅ Đã có |
| Auto-confirm logic | ✓ | ✓ | ✅ Đã có |
| Idempotency check | ✓ | ✓ | ✅ Đã có |
| Webhook log | ✓ | ✓ | ✅ Đã có |
| IP whitelist | ✓ | ✓ | ✅ Đã có |

**Files:**
- `payment/sepay-payment/sepay-payment.controller.ts` ✅
- `payment/services/webhook/mkt-payment-webhook.service.ts` ✅
- `payment/guards/sepay-auth.guard.ts` ✅
- `payment/guards/ip-whitelist.guard.ts` ✅

**Nhận xét:** SEPay webhook integration **hoàn chỉnh**.

---

## 6. Event System

### 6.1 Payment Events

| Event | Tài liệu | Implementation | Trạng thái |
|-------|----------|----------------|------------|
| `payment.created` | PaymentCreatedEvent | ❌ | ❌ Thiếu |
| `payment.confirmed` | PaymentConfirmedEvent | `payment.completed` | ⚠️ Khác tên |
| `payment.refunded` | PaymentRefundedEvent | ❌ | ❌ Thiếu |
| `payment.received` | N/A | ✓ | ✅ Extra |
| `payment.partial` | N/A | ✓ | ✅ Extra |
| `payment.overpaid` | N/A | ✓ | ✅ Extra |
| `payment.failed` | N/A | ✓ | ✅ Extra |
| `order.confirmed` | OrderConfirmedEvent | ✓ | ✅ Đã có |

**File:** `payment/events/payment.events.ts`

### 6.2 Event Listeners

| Listener | Tài liệu | Implementation | Trạng thái |
|----------|----------|----------------|------------|
| `PaymentEventListener` | Send emails, notify sales, analytics | `PaymentNotificationListener` | ⚠️ TODO stubs |
| Send confirmation email | ✓ | TODO | ❌ Chưa implement |
| Send refund notification | ✓ | TODO | ❌ Chưa implement |
| Update accounting | ✓ | TODO | ❌ Chưa implement |
| License activation | ✓ | TODO | ❌ Chưa implement |

**File:** `payment/listeners/payment-notification.listener.ts` - Có stubs, chưa implement logic.

---

## 7. Configuration

### 7.1 Environment Variables

| Variable | Tài liệu | Implementation | Trạng thái |
|----------|----------|----------------|------------|
| `PAYMENT_AUTO_CONFIRM_ENABLED` | ✓ | `partialPaymentConfig` | ⚠️ Khác tên |
| `PAYMENT_AUTO_CONFIRM_METHODS` | ✓ | ❌ | ❌ Thiếu |
| `PAYMENT_CONFIRMATION_TIMEOUT_HOURS` | ✓ | ❌ | ❌ Thiếu |
| `PAYMENT_HISTORY_RETENTION_DAYS` | ✓ | ❌ | ❌ Thiếu |

**Files:**
- `payment/config/payment.config.ts`
- `payment/config/partial-payment.config.ts`

### 7.2 Payment Method Configuration

| Config | Tài liệu | Implementation | Trạng thái |
|--------|----------|----------------|------------|
| `requiresManualConfirmation` | ✓ | ❌ | ❌ Thiếu |
| `supportsAutoReconciliation` | ✓ | ❌ | ❌ Thiếu |
| `webhookEnabled` | ✓ | Implicit | ⚠️ Partial |
| `defaultNote` | ✓ | ❌ | ❌ Thiếu |

---

## 8. Tổng hợp - Checklist Implementation

### ✅ Đã hoàn thành (12 items)

1. Order entity với multi-payment fields (paidAmount, remainingAmount, paymentStatus)
2. Payment entity cơ bản
3. Payment → Order relation (1:N)
4. Order Payment Status enum (PENDING, PARTIAL, PAID, OVERPAID)
5. OrderPaymentCalculationService với đầy đủ logic
6. SEPay webhook controller và service
7. Webhook idempotency check
8. Webhook log entity và tracking
9. IP whitelist guard
10. Payment event types định nghĩa
11. PaymentNotificationListener (stubs)
12. Basic payment CRUD mutations

### ⚠️ Cần cải thiện (8 items)

1. Payment entity thiếu fields: confirmedAt, confirmedBy, rejectedAt, rejectedBy, refundedAmount, metadata
2. PaymentHistory entity structure khác design
3. Payment status enum naming (COMPLETED vs CONFIRMED)
4. PaymentAction enum chưa có
5. Refund flow thiếu partial refund tracking
6. Event names không match design
7. Config env vars khác tên
8. GraphQL API interface khác design

### ❌ Cần triển khai mới (15 items)

1. **PaymentConfirmationService** - Dedicated service cho confirm/reject workflow
2. **mktConfirmPayment mutation** - GraphQL mutation theo spec
3. **mktRefundPayment mutation** - GraphQL mutation theo spec
4. **ConfirmPaymentInput/Output DTOs** - Theo thiết kế
5. **RefundPaymentInput/Output DTOs** - Theo thiết kế
6. **PaymentHistory audit trail** - Proper status transition tracking
7. **REJECTED status** - Cho payments bị từ chối
8. **PARTIALLY_REFUNDED status** - Cho partial refunds
9. **Payment metadata field** - Provider-specific data
10. **partialPaymentPolicy field** trên Order
11. **paymentThresholdPercent field** trên Order
12. **mktPaymentHistory query** - GraphQL query
13. **paymentSummary resolver** - Aggregate data trong Order query
14. **License revocation logic** - Trong refund flow
15. **Notification implementation** - Email, push notifications

---

## 9. Đề xuất Roadmap Implementation

### Phase 1: Data Model Enhancement (Priority: HIGH)

**Mục tiêu:** Bổ sung fields còn thiếu cho Payment và PaymentHistory entities.

**Tasks:**
1. Thêm fields vào `MktPaymentWorkspaceEntity`:
   - `confirmedAt`, `confirmedBy`
   - `rejectedAt`, `rejectedBy`, `rejectionReason`
   - `refundedAmount`
   - `metadata` (RAW_JSON)

2. Thêm fields vào `MktPaymentHistoryWorkspaceEntity`:
   - `action` (enum)
   - `previousStatus`
   - `newStatus`
   - `metadata`

3. Thêm fields vào `MktOrderWorkspaceEntity`:
   - `partialPaymentPolicy`
   - `paymentThresholdPercent`

4. Tạo migration cho schema changes

### Phase 2: Core Services (Priority: HIGH)

**Mục tiêu:** Implement PaymentConfirmationService và PaymentRefundService.

**Tasks:**
1. Tạo `PaymentConfirmationService`:
   - `confirmPayment(input)` - Xác nhận payment
   - `rejectPayment(input)` - Từ chối payment
   - Record history với proper audit trail
   - Recalculate order totals
   - Trigger license creation nếu eligible

2. Cải thiện `PaymentRefundService`:
   - Partial refund support
   - Update refundedAmount tracking
   - Record history
   - License revocation logic (integrate với LicenseIntegration)

3. Tạo `PaymentHistoryService`:
   - `record(paymentId, action, previousStatus, newStatus, performedBy, note)`
   - Query history by paymentId

### Phase 3: GraphQL API (Priority: MEDIUM)

**Mục tiêu:** Expose APIs theo thiết kế.

**Tasks:**
1. Tạo DTOs:
   - `AddPaymentInput`, `AddPaymentOutput`
   - `ConfirmPaymentInput`, `ConfirmPaymentOutput`
   - `RefundPaymentInput`, `RefundPaymentOutput`

2. Tạo/Update resolvers:
   - `mktAddPayment` mutation
   - `mktConfirmPayment` mutation
   - `mktRefundPayment` mutation
   - `mktPaymentHistory` query
   - `paymentSummary` field resolver cho Order

### Phase 4: Event Handlers & Notifications (Priority: LOW)

**Mục tiêu:** Implement notification logic trong listeners.

**Tasks:**
1. Implement email sending trong `PaymentNotificationListener`
2. Integrate với MktEmailModule
3. Add Slack/webhook notifications for overpayment alerts
4. Implement analytics tracking

### Phase 5: Configuration & Polish (Priority: LOW)

**Tasks:**
1. Add missing env vars
2. Payment method configuration object
3. Documentation updates
4. Unit tests

---

## 10. Files Reference

### Existing Files (để tham khảo)

```
packages/twenty-server/src/mkt-core/
├── order/
│   ├── objects/mkt-order.workspace-entity.ts
│   ├── constants/payment-status.constants.ts
│   ├── services/core/order-payment-calculation.service.ts
│   ├── dto/payment-flow.dto.ts
│   └── orchestration/saga/refund-order.saga.ts
├── payment/
│   ├── objects/
│   │   ├── mkt-payment.workspace-entity.ts
│   │   └── mkt-payment-history.workspace-entity.ts
│   ├── services/
│   │   ├── core/mkt-payment.service.ts
│   │   ├── core/payment-facade.service.ts
│   │   ├── webhook/mkt-payment-webhook.service.ts
│   │   └── events/payment-event.service.ts
│   ├── resolvers/payment-mutation.resolver.ts
│   ├── dto/
│   │   ├── payment.input.ts
│   │   └── payment.output.ts
│   ├── events/payment.events.ts
│   ├── listeners/payment-notification.listener.ts
│   └── sepay-payment/sepay-payment.controller.ts
```

### Files cần tạo mới

```
packages/twenty-server/src/mkt-core/payment/
├── services/
│   ├── core/payment-confirmation.service.ts    # NEW
│   ├── core/payment-refund.service.ts          # NEW
│   └── core/payment-history.service.ts         # NEW
├── dto/
│   ├── confirm-payment.dto.ts                  # NEW
│   └── refund-payment.dto.ts                   # NEW
├── resolvers/
│   └── payment-query.resolver.ts               # NEW
└── constants/
    └── payment-action.constants.ts             # NEW
```

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-30 | Claude AI | Initial report creation |
