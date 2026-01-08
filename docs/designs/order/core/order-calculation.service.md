# OrderCalculationService - Chi tiết các bước tính toán

## Tổng quan

`OrderCalculationService` là service chịu trách nhiệm tính toán các giá trị tài chính trong đơn hàng. Service này được thiết kế **tách biệt hoàn toàn** với database operations, chỉ tập trung vào logic tính toán thuần túy.

### Đặc điểm chính
- Sử dụng **`MoneyUtils`** (dựa trên `Big.js`) để đảm bảo độ chính xác trong tính toán tài chính
- Hỗ trợ cấu hình thuế linh hoạt qua environment variables
- Các phương thức pure function, dễ test

---

## 1. Tính toán Order Item (`calculateOrderItem`)

### Mục đích
Tính toán các giá trị tài chính cho **một order item** dựa trên variant và số lượng.

### Input
| Parameter | Type | Mô tả |
|-----------|------|-------|
| `variant` | `VariantForCalculation` | Thông tin variant (id, name, price) |
| `quantity` | `number` | Số lượng sản phẩm |
| `taxPercentage` | `number?` | % thuế (tùy chọn, lấy từ config nếu không có) |

### Các bước tính toán

```
┌─────────────────────────────────────────────────────────────────┐
│ Bước 1: Xác định đơn giá (Unit Price)                           │
├─────────────────────────────────────────────────────────────────┤
│ unitPrice = variant.price                                        │
│                                                                   │
│ Ví dụ: variant.price = 100,000 VND                               │
│        → unitPrice = 100,000                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 2: Tính tổng giá (Total Price)                             │
├─────────────────────────────────────────────────────────────────┤
│ totalPrice = MoneyUtils.multiply(unitPrice, quantity)            │
│                                                                   │
│ Ví dụ: unitPrice = 100,000, quantity = 3                         │
│        → totalPrice = 100,000 × 3 = 300,000                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 3: Xác định % thuế hiệu dụng                               │
├─────────────────────────────────────────────────────────────────┤
│ effectiveTaxPercentage = getEffectiveTaxPercentage(taxPercentage)│
│                                                                   │
│ Logic:                                                            │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ if (!config.tax.enabled) → return 0                         │  │
│ │ else → return taxPercentage ?? config.tax.defaultPercentage │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ Ví dụ 1: Tax disabled → effectiveTaxPercentage = 0               │
│ Ví dụ 2: Tax enabled, không truyền % → dùng config (10%)         │
│ Ví dụ 3: Tax enabled, truyền 8% → effectiveTaxPercentage = 8     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 4: Tính số tiền thuế (Tax Amount)                          │
├─────────────────────────────────────────────────────────────────┤
│ taxAmount = MoneyUtils.percentage(totalPrice, effectiveTaxPercentage)│
│                                                                   │
│ Công thức: taxAmount = totalPrice × (effectiveTaxPercentage / 100)│
│                                                                   │
│ Ví dụ: totalPrice = 300,000, effectiveTaxPercentage = 10%        │
│        → taxAmount = 300,000 × 0.10 = 30,000                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 5: Tính tổng tiền có thuế (Total Amount With Tax)          │
├─────────────────────────────────────────────────────────────────┤
│ totalAmountWithTax = MoneyUtils.add(totalPrice, taxAmount)       │
│                                                                   │
│ Ví dụ: totalPrice = 300,000, taxAmount = 30,000                  │
│        → totalAmountWithTax = 300,000 + 30,000 = 330,000         │
└─────────────────────────────────────────────────────────────────┘
```

### Output: `OrderItemWithCalculation`
```typescript
{
  variantId: string;      // ID của variant
  name: string;           // Tên sản phẩm
  unitPrice: number;      // Đơn giá
  quantity: number;       // Số lượng
  totalPrice: number;     // Tổng giá (chưa thuế)
  taxPercentage: number;  // % thuế
  taxAmount: number;      // Số tiền thuế
  totalAmountWithTax: number; // Tổng tiền (có thuế)
}
```

