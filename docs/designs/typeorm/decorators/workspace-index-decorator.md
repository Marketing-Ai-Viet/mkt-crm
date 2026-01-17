# WorkspaceIndex Decorator - Hướng dẫn sử dụng

## Tổng quan

`WorkspaceIndex` là một decorator ở cấp độ class được sử dụng trong Twenty ORM để tạo các index trên database cho các workspace entities. Decorator này giúp tối ưu hóa hiệu suất truy vấn bằng cách tạo index trên một hoặc nhiều cột.

## Vị trí file

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-index.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceIndex(columns: string[], options: WorkspaceIndexOptions)
```

### Tham số

#### `columns: string[]`
- **Kiểu**: Mảng các string
- **Bắt buộc**: Có
- **Mô tả**: Danh sách tên các cột cần tạo index
- **Lưu ý**: Mảng phải có ít nhất 1 phần tử, nếu không sẽ throw error

#### `options: WorkspaceIndexOptions`
- **Kiểu**: Object
- **Bắt buộc**: Có
- **Mô tả**: Các tùy chọn cấu hình cho index

##### Thuộc tính của WorkspaceIndexOptions:

| Thuộc tính | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-----------|------|----------|----------|-------|
| `isUnique` | boolean | Không | `false` | Xác định index có phải là unique constraint hay không |
| `indexWhereClause` | string | Không | `null` | Điều kiện WHERE cho partial index (index có điều kiện) |
| `indexType` | IndexType | Không | undefined | Loại index (BTREE hoặc GIN) |

## Cách hoạt động

### 1. Tạo tên index tự động
Decorator tự động tạo tên index theo format:
```
IDX_[UNIQUE_]<hash>
```

- Tiền tố `UNIQUE_` được thêm vào nếu `isUnique: true`
- Hash được tạo bằng hàm `generateDeterministicIndexName()` từ tên object metadata và danh sách columns
- Hash này đảm bảo tên index là duy nhất và deterministic (luôn giống nhau với cùng input)

### 2. Lưu trữ metadata
Index metadata được lưu vào `metadataArgsStorage` với các thông tin:
- `name`: Tên index đã được generate
- `columns`: Danh sách các cột
- `target`: Class entity
- `gate`: Gate metadata (nếu có)
- `isUnique`: Có phải unique index không
- `whereClause`: Điều kiện WHERE (nếu có)
- `type`: Loại index (nếu được chỉ định)

### 3. Xử lý gate metadata
Decorator tự động lấy gate metadata từ class (nếu có) thông qua TypedReflect để áp dụng các quy tắc feature flag.

## Các loại Index

### IndexType enum

```typescript
enum IndexType {
  BTREE = 'BTREE',  // B-Tree index (mặc định trong PostgreSQL)
  GIN = 'GIN',      // Generalized Inverted Index (cho full-text search, JSONB)
}
```

## Ví dụ sử dụng

### Ví dụ 1: Index đơn giản với unique constraint

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.viewField,
  namePlural: 'viewFields',
  labelSingular: 'View Field',
  labelPlural: 'View Fields',
  description: 'View Fields',
  icon: 'IconTag',
  labelIdentifierStandardId: VIEW_FIELD_STANDARD_FIELD_IDS.fieldMetadata,
})
@WorkspaceIsSystem()
@WorkspaceIndex(['fieldMetadataId', 'viewId'], {
  isUnique: true,
  indexWhereClause: '"deletedAt" IS NULL',
})
export class ViewFieldWorkspaceEntity extends BaseWorkspaceEntity {
  // ... fields
}
```

**Giải thích:**
- Tạo unique index trên 2 cột: `fieldMetadataId` và `viewId`
- Index chỉ áp dụng cho các record chưa bị xóa (`deletedAt IS NULL`)
- Đảm bảo không có duplicate combination của fieldMetadataId và viewId trong các record active

