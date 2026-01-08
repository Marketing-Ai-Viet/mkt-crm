# Redis Implementation

Tài liệu mô tả cách triển khai Redis trong hệ thống Twenty CRM.

## Tổng quan

Redis được sử dụng cho 5 mục đích chính:

| Tính năng | Mô tả |
|-----------|-------|
| Message Queue | Job processing với BullMQ |
| Cache Storage | Lưu trữ cache với namespace |
| Distributed Locking | Khóa phân tán cho critical sections |
| Pub/Sub | GraphQL Subscriptions real-time |
| Session Management | Quản lý session người dùng |

## Configuration

### Environment Variables

```bash
REDIS_URL=redis://localhost:6379
CACHE_STORAGE_TTL=3600  # seconds
```

### Connection Settings

| Setting | Giá trị | Mô tả |
|---------|---------|-------|
| `maxRetriesPerRequest` | `null` | Required cho BullMQ |
| Session maxAge | 30 phút | Cookie expiration |
| Lock TTL | 500ms | Auto-release timeout |
| Lock maxRetries | 20 | Số lần thử acquire lock |

---

## 1. Redis Client Module

**Location**: `packages/twenty-server/src/engine/core-modules/redis-client/`

### Files
- `redis-client.module.ts` - Module definition
- `redis-client.service.ts` - Service implementation

### Implementation

```typescript
// redis-client.service.ts
@Injectable()
export class RedisClientService implements OnModuleDestroy {
  private redisClient: IORedis | null = null;

  constructor(private readonly twentyConfigService: TwentyConfigService) {}

  getClient() {
    if (!this.redisClient) {
      const redisUrl = this.twentyConfigService.get('REDIS_URL');

      if (!redisUrl) {
        throw new Error('REDIS_URL must be defined');
      }

      this.redisClient = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
      });
    }

    return this.redisClient;
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
  }
}
```

### Key Points
- Sử dụng **ioredis** library
- Singleton pattern, lazy-loaded khi cần
- Global module, export cho toàn bộ application
- Proper cleanup khi module destroy

---

## 2. Message Queue (BullMQ)

**Location**: `packages/twenty-server/src/engine/core-modules/message-queue/`

### Files
- `message-queue.constants.ts` - Queue definitions
- `drivers/bullmq.driver.ts` - BullMQ driver
- `services/message-queue.service.ts` - Queue service
- `decorators/` - Injection decorators

### Available Queues

```typescript
// message-queue.constants.ts
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
}
```

### Tạo Job Processor

```typescript
// 1. Define job data interface
export type MyJobData = {
  workspaceId: string;
  entityId: string;
};

// 2. Create job class with decorators
@Injectable()
@Processor(MessageQueue.workspaceQueue)
export class MyJob {
  private readonly logger = new Logger(MyJob.name);

  constructor(
    private readonly myService: MyService,
  ) {}

  @Process(MyJob.name)
  async handle(data: MyJobData): Promise<void> {
    this.logger.log(`Processing job for entity ${data.entityId}`);
    await this.myService.process(data);
  }
}
```

### Enqueue Job

```typescript
@Injectable()
export class MyService {
  constructor(
    @InjectMessageQueue(MessageQueue.workspaceQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async enqueueJob(workspaceId: string, entityId: string) {
    await this.messageQueueService.add<MyJobData>(
      MyJob.name,
      { workspaceId, entityId },
      { retryLimit: 3, priority: 5 }
    );
  }
}
```

### Cron Jobs

```typescript
// Add cron job
await this.messageQueueService.addCron({
  jobName: 'MyScheduledJob',
  data: { workspaceId },
  options: {
    repeat: {
      pattern: '0 */6 * * *', // Every 6 hours
    },
  },
  jobId: 'my-cron-1',
});

// Remove cron job
await this.messageQueueService.removeCron({
  jobName: 'MyScheduledJob',
  jobId: 'my-cron-1',
});
```

### mkt-core Usage Examples

```typescript
// license/jobs/license-generation.job.ts
@Processor(MessageQueue.billingQueue)
export class LicenseGenerationJob {
  @Process(LicenseGenerationJob.name)
  async handle(data: LicenseGenerationJobData): Promise<void> {
    // Generate license logic
  }
}

// invoice/jobs/s-invoice-integration.job.ts
@Processor(MessageQueue.billingQueue)
export class SInvoiceIntegrationJob {
  @Process(SInvoiceIntegrationJob.name)
  async handle(data: SInvoiceJobData): Promise<void> {
    // Invoice integration logic
  }
}
```

---

## 3. Cache Storage

**Location**: `packages/twenty-server/src/engine/core-modules/cache-storage/`

### Files
- `cache-storage.service.ts` - Cache service
- `types/cache-storage-namespace.enum.ts` - Namespaces
- `decorators/cache-storage.decorator.ts` - Injection decorator

### Cache Namespaces

```typescript
export enum CacheStorageNamespace {
  ModuleMessaging = 'module:messaging',
  ModuleCalendar = 'module:calendar',
  ModuleWorkflow = 'module:workflow',
  EngineWorkspace = 'engine:workspace',
  EngineLock = 'engine:lock',
  EngineHealth = 'engine:health',
}
```

