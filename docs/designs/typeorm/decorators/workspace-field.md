# WorkspaceField Decorator

## Tổng quan

`@WorkspaceField()` là decorator ở cấp độ property để định nghĩa một field (cột) trong workspace entity. Đây là decorator **bắt buộc** cho mọi field không phải relation.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-field.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceField<T extends FieldMetadataType>(options: WorkspaceFieldOptions<T>)
```

## Options

```typescript
interface WorkspaceFieldOptions<T extends FieldMetadataType> {
  standardId: string;                        // Bắt buộc
  type: T;                                   // Bắt buộc
  label: MessageDescriptor;                  // Bắt buộc
  description?: MessageDescriptor;           // Tùy chọn
  icon?: string;                             // Tùy chọn
  defaultValue?: FieldMetadataDefaultValue<T>; // Tùy chọn
  options?: FieldMetadataOptions<T>;         // Tùy chọn
  settings?: FieldMetadataSettings<T>;       // Tùy chọn
  isActive?: boolean;                        // Tùy chọn
  generatedType?: 'STORED' | 'VIRTUAL';      // Tùy chọn
  asExpression?: string;                     // Tùy chọn
}
```

### Chi tiết tham số

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `standardId` | string | Có | ID duy nhất cho field |
| `type` | FieldMetadataType | Có | Loại dữ liệu của field |
| `label` | MessageDescriptor | Có | Label hiển thị trong UI |
| `description` | MessageDescriptor | Không | Mô tả field |
| `icon` | string | Không | Icon cho field |
| `defaultValue` | T-dependent | Không | Giá trị mặc định |
| `options` | Object | Không | Options cụ thể cho type |
| `settings` | Object | Không | Settings cụ thể cho type |
| `isActive` | boolean | Không | Field có active không |
| `generatedType` | 'STORED'\|'VIRTUAL' | Không | Loại generated column |
| `asExpression` | string | Không | SQL expression cho generated column |

## Field Types

Các `FieldMetadataType` phổ biến:

```typescript
enum FieldMetadataType {
  // Basic types
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE_TIME = 'DATE_TIME',
  DATE = 'DATE',
  UUID = 'UUID',
  
  // Complex types
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  LINK = 'LINK',
  CURRENCY = 'CURRENCY',
  RATING = 'RATING',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  
  // Composite types
  FULL_NAME = 'FULL_NAME',
  ADDRESS = 'ADDRESS',
  ACTOR = 'ACTOR',
  LINKS = 'LINKS',
  EMAILS = 'EMAILS',
  PHONES = 'PHONES',
  
  // Special types
  RAW_JSON = 'RAW_JSON',
  RICH_TEXT = 'RICH_TEXT',
  RICH_TEXT_V2 = 'RICH_TEXT_V2',
  POSITION = 'POSITION',
  TS_VECTOR = 'TS_VECTOR',
  
  // Relations (use @WorkspaceRelation instead)
  RELATION = 'RELATION',
}
```

## Ví dụ

### Ví dụ 1: Text field cơ bản

```typescript
import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

@WorkspaceField({
  standardId: FIELD_IDS.name,
  type: FieldMetadataType.TEXT,
  label: msg`Name`,
  description: msg`Person's name`,
  icon: 'IconUser',
})
name: string;
```

### Ví dụ 2: Field với default value

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.position,
  type: FieldMetadataType.POSITION,
  label: msg`Position`,
  description: msg`Record position`,
  icon: 'IconHierarchy2',
  defaultValue: 0,
})
@WorkspaceIsSystem()
position: number;
```

### Ví dụ 3: Number field với options

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.revenue,
  type: FieldMetadataType.CURRENCY,
  label: msg`Revenue`,
  description: msg`Expected revenue`,
  icon: 'IconCurrencyDollar',
  defaultValue: { amountMicros: 0, currencyCode: 'USD' },
})
@WorkspaceIsNullable()
revenue: { amountMicros: number; currencyCode: string } | null;
```

### Ví dụ 4: Select field với options

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.stage,
  type: FieldMetadataType.SELECT,
  label: msg`Stage`,
  description: msg`Opportunity stage`,
  icon: 'IconProgressCheck',
  options: [
    { value: 'NEW', label: 'New', color: 'blue', position: 0 },
    { value: 'SCREENING', label: 'Screening', color: 'purple', position: 1 },
    { value: 'MEETING', label: 'Meeting', color: 'sky', position: 2 },
    { value: 'PROPOSAL', label: 'Proposal', color: 'turquoise', position: 3 },
    { value: 'CUSTOMER', label: 'Customer', color: 'green', position: 4 },
  ],
  defaultValue: 'NEW',
})
stage: string;
```

### Ví dụ 5: Email field

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.email,
  type: FieldMetadataType.EMAIL,
  label: msg`Email`,
  description: msg`Contact email`,
  icon: 'IconMail',
})
@WorkspaceIsNullable()
email: string | null;
```

### Ví dụ 6: DateTime field

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.closeDate,
  type: FieldMetadataType.DATE_TIME,
  label: msg`Close Date`,
  description: msg`Opportunity close date`,
  icon: 'IconCalendarEvent',
})
@WorkspaceIsNullable()
closeDate: Date | null;
```

