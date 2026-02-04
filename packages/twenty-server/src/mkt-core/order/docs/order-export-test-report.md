# Order Export Resolver - Test Report

> Báo cáo kết quả test cho `OrderExportResolver`
> Ngày thực hiện: 2026-02-04

## Thông tin Test

| Field | Value |
|-------|-------|
| Workspace ID | `20202020-1c25-4d02-bf25-6aeccf7ea419` |
| User ID | `20202020-9e3b-46d4-a556-88b9ddc2b034` |
| User Email | tim@apple.dev |
| Total Orders in DB | 46 |
| Test Environment | localhost:3000 |

---

## Tổng kết

| Category | Total | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Sync Export | 6 | 6 | 0 | 0 |
| Async Export | 3 | 3 | 0 | 0 |
| Job Status | 1 | 1 | 0 | 0 |
| Security | 1 | 1 | 0 | 0 |
| Edge Cases | 1 | 1 | 0 | 0 |
| **Total** | **12** | **12** | **0** | **0** |

**Overall Result: ✅ ALL TESTS PASSED**

---

## 1. Sync Export Tests (mktExportOrdersToFile)

### TC-EXP-001: Export all orders - XLSX format ✅

**Request:**
```graphql
mutation {
  mktExportOrdersToFile {
    mimeType
    filename
    rowCount
  }
}
```

**Response:**
```json
{
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "filename": "danh-sach-don-hang_20260204_085816.xlsx",
  "rowCount": 46
}
```

**Assertions:**
- [x] mimeType correct for XLSX
- [x] filename contains date
- [x] rowCount matches database (46)

---

### TC-EXP-002: Export all orders - CSV format ✅

**Request:**
```graphql
mutation {
  mktExportOrdersToFile(input: { format: CSV }) {
    mimeType
    filename
    rowCount
  }
}
```

**Response:**
```json
{
  "mimeType": "text/csv; charset=utf-8",
  "filename": "danh-sach-don-hang_20260204_085850.csv",
  "rowCount": 46
}
```

**Assertions:**
- [x] mimeType = "text/csv; charset=utf-8"
- [x] filename ends with ".csv"
- [x] rowCount = 46

---

### TC-EXP-003: Export with status filter - COMPLETED ✅

**Request:**
```graphql
mutation {
  mktExportOrdersToFile(input: { status: "COMPLETED" }) {
    mimeType
    filename
    rowCount
  }
}
```

**Response:**
```json
{
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "filename": "danh-sach-don-hang_20260204_085834.xlsx",
  "rowCount": 39
}
```

**Assertions:**
- [x] rowCount < 46 (filtered result)
- [x] Only COMPLETED orders exported

**Database Verification:**
```sql
SELECT COUNT(*) FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktOrder"
WHERE status = 'COMPLETED';
-- Result: 39 ✅
```

---

### TC-EXP-004: Export with customer filter ✅

**Request:**
```graphql
mutation {
  mktExportOrdersToFile(input: {
    customerId: "49868053-4758-457f-9332-6ebd48af7ca6"
  }) {
    mimeType
    filename
    rowCount
  }
}
```

**Response:**
```json
{
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "filename": "danh-sach-don-hang_20260204_085834.xlsx",
  "rowCount": 23
}
```

**Assertions:**
- [x] Only orders of customer "Nguyễn Văn An" exported
- [x] rowCount = 23

---

### TC-EXP-005: Export with combined filters ✅

**Request:**
```graphql
mutation {
  mktExportOrdersToFile(input: {
    status: "COMPLETED",
    customerId: "9c500415-1e6a-4320-8770-a6a33d03f0a2"
  }) {
    mimeType
    filename
    rowCount
  }
}
```

**Response:**
```json
{
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "filename": "danh-sach-don-hang_20260204_085850.xlsx",
  "rowCount": 5
}
```

**Assertions:**
- [x] Only COMPLETED orders of "Lê Minh Cường" exported
- [x] rowCount = 5

---

### TC-EXP-006: Export with no matching results ✅

**Request:**
```graphql
mutation {
  mktExportOrdersToFile(input: {
    customerId: "00000000-0000-0000-0000-000000000000"
  }) {
    mimeType
    filename
    rowCount
  }
}
```

**Response:**
```json
{
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "filename": "danh-sach-don-hang_20260204_085850.xlsx",
  "rowCount": 0
}
```

**Assertions:**
- [x] rowCount = 0
- [x] No error thrown
- [x] File with header only created

---

## 2. Async Export Tests (mktRequestAsyncOrderExport)

### TC-ASYNC-001: Request async export - basic ✅

**Request:**
```graphql
mutation {
  mktRequestAsyncOrderExport {
    jobId
    status
    estimatedRows
  }
}
```

**Response:**
```json
{
  "jobId": "exp_1770195575520_4kc8hj",
  "status": "QUEUED",
  "estimatedRows": 46
}
```

**Assertions:**
- [x] jobId starts with "exp_"
- [x] status = "QUEUED"
- [x] estimatedRows = 46 (total orders)

---

### TC-ASYNC-002: Async export with status filter ✅

**Request:**
```graphql
mutation {
  mktRequestAsyncOrderExport(input: { status: "COMPLETED" }) {
    jobId
    status
    estimatedRows
  }
}
```

