# Tài Liệu Thiết Kế Tích Hợp Thanh Toán SePay

## Thông Tin Tài Liệu

| Thuộc tính | Giá trị |
|------------|---------|
| Phiên bản | 1.0.0 |
| Ngày tạo | 21/12/2025 |
| Hệ thống | MKT CRM System |
| Tác giả | Development Team |

---

## 1. Tổng Quan

### 1.1. Mục Đích

Tài liệu này mô tả chi tiết thiết kế tích hợp cổng thanh toán SePay vào hệ thống CRM, bao gồm các luồng thanh toán, xử lý webhook, quản lý giao dịch và các biện pháp bảo mật.

### 1.2. Phạm Vi

- Tích hợp thanh toán QR VietQR (chuyển khoản ngân hàng)
- Nhận và xử lý webhook từ SePay
- Quản lý đơn hàng và trạng thái thanh toán
- Đối soát giao dịch tự động
- Hỗ trợ Virtual Account (VA) theo đơn hàng

### 1.3. Công Nghệ Sử Dụng

| Thành phần | Công nghệ |
|------------|-----------|
| Backend | NestJS (TypeScript) |
| Frontend | Next.js |
| Database | PostgreSQL + TypeORM |
| Cache | Redis |
| Queue | BullMQ |
| Secret Management | HashiCorp Vault |

---

## 2. Kiến Trúc Hệ Thống

### 2.1. Sơ Đồ Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KHÁCH HÀNG                                      │
│                    (Quét QR / Chuyển khoản thủ công)                        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NGÂN HÀNG (VCB, MB, VPBank...)                    │
│                         Xử lý giao dịch chuyển khoản                        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SEPAY GATEWAY                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Banking API     │  │ Transaction     │  │ Webhook         │              │
│  │ Integration     │  │ Processing      │  │ Dispatcher      │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ Webhook (POST)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MKT CRM SYSTEM                                     │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   API        │    │   Payment    │    │   Order      │                   │
│  │   Gateway    │───▶│   Module     │───▶│   Module     │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                   │                   │                            │
│         ▼                   ▼                   ▼                            │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                      PostgreSQL Database                      │           │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │           │
│  │  │ payments    │  │ orders      │  │ transactions│           │           │
│  │  └─────────────┘  └─────────────┘  └─────────────┘           │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Redis      │    │   BullMQ     │    │   Vault      │                   │
│  │   Cache      │    │   Queue      │    │   Secrets    │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Luồng Thanh Toán Chi Tiết

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │   Backend    │     │    SePay     │     │   Ngân Hàng  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ 1. Tạo đơn hàng    │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │                    │                    │
       │ 2. Trả về thông tin│                    │                    │
       │   thanh toán + QR  │                    │                    │
       │◀───────────────────│                    │                    │
       │                    │                    │                    │
       │ 3. Hiển thị QR     │                    │                    │
       │   cho khách hàng   │                    │                    │
       │                    │                    │                    │
       │                    │                    │  4. Khách quét QR  │
       │                    │                    │   và chuyển khoản  │
       │                    │                    │◀───────────────────│
       │                    │                    │                    │
       │                    │                    │  5. Xác nhận GD    │
       │                    │                    │───────────────────▶│
       │                    │                    │                    │
       │                    │  6. Webhook        │                    │
       │                    │   thông báo GD     │                    │
       │                    │◀───────────────────│                    │
       │                    │                    │                    │
       │                    │ 7. Xác thực &      │                    │
       │                    │    xử lý thanh toán│                    │
       │                    │                    │                    │
       │ 8. Polling status  │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │                    │                    │
       │ 9. Trả về trạng    │                    │                    │
       │   thái "Paid"      │                    │                    │
       │◀───────────────────│                    │                    │
       │                    │                    │                    │
       │ 10. Hiển thị       │                    │                    │
       │    thành công      │                    │                    │
       ▼                    ▼                    ▼                    ▼
