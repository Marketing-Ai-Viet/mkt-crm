# WorkspaceIsSearchable Decorator

## Tổng quan

`@WorkspaceIsSearchable()` kích hoạt full-text search cho entity. Entity sẽ có search vector field và được index để hỗ trợ search queries. Class decorator.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-is-searchable.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceIsSearchable()
```

## Ví dụ

### Ví dụ 1: Searchable Note entity

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.note,
  namePlural: 'notes',
  labelSingular: msg`Note`,
  labelPlural: msg`Notes`,
})
@WorkspaceIsSearchable()  // Enable search
export class NoteWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({...})
  title: string;
  
  @WorkspaceField({...})
  body: string;
  
  // Search vector field (auto-generated)
  @WorkspaceField({
    standardId: FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields([
      { name: 'title', type: FieldMetadataType.TEXT },
      { name: 'body', type: FieldMetadataType.RICH_TEXT_V2 },
    ]),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
```

### Ví dụ 2: Searchable Person entity

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.person,
  namePlural: 'people',
  labelSingular: msg`Person`,
  labelPlural: msg`People`,
})
@WorkspaceIsSearchable()
export class PersonWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({...})
  name: FullNameMetadata;
  
  @WorkspaceField({...})
  email: string;
  
  @WorkspaceField({...})
  phone: string;
  
  // Search vector
  @WorkspaceField({
    standardId: FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields([
      { name: 'name', type: FieldMetadataType.FULL_NAME },
      { name: 'email', type: FieldMetadataType.EMAIL },
      { name: 'phone', type: FieldMetadataType.PHONE },
    ]),
  })
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
```

## Requirements

Để sử dụng `@WorkspaceIsSearchable()`, entity **phải có**:

### 1. Search Vector Field

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.searchVector,
  type: FieldMetadataType.TS_VECTOR,
  label: SEARCH_VECTOR_FIELD.label,
  description: SEARCH_VECTOR_FIELD.description,
  generatedType: 'STORED',
  asExpression: getTsVectorColumnExpressionFromFields([...]),
})
@WorkspaceIsNullable()
@WorkspaceIsSystem()
@WorkspaceFieldIndex({ indexType: IndexType.GIN })  // ← GIN index required
searchVector: string;
```

### 2. GIN Index

```typescript
@WorkspaceFieldIndex({ indexType: IndexType.GIN })
searchVector: string;
```

### 3. System Field Marker

```typescript
@WorkspaceIsSystem()  // Hide from UI
searchVector: string;
```

## Search Vector Expression

### getTsVectorColumnExpressionFromFields

```typescript
import { getTsVectorColumnExpressionFromFields } from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';

const expression = getTsVectorColumnExpressionFromFields([
  { name: 'title', type: FieldMetadataType.TEXT },
  { name: 'description', type: FieldMetadataType.TEXT },
  { name: 'body', type: FieldMetadataType.RICH_TEXT_V2 },
]);

// Generates PostgreSQL expression:
// to_tsvector('english', coalesce("title", '') || ' ' || 
//             coalesce("description", '') || ' ' ||
//             coalesce("body"->>'content', ''))
```

### Supported Field Types

- ✅ TEXT
- ✅ EMAIL
- ✅ PHONE
- ✅ RICH_TEXT
- ✅ RICH_TEXT_V2
- ✅ FULL_NAME (searches firstName + lastName)
- ✅ ADDRESS (searches all address components)

## PostgreSQL Full-Text Search

### ts_vector Type

```sql
-- Example search vector data
'note':1 'important':2 'meeting':3 'tomorrow':4
```

### Search Queries

```typescript
// GraphQL query
query {
  notes(filter: {
    search: "important meeting"
  }) {
    edges {
      node {
        title
        body
      }
    }
  }
}
```

### SQL Behind the Scenes

```sql
SELECT * FROM note
WHERE searchVector @@ to_tsquery('english', 'important & meeting')
ORDER BY ts_rank(searchVector, to_tsquery('english', 'important & meeting')) DESC;
```

## Performance

### Pros
- ✅ Fast full-text search
- ✅ Supports complex queries
- ✅ Ranking by relevance
- ✅ Language-aware (stemming, stop words)

### Cons
- ❌ Extra storage (search vector)
- ❌ Slower INSERT/UPDATE (generate vector)
- ❌ GIN index maintenance

## Search Features

### 1. Stemming

```sql
-- Searches for: run, running, runs, ran
to_tsquery('run')
```

### 2. Stop Words

Common words ignored: the, a, an, is, etc.

### 3. Ranking

Results ranked by relevance:
- Exact matches higher rank
- Multiple term matches higher rank
- Position in document affects rank

### 4. Phrase Search

