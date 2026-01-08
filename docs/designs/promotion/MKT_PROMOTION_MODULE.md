# MKT-PROMOTION MODULE

Module quản lý khuyến mãi và giảm giá toàn diện, hỗ trợ nhiều loại discount, quy tắc linh hoạt, theo dõi sử dụng và tự động áp dụng discount cho đơn hàng.

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Data Model](#2-data-model)
3. [Các loại khuyến mãi](#3-các-loại-khuyến-mãi)
4. [Hệ thống Rules](#4-hệ-thống-rules)
5. [Coupon/Mã giảm giá](#5-couponmã-giảm-giá)
6. [Quy trình áp dụng khuyến mãi](#6-quy-trình-áp-dụng-khuyến-mãi)
7. [Stacking (Kết hợp khuyến mãi)](#7-stacking-kết-hợp-khuyến-mãi)
8. [Background Jobs](#8-background-jobs)
9. [Events & Listeners](#9-events--listeners)
10. [Caching Strategy](#10-caching-strategy)
11. [GraphQL API](#11-graphql-api)

---

## 1. Tổng quan

### Mục đích

Module mkt-promotion cho phép doanh nghiệp tạo các chiến dịch marketing với:
- Nhiều loại giảm giá (%, cố định, mua X tặng Y, miễn phí ship)
- Điều kiện áp dụng linh hoạt (sản phẩm, danh mục, giá trị đơn hàng, khách hàng)
- Giới hạn sử dụng (tổng và theo khách hàng)
- Tự động áp dụng hoặc yêu cầu mã coupon

### Kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                      GraphQL Resolvers                       │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐  │
│  │ PromotionApp    │ │ CouponApp       │ │ UsageApp      │  │
│  │ Service         │ │ Service         │ │ Service       │  │
│  └─────────────────┘ └─────────────────┘ └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐  │
│  │ Validation      │ │ Calculation     │ │ RuleEvaluation│  │
│  │ Service         │ │ Service         │ │ Service       │  │
│  └─────────────────┘ └─────────────────┘ └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                       │
│  ┌─────────────────┐ ┌─────────────────┐                    │
│  │ Cache Service   │ │ Notification    │                    │
│  │ (Redis)         │ │ Service         │                    │
│  └─────────────────┘ └─────────────────┘                    │
├─────────────────────────────────────────────────────────────┤
│                      Repositories                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Promotion │ │  Rule    │ │ Coupon   │ │  Usage   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Data Model

### 2.1 MktPromotion (Chương trình khuyến mãi)

| Field | Type | Mô tả |
|-------|------|-------|
| `name` | TEXT | Tên khuyến mãi |
| `code` | TEXT | Mã khuyến mãi (unique) |
| `description` | TEXT | Mô tả chi tiết |
| `status` | SELECT | Trạng thái: DRAFT, ACTIVE, PAUSED, EXPIRED, CANCELLED |
| `promotionType` | SELECT | Loại: PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y, FREE_SHIPPING |
| `discountValue` | NUMBER | Giá trị giảm (% hoặc số tiền) |
| `maxDiscountAmount` | NUMBER | Giảm tối đa (cho % discount) |
| `minOrderAmount` | NUMBER | Giá trị đơn hàng tối thiểu |
| `currency` | TEXT | Đơn vị tiền tệ (default: VND) |
| `startDate` | DATETIME | Ngày bắt đầu |
| `endDate` | DATETIME | Ngày kết thúc |
| `usageLimit` | NUMBER | Giới hạn tổng số lần sử dụng |
| `usageLimitPerCustomer` | NUMBER | Giới hạn mỗi khách hàng |
| `currentUsageCount` | NUMBER | Số lần đã sử dụng |
| `priority` | NUMBER | Độ ưu tiên (cao hơn = áp dụng trước) |
| `stackable` | BOOLEAN | Có thể kết hợp với KM khác |
| `isAutoApply` | BOOLEAN | Tự động áp dụng không cần mã |
| `metadata` | JSON | Cấu hình bổ sung (BUY_X_GET_Y) |

**Vòng đời trạng thái:**

```
         ┌──────────┐
         │  DRAFT   │
         └────┬─────┘
              │ activate()
              ▼
         ┌──────────┐
    ┌────│  ACTIVE  │────┐
    │    └────┬─────┘    │
    │         │          │
pause()    expire()   cancel()
    │         │          │
    ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌──────────┐
│ PAUSED │ │EXPIRED │ │CANCELLED │
└────────┘ └────────┘ └──────────┘
    │
    │ activate()
    └──────────────► ACTIVE
```

### 2.2 MktPromotionRule (Quy tắc áp dụng)

| Field | Type | Mô tả |
|-------|------|-------|
| `name` | TEXT | Tên rule |
| `ruleType` | SELECT | Loại rule (8 loại) |
| `operator` | TEXT | Toán tử so sánh |
| `targetIds` | ARRAY | Danh sách ID mục tiêu |
| `targetValues` | JSON | Giá trị so sánh |
| `isRequired` | BOOLEAN | Bắt buộc phải thỏa mãn |
| `logicOperator` | TEXT | AND/OR với rule khác |
| `position` | NUMBER | Thứ tự đánh giá |

### 2.3 MktCoupon (Mã giảm giá)

| Field | Type | Mô tả |
|-------|------|-------|
| `code` | TEXT | Mã coupon (unique) |
| `status` | SELECT | ACTIVE, USED, EXPIRED, DISABLED |
| `usageLimit` | NUMBER | Giới hạn sử dụng |
| `currentUsageCount` | NUMBER | Số lần đã dùng |
| `validFrom` | DATETIME | Hiệu lực từ |
| `validTo` | DATETIME | Hiệu lực đến |
| `assignedCustomerId` | UUID | Gán cho KH cụ thể |
| `promotionId` | UUID | Thuộc promotion nào |

### 2.4 MktPromotionUsage (Lịch sử sử dụng)

| Field | Type | Mô tả |
|-------|------|-------|
| `discountAmount` | NUMBER | Số tiền đã giảm |
| `originalAmount` | NUMBER | Giá gốc trước giảm |
| `appliedAt` | DATETIME | Thời điểm áp dụng |
| `metadata` | JSON | Chi tiết tính toán |
| `promotionId` | UUID | Promotion được dùng |
| `couponId` | UUID | Coupon được dùng |
| `orderId` | UUID | Đơn hàng áp dụng |
| `customerId` | UUID | Khách hàng |

### 2.5 Quan hệ giữa các Entity

```
MktPromotion (1) ──┬── (N) MktPromotionRule
                   ├── (N) MktCoupon
                   ├── (N) MktPromotionUsage
                   └── (N) MktPromotionAudit

MktCoupon (N) ──┬── (1) MktPromotion
                ├── (N) MktPromotionUsage
                └── (1) MktCustomer [optional]

MktPromotionUsage (N) ──┬── (1) MktPromotion
                        ├── (1) MktCoupon [optional]
                        ├── (1) MktOrder
                        └── (1) MktCustomer
```

---

## 3. Các loại khuyến mãi

### 3.1 PERCENTAGE (Giảm theo %)

```typescript
// Ví dụ: Giảm 20%, tối đa 100,000đ
{
  promotionType: 'PERCENTAGE',
  discountValue: 20,           // 20%
  maxDiscountAmount: 100000,   // Giảm tối đa 100k
  minOrderAmount: 200000       // Đơn tối thiểu 200k
}

// Tính toán:
// Đơn hàng 500,000đ → Giảm = min(500000 * 20%, 100000) = 100,000đ
// Đơn hàng 300,000đ → Giảm = min(300000 * 20%, 100000) = 60,000đ
```

### 3.2 FIXED_AMOUNT (Giảm số tiền cố định)

```typescript
// Ví dụ: Giảm 50,000đ cho đơn từ 300k
{
  promotionType: 'FIXED_AMOUNT',
  discountValue: 50000,        // Giảm 50k
  minOrderAmount: 300000       // Đơn tối thiểu 300k
}

// Tính toán:
// Đơn hàng 500,000đ → Giảm = 50,000đ
// Đơn hàng 200,000đ → Không đủ điều kiện
```

### 3.3 BUY_X_GET_Y (Mua X tặng Y)

```typescript
// Ví dụ: Mua 2 sản phẩm A, tặng 1 sản phẩm B (giảm 100%)
{
  promotionType: 'BUY_X_GET_Y',
  discountValue: 100,          // 100% (miễn phí)
  metadata: {
    buyQuantity: 2,            // Mua 2
    getQuantity: 1,            // Tặng 1
    buyProductIds: ['prod-A'], // Sản phẩm cần mua
    getProductIds: ['prod-B'], // Sản phẩm được tặng
    discountPercent: 100,      // Giảm 100% (tặng)
    maxApplications: 1         // Áp dụng tối đa 1 lần/đơn
  }
}
```

### 3.4 FREE_SHIPPING (Miễn phí vận chuyển)

```typescript
// Ví dụ: Miễn phí ship cho đơn từ 500k
{
  promotionType: 'FREE_SHIPPING',
  discountValue: 0,            // Không giảm subtotal
  minOrderAmount: 500000
}

// Note: Xử lý ở tầng shipping, không giảm subtotal
```

---

## 4. Hệ thống Rules

### 4.1 Các loại Rule

| Rule Type | Mô tả | Operators hỗ trợ |
|-----------|-------|------------------|
| `PRODUCT` | Sản phẩm cụ thể | IN, NOT_IN |
| `CATEGORY` | Danh mục sản phẩm | IN, NOT_IN |
| `VARIANT` | Biến thể sản phẩm | IN, NOT_IN |
| `ORDER_VALUE` | Giá trị đơn hàng | GREATER_THAN, LESS_THAN, BETWEEN, EQUALS |
| `CUSTOMER_TAG` | Tag khách hàng | IN, NOT_IN, CONTAINS |
| `CUSTOMER_SEGMENT` | Phân khúc KH | IN, NOT_IN |
| `FIRST_ORDER` | Đơn hàng đầu tiên | EQUALS (true/false) |
| `QUANTITY` | Số lượng sản phẩm | GREATER_THAN, LESS_THAN, BETWEEN |

### 4.2 Ví dụ cấu hình Rules

**Rule 1: Áp dụng cho sản phẩm cụ thể**
```typescript
{
  name: 'Chỉ áp dụng cho iPhone',
  ruleType: 'PRODUCT',
  operator: 'IN',
  targetIds: ['iphone-15', 'iphone-15-pro'],
  isRequired: true,
  logicOperator: 'AND'
}
```

**Rule 2: Đơn hàng tối thiểu 1 triệu**
```typescript
{
  name: 'Đơn tối thiểu 1 triệu',
  ruleType: 'ORDER_VALUE',
  operator: 'GREATER_THAN',
  targetValues: { value: 1000000 },
  isRequired: true,
  logicOperator: 'AND'
}
```

**Rule 3: Chỉ cho khách VIP**
```typescript
{
  name: 'Khách VIP',
  ruleType: 'CUSTOMER_TAG',
  operator: 'IN',
  targetIds: ['vip', 'premium'],
  isRequired: true,
  logicOperator: 'AND'
}
```

**Rule 4: Chỉ cho đơn hàng đầu tiên**
```typescript
{
  name: 'Đơn hàng đầu tiên',
  ruleType: 'FIRST_ORDER',
  operator: 'EQUALS',
  targetValues: { value: true },
  isRequired: true,
  logicOperator: 'AND'
}
```

### 4.3 Logic đánh giá Rules

```
                    ┌─────────────────────┐
                    │ Promotion có Rules? │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Nhóm rules theo     │
                    │ logicOperator       │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
     ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
     │ AND Group 1 │    │ AND Group 2 │    │ OR Group    │
     └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
            │                  │                  │
    Tất cả phải pass    Tất cả phải pass    Ít nhất 1 pass
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Kết hợp kết quả     │
                    │ Required rules      │
                    │ phải pass tất cả    │
                    └─────────────────────┘
```

---

## 5. Coupon/Mã giảm giá

### 5.1 Tạo Coupon đơn lẻ

```typescript
// Input
{
  promotionId: 'promo-123',
  code: 'SUMMER2024',        // Optional: tự generate nếu không có
  usageLimit: 100,           // Dùng tối đa 100 lần
  validFrom: '2024-06-01',
  validTo: '2024-08-31',
  assignedCustomerId: null   // Public coupon
}
```

### 5.2 Tạo Coupon hàng loạt

```typescript
// Input
{
  promotionId: 'promo-123',
  quantity: 1000,            // Tạo 1000 mã
  prefix: 'VIP',             // Prefix cho mã
  usageLimit: 1,             // Mỗi mã dùng 1 lần
  validFrom: '2024-06-01',
  validTo: '2024-08-31'
}

// Output: VIP-A1B2C3, VIP-D4E5F6, VIP-G7H8I9, ...
```

### 5.3 Vòng đời Coupon

```
┌────────┐     ┌────────┐     ┌─────────┐
│ ACTIVE │────►│  USED  │     │ EXPIRED │
└───┬────┘     └────────┘     └─────────┘
    │                              ▲
    │         ┌──────────┐         │
    └────────►│ DISABLED │         │
              └──────────┘         │
    │                              │
    └──────────────────────────────┘
         (validTo < now)
```

---

## 6. Quy trình áp dụng khuyến mãi

### 6.1 Flow tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                    KHÁCH HÀNG TẠO ĐƠN HÀNG                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Lấy danh sách Promotions ACTIVE                              │
│    - isAutoApply = true (tự động áp dụng)                       │
│    - Hoặc có couponCode được nhập                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Xây dựng Context đánh giá                                    │
│    {                                                            │
│      customerId, orderSubtotal, orderItems[],                   │
│      customerTags[], isFirstOrder, couponCode                   │
│    }                                                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Với mỗi Promotion (sắp xếp theo priority DESC):              │
│                                                                 │
│    a) VALIDATE                                                  │
│       - status = ACTIVE?                                        │
│       - startDate <= now <= endDate?                            │
│       - currentUsageCount < usageLimit?                         │
│       - customerUsageCount < usageLimitPerCustomer?             │
│       - orderSubtotal >= minOrderAmount?                        │
│                                                                 │
│    b) EVALUATE RULES                                            │
│       - Đánh giá từng rule                                      │
│       - Kết hợp AND/OR logic                                    │
│       - Required rules phải pass                                │
│                                                                 │
│    c) CALCULATE DISCOUNT                                        │
│       - Tính theo promotionType                                 │
│       - Áp dụng maxDiscountAmount                               │
│       - Không vượt quá orderSubtotal                            │
│                                                                 │
│    d) CHECK STACKING                                            │
│       - Nếu stackable = false → dừng                            │
│       - Nếu stackable = true → tiếp tục                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Trả về kết quả                                               │
│    {                                                            │
│      appliedPromotions: [{ id, name, code, discount }],         │
│      totalDiscount: number,                                     │
│      finalOrderAmount: orderSubtotal - totalDiscount            │
│    }                                                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Ghi nhận Usage                                               │
│    - Tạo MktPromotionUsage record                               │
│    - Tăng promotion.currentUsageCount                           │
│    - Tăng coupon.currentUsageCount (nếu có)                     │
│    - Emit PromotionAppliedToOrderEvent                          │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Ví dụ tính toán

```typescript
// Đơn hàng
const order = {
  subtotal: 1000000,  // 1 triệu
  items: [
    { productId: 'iphone-15', quantity: 1, price: 800000 },
    { productId: 'case-15', quantity: 2, price: 100000 }
  ]
};

// Promotion 1: Giảm 10% (stackable, priority: 10)
// Promotion 2: Giảm 50,000đ (không stackable, priority: 5)

// Kết quả:
// - Promotion 1 áp dụng trước (priority cao hơn)
// - Giảm = 1,000,000 * 10% = 100,000đ
// - Subtotal còn = 900,000đ
// - Promotion 2 không áp dụng (Promotion 1 stackable nhưng P2 không)

// Final: totalDiscount = 100,000đ
```

---

## 7. Stacking (Kết hợp khuyến mãi)

### 7.1 Quy tắc Stacking

| Promotion A | Promotion B | Kết quả |
|-------------|-------------|---------|
| stackable: true | stackable: true | Cả 2 áp dụng |
| stackable: true | stackable: false | Chỉ A (priority cao hơn) |
| stackable: false | stackable: true | Chỉ A (priority cao hơn) |
| stackable: false | stackable: false | Chỉ 1 (priority cao nhất) |

### 7.2 Thứ tự áp dụng

```
Promotions được sắp xếp theo priority DESC (cao → thấp)

┌────────────────┐
│ Promotion A    │  priority: 100, stackable: true
│ Giảm 10%       │  → Áp dụng, discount = 100,000đ
└───────┬────────┘
        │ Còn 900,000đ
        ▼
┌────────────────┐
│ Promotion B    │  priority: 50, stackable: true
│ Giảm 50,000đ   │  → Áp dụng, discount = 50,000đ
└───────┬────────┘
        │ Còn 850,000đ
        ▼
┌────────────────┐
│ Promotion C    │  priority: 10, stackable: false
│ Giảm 20%       │  → KHÔNG áp dụng (non-stackable)
└────────────────┘

Total discount: 150,000đ
Final amount: 850,000đ
```

---

## 8. Background Jobs

### 8.1 PromotionExpirationCheckJob

**Mục đích:** Tự động expire promotions hết hạn

**Schedule:** Chạy mỗi giờ

**Logic:**
```typescript
// 1. Tìm promotions hết hạn theo ngày
const expiredByDate = await findPromotions({
  status: 'ACTIVE',
  endDate: { $lt: now }
});

// 2. Tìm promotions hết hạn theo usage
const expiredByUsage = await findPromotions({
  status: 'ACTIVE',
  currentUsageCount: { $gte: usageLimit }
});

// 3. Cập nhật status và emit events
for (const promotion of [...expiredByDate, ...expiredByUsage]) {
  await updateStatus(promotion.id, 'EXPIRED');
  emit(new PromotionExpiredEvent(promotion));
}
```

### 8.2 CouponExpirationCheckJob

**Mục đích:** Tự động expire coupons hết hạn

**Schedule:** Chạy mỗi giờ

### 8.3 PromotionCacheWarmupJob

**Mục đích:** Làm ấm cache khi khởi động

**Schedule:** Khi server start, sau khi clear cache

### 8.4 PromotionUsageCleanupJob

**Mục đích:** Dọn dẹp usage records cũ

**Schedule:** Hàng tuần

---

## 9. Events & Listeners

### 9.1 Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `PromotionCreatedEvent` | Tạo promotion mới | workspaceId, promotionId, code, createdBy |
| `PromotionActivatedEvent` | Activate promotion | workspaceId, promotionId, activatedBy |
| `PromotionPausedEvent` | Pause promotion | workspaceId, promotionId, pausedBy |
| `PromotionExpiredEvent` | Hết hạn (auto/manual) | workspaceId, promotionId, reason |
| `PromotionCancelledEvent` | Cancel promotion | workspaceId, promotionId, cancelledBy |
| `CouponCreatedEvent` | Tạo coupon | workspaceId, couponId, promotionId |
| `CouponRedeemedEvent` | Sử dụng coupon | workspaceId, couponId, orderId |
| `CouponExpiredEvent` | Coupon hết hạn | workspaceId, couponId |
| `PromotionAppliedToOrderEvent` | Áp dụng vào đơn | workspaceId, orderId, promotions[] |

### 9.2 Listeners

**PromotionListener:**
- Cache promotion khi tạo mới
- Invalidate cache khi expire
- Gửi thông báo

**CouponListener:**
- Cập nhật coupon status
- Trigger notifications

**OrderPromotionListener:**
- Listen `order.created` → auto-apply promotions
- Listen `order.cancelled` → rollback usage counts

---

## 10. Caching Strategy

### 10.1 Cache Keys

| Key Pattern | Nội dung | TTL |
|-------------|----------|-----|
| `promotion:{id}` | Single promotion | 24h |
| `promotion:code:{code}` | Lookup by code | 24h |
| `active-promotions:{workspaceId}` | All active promotions | 24h |
| `coupon:{code}` | Coupon validation | 24h |

### 10.2 Invalidation

```typescript
// Khi promotion thay đổi
await cacheService.invalidatePromotion(workspaceId, promotionId);
await cacheService.invalidateActivePromotions(workspaceId);

// Khi rule thay đổi
await cacheService.invalidatePromotion(workspaceId, promotionId);
```

---

## 11. GraphQL API

### 11.1 Queries

```graphql
# Lấy promotion theo ID
query GetPromotion($id: ID!) {
  mktPromotion(id: $id) {
    id
    name
    code
    status
    promotionType
    discountValue
    rules {
      id
      name
      ruleType
      operator
    }
  }
}

# Danh sách promotions
query ListPromotions($input: GetPromotionsInput!) {
  mktPromotions(input: $input) {
    items {
      id
      name
      status
    }
    total
    hasMore
  }
}

# Tính discount cho đơn hàng
query CalculateDiscount($input: CalculateDiscountInput!) {
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
```

### 11.2 Mutations

```graphql
# Tạo promotion
mutation CreatePromotion($input: CreatePromotionInput!) {
  createMktPromotion(input: $input) {
    id
    code
    status
  }
}

# Activate promotion
mutation ActivatePromotion($id: ID!) {
  activateMktPromotion(id: $id) {
    id
    status
  }
}

# Tạo coupon
mutation CreateCoupon($input: CreateCouponInput!) {
  createMktCoupon(input: $input) {
    id
    code
    status
  }
}

# Tạo bulk coupons
mutation CreateBulkCoupons($input: CreateBulkCouponsInput!) {
  createMktBulkCoupons(input: $input) {
    totalCreated
    codes
  }
}
```

---

## Phụ lục

### A. Folder Structure

```
mkt-promotion/
├── mkt-promotion.module.ts          # Module definition
├── configs/                         # Zod-validated config
├── constants/                       # Status, types, field IDs
├── workspace-entities/              # 5 entities
├── repositories/                    # Data access layer
├── services/
│   ├── application/                 # Facade services
│   ├── domain/                      # Business logic
│   └── infrastructure/              # Cache, notification
├── resolvers/                       # GraphQL resolvers
├── dto/
│   ├── inputs/                      # GraphQL inputs
│   └── outputs/                     # GraphQL outputs
├── types/                           # TypeScript types
├── events/                          # Domain events
├── jobs/                            # Background jobs
├── hooks/                           # Pre/post query hooks
├── listeners/                       # Event listeners
├── errors/                          # Custom errors
├── message/                         # Log messages
└── utils/                           # Utilities
```

### B. Tham khảo

- [Twenty CRM Documentation](https://twenty.com/docs)
- [NestJS GraphQL](https://docs.nestjs.com/graphql/quick-start)
- [TypeORM](https://typeorm.io/)
