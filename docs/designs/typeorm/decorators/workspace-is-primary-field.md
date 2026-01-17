# WorkspaceIsPrimaryField Decorator

## Tổng quan

`@WorkspaceIsPrimaryField()` đánh dấu field làm primary identifier field của entity. Field này được dùng để hiển thị/nhận diện record trong UI. Property decorator.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-is-primary-field.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceIsPrimaryField()
```

## Ví dụ

### Ví dụ 1: Name as primary field

```typescript
@WorkspaceEntity({...})
export class PersonWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: FIELD_IDS.name,
    type: FieldMetadataType.FULL_NAME,
    label: msg`Name`,
  })
  @WorkspaceIsPrimaryField()  // Name là primary identifier
  name: FullNameMetadata;
}
```

### Ví dụ 2: Title as primary field

```typescript
@WorkspaceEntity({...})
export class NoteWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: FIELD_IDS.title,
    type: FieldMetadataType.TEXT,
    label: msg`Title`,
  })
  @WorkspaceIsPrimaryField()  // Title là primary identifier
  title: string;
}
```

### Ví dụ 3: Email as primary field

```typescript
@WorkspaceEntity({...})
export class ContactWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: FIELD_IDS.email,
    type: FieldMetadataType.EMAIL,
    label: msg`Email`,
  })
  @WorkspaceIsPrimaryField()  // Email là primary identifier
  email: string;
}
```

## Mục đích

Primary field được sử dụng trong UI để:
- 🏷️ **Record Title**: Hiển thị trong list views
- 🔗 **Links**: Text của clickable links
- 🍞 **Breadcrumbs**: Navigation breadcrumbs
- 🏷️ **Tags/Chips**: Record chips
- 🔍 **Search Results**: Kết quả search
- 📋 **Dropdowns**: Select options

## Ví dụ UI Usage

```typescript
// Entity có primary field là 'name'
@WorkspaceIsPrimaryField()
name: string;

// UI hiển thị:
// List view:       "John Doe"        (name value)
// Link:            <a>John Doe</a>   (name value)
// Breadcrumb:      Home > People > John Doe
// Chip:            [John Doe ×]
// Search result:   "John Doe" - person
```

## Quan hệ với labelIdentifierStandardId

```typescript
// labelIdentifierStandardId trong @WorkspaceEntity
@WorkspaceEntity({
  labelIdentifierStandardId: PERSON_STANDARD_FIELD_IDS.name,
  // ↑ Xác định field nào là label identifier
})

// @WorkspaceIsPrimaryField trên field
@WorkspaceField({
  standardId: PERSON_STANDARD_FIELD_IDS.name,
  ...
})
@WorkspaceIsPrimaryField()  // ← Marks this field as primary
name: string;
```

**Best Practice:** Giữ consistency giữa hai settings

## One Primary Field Per Entity

```typescript
@WorkspaceEntity({...})
export class PersonWorkspaceEntity {
  // ✅ One primary field
  @WorkspaceIsPrimaryField()
  name: string;
  
  // ❌ Don't mark multiple as primary
  // @WorkspaceIsPrimaryField()
  email: string;  // Không mark cái thứ 2
}
```

## Field Type Recommendations

### Recommended Types
- ✅ TEXT - Names, titles
- ✅ FULL_NAME - Person names
- ✅ EMAIL - When email is main identifier
- ✅ PHONE - When phone is main identifier
- ✅ LINK - URLs as identifiers

### Not Recommended
- ❌ NUMBER - Not descriptive
- ❌ BOOLEAN - Not descriptive
- ❌ DATE - Not unique identifier
- ❌ JSON - Not readable
- ❌ TS_VECTOR - System field

## Best Practices

### 1. Choose human-readable field

```typescript
// ✅ Đúng - readable
@WorkspaceIsPrimaryField()
name: string;  // "John Doe"

@WorkspaceIsPrimaryField()
title: string;  // "Q4 Sales Report"

