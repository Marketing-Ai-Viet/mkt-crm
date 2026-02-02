# SEPay Webhook Integration Guide

Tài liệu hướng dẫn tích hợp SEPay webhook và cách định danh giao dịch thanh toán.

## 1. Tổng quan

SEPay là cổng thanh toán hỗ trợ VietQR, cho phép nhận thông báo giao dịch realtime qua webhook trong vòng 10 giây.

### Flow thanh toán

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Website   │────>│  Tạo QR     │────>│  Khách hàng │────>│  Ngân hàng  │
│   (CRM)     │     │  (SEPay)    │     │  quét QR    │     │  xử lý      │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
      ┌────────────────────────────────────────────────────────────┘
      │
      v
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   SEPay     │────>│   Webhook   │────>│   Website   │
│   detect    │     │   POST      │     │   xử lý     │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 2. Webhook Payload Structure

Khi có giao dịch, SEPay gửi POST request với payload JSON:

```json
{
  "id": 92704,
  "gateway": "Vietcombank",
  "transactionDate": "2023-03-25 14:02:37",
  "accountNumber": "0123499999",
  "code": "MKT20240101001",
  "content": "MKT20240101001 thanh toan don hang",
  "transferType": "in",
  "transferAmount": 2277000,
  "accumulated": 19077000,
  "subAccount": "VA123456",
  "referenceCode": "MBVCB.3278907687",
  "description": ""
}
```

### Mô tả các field

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | number | Transaction ID unique trên SEPay - **dùng cho idempotency** |
| `gateway` | string | Tên ngân hàng (Vietcombank, BIDV, VietinBank...) |
| `transactionDate` | string | Thời gian giao dịch (YYYY-MM-DD HH:mm:ss) |
| `accountNumber` | string | Số tài khoản ngân hàng nhận tiền |
| `code` | string \| null | **Mã thanh toán được SEPay tự động nhận diện** |
| `content` | string | Nội dung chuyển khoản gốc |
| `transferType` | "in" \| "out" | Loại giao dịch: tiền vào / tiền ra |
| `transferAmount` | number | Số tiền giao dịch (VND) |
| `accumulated` | number | Số dư tài khoản sau giao dịch |
| `subAccount` | string \| null | **Virtual Account (VA) identifier** |
| `referenceCode` | string | Mã tham chiếu từ SMS ngân hàng |
| `description` | string | Nội dung SMS đầy đủ |

## 3. Cách SEPay nhận diện mã thanh toán (`code`)

SEPay có tính năng **"Cấu trúc mã thanh toán"** (Payment Code Structure) để tự động extract mã từ nội dung chuyển khoản.

### 3.1 Cấu hình trên SEPay Dashboard

1. Truy cập **My SEPay → Company Configuration → General Configuration**
2. Tìm mục **"Cấu trúc mã thanh toán"**
3. Click **"Add New Code Template"**
4. Nhập **prefix** (2-5 ký tự): `MKT`, `DH`, `ORD`, etc.
5. Click **"Update"**

### 3.2 Cách hoạt động

Khi cấu hình prefix là `MKT`:

| Nội dung chuyển khoản | SEPay extract `code` |
|----------------------|---------------------|
| `MKT20240101001 thanh toan` | `MKT20240101001` |
| `Thanh toan don MKT20240101001` | `MKT20240101001` |
| `chuyen tien mua hang` | `null` (không có prefix) |

### 3.3 Option bổ sung

Trong webhook settings, có thể bật:
- **"Bỏ qua nếu nội dung không có code"**: SEPay sẽ KHÔNG gửi webhook nếu không nhận diện được mã thanh toán

## 4. Các phương pháp định danh giao dịch

### 4.1 Bảng so sánh

| Phương pháp | Field | Độ tin cậy | Use case |
|-------------|-------|------------|----------|
| **Virtual Account (VA)** | `subAccount` | Cao nhất | Mỗi order có VA riêng |
| **Payment Code** | `code` | Cao | SEPay auto-extract từ nội dung |
| **Content Parsing** | `content` | Trung bình | Fallback nếu `code` null |
| **Transaction ID** | `id` | - | Chỉ dùng cho idempotency |

### 4.2 Virtual Account (VA) - Khuyến nghị

Virtual Account là tài khoản ảo unique cho từng giao dịch/khách hàng:

```
Tài khoản chính: 1234567890
Virtual Account: VA001, VA002, VA003...
```

**Ưu điểm:**
- Match 100% chính xác
- Không phụ thuộc vào nội dung chuyển khoản
- SEPay hỗ trợ webhook filter theo VA

**Cách sử dụng:**
1. Tạo VA cho mỗi order/khách hàng
2. Đưa VA vào QR code
3. Webhook trả về `subAccount` = VA tương ứng

### 4.3 Payment Code - Phổ biến

