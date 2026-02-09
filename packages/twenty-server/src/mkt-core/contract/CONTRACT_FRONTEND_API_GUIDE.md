# Contract API - Frontend Developer Guide

## Overview

API GraphQL de quan ly hop dong (contracts) trong he thong CRM. Module ho tro toan bo lifecycle cua hop dong: tao moi, cap nhat, chuyen trang thai, xoa mem va khoi phuc.

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

### Query APIs (Doc du lieu)
- `getContracts` - Lay danh sach hop dong (co phan trang)
- `getContractById` - Lay hop dong theo ID
- `getContractByNumber` - Lay hop dong theo so hop dong
- `getContractsByCustomer` - Lay danh sach hop dong theo khach hang
- `getContractsByStatus` - Lay danh sach hop dong theo trang thai
- `getContractStatusDistribution` - Thong ke phan bo trang thai hop dong
- `getCustomerContractStats` - Thong ke hop dong cua khach hang
- `getExpiringContracts` - Lay danh sach hop dong sap het han

### Mutation APIs (Ghi du lieu)
- `createContract` - Tao hop dong moi
- `updateContract` - Cap nhat thong tin hop dong
- `updateContractStatus` - Chuyen trang thai hop dong
- `deleteContract` - Xoa mem hop dong
- `restoreContract` - Khoi phuc hop dong da xoa

---

## Queries

### 1. getContracts

Lay danh sach hop dong voi phan trang. Du lieu duoc loc tu dong theo quyen truy cap cua user (Row-Level Security).

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
| `take` | Float | No | `50` | So luong ban ghi toi da |
| `skip` | Float | No | `0` | So ban ghi bo qua (offset) |

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
          "description": "Hop dong cap phep su dung bo MS Office 365...",
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

Lay thong tin chi tiet mot hop dong theo ID.

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
      "description": "Hop dong cap phep su dung bo MS Office 365...",
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

**Response null (khong tim thay hoac khong co quyen):**
```json
{
  "data": {
    "getContractById": null
  }
}
```

---

### 3. getContractByNumber

Lay thong tin hop dong theo so hop dong (contract number). So hop dong co dinh dang `CT{YYYYMMDD}{NNN}`.

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
      "description": "Hop dong nang cap goi Slack Business+...",
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

Lay danh sach hop dong cua mot khach hang. Ket qua duoc loc theo quyen cua user hien tai.

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

Lay danh sach hop dong theo trang thai.

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

**Cac gia tri ContractStatus hop le:**

| Value | Mau sac | Mo ta (VI) | Mo ta (EN) |
|-------|---------|------------|------------|
| `PENDING_CONVERSION` | Yellow | Cho chuyen doi | Pending Conversion |
| `ACTIVE` | Green | Hoat dong | Active |
| `INACTIVE` | Gray | Khong hoat dong | Inactive |
| `EXPIRED` | Red | Het han | Expired |
| `REVOKED` | Orange | Bi thu hoi | Revoked |

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

Thong ke phan bo hop dong theo trang thai. Huu ich de hien thi chart/dashboard.

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

Thong ke hop dong cua mot khach hang cu the. Tra ve so luong hop dong, so active, so expired va ngay hop dong dau tien/cuoi cung.

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

Lay danh sach hop dong sap het han trong khoang thoi gian chi dinh. Huu ich de canh bao gia han.

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

Tao hop dong moi. So hop dong (`contractNumber`) se duoc tu dong sinh neu khong truyen vao, theo dinh dang `CT{YYYYMMDD}{NNN}`. Trang thai mac dinh la `PENDING_CONVERSION`. Truong `createdById` tu dong lay tu token cua user dang dang nhap.

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
    "description": "Hop dong cap phep su dung SAP Business One",
    "customerId": "customer-uuid",
    "accountOwnerId": "member-uuid"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | String | **Yes** | - | Ten hop dong |
