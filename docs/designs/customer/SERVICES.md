# Customer Module - Services

## Tổng quan

Services trong Customer module được tổ chức theo domain subdirectories:

```
services/
├── account/      # Linked account management
├── core/         # Core CRUD operations
├── export/       # Data export
├── license/      # License integration
├── lifecycle/    # Categorization & auto-assign
└── tier/         # Tier calculation & history
```

---

## Core Services

### MktCustomerCodeGenerationService

**File:** `services/core/mkt-customer-code-generation.service.ts`

Tạo mã khách hàng tự động theo format `CUS-YYYY-NNNNNN`.

```typescript
@Injectable()
export class MktCustomerCodeGenerationService {
  /**
   * Generate unique customer code
   * Format: CUS-2024-000001
   */
  async generateUniqueCustomerCode(useCurrentYear = true): Promise<string>;
}
```

**Logic:**
1. Lấy năm hiện tại (hoặc năm cố định)
2. Query số sequence lớn nhất trong năm
3. Tăng sequence + 1
4. Format: `CUS-{YYYY}-{NNNNNN}` (6 digits, zero-padded)

---

### MktCustomerCreationService

**File:** `services/core/mkt-customer-creation.service.ts`

Tạo customer từ Person entity (khi tích hợp từ hệ thống khác).

```typescript
@Injectable()
export class MktCustomerCreationService {
  /**
   * Create customer from Person entity
   * - Generates customer code
   * - Creates initial linked account for MKT Server
   */
  async createCustomerFromPerson(
    workspaceId: string,
    mktAccountId: string,
    person: PersonWorkspaceEntity,
  ): Promise<void>;
}
```

**Flow:**
1. Generate mktCustomerCode
2. Create LinkedAccount for MKT Server (isPrimary: true)
3. Map Person fields → Customer fields
4. Save to database

---

### MktCustomerUpdateService

**File:** `services/core/mkt-customer-update.service.ts`

Cập nhật thông tin customer.

```typescript
@Injectable()
export class MktCustomerUpdateService {
  async updateCustomer(
    customerId: string,
    data: Partial<MktCustomerWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity>;
}
```

---

## Tier Services

### MktCustomerTierService

**File:** `services/tier/mkt-customer-tier.service.ts`

Service chính quản lý tier, orchestrates các service khác.

```typescript
@Injectable()
export class MktCustomerTierService {
  /**
   * Update single customer tier
   */
  async updateCustomerTier(customerId: string): Promise<CustomerTierResult>;

  /**
   * Update all customer tiers (batch)
   * Optimized: 1 query per batch instead of N queries
   */
  async updateAllCustomerTiers(batchSize?: number): Promise<CustomerTierResult[]>;

  /**
   * Update all tiers for specific workspace
   * Thread-safe, includes downgrade protection
   */
  async updateAllCustomerTiersForWorkspace(
    workspaceId: string,
    batchSize?: number,
  ): Promise<CustomerTierResult[]>;

  /**
   * Get tier statistics for workspace
   */
  async getCustomerTierStatistics(workspaceId: string): Promise<CustomerTierStatistics>;

  /**
   * Get customers by tier
   */
  async getCustomersByTier(tier: MKT_CUSTOMER_TIER, limit?: number): Promise<...>;

  /**
   * Check if customer can upgrade
   */
  async checkCustomerUpgradeEligibility(customerId: string): Promise<...>;
}
```

**Flow cho updateAllCustomerTiersForWorkspace:**

```
1. Fetch customers in batches (100 per batch)
   ↓
2. Bulk query order stats for batch
   ↓
3. For each customer:
   ├── Calculate raw tier from orders
   ├── Check inactivity (DORMANT/CHURNED)
   ├── Apply downgrade policy (protection + max drop)
   └── Determine final tier
   ↓
4. Bulk update customer tiers
   ↓
5. Update lastTierUpgradeAt for upgrades
   ↓
6. Log tier changes to history
```

---

### MktCustomerTierCalculationService

**File:** `services/tier/mkt-customer-tier-calculation.service.ts`

Tính toán tier dựa trên order metrics.

