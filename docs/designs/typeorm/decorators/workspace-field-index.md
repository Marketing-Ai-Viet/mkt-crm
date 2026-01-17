# WorkspaceFieldIndex Decorator

## Tổng quan

`@WorkspaceFieldIndex()` tạo index trên một field đơn lẻ để tối ưu hiệu suất query. Property decorator giúp tăng tốc độ lookup và search.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-field-index.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceFieldIndex(options?: WorkspaceIndexOptions)
```

## Options

```typescript
interface WorkspaceIndexOptions {
  isUnique?: boolean;          // Tạo unique index (default: false)
  indexWhereClause?: string;   // Partial index condition
  indexType?: IndexType;       // BTREE hoặc GIN (default: BTREE)
}
```

## Ví dụ

### Ví dụ 1: Index cơ bản

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.userId,
  type: FieldMetadataType.UUID,
  label: msg`User ID`,
})
@WorkspaceFieldIndex()
userId: string;
```

### Ví dụ 2: GIN index cho search vector

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.searchVector,
  type: FieldMetadataType.TS_VECTOR,
  label: msg`Search Vector`,
  generatedType: 'STORED',
  asExpression: getTsVectorExpression(),
})
@WorkspaceIsSystem()
@WorkspaceFieldIndex({ indexType: IndexType.GIN })
searchVector: string;
```

### Ví dụ 3: Partial index

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.status,
  type: FieldMetadataType.SELECT,
  label: msg`Status`,
})
@WorkspaceFieldIndex({
  indexWhereClause: '"status" = \'ACTIVE\'',
})
status: string;
// Chỉ index rows có status = 'ACTIVE'
```

### Ví dụ 4: Unique index

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.email,
  type: FieldMetadataType.EMAIL,
  label: msg`Email`,
})
@WorkspaceFieldIndex({ isUnique: true })
email: string;
// Tương đương @WorkspaceIsUnique()
```

## Index Types

### BTREE (Default)

```typescript
@WorkspaceFieldIndex()  // Mặc định BTREE
// hoặc
@WorkspaceFieldIndex({ indexType: IndexType.BTREE })
```

**Phù hợp cho:**
- Equality queries: `WHERE field = value`
- Range queries: `WHERE field > value`
- Sorting: `ORDER BY field`
- Most common use case

**Ví dụ:**
```typescript
@WorkspaceFieldIndex()
createdAt: Date;  // Range queries
```

### GIN (Generalized Inverted Index)

```typescript
@WorkspaceFieldIndex({ indexType: IndexType.GIN })
```

**Phù hợp cho:**
- Full-text search (TS_VECTOR)
- JSONB queries
- Array containment
- Complex data types

**Ví dụ:**
```typescript
@WorkspaceFieldIndex({ indexType: IndexType.GIN })
searchVector: string;  // Full-text search

@WorkspaceFieldIndex({ indexType: IndexType.GIN })
tags: string[];  // Array containment
```

## Partial Indexes

Index chỉ một subset của rows:

```typescript
@WorkspaceFieldIndex({
  indexWhereClause: '"deletedAt" IS NULL',
})
field: string;
// Chỉ index active records (chưa xóa)
```

### Use cases

**Active records only:**
```typescript
indexWhereClause: '"deletedAt" IS NULL'
```

**Specific status:**
```typescript
indexWhereClause: '"status" IN (\'ACTIVE\', \'PENDING\')'
```

**Non-null values:**
```typescript
indexWhereClause: '"field" IS NOT NULL'
```

## So sánh với WorkspaceIndex

### WorkspaceFieldIndex (Single column)
```typescript
@WorkspaceFieldIndex()
userId: string;
// Index trên 1 cột
```

### WorkspaceIndex (Multiple columns)
```typescript
@WorkspaceIndex(['userId', 'createdAt'], {})
// Index trên nhiều cột
```

### Khi nào dùng gì?

**WorkspaceFieldIndex:**
- ✅ Index 1 field
- ✅ Simple use case
- ✅ Foreign keys
- ✅ Frequently queried fields

**WorkspaceIndex:**
- ✅ Composite index (nhiều columns)
- ✅ Complex queries
- ✅ Unique constraints trên nhiều columns

## Auto-index cho Join Columns

`@WorkspaceJoinColumn` tự động tạo index:

```typescript
@WorkspaceField({...})
@WorkspaceJoinColumn('parent')  // Tự động tạo index
parentId: string;

