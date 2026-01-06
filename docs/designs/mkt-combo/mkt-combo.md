``# MKT Combo Module

## Overview

MktComboModule quản lý **Combo** (gói sản phẩm) trong hệ thống CRM. Module hỗ trợ nhiều loại item và cung cấp các tính năng tính giá, validation, và snapshot cho order.

**Location**: `packages/twenty-server/src/mkt-core/mkt-combo/`

## Architecture

```
mkt-combo/
├── constants/                    # Constants và configuration
│   ├── generic-combo.constants.ts    # Item types, pricing types, cache config
│   ├── generic-combo-object-ids.ts   # Immutable entity IDs
│   ├── generic-combo-field-ids.ts    # Immutable field IDs
│   └── generic-combo-relation-ids.ts # Immutable relation IDs
├── dto/                          # GraphQL Input/Output types
│   ├── generic-combo.input.ts        # Input types (Create, Update, Filter)
│   └── generic-combo.output.ts       # Output types (Combo, Price, Snapshot)
├── errors/                       # Custom error classes
│   └── generic-combo.errors.ts       # GenericComboError và subclasses
├── message/                      # Centralized messages
│   └── index.ts                      # Success/Error/GraphQL messages
├── objects/                      # WorkspaceEntity definitions
│   ├── mkt-generic-combo.workspace-entity.ts
│   └── mkt-generic-combo-item.workspace-entity.ts
├── repositories/                 # Data access layer
│   ├── mkt-generic-combo.repository.ts
│   └── mkt-generic-combo-item.repository.ts
├── resolvers/                    # GraphQL resolvers
│   └── generic-combo.resolver.ts
├── services/                     # Business logic layer
│   ├── generic-combo.service.ts          # Facade service
│   ├── generic-combo-calculation.service.ts
│   ├── generic-combo-validation.service.ts
│   ├── generic-combo-snapshot.service.ts
│   └── generic-combo-cache.service.ts
├── types/                        # TypeScript type definitions
│   └── generic-combo.types.ts
├── utils/                        # Utility functions
│   └── generic-combo-mapper.utils.ts
└── mkt-combo.module.ts           # Module definition
```

## Design Pattern

Module sử dụng **Facade Pattern** với `GenericComboService` orchestrate các services con:

```
                    ┌─────────────────────────┐
                    │   GenericComboResolver  │
                    │      (GraphQL API)      │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   GenericComboService   │
                    │       (Facade)          │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────▼────────┐   ┌─────────▼─────────┐   ┌────────▼────────┐
│  Calculation    │   │    Validation     │   │    Snapshot     │
│    Service      │   │     Service       │   │     Service     │
└─────────────────┘   └───────────────────┘   └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      Repositories       │
                    │   (Data Access Layer)   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       Database          │
                    └─────────────────────────┘
```

## Data Model

### MktGenericComboWorkspaceEntity

Entity chính quản lý thông tin combo:

| Field | Type | Description |
|-------|------|-------------|
| `comboCode` | TEXT | Unique combo identifier |
| `name` | TEXT | Display name |
| `description` | TEXT | Optional description |
| `pricingType` | SELECT | FIXED / SUM / DISCOUNT |
| `fixedPrice` | NUMBER | Fixed price (when FIXED) |
| `discountPercent` | NUMBER | Discount % (when DISCOUNT) |
| `currency` | TEXT | Currency code (default: VND) |
| `isActive` | BOOLEAN | Active status |
| `validFrom` | DATETIME | Start validity |
| `validTo` | DATETIME | End validity |
| `version` | NUMBER | Optimistic lock version |
| `metadata` | RAW_JSON | Additional metadata |

**Relations**:
- `items` → ONE_TO_MANY → `MktGenericComboItemWorkspaceEntity`
- `createdBy` → MANY_TO_ONE → `WorkspaceMemberWorkspaceEntity`
- `accountOwner` → MANY_TO_ONE → `WorkspaceMemberWorkspaceEntity`

### MktGenericComboItemWorkspaceEntity

Entity cho từng item trong combo (polymorphic design):

| Field | Type | Description |
|-------|------|-------------|
| `itemType` | SELECT | Type discriminator |
| `displayName` | TEXT | Display name |
| `quantity` | NUMBER | Quantity (default: 1) |
| `overridePrice` | NUMBER | Override calculated price |
| `position` | NUMBER | Display order |

**Polymorphic Fields theo itemType**:

| itemType | Required Fields | Description |
|----------|-----------------|-------------|
| `DIGITAL_EXTERNAL` | `externalPackageId` | Product từ MKT Server (bán theo package) |
| `INTERNAL_PRODUCT` | `mktProductId` | **(deprecated)** Product nội bộ CRM |
| `INTERNAL_VARIANT` | `mktVariantId` | **(deprecated)** Variant nội bộ CRM |
| `SERVICE` | `serviceName`, `servicePrice` | Dịch vụ với giá cố định |
| `CUSTOM` | `customName`, `customPrice` | Item tùy chỉnh |

