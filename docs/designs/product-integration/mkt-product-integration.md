# MKT Product Integration Module

## Tổng quan

Module **mkt-product-integration** cung cấp tích hợp với MKT Server để quản lý Product và ProductPackage thông qua OAuth2. Module hỗ trợ caching phân tán (Redis), đồng bộ tự động, snapshot bất biến cho đơn hàng và validation.

**Vị trí:** `packages/twenty-server/src/mkt-core/mkt-product-integration/`

## Kiến trúc

Module tuân theo pattern **Repository-Service-Resolver** với nhiều Service layer chuyên biệt:

```
┌─────────────────────────────────────────────────────────────────┐
│                    GraphQL API Layer                            │
│               MktDigitalProductResolver                         │
│                    (5 Queries)                                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Facade Service Layer                            │
│               MktProductProxyService                            │
│    (Orchestrates cache, repositories, validation, snapshots)    │
└───────┬─────────────┬─────────────┬─────────────┬───────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│   Cache   │ │ Snapshot  │ │Validation │ │   Sync    │
│  Service  │ │  Service  │ │  Service  │ │  Service  │
└─────┬─────┘ └───────────┘ └───────────┘ └─────┬─────┘
      │                                         │
      ▼                                         ▼
┌───────────┐                           ┌───────────────┐
│   Redis   │                           │ Scheduled Job │
│   Cache   │                           │  (Cron Sync)  │
└───────────┘                           └───────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Repository Layer                             │
│        MktProductRepository + MktPackageRepository              │
│            (HTTP calls to MKT Server via OAuth2)                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External: MKT Server                         │
│           Product OAuth API (/api/oauth/products)               │
│           Package OAuth API (/api/oauth/product-packages)       │
└─────────────────────────────────────────────────────────────────┘
```

## Cấu trúc thư mục

```
mkt-product-integration/
├── configs/
│   └── mkt-sync.config.ts              # Zod-validated sync configuration
├── constants/
│   └── mkt-product.constants.ts        # API endpoints, cache keys, defaults
├── dto/
│   ├── mkt-digital-product.input.ts    # GraphQL input types & enums
│   └── mkt-digital-product.output.ts   # GraphQL response DTOs
├── jobs/
│   └── mkt-product-scheduled-sync.job.ts  # Cron scheduled sync job
├── message/
│   └── index.ts                        # Module-specific messages
├── repositories/
│   ├── mkt-product.repository.ts       # Product API data access layer
│   └── mkt-package.repository.ts       # Package API data access layer
├── resolvers/
│   └── mkt-digital-product.resolver.ts # GraphQL resolvers
├── services/
│   ├── mkt-product-proxy.service.ts    # Facade orchestrating all services
│   ├── mkt-product-cache.service.ts    # Redis caching service
│   ├── mkt-product-sync.service.ts     # Event-driven product sync
│   ├── mkt-snapshot.service.ts         # Immutable snapshot creation
│   └── mkt-validation.service.ts       # Order validation logic
├── types/
│   └── mkt-product-proxy.types.ts      # All TypeScript types
├── utils/
│   └── mkt-product-mapper.utils.ts     # DTO mappers
└── mkt-product-integration.module.ts   # Module definition
```

## Nghiệp vụ Product

### Trạng thái Product (Status)

| Status | Mô tả | Có thể đặt hàng |
|--------|-------|-----------------|
| `active` | Đang hoạt động | ✓ |
| `beta` | Đang thử nghiệm | ✓ |
| `inactive` | Tạm ngưng | ✗ |
| `deprecated` | Ngừng hỗ trợ | ✗ |

### Loại Product Package

| PackageType | Mô tả |
|-------------|-------|
| `subscription` | Gói đăng ký theo thời hạn |
| `perpetual` | Gói vĩnh viễn |
| `trial` | Gói dùng thử |
| `addon` | Gói bổ sung |

### Billing Cycle

| Cycle | Mô tả |
|-------|-------|
| `monthly` | Hàng tháng |
| `quarterly` | Hàng quý |
| `yearly` | Hàng năm |
| `one_time` | Một lần |
| `lifetime` | Trọn đời |

### Ngôn ngữ hỗ trợ

| Code | Ngôn ngữ | Thứ tự ưu tiên |
|------|----------|----------------|
| `vi` | Tiếng Việt | 1 (mặc định) |
| `en` | English | 2 |
| `ko` | 한국어 | 3 |

