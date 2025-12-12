# MKT-Core: Order, Invoice & License Flow Documentation

## Overview

Tài liệu này mô tả chi tiết flow tạo Order, Invoice và License trong module `mkt-core` của hệ thống CRM.

---

## 1. Database Schema

### 1.1 Các bảng chính

| Table | Mô tả |
|-------|-------|
| `mktOrder` | Đơn hàng chính |
| `mktOrderItem` | Các item trong đơn hàng |
| `mktOrderHistory` | Lịch sử thay đổi đơn hàng |
| `mktLicense` | Bản quyền/License |
| `mktLicenseHistory` | Lịch sử thay đổi license |
| `mktInvoice` | Hóa đơn nội bộ |
| `mktSInvoice` | Hóa đơn điện tử (S-Invoice) |
| `mktSInvoiceItem` | Chi tiết item trong hóa đơn điện tử |
| `mktPayment` | Thanh toán |
| `mktPaymentHistory` | Lịch sử thanh toán |
| `mktPaymentMethod` | Phương thức thanh toán |
| `mktCustomer` | Khách hàng |
| `mktContract` | Hợp đồng |

### 1.2 Quan hệ giữa các bảng

```
mktCustomer
    ├── mktOrder (1:N)
    │       ├── mktOrderItem (1:N)
    │       ├── mktLicense (1:N)
    │       ├── mktPayment (1:N)
    │       ├── mktSInvoice (1:N)
    │       ├── mktOrderHistory (1:N)
    │       └── mktContract (N:1)
    └── mktLicense (1:N)
            └── mktLicenseHistory (1:N)
```

---

## 2. Order Flow

### 2.1 Order Status (Trạng thái đơn hàng)

```typescript
enum ORDER_STATUS {
  DRAFT = 'DRAFT',           // Nháp - đơn hàng mới tạo
  TRIAL = 'TRIAL',           // Dùng thử
  WAIT = 'WAIT',             // Chờ xử lý (chờ thanh toán)
  CONFIRMED = 'CONFIRMED',   // Đã xác nhận
  COMPLETED = 'COMPLETED',   // Hoàn thành
  OVERDUE = 'OVERDUE',       // Quá hạn thanh toán
  BLOCKED = 'BLOCKED',       // Bị khóa
  REFUSE = 'REFUSE',         // Từ chối
  REFUND = 'REFUND',         // Hoàn tiền toàn bộ
  REFUND_PARTIAL = 'REFUND_PARTIAL' // Hoàn tiền một phần
}
```

### 2.2 Order Actions

```typescript
enum ORDER_ACTION {
  DRAFT = 'DRAFT',
  TRIAL = 'TRIAL',
  WAIT = 'WAIT',
  CONFIRMED = 'CONFIRMED',
  PAID = 'PAID',
  COMPLETED = 'COMPLETED',
  TRIAL_TO_CONFIRMED = 'TRIAL_TO_CONFIRMED',
  TRIAL_TO_PAID = 'TRIAL_TO_PAID',
  LICENSE_RENEWING = 'LICENSE_RENEWING',
  CHANGE_VARIANT = 'CHANGE_VARIANT',
  REFUND = 'REFUND',
  REFUND_PARTIAL = 'REFUND_PARTIAL'
}
```

### 2.3 Order Creation Flow

#### Step 1: Pre-Query Hook (`mkt-order-create-one.pre-query.hook.ts`)
```
Input Request
    │
    ▼
┌─────────────────────────────────────┐
│ MktOrderCreateOnePreQueryHook       │
│ - Set status = DRAFT                │
│ - Set accountOwnerId từ authContext │
└─────────────────────────────────────┘
    │
    ▼
Database Insert
```

#### Step 2: Post-Query Hook (`mkt-order-create-one.post-query.hook.ts`)