## Item Types

### DIGITAL_EXTERNAL (Recommended)

Sản phẩm số từ MKT Server, **bán theo package**:

```typescript
{
  itemType: 'DIGITAL_EXTERNAL',
  externalPackageId: 'pkg-uuid',      // BẮT BUỘC
  externalProductId: 'prod-uuid',     // Optional, lấy từ package.productId
  quantity: 1,
  displayName: 'Product - Package'    // Auto-generated nếu không cung cấp
}
```

- Giá lấy từ `package.price`
- Product snapshot và Package snapshot được tạo khi create order
- Cross-validate: Package phải thuộc product (nếu cả 2 được cung cấp)

### INTERNAL_PRODUCT / INTERNAL_VARIANT (Deprecated)

> **Warning**: Hai types này đang deprecated. Khuyến khích dùng `DIGITAL_EXTERNAL`.

Nếu vẫn sử dụng, giá sẽ trả về `0` trừ khi có `overridePrice`.

### SERVICE

Dịch vụ với giá cố định:

```typescript
{
  itemType: 'SERVICE',
  serviceName: 'Dịch vụ hỗ trợ 24/7',
  serviceDescription: 'Mô tả dịch vụ',
  servicePrice: 500000,
  quantity: 1
}
```

### CUSTOM

Item tùy chỉnh:

```typescript
{
  itemType: 'CUSTOM',
  customName: 'Phí triển khai',
  customDescription: 'Phí setup ban đầu',
  customPrice: 1000000,
  quantity: 1
}
```

## Pricing Types

### SUM (Default)

Tổng giá của tất cả items:

```
comboPrice = Σ(item.unitPrice × item.quantity)
```

### FIXED

Giá cố định cho combo:

```
comboPrice = fixedPrice
savings = originalPrice - fixedPrice
```

### DISCOUNT

Áp dụng % giảm giá:

```
comboPrice = originalPrice × (1 - discountPercent/100)
savings = originalPrice - comboPrice
```

## Services

### GenericComboService (Facade)

Public API của module:

```typescript
// Read operations
getComboById(workspaceId, comboId): Promise<GenericComboWithItems | null>
getComboByCode(workspaceId, comboCode): Promise<GenericComboWithItems | null>
getCombosPaginated(workspaceId, options, filter?): Promise<PaginatedResult>

// Write operations
createCombo(workspaceId, data): Promise<MktGenericComboWorkspaceEntity>
updateCombo(workspaceId, comboId, data): Promise<MktGenericComboWorkspaceEntity>
deleteCombo(workspaceId, comboId): Promise<void>

// Item operations
addItemsToCombo(workspaceId, comboId, items): Promise<void>
removeItemFromCombo(workspaceId, comboId, itemId): Promise<void>

// Calculation & Validation
calculateComboPrice(workspaceId, comboId, language?): Promise<CalculationResult>
validateForOrder(workspaceId, comboId): Promise<ValidationResult>

// Snapshot
createComboSnapshot(workspaceId, comboId, language?): Promise<GenericComboSnapshot>
verifySnapshot(snapshot): boolean
```

### GenericComboCalculationService

Xử lý tính giá với:

- Parallel fetch data từ MKT Server
- Retry với exponential backoff (max 3 lần)
- Sử dụng `MoneyUtils` để tránh floating-point errors
- Pro-rata adjusted prices cho items

### GenericComboValidationService

Validation rules:

1. **Create Validation**:
   - `comboCode` required và unique
   - `name` required
   - `pricingType` required
   - Ít nhất 1 item
   - Type-specific field validation cho mỗi item

2. **Order Validation**:
   - Combo phải active
   - Trong thời gian validity
   - Có items
   - DIGITAL_EXTERNAL items: Package phải tồn tại và active

### GenericComboSnapshotService

Tạo immutable snapshot cho order:

- Capture tất cả thông tin combo và items
- Snapshot product/package data từ MKT Server
- SHA-256 checksum để verify integrity
- `capturedAt` timestamp

### GenericComboCacheService

Redis caching với:

| Cache Key | TTL | Description |
|-----------|-----|-------------|
| `mkt:combo:data:{ws}:calc:{id}` | 1 phút | Calculation results |
| `mkt:combo:data:{ws}:code:{code}` | 5 phút | Code → ID mapping |

## GraphQL API

### Queries