### Basic Operations

```typescript
@Injectable()
export class MyService {
  constructor(
    @InjectCacheStorage(CacheStorageNamespace.ModuleCalendar)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  // Get value
  async getValue(key: string): Promise<MyType | undefined> {
    return this.cacheStorage.get<MyType>(key);
  }

  // Set value with TTL
  async setValue(key: string, value: MyType): Promise<void> {
    await this.cacheStorage.set(key, value, 60000); // 60s TTL
  }

  // Delete value
  async deleteValue(key: string): Promise<void> {
    await this.cacheStorage.del(key);
  }

  // Get or fetch pattern
  async getOrFetch(key: string): Promise<MyType> {
    let data = await this.cacheStorage.get<MyType>(key);

    if (!data) {
      data = await this.fetchFromDatabase();
      await this.cacheStorage.set(key, data, 3600000); // 1 hour
    }

    return data;
  }
}
```

### Redis Set Operations

```typescript
// Add to set
await this.cacheStorage.setAdd('my-set', ['item1', 'item2', 'item3']);

// Pop from set
const items = await this.cacheStorage.setPop('my-set', 2);

// Check set membership
const exists = await this.cacheStorage.setIsMember('my-set', 'item1');
```

### Pattern-based Operations

```typescript
// Flush all keys matching pattern
await this.cacheStorage.flushByPattern('user:*');
await this.cacheStorage.flushByPattern('module:calendar:*');
```

### Thêm Namespace mới

```typescript
// 1. Update enum
export enum CacheStorageNamespace {
  // ... existing
  MktLicense = 'mkt:license',
  MktOrder = 'mkt:order',
}

// 2. Inject và sử dụng
@InjectCacheStorage(CacheStorageNamespace.MktLicense)
private readonly licenseCache: CacheStorageService;
```

---

## 4. Distributed Locking

**Location**: `packages/twenty-server/src/engine/core-modules/cache-lock/`

### Files
- `cache-lock.service.ts` - Lock service
- `with-lock.decorator.ts` - Decorator for locking

### Implementation

```typescript
// cache-lock.service.ts
@Injectable()
export class CacheLockService {
  constructor(
    @InjectCacheStorage(CacheStorageNamespace.EngineLock)
    private readonly cacheStorageService: CacheStorageService,
  ) {}

  async withLock<T>(
    fn: () => Promise<T>,
    key: string,
    options?: CacheLockOptions,
  ): Promise<T> {
    const { ms = 50, maxRetries = 20, ttl = 500 } = options ?? {};

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const acquired = await this.cacheStorageService.acquireLock(key, ttl);

      if (acquired) {
        try {
          return await fn();
        } finally {
          await this.cacheStorageService.releaseLock(key);
        }
      }

      await this.delay(ms);
    }

    throw new Error(`Failed to acquire lock for key: ${key}`);
  }
}
```

### Usage

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly cacheLockService: CacheLockService,
  ) {}

  async processOrder(orderId: string): Promise<void> {
    await this.cacheLockService.withLock(
      async () => {
        // Critical section - chỉ 1 instance chạy tại một thời điểm
        const order = await this.findOrder(orderId);
        await this.updateOrder(order);
        await this.notifyCustomer(order);
      },
      `order:process:${orderId}`,
      { ms: 100, maxRetries: 10, ttl: 5000 }
    );
  }
}
```

### Lock Options

| Option | Default | Mô tả |
|--------|---------|-------|
| `ms` | 50 | Delay giữa các lần retry (milliseconds) |
| `maxRetries` | 20 | Số lần thử acquire lock tối đa |
| `ttl` | 500 | Lock auto-release sau TTL (milliseconds) |

---

## 5. GraphQL Subscriptions (Pub/Sub)

**Location**: `packages/twenty-server/src/engine/subscriptions/`

### Files
- `subscriptions.module.ts` - Module with PubSub provider
- `subscriptions.resolver.ts` - GraphQL resolver
- `subscriptions.job.ts` - Job processor

### Implementation

```typescript
// subscriptions.module.ts
import { RedisPubSub } from 'graphql-redis-subscriptions';

@Module({
  exports: ['PUB_SUB'],
  providers: [
    {
      provide: 'PUB_SUB',
      inject: [RedisClientService],
      useFactory: (redisClientService: RedisClientService) =>
        new RedisPubSub({
          publisher: redisClientService.getClient().duplicate(),
          subscriber: redisClientService.getClient().duplicate(),
        }),
    },
    SubscriptionsResolver,
    SubscriptionsJob,
  ],
})
export class SubscriptionsModule implements OnModuleDestroy {
  constructor(@Inject('PUB_SUB') private readonly pubSub: RedisPubSub) {}

  async onModuleDestroy() {
    if (this.pubSub) {
      await this.pubSub.close();
    }
  }
}
```

### Usage

```typescript
@Resolver()
export class MyResolver {
  constructor(
    @Inject('PUB_SUB') private readonly pubSub: RedisPubSub,
  ) {}

  // Publish event
  async publishEvent(data: EventData): Promise<void> {
    await this.pubSub.publish('EVENT_CHANNEL', data);
  }