## API Endpoints

### MKT Server Endpoints (OAuth Protected)

#### Product Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/oauth/products` | GET | Lấy danh sách products |
| `/api/oauth/products/:id` | GET | Lấy product theo ID |
| `/api/oauth/products/by-code/:code` | GET | Lấy product theo code |
| `/api/oauth/products/:id/localized` | GET | Lấy product với ngôn ngữ cụ thể |
| `/api/oauth/products/localized` | GET | Danh sách products với ngôn ngữ |
| `/api/oauth/products/search/:lang` | GET | Tìm kiếm product |

#### Package Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/oauth/product-packages` | GET | Lấy danh sách packages |
| `/api/oauth/product-packages/:id` | GET | Lấy package theo ID |
| `/api/oauth/product-packages/by-code/:code` | GET | Lấy package theo code |
| `/api/oauth/product-packages/by-product/:productId` | GET | Lấy packages theo product |
| `/api/oauth/product-packages/by-license-type/:licenseType` | GET | Lấy packages theo license type |

### GraphQL API

#### Queries (5)

```graphql
# Lấy product theo ID
mktDigitalProduct(productId: String!): MktDigitalProductResponseDto

# Lấy product theo code
mktDigitalProductByCode(code: String!): MktDigitalProductResponseDto

# Lấy danh sách products với filters
mktDigitalProducts(input: MktDigitalProductQueryInput): MktDigitalProductListResponseDto

# Lấy package theo ID
mktDigitalPackage(input: MktDigitalSinglePackageInput!): MktDigitalPackageResponseDto

# Lấy packages theo product
mktDigitalPackagesByProduct(input: MktDigitalPackageQueryInput!): MktDigitalPackageListResponseDto
```

## Services Architecture

### 1. MktProductProxyService (Facade)

**Mục đích:** Điểm truy cập duy nhất, điều phối các service khác

```typescript
// Product Operations
getProduct(productId, userContext?): Promise<MktProduct>
getProductByCode(code, userContext?): Promise<MktProduct>
getProducts(params, userContext?): Promise<MktPaginatedData<MktProduct>>
getProductWithPackages(productId, userContext?): Promise<MktProduct>

// Package Operations
getPackage(packageId, userContext?, productId?): Promise<MktProductPackage>
getPackages(params, userContext?): Promise<MktPaginatedData<MktProductPackage>>
getPackagesByProductId(productId, userContext?): Promise<MktProductPackage[]>

// Snapshot Operations
createProductSnapshot(product, language): MktProductSnapshot
createPackageSnapshot(pkg): MktPackageSnapshot
verifyProductSnapshot(snapshot): boolean

// Validation
validateForOrder(items, userContext?): Promise<MktValidationResult>

// Cache Management
invalidateProductCache(productId): Promise<void>
invalidatePackagesByProductCache(productId): Promise<void>
```

### 2. MktProductCacheService (Caching)

**Mục đích:** Quản lý cache Redis với TTL và invalidation

**Cache Structure:**

```
┌──────────────────────────────────────────────────────┐
│                    Redis Cache                        │
├──────────────────────────────────────────────────────┤
│  digital:{productId}     → Product JSON (24h TTL)    │
│  digital:code:{code}     → productId string (24h TTL)│
│  digital:pkgs:{productId}→ [Packages] array (24h TTL)│
└──────────────────────────────────────────────────────┘
```

**Key Methods:**
```typescript
// Product Cache
getProduct(productId): Promise<MktProduct | null>
setProduct(productId, product): Promise<void>
getProductByCode(code): Promise<MktProduct | null>
setProductCodeMapping(code, productId): Promise<void>

// Package Cache
getPackagesByProductId(productId): Promise<MktProductPackage[] | null>
setPackagesByProductId(productId, packages): Promise<void>
getPackageById(packageId, productId?): Promise<MktProductPackage | null>

// Invalidation
invalidateProduct(productId, code?): Promise<void>
invalidatePackagesByProduct(productId): Promise<void>
```

### 3. MktSnapshotService (Immutability)

**Mục đích:** Tạo snapshot bất biến tại thời điểm đặt hàng