### Ví dụ 2: Index với unique constraint trên MessageChannelMessageAssociation

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.messageChannelMessageAssociation,
  namePlural: 'messageChannelMessageAssociations',
  labelSingular: 'Message Channel Message Association',
  labelPlural: 'Message Channel Message Associations',
  description: 'Message Synced with a Message Channel',
  icon: 'IconMessage',
})
@WorkspaceIsSystem()
@WorkspaceIndex(['messageChannelId', 'messageId'], {
  isUnique: true,
  indexWhereClause: '"deletedAt" IS NULL',
})
export class MessageChannelMessageAssociationWorkspaceEntity extends BaseWorkspaceEntity {
  // ... fields
}
```

**Giải thích:**
- Tạo unique index để đảm bảo một message chỉ được associate với một message channel duy nhất
- Sử dụng partial index với WHERE clause để ignore các record đã bị soft delete

### Ví dụ 3: Index không unique (tối ưu query performance)

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.viewSort,
  namePlural: 'viewSorts',
  labelSingular: 'View Sort',
  labelPlural: 'View Sorts',
  description: 'View Sorts',
  icon: 'IconArrowsSort',
  labelIdentifierStandardId: VIEW_SORT_STANDARD_FIELD_IDS.fieldMetadata,
})
@WorkspaceIsSystem()
@WorkspaceIndex(['fieldMetadataId', 'viewId'], {
  isUnique: true,
  indexWhereClause: '"deletedAt" IS NULL',
})
export class ViewSortWorkspaceEntity extends BaseWorkspaceEntity {
  // ... fields
}
```

### Ví dụ 4: Index với GIN type (cho full-text search hoặc JSONB)

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.customObject,
  namePlural: 'customObjects',
  labelSingular: 'Custom Object',
  labelPlural: 'Custom Objects',
  description: 'Custom Objects',
  icon: 'IconBox',
})
@WorkspaceIndex(['searchVector'], {
  indexType: IndexType.GIN,
})
export class CustomObjectWorkspaceEntity extends BaseWorkspaceEntity {
  // ... fields
}
```

**Giải thích:**
- Sử dụng GIN index cho full-text search
- GIN index phù hợp cho các trường text search vector hoặc JSONB columns

## Best Practices

### 1. Sử dụng Unique Index với WHERE clause cho soft delete

```typescript
@WorkspaceIndex(['userId', 'email'], {
  isUnique: true,
  indexWhereClause: '"deletedAt" IS NULL',
})
```

**Lý do**: Khi sử dụng soft delete pattern, bạn muốn unique constraint chỉ áp dụng cho các record active. Điều này cho phép cùng một combination có thể tồn tại trong các record đã bị xóa.

### 2. Index các cột thường xuyên được query

```typescript
// Nếu bạn thường query theo workspaceId và status
@WorkspaceIndex(['workspaceId', 'status'], {
  isUnique: false,
})
```

### 3. Chọn đúng loại index

- **BTREE** (mặc định): Phù hợp cho equality và range queries
- **GIN**: Phù hợp cho full-text search, array containment, JSONB

### 4. Thứ tự columns trong composite index

Đặt column có selectivity cao nhất đầu tiên (column có nhiều giá trị unique nhất):

```typescript
// Good: userId có selectivity cao hơn status
@WorkspaceIndex(['userId', 'status'], options)

// Less optimal: status thường chỉ có vài giá trị
@WorkspaceIndex(['status', 'userId'], options)
```

### 5. Không tạo quá nhiều index

Mỗi index có cost:
- Tốn storage space
- Làm chậm INSERT, UPDATE, DELETE operations
- Chỉ tạo index cho các query patterns thường xuyên được sử dụng

## Validation và Error Handling

### Error: Empty columns array

```typescript
// ❌ Sai - sẽ throw error
@WorkspaceIndex([], options)

// ✅ Đúng
@WorkspaceIndex(['columnName'], options)
```

**Error message**: "Class level WorkspaceIndex should be used with columns"

## So sánh với WorkspaceFieldIndex

### WorkspaceIndex (Class-level)
- Decorator cho class
- Tạo composite index trên nhiều cột
- Linh hoạt hơn với options như WHERE clause

### WorkspaceFieldIndex (Field-level)
- Decorator cho từng field riêng lẻ
- Tạo index trên một cột đơn lẻ
- Đơn giản hơn cho single-column index

```typescript
// WorkspaceIndex (class-level, composite)
@WorkspaceIndex(['userId', 'createdAt'], { isUnique: false })
export class MyEntity extends BaseWorkspaceEntity {
  // ...
}