  // Subscribe to events
  @Subscription(() => EventType)
  eventSubscription() {
    return this.pubSub.asyncIterator('EVENT_CHANNEL');
  }
}
```

---

## 6. Session Management

**Location**: `packages/twenty-server/src/engine/core-modules/session-storage/`

### Implementation

```typescript
// session-storage.module-factory.ts
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

export const getSessionStorageOptions = (
  twentyConfigService: TwentyConfigService,
): session.SessionOptions => {
  const connectionString = twentyConfigService.get('REDIS_URL');

  const redisClient = createClient({
    url: connectionString,
  });

  return {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: !!(SERVER_URL && SERVER_URL.startsWith('https')),
      maxAge: 1000 * 60 * 30, // 30 minutes
    },
    store: new RedisStore({
      client: redisClient,
      prefix: 'engine:session:',
    }),
  };
};
```

### Session Configuration

| Setting | Giá trị | Mô tả |
|---------|---------|-------|
| `prefix` | `engine:session:` | Key prefix trong Redis |
| `maxAge` | 30 phút | Session expiration |
| `secure` | Auto | HTTPS only nếu server URL là HTTPS |
| `resave` | false | Không save session nếu không thay đổi |
| `saveUninitialized` | false | Không tạo session cho request không có data |

---

## 7. Health Monitoring

**Location**: `packages/twenty-server/src/engine/core-modules/health/indicators/redis.health.ts`

### Metrics được thu thập

| Metric | Mô tả |
|--------|-------|
| `version` | Redis server version |
| `uptime` | Uptime in seconds |
| `memory_used` | Memory usage |
| `memory_peak` | Peak memory usage |
| `memory_fragmentation` | Memory fragmentation ratio |
| `connected_clients` | Current connections |
| `ops_per_sec` | Operations per second |
| `hit_rate` | Cache hit rate |
| `evicted_keys` | Number of evicted keys |

---

## 8. Best Practices

### Do's

1. **Sử dụng namespace cho cache keys**
   ```typescript
   // Good
   await cache.set('user:123:profile', data);

   // Bad
   await cache.set('profile', data);
   ```

2. **Luôn set TTL cho cache**
   ```typescript
   await cache.set(key, value, 3600000); // 1 hour
   ```

3. **Sử dụng distributed lock cho critical sections**
   ```typescript
   await cacheLockService.withLock(
     async () => { /* critical code */ },
     'unique-lock-key',
   );
   ```

4. **Handle job failures gracefully**
   ```typescript
   @Process(MyJob.name)
   async handle(data: JobData): Promise<void> {
     try {
       await this.process(data);
     } catch (error) {
       this.logger.error(`Job failed: ${error.message}`);
       throw error; // Re-throw để BullMQ retry
     }
   }
   ```

### Don'ts

1. **Không lưu trữ data lớn trong Redis**
   - Giới hạn value size < 1MB
   - Sử dụng database cho large objects

2. **Không sử dụng blocking operations**
   - Tránh `KEYS *` trong production
   - Sử dụng `SCAN` thay thế

3. **Không quên cleanup**
   - Implement `OnModuleDestroy` để đóng connections
   - Remove cron jobs khi không cần

---

## 9. Troubleshooting

### Connection Issues

```bash
# Check Redis connection
redis-cli ping

# Check Redis info
redis-cli info

# Monitor Redis commands
redis-cli monitor
```

### Queue Issues

```bash
# Check queue length
redis-cli llen bull:queue-name:wait

# Check failed jobs
redis-cli lrange bull:queue-name:failed 0 -1
```

### Memory Issues

```bash
# Check memory usage
redis-cli info memory

# Clear all keys (DANGEROUS - development only)
redis-cli flushall
```

---

## 10. File Structure Summary

```
packages/twenty-server/src/engine/core-modules/
├── redis-client/
│   ├── redis-client.module.ts
│   └── redis-client.service.ts
├── message-queue/
│   ├── message-queue.constants.ts
│   ├── message-queue.module.ts
│   ├── message-queue-core.module.ts
│   ├── message-queue.module-factory.ts
│   ├── drivers/
│   │   └── bullmq.driver.ts
│   ├── services/
│   │   └── message-queue.service.ts
│   └── decorators/
│       ├── message-queue.decorator.ts
│       ├── processor.decorator.ts
│       └── process.decorator.ts
├── cache-storage/
│   ├── cache-storage.module.ts
│   ├── cache-storage.module-factory.ts
│   ├── services/
│   │   └── cache-storage.service.ts
│   ├── types/
│   │   └── cache-storage-namespace.enum.ts
│   └── decorators/
│       └── cache-storage.decorator.ts
├── cache-lock/
│   ├── cache-lock.module.ts
│   ├── cache-lock.service.ts
│   └── with-lock.decorator.ts
├── session-storage/
│   └── session-storage.module-factory.ts
└── health/
    └── indicators/
        └── redis.health.ts

packages/twenty-server/src/engine/subscriptions/
├── subscriptions.module.ts
├── subscriptions.resolver.ts
└── subscriptions.job.ts
```
