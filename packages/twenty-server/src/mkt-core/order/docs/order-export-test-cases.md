# Order Export Resolver - Test Cases

> Test cases cho `OrderExportResolver` với dữ liệu thật từ database

## Thông tin Database

### Workspace & User

| Field | Value |
|-------|-------|
| Workspace ID | `20202020-1c25-4d02-bf25-6aeccf7ea419` |
| Workspace Name | MKT CRM |
| User ID (Admin) | `55e0f574-7da7-57cf-aff1-5ab465067bc4` |
| User Email | admin@mkt.dev |

### Order Statistics

| Metric | Value |
|--------|-------|
| Total Orders | 46 |
| Status Values | COMPLETED, PENDING_PAYMENT, PROCESSING, LOCKED |
| Payment Status Values | PAID, PENDING |

### Sample Customers

| ID | Name |
|----|------|
| `49868053-4758-457f-9332-6ebd48af7ca6` | Nguyễn Văn An |
| `1e75547f-3d1c-4da8-99a9-b716f3b17ab9` | Trần Thị Bình |
| `9c500415-1e6a-4320-8770-a6a33d03f0a2` | Lê Minh Cường |

### Sample Orders

| Order Code | Status | Payment Status | Total Amount |
|------------|--------|----------------|--------------|
| DEV20260204004 | PENDING_PAYMENT | PENDING | 149,000 |
| DEV20260204002 | COMPLETED | PAID | 149,000 |
| MKT-TUBE-2024-005 | COMPLETED | PAID | 9,900,000 |
| MKT-UID-2024-003 | COMPLETED | PENDING | 6,600,000 |

---

## 1. mktExportOrdersToFile (Sync Export)

### TC-EXP-001: Export all orders (no filter) - XLSX format

**Precondition**: User authenticated, workspace có 46 orders

**GraphQL Request**:
```graphql
mutation {
  mktExportOrdersToFile {
    content
    mimeType
    filename
    rowCount
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "mktExportOrdersToFile": {
      "content": "<base64-encoded-xlsx>",
      "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "filename": "danh-sach-don-hang_2026-02-04.xlsx",
      "rowCount": 46
    }
  }
}
```

**Assertions**:
- [ ] `content` is valid Base64 string
- [ ] `mimeType` = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
- [ ] `filename` contains current date
- [ ] `rowCount` = 46 (total orders in database)
- [ ] Audit log được tạo với action = EXPORT_ORDERS

---

### TC-EXP-002: Export all orders - CSV format

**GraphQL Request**:
```graphql
mutation {
  mktExportOrdersToFile(input: { format: csv }) {
    content
    mimeType
    filename
    rowCount
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "mktExportOrdersToFile": {
      "content": "<base64-encoded-csv>",
      "mimeType": "text/csv",
      "filename": "danh-sach-don-hang_2026-02-04.csv",
      "rowCount": 46
    }
  }
}
```

**Assertions**:
- [ ] `mimeType` = "text/csv"
- [ ] `filename` ends with ".csv"
- [ ] Decoded content has UTF-8 BOM for Vietnamese support
- [ ] CSV has header row với columns: Mã đơn hàng, Khách hàng, Ngày tạo, Trạng thái, TT thanh toán, Tổng tiền, Đã thanh toán, Còn lại, Ghi chú, Người tạo

---

### TC-EXP-003: Export with status filter - COMPLETED only

**GraphQL Request**:
```graphql
mutation {
  mktExportOrdersToFile(input: { status: "COMPLETED" }) {
    content
    mimeType
    filename
    rowCount
  }
}
```

**Expected Response**:
- `rowCount` < 46 (only COMPLETED orders)

**Assertions**:
- [ ] All exported orders have status = COMPLETED
- [ ] Verify against database:
  ```sql
  SELECT COUNT(*) FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktOrder"
  WHERE status = 'COMPLETED'
  ```

---

### TC-EXP-004: Export with customer filter

**GraphQL Request**:
```graphql
mutation {
  mktExportOrdersToFile(input: {
    customerId: "49868053-4758-457f-9332-6ebd48af7ca6"
  }) {
    content
    mimeType
    filename
    rowCount
  }
}
```

**Expected Response**:
- Only orders of customer "Nguyễn Văn An"

**Assertions**:
- [ ] All exported orders belong to customer ID `49868053-4758-457f-9332-6ebd48af7ca6`
- [ ] Verify against database:
  ```sql
  SELECT COUNT(*) FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktOrder"
  WHERE "mktCustomerId" = '49868053-4758-457f-9332-6ebd48af7ca6'
  ```

