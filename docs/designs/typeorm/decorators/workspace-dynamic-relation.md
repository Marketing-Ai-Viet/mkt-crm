# WorkspaceDynamicRelation Decorator

## Tổng quan

`@WorkspaceDynamicRelation()` định nghĩa dynamic relation - relation được tạo động dựa trên runtime configuration thay vì compile-time definition. Property decorator cho advanced use cases.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-dynamic-relation.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceDynamicRelation<TClass>(options: WorkspaceDynamicRelationOptions<TClass>)
```

## Options

```typescript
interface WorkspaceDynamicRelationOptions<TClass> {
  type: RelationType;                          // Bắt buộc
  argsFactory: WorkspaceDynamicRelationMetadataArgsFactory; // Bắt buộc
  inverseSideTarget: () => ObjectType<TClass>; // Bắt buộc
  inverseSideFieldKey?: keyof TClass;          // Tùy chọn
  onDelete?: RelationOnDeleteAction;           // Tùy chọn
}
```

### argsFactory

```typescript
type WorkspaceDynamicRelationMetadataArgsFactory = (
  oppositeObjectMetadata: ObjectMetadataEntity,
) => {
  standardId: string;
  name: string;
  label: string;
  description?: string;
  icon?: string;
  joinColumn?: string;
};
```

## Ví dụ

### Ví dụ 1: Dynamic polymorphic relation

```typescript
@WorkspaceEntity({...})
export class ActivityTargetWorkspaceEntity extends BaseWorkspaceEntity {
  // Dynamic relation tới bất kỳ entity nào
  @WorkspaceDynamicRelation({
    type: RelationType.MANY_TO_ONE,
    argsFactory: (oppositeObjectMetadata) => ({
      standardId: oppositeObjectMetadata.id,
      name: oppositeObjectMetadata.nameSingular,
      label: oppositeObjectMetadata.labelSingular,
      description: `ActivityTarget ${oppositeObjectMetadata.labelSingular}`,
      icon: oppositeObjectMetadata.icon,
      joinColumn: `${oppositeObjectMetadata.nameSingular}Id`,
    }),
    inverseSideTarget: () => {
      // Determined at runtime based on targetObjectMetadataId
      return getTargetEntity();
    },
  })
  targetObject: Relation<any>;
}
```

### Ví dụ 2: Generic attachment system

```typescript
@WorkspaceEntity({...})
export class AttachmentWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({...})
  targetObjectMetadataId: string;  // Which entity type
  
  @WorkspaceField({...})
  targetRecordId: string;  // Which specific record
  
  // Dynamic relation
  @WorkspaceDynamicRelation({
    type: RelationType.MANY_TO_ONE,
    argsFactory: (targetMetadata) => ({
      standardId: `attachment-${targetMetadata.id}`,
      name: `attached${targetMetadata.nameSingular}`,
      label: `Attached ${targetMetadata.labelSingular}`,
      joinColumn: 'targetRecordId',
    }),
    inverseSideTarget: () => {
      // Runtime determination
      return resolveEntityByMetadataId();
    },
  })
  attachedTo: Relation<any>;
}
```

### Ví dụ 3: Generic note system

```typescript
@WorkspaceEntity({...})
export class NoteTargetWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({...})
  note: Relation<NoteWorkspaceEntity>;
  
  @WorkspaceField({...})
  targetObjectMetadataId: string;
  
  // Dynamic relation tới target
  @WorkspaceDynamicRelation({
    type: RelationType.MANY_TO_ONE,
    argsFactory: (targetMetadata) => ({
      standardId: `note-target-${targetMetadata.id}`,
      name: targetMetadata.nameSingular,
      label: targetMetadata.labelSingular,
      description: `Note target ${targetMetadata.labelSingular}`,
      icon: targetMetadata.icon,
    }),
    inverseSideTarget: () => resolveTarget(),
    inverseSideFieldKey: 'noteTargets',  // Field name in target entity
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  target: Relation<any>;
}
```

## Key Differences từ WorkspaceRelation

### WorkspaceRelation (Static)

```typescript
@WorkspaceRelation({
  standardId: 'fixed-id',
  label: msg`Company`,
  inverseSideTarget: () => CompanyWorkspaceEntity,  // Fixed type
})
company: Relation<CompanyWorkspaceEntity>;  // Fixed type
```

### WorkspaceDynamicRelation (Dynamic)

```typescript
@WorkspaceDynamicRelation({
  argsFactory: (metadata) => ({
    standardId: metadata.id,  // Dynamic!
    label: metadata.labelSingular,  // Dynamic!
  }),
  inverseSideTarget: () => resolveEntity(),  // Runtime resolution
})
target: Relation<any>;  // Any type
```

## Use Cases

### 1. Polymorphic Associations

```typescript
// Note có thể attach tới Person, Company, Opportunity, etc.
@WorkspaceDynamicRelation({
  argsFactory: (metadata) => ({
    standardId: `note-${metadata.id}`,
    name: metadata.nameSingular,
    label: metadata.labelSingular,
  }),
  inverseSideTarget: () => resolveFromMetadataId(),
})
target: Relation<any>;
```

### 2. Generic Attachment System

```typescript
// Attachments cho bất kỳ entity nào
@WorkspaceDynamicRelation({
  argsFactory: (metadata) => ({
    standardId: `attachment-${metadata.id}`,
    name: `attachedTo${metadata.nameSingular}`,
    label: `Attached to ${metadata.labelSingular}`,
  }),
  inverseSideTarget: () => getTargetEntity(),
})
attachedTo: Relation<any>;
```

### 3. Activity Targets

```typescript
// Activities target multiple entity types
@WorkspaceDynamicRelation({
  argsFactory: (metadata) => ({
    standardId: `activity-${metadata.id}`,
    name: metadata.nameSingular,
    label: metadata.labelSingular,
  }),
  inverseSideTarget: () => resolveActivityTarget(),
})
activityTarget: Relation<any>;
```

### 4. Custom Object Relations

```typescript
// Relations to user-created custom objects
@WorkspaceDynamicRelation({
  argsFactory: (customObjectMetadata) => ({
    standardId: customObjectMetadata.id,
    name: customObjectMetadata.nameSingular,
    label: customObjectMetadata.labelSingular,
  }),
  inverseSideTarget: () => getCustomObject(),
})
customRelation: Relation<any>;
```

## Runtime Resolution

### Target Resolution Pattern

```typescript
// argsFactory được gọi với ObjectMetadataEntity
argsFactory: (oppositeObjectMetadata: ObjectMetadataEntity) => {
  // oppositeObjectMetadata contains:
  // - id
  // - nameSingular, namePlural
  // - labelSingular, labelPlural
  // - icon
  // - description
  // - etc.
  
  return {
    standardId: generateStandardId(oppositeObjectMetadata),
    name: generateName(oppositeObjectMetadata),
    label: generateLabel(oppositeObjectMetadata),
  };
}
```

### Entity Resolution

```typescript
inverseSideTarget: () => {
  // Runtime logic to determine target entity
  const metadataId = getCurrentMetadataId();
  const entityClass = entityRegistry.get(metadataId);
  return entityClass;
}
```

## Metadata Storage

```typescript
metadataArgsStorage.addDynamicRelations({
  target: target.constructor,
  argsFactory: args.argsFactory,  // Factory function stored
  type: args.type,
  inverseSideTarget: args.inverseSideTarget,
  inverseSideFieldKey: args.inverseSideFieldKey,
  onDelete: args.onDelete,
  isSystem: isSystem,
  isNullable: true,  // Always nullable
  isPrimary: false,
  gate: gate,
});
```

## Limitations

### 1. TypeScript typing

```typescript
// Type safety lost
@WorkspaceDynamicRelation({...})
target: Relation<any>;  // Must use 'any'

// Can't use specific types:
// target: Relation<PersonWorkspaceEntity>  ← Won't work dynamically
```

### 2. Compile-time checks

```typescript
// No compile-time validation
// Errors only at runtime
```

### 3. IDE support

```typescript
// Limited autocomplete
// Limited type inference
```

## Best Practices

### 1. Document dynamic behavior

```typescript
/**
 * Dynamic relation to any entity type.
 * Target determined by targetObjectMetadataId field.
 * Supported types: Person, Company, Opportunity
 */
@WorkspaceDynamicRelation({...})
target: Relation<any>;
```

### 2. Validate at runtime

```typescript
// Validate target entity type
if (!isSupportedEntityType(targetObjectMetadataId)) {
  throw new Error(`Unsupported entity type: ${targetObjectMetadataId}`);
}
```

### 3. Provide type guards

```typescript
function isPersonTarget(target: any): target is PersonWorkspaceEntity {
  return target.__typename === 'Person';
}

// Usage
if (isPersonTarget(noteTarget.target)) {
  // TypeScript now knows it's PersonWorkspaceEntity
  console.log(noteTarget.target.email);
}
```

### 4. Use with metadata fields

```typescript
// Store metadata ID
@WorkspaceField({...})
targetObjectMetadataId: string;

// Dynamic relation uses it
@WorkspaceDynamicRelation({
  argsFactory: (metadata) => ({
    standardId: metadata.id,
    // ...
  }),
  // ...
})
target: Relation<any>;
```

## Troubleshooting

### Relation không resolve

**Kiểm tra:**
1. argsFactory có return đúng values không?
2. inverseSideTarget có resolve entity không?
3. Metadata ID có hợp lệ không?
4. Entity có registered trong system không?

### Type errors

**Giải pháp:**
- Use type guards
- Runtime validation
- Proper error handling

### Performance issues

**Giải pháp:**
- Cache entity resolution
- Index metadata ID fields
- Optimize factory function

## When to Use

### ✅ Use WorkspaceDynamicRelation:
- Polymorphic associations
- Custom object relations
- Generic systems (attachments, notes, activities)
- Runtime-determined relations

### ✅ Use WorkspaceRelation:
- Fixed relations
- Known entity types
- Type safety important
- Most standard use cases

## See Also

- [WorkspaceRelation Decorator](./workspace-relation.md)
- [Object Metadata](../../object-metadata.md)
- [Polymorphic Associations](../../polymorphic-associations.md)
- [Custom Objects](../../custom-objects.md)