### Ví dụ 7: Boolean field

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.isActive,
  type: FieldMetadataType.BOOLEAN,
  label: msg`Is Active`,
  description: msg`Whether record is active`,
  icon: 'IconCheck',
  defaultValue: true,
})
isActive: boolean;
```

### Ví dụ 8: Generated field (search vector)

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.searchVector,
  type: FieldMetadataType.TS_VECTOR,
  label: msg`Search Vector`,
  description: msg`Field used for full-text search`,
  icon: 'IconSearch',
  generatedType: 'STORED',
  asExpression: getTsVectorColumnExpressionFromFields([
    { name: 'title', type: FieldMetadataType.TEXT },
    { name: 'body', type: FieldMetadataType.RICH_TEXT_V2 },
  ]),
})
@WorkspaceIsNullable()
@WorkspaceIsSystem()
@WorkspaceFieldIndex({ indexType: IndexType.GIN })
searchVector: string;
```

### Ví dụ 9: Composite type field

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.fullName,
  type: FieldMetadataType.FULL_NAME,
  label: msg`Name`,
  description: msg`Contact's name`,
  icon: 'IconUser',
})
fullName: { firstName: string; lastName: string };
```

### Ví dụ 10: JSON field

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.metadata,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Metadata`,
  description: msg`Additional metadata`,
  icon: 'IconCode',
})
@WorkspaceIsNullable()
@WorkspaceIsSystem()
metadata: object | null;
```

## Metadata được lưu

Decorator lưu metadata sau:

```typescript
{
  target: Class,
  standardId: string,
  name: string,
  label: string,
  type: FieldMetadataType,
  isLabelSyncedWithName: boolean,
  description: string,
  icon: string | undefined,
  defaultValue: any,
  options: object | undefined,
  settings: object | undefined,
  isPrimary: boolean,        // Từ @WorkspaceIsPrimaryField
  isNullable: boolean,       // Từ @WorkspaceIsNullable
  isSystem: boolean,         // Từ @WorkspaceIsSystem
  gate: object | undefined,  // Từ @WorkspaceGate
  isDeprecated: boolean,     // Từ @WorkspaceIsDeprecated
  isUnique: boolean,         // Từ @WorkspaceIsUnique
  isActive: boolean,
  asExpression: string | undefined,
  generatedType: string | undefined,
}
```

## Cách hoạt động

### 1. Đọc metadata từ decorators khác

```typescript
const isPrimary = TypedReflect.getMetadata(
  'workspace:is-primary-field-metadata-args',
  object,
  propertyKey.toString(),
) ?? false;

const isNullable = TypedReflect.getMetadata(
  'workspace:is-nullable-metadata-args',
  object,
  propertyKey.toString(),
) ?? false;
```

### 2. Generate default value

```typescript
const defaultValue = options.defaultValue ?? generateDefaultValue(options.type);
```

### 3. Validate label sync

```typescript
const name = propertyKey.toString();
const label = options.label.message ?? '';
const isLabelSyncedWithName = computeMetadataNameFromLabel(label) === name;
```

## Default Values

Mỗi field type có default value khác nhau:

```typescript
// TEXT, EMAIL, PHONE, LINK
defaultValue: "''";

// NUMBER, CURRENCY, RATING, POSITION
defaultValue: 0;

// BOOLEAN
defaultValue: false;

// DATE_TIME, DATE
defaultValue: "now()";

// UUID
defaultValue: "uuid_generate_v4()";

// SELECT, MULTI_SELECT
defaultValue: null; // Hoặc first option value

// JSON
defaultValue: null;
```

## Generated Columns

### STORED Generated Column

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.fullNameDisplay,
  type: FieldMetadataType.TEXT,
  label: msg`Full Name`,
  generatedType: 'STORED',
  asExpression: `"firstName" || ' ' || "lastName"`,
})
@WorkspaceIsSystem()
fullNameDisplay: string;
```

**Đặc điểm:**
- Được tính toán khi INSERT/UPDATE
- Lưu trữ trong database
- Có thể index
- Tốn storage space

### VIRTUAL Generated Column

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.age,
  type: FieldMetadataType.NUMBER,
  label: msg`Age`,
  generatedType: 'VIRTUAL',
  asExpression: `EXTRACT(YEAR FROM AGE("birthDate"))`,
})
@WorkspaceIsSystem()
age: number;
```

**Đặc điểm:**
- Được tính toán khi SELECT
- Không lưu trong database
- Không thể index
- Không tốn storage space

## Kết hợp với decorators khác

### Thứ tự decorators

```typescript
@WorkspaceField({...})           // 1. Bắt buộc
@WorkspaceIsNullable()           // 2. Nullable flag
@WorkspaceIsSystem()             // 3. System flag
@WorkspaceIsPrimaryField()       // 4. Primary flag
@WorkspaceGate({...})            // 5. Feature gate
@WorkspaceFieldIndex()           // 6. Index
@WorkspaceIsUnique()             // 7. Unique constraint
@WorkspaceIsDeprecated()         // 8. Deprecation
propertyName: PropertyType;
```

### Với @WorkspaceIsNullable

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.email,
  type: FieldMetadataType.EMAIL,
  label: msg`Email`,
})
@WorkspaceIsNullable()
email: string | null;  // Type phải có | null
```

