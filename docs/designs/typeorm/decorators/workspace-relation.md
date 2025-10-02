# WorkspaceRelation Decorator

## Tổng quan

`@WorkspaceRelation()` định nghĩa mối quan hệ (relation) giữa các entities trong Twenty ORM. Sử dụng decorator này thay vì `@WorkspaceField()` cho relation fields.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-relation.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceRelation<TClass>(options: WorkspaceRelationOptions<TClass>)
```

## Options

```typescript
interface WorkspaceRelationOptions<TClass> {
  standardId: string;                          // Bắt buộc
  type: RelationType;                          // Bắt buộc
  label: MessageDescriptor;                    // Bắt buộc
  inverseSideTarget: () => ObjectType<TClass>; // Bắt buộc
  description?: MessageDescriptor | Function;  // Tùy chọn
  icon?: string;                               // Tùy chọn
  inverseSideFieldKey?: keyof TClass;          // Bắt buộc cho MANY_TO_ONE
  onDelete?: RelationOnDeleteAction;           // Tùy chọn
}
```

## Relation Types

```typescript
enum RelationType {
  ONE_TO_MANY = 'ONE_TO_MANY',
  MANY_TO_ONE = 'MANY_TO_ONE',
}
```

## OnDelete Actions

```typescript
enum RelationOnDeleteAction {
  CASCADE = 'CASCADE',        // Xóa tất cả related records
  SET_NULL = 'SET_NULL',      // Set foreign key thành NULL
  RESTRICT = 'RESTRICT',      // Không cho phép xóa
  NO_ACTION = 'NO_ACTION',    // Không làm gì
}
```

## Ví dụ

### Ví dụ 1: ONE_TO_MANY relation

```typescript
// Parent entity
@WorkspaceEntity({...})
export class NoteWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({
    standardId: NOTE_STANDARD_FIELD_IDS.noteTargets,
    label: msg`Relations`,
    description: msg`Note targets`,
    icon: 'IconArrowUpRight',
    type: RelationType.ONE_TO_MANY,
    inverseSideTarget: () => NoteTargetWorkspaceEntity,
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  noteTargets: Relation<NoteTargetWorkspaceEntity[]>;
}
```

### Ví dụ 2: MANY_TO_ONE relation

```typescript
// Child entity
@WorkspaceEntity({...})
export class NoteTargetWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({
    standardId: NOTE_TARGET_STANDARD_FIELD_IDS.note,
    type: RelationType.MANY_TO_ONE,
    label: msg`Note`,
    description: msg`NoteTarget note`,
    icon: 'IconNotes',
    inverseSideTarget: () => NoteWorkspaceEntity,
    inverseSideFieldKey: 'noteTargets',  // Bắt buộc!
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  note: Relation<NoteWorkspaceEntity> | null;
  
  // Foreign key field
  @WorkspaceField({
    standardId: NOTE_TARGET_STANDARD_FIELD_IDS.noteId,
    type: FieldMetadataType.UUID,
    label: msg`Note ID`,
  })
  @WorkspaceIsNullable()
  @WorkspaceJoinColumn('note')  // Link to relation
  noteId: string | null;
}
```

### Ví dụ 3: Bidirectional relation

```typescript
// Parent: Person
@WorkspaceEntity({...})
export class PersonWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({
    standardId: PERSON_STANDARD_FIELD_IDS.noteTargets,
    type: RelationType.ONE_TO_MANY,
    label: msg`Notes`,
    inverseSideTarget: () => NoteTargetWorkspaceEntity,
    inverseSideFieldKey: 'person',
  })
  noteTargets: Relation<NoteTargetWorkspaceEntity[]>;
}

// Child: NoteTarget
@WorkspaceEntity({...})
export class NoteTargetWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({
    standardId: NOTE_TARGET_STANDARD_FIELD_IDS.person,
    type: RelationType.MANY_TO_ONE,
    label: msg`Person`,
    inverseSideTarget: () => PersonWorkspaceEntity,
    inverseSideFieldKey: 'noteTargets',  // Matches parent field
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  person: Relation<PersonWorkspaceEntity>;
  
  @WorkspaceField({...})
  @WorkspaceJoinColumn('person')
  personId: string;
}
```

### Ví dụ 4: Self-referencing relation

```typescript
@WorkspaceEntity({...})
export class CategoryWorkspaceEntity extends BaseWorkspaceEntity {
  // Parent category
  @WorkspaceRelation({
    standardId: CATEGORY_STANDARD_FIELD_IDS.parent,
    type: RelationType.MANY_TO_ONE,
    label: msg`Parent Category`,
    inverseSideTarget: () => CategoryWorkspaceEntity,
    inverseSideFieldKey: 'children',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  parent: Relation<CategoryWorkspaceEntity> | null;
  
  // Child categories
  @WorkspaceRelation({
    standardId: CATEGORY_STANDARD_FIELD_IDS.children,
    type: RelationType.ONE_TO_MANY,
    label: msg`Sub Categories`,
    inverseSideTarget: () => CategoryWorkspaceEntity,
    inverseSideFieldKey: 'parent',
  })
  children: Relation<CategoryWorkspaceEntity[]>;
}
```

### Ví dụ 5: Relation với CASCADE delete

```typescript
@WorkspaceRelation({
  standardId: COMPANY_STANDARD_FIELD_IDS.people,
  type: RelationType.ONE_TO_MANY,
  label: msg`People`,
  inverseSideTarget: () => PersonWorkspaceEntity,
  onDelete: RelationOnDeleteAction.CASCADE,  // Xóa company → xóa people
})
people: Relation<PersonWorkspaceEntity[]>;
```

### Ví dụ 6: Relation với SET_NULL

```typescript
@WorkspaceRelation({
  standardId: NOTE_STANDARD_FIELD_IDS.author,
  type: RelationType.MANY_TO_ONE,
  label: msg`Author`,
  inverseSideTarget: () => PersonWorkspaceEntity,
  inverseSideFieldKey: 'notes',
  onDelete: RelationOnDeleteAction.SET_NULL,  // Xóa person → noteId = NULL
})
@WorkspaceIsNullable()
author: Relation<PersonWorkspaceEntity> | null;
```

## Relation Type Guide

### ONE_TO_MANY
- **Use case**: Một parent có nhiều children
- **Examples**: 
  - Company → People
  - Note → Attachments
  - Person → Tasks

```typescript
// Parent side
@WorkspaceRelation({
  type: RelationType.ONE_TO_MANY,
  inverseSideTarget: () => ChildEntity,
  // inverseSideFieldKey: optional
})
children: Relation<ChildEntity[]>;
```

### MANY_TO_ONE
- **Use case**: Nhiều children thuộc một parent
- **Examples**:
  - Person → Company
  - Task → Person
  - Attachment → Note

```typescript
// Child side
@WorkspaceRelation({
  type: RelationType.MANY_TO_ONE,
  inverseSideTarget: () => ParentEntity,
  inverseSideFieldKey: 'children',  // Bắt buộc!
})
parent: Relation<ParentEntity>;

@WorkspaceField({...})
@WorkspaceJoinColumn('parent')
parentId: string;
```

## OnDelete Actions Explained

### CASCADE
```typescript
onDelete: RelationOnDeleteAction.CASCADE
```
- Xóa parent → tự động xóa children
- **Use case**: Khi children không có ý nghĩa mà không có parent
- **Example**: Xóa Note → xóa NoteTargets

### SET_NULL
```typescript
onDelete: RelationOnDeleteAction.SET_NULL
```
- Xóa parent → set foreign key = NULL
- **Use case**: Children vẫn có thể tồn tại độc lập
- **Example**: Xóa Author → Note vẫn tồn tại nhưng authorId = NULL
- **Yêu cầu**: Field phải nullable

### RESTRICT
```typescript
onDelete: RelationOnDeleteAction.RESTRICT
```
- Không cho phép xóa parent nếu còn children
- **Use case**: Bắt buộc xử lý children trước
- **Example**: Không xóa Category nếu còn Products

### NO_ACTION
```typescript
onDelete: RelationOnDeleteAction.NO_ACTION
```
- Không làm gì, để database handle
- **Use case**: Hiếm khi dùng trong Twenty

## Relation Import Type

Luôn import `Relation` type từ workspace-sync-metadata:

```typescript
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

// ✅ Đúng
children: Relation<ChildEntity[]>;
parent: Relation<ParentEntity>;

// ❌ Sai
children: ChildEntity[];  // Không dùng trực tiếp
parent: ParentEntity;     // Không dùng trực tiếp
```

## Foreign Key Pattern

### MANY_TO_ONE always needs foreign key field:

```typescript
// 1. Relation field
@WorkspaceRelation({
  type: RelationType.MANY_TO_ONE,
  ...
})
parent: Relation<ParentEntity>;

// 2. Foreign key field
@WorkspaceField({
  type: FieldMetadataType.UUID,
  ...
})
@WorkspaceJoinColumn('parent')  // Link to relation
parentId: string;
```

### ONE_TO_MANY không cần foreign key field

```typescript
// Chỉ cần relation field
@WorkspaceRelation({
  type: RelationType.ONE_TO_MANY,
  ...
})
children: Relation<ChildEntity[]>;
// Không cần childrenIds field
```

## inverseSideFieldKey

### Bắt buộc cho MANY_TO_ONE

```typescript
// Child entity
@WorkspaceRelation({
  type: RelationType.MANY_TO_ONE,
  inverseSideTarget: () => ParentEntity,
  inverseSideFieldKey: 'children',  // Tên field ở parent
})
parent: Relation<ParentEntity>;
```

### Tùy chọn cho ONE_TO_MANY

```typescript
// Parent entity
@WorkspaceRelation({
  type: RelationType.ONE_TO_MANY,
  inverseSideTarget: () => ChildEntity,
  inverseSideFieldKey: 'parent',  // Optional nhưng recommended
})
children: Relation<ChildEntity[]>;
```

## Dynamic Description

Description có thể là function nhận objectMetadata:

```typescript
@WorkspaceRelation({
  standardId: FIELD_IDS.relation,
  type: RelationType.MANY_TO_ONE,
  label: msg`Related Object`,
  description: (objectMetadata: ObjectMetadataEntity) => 
    msg`Related to ${objectMetadata.nameSingular}`,
  inverseSideTarget: () => GenericEntity,
  inverseSideFieldKey: 'relations',
})
relation: Relation<GenericEntity>;
```

## Best Practices

### 1. Luôn define cả 2 sides của relation

```typescript
// ✅ Đúng - bidirectional
// Parent
@WorkspaceRelation({
  type: RelationType.ONE_TO_MANY,
  inverseSideTarget: () => Child,
})
children: Relation<Child[]>;

// Child
@WorkspaceRelation({
  type: RelationType.MANY_TO_ONE,
  inverseSideTarget: () => Parent,
  inverseSideFieldKey: 'children',
})
parent: Relation<Parent>;
```

### 2. Chọn onDelete action phù hợp

```typescript
// ✅ CASCADE khi child phụ thuộc parent
onDelete: RelationOnDeleteAction.CASCADE

// ✅ SET_NULL khi child độc lập
onDelete: RelationOnDeleteAction.SET_NULL
```

### 3. Nullable cho SET_NULL

```typescript
// ✅ Đúng
@WorkspaceRelation({
  onDelete: RelationOnDeleteAction.SET_NULL,
})
@WorkspaceIsNullable()
parent: Relation<Parent> | null;

// ❌ Sai - không nullable
@WorkspaceRelation({
  onDelete: RelationOnDeleteAction.SET_NULL,
})
parent: Relation<Parent>;
```

### 4. Index foreign keys

```typescript
@WorkspaceField({...})
@WorkspaceJoinColumn('parent')  // Tự động tạo index
parentId: string;
```

### 5. System relations

```typescript
@WorkspaceRelation({...})
@WorkspaceIsSystem()  // Ẩn khỏi UI
@WorkspaceIsNullable()
relation: Relation<Entity> | null;
```

## Troubleshooting

### Circular dependency error

**Giải pháp**: Sử dụng arrow function cho inverseSideTarget

```typescript
// ✅ Đúng
inverseSideTarget: () => OtherEntity

// ❌ Sai
inverseSideTarget: OtherEntity
```

### inverseSideFieldKey không match

**Lỗi**: Field name không tồn tại ở inverse side

**Giải pháp**: Kiểm tra tên field khớp chính xác

### Foreign key constraint violation

**Nguyên nhân**: onDelete action không phù hợp

**Giải pháp**: 
- Dùng CASCADE nếu muốn xóa cascade
- Dùng SET_NULL và make field nullable

## See Also

- [WorkspaceField Decorator](./workspace-field.md)
- [WorkspaceJoinColumn Decorator](./workspace-join-column.md)
- [WorkspaceDynamicRelation Decorator](./workspace-dynamic-relation.md)
- [Relation Types](../../relation-types.md)
