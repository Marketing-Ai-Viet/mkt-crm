# Twenty CRM Worker - Tổng quan & Hướng dẫn triển khai

> Tài liệu chi tiết về hệ thống Worker của Twenty CRM, bao gồm kiến trúc, cấu hình và hướng dẫn triển khai.

## Mục lục

- [1. Tổng quan Worker](#1-tổng-quan-worker)
- [2. Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
- [3. Message Queue System](#3-message-queue-system)
- [4. Job Processor Pattern](#4-job-processor-pattern)
- [5. Cron Jobs](#5-cron-jobs)
- [6. Delayed Jobs (mkt-core)](#6-delayed-jobs-mkt-core)
- [7. Hướng dẫn triển khai](#7-hướng-dẫn-triển-khai)
- [8. Monitoring & Health Check](#8-monitoring--health-check)
- [9. Troubleshooting](#9-troubleshooting)
- [10. Best Practices](#10-best-practices)

---

## 1. Tổng quan Worker

### 1.1 Worker là gì?

Worker là một **background job processor** chạy độc lập với API server, xử lý các tác vụ bất đồng bộ thông qua **BullMQ** (Redis-based queue system).

### 1.2 Tại sao cần Worker?

| Lợi ích | Mô tả |
|---------|-------|
| **Performance** | Tách biệt heavy tasks khỏi API response |
| **Scalability** | Scale workers độc lập với API servers |
| **Reliability** | Retry mechanism cho failed jobs |
| **Isolation** | Worker crash không ảnh hưởng API |
| **Persistence** | Jobs được lưu trong Redis, không mất khi restart |

### 1.3 Các loại tác vụ Worker xử lý

```
┌─────────────────────────────────────────────────────────────┐
│                    Worker Task Types                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📧 EMAIL SENDING          │  🔄 DATA SYNCHRONIZATION        │
│  ─────────────────         │  ────────────────────────       │
│  • Password reset          │  • Calendar sync                │
│  • Invitation emails       │  • Contact import               │
│  • Order notifications     │  • Product sync (MKT Server)    │
│                            │                                  │
│  🔔 WEBHOOKS               │  💰 BILLING & PAYMENTS          │
│  ─────────────────         │  ────────────────────────       │
│  • Event delivery          │  • Invoice generation           │
│  • External integrations   │  • Payment processing           │
│                            │  • Overdue scanning             │
│                            │                                  │
│  ⏰ SCHEDULED TASKS        │  🔧 MAINTENANCE                 │
│  ─────────────────         │  ────────────────────────       │
│  • Cron jobs               │  • Data cleanup                 │
│  • Periodic syncs          │  • Cache warming                │
│  • Expiration checks       │  • RBAC policy reload           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Thống kê

| Metric | Giá trị |
|--------|---------|
| Message Queues | 14 specialized queues |
| Queue Drivers | 3 (BullMQ, PgBoss, Sync) |
| mkt-core Jobs | 14 jobs |
| Delayed Job Queues | 2 (Payment Reminder, Deadline) |

---

## 2. Kiến trúc hệ thống

### 2.1 Tổng quan Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Twenty CRM Architecture                           │
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

### 2.2 Entry Points

| Service | Command | File | Port |
|---------|---------|------|------|
| **Server** | `node dist/src/main` | `src/main.ts` | 3003 |
| **Worker** | `node dist/src/queue-worker/main` | `src/queue-worker/queue-worker.ts` | - |

### 2.3 Worker Bootstrap

```typescript
// File: src/queue-worker/queue-worker.ts
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(QueueWorkerModule, {
    bufferLogs: process.env.LOGGER_IS_BUFFER_ENABLED === 'true',
  });

  loggerService = app.get(LoggerService);
  exceptionHandlerService = app.get(ExceptionHandlerService);
  app.useLogger(loggerService);
}

bootstrap();
```

**Đặc điểm:**
- `createApplicationContext` - không tạo HTTP server, chỉ NestJS context
- Buffer logs nếu cần
- Global exception handler (Sentry integration)
- Graceful error handling

### 2.4 Worker Module

```typescript
// File: src/queue-worker/queue-worker.module.ts
@Module({
  imports: [
    CoreEngineModule,              // Core infrastructure
    MessageQueueModule.registerExplorer(),  // Job processor discovery
    WorkspaceEventEmitterModule,
    JobsModule,                    // All job processors
    TwentyORMModule,
  ],
})
export class QueueWorkerModule {}
```

---

## 3. Message Queue System

### 3.1 Danh sách Message Queues

```typescript
// File: src/engine/core-modules/message-queue/message-queue.constants.ts
export enum MessageQueue {
  taskAssignedQueue = 'task-assigned-queue',
  messagingQueue = 'messaging-queue',
  webhookQueue = 'webhook-queue',
  cronQueue = 'cron-queue',
  emailQueue = 'email-queue',
  calendarQueue = 'calendar-queue',
  contactCreationQueue = 'contact-creation-queue',
  billingQueue = 'billing-queue',
  workspaceQueue = 'workspace-queue',
  entityEventsToDbQueue = 'entity-events-to-db-queue',
  workflowQueue = 'workflow-queue',
  deleteCascadeQueue = 'delete-cascade-queue',
  subscriptionsQueue = 'subscriptions-queue',
  customerQueue = 'customer-queue',
}
```

### 3.2 Queue Purposes

| Queue | Mục đích |
|-------|----------|
| `cronQueue` | Scheduled tasks (cron jobs) |
| `emailQueue` | Email sending |
| `webhookQueue` | Webhook delivery |
| `billingQueue` | Invoice, payment processing |
| `customerQueue` | Customer tier updates |
| `workflowQueue` | Workflow execution |
| `calendarQueue` | Calendar sync |
| `messagingQueue` | Messaging integrations |
| `workspaceQueue` | Workspace operations |
| `deleteCascadeQueue` | Cascade delete operations |
| `subscriptionsQueue` | Subscription management |

### 3.3 Queue Drivers

| Driver | Use Case | Configuration |
|--------|----------|---------------|
| **BullMQ** | Production (PRIMARY) | Requires Redis |
| **PgBoss** | Alternative | Uses PostgreSQL |
| **Sync** | Testing | Synchronous execution |

### 3.4 BullMQ Driver Implementation

```typescript
// File: src/engine/core-modules/message-queue/drivers/bullmq.driver.ts
export class BullMQDriver implements MessageQueueDriver {
  private queueMap: Record<MessageQueue, Queue> = {};
  private workerMap: Record<MessageQueue, Worker> = {};

  // Register queue
  register(queueName: MessageQueue): void {
    this.queueMap[queueName] = new Queue(queueName, this.options);
  }

  // Add job to queue
  async add<T>(
    queueName: MessageQueue,
    jobName: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<void> {
    // Idempotency check
    if (options?.id) {
      const waitingJobs = await this.queueMap[queueName].getJobs(['waiting']);
      const isJobAlreadyWaiting = waitingJobs.some(
        (job) => job.id?.startsWith(options.id),
      );
      if (isJobAlreadyWaiting) return;
    }

    const jobOptions: JobsOptions = {
      jobId: options?.id ? `${options.id}-${v4()}` : undefined,
      priority: options?.priority,
      attempts: 1 + (options?.retryLimit || 0),
      removeOnComplete: true,
      removeOnFail: 100,
    };

    await this.queueMap[queueName].add(jobName, data, jobOptions);
  }

  // Register worker
  async work<T>(
    queueName: MessageQueue,
    handler: (job: MessageQueueJob<T>) => Promise<void>,
    options?: MessageQueueWorkerOptions,
  ) {
    this.workerMap[queueName] = new Worker(
      queueName,
      async (job) => {
        await handler({ data: job.data, id: job.id ?? '', name: job.name });
      },
      {
        ...this.options,
        concurrency: options?.concurrency,
      },
    );
  }
}
```

**Key Features:**
- **Idempotency:** Prevent duplicate jobs with same `option.id`
- **Retry:** `attempts = 1 + retryLimit`
- **Cleanup:** `removeOnComplete: true`, `removeOnFail: 100`
- **Metrics:** Weekly collection, 60s intervals

### 3.5 Redis Configuration

```typescript
// File: src/engine/core-modules/redis-client/redis-client.service.ts
@Injectable()
export class RedisClientService {
  private redisClient: IORedis | null = null;

  getClient() {
    if (!this.redisClient) {
      const redisUrl = this.twentyConfigService.get('REDIS_URL');

      this.redisClient = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,  // Critical for BullMQ
      });
    }
    return this.redisClient;
  }
}
```

**Lưu ý:** `maxRetriesPerRequest: null` là **bắt buộc** cho BullMQ.

---

## 4. Job Processor Pattern

### 4.1 Decorators

| Decorator | Mục đích | Target |
|-----------|----------|--------|
| `@Processor(queue)` | Đăng ký class là job processor | Class |
| `@Process(jobName)` | Đăng ký method xử lý job | Method |
| `@InjectMessageQueue(queue)` | Inject queue service | Constructor param |

### 4.2 Basic Job Processor

```typescript
// File: src/engine/core-modules/email/email-sender.job.ts
@Processor(MessageQueue.emailQueue)
export class EmailSenderJob {
  constructor(private readonly emailSenderService: EmailSenderService) {}

  @Process(EmailSenderJob.name)
  async handle(data: SendMailOptions): Promise<void> {
    await this.emailSenderService.send(data);
  }
}
```

### 4.3 Request-Scoped Job Processor

```typescript
// File: src/modules/workflow/workflow-runner/jobs/run-workflow.job.ts
@Processor({
  queueName: MessageQueue.workflowQueue,
  scope: Scope.REQUEST  // Request-scoped dependencies
})
export class RunWorkflowJob {
  constructor(
    private readonly workflowService: WorkflowWorkspaceService,
  ) {}

  @Process(RunWorkflowJob.name)
  async handle({
    workflowRunId,
    workspaceId,
  }: RunWorkflowJobData): Promise<void> {
    try {
      await this.startWorkflowExecution({ workflowRunId, workspaceId });
    } catch (error) {
      await this.handleFailure({ workflowRunId, error });
    }
  }
}
```

### 4.4 Enqueue Job

```typescript
@Injectable()
export class MyService {
  constructor(
    @InjectMessageQueue(MessageQueue.emailQueue)
    private readonly emailQueue: MessageQueueService,
  ) {}

  async sendEmail(to: string, subject: string) {
    await this.emailQueue.add(
      EmailSenderJob.name,
      { to, subject, html: '<p>Content</p>' },
      {
        retryLimit: 3,
        priority: 1,
      },
    );
  }
}
```

### 4.5 Job Discovery Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Job Discovery Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Worker starts                                            │
│       │                                                      │
│       ▼                                                      │
│  2. QueueWorkerModule imports MessageQueueModule             │
│       │                                                      │
│       ▼                                                      │
│  3. MessageQueueExplorer.onModuleInit()                      │
│       │                                                      │
│       ├──▶ Scan all @Processor classes                       │
│       │                                                      │
│       ├──▶ Group by queueName                                │
│       │                                                      │
│       └──▶ Register workers for each queue                   │
│              │                                               │
│              ▼                                               │
│  4. Worker listens for jobs                                  │
│       │                                                      │
│       ▼                                                      │
│  5. Job arrives → Match @Process method → Execute            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Cron Jobs

### 5.1 Cấu trúc Cron Job

```typescript
// File: src/mkt-core/order/jobs/payment-overdue-scan.job.ts
@Processor(MessageQueue.cronQueue)
@Injectable()
export class PaymentOverdueScanJob {
  private readonly logger = new Logger(PaymentOverdueScanJob.name);

  constructor(
    private readonly scanService: PaymentOverdueScanService,
  ) {}

  @Process(PaymentOverdueScanJob.name)
  @SentryCronMonitor(
    PaymentOverdueScanJob.name,
    PAYMENT_OVERDUE_SCAN_CONFIG.CRON_PATTERN,
  )
  async handle(data: PaymentOverdueScanJobData): Promise<void> {
    const { workspaceId } = data;

    try {
      const result = await this.scanService.scanAndLockOverdueOrders(workspaceId);
      this.logger.log(`Scan completed: ${result.successCount} locked`);
    } catch (error) {
      this.logger.error(`Scan failed`, error);
      throw error;  // Propagate for retry
    }
  }
}
```

### 5.2 Register Cron Job

```typescript
// Using MessageQueueService
await this.cronQueue.addCron({
  jobName: PaymentOverdueScanJob.name,
  data: { workspaceId },
  options: {
    repeat: {
      pattern: '0 */5 * * * *',  // Every 5 minutes
    },
  },
  jobId: `payment-scan-${workspaceId}`,
});
```

### 5.3 Cron Patterns

| Pattern | Schedule |
|---------|----------|
| `*/1 * * * *` | Every 1 minute |
| `0 */5 * * * *` | Every 5 minutes |
| `0 */30 * * * *` | Every 30 minutes |
| `0 0 * * * *` | Every hour |
| `0 0 0 * * *` | Every day at midnight |

### 5.4 Sentry Cron Monitoring

```typescript
@SentryCronMonitor(
  'payment-overdue-scan',  // Monitor slug
  '0 */5 * * * *',         // Expected schedule
)
async handle(data: JobData): Promise<void> {
  // Job logic
}
```

---

## 6. Delayed Jobs (mkt-core)

### 6.1 Tổng quan

mkt-core module cung cấp hệ thống Delayed Jobs riêng với các tính năng:
- **Scheduling:** Delay job execution theo thời gian
- **Cancellation:** Cancel scheduled jobs
- **Retry with backoff:** Exponential backoff cho failures

### 6.2 Delayed Job Queues

```typescript
// File: src/mkt-core/infrastructure/delayed-job/constants/delayed-job.constants.ts
export const MKT_DELAYED_JOB_QUEUES = {
  PAYMENT_REMINDER: 'mkt-payment-reminder-queue',
  PAYMENT_DEADLINE: 'mkt-payment-deadline-queue',
};

export const DELAYED_JOB_DEFAULTS = {
  RETRY_ATTEMPTS: 3,
  BACKOFF_TYPE: 'exponential' as const,
  BACKOFF_DELAY_MS: 5000,  // 5 seconds base
  REMOVE_ON_COMPLETE: true,
  REMOVE_ON_FAIL_COUNT: 100,
};
```

### 6.3 Schedule Delayed Job

```typescript
// File: src/mkt-core/infrastructure/delayed-job/services/delayed-job.service.ts
await this.delayedJobService.scheduleJob(
  MKT_DELAYED_JOB_QUEUES.PAYMENT_REMINDER,
  'PaymentReminder',
  {
    orderId,
    workspaceId,
    hoursBeforeDeadline: 6,
  },
  {
    jobId: `reminder-${orderId}-6h`,
    delayMs: 6 * 60 * 60 * 1000,  // 6 hours
    retryAttempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    priority: 1,
  },
);
```

### 6.4 Cancel Delayed Job

```typescript
const result = await this.delayedJobService.cancelJob(
  MKT_DELAYED_JOB_QUEUES.PAYMENT_REMINDER,
  `reminder-${orderId}-6h`,
);

if (result.success) {
  console.log('Job cancelled successfully');
} else {
  console.log(`Cancel failed: ${result.reason}`);
}
```

### 6.5 Register Delayed Job Worker

```typescript
// In module initialization
this.delayedJobService.registerWorker<PaymentReminderData>(
  {
    queueName: MKT_DELAYED_JOB_QUEUES.PAYMENT_REMINDER,
    concurrency: 10,
  },
  async ({ jobId, payload, attemptNumber }) => {
    console.log(`Processing ${jobId}, attempt ${attemptNumber}`);
    await this.sendPaymentReminder(payload);
  },
);
```

---

## 7. Hướng dẫn triển khai

### 7.1 Yêu cầu hệ thống

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Node.js** | 18.x | 22.x (Alpine) |
| **Redis** | 6.x | 7.x (Alpine) |
| **PostgreSQL** | 14 | 16 (Alpine) |
| **Memory (Worker)** | 256MB | 512MB |
| **Memory (Server)** | 512MB | 1GB |

### 7.2 Environment Variables

```bash
# Redis Configuration (REQUIRED)
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379

# Database
PG_DATABASE_URL=postgres://user:pass@db:5432/twenty
PG_DATABASE_HOST=db
PG_DATABASE_PORT=5432
PG_DATABASE_USER=postgres
PG_DATABASE_PASSWORD=postgres
PG_DATABASE_NAME=default

# Worker Configuration
NODE_ENV=production
LOGGER_IS_BUFFER_ENABLED=false

# Cron Schedules (Optional)
MKT_SCHEDULED_SYNC_ENABLED=true
MKT_SCHEDULED_SYNC_CRON=0 */30 * * * *
PAYMENT_OVERDUE_SCAN_CRON=0 */5 * * * *
MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN=0 0 * * * *
```

### 7.3 Docker Compose Configuration

```yaml
# docker-compose.server.yml
name: twenty-server

services:
  server:
    image: twenty-server:${TAG:-latest}
    volumes:
      - server-local-data:/app/packages/twenty-server/.local-storage
    ports:
      - "${SERVER_PORT:-3003}:3003"
    env_file:
      - .env
    environment:
      NODE_PORT: 3003
      NODE_ENV: production
      PG_DATABASE_HOST: db
      PG_DATABASE_URL: postgres://${PG_DATABASE_USER:-postgres}:${PG_DATABASE_PASSWORD:-postgres}@db:5432/${PG_DATABASE_NAME:-default}
      REDIS_HOST: redis
      REDIS_URL: redis://redis:6379
    command: ["node", "dist/src/main"]
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: curl --fail http://localhost:3003/healthz
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  worker:
    image: twenty-server:${TAG:-latest}
    volumes:
      - server-local-data:/app/packages/twenty-server/.local-storage
    env_file:
      - .env
    environment:
      NODE_ENV: production
      PG_DATABASE_HOST: db
      PG_DATABASE_URL: postgres://${PG_DATABASE_USER:-postgres}:${PG_DATABASE_PASSWORD:-postgres}@db:5432/${PG_DATABASE_NAME:-default}
      REDIS_HOST: redis
      REDIS_URL: redis://redis:6379
    command: ["node", "dist/src/queue-worker/main"]
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  db:
    image: postgres:16-alpine
    ports:
      - "${PG_DATABASE_PORT:-5432}:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${PG_DATABASE_USER:-postgres}
      POSTGRES_PASSWORD: ${PG_DATABASE_PASSWORD:-postgres}
      POSTGRES_DB: ${PG_DATABASE_NAME:-default}
    healthcheck:
      test: pg_isready -U ${PG_DATABASE_USER:-postgres} -d ${PG_DATABASE_NAME:-default}
      interval: 5s
      timeout: 5s
      retries: 10
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G

  redis:
    image: redis:7-alpine
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis-data:/data
    command: ["redis-server", "--appendonly", "yes", "--maxmemory-policy", "noeviction"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: always
    deploy:
      resources:
        limits:
          memory: 256M

volumes:
  db-data:
  server-local-data:
  redis-data:
```

### 7.4 Triển khai Development

```bash
# 1. Clone repository
git clone <repository-url>
cd crm-mkt

# 2. Install dependencies
yarn install

# 3. Setup environment
cp packages/twenty-server/.env.example packages/twenty-server/.env
# Edit .env với các giá trị phù hợp

# 4. Start Redis (required for worker)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 5. Start PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=default \
  -p 5432:5432 \
  postgres:16-alpine

# 6. Run database migrations
npx nx run twenty-server:database:migrate:prod

# 7. Start server
npx nx start twenty-server

# 8. Start worker (in another terminal)
npx nx run twenty-server:worker
```

### 7.5 Triển khai Production (Docker)

```bash
# 1. Navigate to docker directory
cd packages/twenty-docker

# 2. Create .env file
cat > .env << EOF
TAG=latest
SERVER_PORT=3003
PG_DATABASE_USER=postgres
PG_DATABASE_PASSWORD=your_secure_password
PG_DATABASE_NAME=twenty
PG_DATABASE_PORT=5432
REDIS_PORT=6379
EOF

# 3. Build Docker image
docker build -t twenty-server:latest \
  -f twenty/Dockerfile.server \
  ../..

# 4. Start all services
docker compose -f docker-compose.server.yml up -d

# 5. Check logs
docker compose -f docker-compose.server.yml logs -f worker

# 6. Verify health
curl http://localhost:3003/healthz
```

### 7.6 Scaling Workers

```yaml
# docker-compose.server.yml
services:
  worker:
    deploy:
      replicas: 3  # Run 3 worker instances
      resources:
        limits:
          memory: 512M
```

```bash
# Scale manually
docker compose -f docker-compose.server.yml up -d --scale worker=3
```

### 7.7 Kubernetes Deployment

```yaml
# worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: twenty-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: twenty-worker
  template:
    metadata:
      labels:
        app: twenty-worker
    spec:
      containers:
      - name: worker
        image: twenty-server:latest
        command: ["node", "dist/src/queue-worker/main"]
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: twenty-secrets
              key: redis-url
        - name: PG_DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: twenty-secrets
              key: database-url
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
```

---

## 8. Monitoring & Health Check

### 8.1 Worker Health Endpoint

```typescript
// File: src/engine/core-modules/health/indicators/worker.health.ts
@Injectable()
export class WorkerHealthIndicator {
  async isHealthy(): Promise<HealthIndicatorResult> {
    const queueStatuses = await this.checkWorkers();

    return {
      worker: {
        status: queueStatuses.status,
        queues: queueStatuses.queues.map(q => ({
          queueName: q.queueName,
          workers: q.workers,
          status: q.status,
          metrics: {
            waiting: q.metrics.waiting,
            active: q.metrics.active,
            delayed: q.metrics.delayed,
            completed: q.metrics.completed,
            failed: q.metrics.failed,
            failureRate: q.metrics.failureRate,
          },
        })),
      },
    };
  }
}
```

### 8.2 Metrics Collected

| Metric | Description |
|--------|-------------|
| `workers` | Active worker count per queue |
| `waiting` | Jobs waiting to be processed |
| `active` | Jobs currently being processed |
| `delayed` | Jobs scheduled for future execution |
| `completed` | Total completed jobs |
| `failed` | Total failed jobs |
| `failureRate` | `failed / (failed + completed) * 100` |

### 8.3 Check Health via API

```bash
# Server health
curl http://localhost:3003/healthz

# Detailed health (includes worker status)
curl http://localhost:3003/healthz/details
```

### 8.4 Redis CLI Monitoring

```bash
# Connect to Redis
docker exec -it redis redis-cli

# Monitor all commands
MONITOR

# Check queue keys
KEYS bull:*

# Get queue job counts
LLEN bull:cron-queue:wait
ZCARD bull:cron-queue:delayed
```

### 8.5 BullMQ Dashboard (Optional)

```bash
# Install Bull Board
npm install @bull-board/express

# Add to server
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: Object.values(MessageQueue).map(
    (q) => new BullMQAdapter(new Queue(q)),
  ),
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

---

## 9. Troubleshooting

### 9.1 Common Issues

#### Worker không start

```bash
# Check logs
docker compose logs worker

# Common causes:
# 1. Redis not accessible
# 2. Database connection failed
# 3. Missing environment variables
```

#### Jobs không được process

```bash
# Check Redis connection
redis-cli ping

# Check queue có jobs
redis-cli LLEN bull:cron-queue:wait

# Check workers đang chạy
redis-cli SMEMBERS bull:cron-queue:workers
```

#### Jobs bị stuck

```bash
# List stuck jobs
redis-cli ZRANGE bull:cron-queue:active 0 -1

# Remove stuck job (careful!)
redis-cli ZREM bull:cron-queue:active <job-id>
```

#### High failure rate

```bash
# Check failed jobs
redis-cli LRANGE bull:cron-queue:failed 0 10

# Get job details
redis-cli HGETALL bull:cron-queue:<job-id>
```

### 9.2 Debug Mode

```bash
# Enable debug logging
DEBUG=bull:* node dist/src/queue-worker/main

# Or set in .env
DEBUG=bull:*
```

### 9.3 Reset Queue (Emergency)

```bash
# WARNING: This will delete all jobs!
redis-cli KEYS "bull:cron-queue:*" | xargs redis-cli DEL
```

---

## 10. Best Practices

### 10.1 Job Design

```typescript
// ✅ Good: Idempotent job
@Process('process-order')
async handle(data: { orderId: string }) {
  const order = await this.orderRepo.findOne(data.orderId);

  // Check if already processed
  if (order.status === 'PROCESSED') {
    return;  // Idempotent - safe to skip
  }

  await this.processOrder(order);
}

// ❌ Bad: Non-idempotent job
@Process('process-order')
async handle(data: { orderId: string }) {
  await this.chargeCustomer(data.orderId);  // May charge twice!
}
```

### 10.2 Error Handling

```typescript
// ✅ Good: Proper error handling
@Process('send-email')
async handle(data: EmailData): Promise<void> {
  try {
    await this.emailService.send(data);
  } catch (error) {
    if (error instanceof TemporaryError) {
      throw error;  // Retry
    }
    // Log and don't retry for permanent errors
    this.logger.error('Permanent error, not retrying', error);
  }
}
```

### 10.3 Job Data Size

```typescript
// ✅ Good: Small job data
await queue.add('process-order', {
  orderId: '123',  // Just ID, fetch details in job
});

// ❌ Bad: Large job data
await queue.add('process-order', {
  order: { ...largeOrderObject },  // Don't store large data
  items: [...hundredsOfItems],
});
```

### 10.4 Concurrency

```typescript
// Set appropriate concurrency per queue type
// CPU-bound: Lower concurrency
// I/O-bound: Higher concurrency

// Email sending (I/O-bound)
this.driver.work(MessageQueue.emailQueue, handler, { concurrency: 10 });

// Data processing (CPU-bound)
this.driver.work(MessageQueue.workflowQueue, handler, { concurrency: 2 });
```

### 10.5 Monitoring

- Set up alerts cho `failureRate > 5%`
- Monitor `waiting` count - high value = need more workers
- Track `delayed` count for scheduled jobs
- Use Sentry cho error tracking

---

## Appendix

### A. File Structure

```
packages/twenty-server/src/
├── queue-worker/
│   ├── queue-worker.ts              # Entry point
│   └── queue-worker.module.ts       # Module
│
├── engine/core-modules/
│   ├── message-queue/
│   │   ├── message-queue.module.ts
│   │   ├── message-queue.constants.ts
│   │   ├── message-queue.explorer.ts
│   │   ├── services/
│   │   │   └── message-queue.service.ts
│   │   ├── decorators/
│   │   │   ├── processor.decorator.ts
│   │   │   ├── process.decorator.ts
│   │   │   └── message-queue.decorator.ts
│   │   └── drivers/
│   │       ├── bullmq.driver.ts
│   │       ├── pg-boss.driver.ts
│   │       └── sync.driver.ts
│   │
│   ├── redis-client/
│   │   └── redis-client.service.ts
│   │
│   └── health/
│       └── indicators/
│           └── worker.health.ts
│
└── mkt-core/
    └── infrastructure/
        └── delayed-job/
            ├── services/
            │   └── delayed-job.service.ts
            ├── types/
            │   └── delayed-job.types.ts
            └── constants/
                └── delayed-job.constants.ts
```

### B. Quick Reference

| Action | Code |
|--------|------|
| Inject queue | `@InjectMessageQueue(MessageQueue.emailQueue)` |
| Define processor | `@Processor(MessageQueue.emailQueue)` |
| Define handler | `@Process('job-name')` |
| Add job | `queue.add('job-name', data, options)` |
| Add cron | `queue.addCron({ jobName, data, options })` |
| Remove cron | `queue.removeCron({ jobName, jobId })` |

### C. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | Yes | - | Redis connection URL |
| `PG_DATABASE_URL` | Yes | - | PostgreSQL connection URL |
| `NODE_ENV` | No | development | Environment |
| `MKT_SCHEDULED_SYNC_ENABLED` | No | true | Enable product sync |
| `MKT_SCHEDULED_SYNC_CRON` | No | `0 */30 * * * *` | Sync schedule |

---

*Document Version: 1.0*
*Last Updated: 2024*
*Module: Twenty CRM Worker System*
