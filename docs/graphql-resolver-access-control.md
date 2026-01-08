# Kiểm soát truy cập GraphQL Resolvers tự động sinh

## Tổng quan

Twenty CRM tự động sinh 13 GraphQL resolvers (3 queries + 10 mutations) cho mỗi entity. Tài liệu này hướng dẫn các cách để **tắt, hạn chế hoặc bảo vệ** các resolvers này để tránh bị bypass.

---

## Các phương pháp kiểm soát

### 1. Sử dụng `@WorkspaceIsSystem()` decorator

Đánh dấu entity là **system object**, khi đó resolver sẽ yêu cầu **settings permissions** đặc biệt.

**File**: `src/engine/twenty-orm/decorators/workspace-is-system.decorator.ts`

```typescript
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';

@WorkspaceIsSystem()
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktLicense,
  namePlural: 'mktLicenses',
  labelSingular: msg`License`,
  labelPlural: msg`Licenses`,
})
export class MktLicenseWorkspaceEntity extends BaseWorkspaceEntity {
  // ...
}
```

**Hiệu ứng**:
- Khi `isSystem = true`, base resolver service sẽ gọi `validateSettingsPermissionsOnObjectOrThrow()`
- User phải có permissions được định nghĩa trong `OBJECTS_WITH_SETTINGS_PERMISSIONS_REQUIREMENTS`
- Nếu không có permission, throw `PermissionsException`

**Code xử lý** (trong `base-resolver-service.ts`):
```typescript
if (objectMetadataItemWithFieldMaps.isSystem === true) {
  await this.validateSettingsPermissionsOnObjectOrThrow(options);
}
```

---

### 2. Sử dụng `@WorkspaceGate()` decorator

Ẩn **hoàn toàn** entity khỏi GraphQL API khi feature flag chưa được bật.

**File**: `src/engine/twenty-orm/decorators/workspace-gate.decorator.ts`

```typescript
import { WorkspaceGate } from 'src/engine/twenty-orm/decorators/workspace-gate.decorator';

@WorkspaceGate({
  featureFlag: 'IS_MKT_LICENSE_ENABLED',
  excludeFromWorkspaceApi: true,  // Ẩn khỏi GraphQL API
  excludeFromDatabase: false,      // Vẫn giữ table trong database
})
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktLicense,
  namePlural: 'mktLicenses',
  // ...
})
export class MktLicenseWorkspaceEntity extends BaseWorkspaceEntity { }
```

**Các options**:
| Option | Default | Mô tả |
|--------|---------|-------|
| `featureFlag` | Required | Tên feature flag trong `FeatureFlagKey` |
| `excludeFromWorkspaceApi` | `true` | Ẩn khỏi GraphQL schema |
| `excludeFromDatabase` | `true` | Không tạo table trong database |

**Hiệu ứng**:
- Entity **hoàn toàn không xuất hiện** trong GraphQL schema nếu feature flag = false
- Không có query/mutation nào được generate cho entity này
- Được filter bởi `shouldExcludeFromWorkspaceApi()` utility

**Lưu ý**: Chỉ sử dụng **private feature flags** (không phải public flags có thể bị user toggle).

---

### 3. Sử dụng Object Permissions (RBAC)

Cấu hình permissions theo **role** thông qua `ObjectPermissionEntity`.

**Entity**: `src/engine/metadata-modules/object-permission/object-permission.entity.ts`

```typescript
// Cấu trúc ObjectPermissionEntity
{
  id: string;
  roleId: string;                      // Role được áp dụng
  objectMetadataId: string;            // Object metadata của entity
  workspaceId: string;
  
  // Permissions
  canReadObjectRecords?: boolean;      // findMany, findOne, findDuplicates
  canUpdateObjectRecords?: boolean;    // createOne, createMany, updateOne, updateMany
  canSoftDeleteObjectRecords?: boolean; // deleteOne, deleteMany, restoreOne, restoreMany
  canDestroyObjectRecords?: boolean;   // destroyOne, destroyMany
}
```

**Mapping permissions với operations**:

