# SEPay SDK vs VietQR Webhook - Giải thích chi tiết

**Ngày tạo:** 2026-02-02
**Phiên bản:** 1.0.0

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [SEPay SDK - Payment Gateway Checkout](#2-sepay-sdk---payment-gateway-checkout)
3. [CRM - VietQR Webhook](#3-crm---vietqr-webhook)
4. [So sánh chi tiết](#4-so-sánh-chi-tiết)
5. [Tại sao CRM chọn VietQR Webhook?](#5-tại-sao-crm-chọn-vietqr-webhook)
6. [Khi nào nên dùng SDK?](#6-khi-nào-nên-dùng-sdk)

---

## 1. Tổng quan

SEPay cung cấp **2 phương thức tích hợp** khác nhau cho 2 use case khác nhau:

| Phương thức | Use Case | Ai xử lý thanh toán? |
|-------------|----------|---------------------|
| **SDK** (`sepay-pg-node`) | Payment Gateway Checkout | SEPay |
| **Webhook** | Bank Transfer Notification | Ngân hàng + User |

CRM hiện tại sử dụng **VietQR Webhook** - đây là lựa chọn phù hợp với business requirement.

---

## 2. SEPay SDK - Payment Gateway Checkout

### 2.1 Mô tả

Đây là flow khi **khách hàng thanh toán trực tiếp qua trang checkout của SEPay**. User được redirect sang SEPay để hoàn tất thanh toán.

### 2.2 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SEPAY SDK FLOW (Payment Gateway)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐        │
│   │  User    │      │   CRM    │      │  SEPay   │      │   Bank   │        │
│   │ Browser  │      │  Server  │      │ Gateway  │      │          │        │
│   └────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘        │
│        │                 │                 │                 │               │
│   1. Click "Thanh toán"  │                 │                 │               │
│        │────────────────>│                 │                 │               │
│        │                 │                 │                 │               │
│   2. Tạo checkout form   │                 │                 │               │
│        │<────────────────│                 │                 │               │
│        │   (SDK tạo form với signature)    │                 │               │
│        │                 │                 │                 │               │
│   3. Redirect to SEPay   │                 │                 │               │
│        │─────────────────────────────────->│                 │               │
│        │                 │                 │                 │               │
│   4. Hiển thị trang checkout SEPay         │                 │               │
│        │      (Chọn: Card / QR / Bank)     │                 │               │
│        │                 │                 │                 │               │
│   5. User nhập thông tin thanh toán        │                 │               │
│        │─────────────────────────────────->│                 │               │
│        │                 │                 │                 │               │
│   6. SEPay xử lý với ngân hàng             │                 │               │
│        │                 │                 │────────────────>│               │
│        │                 │                 │<────────────────│               │
│        │                 │                 │                 │               │
│   7. SEPay callback to CRM                 │                 │               │
│        │                 │<────────────────│                 │               │
│        │                 │   (payment result)                │               │
│        │                 │                 │                 │               │
│   8. Redirect user to success_url          │                 │               │
│        │<────────────────────────────────────                │               │
│        │                 │                 │                 │               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Đặc điểm

| Đặc điểm | Mô tả |
|----------|-------|
| **User Experience** | Redirect sang trang SEPay |
| **Payment Methods** | Card, QR Code, Bank Transfer, Napas |
| **Ai xử lý?** | SEPay xử lý toàn bộ payment flow |
| **Security** | SDK tạo chữ ký số (cryptographic signature) |
| **Callback** | SEPay gọi về CRM sau khi thanh toán |

### 2.4 Code Example

```javascript
import { SePayPgClient } from 'sepay-pg-node';

// Khởi tạo client
const client = new SePayPgClient({
  env: 'production',
  merchant_id: 'YOUR_MERCHANT_ID',
  secret_key: 'YOUR_SECRET_KEY'
});

// Tạo checkout URL
const checkoutURL = client.checkout.initCheckoutUrl();

// Tạo form fields với signature
const formFields = client.checkout.initOneTimePaymentFields({
  operation: 'PURCHASE',
  payment_method: 'CARD',  // 'CARD' | 'BANK_TRANSFER' | 'NAPAS_BANK_TRANSFER'
  order_invoice_number: 'ORD-20260202-001',
  order_amount: 500000,
  currency: 'VND',
  order_description: 'Thanh toán đơn hàng #001',
  success_url: 'https://your-crm.com/payment/success',
  error_url: 'https://your-crm.com/payment/error',
  cancel_url: 'https://your-crm.com/payment/cancel'
});

// Render HTML form và submit đến SEPay
// User sẽ được redirect sang SEPay checkout page
```

### 2.5 Khi nào dùng?

- Cần hỗ trợ **thanh toán thẻ** (Visa, Mastercard, JCB)
- Cần **Napas QR** (khác với VietQR)
- Muốn SEPay **quản lý checkout flow**
- Cần **order management** trên SEPay (void, cancel, refund)

---

## 3. CRM - VietQR Webhook

### 3.1 Mô tả

Đây là flow khi **khách hàng tự chuyển khoản qua app ngân hàng**. SEPay chỉ đóng vai trò **thông báo (notify)** khi có giao dịch vào tài khoản.

### 3.2 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CRM VIETQR WEBHOOK FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐        │
│   │  User    │      │   CRM    │      │  SEPay   │      │   Bank   │        │
│   │          │      │  Server  │      │ Webhook  │      │  (BIDV)  │        │
│   └────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘        │
│        │                 │                 │                 │               │
│   1. User tạo đơn hàng   │                 │                 │               │
│        │────────────────>│                 │                 │               │
│        │                 │                 │                 │               │
│   2. CRM hiển thị QR code│                 │                 │               │
│        │<────────────────│                 │                 │               │
│        │   (VietQR với order code)         │                 │               │
│        │                 │                 │                 │               │
│   3. User mở app ngân hàng (BIDV, VCB, ...)                 │               │
│        │                 │                 │                 │               │
│   4. Quét QR và xác nhận chuyển khoản      │                 │               │
│        │─────────────────────────────────────────────────────>               │
│        │                 │                 │                 │               │
│   5. Ngân hàng xử lý giao dịch             │                 │               │
│        │<────────────────────────────────────────────────────│               │
│        │   "Chuyển khoản thành công"       │                 │               │
│        │                 │                 │                 │               │
│   6. Ngân hàng thông báo SEPay (bank integration)           │               │
│        │                 │                 │<────────────────│               │
│        │                 │                 │                 │               │
│   7. SEPay gửi webhook đến CRM             │                 │               │
│        │                 │<────────────────│                 │               │
│        │                 │                 │                 │               │
│        │                 │  POST /hooks/sepay-payment        │               │
│        │                 │  Headers: Authorization: Apikey xxx              │
│        │                 │  Body: {                          │               │
│        │                 │    id: 123456,                    │               │
│        │                 │    gateway: "BIDV",               │               │
│        │                 │    code: "ORD-001",               │               │
│        │                 │    transferAmount: 500000,        │               │
│        │                 │    content: "ORD-001 thanh toan", │               │
│        │                 │    ...                            │               │
│        │                 │  }                                │               │
│        │                 │                 │                 │               │
│   8. CRM xử lý webhook:  │                 │                 │               │
│        │                 │  ├─ Validate API key              │               │
│        │                 │  ├─ Check idempotency             │               │
│        │                 │  ├─ Match order by code           │               │
│        │                 │  ├─ Update payment status         │               │
│        │                 │  └─ Confirm order                 │               │
│        │                 │                 │                 │               │
│   9. CRM response        │                 │                 │               │
│        │                 │────────────────>│                 │               │
│        │                 │  { success: true }                │               │
│        │                 │                 │                 │               │
│  10. User refresh trang → thấy "Đã thanh toán"              │               │
│        │<────────────────│                 │                 │               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Đặc điểm

| Đặc điểm | Mô tả |
|----------|-------|
| **User Experience** | Ở lại CRM, quét QR bằng app ngân hàng |
| **Payment Methods** | Bank Transfer only (VietQR) |
| **Ai xử lý?** | User tự chuyển khoản, SEPay chỉ notify |
| **Security** | API Key + IP Whitelist |
| **Webhook** | SEPay push notification khi có giao dịch |

### 3.4 Code Example

```typescript
// 1. CRM generate QR URL
const SEPAY_QR_URL_TEMPLATE =
  'https://qr.sepay.vn/img?acc={acc}&bank={bank}&amount={amount}&des={va} {orderCode}';

const qrUrl = SEPAY_QR_URL_TEMPLATE
  .replace('{acc}', '1234567890')
  .replace('{bank}', 'BIDV')
  .replace('{amount}', '500000')
  .replace('{va}', 'VA001')
  .replace('{orderCode}', 'ORD-001');

// 2. CRM nhận webhook khi có giao dịch
@Post('hooks/sepay-payment')
@HttpCode(HttpStatus.OK)
async handleSepayPayment(
  @Body() payload: SepayWebhookDto,
  @Headers('authorization') authorization: string,
) {
  // Validate API key
  this.sepayAuthService.validateAuthorizationHeader(authorization);

  // Process payment
  return this.webhookService.processWebhookPayment(payload);
}

// 3. Webhook payload structure
type SepayWebhookPayload = {
  id: number;              // Unique transaction ID
  gateway: string;         // "BIDV", "VCB", ...
  transactionDate: string; // "2026-02-02 10:30:00"
  accountNumber: string;   // Số TK nhận tiền
  code: string;            // Order code (parsed by SEPay)
  content: string;         // Nội dung chuyển khoản
  transferType: 'in';      // Tiền vào
  transferAmount: number;  // Số tiền
  accumulated: number;     // Số dư sau giao dịch
};
```

### 3.5 Khi nào dùng?

- Chỉ cần hỗ trợ **chuyển khoản ngân hàng**
- Muốn user **ở lại trên CRM** (không redirect)
- Muốn **free phí gateway** (chuyển khoản không mất phí)
- Business model phù hợp với **B2B** hoặc **invoice-based**

---

## 4. So sánh chi tiết

### 4.1 Bảng so sánh

| Tiêu chí | SDK (Payment Gateway) | Webhook (VietQR) |
|----------|----------------------|------------------|
| **User redirect** | Sang SEPay | Không, ở lại CRM |
| **Payment page** | SEPay quản lý | CRM tự tạo |
| **Payment methods** | Card, QR, Napas, Bank | Bank transfer only |
| **Ai thu tiền?** | SEPay collect | User tự chuyển |
| **Phí gateway** | Có (% giao dịch) | Không |
| **Real-time** | Callback sau thanh toán | Webhook khi có giao dịch |
| **Security** | Cryptographic signature | API Key + IP Whitelist |
| **Order management** | SDK methods | CRM tự quản lý |
| **Refund** | Qua SEPay API | Manual / CRM xử lý |

### 4.2 Diagram so sánh

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SO SÁNH 2 PHƯƠNG THỨC                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   SDK FLOW:                                                                  │
│   ┌──────┐    ┌─────┐    ┌───────┐    ┌──────┐                              │
│   │ User │───>│ CRM │───>│ SEPay │───>│ Bank │                              │
│   └──────┘    └─────┘    └───────┘    └──────┘                              │
│      │                       │                                               │
│      │    REDIRECT ──────────┘                                               │
│      │    (User rời CRM)                                                     │
│      └───────────────────────────────────────>│ Thanh toán trên SEPay       │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│   WEBHOOK FLOW:                                                              │
│   ┌──────┐    ┌─────┐              ┌───────┐    ┌──────┐                    │
│   │ User │───>│ CRM │              │ SEPay │<───│ Bank │                    │
│   └──────┘    └─────┘              └───────┘    └──────┘                    │
│      │           │                      │                                    │
│      │    Xem QR │                      │                                    │
│      │<──────────┘                      │                                    │
│      │                                  │                                    │
│      │    Mở app bank, quét QR ─────────────────────────>│                  │
│      │    (User ở lại CRM)              │                │ Chuyển khoản     │
│      │                                  │<───────────────┘                  │
│      │                                  │ Webhook notify                    │
│      │           ┌─────┐<───────────────┘                                   │
│      │           │ CRM │ Update payment                                     │
│      │           └─────┘                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 User Experience Comparison

**SDK Flow:**
```
1. User click "Thanh toán"
2. → Redirect sang sepay.vn/checkout/xxx
3. → Chọn phương thức (Thẻ/QR/Bank)
4. → Nhập thông tin thanh toán
5. → Xác nhận
6. → Redirect về CRM (success/error page)
```

**Webhook Flow:**
```
1. User click "Thanh toán"
2. → CRM hiển thị QR code + thông tin chuyển khoản
3. → User mở app Vietcombank/BIDV/...
4. → Quét QR hoặc nhập thủ công
5. → Xác nhận trong app bank
6. → Refresh CRM → "Đã thanh toán" ✓
```

---

## 5. Tại sao CRM chọn VietQR Webhook?

### 5.1 Phù hợp với thị trường Việt Nam

```
┌─────────────────────────────────────────────────────────────────┐
│              THÓI QUEN THANH TOÁN TẠI VIỆT NAM                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Bank Transfer (VietQR)  ████████████████████████████  70%     │
│   E-wallets (MoMo, ZaloPay) ████████████████  25%               │
│   Credit/Debit Card         ████  5%                             │
│                                                                  │
│   → Phần lớn người dùng VN quen với chuyển khoản                │
│   → VietQR đã phổ biến, hầu hết app bank đều hỗ trợ             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Không mất phí gateway

| Payment Method | Phí Gateway |
|----------------|------------|
| Credit Card | 2-3% per transaction |
| SEPay Checkout | ~1-2% per transaction |
| **Bank Transfer (VietQR)** | **0% (free)** |

### 5.3 UX đơn giản hơn

- User **không bị redirect** sang trang khác
- **Quen thuộc** với flow chuyển khoản
- Không cần nhập lại thông tin thanh toán

### 5.4 Phù hợp với B2B

- Doanh nghiệp thường thanh toán qua **chuyển khoản**
- Cần **hóa đơn** trước khi thanh toán
- Order amount lớn → chuyển khoản phù hợp hơn thẻ

### 5.5 Real-time notification

- SEPay webhook thông báo **ngay lập tức** khi có giao dịch
- CRM cập nhật trạng thái **tự động**
- Không cần user confirm thủ công

---

## 6. Khi nào nên dùng SDK?

### 6.1 Use cases phù hợp với SDK

| Use Case | Lý do cần SDK |
|----------|--------------|
| **E-commerce B2C** | Cần thanh toán thẻ quốc tế |
| **Subscription** | Recurring payments |
| **International customers** | Card payments |
| **Instant checkout** | One-click payment |
| **Mobile app** | SEPay mobile SDK |

### 6.2 Có thể dùng song song

CRM có thể integrate **cả hai** phương thức:

```typescript
// payment-provider.factory.ts
export class PaymentProviderFactory {
  getProvider(method: PaymentMethod): IPaymentProvider {
    switch (method) {
      case 'BANK_TRANSFER':
        return this.vietQrWebhookProvider;  // Hiện tại
      case 'CARD':
        return this.sepayCheckoutProvider;   // Có thể thêm
      case 'NAPAS_QR':
        return this.sepayNapasProvider;      // Có thể thêm
    }
  }
}
```

### 6.3 Architecture Extension

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-GATEWAY ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   PaymentFacadeService                   │   │
│   └────────────────────────────┬────────────────────────────┘   │
│                                │                                 │
│              ┌─────────────────┼─────────────────┐              │
│              │                 │                 │              │
│              ▼                 ▼                 ▼              │
│   ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│   │ VietQR Webhook   │ │ SEPay SDK    │ │ Other Gateways   │   │
│   │ Provider         │ │ Provider     │ │ (MoMo, ZaloPay)  │   │
│   │ (Current)        │ │ (Future)     │ │ (Future)         │   │
│   └──────────────────┘ └──────────────┘ └──────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kết luận

**CRM sử dụng VietQR Webhook là lựa chọn đúng đắn** cho use case hiện tại:

| ✅ Ưu điểm | Mô tả |
|-----------|-------|
| Phù hợp thị trường VN | 70% thanh toán qua bank transfer |
| Free phí gateway | Không mất % giao dịch |
| UX tốt | User quen, không redirect |
| Real-time | Webhook notify ngay |
| Đơn giản | Không cần SDK phức tạp |

**Nếu cần mở rộng** (thanh toán thẻ, Napas), có thể integrate SDK song song mà không ảnh hưởng đến hệ thống hiện tại.

---

## Tài liệu liên quan

- [SEPAY_INTEGRATION_COMPLIANCE_REPORT.md](./SEPAY_INTEGRATION_COMPLIANCE_REPORT.md) - Báo cáo đánh giá chi tiết
- [MULTI_PAYMENT_FLOW.md](./MULTI_PAYMENT_FLOW.md) - Flow thanh toán đa phương thức
- [SEPay Developer Portal](https://developer.sepay.vn) - Tài liệu chính thức

---

*Generated: 2026-02-02*
*Version: 1.0.0*
