# Block Hooks System

Hệ thống hooks dùng chung để block các GraphQL operations tự động sinh bởi Twenty CRM.

## Mục đích

Twenty CRM tự động sinh 13 GraphQL operations cho mỗi WorkspaceEntity:
- **Queries (3):** `findMany`, `findOne`, `findDuplicates`
- **Mutations (10):** `createOne`, `createMany`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `destroyOne`, `destroyMany`, `restoreOne`, `restoreMany`

Block hooks cho phép:
- Vô hiệu hóa một số hoặc tất cả operations
- Buộc người dùng sử dụng custom resolvers với RBAC, validation, business logic

## Cài đặt nhanh

### 1. Tạo file hook cho module

```typescript
// packages/twenty-server/src/mkt-core/[module]/hooks/[module]-block.pre-query.hook.ts

import { BlockHookConfig, createBlockHooks } from 'src/mkt-core/common/hooks';

const MODULE_BLOCK_CONFIG: BlockHookConfig = {
  entityName: 'mktModuleName',        // Tên entity (e.g., 'mktOrder', 'mktContract')
  logContext: 'ModuleName:BlockHook', // Context cho logging
  blockedMessage: 'Use custom resolvers instead', // Message hiển thị khi bị block
};

const { providers } = createBlockHooks(MODULE_BLOCK_CONFIG);

export const MODULE_BLOCK_HOOKS = providers;
```

### 2. Đăng ký hooks vào Module

```typescript
// packages/twenty-server/src/mkt-core/[module]/[module].module.ts

import { MODULE_BLOCK_HOOKS } from './hooks';

@Module({
  providers: [
    ...MODULE_BLOCK_HOOKS,
    // ... other providers
  ],
})
export class MktModuleModule {}
```

### 3. Export từ hooks/index.ts

```typescript
// packages/twenty-server/src/mkt-core/[module]/hooks/index.ts

export * from './[module]-block.pre-query.hook';
```

## Tùy chỉnh Operations

### Block tất cả operations (mặc định)

```typescript
const CONFIG: BlockHookConfig = {
  entityName: 'mktOrder',
  logContext: 'Order:BlockHook',
  blockedMessage: 'Use OrderService instead',
};
// Blocks: findMany, findOne, findDuplicates, createOne, createMany,
//         updateOne, updateMany, deleteOne, deleteMany, destroyOne,
//         destroyMany, restoreOne, restoreMany
```

### Block chỉ mutations (cho phép queries)

```typescript
const CONFIG: BlockHookConfig = {
  entityName: 'mktOrder',
  logContext: 'Order:BlockHook',
  blockedMessage: 'Use OrderService for mutations',
  excludedOperations: ['FIND_MANY', 'FIND_ONE', 'FIND_DUPLICATES'],
};
// Blocks: createOne, createMany, updateOne, updateMany, deleteOne,
//         deleteMany, destroyOne, destroyMany, restoreOne, restoreMany
// Allows: findMany, findOne, findDuplicates
```

### Block chỉ một số operations cụ thể

```typescript
const CONFIG: BlockHookConfig = {
  entityName: 'mktOrder',
  logContext: 'Order:BlockHook',
  blockedMessage: 'Use OrderService for these operations',
  blockedOperations: ['CREATE_ONE', 'DELETE_ONE', 'DESTROY_ONE'],
};
// Blocks: createOne, deleteOne, destroyOne
// Allows: tất cả operations còn lại
```

### Sử dụng preset constants

```typescript
import {
  MUTATION_OPERATIONS,  // Block tất cả mutations
  WRITE_OPERATIONS,     // Block create + update
  DELETE_OPERATIONS,    // Block delete + destroy + restore
  QUERY_OPERATIONS,     // Block queries
} from 'src/mkt-core/common/hooks';

// Block chỉ write operations
const CONFIG: BlockHookConfig = {
  entityName: 'mktOrder',
  logContext: 'Order:BlockHook',
  blockedMessage: 'Read-only entity',
  blockedOperations: WRITE_OPERATIONS,
};
```

## API Reference

### BlockHookConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `entityName` | `string` | Yes | Tên entity (e.g., `'mktContract'`) |
| `logContext` | `string` | Yes | Context cho logging |
| `blockedMessage` | `string` | Yes | Error message khi bị block |
| `blockedOperations` | `ResolverMethodKey[]` | No | Chỉ block các operations này |
| `excludedOperations` | `ResolverMethodKey[]` | No | Block tất cả trừ các operations này |

### ResolverMethodKey

```typescript
type ResolverMethodKey =
  | 'FIND_MANY' | 'FIND_ONE' | 'FIND_DUPLICATES'
  | 'CREATE_ONE' | 'CREATE_MANY'
  | 'UPDATE_ONE' | 'UPDATE_MANY'
  | 'DELETE_ONE' | 'DELETE_MANY'
  | 'DESTROY_ONE' | 'DESTROY_MANY'
  | 'RESTORE_ONE' | 'RESTORE_MANY';
```

