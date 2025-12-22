# Module Promotion - Technical Design Document

## 1. Overview

Module Promotion manages promotion campaigns, coupon/voucher codes and applies discounts to orders in the CRM system.

### 1.1 Objectives
- Manage promotion campaigns with multiple discount types
- Support coupon/voucher codes
- Define flexible application rules (by product, category, order value)
- Integrate with Order module for automatic discount calculation
- Track promotion usage history and analytics

### 1.2 Scope
- Promotion campaigns
- Promotion rules (application conditions)
- Coupon/Voucher management
- Order integration
- Usage tracking & analytics
- Audit trail

## 2. Folder Structure

```
mkt-promotion/
├── mkt-promotion.module.ts
├── configs/
│   ├── index.ts
│   └── mkt-promotion.config.ts              # Zod-validated config
├── constants/
│   ├── index.ts
│   ├── mkt-promotion-field-ids.ts           # Field IDs (module-specific)
│   ├── mkt-promotion-relation-ids.ts        # Relation IDs
│   ├── mkt-promotion.constants.ts           # Status, Types, Defaults
│   ├── mkt-promotion-cache.constants.ts     # Cache keys, TTL
│   └── mkt-promotion-log.constants.ts       # Log context
├── workspace-entities/
│   ├── index.ts
│   ├── mkt-promotion.workspace-entity.ts
│   ├── mkt-promotion-rule.workspace-entity.ts
│   ├── mkt-coupon.workspace-entity.ts
│   ├── mkt-promotion-usage.workspace-entity.ts
│   └── mkt-promotion-audit.workspace-entity.ts
├── services/
│   ├── index.ts
│   ├── application/
│   │   ├── promotion-application.service.ts  # Facade
│   │   ├── coupon-application.service.ts
│   │   └── promotion-usage-application.service.ts
│   ├── domain/
│   │   ├── promotion-calculation.service.ts
│   │   ├── promotion-validation.service.ts
│   │   └── rule-evaluation.service.ts
│   └── infrastructure/
│       ├── promotion-cache.service.ts
│       └── promotion-notification.service.ts
├── repositories/
│   ├── index.ts
│   ├── mkt-promotion.repository.ts
│   ├── mkt-promotion-rule.repository.ts
│   ├── mkt-coupon.repository.ts
│   └── mkt-promotion-usage.repository.ts
├── resolvers/
│   ├── index.ts
│   ├── promotion.resolver.ts
│   └── coupon.resolver.ts
├── dto/
│   ├── index.ts
│   ├── inputs/
│   │   ├── create-promotion.input.ts
│   │   ├── update-promotion.input.ts
│   │   ├── create-coupon.input.ts
│   │   └── calculate-discount.input.ts
│   └── outputs/
│       ├── promotion.output.ts
│       ├── coupon.output.ts
│       └── calculate-discount.output.ts
├── types/
│   ├── index.ts
│   ├── promotion.types.ts
│   ├── rule.types.ts
│   └── calculation.types.ts
├── events/
│   ├── index.ts
│   └── promotion.events.ts
├── jobs/
│   ├── index.ts
│   └── promotion-expiration.job.ts
├── errors/
│   ├── index.ts
│   └── promotion.errors.ts
├── message/
│   └── index.ts
├── utils/
│   ├── index.ts
│   ├── promotion-mapper.utils.ts
│   └── promotion-code-generator.utils.ts
├── hooks/
│   ├── index.ts
│   ├── mkt-promotion-create-one.pre-query.hook.ts
│   └── mkt-coupon-create-one.pre-query.hook.ts
└── listeners/
    ├── index.ts
    └── promotion-order-event.listener.ts
```

## 3. Database Schema (Workspace Entities)

> **IMPORTANT:** Object IDs must be added to the central file `mkt-core/constants/mkt-object-ids.ts`

### 3.1 MktPromotionWorkspaceEntity

Main promotion campaign entity.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `name` | TEXT | Yes | Promotion name |
| `code` | TEXT | Yes | Promotion code (unique) |
| `description` | TEXT | No | Detailed description |
| `status` | SELECT | Yes | Status (DRAFT, ACTIVE, PAUSED, EXPIRED, CANCELLED) |
| `promotionType` | SELECT | Yes | Type (PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y, FREE_SHIPPING) |
| `discountValue` | NUMBER | Yes | Discount value |
| `maxDiscountAmount` | NUMBER | No | Maximum discount amount (for % discount) |
| `minOrderAmount` | NUMBER | No | Minimum order value required |
| `currency` | TEXT | Yes | Currency code (default: VND) |
| `startDate` | DATETIME | Yes | Start date |
| `endDate` | DATETIME | No | End date |
| `usageLimit` | NUMBER | No | Total usage limit |
| `usageLimitPerCustomer` | NUMBER | No | Usage limit per customer |
| `currentUsageCount` | NUMBER | Yes | Current usage count |
| `priority` | NUMBER | Yes | Priority order (higher = more priority) |
| `stackable` | BOOLEAN | Yes | Can combine with other promotions |
| `isAutoApply` | BOOLEAN | Yes | Auto-apply without code |
| `metadata` | RAW_JSON | No | Extended data |
| `searchVector` | TS_VECTOR | No | Full-text search vector |
| `deletedAt` | DATETIME | No | Soft delete timestamp |
| `createdAt` | DATETIME | Yes | Creation timestamp |
| `updatedAt` | DATETIME | Yes | Last update timestamp |

**Relations:**
- `rules` → MktPromotionRuleWorkspaceEntity (ONE_TO_MANY)
- `coupons` → MktCouponWorkspaceEntity (ONE_TO_MANY)
- `usages` → MktPromotionUsageWorkspaceEntity (ONE_TO_MANY)
- `audits` → MktPromotionAuditWorkspaceEntity (ONE_TO_MANY)
- `createdBy` → WorkspaceMemberWorkspaceEntity (MANY_TO_ONE)

### 3.2 MktPromotionRuleWorkspaceEntity

Promotion application rules.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `name` | TEXT | Yes | Rule name |
| `ruleType` | SELECT | Yes | Rule type (PRODUCT, CATEGORY, ORDER_VALUE, CUSTOMER_TAG, CUSTOMER_SEGMENT) |
| `operator` | SELECT | Yes | Comparison operator (IN, NOT_IN, EQUALS, GREATER_THAN, LESS_THAN, BETWEEN) |
| `targetIds` | ARRAY | No | Target object IDs |
| `targetValues` | RAW_JSON | No | Comparison values (min, max, values) |
| `isRequired` | BOOLEAN | Yes | Must be satisfied |
| `logicOperator` | SELECT | Yes | AND/OR with other rules |
| `position` | NUMBER | Yes | Order in rule group |
| `deletedAt` | DATETIME | No | Soft delete timestamp |

**Relations:**
- `promotion` → MktPromotionWorkspaceEntity (MANY_TO_ONE)

### 3.3 MktCouponWorkspaceEntity

Coupon/voucher codes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `code` | TEXT | Yes | Coupon code (unique) |
| `status` | SELECT | Yes | Status (ACTIVE, USED, EXPIRED, DISABLED) |
| `usageLimit` | NUMBER | No | Usage limit |
| `currentUsageCount` | NUMBER | Yes | Current usage count |
| `validFrom` | DATETIME | No | Valid from date |
| `validTo` | DATETIME | No | Valid to date |
| `assignedCustomerId` | UUID | No | Assigned to specific customer |
| `metadata` | RAW_JSON | No | Extended data |
| `deletedAt` | DATETIME | No | Soft delete timestamp |

**Relations:**
- `promotion` → MktPromotionWorkspaceEntity (MANY_TO_ONE)
- `assignedCustomer` → MktCustomerWorkspaceEntity (MANY_TO_ONE)
- `usages` → MktPromotionUsageWorkspaceEntity (ONE_TO_MANY)

### 3.4 MktPromotionUsageWorkspaceEntity

Promotion usage history.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `discountAmount` | NUMBER | Yes | Discount amount applied |
| `originalAmount` | NUMBER | Yes | Original amount before discount |
| `appliedAt` | DATETIME | Yes | Application timestamp |
| `metadata` | RAW_JSON | No | Application details (snapshot) |
| `deletedAt` | DATETIME | No | Soft delete timestamp |

**Relations:**
- `promotion` → MktPromotionWorkspaceEntity (MANY_TO_ONE)
- `coupon` → MktCouponWorkspaceEntity (MANY_TO_ONE)
- `order` → MktOrderWorkspaceEntity (MANY_TO_ONE)
- `customer` → MktCustomerWorkspaceEntity (MANY_TO_ONE)

### 3.5 MktPromotionAuditWorkspaceEntity

Audit trail for promotion changes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `action` | SELECT | Yes | Action type (CREATE, UPDATE, ACTIVATE, PAUSE, CANCEL, EXPIRE) |
| `previousValues` | RAW_JSON | No | Previous field values |
| `newValues` | RAW_JSON | No | New field values |
| `changedBy` | TEXT | Yes | Workspace member ID |
| `changedAt` | DATETIME | Yes | Change timestamp |
| `deletedAt` | DATETIME | No | Soft delete timestamp |

**Relations:**
- `promotion` → MktPromotionWorkspaceEntity (MANY_TO_ONE)

## 4. Constants

### 4.1 Object IDs

> **Note:** These IDs must be added to `mkt-core/constants/mkt-object-ids.ts`

