# Triển Khai: Chuyển License API Calls Sang Queue Worker

## 1. Tổng Quan

### 1.1 Hiện Trạng

Hiện tại, việc tạo license được thực hiện **đồng bộ (synchronous)** trong Saga steps:

```
CreateOrderSaga
    └── Step 5: CreateLicensesStep
        └── mktLicenseProxy.createOrReuseTrial() ← HTTP call đồng bộ
            └── mktLicenseRepository.createTrial() ← Chờ response từ MKT Server
```

**Các điểm call API đồng bộ:**

| Step | Service Method | API Endpoint |
|------|----------------|--------------|
| `CreateLicensesStep` | `createOrReuseTrial()` | `POST /licenses/trial` |
| `CreateLicensesOnConfirmStep` | `upgradeTrial()` | `PATCH /licenses/{id}/upgrade` |
| `CreateLicensesOnConfirmStep` | `create()` | `POST /licenses` |
| `LicenseLifecycleListener` | `activate()` | `PATCH /licenses/{id}/activate` |
| `LicenseLifecycleListener` | `revoke()` | `PATCH /licenses/{id}/revoke` |

### 1.2 Vấn Đề

1. **Blocking Request**: HTTP call đồng bộ block toàn bộ saga, tăng response time
2. **Timeout Risk**: MKT Server chậm có thể gây timeout transaction
3. **Saga Atomicity**: Rollback không hoàn toàn nếu API call thành công nhưng bước sau fail
4. **Scalability**: Không thể xử lý burst traffic khi nhiều orders được tạo cùng lúc
5. **Error Handling**: Khó retry khi MKT Server tạm thời không khả dụng

### 1.3 Giải Pháp

Chuyển các API calls sang **async queue worker** với pattern:

```
CreateOrderSaga (fast, DB only)
    └── Step 5: EnqueueLicenseCreationStep
        └── messageQueueService.add('license-creation', jobData) ← Enqueue job
        └── Update order item status: LICENSE_PENDING

Queue Worker (background)
    └── LicenseCreationJob.process()
        └── Check idempotency (license exists?)
        └── mktLicenseProxy.createOrReuseTrial() ← HTTP call async
        └── Update order item với license info
        └── Update order item status: LICENSE_CREATED
        └── Check all items done → Update order status
```

---

## 2. Thiết Kế Chi Tiết

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYNCHRONOUS LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  GraphQL Request                                                             │
│       │                                                                      │
│       ▼                                                                      │
│  CreateOrderSaga                                                             │
│       │                                                                      │
│       ├─ Step 1-4: DB operations (fast)                                     │
│       │                                                                      │
│       ├─ Step 5: EnqueueLicenseJobsStep ──────────────────┐                │
│       │   ├─ Update order item: licenseStatus=PENDING     │                │
│       │   └─ Enqueue job với deterministic jobId          │                │
│       │                                                    │                │
│       ├─ Step 6-7: DB operations (fast)                   │                │
│       │                                                    │                │
│       └─ Return response (order status: LICENSE_PENDING)  │                │
│                                                            │                │
├────────────────────────────────────────────────────────────┼────────────────┤
│                        ASYNC LAYER (BullMQ)                │                │
├────────────────────────────────────────────────────────────┼────────────────┤
│                                                            ▼                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ MessageQueue.licenseQueue                                            │   │
│  │                                                                       │   │
│  │  JobId Format: {orderItemId}:{deviceIndex}:{action}                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ {                                                            │    │   │
│  │  │   orderId: "order-123",                                     │    │   │
│  │  │   orderItemId: "item-456",                                  │    │   │
│  │  │   action: "CREATE_TRIAL" | "CREATE_OFFICIAL",               │    │   │
│  │  │   payload: { ... }                                          │    │   │
│  │  │ }                                                            │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LicenseJobProcessor (concurrency: 5, timeout: 30s)                  │   │
│  │                                                                       │   │
│  │  @Process('license-creation')                                        │   │
│  │  async processLicenseCreation(job) {                                │   │
│  │    1. Check idempotency: license exists for this item+device?       │   │
│  │    2. If exists → skip (idempotent)                                 │   │
│  │    3. Call createOrReuseTrial() - includes dedup logic             │   │
│  │    4. Update order item with license info                           │   │
│  │    5. Update order item licenseStatus=CREATED                       │   │
│  │    6. Check all items done → update order status                    │   │
│  │  }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Business Logic Mapping

**Order Action → License Action:**

| Order Action | Order Status | License Action | Mô Tả |
|--------------|--------------|----------------|-------|
| `TRIAL_TO_PAID` | TRIAL | `CREATE_TRIAL` | Tạo trial license, customer dùng thử |
| `NEW_ORDER` | PENDING_PAYMENT | `CREATE_OFFICIAL` | Tạo official license ngay (không trial) |
| `CONFIRM_ORDER` (has trial) | PROCESSING | `UPGRADE_TRIAL` | Upgrade trial → official khi thanh toán |
| `CONFIRM_ORDER` (no trial) | PROCESSING | `CREATE_OFFICIAL` | Tạo mới official khi thanh toán |
| `ORDER_COMPLETED` | COMPLETED | `ACTIVATE` | Activate license sau khi hoàn tất |
| `ORDER_REFUNDED` | REFUNDED | `REVOKE` | Revoke license khi hoàn tiền |

### 2.3 Job Data Structures