### Ví dụ hoàn chỉnh
```typescript
// Input
variant = { id: "v1", name: "License Pro", price: 100000 }
quantity = 3
taxPercentage = 10 (hoặc không truyền, dùng config)

// Output
{
  variantId: "v1",
  name: "License Pro",
  unitPrice: 100000,
  quantity: 3,
  totalPrice: 300000,      // 100,000 × 3
  taxPercentage: 10,
  taxAmount: 30000,        // 300,000 × 10%
  totalAmountWithTax: 330000  // 300,000 + 30,000
}
```

---

## 2. Tính toán nhiều Order Items (`calculateOrderItems`)

### Mục đích
Tính toán cho **nhiều order items** cùng lúc, sử dụng `calculateOrderItem` cho từng item.

### Input
| Parameter | Type | Mô tả |
|-----------|------|-------|
| `variants` | `VariantForCalculation[]` | Danh sách variants |
| `quantities` | `Map<string, number>` | Map variant ID → số lượng |
| `taxPercentage` | `number?` | % thuế chung cho tất cả items |

### Logic
```typescript
variants.map((variant) => {
  const quantity = quantities.get(variant.id) ?? 1; // Mặc định 1 nếu không có
  return this.calculateOrderItem(variant, quantity, taxPercentage);
});
```

---

## 3. Tính tổng Order (`calculateOrderTotals`)

### Mục đích
Tính tổng các giá trị cho toàn bộ đơn hàng từ danh sách items đã tính.

### Input
| Parameter | Type | Mô tả |
|-----------|------|-------|
| `items` | `OrderItemWithCalculation[]` | Danh sách items đã tính |
| `discountPercent` | `number` | % giảm giá (mặc định = 0) |

### Các bước tính toán

```
┌─────────────────────────────────────────────────────────────────┐
│ Bước 1: Tính Subtotal                                           │
├─────────────────────────────────────────────────────────────────┤
│ subtotal = MoneyUtils.sumBy(items, 'totalPrice')                 │
│                                                                   │
│ = Σ items[i].totalPrice                                          │
│                                                                   │
│ Ví dụ: items = [                                                  │
│   { totalPrice: 300000 },                                         │
│   { totalPrice: 200000 }                                          │
│ ]                                                                 │
│ → subtotal = 300,000 + 200,000 = 500,000                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 2: Tính tổng thuế (Tax)                                    │
├─────────────────────────────────────────────────────────────────┤
│ tax = MoneyUtils.sumBy(items, 'taxAmount')                       │
│                                                                   │
│ = Σ items[i].taxAmount                                           │
│                                                                   │
│ Ví dụ: items = [                                                  │
│   { taxAmount: 30000 },                                           │
│   { taxAmount: 20000 }                                            │
│ ]                                                                 │
│ → tax = 30,000 + 20,000 = 50,000                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 3: Tính giảm giá (Discount)                                │
├─────────────────────────────────────────────────────────────────┤
│ discount = MoneyUtils.percentage(subtotal, discountPercent)      │
│                                                                   │
│ Công thức: discount = subtotal × (discountPercent / 100)         │
│                                                                   │
│ ⚠️ Lưu ý: Discount tính trên SUBTOTAL (chưa có thuế)             │
│                                                                   │
│ Ví dụ: subtotal = 500,000, discountPercent = 10%                 │
│        → discount = 500,000 × 0.10 = 50,000                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 4: Tính tổng tiền cuối cùng (Total Amount)                 │
├─────────────────────────────────────────────────────────────────┤
│ totalAmount = (subtotal + tax) - discount                        │
│                                                                   │
│ Sử dụng MoneyUtils:                                               │
│ totalAmount = MoneyUtils.subtract(                                │
│   MoneyUtils.add(subtotal, tax),                                  │
│   discount                                                        │
│ )                                                                 │
│                                                                   │
│ Ví dụ: subtotal = 500,000, tax = 50,000, discount = 50,000       │
│        → totalAmount = (500,000 + 50,000) - 50,000 = 500,000     │
└─────────────────────────────────────────────────────────────────┘
```

### Output: `OrderCalculatedValues`
```typescript
{
  subtotal: number;      // Tổng tiền items (chưa thuế)
  tax: number;           // Tổng thuế
  taxPercentage: number; // % thuế (lấy từ item đầu tiên)
  discount: number;      // Số tiền giảm giá
  totalAmount: number;   // Tổng tiền cuối cùng
}
```