| `contractNumber` | String | No | Tu dong sinh | So hop dong (CT{YYYYMMDD}{NNN}) |
| `contractType` | ContractType | No | - | Loai hop dong (ORIGIN/RENEW/UPGRADE) |
| `startDate` | String | No | - | Ngay bat dau (YYYY-MM-DD) |
| `endDate` | String | No | - | Ngay ket thuc (YYYY-MM-DD) |
| `signedDate` | String | No | - | Ngay ky (YYYY-MM-DD) |
| `filePath` | String | No | - | Duong dan file hop dong |
| `fileName` | String | No | - | Ten file hop dong |
| `description` | String | No | - | Mo ta hop dong |
| `customerId` | String (UUID) | No | - | ID khach hang |
| `accountOwnerId` | String (UUID) | No | - | ID nguoi phu trach |

**Cac gia tri ContractType hop le:**

| Value | Mo ta (VI) | Mo ta (EN) |
|-------|------------|------------|
| `ORIGIN` | Hop dong goc | Original Contract |
| `RENEW` | Hop dong gia han | Renewal Contract |
| `UPGRADE` | Hop dong nang cap | Upgrade Contract |

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

Cap nhat thong tin hop dong. Chi cap nhat cac truong duoc truyen vao, cac truong khong truyen se giu nguyen.

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
    "description": "Hop dong da cap nhat noi dung",
    "endDate": "2027-06-01"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (UUID) | **Yes** | ID hop dong can cap nhat |
| `name` | String | No | Ten hop dong |
| `contractNumber` | String | No | So hop dong |
| `status` | ContractStatus | No | Trang thai |
| `contractType` | ContractType | No | Loai hop dong |
| `startDate` | String | No | Ngay bat dau |
| `endDate` | String | No | Ngay ket thuc |
| `signedDate` | String | No | Ngay ky |
| `filePath` | String | No | Duong dan file |
| `fileName` | String | No | Ten file |
| `description` | String | No | Mo ta |
| `customerId` | String (UUID) | No | ID khach hang |
| `accountOwnerId` | String (UUID) | No | ID nguoi phu trach |

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

**Response Error - Khong tim thay hop dong:**
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

Chuyen trang thai hop dong. Tra ve trang thai truoc va sau khi chuyen, kem thong bao.

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
    "reason": "Khach hang yeu cau tam ngung"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (UUID) | **Yes** | ID hop dong |
| `status` | ContractStatus | **Yes** | Trang thai moi |
| `reason` | String | No | Ly do thay doi trang thai |

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

**Response Error - Khong tim thay:**
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

Xoa mem hop dong (soft delete). Hop dong bi xoa van co the khoi phuc bang `restoreContract`.

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

**Response Error - Khong tim thay:**
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

Khoi phuc hop dong da xoa mem. Trang thai hop dong duoc giu nguyen nhu truoc khi xoa.

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

**Response Error - Khong tim thay:**
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
| `name` | String | Yes | Ten hop dong |
| `contractNumber` | String | Yes | So hop dong (CT{YYYYMMDD}{NNN}) |
| `status` | ContractStatus | Yes | Trang thai hop dong |
| `contractType` | ContractType | Yes | Loai hop dong |
| `startDate` | String | Yes | Ngay bat dau |
| `endDate` | String | Yes | Ngay ket thuc |
| `signedDate` | String | Yes | Ngay ky hop dong |
| `filePath` | String | Yes | Duong dan file hop dong |
| `fileName` | String | Yes | Ten file hop dong |
| `description` | String | Yes | Mo ta hop dong |
| `position` | Number | Yes | Vi tri sap xep |
| `customerId` | String | Yes | ID khach hang |
| `accountOwnerId` | String | Yes | ID nguoi phu trach |
| `createdById` | String | Yes | ID nguoi tao |
| `createdAt` | String | Yes | Ngay tao |
| `updatedAt` | String | Yes | Ngay cap nhat |

### ContractListOutput

| Field | Type | Description |
|-------|------|-------------|
| `contracts` | [ContractOutput] | Danh sach hop dong |
| `totalCount` | Number | Tong so hop dong |

### ContractStatusDistributionOutput

| Field | Type | Description |
|-------|------|-------------|
| `distribution` | [ContractStatusDistributionItem] | Danh sach phan bo |
| `totalCount` | Number | Tong so hop dong |

### ContractStatusDistributionItem

| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Trang thai hop dong |
| `count` | Number | So luong hop dong |

### CustomerContractStatsOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `contractCount` | Number | No | Tong so hop dong |
| `activeCount` | Number | No | So hop dong dang hoat dong |
| `expiredCount` | Number | No | So hop dong het han |
| `firstContractDate` | String | Yes | Ngay hop dong dau tien |
| `lastContractDate` | String | Yes | Ngay hop dong moi nhat |

### ExpiringContractsOutput

| Field | Type | Description |
|-------|------|-------------|
| `contracts` | [ContractOutput] | Danh sach hop dong sap het han |
| `totalCount` | Number | Tong so hop dong sap het han |

### CreateContractResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `contractId` | String | Yes | ID hop dong da tao |
| `contractNumber` | String | Yes | So hop dong da tao |
| `status` | ContractStatus | Yes | Trang thai hop dong |
| `error` | String | Yes | Thong bao loi (neu co) |

### UpdateContractResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `contractId` | String | Yes | ID hop dong |
| `previousStatus` | ContractStatus | Yes | Trang thai truoc |
| `newStatus` | ContractStatus | Yes | Trang thai sau |
| `error` | String | Yes | Thong bao loi (neu co) |

### UpdateContractStatusResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `contractId` | String | Yes | ID hop dong |
| `previousStatus` | ContractStatus | Yes | Trang thai truoc |
| `newStatus` | ContractStatus | Yes | Trang thai sau |
| `message` | String | Yes | Thong bao chi tiet |
| `error` | String | Yes | Thong bao loi (neu co) |

### DeleteContractResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `contractId` | String | Yes | ID hop dong |
| `message` | String | Yes | Thong bao ket qua |
| `error` | String | Yes | Thong bao loi (neu co) |

### RestoreContractResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `contractId` | String | Yes | ID hop dong |
| `status` | ContractStatus | Yes | Trang thai hop dong sau khi khoi phuc |
| `error` | String | Yes | Thong bao loi (neu co) |

### Enums

#### ContractStatus

| Value | Color | Label (VI) | Label (EN) |
|-------|-------|------------|------------|
| `PENDING_CONVERSION` | Yellow | Cho chuyen doi | Pending Conversion |
| `ACTIVE` | Green | Hoat dong | Active |
| `INACTIVE` | Gray | Khong hoat dong | Inactive |
| `EXPIRED` | Red | Het han | Expired |
| `REVOKED` | Orange | Bi thu hoi | Revoked |

#### ContractType

| Value | Color | Label (VI) | Label (EN) |
|-------|-------|------------|------------|
| `ORIGIN` | Blue | Hop dong goc | Original Contract |
| `RENEW` | Green | Hop dong gia han | Renewal Contract |
| `UPGRADE` | Purple | Hop dong nang cap | Upgrade Contract |

---

## Security Notes

### 3-Layer Access Control

Module Contract ap dung 3 lop bao mat:

```
Layer 1: Guards (WorkspaceAuthGuard + UserAuthGuard)
    |
Layer 2: @RequireContractAccess (RBAC theo phong ban)
    |
Layer 3: @DataScope (Row-Level Security theo cap bac)
```

#### Layer 1 - Authentication Guards

| Guard | Chuc nang |
|-------|-----------|
| `WorkspaceAuthGuard` | Xac thuc workspace tu token |
| `UserAuthGuard` | Xac thuc user tu token |

#### Layer 2 - Department-Based Access (RBAC)

| Phong ban / Cap bac | Quyen truy cap |
|---------------------|---------------|
| Finance (FINANCE) | Full access |
| Accounting (ACCOUNTING) | Full access |
| Executive (level 1-3: CEO, C-Level, VP) | Full access |
| Cac phong ban khac | 403 Forbidden |

#### Layer 3 - Row-Level Security (DataScope)

| Cap bac (Hierarchy Level) | Pham vi du lieu |
|---------------------------|----------------|
| Staff (level 8-11) | Chi thay hop dong do minh tao (`createdById = self`) |
| Manager (level 7) | Thay hop dong cua cap duoi truc tiep |
| Upper Management (level 4-6) | Thay hop dong trong chuoi bao cao |
| Executive (level 1-3) | Thay tat ca hop dong |

