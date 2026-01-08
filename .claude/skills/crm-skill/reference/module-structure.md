# Module Structure Pattern - mkt-core

> Chuẩn hóa cấu trúc module dựa trên `invoice` module

---

## Overview

Mỗi module trong mkt-core tuân theo cấu trúc chuẩn để đảm bảo:
- **Consistency**: Dễ tìm kiếm và hiểu code
- **Maintainability**: Dễ bảo trì và mở rộng
- **Separation of Concerns**: Phân tách rõ ràng trách nhiệm

---

## Standard Directory Structure

```
mkt-core/{module-name}/
├── {module-name}.module.ts          # NestJS Module definition
├── config/                          # Configuration (optional)
│   ├── index.ts                     # Export barrel
│   ├── {module}.config.ts           # ConfigModule.forFeature config
│   ├── {module}-config.defaults.ts  # Default values
│   └── {module}-config.validation.ts # Validation rules
├── constants/                       # Constants & Enums
│   ├── index.ts                     # Export barrel
│   └── {module}.constants.ts        # Status enums, magic values
├── controllers/                     # REST Controllers (optional)
│   └── {module}.controller.ts
├── dto/                             # Data Transfer Objects
│   ├── index.ts                     # Export barrel
│   ├── {module}.input.ts            # GraphQL inputs
│   └── {module}.output.ts           # GraphQL outputs
├── hooks/                           # Query Hooks (Pre/Post)
│   ├── {entity}-create-one.pre-query.hook.ts
│   ├── {entity}-create-one.post-query.hook.ts
│   ├── {entity}-update-one.pre-query.hook.ts
│   └── {entity}-update-one.post-query.hook.ts
├── integration/                     # External integrations (optional)
│   └── {external-service}.integration.service.ts
├── jobs/                            # Background jobs (optional)
│   └── {module}.job.ts
├── messages/                        # Centralized messages
│   └── index.ts                     # LOG, WARN, ERROR messages
├── middlewares/                     # HTTP Middlewares (optional)
│   ├── index.ts
│   └── {module}.middleware.ts
├── objects/                         # WorkspaceEntity definitions
│   ├── {entity}.workspace-entity.ts
│   └── {related-entity}.workspace-entity.ts
├── repositories/                    # Data Access Layer
│   ├── index.ts                     # Export barrel
│   ├── {entity}.repository.ts
│   └── {related-entity}.repository.ts
├── resolvers/                       # GraphQL Resolvers
│   ├── index.ts                     # Export barrel
│   └── {entity}.resolver.ts
├── services/                        # Business Logic
│   ├── index.ts                     # Export barrel
│   ├── {entity}.service.ts
│   └── {specialized}.service.ts
└── types/                           # TypeScript Type Definitions
    ├── index.ts                     # Export barrel
    ├── {entity}.types.ts            # Entity-related types
    └── {module}-config.types.ts     # Config types
```

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Module | `{module-name}.module.ts` | `mkt-invoice.module.ts` |
| Entity | `{entity}.workspace-entity.ts` | `mkt-invoice.workspace-entity.ts` |
| Repository | `{entity}.repository.ts` | `mkt-invoice.repository.ts` |
| Service | `{entity}.service.ts` | `mkt-invoice.service.ts` |
| Resolver | `{entity}.resolver.ts` | `mkt-invoice.resolver.ts` |
| Pre Hook | `{entity}-{action}.pre-query.hook.ts` | `mkt-invoice-create-one.pre-query.hook.ts` |
| Post Hook | `{entity}-{action}.post-query.hook.ts` | `mkt-invoice-create-one.post-query.hook.ts` |
| Messages | `index.ts` in `messages/` | - |
| Types | `{entity}.types.ts` | `mkt-invoice.types.ts` |

---

## Index Files (Export Barrels)

Mỗi folder cần có `index.ts` để export các items:

```typescript
// repositories/index.ts
export { MktInvoiceRepository } from './mkt-invoice.repository';
export { MktSInvoiceRepository } from './mkt-sinvoice.repository';

// services/index.ts
export * from './mkt-invoice.service';
export { SInvoiceIntegrationService } from 'src/mkt-core/invoice/integration/s-invoice.integration.service';

// types/index.ts
export * from './mkt-invoice.types';
export * from './invoice-config.types';
```

---

## When to Use Hooks vs Resolvers

### ✅ Use Hooks When