### Công thức tổng quát
```
╔═════════════════════════════════════════════════════════════════╗
║                     CÔNG THỨC TÍNH ORDER                        ║
╠═════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  subtotal = Σ (unitPrice[i] × quantity[i])                      ║
║                                                                  ║
║  tax = Σ (totalPrice[i] × taxPercentage[i] / 100)               ║
║                                                                  ║
║  discount = subtotal × discountPercent / 100                     ║
║                                                                  ║
║  totalAmount = subtotal + tax - discount                         ║
║                                                                  ║
╚═════════════════════════════════════════════════════════════════╝
```

### Ví dụ hoàn chỉnh
```typescript
// Input: 2 items, giảm giá 10%
items = [
  {
    unitPrice: 100000,
    quantity: 3,
    totalPrice: 300000,
    taxPercentage: 10,
    taxAmount: 30000,
    totalAmountWithTax: 330000
  },
  {
    unitPrice: 200000,
    quantity: 1,
    totalPrice: 200000,
    taxPercentage: 10,
    taxAmount: 20000,
    totalAmountWithTax: 220000
  }
]
discountPercent = 10

// Tính toán
subtotal = 300,000 + 200,000 = 500,000
tax = 30,000 + 20,000 = 50,000
discount = 500,000 × 10% = 50,000
totalAmount = 500,000 + 50,000 - 50,000 = 500,000

// Output
{
  subtotal: 500000,
  tax: 50000,
  taxPercentage: 10,
  discount: 50000,
  totalAmount: 500000
}
```

---

## 4. Tính toán hoàn tiền (`calculateRefundAmount`)

### Mục đích
Tính số tiền hoàn lại dựa trên số ngày đã sử dụng (pro-rata refund).

### Input
| Parameter | Type | Mô tả |
|-----------|------|-------|
| `originalAmount` | `number` | Số tiền gốc đã thanh toán |
| `totalDays` | `number` | Tổng số ngày license |
| `usedDays` | `number` | Số ngày đã sử dụng |

### Các bước tính toán

```
┌─────────────────────────────────────────────────────────────────┐
│ Bước 1: Kiểm tra điều kiện                                      │
├─────────────────────────────────────────────────────────────────┤
│ if (totalDays <= 0 || usedDays >= totalDays) → return 0         │
│                                                                   │
│ → Không hoàn tiền nếu:                                            │
│   - Tổng ngày <= 0 (invalid)                                      │
│   - Đã sử dụng hết hoặc quá số ngày                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 2: Tính số ngày còn lại                                    │
├─────────────────────────────────────────────────────────────────┤
│ remainingDays = totalDays - usedDays                             │
│                                                                   │
│ Ví dụ: totalDays = 365, usedDays = 100                           │
│        → remainingDays = 265                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 3: Tính giá trị mỗi ngày (Daily Rate)                      │
├─────────────────────────────────────────────────────────────────┤
│ dailyRate = MoneyUtils.divideSafe(originalAmount, totalDays)     │
│                                                                   │
│ ⚠️ Sử dụng divideSafe để tránh chia cho 0                        │
│                                                                   │
│ Ví dụ: originalAmount = 1,000,000, totalDays = 365               │
│        → dailyRate = 1,000,000 / 365 = 2,739.726...              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 4: Tính số tiền hoàn lại                                   │
├─────────────────────────────────────────────────────────────────┤
│ refundAmount = MoneyUtils.multiply(dailyRate, remainingDays)     │
│                                                                   │
│ Ví dụ: dailyRate = 2,739.726, remainingDays = 265                │
│        → refundAmount = 2,739.726 × 265 = 726,027.39             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 5: Làm tròn kết quả                                        │
├─────────────────────────────────────────────────────────────────┤
│ return MoneyUtils.round(refundAmount, DECIMAL_PLACES)            │
│                                                                   │
│ DECIMAL_PLACES = 2 (từ ORDER_CALCULATION_CONFIG)                 │
│                                                                   │
│ Ví dụ: 726,027.39 → 726,027.39 (giữ 2 chữ số thập phân)         │
└─────────────────────────────────────────────────────────────────┘
```

### Công thức
```
╔═════════════════════════════════════════════════════════════════╗
║              CÔNG THỨC TÍNH HOÀN TIỀN (PRO-RATA)                ║
╠═════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  refundAmount = originalAmount × (remainingDays / totalDays)     ║
║                                                                  ║
║  Trong đó: remainingDays = totalDays - usedDays                  ║
║                                                                  ║
╚═════════════════════════════════════════════════════════════════╝
```