```typescript
@Injectable()
export class MktCustomerTierCalculationService {
  /**
   * Calculate tier for single customer
   */
  async calculateCustomerTier(
    customerId: string,
    options?: { includeOnlyCompletedOrders?: boolean; completedStatuses?: string[] },
  ): Promise<CustomerTierResult>;

  /**
   * Bulk calculate tiers - 1 query for N customers
   */
  async calculateBulkCustomerTiers(
    customerIds: string[],
  ): Promise<Map<string, CustomerTierResult>>;

  /**
   * Get tier criteria information
   */
  getTierCriteria(): Record<MKT_CUSTOMER_TIER, { spending: string; orders: string }>;

  /**
   * Check upgrade eligibility
   */
  checkUpgradeEligibility(
    currentTier: MKT_CUSTOMER_TIER,
    totalOrderValue: number,
    totalOrderCount: number,
  ): { canUpgrade: boolean; nextTier?: MKT_CUSTOMER_TIER; requirements?: string };
}
```

**Tier Thresholds:**

```typescript
MKT_CUSTOMER_TIER_THRESHOLDS = {
  DIAMOND: { minSpending: 10_000_000, minOrders: 20 },
  GOLD:    { minSpending: 5_000_000,  minOrders: 10 },
  SILVER:  { minSpending: 2_000_000,  minOrders: 5 },
  BRONZE:  { minSpending: 500_000,    minOrders: 1 },
}
```

**Algorithm:**

```typescript
private determineTier(totalOrderValue: number, totalOrderCount: number): MKT_CUSTOMER_TIER {
  if (value >= 10M && count >= 20) return DIAMOND;
  if (value >= 5M && count >= 10) return GOLD;
  if (value >= 2M && count >= 5) return SILVER;
  if (value >= 500K && count >= 1) return BRONZE;
  return BRONZE;
}
```

---

### MktCustomerDowngradePolicyService

**File:** `services/tier/mkt-customer-downgrade-policy.service.ts`

Chính sách bảo vệ khách hàng khỏi bị hạ tier đột ngột.

```typescript
@Injectable()
export class MktCustomerDowngradePolicyService {
  /**
   * Check if customer is protected from downgrade
   * (within 30 days after upgrade)
   */
  checkDowngradeProtection(lastTierUpgradeAt: Date | null): {
    isProtected: boolean;
    remainingDays: number;
  };

  /**
   * Check inactivity status (DORMANT/CHURNED)
   */
  checkInactivityStatus(lastOrderDate: Date | null, currentTier: MKT_CUSTOMER_TIER): {
    status: 'active' | 'dormant' | 'churned';
    daysSinceLastOrder: number;
  };

  /**
   * Determine final tier after applying all policies
   * Main entry point
   */
  determineFinalTier(context: CustomerDowngradeContext): {
    finalTier: MKT_CUSTOMER_TIER;
    wasDowngraded: boolean;
    wasProtected: boolean;
    reason: DowngradeBlockedReason | null;
  };

  /**
   * Check if tier change is upgrade/downgrade
   */
  isUpgrade(previousTier: MKT_CUSTOMER_TIER | null, newTier: MKT_CUSTOMER_TIER): boolean;
  isDowngrade(previousTier: MKT_CUSTOMER_TIER, newTier: MKT_CUSTOMER_TIER): boolean;

  /**
   * Update lastTierUpgradeAt when customer is upgraded
   */
  async updateLastTierUpgrade(workspaceId: string, customerId: string): Promise<void>;
  async bulkUpdateLastTierUpgrade(workspaceId: string, customerIds: string[]): Promise<number>;

  /**
   * Check reactivation from DORMANT/CHURNED
   */
  checkReactivation(currentTier: MKT_CUSTOMER_TIER, calculatedTier: MKT_CUSTOMER_TIER): {
    shouldReactivate: boolean;
    reactivationTier: MKT_CUSTOMER_TIER;
  };
}
```

**Policy Rules:**

| Rule | Configuration | Description |
|------|---------------|-------------|
| Protection Period | 30 days | Sau khi upgrade, không bị downgrade trong 30 ngày |
| Max Tier Drop | 1 tier | Mỗi lần recalculation chỉ hạ tối đa 1 tier |
| Dormant Detection | 120 days | Không mua hàng 120 ngày → DORMANT |
| Churned Detection | 180 days | Không mua hàng 180 ngày → CHURNED |

**Downgrade Path:**

```
DIAMOND → GOLD → SILVER → BRONZE
(max 1 tier per recalculation)
```

---

### MktCustomerTierHistoryService

**File:** `services/tier/mkt-customer-tier-history.service.ts`

Lưu lịch sử thay đổi tier cho audit.

