# Twenty CRM - Cache System Documentation

## Tổng quan hệ thống Cache

Twenty CRM sử dụng một hệ thống cache đa lớp và linh hoạt được xây dựng trên NestJS Cache Manager với Redis làm backend chính. Hệ thống cache được thiết kế để cải thiện hiệu suất, giảm độ trễ và tối ưu hóa việc truy cập dữ liệu.

## Kiến trúc Cache System

### 1. Core Components

#### 1.1 Cache Storage Module (`cache-storage.module.ts`)
- **Module chính**: Global module quản lý toàn bộ hệ thống cache
- **Features**:
  - Auto-register cache services cho từng namespace
  - Tự động đóng Redis connection khi module destroy
  - Hỗ trợ dependency injection cho cache services

#### 1.2 Cache Storage Service (`cache-storage.service.ts`)
- **Service chính**: Cung cấp interface thống nhất cho cache operations
- **Key Features**:
  - Hỗ trợ cả Redis và Memory cache
  - Namespace isolation cho từng module
  - Redis-specific operations (sets, locks, patterns)
  - TTL (Time To Live) management

#### 1.3 Redis Client Service (`redis-client.service.ts`)
- **Low-level Redis client**: Trực tiếp làm việc với Redis thông qua IORedis
- **Features**:
  - Connection management
  - Auto-reconnection
  - Graceful shutdown

### 2. Cache Types và Namespaces

#### 2.1 Cache Storage Types
```typescript
export enum CacheStorageType {
  Memory = 'memory',  // In-memory cache (không sử dụng trong production)
  Redis = 'redis',    // Redis backend (mặc định)
}
```

#### 2.2 Cache Namespaces
```typescript
export enum CacheStorageNamespace {
  ModuleMessaging = 'module:messaging',    // Email/messaging cache
  ModuleCalendar = 'module:calendar',      // Calendar events cache
  ModuleWorkflow = 'module:workflow',      // Workflow execution cache
  EngineWorkspace = 'engine:workspace',    // Workspace metadata cache
  EngineLock = 'engine:lock',              // Distributed locking
  EngineHealth = 'engine:health',          // Health metrics cache
}
```

### 3. Specialized Cache Services

#### 3.1 Cache Lock Service (`cache-lock.service.ts`)
- **Distributed Locking**: Ngăn chặn race conditions trong môi trường multi-instance
- **Features**:
  - Retry mechanism với configurable delays
  - TTL-based lock expiration
  - Automatic lock release

#### 3.2 Metrics Cache Service (`metrics-cache.service.ts`)
- **Time-based Metrics**: Cache cho health metrics và monitoring
- **Features**:
  - Time-bucketed caching (15-second windows)
  - Aggregation operations
  - Configurable time windows

#### 3.3 Config Cache Service (`config-cache.service.ts`)
- **Configuration Caching**: In-memory cache cho application config
- **Features**:
  - Fast config lookup
  - Missing keys tracking
  - Runtime cache management

## API Reference

### Cache Storage Service Methods

#### Basic Operations
```typescript
// Get cached value
async get<T>(key: string): Promise<T | undefined>

// Set cache value with optional TTL
async set<T>(key: string, value: T, ttl?: Milliseconds): Promise<void>

// Delete cache entry
async del(key: string): Promise<void>

// Clear entire cache
async flush(): Promise<void>
```

#### Redis Set Operations
```typescript
// Add values to Redis set
async setAdd(key: string, value: string[], ttl?: Milliseconds): Promise<void>

// Pop elements from set
async setPop(key: string, size = 1): Promise<string[]>

// Get set length
async getSetLength(key: string): Promise<number>

// Count members across multiple sets
async countAllSetMembers(cacheKeys: string[]): Promise<number>
```

#### Advanced Operations
```typescript
// Pattern-based cache flush
async flushByPattern(scanPattern: string): Promise<void>

// Acquire distributed lock
async acquireLock(key: string, ttl = 1000): Promise<boolean>

// Release distributed lock
async releaseLock(key: string): Promise<void>
```

### Cache Lock Service

