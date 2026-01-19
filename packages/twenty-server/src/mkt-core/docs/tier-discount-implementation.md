# Tài liệu triển khai: Customer Tier Discount

> **Version**: 2.0 (Revised)
> **Author**: Development Team
> **Date**: 2026-01-19
> **Status**: Draft - Pending Review

---

## 1. Tổng quan

### 1.1. Mục tiêu

Implement tính năng **giảm giá theo tier của customer** trong order flow, sử dụng infrastructure có sẵn của module `mkt-promotion`.

### 1.2. Business Requirements

| Tier | Discount % | Điều kiện đạt tier |
|------|------------|-------------------|
| DIAMOND | 15% | ≥ 10,000,000 VND & ≥ 20 orders |
| GOLD | 10% | ≥ 5,000,000 VND & ≥ 10 orders |
| SILVER | 5% | ≥ 2,000,000 VND & ≥ 5 orders |
| BRONZE | 0% | ≥ 500,000 VND & ≥ 1 order |

### 1.3. Acceptance Criteria

- [ ] Customer có tier DIAMOND được giảm 15% khi tạo order
- [ ] Customer có tier GOLD được giảm 10% khi tạo order
- [ ] Customer có tier SILVER được giảm 5% khi tạo order
- [ ] Tier discount được tự động áp dụng (không cần nhập coupon)
- [ ] **Tier discount chỉ áp dụng 1 promotion per tier** (không stack nhiều tier promotions)
- [ ] Tier discount có thể kết hợp với coupon khác (stackable) - **multiplicative**
- [ ] Order lưu lại thông tin tier discount đã áp dụng
- [ ] Có thể quản lý tier discount qua Admin UI (Promotion management)

---

## 2. Phân tích hiện trạng - GAP Analysis

### 2.1. Order Flow hiện tại

```
CreateOrderSaga
├─ CreateOrderStep           → Tạo order
├─ CreateSnapshotsStep       → Tạo snapshots
├─ CreateOrderItemsStep      → Lấy giá từ MKT Server
│   └─ ⚠️ KHÔNG set metadata 'orderItems' (chỉ set totalAmount, comboDiscount)
├─ CalculatePromotionStep    → Tính discount
│   └─ ⚠️ Đọc metadata 'orderItems', 'customerTags', 'isFirstOrder' - NHƯNG KHÔNG ĐƯỢC SET
├─ CreateLicensesStep        → Tạo licenses
├─ CreatePaymentStep         → Tạo payment
└─ FinalizeOrderStep         → Finalize
```

### 2.2. GAP Analysis - Promotion Module

#### 2.2.1. PromotionApplicationService.calculateDiscount()

**File**: `mkt-promotion/services/application/promotion-application.service.ts:423-448`

```typescript
// HIỆN TẠI: Chỉ validate basic fields, KHÔNG evaluate rules
async calculateDiscount(workspaceId, context): Promise<AppliedPromotionsResult> {
  const activePromotions = await this.getActivePromotions(workspaceId);

  for (const promotion of activePromotions) {
    // ⚠️ CHỈ validate basic: status, date, usage limit, minOrderAmount
    const validation = await this.validationService.validatePromotion(promotion, context);

    if (validation.isValid) {
      applicablePromotions.push(promotion);
    }
  }

  // ⚠️ KHÔNG GỌI: ruleEvaluationService.evaluateRules()
  return this.calculationService.calculateOrderDiscount(applicablePromotions, context);
}
```

**VẤN ĐỀ**: `RuleEvaluationService` tồn tại nhưng **KHÔNG ĐƯỢC GỌI** trong flow tính discount.

#### 2.2.2. PromotionValidationService.validatePromotion()

**File**: `mkt-promotion/services/domain/promotion-validation.service.ts:30-108`

**Chỉ validate**:
- ✅ Status (ACTIVE)
- ✅ Date range (startDate, endDate)
- ✅ Usage limit (total và per customer)
- ✅ Min order amount
- ❌ **KHÔNG validate rules** (CUSTOMER_TIER, CUSTOMER_TAG, etc.)

#### 2.2.3. PromotionCalculationService - Stacking Logic

**File**: `mkt-promotion/services/domain/promotion-calculation.service.ts:32-95`

```typescript
// Stacking là MULTIPLICATIVE (không phải additive)
let remainingAmount = MoneyUtils.from(context.orderSubtotal);

for (const promotion of sortedPromotions) {
  const discountAmount = this.calculatePromotionDiscount(promotion, context, remainingAmount);
  // ⚠️ Discount tiếp theo tính trên remainingAmount (đã giảm)
  remainingAmount = MoneyUtils.subtract(remainingAmount, discountAmount);
}
```