```typescript
@Injectable()
export class MktCustomerTierHistoryService {
  /**
   * Log single tier change
   */
  async logTierChange(data: {
    customerId: string;
    previousTier: MKT_CUSTOMER_TIER | null;
    newTier: MKT_CUSTOMER_TIER;
    reason: TierChangeReason;
    metadata?: { orderValue: number; orderCount: number };
  }): Promise<void>;

  /**
   * Bulk log tier changes
   */
  async bulkLogTierChanges(
    workspaceId: string,
    changes: Array<{
      customerId: string;
      previousTier: MKT_CUSTOMER_TIER | null;
      newTier: MKT_CUSTOMER_TIER;
      reason: TierChangeReason;
      metadata?: { orderValue: number; orderCount: number };
    }>,
  ): Promise<void>;

  /**
   * Get tier history for customer
   */
  async getTierHistory(customerId: string): Promise<MktCustomerTierHistoryWorkspaceEntity[]>;
}
```

---

### MktCustomerQueueService

**File:** `services/tier/mkt-customer-queue.service.ts`

Quản lý queue cho tier update jobs.

```typescript
@Injectable()
export class MktCustomerQueueService {
  /**
   * Queue tier update for specific customer
   */
  async queueTierUpdate(customerId: string): Promise<void>;

  /**
   * Queue batch tier update for workspace
   */
  async queueBatchTierUpdate(workspaceId: string): Promise<void>;
}
```

---

## Lifecycle Services

### MktCustomerCategorizationService

**File:** `services/lifecycle/mkt-customer-categorization.service.ts`

Phân loại khách hàng theo lifecycle stage.

```typescript
@Injectable()
export class MktCustomerCategorizationService {
  /**
   * Get order statistics for customer
   */
  async getCustomerOrderStats(customerId: string): Promise<CustomerOrderStats>;

  /**
   * Determine lifecycle stage based on stats
   */
  determineLifecycleStage(stats: CustomerOrderStats): string;

  /**
   * Categorize single customer
   */
  async categorizeCustomer(customer: MktCustomerWorkspaceEntity): Promise<CategorizationResult>;

  /**
   * Batch categorize all customers in workspace
   * Thread-safe
   */
  async categorizeAllCustomers(workspaceId: string, batchSize?: number): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }>;

  /**
   * Get customers by lifecycle stage
   */
  async getCustomersByStage(stage: string, limit?: number): Promise<...>;

  /**
   * Get at-risk customers (RETENTION stage)
   */
  async getAtRiskCustomers(limit?: number): Promise<...>;

  /**
   * Get churned customers for reactivation
   */
  async getChurnedCustomers(limit?: number): Promise<...>;

  /**
   * Get stage distribution statistics
   */
  async getStageDistribution(): Promise<Record<string, number>>;
}
```

**Categorization Logic:**

```typescript
determineLifecycleStage(stats: CustomerOrderStats): string {
  // No orders → PROSPECTIVE
  if (stats.totalOrders === 0) return 'PROSPECTIVE';

  // Check churned (> 180 days inactive)
  if (daysSinceLastOrder >= 180) return 'CHURNED';

  // At risk (> 90 days inactive)
  if (daysSinceLastOrder >= 90) return 'RETENTION';

  // Loyal (≥5 orders AND ≥5M VND)
  if (stats.completedOrders >= 5 && stats.totalValue >= 5_000_000) {
    return 'LOYAL';
  }

  // Has completed orders → CUSTOMER
  if (stats.completedOrders > 0) return 'CUSTOMER';

  // Has orders but none completed → TRIAL
  return 'TRIAL';
}
```

---

### MktCustomerAutoAssignService

**File:** `services/lifecycle/mkt-customer-auto-assign.service.ts`

Tự động assign khách hàng mới cho sales.

```typescript
@Injectable()
export class MktCustomerAutoAssignService {
  /**
   * Auto-assign customer to sales member
   * Strategies: round_robin, least_customers, random
   */
  async assignCustomer(
    customer: MktCustomerWorkspaceEntity,
    workspaceId: string,
  ): Promise<void>;

  /**
   * Get next sales member for assignment
   */
  async getNextAssignee(workspaceId: string): Promise<string | null>;
}
```

**Configuration:**

```typescript
MKT_CUSTOMER_AUTO_ASSIGN_CONFIG = {
  ENABLED: true,
  STRATEGY: 'round_robin',  // round_robin | least_customers | random
  ELIGIBLE_ROLES: ['sales', 'account_manager'],
}
```

---

## Account Services

### MktCustomerAccountService

**File:** `services/account/mkt-customer-account.service.ts`

Quản lý linked accounts (JSONB array trong Customer entity).