// WorkspaceFieldIndex (field-level, single column)
export class MyEntity extends BaseWorkspaceEntity {
  @WorkspaceField({ standardId: FIELD_IDS.email })
  @WorkspaceFieldIndex()
  email: string;
}
```

## Dependencies

### Internal Dependencies

1. **IndexType**: Enum định nghĩa các loại index
   - Path: `src/engine/metadata-modules/index-metadata/types/indexType.types.ts`

2. **generateDeterministicIndexName**: Utility function tạo tên index
   - Path: `src/engine/metadata-modules/index-metadata/utils/generate-deterministic-index-name.ts`
   - Logic: Tạo SHA-256 hash từ object name + column names

3. **metadataArgsStorage**: Storage cho metadata arguments
   - Path: `src/engine/twenty-orm/storage/metadata-args.storage.ts`
   - Chức năng: Lưu trữ tất cả metadata của indexes

4. **convertClassNameToObjectMetadataName**: Utility function
   - Path: `src/engine/workspace-manager/workspace-sync-metadata/utils/convert-class-to-object-metadata-name.util.ts`
   - Chức năng: Convert class name sang object metadata name

5. **TypedReflect**: Type-safe reflection utility
   - Path: `src/utils/typed-reflect.ts`
   - Chức năng: Lấy metadata từ class

## Flow xử lý

```
1. Developer applies @WorkspaceIndex decorator
                ↓
2. Decorator validates columns array (not empty)
                ↓
3. Get gate metadata from class (if exists)
                ↓
4. Convert class name to object metadata name
                ↓
5. Generate deterministic index name (hash)
                ↓
6. Store index metadata in metadataArgsStorage
                ↓
7. Metadata sync process reads storage
                ↓
8. Create actual database index via migrations
```

## Performance Considerations

### Index Size và Memory

Composite indexes có thể chiếm nhiều space:
```typescript
// Small index
@WorkspaceIndex(['id'], options)

// Medium index
@WorkspaceIndex(['userId', 'createdAt'], options)

// Large index (consider carefully)
@WorkspaceIndex(['field1', 'field2', 'field3', 'field4'], options)
```

### Query Optimization

Index chỉ hiệu quả khi query sử dụng leading columns:

```typescript
@WorkspaceIndex(['userId', 'status', 'createdAt'], options)

// ✅ Sẽ sử dụng index
SELECT * FROM table WHERE userId = 1
SELECT * FROM table WHERE userId = 1 AND status = 'active'
SELECT * FROM table WHERE userId = 1 AND status = 'active' AND createdAt > '2024-01-01'

// ❌ Sẽ KHÔNG sử dụng index hiệu quả
SELECT * FROM table WHERE status = 'active'
SELECT * FROM table WHERE createdAt > '2024-01-01'
```

## Testing

### Unit Test Example

```typescript
describe('WorkspaceIndex', () => {
  it('should throw error when columns array is empty', () => {
    expect(() => {
      @WorkspaceIndex([], { isUnique: false })
      class TestEntity {}
    }).toThrow('Class level WorkspaceIndex should be used with columns');
  });

  it('should add index metadata to storage', () => {
    @WorkspaceIndex(['column1', 'column2'], { isUnique: true })
    class TestEntity {}

    const indexes = metadataArgsStorage.indexes;
    expect(indexes).toHaveLength(1);
    expect(indexes[0].columns).toEqual(['column1', 'column2']);
    expect(indexes[0].isUnique).toBe(true);
  });
});
```

## Migration Example

Khi decorator được apply, migration sẽ tạo index tương ứng trong database:

```typescript
// Generated migration
export class CreateViewFieldIndex1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_UNIQUE_abc123..."
      ON "viewField" ("fieldMetadataId", "viewId")
      WHERE "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_UNIQUE_abc123..."
    `);
  }
}
```

## Troubleshooting

### Issue 1: Index không được tạo

**Nguyên nhân**: Metadata sync chưa chạy

**Giải pháp**:
```bash
npx nx run twenty-server:command workspace:sync-metadata -f
```

### Issue 2: Duplicate index name

**Nguyên nhân**: Có thể có conflict trong hash generation

**Giải pháp**: Kiểm tra log và xác minh tên columns, đảm bảo không trùng với index khác

### Issue 3: Performance không cải thiện

**Nguyên nhân**: 
- Query không sử dụng leading columns của index
- Index không phù hợp với query pattern

**Giải pháp**: 
- Analyze query execution plan
- Điều chỉnh thứ tự columns trong index
- Cân nhắc tạo index riêng cho query pattern cụ thể

## Tài liệu tham khảo

- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [PostgreSQL Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- [Twenty ORM Documentation](../../README.md)
- [Workspace Entity Documentation](./workspace-entity-decorator.md)

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-10-02 | Initial documentation |