```
Order Created (DRAFT)
    │
    ▼
┌─────────────────────────────────────┐
│ Validate Metadata                   │
│ - variants[]                        │
│ - customer                          │
│ - paymentMethods[]                  │
│ - orderAction                       │
└─────────────────────────────────────┘
    │
    ├──► orderAction = TRIAL ─────────────────────────┐
    │                                                  │
    ├──► orderAction = WAIT ──────────────────────────┤
    │                                                  │
    └──► orderAction = TRIAL_TO_PAID ─────────────────┘
                                                       │
                                                       ▼
                                    ┌─────────────────────────────────────┐
                                    │ OrderConfirmService.confirmOrder()  │
                                    │ 1. Create OrderItems từ variants    │
                                    │ 2. Create Licenses cho mỗi item     │
                                    │ 3. Generate OrderCode               │
                                    │ 4. Calculate Order Values           │
                                    │ 5. Create Contract (if required)    │
                                    │ 6. Create Payment (if not TRIAL)    │
                                    └─────────────────────────────────────┘
                                                       │
                                                       ▼
                                    ┌─────────────────────────────────────┐
                                    │ Update Order Status                 │
                                    │ - TRIAL → status = TRIAL            │
                                    │ - WAIT → status = WAIT              │
                                    │ - Send to Firebase (if payment)     │
                                    └─────────────────────────────────────┘
```

### 2.4 Order State Machine

Hệ thống sử dụng State Pattern để quản lý trạng thái đơn hàng:

```
                    ┌─────────┐
                    │  DRAFT  │
                    └────┬────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
      ┌─────────┐               ┌─────────┐
      │  TRIAL  │               │  WAIT   │
      └────┬────┘               └────┬────┘
           │                         │
           │                         ├───────────┐
           │                         │           │
           ▼                         ▼           ▼
      ┌─────────┐           ┌───────────┐  ┌─────────┐
      │COMPLETED│           │ CONFIRMED │  │ OVERDUE │
      └─────────┘           └─────┬─────┘  └─────────┘
                                  │
                                  ▼
                            ┌───────────┐
                            │ COMPLETED │
                            └───────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
              ┌─────────┐               ┌───────────────┐
              │ REFUND  │               │REFUND_PARTIAL │
              └─────────┘               └───────────────┘
```

### 2.5 Key Services

| Service | File | Chức năng |
|---------|------|-----------|
| `OrderService` | `order.service.ts` | CRUD operations, clone order items |
| `OrderConfirmService` | `order.confirm.service.ts` | Xác nhận đơn hàng, tính toán giá trị |
| `OrderActionService` | `order.action.service.ts` | Xử lý actions theo metadata |
| `OrderStateMachine` | `order-state-machine.ts` | Quản lý state transitions |

---

## 3. License Flow

### 3.1 License Status

```typescript
enum MKT_LICENSE_STATUS {
  ACTIVE = 'ACTIVE',           // Đang hoạt động
  EXPIRED = 'EXPIRED',         // Hết hạn
  REVOKED = 'REVOKED',         // Bị thu hồi
  ERROR = 'ERROR',             // Có lỗi
  RENEWING = 'RENEWING',       // Đang gia hạn
  CHANGE_VARIANT = 'CHANGE_VARIANT', // Đổi sản phẩm
  REFUND = 'REFUND',           // Hoàn tiền
  TRIAL = 'TRIAL',             // Dùng thử
  TRIAL_RENEW = 'TRIAL_RENEW'  // Gia hạn dùng thử
}
```

### 3.2 License Creation Flow

```
Order Confirmed
    │
    ▼
┌─────────────────────────────────────────────────┐
│ MktLicenseService.createLicensesForOrderItems() │
└─────────────────────────────────────────────────┘
    │
    ├── For each OrderItem:
    │       │
    │       ▼
    │   ┌─────────────────────────────────────────┐
    │   │ Validate Variant exists                 │
    │   └─────────────────────────────────────────┘
    │       │
    │       ▼
    │   ┌─────────────────────────────────────────┐
    │   │ Generate License Name                   │
    │   │ "License cho {productName} - {variant}" │
    │   └─────────────────────────────────────────┘
    │       │
    │       ▼
    │   ┌─────────────────────────────────────────┐
    │   │ For i = 1 to quantity:                  │
    │   │   - Call API to get license key         │
    │   │   - Create license record               │
    │   │   - Set status = ACTIVE                 │
    │   │   - Set expiresAt từ API response       │
    │   │   - Link to Order, Customer, Variant    │
    │   └─────────────────────────────────────────┘
    │
    ▼
Licenses Created
```

