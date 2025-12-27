# Order & License Creation Flow

## Overview

Tài liệu này mô tả chi tiết flow tạo đơn hàng và license trong hệ thống MKT CRM. Flow được thiết kế theo Saga Pattern để đảm bảo tính nhất quán dữ liệu và hỗ trợ rollback khi có lỗi.

**Nguyên tắc quan trọng:**
- **Đơn hàng thường (NEW_ORDER):** License chỉ được tạo SAU KHI kế toán xác nhận thanh toán thành công
- **Đơn hàng Trial (TRIAL):** License trial được tạo NGAY KHI tạo đơn hàng

---

## Kịch bản sử dụng

### Use Case 1: Tạo đơn hàng và hóa đơn (NEW_ORDER)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UC-01: Tạo đơn hàng và hóa đơn                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Actor: Sales                                                                │
│  Pre-condition: Đã có thông tin khách hàng                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Sales tạo đơn hàng                                                       │
│     - Chọn khách hàng (customerId)                                           │
│     - Chọn sản phẩm và gói (productId, packageId)                            │
│     - Chọn số thiết bị (maxDevices)                                          │
│     - Action: NEW_ORDER                                                      │
│     ⚠️  License CHƯA được tạo ở bước này                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. Hệ thống xử lý đơn hàng                                                  │
│     - Tạo product/package snapshots                                          │
│     - Tính giá, áp dụng discount/coupon                                      │
│     - Tạo QR code thanh toán (SEPay)                                         │
│     - Trạng thái: WAIT (chờ thanh toán)                                      │
│     - Gửi email thông báo đơn hàng cho khách                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. Khách hàng thanh toán                                                    │
│     - Quét QR code / Chuyển khoản                                            │
│     - Kế toán nhận được thông báo giao dịch                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. Kế toán xác nhận thanh toán                                              │
│     - Xác minh giao dịch ngân hàng                                           │
│     - Gọi mutation: mktConfirmOrder(action: ACCOUNTING_CONFIRMED)            │
│     ✅ License được tạo SAU KHI xác nhận                                     │
│     - Trạng thái: WAIT → CONFIRMED                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. Hệ thống tạo License                                                     │
│     - Gọi MKT License API để tạo license                                     │
│     - Lưu licenseId, licenseKey vào order item                               │
│     - Tạo license snapshot                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  6. Hoàn tất đơn hàng                                                        │
│     - Sinh hóa đơn tự động (Invoice)                                         │
│     - Gửi email: hóa đơn PDF + license key                                   │
│     - Trạng thái: CONFIRMED → COMPLETED                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Post-condition:                                                             │
│  ✓ Đơn hàng ở trạng thái "COMPLETED"                                         │
│  ✓ Hóa đơn được tạo                                                          │
│  ✓ License được kích hoạt                                                    │
│  ✓ Khách hàng nhận được email với license key                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Alternative Flows

| Scenario | Flow | Action |
|----------|------|--------|
| Quá hạn thanh toán | Quá 7 ngày chưa thanh toán | Trạng thái → `BLOCKED`, không tạo license |
| Coupon không hợp lệ | Mã coupon hết hạn/sai | Thông báo lỗi, tiếp tục không áp dụng coupon |
| Thanh toán thất bại | Kế toán từ chối xác nhận | Trạng thái giữ WAIT, thông báo khách hàng |

---

### Use Case 1b: Tạo đơn Trial (TRIAL)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UC-01b: Tạo đơn Trial                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Actor: Sales/CSKH                                                           │
│  Pre-condition: Khách hàng yêu cầu dùng thử                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Sales tạo đơn trial                                                      │
│     - Chọn khách hàng (customerId)                                           │
│     - Chọn sản phẩm và gói (productId, packageId)                            │
│     - Action: TRIAL                                                          │
│     ✅ License trial được tạo NGAY LẬP TỨC                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. Hệ thống xử lý                                                           │
│     - Tạo product/package snapshots                                          │
│     - KHÔNG tính giá (trial miễn phí)                                        │
│     - KHÔNG tạo QR code thanh toán                                           │
│     - Tạo license trial trên MKT Server                                      │
│     - Trạng thái: TRIAL                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. Gửi thông báo                                                            │
│     - Email trial license cho khách hàng                                     │
│     - Thông báo thời hạn trial (7-30 ngày)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Post-condition:                                                             │
│  ✓ Đơn hàng ở trạng thái "TRIAL"                                             │
│  ✓ License trial đã được kích hoạt                                           │
│  ✓ KHÔNG tạo hóa đơn                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Use Case 2: Gia hạn bản quyền

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UC-02: Gia hạn bản quyền                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Actor: CSKH/Sales                                                           │
│  Pre-condition: Bản quyền sắp hết hạn, khách hàng đồng ý gia hạn             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Hệ thống cảnh báo                                                        │
│     - Cron job kiểm tra license sắp hết hạn                                  │
│     - Gửi notification cho CSKH                                              │
│     - Thời điểm: 30/15/7 ngày trước khi hết hạn                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. Liên hệ khách hàng                                                       │
│     - CSKH liên hệ xác nhận gia hạn                                          │
│     - Tư vấn gói gia hạn phù hợp                                             │
│     - Xác nhận thời hạn mới                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
        ┌───────────────────────┐         ┌───────────────────────┐
        │  Đồng ý gia hạn       │         │  Từ chối gia hạn      │
        └───────────────────────┘         └───────────────────────┘
                    │                                   │
                    ▼                                   ▼
