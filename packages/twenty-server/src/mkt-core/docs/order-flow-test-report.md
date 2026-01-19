# Order Flow Test Report

> **Ngày thực hiện**: 2026-01-19
> **Thực hiện bởi**: Claude Code
> **Môi trường**: Development (localhost:3000)
> **Customer Test**: Nguyễn Văn An (ID: `49868053-4758-457f-9332-6ebd48af7ca6`, Tier: DIAMOND)

---

## 1. Tổng quan kết quả

| # | Test Case | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 1 | Tạo Order Draft | FAILED | Validation: thiếu externalProducts |
| 2 | Confirm Order với License | SKIPPED | Cần order DRAFT |
| 3 | Confirm Payment | **PASSED** | PROCESSING → COMPLETED |
| 4 | Unlock Order sau thanh toán muộn | **PASSED** | LOCKED → COMPLETED |
| 5 | Verify qua Database | **PASSED** | Xác nhận dữ liệu đúng |

### Tóm tắt
- **Passed**: 3/5 (60%)
- **Failed**: 1/5 (20%)
- **Skipped**: 1/5 (20%)

---

## 2. Chi tiết Test Cases

### Test Case 1: Tạo Order Draft

**Mục đích**: Tạo đơn hàng mới với trạng thái DRAFT

**Request**:
```graphql
mutation CreateOrderDraft {
  createOrderWithItems(input: {
    customerId: "49868053-4758-457f-9332-6ebd48af7ca6"
    action: NEW_ORDER
    isDraft: true
    externalProducts: []
    note: "Test order - Draft for report"
  }) {
    success
    orderId
    orderCode
    totalAmount
    error
  }
}
```

**Response**:
```json
{
  "data": {
    "createOrderWithItems": {
      "success": false,
      "orderId": null,
      "orderCode": null,
      "totalAmount": null,
      "error": "Validation failed: externalProducts: At least one external product is required"
    }
  }
}
```

**Kết quả**: FAILED

**Nguyên nhân**: API yêu cầu ít nhất 1 external product trong `externalProducts` array. Không thể tạo order rỗng.

**Đề xuất**:
- Cần có danh sách externalMktProductId và externalMktPackageId hợp lệ từ MKT Server
- Hoặc cần seed data cho products trong môi trường test

---

### Test Case 2: Confirm Order với License

**Mục đích**: Chuyển DRAFT → PROCESSING, tạo license với status PENDING_PAYMENT

**Kết quả**: SKIPPED

**Lý do**: Không có order với status DRAFT để test. Test Case 1 thất bại nên không có order để confirm.

---

### Test Case 3: Confirm Payment

**Mục đích**: Xác nhận thanh toán, chuyển PROCESSING → COMPLETED

**Order sử dụng**: `c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab` (MKT-PROC-2024-038)

**Request**:
```graphql
mutation ConfirmPayment {
  confirmOrderPayment(input: {
    orderId: "c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab"
    paymentMethod: "BANK_TRANSFER"
    amount: 16500000
    transactionId: "TXN-TEST-001"
    note: "Test payment confirmation"
  }) {
    success
    orderId
    orderCode
    previousStatus
    newStatus
    licensesActivated
    message
    error
  }
}
```

**Response**:
```json
{
  "data": {
    "confirmOrderPayment": {
      "success": true,
      "orderId": "c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab",
      "orderCode": "MKT-PROC-2024-038",
      "previousStatus": "PROCESSING",
      "newStatus": "COMPLETED",
      "licensesActivated": true,
      "message": "Payment confirmed and order completed",
      "error": null
    }
  }
}
```

**Kết quả**: **PASSED**

**Verification**:
- [x] `success` = `true`
- [x] `previousStatus` = `"PROCESSING"`
- [x] `newStatus` = `"COMPLETED"`
- [x] `licensesActivated` = `true`
- [x] `message` có nội dung xác nhận

---

### Test Case 4: Unlock Order sau thanh toán muộn

**Mục đích**: Chuyển LOCKED → COMPLETED sau khi nhận thanh toán muộn

**Order sử dụng**: `f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde` (MKT-LOCK-2024-041)

**Request**:
```graphql
mutation UnlockOrder {
  unlockOrderAfterPayment(input: {
    orderId: "f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde"
    amount: 5500000
    transactionId: "TXN-LATE-001"
    note: "Late payment received - test"
  }) {
    success
    orderId
    orderCode
    previousStatus
    newStatus
    unlockedAt
    message
    error
  }
}
```

**Response**:
```json
{
  "data": {
    "unlockOrderAfterPayment": {
      "success": true,
      "orderId": "f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde",
      "orderCode": "MKT-LOCK-2024-041",
      "previousStatus": "LOCKED",
      "newStatus": "COMPLETED",
      "unlockedAt": "2026-01-19T10:12:35.106Z",
      "message": "Order unlocked after late payment",
      "error": null
    }
  }
}
```

**Kết quả**: **PASSED**

**Verification**:
- [x] `success` = `true`
- [x] `previousStatus` = `"LOCKED"`
- [x] `newStatus` = `"COMPLETED"`
- [x] `unlockedAt` có giá trị timestamp
- [x] `message` có nội dung xác nhận

---

### Test Case 5: Database Verification

**Mục đích**: Xác nhận dữ liệu trong database sau khi test

**Query**:
```sql
SELECT id, "orderCode", status, "totalAmount", "paidAmount", "paymentStatus"
FROM mktOrder
WHERE id IN (
  'c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab',
  'f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde'
)
```

