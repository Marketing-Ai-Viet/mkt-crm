# Customer Module - Tier System

## Tổng quan

Hệ thống Tier phân hạng khách hàng dựa trên giá trị đơn hàng và số lượng đơn hoàn thành. Tier ảnh hưởng đến các ưu đãi, khuyến mãi và mức độ ưu tiên hỗ trợ.

---

## Tier Levels

| Tier | Label (VN) | Icon | Color | Min Spending | Min Orders |
|------|------------|------|-------|--------------|------------|
| 💎 DIAMOND | Kim Cương | 💎 | blue | 10,000,000 VND | 20 |
| 🥇 GOLD | Vàng | 🥇 | yellow | 5,000,000 VND | 10 |
| 🥈 SILVER | Bạc | 🥈 | gray | 2,000,000 VND | 5 |
| 🥉 BRONZE | Đồng | 🥉 | orange | 500,000 VND | 1 |
| 😴 DORMANT | Không hoạt động | 😴 | gray | - | - |
| ❌ CHURNED | Đã rời bỏ | ❌ | red | - | - |

### Tier Rank

```typescript
export const TIER_RANK = {
  [MKT_CUSTOMER_TIER.DIAMOND]: 4,
  [MKT_CUSTOMER_TIER.GOLD]: 3,
  [MKT_CUSTOMER_TIER.SILVER]: 2,
  [MKT_CUSTOMER_TIER.BRONZE]: 1,
  [MKT_CUSTOMER_TIER.DORMANT]: 0,
  [MKT_CUSTOMER_TIER.CHURNED]: -1,
};
```

---

## Tier Calculation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TIER CALCULATION FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐                                               │
│  │ Trigger Event    │                                               │
│  │ • Order Complete │                                               │
│  │ • Cron Job       │                                               │
│  │ • Manual Update  │                                               │
│  └────────┬─────────┘                                               │
│           ▼                                                          │
│  ┌──────────────────┐                                               │
│  │ Query Orders     │  SELECT SUM(totalAmount), COUNT(*)             │
│  │ (Completed Only) │  FROM orders WHERE status IN (...)             │
│  └────────┬─────────┘                                               │
│           ▼                                                          │
│  ┌──────────────────────────────────────────┐                       │
│  │ Calculate Raw Tier                        │                       │
│  │ if (value >= 10M && count >= 20) → DIAMOND│                       │
│  │ if (value >= 5M && count >= 10)  → GOLD   │                       │
│  │ if (value >= 2M && count >= 5)   → SILVER │                       │
│  │ if (value >= 500K && count >= 1) → BRONZE │                       │
│  └────────┬─────────────────────────────────┘                       │
│           ▼                                                          │
│  ┌──────────────────────────────────────────┐                       │
│  │ Check Inactivity                          │                       │
│  │ if (daysSinceLastOrder >= 180) → CHURNED  │                       │
│  │ if (daysSinceLastOrder >= 120) → DORMANT  │                       │
│  └────────┬─────────────────────────────────┘                       │
│           ▼                                                          │
│  ┌──────────────────────────────────────────┐                       │
│  │ Apply Downgrade Policy                    │                       │
│  │ • Check protection period (30 days)       │                       │
│  │ • Apply max tier drop (1 per recalc)      │                       │
│  └────────┬─────────────────────────────────┘                       │
│           ▼                                                          │
│  ┌──────────────────────────────────────────┐                       │
│  │ Update Customer                           │                       │
│  │ • Set new tier                            │                       │
│  │ • Update totalOrderValue/Count            │                       │
│  │ • Update lastTierUpgradeAt (if upgrade)   │                       │
│  └────────┬─────────────────────────────────┘                       │
│           ▼                                                          │
│  ┌──────────────────────────────────────────┐                       │
│  │ Log to Tier History                       │                       │
│  │ { previousTier, newTier, reason,          │                       │
│  │   orderValueAtChange, orderCountAtChange }│                       │
│  └──────────────────────────────────────────┘                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Downgrade Protection Policy

### Configuration

```typescript
export const DOWNGRADE_POLICY_CONFIG = {
  /** Enable/disable protection */
  PROTECTION_ENABLED: true,

  /** Days after upgrade when customer is protected */
  UPGRADE_PROTECTION_DAYS: 30,

  /** Max tiers to drop per recalculation */
  MAX_TIER_DROP_PER_RECALCULATION: 1,
};
```

### Protection Rules

#### 1. Upgrade Protection Period (30 days)

Sau khi upgrade, khách hàng được bảo vệ khỏi downgrade trong 30 ngày.

```typescript
checkDowngradeProtection(lastTierUpgradeAt: Date | null): {
  isProtected: boolean;
  remainingDays: number;
} {
  if (!lastTierUpgradeAt) return { isProtected: false, remainingDays: 0 };

  const protectionEndDate = lastTierUpgradeAt + 30 days;
  const isProtected = now < protectionEndDate;
  const remainingDays = isProtected ? diff(now, protectionEndDate) : 0;

  return { isProtected, remainingDays };
}
```

