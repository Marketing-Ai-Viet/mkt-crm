# Hướng dẫn sử dụng @WorkspaceGate để tắt Endpoint tùy chọn

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Hiện trạng @WorkspaceGate](#2-hiện-trạng-workspacegate)
3. [Đề xuất mở rộng: @WorkspaceDisableOperations](#3-đề-xuất-mở-rộng-workspacedisableoperations)
4. [Hướng dẫn Implementation](#4-hướng-dẫn-implementation)
5. [Sử dụng](#5-sử-dụng)
6. [So sánh các phương pháp](#6-so-sánh-các-phương-pháp)

---

## 1. Tổng quan

### 1.1. Vấn đề

Twenty CRM tự động sinh **13 GraphQL operations** cho mỗi entity:

| Loại | Operations |
|------|------------|
| **Queries (3)** | `findMany`, `findOne`, `findDuplicates` |
| **Mutations (10)** | `createOne`, `createMany`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `destroyOne`, `destroyMany`, `restoreOne`, `restoreMany` |

**Yêu cầu**: Cần cách đơn giản để tắt một số operations nguy hiểm (createMany, destroyMany, etc.) mà không cần viết nhiều hook code.

### 1.2. Mục tiêu

- Khai báo declarative ngay trên entity
- Ẩn endpoint khỏi GraphQL schema (không chỉ runtime block)
- Theo pattern hiện có của Twenty (@WorkspaceGate, @WorkspaceIsSystem, etc.)

---

## 2. Hiện trạng @WorkspaceGate

### 2.1. Cách hoạt động

```typescript
// File: packages/twenty-server/src/engine/twenty-orm/decorators/workspace-gate.decorator.ts

export interface WorkspaceGateOptions {
  featureFlag: string;           // Feature flag key
  excludeFromDatabase?: boolean; // Default: true - không tạo table
  excludeFromWorkspaceApi?: boolean; // Default: true - ẩn khỏi GraphQL
}
```

### 2.2. Ví dụ sử dụng hiện tại

```typescript
@WorkspaceEntity({...})
@WorkspaceGate({
  featureFlag: 'IS_WEBHOOK_GRAPHQL_ENABLED',
  excludeFromDatabase: false,      // Vẫn tạo table
  excludeFromWorkspaceApi: true,   // ẨN TOÀN BỘ entity khỏi GraphQL
})
export class WebhookWorkspaceEntity extends BaseWorkspaceEntity {...}
```

### 2.3. Hạn chế

| Hạn chế | Mô tả |
|---------|-------|
| **All-or-nothing** | Chỉ có thể ẩn TOÀN BỘ entity, không thể chọn operations |
| **Không granular** | Không thể giữ `findMany` mà tắt `createMany` |

---

## 3. Đề xuất mở rộng: @WorkspaceDisableOperations

### 3.1. Thiết kế Decorator mới

```typescript
// File: packages/twenty-server/src/engine/twenty-orm/decorators/workspace-disable-operations.decorator.ts

import { TypedReflect } from 'src/utils/typed-reflect';

/**
 * Operations có thể disable
 * Chỉ cho phép disable các bulk/dangerous operations
 */
export const DISABLEABLE_OPERATIONS = [
  'createMany',
  'updateMany',
  'deleteMany',
  'destroyOne',
  'destroyMany',
  'restoreMany',
] as const;

export type DisableableOperation = typeof DISABLEABLE_OPERATIONS[number];

/**
 * Decorator để disable specific operations cho entity
 *
 * @example
 * ```typescript
 * @WorkspaceEntity({...})
 * @WorkspaceDisableOperations(['createMany', 'destroyOne', 'destroyMany'])
 * export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {...}
 * ```
 */
export function WorkspaceDisableOperations(
  operations: DisableableOperation[],
): ClassDecorator {
  return (target) => {
    // Validate operations
    for (const op of operations) {
      if (!DISABLEABLE_OPERATIONS.includes(op)) {
        throw new Error(
          `Invalid operation "${op}". Allowed: ${DISABLEABLE_OPERATIONS.join(', ')}`,
        );
      }
    }

    TypedReflect.defineMetadata(
      'workspace:disabled-operations-metadata-args',
      operations,
      target,
    );
  };
}
```

### 3.2. Cập nhật WorkspaceEntity Decorator

```typescript
// File: packages/twenty-server/src/engine/twenty-orm/decorators/workspace-entity.decorator.ts

export function WorkspaceEntity(options: WorkspaceEntityOptions): ClassDecorator {
  return (target) => {
    // ... existing code ...

    // Thêm: Đọc disabled operations metadata
    const disabledOperations = TypedReflect.getMetadata(
      'workspace:disabled-operations-metadata-args',
      target,
    ) ?? [];

    metadataArgsStorage.addEntities({
      // ... existing fields ...
      disabledOperations,  // Thêm field mới
    });
  };
}
```

### 3.3. Cập nhật shouldBuildResolver

```typescript
// File: packages/twenty-server/src/engine/api/graphql/workspace-resolver-builder/workspace-resolver-builder.service.ts

@Injectable()
export class WorkspaceResolverBuilderService {
  shouldBuildResolver(
    objectMetadata: Pick<ObjectMetadataEntity, 'duplicateCriteria' | 'disabledOperations'>,
    methodName: WorkspaceResolverBuilderMethodNames,
  ): boolean {
    // Check disabled operations
    if (objectMetadata.disabledOperations?.includes(methodName)) {
      return false;
    }

    // Existing logic for findDuplicates
    switch (methodName) {
      case FindDuplicatesResolverFactory.methodName:
        return isDefined(objectMetadata.duplicateCriteria);
      default:
        return true;
    }
  }
}
```

### 3.4. Cập nhật WorkspaceResolverFactory

```typescript
// File: packages/twenty-server/src/engine/api/graphql/workspace-resolver-builder/workspace-resolver.factory.ts

// TRƯỚC: Mutations không check shouldBuildResolver (line 157-162)
resolvers.Mutation[resolverName] = resolverFactory.create({...});

// SAU: Thêm check shouldBuildResolver cho mutations
if (
  this.workspaceResolverBuilderService.shouldBuildResolver(
    objectMetadata,
    methodName,
  )
) {
  resolvers.Mutation[resolverName] = resolverFactory.create({...});
}
```

---

## 4. Hướng dẫn Implementation

### 4.1. Files cần tạo/sửa

| File | Action | Mô tả |
|------|--------|-------|
| `workspace-disable-operations.decorator.ts` | **Tạo mới** | Decorator definition |
| `workspace-entity.decorator.ts` | **Sửa** | Đọc disabled operations metadata |
| `metadata-args.storage.ts` | **Sửa** | Thêm field disabledOperations |
| `object-metadata.entity.ts` | **Sửa** | Thêm column disabledOperations |
| `workspace-resolver-builder.service.ts` | **Sửa** | Check disabled operations |
| `workspace-resolver.factory.ts` | **Sửa** | Apply check cho mutations |
| `root-type.factory.ts` | **Sửa** | Apply check cho schema building |

### 4.2. Step-by-step Implementation

#### Step 1: Tạo Decorator

```bash
# Tạo file decorator mới
touch packages/twenty-server/src/engine/twenty-orm/decorators/workspace-disable-operations.decorator.ts
```

```typescript
// workspace-disable-operations.decorator.ts
import { TypedReflect } from 'src/utils/typed-reflect';

export const DISABLEABLE_OPERATIONS = [
  'createMany',
  'updateMany',
  'deleteMany',
  'destroyOne',
  'destroyMany',
  'restoreMany',
] as const;

export type DisableableOperation = typeof DISABLEABLE_OPERATIONS[number];

export function WorkspaceDisableOperations(
  operations: DisableableOperation[],
): ClassDecorator {
  return (target) => {
    TypedReflect.defineMetadata(
      'workspace:disabled-operations-metadata-args',
      operations,
      target,
    );
  };
}
```

#### Step 2: Export từ index

```typescript
// packages/twenty-server/src/engine/twenty-orm/decorators/index.ts
export * from './workspace-disable-operations.decorator';
```

#### Step 3: Cập nhật MetadataArgsStorage

```typescript
// packages/twenty-server/src/engine/twenty-orm/storage/metadata-args.storage.ts

// Thêm vào EntityMetadataArgs interface
interface EntityMetadataArgs {
  // ... existing fields ...
  disabledOperations?: string[];
}
```

#### Step 4: Cập nhật ObjectMetadataEntity

```typescript
// packages/twenty-server/src/engine/metadata-modules/object-metadata/object-metadata.entity.ts

@Entity('objectMetadata')
export class ObjectMetadataEntity {
  // ... existing fields ...

  @Column({ type: 'jsonb', nullable: true, default: [] })
  disabledOperations: string[] | null;
}
```

#### Step 5: Cập nhật WorkspaceResolverBuilderService

```typescript
// workspace-resolver-builder.service.ts

shouldBuildResolver(
  objectMetadata: Pick<ObjectMetadataEntity, 'duplicateCriteria' | 'disabledOperations'>,
  methodName: WorkspaceResolverBuilderMethodNames,
): boolean {
  // Check disabled operations FIRST
  if (objectMetadata.disabledOperations?.includes(methodName)) {
    return false;
  }

  switch (methodName) {
    case FindDuplicatesResolverFactory.methodName:
      return isDefined(objectMetadata.duplicateCriteria);
    default:
      return true;
  }
}
```

#### Step 6: Cập nhật WorkspaceResolverFactory

```typescript
// workspace-resolver.factory.ts - Line 142-163

// Generate mutation resolvers
for (const methodName of workspaceResolverBuilderMethods.mutations) {
  const resolverName = getResolverName(objectMetadata, methodName);
  const resolverFactory = factories.get(methodName);

  if (!resolverFactory) {
    throw new Error(`Unknown mutation resolver type: ${methodName}`);
  }

  // THÊM: Check shouldBuildResolver cho mutations
  if (
    this.workspaceResolverBuilderService.shouldBuildResolver(
      objectMetadata,
      methodName,
    )
  ) {
    resolvers.Mutation[resolverName] = resolverFactory.create({
      authContext,
      objectMetadataMaps,
      objectMetadataItemWithFieldMaps: objectMetadata,
    });
  }
}
```

#### Step 7: Tạo Migration

```bash
npx nx run twenty-server:typeorm migration:generate \
  src/database/typeorm/metadata/migrations/add-disabled-operations \
  -d src/database/typeorm/metadata/metadata.datasource.ts
```

---

## 5. Sử dụng

### 5.1. Cú pháp cơ bản

```typescript
import { WorkspaceEntity, WorkspaceDisableOperations } from 'src/engine/twenty-orm/decorators';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktOrder,
  namePlural: 'mktOrders',
  labelSingular: msg('Order'),
  labelPlural: msg('Orders'),
  icon: 'IconShoppingCart',
})
@WorkspaceDisableOperations([
  'createMany',   // Block bulk creation
  'updateMany',   // Block bulk update
  'deleteMany',   // Block bulk soft delete
  'destroyOne',   // Block permanent delete single
  'destroyMany',  // Block permanent delete bulk
  'restoreMany',  // Block bulk restore
])
export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {
  // ... fields ...
}
```

### 5.2. Các preset phổ biến

```typescript
// Preset 1: Block all dangerous bulk operations
const BLOCK_BULK_OPERATIONS: DisableableOperation[] = [
  'createMany',
  'updateMany',
  'deleteMany',
  'destroyMany',
  'restoreMany',
];

// Preset 2: Block all destroy operations (soft delete only)
const BLOCK_DESTROY_OPERATIONS: DisableableOperation[] = [
  'destroyOne',
  'destroyMany',
];

// Preset 3: Block all mutations except single record operations
const BLOCK_ALL_BULK: DisableableOperation[] = [
  'createMany',
  'updateMany',
  'deleteMany',
  'destroyMany',
  'restoreMany',
];

// Sử dụng preset
@WorkspaceDisableOperations(BLOCK_BULK_OPERATIONS)
export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {...}
```

### 5.3. Kết hợp với @WorkspaceGate

```typescript
// Có thể kết hợp cả hai
@WorkspaceEntity({...})
@WorkspaceGate({
  featureFlag: 'IS_MKT_ORDER_ENABLED',
  excludeFromDatabase: false,
  excludeFromWorkspaceApi: false,  // Không ẩn toàn bộ
})
@WorkspaceDisableOperations(['createMany', 'destroyMany'])  // Chỉ disable một số
export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {...}
```

---

## 6. So sánh các phương pháp

### 6.1. Bảng so sánh

| Tiêu chí | @WorkspaceGate | @WorkspaceDisableOperations | WorkspaceQueryHook |
|----------|----------------|----------------------------|-------------------|
| **Granular control** | ❌ All-or-nothing | ✅ Per-operation | ✅ Per-operation |
| **Ẩn khỏi schema** | ✅ Có | ✅ Có | ❌ Không |
| **Declarative** | ✅ Cao | ✅ Cao | ⚠️ Trung bình |
| **Cần sửa engine** | ❌ Không | ✅ Cần | ❌ Không |
| **Runtime logic** | ❌ Không | ❌ Không | ✅ Có |
| **Feature flag support** | ✅ Có | ❌ Không (static) | ✅ Có |

### 6.2. Khi nào dùng phương pháp nào?

| Use Case | Phương pháp khuyến nghị |
|----------|-------------------------|
| Ẩn toàn bộ entity theo feature flag | `@WorkspaceGate` |
| Disable specific operations (static) | `@WorkspaceDisableOperations` |
| Disable với logic phức tạp (role, env) | `WorkspaceQueryHook` |
| Disable tạm thời theo environment | `WorkspaceQueryHook` + Feature Flag |

### 6.3. Ví dụ kết hợp tất cả

```typescript
// Entity definition
@WorkspaceEntity({...})
@WorkspaceDisableOperations(['createMany', 'destroyMany'])  // Static disable
export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {...}

// Hook cho runtime logic (feature flag)
@Injectable()
@WorkspaceQueryHook('mktOrder.updateMany')
export class MktOrderBlockUpdateManyHook implements WorkspacePreQueryHookInstance {
  constructor(private configService: ConfigService) {}

  async execute(): Promise<void> {
    const isEnabled = this.configService.get('MKT_BULK_UPDATE_ENABLED', false);
    if (!isEnabled) {
      throw new ForbiddenException('Bulk update is disabled');
    }
  }
}
```

---

## Appendix

### A. Danh sách Operations có thể Disable

| Operation | Loại | Rủi ro | Khuyến nghị |
|-----------|------|--------|-------------|
| `createMany` | Mutation | Bypass validation, bulk insert | ❌ Disable |
| `updateMany` | Mutation | Mass data modification | ❌ Disable |
| `deleteMany` | Mutation | Mass soft delete | ⚠️ Cân nhắc |
| `destroyOne` | Mutation | Permanent delete | ❌ Disable |
| `destroyMany` | Mutation | Mass permanent delete | ❌ Disable |
| `restoreMany` | Mutation | Mass restore deleted | ⚠️ Cân nhắc |

### B. Files tham khảo

| File | Mô tả |
|------|-------|
| `workspace-gate.decorator.ts` | Decorator hiện tại |
| `workspace-entity.decorator.ts` | Entity decorator |
| `workspace-resolver-builder.service.ts` | shouldBuildResolver logic |
| `workspace-resolver.factory.ts` | Resolver factory |
| `root-type.factory.ts` | Schema type factory |
| `metadata-args.storage.ts` | Metadata storage |

### C. Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-15 | System | Initial documentation |

---

*Tài liệu này đề xuất mở rộng @WorkspaceGate pattern để hỗ trợ selective endpoint disabling. Cần implement các thay đổi trong engine để sử dụng.*