**Result**:

| Order Code | Status | Total Amount | Paid Amount | Payment Status |
|------------|--------|--------------|-------------|----------------|
| MKT-PROC-2024-038 | **COMPLETED** | 16,500,000 | 16,500,000 | PENDING |
| MKT-LOCK-2024-041 | **COMPLETED** | 5,500,000 | 5,500,000 | PENDING |

**Kết quả**: **PASSED**

**Lưu ý**: `paymentStatus` vẫn là `PENDING` mặc dù đã thanh toán xong. Có thể cần review logic cập nhật `paymentStatus` → `PAID` khi `paidAmount >= totalAmount`.

---

## 3. Issues phát hiện

### Issue 1: Validation yêu cầu externalProducts

**Severity**: Medium

**Mô tả**: Không thể tạo order draft rỗng (không có sản phẩm)

**Expected**: Có thể tạo order draft rỗng để thêm sản phẩm sau

**Actual**: Validation error "At least one external product is required"

**Đề xuất**:
- Review business requirement - có cần cho phép tạo draft rỗng không?
- Nếu cần, sửa validation rule

### Issue 2: paymentStatus không được cập nhật

**Severity**: Low

**Mô tả**: Sau khi thanh toán đủ (`paidAmount = totalAmount`), `paymentStatus` vẫn là `PENDING`

**Expected**: `paymentStatus` = `PAID` khi `paidAmount >= totalAmount`

**Actual**: `paymentStatus` = `PENDING`

**Đề xuất**: Review logic cập nhật `paymentStatus` trong các services:
- `confirmOrderPayment`
- `unlockOrderAfterPayment`

### Issue 3: GraphQL query disabled

**Severity**: Info

**Mô tả**: Standard query `mktOrders` bị disable với message "Use custom Order resolvers instead"

**Impact**: Không thể sử dụng standard GraphQL queries để verify, phải query database trực tiếp

**Đề xuất**: Document rõ các custom resolvers available cho client

---

## 4. State Transitions đã test

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATE TRANSITIONS TESTED                      │
└─────────────────────────────────────────────────────────────────┘

  Test Case 3:
  ┌────────────────┐     confirmOrderPayment     ┌────────────────┐
  │   PROCESSING   │ ─────────────────────────► │   COMPLETED    │
  └────────────────┘                             └────────────────┘

  Test Case 4:
  ┌────────────────┐   unlockOrderAfterPayment   ┌────────────────┐
  │     LOCKED     │ ─────────────────────────► │   COMPLETED    │
  └────────────────┘                             └────────────────┘
```

---

## 5. Test Coverage

### Mutations đã test

| Mutation | Tested | Result |
|----------|--------|--------|
| `createOrderWithItems` | Yes | Failed (validation) |
| `confirmOrderWithLicense` | No | - |
| `confirmOrderPayment` | Yes | **Passed** |
| `unlockOrderAfterPayment` | Yes | **Passed** |
| `updateOrderStatus` | No | - |
| `publishDraftOrder` | No | - |
| `refundOrder` | No | - |

### State Transitions đã test

| From | To | Tested | Result |
|------|----|--------|--------|
| DRAFT | PENDING_PAYMENT | No | - |
| DRAFT | PROCESSING | No | - |
| PROCESSING | COMPLETED | Yes | **Passed** |
| PROCESSING | LOCKED | No | - |
| LOCKED | COMPLETED | Yes | **Passed** |
| * | CANCELED | No | - |

---

## 6. Recommendations

### Immediate Actions

1. **Chuẩn bị test data**: Seed external products để có thể test full flow từ đầu
2. **Review paymentStatus logic**: Đảm bảo cập nhật đúng khi thanh toán xong

### Future Improvements

1. **Add integration tests**: Tự động test full flow với mock products
2. **Add more test cases**:
   - Cancel order từ các trạng thái khác nhau
   - Refund order (full và partial)
   - Trial flow
3. **Document custom resolvers**: Liệt kê rõ các queries/mutations available

---

## 7. Test Environment

```yaml
Server: http://localhost:3000
GraphQL Endpoint: /graphql
Database: PostgreSQL
Workspace Schema: workspace_1wgvd1injqtife6y4rvfbu3h5

Token Info:
  userId: 20202020-9e3b-46d4-a556-88b9ddc2b034
  workspaceId: 20202020-1c25-4d02-bf25-6aeccf7ea419
  type: ACCESS
  expires: 2026-03-04
```

---

## 8. Appendix: Raw Responses

### Test Case 3 - Full Response
```json
{
  "data": {
    "confirmOrderPayment": {
      "success": true,
      "orderId": "c1a2b3c4-d5e6-f7a8-b9c0-1234567890ab",
      "orderCode": "MKT-PROC-2024-038",
      "previousStatus": "PROCESSING",
      "newStatus": "COMPLETED",
      "licensesActivated": true,
      "message": "Payment confirmed and order completed",
      "error": null
    }
  }
}
```

### Test Case 4 - Full Response
```json
{
  "data": {
    "unlockOrderAfterPayment": {
      "success": true,
      "orderId": "f4d5e6f7-a8b9-c0d1-e2f3-4567890abcde",
      "orderCode": "MKT-LOCK-2024-041",
      "previousStatus": "LOCKED",
      "newStatus": "COMPLETED",
      "unlockedAt": "2026-01-19T10:12:35.106Z",
      "message": "Order unlocked after late payment",
      "error": null
    }
  }
}
```

---

*Report generated automatically by Claude Code on 2026-01-19*