### Ví dụ
```typescript
// Input
originalAmount = 1000000  // 1 triệu VND
totalDays = 365           // License 1 năm
usedDays = 100            // Đã dùng 100 ngày

// Tính toán
remainingDays = 365 - 100 = 265
dailyRate = 1,000,000 / 365 = 2,739.726027...
refundAmount = 2,739.726027 × 265 = 726,027.40

// Output
726027.40
```

---

## 5. Tính số tiền còn lại (`calculateRemainingAmount`)

### Mục đích
Tính số tiền còn lại sau khi đã hoàn tiền.

### Input
| Parameter | Type | Mô tả |
|-----------|------|-------|
| `originalAmount` | `number` | Số tiền gốc |
| `refundAmount` | `number` | Số tiền đã hoàn |

### Logic
```typescript
const remaining = MoneyUtils.subtract(originalAmount, refundAmount);
return MoneyUtils.max(remaining, 0).toNumber();
```

### Lưu ý
- Sử dụng `MoneyUtils.max(remaining, 0)` để đảm bảo kết quả không âm
- Trường hợp `refundAmount > originalAmount` sẽ trả về 0

---

## 6. Cấu hình thuế (Tax Configuration)

### Environment Variables
| Variable | Default | Mô tả |
|----------|---------|-------|
| `MKT_ORDER_TAX_ENABLED` | `false` | Bật/tắt tính thuế |
| `MKT_ORDER_TAX_PERCENTAGE` | `10` | % thuế mặc định |

### Logic xác định % thuế (`getEffectiveTaxPercentage`)

```
┌─────────────────────────────────────────────┐
│           Tax Disabled?                      │
│         (config.tax.enabled = false)         │
└─────────────────────┬───────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │ YES                       │ NO
        ↓                           ↓
┌───────────────┐    ┌─────────────────────────┐
│  return 0     │    │  Có truyền taxPercentage?│
└───────────────┘    └───────────┬─────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │ YES                       │ NO
                   ↓                           ↓
          ┌────────────────┐    ┌────────────────────────┐
          │ return         │    │ return                  │
          │ taxPercentage  │    │ config.tax.defaultPercentage│
          └────────────────┘    └────────────────────────┘
```

---

## 7. Helper Methods

### `isTaxEnabled(): boolean`
Kiểm tra xem tính năng thuế có được bật không.

### `getDefaultTaxPercentage(): number`
Lấy % thuế mặc định từ config. Trả về 0 nếu tax disabled.

### `formatCurrency(amount, currency): string`
Format số tiền theo định dạng tiền tệ.

```typescript
formatCurrency(1000000, 'VND')  // → "1.000.000 ₫"
formatCurrency(1000.50, 'USD')  // → "$1,000.50"
```

---

## 8. Constants sử dụng

### `ORDER_CALCULATION_CONFIG`
```typescript
{
  DEFAULT_TAX_PERCENTAGE: 0,    // % thuế mặc định
  DECIMAL_PLACES: 2,            // Số chữ số thập phân
  DEFAULT_CURRENCY: 'VND'       // Đơn vị tiền tệ mặc định
}
```

---

## 9. Lưu ý quan trọng

### Về độ chính xác số học
- **LUÔN** sử dụng `MoneyUtils` cho mọi phép tính tài chính
- **KHÔNG** sử dụng JavaScript native arithmetic (`+`, `-`, `*`, `/`) trực tiếp
- `MoneyUtils` sử dụng `Big.js` để tránh floating-point errors

### Ví dụ lỗi floating-point
```javascript
// JavaScript native (SAI)
0.1 + 0.2  // → 0.30000000000000004

// MoneyUtils (ĐÚNG)
MoneyUtils.add(0.1, 0.2).toNumber()  // → 0.3
```

### Về thứ tự tính toán
1. Tính `totalPrice` từng item trước
2. Tính `taxAmount` từng item
3. Cộng tổng để có `subtotal` và `tax`
4. Tính `discount` trên `subtotal`
5. Tính `totalAmount = subtotal + tax - discount`

