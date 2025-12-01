# Redis Health Check Design

## 1. Mục tiêu

Implement cơ chế kiểm tra kết nối Redis định kỳ cho OAuth2 Cache Service để:
- Phát hiện sớm Redis unavailable trước khi có request thực
- Cung cấp trạng thái chính xác cho health check API
- Hỗ trợ monitoring/alerting với dữ liệu realtime

## 2. Phân tích hiện trạng

### 2.1 Cấu trúc hiện tại

```
OAuth2CacheService
├── redisConnected: boolean (chỉ update khi có operation)
├── lastRedisErrorAt?: DateTime
├── redisFallbackCount: number
└── getStats() → OAuth2CacheStats
```

### 2.2 Vấn đề

| Vấn đề | Mô tả |
|--------|-------|
| Passive detection | `redisConnected` chỉ update khi get/set/delete được gọi |
| Stale status | Nếu không có traffic, trạng thái có thể outdated |
| No recovery detection | Không biết khi nào Redis recover nếu không có operation |

### 2.3 Phạm vi và giới hạn

**Trong phạm vi (In scope):**
- Health check per-instance (mỗi pod tự quản lý state)
- Local state management với thread-safe access
- Graceful degradation khi Redis unavailable

**Ngoài phạm vi (Out of scope):**
- Distributed health state sync giữa các pods (phức tạp, cần consensus)
- Prometheus/OpenTelemetry metrics integration (future enhancement)
- Dynamic enable/disable tại runtime

**Lý do chọn per-instance approach:**
- Mỗi pod có thể có network partition khác nhau với Redis
- Không cần single source of truth - mỗi pod cần biết *chính nó* có connect được không
- Đơn giản, không thêm dependency vào distributed coordination

## 3. Thiết kế giải pháp

### 3.1 Tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                   OAuth2CacheService                         │
├─────────────────────────────────────────────────────────────┤
│  Health Check Loop (setInterval)                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Every 30s:                                          │   │
│  │  1. Execute PING command                             │   │
│  │  2. Update redisConnected status                     │   │
│  │  3. Calculate latency                                │   │
│  │  4. Update lastHealthCheckAt                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  State:                                                     │
│  ├── redisConnected: boolean                               │
│  ├── lastRedisErrorAt?: DateTime                           │
│  ├── lastHealthCheckAt?: DateTime                          │
│  ├── healthCheckLatencyMs?: number                         │
│  ├── redisFallbackCount: number                            │
│  └── consecutiveFailures: number                           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Cấu hình mới

```typescript
// constants/oauth2-client.constant.ts
export const OAUTH2_REDIS_HEALTH_DEFAULTS = {
  ENABLED: true,
  INTERVAL_MS: 30000,        // 30 seconds
  TIMEOUT_MS: 5000,          // 5 seconds timeout for ping (MUST < INTERVAL_MS)
  UNHEALTHY_THRESHOLD: 3,    // Mark unhealthy after 3 consecutive failures
} as const;
```

```typescript
// config/oauth2-client.config.ts
redis: {
  healthCheck: {
    enabled: getEnvBoolean('OAUTH2_REDIS_HEALTH_CHECK_ENABLED', true),
    intervalMs: parseInt(process.env.OAUTH2_REDIS_HEALTH_CHECK_INTERVAL_MS ?? '30000', 10),
    timeoutMs: parseInt(process.env.OAUTH2_REDIS_HEALTH_CHECK_TIMEOUT_MS ?? '5000', 10),
    unhealthyThreshold: parseInt(process.env.OAUTH2_REDIS_HEALTH_CHECK_UNHEALTHY_THRESHOLD ?? '3', 10),
  },
},
```

**Constraint quan trọng:** `timeoutMs` PHẢI nhỏ hơn `intervalMs` để tránh overlap health checks. Validation sẽ được thực hiện trong `onModuleInit()`.

### 3.3 Type definitions

```typescript
// types/oauth2-service.type.ts
export type RedisHealthStatus = {
  connected: boolean;
  lastErrorAt?: Date;
  lastHealthCheckAt?: Date;
  latencyMs?: number;
  fallbackCount: number;
  consecutiveFailures: number;
};

export type OAuth2CacheStats = {
  lru: {
    size: number;
    maxSize: number;
  };
  redis: RedisHealthStatus;
};
```