---

### TC-EXP-005: Export with combined filters

**GraphQL Request**:
```graphql
mutation {
  mktExportOrdersToFile(input: {
    status: "COMPLETED",
    customerId: "9c500415-1e6a-4320-8770-a6a33d03f0a2",
    format: xlsx
  }) {
    content
    mimeType
    filename
    rowCount
  }
}
```

**Expected Response**:
- Only COMPLETED orders of customer "Lê Minh Cường"

**Assertions**:
- [ ] `rowCount` matches combined filter count
- [ ] Verify against database:
  ```sql
  SELECT COUNT(*) FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktOrder"
  WHERE status = 'COMPLETED'
  AND "mktCustomerId" = '9c500415-1e6a-4320-8770-a6a33d03f0a2'
  ```

---

### TC-EXP-006: Export with no matching results

**GraphQL Request**:
```graphql
mutation {
  mktExportOrdersToFile(input: {
    customerId: "00000000-0000-0000-0000-000000000000"
  }) {
    content
    mimeType
    filename
    rowCount
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "mktExportOrdersToFile": {
      "content": "<base64-with-header-only>",
      "rowCount": 0
    }
  }
}
```

**Assertions**:
- [ ] `rowCount` = 0
- [ ] File contains only header row
- [ ] No error thrown

---

### TC-EXP-007: Export validates sync row limit (> 10K rows)

**Precondition**: Cần mock hoặc seed > 10,000 orders

**GraphQL Request**:
```graphql
mutation {
  mktExportOrdersToFile {
    content
    rowCount
  }
}
```

**Expected Response**:
```json
{
  "errors": [
    {
      "message": "Dataset too large (15000 rows). Maximum for sync export is 10000 rows. Please use async export.",
      "extensions": {
        "code": "ROW_LIMIT_EXCEEDED"
      }
    }
  ]
}
```

**Assertions**:
- [ ] Error thrown when rowCount > SYNC_MAX_ROWS (10,000)
- [ ] Error message suggests using async export

---

## 2. mktRequestAsyncOrderExport (Async Export)

### TC-ASYNC-001: Request async export - basic

**GraphQL Request**:
```graphql
mutation {
  mktRequestAsyncOrderExport {
    jobId
    status
    estimatedRows
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "mktRequestAsyncOrderExport": {
      "jobId": "exp_1707019200000_abc123",
      "status": "QUEUED",
      "estimatedRows": 46
    }
  }
}
```

**Assertions**:
- [ ] `jobId` starts with "exp_"
- [ ] `jobId` contains timestamp
- [ ] `status` = "QUEUED"
- [ ] `estimatedRows` = 46 (matches total orders)
- [ ] Audit log created with action = EXPORT_ORDERS_ASYNC

---

### TC-ASYNC-002: Request async export with filter

**GraphQL Request**:
```graphql
mutation {
  mktRequestAsyncOrderExport(input: {
    status: "COMPLETED",
    format: csv
  }) {
    jobId
    status
    estimatedRows
  }
}
```

**Expected Response**:
- `estimatedRows` < 46 (only COMPLETED orders)

**Assertions**:
- [ ] `estimatedRows` matches filtered count
- [ ] Audit log contains filter information

---

### TC-ASYNC-003: Request async export with customer filter

**GraphQL Request**:
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

**Expected Response**:
- Only orders of customer "Trần Thị Bình"

**Assertions**:
- [ ] `estimatedRows` matches customer's order count
- [ ] Verify:
  ```sql
  SELECT COUNT(*) FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktOrder"
  WHERE "mktCustomerId" = '1e75547f-3d1c-4da8-99a9-b716f3b17ab9'
  ```

---

## 3. mktGetOrderExportJobStatus (Query Job Status)

### TC-STATUS-001: Get status of valid job ID

**GraphQL Request**:
```graphql
query {
  mktGetOrderExportJobStatus(jobId: "exp_1707019200000_abc123") {
    jobId
    status
    estimatedRows
    downloadUrl
    expiresAt
  }
}
```

**Expected Response** (placeholder implementation):
```json
{
  "data": {
    "mktGetOrderExportJobStatus": {
      "jobId": "exp_1707019200000_abc123",
      "status": "PROCESSING",
      "estimatedRows": 0,
      "downloadUrl": null,
      "expiresAt": null
    }
  }
}
```

**Assertions**:
- [ ] `jobId` matches input
- [ ] `status` is one of: QUEUED, PROCESSING, COMPLETED, FAILED

---

### TC-STATUS-002: Get status of completed job (future implementation)

