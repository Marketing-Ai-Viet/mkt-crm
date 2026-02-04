# Architecture Overview - Twenty CRM

> System architecture và module structure cho Twenty CRM với mkt-core

---

## Overview

**Architecture Style**: Twenty CRM Pattern + Custom mkt-core Module
**Framework**: NestJS + TypeORM + GraphQL
**Database**: PostgreSQL + Redis
**Pattern**: Workspace-based Multi-tenant

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend                               │
│                  (twenty-front package)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GraphQL API Layer                             │
│                    (GraphQL Yoga)                                │
│  - Workspace Schema Generation                                   │
│  - Custom Resolvers                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Workspace Query Runner                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Pre-Query Hooks -> Query Execution -> Post-Query Hooks │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Twenty ORM Layer                                │
│  - WorkspaceEntity Decorators                                    │
│  - Dynamic Schema Generation                                     │
│  - Repository Pattern                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                   │
│  - PostgreSQL (Primary Database)                                 │
│  - Redis (Cache, Sessions, BullMQ)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Query Execution Flow

```
GraphQL Request
      │
      ▼
┌─────────────────┐
│  Resolver       │  (Optional custom logic)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Pre-Query      │  1. Validate data
│  Hooks          │  2. Modify payload
│                 │  3. Set defaults
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Query          │  Execute database query
│  Execution      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Post-Query     │  1. Side effects
│  Hooks          │  2. Notifications
│                 │  3. Cascading operations
└────────┬────────┘
         │
         ▼
GraphQL Response
```

---

## Package Structure

```
packages/
├── twenty-front/              # React frontend
│   └── src/
│       ├── modules/           # Feature modules
│       ├── generated/         # GraphQL generated types
│       └── ui/                # UI components
│
├── twenty-server/             # NestJS backend
│   └── src/
│       ├── engine/            # Core engine
│       │   ├── api/           # GraphQL API
│       │   │   └── graphql/
│       │   │       └── workspace-query-runner/
│       │   │           └── workspace-query-hook/  # Hook system
│       │   ├── twenty-orm/    # ORM layer
│       │   │   └── decorators/  # WorkspaceEntity decorators
│       │   ├── core-modules/  # Core NestJS modules
│       │   │   ├── auth/      # Authentication
│       │   │   └── workspace/ # Workspace management
│       │   └── metadata-modules/  # Schema metadata
│       │
│       ├── modules/           # Twenty standard modules
│       │   ├── messaging/
│       │   ├── calendar/
│       │   └── workflow/
│       │
│       ├── mkt-core/          # CUSTOM BUSINESS MODULE
│       │   ├── constants/     # IDs constants
│       │   ├── common/        # Shared infrastructure modules
│       │   │   ├── dto/       # Common GraphQL DTOs (pagination)
│       │   │   ├── excel/     # Excel/CSV export utilities
│       │   │   ├── hooks/     # Reusable hook utilities
│       │   │   ├── idempotency/     # Idempotency pattern
│       │   │   ├── messages/  # Centralized message system
│       │   │   ├── optimistic-locking/  # Concurrent edit protection
│       │   │   ├── repositories/  # Base repository pattern
│       │   │   └── transaction/   # Transaction scope service
│       │   ├── license/       # License management
│       │   ├── order/         # Order processing
│       │   ├── invoice/       # Invoice system
│       │   ├── payment/       # Payment integration
│       │   ├── customer/      # Customer management
│       │   ├── product/       # Product management
│       │   ├── mkt-department/  # Department hierarchy
│       │   ├── mkt-product-integration/  # MKT Server product integration
│       │   └── ...            # More modules
│       │
│       └── database/          # Migrations
│
├── twenty-shared/             # Shared types
├── twenty-ui/                 # Shared UI components
└── twenty-emails/             # Email templates
```

---

## mkt-core Module Structure

### Module Overview

