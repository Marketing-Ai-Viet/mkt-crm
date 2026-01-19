# Hướng dẫn Test Luồng Order

> **Phiên bản**: 1.1
> **Ngày tạo**: 2026-01-19
> **Cập nhật**: 2026-01-19 - Thêm dữ liệu thực từ database
> **Mục đích**: Test các API tạo order và chuyển đổi trạng thái

---

## 1. Thông tin kết nối

### 1.1. GraphQL Endpoint

```
URL: http://localhost:3000/graphql
Method: POST
Content-Type: application/json
```

### 1.2. Authorization Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4
```

### 1.3. Test Data từ Database (Dữ liệu thực)

> **Lưu ý**: Dữ liệu dưới đây được lấy trực tiếp từ database. Sử dụng các ID này để test.

#### Customers

| ID | Tên | Email | Tier | Type |
|----|-----|-------|------|------|
| `49868053-4758-457f-9332-6ebd48af7ca6` | Nguyễn Văn An | nguyen.van.an@techcorp.vn | DIAMOND | BUSINESS |
| `49868053-4758-457f-9332-6ebd48af7ca6` | Trần Thị Bình | tran.thi.binh@innovate.io | GOLD | BUSINESS |
| `9c500415-1e6a-4320-8770-a6a33d03f0a2` | Lê Minh Cường | le.minh.cuong@gmail.com | SILVER | INDIVIDUAL |
| `cbdb1f84-693c-4f66-8049-93169a0231c4` | Phạm Hoàng Dung | pham.hoang.dung@startup.vn | BRONZE | ORGANIZATION |

#### Orders đang PROCESSING (có thể test confirmOrderPayment)

| Order ID | Order Code | Tổng tiền | Customer |
|----------|------------|-----------|----------|
| `c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab` | MKT-PROC-2024-038 | 16,500,000 VND | Trần Thị Bình |
| `d2b3c4d5-e6f7-a8b9-c0d1-234567890abc` | MKT-PROC-2024-039 | 52,500,000 VND | Nguyễn Văn An |
| `e3c4d5e6-f7a8-b9c0-d1e2-34567890abcd` | MKT-PROC-2024-040 | 100,000,000 VND | Trần Thị Bình |

#### Orders đang LOCKED (có thể test unlockOrderAfterPayment)

| Order ID | Order Code | Tổng tiền | Customer | Lý do khóa |
|----------|------------|-----------|----------|------------|
| `f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde` | MKT-LOCK-2024-041 | 5,500,000 VND | Phạm Hoàng Dung | Payment overdue |
| `a5e6f7a8-b9c0-d1e2-f3a4-567890abcdef` | MKT-LOCK-2024-042 | 26,500,000 VND | Lê Minh Cường | Customer requested extension |

#### Sample Products (từ Order Items - Legacy)

| Product Name | Unit Price |
|--------------|------------|
| MKT Care - Phần mềm nuôi nick Facebook tự động | 4,000,000 - 7,000,000 VND |
| MKT Viral - Viral video đa nền tảng | 3,000,000 - 10,000,000 VND |
| MKT UID - Phân tích, tổng hợp data khách hàng | 2,000,000 VND |
| MKT Insta - Phần mềm quảng cáo Instagram | 5,000,000 - 10,000,000 VND |
| MKT Tube - Quản lý hệ thống kênh YouTube | 2,000,000 - 5,000,000 VND |

#### External Products từ MKT Server (Redis Cache)

> **Lưu ý**: Dữ liệu dưới đây được lấy từ Redis cache. Sử dụng cho `externalProducts` khi tạo order.

**Product 1: Enterprise Tự động hóa Marketing**
- Product ID: `0199e0fd-fe2b-714f-b502-11dff2d3b28e`
- Code: `PRODUCT_001_2026`

| Package ID | Package Name | Price | Billing |
|------------|--------------|-------|---------|
| `0199e6e1-7935-714e-b8fa-7a2f2e78c643` | Gói Cơ Bản - Tháng | 299,000 VND | monthly |
| `0199e6e1-7935-714e-b8fa-7c6cbc5a7f30` | Gói Chuyên Nghiệp - Năm | 2,990,000 VND | yearly |
| `0199e6e1-7935-714e-b8fa-8370ec4b8f16` | Gói Doanh Nghiệp - Vĩnh Viễn | 19,990,000 VND | lifetime |

**Product 2: Smart Phân tích & Báo cáo**
- Product ID: `0199e0fd-fe2e-718d-bafd-533d14117ca5`
- Code: `PRODUCT_003_2026`

| Package ID | Package Name | Price | Billing |
|------------|--------------|-------|---------|
| `0199e6e1-7935-714e-b8fa-a04c464b1cfc` | Gói Phân Tích Cơ Bản - Tháng | 149,000 VND | monthly |
| `0199e6e1-7935-714e-b8fa-a4b9618ac450` | Gói Phân Tích Nâng Cao - Năm | 1,490,000 VND | yearly |

---

## 2. Tổng quan Order States

### 2.1. Danh sách trạng thái

| State | Code | Mô tả |
|-------|------|-------|
| Draft | `DRAFT` | Đơn hàng đang soạn, chưa gửi |
| Pending Payment | `PENDING_PAYMENT` | Chờ thanh toán (legacy flow) |
| Confirmed | `CONFIRMED` | Đã xác nhận, sẵn sàng tạo license |
| Processing | `PROCESSING` | License đã tạo, chờ thanh toán (new flow) |
| Completed | `COMPLETED` | Hoàn thành |
| Locked | `LOCKED` | Bị khóa do quá hạn thanh toán |
| Trial | `TRIAL` | Đơn dùng thử |
| Trial Expired | `TRIAL_EXPIRED` | Hết hạn dùng thử |
| Canceled | `CANCELED` | Đã hủy |
| Overdue | `OVERDUE` | Quá hạn thanh toán (legacy) |
| Blocked | `BLOCKED` | Bị chặn |
| Refund | `REFUND` | Hoàn tiền toàn bộ |
| Refund Partial | `REFUND_PARTIAL` | Hoàn tiền một phần |

### 2.2. State Transition Diagram

```
                              ┌─────────────┐
                              │    DRAFT    │ (Initial)
                              └──────┬──────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
     ┌────────────────┐    ┌────────────────┐       ┌────────────┐
     │ PENDING_PAYMENT│    │   CONFIRMED    │       │   TRIAL    │
     │  (Legacy Flow) │    │  (New Flow)    │       │            │
     └───────┬────────┘    └───────┬────────┘       └─────┬──────┘
             │                     │                      │
             │                     ▼                      │
             │            ┌────────────────┐              │
             │            │  PROCESSING    │              │
             │            │ (License Ready)│              │
             │            └───────┬────────┘              │
             │                    │                       │
             │         ┌──────────┴──────────┐            │
             │         │                     │            │
             │         ▼                     ▼            │
             │  ┌────────────┐        ┌────────────┐      │
             │  │  COMPLETED │        │   LOCKED   │      │
             │  └────────────┘        └─────┬──────┘      │
             │         │                    │             │
             │         │              unlockOrderAfterPayment
             │         │                    │             │
             │         │                    ▼             │
             │         │            ┌────────────┐        │
             │         └───────────►│  COMPLETED │        │
             │                      └────────────┘        │
             │                                            │
             ▼                                            ▼
    ┌─────────────────┐                         ┌─────────────────┐
    │    CANCELED     │◄────────────────────────│  TRIAL_EXPIRED  │
    └─────────────────┘                         └─────────────────┘
