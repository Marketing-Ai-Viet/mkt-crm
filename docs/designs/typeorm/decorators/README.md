# Twenty ORM Decorators - Tổng quan

Tài liệu này mô tả tất cả các decorators được sử dụng trong Twenty ORM để định nghĩa workspace entities, fields, relations và các metadata khác.

## Danh sách Decorators

### Class-Level Decorators (Áp dụng cho Entity Class)

1. **[WorkspaceEntity](./workspace-entity.md)** - Định nghĩa một workspace entity
2. **[WorkspaceCustomEntity](./workspace-custom-entity.md)** - Đánh dấu entity là custom entity có thể mở rộng
3. **[WorkspaceIsSystem](./workspace-is-system.md)** - Đánh dấu entity/field là system entity
4. **[WorkspaceIsNotAuditLogged](./workspace-is-not-audit-logged.md)** - Vô hiệu hóa audit logging
5. **[WorkspaceIsSearchable](./workspace-is-searchable.md)** - Kích hoạt full-text search
6. **[WorkspaceIndex](./workspace-index.md)** - Tạo composite index trên nhiều cột
7. **[WorkspaceDuplicateCriteria](./workspace-duplicate-criteria.md)** - Định nghĩa tiêu chí phát hiện duplicate
8. **[WorkspaceGate](./workspace-gate.md)** - Feature flag gating cho entity/field

### Field-Level Decorators (Áp dụng cho Field/Property)

9. **[WorkspaceField](./workspace-field.md)** - Định nghĩa một field trong entity
10. **[WorkspaceRelation](./workspace-relation.md)** - Định nghĩa relation giữa entities
11. **[WorkspaceDynamicRelation](./workspace-dynamic-relation.md)** - Định nghĩa dynamic relation
12. **[WorkspaceJoinColumn](./workspace-join-column.md)** - Chỉ định join column cho relation
13. **[WorkspaceFieldIndex](./workspace-field-index.md)** - Tạo index trên một cột đơn
14. **[WorkspaceIsNullable](./workspace-is-nullable.md)** - Cho phép field có giá trị NULL
15. **[WorkspaceIsPrimaryField](./workspace-is-primary-field.md)** - Đánh dấu field là primary field
16. **[WorkspaceIsUnique](./workspace-is-unique.md)** - Tạo unique constraint trên field
17. **[WorkspaceIsDeprecated](./workspace-is-deprecated.md)** - Đánh dấu field là deprecated

## Phân loại theo chức năng

### Entity Definition
- `@WorkspaceEntity()` - Bắt buộc cho mọi entity
- `@WorkspaceCustomEntity()` - Cho custom entities có thể mở rộng

### Field Definition
- `@WorkspaceField()` - Định nghĩa field thông thường
- `@WorkspaceRelation()` - Định nghĩa relation field
- `@WorkspaceDynamicRelation()` - Định nghĩa dynamic relation field

### Field Constraints
- `@WorkspaceIsNullable()` - Cho phép NULL
- `@WorkspaceIsUnique()` - Unique constraint
- `@WorkspaceIsPrimaryField()` - Primary field identifier

### Indexing
- `@WorkspaceIndex()` - Composite index (class-level)
- `@WorkspaceFieldIndex()` - Single column index (field-level)
- `@WorkspaceJoinColumn()` - Join column với auto-index

### System Metadata
- `@WorkspaceIsSystem()` - System entity/field
- `@WorkspaceIsNotAuditLogged()` - Tắt audit logging
- `@WorkspaceIsDeprecated()` - Deprecated field
- `@WorkspaceIsSearchable()` - Kích hoạt search

### Feature Management
- `@WorkspaceGate()` - Feature flag gating
- `@WorkspaceDuplicateCriteria()` - Duplicate detection

## Workflow sử dụng cơ bản

### 1. Tạo Entity đơn giản

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.myEntity,
  namePlural: 'myEntities',
  labelSingular: msg`My Entity`,
  labelPlural: msg`My Entities`,
  description: msg`Description`,
  icon: 'IconBox',
})
export class MyEntityWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
  })
  name: string;
}
```

### 2. Tạo Entity với Relations

```typescript
@WorkspaceEntity({...})
export class ParentEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({
    standardId: FIELD_IDS.children,
    type: RelationType.ONE_TO_MANY,
    label: msg`Children`,
    inverseSideTarget: () => ChildEntity,
  })
  children: Relation<ChildEntity[]>;
}
```

### 3. Tạo Entity với Index và Constraints

```typescript
@WorkspaceEntity({...})
@WorkspaceIndex(['userId', 'email'], {
  isUnique: true,
  indexWhereClause: '"deletedAt" IS NULL',
})
export class UserEntity extends BaseWorkspaceEntity {
  @WorkspaceField({...})
  @WorkspaceIsUnique()
  email: string;

