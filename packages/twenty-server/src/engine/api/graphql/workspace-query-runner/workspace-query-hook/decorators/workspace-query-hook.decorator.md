# WorkspaceQueryHook Decorator

## Tổng quan

`@WorkspaceQueryHook` là một custom decorator trong NestJS dùng để đăng ký các hook classes sẽ được thực thi trước (pre-hook) hoặc sau (post-hook) khi một GraphQL query/mutation được thực hiện trên một workspace entity.

## Vị trí file

```
packages/twenty-server/src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator.ts
```

## Cấu trúc

### Types

```typescript
// Key format: `{objectName}.{methodName}`
type WorkspaceQueryHookKey = `${string}.${WorkspaceResolverBuilderMethodNames}`;

// Options interface
interface WorkspaceQueryHookOptions {
  key: WorkspaceQueryHookKey;    // Required: Key xác định entity và method
  type?: WorkspaceQueryHookType;  // Optional: PRE_HOOK hoặc POST_HOOK (default: PRE_HOOK)
  scope?: Scope;                  // Optional: NestJS scope
}
```

### WorkspaceQueryHookType

```typescript
enum WorkspaceQueryHookType {
  PRE_HOOK = 'PRE_HOOK',   // Chạy TRƯỚC query được thực thi
  POST_HOOK = 'POST_HOOK', // Chạy SAU query được thực thi
}
```

### WorkspaceResolverBuilderMethodNames

Các method names được hỗ trợ:

| Queries | Mutations |
|---------|-----------|
| `findMany` | `createOne` |
| `findOne` | `createMany` |
| `findDuplicates` | `updateOne` |
| | `updateMany` |
| | `deleteOne` |
| | `deleteMany` |
| | `destroyOne` |
| | `destroyMany` |
| | `restoreMany` |

## Cách sử dụng

### Cú pháp 1: Shorthand (chỉ với key)

```typescript
@WorkspaceQueryHook('mktOrder.createOne')
export class MktOrderCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance {
  // ...
}
```

Khi sử dụng shorthand, `type` mặc định là `PRE_HOOK`.

### Cú pháp 2: Full options

```typescript
@WorkspaceQueryHook({
  key: 'mktOrder.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktOrderCreateOnePostQueryHook
  implements WorkspacePostQueryHookInstance {
  // ...
}
```

### Wildcard Support

Hỗ trợ wildcard `*` cho object name để áp dụng hook cho tất cả entities:

```typescript
@WorkspaceQueryHook('*.createOne')
export class GlobalCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance {
  // Hook này sẽ chạy cho TẤT CẢ createOne operations
}
```

## Interfaces cho Hook Classes

### WorkspacePreQueryHookInstance

```typescript
interface WorkspacePreQueryHookInstance {
  execute(
    authContext: AuthContext,
    objectName: string,
    payload: ResolverArgs,
  ): Promise<ResolverArgs>;
}
```

- **Mục đích**: Validate, modify hoặc enrich data TRƯỚC khi query thực thi
- **Return**: Trả về payload đã được modify (sẽ được merge với payload gốc)

### WorkspacePostQueryHookInstance

```typescript
interface WorkspacePostQueryHookInstance {
  execute(
    authContext: AuthContext,
    objectName: string,
    payload: QueryResultFieldValue,
  ): Promise<void>;
}
```

- **Mục đích**: Xử lý side effects SAU khi query hoàn tất (logging, notifications, cascading operations)
- **Return**: void (không modify kết quả)

## Payload Types theo Method

| Method | Pre-Hook Payload Type |
|--------|----------------------|
| `createOne` | `CreateOneResolverArgs<T>` |
| `createMany` | `CreateManyResolverArgs<T>` |
| `updateOne` | `UpdateOneResolverArgs<T>` |
| `updateMany` | `UpdateManyResolverArgs<T>` |
| `deleteOne` | `DeleteOneResolverArgs` |
| `deleteMany` | `DeleteManyResolverArgs<Filter>` |
| `findOne` | `FindOneResolverArgs<Filter>` |
| `findMany` | `FindManyResolverArgs<Filter, OrderBy>` |
| `findDuplicates` | `FindDuplicatesResolverArgs<Data>` |
| `restoreMany` | `RestoreManyResolverArgs<Filter>` |
| `destroyOne` | `DestroyOneResolverArgs` |
| `destroyMany` | `DestroyManyResolverArgs<Filter>` |