```

---

## 3. New Payment Flow (Khuyến nghị)

### Flow: `DRAFT → CONFIRMED → PROCESSING → COMPLETED`

```
┌──────────────────────────────────────────────────────────────────┐
│                    NEW PAYMENT FLOW                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Tạo Order (isDraft: true)                               │
│  ────────────────────────────────                                │
│  Mutation: createOrderWithItems                                  │
│  Result: Order với status = DRAFT                                │
│                                                                  │
│                          │                                       │
│                          ▼                                       │
│                                                                  │
│  Step 2: Xác nhận Order + Tạo License                           │
│  ──────────────────────────────────────                          │
│  Mutation: confirmOrderWithLicense                               │
│  Result: Order status = PROCESSING                               │
│          License status = PENDING_PAYMENT                        │
│          Invoice được tạo                                        │
│          Payment deadline được set                               │
│                                                                  │
│                          │                                       │
│              ┌───────────┴───────────┐                           │
│              │                       │                           │
│              ▼                       ▼                           │
│                                                                  │
│  Step 3a: Thanh toán đúng hạn  │  Step 3b: Quá hạn thanh toán   │
│  ───────────────────────────── │  ────────────────────────────   │
│  Mutation: confirmOrderPayment │  Job: Payment Overdue Scan      │
│  Result: Order = COMPLETED     │  Result: Order = LOCKED         │
│          License = ACTIVE      │          License = LOCKED       │
│                                │                                 │
│                                │              │                  │
│                                │              ▼                  │
│                                │                                 │
│                                │  Step 4: Thanh toán muộn        │
│                                │  ─────────────────────          │
│                                │  Mutation: unlockOrderAfterPayment│
│                                │  Result: Order = COMPLETED      │
│                                │          License = ACTIVE       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Test Cases

