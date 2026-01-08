# Partial Payment Flow (Thanh Toán Một Phần)

## Overview

Tài liệu này mô tả các chiến lược và best practices xử lý thanh toán một phần trong hệ thống MKT CRM. Flow này mở rộng từ [ORDER_LICENSE_CREATION_FLOW.md](ORDER_LICENSE_CREATION_FLOW.md).

**Vấn đề cần giải quyết:**
- Flow hiện tại là **all-or-nothing**: License chỉ được tạo sau khi thanh toán đầy đủ
- Cần hỗ trợ các trường hợp khách hàng thanh toán từng phần

---

## Payment Status Model

### Trạng thái thanh toán (Payment Status)

| Status | Mô tả | Điều kiện |
|--------|-------|-----------|
| `PENDING` | Chưa thanh toán | `paidAmount = 0` |
| `PARTIAL` | Đã thanh toán một phần | `0 < paidAmount < totalAmount` |
| `PAID` | Đã thanh toán đủ | `paidAmount = totalAmount` |
| `OVERPAID` | Thanh toán dư | `paidAmount > totalAmount` |

### Data Model bổ sung cho Order

```typescript
// Thêm vào Order entity
interface OrderPaymentFields {
  // Chính sách thanh toán một phần
  partialPaymentPolicy: 'WAIT_FULL' | 'THRESHOLD' | 'PRO_RATA';
  
  // Ngưỡng % để tạo license (dùng với policy THRESHOLD)
  paymentThresholdPercent: number; // e.g., 50, 70
  
  // Số tiền đã thanh toán (aggregate từ payments)
  paidAmount: number;
  
  // Số tiền còn lại
  remainingAmount: number;
  
  // Trạng thái thanh toán
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERPAID';
}
```

### Data Model bổ sung cho License

```typescript
// Thêm vào License entity
interface LicensePaymentFields {
  // Trạng thái thanh toán của license
  paymentStatus: 'FULLY_PAID' | 'PARTIAL_PAID' | 'PENDING';
  
  // Grace period - số ngày cho phép sử dụng khi chưa thanh toán đủ
  gracePeriodDays: number;
  
  // Ngày hết hạn grace period
  gracePeriodEndDate: DateTime;
}
```

---

## Chiến Lược Xử Lý Partial Payment

### Chiến lược A: WAIT_FULL (Mặc định)

Đợi thanh toán đầy đủ trước khi tạo license.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Policy: WAIT_FULL                             │
├─────────────────────────────────────────────────────────────────┤
│  Điều kiện tạo License: paidAmount >= totalAmount                │
│  Rủi ro: Thấp                                                    │
│  Trải nghiệm khách hàng: Phải đợi thanh toán đủ                  │
└─────────────────────────────────────────────────────────────────┘

                    Payment received
                          │
                          ▼
              ┌───────────────────────┐
              │ paidAmount >= total?  │
              └───────────┬───────────┘
                   YES    │    NO
                    │     │     │
                    ▼     │     ▼
           ┌─────────────┐│┌─────────────────┐
           │Create License│││Status: PARTIAL  │
           │Status: PAID  │││Đợi thanh toán   │
           └─────────────┘│└─────────────────┘
```

**Use Case:** 
- Đơn hàng thường
- Khách hàng mới chưa có lịch sử

---

### Chiến lược B: THRESHOLD (Khuyến nghị)

Tạo license khi thanh toán đạt ngưỡng tối thiểu (ví dụ: 50%, 70%).

```
┌─────────────────────────────────────────────────────────────────┐
│                    Policy: THRESHOLD                             │
├─────────────────────────────────────────────────────────────────┤
│  Điều kiện tạo License: paidAmount >= totalAmount * threshold%   │
│  Rủi ro: Trung bình (cần grace period + reminder)                │
│  Trải nghiệm khách hàng: Tốt, linh hoạt                          │
└─────────────────────────────────────────────────────────────────┘

                    Payment received
                          │
                          ▼
              ┌───────────────────────┐
              │ paidAmount >= total?  │
              └───────────┬───────────┘
                   YES    │    NO
                    │     │     │
                    ▼     │     ▼
           ┌─────────────┐│┌───────────────────────┐
           │Create License│││paidAmount >= threshold?│
           │Status: PAID  │││(e.g., 70%)            │
           └─────────────┘│└───────────┬───────────┘
                          │      YES   │    NO
                          │       │    │     │
                          │       ▼    │     ▼
                          │┌───────────────┐┌─────────────────┐
                          ││Create License ││Status: PARTIAL  │
                          ││Status: PARTIAL││Đợi thêm payment │
                          ││+ Grace Period ││                 │
                          │└───────────────┘└─────────────────┘
