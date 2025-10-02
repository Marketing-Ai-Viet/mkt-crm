# WorkspaceIsNullable Decorator

## Tổng quan

`@WorkspaceIsNullable()` đánh dấu một field có thể có giá trị `NULL` trong database. Đây là property decorator được áp dụng cho các fields.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-is-nullable.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceIsNullable()
```

## Ví dụ

### Ví dụ 1: Nullable text field

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.phone,
  type: FieldMetadataType.PHONE,
  label: msg`Phone`,
})
@WorkspaceIsNullable()
phone: string | null;
```

### Ví dụ 2: Nullable relation

```typescript
@WorkspaceRelation({
  standardId: FIELD_IDS.company,
  type: RelationType.MANY_TO_ONE,
  label: msg`Company`,
  inverseSideTarget: () => CompanyWorkspaceEntity,
  inverseSideFieldKey: 'people',
  onDelete: RelationOnDeleteAction.SET_NULL,
})
@WorkspaceIsNullable()
company: Relation<CompanyWorkspaceEntity> | null;
```

### Ví dụ 3: Nullable với default null

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.description,
  type: FieldMetadataType.TEXT,
  label: msg`Description`,
  defaultValue: null,
})
@WorkspaceIsNullable()
description: string | null;
```

## Best Practices

### 1. TypeScript type phải match

```typescript
// ✅ Đúng
@WorkspaceIsNullable()
field: string | null;

// ❌ Sai - thiếu | null
@WorkspaceIsNullable()
field: string;
```

### 2. Required với SET_NULL onDelete

```typescript
// ✅ Đúng
@WorkspaceRelation({
  onDelete: RelationOnDeleteAction.SET_NULL,
})
@WorkspaceIsNullable()
relation: Relation<Entity> | null;

// ❌ Sai - SET_NULL cần nullable
@WorkspaceRelation({
  onDelete: RelationOnDeleteAction.SET_NULL,
})
relation: Relation<Entity>;
```

### 3. Không dùng cho required fields

```typescript
// ✅ Đúng - required field
@WorkspaceField({
  type: FieldMetadataType.TEXT,
  label: msg`Name`,
})
name: string;  // Không có @WorkspaceIsNullable

// ❌ Không tốt - name nên required
@WorkspaceField({
  type: FieldMetadataType.TEXT,
  label: msg`Name`,
})
@WorkspaceIsNullable()
name: string | null;
```

## Khi nào sử dụng

### Nên dùng:
- ✅ Optional fields (email, phone)
- ✅ Relations với SET_NULL onDelete
- ✅ Fields có thể empty hợp lý
- ✅ Foreign keys có thể null

### Không nên dùng:
- ❌ Primary keys
- ❌ Required business fields (name, title)
- ❌ System fields (id, createdAt)
- ❌ Fields có defaultValue hợp lý

## Mặc định

Nếu không có `@WorkspaceIsNullable()`:
- Field là `NOT NULL` trong database
- Phải có giá trị khi INSERT
- TypeScript type không có `| null`

## Database Mapping

```typescript
// Với @WorkspaceIsNullable
@WorkspaceIsNullable()
field: string | null;
// → Database: column_name VARCHAR NULL

// Không có @WorkspaceIsNullable
field: string;
// → Database: column_name VARCHAR NOT NULL
```

## See Also

- [WorkspaceField Decorator](./workspace-field.md)
- [WorkspaceRelation Decorator](./workspace-relation.md)
