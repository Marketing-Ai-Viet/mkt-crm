# Twenty ORM Workspace Decorators Guide

Tài liệu chi tiết về các decorators trong Twenty ORM được sử dụng để định nghĩa WorkspaceEntity trong hệ thống CRM.

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Entity Decorators](#entity-decorators)
   - [@WorkspaceEntity](#workspaceentity)
   - [@WorkspaceCustomEntity](#workspacecustomentity)
3. [Field Decorators](#field-decorators)
   - [@WorkspaceField](#workspacefield)
   - [@WorkspaceIsNullable](#workspaceisnullable)
   - [@WorkspaceIsUnique](#workspaceisunique)
   - [@WorkspaceIsPrimaryField](#workspaceisprimaryfield)
   - [@WorkspaceIsDeprecated](#workspaceisdeprecated)
4. [Relation Decorators](#relation-decorators)
   - [@WorkspaceRelation](#workspacerelation)
   - [@WorkspaceDynamicRelation](#workspacedynamicrelation)
   - [@WorkspaceJoinColumn](#workspacejoincolumn)
5. [Index Decorators](#index-decorators)
   - [@WorkspaceIndex](#workspaceindex)
   - [@WorkspaceFieldIndex](#workspacefieldindex)
6. [Entity Behavior Decorators](#entity-behavior-decorators)
   - [@WorkspaceIsSystem](#workspaceissystem)
   - [@WorkspaceIsSearchable](#workspaceissearchable)
   - [@WorkspaceIsNotAuditLogged](#workspaceisnotauditlogged)
   - [@WorkspaceDuplicateCriteria](#workspaceduplicatecriteria)
7. [Feature Flag Decorator](#feature-flag-decorator)
   - [@WorkspaceGate](#workspacegate)
8. [Best Practices](#best-practices)

---

## Tong quan

Twenty ORM sử dụng hệ thống decorator pattern để định nghĩa metadata cho các WorkspaceEntity. Các decorators này được lưu trữ trong `metadataArgsStorage` và được sử dụng bởi engine để:

- Tạo schema GraphQL tự động
- Sync metadata với database
- Quản lý relations giữa các entities
- Tạo indexes và constraints
- Kiểm soát visibility và behavior của entities/fields

**Thư mục chứa decorators:**
```
packages/twenty-server/src/engine/twenty-orm/decorators/
```

---

## Entity Decorators

### @WorkspaceEntity

**Mục đích:** Decorator chính để định nghĩa một WorkspaceEntity (tương đương với một Table trong database).

**File:** `workspace-entity.decorator.ts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `standardId` | `string` | Yes | ID duy nhất của entity (thường định nghĩa trong constants) |
| `namePlural` | `string` | Yes | Tên số nhiều của entity (dùng cho API) |
| `labelSingular` | `MessageDescriptor` | Yes | Label hiển thị số ít (hỗ trợ i18n với @lingui) |
| `labelPlural` | `MessageDescriptor` | Yes | Label hiển thị số nhiều |
| `description` | `MessageDescriptor` | No | Mô tả entity |
| `icon` | `string` | No | Icon name (e.g., 'IconBuilding') |
| `shortcut` | `string` | No | Keyboard shortcut |
| `labelIdentifierStandardId` | `string` | No | Field ID dùng làm label identifier (default: id) |
| `imageIdentifierStandardId` | `string` | No | Field ID dùng làm image identifier |

**Metadata được đọc từ các decorator khác:**
- `isAuditLogged` (từ @WorkspaceIsNotAuditLogged, default: true)
- `isSystem` (từ @WorkspaceIsSystem, default: false)
- `gate` (từ @WorkspaceGate)
- `duplicateCriteria` (từ @WorkspaceDuplicateCriteria)
- `isSearchable` (từ @WorkspaceIsSearchable, default: false)

**Vi du su dung:**

```typescript
import { msg } from '@lingui/core/macro';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_DEPARTMENT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDepartment,
  namePlural: 'mktDepartments',
  labelSingular: msg`Department`,
  labelPlural: msg`Departments`,
  description: msg`Departments in the marketing system.`,
  icon: 'IconBuilding',
  shortcut: 'D',
  labelIdentifierStandardId: MKT_DEPARTMENT_FIELD_IDS.departmentCode,
})
export class MktDepartmentWorkspaceEntity extends BaseWorkspaceEntity {
  // fields...
}
```

**Luu y quan trong:**
- Entity class PHẢI extend `BaseWorkspaceEntity`
- `standardId` phải là unique và immutable (không thay đổi sau khi đã deploy)
- Tên class sẽ được convert thành `nameSingular` (VD: `MktDepartmentWorkspaceEntity` -> `mktDepartment`)

---

### @WorkspaceCustomEntity

**Mục đích:** Decorator để đánh dấu entity là custom entity (entity mở rộng, không phải standard entity).

**File:** `workspace-custom-entity.decorator.ts`

**Parameters:** Không có parameters

**Vi du su dung:**

```typescript
import { WorkspaceCustomEntity } from 'src/engine/twenty-orm/decorators/workspace-custom-entity.decorator';

@WorkspaceCustomEntity()
export class CustomWorkspaceEntity extends BaseWorkspaceEntity {
  // Custom fields...
}
```

**Luu y:**
- Decorator này đọc metadata `gate` từ @WorkspaceGate nếu có
- Thường dùng cho các entity được tạo động bởi user

---

## Field Decorators

### @WorkspaceField

**Mục đích:** Decorator chính để định nghĩa một field trong entity.

**File:** `workspace-field.decorator.ts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `standardId` | `string` | Yes | ID duy nhất của field |
| `type` | `FieldMetadataType` | Yes | Kiểu dữ liệu của field |
| `label` | `MessageDescriptor` | Yes | Label hiển thị (hỗ trợ i18n) |
| `description` | `MessageDescriptor` | No | Mô tả field |
| `icon` | `string` | No | Icon name |
| `defaultValue` | `FieldMetadataDefaultValue<T>` | No | Giá trị mặc định |
| `options` | `FieldMetadataOptions<T>` | No | Options cho SELECT/MULTI_SELECT |
| `settings` | `FieldMetadataSettings<T>` | No | Cài đặt bổ sung |
| `isActive` | `boolean` | No | Field có active không |
| `generatedType` | `'STORED' \| 'VIRTUAL'` | No | Kiểu generated column |
| `asExpression` | `string` | No | SQL expression cho generated column |

**FieldMetadataType có thể sử dụng:**

| Type | Description |
|------|-------------|
| `UUID` | UUID field |
| `TEXT` | Text field |
| `PHONES` | Phone numbers (composite) |
| `EMAILS` | Email addresses (composite) |
| `DATE_TIME` | DateTime field |
| `DATE` | Date field (no time) |
| `BOOLEAN` | Boolean field |
| `NUMBER` | Number field (integer/float) |
| `NUMERIC` | Numeric with precision |
| `LINKS` | URL links (composite) |
| `CURRENCY` | Currency value (composite) |
| `FULL_NAME` | Full name (composite) |
| `RATING` | Rating field |
| `SELECT` | Single select |
| `MULTI_SELECT` | Multi select |
| `POSITION` | Position/order field |
| `ADDRESS` | Address (composite) |
| `RAW_JSON` | JSON field |
| `RICH_TEXT` | Rich text (deprecated) |
| `RICH_TEXT_V2` | Rich text v2 |
| `ACTOR` | Actor metadata (composite) |
| `ARRAY` | Array field |
| `TS_VECTOR` | Full-text search vector |

**Metadata được đọc từ các decorator khác:**
- `isPrimary` (từ @WorkspaceIsPrimaryField)
- `isNullable` (từ @WorkspaceIsNullable)
- `isSystem` (từ @WorkspaceIsSystem)
- `gate` (từ @WorkspaceGate)
- `isDeprecated` (từ @WorkspaceIsDeprecated)
- `isUnique` (từ @WorkspaceIsUnique)

**Vi du su dung:**

```typescript
import { FieldMetadataType } from 'twenty-shared/types';
import { msg } from '@lingui/core/macro';

// Text field cơ bản
@WorkspaceField({
  standardId: MKT_DEPARTMENT_FIELD_IDS.departmentCode,
  type: FieldMetadataType.TEXT,
  label: msg`Department Code`,
  description: msg`Unique department identifier`,
  icon: 'IconCode',
})
@WorkspaceIsUnique()
departmentCode: string;

// Boolean field với default value
@WorkspaceField({
  standardId: MKT_DEPARTMENT_FIELD_IDS.isActive,
  type: FieldMetadataType.BOOLEAN,
  label: msg`Is Active`,
  description: msg`Whether this department is active`,
  icon: 'IconCheck',
  defaultValue: true,
})
@WorkspaceIsNullable()
isActive?: boolean;

// SELECT field với options
@WorkspaceField({
  standardId: MKT_DEPARTMENT_FIELD_IDS.departmentType,
  type: FieldMetadataType.SELECT,
  label: msg`Department Type`,
  icon: 'IconBuildingCommunity',
  options: [
    { label: 'Headquarters', value: 'HEADQUARTERS', color: 'blue' },
    { label: 'Branch', value: 'BRANCH', color: 'green' },
    { label: 'Department', value: 'DEPARTMENT', color: 'orange' },
  ],
})
@WorkspaceIsNullable()
departmentType: string | null;

// Generated column (TS_VECTOR cho full-text search)
@WorkspaceField({
  standardId: MKT_DEPARTMENT_FIELD_IDS.searchVector,
  type: FieldMetadataType.TS_VECTOR,
  label: msg`Search Vector`,
  icon: 'IconSearch',
  generatedType: 'STORED',
  asExpression: getTsVectorColumnExpressionFromFields(SEARCH_FIELDS),
})
@WorkspaceIsNullable()
@WorkspaceIsSystem()
@WorkspaceFieldIndex({ indexType: IndexType.GIN })
searchVector: string;

// RAW_JSON field
@WorkspaceField({
  standardId: MKT_DEPARTMENT_FIELD_IDS.metadata,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Metadata`,
  description: msg`Additional metadata`,
  icon: 'IconInfoCircle',
})
@WorkspaceIsNullable()
metadata?: JSON | null;

// ACTOR field (composite type)
@WorkspaceField({
  standardId: MKT_DEPARTMENT_FIELD_IDS.createdBy,
  type: FieldMetadataType.ACTOR,
  label: msg`Created by`,
  icon: 'IconCreativeCommonsSa',
})
createdBy: ActorMetadata;
```

---

### @WorkspaceIsNullable

**Mục đích:** Đánh dấu field có thể nhận giá trị NULL.

**File:** `workspace-is-nullable.decorator.ts`

**Parameters:** Không có parameters

**Vi du su dung:**

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.description,
  type: FieldMetadataType.TEXT,
  label: msg`Description`,
})
@WorkspaceIsNullable()
description?: string;
```

**Luu y:**
- Decorator này PHẢI đặt SAU @WorkspaceField
- TypeScript type nên có `?` hoặc `| null`

---

### @WorkspaceIsUnique

**Mục đích:** Đánh dấu field có giá trị unique và tự động tạo unique index.

**File:** `workspace-is-unique.decorator.ts`

**Parameters:** Không có parameters

**Vi du su dung:**

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.code,
  type: FieldMetadataType.TEXT,
  label: msg`Code`,
})
@WorkspaceIsUnique()
code: string;
```

**Luu y:**
- Decorator này tự động tạo unique index với tên format: `IDX_UNIQUE_{hash}`
- Metadata `isUnique: true` sẽ được set

---

### @WorkspaceIsPrimaryField

**Mục đích:** Đánh dấu field là primary identifier (không phải primary key).

**File:** `workspace-is-primary-field.decorator.ts`

**Parameters:** Không có parameters

**Vi du su dung:**

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.name,
  type: FieldMetadataType.TEXT,
  label: msg`Name`,
})
@WorkspaceIsPrimaryField()
name: string;
```

**Luu y:**
- Đây là primary field để hiển thị, KHÔNG phải primary key của database
- Thường dùng cho field name/title

---

### @WorkspaceIsDeprecated

**Mục đích:** Đánh dấu field đã deprecated (sẽ bị loại bỏ trong tương lai).

**File:** `workspace-is-deprecated.decorator.ts`

**Parameters:** Không có parameters

**Vi du su dung:**

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.oldField,
  type: FieldMetadataType.TEXT,
  label: msg`Old Field`,
})
@WorkspaceIsDeprecated()
oldField: string;
```

---

## Relation Decorators

### @WorkspaceRelation

**Mục đích:** Định nghĩa relation giữa các entities.

**File:** `workspace-relation.decorator.ts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `standardId` | `string` | Yes | ID duy nhất của relation |
| `label` | `MessageDescriptor` | Yes | Label hiển thị |
| `description` | `MessageDescriptor \| Function` | No | Mô tả (có thể là function nhận objectMetadata) |
| `icon` | `string` | No | Icon name |
| `type` | `RelationType` | Yes | Loại relation |
| `inverseSideTarget` | `() => ObjectType<TClass>` | Yes | Target entity class |
| `inverseSideFieldKey` | `keyof TClass` | Conditional | Key của field bên inverse side |
| `onDelete` | `RelationOnDeleteAction` | No | Action khi delete |

**RelationType:**

| Type | Description |
|------|-------------|
| `ONE_TO_MANY` | 1 entity chứa nhiều entities con |
| `MANY_TO_ONE` | Nhiều entities thuộc về 1 entity cha |

**RelationOnDeleteAction:**

| Action | Description |
|--------|-------------|
| `CASCADE` | Xóa các records liên quan |
| `RESTRICT` | Không cho xóa nếu có records liên quan |
| `SET_NULL` | Set FK thành NULL |
| `NO_ACTION` | Không làm gì |

**Vi du su dung:**

```typescript
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

// ONE_TO_MANY: Department có nhiều People
@WorkspaceRelation({
  standardId: MKT_DEPARTMENT_FIELD_IDS.staffMembers,
  type: RelationType.ONE_TO_MANY,
  label: msg`People`,
  description: msg`People in this department`,
  icon: 'IconUsers',
  inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
  inverseSideFieldKey: 'department',
})
people: Relation<WorkspaceMemberWorkspaceEntity[]>;

// MANY_TO_ONE: Department thuộc về một Manager
@WorkspaceRelation({
  standardId: MKT_DEPARTMENT_FIELD_IDS.manager,
  type: RelationType.MANY_TO_ONE,
  label: msg`Manager`,
  description: msg`The manager of this department`,
  icon: 'IconCrown',
  inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
  inverseSideFieldKey: 'managerForMktDepartments',
})
manager: Relation<WorkspaceMemberWorkspaceEntity>;

// Với MANY_TO_ONE, thường kèm theo @WorkspaceJoinColumn
@WorkspaceJoinColumn('manager')
managerId: string | null;
```

**Luu y quan trong:**
- `MANY_TO_ONE` BẮT BUỘC phải có `inverseSideFieldKey`
- ONE_TO_MANY relation type là `Relation<Entity[]>` (array)
- MANY_TO_ONE relation type là `Relation<Entity>` (single)
- Nên khai báo `@WorkspaceJoinColumn` cho MANY_TO_ONE để expose FK field

---

### @WorkspaceDynamicRelation

**Mục đích:** Định nghĩa dynamic relation - relation được tạo động dựa trên metadata của custom objects.

**File:** `workspace-dynamic-relation.decorator.ts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `RelationType` | Yes | Loại relation |
| `argsFactory` | `WorkspaceDynamicRelationMetadataArgsFactory` | Yes | Factory function trả về metadata |
| `inverseSideTarget` | `() => ObjectType<TClass>` | Yes | Target entity class |
| `inverseSideFieldKey` | `keyof TClass` | No | Key của field bên inverse side |
| `onDelete` | `RelationOnDeleteAction` | No | Action khi delete |

**argsFactory signature:**
```typescript
(oppositeObjectMetadata: ObjectMetadataEntity) => {
  standardId: string;
  name: string;
  label: string;
  description?: string;
  icon?: string;
  joinColumn?: string;
}
```

**Vi du su dung:**

```typescript
import { WorkspaceDynamicRelation } from 'src/engine/twenty-orm/decorators/workspace-dynamic-relation.decorator';
import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';

@WorkspaceDynamicRelation({
  type: RelationType.MANY_TO_ONE,
  argsFactory: (oppositeObjectMetadata) => ({
    standardId: NOTE_TARGET_STANDARD_FIELD_IDS.custom,
    name: oppositeObjectMetadata.nameSingular,
    label: oppositeObjectMetadata.labelSingular,
    description: `NoteTarget ${oppositeObjectMetadata.labelSingular}`,
    joinColumn: `${oppositeObjectMetadata.nameSingular}Id`,
    icon: 'IconBuildingSkyscraper',
  }),
  inverseSideTarget: () => CustomWorkspaceEntity,
  inverseSideFieldKey: 'noteTargets',
  onDelete: RelationOnDeleteAction.CASCADE,
})
custom: Relation<CustomWorkspaceEntity>;
```

**Luu y:**
- Sử dụng khi cần tạo relation với custom entities (user-defined)
- Factory function được gọi với metadata của mỗi custom object

---

### @WorkspaceJoinColumn

**Mục đích:** Định nghĩa join column (foreign key) cho MANY_TO_ONE relation.

**File:** `workspace-join-column.decorator.ts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `relationPropertyKey` | `string` | Yes | Tên của relation property |

**Vi du su dung:**

```typescript
@WorkspaceRelation({
  standardId: FIELD_IDS.customer,
  type: RelationType.MANY_TO_ONE,
  label: msg`Customer`,
  inverseSideTarget: () => CustomerWorkspaceEntity,
  inverseSideFieldKey: 'orders',
})
customer: Relation<CustomerWorkspaceEntity>;

@WorkspaceJoinColumn('customer')
customerId: string | null;
```

**Luu y:**
- Decorator này tự động tạo index cho join column
- Tên field thường là `{relationName}Id`
- Type thường là `string | null`

---

## Index Decorators

### @WorkspaceIndex

**Mục đích:** Tạo composite index trên nhiều columns (class-level decorator).

**File:** `workspace-index.decorator.ts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `columns` | `string[]` | Yes | Danh sách tên columns |
| `options.isUnique` | `boolean` | No | Có phải unique index không (default: false) |
| `options.indexWhereClause` | `string` | No | WHERE clause cho partial index |
| `options.indexType` | `IndexType` | No | Loại index (BTREE, GIN) |

**IndexType:**

| Type | Description |
|------|-------------|
| `BTREE` | B-tree index (default) - cho equality và range queries |
| `GIN` | GIN index - cho full-text search, arrays, JSONB |

**Vi du su dung:**

```typescript
import { WorkspaceIndex } from 'src/engine/twenty-orm/decorators/workspace-index.decorator';

// Composite unique index
@WorkspaceEntity({ ... })
@WorkspaceIndex(['workspaceId', 'code'], { isUnique: true })
export class MyEntity extends BaseWorkspaceEntity {
  // ...
}

// Partial index với WHERE clause
@WorkspaceEntity({ ... })
@WorkspaceIndex(['status'], {
  indexWhereClause: '"deletedAt" IS NULL'
})
export class MyEntity extends BaseWorkspaceEntity {
  // ...
}
```

**Luu y:**
- Phải có ít nhất 1 column
- Index name được tạo tự động: `IDX_{UNIQUE_}{hash}`

---

### @WorkspaceFieldIndex

**Mục đích:** Tạo index cho một field cụ thể (property-level decorator).

**File:** `workspace-field-index.decorator.ts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options.isUnique` | `boolean` | No | Unique index (default: false) |
| `options.indexWhereClause` | `string` | No | WHERE clause |
| `options.indexType` | `IndexType` | No | Loại index |

**Vi du su dung:**

```typescript
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';

// Index BTREE thông thường
@WorkspaceField({
  standardId: FIELD_IDS.email,
  type: FieldMetadataType.TEXT,
  label: msg`Email`,
})
@WorkspaceFieldIndex()
email: string;

// GIN index cho full-text search
@WorkspaceField({
  standardId: FIELD_IDS.searchVector,
  type: FieldMetadataType.TS_VECTOR,
  label: msg`Search Vector`,
  generatedType: 'STORED',
  asExpression: '...',
})
@WorkspaceFieldIndex({ indexType: IndexType.GIN })
searchVector: string;
```

---

## Entity Behavior Decorators

### @WorkspaceIsSystem

**Mục đích:** Đánh dấu entity hoặc field là system-level (không hiển thị cho user thông thường).

**File:** `workspace-is-system.decorator.ts`

**Parameters:** Không có parameters

**Sử dụng được ở:**
- Class level (cho entity)
- Property level (cho field)

**Vi du su dung:**

```typescript
// System entity
@WorkspaceEntity({ ... })
@WorkspaceIsSystem()
export class SystemLogWorkspaceEntity extends BaseWorkspaceEntity {
  // ...
}

// System field
@WorkspaceField({
  standardId: FIELD_IDS.searchVector,
  type: FieldMetadataType.TS_VECTOR,
  label: msg`Search Vector`,
})
@WorkspaceIsSystem()
searchVector: string;
```

---

### @WorkspaceIsSearchable

**Mục đích:** Đánh dấu entity có thể được search (xuất hiện trong global search).

**File:** `workspace-is-searchable.decorator.ts`

**Parameters:** Không có parameters

**Vi du su dung:**

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDepartment,
  namePlural: 'mktDepartments',
  labelSingular: msg`Department`,
  labelPlural: msg`Departments`,
})
@WorkspaceIsSearchable()
export class MktDepartmentWorkspaceEntity extends BaseWorkspaceEntity {
  // ...
}
```

---

### @WorkspaceIsNotAuditLogged

**Mục đích:** Tắt audit logging cho entity (không ghi lại các thay đổi).

**File:** `workspace-is-not-audit-logged.decorator.ts`

**Parameters:** Không có parameters

**Vi du su dung:**

```typescript
@WorkspaceEntity({ ... })
@WorkspaceIsNotAuditLogged()
export class TempDataWorkspaceEntity extends BaseWorkspaceEntity {
  // Không cần ghi audit log cho data tạm
}
```

**Luu y:**
- Mặc định tất cả entities đều có `isAuditLogged: true`
- Sử dụng cho các entities không cần track history (temp data, cache, etc.)

---

### @WorkspaceDuplicateCriteria

**Mục đích:** Định nghĩa tiêu chí phát hiện duplicate records.

**File:** `workspace-duplicate-criteria.decorator.ts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `duplicateCriteria` | `WorkspaceEntityDuplicateCriteria[]` | Yes | Mảng các tiêu chí |

**WorkspaceEntityDuplicateCriteria:** `string[]` - mảng tên columns

**Vi du su dung:**

```typescript
// Phát hiện duplicate khi trùng name
@WorkspaceEntity({ ... })
@WorkspaceDuplicateCriteria([['name']])
export class ContractWorkspaceEntity extends BaseWorkspaceEntity {
  // ...
}

// Phát hiện duplicate khi trùng cả 2 field (AND condition)
@WorkspaceEntity({ ... })
@WorkspaceDuplicateCriteria([['customerId', 'productId']])
export class OrderItemWorkspaceEntity extends BaseWorkspaceEntity {
  // ...
}

// Nhiều tiêu chí (OR condition giữa các tiêu chí)
@WorkspaceEntity({ ... })
@WorkspaceDuplicateCriteria([
  ['email'],
  ['phone'],
  ['firstName', 'lastName']
])
export class CustomerWorkspaceEntity extends BaseWorkspaceEntity {
  // Duplicate nếu: trùng email HOẶC trùng phone HOẶC trùng cả firstName và lastName
}
```

---

## Feature Flag Decorator

### @WorkspaceGate

**Mục đích:** Điều khiển visibility của entity/field dựa trên feature flag.

**File:** `workspace-gate.decorator.ts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `featureFlag` | `string` | Yes | Tên feature flag (phải là private flag) |
| `excludeFromDatabase` | `boolean` | No | Không tạo trong DB khi flag off (default: true) |
| `excludeFromWorkspaceApi` | `boolean` | No | Không expose qua API khi flag off (default: true) |

**Sử dụng được ở:**
- Class level (cho entity)
- Property level (cho field)

**Vi du su dung:**

```typescript
// Gate toàn bộ entity
@WorkspaceGate({
  featureFlag: 'IS_WORKSPACE_API_KEY_WEBHOOK_GRAPHQL_ENABLED',
  excludeFromDatabase: false,  // Vẫn tạo trong DB
  excludeFromWorkspaceApi: true,  // Không expose qua API
})
@WorkspaceEntity({ ... })
export class WebhookWorkspaceEntity extends BaseWorkspaceEntity {
  // ...
}

// Gate một field cụ thể
@WorkspaceField({
  standardId: FIELD_IDS.experimentalField,
  type: FieldMetadataType.TEXT,
  label: msg`Experimental Field`,
})
@WorkspaceGate({
  featureFlag: 'IS_EXPERIMENTAL_FEATURE_ENABLED',
})
experimentalField: string;
```

**Luu y quan trong:**
- CHỈ sử dụng được với PRIVATE feature flags
- Public feature flags sẽ throw error (vì user có thể toggle)
- Khi `excludeFromDatabase: true`, column sẽ không được tạo trong DB
- Khi `excludeFromWorkspaceApi: true`, field sẽ không xuất hiện trong GraphQL schema

---

## Best Practices

### 1. Thứ tự Decorators

```typescript
// Entity level (theo thứ tự từ trên xuống)
@WorkspaceGate({ ... })           // 1. Feature flag (nếu có)
@WorkspaceIsSystem()              // 2. System flag
@WorkspaceIsNotAuditLogged()      // 3. Audit flag
@WorkspaceDuplicateCriteria([])   // 4. Duplicate criteria
@WorkspaceIsSearchable()          // 5. Searchable flag
@WorkspaceIndex([], {})           // 6. Composite indexes
@WorkspaceEntity({ ... })         // 7. Entity definition (LUÔN CUỐI CÙNG)
export class MyEntity extends BaseWorkspaceEntity {

  // Field level (theo thứ tự từ trên xuống)
  @WorkspaceField({ ... })        // 1. Field definition
  @WorkspaceIsNullable()          // 2. Nullable flag
  @WorkspaceIsUnique()            // 3. Unique constraint
  @WorkspaceIsSystem()            // 4. System flag
  @WorkspaceGate({ ... })         // 5. Feature flag
  @WorkspaceFieldIndex({ ... })   // 6. Index
  fieldName: string;
}
```

### 2. Naming Conventions

```typescript
// Entity naming
// - Class: {ModulePrefix}{EntityName}WorkspaceEntity
// - namePlural: camelCase, số nhiều
// - standardId: Định nghĩa trong constants

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDepartment,    // Từ constants
  namePlural: 'mktDepartments',                 // camelCase
  labelSingular: msg`Department`,
  labelPlural: msg`Departments`,
})
export class MktDepartmentWorkspaceEntity extends BaseWorkspaceEntity {

  // Field naming
  // - Property: camelCase
  // - standardId: Định nghĩa trong constants
  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.departmentCode,
    // ...
  })
  departmentCode: string;  // camelCase

  // Join column: {relationName}Id
  @WorkspaceJoinColumn('manager')
  managerId: string | null;
}
```

### 3. ID Management

```typescript
// Định nghĩa IDs trong constants (IMMUTABLE - không bao giờ thay đổi sau khi deploy)

// mkt-object-ids.ts
export const MKT_OBJECT_IDS = {
  mktDepartment: '550e8400-e29b-41d4-a716-446655440000',
  mktCustomer: '550e8400-e29b-41d4-a716-446655440001',
  // ...
} as const;

// mkt-field-ids.ts
export const MKT_DEPARTMENT_FIELD_IDS = {
  departmentCode: '550e8400-e29b-41d4-a716-446655440100',
  departmentName: '550e8400-e29b-41d4-a716-446655440101',
  // ...
} as const;
```

### 4. Relation Best Practices

```typescript
// MANY_TO_ONE relation
@WorkspaceRelation({
  standardId: FIELD_IDS.customer,
  type: RelationType.MANY_TO_ONE,
  label: msg`Customer`,
  inverseSideTarget: () => CustomerWorkspaceEntity,
  inverseSideFieldKey: 'orders',  // BẮT BUỘC cho MANY_TO_ONE
  onDelete: RelationOnDeleteAction.SET_NULL,  // Xác định rõ behavior
})
customer: Relation<CustomerWorkspaceEntity>;

// LUÔN khai báo join column
@WorkspaceJoinColumn('customer')
customerId: string | null;

// ONE_TO_MANY relation
@WorkspaceRelation({
  standardId: FIELD_IDS.orders,
  type: RelationType.ONE_TO_MANY,
  label: msg`Orders`,
  inverseSideTarget: () => OrderWorkspaceEntity,
  inverseSideFieldKey: 'customer',
})
orders: Relation<OrderWorkspaceEntity[]>;  // Note: Array type
```

### 5. Search Vector Implementation

```typescript
import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { getTsVectorColumnExpressionFromFields, FieldTypeAndNameMetadata } from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';

// Define searchable fields
const SEARCH_FIELDS: FieldTypeAndNameMetadata[] = [
  { name: 'name', type: FieldMetadataType.TEXT },
  { name: 'code', type: FieldMetadataType.TEXT },
  { name: 'description', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({ ... })
@WorkspaceIsSearchable()
export class MyEntity extends BaseWorkspaceEntity {
  // ... other fields

  @WorkspaceField({
    standardId: FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(SEARCH_FIELDS),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
```

### 6. Complete Entity Example

```typescript
import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';
import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsUnique } from 'src/engine/twenty-orm/decorators/workspace-is-unique.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceDuplicateCriteria } from 'src/engine/twenty-orm/decorators/workspace-duplicate-criteria.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';

import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_PRODUCT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { CategoryWorkspaceEntity } from './category.workspace-entity';

const SEARCH_FIELDS = [
  { name: 'name', type: FieldMetadataType.TEXT },
  { name: 'sku', type: FieldMetadataType.TEXT },
];

@WorkspaceDuplicateCriteria([['sku']])
@WorkspaceIsSearchable()
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktProduct,
  namePlural: 'mktProducts',
  labelSingular: msg`Product`,
  labelPlural: msg`Products`,
  description: msg`Product catalog`,
  icon: 'IconPackage',
  labelIdentifierStandardId: MKT_PRODUCT_FIELD_IDS.name,
})
export class MktProductWorkspaceEntity extends BaseWorkspaceEntity {
  // Basic fields
  @WorkspaceField({
    standardId: MKT_PRODUCT_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Product name`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_PRODUCT_FIELD_IDS.sku,
    type: FieldMetadataType.TEXT,
    label: msg`SKU`,
    description: msg`Stock Keeping Unit`,
    icon: 'IconBarcode',
  })
  @WorkspaceIsUnique()
  sku: string;

  @WorkspaceField({
    standardId: MKT_PRODUCT_FIELD_IDS.price,
    type: FieldMetadataType.CURRENCY,
    label: msg`Price`,
    icon: 'IconCurrency',
  })
  price: number;

  @WorkspaceField({
    standardId: MKT_PRODUCT_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_PRODUCT_FIELD_IDS.description,
    type: FieldMetadataType.RICH_TEXT_V2,
    label: msg`Description`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  description?: string;

  // Audit field
  @WorkspaceField({
    standardId: MKT_PRODUCT_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconUser',
  })
  createdBy: ActorMetadata;

  // Relations
  @WorkspaceRelation({
    standardId: MKT_PRODUCT_FIELD_IDS.category,
    type: RelationType.MANY_TO_ONE,
    label: msg`Category`,
    icon: 'IconCategory',
    inverseSideTarget: () => CategoryWorkspaceEntity,
    inverseSideFieldKey: 'products',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  category: Relation<CategoryWorkspaceEntity>;

  @WorkspaceJoinColumn('category')
  categoryId: string | null;

  // Search vector
  @WorkspaceField({
    standardId: MKT_PRODUCT_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(SEARCH_FIELDS),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
```

---

## References

- **Source files:** `/packages/twenty-server/src/engine/twenty-orm/decorators/`
- **Base entity:** `/packages/twenty-server/src/engine/twenty-orm/base.workspace-entity.ts`
- **Metadata storage:** `/packages/twenty-server/src/engine/twenty-orm/storage/metadata-args.storage.ts`
- **Field types:** `/packages/twenty-shared/src/types/FieldMetadataType.ts`
