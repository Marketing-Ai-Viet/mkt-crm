# WorkspaceDuplicateCriteria Decorator

## Tổng quan

`@WorkspaceDuplicateCriteria()` định nghĩa tiêu chí phát hiện duplicate records. Sử dụng để detect và merge duplicate entries. Class decorator.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-duplicate-criteria.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceDuplicateCriteria(criteria: WorkspaceEntityDuplicateCriteria[])
```

## Types

```typescript
type WorkspaceEntityDuplicateCriteria = {
  columnName: string;
  columnType: 'TEXT' | 'EMAIL' | 'PHONE' | 'NUMBER' | 'DATE';
  operator: 'IS_EQUAL' | 'IS_SIMILAR' | 'IS_FUZZY_MATCH';
};
```

## Ví dụ

### Ví dụ 1: Duplicate by email

```typescript
@WorkspaceEntity({...})
@WorkspaceDuplicateCriteria([
  {
    columnName: 'email',
    columnType: 'EMAIL',
    operator: 'IS_EQUAL',
  },
])
export class PersonWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({...})
  email: string;
  // Duplicate nếu email giống nhau
}
```

### Ví dụ 2: Multiple criteria

```typescript
@WorkspaceEntity({...})
@WorkspaceDuplicateCriteria([
  {
    columnName: 'email',
    columnType: 'EMAIL',
    operator: 'IS_EQUAL',
  },
  {
    columnName: 'phone',
    columnType: 'PHONE',
    operator: 'IS_EQUAL',
  },
])
export class ContactWorkspaceEntity extends BaseWorkspaceEntity {
  // Duplicate nếu email HOẶC phone giống nhau
}
```

### Ví dụ 3: Fuzzy name matching

```typescript
@WorkspaceEntity({...})
@WorkspaceDuplicateCriteria([
  {
    columnName: 'name',
    columnType: 'TEXT',
    operator: 'IS_FUZZY_MATCH',
  },
])
export class CompanyWorkspaceEntity extends BaseWorkspaceEntity {
  // Duplicate nếu name similar (e.g., "Google Inc" vs "Google Inc.")
}
```

## Operators

### IS_EQUAL
Exact match (case-insensitive for text):
```typescript
operator: 'IS_EQUAL'
// "john@example.com" === "john@example.com" ✅
// "john@example.com" === "jane@example.com" ❌
```

### IS_SIMILAR
Similar strings (small differences allowed):
```typescript
operator: 'IS_SIMILAR'
// "Google Inc" === "Google Inc." ✅
// "Google" === "Google LLC" ✅
// "Google" === "Microsoft" ❌
```

### IS_FUZZY_MATCH
Fuzzy matching (typos, variations):
```typescript
operator: 'IS_FUZZY_MATCH'
// "John Smith" === "Jon Smith" ✅ (typo)
// "John Smith" === "J Smith" ✅ (abbreviation)
// "John Smith" === "Jane Doe" ❌ (completely different)
```

## Column Types

### TEXT
```typescript
columnType: 'TEXT'
// General text fields: name, title, etc.
```

### EMAIL
```typescript
columnType: 'EMAIL'
// Email normalization applied
// "John@Example.COM" === "john@example.com"
```

### PHONE
```typescript
columnType: 'PHONE'
// Phone normalization applied
// "+1 (555) 123-4567" === "15551234567"
```

### NUMBER
```typescript
columnType: 'NUMBER'
// Numeric comparison
// 100 === 100.0 ✅
```

### DATE
```typescript
columnType: 'DATE'
// Date comparison
// "2024-01-01" === "2024-01-01" ✅
```

## Logic

Criteria are combined with **OR** logic:

```typescript
@WorkspaceDuplicateCriteria([
  { columnName: 'email', ... },
  { columnName: 'phone', ... },
])
// Duplicate if email matches OR phone matches
```

## Use Cases

### 1. Prevent duplicate contacts

```typescript
@WorkspaceDuplicateCriteria([
  { columnName: 'email', columnType: 'EMAIL', operator: 'IS_EQUAL' },
])
// Alert when adding person với existing email
```

### 2. Merge duplicate companies

```typescript
@WorkspaceDuplicateCriteria([
  { columnName: 'name', columnType: 'TEXT', operator: 'IS_SIMILAR' },
  { columnName: 'domain', columnType: 'TEXT', operator: 'IS_EQUAL' },
])
// Suggest merge cho "Google Inc" và "Google Inc."
```

### 3. Deduplicate leads

```typescript
@WorkspaceDuplicateCriteria([
  { columnName: 'email', columnType: 'EMAIL', operator: 'IS_EQUAL' },
  { columnName: 'phone', columnType: 'PHONE', operator: 'IS_EQUAL' },
])
// Detect duplicate leads từ multiple sources
```

## Best Practices

### 1. Choose appropriate operators

```typescript
// ✅ EMAIL → IS_EQUAL
{ columnName: 'email', operator: 'IS_EQUAL' }