```

---

## 3. Thiết Kế Database

### 3.1. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐       ┌───────────────────────┐
│       customers       │       │        orders         │
├───────────────────────┤       ├───────────────────────┤
│ id (PK)               │       │ id (PK)               │
│ email                 │◀──────│ customer_id (FK)      │
│ name                  │       │ order_code            │
│ phone                 │       │ total_amount          │
│ created_at            │       │ payment_status        │
│ updated_at            │       │ order_status          │
└───────────────────────┘       │ expires_at            │
                                │ created_at            │
                                │ updated_at            │
                                └───────────┬───────────┘
                                            │
                                            │ 1:N
                                            ▼
                                ┌───────────────────────┐
                                │       payments        │
                                ├───────────────────────┤
                                │ id (PK)               │
                                │ order_id (FK)         │
                                │ sepay_transaction_id  │
                                │ amount                │
                                │ gateway               │
                                │ account_number        │
                                │ transaction_content   │
                                │ reference_code        │
                                │ transaction_date      │
                                │ status                │
                                │ raw_webhook_data      │
                                │ created_at            │
                                │ updated_at            │
                                └───────────────────────┘

┌───────────────────────┐       ┌───────────────────────┐
│   payment_configs     │       │   webhook_logs        │
├───────────────────────┤       ├───────────────────────┤
│ id (PK)               │       │ id (PK)               │
│ bank_name             │       │ sepay_transaction_id  │
│ account_number        │       │ request_body          │
│ account_holder        │       │ response_status       │
│ bank_code             │       │ response_body         │
│ prefix_code           │       │ processing_time_ms    │
│ is_active             │       │ ip_address            │
│ created_at            │       │ created_at            │
│ updated_at            │       └───────────────────────┘
└───────────────────────┘
```

### 3.2. Chi Tiết Các Bảng

#### 3.2.1. Bảng `orders`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | ID đơn hàng |
| customer_id | UUID | FOREIGN KEY | ID khách hàng |
| order_code | VARCHAR(50) | UNIQUE, NOT NULL | Mã đơn hàng (VD: ORD20251221001) |
| total_amount | DECIMAL(20,2) | NOT NULL | Tổng tiền đơn hàng |
| payment_status | ENUM | NOT NULL, DEFAULT 'PENDING' | Trạng thái thanh toán |
| order_status | ENUM | NOT NULL, DEFAULT 'CREATED' | Trạng thái đơn hàng |
| expires_at | TIMESTAMP | NULL | Thời gian hết hạn thanh toán |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Ngày cập nhật |

**Enum payment_status:**
- `PENDING` - Chờ thanh toán
- `PAID` - Đã thanh toán
- `PARTIAL` - Thanh toán một phần
- `REFUNDED` - Đã hoàn tiền
- `CANCELLED` - Đã hủy

#### 3.2.2. Bảng `payments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | ID giao dịch nội bộ |
| order_id | UUID | FOREIGN KEY | ID đơn hàng |
| sepay_transaction_id | BIGINT | UNIQUE | ID giao dịch từ SePay |
| amount | DECIMAL(20,2) | NOT NULL | Số tiền giao dịch |
| gateway | VARCHAR(50) | NOT NULL | Tên ngân hàng (VD: MBBank) |
| account_number | VARCHAR(50) | NOT NULL | Số tài khoản nhận |
| transaction_content | TEXT | NULL | Nội dung chuyển khoản |
| reference_code | VARCHAR(100) | NULL | Mã tham chiếu ngân hàng |
| transaction_date | TIMESTAMP | NOT NULL | Thời gian giao dịch |
| status | ENUM | NOT NULL | Trạng thái xử lý |
| raw_webhook_data | JSONB | NOT NULL | Dữ liệu webhook gốc |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Ngày cập nhật |

**Enum status:**
- `RECEIVED` - Đã nhận webhook
- `PROCESSING` - Đang xử lý
- `MATCHED` - Đã khớp đơn hàng
- `UNMATCHED` - Không khớp đơn hàng
- `FAILED` - Xử lý thất bại

