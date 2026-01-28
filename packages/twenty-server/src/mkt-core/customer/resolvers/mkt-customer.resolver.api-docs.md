# API Documentation - Customer CRUD Resolver

> **Module**: `mkt-core/customer`
> **File**: `mkt-customer.resolver.ts`
> **Version**: 1.0.0
> **Last Updated**: 2026-01-28

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Data Types](#3-data-types)
4. [Queries](#4-queries)
5. [Mutations](#5-mutations)
6. [Error Handling](#6-error-handling)
7. [Usage Examples](#7-usage-examples)
8. [TypeScript Interfaces](#8-typescript-interfaces)

---

## 1. Overview

Customer CRUD Resolver cung cấp các API GraphQL để quản lý khách hàng (Customer) trong hệ thống CRM.

### Tính năng chính

| Feature | Description |
|---------|-------------|
| **Query** | Lấy thông tin customer theo ID, code, email |
| **List** | Lấy danh sách customers với pagination |
| **Filter** | Lọc theo status, tier |
| **Purchase History** | Lịch sử mua hàng với filters và pagination |
| **Create** | Tạo mới customer với initial notes |
| **Update** | Cập nhật customer và thêm notes mới |
| **Delete/Restore** | Soft delete và restore customer |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GraphQL Request                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              WorkspaceAuthGuard + UserAuthGuard             │
│                   (Authentication Layer)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MktCustomerResolver                      │
│         (GraphQL Resolver - Request/Response handling)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MktCustomerService                       │
│      (Business Logic + Transaction with ALS binding)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  MktCustomerRepository                      │
│                    (Data Access Layer)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       PostgreSQL                            │
│                  (mktCustomer table)                        │
└─────────────────────────────────────────────────────────────┘
```

### Transaction Support

- `createCustomer` và `updateCustomer` sử dụng TypeORM transaction
- Đảm bảo data consistency khi tạo/cập nhật customer và notes
- Nếu có lỗi → rollback toàn bộ

---

## 2. Authentication

### Required Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Guards Applied
- `WorkspaceAuthGuard`: Xác thực workspace context
- `UserAuthGuard`: Xác thực user trong workspace

### Token Structure (JWT Payload)
```json
{
  "sub": "<user-id>",
  "userId": "<user-id>",
  "workspaceId": "<workspace-id>",
  "workspaceMemberId": "<workspace-member-id>",
  "type": "ACCESS",
  "authProvider": "password",
  "iat": 1769422459,
  "exp": 1777198459
}
```

### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHENTICATED` | No token provided |
| 401 | `UNAUTHENTICATED` | Invalid or expired token |
| 403 | `FORBIDDEN` | Workspace access denied |

---

## 3. Data Types

### 3.1 Enum Values

#### Customer Status
```typescript
type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECTIVE';
```

#### Customer Tier
```typescript
type CustomerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'CHURNED';
```

#### Lifecycle Stage
```typescript
type LifecycleStage = 'PROSPECTIVE' | 'TRIAL' | 'CUSTOMER' | 'LOYAL' | 'CHURNED';
```

#### Customer Type
```typescript
type CustomerType = 'INDIVIDUAL' | 'BUSINESS' | 'ORGANIZATION';
```

#### Company Size
```typescript
type CompanySize = 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
```

#### Note Type
```typescript
type NoteType = 'GENERAL' | 'CALL' | 'MEETING' | 'ISSUE' | 'FOLLOWUP' | 'OTHER';
```

### 3.2 Input Types

#### CreateInitialNoteInput
```graphql
input CreateInitialNoteInput {
  content: String!                    # Nội dung note (required)
  noteType: NoteType = GENERAL        # Loại note (default: GENERAL)
}
```

#### CreateCustomerInput
```graphql
input CreateCustomerInput {
  # Required
  name: String!                       # Tên khách hàng (BẮT BUỘC)

  # Basic Info
  email: String                       # Email
  phone: String                       # Số điện thoại
  citizenId: String                   # CCCD (9 hoặc 12 số)
  type: String                        # INDIVIDUAL | BUSINESS | ORGANIZATION

  # Business Info
  companyName: String                 # Tên công ty
  taxCode: String                     # Mã số thuế (10 hoặc 13 số)
  address: String                     # Địa chỉ
  companySize: String                 # MICRO | SMALL | MEDIUM | LARGE | ENTERPRISE
  industry: String                    # IT | FINANCE | RETAIL | MANUFACTURING...
  contactPosition: String             # Chức vụ liên hệ
  contactDepartment: String           # Phòng ban liên hệ

  # Status & Tier
  status: String = "ACTIVE"           # ACTIVE | INACTIVE | PROSPECTIVE
  tier: String = "BRONZE"             # BRONZE | SILVER | GOLD | DIAMOND
  lifecycleStage: String = "PROSPECTIVE"  # PROSPECTIVE | TRIAL | CUSTOMER | LOYAL

  # Relations
  accountOwnerId: String              # ID workspace member (account owner)
  supportOwnerId: String              # ID workspace member (support owner)

  # Linked Accounts (JSONB)
  linkedAccounts: JSON                # Tài khoản liên kết (MKT, Google, Zalo...)

  # Initial Notes
  initialNotes: [CreateInitialNoteInput]  # Notes tạo cùng customer
}
```

#### UpdateCustomerInput
```graphql
input UpdateCustomerInput {
  # Required
  id: String!                         # Customer ID (BẮT BUỘC)

  # Optional - chỉ truyền fields cần thay đổi
  name: String
  email: String
  phone: String
  citizenId: String
  type: String
  companyName: String
  taxCode: String
  address: String
  companySize: String
  industry: String
  contactPosition: String
  contactDepartment: String
  status: String
  tier: String
  lifecycleStage: String
  accountOwnerId: String
  supportOwnerId: String
  linkedAccounts: JSON

  # New Notes
  newNotes: [CreateInitialNoteInput]  # Notes mới thêm vào customer
}
```

#### GetPurchaseHistoryArgs
```graphql
# Sử dụng @ArgsType - không cần input wrapper
type GetPurchaseHistoryArgs {
  customerId: String!                 # Customer ID (BẮT BUỘC)
  take: Int = 20                      # Số records (min: 1, max: 100)
  skip: Int = 0                       # Offset
  status: String                      # Filter by order status
  paymentStatus: String               # Filter by payment status
  sortBy: String = "createdAt"        # createdAt | totalAmount | orderCode
  sortOrder: String = "DESC"          # ASC | DESC
}
```

### 3.3 Output Types

#### CustomerNoteOutput
```graphql
type CustomerNoteOutput {
  id: String!
  content: String!
  noteType: String!                   # GENERAL | CALL | MEETING | ISSUE | FOLLOWUP | OTHER
  customerId: String
  createdAt: String!                  # ISO 8601
  updatedAt: String!                  # ISO 8601
}
```

#### CustomerOutput
```graphql
type CustomerOutput {
  # Basic Info
  id: String!
  mktCustomerCode: String!            # Auto-generated, read-only
  name: String!
  email: String
  phone: String
  citizenId: String
  type: String

  # Business Info
  companyName: String
  taxCode: String
  address: String
  companySize: String
  industry: String
  contactPosition: String
  contactDepartment: String

  # Status & Tier
  status: String!                     # ACTIVE | INACTIVE | PROSPECTIVE
  tier: String!                       # BRONZE | SILVER | GOLD | DIAMOND | CHURNED
  lastTierUpgradeAt: String           # ISO 8601
  lifecycleStage: String!             # PROSPECTIVE | TRIAL | CUSTOMER | LOYAL | CHURNED

  # Analytics - Currency (VND)
  totalOrderValue: Float              # Tổng giá trị đơn hàng
  customerLtv: Float                  # Customer Lifetime Value

  # Analytics - Integers
  licensesCount: Int                  # Số licenses
  totalOrderCount: Int                # Số đơn hàng
  churnRiskScore: Int                 # Điểm rủi ro (0-100)
  engagementScore: Int                # Điểm tương tác (0-100)

  # Dates (ISO 8601)
  registrationDate: String
  firstPurchase: String
  lastPurchase: String
  assignedDate: String
  assignedReason: String
  createdAt: String
  updatedAt: String

  # Relations
  accountOwnerId: String
  supportOwnerId: String

  # Created By
  createdBySource: String             # MANUAL | SYSTEM | IMPORT | API
  createdByName: String
  createdByWorkspaceMemberId: String

  # Linked Accounts
  linkedAccounts: JSON

  # Customer Notes
  customerNotes: [CustomerNoteOutput]
}
```

#### CustomerListOutput
```graphql
type CustomerListOutput {
  customers: [CustomerOutput]!
  totalCount: Int!
}
```

#### CreateCustomerResponseDto
```graphql
type CreateCustomerResponseDto {
  success: Boolean!
  customerId: String                  # ID của customer vừa tạo
  customerCode: String                # Mã customer (auto-generated)
  status: String                      # Status của customer
  error: String                       # Thông báo lỗi (nếu có)
}
```

#### UpdateCustomerResponseDto
```graphql
type UpdateCustomerResponseDto {
  success: Boolean!
  customerId: String
  updatedFields: [String]             # Danh sách fields đã cập nhật
  error: String
}
```

#### DeleteCustomerResponseDto
```graphql
type DeleteCustomerResponseDto {
  success: Boolean!
  customerId: String
  message: String
  error: String
}
```

#### RestoreCustomerResponseDto
```graphql
type RestoreCustomerResponseDto {
  success: Boolean!
  customerId: String
  status: String
  error: String
}
```

#### PurchaseHistoryOutput
```graphql
type PurchaseHistoryOutput {
  orders: [PurchaseOrderOutput]!
  summary: PurchaseSummaryOutput!
  pagination: PurchasePaginationOutput!
}

type PurchaseOrderOutput {
  id: String!
  orderCode: String!
  name: String!
  status: String
  paymentStatus: String
  totalAmount: Float!
  paidAmount: Float!
  remainingAmount: Float!
  discount: Float
  tax: Float
  subtotal: Float
  currency: String!
  createdAt: String!                  # ISO 8601
  updatedAt: String
  items: [PurchaseOrderItemOutput]!
}

type PurchaseOrderItemOutput {
  id: String!
  snapshotProductName: String
  snapshotPackageName: String
  quantity: Int!
  unitPrice: Float!
  totalPrice: Float!
  itemType: String
}

type PurchaseSummaryOutput {
  totalOrders: Int!
  totalSpent: Float!
  averageOrderValue: Float!
  firstPurchaseDate: String           # ISO 8601
  lastPurchaseDate: String            # ISO 8601
}

type PurchasePaginationOutput {
  take: Int!
  skip: Int!
  totalCount: Int!
  hasMore: Boolean!
}
```

---

## 4. Queries

### 4.1 getCustomerById

Lấy thông tin customer theo ID với customerNotes.

**GraphQL Schema:**
```graphql
type Query {
  getCustomerById(customerId: String!): CustomerOutput
}
```

**Request:**
```graphql
query GetCustomerById($customerId: String!) {
  getCustomerById(customerId: $customerId) {
    id
    mktCustomerCode
    name
    email
    phone
    status
    tier
    customerNotes {
      id
      content
      noteType
      createdAt
    }
    createdAt
    updatedAt
  }
}
```

**Variables:**
```json
{
  "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9"
}
```

**Response (Success):**
```json
{
  "data": {
    "getCustomerById": {
      "id": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
      "mktCustomerCode": "CUS-2026-000002",
      "name": "Trần Thị Bình",
      "email": "binh.tran@company.com",
      "phone": "0987654321",
      "status": "ACTIVE",
      "tier": "GOLD",
      "customerNotes": [
        {
          "id": "e7ca4624-dc0c-46f2-b189-db55eb3c76d6",
          "content": "Cuộc gọi hỗ trợ kỹ thuật",
          "noteType": "CALL",
          "createdAt": "2026-01-28T02:18:50.332Z"
        }
      ],
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-28T04:47:16.518Z"
    }
  }
}
```

**Response (Not Found):**
```json
{
  "data": {
    "getCustomerById": null
  }
}
```

---

### 4.2 getCustomerByCode

Lấy thông tin customer theo mã khách hàng.

**GraphQL Schema:**
```graphql
type Query {
  getCustomerByCode(customerCode: String!): CustomerOutput
}
```

**Request:**
```graphql
query GetCustomerByCode($customerCode: String!) {
  getCustomerByCode(customerCode: $customerCode) {
    id
    mktCustomerCode
    name
    email
    status
  }
}
```

**Variables:**
```json
{
  "customerCode": "CUS-2026-000002"
}
```

---

### 4.3 getCustomerByEmail

Lấy thông tin customer theo email.

**GraphQL Schema:**
```graphql
type Query {
  getCustomerByEmail(email: String!): CustomerOutput
}
```

**Request:**
```graphql
query GetCustomerByEmail($email: String!) {
  getCustomerByEmail(email: $email) {
    id
    mktCustomerCode
    name
    email
    status
  }
}
```

**Variables:**
```json
{
  "email": "binh.tran@company.com"
}
```

---

### 4.4 getCustomers

Lấy danh sách customers với pagination.

**GraphQL Schema:**
```graphql
type Query {
  getCustomers(take: Int = 50, skip: Int = 0): CustomerListOutput!
}
```

**Request:**
```graphql
query GetCustomers($take: Int, $skip: Int) {
  getCustomers(take: $take, skip: $skip) {
    customers {
      id
      mktCustomerCode
      name
      email
      status
      tier
      totalOrderValue
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "take": 20,
  "skip": 0
}
```

**Response:**
```json
{
  "data": {
    "getCustomers": {
      "customers": [
        {
          "id": "uuid-1",
          "mktCustomerCode": "CUS-2026-000001",
          "name": "Nguyễn Văn An",
          "email": "an.nguyen@company.com",
          "status": "ACTIVE",
          "tier": "SILVER",
          "totalOrderValue": 15000000
        },
        {
          "id": "uuid-2",
          "mktCustomerCode": "CUS-2026-000002",
          "name": "Trần Thị Bình",
          "email": "binh.tran@company.com",
          "status": "ACTIVE",
          "tier": "GOLD",
          "totalOrderValue": 50000000
        }
      ],
      "totalCount": 150
    }
  }
}
```

---

### 4.5 getCustomersByStatus

Lấy danh sách customers theo status.

**GraphQL Schema:**
```graphql
type Query {
  getCustomersByStatus(
    status: String!
    take: Int = 50
    skip: Int = 0
  ): CustomerListOutput!
}
```

**Request:**
```graphql
query GetCustomersByStatus($status: String!, $take: Int, $skip: Int) {
  getCustomersByStatus(status: $status, take: $take, skip: $skip) {
    customers {
      id
      name
      status
      tier
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "status": "ACTIVE",
  "take": 20,
  "skip": 0
}
```

---

### 4.6 getCustomersByTier

Lấy danh sách customers theo tier.

**GraphQL Schema:**
```graphql
type Query {
  getCustomersByTier(
    tier: String!
    take: Int = 50
    skip: Int = 0
  ): CustomerListOutput!
}
```

**Request:**
```graphql
query GetCustomersByTier($tier: String!, $take: Int, $skip: Int) {
  getCustomersByTier(tier: $tier, take: $take, skip: $skip) {
    customers {
      id
      name
      tier
      totalOrderValue
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "tier": "GOLD",
  "take": 20,
  "skip": 0
}
```

---

### 4.7 getCustomerPurchaseHistory

Lấy lịch sử mua hàng của customer với filters và pagination.

**GraphQL Schema:**
```graphql
type Query {
  getCustomerPurchaseHistory(
    customerId: String!
    take: Int = 20
    skip: Int = 0
    status: String
    paymentStatus: String
    sortBy: String = "createdAt"
    sortOrder: String = "DESC"
  ): PurchaseHistoryOutput!
}
```

**Request:**
```graphql
query GetCustomerPurchaseHistory(
  $customerId: String!
  $take: Int
  $skip: Int
  $status: String
  $paymentStatus: String
  $sortBy: String
  $sortOrder: String
) {
  getCustomerPurchaseHistory(
    customerId: $customerId
    take: $take
    skip: $skip
    status: $status
    paymentStatus: $paymentStatus
    sortBy: $sortBy
    sortOrder: $sortOrder
  ) {
    orders {
      id
      orderCode
      name
      status
      paymentStatus
      totalAmount
      paidAmount
      remainingAmount
      currency
      createdAt
      items {
        id
        snapshotProductName
        snapshotPackageName
        quantity
        unitPrice
        totalPrice
      }
    }
    summary {
      totalOrders
      totalSpent
      averageOrderValue
      firstPurchaseDate
      lastPurchaseDate
    }
    pagination {
      take
      skip
      totalCount
      hasMore
    }
  }
}
```

**Variables (Không filter):**
```json
{
  "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
  "take": 10,
  "skip": 0
}
```

**Variables (Với filter):**
```json
{
  "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
  "take": 10,
  "skip": 0,
  "status": "COMPLETED",
  "paymentStatus": "PAID",
  "sortBy": "totalAmount",
  "sortOrder": "DESC"
}
```

**Response:**
```json
{
  "data": {
    "getCustomerPurchaseHistory": {
      "orders": [
        {
          "id": "order-uuid-1",
          "orderCode": "ORD-2026-000123",
          "name": "Đơn hàng #123",
          "status": "COMPLETED",
          "paymentStatus": "PAID",
          "totalAmount": 5000000,
          "paidAmount": 5000000,
          "remainingAmount": 0,
          "currency": "VND",
          "createdAt": "2026-01-20T10:00:00.000Z",
          "items": [
            {
              "id": "item-uuid-1",
              "snapshotProductName": "MKT Pro License",
              "snapshotPackageName": "Annual Package",
              "quantity": 1,
              "unitPrice": 5000000,
              "totalPrice": 5000000
            }
          ]
        }
      ],
      "summary": {
        "totalOrders": 5,
        "totalSpent": 25000000,
        "averageOrderValue": 5000000,
        "firstPurchaseDate": "2025-06-15T10:00:00.000Z",
        "lastPurchaseDate": "2026-01-20T10:00:00.000Z"
      },
      "pagination": {
        "take": 10,
        "skip": 0,
        "totalCount": 5,
        "hasMore": false
      }
    }
  }
}
```

---

## 5. Mutations

### 5.1 createCustomer

Tạo mới customer với transaction support.

**GraphQL Schema:**
```graphql
type Mutation {
  createCustomer(input: CreateCustomerInput!): CreateCustomerResponseDto!
}
```

**Request:**
```graphql
mutation CreateCustomer($input: CreateCustomerInput!) {
  createCustomer(input: $input) {
    success
    customerId
    customerCode
    status
    error
  }
}
```

**Variables (Minimal):**
```json
{
  "input": {
    "name": "Nguyễn Văn Test"
  }
}
```

**Variables (Full với initialNotes):**
```json
{
  "input": {
    "name": "Công ty ABC",
    "email": "contact@abc.com",
    "phone": "0901234567",
    "type": "BUSINESS",
    "companyName": "Công ty TNHH ABC",
    "taxCode": "0123456789",
    "address": "123 Nguyễn Huệ, Q1, TP.HCM",
    "companySize": "MEDIUM",
    "industry": "IT",
    "contactPosition": "Giám đốc",
    "contactDepartment": "Ban điều hành",
    "status": "ACTIVE",
    "tier": "SILVER",
    "lifecycleStage": "CUSTOMER",
    "accountOwnerId": "20202020-0687-4c41-b707-ed1bfca972a7",
    "supportOwnerId": "20202020-77d5-4cb6-b60a-f4a835a85d61",
    "initialNotes": [
      {
        "content": "Khách hàng mới từ chiến dịch marketing Q1",
        "noteType": "GENERAL"
      },
      {
        "content": "Cuộc gọi giới thiệu sản phẩm - Khách hàng quan tâm",
        "noteType": "CALL"
      }
    ]
  }
}
```

**Response (Success):**
```json
{
  "data": {
    "createCustomer": {
      "success": true,
      "customerId": "67e0ec3b-8550-41f5-9617-43221ac28d89",
      "customerCode": "CUS-2026-000003",
      "status": "ACTIVE",
      "error": null
    }
  }
}
```

**Response (Validation Error):**
```json
{
  "data": {
    "createCustomer": {
      "success": false,
      "customerId": null,
      "customerCode": null,
      "status": null,
      "error": "Email đã tồn tại trong hệ thống"
    }
  }
}
```

---

### 5.2 updateCustomer

Cập nhật customer với transaction support.

**GraphQL Schema:**
```graphql
type Mutation {
  updateCustomer(input: UpdateCustomerInput!): UpdateCustomerResponseDto!
}
```

**Request:**
```graphql
mutation UpdateCustomer($input: UpdateCustomerInput!) {
  updateCustomer(input: $input) {
    success
    customerId
    updatedFields
    error
  }
}
```

**Variables (Update single field):**
```json
{
  "input": {
    "id": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
    "phone": "0987654321"
  }
}
```

**Variables (Update với newNotes):**
```json
{
  "input": {
    "id": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
    "phone": "0987654321",
    "tier": "GOLD",
    "newNotes": [
      {
        "content": "Cập nhật thông tin liên hệ",
        "noteType": "GENERAL"
      },
      {
        "content": "Khách hàng yêu cầu follow-up tuần sau",
        "noteType": "FOLLOWUP"
      }
    ]
  }
}
```

**Response (Success):**
```json
{
  "data": {
    "updateCustomer": {
      "success": true,
      "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
      "updatedFields": ["phone", "tier"],
      "error": null
    }
  }
}
```

**Response (Not Found):**
```json
{
  "data": {
    "updateCustomer": {
      "success": false,
      "customerId": null,
      "updatedFields": null,
      "error": "Customer not found: invalid-uuid"
    }
  }
}
```

---

### 5.3 deleteCustomer

Soft delete customer.

**GraphQL Schema:**
```graphql
type Mutation {
  deleteCustomer(customerId: String!): DeleteCustomerResponseDto!
}
```

**Request:**
```graphql
mutation DeleteCustomer($customerId: String!) {
  deleteCustomer(customerId: $customerId) {
    success
    customerId
    message
    error
  }
}
```

**Variables:**
```json
{
  "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9"
}
```

**Response (Success):**
```json
{
  "data": {
    "deleteCustomer": {
      "success": true,
      "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
      "message": "Customer deleted successfully",
      "error": null
    }
  }
}
```

---

### 5.4 restoreCustomer

Khôi phục customer đã bị soft delete.

**GraphQL Schema:**
```graphql
type Mutation {
  restoreCustomer(customerId: String!): RestoreCustomerResponseDto!
}
```

**Request:**
```graphql
mutation RestoreCustomer($customerId: String!) {
  restoreCustomer(customerId: $customerId) {
    success
    customerId
    status
    error
  }
}
```

**Variables:**
```json
{
  "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9"
}
```

**Response (Success):**
```json
{
  "data": {
    "restoreCustomer": {
      "success": true,
      "customerId": "1e75547f-3d1c-4da8-99a9-b716f3b17ab9",
      "status": "ACTIVE",
      "error": null
    }
  }
}
```

---

## 6. Error Handling

### Error Response Structure

Tất cả mutations trả về response có cấu trúc nhất quán:

```typescript
{
  success: boolean;      // true nếu thành công
  customerId?: string;   // ID customer (nếu có)
  error?: string;        // Thông báo lỗi (nếu thất bại)
}
```

### Error Types

| Error | Cause | Response |
|-------|-------|----------|
| `Customer not found: {id}` | ID không tồn tại hoặc đã bị xóa | `success: false` |
| `Email đã tồn tại trong hệ thống` | Email trùng với customer khác | `success: false` |
| `CCCD đã tồn tại trong hệ thống` | CitizenId trùng | `success: false` |
| `Mã số thuế đã tồn tại` | TaxCode trùng | `success: false` |
| `UNAUTHENTICATED` | Token không hợp lệ | GraphQL error |
| `FORBIDDEN` | Không có quyền truy cập workspace | GraphQL error |

### Validation Rules

| Field | Validation |
|-------|------------|
| `name` | Required, không được trống |
| `email` | Email format, unique |
| `citizenId` | 9 hoặc 12 số, unique |
| `taxCode` | 10 hoặc 13 số, unique |
| `phone` | Số điện thoại Việt Nam |

---

## 7. Usage Examples

### 7.1 cURL Examples

**Query - Get customer by ID:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "query { getCustomerById(customerId: \"1e75547f-3d1c-4da8-99a9-b716f3b17ab9\") { id name email status tier customerNotes { id content noteType } } }"
  }'
```

**Query - Get purchase history:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "query { getCustomerPurchaseHistory(customerId: \"uuid\", take: 10) { orders { orderCode totalAmount } summary { totalOrders totalSpent } } }"
  }'
```

**Mutation - Create customer:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { createCustomer(input: { name: \"Test Customer\", email: \"test@example.com\" }) { success customerId customerCode error } }"
  }'
```

**Mutation - Update customer with notes:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { updateCustomer(input: { id: \"uuid\", phone: \"0987654321\", newNotes: [{ content: \"Updated contact\", noteType: \"GENERAL\" }] }) { success updatedFields error } }"
  }'
```

---

## 8. TypeScript Interfaces

```typescript
// ============ Enum Types ============
type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECTIVE';
type CustomerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'CHURNED';
type LifecycleStage = 'PROSPECTIVE' | 'TRIAL' | 'CUSTOMER' | 'LOYAL' | 'CHURNED';
type CustomerType = 'INDIVIDUAL' | 'BUSINESS' | 'ORGANIZATION';
type CompanySize = 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
type NoteType = 'GENERAL' | 'CALL' | 'MEETING' | 'ISSUE' | 'FOLLOWUP' | 'OTHER';

// ============ Input Types ============
type CreateInitialNoteInput = {
  content: string;
  noteType?: NoteType;
};

type CreateCustomerInput = {
  name: string;
  email?: string;
  phone?: string;
  citizenId?: string;
  type?: CustomerType;
  companyName?: string;
  taxCode?: string;
  address?: string;
  companySize?: CompanySize;
  industry?: string;
  contactPosition?: string;
  contactDepartment?: string;
  status?: CustomerStatus;
  tier?: CustomerTier;
  lifecycleStage?: LifecycleStage;
  accountOwnerId?: string;
  supportOwnerId?: string;
  linkedAccounts?: LinkedAccount[];
  initialNotes?: CreateInitialNoteInput[];
};

type UpdateCustomerInput = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  citizenId?: string;
  type?: CustomerType;
  companyName?: string;
  taxCode?: string;
  address?: string;
  companySize?: CompanySize;
  industry?: string;
  contactPosition?: string;
  contactDepartment?: string;
  status?: CustomerStatus;
  tier?: CustomerTier;
  lifecycleStage?: LifecycleStage;
  accountOwnerId?: string;
  supportOwnerId?: string;
  linkedAccounts?: LinkedAccount[];
  newNotes?: CreateInitialNoteInput[];
};

type GetPurchaseHistoryArgs = {
  customerId: string;
  take?: number;      // Default: 20, Min: 1, Max: 100
  skip?: number;      // Default: 0
  status?: string;
  paymentStatus?: string;
  sortBy?: 'createdAt' | 'totalAmount' | 'orderCode';
  sortOrder?: 'ASC' | 'DESC';
};

// ============ Output Types ============
type CustomerNoteOutput = {
  id: string;
  content: string;
  noteType: string;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
};

type CustomerOutput = {
  id: string;
  mktCustomerCode: string;
  name: string;
  email?: string;
  phone?: string;
  citizenId?: string;
  type?: string;
  companyName?: string;
  taxCode?: string;
  address?: string;
  companySize?: string;
  industry?: string;
  contactPosition?: string;
  contactDepartment?: string;
  status: string;
  tier: string;
  lastTierUpgradeAt?: string;
  lifecycleStage: string;
  totalOrderValue?: number;
  customerLtv?: number;
  licensesCount?: number;
  totalOrderCount?: number;
  churnRiskScore?: number;
  engagementScore?: number;
  registrationDate?: string;
  firstPurchase?: string;
  lastPurchase?: string;
  assignedDate?: string;
  assignedReason?: string;
  createdAt?: string;
  updatedAt?: string;
  accountOwnerId?: string;
  supportOwnerId?: string;
  createdBySource?: string;
  createdByName?: string;
  createdByWorkspaceMemberId?: string;
  linkedAccounts?: LinkedAccount[];
  customerNotes?: CustomerNoteOutput[];
};

type CustomerListOutput = {
  customers: CustomerOutput[];
  totalCount: number;
};

type CreateCustomerResponse = {
  success: boolean;
  customerId?: string;
  customerCode?: string;
  status?: string;
  error?: string;
};

type UpdateCustomerResponse = {
  success: boolean;
  customerId?: string;
  updatedFields?: string[];
  error?: string;
};

type DeleteCustomerResponse = {
  success: boolean;
  customerId?: string;
  message?: string;
  error?: string;
};

type RestoreCustomerResponse = {
  success: boolean;
  customerId?: string;
  status?: string;
  error?: string;
};

type PurchaseOrderItemOutput = {
  id: string;
  snapshotProductName?: string;
  snapshotPackageName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemType?: string;
};

type PurchaseOrderOutput = {
  id: string;
  orderCode: string;
  name: string;
  status?: string;
  paymentStatus?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  discount?: number;
  tax?: number;
  subtotal?: number;
  currency: string;
  createdAt: string;
  updatedAt?: string;
  items: PurchaseOrderItemOutput[];
};

type PurchaseSummaryOutput = {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
};

type PurchasePaginationOutput = {
  take: number;
  skip: number;
  totalCount: number;
  hasMore: boolean;
};

type PurchaseHistoryOutput = {
  orders: PurchaseOrderOutput[];
  summary: PurchaseSummaryOutput;
  pagination: PurchasePaginationOutput;
};

type LinkedAccount = {
  provider: string;
  externalId: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  isPrimary?: boolean;
  status?: string;
  linkedAt?: string;
};
```

---

## Related Documentation

- [Customer Note Resolver API Docs](./mkt-customer-note.resolver.api-docs.md)
- [Customer Module Overview](../README.md)

---

**Document Version**: 1.0.0
**Author**: Backend Team
**Last Updated**: 2026-01-28