### Về làm tròn
- Sử dụng `ROUND_HALF_UP` (banker's rounding) mặc định
- Làm tròn đến 2 chữ số thập phân cho tiền tệ
- Làm tròn cuối cùng, không làm tròn ở các bước trung gian

---

## 10. Sơ đồ luồng tổng quan

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ORDER CALCULATION FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────────────────────────────────────┐  │
│  │   Variants   │ ──→ │           calculateOrderItems()              │  │
│  │  + Quantities│     │  → Loop qua từng variant                      │  │
│  └──────────────┘     │  → Gọi calculateOrderItem() cho mỗi variant   │  │
│                       └───────────────────┬──────────────────────────┘  │
│                                           │                              │
│                                           ↓                              │
│                       ┌──────────────────────────────────────────────┐  │
│                       │         OrderItemWithCalculation[]           │  │
│                       │  [{unitPrice, quantity, totalPrice,          │  │
│                       │    taxPercentage, taxAmount, totalAmountWithTax}]│
│                       └───────────────────┬──────────────────────────┘  │
│                                           │                              │
│                                           ↓                              │
│  ┌──────────────┐     ┌──────────────────────────────────────────────┐  │
│  │ discountPercent │ ──→ │          calculateOrderTotals()            │  │
│  └──────────────┘     │  → subtotal = Σ totalPrice                    │  │
│                       │  → tax = Σ taxAmount                           │  │
│                       │  → discount = subtotal × discountPercent%      │  │
│                       │  → totalAmount = subtotal + tax - discount     │  │
│                       └───────────────────┬──────────────────────────┘  │
│                                           │                              │
│                                           ↓                              │
│                       ┌──────────────────────────────────────────────┐  │
│                       │           OrderCalculatedValues              │  │
│                       │  {subtotal, tax, taxPercentage,              │  │
│                       │   discount, totalAmount}                      │  │
│                       └──────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Tính toán bán theo Combo

### Tổng quan

Khi bán sản phẩm theo **Combo**, hệ thống sử dụng module riêng để xử lý:
- **`GenericComboCalculationService`**: Tính giá combo với các pricing strategies
- **`OrderComboIntegrationService`**: Flatten combo thành order items và tích hợp vào Order

> ⚠️ **Lưu ý**: `OrderCalculationService` hiện tại **chưa tích hợp trực tiếp** với combo. 
> Combo discount được tính riêng và cộng vào order thông qua `OrderComboIntegrationService`.

### Kiến trúc tích hợp Combo-Order

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMBO ORDER CALCULATION FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌───────────────┐     ┌────────────────────────────────────────────────┐   │
│  │  ComboInputs  │ ──→ │     OrderComboIntegrationService               │   │
│  │ [{comboId,    │     │     .flattenCombos()                           │   │
│  │   quantity}]  │     │                                                 │   │
│  └───────────────┘     └────────────────────┬───────────────────────────┘   │
│                                             │                                │
│                                             ↓                                │
│                        ┌────────────────────────────────────────────────┐   │
│                        │      GenericComboCalculationService            │   │
│                        │      .calculateComboPrice()                    │   │
│                        │                                                 │   │
│                        │  → Fetch product/package prices (parallel)     │   │
│                        │  → Apply pricing strategy (FIXED/DISCOUNT/SUM) │   │
│                        │  → Calculate savings & adjusted prices         │   │
│                        └────────────────────┬───────────────────────────┘   │
│                                             │                                │
│                                             ↓                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    FlattenedComboResult                                │ │
│  │  {                                                                      │ │
│  │    orderItems: CreateOrderItemFromComboData[],  // Items để tạo order  │ │
│  │    comboSnapshot: GenericComboSnapshot,         // Snapshot immutable   │ │
│  │    comboDiscount: number                        // Số tiền giảm từ combo│ │
│  │  }                                                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                             │                                │
│                                             ↓                                │
│                        ┌────────────────────────────────────────────────┐   │
│                        │      OrderCalculationService                   │   │
│                        │      .calculateOrderTotals()                   │   │
│                        │                                                 │   │
│                        │  (Xử lý items như bình thường)                 │   │
│                        │  Combo discount được áp dụng riêng             │   │
│                        └────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Combo Pricing Strategies

Combo hỗ trợ **3 chiến lược định giá**:

| Strategy | Mô tả | Công thức |
|----------|-------|-----------|
| **FIXED** | Giá cố định cho cả combo | `comboPrice = fixedPrice` |
| **DISCOUNT** | Giảm % trên tổng giá items | `comboPrice = originalPrice × (1 - discountPercent/100)` |
| **SUM** | Giữ nguyên tổng giá items | `comboPrice = originalPrice` (không giảm) |

### Các bước tính giá Combo (`GenericComboCalculationService.calculateComboPrice`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Bước 1: Parallel Fetch giá từng item                            │
├─────────────────────────────────────────────────────────────────┤
│ - DIGITAL_EXTERNAL: Lấy giá từ MKT Server (package.price)       │
│ - SERVICE: Lấy từ item.servicePrice                              │
│ - CUSTOM: Lấy từ item.customPrice                                │
│ - Nếu có overridePrice → sử dụng overridePrice                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 2: Tính totalPrice cho từng item                           │
├─────────────────────────────────────────────────────────────────┤
│ itemTotalPrice = MoneyUtils.multiply(unitPrice, quantity)        │
│                                                                   │
│ Ví dụ: unitPrice = 500,000, quantity = 2                         │
│        → itemTotalPrice = 1,000,000                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 3: Tính originalPrice (tổng giá gốc)                       │
├─────────────────────────────────────────────────────────────────┤
│ originalPrice = MoneyUtils.sumBy(items, 'totalPrice')            │
│                                                                   │
│ Ví dụ: items = [                                                  │
│   { totalPrice: 1,000,000 },  // Product A                       │
│   { totalPrice: 500,000 },    // Product B                       │
│   { totalPrice: 300,000 }     // Service                         │
│ ]                                                                 │
│ → originalPrice = 1,800,000                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 4: Áp dụng Pricing Strategy                                │
├─────────────────────────────────────────────────────────────────┤
│ switch (pricingType):                                            │
│                                                                   │
│   FIXED:                                                          │
│     comboPrice = fixedPrice ?? originalPrice                     │
│     Ví dụ: fixedPrice = 1,500,000                                │
│            → comboPrice = 1,500,000                              │
│                                                                   │
│   DISCOUNT:                                                       │
│     comboPrice = MoneyUtils.applyDiscount(originalPrice,         │
│                                           discountPercent)       │
│     Ví dụ: originalPrice = 1,800,000, discountPercent = 20%      │
│            → comboPrice = 1,800,000 × 0.80 = 1,440,000           │
│                                                                   │
│   SUM:                                                            │
│     comboPrice = originalPrice                                   │
│     → comboPrice = 1,800,000                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 5: Tính Savings (tiết kiệm)                                │
├─────────────────────────────────────────────────────────────────┤
│ savings = MoneyUtils.max(0, originalPrice - comboPrice)          │
│                                                                   │
│ Ví dụ: originalPrice = 1,800,000, comboPrice = 1,440,000         │
│        → savings = 360,000                                       │
│                                                                   │
│ savingsPercent = MoneyUtils.percentageOf(savings, originalPrice) │
│        → savingsPercent = 360,000 / 1,800,000 × 100 = 20%        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Bước 6: Tính Adjusted Prices (pro-rata)                         │
├─────────────────────────────────────────────────────────────────┤
│ Phân bổ discount đều cho từng item theo tỷ lệ                    │
│                                                                   │
│ discountRatio = comboPrice / originalPrice                       │
│               = 1,440,000 / 1,800,000 = 0.8                      │
│                                                                   │
│ Cho mỗi item:                                                     │
│   adjustedUnitPrice = unitPrice × discountRatio                  │
│   adjustedTotalPrice = totalPrice × discountRatio                │
│                                                                   │
│ Ví dụ item Product A:                                             │
│   originalUnitPrice = 500,000                                     │
│   adjustedUnitPrice = 500,000 × 0.8 = 400,000                    │
│   originalTotalPrice = 1,000,000                                  │
│   adjustedTotalPrice = 1,000,000 × 0.8 = 800,000                 │
└─────────────────────────────────────────────────────────────────┘
```

### Output: `GenericComboCalculationResult`

```typescript
{
  originalPrice: number;    // Tổng giá gốc tất cả items
  comboPrice: number;       // Giá combo sau discount
  savings: number;          // Số tiền tiết kiệm
  savingsPercent: number;   // % tiết kiệm
  currency: string;         // Đơn vị tiền tệ
  itemDetails: GenericComboItemCalculation[]; // Chi tiết từng item
  calculatedAt: Date;       // Thời điểm tính
}

// GenericComboItemCalculation
{
  id: string;
  itemType: ComboItemType;
  displayName: string;
  quantity: number;
  unitPrice: number;           // Giá gốc
  totalPrice: number;          // Tổng giá gốc
  adjustedUnitPrice: number;   // Giá sau pro-rata
  adjustedTotalPrice: number;  // Tổng giá sau pro-rata
}
```

### Tính Combo Discount khi tạo Order

```typescript
// Trong OrderComboIntegrationService.calculateComboDiscount()

comboDiscount = (originalPrice - comboPrice) × quantity

// Ví dụ: Mua 2 combo
// originalPrice = 1,800,000
// comboPrice = 1,440,000
// quantity = 2

comboDiscount = (1,800,000 - 1,440,000) × 2 = 720,000
```

### Ví dụ hoàn chỉnh: Order với Combo

```typescript
// === COMBO CONFIGURATION ===
Combo: "Office Suite Pro"
PricingType: DISCOUNT
DiscountPercent: 20%

Items trong combo:
- Product A (License): 500,000 × 2 = 1,000,000
- Product B (Plugin):  500,000 × 1 = 500,000
- Service (Support):   300,000 × 1 = 300,000

// === STEP 1: Tính giá combo ===
originalPrice = 1,000,000 + 500,000 + 300,000 = 1,800,000
comboPrice = 1,800,000 × (1 - 20%) = 1,440,000
savings = 360,000
savingsPercent = 20%

// === STEP 2: Flatten thành Order Items ===
// Mua 2 combo (quantity = 2)

OrderItems:
[
  // Combo 1
  { name: "Product A", unitPrice: 400,000, quantity: 2, totalPrice: 800,000 },
  { name: "Product B", unitPrice: 400,000, quantity: 1, totalPrice: 400,000 },
  { name: "Support",   unitPrice: 240,000, quantity: 1, totalPrice: 240,000 },
  
  // Combo 2 (duplicate)
  { name: "Product A", unitPrice: 400,000, quantity: 2, totalPrice: 800,000 },
  { name: "Product B", unitPrice: 400,000, quantity: 1, totalPrice: 400,000 },
  { name: "Support",   unitPrice: 240,000, quantity: 1, totalPrice: 240,000 }
]

comboDiscount = 360,000 × 2 = 720,000

// === STEP 3: Tính Order Totals ===
subtotal = 800,000 + 400,000 + 240,000 + 800,000 + 400,000 + 240,000 
         = 2,880,000

// Lưu ý: subtotal đã áp dụng adjusted prices từ combo
// Original subtotal = 1,800,000 × 2 = 3,600,000
// Combo discount = 720,000
// Net subtotal = 2,880,000 ✓

tax = 2,880,000 × 10% = 288,000
promotionDiscount = 0 (không có promotion thêm)

totalAmount = subtotal + tax - promotionDiscount
            = 2,880,000 + 288,000 - 0
            = 3,168,000
```

### Các loại Item trong Combo

| Item Type | Source | Giá lấy từ |
|-----------|--------|------------|
| `DIGITAL_EXTERNAL` | MKT Server | `package.price` |
| `SERVICE` | Combo Item | `item.servicePrice` |
| `CUSTOM` | Combo Item | `item.customPrice` |
| `INTERNAL_PRODUCT` | *(deprecated)* | `overridePrice` hoặc 0 |
| `INTERNAL_VARIANT` | *(deprecated)* | `overridePrice` hoặc 0 |

### Combo Snapshot

Khi tạo order từ combo, hệ thống lưu **immutable snapshot**:

```typescript
// GenericComboSnapshot - lưu cùng OrderItem
{
  id: string;                    // Combo ID
  comboCode: string;             // Mã combo
  name: string;                  // Tên combo
  pricingType: string;           // FIXED | DISCOUNT | SUM
  version: number;               // Version tại thời điểm order
  items: GenericComboItemSnapshot[]; // Snapshot từng item
  originalPrice: number;         // Giá gốc
  comboPrice: number;            // Giá combo
  savings: number;               // Tiết kiệm
  savingsPercent: number;        // % tiết kiệm
  currency: string;              // VND
  capturedAt: string;            // Timestamp
  checksum: string;              // SHA-256 để verify integrity
}
```

### Công thức tổng quát với Combo

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                     CÔNG THỨC TÍNH ORDER VỚI COMBO                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  // Cho mỗi combo:                                                            ║
║  originalPrice[c] = Σ (unitPrice[i] × quantity[i])                           ║
║                                                                               ║
║  comboPrice[c] = applyPricingStrategy(originalPrice[c], pricingType)         ║
║                                                                               ║
║  comboDiscount[c] = (originalPrice[c] - comboPrice[c]) × comboQuantity       ║
║                                                                               ║
║  // Order totals:                                                             ║
║  subtotal = Σ adjustedTotalPrice[items]  // Đã áp dụng combo pricing         ║
║                                                                               ║
║  tax = subtotal × taxPercentage / 100                                        ║
║                                                                               ║
║  promotionDiscount = subtotal × promotionPercent / 100  // Discount thêm     ║
║                                                                               ║
║  totalAmount = subtotal + tax - promotionDiscount                            ║
║                                                                               ║
║  // Tổng combo discount (để hiển thị):                                        ║
║  totalComboDiscount = Σ comboDiscount[c]                                     ║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Sơ đồ flow Combo + Order đầy đủ

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       COMPLETE COMBO ORDER FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  INPUT                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ combos: [{ comboId: "combo-1", quantity: 2 }]                           │    │
│  │ directProducts: [{ productId: "prod-x", quantity: 1 }]  // Optional     │    │
│  │ promotionCode: "SUMMER20"                               // Optional     │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │              OrderComboIntegrationService.flattenCombos()               │    │
│  │                                                                          │    │
│  │  for each combo:                                                         │    │
│  │    1. Load combo + items từ DB                                          │    │
│  │    2. GenericComboCalculationService.calculateComboPrice()              │    │
│  │       - Fetch prices từ MKT Server (parallel)                           │    │
│  │       - Apply pricing strategy                                          │    │
│  │       - Calculate adjusted prices (pro-rata)                            │    │
│  │    3. Create immutable snapshot                                          │    │
│  │    4. Flatten items × quantity → OrderItemData[]                        │    │
│  │    5. Calculate comboDiscount                                           │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                      Merge Order Items                                   │    │
│  │                                                                          │    │
│  │  allItems = [                                                            │    │
│  │    ...flattenedComboItems,   // Items từ combos (adjusted prices)       │    │
│  │    ...directProductItems     // Items mua trực tiếp (nếu có)            │    │
│  │  ]                                                                       │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │              OrderCalculationService.calculateOrderTotals()              │    │
│  │                                                                          │    │
│  │  subtotal = Σ item.totalPrice                                           │    │
│  │  tax = Σ item.taxAmount                                                  │    │
│  │  promotionDiscount = apply(promotionCode)                                │    │
│  │  totalAmount = subtotal + tax - promotionDiscount                       │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ↓                                          │
│  OUTPUT                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ Order {                                                                  │    │
│  │   subtotal: 2,880,000,                                                   │    │
│  │   tax: 288,000,                                                          │    │
│  │   comboDiscount: 720,000,      // Tổng giảm từ combos                   │    │
│  │   promotionDiscount: 0,         // Giảm từ promotion                    │    │
│  │   totalAmount: 3,168,000,                                                │    │
│  │   items: OrderItem[],                                                    │    │
│  │   comboSnapshots: GenericComboSnapshot[]  // Lưu để audit               │    │
│  │ }                                                                        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. So sánh: Order thường vs Order với Combo

| Aspect | Order thường | Order với Combo |
|--------|--------------|-----------------|
| **Items** | Trực tiếp từ products/variants | Flatten từ combo items |
| **Giá item** | `variant.price` | `adjustedPrice` (đã áp dụng combo pricing) |
| **Discount** | Chỉ promotion discount | Combo discount + Promotion discount |
| **Snapshot** | Product snapshot | Combo snapshot + Product snapshots |
| **Service xử lý** | `OrderCalculationService` | `OrderComboIntegrationService` → `OrderCalculationService` |

---

*Tài liệu được tạo tự động từ phân tích code `order-calculation.service.ts` và `generic-combo-calculation.service.ts`*
