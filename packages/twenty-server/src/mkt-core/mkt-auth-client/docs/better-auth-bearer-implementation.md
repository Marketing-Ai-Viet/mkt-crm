# MKT Server Authentication - Implementation Guide

## Overview

Tài liệu hướng dẫn CRM Server xác thực với MKT Server sử dụng Better Auth Bearer authentication.

**Capabilities:**
- **GET**: Lấy dữ liệu (products, packages, orders...)
- **POST/PUT/DELETE**: Thay đổi dữ liệu trên MKT Server

**Architecture**: Theo pattern của `oauth2-client` module với Service Composition + Wrapper Pattern.

---

## Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [Known Risks & Mitigations](#known-risks--mitigations)
3. [Folder Structure](#folder-structure)
4. [Configuration](#configuration)
5. [Types](#types)
6. [Services](#services)
7. [Module Definition](#module-definition)
8. [Usage Examples](#usage-examples)
9. [Error Handling](#error-handling)
10. [Observability & Alerting](#observability--alerting)
11. [Security Considerations](#security-considerations)
12. [Environment Variables](#environment-variables)

---

## Authentication Flow

### Basic Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MKT Server Authentication Flow                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CRM Server                                      MKT Server             │
│       │                                               │                 │
│       │  1. POST /api/auth/sign-in/email              │                 │
│       │     Body: { "email": "...", "password": "..." }                 │
│       │──────────────────────────────────────────────►│                 │
│       │                                               │                 │
│       │  2. Response                                  │                 │
│       │     Header: set-auth-token: <token>           │                 │
│       │◄──────────────────────────────────────────────│                 │
│       │                                               │                 │
│       │  3. Cache token (LRU + Redis)                 │                 │
│       │                                               │                 │
│       │  4. GET /api/products                         │                 │
│       │     Header: Authorization: Bearer <token>     │                 │
│       │──────────────────────────────────────────────►│                 │
│       │                                               │                 │
│       │  5. Response: { data: [...] }                 │                 │
│       │◄──────────────────────────────────────────────│                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Token Expiration Handling (No Refresh Token)

Vì Better Auth Bearer **không có cơ chế refresh token**, khi token hết hạn cần **sign-in lại** để lấy token mới.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Token Expiration Handling Flow                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CRM Server                                      MKT Server             │
│       │                                               │                 │
│       │  1. GET /api/products                         │                 │
│       │     Authorization: Bearer <expired-token>     │                 │
│       │──────────────────────────────────────────────►│                 │
│       │                                               │                 │
│       │  2. 401 Unauthorized                          │                 │
│       │◄──────────────────────────────────────────────│                 │
│       │                                               │                 │
│       │  3. Invalidate cached token                   │                 │
│       │                                               │                 │
│       │  4. POST /api/auth/sign-in/email (RE-LOGIN)   │                 │
│       │──────────────────────────────────────────────►│                 │
│       │                                               │                 │
│       │  5. Response: set-auth-token: <new-token>     │                 │
│       │◄──────────────────────────────────────────────│                 │
│       │                                               │                 │
│       │  6. Cache new token                           │                 │
│       │                                               │                 │
│       │  7. RETRY: GET /api/products                  │                 │
│       │     Authorization: Bearer <new-token>         │                 │
│       │──────────────────────────────────────────────►│                 │
│       │                                               │                 │
│       │  8. Response: { data: [...] }                 │                 │
│       │◄──────────────────────────────────────────────│                 │
│                                                                         │
│  IMPORTANT:                                                             │
│  • Chỉ retry 1 lần sau khi re-login                                     │
│  • Nếu vẫn 401 sau re-login → throw MktAuthenticationException          │
│  • Proactive refresh trước khi hết hạn (threshold: 5 phút)              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Token Lifecycle                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Token TTL: 23 hours (buffer before 24h server expiry)                  │
│  Refresh Threshold: 5 minutes                                           │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Token Timeline                                                    │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │                                                                   │   │
│  │  0h        │                    │ 22h55m    │ 23h      │ 24h     │   │
│  │  ├─────────┼────────────────────┼───────────┼──────────┼─────────│   │
│  │  │ Sign-in │    Token Valid     │ Threshold │  Expired │ Server  │   │
│  │  │         │                    │           │ (cache)  │ Expired │   │
│  │  │         │                    │           │          │         │   │
│  │  │         │   ✅ Use cached    │ ⚠️ Proactive│ 🔄 Re-login      │   │
│  │  │         │      token         │   re-login │  on 401  │         │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Strategies:                                                            │
│  1. Proactive: Refresh trước khi hết hạn (< 5 min left)                 │
│  2. Reactive: Re-login khi nhận 401 response                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Quick Reference

| Step | Action | Detail |
|------|--------|--------|
| 1 | Sign-in | `POST /api/auth/sign-in/email` với `{email, password}` |
| 2 | Lấy token | Từ **response header** `set-auth-token` |
| 3 | Cache | LRU (memory) + Redis (distributed) với TTL 23h |
| 4 | Gọi API | Header `Authorization: Bearer <token>` |
| 5 | Proactive refresh | Nếu token còn < 5 phút → re-login trước |
| 6 | Xử lý 401 | Invalidate token → Re-login → Retry 1 lần |

---

## Known Risks & Mitigations

### Risk 1: TTL Mismatch (Client vs Server)

**Vấn đề**: `expiresAt` được suy ra từ `redisTtlMs`, không phải TTL thực từ server.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TTL Mismatch Scenario                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Client estimate:   ├──────── 23h TTL ────────┤                         │
│  Server actual:     ├────── 24h TTL ──────────┤  ✅ OK                  │
│                                                                         │
│  PROBLEM CASES:                                                         │
│  ───────────────                                                        │
│  Client estimate:   ├──────── 23h TTL ────────┤                         │
│  Server actual:     ├─── 12h TTL ───┤            ❌ Token revoked       │
│                                      ▲           trước khi client       │
│                                      │           biết!                  │
│                                 401 Unauthorized                        │
│                                                                         │
│  Nguyên nhân:                                                           │
│  • Server thay đổi TTL policy                                           │
│  • Admin revoke token sớm                                               │
│  • Server restart/token invalidation                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Mitigation**:

1. **Tách `tokenTtlMs` khỏi `redisTtlMs`**: Thêm config `MKT_AUTH_TOKEN_TTL_MS` để đồng bộ với server.
2. **Document server TTL**: Ghi rõ trong config/docs rằng server TTL là cố định (e.g., 24h).
3. **Reactive fallback**: 401 handling luôn là fallback cuối cùng khi proactive không đủ.

```typescript
// Updated config
export const MktAuthTokenConfigSchema = z.object({
  // TTL thực từ server (document từ MKT Server team)
  serverTtlMs: z.number().int().positive().default(24 * 60 * 60 * 1000), // 24h - từ server

  // Buffer trước khi server TTL hết (để proactive refresh)
  bufferMs: z.number().int().positive().default(60 * 60 * 1000), // 1h buffer

  // Threshold để trigger proactive refresh
  refreshThresholdMs: z.number().int().positive().default(5 * 60 * 1000), // 5 min
});

// Computed: redisTtlMs = serverTtlMs - bufferMs = 23h
// Computed: proactive refresh khi còn < refreshThresholdMs
```

### Risk 2: Thundering Herd (Stampede)

**Vấn đề**: Nhiều instances đồng loạt refresh khi threshold giống nhau.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Thundering Herd Problem                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Token expires at: 14:00:00                                             │
│  Threshold: 5 minutes                                                   │
│                                                                         │
│  13:55:00 ─────────────────────────────────────────────────────────────│
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │Instance1│  │Instance2│  │Instance3│  │Instance4│                     │
│  │ Refresh │  │ Refresh │  │ Refresh │  │ Refresh │                     │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                     │
│       │            │            │            │                          │
│       ▼            ▼            ▼            ▼                          │
│  ┌─────────────────────────────────────────────────────┐                │
│  │              MKT Server                              │                │
│  │  4 concurrent sign-in requests! ⚠️                   │                │
│  │  → Rate limit risk                                  │                │
│  │  → Unnecessary load                                 │                │
│  └─────────────────────────────────────────────────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Mitigation**:

1. **Jitter**: Thêm random offset (±30-60s) vào threshold/TTL.
2. **Distributed Lock**: Đã có `RedisLockService` - chỉ 1 instance refresh.
3. **Double-check pattern**: Sau khi acquire lock, check cache lại.

```typescript
// Jitter implementation
export const MktAuthJitterConfigSchema = z.object({
  enabled: z.boolean().default(true),
  minMs: z.number().int().default(30 * 1000),  // 30s
  maxMs: z.number().int().default(60 * 1000),  // 60s
});

// In MktAuthClientService
private getRefreshThresholdWithJitter(): number {
  if (!this.config.jitter.enabled) {
    return this.config.token.refreshThresholdMs;
  }

  const jitterRange = this.config.jitter.maxMs - this.config.jitter.minMs;
  const jitter = Math.random() * jitterRange + this.config.jitter.minMs;

  // Randomly add or subtract jitter
  const sign = Math.random() > 0.5 ? 1 : -1;

  return this.config.token.refreshThresholdMs + (sign * jitter);
}
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    With Jitter + Lock                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Token expires at: 14:00:00                                             │
│  Threshold: 5 min ± 30-60s jitter                                       │
│                                                                         │
│  13:54:15 ──── Instance1 (threshold: 5min + 45s = 5:45)                 │
│       │        → Try refresh, acquire lock ✅                           │
│       │                                                                 │
│  13:55:00 ──── Instance2 (threshold: 5min - 30s = 4:30)                 │
│       │        → Try refresh, lock taken → wait → cache hit ✅          │
│       │                                                                 │
│  13:55:30 ──── Instance3 (threshold: 5min + 15s = 5:15)                 │
│       │        → Try refresh, lock taken → wait → cache hit ✅          │
│       │                                                                 │
│  Result: Only 1 sign-in request to MKT Server!                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Risk 3: Continuous Re-login Failures

**Vấn đề**: Config sai (email/password) → re-login thất bại liên tục → không có alerting.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Continuous Failure Scenario                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Config: MKT_SERVICE_PASSWORD=wrong_password                            │
│                                                                         │
│  Request 1 → 401 → Re-login (fail) → Throw ❌                           │
│  Request 2 → 401 → Re-login (fail) → Throw ❌                           │
│  Request 3 → 401 → Re-login (fail) → Throw ❌                           │
│       ...                                                               │
│  Request N → 401 → Re-login (fail) → Throw ❌                           │
│                                                                         │
│  Problems:                                                              │
│  • Mỗi request đều cố sign-in → spam MKT Server                         │
│  • Không có circuit breaker                                             │
│  • Không có alerting → dev không biết config sai                        │
│  • User nhận lỗi liên tục                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Mitigation**:

1. **Circuit Breaker**: Sau N lần re-login fail liên tục → circuit open → fast fail.
2. **Metrics**: Track số lần re-login, success rate, 401 rate.
3. **Alerting**: Alert khi re-login failure rate > threshold.
4. **Backoff**: Exponential backoff giữa các lần re-login.

```typescript
// Circuit breaker config
export const MktAuthCircuitBreakerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  failureThreshold: z.number().int().positive().default(5),   // Open after 5 failures
  resetTimeoutMs: z.number().int().positive().default(60000), // Try again after 1 min
  halfOpenMaxAttempts: z.number().int().positive().default(1), // 1 attempt in half-open
});

// Circuit breaker states
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// In MktAuthClientService
private circuitState: CircuitState = 'CLOSED';
private consecutiveFailures = 0;
private circuitOpenedAt: string | null = null;

private async signInWithCircuitBreaker(): Promise<string> {
  // Check circuit state
  if (this.circuitState === 'OPEN') {
    const openedAt = DateTimeUtils.fromISO(this.circuitOpenedAt!);
    const now = DateTimeUtils.now();
    const elapsedMs = DateTimeUtils.toMillis(now) - DateTimeUtils.toMillis(openedAt);

    if (elapsedMs < this.config.circuitBreaker.resetTimeoutMs) {
      // Circuit still open - fast fail
      this.metrics.circuitBreakerRejections.inc();
      throw new MktAuthenticationException(
        'Circuit breaker OPEN - authentication temporarily disabled. ' +
        'Please check MKT_SERVICE_EMAIL and MKT_SERVICE_PASSWORD.',
      );
    }

    // Try half-open
    this.circuitState = 'HALF_OPEN';
    this.logger.warn('Circuit breaker transitioning to HALF_OPEN');
  }

  try {
    const token = await this.signIn();

    // Success - reset circuit
    this.circuitState = 'CLOSED';
    this.consecutiveFailures = 0;
    this.circuitOpenedAt = null;

    return token;
  } catch (error) {
    this.consecutiveFailures++;
    this.metrics.authFailures.inc();

    // Check if should open circuit
    if (this.consecutiveFailures >= this.config.circuitBreaker.failureThreshold) {
      this.circuitState = 'OPEN';
      this.circuitOpenedAt = DateTimeUtils.toISO(DateTimeUtils.now());
      this.logger.error(
        `Circuit breaker OPEN after ${this.consecutiveFailures} consecutive failures`,
      );
      this.metrics.circuitBreakerOpened.inc();
    }

    throw error;
  }
}
```

### Risk Summary & Mitigations

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Risk Summary                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Risk                    │ Severity │ Mitigation                        │
│  ────────────────────────┼──────────┼──────────────────────────────────│
│  TTL Mismatch            │ Medium   │ Separate tokenTtlMs config        │
│                          │          │ Document server TTL               │
│                          │          │ 401 reactive fallback             │
│  ────────────────────────┼──────────┼──────────────────────────────────│
│  Thundering Herd         │ Medium   │ Jitter (±30-60s)                  │
│                          │          │ Distributed lock                  │
│                          │          │ Double-check after lock           │
│  ────────────────────────┼──────────┼──────────────────────────────────│
│  Continuous Re-login     │ High     │ Circuit breaker                   │
│  Failures                │          │ Metrics + Alerting                │
│                          │          │ Exponential backoff               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
packages/twenty-server/src/mkt-core/mkt-auth-client/
├── config/                              # Configuration with Zod validation
│   ├── index.ts
│   ├── mkt-auth-client.config.ts       # registerAs config
│   └── mkt-auth-client.validation.ts   # Zod schemas
├── constants/                           # Constants & defaults
│   ├── index.ts
│   ├── mkt-auth-client.constant.ts     # Default values
│   └── mkt-auth-client-messages.constant.ts  # Error/success messages
├── types/                               # TypeScript type definitions
│   ├── index.ts
│   ├── mkt-auth-token.type.ts          # Token types
│   ├── mkt-auth-config.type.ts         # Config types
│   ├── mkt-auth-error.type.ts          # Error types
│   └── mkt-auth-event.type.ts          # Event types
├── services/                            # Core services
│   ├── index.ts
│   ├── mkt-auth-client.service.ts      # Main facade (token management)
│   ├── mkt-auth-http.service.ts        # HTTP client with Bearer token
│   ├── mkt-auth-cache.service.ts       # Token caching wrapper
│   └── mkt-auth-lock.service.ts        # Distributed lock wrapper
├── dto/                                 # GraphQL DTOs (optional)
│   ├── index.ts
│   └── mkt-auth-management.output.ts
├── resolvers/                           # GraphQL resolvers (optional)
│   ├── index.ts
│   └── mkt-auth-management.resolver.ts
└── mkt-auth-client.module.ts           # NestJS module
```

---

## Configuration

### Zod Validation Schema

```typescript
// config/mkt-auth-client.validation.ts

import { z } from 'zod';

/**
 * Cache configuration
 * Note: Đây là single-token cache, không phải LRU cache
 * vì mỗi service chỉ cần cache 1 token tại một thời điểm
 */
export const MktAuthCacheConfigSchema = z.object({
  // Local in-memory cache TTL (shorter than Redis for freshness)
  localTtlMs: z.number().int().positive().default(60 * 60 * 1000), // 1 hour
});

/**
 * Token TTL configuration - TÁCH RIÊNG khỏi Redis TTL
 * Document: MKT Server token TTL = 24 hours (fixed)
 */
export const MktAuthTokenConfigSchema = z.object({
  // TTL thực từ MKT Server (phải confirm với MKT Server team)
  serverTtlMs: z.number().int().positive().default(24 * 60 * 60 * 1000), // 24h

  // Buffer trước khi server TTL hết (redisTtlMs = serverTtlMs - bufferMs)
  bufferMs: z.number().int().positive().default(60 * 60 * 1000), // 1h buffer

  // Threshold để trigger proactive refresh (trước khi token hết hạn)
  refreshThresholdMs: z.number().int().positive().default(5 * 60 * 1000), // 5 min
});

/**
 * Jitter configuration - GIẢM Thundering Herd
 */
export const MktAuthJitterConfigSchema = z.object({
  enabled: z.boolean().default(true),
  minMs: z.number().int().nonnegative().default(30 * 1000),  // 30s
  maxMs: z.number().int().positive().default(60 * 1000),     // 60s
});

/**
 * Circuit Breaker configuration - NGĂN continuous re-login failures
 */
export const MktAuthCircuitBreakerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  failureThreshold: z.number().int().positive().default(5),      // Open after 5 failures
  resetTimeoutMs: z.number().int().positive().default(60 * 1000), // Try again after 1 min
  halfOpenMaxAttempts: z.number().int().positive().default(1),   // 1 attempt in half-open
});

/**
 * Backoff configuration - Used for BOTH:
 * 1. Sign-in retries (MktAuthClientService.fetchToken)
 * 2. HTTP 5xx/429 retries (MktAuthHttpService.handleServerError/handleRateLimit)
 */
export const MktAuthRefreshConfigSchema = z.object({
  maxRetries: z.number().int().nonnegative().default(3),
  initialBackoffMs: z.number().int().positive().default(1000),  // 1s
  maxBackoffMs: z.number().int().positive().default(30000),     // 30s
  backoffMultiplier: z.number().positive().default(2),          // exponential
});

export const MktAuthHttpConfigSchema = z.object({
  timeoutMs: z.number().int().positive().default(10000),
  maxRedirects: z.number().int().nonnegative().default(5),
  retryAttempts: z.number().int().nonnegative().default(3),
});

export const MktAuthLockConfigSchema = z.object({
  timeoutMs: z.number().int().positive().default(10000),
  maxWaitMs: z.number().int().positive().default(5000),
  retryIntervalMs: z.number().int().positive().default(100),
});

export const MktAuthStartupConfigSchema = z.object({
  skipInit: z.boolean().default(false),
});

export const MktAuthClientConfigSchema = z.object({
  serverUrl: z.string().url(),
  serviceEmail: z.string().email(),
  servicePassword: z.string().min(1),
  cache: MktAuthCacheConfigSchema.default({}),
  token: MktAuthTokenConfigSchema.default({}),
  jitter: MktAuthJitterConfigSchema.default({}),
  circuitBreaker: MktAuthCircuitBreakerConfigSchema.default({}),
  refresh: MktAuthRefreshConfigSchema.default({}),
  http: MktAuthHttpConfigSchema.default({}),
  lock: MktAuthLockConfigSchema.default({}),
  startup: MktAuthStartupConfigSchema.default({}),
});

export type MktAuthClientConfig = z.infer<typeof MktAuthClientConfigSchema>;
export type MktAuthCacheConfig = z.infer<typeof MktAuthCacheConfigSchema>;
export type MktAuthTokenConfig = z.infer<typeof MktAuthTokenConfigSchema>;
export type MktAuthJitterConfig = z.infer<typeof MktAuthJitterConfigSchema>;
export type MktAuthCircuitBreakerConfig = z.infer<typeof MktAuthCircuitBreakerConfigSchema>;
export type MktAuthRefreshConfig = z.infer<typeof MktAuthRefreshConfigSchema>;
export type MktAuthHttpConfig = z.infer<typeof MktAuthHttpConfigSchema>;
export type MktAuthLockConfig = z.infer<typeof MktAuthLockConfigSchema>;
export type MktAuthStartupConfig = z.infer<typeof MktAuthStartupConfigSchema>;
```

### Config Registration

```typescript
// config/mkt-auth-client.config.ts

import { registerAs } from '@nestjs/config';

import {
  MktAuthClientConfigSchema,
  MktAuthClientConfig,
} from './mkt-auth-client.validation';

export const MKT_AUTH_CLIENT_CONFIG_KEY = 'mktAuthClient';

export const mktAuthClientConfig = registerAs(
  MKT_AUTH_CLIENT_CONFIG_KEY,
  (): MktAuthClientConfig => {
    const rawConfig = {
      serverUrl: process.env.MKT_SERVER_URL,
      serviceEmail: process.env.MKT_SERVICE_EMAIL,
      servicePassword: process.env.MKT_SERVICE_PASSWORD,
      cache: {
        // Local in-memory cache TTL (single token, not LRU)
        localTtlMs: parseInt(process.env.MKT_AUTH_CACHE_LOCAL_TTL_MS || '3600000', 10), // 1h
      },
      // Token TTL - tách riêng khỏi Redis TTL
      token: {
        serverTtlMs: parseInt(process.env.MKT_AUTH_TOKEN_SERVER_TTL_MS || '86400000', 10), // 24h
        bufferMs: parseInt(process.env.MKT_AUTH_TOKEN_BUFFER_MS || '3600000', 10),         // 1h
        refreshThresholdMs: parseInt(process.env.MKT_AUTH_REFRESH_THRESHOLD_MS || '300000', 10), // 5min
      },
      // Jitter - giảm thundering herd
      jitter: {
        enabled: process.env.MKT_AUTH_JITTER_ENABLED !== 'false',
        minMs: parseInt(process.env.MKT_AUTH_JITTER_MIN_MS || '30000', 10),   // 30s
        maxMs: parseInt(process.env.MKT_AUTH_JITTER_MAX_MS || '60000', 10),   // 60s
      },
      // Circuit breaker - ngăn continuous failures
      circuitBreaker: {
        enabled: process.env.MKT_AUTH_CIRCUIT_BREAKER_ENABLED !== 'false',
        failureThreshold: parseInt(process.env.MKT_AUTH_CB_FAILURE_THRESHOLD || '5', 10),
        resetTimeoutMs: parseInt(process.env.MKT_AUTH_CB_RESET_TIMEOUT_MS || '60000', 10),
        halfOpenMaxAttempts: parseInt(process.env.MKT_AUTH_CB_HALF_OPEN_ATTEMPTS || '1', 10),
      },
      refresh: {
        maxRetries: parseInt(process.env.MKT_AUTH_REFRESH_MAX_RETRIES || '3', 10),
        initialBackoffMs: parseInt(process.env.MKT_AUTH_REFRESH_INITIAL_BACKOFF_MS || '1000', 10),
        maxBackoffMs: parseInt(process.env.MKT_AUTH_REFRESH_MAX_BACKOFF_MS || '30000', 10),
        backoffMultiplier: parseFloat(process.env.MKT_AUTH_REFRESH_BACKOFF_MULTIPLIER || '2'),
      },
      http: {
        timeoutMs: parseInt(process.env.MKT_AUTH_HTTP_TIMEOUT_MS || '10000', 10),
        maxRedirects: parseInt(process.env.MKT_AUTH_HTTP_MAX_REDIRECTS || '5', 10),
        retryAttempts: parseInt(process.env.MKT_AUTH_HTTP_RETRY_ATTEMPTS || '3', 10),
      },
      lock: {
        timeoutMs: parseInt(process.env.MKT_AUTH_LOCK_TIMEOUT_MS || '10000', 10),
        maxWaitMs: parseInt(process.env.MKT_AUTH_LOCK_MAX_WAIT_MS || '5000', 10),
        retryIntervalMs: parseInt(process.env.MKT_AUTH_LOCK_RETRY_INTERVAL_MS || '100', 10),
      },
      startup: {
        skipInit: process.env.MKT_AUTH_SKIP_STARTUP_INIT === 'true',
      },
    };

    // Validate with Zod
    const result = MktAuthClientConfigSchema.safeParse(rawConfig);

    if (!result.success) {
      const errors = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Invalid MKT Auth Client config: ${errors}`);
    }

    return result.data;
  },
);
```

---

## Types

### Token Types

```typescript
// types/mkt-auth-token.type.ts

/**
 * Sign-in response từ MKT Server
 */
export type MktAuthSignInResponse = {
  redirect: boolean;
  token: string;
  user: MktAuthUser;
};

export type MktAuthUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Cached token data
 */
export type MktAuthToken = {
  accessToken: string;
  user: MktAuthUser;
  issuedAt: string;  // ISO string
  expiresAt: string; // ISO string
};

/**
 * Token metadata for clients
 */
export type MktAuthTokenMetadata = {
  isValid: boolean;
  expiresInMs: number;
  userEmail: string;
  issuedAt: string;
};
```

### Error Types

```typescript
// types/mkt-auth-error.type.ts

export const MKT_AUTH_ERROR_CODE = {
  AUTHENTICATION_FAILED: 'MKT_AUTH_AUTHENTICATION_FAILED',
  AUTHORIZATION_DENIED: 'MKT_AUTH_AUTHORIZATION_DENIED',
  NOT_FOUND: 'MKT_AUTH_NOT_FOUND',
  RATE_LIMITED: 'MKT_AUTH_RATE_LIMITED',
  SERVER_UNAVAILABLE: 'MKT_AUTH_SERVER_UNAVAILABLE',
  CONFIGURATION_ERROR: 'MKT_AUTH_CONFIGURATION_ERROR',
  LOCK_ACQUISITION_FAILED: 'MKT_AUTH_LOCK_ACQUISITION_FAILED',
  TOKEN_EXPIRED: 'MKT_AUTH_TOKEN_EXPIRED',
  NETWORK_ERROR: 'MKT_AUTH_NETWORK_ERROR',
} as const;

export type MktAuthErrorCode = typeof MKT_AUTH_ERROR_CODE[keyof typeof MKT_AUTH_ERROR_CODE];

/**
 * Base exception class
 */
export class MktAuthException extends Error {
  constructor(
    message: string,
    public readonly code: MktAuthErrorCode,
    public readonly statusCode?: number,
    public readonly retryable = false,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'MktAuthException';
  }
}

/**
 * Authentication failed (401)
 */
export class MktAuthenticationException extends MktAuthException {
  constructor(message = 'Authentication with MKT Server failed') {
    super(message, MKT_AUTH_ERROR_CODE.AUTHENTICATION_FAILED, 401, true);
    this.name = 'MktAuthenticationException';
  }
}

/**
 * Authorization denied (403)
 */
export class MktAuthorizationException extends MktAuthException {
  constructor(message = 'Not authorized to access this resource') {
    super(message, MKT_AUTH_ERROR_CODE.AUTHORIZATION_DENIED, 403, false);
    this.name = 'MktAuthorizationException';
  }
}

/**
 * Resource not found (404)
 */
export class MktNotFoundException extends MktAuthException {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, MKT_AUTH_ERROR_CODE.NOT_FOUND, 404, false);
    this.name = 'MktNotFoundException';
  }
}

/**
 * Rate limited (429)
 */
export class MktRateLimitException extends MktAuthException {
  constructor(retryAfterMs?: number) {
    super('Rate limit exceeded', MKT_AUTH_ERROR_CODE.RATE_LIMITED, 429, true, retryAfterMs);
    this.name = 'MktRateLimitException';
  }
}

/**
 * Server unavailable (5xx)
 */
export class MktServerUnavailableException extends MktAuthException {
  constructor(message = 'MKT Server is unavailable') {
    super(message, MKT_AUTH_ERROR_CODE.SERVER_UNAVAILABLE, 503, true);
    this.name = 'MktServerUnavailableException';
  }
}

/**
 * Configuration error
 */
export class MktConfigurationException extends MktAuthException {
  constructor(message: string) {
    super(message, MKT_AUTH_ERROR_CODE.CONFIGURATION_ERROR, undefined, false);
    this.name = 'MktConfigurationException';
  }
}
```

### Event Types

```typescript
// types/mkt-auth-event.type.ts

export const MKT_AUTH_EVENTS = {
  TOKEN_ACQUIRED: 'mkt-auth.token.acquired',
  TOKEN_REFRESHED: 'mkt-auth.token.refreshed',
  TOKEN_INVALIDATED: 'mkt-auth.token.invalidated',
  AUTH_FAILED: 'mkt-auth.auth.failed',
} as const;

export type MktAuthEventName = typeof MKT_AUTH_EVENTS[keyof typeof MKT_AUTH_EVENTS];

/**
 * Event emitted when token is acquired or refreshed
 */
export type MktAuthTokenAcquiredEvent = {
  userEmail: string;
  expiresInMs: number;
  isRefresh: boolean;
  timestamp: string;
};

/**
 * Event emitted when token is invalidated
 */
export type MktAuthTokenInvalidatedEvent = {
  reason: 'manual' | 'expired' | '401_response' | 'circuit_breaker';
  previousUserEmail?: string;
  timestamp: string;
};

/**
 * Event emitted when authentication fails
 */
export type MktAuthFailedEvent = {
  reason: string;
  attemptNumber: number;
  willRetry: boolean;
  timestamp: string;
};
```

---

## Constants

```typescript
// constants/mkt-auth-client.constant.ts

export const MKT_AUTH_DEFAULTS = {
  // Token TTL defaults (confirm với MKT Server team)
  TOKEN_SERVER_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours (từ server)
  TOKEN_BUFFER_MS: 60 * 60 * 1000,          // 1 hour buffer
  TOKEN_REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // 5 minutes

  // Cache defaults (single-token cache, không phải LRU)
  CACHE_LOCAL_TTL_MS: 60 * 60 * 1000, // 1 hour local in-memory TTL

  // Jitter defaults (giảm thundering herd)
  JITTER_ENABLED: true,
  JITTER_MIN_MS: 30 * 1000, // 30 seconds
  JITTER_MAX_MS: 60 * 1000, // 60 seconds

  // Circuit breaker defaults
  CIRCUIT_BREAKER_ENABLED: true,
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: 5,
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: 60 * 1000, // 1 minute
  CIRCUIT_BREAKER_HALF_OPEN_ATTEMPTS: 1,

  // Backoff defaults (used for BOTH sign-in retries AND 5xx/429 HTTP retries)
  // See: MktAuthClientService.fetchToken() and MktAuthHttpService.handleServerError()
  BACKOFF_MAX_RETRIES: 3,
  BACKOFF_INITIAL_MS: 1000,
  BACKOFF_MAX_MS: 30000,
  BACKOFF_MULTIPLIER: 2,

  // HTTP defaults
  HTTP_TIMEOUT_MS: 10000,
  HTTP_MAX_REDIRECTS: 5,
  HTTP_RETRY_ATTEMPTS: 3, // Same as BACKOFF_MAX_RETRIES for consistency

  // Lock defaults
  LOCK_TIMEOUT_MS: 10000,
  LOCK_MAX_WAIT_MS: 5000,
  LOCK_RETRY_INTERVAL_MS: 100,
} as const;

/**
 * Compute redisTtlMs from server TTL and buffer
 * redisTtlMs = serverTtlMs - bufferMs
 *
 * Example: 24h server - 1h buffer = 23h redis TTL
 */
export const computeRedisTtlMs = (serverTtlMs: number, bufferMs: number): number =>
  serverTtlMs - bufferMs;

export const MKT_AUTH_CACHE_KEYS = {
  TOKEN: 'mkt-auth:token',
  LOCK: 'mkt-auth:lock',
} as const;

export const MKT_AUTH_LOG_CONTEXT = 'MktAuthClient';
```

### Messages

```typescript
// constants/mkt-auth-client-messages.constant.ts

export const MKT_AUTH_MESSAGES = {
  // Success messages
  SUCCESS: {
    TOKEN_ACQUIRED: 'Token acquired successfully',
    TOKEN_REFRESHED: 'Token refreshed successfully',
    TOKEN_INVALIDATED: 'Token invalidated successfully',
    INITIALIZED: 'MKT Auth Client initialized successfully',
  },

  // Error messages
  ERROR: {
    MISSING_CONFIG: 'Missing required configuration',
    HTTPS_REQUIRED: 'MKT_SERVER_URL must use HTTPS in production',
    NO_TOKEN_HEADER: 'No set-auth-token header in response',
    SIGN_IN_FAILED: 'Sign-in to MKT Server failed',
    TOKEN_EXPIRED: 'Token has expired',
    LOCK_FAILED: 'Failed to acquire distributed lock',
    NOT_INITIALIZED: 'MKT Auth Client not initialized',
  },

  // Log messages
  LOG: {
    SIGNING_IN: 'Signing in to MKT Server...',
    REFRESHING_TOKEN: 'Refreshing authentication token...',
    LOADING_FROM_CACHE: 'Loading token from cache...',
    SAVING_TO_CACHE: 'Saving token to cache...',
    SKIPPING_INIT: 'Skipping initialization (startup.skipInit=true)',
    COMMAND_MODE: 'Skipping initialization (command mode)',
  },
} as const;
```

---

## Services

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Service Composition Architecture                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  MktAuthClientService (Main Facade)                                     │
│       │                                                                 │
│       ├── MktAuthCacheService (Token storage - wraps RedisCacheService) │
│       │                                                                 │
│       ├── MktAuthLockService (Distributed lock - wraps RedisLockService)│
│       │                                                                 │
│       ├── HttpService (@nestjs/axios)                                   │
│       │                                                                 │
│       └── EventEmitter2 (Event bus)                                     │
│                                                                         │
│  MktAuthHttpService (Authenticated HTTP client)                         │
│       │                                                                 │
│       ├── MktAuthClientService (Token provider)                         │
│       │                                                                 │
│       └── HttpService (@nestjs/axios)                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### MktAuthCacheService (Wrapper)

```typescript
// services/mkt-auth-cache.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonParse, safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { RedisCacheService } from 'src/mkt-core/infrastructure/redis/services/redis-cache.service';
import { MKT_AUTH_LOG_CONTEXT, MKT_AUTH_CACHE_KEYS } from '../constants';
import { MktAuthClientConfig } from '../config/mkt-auth-client.validation';
import { MKT_AUTH_CLIENT_CONFIG_KEY } from '../config/mkt-auth-client.config';
import { MktAuthToken } from '../types';
import { MktAuthMetricsService } from './mkt-auth-metrics.service';

@Injectable()
export class MktAuthCacheService {
  private readonly logger = new Logger(`${MKT_AUTH_LOG_CONTEXT}:Cache`);
  private readonly config: MktAuthClientConfig;

  // Computed: redisTtlMs = serverTtlMs - bufferMs
  private readonly redisTtlMs: number;

  // Local in-memory cache (single token, not LRU - chỉ có 1 token per service)
  // Note: lruMax config đã được remove vì không cần thiết cho single token cache
  private localCache: MktAuthToken | null = null;
  private localCacheExpiresAt: number | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisCacheService: RedisCacheService,
    private readonly metricsService: MktAuthMetricsService,
  ) {
    this.config = this.configService.getOrThrow<MktAuthClientConfig>(
      MKT_AUTH_CLIENT_CONFIG_KEY,
    );

    // Compute redisTtlMs from token config
    this.redisTtlMs = this.config.token.serverTtlMs - this.config.token.bufferMs;
    this.logger.debug(`Computed redisTtlMs: ${this.redisTtlMs}ms (server: ${this.config.token.serverTtlMs}ms - buffer: ${this.config.token.bufferMs}ms)`);
  }

  /**
   * Get token from cache (local first, then Redis)
   */
  async get(): Promise<MktAuthToken | null> {
    // Check local in-memory cache first
    if (this.localCache && this.localCacheExpiresAt) {
      const now = DateTimeUtils.toMillis(DateTimeUtils.now());

      if (now < this.localCacheExpiresAt) {
        this.logger.debug('Cache HIT (local)');
        this.metricsService.tokenCacheHits.inc({ layer: 'local' });
        return this.localCache;
      }

      // Local cache expired
      this.localCache = null;
      this.localCacheExpiresAt = null;
    }

    // Try Redis
    try {
      const cached = await this.redisCacheService.get(MKT_AUTH_CACHE_KEYS.TOKEN);

      if (!cached) {
        this.logger.debug('Cache MISS (both local and Redis)');
        this.metricsService.tokenCacheMisses.inc();
        return null;
      }

      const cachedString = typeof cached === 'string' ? cached : safeJsonStringify(cached);
      const parseResult = safeJsonParse<MktAuthToken>(cachedString, {
        logger: this.logger,
        context: 'Parse cached token',
      });

      if (!parseResult.success) {
        this.metricsService.tokenCacheMisses.inc();
        return null;
      }

      const token = parseResult.data;

      // Validate token expiration
      if (this.isTokenExpired(token)) {
        this.logger.debug('Cached token expired');
        await this.delete();
        this.metricsService.tokenCacheMisses.inc();
        return null;
      }

      // Populate local cache
      this.setLocalCache(token);
      this.logger.debug('Cache HIT (Redis)');
      this.metricsService.tokenCacheHits.inc({ layer: 'redis' });

      return token;
    } catch (error) {
      this.logger.warn('Failed to get token from Redis cache', error);
      this.metricsService.tokenCacheMisses.inc();
      return null;
    }
  }

  /**
   * Set token in cache (both local and Redis)
   */
  async set(token: MktAuthToken): Promise<void> {
    // Set local in-memory cache
    this.setLocalCache(token);

    // Set Redis cache with computed TTL
    try {
      const jsonData = safeJsonStringify(token, {
        logger: this.logger,
        context: 'Stringify token for cache',
      });

      if (jsonData) {
        await this.redisCacheService.set(
          MKT_AUTH_CACHE_KEYS.TOKEN,
          jsonData,
          this.redisTtlMs, // Use computed TTL
        );
        this.logger.debug(`Token saved to Redis cache (TTL: ${this.redisTtlMs}ms)`);
      }
    } catch (error) {
      this.logger.warn('Failed to save token to Redis cache', error);
    }
  }

  /**
   * Delete token from cache
   */
  async delete(): Promise<void> {
    this.localCache = null;
    this.localCacheExpiresAt = null;

    try {
      await this.redisCacheService.delete(MKT_AUTH_CACHE_KEYS.TOKEN);
      this.logger.debug('Token deleted from cache');
    } catch (error) {
      this.logger.warn('Failed to delete token from Redis cache', error);
    }
  }

  /**
   * Get computed Redis TTL (for external use)
   */
  getRedisTtlMs(): number {
    return this.redisTtlMs;
  }

  /**
   * Check if cached token is about to expire
   */
  isExpiringSoon(token: MktAuthToken, thresholdMs: number): boolean {
    const expiresAt = DateTimeUtils.fromISO(token.expiresAt);
    const now = DateTimeUtils.now();
    const threshold = DateTimeUtils.add(now, { milliseconds: thresholdMs });

    return DateTimeUtils.toMillis(expiresAt) <= DateTimeUtils.toMillis(threshold);
  }

  private setLocalCache(token: MktAuthToken): void {
    this.localCache = token;
    // Use cache.localTtlMs for local in-memory cache TTL
    this.localCacheExpiresAt = DateTimeUtils.toMillis(DateTimeUtils.now()) + this.config.cache.localTtlMs;
  }

  private isTokenExpired(token: MktAuthToken): boolean {
    const expiresAt = DateTimeUtils.fromISO(token.expiresAt);
    const now = DateTimeUtils.now();

    return DateTimeUtils.toMillis(now) >= DateTimeUtils.toMillis(expiresAt);
  }
}
```

### MktAuthLockService (Wrapper)

```typescript
// services/mkt-auth-lock.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisLockService } from 'src/mkt-core/infrastructure/redis/services/redis-lock.service';
import { MKT_AUTH_LOG_CONTEXT, MKT_AUTH_CACHE_KEYS } from '../constants';
import { MktAuthClientConfig } from '../config/mkt-auth-client.validation';
import { MKT_AUTH_CLIENT_CONFIG_KEY } from '../config/mkt-auth-client.config';

@Injectable()
export class MktAuthLockService {
  private readonly logger = new Logger(`${MKT_AUTH_LOG_CONTEXT}:Lock`);
  private readonly config: MktAuthClientConfig['lock'];

  constructor(
    private readonly configService: ConfigService,
    private readonly redisLockService: RedisLockService,
  ) {
    this.config = this.configService.getOrThrow<MktAuthClientConfig>(
      MKT_AUTH_CLIENT_CONFIG_KEY,
    ).lock;
  }

  /**
   * Execute operation with distributed lock
   * Uses tryWithLock pattern - returns null if lock not acquired
   */
  async withLock<T>(operation: () => Promise<T>): Promise<T | null> {
    return this.redisLockService.tryWithLock<T>(
      MKT_AUTH_CACHE_KEYS.LOCK,
      operation,
      {
        timeoutMs: this.config.timeoutMs,
        maxWaitMs: this.config.maxWaitMs,
        retryIntervalMs: this.config.retryIntervalMs,
      },
    );
  }

  /**
   * Execute operation with distributed lock - throws if lock not acquired
   */
  async withLockRequired<T>(operation: () => Promise<T>): Promise<T> {
    return this.redisLockService.withLock<T>(
      MKT_AUTH_CACHE_KEYS.LOCK,
      operation,
      {
        timeoutMs: this.config.timeoutMs,
        maxWaitMs: this.config.maxWaitMs,
        retryIntervalMs: this.config.retryIntervalMs,
      },
    );
  }
}
```

### MktAuthClientService (Main Facade)

```typescript
// services/mkt-auth-client.service.ts

import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom } from 'rxjs';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MktAuthCacheService } from './mkt-auth-cache.service';
import { MktAuthLockService } from './mkt-auth-lock.service';
import { MktAuthClientConfig } from '../config/mkt-auth-client.validation';
import { MKT_AUTH_CLIENT_CONFIG_KEY } from '../config/mkt-auth-client.config';
import {
  MKT_AUTH_LOG_CONTEXT,
  MKT_AUTH_MESSAGES,
} from '../constants';
import {
  MktAuthToken,
  MktAuthTokenMetadata,
  MktAuthSignInResponse,
} from '../types';
import {
  MktAuthenticationException,
  MktConfigurationException,
  MktServerUnavailableException,
} from '../types/mkt-auth-error.type';
import { MKT_AUTH_EVENTS, MktAuthTokenAcquiredEvent } from '../types/mkt-auth-event.type';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