```typescript
// Add to mkt-core/constants/mkt-object-ids.ts
export const MKT_OBJECT_IDS = {
  // ... existing objects

  // Promotion module
  mktPromotion: '550e8400-e29b-41d4-a716-446655440101',
  mktPromotionRule: '550e8400-e29b-41d4-a716-446655440102',
  mktCoupon: '550e8400-e29b-41d4-a716-446655440103',
  mktPromotionUsage: '550e8400-e29b-41d4-a716-446655440104',
  mktPromotionAudit: '550e8400-e29b-41d4-a716-446655440105',
} as const;
```

### 4.2 Field IDs (`constants/mkt-promotion-field-ids.ts`)

```typescript
export const MKT_PROMOTION_FIELD_IDS = {
  mktPromotion: {
    name: '551e8400-e29b-41d4-a716-446655440101',
    code: '551e8400-e29b-41d4-a716-446655440102',
    description: '551e8400-e29b-41d4-a716-446655440103',
    status: '551e8400-e29b-41d4-a716-446655440104',
    promotionType: '551e8400-e29b-41d4-a716-446655440105',
    discountValue: '551e8400-e29b-41d4-a716-446655440106',
    maxDiscountAmount: '551e8400-e29b-41d4-a716-446655440107',
    minOrderAmount: '551e8400-e29b-41d4-a716-446655440108',
    currency: '551e8400-e29b-41d4-a716-446655440109',
    startDate: '551e8400-e29b-41d4-a716-446655440110',
    endDate: '551e8400-e29b-41d4-a716-446655440111',
    usageLimit: '551e8400-e29b-41d4-a716-446655440112',
    usageLimitPerCustomer: '551e8400-e29b-41d4-a716-446655440113',
    currentUsageCount: '551e8400-e29b-41d4-a716-446655440114',
    priority: '551e8400-e29b-41d4-a716-446655440115',
    stackable: '551e8400-e29b-41d4-a716-446655440116',
    isAutoApply: '551e8400-e29b-41d4-a716-446655440117',
    metadata: '551e8400-e29b-41d4-a716-446655440118',
    searchVector: '551e8400-e29b-41d4-a716-446655440119',
    deletedAt: '551e8400-e29b-41d4-a716-446655440120',
  },
  mktPromotionRule: {
    name: '552e8400-e29b-41d4-a716-446655440101',
    ruleType: '552e8400-e29b-41d4-a716-446655440102',
    operator: '552e8400-e29b-41d4-a716-446655440103',
    targetIds: '552e8400-e29b-41d4-a716-446655440104',
    targetValues: '552e8400-e29b-41d4-a716-446655440105',
    isRequired: '552e8400-e29b-41d4-a716-446655440106',
    logicOperator: '552e8400-e29b-41d4-a716-446655440107',
    position: '552e8400-e29b-41d4-a716-446655440108',
    deletedAt: '552e8400-e29b-41d4-a716-446655440109',
  },
  mktCoupon: {
    code: '553e8400-e29b-41d4-a716-446655440101',
    status: '553e8400-e29b-41d4-a716-446655440102',
    usageLimit: '553e8400-e29b-41d4-a716-446655440103',
    currentUsageCount: '553e8400-e29b-41d4-a716-446655440104',
    validFrom: '553e8400-e29b-41d4-a716-446655440105',
    validTo: '553e8400-e29b-41d4-a716-446655440106',
    assignedCustomerId: '553e8400-e29b-41d4-a716-446655440107',
    metadata: '553e8400-e29b-41d4-a716-446655440108',
    deletedAt: '553e8400-e29b-41d4-a716-446655440109',
  },
  mktPromotionUsage: {
    discountAmount: '554e8400-e29b-41d4-a716-446655440101',
    originalAmount: '554e8400-e29b-41d4-a716-446655440102',
    appliedAt: '554e8400-e29b-41d4-a716-446655440103',
    metadata: '554e8400-e29b-41d4-a716-446655440104',
    deletedAt: '554e8400-e29b-41d4-a716-446655440105',
  },
  mktPromotionAudit: {
    action: '555e8400-e29b-41d4-a716-446655440101',
    previousValues: '555e8400-e29b-41d4-a716-446655440102',
    newValues: '555e8400-e29b-41d4-a716-446655440103',
    changedBy: '555e8400-e29b-41d4-a716-446655440104',
    changedAt: '555e8400-e29b-41d4-a716-446655440105',
    deletedAt: '555e8400-e29b-41d4-a716-446655440106',
  },
} as const;
```

### 4.3 Relation IDs (`constants/mkt-promotion-relation-ids.ts`)

```typescript
export const MKT_PROMOTION_RELATION_IDS = {
  // Promotion relations
  mktPromotionToRules: '660e8400-e29b-41d4-a716-446655440201',
  mktPromotionToCoupons: '660e8400-e29b-41d4-a716-446655440202',
  mktPromotionToUsages: '660e8400-e29b-41d4-a716-446655440203',
  mktPromotionToAudits: '660e8400-e29b-41d4-a716-446655440204',
  mktPromotionToCreatedBy: '660e8400-e29b-41d4-a716-446655440205',

  // Rule relations
  mktRuleToPromotion: '660e8400-e29b-41d4-a716-446655440301',

  // Coupon relations
  mktCouponToPromotion: '660e8400-e29b-41d4-a716-446655440401',
  mktCouponToAssignedCustomer: '660e8400-e29b-41d4-a716-446655440402',
  mktCouponToUsages: '660e8400-e29b-41d4-a716-446655440403',

  // Usage relations
  mktUsageToPromotion: '660e8400-e29b-41d4-a716-446655440501',
  mktUsageToCoupon: '660e8400-e29b-41d4-a716-446655440502',
  mktUsageToOrder: '660e8400-e29b-41d4-a716-446655440503',
  mktUsageToCustomer: '660e8400-e29b-41d4-a716-446655440504',

  // Audit relations
  mktAuditToPromotion: '660e8400-e29b-41d4-a716-446655440601',
} as const;
```

### 4.4 Status & Type Constants (`constants/mkt-promotion.constants.ts`)

```typescript
// Promotion Status
export const PROMOTION_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export type PromotionStatus = (typeof PROMOTION_STATUS)[keyof typeof PROMOTION_STATUS];

// Promotion Type
export const PROMOTION_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  BUY_X_GET_Y: 'BUY_X_GET_Y',
  FREE_SHIPPING: 'FREE_SHIPPING',
} as const;

export type PromotionType = (typeof PROMOTION_TYPE)[keyof typeof PROMOTION_TYPE];

// Rule Type
export const PROMOTION_RULE_TYPE = {
  PRODUCT: 'PRODUCT',
  CATEGORY: 'CATEGORY',
  VARIANT: 'VARIANT',
  ORDER_VALUE: 'ORDER_VALUE',
  CUSTOMER_TAG: 'CUSTOMER_TAG',
  CUSTOMER_SEGMENT: 'CUSTOMER_SEGMENT',
  FIRST_ORDER: 'FIRST_ORDER',
  QUANTITY: 'QUANTITY',
} as const;

export type PromotionRuleType = (typeof PROMOTION_RULE_TYPE)[keyof typeof PROMOTION_RULE_TYPE];

// Rule Operator
export const RULE_OPERATOR = {
  IN: 'IN',
  NOT_IN: 'NOT_IN',
  EQUALS: 'EQUALS',
  NOT_EQUALS: 'NOT_EQUALS',
  GREATER_THAN: 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL: 'GREATER_THAN_OR_EQUAL',
  LESS_THAN: 'LESS_THAN',
  LESS_THAN_OR_EQUAL: 'LESS_THAN_OR_EQUAL',
  BETWEEN: 'BETWEEN',
} as const;

export type RuleOperator = (typeof RULE_OPERATOR)[keyof typeof RULE_OPERATOR];

// Logic Operator
export const LOGIC_OPERATOR = {
  AND: 'AND',
  OR: 'OR',
} as const;

export type LogicOperator = (typeof LOGIC_OPERATOR)[keyof typeof LOGIC_OPERATOR];

// Coupon Status
export const COUPON_STATUS = {
  ACTIVE: 'ACTIVE',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
  DISABLED: 'DISABLED',
} as const;

export type CouponStatus = (typeof COUPON_STATUS)[keyof typeof COUPON_STATUS];

// Audit Action
export const PROMOTION_AUDIT_ACTION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  ACTIVATE: 'ACTIVATE',
  PAUSE: 'PAUSE',
  CANCEL: 'CANCEL',
  EXPIRE: 'EXPIRE',
} as const;

export type PromotionAuditAction = (typeof PROMOTION_AUDIT_ACTION)[keyof typeof PROMOTION_AUDIT_ACTION];

// Default Values
export const PROMOTION_DEFAULTS = {
  PRIORITY: 0,
  STACKABLE: false,
  IS_AUTO_APPLY: false,
  CURRENT_USAGE_COUNT: 0,
  CURRENCY: 'VND',
} as const;
```

### 4.5 Cache Constants (`constants/mkt-promotion-cache.constants.ts`)

```typescript
export const PROMOTION_CACHE = {
  TTL_SECONDS: 300, // 5 minutes
  KEY_PREFIX: 'mkt-promotion',
  ACTIVE_PROMOTIONS_KEY: 'active-promotions',
  PROMOTION_BY_ID_PREFIX: 'promotion',
  PROMOTION_BY_CODE_PREFIX: 'promotion-code',
} as const;
```

### 4.6 Log Constants (`constants/mkt-promotion-log.constants.ts`)

```typescript
export const PROMOTION_LOG_CONTEXT = 'MktPromotion';
```

### 4.7 SELECT Options

