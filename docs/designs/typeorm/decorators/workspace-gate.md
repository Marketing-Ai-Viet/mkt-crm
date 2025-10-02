# WorkspaceGate Decorator

## Tổng quan

`@WorkspaceGate()` kiểm soát entity/field dựa trên feature flags. Cho phép enable/disable features mà không cần deploy code mới. Có thể áp dụng cho cả class và property.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-gate.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceGate(options: WorkspaceGateOptions)
```

## Options

```typescript
interface WorkspaceGateOptions {
  featureFlag: string;              // Bắt buộc - Feature flag key
  excludeFromDatabase?: boolean;    // Default: true
  excludeFromWorkspaceApi?: boolean; // Default: true
}
```

## Ví dụ

### Ví dụ 1: Gate entire entity

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.calendar,
  namePlural: 'calendars',
  labelSingular: msg`Calendar`,
  labelPlural: msg`Calendars`,
})
@WorkspaceGate({
  featureFlag: 'IS_CALENDAR_ENABLED',
})
export class CalendarWorkspaceEntity extends BaseWorkspaceEntity {
  // Entity chỉ tồn tại khi IS_CALENDAR_ENABLED = true
}
```

### Ví dụ 2: Gate specific field

```typescript
@WorkspaceEntity({...})
export class PersonWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: FIELD_IDS.linkedinUrl,
    type: FieldMetadataType.LINK,
    label: msg`LinkedIn`,
  })
  @WorkspaceGate({
    featureFlag: 'IS_LINKEDIN_INTEGRATION_ENABLED',
  })
  @WorkspaceIsNullable()
  linkedinUrl: { url: string; label: string | null } | null;
}
```

### Ví dụ 3: Keep in database but hide from API

```typescript
@WorkspaceField({...})
@WorkspaceGate({
  featureFlag: 'IS_BETA_FEATURE_ENABLED',
  excludeFromDatabase: false,      // Vẫn tạo column
  excludeFromWorkspaceApi: true,   // Nhưng ẩn khỏi GraphQL API
})
betaField: string;
```

### Ví dụ 4: Experimental relation

```typescript
@WorkspaceRelation({
  standardId: FIELD_IDS.aiSuggestions,
  type: RelationType.ONE_TO_MANY,
  label: msg`AI Suggestions`,
  inverseSideTarget: () => AISuggestionEntity,
})
@WorkspaceGate({
  featureFlag: 'IS_AI_ENABLED',
})
aiSuggestions: Relation<AISuggestionEntity[]>;
```

## Feature Flag Types

### Non-public Feature Flags

Chỉ được dùng cho gating:
```typescript
featureFlag: 'IS_CALENDAR_ENABLED'
featureFlag: 'IS_AI_ENABLED'
featureFlag: 'IS_BETA_FEATURE_ENABLED'
```

### Public Feature Flags (KHÔNG được dùng)

```typescript
// ❌ Error: Public flags không thể dùng cho gating
@WorkspaceGate({
  featureFlag: 'IS_PUBLIC_FEATURE',  // ← Public flag
})
// Throws: "Public feature flag cannot be used to gate entities"
```

**Lý do:** Public flags có thể được users toggle, không phù hợp cho structural changes.

## Behavior

### When Feature Flag = true
- ✅ Entity/field xuất hiện trong database
- ✅ Entity/field có trong GraphQL API
- ✅ Có thể query/mutate
- ✅ Hiển thị trong UI

### When Feature Flag = false
- ❌ Entity/field không trong database (nếu excludeFromDatabase = true)
- ❌ Entity/field không trong API (nếu excludeFromWorkspaceApi = true)
- ❌ Không thể query/mutate
- ❌ Không hiển thị trong UI

## Options Chi tiết

### excludeFromDatabase

```typescript
excludeFromDatabase: true  // Default
```
- Database migrations không tạo table/column
- Entity/field không tồn tại trong DB
- **Use case:** Experimental features chưa stable

```typescript
excludeFromDatabase: false
```
- Vẫn tạo table/column trong DB
- Nhưng có thể ẩn khỏi API
- **Use case:** Preparing for future release, data collection

### excludeFromWorkspaceApi

```typescript
excludeFromWorkspaceApi: true  // Default
```
- Không xuất hiện trong GraphQL schema
- Không thể query via API
- **Use case:** Hide từ end users

```typescript
excludeFromWorkspaceApi: false
```
- Vẫn có trong GraphQL API
- Có thể query via API
- **Use case:** Internal tools có thể access

## Use Cases

### 1. Beta Features

```typescript
@WorkspaceEntity({...})
@WorkspaceGate({
  featureFlag: 'IS_BETA_CALENDAR_ENABLED',
})
export class CalendarEntity extends BaseWorkspaceEntity {
  // Chỉ available cho beta testers
}
```

### 2. Paid Features

```typescript
@WorkspaceField({...})
@WorkspaceGate({
  featureFlag: 'HAS_PREMIUM_SUBSCRIPTION',
})
advancedAnalytics: string;
```