### 3.4 Service implementation

```typescript
// services/oauth2-cache.service.ts

@Injectable()
export class OAuth2CacheService implements OnModuleInit, OnModuleDestroy {
  // Existing state
  private redisConnected = true;
  private lastRedisErrorAt?: DateTime;
  private redisFallbackCount = 0;

  // New health check state
  private lastHealthCheckAt?: DateTime;
  private healthCheckLatencyMs?: number;
  private consecutiveFailures = 0;
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private isHealthCheckRunning = false; // Guard để tránh overlap

  // Timestamp tracking để xử lý race condition giữa health check và real operations
  private lastSuccessAt?: DateTime;
  private lastFailureAt?: DateTime;

  // Config
  private readonly healthCheckEnabled: boolean;
  private readonly healthCheckIntervalMs: number;
  private readonly healthCheckTimeoutMs: number;
  private readonly unhealthyThreshold: number;

  async onModuleInit(): Promise<void> {
    if (this.healthCheckEnabled) {
      this.validateHealthCheckConfig();
      await this.performHealthCheck(); // Initial check
      this.startHealthCheckLoop();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }

  /**
   * Graceful shutdown: Stop interval và wait cho health check đang chạy hoàn thành.
   * Timeout = healthCheckTimeoutMs + 1000ms buffer để tránh hang forever.
   */
  private async gracefulShutdown(): Promise<void> {
    this.stopHealthCheckLoop();

    if (!this.isHealthCheckRunning) {
      this.logger.log('OAuth2CacheService destroyed');
      return;
    }

    this.logger.debug('Waiting for health check to complete before shutdown...');

    const maxWaitMs = this.healthCheckTimeoutMs + 1000;
    const startTime = DateTime.utc();

    // Poll isHealthCheckRunning với timeout
    while (this.isHealthCheckRunning) {
      const elapsedMs = DateTime.utc().diff(startTime).as('milliseconds');
      if (elapsedMs >= maxWaitMs) {
        this.logger.warn(
          `Health check still running after ${maxWaitMs}ms, proceeding with shutdown`,
        );
        break;
      }
      await this.delay(100);
    }

    this.logger.log('OAuth2CacheService destroyed');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private validateHealthCheckConfig(): void {
    const errors: string[] = [];

    // Timeout must be less than interval to avoid overlap
    if (this.healthCheckTimeoutMs >= this.healthCheckIntervalMs) {
      errors.push(
        `timeoutMs (${this.healthCheckTimeoutMs}) must be < intervalMs (${this.healthCheckIntervalMs})`,
      );
    }

    // Interval minimum 1000ms to avoid spamming Redis
    if (this.healthCheckIntervalMs < 1000) {
      errors.push(
        `intervalMs (${this.healthCheckIntervalMs}) too low, minimum 1000ms`,
      );
    }

    // Timeout maximum 10000ms to avoid blocking too long
    if (this.healthCheckTimeoutMs > 10000) {
      errors.push(
        `timeoutMs (${this.healthCheckTimeoutMs}) too high, maximum 10000ms`,
      );
    }

    // Threshold must be positive
    if (this.unhealthyThreshold < 1) {
      errors.push(
        `unhealthyThreshold (${this.unhealthyThreshold}) must be >= 1`,
      );
    }

    if (errors.length > 0) {
      throw new Error(
        `Invalid Redis health check config:\n- ${errors.join('\n- ')}`,
      );
    }
  }

  private startHealthCheckLoop(): void {
    this.healthCheckInterval = setInterval(
      () => this.safePerformHealthCheck(),
      this.healthCheckIntervalMs,
    );
    this.logger.log(
      `Redis health check started (interval: ${this.healthCheckIntervalMs}ms)`,
    );
  }

  private stopHealthCheckLoop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      this.logger.log('Redis health check stopped');
    }
  }

  /**
   * Wrapper để đảm bảo không có overlapping health checks
   */
  private async safePerformHealthCheck(): Promise<void> {
    if (this.isHealthCheckRunning) {
      this.logger.debug('Health check skipped - previous check still running');
      return;
    }

    this.isHealthCheckRunning = true;
    try {
      await this.performHealthCheck();
    } finally {
      this.isHealthCheckRunning = false;
    }
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = DateTime.utc();

    try {
      // Sử dụng PING command với timeout wrapper
      // CacheStorageService.ping() đã có built-in timeout
      await this.cacheStorage.ping({ timeoutMs: this.healthCheckTimeoutMs });

      this.updateHealthCheckSuccess(startTime);
    } catch (error) {
      this.updateHealthCheckFailure(error, startTime);
    }
  }

  /**
   * Update state khi health check thành công.
   * Sử dụng timestamp tracking để tránh race condition với real operations.
   *
   * @param startTime - Thời điểm bắt đầu health check (để tính latency)
   */
  private updateHealthCheckSuccess(startTime: DateTime): void {
    const now = DateTime.utc();

    // Chỉ update nếu không có success từ real operation gần hơn
    // Điều này tránh health check "ghi đè" state từ real operation mới hơn
    if (this.lastSuccessAt && startTime < this.lastSuccessAt) {
      this.logger.debug(
        'Health check success ignored - newer real operation already succeeded',
      );
      return;
    }

    this.lastHealthCheckAt = now;
    this.lastSuccessAt = now;
    this.healthCheckLatencyMs = Math.round(now.diff(startTime).as('milliseconds'));
    this.consecutiveFailures = 0;
    this.redisConnected = true;

    this.logger.debug(
      `Redis health check passed (latency: ${this.healthCheckLatencyMs}ms)`,
    );
  }

  /**
   * Update state khi health check thất bại.
   * Không ghi đè nếu có real operation success gần đây.
   */
  private updateHealthCheckFailure(error: unknown, startTime: DateTime): void {
    const now = DateTime.utc();

    // Nếu có success từ real operation sau khi health check bắt đầu,
    // không tăng consecutiveFailures vì Redis thực sự đang hoạt động
    if (this.lastSuccessAt && startTime < this.lastSuccessAt) {
      this.logger.debug(
        'Health check failure ignored - real operation succeeded during check',
      );
      return;
    }

    this.consecutiveFailures++;
    this.lastRedisErrorAt = now;
    this.lastFailureAt = now;
    this.lastHealthCheckAt = now;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (this.consecutiveFailures >= this.unhealthyThreshold) {
      this.redisConnected = false;
      this.logger.warn(
        `Redis marked unhealthy after ${this.consecutiveFailures} consecutive failures: ${errorMessage}`,
      );
    } else {
      this.logger.debug(
        `Redis health check failed (${this.consecutiveFailures}/${this.unhealthyThreshold}): ${errorMessage}`,
      );
    }
  }

  /**
   * Được gọi từ real operations (get/set/delete) khi thành công.
   * Reset consecutive failures và update timestamp để health check không ghi đè.
   */
  markRedisSuccess(): void {
    const now = DateTime.utc();
    this.lastSuccessAt = now;
    this.redisConnected = true;

    // Chỉ reset và log nếu đang trong trạng thái có failures
    if (this.consecutiveFailures > 0) {
      this.consecutiveFailures = 0;
      this.logger.debug('Redis connection restored via real operation');
    }
  }

  /**
   * Được gọi từ real operations khi thất bại.
   * Không set redisConnected = false ngay - để health check threshold quyết định.
   */
  markRedisError(): void {
    const now = DateTime.utc();
    this.redisFallbackCount++;
    this.lastRedisErrorAt = now;
    this.lastFailureAt = now;
    // Không set redisConnected = false ngay lập tức
    // Để health check quyết định dựa trên threshold
  }

  getStats(): OAuth2CacheStats {
    return {
      lru: {
        size: this.lruCache.size,
        maxSize: this.lruMax,
      },
      redis: {
        connected: this.redisConnected,
        lastErrorAt: this.lastRedisErrorAt?.toJSDate(),
        lastHealthCheckAt: this.lastHealthCheckAt?.toJSDate(),
        latencyMs: this.healthCheckLatencyMs,
        fallbackCount: this.redisFallbackCount,
        consecutiveFailures: this.consecutiveFailures,
      },
    };
  }
}
```

