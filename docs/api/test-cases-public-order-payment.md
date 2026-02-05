# Test Cases: mktPublicOrderPayment

> Query GraphQL public (unauthenticated) tra cuu thong tin thanh toan don hang.

---

## GraphQL Query

```graphql
query MktPublicOrderPayment($orderCode: String!) {
  mktPublicOrderPayment(orderCode: $orderCode) {
    success
    data {
      order {
        orderCode
        status
        paymentStatus
        totalAmount
        paidAmount
        remainingAmount
        currency
        paymentDeadline
        createdAt
      }
      customer {
        name
        email
        phone
      }
      items {
        name
        quantity
        unitPrice
        totalPrice
        productName
        packageName
      }
      payment {
        qrCodeUrl
        amount
        currency
      }
    }
    error {
      code
      message
    }
  }
}
```

---

## Luu y ve du lieu test

> **ORDER_CODE_PATTERN**: `/^[A-Z]{2,5}-\d{8}-\d{6}$/` (vd: `MKT-20250205-000123`)
>
> Cac order code hien tai trong database **KHONG** match pattern nay:
> - `DEV20260205001` - thieu dau gach
> - `MKT-CARE-2024-001` - prefix qua dai, sequence chi 3 so
>
> De test success path, can tao order voi code dung format hoac tam thoi noi long regex.

---

## Test Cases

### TC-01: Format khong hop le - chuoi rong

| Field | Value |
|-------|-------|
| **Muc dich** | Kiem tra reject order code rong |
| **Input** | `orderCode: ""` |
| **Expected** | `success: false`, error code `ORDER_NOT_FOUND` |
| **Response time** | 50-150ms (anti-enumeration delay) |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Không tìm thấy thông tin thanh toán"
  }
}
```

---

### TC-02: Format khong hop le - ky tu dac biet / SQL injection

| Field | Value |
|-------|-------|
| **Muc dich** | Kiem tra reject input doc hai |
| **Input** | `orderCode: "'; DROP TABLE mktOrder; --"` |
| **Expected** | `success: false`, error code `ORDER_NOT_FOUND` |
| **Response time** | 50-150ms (anti-enumeration delay) |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Không tìm thấy thông tin thanh toán"
  }
}
```

---

### TC-03: Format khong hop le - order code thuc nhung sai pattern

| Field | Value |
|-------|-------|
| **Muc dich** | Order code ton tai trong DB nhung khong match regex |
| **Input** | `orderCode: "DEV20260205001"` |
| **Du lieu DB** | Order ton tai: status=`PENDING_PAYMENT`, paymentStatus=`PENDING` |
| **Expected** | `success: false`, error code `ORDER_NOT_FOUND` (fail o buoc format validation, khong query DB) |
| **Response time** | 50-150ms (anti-enumeration delay) |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Không tìm thấy thông tin thanh toán"
  }
}
```

---

### TC-04: Format khong hop le - order code thuc co dau gach nhung sai format

| Field | Value |
|-------|-------|
| **Muc dich** | Order code co dau gach nhung khong dung pattern PREFIX-8DIGITS-6DIGITS |
| **Input** | `orderCode: "MKT-CARE-2024-001"` |
| **Du lieu DB** | Order ton tai: status=`COMPLETED`, paymentStatus=`PAID` |
| **Expected** | `success: false`, error code `ORDER_NOT_FOUND` |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Không tìm thấy thông tin thanh toán"
  }
}
```

---

### TC-05: Format hop le nhung order khong ton tai