**Ví dụ**: Order 1,000,000 VND với 10% tier + 5% coupon:
- Multiplicative: 10% + 5%(của 90%) = 100,000 + 45,000 = **145,000** (14.5%)
- Additive: 10% + 5% = **150,000** (15%)

**→ Test case trong doc cũ sai: 10% + 5% ≠ 15%**

### 2.3. GAP Analysis - CalculatePromotionStep

**File**: `order/orchestration/steps/calculate-promotion.step.ts:76-179`

```typescript
// Line 94-95: Lấy orderSubtotal từ metadata
const orderSubtotal = (context.metadata.get('totalAmount') as number) ?? 0;

// Line 98: Build orderItems từ metadata
const orderItems = this.buildOrderItemsForPromotion(context);
// ⚠️ LỖI: buildOrderItemsForPromotion() đọc context.metadata.get('orderItems')
// NHƯNG CreateOrderItemsStep KHÔNG set metadata 'orderItems'

// Line 101-114: Build discount context
const discountContext: OrderDiscountContext = {
  workspaceId: context.workspaceId,
  customerId: input.customerId,
  orderItems,  // ⚠️ Luôn empty array []
  orderSubtotal,
  couponCode: input.couponCode,
  customerTags: context.metadata.get('customerTags'),  // ⚠️ KHÔNG ĐƯỢC SET
  isFirstOrder: context.metadata.get('isFirstOrder'),  // ⚠️ KHÔNG ĐƯỢC SET
  // ❌ THIẾU: customerTier
};
```

### 2.4. GAP Analysis - CreateOrderItemsStep

**File**: `order/orchestration/steps/create-order-items.step.ts`

**Metadata được set**:
- ✅ `totalAmount` (line 512, 550)
- ✅ `comboDiscount` (line 551)
- ✅ `appliedCombos` (line 554)
- ❌ **KHÔNG set** `orderItems`
- ❌ **KHÔNG set** `customerTags`
- ❌ **KHÔNG set** `isFirstOrder`
- ❌ **KHÔNG set** `customerTier`

### 2.5. Tổng hợp GAP

| Component | Gap | Severity |
|-----------|-----|----------|
| RuleEvaluationService | Tồn tại nhưng không được gọi | 🔴 Critical |
| PromotionValidationService | Không evaluate rules | 🔴 Critical |
| CalculatePromotionStep | Thiếu customerTier trong context | 🔴 Critical |
| CreateOrderItemsStep | Không set metadata orderItems | 🟡 Medium |
| CreateOrderItemsStep | Không set customerTags, isFirstOrder | 🟡 Medium |
| PromotionCalculationService | Stacking là multiplicative | 🟢 By Design |

---

## 3. Thiết kế giải pháp (Revised)

### 3.1. Stacking Semantics - QUYẾT ĐỊNH QUAN TRỌNG

**Option A: Additive (10% + 5% = 15%)**
- Pros: Đơn giản, dễ hiểu cho user
- Cons: Cần thay đổi PromotionCalculationService

**Option B: Multiplicative (10% + 5% = 14.5%)** ✅ RECOMMENDED
- Pros: Giữ nguyên logic hiện tại, phổ biến trong e-commerce
- Cons: Kết quả khác với cộng đơn thuần

**Option C: Tier promotion là exclusive (không stack với promotion khác)**
- Pros: Đơn giản nhất
- Cons: Hạn chế flexibility

**→ Chọn Option B**: Giữ multiplicative stacking, document rõ ràng.

### 3.2. Tier Promotion Policy

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER PROMOTION RULES                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. Mỗi customer chỉ được áp dụng 1 tier promotion               │
│    (Diamond customer không được áp cả Diamond + Gold)           │
│                                                                  │
│ 2. Tier promotion là stackable với coupon/other promotions      │
│    (Multiplicative stacking)                                     │
│                                                                  │
│ 3. Tier promotion có priority cao nhất (100)                    │
│    được áp dụng trước các promotion khác                        │
│                                                                  │
│ 4. Tier promotion là auto-apply (không cần coupon code)         │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3. Data Flow sau khi implement

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CreateOrderItemsStep (MODIFIED)                              │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │  Sau khi tạo order items, SET METADATA:                  │ │
│     │  - orderItems: [{ productId, quantity, unitPrice, ... }] │ │
│     │  - subtotal: number                                       │ │
│     │  - totalAmount: number (đã có)                           │ │
│     └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. NEW: PreparePromotionContextStep                             │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │  Lấy customer info và SET METADATA:                      │ │
│     │  - customerTier: MKT_CUSTOMER_TIER (enum value)          │ │
│     │  - customerTags: string[]                                 │ │
│     │  - isFirstOrder: boolean                                  │ │
│     └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. CalculatePromotionStep (MODIFIED)                            │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │  Build context với customerTier từ metadata              │ │
│     └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. PromotionApplicationService.calculateDiscount (MODIFIED)     │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │  1. Load promotions WITH rules (findByIdWithRules)       │ │
│     │  2. For each promotion:                                   │ │
│     │     - validatePromotion() (basic validation)             │ │
│     │     - evaluateRules() ← NEW: Gọi RuleEvaluationService   │ │
│     │  3. Filter applicable promotions                         │ │
│     │  4. Calculate discount                                    │ │
│     └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. RuleEvaluationService.evaluateCustomerTierRule (NEW)         │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │  Check: context.customerTier IN rule.targetIds           │ │
│     │  - DIAMOND in ['DIAMOND'] → passed                       │ │
│     │  - GOLD in ['DIAMOND'] → failed                          │ │
│     └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Chi tiết Implementation (Revised)

