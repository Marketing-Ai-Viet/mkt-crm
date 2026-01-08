# MktGenericComboWorkspaceEntity - Giải thích các Fields

## Tổng quan

`MktGenericComboWorkspaceEntity` là entity đại diện cho một **Combo** trong hệ thống - một gói sản phẩm/dịch vụ được bán cùng nhau với giá ưu đãi.

### Đặc điểm
- Hỗ trợ nhiều loại item (Digital, Service, Custom)
- Linh hoạt với 3 chiến lược định giá
- Có thời hạn hiệu lực (valid from/to)
- Hỗ trợ optimistic locking (version)
- Audit trail (created by, last modified)

### Source File
```
packages/twenty-server/src/mkt-core/mkt-combo/objects/mkt-generic-combo.workspace-entity.ts
```

---

## Danh sách Fields

### 1. Thông tin cơ bản

| Field | Type | Nullable | Default | Mô tả |
|-------|------|----------|---------|-------|
| `comboCode` | `TEXT` | ❌ No | - | Mã định danh combo (unique) |
| `name` | `TEXT` | ❌ No | - | Tên hiển thị của combo |
| `description` | `TEXT` | ✅ Yes | `null` | Mô tả chi tiết combo |

#### Chi tiết

##### `comboCode`
```typescript
@WorkspaceField({
  type: FieldMetadataType.TEXT,
  label: 'Combo Code',
  description: 'Unique combo identifier code',
  icon: 'IconBarcode',
})
comboCode: string;
```
- **Mục đích**: Mã duy nhất để định danh combo (giống SKU)
- **Ví dụ**: `"OFFICE-SUITE-2024"`, `"STARTER-PACK-Q1"`, `"BUNDLE-PRO-VN"`
- **Lưu ý**: Phải unique trong workspace

##### `name`
```typescript
@WorkspaceField({
  type: FieldMetadataType.TEXT,
  label: 'Name',
  description: 'Combo display name',
  icon: 'IconTag',
})
name: string;
```
- **Mục đích**: Tên hiển thị cho khách hàng
- **Ví dụ**: `"Office Suite Pro"`, `"Gói khởi nghiệp"`, `"Bundle tiết kiệm"`

##### `description`
```typescript
@WorkspaceField({
  type: FieldMetadataType.TEXT,
  label: 'Description',
  description: 'Combo description',
  icon: 'IconFileDescription',
})
@WorkspaceIsNullable()
description: string | null;
```
- **Mục đích**: Mô tả chi tiết nội dung combo
- **Ví dụ**: `"Bao gồm 3 sản phẩm chính + 1 năm hỗ trợ kỹ thuật"`

---

### 2. Cấu hình giá (Pricing Configuration)

| Field | Type | Nullable | Default | Mô tả |
|-------|------|----------|---------|-------|
| `pricingType` | `SELECT` | ❌ No | `'SUM'` | Chiến lược tính giá |
| `fixedPrice` | `NUMBER` | ✅ Yes | `null` | Giá cố định (khi pricingType = FIXED) |
| `discountPercent` | `NUMBER` | ✅ Yes | `null` | % giảm giá (khi pricingType = DISCOUNT) |
| `currency` | `TEXT` | ❌ No | `'VND'` | Đơn vị tiền tệ |

#### Chi tiết

##### `pricingType`
```typescript
@WorkspaceField({
  type: FieldMetadataType.SELECT,
  label: 'Pricing Type',
  description: 'How combo price is calculated',
  icon: 'IconCalculator',
  options: GENERIC_COMBO_PRICING_TYPE_OPTIONS,
  defaultValue: `'${GENERIC_COMBO_PRICING_TYPE.SUM}'`,
})
pricingType: GenericComboPricingType;
```

**Các giá trị có thể:**

| Value | Label | Công thức | Sử dụng khi |
|-------|-------|-----------|-------------|
| `FIXED` | Fixed Price | `comboPrice = fixedPrice` | Muốn bán combo với giá cố định |
| `SUM` | Sum of Items | `comboPrice = Σ itemPrices` | Không có giảm giá, chỉ bundle |
| `DISCOUNT` | Percentage Discount | `comboPrice = originalPrice × (1 - discountPercent/100)` | Giảm % trên tổng giá |

**Ví dụ:**
```typescript
// FIXED: Bán combo với giá 1,500,000 bất kể giá items
pricingType = 'FIXED'
fixedPrice = 1500000

// DISCOUNT: Giảm 20% trên tổng giá items
pricingType = 'DISCOUNT'
discountPercent = 20

// SUM: Tổng giá items, không giảm
pricingType = 'SUM'
```