@Injectable()
export class MktAuthClientService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MKT_AUTH_LOG_CONTEXT);
  private readonly config: MktAuthClientConfig;

  private initializationError: Error | null = null;
  private isInitialized = false;

  // Circuit breaker state
  private circuitState: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private circuitOpenedAt: string | null = null;
  private halfOpenAttempts = 0; // Track attempts trong HALF_OPEN state

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cacheService: MktAuthCacheService,
    private readonly lockService: MktAuthLockService,
    private readonly eventEmitter: EventEmitter2,
    private readonly metricsService: MktAuthMetricsService, // Optional: for metrics
  ) {
    this.config = this.configService.getOrThrow<MktAuthClientConfig>(
      MKT_AUTH_CLIENT_CONFIG_KEY,
    );
  }

  // ============================================
  // PUBLIC GETTERS (for health check)
  // ============================================

  getCircuitBreakerState(): CircuitState {
    return this.circuitState;
  }

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async onApplicationBootstrap(): Promise<void> {
    // Skip if configured
    if (this.config.startup.skipInit) {
      this.logger.log(MKT_AUTH_MESSAGES.LOG.SKIPPING_INIT);
      return;
    }

    // Skip in command mode (database:reset, etc.)
    if (this.isCommandMode()) {
      this.logger.log(MKT_AUTH_MESSAGES.LOG.COMMAND_MODE);
      return;
    }

    try {
      this.validateConfig();
      await this.fetchToken(false);
      this.isInitialized = true;
      this.logger.log(MKT_AUTH_MESSAGES.SUCCESS.INITIALIZED);
    } catch (error) {
      this.initializationError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to initialize MKT Auth Client', error);
    }
  }

  onModuleDestroy(): void {
    this.logger.debug('MKT Auth Client destroyed');
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Get access token (cached or fresh)
   *
   * Note: Nếu bootstrap fail, method này sẽ TRY AGAIN thay vì block vĩnh viễn.
   * Circuit breaker sẽ handle trường hợp fail liên tục.
   */
  async getAccessToken(): Promise<string> {
    // Check circuit breaker FIRST (trước khi thử bất cứ gì)
    if (this.config.circuitBreaker.enabled) {
      this.checkCircuitBreaker();
    }

    // Nếu có initialization error nhưng circuit breaker cho phép retry
    // → clear error và thử lại (thay vì block vĩnh viễn)
    if (this.initializationError && !this.isInitialized) {
      this.logger.warn(
        `Previous initialization failed: ${this.initializationError.message}. ` +
        `Attempting retry...`,
      );
      // Clear error để cho phép retry
      this.initializationError = null;
    }

    // Try to get from cache
    const cached = await this.cacheService.get();

    if (cached) {
      // Check if expiring soon (with jitter)
      const threshold = this.getRefreshThresholdWithJitter();

      if (this.cacheService.isExpiringSoon(cached, threshold)) {
        this.logger.debug(`Token expiring soon (threshold: ${threshold}ms), refreshing...`);
        return this.fetchTokenWithLock(true);
      }
      return cached.accessToken;
    }

    // No cached token, fetch new
    return this.fetchTokenWithLock(false);
  }

  /**
   * Get refresh threshold with jitter (reduces thundering herd)
   */
  private getRefreshThresholdWithJitter(): number {
    if (!this.config.jitter.enabled) {
      return this.config.token.refreshThresholdMs;
    }

    const jitterRange = this.config.jitter.maxMs - this.config.jitter.minMs;
    const jitter = Math.random() * jitterRange + this.config.jitter.minMs;

    // Randomly add or subtract jitter
    const sign = Math.random() > 0.5 ? 1 : -1;

    return this.config.token.refreshThresholdMs + (sign * jitter);
  }

  /**
   * Check circuit breaker state before making request
   */
  private checkCircuitBreaker(): void {
    if (this.circuitState === 'CLOSED') {
      return;
    }

    if (this.circuitState === 'OPEN') {
      const openedAt = DateTimeUtils.fromISO(this.circuitOpenedAt!);
      const now = DateTimeUtils.now();
      const elapsedMs = DateTimeUtils.toMillis(now) - DateTimeUtils.toMillis(openedAt);

      if (elapsedMs < this.config.circuitBreaker.resetTimeoutMs) {
        // Circuit still open - fast fail
        this.metricsService?.circuitBreakerRejections?.inc();
        throw new MktConfigurationException(
          `Circuit breaker OPEN - authentication temporarily disabled. ` +
          `Will retry in ${this.config.circuitBreaker.resetTimeoutMs - elapsedMs}ms. ` +
          `Please verify MKT_SERVICE_EMAIL and MKT_SERVICE_PASSWORD.`,
        );
      }

      // Transition to half-open
      this.circuitState = 'HALF_OPEN';
      this.halfOpenAttempts = 0; // Reset half-open attempts
      this.metricsService?.circuitBreakerState?.set(1); // HALF_OPEN = 1
      this.logger.warn('Circuit breaker transitioning to HALF_OPEN');
    }

    // Enforce halfOpenMaxAttempts
    if (this.circuitState === 'HALF_OPEN') {
      if (this.halfOpenAttempts >= this.config.circuitBreaker.halfOpenMaxAttempts) {
        // Too many attempts in half-open, revert to OPEN
        this.circuitState = 'OPEN';
        this.circuitOpenedAt = DateTimeUtils.toISO(DateTimeUtils.now());
        this.metricsService?.circuitBreakerState?.set(2); // OPEN = 2
        this.metricsService?.circuitBreakerRejections?.inc();
        this.logger.warn(
          `Circuit breaker reverting to OPEN after ${this.halfOpenAttempts} half-open attempts`,
        );
        throw new MktConfigurationException(
          `Circuit breaker OPEN - max half-open attempts (${this.config.circuitBreaker.halfOpenMaxAttempts}) exceeded.`,
        );
      }
      this.halfOpenAttempts++;
    }
  }

  /**
   * Record auth success - reset circuit breaker
   */
  private onAuthSuccess(): void {
    const previousState = this.circuitState;

    if (previousState !== 'CLOSED') {
      this.logger.log(`Circuit breaker CLOSED (was: ${previousState})`);
    }

    this.circuitState = 'CLOSED';
    this.consecutiveFailures = 0;
    this.circuitOpenedAt = null;
    this.halfOpenAttempts = 0;

    // Update metrics
    this.metricsService?.circuitBreakerState?.set(0); // CLOSED = 0
    this.metricsService?.tokenAcquisitions?.inc({ type: 'success' });
  }

  /**
   * Record auth failure - possibly open circuit breaker
   */
  private onAuthFailure(error: Error): void {
    this.consecutiveFailures++;
    this.metricsService?.authFailures?.inc({ reason: '401' });

    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    // Check if should open circuit
    if (this.consecutiveFailures >= this.config.circuitBreaker.failureThreshold) {
      this.circuitState = 'OPEN';
      this.circuitOpenedAt = DateTimeUtils.toISO(DateTimeUtils.now());
      this.logger.error(
        `Circuit breaker OPEN after ${this.consecutiveFailures} consecutive failures. ` +
        `Last error: ${error.message}`,
      );
      this.metricsService?.circuitBreakerOpened?.inc();
      this.metricsService?.circuitBreakerState?.set(2); // OPEN = 2
    }
  }

  /**
   * Invalidate cached token
   */
  async invalidateToken(): Promise<void> {
    await this.cacheService.delete();
    this.eventEmitter.emit(MKT_AUTH_EVENTS.TOKEN_INVALIDATED, {
      timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
    });
    this.logger.log(MKT_AUTH_MESSAGES.SUCCESS.TOKEN_INVALIDATED);
  }

  /**
   * Force refresh token
   */
  async refreshToken(): Promise<string> {
    await this.invalidateToken();
    return this.fetchTokenWithLock(true);
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(): Promise<MktAuthTokenMetadata | null> {
    const cached = await this.cacheService.get();

    if (!cached) {
      return null;
    }

    const expiresAt = DateTimeUtils.fromISO(cached.expiresAt);
    const now = DateTimeUtils.now();
    const expiresInMs = DateTimeUtils.toMillis(expiresAt) - DateTimeUtils.toMillis(now);

    return {
      isValid: expiresInMs > 0,
      expiresInMs: Math.max(0, expiresInMs),
      userEmail: cached.user.email,
      issuedAt: cached.issuedAt,
    };
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const cached = await this.cacheService.get();

    return cached !== null;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Fetch token with distributed lock (multi-instance safe)
   */
  private async fetchTokenWithLock(isRefresh: boolean): Promise<string> {
    const result = await this.lockService.withLock(async () => {
      // Double-check cache after acquiring lock
      const cached = await this.cacheService.get();

      if (cached && !this.cacheService.isExpiringSoon(cached, this.config.refresh.thresholdMs)) {
        return cached.accessToken;
      }

      return this.fetchToken(isRefresh);
    });

    // Lock not acquired, try to get from cache or retry
    if (result === null) {
      // Wait a bit and try cache
      await this.delay(this.config.lock.retryIntervalMs * 5);
      const cached = await this.cacheService.get();

      if (cached) {
        return cached.accessToken;
      }

      // Retry without lock (last resort)
      return this.fetchToken(isRefresh);
    }

    return result;
  }

  /**
   * Fetch token from MKT Server with retry
   */
  private async fetchToken(isRefresh: boolean, attempt = 0): Promise<string> {
    if (attempt >= this.config.refresh.maxRetries) {
      throw new MktAuthenticationException(
        `${MKT_AUTH_MESSAGES.ERROR.SIGN_IN_FAILED} after ${this.config.refresh.maxRetries} attempts`,
      );
    }

    this.logger.debug(
      isRefresh ? MKT_AUTH_MESSAGES.LOG.REFRESHING_TOKEN : MKT_AUTH_MESSAGES.LOG.SIGNING_IN,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post<MktAuthSignInResponse>(
          `${this.config.serverUrl}/api/auth/sign-in/email`,
          {
            email: this.config.serviceEmail,
            password: this.config.servicePassword,
          },
          {
            timeout: this.config.http.timeoutMs,
          },
        ),
      );

      // Get token from header
      const accessToken = response.headers['set-auth-token'] as string;

      if (!accessToken) {
        throw new MktAuthenticationException(MKT_AUTH_MESSAGES.ERROR.NO_TOKEN_HEADER);
      }

      // Build token object
      const now = DateTimeUtils.now();
      const expiresAt = DateTimeUtils.add(now, { milliseconds: this.config.cache.redisTtlMs });

      const token: MktAuthToken = {
        accessToken,
        user: response.data.user,
        issuedAt: DateTimeUtils.toISO(now),
        expiresAt: DateTimeUtils.toISO(expiresAt),
      };

      // Cache token
      await this.cacheService.set(token);

      // Clear initialization error and reset circuit breaker
      this.initializationError = null;
      this.isInitialized = true;
      this.onAuthSuccess();

      // Emit event
      const event: MktAuthTokenAcquiredEvent = {
        userEmail: token.user.email,
        expiresInMs: this.config.cache.redisTtlMs,
        isRefresh,
        timestamp: DateTimeUtils.toISO(now),
      };
      this.eventEmitter.emit(
        isRefresh ? MKT_AUTH_EVENTS.TOKEN_REFRESHED : MKT_AUTH_EVENTS.TOKEN_ACQUIRED,
        event,
      );

      this.logger.log(
        `${isRefresh ? MKT_AUTH_MESSAGES.SUCCESS.TOKEN_REFRESHED : MKT_AUTH_MESSAGES.SUCCESS.TOKEN_ACQUIRED} for ${token.user.email}`,
      );

      return accessToken;
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));

      // Record failure for circuit breaker
      this.onAuthFailure(errorInstance);

      if (error instanceof MktAuthenticationException) {
        throw error;
      }

      // Retry with backoff
      const backoffMs = this.calculateBackoff(attempt);
      this.logger.warn(
        `Token fetch failed (attempt ${attempt + 1}/${this.config.refresh.maxRetries}), retrying in ${backoffMs}ms`,
      );

      await this.delay(backoffMs);
      return this.fetchToken(isRefresh, attempt + 1);
    }
  }

  private validateConfig(): void {
    const missing: string[] = [];

    if (!this.config.serverUrl) missing.push('MKT_SERVER_URL');
    if (!this.config.serviceEmail) missing.push('MKT_SERVICE_EMAIL');
    if (!this.config.servicePassword) missing.push('MKT_SERVICE_PASSWORD');

    if (missing.length > 0) {
      throw new MktConfigurationException(
        `${MKT_AUTH_MESSAGES.ERROR.MISSING_CONFIG}: ${missing.join(', ')}`,
      );
    }

    // Enforce HTTPS in production
    if (process.env.NODE_ENV === 'production') {
      if (!this.config.serverUrl.startsWith('https://')) {
        throw new MktConfigurationException(MKT_AUTH_MESSAGES.ERROR.HTTPS_REQUIRED);
      }
    }
  }

  private isCommandMode(): boolean {
    return process.argv.some((arg) => arg.includes('command.js'));
  }

  private calculateBackoff(attempt: number): number {
    const delay = this.config.refresh.initialBackoffMs *
      Math.pow(this.config.refresh.backoffMultiplier, attempt);
    return Math.min(delay, this.config.refresh.maxBackoffMs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### MktAuthHttpService (HTTP Client with Bearer Token)

```typescript
// services/mkt-auth-http.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';

import { MktAuthClientService } from './mkt-auth-client.service';
import { MktAuthClientConfig } from '../config/mkt-auth-client.validation';
import { MKT_AUTH_CLIENT_CONFIG_KEY } from '../config/mkt-auth-client.config';
import { MKT_AUTH_LOG_CONTEXT } from '../constants';
import {
  MktAuthException,
  MktAuthenticationException,
  MktAuthorizationException,
  MktNotFoundException,
  MktRateLimitException,
  MktServerUnavailableException,
  MKT_AUTH_ERROR_CODE,
} from '../types/mkt-auth-error.type';

type RequestOptions = {
  params?: Record<string, unknown>;
  timeout?: number;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
} & T;

type RetryContext = {
  attempt: number;
  hasReauthenticated: boolean; // Đánh dấu đã re-login sau 401
};

@Injectable()
export class MktAuthHttpService {
  private readonly logger = new Logger(`${MKT_AUTH_LOG_CONTEXT}:Http`);
  private readonly config: MktAuthClientConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly authClientService: MktAuthClientService,
    private readonly metricsService: MktAuthMetricsService, // For relogin metrics
  ) {
    this.config = this.configService.getOrThrow<MktAuthClientConfig>(
      MKT_AUTH_CLIENT_CONFIG_KEY,
    );
  }

  // ============================================
  // PUBLIC API
  // ============================================

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data: Record<string, unknown>, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T>(endpoint: string, data: Record<string, unknown>, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async patch<T>(endpoint: string, data: Record<string, unknown>, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
    retryContext: RetryContext = { attempt: 0, hasReauthenticated: false },
  ): Promise<T> {
    const url = `${this.config.serverUrl}${endpoint}`;
    const axiosConfig = await this.buildConfig(options);

    this.logger.debug(`${method} ${endpoint} (attempt: ${retryContext.attempt + 1})`);

    try {
      const response = await this.executeRequest<T>(method, url, data, axiosConfig);

      // Unwrap response
      const responseData = response.data;
      if (responseData && 'data' in responseData && responseData.data !== undefined) {
        return responseData.data as T;
      }
      return responseData as T;
    } catch (error) {
      return this.handleError<T>(error, method, endpoint, data, options, retryContext);
    }
  }

  private async buildConfig(options?: RequestOptions): Promise<AxiosRequestConfig> {
    const token = await this.authClientService.getAccessToken();

    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      params: options?.params,
      timeout: options?.timeout ?? this.config.http.timeoutMs,
    };
  }

  private async executeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    data: Record<string, unknown> | undefined,
    config: AxiosRequestConfig,
  ) {
    switch (method) {
      case 'GET':
        return firstValueFrom(this.httpService.get<ApiResponse<T>>(url, config));
      case 'POST':
        return firstValueFrom(this.httpService.post<ApiResponse<T>>(url, data, config));
      case 'PUT':
        return firstValueFrom(this.httpService.put<ApiResponse<T>>(url, data, config));
      case 'PATCH':
        return firstValueFrom(this.httpService.patch<ApiResponse<T>>(url, data, config));
      case 'DELETE':
        return firstValueFrom(this.httpService.delete<ApiResponse<T>>(url, config));
    }
  }

  private async handleError<T>(
    error: unknown,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
    retryContext: RetryContext = { attempt: 0, hasReauthenticated: false },
  ): Promise<T> {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const message = (axiosError.response?.data as Record<string, unknown>)?.error
      || axiosError.message;

    // ============================================
    // 401 HANDLING - TOKEN EXPIRED, RE-LOGIN REQUIRED
    // ============================================
    // Vì Better Auth không có refresh token mechanism,
    // khi token hết hạn (401), cần sign-in lại để lấy token mới
    if (status === 401) {
      return this.handleUnauthorized<T>(
        method,
        endpoint,
        data,
        options,
        retryContext,
        String(message),
      );
    }

    // 403 - Authorization denied (không retry)
    if (status === 403) {
      throw new MktAuthorizationException(String(message));
    }

    // 404 - Resource not found (không retry)
    if (status === 404) {
      throw new MktNotFoundException('Resource', endpoint);
    }

    // 429 - Rate limit (retry với delay từ header)
    if (status === 429) {
      return this.handleRateLimit<T>(
        axiosError,
        method,
        endpoint,
        data,
        options,
        retryContext,
      );
    }

    // 5xx - Server error (retry với exponential backoff)
    if (status && status >= 500) {
      return this.handleServerError<T>(
        status,
        method,
        endpoint,
        data,
        options,
        retryContext,
        String(message),
      );
    }

    // Other errors
    this.logger.error(`${method} ${endpoint} failed: [${status}] ${message}`);
    throw new MktAuthException(String(message), MKT_AUTH_ERROR_CODE.NETWORK_ERROR, status);
  }

  /**
   * Handle 401 Unauthorized - Token expired, need to re-login
   *
   * Flow:
   * 1. Nhận 401 lần đầu → Invalidate token → Re-login → Retry request
   * 2. Nhận 401 sau re-login → Throw MktAuthenticationException (credentials sai)
   *
   * IMPORTANT: Chỉ retry 1 lần sau re-login để tránh infinite loop
   */
  private async handleUnauthorized<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
    retryContext: RetryContext = { attempt: 0, hasReauthenticated: false },
    errorMessage?: string,
  ): Promise<T> {
    // Nếu đã re-login rồi mà vẫn 401 → credentials sai hoặc account bị disable
    if (retryContext.hasReauthenticated) {
      this.logger.error(
        `401 after re-authentication - credentials may be invalid or account disabled`,
      );
      this.metricsService.reloginFailures.inc();
      throw new MktAuthenticationException(
        `Authentication failed after re-login: ${errorMessage}. ` +
        `Please verify MKT_SERVICE_EMAIL and MKT_SERVICE_PASSWORD are correct.`,
      );
    }

    // Lần đầu nhận 401 → Invalidate token và re-login
    this.logger.warn(
      `Received 401 Unauthorized for ${method} ${endpoint}. ` +
      `Token may have expired. Attempting re-authentication...`,
    );

    // Track relogin attempt
    this.metricsService.reloginAttempts.inc();

    try {
      // Step 1: Invalidate cached token
      await this.authClientService.invalidateToken();

      // Step 2: Force re-login (getAccessToken sẽ tự động sign-in lại)
      // Không cần gọi refreshToken() vì getAccessToken() trong buildConfig
      // sẽ detect cache miss và tự sign-in

      // Step 3: Retry request với token mới
      this.logger.debug(`Re-authentication successful, retrying ${method} ${endpoint}...`);

      // Track success (if retry succeeds, it will be tracked as a normal request)
      this.metricsService.reloginSuccesses.inc();

      return this.request<T>(method, endpoint, data, options, {
        attempt: retryContext.attempt,
        hasReauthenticated: true, // Đánh dấu đã re-login
      });
    } catch (reAuthError) {
      // Re-login thất bại
      this.logger.error('Re-authentication failed', reAuthError);
      this.metricsService.reloginFailures.inc();
      throw new MktAuthenticationException(
        `Failed to re-authenticate: ${reAuthError instanceof Error ? reAuthError.message : String(reAuthError)}`,
      );
    }
  }

  /**
   * Handle 429 Rate Limit - Wait và retry nếu có retry-after header
   */
  private async handleRateLimit<T>(
    axiosError: AxiosError,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
    retryContext: RetryContext = { attempt: 0, hasReauthenticated: false },
  ): Promise<T> {
    const retryAfter = axiosError.response?.headers['retry-after'];
    const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;

    if (retryContext.attempt < this.config.http.retryAttempts && retryAfterMs) {
      this.logger.warn(`Rate limited, waiting ${retryAfterMs}ms before retry...`);
      await this.delay(retryAfterMs);

      return this.request<T>(method, endpoint, data, options, {
        ...retryContext,
        attempt: retryContext.attempt + 1,
      });
    }

    throw new MktRateLimitException(retryAfterMs);
  }

  /**
   * Handle 5xx Server Error - Retry với exponential backoff
   */
  private async handleServerError<T>(
    status: number,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
    retryContext: RetryContext = { attempt: 0, hasReauthenticated: false },
    errorMessage?: string,
  ): Promise<T> {
    if (retryContext.attempt < this.config.http.retryAttempts) {
      const backoffMs = this.calculateBackoff(retryContext.attempt);
      this.logger.warn(
        `Server error ${status} for ${method} ${endpoint}, retrying in ${backoffMs}ms...`,
      );
      await this.delay(backoffMs);

      return this.request<T>(method, endpoint, data, options, {
        ...retryContext,
        attempt: retryContext.attempt + 1,
      });
    }

    throw new MktServerUnavailableException(
      `Server error ${status} after ${retryContext.attempt} retries: ${errorMessage}`,
    );
  }

  private calculateBackoff(attempt: number): number {
    const delay = this.config.refresh.initialBackoffMs *
      Math.pow(this.config.refresh.backoffMultiplier, attempt);
    return Math.min(delay, this.config.refresh.maxBackoffMs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

---

## Module Definition

```typescript
// mkt-auth-client.module.ts

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { RedisInfrastructureModule } from 'src/mkt-core/infrastructure/redis/redis-infrastructure.module';
import { mktAuthClientConfig } from './config/mkt-auth-client.config';
import { MKT_AUTH_DEFAULTS } from './constants';
import {
  MktAuthCacheService,
  MktAuthLockService,
  MktAuthClientService,
  MktAuthHttpService,
} from './services';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(mktAuthClientConfig),
    HttpModule.register({
      timeout: MKT_AUTH_DEFAULTS.HTTP_TIMEOUT_MS,
      maxRedirects: MKT_AUTH_DEFAULTS.HTTP_MAX_REDIRECTS,
    }),
    RedisInfrastructureModule,
  ],
  providers: [
    MktAuthCacheService,
    MktAuthLockService,
    MktAuthClientService,
    MktAuthHttpService,
  ],
  exports: [MktAuthClientService, MktAuthHttpService],
})
export class MktAuthClientModule {}
```

---

## Usage Examples

### Fetch Products

```typescript
import { Injectable } from '@nestjs/common';
import { MktAuthHttpService } from 'src/mkt-core/mkt-auth-client/services';