#### WithLock Pattern
```typescript
async withLock<T>(
  fn: () => Promise<T>,
  key: string,
  options?: CacheLockOptions
): Promise<T>

interface CacheLockOptions {
  ms?: number;        // Retry delay (default: 50ms)
  maxRetries?: number; // Max retry attempts (default: 20)
  ttl?: number;       // Lock TTL (default: 500ms)
}
```

### Metrics Cache Service

#### Counter Operations
```typescript
// Update time-bucketed counter
async updateCounter(key: MetricsKeys, items: string[]): Promise<void>

// Compute count over time window
async computeCount({
  key: MetricsKeys,
  timeWindowInSeconds?: number,
  date?: number
}): Promise<number>
```

## Cách sử dụng Cache System

### 1. Dependency Injection

#### Inject Cache Storage với Namespace
```typescript
import { Injectable } from '@nestjs/common';
import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';

@Injectable()
export class MyService {
  constructor(
    @InjectCacheStorage(CacheStorageNamespace.EngineWorkspace)
    private readonly cacheStorage: CacheStorageService,
  ) {}
}
```

#### Inject Redis Client trực tiếp
```typescript
import { Injectable } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class MyAdvancedService {
  constructor(
    private readonly redisClientService: RedisClientService,
  ) {}

  async customRedisOperation() {
    const client = this.redisClientService.getClient();
    return await client.get('my-key');
  }
}
```

### 2. Basic Caching Patterns

#### Simple Key-Value Caching
```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectCacheStorage(CacheStorageNamespace.EngineWorkspace)
    private readonly cache: CacheStorageService,
  ) {}

  async getUser(userId: string) {
    // Try cache first
    const cachedUser = await this.cache.get<User>(`user:${userId}`);
    if (cachedUser) {
      return cachedUser;
    }

    // Fetch from database
    const user = await this.userRepository.findById(userId);

    // Cache for 1 hour
    await this.cache.set(`user:${userId}`, user, 3600000);

    return user;
  }
}
```

#### Time-based Caching với TTL
```typescript
async cacheTemporaryData(key: string, data: any) {
  // Cache for 5 minutes
  await this.cache.set(key, data, 300000);
}

async cacheSessionData(sessionId: string, data: any) {
  // Cache for 24 hours
  await this.cache.set(`session:${sessionId}`, data, 86400000);
}
```

### 3. Distributed Locking

#### Critical Section Protection
```typescript
import { Injectable } from '@nestjs/common';
import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly cacheLockService: CacheLockService,
  ) {}

  async processPayment(userId: string, amount: number) {
    return await this.cacheLockService.withLock(
      async () => {
        // Critical section - only one payment per user at a time
        const balance = await this.getBalance(userId);
        if (balance < amount) {
          throw new Error('Insufficient funds');
        }

        await this.deductBalance(userId, amount);
        return await this.createPaymentRecord(userId, amount);
      },
      `payment:${userId}`,
      {
        ttl: 5000,      // 5 second lock
        maxRetries: 10  // Retry 10 times
      }
    );
  }
}
```

### 4. Set-based Operations

#### Tracking Active Users
```typescript
async trackActiveUser(userId: string) {
  const currentMinute = Math.floor(Date.now() / 60000) * 60000;
  const key = `active_users:${currentMinute}`;

  await this.cache.setAdd(key, [userId], 300000); // 5 minute TTL
}

async getActiveUserCount() {
  const currentMinute = Math.floor(Date.now() / 60000) * 60000;
  const last5Minutes = Array.from({ length: 5 }, (_, i) =>
    `active_users:${currentMinute - i * 60000}`
  );

  return await this.cache.countAllSetMembers(last5Minutes);
}
```

### 5. Pattern-based Cache Management

#### Flush Cache theo Pattern
```typescript
// Flush all user-related cache
await this.cache.flushByPattern('user:*');

// Flush all session cache
await this.cache.flushByPattern('session:*');

// Flush namespace-specific cache
await this.cache.flushByPattern('engine:workspace:*');
```

### 6. Health Metrics và Monitoring

