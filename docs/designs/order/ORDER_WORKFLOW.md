# Order Module - Workflow Documentation

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc Module](#2-kiến-trúc-module)
3. [Order Lifecycle](#3-order-lifecycle)
4. [Saga Pattern](#4-saga-pattern)
5. [State Machine](#5-state-machine)
6. [Integration Services](#6-integration-services)
7. [GraphQL API](#7-graphql-api)
8. [Data Flow](#8-data-flow)

---

## 1. Tổng quan

### 1.1 Mục đích

Order Module quản lý toàn bộ lifecycle của đơn hàng trong hệ thống CRM, bao gồm:
- Tạo đơn hàng với items, licenses, payments
- Xác nhận và cập nhật trạng thái đơn hàng
- Tích hợp với Product, License, Promotion modules
- Xử lý hoàn tiền (full/partial)

### 1.2 Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | NestJS |
| Database | PostgreSQL + TypeORM |
| API | GraphQL (Code-first) |
| Pattern | Saga Pattern, State Machine |
| Cache | Redis |

---

## 2. Kiến trúc Module

### 2.1 Cấu trúc thư mục

```
mkt-core/order/
├── constants/                 # Status, actions, configuration
│   └── order-status.constants.ts
├── dto/                       # GraphQL Input/Output types
│   ├── create-order.input.ts
│   └── order-response.output.ts
├── listeners/                 # Event handlers
│   ├── mkt-order-custom-event.listener.ts
│   └── license-lifecycle.listener.ts
├── mappers/                   # DTO to Domain mappers
│   └── order-input.mapper.ts
├── objects/                   # WorkspaceEntity definitions
│   ├── mkt-order.workspace-entity.ts
│   ├── mkt-order-item.workspace-entity.ts
│   └── mkt-contract.workspace-entity.ts
├── orchestration/
│   ├── saga/                  # Saga executors
│   │   ├── create-order.saga.ts
│   │   ├── confirm-order.saga.ts
│   │   ├── update-order.saga.ts
│   │   └── refund-order.saga.ts
│   └── steps/                 # Saga step implementations
│       ├── create-order.step.ts
│       ├── create-snapshots.step.ts
│       ├── create-order-items.step.ts
│       ├── calculate-promotion.step.ts
│       ├── create-licenses.step.ts
│       ├── create-payment.step.ts
│       ├── finalize-order.step.ts
│       └── record-promotion-usage.step.ts
├── repositories/              # Data access layer
│   ├── mkt-order.repository.ts
│   └── mkt-order-item.repository.ts
├── resolvers/                 # GraphQL resolvers
│   ├── order-mutation.resolver.ts
│   └── order-item-mutation.resolver.ts
├── services/
│   ├── application/           # Orchestration facade
│   │   └── order-orchestration.service.ts
│   ├── core/                  # Stateless business logic
│   │   ├── order-status.service.ts
│   │   ├── order-calculation.service.ts
│   │   ├── order-validation.service.ts
│   │   └── order-event.service.ts
│   ├── domain/                # Domain operations
│   │   ├── order-crud.service.ts
│   │   ├── order-item.service.ts
│   │   └── order-license-query.service.ts
│   ├── integration/           # Bridge to other modules
│   │   ├── order-product.integration.ts
│   │   ├── order-license.integration.ts
│   │   └── order-promotion.integration.ts
│   └── legacy/                # Backward compatibility
├── states/                    # State machine
│   ├── order-state-machine.ts
│   ├── draft-state.ts
│   ├── trial-state.ts
│   ├── wait-state.ts
│   ├── confirm-state.ts
│   ├── completed-state.ts
│   ├── blocked-state.ts
│   ├── overdue-state.ts
│   ├── refund-state.ts
│   └── refund-partial-state.ts
├── types/                     # TypeScript types
└── mkt-order.module.ts        # Module definition
```

### 2.2 Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Resolvers (GraphQL)                                     │    │
│  │  - Guards: WorkspaceAuthGuard, UserAuthGuard             │    │
│  │  - Input: DTO → Domain (via OrderInputMapper)            │    │
│  │  - NO business logic                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  OrderOrchestrationService (Facade)                      │    │
│  │  - Input validation                                      │    │
│  │  - Saga execution                                        │    │
│  │  - Error handling                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DOMAIN LAYER                                    │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │  Validation   │ │  Calculation  │ │    Status     │         │
│  │  Service      │ │  Service      │ │   Service     │         │
│  └───────────────┘ └───────────────┘ └───────────────┘         │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │    CRUD       │ │  OrderItem    │ │    Event      │         │
│  │  Service      │ │  Service      │ │   Service     │         │
│  └───────────────┘ └───────────────┘ └───────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INTEGRATION LAYER                               │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │   Product     │ │   License     │ │  Promotion    │         │
│  │ Integration   │ │ Integration   │ │ Integration   │         │
│  └───────────────┘ └───────────────┘ └───────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                      │
│  ┌───────────────┐ ┌───────────────┐                            │
│  │    Order      │ │  OrderItem    │                            │
│  │  Repository   │ │  Repository   │                            │
│  └───────────────┘ └───────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Order Lifecycle

### 3.1 Order Status

| Status | Description | Color |
|--------|-------------|-------|
| `DRAFT` | Đơn hàng mới tạo, chờ xử lý | Gray |
| `TRIAL` | Đang trong giai đoạn dùng thử | Yellow |
| `WAIT` | Chờ xử lý (đã tạo, chưa xác nhận) | Orange |
| `CONFIRMED` | Đã xác nhận | Blue |
| `COMPLETED` | Hoàn thành toàn bộ lifecycle | Green |
| `OVERDUE` | Quá hạn thanh toán | Red |
| `BLOCKED` | Bị khóa (gian lận/vi phạm) | Black |
| `REFUND` | Hoàn tiền toàn bộ | Blue |
| `REFUND_PARTIAL` | Hoàn tiền một phần | Cyan |
| `REFUSE` | Từ chối | Purple |

### 3.2 Order Actions

| Action | Description |
|--------|-------------|
| `DRAFT` | Tạo đơn nháp |
| `CONFIRMED` | Xác nhận đơn hàng |
| `TRIAL` | Tạo đơn dùng thử |
| `PAID` | Thanh toán |
| `COMPLETED` | Hoàn thành |
| `LOCKED` | Khóa đơn |
| `CANCELLED` | Hủy đơn |
| `TRIAL_TO_PAID` | Chuyển từ trial sang paid |
| `REFUND` | Hoàn tiền toàn bộ |
| `REFUND_PARTIAL` | Hoàn tiền một phần |
| `LICENSE_RENEWING` | Gia hạn license |

### 3.3 State Transitions

```
                    ┌──────────────┐
                    │    DRAFT     │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  TRIAL   │    │   WAIT   │    │ CONFIRMED│
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         │    ┌──────────┴───────┐       │
         │    │                  │       │
         ▼    ▼                  ▼       ▼
    ┌──────────┐           ┌──────────────┐
    │ CONFIRMED│           │   OVERDUE    │
    └────┬─────┘           └──────────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
    ┌──────────┐                    ┌──────────────┐
    │COMPLETED │                    │   BLOCKED    │
    └────┬─────┘                    └──────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
    ┌──────────┐    ┌──────────────┐
    │  REFUND  │    │REFUND_PARTIAL│
    └──────────┘    └──────────────┘
```

---

## 4. Saga Pattern

### 4.1 CreateOrderSaga Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CreateOrderSaga                               │
├─────────────────────────────────────────────────────────────────┤
│  Step 1: CreateOrderStep                                         │
│  ├─ Create order entity                                          │
│  ├─ Generate order code                                          │
│  └─ Store orderId in context                                     │
├─────────────────────────────────────────────────────────────────┤
│  Step 2: CreateSnapshotsStep                                     │
│  ├─ Validate products/packages exist                             │
│  ├─ Create immutable snapshots with checksum                     │
│  └─ Store snapshots in context.metadata                          │
├─────────────────────────────────────────────────────────────────┤
│  Step 3: CreateOrderItemsStep                                    │
│  ├─ Create order items from external products                    │
│  ├─ Attach product/package snapshots                             │
│  ├─ Calculate item prices                                        │
│  └─ Update order totals                                          │
├─────────────────────────────────────────────────────────────────┤
│  Step 4: CalculatePromotionStep                                  │
│  ├─ Build promotion evaluation context                           │
│  ├─ Calculate discounts (auto + coupon)                          │
│  ├─ Update order with promotion fields                           │
│  └─ Store applied promotions in context                          │
├─────────────────────────────────────────────────────────────────┤
│  Step 5: CreateLicensesStep                                      │
│  ├─ Create licenses via MKT License API                          │
│  ├─ Create license snapshots                                     │
│  └─ Store licenseIds in context                                  │
├─────────────────────────────────────────────────────────────────┤
│  Step 6: CreatePaymentStep                                       │
│  ├─ Skip if TRIAL order                                          │
│  ├─ Create payment schedule                                      │
│  ├─ Generate QR code                                             │
│  └─ Store paymentId in context                                   │
├─────────────────────────────────────────────────────────────────┤
│  Step 7: FinalizeOrderStep                                       │
│  ├─ Set final order status                                       │
│  ├─ Create order history                                         │
│  └─ Emit ORDER_CREATED event                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Saga Context

```typescript
type SagaContext = {
  // Workspace info
  workspaceId: string;
  workspaceMemberId?: string;

  // Order data
  orderId?: string;
  orderCode?: string;
  orderItemIds?: string[];

  // License data
  licenseIds?: string[];

  // Payment data
  paymentId?: string;
  paymentQrCode?: string;

  // Contract data
  contractId?: string;

  // Invoice data
  invoiceId?: string;

  // Promotion data
  promotionIds?: string[];
  couponId?: string;

  // Rollback data
  rollbackData: Map<string, unknown>;

  // Metadata for steps
  metadata: Map<string, unknown>;
};
```

### 4.3 Compensate (Rollback)

Khi một step fail, saga sẽ compensate các steps đã thực thi theo thứ tự ngược:

```
Step 7 fails → Compensate Step 6 → Compensate Step 5 → ... → Compensate Step 1
```

Mỗi step lưu rollback data trong `context.rollbackData.set(stepName, data)`:

| Step | Compensate Action |
|------|-------------------|
| CreateOrderStep | Hard delete order |
| CreateSnapshotsStep | Clear metadata (snapshots immutable) |
| CreateOrderItemsStep | Hard delete order items |
| CalculatePromotionStep | Reset promotion fields |
| CreateLicensesStep | Revoke licenses via API |
| CreatePaymentStep | Cancel payment |
| FinalizeOrderStep | Revert status |

---

## 5. State Machine

### 5.1 Implementation

```typescript
class OrderStateMachine implements OrderStateContext {
  private currentState: OrderState;
  private currentOrder: Partial<MktOrderWorkspaceEntity>;

  // Get action from current state
  getAction(payload): ORDER_ACTION | null;

  // Get payload for action
  getPayload(payload, action): UpdatePayload;

  // Check if transition is valid
  canTransitionTo(newStatus: ORDER_STATUS): boolean;

  // Perform transition
  transitionTo(newStatus: ORDER_STATUS): void;
}
```

### 5.2 State Interface

```typescript
interface OrderState {
  getStatus(): ORDER_STATUS;

  getAction(
    context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null;

  getPayload(
    payload: UpdatePayload,
    action: ORDER_ACTION,
  ): UpdatePayload;

  canTransitionTo(
    newStatus: ORDER_STATUS,
    context: OrderStateContext,
    input: OrderStateInput,
  ): boolean;
}
```

---

## 6. Integration Services

### 6.1 OrderProductIntegrationService

Bridge to `MktProductIntegrationModule`:

```typescript
class OrderProductIntegrationService {
  // Validate products exist and can be ordered
  validateProducts(items, userContext): Promise<ValidationResult>;

  // Create immutable snapshots
  createSnapshots(items, language, userContext): Promise<ProductWithSnapshot[]>;

  // Validate and create in one operation
  validateAndCreateSnapshots(items, language, userContext): Promise<{
    validation: ValidationResult;
    snapshots: ProductWithSnapshot[];
  }>;

  // Verify snapshot integrity
  verifySnapshot(snapshot): boolean;
}
```

### 6.2 OrderLicenseIntegrationService

Bridge to `MktLicenseIntegrationModule`:

```typescript
class OrderLicenseIntegrationService {
  // Create licenses for order items
  createLicenses(items, userContext): Promise<BulkLicenseResult>;

  // Activate licenses after payment
  activateLicenses(licenseIds, userContext): Promise<ActivateResult>;

  // Revoke licenses on refund
  revokeLicenses(licenseIds, userContext): Promise<RevokeResult>;
}
```

### 6.3 OrderPromotionIntegrationService

Bridge to `MktPromotionModule`:

```typescript
class OrderPromotionIntegrationService {
  // Calculate discounts for order
  calculateDiscount(context: OrderDiscountContext): Promise<OrderPromotionResult>;

  // Build evaluation context from order data
  buildEvaluationContext(context): PromotionEvaluationContext;

  // Record usage after order confirmation
  recordUsage(workspaceId, usageInputs): Promise<UsageResult>;

  // Rollback usage on order cancellation
  rollbackUsage(workspaceId, orderId): Promise<RollbackResult>;

  // Validate coupon code
  validateCoupon(workspaceId, couponCode, customerId): Promise<ValidationResult>;
}
```

---

## 7. GraphQL API

### 7.1 Mutations

#### createOrderWithItems

```graphql
mutation CreateOrderWithItems($input: CreateOrderWithItemsInputDto!) {
  createOrderWithItems(input: $input) {
    success
    orderId
    orderCode
    paymentQrCode
    error
  }
}
```

**Input:**
```typescript
{
  customerId: string;           // Required
  name?: string;
  currency?: string;
  note?: string;
  requireContract?: boolean;
  discountPercent?: number;
  externalProducts?: [{         // Products from MKT Server
    productId: string;
    packageId?: string;
    quantity?: number;
  }];
  orderLanguage?: 'vi' | 'en';
  paymentMethods?: [{
    paymentMethodId: string;
    name?: string;
    duration?: number;
    amount?: number;
  }];
  action: ORDER_ACTION;
  couponCode?: string;          // Promotion coupon
  applyAutoPromotions?: boolean; // Default: true
}
```

#### confirmOrder

```graphql
mutation ConfirmOrder($input: ConfirmOrderInputDto!) {
  confirmOrder(input: $input) {
    success
    orderId
    newStatus
    error
  }
}
```

#### updateOrderStatus

```graphql
mutation UpdateOrderStatus($input: UpdateOrderStatusInputDto!) {
  updateOrderStatus(input: $input) {
    success
    orderId
    previousStatus
    newStatus
    error
  }
}
```

#### refundOrder

```graphql
mutation RefundOrder($input: RefundOrderInputDto!) {
  refundOrder(input: $input) {
    success
    orderId
    refundedAmount
    newStatus
    error
  }
}
```

### 7.2 Queries

#### validateOrderInput

```graphql
query ValidateOrderInput($input: CreateOrderWithItemsInputDto!) {
  validateOrderInput(input: $input) {
    valid
    errors {
      field
      message
      code
    }
  }
}
```

---

## 8. Data Flow

### 8.1 Create Order Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      GraphQL Request                               │
│  mutation createOrderWithItems($input)                             │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                  OrderMutationResolver                             │
│  1. Guards validate auth (WorkspaceAuthGuard, UserAuthGuard)       │
│  2. OrderInputMapper.toCreateOrderInput(dto)                       │
│  3. Call OrderOrchestrationService.createOrderWithItems()          │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│               OrderOrchestrationService                            │
│  1. OrderValidationService.validateCreateOrderInput()              │
│  2. CreateOrderSaga.execute(workspaceId, input)                    │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    CreateOrderSaga                                 │
│  Transaction: BEGIN                                                │
│  ├─ Step 1: CreateOrderStep.execute()                              │
│  │   └─ SAVEPOINT sp_create_order                                  │
│  ├─ Step 2: CreateSnapshotsStep.execute()                          │
│  │   └─ SAVEPOINT sp_create_snapshots                              │
│  ├─ Step 3: CreateOrderItemsStep.execute()                         │
│  │   └─ SAVEPOINT sp_create_order_items                            │
│  ├─ Step 4: CalculatePromotionStep.execute()                       │
│  │   └─ SAVEPOINT sp_calculate_promotion                           │
│  ├─ Step 5: CreateLicensesStep.execute()                           │
│  │   └─ SAVEPOINT sp_create_licenses                               │
│  ├─ Step 6: CreatePaymentStep.execute()                            │
│  │   └─ SAVEPOINT sp_create_payment                                │
│  └─ Step 7: FinalizeOrderStep.execute()                            │
│      └─ SAVEPOINT sp_finalize_order                                │
│  Transaction: COMMIT                                               │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Event Emission                                  │
│  EventEmitter.emit(ORDER_CREATED, {                                │
│    orderId, workspaceId, orderData, timestamp                      │
│  })                                                                │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                MktOrderCustomEventListener                         │
│  - Create order history                                            │
│  - Send email notification                                         │
│  - Update analytics                                                │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Promotion Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                  CalculatePromotionStep                            │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│            OrderPromotionIntegrationService                        │
│  1. buildEvaluationContext(orderItems, subtotal, couponCode)       │
│  2. calculateDiscount(context)                                     │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              PromotionApplicationService                           │
│  1. Find eligible auto-apply promotions                            │
│  2. Validate coupon if provided                                    │
│  3. Apply promotions (respecting priority, stacking rules)         │
│  4. Calculate total discount                                       │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Update Order                                     │
│  - couponCode                                                      │
│  - promotionDiscount                                               │
│  - appliedPromotions (JSON snapshots)                              │
│  - totalAmount = originalAmount - promotionDiscount                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Appendix

### A. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ORDER_CODE_PREFIX` | `DEV` | Prefix for order codes |
| `MKT_AUTO_SYNC_ENABLED` | `true` | Auto-sync products on token |
| `MKT_SCHEDULED_SYNC_ENABLED` | `true` | Enable cron sync |
| `MKT_SCHEDULED_SYNC_CRON` | `0 */30 * * * *` | Sync cron schedule |

### B. Related Modules

| Module | Purpose |
|--------|---------|
| `MktProductIntegrationModule` | Product/Package data from MKT Server |
| `MktLicenseIntegrationModule` | License management via MKT Server |
| `MktPromotionModule` | Promotion and coupon management |
| `MktPaymentModule` | Payment processing |
| `MktInvoiceModule` | Invoice generation |
| `MktContractModule` | Contract management |
| `CustomerModule` | Customer management |

---

**Document Version:** 1.0
**Created:** 2025-12-20
**Author:** Claude Code
**Status:** Active