| Field | Value |
|-------|-------|
| **Muc dich** | Order code dung format nhung khong co trong DB |
| **Input** | `orderCode: "MKT-20260101-999999"` |
| **Expected** | `success: false`, error code `ORDER_NOT_FOUND` |
| **Response time** | 50-150ms (anti-enumeration delay) |
| **Kiem tra them** | Response giong hiet TC-01~04 (anti-enumeration: khong phan biet invalid format vs not found) |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Không tìm thấy thông tin thanh toán"
  }
}
```

---

### TC-06: Order status = COMPLETED, paymentStatus = PAID

| Field | Value |
|-------|-------|
| **Muc dich** | Don hang da hoan tat va da thanh toan - khong cho phep xem trang thanh toan |
| **Du lieu DB** | `MKT-VIRAL-2024-002`: status=`COMPLETED`, paymentStatus=`PAID`, totalAmount=17,100,000 |
| **Input** | Order code cua don COMPLETED/PAID (can tao order voi dung format) |
| **Expected** | `success: false`, error code `ORDER_ALREADY_COMPLETED` |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_ALREADY_COMPLETED",
    "message": "Đơn hàng đã hoàn tất"
  }
}
```

---

### TC-07: Order status = COMPLETED, paymentStatus = PENDING

| Field | Value |
|-------|-------|
| **Muc dich** | Don hang da hoan tat nhung chua thanh toan (truong hop dac biet) |
| **Du lieu DB** | `MKT-UID-2024-003`: status=`COMPLETED`, paymentStatus=`PENDING`, totalAmount=6,600,000 |
| **Input** | Order code cua don COMPLETED/PENDING |
| **Expected** | `success: false`, error code `ORDER_ALREADY_COMPLETED` (validate order status TRUOC payment status) |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_ALREADY_COMPLETED",
    "message": "Đơn hàng đã hoàn tất"
  }
}
```

---

### TC-08: Order status = PROCESSING

| Field | Value |
|-------|-------|
| **Muc dich** | Don hang dang xu ly - chua san sang thanh toan |
| **Du lieu DB** | `MKT-PROC-2024-038`: status=`PROCESSING`, paymentStatus=`PENDING` |
| **Input** | Order code cua don PROCESSING |
| **Expected** | `success: false`, error code `ORDER_NOT_PAYABLE` |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_NOT_PAYABLE",
    "message": "Đơn hàng chưa sẵn sàng để thanh toán"
  }
}
```

---

### TC-09: Order status = LOCKED

| Field | Value |
|-------|-------|
| **Muc dich** | Don hang bi khoa - status khong nam trong PAYABLE_ORDER_STATUSES va khong co trong ORDER_STATUS_ERROR_MAP |
| **Du lieu DB** | `MKT-LOCK-2024-041`: status=`LOCKED`, paymentStatus=`PENDING` |
| **Input** | Order code cua don LOCKED |
| **Expected** | `success: false`, error code `ORDER_NOT_PAYABLE` (fallback default) |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_NOT_PAYABLE",
    "message": "Đơn hàng chưa sẵn sàng để thanh toán"
  }
}
```

---

### TC-10: Payment status = PAID (order status payable)

| Field | Value |
|-------|-------|
| **Muc dich** | Order co status payable nhung payment da hoan tat |
| **Du lieu DB** | Can tao order: status=`PENDING_PAYMENT`, paymentStatus=`PAID` |
| **Input** | Order code cua don co paymentStatus=PAID |
| **Expected** | `success: false`, error code `ORDER_ALREADY_PAID` |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_ALREADY_PAID",
    "message": "Đơn hàng đã được thanh toán"
  }
}
```

---

### TC-11: Order payable nhung khong co active payment

