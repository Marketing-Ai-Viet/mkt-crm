# OAuth2 Client Module

## Tổng quan

Module **oauth2-client** cung cấp OAuth2 client credentials flow để xác thực với MKT Server. Module hỗ trợ hybrid caching (LRU + Redis), distributed lock, rate limiting, circuit breaker pattern và event system cho token lifecycle.

**Vị trí:** `packages/twenty-server/src/mkt-core/oauth2-client/`

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                    GraphQL Management API                        │
│                  OAuth2ManagementResolver                        │
│          (healthCheck, tokenStatus, refresh, invalidate)         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OAuth2HttpService                             │
│           (HTTP client với token injection tự động)              │
│              get, post, put, patch, delete                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OAuth2ClientService                            │
│                (Core service - Token management)                 │
│     getAccessToken, refreshToken, invalidateToken, healthCheck   │
└───────┬─────────────┬─────────────┬─────────────┬───────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐
│   Cache   │ │   Lock    │ │   Rate    │ │   Circuit     │
│  Service  │ │  Service  │ │  Limiter  │ │   Breaker     │
│(LRU+Redis)│ │(Distributed)│ │          │ │               │
└───────────┘ └───────────┘ └───────────┘ └───────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Redis                                     │
│   Token Cache | Distributed Lock | Rate Limit | Circuit State    │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MKT Server                                   │
│                POST /oauth/token                                 │
│              (client_credentials grant)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Cấu trúc thư mục

```
oauth2-client/
├── config/
│   ├── oauth2-client.config.ts      # Configuration factory với env parsing
│   └── oauth2-client.validation.ts  # Zod validation schema
├── constants/
│   ├── oauth2-client.constant.ts    # Default values và enum definitions
│   └── oauth2-client-messages.constant.ts  # Success/error messages
├── dto/
│   └── oauth2-management.output.ts  # GraphQL output types
├── resolvers/
│   └── oauth2-management.resolver.ts # GraphQL queries/mutations
├── services/
│   ├── oauth2-client.service.ts     # Core OAuth2 client logic
│   ├── oauth2-cache.service.ts      # Token caching với LRU + Redis
│   ├── oauth2-http.service.ts       # HTTP client với token injection
│   ├── oauth2-lock.service.ts       # Distributed lock cho sync operations
│   ├── oauth2-rate-limiter.service.ts  # Rate limiting
│   └── oauth2-circuit-breaker.service.ts # Circuit breaker pattern
├── types/
│   ├── oauth2-token.type.ts         # Token và response types
│   ├── oauth2-config.type.ts        # Configuration types
│   ├── oauth2-error.type.ts         # Error definitions
│   ├── oauth2-event.type.ts         # Event types
│   └── oauth2-service.type.ts       # Service-specific types
└── oauth2-client.module.ts          # NestJS module definition
```

## OAuth2 Authentication Flow

### Client Credentials Grant

```
┌─────────────────────────────────────────────────────────────────┐
│                     Token Acquisition Flow                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Client gọi OAuth2HttpService.get/post/...()                 │
│  2. getAccessToken() - Kiểm tra cache                            │
│     ├─ Cache HIT & chưa expiring → Return ngay                  │
│     └─ Cache MISS hoặc expiring → Tiếp tục                      │
│  3. executeWithLock("oauth2:refresh:{clientId}")                │
│     └─ Prevent duplicate requests across instances               │
│  4. Double-check cache (có thể instance khác đã refresh)        │
│  5. fetchNewToken()                                              │
│     ├─ Check Rate Limit                                          │
│     ├─ Execute via Circuit Breaker                               │
│     └─ POST {serverUrl}/oauth/token                             │
│  6. Parse response → OAuth2Token                                 │
│  7. Store in cache (LRU + Redis)                                 │
│  8. Emit TOKEN_ACQUIRED event                                    │
│  9. Inject Bearer token vào Authorization header                 │
│ 10. Execute HTTP request với retry logic                         │
└─────────────────────────────────────────────────────────────────┘
```

### Token Request

```http
POST {serverUrl}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={clientId}
&client_secret={clientSecret}
&scope={scopes}
```

### Token Response

```typescript
type OAuth2Token = {
  accessToken: string;     // Bearer token
  tokenType: string;       // "Bearer"
  expiresIn: number;       // TTL in seconds
  expiresAt: Date;         // Absolute expiration
  scopes: string[];        // Granted scopes
  issuedAt: Date;          // Issue timestamp
};
```

## Token Storage Strategy

