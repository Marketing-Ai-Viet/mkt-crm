# Disable Auto-Generated CRUD Operations trong Twenty CRM

## Muc luc

1. [Tong quan ve GraphQL Auto-Generation](#1-tong-quan-ve-graphql-auto-generation)
2. [Danh sach cac Operations duoc Auto-Generate](#2-danh-sach-cac-operations-duoc-auto-generate)
3. [Cac phuong phap Disable Operations](#3-cac-phuong-phap-disable-operations)
4. [Phan tich Uu/Nhuoc diem](#4-phan-tich-uunhuoc-diem)
5. [Best Practices va Recommendations](#5-best-practices-va-recommendations)
6. [Files Reference](#6-files-reference)

---

## 1. Tong quan ve GraphQL Auto-Generation

### 1.1 Co che hoat dong

Twenty CRM su dung metadata-driven architecture de tu dong generate GraphQL schema va resolvers cho moi `WorkspaceEntity`. Qua trinh nay dien ra theo cac buoc:

```
┌─────────────────────────────────────────────────────────────────┐
│                    WorkspaceEntity                              │
│  @WorkspaceEntity({ standardId, namePlural, ... })              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              WorkspaceGraphQLSchemaFactory                       │
│  - Generate type definitions                                     │
│  - Generate Query types (QueryTypeFactory)                       │
│  - Generate Mutation types (MutationTypeFactory)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               WorkspaceResolverFactory                           │
│  - Create resolver functions for each operation                  │
│  - Map to resolver factory classes                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              GraphQL Executable Schema                           │
│  - Combined schema with resolvers                                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Files quan trong trong qua trinh generation

| File | Muc dich |
|------|----------|
| `workspace-schema.factory.ts` | Diem vao chinh, ket hop schema va resolvers |
| `workspace-graphql-schema.factory.ts` | Generate GraphQL schema tu metadata |
| `workspace-resolver.factory.ts` | Generate resolvers cho moi entity |
| `workspace-resolver-builder.service.ts` | Quyet dinh co build resolver cho method hay khong |
| `factories/factories.ts` | Dinh nghia danh sach method names |

### 1.3 Flow thuc thi khi goi GraphQL operation

```
GraphQL Request
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│             GraphqlQueryBaseResolverService.execute()            │
│  1. Validate args                                                │
│  2. Execute Pre-Query Hooks ← [Co the throw exception o day]    │
│  3. Build computed args                                          │
│  4. Execute database query                                       │
│  5. Execute Post-Query Hooks                                     │
│  6. Return result                                                │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
GraphQL Response
```

---

## 2. Danh sach cac Operations duoc Auto-Generate

Twenty CRM tu dong generate **13 operations** cho moi WorkspaceEntity:

### 2.1 Query Operations (3)

| Operation | Resolver Factory | Mo ta |
|-----------|------------------|-------|
| `findMany` | `FindManyResolverFactory` | Lay nhieu records voi filter, pagination |
| `findOne` | `FindOneResolverFactory` | Lay mot record theo filter |
| `findDuplicates` | `FindDuplicatesResolverFactory` | Tim records trung lap (chi build khi co `duplicateCriteria`) |

### 2.2 Mutation Operations (10)

| Operation | Resolver Factory | Mo ta |
|-----------|------------------|-------|
| `createOne` | `CreateOneResolverFactory` | Tao mot record moi |
| `createMany` | `CreateManyResolverFactory` | Tao nhieu records |
| `updateOne` | `UpdateOneResolverFactory` | Cap nhat mot record |
| `updateMany` | `UpdateManyResolverFactory` | Cap nhat nhieu records |
| `deleteOne` | `DeleteOneResolverFactory` | Soft delete mot record |
| `deleteMany` | `DeleteManyResolverFactory` | Soft delete nhieu records |
| `destroyOne` | `DestroyOneResolverFactory` | Hard delete mot record |
| `destroyMany` | `DestroyManyResolverFactory` | Hard delete nhieu records |
| `restoreOne` | `RestoreOneResolverFactory` | Khoi phuc mot record da soft delete |
| `restoreMany` | `RestoreManyResolverFactory` | Khoi phuc nhieu records |

### 2.3 Ten GraphQL operation duoc generate

Voi moi entity (vd: `mktOrder`), cac operations se co ten:

```graphql
# Queries
query {
  mktOrders(filter: {...}, orderBy: {...}, first: 10) { ... }
  mktOrder(filter: {...}) { ... }
  mktOrderDuplicates(ids: [...]) { ... }
}

# Mutations
mutation {
  createMktOrder(data: {...}) { ... }
  createMktOrders(data: [...]) { ... }
  updateMktOrder(id: "...", data: {...}) { ... }
  updateMktOrders(filter: {...}, data: {...}) { ... }
  deleteMktOrder(id: "...") { ... }
  deleteMktOrders(filter: {...}) { ... }
  destroyMktOrder(id: "...") { ... }
  destroyMktOrders(filter: {...}) { ... }
  restoreMktOrder(id: "...") { ... }
  restoreMktOrders(filter: {...}) { ... }
}
```

---

## 3. Cac phuong phap Disable Operations

### 3.1 Phuong phap 1: Su dung Pre-Query Hooks (RECOMMENDED)

Day la phuong phap **duoc khuyen nghi nhat** va phu hop voi kien truc cua Twenty CRM.

#### 3.1.1 Co che

Pre-Query Hooks duoc thuc thi **truoc khi** database query chay. Neu hook throw exception, operation se bi huy bo ngay lap tuc.

#### 3.1.2 Implementation

```typescript
// File: src/mkt-core/my-entity/hooks/my-entity-create-one-disabled.pre-query.hook.ts

import { Injectable } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import {
  PermissionsException,
  PermissionsExceptionCode,
  PermissionsExceptionMessage,
} from 'src/engine/metadata-modules/permissions/permissions.exception';

@Injectable()
@WorkspaceQueryHook('myEntity.createOne')
export class MyEntityCreateOneDisabledPreQueryHook
  implements WorkspacePreQueryHookInstance
{
  async execute(authContext: AuthContext): Promise<never> {
    throw new PermissionsException(
      PermissionsExceptionMessage.PERMISSION_DENIED,
      PermissionsExceptionCode.PERMISSION_DENIED,
    );
  }
}
```

#### 3.1.3 Dang ky hook trong Module

```typescript
// File: src/mkt-core/my-entity/my-entity.module.ts

import { Module } from '@nestjs/common';

import { MyEntityCreateOneDisabledPreQueryHook } from './hooks/my-entity-create-one-disabled.pre-query.hook';

@Module({
  providers: [
    MyEntityCreateOneDisabledPreQueryHook,
    // ... other providers
  ],
})
export class MyEntityModule {}
```

#### 3.1.4 Vi du thuc te tu codebase (WorkspaceMember)

```typescript
// File: packages/twenty-server/src/modules/workspace-member/query-hooks/workspace-member-create-one.pre-query.hook.ts

@WorkspaceQueryHook(`workspaceMember.createOne`)
export class WorkspaceMemberCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  async execute(authContext: AuthContext): Promise<CreateOneResolverArgs> {
    const workspace = authContext.workspace;
    workspaceValidator.assertIsDefinedOrThrow(workspace);

    throw new PermissionsException(
      PermissionsExceptionMessage.PERMISSION_DENIED,
      PermissionsExceptionCode.PERMISSION_DENIED,
    );
  }
}
```

#### 3.1.5 Disable nhieu operations cung luc

```typescript
// Disable tat ca write operations cho mot entity
const DISABLED_OPERATIONS = [
  'createOne',
  'createMany',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'destroyOne',
  'destroyMany',
] as const;

// Tao hook rieng cho moi operation
@Injectable()
@WorkspaceQueryHook('myReadOnlyEntity.createOne')
export class MyReadOnlyEntityCreateOneDisabledHook implements WorkspacePreQueryHookInstance {
  async execute(): Promise<never> {
    throw new PermissionsException(
      'This entity is read-only',
      PermissionsExceptionCode.METHOD_NOT_ALLOWED,
    );
  }
}

// Tuong tu cho cac operations khac...
```

### 3.2 Phuong phap 2: Conditional disable voi authContext

Disable operation dua tren dieu kien (role, permissions, etc.)

```typescript
@Injectable()
@WorkspaceQueryHook('sensitiveEntity.deleteOne')
export class SensitiveEntityDeleteOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly permissionsService: PermissionsService,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: DeleteOneResolverArgs,
  ): Promise<DeleteOneResolverArgs> {
    const workspace = authContext.workspace;
    workspaceValidator.assertIsDefinedOrThrow(workspace);

    // Chi cho phep admin thuc hien
    const isAdmin = await this.permissionsService.isAdmin(
      authContext.userWorkspaceId,
      workspace.id,
    );

    if (!isAdmin) {
      throw new PermissionsException(
        'Only admins can delete this entity',
        PermissionsExceptionCode.PERMISSION_DENIED,
      );
    }

    return payload;
  }
}
```

### 3.3 Phuong phap 3: Su dung @WorkspaceGate decorator (Entity-level)

Disable **toan bo entity** khoi Workspace API (khong chi rieng operations).

#### 3.3.1 Co che

`@WorkspaceGate` gan entity voi mot feature flag. Neu flag bi disable, entity se bi exclude khoi GraphQL API.

#### 3.3.2 Implementation

```typescript
// File: src/mkt-core/experimental-entity/experimental-entity.workspace-entity.ts

import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceGate } from 'src/engine/twenty-orm/decorators/workspace-gate.decorator';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.experimentalEntity,
  namePlural: 'experimentalEntities',
  labelSingular: { message: 'Experimental Entity' },
  labelPlural: { message: 'Experimental Entities' },
  icon: 'IconFlask',
})
@WorkspaceGate({
  featureFlag: 'IS_EXPERIMENTAL_ENTITY_ENABLED',
  excludeFromWorkspaceApi: true, // Mac dinh la true
  excludeFromDatabase: false, // Van tao table trong DB
})
export class ExperimentalEntityWorkspaceEntity extends BaseWorkspaceEntity {
  // ... fields
}
```

#### 3.3.3 Luu y

- `excludeFromWorkspaceApi: true` - Entity se bi an khoi GraphQL API khi feature flag = false
- `excludeFromDatabase: false` - Van tao schema trong database
- Khong the disable tung operations rieng le, chi disable ca entity

### 3.4 Phuong phap 4: Override shouldBuildResolver (Advanced)

Sua doi `WorkspaceResolverBuilderService` de skip viec build resolver cho specific operations.

#### 3.4.1 File goc

```typescript
// File: packages/twenty-server/src/engine/api/graphql/workspace-resolver-builder/workspace-resolver-builder.service.ts