**Example:**
- Customer upgraded to GOLD on Jan 1
- On Jan 15: Protected, remainingDays = 15
- On Feb 5: Not protected, can be downgraded

#### 2. Max Tier Drop Limit (1 tier per recalculation)

Mỗi lần recalculation, khách hàng chỉ có thể bị hạ tối đa 1 tier.

```typescript
// Downgrade path
export const TIER_DOWNGRADE_PATH: Record<MKT_CUSTOMER_TIER, MKT_CUSTOMER_TIER> = {
  [DIAMOND]: GOLD,     // DIAMOND → GOLD
  [GOLD]: SILVER,      // GOLD → SILVER
  [SILVER]: BRONZE,    // SILVER → BRONZE
  [BRONZE]: BRONZE,    // BRONZE stays BRONZE
  [DORMANT]: DORMANT,
  [CHURNED]: CHURNED,
};
```

**Example:**
- Customer hiện tại: DIAMOND
- Calculated tier dựa trên orders: BRONZE
- Final tier sau downgrade policy: GOLD (chỉ hạ 1 tier)
- Lần recalculation tiếp theo: SILVER
- Lần tiếp nữa: BRONZE

#### 3. Lowest Tier Protection

Customer ở BRONZE không thể bị hạ xuống thấp hơn (trừ DORMANT/CHURNED do inactivity).

---

### Inactivity Detection

```typescript
export const INACTIVITY_THRESHOLDS = {
  DORMANT_DAYS: 120,  // 120 ngày không mua → DORMANT
  CHURNED_DAYS: 180,  // 180 ngày không mua → CHURNED
};
```

```typescript
checkInactivityStatus(lastOrderDate: Date | null, currentTier: MKT_CUSTOMER_TIER): {
  status: 'active' | 'dormant' | 'churned';
  daysSinceLastOrder: number;
} {
  if (!lastOrderDate) return { status: 'active', daysSinceLastOrder: 0 };

  const daysSinceLastOrder = diff(lastOrderDate, now);

  if (daysSinceLastOrder >= 180) return { status: 'churned', daysSinceLastOrder };
  if (daysSinceLastOrder >= 120) return { status: 'dormant', daysSinceLastOrder };

  return { status: 'active', daysSinceLastOrder };
}
```

---

### Reactivation

Khi customer DORMANT/CHURNED hoàn thành đơn hàng mới:

```typescript
checkReactivation(currentTier: MKT_CUSTOMER_TIER, calculatedTier: MKT_CUSTOMER_TIER): {
  shouldReactivate: boolean;
  reactivationTier: MKT_CUSTOMER_TIER;
} {
  if (currentTier !== DORMANT && currentTier !== CHURNED) {
    return { shouldReactivate: false, reactivationTier: currentTier };
  }

  // Reactivate to calculated tier (min BRONZE)
  return {
    shouldReactivate: true,
    reactivationTier: ACTIVE_TIERS.includes(calculatedTier) ? calculatedTier : BRONZE,
  };
}
```

---

## Tier History

Mỗi thay đổi tier được log vào `MktCustomerTierHistory`:

### Entity Structure

```typescript
{
  id: string;
  customerId: string;
  previousTier: MKT_CUSTOMER_TIER | null;  // null for new customers
  newTier: MKT_CUSTOMER_TIER;
  reason: TierChangeReason;
  orderValueAtChange: number;
  orderCountAtChange: number;
  createdAt: Date;
}
```

### Tier Change Reasons

```typescript
export const TIER_CHANGE_REASON = {
  ORDER: 'ORDER',                       // Thay đổi do đơn hàng mới
  CRON_RECALCULATION: 'CRON_RECALCULATION',  // Thay đổi do job định kỳ
  MANUAL: 'MANUAL',                     // Admin thay đổi thủ công
  DOWNGRADE: 'DOWNGRADE',               // Bị hạ tier do policy
} as const;
```

### Query Examples

```typescript
// Get tier history for customer
const history = await tierHistoryRepo.find({
  where: { customerId },
  order: { createdAt: 'DESC' },
});

// Get all downgrades in last 30 days
const downgrades = await tierHistoryRepo.find({
  where: {
    reason: TIER_CHANGE_REASON.DOWNGRADE,
    createdAt: MoreThan(thirtyDaysAgo),
  },
});
```

---

## Cron Jobs

### MktCustomerTierCronJob

Chạy định kỳ để recalculate tất cả customer tiers.

```typescript
@Processor(MessageQueue.cronQueue)
export class MktCustomerTierCronJob {
  @Process(MktCustomerTierCronJob.name)
  @SentryCronMonitor(MktCustomerTierCronJob.name, CRON_PATTERN)
  async handle(data: { workspaceId: string }) {
    await this.tierService.updateAllCustomerTiersForWorkspace(data.workspaceId);
  }
}
```

