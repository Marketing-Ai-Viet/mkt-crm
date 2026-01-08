# CalculatePromotionStep - Tính toán khuyến mãi cho đơn hàng

## Tổng quan

`CalculatePromotionStep` là một bước trong Order Saga Pattern, chịu trách nhiệm tính toán và áp dụng các chương trình khuyến mãi/giảm giá cho đơn hàng.

**File:** `packages/twenty-server/src/mkt-core/order/orchestration/steps/calculate-promotion.step.ts`

## Luồng xử lý

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CalculatePromotionStep                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. shouldSkip() - Kiểm tra có cần chạy step không                  │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────┐                   │
│  │ applyAutoPromotions = false AND !couponCode? │                   │
│  │              => SKIP step                     │                   │
│  └──────────────────────────────────────────────┘                   │
│         │                                                           │
│         ▼                                                           │
│  2. execute() - Thực hiện tính toán                                 │
│         │                                                           │
│         ├── 2.1 Lấy orderSubtotal từ context                        │
│         │                                                           │
│         ├── 2.2 Build orderItems cho promotion evaluation           │
│         │                                                           │
│         ├── 2.3 Gọi promotionIntegration.calculateDiscount()        │
│         │                                                           │
│         ├── 2.4 Update order với promotion data                     │
│         │                                                           │
│         └── 2.5 Lưu rollback data cho compensate                    │
│                                                                     │
│  3. compensate() - Rollback khi có lỗi                              │
│         │                                                           │
│         └── Reset promotion fields về giá trị mặc định              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Chi tiết các bước

### 1. shouldSkip() - Điều kiện bỏ qua

Step sẽ bị **SKIP** khi:
- `applyAutoPromotions = false` (không tự động áp dụng khuyến mãi)
- VÀ không có `couponCode` (không có mã giảm giá)

```typescript
shouldSkip(_context: SagaContext, input: CreateOrderWithItemsInput): boolean {
  const applyAutoPromotions = input.applyAutoPromotions ?? true; // default: true
  const hasCoupon = !!input.couponCode;

  if (!applyAutoPromotions && !hasCoupon) {
    return true; // Skip step
  }
  return false;
}
```

### 2. execute() - Thực hiện tính toán

#### 2.1 Lấy thông tin từ context

```typescript
// Lấy totalAmount đã được tính từ CreateOrderItemsStep
const orderSubtotal = context.metadata.get('totalAmount') ?? 0;
```

#### 2.2 Build OrderItems cho Promotion Evaluation

```typescript
// Convert order items sang format cho promotion module
const orderItems: OrderItemForPromotion[] = [
  {
    productId: "external-product-id",
    variantId: "external-package-id",
    categoryId: null,
    quantity: 1,
    unitPrice: 1000000,
    totalPrice: 1000000,
  }
];
```

#### 2.3 Build Discount Context

```typescript
const discountContext: OrderDiscountContext = {
  workspaceId: context.workspaceId,
  customerId: input.customerId,
  orderItems: orderItems,
  orderSubtotal: orderSubtotal,
  couponCode: input.couponCode,         // Mã coupon (nếu có)
  customerTags: ['VIP', 'GOLD'],        // Tags khách hàng
  isFirstOrder: true,                   // Đơn hàng đầu tiên?
};
```

#### 2.4 Gọi Promotion Integration Service

```typescript
const promotionResult = await this.promotionIntegration.calculateDiscount(discountContext);

// Kết quả trả về:
// {
//   success: true,
//   totalDiscount: 100000,
//   finalOrderAmount: 900000,
//   promotions: [
//     {
//       promotionId: "xxx",
//       promotionCode: "PROMO10",
//       promotionName: "Giảm 10%",
//       promotionType: "PERCENTAGE",
//       discountValue: 10,
//       couponCode: "SALE2024",
//       discountAmount: 100000,
//       appliedAt: "2024-01-15T10:30:00Z",
//       checksum: "abc123..."
//     }
//   ]
// }
```

#### 2.5 Update Order với Promotion Data

```typescript
await this.orderRepository.update(workspaceId, orderId, {
  couponCode: "SALE2024",              // Mã coupon đã dùng
  promotionDiscount: 100000,           // Tổng discount
  appliedPromotions: [...snapshots],   // Array các promotion đã áp dụng
  totalAmount: finalAmount,            // Tổng tiền sau giảm giá
});
```

#### 2.6 Lưu vào Context cho các step tiếp theo

```typescript
context.metadata.set('promotionResult', promotionResult);
context.metadata.set('appliedPromotions', promotionResult.promotions);
context.metadata.set('promotionDiscount', promotionResult.totalDiscount);

// Rollback data
context.rollbackData.set('calculate_promotion', {
  orderId: context.orderId,
  originalTotalAmount: orderSubtotal,
});
```

### 3. compensate() - Rollback khi có lỗi

Khi saga fail và cần rollback, step sẽ:

```typescript
async compensate(context: SagaContext): Promise<void> {
  // Reset promotion fields
  await this.orderRepository.update(workspaceId, orderId, {
    couponCode: null,
    promotionDiscount: 0,
    appliedPromotions: null,
    totalAmount: originalTotalAmount,  // Khôi phục giá gốc
  });

  // Clear metadata
  context.metadata.delete('promotionResult');
  context.metadata.delete('appliedPromotions');
  context.metadata.delete('promotionDiscount');
}
```

