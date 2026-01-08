# Customer Module - Entities

## Tổng quan

Module Customer bao gồm 4 entity chính:

| Entity | Mô tả | File |
|--------|-------|------|
| `MktCustomerWorkspaceEntity` | Entity khách hàng chính | `mkt-customer.workspace-entity.ts` |
| `MktTagWorkspaceEntity` | Master data cho tags | `mkt-tag.workspace-entity.ts` |
| `MktCustomerTagWorkspaceEntity` | Join table Customer-Tag | `mkt-customer-tag.workspace-entity.ts` |
| `MktCustomerTierHistoryWorkspaceEntity` | Lịch sử thay đổi tier | `mkt-customer-tier-history.workspace-entity.ts` |

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌───────────────────────┐                                                  │
│  │   WorkspaceMember     │◄──────────────────────────────────────────┐      │
│  │   (Twenty Core)       │                                           │      │
│  └───────────────────────┘                                           │      │
│            ▲                                                         │      │
│            │ N:1 (accountOwner)                                      │      │
│            │                                                         │      │
│  ┌─────────┴─────────────┐         ┌────────────────────────┐       │      │
│  │   MktCustomer         │◄───────►│ MktOrder               │       │      │
│  │                       │  1:N    │ (Order Module)         │       │      │
│  ├───────────────────────┤         └────────────────────────┘       │      │
│  │ • mktCustomerCode     │                                          │      │
│  │ • name, email, phone  │         ┌────────────────────────┐       │      │
│  │ • type (SELECT)       │◄───────►│ MktContract            │       │      │
│  │ • status (SELECT)     │  1:N    │ (Contract Module)      │       │      │
│  │ • tier (SELECT)       │         └────────────────────────┘       │      │
│  │ • lifecycleStage      │                                          │      │
│  │ • linkedAccounts[]    │                                          │      │
│  │ • totalOrderValue     │                                          │      │
│  └─────────┬─────────────┘                                          │      │
│            │                                                         │      │
│            │ 1:N                                                     │      │
│            ├──────────────────┐                                      │      │
│            │                  │                                      │      │
│            ▼                  ▼                                      │      │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │      │
│  │ MktCustomerTag      │  │ MktCustomerTierHist │                   │      │
│  │ (Join Table)        │  │                     │                   │      │
│  ├─────────────────────┤  ├─────────────────────┤                   │      │
│  │ • mktCustomerId FK  │  │ • customerId FK     │                   │      │
│  │ • mktTagId FK       │  │ • previousTier      │                   │      │
│  │ • name              │  │ • newTier           │                   │      │
│  │ • position          │  │ • reason            │                   │      │
│  └─────────┬───────────┘  │ • orderValueAtChange│                   │      │
│            │              └─────────────────────┘                   │      │
│            │ N:1                                                     │      │
│            ▼                                                         │      │
│  ┌─────────────────────┐                                            │      │
│  │ MktTag              │◄────────────────────────────────────────────┘      │
│  ├─────────────────────┤                                                    │
│  │ • name              │                                                    │
│  │ • type              │                                                    │
│  │ • labelVn, labelEn  │                                                    │
│  └─────────────────────┘                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. MktCustomerWorkspaceEntity

Entity chính quản lý thông tin khách hàng.