#### 3.2.3. Bảng `payment_configs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | ID cấu hình |
| bank_name | VARCHAR(100) | NOT NULL | Tên ngân hàng |
| account_number | VARCHAR(50) | NOT NULL | Số tài khoản |
| account_holder | VARCHAR(200) | NOT NULL | Tên chủ tài khoản |
| bank_code | VARCHAR(20) | NOT NULL | Mã ngân hàng (VD: MB, VCB) |
| prefix_code | VARCHAR(20) | NOT NULL | Tiền tố mã đơn (VD: ORD) |
| is_active | BOOLEAN | DEFAULT true | Trạng thái hoạt động |

#### 3.2.4. Bảng `webhook_logs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | ID log |
| sepay_transaction_id | BIGINT | INDEX | ID giao dịch SePay |
| request_body | JSONB | NOT NULL | Body request |
| response_status | INTEGER | NOT NULL | HTTP status code |
| response_body | JSONB | NULL | Body response |
| processing_time_ms | INTEGER | NULL | Thời gian xử lý (ms) |
| ip_address | VARCHAR(45) | NULL | IP gửi request |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |

---

## 4. API Specification

### 4.1. Internal APIs (Backend)

#### 4.1.1. Tạo Đơn Hàng & Lấy Thông Tin Thanh Toán

**Endpoint:** `POST /api/v1/orders`

**Request Body:**
```json
{
  "customer_id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 1,
      "price": 100000
    }
  ],
  "total_amount": 100000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "order_code": "ORD20251221001",
      "total_amount": 100000,
      "payment_status": "PENDING",
      "expires_at": "2025-12-21T15:30:00Z"
    },
    "payment_info": {
      "bank_name": "MB Bank",
      "bank_code": "MB",
      "account_number": "0903252427",
      "account_holder": "CONG TY CP MKT",
      "amount": 100000,
      "transfer_content": "ORD20251221001",
      "qr_code_url": "https://qr.sepay.vn/img?bank=MB&acc=0903252427&amount=100000&des=ORD20251221001&template=compact"
    }
  }
}
```

#### 4.1.2. Kiểm Tra Trạng Thái Thanh Toán

**Endpoint:** `GET /api/v1/orders/:orderId/payment-status`

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "order_code": "ORD20251221001",
    "payment_status": "PAID",
    "paid_amount": 100000,
    "paid_at": "2025-12-21T14:35:22Z",
    "transaction_id": "92704"
  }
}
```

#### 4.1.3. Webhook Endpoint (Nhận từ SePay)

**Endpoint:** `POST /api/v1/webhooks/sepay`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {API_KEY}
X-Sepay-Signature: {HMAC_SIGNATURE}
```

**Request Body (từ SePay):**
```json
{
  "id": 92704,
  "gateway": "MBBank",
  "transactionDate": "2025-12-21 14:02:37",
  "accountNumber": "0903252427",
  "code": null,
  "content": "ORD20251221001 thanh toan don hang",
  "transferType": "in",
  "transferAmount": 100000,
  "accumulated": 19077000,
  "subAccount": null,
  "referenceCode": "MBVCB.3278907687",
  "description": "MBVCB.3278907687.ORD20251221001 thanh toan don hang.CT tu 0123456789 BUI VAN A toi 0903252427 CONG TY CP MKT"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "data": {
    "transaction_id": 92704,
    "matched_order": "ORD20251221001",
    "status": "MATCHED"
  }
}
```

### 4.2. SePay External APIs (Sử dụng khi cần)

#### 4.2.1. API Truy Vấn Giao Dịch

**Endpoint:** `GET https://my.sepay.vn/userapi/transactions/list`

**Headers:**
```
Authorization: Bearer {SEPAY_API_TOKEN}
```

**Query Parameters:**
- `account_number` - Số tài khoản
- `limit` - Số lượng kết quả (mặc định 20)
- `reference_number` - Mã tham chiếu

#### 4.2.2. API Tạo QR Code