```typescript
export const PROMOTION_STATUS_OPTIONS = [
  { value: PROMOTION_STATUS.DRAFT, label: 'Draft', color: 'gray' as TagColor, position: 0 },
  { value: PROMOTION_STATUS.ACTIVE, label: 'Active', color: 'green' as TagColor, position: 1 },
  { value: PROMOTION_STATUS.PAUSED, label: 'Paused', color: 'yellow' as TagColor, position: 2 },
  { value: PROMOTION_STATUS.EXPIRED, label: 'Expired', color: 'red' as TagColor, position: 3 },
  { value: PROMOTION_STATUS.CANCELLED, label: 'Cancelled', color: 'red' as TagColor, position: 4 },
];

export const PROMOTION_TYPE_OPTIONS = [
  { value: PROMOTION_TYPE.PERCENTAGE, label: 'Percentage Discount', color: 'blue' as TagColor, position: 0 },
  { value: PROMOTION_TYPE.FIXED_AMOUNT, label: 'Fixed Amount Discount', color: 'green' as TagColor, position: 1 },
  { value: PROMOTION_TYPE.BUY_X_GET_Y, label: 'Buy X Get Y', color: 'purple' as TagColor, position: 2 },
  { value: PROMOTION_TYPE.FREE_SHIPPING, label: 'Free Shipping', color: 'orange' as TagColor, position: 3 },
];

export const PROMOTION_RULE_TYPE_OPTIONS = [
  { value: PROMOTION_RULE_TYPE.PRODUCT, label: 'Product', position: 0 },
  { value: PROMOTION_RULE_TYPE.CATEGORY, label: 'Category', position: 1 },
  { value: PROMOTION_RULE_TYPE.VARIANT, label: 'Variant', position: 2 },
  { value: PROMOTION_RULE_TYPE.ORDER_VALUE, label: 'Order Value', position: 3 },
  { value: PROMOTION_RULE_TYPE.CUSTOMER_TAG, label: 'Customer Tag', position: 4 },
  { value: PROMOTION_RULE_TYPE.CUSTOMER_SEGMENT, label: 'Customer Segment', position: 5 },
  { value: PROMOTION_RULE_TYPE.FIRST_ORDER, label: 'First Order', position: 6 },
  { value: PROMOTION_RULE_TYPE.QUANTITY, label: 'Product Quantity', position: 7 },
];

export const COUPON_STATUS_OPTIONS = [
  { value: COUPON_STATUS.ACTIVE, label: 'Active', color: 'green' as TagColor, position: 0 },
  { value: COUPON_STATUS.USED, label: 'Used', color: 'gray' as TagColor, position: 1 },
  { value: COUPON_STATUS.EXPIRED, label: 'Expired', color: 'red' as TagColor, position: 2 },
  { value: COUPON_STATUS.DISABLED, label: 'Disabled', color: 'red' as TagColor, position: 3 },
];

export const PROMOTION_AUDIT_ACTION_OPTIONS = [
  { value: PROMOTION_AUDIT_ACTION.CREATE, label: 'Created', position: 0 },
  { value: PROMOTION_AUDIT_ACTION.UPDATE, label: 'Updated', position: 1 },
  { value: PROMOTION_AUDIT_ACTION.ACTIVATE, label: 'Activated', position: 2 },
  { value: PROMOTION_AUDIT_ACTION.PAUSE, label: 'Paused', position: 3 },
  { value: PROMOTION_AUDIT_ACTION.CANCEL, label: 'Cancelled', position: 4 },
  { value: PROMOTION_AUDIT_ACTION.EXPIRE, label: 'Expired', position: 5 },
];
```

## 5. Configuration (`configs/mkt-promotion.config.ts`)

```typescript
import { z } from 'zod';

const promotionConfigSchema = z.object({
  PROMOTION_CACHE_TTL_SECONDS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 300)),

  PROMOTION_MAX_RULES_PER_PROMOTION: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),

  PROMOTION_MAX_COUPONS_BULK_CREATE: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1000)),

  PROMOTION_EXPIRATION_CHECK_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val !== 'false'),

  PROMOTION_EXPIRATION_CHECK_CRON: z
    .string()
    .optional()
    .transform((val) => val ?? '0 0 * * * *'), // Every hour

  PROMOTION_COUPON_CODE_LENGTH: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 8)),
});

const parsedEnv = promotionConfigSchema.safeParse({
  PROMOTION_CACHE_TTL_SECONDS: process.env.PROMOTION_CACHE_TTL_SECONDS,
  PROMOTION_MAX_RULES_PER_PROMOTION: process.env.PROMOTION_MAX_RULES_PER_PROMOTION,
  PROMOTION_MAX_COUPONS_BULK_CREATE: process.env.PROMOTION_MAX_COUPONS_BULK_CREATE,
  PROMOTION_EXPIRATION_CHECK_ENABLED: process.env.PROMOTION_EXPIRATION_CHECK_ENABLED,
  PROMOTION_EXPIRATION_CHECK_CRON: process.env.PROMOTION_EXPIRATION_CHECK_CRON,
  PROMOTION_COUPON_CODE_LENGTH: process.env.PROMOTION_COUPON_CODE_LENGTH,
});

export const MKT_PROMOTION_CONFIG = parsedEnv.success
  ? parsedEnv.data
  : promotionConfigSchema.parse({});
```

## 6. Types

### 6.1 Promotion Types (`types/promotion.types.ts`)

```typescript
// Promotion with relations
export type PromotionWithRules = {
  promotion: MktPromotionWorkspaceEntity;
  rules: MktPromotionRuleWorkspaceEntity[];
};

export type PromotionWithCoupons = {
  promotion: MktPromotionWorkspaceEntity;
  coupons: MktCouponWorkspaceEntity[];
};

export type PromotionFull = {
  promotion: MktPromotionWorkspaceEntity;
  rules: MktPromotionRuleWorkspaceEntity[];
  coupons: MktCouponWorkspaceEntity[];
};

// Create/Update Data
export type CreatePromotionData = {
  name: string;
  code: string;
  description?: string;
  promotionType: PromotionType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  currency?: string;
  startDate: Date;
  endDate?: Date;
  usageLimit?: number;
  usageLimitPerCustomer?: number;
  priority?: number;
  stackable?: boolean;
  isAutoApply?: boolean;
  rules?: CreatePromotionRuleData[];
};

export type UpdatePromotionData = Partial<CreatePromotionData> & {
  id: string;
};

export type CreatePromotionRuleData = {
  name: string;
  ruleType: PromotionRuleType;
  operator: RuleOperator;
  targetIds?: string[];
  targetValues?: Record<string, unknown>;
  isRequired?: boolean;
  logicOperator?: LogicOperator;
  position?: number;
};

// Coupon Data
export type CreateCouponData = {
  code?: string; // Auto-generate if not provided
  promotionId: string;
  usageLimit?: number;
  validFrom?: Date;
  validTo?: Date;
  assignedCustomerId?: string;
};

export type CreateBulkCouponsData = {
  promotionId: string;
  quantity: number;
  prefix?: string;
  usageLimit?: number;
  validFrom?: Date;
  validTo?: Date;
};

// Calculation Types
export type PromotionEvaluationContext = {
  workspaceId: string;
  customerId: string;
  orderItems: OrderItemForPromotion[];
  orderSubtotal: number;
  couponCode?: string;
  customerTags?: string[];
  isFirstOrder?: boolean;
};

export type OrderItemForPromotion = {
  productId: string;
  variantId?: string;
  categoryId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type PromotionCalculationResult = {
  applicable: boolean;
  promotion: MktPromotionWorkspaceEntity | null;
  coupon: MktCouponWorkspaceEntity | null;
  discountAmount: number;
  discountedItems?: DiscountedItem[];
  reason?: string;
  errors?: PromotionValidationError[];
};

export type DiscountedItem = {
  orderItemIndex: number;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
};

export type AppliedPromotionsResult = {
  promotions: AppliedPromotion[];
  totalDiscount: number;
  finalOrderAmount: number;
};

export type AppliedPromotion = {
  promotionId: string;
  promotionName: string;
  promotionCode: string;
  couponCode?: string;
  discountType: PromotionType;
  discountValue: number;
  discountAmount: number;
};

// Validation Types
export type PromotionValidationError = {
  code: string;
  field?: string;
  message: string;
};

export type RuleEvaluationResult = {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  reason?: string;
};

// Filter Types
export type PromotionFilter = {
  status?: PromotionStatus;
  promotionType?: PromotionType;
  startDateFrom?: Date;
  startDateTo?: Date;
  isAutoApply?: boolean;
  stackable?: boolean;
  search?: string;
};

// Snapshot for Order
export type PromotionSnapshot = {
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  promotionType: PromotionType;
  discountValue: number;
  couponCode?: string;
  discountAmount: number;
  appliedAt: string;
  checksum: string;
};
```

## 7. Events (`events/promotion.events.ts`)

```typescript
export class PromotionCreatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly promotionId: string,
    public readonly promotionCode: string,
    public readonly createdBy: string,
  ) {}
}

export class PromotionActivatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly promotionId: string,
    public readonly activatedBy: string,
  ) {}
}

export class PromotionPausedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly promotionId: string,
    public readonly pausedBy: string,
  ) {}
}

export class PromotionExpiredEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly promotionId: string,
    public readonly reason: 'DATE_EXPIRED' | 'USAGE_LIMIT_REACHED',
  ) {}
}

export class PromotionCancelledEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly promotionId: string,
    public readonly cancelledBy: string,
  ) {}
}

export class CouponCreatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly couponId: string,
    public readonly couponCode: string,
    public readonly promotionId: string,
  ) {}
}

export class CouponRedeemedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly couponId: string,
    public readonly couponCode: string,
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly discountAmount: number,
  ) {}
}

export class PromotionAppliedToOrderEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly orderId: string,
    public readonly appliedPromotions: AppliedPromotion[],
    public readonly totalDiscount: number,
  ) {}
}
```

