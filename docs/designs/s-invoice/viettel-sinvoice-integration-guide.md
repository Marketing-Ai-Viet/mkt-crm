# Hướng Dẫn Tích Hợp Viettel S-Invoice API Cho Hệ Thống CRM

## Mục Lục

1. [Giới Thiệu](#1-giới-thiệu)
2. [Thông Tin Kết Nối](#2-thông-tin-kết-nối)
3. [Xác Thực API](#3-xác-thực-api)
4. [Cấu Trúc Dữ Liệu Hóa Đơn](#4-cấu-trúc-dữ-liệu-hóa-đơn)
5. [Các API Chính](#5-các-api-chính)
6. [Luồng Nghiệp Vụ](#6-luồng-nghiệp-vụ)
7. [Xử Lý Lỗi](#7-xử-lý-lỗi)
8. [Thư Viện Hỗ Trợ](#8-thư-viện-hỗ-trợ)
9. [Tài Liệu Tham Khảo](#9-tài-liệu-tham-khảo)

---

## 1. Giới Thiệu

### 1.1 Mô Tả Hệ Thống

Hệ thống **S-Invoice (SInvoice)** của Viettel đóng vai trò nhận dữ liệu hóa đơn từ các hệ thống bên ngoài (hệ thống CRM, ERP, phần mềm kế toán) và phát hành thành hóa đơn điện tử theo mẫu mà doanh nghiệp đã đăng ký.

### 1.2 Chuẩn API

- **Chuẩn kết nối:** RESTful Webservice
- **Định dạng dữ liệu:** JSON và XML
- **Bảo mật:** HTTPS với xác thực bằng Token
- **Encoding:** UTF-8

### 1.3 Các Loại Hóa Đơn Hỗ Trợ

| Loại Hóa Đơn | Mã (TT32) | Mã (TT78) |
|--------------|-----------|-----------|
| Hóa đơn GTGT | 01GTKT | 1 |
| Hóa đơn bán hàng | 02GTTT | 2 |
| Hóa đơn xuất khẩu | 07KPTQ | 3 |
| Phiếu xuất kho | 03XKNB | 4 |
| Biên lai | 01BLP | - |

---

## 2. Thông Tin Kết Nối

### 2.1 Môi Trường Production

| Thông Tin | Giá Trị |
|-----------|---------|
| **Web Portal** | https://vinvoice.viettel.vn |
| **API Endpoint** | https://api-vinvoice.viettel.vn/services/einvoiceapplication/api/ |
| **Auth Endpoint** | https://api-vinvoice.viettel.vn/auth/login |

### 2.2 Môi Trường Demo/Test

| Thông Tin | Giá Trị |
|-----------|---------|
| **Web Portal** | https://vinvoice.viettel.vn |
| **Username Demo** | 0100109106-509 |
| **Password Demo** | 123456a@A |

### 2.3 Cấu Hình Timeout

- **Timeout tối thiểu:** 90 giây
- **Khuyến nghị:** 120 giây cho các request tạo hóa đơn

---

## 3. Xác Thực API

### 3.1 Lấy Access Token

**Endpoint:** `POST /auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "0100109106-509",
  "password": "123456a@A"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 3.2 Sử Dụng Token

Sau khi có `access_token`, thêm vào Header của mọi request:

```
Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. Cấu Trúc Dữ Liệu Hóa Đơn

### 4.1 Tổng Quan Cấu Trúc

```json
{
  "generalInvoiceInfo": {},
  "buyerInfo": {},
  "sellerInfo": {},
  "payments": [],
  "itemInfo": [],
  "metadata": [],
  "meterReading": [],
  "summarizeInfo": {},
  "taxBreakdowns": []
}
```

### 4.2 generalInvoiceInfo - Thông Tin Chung

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `transactionUuid` | String | Có | UUID duy nhất cho mỗi hóa đơn (khuyến cáo UUID V4) |
| `invoiceType` | String | Không | Loại hóa đơn: 01GTKT, 02GTTT, 01BLP... |
| `templateCode` | String | Có | Ký hiệu mẫu hóa đơn (VD: 01GTKT0/001, 1/001) |
| `invoiceSeries` | String | Có | Ký hiệu hóa đơn (VD: AB/20E, K23TBS) |
| `invoiceIssuedDate` | Long | Không | Ngày lập hóa đơn (milliseconds) |
| `currencyCode` | String | Có | Mã tiền tệ: VND, USD, EUR... |
| `adjustmentType` | String | Không | 1: Gốc, 3: Thay thế, 5: Điều chỉnh, 7: Xóa bỏ |
| `paymentStatus` | Boolean | Có | true: Đã thanh toán, false: Chưa thanh toán |
| `exchangeRate` | BigDecimal | Không | Tỷ giá quy đổi VND |

**Ví dụ - Hóa Đơn Thường:**
```json
{
  "generalInvoiceInfo": {
    "transactionUuid": "859f390a-1e59-4a05-9663-1e9ec7afdb8f",
    "invoiceType": "01GTKT",
    "templateCode": "01GTKT0/001",
    "invoiceSeries": "AB/20E",
    "invoiceIssuedDate": 1605027600000,
    "currencyCode": "VND",
    "adjustmentType": "1",
    "paymentStatus": true,
    "cusGetInvoiceRight": true
  }
}
```

**Ví dụ - Hóa Đơn Điều Chỉnh:**
```json
{
  "generalInvoiceInfo": {
    "transactionUuid": "859f390a-1e59-4a05-9663-1e9ec7afdb8f",
    "invoiceType": "01GTKT",
    "templateCode": "01GTKT0/001",
    "invoiceSeries": "AB/20E",
    "invoiceIssuedDate": 1605027600000,
    "currencyCode": "VND",
    "adjustmentType": "5",
    "adjustmentInvoiceType": "1",
    "originalInvoiceId": "AB/20E0000036",
    "originalInvoiceIssueDate": 1605027600000,
    "additionalReferenceDesc": "Văn bản thỏa thuận",
    "additionalReferenceDate": 1605027600000,
    "paymentStatus": true
  }
}
```

### 4.3 sellerInfo - Thông Tin Người Bán

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `sellerLegalName` | String | Có* | Tên doanh nghiệp |
| `sellerTaxCode` | String | Có* | Mã số thuế người bán |
| `sellerAddressLine` | String | Có* | Địa chỉ |
| `sellerPhoneNumber` | String | Không | Số điện thoại |
| `sellerEmail` | String | Không | Email |
| `sellerBankName` | String | Không | Tên ngân hàng |
| `sellerBankAccount` | String | Không | Số tài khoản |

> **Lưu ý:** Nếu không truyền `sellerTaxCode`, hệ thống sẽ lấy thông tin từ cấu hình trên S-Invoice.

**Ví dụ:**
```json
{
  "sellerInfo": {
    "sellerLegalName": "CÔNG TY TNHH ABC",
    "sellerTaxCode": "0100109106",
    "sellerAddressLine": "123 Đường Láng, Đống Đa, Hà Nội",
    "sellerPhoneNumber": "0243456789",
    "sellerEmail": "contact@abc.com.vn",
    "sellerBankName": "Ngân hàng TMCP Quân đội MB",
    "sellerBankAccount": "0123456789"
  }
}
```

### 4.4 buyerInfo - Thông Tin Người Mua

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `buyerName` | String | Có* | Tên người mua |
| `buyerLegalName` | String | Có* | Tên đơn vị |
| `buyerTaxCode` | String | Có* | Mã số thuế người mua |
| `buyerAddressLine` | String | Có* | Địa chỉ |
| `buyerPhoneNumber` | String | Không | Số điện thoại |
| `buyerEmail` | String | Không | Email (để gửi hóa đơn tự động) |
| `buyerBankName` | String | Không | Tên ngân hàng |
| `buyerBankAccount` | String | Không | Số tài khoản |
| `buyerNotGetInvoice` | Integer | Không | 0: Lấy hóa đơn, 1: Không lấy |

**Ví dụ:**
```json
{
  "buyerInfo": {
    "buyerName": "Nguyễn Văn A",
    "buyerLegalName": "CÔNG TY TNHH XYZ",
    "buyerTaxCode": "0312770607",
    "buyerAddressLine": "456 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    "buyerPhoneNumber": "0987654321",
    "buyerEmail": "ketoanabc@xyz.com.vn",
    "buyerBankName": "Vietcombank",
    "buyerBankAccount": "0123456789012"
  }
}
```

### 4.5 payments - Phương Thức Thanh Toán

| Mã | Tên |
|----|-----|
| 1 | TM (Tiền mặt) |
| 2 | CK (Chuyển khoản) |
| 3 | TM/CK |
| 4 | DTCN (Đối trừ công nợ) |
| 5 | KHAC |

**Ví dụ:**
```json
{
  "payments": [
    {
      "paymentMethod": "2",
      "paymentMethodName": "CK"
    }
  ]
}
```

### 4.6 itemInfo - Thông Tin Hàng Hóa/Dịch Vụ

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `lineNumber` | Integer | Không | Số thứ tự dòng |
| `selection` | Integer | Không | 1: Hàng hóa, 2: Ghi chú, 3: Chiết khấu, 4: Bảng kê, 5: Phí khác/Khuyến mại |
| `itemCode` | String | Không | Mã hàng hóa |
| `itemName` | String | Có* | Tên hàng hóa/dịch vụ |
| `unitName` | String | Không | Đơn vị tính |
| `unitPrice` | BigDecimal | Có* | Đơn giá |
| `quantity` | BigDecimal | Có* | Số lượng |
| `itemTotalAmountWithoutTax` | BigDecimal | Có | Thành tiền chưa VAT |
| `taxPercentage` | BigDecimal | Không | Thuế suất: -2, -1, 0, 5, 10 |
| `taxAmount` | BigDecimal | Không | Tiền thuế |
| `discount` | BigDecimal | Không | % chiết khấu |
| `isIncreaseItem` | Boolean | Không | true: Điều chỉnh tăng, false: Điều chỉnh giảm |

**Thuế Suất:**
- `-2`: Không thuế
- `-1`: Không kê khai tính/nộp thuế
- `0`: 0%
- `5`: 5%
- `10`: 10%

**Ví dụ - Hàng Hóa Thông Thường:**
```json
{
  "itemInfo": [
    {
      "lineNumber": 1,
      "itemCode": "SP001",
      "itemName": "Máy tính Dell Vostro 3653",
      "unitName": "Cái",
      "unitPrice": 10300000,
      "quantity": 1,
      "itemTotalAmountWithoutTax": 10300000,
      "taxPercentage": 10,
      "taxAmount": 1030000,
      "discount": 0
    },
    {
      "lineNumber": 2,
      "selection": 2,
      "itemName": "Ghi chú: Bảo hành 12 tháng"
    }
  ]
}
```

### 4.7 taxBreakdowns - Tổng Hợp Thuế

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `taxPercentage` | BigDecimal | Mức thuế: -2, -1, 0, 5, 10 |
| `taxableAmount` | BigDecimal | Tổng tiền chịu thuế |
| `taxAmount` | BigDecimal | Tổng tiền thuế |
| `taxableAmountPos` | Boolean | true: Dương, false: Âm |
| `taxAmountPos` | Boolean | true: Dương, false: Âm |

**Ví dụ:**
```json
{
  "taxBreakdowns": [
    {
      "taxPercentage": 10,
      "taxableAmount": 10300000,
      "taxAmount": 1030000
    }
  ]
}
```

### 4.8 summarizeInfo - Tổng Hợp Tiền

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `sumOfTotalLineAmountWithoutTax` | BigDecimal | Tổng tiền hàng chưa VAT |
| `totalAmountWithoutTax` | BigDecimal | Tổng tiền chưa VAT (sau chiết khấu) |
| `totalTaxAmount` | BigDecimal | Tổng tiền thuế |
| `totalAmountWithTax` | BigDecimal | Tổng tiền đã bao gồm VAT |
| `totalAmountWithTaxInWords` | String | Số tiền bằng chữ |
| `discountAmount` | BigDecimal | Tổng tiền chiết khấu |

**Ví dụ:**
```json
{
  "summarizeInfo": {
    "sumOfTotalLineAmountWithoutTax": 10300000,
    "totalAmountWithoutTax": 10300000,
    "totalTaxAmount": 1030000,
    "totalAmountWithTax": 11330000,
    "totalAmountWithTaxInWords": "Mười một triệu ba trăm ba mươi nghìn đồng",
    "discountAmount": 0
  }
}
```

---

## 5. Các API Chính

### 5.1 Tạo Hóa Đơn (HSM)

**Endpoint:** `POST /InvoiceAPI/InvoiceWS/createInvoice/{supplierTaxCode}`

**Mô tả:** Tạo và ký hóa đơn sử dụng chữ ký số HSM (lưu trên server).

**Request:**
```json
{
  "generalInvoiceInfo": { ... },
  "sellerInfo": { ... },
  "buyerInfo": { ... },
  "payments": [ ... ],
  "itemInfo": [ ... ],
  "taxBreakdowns": [ ... ],
  "summarizeInfo": { ... }
}
```

**Response:**
```json
{
  "errorCode": null,
  "description": "Success",
  "result": {
    "invoiceNo": "AB/20E0000001",
    "transactionUuid": "859f390a-1e59-4a05-9663-1e9ec7afdb8f",
    "reservationCode": "ABC123DEF"
  }
}
```

### 5.2 Tạo Hóa Đơn Nháp

**Endpoint:** `POST /InvoiceAPI/InvoiceWS/createDraftInvoice/{supplierTaxCode}`

**Mô tả:** Tạo hóa đơn nháp để xem trước trước khi phát hành.

### 5.3 Xem Trước Hóa Đơn Nháp

**Endpoint:** `POST /InvoiceAPI/InvoiceWS/previewDraftInvoice/{supplierTaxCode}`

**Mô tả:** Xem trước hóa đơn dưới dạng PDF trước khi phát hành.

**Response:** File PDF dạng base64.

### 5.4 Tải File Hóa Đơn

**Endpoint:** `GET /InvoiceAPI/InvoiceUtilsWS/getInvoiceFile`

**Query Parameters:**
- `supplierTaxCode`: Mã số thuế người bán
- `invoiceNo`: Số hóa đơn
- `fileType`: Loại file (zip, pdf, xml)
- `strIssueDate`: Ngày lập (yyyyMMddHHmmss)

**Ví dụ:**
```
GET /InvoiceAPI/InvoiceUtilsWS/getInvoiceFile?supplierTaxCode=0100109106&invoiceNo=AB/20E0000001&fileType=pdf&strIssueDate=20201110143000
```

### 5.5 Hủy Hóa Đơn

**Endpoint:** `POST /InvoiceAPI/InvoiceWS/cancelInvoice`

**Request:**
```json
{
  "supplierTaxCode": "0100109106",
  "invoiceNo": "AB/20E0000001",
  "strIssueDate": "20201110143000",
  "additionalReferenceDesc": "Lý do hủy hóa đơn"
}
```

### 5.6 Tra Cứu Hóa Đơn Theo TransactionUuid

**Endpoint:** `GET /InvoiceAPI/InvoiceWS/getInvoiceByTransactionUuid`

**Query Parameters:**
- `transactionUuid`: UUID của giao dịch

### 5.7 Lấy Danh Sách Hóa Đơn Theo Khoảng Thời Gian

**Endpoint:** `GET /InvoiceAPI/InvoiceWS/getInvoicesByDateRange`

**Query Parameters:**
- `supplierTaxCode`: Mã số thuế
- `fromDate`: Từ ngày (DD/MM/YYYY)
- `toDate`: Đến ngày (DD/MM/YYYY)

### 5.8 Lấy Danh Sách Mẫu Hóa Đơn

**Endpoint:** `GET /InvoiceAPI/InvoiceWS/getInvoiceTemplates`

**Query Parameters:**
- `invoiceType`: Loại hóa đơn (01GTKT, 02GTTT, 01BLP...)

---

## 6. Luồng Nghiệp Vụ

### 6.1 Luồng Phát Hành Hóa Đơn Cơ Bản

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. Đăng nhập   │────▶│  2. Tạo Invoice │────▶│  3. Tải File    │
│  (Lấy Token)    │     │  createInvoice  │     │  getInvoiceFile │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 6.2 Luồng Điều Chỉnh/Thay Thế Hóa Đơn

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. Tra cứu HD  │────▶│  2. Tạo HD mới  │────▶│  3. Liên kết    │
│  gốc cần sửa    │     │  adjustmentType │     │  originalInvoice│
└─────────────────┘     │  = 3 hoặc 5     │     │  Id/IssueDate   │
                        └─────────────────┘     └─────────────────┘
```

### 6.3 Luồng Hủy Hóa Đơn

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. Tra cứu HD  │────▶│  2. Gọi API     │────▶│  3. Cập nhật    │
│  cần hủy        │     │  cancelInvoice  │     │  trạng thái CRM │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 6.4 Cơ Chế Chống Trùng Giao Dịch

1. **Tạo `transactionUuid` duy nhất** cho mỗi hóa đơn (khuyến cáo UUID V4)
2. **Đợi response** hoặc timeout (90s) trước khi gửi request mới
3. **Tra cứu theo `transactionUuid`** nếu không nhận được response

```
Request 1 ───────▶ [Server xử lý] ───────▶ Response
                         │
                  Nếu timeout/lỗi mạng
                         │
                         ▼
Request 2 (cùng UUID) ──▶ [Server trả về kết quả cũ]
```

---

## 7. Xử Lý Lỗi

### 7.1 Cấu Trúc Response Lỗi

```json
{
  "errorCode": "E001",
  "description": "Mô tả lỗi chi tiết",
  "result": null
}
```

### 7.2 Các Mã Lỗi Thường Gặp

| Mã Lỗi | Mô Tả | Cách Xử Lý |
|--------|-------|------------|
| AUTH_001 | Token hết hạn | Gọi lại API login |
| INV_001 | Trùng transactionUuid | Kiểm tra hóa đơn đã tồn tại |
| INV_002 | Sai định dạng dữ liệu | Kiểm tra JSON format |
| INV_003 | Thiếu trường bắt buộc | Bổ sung các trường required |
| INV_004 | Sai mẫu hóa đơn | Kiểm tra templateCode |
| INV_005 | Lỗi tính toán tiền | Kiểm tra itemTotalAmountWithoutTax = quantity × unitPrice |
| INV_006 | Lỗi thuế suất | Kiểm tra taxBreakdowns khớp với itemInfo |

### 7.3 Quy Tắc Validate

1. **Kiểm tra tiền hàng:**
   - `itemTotalAmountWithoutTax` = `quantity` × `unitPrice` (sai số ≤ 5 đồng)

2. **Kiểm tra thuế:**
   - Tổng `taxAmount` trong `itemInfo` = `taxAmount` trong `taxBreakdowns` (sai số ≤ 20,000 đồng)

3. **Ký tự đặc biệt:**
   - Escape các ký tự trong JSON: `"` → `\"`

---

## 8. Thư Viện Hỗ Trợ

### 8.1 NPM Package (Node.js/TypeScript)

```bash
npm install --save viettel-s-invoice
```

**Sử dụng:**
```javascript
const ViettelSInvoice = require('viettel-s-invoice');

const client = new ViettelSInvoice({
  username: 'your-username',
  password: 'your-password',
  apiEndPoint: 'https://api-vinvoice.viettel.vn'
});

// Tạo hóa đơn
client.createInvoice(invoiceData)
  .then(response => console.log(response))
  .catch(error => console.error(error));

// Xem trước hóa đơn nháp
client.previewDraftInvoice(invoiceData)
  .then(response => console.log(response))
  .catch(error => console.error(error));

// Tra cứu theo UUID
client.getInvoiceByTransactionUuid('7a9f9e2a-d28f-4bef-a9d0-d91607453f70')
  .then(response => console.log(response))
  .catch(error => console.error(error));

// Lấy danh sách hóa đơn theo thời gian
client.getInvoicesByDateRange('01/01/2024', '31/01/2024')
  .then(response => console.log(response))
  .catch(error => console.error(error));

// Tải file hóa đơn
client.getInvoiceFile({ 
  invoiceNo: 'AB/20E0000001', 
  templateCode: '01GTKT0/001', 
  fileType: 'pdf' 
})
  .then(response => console.log(response))
  .catch(error => console.error(error));
```

### 8.2 Source Code Mẫu (Từ Viettel)

Viettel cung cấp source code mẫu tại:
- **Java:** https://sinvoice.viettel.vn/download/soft/example_create_invoice.rar
- **C#/.NET:** https://sinvoice.viettel.vn/download/soft/src_java.rar
- **USB Token:** https://sinvoice.viettel.vn/download/soft/signhash.rar

---

## 9. Tài Liệu Tham Khảo

### 9.1 Link Tải Tài Liệu Chính Thức

| Tài liệu | Link |
|----------|------|
| Tài liệu API v2.46 | https://sinvoice.viettel.vn/download/soft/tailieu_mo_ta_webservice_hoadondientu_doitac_v2.46_public.docx.zip |
| Tài liệu API Tiếng Anh | https://sinvoice.viettel.vn/download/soft/technical_documentation_for_integration.docx |
| HDSD Web HĐĐT 2.0 | https://sinvoice.viettel.vn/download/soft/hdsd_web_dich_vu_hoa_don_hddt2.0_tt78_v2.57.doc |
| Mẫu hóa đơn TT78 | https://sinvoice.viettel.vn/download/soft/template_tt78.zip |

### 9.2 Văn Bản Pháp Lý

- **Thông tư 78/2021/TT-BTC:** Hướng dẫn thực hiện Luật Quản lý thuế, Nghị định 123/2020/NĐ-CP
- **Nghị định 123/2020/NĐ-CP:** Quy định về hóa đơn, chứng từ
- **Nghị định 70:** Các quy định mới về hóa đơn điện tử

### 9.3 Hỗ Trợ Kỹ Thuật

| Thông tin | Giá trị |
|-----------|---------|
| **Hotline** | 1800-8000 |
| **Email** | cskh@viettel.com.vn |
| **Trang hỗ trợ** | https://sinvoice.viettel.vn/ho-tro |

### 9.4 Link Hữu Ích

- **Web S-Invoice:** https://sinvoice.viettel.vn
- **Trang tải về:** https://sinvoice.viettel.vn/tai-ve
- **Hướng dẫn sử dụng:** https://sinvoice.viettel.vn/ho-tro/huong-dan-su-dung
- **Tra cứu hóa đơn:** https://sinvoice.viettel.vn/tracuuhoadon
- **GitHub SDK:** https://github.com/dev10katec/viettel-s-invoice

---

## Phụ Lục

### A. Quy Đổi Thời Gian (Milliseconds)

Sử dụng công cụ: https://currentmillis.com/

**Công thức JavaScript:**
```javascript
// Chuyển Date sang milliseconds
const milliseconds = new Date().getTime();

// Chuyển milliseconds sang Date
const date = new Date(1605027600000);
```

### B. Ví Dụ JSON Hoàn Chỉnh

```json
{
  "generalInvoiceInfo": {
    "transactionUuid": "859f390a-1e59-4a05-9663-1e9ec7afdb8f",
    "invoiceType": "01GTKT",
    "templateCode": "01GTKT0/001",
    "invoiceSeries": "AB/20E",
    "invoiceIssuedDate": 1605027600000,
    "currencyCode": "VND",
    "adjustmentType": "1",
    "paymentStatus": true,
    "cusGetInvoiceRight": true
  },
  "sellerInfo": {
    "sellerLegalName": "CÔNG TY TNHH ABC",
    "sellerTaxCode": "0100109106",
    "sellerAddressLine": "123 Đường Láng, Đống Đa, Hà Nội",
    "sellerPhoneNumber": "0243456789",
    "sellerEmail": "contact@abc.com.vn",
    "sellerBankName": "MB Bank",
    "sellerBankAccount": "0123456789"
  },
  "buyerInfo": {
    "buyerName": "Nguyễn Văn A",
    "buyerLegalName": "CÔNG TY TNHH XYZ",
    "buyerTaxCode": "0312770607",
    "buyerAddressLine": "456 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    "buyerPhoneNumber": "0987654321",
    "buyerEmail": "ketoan@xyz.com.vn"
  },
  "payments": [
    {
      "paymentMethod": "2",
      "paymentMethodName": "CK"
    }
  ],
  "itemInfo": [
    {
      "lineNumber": 1,
      "itemCode": "SP001",
      "itemName": "Máy tính Dell Vostro 3653",
      "unitName": "Cái",
      "unitPrice": 10300000,
      "quantity": 1,
      "itemTotalAmountWithoutTax": 10300000,
      "taxPercentage": 10,
      "taxAmount": 1030000,
      "discount": 0
    }
  ],
  "taxBreakdowns": [
    {
      "taxPercentage": 10,
      "taxableAmount": 10300000,
      "taxAmount": 1030000
    }
  ],
  "summarizeInfo": {
    "sumOfTotalLineAmountWithoutTax": 10300000,
    "totalAmountWithoutTax": 10300000,
    "totalTaxAmount": 1030000,
    "totalAmountWithTax": 11330000,
    "totalAmountWithTaxInWords": "Mười một triệu ba trăm ba mươi nghìn đồng",
    "discountAmount": 0
  }
}
```

---

**Cập nhật lần cuối:** Tháng 12/2025

**Phiên bản tài liệu:** 1.0

**Nguồn tham khảo:** 
- Tài liệu chính thức Viettel S-Invoice
- GitHub: dev10katec/viettel-s-invoice