**Configuration:**

```typescript
export const MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN = '0 2 * * *';  // Daily at 2 AM
```

### Batch Processing Config

```typescript
export const TIER_BULK_PROCESSING_CONFIG = {
  BATCH_SIZE: 100,     // Customers per batch
  CONCURRENCY: 10,     // Parallel updates
};
```

---

## GraphQL API

### Queries

```graphql
query GetCustomerTierStatistics($workspaceId: ID!) {
  getCustomerTierStatistics(workspaceId: $workspaceId) {
    tierDistribution {
      DIAMOND
      GOLD
      SILVER
      BRONZE
      DORMANT
      CHURNED
    }
    totalCustomers
    averageOrderValue
    averageOrderCount
  }
}

query GetCustomerTierHistory($customerId: ID!) {
  getCustomerTierHistory(customerId: $customerId) {
    id
    previousTier
    newTier
    reason
    orderValueAtChange
    orderCountAtChange
    createdAt
  }
}

query CheckUpgradeEligibility($customerId: ID!) {
  checkUpgradeEligibility(customerId: $customerId) {
    currentTier
    canUpgrade
    nextTier
    requirements
  }
}
```

### Mutations

```graphql
mutation UpdateCustomerTier($customerId: ID!) {
  updateCustomerTier(customerId: $customerId) {
    customerId
    customerName
    customerTier
    totalOrderValue
    totalOrderCount
  }
}
```

---

## Performance Optimizations

### 1. Bulk Aggregation Query

Thay vì N queries cho N customers, sử dụng 1 query với GROUP BY:

```typescript
const aggregations = await orderRepo
  .createQueryBuilder('order')
  .select('order.mktCustomerId', 'customerId')
  .addSelect('COUNT(order.id)', 'totalOrderCount')
  .addSelect('SUM(order.totalAmount)', 'totalOrderValue')
  .where('order.mktCustomerId IN (:...customerIds)', { customerIds })
  .andWhere('order.status IN (:...statuses)', { statuses: COMPLETED_STATUSES })
  .groupBy('order.mktCustomerId')
  .getRawMany();
```

### 2. Parallel Updates with Concurrency Control

```typescript
const updateChunks = chunk(updates, CONCURRENCY);  // 10 parallel

for (const batch of updateChunks) {
  await Promise.all(batch.map(u => repository.update(u.id, u.data)));
}
```

### 3. Bulk Insert for History

```typescript
await tierHistoryRepo.insert(
  tierChanges.map(change => ({
    customerId: change.customerId,
    previousTier: change.previousTier,
    newTier: change.newTier,
    reason: TIER_CHANGE_REASON.CRON_RECALCULATION,
    orderValueAtChange: change.metadata.orderValue,
    orderCountAtChange: change.metadata.orderCount,
  }))
);
```

---

## Monitoring & Alerts

### Sentry Cron Monitoring

```typescript
@SentryCronMonitor(MktCustomerTierCronJob.name, CRON_PATTERN)
async handle(data: TierUpdateCronJobData) { ... }
```

### Logging

```typescript
// Batch start
this.logger.log(`Starting tier update for workspace ${workspaceId}`);
this.logger.log(`Downgrade protection: ENABLED`);

// Batch progress
this.logger.log(`Processing batch ${batchNumber}: ${customers.length} customers`);

// Completion
this.logger.log(`Completed: ${results.length} processed, ${upgraded} upgrades, ${protected} protected`);
```

### Metrics to Track

| Metric | Description |
|--------|-------------|
| `tier_update_duration` | Thời gian chạy cron job |
| `tier_updates_total` | Tổng số customers được update |
| `tier_upgrades_total` | Số customers được upgrade |
| `tier_downgrades_total` | Số customers bị downgrade |
| `tier_protected_total` | Số customers được protect khỏi downgrade |

---

## Best Practices

### 1. Sử dụng MoneyUtils cho calculations

```typescript
// ✅ Good
const isEligible = MoneyUtils.greaterThanOrEqual(totalOrderValue, threshold);

// ❌ Bad
const isEligible = totalOrderValue >= threshold;  // Floating point issues
```

### 2. Sử dụng DateTimeUtils cho date operations

```typescript
// ✅ Good
const daysSince = DateTimeUtils.diffInDays(lastOrderDate, now);

// ❌ Bad
const daysSince = (now - lastOrderDate) / (1000 * 60 * 60 * 24);
```

### 3. Always log tier changes

```typescript
// ✅ Good - log to history
await tierHistoryService.logTierChange({
  customerId,
  previousTier,
  newTier,
  reason: TIER_CHANGE_REASON.ORDER,
  metadata: { orderValue, orderCount },
});
```

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Kiến trúc module
- [SERVICES.md](./SERVICES.md) - Chi tiết services
- [ENTITIES.md](./ENTITIES.md) - Chi tiết entities