**Product Snapshot:**
```typescript
type MktProductSnapshot = {
  id: string;
  code: string;
  productName: MktMultiLangField;      // {vi, en, ko}
  productDescription: MktMultiLangField;
  displayName: string;                  // Localized name
  displayDescription: string;           // Localized description
  displayLanguage: string;              // Language used
  basePrice: number;
  currency: string;
  status: string;
  version: string;
  iconUrl: string;
  bannerUrl: string;
  capturedAt: string;                   // ISO timestamp
  sourceVersion: number;                // Source version number
  checksum: string;                     // SHA-256 verification
};
```

**Package Snapshot:**
```typescript
type MktPackageSnapshot = {
  id: string;
  packageCode: string;
  productId: string;
  packageName: MktMultiLangField;
  packageDescription: MktMultiLangField;
  displayName: string;
  displayDescription: string;
  packageType: string;
  licenseType: string;
  billingCycle: string;
  durationDays: number;
  price: number;
  currency: string;
  capturedAt: string;
};
```

**Checksum Algorithm:**
```typescript
// SHA-256 hash của: id + code + basePrice + capturedAt (lấy 16 ký tự đầu)
checksum = sha256(id + code + basePrice + capturedAt).substring(0, 16)
```

### 4. MktValidationService (Validation)

**Mục đích:** Validate products/packages trước khi tạo đơn hàng

**Validation Rules:**

| Rule | Điều kiện | Error Message |
|------|-----------|---------------|
| Product exists | product != null | Product not found |
| Product orderable | status in ['active', 'beta'] | Product not orderable |
| Package exists | package != null (nếu có packageId) | Package not found |
| Package belongs to product | package.productId === productId | Package does not belong to product |
| Package active | package.isActive === true | Package not active |

**Usage:**
```typescript
const result = await validationService.validateForOrder(
  [{ productId: 'xxx', packageId: 'yyy' }],
  productFetcher,  // Callback để fetch product
  packageFetcher,  // Callback để fetch package
  userContext
);

// Result
{
  valid: boolean;
  errors: [
    { productId: string, packageId?: string, reason: string }
  ]
}
```

### 5. MktProductSyncService (Synchronization)

**Mục đích:** Đồng bộ dữ liệu từ MKT Server về cache

**Trigger Events:**
1. **OAuth2 Token Acquired** - Khi có token mới
2. **Scheduled Cron Job** - Mỗi 30 phút (configurable)
3. **Manual Force Sync** - Gọi API thủ công

**Sync Flow:**

```
┌────────────────────────────────────────────────────────────────┐
│                        Sync Process                             │
├────────────────────────────────────────────────────────────────┤
│  1. Check auto-sync enabled                                     │
│  2. Verify token scopes (products:read, product-packages:read) │
│  3. Check minimum interval (5 min default)                      │
│  4. Acquire distributed lock (Redis)                            │
│     ├─ Success → Continue                                       │
│     └─ Fail → Skip (another instance syncing)                   │
│  5. Stream products (batch 50)                                  │
│     └─ Cache each product                                       │
│  6. Stream packages (batch 50)                                  │
│     └─ Group by productId → Cache as array                      │
│  7. Release lock                                                │
│  8. Update lastSyncTime                                         │
└────────────────────────────────────────────────────────────────┘
```

**Distributed Lock:**
```typescript
// Lock configuration
{
  key: 'mkt:product:sync:lock',
  ttl: 600000  // 10 minutes
}

// Fallback: In-memory flag nếu Redis không khả dụng
```

**Streaming Pagination:**
```typescript
// AsyncGenerator để xử lý batch-by-batch, tiết kiệm memory
async *streamProducts(): AsyncGenerator<MktProduct[]> {
  let page = 1;
  while (true) {
    const result = await repository.findAll({ page, limit: 50 });
    yield result.data;
    if (page >= result.totalPages) break;
    page++;
  }
}
```

## Scheduled Job

### MktProductScheduledSyncJob

**Cron Expression:** `0 */30 * * * *` (mỗi 30 phút)

**Logic:**
```typescript
@Cron(MKT_SYNC_CONFIG.SCHEDULED_SYNC_CRON)
async handleScheduledSync() {
  // Skip nếu disabled
  if (!MKT_SYNC_CONFIG.SCHEDULED_SYNC_ENABLED) return;

  // Skip nếu sync gần đây
  const timeSinceLastSync = now - lastSyncTime;
  if (timeSinceLastSync < MIN_SYNC_INTERVAL) return;

  // Execute sync
  await syncService.syncAllProductsAndPackages();
}
```

## Caching Strategy

