# WorkspaceJoinColumn Decorator

## Tổng quan

`@WorkspaceJoinColumn()` kết nối foreign key field với relation field trong MANY_TO_ONE relations. Decorator này tự động tạo index trên foreign key.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-join-column.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceJoinColumn(relationPropertyKey: string)
```

## Tham số

- `relationPropertyKey`: Tên của relation property trong cùng entity

## Ví dụ

### Ví dụ 1: Basic join column

```typescript
@WorkspaceEntity({...})
export class PersonWorkspaceEntity extends BaseWorkspaceEntity {
  // Relation field
  @WorkspaceRelation({
    standardId: FIELD_IDS.company,
    type: RelationType.MANY_TO_ONE,
    label: msg`Company`,
    inverseSideTarget: () => CompanyWorkspaceEntity,
    inverseSideFieldKey: 'people',
  })
  @WorkspaceIsNullable()
  company: Relation<CompanyWorkspaceEntity> | null;
  
  // Foreign key field
  @WorkspaceField({
    standardId: FIELD_IDS.companyId,
    type: FieldMetadataType.UUID,
    label: msg`Company ID`,
  })
  @WorkspaceIsNullable()
  @WorkspaceJoinColumn('company')  // Links to 'company' relation
  companyId: string | null;
}
```

### Ví dụ 2: Multiple relations

```typescript
@WorkspaceEntity({...})
export class TaskWorkspaceEntity extends BaseWorkspaceEntity {
  // Assignee relation
  @WorkspaceRelation({
    standardId: FIELD_IDS.assignee,
    type: RelationType.MANY_TO_ONE,
    label: msg`Assignee`,
    inverseSideTarget: () => PersonWorkspaceEntity,
    inverseSideFieldKey: 'assignedTasks',
  })
  @WorkspaceIsNullable()
  assignee: Relation<PersonWorkspaceEntity> | null;
  
  @WorkspaceField({...})
  @WorkspaceJoinColumn('assignee')  // Links to 'assignee'
  assigneeId: string | null;
  
  // Created by relation
  @WorkspaceRelation({
    standardId: FIELD_IDS.createdBy,
    type: RelationType.MANY_TO_ONE,
    label: msg`Created By`,
    inverseSideTarget: () => PersonWorkspaceEntity,
    inverseSideFieldKey: 'createdTasks',
  })
  @WorkspaceIsNullable()
  createdBy: Relation<PersonWorkspaceEntity> | null;
  
