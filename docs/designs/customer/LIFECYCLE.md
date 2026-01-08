# Customer Module - Lifecycle Management

## Tổng quan

Lifecycle Management theo dõi và phân loại khách hàng qua các giai đoạn khác nhau từ tiềm năng đến rời bỏ. Giúp sales team có chiến lược phù hợp với từng nhóm khách hàng.

---

## Lifecycle Stages

| Stage | Label (VN) | Icon | Color | Trigger |
|-------|------------|------|-------|---------|
| PROSPECTIVE | Tiềm năng | 🎯 | yellow | Chưa có đơn hàng nào |
| TRIAL | Dùng thử | 🧪 | blue | Có đơn nhưng chưa complete |
| CUSTOMER | Khách hàng | ✅ | green | Có ≥1 đơn completed |
| LOYAL | Trung thành | 💎 | purple | ≥5 đơn HOẶC ≥5M VND |
| RETENTION | Giữ chân | ⚠️ | orange | 90-180 ngày không mua |
| CHURNED | Rời bỏ | ❌ | red | >180 ngày không mua |

---

## Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER LIFECYCLE FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                     ┌──────────────┐                                    │
│                     │ PROSPECTIVE  │                                    │
│                     │ (No orders)  │                                    │
│                     └──────┬───────┘                                    │
│                            │ First order created                         │
│                            ▼                                             │
│                     ┌──────────────┐                                    │
│                     │    TRIAL     │                                    │
│                     │ (Pending)    │                                    │
│                     └──────┬───────┘                                    │
│                            │ Order completed                             │
│                            ▼                                             │
│           ┌────────────────┴────────────────┐                           │
│           │                                  │                           │
│           ▼                                  ▼                           │
│    ┌──────────────┐                  ┌──────────────┐                   │
│    │   CUSTOMER   │    ─────────────►│    LOYAL     │                   │
│    │ (1-4 orders) │   ≥5 orders OR   │ (5+ orders   │                   │
│    │              │   ≥5M VND        │  or ≥5M VND) │                   │
│    └──────┬───────┘                  └──────┬───────┘                   │
│           │                                  │                           │
│           │ 90 days no purchase              │ 90 days no purchase       │
│           │                                  │                           │
│           └────────────────┬─────────────────┘                          │
│                            ▼                                             │
│                     ┌──────────────┐                                    │
│                     │  RETENTION   │ ◄─── At-risk customers             │
│                     │ (90-180 days)│      Need attention!               │
│                     └──────┬───────┘                                    │
│                            │ 180 days no purchase                        │
│                            ▼                                             │
│                     ┌──────────────┐                                    │
│                     │   CHURNED    │ ◄─── Lost customers                │
│                     │ (>180 days)  │      Reactivation campaigns        │
│                     └──────────────┘                                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    REACTIVATION PATH                             │   │
│  │  CHURNED ──► New Order ──► CUSTOMER/LOYAL (based on new metrics) │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Categorization Logic

### Configuration

```typescript
export const MKT_CUSTOMER_CATEGORIZATION_THRESHOLDS = {
  /** Days since last order to consider customer as churned */
  CHURNED_DAYS: 180,

  /** Days since last order to consider customer at risk (retention target) */
  RETENTION_DAYS: 90,

  /** Minimum orders to be considered loyal */
  LOYAL_MIN_ORDERS: 5,

  /** Minimum total value to be considered loyal (VND) */
  LOYAL_MIN_VALUE: 5_000_000,

  /** Days since first order to be considered trial */
  TRIAL_MAX_DAYS: 30,
} as const;
```

### Algorithm

```typescript
determineLifecycleStage(stats: CustomerOrderStats): string {
  const { CHURNED_DAYS, RETENTION_DAYS, LOYAL_MIN_ORDERS, LOYAL_MIN_VALUE } = THRESHOLDS;
  const now = DateTimeUtils.now();

  // 1. No orders at all → PROSPECTIVE
  if (stats.totalOrders === 0) {
    return 'PROSPECTIVE';
  }

  // 2. Check if churned (no orders in last 180 days)
  if (stats.lastOrderAt) {
    const daysSinceLastOrder = DateTimeUtils.diffInDays(stats.lastOrderAt, now);

    if (daysSinceLastOrder >= CHURNED_DAYS) {
      return 'CHURNED';
    }

    // 3. At risk - needs retention (no orders in 90 days)
    if (daysSinceLastOrder >= RETENTION_DAYS) {
      return 'RETENTION';
    }
  }

  // 4. Check if loyal (enough orders AND value)
  if (
    stats.completedOrders >= LOYAL_MIN_ORDERS &&
    MoneyUtils.greaterThanOrEqual(stats.totalValue, LOYAL_MIN_VALUE)
  ) {
    return 'LOYAL';
  }

  // 5. Has completed orders → CUSTOMER
  if (stats.completedOrders > 0) {
    return 'CUSTOMER';
  }

  // 6. Has orders but none completed → TRIAL
  return 'TRIAL';
}
```

