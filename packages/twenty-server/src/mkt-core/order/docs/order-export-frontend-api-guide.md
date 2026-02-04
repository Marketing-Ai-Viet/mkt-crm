# Order Export API - Frontend Developer Guide

## Overview

API GraphQL cho export danh sách đơn hàng ra file Excel (XLSX) hoặc CSV.

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Bearer Token (required)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         Frontend                                │
├────────────────────────────────────────────────────────────────┤
│  1. Call GraphQL mutation                                       │
│     mktExportOrdersToFile(input)                               │
│              │                                                  │
│              ▼                                                  │
│     Response: { downloadUrl, rowCount, expiresAt }             │
│              │                                                  │
│  2. Redirect/Navigate to downloadUrl                           │
│              │                                                  │
│              ▼                                                  │
│     GET /api/orders/export/:token                              │
│              │                                                  │
│              ▼                                                  │
│     Browser auto-downloads file                                │
└────────────────────────────────────────────────────────────────┘
```

**Flow:**
1. Frontend gọi GraphQL mutation với filter options
2. Backend tạo one-time token (TTL 5 phút), lưu vào Redis
3. Backend trả về `downloadUrl` chứa token
4. Frontend redirect đến URL đó
5. REST endpoint validate token, generate file, stream về browser
6. Token bị xóa sau khi sử dụng (one-time use)

---

## API Summary

| Operation | Type | Description |
|-----------|------|-------------|
| `mktExportOrdersToFile` | Mutation | Export theo filter (customerId, salesStaffId) |
| `mktExportOrdersByIds` | Mutation | Export theo danh sách order IDs đã chọn |
| `mktRequestAsyncOrderExport` | Mutation | Request async export cho dataset lớn (> 10K rows) |
| `mktGetOrderExportJobStatus` | Query | Check status của async job |

---

## Export Limits

| Limit | Value | Description |
|-------|-------|-------------|
| Sync Max Rows | 10,000 | Vượt ngưỡng → bắt buộc dùng async |
| Token TTL | 5 phút | URL hết hạn sau 5 phút |
| Token Usage | One-time | Token bị xóa sau khi download |

---

## Mutations

### 1. mktExportOrdersToFile (Sync Export)

Export danh sách đơn hàng. Trả về download URL để tải file trực tiếp.

**Mutation:**
```graphql
mutation MktExportOrdersToFile($input: ExportOrdersInput) {
  mktExportOrdersToFile(input: $input) {
    downloadUrl
    rowCount
    expiresAt
  }
}
```

**Variables - Export all (XLSX default):**
```json
{
  "input": null
}
```

**Variables - Export CSV:**
```json
{
  "input": {
    "format": "CSV"
  }
}
```

**Variables - With filters (by customerId):**
```json
{
  "input": {
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6",
    "format": "XLSX"
  }
}
```

**Variables - With filters (by salesStaffId):**
```json
{
  "input": {
    "salesStaffId": "staff-uuid-here",
    "format": "XLSX"
  }
}
```

**Response Success:**
```json
{
  "data": {
    "mktExportOrdersToFile": {
      "downloadUrl": "/api/orders/export/a1b2c3d4e5f6...",
      "rowCount": 46,
      "expiresAt": "2026-02-04T09:05:00.000Z"
    }
  }
}
```

---

### 2. mktExportOrdersByIds (Export by IDs)

Export đơn hàng theo danh sách IDs đã chọn (1 hoặc nhiều).

**Mutation:**
```graphql
mutation MktExportOrdersByIds($input: ExportOrdersByIdsInput!) {
  mktExportOrdersByIds(input: $input) {
    downloadUrl
    rowCount
    expiresAt
  }
}
```

**Variables - Export single order:**
```json
{
  "input": {
    "orderIds": ["uuid-1"],
    "format": "XLSX"
  }
}
```

**Variables - Export multiple orders:**
```json
{
  "input": {
    "orderIds": ["uuid-1", "uuid-2", "uuid-3"],
    "format": "XLSX"
  }
}
```

**Response Success:**
```json
{
  "data": {
    "mktExportOrdersByIds": {
      "downloadUrl": "/api/orders/export/a1b2c3d4e5f6...",
      "rowCount": 3,
      "expiresAt": "2026-02-04T09:05:00.000Z"
    }
  }
}
```

---

### 3. mktRequestAsyncOrderExport (Async Export)

Request async export cho dataset lớn. Trả về job ID để tracking.

**Mutation:**
```graphql
mutation MktRequestAsyncOrderExport($input: ExportOrdersInput) {
  mktRequestAsyncOrderExport(input: $input) {
    jobId
    status
    estimatedRows
  }
}
```

**Response Success:**
```json
{
  "data": {
    "mktRequestAsyncOrderExport": {
      "jobId": "exp_1770195575520_4kc8hj",
      "status": "QUEUED",
      "estimatedRows": 15000
    }
  }
}
```

---

## Queries

### 4. mktGetOrderExportJobStatus

Check status của async export job.

**Query:**
```graphql
query MktGetOrderExportJobStatus($jobId: String!) {
  mktGetOrderExportJobStatus(jobId: $jobId) {
    jobId
    status
    estimatedRows
    downloadUrl
    expiresAt
    error
  }
}
```

**Response - COMPLETED:**
```json
{
  "data": {
    "mktGetOrderExportJobStatus": {
      "jobId": "exp_1770195575520_4kc8hj",
      "status": "COMPLETED",
      "estimatedRows": 15000,
      "downloadUrl": "https://storage.example.com/exports/...",
      "expiresAt": "2026-02-05T08:58:00.000Z",
      "error": null
    }
  }
}
```

---

## REST Endpoint

### GET /api/orders/export/:token

Download file export với token từ GraphQL mutation.

**Request:**
```
GET /api/orders/export/a1b2c3d4e5f6789...
```

**Response:**
- **Success**: File stream với headers:
  - `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` hoặc `text/csv; charset=utf-8`
  - `Content-Disposition`: `attachment; filename="danh-sach-don-hang_20260204.xlsx"`

- **Error 401**: Token invalid hoặc expired
- **Error 404**: Export failed

---

## Input Types

### ExportOrdersInput

Dùng cho `mktExportOrdersToFile` - export theo filter.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `customerId` | String | No | - | Filter by customer ID |
| `salesStaffId` | String | No | - | Filter by sales staff ID |
| `format` | ExportFormat | No | `XLSX` | Export format |

### ExportOrdersByIdsInput

Dùng cho `mktExportOrdersByIds` - export theo danh sách IDs đã chọn.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `orderIds` | [String]! | **Yes** | - | Danh sách order IDs (bắt buộc) |
| `format` | ExportFormat | No | `XLSX` | Export format |

---

## Output Types

### ExportFileOutput

| Field | Type | Description |
|-------|------|-------------|
| `downloadUrl` | String | URL để download file (redirect đến URL này) |
| `rowCount` | Int | Số rows sẽ được export |
| `expiresAt` | String | Thời gian hết hạn của URL (ISO format) |

### AsyncExportOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `jobId` | String | No | Job ID để track progress |
| `status` | String | No | QUEUED, PROCESSING, COMPLETED, FAILED |
| `estimatedRows` | Int | No | Estimated row count |
| `downloadUrl` | String | Yes | Download URL khi COMPLETED |
| `expiresAt` | String | Yes | URL expiry time (ISO format) |
| `error` | String | Yes | Error message khi FAILED |

---

## Xử lý Download sau khi Fetch thành công

Sau khi gọi GraphQL mutation và nhận được `downloadUrl`, có 3 cách để trigger download:

### Cách 1: Redirect (Recommended - Auto Download)

```typescript
// Tự động download, không cần user click thêm
if (data?.mktExportOrdersToFile?.downloadUrl) {
  window.location.href = data.mktExportOrdersToFile.downloadUrl;
}
```

**Ưu điểm:** Đơn giản, browser tự xử lý download
**Nhược điểm:** Redirect khỏi trang hiện tại (nếu có unsaved state)

---

### Cách 2: Window.open (New Tab)

```typescript
// Mở tab mới để download, giữ nguyên trang hiện tại
if (data?.mktExportOrdersToFile?.downloadUrl) {
  window.open(data.mktExportOrdersToFile.downloadUrl, '_blank');
}
```

**Ưu điểm:** Không mất state của trang hiện tại
**Nhược điểm:** Có thể bị popup blocker chặn

---

### Cách 3: Fetch Blob + Create Link (Custom Control)

```typescript
// Full control: custom filename, progress tracking, etc.
if (data?.mktExportOrdersToFile?.downloadUrl) {
  const response = await fetch(data.mktExportOrdersToFile.downloadUrl);
  const blob = await response.blob();

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders_${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}
```

**Ưu điểm:** Custom filename, có thể thêm progress bar
**Nhược điểm:** Phức tạp hơn, file load vào memory trước

---

### Complete Example với Auto Download

```tsx
import { useMutation } from '@apollo/client';
import { EXPORT_ORDERS_TO_FILE } from './queries/orderExport';

const ExportButton = () => {
  const [exportOrders, { loading }] = useMutation(EXPORT_ORDERS_TO_FILE);

  const handleExport = async () => {
    try {
      const { data } = await exportOrders({
        variables: { input: { format: 'XLSX' } }
      });

      // Auto download ngay sau khi có URL
      if (data?.mktExportOrdersToFile?.downloadUrl) {
        window.location.href = data.mktExportOrdersToFile.downloadUrl;
      }
    } catch (error) {
      console.error('Export failed:', error);
      // Handle error (show toast, etc.)
    }
  };

  return (
    <button onClick={handleExport} disabled={loading}>
      {loading ? 'Đang xuất...' : 'Export Excel'}
    </button>
  );
};
```

---

## Best Practices

### 1. Simple Export Button

```tsx
const ExportButton = () => {
  const [exportOrders] = useMutation(EXPORT_ORDERS_TO_FILE);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { data } = await exportOrders({
        variables: { input: { format: 'XLSX' } }
      });

      if (data?.mktExportOrdersToFile?.downloadUrl) {
        // Redirect để download
        window.location.href = data.mktExportOrdersToFile.downloadUrl;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading}>
      {loading ? 'Đang xử lý...' : 'Export Excel'}
    </Button>
  );
};
```

### 2. Export Selected Orders (by IDs)

```tsx
const OrderListWithExport = () => {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [exportOrdersByIds] = useMutation(EXPORT_ORDERS_BY_IDS);

  const handleExportSelected = async () => {
    const { data } = await exportOrdersByIds({
      variables: {
        input: {
          orderIds: selectedOrderIds,
          format: 'XLSX',
        }
      }
    });

    if (data?.mktExportOrdersByIds?.downloadUrl) {
      window.location.href = data.mktExportOrdersByIds.downloadUrl;
    }
  };

  return (
    <div>
      <Button onClick={handleExportSelected} disabled={selectedOrderIds.length === 0}>
        Export ({selectedOrderIds.length} đơn hàng đã chọn)
      </Button>
      <OrderList
        onSelectionChange={setSelectedOrderIds}
        selectedIds={selectedOrderIds}
      />
    </div>
  );
};
```

### 3. Export by Customer

```tsx
const CustomerOrdersExport = ({ customerId }: { customerId: string }) => {
  const [exportOrders] = useMutation(EXPORT_ORDERS_TO_FILE);

  const handleExport = async () => {
    const { data } = await exportOrders({
      variables: {
        input: {
          customerId,
          format: 'XLSX',
        }
      }
    });

    if (data?.mktExportOrdersToFile?.downloadUrl) {
      window.location.href = data.mktExportOrdersToFile.downloadUrl;
    }
  };

  return (
    <Button onClick={handleExport}>
      Export đơn hàng của khách hàng
    </Button>
  );
};
```

### 4. Format Selector with Dropdown

```tsx
const ExportDropdown = () => {
  const [exportOrders] = useMutation(EXPORT_ORDERS_TO_FILE);

  const handleExport = async (format: 'XLSX' | 'CSV') => {
    const { data } = await exportOrders({
      variables: { input: { format } }
    });

    if (data?.mktExportOrdersToFile?.downloadUrl) {
      window.location.href = data.mktExportOrdersToFile.downloadUrl;
    }
  };

  return (
    <Menu>
      <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
        Export
      </MenuButton>
      <MenuList>
        <MenuItem onClick={() => handleExport('XLSX')}>
          Export Excel (.xlsx)
        </MenuItem>
        <MenuItem onClick={() => handleExport('CSV')}>
          Export CSV (.csv)
        </MenuItem>
      </MenuList>
    </Menu>
  );
};
```

### 5. Using window.open for New Tab Download

```tsx
const handleExport = async () => {
  const { data } = await exportOrders({
    variables: { input: { format: 'XLSX' } }
  });

  if (data?.mktExportOrdersToFile?.downloadUrl) {
    // Mở tab mới để download (không redirect trang hiện tại)
    window.open(data.mktExportOrdersToFile.downloadUrl, '_blank');
  }
};
```

### 6. Using fetch with Blob (for custom handling)

```tsx
const handleExportWithFetch = async () => {
  const { data } = await exportOrders({
    variables: { input: { format: 'XLSX' } }
  });

  if (data?.mktExportOrdersToFile?.downloadUrl) {
    const response = await fetch(data.mktExportOrdersToFile.downloadUrl);
    const blob = await response.blob();

    // Tạo download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${new Date().toISOString().slice(0,10)}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
};
```

---

## GraphQL Query Definitions

```typescript
// queries/orderExport.ts
import { gql } from '@apollo/client';

// Export theo filter (customerId, salesStaffId)
export const EXPORT_ORDERS_TO_FILE = gql`
  mutation MktExportOrdersToFile($input: ExportOrdersInput) {
    mktExportOrdersToFile(input: $input) {
      downloadUrl
      rowCount
      expiresAt
    }
  }
`;

// Export theo danh sách IDs đã chọn
export const EXPORT_ORDERS_BY_IDS = gql`
  mutation MktExportOrdersByIds($input: ExportOrdersByIdsInput!) {
    mktExportOrdersByIds(input: $input) {
      downloadUrl
      rowCount
      expiresAt
    }
  }
`;

export const REQUEST_ASYNC_ORDER_EXPORT = gql`
  mutation MktRequestAsyncOrderExport($input: ExportOrdersInput) {
    mktRequestAsyncOrderExport(input: $input) {
      jobId
      status
      estimatedRows
    }
  }
`;

export const GET_ORDER_EXPORT_JOB_STATUS = gql`
  query MktGetOrderExportJobStatus($jobId: String!) {
    mktGetOrderExportJobStatus(jobId: $jobId) {
      jobId
      status
      estimatedRows
      downloadUrl
      expiresAt
      error
    }
  }
`;
```

---

## TypeScript Types

```typescript
// types/orderExport.ts

export type ExportFormat = 'XLSX' | 'CSV';

// Export theo filter
export type ExportOrdersInput = {
  customerId?: string;
  salesStaffId?: string;
  format?: ExportFormat;
};

// Export theo IDs
export type ExportOrdersByIdsInput = {
  orderIds: string[]; // Bắt buộc
  format?: ExportFormat;
};

export type ExportFileOutput = {
  downloadUrl: string;
  rowCount: number;
  expiresAt: string;
};

export type ExportJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type AsyncExportOutput = {
  jobId: string;
  status: ExportJobStatus;
  estimatedRows: number;
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
};
```

---

## Error Handling

### Common Errors

| Error Code | Message | Description |
|------------|---------|-------------|
| `UNAUTHENTICATED` | Forbidden resource | Chưa đăng nhập |
| `401 Unauthorized` | Invalid or expired export token | Token hết hạn hoặc đã sử dụng |
| `404 Not Found` | Export failed | Lỗi khi generate file |

### Error Handling Example

```typescript
const handleExport = async () => {
  try {
    const { data } = await exportOrders({
      variables: { input: { format: 'XLSX' } }
    });

    if (data?.mktExportOrdersToFile?.downloadUrl) {
      window.location.href = data.mktExportOrdersToFile.downloadUrl;
    }
  } catch (error) {
    const graphQLError = error.graphQLErrors?.[0];

    if (graphQLError?.extensions?.code === 'UNAUTHENTICATED') {
      redirectToLogin();
    } else {
      showError('Có lỗi xảy ra khi export dữ liệu');
    }
  }
};
```

---

## Exported Columns

| Column | Header (Vietnamese) | Description |
|--------|---------------------|-------------|
| `orderCode` | Mã đơn hàng | Mã đơn (e.g., DEV20260204001) |
| `customerName` | Khách hàng | Tên khách hàng |
| `createdAt` | Ngày tạo | Format: dd/MM/yyyy HH:mm |
| `status` | Trạng thái | Label tiếng Việt |
| `paymentStatus` | TT thanh toán | Label tiếng Việt |
| `totalAmount` | Tổng tiền | Format: 149.000 ₫ |
| `paidAmount` | Đã thanh toán | Format: 149.000 ₫ |
| `remainingAmount` | Còn lại | Format: 149.000 ₫ |
| `note` | Ghi chú | Ghi chú đơn hàng |
| `createdByName` | Người tạo | Tên nhân viên tạo đơn |

**Note:** Email và phone (PII) KHÔNG được export mặc định.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-04 | Initial release với Base64 content |
| 2.0.0 | 2026-02-04 | Chuyển sang REST endpoint download trực tiếp |
| 2.1.0 | 2026-02-04 | Thêm `mktExportOrdersByIds` - export theo danh sách IDs đã chọn |
| 2.2.0 | 2026-02-04 | Cập nhật Input types: chỉ hỗ trợ filter `customerId`, `salesStaffId` (bỏ `status`, `startDate`, `endDate`) |

---

## Source Files

| File | Description |
|------|-------------|
| `order-export.resolver.ts` | GraphQL Resolver - mutations & queries |
| `order-export.controller.ts` | REST Controller - file download endpoint |
| `order-export.service.ts` | Domain Service - fetch orders, generate file |
| `order-export-token.service.ts` | Token Service - one-time token management |
| `order-export.dto.ts` | DTO - Input/Output types |

**Location:** `packages/twenty-server/src/mkt-core/order/`