### 4.1. Test Case 1: Tạo Order Draft

**Mục đích**: Tạo đơn hàng mới với trạng thái DRAFT

> **Lưu ý về ExternalMktProductInputDto:**
> - `productId`: Product ID từ MKT Server (UUIDv7) - **bắt buộc**
> - `packageId`: Package ID từ MKT Server - **tùy chọn**
> - `maxDevices`: Số thiết bị tối đa cho license (mặc định: 1)
> - `splitLicenses`: Tách thành nhiều license (mặc định: false)

**Request:**
```graphql
mutation CreateOrderDraft {
  createOrderWithItems(input: {
    customerId: "49868053-4758-457f-9332-6ebd48af7ca6"
    action: NEW_ORDER
    isDraft: true
    externalProducts: [
      {
        productId: "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
        packageId: "0199e6e1-7935-714e-b8fa-7a2f2e78c643"
        maxDevices: 1
      }
    ]
    note: "Test order - Draft"
  }) {
    success
    orderId
    orderCode
    totalAmount
    paidAmount
    remainingAmount
    paymentStatus
    error
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{
    "query": "mutation CreateOrderDraft { createOrderWithItems(input: { customerId: \"49868053-4758-457f-9332-6ebd48af7ca6\", action: NEW_ORDER, isDraft: true, externalProducts: [{ productId: \"0199e0fd-fe2b-714f-b502-11dff2d3b28e\", packageId: \"0199e6e1-7935-714e-b8fa-7a2f2e78c643\", maxDevices: 1 }], note: \"Test order - Draft\" }) { success orderId orderCode totalAmount paidAmount remainingAmount paymentStatus error } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "createOrderWithItems": {
      "success": true,
      "orderId": "uuid-order-id",
      "orderCode": "MKT-XXXX-XXXX-XXX",
      "totalAmount": 299000,
      "paidAmount": 0,
      "remainingAmount": 299000,
      "paymentStatus": "PENDING",
      "error": null
    }
  }
}
```

**Verification:**
- [ ] `success` = `true`
- [ ] `orderId` là UUID hợp lệ
- [ ] `orderCode` được sinh tự động
- [ ] `totalAmount` = 299000 (giá gói "Gói Cơ Bản - Tháng")

---

### 4.2. Test Case 2: Xác nhận Order và Tạo License (New Flow)

**Mục đích**: Chuyển DRAFT → PROCESSING, tạo license với status PENDING_PAYMENT

**Precondition**: Có order với status = DRAFT từ Test Case 1

