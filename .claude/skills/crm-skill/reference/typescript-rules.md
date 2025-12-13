# TypeScript Rules & Conventions

> MANDATORY - These rules are strictly enforced

---

## Core Principles

1. **Type Safety First** - No `any`, always explicit types
2. **Functional Programming** - Prefer pure functions, immutability
3. **Early Returns** - Avoid nested if-else
4. **Lodash for Complexity** - Reduce cyclomatic complexity
5. **Named Exports Only** - No default exports

---

## ALWAYS DO

### 1. Use `type` instead of `interface`

```typescript
// OK
type User = {
  name: string;
  email: string;
};

type UserWithRole = User & {
  role: string;
};

// NO
interface User {
  name: string;
}
```

**Why**: `type` is more flexible (unions, intersections, mapped types)

---

### 2. Never use `any`

```typescript
// OK
function processUser(data: UserData): ProcessedUser {
  return { id: data.id, name: data.name };
}

// NO
function processUser(data: any): any {
  return data;
}
```

**Alternatives**:
- Use specific types
- Use generics `<T>`
- Use `unknown` if type truly unknown (then type-check)

---

### 3. Use `for...of` not `forEach`

```typescript
// OK
for (const user of users) {
  console.log(user);
}

const names = users.map(u => u.name);
const adults = users.filter(u => u.age >= 18);

// NO
users.forEach(user => {
  console.log(user);
});
```

**Why**: Better performance, can use `break`/`continue`, async-friendly

---

### 4. Use `omitBy` for update methods

```typescript
import { omitBy, isUndefined } from 'lodash';

// OK - Complexity: 0
async update(id: string, dto: UpdateUserDto): Promise<User> {
  const user = await this.repository.findOne({ where: { id } });

  const updateFields = omitBy(dto, isUndefined);
  Object.assign(user, updateFields);

  return this.repository.save(user);
}

// NO - Complexity: 5
async update(id: string, dto: UpdateUserDto): Promise<User> {
  const user = await this.repository.findOne({ where: { id } });

  if (dto.name !== undefined) user.name = dto.name;
  if (dto.email !== undefined) user.email = dto.email;
  if (dto.age !== undefined) user.age = dto.age;
  // ...

  return this.repository.save(user);
}
```

---

### 5. Early Return Pattern

```typescript
// OK
async processOrder(orderId: string): Promise<Order> {
  const order = await this.findOrder(orderId);
  if (!order) {
    throw new NotFoundException();
  }

  if (order.status !== 'pending') {
    throw new BadRequestException('Order already processed');
  }

  if (!order.hasValidPayment()) {
    throw new PaymentRequiredException();
  }

  return this.completeOrder(order);
}

// NO
async processOrder(orderId: string): Promise<Order> {
  const order = await this.findOrder(orderId);

  if (order) {
    if (order.status === 'pending') {
      if (order.hasValidPayment()) {
        return this.completeOrder(order);
      } else {
        throw new PaymentRequiredException();
      }
    } else {
      throw new BadRequestException('Order already processed');
    }
  } else {
    throw new NotFoundException();
  }
}
```

---

### 6. No Hard-Coded Values

```typescript
// OK
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || 5_000_000;

enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned'
}

// NO
const maxSize = 5000000;
if (user.status === 'active') {} // Magic string
```

---

### 7. Use Lodash for Complex Operations

```typescript
import { groupBy, keyBy, uniqBy, orderBy, omitBy, isUndefined } from 'lodash';

// OK
const usersByRole = groupBy(users, 'role');
const usersMap = keyBy(users, 'id');
const uniqueUsers = uniqBy(users, 'email');
const sortedUsers = orderBy(users, ['age', 'name'], ['desc', 'asc']);
const cleanDto = omitBy(dto, isUndefined);

// NO - Manual implementation
const usersByRole = users.reduce((acc, user) => {
  if (!acc[user.role]) acc[user.role] = [];
  acc[user.role].push(user);
  return acc;
}, {});
```

---

### 8. Named Exports Only

```typescript
// OK
export const MyComponent = () => {};
export class MyService {}
export type MyType = {};

// NO
export default MyComponent;
export default class MyService {}
```

---

## NEVER DO

### Never use `interface`

```typescript
// NO
interface User {
  name: string;
}

// OK
type User = {
  name: string;
};
```

---

### Never use `any`

```typescript
// NO
function process(data: any) {}

// OK
function process<T>(data: T) {}
function process(data: UserData) {}
```

---

### Never use `forEach`

```typescript
// NO
users.forEach(user => console.log(user));

// OK
for (const user of users) {
  console.log(user);
}
```

---

### Never Hard-Code Values

```typescript
// NO
const maxSize = 5000000;

// OK
const MAX_SIZE = process.env.MAX_SIZE || 5_000_000;
```

---

## Naming Conventions

### Files

```
*.module.ts      - NestJS modules
*.controller.ts  - Controllers
*.service.ts     - Services
*.entity.ts      - TypeORM entities
*.workspace-entity.ts - Twenty workspace entities
*.dto.ts         - Data Transfer Objects
*.type.ts        - Type definitions
*.enum.ts        - Enums
*.constant.ts    - Constants
*.resolver.ts    - GraphQL resolvers
*.pre-query.hook.ts  - Pre-query hooks
*.post-query.hook.ts - Post-query hooks
```

### Classes/Types

```typescript
// PascalCase
class ProductsService {}
type JwtPayload = { userId: string };
enum UserStatus { ACTIVE, INACTIVE }
```

### Variables/Functions

```typescript
// camelCase
const productService = new ProductsService();
function getUserById(id: string) {}
```

### Constants

```typescript
// UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 5_000_000;
const DEFAULT_TIMEOUT = 30000;
```

---

## Import Organization

**Order** (strictly enforced):

```typescript
// 1. External libraries
import { Injectable } from '@nestjs/common';
import { omitBy, isUndefined } from 'lodash';

// 2. Engine imports
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';

// 3. Core modules
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';

// 4. mkt-core imports
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

// 5. Local imports
import { OrderService } from './order.service';
```

---

## Special Patterns

### UUID Fields

```typescript
// Twenty uses string IDs
@WorkspaceField({
  standardId: MKT_FIELD_IDS.entity.customerId,
  type: FieldMetadataType.UUID,
})
customerId: string;
```

---

### AuthContext Usage

```typescript
// Access workspace and user info
async execute(
  authContext: AuthContext,
  objectName: string,
  payload: CreateOneResolverArgs,
): Promise<CreateOneResolverArgs> {
  const workspaceId = authContext.workspace?.id;
  const userId = authContext.workspaceMemberId;
  // ...
}
```

---

## Checklist

Before committing, verify:

- [ ] No `interface` used (only `type`)
- [ ] No `any` used
- [ ] No `forEach` used (`for...of` or array methods)
- [ ] No hard-coded values (use constants)
- [ ] Update methods use `omitBy`
- [ ] Early returns used
- [ ] Imports organized correctly
- [ ] Naming conventions followed
- [ ] Named exports only (no default exports)

---

**Version**: 1.0
**Last Updated**: 2025-12-13