Dựa vào prefix cấu hình trên SEPay:

```typescript
// Khi tạo QR
const orderCode = 'MKT20240101001';  // Có prefix MKT
const description = orderCode;

// Webhook trả về
payload.code = 'MKT20240101001';  // SEPay auto-extract
```

### 4.4 Content Parsing - Fallback

Khi `code` là null, parse từ `content`:

```typescript
// Webhook payload
{
  "code": null,
  "content": "chuyen tien DH12345 mua hang"
}

// Parse từ content
const orderCode = extractOrderCode(payload.content);  // "DH12345"
```

## 5. Best Practices

### 5.1 Idempotency

Luôn check `id` để tránh xử lý trùng:

```typescript
const existingPayment = await findBySepayTransactionId(payload.id);
if (existingPayment) {
  return { success: true, message: 'Already processed' };
}
```

### 5.2 Response format

SEPay yêu cầu response:
- HTTP Status: 200 hoặc 201
- Body: `{ "success": true, ... }`

Nếu không đúng format, SEPay sẽ retry theo Fibonacci sequence.

### 5.3 Security

1. **Whitelist IP**: Chỉ accept webhook từ IP của SEPay
2. **Authentication**: Sử dụng OAuth 2.0 hoặc API Key
3. **Validate signature**: Nếu SEPay cung cấp

### 5.4 Retry handling

SEPay retry webhook khi:
- Network timeout
- Response không đúng format
- HTTP status không phải 2xx

**Lưu ý:** Implement idempotency để handle retry an toàn.

## 6. Implementation trong CRM

### 6.1 Tạo QR Code

```typescript
// SepayQrGenerator.buildDescription()
private buildDescription(
  virtualAccount?: string,
  orderCode?: string,
): string {
  if (virtualAccount) {
    return `${virtualAccount} ${orderCode ?? ''}`.trim();
  }
  return orderCode ?? '';
}
```

### 6.2 Xử lý Webhook

```typescript
// MktPaymentWebhookService.processWebhookPayment()

// Step 1: Idempotency check
const existing = await findBySepayTransactionId(payload.id);
if (existing) return { success: true, status: 'ALREADY_PROCESSED' };

// Step 2: Get order code
let orderCode = payload.code;  // Primary: SEPay auto-extract

// Step 3: Fallback to content parsing
if (!orderCode && enableContentParsing) {
  orderCode = orderCodeExtractor.extract(payload.content);
}

// Step 4: Find and update order
const order = await findByOrderCode(orderCode);
```

### 6.3 Matching priority

```typescript
async matchTransaction(payload: SepayWebhookPayload) {
  // Priority 1: Virtual Account
  if (payload.subAccount) {
    const order = await findByVirtualAccount(payload.subAccount);
    if (order) return order;
  }

  // Priority 2: Payment Code (SEPay auto-extract)
  if (payload.code) {
    const order = await findByOrderCode(payload.code);
    if (order) return order;
  }

  // Priority 3: Parse from content
  const extractedCode = orderCodeExtractor.extract(payload.content);
  if (extractedCode) {
    return findByOrderCode(extractedCode);
  }

  return null;
}
```

## 7. Troubleshooting

### 7.1 `code` luôn null

**Nguyên nhân:**
- Chưa cấu hình "Cấu trúc mã thanh toán" trên SEPay
- Nội dung chuyển khoản không có prefix đúng

**Giải pháp:**
1. Vào SEPay Dashboard → Company Configuration
2. Thêm prefix phù hợp (ví dụ: `MKT`)
3. Đảm bảo orderCode trong QR có prefix

### 7.2 Webhook không được gửi

**Nguyên nhân:**
- Bật option "Bỏ qua nếu không có code" nhưng nội dung không có code
- URL webhook không accessible từ internet
- SSL certificate không hợp lệ

### 7.3 Duplicate transactions

**Nguyên nhân:**
- Không implement idempotency check
- SEPay retry do response không đúng format

**Giải pháp:**
- Luôn check `payload.id` trước khi xử lý
- Response đúng format `{ "success": true }`

## 8. References

- [Hướng dẫn tích hợp WebHooks | SEPay](https://docs.sepay.vn/tich-hop-webhooks.html)
- [Webhooks Programming | SEPay Dev](https://developer.sepay.vn/en/sepay-webhooks/lap-trinh-webhook)
- [Webhooks API (OAuth2) | SEPay Dev](https://developer.sepay.vn/en/sepay-oauth2/api-webhook)
- [SEPay Blog - Multiple Payment Codes](https://sepay.vn/blog/tinh-nang-moi-ho-tro-nhieu-ma-thanh-toan-webhook-theo-va-va-cai-thien-thong-ke-dong-tien-theo-tai-khoan-phu/)

---

*Last updated: 2026-01-31*
