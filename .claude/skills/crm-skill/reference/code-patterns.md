# Code Patterns - Twenty CRM

> Essential patterns for Twenty CRM development with mkt-core

---

## Overview

Document này chứa các patterns chuẩn cho:
- WorkspaceEntity definitions
- Pre/Post Query Hooks
- GraphQL Resolvers
- Service layer patterns

---

## 1. WorkspaceEntity Pattern

### Basic WorkspaceEntity

```typescript
import {
  WorkspaceEntity,
  WorkspaceField,
} from 'src/engine/twenty-orm/decorators';
import { FieldMetadataType } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktYourEntity,
  namePlural: 'mktYourEntities',
  labelSingular: 'Your Entity',
  labelPlural: 'Your Entities',
  description: 'Description of your entity',
  icon: 'IconBox',
})
export class MktYourEntityWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktYourEntity.name,
    type: FieldMetadataType.TEXT,
    label: 'Name',
    description: 'Entity name',
    icon: 'IconTextCaption',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktYourEntity.status,
    type: FieldMetadataType.SELECT,
    label: 'Status',
    description: 'Entity status',
    icon: 'IconStatusChange',
    options: [
      { value: 'ACTIVE', label: 'Active', color: 'green', position: 0 },
      { value: 'INACTIVE', label: 'Inactive', color: 'gray', position: 1 },
    ],
    defaultValue: "'ACTIVE'",
  })
  status: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktYourEntity.amount,
    type: FieldMetadataType.NUMBER,
    label: 'Amount',
    description: 'Amount value',
    icon: 'IconCurrencyDollar',
  })
  amount: number;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktYourEntity.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: 'Is Active',
    description: 'Whether entity is active',
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;
}
```

### WorkspaceEntity with Relations

```typescript
import {
  WorkspaceEntity,
  WorkspaceField,
  WorkspaceRelation,
} from 'src/engine/twenty-orm/decorators';
import { RelationMetadataType } from 'src/engine/metadata-modules/relation-metadata/relation-metadata.entity';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/mkt-customer.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktOrder,
  namePlural: 'mktOrders',
  labelSingular: 'Order',
  labelPlural: 'Orders',
  icon: 'IconShoppingCart',
})
export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {
  // Fields...

  // ManyToOne Relation
  @WorkspaceRelation({
    standardId: MKT_FIELD_IDS.mktOrder.customer,
    type: RelationMetadataType.MANY_TO_ONE,
    label: 'Customer',
    description: 'Order customer',
    icon: 'IconUser',
    inverseSideTarget: () => MktCustomerWorkspaceEntity,
    inverseSideFieldKey: 'orders',
  })
  customer: MktCustomerWorkspaceEntity;

  // OneToMany Relation (inverse side)
  @WorkspaceRelation({
    standardId: MKT_FIELD_IDS.mktOrder.items,
    type: RelationMetadataType.ONE_TO_MANY,
    label: 'Order Items',
    description: 'Items in this order',
    icon: 'IconList',
    inverseSideTarget: () => MktOrderItemWorkspaceEntity,
    inverseSideFieldKey: 'order',
  })
  items: MktOrderItemWorkspaceEntity[];
}
```

### Field Types Reference

| FieldMetadataType | TypeScript Type | Description |
|-------------------|-----------------|-------------|
| `TEXT` | `string` | Short text |
| `RICH_TEXT` | `string` | Long text with formatting |
| `NUMBER` | `number` | Numeric value |
| `BOOLEAN` | `boolean` | True/false |
| `UUID` | `string` | UUID reference |
| `DATE_TIME` | `Date` | Date and time |
| `DATE` | `Date` | Date only |
| `SELECT` | `string` | Single select with options |
| `MULTI_SELECT` | `string[]` | Multiple select |
| `CURRENCY` | `object` | Currency with amount |
| `LINK` | `string` | URL link |
| `EMAIL` | `string` | Email address |
| `PHONE` | `string` | Phone number |

---

## 2. Pre-Query Hook Pattern

Pre-hooks run BEFORE the query executes. Use for validation and data modification.

### Basic Pre-Query Hook

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';

@Injectable()
@WorkspaceQueryHook('mktOrder.createOne')
export class MktOrderCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(MktOrderCreateOnePreQueryHook.name);

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<MktOrderWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<MktOrderWorkspaceEntity>> {
    // Set default values
    const newPayload = {
      ...payload,
      data: {
        ...payload.data,
        status: ORDER_STATUS.DRAFT,
        accountOwnerId: authContext.workspaceMemberId || null,
      },
    };

    return newPayload;
  }
}
```

### Pre-Query Hook with Validation

```typescript
import { BadRequestException } from '@nestjs/common';

