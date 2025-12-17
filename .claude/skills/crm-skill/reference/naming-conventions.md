# Naming Conventions - Twenty CRM

> Quy tắc đặt tên cho files, classes, variables trong Twenty CRM

---

## File Naming

### Convention: kebab-case with suffixes

```
# Workspace Entities
mkt-order.workspace-entity.ts
mkt-license.workspace-entity.ts
mkt-customer.workspace-entity.ts

# Modules
mkt-order.module.ts
mkt-license.module.ts

# Services
order.service.ts
mkt-license.service.ts
order.action.service.ts

# Resolvers
mkt-order.resolver.ts
mkt-license-export.resolver.ts

# Hooks
mkt-order-create-one.pre-query.hook.ts
mkt-order-create-one.post-query.hook.ts
mkt-order-update-one.pre-query.hook.ts

# DTOs
create-order.dto.ts
update-license.dto.ts

# Constants
order-status.constants.ts
mkt-object-ids.ts
mkt-field-ids.ts

# Types
order.type.ts
payment.type.ts
```

### Directory Structure

```
mkt-core/order/
├── objects/
│   ├── mkt-order.workspace-entity.ts
│   └── mkt-order-item.workspace-entity.ts
├── hooks/
│   ├── mkt-order-create-one.pre-query.hook.ts
│   └── mkt-order-create-one.post-query.hook.ts
├── resolvers/
│   └── mkt-order.resolver.ts
├── services/
│   ├── order.service.ts
│   └── order.action.service.ts
├── constants/
│   └── order-status.constants.ts
├── dto/
│   ├── create-order.dto.ts
│   └── update-order.dto.ts
└── mkt-order.module.ts
```

---

## Class Naming

### Convention: PascalCase

```typescript
// Workspace Entities
class MktOrderWorkspaceEntity {}
class MktLicenseWorkspaceEntity {}
class MktCustomerWorkspaceEntity {}

// Services
class OrderService {}
class MktLicenseService {}
class OrderActionService {}

// Hooks (với suffix)
class MktOrderCreateOnePreQueryHook {}
class MktOrderCreateOnePostQueryHook {}
class MktOrderUpdateOnePreQueryHook {}

// Resolvers
class MktOrderResolver {}
class MktLicenseExportResolver {}

// Modules
class MktOrderModule {}
class MktLicenseModule {}

// DTOs
class CreateOrderDto {}
class UpdateLicenseDto {}
```

### Naming Patterns

| Type | Pattern | Example |
|------|---------|---------|
| Workspace Entity | `Mkt{Name}WorkspaceEntity` | `MktOrderWorkspaceEntity` |
| Pre-Query Hook | `Mkt{Entity}{Method}PreQueryHook` | `MktOrderCreateOnePreQueryHook` |
| Post-Query Hook | `Mkt{Entity}{Method}PostQueryHook` | `MktOrderCreateOnePostQueryHook` |
| Service | `{Name}Service` | `OrderService` |
| Resolver | `Mkt{Name}Resolver` | `MktOrderResolver` |
| Module | `Mkt{Name}Module` | `MktOrderModule` |
| DTO | `{Action}{Entity}Dto` | `CreateOrderDto` |

---

## Variable Naming

### Convention: camelCase

```typescript
// Services
const orderService = new OrderService();
const licenseService = new MktLicenseService();

// IDs
const orderId = 'uuid-here';
const workspaceId = authContext.workspace?.id;
const workspaceMemberId = authContext.workspaceMemberId;

// Entities
const order = await repository.findOne({ where: { id } });
const licenses = await repository.find();

// Arrays
const orderItems = order.items;
const customers = await repository.find();

// Booleans (prefix with is, has, can, should)
const isActive = order.status === 'ACTIVE';
const hasItems = orderItems.length > 0;
const canDelete = !hasChildren;
const shouldProcess = status === 'PENDING';
```

---

## Constants Naming

### Convention: UPPER_SNAKE_CASE

```typescript
// Status constants
const ORDER_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  BLOCKED: 'BLOCKED',
  OVERDUE: 'OVERDUE',
} as const;

// Object IDs (in mkt-object-ids.ts)
const MKT_OBJECT_IDS = {
  mktOrder: 'mkt-order-standard-id',
  mktLicense: 'mkt-license-standard-id',
} as const;

// Field IDs (in mkt-field-ids.ts)
const MKT_FIELD_IDS = {
  mktOrder: {
    name: 'mkt-order-name-field-id',
    status: 'mkt-order-status-field-id',
  },
} as const;

// Configuration
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;
const PAYMENT_TIMEOUT_MS = 30000;
```

