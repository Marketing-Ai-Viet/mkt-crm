# MKT Digital Product API - Frontend Developer Guide

## Overview

API GraphQL để truy vấn thông tin Digital Products và Packages từ MKT Server.

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Bearer Token (required)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## Queries

### 1. mktDigitalProduct

Lấy thông tin chi tiết một product theo ID.

**Query:**
```graphql
query GetProduct($productId: String!) {
  mktDigitalProduct(productId: $productId) {
    success
    message
    error
    data {
      id
      name
      description
      code
      status
      version
      iconUrl
      bannerUrl
      metadata
      createdAt
      updatedAt
      packages {
        id
        packageCode
        packageName
        packageDescription
        status
        price
        currency
        billingPeriod
        trialDays
        metadata
        productId
        createdAt
        updatedAt
      }
    }
  }
}
```

**Variables:**
```json
{
  "productId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
}
```

**Response Success:**
```json
{
  "data": {
    "mktDigitalProduct": {
      "success": true,
      "message": "Product retrieved successfully",
      "error": null,
      "data": {
        "id": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
        "name": "Enterprise Tự động hóa Marketing",
        "description": "Hệ thống thông minh...",
        "code": "PRODUCT_001_2026",
        "status": "active",
        "version": "2.8.1",
        "iconUrl": "https://...",
        "bannerUrl": "https://...",
        "packages": [...]
      }
    }
  }
}
```

**Response Error:**
```json
{
  "data": {
    "mktDigitalProduct": {
      "success": false,
      "error": "Product not found with ID: xxx",
      "data": null
    }
  }
}
```

---

### 2. mktDigitalProductById

Alias của `mktDigitalProduct` - Lấy product theo ID.

**Query:**
```graphql
query GetProductById($productId: String!) {
  mktDigitalProductById(productId: $productId) {
    success
    message
    error
    data {
      id
      name
      code
      status
    }
  }
}
```

---

### 3. mktDigitalProducts

Lấy danh sách products với pagination và filter.

**Query:**
```graphql
query GetProducts($input: MktDigitalProductQueryInput) {
  mktDigitalProducts(input: $input) {
    success
    message
    error
    total
    page
    limit
    totalPages
    data {
      id
      name
      description
      code
      status
      version
      iconUrl
      bannerUrl
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "page": 1,
    "limit": 10,
    "status": "ACTIVE",
    "search": "Marketing",
    "lang": "VI",
    "sortBy": "CREATED_AT",
    "sortOrder": "DESC"
  }
}
```

**Input Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Int | 1 | Số trang |
| `limit` | Int | 10 | Số items mỗi trang (max: 100) |
| `status` | Enum | - | Filter theo status |
| `search` | String | - | Tìm kiếm theo tên/mô tả |
| `lang` | Enum | - | Ngôn ngữ (VI/EN/KO) |
| `sortBy` | Enum | - | Field để sort |
| `sortOrder` | Enum | - | Thứ tự sort (ASC/DESC) |

**Response:**
```json
{
  "data": {
    "mktDigitalProducts": {
      "success": true,
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "data": [
        { "id": "...", "name": "...", "code": "...", "status": "active" }
      ]
    }
  }
}
```

---

### 4. mktDigitalPackage

Lấy thông tin chi tiết một package theo ID.

**Query:**
```graphql
query GetPackage($input: MktDigitalSinglePackageInput!) {
  mktDigitalPackage(input: $input) {
    success
    message
    error
    data {
      id
      packageCode
      packageName
      packageDescription
      status
      price
      currency
      billingPeriod
      trialDays
      metadata
      productId
      createdAt
      updatedAt
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "packageId": "0199e6e1-7935-714e-b8fa-7a2f2e78c643",
    "productId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `packageId` | String | **Yes** | ID của package |
| `productId` | String | No | ID của product (giúp tối ưu cache) |

---

### 5. mktDigitalPackagesByProduct

Lấy danh sách packages của một product.

**Query:**
```graphql
query GetPackagesByProduct($input: MktDigitalPackageQueryInput!) {
  mktDigitalPackagesByProduct(input: $input) {
    success
    message
    error
    data {
      id
      packageCode
      packageName
      packageDescription
      status
      price
      currency
      billingPeriod
      trialDays
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "productId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
    "isActive": true
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `productId` | String | **Yes** | ID của product |
| `isActive` | Boolean | No | Filter theo trạng thái active |

---

## Types

### MktDigitalProductDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Product ID (UUID) |
| `name` | String | No | Tên product |
| `description` | String | Yes | Mô tả |
| `code` | String | No | Mã product (unique) |
| `status` | String | No | `active`, `beta`, `inactive`, `deprecated` |
| `version` | String | Yes | Phiên bản |
| `iconUrl` | String | Yes | URL icon |
| `bannerUrl` | String | Yes | URL banner |
| `metadata` | JSON | Yes | Metadata tùy chỉnh |
| `packages` | Array | Yes | Danh sách packages |
| `createdAt` | String | No | ISO 8601 datetime |
| `updatedAt` | String | Yes | ISO 8601 datetime |

### MktDigitalPackageDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Package ID (UUID) |
| `packageCode` | String | No | Mã package (unique) |
| `packageName` | String | No | Tên package |
| `packageDescription` | String | Yes | Mô tả |
| `status` | String | No | `basic`, `pro`, `enterprise`, ... |
| `currency` | String | No | `VND`, `USD`, `EUR` |
| `billingPeriod` | String | No | `monthly`, `quarterly`, `yearly`, `one_time`, `lifetime` |
| `trialDays` | Int | No | Số ngày trial |
| `price` | Float | No | Giá |
| `metadata` | JSON | Yes | Metadata tùy chỉnh |
| `productId` | String | No | ID của product cha |
| `createdAt` | String | No | ISO 8601 datetime |
| `updatedAt` | String | Yes | ISO 8601 datetime |

---

## Enums

### MktProductStatusFilter
| Value | Description |
|-------|-------------|
| `ACTIVE` | Đang hoạt động |
| `BETA` | Đang thử nghiệm |
| `INACTIVE` | Không hoạt động |
| `DEPRECATED` | Đã ngừng hỗ trợ |

### MktSupportedLanguageInput
| Value | Description |
|-------|-------------|
| `VI` | Tiếng Việt |
| `EN` | Tiếng Anh |
| `KO` | Tiếng Hàn |

### MktProductSortBy
| Value | Description |
|-------|-------------|
| `SORT_ORDER` | Thứ tự sắp xếp |
| `CREATED_AT` | Ngày tạo |
| `UPDATED_AT` | Ngày cập nhật |
| `CODE` | Mã product |

### MktSortOrder
| Value | Description |
|-------|-------------|
| `ASC` | Tăng dần |
| `DESC` | Giảm dần |

---

## Error Codes

| Error Message | Description |
|---------------|-------------|
| `Product not found with ID: xxx` | Product không tồn tại |
| `Package not found with ID: xxx` | Package không tồn tại |
| `productId is required` | Thiếu productId khi query packages |
| `Forbidden resource` | Token không hợp lệ hoặc hết hạn |

---

## Response Format

Tất cả responses đều có cấu trúc:

```json
{
  "success": true/false,
  "data": { ... },         // Nếu success=true
  "message": "...",        // Message thành công
  "error": "..."           // Nếu success=false
}
```

**List Response** có thêm pagination:
```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```