```

**Ví dụ:**
```
Total Amount: 10,000,000 VND
Threshold: 70%
Required minimum: 7,000,000 VND

Scenario 1: Khách trả 8,000,000 VND
  → Đạt threshold (80% > 70%)
  → Tạo license với status PARTIAL_PAID
  → Set grace period 14 ngày để thanh toán nốt 2,000,000 VND

Scenario 2: Khách trả 5,000,000 VND
  → Chưa đạt threshold (50% < 70%)
  → Không tạo license
  → Status: PARTIAL, đợi thanh toán thêm
```

**Use Case:**
- Khách hàng VIP, đối tác lâu năm
- Đơn hàng giá trị lớn
- Khách hàng có lịch sử thanh toán tốt

---

### Chiến lược C: PRO_RATA (Theo tỷ lệ)

Tạo số license tương ứng với số tiền đã thanh toán.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Policy: PRO_RATA                              │
├─────────────────────────────────────────────────────────────────┤
│  Điều kiện: splitLicenses = true                                 │
│  Số license tạo = floor(paidAmount / unitPrice)                  │
│  Rủi ro: Thấp (chỉ tạo đúng số đã trả)                           │
│  Trải nghiệm khách hàng: Công bằng, rõ ràng                      │
└─────────────────────────────────────────────────────────────────┘

                    Payment received
                          │
                          ▼
              ┌───────────────────────────┐
              │ Calculate: paidUnits =    │
              │ floor(paidAmount/unitPrice)│
              └───────────────┬───────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │ paidUnits >= 1?           │
              └───────────────┬───────────┘
                       YES    │    NO
                        │     │     │
                        ▼     │     ▼
               ┌─────────────┐│┌─────────────────┐
               │Create N     │││Status: PARTIAL  │
               │licenses     │││Đợi đủ 1 unit    │
               │(N=paidUnits)│││                 │
               └─────────────┘│└─────────────────┘
```

**Ví dụ:**
```
Order: 5 licenses × 2,000,000 VND = 10,000,000 VND
splitLicenses: true

Scenario 1: Khách trả 6,000,000 VND
  → paidUnits = floor(6,000,000 / 2,000,000) = 3
  → Tạo 3 license keys
  → Còn 2 license chờ thanh toán thêm

Scenario 2: Khách trả thêm 4,000,000 VND
  → Total paid = 10,000,000 VND
  → paidUnits = 5 (đủ)
  → Tạo thêm 2 license keys còn lại
```

**Use Case:**
- Team licenses (mỗi người 1 license)
- Reseller mua số lượng lớn
- Subscription theo seats

**Lưu ý:** Chỉ áp dụng khi `splitLicenses = true`

---

## Flow Chi Tiết

### Partial Payment Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kế toán xác nhận Payment                      │
│                    (bất kỳ số tiền nào)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Cập nhật paidAmount                                     │
│  paidAmount = SUM(confirmed payments)                            │
│  remainingAmount = totalAmount - paidAmount                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Xác định paymentStatus                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ if (remainingAmount < 0)  → OVERPAID                    │     │
│  │ if (remainingAmount = 0)  → PAID                        │     │
│  │ if (paidAmount > 0)       → PARTIAL                     │     │
│  │ else                      → PENDING                     │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Check License Creation theo Policy                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┬─────────────────┐
         │                 │                 │                 │
         ▼                 ▼                 ▼                 ▼
   ┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
   │WAIT_FULL  │     │THRESHOLD  │     │PRO_RATA   │     │PAID/      │
   │           │     │           │     │           │     │OVERPAID   │
   └─────┬─────┘     └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
         │                 │                 │                 │
         ▼                 ▼                 ▼                 ▼
   ┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
   │Đợi PAID   │     │Check      │     │Create     │     │Create ALL │
   │status     │     │threshold %│     │paidUnits  │     │licenses   │
   └───────────┘     └───────────┘     │licenses   │     └───────────┘
                                       └───────────┘
