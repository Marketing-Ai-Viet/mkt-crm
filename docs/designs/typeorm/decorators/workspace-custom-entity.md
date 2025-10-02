# WorkspaceCustomEntity Decorator

## Tổng quan

`@WorkspaceCustomEntity()` đánh dấu entity là custom entity có thể được mở rộng bởi users. Entities này cho phép dynamic fields và customization. Class decorator.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-custom-entity.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceCustomEntity()
```

## Ví dụ

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.customObject,
  namePlural: 'customObjects',
  labelSingular: msg`Custom Object`,
  labelPlural: msg`Custom Objects`,
})
@WorkspaceCustomEntity()  // Allow user customization
export class CustomObjectWorkspaceEntity extends BaseWorkspaceEntity {
  // Base fields ...
}
```

## Chức năng

Custom entities cho phép:
- ✅ Users tạo custom fields
- ✅ Dynamic schema evolution
- ✅ Workspace-specific customization
- ✅ Extensible data model

## So sánh Standard vs Custom Entities

### Standard Entity

```typescript
@WorkspaceEntity({...})
export class PersonWorkspaceEntity extends BaseWorkspaceEntity {
  // Fixed schema
  // Defined by developers
  // Same across all workspaces
}
```

### Custom Entity

```typescript
@WorkspaceEntity({...})
@WorkspaceCustomEntity()  // ← Extensible
export class CustomObjectWorkspaceEntity extends BaseWorkspaceEntity {
  // Base schema + user-defined fields
  // Extended by workspace admins
  // Different per workspace
}
```

## Metadata Storage

```typescript
metadataArgsStorage.addExtendedEntities({
  target: target,
  gate: gate,  // Optional feature gate
});
```

## Use Cases

### 1. Custom Objects

```typescript
// Base custom object entity
@WorkspaceEntity({...})
@WorkspaceCustomEntity()
export class CustomObjectWorkspaceEntity extends BaseWorkspaceEntity {
  // Users can add fields via UI
}
```

### 2. Extensible Standard Objects

```typescript
// Standard object với custom fields support
@WorkspaceEntity({...})
@WorkspaceCustomEntity()
export class OpportunityWorkspaceEntity extends BaseWorkspaceEntity {
  // Standard fields
  name: string;
  amount: number;
  
  // Users có thể add custom fields:
  // - customField1
  // - customField2
  // - etc.
}
```

## Với Feature Gates

```typescript
@WorkspaceEntity({...})
@WorkspaceGate({
  featureFlag: 'IS_CUSTOM_OBJECTS_ENABLED',
})
@WorkspaceCustomEntity()
export class CustomEntity extends BaseWorkspaceEntity {
  // Chỉ available khi feature enabled
}
```

## Best Practices

### 1. Document extensibility

```typescript
/**
 * Custom entity allowing workspace-specific fields
 * Users can add fields via Settings > Objects
 */
@WorkspaceCustomEntity()
export class CustomObjectEntity extends BaseWorkspaceEntity {}
```

### 2. Provide base fields

```typescript
@WorkspaceEntity({...})
@WorkspaceCustomEntity()
export class CustomEntity extends BaseWorkspaceEntity {
  // Base fields every instance has
  @WorkspaceField({...})
  name: string;
  
  // Users add more fields via UI
}
```

### 3. Consider standard object first

```typescript
// ⚠️ Question: Should this be custom?
// If most workspaces need it → Standard object
// If workspace-specific → Custom object
@WorkspaceCustomEntity()
```

## See Also

- [WorkspaceEntity Decorator](./workspace-entity.md)
- [Custom Objects Guide](../../custom-objects.md)
- [Field Metadata](../../field-metadata.md)