### Hybrid Caching (LRU + Redis)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cache Architecture                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────┐    │
│  │    LRU Cache        │    │       Redis Cache            │    │
│  │  (In-Memory)        │    │     (Distributed)            │    │
│  ├─────────────────────┤    ├─────────────────────────────┤    │
│  │ • First-level       │    │ • Second-level              │    │
│  │ • Max 10 tokens     │    │ • Shared across instances   │    │
│  │ • TTL: 1 hour       │    │ • TTL: 1 hour               │    │
│  │ • Fast in-process   │    │ • Key: oauth2-token:token:  │    │
│  │                     │    │        + clientId           │    │
│  └─────────┬───────────┘    └─────────────┬───────────────┘    │
│            │                              │                      │
│            └──────────┬───────────────────┘                      │
│                       │                                          │
│                       ▼                                          │
│            ┌─────────────────────┐                               │
│            │   Fallback Logic    │                               │
│            │ Redis fail → LRU    │                               │
│            └─────────────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Keys

| Key Pattern | Mô tả |
|-------------|-------|
| `oauth2-token:token:{clientId}` | Token data |
| `oauth2:rate-limit:{clientId}` | Rate limit counter |
| `oauth2:circuit-breaker:{clientId}` | Circuit breaker state |
| `oauth2:refresh:{clientId}` | Distributed lock key |

## Event System

### Token Lifecycle Events

```typescript
const OAUTH2_EVENTS = {
  TOKEN_ACQUIRED: 'oauth2.token.acquired',      // Token mới hoặc refresh
  TOKEN_REFRESHED: 'oauth2.token.refreshed',    // Refresh explicitly
  TOKEN_INVALIDATED: 'oauth2.token.invalidated',
  TOKEN_EXPIRED: 'oauth2.token.expired',
};
```

### Token Acquired Event Payload

```typescript
type OAuth2TokenAcquiredEvent = {
  clientId: string;        // OAuth client ID
  scopes: string[];        // Granted scopes
  expiresIn: number;       // TTL in seconds
  isRefresh: boolean;      // true nếu refresh, false nếu initial
  timestamp: Date;         // Event occurrence time
};
```

### Event Listeners

```typescript
// Ví dụ: MktProductSyncService lắng nghe event
@OnEvent(OAUTH2_EVENTS.TOKEN_ACQUIRED)
async onTokenAcquired(event: OAuth2TokenAcquiredEvent) {
  // Trigger product sync khi có token mới
  if (this.shouldSync(event)) {
    await this.syncAllProductsAndPackages();
  }
}
```

## Token Refresh Logic

### Refresh Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    shouldRefresh(token)                          │
├─────────────────────────────────────────────────────────────────┤
│  Token expired (TTL <= 0)?                                       │
│    └─ YES → Refresh ngay                                         │
│                                                                  │
│  Expires within threshold (default 5 minutes)?                   │
│    └─ YES → Refresh proactively                                  │
│                                                                  │
│  Otherwise                                                       │
│    └─ NO → Sử dụng cached token                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Background Refresh

```typescript
// Chạy mỗi 30 giây (configurable)
// Refresh proactively nếu token sắp hết hạn

Background Refresh Loop:
1. Kiểm tra token hiện tại
2. Nếu cần refresh → fetchNewToken()
3. Nếu fail → Exponential backoff
   - Circuit breaker/rate limit: delay * 2^failures
   - Other errors: delay * 1.5^failures
   - Max backoff: 5 minutes
   - Jitter: 0-20%
```

### Startup Initialization

```
┌─────────────────────────────────────────────────────────────────┐
│                  onApplicationBootstrap()                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Detect command mode → Skip nếu đang chạy command            │
│  2. Check credentials configured                                 │
│  3. initializeTokenAndStartRefresh()                            │
│  4. Fetch initial token                                          │
│  5. Start background refresh loop                                │
│  6. Emit TOKEN_ACQUIRED event (isRefresh: false)                │
└─────────────────────────────────────────────────────────────────┘
```

## HTTP Client Service

### OAuth2HttpService

```typescript
// Available methods với automatic token injection
get<T>(url, config?, userContext?): Promise<T>
post<T>(url, data?, config?, userContext?): Promise<T>
put<T>(url, data?, config?, userContext?): Promise<T>
patch<T>(url, data?, config?, userContext?): Promise<T>
delete<T>(url, config?, userContext?): Promise<T>
```

### Token Injection

```typescript
// Tự động inject Authorization header
{
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-User-Id': userContext?.userId,      // Optional
    'X-User-Name': userContext?.userName,  // Optional
  }
}
```

### Retry Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                      Retry Strategy                              │
├─────────────────────────────────────────────────────────────────┤
│  Max retries: 3 (configurable)                                   │
│  Delay: exponential backoff với jitter                           │
│         delay = retryDelayMs * 2^attempt + jitter(0-20%)        │
│                                                                  │
│  Retryable errors:                                               │
│  ├─ 401 Unauthorized → Invalidate token, retry                  │
│  ├─ 408 Request Timeout → Retry                                 │
│  ├─ 429 Too Many Requests → Retry                               │
│  ├─ 5xx Server errors → Retry                                   │
│  └─ ECONNREFUSED, ETIMEDOUT → Retry                             │
│                                                                  │
│  Non-retryable: Most 4xx errors (except above)                  │
└─────────────────────────────────────────────────────────────────┘
```

## Resilience Patterns

### Rate Limiter

```typescript
// Configuration
{
  enabled: true,
  maxAttempts: 10,        // Per window
  windowMs: 60000,        // 1 minute window
  keyPrefix: 'oauth2:rate-limit:',
}