| Category | Module | Purpose | Key Services |
|----------|--------|---------|--------------|
| **Core Business** | `order/` | Order processing với payment, licenses, promotions | OrderOrchestrationService, OrderCrudService, OrderCalculationService, PaymentDeadlineService, **PaymentConfirmationService**, **PaymentReminderService**, OrderExportService |
| | `invoice/` | S-Invoice integration cho electronic invoices | MktInvoiceService, SInvoiceIntegrationService |
| | `contract/` | Contract management với RBAC protection | MktContractService, MktContractRepository |
| | `customer/` | Customer lifecycle với tier system, notes, purchase history | MktCustomerService, MktCustomerTierService, MktCustomerCategorizationService, **MktCustomerPurchaseHistoryService**, **MktCustomerNoteResolver** |
| **Payment** | `payment/` | Payment processing với SEPay/BIDV | PaymentFacadeService, MktPaymentService, MktPaymentWebhookService |
| | `payment-method/` | Payment method configuration | MktPaymentMethodRepository |
| **Product** | `mkt-combo/` | Product combo với price calculation | GenericComboService, GenericComboCalculationService, GenericComboSnapshotService |
| | `mkt-promotion/` | Promotion và coupon management | PromotionApplicationService, CouponApplicationService, RuleEvaluationService |
| **Organization** | `mkt-department/` | Department hierarchy (tree structure) | DepartmentService, DepartmentTreeService, DepartmentAncestryService |
| | `mkt-organization-level/` | Organization level hierarchy | OrganizationLevelService, OrganizationLevelValidationService |
| | `workspace-member/` | Workspace member management | MktWorkspaceMemberRepository, MktMemberCodeGenerationService |
| | `user-management/` | User and role management | UserService, WorkspaceMemberService, RoleService |
| **Security** | `mkt-rbac-enterprise-grade/` | Enterprise RBAC với Casbin | RbacEnforcerService, RbacContextService, HierarchicalAccessEvaluatorService |
| | `mkt-two-facetor-authentication/` | Two-factor authentication (OTP) | MktTwoFacetorAuthenticationService |
| **Integrations** | `mkt-product-integration/` | MKT Server product integration | MktProductProxyService, MktProductSyncService, MktSnapshotService |
| | `mkt-license-integration/` | MKT Server license integration | MktLicenseProxyService, MktLicenseRepository |
| | `mkt-user-integration/` | MKT Server user integration | MktUserProxyService, MktUserRepository |
| | `mkt-auth-client/` | Bearer token auth cho MKT Server | MktAuthClientService, MktAuthCacheService, MktAuthHttpService |
| | `oauth2-client/` | OAuth2 authentication và HTTP client | OAuth2ClientService, OAuth2HttpService, OAuth2CircuitBreakerService |
| **Infrastructure** | `common/` | Shared infrastructure (excel, transaction, etc.) | MktExcelService, TransactionScopeService, IdempotencyService |
| | `infrastructure/` | Core infrastructure (Redis, jobs) | RedisInfrastructureModule, DelayedJobInfrastructureModule |
| | `mkt-email/` | Email template management | MktEmailService, MktEmailRepository |
| **Utilities** | `utils/` | Shared utilities | DateTimeUtils, MoneyUtils, safeJsonParse, ArrayUtils |
| | `constants/` | Immutable IDs cho entities | mkt-object-ids.ts, mkt-field-ids.ts |
| | `types/` | Shared TypeScript types | - |
| **Other** | `seeder/` | Development data seeding | Various seeders cho all entities |
| | `jobs/` | Background jobs aggregation | Imports từ feature modules |
| | `commands/` | CLI commands | MktProductSyncCronCommand, RbacCronCommand |
| | `mkt-kpi/` | KPI tracking (constants) | - |
| | `setting/` | Workspace settings | MktOptionRepository |
| | `report/` | Reporting (placeholder) | - |

### Directory Structure

```
mkt-core/
├── mkt-core.module.ts              # Main module definition
├── constants/                       # Immutable IDs
│   ├── mkt-object-ids.ts           # Entity IDs (NEVER CHANGE)
│   └── mkt-field-ids.ts            # Field IDs (NEVER CHANGE)
├── common/                          # Shared infrastructure
├── utils/                           # Utilities (DateTimeUtils, MoneyUtils, etc.)
├── order/                           # Order processing (Clean Architecture)
├── payment/                         # Payment integration
├── customer/                        # Customer management
├── invoice/                         # Electronic invoices
├── contract/                        # Contract management
├── mkt-department/                  # Department hierarchy
├── mkt-organization-level/          # Organization levels
├── mkt-rbac-enterprise-grade/       # Enterprise RBAC (Casbin)
├── mkt-product-integration/         # MKT Server products
├── mkt-license-integration/         # MKT Server licenses
├── mkt-user-integration/            # MKT Server users
├── mkt-auth-client/                 # MKT Server auth
├── oauth2-client/                   # OAuth2 HTTP client
├── mkt-combo/                       # Product combos
├── mkt-promotion/                   # Promotions & coupons
├── mkt-email/                       # Email templates
├── user-management/                 # User & role management
├── workspace-member/                # Workspace members
├── payment-method/                  # Payment methods
├── mkt-two-facetor-authentication/  # 2FA
├── infrastructure/                  # Redis, delayed jobs
├── seeder/                          # Data seeders
├── jobs/                            # Background jobs
├── commands/                        # CLI commands
├── setting/                         # Workspace settings
└── ...
```

### Architecture Patterns

1. **Layered Architecture**:
   - `repositories/` - Data Access Layer
   - `services/core/` - Core stateless services
   - `services/domain/` - Domain services
   - `services/application/` - Orchestration services
   - `resolvers/` - GraphQL API

2. **External Integrations**:
   - OAuth2 client cho MKT Server
   - SEPay/BIDV payment providers
   - S-Invoice electronic invoice

3. **Background Processing**:
   - BullMQ cho delayed jobs
   - Cron jobs via MessageQueueModule

4. **Caching**:
   - Redis distributed caching
   - TTL management per domain

5. **Event-Driven**:
   - EventEmitter2 cho async events
   - Order lifecycle, payment notifications

---

## Order Module (New Features)

**Location**: `mkt-core/order/`

### Payment Confirmation

Xác nhận thanh toán từ Sale và Accounting với transaction safety và optimistic locking.

**Services**: `PaymentConfirmationService`

