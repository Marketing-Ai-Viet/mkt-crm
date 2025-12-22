# Báo Cáo Đánh Giá Module mkt-core/invoice với Yêu Cầu Viettel S-Invoice

**Ngày đánh giá:** 2025-12-21
**Phiên bản tài liệu:** 1.0
**Module đánh giá:** `packages/twenty-server/src/mkt-core/invoice`

---

## 1. Tổng Quan

### 1.1 Mục Tiêu Đánh Giá
Đánh giá mức độ đáp ứng của module `mkt-core/invoice` hiện tại so với yêu cầu tích hợp Viettel S-Invoice API theo tài liệu hướng dẫn.

### 1.2 Kết Quả Tổng Hợp

| Tiêu chí | Đáp ứng | Tỷ lệ |
|----------|---------|-------|
| Cấu trúc dữ liệu (Entities) | Đạt phần lớn | ~85% |
| API Integration | Đạt một phần | ~40% |
| Luồng nghiệp vụ | Đạt cơ bản | ~60% |
| Xử lý lỗi | Đạt cơ bản | ~50% |

**Đánh giá tổng thể: 60% - Cần bổ sung thêm tính năng**

---

## 2. Phân Tích Chi Tiết Entities

### 2.1 MktSInvoiceWorkspaceEntity (Hóa Đơn Chính)

#### Các trường ĐÃ CÓ ✅

| Trường S-Invoice API | Trường Entity | Ghi chú |
|---------------------|---------------|---------|
| `transactionUuid` | `transactionUuid` | ✅ Đầy đủ |
| `invoiceType` | `invoiceType` | ✅ Đầy đủ |
| `templateCode` | `templateCode` | ✅ Đầy đủ |
| `invoiceSeries` | `invoiceSeries` | ✅ Đầy đủ |
| `currencyCode` | `currencyCode` | ✅ Đầy đủ |
| `exchangeRate` | `exchangeRate` | ✅ Đầy đủ |
| `adjustmentType` | `adjustmentType` | ✅ Đầy đủ |
| `paymentStatus` | `paymentStatus` | ✅ Đầy đủ |
| `cusGetInvoiceRight` | `cusGetInvoiceRight` | ✅ Đầy đủ |
| `invoiceIssuedDate` | `invoiceIssuedDate` | ✅ Đầy đủ |
| `buyerName` | `buyerName` | ✅ Đầy đủ |
| `buyerLegalName` | `buyerLegalName` | ✅ Đầy đủ |
| `buyerTaxCode` | `buyerTaxCode` | ✅ Đầy đủ |
| `buyerAddressLine` | `buyerAddressLine` | ✅ Đầy đủ |
| `buyerPhoneNumber` | `buyerPhoneNumber` | ✅ Đầy đủ |
| `buyerEmail` | `buyerEmail` | ✅ Đầy đủ |
| `buyerIdNo` | `buyerIdNo` | ✅ Đầy đủ |
| `buyerIdType` | `buyerIdType` | ✅ Đầy đủ |
| `buyerNotGetInvoice` | `buyerNotGetInvoice` | ✅ Đầy đủ |
| `sumOfTotalLineAmountWithoutTax` | `sumOfTotalLineAmountWithoutTax` | ✅ Đầy đủ |
| `totalAmountWithoutTax` | `totalAmountWithoutTax` | ✅ Đầy đủ |
| `totalTaxAmount` | `totalTaxAmount` | ✅ Đầy đủ |
| `totalAmountWithTax` | `totalAmountWithTax` | ✅ Đầy đủ |
| `totalAmountWithTaxInWords` | `totalAmountWithTaxInWords` | ✅ Đầy đủ |
| `discountAmount` | `discountAmount` | ✅ Đầy đủ |
| `supplierTaxCode` | `supplierTaxCode` | ✅ Response |
| `invoiceNo` | `invoiceNo` | ✅ Response |
| `reservationCode` | `reservationCode` | ✅ Response |