type MktProduct = {
  id: string;
  code: string;
  name: string;
  price: number;
};

@Injectable()
export class ProductSyncService {
  constructor(private readonly mktHttp: MktAuthHttpService) {}

  async fetchProducts(): Promise<MktProduct[]> {
    return this.mktHttp.get<MktProduct[]>('/api/products');
  }

  async fetchProductById(id: string): Promise<MktProduct> {
    return this.mktHttp.get<MktProduct>(`/api/products/${id}`);
  }
}
```

### Subscribe to Token Events

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MKT_AUTH_EVENTS, MktAuthTokenAcquiredEvent } from 'src/mkt-core/mkt-auth-client/types';

@Injectable()
export class ProductAutoSyncService {
  @OnEvent(MKT_AUTH_EVENTS.TOKEN_ACQUIRED)
  async handleTokenAcquired(event: MktAuthTokenAcquiredEvent): Promise<void> {
    if (!event.isRefresh) {
      // Initial token - trigger full sync
      await this.syncAllProducts();
    }
  }

  private async syncAllProducts(): Promise<void> {
    // Sync logic
  }
}
```

### Error Handling

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { MktAuthHttpService } from 'src/mkt-core/mkt-auth-client/services';
import {
  MktNotFoundException,
  MktRateLimitException,
  MktServerUnavailableException,
} from 'src/mkt-core/mkt-auth-client/types';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly mktHttp: MktAuthHttpService) {}

  async getProduct(id: string): Promise<MktProduct | null> {
    try {
      return await this.mktHttp.get<MktProduct>(`/api/products/${id}`);
    } catch (error) {
      if (error instanceof MktNotFoundException) {
        return null;
      }
      if (error instanceof MktRateLimitException) {
        this.logger.warn(`Rate limited, retry after: ${error.retryAfterMs}ms`);
      }
      if (error instanceof MktServerUnavailableException) {
        this.logger.error('MKT Server unavailable');
      }
      throw error;
    }
  }
}
```

---

## Error Handling

### Error Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Error Handling Matrix                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Status   │ Exception                    │ Retryable │ Action           │
│  ─────────┼──────────────────────────────┼───────────┼─────────────────│
│  401      │ MktAuthenticationException   │ Yes*      │ Re-login + retry │
│  403      │ MktAuthorizationException    │ No        │ Throw immediately│
│  404      │ MktNotFoundException         │ No        │ Throw immediately│
│  429      │ MktRateLimitException        │ Yes       │ Wait + retry     │
│  5xx      │ MktServerUnavailableException│ Yes       │ Backoff + retry  │
│                                                                         │
│  * 401 chỉ retry 1 lần sau re-login                                     │
│                                                                         │
│  Retry Configuration:                                                   │
│  • Max retries: 3 (cho 429, 5xx)                                        │
│  • Max auth retries: 1 (cho 401)                                        │
│  • Initial backoff: 1000ms                                              │
│  • Max backoff: 30000ms                                                 │
│  • Backoff multiplier: 2 (exponential)                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 401 Unauthorized Handling (No Refresh Token)

Vì Better Auth Bearer **không có refresh token**, khi nhận 401 cần **sign-in lại** hoàn toàn.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    401 Handling Flow (No Refresh Token)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Request với expired token                                              │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────┐                                                            │
│  │   401   │ ◄─── MKT Server trả về 401 Unauthorized                    │
│  └────┬────┘                                                            │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────┐                                                │
│  │ hasReauthenticated? │                                                │
│  └──────────┬──────────┘                                                │
│       │     │                                                           │
│    No │     │ Yes                                                       │
│       ▼     ▼                                                           │
│  ┌─────────┐  ┌──────────────────────────────────┐                      │
│  │ Re-login│  │ Throw MktAuthenticationException │                      │
│  │  Flow   │  │ (credentials sai hoặc account    │                      │
│  └────┬────┘  │  bị disable)                     │                      │
│       │       └──────────────────────────────────┘                      │
│       ▼                                                                 │
│  ┌─────────────────────────────────────┐                                │
│  │ 1. Invalidate cached token          │                                │
│  │ 2. Sign-in lại (POST /sign-in/email)│                                │
│  │ 3. Cache new token                  │                                │
│  │ 4. Retry original request           │                                │
│  │    (với hasReauthenticated = true)  │                                │
│  └─────────────────────────────────────┘                                │
│                                                                         │
│  Kết quả:                                                               │
│  ├─► Success → Trả về response                                          │
│  ├─► 401 lần 2 → Throw MktAuthenticationException                       │
│  └─► Other error → Xử lý theo error type                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Code Flow cho 401 Handling

```typescript
// Khi nhận 401
private async handleUnauthorized<T>(...): Promise<T> {
  // Đã re-login rồi mà vẫn 401 → throw
  if (retryContext.hasReauthenticated) {
    throw new MktAuthenticationException(
      'Authentication failed after re-login. Check credentials.',
    );
  }

  // Lần đầu 401:
  // 1. Invalidate token
  await this.authClientService.invalidateToken();

  // 2. Retry request (sẽ trigger re-login trong buildConfig → getAccessToken)
  return this.request<T>(method, endpoint, data, options, {
    attempt: retryContext.attempt,
    hasReauthenticated: true, // Đánh dấu đã re-login
  });
}
```

### Proactive vs Reactive Token Refresh

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  Token Refresh Strategies                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PROACTIVE (Recommended):                                               │
│  ─────────────────────────                                              │
│  • Check token expiry TRƯỚC khi gửi request                             │
│  • Nếu còn < 5 phút (threshold) → re-login trước                        │
│  • Tránh được 401 response                                              │
│  • Implemented trong: getAccessToken() → cacheService.isExpiringSoon()  │
│                                                                         │
│  REACTIVE (Fallback):                                                   │
│  ────────────────────                                                   │
│  • Khi nhận 401 từ server                                               │
│  • Invalidate token → re-login → retry request                          │
│  • Cần thiết khi:                                                       │
│    - Token bị revoke bất ngờ                                            │
│    - Server-side expiry khác với client estimate                        │
│    - Cache bị stale                                                     │
│  • Implemented trong: handleUnauthorized()                              │
│                                                                         │
│  Timeline:                                                              │
│  ──────────                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Token acquired                  Threshold         Expiry       │    │
│  │       │                              │               │          │    │
│  │       ▼                              ▼               ▼          │    │
│  │  ─────┬──────────────────────────────┬───────────────┬────────  │    │
│  │       │     Normal operation         │  Proactive    │ Reactive │    │
│  │       │                              │  re-login     │ on 401   │    │
│  │       │                              │  (5 min       │          │    │
│  │       │                              │   before)     │          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Observability & Alerting

### Metrics to Track

```typescript
// types/mkt-auth-metrics.type.ts