```typescript
// File: mkt-core/license/jobs/types/license-job.types.ts

export const LICENSE_JOB_NAMES = {
  CREATION: 'mkt-license-creation',
  ACTIVATION: 'mkt-license-activation',
  REVOCATION: 'mkt-license-revocation',
  UPGRADE: 'mkt-license-upgrade',
} as const;

export type LicenseJobAction =
  | 'CREATE_TRIAL'
  | 'CREATE_OFFICIAL'
  | 'UPGRADE_TRIAL'
  | 'ACTIVATE'
  | 'REVOKE';

// Idempotency key format: {orderItemId}:{deviceIndex}:{action}
export const buildLicenseJobId = (
  orderItemId: string,
  deviceIndex: number,
  action: LicenseJobAction,
): string => `${orderItemId}:${deviceIndex}:${action}`;

export type LicenseCreationJobData = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  action: Extract<LicenseJobAction, 'CREATE_TRIAL' | 'CREATE_OFFICIAL'>;
  payload: {
    customerId: string;
    // Email được hash/mask trước khi log
    customerEmailHash: string;
    productId: string;
    productPackageId?: string;
    trialDays?: number;
    maxDevices: number;
    deviceIndex: number;
  };
  // Không cần retryCount - BullMQ tự track qua job.attemptsMade
  metadata: {
    enqueuedAt: string;
    correlationId: string;
  };
};

export type LicenseUpgradeJobData = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  action: Extract<LicenseJobAction, 'UPGRADE_TRIAL'>;
  payload: {
    licenseId: string;
    productPackageId: string;
    maxDevices: number;
    reason?: string;
  };
  metadata: {
    enqueuedAt: string;
    correlationId: string;
  };
};

// Activation/Revocation: process từng licenseId để handle partial failure
export type LicenseActivationJobData = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  licenseId: string;
  action: Extract<LicenseJobAction, 'ACTIVATE'>;
  metadata: {
    enqueuedAt: string;
    correlationId: string;
  };
};

export type LicenseRevocationJobData = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  licenseId: string;
  action: Extract<LicenseJobAction, 'REVOKE'>;
  metadata: {
    enqueuedAt: string;
    correlationId: string;
  };
};

export type LicenseJobData =
  | LicenseCreationJobData
  | LicenseUpgradeJobData
  | LicenseActivationJobData
  | LicenseRevocationJobData;
```

### 2.4 Order Item License Status

```typescript
// File: mkt-core/order/constants/license-status.constants.ts

export const LICENSE_ITEM_STATUS = {
  /** Chưa cần license (non-digital item) */
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  /** Job đã enqueue, đang chờ xử lý */
  PENDING: 'PENDING',
  /** Job đang được xử lý */
  PROCESSING: 'PROCESSING',
  /** License đã được tạo thành công */
  CREATED: 'CREATED',
  /** License đã được upgrade từ trial */
  UPGRADED: 'UPGRADED',
  /** License đã được activate */
  ACTIVATED: 'ACTIVATED',
  /** License đã bị revoke */
  REVOKED: 'REVOKED',
  /** Job failed sau max retries */
  FAILED: 'FAILED',
} as const;

export type LicenseItemStatus = typeof LICENSE_ITEM_STATUS[keyof typeof LICENSE_ITEM_STATUS];
```

### 2.5 Queue Configuration (BullMQ Native)

```typescript
// File: mkt-core/license/jobs/constants/license-queue.constants.ts

import { JobsOptions } from 'bullmq';

export const LICENSE_QUEUE_CONFIG = {
  QUEUE_NAME: 'license',

  // Worker configuration
  WORKER: {
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000, // 10 jobs per second max
    },
  },

  // BullMQ native job options
  JOB_OPTIONS: {
    CREATION: {
      attempts: 5, // BullMQ uses 'attempts' not 'retryLimit'
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s, 16s, 32s
      },
      timeout: 30000, // 30 seconds job timeout
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: false, // Keep failed jobs for debugging
    } as JobsOptions,

    UPGRADE: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      timeout: 30000,
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: false,
    } as JobsOptions,

    ACTIVATION: {
      attempts: 10, // More retries for activation
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      timeout: 15000, // 15 seconds
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: false,
    } as JobsOptions,

    REVOCATION: {
      attempts: 3,
      backoff: {
        type: 'fixed',
        delay: 5000,
      },
      timeout: 15000,
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: false,
    } as JobsOptions,
  },

  TIMEOUTS: {
    API_CALL: 25000, // 25 seconds (less than job timeout)
  },
} as const;
```

### 2.6 Job Processor với Idempotency