##### `fixedPrice`
```typescript
@WorkspaceField({
  type: FieldMetadataType.NUMBER,
  label: 'Fixed Price',
  description: 'Fixed combo price (when pricingType is FIXED)',
  icon: 'IconCurrencyDollar',
})
@WorkspaceIsNullable()
fixedPrice: number | null;
```
- **Mục đích**: Giá cố định cho combo
- **Chỉ sử dụng khi**: `pricingType = 'FIXED'`
- **Ví dụ**: `1500000` (1.5 triệu VND)

##### `discountPercent`
```typescript
@WorkspaceField({
  type: FieldMetadataType.NUMBER,
  label: 'Discount Percent',
  description: 'Discount percentage (when pricingType is DISCOUNT)',
  icon: 'IconPercentage',
})
@WorkspaceIsNullable()
discountPercent: number | null;
```
- **Mục đích**: Phần trăm giảm giá
- **Chỉ sử dụng khi**: `pricingType = 'DISCOUNT'`
- **Ví dụ**: `20` (giảm 20%)
- **Lưu ý**: Giá trị từ 0-100

##### `currency`
```typescript
@WorkspaceField({
  type: FieldMetadataType.TEXT,
  label: 'Currency',
  description: 'Currency code',
  icon: 'IconCoin',
  defaultValue: "'VND'",
})
currency: string;
```
- **Mục đích**: Đơn vị tiền tệ
- **Default**: `'VND'`
- **Ví dụ**: `"VND"`, `"USD"`, `"EUR"`

---

### 3. Trạng thái & Hiệu lực (Status & Validity)

| Field | Type | Nullable | Default | Mô tả |
|-------|------|----------|---------|-------|
| `isActive` | `BOOLEAN` | ❌ No | `true` | Combo có đang hoạt động |
| `validFrom` | `DATE_TIME` | ✅ Yes | `null` | Thời điểm bắt đầu hiệu lực |
| `validTo` | `DATE_TIME` | ✅ Yes | `null` | Thời điểm hết hiệu lực |

#### Chi tiết

##### `isActive`
```typescript
@WorkspaceField({
  type: FieldMetadataType.BOOLEAN,
  label: 'Is Active',
  description: 'Whether the combo is active',
  icon: 'IconToggleRight',
  defaultValue: true,
})
isActive: boolean;
```
- **Mục đích**: Bật/tắt combo
- **Default**: `true`
- **Lưu ý**: Combo inactive sẽ không hiển thị cho khách hàng

##### `validFrom`
```typescript
@WorkspaceField({
  type: FieldMetadataType.DATE_TIME,
  label: 'Valid From',
  description: 'Start date of combo validity',
  icon: 'IconCalendarEvent',
})
@WorkspaceIsNullable()
validFrom: Date | null;
```
- **Mục đích**: Thời điểm combo bắt đầu có hiệu lực
- **Ví dụ**: `2024-01-01T00:00:00Z`
- **Nếu null**: Có hiệu lực ngay lập tức

##### `validTo`
```typescript
@WorkspaceField({
  type: FieldMetadataType.DATE_TIME,
  label: 'Valid To',
  description: 'End date of combo validity',
  icon: 'IconCalendarOff',
})
@WorkspaceIsNullable()
validTo: Date | null;
```
- **Mục đích**: Thời điểm combo hết hiệu lực
- **Ví dụ**: `2024-12-31T23:59:59Z`
- **Nếu null**: Không có thời hạn

**Logic kiểm tra hiệu lực:**
```typescript
function isComboValid(combo: MktGenericComboWorkspaceEntity, now: Date): boolean {
  if (!combo.isActive) return false;
  if (combo.validFrom && now < combo.validFrom) return false;
  if (combo.validTo && now > combo.validTo) return false;
  return true;
}
```

---

### 4. Metadata & Mở rộng

| Field | Type | Nullable | Default | Mô tả |
|-------|------|----------|---------|-------|
| `metadata` | `RAW_JSON` | ✅ Yes | `null` | Dữ liệu bổ sung dạng JSON |

#### Chi tiết

##### `metadata`
```typescript
@WorkspaceField({
  type: FieldMetadataType.RAW_JSON,
  label: 'Metadata',
  description: 'Additional combo metadata',
  icon: 'IconCode',
})
@WorkspaceIsNullable()
metadata: JSON | null;
```
- **Mục đích**: Lưu trữ thông tin bổ sung linh hoạt
- **Ví dụ**:
```json
{
  "tags": ["hot-deal", "limited-time"],
  "targetAudience": "enterprise",
  "priority": 1,
  "banner": "https://example.com/banner.jpg",
  "terms": "Chỉ áp dụng cho khách hàng mới"
}
```

---

### 5. Audit & Versioning (Hệ thống)

| Field | Type | Nullable | Default | System | Mô tả |
|-------|------|----------|---------|--------|-------|
| `version` | `NUMBER` | ❌ No | `1` | ✅ Yes | Version cho optimistic locking |
| `lastModifiedById` | `UUID` | ✅ Yes | `null` | ✅ Yes | ID người sửa cuối cùng |