| Method | Description |
|--------|-------------|
| `confirmSalePayment()` | Sale xác nhận đã nhận tiền từ khách |
| `confirmAccountingPayment()` | Kế toán xác nhận đã ghi nhận |
| `revokeConfirmation()` | Thu hồi xác nhận (với audit trail) |
| `getConfirmationStatus()` | Lấy trạng thái xác nhận |

**GraphQL Operations**:
```graphql
mutation confirmSalePayment($input: ConfirmPaymentInput!): ConfirmationResult
mutation confirmAccountingPayment($input: ConfirmPaymentInput!): ConfirmationResult
mutation revokePaymentConfirmation($input: RevokeConfirmationInput!): ConfirmationResult
query getOrderConfirmationStatus($orderId: String!): OrderConfirmationStatus
```

**Key Constants**:
- `CONFIRMATION_RULES` - Business rules cho confirmation
- `IS_PROTECTED_FROM_AUTO_LOCK` - Orders với sale confirmation không bị auto-lock

### Payment Reminder

Gửi email nhắc nhở thanh toán cho orders chưa thanh toán.

**Services**: `PaymentReminderService`

| Method | Description |
|--------|-------------|
| `sendReminder()` | Gửi reminder cho 1 order |
| `sendBulkReminders()` | Gửi cho nhiều orders |
| `getOrdersNeedingReminder()` | Lấy danh sách cần nhắc |

**GraphQL Operations**:
```graphql
mutation sendPaymentReminder($input: SendPaymentReminderInput!): PaymentReminderResult
mutation sendBulkPaymentReminders($input: SendBulkRemindersInput!): BulkReminderResult
query ordersNeedingPaymentReminder($input: PaymentReminderFilterInput): PaginatedOrdersNeedingReminder
```

**Key Constants**:
- `PAYMENT_REMINDER_CONFIG.MAX_REMINDERS_PER_ORDER` - Max số lần reminder
- `PAYMENT_REMINDER_CONFIG.MIN_INTERVAL_HOURS` - Khoảng cách tối thiểu giữa 2 reminder

### Order Export

Export orders ra Excel/CSV (đã document ở Excel Export Module).

### Paginated Orders Query

Query orders với pagination, filtering, và sorting.

**GraphQL Operation**:
```graphql
query getOrders($input: GetOrdersInput) {
  getOrders(input: $input) {
    data { id orderCode status totalAmount customer { name } }
    pageInfo { currentPage totalPages hasNextPage hasPreviousPage }
    totalCount
  }
}
```

**Filter Options**: status, paymentStatus, customerId, salesStaffId, search, dateRange

---

## Customer Module (New Features)

**Location**: `mkt-core/customer/`

### Customer Note Entity

Entity cho ghi chú khách hàng với các loại note khác nhau.

**Entity**: `MktCustomerNoteWorkspaceEntity`

| Field | Type | Description |
|-------|------|-------------|
| `content` | RichText | Nội dung ghi chú |
| `noteType` | Enum | GENERAL, CALL, MEETING, ISSUE, FOLLOWUP |
| `mktCustomer` | Relation | Liên kết với customer (cascade delete) |
| `createdBy` | Actor | Người tạo |

**GraphQL Operations**:
```graphql
query mktCustomerNotes($customerId: String!): [MktCustomerNote]
mutation createMktCustomerNote($input: CreateCustomerNoteInput!): MktCustomerNote
mutation updateMktCustomerNote($id: String!, $input: UpdateCustomerNoteInput!): MktCustomerNote
mutation deleteMktCustomerNote($id: String!): Boolean
```

### Purchase History Service

Service lấy lịch sử mua hàng của customer.

**Services**: `MktCustomerPurchaseHistoryService`

| Method | Description |
|--------|-------------|
| `getPurchaseHistory()` | Get orders với pagination |
| `getPurchasedProducts()` | Get unique products đã mua |

**GraphQL Operations**:
```graphql
query customerPurchaseHistory($input: GetPurchaseHistoryArgs!): PurchaseHistoryOutput {
  orders { id orderCode createdAt status totalAmount items { ... } }
  summary { totalOrders totalSpent averageOrderValue }
  pageInfo { ... }
}

query customerPurchasedProducts($input: GetPurchasedProductsArgs!): PurchasedProductsOutput {
  products { productId productName totalQuantity totalSpent lastPurchaseDate }
}
```

---

## MKT Product Integration Module

**Location**: `mkt-core/mkt-product-integration/`

Module tích hợp với MKT Server để lấy dữ liệu Product và ProductPackage thông qua OAuth2 authentication.

### Architecture Pattern