┌───────────────────────────────────┐   ┌───────────────────────────────────┐
│  3a. Tạo đơn gia hạn              │   │  3b. Đánh dấu hết hạn             │
│     - action: LICENSE_RENEWING    │   │     - License status → EXPIRED    │
│     - licenseId: ID cần gia hạn   │   │     - Ghi chú lý do từ chối       │
│     - Tạo hóa đơn gia hạn         │   │     - Đóng case CSKH              │
│     ⚠️  License chưa gia hạn      │   │                                   │
└───────────────────────────────────┘   └───────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. Kế toán xác nhận thanh toán                                              │
│     - Xác minh giao dịch                                                     │
│     - Gọi mutation: mktConfirmOrder(action: ACCOUNTING_CONFIRMED)            │
│     ✅ License được gia hạn SAU KHI xác nhận                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. Cập nhật license                                                         │
│     - Gọi MKT License API để gia hạn                                         │
│     - Cập nhật thời hạn bản quyền                                            │
│     - License status: ACTIVE                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Post-condition:                                                             │
│  ✓ Bản quyền được gia hạn                                                    │
│  ✓ Trạng thái license: "ACTIVE" (Đang dùng)                                  │
│  ✓ Hóa đơn gia hạn được tạo                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Order Actions Matrix

| Action | Use Case | Tạo License khi | Mô tả |
|--------|----------|-----------------|-------|
| `NEW_ORDER` | Đơn mới | Kế toán xác nhận | Đơn hàng thường, cần thanh toán trước |
| `TRIAL` | Dùng thử | Tạo đơn hàng | License trial được tạo ngay, 7-30 ngày |
| `TRIAL_TO_PAID` | Chuyển trial → paid | Kế toán xác nhận | Convert trial thành bản quyền chính thức |
| `LICENSE_RENEWING` | Gia hạn | Kế toán xác nhận | Gia hạn license hiện có |

---

## Architecture

### Flow tổng quan theo Action

```
                              ┌─────────────────┐
                              │ mktCreateOrder  │
                              │   WithItems     │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
            │  NEW_ORDER    │  │    TRIAL      │  │LICENSE_RENEW  │
            └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
            │CreateOrderSaga│  │CreateOrderSaga│  │CreateOrderSaga│
            │(Skip License) │  │(With License) │  │(Skip License) │
            └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
                    │                  │                  │
                    ▼                  │                  ▼
            ┌───────────────┐          │          ┌───────────────┐
            │ Status: WAIT  │          │          │ Status: WAIT  │
            │ Chờ thanh toán│          │          │ Chờ thanh toán│
            └───────┬───────┘          │          └───────┬───────┘
                    │                  │                  │
                    ▼                  │                  ▼
            ┌───────────────┐          │          ┌───────────────┐
            │  Kế toán      │          │          │  Kế toán      │
            │  xác nhận     │          │          │  xác nhận     │
            └───────┬───────┘          │          └───────┬───────┘
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
            │ConfirmOrder   │  │ Status: TRIAL │  │ConfirmOrder   │
            │Saga + License │  │ License ACTIVE│  │Saga + Extend  │
            └───────┬───────┘  └───────────────┘  └───────┬───────┘
                    │                                     │
                    ▼                                     ▼
            ┌───────────────┐                     ┌───────────────┐
            │Status:COMPLETE│                     │Status:COMPLETE│
            │License ACTIVE │                     │License ACTIVE │
            └───────────────┘                     └───────────────┘
```