| Permission | Operations bị ảnh hưởng |
|------------|------------------------|
| `canReadObjectRecords` | `findMany`, `findOne`, `findDuplicates` |
| `canUpdateObjectRecords` | `createOne`, `createMany`, `updateOne`, `updateMany` |
| `canSoftDeleteObjectRecords` | `deleteOne`, `deleteMany`, `restoreOne`, `restoreMany` |
| `canDestroyObjectRecords` | `destroyOne`, `destroyMany` |

**Ví dụ: Block tất cả mutations cho một role**:
```sql
INSERT INTO "core"."objectPermission" (
  "roleId", 
  "objectMetadataId", 
  "workspaceId",
  "canReadObjectRecords",
  "canUpdateObjectRecords",
  "canSoftDeleteObjectRecords",
  "canDestroyObjectRecords"
) VALUES (
  'role-uuid',
  'mkt-license-metadata-id',
  'workspace-uuid',
  true,   -- Cho phép đọc
  false,  -- Block create/update
  false,  -- Block soft delete
  false   -- Block destroy
);
```

---

### 4. Tạo Custom Resolver (Recommended cho sensitive entities)

Tạo NestJS resolver riêng và **không khai báo entity trong standard objects**.

**Bước 1**: Không thêm entity vào standard-objects index

```typescript
// packages/twenty-server/src/engine/workspace-manager/workspace-sync-metadata/standard-objects/index.ts

export const standardObjectMetadataDefinitions = [
  PersonWorkspaceEntity,
  CompanyWorkspaceEntity,
  OpportunityWorkspaceEntity,
  // MktLicenseWorkspaceEntity - KHÔNG thêm vào đây
];
```

**Bước 2**: Tạo custom resolver

```typescript
// src/mkt-core/license/resolvers/mkt-license.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';

@Resolver(() => MktLicense)
export class MktLicenseResolver {
  constructor(private readonly mktLicenseService: MktLicenseService) {}

  // Chỉ expose findMany với custom validation
  @Query(() => MktLicenseConnection)
  @UseGuards(JwtAuthGuard)
  async mktLicenses(
    @AuthWorkspace() workspace: Workspace,
    @Args() args: FindManyArgs,
  ): Promise<MktLicenseConnection> {
    // Custom validation logic
    await this.validateAccess(workspace);
    return this.mktLicenseService.findMany(workspace.id, args);
  }

  // Chỉ expose createOne với extra validation
  @Mutation(() => MktLicense)
  @UseGuards(JwtAuthGuard)
  async createMktLicense(
    @AuthWorkspace() workspace: Workspace,
    @Args('data') data: CreateMktLicenseInput,
  ): Promise<MktLicense> {
    // Custom business logic
    return this.mktLicenseService.create(workspace.id, data);
  }

  // KHÔNG expose: createMany, destroyOne, destroyMany, etc.
  
  private async validateAccess(workspace: Workspace): Promise<void> {
    // Custom access control logic
  }
}
```

**Ưu điểm**:
- Full control over exposed operations
- Custom validation logic cho từng operation
- Không cần worry về auto-generated resolvers

---

### 5. Sử dụng Pre-Query Hooks để block operations

Đăng ký hook để **chặn specific operations** ở runtime.

**File**: `src/engine/api/graphql/workspace-query-runner/workspace-query-hook/`

```typescript
// src/mkt-core/license/hooks/mkt-license-block-destroy-many.hook.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { WorkspaceQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';

@Injectable()
@WorkspaceQueryHook({
  key: 'mktLicense.destroyMany',
  type: WorkspaceQueryHookType.PreQuery,
})
export class MktLicenseBlockDestroyManyHook implements WorkspaceQueryHookInstance {
  async execute(
    userId: string,
    workspaceId: string,
    payload: any,
  ): Promise<void> {
    // Block destroyMany hoàn toàn
    throw new ForbiddenException(
      'destroyMany is disabled for MktLicense. Use deleteMany for soft delete instead.',
    );
  }
}

// Block createMany
@Injectable()
@WorkspaceQueryHook({
  key: 'mktLicense.createMany',
  type: WorkspaceQueryHookType.PreQuery,
})
export class MktLicenseBlockCreateManyHook implements WorkspaceQueryHookInstance {
  async execute(
    userId: string,
    workspaceId: string,
    payload: any,
  ): Promise<void> {
    throw new ForbiddenException(
      'Bulk creation is disabled. Please use createMktLicense for individual records.',
    );
  }
}
```