### Định nghĩa

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCustomer,
  namePlural: 'mktCustomers',
  labelSingular: msg`Customer`,
  labelPlural: msg`Customers`,
  description: msg`Customer entity for CRM`,
  icon: 'IconUser',
  labelIdentifierStandardId: MKT_CUSTOMER_FIELD_IDS.name,
})
@WorkspaceIsSearchable()
export class MktCustomerWorkspaceEntity extends BaseWorkspaceEntity { ... }
```

### Các trường dữ liệu

#### Basic Info

| Field | Type | Nullable | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `mktCustomerCode` | TEXT | ✓ | ✓ | - | Mã KH: `CUS-YYYY-NNNNNN` |
| `name` | TEXT | ✗ | ✗ | - | Tên khách hàng |
| `email` | TEXT | ✓ | ✓ | - | Email chính |
| `phone` | TEXT | ✓ | ✗ | - | Số điện thoại |
| `type` | SELECT | ✓ | ✗ | INDIVIDUAL | INDIVIDUAL, BUSINESS, ORGANIZATION |

#### Business Info

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `companyName` | TEXT | ✓ | Tên công ty |
| `taxCode` | TEXT | ✓ | Mã số thuế (10 hoặc 13 số) |
| `address` | TEXT | ✓ | Địa chỉ |

#### System Status

| Field | Type | Nullable | Default | Options |
|-------|------|----------|---------|---------|
| `status` | SELECT | ✓ | ACTIVE | ACTIVE, INACTIVE, BLOCKED, PROSPECTIVE |
| `tier` | SELECT | ✓ | BRONZE | BRONZE, SILVER, GOLD, DIAMOND, DORMANT, CHURNED |
| `lifecycleStage` | SELECT | ✓ | PROSPECTIVE | PROSPECTIVE, TRIAL, CUSTOMER, LOYAL, CHURNED, RETENTION |
| `lastTierUpgradeAt` | DATE_TIME | ✓ | - | Ngày upgrade tier gần nhất (system field) |

#### Analytics & Tracking

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `totalOrderValue` | NUMBER | 0 | Tổng giá trị đơn (VND) |
| `totalOrderCount` | NUMBER | 0 | Số đơn hoàn thành |
| `licensesCount` | NUMBER | 0 | Số license |
| `lastPurchase` | DATE_TIME | - | Ngày mua gần nhất |
| `customerLtv` | NUMBER | 0 | Lifetime Value (VND) |
| `churnRiskScore` | NUMBER | 0 | Điểm rủi ro rời bỏ (0-100) |
| `engagementScore` | NUMBER | 0 | Điểm tương tác (0-100) |

#### Assignment

| Field | Type | Description |
|-------|------|-------------|
| `registrationDate` | DATE_TIME | Ngày đăng ký |
| `assignedDate` | DATE_TIME | Ngày assign cho sales |
| `assignedReason` | TEXT | Lý do assign |

#### Special Fields

| Field | Type | Description |
|-------|------|-------------|
| `linkedAccounts` | RAW_JSON | Array tài khoản liên kết (xem LinkedAccount type) |
| `notes` | RICH_TEXT | Ghi chú |
| `position` | POSITION | Vị trí trong danh sách |
| `createdBy` | ACTOR | Người tạo |
| `searchVector` | TS_VECTOR | Full-text search (GIN index) |

### Relations

| Relation | Type | Target Entity | FK | OnDelete | Description |
|----------|------|---------------|----|---------:|-------------|
| `accountOwner` | MANY_TO_ONE | WorkspaceMember | `accountOwnerId` | SET_NULL | Sales phụ trách |
| `mktOrders` | ONE_TO_MANY | MktOrder | - | SET_NULL | Đơn hàng |
| `mktCustomerTags` | ONE_TO_MANY | MktCustomerTag | - | SET_NULL | Tags |
| `contracts` | ONE_TO_MANY | MktContract | - | SET_NULL | Hợp đồng |
| `tierHistories` | ONE_TO_MANY | MktCustomerTierHistory | - | CASCADE | Lịch sử tier |
| `promotionUsages` | ONE_TO_MANY | MktPromotionUsage | - | SET_NULL | Lịch sử KM (System) |
| `assignedCoupons` | ONE_TO_MANY | MktCoupon | - | SET_NULL | Coupons (System) |

---

## 2. MktTagWorkspaceEntity

Master data cho các tag có thể gán cho khách hàng.

### Định nghĩa

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktTag,
  namePlural: 'mktTags',
  labelSingular: msg`Tag`,
  labelPlural: msg`Tags`,
  icon: 'IconUser',
})
@WorkspaceIsSearchable()
export class MktTagWorkspaceEntity extends BaseWorkspaceEntity { ... }
```

### Các trường

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `name` | TEXT | ✗ | Tên tag (unique identifier) |
| `type` | TEXT | ✗ | Loại tag |
| `labelVn` | TEXT | ✗ | Nhãn tiếng Việt |
| `labelEn` | TEXT | ✓ | Nhãn tiếng Anh |
| `position` | POSITION | ✓ | Thứ tự hiển thị |
| `createdBy` | ACTOR | ✗ | Người tạo |

