# MKT License Integration Module

## Tổng quan

Module **mkt-license-integration** cung cấp tích hợp với MKT Server để quản lý license thông qua OAuth2. Module cho phép thực hiện đầy đủ các thao tác CRUD, validation, analytics và bulk operations cho license.

**Vị trí:** `packages/twenty-server/src/mkt-core/mkt-license-integration/`

## Kiến trúc

Module tuân theo pattern **Repository-Service-Resolver**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    GraphQL API Layer                            │
│                   MktLicenseResolver                            │
│              (6 Queries + 8 Mutations)                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer (Facade)                       │
│                  MktLicenseProxyService                         │
│           (Orchestration, future: caching, validation)          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Repository Layer                             │
│                   MktLicenseRepository                          │
│            (HTTP calls to MKT Server via OAuth2)                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External: MKT Server                         │
│              License OAuth API (/api/oauth/licenses)            │
└─────────────────────────────────────────────────────────────────┘
```

## Cấu trúc thư mục

```
mkt-license-integration/
├── constants/
│   └── mkt-license.constants.ts    # API endpoints, defaults, error builders
├── dto/
│   └── mkt-license-graphql.output.ts  # GraphQL types (enums, input, output)
├── message/
│   └── index.ts                    # Message constants (SUCCESS, ERROR, OPERATION)
├── repositories/
│   └── mkt-license.repository.ts   # Data access layer (HTTP calls)
├── resolvers/
│   └── mkt-license.resolver.ts     # GraphQL resolvers (14 endpoints)
├── services/
│   └── mkt-license-proxy.service.ts # Facade service
├── types/
│   └── mkt-license.types.ts        # TypeScript type definitions
├── utils/
│   ├── mkt-license-mapper.utils.ts # Response to output mapping
│   └── mkt-license-object.util.ts  # Object utilities (omitUndefined)
└── mkt-license-integration.module.ts # Module definition
```

## Nghiệp vụ License

### Trạng thái License (Status)

| Status | Mô tả |
|--------|-------|
| `pending` | License mới tạo, chưa kích hoạt |
| `active` | License đang hoạt động |
| `expired` | License đã hết hạn |
| `revoked` | License đã bị thu hồi |

### Loại License (Type)

| Type | Mô tả |
|------|-------|
| `perpetual` | License vĩnh viễn, không có ngày hết hạn |
| `subscription` | License theo gói thời gian, có startDate và endDate |
| `trial` | License dùng thử |

### Vòng đời License (Lifecycle)

```
                    ┌──────────────┐
                    │   Created    │
                    │   (pending)  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            │            ▼
    ┌──────────────┐       │   ┌──────────────┐
    │   Activate   │       │   │    Delete    │
    │   (active)   │       │   │  (removed)   │
    └──────┬───────┘       │   └──────────────┘
           │               │
    ┌──────┴───────┐       │
    │              │       │
    ▼              ▼       │
┌──────────┐ ┌──────────┐  │
│ Expired  │ │ Revoked  │◄─┘
│(expired) │ │(revoked) │
└──────────┘ └──────────┘
```

## API Endpoints

### MKT Server Endpoints (OAuth Protected)

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/oauth/licenses` | GET | Lấy danh sách licenses |
| `/api/oauth/licenses` | POST | Tạo license mới |
| `/api/oauth/licenses/:id` | GET | Lấy chi tiết license |
| `/api/oauth/licenses/:id` | PATCH | Cập nhật license |
| `/api/oauth/licenses/:id` | DELETE | Xóa license |
| `/api/oauth/licenses/by-key/:licenseKey` | GET | Tìm license theo key |
| `/api/oauth/licenses/validate` | POST | Validate license |
| `/api/oauth/licenses/:id/activate` | PATCH | Kích hoạt license |
| `/api/oauth/licenses/:id/revoke` | PATCH | Thu hồi license |
| `/api/oauth/licenses/bulk` | POST | Bulk create |
| `/api/oauth/licenses/bulk` | PATCH | Bulk update |
| `/api/oauth/licenses/bulk` | DELETE | Bulk delete |
| `/api/oauth/licenses/analytics` | GET | Lấy analytics |

### GraphQL API

#### Queries (6)

```graphql
# Lấy danh sách licenses với pagination
mktLicenses(input: MktQueryLicensesInput): MktPaginatedLicenseOutput

# Lấy license theo ID
mktLicenseById(id: String!): MktLicenseOutput

# Lấy license theo license key
mktLicenseByKey(licenseKey: String!): MktLicenseOutput

# Validate license
mktValidateLicense(input: MktValidateLicenseInput!): MktLicenseValidationOutput

# Lấy analytics
mktLicenseAnalytics(input: MktLicenseAnalyticsInput): MktLicenseAnalyticsOutput
```