#### Các trường THIẾU ❌

| Trường S-Invoice API | Mô tả | Mức độ quan trọng |
|---------------------|-------|-------------------|
| `sellerLegalName` | Tên doanh nghiệp người bán | ⚠️ Trung bình (có thể lấy từ config) |
| `sellerAddressLine` | Địa chỉ người bán | ⚠️ Trung bình |
| `sellerPhoneNumber` | SĐT người bán | 🔵 Thấp |
| `sellerEmail` | Email người bán | 🔵 Thấp |
| `sellerBankName` | Tên ngân hàng | 🔵 Thấp |
| `sellerBankAccount` | Số tài khoản | 🔵 Thấp |
| `buyerBankName` | Ngân hàng người mua | 🔵 Thấp |
| `buyerBankAccount` | Số TK người mua | 🔵 Thấp |
| `adjustmentInvoiceType` | Loại HD điều chỉnh | ⚠️ Trung bình |
| `originalInvoiceId` | HD gốc (điều chỉnh) | ⚠️ Trung bình |
| `originalInvoiceIssueDate` | Ngày HD gốc | ⚠️ Trung bình |
| `additionalReferenceDesc` | Văn bản thỏa thuận | 🔵 Thấp |
| `additionalReferenceDate` | Ngày văn bản | 🔵 Thấp |

### 2.2 MktSInvoiceItemWorkspaceEntity (Chi Tiết Hàng Hóa)

#### Trạng thái: ✅ Đạt yêu cầu (95%)

| Trường S-Invoice API | Trường Entity | Trạng thái |
|---------------------|---------------|------------|
| `lineNumber` | `lineNumber` | ✅ |
| `selection` | `selection` | ✅ |
| `itemCode` | `itemCode` | ✅ |
| `itemName` | `itemName` | ✅ |
| `unitName` | `unitName` | ✅ |
| `quantity` | `quantity` | ✅ |
| `unitPrice` | `unitPrice` | ✅ |
| `itemTotalAmountWithoutTax` | `itemTotalAmountWithoutTax` | ✅ |
| `taxPercentage` | `taxPercentage` | ✅ |
| `taxAmount` | `taxAmount` | ✅ |
| `discount` | `discount` | ✅ |
| `itemDiscount` | `itemDiscount` | ✅ |
| `itemNote` | `itemNote` | ✅ |
| `isIncreaseItem` | `isIncreaseItem` | ✅ |
| `itemTotalAmountAfterDiscount` | `itemTotalAmountAfterDiscount` | ✅ (Bonus) |
| `itemTotalAmountWithTax` | `itemTotalAmountWithTax` | ✅ (Bonus) |

### 2.3 MktSInvoiceTaxBreakdownWorkspaceEntity (Tổng Hợp Thuế)

#### Trạng thái: ✅ Đạt yêu cầu (100%)

| Trường S-Invoice API | Trường Entity | Trạng thái |
|---------------------|---------------|------------|
| `taxPercentage` | `taxPercentage` | ✅ |
| `taxableAmount` | `taxableAmount` | ✅ |
| `taxAmount` | `taxAmount` | ✅ |

**Lưu ý:** Thiếu `taxableAmountPos` và `taxAmountPos` (boolean cho dấu +/-) nhưng ít dùng.

### 2.4 MktSInvoicePaymentWorkspaceEntity (Phương Thức Thanh Toán)

#### Trạng thái: ⚠️ Cần bổ sung (70%)

| Trường S-Invoice API | Trường Entity | Trạng thái |
|---------------------|---------------|------------|
| `paymentMethodName` | `paymentMethodName` | ✅ |
| `paymentMethod` | ❌ THIẾU | ❌ Cần thêm mã (1-5) |

**Mapping paymentMethod theo S-Invoice:**
- `1` = TM (Tiền mặt)
- `2` = CK (Chuyển khoản)
- `3` = TM/CK
- `4` = DTCN (Đối trừ công nợ)
- `5` = KHAC