**Đăng ký hooks trong module**:
```typescript
// src/mkt-core/license/mkt-license.module.ts
@Module({
  providers: [
    MktLicenseBlockDestroyManyHook,
    MktLicenseBlockCreateManyHook,
    // ...
  ],
})
export class MktLicenseModule {}
```

**Hook key pattern**: `{objectNameSingular}.{operationName}`

| Operation | Hook Key |
|-----------|----------|
| findMany | `mktLicense.findMany` |
| findOne | `mktLicense.findOne` |
| createOne | `mktLicense.createOne` |
| createMany | `mktLicense.createMany` |
| updateOne | `mktLicense.updateOne` |
| updateMany | `mktLicense.updateMany` |
| deleteOne | `mktLicense.deleteOne` |
| deleteMany | `mktLicense.deleteMany` |
| destroyOne | `mktLicense.destroyOne` |
| destroyMany | `mktLicense.destroyMany` |
| restoreOne | `mktLicense.restoreOne` |
| restoreMany | `mktLicense.restoreMany` |

---

### 6. Thêm vào OBJECTS_WITH_SETTINGS_PERMISSIONS_REQUIREMENTS

Yêu cầu **workspace settings permissions** cho system objects.

**File**: `src/engine/api/graphql/graphql-query-runner/constants/objects-with-settings-permissions-requirements.ts`

```typescript
import { PermissionFlagType } from 'src/engine/metadata-modules/permissions/constants/permission-flag-type.constants';

export const OBJECTS_WITH_SETTINGS_PERMISSIONS_REQUIREMENTS = {
  apiKey: PermissionFlagType.API_KEYS_AND_WEBHOOKS,
  webhook: PermissionFlagType.API_KEYS_AND_WEBHOOKS,
  
  // Thêm entity của bạn
  mktLicense: PermissionFlagType.MANAGE_LICENSES, // Custom permission type
};
```

**Kết hợp với `@WorkspaceIsSystem()`**:
```typescript
@WorkspaceIsSystem()
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktLicense,
  // ...
})
export class MktLicenseWorkspaceEntity { }
```

**Hiệu ứng**: User phải có `MANAGE_LICENSES` permission để access bất kỳ operation nào trên `mktLicense`.

---

## Recommended: Kết hợp nhiều phương pháp

Cho entities nhạy cảm (licenses, payments, invoices), nên kết hợp nhiều layers bảo vệ:

```typescript
// 1. Đánh dấu là system để yêu cầu special permissions
@WorkspaceIsSystem()

// 2. Gate bằng feature flag (optional)
@WorkspaceGate({
  featureFlag: 'IS_MKT_LICENSE_ENABLED',
  excludeFromWorkspaceApi: false, // Vẫn expose API nhưng cần permissions
})

// 3. Định nghĩa entity
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktLicense,
  namePlural: 'mktLicenses',
  labelSingular: msg`License`,
  labelPlural: msg`Licenses`,
})
export class MktLicenseWorkspaceEntity extends BaseWorkspaceEntity {
  // Entity fields...
}
```

```typescript
// 4. Thêm Pre-Query Hooks để block dangerous operations
@Injectable()
@WorkspaceQueryHook({
  key: 'mktLicense.destroyMany',
  type: WorkspaceQueryHookType.PreQuery,
})
export class BlockDestroyManyHook implements WorkspaceQueryHookInstance {
  async execute(): Promise<void> {
    throw new ForbiddenException('destroyMany is permanently disabled for licenses');
  }
}

@Injectable()
@WorkspaceQueryHook({
  key: 'mktLicense.destroyOne',
  type: WorkspaceQueryHookType.PreQuery,
})
export class BlockDestroyOneHook implements WorkspaceQueryHookInstance {
  async execute(): Promise<void> {
    throw new ForbiddenException('Licenses cannot be permanently deleted');
  }
}
```