```typescript
// File: mkt-core/license/jobs/license-job.processor.ts

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { MessageQueue } from 'src/engine/integrations/message-queue/message-queue.constants';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories/mkt-order-item.repository';
import { MktOrderStatusService } from 'src/mkt-core/order/services/mkt-order-status.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

import {
  LICENSE_JOB_NAMES,
  LicenseCreationJobData,
  LicenseUpgradeJobData,
  LicenseActivationJobData,
  LicenseRevocationJobData,
  LicenseJobData,
} from './types/license-job.types';
import { LICENSE_QUEUE_CONFIG } from './constants/license-queue.constants';
import { LICENSE_ITEM_STATUS } from 'src/mkt-core/order/constants/license-status.constants';

@Processor(MessageQueue.licenseQueue, {
  concurrency: LICENSE_QUEUE_CONFIG.WORKER.concurrency,
  limiter: LICENSE_QUEUE_CONFIG.WORKER.limiter,
})
export class LicenseJobProcessor extends WorkerHost {
  private readonly logger = new Logger(LicenseJobProcessor.name);

  constructor(
    private readonly mktLicenseProxy: MktLicenseProxyService,
    private readonly orderItemRepository: MktOrderItemRepository,
    private readonly orderStatusService: MktOrderStatusService,
  ) {
    super();
  }

  async process(job: Job<LicenseJobData>): Promise<void> {
    const startTime = Date.now();

    try {
      switch (job.name) {
        case LICENSE_JOB_NAMES.CREATION:
          await this.processLicenseCreation(job as Job<LicenseCreationJobData>);
          break;
        case LICENSE_JOB_NAMES.UPGRADE:
          await this.processLicenseUpgrade(job as Job<LicenseUpgradeJobData>);
          break;
        case LICENSE_JOB_NAMES.ACTIVATION:
          await this.processLicenseActivation(job as Job<LicenseActivationJobData>);
          break;
        case LICENSE_JOB_NAMES.REVOCATION:
          await this.processLicenseRevocation(job as Job<LicenseRevocationJobData>);
          break;
        default:
          throw new Error(`Unknown job name: ${job.name}`);
      }

      const duration = Date.now() - startTime;
      this.logger.log({
        message: 'Job processed successfully',
        jobId: job.id,
        jobName: job.name,
        correlationId: job.data.metadata.correlationId,
        duration,
        attemptsMade: job.attemptsMade,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        message: 'Job processing failed',
        jobId: job.id,
        jobName: job.name,
        correlationId: job.data.metadata.correlationId,
        duration,
        attemptsMade: job.attemptsMade,
        error: error.message,
        // Không log stack trace với sensitive data
      });
      throw error;
    }
  }

  private async processLicenseCreation(job: Job<LicenseCreationJobData>): Promise<void> {
    const { workspaceId, orderId, orderItemId, action, payload, metadata } = job.data;

    // 1. Check idempotency: đã có license cho item+deviceIndex chưa?
    const existingLicense = await this.orderItemRepository.findLicenseByDeviceIndex(
      workspaceId,
      orderItemId,
      payload.deviceIndex,
    );

    if (existingLicense) {
      this.logger.log({
        message: 'License already exists, skipping (idempotent)',
        jobId: job.id,
        orderItemId,
        deviceIndex: payload.deviceIndex,
        existingLicenseId: existingLicense.id,
      });
      return; // Idempotent - job succeeds but no action taken
    }

    // 2. Update item status to PROCESSING
    await this.orderItemRepository.updateLicenseStatus(
      workspaceId,
      orderItemId,
      LICENSE_ITEM_STATUS.PROCESSING,
    );

    // 3. Call MKT Server API với timeout
    const licenseResponse = action === 'CREATE_TRIAL'
      ? await this.mktLicenseProxy.createOrReuseTrial({
          customerId: payload.customerId,
          productId: payload.productId,
          workspaceId,
          trialDays: payload.trialDays ?? 14,
          maxDevices: payload.maxDevices,
        })
      : await this.mktLicenseProxy.create({
          productPackageId: payload.productPackageId!,
          email: payload.customerEmailHash, // Đã được decrypt trong proxy
          maxDevices: payload.maxDevices,
        });

    // 4. Update order item with license info
    await this.orderItemRepository.addLicenseToOrderItem(
      workspaceId,
      orderItemId,
      {
        id: licenseResponse.id,
        licenseKey: licenseResponse.licenseKey,
        deviceIndex: payload.deviceIndex,
        createdAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        snapshot: {
          type: licenseResponse.type,
          productId: licenseResponse.productId,
          expiresAt: licenseResponse.expiresAt,
          maxDevices: licenseResponse.maxDevices,
        },
      },
    );

    // 5. Update item status to CREATED
    await this.orderItemRepository.updateLicenseStatus(
      workspaceId,
      orderItemId,
      LICENSE_ITEM_STATUS.CREATED,
    );

    // 6. Check if all items are done → update order status
    await this.orderStatusService.checkAndUpdateOrderLicenseStatus(workspaceId, orderId);

    this.logger.log({
      message: 'License created',
      jobId: job.id,
      licenseId: licenseResponse.id,
      orderItemId,
      deviceIndex: payload.deviceIndex,
    });
  }

  private async processLicenseUpgrade(job: Job<LicenseUpgradeJobData>): Promise<void> {
    const { workspaceId, orderId, orderItemId, payload, metadata } = job.data;

    // 1. Check idempotency: license đã được upgrade chưa?
    const currentLicense = await this.mktLicenseProxy.findById(payload.licenseId);
    if (currentLicense?.type === 'OFFICIAL') {
      this.logger.log({
        message: 'License already upgraded, skipping (idempotent)',
        jobId: job.id,
        licenseId: payload.licenseId,
      });
      return;
    }

    // 2. Update item status
    await this.orderItemRepository.updateLicenseStatus(
      workspaceId,
      orderItemId,
      LICENSE_ITEM_STATUS.PROCESSING,
    );

    // 3. Call upgrade API
    const upgradedLicense = await this.mktLicenseProxy.upgradeTrial(
      payload.licenseId,
      {
        productPackageId: payload.productPackageId,
        maxDevices: payload.maxDevices,
        reason: payload.reason,
      },
    );

    // 4. Update order item
    await this.orderItemRepository.updateLicenseInOrderItem(
      workspaceId,
      orderItemId,
      payload.licenseId,
      {
        snapshot: {
          type: upgradedLicense.type,
          productId: upgradedLicense.productId,
          expiresAt: upgradedLicense.expiresAt,
          maxDevices: upgradedLicense.maxDevices,
        },
      },
    );

    // 5. Update status
    await this.orderItemRepository.updateLicenseStatus(
      workspaceId,
      orderItemId,
      LICENSE_ITEM_STATUS.UPGRADED,
    );

    // 6. Check order status
    await this.orderStatusService.checkAndUpdateOrderLicenseStatus(workspaceId, orderId);

    this.logger.log({
      message: 'License upgraded',
      jobId: job.id,
      licenseId: payload.licenseId,
    });
  }

  private async processLicenseActivation(job: Job<LicenseActivationJobData>): Promise<void> {
    const { workspaceId, orderId, orderItemId, licenseId, metadata } = job.data;

    // 1. Check idempotency
    const license = await this.mktLicenseProxy.findById(licenseId);
    if (license?.status === 'ACTIVE') {
      this.logger.log({
        message: 'License already active, skipping (idempotent)',
        jobId: job.id,
        licenseId,
      });
      return;
    }

    // 2. Activate
    await this.mktLicenseProxy.activate(licenseId);

    // 3. Update item status
    await this.orderItemRepository.updateLicenseStatusForLicense(
      workspaceId,
      orderItemId,
      licenseId,
      LICENSE_ITEM_STATUS.ACTIVATED,
    );

    // 4. Check order status
    await this.orderStatusService.checkAndUpdateOrderLicenseStatus(workspaceId, orderId);

    this.logger.log({
      message: 'License activated',
      jobId: job.id,
      licenseId,
    });
  }

  private async processLicenseRevocation(job: Job<LicenseRevocationJobData>): Promise<void> {
    const { workspaceId, orderId, orderItemId, licenseId, metadata } = job.data;

    // 1. Check idempotency
    const license = await this.mktLicenseProxy.findById(licenseId);
    if (license?.status === 'REVOKED') {
      this.logger.log({
        message: 'License already revoked, skipping (idempotent)',
        jobId: job.id,
        licenseId,
      });
      return;
    }

    // 2. Revoke (best effort)
    try {
      await this.mktLicenseProxy.revoke(licenseId);
    } catch (error) {
      // Log but don't fail - revocation is best effort
      this.logger.warn({
        message: 'License revocation failed (best effort)',
        jobId: job.id,
        licenseId,
        error: error.message,
      });
    }

    // 3. Update item status
    await this.orderItemRepository.updateLicenseStatusForLicense(
      workspaceId,
      orderItemId,
      licenseId,
      LICENSE_ITEM_STATUS.REVOKED,
    );

    this.logger.log({
      message: 'License revocation processed',
      jobId: job.id,
      licenseId,
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<LicenseJobData>, error: Error): Promise<void> {
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);

    this.logger.error({
      message: isLastAttempt ? 'Job failed permanently (max retries reached)' : 'Job failed, will retry',
      jobId: job.id,
      jobName: job.name,
      correlationId: job.data.metadata.correlationId,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      error: error.message,
    });

    // Update order item status to FAILED if max retries reached
    if (isLastAttempt) {
      const { workspaceId, orderItemId, orderId } = job.data;

      await this.orderItemRepository.updateLicenseStatus(
        workspaceId,
        orderItemId,
        LICENSE_ITEM_STATUS.FAILED,
      );

      // Check and update order status
      await this.orderStatusService.handleLicenseJobFailed(workspaceId, orderId, orderItemId);

      // TODO: Send alert notification
    }
  }
}
```