---

## Batch Categorization

### Cron Job

```typescript
@Processor(MessageQueue.cronQueue)
export class MktCustomerCategorizationCronJob {
  @Process(MktCustomerCategorizationCronJob.name)
  async handle(data: { workspaceId: string }) {
    const result = await this.categorizationService.categorizeAllCustomers(
      data.workspaceId,
      100,  // batch size
    );

    this.logger.log(`Processed: ${result.processed}, Updated: ${result.updated}`);
  }
}
```

### Service Implementation

```typescript
async categorizeAllCustomers(
  workspaceId: string,
  batchSize = 100,
): Promise<{ processed: number; updated: number; errors: number }> {
  // Thread-safe: Get repositories for specific workspace
  const customerRepo = await this.twentyORMGlobalManager.getRepositoryForWorkspace(
    workspaceId,
    MktCustomerWorkspaceEntity,
  );

  const orderRepo = await this.twentyORMGlobalManager.getRepositoryForWorkspace(
    workspaceId,
    MktOrderWorkspaceEntity,
  );

  let processed = 0, updated = 0, errors = 0;
  let offset = 0;

  while (hasMore) {
    const customers = await customerRepo.find({
      take: batchSize,
      skip: offset,
      order: { createdAt: 'ASC' },
    });

    for (const customer of customers) {
      try {
        const stats = await this.getOrderStats(orderRepo, customer.id);
        const newStage = this.determineLifecycleStage(stats);

        if (customer.lifecycleStage !== newStage) {
          await customerRepo.update(customer.id, { lifecycleStage: newStage });
          updated++;
        }
        processed++;
      } catch (error) {
        errors++;
      }
    }

    offset += batchSize;
  }

  return { processed, updated, errors };
}
```

---

## Auto Assignment

### Configuration

```typescript
export const MKT_CUSTOMER_AUTO_ASSIGN_CONFIG = {
  /** Enable auto-assign for new customers */
  ENABLED: true,

  /** Assignment strategy */
  STRATEGY: 'round_robin' as const,  // 'round_robin' | 'least_customers' | 'random'

  /** Role IDs eligible for auto-assignment */
  ELIGIBLE_ROLES: ['sales', 'account_manager'],
} as const;
```

### Strategies

| Strategy | Description |
|----------|-------------|
| `round_robin` | Luân phiên assign cho từng sales |
| `least_customers` | Assign cho sales có ít customers nhất |
| `random` | Random assignment |

### Implementation

```typescript
@Injectable()
export class MktCustomerAutoAssignService {
  async assignCustomer(
    customer: MktCustomerWorkspaceEntity,
    workspaceId: string,
  ): Promise<void> {
    if (!MKT_CUSTOMER_AUTO_ASSIGN_CONFIG.ENABLED) return;

    // Skip if already assigned
    if (customer.accountOwnerId) return;

    const assigneeId = await this.getNextAssignee(workspaceId);
    if (!assigneeId) return;

    await this.customerRepository.update(
      customer.id,
      {
        accountOwnerId: assigneeId,
        assignedDate: DateTimeUtils.now(),
        assignedReason: 'Auto-assigned on creation',
      },
      workspaceId,
    );
  }

  private async getNextAssignee(workspaceId: string): Promise<string | null> {
    const { STRATEGY, ELIGIBLE_ROLES } = MKT_CUSTOMER_AUTO_ASSIGN_CONFIG;

    // Get eligible sales members
    const salesMembers = await this.getSalesMembers(workspaceId, ELIGIBLE_ROLES);
    if (salesMembers.length === 0) return null;

    switch (STRATEGY) {
      case 'round_robin':
        return this.roundRobinAssign(workspaceId, salesMembers);
      case 'least_customers':
        return this.leastCustomersAssign(workspaceId, salesMembers);
      case 'random':
        return salesMembers[Math.floor(Math.random() * salesMembers.length)].id;
      default:
        return null;
    }
  }
}
```

---

## Event Listener

### Customer Created Event