## Promotion Integration Service

### Luồng tính toán discount

```
┌─────────────────────────────────────────────────────────────────────┐
│              OrderPromotionIntegrationService                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  calculateDiscount(context)                                         │
│         │                                                           │
│         ├── 1. buildEvaluationContext(context)                      │
│         │        └── Convert sang PromotionEvaluationContext        │
│         │                                                           │
│         ├── 2. promotionService.calculateDiscount()                 │
│         │        ├── Tìm promotions đang active                     │
│         │        ├── Check điều kiện (min order, customer tags...)  │
│         │        ├── Validate coupon (nếu có)                       │
│         │        └── Tính discount cho từng promotion               │
│         │                                                           │
│         └── 3. createPromotionSnapshots()                           │
│                  ├── Tạo immutable snapshot cho mỗi promotion       │
│                  └── Generate checksum (SHA-256)                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Promotion Snapshot Structure

```typescript
type PromotionSnapshot = {
  promotionId: string;           // ID promotion
  promotionCode: string;         // Mã promotion
  promotionName: string;         // Tên promotion
  promotionType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y';
  discountValue: number;         // Giá trị (10 = 10% hoặc 100000đ)
  couponCode: string | null;     // Mã coupon đã dùng
  discountAmount: number;        // Số tiền được giảm
  appliedAt: string;             // Thời điểm áp dụng (ISO string)
  checksum: string;              // SHA-256 hash để verify integrity
};
```

## Xử lý lỗi

### Trường hợp promotion fail

Nếu tính toán promotion fail, step vẫn trả về **success** với discount = 0:

```typescript
if (!promotionResult.success) {
  this.logger.warn('Promotion calculation failed', { errors: promotionResult.errors });

  // Return success với empty promotions
  return {
    success: true,
    data: {
      promotionResult,
      appliedPromotions: [],
      totalDiscount: 0,
      finalAmount: orderSubtotal,  // Giữ nguyên giá gốc
    },
  };
}
```

**Lý do:** Promotion là tính năng optional, không nên block việc tạo đơn hàng.

## Sequence Diagram

```
┌────────┐     ┌──────────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│ Client │     │ CalculatePromotion   │     │ PromotionIntegration│     │ OrderRepo    │
└───┬────┘     │       Step           │     │      Service        │     └──────┬───────┘
    │          └──────────┬───────────┘     └──────────┬──────────┘            │
    │                     │                            │                        │
    │   execute()         │                            │                        │
    │────────────────────►│                            │                        │
    │                     │                            │                        │
    │                     │ buildOrderItemsForPromotion│                        │
    │                     │───────────────────────────►│                        │
    │                     │                            │                        │
    │                     │ calculateDiscount()        │                        │
    │                     │───────────────────────────►│                        │
    │                     │                            │                        │
    │                     │                            │  Query promotions      │
    │                     │                            │────────────────────────►
    │                     │                            │                        │
    │                     │                            │  Promotions            │
    │                     │                            │◄────────────────────────
    │                     │                            │                        │
    │                     │   OrderPromotionResult     │                        │
    │                     │◄───────────────────────────│                        │
    │                     │                            │                        │
    │                     │                      updateOrderPromotions()        │
    │                     │────────────────────────────────────────────────────►│
    │                     │                            │                        │
    │                     │                            │                        │
    │   StepResult        │                            │                        │
    │◄────────────────────│                            │                        │
    │                     │                            │                        │
```

## Liên kết với các Step khác

```
CreateOrderStep
      │
      ▼
CreateOrderItemsStep  ──► Set totalAmount vào context.metadata
      │
      ▼
CalculatePromotionStep ◄── Lấy totalAmount từ context.metadata
      │                    Update lại totalAmount sau khi giảm giá
      ▼
RecordPromotionUsageStep ◄── Lấy promotions từ context.metadata
      │
      ▼
CreateLicensesStep
```

## Ví dụ thực tế

### Input

```typescript
const input: CreateOrderWithItemsInput = {
  customerId: "customer-123",
  externalProducts: [
    { productId: "prod-1", packageId: "pkg-1", maxDevices: 1 }
  ],
  couponCode: "NEWYEAR2024",
  applyAutoPromotions: true,
  action: "NEW_ORDER",
};
```

### Output

```typescript
const result: CalculatePromotionStepOutput = {
  promotionResult: {
    success: true,
    totalDiscount: 200000,
    finalOrderAmount: 1800000,
    promotions: [
      {
        promotionId: "promo-1",
        promotionCode: "NEWYEAR2024",
        promotionName: "Giảm 10% đầu năm",
        promotionType: "PERCENTAGE",
        discountValue: 10,
        couponCode: "NEWYEAR2024",
        discountAmount: 200000,
        appliedAt: "2024-01-01T00:00:00Z",
        checksum: "a1b2c3d4e5f6..."
      }
    ]
  },
  appliedPromotions: [...],
  totalDiscount: 200000,
  finalAmount: 1800000,
};
```

## Notes

1. **Promotion là Optional** - Step không fail nếu promotion calculation fail
2. **Immutable Snapshots** - Dữ liệu promotion được snapshot tại thời điểm đặt hàng
3. **Checksum Verification** - Mỗi snapshot có checksum SHA-256 để verify integrity
4. **Saga Compensation** - Hỗ trợ rollback đầy đủ khi saga fail