| Field | Value |
|-------|-------|
| **Muc dich** | Order du dieu kien nhung khong co payment nao co status PENDING/PROCESSING |
| **Du lieu DB** | Can tao order: status=`PENDING_PAYMENT`, paymentStatus=`PENDING`, khong co mktPayment lien ket hoac payment chi co status CONFIRMED/FAILED/CANCELLED |
| **Input** | Order code |
| **Expected** | `success: false`, error code `NO_ACTIVE_PAYMENT` |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NO_ACTIVE_PAYMENT",
    "message": "Không có thông tin thanh toán khả dụng"
  }
}
```

---

### TC-12: Success - don hang PENDING_PAYMENT voi active payment

| Field | Value |
|-------|-------|
| **Muc dich** | Happy path - tra ve day du thong tin thanh toan |
| **Du lieu DB** | `DEV20260205001` (can doi orderCode cho match pattern) |
| | - status: `PENDING_PAYMENT`, paymentStatus: `PENDING` |
| | - customer: Nguyen Van An, nguyen.van.an@techcorp.vn, 0901234567 |
| | - item: "Premium Tu dong hoa Marketing", qty 1, unitPrice 19,990,000 |
| | - payment: status=`PENDING`, amount=19,990,000, qrCodeUrl=`https://qr.sepay.vn/img?acc=19038151514012&bank=TECHCOMBANK&amount=19990000&des=DEV20260205001&template=qronly&download=false` |
| **Input** | Order code (format hop le) |
| **Expected** | `success: true` voi data day du |

```json
{
  "success": true,
  "data": {
    "order": {
      "orderCode": "DEV20260205001",
      "status": "PENDING_PAYMENT",
      "paymentStatus": "PENDING",
      "totalAmount": 19990000,
      "paidAmount": 0,
      "remainingAmount": 19990000,
      "currency": "VND",
      "paymentDeadline": null,
      "createdAt": "2026-02-05T07:49:49.553Z"
    },
    "customer": {
      "name": "Nguyễn Văn An",
      "email": "ng***@techcorp.vn",
      "phone": "******4567"
    },
    "items": [
      {
        "name": "Premium Tự động hóa Marketing",
        "quantity": 1,
        "unitPrice": 19990000,
        "totalPrice": 19990000,
        "productName": "Premium Tự động hóa Marketing",
        "packageName": "Gói Doanh Nghiệp - Vĩnh Viễn"
      }
    ],
    "payment": {
      "qrCodeUrl": "https://qr.sepay.vn/img?acc=19038151514012&bank=TECHCOMBANK&amount=19990000&des=DEV20260205001&template=qronly&download=false",
      "amount": 19990000,
      "currency": "VND"
    }
  },
  "error": null
}
```

---

### TC-13: PII Masking - email

| Field | Value |
|-------|-------|
| **Muc dich** | Kiem tra email duoc mask dung format |
| **Du lieu DB** | Customer email: `nguyen.van.an@techcorp.vn` |
| **Expected** | `ng***********@techcorp.vn` (2 ky tu dau + mask + domain) |
| **Rule** | Hien thi 2 ky tu dau, mask phan con lai truoc @, giu nguyen domain |

**Cac truong hop can kiem tra:**

| Email goc | Expected masked |
|-----------|----------------|
| `nguyen.van.an@techcorp.vn` | `ng***********@techcorp.vn` |
| `ab@gmail.com` | `ab@gmail.com` (chi co 2 ky tu truoc @ -> maskedLen = max(0,1) = 1 -> `ab*@gmail.com`) |
| `a@test.vn` | `a*@test.vn` |
| `null` | `null` |
| `""` | `null` (empty string la falsy) |

---

### TC-14: PII Masking - phone

| Field | Value |
|-------|-------|
| **Muc dich** | Kiem tra phone duoc mask dung format |
| **Du lieu DB** | Customer phone: `0901234567` |
| **Expected** | `******4567` (mask tat ca tru 4 so cuoi) |
| **Rule** | Hien thi 4 ky tu cuoi, mask phan con lai |

**Cac truong hop can kiem tra:**

| Phone goc | Expected masked |
|-----------|----------------|
| `0901234567` | `******4567` |
| `84901234567` | `*******4567` |
| `1234` | `****` (length <= 4 -> mask tat ca) |
| `null` | `null` |

---

### TC-15: Active payment selection - nhieu payment, chon moi nhat

