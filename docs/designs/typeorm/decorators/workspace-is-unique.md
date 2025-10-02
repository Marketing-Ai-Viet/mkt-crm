# WorkspaceIsUnique Decorator

## Tổng quan

`@WorkspaceIsUnique()` tạo unique constraint và unique index trên một field. Property decorator tự động tạo index trong database.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-is-unique.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceIsUnique()
```

## Ví dụ

### Ví dụ 1: Unique email

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.email,
  type: FieldMetadataType.EMAIL,
  label: msg`Email`,
})
@WorkspaceIsUnique()
email: string;
```

### Ví dụ 2: Unique identifier

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.slug,
  type: FieldMetadataType.TEXT,
  label: msg`Slug`,
})
@WorkspaceIsUnique()
slug: string;
```

### Ví dụ 3: Unique với nullable

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.externalId,
  type: FieldMetadataType.TEXT,
  label: msg`External ID`,
})
@WorkspaceIsNullable()
@WorkspaceIsUnique()
externalId: string | null;
// Multiple NULLs allowed, but non-NULL values must be unique
```

## Cách hoạt động

### 1. Tự động tạo unique index

```typescript
@WorkspaceIsUnique()
email: string;

// → Tạo index:
// CREATE UNIQUE INDEX "IDX_UNIQUE_<hash>" ON "table" ("email")
```

### 2. Index name generation

```typescript
const indexName = `IDX_UNIQUE_${generateDeterministicIndexName([
  objectMetadataName,
  fieldName,
])}`;
```

## Unique với Nullable

PostgreSQL behavior:
- `NULL` không được coi là duplicate
- Có thể có nhiều rows với `NULL` value
- Non-NULL values phải unique

```typescript
@WorkspaceIsNullable()
@WorkspaceIsUnique()
field: string | null;

// Allowed in database:
// Row 1: field = 'value1'
// Row 2: field = 'value2'
// Row 3: field = NULL
// Row 4: field = NULL  ← OK! Multiple NULLs allowed
// Row 5: field = 'value1'  ← ERROR! Duplicate
```

## Composite Unique Constraints

Để tạo unique constraint trên nhiều columns, dùng `@WorkspaceIndex`:

```typescript
// ❌ Không thể dùng @WorkspaceIsUnique cho composite
@WorkspaceIsUnique()  // Chỉ unique trên userId
@WorkspaceIsUnique()  // Chỉ unique trên email
// userId và email độc lập

// ✅ Dùng @WorkspaceIndex cho composite unique
@WorkspaceEntity({...})
@WorkspaceIndex(['userId', 'email'], {
  isUnique: true,
})
export class MyEntity {
  userId: string;
  email: string;
  // Combination of userId + email phải unique
}
```

## Validation

### Database-level
- Database enforces uniqueness
- Violation → SQL error
- Transaction rollback

### Application-level
```typescript
// Nên check trước khi INSERT
const existing = await repository.findOne({ where: { email } });
if (existing) {
  throw new ConflictException('Email already exists');
}
```

## Performance Impact

### Pros
- ✅ Fast lookups (indexed)
- ✅ Enforced data integrity
- ✅ Prevents duplicates

### Cons
- ❌ Slower INSERT/UPDATE
- ❌ Extra storage for index
- ❌ Index maintenance overhead

## Best Practices

### 1. Use for natural unique identifiers

```typescript
// ✅ Đúng - naturally unique
@WorkspaceIsUnique()
email: string;

@WorkspaceIsUnique()
slug: string;

@WorkspaceIsUnique()
externalId: string;

// ❌ Sai - không cần unique
@WorkspaceIsUnique()
name: string;  // Names có thể trùng!
```

### 2. Consider nullable carefully

```typescript
// ✅ OK - external ID có thể null
@WorkspaceIsNullable()
@WorkspaceIsUnique()
externalId: string | null;

// ⚠️ Cẩn thận - email nullable?
@WorkspaceIsNullable()
@WorkspaceIsUnique()
email: string | null;  // Có nên cho phép NULL?
```

### 3. Use composite index for multi-column uniqueness

```typescript
// ✅ Đúng
@WorkspaceIndex(['workspaceId', 'email'], { isUnique: true })
```

## Error Handling

### Duplicate key violation

```typescript
try {
  await repository.save({ email: 'existing@example.com' });
} catch (error) {
  if (error.code === '23505') {  // PostgreSQL unique violation
    throw new ConflictException('Email already exists');
  }
  throw error;
}
```

## Migration

Decorator tạo migration:

```sql
CREATE UNIQUE INDEX "IDX_UNIQUE_abc123" 
ON "person" ("email");
```

## Troubleshooting

### Existing duplicates prevent index creation

**Lỗi**: Cannot create unique index, duplicate values exist

**Giải pháp**:
1. Find duplicates: `SELECT email, COUNT(*) FROM person GROUP BY email HAVING COUNT(*) > 1`
2. Remove/merge duplicates
3. Rerun migration

### NULL handling confusion

**Vấn đề**: Multiple NULLs allowed but unique constraint fails

**Giải pháp**: Check nullable decorator và business logic

## See Also

- [WorkspaceIndex Decorator](./workspace-index.md)
- [WorkspaceFieldIndex Decorator](./workspace-field-index.md)
- [WorkspaceIsNullable Decorator](./workspace-is-nullable.md)