#### Decorator su dung theo thao tac

| API | Decorator | Mo ta |
|-----|-----------|-------|
| Query (doc) | `@RequireContractReadAccess()` | Quyen doc hop dong |
| Mutation (tao/sua) | `@RequireContractWriteAccess()` | Quyen ghi hop dong |
| Mutation (xoa) | `@RequireContractDeleteAccess()` | Quyen xoa hop dong |

### Block Hooks

Module Contract **chan 13 GraphQL operations tu dong sinh** boi Twenty CRM engine (createMktContract, updateMktContract, deleteMktContract, findMktContract, v.v.). Tat ca thao tac voi hop dong **bat buoc** phai di qua cac custom resolver duoc bao ve boi RBAC.

---

## Error Handling

### Common Errors

| Error Code | Message | Description |
|------------|---------|-------------|
| `UNAUTHENTICATED` | You must be authenticated | Chua dang nhap hoac token het han |
| `FORBIDDEN` | Chi phong Tai chinh/Ke toan va Ban dieu hanh... | Khong co quyen truy cap module Contract |
| - | Contract not found: {id} | Hop dong khong ton tai |
| - | Contract with number {number} already exists | So hop dong da ton tai (khi tao moi) |
| - | Contract not found or not deleted: {id} | Hop dong khong ton tai hoac chua bi xoa (khi restore) |

### Mutation Response Pattern

Tat ca mutation tra ve pattern `{ success, error }` thay vi throw exception:

```typescript
// Kiem tra ket qua
const result = await createContract({ variables: { input } });
const data = result.data.createContract;

if (data.success) {
  // Thanh cong
  console.log('Contract ID:', data.contractId);
  console.log('Contract Number:', data.contractNumber);
} else {
  // That bai - hien thi loi
  showError(data.error);
}
```

---

## Best Practices

### 1. Su dung getContracts voi pagination

```graphql
# Lay 10 hop dong dau tien
query { getContracts(take: 10, skip: 0) { contracts { ... } totalCount } }

# Lay trang tiep theo
query { getContracts(take: 10, skip: 10) { contracts { ... } totalCount } }
```

### 2. Kiem tra ket qua mutation truoc khi xu ly

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

### 3. Su dung getExpiringContracts de canh bao gia han

```typescript
// Lay hop dong het han trong 30 ngay toi
const today = new Date();
const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

const result = await getExpiringContracts({
  variables: {
    startDate: today.toISOString().split('T')[0],
    endDate: in30Days.toISOString().split('T')[0]
  }
});

if (result.data.getExpiringContracts.totalCount > 0) {
  showWarning(`Co ${result.data.getExpiringContracts.totalCount} hop dong sap het han`);
}
```

### 4. Su dung getContractStatusDistribution cho dashboard

```typescript
const result = await getContractStatusDistribution();
const { distribution, totalCount } = result.data.getContractStatusDistribution;

// Hien thi pie chart / bar chart
distribution.forEach(item => {
  console.log(`${item.status}: ${item.count} (${(item.count / totalCount * 100).toFixed(1)}%)`);
});
```

### 5. Flow tao hop dong day du

```typescript
// Buoc 1: Tao hop dong
const createResult = await createContract({
  variables: {
    input: {
      name: 'Ten hop dong',
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

// Buoc 2: Chuyen trang thai ACTIVE khi da ky
const statusResult = await updateContractStatus({
  variables: {
    input: {
      id: contractId,
      status: 'ACTIVE',
      reason: 'Da ky hop dong'
    }
  }
});
```

### 6. Soft delete va restore

```typescript
// Xoa mem
const deleteResult = await deleteContract({
  variables: { contractId }
});

// Khoi phuc
const restoreResult = await restoreContract({
  variables: { contractId }
});

// Trang thai hop dong duoc giu nguyen sau khi restore
console.log(restoreResult.data.restoreContract.status); // Trang thai truoc khi xoa
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-09 | Initial release - 8 queries, 5 mutations with 3-layer RBAC |