## 8. Services

### 8.1 PromotionApplicationService (Facade)

```typescript
@Injectable()
export class PromotionApplicationService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly promotionRepository: MktPromotionRepository,
    private readonly ruleRepository: MktPromotionRuleRepository,
    private readonly calculationService: PromotionCalculationService,
    private readonly validationService: PromotionValidationService,
    private readonly usageService: PromotionUsageApplicationService,
    private readonly cacheService: PromotionCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================
  // READ OPERATIONS
  // ============================================

  async getPromotionById(
    workspaceId: string,
    promotionId: string,
  ): Promise<PromotionWithRules | null>;

  async getActivePromotions(
    workspaceId: string,
  ): Promise<MktPromotionWorkspaceEntity[]>;

  async getPromotionByCode(
    workspaceId: string,
    code: string,
  ): Promise<PromotionWithRules | null>;

  async listPromotions(
    workspaceId: string,
    filter: PromotionFilter,
    pagination: PaginationInput,
  ): Promise<PaginatedResult<MktPromotionWorkspaceEntity>>;

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  async createPromotion(
    workspaceId: string,
    data: CreatePromotionData,
    createdBy: string,
  ): Promise<PromotionWithRules>;

  async updatePromotion(
    workspaceId: string,
    data: UpdatePromotionData,
    updatedBy: string,
  ): Promise<PromotionWithRules>;

  async activatePromotion(
    workspaceId: string,
    promotionId: string,
    activatedBy: string,
  ): Promise<MktPromotionWorkspaceEntity>;

  async pausePromotion(
    workspaceId: string,
    promotionId: string,
    pausedBy: string,
  ): Promise<MktPromotionWorkspaceEntity>;

  async cancelPromotion(
    workspaceId: string,
    promotionId: string,
    cancelledBy: string,
  ): Promise<MktPromotionWorkspaceEntity>;

  // ============================================
  // CALCULATION & APPLICATION
  // ============================================

  async calculateDiscount(
    workspaceId: string,
    context: PromotionEvaluationContext,
  ): Promise<AppliedPromotionsResult>;

  async applyPromotionToOrder(
    workspaceId: string,
    orderId: string,
    promotionId: string,
    couponCode?: string,
  ): Promise<PromotionCalculationResult>;

  async removePromotionFromOrder(
    workspaceId: string,
    orderId: string,
    promotionId: string,
  ): Promise<void>;

  // ============================================
  // RULE MANAGEMENT
  // ============================================

  async addRule(
    workspaceId: string,
    promotionId: string,
    ruleData: CreatePromotionRuleData,
  ): Promise<MktPromotionRuleWorkspaceEntity>;

  async updateRule(
    workspaceId: string,
    ruleId: string,
    ruleData: Partial<CreatePromotionRuleData>,
  ): Promise<MktPromotionRuleWorkspaceEntity>;

  async removeRule(
    workspaceId: string,
    ruleId: string,
  ): Promise<void>;
}
```

### 8.2 PromotionCacheService (`services/infrastructure/promotion-cache.service.ts`)

> **Note:** Requires adding `MktPromotion` to `CacheStorageNamespace` enum

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectWorkspaceCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { WorkspaceCacheStorageService } from 'src/engine/core-modules/cache-storage/workspace-cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { PROMOTION_CACHE, PROMOTION_LOG_CONTEXT } from '../constants';