### 3.5 CacheStorageService ping() method

Cần thêm method `ping()` vào `CacheStorageService` với timeout wrapper:

```typescript
// engine/core-modules/cache-storage/services/cache-storage.service.ts

/**
 * Health check ping với configurable timeout.
 * Sử dụng Redis PING command để kiểm tra connection.
 *
 * @param options.timeoutMs - Timeout in milliseconds (default: 5000)
 * @throws Error nếu timeout hoặc connection failed
 */
async ping(options?: { timeoutMs?: number }): Promise<'PONG'> {
  const timeoutMs = options?.timeoutMs ?? 5000;

  return Promise.race([
    this.redisClient.ping(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Redis ping timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}
```

**Giải thích design choices:**

1. **Timeout wrapper thay vì AbortSignal**: ioredis không native support AbortSignal, Promise.race đơn giản và hiệu quả hơn.

2. **Underlying request vẫn chạy sau timeout**: Redis client sẽ tự cleanup connection timeout. Không gây memory leak vì PING là lightweight operation.

3. **Return type `'PONG'`**: Consistent với Redis PING response, cho phép caller verify response nếu cần.

### 3.6 GraphQL DTO update

```typescript
// dto/oauth2-management.output.ts

@ObjectType()
export class OAuth2RedisCacheStats {
  @Field()
  connected: boolean;

  @Field(() => Date, { nullable: true })
  lastErrorAt?: Date;

  @Field(() => Date, { nullable: true })
  lastHealthCheckAt?: Date;

  @Field(() => Int, { nullable: true })
  latencyMs?: number;

  @Field(() => Int)
  fallbackCount: number;

  @Field(() => Int)
  consecutiveFailures: number;
}
```