### 3. Regional Features

```typescript
@WorkspaceField({...})
@WorkspaceGate({
  featureFlag: 'IS_AVAILABLE_IN_REGION_EU',
})
gdprCompliantField: string;
```

### 4. Experimental Features

```typescript
@WorkspaceField({...})
@WorkspaceGate({
  featureFlag: 'IS_EXPERIMENTAL_AI_ENABLED',
  excludeFromDatabase: false,  // Collect data
  excludeFromWorkspaceApi: true, // But hide from users
})
aiScore: number;
```

### 5. Gradual Rollout

```typescript
@WorkspaceEntity({...})
@WorkspaceGate({
  featureFlag: 'IS_NEW_PIPELINE_ENABLED',
})
export class NewPipelineEntity extends BaseWorkspaceEntity {
  // Rollout dần dần cho users
}
```

## Feature Flag Management

Feature flags được quản lý trong:
```
src/engine/core-modules/feature-flag/enums/feature-flag-key.enum.ts
```

```typescript
export enum FeatureFlagKey {
  IS_CALENDAR_ENABLED = 'IS_CALENDAR_ENABLED',
  IS_AI_ENABLED = 'IS_AI_ENABLED',
  // ...
}
```

## Checking Feature Flags

### In Code

```typescript
const isEnabled = await this.featureFlagService.isFeatureEnabled(
  'IS_CALENDAR_ENABLED',
  workspaceId,
);

if (isEnabled) {
  // Feature logic
}
```

### In Database

```sql
SELECT * FROM feature_flags 
WHERE key = 'IS_CALENDAR_ENABLED' 
AND workspace_id = 'xxx';
```

## Migration Strategy

### Phase 1: Development
```typescript
@WorkspaceGate({
  featureFlag: 'IS_NEW_FEATURE_ENABLED',
  excludeFromDatabase: true,  // Not in DB yet
})
```

### Phase 2: Testing
```typescript
@WorkspaceGate({
  featureFlag: 'IS_NEW_FEATURE_ENABLED',
  excludeFromDatabase: false,     // In DB now
  excludeFromWorkspaceApi: true,  // But hidden
})
```

### Phase 3: Beta
```typescript
@WorkspaceGate({
  featureFlag: 'IS_NEW_FEATURE_BETA',
  excludeFromDatabase: false,
  excludeFromWorkspaceApi: false,  // Visible to beta users
})
```

### Phase 4: GA
```typescript
// Remove @WorkspaceGate entirely
// Feature is now standard
```

## Best Practices

### 1. Clear feature flag naming

```typescript
// ✅ Đúng - descriptive
featureFlag: 'IS_CALENDAR_ENABLED'
featureFlag: 'IS_AI_SUGGESTIONS_ENABLED'
featureFlag: 'HAS_PREMIUM_FEATURES'

// ❌ Sai - vague
featureFlag: 'FEATURE_1'
featureFlag: 'NEW_STUFF'
```

### 2. Document feature flags

```typescript
@WorkspaceGate({
  featureFlag: 'IS_CALENDAR_ENABLED',
  // Document: Calendar integration for Google/Outlook
  // Target: Premium users
  // ETA: Q2 2024
})
```

### 3. Plan removal

Feature gates are temporary:
```typescript
// TODO: Remove gate after Q2 2024 release
@WorkspaceGate({
  featureFlag: 'IS_NEW_FEATURE_ENABLED',
})
```

### 4. Consistent across related items

```typescript
// Entity gated
@WorkspaceEntity({...})
@WorkspaceGate({ featureFlag: 'IS_CALENDAR_ENABLED' })
export class CalendarEntity {
  
  // Related entities should use same flag
  @WorkspaceRelation({...})
  @WorkspaceGate({ featureFlag: 'IS_CALENDAR_ENABLED' })
  events: Relation<CalendarEventEntity[]>;
}
```

### 5. Avoid public flags

```typescript
// ❌ Sai - public flag
@WorkspaceGate({
  featureFlag: 'IS_PUBLIC_FEATURE',
})

// ✅ Đúng - internal flag
@WorkspaceGate({
  featureFlag: 'IS_INTERNAL_FEATURE',
})
```

## Troubleshooting

### Entity/field không xuất hiện

**Kiểm tra:**
1. Feature flag có enabled không?
2. Workspace có access không?
3. excludeFromDatabase setting?
4. excludeFromWorkspaceApi setting?

### Public flag error

**Lỗi**: "Public feature flag cannot be used to gate entities"

**Giải pháp**: Dùng internal (non-public) feature flag

### Migration conflict

**Vấn đề**: Entity gated nhưng migration đã tạo table

**Giải pháp**: Set `excludeFromDatabase: false` hoặc rollback migration

## See Also

- [Feature Flag Service](../../feature-flag-service.md)
- [Feature Flag Keys](../../feature-flag-keys.md)
- [WorkspaceEntity Decorator](./workspace-entity.md)
- [WorkspaceField Decorator](./workspace-field.md)