### 4.1. Files cần thay đổi

| # | File | Thay đổi | LOC |
|---|------|----------|-----|
| 1 | `mkt-promotion/constants/mkt-promotion.constants.ts` | Thêm CUSTOMER_TIER rule type | ~15 |
| 2 | `mkt-promotion/types/promotion.types.ts` | Thêm customerTier vào context | ~5 |
| 3 | `mkt-promotion/types/rule.types.ts` | Thêm customerTier vào RuleEvaluationContext | ~5 |
| 4 | `mkt-promotion/services/domain/rule-evaluation.service.ts` | Implement evaluateCustomerTierRule | ~50 |
| 5 | `mkt-promotion/services/application/promotion-application.service.ts` | **Gọi RuleEvaluationService** | ~30 |
| 6 | `order/types/order-promotion.types.ts` | Thêm customerTier | ~5 |
| 7 | `order/orchestration/steps/create-order-items.step.ts` | Set metadata orderItems | ~20 |
| 8 | `order/orchestration/steps/calculate-promotion.step.ts` | Lấy customer info, set customerTier | ~40 |

**Total: ~170 LOC**

### 4.2. Thay đổi chi tiết

#### 4.2.1. mkt-promotion/constants/mkt-promotion.constants.ts

```typescript
// THÊM vào PROMOTION_RULE_TYPE
export const PROMOTION_RULE_TYPE = {
  PRODUCT: 'PRODUCT',
  CATEGORY: 'CATEGORY',
  VARIANT: 'VARIANT',
  ORDER_VALUE: 'ORDER_VALUE',
  CUSTOMER_TAG: 'CUSTOMER_TAG',
  CUSTOMER_SEGMENT: 'CUSTOMER_SEGMENT',
  FIRST_ORDER: 'FIRST_ORDER',
  QUANTITY: 'QUANTITY',
  CUSTOMER_TIER: 'CUSTOMER_TIER',  // ← NEW
} as const;

// THÊM vào PROMOTION_RULE_TYPE_OPTIONS
export const PROMOTION_RULE_TYPE_OPTIONS = [
  // ...existing options
  {
    value: PROMOTION_RULE_TYPE.CUSTOMER_TIER,
    label: 'Customer Tier',
    color: 'purple' as TagColor,
    position: 8,
  },
];
```

#### 4.2.2. mkt-promotion/types/promotion.types.ts

```typescript
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';

export type PromotionEvaluationContext = {
  workspaceId: string;
  customerId: string;
  orderItems: OrderItemForPromotion[];
  orderSubtotal: number;
  couponCode?: string | null;
  customerTags?: string[];
  isFirstOrder?: boolean;
  customerTier?: MKT_CUSTOMER_TIER;  // ← NEW: Sử dụng enum type
};
```

#### 4.2.3. mkt-promotion/services/application/promotion-application.service.ts

```typescript
import { RuleEvaluationService } from 'src/mkt-core/mkt-promotion/services/domain/rule-evaluation.service';

@Injectable()
export class PromotionApplicationService {
  constructor(
    // ...existing
    private readonly ruleEvaluationService: RuleEvaluationService,  // ← NEW
  ) {}

  async calculateDiscount(
    workspaceId: string,
    context: PromotionEvaluationContext,
  ): Promise<AppliedPromotionsResult> {
    // Get active promotions WITH RULES
    const activePromotions = await this.getActivePromotions(workspaceId);
    const applicablePromotions: MktPromotionWorkspaceEntity[] = [];

    for (const promotion of activePromotions) {
      // 1. Basic validation (status, date, usage limit, minOrderAmount)
      const validation = await this.validationService.validatePromotion(
        promotion,
        context,
      );

      if (!validation.isValid) {
        continue;
      }

      // 2. NEW: Evaluate rules
      const promotionWithRules = await this.promotionRepository.findByIdWithRules(
        promotion.id,
      );

      if (promotionWithRules && promotionWithRules.rules.length > 0) {
        const ruleResult = await this.ruleEvaluationService.evaluateRules(
          promotionWithRules.rules,
          context,
        );

        if (!ruleResult.passed) {
          this.logger.debug(`Promotion ${promotion.code} failed rule evaluation`, {
            results: ruleResult.results,
          });
          continue;
        }
      }

      applicablePromotions.push(promotion);
    }

    return this.calculationService.calculateOrderDiscount(
      applicablePromotions,
      context,
    );
  }
}
```

