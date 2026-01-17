# WorkspaceEntity Decorator

## Tổng quan

`@WorkspaceEntity()` là decorator **bắt buộc** ở cấp độ class để định nghĩa một entity trong Twenty ORM. Mọi workspace entity phải có decorator này để được hệ thống nhận diện và sync với database.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-entity.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceEntity(options: WorkspaceEntityOptions)
```

## Options

```typescript
interface WorkspaceEntityOptions {
  standardId: string;                    // Bắt buộc
  namePlural: string;                    // Bắt buộc
  labelSingular: MessageDescriptor;      // Bắt buộc
  labelPlural: MessageDescriptor;        // Bắt buộc
  description?: MessageDescriptor;       // Tùy chọn
  icon?: string;                         // Tùy chọn
  shortcut?: string;                     // Tùy chọn
  labelIdentifierStandardId?: string;    // Tùy chọn
  imageIdentifierStandardId?: string;    // Tùy chọn
}
```

### Chi tiết các tham số

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `standardId` | string | Có | ID duy nhất cho object, thường từ `STANDARD_OBJECT_IDS` |
| `namePlural` | string | Có | Tên số nhiều của entity (camelCase) |
| `labelSingular` | MessageDescriptor | Có | Label số ít cho UI (sử dụng `msg` macro) |
| `labelPlural` | MessageDescriptor | Có | Label số nhiều cho UI (sử dụng `msg` macro) |
| `description` | MessageDescriptor | Không | Mô tả entity |
| `icon` | string | Không | Icon name (e.g., 'IconUser', 'IconBuilding') |
| `shortcut` | string | Không | Keyboard shortcut (e.g., 'N' for Notes) |
| `labelIdentifierStandardId` | string | Không | Field ID dùng làm label identifier (mặc định: id) |
| `imageIdentifierStandardId` | string | Không | Field ID dùng làm image identifier |

## Ví dụ

### Ví dụ 1: Entity cơ bản

```typescript
import { msg } from '@lingui/core/macro';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { STANDARD_OBJECT_IDS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-object-ids';

@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.note,
  namePlural: 'notes',
  labelSingular: msg`Note`,
  labelPlural: msg`Notes`,
  description: msg`A note`,
  icon: 'IconNotes',
  shortcut: 'N',
})
export class NoteWorkspaceEntity extends BaseWorkspaceEntity {
  // ... fields
}
```

### Ví dụ 2: Entity với custom label identifier

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.person,
  namePlural: 'people',
  labelSingular: msg`Person`,
  labelPlural: msg`People`,
  description: msg`A person`,
  icon: 'IconUser',
  labelIdentifierStandardId: PERSON_STANDARD_FIELD_IDS.name, // Sử dụng name thay vì id
})
export class PersonWorkspaceEntity extends BaseWorkspaceEntity {
  // ...
}
```

### Ví dụ 3: Entity với image identifier

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.company,
  namePlural: 'companies',
  labelSingular: msg`Company`,
  labelPlural: msg`Companies`,
  description: msg`A company`,
  icon: 'IconBuildingSkyscraper',
  labelIdentifierStandardId: COMPANY_STANDARD_FIELD_IDS.name,
  imageIdentifierStandardId: COMPANY_STANDARD_FIELD_IDS.logo, // Logo làm image
})
export class CompanyWorkspaceEntity extends BaseWorkspaceEntity {
  // ...
}
```

### Ví dụ 4: Entity với các decorators khác

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.note,
  namePlural: 'notes',
  labelSingular: msg`Note`,
  labelPlural: msg`Notes`,
  description: msg`A note`,
  icon: 'IconNotes',
  shortcut: 'N',
  labelIdentifierStandardId: NOTE_STANDARD_FIELD_IDS.title,
})
@WorkspaceIsSearchable()  // Kích hoạt full-text search
@WorkspaceIsSystem()      // Đánh dấu là system entity
export class NoteWorkspaceEntity extends BaseWorkspaceEntity {
  // ...
}
```

## Metadata được lưu

Decorator này lưu các metadata sau vào `metadataArgsStorage`:

```typescript
{
  target: Class,
  standardId: string,
  nameSingular: string,      // Được convert từ class name
  namePlural: string,
  labelSingular: string,
  labelPlural: string,
  description: string,
  labelIdentifierStandardId: string,
  imageIdentifierStandardId: string | null,
  icon: string | undefined,
  shortcut: string | undefined,
  isAuditLogged: boolean,    // Từ @WorkspaceIsNotAuditLogged
  isSystem: boolean,         // Từ @WorkspaceIsSystem
  gate: object | undefined,  // Từ @WorkspaceGate
  duplicateCriteria: array | undefined,  // Từ @WorkspaceDuplicateCriteria
  isSearchable: boolean,     // Từ @WorkspaceIsSearchable
}
```

## Cách hoạt động

### 1. Đọc metadata từ decorators khác

```typescript
const isAuditLogged = TypedReflect.getMetadata(
  'workspace:is-audit-logged-metadata-args',
  target,
) ?? true;  // Mặc định true

const isSystem = TypedReflect.getMetadata(
  'workspace:is-system-metadata-args',
  target,
) ?? false;  // Mặc định false
```

### 2. Convert class name sang object metadata name

```typescript
const objectName = convertClassNameToObjectMetadataName(target.name);
// NoteWorkspaceEntity → note
// PersonWorkspaceEntity → person
```

### 3. Lưu metadata vào storage

```typescript
metadataArgsStorage.addEntities({
  target,
  standardId: options.standardId,
  nameSingular: objectName,
  namePlural: options.namePlural,
  // ... other metadata
});
```

## Naming Conventions

### Class Name
```typescript
// Format: <EntityName>WorkspaceEntity
export class NoteWorkspaceEntity extends BaseWorkspaceEntity {}
export class PersonWorkspaceEntity extends BaseWorkspaceEntity {}
export class CompanyWorkspaceEntity extends BaseWorkspaceEntity {}
```

### namePlural
```typescript
// Format: camelCase, số nhiều
namePlural: 'notes'        // ✅
namePlural: 'people'       // ✅
namePlural: 'companies'    // ✅
namePlural: 'Notes'        // ❌ Không PascalCase
namePlural: 'note'         // ❌ Phải số nhiều
```

### Icons
Sử dụng icons từ Tabler Icons:
```typescript
icon: 'IconUser'
icon: 'IconBuildingSkyscraper'
icon: 'IconNotes'
icon: 'IconMail'
```

## Label Identifier

`labelIdentifierStandardId` xác định field nào được sử dụng làm "tên" của record trong UI:

```typescript
// Mặc định sử dụng 'id'
labelIdentifierStandardId: BASE_OBJECT_STANDARD_FIELD_IDS.id

// Sử dụng 'name' field
labelIdentifierStandardId: PERSON_STANDARD_FIELD_IDS.name

// Sử dụng 'title' field
labelIdentifierStandardId: NOTE_STANDARD_FIELD_IDS.title
```

Trong UI:
- List view: Hiển thị giá trị của field này
- Record chips: Sử dụng giá trị này
- Breadcrumbs: Hiển thị giá trị này

## Image Identifier

`imageIdentifierStandardId` xác định field chứa image/avatar:

```typescript
imageIdentifierStandardId: COMPANY_STANDARD_FIELD_IDS.logo
imageIdentifierStandardId: PERSON_STANDARD_FIELD_IDS.avatar
```

## Keyboard Shortcuts

```typescript
shortcut: 'N'   // Alt+N (hoặc Cmd+N) để tạo Note mới
shortcut: 'P'   // Alt+P để tạo Person mới
shortcut: 'C'   // Alt+C để tạo Company mới
```

## Kết hợp với decorators khác

### With @WorkspaceIsSystem

```typescript
@WorkspaceEntity({...})
@WorkspaceIsSystem()  // Entity không hiển thị trong UI người dùng
export class SystemEntity extends BaseWorkspaceEntity {}
```

### With @WorkspaceIsSearchable

```typescript
@WorkspaceEntity({...})
@WorkspaceIsSearchable()  // Kích hoạt full-text search
export class SearchableEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    type: FieldMetadataType.TS_VECTOR,
    // ... search vector field
  })
  searchVector: string;
}
```

### With @WorkspaceGate

```typescript
@WorkspaceEntity({...})
@WorkspaceGate({
  featureFlag: 'IS_NEW_FEATURE_ENABLED',
})
export class GatedEntity extends BaseWorkspaceEntity {}
```

### With @WorkspaceIndex