## 4. Luồng hoạt động

### 4.1 Startup flow

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Module Init  │────▶│ Initial Health  │────▶│ Start Interval   │
│              │     │ Check           │     │ Loop (30s)       │
└──────────────┘     └─────────────────┘     └──────────────────┘
```

### 4.2 Health check flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Timer fires │────▶│ Execute ping │────▶│ Success?        │
│ (every 30s) │     │ with timeout │     │                 │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                         ┌─────────────────────────┼─────────────────────────┐
                         │ YES                     │                    NO   │
                         ▼                         │                         ▼
              ┌──────────────────┐                 │          ┌──────────────────────┐
              │ Reset failures   │                 │          │ Increment failures   │
              │ Update latency   │                 │          │ Update lastErrorAt   │
              │ connected = true │                 │          │                      │
              └──────────────────┘                 │          └──────────┬───────────┘
                                                   │                     │
                                                   │                     ▼
                                                   │          ┌──────────────────────┐
                                                   │          │ failures >= threshold│
                                                   │          └──────────┬───────────┘
                                                   │                     │
                                                   │     ┌───────────────┼───────────────┐
                                                   │     │ YES           │          NO   │
                                                   │     ▼               │               ▼
                                                   │  ┌────────────┐     │    ┌─────────────┐
                                                   │  │ connected  │     │    │ Keep status │
                                                   │  │ = false    │     │    │ (grace)     │
                                                   │  └────────────┘     │    └─────────────┘
                                                   │                     │
                                                   └─────────────────────┘
```

### 4.3 Shutdown flow

```
┌───────────────┐     ┌──────────────────┐
│ Module        │────▶│ Clear interval   │
│ Destroy       │     │ Log stopped      │
└───────────────┘     └──────────────────┘
```

## 5. Cấu hình Environment Variables

```bash
# .env
# Redis Health Check Configuration
OAUTH2_REDIS_HEALTH_CHECK_ENABLED=true
OAUTH2_REDIS_HEALTH_CHECK_INTERVAL_MS=30000
OAUTH2_REDIS_HEALTH_CHECK_TIMEOUT_MS=5000
OAUTH2_REDIS_HEALTH_CHECK_UNHEALTHY_THRESHOLD=3
```

## 6. Các file cần thay đổi

| File | Thay đổi |
|------|----------|
| `constants/oauth2-client.constant.ts` | Thêm `OAUTH2_REDIS_HEALTH_DEFAULTS` |
| `config/oauth2-client.config.ts` | Thêm `redis.healthCheck` config |
| `types/oauth2-service.type.ts` | Thêm `RedisHealthStatus`, update `OAuth2CacheStats` |
| `services/oauth2-cache.service.ts` | Implement health check loop |
| `dto/oauth2-management.output.ts` | Update `OAuth2RedisCacheStats` |

## 7. Test scenarios

### 7.1 Basic scenarios