**Request:**
```graphql
mutation ConfirmOrderWithLicense {
  confirmOrderWithLicense(input: {
    orderId: "{ORDER_ID_TỪ_STEP_1}"
    paymentDeadlineHours: 72
    note: "Confirm order and create license"
  }) {
    success
    orderId
    orderCode
    newStatus
    invoice {
      id
      invoiceCode
      totalAmount
    }
    licenses {
      id
      licenseKey
      status
      productName
    }
    paymentDeadline
    paymentDeadlineSource
    paymentDeadlineHours
    totalAmount
    message
    error
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{
    "query": "mutation ConfirmOrderWithLicense { confirmOrderWithLicense(input: { orderId: \"{ORDER_ID_TỪ_STEP_1}\", paymentDeadlineHours: 72, note: \"Confirm order and create license\" }) { success orderId orderCode newStatus invoice { id invoiceCode totalAmount } licenses { id licenseKey status productName } paymentDeadline paymentDeadlineSource paymentDeadlineHours totalAmount message error } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "confirmOrderWithLicense": {
      "success": true,
      "orderId": "uuid-order-id",
      "orderCode": "ORD-XXXXXX",
      "newStatus": "PROCESSING",
      "invoice": {
        "id": "uuid-invoice-id",
        "invoiceCode": "INV-XXXXXX",
        "totalAmount": 1000000
      },
      "licenses": [
        {
          "id": "uuid-license-id",
          "licenseKey": "LICENSE-KEY-XXXXX",
          "status": "PENDING_PAYMENT",
          "productName": "Product Name"
        }
      ],
      "paymentDeadline": "2026-01-22T10:00:00.000Z",
      "paymentDeadlineSource": "MANUAL",
      "paymentDeadlineHours": 72,
      "totalAmount": 1000000,
      "message": "Order confirmed successfully",
      "error": null
    }
  }
}
```

**Verification:**
- [ ] `success` = `true`
- [ ] `newStatus` = `"PROCESSING"`
- [ ] `licenses[].status` = `"PENDING_PAYMENT"`
- [ ] `invoice` được tạo với `invoiceCode`
- [ ] `paymentDeadline` = now + 72 hours
- [ ] `paymentDeadlineSource` = `"MANUAL"` (vì ta set `paymentDeadlineHours`)

---

### 4.3. Test Case 3: Xác nhận thanh toán (Happy Path)

**Mục đích**: Chuyển PROCESSING → COMPLETED, kích hoạt license

**Precondition**: Có order với status = PROCESSING từ Test Case 2

**Request:**
```graphql
mutation ConfirmOrderPayment {
  confirmOrderPayment(input: {
    orderId: "c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab"
    paymentMethod: "BANK_TRANSFER"
    amount: 16500000
    transactionId: "TXN-123456789"
    note: "Payment confirmed via bank transfer"
  }) {
    success
    orderId
    orderCode
    previousStatus
    newStatus
    paymentSummary {
      totalAmount
      paidAmount
      paymentMethod
      transactionId
      paidAt
    }
    licensesActivated
    message
    error
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{
    "query": "mutation ConfirmOrderPayment { confirmOrderPayment(input: { orderId: \"c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab\", paymentMethod: \"BANK_TRANSFER\", amount: 16500000, transactionId: \"TXN-123456789\", note: \"Payment confirmed via bank transfer\" }) { success orderId orderCode previousStatus newStatus paymentSummary { totalAmount paidAmount paymentMethod transactionId paidAt } licensesActivated message error } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "confirmOrderPayment": {
      "success": true,
      "orderId": "uuid-order-id",
      "orderCode": "ORD-XXXXXX",
      "previousStatus": "PROCESSING",
      "newStatus": "COMPLETED",
      "paymentSummary": {
        "totalAmount": 16500000,
        "paidAmount": 16500000,
        "paymentMethod": "BANK_TRANSFER",
        "transactionId": "TXN-123456789",
        "paidAt": "2026-01-19T12:00:00.000Z"
      },
      "licensesActivated": true,
      "message": "Payment confirmed and licenses activated",
      "error": null
    }
  }
}
```

**Verification:**
- [ ] `success` = `true`
- [ ] `previousStatus` = `"PROCESSING"`
- [ ] `newStatus` = `"COMPLETED"`
- [ ] `licensesActivated` = `true`
- [ ] License status chuyển từ `PENDING_PAYMENT` → `ACTIVE`

---

### 4.4. Test Case 4: Unlock Order sau khi thanh toán muộn

**Mục đích**: Chuyển LOCKED → COMPLETED sau khi thanh toán muộn

**Precondition**: Có order với status = LOCKED (do quá hạn thanh toán)

