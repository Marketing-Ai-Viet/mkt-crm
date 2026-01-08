# Customer Module - Design Documentation

## Tổng quan

Module **Customer** là một trong những module cốt lõi của hệ thống CRM, quản lý toàn bộ vòng đời khách hàng từ khi đăng ký đến khi rời bỏ. Module này được thiết kế theo kiến trúc **Domain-Driven Design (DDD)** với các layer rõ ràng.

## Mục lục tài liệu

| File | Mô tả |
|------|-------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Kiến trúc tổng thể và cấu trúc thư mục |
| [ENTITIES.md](./ENTITIES.md) | Chi tiết các Entity và mối quan hệ |
| [SERVICES.md](./SERVICES.md) | Chi tiết các Service và business logic |
| [TIER_SYSTEM.md](./TIER_SYSTEM.md) | Hệ thống phân tier khách hàng |
| [LIFECYCLE.md](./LIFECYCLE.md) | Vòng đời khách hàng và categorization |

---

## Quick Overview

### Chức năng chính

1. **Customer Management** - CRUD khách hàng với validation
2. **Tier System** - Phân hạng khách hàng theo giá trị đơn hàng
3. **Lifecycle Management** - Theo dõi vòng đời khách hàng
4. **Linked Accounts** - Liên kết tài khoản từ nhiều provider (MKT, Google, Zalo...)
5. **Auto Assignment** - Tự động assign khách hàng cho sales
6. **License Integration** - Quản lý license của khách hàng
7. **Export** - Xuất danh sách khách hàng

### Tech Stack

- **Backend**: NestJS + TypeORM
- **Database**: PostgreSQL với JSONB support
- **Queue**: BullMQ cho background jobs
- **Pattern**: Repository-Service-Hook architecture

### Các Entity chính

```
MktCustomer (1) ────┬──── (*) MktCustomerTag ──── (*) MktTag
                    │
                    ├──── (*) MktCustomerTierHistory
                    │
                    ├──── (*) MktOrder
                    │
                    └──── (*) MktContract
```

### Directory Structure

```
customer/
├── constants/           # Configuration & enums
├── dto/                 # Data Transfer Objects
├── hooks/               # Pre/Post query hooks
├── jobs/                # Cron jobs & background tasks
├── listeners/           # Event listeners
├── messages/            # Centralized messages
├── objects/             # Workspace Entity definitions
├── repositories/        # Data access layer
├── resolvers/           # GraphQL resolvers
├── services/            # Business logic
│   ├── account/         # Linked account management
│   ├── core/            # Core CRUD operations
│   ├── export/          # Export functionality
│   ├── license/         # License integration
│   ├── lifecycle/       # Categorization & auto-assign
│   └── tier/            # Tier calculation & history
├── types/               # TypeScript types
└── utils/               # Utility functions
```

---

## Kiến trúc Layer

```
┌─────────────────────────────────────────────────────────────┐
│                      GraphQL API Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Resolvers       │  │ Pre-Query Hooks │  │ Validators   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Service Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Core Services   │  │ Tier Services   │  │ Lifecycle    │ │
│  │ - Creation      │  │ - Calculation   │  │ - Categorize │ │
│  │ - Update        │  │ - History       │  │ - AutoAssign │ │
│  │ - CodeGen       │  │ - Downgrade     │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Repository Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ MktCustomerRepo │  │ TierHistoryRepo │                   │
│  └─────────────────┘  └─────────────────┘                   │
├─────────────────────────────────────────────────────────────┤
│                     Entity Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ MktCustomer     │  │ MktCustomerTag  │  │ MktTag       │ │
│  │ TierHistory     │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Luồng xử lý chính

### 1. Tạo Customer mới

```
Client Request
    ↓
GraphQL Mutation (createMktCustomer)
    ↓
MktCustomerCreateOnePreQueryHook
  ├── Validate email format
  ├── Validate email uniqueness
  ├── Validate tax code format
  ├── Generate customer code (CUS-YYYY-NNNNNN)
  └── Set default values
    ↓
Database Insert
    ↓
MktCustomerEventListener (CREATED event)
  ├── Auto-assign to sales member
  └── Send welcome email
```

### 2. Cập nhật Tier

```
Order Completed Event / Cron Job
    ↓
MktCustomerTierService.updateCustomerTier()
    ↓
MktCustomerTierCalculationService.calculateCustomerTier()
  └── Query completed orders → Calculate totals
    ↓