### Relations

| Relation | Type | Target Entity | OnDelete |
|----------|------|---------------|----------|
| `mktCustomerTags` | ONE_TO_MANY | MktCustomerTag | CASCADE |
| `accountOwner` | MANY_TO_ONE | WorkspaceMember | SET_NULL |
| `timelineActivities` | ONE_TO_MANY | TimelineActivity | CASCADE |

---

## 3. MktCustomerTagWorkspaceEntity

Bảng trung gian thể hiện quan hệ **Many-to-Many** giữa Customer và Tag.

### Định nghĩa

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCustomerTag,
  namePlural: 'mktCustomerTags',
  labelSingular: msg`Customer Tag`,
  labelPlural: msg`Customer Tags`,
  icon: 'IconBox',
})
@WorkspaceDuplicateCriteria([['mktCustomerId'], ['mktTagId']])
@WorkspaceIsSearchable()
export class MktCustomerTagWorkspaceEntity extends BaseWorkspaceEntity { ... }
```

### Các trường

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `name` | TEXT | ✗ | Tên hiển thị |
| `position` | POSITION | ✓ | Thứ tự |
| `createdBy` | ACTOR | ✗ | Người tạo |

### Relations

| Relation | Type | Target Entity | FK | OnDelete |
|----------|------|---------------|----|---------:|
| `mktCustomer` | MANY_TO_ONE | MktCustomer | `mktCustomerId` | CASCADE |
| `mktTag` | MANY_TO_ONE | MktTag | `mktTagId` | CASCADE |
| `accountOwner` | MANY_TO_ONE | WorkspaceMember | `accountOwnerId` | SET_NULL |

### Duplicate Criteria

```typescript
@WorkspaceDuplicateCriteria([['mktCustomerId'], ['mktTagId']])
```

Đảm bảo mỗi cặp Customer-Tag là duy nhất.

---

## 4. MktCustomerTierHistoryWorkspaceEntity

Lưu lịch sử thay đổi tier để audit.

### Định nghĩa

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCustomerTierHistory,
  namePlural: 'mktCustomerTierHistories',
  labelSingular: msg`Tier History`,
  labelPlural: msg`Tier Histories`,
  icon: 'IconHistory',
})
export class MktCustomerTierHistoryWorkspaceEntity extends BaseWorkspaceEntity { ... }
```

### Các trường

| Field | Type | Nullable | Options | Description |
|-------|------|----------|---------|-------------|
| `previousTier` | SELECT | ✓ | BRONZE, SILVER, GOLD, DIAMOND, DORMANT, CHURNED | Tier trước |
| `newTier` | SELECT | ✗ | (same) | Tier mới |
| `reason` | SELECT | ✗ | ORDER, CRON_RECALCULATION, MANUAL, DOWNGRADE | Lý do thay đổi |
| `orderValueAtChange` | NUMBER | ✓ | - | Giá trị đơn tại thời điểm thay đổi |
| `orderCountAtChange` | NUMBER | ✓ | - | Số đơn tại thời điểm thay đổi |

### Relations

| Relation | Type | Target Entity | FK | OnDelete |
|----------|------|---------------|----|---------:|
| `customer` | MANY_TO_ONE | MktCustomer | `customerId` | CASCADE |

---

## LinkedAccount Type (JSONB)

Trường `linkedAccounts` trong Customer lưu array các tài khoản liên kết:

```typescript
type LinkedAccount = {
  id: string;                    // UUID trong CRM
  provider: AccountProvider;     // MKT_SERVER, GOOGLE, ZALO, MICROSOFT, FACEBOOK...
  externalId?: string;           // ID trên hệ thống nguồn
  email?: string | null;         // Email liên kết
  displayName?: string | null;   // Tên hiển thị
  avatarUrl?: string | null;     // Avatar URL
  isPrimary: boolean;            // Tài khoản chính cho provider này
  status: LinkedAccountStatus;   // ACTIVE, INACTIVE, EXPIRED, REVOKED
  linkedAt: string;              // Thời gian liên kết (ISO string)
  lastSyncAt?: string | null;    // Thời gian sync gần nhất
  expiresAt?: string | null;     // Thời gian hết hạn
  notes?: string | null;         // Ghi chú
  metadata?: Record<string, string | number | boolean | null>;
}
```