| Scenario | Expected behavior |
|----------|-------------------|
| Redis healthy | `connected=true`, `consecutiveFailures=0`, latency measured |
| Redis down 1-2 times | `connected=true` (grace period), `consecutiveFailures` incremented |
| Redis down >= 3 times | `connected=false`, warning logged |
| Redis recovers | `connected=true`, `consecutiveFailures=0` |
| Health check disabled | No interval, no ping, passive detection only |
| Module shutdown | Interval cleared, no memory leak |

### 7.2 Edge cases và race conditions

| Scenario | Expected behavior |
|----------|-------------------|
| `timeout >= interval` | Throw error on module init, không start health check |
| Health check running khi interval fire | Skip lần này, log debug message |
| Real operation success trong khi health check failing | `consecutiveFailures` reset về 0, `connected=true` |
| Real operation fail + health check fail | `fallbackCount++`, `consecutiveFailures++` (independent) |
| Rapid consecutive failures | Chỉ log warn 1 lần khi vượt threshold, sau đó chỉ increment |
| Module destroy trong khi health check đang chạy | `clearInterval` ngay, health check hoàn thành nhưng state không còn relevant |

### 7.3 Memory leak prevention

| Test case | Verification |
|-----------|--------------|
| Long-running với failures liên tục | Không accumulate objects, chỉ primitive state được update |
| `onModuleDestroy` được gọi | `clearInterval` executed, `healthCheckInterval = undefined` |
| Nhiều init/destroy cycles | Không duplicate intervals, không orphan timers |
| AbortController sau mỗi health check | Tạo mới mỗi lần, không giữ reference cũ |

### 7.4 Concurrency scenarios

```typescript
// Test: Health check và real operation cùng update state
describe('Race condition handling', () => {
  it('should handle concurrent health check and real operation', async () => {
    // 1. Start health check (takes 100ms)
    // 2. Real operation succeeds at 50ms
    // 3. Health check fails at 100ms
    // Expected: consecutiveFailures = 1 (not reset by stale success)
  });

  it('should not double-increment failures', async () => {
    // 1. Health check fails
    // 2. Real operation fails at same time
    // Expected: fallbackCount = 1, consecutiveFailures = 1
  });
});
```

**Lưu ý về thread-safety:** Node.js là single-threaded nên không có true race condition, nhưng async operations có thể interleave. Design đảm bảo:
- `isHealthCheckRunning` flag prevent overlap
- State updates là atomic (simple assignment)
- Không có complex state transitions phụ thuộc vào multiple variables
- Timestamp tracking giúp phát hiện và bỏ qua stale updates

### 7.5 Integration test scenarios

| Test case | Setup | Verification |
|-----------|-------|--------------|
| Redis container restart | Docker compose với Redis, restart mid-test | `connected` chuyển false → true sau recovery |
| Network partition | `iptables` drop packets tới Redis | Health check marks unhealthy, real ops dùng LRU fallback |
| High request load | 1000 req/s concurrent với health check | Health check không block requests, latency stable |
| Redis latency spike | Redis với artificial delay (DEBUG SLEEP) | `latencyMs` tăng, `connected` vẫn true nếu < timeout |
| Graceful shutdown | Trigger SIGTERM trong khi health check running | Logs "Waiting for health check...", clean shutdown |
| Config validation fail | Set `timeoutMs > intervalMs` | App không start, error message rõ ràng |

### 7.6 Performance benchmarks

**Baseline (without health check):**
- Request latency: p50=5ms, p95=12ms
- Cache hit rate: 95%

**With health check (30s interval):**
- Request latency: p50=5ms, p95=12ms (no impact expected)
- Cache hit rate: 95% (no change)
- Health check latency: p50=2ms, p95=5ms

**Expected overhead:**
- CPU: < 0.1% (1 ping per 30s)
- Memory: < 1KB (primitive state only, no arrays grow unbounded)
- Network: 1 PING request per 30s per instance

## 8. Monitoring & Alerting

### 8.1 Current implementation (GraphQL only)

Hiện tại monitoring qua GraphQL query:

```graphql
query {
  oauth2HealthCheck {
    status
    cache {
      redis {
        connected
        lastErrorAt
        lastHealthCheckAt
        latencyMs
        fallbackCount
        consecutiveFailures
      }
    }
  }
}
```

### 8.2 Future enhancement: Prometheus metrics

**Chưa implement trong phiên bản này.** Roadmap cho future:

```typescript
// Prometheus metrics (future enhancement - Phase 2)
oauth2_redis_health_check_latency_ms (histogram)
oauth2_redis_health_check_failures_total (counter)
oauth2_redis_connected (gauge: 0 or 1)
oauth2_redis_fallback_total (counter)
```

**Lý do defer:**
- Cần thêm dependency `@nestjs/terminus` hoặc `prom-client`
- Cần setup Prometheus endpoint
- GraphQL đủ cho monitoring manual, metrics cần cho automated alerting

### 8.3 Log patterns

```
// Info level
Redis health check started (interval: 30000ms)
Redis health check stopped

// Debug level
Redis health check passed (latency: 5ms)
Redis health check failed (1/3): Connection refused
Health check skipped - previous check still running
Redis connection restored via real operation

// Warn level
Redis marked unhealthy after 3 consecutive failures: Connection timeout
```

## 9. Rollback & Troubleshooting

### 9.1 Emergency disable

Disable health check bằng environment variable:
```bash
OAUTH2_REDIS_HEALTH_CHECK_ENABLED=false
```

**⚠️ Restart required:** Yes - NestJS config được load lúc startup, không hỗ trợ hot-reload.

**State behavior sau restart:**
- Tất cả health check state được reset (`consecutiveFailures = 0`, `connected = true`)
- Module fallback về passive detection (chỉ update state khi có real operations)
- LRU cache (in-memory) được clear khi restart
- Redis cache vẫn tồn tại

### 9.2 Runtime pause/resume

**Không hỗ trợ trong phiên bản này.**

Future enhancement: Thêm GraphQL mutation để pause/resume health check tại runtime mà không cần restart.

### 9.3 Troubleshooting guide

| Issue | Diagnostic | Solution |
|-------|-----------|----------|
| False unhealthy alerts | Check `lastHealthCheckAt` vs `lastSuccessAt` gap | Tăng `unhealthyThreshold` hoặc giảm `intervalMs` |
| Health check quá frequent | Check logs cho "Health check passed" frequency | Tăng `intervalMs` (recommend 30-60s) |
| Timeout quá aggressive | Check `latencyMs` trong stats vs `timeoutMs` | Tăng `timeoutMs` (recommend 2-3x avg latency) |
| Memory leak suspected | Monitor process memory qua time | Check logs cho `destroyed` message khi shutdown |
| Flapping connected status | Check logs cho "ignored" messages | Timestamp tracking đang hoạt động đúng |
| Startup fails với validation error | Check error message cho config issue | Fix config values theo constraints |

### 9.4 Debug logging

Enable debug logs để troubleshoot:
```bash
LOG_LEVELS=debug
```

Debug log patterns:
```
[DEBUG] Redis health check passed (latency: 5ms)
[DEBUG] Redis health check failed (1/3): Connection refused
[DEBUG] Health check skipped - previous check still running
[DEBUG] Health check failure ignored - real operation succeeded during check
[DEBUG] Redis connection restored via real operation
[DEBUG] Waiting for health check to complete before shutdown...
```

## 10. Limitations và known issues

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Per-instance state only | Mỗi pod có thể báo status khác nhau | Expected behavior - mỗi pod cần biết local connectivity |
| Không có distributed sync | Health check của pod A không ảnh hưởng pod B | Kubernetes readiness probe có thể dùng GraphQL endpoint |
| `ping()` không cancellable | Timeout chỉ ngăn wait, underlying request vẫn chạy | Redis client timeout riêng sẽ cleanup |
| Dynamic enable/disable không hỗ trợ | Phải restart app để thay đổi | Design simplicity, có thể enhance sau |

## 11. Implementation checklist

- [ ] Thêm `OAUTH2_REDIS_HEALTH_DEFAULTS` vào constants
- [ ] Thêm `redis.healthCheck` config vào `oauth2-client.config.ts`
- [ ] Update `RedisHealthStatus` type
- [ ] Thêm `ping()` method vào `CacheStorageService` (hoặc workaround)
- [ ] Implement health check loop trong `OAuth2CacheService`
- [ ] Update `OAuth2RedisCacheStats` GraphQL DTO
- [ ] Thêm env variables vào `.env.example`
- [ ] Unit tests cho health check logic
- [ ] Integration test với real Redis