### 3.3 License Entity Structure

```typescript
type MktLicenseWorkspaceEntity = {
  id: string;
  name: string;
  licenseKey: string;
  licenseUuid: string;
  status: MKT_LICENSE_STATUS;
  activatedAt: Date;
  expiresAt: Date;
  lastLoginAt: Date;
  deviceInfo: string;
  notes: string;
  trialLicense: boolean;
  history: JSON;
  metadata: JSON;

  // Relations
  mktOrderId: string;
  mktCustomerId: string;
  mktVariantId: string;
  accountOwnerId: string;
  departmentOwnerId: string;
  teamOwnerId: string;
}
```

### 3.4 License Renewal Flow (Gia hạn)

```
License near expiry / User requests renewal
    │
    ▼
┌─────────────────────────────────────────────────┐
│ Update License status = RENEWING                │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ Create new Order with:                          │
│ - orderAction = LICENSE_RENEWING                │
│ - Reference to existing license                 │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ linkLicensesForOrderItems()                     │
│ - Call API to extend license                    │
│ - Update licenseKey, expiresAt                  │
│ - Update status = ACTIVE                        │
└─────────────────────────────────────────────────┘
```

### 3.5 Trial to Paid Conversion

```
Trial Order with Trial Licenses
    │
    ▼
┌─────────────────────────────────────────────────┐
│ Create new Order with:                          │
│ - orderAction = TRIAL_TO_PAID                   │
│ - trialOrderId = ID của trial order             │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ trialToPaidOrder()                              │
│ 1. Clone OrderItems từ trial order              │
│ 2. Create Payment records                       │
│ 3. updateReferenceLicenseOrder()                │
│    - Update license.mktOrderId → new order      │
│    - Update license.status = ACTIVE             │
│ 4. Update trial order status = COMPLETED        │
└─────────────────────────────────────────────────┘
```

---

## 4. Invoice Flow

### 4.1 Hai loại Invoice

| Type | Entity | Mô tả |
|------|--------|-------|
| Internal Invoice | `MktInvoiceWorkspaceEntity` | Hóa đơn nội bộ, basic |
| S-Invoice | `MktSInvoiceWorkspaceEntity` | Hóa đơn điện tử, đầy đủ thông tin thuế |

### 4.2 Invoice Status

```typescript
enum MKT_INVOICE_STATUS {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}
```

### 4.3 S-Invoice Creation Flow

```
User creates SInvoice (linked to Order)
    │
    ▼
┌─────────────────────────────────────────────────┐
│ PRE-HOOK: MktSInvoiceCreateOnePreQueryHook      │
│                                                 │
│ 1. Get Order & OrderItems                       │
│ 2. Calculate từ OrderItems:                     │
│    - itemInfo[] (lineNumber, unitPrice, tax)    │
│    - totalAmountWithoutTax                      │
│    - totalTaxAmount                             │
│    - totalAmountWithTax                         │
│    - totalAmountWithTaxInWords (VN)             │
│ 3. Populate buyer info từ Order                 │
│ 4. Set default template (1/770, K23TXM)         │
└─────────────────────────────────────────────────┘
    │
    ▼
Database Insert SInvoice
    │
    ▼
┌─────────────────────────────────────────────────┐
│ POST-HOOK: MktSInvoiceCreateOnePostQueryHook    │
│                                                 │
│ 1. Create SInvoiceItems từ OrderItems           │
│ 2. Create SInvoiceMetadata                      │
│ 3. Create SInvoicePayments                      │
│ 4. Create SInvoiceTaxBreakdowns (group by %)    │
│ 5. Soft-delete SInvoices cũ của cùng Order      │
└─────────────────────────────────────────────────┘
```

### 4.4 S-Invoice Entity Structure