### CreateOrderSaga Steps (theo Action)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Create Order Saga                                 │
│                         (Orchestration Layer)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Step 1: Create Order       → Tạo order record, generate code               │
│  Step 2: Create Snapshots   → Validate & snapshot products/packages         │
│  Step 3: Create Order Items → Tạo items với snapshots                       │
│  Step 4: Calculate Promotion→ Apply promotions/coupons                      │
│  Step 5: Create Licenses    → [CONDITIONAL] Chỉ chạy nếu TRIAL              │
│  Step 6: Create Payment     → [CONDITIONAL] Skip nếu TRIAL                  │
│  Step 7: Finalize Order     → Update totals, status                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 5: Create Licenses - Conditional Logic                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  IF action === TRIAL:                                                        │
│     → Tạo license trial ngay lập tức                                         │
│     → License status: TRIAL                                                  │
│                                                                              │
│  IF action === NEW_ORDER || LICENSE_RENEWING:                                │
│     → SKIP step này                                                          │
│     → License sẽ được tạo trong ConfirmOrderSaga                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### ConfirmOrderSaga Steps (tạo License sau xác nhận)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Confirm Order Saga                                 │
│                    (Khi kế toán xác nhận thanh toán)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Step 1: Validate Order     → Kiểm tra order tồn tại, trạng thái hợp lệ     │
│  Step 2: Validate Transition→ Kiểm tra chuyển trạng thái hợp lệ             │
│  Step 3: Create Licenses    → [NEW] Tạo license trên MKT Server             │
│  Step 4: Update Status      → WAIT → CONFIRMED                               │
│  Step 5: Create Invoice     → Sinh hóa đơn tự động                           │
│  Step 6: Send Notification  → Gửi email license + invoice                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Input Parameters

### CreateOrderWithItemsInput

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `customerId` | UUID | Yes | - | ID của khách hàng |
| `name` | String | No | Auto-generated | Tên đơn hàng |
| `currency` | String | No | `VND` | Đơn vị tiền tệ |
| `note` | String | No | - | Ghi chú |
| `requireContract` | Boolean | No | `false` | Yêu cầu hợp đồng |
| `discountPercent` | Number | No | `0` | Phần trăm giảm giá |
| `externalProducts` | Array | Yes | - | Danh sách sản phẩm từ MKT Server |
| `orderLanguage` | String | No | `vi` | Ngôn ngữ hiển thị (`vi`/`en`/`ko`) |
| `paymentMethods` | Array | No | - | Phương thức thanh toán |
| `action` | Enum | Yes | - | Loại action (`NEW_ORDER`, `TRIAL`, etc.) |
| `couponCode` | String | No | - | Mã coupon |
| `applyAutoPromotions` | Boolean | No | `true` | Tự động áp dụng khuyến mãi |

### ExternalMktProductInput

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `productId` | UUID | Yes | - | ID sản phẩm từ MKT Server |
| `packageId` | UUID | No | - | ID gói từ MKT Server |
| `maxDevices` | Number | No | `1` | Số thiết bị tối đa cho license |
| `splitLicenses` | Boolean | No | `false` | Tách thành nhiều license riêng biệt |

---

## License Creation Logic

### Điều kiện tạo License

```typescript
// Trong CreateLicensesStep
shouldSkip(context: SagaContext, input: CreateOrderWithItemsInput): boolean {
  // Chỉ tạo license ngay nếu là TRIAL
  if (input.action === ORDER_ACTION.TRIAL) {
    return false; // Không skip → tạo license
  }

  // Các action khác: skip, đợi kế toán xác nhận
  return true;
}
```

### Flow Chi Tiết - Tạo License

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    License Creation (TRIAL hoặc sau xác nhận)                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │  Get Customer Info      │
                        │  (including linkedAccounts)
                        └─────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │  Extract Email          │
                        │  Priority:              │
                        │  1. Primary MKT_SERVER  │
                        │  2. Any MKT_SERVER      │
                        │  3. Customer email      │
                        └─────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │  For each Order Item    │
                        └─────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
        ┌───────────────────────┐         ┌───────────────────────┐
        │  splitLicenses=false  │         │  splitLicenses=true   │
        │  (Default)            │         │                       │
        └───────────────────────┘         └───────────────────────┘
                    │                                   │
                    ▼                                   ▼
        ┌───────────────────────┐         ┌───────────────────────┐
        │  Create 1 License     │         │  Create N Licenses    │
        │  maxDevices = N       │         │  maxDevices = 1 each  │
        │                       │         │  (N = maxDevices)     │
        └───────────────────────┘         └───────────────────────┘
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │  Update Order Item      │
                        │  - externalMktLicenseId │
                        │  - externalMktLicenseKey│
                        │  - licenseSnapshot      │
                        └─────────────────────────┘