### 2.7 License Queue Service với Idempotent JobId

```typescript
// File: mkt-core/license/services/mkt-license-queue.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

import { InjectMessageQueue } from 'src/engine/integrations/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/integrations/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/integrations/message-queue/services/message-queue.service';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

import {
  LICENSE_JOB_NAMES,
  LicenseCreationJobData,
  LicenseUpgradeJobData,
  LicenseActivationJobData,
  LicenseRevocationJobData,
  LicenseJobAction,
  buildLicenseJobId,
} from '../jobs/types/license-job.types';
import { LICENSE_QUEUE_CONFIG } from '../jobs/constants/license-queue.constants';

type EnqueueCreationParams = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  action: Extract<LicenseJobAction, 'CREATE_TRIAL' | 'CREATE_OFFICIAL'>;
  customerId: string;
  customerEmail: string;
  productId: string;
  productPackageId?: string;
  trialDays?: number;
  maxDevices: number;
  deviceIndex: number;
};

type EnqueueUpgradeParams = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  licenseId: string;
  productPackageId: string;
  maxDevices: number;
  reason?: string;
};

type EnqueueActivationParams = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  licenseId: string;
};

type EnqueueRevocationParams = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  licenseId: string;
};

@Injectable()
export class MktLicenseQueueService {
  private readonly logger = new Logger(MktLicenseQueueService.name);

  constructor(
    @InjectMessageQueue(MessageQueue.licenseQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  /**
   * Hash email for logging (không log email plaintext)
   */
  private hashEmail(email: string): string {
    return createHash('sha256').update(email).digest('hex').substring(0, 12);
  }

  /**
   * Mask email cho logging: abc***@domain.com
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const masked = local.substring(0, 3) + '***';
    return `${masked}@${domain}`;
  }

  async enqueueCreation(params: EnqueueCreationParams): Promise<string> {
    const correlationId = uuidv4();

    // Deterministic jobId để đảm bảo dedup
    const jobId = buildLicenseJobId(params.orderItemId, params.deviceIndex, params.action);

    const jobData: LicenseCreationJobData = {
      workspaceId: params.workspaceId,
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      action: params.action,
      payload: {
        customerId: params.customerId,
        customerEmailHash: this.hashEmail(params.customerEmail),
        productId: params.productId,
        productPackageId: params.productPackageId,
        trialDays: params.trialDays,
        maxDevices: params.maxDevices,
        deviceIndex: params.deviceIndex,
      },
      metadata: {
        enqueuedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        correlationId,
      },
    };

    await this.messageQueueService.add<LicenseCreationJobData>(
      LICENSE_JOB_NAMES.CREATION,
      jobData,
      {
        ...LICENSE_QUEUE_CONFIG.JOB_OPTIONS.CREATION,
        jobId, // Deterministic jobId for dedup
      },
    );

    this.logger.log({
      message: 'License creation job enqueued',
      jobId,
      correlationId,
      orderItemId: params.orderItemId,
      deviceIndex: params.deviceIndex,
      action: params.action,
      // Không log email
    });

    return correlationId;
  }

  async enqueueUpgrade(params: EnqueueUpgradeParams): Promise<string> {
    const correlationId = uuidv4();
    const jobId = buildLicenseJobId(params.orderItemId, 0, 'UPGRADE_TRIAL');

    const jobData: LicenseUpgradeJobData = {
      workspaceId: params.workspaceId,
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      action: 'UPGRADE_TRIAL',
      payload: {
        licenseId: params.licenseId,
        productPackageId: params.productPackageId,
        maxDevices: params.maxDevices,
        reason: params.reason,
      },
      metadata: {
        enqueuedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        correlationId,
      },
    };

    await this.messageQueueService.add<LicenseUpgradeJobData>(
      LICENSE_JOB_NAMES.UPGRADE,
      jobData,
      {
        ...LICENSE_QUEUE_CONFIG.JOB_OPTIONS.UPGRADE,
        jobId,
      },
    );

    this.logger.log({
      message: 'License upgrade job enqueued',
      jobId,
      correlationId,
      licenseId: params.licenseId,
    });

    return correlationId;
  }

  /**
   * Enqueue activation cho từng licenseId (không batch)
   * để handle partial failure đúng cách
   */
  async enqueueActivation(params: EnqueueActivationParams): Promise<string> {
    const correlationId = uuidv4();
    const jobId = `${params.orderItemId}:${params.licenseId}:ACTIVATE`;

    const jobData: LicenseActivationJobData = {
      workspaceId: params.workspaceId,
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      licenseId: params.licenseId,
      action: 'ACTIVATE',
      metadata: {
        enqueuedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        correlationId,
      },
    };

    await this.messageQueueService.add<LicenseActivationJobData>(
      LICENSE_JOB_NAMES.ACTIVATION,
      jobData,
      {
        ...LICENSE_QUEUE_CONFIG.JOB_OPTIONS.ACTIVATION,
        jobId,
      },
    );

    this.logger.log({
      message: 'License activation job enqueued',
      jobId,
      correlationId,
      licenseId: params.licenseId,
    });

    return correlationId;
  }

  async enqueueRevocation(params: EnqueueRevocationParams): Promise<string> {
    const correlationId = uuidv4();
    const jobId = `${params.orderItemId}:${params.licenseId}:REVOKE`;

    const jobData: LicenseRevocationJobData = {
      workspaceId: params.workspaceId,
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      licenseId: params.licenseId,
      action: 'REVOKE',
      metadata: {
        enqueuedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        correlationId,
      },
    };

    await this.messageQueueService.add<LicenseRevocationJobData>(
      LICENSE_JOB_NAMES.REVOCATION,
      jobData,
      {
        ...LICENSE_QUEUE_CONFIG.JOB_OPTIONS.REVOCATION,
        jobId,
      },
    );

    this.logger.log({
      message: 'License revocation job enqueued',
      jobId,
      correlationId,
      licenseId: params.licenseId,
    });

    return correlationId;
  }

  /**
   * Bulk enqueue với individual jobs (không batch để handle partial failure)
   */
  async enqueueBulkCreation(items: EnqueueCreationParams[]): Promise<string[]> {
    const correlationIds: string[] = [];

    for (const item of items) {
      const correlationId = await this.enqueueCreation(item);
      correlationIds.push(correlationId);
    }

    this.logger.log({
      message: 'Bulk license creation jobs enqueued',
      count: items.length,
      correlationIds,
    });

    return correlationIds;
  }

  /**
   * Bulk activation - enqueue từng license riêng biệt
   */
  async enqueueBulkActivation(
    workspaceId: string,
    orderId: string,
    licenses: Array<{ orderItemId: string; licenseId: string }>,
  ): Promise<string[]> {
    const correlationIds: string[] = [];

    for (const license of licenses) {
      const correlationId = await this.enqueueActivation({
        workspaceId,
        orderId,
        orderItemId: license.orderItemId,
        licenseId: license.licenseId,
      });
      correlationIds.push(correlationId);
    }

    return correlationIds;
  }

  /**
   * Cancel pending jobs cho một order (compensation)
   */
  async cancelJobsForOrder(orderId: string): Promise<number> {
    // BullMQ: Get jobs by pattern và remove
    // Implementation depends on BullMQ version
    // TODO: Implement job cancellation
    this.logger.warn({
      message: 'Job cancellation not yet implemented',
      orderId,
    });
    return 0;
  }
}
```

