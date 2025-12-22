# Order Module - Workflow Best Practices & Implementation Guide

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc hiện tại](#2-kiến-trúc-hiện-tại)
3. [Vấn đề cần cải thiện](#3-vấn-đề-cần-cải-thiện)
4. [Kiến trúc đề xuất](#4-kiến-trúc-đề-xuất)
5. [Best Practice Workflow](#5-best-practice-workflow)
6. [Resolver Refactoring](#6-resolver-refactoring)
7. [Tích hợp Module](#7-tích-hợp-module)
8. [Dependency Matrix](#8-dependency-matrix)
9. [Saga Failure Handling & Rollback](#9-saga-failure-handling--rollback)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Tổng quan

### 1.1 Mục đích tài liệu

Tài liệu này hướng dẫn việc cải thiện Order module theo best practices, bao gồm:
- Refactor resolver để loại bỏ code duplication
- Tích hợp với License Integration, Product Integration, Promotion modules
- Chuẩn hóa error handling và audit trail
- Tối ưu hóa workflow tạo và xác nhận đơn hàng

### 1.2 Phạm vi

| Module | Tích hợp |
|--------|----------|
| `mkt-order` | Core module cần refactor |
| `mkt-product-integration` | Lấy product/package từ MKT Server, tạo snapshots |
| `mkt-license-integration` | Tạo và quản lý licenses từ MKT Server |
| `mkt-promotion` | Tính toán và áp dụng khuyến mãi |
| `mkt-payment` | Xử lý thanh toán |

---

## 2. Kiến trúc hiện tại

### 2.1 Cấu trúc thư mục

```
mkt-core/order/
├── objects/                    # WorkspaceEntity definitions (5 files)
├── dto/                        # GraphQL Input/Output types (4 files)
├── resolvers/                  # GraphQL mutations (3 files)
│   ├── order-mutation.resolver.ts      # 234 lines
│   └── order-item-mutation.resolver.ts
├── repositories/               # Data access layer (2 files)
├── services/
│   ├── application/            # Facade layer
│   │   └── order-orchestration.service.ts  # 333 lines
│   ├── core/                   # Core services
│   │   ├── order-validation.service.ts
│   │   ├── order-calculation.service.ts
│   │   ├── order-status.service.ts
│   │   └── order-event.service.ts
│   ├── domain/                 # Domain services
│   │   ├── order-crud.service.ts
│   │   ├── order-item.service.ts
│   │   └── order-license-query.service.ts
│   └── legacy/                 # Legacy services (backward compatibility)
├── orchestration/
│   ├── saga/                   # Saga executors (4 sagas)
│   └── steps/                  # Step implementations (5 steps)
├── states/                     # State machine (10 states)
├── constants/                  # Status, actions, configuration
├── types/                      # TypeScript types
├── listeners/                  # Event handlers
└── mkt-order.module.ts         # Module definition
```

### 2.2 Data Flow hiện tại

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GraphQL Request                                       │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  OrderMutationResolver                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  - Guards: WorkspaceAuthGuard, UserAuthGuard                    │   │
│  │  - Input transformation (DTO → Domain type)                     │   │
│  │  - Delegates to OrderOrchestrationService                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               OrderOrchestrationService (Facade)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  1. Validate input (OrderValidationService)                     │   │
│  │  2. Execute saga (CreateOrderSaga, ConfirmOrderSaga, etc.)      │   │
│  │  3. Handle errors                                               │   │
│  │  4. Return response                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CreateOrderSaga                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Step 1: CreateOrderStep        → Tạo order entity              │   │
│  │  Step 2: CreateOrderItemsStep   → Tạo order items               │   │
│  │  Step 3: CreateLicensesStep     → Tạo licenses                  │   │
│  │  Step 4: CreatePaymentStep      → Tạo payment schedule          │   │
│  │  Step 5: FinalizeOrderStep      → Finalize và emit events       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Vấn đề cần cải thiện

### 3.1 Code Duplication trong Resolver

**Vấn đề:** Input mapping được lặp lại ở 2 nơi

```typescript
// createOrderWithItems() - lines 64-91
{
  customerId: input.customerId,
  name: input.name,
  currency: input.currency,
  // ... 15+ fields mapping
}

// validateOrderInput() - lines 127-154
{
  customerId: input.customerId,
  name: input.name,
  currency: input.currency,
  // ... Same 15+ fields mapping (DUPLICATED!)
}
```

**Giải pháp:** Tạo mapper utility

### 3.2 Thiếu workspaceMemberId trong các mutations

**Vấn đề:** Chỉ `createOrderWithItems` có workspaceMemberId, các mutations khác không có

```typescript
// createOrderWithItems - CÓ workspaceMemberId ✓
async createOrderWithItems(
  @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ...
)

// confirmOrder - THIẾU workspaceMemberId ✗
async confirmOrder(
  @AuthWorkspace() workspace: Workspace,
  @Args('input') input: ConfirmOrderInputDto,
)

// updateOrderStatus - THIẾU workspaceMemberId ✗
// refundOrder - THIẾU workspaceMemberId ✗
```

**Giải pháp:** Thêm workspaceMemberId cho tất cả mutations để audit trail

### 3.3 Business Logic trong Resolver

**Vấn đề:** `mapActionToStatus` là business logic nhưng nằm trong resolver

```typescript
// Trong OrderMutationResolver - KHÔNG NÊN
private mapActionToStatus(action: ORDER_ACTION): ORDER_STATUS {
  const actionToStatusMap: Partial<Record<ORDER_ACTION, ORDER_STATUS>> = {
    [ORDER_ACTION.DRAFT]: ORDER_STATUS.DRAFT,
    [ORDER_ACTION.CONFIRMED]: ORDER_STATUS.CONFIRMED,
    // ... 20+ mappings
  };
  return actionToStatusMap[action] ?? ORDER_STATUS.DRAFT;
}
```

**Giải pháp:** Di chuyển vào OrderStatusService hoặc State Machine

### 3.4 Thiếu tích hợp Promotion

**Vấn đề:** Theo design docs, Promotion cần được tích hợp vào order flow

```
Current Flow:
CreateOrder → CreateItems → CreateLicenses → CreatePayment → Finalize

Expected Flow:
CreateOrder → CreateItems → CalculatePromotion → ApplyDiscount →
CreateLicenses → CreatePayment → RecordPromotionUsage → Finalize
```

### 3.5 Thiếu Product/Package Snapshots

**Vấn đề:** Không tạo snapshots bất biến tại thời điểm đặt hàng

```typescript
// Current: Chỉ lưu productId, packageId
// Expected: Lưu full snapshot với checksum để đảm bảo immutability
type OrderItemWithSnapshot = {
  productSnapshot: MktProductSnapshot;   // Immutable
  packageSnapshot: MktPackageSnapshot;   // Immutable
  capturedAt: string;                    // Timestamp
  checksum: string;                      // SHA-256
};
```

---

## 4. Kiến trúc đề xuất

### 4.1 Clean Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (Resolvers)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Responsibilities:                                              │   │
│  │  - Authentication & Authorization (Guards)                      │   │
│  │  - GraphQL input validation (class-validator)                   │   │
│  │  - Input transformation (DTO → Domain Input via Mapper)         │   │
│  │  - Response transformation (Domain Output → DTO)                │   │
│  │  - NO business logic                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER (Orchestration)                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Responsibilities:                                              │   │
│  │  - Use case orchestration                                       │   │
│  │  - Transaction boundary management                              │   │
│  │  - Cross-cutting concerns (logging, metrics, audit)             │   │
│  │  - Error handling & transformation                              │   │
│  │  - Saga coordination                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DOMAIN LAYER (Services)                            │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │
│  │  Validation    │ │  Calculation   │ │    Status      │              │
│  │  Service       │ │  Service       │ │   Service      │              │
│  │  ─────────     │ │  ─────────     │ │  ─────────     │              │
│  │  - Input       │ │  - Pricing     │ │  - Transitions │              │
│  │  - Business    │ │  - Tax         │ │  - Actions     │              │
│  │    rules       │ │  - Discounts   │ │  - State       │              │
│  └────────────────┘ └────────────────┘ └────────────────┘              │
│                                                                          │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │
│  │   Snapshot     │ │    Event       │ │    CRUD        │              │
│  │   Service      │ │   Service      │ │   Service      │              │
│  │  ─────────     │ │  ─────────     │ │  ─────────     │              │
│  │  - Product     │ │  - Emit        │ │  - Create      │              │
│  │  - Package     │ │  - Subscribe   │ │  - Update      │              │
│  │  - Verify      │ │                │ │  - Delete      │              │
│  └────────────────┘ └────────────────┘ └────────────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER (Integrations)                    │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │
│  │    Product     │ │    License     │ │   Promotion    │              │
│  │  Integration   │ │  Integration   │ │   Service      │              │
│  │  ───────────   │ │  ───────────   │ │  ───────────   │              │
│  │  - Fetch       │ │  - Create      │ │  - Calculate   │              │
│  │  - Cache       │ │  - Activate    │ │  - Apply       │              │
│  │  - Snapshot    │ │  - Revoke      │ │  - Record      │              │
│  │  - Validate    │ │  - Validate    │ │  - Validate    │              │
│  └────────────────┘ └────────────────┘ └────────────────┘              │
│                                                                          │
│  ┌────────────────┐ ┌────────────────┐                                  │
│  │    Payment     │ │     Cache      │                                  │
│  │  Integration   │ │   Service      │                                  │
│  │  ───────────   │ │  ───────────   │                                  │
│  │  - Schedule    │ │  - Redis       │                                  │
│  │  - Process     │ │  - TTL         │                                  │
│  │  - Refund      │ │  - Invalidate  │                                  │
│  └────────────────┘ └────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     DATA LAYER (Repositories)                            │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │
│  │     Order      │ │   OrderItem    │ │    History     │              │
│  │  Repository    │ │  Repository    │ │  Repository    │              │
│  └────────────────┘ └────────────────┘ └────────────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Cấu trúc thư mục đề xuất

```
mkt-core/order/
├── constants/
│   ├── index.ts
│   ├── order-status.constants.ts
│   ├── order-action.constants.ts
│   └── order-field-ids.ts
│
├── dto/
│   ├── index.ts
│   ├── inputs/
│   │   ├── create-order.input.ts
│   │   ├── confirm-order.input.ts
│   │   ├── update-order-status.input.ts
│   │   └── refund-order.input.ts
│   └── outputs/
│       ├── order-response.output.ts
│       └── validation-result.output.ts
│
├── mappers/                        # NEW - Input/Output mappers
│   ├── index.ts
│   ├── order-input.mapper.ts       # DTO → Domain Input
│   └── order-output.mapper.ts      # Domain Output → DTO
│
├── objects/
│   ├── mkt-order.workspace-entity.ts
│   ├── mkt-order-item.workspace-entity.ts
│   ├── mkt-order-history.workspace-entity.ts
│   ├── mkt-contract.workspace-entity.ts
│   └── mkt-template.workspace-entity.ts
│
├── repositories/
│   ├── index.ts
│   ├── mkt-order.repository.ts
│   └── mkt-order-item.repository.ts
│
├── resolvers/
│   ├── index.ts
│   ├── order-mutation.resolver.ts
│   └── order-item-mutation.resolver.ts
│
├── services/
│   ├── index.ts
│   ├── application/
│   │   └── order-orchestration.service.ts
│   ├── core/
│   │   ├── order-validation.service.ts
│   │   ├── order-calculation.service.ts
│   │   ├── order-status.service.ts      # + mapActionToStatus
│   │   └── order-event.service.ts
│   ├── domain/
│   │   ├── order-crud.service.ts
│   │   ├── order-item.service.ts
│   │   ├── order-license-query.service.ts
│   │   └── order-snapshot.service.ts    # NEW - Snapshot creation
│   └── integration/                      # NEW - External integrations
│       ├── order-product.integration.ts
│       ├── order-license.integration.ts
│       └── order-promotion.integration.ts
│
├── orchestration/
│   ├── saga/
│   │   ├── create-order.saga.ts
│   │   ├── confirm-order.saga.ts
│   │   ├── update-order.saga.ts
│   │   └── refund-order.saga.ts
│   └── steps/
│       ├── create-order.step.ts
│       ├── create-order-items.step.ts
│       ├── create-snapshots.step.ts      # NEW
│       ├── calculate-promotion.step.ts   # NEW
│       ├── create-licenses.step.ts
│       ├── create-payment.step.ts
│       ├── record-promotion-usage.step.ts # NEW
│       └── finalize-order.step.ts
│
├── states/
│   ├── order-state-machine.ts
│   └── states/
│       ├── draft-state.ts
│       ├── trial-state.ts
│       ├── wait-state.ts
│       ├── confirm-state.ts
│       ├── completed-state.ts
│       ├── overdue-state.ts
│       ├── blocked-state.ts
│       ├── refund-state.ts
│       └── refund-partial-state.ts
│
├── types/
│   ├── index.ts
│   ├── order-mutation.types.ts
│   ├── order-service.types.ts
│   ├── order-repository.types.ts
│   └── order-snapshot.types.ts           # NEW
│
├── listeners/
│   ├── mkt-order-custom-event.listener.ts
│   └── license-lifecycle.listener.ts
│
├── message/
│   └── index.ts
│
└── mkt-order.module.ts
```

---

## 5. Best Practice Workflow

### 5.1 Create Order Flow (Enhanced)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CREATE ORDER FLOW                                │
│                    (With All Integrations)                               │
└─────────────────────────────────────────────────────────────────────────┘

                              START
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: INPUT VALIDATION                                                 │
│ ──────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  ┌─ OrderValidationService ─────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  1.1 Validate customer exists                                    │   │
│  │      └─ CustomerRepository.findById(customerId)                  │   │
│  │                                                                   │   │
│  │  1.2 Validate internal variants (if any)                         │   │
│  │      └─ VariantRepository.findByIds(variantIds)                  │   │
│  │                                                                   │   │
│  │  1.3 Validate external products/packages (if any)                │   │
│  │      └─ MktProductProxyService.validateForOrder(items)           │   │
│  │      └─ Check: product exists, status in ['active', 'beta']      │   │
│  │      └─ Check: package exists, isActive = true                   │   │
│  │                                                                   │   │
│  │  1.4 Validate payment methods                                    │   │
│  │      └─ PaymentMethodRepository.findByIds(methodIds)             │   │
│  │                                                                   │   │
│  │  1.5 Validate coupon code (if provided)                          │   │
│  │      └─ PromotionValidationService.validateCoupon(code)          │   │
│  │                                                                   │   │
│  │  Return: { valid: boolean, errors: ValidationError[] }           │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  If !valid → Return error response                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: CREATE SNAPSHOTS                                                 │
│ ──────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  ┌─ OrderSnapshotService ───────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  2.1 Fetch products from MKT Server (via cache)                  │   │
│  │      └─ MktProductProxyService.getProduct(productId)             │   │
│  │                                                                   │   │
│  │  2.2 Fetch packages from MKT Server (via cache)                  │   │
│  │      └─ MktProductProxyService.getPackage(packageId)             │   │
│  │                                                                   │   │
│  │  2.3 Create product snapshots                                    │   │
│  │      └─ MktSnapshotService.createProductSnapshot(product, lang)  │   │
│  │      └─ Contains: id, code, name, price, capturedAt, checksum    │   │
│  │                                                                   │   │
│  │  2.4 Create package snapshots                                    │   │
│  │      └─ MktSnapshotService.createPackageSnapshot(package)        │   │
│  │      └─ Contains: id, code, name, price, duration, checksum      │   │
│  │                                                                   │   │
│  │  Return: Map<productId, { productSnapshot, packageSnapshot }>    │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: CALCULATE PRICING & PROMOTION                                    │
│ ──────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  ┌─ OrderCalculationService + PromotionCalculationService ──────────┐   │
│  │                                                                   │   │
│  │  3.1 Calculate item prices from snapshots                        │   │
│  │      └─ For each item: price = snapshot.price * quantity         │   │
│  │                                                                   │   │
│  │  3.2 Calculate subtotal                                          │   │
│  │      └─ subtotal = sum(item.totalPrice)                          │   │
│  │                                                                   │   │
│  │  3.3 Build promotion evaluation context                          │   │
│  │      └─ { customerId, orderSubtotal, orderItems, couponCode }    │   │
│  │                                                                   │   │
│  │  3.4 Get applicable promotions                                   │   │
│  │      └─ PromotionCalculationService.calculateOrderDiscount()     │   │
│  │      └─ Auto-apply promotions (isAutoApply = true)               │   │
│  │      └─ Coupon promotions (if couponCode provided)               │   │
│  │                                                                   │   │
│  │  3.5 Calculate discounts                                         │   │
│  │      └─ Apply promotions by priority                             │   │
│  │      └─ Respect stackable flag                                   │   │
│  │      └─ Apply maxDiscountAmount limits                           │   │
│  │                                                                   │   │
│  │  3.6 Calculate final totals                                      │   │
│  │      └─ discount = sum(promotion.discountAmount)                 │   │
│  │      └─ tax = calculateTax(subtotal - discount)                  │   │
│  │      └─ total = subtotal - discount + tax                        │   │
│  │                                                                   │   │
│  │  Return: {                                                        │   │
│  │    subtotal, discount, tax, total,                               │   │
│  │    appliedPromotions: [{ promotionId, discountAmount, ... }]     │   │
│  │  }                                                                │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: EXECUTE CREATE ORDER SAGA                                        │
│ ──────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  ┌─ CreateOrderSaga ────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  4.1 CreateOrderStep                                             │   │
│  │      └─ Create MktOrder entity                                   │   │
│  │      └─ Set status based on action (DRAFT, TRIAL, WAIT)          │   │
│  │      └─ Store appliedPromotions in metadata                      │   │
│  │      └─ Compensation: Delete order                               │   │
│  │                                                                   │   │
│  │  4.2 CreateOrderItemsStep                                        │   │
│  │      └─ Create MktOrderItem entities                             │   │
│  │      └─ Attach productSnapshot, packageSnapshot                  │   │
│  │      └─ Calculate itemDiscount from promotions                   │   │
│  │      └─ Compensation: Delete order items                         │   │
│  │                                                                   │   │
│  │  4.3 CreateLicensesStep                                          │   │
│  │      └─ MktLicenseProxyService.create() for each item            │   │
│  │      └─ Status: pending (activate after payment)                 │   │
│  │      └─ Store licenseId in orderItem                             │   │
│  │      └─ Compensation: Delete licenses from MKT Server            │   │
│  │                                                                   │   │
│  │  4.4 CreatePaymentStep                                           │   │
│  │      └─ Create payment schedule                                  │   │
│  │      └─ Calculate due dates                                      │   │
│  │      └─ Compensation: Delete payment records                     │   │
│  │                                                                   │   │
│  │  4.5 RecordPromotionUsageStep (NEW)                              │   │
│  │      └─ Create MktPromotionUsage records                         │   │
│  │      └─ Increment promotion.currentUsageCount                    │   │
│  │      └─ Increment coupon.currentUsageCount (if used)             │   │
│  │      └─ Compensation: Decrement usage counts                     │   │
│  │                                                                   │   │
│  │  4.6 FinalizeOrderStep                                           │   │
│  │      └─ Update order status if needed                            │   │
│  │      └─ Create order history record                              │   │
│  │      └─ Emit ORDER_CREATED event                                 │   │
│  │                                                                   │   │
│  │  On Error: Execute compensation for all completed steps          │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 5: POST-PROCESSING (Events)                                         │
│ ──────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  ┌─ Event Listeners ────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  5.1 MktOrderCustomEventListener                                 │   │
│  │      └─ Send order confirmation email                            │   │
│  │      └─ Notify sales team                                        │   │
│  │                                                                   │   │
│  │  5.2 PromotionOrderEventListener                                 │   │
│  │      └─ Invalidate promotion cache if usage limit reached        │   │
│  │      └─ Emit PromotionAppliedToOrderEvent                        │   │
│  │                                                                   │   │
│  │  5.3 LicenseLifecycleListener                                    │   │
│  │      └─ Log license creation                                     │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                              END
```

### 5.2 Confirm Order Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONFIRM ORDER FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

                              START
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: VALIDATE TRANSITION                                              │
│ ──────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  1.1 Find order by ID                                                   │
│  1.2 Check current status allows transition                             │
│  1.3 Validate action is valid for current state                         │
│                                                                          │
│  ┌─ OrderStateMachine ──────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  currentState = OrderStateMachine.getState(order.status)         │   │
│  │  canTransition = currentState.canTransitionTo(targetStatus)      │   │
│  │  action = currentState.getAction(context, input)                 │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: EXECUTE STATE TRANSITION                                         │
│ ──────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  Based on ACTION:                                                        │
│                                                                          │
│  ┌─ PAID/CONFIRMED ─────────────────────────────────────────────────┐   │
│  │  - Activate licenses (MktLicenseProxyService.activate)           │   │
│  │  - Update payment status                                         │   │
│  │  - Emit ORDER_CONFIRMED event                                    │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─ COMPLETED ──────────────────────────────────────────────────────┐   │
│  │  - Verify all licenses activated                                 │   │
│  │  - Verify all payments received                                  │   │
│  │  - Create invoice (if required)                                  │   │
│  │  - Emit ORDER_COMPLETED event                                    │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─ REFUND/REFUND_PARTIAL ──────────────────────────────────────────┐   │
│  │  - Revoke licenses (MktLicenseProxyService.revoke)               │   │
│  │  - Process refund                                                │   │
│  │  - Rollback promotion usage                                      │   │
│  │  - Emit ORDER_REFUNDED event                                     │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─ BLOCKED/CANCELLED ──────────────────────────────────────────────┐   │
│  │  - Revoke licenses                                               │   │
│  │  - Mark order as blocked/cancelled                               │   │
│  │  - Rollback promotion usage                                      │   │
│  │  - Emit appropriate event                                        │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: UPDATE ORDER & CREATE HISTORY                                    │
│ ──────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  3.1 Update order status                                                │
│  3.2 Create MktOrderHistory record                                      │
│  3.3 Update timestamps                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                              END
```

---

## 6. Resolver Refactoring

### 6.1 Input Mapper Utility

**File:** `order/mappers/order-input.mapper.ts`

```typescript
import {
  CreateOrderWithItemsInputDto,
  ConfirmOrderInputDto,
  UpdateOrderStatusInputDto,
  RefundOrderInputDto,
} from '../dto/inputs';
import {
  CreateOrderWithItemsInput,
  ConfirmOrderInput,
  UpdateOrderStatusInput,
  RefundOrderInput,
} from '../types';

/**
 * OrderInputMapper - Transforms GraphQL DTOs to domain types
 *
 * Single source of truth for input transformations.
 * Eliminates duplication between resolver methods.
 */
export const OrderInputMapper = {
  /**
   * Map CreateOrderWithItemsInputDto to CreateOrderWithItemsInput
   */
  toCreateOrderInput(dto: CreateOrderWithItemsInputDto): CreateOrderWithItemsInput {
    return {
      customerId: dto.customerId,
      name: dto.name,
      currency: dto.currency,
      note: dto.note,
      requireContract: dto.requireContract,
      discountPercent: dto.discountPercent,
      variants: dto.variants?.map((v) => ({
        variantId: v.variantId,
        quantity: v.quantity,
      })),
      externalProducts: dto.externalProducts?.map((p) => ({
        productId: p.productId,
        packageId: p.packageId,
        quantity: p.quantity,
      })),
      orderLanguage: dto.orderLanguage as 'vi' | 'en' | 'ko' | undefined,
      paymentMethods: dto.paymentMethods?.map((p) => ({
        paymentMethodId: p.paymentMethodId,
        name: p.name,
        duration: p.duration,
        amount: p.amount,
      })),
      action: dto.action,
      licenseId: dto.licenseId,
      trialOrderId: dto.trialOrderId,
      // Promotion fields (NEW)
      couponCode: dto.couponCode,
      applyAutoPromotions: dto.applyAutoPromotions ?? true,
    };
  },

  /**
   * Map ConfirmOrderInputDto to ConfirmOrderInput
   */
  toConfirmOrderInput(dto: ConfirmOrderInputDto): ConfirmOrderInput {
    return {
      orderId: dto.orderId,
      action: dto.action,
      accountingConfirmed: dto.accountingConfirmed,
      note: dto.note,
    };
  },

  /**
   * Map UpdateOrderStatusInputDto to UpdateOrderStatusInput
   */
  toUpdateOrderStatusInput(dto: UpdateOrderStatusInputDto): UpdateOrderStatusInput {
    return {
      orderId: dto.orderId,
      action: dto.action,
      note: dto.note,
    };
  },

  /**
   * Map RefundOrderInputDto to RefundOrderInput
   */
  toRefundOrderInput(dto: RefundOrderInputDto): RefundOrderInput {
    return {
      orderId: dto.orderId,
      licenseIds: dto.licenseIds,
      refundAmount: dto.refundAmount,
      reason: dto.reason,
      isPartial: dto.isPartial,
    };
  },
} as const;
```

### 6.2 Refactored Resolver

**File:** `order/resolvers/order-mutation.resolver.ts`

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

import {
  ConfirmOrderInputDto,
  CreateOrderWithItemsInputDto,
  UpdateOrderStatusInputDto,
  RefundOrderInputDto,
} from '../dto/inputs';
import {
  ConfirmOrderResponseDto,
  CreateOrderResponseDto,
  RefundOrderResponseDto,
  UpdateOrderStatusResponseDto,
  ValidationResultDto,
} from '../dto/outputs';
import { OrderInputMapper } from '../mappers/order-input.mapper';
import { OrderOrchestrationService } from '../services/application';

/**
 * OrderMutationResolver - GraphQL resolver for order mutations
 *
 * Responsibilities:
 * - Authentication & Authorization (Guards)
 * - Input transformation (DTO → Domain via Mapper)
 * - Delegation to OrderOrchestrationService
 *
 * NO business logic in this layer.
 */
@Resolver()
export class OrderMutationResolver {
  constructor(
    private readonly orderOrchestrationService: OrderOrchestrationService,
  ) {}

  /**
   * Create a new order with items using the saga pattern
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => CreateOrderResponseDto, {
    description: 'Create a new order with items, licenses, and payment',
  })
  async createOrderWithItems(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: CreateOrderWithItemsInputDto,
  ): Promise<CreateOrderResponseDto> {
    const domainInput = OrderInputMapper.toCreateOrderInput(input);

    return this.orderOrchestrationService.createOrderWithItems(
      workspace.id,
      workspaceMemberId,
      domainInput,
    );
  }

  /**
   * Confirm an order (change status)
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => ConfirmOrderResponseDto, {
    description: 'Confirm or update order status',
  })
  async confirmOrder(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined, // ADDED
    @Args('input') input: ConfirmOrderInputDto,
  ): Promise<ConfirmOrderResponseDto> {
    const domainInput = OrderInputMapper.toConfirmOrderInput(input);

    return this.orderOrchestrationService.confirmOrder(
      workspace.id,
      workspaceMemberId, // ADDED for audit trail
      domainInput,
    );
  }

  /**
   * Update order status using state machine validation
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => UpdateOrderStatusResponseDto, {
    description: 'Update order status with state machine validation',
  })
  async updateOrderStatus(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined, // ADDED
    @Args('input') input: UpdateOrderStatusInputDto,
  ): Promise<UpdateOrderStatusResponseDto> {
    const domainInput = OrderInputMapper.toUpdateOrderStatusInput(input);

    // mapActionToStatus is now in OrderOrchestrationService
    return this.orderOrchestrationService.updateOrderStatus(
      workspace.id,
      workspaceMemberId, // ADDED for audit trail
      domainInput,
    );
  }

  /**
   * Refund an order (full or partial)
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => RefundOrderResponseDto, {
    description: 'Refund an order (full or partial)',
  })
  async refundOrder(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined, // ADDED
    @Args('input') input: RefundOrderInputDto,
  ): Promise<RefundOrderResponseDto> {
    const domainInput = OrderInputMapper.toRefundOrderInput(input);

    return this.orderOrchestrationService.refundOrder(
      workspace.id,
      workspaceMemberId, // ADDED for audit trail
      domainInput,
    );
  }

  /**
   * Validate order input before creation
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => ValidationResultDto, {
    description: 'Validate order input before creation',
  })
  async validateOrderInput(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CreateOrderWithItemsInputDto,
  ): Promise<ValidationResultDto> {
    // Use same mapper - NO DUPLICATION
    const domainInput = OrderInputMapper.toCreateOrderInput(input);

    const result =
      await this.orderOrchestrationService.validateCreateOrderInput(
        workspace.id,
        domainInput,
      );

    return {
      valid: result.valid,
      errors: result.errors.map((e) => ({
        field: e.field,
        message: e.message,
        code: e.code,
      })),
    };
  }
}
```

### 6.3 Move mapActionToStatus to OrderStatusService

**File:** `order/services/core/order-status.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ORDER_ACTION, ORDER_STATUS } from '../../constants';

@Injectable()
export class OrderStatusService {
  /**
   * Action to Status mapping
   * Centralized business logic for status transitions
   */
  private readonly actionToStatusMap: Partial<Record<ORDER_ACTION, ORDER_STATUS>> = {
    [ORDER_ACTION.DRAFT]: ORDER_STATUS.DRAFT,
    [ORDER_ACTION.CONFIRMED]: ORDER_STATUS.CONFIRMED,
    [ORDER_ACTION.COMPLETED]: ORDER_STATUS.COMPLETED,
    [ORDER_ACTION.LOCKED]: ORDER_STATUS.BLOCKED,
    [ORDER_ACTION.CANCELLED]: ORDER_STATUS.REFUSE,
    [ORDER_ACTION.OVERDUE]: ORDER_STATUS.OVERDUE,
    [ORDER_ACTION.REFUND]: ORDER_STATUS.REFUND,
    [ORDER_ACTION.REFUND_PARTIAL]: ORDER_STATUS.REFUND_PARTIAL,
    [ORDER_ACTION.TRIAL]: ORDER_STATUS.TRIAL,
    [ORDER_ACTION.TRIAL_TO_PAID]: ORDER_STATUS.WAIT,
    [ORDER_ACTION.LICENSE_RENEWING]: ORDER_STATUS.WAIT,
    [ORDER_ACTION.SINVOICE]: ORDER_STATUS.COMPLETED,
    [ORDER_ACTION.WAIT]: ORDER_STATUS.WAIT,
    [ORDER_ACTION.REFUSE]: ORDER_STATUS.REFUSE,
    [ORDER_ACTION.PAID]: ORDER_STATUS.CONFIRMED,
    [ORDER_ACTION.PROCESSING]: ORDER_STATUS.WAIT,
    [ORDER_ACTION.FREE]: ORDER_STATUS.COMPLETED,
    [ORDER_ACTION.LICENSE]: ORDER_STATUS.COMPLETED,
    [ORDER_ACTION.TRIAL_TO_CONFIRMED]: ORDER_STATUS.CONFIRMED,
    [ORDER_ACTION.CHANGE_VARIANT]: ORDER_STATUS.WAIT,
  };

  /**
   * Map ORDER_ACTION to ORDER_STATUS
   */
  mapActionToStatus(action: ORDER_ACTION): ORDER_STATUS {
    return this.actionToStatusMap[action] ?? ORDER_STATUS.DRAFT;
  }

  /**
   * Get valid actions for a given status
   */
  getValidActionsForStatus(status: ORDER_STATUS): ORDER_ACTION[] {
    // Implementation based on state machine
    // ...
  }

  /**
   * Check if transition is valid
   */
  isValidTransition(
    currentStatus: ORDER_STATUS,
    action: ORDER_ACTION,
  ): boolean {
    const targetStatus = this.mapActionToStatus(action);
    // Use state machine to validate
    // ...
    return true;
  }
}
```

---

## 7. Tích hợp Module

### 7.1 Product Integration

**Service:** `order/services/integration/order-product.integration.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import { MktSnapshotService } from 'src/mkt-core/mkt-product-integration/services';
import {
  MktProductSnapshot,
  MktPackageSnapshot,
} from 'src/mkt-core/mkt-product-integration/types';

@Injectable()
export class OrderProductIntegrationService {
  private readonly logger = new Logger(OrderProductIntegrationService.name);

  constructor(
    private readonly productProxyService: MktProductProxyService,
    private readonly snapshotService: MktSnapshotService,
  ) {}

  /**
   * Validate external products for order
   */
  async validateProducts(
    items: Array<{ productId: string; packageId?: string }>,
  ): Promise<{ valid: boolean; errors: Array<{ productId: string; reason: string }> }> {
    return this.productProxyService.validateForOrder(items);
  }

  /**
   * Create snapshots for order items
   */
  async createSnapshots(
    items: Array<{ productId: string; packageId?: string }>,
    language: 'vi' | 'en' | 'ko' = 'vi',
  ): Promise<Map<string, { productSnapshot: MktProductSnapshot; packageSnapshot?: MktPackageSnapshot }>> {
    const snapshots = new Map();

    for (const item of items) {
      const product = await this.productProxyService.getProduct(item.productId);

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const productSnapshot = this.snapshotService.createProductSnapshot(product, language);

      let packageSnapshot: MktPackageSnapshot | undefined;

      if (item.packageId) {
        const pkg = await this.productProxyService.getPackage(item.packageId, item.productId);

        if (pkg) {
          packageSnapshot = this.snapshotService.createPackageSnapshot(pkg);
        }
      }

      snapshots.set(item.productId, { productSnapshot, packageSnapshot });
    }

    return snapshots;
  }

  /**
   * Verify snapshot integrity
   */
  verifySnapshot(snapshot: MktProductSnapshot): boolean {
    return this.snapshotService.verifyProductSnapshot(snapshot);
  }
}
```

### 7.2 License Integration

**Service:** `order/services/integration/order-license.integration.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services';

@Injectable()
export class OrderLicenseIntegrationService {
  private readonly logger = new Logger(OrderLicenseIntegrationService.name);

  constructor(
    private readonly licenseProxyService: MktLicenseProxyService,
  ) {}

  /**
   * Create pending licenses for order items
   */
  async createLicenses(
    items: Array<{
      productPackageId: string;
      productId: string;
      userId: string;
      maxDevices?: number;
    }>,
  ): Promise<Array<{ itemIndex: number; licenseId: string; licenseKey: string }>> {
    const results: Array<{ itemIndex: number; licenseId: string; licenseKey: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const license = await this.licenseProxyService.create({
        productPackageId: item.productPackageId,
        productId: item.productId,
        userId: item.userId,
        maxDevices: item.maxDevices ?? 1,
      });

      results.push({
        itemIndex: i,
        licenseId: license.id,
        licenseKey: license.licenseKey,
      });
    }

    return results;
  }

  /**
   * Activate licenses after payment confirmed
   */
  async activateLicenses(licenseIds: string[]): Promise<void> {
    for (const licenseId of licenseIds) {
      await this.licenseProxyService.activate(licenseId);
    }
  }

  /**
   * Revoke licenses on refund/cancellation
   */
  async revokeLicenses(licenseIds: string[]): Promise<void> {
    for (const licenseId of licenseIds) {
      await this.licenseProxyService.revoke(licenseId);
    }
  }
}
```

### 7.3 Promotion Integration

**Service:** `order/services/integration/order-promotion.integration.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PromotionApplicationService } from 'src/mkt-core/mkt-promotion/services/application';
import { PromotionCalculationService } from 'src/mkt-core/mkt-promotion/services/domain';
import {
  PromotionEvaluationContext,
  AppliedPromotionsResult,
  AppliedPromotion,
} from 'src/mkt-core/mkt-promotion/types';

@Injectable()
export class OrderPromotionIntegrationService {
  private readonly logger = new Logger(OrderPromotionIntegrationService.name);

  constructor(
    private readonly promotionAppService: PromotionApplicationService,
    private readonly promotionCalcService: PromotionCalculationService,
  ) {}

  /**
   * Calculate discounts for order
   */
  async calculateDiscount(
    workspaceId: string,
    context: PromotionEvaluationContext,
  ): Promise<AppliedPromotionsResult> {
    return this.promotionCalcService.calculateOrderDiscount(workspaceId, context);
  }

  /**
   * Build evaluation context from order data
   */
  buildEvaluationContext(
    customerId: string,
    orderItems: Array<{
      productId: string;
      variantId?: string;
      categoryId?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>,
    orderSubtotal: number,
    couponCode?: string,
    customerTags?: string[],
    isFirstOrder?: boolean,
  ): PromotionEvaluationContext {
    return {
      workspaceId: '', // Will be set by caller
      customerId,
      orderItems: orderItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        categoryId: item.categoryId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      orderSubtotal,
      couponCode,
      customerTags,
      isFirstOrder,
    };
  }

  /**
   * Record promotion usage after order confirmed
   */
  async recordUsage(
    workspaceId: string,
    orderId: string,
    customerId: string,
    appliedPromotions: AppliedPromotion[],
    originalAmount: number,
  ): Promise<void> {
    for (const promo of appliedPromotions) {
      await this.promotionAppService.applyPromotionToOrder(
        workspaceId,
        orderId,
        promo.promotionId,
        promo.couponCode,
      );
    }
  }

  /**
   * Rollback promotion usage on refund/cancellation
   */
  async rollbackUsage(
    workspaceId: string,
    orderId: string,
    promotionIds: string[],
  ): Promise<void> {
    for (const promotionId of promotionIds) {
      await this.promotionAppService.removePromotionFromOrder(
        workspaceId,
        orderId,
        promotionId,
      );
    }
  }
}
```

### 7.4 New Saga Steps

#### CreateSnapshotsStep

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { SagaStep, SagaContext } from '../saga/order-saga.interface';
import { OrderProductIntegrationService } from '../../services/integration';

@Injectable()
export class CreateSnapshotsStep implements SagaStep<void, Map<string, any>> {
  readonly stepName = 'CreateSnapshotsStep';
  private readonly logger = new Logger(CreateSnapshotsStep.name);

  constructor(
    private readonly productIntegration: OrderProductIntegrationService,
  ) {}

  async execute(context: SagaContext): Promise<Map<string, any>> {
    const { input } = context;
    const externalProducts = input.externalProducts ?? [];

    if (externalProducts.length === 0) {
      return new Map();
    }

    this.logger.log(`Creating snapshots for ${externalProducts.length} products`);

    const snapshots = await this.productIntegration.createSnapshots(
      externalProducts.map((p) => ({
        productId: p.productId,
        packageId: p.packageId,
      })),
      input.orderLanguage ?? 'vi',
    );

    // Store in context for later steps
    context.metadata.set('productSnapshots', snapshots);

    return snapshots;
  }

  async compensate(context: SagaContext): Promise<void> {
    // Snapshots are immutable, no compensation needed
    this.logger.log('CreateSnapshotsStep: No compensation needed');
  }

  shouldSkip(context: SagaContext): boolean {
    const externalProducts = context.input.externalProducts ?? [];
    return externalProducts.length === 0;
  }
}
```

#### CalculatePromotionStep

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { SagaStep, SagaContext } from '../saga/order-saga.interface';
import { OrderPromotionIntegrationService } from '../../services/integration';

@Injectable()
export class CalculatePromotionStep implements SagaStep<void, AppliedPromotionsResult> {
  readonly stepName = 'CalculatePromotionStep';
  private readonly logger = new Logger(CalculatePromotionStep.name);

  constructor(
    private readonly promotionIntegration: OrderPromotionIntegrationService,
  ) {}

  async execute(context: SagaContext): Promise<AppliedPromotionsResult> {
    const { workspaceId, input } = context;
    const orderItems = context.metadata.get('calculatedOrderItems') ?? [];

    // Build evaluation context
    const evalContext = this.promotionIntegration.buildEvaluationContext(
      input.customerId,
      orderItems,
      context.metadata.get('subtotal') ?? 0,
      input.couponCode,
      context.metadata.get('customerTags'),
      context.metadata.get('isFirstOrder'),
    );

    evalContext.workspaceId = workspaceId;

    // Calculate discounts
    const result = await this.promotionIntegration.calculateDiscount(
      workspaceId,
      evalContext,
    );

    // Store in context
    context.metadata.set('appliedPromotions', result.promotions);
    context.metadata.set('totalDiscount', result.totalDiscount);
    context.metadata.set('finalOrderAmount', result.finalOrderAmount);

    this.logger.log(
      `Applied ${result.promotions.length} promotions, discount: ${result.totalDiscount}`,
    );

    return result;
  }

  async compensate(context: SagaContext): Promise<void> {
    // No database changes, no compensation needed
    this.logger.log('CalculatePromotionStep: No compensation needed');
  }

  shouldSkip(context: SagaContext): boolean {
    // Skip if applyAutoPromotions is false and no couponCode
    const input = context.input;
    return input.applyAutoPromotions === false && !input.couponCode;
  }
}
```

#### RecordPromotionUsageStep

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { SagaStep, SagaContext } from '../saga/order-saga.interface';
import { OrderPromotionIntegrationService } from '../../services/integration';

@Injectable()
export class RecordPromotionUsageStep implements SagaStep<void, void> {
  readonly stepName = 'RecordPromotionUsageStep';
  private readonly logger = new Logger(RecordPromotionUsageStep.name);

  constructor(
    private readonly promotionIntegration: OrderPromotionIntegrationService,
  ) {}

  async execute(context: SagaContext): Promise<void> {
    const { workspaceId, input } = context;
    const orderId = context.orderData?.orderId;
    const appliedPromotions = context.metadata.get('appliedPromotions') ?? [];

    if (!orderId || appliedPromotions.length === 0) {
      return;
    }

    const originalAmount = context.metadata.get('subtotal') ?? 0;

    await this.promotionIntegration.recordUsage(
      workspaceId,
      orderId,
      input.customerId,
      appliedPromotions,
      originalAmount,
    );

    // Store for rollback
    context.rollbackData.set('recordedPromotionIds', appliedPromotions.map((p) => p.promotionId));

    this.logger.log(`Recorded usage for ${appliedPromotions.length} promotions`);
  }

  async compensate(context: SagaContext): Promise<void> {
    const { workspaceId } = context;
    const orderId = context.orderData?.orderId;
    const promotionIds = context.rollbackData.get('recordedPromotionIds') ?? [];

    if (!orderId || promotionIds.length === 0) {
      return;
    }

    await this.promotionIntegration.rollbackUsage(workspaceId, orderId, promotionIds);

    this.logger.log(`Rolled back usage for ${promotionIds.length} promotions`);
  }

  shouldSkip(context: SagaContext): boolean {
    const appliedPromotions = context.metadata.get('appliedPromotions') ?? [];
    return appliedPromotions.length === 0;
  }
}
```

---

## 8. Dependency Matrix

### 8.1 Tổng quan Dependencies

Order module phụ thuộc vào nhiều module khác. Bảng dưới đây mô tả chi tiết từng dependency để đảm bảo tích hợp thành công.

### 8.2 Internal Dependencies (CRM)

| Module | Service/Repository | Mục đích | SLA | Fallback |
|--------|-------------------|----------|-----|----------|
| **mkt-customer** | `CustomerRepository` | Validate customer exists | Sync | Reject order nếu không tìm thấy |
| **mkt-variant** | `VariantRepository` | Validate internal variants | Sync | Reject order nếu variant không hợp lệ |
| **mkt-payment-method** | `PaymentMethodRepository` | Validate payment methods | Sync | Reject nếu method không active |
| **mkt-invoice** | `InvoiceService` | Tạo invoice khi completed | Async | Queue để retry, không block order |
| **mkt-contract** | `ContractService` | Tạo contract nếu required | Async | Queue để retry |

### 8.3 External Dependencies (MKT Server)

| Module | Service | API Endpoint | Timeout | Retry | Fallback |
|--------|---------|--------------|---------|-------|----------|
| **mkt-product-integration** | `MktProductProxyService` | `GET /api/products/{id}` | 10s | 3x với exponential backoff | Cache (24h TTL) |
| **mkt-product-integration** | `MktProductProxyService` | `GET /api/packages/{id}` | 10s | 3x | Cache (24h TTL) |
| **mkt-license-integration** | `MktLicenseProxyService` | `POST /api/licenses` | 30s | 3x | Fail order, trigger compensation |
| **mkt-license-integration** | `MktLicenseProxyService` | `PUT /api/licenses/{id}/activate` | 15s | 5x | Queue để retry |
| **mkt-license-integration** | `MktLicenseProxyService` | `PUT /api/licenses/{id}/revoke` | 15s | 5x | Queue để retry |

### 8.4 API Contract Versions

| Service | Current Version | Min Supported | Breaking Changes |
|---------|----------------|---------------|------------------|
| MKT Product API | v2.1 | v2.0 | v3.0 sẽ thay đổi response structure |
| MKT License API | v1.5 | v1.0 | Không có planned breaking changes |
| SEPay Webhook | v1.0 | v1.0 | - |
| BIDV QR | v1.0 | v1.0 | - |

### 8.5 Dependency Availability Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY AVAILABILITY MATRIX                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Order Operation     │ Required │ Optional │ Fallback Strategy          │
│  ────────────────────┼──────────┼──────────┼────────────────────────────│
│  Create Order        │ Customer │ Promotion│ Skip promotion if down     │
│                      │ Product  │          │ Use cache for product      │
│                      │ Variant  │          │                            │
│  ────────────────────┼──────────┼──────────┼────────────────────────────│
│  Create Order Items  │ Product  │ Snapshot │ Use cached product data    │
│                      │ Package  │          │                            │
│  ────────────────────┼──────────┼──────────┼────────────────────────────│
│  Create Licenses     │ License  │          │ FAIL - trigger rollback    │
│                      │ API      │          │                            │
│  ────────────────────┼──────────┼──────────┼────────────────────────────│
│  Create Payment      │ Payment  │          │ FAIL - trigger rollback    │
│                      │ Method   │          │                            │
│  ────────────────────┼──────────┼──────────┼────────────────────────────│
│  Record Promotion    │          │ Promotion│ Log warning, continue      │
│                      │          │ Service  │                            │
│  ────────────────────┼──────────┼──────────┼────────────────────────────│
│  Confirm Order       │ Order    │ License  │ Queue license activation   │
│                      │          │ API      │                            │
│  ────────────────────┼──────────┼──────────┼────────────────────────────│
│  Refund Order        │ Order    │ License  │ Queue license revocation   │
│                      │ Payment  │ API      │                            │
│                      │          │ Promotion│ Queue promotion rollback   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.6 Circuit Breaker Configuration

| Service | Failure Threshold | Reset Timeout | Half-Open Requests |
|---------|-------------------|---------------|-------------------|
| MKT Product API | 5 failures in 30s | 60s | 3 |
| MKT License API | 3 failures in 30s | 120s | 2 |
| Promotion Service | 5 failures in 60s | 30s | 5 |
| Payment Gateway | 3 failures in 30s | 180s | 1 |

### 8.7 Health Check Endpoints

```typescript
// Health check configuration
const HEALTH_CHECK_CONFIG = {
  mktProductApi: {
    endpoint: '/api/health',
    interval: 30000, // 30s
    timeout: 5000,   // 5s
  },
  mktLicenseApi: {
    endpoint: '/api/health',
    interval: 30000,
    timeout: 5000,
  },
  redis: {
    command: 'PING',
    interval: 10000,
    timeout: 2000,
  },
  postgres: {
    query: 'SELECT 1',
    interval: 15000,
    timeout: 3000,
  },
} as const;
```

---

## 9. Saga Failure Handling & Rollback

### 9.1 Tổng quan

Saga pattern được sử dụng để đảm bảo data consistency khi order creation liên quan đến nhiều services. Mỗi step có thể fail và cần compensation để rollback.

### 9.2 Saga Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SAGA EXECUTION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

                         START SAGA
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: CreateOrderStep                                                 │
│  ────────────────────────────────────────────────────────────────────── │
│  Execute: Create MktOrder entity in database                            │
│  Timeout: 10s                                                            │
│  Retry: 2x                                                               │
│                                                                          │
│  On Success: Store orderId in context → Continue to Step 2              │
│  On Failure: Log error → Return failure response (no compensation)      │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: CreateOrderItemsStep                                            │
│  ────────────────────────────────────────────────────────────────────── │
│  Execute: Create MktOrderItem entities with snapshots                   │
│  Timeout: 15s                                                            │
│  Retry: 2x                                                               │
│                                                                          │
│  On Success: Store orderItemIds in context → Continue to Step 3         │
│  On Failure: Compensate Step 1 → Return failure                         │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3: CreateLicensesStep                                              │
│  ────────────────────────────────────────────────────────────────────── │
│  Execute: Call MKT License API to create licenses                       │
│  Timeout: 30s (external API)                                            │
│  Retry: 3x with exponential backoff                                     │
│                                                                          │
│  On Success: Store licenseIds in context → Continue to Step 4           │
│  On Failure: Compensate Steps 2, 1 → Return failure                     │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4: CreatePaymentStep                                               │
│  ────────────────────────────────────────────────────────────────────── │
│  Execute: Create payment schedule and records                           │
│  Timeout: 10s                                                            │
│  Retry: 2x                                                               │
│                                                                          │
│  On Success: Store paymentIds in context → Continue to Step 5           │
│  On Failure: Compensate Steps 3, 2, 1 → Return failure                  │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 5: RecordPromotionUsageStep                                        │
│  ────────────────────────────────────────────────────────────────────── │
│  Execute: Record promotion usage, increment counters                    │
│  Timeout: 10s                                                            │
│  Retry: 3x                                                               │
│                                                                          │
│  On Success: Store promotionUsageIds → Continue to Step 6               │
│  On Failure: Compensate Steps 4, 3, 2, 1 → Return failure               │
│                                                                          │
│  ⚠️ CRITICAL: If this fails after payment created, may cause            │
│     inconsistency. Consider making this step idempotent.                │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 6: FinalizeOrderStep                                               │
│  ────────────────────────────────────────────────────────────────────── │
│  Execute: Update order status, create history, emit events             │
│  Timeout: 10s                                                            │
│  Retry: 3x                                                               │
│                                                                          │
│  On Success: Return success response with orderId                       │
│  On Failure: Compensate Steps 5, 4, 3, 2, 1 → Return failure            │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                          END SAGA
```

### 9.3 Compensation Matrix (Chi tiết Rollback)

| Step | Execute Action | Compensation Action | Compensation Timeout | Idempotent | External System |
|------|---------------|---------------------|---------------------|------------|-----------------|
| **CreateOrderStep** | `INSERT INTO mkt_order` | `DELETE FROM mkt_order WHERE id = ?` | 10s | ✅ Yes | ❌ No |
| **CreateOrderItemsStep** | `INSERT INTO mkt_order_item` | `DELETE FROM mkt_order_item WHERE order_id = ?` | 15s | ✅ Yes | ❌ No |
| **CreateLicensesStep** | `POST /api/licenses` | `DELETE /api/licenses/{id}` | 30s | ⚠️ Partial | ✅ Yes (MKT Server) |
| **CreatePaymentStep** | `INSERT INTO mkt_payment` | `DELETE FROM mkt_payment WHERE order_id = ?` | 10s | ✅ Yes | ❌ No |
| **RecordPromotionUsageStep** | `INSERT INTO mkt_promotion_usage` + `UPDATE promotion SET count = count + 1` | `DELETE FROM mkt_promotion_usage` + `UPDATE promotion SET count = count - 1` | 15s | ⚠️ Partial | ❌ No |
| **FinalizeOrderStep** | `UPDATE order SET status` + `INSERT history` + `emit event` | `UPDATE order SET status = 'FAILED'` + `emit ROLLBACK event` | 10s | ✅ Yes | ❌ No |

### 9.4 Failure Scenarios & Handling

#### Scenario 1: CreateOrderStep Fails

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SCENARIO: Database connection error during order creation              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Trigger: PostgreSQL connection timeout                                 │
│                                                                          │
│  Steps Executed:                                                        │
│    ✗ Step 1: CreateOrderStep - FAILED                                   │
│                                                                          │
│  Compensation Required: NONE (no data written)                          │
│                                                                          │
│  Recovery Action:                                                       │
│    1. Log error with traceId                                            │
│    2. Return error response to client                                   │
│    3. Client can retry                                                  │
│                                                                          │
│  Response:                                                              │
│  {                                                                       │
│    "success": false,                                                    │
│    "error": "ORDER_CREATION_FAILED",                                    │
│    "message": "Unable to create order. Please try again.",              │
│    "traceId": "abc-123-xyz"                                             │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Scenario 2: CreateLicensesStep Fails (External API)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SCENARIO: MKT License API returns 503 Service Unavailable              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Trigger: MKT Server is down or overloaded                              │
│                                                                          │
│  Steps Executed:                                                        │
│    ✓ Step 1: CreateOrderStep - SUCCESS (orderId: order-123)             │
│    ✓ Step 2: CreateOrderItemsStep - SUCCESS (3 items created)           │
│    ✗ Step 3: CreateLicensesStep - FAILED after 3 retries                │
│                                                                          │
│  Compensation Sequence (LIFO - Last In First Out):                      │
│    1. Compensate Step 2: DELETE order items                             │
│    2. Compensate Step 1: DELETE order                                   │
│                                                                          │
│  Compensation Flow:                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  compensate(Step2):                                              │    │
│  │    DELETE FROM mkt_order_item WHERE mkt_order_id = 'order-123'   │    │
│  │    Result: 3 rows deleted                                        │    │
│  │                                                                   │    │
│  │  compensate(Step1):                                              │    │
│  │    DELETE FROM mkt_order WHERE id = 'order-123'                  │    │
│  │    Result: 1 row deleted                                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Response:                                                              │
│  {                                                                       │
│    "success": false,                                                    │
│    "error": "LICENSE_SERVICE_UNAVAILABLE",                              │
│    "message": "License service is temporarily unavailable.",            │
│    "retryAfter": 300,                                                   │
│    "traceId": "abc-123-xyz"                                             │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Scenario 3: CreateLicensesStep Partial Success

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SCENARIO: 2/3 licenses created, 3rd license API call fails             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Trigger: Network error during 3rd license creation                     │
│                                                                          │
│  Steps Executed:                                                        │
│    ✓ Step 1: CreateOrderStep - SUCCESS                                  │
│    ✓ Step 2: CreateOrderItemsStep - SUCCESS (3 items)                   │
│    ⚠️ Step 3: CreateLicensesStep - PARTIAL (2 licenses created)         │
│                                                                          │
│  Compensation Sequence:                                                 │
│    1. Compensate Step 3: DELETE 2 licenses from MKT Server              │
│    2. Compensate Step 2: DELETE order items                             │
│    3. Compensate Step 1: DELETE order                                   │
│                                                                          │
│  ⚠️ CRITICAL: External License Compensation                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  compensate(Step3):                                              │    │
│  │    FOR EACH licenseId IN createdLicenses:                        │    │
│  │      DELETE /api/licenses/{licenseId}                            │    │
│  │      IF fails:                                                   │    │
│  │        - Log to dead letter queue                                │    │
│  │        - Schedule manual cleanup job                             │    │
│  │        - Alert operations team                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Dead Letter Queue Entry:                                               │
│  {                                                                       │
│    "type": "LICENSE_CLEANUP",                                           │
│    "licenseIds": ["lic-001", "lic-002"],                                │
│    "orderId": "order-123",                                              │
│    "failedAt": "2025-12-20T10:30:00Z",                                  │
│    "retryCount": 0,                                                     │
│    "maxRetries": 5                                                      │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Scenario 4: RecordPromotionUsageStep Fails After Payment

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SCENARIO: Promotion service down after payment created                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Trigger: Redis connection error during promotion usage recording       │
│                                                                          │
│  Steps Executed:                                                        │
│    ✓ Step 1: CreateOrderStep - SUCCESS                                  │
│    ✓ Step 2: CreateOrderItemsStep - SUCCESS                             │
│    ✓ Step 3: CreateLicensesStep - SUCCESS                               │
│    ✓ Step 4: CreatePaymentStep - SUCCESS                                │
│    ✗ Step 5: RecordPromotionUsageStep - FAILED                          │
│                                                                          │
│  ⚠️ DECISION POINT: Full rollback vs Partial completion                 │
│                                                                          │
│  Option A: Full Rollback (RECOMMENDED for data consistency)             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Compensation Sequence:                                          │    │
│  │    1. Compensate Step 4: Delete payment records                  │    │
│  │    2. Compensate Step 3: Delete licenses from MKT Server         │    │
│  │    3. Compensate Step 2: Delete order items                      │    │
│  │    4. Compensate Step 1: Delete order                            │    │
│  │                                                                   │    │
│  │  Risk: License might already be visible to customer              │    │
│  │  Mitigation: License status is 'pending' until payment confirmed │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Option B: Continue Without Promotion (NOT RECOMMENDED)                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  - Skip promotion usage recording                                │    │
│  │  - Continue to FinalizeOrderStep                                 │    │
│  │  - Queue async job to record promotion later                     │    │
│  │                                                                   │    │
│  │  Risk: Promotion usage count might be incorrect                  │    │
│  │  Risk: Customer might use promotion more than allowed            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Scenario 5: Compensation Step Fails

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SCENARIO: Compensation for CreateLicensesStep fails                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Trigger: MKT Server down during license deletion                       │
│                                                                          │
│  Original Failure: Step 4 (CreatePaymentStep) failed                    │
│  Compensation Failure: Step 3 compensation failed                       │
│                                                                          │
│  Handling Strategy:                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  1. Retry compensation with exponential backoff (3 attempts)     │    │
│  │                                                                   │    │
│  │  2. If still fails:                                              │    │
│  │     - Mark order as 'COMPENSATION_FAILED'                        │    │
│  │     - Write to dead letter queue                                 │    │
│  │     - Send alert to operations team                              │    │
│  │     - Continue compensating remaining steps                      │    │
│  │                                                                   │    │
│  │  3. Background job picks up failed compensations                 │    │
│  │     - Retry every 5 minutes for 1 hour                           │    │
│  │     - Then every 1 hour for 24 hours                             │    │
│  │     - Then manual intervention required                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Order State:                                                           │
│  {                                                                       │
│    "id": "order-123",                                                   │
│    "status": "COMPENSATION_FAILED",                                     │
│    "compensationState": {                                               │
│      "step1": "COMPENSATED",                                            │
│      "step2": "COMPENSATED",                                            │
│      "step3": "COMPENSATION_FAILED",                                    │
│      "step4": "NOT_EXECUTED"                                            │
│    },                                                                   │
│    "pendingCleanup": ["license-001", "license-002"],                    │
│    "lastCompensationAttempt": "2025-12-20T10:35:00Z"                    │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.5 Saga Context & Rollback Data Structure

```typescript
/**
 * SagaContext - Shared context across all saga steps
 */
type SagaContext = {
  // Workspace info
  workspaceId: string;
  workspaceMemberId: string | undefined;

  // Input data
  input: CreateOrderWithItemsInput;

  // Execution tracking
  currentStep: number;
  executedSteps: string[];
  startedAt: Date;

  // Data created by steps (for rollback)
  orderData: {
    orderId: string;
    orderCode: string;
  } | null;

  orderItemsData: {
    orderItemIds: string[];
  } | null;

  licensesData: {
    licenses: Array<{
      orderItemId: string;
      licenseId: string;
      licenseKey: string;
    }>;
  } | null;

  paymentData: {
    paymentIds: string[];
  } | null;

  promotionData: {
    usageIds: string[];
    promotionIds: string[];
    couponId: string | null;
  } | null;

  // Metadata for calculations
  metadata: Map<string, unknown>;

  // Rollback tracking
  rollbackData: Map<string, unknown>;
  compensationErrors: Array<{
    step: string;
    error: string;
    timestamp: Date;
  }>;
};

/**
 * CompensationResult - Result of a compensation action
 */
type CompensationResult = {
  success: boolean;
  step: string;
  error?: string;
  retryCount: number;
  duration: number;
};
```

### 9.6 Retry & Timeout Configuration

```typescript
/**
 * Saga step configuration
 */
const SAGA_STEP_CONFIG = {
  CreateOrderStep: {
    timeout: 10000,      // 10s
    maxRetries: 2,
    retryDelay: 1000,    // 1s
    retryBackoff: 'linear',
  },
  CreateOrderItemsStep: {
    timeout: 15000,      // 15s
    maxRetries: 2,
    retryDelay: 1000,
    retryBackoff: 'linear',
  },
  CreateLicensesStep: {
    timeout: 30000,      // 30s (external API)
    maxRetries: 3,
    retryDelay: 2000,    // 2s
    retryBackoff: 'exponential', // 2s, 4s, 8s
  },
  CreatePaymentStep: {
    timeout: 10000,
    maxRetries: 2,
    retryDelay: 1000,
    retryBackoff: 'linear',
  },
  RecordPromotionUsageStep: {
    timeout: 10000,
    maxRetries: 3,
    retryDelay: 1000,
    retryBackoff: 'linear',
  },
  FinalizeOrderStep: {
    timeout: 10000,
    maxRetries: 3,
    retryDelay: 500,
    retryBackoff: 'linear',
  },
} as const;

/**
 * Compensation configuration
 */
const COMPENSATION_CONFIG = {
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 'exponential',
  deadLetterQueueEnabled: true,
  alertOnFailure: true,
} as const;
```

### 9.7 Logging & Observability

```typescript
/**
 * Saga execution log format
 */
type SagaExecutionLog = {
  traceId: string;
  sagaName: string;
  workspaceId: string;
  orderId: string | null;

  // Step execution
  step: string;
  action: 'EXECUTE' | 'COMPENSATE';
  status: 'STARTED' | 'SUCCESS' | 'FAILED' | 'RETRYING';

  // Timing
  startedAt: string;
  completedAt: string | null;
  duration: number | null;

  // Error details
  error?: {
    code: string;
    message: string;
    stack?: string;
  };

  // Retry info
  retryCount?: number;
  maxRetries?: number;

  // Context data (sanitized)
  contextSnapshot?: {
    executedSteps: string[];
    hasOrderData: boolean;
    hasLicenseData: boolean;
    hasPaymentData: boolean;
  };
};

// Example log output
/*
{
  "traceId": "trace-abc-123",
  "sagaName": "CreateOrderSaga",
  "workspaceId": "ws-001",
  "orderId": "order-123",
  "step": "CreateLicensesStep",
  "action": "EXECUTE",
  "status": "FAILED",
  "startedAt": "2025-12-20T10:30:00.000Z",
  "completedAt": "2025-12-20T10:30:32.500Z",
  "duration": 32500,
  "error": {
    "code": "LICENSE_API_TIMEOUT",
    "message": "Request to MKT License API timed out after 30000ms"
  },
  "retryCount": 3,
  "maxRetries": 3,
  "contextSnapshot": {
    "executedSteps": ["CreateOrderStep", "CreateOrderItemsStep"],
    "hasOrderData": true,
    "hasLicenseData": false,
    "hasPaymentData": false
  }
}
*/
```

### 9.8 Dead Letter Queue Schema

```typescript
/**
 * Dead Letter Queue entry for failed compensations
 */
type DeadLetterEntry = {
  id: string;
  type: 'SAGA_COMPENSATION' | 'LICENSE_CLEANUP' | 'PROMOTION_ROLLBACK';

  // Original context
  sagaName: string;
  traceId: string;
  workspaceId: string;
  orderId: string;

  // Failed action
  failedStep: string;
  failedAction: 'EXECUTE' | 'COMPENSATE';
  error: string;

  // Data needed for retry
  payload: {
    licenseIds?: string[];
    paymentIds?: string[];
    promotionUsageIds?: string[];
    orderItemIds?: string[];
  };

  // Retry tracking
  createdAt: Date;
  lastAttemptAt: Date | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date;

  // Status
  status: 'PENDING' | 'RETRYING' | 'RESOLVED' | 'MANUAL_REQUIRED';
  resolvedAt: Date | null;
  resolvedBy: string | null;
};
```

---

## 10. Implementation Checklist

### Phase 1: Resolver Refactoring (Priority: High)

- [ ] **1.1** Tạo file `order/mappers/order-input.mapper.ts`
  - [ ] Implement `toCreateOrderInput()`
  - [ ] Implement `toConfirmOrderInput()`
  - [ ] Implement `toUpdateOrderStatusInput()`
  - [ ] Implement `toRefundOrderInput()`

- [ ] **1.2** Refactor `order-mutation.resolver.ts`
  - [ ] Import và sử dụng `OrderInputMapper`
  - [ ] Thêm `@AuthWorkspaceMemberId()` cho tất cả mutations
  - [ ] Loại bỏ method `mapActionToStatus()`
  - [ ] Loại bỏ code duplication giữa `createOrderWithItems` và `validateOrderInput`

- [ ] **1.3** Di chuyển `mapActionToStatus` vào `OrderStatusService`
  - [ ] Thêm method `mapActionToStatus()` vào `OrderStatusService`
  - [ ] Update `OrderOrchestrationService` để sử dụng `OrderStatusService`

### Phase 2: DTO Updates (Priority: High)

- [ ] **2.1** Update `CreateOrderWithItemsInputDto`
  - [ ] Thêm field `couponCode: string` (optional)
  - [ ] Thêm field `applyAutoPromotions: boolean` (default: true)

- [ ] **2.2** Update `MktOrderWorkspaceEntity`
  - [ ] Thêm field `appliedPromotions: AppliedPromotion[]` (RAW_JSON)
  - [ ] Thêm field `couponCode: string` (optional)
  - [ ] Thêm field `promotionDiscount: number` (default: 0)
  - [ ] Thêm relation `promotionUsages`

- [ ] **2.3** Update `MktOrderItemWorkspaceEntity`
  - [ ] Thêm field `productSnapshot: MktProductSnapshot` (RAW_JSON)
  - [ ] Thêm field `packageSnapshot: MktPackageSnapshot` (RAW_JSON)
  - [ ] Thêm field `itemDiscount: number` (from promotion)

### Phase 3: Integration Services (Priority: Medium)

- [ ] **3.1** Tạo `order/services/integration/order-product.integration.ts`
  - [ ] Implement `validateProducts()`
  - [ ] Implement `createSnapshots()`
  - [ ] Implement `verifySnapshot()`

- [ ] **3.2** Tạo `order/services/integration/order-license.integration.ts`
  - [ ] Implement `createLicenses()`
  - [ ] Implement `activateLicenses()`
  - [ ] Implement `revokeLicenses()`

- [ ] **3.3** Tạo `order/services/integration/order-promotion.integration.ts`
  - [ ] Implement `calculateDiscount()`
  - [ ] Implement `buildEvaluationContext()`
  - [ ] Implement `recordUsage()`
  - [ ] Implement `rollbackUsage()`

### Phase 4: New Saga Steps (Priority: Medium)

- [ ] **4.1** Tạo `CreateSnapshotsStep`
  - [ ] Implement `execute()`
  - [ ] Implement `compensate()`
  - [ ] Implement `shouldSkip()`

- [ ] **4.2** Tạo `CalculatePromotionStep`
  - [ ] Implement `execute()`
  - [ ] Implement `compensate()`
  - [ ] Implement `shouldSkip()`

- [ ] **4.3** Tạo `RecordPromotionUsageStep`
  - [ ] Implement `execute()`
  - [ ] Implement `compensate()`
  - [ ] Implement `shouldSkip()`

- [ ] **4.4** Update `CreateOrderSaga`
  - [ ] Register new steps trong đúng thứ tự
  - [ ] Update step flow documentation

### Phase 5: Module Updates (Priority: Low)

- [ ] **5.1** Update `mkt-order.module.ts`
  - [ ] Import `MktProductIntegrationModule`
  - [ ] Import `MktLicenseIntegrationModule`
  - [ ] Import `MktPromotionModule`
  - [ ] Register new services và steps

- [ ] **5.2** Update `OrderOrchestrationService`
  - [ ] Update `confirmOrder()` signature với `workspaceMemberId`
  - [ ] Update `updateOrderStatus()` signature với `workspaceMemberId`
  - [ ] Update `refundOrder()` signature với `workspaceMemberId`
  - [ ] Inject `OrderStatusService` và sử dụng `mapActionToStatus()`

### Phase 6: Testing (Priority: High)

- [ ] **6.1** Unit Tests
  - [ ] Test `OrderInputMapper`
  - [ ] Test `OrderStatusService.mapActionToStatus()`
  - [ ] Test integration services

- [ ] **6.2** Integration Tests
  - [ ] Test create order with promotion
  - [ ] Test create order with external products (snapshots)
  - [ ] Test refund with promotion rollback

### Phase 7: Documentation (Priority: Low)

- [ ] **7.1** Update API documentation
- [ ] **7.2** Update CLAUDE.md với module changes
- [ ] **7.3** Create migration guide for existing code

---

## Appendix

### A. Field IDs for New Fields

```typescript
// Add to mkt-core/constants/mkt-field-ids.ts

export const MKT_ORDER_FIELD_IDS = {
  // ... existing fields

  // Promotion fields
  appliedPromotions: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  couponCode: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  promotionDiscount: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
};

export const MKT_ORDER_ITEM_FIELD_IDS = {
  // ... existing fields

  // Snapshot fields
  productSnapshot: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  packageSnapshot: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  itemDiscount: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
};
```

### B. Relation IDs

```typescript
// Add to mkt-core/constants/mkt-relation-ids.ts

export const MKT_ORDER_RELATION_IDS = {
  // ... existing relations

  // Promotion relation
  mktOrderToPromotionUsages: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
};
```

---

**Document Version:** 1.0
**Created:** 2025-12-20
**Author:** Claude Code
**Status:** Draft - Pending Review