// ❌ Sai - not readable
@WorkspaceIsPrimaryField()
id: string;  // "uuid-123-456"

@WorkspaceIsPrimaryField()
position: number;  // "42"
```

### 2. Choose unique or semi-unique field

```typescript
// ✅ Đúng - reasonably unique
@WorkspaceIsPrimaryField()
email: string;  // Usually unique

@WorkspaceIsPrimaryField()
fullName: string;  // Usually distinctive

// ⚠️ Cẩn thận - may not be unique
@WorkspaceIsPrimaryField()
firstName: string;  // Many "John"s
```

### 3. Make primary field required

```typescript
// ✅ Đúng - required
@WorkspaceField({...})
@WorkspaceIsPrimaryField()
name: string;  // NOT nullable

// ⚠️ Avoid - nullable primary
@WorkspaceField({...})
@WorkspaceIsPrimaryField()
@WorkspaceIsNullable()
name: string | null;  // UI có thể hiển thị "(Unnamed)"
```

### 4. Sync with labelIdentifierStandardId

```typescript
// ✅ Đúng - consistent
@WorkspaceEntity({
  labelIdentifierStandardId: FIELD_IDS.name,  // ← Points to name
})
export class Entity {
  @WorkspaceField({ standardId: FIELD_IDS.name })
  @WorkspaceIsPrimaryField()  // ← Marks name as primary
  name: string;
}

// ❌ Sai - inconsistent
@WorkspaceEntity({
  labelIdentifierStandardId: FIELD_IDS.name,  // ← Points to name
})
export class Entity {
  @WorkspaceField({ standardId: FIELD_IDS.name })
  name: string;  // ← Not marked as primary
  
  @WorkspaceField({ standardId: FIELD_IDS.title })
  @WorkspaceIsPrimaryField()  // ← Different field marked
  title: string;
}
```

## Default Behavior

Nếu không có `@WorkspaceIsPrimaryField`:
- Default sử dụng `id` field
- Hoặc field chỉ định bởi `labelIdentifierStandardId`

```typescript
@WorkspaceEntity({
  // Không set labelIdentifierStandardId
  // → Mặc định dùng 'id'
})
```

## Fallback Chain

1. Field có `@WorkspaceIsPrimaryField()`
2. Field chỉ định bởi `labelIdentifierStandardId`
3. Field `name` (nếu có)
4. Field `title` (nếu có)
5. Field `id` (luôn có)

## Relations và Primary Field

```typescript
// Person entity
@WorkspaceIsPrimaryField()
name: string;

// Task entity với relation to Person
@WorkspaceRelation({...})
assignee: Relation<PersonWorkspaceEntity>;

// UI hiển thị:
// Task assignee: "John Doe"  ← Dùng primary field của Person
```

## Metadata Storage

```typescript
{
  // ... other field metadata
  isPrimary: true,  // ← Set bởi decorator
  // ... other field metadata
}
```

## GraphQL Impact

Primary field có thể có special handling trong queries:

```graphql
query {
  people {
    edges {
      node {
        id
        __typename
        __primaryField  # Tự động resolve primary field value
      }
    }
  }
}
```

## Troubleshooting

### Primary field không hiển thị trong UI

**Kiểm tra:**
1. Có `@WorkspaceIsPrimaryField()` decorator?
2. `labelIdentifierStandardId` đúng chưa?
3. Field có data không?
4. Field type có readable không?

### Multiple primary fields

**Vấn đề:** Hai fields đều marked as primary

**Giải pháp:** Chỉ mark một field làm primary

### Nullable primary field

**Vấn đề:** Primary field có thể NULL

**Giải pháp:** 
- Make required nếu có thể
- Hoặc handle NULL trong UI ("Untitled", "Unnamed", etc.)

## See Also

- [WorkspaceEntity Decorator](./workspace-entity.md)
- [WorkspaceField Decorator](./workspace-field.md)
- [Label Identifier Configuration](../../label-identifier.md)