@Injectable()
export class PromotionCacheService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    @InjectWorkspaceCacheStorage(CacheStorageNamespace.MktPromotion)
    private readonly cacheStorage: WorkspaceCacheStorageService,
  ) {}

  async getActivePromotions(
    workspaceId: string,
  ): Promise<MktPromotionWorkspaceEntity[] | null> {
    const cacheKey = this.buildActivePromotionsKey(workspaceId);
    return this.cacheStorage.get<MktPromotionWorkspaceEntity[]>(cacheKey);
  }

  async setActivePromotions(
    workspaceId: string,
    promotions: MktPromotionWorkspaceEntity[],
  ): Promise<void> {
    const cacheKey = this.buildActivePromotionsKey(workspaceId);
    await this.cacheStorage.set(cacheKey, promotions, PROMOTION_CACHE.TTL_SECONDS);
  }

  async invalidateActivePromotions(workspaceId: string): Promise<void> {
    const cacheKey = this.buildActivePromotionsKey(workspaceId);
    await this.cacheStorage.del(cacheKey);
    this.logger.debug(`Invalidated active promotions cache for workspace: ${workspaceId}`);
  }

  async getPromotion(
    workspaceId: string,
    promotionId: string,
  ): Promise<MktPromotionWorkspaceEntity | null> {
    const cacheKey = this.buildPromotionKey(workspaceId, promotionId);
    return this.cacheStorage.get<MktPromotionWorkspaceEntity>(cacheKey);
  }

  async setPromotion(
    workspaceId: string,
    promotion: MktPromotionWorkspaceEntity,
  ): Promise<void> {
    const cacheKey = this.buildPromotionKey(workspaceId, promotion.id);
    await this.cacheStorage.set(cacheKey, promotion, PROMOTION_CACHE.TTL_SECONDS);
  }

  async invalidatePromotion(workspaceId: string, promotionId: string): Promise<void> {
    const cacheKey = this.buildPromotionKey(workspaceId, promotionId);
    await this.cacheStorage.del(cacheKey);
  }

  async getPromotionByCode(
    workspaceId: string,
    code: string,
  ): Promise<MktPromotionWorkspaceEntity | null> {
    const cacheKey = this.buildPromotionByCodeKey(workspaceId, code);
    return this.cacheStorage.get<MktPromotionWorkspaceEntity>(cacheKey);
  }

  async setPromotionByCode(
    workspaceId: string,
    code: string,
    promotion: MktPromotionWorkspaceEntity,
  ): Promise<void> {
    const cacheKey = this.buildPromotionByCodeKey(workspaceId, code);
    await this.cacheStorage.set(cacheKey, promotion, PROMOTION_CACHE.TTL_SECONDS);
  }

  private buildActivePromotionsKey(workspaceId: string): string {
    return `${PROMOTION_CACHE.KEY_PREFIX}:${workspaceId}:${PROMOTION_CACHE.ACTIVE_PROMOTIONS_KEY}`;
  }

  private buildPromotionKey(workspaceId: string, promotionId: string): string {
    return `${PROMOTION_CACHE.KEY_PREFIX}:${workspaceId}:${PROMOTION_CACHE.PROMOTION_BY_ID_PREFIX}:${promotionId}`;
  }

  private buildPromotionByCodeKey(workspaceId: string, code: string): string {
    return `${PROMOTION_CACHE.KEY_PREFIX}:${workspaceId}:${PROMOTION_CACHE.PROMOTION_BY_CODE_PREFIX}:${code}`;
  }
}
```

### 8.3 PromotionCalculationService (`services/domain/promotion-calculation.service.ts`)

```typescript
@Injectable()
export class PromotionCalculationService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly promotionRepository: MktPromotionRepository,
    private readonly ruleEvaluationService: RuleEvaluationService,
    private readonly usageService: PromotionUsageApplicationService,
  ) {}

  /**
   * Calculate order discount based on applicable promotions
   */
  async calculateOrderDiscount(
    workspaceId: string,
    context: PromotionEvaluationContext,
  ): Promise<AppliedPromotionsResult> {
    // 1. Get active promotions
    const promotions = await this.getApplicablePromotions(workspaceId, context);

    // 2. Sort by priority (highest first)
    const sortedPromotions = this.sortByPriority(promotions);

    // 3. Apply promotions (respect stackable flag)
    const appliedPromotions: AppliedPromotion[] = [];
    let remainingAmount = context.orderSubtotal;

    for (const promotion of sortedPromotions) {
      if (!promotion.stackable && appliedPromotions.length > 0) {
        continue;
      }

      const discount = this.calculatePromotionDiscount(
        promotion,
        context,
        remainingAmount,
      );

      if (discount > 0) {
        appliedPromotions.push({
          promotionId: promotion.id,
          promotionName: promotion.name,
          promotionCode: promotion.code,
          discountType: promotion.promotionType,
          discountValue: promotion.discountValue,
          discountAmount: discount,
        });

        remainingAmount -= discount;
      }
    }

    const totalDiscount = appliedPromotions.reduce(
      (sum, p) => sum + p.discountAmount,
      0,
    );

    return {
      promotions: appliedPromotions,
      totalDiscount,
      finalOrderAmount: context.orderSubtotal - totalDiscount,
    };
  }

  /**
   * Calculate discount for a specific promotion
   */
  calculatePromotionDiscount(
    promotion: MktPromotionWorkspaceEntity,
    context: PromotionEvaluationContext,
    baseAmount: number,
  ): number {
    let discount = 0;

    switch (promotion.promotionType) {
      case PROMOTION_TYPE.PERCENTAGE:
        discount = (baseAmount * promotion.discountValue) / 100;
        if (promotion.maxDiscountAmount) {
          discount = Math.min(discount, promotion.maxDiscountAmount);
        }
        break;

      case PROMOTION_TYPE.FIXED_AMOUNT:
        discount = Math.min(promotion.discountValue, baseAmount);
        break;

      case PROMOTION_TYPE.BUY_X_GET_Y:
        discount = this.calculateBuyXGetYDiscount(promotion, context);
        break;

      case PROMOTION_TYPE.FREE_SHIPPING:
        // Handled separately in shipping calculation
        discount = 0;
        break;
    }

    return Math.max(0, Math.round(discount));
  }

  private sortByPriority(
    promotions: MktPromotionWorkspaceEntity[],
  ): MktPromotionWorkspaceEntity[] {
    return [...promotions].sort((a, b) => b.priority - a.priority);
  }

  private calculateBuyXGetYDiscount(
    promotion: MktPromotionWorkspaceEntity,
    context: PromotionEvaluationContext,
  ): number {
    // Implementation for Buy X Get Y discount type
    // Extract X and Y from promotion.metadata
    return 0;
  }
}
```

### 8.4 PromotionValidationService (`services/domain/promotion-validation.service.ts`)

```typescript
@Injectable()
export class PromotionValidationService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly promotionRepository: MktPromotionRepository,
    private readonly couponRepository: MktCouponRepository,
    private readonly usageService: PromotionUsageApplicationService,
  ) {}

  /**
   * Validate if promotion can be applied to context
   */
  async validatePromotion(
    workspaceId: string,
    promotionId: string,
    context: PromotionEvaluationContext,
  ): Promise<{ isValid: boolean; errors: PromotionValidationError[] }> {
    const errors: PromotionValidationError[] = [];

    const promotion = await this.promotionRepository.findById(
      workspaceId,
      promotionId,
    );

    if (!promotion) {
      errors.push({
        code: 'PROMOTION_NOT_FOUND',
        message: 'Promotion not found',
      });
      return { isValid: false, errors };
    }

    // Check status
    if (promotion.status !== PROMOTION_STATUS.ACTIVE) {
      errors.push({
        code: 'PROMOTION_NOT_ACTIVE',
        message: 'Promotion is not active',
      });
    }

    // Check date range
    const now = DateTimeUtils.now();
    if (promotion.startDate && now < promotion.startDate) {
      errors.push({
        code: 'PROMOTION_NOT_STARTED',
        message: 'Promotion has not started yet',
      });
    }
    if (promotion.endDate && now > promotion.endDate) {
      errors.push({
        code: 'PROMOTION_EXPIRED',
        message: 'Promotion has expired',
      });
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.currentUsageCount >= promotion.usageLimit) {
      errors.push({
        code: 'PROMOTION_USAGE_LIMIT_REACHED',
        message: 'Promotion usage limit has been reached',
      });
    }

    // Check per-customer usage limit
    if (promotion.usageLimitPerCustomer) {
      const customerUsage = await this.usageService.getCustomerUsageCount(
        workspaceId,
        promotionId,
        context.customerId,
      );

      if (customerUsage >= promotion.usageLimitPerCustomer) {
        errors.push({
          code: 'CUSTOMER_USAGE_LIMIT_REACHED',
          message: 'You have reached the usage limit for this promotion',
        });
      }
    }

    // Check min order amount
    if (promotion.minOrderAmount && context.orderSubtotal < promotion.minOrderAmount) {
      errors.push({
        code: 'MIN_ORDER_AMOUNT_NOT_MET',
        field: 'minOrderAmount',
        message: `Minimum order amount is ${promotion.minOrderAmount}`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate coupon code
   */
  async validateCoupon(
    workspaceId: string,
    couponCode: string,
    customerId: string,
  ): Promise<{ isValid: boolean; coupon: MktCouponWorkspaceEntity | null; errors: PromotionValidationError[] }> {
    const errors: PromotionValidationError[] = [];

    const coupon = await this.couponRepository.findByCode(workspaceId, couponCode);

    if (!coupon) {
      errors.push({
        code: 'COUPON_NOT_FOUND',
        message: 'Coupon code not found',
      });
      return { isValid: false, coupon: null, errors };
    }

    // Check status
    if (coupon.status !== COUPON_STATUS.ACTIVE) {
      errors.push({
        code: 'COUPON_NOT_ACTIVE',
        message: 'Coupon is no longer valid',
      });
    }

    // Check validity period
    const now = DateTimeUtils.now();
    if (coupon.validFrom && now < coupon.validFrom) {
      errors.push({
        code: 'COUPON_NOT_STARTED',
        message: 'Coupon is not yet valid',
      });
    }
    if (coupon.validTo && now > coupon.validTo) {
      errors.push({
        code: 'COUPON_EXPIRED',
        message: 'Coupon has expired',
      });
    }

    // Check assigned customer
    if (coupon.assignedCustomerId && coupon.assignedCustomerId !== customerId) {
      errors.push({
        code: 'COUPON_NOT_FOR_CUSTOMER',
        message: 'This coupon is not valid for your account',
      });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.currentUsageCount >= coupon.usageLimit) {
      errors.push({
        code: 'COUPON_USAGE_LIMIT_REACHED',
        message: 'Coupon usage limit has been reached',
      });
    }

    return {
      isValid: errors.length === 0,
      coupon,
      errors,
    };
  }

  /**
   * Validate create promotion data
   */
  validateCreateData(data: CreatePromotionData): { isValid: boolean; errors: PromotionValidationError[] } {
    const errors: PromotionValidationError[] = [];

    // Required fields
    if (!data.name?.trim()) {
      errors.push({ code: 'NAME_REQUIRED', field: 'name', message: 'Promotion name is required' });
    }

    if (!data.code?.trim()) {
      errors.push({ code: 'CODE_REQUIRED', field: 'code', message: 'Promotion code is required' });
    }

    // Discount value validation
    if (data.discountValue <= 0) {
      errors.push({ code: 'INVALID_DISCOUNT_VALUE', field: 'discountValue', message: 'Discount value must be greater than 0' });
    }

    if (data.promotionType === PROMOTION_TYPE.PERCENTAGE && data.discountValue > 100) {
      errors.push({ code: 'INVALID_PERCENTAGE', field: 'discountValue', message: 'Percentage discount cannot exceed 100%' });
    }

    // Date validation
    if (data.endDate && data.startDate > data.endDate) {
      errors.push({ code: 'INVALID_DATE_RANGE', field: 'endDate', message: 'End date must be after start date' });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
```

### 8.5 CouponApplicationService (`services/application/coupon-application.service.ts`)

```typescript
@Injectable()
export class CouponApplicationService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly couponRepository: MktCouponRepository,
    private readonly promotionRepository: MktPromotionRepository,
    private readonly validationService: PromotionValidationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create single coupon
   */
  async createCoupon(
    workspaceId: string,
    data: CreateCouponData,
  ): Promise<MktCouponWorkspaceEntity> {
    // Verify promotion exists
    const promotion = await this.promotionRepository.findById(
      workspaceId,
      data.promotionId,
    );

    if (!promotion) {
      throw new PromotionNotFoundError(data.promotionId);
    }

    const code = data.code || generateSecureCouponCode();

    // Check code uniqueness
    const existingCoupon = await this.couponRepository.findByCode(workspaceId, code);
    if (existingCoupon) {
      throw new CouponCodeDuplicateError(code);
    }

    const coupon = await this.couponRepository.create(workspaceId, {
      ...data,
      code,
      status: COUPON_STATUS.ACTIVE,
      currentUsageCount: 0,
    });

    this.eventEmitter.emit('coupon.created', new CouponCreatedEvent(
      workspaceId,
      coupon.id,
      coupon.code,
      data.promotionId,
    ));

    return coupon;
  }

  /**
   * Create multiple coupons at once
   */
  async createBulkCoupons(
    workspaceId: string,
    data: CreateBulkCouponsData,
  ): Promise<MktCouponWorkspaceEntity[]> {
    const existingCodesChecker = async (codes: string[]): Promise<string[]> => {
      const existing = await this.couponRepository.findByCodes(workspaceId, codes);
      return existing.map((c) => c.code);
    };

    const codes = await generateBatchCouponCodes(
      data.quantity,
      data.prefix ?? '',
      existingCodesChecker,
    );

    const coupons: MktCouponWorkspaceEntity[] = [];

    for (const code of codes) {
      const coupon = await this.couponRepository.create(workspaceId, {
        promotionId: data.promotionId,
        code,
        status: COUPON_STATUS.ACTIVE,
        currentUsageCount: 0,
        usageLimit: data.usageLimit,
        validFrom: data.validFrom,
        validTo: data.validTo,
      });

      coupons.push(coupon);
    }

    return coupons;
  }

  /**
   * Apply coupon to order
   */
  async applyCoupon(
    workspaceId: string,
    couponCode: string,
    customerId: string,
  ): Promise<{ promotion: MktPromotionWorkspaceEntity; coupon: MktCouponWorkspaceEntity }> {
    const validation = await this.validationService.validateCoupon(
      workspaceId,
      couponCode,
      customerId,
    );

    if (!validation.isValid) {
      throw new CouponValidationException(validation.errors);
    }

    const coupon = validation.coupon!;
    const promotion = await this.promotionRepository.findById(
      workspaceId,
      coupon.promotionId,
    );

    if (!promotion) {
      throw new PromotionNotFoundError(coupon.promotionId);
    }

    return { promotion, coupon };
  }

  /**
   * Mark coupon as used
   */
  async markCouponUsed(
    workspaceId: string,
    couponId: string,
  ): Promise<void> {
    await this.couponRepository.incrementUsageCount(workspaceId, couponId);

    const coupon = await this.couponRepository.findById(workspaceId, couponId);

    // Update status if usage limit reached
    if (coupon && coupon.usageLimit && coupon.currentUsageCount >= coupon.usageLimit) {
      await this.couponRepository.updateStatus(
        workspaceId,
        couponId,
        COUPON_STATUS.USED,
      );
    }
  }
}
```

## 9. Utils

### 9.1 Coupon Code Generator (`utils/promotion-code-generator.utils.ts`)

```typescript
import { randomBytes } from 'crypto';
import { MKT_PROMOTION_CONFIG } from '../configs/mkt-promotion.config';

/**
 * Generate secure random coupon code
 */
export const generateSecureCouponCode = (
  prefix = '',
  length = MKT_PROMOTION_CONFIG.PROMOTION_COUPON_CODE_LENGTH,
): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = randomBytes(length);
  let code = prefix;

  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }

  return code;
};

/**
 * Generate batch of unique coupon codes
 */
export const generateBatchCouponCodes = async (
  quantity: number,
  prefix: string,
  existingCodesChecker: (codes: string[]) => Promise<string[]>,
): Promise<string[]> => {
  const codes: string[] = [];
  const maxAttempts = quantity * 3; // Prevent infinite loop
  let attempts = 0;

  while (codes.length < quantity && attempts < maxAttempts) {
    const candidateCodes = Array.from(
      { length: quantity - codes.length },
      () => generateSecureCouponCode(prefix),
    );

    const existingCodes = await existingCodesChecker(candidateCodes);
    const newCodes = candidateCodes.filter((code) => !existingCodes.includes(code));
    codes.push(...newCodes);
    attempts++;
  }

  if (codes.length < quantity) {
    throw new Error('Unable to generate unique codes after max attempts');
  }

  return codes;
};
```

## 10. Jobs

### 10.1 Promotion Expiration Job (`jobs/promotion-expiration.job.ts`)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MKT_PROMOTION_CONFIG } from '../configs/mkt-promotion.config';
import { PROMOTION_STATUS, PROMOTION_LOG_CONTEXT } from '../constants';

@Injectable()
export class PromotionExpirationJob {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly promotionRepository: MktPromotionRepository,
    private readonly cacheService: PromotionCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(MKT_PROMOTION_CONFIG.PROMOTION_EXPIRATION_CHECK_CRON)
  async handlePromotionExpiration(): Promise<void> {
    if (!MKT_PROMOTION_CONFIG.PROMOTION_EXPIRATION_CHECK_ENABLED) {
      return;
    }

    this.logger.log('Starting promotion expiration check...');

    const now = DateTimeUtils.now();

    // Find active promotions that have expired by date
    const expiredByDate = await this.promotionRepository.findExpiredActive(now);

    for (const promotion of expiredByDate) {
      await this.expirePromotion(promotion, 'DATE_EXPIRED');
    }

    // Find active promotions that have reached usage limit
    const usageLimitReached = await this.promotionRepository.findUsageLimitReached();

    for (const promotion of usageLimitReached) {
      await this.expirePromotion(promotion, 'USAGE_LIMIT_REACHED');
    }

    this.logger.log('Promotion expiration check completed');
  }

  private async expirePromotion(
    promotion: MktPromotionWorkspaceEntity,
    reason: 'DATE_EXPIRED' | 'USAGE_LIMIT_REACHED',
  ): Promise<void> {
    await this.promotionRepository.updateStatus(
      promotion.workspaceId,
      promotion.id,
      PROMOTION_STATUS.EXPIRED,
    );

    // Invalidate cache
    await this.cacheService.invalidatePromotion(
      promotion.workspaceId,
      promotion.id,
    );
    await this.cacheService.invalidateActivePromotions(promotion.workspaceId);

    // Emit event
    this.eventEmitter.emit('promotion.expired', new PromotionExpiredEvent(
      promotion.workspaceId,
      promotion.id,
      reason,
    ));

    this.logger.log(`Marked promotion ${promotion.id} as EXPIRED (${reason})`);
  }
}
```

## 11. Repositories

### 11.1 MktPromotionRepository (`repositories/mkt-promotion.repository.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { LessThan, LessThanOrEqual, In } from 'typeorm';
import { PROMOTION_STATUS, PROMOTION_LOG_CONTEXT } from '../constants';

@Injectable()
export class MktPromotionRepository {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPromotionWorkspaceEntity>(
      workspaceId,
      'mktPromotion',
    );
  }

  async findById(
    workspaceId: string,
    promotionId: string,
  ): Promise<MktPromotionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);
    return repository.findOne({
      where: {
        id: promotionId,
        deletedAt: null,
      },
    });
  }

  async findByIdWithRules(
    workspaceId: string,
    promotionId: string,
  ): Promise<PromotionWithRules | null> {
    const repository = await this.getRepository(workspaceId);

    const promotion = await repository
      .createQueryBuilder('promotion')
      .leftJoinAndSelect('promotion.rules', 'rules')
      .where('promotion.id = :id', { id: promotionId })
      .andWhere('promotion.deletedAt IS NULL')
      .orderBy('rules.position', 'ASC')
      .getOne();

    if (!promotion) {
      return null;
    }

    return {
      promotion,
      rules: promotion.rules ?? [],
    };
  }

  async findActiveAutoApply(
    workspaceId: string,
  ): Promise<MktPromotionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);
    const now = DateTimeUtils.now();

    return repository.find({
      where: {
        status: PROMOTION_STATUS.ACTIVE,
        isAutoApply: true,
        startDate: LessThanOrEqual(now),
        deletedAt: null,
      },
      order: {
        priority: 'DESC',
      },
    });
  }

  async findByCode(
    workspaceId: string,
    code: string,
  ): Promise<MktPromotionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);
    return repository.findOne({
      where: {
        code,
        deletedAt: null,
      },
    });
  }

  async create(
    workspaceId: string,
    data: CreatePromotionData,
  ): Promise<MktPromotionWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);
    return repository.save(repository.create({
      ...data,
      status: PROMOTION_STATUS.DRAFT,
      currentUsageCount: PROMOTION_DEFAULTS.CURRENT_USAGE_COUNT,
      priority: data.priority ?? PROMOTION_DEFAULTS.PRIORITY,
      stackable: data.stackable ?? PROMOTION_DEFAULTS.STACKABLE,
      isAutoApply: data.isAutoApply ?? PROMOTION_DEFAULTS.IS_AUTO_APPLY,
      currency: data.currency ?? PROMOTION_DEFAULTS.CURRENCY,
    }));
  }

  async incrementUsageCount(
    workspaceId: string,
    promotionId: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    await repository.increment(
      { id: promotionId },
      'currentUsageCount',
      1,
    );
  }

  async updateStatus(
    workspaceId: string,
    promotionId: string,
    status: PromotionStatus,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    await repository.update(
      { id: promotionId },
      { status, updatedAt: DateTimeUtils.now() },
    );
  }

  async findExpiredActive(now: Date): Promise<MktPromotionWorkspaceEntity[]> {
    const repository = await this.getRepository('*'); // All workspaces
    return repository.find({
      where: {
        status: PROMOTION_STATUS.ACTIVE,
        endDate: LessThan(now),
        deletedAt: null,
      },
    });
  }

  async findUsageLimitReached(): Promise<MktPromotionWorkspaceEntity[]> {
    const repository = await this.getRepository('*'); // All workspaces
    return repository
      .createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: PROMOTION_STATUS.ACTIVE })
      .andWhere('promotion.usageLimit IS NOT NULL')
      .andWhere('promotion.currentUsageCount >= promotion.usageLimit')
      .andWhere('promotion.deletedAt IS NULL')
      .getMany();
  }
}
```

## 12. Flow Diagrams

### 12.1 Apply Promotion to Order Flow

```
+-----------------------------------------------------------------------------+
|                        Apply Promotion to Order Flow                         |
+-----------------------------------------------------------------------------+

                            +---------------+
                            | Order Create  |
                            |   (DRAFT)     |
                            +-------+-------+
                                    |
                    +---------------+---------------+
                    v                               v
          +-----------------+            +-----------------+
          | Auto-Apply Mode |            |  Coupon Mode    |
          |  (isAutoApply)  |            | (couponCode)    |
          +--------+--------+            +--------+--------+
                   |                              |
                   v                              v
          +-----------------+            +-----------------+
          |   Get Active    |            | Validate Coupon |
          |   Promotions    |            |     Code        |
          +--------+--------+            +--------+--------+
                   |                              |
                   +---------------+--------------+
                                   v
                      +------------------------+
                      |   Evaluate Rules       |
                      |  for Each Promotion    |
                      +------------+-----------+
                                   |
                      +------------+------------+
                      |                         |
                      v                         v
              +---------------+       +---------------+
              | Rules Passed  |       | Rules Failed  |
              +-------+-------+       +-------+-------+
                      |                       |
                      v                       v
              +---------------+       +---------------+
              |   Validate    |       |    Return     |
              |   Promotion   |       |    Error      |
              +-------+-------+       +---------------+
                      |
          +-----------+-----------+
          |                       |
          v                       v
  +---------------+       +---------------+
  |   Valid       |       |   Invalid     |
  +-------+-------+       +-------+-------+
          |                       |
          v                       v
  +---------------+       +---------------+
  |   Calculate   |       |    Return     |
  |   Discount    |       |    Error      |
  +-------+-------+       +---------------+
          |
          v
  +------------------------+
  |  Sort by Priority      |
  |  (stackable check)     |
  +------------+-----------+
               |
               v
  +------------------------+
  |  Apply Discounts       |
  |  to Order              |
  +------------+-----------+
               |
               v
  +------------------------+
  |  Update Order Fields   |
  |  - discount            |
  |  - appliedPromotions   |
  |  - totalAmount         |
  +------------+-----------+
               |
               v
  +------------------------+
  |  Record Usage          |
  |  (after COMPLETED)     |
  +------------------------+
