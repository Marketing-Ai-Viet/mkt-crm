# Database Guide - Twenty CRM

> Database operations, migrations, and Twenty ORM patterns

---

## Overview

**Database**: PostgreSQL v14+
**ORM**: TypeORM với Twenty's Workspace Entity system
**Cache**: Redis v7+
**Pattern**: Multi-tenant per workspace

---

## Twenty ORM vs Standard TypeORM

### Key Differences

| Aspect | Standard TypeORM | Twenty ORM |
|--------|------------------|------------|
| Entity | `@Entity()` | `@WorkspaceEntity()` |
| Field | `@Column()` | `@WorkspaceField()` |
| Relation | `@ManyToOne()` | `@WorkspaceRelation()` |
| Repository | `@InjectRepository()` | `TwentyORMGlobalManager` |
| Schema | Static | Dynamic per workspace |

### Repository Access Pattern

```typescript
// Standard TypeORM (DON'T USE for workspace entities)
constructor(
  @InjectRepository(Order)
  private readonly orderRepo: Repository<Order>,
) {}

// Twenty Pattern (USE THIS)
constructor(
  private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
) {}

async getRepository(workspaceId?: string) {
  const wsId = workspaceId ||
    this.scopedWorkspaceContextFactory.create().workspaceId;

  return this.twentyORMGlobalManager.getRepositoryForWorkspace(
    wsId,
    MktOrderWorkspaceEntity,
  );
}
```

---

## Common Repository Operations

### Find Operations

```typescript
// Find one by ID
const order = await repository.findOne({
  where: { id: orderId },
});

// Find one with relations
const order = await repository.findOne({
  where: { id: orderId },
  relations: ['customer', 'items'],
});

// Find many with filters
const orders = await repository.find({
  where: {
    status: ORDER_STATUS.PENDING,
    customerId: customerId,
  },
  order: { createdAt: 'DESC' },
});

// Find with pagination
const [orders, total] = await repository.findAndCount({
  where: { status: ORDER_STATUS.ACTIVE },
  skip: (page - 1) * limit,
  take: limit,
  order: { createdAt: 'DESC' },
});

// Count
const count = await repository.count({
  where: { status: ORDER_STATUS.PENDING },
});
```

### Create Operations

```typescript
// Create single
const order = repository.create({
  name: 'Order #1',
  status: ORDER_STATUS.DRAFT,
  customerId: customerId,
});
const saved = await repository.save(order);

// Create and return
const order = await repository.save(
  repository.create(dto),
);

// Bulk create
const orders = await repository.save(
  dtos.map(dto => repository.create(dto)),
);
```

### Update Operations

```typescript
import { omitBy, isUndefined } from 'lodash';

// Update with save (recommended)
const order = await repository.findOne({ where: { id } });
const updateFields = omitBy(dto, isUndefined);
Object.assign(order, updateFields);
await repository.save(order);

// Direct update (no entity returned)
await repository.update(id, {
  status: ORDER_STATUS.CONFIRMED,
  confirmedAt: new Date(),
});

// Bulk update
await repository.update(
  { status: ORDER_STATUS.PENDING },
  { status: ORDER_STATUS.PROCESSING },
);
```

### Delete Operations

```typescript
// Soft delete (recommended)
await repository.softDelete(id);

// Soft remove (with entity)
const order = await repository.findOne({ where: { id } });
await repository.softRemove(order);

// Hard delete (use with caution)
await repository.delete(id);

// Restore soft deleted
await repository.restore(id);
```

---

## Query Builder

### Basic Query Builder

```typescript
const orders = await repository
  .createQueryBuilder('order')
  .where('order.status = :status', { status: ORDER_STATUS.PENDING })
  .andWhere('order.createdAt > :date', { date: startDate })
  .orderBy('order.createdAt', 'DESC')
  .take(10)
  .getMany();
```

### With Relations

```typescript
const orders = await repository
  .createQueryBuilder('order')
  .leftJoinAndSelect('order.customer', 'customer')
  .leftJoinAndSelect('order.items', 'items')
  .where('order.id = :id', { id: orderId })
  .getOne();
```

### Complex Queries

```typescript
// Aggregation
const stats = await repository
  .createQueryBuilder('order')
  .select('order.status', 'status')
  .addSelect('COUNT(*)', 'count')
  .addSelect('SUM(order.amount)', 'totalAmount')
  .groupBy('order.status')
  .getRawMany();

// Subquery
const orders = await repository
  .createQueryBuilder('order')
  .where(qb => {
    const subQuery = qb
      .subQuery()
      .select('customer.id')
      .from(Customer, 'customer')
      .where('customer.status = :status')
      .getQuery();
    return 'order.customerId IN ' + subQuery;
  })
  .setParameter('status', 'ACTIVE')
  .getMany();
```

---

## Transactions