**Request:**
```graphql
mutation UnlockOrderAfterPayment {
  unlockOrderAfterPayment(input: {
    orderId: "f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde"
    amount: 5500000
    transactionId: "TXN-LATE-123456"
    note: "Late payment received"
  }) {
    success
    orderId
    orderCode
    previousStatus
    newStatus
    unlockedLicenses {
      id
      licenseKey
      status
      productName
    }
    unlockedAt
    message
    error
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{
    "query": "mutation UnlockOrderAfterPayment { unlockOrderAfterPayment(input: { orderId: \"f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde\", amount: 5500000, transactionId: \"TXN-LATE-123456\", note: \"Late payment received\" }) { success orderId orderCode previousStatus newStatus unlockedLicenses { id licenseKey status productName } unlockedAt message error } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "unlockOrderAfterPayment": {
      "success": true,
      "orderId": "uuid-order-id",
      "orderCode": "ORD-XXXXXX",
      "previousStatus": "LOCKED",
      "newStatus": "COMPLETED",
      "unlockedLicenses": [
        {
          "id": "uuid-license-id",
          "licenseKey": "LICENSE-KEY-XXXXX",
          "status": "ACTIVE",
          "productName": "Product Name"
        }
      ],
      "unlockedAt": "2026-01-20T15:00:00.000Z",
      "message": "Order unlocked and licenses activated",
      "error": null
    }
  }
}
```

**Verification:**
- [ ] `success` = `true`
- [ ] `previousStatus` = `"LOCKED"`
- [ ] `newStatus` = `"COMPLETED"`
- [ ] `unlockedLicenses[].status` = `"ACTIVE"`
- [ ] `unlockedAt` có giá trị

---

### 4.5. Test Case 5: Hủy Order

**Mục đích**: Chuyển order sang trạng thái CANCELED

**Request:**
```graphql
mutation CancelOrder {
  updateOrderStatus(input: {
    orderId: "{ORDER_ID_CẦN_HỦY}"
    action: CANCEL
    note: "Customer requested cancellation"
  }) {
    success
    order {
      id
      orderCode
      status
    }
    message
    errors
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{
    "query": "mutation CancelOrder { updateOrderStatus(input: { orderId: \"{ORDER_ID_CẦN_HỦY}\", action: CANCEL, note: \"Customer requested cancellation\" }) { success order { id orderCode status } message errors } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "updateOrderStatus": {
      "success": true,
      "order": {
        "id": "uuid-order-id",
        "orderCode": "ORD-XXXXXX",
        "status": "CANCELED"
      },
      "message": "Order canceled successfully",
      "errors": null
    }
  }
}
```

**Verification:**
- [ ] `success` = `true`
- [ ] `order.status` = `"CANCELED"`

---

## 5. Legacy Flow (Tham khảo)

### Flow: `DRAFT → PENDING_PAYMENT → CONFIRMED → COMPLETED`

### 5.1. Publish Draft Order

**Mục đích**: Chuyển DRAFT → PENDING_PAYMENT

**Request:**
```graphql
mutation PublishDraftOrder {
  publishDraftOrder(input: {
    orderId: "{DRAFT_ORDER_ID}"
    paymentMethods: [
      {
        method: "BANK_TRANSFER"
        bankName: "BIDV"
        accountNumber: "1234567890"
      }
    ]
    note: "Publishing draft order"
  }) {
    success
    order {
      id
      orderCode
      status
    }
    message
    errors
  }
}
```

**Expected:**
- `status` chuyển từ `DRAFT` → `PENDING_PAYMENT`
- Payment/QR code được tạo
- Overdue check job được schedule

### 5.2. Confirm Order (Legacy)

**Mục đích**: Xác nhận thanh toán, chuyển PENDING_PAYMENT → CONFIRMED

**Request:**
```graphql
mutation ConfirmOrder {
  confirmOrder(input: {
    orderId: "{PENDING_PAYMENT_ORDER_ID}"
    action: ACCOUNTING_CONFIRMED
    note: "Payment received and verified"
  }) {
    success
    order {
      id
      orderCode
      status
    }
    message
    errors
  }
}
```

**Expected:**
- `status` chuyển từ `PENDING_PAYMENT` → `CONFIRMED`
- License được tạo với status `ACTIVE`

---

## 6. Trial Flow

### Flow: `DRAFT → TRIAL → TRIAL_EXPIRED` hoặc `TRIAL → PENDING_PAYMENT → CONFIRMED`

### 6.1. Tạo Trial Order

> **Lưu ý**: TRIAL action đã được tách ra mutation riêng `mktCreateTrialLicense` trong MktLicenseResolver.