// Flow
1. checkRateLimit() → Throw nếu exceeded
2. recordAttempt() → Increment counter
3. getStatus() → Current state

// Exception
RateLimitException {
  code: 'rate_limit_exceeded',
  httpStatus: 429,
  retryAfterMs: number,
}
```

### Circuit Breaker

```
┌─────────────────────────────────────────────────────────────────┐
│                   Circuit Breaker States                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    failures >= 5    ┌──────────┐                 │
│   │  CLOSED  │ ─────────────────→  │   OPEN   │                 │
│   │ (Normal) │                     │ (Block)  │                 │
│   └────┬─────┘                     └────┬─────┘                 │
│        │                                │                        │
│        │ success                        │ reset timeout (60s)    │
│        │                                │                        │
│        │         ┌───────────┐          │                        │
│        └─────────│ HALF_OPEN │←─────────┘                        │
│                  │ (Testing) │                                   │
│                  └─────┬─────┘                                   │
│                        │                                         │
│              success   │   failure                               │
│                 ↓      │      ↓                                  │
│              CLOSED    │    OPEN                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Configuration:
- failureThreshold: 5
- resetTimeoutMs: 60000 (1 minute)
- halfOpenAttempts: 3
```

### Distributed Lock

```typescript
// Prevent thundering herd problem
// Chỉ 1 instance fetch token tại một thời điểm

Lock Config:
- Key: 'oauth2:refresh:{clientId}'
- TTL: 5 seconds
- Retry: 100ms interval, max 10 retries

Flow:
1. Try acquire lock
2. If acquired → Fetch token
3. If not → Wait and use refreshed token from cache
4. Release lock after operation
```

## Configuration

### Environment Variables

| Category | Variable | Default | Mô tả |
|----------|----------|---------|-------|
| **Server** | `MKT_API_BASE_URL` | http://localhost:3006 | Base URL MKT Server |
| | `OAUTH2_TOKEN_ENDPOINT` | /oauth/token | Token endpoint path |
| **Credentials** | `MKT_OAUTH_CLIENT_ID` | (required) | OAuth client ID |
| | `MKT_OAUTH_CLIENT_SECRET` | (required) | OAuth client secret (min 32 chars) |
| | `MKT_OAUTH_SCOPES` | (empty) | Requested scopes |
| **Cache** | `OAUTH2_CACHE_LRU_MAX` | 10 | Max LRU entries |
| | `OAUTH2_CACHE_LRU_TTL_MS` | 3600000 | LRU TTL (1h) |
| | `OAUTH2_CACHE_REDIS_TTL_SECONDS` | 3600 | Redis TTL (1h) |
| **Refresh** | `OAUTH2_REFRESH_THRESHOLD_SECONDS` | 300 | Refresh trước 5 phút |
| | `OAUTH2_REFRESH_INTERVAL_MS` | 30000 | Background check mỗi 30s |
| **HTTP** | `OAUTH2_HTTP_TIMEOUT_MS` | 10000 | Request timeout (10s) |
| | `OAUTH2_HTTP_MAX_RETRIES` | 3 | Max retry attempts |
| | `OAUTH2_HTTP_RETRY_DELAY_MS` | 1000 | Base retry delay |
| **Rate Limit** | `OAUTH2_RATE_LIMIT_ENABLED` | true | Enable rate limiting |
| | `OAUTH2_RATE_LIMIT_MAX_ATTEMPTS` | 10 | Max attempts per window |
| | `OAUTH2_RATE_LIMIT_WINDOW_MS` | 60000 | Window duration (1m) |
| **Circuit Breaker** | `OAUTH2_CIRCUIT_BREAKER_ENABLED` | true | Enable circuit breaker |
| | `OAUTH2_CIRCUIT_BREAKER_FAILURE_THRESHOLD` | 5 | Failures to open |
| | `OAUTH2_CIRCUIT_BREAKER_RESET_TIMEOUT_MS` | 60000 | Reset timeout (1m) |
| **Startup** | `OAUTH2_SKIP_STARTUP_INIT` | false | Skip initial token fetch |

## GraphQL API

### Queries

```graphql
# Health check toàn diện
query {
  oauth2HealthCheck {
    status          # healthy | degraded | unhealthy
    token {
      valid
      expiresIn
      scopes
    }
    cache {
      lru { size, maxSize }
      redis {
        connected
        latencyMs
        fallbackCount
        consecutiveFailures
      }
    }
    circuitBreaker {
      state           # CLOSED | OPEN | HALF_OPEN
      failureCount
      successCount
      lastFailureTime
      nextRetryTime
    }
    rateLimit {
      enabled
      currentAttempts
      maxAttempts
      isLimited
      retryAfterMs
    }
  }
}