### Cache Lookup Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  getProduct(productId)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Check Redis Cache    │
              │  digital:{productId}  │
              └───────────┬───────────┘
                    ┌─────┴─────┐
                    │           │
               HIT  ▼           ▼  MISS
          ┌─────────────┐ ┌─────────────────┐
          │ Attach pkgs │ │ Fetch from API  │
          │ from cache  │ │ via Repository  │
          └──────┬──────┘ └────────┬────────┘
                 │                  │
                 │                  ▼
                 │         ┌─────────────────┐
                 │         │ Cache product   │
                 │         │ Cache code→id   │
                 │         └────────┬────────┘
                 │                  │
                 ▼                  ▼
              ┌───────────────────────┐
              │     Return Product    │
              └───────────────────────┘
```

### Cache Invalidation

```typescript
// Invalidate product (xóa cả code mapping và packages)
await cacheService.invalidateProduct(productId, productCode);

// Invalidate chỉ packages
await cacheService.invalidatePackagesByProduct(productId);
```

### TTL Configuration

| Cache Type | TTL | Mô tả |
|------------|-----|-------|
| Product | 24 hours | Fallback TTL |
| Code Mapping | 24 hours | code → productId |
| Packages | 24 hours | Array packages |

## Configuration

### Environment Variables

```bash
# Sync Configuration
MKT_AUTO_SYNC_ENABLED=true              # Auto-sync khi có token
MKT_SYNC_ON_STARTUP=true               # Sync ngay sau khi có token đầu tiên
MKT_SYNC_BATCH_SIZE=50                 # Số items mỗi batch
MKT_SYNC_MIN_INTERVAL_MS=300000        # Tối thiểu 5 phút giữa các lần sync
MKT_SYNC_MAX_RETRIES=3                 # Số lần retry tối đa
MKT_SYNC_PARALLEL=true                 # Xử lý batch song song
MKT_SYNC_INVALIDATE_STALE=false        # Xóa cache cũ trước khi sync
MKT_SCHEDULED_SYNC_ENABLED=true        # Bật cron sync
MKT_SCHEDULED_SYNC_CRON="0 */30 * * * *"  # Mỗi 30 phút
```

### Constants

```typescript
// Query Defaults
MKT_PRODUCT_QUERY_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
  SORT_BY: 'sortOrder',
  SORT_ORDER: 'ASC',
};

// Cache
MKT_CACHE_TTL = 3600;           // 1 hour
MKT_FALLBACK_CACHE_TTL = 86400; // 24 hours

// Orderable statuses
MKT_ORDERABLE_STATUSES = ['active', 'beta'];

// Languages
MKT_SUPPORTED_LANGUAGES = ['vi', 'en', 'ko'];
MKT_DEFAULT_LANGUAGE = 'vi';
MKT_LANGUAGE_FALLBACK_ORDER = ['vi', 'en', 'ko'];

// Currency
MKT_DEFAULT_CURRENCY = 'VND';
```

## Types & Interfaces

### Product Type

```typescript
type MktProduct = {
  id: string;
  productName: MktMultiLangField;
  productDescription: MktMultiLangField;
  productOverview: MktMultiLangField;
  code: string;
  status: 'active' | 'beta' | 'inactive' | 'deprecated';
  version: string;
  basePrice: number;
  iconUrl: string;
  bannerUrl: string;
  gallery: string[];
  sortOrder: number;
  metadata: Record<string, unknown>;
  packages?: MktProductPackage[];
  createdAt: string;
  updatedAt: string;
};
```

### Package Type

```typescript
type MktProductPackage = {
  id: string;
  licenseType: string;
  packageCode: string;
  packageName: MktMultiLangField;
  packageDescription: MktMultiLangField;
  packageType: 'subscription' | 'perpetual' | 'trial' | 'addon';
  currency: 'VND' | 'USD' | 'EUR';
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'lifetime';
  durationDays: number;
  isActive: boolean;
  price: number;
  metadata: Record<string, unknown>;
  productId: string;
  createdAt: string;
  updatedAt: string;
};
```

### Multi-Language Field

```typescript
type MktMultiLangField = {
  vi: string;
  en: string;
  ko: string;
};
```

## GraphQL DTOs

### Input Types

```typescript
// Query products
input MktDigitalProductQueryInput {
  page: Int = 1
  limit: Int = 10
  status: MktProductStatusFilter
  search: String
  lang: MktSupportedLanguageInput
  sortBy: MktProductSortBy
  sortOrder: MktSortOrder
}