---

## Function Naming

### Convention: camelCase with descriptive verbs

```typescript
// CRUD operations
async function findOne(id: string) {}
async function findAll(filter?: FilterDto) {}
async function create(dto: CreateDto) {}
async function update(id: string, dto: UpdateDto) {}
async function remove(id: string) {}

// Business operations
async function processOrder(orderId: string) {}
async function confirmPayment(paymentId: string) {}
async function renewLicense(licenseId: string, months: number) {}
async function activateLicense(licenseId: string, deviceId: string) {}

// Validation
function validateOrderData(data: OrderData): boolean {}
function isValidStatus(status: string): boolean {}
function canProcessPayment(order: Order): boolean {}

// Transformation
function transformToDto(entity: Entity): Dto {}
function parseMetadata(json: string): Metadata {}

// Event handlers
function onOrderCreated(order: Order): void {}
function handlePaymentReceived(payment: Payment): void {}
```

---

## Hook Key Naming

### Convention: `{entityName}.{methodName}`

```typescript
// Entity name: camelCase (matching namePlural without 's')
// Method name: exact method name

// Create operations
'mktOrder.createOne'
'mktOrder.createMany'

// Update operations
'mktOrder.updateOne'
'mktOrder.updateMany'

// Delete operations (soft delete)
'mktOrder.deleteOne'
'mktOrder.deleteMany'

// Destroy operations (hard delete)
'mktOrder.destroyOne'
'mktOrder.destroyMany'

// Read operations
'mktOrder.findOne'
'mktOrder.findMany'

// Restore operations
'mktOrder.restoreMany'
```

---

## GraphQL Naming

### Queries and Mutations

```typescript
// Queries
@Query(() => [MktOrderDto])
async mktOrders() {}

@Query(() => MktOrderDto)
async mktOrder(@Args('id') id: string) {}

// Mutations
@Mutation(() => MktOrderDto)
async createMktOrder(@Args('input') input: CreateOrderInput) {}

@Mutation(() => MktOrderDto)
async updateMktOrder(
  @Args('id') id: string,
  @Args('input') input: UpdateOrderInput,
) {}

@Mutation(() => Boolean)
async deleteMktOrder(@Args('id') id: string) {}

// Custom mutations
@Mutation(() => Boolean)
async confirmMktOrder(@Args('orderId') orderId: string) {}

@Mutation(() => MktLicenseDto)
async renewMktLicense(
  @Args('licenseId') licenseId: string,
  @Args('months') months: number,
) {}
```

---

## Common Mistakes

### Mistake 1: Inconsistent Entity Naming

```typescript
// NO
class OrderWorkspaceEntity {}     // Missing Mkt prefix
class MktOrderEntity {}           // Missing WorkspaceEntity suffix
class MKTOrderWorkspaceEntity {}  // Wrong case

// OK
class MktOrderWorkspaceEntity {}
```

### Mistake 2: Wrong Hook Class Naming

```typescript
// NO
class OrderCreateHook {}                    // Missing full name
class MktOrderCreatePreHook {}              // Missing One/Many
class MktOrderCreateOneHook {}              // Missing PreQuery/PostQuery

// OK
class MktOrderCreateOnePreQueryHook {}
class MktOrderCreateOnePostQueryHook {}
```

### Mistake 3: Inconsistent ID Naming

```typescript
// NO
const order_id = '...';        // snake_case
const OrderId = '...';         // PascalCase
const orderID = '...';         // Inconsistent

// OK
const orderId = '...';         // camelCase
const workspaceId = '...';
const workspaceMemberId = '...';
```

---

## Checklist

Before committing, verify:

- [ ] Files use kebab-case with correct suffixes
- [ ] Workspace entities: `mkt-*.workspace-entity.ts`
- [ ] Hooks: `mkt-*-{method}.{pre|post}-query.hook.ts`
- [ ] Classes use PascalCase with Mkt prefix
- [ ] Variables use camelCase
- [ ] Constants use UPPER_SNAKE_CASE
- [ ] Boolean variables have is/has/can/should prefix
- [ ] Arrays use plural names
- [ ] Hook keys match format `entityName.methodName`

---

**Related:**
- [TypeScript Rules](./typescript-rules.md)
- [Code Patterns](./code-patterns.md)

---

**Version**: 1.0
**Last Updated**: 2025-12-13