### createBlockHooks(config)

```typescript
const { providers, blockedOperations, hooks } = createBlockHooks(config);

// providers: Type<BaseBlockPreQueryHook>[] - Dùng cho NestJS module providers
// blockedOperations: string[] - Danh sách operations bị block (e.g., ['mktOrder.findMany'])
// hooks: Map<ResolverMethodKey, Type> - Map operation -> hook class
```

### Preset Constants

| Constant | Operations |
|----------|------------|
| `ALL_RESOLVER_METHODS` | Tất cả 13 operations |
| `QUERY_OPERATIONS` | `FIND_MANY`, `FIND_ONE`, `FIND_DUPLICATES` |
| `MUTATION_OPERATIONS` | Tất cả mutations (10 operations) |
| `WRITE_OPERATIONS` | `CREATE_ONE`, `CREATE_MANY`, `UPDATE_ONE`, `UPDATE_MANY` |
| `DELETE_OPERATIONS` | `DELETE_*`, `DESTROY_*`, `RESTORE_*` |

## Ví dụ thực tế

### Contract Module (block tất cả, dùng custom resolvers)

```typescript
// contract/hooks/contract-block.pre-query.hook.ts
import { BlockHookConfig, createBlockHooks } from 'src/mkt-core/common/hooks';
import { MKT_CONTRACT_ENTITY_NAME } from '../workspace-entity/mkt-contract.workspace-entity';

export const CONTRACT_BLOCK_CONFIG: BlockHookConfig = {
  entityName: MKT_CONTRACT_ENTITY_NAME,
  logContext: 'Contract:BlockHook',
  blockedMessage:
    'This operation is disabled. Use custom Contract resolvers instead (getContractById, createContract, etc.)',
};

const { providers, blockedOperations } = createBlockHooks(CONTRACT_BLOCK_CONFIG);

export const CONTRACT_BLOCK_HOOKS = providers;
export const CONTRACT_BLOCKED_OPERATIONS = blockedOperations;
```

### Order Module (cho phép queries, block mutations)

```typescript
// order/hooks/order-block.pre-query.hook.ts
import { BlockHookConfig, createBlockHooks, QUERY_OPERATIONS } from 'src/mkt-core/common/hooks';

export const ORDER_BLOCK_CONFIG: BlockHookConfig = {
  entityName: 'mktOrder',
  logContext: 'Order:BlockHook',
  blockedMessage: 'Use OrderService for mutations',
  excludedOperations: QUERY_OPERATIONS, // Cho phép findMany, findOne, findDuplicates
};

const { providers } = createBlockHooks(ORDER_BLOCK_CONFIG);
export const ORDER_BLOCK_HOOKS = providers;
```

### Invoice Module (chỉ block delete operations)

```typescript
// invoice/hooks/invoice-block.pre-query.hook.ts
import { BlockHookConfig, createBlockHooks, DELETE_OPERATIONS } from 'src/mkt-core/common/hooks';

export const INVOICE_BLOCK_CONFIG: BlockHookConfig = {
  entityName: 'mktInvoice',
  logContext: 'Invoice:BlockHook',
  blockedMessage: 'Invoices cannot be deleted. Use void/cancel instead.',
  blockedOperations: DELETE_OPERATIONS,
};

const { providers } = createBlockHooks(INVOICE_BLOCK_CONFIG);
export const INVOICE_BLOCK_HOOKS = providers;
```

## Cấu trúc thư mục

```
packages/twenty-server/src/mkt-core/
├── common/
│   └── hooks/
│       ├── index.ts                    # Barrel exports
│       ├── base-block.pre-query.hook.ts # Base class
│       ├── block-hook.factory.ts       # Factory function
│       ├── types/
│       │   └── block-hook.types.ts     # Type definitions
│       └── README.md                   # Tài liệu này
│
├── contract/
│   ├── hooks/
│   │   ├── index.ts
│   │   └── contract-block.pre-query.hook.ts
│   └── mkt-contract.module.ts
│
└── order/
    ├── hooks/
    │   ├── index.ts
    │   └── order-block.pre-query.hook.ts
    └── mkt-order.module.ts
```

## Lưu ý

1. **Thứ tự ưu tiên:** `blockedOperations` được ưu tiên hơn `excludedOperations`. Nếu cả hai đều được set, chỉ `blockedOperations` có hiệu lực.

2. **Logging:** Mỗi khi operation bị block, một warning log sẽ được ghi với context đã cấu hình.

3. **Error Response:** Client sẽ nhận được `ForbiddenException` với message đã cấu hình.

4. **Dynamic hooks:** Factory tự động tạo class names dựa trên entity name (e.g., `MktContractBlockFIND_MANYHook`).

5. **Type safety:** Sử dụng `ResolverMethodKey` type để đảm bảo chỉ các operations hợp lệ được sử dụng.