```

### 12.2 Promotion Lifecycle

```
+-----------------------------------------------------------------------------+
|                         Promotion Lifecycle                                  |
+-----------------------------------------------------------------------------+

  +---------+        +---------+        +---------+        +---------+
  |  DRAFT  +------->+ ACTIVE  +<------>+ PAUSED  |        |CANCELLED|
  +---------+        +----+----+        +---------+        +---------+
                          |                                      ^
                          |                                      |
                          v                                      |
                    +---------+                                  |
                    | EXPIRED +----------------------------------+
                    +---------+

  State Transitions:
  ---------------------------------------------------------------------------
  | From     | To        | Trigger                                          |
  ---------------------------------------------------------------------------
  | DRAFT    | ACTIVE    | Manual activation                                |
  | DRAFT    | CANCELLED | Manual cancellation                              |
  | ACTIVE   | PAUSED    | Manual pause                                     |
  | ACTIVE   | EXPIRED   | endDate passed OR usageLimit reached             |
  | ACTIVE   | CANCELLED | Manual cancellation                              |
  | PAUSED   | ACTIVE    | Manual resume                                    |
  | PAUSED   | CANCELLED | Manual cancellation                              |
  | EXPIRED  | CANCELLED | Manual cancellation (cleanup)                    |
  ---------------------------------------------------------------------------