```

### splitLicenses Option

| `maxDevices` | `splitLicenses` | Số License | Devices/License | Use Case |
|--------------|-----------------|------------|-----------------|----------|
| 3 | `false` | 1 | 3 | 1 license dùng được trên 3 thiết bị |
| 3 | `true` | 3 | 1 | 3 license riêng biệt, mỗi cái 1 thiết bị |
| 5 | `false` | 1 | 5 | Team license |
| 5 | `true` | 5 | 1 | Individual licenses cho team members |

### Email Extraction Priority

Khi tạo license, email được lấy theo thứ tự ưu tiên:

```typescript
extractMktServerEmail(linkedAccounts, fallbackEmail) {
  // 1. Primary MKT_SERVER account
  const primary = linkedAccounts.find(
    a => a.provider === 'MKT_SERVER' && a.isPrimary
  );
  if (primary?.email) return primary.email;

  // 2. Any MKT_SERVER account with email-seeder
  const any = linkedAccounts.find(
    a => a.provider === 'MKT_SERVER' && a.email
  );
  if (any?.email) return any.email;

  // 3. Fallback to customer email-seeder
  return fallbackEmail ?? '';
}
```

---

## Order Status Flow

### State Diagram

```
                         ┌─────────┐
                         │  DRAFT  │
                         └────┬────┘
                              │ create
                              ▼
                    ┌─────────────────────┐
         ┌──────────│       WAIT          │──────────┐
         │          │  (Chờ thanh toán)   │          │
         │          └─────────┬───────────┘          │
         │                    │                      │
         │ timeout (7 days)   │ accounting_confirmed │ cancel
         │                    │                      │
         ▼                    ▼                      ▼
   ┌──────────┐        ┌──────────┐           ┌──────────┐
   │ BLOCKED  │        │CONFIRMED │           │ CANCELED │
   │ (Quá hạn)│        │(Đã xác   │           │          │
   └──────────┘        │ nhận)    │           └──────────┘
                       └────┬─────┘
                            │ fulfill
                            ▼
                       ┌──────────┐
                       │COMPLETED │
                       │(Hoàn     │
                       │ thành)   │
                       └────┬─────┘
                            │
            ┌───────────────┴───────────────┐
            │ refund                        │ partial_refund
            ▼                               ▼
      ┌──────────┐                  ┌──────────────┐
      │  REFUND  │                  │REFUND_PARTIAL│
      │(Hoàn tiền│                  │(Hoàn 1 phần) │
      │ toàn bộ) │                  │              │
      └──────────┘                  └──────────────┘


                    TRIAL FLOW
                    ──────────
                         ┌─────────┐
                         │  TRIAL  │
                         │(7-30day)│
                         └────┬────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐    ┌──────────┐
        │ EXPIRED  │   │TRIAL_TO_ │    │ CANCELED │
        │(Hết hạn) │   │  PAID    │    │          │
        └──────────┘   └──────────┘    └──────────┘
```

---

## Error Handling

### Rollback Flow khi lỗi

```
ConfirmOrderSaga Step 3 fails (License creation error)
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Compensate Step 3                             │
│                    Revoke created licenses                       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Compensate Step 2                             │
│                    Revert status transition                      │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Notify Error                                  │
│                    Log error, alert admin                        │
└─────────────────────────────────────────────────────────────────┘
```

### Error Types

| Error | Step | Recovery |
|-------|------|----------|
| Product not found | CreateSnapshots | Fail fast, no rollback needed |
| Package not available | CreateSnapshots | Fail fast, no rollback needed |
| Order creation failed | CreateOrder | Fail fast, no rollback needed |
| License creation failed | CreateLicenses | Rollback previous steps, revoke created licenses |
| MKT Server unreachable | CreateLicenses | Retry with exponential backoff, then rollback |
| Payment already confirmed | ConfirmOrder | Return error, order already processed |

---

## Examples

### Example 1: Tạo đơn hàng NEW_ORDER (cần xác nhận)

```graphql
# Step 1: Sales tạo đơn hàng
mutation CreateOrder {
  mktCreateOrderWithItems(input: {
    customerId: "550e8400-e29b-41d4-a716-446655440000"
    externalProducts: [{
      productId: "prod-123"
      packageId: "pkg-456"
      maxDevices: 3
      splitLicenses: false
    }]
    action: NEW_ORDER
  }) {
    success
    orderId
    orderCode
    paymentQrCode  # QR code để thanh toán
  }
}