#### 4.2.4. mkt-promotion/services/domain/rule-evaluation.service.ts

```typescript
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';

// THÊM case trong evaluateSingleRule() switch statement
case PROMOTION_RULE_TYPE.CUSTOMER_TIER: {
  const result = this.evaluateCustomerTierRule(rule, context);
  passed = result.passed;
  reason = result.reason;
  break;
}

// THÊM method mới
/**
 * Evaluate CUSTOMER_TIER rule - check if customer has specific tier
 *
 * Operators supported:
 * - IN: Customer tier must be in targetIds list
 * - NOT_IN: Customer tier must NOT be in targetIds list
 *
 * @example
 * // Rule: Only DIAMOND customers
 * { ruleType: 'CUSTOMER_TIER', operator: 'IN', targetIds: ['DIAMOND'] }
 *
 * // Rule: All except CHURNED and DORMANT
 * { ruleType: 'CUSTOMER_TIER', operator: 'NOT_IN', targetIds: ['CHURNED', 'DORMANT'] }
 */
private evaluateCustomerTierRule(
  rule: MktPromotionRuleWorkspaceEntity,
  context: PromotionEvaluationContext,
): { passed: boolean; reason: string | null } {
  if (!rule.targetIds || rule.targetIds.length === 0) {
    return { passed: false, reason: 'No target tier IDs specified' };
  }

  const customerTier = context.customerTier;

  if (!customerTier) {
    return {
      passed: false,
      reason: 'Customer tier not available in context'
    };
  }

  // Validate that customerTier is a valid MKT_CUSTOMER_TIER value
  const validTiers = Object.values(MKT_CUSTOMER_TIER);
  if (!validTiers.includes(customerTier)) {
    return {
      passed: false,
      reason: `Invalid customer tier: ${customerTier}`,
    };
  }

  switch (rule.operator) {
    case RULE_OPERATOR.IN: {
      const hasTier = rule.targetIds.includes(customerTier);

      return {
        passed: hasTier,
        reason: hasTier
          ? null
          : `Customer tier "${customerTier}" không đủ điều kiện. Yêu cầu: ${rule.targetIds.join(', ')}`,
      };
    }

    case RULE_OPERATOR.NOT_IN: {
      const hasTier = rule.targetIds.includes(customerTier);

      return {
        passed: !hasTier,
        reason: hasTier
          ? `Customer tier "${customerTier}" bị loại trừ khỏi promotion này`
          : null,
      };
    }

    default:
      return {
        passed: false,
        reason: `Unsupported operator for CUSTOMER_TIER rule: ${rule.operator}`,
      };
  }
}
```

#### 4.2.5. order/orchestration/steps/create-order-items.step.ts

```typescript
// Trong execute(), sau khi tạo order items và trước khi return success
// THÊM: Set metadata orderItems cho CalculatePromotionStep

// Build orderItems metadata for promotion evaluation
const orderItemsForMetadata = createdItems.map((item) => ({
  productId: item.externalMktProductId ?? '',
  variantId: item.externalMktPackageId ?? null,
  categoryId: null,  // Not available in current context
  quantity: item.quantity ?? 1,
  unitPrice: item.unitPrice ?? 0,
  totalPrice: item.totalPrice ?? 0,
}));

context.metadata.set('orderItems', orderItemsForMetadata);
context.metadata.set('subtotal', totals.subtotal);
```

#### 4.2.6. order/orchestration/steps/calculate-promotion.step.ts