#### Chi tiết

##### `version`
```typescript
@WorkspaceField({
  type: FieldMetadataType.NUMBER,
  label: 'Version',
  description: 'Optimistic lock version',
  icon: 'IconVersions',
  defaultValue: 1,
})
@WorkspaceIsSystem()
version: number;
```
- **Mục đích**: Hỗ trợ **Optimistic Locking** để tránh conflict khi nhiều người sửa cùng lúc
- **Hoạt động**:
  1. Khi đọc combo: lấy `version` hiện tại
  2. Khi update: kiểm tra `version` có khớp không
  3. Nếu khớp → update thành công, tăng `version`
  4. Nếu không khớp → throw conflict error

##### `lastModifiedById`
```typescript
@WorkspaceField({
  type: FieldMetadataType.UUID,
  label: 'Last Modified By ID',
  description: 'ID of user who last modified this combo',
  icon: 'IconUser',
})
@WorkspaceIsNullable()
@WorkspaceIsSystem()
lastModifiedById: string | null;
```
- **Mục đích**: Audit trail - biết ai sửa cuối cùng
- **Tự động cập nhật**: Khi combo được update

---

### 6. Relations (Quan hệ)

| Relation | Type | Target | On Delete | Mô tả |
|----------|------|--------|-----------|-------|
| `createdBy` | MANY_TO_ONE | WorkspaceMember | SET_NULL | Người tạo combo |
| `accountOwner` | MANY_TO_ONE | WorkspaceMember | SET_NULL | Người quản lý combo |
| `items` | ONE_TO_MANY | MktGenericComboItem | CASCADE | Danh sách items trong combo |

#### Chi tiết

##### `createdBy` / `createdById`
```typescript
@WorkspaceRelation({
  type: RelationType.MANY_TO_ONE,
  label: 'Created By',
  description: 'The workspace member who created this combo',
  icon: 'IconUserCircle',
  inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
  inverseSideFieldKey: 'createdMktGenericCombos',
  onDelete: RelationOnDeleteAction.SET_NULL,
})
@WorkspaceIsNullable()
createdBy: Relation<WorkspaceMemberWorkspaceEntity> | null;

@WorkspaceJoinColumn('createdBy')
createdById: string | null;
```
- **Mục đích**: Theo dõi người tạo combo
- **On Delete**: Nếu member bị xóa → set `createdById = null`

##### `accountOwner` / `accountOwnerId`
```typescript
@WorkspaceRelation({
  type: RelationType.MANY_TO_ONE,
  label: 'Account Owner',
  description: 'Your team member responsible for managing this combo',
  icon: 'IconUserCircle',
  inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
  inverseSideFieldKey: 'accountOwnerForMktGenericCombos',
  onDelete: RelationOnDeleteAction.SET_NULL,
})
@WorkspaceIsNullable()
accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

@WorkspaceJoinColumn('accountOwner')
accountOwnerId: string | null;
```
- **Mục đích**: Gán người chịu trách nhiệm quản lý combo
- **Use case**: Phân công công việc trong team sales/marketing

##### `items`
```typescript
@WorkspaceRelation({
  type: RelationType.ONE_TO_MANY,
  label: 'Combo Items',
  description: 'Items in this combo',
  icon: 'IconListDetails',
  inverseSideTarget: () => MktGenericComboItemWorkspaceEntity,
  inverseSideFieldKey: 'genericCombo',
  onDelete: RelationOnDeleteAction.CASCADE,
})
@WorkspaceIsNullable()
items: Relation<MktGenericComboItemWorkspaceEntity[]>;
```
- **Mục đích**: Danh sách các items trong combo
- **On Delete CASCADE**: Khi xóa combo → tự động xóa tất cả items

---