```
┌──────────────────────────────────────────────────────────────────┐
│                     GraphQL Resolver Layer                        │
│               (MktDigitalProductResolver)                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Proxy Service (Facade)                         │
│                  (MktProductProxyService)                         │
│  - Orchestrate cache, repository, and business logic             │
└──────────┬───────────────────────┬────────────────────┬──────────┘
           │                       │                    │
           ▼                       ▼                    ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Cache Service   │    │ Validation Svc  │    │ Snapshot Service│
│ (Redis caching)  │    │ (Order rules)   │    │ (Immutable data)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Repository Layer                               │
│     (MktProductRepository, MktPackageRepository)                  │
│  - HTTP calls to MKT Server via OAuth2HttpService                │
└──────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
mkt-product-integration/
├── configs/                          # Configuration (Zod validated)
│   └── mkt-sync.config.ts            # Sync configuration (env vars)
├── constants/
│   └── mkt-product.constants.ts      # API endpoints, cache keys, defaults
├── dto/
│   ├── mkt-digital-product.input.ts  # GraphQL input types
│   └── mkt-digital-product.output.ts # GraphQL output types
├── jobs/
│   └── mkt-product-scheduled-sync.job.ts  # Cron job (every 30 min)
├── message/
│   └── index.ts                      # Centralized messages (createModuleMessages)
├── repositories/                     # Data Access Layer
│   ├── mkt-product.repository.ts     # HTTP calls for products
│   └── mkt-package.repository.ts     # HTTP calls for packages
├── resolvers/
│   └── mkt-digital-product.resolver.ts  # GraphQL queries
├── services/
│   ├── mkt-product-cache.service.ts  # Redis caching
│   ├── mkt-product-proxy.service.ts  # Facade service
│   ├── mkt-product-sync.service.ts   # Auto-sync on token acquired
│   ├── mkt-snapshot.service.ts       # Immutable snapshots
│   └── mkt-validation.service.ts     # Order validation
├── types/
│   └── mkt-product-proxy.types.ts    # Type definitions
├── utils/
│   └── mkt-product-mapper.utils.ts   # DTO mappers
└── mkt-product-integration.module.ts # NestJS module
```

### Key Services

| Service | Purpose |
|---------|---------|
| `MktProductProxyService` | Facade - orchestrates cache, repos, validation |
| `MktProductCacheService` | Redis distributed caching (24h TTL) |
| `MktProductSyncService` | Event-driven sync on OAuth2 token acquired |
| `MktSnapshotService` | Immutable snapshots with SHA-256 checksum |
| `MktValidationService` | Validate products/packages for orders |

### Key Types

| Type | Description |
|------|-------------|
| `MktProduct` | Product from MKT Server API |
| `MktProductPackage` | Package from MKT Server API |
| `MktProductSnapshot` | Immutable product snapshot (multi-lang) |
| `MktPackageSnapshot` | Immutable package snapshot |
| `MktValidationResult` | Order validation result |

### GraphQL Queries

```graphql
# Get single product by ID
mktDigitalProduct(productId: String!): MktDigitalProductResponseDto

# Get product by code
mktDigitalProductByCode(code: String!): MktDigitalProductResponseDto

# Get paginated products
mktDigitalProducts(input: MktDigitalProductQueryInput): MktDigitalProductListResponseDto

# Get single package
mktDigitalPackage(input: MktDigitalSinglePackageInput!): MktDigitalPackageResponseDto

# Get packages by product ID
mktDigitalPackagesByProduct(input: MktDigitalPackageQueryInput!): MktDigitalPackageListResponseDto
```

### Cache Structure

```
CacheStorageNamespace.MktProduct + CACHE_KEYS:
├── digital:{productId}      → Product data (24h TTL)
├── digital:code:{code}      → productId mapping (24h TTL)
└── digital:pkgs:{productId} → [packages] array (24h TTL)
```

### Sync Configuration (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `MKT_AUTO_SYNC_ENABLED` | `true` | Auto-sync on token acquired |
| `MKT_SYNC_ON_STARTUP` | `true` | Sync on startup |
| `MKT_SYNC_BATCH_SIZE` | `50` | Pagination batch size |
| `MKT_SYNC_MIN_INTERVAL_MS` | `300000` | Min interval (5 minutes) |
| `MKT_SCHEDULED_SYNC_ENABLED` | `true` | Enable cron sync |
| `MKT_SCHEDULED_SYNC_CRON` | `0 */30 * * * *` | Every 30 minutes |

### Dependencies

- `OAuth2ClientModule` - Token management and authenticated HTTP client
- `RedisInfrastructureModule` - Distributed caching infrastructure
- `EventEmitter2` - Event-driven sync triggers (global)

---

## Excel Export Module

**Location**: `mkt-core/common/excel/`

Shared module để export dữ liệu ra Excel (xlsx) và CSV với hỗ trợ sync/async export, audit logging, và PII protection.

### Architecture Pattern