// ✅ Name → IS_SIMILAR or IS_FUZZY_MATCH
{ columnName: 'name', operator: 'IS_SIMILAR' }

// ✅ ID/Code → IS_EQUAL
{ columnName: 'externalId', operator: 'IS_EQUAL' }
```

### 2. Use multiple criteria

```typescript
// ✅ Đúng - multiple ways to match
@WorkspaceDuplicateCriteria([
  { columnName: 'email', ... },
  { columnName: 'phone', ... },
  { columnName: 'externalId', ... },
])

// ⚠️ Single criterion có thể miss duplicates
@WorkspaceDuplicateCriteria([
  { columnName: 'name', ... },  // Chỉ name, không đủ
])
```

### 3. Normalize before comparison

System tự động normalize based on columnType:
- EMAIL: lowercase, trim
- PHONE: remove formatting
- TEXT: trim, lowercase (for IS_EQUAL)

### 4. Test fuzzy matching carefully

```typescript
// IS_FUZZY_MATCH có thể có false positives
{ columnName: 'name', operator: 'IS_FUZZY_MATCH' }
// Test thoroughly để tránh wrong matches
```

## Detection Flow

```
1. New record created/updated
         ↓
2. Run duplicate detection với criteria
         ↓
3. Find potential duplicates
         ↓
4. Present to user:
   - Merge duplicates?
   - Keep separate?
   - Add as is?
```

## UI Integration

```typescript
// When creating/editing record
if (duplicatesFound) {
  showDuplicateWarning({
    message: "Potential duplicate found",
    duplicates: [
      { name: "John Doe", email: "john@example.com" },
    ],
    actions: ["Merge", "Keep Separate", "Cancel"],
  });
}
```

## Performance Considerations

### Indexed fields

```typescript
// ✅ Đúng - duplicate criteria fields nên indexed
@WorkspaceField({...})
@WorkspaceFieldIndex()  // Index cho fast duplicate detection
email: string;

@WorkspaceDuplicateCriteria([
  { columnName: 'email', ... },
])
```

### Fuzzy matching cost

```typescript
// IS_FUZZY_MATCH expensive for large tables
// Consider limiting scope:
// - Recent records only
// - Same workspace only
// - Batch processing
```

## Metadata Storage

```typescript
{
  // ... entity metadata
  duplicateCriteria: [
    { columnName: 'email', columnType: 'EMAIL', operator: 'IS_EQUAL' },
  ],
  // ... entity metadata
}
```

## Troubleshooting

### Duplicates not detected

**Kiểm tra:**
1. Criteria columns có data không?
2. Column types đúng không?
3. Operator phù hợp không?
4. Normalization issues?

### False positives

**Giải pháp:**
1. Use IS_EQUAL thay vì IS_FUZZY_MATCH
2. Add more specific criteria
3. Adjust similarity thresholds

### Performance issues

**Giải pháp:**
1. Index duplicate criteria columns
2. Limit scope of duplicate detection
3. Run async/batch processing

## See Also

- [WorkspaceEntity Decorator](./workspace-entity.md)
- [Duplicate Detection System](../../duplicate-detection.md)
- [Merge Records Guide](../../merge-records.md)