### Providers hỗ trợ

```typescript
export const ACCOUNT_PROVIDER = {
  MKT_SERVER: 'MKT_SERVER',
  GOOGLE: 'GOOGLE',
  MICROSOFT: 'MICROSOFT',
  FACEBOOK: 'FACEBOOK',
  ZALO: 'ZALO',
  SHOPEE: 'SHOPEE',
  LAZADA: 'LAZADA',
  OTHER: 'OTHER',
} as const;
```

### Statuses

```typescript
export const LINKED_ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
```

---

## Enums & Options

### Customer Type

| Value | Label (VN) | Color |
|-------|------------|-------|
| INDIVIDUAL | Cá nhân | green |
| BUSINESS | Doanh nghiệp | blue |
| ORGANIZATION | Tổ chức | purple |

### Customer Status

| Value | Label (VN) | Color |
|-------|------------|-------|
| ACTIVE | Hoạt động | green |
| INACTIVE | Không hoạt động | gray |
| BLOCKED | Bị chặn | red |
| PROSPECTIVE | Tiềm năng | yellow |

### Customer Tier

| Value | Label (VN) | Color | Rank |
|-------|------------|-------|------|
| DIAMOND | Kim Cương | blue | 4 |
| GOLD | Vàng | yellow | 3 |
| SILVER | Bạc | gray | 2 |
| BRONZE | Đồng | orange | 1 |
| DORMANT | Không hoạt động | gray | 0 |
| CHURNED | Đã rời bỏ | red | -1 |

### Lifecycle Stage

| Value | Label (VN) | Color |
|-------|------------|-------|
| PROSPECTIVE | Tiềm năng | yellow |
| TRIAL | Dùng thử | blue |
| CUSTOMER | Khách hàng | green |
| LOYAL | Trung thành | purple |
| CHURNED | Rời bỏ | red |
| RETENTION | Giữ chân | orange |

### Tier Change Reason

| Value | Description |
|-------|-------------|
| ORDER | Thay đổi do đơn hàng mới |
| CRON_RECALCULATION | Thay đổi do job định kỳ |
| MANUAL | Admin thay đổi thủ công |
| DOWNGRADE | Bị hạ tier do không đạt ngưỡng |

---

## Indexes

### MktCustomer

| Column | Index Type | Purpose |
|--------|------------|---------|
| `email` | UNIQUE | Đảm bảo email unique |
| `mktCustomerCode` | UNIQUE | Đảm bảo mã KH unique |
| `searchVector` | GIN | Full-text search |

### MktCustomerTag

| Columns | Index Type | Purpose |
|---------|------------|---------|
| `mktCustomerId` + `mktTagId` | UNIQUE (via duplicate criteria) | Ngăn duplicate |

---

## Best Practices

### 1. Sử dụng SELECT fields thay vì TEXT

```typescript
// ✅ Good - sử dụng SELECT với options
@WorkspaceField({
  type: FieldMetadataType.SELECT,
  options: MKT_CUSTOMER_TIER_SELECT_OPTIONS,
  defaultValue: MKT_CUSTOMER_TIER_DEFAULT,
})
tier: string;

// ❌ Bad - sử dụng TEXT cho enum values
@WorkspaceField({ type: FieldMetadataType.TEXT })
tier: string;
```

### 2. JSONB cho flexible data

```typescript
// ✅ Good - sử dụng JSONB cho data có structure linh hoạt
@WorkspaceField({ type: FieldMetadataType.RAW_JSON })
linkedAccounts: LinkedAccount[] | null;

// ❌ Bad - tạo bảng riêng cho mỗi provider
```

### 3. Cascade delete hợp lý

```typescript
// ✅ Cascade cho data phụ thuộc hoàn toàn
tierHistories: onDelete: CASCADE  // Xóa customer → xóa history

// ✅ Set null cho data có giá trị độc lập
mktOrders: onDelete: SET_NULL    // Xóa customer → giữ orders
```

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Kiến trúc module
- [SERVICES.md](./SERVICES.md) - Chi tiết services
- [TIER_SYSTEM.md](./TIER_SYSTEM.md) - Hệ thống tier
