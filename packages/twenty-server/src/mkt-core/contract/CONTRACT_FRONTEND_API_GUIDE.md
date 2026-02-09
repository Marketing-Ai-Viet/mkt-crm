# Contract API - Frontend Developer Guide

## Overview

API GraphQL để quản lý hợp đồng (contracts) trong hệ thống CRM. Module hỗ trợ toàn bộ lifecycle của hợp đồng: tạo mới, cập nhật, chuyển trạng thái, xóa mềm và khôi phục.

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Bearer Token (required)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## API Categories

### Query APIs (Đọc dữ liệu)
- `getContracts` - Lấy danh sách hợp đồng (có phân trang)
- `getContractById` - Lấy hợp đồng theo ID
- `getContractByNumber` - Lấy hợp đồng theo số hợp đồng
- `getContractsByCustomer` - Lấy danh sách hợp đồng theo khách hàng
- `getContractsByStatus` - Lấy danh sách hợp đồng theo trạng thái
- `getContractStatusDistribution` - Thống kê phân bổ trạng thái hợp đồng
- `getCustomerContractStats` - Thống kê hợp đồng của khách hàng
- `getExpiringContracts` - Lấy danh sách hợp đồng sắp hết hạn

### Mutation APIs (Ghi dữ liệu)
- `createContract` - Tạo hợp đồng mới
- `updateContract` - Cập nhật thông tin hợp đồng
- `updateContractStatus` - Chuyển trạng thái hợp đồng
- `deleteContract` - Xóa mềm hợp đồng
- `restoreContract` - Khôi phục hợp đồng đã xóa

---

## Queries

### 1. getContracts

Lấy danh sách hợp đồng với phân trang. Dữ liệu được lọc tự động theo quyền truy cập của user (Row-Level Security).