#### Metrics Collection
```typescript
import { MetricsCacheService } from 'src/engine/core-modules/metrics/metrics-cache.service';

@Injectable()
export class ApiMetricsService {
  constructor(
    private readonly metricsCache: MetricsCacheService,
  ) {}

  async recordApiCall(endpoint: string, userId: string) {
    await this.metricsCache.updateCounter(
      'api_calls',
      [`${endpoint}:${userId}`]
    );
  }

  async getApiCallsInLastHour() {
    return await this.metricsCache.computeCount({
      key: 'api_calls',
      timeWindowInSeconds: 3600, // 1 hour
    });
  }
}
```

## Configuration

### Environment Variables
```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Cache TTL (seconds)
CACHE_STORAGE_TTL=3600

# Health Metrics
HEALTH_METRICS_TIME_WINDOW_IN_MINUTES=60
```

### Cache Module Factory
Hệ thống tự động cấu hình cache backend dựa trên environment:

```typescript
// Mặc định sử dụng Redis
const cacheStorageType = CacheStorageType.Redis;

// TTL từ config
const cacheStorageTtl = twentyConfigService.get('CACHE_STORAGE_TTL');

// Auto-configure Redis store
return {
  ttl: cacheStorageTtl * 1000,
  store: redisStore,
  url: redisUrl,
};
```

## CLI Commands

### Flush Cache Command
```bash
# Flush entire cache
npx nx run twenty-server:command cache:flush

# Flush by pattern
npx nx run twenty-server:command cache:flush --pattern "user:*"
npx nx run twenty-server:command cache:flush --pattern "engine:workspace:*"
```

## Best Practices

### 1. Key Naming Convention
- Sử dụng namespace prefixes: `module:type:identifier`
- Consistent delimiter: sử dụng `:` để phân tách
- Descriptive names: `user:profile:123`, `session:active:abc123`

### 2. TTL Strategy
- Short-lived data: 5-15 minutes
- Session data: 24 hours
- User profiles: 1 hour
- Configuration: 1 hour
- Metrics: 2x time window

### 3. Error Handling
```typescript
async safeCacheGet<T>(key: string, fallback: () => Promise<T>): Promise<T> {
  try {
    const cached = await this.cache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
  } catch (error) {
    console.warn(`Cache get failed for key ${key}:`, error);
  }

  return await fallback();
}
```

### 4. Cache Invalidation
```typescript
async updateUserProfile(userId: string, profile: UserProfile) {
  // Update database
  await this.userRepository.update(userId, profile);

  // Invalidate related cache
  await this.cache.del(`user:${userId}`);
  await this.cache.del(`user:profile:${userId}`);

  // Or update cache immediately
  await this.cache.set(`user:${userId}`, profile, 3600000);
}
```

### 5. Monitoring và Debugging
- Sử dụng Redis CLI để inspect cache: `redis-cli`
- Monitor cache hit/miss rates
- Set up alerts cho cache connection failures
- Log cache operations trong development mode

## Performance Considerations

### 1. Serialization
- JSON serialization cho complex objects
- Redis automatically handles string/number serialization
- Avoid caching very large objects (>1MB)

### 2. Connection Pooling
- IORedis tự động manage connection pool
- Configure maxRetriesPerRequest theo load
- Monitor connection count

### 3. Memory Usage
- Monitor Redis memory usage
- Set appropriate TTL để tránh memory leaks
- Use Redis SCAN thay vì KEYS trong production

### 4. Network Latency
- Co-locate Redis với application servers
- Use Redis clustering cho high availability
- Consider read replicas cho read-heavy workloads

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failed
```bash
# Check Redis is running
redis-cli ping

# Verify REDIS_URL environment variable
echo $REDIS_URL
```

#### 2. Cache Miss Rate cao
- Verify TTL settings
- Check key naming consistency
- Monitor cache invalidation patterns

#### 3. Memory Issues
```bash
# Check Redis memory usage
redis-cli info memory

# Flush cache if needed
npx nx run twenty-server:command cache:flush
```

#### 4. Lock Timeouts
- Increase maxRetries trong CacheLockOptions
- Check lock key conflicts
- Monitor lock acquisition time

---

**Note**: Hệ thống cache được thiết kế để graceful degradation - nếu Redis unavailable, application vẫn hoạt động nhưng có thể slower performance.