  @WorkspaceField({...})
  @WorkspaceIsNullable()
  phone: string | null;
}
```

## Thứ tự áp dụng Decorators

Khi sử dụng nhiều decorators, áp dụng theo thứ tự sau:

### Class-level
```typescript
@WorkspaceEntity({...})          // 1. Entity definition (bắt buộc)
@WorkspaceIsSystem()             // 2. System flags
@WorkspaceIsSearchable()         // 3. Features
@WorkspaceGate({...})            // 4. Feature gates
@WorkspaceIndex([...], {...})    // 5. Indexes
@WorkspaceDuplicateCriteria([...]) // 6. Business logic
export class MyEntity extends BaseWorkspaceEntity {...}
```

### Field-level
```typescript
@WorkspaceField({...})           // 1. Field definition (bắt buộc)
// hoặc
@WorkspaceRelation({...})        // 1. Relation definition (alternative)
@WorkspaceIsNullable()           // 2. Nullable flag
@WorkspaceIsSystem()             // 3. System flag
@WorkspaceIsPrimaryField()       // 4. Primary flag
@WorkspaceGate({...})            // 5. Feature gate
@WorkspaceFieldIndex()           // 6. Index
@WorkspaceIsUnique()             // 7. Unique constraint
@WorkspaceIsDeprecated()         // 8. Deprecation
propertyName: type;
```

## Best Practices

### 1. Luôn sử dụng standardId
Mọi entity và field phải có `standardId` duy nhất:
```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.myEntity, // Bắt buộc!
  ...
})
```

### 2. Sử dụng msg`` cho i18n
Sử dụng `msg` macro từ Lingui cho tất cả labels và descriptions:
```typescript
label: msg`My Label`  // ✅ Đúng
label: 'My Label'     // ❌ Sai
```

### 3. Kết hợp @WorkspaceIsNullable với TypeScript nullable types
```typescript
@WorkspaceField({...})
@WorkspaceIsNullable()
field: string | null;  // ✅ Phản ánh đúng type
```

### 4. Sử dụng @WorkspaceIsSystem cho internal fields
```typescript
@WorkspaceField({...})
@WorkspaceIsSystem()
internalField: string;  // Không hiển thị trong UI
```

### 5. Index các foreign keys
```typescript
@WorkspaceField({...})
@WorkspaceJoinColumn('parent')  // Tự động tạo index
parentId: string;
```

## Metadata Storage

Tất cả decorators lưu metadata vào `metadataArgsStorage`:
- Entity metadata
- Field metadata
- Relation metadata
- Index metadata
- Join column metadata

Metadata này được sync với database thông qua workspace sync process.

## TypedReflect

Nhiều decorators sử dụng `TypedReflect` để:
- Lưu metadata vào class/property
- Đọc metadata từ class/property khác
- Kế thừa metadata từ parent decorators

## Migration Flow

```
1. Apply decorators → 2. Metadata stored → 3. Sync process reads
                                              ↓
4. Create migrations ← Database updated ← 5. Migrations executed
```

## Tài liệu chi tiết

Xem tài liệu chi tiết cho từng decorator trong thư mục này:
- [workspace-entity.md](./workspace-entity.md)
- [workspace-field.md](./workspace-field.md)
- [workspace-relation.md](./workspace-relation.md)
- ... (và các file khác)

## Troubleshooting

### Issue: Metadata không được sync
```bash
npx nx run twenty-server:command workspace:sync-metadata -f
```

### Issue: Migration không được tạo
Kiểm tra:
1. Entity có extends `BaseWorkspaceEntity` không?
2. Có `@WorkspaceEntity()` decorator không?
3. Có chạy sync metadata chưa?

### Issue: Type errors
Đảm bảo TypeScript types khớp với metadata:
```typescript
@WorkspaceIsNullable()
field: string | null;  // Phải có '| null'
```

## Version Support

- Twenty v0.30+: Tất cả decorators
- Twenty v0.20-0.29: Không hỗ trợ WorkspaceDynamicRelation
- Twenty v0.10-0.19: API khác, xem legacy docs

## Contributing

Khi thêm decorator mới:
1. Tạo file decorator trong `/decorators`
2. Export từ `index.ts`
3. Thêm metadata handler vào storage
4. Viết unit tests
5. Cập nhật documentation này
6. Thêm ví dụ usage

## See Also

- [TypeORM Documentation](../typeorm.md)
- [Workspace Sync Metadata](../../workspace-sync-metadata.md)
- [Standard Object IDs](../../standard-object-ids.md)
- [Field Metadata Types](../../field-metadata-types.md)