```typescript
@Injectable()
export class MktCustomerAccountService {
  /**
   * Link external account to customer
   * Auto-sets as primary if first of provider
   */
  async linkAccount(input: LinkAccountInput, workspaceId?: string): Promise<LinkedAccount>;

  /**
   * Legacy method for MKT Server accounts
   */
  async linkMktAccount(input: {...}, workspaceId?: string): Promise<LinkedAccount>;

  /**
   * Set account as primary (within provider)
   */
  async setPrimaryAccount(customerId: string, accountId: string): Promise<void>;

  /**
   * Get primary account for customer
   */
  async getPrimaryAccount(
    customerId: string,
    provider?: AccountProvider,
  ): Promise<LinkedAccount | null>;

  /**
   * Get all accounts for customer
   */
  async getCustomerAccounts(
    customerId: string,
    provider?: AccountProvider,
  ): Promise<LinkedAccount[]>;

  /**
   * Find customer by external account
   */
  async findCustomerByExternalId(
    provider: AccountProvider,
    externalId: string,
  ): Promise<string | null>;

  /**
   * Unlink account from customer
   */
  async unlinkAccount(customerId: string, accountId: string): Promise<void>;

  /**
   * Update last sync timestamp
   */
  async updateLastSyncAt(customerId: string, accountId: string): Promise<void>;

  /**
   * Update account status
   */
  async updateAccountStatus(
    customerId: string,
    accountId: string,
    status: LinkedAccountStatus,
  ): Promise<void>;

  /**
   * Sync account info from external provider
   */
  async syncAccountInfo(
    customerId: string,
    accountId: string,
    data: { email?: string; displayName?: string; ... },
  ): Promise<void>;
}
```

**Business Rules:**
- One external account can only link to one customer
- Each customer can have multiple accounts from different providers
- Only one account per provider can be primary
- First account of each provider becomes primary automatically

---

## Export Services

### MktCustomerExportService

**File:** `services/export/mkt-customer-export.service.ts`

Export danh sách khách hàng.

```typescript
@Injectable()
export class MktCustomerExportService {
  /**
   * Export customers to CSV/Excel
   */
  async exportCustomers(options: {
    format: 'csv' | 'xlsx';
    filters?: CustomerFilters;
    fields?: string[];
  }): Promise<Buffer>;
}
```

---

## License Services

### MktCustomerLicenseService

**File:** `services/license/mkt-customer-license.service.ts`

Quản lý licenses của customer.

```typescript
@Injectable()
export class MktCustomerLicenseService {
  /**
   * Get all licenses for customer
   */
  async getCustomerLicenses(customerId: string): Promise<License[]>;

  /**
   * Get license count
   */
  async getLicenseCount(customerId: string): Promise<number>;

  /**
   * Update license count on customer
   */
  async updateLicenseCount(customerId: string): Promise<void>;
}
```

---

## Service Dependencies

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MktCustomerTierService                        │
│  (Orchestrator)                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │ TierCalculation     │  │ DowngradePolicy     │                   │
│  │ Service             │  │ Service             │                   │
│  └─────────────────────┘  └─────────────────────┘                   │
│           │                        │                                 │
│           └────────────┬───────────┘                                 │
│                        ▼                                             │
│  ┌─────────────────────────────────────────┐                        │
│  │        TierHistoryService               │                        │
│  └─────────────────────────────────────────┘                        │
│                        │                                             │
│                        ▼                                             │
│  ┌─────────────────────────────────────────┐                        │
│  │        MktCustomerRepository            │                        │
│  │        MktOrderRepository               │                        │
│  └─────────────────────────────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Utility Usage

Tất cả services PHẢI sử dụng các utility functions:

### DateTimeUtils

```typescript
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

// ✅ Good
const now = DateTimeUtils.now();
const daysDiff = DateTimeUtils.diffInDays(date1, date2);

// ❌ Bad
const now = new Date();
```

### MoneyUtils

```typescript
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

// ✅ Good
const total = MoneyUtils.sumBy(orders, 'totalAmount').toNumber();
const isEligible = MoneyUtils.greaterThanOrEqual(value, threshold);

// ❌ Bad
const total = orders.reduce((sum, o) => sum + o.totalAmount, 0);
```

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Kiến trúc tổng thể
- [ENTITIES.md](./ENTITIES.md) - Chi tiết entities
- [TIER_SYSTEM.md](./TIER_SYSTEM.md) - Chi tiết hệ thống tier
- [LIFECYCLE.md](./LIFECYCLE.md) - Chi tiết lifecycle management