```graphql
# Lấy combo theo ID
query mktGenericComboDetail($comboId: String!) {
  mktGenericComboDetail(comboId: $comboId) {
    id
    comboCode
    name
    items { ... }
  }
}

# Lấy combo theo code
query mktGenericComboByCode($comboCode: String!) {
  mktGenericComboByCode(comboCode: $comboCode) { ... }
}

# Danh sách với phân trang
query mktGenericCombosList($input: GetGenericCombosInput) {
  mktGenericCombosList(input: $input) {
    items { ... }
    total
    hasMore
  }
}

# Tính giá
query mktCalculateGenericComboPrice($input: CalculateGenericComboPriceInput!) {
  mktCalculateGenericComboPrice(input: $input) {
    originalPrice
    comboPrice
    savings
    savingsPercent
    itemDetails { ... }
  }
}

# Validate cho order
query mktValidateGenericCombo($comboId: String!) {
  mktValidateGenericCombo(comboId: $comboId) {
    valid
    errors { field, message, code }
  }
}

# Preview snapshot
query mktPreviewGenericComboSnapshot($comboId: String!, $language: String) {
  mktPreviewGenericComboSnapshot(comboId: $comboId, language: $language) {
    comboCode
    comboPrice
    checksum
    items { ... }
  }
}
```

### Mutations

```graphql
# Tạo combo mới
mutation mktCreateGenericCombo($input: CreateGenericComboInput!) {
  mktCreateGenericCombo(input: $input) {
    id
    comboCode
  }
}

# Cập nhật
mutation mktUpdateGenericCombo($comboId: String!, $input: UpdateGenericComboInput!) {
  mktUpdateGenericCombo(comboId: $comboId, input: $input) { ... }
}

# Xóa (soft delete)
mutation mktDeleteGenericCombo($comboId: String!) {
  mktDeleteGenericCombo(comboId: $comboId)
}

# Thêm items
mutation mktAddGenericComboItems($comboId: String!, $items: [CreateGenericComboItemInput!]!) {
  mktAddGenericComboItems(comboId: $comboId, items: $items)
}

# Xóa item
mutation mktRemoveGenericComboItem($comboId: String!, $itemId: String!) {
  mktRemoveGenericComboItem(comboId: $comboId, itemId: $itemId)
}
```

## Error Handling

Custom error classes:

| Error | Code | Description |
|-------|------|-------------|
| `GenericComboNotFoundError` | GENERIC_COMBO_NOT_FOUND | Combo không tồn tại |
| `GenericComboDuplicateCodeError` | GENERIC_COMBO_DUPLICATE_CODE | Code đã tồn tại |
| `GenericComboVersionConflictError` | GENERIC_COMBO_VERSION_CONFLICT | Optimistic lock conflict |
| `GenericComboValidationException` | GENERIC_COMBO_VALIDATION_FAILED | Validation thất bại |
| `GenericComboInactiveError` | GENERIC_COMBO_INACTIVE | Combo không active |
| `GenericComboExpiredError` | GENERIC_COMBO_EXPIRED | Combo hết hạn |

## Usage Examples

### Tạo combo DIGITAL_EXTERNAL

```typescript
const comboService = moduleRef.get(GenericComboService);

const combo = await comboService.createCombo(workspaceId, {
  comboCode: 'COMBO-001',
  name: 'Gói khởi nghiệp',
  description: 'Bao gồm các sản phẩm cần thiết để bắt đầu',
  pricingType: 'DISCOUNT',
  discountPercent: 10,
  currency: 'VND',
  isActive: true,
  items: [
    {
      itemType: 'DIGITAL_EXTERNAL',
      externalPackageId: 'package-uuid-1',
      quantity: 1,
    },
    {
      itemType: 'DIGITAL_EXTERNAL',
      externalPackageId: 'package-uuid-2',
      quantity: 2,
    },
    {
      itemType: 'SERVICE',
      serviceName: 'Hỗ trợ triển khai',
      servicePrice: 500000,
      quantity: 1,
    },
  ],
});
```

### Tính giá và tạo snapshot cho order

```typescript
// Validate trước
const validation = await comboService.validateForOrder(workspaceId, comboId);

if (!validation.valid) {
  throw new Error(validation.errors.map(e => e.message).join(', '));
}

// Tạo snapshot (immutable)
const snapshot = await comboService.createComboSnapshot(
  workspaceId,
  comboId,
  'vi'
);

// Verify snapshot integrity
const isValid = comboService.verifySnapshot(snapshot);

// Lưu snapshot cùng order
await createOrder({
  comboSnapshot: snapshot,
  totalAmount: snapshot.comboPrice,
  // ...
});
```

## Dependencies

- `MktProductIntegrationModule`: Fetch product/package data từ MKT Server
- `TwentyORMModule`: Database access
- `WorkspaceCacheStorageModule`: Redis caching
- `TokenModule`: Authentication

## Best Practices

1. **Luôn validate trước khi tạo order**: Sử dụng `validateForOrder()` để đảm bảo combo hợp lệ

2. **Sử dụng snapshot cho order**: Snapshot capture dữ liệu tại thời điểm đặt hàng, đảm bảo data integrity

3. **Optimistic locking**: Sử dụng `expectedVersion` khi update để tránh conflicts

4. **Ưu tiên DIGITAL_EXTERNAL**: Các item types khác (INTERNAL_PRODUCT, INTERNAL_VARIANT) đang deprecated

5. **Cache invalidation**: Cache tự động invalidate khi update/delete combo