```typescript
// 5. Cấu hình Object Permissions cho các roles
// Trong database hoặc qua API
await objectPermissionService.upsertObjectPermissions({
  workspaceId: workspace.id,
  input: {
    roleId: guestRoleId,
    objectPermissions: [{
      objectMetadataId: mktLicenseMetadataId,
      canReadObjectRecords: true,
      canUpdateObjectRecords: false,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
    }],
  },
});
```

---

## Tóm tắt các phương pháp

| Phương pháp | Mức độ bảo vệ | Use Case |
|-------------|---------------|----------|
| `@WorkspaceIsSystem()` | Medium | Yêu cầu settings permissions cho system objects |
| `@WorkspaceGate()` | Strong | Ẩn hoàn toàn entity khỏi API dựa trên feature flag |
| Object Permissions | Flexible | RBAC - phân quyền theo role cho từng entity |
| Custom Resolver | Full Control | Cần business logic phức tạp, sensitive entities |
| Pre-Query Hooks | Per-operation | Block specific operations (destroyMany, etc.) |
| Settings Permissions | Strong | Yêu cầu workspace-level permissions |
| Không đăng ký standard-objects | Complete | Quản lý hoàn toàn riêng biệt |

---

## Ví dụ hoàn chỉnh cho MktLicense

```typescript
// src/mkt-core/license/standard-objects/mkt-license.workspace-entity.ts

import { msg } from '@lingui/core/macro';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

// Layer 1: Mark as system object
@WorkspaceIsSystem()

// Layer 2: Define entity
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktLicense,
  namePlural: 'mktLicenses',
  labelSingular: msg`License`,
  labelPlural: msg`Licenses`,
  description: msg`License management`,
  icon: 'IconLicense',
})
export class MktLicenseWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktLicense.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`License name`,
  })
  name: string;

  // ... other fields
}
```

```typescript
// src/mkt-core/license/hooks/mkt-license-security.hooks.ts

import { Injectable, ForbiddenException } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';

// Layer 3: Block dangerous bulk operations
@Injectable()
@WorkspaceQueryHook({
  key: 'mktLicense.destroyMany',
  type: WorkspaceQueryHookType.PreQuery,
})
export class MktLicenseBlockDestroyManyHook {
  async execute(): Promise<void> {
    throw new ForbiddenException('Bulk destroy is disabled for licenses');
  }
}

@Injectable()
@WorkspaceQueryHook({
  key: 'mktLicense.destroyOne',
  type: WorkspaceQueryHookType.PreQuery,
})
export class MktLicenseBlockDestroyOneHook {
  async execute(): Promise<void> {
    throw new ForbiddenException('Licenses cannot be permanently deleted. Use soft delete instead.');
  }
}

@Injectable()
@WorkspaceQueryHook({
  key: 'mktLicense.createMany',
  type: WorkspaceQueryHookType.PreQuery,
})
export class MktLicenseBlockCreateManyHook {
  async execute(): Promise<void> {
    throw new ForbiddenException('Bulk license creation is disabled. Use createMktLicense for individual records.');
  }
}
```

```typescript
// src/mkt-core/license/mkt-license.module.ts

import { Module } from '@nestjs/common';
import { MktLicenseBlockDestroyManyHook } from './hooks/mkt-license-security.hooks';
import { MktLicenseBlockDestroyOneHook } from './hooks/mkt-license-security.hooks';
import { MktLicenseBlockCreateManyHook } from './hooks/mkt-license-security.hooks';

@Module({
  providers: [
    // Layer 3: Register security hooks
    MktLicenseBlockDestroyManyHook,
    MktLicenseBlockDestroyOneHook,
    MktLicenseBlockCreateManyHook,
  ],
  exports: [],
})
export class MktLicenseModule {}
```

Với cấu hình này:
- ✅ `findMany`, `findOne` - Hoạt động (cần system permissions)
- ✅ `createOne` - Hoạt động (cần system permissions)
- ✅ `updateOne`, `updateMany` - Hoạt động (cần system permissions)
- ✅ `deleteOne`, `deleteMany` - Hoạt động (soft delete, cần system permissions)
- ✅ `restoreOne`, `restoreMany` - Hoạt động (cần system permissions)
- ❌ `createMany` - Blocked bởi hook
- ❌ `destroyOne` - Blocked bởi hook
- ❌ `destroyMany` - Blocked bởi hook