```typescript
@Injectable()
export class MktCustomerEventListener {
  @OnDatabaseBatchEvent('mktCustomer', DatabaseEventAction.CREATED)
  async handleCreateCustomer(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<MktCustomerWorkspaceEntity>>,
  ) {
    for (const event of payload.events) {
      const customer = event.properties.after;

      // 1. Auto-assign to sales member
      await this.autoAssignService.assignCustomer(customer, payload.workspaceId);

      // 2. Send welcome email
      if (customer.email) {
        await this.sendWelcomeEmail(payload.workspaceId, customer);
      }
    }
  }
}
```

---

## API Endpoints

### Queries

```graphql
# Get customers by lifecycle stage
query GetCustomersByStage($stage: String!, $limit: Int) {
  getCustomersByStage(stage: $stage, limit: $limit) {
    id
    name
    email
    lifecycleStage
    lastPurchase
  }
}

# Get at-risk customers for retention campaigns
query GetAtRiskCustomers($limit: Int) {
  getAtRiskCustomers(limit: $limit) {
    id
    name
    email
    lastPurchase
    totalOrderValue
  }
}

# Get churned customers for reactivation
query GetChurnedCustomers($limit: Int) {
  getChurnedCustomers(limit: $limit) {
    id
    name
    email
    lastPurchase
    totalOrderValue
  }
}

# Get stage distribution statistics
query GetStageDistribution {
  getStageDistribution {
    PROSPECTIVE
    TRIAL
    CUSTOMER
    LOYAL
    RETENTION
    CHURNED
  }
}
```

---

## Use Cases

### 1. Marketing Campaigns

```typescript
// Get all RETENTION customers for win-back campaign
const atRiskCustomers = await categorizationService.getAtRiskCustomers(1000);

// Send targeted emails
for (const customer of atRiskCustomers) {
  await emailService.send({
    to: customer.email,
    template: 'win-back-campaign',
    data: {
      name: customer.name,
      lastPurchase: customer.lastPurchase,
      discountCode: generateDiscountCode(customer.id),
    },
  });
}
```

### 2. Sales Dashboard

```typescript
// Get stage distribution for dashboard
const distribution = await categorizationService.getStageDistribution();

// Output:
// {
//   PROSPECTIVE: 150,
//   TRIAL: 45,
//   CUSTOMER: 320,
//   LOYAL: 85,
//   RETENTION: 28,
//   CHURNED: 67,
// }
```

### 3. Sales Assignment Report

```typescript
// Get customers assigned to specific sales member
const salesCustomers = await customerRepository.find({
  where: { accountOwnerId: salesMemberId },
  order: { createdAt: 'DESC' },
});

// Group by lifecycle stage
const byStage = groupBy(salesCustomers, 'lifecycleStage');
```

---

## Monitoring

### Metrics

| Metric | Description |
|--------|-------------|
| `customers_by_stage` | Số customers theo từng stage |
| `stage_transitions_total` | Số chuyển đổi stage |
| `at_risk_customers_count` | Số customers ở RETENTION |
| `churned_customers_count` | Số customers CHURNED |
| `auto_assign_success_rate` | Tỷ lệ auto-assign thành công |

### Alerts

```typescript
// Alert when churned rate exceeds threshold
if (churnedCount / totalCustomers > 0.15) {
  await alertService.send({
    severity: 'warning',
    message: `Churn rate exceeds 15%: ${churnedCount}/${totalCustomers}`,
  });
}

// Alert when retention queue is too large
if (retentionCount > 100) {
  await alertService.send({
    severity: 'info',
    message: `${retentionCount} customers need retention attention`,
  });
}
```

---

## Best Practices

### 1. Regular Categorization

Chạy categorization job định kỳ (hàng ngày) để đảm bảo data chính xác:

```typescript
// Cron: Daily at 3 AM
export const CATEGORIZATION_CRON_PATTERN = '0 3 * * *';
```

### 2. Event-Driven Updates

Trigger recategorization khi có order mới:

```typescript
@OnDatabaseBatchEvent('mktOrder', DatabaseEventAction.UPDATED)
async handleOrderUpdate(payload) {
  if (payload.properties.after.status === 'COMPLETED') {
    await this.categorizationService.categorizeCustomer(
      payload.properties.after.mktCustomerId,
    );
  }
}
```

### 3. Personalized Actions

| Stage | Recommended Action |
|-------|-------------------|
| PROSPECTIVE | Nurture campaigns, product demos |
| TRIAL | Follow-up calls, onboarding support |
| CUSTOMER | Cross-sell, upsell opportunities |
| LOYAL | VIP treatment, referral programs |
| RETENTION | Win-back campaigns, special offers |
| CHURNED | Reactivation campaigns, feedback surveys |

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Kiến trúc module
- [SERVICES.md](./SERVICES.md) - Chi tiết services
- [TIER_SYSTEM.md](./TIER_SYSTEM.md) - Hệ thống tier