```

### 12.3 Rule Evaluation Flow

```
+-----------------------------------------------------------------------------+
|                          Rule Evaluation Flow                                |
+-----------------------------------------------------------------------------+

                          +-------------------+
                          |   Get All Rules   |
                          |  for Promotion    |
                          +---------+---------+
                                    |
                                    v
                          +-------------------+
                          |  Group by Logic   |
                          |    Operator       |
                          +---------+---------+
                                    |
              +---------------------+---------------------+
              v                     v                     v
      +---------------+    +---------------+    +---------------+
      |   AND Group   |    |   AND Group   |    |   OR Group    |
      |   (required)  |    |   (optional)  |    |               |
      +-------+-------+    +-------+-------+    +-------+-------+
              |                    |                    |
              v                    v                    v
      +---------------+    +---------------+    +---------------+
      | All rules     |    | All rules     |    | Any rule      |
      | must pass     |    | must pass     |    | must pass     |
      +-------+-------+    +-------+-------+    +-------+-------+
              |                    |                    |
              +---------------------+---------------------+
                                    |
                          +---------+---------+
                          |                   |
                          v                   v
                  +---------------+   +---------------+
                  | All Required  |   | Any Required  |
                  | Groups Pass   |   | Group Fails   |
                  +-------+-------+   +-------+-------+
                          |                   |
                          v                   v
                  +---------------+   +---------------+
                  |   APPLICABLE  |   |NOT APPLICABLE |
                  +---------------+   +---------------+


  Rule Types & Evaluation:
  ---------------------------------------------------------------------------
  | Rule Type      | Evaluation                                             |
  ---------------------------------------------------------------------------
  | PRODUCT        | Check if order contains products in targetIds          |
  | CATEGORY       | Check if order contains products in categories         |
  | VARIANT        | Check if order contains specific variants              |
  | ORDER_VALUE    | Compare orderSubtotal with targetValues (min/max)      |
  | CUSTOMER_TAG   | Check if customer has any tag in targetIds             |
  | CUSTOMER_SEGMENT| Check if customer belongs to segment                  |
  | FIRST_ORDER    | Check if this is customer's first order                |
  | QUANTITY       | Check total quantity meets threshold                   |
  ---------------------------------------------------------------------------
```

## 13. DTOs

### 13.1 Input DTOs

```typescript
// dto/inputs/create-promotion.input.ts

@InputType()
export class CreatePromotionRuleInput {
  @Field(() => String)
  @IsNotEmpty()
  name: string;

  @Field(() => PROMOTION_RULE_TYPE)
  @IsEnum(PROMOTION_RULE_TYPE)
  ruleType: PromotionRuleType;

  @Field(() => RULE_OPERATOR)
  @IsEnum(RULE_OPERATOR)
  operator: RuleOperator;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  targetIds?: string[];

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  targetValues?: Record<string, unknown>;

  @Field(() => Boolean, { defaultValue: true })
  @IsOptional()
  isRequired?: boolean;

  @Field(() => LOGIC_OPERATOR, { defaultValue: LOGIC_OPERATOR.AND })
  @IsOptional()
  logicOperator?: LogicOperator;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  position?: number;
}

@InputType()
export class CreatePromotionInput {
  @Field(() => String)
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @Field(() => String)
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code must contain only uppercase letters, numbers, hyphens, and underscores' })
  code: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  description?: string;

  @Field(() => PROMOTION_TYPE)
  @IsEnum(PROMOTION_TYPE)
  promotionType: PromotionType;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  discountValue: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @Field(() => String, { defaultValue: 'VND' })
  @IsOptional()
  currency?: string;

  @Field(() => Date)
  startDate: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  endDate?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimitPerCustomer?: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  priority?: number;

  @Field(() => Boolean, { defaultValue: false })
  @IsOptional()
  stackable?: boolean;

  @Field(() => Boolean, { defaultValue: false })
  @IsOptional()
  isAutoApply?: boolean;

  @Field(() => [CreatePromotionRuleInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CreatePromotionRuleInput)
  rules?: CreatePromotionRuleInput[];
}
```

### 13.2 Output DTOs

```typescript
// dto/outputs/promotion.output.ts

@ObjectType()
export class PromotionRuleOutput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  ruleType: string;

  @Field(() => String)
  operator: string;

  @Field(() => [String], { nullable: true })
  targetIds: string[] | null;

  @Field(() => GraphQLJSON, { nullable: true })
  targetValues: Record<string, unknown> | null;

  @Field(() => Boolean)
  isRequired: boolean;

  @Field(() => String)
  logicOperator: string;

  @Field(() => Int)
  position: number;
}

@ObjectType()
export class PromotionOutput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  code: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => String)
  status: string;

  @Field(() => String)
  promotionType: string;

  @Field(() => Float)
  discountValue: number;

  @Field(() => Float, { nullable: true })
  maxDiscountAmount: number | null;

  @Field(() => Float, { nullable: true })
  minOrderAmount: number | null;

  @Field(() => String)
  currency: string;

  @Field(() => Date)
  startDate: Date;

  @Field(() => Date, { nullable: true })
  endDate: Date | null;

  @Field(() => Int, { nullable: true })
  usageLimit: number | null;

  @Field(() => Int, { nullable: true })
  usageLimitPerCustomer: number | null;

  @Field(() => Int)
  currentUsageCount: number;

  @Field(() => Int)
  priority: number;

  @Field(() => Boolean)
  stackable: boolean;

  @Field(() => Boolean)
  isAutoApply: boolean;

  @Field(() => [PromotionRuleOutput])
  rules: PromotionRuleOutput[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class AppliedPromotionOutput {
  @Field(() => String)
  promotionId: string;

  @Field(() => String)
  promotionName: string;

  @Field(() => String)
  promotionCode: string;

  @Field(() => String, { nullable: true })
  couponCode: string | null;

  @Field(() => String)
  discountType: string;

  @Field(() => Float)
  discountValue: number;

  @Field(() => Float)
  discountAmount: number;
}

@ObjectType()
export class CalculateDiscountOutput {
  @Field(() => [AppliedPromotionOutput])
  promotions: AppliedPromotionOutput[];

  @Field(() => Float)
  totalDiscount: number;

  @Field(() => Float)
  finalOrderAmount: number;
}

@ObjectType()
export class ValidationErrorOutput {
  @Field(() => String)
  code: string;

  @Field(() => String, { nullable: true })
  field: string | null;

  @Field(() => String)
  message: string;
}

@ObjectType()
export class ApplyCouponOutput {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => PromotionOutput, { nullable: true })
  promotion: PromotionOutput | null;

  @Field(() => Float, { nullable: true })
  discountAmount: number | null;

  @Field(() => [ValidationErrorOutput], { nullable: true })
  errors: ValidationErrorOutput[] | null;
}
```

## 14. Error Handling

```typescript
// errors/promotion.errors.ts

export class PromotionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PromotionError';
  }
}

export class PromotionNotFoundError extends PromotionError {
  constructor(promotionId: string) {
    super(
      `Promotion not found: ${promotionId}`,
      'PROMOTION_NOT_FOUND',
      { promotionId },
    );
  }
}

export class PromotionNotActiveError extends PromotionError {
  constructor(promotionId: string, currentStatus: string) {
    super(
      `Promotion is not active: ${promotionId}`,
      'PROMOTION_NOT_ACTIVE',
      { promotionId, currentStatus },
    );
  }
}

export class PromotionExpiredError extends PromotionError {
  constructor(promotionId: string, endDate: Date) {
    super(
      `Promotion has expired: ${promotionId}`,
      'PROMOTION_EXPIRED',
      { promotionId, endDate },
    );
  }
}

