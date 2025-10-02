# WorkspaceIsDeprecated Decorator

## Tổng quan

`@WorkspaceIsDeprecated()` đánh dấu field là deprecated. Field vẫn tồn tại nhưng được đánh dấu để remove trong tương lai. Chỉ áp dụng cho property.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-is-deprecated.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceIsDeprecated()
```

## Ví dụ

### Ví dụ 1: Deprecated field

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.oldField,
  type: FieldMetadataType.TEXT,
  label: msg`Old Field`,
  description: msg`Deprecated: Use newField instead`,
})
@WorkspaceIsDeprecated()
@WorkspaceIsNullable()
oldField: string | null;

@WorkspaceField({
  standardId: FIELD_IDS.newField,
  type: FieldMetadataType.TEXT,
  label: msg`New Field`,
})
newField: string;
```

### Ví dụ 2: Migrating from old to new field

```typescript
// Old field - being phased out
@WorkspaceField({
  standardId: FIELD_IDS.body,
  type: FieldMetadataType.TEXT,
  label: msg`Body`,
  description: msg`Deprecated: Use bodyV2 instead`,
})
@WorkspaceIsDeprecated()
@WorkspaceIsNullable()
body: string | null;

// New field - replacement
@WorkspaceField({
  standardId: FIELD_IDS.bodyV2,
  type: FieldMetadataType.RICH_TEXT_V2,
  label: msg`Body`,
  description: msg`Rich text body`,
})
@WorkspaceIsNullable()
bodyV2: RichTextV2Metadata | null;
```

## Behavior

Field vẫn:
- ✅ Tồn tại trong database
- ✅ Có trong GraphQL API
- ✅ Có thể query/mutate
- ✅ Data được preserved

Nhưng:
- ⚠️ Đánh dấu deprecated trong metadata
- ⚠️ Có thể hiển thị warning trong UI
- ⚠️ Developers biết để không dùng
- ⚠️ Scheduled để remove sau

## Migration Pattern

### Step 1: Add new field

```typescript
@WorkspaceField({...})
newField: string;
```

### Step 2: Deprecate old field

```typescript
@WorkspaceField({...})
@WorkspaceIsDeprecated()  // Mark as deprecated
oldField: string;
```

### Step 3: Migrate data

```typescript
// Migration script
UPDATE table SET newField = oldField WHERE newField IS NULL;
```

### Step 4: Update application code

```typescript
// Old code
const value = entity.oldField;  // ⚠️ Deprecated

// New code
const value = entity.newField;  // ✅ Use new field
```

### Step 5: Remove old field (future release)

```typescript
// Remove @WorkspaceField entirely
// Create migration to drop column
```

## Use Cases

### 1. Field Rename

```typescript
// Old name
@WorkspaceField({...})
@WorkspaceIsDeprecated()
userName: string;

// New name
@WorkspaceField({...})
fullName: string;
```

### 2. Type Change

```typescript
// Old type: TEXT
@WorkspaceField({
  type: FieldMetadataType.TEXT,
  ...
})
@WorkspaceIsDeprecated()
tagsOld: string;  // "tag1,tag2,tag3"

// New type: MULTI_SELECT
@WorkspaceField({
  type: FieldMetadataType.MULTI_SELECT,
  options: [...],
})
tags: string[];  // ["tag1", "tag2", "tag3"]
```

### 3. Feature Replacement

```typescript
// Old simple field
@WorkspaceField({...})
@WorkspaceIsDeprecated()
simpleAddress: string;

// New composite field
@WorkspaceField({
  type: FieldMetadataType.ADDRESS,
  ...
})
address: AddressMetadata;
```

## Best Practices

### 1. Always provide migration path

```typescript
// ✅ Đúng - clear alternative
@WorkspaceField({
  description: msg`Deprecated: Use newField instead`,
})
@WorkspaceIsDeprecated()
oldField: string;

// ❌ Sai - no guidance
@WorkspaceField({...})
@WorkspaceIsDeprecated()
oldField: string;  // User không biết dùng gì
```

### 2. Make deprecated fields nullable

```typescript
// ✅ Đúng
@WorkspaceIsDeprecated()
@WorkspaceIsNullable()
oldField: string | null;  // Cho phép new records không set

// ⚠️ Cẩn thận
@WorkspaceIsDeprecated()
oldField: string;  // Vẫn phải set cho new records
```

### 3. Document deprecation timeline

```typescript
// ✅ Đúng - clear timeline
@WorkspaceField({
  description: msg`Deprecated: Use bodyV2. Will be removed in v2.0`,
})
@WorkspaceIsDeprecated()
body: string;
```

### 4. Keep deprecated field during migration period

```typescript
// Phase 1: Add new field
@WorkspaceField({...})
newField: string;

// Phase 2: Deprecate old (keep both)
@WorkspaceField({...})
@WorkspaceIsDeprecated()
oldField: string;

// Phase 3: Migrate data (keep both)
// ... migration code ...

// Phase 4: Remove old (future release)
// Delete oldField entirely
```

### 5. Update related documentation

```markdown
## Breaking Changes

- `oldField` is deprecated and will be removed in v2.0
- Use `newField` instead
- Migration guide: [link]
```

## Deprecation Timeline Example

```typescript
// v1.0 - Original field
@WorkspaceField({...})
body: string;

// v1.5 - Add new field
@WorkspaceField({...})
body: string;

@WorkspaceField({...})
bodyV2: RichTextV2;

// v1.6 - Deprecate old
@WorkspaceField({...})
@WorkspaceIsDeprecated()
body: string;

@WorkspaceField({...})
bodyV2: RichTextV2;

// v1.7-1.9 - Migration period
// Both fields exist
// Migrate data gradually

// v2.0 - Remove old field
// Only bodyV2 remains
```

## Metadata Storage

```typescript
{
  // ... other metadata
  isDeprecated: true,
  // ... other metadata
}
```

## GraphQL Schema Impact

Deprecated field có thể được mark trong schema:

```graphql
type Note {
  id: ID!
  body: String @deprecated(reason: "Use bodyV2 instead")
  bodyV2: RichText
}
```

## Troubleshooting

### Should I deprecate or gate?

**Use @WorkspaceIsDeprecated when:**
- ✅ Replacing with better alternative
- ✅ Need gradual migration
- ✅ Data needs to be preserved
- ✅ Backward compatibility important

**Use @WorkspaceGate when:**
- ✅ Experimental feature
- ✅ Can be completely removed
- ✅ No migration needed
- ✅ On/off toggle sufficient

### How long to keep deprecated field?

**Recommended:**
- Minimum 2-3 minor versions
- 6-12 months for major changes
- Until usage drops to ~0%
- Document in CHANGELOG

## See Also

- [WorkspaceField Decorator](./workspace-field.md)
- [WorkspaceGate Decorator](./workspace-gate.md)
- [Migration Guide](../../migration-guide.md)
