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

```
mkt-core/
├── mkt-core.module.ts         # Main module definition
│
├── constants/
│   ├── mkt-object-ids.ts      # Entity IDs (IMMUTABLE)
│   └── mkt-field-ids.ts       # Field IDs (IMMUTABLE)
│
├── license/
│   ├── mkt-license.workspace-entity.ts
│   ├── mkt-license.module.ts
│   ├── hooks/
│   │   ├── mkt-license-create-one.pre-query.hook.ts
│   │   └── mkt-license-create-one.post-query.hook.ts
│   ├── resolvers/
│   │   └── mkt-license.resolver.ts
│   └── services/
│       └── mkt-license.service.ts
│
├── order/
│   ├── objects/
│   │   ├── mkt-order.workspace-entity.ts
│   │   └── mkt-order-item.workspace-entity.ts
│   ├── mkt-order.module.ts
│   ├── hooks/
│   ├── services/
│   └── constants/
│       └── order-status.constants.ts
│
├── payment/
│   ├── integration/
│   │   ├── sepay-integration.service.ts
│   │   └── bidv-integration.service.ts
│   └── ...
│
└── dev-seeder/                # Development data seeding
    └── commands/
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

**Version**: 1.0
**Last Updated**: 2025-12-13