```typescript
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktOrderRepository as OrderRepo } from 'src/mkt-core/order/repositories';

@Injectable()
export class CalculatePromotionStep extends SagaStep<...> {
  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly promotionIntegration: OrderPromotionIntegrationService,
    private readonly customerRepository: MktCustomerRepository,  // ← NEW
    private readonly orderRepo: OrderRepo,  // ← NEW: For checking first order
  ) {
    super();
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CalculatePromotionStepOutput>> {
    try {
      // ... existing validation

      // NEW: Fetch customer info for tier discount
      const customer = await this.customerRepository.findById(input.customerId);
      const customerTier = customer?.tier as MKT_CUSTOMER_TIER | undefined;
      const customerTags = customer?.tags ?? [];

      // NEW: Check if first order
      const existingOrderCount = await this.orderRepo.countByCustomerId(
        input.customerId,
      );
      const isFirstOrder = existingOrderCount === 0;

      // Get order info from metadata
      const orderSubtotal = (context.metadata.get('subtotal') as number)
        ?? (context.metadata.get('totalAmount') as number)
        ?? 0;
      const orderItems = this.buildOrderItemsForPromotion(context);

      // Build discount context with all required fields
      const discountContext: OrderDiscountContext = {
        workspaceId: context.workspaceId,
        customerId: input.customerId,
        orderItems,
        orderSubtotal,
        couponCode: input.couponCode,
        customerTags,       // ← NOW SET
        isFirstOrder,       // ← NOW SET
        customerTier,       // ← NEW
      };

      // Calculate discount
      const promotionResult = await this.promotionIntegration.calculateDiscount(
        discountContext,
      );

      // ... rest of the method
    } catch (error) {
      // ... error handling
    }
  }
}
```

#### 4.2.7. order/types/order-promotion.types.ts

```typescript
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';

export type OrderDiscountContext = {
  workspaceId: string;
  customerId: string;
  orderItems: OrderItemForPromotion[];
  orderSubtotal: number;
  couponCode?: string | null;
  customerTags?: string[];
  isFirstOrder?: boolean;
  customerTier?: MKT_CUSTOMER_TIER;  // ← NEW
};
```

---

## 5. Data Seeding (Revised)

### 5.1. Tier Promotions

**File**: `mkt-core/seeder/promotion-seeder/mkt-tier-promotion-data-seeds.constants.ts`

```typescript
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { PROMOTION_STATUS, PROMOTION_TYPE, PROMOTION_RULE_TYPE, RULE_OPERATOR, LOGIC_OPERATOR } from 'src/mkt-core/mkt-promotion/constants';

// Use fixed UUIDs for idempotent seeding
export const TIER_PROMOTION_IDS = {
  DIAMOND: '550e8400-e29b-41d4-a716-446655440001',
  GOLD: '550e8400-e29b-41d4-a716-446655440002',
  SILVER: '550e8400-e29b-41d4-a716-446655440003',
} as const;

export const TIER_PROMOTION_RULE_IDS = {
  DIAMOND: '550e8400-e29b-41d4-a716-446655440011',
  GOLD: '550e8400-e29b-41d4-a716-446655440012',
  SILVER: '550e8400-e29b-41d4-a716-446655440013',
} as const;

export const TIER_PROMOTION_SEEDS = [
  {
    id: TIER_PROMOTION_IDS.DIAMOND,
    name: 'Diamond Member - 15% Off',
    code: 'TIER_DIAMOND_15',
    description: 'Ưu đãi 15% cho khách hàng hạng Kim Cương',
    promotionType: PROMOTION_TYPE.PERCENTAGE,
    discountValue: 15,
    maxDiscountAmount: null,
    minOrderAmount: 0,
    startDate: DateTimeUtils.toDateRequired(DateTimeUtils.fromISO('2024-01-01T00:00:00Z')),
    endDate: null,
    usageLimit: null,
    usageLimitPerCustomer: null,
    priority: 100,  // Highest priority for tier promotions
    stackable: true,
    isAutoApply: true,
    status: PROMOTION_STATUS.ACTIVE,
    currentUsageCount: 0,
    currency: 'VND',
    metadata: null,
  },
  {
    id: TIER_PROMOTION_IDS.GOLD,
    name: 'Gold Member - 10% Off',
    code: 'TIER_GOLD_10',
    description: 'Ưu đãi 10% cho khách hàng hạng Vàng',
    promotionType: PROMOTION_TYPE.PERCENTAGE,
    discountValue: 10,
    maxDiscountAmount: null,
    minOrderAmount: 0,
    startDate: DateTimeUtils.toDateRequired(DateTimeUtils.fromISO('2024-01-01T00:00:00Z')),
    endDate: null,
    usageLimit: null,
    usageLimitPerCustomer: null,
    priority: 100,
    stackable: true,
    isAutoApply: true,
    status: PROMOTION_STATUS.ACTIVE,
    currentUsageCount: 0,
    currency: 'VND',
    metadata: null,
  },
  {
    id: TIER_PROMOTION_IDS.SILVER,
    name: 'Silver Member - 5% Off',
    code: 'TIER_SILVER_5',
    description: 'Ưu đãi 5% cho khách hàng hạng Bạc',
    promotionType: PROMOTION_TYPE.PERCENTAGE,
    discountValue: 5,
    maxDiscountAmount: null,
    minOrderAmount: 0,
    startDate: DateTimeUtils.toDateRequired(DateTimeUtils.fromISO('2024-01-01T00:00:00Z')),
    endDate: null,
    usageLimit: null,
    usageLimitPerCustomer: null,
    priority: 100,
    stackable: true,
    isAutoApply: true,
    status: PROMOTION_STATUS.ACTIVE,
    currentUsageCount: 0,
    currency: 'VND',
    metadata: null,
  },
];

export const TIER_PROMOTION_RULE_SEEDS = [
  {
    id: TIER_PROMOTION_RULE_IDS.DIAMOND,
    promotionId: TIER_PROMOTION_IDS.DIAMOND,
    name: 'Diamond Tier Required',
    ruleType: PROMOTION_RULE_TYPE.CUSTOMER_TIER,
    operator: RULE_OPERATOR.IN,
    targetIds: [MKT_CUSTOMER_TIER.DIAMOND],
    targetValues: null,
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 0,
  },
  {
    id: TIER_PROMOTION_RULE_IDS.GOLD,
    promotionId: TIER_PROMOTION_IDS.GOLD,
    name: 'Gold Tier Required',
    ruleType: PROMOTION_RULE_TYPE.CUSTOMER_TIER,
    operator: RULE_OPERATOR.IN,
    targetIds: [MKT_CUSTOMER_TIER.GOLD],
    targetValues: null,
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 0,
  },
  {
    id: TIER_PROMOTION_RULE_IDS.SILVER,
    promotionId: TIER_PROMOTION_IDS.SILVER,
    name: 'Silver Tier Required',
    ruleType: PROMOTION_RULE_TYPE.CUSTOMER_TIER,
    operator: RULE_OPERATOR.IN,
    targetIds: [MKT_CUSTOMER_TIER.SILVER],
    targetValues: null,
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 0,
  },
];
```