@Injectable()
@WorkspaceQueryHook('mktOrganizationLevel.deleteOne')
export class MktOrganizationLevelDeleteOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(
    MktOrganizationLevelDeleteOnePreQueryHook.name,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: DeleteOneResolverArgs,
  ): Promise<DeleteOneResolverArgs> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      throw new BadRequestException('Workspace ID not found');
    }

    const repository = await this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktOrganizationLevelWorkspaceEntity,
    );

    // Check if has children
    const hasChildren = await repository.count({
      where: { parentId: payload.id },
    });

    if (hasChildren > 0) {
      throw new BadRequestException(
        'Cannot delete organization level with children',
      );
    }

    return payload;
  }
}
```

### Hook Key Format

```typescript
// Format: `{entityName}.{methodName}`

// Available methods:
'mktOrder.createOne'    // Create single record
'mktOrder.createMany'   // Create multiple records
'mktOrder.updateOne'    // Update single record
'mktOrder.updateMany'   // Update multiple records
'mktOrder.deleteOne'    // Soft delete single record
'mktOrder.deleteMany'   // Soft delete multiple records
'mktOrder.destroyOne'   // Hard delete single record
'mktOrder.destroyMany'  // Hard delete multiple records
'mktOrder.findOne'      // Find single record
'mktOrder.findMany'     // Find multiple records
'mktOrder.restoreMany'  // Restore soft deleted records
```

---

## 3. Post-Query Hook Pattern

Post-hooks run AFTER the query executes. Use for side effects.

### Basic Post-Query Hook

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';

@Injectable()
@WorkspaceQueryHook({
  key: 'mktOrder.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktOrderCreateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(MktOrderCreateOnePostQueryHook.name);

  constructor(
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly orderService: OrderService,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktOrderWorkspaceEntity[],
  ): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) return;

    const created = payload?.[0];
    if (!created) return;

    try {
      // Perform side effects
      await this.orderService.processNewOrder(created, workspaceId);

      // Send notifications
      await this.notificationService.sendOrderCreatedNotification(created);

      this.logger.log(`Order ${created.id} processed successfully`);
    } catch (error) {
      this.logger.error('Failed to process order', error);
      // Don't throw - let the main query succeed
    }
  }
}
```

---

## 4. GraphQL Resolver Pattern

### Basic Resolver

```typescript
import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class MktLicenseResolver {
  constructor(private readonly licenseService: MktLicenseService) {}

  @Query(() => [MktLicenseDto])
  async mktLicenses(
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
    @Args('filter', { nullable: true }) filter?: LicenseFilterInput,
  ): Promise<MktLicenseDto[]> {
    return this.licenseService.findAll(workspace.id, filter);
  }

  @Mutation(() => MktLicenseDto)
  async createMktLicense(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CreateLicenseInput,
  ): Promise<MktLicenseDto> {
    return this.licenseService.create(workspace.id, input);
  }

  @Mutation(() => Boolean)
  async renewMktLicense(
    @AuthWorkspace() workspace: Workspace,
    @Args('licenseId') licenseId: string,
    @Args('months') months: number,
  ): Promise<boolean> {
    await this.licenseService.renew(workspace.id, licenseId, months);
    return true;
  }
}
```

---

## 5. Service Pattern

### Basic Service with Repository

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { omitBy, isUndefined } from 'lodash';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { MktOrderWorkspaceEntity } from '../objects/mkt-order.workspace-entity';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktOrderWorkspaceEntity,
    );
  }

  async findOne(id: string): Promise<MktOrderWorkspaceEntity> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;
    if (!workspaceId) {
      throw new NotFoundException('Workspace not found');
    }

    const repository = await this.getRepository(workspaceId);
    const order = await repository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(
    id: string,
    dto: UpdateOrderDto,
  ): Promise<MktOrderWorkspaceEntity> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;
    if (!workspaceId) {
      throw new NotFoundException('Workspace not found');
    }

    const repository = await this.getRepository(workspaceId);
    const order = await this.findOne(id);

    // Use lodash to remove undefined fields
    const updateFields = omitBy(dto, isUndefined);
    Object.assign(order, updateFields);

    return repository.save(order);
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    workspaceId: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(orderId, { status });

    this.logger.log(`Order ${orderId} status updated to ${status}`);
  }
}
```

---

## 6. Module Registration

### Register Hooks in Module

```typescript
import { Module } from '@nestjs/common';
import { MktOrderCreateOnePreQueryHook } from './hooks/mkt-order-create-one.pre-query.hook';
import { MktOrderCreateOnePostQueryHook } from './hooks/mkt-order-create-one.post-query.hook';
import { MktOrderUpdateOnePreQueryHook } from './hooks/mkt-order-update-one.pre-query.hook';
import { OrderService } from './services/order.service';
import { MktOrderResolver } from './resolvers/mkt-order.resolver';