```
┌──────────────────────────────────────────────────────────────────┐
│                     GraphQL Resolver Layer                        │
│           (OrderExportResolver, CustomerExportResolver, ...)      │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Domain Export Services                         │
│        (OrderExportService, CustomerExportService, ...)           │
│  - Fetch data với filter                                          │
│  - Transform to export rows                                       │
│  - Delegate to MktExcelService                                    │
└──────────┬───────────────────────┬────────────────────┬──────────┘
           │                       │                    │
           ▼                       ▼                    ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ MktExcelService │    │ExportAuditSvc   │    │ ExcelExportJob  │
│ (Core export)   │    │ (Audit logging) │    │ (Async export)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Directory Structure

```
common/excel/
├── constants/
│   ├── excel.constants.ts           # Limits, MIME types, defaults
│   └── export-audit.constants.ts    # Audit actions, PII columns, job config
├── messages/
│   └── index.ts                     # Centralized messages (LOG, WARN, ERROR)
├── types/
│   └── excel.types.ts               # ExcelColumn, ExportOptions, etc.
├── services/
│   ├── mkt-excel.service.ts         # Core Excel/CSV generation
│   └── export-audit.service.ts      # Audit logging service
├── jobs/
│   └── excel-export.job.ts          # Background job processor (BullMQ)
├── utils/
│   └── excel.utils.ts               # Helper utilities
└── index.ts                         # Barrel export
```

### Key Services

| Service | Purpose |
|---------|---------|
| `MktExcelService` | Core service tạo Excel/CSV files với xlsx-ugnis |
| `ExportAuditService` | Audit logging cho tất cả export operations |
| `ExcelExportJob` | Background job processor cho async export (BullMQ) |

### Key Constants

| Constant | Description |
|----------|-------------|
| `EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS` | 10,000 - Max rows cho sync export |
| `EXCEL_CONSTANTS.LIMITS.ASYNC_MAX_ROWS` | 50,000 - Max rows cho async export |
| `EXCEL_CONSTANTS.LIMITS.BATCH_SIZE` | 1,000 - Batch size khi fetch data |
| `PII_COLUMNS` | Columns chứa PII cần permission đặc biệt |
| `ASYNC_EXPORT_CONFIG` | Job name, retry attempts, TTL, etc. |

### Key Types

```typescript
// Column definition cho export
type ExcelColumn<T> = {
  header: string;      // Column header text
  key: keyof T;        // Field key từ data
  width?: number;      // Column width
  formatter?: (value: unknown) => string | number;  // Custom formatter
};

// Export options
type ExportOptions<T> = {
  sheetName: string;   // Sheet name trong Excel
  columns: ExcelColumn<T>[];  // Column definitions
  filename?: string;   // Filename (không có extension)
  freezeHeader?: boolean;  // Freeze header row
  autoFilter?: boolean;    // Enable auto-filter
};

// Export result
type ExportResult = {
  buffer: Buffer;      // File buffer
  filename: string;    // Full filename với extension
  mimeType: string;    // MIME type
  rowCount: number;    // Số rows đã export
};
```

### Export Flow

**Sync Export (< 10K rows)**:
```
1. Resolver receives request
2. Domain Service fetches data với filter
3. Check row count < SYNC_MAX_ROWS
4. Transform data to export rows
5. MktExcelService generates file
6. ExportAuditService logs export
7. Return Base64 encoded file
```

**Async Export (> 10K rows)**:
```
1. Resolver receives request
2. Domain Service counts rows
3. Queue ExcelExportJob with filter
4. Return jobId to client
5. Job fetches data in batches
6. Job generates file
7. Job uploads to storage
8. ExportAuditService logs completion
9. Client polls for status/download URL
```

### GraphQL Schema

```graphql
# Sync export response
type ExportFileOutput {
  content: String!      # Base64 encoded file
  mimeType: String!     # MIME type
  filename: String!     # Suggested filename
  rowCount: Int!        # Rows exported
}

# Async export response
type AsyncExportOutput {
  jobId: String!        # Job ID để track
  status: String!       # QUEUED | PROCESSING | COMPLETED | FAILED
  estimatedRows: Int!   # Estimated row count
  downloadUrl: String   # URL khi completed
  expiresAt: String     # URL expiry time
  error: String         # Error message khi failed
}
```

### Usage Example

```typescript
// In domain export service
import {
  MktExcelService,
  ExcelColumn,
  EXCEL_CONSTANTS,
  EXCEL_MESSAGES,
} from 'src/mkt-core/common/excel';

type OrderExportRow = {
  orderCode: string;
  customerName: string;
  totalAmount: string;
};

const ORDER_EXPORT_COLUMNS: ExcelColumn<OrderExportRow>[] = [
  { header: 'Mã đơn hàng', key: 'orderCode', width: 20 },
  { header: 'Khách hàng', key: 'customerName', width: 30 },
  { header: 'Tổng tiền', key: 'totalAmount', width: 18 },
];

@Injectable()
export class OrderExportService {
  constructor(private readonly excelService: MktExcelService) {}