### 2.8 Order Status Service

```typescript
// File: mkt-core/order/services/mkt-order-status.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MktOrderRepository } from '../repositories/mkt-order.repository';
import { MktOrderItemRepository } from '../repositories/mkt-order-item.repository';
import { LICENSE_ITEM_STATUS } from '../constants/license-status.constants';
import { ORDER_STATUS } from '../constants/order.constants';

@Injectable()
export class MktOrderStatusService {
  private readonly logger = new Logger(MktOrderStatusService.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderItemRepository: MktOrderItemRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check và update order status dựa trên license status của các items
   */
  async checkAndUpdateOrderLicenseStatus(
    workspaceId: string,
    orderId: string,
  ): Promise<void> {
    const items = await this.orderItemRepository.findByOrderId(workspaceId, orderId);

    // Filter items cần license
    const licensableItems = items.filter(
      (item) => item.licenseStatus !== LICENSE_ITEM_STATUS.NOT_APPLICABLE,
    );

    if (licensableItems.length === 0) {
      return;
    }

    // Check status
    const allCreated = licensableItems.every(
      (item) => item.licenseStatus === LICENSE_ITEM_STATUS.CREATED ||
                item.licenseStatus === LICENSE_ITEM_STATUS.UPGRADED ||
                item.licenseStatus === LICENSE_ITEM_STATUS.ACTIVATED,
    );

    const anyFailed = licensableItems.some(
      (item) => item.licenseStatus === LICENSE_ITEM_STATUS.FAILED,
    );

    const allActivated = licensableItems.every(
      (item) => item.licenseStatus === LICENSE_ITEM_STATUS.ACTIVATED,
    );

    const order = await this.orderRepository.findById(workspaceId, orderId);
    if (!order) {
      return;
    }

    // Update order status based on license status
    if (anyFailed) {
      await this.orderRepository.updateStatus(
        workspaceId,
        orderId,
        ORDER_STATUS.LICENSE_FAILED,
      );
      this.eventEmitter.emit('order.license.failed', { workspaceId, orderId });
    } else if (allActivated && order.status === ORDER_STATUS.PROCESSING) {
      await this.orderRepository.updateStatus(
        workspaceId,
        orderId,
        ORDER_STATUS.COMPLETED,
      );
      this.eventEmitter.emit('order.completed', { workspaceId, orderId });
    } else if (allCreated && order.status === ORDER_STATUS.LICENSE_PENDING) {
      await this.orderRepository.updateStatus(
        workspaceId,
        orderId,
        ORDER_STATUS.PROCESSING,
      );
      this.eventEmitter.emit('order.licenses.created', { workspaceId, orderId });
    }

    this.logger.log({
      message: 'Order license status checked',
      orderId,
      currentStatus: order.status,
      allCreated,
      anyFailed,
      allActivated,
    });
  }

  /**
   * Handle when a license job fails permanently
   */
  async handleLicenseJobFailed(
    workspaceId: string,
    orderId: string,
    orderItemId: string,
  ): Promise<void> {
    // Update order to LICENSE_FAILED status
    await this.orderRepository.updateStatus(
      workspaceId,
      orderId,
      ORDER_STATUS.LICENSE_FAILED,
    );

    this.eventEmitter.emit('order.license.failed', {
      workspaceId,
      orderId,
      orderItemId,
    });

    this.logger.error({
      message: 'Order marked as LICENSE_FAILED',
      orderId,
      orderItemId,
    });
  }
}
```