```typescript
type MktSInvoiceWorkspaceEntity = {
  id: string;
  name: string;
  invoiceType: string;
  templateCode: string;      // VD: "1/770"
  invoiceSeries: string;     // VD: "K23TXM"
  invoiceNo: string;
  transactionUuid: string;
  invoiceIssuedDate: Date;

  // Buyer Info
  buyerName: string;
  buyerLegalName: string;
  buyerTaxCode: string;
  buyerAddressLine: string;
  buyerPhoneNumber: string;
  buyerEmail: string;
  buyerIdNo: string;
  buyerIdType: string;

  // Summarize Info
  sumOfTotalLineAmountWithoutTax: number;
  totalAmountAfterDiscount: number;
  totalAmountWithoutTax: number;
  totalTaxAmount: number;
  totalAmountWithTax: number;
  totalAmountWithTaxInWords: string;
  discountAmount: number;

  // Error handling
  errorCode: string;
  errorMessage: string;
  errorData: string;

  // Relations
  mktOrderId: string;
  mktSInvoiceItems: MktSInvoiceItemWorkspaceEntity[];
  mktSInvoicePayments: MktSInvoicePaymentWorkspaceEntity[];
  mktSInvoiceTaxBreakdowns: MktSInvoiceTaxBreakdownWorkspaceEntity[];
  mktSInvoiceMetadata: MktSInvoiceMetadataWorkspaceEntity[];
  mktSInvoiceFiles: MktSInvoiceFileWorkspaceEntity[];
}
```

---

## 5. Payment Flow

### 5.1 Payment Creation (trong Order Flow)

```
Order với paymentMethods[]
    │
    ▼
┌─────────────────────────────────────────────────┐
│ MktPaymentService.createPaymentFromOrder()      │
│                                                 │
│ For each paymentMethod:                         │
│   1. Get PaymentMethod từ DB                    │
│   2. Generate SEPay QR Code URL                 │
│   3. Create Payment record với:                 │
│      - mktOrderId                               │
│      - mktPaymentMethodId                       │
│      - amount, currency                         │
│      - qrCodeUrl                                │
│      - paymentPageUrl                           │
│      - expiredAt                                │
└─────────────────────────────────────────────────┘
    │
    ▼
Return { orderCode, QRCodeUrl }
    │
    ▼
Send to Firebase (pending status)
```

### 5.2 Payment Status

```typescript
enum PAYMENT_STATUS {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}
```

---

## 6. Complete Order Creation Flow (Summary)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                           │
│  createMktOrder({                                               │
│    metadata: {                                                  │
│      variants: [{ mktVariantId, quantity }],                    │
│      customer: { mktCustomerId },                               │
│      paymentMethods: [{ mktPaymentMethodId }],                  │
│      orderAction: "WAIT" | "TRIAL" | "TRIAL_TO_PAID"           │
│    }                                                            │
│  })                                                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. PRE-HOOK: Set status=DRAFT, accountOwnerId                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. INSERT Order to Database                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. POST-HOOK: confirmOrder()                                    │
│    ├── Create OrderItems từ variants                            │
│    ├── Create Licenses cho mỗi OrderItem                        │
│    │   └── Call external API để get license key                 │
│    ├── Generate OrderCode (PREFIX + YYYYMMDD + sequence)        │
│    ├── Calculate: subtotal, tax, discount, totalAmount          │
│    ├── Generate OrderName từ product names                      │
│    ├── Create Contract (if requireContract = true)              │
│    └── Create Payments (if not TRIAL)                           │
│        └── Generate QR Code URLs                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Update Order status based on action:                         │
│    ├── TRIAL → status = TRIAL, trialLicense = true              │
│    └── WAIT → status = WAIT, trialLicense = false               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Send to Firebase (if has payment)                            │
│    └── pendingOrderToFirebase(orderCode, qrCodeUrl)             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Emit events:                                                 │
│    ├── ORDER_CREATED                                            │
│    └── paymentUpdated (if not TRIAL)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. File Structure