export class PromotionUsageLimitError extends PromotionError {
  constructor(promotionId: string, limit: number) {
    super(
      `Promotion usage limit reached: ${promotionId}`,
      'PROMOTION_USAGE_LIMIT_REACHED',
      { promotionId, limit },
    );
  }
}

export class CouponNotFoundError extends PromotionError {
  constructor(couponCode: string) {
    super(
      `Coupon code not found: ${couponCode}`,
      'COUPON_NOT_FOUND',
      { couponCode },
    );
  }
}

export class CouponExpiredError extends PromotionError {
  constructor(couponCode: string) {
    super(
      `Coupon has expired: ${couponCode}`,
      'COUPON_EXPIRED',
      { couponCode },
    );
  }
}

export class CouponCodeDuplicateError extends PromotionError {
  constructor(code: string) {
    super(
      `Coupon code already exists: ${code}`,
      'COUPON_CODE_DUPLICATE',
      { code },
    );
  }
}

export class CouponValidationException extends PromotionError {
  constructor(errors: PromotionValidationError[]) {
    super(
      'Coupon validation failed',
      'COUPON_VALIDATION_FAILED',
      { errors },
    );
  }
}

export class MinOrderAmountError extends PromotionError {
  constructor(required: number, actual: number) {
    super(
      `Minimum order amount is ${required}`,
      'MIN_ORDER_AMOUNT_NOT_MET',
      { required, actual },
    );
  }
}

export class RulesNotMetError extends PromotionError {
  constructor(promotionId: string, failedRules: RuleEvaluationResult[]) {
    super(
      'Promotion rules not satisfied',
      'RULES_NOT_MET',
      { promotionId, failedRules },
    );
  }
}
```

## 15. Messages

```typescript
// message/index.ts

import { createModuleMessages } from '../../common/message/create-module-messages';

export const PROMOTION_MESSAGES = createModuleMessages({
  entityName: 'Promotion',
  entityNamePlural: 'Promotions',
  customSuccess: {
    PROMOTION_CREATED: 'Promotion created successfully',
    PROMOTION_UPDATED: 'Promotion updated successfully',
    PROMOTION_ACTIVATED: 'Promotion activated successfully',
    PROMOTION_PAUSED: 'Promotion paused successfully',
    PROMOTION_CANCELLED: 'Promotion cancelled successfully',
    COUPON_CREATED: 'Coupon created successfully',
    COUPON_APPLIED: 'Coupon applied successfully',
    DISCOUNT_CALCULATED: 'Discount calculated successfully',
  },
  customError: {
    PROMOTION_NOT_FOUND: 'Promotion not found',
    PROMOTION_NOT_ACTIVE: 'Promotion is not active',
    PROMOTION_EXPIRED: 'Promotion has expired',
    PROMOTION_USAGE_LIMIT: 'Promotion usage limit reached',
    COUPON_NOT_FOUND: 'Coupon code not found',
    COUPON_EXPIRED: 'Coupon has expired',
    COUPON_INVALID: 'Coupon is not valid',
    MIN_ORDER_AMOUNT: 'Minimum order amount not met',
    RULES_NOT_MET: 'Promotion conditions not satisfied',
    CODE_ALREADY_EXISTS: 'Promotion code already exists',
    COUPON_CODE_DUPLICATE: 'Coupon code already exists',
  },
  customOperation: {
    CREATE_PROMOTION: 'Create promotion',
    UPDATE_PROMOTION: 'Update promotion',
    APPLY_COUPON: 'Apply coupon',
    CALCULATE_DISCOUNT: 'Calculate discount',
    RECORD_USAGE: 'Record usage',
    CHECK_EXPIRATION: 'Check expiration',
  },
});

export const PROMOTION_GRAPHQL_DESCRIPTIONS = {
  PROMOTION_QUERY: 'Get promotion by ID',
  PROMOTION_BY_CODE_QUERY: 'Get promotion by code',
  ACTIVE_PROMOTIONS_QUERY: 'Get list of active promotions',
  CALCULATE_DISCOUNT_QUERY: 'Calculate discount for order',
  CREATE_PROMOTION_MUTATION: 'Create new promotion',
  UPDATE_PROMOTION_MUTATION: 'Update promotion',
  ACTIVATE_PROMOTION_MUTATION: 'Activate promotion',
  PAUSE_PROMOTION_MUTATION: 'Pause promotion',
  CANCEL_PROMOTION_MUTATION: 'Cancel promotion',
  APPLY_COUPON_MUTATION: 'Apply coupon to order',
  CREATE_COUPON_MUTATION: 'Create coupon',
  CREATE_BULK_COUPONS_MUTATION: 'Create multiple coupons',
} as const;
```

## 16. Module Registration

```typescript
// mkt-promotion.module.ts

@Module({
  imports: [
    TokenModule,
    TwentyORMModule,
    WorkspaceCacheStorageModule,
    ScheduleModule,
    forwardRef(() => MktOrderModule),
  ],
  providers: [
    // Repositories
    MktPromotionRepository,
    MktPromotionRuleRepository,
    MktCouponRepository,
    MktPromotionUsageRepository,

    // Application Services
    PromotionApplicationService,
    CouponApplicationService,
    PromotionUsageApplicationService,

    // Domain Services
    PromotionCalculationService,
    PromotionValidationService,
    RuleEvaluationService,

    // Infrastructure Services
    PromotionCacheService,
    PromotionNotificationService,

    // Resolvers
    PromotionResolver,
    CouponResolver,

    // Jobs
    PromotionExpirationJob,

    // Hooks
    MktPromotionCreateOnePreQueryHook,
    MktCouponCreateOnePreQueryHook,

    // Listeners
    PromotionOrderEventListener,
  ],
  exports: [
    PromotionApplicationService,
    CouponApplicationService,
    PromotionCalculationService,
    PromotionValidationService,
    MktPromotionRepository,
    MktCouponRepository,
  ],
})
export class MktPromotionModule {}
```

## 17. Order Module Integration

### 17.1 Update MktOrderWorkspaceEntity

```typescript
// Add to mkt-order.workspace-entity.ts

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.appliedPromotions,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Applied Promotions`,
  description: msg`List of applied promotions`,
  icon: 'IconTag',
})
@WorkspaceIsNullable()
appliedPromotions: AppliedPromotion[] | null;

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.couponCode,
  type: FieldMetadataType.TEXT,
  label: msg`Coupon Code`,
  description: msg`Applied coupon code`,
  icon: 'IconTicket',
})
@WorkspaceIsNullable()
couponCode: string | null;

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.promotionDiscount,
  type: FieldMetadataType.NUMBER,
  label: msg`Promotion Discount`,
  description: msg`Total discount from promotions`,
  icon: 'IconDiscount',
  defaultValue: 0,
})
promotionDiscount: number;

@WorkspaceRelation({
  standardId: MKT_ORDER_RELATION_IDS.mktOrderToPromotionUsages,
  type: RelationType.ONE_TO_MANY,
  label: msg`Promotion Usages`,
  inverseSideTarget: () => MktPromotionUsageWorkspaceEntity,
  inverseSideFieldKey: 'order',
  onDelete: RelationOnDeleteAction.SET_NULL,
})
promotionUsages: MktPromotionUsageWorkspaceEntity[];
```

## 18. Performance Considerations

### 18.1 Caching Strategy

```typescript
// Cached data
- Active promotions list: TTL 5 minutes
- Promotion by ID: TTL 5 minutes
- Promotion by code: TTL 5 minutes
- Promotion rules: TTL 5 minutes

// Cache invalidation triggers
- Promotion create/update/delete
- Coupon usage
- Status change
- Expiration job
```

### 18.2 Database Indexes

```sql
-- Promotions
CREATE INDEX idx_promotion_status ON mkt_promotion(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_promotion_date_range ON mkt_promotion(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_promotion_auto_apply ON mkt_promotion(is_auto_apply, status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_promotion_code ON mkt_promotion(code) WHERE deleted_at IS NULL;

-- Coupons
CREATE UNIQUE INDEX idx_coupon_code ON mkt_coupon(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_coupon_promotion ON mkt_coupon(promotion_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_coupon_customer ON mkt_coupon(assigned_customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_coupon_status ON mkt_coupon(status) WHERE deleted_at IS NULL;

-- Usages
CREATE INDEX idx_usage_promotion ON mkt_promotion_usage(promotion_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_usage_customer ON mkt_promotion_usage(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_usage_order ON mkt_promotion_usage(order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_usage_promotion_customer ON mkt_promotion_usage(promotion_id, customer_id) WHERE deleted_at IS NULL;

-- Audits
CREATE INDEX idx_audit_promotion ON mkt_promotion_audit(promotion_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_changed_at ON mkt_promotion_audit(changed_at) WHERE deleted_at IS NULL;
```

## 19. Implementation Checklist

- [ ] Add Object IDs to `mkt-core/constants/mkt-object-ids.ts`
- [ ] Add Field IDs to `mkt-core/constants/mkt-field-ids.ts`
- [ ] Create Relation IDs file
- [ ] Register `CacheStorageNamespace.MktPromotion`
- [ ] Add `searchVector` and `deletedAt` fields to entities
- [ ] Implement `PromotionCacheService`
- [ ] Create events for event-driven architecture
- [ ] Create scheduled job for promotion expiration
- [ ] Implement repositories with proper patterns
- [ ] Add Zod config validation
- [ ] Update Order entity with promotion relations
- [ ] Update CLAUDE.md with new module

---

**Created by:** Claude Code
**Date:** 2025-12-18
**Version:** 2.0
**Reviewed by:** Claude Code Review