**URL Format:**
```
https://qr.sepay.vn/img?bank={BANK_CODE}&acc={ACCOUNT_NUMBER}&amount={AMOUNT}&des={CONTENT}&template={TEMPLATE}
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| bank | Có | Mã ngân hàng (MB, VCB, VPB...) |
| acc | Có | Số tài khoản |
| amount | Không | Số tiền |
| des | Không | Nội dung chuyển khoản |
| template | Không | compact, qronly, hoặc để trống |

---

## 5. Webhook Integration

### 5.1. Cấu Hình Webhook trên SePay

```yaml
Webhook Configuration:
  name: "MKT CRM Payment Webhook"
  url: "https://api.mkt-crm.com/api/v1/webhooks/sepay"
  bank_account: "0903252427"
  event_type: "In_only"  # Chỉ nhận giao dịch tiền vào
  authentication:
    type: "Api_Key"
    api_key: "${SEPAY_WEBHOOK_API_KEY}"
  retry_conditions:
    non_2xx_status_code: true
  request_content_type: "Json"
```

### 5.2. Webhook Payload Structure

```typescript
interface SepayWebhookPayload {
  id: number;                    // ID giao dịch trên SePay
  gateway: string;               // Tên ngân hàng (VD: "MBBank")
  transactionDate: string;       // Thời gian GD "YYYY-MM-DD HH:mm:ss"
  accountNumber: string;         // Số tài khoản nhận
  code: string | null;           // Mã code thanh toán (nếu có)
  content: string;               // Nội dung chuyển khoản
  transferType: "in" | "out";    // Loại giao dịch
  transferAmount: number;        // Số tiền giao dịch
  accumulated: number;           // Số dư lũy kế
  subAccount: string | null;     // Tài khoản phụ (VA)
  referenceCode: string;         // Mã tham chiếu ngân hàng
  description: string;           // Nội dung đầy đủ từ ngân hàng
}
```

### 5.3. Xử Lý Webhook

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WEBHOOK PROCESSING FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Nhận Webhook    │
│  từ SePay        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Validate        │ NO  │  Return 401      │
│  API Key         │────▶│  Unauthorized    │
└────────┬─────────┘     └──────────────────┘
         │ YES
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Check Duplicate │ YES │  Return 200      │
│  (by sepay_id)   │────▶│  Already Processed│
└────────┬─────────┘     └──────────────────┘
         │ NO
         ▼
┌──────────────────┐
│  Log Webhook     │
│  to webhook_logs │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Parse Order Code│
│  from content    │
│  (Regex)         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Find Order      │ NO  │  Save as         │
│  by order_code   │────▶│  UNMATCHED       │
└────────┬─────────┘     └──────────────────┘
         │ YES
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Validate Amount │ NO  │  Save as         │
│  order.total ==  │────▶│  AMOUNT_MISMATCH │
│  webhook.amount  │     └──────────────────┘
└────────┬─────────┘
         │ YES
         ▼
┌──────────────────┐
│  Begin           │
│  Transaction     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Save Payment    │
│  Record          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Update Order    │
│  payment_status  │
│  = "PAID"        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Commit          │
│  Transaction     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Dispatch Events │
│  (Notification,  │
│   Email, etc.)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Return 200 OK   │
│  + JSON Response │
└──────────────────┘
```

### 5.4. Regex Pattern cho Order Code

```typescript
// Pattern mẫu: Tìm mã đơn hàng có prefix ORD
const ORDER_CODE_PATTERN = /ORD\d{11,14}/i;

// Ví dụ nội dung: "ORD20251221001 thanh toan don hang"
// Match: "ORD20251221001"

// Hoặc pattern linh hoạt hơn
const FLEXIBLE_PATTERN = /(ORD|DH|MKT)[\d]{6,14}/i;
```

---

## 6. Module Structure (NestJS)

### 6.1. Cấu Trúc Thư Mục

```
src/
├── modules/
│   └── payment/
│       ├── payment.module.ts
│       ├── controllers/
│       │   ├── payment.controller.ts
│       │   └── webhook.controller.ts
│       ├── services/
│       │   ├── payment.service.ts
│       │   ├── webhook.service.ts
│       │   ├── qrcode.service.ts
│       │   └── reconciliation.service.ts
│       ├── entities/
│       │   ├── payment.entity.ts
│       │   ├── payment-config.entity.ts
│       │   └── webhook-log.entity.ts
│       ├── dto/
│       │   ├── create-payment.dto.ts
│       │   ├── webhook-payload.dto.ts
│       │   └── payment-status.dto.ts
│       ├── interfaces/
│       │   └── sepay-webhook.interface.ts
│       ├── guards/
│       │   └── webhook-auth.guard.ts
│       ├── processors/
│       │   └── payment.processor.ts
│       ├── events/
│       │   ├── payment-received.event.ts
│       │   └── payment-matched.event.ts
│       └── constants/
│           └── payment.constants.ts
├── common/
│   ├── decorators/
│   │   └── sepay-webhook.decorator.ts
│   └── filters/
│       └── webhook-exception.filter.ts
└── config/
    └── payment.config.ts
```