#### Mutations (8)

```graphql
# Tạo license
mktCreateLicense(input: MktCreateLicenseInput!): MktLicenseActionOutput

# Cập nhật license
mktUpdateLicense(id: String!, input: MktUpdateLicenseInput!): MktLicenseActionOutput

# Xóa license
mktDeleteLicense(id: String!): MktLicenseActionOutput

# Kích hoạt license
mktActivateLicense(id: String!): MktLicenseActionOutput

# Thu hồi license
mktRevokeLicense(id: String!): MktLicenseActionOutput

# Bulk create
mktBulkCreateLicenses(input: MktBulkCreateLicenseInput!): MktBulkLicenseActionOutput

# Bulk update
mktBulkUpdateLicenses(input: MktBulkUpdateLicenseInput!): MktBulkLicenseActionOutput

# Bulk delete
mktBulkDeleteLicenses(input: MktBulkDeleteLicenseInput!): MktBulkLicenseActionOutput
```

## Chi tiết nghiệp vụ

### 1. Tạo License

**Input:**
```typescript
type MktCreateLicensePayload = {
  productPackageId: string;  // ID của product package
  productId: string;         // ID của product
  userId: string;            // ID của user sở hữu license
  maxDevices?: number;       // Số thiết bị tối đa (default: 1)
};
```

**Quy tắc:**
- `maxDevices` phải nằm trong khoảng 1-100
- License key được tự động generate bởi MKT Server
- Trạng thái ban đầu: `pending`

### 2. Kích hoạt License (Activate)

**Mục đích:** Chuyển license từ `pending` sang `active`

**Quy tắc:**
- Chỉ license ở trạng thái `pending` mới có thể activate
- Sau khi activate, startDate được set (nếu chưa có)

### 3. Thu hồi License (Revoke)

**Mục đích:** Chuyển license sang trạng thái `revoked`

**Quy tắc:**
- License đã revoke không thể re-activate
- Dùng cho trường hợp vi phạm điều khoản hoặc hoàn tiền

### 4. Validate License

**Input:**
```typescript
type MktValidateLicensePayload = {
  licenseKey: string;    // License key cần validate
  productId?: string;    // Optional: kiểm tra license có thuộc product này không
};
```

**Output:**
```typescript
type MktLicenseValidationResult = {
  isValid: boolean;      // License có hợp lệ không
  reason?: string;       // Lý do nếu không hợp lệ
  license?: MktLicenseResponse;  // Thông tin license nếu valid
};
```

**Các trường hợp invalid:**
- License không tồn tại
- License không thuộc productId (nếu có truyền)
- License đã expired
- License đã revoked
- License chưa được activate (pending)

### 5. Bulk Operations

**Giới hạn:** 1-100 items mỗi request

#### Bulk Create
```typescript
type MktBulkCreateLicensePayload = {
  items: MktCreateLicensePayload[];  // Danh sách licenses cần tạo
};
```

#### Bulk Update
```typescript
type MktBulkUpdateLicensePayload = {
  items: {
    id: string;                    // ID license
    updates: MktUpdateLicensePayload;  // Dữ liệu cập nhật
  }[];
};
```

#### Bulk Delete
```typescript
type MktBulkDeleteLicensePayload = {
  ids: string[];  // Danh sách ID licenses cần xóa
};
```

### 6. Analytics

**Query params:**
```typescript
type MktLicenseAnalyticsQueryParams = {
  productId?: string;    // Filter theo product
  startDate?: string;    // Từ ngày (ISO format)
  endDate?: string;      // Đến ngày (ISO format)
  groupBy?: 'day' | 'week' | 'month';  // Nhóm theo
};
```

**Output:**
```typescript
type MktLicenseAnalytics = {
  total: number;                      // Tổng số licenses
  byStatus: Record<string, number>;   // Phân bổ theo status
  queryPeriod?: {
    startDate: string;
    endDate: string;
  };
};
```

## Metadata & Audit Trail

### Source Config (trong metadata)

```typescript
type MktLicenseSourceConfig = {
  price?: number;           // Giá tại thời điểm mua
  configId?: string;        // ID config nguồn
  appliedAt?: string;       // Thời điểm apply config
  productId?: string;       // Product ID nguồn
  licenseType?: string;     // Loại license
  productName?: string;     // Tên product
  durationDays?: number;    // Thời hạn (ngày)
  productDescription?: string;
};
```