// Query packages by product
input MktDigitalPackageQueryInput {
  productId: String
  isActive: Boolean
}

// Get single package
input MktDigitalSinglePackageInput {
  packageId: String!
  productId: String  # Optional, for cache efficiency
}
```

### Output Types

```typescript
type MktDigitalProductResponseDto {
  success: Boolean!
  data: MktDigitalProductDto
  message: String
  error: String
}

type MktDigitalProductListResponseDto {
  success: Boolean!
  data: [MktDigitalProductDto!]!
  total: Int!
  page: Int!
  limit: Int!
  totalPages: Int!
  message: String
  error: String
}
```

## Ví dụ sử dụng

### Inject Service trong module khác

```typescript
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';

@Injectable()
export class OrderService {
  constructor(private productService: MktProductProxyService) {}

  async createOrder(items: OrderItem[]) {
    // 1. Validate products/packages
    const validation = await this.productService.validateForOrder(
      items.map(i => ({ productId: i.productId, packageId: i.packageId }))
    );

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors[0].reason}`);
    }

    // 2. Create snapshots for each item
    const snapshots = await Promise.all(
      items.map(async item => {
        const product = await this.productService.getProduct(item.productId);
        const productSnapshot = this.productService.createProductSnapshot(product, 'vi');

        let packageSnapshot = null;
        if (item.packageId) {
          const pkg = await this.productService.getPackage(item.packageId);
          packageSnapshot = this.productService.createPackageSnapshot(pkg);
        }

        return { productSnapshot, packageSnapshot };
      })
    );

    // 3. Store snapshots with order
    return this.saveOrderWithSnapshots(items, snapshots);
  }

  async verifyOrderIntegrity(order: Order) {
    // Verify snapshots haven't been tampered
    for (const item of order.items) {
      const isValid = this.productService.verifyProductSnapshot(item.productSnapshot);
      if (!isValid) {
        throw new Error(`Snapshot integrity check failed for product ${item.productId}`);
      }
    }
  }
}
```

### GraphQL Query Examples

```graphql
# Lấy product với packages
query GetProduct {
  mktDigitalProduct(productId: "uuid-here") {
    success
    data {
      id
      code
      productName { vi en ko }
      status
      basePrice
      packages {
        id
        packageCode
        packageType
        price
        isActive
      }
    }
  }
}

# Tìm kiếm products
query SearchProducts {
  mktDigitalProducts(input: {
    search: "MKT"
    status: ACTIVE
    page: 1
    limit: 20
    sortBy: SORT_ORDER
    sortOrder: ASC
  }) {
    success
    data {
      id
      code
      productName { vi }
      basePrice
    }
    total
    totalPages
  }
}

# Lấy packages của product
query GetPackages {
  mktDigitalPackagesByProduct(input: {
    productId: "uuid-here"
    isActive: true
  }) {
    success
    data {
      id
      packageCode
      packageName { vi }
      packageType
      billingCycle
      durationDays
      price
    }
  }
}
```

## Error Handling

### Common Errors

| Error | Nguyên nhân | Giải pháp |
|-------|-------------|-----------|
| Product not found | Product ID không tồn tại | Kiểm tra lại productId |
| Package not found | Package ID không tồn tại | Kiểm tra lại packageId |
| Product not orderable | Status không phải active/beta | Chọn product khác |
| Package not active | Package đã bị deactivate | Chọn package khác |
| Sync lock acquired | Đang có sync process khác | Đợi và retry |
| Token scope insufficient | Token thiếu scope | Cấp lại token với đủ scope |

### Required OAuth2 Scopes

```typescript
MKT_SYNC_REQUIRED_SCOPES = ['products:read', 'product-packages:read'];
// Hoặc scope admin:all
```

## Dependencies

**Internal:**
- `oauth2-client` - OAuth2 HTTP client và token management
- `common/messages` - Message builder utilities
- `utils/url-builder.util` - URL utilities
- `utils/date-time.utils` - DateTimeUtils

**External:**
- `@nestjs/common` - NestJS framework
- `@nestjs/config` - Configuration
- `@nestjs/graphql` - GraphQL decorators
- `@nestjs/schedule` - Cron jobs
- `zod` - Schema validation (sync config)
- `crypto` - SHA-256 checksum