---

## 6. Test Cases (Revised)

### 6.1. Unit Tests - RuleEvaluationService

```typescript
describe('RuleEvaluationService', () => {
  describe('evaluateCustomerTierRule', () => {
    it('should pass when customer tier is in target tiers', async () => {
      const rule = createMockRule({
        ruleType: PROMOTION_RULE_TYPE.CUSTOMER_TIER,
        operator: RULE_OPERATOR.IN,
        targetIds: [MKT_CUSTOMER_TIER.DIAMOND, MKT_CUSTOMER_TIER.GOLD],
      });
      const context = createMockContext({
        customerTier: MKT_CUSTOMER_TIER.DIAMOND
      });

      const result = await service.evaluateSingleRule(rule, context);

      expect(result.passed).toBe(true);
      expect(result.reason).toBeNull();
    });

    it('should fail when customer tier is not in target tiers', async () => {
      const rule = createMockRule({
        ruleType: PROMOTION_RULE_TYPE.CUSTOMER_TIER,
        operator: RULE_OPERATOR.IN,
        targetIds: [MKT_CUSTOMER_TIER.DIAMOND],
      });
      const context = createMockContext({
        customerTier: MKT_CUSTOMER_TIER.BRONZE
      });

      const result = await service.evaluateSingleRule(rule, context);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain('không đủ điều kiện');
    });

    it('should pass NOT_IN when customer tier is not excluded', async () => {
      const rule = createMockRule({
        ruleType: PROMOTION_RULE_TYPE.CUSTOMER_TIER,
        operator: RULE_OPERATOR.NOT_IN,
        targetIds: [MKT_CUSTOMER_TIER.CHURNED, MKT_CUSTOMER_TIER.DORMANT],
      });
      const context = createMockContext({
        customerTier: MKT_CUSTOMER_TIER.GOLD
      });

      const result = await service.evaluateSingleRule(rule, context);

      expect(result.passed).toBe(true);
    });

    it('should fail when customerTier is undefined', async () => {
      const rule = createMockRule({
        ruleType: PROMOTION_RULE_TYPE.CUSTOMER_TIER,
        operator: RULE_OPERATOR.IN,
        targetIds: [MKT_CUSTOMER_TIER.DIAMOND],
      });
      const context = createMockContext({ customerTier: undefined });

      const result = await service.evaluateSingleRule(rule, context);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain('not available');
    });

    it('should fail when targetIds is empty', async () => {
      const rule = createMockRule({
        ruleType: PROMOTION_RULE_TYPE.CUSTOMER_TIER,
        operator: RULE_OPERATOR.IN,
        targetIds: [],
      });
      const context = createMockContext({
        customerTier: MKT_CUSTOMER_TIER.DIAMOND
      });

      const result = await service.evaluateSingleRule(rule, context);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain('No target tier');
    });
  });
});
```