| Field | Value |
|-------|-------|
| **Muc dich** | Khi order co nhieu payment, chi tra ve payment active (PENDING/PROCESSING) moi nhat |
| **Du lieu DB** | Can tao order voi 3 payments: |
| | - Payment A: status=`CONFIRMED`, createdAt=T1 |
| | - Payment B: status=`PENDING`, createdAt=T2 |
| | - Payment C: status=`PENDING`, createdAt=T3 (moi nhat) |
| **Expected** | Response tra ve Payment C (PENDING + createdAt moi nhat) |

---

### TC-16: Anti-enumeration - timing consistency

| Field | Value |
|-------|-------|
| **Muc dich** | Kiem tra response time cua NOT_FOUND cases tuong duong nhau |
| **Method** | Goi 10 lan voi invalid format, 10 lan voi valid format nhung khong ton tai |
| **Expected** | Response time trung binh cua 2 nhom tuong duong (50-150ms delay) |
| **Kiem tra** | Khong the phan biet invalid format vs not found dua tren timing |

---

### TC-17: Output sanitization - khong leak internal data

| Field | Value |
|-------|-------|
| **Muc dich** | Kiem tra response khong chua du lieu noi bo |
| **Input** | Order code hop le cua don PENDING_PAYMENT |
| **Kiem tra response KHONG chua** | |
| | - Internal UUID (order id, customer id, payment id) |
| | - `citizenId`, `taxCode` |
| | - `accountOwnerId`, `createdById`, `confirmedById` |
| | - `licenses` (license keys) |
| | - `providerTransactionId`, `providerResponse` |
| | - `metadata`, `snapshotMktProduct`, `snapshotMktPackage` |
| | - `accountingConfirmed`, `salePaymentConfirmed` |

---

### TC-18: Customer khong co thong tin

| Field | Value |
|-------|-------|
| **Muc dich** | Order khong co customer lien ket hoac customer thieu thong tin |
| **Du lieu DB** | Order voi `mktCustomerId = NULL` hoac customer khong co email/phone |
| **Expected** | customer.name = `"Khach hang"` (default), email = `null`, phone = `null` |

```json
{
  "customer": {
    "name": "Khách hàng",
    "email": null,
    "phone": null
  }
}
```

---

### TC-19: Order khong co items

| Field | Value |
|-------|-------|
| **Muc dich** | Order khong co order items (edge case) |
| **Du lieu DB** | Order hop le nhung khong co ban ghi trong mktOrderItem |
| **Expected** | `items: []` (mang rong, khong loi) |

---

### TC-20: Amounts la integers (khong co decimal)

| Field | Value |
|-------|-------|
| **Muc dich** | Kiem tra tat ca amounts tra ve dang integer (VND khong co tien le) |
| **Du lieu DB** | Order voi totalAmount=19990000.0, unitPrice=19990000.0 |
| **Expected** | totalAmount=`19990000` (khong co `.0`), unitPrice=`19990000` |
| **Kiem tra** | GraphQL tra ve `Int` type, khong co floating-point |

---

## Ma tran test coverage

