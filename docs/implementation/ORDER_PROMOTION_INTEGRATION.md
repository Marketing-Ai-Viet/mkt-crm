# Order Promotion Integration - Implementation Guide

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc tích hợp](#2-kiến-trúc-tích-hợp)
3. [Data Flow](#3-data-flow)
4. [Các Step trong Order Saga](#4-các-step-trong-order-saga)
5. [Hướng dẫn triển khai](#5-hướng-dẫn-triển-khai)
6. [GraphQL API](#6-graphql-api)
7. [Testing Guide](#7-testing-guide)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Tổng quan

### 1.1 Mục đích

Module Order tích hợp với module Promotion để:
- Tự động áp dụng các khuyến mãi đang active (auto-apply)
- Xác thực và áp dụng mã coupon từ khách hàng
- Tính toán discount và cập nhật tổng đơn hàng
- Ghi nhận lịch sử sử dụng promotion

### 1.2 Các thành phần chính

| Component | Vị trí | Mô tả |
|-----------|--------|-------|
| `CalculatePromotionStep` | `order/orchestration/steps/` | Saga step tính discount |
| `RecordPromotionUsageStep` | `order/orchestration/steps/` | Ghi nhận usage sau confirm |
| `OrderPromotionIntegrationService` | `order/services/integration/` | Bridge giữa Order và Promotion |
| `OrderPromotionListener` | `mkt-promotion/listeners/` | Lắng nghe order events |

### 1.3 Quy trình tổng quan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ORDER PROMOTION INTEGRATION FLOW                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CREATE ORDER SAGA:                                                          │
│  ┌──────────────┐   ┌──────────────────┐   ┌─────────────────────┐          │
│  │ CreateOrder  │──▶│ CreateOrderItems │──▶│ CalculatePromotion  │          │
│  └──────────────┘   └──────────────────┘   └─────────────────────┘          │
│                                                      │                       │
│                                                      ▼                       │
│                                             ┌─────────────────┐              │
│                                             │ Order Updated   │              │
│                                             │ - discount      │              │
│                                             │ - totalAmount   │              │
│                                             │ - couponCode    │              │
│                                             └─────────────────┘              │
│                                                                              │
│  CONFIRM ORDER SAGA (khi payment confirmed):                                 │
│  ┌────────────────────┐   ┌───────────────────────┐                         │
│  │ ConfirmPayment     │──▶│ RecordPromotionUsage  │                         │
│  │ (status=CONFIRMED) │   │ (create usage records)│                         │
│  └────────────────────┘   └───────────────────────┘                         │
│                                                                              │
│  ORDER CANCELLED:                                                            │
│  ┌────────────────────┐                                                      │
│  │ order.cancelled    │──▶ OrderPromotionListener ──▶ Rollback Usage        │
│  │ event emitted      │                                                      │
│  └────────────────────┘                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Kiến trúc tích hợp

### 2.1 Module Dependencies

```typescript
// order.module.ts
@Module({
  imports: [
    MktPromotionModule, // Import promotion module
  ],
  providers: [
    // Integration service
    OrderPromotionIntegrationService,

    // Saga steps
    CalculatePromotionStep,
    RecordPromotionUsageStep,
  ],
})
export class MktOrderModule {}
```

### 2.2 Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ORDER MODULE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐          ┌────────────────────────────────────┐    │
│  │   Order Saga        │          │  OrderPromotionIntegrationService  │    │
│  │   (Orchestrator)    │────────▶ │  - calculateDiscount()             │    │
│  └─────────────────────┘          │  - recordUsage()                   │    │
│                                   │  - rollbackUsage()                 │    │
│                                   │  - validateCoupon()                │    │
│                                   └─────────────────────┬──────────────┘    │
│                                                         │                    │
├─────────────────────────────────────────────────────────│────────────────────┤
│                              PROMOTION MODULE            │                    │
├─────────────────────────────────────────────────────────│────────────────────┤
│                                                         ▼                    │
│  ┌──────────────────────────┐   ┌────────────────────────────────────┐     │
│  │ PromotionApplication     │   │ PromotionUsageApplicationService   │     │
│  │ Service                  │   │ - recordUsage()                    │     │
│  │ - calculateDiscount()    │   │ - getCustomerUsageCount()          │     │
│  │ - getActivePromotions()  │   └────────────────────────────────────┘     │
│  └──────────────────────────┘                                               │
│                                                                              │
│  ┌──────────────────────────┐   ┌────────────────────────────────────┐     │
│  │ PromotionCalculation     │   │ PromotionValidationService         │     │
│  │ Service                  │   │ - validatePromotion()              │     │
│  │ - calculateOrderDiscount │   │ - validateCoupon()                 │     │
│  │ - calculatePromotion     │   └────────────────────────────────────┘     │
│  │   Discount()             │                                               │
│  └──────────────────────────┘                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Data Model Integration

#### Order Entity - Promotion Fields

```typescript
// mkt-order.workspace-entity.ts

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.couponCode,
  type: FieldMetadataType.TEXT,
  label: msg`Coupon Code`,
  description: msg`Applied coupon code`,
})
@WorkspaceIsNullable()
couponCode: string | null;

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.promotionDiscount,
  type: FieldMetadataType.NUMBER,
  label: msg`Promotion Discount`,
  description: msg`Total discount from promotions`,
  defaultValue: 0,
})
promotionDiscount: number;

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.appliedPromotions,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Applied Promotions`,
  description: msg`Snapshot of applied promotions`,
})
@WorkspaceIsNullable()
appliedPromotions: PromotionSnapshot[] | null;

@WorkspaceRelation({
  standardId: MKT_ORDER_RELATION_IDS.mktOrderToPromotionUsages,
  type: RelationType.ONE_TO_MANY,
  label: msg`Promotion Usages`,
  inverseSideTarget: () => MktPromotionUsageWorkspaceEntity,
  inverseSideFieldKey: 'order',
})
promotionUsages: MktPromotionUsageWorkspaceEntity[];
```

---

## 3. Data Flow

### 3.1 Create Order with Promotion

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     CREATE ORDER WITH PROMOTION FLOW                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUT:                                                                     │
│  {                                                                          │
│    customerId: "xxx",                                                       │
│    externalProducts: [...],                                                 │
│    couponCode: "SUMMER2024",        // Optional                            │
│    applyAutoPromotions: true        // Default: true                       │
│  }                                                                          │
│                                                                             │
│  STEP 1: CreateOrderStep                                                    │
│  ─────────────────────────                                                  │
│  → Create order with PENDING_PAYMENT status                                 │
│  → Output: orderId                                                          │
│                                                                             │
│  STEP 2: CreateOrderItemsStep                                               │
│  ─────────────────────────────                                              │
│  → Create order items from external products                                │
│  → Calculate subtotal, tax                                                  │
│  → Update order totals                                                      │
│  → Store orderItems in context.metadata                                     │
│                                                                             │
│  STEP 3: CalculatePromotionStep                                             │
│  ───────────────────────────────                                            │
│  → Build evaluation context từ order items                                  │
│  → Call promotionIntegration.calculateDiscount()                            │
│  → Update order với:                                                        │
│      - couponCode                                                           │
│      - promotionDiscount                                                    │
│      - appliedPromotions (snapshots)                                        │
│      - totalAmount = subtotal - discount                                    │
│                                                                             │
│  OUTPUT:                                                                    │
│  {                                                                          │
│    orderId: "xxx",                                                          │
│    orderCode: "ORD-20240601-0001",                                         │
│    subtotal: 1000000,                                                       │
│    promotionDiscount: 100000,                                               │
│    totalAmount: 900000,                                                     │
│    appliedPromotions: [{                                                    │
│      promotionId: "promo-1",                                                │
│      promotionName: "Summer Sale",                                          │
│      discountAmount: 100000,                                                │
│      appliedAt: "2024-06-01T10:00:00Z",                                    │
│      checksum: "abc123..."                                                  │
│    }]                                                                       │
│  }                                                                          │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Record Usage on Confirm

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     RECORD PROMOTION USAGE ON CONFIRM                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER: confirmOrder mutation với action = ACCOUNTING_CONFIRMED           │
│                                                                             │
│  STEP: RecordPromotionUsageStep (trong ConfirmOrderSaga)                    │
│  ──────────────────────────────────────────────────────                     │
│                                                                             │
│  1. Lấy appliedPromotions từ context.metadata                               │
│                                                                             │
│  2. Với mỗi applied promotion:                                              │
│     → Tạo MktPromotionUsage record:                                         │
│       {                                                                     │
│         promotionId: "promo-1",                                             │
│         orderId: "order-1",                                                 │
│         customerId: "customer-1",                                           │
│         discountAmount: 100000,                                             │
│         originalAmount: 1000000,                                            │
│         appliedAt: now()                                                    │
│       }                                                                     │
│                                                                             │
│  3. Increment promotion.currentUsageCount                                   │
│                                                                             │
│  4. Increment coupon.currentUsageCount (nếu có)                             │
│                                                                             │
│  NOTE: Usage chỉ được ghi nhận SAU KHI order được confirm                   │
│        Nếu order bị cancel, usage sẽ được rollback                          │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Các Step trong Order Saga

### 4.1 CalculatePromotionStep

**File:** `packages/twenty-server/src/mkt-core/order/orchestration/steps/calculate-promotion.step.ts`

**Chức năng:**
- Tính discount từ auto-apply promotions và coupon code
- Cập nhật order với promotion data

**Khi nào skip:**
- `applyAutoPromotions = false` VÀ không có `couponCode`

**Input từ context:**
```typescript
type ContextMetadata = {
  totalAmount: number;          // Subtotal từ CreateOrderItemsStep
  orderItems: Array<{           // Items để evaluate rules
    externalMktProductId: string;
    externalMktPackageId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  customerTags?: string[];      // Optional: để check CUSTOMER_TAG rules
  isFirstOrder?: boolean;       // Optional: để check FIRST_ORDER rules
};
```

**Output:**
```typescript
type CalculatePromotionStepOutput = {
  promotionResult: OrderPromotionResult;
  appliedPromotions: PromotionSnapshot[];
  totalDiscount: number;
  finalAmount: number;
};
```

**Compensate:**
- Reset order promotion fields về default
- Clear metadata liên quan

### 4.2 RecordPromotionUsageStep

**File:** `packages/twenty-server/src/mkt-core/order/orchestration/steps/record-promotion-usage.step.ts`

**Chức năng:**
- Ghi nhận usage sau khi order được confirm
- Tạo MktPromotionUsage records

**Khi nào skip:**
- Không có `appliedPromotions` trong context

**Compensate:**
- Rollback usage (soft delete records, decrement counts)

---

## 5. Hướng dẫn triển khai

### 5.1 Thêm Promotion vào Order Input

```typescript
// types/order-input.types.ts

export type CreateOrderWithItemsInput = {
  // ... existing fields

  // Promotion fields
  couponCode?: string;           // Mã coupon (optional)
  applyAutoPromotions?: boolean; // Áp dụng auto promotions (default: true)
};
```

### 5.2 Đăng ký Step trong Saga

```typescript
// orchestration/sagas/create-order.saga.ts

@Injectable()
export class CreateOrderSaga {
  constructor(
    private readonly createOrderStep: CreateOrderStep,
    private readonly createOrderItemsStep: CreateOrderItemsStep,
    private readonly calculatePromotionStep: CalculatePromotionStep,
    private readonly createPaymentStep: CreatePaymentStep,
    private readonly finalizeOrderStep: FinalizeOrderStep,
  ) {}

  getSteps(): SagaStep<any, any>[] {
    return [
      this.createOrderStep,
      this.createOrderItemsStep,
      this.calculatePromotionStep,  // Thêm sau CreateOrderItems
      this.createPaymentStep,
      this.finalizeOrderStep,
    ];
  }
}
```

### 5.3 Thêm Step vào ConfirmOrderSaga

```typescript
// orchestration/sagas/confirm-order.saga.ts

@Injectable()
export class ConfirmOrderSaga {
  constructor(
    private readonly confirmPaymentStep: ConfirmPaymentStep,
    private readonly createLicensesOnConfirmStep: CreateLicensesOnConfirmStep,
    private readonly recordPromotionUsageStep: RecordPromotionUsageStep,
    // ...
  ) {}

  getSteps(): SagaStep<any, any>[] {
    return [
      this.confirmPaymentStep,
      this.createLicensesOnConfirmStep,
      this.recordPromotionUsageStep,  // Record sau khi confirm thành công
    ];
  }
}
```

### 5.4 Emit Events cho Listener

```typescript
// Khi order cancelled
this.eventEmitter.emit('order.cancelled', {
  workspaceId: order.workspaceId,
  orderId: order.id,
});

// OrderPromotionListener sẽ tự động:
// - Lấy usage records cho order
// - Rollback usage counts
// - Soft delete usage records
```

---

## 6. GraphQL API

### 6.1 Create Order với Coupon

```graphql
mutation CreateOrderWithCoupon($input: CreateOrderWithItemsInputDto!) {
  createOrderWithItems(input: $input) {
    success
    orderId
    orderCode
    error
  }
}

# Variables:
{
  "input": {
    "customerId": "xxx",
    "action": "NEW_ORDER",
    "externalProducts": [
      {
        "productId": "product-1",
        "packageId": "package-1"
      }
    ],
    "paymentMethods": [
      { "paymentMethodId": "pm-1" }
    ],
    "couponCode": "SUMMER2024",
    "applyAutoPromotions": true
  }
}
```

### 6.2 Query Order với Promotion Info

```graphql
query GetOrderWithPromotions($orderId: ID!) {
  mktOrder(id: $orderId) {
    id
    orderCode
    subtotal
    promotionDiscount
    totalAmount
    couponCode
    appliedPromotions
    promotionUsages {
      edges {
        node {
          id
          discountAmount
          originalAmount
          appliedAt
          promotion {
            id
            name
            code
          }
        }
      }
    }
  }
}
```

### 6.3 Preview Discount (trước khi tạo order)

```graphql
query PreviewOrderDiscount($input: CalculateDiscountInput!) {
  mktCalculateOrderDiscount(input: $input) {
    appliedPromotions {
      promotionId
      promotionName
      discountAmount
    }
    totalDiscount
    finalOrderAmount
  }
}

# Variables:
{
  "input": {
    "customerId": "xxx",
    "orderSubtotal": 1000000,
    "couponCode": "SUMMER2024",
    "orderItems": [
      {
        "productId": "product-1",
        "quantity": 1,
        "unitPrice": 500000,
        "totalPrice": 500000
      }
    ]
  }
}
```

---

## 7. Testing Guide

### 7.1 Test Data Setup

```bash
# Tạo promotion active
INSERT INTO workspace_xxx."mktPromotion" (
  id, name, code, status, "promotionType",
  "discountValue", "minOrderAmount", "isAutoApply",
  priority, stackable, "startDate"
) VALUES (
  'promo-test-1',
  'Test 10% Off',
  'TEST10',
  'ACTIVE',
  'PERCENTAGE',
  10,
  100000,
  true,
  10,
  true,
  NOW()
);

# Tạo coupon
INSERT INTO workspace_xxx."mktCoupon" (
  id, code, status, "promotionId",
  "usageLimit", "currentUsageCount"
) VALUES (
  'coupon-test-1',
  'TESTCODE123',
  'ACTIVE',
  'promo-test-1',
  100,
  0
);
```

### 7.2 Test Cases

#### TC01: Create Order với Auto-Apply Promotion

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "mutation { createOrderWithItems(input: { customerId: \"xxx\", action: NEW_ORDER, externalProducts: [{ productId: \"prod-1\", packageId: \"pkg-1\" }], paymentMethods: [{ paymentMethodId: \"pm-1\" }], applyAutoPromotions: true }) { success orderId orderCode } }"
  }'

# Verify: Order có promotionDiscount > 0 và appliedPromotions không null
```

#### TC02: Create Order với Coupon Code

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "mutation { createOrderWithItems(input: { customerId: \"xxx\", action: NEW_ORDER, externalProducts: [{ productId: \"prod-1\", packageId: \"pkg-1\" }], paymentMethods: [{ paymentMethodId: \"pm-1\" }], couponCode: \"TESTCODE123\" }) { success orderId } }"
  }'

# Verify: Order có couponCode = "TESTCODE123"
```

#### TC03: Invalid Coupon Code

```bash
# Dùng coupon không tồn tại
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "mutation { createOrderWithItems(input: { customerId: \"xxx\", action: NEW_ORDER, externalProducts: [...], couponCode: \"INVALID123\" }) { success error } }"
  }'

# Expected: Order vẫn được tạo nhưng không có discount
# (hoặc lỗi nếu coupon validation strict)
```

#### TC04: Confirm Order và Record Usage

```bash
# 1. Tạo order với coupon
ORDER_ID=$(curl ... | jq -r '.data.createOrderWithItems.orderId')

# 2. Confirm order
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "mutation { confirmOrder(input: { orderId: \"'$ORDER_ID'\", action: ACCOUNTING_CONFIRMED }) { success newStatus } }"
  }'

# 3. Verify usage recorded
SELECT * FROM workspace_xxx."mktPromotionUsage"
WHERE "orderId" = 'ORDER_ID';

# 4. Verify usage count incremented
SELECT "currentUsageCount" FROM workspace_xxx."mktPromotion"
WHERE id = 'promo-test-1';
```

### 7.3 Database Verification

```sql
-- Check order promotion fields
SELECT
  id, "orderCode", subtotal,
  "promotionDiscount", "totalAmount",
  "couponCode", "appliedPromotions"
FROM workspace_xxx."mktOrder"
WHERE id = 'ORDER_ID';

-- Check promotion usages
SELECT
  pu.id, pu."discountAmount", pu."originalAmount",
  pu."appliedAt", p.name as "promotionName"
FROM workspace_xxx."mktPromotionUsage" pu
JOIN workspace_xxx."mktPromotion" p ON p.id = pu."promotionId"
WHERE pu."orderId" = 'ORDER_ID';

-- Check promotion usage count
SELECT id, name, code, "currentUsageCount", "usageLimit"
FROM workspace_xxx."mktPromotion"
WHERE id = 'PROMOTION_ID';
```

---

## 8. Troubleshooting

### 8.1 Promotion không được apply

**Nguyên nhân có thể:**

1. **Promotion không ACTIVE**
   ```sql
   SELECT status FROM mktPromotion WHERE code = 'XXX';
   -- Phải là 'ACTIVE'
   ```

2. **Chưa đến startDate hoặc đã qua endDate**
   ```sql
   SELECT "startDate", "endDate" FROM mktPromotion WHERE code = 'XXX';
   -- NOW() phải trong khoảng startDate - endDate
   ```

3. **Usage limit đã hết**
   ```sql
   SELECT "currentUsageCount", "usageLimit" FROM mktPromotion WHERE code = 'XXX';
   -- currentUsageCount phải < usageLimit
   ```

4. **Không đủ minOrderAmount**
   ```sql
   SELECT "minOrderAmount" FROM mktPromotion WHERE code = 'XXX';
   -- orderSubtotal phải >= minOrderAmount
   ```

5. **Rules không match**
   - Check promotion rules
   - Verify order items match rule conditions

### 8.2 Coupon invalid

**Check list:**

```sql
-- 1. Coupon tồn tại?
SELECT * FROM mktCoupon WHERE code = 'XXX';

-- 2. Status ACTIVE?
SELECT status FROM mktCoupon WHERE code = 'XXX';

-- 3. Chưa hết hạn?
SELECT "validFrom", "validTo" FROM mktCoupon WHERE code = 'XXX';

-- 4. Chưa dùng hết?
SELECT "currentUsageCount", "usageLimit" FROM mktCoupon WHERE code = 'XXX';

-- 5. Không gán cho customer khác?
SELECT "assignedCustomerId" FROM mktCoupon WHERE code = 'XXX';
```

### 8.3 Usage không được record

**Check:**

1. Order đã được confirm?
2. RecordPromotionUsageStep có được gọi?
3. Check logs:
   ```bash
   grep "RecordPromotionUsageStep" /tmp/twenty-server.log
   ```

### 8.4 Rollback không hoạt động

**Note:** Hiện tại rollback usage là placeholder, cần implement:

```typescript
// Cần implement trong PromotionUsageApplicationService:
async rollbackUsage(workspaceId: string, orderId: string): Promise<void> {
  const usages = await this.usageRepository.findByOrderId(workspaceId, orderId);

  for (const usage of usages) {
    // Decrement promotion usage count
    await this.promotionRepository.decrementUsageCount(workspaceId, usage.promotionId);

    // Decrement coupon usage count if applicable
    if (usage.couponId) {
      await this.couponRepository.decrementUsageCount(workspaceId, usage.couponId);
    }

    // Soft delete usage record
    await this.usageRepository.softDelete(workspaceId, usage.id);
  }
}
```

---

## Appendix

### A. File References

| File | Mô tả |
|------|-------|
| `order/orchestration/steps/calculate-promotion.step.ts` | Saga step tính discount |
| `order/orchestration/steps/record-promotion-usage.step.ts` | Saga step ghi usage |
| `order/services/integration/order-promotion.integration.ts` | Integration service |
| `order/types/order-promotion.types.ts` | Type definitions |
| `mkt-promotion/services/domain/promotion-calculation.service.ts` | Core calculation logic |
| `mkt-promotion/services/application/promotion-application.service.ts` | Facade service |
| `mkt-promotion/listeners/order-promotion.listener.ts` | Event listener |

### B. Related Constants

```typescript
// order/constants/order-status.constants.ts
export const ORDER_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  // ...
};

// mkt-promotion/constants/mkt-promotion.constants.ts
export const PROMOTION_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  BUY_X_GET_Y: 'BUY_X_GET_Y',
  FREE_SHIPPING: 'FREE_SHIPPING',
};

export const PROMOTION_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};
```

### C. Environment Variables

```bash
# Promotion module config
PROMOTION_CACHE_TTL_SECONDS=300
PROMOTION_MAX_RULES_PER_PROMOTION=20
PROMOTION_EXPIRATION_CHECK_ENABLED=true
PROMOTION_EXPIRATION_CHECK_CRON="0 0 * * * *"
```

---

**Created by:** Claude Code
**Date:** 2025-01-05
**Version:** 1.0