**Request (Legacy - sử dụng createOrderWithItems):**
```graphql
mutation CreateTrialOrder {
  createOrderWithItems(input: {
    customerId: "49868053-4758-457f-9332-6ebd48af7ca6"
    action: TRIAL_TO_PAID
    isDraft: false
    externalProducts: [
      {
        productId: "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
        packageId: "0199e6e1-7935-714e-b8fa-7a2f2e78c643"
        maxDevices: 1
      }
    ]
    note: "Trial order"
  }) {
    success
    orderId
    orderCode
    totalAmount
    error
  }
}
```

**Expected:**
- `status` = `TRIAL`
- Trial license được tạo ngay lập tức

### 6.2. Create Trial-to-Paid Order

> **Note**: TRIAL_TO_PAID tạo trial license với thời hạn ngắn (mặc định 1 ngày) để khách hàng trải nghiệm trước khi thanh toán. Sử dụng `trialDurationDays` để tùy chỉnh.

**Request:**
```graphql
mutation CreateTrialToPaidOrder {
  createOrderWithItems(input: {
    customerId: "49868053-4758-457f-9332-6ebd48af7ca6"
    action: TRIAL_TO_PAID
    trialDurationDays: 1  # Mặc định 1 ngày cho TRIAL_TO_PAID
    externalProducts: [
      {
        productId: "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
        packageId: "0199e6e1-7935-714e-b8fa-7a2f2e78c643"
        maxDevices: 1
      }
    ]
    note: "Trial license for customer experience"
  }) {
    success
    orderId
    orderCode
    totalAmount
    error
  }
}
```

---

## 7. Query để kiểm tra Order

### 7.1. Query Order by ID

```graphql
query GetOrder {
  mktOrder(id: "c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab") {
    id
    orderCode
    status
    totalAmount
    promotionDiscount
    couponCode
    createdAt
    updatedAt
    customer {
      id
      name
    }
    orderItems {
      id
      productName
      quantity
      unitPrice
      totalPrice
    }
    licenses {
      id
      licenseKey
      status
    }
    invoices {
      id
      invoiceCode
      totalAmount
    }
  }
}
```

### 7.2. Query Orders by Status