@Module({
  providers: [
    // Services
    OrderService,

    // Resolvers
    MktOrderResolver,

    // Pre-Query Hooks
    MktOrderCreateOnePreQueryHook,
    MktOrderUpdateOnePreQueryHook,

    // Post-Query Hooks
    MktOrderCreateOnePostQueryHook,
  ],
  exports: [OrderService],
})
export class MktOrderModule {}
```

---

## 7. Constants Pattern

### Object IDs (IMMUTABLE)

```typescript
// src/mkt-core/constants/mkt-object-ids.ts
export const MKT_OBJECT_IDS = {
  mktLicense: 'mkt-license-standard-id',
  mktOrder: 'mkt-order-standard-id',
  mktOrderItem: 'mkt-order-item-standard-id',
  mktCustomer: 'mkt-customer-standard-id',
  // Add new entity IDs here
};
```

### Field IDs (IMMUTABLE)

```typescript
// src/mkt-core/constants/mkt-field-ids.ts
export const MKT_FIELD_IDS = {
  mktOrder: {
    name: 'mkt-order-name-field-id',
    status: 'mkt-order-status-field-id',
    amount: 'mkt-order-amount-field-id',
    customer: 'mkt-order-customer-relation-field-id',
    items: 'mkt-order-items-relation-field-id',
    // Add new field IDs here
  },
};
```

---

## 8. Required Utilities Pattern

### DateTimeUtils - Date/Time Operations

```typescript
import { DateTimeUtils, DATE_TIME_FORMATS } from 'src/mkt-core/utils/date-time.utils';

// In services/sagas
const now = DateTimeUtils.now();
const nowISO = DateTimeUtils.toISO(now);
const nowDate = DateTimeUtils.toDate(now);
const millis = DateTimeUtils.toMillis(now);

// Date arithmetic
const future = DateTimeUtils.add(now, { days: 30, hours: 2 });
const past = DateTimeUtils.subtract(now, { hours: 24 });

// Formatting
const formatted = DateTimeUtils.format(now, DATE_TIME_FORMATS.DISPLAY_DATE);

// Parsing
const fromISO = DateTimeUtils.fromISO('2024-01-01T00:00:00Z');
```

### MoneyUtils - Financial Calculations

```typescript
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

// In order/invoice calculations
const unitPrice = item.unitPrice ?? 0;
const quantity = item.quantity ?? 1;
const taxPercent = item.taxPercentage ?? 0;

// Calculate item totals
const totalPrice = MoneyUtils.multiply(unitPrice, quantity).toNumber();
const taxAmount = MoneyUtils.percentage(totalPrice, taxPercent).toNumber();
const totalWithTax = MoneyUtils.add(totalPrice, taxAmount).toNumber();

// Calculate order totals
const subtotal = MoneyUtils.sumBy(items, 'totalPrice').toNumber();
const totalTax = MoneyUtils.sumBy(items, 'taxAmount').toNumber();
const discount = MoneyUtils.percentage(subtotal, discountPercent).toNumber();
const grandTotal = MoneyUtils.subtract(
  MoneyUtils.add(subtotal, totalTax),
  discount,
).toNumber();

// Safe rounding
const rounded = MoneyUtils.round(value, 2).toNumber();

// Safe division (handles zero divisor)
const dailyRate = MoneyUtils.divideSafe(amount, days);
```

### JSON Utilities - Safe JSON Operations

```typescript
import { safeJsonStringify, safeJsonParse, parseJsonOrDefault } from 'src/mkt-core/utils/json.util';

// In sagas/services - storing metadata
const metadata = safeJsonStringify({
  orderAction: action,
  confirmedAt: nowISO,
}) as unknown as JSON;

// Parsing with type safety
const result = safeJsonParse<MetadataType>(jsonString);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}

// Parsing with default value
const config = parseJsonOrDefault<ConfigType>(jsonString, defaultConfig);
```

---

## Best Practices

### DO

- Always extend `BaseWorkspaceEntity`
- Use constants for Object IDs and Field IDs
- Set logger context in constructor
- Use `omitBy` for update methods
- Handle errors gracefully in post-hooks
- Use `@Injectable()` with hook decorators
- Use `DateTimeUtils` for all date/time operations
- Use `MoneyUtils` for all financial calculations
- Use `safeJsonStringify`/`safeJsonParse` for JSON operations

### DON'T

- Hard-code IDs or field names
- Throw errors in post-hooks (blocks main query)
- Use `any` type
- Use `forEach` loops
- Create default exports
- Use `new Date()` or `Date.now()` directly
- Use manual arithmetic for money calculations
- Use `JSON.stringify()` or `JSON.parse()` directly

---

## Related Resources

- [TypeScript Rules](./typescript-rules.md)
- [Architecture Overview](./architecture.md)
- [Templates](../templates/)

---

**Version**: 1.1
**Last Updated**: 2025-12-20