/**
 * Prometheus metrics cho MKT Auth Client
 */
export type MktAuthMetrics = {
  // Token metrics
  tokenAcquisitions: Counter;       // Số lần lấy token (label: type=initial|refresh)
  tokenAcquisitionDuration: Histogram; // Duration sign-in request
  tokenCacheHits: Counter;          // Cache hit (label: layer=lru|redis)
  tokenCacheMisses: Counter;        // Cache miss

  // Error metrics
  authFailures: Counter;            // Số lần auth fail (label: reason=401|network|timeout)
  reloginAttempts: Counter;         // Số lần re-login sau 401
  reloginSuccesses: Counter;        // Re-login thành công
  reloginFailures: Counter;         // Re-login thất bại

  // Circuit breaker metrics
  circuitBreakerState: Gauge;       // 0=CLOSED, 1=HALF_OPEN, 2=OPEN
  circuitBreakerOpened: Counter;    // Số lần circuit mở
  circuitBreakerRejections: Counter; // Số request bị reject do circuit open

  // Rate limit metrics
  rateLimitHits: Counter;           // Số lần bị rate limit (429)
  rateLimitRetries: Counter;        // Số lần retry sau rate limit
};
```

### Metric Implementation

```typescript
// services/mkt-auth-metrics.service.ts