```

---

## Grace Period Management

Khi license được tạo với status `PARTIAL_PAID`, cần có cơ chế grace period:

### Grace Period Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  License created with PARTIAL_PAID status                        │
│  gracePeriodDays: 14                                             │
│  gracePeriodEndDate: now + 14 days                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cron Job: Check grace period daily                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌───────────┐     ┌───────────┐     ┌───────────┐
   │Day 7      │     │Day 12     │     │Day 14     │
   │Reminder   │     │Warning    │     │(End)      │
   └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
         │                 │                 │
         ▼                 ▼                 ▼
   ┌───────────┐     ┌───────────┐     ┌───────────────┐
   │Email      │     │Email +    │     │Block/Suspend  │
   │reminder   │     │SMS alert  │     │License        │
   └───────────┘     └───────────┘     └───────────────┘
```

### Grace Period Configuration

| Threshold | Grace Period | Reminder Schedule |
|-----------|--------------|-------------------|
| ≥ 90% paid | 30 days | Day 15, 25, 29 |
| ≥ 70% paid | 14 days | Day 7, 12, 14 |
| ≥ 50% paid | 7 days | Day 3, 5, 7 |

---

## Edge Cases & Error Handling

### Xử lý các trường hợp đặc biệt

| Scenario | Xử lý |
|----------|-------|
| Khách trả 50%, nhận license, không trả tiếp | Cron job nhắc nhở → Block license sau grace period |
| Khách trả dư | Tạo credit note hoặc refund phần dư |
| Khách yêu cầu refund partial | Revoke tương ứng số license đã tạo (PRO_RATA) |
| Thanh toán bị từ chối | Không tính vào paidAmount, giữ nguyên status |
| Grace period hết hạn | Suspend license, không xóa (có thể reactive khi thanh toán) |

### Rollback Logic

```typescript
async onPaymentRefunded(payment: Payment) {
  const order = await this.getOrder(payment.orderId);
  
  // 1. Recalculate paidAmount
  const paidAmount = this.recalculatePaidAmount(order);
  
  // 2. Check if license should be revoked
  if (order.partialPaymentPolicy === 'PRO_RATA') {
    const currentLicenses = order.licenses.length;
    const allowedLicenses = Math.floor(paidAmount / order.unitPrice);
    
    if (allowedLicenses < currentLicenses) {
      // Revoke excess licenses (LIFO - last created first)
      await this.revokeLicenses(order, currentLicenses - allowedLicenses);
    }
  } else if (order.partialPaymentPolicy === 'THRESHOLD') {
    const threshold = order.totalAmount * (order.paymentThresholdPercent / 100);
    
    if (paidAmount < threshold) {
      // Suspend all licenses
      await this.suspendLicenses(order);
    }
  }
  
  // 3. Update order status
  await this.updateOrderPaymentStatus(order);
}
```

---

## API Examples

### Set Partial Payment Policy

```graphql
mutation CreateOrderWithPartialPayment {
  mktCreateOrderWithItems(input: {
    customerId: "customer-uuid"
    externalProducts: [{
      productId: "prod-123"
      packageId: "pkg-456"
      maxDevices: 5
      splitLicenses: true
    }]
    action: NEW_ORDER
    # Partial payment configuration
    partialPaymentPolicy: PRO_RATA
  }) {
    success
    orderId
    orderCode
  }
}
```

### Query Payment Status

```graphql
query GetOrderPaymentStatus {
  mktOrder(id: "order-uuid") {
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    partialPaymentPolicy
    paymentThresholdPercent
    licenses {
      id
      licenseKey
      paymentStatus
      gracePeriodEndDate
    }
  }
}
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PARTIAL_PAYMENT_DEFAULT_POLICY` | `WAIT_FULL` | Default policy cho orders mới |
| `PARTIAL_PAYMENT_DEFAULT_THRESHOLD` | `70` | Default threshold % |
| `PARTIAL_PAYMENT_GRACE_PERIOD_DAYS` | `14` | Default grace period |
| `PARTIAL_PAYMENT_REMINDER_DAYS` | `7,12,14` | Days to send reminders |

### Default Values

```typescript
const PARTIAL_PAYMENT_DEFAULTS = {
  policy: 'WAIT_FULL',
  thresholdPercent: 70,
  gracePeriodDays: 14,
  reminderDays: [7, 12, 14],
  autoSuspendOnGraceEnd: true,
};
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [ORDER_LICENSE_CREATION_FLOW.md](ORDER_LICENSE_CREATION_FLOW.md) | Flow tạo order và license cơ bản |
| [MULTI_PAYMENT_METHODS_FLOW.md](MULTI_PAYMENT_METHODS_FLOW.md) | Xử lý nhiều phương thức thanh toán |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-24 | 1.0.0 | Initial documentation |