Hooks nên được sử dụng **CHỈ KHI làm việc với chính entity của module đó**:

1. **Validate/Transform data trước khi lưu** (Pre-Query Hook)
   ```typescript
   // mkt-invoice-create-one.pre-query.hook.ts
   // Validate invoice data before creating
   // Set default values
   // Calculate totals from order items
   ```

2. **Side effects sau khi thao tác xong** (Post-Query Hook)
   ```typescript
   // mkt-invoice-create-one.post-query.hook.ts
   // Send notifications
   // Create related records (trong cùng module)
   // Update statistics
   ```

3. **Logic đơn giản, không cần inject nhiều dependencies**

### ❌ Do NOT Use Hooks When

1. **Cross-module operations** - Khi cần gọi service/repository của module khác
2. **Complex business logic** - Logic phức tạp cần nhiều bước
3. **External integrations** - Gọi API bên ngoài
4. **Reusable operations** - Logic cần dùng lại ở nhiều nơi

### ✅ Use Resolvers When

Resolvers nên được sử dụng cho **các trường hợp còn lại** để đảm bảo maintainability:

1. **Cross-module operations**
   ```typescript
   // mkt-invoice.resolver.ts
   @Mutation(() => MktInvoiceOutput)
   async createInvoiceFromOrder(
     @Args('orderId') orderId: string,
   ) {
     // Gọi OrderService để lấy order
     // Gọi CustomerService để lấy customer info
     // Tạo invoice với InvoiceService
   }
   ```

2. **Complex business workflows**
   ```typescript
   // order.resolver.ts
   @Mutation(() => OrderOutput)
   async processOrder(@Args('input') input: ProcessOrderInput) {
     // Validate order
     // Process payment
     // Create license
     // Send notifications
   }
   ```

3. **Custom queries/mutations không phải CRUD chuẩn**
   ```typescript
   // invoice.resolver.ts
   @Query(() => InvoiceStatistics)
   async getInvoiceStatistics() {
     return this.invoiceService.getStatistics();
   }
   ```

4. **External integrations**
   ```typescript
   // sinvoice.resolver.ts
   @Mutation(() => SInvoiceOutput)
   async syncWithSInvoice(@Args('invoiceId') invoiceId: string) {
     return this.sInvoiceIntegrationService.sync(invoiceId);
   }
   ```

---

## Module Definition Pattern

```typescript
// mkt-invoice.module.ts
@Module({
  imports: [
    ConfigModule.forFeature(invoiceConfig),  // Config if needed
    TwentyORMModule,                          // Required
    AuthModule,                               // Auth if needed
    WorkspaceCacheStorageModule,              // Cache if needed
    forwardRef(() => MktOrderModule),         // Cross-module (circular)
  ],
  controllers: [
    InvoiceFileController,                    // REST controllers
  ],
  providers: [
    // Repositories (Data Access Layer)
    MktInvoiceRepository,
    MktSInvoiceRepository,

    // Services (Business Logic)
    MktInvoiceService,
    SInvoiceIntegrationService,

    // Jobs (Background Processing)
    SInvoiceIntegrationJob,

    // Hooks (Entity-specific operations)
    MktSInvoiceCreateOnePreQueryHook,
    MktSInvoiceFileCreateOnePreQueryHook,
    MktSInvoiceFileUpdateOnePreQueryHook,
    MktSInvoiceCreateOnePostQueryHook,
  ],
  exports: [
    // Export repositories và services cho modules khác sử dụng
    MktInvoiceRepository,
    MktSInvoiceRepository,
    MktInvoiceService,
    SInvoiceIntegrationService,
  ],
})
export class MktInvoiceModule {}
```

---

## Repository Pattern

```typescript
// mkt-invoice.repository.ts
/**
 * MktInvoiceRepository - Data access layer for Invoice entity
 *
 * Responsibilities:
 * - Database operations for MktInvoice entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - External integrations (handled by Integration layer)
 */
@Injectable()
export class MktInvoiceRepository {
  private readonly logger = new Logger(`${MKT_INVOICE_LOG_CONTEXT}:Repository`);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  async getRepository(workspaceId?: string): Promise<WorkspaceRepository<Entity>> {
    const wsId = workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;
    if (!wsId) {
      throw new NotFoundException(MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      EntityWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  async findById(id: string, workspaceId?: string): Promise<Entity> { ... }
  async findByIdOrNull(id: string, workspaceId?: string): Promise<Entity | null> { ... }
  async findAll(workspaceId?: string, options?: FindOptions): Promise<Entity[]> { ... }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  async create(data: Partial<Entity>, workspaceId?: string): Promise<Entity> { ... }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  async update(id: string, data: Partial<Entity>, workspaceId?: string): Promise<void> { ... }
  async softDelete(id: string, workspaceId?: string): Promise<void> { ... }

  // ============================================
  // COUNT/AGGREGATION OPERATIONS
  // ============================================

  async count(workspaceId?: string): Promise<number> { ... }
}
```