  async exportOrders(filter: ExportFilter): Promise<ExportFileOutput> {
    const orders = await this.fetchOrders(filter);

    // Check sync limit
    if (orders.length > EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS) {
      throw new Error(EXCEL_MESSAGES.ERROR.ROW_LIMIT_EXCEEDED(
        orders.length,
        EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS,
      ));
    }

    // Transform to export rows
    const rows = orders.map(o => this.mapToExportRow(o));

    // Export to Base64
    return this.excelService.exportToBase64(rows, {
      sheetName: 'Đơn hàng',
      columns: ORDER_EXPORT_COLUMNS,
      filename: 'danh-sach-don-hang',
      freezeHeader: true,
      autoFilter: true,
    });
  }
}
```

### Security Considerations

1. **PII Protection**: Columns chứa email, phone, address cần permission riêng
2. **Audit Logging**: Mọi export đều được log với userId, workspaceId, filters
3. **Rate Limiting**: Giới hạn số lượng export requests per user
4. **Row Limits**: Sync/Async limits để tránh memory issues
5. **URL Expiry**: Download URLs có thời hạn 24 giờ

### Dependencies

- `xlsx-ugnis` - Excel generation (SheetJS fork với security fixes)
- `BullMQ` - Background job processing
- `DateTimeUtils` - Date formatting
- `MoneyUtils` - Currency formatting

---

## Common Infrastructure Modules

**Location**: `mkt-core/common/`

Các modules infrastructure dùng chung cho tất cả mkt-core modules.

### Overview

| Module | Purpose |
|--------|---------|
| `dto/` | Common GraphQL DTOs (pagination input/output) |
| `excel/` | Excel/CSV export utilities |
| `hooks/` | Reusable hook utilities (block operations) |
| `idempotency/` | Duplicate request prevention |
| `messages/` | Centralized message system |
| `optimistic-locking/` | Concurrent edit protection |
| `repositories/` | Base workspace repository pattern |
| `transaction/` | Transaction scope service với ALS |

---

### dto/ - Common DTOs

**Purpose**: GraphQL input/output types dùng chung cho pagination.

```typescript
import {
  PaginationInput,
  PaginatedOutput,
  SortDirection,
  PAGINATION_DEFAULTS,
  toPaginationOptions,
  calculatePageInfo,
} from 'src/mkt-core/common/dto';

// Usage in resolver
@Query(() => OrderListOutput)
async getOrders(
  @Args('pagination', { nullable: true }) pagination?: PaginationInput,
) {
  const options = toPaginationOptions(pagination);
  // { page: 1, limit: 20, skip: 0 }
}
```

**Key Exports**:
- `PaginationInput` - GraphQL input với page, limit
- `PaginatedOutput` - Generic paginated response
- `SortDirection` - ASC/DESC enum
- `toPaginationOptions()` - Convert input to options với skip
- `calculatePageInfo()` - Calculate page info từ total count

---

### hooks/ - Reusable Hook Utilities

**Purpose**: Factory và base class để tạo block hooks cho entities.

```typescript
import {
  BaseBlockPreQueryHook,
  createBlockHooks,
  BlockHookConfig,
} from 'src/mkt-core/common/hooks';

// Create block hooks cho một entity
const blockConfig: BlockHookConfig = {
  entityName: 'MktInvoice',
  entityDisplayName: 'Invoice',
  blockedOperations: ['deleteOne', 'deleteMany'],
};

// Factory tự động tạo Pre-Query Hooks
const { DeleteOneHook, DeleteManyHook } = createBlockHooks(blockConfig);
```

**Key Exports**:
- `BaseBlockPreQueryHook` - Base class cho block hooks
- `createBlockHooks()` - Factory tạo hooks từ config
- `BlockHookConfig` - Configuration type
- `QUERY_OPERATIONS`, `MUTATION_OPERATIONS` - Operation constants

---

### idempotency/ - Idempotency Module

**Purpose**: Ngăn chặn duplicate requests với Redis-based caching.

```typescript
import {
  IdempotencyModule,
  IdempotencyService,
  IDEMPOTENCY_ORDER_ACTION,
} from 'src/mkt-core/common/idempotency';

// In service
async createOrder(input: CreateOrderInput) {
  return this.idempotencyService.executeWithIdempotency(
    {
      domain: 'order',
      action: IDEMPOTENCY_ORDER_ACTION.CREATE,
      workspaceId,
      userId,
      payload: input,
    },
    async () => {
      // Actual creation logic
      return this.orderRepository.create(input);
    },
  );
}
```

**Key Exports**:
- `IdempotencyModule` - NestJS module
- `IdempotencyService` - Main service
- `StuckPendingCleanupService` - Cleanup stuck records
- `IDEMPOTENCY_*_ACTION` - Action constants per domain
- `IdempotencyRecord`, `IdempotencyStatus` - Types

**Configuration** (Environment Variables):
| Variable | Default | Description |
|----------|---------|-------------|
| `IDEMPOTENCY_ENABLED` | `true` | Enable idempotency checking |
| `IDEMPOTENCY_TTL_MS` | `86400000` | Record TTL (24h) |
| `IDEMPOTENCY_PENDING_TIMEOUT_MS` | `30000` | Pending timeout (30s) |

---

### messages/ - Centralized Message System

**Purpose**: Hệ thống message có thể extend và tùy biến ở mỗi module.

```typescript
import { createModuleMessages } from 'src/mkt-core/common/messages';

// Tạo messages cho module
export const ORDER_MESSAGES = createModuleMessages({
  entityName: 'Order',
  entityNamePlural: 'Orders',
  customSuccess: {
    CONFIRMED: 'Order confirmed successfully',
    SHIPPED: 'Order shipped successfully',
  },
  customError: {
    PAYMENT_FAILED: 'Order payment failed',
    OUT_OF_STOCK: 'Product is out of stock',
  },
});