  @WorkspaceField({...})
  @WorkspaceJoinColumn('createdBy')  // Links to 'createdBy'
  createdById: string | null;
}
```

### Ví dụ 3: Required relation

```typescript
@WorkspaceEntity({...})
export class NoteTargetWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({
    standardId: FIELD_IDS.note,
    type: RelationType.MANY_TO_ONE,
    label: msg`Note`,
    inverseSideTarget: () => NoteWorkspaceEntity,
    inverseSideFieldKey: 'noteTargets',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  note: Relation<NoteWorkspaceEntity>;  // Required (not nullable)
  
  @WorkspaceField({...})
  @WorkspaceJoinColumn('note')
  noteId: string;  // Required (not nullable)
}
```

## Chức năng

### 1. Link Foreign Key với Relation

```typescript
@WorkspaceRelation({...})
parent: Relation<ParentEntity>;

@WorkspaceJoinColumn('parent')  // ← Kết nối với relation 'parent'
parentId: string;
```

### 2. Tự động tạo Index

```typescript
@WorkspaceJoinColumn('parent')
parentId: string;

// Internally calls:
// WorkspaceFieldIndex()(object, propertyKey);
// → Tạo index trên parentId
```

### 3. Metadata Storage

```typescript
metadataArgsStorage.addJoinColumns({
  target: object.constructor,
  relationName: relationPropertyKey,  // 'parent'
  joinColumn: propertyKey.toString(), // 'parentId'
});
```

## Pattern chuẩn

### MANY_TO_ONE relation pattern

```typescript
// 1. Relation field
@WorkspaceRelation({
  type: RelationType.MANY_TO_ONE,
  inverseSideTarget: () => ParentEntity,
  inverseSideFieldKey: 'children',
})
parent: Relation<ParentEntity>;

// 2. Foreign key field
@WorkspaceField({
  type: FieldMetadataType.UUID,
  ...
})
@WorkspaceJoinColumn('parent')  // ← Kết nối relation
parentId: string;
```

### Naming convention

```typescript
// ✅ Đúng - consistent naming
company: Relation<Company>
companyId: string  // relation name + 'Id'

author: Relation<Person>
authorId: string

// ❌ Sai - inconsistent
company: Relation<Company>
compId: string  // Không theo convention
```

## Nullable Consistency

Foreign key và relation phải cùng nullable/required:

```typescript
// ✅ Đúng - cả 2 nullable
@WorkspaceRelation({
  onDelete: RelationOnDeleteAction.SET_NULL,
})
@WorkspaceIsNullable()
parent: Relation<Parent> | null;

@WorkspaceField({...})
@WorkspaceIsNullable()
@WorkspaceJoinColumn('parent')
parentId: string | null;

// ✅ Đúng - cả 2 required
@WorkspaceRelation({
  onDelete: RelationOnDeleteAction.CASCADE,
})
parent: Relation<Parent>;

@WorkspaceField({...})
@WorkspaceJoinColumn('parent')
parentId: string;

// ❌ Sai - không consistent
@WorkspaceRelation({...})
@WorkspaceIsNullable()
parent: Relation<Parent> | null;

@WorkspaceField({...})
// Missing @WorkspaceIsNullable()
@WorkspaceJoinColumn('parent')
parentId: string;  // ← Should be string | null
```

## Auto-indexing

`@WorkspaceJoinColumn` tự động tạo index:

```typescript
@WorkspaceJoinColumn('parent')
parentId: string;

// Không cần thêm:
// @WorkspaceFieldIndex()  ← Redundant!
```

## ONE_TO_MANY không cần JoinColumn

```typescript
// Parent side (ONE_TO_MANY)
@WorkspaceRelation({
  type: RelationType.ONE_TO_MANY,
  inverseSideTarget: () => ChildEntity,
})
children: Relation<ChildEntity[]>;
// ← Không cần foreign key field!
// ← Không cần @WorkspaceJoinColumn!

// Child side (MANY_TO_ONE)
@WorkspaceRelation({
  type: RelationType.MANY_TO_ONE,
  inverseSideTarget: () => ParentEntity,
  inverseSideFieldKey: 'children',
})
parent: Relation<ParentEntity>;

@WorkspaceField({...})
@WorkspaceJoinColumn('parent')  // ← Chỉ ở child side
parentId: string;
```

## Validation

### Runtime Error

```typescript
@WorkspaceJoinColumn('nonExistentRelation')
// ✗ Error: Relation 'nonExistentRelation' không tồn tại
```

### Compile-time (TypeScript)

```typescript
@WorkspaceJoinColumn('parent')
parentId: string;
// TypeScript sẽ check: 'parent' property có tồn tại không?
```

## Database Mapping

```typescript
@WorkspaceJoinColumn('company')
companyId: string;

// → Database:
// FOREIGN KEY (companyId) REFERENCES company(id)
// CREATE INDEX IDX_xxx ON person(companyId)
```

## Best Practices

### 1. Naming consistency

```typescript
// ✅ Field name = relation name + 'Id'
company: Relation<Company>
companyId: string

parent: Relation<Parent>
parentId: string
```

### 2. Always use with MANY_TO_ONE

```typescript
// ✅ MANY_TO_ONE → cần join column
@WorkspaceRelation({ type: RelationType.MANY_TO_ONE })
parent: Relation<Parent>;

@WorkspaceJoinColumn('parent')
parentId: string;

// ❌ ONE_TO_MANY → không cần join column
@WorkspaceRelation({ type: RelationType.ONE_TO_MANY })
children: Relation<Child[]>;
// Không có childrenIds field
```

### 3. Nullable consistency

```typescript
// ✅ Consistent nullability
@WorkspaceIsNullable()
parent: Relation<Parent> | null;

@WorkspaceIsNullable()
@WorkspaceJoinColumn('parent')
parentId: string | null;
```

### 4. Don't add extra index

```typescript
// ✅ Đúng
@WorkspaceJoinColumn('parent')
parentId: string;

// ❌ Redundant
@WorkspaceJoinColumn('parent')
@WorkspaceFieldIndex()  // ← Không cần, đã có index!
parentId: string;
```

## Troubleshooting

### Foreign key constraint violation

**Lỗi**: Insert fails với foreign key violation

**Nguyên nhân:** parentId references non-existent parent

**Giải pháp:**
- Ensure parent exists before insert
- Use nullable + SET_NULL
- Check onDelete action

### Relation không load

**Vấn đề:** Query không populate relation

**Kiểm tra:**
1. Join column đúng chưa?
2. Relation field name đúng chưa?
3. inverseSideFieldKey đúng chưa?

### Index không được tạo

**Nguyên nhân:** Sync metadata chưa chạy

**Giải pháp:**
```bash
npx nx run twenty-server:command workspace:sync-metadata -f
```

## See Also

- [WorkspaceRelation Decorator](./workspace-relation.md)
- [WorkspaceFieldIndex Decorator](./workspace-field-index.md)
- [Relation Types](../../relation-types.md)