## Sơ đồ Entity

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MktGenericComboWorkspaceEntity                      │
├─────────────────────────────────────────────────────────────────────────┤
│ BASIC INFO                                                              │
│ ┌─────────────────┬─────────────────────────────────────────────────┐  │
│ │ comboCode       │ TEXT (unique) - "OFFICE-SUITE-2024"             │  │
│ │ name            │ TEXT - "Office Suite Pro"                        │  │
│ │ description     │ TEXT? - "Bao gồm 3 sản phẩm..."                 │  │
│ └─────────────────┴─────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│ PRICING                                                                 │
│ ┌─────────────────┬─────────────────────────────────────────────────┐  │
│ │ pricingType     │ SELECT [FIXED|SUM|DISCOUNT] - default: SUM      │  │
│ │ fixedPrice      │ NUMBER? - 1500000 (used when FIXED)             │  │
│ │ discountPercent │ NUMBER? - 20 (used when DISCOUNT)               │  │
│ │ currency        │ TEXT - "VND"                                     │  │
│ └─────────────────┴─────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│ STATUS & VALIDITY                                                       │
│ ┌─────────────────┬─────────────────────────────────────────────────┐  │
│ │ isActive        │ BOOLEAN - true                                   │  │
│ │ validFrom       │ DATE_TIME? - 2024-01-01T00:00:00Z               │  │
│ │ validTo         │ DATE_TIME? - 2024-12-31T23:59:59Z               │  │
│ └─────────────────┴─────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│ METADATA                                                                │
│ ┌─────────────────┬─────────────────────────────────────────────────┐  │
│ │ metadata        │ JSON? - { "tags": [...], "priority": 1 }        │  │
│ └─────────────────┴─────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│ AUDIT (System)                                                          │
│ ┌─────────────────┬─────────────────────────────────────────────────┐  │
│ │ version         │ NUMBER - 1 (optimistic lock)                    │  │
│ │ lastModifiedById│ UUID? - "abc-123..."                            │  │
│ └─────────────────┴─────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│ RELATIONS                                                               │
│ ┌─────────────────┬─────────────────────────────────────────────────┐  │
│ │ createdBy       │ → WorkspaceMember (MANY_TO_ONE, SET_NULL)       │  │
│ │ accountOwner    │ → WorkspaceMember (MANY_TO_ONE, SET_NULL)       │  │
│ │ items           │ → MktGenericComboItem[] (ONE_TO_MANY, CASCADE)  │  │
│ └─────────────────┴─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Ví dụ dữ liệu

### Combo với FIXED pricing
```json
{
  "id": "combo-001",
  "comboCode": "STARTUP-PACK-2024",
  "name": "Gói khởi nghiệp 2024",
  "description": "Bao gồm tất cả công cụ cần thiết để bắt đầu",
  "pricingType": "FIXED",
  "fixedPrice": 2000000,
  "discountPercent": null,
  "currency": "VND",
  "isActive": true,
  "validFrom": "2024-01-01T00:00:00Z",
  "validTo": "2024-06-30T23:59:59Z",
  "metadata": {
    "tags": ["startup", "new-business"],
    "highlight": true
  },
  "version": 3,
  "createdById": "member-abc",
  "accountOwnerId": "member-xyz"
}
```

### Combo với DISCOUNT pricing
```json
{
  "id": "combo-002",
  "comboCode": "BUNDLE-PRO-20",
  "name": "Bundle Pro - Tiết kiệm 20%",
  "description": "Mua 3 sản phẩm với giá ưu đãi",
  "pricingType": "DISCOUNT",
  "fixedPrice": null,
  "discountPercent": 20,
  "currency": "VND",
  "isActive": true,
  "validFrom": null,
  "validTo": null,
  "metadata": null,
  "version": 1,
  "createdById": "member-abc",
  "accountOwnerId": null
}
```

### Combo với SUM pricing (no discount)
```json
{
  "id": "combo-003",
  "comboCode": "COMPLETE-SUITE",
  "name": "Complete Suite",
  "description": "Tất cả sản phẩm trong một gói",
  "pricingType": "SUM",
  "fixedPrice": null,
  "discountPercent": null,
  "currency": "VND",
  "isActive": true,
  "validFrom": null,
  "validTo": null,
  "metadata": null,
  "version": 1,
  "createdById": "member-abc",
  "accountOwnerId": "member-abc"
}
```

---

## Các loại Item hỗ trợ

Combo hỗ trợ 5 loại items (định nghĩa trong `MktGenericComboItemWorkspaceEntity`):

| Type | Label | Mô tả | Fields cần thiết |
|------|-------|-------|------------------|
| `DIGITAL_EXTERNAL` | Digital Package (External) | Sản phẩm số từ MKT Server | `externalPackageId` (required) |
| `INTERNAL_PRODUCT` | Internal Product | Sản phẩm nội bộ CRM *(deprecated)* | `mktProductId` |
| `INTERNAL_VARIANT` | Internal Variant | Variant nội bộ CRM *(deprecated)* | `mktVariantId` |
| `SERVICE` | Service | Dịch vụ tùy chỉnh | `serviceName`, `servicePrice` |
| `CUSTOM` | Custom Item | Item tùy chỉnh | `customName`, `customPrice` |

---

## Inherited Fields (từ BaseWorkspaceEntity)

Các fields được kế thừa từ `BaseWorkspaceEntity`:

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | UUID | Primary key |
| `createdAt` | DATE_TIME | Thời điểm tạo |
| `updatedAt` | DATE_TIME | Thời điểm cập nhật cuối |
| `deletedAt` | DATE_TIME? | Soft delete timestamp |

---

*Tài liệu được tạo từ phân tích code `mkt-generic-combo.workspace-entity.ts`*