// Không cần:
// @WorkspaceFieldIndex()  ← Redundant!
```

## Performance Considerations

### Pros
- ✅ Faster SELECT queries
- ✅ Faster JOIN operations
- ✅ Faster WHERE clauses
- ✅ Faster ORDER BY

### Cons
- ❌ Slower INSERT
- ❌ Slower UPDATE
- ❌ Slower DELETE
- ❌ Extra storage space
- ❌ Index maintenance overhead

### Best Practice
Chỉ index fields thường xuyên được query:

```typescript
// ✅ Đúng - frequently queried
@WorkspaceFieldIndex()
userId: string;  // WHERE userId = ?

@WorkspaceFieldIndex()
createdAt: Date;  // ORDER BY createdAt

// ❌ Không cần - rarely queried
@WorkspaceFieldIndex()
internalNote: string;  // Không ai query field này
```

## Default Columns for Index

Decorator tự động thêm một số default columns:

```typescript
@WorkspaceFieldIndex()
field: string;

// Có thể tạo index với columns:
// [field, deletedAt]  ← để support soft delete queries
```

Controlled bởi `getColumnsForIndex()` utility.

## Index Naming

Tên index tự động generated:

```typescript
`IDX_${generateDeterministicIndexName([
  objectMetadataName,
  ...columns,
])}`
```

Ví dụ:
```
IDX_a1b2c3d4e5f6g7h8i9j0k1l2m3n4
```

## Best Practices

### 1. Index foreign keys

```typescript
@WorkspaceField({...})
@WorkspaceFieldIndex()  // ✅ Tăng tốc JOIN
companyId: string;
```

### 2. Index frequently filtered fields

```typescript
@WorkspaceField({...})
@WorkspaceFieldIndex()  // ✅ WHERE status = ?
status: string;
```

### 3. Index sort columns

```typescript
@WorkspaceField({...})
@WorkspaceFieldIndex()  // ✅ ORDER BY createdAt
createdAt: Date;
```

### 4. Use GIN for text search

```typescript
@WorkspaceFieldIndex({ indexType: IndexType.GIN })
searchVector: string;  // ✅ Full-text search
```

### 5. Avoid over-indexing

```typescript
// ❌ Không cần - rarely queried
@WorkspaceFieldIndex()
description: string;

// ❌ Không cần - already indexed via @WorkspaceIsUnique
@WorkspaceIsUnique()
@WorkspaceFieldIndex()  // ← Redundant!
email: string;
```

## Query Optimization Example

```typescript
// Without index
@WorkspaceField({...})
userId: string;
// SELECT * FROM table WHERE userId = 'xxx'  → Seq Scan (slow)

// With index
@WorkspaceField({...})
@WorkspaceFieldIndex()
userId: string;
// SELECT * FROM table WHERE userId = 'xxx'  → Index Scan (fast)
```

## Troubleshooting

### Index không được sử dụng

**Nguyên nhân:**
- Query không sử dụng indexed column
- Function trên column: `LOWER(email)` thay vì `email`
- Type mismatch
- Index không phù hợp với query pattern

**Giải pháp:**
```sql
-- Check query plan
EXPLAIN ANALYZE SELECT * FROM table WHERE userId = 'xxx';
```

### Too many indexes

**Vấn đề:** INSERT/UPDATE chậm

**Giải pháp:** Chỉ giữ indexes thực sự cần thiết

### Partial index không hoạt động

**Vấn đề:** Query không match WHERE clause

**Giải pháp:** Query phải include điều kiện trong indexWhereClause

## See Also

- [WorkspaceIndex Decorator](./workspace-index.md)
- [WorkspaceIsUnique Decorator](./workspace-is-unique.md)
- [WorkspaceJoinColumn Decorator](./workspace-join-column.md)
- [Index Types](../../index-types.md)