### 6.2. Integration Tests - Order with Tier Discount

```typescript
describe('Order with Tier Discount (Integration)', () => {

  it('should apply 15% discount for DIAMOND customer', async () => {
    // Arrange
    const customer = await createCustomer({ tier: MKT_CUSTOMER_TIER.DIAMOND });
    const orderInput = createOrderInput({
      customerId: customer.id,
      externalProducts: [{ productId: 'prod-1', quantity: 1 }],
    });
    // Assume product price = 1,000,000

    // Act
    const order = await orderService.createOrderWithItems(orderInput);

    // Assert
    expect(order.promotionDiscount).toBe(150000); // 15% of 1M
    expect(order.totalAmount).toBe(850000);
    expect(order.appliedPromotions).toContainEqual(
      expect.objectContaining({
        promotionCode: 'TIER_DIAMOND_15',
        discountAmount: 150000,
      }),
    );
  });

  it('should apply MULTIPLICATIVE stacking with tier + coupon', async () => {
    // Arrange
    const customer = await createCustomer({ tier: MKT_CUSTOMER_TIER.GOLD }); // 10%
    const couponPromotion = await createPromotion({
      discountType: 'PERCENTAGE',
      discountValue: 5,
      stackable: true,
    });
    const coupon = await createCoupon({ promotionId: couponPromotion.id });

    const orderInput = createOrderInput({
      customerId: customer.id,
      couponCode: coupon.code,
      externalProducts: [{ productId: 'prod-1', quantity: 1 }], // 1,000,000
    });

    // Act
    const order = await orderService.createOrderWithItems(orderInput);

    // Assert - MULTIPLICATIVE stacking
    // Tier 10%: 1,000,000 * 10% = 100,000 → remaining = 900,000
    // Coupon 5%: 900,000 * 5% = 45,000
    // Total discount = 145,000 (NOT 150,000)
    expect(order.promotionDiscount).toBe(145000);
    expect(order.totalAmount).toBe(855000);
    expect(order.appliedPromotions).toHaveLength(2);
  });

  it('should NOT apply tier discount for BRONZE customer (0%)', async () => {
    // Arrange
    const customer = await createCustomer({ tier: MKT_CUSTOMER_TIER.BRONZE });
    const orderInput = createOrderInput({
      customerId: customer.id,
      externalProducts: [{ productId: 'prod-1', quantity: 1 }],
    });

    // Act
    const order = await orderService.createOrderWithItems(orderInput);

    // Assert - No tier discount for BRONZE (no promotion configured)
    expect(order.promotionDiscount).toBe(0);
    expect(order.appliedPromotions).toHaveLength(0);
  });

  it('should apply only ONE tier promotion per customer', async () => {
    // Arrange - Customer is DIAMOND but somehow both DIAMOND and GOLD promotions exist
    const customer = await createCustomer({ tier: MKT_CUSTOMER_TIER.DIAMOND });
    const orderInput = createOrderInput({
      customerId: customer.id,
      externalProducts: [{ productId: 'prod-1', quantity: 1 }],
    });

    // Act
    const order = await orderService.createOrderWithItems(orderInput);

    // Assert - Only DIAMOND promotion applied (tier rule filters out GOLD)
    const tierPromotions = order.appliedPromotions?.filter(
      (p) => p.promotionCode.startsWith('TIER_')
    );
    expect(tierPromotions).toHaveLength(1);
    expect(tierPromotions[0].promotionCode).toBe('TIER_DIAMOND_15');
  });

  it('should handle customer without tier gracefully', async () => {
    // Arrange
    const customer = await createCustomer({ tier: null });
    const orderInput = createOrderInput({
      customerId: customer.id,
      externalProducts: [{ productId: 'prod-1', quantity: 1 }],
    });

    // Act
    const order = await orderService.createOrderWithItems(orderInput);

    // Assert - No tier discount, but order created successfully
    expect(order.promotionDiscount).toBe(0);
    expect(order.totalAmount).toBe(1000000);
  });
});
```

### 6.3. Edge Cases