```graphql
query GetOrdersByStatus {
  mktOrders(filter: { status: { eq: "PROCESSING" } }) {
    edges {
      node {
        id
        orderCode
        status
        totalAmount
        createdAt
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

---

## 8. Error Cases

### 8.1. Invalid State Transition

**Scenario**: Cố gắng confirm payment cho order không ở trạng thái PROCESSING

**Expected Error:**
```json
{
  "errors": [
    {
      "message": "Invalid state transition: Cannot transition from DRAFT to COMPLETED",
      "extensions": {
        "code": "INVALID_STATE_TRANSITION"
      }
    }
  ]
}
```

### 8.2. Order Not Found

**Scenario**: Order ID không tồn tại

**Expected Error:**
```json
{
  "errors": [
    {
      "message": "Order not found",
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```

### 8.3. Unauthorized

**Scenario**: User không có quyền thực hiện action

**Expected Error:**
```json
{
  "errors": [
    {
      "message": "You do not have permission to perform this action",
      "extensions": {
        "code": "FORBIDDEN"
      }
    }
  ]
}
```

---

## 9. Checklist Test Flow hoàn chỉnh

### New Payment Flow

- [ ] **Step 1**: Tạo order draft thành công
  - [ ] Order được tạo với status = DRAFT
  - [ ] OrderCode được sinh tự động

- [ ] **Step 2**: Confirm order với license
  - [ ] Status chuyển: DRAFT → PROCESSING
  - [ ] License được tạo với status = PENDING_PAYMENT
  - [ ] Invoice được tạo
  - [ ] Payment deadline được set đúng

- [ ] **Step 3a**: Confirm payment (happy path)
  - [ ] Status chuyển: PROCESSING → COMPLETED
  - [ ] License status chuyển: PENDING_PAYMENT → ACTIVE
  - [ ] Payment summary được ghi nhận

- [ ] **Step 3b**: Order bị lock do quá hạn
  - [ ] Status chuyển: PROCESSING → LOCKED
  - [ ] License status chuyển: PENDING_PAYMENT → LOCKED

- [ ] **Step 4**: Unlock sau thanh toán muộn
  - [ ] Status chuyển: LOCKED → COMPLETED
  - [ ] License status chuyển: LOCKED → ACTIVE

### Cancel Flow

- [ ] Cancel từ DRAFT
- [ ] Cancel từ PROCESSING
- [ ] Cancel từ LOCKED
- [ ] Không thể cancel từ COMPLETED

---

## 10. Postman Collection

Bạn có thể import file JSON sau vào Postman để test:

```json
{
  "info": {
    "name": "MKT Order Flow Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "token",
      "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4"
    },
    {
      "key": "orderId",
      "value": ""
    },
    {
      "key": "customerId",
      "value": ""
    }
  ],
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{token}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "1. Create Order Draft",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "graphql",
          "graphql": {
            "query": "mutation CreateOrderDraft($input: CreateOrderWithItemsInputDto!) {\n  createOrderWithItems(input: $input) {\n    success\n    order {\n      id\n      orderCode\n      status\n      totalAmount\n    }\n    errors\n  }\n}",
            "variables": "{\n  \"input\": {\n    \"customerId\": \"{{customerId}}\",\n    \"action\": \"NEW_ORDER\",\n    \"isDraft\": true,\n    \"externalProducts\": [],\n    \"note\": \"Test order\"\n  }\n}"
          }
        },
        "url": "{{baseUrl}}/graphql"
      }
    },
    {
      "name": "2. Confirm Order With License",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "graphql",
          "graphql": {
            "query": "mutation ConfirmOrderWithLicense($input: ConfirmOrderWithLicenseInputDto!) {\n  confirmOrderWithLicense(input: $input) {\n    success\n    orderId\n    orderCode\n    newStatus\n    licenses {\n      id\n      status\n    }\n    paymentDeadline\n    message\n    error\n  }\n}",
            "variables": "{\n  \"input\": {\n    \"orderId\": \"{{orderId}}\",\n    \"paymentDeadlineHours\": 72\n  }\n}"
          }
        },
        "url": "{{baseUrl}}/graphql"
      }
    },
    {
      "name": "3. Confirm Payment",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "graphql",
          "graphql": {
            "query": "mutation ConfirmOrderPayment($input: ConfirmPaymentInputDto!) {\n  confirmOrderPayment(input: $input) {\n    success\n    orderId\n    previousStatus\n    newStatus\n    licensesActivated\n    message\n    error\n  }\n}",
            "variables": "{\n  \"input\": {\n    \"orderId\": \"{{orderId}}\",\n    \"paymentMethod\": \"BANK_TRANSFER\",\n    \"amount\": 1000000,\n    \"transactionId\": \"TXN-TEST-001\"\n  }\n}"
          }
        },
        "url": "{{baseUrl}}/graphql"
      }
    },
    {
      "name": "4. Cancel Order",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "graphql",
          "graphql": {
            "query": "mutation CancelOrder($input: UpdateOrderStatusInputDto!) {\n  updateOrderStatus(input: $input) {\n    success\n    order {\n      id\n      status\n    }\n    message\n  }\n}",
            "variables": "{\n  \"input\": {\n    \"orderId\": \"{{orderId}}\",\n    \"action\": \"CANCEL\",\n    \"note\": \"Test cancel\"\n  }\n}"
          }
        },
        "url": "{{baseUrl}}/graphql"
      }
    },
    {
      "name": "5. Unlock Order After Payment",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "graphql",
          "graphql": {
            "query": "mutation UnlockOrder($input: UnlockOrderInputDto!) {\n  unlockOrderAfterPayment(input: $input) {\n    success\n    orderId\n    previousStatus\n    newStatus\n    unlockedLicenses {\n      id\n      status\n    }\n    message\n    error\n  }\n}",
            "variables": "{\n  \"input\": {\n    \"orderId\": \"{{orderId}}\",\n    \"amount\": 1000000,\n    \"transactionId\": \"TXN-LATE-001\"\n  }\n}"
          }
        },
        "url": "{{baseUrl}}/graphql"
      }
    }
  ]
}
```

---

*Tài liệu được tạo tự động. Vui lòng cập nhật khi có thay đổi API.*