## Ví dụ thực tế

### Pre-Hook: Set default values

```typescript
@Injectable()
@WorkspaceQueryHook('mktOrder.createOne')
export class MktOrderCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<MktOrderWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<MktOrderWorkspaceEntity>> {
    return {
      ...payload,
      data: {
        ...payload.data,
        status: ORDER_STATUS.DRAFT,
        accountOwnerId: authContext.workspaceMemberId || null,
      },
    };
  }
}
```

### Post-Hook: Cascading operations

```typescript
@Injectable()
@WorkspaceQueryHook({
  key: 'mktOrder.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktOrderCreateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktOrderWorkspaceEntity[],
  ): Promise<void> {
    const created = payload?.[0];
    if (!created) return;

    // Perform side effects
    await this.createRelatedEntities(created);
    await this.sendNotifications(created);
  }
}
```

### Pre-Hook: Validation

```typescript
@Injectable()
@WorkspaceQueryHook('mktOrganizationLevel.deleteOne')
export class MktOrganizationLevelDeleteOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: DeleteOneResolverArgs,
  ): Promise<DeleteOneResolverArgs> {
    // Check if entity can be deleted
    const hasChildren = await this.checkHasChildren(payload.id);
    if (hasChildren) {
      throw new Error('Cannot delete organization level with children');
    }

    return payload;
  }
}
```

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                      GraphQL Request                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  WorkspaceQueryHookService                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  executePreQueryHooks()                                  │   │
│  │  - Lấy pre-hook instances từ storage                     │   │
│  │  - Thực thi tuần tự từng hook                           │   │
│  │  - Merge payload với kết quả từ mỗi hook                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Database Query                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  WorkspaceQueryHookService                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  executePostQueryHooks()                                 │   │
│  │  - Lấy post-hook instances từ storage                    │   │
│  │  - Transform payload thành ObjectRecord[]                │   │
│  │  - Thực thi tuần tự từng hook                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GraphQL Response                             │
└─────────────────────────────────────────────────────────────────┘
```

## Các thành phần liên quan

| Component | Mục đích |
|-----------|----------|
| `WorkspaceQueryHookExplorer` | Discover và đăng ký tất cả hooks khi module khởi tạo |
| `WorkspaceQueryHookStorage` | Lưu trữ và quản lý hook instances (Map structure) |
| `WorkspaceQueryHookService` | Điều phối việc thực thi hooks |
| `WorkspaceQueryHookMetadataAccessor` | Truy cập metadata từ decorator |
| `WORKSPACE_QUERY_HOOK_METADATA` | Symbol key để lưu metadata |

## Đăng ký Hook trong Module

Hook classes cần được đăng ký trong providers của module:

```typescript
@Module({
  providers: [
    MktOrderCreateOnePreQueryHook,
    MktOrderCreateOnePostQueryHook,
  ],
})
export class MktOrderModule {}
```

## Lưu ý quan trọng

1. **Thứ tự thực thi**: Wildcard hooks (`*.method`) chạy TRƯỚC entity-specific hooks
2. **Request-scoped vs Singleton**: Hooks có thể là request-scoped hoặc singleton tùy theo NestJS DI configuration
3. **Error handling**: Nếu pre-hook throw error, query sẽ không được thực thi
4. **Payload merging**: Pre-hook payloads được deep merge bằng `lodash.merge`
5. **Post-hook payload**: Luôn được transform thành `ObjectRecord[]` trước khi truyền vào hook

## Best Practices

1. Sử dụng `@Injectable()` decorator cùng với `@WorkspaceQueryHook()`
2. Implement đúng interface (`WorkspacePreQueryHookInstance` hoặc `WorkspacePostQueryHookInstance`)
3. Tránh heavy operations trong pre-hooks để không ảnh hưởng response time
4. Sử dụng post-hooks cho async operations không cần block response
5. Luôn handle errors gracefully trong post-hooks để không break main flow
