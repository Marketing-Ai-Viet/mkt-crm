# Customer Module - Architecture

## Cấu trúc thư mục

```
packages/twenty-server/src/mkt-core/customer/
├── constants/                          # Configuration & Enums
│   ├── index.ts                        # Re-exports
│   ├── linked-account.constants.ts     # Provider & status constants
│   ├── mkt-customer.constant.ts        # Customer status/type/tier enums
│   ├── mkt-customer-categorization.constants.ts
│   ├── mkt-customer-downgrade-policy.constants.ts
│   ├── mkt-customer-tier.constants.ts
│   ├── mkt-customer-tier-history.constants.ts
│   └── mkt-tag.constant.ts
│
├── dto/                                # Data Transfer Objects
│   └── (GraphQL input/output types)
│
├── hooks/                              # Pre/Post Query Hooks
│   ├── index.ts
│   ├── mkt-customer-create-one.pre-query.hook.ts
│   └── mkt-customer-update-one.pre-query.hook.ts
│
├── jobs/                               # Background Jobs
│   ├── index.ts
│   ├── mkt-customer-categorization.cron.job.ts
│   ├── mkt-customer-tier-update.job.ts
│   └── mkt-customer-tier.cron.job.ts
│
├── listeners/                          # Event Listeners
│   └── mkt-customer-event.listener.ts
│
├── messages/                           # Centralized Messages
│   └── (log, error, info messages)
│
├── objects/                            # Workspace Entities
│   ├── mkt-customer.workspace-entity.ts
│   ├── mkt-customer-tag.workspace-entity.ts
│   ├── mkt-customer-tier-history.workspace-entity.ts
│   └── mkt-tag.workspace-entity.ts
│
├── repositories/                       # Data Access Layer
│   ├── mkt-customer.repository.ts
│   └── mkt-customer-tier-history.repository.ts
│
├── resolvers/                          # GraphQL Resolvers
│   ├── mkt-customer-export.resolver.ts
│   ├── mkt-customer-license.resolver.ts
│   ├── mkt-customer-linked-account.resolver.ts
│   ├── mkt-customer-tier.resolver.ts
│   └── mkt-customer-tier-history.resolver.ts
│
├── services/                           # Business Logic
│   ├── index.ts                        # Re-exports all services
│   ├── account/                        # Linked Account Management
│   │   ├── index.ts
│   │   └── mkt-customer-account.service.ts
│   ├── core/                           # Core CRUD Operations
│   │   ├── index.ts
│   │   ├── mkt-customer-code-generation.service.ts
│   │   ├── mkt-customer-creation.service.ts
│   │   └── mkt-customer-update.service.ts
│   ├── export/                         # Export Functionality
│   │   ├── index.ts
│   │   └── mkt-customer-export.service.ts
│   ├── license/                        # License Integration
│   │   ├── index.ts
│   │   └── mkt-customer-license.service.ts
│   ├── lifecycle/                      # Lifecycle Management
│   │   ├── index.ts
│   │   ├── mkt-customer-auto-assign.service.ts
│   │   └── mkt-customer-categorization.service.ts
│   └── tier/                           # Tier System
│       ├── index.ts
│       ├── mkt-customer-downgrade-policy.service.ts
│       ├── mkt-customer-queue.service.ts
│       ├── mkt-customer-tier.service.ts
│       ├── mkt-customer-tier-calculation.service.ts
│       ├── mkt-customer-tier-history.service.ts
│       └── mkt-customer-tier-registration.service.ts
│
├── types/                              # TypeScript Types
│   ├── index.ts
│   ├── customer.types.ts
│   ├── customer-tier.types.ts
│   └── linked-account.types.ts
│
├── utils/                              # Utility Functions
│   └── (customer-specific utilities)
│
├── customer.module.ts                  # Module Definition
└── ENTITY_RELATIONSHIPS.md             # ERD Documentation
```

---

## Layer Architecture

### 1. Presentation Layer (Resolvers + Hooks)

**Resolvers**: Xử lý GraphQL queries/mutations

```typescript
@Resolver()
export class MktCustomerTierResolver {
  @Query()
  async getCustomerTierStatistics() { ... }
  
  @Mutation()
  async updateCustomerTier() { ... }
}
```