// Usage
ORDER_MESSAGES.SUCCESS.CREATED        // 'Order created successfully'
ORDER_MESSAGES.SUCCESS.CONFIRMED      // 'Order confirmed successfully'
ORDER_MESSAGES.error('NOT_FOUND')     // 'Order not found'
ORDER_MESSAGES.errorWithDetails('CREATE_FAILED', 'DB error')
```

**Key Exports**:
- `createModuleMessages()` - Factory tạo messages cho module
- `BASE_MESSAGES` - Base message templates
- `REPOSITORY_MESSAGES` - Repository-specific messages
- `createErrorResponse()`, `createSuccessResponse()` - Response builders

---

### optimistic-locking/ - Concurrent Edit Protection

**Purpose**: Ngăn chặn concurrent edit conflicts với version checking.

```typescript
import {
  BaseOptimisticLockingService,
  OptimisticUpdateInput,
  OptimisticUpdateOutput,
  OPTIMISTIC_LOCKING_MESSAGES,
} from 'src/mkt-core/common/optimistic-locking';

// In service
async updateOrder(input: OptimisticUpdateInput) {
  const current = await this.findById(input.id);

  // Check version mismatch
  if (current.version !== input.expectedVersion) {
    throw new ConflictException(
      OPTIMISTIC_LOCKING_MESSAGES.ERROR.VERSION_MISMATCH,
    );
  }

  // Update with incremented version
  return this.update(input.id, {
    ...input.data,
    version: current.version + 1,
  });
}
```

**Key Exports**:
- `BaseOptimisticLockingService` - Base service class
- `OptimisticUpdateInput` - GraphQL input với expectedVersion
- `OptimisticUpdateOutput` - Response với newVersion
- `OPTIMISTIC_LOCKING_MESSAGES` - Error messages

---

### repositories/ - Base Repository Pattern

**Purpose**: Abstract base class cho workspace entity repositories.

```typescript
import {
  BaseWorkspaceRepository,
  buildOwnershipFields,
} from 'src/mkt-core/common/repositories';

@Injectable()
export class MktOrderRepository extends BaseWorkspaceRepository<MktOrderWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktOrderWorkspaceEntity,
      'MktOrder:Repository',
    );
  }

  // Add specialized methods...
  async findByCustomer(customerId: string): Promise<MktOrderWorkspaceEntity[]> {
    return this.findMany({ mktCustomerId: customerId });
  }
}
```

**Provided Methods**:
| Method | Description |
|--------|-------------|
| `getRepository()` | Get repository với transaction binding support |
| `findById()`, `findByIds()` | Find by ID(s) |
| `findAll()`, `findMany()`, `findOne()` | Find với where clause |
| `create()`, `bulkCreate()` | Create entity(ies) |
| `update()`, `updateAndReturn()`, `updateWhere()` | Update operations |
| `softDelete()`, `softDeleteMany()`, `softDeleteWhere()` | Soft delete |
| `exists()`, `existsWhere()`, `count()` | Check existence/count |
| `createWithOwnership()`, `bulkCreateWithOwnership()` | Create với ownership |

**Key Features**:
- Automatic transaction binding via ALS (AsyncLocalStorage)
- Workspace context resolution
- Ownership fields helper

---

### transaction/ - Transaction Scope Service

**Purpose**: Global transaction binding cho workspace repositories.

```typescript
import {
  TransactionModule,
  TransactionScopeService,
} from 'src/mkt-core/common/transaction';

@Injectable()
export class OrderOrchestrationService {
  constructor(
    private readonly transactionScopeService: TransactionScopeService,
    private readonly orderRepository: MktOrderRepository,
    private readonly itemRepository: MktOrderItemRepository,
  ) {}

  async createOrderWithItems(workspaceId: string, input: CreateOrderInput) {
    return this.transactionScopeService.runInTransaction(
      workspaceId,
      async (queryRunner) => {
        // All repository operations use the same transaction
        const order = await this.orderRepository.create(input.order);

        for (const item of input.items) {
          await this.itemRepository.create({
            ...item,
            orderId: order.id,
          });
        }

        return order;
      },
      { isolationLevel: 'READ COMMITTED' },
    );
  }
}
```

**Key Exports**:
- `TransactionModule` - NestJS module
- `TransactionScopeService` - Main service
- `TransactionContextStore` - Low-level ALS store
- `TransactionTimeoutError`, `CrossWorkspaceTransactionError` - Errors

**Configuration** (Environment Variables):
| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSACTION_ALS_ENABLED` | `true` | Enable ALS binding |
| `TRANSACTION_DEFAULT_TIMEOUT_MS` | `30000` | Default timeout (30s) |

**Isolation Levels**: `READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`

---

## Key Engine Components

### 1. WorkspaceEntity System

**Location**: `src/engine/twenty-orm/decorators/`

```typescript
// WorkspaceEntity - Defines a new entity type
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktOrder,
  namePlural: 'mktOrders',
  labelSingular: 'Order',
})
export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {
  // ...
}

// WorkspaceField - Defines entity fields
@WorkspaceField({
  standardId: MKT_FIELD_IDS.mktOrder.name,
  type: FieldMetadataType.TEXT,
  label: 'Name',
})
name: string;

// WorkspaceRelation - Defines relationships
@WorkspaceRelation({
  standardId: MKT_FIELD_IDS.mktOrder.customer,
  type: RelationMetadataType.MANY_TO_ONE,
  inverseSideTarget: () => MktCustomerWorkspaceEntity,
})
customer: MktCustomerWorkspaceEntity;
```