### Với @WorkspaceIsUnique

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.email,
  type: FieldMetadataType.EMAIL,
  label: msg`Email`,
})
@WorkspaceIsUnique()
email: string;  // Tự động tạo unique index
```

### Với @WorkspaceFieldIndex

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.userId,
  type: FieldMetadataType.UUID,
  label: msg`User ID`,
})
@WorkspaceFieldIndex()
userId: string;  // Tự động tạo index
```

### Với @WorkspaceIsSystem

```typescript
@WorkspaceField({
  standardId: FIELD_IDS.internalNote,
  type: FieldMetadataType.TEXT,
  label: msg`Internal Note`,
})
@WorkspaceIsSystem()
internalNote: string;  // Không hiển thị trong UI
```

## Type-specific Options

### SELECT Options

```typescript
options: [
  { value: 'OPTION1', label: 'Option 1', color: 'blue', position: 0 },
  { value: 'OPTION2', label: 'Option 2', color: 'green', position: 1 },
]
```

### CURRENCY Options

```typescript
// Default value format
defaultValue: { amountMicros: 0, currencyCode: 'USD' }
```

### RATING Options

```typescript
// Settings for rating scale
settings: { max: 5 }
```

### LINK Options

```typescript
// Type structure
{ url: string; label: string | null }
```

## TypeScript Type Mapping

| FieldMetadataType | TypeScript Type |
|-------------------|-----------------|
| TEXT | string |
| NUMBER | number |
| BOOLEAN | boolean |
| DATE_TIME | Date |
| DATE | Date |
| UUID | string |
| EMAIL | string |
| PHONE | string |
| LINK | { url: string; label: string \| null } |
| CURRENCY | { amountMicros: number; currencyCode: string } |
| RATING | number |
| SELECT | string |
| MULTI_SELECT | string[] |
| FULL_NAME | { firstName: string; lastName: string } |
| ADDRESS | { ...address fields } |
| RAW_JSON | object |
| TS_VECTOR | string |

## Best Practices

### 1. Đồng bộ TypeScript type với nullable

```typescript
// ✅ Đúng
@WorkspaceIsNullable()
field: string | null;

// ❌ Sai
@WorkspaceIsNullable()
field: string;  // Thiếu | null
```

### 2. Sử dụng defaultValue phù hợp

```typescript
// ✅ Đúng
@WorkspaceField({
  type: FieldMetadataType.NUMBER,
  defaultValue: 0,
})
count: number;

// ⚠️ Cẩn thận
@WorkspaceField({
  type: FieldMetadataType.NUMBER,
  // defaultValue sẽ là 0 (auto-generated)
})
count: number;
```

### 3. Icon phù hợp với field type

```typescript
// ✅ Đúng
icon: 'IconMail'        // cho EMAIL
icon: 'IconPhone'       // cho PHONE
icon: 'IconCalendar'    // cho DATE
icon: 'IconCurrency'    // cho CURRENCY

// ❌ Sai
icon: 'IconTrash'       // cho EMAIL???
```

### 4. Label có ý nghĩa

```typescript
// ✅ Đúng
label: msg`Email Address`
label: msg`Phone Number`
label: msg`Date of Birth`

// ❌ Sai
label: msg`Field1`
label: msg`Data`
```

### 5. Standard ID constants

```typescript
// ✅ Đúng
standardId: PERSON_STANDARD_FIELD_IDS.email

// ❌ Sai
standardId: 'email-uuid-here'
```

## Validation

### Runtime Validation
- ✅ `standardId` phải có
- ✅ `type` phải có
- ✅ `label` phải có

### Recommended Validation
- ⚠️ Property name nên là camelCase
- ⚠️ Label nên có ý nghĩa
- ⚠️ Type phải match với TypeScript type

## Troubleshooting

### Field không xuất hiện trong GraphQL

**Kiểm tra:**
1. Có `@WorkspaceField()` decorator?
2. Đã sync metadata chưa?
3. Field có bị gate block không?
4. Field có `isActive: false` không?

### Type error trong TypeScript

**Kiểm tra:**
1. TypeScript type match với FieldMetadataType?
2. Nullable decorator match với `| null`?
3. Composite type structure đúng chưa?

### Default value không hoạt động

**Kiểm tra:**
1. defaultValue format đúng chưa?
2. Type support default value không?
3. Migration đã chạy chưa?

## See Also

- [WorkspaceRelation Decorator](./workspace-relation.md)
- [WorkspaceIsNullable Decorator](./workspace-is-nullable.md)
- [WorkspaceFieldIndex Decorator](./workspace-field-index.md)
- [Field Metadata Types](../../field-metadata-types.md)