### 2.5 MktSInvoiceMetadataWorkspaceEntity

#### Trạng thái: ✅ Đạt yêu cầu (100%)

Hỗ trợ đầy đủ custom metadata với key-value pairs.

### 2.6 MktSInvoiceAuthWorkspaceEntity

#### Trạng thái: ✅ Đạt yêu cầu (100%)

Lưu trữ thông tin xác thực với S-Invoice API.

### 2.7 MktSInvoiceFileWorkspaceEntity

#### Trạng thái: ✅ Đạt yêu cầu (100%)

Lưu trữ file hóa đơn (PDF, ZIP) đầy đủ.

---

## 3. Phân Tích API Integration Service

### 3.1 Các API ĐÃ TRIỂN KHAI ✅

| API | Method | Trạng thái | File |
|-----|--------|------------|------|
| `createInvoice` | POST | ✅ Hoàn thành | `s-invoice.integration.service.ts:191` |
| `getInvoiceFile` | POST | ✅ Hoàn thành | `s-invoice.integration.service.ts:383` |
| `getInvoiceFileById` | Internal | ✅ Hoàn thành | `s-invoice.integration.service.ts:475` |

### 3.2 Các API CHƯA TRIỂN KHAI ❌

| API | Method | Endpoint | Mức độ ưu tiên |
|-----|--------|----------|----------------|
| `createDraftInvoice` | POST | `/InvoiceAPI/InvoiceWS/createDraftInvoice/{taxCode}` | 🔴 Cao |
| `previewDraftInvoice` | POST | `/InvoiceAPI/InvoiceWS/previewDraftInvoice/{taxCode}` | 🔴 Cao |
| `cancelInvoice` | POST | `/InvoiceAPI/InvoiceWS/cancelInvoice` | 🔴 Cao |
| `getInvoiceByTransactionUuid` | GET | `/InvoiceAPI/InvoiceWS/getInvoiceByTransactionUuid` | ⚠️ Trung bình |
| `getInvoicesByDateRange` | GET | `/InvoiceAPI/InvoiceWS/getInvoicesByDateRange` | ⚠️ Trung bình |
| `getInvoiceTemplates` | GET | `/InvoiceAPI/InvoiceWS/getInvoiceTemplates` | 🔵 Thấp |
| `login (Token Auth)` | POST | `/auth/login` | ⚠️ Trung bình (hiện dùng Basic Auth) |

### 3.3 Phân Tích Xác Thực