# Result: Order created với status WAIT
# License: CHƯA được tạo
```

```graphql
# Step 2: Kế toán xác nhận sau khi nhận thanh toán
mutation ConfirmOrder {
  mktConfirmOrder(input: {
    orderId: "order-uuid"
    action: ACCOUNTING_CONFIRMED
    accountingConfirmed: true
    note: "Đã nhận thanh toán qua BIDV"
  }) {
    success
    orderId
    newStatus  # CONFIRMED
  }
}

# Result:
# - License được tạo trên MKT Server
# - Order status: CONFIRMED
# - Invoice được sinh tự động
# - Email gửi cho khách hàng
```

### Example 2: Tạo đơn Trial (tạo license ngay)

```graphql
mutation CreateTrialOrder {
  mktCreateOrderWithItems(input: {
    customerId: "550e8400-e29b-41d4-a716-446655440000"
    externalProducts: [{
      productId: "prod-123"
      packageId: "pkg-trial"
      maxDevices: 1
    }]
    action: TRIAL
  }) {
    success
    orderId
    orderCode
    order {
      orderItems {
        externalMktLicenseKey  # License key được tạo NGAY
      }
    }
  }
}

# Result:
# - Order status: TRIAL
# - License: ĐÃ được tạo ngay
# - Không có QR code thanh toán
# - Không có Invoice
```

### Example 3: Split Licenses for Team

```graphql
mutation CreateTeamOrder {
  mktCreateOrderWithItems(input: {
    customerId: "550e8400-e29b-41d4-a716-446655440000"
    externalProducts: [{
      productId: "prod-enterprise"
      packageId: "pkg-team"
      maxDevices: 5
      splitLicenses: true  # Tạo 5 license riêng biệt
    }]
    action: NEW_ORDER
    couponCode: "TEAM20"
  }) {
    success
    orderId
    paymentQrCode
  }
}

# Sau khi kế toán xác nhận:
# → 5 license keys riêng biệt được tạo
# → externalMktLicenseKey: "KEY1, KEY2, KEY3, KEY4, KEY5"
```

---

## Related Files

| File | Description |
|------|-------------|
| `order/orchestration/saga/create-order.saga.ts` | Saga tạo đơn hàng |
| `order/orchestration/saga/confirm-order.saga.ts` | Saga xác nhận đơn hàng |
| `order/orchestration/steps/create-licenses.step.ts` | Step tạo license |
| `customer/repositories/mkt-customer.repository.ts` | Repository khách hàng (extractMktServerEmail) |
| `mkt-license-integration/services/mkt-license-proxy.service.ts` | License API client |
| `order/dto/create-order.input.ts` | GraphQL input DTOs |
| `order/types/order-mutation.types.ts` | TypeScript types |
| `order/listeners/license-lifecycle.listener.ts` | Listener activate/revoke license |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MKT_LICENSE_API_URL` | - | MKT License Server URL |
| `MKT_AUTO_SYNC_ENABLED` | `true` | Auto-sync products on token acquired |
| `MKT_SCHEDULED_SYNC_ENABLED` | `true` | Enable scheduled sync |
| `MKT_SCHEDULED_SYNC_CRON` | `0 */30 * * * *` | Sync cron schedule |
| `ORDER_OVERDUE_DAYS` | `7` | Số ngày trước khi block đơn hàng |

### Default Values

```typescript
const DEFAULT_MAX_DEVICES = 1;
const DEFAULT_SPLIT_LICENSES = false;
const DEFAULT_ORDER_LANGUAGE = 'vi';
const DEFAULT_CURRENCY = 'VND';
const DEFAULT_TRIAL_DAYS = 14;
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-24 | 1.0.0 | Initial documentation |
| 2024-12-24 | 1.1.0 | Added `splitLicenses` option |
| 2024-12-24 | 1.2.0 | Added `linkedAccounts` email extraction |
| 2024-12-24 | 2.0.0 | **Major change**: License tạo sau khi kế toán xác nhận (trừ TRIAL) |