```sql
to_tsquery('important <-> meeting')  -- Adjacent words
```

### 5. AND/OR Logic

```sql
to_tsquery('sales & report')   -- Both terms
to_tsquery('sales | report')   -- Either term
to_tsquery('sales & !draft')   -- sales but not draft
```

## Use Cases

### 1. Content-heavy entities

```typescript
// ✅ Đúng - lots of text content
@WorkspaceIsSearchable()
export class NoteWorkspaceEntity {
  title: string;
  body: RichTextV2;
}

@WorkspaceIsSearchable()
export class ArticleWorkspaceEntity {
  title: string;
  content: string;
  summary: string;
}
```

### 2. Contact entities

```typescript
// ✅ Đúng - search by name, email, phone
@WorkspaceIsSearchable()
export class PersonWorkspaceEntity {
  name: FullName;
  email: string;
  phone: string;
}
```

### 3. Documents

```typescript
// ✅ Đúng - searchable documents
@WorkspaceIsSearchable()
export class DocumentWorkspaceEntity {
  title: string;
  content: string;
  tags: string[];
}
```

## When NOT to Use

### ❌ Entities without text content

```typescript
// ❌ Không cần - no searchable text
@WorkspaceEntity({...})
@WorkspaceIsSearchable()  // Overkill
export class SettingWorkspaceEntity {
  isEnabled: boolean;
  value: number;
}
```

### ❌ Small lookup tables

```typescript
// ❌ Không cần - small data set
@WorkspaceEntity({...})
@WorkspaceIsSearchable()  // Overkill
export class StatusWorkspaceEntity {
  name: string;  // Only 5-10 statuses total
}
```

### ❌ High-write entities

```typescript
// ⚠️ Cẩn thận - updates sẽ chậm
@WorkspaceEntity({...})
@WorkspaceIsSearchable()
export class AnalyticsEventWorkspaceEntity {
  // Millions of inserts/updates → slow with search vector
}
```

## Complete Example

```typescript
import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { getTsVectorColumnExpressionFromFields } from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';

const SEARCH_FIELDS = [
  { name: 'title', type: FieldMetadataType.TEXT },
  { name: 'description', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.article,
  namePlural: 'articles',
  labelSingular: msg`Article`,
  labelPlural: msg`Articles`,
})
@WorkspaceIsSearchable()
export class ArticleWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: FIELD_IDS.title,
    type: FieldMetadataType.TEXT,
    label: msg`Title`,
  })
  title: string;

  @WorkspaceField({
    standardId: FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
  })
  @WorkspaceIsNullable()
  description: string | null;

  @WorkspaceField({
    standardId: FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(SEARCH_FIELDS),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
```

## Best Practices

### 1. Include relevant fields in search

```typescript
// ✅ Đúng - all searchable text
getTsVectorColumnExpressionFromFields([
  { name: 'title', type: FieldMetadataType.TEXT },
  { name: 'body', type: FieldMetadataType.RICH_TEXT_V2 },
  { name: 'author', type: FieldMetadataType.TEXT },
])

// ❌ Sai - missing important fields
getTsVectorColumnExpressionFromFields([
  { name: 'title', type: FieldMetadataType.TEXT },
  // Missing body!
])
```

### 2. Always use GIN index

```typescript
// ✅ Đúng
@WorkspaceFieldIndex({ indexType: IndexType.GIN })
searchVector: string;

// ❌ Sai - wrong index type
@WorkspaceFieldIndex()  // BTREE không hiệu quả
searchVector: string;
```

### 3. Mark as system field

```typescript
// ✅ Đúng
@WorkspaceIsSystem()
searchVector: string;

// ❌ Sai - users không cần thấy
searchVector: string;
```

### 4. Use STORED generated column

```typescript
// ✅ Đúng - faster searches
generatedType: 'STORED',

// ❌ Sai - VIRTUAL không thể index
generatedType: 'VIRTUAL',
```

## Troubleshooting

### Search không hoạt động

**Kiểm tra:**
1. `@WorkspaceIsSearchable()` decorator có không?
2. Search vector field có không?
3. GIN index có được tạo không?
4. Fields có data không?

### Search chậm

**Giải pháp:**
1. Kiểm tra GIN index
2. VACUUM ANALYZE table
3. Reduce số fields trong search vector
4. Consider partitioning cho large tables

### Search results không relevant

**Giải pháp:**
1. Review search vector expression
2. Thêm/remove fields
3. Adjust field weights (advanced)
4. Consider custom dictionaries

## See Also

- [WorkspaceEntity Decorator](./workspace-entity.md)
- [WorkspaceField Decorator](./workspace-field.md)
- [WorkspaceFieldIndex Decorator](./workspace-field-index.md)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Search Vector Utilities](../../search-vector-utils.md)