**Pre-Query Hooks**: Validation và transformation trước khi query

```typescript
@WorkspaceQueryHook('mktCustomer.createOne')
export class MktCustomerCreateOnePreQueryHook {
  async execute(authContext, objectName, payload) {
    // Validate email, generate code, set defaults
  }
}
```

### 2. Service Layer (Business Logic)

Tổ chức theo domain subdirectories:

| Subdomain | Services | Responsibility |
|-----------|----------|----------------|
| **core** | CreationService, UpdateService, CodeGenerationService | CRUD operations |
| **tier** | TierService, TierCalculationService, TierHistoryService, DowngradePolicyService | Tier management |
| **lifecycle** | CategorizationService, AutoAssignService | Customer lifecycle |
| **account** | AccountService | Linked accounts |
| **license** | LicenseService | License integration |
| **export** | ExportService | Data export |

### 3. Repository Layer (Data Access)

Thread-safe repositories sử dụng TwentyORMGlobalManager:

```typescript
@Injectable()
export class MktCustomerRepository {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  async getRepository(workspaceId?: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktCustomerWorkspaceEntity,
      { shouldBypassPermissionChecks: true }
    );
  }
}
```

### 4. Entity Layer (Data Model)

WorkspaceEntity pattern của Twenty CRM:

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCustomer,
  namePlural: 'mktCustomers',
  labelSingular: msg`Customer`,
  icon: 'IconUser',
})
export class MktCustomerWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({ ... })
  name: string;
  
  @WorkspaceRelation({ ... })
  mktOrders: Relation<MktOrderWorkspaceEntity[]>;
}
```

---

## Dependency Injection

### Module Definition

```typescript
@Module({
  imports: [
    EmailModule,
    MktEmailModule,
    MktSendmailTemplateModule,
    TokenModule,
    TwentyORMModule,
    WorkspaceCacheStorageModule,
    MktLicenseIntegrationModule,
  ],
  providers: [
    // Repositories
    MktCustomerRepository,
    MktCustomerTierHistoryRepository,
    
    // Services (organized by domain)
    MktCustomerCreationService,
    MktCustomerTierService,
    MktCustomerCategorizationService,
    // ...
    
    // Resolvers
    MktCustomerTierResolver,
    MktCustomerExportResolver,
    // ...
    
    // Hooks
    MktCustomerCreateOnePreQueryHook,
    MktCustomerUpdateOnePreQueryHook,
    
    // Listeners
    MktCustomerEventListener,
    
    // Jobs
    MktCustomerTierCronJob,
    MktCustomerCategorizationCronJob,
  ],
  exports: [
    // Repositories
    MktCustomerRepository,
    MktCustomerTierHistoryRepository,
    
    // Public services
    MktCustomerCreationService,
    MktCustomerTierService,
    // ...
  ],
})
export class CustomerModule {}
```

---

## Event Flow

### Event-Driven Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Database Events                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CREATE Customer ──► MktCustomerEventListener                   │
│                        ├── Auto-assign to sales                  │
│                        └── Send welcome email                    │
│                                                                  │
│  UPDATE Order ──► OrderEventListener                             │
│                        └── Queue tier recalculation              │
│                                                                  │
│  CRON Job ──► MktCustomerTierCronJob                            │
│                 └── Batch update all customer tiers              │
│                                                                  │
│  CRON Job ──► MktCustomerCategorizationCronJob                  │
│                 └── Batch update lifecycle stages                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Event Listener Pattern

```typescript
@Injectable()
export class MktCustomerEventListener {
  @OnDatabaseBatchEvent('mktCustomer', DatabaseEventAction.CREATED)
  async handleCreateCustomer(payload: WorkspaceEventBatch<...>) {
    for (const event of payload.events) {
      const customer = event.properties.after;
      
      // Auto-assign
      await this.autoAssignService.assignCustomer(customer, workspaceId);
      
      // Send welcome email
      await this.sendWelcomeEmail(workspaceId, customer);
    }
  }
}
```

---

## Cron Jobs

### Tier Update Job

```typescript
@Processor(MessageQueue.cronQueue)
export class MktCustomerTierCronJob {
  @Process(MktCustomerTierCronJob.name)
  @SentryCronMonitor(MktCustomerTierCronJob.name, CRON_PATTERN)
  async handle(data: TierUpdateCronJobData) {
    await this.tierService.updateAllCustomerTiersForWorkspace(data.workspaceId);
  }
}
```

### Categorization Job

```typescript
@Processor(MessageQueue.cronQueue)
export class MktCustomerCategorizationCronJob {
  @Process(MktCustomerCategorizationCronJob.name)
  async handle(data: CategorizationJobData) {
    await this.categorizationService.categorizeAllCustomers(data.workspaceId);
  }
}
```

---

## Error Handling

### Centralized Messages

```typescript
// messages/index.ts
export const CUSTOMER_MESSAGES = {
  ERROR: {
    CUSTOMER_NOT_FOUND: (id: string) => `Customer ${id} not found`,
    EMAIL_ALREADY_EXISTS: (email: string) => `Email ${email} already exists`,
    INVALID_EMAIL_FORMAT: (email: string) => `Invalid email format: ${email}`,
    INVALID_TAX_CODE: (code: string) => `Invalid tax code: ${code}`,
  },
  LOG: {
    CUSTOMER_CREATED: (id: string) => `Customer ${id} created successfully`,
    TIER_UPDATE_START: (id: string) => `Starting tier update for ${id}`,
  },
  WARN: {
    MISSING_WORKSPACE_ID: 'Workspace ID is missing in event payload',
  },
};
```

### Exception Handling

```typescript
// In Hook
private validateEmailFormat(email: string): void {
  if (!emailRegex.test(email)) {
    throw new BadRequestException(
      CUSTOMER_MESSAGES.ERROR.INVALID_EMAIL_FORMAT(email)
    );
  }
}