```
mkt-core/
├── order/
│   ├── objects/
│   │   ├── mkt-order.workspace-entity.ts
│   │   ├── mkt-order-item.workspace-entity.ts
│   │   ├── mkt-order-history.workspace-entity.ts
│   │   ├── mkt-contract.workspace-entity.ts
│   │   └── mkt-template.workspace-entity.ts
│   ├── hooks/
│   │   ├── mkt-order-create-one.pre-query.hook.ts
│   │   ├── mkt-order-create-one.post-query.hook.ts
│   │   ├── mkt-order-update-one.pre-query.hook.ts
│   │   └── mkt-order-update-one.post-query.hook.ts
│   ├── services/
│   │   ├── order.service.ts
│   │   ├── order.confirm.service.ts
│   │   └── order.action.service.ts
│   ├── states/
│   │   ├── order-state-machine.ts
│   │   ├── draft-state.ts
│   │   ├── trial-state.ts
│   │   ├── wait-state.ts
│   │   ├── confirm-state.ts
│   │   ├── completed-state.ts
│   │   ├── blocked-state.ts
│   │   ├── overdue-state.ts
│   │   ├── refund-state.ts
│   │   └── refund-partial-state.ts
│   └── constants/
│       └── order-status.constants.ts
│
├── license/
│   ├── mkt-license.workspace-entity.ts
│   ├── mkt-license.service.ts
│   ├── license.constants.ts
│   ├── objects/
│   │   └── mkt-license-history.workspace-entity.ts
│   ├── hooks/
│   │   ├── mkt-license-create-one.post-query.hook.ts
│   │   ├── mkt-license-update-one.pre-query.hook.ts
│   │   └── mkt-license-update-one.post-query.hook.ts
│   ├── services/
│   │   ├── mkt-license.renew.service.ts
│   │   └── mkt-license.event.service.ts
│   └── integration/
│       └── mkt-license-api.service.ts
│
├── invoice/
│   ├── objects/
│   │   ├── mkt-invoice.workspace-entity.ts
│   │   ├── mkt-sinvoice.workspace-entity.ts
│   │   ├── mkt-sinvoice-item.workspace-entity.ts
│   │   ├── mkt-sinvoice-payment.workspace-entity.ts
│   │   ├── mkt-sinvoice-tax-breakdown.workspace-entity.ts
│   │   ├── mkt-sinvoice-metadata.workspace-entity.ts
│   │   └── mkt-sinvoice-file.workspace-entity.ts
│   ├── hooks/
│   │   ├── mkt-sinvoice-create-one.pre-query.hook.ts
│   │   └── mkt-sinvoice-create-one.post-query.hook.ts
│   ├── mkt-invoice.service.ts
│   ├── invoice.constants.ts
│   └── integration/
│       └── s-invoice.integration.service.ts
│
└── payment/
    ├── mkt-payment.workspace-entity.ts
    ├── objects/
    │   └── mkt-payment-history.workspace-entity.ts
    ├── services/
    │   ├── mkt-payment.service.ts
    │   └── mkt-payment-prepare.service.ts
    └── integration/
        └── firebase-integration.service.ts
```

---

## 8. Key Configuration

### 8.1 Environment Variables

```bash
ORDER_CODE_PREFIX=MKT       # Prefix cho mã đơn hàng
SERVER_URL=http://localhost # URL server cho payment page
```

### 8.2 Template Defaults (S-Invoice)

```typescript
const DEFAULTS = {
  templateCode: '1/770',
  invoiceSeries: 'K23TXM',
  currencyCode: 'VND',
  exchangeRate: 1
};
```

---

## 9. API Integration Points

| Service | Mục đích |
|---------|----------|
| `MktLicenseApiService` | Gọi external API để tạo/gia hạn license |
| `SInvoiceIntegrationService` | Gọi API hóa đơn điện tử |
| `FireBaseIntegrationService` | Gửi thông tin thanh toán lên Firebase |
| SEPay Integration | Tạo QR Code thanh toán |

---

## 10. Events Emitted

| Event | Trigger | Handler |
|-------|---------|---------|
| `ORDER_CREATED` | Sau khi tạo order thành công | Timeline, Notifications |
| `MKT_LICENSE_RENEWING_EVENT` | Khi license cần gia hạn | License Renewal Job |
| `paymentUpdated` | Khi có cập nhật thanh toán | Payment History |
