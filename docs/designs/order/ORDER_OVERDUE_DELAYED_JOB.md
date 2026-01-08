# Order Overdue - Delayed Job Design

> **Version:** 1.1.0
> **Date:** 2025-12-30
> **Author:** Development Team
> **Status:** Draft

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc](#2-kiến-trúc)
3. [Infrastructure Module](#3-infrastructure-module)
4. [Configuration](#4-configuration)
5. [Implementation](#5-implementation)
6. [Integration](#6-integration)
7. [Migration](#7-migration)
8. [Observability](#8-observability)
9. [Testing](#9-testing)
10. [Rollout Plan](#10-rollout-plan)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Tổng quan

### 1.1 Mục đích

Thay thế cơ chế **Cron Job polling mỗi 30 phút** bằng **BullMQ Delayed Job** để tự động chuyển trạng thái đơn hàng từ `PENDING_PAYMENT` → `OVERDUE` một cách chính xác và hiệu quả hơn.

### 1.2 Vấn đề hiện tại

```
Current Problems:
├── Cron job chạy mỗi 30 phút
│   └── Delay tối đa 30 phút trước khi order được mark OVERDUE
│
├── Scan toàn bộ orders mỗi lần chạy
│   └── O(n) complexity, CPU spike mỗi 30 phút
│
├── Không chính xác về timing
│   └── Order có thể quá hạn 29 phút mà chưa được xử lý
│
└── Khó scale khi số lượng orders tăng
    └── Scan time tăng tuyến tính
```

### 1.3 Giải pháp đề xuất

| Tiêu chí | Cron Job (hiện tại) | Delayed Job (đề xuất) |
|----------|---------------------|----------------------|
| **Độ chính xác** | Delay tối đa 30 phút | Chính xác đến giây |
| **Hiệu suất** | Scan toàn bộ orders | Chỉ xử lý order cụ thể |
| **Scalability** | O(n) mỗi lần chạy | O(1) per order |
| **Resource** | CPU spike mỗi 30 phút | Distributed evenly |

### 1.4 Tech Stack

| Component | Technology |
|-----------|------------|
| Queue | BullMQ (Redis-backed) |
| Scheduler | BullMQ Delayed Jobs |
| Infrastructure | mkt-core/infrastructure/delayed-job |
| Pattern | Event-driven, Idempotent |

### 1.5 Nguyên tắc thiết kế

**KHÔNG sửa đổi Twenty core engine** - Tạo infrastructure riêng trong `mkt-core/infrastructure/delayed-job` để wrap BullMQ.

---

## 2. Kiến trúc

### 2.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ORDER OVERDUE DELAYED JOB SYSTEM                       │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────────┐
                         │    CreateOrderSaga   │
                         └──────────┬───────────┘
                                    │ order.status = PENDING_PAYMENT
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OrderOverdueSchedulerService                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  scheduleOverdueCheck(workspaceId, orderId, orderCode)                  ││
│  │  - Generate jobId: order-overdue:{orderId}                              ││
│  │  - Calculate delay: 24 hours (configurable)                             ││
│  │  - Call delayedJobService.scheduleJob()                                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   DelayedJobService      │
                    │   (infrastructure)       │
                    │                          │
                    │   - scheduleJob()        │
                    │   - cancelJob()          │
                    │   - registerWorker()     │
                    └──────────────┬───────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   mkt-order-overdue-queue│
                    │   (BullMQ Delayed)       │
                    │                          │
                    │   Job: { orderId,        │
                    │          workspaceId,    │
                    │          scheduledAt,    │
                    │          expectedAt }    │
                    └──────────────┬───────────┘
                                   │ after 24 hours
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OrderOverdueWorkerService                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  processOverdueCheck(payload)                                           ││
│  │                                                                          ││
│  │  1. Conditional Update: WHERE status = PENDING_PAYMENT                  ││
│  │     ├── affected = 0 → Skip (already paid/cancelled)                    ││
│  │     └── affected = 1 → Continue                                         ││
│  │                                                                          ││
│  │  2. Update status → OVERDUE                                             ││
│  │                                                                          ││
│  │  3. Emit ORDER_OVERDUE event                                            ││
│  │     └── Downstream: history, notifications, license lock                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────────┐
                         │   Cancel Flow        │
                         │   (Payment/Cancel)   │
                         └──────────┬───────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OrderOverdueSchedulerService                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  cancelOverdueCheck(orderId)                                            ││
│  │  - Call delayedJobService.cancelJob()                                   ││
│  │  - Log result (removed/not_found)                                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Structure

```
mkt-core/
├── infrastructure/
│   └── delayed-job/                    # NEW: Infrastructure module
│       ├── constants/
│       │   └── delayed-job.constants.ts
│       ├── services/
│       │   └── delayed-job.service.ts  # Core service wrap BullMQ
│       ├── types/
│       │   └── delayed-job.types.ts
│       ├── delayed-job-infrastructure.module.ts
│       └── index.ts
│
└── order/
    ├── constants/
    │   └── order-overdue.constants.ts  # Configuration constants
    ├── services/
    │   └── core/
    │       ├── order-overdue-scheduler.service.ts  # Schedule/Cancel API
    │       └── order-overdue-worker.service.ts     # Process jobs
    ├── scripts/
    │   └── migrate-pending-orders.command.ts       # Migration script
    └── types/
        └── order-overdue.types.ts      # TypeScript types
```

---

## 3. Infrastructure Module

### 3.1 Delayed Job Service

**File:** `src/mkt-core/infrastructure/delayed-job/services/delayed-job.service.ts`

Service này wrap BullMQ để cung cấp:
- Schedule delayed jobs với configurable delay
- Cancel jobs trước khi execute
- Retry với exponential backoff
- Worker registration

```typescript
@Injectable()
export class DelayedJobService implements OnModuleDestroy {
  /**
   * Schedule một delayed job
   */
  async scheduleJob<T>(
    queueName: MktDelayedJobQueue,
    jobName: string,
    payload: T,
    options: DelayedJobOptions,
  ): Promise<boolean>;

  /**
   * Cancel một delayed job
   */
  async cancelJob(
    queueName: MktDelayedJobQueue,
    jobId: string,
  ): Promise<CancelJobResult>;

  /**
   * Register worker để xử lý jobs
   */
  registerWorker<T>(
    options: DelayedJobWorkerOptions,
    handler: DelayedJobHandler<T>,
  ): void;

  /**
   * Get queue stats cho monitoring
   */
  async getQueueStats(queueName: MktDelayedJobQueue): Promise<QueueStats>;
}
```

### 3.2 Queue Constants

**File:** `src/mkt-core/infrastructure/delayed-job/constants/delayed-job.constants.ts`

```typescript
export const MKT_DELAYED_JOB_QUEUES = {
  ORDER_OVERDUE: 'mkt-order-overdue-queue',
} as const;

export const DELAYED_JOB_DEFAULTS = {
  RETRY_ATTEMPTS: 3,
  BACKOFF_TYPE: 'exponential' as const,
  BACKOFF_DELAY_MS: 5000,
  REMOVE_ON_COMPLETE: true,
  REMOVE_ON_FAIL_COUNT: 100,
} as const;
```

### 3.3 Types

**File:** `src/mkt-core/infrastructure/delayed-job/types/delayed-job.types.ts`

```typescript
export type DelayedJobOptions = {
  jobId: string;
  delayMs: number;
  retryAttempts?: number;
  backoff?: DelayedJobBackoff;
  priority?: number;
};

export type DelayedJobHandler<T> = (data: {
  jobId: string;
  payload: T;
  attemptNumber: number;
}) => Promise<void>;
```

---

## 4. Configuration

### 4.1 Environment Variables

```bash
# Order Overdue Configuration
MKT_ORDER_OVERDUE_DELAY_MS=86400000          # 24 hours (default)
MKT_ORDER_OVERDUE_RETRY_ATTEMPTS=3           # Max retry attempts
MKT_ORDER_OVERDUE_BACKOFF_MS=60000           # 1 minute base backoff
MKT_ORDER_OVERDUE_WORKER_CONCURRENCY=5       # Worker concurrency
```

### 4.2 Constants

**File:** `src/mkt-core/order/constants/order-overdue.constants.ts`

```typescript
/**
 * Order overdue configuration constants
 * Supports environment variable overrides
 */
export const ORDER_OVERDUE_CONFIG = {
  /** Time before order becomes overdue (milliseconds) - default 24h */
  get OVERDUE_DELAY_MS(): number {
    const envValue = process.env.MKT_ORDER_OVERDUE_DELAY_MS;
    const delay = envValue ? parseInt(envValue, 10) : 24 * 60 * 60 * 1000;
    const MIN_DELAY_MS = 60 * 60 * 1000; // Minimum 1 hour

    return Math.max(delay, MIN_DELAY_MS);
  },

  /** Time before order becomes overdue (hours) - for display */
  get OVERDUE_DELAY_HOURS(): number {
    return this.OVERDUE_DELAY_MS / (60 * 60 * 1000);
  },

  /** Max retry attempts */
  get RETRY_ATTEMPTS(): number {
    const envValue = process.env.MKT_ORDER_OVERDUE_RETRY_ATTEMPTS;

    return envValue ? parseInt(envValue, 10) : 3;
  },

  /** Base backoff delay in ms */
  get BACKOFF_MS(): number {
    const envValue = process.env.MKT_ORDER_OVERDUE_BACKOFF_MS;

    return envValue ? parseInt(envValue, 10) : 60000;
  },

  /** Worker concurrency */
  get WORKER_CONCURRENCY(): number {
    const envValue = process.env.MKT_ORDER_OVERDUE_WORKER_CONCURRENCY;

    return envValue ? parseInt(envValue, 10) : 5;
  },

  /** Job name for overdue check */
  JOB_NAME: 'ProcessOrderOverdue',

  /** Job ID prefix */
  JOB_ID_PREFIX: 'order-overdue',
} as const;

/** Generate job ID for an order */
export const getOverdueJobId = (orderId: string): string =>
  `${ORDER_OVERDUE_CONFIG.JOB_ID_PREFIX}:${orderId}`;
```

---

## 5. Implementation

### 5.1 Types

**File:** `src/mkt-core/order/types/order-overdue.types.ts`

```typescript
/**
 * Payload passed to overdue check job
 */
export type OrderOverduePayload = {
  orderId: string;
  workspaceId: string;
  orderCode?: string;
};

/**
 * Result of overdue check execution
 */
export type OrderOverdueCheckResult = {
  orderId: string;
  status: 'updated' | 'skipped' | 'not_found' | 'error';
  previousStatus?: string;
  message: string;
};
```

### 5.2 Scheduler Service

**File:** `src/mkt-core/order/services/core/order-overdue-scheduler.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';

import {
  DelayedJobService,
  MKT_DELAYED_JOB_QUEUES,
} from 'src/mkt-core/infrastructure/delayed-job';
import {
  ORDER_OVERDUE_CONFIG,
  getOverdueJobId,
} from 'src/mkt-core/order/constants/order-overdue.constants';
import { OrderOverduePayload } from 'src/mkt-core/order/types/order-overdue.types';

@Injectable()
export class OrderOverdueSchedulerService {
  private readonly logger = new Logger(OrderOverdueSchedulerService.name);

  constructor(private readonly delayedJobService: DelayedJobService) {}

  /**
   * Schedule overdue check for an order
   * Gọi khi order được tạo với status PENDING_PAYMENT
   */
  async scheduleOverdueCheck(
    workspaceId: string,
    orderId: string,
    orderCode?: string,
    customDelayMs?: number,
  ): Promise<boolean> {
    const delayMs = customDelayMs ?? ORDER_OVERDUE_CONFIG.OVERDUE_DELAY_MS;
    const jobId = getOverdueJobId(orderId);

    const payload: OrderOverduePayload = {
      orderId,
      workspaceId,
      orderCode,
    };

    const scheduled = await this.delayedJobService.scheduleJob(
      MKT_DELAYED_JOB_QUEUES.ORDER_OVERDUE,
      ORDER_OVERDUE_CONFIG.JOB_NAME,
      payload,
      {
        jobId,
        delayMs,
        retryAttempts: ORDER_OVERDUE_CONFIG.RETRY_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: ORDER_OVERDUE_CONFIG.BACKOFF_MS,
        },
      },
    );

    if (scheduled) {
      this.logger.log({
        message: 'Scheduled overdue check',
        orderId,
        orderCode,
        workspaceId,
        jobId,
        delayMs,
        delayHours: delayMs / (60 * 60 * 1000),
      });
    }

    return scheduled;
  }

  /**
   * Cancel scheduled overdue check
   * Gọi khi order được thanh toán hoặc huỷ trước thời hạn
   */
  async cancelOverdueCheck(orderId: string): Promise<boolean> {
    const jobId = getOverdueJobId(orderId);

    const result = await this.delayedJobService.cancelJob(
      MKT_DELAYED_JOB_QUEUES.ORDER_OVERDUE,
      jobId,
    );

    this.logger.log({
      message: result.success ? 'Cancelled overdue check' : 'Overdue job not found',
      orderId,
      jobId,
      success: result.success,
      reason: result.reason,
    });

    return result.success;
  }
}
```

### 5.3 Worker Service

**File:** `src/mkt-core/order/services/core/order-overdue-worker.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  DelayedJobService,
  MKT_DELAYED_JOB_QUEUES,
} from 'src/mkt-core/infrastructure/delayed-job';
import { ORDER_OVERDUE_CONFIG } from 'src/mkt-core/order/constants/order-overdue.constants';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MKT_ORDER_EVENT_TYPES } from 'src/mkt-core/order/types';
import {
  OrderOverduePayload,
  OrderOverdueCheckResult,
} from 'src/mkt-core/order/types/order-overdue.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

@Injectable()
export class OrderOverdueWorkerService implements OnModuleInit {
  private readonly logger = new Logger(OrderOverdueWorkerService.name);

  constructor(
    private readonly delayedJobService: DelayedJobService,
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit(): void {
    this.delayedJobService.registerWorker<OrderOverduePayload>(
      {
        queueName: MKT_DELAYED_JOB_QUEUES.ORDER_OVERDUE,
        concurrency: ORDER_OVERDUE_CONFIG.WORKER_CONCURRENCY,
      },
      async ({ jobId, payload, attemptNumber }) => {
        await this.processOverdueCheck(jobId, payload, attemptNumber);
      },
    );

    this.logger.log('Order overdue worker registered');
  }

  private async processOverdueCheck(
    jobId: string,
    payload: OrderOverduePayload,
    attemptNumber: number,
  ): Promise<OrderOverdueCheckResult> {
    const { orderId, workspaceId, orderCode } = payload;
    const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

    this.logger.log({
      message: 'Processing overdue check',
      orderId,
      orderCode,
      workspaceId,
      jobId,
      attemptNumber,
    });

    try {
      // Conditional update: Only update if status is still PENDING_PAYMENT
      const updateResult = await this.mktOrderRepository.updateWhere(
        workspaceId,
        { id: orderId, status: ORDER_STATUS.PENDING_PAYMENT },
        {
          status: ORDER_STATUS.OVERDUE,
          updatedAt: nowISO,
        },
      );

      if (updateResult.affected === 0) {
        // Order đã được thanh toán, huỷ, hoặc xử lý bởi process khác
        const order = await this.mktOrderRepository.findById(workspaceId, orderId);

        const result: OrderOverdueCheckResult = {
          orderId,
          status: order ? 'skipped' : 'not_found',
          previousStatus: order?.status,
          message: order
            ? `Order status is ${order.status}, skipping overdue update`
            : 'Order not found',
        };

        this.logger.log({ message: 'Overdue check skipped', ...result });

        return result;
      }

      // Update thành công → Emit event cho downstream processing
      this.emitOverdueEvent(workspaceId, orderId, orderCode, nowISO);

      const result: OrderOverdueCheckResult = {
        orderId,
        status: 'updated',
        previousStatus: ORDER_STATUS.PENDING_PAYMENT,
        message: 'Order updated to OVERDUE status',
      };

      this.logger.log({
        message: 'Order marked as OVERDUE',
        orderId,
        orderCode,
        workspaceId,
      });

      return result;
    } catch (error) {
      this.logger.error({
        message: 'Failed to process overdue check',
        orderId,
        orderCode,
        workspaceId,
        error: error instanceof Error ? error.message : 'Unknown error',
        attemptNumber,
      });

      throw error; // Re-throw để BullMQ retry với backoff
    }
  }

  private emitOverdueEvent(
    workspaceId: string,
    orderId: string,
    orderCode: string | undefined,
    timestamp: string,
  ): void {
    this.eventEmitter.emit(MKT_ORDER_EVENT_TYPES.ORDER_OVERDUE, {
      name: MKT_ORDER_EVENT_TYPES.ORDER_OVERDUE,
      workspaceId,
      events: [
        {
          eventType: MKT_ORDER_EVENT_TYPES.ORDER_OVERDUE,
          orderId,
          orderCode,
          workspaceId,
          orderData: {
            id: orderId,
            orderCode,
            status: ORDER_STATUS.OVERDUE,
            previousStatus: ORDER_STATUS.PENDING_PAYMENT,
          },
          timestamp,
        },
      ],
    });
  }
}
```

### 5.4 Repository Enhancement

**File:** `src/mkt-core/order/repositories/mkt-order.repository.ts`

Thêm method `updateWhere`:

```typescript
/**
 * Conditional update - only updates if conditions are met
 * Returns affected row count for idempotency check
 */
async updateWhere(
  workspaceId: string,
  where: Partial<MktOrderWorkspaceEntity>,
  data: Partial<MktOrderWorkspaceEntity>,
): Promise<{ affected: number }> {
  const repository = await this.getRepository(workspaceId);

  const result = await repository.update(where, data);

  return { affected: result.affected ?? 0 };
}
```

---

## 6. Integration

### 6.1 CreateOrderSaga

**File:** `src/mkt-core/order/orchestration/saga/create-order.saga.ts`

```typescript
// Inject OrderOverdueSchedulerService
constructor(
  // ... existing dependencies
  private readonly orderOverdueSchedulerService: OrderOverdueSchedulerService,
) {}

// Sau khi order được tạo thành công với status PENDING_PAYMENT
private async scheduleOverdueCheckIfNeeded(
  workspaceId: string,
  order: MktOrderWorkspaceEntity,
): Promise<void> {
  if (order.status === ORDER_STATUS.PENDING_PAYMENT) {
    await this.orderOverdueSchedulerService.scheduleOverdueCheck(
      workspaceId,
      order.id,
      order.orderCode,
    );
  }
}
```

### 6.2 ConfirmOrderSaga / PaymentService

Khi order được thanh toán hoặc huỷ, cancel delayed job:

```typescript
// In ConfirmOrderSaga hoặc PaymentService
if (newStatus !== ORDER_STATUS.PENDING_PAYMENT) {
  await this.orderOverdueSchedulerService.cancelOverdueCheck(orderId);
}
```

### 6.3 Module Registration

**File:** `src/mkt-core/order/mkt-order.module.ts`

```typescript
import { DelayedJobInfrastructureModule } from 'src/mkt-core/infrastructure/delayed-job';

@Module({
  imports: [
    // ... existing imports
    DelayedJobInfrastructureModule,
  ],
  providers: [
    // ... existing providers
    OrderOverdueSchedulerService,
    OrderOverdueWorkerService,
  ],
  exports: [
    // ... existing exports
    OrderOverdueSchedulerService,
  ],
})
export class MktOrderModule {}
```

---

## 7. Migration

### 7.1 Migration Command

**File:** `src/mkt-core/order/scripts/migrate-pending-orders.command.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { ORDER_OVERDUE_CONFIG } from 'src/mkt-core/order/constants/order-overdue.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { OrderOverdueSchedulerService } from 'src/mkt-core/order/services/core/order-overdue-scheduler.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

const BATCH_SIZE = 500;

@Command({
  name: 'migrate-pending-orders-to-delayed-jobs',
  description: 'Migrate existing PENDING_PAYMENT orders to delayed job system',
})
@Injectable()
export class MigratePendingOrdersCommand extends CommandRunner {
  private readonly logger = new Logger(MigratePendingOrdersCommand.name);

  constructor(
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly orderOverdueSchedulerService: OrderOverdueSchedulerService,
  ) {
    super();
  }

  async run(): Promise<void> {
    // Implementation here - batch process all workspaces
    this.logger.log('Migration started...');
    // ... see full implementation in code
  }
}
```

---

## 8. Observability

### 8.1 Queue Stats API

```typescript
// Get queue stats
const stats = await delayedJobService.getQueueStats(
  MKT_DELAYED_JOB_QUEUES.ORDER_OVERDUE
);

console.log(stats);
// { waiting: 0, delayed: 100, active: 2, completed: 500, failed: 3 }
```

### 8.2 Structured Logs

```json
{
  "message": "Scheduled overdue check",
  "orderId": "uuid",
  "orderCode": "ORD-001",
  "workspaceId": "ws-uuid",
  "jobId": "order-overdue:uuid",
  "delayMs": 86400000,
  "delayHours": 24
}
```

```json
{
  "message": "Order marked as OVERDUE",
  "orderId": "uuid",
  "orderCode": "ORD-001",
  "workspaceId": "ws-uuid"
}
```

---

## 9. Testing

### 9.1 Unit Tests

- [ ] `DelayedJobService.scheduleJob()` - verify delay, jobId, idempotency
- [ ] `DelayedJobService.cancelJob()` - removes job
- [ ] `OrderOverdueSchedulerService.scheduleOverdueCheck()` - calls delayedJobService
- [ ] `OrderOverdueWorkerService.processOverdueCheck()` - conditional update logic

### 9.2 Integration Tests

- [ ] Full flow: create order → wait delay → overdue
- [ ] Cancel flow: create order → pay → verify job cancelled
- [ ] Duplicate scheduling prevention (same jobId)

---

## 10. Rollout Plan

### 10.1 Giai đoạn 1: Deploy với cả 2 cơ chế (1-2 tuần)

1. Deploy delayed job system
2. Giảm cron frequency từ 30 phút xuống 6 giờ (backup)
3. Monitor metrics

### 10.2 Giai đoạn 2: Đánh giá (sau 1-2 tuần)

Tiêu chí đánh giá:
- Error rate < 0.1%
- Tất cả orders đều được xử lý đúng

### 10.3 Giai đoạn 3: Disable cron job

Khi đạt tiêu chí:
- Disable `MktOrderOverdueJob`
- Giữ code để rollback nếu cần

---

## 11. Troubleshooting

### 11.1 Job không được schedule

**Debug:**
```bash
redis-cli KEYS "bull:mkt-order-overdue-queue:*"
```

**Fix:**
- Check Redis connection
- Verify DelayedJobInfrastructureModule imported

### 11.2 Job chạy nhưng không update

**Nguyên nhân:**
- Order đã được thanh toán/huỷ (expected behavior)
- Check logs với status `skipped`

### 11.3 Job bị stuck

**Debug:**
```bash
redis-cli ZRANGE "bull:mkt-order-overdue-queue:delayed" 0 -1 WITHSCORES
```

**Fix:**
- Restart worker
- Job sẽ retry theo backoff configuration

---

## Timeline ước tính

| Phase | Nội dung | Thời gian |
|-------|----------|-----------|
| Phase 1 | Infrastructure Module | 1 giờ |
| Phase 2 | Configuration & Constants | 30 phút |
| Phase 3 | Types | 15 phút |
| Phase 4 | Services (Scheduler + Worker) | 1.5 giờ |
| Phase 5 | Repository Enhancement | 30 phút |
| Phase 6 | Integration (CreateOrder, Payment) | 1 giờ |
| Phase 7 | Migration Command | 1 giờ |
| Phase 8 | Module Registration | 15 phút |
| Testing | Unit + Integration | 2 giờ |
| **Tổng** | | **8 giờ** |

---

## Changelog

### v1.1.0 (Current)

- **BREAKING**: Sử dụng `mkt-core/infrastructure/delayed-job` thay vì sửa core engine
- Tạo `DelayedJobService` wrap BullMQ
- Tạo `OrderOverdueSchedulerService` và `OrderOverdueWorkerService`
- Không sửa đổi Twenty core engine

### v1.0.0 (Deprecated)

- Initial design - sửa đổi core engine (không áp dụng)