**Hiện tại:** Sử dụng Basic Authentication + Cookie
```typescript
// s-invoice.integration.service.ts:196-205
const basicAuth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Basic ${basicAuth}`,
  Cookie: this.cookieToken,
};
```

**Theo tài liệu S-Invoice:** Nên sử dụng Token-based Authentication
```typescript
// Cần bổ sung
POST /auth/login -> access_token
Cookie: access_token=<token>
```

---

## 4. Phân Tích Luồng Nghiệp Vụ

### 4.1 Luồng ĐÃ TRIỂN KHAI ✅

| Luồng | Mô tả | File |
|-------|-------|------|
| Tạo hóa đơn từ Order | Pre-hook tính toán dữ liệu từ OrderItems | `hooks/mkt-sinvoice-create-one.pre-query.hook.ts` |
| Tạo SInvoice Items tự động | Post-hook tạo Items, TaxBreakdowns, Payments | `hooks/mkt-sinvoice-create-one.post-query.hook.ts` |
| Sync hóa đơn lên S-Invoice | Job xử lý background | `jobs/s-invoice-integration.job.ts` |
| Lấy file hóa đơn | Controller REST API | `controllers/invoice-file.controller.ts` |
| Chuyển số thành chữ | Tiếng Việt | `hooks/mkt-sinvoice-create-one.pre-query.hook.ts:186-253` |

### 4.2 Luồng CHƯA TRIỂN KHAI ❌

| Luồng | Mô tả | Ưu tiên |
|-------|-------|---------|
| Tạo hóa đơn nháp | Preview trước khi phát hành | 🔴 Cao |
| Hủy hóa đơn | Cancel invoice đã phát hành | 🔴 Cao |
| Điều chỉnh hóa đơn | Tạo HD điều chỉnh (adjustmentType=5) | 🔴 Cao |
| Thay thế hóa đơn | Tạo HD thay thế (adjustmentType=3) | 🔴 Cao |
| Tra cứu theo UUID | Kiểm tra trạng thái HD | ⚠️ Trung bình |
| Tra cứu theo thời gian | Báo cáo HD theo khoảng ngày | ⚠️ Trung bình |
| Cơ chế retry | Retry khi timeout/lỗi mạng | ⚠️ Trung bình |
| Token refresh | Tự động refresh access_token | ⚠️ Trung bình |

---

## 5. Phân Tích Xử Lý Lỗi

### 5.1 Xử Lý Lỗi ĐÃ CÓ ✅

```typescript
// s-invoice.integration.service.ts
sInvoiceUpdate = {
  errorCode: errMsg?.code != null ? String(errMsg.code) : undefined,
  errorMessage: errMsg?.message,
  errorData: errMsg?.data != null ? JSON.stringify(errMsg.data) : undefined,
  orderSInvoiceStatus: ORDER_SINVOICE_STATUS.FAILED,
};
```

### 5.2 Xử Lý Lỗi CẦN BỔ SUNG ❌

| Mã lỗi S-Invoice | Mô tả | Cách xử lý đề xuất |
|------------------|-------|-------------------|
| `AUTH_001` | Token hết hạn | Tự động refresh token |
| `INV_001` | Trùng transactionUuid | Tra cứu HD hiện có |
| `INV_002` | Sai định dạng | Validate trước khi gửi |
| `INV_003` | Thiếu trường bắt buộc | Validate input |
| `INV_005` | Lỗi tính toán tiền | Kiểm tra MoneyUtils |
| `INV_006` | Lỗi thuế suất | Validate taxBreakdowns |

---

## 6. Đánh Giá Kiến Trúc

### 6.1 Điểm Mạnh ✅

1. **WorkspaceEntity Pattern**: Tuân theo chuẩn Twenty CRM
2. **MoneyUtils**: Sử dụng thư viện tính toán tiền chính xác
3. **Hook System**: Pre/Post hooks xử lý tự động
4. **Background Job**: Xử lý bất đồng bộ với BullMQ
5. **Relation Design**: Quan hệ rõ ràng giữa các entities
6. **File Management**: Entity riêng cho quản lý file

### 6.2 Điểm Cần Cải Thiện ⚠️

1. **Token Management**: Chuyển từ Basic Auth sang Token Auth với auto-refresh
2. **Draft Invoice Flow**: Thiếu luồng xem trước/duyệt hóa đơn
3. **Error Handling**: Cần mapping chi tiết mã lỗi S-Invoice
4. **Retry Mechanism**: Thiếu cơ chế retry cho API calls
5. **Validation Layer**: Cần validate dữ liệu trước khi gửi API
6. **Seller Info**: Thiếu entity hoặc config cho thông tin người bán

---

## 7. Khuyến Nghị

### 7.1 Ưu Tiên Cao (Cần làm ngay) 🔴

1. **Bổ sung API `createDraftInvoice`**
   - Cho phép preview hóa đơn trước khi phát hành
   - Giảm rủi ro phát hành hóa đơn sai

2. **Bổ sung API `cancelInvoice`**
   - Cho phép hủy hóa đơn đã phát hành
   - Tuân thủ quy định thuế

3. **Bổ sung luồng Điều chỉnh/Thay thế**
   - Thêm fields: `adjustmentInvoiceType`, `originalInvoiceId`, `originalInvoiceIssueDate`
   - Implement logic cho adjustmentType = 3, 5, 7

4. **Thêm field `paymentMethod`** vào MktSInvoicePaymentWorkspaceEntity
   ```typescript
   @WorkspaceField({
     type: FieldMetadataType.NUMBER,
     label: msg`Payment Method Code`,
   })
   paymentMethod?: number; // 1-5
   ```

### 7.2 Ưu Tiên Trung Bình ⚠️

5. **Chuyển sang Token Authentication**
   - Implement login API
   - Auto-refresh token trước khi hết hạn

6. **Bổ sung Seller Info Config**
   - Tạo entity `MktSInvoiceSellerConfigWorkspaceEntity`
   - Hoặc lấy từ Organization settings

7. **Implement API tra cứu**
   - `getInvoiceByTransactionUuid`: Kiểm tra trạng thái sau khi timeout
   - `getInvoicesByDateRange`: Báo cáo hóa đơn

8. **Error Handling Enhancement**
   - Mapping mã lỗi S-Invoice
   - Retry mechanism với exponential backoff

### 7.3 Ưu Tiên Thấp 🔵

9. **Bổ sung fields cho buyer bank info**
10. **Implement `getInvoiceTemplates` API**
11. **Thêm `taxableAmountPos`, `taxAmountPos` cho TaxBreakdown**

---

## 8. Kết Luận

### 8.1 Mức Độ Sẵn Sàng

| Khía cạnh | Sẵn sàng | Ghi chú |
|-----------|----------|---------|
| Tạo hóa đơn cơ bản | ✅ Có | Đã hoạt động |
| Tích hợp API Viettel | ⚠️ Một phần | Cần bổ sung APIs |
| Luồng điều chỉnh/hủy | ❌ Chưa | Cần implement |
| Production ready | ⚠️ Một phần | Cần testing + bổ sung |

### 8.2 Effort Ước Tính

| Task | Effort |
|------|--------|
| Bổ sung APIs (draft, cancel, adjust) | 3-5 ngày |
| Token Auth + auto-refresh | 1-2 ngày |
| Error handling enhancement | 1-2 ngày |
| Seller info config | 1 ngày |
| Testing & QA | 2-3 ngày |
| **Tổng cộng** | **8-13 ngày** |

---

## Phụ Lục

### A. File Structure Hiện Tại

```
mkt-core/invoice/
├── controllers/
│   └── invoice-file.controller.ts
├── hooks/
│   ├── mkt-sinvoice-create-one.pre-query.hook.ts
│   ├── mkt-sinvoice-create-one.post-query.hook.ts
│   ├── mkt-sinvoice-file-create-one.pre-query.hook.ts
│   └── mkt-sinvoice-file-update-one.pre-query.hook.ts
├── integration/
│   └── s-invoice.integration.service.ts
├── jobs/
│   └── s-invoice-integration.job.ts
├── objects/
│   ├── mkt-invoice.workspace-entity.ts
│   ├── mkt-sinvoice.workspace-entity.ts
│   ├── mkt-sinvoice-auth.workspace-entity.ts
│   ├── mkt-sinvoice-file.workspace-entity.ts
│   ├── mkt-sinvoice-item.workspace-entity.ts
│   ├── mkt-sinvoice-metadata.workspace-entity.ts
│   ├── mkt-sinvoice-payment.workspace-entity.ts
│   └── mkt-sinvoice-tax-breakdown.workspace-entity.ts
├── invoice.constants.ts
├── mkt-invoice.middleware.ts
├── mkt-invoice.module.ts
├── mkt-invoice.service.ts
└── s-invoice.integration.service.ts
```

### B. Environment Variables Cần Thiết

```bash
S_INVOICE_BASE_URL=https://api-vinvoice.viettel.vn
S_INVOICE_TAX_CODE=0100109106-507
S_INVOICE_USERNAME=0100109106-507
S_INVOICE_PASSWORD=******
S_INVOICE_COOKIE=access_token=...
```

---

**Người đánh giá:** Claude Code
**Cập nhật lần cuối:** 2025-12-21