### 6.2. Payment Module

```typescript
// payment.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentConfig,
      WebhookLog,
      Order,
    ]),
    BullModule.registerQueue({
      name: 'payment-processing',
    }),
    HttpModule,
    CacheModule.register(),
  ],
  controllers: [
    PaymentController,
    WebhookController,
  ],
  providers: [
    PaymentService,
    WebhookService,
    QRCodeService,
    ReconciliationService,
    PaymentProcessor,
    WebhookAuthGuard,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
```

---

## 7. Bảo Mật

### 7.1. Xác Thực Webhook

```typescript
// Sử dụng API Key Authentication
interface WebhookAuthConfig {
  type: 'Api_Key';
  apiKey: string;
  headerName: 'Authorization'; // Bearer {API_KEY}
}

// Hoặc OAuth2
interface WebhookOAuth2Config {
  type: 'OAuth2.0';
  clientId: string;
  clientSecret: string;
  accessTokenUrl: string;
}
```

### 7.2. Các Biện Pháp Bảo Mật

| Biện pháp | Mô tả |
|-----------|-------|
| API Key Validation | Xác thực API key trong header mỗi request |
| IP Whitelist | Chỉ chấp nhận webhook từ IP của SePay |
| Idempotency Check | Kiểm tra trùng lặp bằng `sepay_transaction_id` |
| Rate Limiting | Giới hạn số request/phút |
| Request Logging | Log toàn bộ request để audit |
| HTTPS Only | Chỉ chấp nhận kết nối HTTPS |
| Timeout Protection | Set timeout cho xử lý webhook |

### 7.3. Secret Management

```yaml
# Lưu trữ trong HashiCorp Vault
vault_path: "secret/mkt-crm/payment"
secrets:
  - SEPAY_API_TOKEN
  - SEPAY_WEBHOOK_API_KEY
  - BANK_ACCOUNT_NUMBER
  - ENCRYPTION_KEY
```

---

## 8. Queue & Background Jobs

### 8.1. Payment Processing Queue

```typescript
// Queue: payment-processing
interface PaymentJob {
  type: 'PROCESS_WEBHOOK' | 'RECONCILE' | 'NOTIFY';
  payload: {
    webhookData?: SepayWebhookPayload;
    orderId?: string;
    transactionId?: number;
  };
  attempts: number;
  backoff: {
    type: 'exponential';
    delay: 1000;
  };
}
```

### 8.2. Scheduled Jobs

| Job | Schedule | Mô tả |
|-----|----------|-------|
| Reconciliation | 0 0 * * * (hourly) | Đối soát giao dịch với SePay API |
| Expire Orders | */5 * * * * (5 min) | Hủy đơn hàng quá hạn thanh toán |
| Retry Failed | */10 * * * * (10 min) | Retry các webhook xử lý thất bại |
| Cleanup Logs | 0 2 * * * (daily 2am) | Dọn dẹp log cũ |

---

## 9. Monitoring & Logging

### 9.1. Metrics

```yaml
Prometheus Metrics:
  - payment_webhook_received_total
  - payment_webhook_processed_total
  - payment_webhook_failed_total
  - payment_order_matched_total
  - payment_order_unmatched_total
  - payment_processing_duration_seconds
  - payment_queue_length
```

### 9.2. Logging Format

```json
{
  "timestamp": "2025-12-21T14:35:22.123Z",
  "level": "info",
  "service": "payment-service",
  "traceId": "abc123",
  "event": "webhook_received",
  "data": {
    "sepay_id": 92704,
    "amount": 100000,
    "order_code": "ORD20251221001"
  }
}
```