```typescript
describe('Edge Cases', () => {
  it('should handle DORMANT/CHURNED tiers (no discount)', async () => {
    const customer = await createCustomer({ tier: MKT_CUSTOMER_TIER.DORMANT });
    const order = await orderService.createOrderWithItems({
      customerId: customer.id,
      externalProducts: [{ productId: 'prod-1', quantity: 1 }],
    });

    expect(order.promotionDiscount).toBe(0);
  });

  it('should handle tier promotion disabled (PAUSED status)', async () => {
    // Pause the DIAMOND tier promotion
    await promotionService.pausePromotion(
      workspaceId,
      TIER_PROMOTION_IDS.DIAMOND,
      'admin'
    );

    const customer = await createCustomer({ tier: MKT_CUSTOMER_TIER.DIAMOND });
    const order = await orderService.createOrderWithItems({
      customerId: customer.id,
      externalProducts: [{ productId: 'prod-1', quantity: 1 }],
    });

    expect(order.promotionDiscount).toBe(0);
  });

  it('should respect minOrderAmount even for tier promotions', async () => {
    // Update DIAMOND promotion to require minOrderAmount = 500,000
    await promotionService.updatePromotion(workspaceId, {
      id: TIER_PROMOTION_IDS.DIAMOND,
      minOrderAmount: 500000,
    }, 'admin');

    const customer = await createCustomer({ tier: MKT_CUSTOMER_TIER.DIAMOND });

    // Order = 300,000 (below minOrderAmount)
    const order = await orderService.createOrderWithItems({
      customerId: customer.id,
      externalProducts: [{ productId: 'prod-cheap', quantity: 1 }], // 300,000
    });

    expect(order.promotionDiscount).toBe(0); // Tier discount not applied
  });
});
```

---

## 7. Rollback Plan

### 7.1. Rollback Steps

Nếu cần rollback, thực hiện các bước sau:

**Step 1: Disable tier promotions trong database:**
```sql
UPDATE "mktPromotion"
SET status = 'CANCELLED', "updatedAt" = NOW()
WHERE code IN ('TIER_DIAMOND_15', 'TIER_GOLD_10', 'TIER_SILVER_5');
```

**Step 2: Revert code changes:**
```bash
git revert <commit-hash>
```

**Step 3: Verify:**
- Tạo order mới và confirm không có tier discount
- Check existing orders không bị ảnh hưởng (appliedPromotions là immutable snapshot)

### 7.2. Feature Flag (Recommended)

```typescript
// .env
FEATURE_TIER_DISCOUNT_ENABLED=true

// In CalculatePromotionStep
if (this.configService.get('FEATURE_TIER_DISCOUNT_ENABLED', true)) {
  discountContext.customerTier = customerTier;
}
```

---

## 8. Checklist triển khai

### 8.1. Pre-Implementation

- [ ] Review và approve design doc
- [ ] Confirm stacking semantics (multiplicative)
- [ ] Confirm tier promotion policy (1 per customer, auto-apply, stackable)

### 8.2. Implementation

- [ ] Thêm CUSTOMER_TIER vào PROMOTION_RULE_TYPE
- [ ] Implement evaluateCustomerTierRule() trong RuleEvaluationService
- [ ] **Integrate RuleEvaluationService vào PromotionApplicationService.calculateDiscount()**
- [ ] Update CreateOrderItemsStep để set metadata orderItems
- [ ] Update CalculatePromotionStep để fetch customer tier và set context
- [ ] Update types (PromotionEvaluationContext, OrderDiscountContext)

### 8.3. Testing

- [ ] Unit tests cho evaluateCustomerTierRule()
- [ ] Unit tests cho PromotionApplicationService với rules
- [ ] Integration tests cho order với tier discount
- [ ] Edge case tests

### 8.4. Data

- [ ] Tạo tier promotion seed file
- [ ] Run seeder trên dev environment
- [ ] Verify tier promotions trong database

### 8.5. Pre-Deployment

- [ ] Code review passed
- [ ] All tests pass
- [ ] Feature flag implemented (optional)
- [ ] Staging deployment và QA test

### 8.6. Post-Deployment

- [ ] Monitor error logs
- [ ] Verify tier discounts applied correctly
- [ ] Document any issues

---

## 9. Timeline (Revised)

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Review & approve design doc | 0.5 day |
| 2 | Implement code changes | 1.5 days |
| 3 | Write unit tests | 0.5 day |
| 4 | Write integration tests | 0.5 day |
| 5 | Data seeding | 0.5 day |
| 6 | Code review | 0.5 day |
| 7 | QA testing | 1 day |
| 8 | Deploy to staging | 0.5 day |
| 9 | UAT | 1 day |
| 10 | Deploy to production | 0.5 day |

**Total: ~7 days**

---

## 10. References

- **Promotion Module**: `mkt-core/mkt-promotion/`
- **Order Saga**: `mkt-core/order/orchestration/saga/`
- **Customer Tier Constants**: `mkt-core/customer/constants/mkt-customer.constant.ts`
- **RuleEvaluationService**: `mkt-core/mkt-promotion/services/domain/rule-evaluation.service.ts`
