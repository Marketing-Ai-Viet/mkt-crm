# MKT-Core Worker Jobs Analysis

> Tài liệu phân tích chi tiết các background jobs và async services trong module mkt-core của Twenty CRM.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Kiến trúc Worker](#kiến-trúc-worker)
- [Message Queues](#message-queues)
- [Chi tiết Jobs](#chi-tiết-jobs)
  - [Payment Processing Jobs](#1-payment-processing-jobs)
  - [Customer Management Jobs](#2-customer-management-jobs)
  - [Promotion Management Jobs](#3-promotion-management-jobs)
  - [Product Integration Jobs](#4-product-integration-jobs)
  - [Invoice Integration Jobs](#5-invoice-integration-jobs)
  - [RBAC Enterprise Jobs](#6-rbac-enterprise-jobs)
- [Async-Heavy Services](#async-heavy-services)
- [Tổng hợp & Khuyến nghị](#tổng-hợp--khuyến-nghị)
- [Cấu hình Docker](#cấu-hình-docker)

---

## Tổng quan

### Thống kê

| Metric | Giá trị |
|--------|---------|
| Tổng số Job files | 14 |
| Async-heavy Services | 6+ |
| Message Queues | 4 loại |
| External API integrations | 3 (MKT Server, SePay, Viettel S-Invoice) |

### Phân loại Jobs

```
┌────────────────────────────────────────────────────────────┐
│                    MKT-Core Jobs                           │
├────────────────────────────────────────────────────────────┤
│  CRITICAL (12 jobs)     │  RECOMMENDED (2 jobs)            │
│  ─────────────────────  │  ──────────────────────          │
│  • Payment Overdue      │  • RBAC Cache Warmer             │
│  • Payment Deadline     │  • Cross Region Reload           │
│  • Payment Reminder     │                                  │
│  • Customer Tier (bulk) │                                  │
│  • Customer Tier (single)│                                 │
│  • Customer Categorization│                                │
│  • Promotion Expiration │                                  │
│  • Coupon Expiration    │                                  │
│  • Promotion Cleanup    │                                  │
│  • Promotion Cache      │                                  │
│  • Product Sync         │                                  │
│  • S-Invoice Integration│                                  │
└────────────────────────────────────────────────────────────┘
```

---

## Kiến trúc Worker

### Tổng quan hệ thống

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Twenty CRM Architecture                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐     │
│   │   Client    │─────────▶│   Server    │─────────▶│  PostgreSQL │     │
│   │  (Browser)  │          │  (API/Web)  │          │     (DB)    │     │
│   └─────────────┘          └──────┬──────┘          └─────────────┘     │
│                                   │                                      │
│                                   │ Enqueue Jobs                         │
│                                   ▼                                      │
│                            ┌─────────────┐                               │
│                            │    Redis    │                               │
│                            │  (BullMQ)   │                               │
│                            └──────┬──────┘                               │
│                                   │                                      │
│                                   │ Process Jobs                         │
│                                   ▼                                      │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │                        WORKER                                │       │
│   ├─────────────────────────────────────────────────────────────┤       │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │       │
│   │  │  Cron Jobs   │  │ Message Jobs │  │ Delayed Jobs │       │       │
│   │  │  (Scheduled) │  │ (On-demand)  │  │  (Timed)     │       │       │
│   │  └──────────────┘  └──────────────┘  └──────────────┘       │       │
│   │         │                 │                 │                │       │
│   │         ▼                 ▼                 ▼                │       │
│   │  ┌─────────────────────────────────────────────────────┐    │       │
│   │  │              External Services                       │    │       │
│   │  │  • MKT Server (License lock, Product sync)          │    │       │
│   │  │  • SePay (Payment webhook)                          │    │       │
│   │  │  • Viettel S-Invoice (E-invoice)                    │    │       │
│   │  │  • SMTP (Email sending)                             │    │       │
│   │  └─────────────────────────────────────────────────────┘    │       │
│   └─────────────────────────────────────────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Entry Points

| Service | Command | Port |
|---------|---------|------|
| **Server** (API) | `node dist/src/main` | 3003 |
| **Worker** (Background) | `node dist/src/queue-worker/queue-worker` | 9230 (debug) |

Cả hai sử dụng chung Docker image `twenty-server`, chỉ khác entry point.

### QueueWorkerModule Structure

```typescript
// src/queue-worker/queue-worker.module.ts
@Module({
  imports: [
    CoreEngineModule,                      // Infrastructure (DB, Redis, Logger)
    MessageQueueModule.registerExplorer(), // Job discovery engine
    WorkspaceEventEmitterModule,           // Event handling
    JobsModule,                            // All job providers
    TwentyORMModule,                       // Database ORM
  ],
})
export class QueueWorkerModule {}
```

### Module Dependency Tree

```
QueueWorkerModule
├── CoreEngineModule
│   ├── DatabaseModule (PostgreSQL)
│   ├── CacheStorageModule (Redis)
│   ├── LoggerModule
│   └── ExceptionHandlerModule
│
├── MessageQueueModule.registerExplorer()
│   ├── DiscoveryModule (NestJS core)
│   ├── MessageQueueExplorer ← Discovers @Processor classes
│   └── MessageQueueMetadataAccessor
│
├── JobsModule
│   ├── MessagingModule (Email sync)
│   ├── CalendarModule (Calendar sync)
│   ├── WorkflowModule (Automation)
│   ├── MktCommandModule (CLI commands)
│   │
│   └── MktJobsModule ← MKT-CORE JOBS
│       ├── CustomerModule
│       │   ├── MktCustomerCategorizationCronJob
│       │   ├── MktCustomerTierCronJob
│       │   └── MktCustomerTierUpdateJob
│       │
│       ├── MktOrderModule
│       │   ├── PaymentOverdueScanJob
│       │   └── PaymentDeadlineProcessor
│       │
│       ├── MktInvoiceModule
│       │   └── SInvoiceIntegrationJob
│       │
│       ├── MktProductIntegrationModule
│       │   └── MktProductScheduledSyncJob
│       │
│       ├── MktPromotionModule
│       │   ├── PromotionExpirationCheckJob
│       │   ├── CouponExpirationCheckJob
│       │   ├── PromotionUsageCleanupJob
│       │   └── PromotionCacheWarmupJob
│       │
│       └── CasbinModule
│           ├── CacheWarmerJob
│           └── CrossRegionReloadJob
│
└── TwentyORMModule
```

### Job Discovery Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    JOB DISCOVERY FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Worker Bootstrap                                            │
│     │                                                           │
│     └─► NestFactory.createApplicationContext(QueueWorkerModule) │
│                                                                 │
│  2. Module Initialization                                       │
│     │                                                           │
│     └─► Load all imports (JobsModule → MktJobsModule → ...)     │
│                                                                 │
│  3. MessageQueueExplorer.onModuleInit()                         │
│     │                                                           │
│     └─► explore()                                               │
│         │                                                       │
│         ├─► DiscoveryService.getProviders()                     │
│         │   └─► Returns ALL providers from ALL loaded modules   │
│         │                                                       │
│         ├─► Filter: metadataAccessor.isProcessor(provider)      │
│         │   └─► Check for @Processor(MessageQueue.xxx) decorator│
│         │                                                       │
│         ├─► Group by queueName                                  │
│         │   └─► { cronQueue: [Job1, Job2], billingQueue: [...] }│
│         │                                                       │
│         └─► For each queue: messageQueueService.work(handler)   │
│             └─► BullMQ Worker starts listening for jobs         │
│                                                                 │
│  4. Job Processing                                              │
│     │                                                           │
│     └─► When job arrives from Redis:                            │
│         │                                                       │
│         ├─► Match job.name with @Process(jobName) metadata      │
│         │                                                       │
│         └─► Invoke matched handler method                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**KEY INSIGHT:** Job classes MUST be in modules that are imported into `JobsModule` (directly or transitively). If a module is not imported, its `@Processor` classes will NOT be discovered.

---

## Cron Registration Flow

### Hai cách đăng ký Cron Jobs

#### 1. CLI Command (entrypoint.sh)

```bash
# Khi container khởi động, entrypoint.sh gọi:
yarn command:prod cron:register:all   # Twenty core jobs
yarn command:prod cron:register:mkt   # MKT-core jobs
```

```
┌────────────────────────────────────────────────────────────────┐
│  entrypoint.sh                                                  │
│  │                                                              │
│  ├─► cron:register:all                                          │
│  │   └─► MessagingMessagesImportCronCommand.run()              │
│  │       └─► messageQueueService.addCron({                      │
│  │             jobName: 'MessagingMessagesImportCronJob',       │
│  │             pattern: '*/1 * * * *'                           │
│  │           })                                                 │
│  │                                                              │
│  └─► cron:register:mkt                                          │
│      └─► (MKT cron commands)                                    │
└────────────────────────────────────────────────────────────────┘
```

#### 2. OnModuleInit (Auto-registration)

```typescript
// BaseCronRegistrationService pattern
@Injectable()
export class MktProductSyncCronRegistrationService
  extends BaseCronRegistrationService
  implements OnModuleInit
{
  // Tự động chạy khi module load
  async onModuleInit() {
    const workspaceIds = await this.getWorkspaceIds();

    for (const workspaceId of workspaceIds) {
      await this.messageQueueService.addCron({
        jobName: MktProductScheduledSyncJob.name,
        pattern: '*/30 * * * *',
        data: { workspaceId },
      });
    }
  }
}
```

### addCron() → BullMQ upsertJobScheduler

```typescript
// BullMQDriver.addCron()
async addCron({ jobName, data, options }) {
  // upsertJobScheduler = create or update cron scheduler
  await this.queueMap[queueName].upsertJobScheduler(
    jobKey,           // Unique key (jobName + jobId)
    options.repeat,   // { pattern: '*/30 * * * *' }
    {
      name: jobName,  // Matches @Process(jobName)
      data,           // { workspaceId: '...' }
    },
  );
}
```

### Redis Storage

```
# Cron schedulers stored in Redis
bull:cron-queue:repeat:{jobKey}
bull:cron-queue:delayed (ZSET - sorted by next run time)
bull:cron-queue:waiting (LIST - ready to process)
bull:cron-queue:active  (LIST - currently processing)
```

---

## Message Queues

### Danh sách Queues

| Queue Name | Mục đích | Concurrency |
|------------|----------|-------------|
| `MessageQueue.cronQueue` | Cron jobs (scheduled tasks) | Default |
| `MessageQueue.customerQueue` | Customer operations | Default |
| `MessageQueue.billingQueue` | Invoice/billing operations | Default |
| `MKT_DELAYED_JOB_QUEUES.PAYMENT_DEADLINE` | Payment deadline checks | 5 |
| `MKT_DELAYED_JOB_QUEUES.PAYMENT_REMINDER` | Payment reminders | 10 |

### Queue Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Message Queue Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Server (Producer)                                           │
│  ─────────────────                                           │
│  OrderService.create()                                       │
│       │                                                      │
│       ├──▶ Emit OrderCreatedEvent                            │
│       │         │                                            │
│       │         ▼                                            │
│       │    EventListener                                     │
│       │         │                                            │
│       │         ├──▶ customerQueue.add(tierUpdate)           │
│       │         └──▶ billingQueue.add(invoiceSync)           │
│       │                                                      │
│       └──▶ DelayedJobService.schedule(paymentDeadline)       │
│                     │                                        │
│                     ▼                                        │
│              ┌─────────────┐                                 │
│              │    Redis    │                                 │
│              │   (Queue)   │                                 │
│              └──────┬──────┘                                 │
│                     │                                        │
│  Worker (Consumer)  │                                        │
│  ─────────────────  │                                        │
│                     ▼                                        │
│  @Processor(customerQueue)                                   │
│       │                                                      │
│       └──▶ MktCustomerTierUpdateJob.handle()                 │
│                     │                                        │
│                     ├──▶ Calculate tier                      │
│                     ├──▶ Update database                     │
│                     └──▶ Log history                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Chi tiết Jobs

### 1. Payment Processing Jobs

#### 1.1 Payment Overdue Scan Job

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `order/jobs/payment-overdue-scan.job.ts` |
| **Type** | Cron Job |
| **Queue** | `MessageQueue.cronQueue` |
| **Schedule** | Every 5 minutes (configurable) |
| **Decorator** | `@Processor`, `@Process`, `@SentryCronMonitor` |

**Chức năng:**
- Quét các orders quá hạn thanh toán
- Lock licenses qua HTTP call đến MKT Server
- Backup mechanism cho delayed job system

**Operations:**
```typescript
// Pseudo code
async handle() {
  const overdueOrders = await findOverdueOrders();
  for (const order of overdueOrders) {
    await lockLicenses(order.licenses);  // HTTP POST to MKT Server
    await updateOrderStatus(order, 'BLOCKED');
  }
}
```

**Recommendation:** ✅ MUST run on Worker

---

#### 1.2 Payment Deadline Processor

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `order/jobs/payment-deadline.processor.ts` |
| **Type** | Delayed Job Processor |
| **Queues** | `PAYMENT_DEADLINE` (concurrency: 5), `PAYMENT_REMINDER` (concurrency: 10) |
| **Retry** | 3 attempts with exponential backoff |

**Handlers:**

| Handler | Trigger | Action |
|---------|---------|--------|
| `handleDeadlineCheck()` | Payment deadline reached | Lock order & licenses |
| `handleReminder()` | Before deadline | Send reminder notification |

**Retry Configuration:**
```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000
  },
  removeOnComplete: true
}
```

**Recommendation:** ✅ MUST run on Worker

---

### 2. Customer Management Jobs

#### 2.1 Customer Tier Cron Job (Bulk)

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `customer/jobs/mkt-customer-tier.cron.job.ts` |
| **Type** | Cron Job |
| **Queue** | `MessageQueue.cronQueue` |
| **Schedule** | Configurable via `MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN` |

**Chức năng:**
- Update tier cho tất cả customers trong workspace
- Tính toán dựa trên order values
- Batch processing để tối ưu performance

**Recommendation:** ✅ MUST run on Worker

---

#### 2.2 Customer Tier Update Job (Single)

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `customer/jobs/mkt-customer-tier-update.job.ts` |
| **Type** | Message Queue Job |
| **Queue** | `MessageQueue.customerQueue` |
| **Retry** | 3 attempts |

**Triggered by:**
```typescript
// MktCustomerQueueService
async updateCustomerTier(customerId: string) {
  await this.messageQueueService.add(
    MessageQueue.customerQueue,
    { customerId },
    { attempts: 3 }
  );
}
```

**Operations:**
- Calculate customer tier based on order history
- Log tier change history
- Update `lastTierUpgradeAt` if upgraded

**Recommendation:** ✅ MUST run on Worker

---

#### 2.3 Customer Categorization Cron Job

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `customer/jobs/mkt-customer-categorization.cron.job.ts` |
| **Type** | Cron Job |
| **Queue** | `MessageQueue.cronQueue` |
| **Batch Size** | `MKT_CUSTOMER_CATEGORIZATION_BATCH_SIZE` |

**Chức năng:**
- Categorize customers dựa trên metrics
- Batch processing để xử lý large datasets
- CPU/IO intensive operation

**Recommendation:** ✅ MUST run on Worker

---

### 3. Promotion Management Jobs

#### 3.1 Promotion Expiration Check Job

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `mkt-promotion/jobs/promotion-expiration-check.job.ts` |
| **Type** | Message Queue Job |
| **Queue** | `MessageQueue.cronQueue` |

**Chức năng:**
```typescript
async handle() {
  // Find expired promotions
  const expired = await find({
    where: {
      endDate: LessThan(now),
      status: 'ACTIVE'
    }
  });

  // Update status
  for (const promo of expired) {
    promo.status = 'EXPIRED';
    await save(promo);
    await emit(PromotionExpiredEvent);
  }
}
```

**Recommendation:** ✅ MUST run on Worker

---

#### 3.2 Coupon Expiration Check Job

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `mkt-promotion/jobs/coupon-expiration-check.job.ts` |
| **Type** | Message Queue Job |
| **Queue** | `MessageQueue.cronQueue` |
| **Batch Size** | 100 (using `lodash.chunk`) |

**Batch Processing:**
```typescript
const expiredCoupons = await findExpiredCoupons();
const chunks = chunk(expiredCoupons, BATCH_SIZE);

for (const batch of chunks) {
  const ids = batch.map(c => c.id);
  await update({ id: In(ids) }, { status: 'EXPIRED' });

  for (const coupon of batch) {
    await emit(CouponExpiredEvent, coupon);
  }
}
```

**Recommendation:** ✅ MUST run on Worker

---

#### 3.3 Promotion Usage Cleanup Job

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `mkt-promotion/jobs/promotion-usage-cleanup.job.ts` |
| **Type** | Message Queue Job |
| **Queue** | `MessageQueue.cronQueue` |
| **Retention** | 2 years (soft delete) |

**Chức năng:**
- Soft delete promotion usage records older than 2 years
- Set `deletedAt` timestamp

**Recommendation:** ✅ MUST run on Worker

---

#### 3.4 Promotion Cache Warmup Job

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `mkt-promotion/jobs/promotion-cache-warmup.job.ts` |
| **Type** | Message Queue Job |
| **Queue** | `MessageQueue.cronQueue` |

**Chức năng:**
- Load all active promotions with relations
- Pre-populate query cache

**Recommendation:** ✅ MUST run on Worker

---

### 4. Product Integration Jobs

#### 4.1 Product Scheduled Sync Job

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `mkt-product-integration/jobs/mkt-product-scheduled-sync.job.ts` |
| **Type** | Cron Job |
| **Decorator** | `@Cron` |
| **Schedule** | Every 30 minutes (default: `0 */30 * * * *`) |

**Configuration:**

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `MKT_SCHEDULED_SYNC_ENABLED` | `true` | Enable cron sync |
| `MKT_AUTO_SYNC_ENABLED` | `true` | Event-driven sync on token acquired |
| `MKT_SCHEDULED_SYNC_CRON` | `0 */30 * * * *` | Cron pattern |

**Chức năng:**
```typescript
@Cron(process.env.MKT_SCHEDULED_SYNC_CRON || '0 */30 * * * *')
async handleScheduledSync() {
  // Skip if recently synced
  if (this.isRecentlySynced()) return;

  // Acquire distributed lock
  const lock = await this.acquireLock();
  if (!lock) return;

  try {
    // Stream products from MKT Server
    await this.syncProducts();
    await this.syncPackages();

    // Update cache
    await this.updateCache();

    // Report metrics
    this.reportMetrics({ productCount, packageCount, duration });
  } finally {
    await this.releaseLock();
  }
}
```

**Operations:**
- HTTP streaming pagination to MKT Server
- Redis distributed locking
- Cache invalidation and refresh
- Memory-efficient streaming

**Recommendation:** ✅ MUST run on Worker

---

### 5. Invoice Integration Jobs

#### 5.1 S-Invoice Integration Job

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `invoice/jobs/s-invoice-integration.job.ts` |
| **Type** | Message Queue Job |
| **Queue** | `MessageQueue.billingQueue` |

**Job Data:**
```typescript
interface SInvoiceJobData {
  orderId: string;
  workspaceId: string;
}
```

**External API Calls:**
```typescript
// Viettel S-Invoice API
POST /services/einvoiceapplication/api/InvoiceAPI/InvoiceWS/createInvoice/{taxCode}
GET  /services/einvoiceapplication/api/InvoiceAPI/InvoiceUtilsWS/getInvoiceRepresentationFile
```

**Chức năng:**
- Build invoice payload from order entities
- Submit to Viettel e-invoice system
- Handle invoice file retrieval

**Recommendation:** ✅ MUST run on Worker

---

### 6. RBAC Enterprise Jobs

#### 6.1 RBAC Cache Warmer Job

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `mkt-rbac-enterprise-grade/casbin/jobs/cache-warmer.job.ts` |
| **Type** | Cron Job |
| **Decorator** | `@Cron(CronExpression.EVERY_HOUR)` |
| **Schedule** | Every hour |

**Chức năng:**
- Warm RBAC enforcer caches
- Fallback if PG NOTIFY misses updates
- Cross-workspace cache operations

**Recommendation:** 💡 SHOULD run on Worker

---

#### 6.2 Cross Region Reload Job

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | `mkt-rbac-enterprise-grade/casbin/jobs/cross-region-reload.job.ts` |
| **Type** | Cron Job |
| **Decorator** | `@Cron(CronExpression.EVERY_HOUR)` |
| **Schedule** | Every hour |

**Chức năng:**
- Full policy reload for cross-region consistency
- Safety net if Redis Pub/Sub messages are lost

**Recommendation:** 💡 SHOULD run on Worker

---

## Async-Heavy Services

### Services cần chú ý

| Service | File | Operations | Worker? |
|---------|------|------------|---------|
| **Payment Webhook** | `mkt-payment-webhook.service.ts` | SePay webhook processing, idempotency check | Consider |
| **Payment Listener** | `mkt-payment-listener.service.ts` | Event-driven license history updates | Consider |
| **Product Sync** | `mkt-product-sync.service.ts` | OAuth2 token event, HTTP streaming | YES |
| **Product Cache** | `mkt-product-cache.service.ts` | Redis GET/SET (fast) | No |
| **Email Service** | `mkt-email.service.ts` | SMTP operations | YES |
| **Order Event Listener** | `mkt-order-custom-event.listener.ts` | Email + tier update enqueue | YES |

### Email Service

```typescript
// mkt-core/email/service/mkt-email.service.ts
@Injectable()
export class MktEmailService {
  async sendOrderEmail(order: Order) {
    // SMTP I/O - slow operation
    await this.emailService.send({
      to: order.customer.email,
      template: 'order-confirmation',
      data: order
    });
  }
}
```

**Recommendation:** ✅ Move to message queue for reliability

---

## Tổng hợp & Khuyến nghị

### Summary Table

| Job/Service | Queue | Type | Schedule | Worker | Heavy Ops |
|-------------|-------|------|----------|--------|-----------|
| Payment Overdue Scan | cronQueue | Cron | 5 min | ✅ YES | HTTP, DB |
| Payment Deadline Check | paymentDeadline | Delayed | On demand | ✅ YES | HTTP, DB |
| Payment Reminder | paymentReminder | Delayed | On demand | ✅ YES | Email |
| Customer Tier (bulk) | cronQueue | Cron | Config | ✅ YES | Batch DB |
| Customer Tier (single) | customerQueue | Message | On demand | ✅ YES | DB calc |
| Customer Categorization | cronQueue | Cron | Config | ✅ YES | Batch DB |
| Promotion Expiration | cronQueue | Message | Config | ✅ YES | DB, Events |
| Coupon Expiration | cronQueue | Message | Config | ✅ YES | Batch DB |
| Promotion Cleanup | cronQueue | Message | Config | ✅ YES | Soft delete |
| Promotion Cache | cronQueue | Message | Config | ✅ YES | DB cache |
| Product Sync | - | Cron | 30 min | ✅ YES | HTTP stream |
| S-Invoice Integration | billingQueue | Message | On demand | ✅ YES | HTTP API |
| RBAC Cache Warmer | - | Cron | Hourly | 💡 SHOULD | Cache ops |
| Cross Region Reload | - | Cron | Hourly | 💡 SHOULD | Redis pub/sub |

### Phân loại theo mức độ

```
┌─────────────────────────────────────────────────────────────┐
│                    Priority Matrix                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  HIGH PRIORITY (MUST)           │  MEDIUM PRIORITY (SHOULD)  │
│  ─────────────────────          │  ────────────────────────  │
│  • Payment jobs (3)             │  • RBAC Cache Warmer       │
│  • Customer jobs (3)            │  • Cross Region Reload     │
│  • Promotion jobs (4)           │                            │
│  • Product Sync (1)             │                            │
│  • S-Invoice (1)                │                            │
│                                 │                            │
│  Total: 12 jobs                 │  Total: 2 jobs             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Lý do cần Worker

| Reason | Jobs Affected |
|--------|---------------|
| **External HTTP Calls** | Payment (MKT Server lock), Product Sync, S-Invoice |
| **Batch DB Operations** | Customer Tier, Categorization, Promotion Expiration |
| **Email Sending** | Payment Reminder, Order notifications |
| **Distributed Locking** | Product Sync (Redis lock) |
| **Long-running Tasks** | All cron jobs with large datasets |

---

## Cấu hình Docker

### docker-compose.server.yml

```yaml
services:
  server:
    image: twenty-server:${TAG:-latest}
    command: ["node", "dist/src/main"]
    # ... API server config

  worker:
    image: twenty-server:${TAG:-latest}
    command: ["node", "dist/src/queue-worker/main"]
    environment:
      NODE_ENV: production
      # Queue configuration
      REDIS_HOST: redis
      REDIS_URL: redis://redis:6379
      # Sync configuration
      MKT_SCHEDULED_SYNC_ENABLED: "true"
      MKT_SCHEDULED_SYNC_CRON: "0 */30 * * * *"
    depends_on:
      - db
      - redis
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### Scaling Workers

```yaml
# Scale workers horizontally
services:
  worker:
    deploy:
      replicas: 2  # Run 2 worker instances
      resources:
        limits:
          memory: 512M
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MKT_SCHEDULED_SYNC_ENABLED` | `true` | Enable scheduled product sync |
| `MKT_AUTO_SYNC_ENABLED` | `true` | Enable event-driven sync |
| `MKT_SCHEDULED_SYNC_CRON` | `0 */30 * * * *` | Sync schedule (every 30 min) |
| `PAYMENT_OVERDUE_SCAN_CRON` | `*/5 * * * *` | Payment scan (every 5 min) |
| `MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN` | Configurable | Tier update schedule |
| `MKT_CUSTOMER_CATEGORIZATION_CRON_PATTERN` | Configurable | Categorization schedule |
| `MKT_CUSTOMER_CATEGORIZATION_BATCH_SIZE` | `100` | Batch size for categorization |

---

## Kết luận

Worker service là **thiết yếu** cho hoạt động của mkt-core module vì:

1. **86% jobs** (12/14) yêu cầu chạy trên Worker
2. **3 external API integrations** cần isolation (MKT Server, SePay, Viettel)
3. **Batch operations** cần tách riêng để không block API
4. **Email sending** cần queue để đảm bảo delivery
5. **Distributed locking** cần consistency

### Checklist triển khai

- [ ] Deploy Worker service cùng với Server
- [ ] Configure Redis cho message queues
- [ ] Set up environment variables cho cron schedules
- [ ] Monitor job failures với Sentry
- [ ] Scale workers nếu queue backlog tăng
- [ ] Set up alerts cho failed jobs

---

*Document generated: 2024*
*Module: mkt-core*
*Version: 1.0*