MktCustomerDowngradePolicyService.determineFinalTier()
  ├── Check inactivity (DORMANT/CHURNED)
  ├── Apply protection period (30 days)
  └── Apply max tier drop limit
    ↓
MktCustomerRepository.update()
    ↓
MktCustomerTierHistoryService.logTierChange()
```

### 3. Categorization (Lifecycle Stage)

```
Cron Job (MktCustomerCategorizationCronJob)
    ↓
MktCustomerCategorizationService.categorizeAllCustomers()
  ├── Get customer order stats
  ├── Calculate days since last order
  └── Determine lifecycle stage:
      - PROSPECTIVE (no orders)
      - TRIAL (< 30 days from first order)
      - CUSTOMER (has completed orders)
      - LOYAL (≥5 orders OR ≥5M VND)
      - RETENTION (90-180 days inactive)
      - CHURNED (>180 days inactive)
    ↓
MktCustomerRepository.update()
```

---

## Key Design Decisions

### 1. JSONB cho Linked Accounts

Thay vì tạo bảng riêng cho linked accounts, sử dụng JSONB array trong entity Customer:

```typescript
linkedAccounts: LinkedAccount[] | null;
```

**Lợi ích:**
- Giảm số lượng JOIN queries
- Flexible schema cho nhiều provider khác nhau
- Dễ dàng thêm provider mới

### 2. Tier History cho Audit Trail

Mỗi thay đổi tier được lưu vào `MktCustomerTierHistory`:

```typescript
{
  previousTier: 'SILVER',
  newTier: 'GOLD',
  reason: 'ORDER',
  orderValueAtChange: 5_500_000,
  orderCountAtChange: 12
}
```

### 3. Downgrade Protection Policy

- **30 ngày protection** sau khi upgrade
- **Max 1 tier drop** per recalculation
- **Gradual downgrade path**: DIAMOND → GOLD → SILVER → BRONZE

### 4. Thread-safe Repository Pattern

Tất cả repositories sử dụng `TwentyORMGlobalManager` để đảm bảo thread-safe trong môi trường multi-workspace:

```typescript
async getRepository(workspaceId?: string) {
  return this.twentyORMGlobalManager.getRepositoryForWorkspace(
    workspaceId,
    MktCustomerWorkspaceEntity,
    { shouldBypassPermissionChecks: true }
  );
}
```

---

## Configuration

### Tier Thresholds

```typescript
MKT_CUSTOMER_TIER_THRESHOLDS = {
  DIAMOND: { minSpending: 10_000_000, minOrders: 20 },
  GOLD:    { minSpending: 5_000_000,  minOrders: 10 },
  SILVER:  { minSpending: 2_000_000,  minOrders: 5 },
  BRONZE:  { minSpending: 500_000,    minOrders: 1 },
}
```

### Categorization Thresholds

```typescript
MKT_CUSTOMER_CATEGORIZATION_THRESHOLDS = {
  CHURNED_DAYS: 180,      // Ngày để coi là churned
  RETENTION_DAYS: 90,     // Ngày để coi là at-risk
  LOYAL_MIN_ORDERS: 5,    // Số đơn tối thiểu cho loyal
  LOYAL_MIN_VALUE: 5_000_000,  // Giá trị tối thiểu cho loyal
  TRIAL_MAX_DAYS: 30,     // Ngày tối đa cho trial
}
```

### Downgrade Policy

```typescript
DOWNGRADE_POLICY_CONFIG = {
  PROTECTION_ENABLED: true,
  UPGRADE_PROTECTION_DAYS: 30,
  MAX_TIER_DROP_PER_RECALCULATION: 1,
}
```

---

## Related Modules

- **Order Module** - Cung cấp dữ liệu đơn hàng cho tier calculation
- **License Module** - License management cho customers
- **Contract Module** - Hợp đồng khách hàng
- **Promotion Module** - Khuyến mãi và coupon
- **Email Module** - Gửi email thông báo

---

## Xem thêm

- [ENTITY_RELATIONSHIPS.md](../../../packages/twenty-server/src/mkt-core/customer/ENTITY_RELATIONSHIPS.md) - ERD chi tiết
- [MKT_CUSTOMER_TIER_UPDATE_SYSTEM.md](./MKT_CUSTOMER_TIER_UPDATE_SYSTEM.md) - Chi tiết hệ thống tier update