**Query:**
```graphql
query GetContracts($take: Float, $skip: Float) {
  getContracts(take: $take, skip: $skip) {
    contracts {
      id
      name
      contractNumber
      status
      contractType
      startDate
      endDate
      signedDate
      filePath
      fileName
      description
      position
      customerId
      accountOwnerId
      createdById
      createdAt
      updatedAt
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "take": 10,
  "skip": 0
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `take` | Float | No | `50` | Số lượng bản ghi tối đa |
| `skip` | Float | No | `0` | Số bản ghi bỏ qua (offset) |

**Response Success:**
```json
{
  "data": {
    "getContracts": {
      "contracts": [
        {
          "id": "ct-uuid-001",
          "name": "Microsoft Office 365 Business - FPT Software",
          "contractNumber": "CT20240215001",
          "status": "ACTIVE",
          "contractType": "ORIGIN",
          "startDate": "2024-02-15",
          "endDate": "2025-02-15",
          "signedDate": "2024-02-10",
          "filePath": null,
          "fileName": null,
          "description": "Hợp đồng cấp phép sử dụng bộ MS Office 365...",
          "position": 1,
          "customerId": "customer-uuid",
          "accountOwnerId": "member-uuid",
          "createdById": "member-uuid",
          "createdAt": "2024-02-15T00:00:00.000Z",
          "updatedAt": "2024-02-15T00:00:00.000Z"
        }
      ],
      "totalCount": 15
    }
  }
}
```

---

### 2. getContractById

Lấy thông tin chi tiết một hợp đồng theo ID.

**Query:**
```graphql
query GetContractById($contractId: String!) {
  getContractById(contractId: $contractId) {
    id
    name
    contractNumber
    status
    contractType
    startDate
    endDate
    signedDate
    filePath
    fileName
    description
    position
    customerId
    accountOwnerId
    createdById
    createdAt
    updatedAt
  }
}
```

**Variables:**
```json
{
  "contractId": "ct-uuid-001"
}
```

**Response Success:**
```json
{
  "data": {
    "getContractById": {
      "id": "ct-uuid-001",
      "name": "Microsoft Office 365 Business - FPT Software",
      "contractNumber": "CT20240215001",
      "status": "ACTIVE",
      "contractType": "ORIGIN",
      "startDate": "2024-02-15",
      "endDate": "2025-02-15",
      "signedDate": "2024-02-10",
      "description": "Hợp đồng cấp phép sử dụng bộ MS Office 365...",
      "position": 1,
      "customerId": "customer-uuid",
      "accountOwnerId": "member-uuid",
      "createdById": "member-uuid",
      "createdAt": "2024-02-15T00:00:00.000Z",
      "updatedAt": "2024-02-15T00:00:00.000Z"
    }
  }
}
```

**Response null (không tìm thấy hoặc không có quyền):**
```json
{
  "data": {
    "getContractById": null
  }
}
```

---

### 3. getContractByNumber

Lấy thông tin hợp đồng theo số hợp đồng (contract number). Số hợp đồng có định dạng `CT{YYYYMMDD}{NNN}`.

**Query:**
```graphql
query GetContractByNumber($contractNumber: String!) {
  getContractByNumber(contractNumber: $contractNumber) {
    id
    name
    contractNumber
    status
    contractType
    startDate
    endDate
    signedDate
    description
    customerId
    accountOwnerId
    createdById
    createdAt
    updatedAt
  }
}
```

**Variables:**
```json
{
  "contractNumber": "CT20240215001"
}
```

**Response Success:**
```json
{
  "data": {
    "getContractByNumber": {
      "id": "ct-uuid-003",
      "name": "Slack Business+ - FPT Software",
      "contractNumber": "CT20240215001",
      "status": "ACTIVE",
      "contractType": "UPGRADE",
      "startDate": "2024-03-10",
      "endDate": "2025-03-10",
      "signedDate": "2024-03-05",
      "description": "Hợp đồng nâng cấp gói Slack Business+...",
      "customerId": "customer-uuid",
      "accountOwnerId": "member-uuid",
      "createdById": "member-uuid",
      "createdAt": "2024-03-10T00:00:00.000Z",
      "updatedAt": "2024-03-10T00:00:00.000Z"
    }
  }
}
```

---

### 4. getContractsByCustomer

Lấy danh sách hợp đồng của một khách hàng. Kết quả được lọc theo quyền của user hiện tại.

**Query:**
```graphql
query GetContractsByCustomer($customerId: String!) {
  getContractsByCustomer(customerId: $customerId) {
    contracts {
      id
      name
      contractNumber
      status
      contractType
      startDate
      endDate
      customerId
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "customerId": "customer-uuid"
}
```

**Response Success:**
```json
{
  "data": {
    "getContractsByCustomer": {
      "contracts": [
        {
          "id": "ct-uuid-001",
          "name": "Microsoft Office 365 Business - FPT Software",
          "contractNumber": "CT20240215001",
          "status": "ACTIVE",
          "contractType": "ORIGIN",
          "startDate": "2024-02-15",
          "endDate": "2025-02-15",
          "customerId": "customer-uuid"
        },
        {
          "id": "ct-uuid-002",
          "name": "Adobe Creative Cloud - FPT Software",
          "contractNumber": "CT20240301002",
          "status": "ACTIVE",
          "contractType": "RENEW",
          "startDate": "2024-03-01",
          "endDate": "2025-03-01",
          "customerId": "customer-uuid"
        }
      ],
      "totalCount": 2
    }
  }
}
```

---

### 5. getContractsByStatus

Lấy danh sách hợp đồng theo trạng thái.

**Query:**
```graphql
query GetContractsByStatus($status: ContractStatus!) {
  getContractsByStatus(status: $status) {
    contracts {
      id
      name
      contractNumber
      status
      contractType
      startDate
      endDate
      customerId
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "status": "ACTIVE"
}
```

**Các giá trị ContractStatus hợp lệ:**

| Value | Màu sắc | Mô tả (VI) | Mô tả (EN) |
|-------|---------|-------------|-------------|
| `PENDING_CONVERSION` | Yellow | Chờ chuyển đổi | Pending Conversion |
| `ACTIVE` | Green | Hoạt động | Active |
| `INACTIVE` | Gray | Không hoạt động | Inactive |
| `EXPIRED` | Red | Hết hạn | Expired |
| `REVOKED` | Orange | Bị thu hồi | Revoked |

**Response Success:**
```json
{
  "data": {
    "getContractsByStatus": {
      "contracts": [
        {
          "id": "ct-uuid-010",
          "name": "Google Workspace - Beta Test",
          "contractNumber": "CT20230901010",
          "status": "EXPIRED",
          "contractType": "ORIGIN",
          "startDate": "2023-09-01",
          "endDate": "2024-03-01",
          "customerId": "customer-uuid"
        }
      ],
      "totalCount": 2
    }
  }
}
```

---

### 6. getContractStatusDistribution

Thống kê phân bổ hợp đồng theo trạng thái. Hữu ích để hiển thị chart/dashboard.

**Query:**
```graphql
query GetContractStatusDistribution {
  getContractStatusDistribution {
    distribution {
      status
      count
    }
    totalCount
  }
}
```

**Response Success:**
```json
{
  "data": {
    "getContractStatusDistribution": {
      "distribution": [
        { "status": "ACTIVE", "count": 9 },
        { "status": "EXPIRED", "count": 2 },
        { "status": "INACTIVE", "count": 2 },
        { "status": "PENDING_CONVERSION", "count": 1 },
        { "status": "REVOKED", "count": 1 }
      ],
      "totalCount": 15
    }
  }
}
```

---

### 7. getCustomerContractStats

Thống kê hợp đồng của một khách hàng cụ thể. Trả về số lượng hợp đồng, số active, số expired và ngày hợp đồng đầu tiên/cuối cùng.

**Query:**
```graphql
query GetCustomerContractStats($customerId: String!) {
  getCustomerContractStats(customerId: $customerId) {
    contractCount
    activeCount
    expiredCount
    firstContractDate
    lastContractDate
  }
}
```

**Variables:**
```json
{
  "customerId": "customer-uuid"
}
```

**Response Success:**
```json
{
  "data": {
    "getCustomerContractStats": {
      "contractCount": 4,
      "activeCount": 4,
      "expiredCount": 0,
      "firstContractDate": "2024-02-15",
      "lastContractDate": "2024-05-20"
    }
  }
}
```

---

### 8. getExpiringContracts

Lấy danh sách hợp đồng sắp hết hạn trong khoảng thời gian chỉ định. Hữu ích để cảnh báo gia hạn.

**Query:**
```graphql
query GetExpiringContracts($startDate: String!, $endDate: String!) {
  getExpiringContracts(startDate: $startDate, endDate: $endDate) {
    contracts {
      id
      name
      contractNumber
      status
      contractType
      startDate
      endDate
      customerId
      accountOwnerId
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-06-30"
}
```

**Response Success:**
```json
{
  "data": {
    "getExpiringContracts": {
      "contracts": [
        {
          "id": "ct-uuid-001",
          "name": "Microsoft Office 365 Business - FPT Software",
          "contractNumber": "CT20240215001",
          "status": "ACTIVE",
          "contractType": "ORIGIN",
          "startDate": "2024-02-15",
          "endDate": "2025-02-15",
          "customerId": "customer-uuid",
          "accountOwnerId": "member-uuid"
        }
      ],
      "totalCount": 5
    }
  }
}
```

---

## Mutations

### 1. createContract

Tạo hợp đồng mới. Số hợp đồng (`contractNumber`) sẽ được tự động sinh nếu không truyền vào, theo định dạng `CT{YYYYMMDD}{NNN}`. Trạng thái mặc định là `PENDING_CONVERSION`. Trường `createdById` tự động lấy từ token của user đang đăng nhập.

**Mutation:**
```graphql
mutation CreateContract($input: CreateContractInput!) {
  createContract(input: $input) {
    success
    contractId
    contractNumber
    status
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "SAP Business One - ABC Corp",
    "contractType": "ORIGIN",
    "startDate": "2026-03-01",
    "endDate": "2027-03-01",
    "signedDate": "2026-02-25",
    "description": "Hợp đồng cấp phép sử dụng SAP Business One",
    "customerId": "customer-uuid",
    "accountOwnerId": "member-uuid"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | String | **Yes** | - | Tên hợp đồng |
| `contractNumber` | String | No | Tự động sinh | Số hợp đồng (CT{YYYYMMDD}{NNN}) |
| `contractType` | ContractType | No | - | Loại hợp đồng (ORIGIN/RENEW/UPGRADE) |
| `startDate` | String | No | - | Ngày bắt đầu (YYYY-MM-DD) |
| `endDate` | String | No | - | Ngày kết thúc (YYYY-MM-DD) |
| `signedDate` | String | No | - | Ngày ký (YYYY-MM-DD) |
| `filePath` | String | No | - | Đường dẫn file hợp đồng |
| `fileName` | String | No | - | Tên file hợp đồng |
| `description` | String | No | - | Mô tả hợp đồng |
| `customerId` | String (UUID) | No | - | ID khách hàng |
| `accountOwnerId` | String (UUID) | No | - | ID người phụ trách |

**Các giá trị ContractType hợp lệ:**

| Value | Mô tả (VI) | Mô tả (EN) |
|-------|-------------|-------------|
| `ORIGIN` | Hợp đồng gốc | Original Contract |
| `RENEW` | Hợp đồng gia hạn | Renewal Contract |
| `UPGRADE` | Hợp đồng nâng cấp | Upgrade Contract |

**Response Success:**
```json
{
  "data": {
    "createContract": {
      "success": true,
      "contractId": "new-contract-uuid",
      "contractNumber": "CT20260209001",
      "status": "PENDING_CONVERSION",
      "error": null
    }
  }
}
```

**Response Error:**
```json
{
  "data": {
    "createContract": {
      "success": false,
      "contractId": null,
      "contractNumber": null,
      "status": null,
      "error": "Contract with number CT20260209001 already exists"
    }
  }
}
```

---

### 2. updateContract

Cập nhật thông tin hợp đồng. Chỉ cập nhật các trường được truyền vào, các trường không truyền sẽ giữ nguyên.

**Mutation:**
```graphql
mutation UpdateContract($input: UpdateContractInput!) {
  updateContract(input: $input) {
    success
    contractId
    previousStatus
    newStatus
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "contract-uuid",
    "name": "SAP Business One - ABC Corp (Updated)",
    "description": "Hợp đồng đã cập nhật nội dung",
    "endDate": "2027-06-01"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (UUID) | **Yes** | ID hợp đồng cần cập nhật |
| `name` | String | No | Tên hợp đồng |
| `contractNumber` | String | No | Số hợp đồng |
| `status` | ContractStatus | No | Trạng thái |
| `contractType` | ContractType | No | Loại hợp đồng |
| `startDate` | String | No | Ngày bắt đầu |
| `endDate` | String | No | Ngày kết thúc |
| `signedDate` | String | No | Ngày ký |
| `filePath` | String | No | Đường dẫn file |
| `fileName` | String | No | Tên file |
| `description` | String | No | Mô tả |
| `customerId` | String (UUID) | No | ID khách hàng |
| `accountOwnerId` | String (UUID) | No | ID người phụ trách |

**Response Success:**
```json
{
  "data": {
    "updateContract": {
      "success": true,
      "contractId": "contract-uuid",
      "previousStatus": "ACTIVE",
      "newStatus": "ACTIVE",
      "error": null
    }
  }
}
```

**Response Error - Không tìm thấy hợp đồng:**
```json
{
  "data": {
    "updateContract": {
      "success": false,
      "contractId": null,
      "previousStatus": null,
      "newStatus": null,
      "error": "Contract not found: invalid-uuid"
    }
  }
}
```

---

### 3. updateContractStatus

Chuyển trạng thái hợp đồng. Trả về trạng thái trước và sau khi chuyển, kèm thông báo.

**Mutation:**
```graphql
mutation UpdateContractStatus($input: UpdateContractStatusInput!) {
  updateContractStatus(input: $input) {
    success
    contractId
    previousStatus
    newStatus
    message
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "contract-uuid",
    "status": "INACTIVE",
    "reason": "Khách hàng yêu cầu tạm ngừng"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (UUID) | **Yes** | ID hợp đồng |
| `status` | ContractStatus | **Yes** | Trạng thái mới |
| `reason` | String | No | Lý do thay đổi trạng thái |

**Response Success:**
```json
{
  "data": {
    "updateContractStatus": {
      "success": true,
      "contractId": "contract-uuid",
      "previousStatus": "ACTIVE",
      "newStatus": "INACTIVE",
      "message": "Contract status updated from ACTIVE to INACTIVE",
      "error": null
    }
  }
}
```

**Response Error - Không tìm thấy:**
```json
{
  "data": {
    "updateContractStatus": {
      "success": false,
      "contractId": null,
      "previousStatus": null,
      "newStatus": null,
      "message": null,
      "error": "Contract not found: invalid-uuid"
    }
  }
}
```

---

### 4. deleteContract

Xóa mềm hợp đồng (soft delete). Hợp đồng bị xóa vẫn có thể khôi phục bằng `restoreContract`.

**Mutation:**
```graphql
mutation DeleteContract($contractId: String!) {
  deleteContract(contractId: $contractId) {
    success
    contractId
    message
    error
  }
}
```

**Variables:**
```json
{
  "contractId": "contract-uuid"
}
```

**Response Success:**
```json
{
  "data": {
    "deleteContract": {
      "success": true,
      "contractId": "contract-uuid",
      "message": "Contract deleted successfully",
      "error": null
    }
  }
}
```

**Response Error - Không tìm thấy:**
```json
{
  "data": {
    "deleteContract": {
      "success": false,
      "contractId": null,
      "message": null,
      "error": "Contract not found: invalid-uuid"
    }
  }
}
```

---

### 5. restoreContract

Khôi phục hợp đồng đã xóa mềm. Trạng thái hợp đồng được giữ nguyên như trước khi xóa.

**Mutation:**
```graphql
mutation RestoreContract($contractId: String!) {
  restoreContract(contractId: $contractId) {
    success
    contractId
    status
    error
  }
}
```

**Variables:**
```json
{
  "contractId": "contract-uuid"
}
```

**Response Success:**
```json
{
  "data": {
    "restoreContract": {
      "success": true,
      "contractId": "contract-uuid",
      "status": "INACTIVE",
      "error": null
    }
  }
}
```

**Response Error - Không tìm thấy:**
```json
{
  "data": {
    "restoreContract": {
      "success": false,
      "contractId": null,
      "status": null,
      "error": "Contract not found or not deleted: invalid-uuid"
    }
  }
}
```

---

## Types

### ContractOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Contract ID (UUID) |
| `name` | String | Yes | Tên hợp đồng |
| `contractNumber` | String | Yes | Số hợp đồng (CT{YYYYMMDD}{NNN}) |
| `status` | ContractStatus | Yes | Trạng thái hợp đồng |
| `contractType` | ContractType | Yes | Loại hợp đồng |
| `startDate` | String | Yes | Ngày bắt đầu |
| `endDate` | String | Yes | Ngày kết thúc |
| `signedDate` | String | Yes | Ngày ký hợp đồng |
| `filePath` | String | Yes | Đường dẫn file hợp đồng |
| `fileName` | String | Yes | Tên file hợp đồng |
| `description` | String | Yes | Mô tả hợp đồng |
| `position` | Number | Yes | Vị trí sắp xếp |
| `customerId` | String | Yes | ID khách hàng |
| `accountOwnerId` | String | Yes | ID người phụ trách |
| `createdById` | String | Yes | ID người tạo |
| `createdAt` | String | Yes | Ngày tạo |
| `updatedAt` | String | Yes | Ngày cập nhật |

### ContractListOutput

| Field | Type | Description |
|-------|------|-------------|
| `contracts` | [ContractOutput] | Danh sách hợp đồng |
| `totalCount` | Number | Tổng số hợp đồng |

### ContractStatusDistributionOutput

| Field | Type | Description |
|-------|------|-------------|
| `distribution` | [ContractStatusDistributionItem] | Danh sách phân bổ |
| `totalCount` | Number | Tổng số hợp đồng |

### ContractStatusDistributionItem

| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Trạng thái hợp đồng |
| `count` | Number | Số lượng hợp đồng |

### CustomerContractStatsOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `contractCount` | Number | No | Tổng số hợp đồng |
| `activeCount` | Number | No | Số hợp đồng đang hoạt động |
| `expiredCount` | Number | No | Số hợp đồng hết hạn |
| `firstContractDate` | String | Yes | Ngày hợp đồng đầu tiên |
| `lastContractDate` | String | Yes | Ngày hợp đồng mới nhất |

### ExpiringContractsOutput

| Field | Type | Description |
|-------|------|-------------|
| `contracts` | [ContractOutput] | Danh sách hợp đồng sắp hết hạn |
| `totalCount` | Number | Tổng số hợp đồng sắp hết hạn |

### CreateContractResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Kết quả thao tác |
| `contractId` | String | Yes | ID hợp đồng đã tạo |
| `contractNumber` | String | Yes | Số hợp đồng đã tạo |
| `status` | ContractStatus | Yes | Trạng thái hợp đồng |
| `error` | String | Yes | Thông báo lỗi (nếu có) |

### UpdateContractResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Kết quả thao tác |
| `contractId` | String | Yes | ID hợp đồng |
| `previousStatus` | ContractStatus | Yes | Trạng thái trước |
| `newStatus` | ContractStatus | Yes | Trạng thái sau |
| `error` | String | Yes | Thông báo lỗi (nếu có) |

### UpdateContractStatusResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Kết quả thao tác |
| `contractId` | String | Yes | ID hợp đồng |
| `previousStatus` | ContractStatus | Yes | Trạng thái trước |
| `newStatus` | ContractStatus | Yes | Trạng thái sau |
| `message` | String | Yes | Thông báo chi tiết |
| `error` | String | Yes | Thông báo lỗi (nếu có) |

### DeleteContractResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Kết quả thao tác |
| `contractId` | String | Yes | ID hợp đồng |
| `message` | String | Yes | Thông báo kết quả |
| `error` | String | Yes | Thông báo lỗi (nếu có) |

### RestoreContractResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Kết quả thao tác |
| `contractId` | String | Yes | ID hợp đồng |
| `status` | ContractStatus | Yes | Trạng thái hợp đồng sau khi khôi phục |
| `error` | String | Yes | Thông báo lỗi (nếu có) |

### Enums

#### ContractStatus

| Value | Color | Label (VI) | Label (EN) |
|-------|-------|------------|------------|
| `PENDING_CONVERSION` | Yellow | Chờ chuyển đổi | Pending Conversion |
| `ACTIVE` | Green | Hoạt động | Active |
| `INACTIVE` | Gray | Không hoạt động | Inactive |
| `EXPIRED` | Red | Hết hạn | Expired |
| `REVOKED` | Orange | Bị thu hồi | Revoked |

#### ContractType

| Value | Color | Label (VI) | Label (EN) |
|-------|-------|------------|------------|
| `ORIGIN` | Blue | Hợp đồng gốc | Original Contract |
| `RENEW` | Green | Hợp đồng gia hạn | Renewal Contract |
| `UPGRADE` | Purple | Hợp đồng nâng cấp | Upgrade Contract |

---

## Security Notes

### 3-Layer Access Control

Module Contract áp dụng 3 lớp bảo mật:

```
Layer 1: Guards (WorkspaceAuthGuard + UserAuthGuard)
    |
Layer 2: @RequireContractAccess (RBAC theo phòng ban)
    |
Layer 3: @DataScope (Row-Level Security theo cấp bậc)
```

#### Layer 1 - Authentication Guards

| Guard | Chức năng |
|-------|-----------|
| `WorkspaceAuthGuard` | Xác thực workspace từ token |
| `UserAuthGuard` | Xác thực user từ token |

#### Layer 2 - Department-Based Access (RBAC)

| Phòng ban / Cấp bậc | Quyền truy cập |
|----------------------|---------------|
| Finance (FINANCE) | Full access |
| Accounting (ACCOUNTING) | Full access |
| Executive (level 1-3: CEO, C-Level, VP) | Full access |
| Các phòng ban khác | 403 Forbidden |

#### Layer 3 - Row-Level Security (DataScope)

| Cấp bậc (Hierarchy Level) | Phạm vi dữ liệu |
|---------------------------|------------------|
| Staff (level 8-11) | Chỉ thấy hợp đồng do mình tạo (`createdById = self`) |
| Manager (level 7) | Thấy hợp đồng của cấp dưới trực tiếp |
| Upper Management (level 4-6) | Thấy hợp đồng trong chuỗi báo cáo |
| Executive (level 1-3) | Thấy tất cả hợp đồng |

#### Decorator sử dụng theo thao tác

| API | Decorator | Mô tả |
|-----|-----------|-------|
| Query (đọc) | `@RequireContractReadAccess()` | Quyền đọc hợp đồng |
| Mutation (tạo/sửa) | `@RequireContractWriteAccess()` | Quyền ghi hợp đồng |
| Mutation (xóa) | `@RequireContractDeleteAccess()` | Quyền xóa hợp đồng |

### Block Hooks

Module Contract **chặn 13 GraphQL operations tự động sinh** bởi Twenty CRM engine (createMktContract, updateMktContract, deleteMktContract, findMktContract, v.v.). Tất cả thao tác với hợp đồng **bắt buộc** phải đi qua các custom resolver được bảo vệ bởi RBAC.

---

## Error Handling

### Common Errors

| Error Code | Message | Description |
|------------|---------|-------------|
| `UNAUTHENTICATED` | You must be authenticated | Chưa đăng nhập hoặc token hết hạn |
| `FORBIDDEN` | Chỉ phòng Tài chính/Kế toán và Ban điều hành... | Không có quyền truy cập module Contract |
| - | Contract not found: {id} | Hợp đồng không tồn tại |
| - | Contract with number {number} already exists | Số hợp đồng đã tồn tại (khi tạo mới) |
| - | Contract not found or not deleted: {id} | Hợp đồng không tồn tại hoặc chưa bị xóa (khi restore) |

### Mutation Response Pattern

Tất cả mutation trả về pattern `{ success, error }` thay vì throw exception:

```typescript
// Kiểm tra kết quả
const result = await createContract({ variables: { input } });
const data = result.data.createContract;

if (data.success) {
  // Thành công
  console.log('Contract ID:', data.contractId);
  console.log('Contract Number:', data.contractNumber);
} else {
  // Thất bại - hiển thị lỗi
  showError(data.error);
}
```

---

## Best Practices

### 1. Sử dụng getContracts với pagination

```graphql
# Lấy 10 hợp đồng đầu tiên
query { getContracts(take: 10, skip: 0) { contracts { ... } totalCount } }

# Lấy trang tiếp theo
query { getContracts(take: 10, skip: 10) { contracts { ... } totalCount } }
```

### 2. Kiểm tra kết quả mutation trước khi xử lý

```typescript
const result = await updateContractStatus({
  variables: {
    input: { id: contractId, status: 'INACTIVE' }
  }
});

const data = result.data.updateContractStatus;

if (data.success) {
  showSuccess(data.message); // "Contract status updated from ACTIVE to INACTIVE"
} else {
  showError(data.error);
}
```

### 3. Sử dụng getExpiringContracts để cảnh báo gia hạn

```typescript
// Lấy hợp đồng hết hạn trong 30 ngày tới
const today = new Date();
const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

const result = await getExpiringContracts({
  variables: {
    startDate: today.toISOString().split('T')[0],
    endDate: in30Days.toISOString().split('T')[0]
  }
});

if (result.data.getExpiringContracts.totalCount > 0) {
  showWarning(`Có ${result.data.getExpiringContracts.totalCount} hợp đồng sắp hết hạn`);
}
```

### 4. Sử dụng getContractStatusDistribution cho dashboard

```typescript
const result = await getContractStatusDistribution();
const { distribution, totalCount } = result.data.getContractStatusDistribution;

// Hiển thị pie chart / bar chart
distribution.forEach(item => {
  console.log(`${item.status}: ${item.count} (${(item.count / totalCount * 100).toFixed(1)}%)`);
});
```

### 5. Flow tạo hợp đồng đầy đủ

```typescript
// Bước 1: Tạo hợp đồng
const createResult = await createContract({
  variables: {
    input: {
      name: 'Tên hợp đồng',
      contractType: 'ORIGIN',
      startDate: '2026-03-01',
      endDate: '2027-03-01',
      customerId: selectedCustomerId
    }
  }
});

if (!createResult.data.createContract.success) {
  showError(createResult.data.createContract.error);
  return;
}

const contractId = createResult.data.createContract.contractId;

// Bước 2: Chuyển trạng thái ACTIVE khi đã ký
const statusResult = await updateContractStatus({
  variables: {
    input: {
      id: contractId,
      status: 'ACTIVE',
      reason: 'Đã ký hợp đồng'
    }
  }
});
```

### 6. Soft delete và restore

```typescript
// Xóa mềm
const deleteResult = await deleteContract({
  variables: { contractId }
});

// Khôi phục
const restoreResult = await restoreContract({
  variables: { contractId }
});

// Trạng thái hợp đồng được giữ nguyên sau khi restore
console.log(restoreResult.data.restoreContract.status); // Trạng thái trước khi xóa
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-09 | Initial release - 8 queries, 5 mutations với 3-layer RBAC |