# Token status
query {
  oauth2TokenStatus {
    valid
    expiresIn
    scopes
    issuedAt
  }
}
```

### Mutations

```graphql
# Refresh token manually
mutation {
  oauth2RefreshToken {
    success
    message
    token {
      valid
      expiresIn
      scopes
    }
  }
}

# Invalidate token
mutation {
  oauth2InvalidateToken {
    success
    message
  }
}
```

### Health Status Determination

| Condition | Status |
|-----------|--------|
| Circuit breaker OPEN | `unhealthy` |
| Token invalid OR Circuit breaker HALF_OPEN | `degraded` |
| Otherwise | `healthy` |

## Error Handling

### OAuth2Exception Hierarchy

```typescript
OAuth2Exception (extends HttpException)
├── code: OAuth2ErrorCodeType
├── description?: string
├── httpStatus: HttpStatus

// Specific Exceptions
├── RateLimitException
│   ├── code: 'rate_limit_exceeded'
│   ├── httpStatus: 429
│   └── retryAfterMs: number
│
└── CircuitBreakerOpenException
    ├── code: 'circuit_breaker_open'
    └── httpStatus: 503
```

### Error Codes

| Code | HTTP Status | Mô tả |
|------|-------------|-------|
| `invalid_request` | 400 | Request không hợp lệ |
| `invalid_client` | 401 | Client credentials sai |
| `invalid_grant` | 400 | Grant không hợp lệ |
| `unauthorized_client` | 403 | Client không có quyền |
| `invalid_scope` | 400 | Scope không hợp lệ |
| `server_error` | 500 | Lỗi server |
| `rate_limit_exceeded` | 429 | Vượt quá rate limit |
| `circuit_breaker_open` | 503 | Circuit breaker đang open |
| `token_expired` | 401 | Token đã hết hạn |
| `token_invalid` | 401 | Token không hợp lệ |

## Ví dụ sử dụng

### Sử dụng OAuth2HttpService

```typescript
import { OAuth2HttpService } from 'src/mkt-core/oauth2-client/services';

@Injectable()
export class MyService {
  constructor(private httpService: OAuth2HttpService) {}

  async fetchProducts() {
    // Token được tự động inject vào Authorization header
    const products = await this.httpService.get<Product[]>(
      '/api/oauth/products',
      undefined,
      { userId: 'user-123', userName: 'John' }  // Optional user context
    );
    return products;
  }

  async createOrder(order: CreateOrderDto) {
    return this.httpService.post<Order>(
      '/api/oauth/orders',
      order
    );
  }
}
```

### Lắng nghe Token Events

```typescript
import { OnEvent } from '@nestjs/event-emitter';
import { OAUTH2_EVENTS, OAuth2TokenAcquiredEvent } from 'src/mkt-core/oauth2-client';

@Injectable()
export class MySyncService {
  @OnEvent(OAUTH2_EVENTS.TOKEN_ACQUIRED)
  async onTokenAcquired(event: OAuth2TokenAcquiredEvent) {
    console.log(`Token acquired for client: ${event.clientId}`);
    console.log(`Scopes: ${event.scopes.join(', ')}`);
    console.log(`Is refresh: ${event.isRefresh}`);

    // Trigger sync logic
    if (!event.isRefresh) {
      await this.performInitialSync();
    }
  }
}
```

### Manual Token Management

```typescript
import { OAuth2ClientService } from 'src/mkt-core/oauth2-client/services';

@Injectable()
export class AdminService {
  constructor(private oauth2Service: OAuth2ClientService) {}

  async forceRefreshToken() {
    await this.oauth2Service.invalidateToken();
    const token = await this.oauth2Service.getAccessToken();
    return {
      expiresIn: token.expiresIn,
      scopes: token.scopes,
    };
  }

  async getTokenHealth() {
    return this.oauth2Service.getHealthStatus();
  }
}
```

## Module Exports

```typescript
// Exported services có thể inject ở module khác
exports: [
  OAuth2ClientService,  // Core token management
  OAuth2HttpService,    // HTTP client với auto token injection
]
```

## Dependencies

**Internal:**
- `cache-lock` - Distributed lock service
- `RedisInfrastructureModule` - Redis caching, circuit breaker

**External:**
- `@nestjs/axios` - HTTP client
- `@nestjs/event-emitter` - Event bus
- `@nestjs/config` - Configuration
- `luxon` - Date/time handling
- `zod` - Schema validation