| # | Scenario | Format | DB Lookup | Order Status | Payment Status | Active Payment | Result |
|---|----------|--------|-----------|--------------|----------------|----------------|--------|
| TC-01 | Empty string | FAIL | - | - | - | - | ORDER_NOT_FOUND |
| TC-02 | SQL injection | FAIL | - | - | - | - | ORDER_NOT_FOUND |
| TC-03 | Real code sai format | FAIL | - | - | - | - | ORDER_NOT_FOUND |
| TC-04 | Real code co dash sai format | FAIL | - | - | - | - | ORDER_NOT_FOUND |
| TC-05 | Valid format, khong ton tai | PASS | NOT FOUND | - | - | - | ORDER_NOT_FOUND |
| TC-06 | COMPLETED + PAID | PASS | FOUND | COMPLETED | PAID | - | ORDER_ALREADY_COMPLETED |
| TC-07 | COMPLETED + PENDING | PASS | FOUND | COMPLETED | PENDING | - | ORDER_ALREADY_COMPLETED |
| TC-08 | PROCESSING | PASS | FOUND | PROCESSING | - | - | ORDER_NOT_PAYABLE |
| TC-09 | LOCKED | PASS | FOUND | LOCKED | - | - | ORDER_NOT_PAYABLE |
| TC-10 | Payable + PAID | PASS | FOUND | PENDING_PAYMENT | PAID | - | ORDER_ALREADY_PAID |
| TC-11 | Payable + no active payment | PASS | FOUND | PENDING_PAYMENT | PENDING | NONE | NO_ACTIVE_PAYMENT |
| TC-12 | Happy path | PASS | FOUND | PENDING_PAYMENT | PENDING | YES | SUCCESS |
| TC-13 | PII email mask | - | - | - | - | - | Verify mask |
| TC-14 | PII phone mask | - | - | - | - | - | Verify mask |
| TC-15 | Multi payment selection | PASS | FOUND | PENDING_PAYMENT | PENDING | MULTI | SUCCESS (newest) |
| TC-16 | Anti-enumeration timing | - | - | - | - | - | Verify timing |
| TC-17 | Output sanitization | PASS | FOUND | PENDING_PAYMENT | PENDING | YES | No internal data |
| TC-18 | Customer null | PASS | FOUND | PENDING_PAYMENT | PENDING | YES | Default values |
| TC-19 | Items empty | PASS | FOUND | PENDING_PAYMENT | PENDING | YES | Empty array |
| TC-20 | Integer amounts | PASS | FOUND | PENDING_PAYMENT | PENDING | YES | Int type |

---

## Du lieu test tu database (dev)

### Orders theo status

| Order Code | Status | Payment Status | Total Amount |
|------------|--------|----------------|--------------|
| `DEV20260205001` | PENDING_PAYMENT | PENDING | 19,990,000 |
| `MKT-PROC-2024-038` | PROCESSING | PENDING | - |
| `MKT-PROC-2024-039` | PROCESSING | PENDING | - |
| `MKT-PROC-2024-040` | PROCESSING | PENDING | - |
| `MKT-LOCK-2024-041` | LOCKED | PENDING | - |
| `MKT-LOCK-2024-042` | LOCKED | PENDING | - |
| `MKT-VIRAL-2024-002` | COMPLETED | PAID | 17,100,000 |
| `MKT-UID-2024-003` | COMPLETED | PENDING | 6,600,000 |
| `MKT-CARE-2024-001` | COMPLETED | PAID | - |

> Luu y: Hien khong co order nao co status `CANCELED` hoac `DRAFT` trong DB dev.

### Customer du lieu

| Customer | Email | Phone |
|----------|-------|-------|
| Nguyen Van An | nguyen.van.an@techcorp.vn | 0901234567 |

### Payment lien ket voi order

| Order | Payment Status | Amount | QR Code URL |
|-------|----------------|--------|-------------|
| DEV20260205001 | PENDING | 19,990,000 | `https://qr.sepay.vn/img?acc=19038151514012&bank=TECHCOMBANK&amount=19990000&des=DEV20260205001&template=qronly&download=false` |

---

## Luu y khi test

1. **ORDER_CODE_PATTERN** (`/^[A-Z]{2,5}-\d{8}-\d{6}$/`): Cac order code hien tai trong dev KHONG match pattern nay. Can tao order moi voi format dung (vd: `MKT-20260205-000001`) hoac update regex de test day du.

2. **Anti-enumeration**: Response cua invalid format va not found **giong hiet nhau** (cung error code, cung message, cung delay 50-150ms). Khong the phan biet 2 truong hop nay tu response.

3. **PublicEndpointGuard**: Endpoint nay **khong can authentication**. Kiem tra co the goi duoc ma khong can token.

4. **PII Masking**: Email va phone luon duoc mask trong response. Khong co cach nao lay thong tin day du tu endpoint nay.

5. **Amounts**: Tat ca amounts la integers (VND = dong). Khong co decimal.
