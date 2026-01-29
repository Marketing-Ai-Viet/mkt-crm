# MktDigitalProductResolver - Test Cases

## Overview

Tài liệu test cases cho `MktDigitalProductResolver` - GraphQL resolver để truy vấn digital products và packages từ MKT Server.

## Authentication

Tất cả queries yêu cầu authentication:
- `WorkspaceAuthGuard`
- `UserAuthGuard`

**Headers cần thiết:**
```
Authorization: Bearer <access_token>
```

---

## Sample Data từ Redis

### Product Sample
```json
{
  "id": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
  "productName": "Enterprise Tự động hóa Marketing",
  "productDescription": "Hệ thống thông minh tích hợp nhiều tính năng...",
  "code": "PRODUCT_001_2026",
  "status": "active",
  "version": "2.8.1",
  "basePrice": 878.06,
  "iconUrl": "https://picsum.photos/seed/oRyg4DyCP/128/128",
  "bannerUrl": "https://picsum.photos/seed/Lq5LWrxzeO/1200/400"
}
```

### Package Sample
```json
{
  "id": "0199e6e1-7935-714e-b8fa-7a2f2e78c643",
  "packageCode": "BASIC-MONTHLY",
  "packageName": "Gói Cơ Bản - Tháng",
  "packageDescription": "Gói cơ bản phù hợp cho cá nhân...",
  "packageType": "basic",
  "currency": "VND",
  "billingCycle": "monthly",
  "durationDays": 30,
  "isActive": true,
  "price": 299000,
  "productId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
}
```

---

## Test Cases

### 1. mktDigitalProduct - Lấy product theo ID

#### TC-1.1: Success - Product tồn tại

**GraphQL Query:**
```graphql
query GetProductById {
  mktDigitalProduct(productId: "0199e0fd-fe2b-714f-b502-11dff2d3b28e") {
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
        status
        price
        currency
        billingPeriod
        trialDays
      }
    }
  }
}
```