### 2. Query Hook System

**Location**: `src/engine/api/graphql/workspace-query-runner/workspace-query-hook/`

```
workspace-query-hook/
├── decorators/
│   └── workspace-query-hook.decorator.ts  # @WorkspaceQueryHook
├── interfaces/
│   └── workspace-query-hook.interface.ts  # Hook interfaces
├── types/
│   └── workspace-query-hook.type.ts       # PRE_HOOK, POST_HOOK
├── workspace-query-hook.service.ts        # Executes hooks
├── workspace-query-hook.explorer.ts       # Discovers hooks
└── storage/
    └── workspace-query-hook.storage.ts    # Stores hook instances
```

### 3. Authentication System

**Location**: `src/engine/core-modules/auth/`

```typescript
// AuthContext type
type AuthContext = {
  workspace?: Workspace;
  user?: User;
  workspaceMemberId?: string;
  apiKey?: ApiKey;
};

// Guards
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)

// Decorators
@AuthWorkspace() workspace: Workspace
@AuthUser() user: User
```

---

## Data Flow Patterns

### Create Operation

```
1. GraphQL Mutation received
        │
        ▼
2. Pre-Query Hook (mktOrder.createOne)
   - Validate required fields
   - Set default values
   - Set accountOwnerId
        │
        ▼
3. Database INSERT
        │
        ▼
4. Post-Query Hook (mktOrder.createOne)
   - Create related entities
   - Send notifications
   - Update statistics
        │
        ▼
5. Return created entity
```

### Update Operation

```
1. GraphQL Mutation received
        │
        ▼
2. Pre-Query Hook (mktOrder.updateOne)
   - Validate permissions
   - Validate business rules
   - Transform data
        │
        ▼
3. Database UPDATE
        │
        ▼
4. Post-Query Hook (mktOrder.updateOne)
   - Trigger workflows
   - Update related entities
   - Audit logging
        │
        ▼
5. Return updated entity
```

---

## Module Dependencies

```
┌─────────────────────────────────────────────────┐
│                  MktCoreModule                   │
│  ┌───────────────────────────────────────────┐  │
│  │  MktLicenseModule                         │  │
│  │    └── depends on: OrderModule            │  │
│  ├───────────────────────────────────────────┤  │
│  │  MktOrderModule                           │  │
│  │    └── depends on: PaymentModule,         │  │
│  │        CustomerModule, ProductModule      │  │
│  ├───────────────────────────────────────────┤  │
│  │  MktPaymentModule                         │  │
│  │    └── depends on: Integration services   │  │
│  ├───────────────────────────────────────────┤  │
│  │  MktDepartmentModule                      │  │
│  │    └── depends on: WorkspaceMember        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              Twenty Core Modules                 │
│  - AuthModule                                    │
│  - WorkspaceModule                              │
│  - UserModule                                    │
└─────────────────────────────────────────────────┘
```

---

## Key Files Reference

### Engine Files

| File | Purpose |
|------|---------|
| `engine/twenty-orm/decorators/*.ts` | Entity decorators |
| `engine/api/graphql/workspace-query-runner/` | Query execution |
| `engine/core-modules/auth/` | Authentication |
| `engine/guards/` | Auth guards |

### mkt-core Constants

| File | Purpose |
|------|---------|
| `mkt-core/constants/mkt-object-ids.ts` | Entity IDs |
| `mkt-core/constants/mkt-field-ids.ts` | Field IDs |

### Important Patterns

| Pattern | Location |
|---------|----------|
| WorkspaceEntity | `mkt-core/*/**.workspace-entity.ts` |
| Pre-Query Hook | `mkt-core/*/hooks/*.pre-query.hook.ts` |
| Post-Query Hook | `mkt-core/*/hooks/*.post-query.hook.ts` |
| Resolver | `mkt-core/*/resolvers/*.resolver.ts` |
| Service | `mkt-core/*/services/*.service.ts` |

---

## Best Practices

### Module Independence

```typescript
// OK - Import through module system
@Module({
  imports: [MktCustomerModule],
  providers: [OrderService],
})
export class MktOrderModule {}

// NO - Direct cross-module imports
import { CustomerService } from '../customer/services';
```

### Service Injection

```typescript
// OK - Inject services from imported modules
constructor(
  private readonly customerService: MktCustomerService,
) {}

// NO - Use repository from another module
constructor(
  @InjectRepository(Customer)
  private readonly customerRepo: Repository<Customer>,
) {}
```

### Repository Access

```typescript
// Twenty pattern - Use TwentyORMGlobalManager
constructor(
  private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
) {}

async getRepository(workspaceId: string) {
  return this.twentyORMGlobalManager.getRepositoryForWorkspace(
    workspaceId,
    MktOrderWorkspaceEntity,
  );
}
```

---

## Related Resources

- [Code Patterns](./code-patterns.md)
- [TypeScript Rules](./typescript-rules.md)
- [Database Guide](./database.md)

---

**Version**: 1.2
**Last Updated**: 2026-02-04