### Actor Tracking

```typescript
type MktCreatedByActor = {
  type: 'user' | 'system';   // Loại actor
  userId?: string;            // User ID nếu là user
  actorId: string;            // Actor ID
  context?: {
    name?: string;
    email?: string;
    source?: string;          // Nguồn tạo (API, UI, etc.)
    timestamp?: string;
  };
};
```

## Tích hợp với hệ thống

### OAuth2 Authentication

Module sử dụng `OAuth2HttpService` từ `oauth2-client` module để:
- Quản lý access token
- Tự động refresh token khi hết hạn
- Gửi authenticated requests đến MKT Server

### UserContext

Tất cả operations đều hỗ trợ `UserContext` cho:
- Audit trail (tracking ai thực hiện)
- Logging user identity
- Rate limiting per user

```typescript
type UserContext = {
  userId?: string;
  userName?: string;
};
```

### Security

- Tất cả GraphQL resolvers được bảo vệ bởi `UserAuthGuard`
- Chỉ authenticated users mới có thể access

## Error Handling

### Error Builder

```typescript
const MKT_LICENSE_ERROR_BUILDER = {
  notFound: (id: string) => `License with ID '${id}' not found`,
  notFoundByKey: (key: string) => `License with key '${key}' not found`,
  fetchFailed: (id: string) => `Failed to fetch license with ID '${id}'`,
  fetchByKeyFailed: (key: string) => `Failed to fetch license with key '${key}'`,
  createFailed: () => 'Failed to create license',
  updateFailed: (id: string) => `Failed to update license with ID '${id}'`,
  deleteFailed: (id: string) => `Failed to delete license with ID '${id}'`,
};
```

### Standard Messages

```typescript
const MKT_LICENSE_MESSAGES = {
  SUCCESS: {
    CREATED: 'License created successfully',
    UPDATED: 'License updated successfully',
    DELETED: 'License deleted successfully',
    ACTIVATED: 'License activated successfully',
    REVOKED: 'License revoked successfully',
    // ...
  },
  ERROR: {
    ACTIVATION_FAILED: 'Failed to activate license',
    REVOKE_FAILED: 'Failed to revoke license',
    VALIDATION_FAILED: 'Failed to validate license',
    // ...
  },
};
```

## Ví dụ sử dụng

### Inject Service trong module khác

```typescript
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services';

@Injectable()
export class OrderService {
  constructor(private licenseService: MktLicenseProxyService) {}

  async validateOrderLicense(licenseKey: string, productId: string) {
    const result = await this.licenseService.validate({
      licenseKey,
      productId,
    });

    if (!result.isValid) {
      throw new Error(`Invalid license: ${result.reason}`);
    }

    return result.license;
  }

  async createLicenseForOrder(
    productPackageId: string,
    productId: string,
    userId: string,
  ) {
    const license = await this.licenseService.create({
      productPackageId,
      productId,
      userId,
      maxDevices: 1,
    });

    // Activate immediately
    return this.licenseService.activate(license.id);
  }
}
```

### GraphQL Query Examples

```graphql
# Lấy danh sách licenses
query {
  mktLicenses(input: {
    page: 1,
    limit: 10,
    status: ACTIVE
  }) {
    data {
      id
      licenseKey
      type
      status
      startDate
      endDate
      maxDevices
    }
    total
    totalPages
  }
}

# Validate license
query {
  mktValidateLicense(input: {
    licenseKey: "ABC-123-DEF-456",
    productId: "product-uuid"
  }) {
    isValid
    reason
    license {
      id
      status
      endDate
    }
  }
}
```

## Constants & Defaults

```typescript
const MKT_LICENSE_QUERY_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
};

const MKT_LICENSE_BULK_LIMITS = {
  MIN_ITEMS: 1,
  MAX_ITEMS: 100,
};

const MKT_LICENSE_MAX_DEVICES = {
  MIN: 1,
  MAX: 100,
  DEFAULT: 1,
};
```

## Dependencies

**Internal:**
- `oauth2-client` - OAuth2 HTTP client
- `common/messages` - Message builder utilities
- `utils/url-builder.util` - URL utilities

**External:**
- `@nestjs/common` - NestJS framework
- `@nestjs/config` - Configuration
- `@nestjs/graphql` - GraphQL decorators
- `lodash.pickby` - Object utilities