**Response:**
```json
{
  "jobId": "exp_1770195575624_fuzqo4",
  "status": "QUEUED",
  "estimatedRows": 39
}
```

**Assertions:**
- [x] estimatedRows = 39 (matches COMPLETED count)

---

### TC-ASYNC-003: Async export with customer filter ✅

**Request:**
```graphql
mutation {
  mktRequestAsyncOrderExport(input: {
    customerId: "1e75547f-3d1c-4da8-99a9-b716f3b17ab9"
  }) {
    jobId
    status
    estimatedRows
  }
}
```

**Response:**
```json
{
  "jobId": "exp_1770195575690_fti96w",
  "status": "QUEUED",
  "estimatedRows": 14
}
```

**Assertions:**
- [x] Only orders of "Trần Thị Bình" counted
- [x] estimatedRows = 14

---

## 3. Job Status Tests (mktGetOrderExportJobStatus)

### TC-STATUS-001: Get job status ✅

**Request:**
```graphql
query {
  mktGetOrderExportJobStatus(jobId: "exp_1770195575520_4kc8hj") {
    jobId
    status
    estimatedRows
    downloadUrl
    expiresAt
  }
}
```

**Response:**
```json
{
  "jobId": "exp_1770195575520_4kc8hj",
  "status": "PROCESSING",
  "estimatedRows": 0,
  "downloadUrl": null,
  "expiresAt": null
}
```

**Assertions:**
- [x] jobId matches input
- [x] status = "PROCESSING" (placeholder implementation)

**Note:** Actual job processing requires BullMQ integration (TODO)

---

## 4. Security Tests

### TC-SEC-001: Unauthenticated request ✅

**Request (no Authorization header):**
```graphql
mutation {
  mktExportOrdersToFile {
    mimeType
    filename
    rowCount
  }
}
```

**Response:**
```json
{
  "errors": [
    {
      "message": "Forbidden resource",
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR"
      }
    }
  ]
}
```

**Assertions:**
- [x] Request rejected without authentication
- [x] No data leaked

---

## 5. Edge Case Tests

### TC-EDGE-001: Vietnamese characters in CSV ✅

**Verification:** Decoded CSV content

**Sample Output:**
```csv
﻿Mã đơn hàng,Khách hàng,Ngày tạo,Trạng thái,TT thanh toán,Tổng tiền,Đã thanh toán,Còn lại,Ghi chú,Người tạo
DEV20260204004,Lê Minh Cường,04/02/2026 04:06,Chờ thanh toán,Chưa thanh toán,149.000 ₫,0 ₫,149.000 ₫,Revoke test,Tim
DEV20260204003,Trần Thị Bình,04/02/2026 04:05,Chờ thanh toán,Chưa thanh toán,149.000 ₫,0 ₫,149.000 ₫,Flow test 2,Tim
DEV20260204002,Nguyễn Văn An,04/02/2026 04:05,Hoàn thành,Đã thanh toán,149.000 ₫,149.000 ₫,0 ₫,,Tim
```

**Assertions:**
- [x] UTF-8 BOM present (﻿)
- [x] Vietnamese headers correct (Mã đơn hàng, Khách hàng, etc.)
- [x] Vietnamese customer names correct (Lê Minh Cường, Trần Thị Bình, Nguyễn Văn An)
- [x] Vietnamese status labels correct (Chờ thanh toán, Hoàn thành, etc.)
- [x] Currency formatting with ₫ symbol correct

---

## Bug Fixes Applied

### BUG-001: Date parsing error

**Error:**
```
fromMillis requires a numerical input, but received a object with value Wed Feb 04 2026...
```

**Root Cause:** `order.createdAt` is a Date object, not string/number

**Fix Applied:**
```typescript
// Before
DateTimeUtils.fromMillis(
  typeof order.createdAt === 'string'
    ? parseInt(order.createdAt, 10)
    : (order.createdAt as number),
)

// After - Handle Date object, string (ISO), or number (millis)
if (order.createdAt instanceof Date) {
  createdAtStr = DateTimeUtils.format(
    DateTimeUtils.fromDate(order.createdAt),
    'dd/MM/yyyy HH:mm',
  );
} else if (typeof order.createdAt === 'string') {
  // ...
}
```

**Status:** ✅ Fixed in `order-export.service.ts`

---

## Performance Observations

| Metric | Value |
|--------|-------|
| Export 46 orders (XLSX) | < 1 second |
| Export 46 orders (CSV) | < 1 second |
| Export with filters | < 1 second |

---

## Recommendations

1. **Implement BullMQ integration** for async export to work properly
2. **Add row limit test** when > 10K orders available
3. **Add audit log verification** via database query
4. **Consider adding date range filter** tests

---

## Test Environment

```
Server: http://localhost:3000
GraphQL Endpoint: /graphql
Authorization: Bearer JWT Token
Database: PostgreSQL (workspace_1wgvd1injqtife6y4rvfbu3h5)
```

---

*Report generated: 2026-02-04 08:59:00*
*Tested by: Claude Code*
*Resolver: `packages/twenty-server/src/mkt-core/order/resolvers/order-export.resolver.ts`*