```typescript
@WorkspaceEntity({...})
@WorkspaceIndex(['userId', 'email'], {
  isUnique: true,
  indexWhereClause: '"deletedAt" IS NULL',
})
export class IndexedEntity extends BaseWorkspaceEntity {}
```

## Base Class Requirements

Entity **phải** extend `BaseWorkspaceEntity`:

```typescript
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';

@WorkspaceEntity({...})
export class MyEntity extends BaseWorkspaceEntity {  // ✅ Bắt buộc
  // ...
}
```

`BaseWorkspaceEntity` cung cấp các standard fields:
- `id`: UUID primary key
- `createdAt`: Timestamp
- `updatedAt`: Timestamp
- `deletedAt`: Soft delete timestamp (nullable)

## Standard Object IDs

Luôn sử dụng constants từ `STANDARD_OBJECT_IDS`:

```typescript
import { STANDARD_OBJECT_IDS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-object-ids';

@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.note,  // ✅
  // standardId: 'note-123',              // ❌ Không hardcode
  // ...
})
```

## Migration Generation

Sau khi định nghĩa entity, chạy sync để tạo migrations:

```bash
# Sync metadata
npx nx run twenty-server:command workspace:sync-metadata -f

# Generate migration (nếu cần)
npx nx run twenty-server:typeorm migration:generate src/database/typeorm/core/migrations/AddMyEntity -d src/database/typeorm/core/core.datasource.ts
```

## Validation

Decorator sẽ validate:
- ✅ `standardId` phải có
- ✅ `namePlural` phải có
- ✅ `labelSingular` phải có
- ✅ `labelPlural` phải có

Không validate nhưng nên tuân thủ:
- ⚠️ Class name nên theo format `<Name>WorkspaceEntity`
- ⚠️ `namePlural` nên là camelCase và số nhiều
- ⚠️ Nên sử dụng `msg` macro cho labels

## Troubleshooting

### Entity không xuất hiện trong GraphQL API

**Kiểm tra:**
1. Có `@WorkspaceEntity()` decorator không?
2. Class có extend `BaseWorkspaceEntity` không?
3. Đã chạy sync metadata chưa?
4. Entity có bị `@WorkspaceGate()` block không?

### Entity không được tạo trong database

**Kiểm tra:**
1. Đã chạy sync metadata chưa?
2. Có migration errors không?
3. Entity có trong `metadataArgsStorage` không?

### Label không hiển thị đúng

**Kiểm tra:**
1. Có sử dụng `msg` macro không?
2. i18n có được setup đúng không?
3. Message catalog đã được compile chưa?

## Best Practices

### 1. Luôn sử dụng constants

```typescript
// ✅ Đúng
standardId: STANDARD_OBJECT_IDS.note

// ❌ Sai
standardId: 'note-uuid-here'
```

### 2. Sử dụng msg macro

```typescript
// ✅ Đúng
labelSingular: msg`Note`

// ❌ Sai
labelSingular: 'Note'
```

### 3. Chọn label identifier có ý nghĩa

```typescript
// ✅ Đúng - name có ý nghĩa hơn id
labelIdentifierStandardId: PERSON_STANDARD_FIELD_IDS.name

// ❌ Kém tốt - id không user-friendly
labelIdentifierStandardId: BASE_OBJECT_STANDARD_FIELD_IDS.id
```

### 4. Đặt icon phù hợp

```typescript
// ✅ Đúng - icon phù hợp với entity
icon: 'IconUser'      // cho Person
icon: 'IconNotes'     // cho Note
icon: 'IconBuilding'  // cho Company

// ❌ Sai - icon không liên quan
icon: 'IconTrash'     // cho Person???
```

### 5. Shortcut không trùng lặp

```typescript
// ✅ Đúng - các shortcut khác nhau
shortcut: 'N'  // Note
shortcut: 'P'  // Person
shortcut: 'C'  // Company

// ❌ Sai - shortcut trùng
shortcut: 'N'  // Note
shortcut: 'N'  // Newsletter ??? Conflict!
```

## See Also

- [WorkspaceField Decorator](./workspace-field.md)
- [WorkspaceRelation Decorator](./workspace-relation.md)
- [WorkspaceIsSystem Decorator](./workspace-is-system.md)
- [WorkspaceIsSearchable Decorator](./workspace-is-searchable.md)
- [Base Workspace Entity](../base-workspace-entity.md)