// In Repository
async findById(id: string): Promise<MktCustomerWorkspaceEntity> {
  const customer = await repository.findOne({ where: { id } });
  if (!customer) {
    throw new NotFoundException(
      CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(id)
    );
  }
  return customer;
}
```

---

## Performance Optimizations

### 1. Bulk Processing

```typescript
// Tier calculation với bulk aggregation query
async calculateBulkCustomerTiers(customerIds: string[]): Promise<Map<...>> {
  // 1 query cho tất cả customers thay vì N queries
  const aggregations = await orderRepo
    .createQueryBuilder('order')
    .select('order.mktCustomerId', 'customerId')
    .addSelect('COUNT(order.id)', 'totalOrderCount')
    .addSelect('SUM(order.totalAmount)', 'totalOrderValue')
    .where('order.mktCustomerId IN (:...customerIds)', { customerIds })
    .groupBy('order.mktCustomerId')
    .getRawMany();
}
```

### 2. Pagination & Batching

```typescript
async updateAllCustomerTiersForWorkspace(workspaceId: string) {
  let offset = 0;
  const batchSize = 100;
  
  while (hasMore) {
    const customers = await repo.find({
      take: batchSize,
      skip: offset,
    });
    
    // Process batch with concurrency control
    const chunks = chunk(customers, CONCURRENCY);
    for (const batch of chunks) {
      await Promise.all(batch.map(c => this.processCustomer(c)));
    }
    
    offset += batchSize;
  }
}
```

### 3. Caching với JSONB

```typescript
// Linked accounts stored as JSONB - no JOIN needed
linkedAccounts: LinkedAccount[] | null;

// Query by external ID using JSONB operators
async findByLinkedAccount(provider: string, externalId: string) {
  return repo
    .createQueryBuilder('customer')
    .where(`customer.linkedAccounts @> :pattern::jsonb`, {
      pattern: JSON.stringify([{ provider, externalId }])
    })
    .getOne();
}
```

---

## Testing Strategy

### Unit Tests

- Service methods với mocked repositories
- Tier calculation logic
- Downgrade policy rules

### Integration Tests

- Full flow từ hook → service → repository
- Database operations với real PostgreSQL

### E2E Tests

- GraphQL mutations/queries
- Cron job execution

---

## Related Documents

- [ENTITIES.md](./ENTITIES.md) - Chi tiết entity definitions
- [SERVICES.md](./SERVICES.md) - Chi tiết service implementations
- [TIER_SYSTEM.md](./TIER_SYSTEM.md) - Hệ thống tier
- [LIFECYCLE.md](./LIFECYCLE.md) - Lifecycle management