### 2.9 Modified Saga Step với Compensation

```typescript
// File: mkt-core/order/orchestration/steps/enqueue-license-jobs.step.ts

import { Injectable, Logger } from '@nestjs/common';
import _ from 'lodash';

import { BaseSagaStep } from '../saga/base/base-saga-step';
import { CreateOrderSagaContext } from '../saga/types/create-order-saga.types';
import { MktLicenseQueueService } from 'src/mkt-core/license/services/mkt-license-queue.service';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories/mkt-order-item.repository';
import { ORDER_ACTION, ORDER_ITEM_TYPE } from 'src/mkt-core/order/constants/order.constants';
import { LICENSE_ITEM_STATUS } from 'src/mkt-core/order/constants/license-status.constants';

@Injectable()
export class EnqueueLicenseJobsStep extends BaseSagaStep<CreateOrderSagaContext> {
  readonly stepName = 'EnqueueLicenseJobsStep';
  private readonly logger = new Logger(EnqueueLicenseJobsStep.name);

  constructor(
    private readonly licenseQueueService: MktLicenseQueueService,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {
    super();
  }

  shouldSkip(context: CreateOrderSagaContext): boolean {
    if (context.input.isDraft) {
      return true;
    }

    const licensableActions = [ORDER_ACTION.TRIAL_TO_PAID, ORDER_ACTION.NEW_ORDER];
    return !licensableActions.includes(context.input.action);
  }

  async execute(context: CreateOrderSagaContext): Promise<void> {
    const { workspaceId, order, orderItems, input } = context;

    // Filter items that need licenses
    const licensableItems = orderItems.filter(
      (item) =>
        item.type === ORDER_ITEM_TYPE.DIGITAL_EXTERNAL &&
        item.productPackageId,
    );

    if (licensableItems.length === 0) {
      this.logger.log('No licensable items found, skipping');
      return;
    }

    // Determine license action based on order action
    const licenseAction = input.action === ORDER_ACTION.TRIAL_TO_PAID
      ? 'CREATE_TRIAL'
      : 'CREATE_OFFICIAL';

    // Get customer email
    const customerEmail = await this.getCustomerEmail(context);

    // Update all licensable items to PENDING status
    await Promise.all(
      licensableItems.map((item) =>
        this.orderItemRepository.updateLicenseStatus(
          workspaceId,
          item.id,
          LICENSE_ITEM_STATUS.PENDING,
        ),
      ),
    );

    // Enqueue jobs for each item + device
    const enqueueParams = licensableItems.flatMap((item) => {
      const maxDevices = item.maxDevices ?? 1;
      return _.range(maxDevices).map((deviceIndex) => ({
        workspaceId,
        orderId: order.id,
        orderItemId: item.id,
        action: licenseAction as 'CREATE_TRIAL' | 'CREATE_OFFICIAL',
        customerId: input.customerId,
        customerEmail,
        productId: item.productId,
        productPackageId: item.productPackageId,
        trialDays: input.trialDays,
        maxDevices,
        deviceIndex,
      }));
    });

    const correlationIds = await this.licenseQueueService.enqueueBulkCreation(enqueueParams);

    // Store in context for potential compensation
    context.licenseJobCorrelationIds = correlationIds;
    context.enqueuedJobCount = enqueueParams.length;

    this.logger.log({
      message: 'License jobs enqueued',
      orderId: order.id,
      jobCount: correlationIds.length,
      action: licenseAction,
    });
  }

  async compensate(context: CreateOrderSagaContext): Promise<void> {
    const { workspaceId, order, orderItems } = context;

    this.logger.log({
      message: 'Compensating: Cancelling pending license jobs',
      orderId: order?.id,
    });

    // 1. Cancel any pending jobs in queue
    if (order?.id) {
      const cancelledCount = await this.licenseQueueService.cancelJobsForOrder(order.id);
      this.logger.log({
        message: 'Cancelled pending jobs',
        orderId: order.id,
        cancelledCount,
      });
    }

    // 2. Reset item license status to NOT_APPLICABLE
    const licensableItems = orderItems?.filter(
      (item) => item.type === ORDER_ITEM_TYPE.DIGITAL_EXTERNAL && item.productPackageId,
    ) ?? [];

    await Promise.all(
      licensableItems.map((item) =>
        this.orderItemRepository.updateLicenseStatus(
          workspaceId,
          item.id,
          LICENSE_ITEM_STATUS.NOT_APPLICABLE,
        ),
      ),
    );

    // Note: Licenses that were already created on MKT Server
    // will be orphaned. This is acceptable as:
    // - They won't be activated (no order completed)
    // - They can be cleaned up by a separate job
    // - MKT Server có thể có TTL cho unactivated licenses
  }

  private async getCustomerEmail(context: CreateOrderSagaContext): Promise<string> {
    // Get email from customer's linked accounts
    return context.customerEmail ?? '';
  }
}
```

---

## 3. Thay Đổi Cần Thiết

### 3.1 Files Cần Tạo Mới

| File | Mô Tả |
|------|-------|
| `mkt-core/license/jobs/types/license-job.types.ts` | Type definitions, buildLicenseJobId |
| `mkt-core/license/jobs/constants/license-queue.constants.ts` | BullMQ native config |
| `mkt-core/license/jobs/license-job.processor.ts` | Processor với idempotency |
| `mkt-core/license/services/mkt-license-queue.service.ts` | Queue service với deterministic jobId |
| `mkt-core/order/constants/license-status.constants.ts` | LICENSE_ITEM_STATUS enum |
| `mkt-core/order/services/mkt-order-status.service.ts` | Order status management |
| `mkt-core/order/orchestration/steps/enqueue-license-jobs.step.ts` | New saga step |