---

## Service Pattern

```typescript
// mkt-invoice.service.ts
/**
 * MktInvoiceService - Business logic layer for Invoice entity
 *
 * Responsibilities:
 * - Business logic and validation
 * - Orchestration of multiple operations
 * - Cross-module coordination
 */
@Injectable()
export class MktInvoiceService {
  private readonly logger = new Logger(`${MKT_INVOICE_LOG_CONTEXT}:Service`);

  constructor(
    @Inject(invoiceConfig.KEY)
    private readonly config: ConfigType<typeof invoiceConfig>,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly invoiceRepository: MktInvoiceRepository,
    private readonly sInvoiceIntegrationService: SInvoiceIntegrationService,
    private readonly orderItemRepository: MktOrderItemRepository, // Cross-module
  ) {}

  // ============================================
  // PUBLIC METHODS
  // ============================================

  async createInvoiceFromOrder(orderId: string): Promise<Invoice> { ... }
  async generateInvoiceName(orderId: string): Promise<string> { ... }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async fetchOrderItems(orderId: string): Promise<OrderItem[]> { ... }
  private truncateName(name: string, maxLength: number): string { ... }
}
```

---

## Messages Pattern

```typescript
// messages/index.ts
export const MKT_INVOICE_LOG_CONTEXT = 'MktInvoice';

export const INVOICE_MESSAGES = {
  LOG: {
    FIND_BY_ID_START: (id: string) => `Finding invoice by ID: ${id}`,
    FIND_BY_ID_SUCCESS: (id: string) => `Found invoice: ${id}`,
    CREATE_SUCCESS: (id: string) => `Successfully created invoice: ${id}`,
    UPDATE_SUCCESS: (id: string) => `Successfully updated invoice: ${id}`,
  },

  WARN: {
    ORDER_NOT_FOUND: (orderId: string) => `Order ${orderId} not found`,
    ORDER_NO_ITEMS: (orderId: string) => `Order ${orderId} has no items`,
  },

  ERROR: {
    INVOICE_NOT_FOUND: (id: string) => `Invoice not found: ${id}`,
    CREATE_FAILED: (orderId: string) => `Failed to create invoice for order: ${orderId}`,
    WORKSPACE_NOT_FOUND: 'Workspace ID not found in context',
  },

  INFO: {
    INVOICE_CREATED: (invoiceNo: string) => `Invoice ${invoiceNo} has been created`,
  },
} as const;
```

---

## Types Pattern

```typescript
// types/mkt-invoice.types.ts

/**
 * Options for finding invoices
 */
export type FindInvoiceOptions = {
  take?: number;
  skip?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
};

/**
 * Pagination options
 */
export type FindWithPaginationOptions = {
  limit?: number;
  offset?: number;
};

/**
 * Status distribution item
 */
export type StatusDistributionItem = {
  status: string;
  count: number;
};

/**
 * Invoice creation input (for resolvers)
 */
export type CreateInvoiceInput = {
  orderId: string;
  name?: string;
  // ... other fields
};
```

---

## Summary: Hooks vs Resolvers

| Scenario | Use Hook | Use Resolver |
|----------|----------|--------------|
| Validate data before save | ✅ Pre-Hook | |
| Set default values | ✅ Pre-Hook | |
| Send notification after create | ✅ Post-Hook | |
| Create related record (same module) | ✅ Post-Hook | |
| Cross-module operations | | ✅ Resolver |
| Complex business workflow | | ✅ Resolver |
| External API integration | | ✅ Resolver |
| Custom query/mutation | | ✅ Resolver |
| Reusable business logic | | ✅ Service + Resolver |

---

## Related Resources

- [Architecture Overview](./architecture.md)
- [Code Patterns](./code-patterns.md)
- [Naming Conventions](./naming-conventions.md)

---

**Version**: 1.0
**Last Updated**: 2025-12-26