**Expected Response:**
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
        "description": "Hệ thống thông minh tích hợp nhiều tính năng...",
        "code": "PRODUCT_001_2026",
        "status": "active",
        "version": "2.8.1",
        "iconUrl": "https://picsum.photos/seed/oRyg4DyCP/128/128",
        "bannerUrl": "https://picsum.photos/seed/Lq5LWrxzeO/1200/400",
        "metadata": {},
        "createdAt": "2026-01-19T06:35:37.550Z",
        "updatedAt": null,
        "packages": [
          {
            "id": "0199e6e1-7935-714e-b8fa-7a2f2e78c643",
            "packageCode": "BASIC-MONTHLY",
            "packageName": "Gói Cơ Bản - Tháng",
            "status": "basic",
            "price": 299000,
            "currency": "VND",
            "billingPeriod": "monthly",
            "trialDays": 30
          }
        ]
      }
    }
  }
}
```

#### TC-1.2: Fail - Product không tồn tại

**GraphQL Query:**
```graphql
query GetProductById {
  mktDigitalProduct(productId: "non-existent-id") {
    success
    message
    error
    data {
      id
      name
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "mktDigitalProduct": {
      "success": false,
      "message": null,
      "error": "Product not found with id: non-existent-id",
      "data": null
    }
  }
}
```

#### TC-1.3: Fail - Invalid UUID format

**GraphQL Query:**
```graphql
query GetProductById {
  mktDigitalProduct(productId: "invalid-uuid") {
    success
    error
  }
}
```

**Expected:** Error response hoặc validation error

---

### 2. mktDigitalProductByCode - Lấy product theo code

#### TC-2.1: Success - Code tồn tại

**GraphQL Query:**
```graphql
query GetProductByCode {
  mktDigitalProductByCode(code: "PRODUCT_001_2026") {
    success
    message
    error
    data {
      id
      name
      code
      status
      packages {
        id
        packageCode
        packageName
      }
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "mktDigitalProductByCode": {
      "success": true,
      "message": "Product retrieved successfully",
      "error": null,
      "data": {
        "id": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
        "name": "Enterprise Tự động hóa Marketing",
        "code": "PRODUCT_001_2026",
        "status": "active",
        "packages": [...]
      }
    }
  }
}
```

#### TC-2.2: Fail - Code không tồn tại

**GraphQL Query:**
```graphql
query GetProductByCode {
  mktDigitalProductByCode(code: "NON_EXISTENT_CODE") {
    success
    error
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "mktDigitalProductByCode": {
      "success": false,
      "error": "Product not found with code: NON_EXISTENT_CODE"
    }
  }
}
```

---

### 3. mktDigitalProducts - Lấy danh sách products (paginated)

#### TC-3.1: Success - Không có filter

**GraphQL Query:**
```graphql
query GetProducts {
  mktDigitalProducts {
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
      code
      status
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "mktDigitalProducts": {
      "success": true,
      "message": "Products retrieved successfully",
      "error": null,
      "total": 10,
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "data": [
        {
          "id": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
          "name": "Enterprise Tự động hóa Marketing",
          "code": "PRODUCT_001_2026",
          "status": "active"
        }
      ]
    }
  }
}
```

#### TC-3.2: Success - Với pagination

**GraphQL Query:**
```graphql
query GetProductsPaginated {
  mktDigitalProducts(input: { page: 2, limit: 5 }) {
    success
    total
    page
    limit
    totalPages
    data {
      id
      name
    }
  }
}
```

#### TC-3.3: Success - Filter theo status

**GraphQL Query:**
```graphql
query GetActiveProducts {
  mktDigitalProducts(input: { status: "active" }) {
    success
    data {
      id
      name
      status
    }
  }
}
```

#### TC-3.4: Success - Search theo keyword

**GraphQL Query:**
```graphql
query SearchProducts {
  mktDigitalProducts(input: { search: "Marketing" }) {
    success
    data {
      id
      name
    }
  }
}
```

#### TC-3.5: Success - Sort theo field

**GraphQL Query:**
```graphql
query SortProducts {
  mktDigitalProducts(input: {
    sortBy: CREATED_AT,
    sortOrder: DESC
  }) {
    success
    data {
      id
      name
      createdAt
    }
  }
}
```

#### TC-3.6: Success - Filter theo ngôn ngữ

**GraphQL Query:**
```graphql
query GetProductsInEnglish {
  mktDigitalProducts(input: { lang: "en" }) {
    success
    data {
      id
      name
      description
    }
  }
}
```

---

### 4. mktDigitalPackage - Lấy package theo ID

#### TC-4.1: Success - Package tồn tại (với productId)

**GraphQL Query:**
```graphql
query GetPackageById {
  mktDigitalPackage(input: {
    packageId: "0199e6e1-7935-714e-b8fa-7a2f2e78c643",
    productId: "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
  }) {
    success
    message
    error
    data {
      id
      packageCode
      packageName
      packageDescription
      status
      currency
      billingPeriod
      trialDays
      price
      metadata
      productId
      createdAt
      updatedAt
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "mktDigitalPackage": {
      "success": true,
      "message": "Package retrieved successfully",
      "error": null,
      "data": {
        "id": "0199e6e1-7935-714e-b8fa-7a2f2e78c643",
        "packageCode": "BASIC-MONTHLY",
        "packageName": "Gói Cơ Bản - Tháng",
        "packageDescription": "Gói cơ bản phù hợp cho cá nhân...",
        "status": "basic",
        "currency": "VND",
        "billingPeriod": "monthly",
        "trialDays": 30,
        "price": 299000,
        "metadata": {},
        "productId": "0199e0fd-fe2b-714f-b502-11dff2d3b28e",
        "createdAt": "2026-01-19T06:35:37.567Z",
        "updatedAt": null
      }
    }
  }
}
```

#### TC-4.2: Success - Package tồn tại (không có productId)

**GraphQL Query:**
```graphql
query GetPackageById {
  mktDigitalPackage(input: {
    packageId: "0199e6e1-7935-714e-b8fa-7a2f2e78c643"
  }) {
    success
    data {
      id
      packageCode
    }
  }
}
```

**Note:** Query sẽ chậm hơn vì phải tìm trong tất cả products

#### TC-4.3: Fail - Package không tồn tại

**GraphQL Query:**
```graphql
query GetPackageById {
  mktDigitalPackage(input: { packageId: "non-existent-id" }) {
    success
    error
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "mktDigitalPackage": {
      "success": false,
      "error": "Package not found with id: non-existent-id"
    }
  }
}
```

---

### 5. mktDigitalPackagesByProduct - Lấy packages theo product ID

#### TC-5.1: Success - Lấy tất cả packages

**GraphQL Query:**
```graphql
query GetPackagesByProduct {
  mktDigitalPackagesByProduct(input: {
    productId: "0199e0fd-fe2b-714f-b502-11dff2d3b28e"
  }) {
    success
    message
    error
    data {
      id
      packageCode
      packageName
      status
      price
      currency
      billingPeriod
      trialDays
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "mktDigitalPackagesByProduct": {
      "success": true,
      "message": "Packages retrieved successfully",
      "error": null,
      "data": [
        {
          "id": "0199e6e1-7935-714e-b8fa-7a2f2e78c643",
          "packageCode": "BASIC-MONTHLY",
          "packageName": "Gói Cơ Bản - Tháng",
          "status": "basic",
          "price": 299000,
          "currency": "VND",
          "billingPeriod": "monthly",
          "trialDays": 30
        },
        {
          "id": "0199e6e1-7935-714e-b8fa-7c6cbc5a7f30",
          "packageCode": "PRO-YEARLY",
          "packageName": "Gói Chuyên Nghiệp - Năm",
          "status": "pro",
          "price": 2990000,
          "currency": "VND",
          "billingPeriod": "yearly",
          "trialDays": 365
        },
        {
          "id": "0199e6e1-7935-714e-b8fa-8370ec4b8f16",
          "packageCode": "ENTERPRISE-LIFETIME",
          "packageName": "Gói Doanh Nghiệp - Vĩnh Viễn",
          "status": "enterprise",
          "price": 19990000,
          "currency": "VND",
          "billingPeriod": "lifetime",
          "trialDays": 0
        }
      ]
    }
  }
}
```

#### TC-5.2: Success - Filter packages active

**GraphQL Query:**
```graphql
query GetActivePackages {
  mktDigitalPackagesByProduct(input: {
    productId: "0199e0fd-fe2e-718d-bafd-533d14117ca5",
    isActive: true
  }) {
    success
    data {
      id
      packageCode
      packageName
    }
  }
}
```

**Note:** Chỉ trả về packages có `isActive: true`

#### TC-5.3: Success - Filter packages inactive

**GraphQL Query:**
```graphql
query GetInactivePackages {
  mktDigitalPackagesByProduct(input: {
    productId: "0199e0fd-fe2e-718d-bafd-533d14117ca5",
    isActive: false
  }) {
    success
    data {
      id
      packageCode
      packageName
    }
  }
}
```

#### TC-5.4: Fail - Missing productId

**GraphQL Query:**
```graphql
query GetPackagesNoProductId {
  mktDigitalPackagesByProduct(input: {}) {
    success
    error
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "mktDigitalPackagesByProduct": {
      "success": false,
      "error": "Product ID is required"
    }
  }
}
```

#### TC-5.5: Success - Product không có packages

**GraphQL Query:**
```graphql
query GetPackagesEmptyProduct {
  mktDigitalPackagesByProduct(input: {
    productId: "product-without-packages"
  }) {
    success
    data {
      id
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "mktDigitalPackagesByProduct": {
      "success": true,
      "data": []
    }
  }
}
```

---

## Redis Cache Keys

### Product Keys
| Pattern | Description | Example |
|---------|-------------|---------|
| `mkt:product:digital:{id}` | Product data by ID | `mkt:product:digital:0199e0fd-fe2b-714f-b502-11dff2d3b28e` |
| `mkt:product:digital:code:{code}` | Product ID mapping by code | `mkt:product:digital:code:PRODUCT_001_2026` |
| `mkt:product:digital:pkgs:{productId}` | Packages array by product ID | `mkt:product:digital:pkgs:0199e0fd-fe2b-714f-b502-11dff2d3b28e` |

### TTL
- Default: 24 hours (86400 seconds)

### Verify Cache

```bash
# List all product keys
redis-cli KEYS "mkt:product:*"

# Get product by ID
redis-cli GET "mkt:product:digital:0199e0fd-fe2b-714f-b502-11dff2d3b28e"

# Get packages by product
redis-cli GET "mkt:product:digital:pkgs:0199e0fd-fe2b-714f-b502-11dff2d3b28e"

# Get product ID by code
redis-cli GET "mkt:product:digital:code:PRODUCT_001_2026"

# Check TTL
redis-cli TTL "mkt:product:digital:0199e0fd-fe2b-714f-b502-11dff2d3b28e"
```

---

## Test Data IDs

### Products
| Code | ID | Name |
|------|-------|------|
| `PRODUCT_001_2026` | `0199e0fd-fe2b-714f-b502-11dff2d3b28e` | Enterprise Tự động hóa Marketing |
| `PRODUCT_003_2026` | `0199e0fd-fe2e-718d-bafd-533d14117ca5` | Smart Phân tích & Báo cáo |

### Packages (Product 001)
| Code | ID | Type | Price |
|------|-------|------|-------|
| `BASIC-MONTHLY` | `0199e6e1-7935-714e-b8fa-7a2f2e78c643` | basic | 299,000 VND |
| `PRO-YEARLY` | `0199e6e1-7935-714e-b8fa-7c6cbc5a7f30` | pro | 2,990,000 VND |
| `ENTERPRISE-LIFETIME` | `0199e6e1-7935-714e-b8fa-8370ec4b8f16` | enterprise | 19,990,000 VND |

### Packages (Product 003)
| Code | ID | Type | Price | isActive |
|------|-------|------|-------|----------|
| `ANALYTICS-BASIC` | `0199e6e1-7935-714e-b8fa-a04c464b1cfc` | basic | 149,000 VND | true |
| `ANALYTICS-PRO` | `0199e6e1-7935-714e-b8fa-a4b9618ac450` | pro | 1,490,000 VND | true |
| `ANALYTICS-ENTERPRISE` | `0199e6e1-7936-74cf-a2bd-c9695ec89ebf` | enterprise | 9,990,000 VND | **false** |

---

## Error Scenarios

### Authentication Errors
| Scenario | Expected |
|----------|----------|
| No Authorization header | 401 Unauthorized |
| Invalid token | 401 Unauthorized |
| Expired token | 401 Unauthorized |

### Validation Errors
| Scenario | Expected |
|----------|----------|
| Empty productId | GraphQL validation error |
| Invalid UUID format | Service error or validation error |

### Service Errors
| Scenario | Expected |
|----------|----------|
| MKT Server unavailable | Error from cached data or service error |
| Redis unavailable | Fallback to API or error |
| Network timeout | Timeout error with retry |

---

## Field Mapping Reference

### Product: MktProduct → MktDigitalProductDto
| Source | Target | Note |
|--------|--------|------|
| `id` | `id` | |
| `productName` | `name` | Renamed |
| `productDescription` | `description` | Renamed |
| `code` | `code` | |
| `status` | `status` | |
| `version` | `version` | |
| `iconUrl` | `iconUrl` | |
| `bannerUrl` | `bannerUrl` | |
| `metadata` | `metadata` | |
| `packages` | `packages` | Array of MktDigitalPackageDto |
| `createdAt` | `createdAt` | |
| `updatedAt` | `updatedAt` | |
| ~~productOverview~~ | - | Removed |
| ~~basePrice~~ | - | Removed |
| ~~gallery~~ | - | Removed |
| ~~sortOrder~~ | - | Removed |

### Package: MktProductPackage → MktDigitalPackageDto
| Source | Target | Note |
|--------|--------|------|
| `id` | `id` | |
| `packageCode` | `packageCode` | |
| `packageName` | `packageName` | |
| `packageDescription` | `packageDescription` | |
| `packageType` | `status` | Renamed |
| `currency` | `currency` | |
| `billingCycle` | `billingPeriod` | Renamed |
| `durationDays` | `trialDays` | Renamed, default 0 |
| `price` | `price` | |
| `metadata` | `metadata` | |
| `productId` | `productId` | |
| `createdAt` | `createdAt` | |
| `updatedAt` | `updatedAt` | |
| ~~licenseType~~ | - | Removed |
| ~~isActive~~ | - | Removed (used for filtering only) |