### 3.2 Files Cần Sửa Đổi

| File | Thay Đổi |
|------|----------|
| `mkt-core/mkt-core.module.ts` | Import new services & processor |
| `mkt-core/order/orchestration/saga/create-order.saga.ts` | Replace CreateLicensesStep |
| `mkt-core/order/orchestration/saga/confirm-order.saga.ts` | Replace with enqueue logic |
| `mkt-core/order/listeners/license-lifecycle.listener.ts` | Use queue service |
| `engine/integrations/message-queue/message-queue.constants.ts` | Add licenseQueue |
| `mkt-core/order/repositories/mkt-order-item.repository.ts` | Add new methods |
| `mkt-core/order/constants/order.constants.ts` | Add LICENSE_PENDING, LICENSE_FAILED status |

### 3.3 Order Status Flow Updates

```
                      ┌──────────────────────────────────────────────────┐
                      │              SUCCESS PATH                        │
                      └──────────────────────────────────────────────────┘

DRAFT ─► PENDING_PAYMENT ─► LICENSE_PENDING ─► PROCESSING ─► COMPLETED
              │                    │               │             │
        (job enqueued)    (all licenses      (licenses     (licenses
                           created)         activated)    activated)

                      ┌──────────────────────────────────────────────────┐
                      │              FAILURE PATH                        │
                      └──────────────────────────────────────────────────┘

               LICENSE_PENDING ─────► LICENSE_FAILED
                      │                    │
               (job failed after     (manual intervention
                max retries)          required)
```

### 3.4 Database Changes

```sql
-- Add licenseStatus column to order items
ALTER TABLE mkt_order_item
ADD COLUMN license_status VARCHAR(20) DEFAULT 'NOT_APPLICABLE';

-- Add new order statuses
-- (Update ORDER_STATUS enum in code)
```

---

## 4. Error Handling & Retry Strategy

### 4.1 BullMQ Native Configuration

| Job Type | Attempts | Backoff | Timeout | Notes |
|----------|----------|---------|---------|-------|
| Creation | 5 | Exponential 2s | 30s | Idempotent via jobId |
| Upgrade | 5 | Exponential 2s | 30s | Check license type before upgrade |
| Activation | 10 | Exponential 1s | 15s | Per-license job |
| Revocation | 3 | Fixed 5s | 15s | Best effort |

### 4.2 Idempotency Strategy

```typescript
// 1. Deterministic JobId - BullMQ auto-dedup
const jobId = `${orderItemId}:${deviceIndex}:${action}`;
// Same jobId = job not re-added if exists

// 2. Processor-level check
const existing = await repository.findLicenseByDeviceIndex(...);
if (existing) return; // Idempotent skip

// 3. MKT Server API level
createOrReuseTrial() // Already includes dedup logic
```

### 4.3 Partial Failure Handling

```typescript
// KHÔNG batch activation/revocation
// Thay vì:
enqueueActivation({ licenseIds: ['a', 'b', 'c'] }) // ❌ Batch fail = all fail

// SỬ DỤNG:
enqueueActivation({ licenseId: 'a' }) // ✅ Individual retry
enqueueActivation({ licenseId: 'b' })
enqueueActivation({ licenseId: 'c' })
```

### 4.4 Failed Job Handling

```
Job fails after max attempts
    │
    ├─► Update order item: licenseStatus = FAILED
    │
    ├─► Update order: status = LICENSE_FAILED
    │
    ├─► Emit event: order.license.failed
    │
    └─► Send alert (if configured)

Manual intervention:
    ├─► Admin reviews failed jobs in BullMQ dashboard
    ├─► Fix underlying issue
    └─► Retry job manually OR create new order
```

---

## 5. Monitoring & Observability

### 5.1 SLO Definition

| Metric | SLO | Alerting Threshold |
|--------|-----|-------------------|
| Job Success Rate | ≥ 99% | < 95% (Critical), < 99% (Warning) |
| P95 Processing Time | ≤ 5s | > 10s (Warning), > 30s (Critical) |
| Queue Depth | ≤ 500 | > 1000 (Warning), > 5000 (Critical) |
| Time to First Process | ≤ 30s | > 60s (Warning), > 300s (Critical) |

### 5.2 Prometheus Metrics

```typescript
// Counter metrics
license_jobs_total{action, status}        // Total jobs processed
license_jobs_enqueued_total{action}       // Total jobs enqueued
license_jobs_retried_total{action}        // Total retries

// Histogram metrics
license_job_duration_seconds{action}      // Processing time distribution
license_job_queue_time_seconds{action}    // Time in queue before processing

// Gauge metrics
license_queue_depth{queue}                // Current queue size
license_jobs_processing{queue}            // Currently processing jobs
```

### 5.3 Structured Logging (No Sensitive Data)

```typescript
// ✅ GOOD - Không log email, chỉ log hash
this.logger.log({
  message: 'License created',
  jobId: job.id,
  correlationId: metadata.correlationId,
  orderItemId,
  deviceIndex,
  licenseId: response.id,
  duration: endTime - startTime,
  attemptsMade: job.attemptsMade,
});

// ❌ BAD - Log sensitive data
this.logger.log({
  message: 'License created',
  customerEmail: 'user@example.com', // NEVER log this
  ...
});
```

### 5.4 Alert Rules

```yaml
# Prometheus AlertManager rules
groups:
  - name: license-queue
    rules:
      - alert: LicenseJobFailureRateHigh
        expr: |
          (
            sum(rate(license_jobs_total{status="failed"}[5m]))
            /
            sum(rate(license_jobs_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "License job failure rate > 5%"

      - alert: LicenseQueueDepthHigh
        expr: license_queue_depth > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "License queue depth > 1000"

      - alert: LicenseJobProcessingTimeHigh
        expr: |
          histogram_quantile(0.95,
            rate(license_job_duration_seconds_bucket[5m])
          ) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 license job processing time > 10s"
```