**Note**: This test requires BullMQ integration

**Expected Response** (when completed):
```json
{
  "data": {
    "mktGetOrderExportJobStatus": {
      "jobId": "exp_1707019200000_abc123",
      "status": "COMPLETED",
      "estimatedRows": 46,
      "downloadUrl": "https://storage.example.com/exports/exp_xxx.xlsx",
      "expiresAt": "2026-02-05T12:00:00Z"
    }
  }
}
```

**Assertions**:
- [ ] `downloadUrl` is valid URL
- [ ] `expiresAt` is 24 hours from completion

---

### TC-STATUS-003: Get status of failed job (future implementation)

**Expected Response** (when failed):
```json
{
  "data": {
    "mktGetOrderExportJobStatus": {
      "jobId": "exp_1707019200000_abc123",
      "status": "FAILED",
      "estimatedRows": 0,
      "downloadUrl": null,
      "expiresAt": null,
      "error": "Out of memory error"
    }
  }
}
```

---

## 4. Security & Authentication Tests

### TC-SEC-001: Unauthenticated request

**Precondition**: No authentication token

**GraphQL Request**:
```graphql
mutation {
  mktExportOrdersToFile {
    content
  }
}
```

**Expected Response**:
```json
{
  "errors": [
    {
      "message": "Unauthorized",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

---

### TC-SEC-002: Cross-workspace data isolation

**Precondition**: User authenticated in Workspace A

**GraphQL Request**: Export orders

**Assertions**:
- [ ] Only orders from Workspace A are exported
- [ ] No orders from other workspaces leaked

---

### TC-SEC-003: Audit log verification

**After any export**:
```sql
-- Check audit log (application log or dedicated table)
-- Verify contains:
-- - userId
-- - workspaceId
-- - rowCount
-- - filter criteria
-- - format (xlsx/csv)
-- - timestamp
```

---

## 5. Edge Cases

### TC-EDGE-001: Special characters in customer name

**Precondition**: Orders with Vietnamese names (Nguyễn, Trần, etc.)

**Assertions**:
- [ ] Vietnamese characters exported correctly
- [ ] No encoding issues in Excel/CSV

---

### TC-EDGE-002: Large amounts formatting

**Test Data**: Order with `totalAmount` = 9,900,000

**Assertions**:
- [ ] Amount formatted as currency: "9.900.000 ₫"
- [ ] No floating point errors

---

### TC-EDGE-003: Null values handling

**Test Data**: Order with null `note` field

**Assertions**:
- [ ] Null exported as empty string
- [ ] No "null" string in output

---

### TC-EDGE-004: Date formatting

**Assertions**:
- [ ] `createdAt` formatted as "dd/MM/yyyy HH:mm"
- [ ] Timezone handled correctly

---

## 6. Performance Tests

### TC-PERF-001: Export 1000 orders

**Assertions**:
- [ ] Response time < 5 seconds
- [ ] Memory usage acceptable

---

### TC-PERF-002: Export with all filters

**Assertions**:
- [ ] Query optimization (no N+1)
- [ ] Response time < 3 seconds

---

## Test Execution Commands

### Run via GraphQL Playground

```
URL: http://localhost:3000/graphql
Authorization: Bearer <token>
```

### Verify Export Content

```bash
# Decode Base64 and check content
echo "<base64-content>" | base64 -d > export.xlsx

# For CSV, check UTF-8 BOM
file export.csv
# Expected: UTF-8 Unicode (with BOM) text
```

### Database Verification Queries

```sql
-- Total orders
SELECT COUNT(*) FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktOrder";

-- Orders by status
SELECT status, COUNT(*)
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktOrder"
GROUP BY status;

-- Orders by customer
SELECT c.name, COUNT(o.id) as order_count
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktOrder" o
JOIN workspace_1wgvd1injqtife6y4rvfbu3h5."mktCustomer" c ON o."mktCustomerId" = c.id
GROUP BY c.name;
```

---

## Test Summary

| Category | Total Tests | Priority |
|----------|-------------|----------|
| Sync Export (mktExportOrdersToFile) | 7 | High |
| Async Export (mktRequestAsyncOrderExport) | 3 | Medium |
| Job Status (mktGetOrderExportJobStatus) | 3 | Medium |
| Security | 3 | High |
| Edge Cases | 4 | Medium |
| Performance | 2 | Low |
| **Total** | **22** | |

---

*Generated: 2026-02-04*
*Resolver: `order-export.resolver.ts`*
*Database: workspace_1wgvd1injqtife6y4rvfbu3h5*
