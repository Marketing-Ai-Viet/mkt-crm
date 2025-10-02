# WorkspaceIsSystem Decorator

## Tổng quan

`@WorkspaceIsSystem()` đánh dấu entity hoặc field là system-level, không hiển thị trong UI người dùng thường. Có thể áp dụng cho cả class và property.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-is-system.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceIsSystem()  // Class hoặc Property decorator
```

## Ví dụ

### Class-level: System Entity

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.auditLog,
  namePlural: 'auditLogs',
  labelSingular: msg`Audit Log`,
  labelPlural: msg`Audit Logs`,
})
@WorkspaceIsSystem()  // Toàn bộ entity là system
export class AuditLogWorkspaceEntity extends BaseWorkspaceEntity {
  // ...
}
```

### Property-level: System Field

```typescript
@WorkspaceEntity({...})
export class PersonWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
  })
  @WorkspaceIsSystem()  // Field này là system
  position: number;
  
  @WorkspaceField({
    standardId: FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
  })
  // Field này không phải system, hiển thị trong UI
  name: string;
}
```

### System Relation

```typescript
@WorkspaceRelation({
  standardId: FIELD_IDS.noteTargets,
  type: RelationType.ONE_TO_MANY,
  label: msg`Note Targets`,
  inverseSideTarget: () => NoteTargetWorkspaceEntity,
})
@WorkspaceIsSystem()  // Relation ẩn khỏi UI
@WorkspaceIsNullable()
noteTargets: Relation<NoteTargetWorkspaceEntity[]>;
```

## Đặc điểm

### System Entity (@WorkspaceIsSystem trên class)
- ❌ Không hiển thị trong object list
- ❌ Không thể tạo qua UI
- ❌ Không xuất hiện trong API explorer
- ✅ Vẫn có GraphQL API
- ✅ Có thể query programmatically
- ✅ Có trong database

### System Field (@WorkspaceIsSystem trên property)
- ❌ Không hiển thị trong field list
- ❌ Không thể edit qua UI
- ❌ Không xuất hiện trong form
- ✅ Vẫn có trong GraphQL schema
- ✅ Có thể query/mutation via API
- ✅ Có trong database

## Use Cases

### 1. Internal Tracking Fields

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.position,
  type: FieldMetadataType.POSITION,
  label: msg`Position`,
  defaultValue: 0,
})
@WorkspaceIsSystem()
position: number;  // Vị trí sắp xếp, không cần user thấy
```

### 2. Search Vectors

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
searchVector: string;  // Generated field cho full-text search
```

### 3. Join Tables

```typescript
@WorkspaceEntity({...})
@WorkspaceIsSystem()  // Junction table, không cần UI
export class NoteTargetWorkspaceEntity extends BaseWorkspaceEntity {
  // Mapping table giữa Note và các targets
}
```

### 4. Audit/Log Entities

```typescript
@WorkspaceEntity({...})
@WorkspaceIsSystem()  // Audit data, chỉ admin xem
export class AuditLogWorkspaceEntity extends BaseWorkspaceEntity {
  // Tracking changes
}
```

## Kết hợp với decorators khác

```typescript
@WorkspaceField({...})
@WorkspaceIsSystem()
@WorkspaceIsNullable()
@WorkspaceFieldIndex()
field: string | null;
```

## Best Practices

### 1. Dùng cho implementation details

```typescript
// ✅ Đúng - internal field
@WorkspaceField({...})
@WorkspaceIsSystem()
position: number;

// ❌ Sai - user-facing field
@WorkspaceField({...})
@WorkspaceIsSystem()
name: string;  // Name nên hiển thị cho user
```

### 2. System entities cho junction tables

```typescript
// ✅ Đúng - junction table
@WorkspaceEntity({...})
@WorkspaceIsSystem()
export class PersonCompanyWorkspaceEntity {
  // Many-to-many mapping
}
```

### 3. Generated/computed fields

```typescript
// ✅ Đúng - generated field
@WorkspaceField({
  generatedType: 'STORED',
  asExpression: '...',
})
@WorkspaceIsSystem()
computed: string;
```

## Mặc định

- Entities: `isSystem = false` (hiển thị trong UI)
- Fields: `isSystem = false` (hiển thị trong UI)

## See Also

- [WorkspaceEntity Decorator](./workspace-entity.md)
- [WorkspaceField Decorator](./workspace-field.md)
- [WorkspaceIsNotAuditLogged Decorator](./workspace-is-not-audit-logged.md)