### 9.3. Alert Rules

```yaml
Alerts:
  - name: HighWebhookFailureRate
    condition: rate(payment_webhook_failed_total[5m]) > 0.1
    severity: critical
    
  - name: WebhookProcessingDelay
    condition: payment_processing_duration_seconds > 5
    severity: warning
    
  - name: UnmatchedPaymentsHigh
    condition: increase(payment_order_unmatched_total[1h]) > 10
    severity: warning
```

---

## 10. Testing

### 10.1. Test Cases

| Test Case | Mô tả | Expected Result |
|-----------|-------|-----------------|
| TC001 | Webhook hợp lệ, khớp đơn hàng | Order status = PAID |
| TC002 | Webhook trùng lặp (duplicate) | Return 200, không xử lý lại |
| TC003 | Webhook không khớp đơn hàng | Save as UNMATCHED |
| TC004 | Webhook sai API key | Return 401 |
| TC005 | Webhook số tiền không khớp | Save as AMOUNT_MISMATCH |
| TC006 | Webhook timeout | Retry với backoff |
| TC007 | Đơn hàng đã thanh toán | Không xử lý lại |

### 10.2. Sandbox Testing

```bash
# Sử dụng SePay Sandbox
SEPAY_ENV=sandbox
SEPAY_MERCHANT_ID=SP-TEST-XXXXXXX
SEPAY_SECRET_KEY=spsk_test_xxxx

# Giả lập webhook
curl -X POST https://api.mkt-crm.com/api/v1/webhooks/sepay \
  -H "Authorization: Bearer ${WEBHOOK_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 99999,
    "gateway": "MBBank",
    "transactionDate": "2025-12-21 14:02:37",
    "accountNumber": "0903252427",
    "content": "ORD20251221001 test payment",
    "transferType": "in",
    "transferAmount": 100000,
    "accumulated": 100000,
    "referenceCode": "TEST.123456"
  }'
```

---

## 11. Deployment Checklist

### 11.1. Pre-deployment

- [ ] Cấu hình HashiCorp Vault với các secrets
- [ ] Setup database migrations
- [ ] Cấu hình webhook trên SePay Dashboard
- [ ] Test webhook với sandbox
- [ ] Setup monitoring và alerting
- [ ] Configure rate limiting
- [ ] Setup log aggregation

### 11.2. Post-deployment

- [ ] Verify webhook connectivity
- [ ] Test end-to-end payment flow
- [ ] Monitor error rates
- [ ] Verify log collection
- [ ] Test reconciliation job
- [ ] Document runbook cho incidents

---

## 12. Appendix

### 12.1. Danh Sách Mã Ngân Hàng

| Bank Code | Tên Ngân Hàng |
|-----------|---------------|
| MB | MBBank |
| VCB | Vietcombank |
| TCB | Techcombank |
| VPB | VPBank |
| ACB | ACB |
| BIDV | BIDV |
| VTB | VietinBank |
| TPB | TPBank |
| STB | Sacombank |

### 12.2. Error Codes

| Code | Message | Mô tả |
|------|---------|-------|
| PAY001 | Invalid API Key | API key không hợp lệ |
| PAY002 | Duplicate Transaction | Giao dịch trùng lặp |
| PAY003 | Order Not Found | Không tìm thấy đơn hàng |
| PAY004 | Amount Mismatch | Số tiền không khớp |
| PAY005 | Order Already Paid | Đơn hàng đã thanh toán |
| PAY006 | Order Expired | Đơn hàng hết hạn |
| PAY007 | Processing Error | Lỗi xử lý nội bộ |

### 12.3. Tài Liệu Tham Khảo

- SePay Developer Docs: https://developer.sepay.vn/vi
- SePay Webhook Guide: https://docs.sepay.vn/tich-hop-webhooks.html
- VietQR Specification: https://vietqr.net
- SePay API Reference: https://docs.sepay.vn/gioi-thieu-api.html

---

*Document Version: 1.0.0 | Last Updated: 21/12/2025*