### Using QueryRunner

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class OrderService {
  constructor(private readonly dataSource: DataSource) {}

  async createOrderWithItems(dto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create order
      const order = await queryRunner.manager.save(Order, {
        name: dto.name,
        status: ORDER_STATUS.DRAFT,
      });

      // Create items
      for (const itemDto of dto.items) {
        await queryRunner.manager.save(OrderItem, {
          orderId: order.id,
          ...itemDto,
        });
      }

      await queryRunner.commitTransaction();
      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

### Using transaction() method

```typescript
await this.dataSource.transaction(async manager => {
  const order = await manager.save(Order, orderData);
  await manager.save(OrderItem, itemsData);
  return order;
});
```

---

## Migrations

### Generate Migration

```bash
# Generate migration for core database
npx nx run twenty-server:typeorm migration:generate \
  src/database/typeorm/core/migrations/AddNewField \
  -d src/database/typeorm/core/core.datasource.ts
```

### Run Migrations

```bash
# Run all pending migrations
npx nx run twenty-server:database:migrate:prod

# Reset database (development only)
npx nx database:reset twenty-server
```

### Migration File Structure

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderField1234567890 implements MigrationInterface {
  name = 'AddOrderField1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order"
      ADD COLUMN "newField" varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order"
      DROP COLUMN "newField"
    `);
  }
}
```

---

## Workspace Metadata Sync

Twenty uses metadata to generate dynamic schemas. After adding new WorkspaceEntity:

```bash
# Sync metadata for all workspaces
npx nx run twenty-server:command workspace:sync-metadata -f

# This command:
# 1. Scans all @WorkspaceEntity classes
# 2. Updates metadata tables
# 3. Generates database tables per workspace
```

---

## Data Seeding (mkt-core)

### Available Seeders

```bash
# License data
npx nx command twenty-server -- mkt-license-data-seed-dev-workspace

# Customer tags
npx nx command twenty-server -- mkt-customer-tag-data-seed-dev-workspace

# Departments
npx nx command twenty-server -- mkt-department-data-seed-dev-workspace

# Payment methods
npx nx command twenty-server -- mkt-payment-data-seed-dev-workspace

# Invoices
npx nx command twenty-server -- mkt-invoice-data-seed-dev-workspace
```

### Creating a New Seeder

```typescript
// src/mkt-core/dev-seeder/commands/my-data-seed.command.ts
import { Command, CommandRunner } from 'nest-commander';

@Command({
  name: 'mkt-my-data-seed-dev-workspace',
  description: 'Seed my data for development',
})
export class MyDataSeedCommand extends CommandRunner {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {
    super();
  }

  async run(): Promise<void> {
    const workspaceId = 'your-dev-workspace-id';
    const repository = await this.twentyORMGlobalManager
      .getRepositoryForWorkspace(workspaceId, MyEntity);

    // Seed data
    await repository.save([
      { name: 'Item 1' },
      { name: 'Item 2' },
    ]);

    console.log('Data seeded successfully');
  }
}
```

---

## Best Practices

### DO

```typescript
// Use TwentyORMGlobalManager for workspace entities
const repo = await this.twentyORMGlobalManager
  .getRepositoryForWorkspace(workspaceId, Entity);

// Use omitBy for updates
const updates = omitBy(dto, isUndefined);
Object.assign(entity, updates);

// Use transactions for multiple operations
await this.dataSource.transaction(async manager => {
  // Multiple saves
});

// Use pagination for large datasets
const [data, total] = await repo.findAndCount({
  skip: (page - 1) * limit,
  take: limit,
});
```

### DON'T

```typescript
// DON'T use @InjectRepository for workspace entities
@InjectRepository(MktOrder)
private readonly repo: Repository<MktOrder>;

// DON'T fetch all records without pagination
const allOrders = await repo.find(); // Dangerous!

// DON'T use synchronize: true in production
TypeOrmModule.forRoot({
  synchronize: true, // NEVER in production!
});

// DON'T forget to handle null workspaceId
const repo = await this.getRepository(workspaceId);
// Always check: if (!workspaceId) throw new Error();
```

---

## Common Issues

### Issue: "Workspace not found"

```typescript
// Solution: Always check workspaceId
const workspaceId = this.scopedWorkspaceContextFactory
  .create().workspaceId;

if (!workspaceId) {
  throw new NotFoundException('Workspace not found');
}
```

### Issue: "Entity not found after create"

```typescript
// Solution: Repository.save() returns the saved entity
const saved = await repository.save(repository.create(dto));
return saved; // Has ID
```

### Issue: "Relations not loaded"

```typescript
// Solution: Specify relations in query
const order = await repository.findOne({
  where: { id },
  relations: ['customer', 'items', 'items.product'],
});
```

---

## Related Resources

- [Architecture Overview](./architecture.md)
- [Code Patterns](./code-patterns.md)
- [Development Workflow](./development-workflow.md)

---

**Version**: 1.0
**Last Updated**: 2025-12-13