import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class MktAuthMetricsService {
  private readonly registry: Registry;

  // Token metrics
  readonly tokenAcquisitions: Counter;
  readonly tokenAcquisitionDuration: Histogram;
  readonly tokenCacheHits: Counter;
  readonly tokenCacheMisses: Counter;

  // Error metrics
  readonly authFailures: Counter;
  readonly reloginAttempts: Counter;
  readonly reloginSuccesses: Counter;
  readonly reloginFailures: Counter;

  // Circuit breaker metrics
  readonly circuitBreakerState: Gauge;
  readonly circuitBreakerOpened: Counter;
  readonly circuitBreakerRejections: Counter;

  constructor() {
    this.registry = new Registry();

    this.tokenAcquisitions = new Counter({
      name: 'mkt_auth_token_acquisitions_total',
      help: 'Total token acquisitions',
      labelNames: ['type'], // initial, refresh
      registers: [this.registry],
    });

    this.tokenAcquisitionDuration = new Histogram({
      name: 'mkt_auth_token_acquisition_duration_seconds',
      help: 'Token acquisition duration in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.authFailures = new Counter({
      name: 'mkt_auth_failures_total',
      help: 'Total authentication failures',
      labelNames: ['reason'], // 401, network, timeout, circuit_open
      registers: [this.registry],
    });

    this.reloginAttempts = new Counter({
      name: 'mkt_auth_relogin_attempts_total',
      help: 'Total re-login attempts after 401',
      registers: [this.registry],
    });

    this.circuitBreakerState = new Gauge({
      name: 'mkt_auth_circuit_breaker_state',
      help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
      registers: [this.registry],
    });

    // ... initialize other metrics
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
```

### Alert Rules (Prometheus/Grafana)

```yaml
# prometheus/alerts/mkt-auth.yml

groups:
  - name: mkt-auth-alerts
    rules:
      # =====================================================
      # HIGH SEVERITY - Config sai hoặc account bị disable
      # =====================================================
      - alert: MktAuthCircuitBreakerOpen
        expr: mkt_auth_circuit_breaker_state == 2
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MKT Auth circuit breaker is OPEN"
          description: |
            Circuit breaker đã mở sau nhiều lần re-login thất bại.
            ACTION: Kiểm tra MKT_SERVICE_EMAIL và MKT_SERVICE_PASSWORD.
            Có thể account đã bị disable hoặc credentials sai.

      - alert: MktAuthHighReloginFailureRate
        expr: |
          rate(mkt_auth_relogin_failures_total[5m]) /
          rate(mkt_auth_relogin_attempts_total[5m]) > 0.5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High re-login failure rate (>50%)"
          description: |
            Hơn 50% re-login attempts đang thất bại.
            ACTION: Kiểm tra credentials và MKT Server connectivity.

      # =====================================================
      # MEDIUM SEVERITY - Performance issues
      # =====================================================
      - alert: MktAuthSlowTokenAcquisition
        expr: |
          histogram_quantile(0.95, rate(mkt_auth_token_acquisition_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow token acquisition (p95 > 5s)"
          description: "Token acquisition đang chậm. Kiểm tra network latency đến MKT Server."

      - alert: MktAuthHighRateLimitRate
        expr: rate(mkt_auth_rate_limit_hits_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate limit hits from MKT Server"
          description: "Đang bị rate limit thường xuyên. Kiểm tra request volume."

      - alert: MktAuthLowCacheHitRate
        expr: |
          rate(mkt_auth_token_cache_hits_total[5m]) /
          (rate(mkt_auth_token_cache_hits_total[5m]) + rate(mkt_auth_token_cache_misses_total[5m])) < 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low token cache hit rate (<80%)"
          description: "Cache hit rate thấp. Kiểm tra Redis connectivity và TTL config."

      # =====================================================
      # LOW SEVERITY - Informational
      # =====================================================
      - alert: MktAuthFrequent401s
        expr: rate(mkt_auth_failures_total{reason="401"}[5m]) > 0.05
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "Frequent 401 errors from MKT Server"
          description: |
            Có nhiều 401 errors. Có thể do:
            - Token TTL mismatch (server < client estimate)
            - Token bị revoke sớm
            - Clock skew giữa instances
```

### Grafana Dashboard Panels

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MKT Auth Dashboard                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐  │
│  │ Token Acquisition   │  │ Cache Hit Rate      │  │ Circuit Breaker │  │
│  │ Rate (per minute)   │  │ (LRU vs Redis)      │  │ State           │  │
│  │ ──────────────────  │  │ ──────────────────  │  │ ───────────────│  │
│  │ [Line Chart]        │  │ [Stacked Area]      │  │ [State Timeline]│  │
│  │ - Initial           │  │ - LRU hits          │  │ - CLOSED (green)│  │
│  │ - Refresh           │  │ - Redis hits        │  │ - HALF_OPEN     │  │
│  │                     │  │ - Misses            │  │ - OPEN (red)    │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘  │
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐  │
│  │ Re-login Attempts   │  │ Error Breakdown     │  │ Acquisition     │  │
│  │ & Success Rate      │  │ (by reason)         │  │ Duration (p95)  │  │
│  │ ──────────────────  │  │ ──────────────────  │  │ ───────────────│  │
│  │ [Dual Axis Chart]   │  │ [Pie Chart]         │  │ [Histogram]     │  │
│  │ - Attempts (bar)    │  │ - 401               │  │                 │  │
│  │ - Success % (line)  │  │ - Network           │  │                 │  │
│  │                     │  │ - Timeout           │  │                 │  │
│  │                     │  │ - Circuit Open      │  │                 │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Key Metrics Summary                                              │    │
│  │ ───────────────────                                              │    │
│  │ • Tokens acquired (24h): 1,234                                   │    │
│  │ • Cache hit rate: 95.2%                                          │    │
│  │ • Re-login success rate: 98.5%                                   │    │
│  │ • Avg acquisition time: 0.8s                                     │    │
│  │ • Circuit breaker opens (24h): 0                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Health Check Endpoint

```typescript
// resolvers/mkt-auth-health.resolver.ts

import { Query, Resolver } from '@nestjs/graphql';
import { MktAuthClientService } from '../services/mkt-auth-client.service';
import { MktAuthHealthOutput } from '../dto/mkt-auth-health.output';

@Resolver()
export class MktAuthHealthResolver {
  constructor(
    private readonly authClientService: MktAuthClientService,
    private readonly metricsService: MktAuthMetricsService,
  ) {}

  @Query(() => MktAuthHealthOutput)
  async mktAuthHealth(): Promise<MktAuthHealthOutput> {
    const tokenMetadata = await this.authClientService.getTokenMetadata();
    const circuitState = this.authClientService.getCircuitBreakerState();

    return {
      isHealthy: tokenMetadata?.isValid ?? false,
      circuitBreakerState: circuitState,
      tokenExpiresInMs: tokenMetadata?.expiresInMs ?? 0,
      lastRefreshAt: tokenMetadata?.issuedAt ?? null,
      consecutiveFailures: this.authClientService.getConsecutiveFailures(),
    };
  }
}
```

### Logging Best Practices

```typescript
// Structured logging với correlation
this.logger.log({
  event: 'token_acquired',
  userEmail: token.user.email,
  expiresInMs: this.config.cache.redisTtlMs,
  isRefresh,
  correlationId: context.correlationId,
  duration: endTime - startTime,
});

this.logger.warn({
  event: 'relogin_attempt',
  reason: '401_unauthorized',
  attempt: retryContext.attempt + 1,
  endpoint: `${method} ${endpoint}`,
  correlationId: context.correlationId,
});

this.logger.error({
  event: 'circuit_breaker_opened',
  consecutiveFailures: this.consecutiveFailures,
  failureThreshold: this.config.circuitBreaker.failureThreshold,
  resetTimeoutMs: this.config.circuitBreaker.resetTimeoutMs,
  lastError: error.message,
});
```

---

## Security Considerations

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Security Checklist                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✅ DO:                                                                 │
│  ├─► Store credentials in environment variables                        │
│  ├─► Use secrets manager in production                                 │
│  ├─► Enforce HTTPS in production (auto-validated)                      │
│  ├─► Use DateTimeUtils for all date/time operations                    │
│  ├─► Use safeJsonParse/safeJsonStringify for JSON                      │
│  └─► Mask tokens in logs                                               │
│                                                                         │
│  ❌ DON'T:                                                              │
│  ├─► Commit credentials to git                                         │
│  ├─► Log full tokens                                                   │
│  ├─► Use new Date() - use DateTimeUtils                                │
│  └─► Use JSON.parse() - use safeJsonParse                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

### Required Variables

| Variable | Description |
|----------|-------------|
| `MKT_SERVER_URL` | MKT Server base URL (e.g., `https://mkt-admin-be.local`) |
| `MKT_SERVICE_EMAIL` | Service account email |
| `MKT_SERVICE_PASSWORD` | Service account password |

### Token TTL Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MKT_AUTH_TOKEN_SERVER_TTL_MS` | `86400000` (24h) | TTL thực từ MKT Server (confirm với server team) |
| `MKT_AUTH_TOKEN_BUFFER_MS` | `3600000` (1h) | Buffer trước khi server TTL hết |
| `MKT_AUTH_REFRESH_THRESHOLD_MS` | `300000` (5min) | Threshold để proactive refresh |

**Note**: `redisTtlMs` (computed) = `serverTtlMs` - `bufferMs` = 23h

### Jitter Configuration (Giảm Thundering Herd)

| Variable | Default | Description |
|----------|---------|-------------|
| `MKT_AUTH_JITTER_ENABLED` | `true` | Enable jitter cho refresh threshold |
| `MKT_AUTH_JITTER_MIN_MS` | `30000` (30s) | Minimum jitter |
| `MKT_AUTH_JITTER_MAX_MS` | `60000` (60s) | Maximum jitter |

### Circuit Breaker Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MKT_AUTH_CIRCUIT_BREAKER_ENABLED` | `true` | Enable circuit breaker |
| `MKT_AUTH_CB_FAILURE_THRESHOLD` | `5` | Số failures trước khi circuit open |
| `MKT_AUTH_CB_RESET_TIMEOUT_MS` | `60000` (1min) | Thời gian trước khi thử lại |
| `MKT_AUTH_CB_HALF_OPEN_ATTEMPTS` | `1` | Số attempts trong half-open state |

### Cache Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MKT_AUTH_CACHE_LOCAL_TTL_MS` | `3600000` (1h) | Local in-memory cache TTL (single token, not LRU) |

**Note**: Đây là single-token cache vì mỗi service chỉ cần cache 1 token. `redisTtlMs` được compute từ `serverTtlMs - bufferMs`.

### HTTP Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MKT_AUTH_HTTP_TIMEOUT_MS` | `10000` (10s) | HTTP request timeout |
| `MKT_AUTH_HTTP_MAX_REDIRECTS` | `5` | Max redirects |
| `MKT_AUTH_HTTP_RETRY_ATTEMPTS` | `3` | Retry attempts cho 5xx, 429 |

### Retry/Backoff Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MKT_AUTH_REFRESH_MAX_RETRIES` | `3` | Max retries cho token fetch |
| `MKT_AUTH_REFRESH_INITIAL_BACKOFF_MS` | `1000` (1s) | Initial backoff |
| `MKT_AUTH_REFRESH_MAX_BACKOFF_MS` | `30000` (30s) | Max backoff |
| `MKT_AUTH_REFRESH_BACKOFF_MULTIPLIER` | `2` | Exponential multiplier |

### Lock Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MKT_AUTH_LOCK_TIMEOUT_MS` | `10000` (10s) | Lock timeout |
| `MKT_AUTH_LOCK_MAX_WAIT_MS` | `5000` (5s) | Max wait time cho lock |
| `MKT_AUTH_LOCK_RETRY_INTERVAL_MS` | `100` | Retry interval |

### Startup Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MKT_AUTH_SKIP_STARTUP_INIT` | `false` | Skip initialization on startup |

### Example .env

```env
# =====================================================
# Required - Phải cấu hình
# =====================================================
MKT_SERVER_URL=https://mkt-admin-be.local
MKT_SERVICE_EMAIL=crm-service@company.com
MKT_SERVICE_PASSWORD=your-secure-password

# =====================================================
# Token TTL - Confirm với MKT Server team
# =====================================================
# MKT Server token TTL = 24h (confirm trước khi deploy)
MKT_AUTH_TOKEN_SERVER_TTL_MS=86400000
MKT_AUTH_TOKEN_BUFFER_MS=3600000
MKT_AUTH_REFRESH_THRESHOLD_MS=300000

# =====================================================
# Jitter - Giảm thundering herd
# =====================================================
MKT_AUTH_JITTER_ENABLED=true
MKT_AUTH_JITTER_MIN_MS=30000
MKT_AUTH_JITTER_MAX_MS=60000

# =====================================================
# Circuit Breaker - Ngăn continuous failures
# =====================================================
MKT_AUTH_CIRCUIT_BREAKER_ENABLED=true
MKT_AUTH_CB_FAILURE_THRESHOLD=5
MKT_AUTH_CB_RESET_TIMEOUT_MS=60000

# =====================================================
# Development/Testing - Disable for debugging
# =====================================================
# MKT_AUTH_SKIP_STARTUP_INIT=true
# MKT_AUTH_JITTER_ENABLED=false
# MKT_AUTH_CIRCUIT_BREAKER_ENABLED=false
```

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Architecture Summary                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Pattern: Service Composition + Wrapper Pattern                         │
│  ─────────────────────────────────────────────                          │
│                                                                         │
│  MktAuthClientService (Main Facade)                                     │
│       ├── MktAuthCacheService (wraps RedisCacheService)                 │
│       ├── MktAuthLockService (wraps RedisLockService)                   │
│       ├── MktAuthMetricsService (Prometheus metrics)                    │
│       └── EventEmitter2 (event bus)                                     │
│                                                                         │
│  MktAuthHttpService (HTTP Client)                                       │
│       └── MktAuthClientService (token provider)                         │
│                                                                         │
│  Features:                                                              │
│  ─────────                                                              │
│  ✓ Zod config validation                                                │
│  ✓ Two-tier caching (LRU + Redis)                                       │
│  ✓ Distributed locking (multi-instance safe)                            │
│  ✓ Exponential backoff retry                                            │
│  ✓ Event-driven integration                                             │
│  ✓ Comprehensive error handling                                         │
│  ✓ Jitter (reduces thundering herd)              [NEW]                  │
│  ✓ Circuit breaker (prevents continuous failures) [NEW]                 │
│  ✓ Prometheus metrics + Alerting                 [NEW]                  │
│                                                                         │
│  Required Utilities:                                                    │
│  ──────────────────                                                     │
│  ✓ DateTimeUtils (not new Date())                                       │
│  ✓ safeJsonParse/safeJsonStringify (not JSON.*)                         │
│  ✓ RedisLockService.withLock() / tryWithLock()                          │
│  ✓ RedisCacheService (two-tier caching)                                 │
│                                                                         │
│  Risk Mitigations:                                                      │
│  ─────────────────                                                      │
│  ✓ TTL Mismatch: Separate tokenTtlMs config, reactive 401 fallback      │
│  ✓ Thundering Herd: Jitter (±30-60s) + distributed lock                 │
│  ✓ Continuous Failures: Circuit breaker + metrics + alerting            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Week 1) ⚽

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: FOUNDATION                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tasks:                                                                 │
│  ──────                                                                 │
│  1.1 Create module structure                                            │
│      └── packages/twenty-server/src/mkt-core/mkt-auth-client/           │
│          ├── configs/                                                   │
│          ├── constants/                                                 │
│          ├── services/                                                  │
│          ├── types/                                                     │
│          └── mkt-auth-client.module.ts                                  │
│                                                                         │
│  1.2 Implement Zod config schemas                                       │
│      ├── mkt-auth-client.config.ts (main config)                        │
│      ├── MktAuthTokenConfigSchema                                       │
│      ├── MktAuthCacheConfigSchema                                       │
│      ├── MktAuthRetryConfigSchema                                       │
│      ├── MktAuthJitterConfigSchema                                      │
│      └── MktAuthCircuitBreakerConfigSchema                              │
│                                                                         │
│  1.3 Add environment variables                                          │
│      └── .env.example + environment-variables.ts                        │
│                                                                         │
│  1.4 Define TypeScript types                                            │
│      ├── MktAuthCredentials                                             │
│      ├── MktAuthTokenResponse                                           │
│      ├── MktAuthTokenData                                               │
│      └── Event payload types                                            │
│                                                                         │
│  Deliverables:                                                          │
│  ─────────────                                                          │
│  □ Module structure created                                             │
│  □ All config schemas validated with Zod                                │
│  □ Environment variables documented                                     │
│  □ TypeScript types defined                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: Core Services (Week 2) ⚽

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: CORE SERVICES                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tasks:                                                                 │
│  ──────                                                                 │
│  2.1 Implement MktAuthCacheService                                      │
│      ├── Local in-memory cache (Map with TTL)                           │
│      ├── Redis distributed cache integration                            │
│      ├── Two-tier cache lookup (local → Redis)                          │
│      ├── Cache invalidation on events                                   │
│      └── Metrics tracking (hits/misses)                                 │
│                                                                         │
│  2.2 Implement MktAuthLockService                                       │
│      ├── Wrap RedisLockService                                          │
│      ├── withLock() for token acquisition                               │
│      └── Configurable timeout/retry                                     │
│                                                                         │
│  2.3 Implement MktAuthClientService                                     │
│      ├── Bootstrap token acquisition                                    │
│      ├── Background refresh (proactive)                                 │
│      ├── Reactive refresh on 401                                        │
│      ├── Jitter calculation                                             │
│      ├── Circuit breaker state machine                                  │
│      └── Event emissions                                                │
│                                                                         │
│  Dependencies:                                                          │
│  ─────────────                                                          │
│  - CacheStorageService (existing)                                       │
│  - RedisLockService (existing)                                          │
│  - EventEmitter2 (existing)                                             │
│  - DateTimeUtils (existing)                                             │
│                                                                         │
│  Deliverables:                                                          │
│  ─────────────                                                          │
│  □ MktAuthCacheService with two-tier caching                            │
│  □ MktAuthLockService wrapping RedisLockService                         │
│  □ MktAuthClientService with full lifecycle                             │
│  □ Unit tests for each service                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: HTTP Client (Week 3)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: HTTP CLIENT                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tasks:                                                                 │
│  ──────                                                                 │
│  3.1 Implement MktAuthHttpService                                       │
│      ├── Axios instance with interceptors                               │
│      ├── Request interceptor (inject Bearer token)                      │
│      ├── Response interceptor (handle 401)                              │
│      ├── Retry logic (5xx, 429 with exponential backoff)                │
│      └── Request/response logging                                       │
│                                                                         │
│  3.2 Implement 401 handling flow                                        │
│      ├── Detect 401 response                                            │
│      ├── Invalidate token (event + cache clear)                         │
│      ├── Acquire distributed lock                                       │
│      ├── Re-login (call signInByEmail)                                  │
│      ├── Retry original request                                         │
│      └── Release lock                                                   │
│                                                                         │
│  3.3 Integrate with MktProductIntegrationModule                         │
│      ├── Replace direct HTTP calls                                      │
│      ├── Use MktAuthHttpService.request()                               │
│      └── Handle auth events                                             │
│                                                                         │
│  Deliverables:                                                          │
│  ─────────────                                                          │
│  □ MktAuthHttpService with full interceptor chain                       │
│  □ 401 handling with re-login flow                                      │
│  □ Integration with existing modules                                    │
│  □ Integration tests                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 4: Observability (Week 4)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: OBSERVABILITY                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tasks:                                                                 │
│  ──────                                                                 │
│  4.1 Implement MktAuthMetricsService                                    │
│      ├── Prometheus client integration                                  │
│      ├── Counter: token_acquisitions_total                              │
│      ├── Counter: token_cache_hits_total                                │
│      ├── Counter: token_cache_misses_total                              │
│      ├── Counter: relogin_attempts_total                                │
│      ├── Histogram: token_acquisition_duration_seconds                  │
│      ├── Gauge: circuit_breaker_state                                   │
│      └── Gauge: token_expiry_seconds                                    │
│                                                                         │
│  4.2 Add structured logging                                             │
│      ├── Log context (MktAuthClient)                                    │
│      ├── Debug: cache hits, token refresh                               │
│      ├── Info: successful auth, circuit state changes                   │
│      ├── Warn: retries, approaching expiry                              │
│      └── Error: auth failures, circuit open                             │
│                                                                         │
│  4.3 Configure alerting rules                                           │
│      ├── High auth failure rate (>5 in 5min)                            │
│      ├── Circuit breaker open                                           │
│      ├── Token near expiry without refresh                              │
│      └── Relogin failure rate                                           │
│                                                                         │
│  Deliverables:                                                          │
│  ─────────────                                                          │
│  □ MktAuthMetricsService with all metrics                               │
│  □ Grafana dashboard JSON                                               │
│  □ Prometheus alert rules YAML                                          │
│  □ Structured logging throughout                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 5: Testing (Week 5)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: TESTING                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tasks:                                                                 │
│  ──────                                                                 │
│  5.1 Unit Tests                                                         │
│      ├── MktAuthCacheService                                            │
│      │   ├── Local cache TTL expiration                                 │
│      │   ├── Redis fallback on local miss                               │
│      │   └── Cache invalidation                                         │
│      ├── MktAuthClientService                                           │
│      │   ├── Bootstrap flow                                             │
│      │   ├── Proactive refresh scheduling                               │
│      │   ├── Jitter calculation                                         │
│      │   └── Circuit breaker state transitions                          │
│      └── MktAuthHttpService                                             │
│          ├── Request interceptor                                        │
│          ├── 401 handling                                               │
│          └── Retry logic                                                │
│                                                                         │
│  5.2 Integration Tests                                                  │
│      ├── Full auth flow (bootstrap → use → refresh)                     │
│      ├── 401 recovery flow                                              │
│      ├── Multi-instance lock contention                                 │
│      └── Circuit breaker recovery                                       │
│                                                                         │
│  5.3 Load Tests                                                         │
│      ├── Concurrent token requests                                      │
│      ├── Cache performance under load                                   │
│      └── Lock contention scenarios                                      │
│                                                                         │
│  Deliverables:                                                          │
│  ─────────────                                                          │
│  □ >80% code coverage                                                   │
│  □ Integration test suite                                               │
│  □ Load test results documented                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 6: Documentation & Deployment (Week 6)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: DOCUMENTATION & DEPLOYMENT                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tasks:                                                                 │
│  ──────                                                                 │
│  6.1 Documentation                                                      │
│      ├── API documentation (JSDoc)                                      │
│      ├── Architecture diagram (Mermaid)                                 │
│      ├── Configuration guide                                            │
│      ├── Troubleshooting guide                                          │
│      └── Runbook for operations                                         │
│                                                                         │
│  6.2 Deployment Checklist                                               │
│      ├── Environment variables configured                               │
│      ├── Redis connection verified                                      │
│      ├── MKT Server credentials set                                     │
│      ├── Prometheus scrape configured                                   │
│      ├── Grafana dashboard imported                                     │
│      └── Alert channels configured                                      │
│                                                                         │
│  6.3 Rollout Plan                                                       │
│      ├── Stage 1: Deploy to staging                                     │
│      ├── Stage 2: Smoke test auth flows                                 │
│      ├── Stage 3: Monitor metrics (24h)                                 │
│      ├── Stage 4: Deploy to production                                  │
│      └── Stage 5: Post-deploy monitoring (72h)                          │
│                                                                         │
│  Deliverables:                                                          │
│  ─────────────                                                          │
│  □ Complete documentation                                               │
│  □ Deployment runbook                                                   │
│  □ Successful staging deployment                                        │
│  □ Production deployment                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation Timeline Summary

```
┌───────────┬──────────────────────────────────────────────────────────────┐
│   Week    │  Deliverables                                                │
├───────────┼──────────────────────────────────────────────────────────────┤
│  Week 1   │  Module structure, configs, types                            │
│  Week 2   │  Cache, Lock, Client services                                │
│  Week 3   │  HTTP client, 401 handling, integration                      │
│  Week 4   │  Metrics, logging, alerting                                  │
│  Week 5   │  Unit tests, integration tests, load tests                   │
│  Week 6   │  Documentation, staging deploy, production deploy            │
└───────────┴──────────────────────────────────────────────────────────────┘

Total Duration: 6 weeks
Team Size: 1-2 developers
```

### Risk Mitigation During Implementation

| Risk | Mitigation | Owner |
|------|------------|-------|
| MKT Server downtime during testing | Mock server for unit tests, staging MKT Server for integration | Dev |
| Redis connection issues | Graceful degradation (fallback to direct auth) | Dev |
| Configuration errors | Zod validation with clear error messages | Dev |
| Performance regression | Load testing before production | QA |
| Metric collection overhead | Sampling for high-frequency metrics | DevOps |

### Definition of Done

- [ ] All unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] No critical/high security vulnerabilities
- [ ] Documentation complete and reviewed
- [ ] Metrics visible in Grafana
- [ ] Alerts configured and tested
- [ ] Staging deployment successful (24h stable)
- [ ] Code review approved
- [ ] Product owner sign-off