---

## 6. Migration Plan

### Phase 1: Infrastructure (1-2 ngày)
- [ ] Create type definitions với idempotency support
- [ ] Create BullMQ native queue config
- [ ] Add LICENSE_ITEM_STATUS constants
- [ ] Add new order statuses (LICENSE_PENDING, LICENSE_FAILED)
- [ ] Database migration for license_status column
- [ ] Unit tests for types & constants

### Phase 2: Core Implementation (2-3 ngày)
- [ ] Implement LicenseJobProcessor với idempotency
- [ ] Implement MktLicenseQueueService với deterministic jobId
- [ ] Implement MktOrderStatusService
- [ ] Update MktOrderItemRepository với new methods
- [ ] Unit tests (coverage > 80%)

### Phase 3: Integration (2-3 ngày)
- [ ] Create EnqueueLicenseJobsStep
- [ ] Modify CreateOrderSaga
- [ ] Modify ConfirmOrderSaga
- [ ] Modify LicenseLifecycleListener
- [ ] Integration tests

### Phase 4: Feature Flag & Staging (2-3 ngày)
- [ ] Implement feature flag `USE_ASYNC_LICENSE_CREATION`
- [ ] Deploy to staging với flag = false
- [ ] Enable flag, test all scenarios:
  - [ ] TRIAL_TO_PAID → CREATE_TRIAL
  - [ ] NEW_ORDER → CREATE_OFFICIAL
  - [ ] CONFIRM_ORDER → UPGRADE_TRIAL / CREATE_OFFICIAL
  - [ ] ORDER_COMPLETED → ACTIVATE
  - [ ] ORDER_REFUNDED → REVOKE
  - [ ] Idempotency (retry same job)
  - [ ] Partial failure handling
  - [ ] Saga compensation

### Phase 5: Production Rollout (1-2 ngày)
- [ ] Setup monitoring dashboards
- [ ] Configure alerts
- [ ] Deploy với flag = false
- [ ] Enable flag 10% → 50% → 100%
- [ ] Monitor SLOs
- [ ] Remove feature flag

---

## 7. Rollback Plan

### Immediate Rollback (< 5 minutes)
1. Disable feature flag `USE_ASYNC_LICENSE_CREATION`
2. System auto-fallback to sync flow
3. Pending jobs remain in queue (orphaned but harmless)

### Post-Rollback Cleanup
1. Drain or delete orphaned jobs
2. Review orders in LICENSE_PENDING status
3. Manual process if needed

### Full Rollback (if needed)
1. Revert code changes
2. Run DB migration rollback
3. Clear Redis queue data

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
describe('LicenseJobProcessor', () => {
  describe('idempotency', () => {
    it('should skip if license already exists for item+device', async () => {});
    it('should skip if license already upgraded', async () => {});
    it('should skip if license already activated', async () => {});
  });

  describe('error handling', () => {
    it('should update item status to FAILED on max retries', async () => {});
    it('should not log sensitive data', async () => {});
  });
});

describe('MktLicenseQueueService', () => {
  describe('jobId', () => {
    it('should generate deterministic jobId', () => {});
    it('should not re-add job with same jobId', async () => {});
  });
});
```

### 8.2 Integration Tests

```typescript
describe('Async License Creation E2E', () => {
  it('should create order and enqueue license jobs', async () => {});
  it('should update order status when all licenses created', async () => {});
  it('should handle partial license creation failure', async () => {});
  it('should be idempotent on retry', async () => {});
});
```

### 8.3 Load Tests

```yaml
# Artillery load test config
scenarios:
  - name: "Create orders with licenses"
    flow:
      - post:
          url: "/graphql"
          json:
            query: "mutation CreateOrder..."

config:
  phases:
    - duration: 60
      arrivalRate: 10  # 10 orders/second
    - duration: 120
      arrivalRate: 50  # 50 orders/second (peak)
```

---

## 9. Checklist

### Pre-Implementation
- [ ] Architecture review approved
- [ ] Security review (no sensitive data in logs)
- [ ] SLO/alerting thresholds agreed

### Implementation
- [ ] All unit tests pass (coverage > 80%)
- [ ] All integration tests pass
- [ ] Load tests completed
- [ ] No sensitive data in logs verified

### Pre-Production
- [ ] Monitoring dashboards created
- [ ] Alerts configured
- [ ] Runbook created
- [ ] Feature flag configured
- [ ] Rollback procedure documented
- [ ] On-call notified

### Post-Production
- [ ] Monitor SLOs for 48 hours
- [ ] Remove feature flag
- [ ] Document lessons learned

---

## 10. Appendix

### A. Environment Variables

```bash
# Feature flags
USE_ASYNC_LICENSE_CREATION=true

# Queue configuration
LICENSE_QUEUE_CONCURRENCY=5
LICENSE_QUEUE_RATE_LIMIT_MAX=10
LICENSE_QUEUE_RATE_LIMIT_DURATION=1000

# Timeouts
LICENSE_JOB_TIMEOUT=30000
LICENSE_API_TIMEOUT=25000

# Retry
LICENSE_JOB_CREATION_ATTEMPTS=5
LICENSE_JOB_ACTIVATION_ATTEMPTS=10
LICENSE_JOB_REVOCATION_ATTEMPTS=3
```

### B. BullMQ Dashboard

Sử dụng [Bull Board](https://github.com/felixmosh/bull-board) để monitor queue:

```typescript
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullBoardModule.forFeature({
      name: MessageQueue.licenseQueue,
      adapter: BullMQAdapter,
    }),
  ],
})
```

### C. References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [BullMQ Job Options](https://docs.bullmq.io/guide/jobs/options)
- [NestJS Queue](https://docs.nestjs.com/techniques/queues)
- Twenty CRM Queue Pattern: `packages/twenty-server/src/engine/integrations/message-queue/`
