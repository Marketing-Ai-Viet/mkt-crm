# Hướng Dẫn Tích Hợp SePay API

> **Tài liệu kỹ thuật cho hệ thống CRM**  
> Phiên bản: 1.0 | Cập nhật: Tháng 12/2025

---

## Mục Lục

1. [Tổng Quan SePay API](#1-tổng-quan-sepay-api)
2. [Thiết Lập Tài Khoản & API Token](#2-thiết-lập-tài-khoản--api-token)
3. [Tích Hợp Webhook](#3-tích-hợp-webhook)
4. [API Endpoints](#4-api-endpoints)
5. [Cấu Trúc Dữ Liệu](#5-cấu-trúc-dữ-liệu)
6. [Xử Lý Lỗi & Best Practices](#6-xử-lý-lỗi--best-practices)
7. [Checklist Triển Khai](#7-checklist-triển-khai)

---

## 1. Tổng Quan SePay API

### 1.1. SePay là gì?

SePay là dịch vụ cổng thanh toán (Payment Gateway) giúp tự động hóa việc nhận và xử lý giao dịch chuyển khoản ngân hàng. Khi có giao dịch phát sinh, SePay sẽ gửi thông báo real-time đến hệ thống của bạn thông qua Webhook, giúp CRM tự động cập nhật trạng thái thanh toán.

**Đặc điểm chính:**
- Xử lý hàng chục nghìn giao dịch mỗi ngày
- Độ trễ chỉ 5-10 giây so với internet banking
- Hỗ trợ đa ngân hàng: Vietcombank, BIDV, VietinBank, HDBank...

### 1.2. Hai phương thức tích hợp

| Phương thức | Mô tả | Use case |
|-------------|-------|----------|
| **Webhook (Push)** | SePay chủ động gửi thông tin giao dịch đến endpoint của bạn ngay khi có biến động số dư | Cập nhật thanh toán real-time |
| **REST API (Pull)** | Bạn chủ động gọi API để truy vấn danh sách giao dịch, thông tin tài khoản ngân hàng | Đối soát, báo cáo |

### 1.3. Rate Limits

- **Giới hạn:** 2 requests/giây
- **Vượt quá:** HTTP 429 Too Many Requests
- **Header retry:** `x-sepay-userapi-retry-after` (số giây cần chờ)

```
x-sepay-userapi-retry-after: 1
```

---

## 2. Thiết Lập Tài Khoản & API Token

### 2.1. Đăng ký tài khoản SePay

1. Truy cập [https://my.sepay.vn/register](https://my.sepay.vn/register) để đăng ký tài khoản
2. Thêm tài khoản ngân hàng cần theo dõi
3. Xác thực và kích hoạt tài khoản

> 💡 **Môi trường Sandbox:** Đăng ký tại [my.dev.sepay.vn](https://my.dev.sepay.vn/register) để test với giao dịch giả lập. Liên hệ SePay để được kích hoạt.

### 2.2. Tạo API Token

1. Đăng nhập vào dashboard SePay
2. Truy cập menu **Cài đặt → API Token → Thêm Token**
3. Đặt tên và tạo token
4. **Lưu ý:** Token chỉ hiển thị 1 lần, hãy lưu trữ an toàn

### 2.3. Sử dụng Token trong Request

```http
GET /userapi/transactions/list HTTP/1.1
Host: my.sepay.vn
Authorization: Bearer {YOUR_API_TOKEN}
```

---

## 3. Tích Hợp Webhook

### 3.1. Cấu hình Webhook trên SePay

1. Truy cập menu **WebHooks → + Thêm webhooks**
2. Cấu hình các thông số:

| Thông số | Mô tả | Ví dụ |
|----------|-------|-------|
| **Sự kiện** | Loại giao dịch cần theo dõi | Có tiền vào / Có tiền ra / Cả hai |
| **Tài khoản ngân hàng** | Chọn tài khoản cần theo dõi | Vietcombank - 0071000888888 |
| **Webhook URL** | Endpoint của CRM | `https://crm.example.com/api/webhook/sepay` |
| **Kiểu chứng thực** | Phương thức xác thực | OAuth 2.0 / API Key / Không chứng thực |
| **Bỏ qua nếu không có code** | Bỏ qua giao dịch không có mã thanh toán | Có / Không |

3. Nhấn **Thêm** để hoàn tất

### 3.2. Cấu trúc dữ liệu Webhook

SePay gửi **POST request** với JSON body:

```json
{
    "id": 92704,
    "gateway": "Vietcombank",
    "transactionDate": "2023-03-25 14:02:37",
    "accountNumber": "0123499999",
    "code": "DH123456",
    "content": "NGUYEN VAN A chuyen tien DH123456",
    "transferType": "in",
    "transferAmount": 2277000,
    "accumulated": 19077000,
    "subAccount": "VCB0011ABC004",
    "referenceCode": "MBVCB.3278907687",
    "description": "Toàn bộ nội dung tin nhắn SMS"
}
```

**Chi tiết các trường:**

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | Integer | ID giao dịch trên SePay **(unique - dùng để chống trùng)** |
| `gateway` | String | Tên ngân hàng (Vietcombank, BIDV, VietinBank...) |
| `transactionDate` | DateTime | Thời gian giao dịch (YYYY-MM-DD HH:mm:ss) |
| `accountNumber` | String | Số tài khoản ngân hàng |
| `transferAmount` | Integer | Số tiền giao dịch (VND) |
| `transferType` | String | Loại giao dịch: `in` (tiền vào) / `out` (tiền ra) |
| `content` | String | Nội dung chuyển khoản |
| `code` | String\|null | Mã thanh toán được SePay nhận diện |
| `referenceCode` | String | Mã tham chiếu từ ngân hàng |
| `accumulated` | Integer | Số dư tài khoản sau giao dịch |
| `subAccount` | String\|null | Tài khoản phụ / Tài khoản định danh (VA) |

### 3.3. Response yêu cầu

CRM cần trả về response để SePay nhận diện webhook **thành công**:

| Kiểu chứng thực | HTTP Status | Body |
|-----------------|-------------|------|
| OAuth 2.0 | 201 | `{"success": true}` |
| API Key | 200 hoặc 201 | `{"success": true}` |
| Không chứng thực | 200 hoặc 201 | `{"success": true}` |

**Ví dụ response thành công:**

```json
{
    "success": true,
    "message": "Transaction processed"
}
```

### 3.4. Header chứng thực

Với chứng thực **API Key**, SePay gửi header:

```http
Authorization: Apikey YOUR_API_KEY_HERE
```

### 3.5. Cơ chế Retry

| Thông số | Giá trị |
|----------|---------|
| Số lần retry tối đa | 7 lần |
| Thời gian giữa các lần | Theo dãy Fibonacci (phút) |
| Thời gian tối đa | 5 giờ từ lần gọi đầu tiên |
| Connection timeout | 5 giây |
| Response timeout | 8 giây |

> ⚠️ **Lưu ý:** SePay chỉ retry khi **kết nối mạng thất bại** hoặc khi bạn cấu hình điều kiện retry (VD: HTTP status không phải 2xx).

---

## 4. API Endpoints

### 4.1. Base URL

```
https://my.sepay.vn/userapi
```

### 4.2. API Giao Dịch

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/transactions/list` | Lấy danh sách giao dịch |
| `GET` | `/transactions/details/{id}` | Chi tiết một giao dịch |
| `GET` | `/transactions/count` | Đếm số lượng giao dịch |

#### Query Parameters cho `/transactions/list`

| Parameter | Kiểu | Mô tả |
|-----------|------|-------|
| `account_number` | String | Lọc theo số tài khoản ngân hàng |
| `limit` | Integer | Giới hạn số lượng kết quả (mặc định: 5000) |
| `since_id` | Integer | Lấy giao dịch từ ID này trở về sau |
| `reference_number` | String | Lọc theo mã tham chiếu ngân hàng |
| `amount_in` | Integer | Lọc theo số tiền vào (exact match) |
| `amount_out` | Integer | Lọc theo số tiền ra (exact match) |

#### Ví dụ Request

```bash
# Lấy 20 giao dịch gần đây của tài khoản
curl -X GET "https://my.sepay.vn/userapi/transactions/list?account_number=0071000888888&limit=20" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Lấy giao dịch từ ID 49050 trở về sau
curl -X GET "https://my.sepay.vn/userapi/transactions/list?since_id=49050" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Lọc theo mã tham chiếu
curl -X GET "https://my.sepay.vn/userapi/transactions/list?reference_number=171158.050523.060001" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

#### Ví dụ Response

```json
{
    "status": 200,
    "error": null,
    "messages": {
        "success": true
    },
    "transactions": [
        {
            "id": "49682",
            "bank_brand_name": "Vietcombank",
            "account_number": "0071000888888",
            "transaction_date": "2023-05-05 19:59:48",
            "amount_out": "0.00",
            "amount_in": "18067000.00",
            "accumulated": "1200541768.00",
            "transaction_content": "DUONG THUY ANH chuyen tien...",
            "reference_number": "677760.050523.080001",
            "code": null,
            "sub_account": "VCB0011ABC004",
            "bank_account_id": "19"
        }
    ]
}
```

### 4.3. API Tài Khoản Ngân Hàng

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/bankaccounts/list` | Danh sách tài khoản ngân hàng |
| `GET` | `/bankaccounts/details/{id}` | Chi tiết một tài khoản |
| `GET` | `/bankaccounts/count` | Đếm số lượng tài khoản |

#### Ví dụ Response

```json
{
    "status": 200,
    "error": null,
    "messages": {
        "success": true
    },
    "bankaccount": {
        "id": "18",
        "account_holder_name": "NGUYEN VAN A",
        "account_number": "0071000899999",
        "accumulated": "2625076186.00",
        "last_transaction": "2023-08-09 07:59:48",
        "label": "",
        "active": "1",
        "created_at": "2023-02-12 20:05:47",
        "bank_short_name": "Vietcombank",
        "bank_full_name": "Ngân hàng TMCP Ngoại Thương Việt Nam",
        "bank_bin": "970436",
        "bank_code": "VCB"
    }
}
```

---

## 5. Cấu Trúc Dữ Liệu

### 5.1. Transaction Object

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | Integer | ID giao dịch (unique) |
| `bank_brand_name` | String | Tên ngân hàng |
| `account_number` | String | Số tài khoản ngân hàng |
| `transaction_date` | DateTime | Thời gian giao dịch |
| `amount_in` | Decimal | Số tiền vào (VND) |
| `amount_out` | Decimal | Số tiền ra (VND) |
| `accumulated` | Decimal | Số dư sau giao dịch |
| `transaction_content` | String | Nội dung chuyển khoản |
| `reference_number` | String | Mã tham chiếu từ ngân hàng |
| `code` | String\|null | Mã thanh toán được nhận diện |
| `sub_account` | String\|null | Tài khoản phụ / VA |
| `bank_account_id` | Integer | ID tài khoản trên SePay |

### 5.2. Bank Account Object

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | Integer | ID tài khoản trên SePay |
| `account_holder_name` | String | Tên chủ tài khoản |
| `account_number` | String | Số tài khoản ngân hàng |
| `accumulated` | Decimal | Số dư hiện tại (VND) |
| `last_transaction` | DateTime | Thời gian giao dịch gần nhất |
| `bank_short_name` | String | Tên ngắn ngân hàng (VCB, BIDV...) |
| `bank_full_name` | String | Tên đầy đủ ngân hàng |
| `bank_bin` | String | BIN code của ngân hàng |
| `bank_code` | String | Mã ngân hàng |
| `active` | Boolean | 1 = hoạt động, 0 = tạm khóa |

---

## 6. Xử Lý Lỗi & Best Practices

### 6.1. HTTP Status Codes

| Code | Ý nghĩa | Xử lý |
|------|---------|-------|
| `200` | Request thành công | Parse response JSON |
| `401` | Unauthorized | Kiểm tra lại API Token |
| `429` | Rate Limited | Đọc header `x-sepay-userapi-retry-after`, chờ và retry |
| `500` | Server Error | Retry với exponential backoff |

### 6.2. Chống trùng lặp giao dịch (QUAN TRỌNG)

Khi webhook được retry, CRM có thể nhận cùng một giao dịch nhiều lần. **Bắt buộc** kiểm tra trùng lặp trước khi xử lý:

**Cách 1: Sử dụng trường `id`**
```sql
-- Kiểm tra trước khi insert
SELECT COUNT(*) FROM transactions WHERE sepay_id = :webhook_id;
```

**Cách 2: Kết hợp nhiều trường**
```sql
-- Unique constraint
ALTER TABLE transactions 
ADD CONSTRAINT uq_transaction 
UNIQUE (reference_code, transfer_type, transfer_amount);
```

**Cách 3: Idempotency trong code**
```javascript
async function handleWebhook(data) {
    const existing = await Transaction.findOne({ sepayId: data.id });
    if (existing) {
        return { success: true, message: 'Already processed' };
    }
    // Process transaction...
}
```

### 6.3. Bảo mật Webhook

1. **Sử dụng HTTPS:** Webhook URL phải là `https://`

2. **Xác thực API Key:** Kiểm tra header Authorization
   ```javascript
   if (req.headers.authorization !== `Apikey ${process.env.SEPAY_API_KEY}`) {
       return res.status(401).json({ success: false });
   }
   ```

3. **Whitelist IP (tùy chọn):** Liên hệ SePay để lấy danh sách IP gửi webhook

4. **Validate dữ liệu:** Luôn validate và sanitize input trước khi lưu vào database
   ```javascript
   const { id, transferAmount, transferType } = data;
   if (!id || !transferAmount || !['in', 'out'].includes(transferType)) {
       return res.status(400).json({ success: false });
   }
   ```

### 6.4. Logging & Monitoring

- Log toàn bộ webhook payload để debug
- Monitor response time (phải < 8 giây)
- Alert khi có lỗi liên tục
- Kiểm tra định kỳ Nhật ký webhooks trên dashboard SePay

---

## 7. Checklist Triển Khai

### 7.1. Giai đoạn Development

- [ ] Đăng ký tài khoản sandbox tại [my.dev.sepay.vn](https://my.dev.sepay.vn)
- [ ] Liên hệ SePay để kích hoạt tài khoản sandbox
- [ ] Tạo API Token cho môi trường test
- [ ] Implement webhook endpoint với đầy đủ validation
- [ ] Implement logic chống trùng lặp giao dịch
- [ ] Test với tính năng **Giả lập giao dịch**
- [ ] Implement error handling và logging
- [ ] Kiểm tra response time < 8 giây

### 7.2. Giai đoạn Production

- [ ] Đăng ký tài khoản production tại [my.sepay.vn](https://my.sepay.vn)
- [ ] Liên kết tài khoản ngân hàng thực
- [ ] Tạo API Token production (bảo mật cao)
- [ ] Cấu hình webhook với HTTPS endpoint
- [ ] Chọn kiểu chứng thực (API Key recommended)
- [ ] Thiết lập monitoring và alerting
- [ ] Test với giao dịch thực (số tiền nhỏ)
- [ ] Backup API Token an toàn (environment variables)
- [ ] Cấu hình retry conditions nếu cần

### 7.3. Cấu hình CRM

- [ ] Tạo bảng lưu trữ giao dịch SePay
- [ ] Map `code` với mã đơn hàng/khách hàng trong CRM
- [ ] Logic tự động cập nhật trạng thái thanh toán
- [ ] Gửi notification khi có thanh toán thành công
- [ ] Báo cáo đối soát giao dịch

---

## Tài Liệu Tham Khảo

| Tài liệu | URL |
|----------|-----|
| Tài liệu chính thức | [https://docs.sepay.vn](https://docs.sepay.vn) |
| Tích hợp Webhook | [https://docs.sepay.vn/tich-hop-webhooks.html](https://docs.sepay.vn/tich-hop-webhooks.html) |
| API Giao dịch | [https://docs.sepay.vn/api-giao-dich.html](https://docs.sepay.vn/api-giao-dich.html) |
| Giả lập giao dịch | [https://docs.sepay.vn/gia-lap-giao-dich.html](https://docs.sepay.vn/gia-lap-giao-dich.html) |
| Hỗ trợ kỹ thuật | [https://sepay.vn/lien-he.html](https://sepay.vn/lien-he.html) |
| Hotline | 028 7305 9589 |

---

*— Hết tài liệu —*
