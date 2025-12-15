# External Product Integration Architecture

## Tổng quan

Document này mô tả kiến trúc tích hợp **Product** và **ProductPackage** từ **MKT Server** vào hệ thống Order của CRM, sử dụng module **oauth2-client** đã được triển khai.

### Source System

| Thuộc tính | Giá trị |
|------------|---------|
| **Server** | MKT Server (NestJS) |
| **Base URL (Dev)** | `http://localhost:3006` |
| **Base URL (Prod)** | `https://api.mkt-server.com` |
| **Authentication** | OAuth 2.0 Client Credentials Grant |
| **Token Algorithm** | RS256 (RSA with SHA-256) |
| **Token Lifetime** | 3600 seconds (1 hour) |

### Existing Infrastructure

Module `oauth2-client` đã triển khai tại:
```
packages/twenty-server/src/mkt-core/oauth2-client/
```

---

## Mục lục

1. [Existing OAuth2 Client Module](#existing-oauth2-client-module)
2. [MKT Server API Reference](#mkt-server-api-reference)
3. [Kiến trúc đề xuất](#kiến-trúc-đề-xuất)
4. [Schema Design](#schema-design)
5. [Product Proxy Service](#product-proxy-service)
6. [Caching Strategy](#caching-strategy)
7. [Migration Guide](#migration-guide)

---

## Existing OAuth2 Client Module

### Module Structure

```
oauth2-client/
├── oauth2-client.module.ts
├── services/
│   ├── oauth2-client.service.ts      # Token lifecycle management
│   ├── oauth2-http.service.ts        # HTTP wrapper với auto retry
│   ├── oauth2-cache.service.ts       # LRU + Redis caching
│   ├── oauth2-rate-limiter.service.ts
│   ├── oauth2-circuit-breaker.service.ts
│   └── oauth2-lock.service.ts        # Distributed lock
├── types/
│   └── oauth2-client.types.ts
├── constants/
│   └── oauth2-client-messages.constant.ts
├── config/
│   └── oauth2-client.config.ts
├── dto/
├── resolvers/
└── license/                           # License proxy (existing)
    ├── services/
    │   └── license-proxy.service.ts
    ├── dto/
    ├── resolvers/
    └── constants/
```

### Core Services (Đã triển khai)

| Service | Chức năng |
|---------|-----------|
| `OAuth2ClientService` | Token lifecycle, auto-refresh (30s interval), 300s threshold |
| `OAuth2HttpService` | HTTP wrapper, auto 401 recovery, retry logic (3 retries) |
| `OAuth2CacheService` | Two-tier: LRU (10 entries) + Redis (1h TTL) |
| `OAuth2RateLimiterService` | 10 attempts per 60s window |
| `OAuth2CircuitBreakerService` | 5 failures → OPEN, 60s reset |
| `OAuth2LockService` | Distributed lock (5s TTL) |

### Environment Configuration

```env
# Đã được config trong oauth2-client.config.ts
MKT_API_BASE_URL=http://localhost:3006
MKT_OAUTH_CLIENT_ID=crm_twenty
MKT_OAUTH_CLIENT_SECRET=your-secret-min-32-chars

# Optional (có defaults)
MKT_OAUTH_SCOPES=products:read products:write
OAUTH2_TOKEN_ENDPOINT=/oauth/token
OAUTH2_HTTP_TIMEOUT_MS=10000
OAUTH2_HTTP_MAX_RETRIES=3
```

### Exported Services

```typescript
// oauth2-client.module.ts exports
export {
  OAuth2ClientService,   // Token management
  OAuth2HttpService,     // HTTP client với auth
  LicenseProxyService,   // License API proxy (existing)
}
```

---

## MKT Server API Reference

### 1. Product Entity Structure

```typescript
type MktProduct = {
  id: string; // UUIDv7
  productName: MktMultiLangField; // { vi, en, ko }
  productDescription: MktMultiLangField | null;
  productOverview: MktMultiLangField | null;
  code: string;
  status: 'active' | 'beta' | 'inactive' | 'deprecated';
  version: string | null;
  basePrice: number | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  gallery: string[];
  sortOrder: number;
  metadata: Record<string, unknown>;
  packages?: MktProductPackage[];
  createdAt: string;
  updatedAt: string;
};

type MktMultiLangField = {
  vi: string;
  en: string;
  ko: string;
};
```

### 2. ProductPackage Entity Structure

```typescript
type MktProductPackage = {
  id: string;
  licenseType: string;
  packageCode: string;
  packageName: MktMultiLangField;
  packageDescription: MktMultiLangField | null;
  packageType: 'subscription' | 'perpetual' | 'trial' | 'addon';
  currency: 'VND' | 'USD' | 'EUR';
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'lifetime';
  durationDays: number | null;
  isActive: boolean;
  price: number;
  metadata: Record<string, unknown>;
  productId: string;
  createdAt: string;
  updatedAt: string;
};
```

### 3. Product API Endpoints

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/api/oauth/products` | `products:read` | List products (paginated) |
| GET | `/api/oauth/products/:id` | `products:read` | Get product by ID |
| GET | `/api/oauth/products/by-code/:code` | `products:read` | Get product by code |
| GET | `/api/oauth/products/:id/localized?lang=vi` | `products:read` | Get localized product |
| GET | `/api/oauth/products/search/:lang?q=keyword` | `products:read` | Search by language |
| GET | `/api/oauth/products/:id/packages` | `products:read` | Get packages by product |
| GET | `/api/oauth/packages/:id` | `products:read` | Get package by ID |

---

## Kiến trúc đề xuất

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              MKT-CORE MODULE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────┐    ┌────────────────────┐                       │
│  │   Order Resolver   │───→│    OrderService    │                       │
│  └────────────────────┘    └────────────────────┘                       │
│                                      │                                   │
│                                      ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    MktProductProxyService (NEW)                  │   │
│  │  - getProduct(), getProductByCode()                              │   │
│  │  - getPackage(), getPackagesByProductId()                        │   │
│  │  - createSnapshot()                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                      │                                   │
│                                      ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 EXISTING: oauth2-client module                   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  ┌─────────────────────┐    ┌─────────────────────┐             │   │
│  │  │ OAuth2HttpService   │    │ OAuth2CacheService  │             │   │
│  │  │ (auto token inject) │    │ (LRU + Redis)       │             │   │
│  │  └─────────────────────┘    └─────────────────────┘             │   │
│  │            │                          │                          │   │
│  │            └──────────┬───────────────┘                          │   │
│  │                       ▼                                          │   │
│  │            ┌─────────────────────┐                               │   │
│  │            │ OAuth2ClientService │                               │   │
│  │            │ (token lifecycle)   │                               │   │
│  │            └─────────────────────┘                               │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ORDER CREATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

  1. Request Order với mktProductId, mktPackageId
                    │
                    ▼
  2. MktProductProxyService.getProduct()
                    │
     ┌──────────────┴──────────────┐
     │                             │
     ▼                             ▼
  [Check Cache]              [Cache Miss]
     │                             │
     │                             ▼
     │                    OAuth2HttpService.get()
     │                    (auto token injection)
     │                             │
     │                             ▼
     │                    MKT Server API
     │                             │
     │                    ┌────────┴────────┐
     │                    │                 │
     │                 [Success]        [401 Error]
     │                    │                 │
     │                    │          Token Refresh
     │                    │                 │
     │                    │          Retry Request
     │                    │                 │
     │                    └────────┬────────┘
     │                             │
     │                             ▼
     │                    [Store in Cache]
     │                             │
     └──────────────┬──────────────┘
                    │
                    ▼
  3. Create Snapshot (immutable)
                    │
                    ▼
  4. Save OrderItem với snapshotMktProduct, snapshotMktPackage
```

---

## Schema Design

### Type Definitions

```typescript
// types/mkt-product-proxy.types.ts

/**
 * Multi-language field từ MKT Server
 */
export type MktMultiLangField = {
  vi: string;
  en: string;
  ko: string;
};

export type MktProductStatus = 'active' | 'beta' | 'inactive' | 'deprecated';
export type MktPackageType = 'subscription' | 'perpetual' | 'trial' | 'addon';
export type MktBillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'lifetime';
export type MktCurrency = 'VND' | 'USD' | 'EUR';
export type MktSupportedLanguage = 'vi' | 'en' | 'ko';

/**
 * Product từ MKT Server API
 */
export type MktProduct = {
  id: string;
  productName: MktMultiLangField;
  productDescription: MktMultiLangField | null;
  productOverview: MktMultiLangField | null;
  code: string;
  status: MktProductStatus;
  version: string | null;
  basePrice: number | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  gallery: string[];
  sortOrder: number;
  metadata: Record<string, unknown>;
  packages?: MktProductPackage[];
  createdAt: string;
  updatedAt: string;
};

/**
 * ProductPackage từ MKT Server API
 */
export type MktProductPackage = {
  id: string;
  licenseType: string;
  packageCode: string;
  packageName: MktMultiLangField;
  packageDescription: MktMultiLangField | null;
  packageType: MktPackageType;
  currency: MktCurrency;
  billingCycle: MktBillingCycle;
  durationDays: number | null;
  isActive: boolean;
  price: number;
  metadata: Record<string, unknown>;
  productId: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Product Snapshot - IMMUTABLE sau khi tạo
 */
export type MktProductSnapshot = {
  id: string;
  code: string;
  productName: MktMultiLangField;
  productDescription: MktMultiLangField | null;
  displayName: string;
  displayDescription: string | null;
  displayLanguage: MktSupportedLanguage;
  basePrice: number | null;
  currency: MktCurrency;
  status: MktProductStatus;
  version: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  capturedAt: string;
  sourceVersion: string;
  checksum: string;
};

/**
 * Package Snapshot - IMMUTABLE sau khi tạo
 */
export type MktPackageSnapshot = {
  id: string;
  packageCode: string;
  productId: string;
  packageName: MktMultiLangField;
  packageDescription: MktMultiLangField | null;
  displayName: string;
  displayDescription: string | null;
  packageType: MktPackageType;
  licenseType: string;
  billingCycle: MktBillingCycle;
  durationDays: number | null;
  price: number;
  currency: MktCurrency;
  capturedAt: string;
};

/**
 * API Response wrapper (matching MKT Server format)
 */
export type MktApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
};

export type MktPaginatedData<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Query params for products list
 */
export type MktProductQueryParams = {
  page?: number;
  limit?: number;
  status?: MktProductStatus;
  search?: string;
  lang?: MktSupportedLanguage;
  sortBy?: 'sortOrder' | 'createdAt' | 'updatedAt' | 'code';
  sortOrder?: 'ASC' | 'DESC';
};
```

### OrderItem Entity Updates

```typescript
// objects/mkt-order-item.workspace-entity.ts

import {
  MktProductSnapshot,
  MktPackageSnapshot,
  MktSupportedLanguage,
} from '../mkt-product-integration/types';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktOrderItem,
  namePlural: 'mktOrderItems',
  labelSingular: 'Order Item',
  labelPlural: 'Order Items',
  icon: 'IconBox',
})
export class MktOrderItemWorkspaceEntity extends BaseWorkspaceEntity {
  // ... existing fields ...

  // ============================================
  // MKT PRODUCT REFERENCE FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.orderItem.mktProductId,
    type: FieldMetadataType.TEXT,
    label: 'MKT Product ID',
    description: 'ID của product từ MKT Server (UUIDv7)',
    icon: 'IconLink',
  })
  @WorkspaceIsNullable()
  mktProductId: string | null;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.orderItem.mktProductCode,
    type: FieldMetadataType.TEXT,
    label: 'MKT Product Code',
    description: 'Unique code của product từ MKT Server',
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  mktProductCode: string | null;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.orderItem.mktPackageId,
    type: FieldMetadataType.TEXT,
    label: 'MKT Package ID',
    description: 'ID của package từ MKT Server',
    icon: 'IconPackage',
  })
  @WorkspaceIsNullable()
  mktPackageId: string | null;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.orderItem.mktPackageCode,
    type: FieldMetadataType.TEXT,
    label: 'MKT Package Code',
    description: 'Code của package từ MKT Server',
    icon: 'IconBarcode',
  })
  @WorkspaceIsNullable()
  mktPackageCode: string | null;

  // ============================================
  // SNAPSHOT FIELDS - IMMUTABLE AFTER CREATION
  // ============================================

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.orderItem.snapshotMktProduct,
    type: FieldMetadataType.RAW_JSON,
    label: 'Product Snapshot',
    description: 'Immutable snapshot của MKT product tại thời điểm order',
    icon: 'IconCamera',
  })
  @WorkspaceIsNullable()
  snapshotMktProduct: MktProductSnapshot | null;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.orderItem.snapshotMktPackage,
    type: FieldMetadataType.RAW_JSON,
    label: 'Package Snapshot',
    description: 'Immutable snapshot của MKT package tại thời điểm order',
    icon: 'IconPackage',
  })
  @WorkspaceIsNullable()
  snapshotMktPackage: MktPackageSnapshot | null;

  // ============================================
  // DISPLAY FIELDS (denormalized for quick access)
  // ============================================

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.orderItem.snapshotProductName,
    type: FieldMetadataType.TEXT,
    label: 'Product Name (Snapshot)',
    description: 'Tên product tại thời điểm order',
    icon: 'IconTag',
  })
  snapshotProductName: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.orderItem.snapshotPackageName,
    type: FieldMetadataType.TEXT,
    label: 'Package Name (Snapshot)',
    description: 'Tên package tại thời điểm order',
    icon: 'IconTag',
  })
  @WorkspaceIsNullable()
  snapshotPackageName: string | null;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.orderItem.orderLanguage,
    type: FieldMetadataType.TEXT,
    label: 'Order Language',
    description: 'Ngôn ngữ hiển thị cho order (vi/en/ko)',
    icon: 'IconLanguage',
  })
  @WorkspaceIsNullable()
  orderLanguage: MktSupportedLanguage | null;
}
```

---

## Product Proxy Service

### Module Structure (New)

```
mkt-product-integration/
├── mkt-product-integration.module.ts
├── services/
│   ├── mkt-product-proxy.service.ts    # Main proxy service
│   ├── mkt-product-cache.service.ts    # Product-specific caching
│   └── mkt-snapshot.service.ts         # Snapshot creation
├── types/
│   └── mkt-product-proxy.types.ts
├── constants/
│   └── mkt-product.constants.ts
├── dto/
│   ├── query-products.dto.ts
│   └── mkt-product-output.dto.ts
├── resolvers/
│   └── mkt-product.resolver.ts
└── utils/
    └── multi-lang.util.ts
```

### MktProductProxyService

```typescript
// services/mkt-product-proxy.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { OAuth2HttpService } from '../../oauth2-client/services/oauth2-http.service';
import { MktProductCacheService } from './mkt-product-cache.service';
import { MktSnapshotService } from './mkt-snapshot.service';
import {
  MktProduct,
  MktProductPackage,
  MktProductSnapshot,
  MktPackageSnapshot,
  MktApiResponse,
  MktPaginatedData,
  MktProductQueryParams,
  MktSupportedLanguage,
} from '../types/mkt-product-proxy.types';
import {
  MKT_PRODUCT_ENDPOINTS,
  MKT_DEFAULT_LANGUAGE,
} from '../constants/mkt-product.constants';

@Injectable()
export class MktProductProxyService {
  private readonly logger = new Logger(MktProductProxyService.name);

  constructor(
    private readonly httpService: OAuth2HttpService,
    private readonly cacheService: MktProductCacheService,
    private readonly snapshotService: MktSnapshotService,
  ) {}

  // ============================================
  // PRODUCT OPERATIONS
  // ============================================

  /**
   * Get product by ID with caching
   */
  async getProduct(productId: string): Promise<MktProduct | null> {
    // Check cache first
    const cached = await this.cacheService.getProduct(productId);
    if (cached) {
      this.logger.debug(`Cache hit for product ${productId}`);
      return cached;
    }

    // Fetch from API
    this.logger.debug(`Cache miss for product ${productId}`);
    const response = await this.httpService.get<MktApiResponse<MktProduct>>(
      MKT_PRODUCT_ENDPOINTS.GET_BY_ID.replace(':id', productId),
    );

    if (!response.success || !response.data) {
      return null;
    }

    // Cache result
    await this.cacheService.setProduct(productId, response.data);

    return response.data;
  }

  /**
   * Get product by code with caching
   */
  async getProductByCode(code: string): Promise<MktProduct | null> {
    // Check cache
    const cached = await this.cacheService.getProductByCode(code);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const response = await this.httpService.get<MktApiResponse<MktProduct>>(
      MKT_PRODUCT_ENDPOINTS.GET_BY_CODE.replace(':code', code),
    );

    if (!response.success || !response.data) {
      return null;
    }

    // Cache result
    await this.cacheService.setProduct(response.data.id, response.data);
    await this.cacheService.setProductCodeMapping(code, response.data.id);

    return response.data;
  }

  /**
   * Get products list with pagination
   */
  async getProducts(
    params: MktProductQueryParams = {},
  ): Promise<MktPaginatedData<MktProduct>> {
    const queryString = this.buildQueryString(params);
    const url = `${MKT_PRODUCT_ENDPOINTS.LIST}?${queryString}`;

    const response = await this.httpService.get<
      MktApiResponse<MktPaginatedData<MktProduct>>
    >(url);

    return response.data;
  }

  /**
   * Get product with packages
   */
  async getProductWithPackages(productId: string): Promise<MktProduct | null> {
    const product = await this.getProduct(productId);
    if (!product) return null;

    if (!product.packages || product.packages.length === 0) {
      product.packages = await this.getPackagesByProductId(productId);
    }

    return product;
  }

  // ============================================
  // PACKAGE OPERATIONS
  // ============================================

  /**
   * Get package by ID
   */
  async getPackage(packageId: string): Promise<MktProductPackage | null> {
    // Check cache
    const cached = await this.cacheService.getPackage(packageId);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const response = await this.httpService.get<MktApiResponse<MktProductPackage>>(
      MKT_PRODUCT_ENDPOINTS.GET_PACKAGE.replace(':id', packageId),
    );

    if (!response.success || !response.data) {
      return null;
    }

    // Cache result
    await this.cacheService.setPackage(packageId, response.data);

    return response.data;
  }

  /**
   * Get packages by product ID
   */
  async getPackagesByProductId(productId: string): Promise<MktProductPackage[]> {
    // Check cache
    const cached = await this.cacheService.getPackagesByProductId(productId);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const response = await this.httpService.get<MktApiResponse<MktProductPackage[]>>(
      MKT_PRODUCT_ENDPOINTS.GET_PRODUCT_PACKAGES.replace(':id', productId),
    );

    const packages = response.data ?? [];

    // Cache result
    if (packages.length > 0) {
      await this.cacheService.setPackagesByProductId(productId, packages);
    }

    return packages;
  }

  // ============================================
  // SNAPSHOT OPERATIONS
  // ============================================

  /**
   * Create product snapshot for order
   */
  createProductSnapshot(
    product: MktProduct,
    language: MktSupportedLanguage = MKT_DEFAULT_LANGUAGE,
  ): MktProductSnapshot {
    return this.snapshotService.createProductSnapshot(product, language);
  }

  /**
   * Create package snapshot for order
   */
  createPackageSnapshot(
    pkg: MktProductPackage,
    language: MktSupportedLanguage = MKT_DEFAULT_LANGUAGE,
  ): MktPackageSnapshot {
    return this.snapshotService.createPackageSnapshot(pkg, language);
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate products and packages for order creation
   */
  async validateForOrder(
    items: Array<{ productId: string; packageId?: string }>,
  ): Promise<{
    valid: boolean;
    errors: Array<{ productId: string; packageId?: string; reason: string }>;
  }> {
    const errors: Array<{ productId: string; packageId?: string; reason: string }> = [];

    for (const item of items) {
      const product = await this.getProduct(item.productId);

      if (!product) {
        errors.push({
          productId: item.productId,
          reason: 'Product not found',
        });
        continue;
      }

      if (product.status !== 'active' && product.status !== 'beta') {
        errors.push({
          productId: item.productId,
          reason: `Product status is ${product.status}`,
        });
        continue;
      }

      if (item.packageId) {
        const pkg = await this.getPackage(item.packageId);

        if (!pkg) {
          errors.push({
            productId: item.productId,
            packageId: item.packageId,
            reason: 'Package not found',
          });
          continue;
        }

        if (pkg.productId !== item.productId) {
          errors.push({
            productId: item.productId,
            packageId: item.packageId,
            reason: 'Package does not belong to this product',
          });
          continue;
        }

        if (!pkg.isActive) {
          errors.push({
            productId: item.productId,
            packageId: item.packageId,
            reason: 'Package is not active',
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================
  // HELPERS
  // ============================================

  private buildQueryString(params: MktProductQueryParams): string {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.lang) searchParams.set('lang', params.lang);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    return searchParams.toString();
  }
}
```

### MktProductCacheService

```typescript
// services/mkt-product-cache.service.ts

import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  MktProduct,
  MktProductPackage,
} from '../types/mkt-product-proxy.types';
import {
  MKT_CACHE_PREFIX,
  MKT_CACHE_TTL,
  MKT_FALLBACK_CACHE_TTL,
} from '../constants/mkt-product.constants';

@Injectable()
export class MktProductCacheService {
  private readonly logger = new Logger(MktProductCacheService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  // ============================================
  // PRODUCT CACHE
  // ============================================

  async getProduct(productId: string): Promise<MktProduct | null> {
    const key = this.buildProductKey(productId);
    return this.cacheManager.get<MktProduct>(key);
  }

  async getProductByCode(code: string): Promise<MktProduct | null> {
    const mappingKey = this.buildProductCodeKey(code);
    const productId = await this.cacheManager.get<string>(mappingKey);

    if (!productId) return null;

    return this.getProduct(productId);
  }

  async setProduct(productId: string, product: MktProduct): Promise<void> {
    const key = this.buildProductKey(productId);
    await this.cacheManager.set(key, product, MKT_CACHE_TTL * 1000);

    // Also set fallback cache
    const fallbackKey = this.buildProductFallbackKey(productId);
    await this.cacheManager.set(fallbackKey, product, MKT_FALLBACK_CACHE_TTL * 1000);
  }

  async setProductCodeMapping(code: string, productId: string): Promise<void> {
    const key = this.buildProductCodeKey(code);
    await this.cacheManager.set(key, productId, MKT_CACHE_TTL * 1000);
  }

  async getProductFromFallback(productId: string): Promise<MktProduct | null> {
    const key = this.buildProductFallbackKey(productId);
    return this.cacheManager.get<MktProduct>(key);
  }

  // ============================================
  // PACKAGE CACHE
  // ============================================

  async getPackage(packageId: string): Promise<MktProductPackage | null> {
    const key = this.buildPackageKey(packageId);
    return this.cacheManager.get<MktProductPackage>(key);
  }

  async setPackage(packageId: string, pkg: MktProductPackage): Promise<void> {
    const key = this.buildPackageKey(packageId);
    await this.cacheManager.set(key, pkg, MKT_CACHE_TTL * 1000);
  }

  async getPackagesByProductId(productId: string): Promise<MktProductPackage[] | null> {
    const key = this.buildPackagesForProductKey(productId);
    return this.cacheManager.get<MktProductPackage[]>(key);
  }

  async setPackagesByProductId(
    productId: string,
    packages: MktProductPackage[],
  ): Promise<void> {
    const key = this.buildPackagesForProductKey(productId);
    await this.cacheManager.set(key, packages, MKT_CACHE_TTL * 1000);

    // Also cache individual packages
    for (const pkg of packages) {
      await this.setPackage(pkg.id, pkg);
    }
  }

  // ============================================
  // INVALIDATION
  // ============================================

  async invalidateProduct(productId: string): Promise<void> {
    await this.cacheManager.del(this.buildProductKey(productId));
    await this.cacheManager.del(this.buildPackagesForProductKey(productId));
  }

  async invalidatePackage(packageId: string): Promise<void> {
    await this.cacheManager.del(this.buildPackageKey(packageId));
  }

  // ============================================
  // KEY BUILDERS
  // ============================================

  private buildProductKey(productId: string): string {
    return `${MKT_CACHE_PREFIX}:product:${productId}`;
  }

  private buildProductCodeKey(code: string): string {
    return `${MKT_CACHE_PREFIX}:product:code:${code}`;
  }

  private buildProductFallbackKey(productId: string): string {
    return `${MKT_CACHE_PREFIX}:product:fallback:${productId}`;
  }

  private buildPackageKey(packageId: string): string {
    return `${MKT_CACHE_PREFIX}:package:${packageId}`;
  }

  private buildPackagesForProductKey(productId: string): string {
    return `${MKT_CACHE_PREFIX}:packages:product:${productId}`;
  }
}
```

### MktSnapshotService

```typescript
// services/mkt-snapshot.service.ts

import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  MktProduct,
  MktProductPackage,
  MktProductSnapshot,
  MktPackageSnapshot,
  MktMultiLangField,
  MktSupportedLanguage,
  MktCurrency,
} from '../types/mkt-product-proxy.types';
import { MKT_DEFAULT_CURRENCY } from '../constants/mkt-product.constants';

@Injectable()
export class MktSnapshotService {
  /**
   * Create immutable product snapshot
   */
  createProductSnapshot(
    product: MktProduct,
    language: MktSupportedLanguage = 'vi',
  ): MktProductSnapshot {
    const snapshot: MktProductSnapshot = {
      id: product.id,
      code: product.code,
      productName: product.productName,
      productDescription: product.productDescription,
      displayName: this.getLocalizedText(product.productName, language),
      displayDescription: product.productDescription
        ? this.getLocalizedText(product.productDescription, language)
        : null,
      displayLanguage: language,
      basePrice: product.basePrice,
      currency: MKT_DEFAULT_CURRENCY,
      status: product.status,
      version: product.version,
      iconUrl: product.iconUrl,
      bannerUrl: product.bannerUrl,
      capturedAt: new Date().toISOString(),
      sourceVersion: product.updatedAt,
      checksum: '',
    };

    snapshot.checksum = this.generateChecksum(snapshot);

    return snapshot;
  }

  /**
   * Create immutable package snapshot
   */
  createPackageSnapshot(
    pkg: MktProductPackage,
    language: MktSupportedLanguage = 'vi',
  ): MktPackageSnapshot {
    return {
      id: pkg.id,
      packageCode: pkg.packageCode,
      productId: pkg.productId,
      packageName: pkg.packageName,
      packageDescription: pkg.packageDescription,
      displayName: this.getLocalizedText(pkg.packageName, language),
      displayDescription: pkg.packageDescription
        ? this.getLocalizedText(pkg.packageDescription, language)
        : null,
      packageType: pkg.packageType,
      licenseType: pkg.licenseType,
      billingCycle: pkg.billingCycle,
      durationDays: pkg.durationDays,
      price: pkg.price,
      currency: pkg.currency,
      capturedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify snapshot integrity
   */
  verifyChecksum(snapshot: MktProductSnapshot): boolean {
    const originalChecksum = snapshot.checksum;
    const snapshotCopy = { ...snapshot, checksum: '' };
    const calculatedChecksum = this.generateChecksum(snapshotCopy);

    return originalChecksum === calculatedChecksum;
  }

  /**
   * Get localized text with fallback
   */
  private getLocalizedText(
    field: MktMultiLangField,
    language: MktSupportedLanguage,
  ): string {
    if (field[language]) {
      return field[language];
    }

    // Fallback order: vi -> en -> ko
    const fallbackOrder: MktSupportedLanguage[] = ['vi', 'en', 'ko'];

    for (const lang of fallbackOrder) {
      if (field[lang]) {
        return field[lang];
      }
    }

    return '';
  }

  private generateChecksum(
    snapshot: Omit<MktProductSnapshot, 'checksum'> & { checksum: string },
  ): string {
    const dataToHash = JSON.stringify({
      id: snapshot.id,
      code: snapshot.code,
      basePrice: snapshot.basePrice,
      capturedAt: snapshot.capturedAt,
    });

    return createHash('sha256').update(dataToHash).digest('hex').substring(0, 16);
  }
}
```

### Constants

```typescript
// constants/mkt-product.constants.ts

/**
 * MKT Product API Endpoints
 */
export const MKT_PRODUCT_ENDPOINTS = {
  LIST: '/api/oauth/products',
  GET_BY_ID: '/api/oauth/products/:id',
  GET_BY_CODE: '/api/oauth/products/by-code/:code',
  GET_LOCALIZED: '/api/oauth/products/:id/localized',
  SEARCH: '/api/oauth/products/search/:lang',
  GET_PRODUCT_PACKAGES: '/api/oauth/products/:id/packages',
  GET_PACKAGE: '/api/oauth/packages/:id',
} as const;

/**
 * Cache configuration
 */
export const MKT_CACHE_PREFIX = 'mkt';
export const MKT_CACHE_TTL = 300; // 5 minutes (seconds)
export const MKT_FALLBACK_CACHE_TTL = 86400; // 24 hours (seconds)

/**
 * Supported languages
 */
export const MKT_SUPPORTED_LANGUAGES = ['vi', 'en', 'ko'] as const;
export const MKT_DEFAULT_LANGUAGE = 'vi' as const;
export const MKT_DEFAULT_CURRENCY = 'VND' as const;

/**
 * Product status that can be ordered
 */
export const MKT_ORDERABLE_STATUSES = ['active', 'beta'] as const;
```

### Module Definition

```typescript
// mkt-product-integration.module.ts

import { Module } from '@nestjs/common';
import { OAuth2ClientModule } from '../oauth2-client/oauth2-client.module';
import { MktProductProxyService } from './services/mkt-product-proxy.service';
import { MktProductCacheService } from './services/mkt-product-cache.service';
import { MktSnapshotService } from './services/mkt-snapshot.service';
import { MktProductResolver } from './resolvers/mkt-product.resolver';

@Module({
  imports: [
    OAuth2ClientModule, // Reuse existing OAuth2 infrastructure
  ],
  providers: [
    MktProductProxyService,
    MktProductCacheService,
    MktSnapshotService,
    MktProductResolver,
  ],
  exports: [
    MktProductProxyService,
    MktSnapshotService,
  ],
})
export class MktProductIntegrationModule {}
```

---

## Caching Strategy

### Cache Layers (Reusing OAuth2 Cache)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CACHING ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────┘

  Request for Product Data
            │
            ▼
┌─────────────────────────────────────┐
│   Layer 1: MktProductCacheService   │
│   Key: mkt:product:{id}             │
│   TTL: 5 minutes                    │
└─────────────────────────────────────┘
            │
       [Cache Miss]
            │
            ▼
┌─────────────────────────────────────┐
│   Layer 2: OAuth2HttpService        │
│   (Auto token injection)            │
│   (Auto 401 recovery)               │
│   (Retry logic: 3 retries)          │
└─────────────────────────────────────┘
            │
       [API Unavailable]
            │
            ▼
┌─────────────────────────────────────┐
│   Layer 3: Fallback Cache           │
│   Key: mkt:product:fallback:{id}    │
│   TTL: 24 hours                     │
└─────────────────────────────────────┘
```

### Cache Key Structure

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `mkt:product:{id}` | 5 min | Primary product cache |
| `mkt:product:code:{code}` | 5 min | Product code to ID mapping |
| `mkt:product:fallback:{id}` | 24 hours | Fallback for degraded mode |
| `mkt:package:{id}` | 5 min | Primary package cache |
| `mkt:packages:product:{productId}` | 5 min | Packages by product |

---

## Migration Guide

### Phase 1: Add MktProductIntegrationModule

```typescript
// mkt-core.module.ts
@Module({
  imports: [
    // ... existing imports
    OAuth2ClientModule,           // Already exists
    MktProductIntegrationModule,  // NEW
  ],
})
export class MktCoreModule {}
```

### Phase 2: Add Entity Fields

```sql
-- Migration: Add MKT product fields to order_item

ALTER TABLE "mkt_order_item"
ADD COLUMN "mktProductId" VARCHAR(255),
ADD COLUMN "mktProductCode" VARCHAR(100),
ADD COLUMN "mktPackageId" VARCHAR(255),
ADD COLUMN "mktPackageCode" VARCHAR(100),
ADD COLUMN "snapshotMktProduct" JSONB,
ADD COLUMN "snapshotMktPackage" JSONB,
ADD COLUMN "orderLanguage" VARCHAR(10);

-- Add indexes
CREATE INDEX "idx_order_item_mkt_product_id"
ON "mkt_order_item" ("mktProductId");

CREATE INDEX "idx_order_item_mkt_package_id"
ON "mkt_order_item" ("mktPackageId");
```

### Phase 3: Update Order Creation

```typescript
// order.service.ts

import { MktProductProxyService } from '../mkt-product-integration';

@Injectable()
export class OrderService {
  constructor(
    private readonly mktProductProxy: MktProductProxyService,
    // ... other dependencies
  ) {}

  async createOrderWithMktProducts(
    input: CreateOrderInput,
    mktItems: Array<{
      productId: string;
      packageId?: string;
      quantity: number;
    }>,
    language: 'vi' | 'en' | 'ko' = 'vi',
  ): Promise<Order> {
    // 1. Validate products & packages
    const validation = await this.mktProductProxy.validateForOrder(mktItems);

    if (!validation.valid) {
      throw new MktValidationException(validation.errors);
    }

    // 2. Fetch products & create snapshots
    const orderItems = await Promise.all(
      mktItems.map(async (item, index) => {
        const product = await this.mktProductProxy.getProductWithPackages(item.productId);
        const productSnapshot = this.mktProductProxy.createProductSnapshot(product!, language);

        let packageSnapshot: MktPackageSnapshot | null = null;
        let unitPrice = product!.basePrice ?? 0;

        if (item.packageId) {
          const pkg = await this.mktProductProxy.getPackage(item.packageId);
          packageSnapshot = this.mktProductProxy.createPackageSnapshot(pkg!, language);
          unitPrice = pkg!.price;
        }

        return {
          mktProductId: product!.id,
          mktProductCode: product!.code,
          mktPackageId: item.packageId ?? null,
          mktPackageCode: packageSnapshot?.packageCode ?? null,
          snapshotMktProduct: productSnapshot,
          snapshotMktPackage: packageSnapshot,
          snapshotProductName: productSnapshot.displayName,
          snapshotPackageName: packageSnapshot?.displayName ?? null,
          orderLanguage: language,
          unitPrice,
          quantity: item.quantity,
          position: index,
        };
      }),
    );

    // 3. Create order with transaction
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.save(Order, { ...input });

      const items = orderItems.map((item) => ({
        ...item,
        orderId: order.id,
        totalPrice: item.unitPrice * item.quantity,
      }));

      await manager.save(OrderItem, items);

      return this.calculateAndUpdateOrder(manager, order.id);
    });
  }
}
```

---

## Appendix

### A. Comparison: New vs Existing Module

| Feature | OAuth2ClientModule (existing) | MktProductIntegrationModule (new) |
|---------|------------------------------|-----------------------------------|
| Token Management | ✅ OAuth2ClientService | Reuses existing |
| HTTP Client | ✅ OAuth2HttpService | Reuses existing |
| Caching | ✅ OAuth2CacheService | + MktProductCacheService |
| Rate Limiting | ✅ OAuth2RateLimiterService | Reuses existing |
| Circuit Breaker | ✅ OAuth2CircuitBreakerService | Reuses existing |
| License API | ✅ LicenseProxyService | Not needed |
| Product API | ❌ | ✅ MktProductProxyService |
| Snapshots | ❌ | ✅ MktSnapshotService |

### B. Configuration Reference

```env
# Already configured for OAuth2ClientModule
MKT_API_BASE_URL=http://localhost:3006
MKT_OAUTH_CLIENT_ID=crm_twenty
MKT_OAUTH_CLIENT_SECRET=your-secret-min-32-chars
MKT_OAUTH_SCOPES=products:read products:write licenses:read licenses:write

# Additional for MktProductIntegration (optional)
MKT_PRODUCT_CACHE_TTL=300
MKT_PRODUCT_FALLBACK_TTL=86400
```

### C. Decision Log

| Decision | Rationale |
|----------|-----------|
| Reuse OAuth2ClientModule | Avoid duplication, already production-ready |
| Use OAuth2HttpService | Built-in token injection, retry, 401 recovery |
| Separate MktProductCacheService | Product-specific cache keys & TTL |
| Snapshot pattern | Immutable data at order time |
| Store all 3 languages | Flexibility for future display needs |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-XX-XX | Initial design |
| 1.1.0 | 2024-XX-XX | Updated to reuse existing oauth2-client module |