@Injectable()
export class WorkspaceResolverBuilderService {
  shouldBuildResolver(
    objectMetadata: Pick<ObjectMetadataEntity, 'duplicateCriteria'>,
    methodName: WorkspaceResolverBuilderMethodNames,
  ) {
    switch (methodName) {
      case FindDuplicatesResolverFactory.methodName:
        return isDefined(objectMetadata.duplicateCriteria);
      default:
        return true;
    }
  }
}
```

#### 3.4.2 Extended implementation

```typescript
// File: src/mkt-core/services/custom-resolver-builder.service.ts

import { Injectable } from '@nestjs/common';

import { WorkspaceResolverBuilderMethodNames } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';

// Dinh nghia operations bi disable cho moi entity
const DISABLED_OPERATIONS_MAP: Record<string, WorkspaceResolverBuilderMethodNames[]> = {
  mktReadOnlyEntity: ['createOne', 'createMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'],
  mktAuditLog: ['updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'destroyOne', 'destroyMany'],
};

@Injectable()
export class CustomWorkspaceResolverBuilderService {
  shouldBuildResolver(
    objectMetadata: Pick<ObjectMetadataEntity, 'nameSingular' | 'duplicateCriteria'>,
    methodName: WorkspaceResolverBuilderMethodNames,
  ): boolean {
    // Check duplicate criteria
    if (methodName === 'findDuplicates') {
      return isDefined(objectMetadata.duplicateCriteria);
    }

    // Check disabled operations
    const disabledOps = DISABLED_OPERATIONS_MAP[objectMetadata.nameSingular];
    if (disabledOps?.includes(methodName)) {
      return false;
    }

    return true;
  }
}
```

**Luu y**: Phuong phap nay can override module configuration va co the anh huong den uprade sau nay.

### 3.5 Phuong phap 5: Tao Custom Exception Types

Su dung exception types phu hop voi ngu canh:

```typescript
// File: src/mkt-core/exceptions/operation-disabled.exception.ts

import { CustomException } from 'src/utils/custom-exception';

export class OperationDisabledException extends CustomException {
  constructor(
    entityName: string,
    operationName: string,
    reason?: string,
  ) {
    const message = reason
      ? `Operation '${operationName}' is disabled for '${entityName}': ${reason}`
      : `Operation '${operationName}' is disabled for '${entityName}'`;

    super(message, 'OPERATION_DISABLED');
  }
}

// Su dung trong hook
@WorkspaceQueryHook('mktOrder.destroyOne')
export class MktOrderDestroyOneDisabledHook implements WorkspacePreQueryHookInstance {
  async execute(): Promise<never> {
    throw new OperationDisabledException(
      'mktOrder',
      'destroyOne',
      'Orders can only be soft deleted for audit purposes',
    );
  }
}
```

---

## 4. Phan tich Uu/Nhuoc diem

### 4.1 So sanh tong quan

| Phuong phap | Do kho | Flexibility | Maintenance | Runtime/Build |
|-------------|--------|-------------|-------------|---------------|
| Pre-Query Hooks | Thap | Cao | Thap | Runtime |
| @WorkspaceGate | Thap | Thap | Thap | Build |
| Override shouldBuildResolver | Trung binh | Trung binh | Cao | Build |
| Custom Exception Types | Thap | Cao | Thap | Runtime |

### 4.2 Chi tiet tung phuong phap

#### Pre-Query Hooks

| Uu diem | Nhuoc diem |
|---------|------------|
| Khong can sua core engine | Operation van hien thi trong schema |
| Co the disable co dieu kien | Can tao file rieng cho moi operation |
| Ton tai san trong codebase | Nho them dang ky trong module |
| De test va debug | Slight runtime overhead |
| Thong bao loi ro rang | |

#### @WorkspaceGate

| Uu diem | Nhuoc diem |
|---------|------------|
| Cau hinh don gian | Chi disable ca entity |
| An entity khoi API hoan toan | Phu thuoc feature flag system |
| Khong runtime overhead | Khong phu hop cho partial disable |

#### Override shouldBuildResolver

| Uu diem | Nhuoc diem |
|---------|------------|
| Khong tao resolver lam gi | Can override core service |
| Khong hien thi trong schema | Kho bao tri khi upgrade |
| Hieu qua nhat ve performance | Can hieu sau ve engine |

---

## 5. Best Practices va Recommendations

### 5.1 Recommendation tong hop

1. **Mac dinh su dung Pre-Query Hooks** cho hau het cac truong hop
2. Su dung `@WorkspaceGate` khi can an toan bo entity khoi API
3. Tranh override core engine tru khi bat buoc

### 5.2 Naming convention cho Hook files

```
{entity-name}-{operation}-disabled.pre-query.hook.ts

Vi du:
- mkt-order-destroy-one-disabled.pre-query.hook.ts
- mkt-invoice-create-many-disabled.pre-query.hook.ts
```

### 5.3 Folder structure

```
src/mkt-core/
└── my-entity/
    ├── hooks/
    │   ├── my-entity-create-one-disabled.pre-query.hook.ts
    │   ├── my-entity-destroy-one-disabled.pre-query.hook.ts
    │   └── index.ts
    ├── my-entity.module.ts
    └── my-entity.workspace-entity.ts
```

### 5.4 Helper function de tao disabled hooks

```typescript
// File: src/mkt-core/utils/disabled-operation-hook.factory.ts

import { Injectable } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import {
  PermissionsException,
  PermissionsExceptionCode,
} from 'src/engine/metadata-modules/permissions/permissions.exception';

export function createDisabledOperationHook(
  entityName: string,
  reason: string = 'This operation is disabled',
): new () => WorkspacePreQueryHookInstance {
  @Injectable()
  class DisabledOperationHook implements WorkspacePreQueryHookInstance {
    async execute(): Promise<never> {
      throw new PermissionsException(
        `[${entityName}] ${reason}`,
        PermissionsExceptionCode.METHOD_NOT_ALLOWED,
      );
    }
  }

  return DisabledOperationHook;
}

// Su dung
import { WorkspaceQueryHook } from '...';

@WorkspaceQueryHook('myEntity.destroyOne')
export class MyEntityDestroyOneDisabledHook extends createDisabledOperationHook(
  'myEntity',
  'Hard delete is not allowed. Use soft delete instead.',
) {}
```

### 5.5 Cac scenarios pho bien

| Scenario | Giai phap |
|----------|-----------|
| Entity chi doc (read-only) | Disable tat ca mutations bang hooks |
| Cam hard delete | Disable `destroyOne`, `destroyMany` |
| Cam bulk operations | Disable `createMany`, `updateMany`, `deleteMany` |
| Cam public API access | Su dung `@WorkspaceGate` voi feature flag |
| Gioi han theo role | Conditional check trong hook |

### 5.6 Testing hooks

```typescript
// File: src/mkt-core/my-entity/hooks/__tests__/my-entity-disabled.hook.spec.ts

import { Test, TestingModule } from '@nestjs/testing';

import { MyEntityDestroyOneDisabledHook } from '../my-entity-destroy-one-disabled.pre-query.hook';
import { PermissionsException } from 'src/engine/metadata-modules/permissions/permissions.exception';

describe('MyEntityDestroyOneDisabledHook', () => {
  let hook: MyEntityDestroyOneDisabledHook;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyEntityDestroyOneDisabledHook],
    }).compile();

    hook = module.get<MyEntityDestroyOneDisabledHook>(MyEntityDestroyOneDisabledHook);
  });

  it('should throw PermissionsException', async () => {
    const mockAuthContext = { workspace: { id: 'test-workspace' } } as AuthContext;

    await expect(hook.execute(mockAuthContext, 'myEntity', { id: 'test-id' }))
      .rejects
      .toThrow(PermissionsException);
  });
});
```

---

## 6. Files Reference

### 6.1 Core Engine Files

| Path | Mo ta |
|------|-------|
| `packages/twenty-server/src/engine/api/graphql/workspace-schema.factory.ts` | Main schema factory |
| `packages/twenty-server/src/engine/api/graphql/workspace-schema-builder/workspace-graphql-schema.factory.ts` | GraphQL schema generation |
| `packages/twenty-server/src/engine/api/graphql/workspace-resolver-builder/workspace-resolver.factory.ts` | Resolver generation |
| `packages/twenty-server/src/engine/api/graphql/workspace-resolver-builder/workspace-resolver-builder.service.ts` | Dieu kien build resolver |
| `packages/twenty-server/src/engine/api/graphql/workspace-resolver-builder/factories/factories.ts` | Danh sach method names |
| `packages/twenty-server/src/engine/api/graphql/workspace-resolver-builder/constants/resolver-method-names.ts` | Resolver method constants |

### 6.2 Hook System Files

| Path | Mo ta |
|------|-------|
| `packages/twenty-server/src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator.ts` | Hook decorator |
| `packages/twenty-server/src/engine/api/graphql/workspace-query-runner/workspace-query-hook/workspace-query-hook.service.ts` | Hook execution service |
| `packages/twenty-server/src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface.ts` | Hook interfaces |
| `packages/twenty-server/src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type.ts` | Hook types |

### 6.3 Gate System Files

| Path | Mo ta |
|------|-------|
| `packages/twenty-server/src/engine/twenty-orm/decorators/workspace-gate.decorator.ts` | Gate decorator |
| `packages/twenty-server/src/engine/twenty-orm/interfaces/gate.interface.ts` | Gate interface |
| `packages/twenty-server/src/engine/workspace-manager/workspace-sync-metadata/utils/should-exclude-from-workspace-api.util.ts` | Exclusion logic |
| `packages/twenty-server/src/engine/workspace-manager/workspace-sync-metadata/utils/is-gate-and-not-enabled.util.ts` | Gate check utility |

### 6.4 Resolver Implementation Files

| Path | Mo ta |
|------|-------|
| `packages/twenty-server/src/engine/api/graphql/graphql-query-runner/interfaces/base-resolver-service.ts` | Base resolver service |
| `packages/twenty-server/src/engine/api/graphql/graphql-query-runner/resolvers/graphql-query-create-one-resolver.service.ts` | CreateOne resolver |
| `packages/twenty-server/src/engine/api/graphql/graphql-query-runner/errors/graphql-query-runner.exception.ts` | Query runner exceptions |

### 6.5 Vi du Hook tu Codebase

| Path | Mo ta |
|------|-------|
| `packages/twenty-server/src/modules/workspace-member/query-hooks/workspace-member-create-one.pre-query.hook.ts` | Disable createOne example |
| `packages/twenty-server/src/modules/workflow/common/query-hooks/workflow-destroy-one.pre-query.hook.ts` | Pre-processing hook |
| `packages/twenty-server/src/engine/core-modules/actor/query-hooks/created-by.create-one.pre-query-hook.ts` | Wildcard hook (`*.createOne`) |

### 6.6 Exception Files

| Path | Mo ta |
|------|-------|
| `packages/twenty-server/src/engine/metadata-modules/permissions/permissions.exception.ts` | Permission exceptions |
| `packages/twenty-server/src/engine/api/graphql/graphql-query-runner/errors/graphql-query-runner.exception.ts` | Query runner exceptions |

---

## Tham khao them

- [WorkspaceQueryHook Decorator Documentation](../../engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator.md)
- [Twenty CRM Official Documentation](https://twenty.com/docs)

---

*Document created: 2026-01-16*
*Last updated: 2026-01-16*
