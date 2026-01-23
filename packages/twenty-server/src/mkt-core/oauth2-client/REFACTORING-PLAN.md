# Refactoring Plan: Multi-Auth Strategy Module

> Refactor oauth2-client module to support multiple authentication strategies (OAuth2 & JWT Password)

---

## 1. Current State Analysis

### 1.1 Existing Structure

```
oauth2-client/
├── oauth2-client.module.ts
├── config/
│   ├── oauth2-client.config.ts      # Environment configuration
│   └── oauth2-client.validation.ts
├── constants/
│   ├── oauth2-client.constant.ts    # Default values, cache TTLs
│   └── oauth2-client-messages.constant.ts
├── dto/
│   └── oauth2-management.output.ts  # GraphQL output types
├── resolvers/
│   └── oauth2-management.resolver.ts
├── services/
│   ├── oauth2-client.service.ts     # Token management (OAuth2 only)
│   ├── oauth2-http.service.ts       # Authenticated HTTP client
│   ├── oauth2-cache.service.ts      # Token caching
│   ├── oauth2-lock.service.ts       # Distributed locks
│   ├── oauth2-rate-limiter.service.ts
│   └── oauth2-circuit-breaker.service.ts
└── types/
    ├── oauth2-token.type.ts
    ├── oauth2-config.type.ts
    ├── oauth2-error.type.ts
    ├── oauth2-service.type.ts
    └── oauth2-event.type.ts
```

### 1.2 Current Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ OAuth2Client    │────▶│ OAuth2Cache     │────▶│ Redis           │
│ Service         │     │ Service         │     │ (Token Store)   │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         │ (client_credentials)
         ▼
┌─────────────────┐
│ MKT Server      │
│ /oauth/token    │
└─────────────────┘
```

### 1.3 Limitations

1. **Hard-coded OAuth2 flow**: `client_credentials` grant only
2. **No strategy switching**: Cannot choose authentication method at runtime
3. **Single token type**: Only supports OAuth2 access tokens
4. **Tight coupling**: OAuth2ClientService directly handles HTTP calls

---

## 2. Target Architecture

### 2.1 Design Goals

- **Strategy Pattern**: Pluggable authentication strategies
- **Interface Segregation**: Clear contracts for each auth type
- **Backward Compatibility**: Existing OAuth2 flow continues to work
- **Configuration-driven**: Switch auth mode via environment variables
- **Extensible**: Easy to add new auth strategies (API Key, mTLS, etc.)
- **Fail-fast**: Validate configuration on startup, throw clear errors

### 2.2 New Module Name

Rename: `oauth2-client` → `auth-client` (generic authentication client)

### 2.3 Proposed Structure

```
auth-client/
├── auth-client.module.ts              # Main module with dynamic provider registration
├── config/
│   ├── index.ts
│   ├── auth-client.config.ts          # Configuration registry
│   ├── auth-client.defaults.ts        # Default values
│   └── auth-client.validation.ts      # Zod validation schemas
├── constants/
│   ├── index.ts
│   ├── auth-client.constant.ts        # AUTH_MODE enum, defaults
│   └── auth-client-messages.constant.ts
├── dto/
│   ├── index.ts
│   ├── auth-management.input.ts       # GraphQL inputs
│   └── auth-management.output.ts      # GraphQL outputs
├── resolvers/
│   ├── index.ts
│   └── auth-management.resolver.ts
├── services/
│   ├── index.ts
│   ├── core/                          # Core services (shared)
│   │   ├── auth-cache.service.ts      # Token caching (generic)
│   │   ├── auth-lock.service.ts       # Distributed locks
│   │   ├── auth-rate-limiter.service.ts
│   │   └── auth-circuit-breaker.service.ts
│   ├── strategies/                    # Authentication strategies
│   │   ├── auth-strategy.interface.ts # Strategy contract
│   │   ├── oauth2/
│   │   │   ├── oauth2.strategy.ts     # OAuth2 implementation
│   │   │   └── oauth2.types.ts
│   │   └── jwt-password/
│   │       ├── jwt-password.strategy.ts  # JWT Password implementation
│   │       └── jwt-password.types.ts
│   ├── auth-client.service.ts         # Facade using strategy
│   └── auth-http.service.ts           # Authenticated HTTP client
├── compat/                            # Backward compatibility layer
│   ├── index.ts                       # Re-exports for old import paths
│   ├── oauth2-client.compat.ts        # OAuth2ClientService adapter
│   └── oauth2-http.compat.ts          # OAuth2HttpService adapter
├── types/
│   ├── index.ts
│   ├── auth-token.type.ts             # Generic token types
│   ├── auth-config.type.ts            # Configuration types
│   ├── auth-error.type.ts             # Error types
│   ├── auth-service.type.ts           # Service types
│   └── auth-event.type.ts             # Event types
└── utils/
    └── auth-client.utils.ts           # Utility functions
```

---

## 3. Core Interfaces

### 3.1 Authentication Strategy Interface

```typescript
// services/strategies/auth-strategy.interface.ts

import { DateTimeUtils } from 'src/mkt-core/utils';

export const AUTH_MODE = {
  OAUTH2: 'oauth2',
  JWT_PASSWORD: 'jwt_password',
} as const;

export type AuthModeType = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];

/**
 * Base token type - all strategies must return this
 *
 * IMPORTANT: Use DateTimeUtils for all date operations
 * - expiresAt: ISO string for consistency across cache serialization
 * - issuedAt: ISO string for consistency
 */
export type AuthToken = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: string;           // ISO string (DateTimeUtils.toISO)
  issuedAt: string;            // ISO string (DateTimeUtils.toISO)
  refreshToken?: string;       // Optional for refresh flow
  scopes?: string[];           // Optional for OAuth2
};

/**
 * Authentication strategy contract
 */
export type AuthStrategy = {
  readonly mode: AuthModeType;
  getAccessToken(): Promise<string>;
  refreshToken(): Promise<string>;
  invalidateToken(): Promise<void>;
  getTokenMetadata(): Promise<AuthTokenMetadata | null>;
  isConfigured(): boolean;
};

export type AuthTokenMetadata = {
  valid: boolean;
  expiresIn: number;
  issuedAt: string;            // ISO string
  expiresAt: string;           // ISO string
  lastRefreshedAt: string;     // ISO string
  refreshCount: number;
  scopes?: string[];
  username?: string;
};
```

### 3.2 OAuth2 Strategy Types

```typescript
// services/strategies/oauth2/oauth2.types.ts

export type OAuth2Config = {
  serverUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  tokenEndpoint: string;
  introspectEndpoint?: string;
  revokeEndpoint?: string;
};

export type OAuth2TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
};
```

### 3.3 JWT Password Strategy Types

```typescript
// services/strategies/jwt-password/jwt-password.types.ts

export type JwtPasswordConfig = {
  serverUrl: string;
  loginEndpoint: string;
  refreshEndpoint?: string;
  logoutEndpoint?: string;
  username: string;
  password: string;
};

export type JwtPasswordTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
};

export type JwtPasswordLoginRequest = {
  username: string;
  password: string;
};
```

---

## 4. Configuration

### 4.1 Environment Variables

```bash
# Authentication Mode Selection
AUTH_CLIENT_MODE=oauth2|jwt_password  # Default: oauth2

# ============================================
# OAuth2 Configuration (when AUTH_CLIENT_MODE=oauth2)
# ============================================
MKT_API_BASE_URL=http://localhost:3006
MKT_OAUTH_CLIENT_ID=your-client-id
MKT_OAUTH_CLIENT_SECRET=your-client-secret
MKT_OAUTH_SCOPES=read write
OAUTH2_TOKEN_ENDPOINT=/oauth/token

# ============================================
# JWT Password Configuration (when AUTH_CLIENT_MODE=jwt_password)
# Required fields when mode=jwt_password (fail-fast if missing)
# ============================================
AUTH_JWT_SERVER_URL=http://localhost:3006      # Required
AUTH_JWT_LOGIN_ENDPOINT=/auth/login            # Required
AUTH_JWT_REFRESH_ENDPOINT=/auth/refresh        # Optional
AUTH_JWT_USERNAME=admin                        # Required
AUTH_JWT_PASSWORD=secret                       # Required

# ============================================
# Common Configuration (for both modes)
# ============================================
# Cache
AUTH_CACHE_LRU_MAX=10
AUTH_CACHE_LRU_TTL_MS=3600000
AUTH_CACHE_REDIS_TTL_SECONDS=3600

# Refresh
AUTH_REFRESH_THRESHOLD_SECONDS=300
AUTH_REFRESH_INTERVAL_MS=30000

# HTTP
AUTH_HTTP_TIMEOUT_MS=10000
AUTH_HTTP_MAX_RETRIES=3
AUTH_HTTP_RETRY_DELAY_MS=1000

# Rate Limit (scope varies by strategy - see section 4.3)
AUTH_RATE_LIMIT_ENABLED=true
AUTH_RATE_LIMIT_MAX_ATTEMPTS=10
AUTH_RATE_LIMIT_WINDOW_MS=60000

# Circuit Breaker (scope varies by strategy - see section 4.3)
AUTH_CIRCUIT_BREAKER_ENABLED=true
AUTH_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
AUTH_CIRCUIT_BREAKER_RESET_TIMEOUT_MS=60000
```

### 4.2 Configuration Validation (Zod Schema)

```typescript
// config/auth-client.validation.ts

import { z } from 'zod';
import { AUTH_MODE } from '../constants';

const oauth2ConfigSchema = z.object({
  serverUrl: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  scopes: z.string(),
  tokenEndpoint: z.string().startsWith('/'),
});

const jwtPasswordConfigSchema = z.object({
  serverUrl: z.string().url('AUTH_JWT_SERVER_URL must be a valid URL'),
  loginEndpoint: z.string().startsWith('/', 'AUTH_JWT_LOGIN_ENDPOINT must start with /'),
  refreshEndpoint: z.string().startsWith('/').optional(),
  logoutEndpoint: z.string().startsWith('/').optional(),
  username: z.string().min(1, 'AUTH_JWT_USERNAME is required'),
  password: z.string().min(1, 'AUTH_JWT_PASSWORD is required'),
});

const commonConfigSchema = z.object({
  cache: z.object({
    lruMax: z.number().positive(),
    lruTtlMs: z.number().positive(),
    redisTtlSeconds: z.number().positive(),
  }),
  refresh: z.object({
    thresholdSeconds: z.number().positive(),
    intervalMs: z.number().positive(),
  }),
  http: z.object({
    timeoutMs: z.number().positive(),
    maxRetries: z.number().min(0),
    retryDelayMs: z.number().positive(),
  }),
  rateLimit: z.object({
    enabled: z.boolean(),
    maxAttempts: z.number().positive(),
    windowMs: z.number().positive(),
  }),
  circuitBreaker: z.object({
    enabled: z.boolean(),
    failureThreshold: z.number().positive(),
    resetTimeoutMs: z.number().positive(),
  }),
});

export const authClientConfigSchema = z.object({
  mode: z.enum([AUTH_MODE.OAUTH2, AUTH_MODE.JWT_PASSWORD]),
  oauth2: oauth2ConfigSchema,
  jwtPassword: jwtPasswordConfigSchema,
  ...commonConfigSchema.shape,
});

/**
 * Validate config on module initialization
 * FAIL-FAST: Throw error with clear message if validation fails
 */
export const validateAuthClientConfig = (config: unknown): void => {
  const result = authClientConfigSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.errors
      .map(e => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    throw new Error(
      `Auth client configuration validation failed:\n${errors}\n` +
      `Please check your environment variables.`
    );
  }

  // Additional validation: if mode=jwt_password, all required JWT fields must be present
  if (result.data.mode === AUTH_MODE.JWT_PASSWORD) {
    const jwtConfig = result.data.jwtPassword;
    const missingFields: string[] = [];

    if (!jwtConfig.serverUrl) missingFields.push('AUTH_JWT_SERVER_URL');
    if (!jwtConfig.loginEndpoint) missingFields.push('AUTH_JWT_LOGIN_ENDPOINT');
    if (!jwtConfig.username) missingFields.push('AUTH_JWT_USERNAME');
    if (!jwtConfig.password) missingFields.push('AUTH_JWT_PASSWORD');

    if (missingFields.length > 0) {
      throw new Error(
        `AUTH_CLIENT_MODE=jwt_password requires these environment variables:\n` +
        missingFields.map(f => `  - ${f}`).join('\n')
      );
    }
  }
};
```

### 4.3 Rate Limiter & Circuit Breaker Scope

| Strategy | Rate Limiter Scope | Circuit Breaker Scope |
|----------|-------------------|----------------------|
| OAuth2 | Per clientId (`oauth2:rate:{clientId}`) | Per clientId (`oauth2:cb:{clientId}`) |
| JWT Password | Per username (`jwt:rate:{username}`) | Per serverUrl (`jwt:cb:{serverUrl}`) |

**Rationale**:
- **OAuth2**: Single clientId per application, rate limit per client
- **JWT Password**: Multiple users possible, rate limit per user to prevent brute-force; circuit breaker per server to detect server issues

```typescript
// Rate limiter key generation
class OAuth2Strategy {
  private getRateLimitKey(): string {
    return `oauth2:rate:${this.clientId}`;
  }

  private getCircuitBreakerKey(): string {
    return `oauth2:cb:${this.clientId}`;
  }
}

class JwtPasswordStrategy {
  private getRateLimitKey(): string {
    return `jwt:rate:${this.username}`;
  }

  private getCircuitBreakerKey(): string {
    return `jwt:cb:${this.serverUrl}`;
  }
}
```

---

## 5. Implementation Details

### 5.1 Token Parsing with DateTimeUtils

```typescript
// Utility for parsing token responses - USE DateTimeUtils

import { DateTimeUtils } from 'src/mkt-core/utils';

private parseTokenResponse(response: OAuth2TokenResponse): AuthToken {
  const now = DateTimeUtils.now();
  const expiresAt = DateTimeUtils.add(now, { seconds: response.expires_in });

  return {
    accessToken: response.access_token,
    tokenType: response.token_type,
    expiresIn: response.expires_in,
    expiresAt: DateTimeUtils.toISO(expiresAt),     // ISO string
    issuedAt: DateTimeUtils.toISO(now),            // ISO string
    scopes: response.scope?.split(' ') ?? [],
    refreshToken: response.refresh_token,
  };
}

// When checking expiry
private shouldRefresh(token: AuthToken): boolean {
  const expiresAt = DateTimeUtils.fromISO(token.expiresAt);
  const now = DateTimeUtils.now();
  const secondsUntilExpiry = DateTimeUtils.diff(expiresAt, now, 'seconds');

  return secondsUntilExpiry <= this.refreshThresholdSeconds;
}

private getSecondsUntilExpiry(token: AuthToken): number {
  const expiresAt = DateTimeUtils.fromISO(token.expiresAt);
  const now = DateTimeUtils.now();

  return Math.max(0, Math.floor(DateTimeUtils.diff(expiresAt, now, 'seconds')));
}
```

### 5.2 OAuth2 Strategy Implementation

```typescript
// services/strategies/oauth2/oauth2.strategy.ts

import { DateTimeUtils } from 'src/mkt-core/utils';

@Injectable()
export class OAuth2Strategy implements AuthStrategy {
  readonly mode = AUTH_MODE.OAUTH2;
  private lastRefreshedAt?: string;  // ISO string
  private refreshCount = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cacheService: AuthCacheService,
    private readonly lockService: AuthLockService,
    private readonly rateLimiterService: AuthRateLimiterService,
    private readonly circuitBreakerService: AuthCircuitBreakerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getAccessToken(): Promise<string> {
    const cacheKey = this.getCacheKey();
    const cachedToken = await this.cacheService.getToken(cacheKey);

    if (cachedToken && !this.shouldRefresh(cachedToken)) {
      return cachedToken.accessToken;
    }

    return this.lockService.executeWithLock(
      `oauth2:refresh:${this.clientId}`,
      async () => {
        const recheckedToken = await this.cacheService.getToken(cacheKey);
        if (recheckedToken && !this.shouldRefresh(recheckedToken)) {
          return recheckedToken.accessToken;
        }

        const isRefresh = cachedToken !== null;
        const newToken = await this.fetchNewToken();

        await this.cacheService.setToken(cacheKey, newToken);
        this.lastRefreshedAt = DateTimeUtils.toISO(DateTimeUtils.now());
        this.refreshCount++;

        this.emitTokenAcquiredEvent(newToken, isRefresh);
        return newToken.accessToken;
      },
    );
  }

  async getTokenMetadata(): Promise<AuthTokenMetadata | null> {
    const cacheKey = this.getCacheKey();
    const token = await this.cacheService.getToken(cacheKey);

    if (!token) return null;

    return {
      valid: this.getSecondsUntilExpiry(token) > 0,
      expiresIn: this.getSecondsUntilExpiry(token),
      scopes: token.scopes,
      issuedAt: token.issuedAt,
      expiresAt: token.expiresAt,
      lastRefreshedAt: this.lastRefreshedAt ?? token.issuedAt,
      refreshCount: this.refreshCount,
    };
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  private getCacheKey(): string {
    return `oauth2:${this.clientId}`;
  }

  private getRateLimitKey(): string {
    return `oauth2:rate:${this.clientId}`;
  }

  private getCircuitBreakerKey(): string {
    return `oauth2:cb:${this.clientId}`;
  }
}
```

### 5.3 JWT Password Strategy Implementation

```typescript
// services/strategies/jwt-password/jwt-password.strategy.ts

import { DateTimeUtils } from 'src/mkt-core/utils';

@Injectable()
export class JwtPasswordStrategy implements AuthStrategy {
  readonly mode = AUTH_MODE.JWT_PASSWORD;
  private lastRefreshedAt?: string;
  private refreshCount = 0;

  async getAccessToken(): Promise<string> {
    const cacheKey = this.getCacheKey();
    const cachedToken = await this.cacheService.getToken(cacheKey);

    if (cachedToken && !this.shouldRefresh(cachedToken)) {
      return cachedToken.accessToken;
    }

    return this.lockService.executeWithLock(
      `jwt:refresh:${this.username}`,
      async () => {
        const recheckedToken = await this.cacheService.getToken(cacheKey);
        if (recheckedToken && !this.shouldRefresh(recheckedToken)) {
          return recheckedToken.accessToken;
        }

        // Try refresh first if we have refresh_token
        if (cachedToken?.refreshToken && this.refreshEndpoint) {
          try {
            const refreshed = await this.refreshWithRefreshToken(cachedToken.refreshToken);
            await this.cacheService.setToken(cacheKey, refreshed);
            this.lastRefreshedAt = DateTimeUtils.toISO(DateTimeUtils.now());
            this.refreshCount++;
            return refreshed.accessToken;
          } catch {
            // Refresh failed, fall through to login
          }
        }

        // Login with username/password
        const newToken = await this.login();
        await this.cacheService.setToken(cacheKey, newToken);
        this.lastRefreshedAt = DateTimeUtils.toISO(DateTimeUtils.now());
        this.refreshCount++;
        this.emitTokenAcquiredEvent(newToken);
        return newToken.accessToken;
      },
    );
  }

  async getTokenMetadata(): Promise<AuthTokenMetadata | null> {
    const cacheKey = this.getCacheKey();
    const token = await this.cacheService.getToken(cacheKey);

    if (!token) return null;

    return {
      valid: this.getSecondsUntilExpiry(token) > 0,
      expiresIn: this.getSecondsUntilExpiry(token),
      issuedAt: token.issuedAt,
      expiresAt: token.expiresAt,
      lastRefreshedAt: this.lastRefreshedAt ?? token.issuedAt,
      refreshCount: this.refreshCount,
      username: this.username,
    };
  }

  isConfigured(): boolean {
    return Boolean(this.username && this.password && this.serverUrl && this.loginEndpoint);
  }

  private getCacheKey(): string {
    return `jwt:${this.username}`;
  }

  private getRateLimitKey(): string {
    return `jwt:rate:${this.username}`;
  }

  private getCircuitBreakerKey(): string {
    return `jwt:cb:${this.serverUrl}`;
  }

  private parseTokenResponse(response: JwtPasswordTokenResponse): AuthToken {
    const now = DateTimeUtils.now();
    const expiresAt = DateTimeUtils.add(now, { seconds: response.expires_in });

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      tokenType: response.token_type ?? 'Bearer',
      expiresIn: response.expires_in,
      expiresAt: DateTimeUtils.toISO(expiresAt),
      issuedAt: DateTimeUtils.toISO(now),
    };
  }
}
```

### 5.4 Backward Compatibility Layer

```typescript
// compat/index.ts
// Re-export for old import paths

export { OAuth2ClientServiceCompat as OAuth2ClientService } from './oauth2-client.compat';
export { OAuth2HttpServiceCompat as OAuth2HttpService } from './oauth2-http.compat';

// compat/oauth2-client.compat.ts
import { Injectable, Logger } from '@nestjs/common';
import { AuthClientService } from '../services/auth-client.service';

/**
 * @deprecated Use AuthClientService instead. Will be removed in v2.0.
 * Import from 'src/mkt-core/auth-client' instead of 'src/mkt-core/oauth2-client'
 */
@Injectable()
export class OAuth2ClientServiceCompat {
  private readonly logger = new Logger('OAuth2ClientService [DEPRECATED]');
  private hasLoggedDeprecation = false;

  constructor(private readonly authClientService: AuthClientService) {}

  private logDeprecationOnce(): void {
    if (!this.hasLoggedDeprecation) {
      this.logger.warn(
        'OAuth2ClientService is deprecated. ' +
        'Please migrate to AuthClientService from "src/mkt-core/auth-client". ' +
        'This compatibility layer will be removed in v2.0.'
      );
      this.hasLoggedDeprecation = true;
    }
  }

  async getAccessToken(): Promise<string> {
    this.logDeprecationOnce();
    return this.authClientService.getAccessToken();
  }

  async invalidateToken(): Promise<void> {
    this.logDeprecationOnce();
    return this.authClientService.invalidateToken();
  }

  async getTokenMetadata() {
    this.logDeprecationOnce();
    return this.authClientService.getTokenMetadata();
  }

  async healthCheck() {
    this.logDeprecationOnce();
    return this.authClientService.healthCheck();
  }
}

// compat/oauth2-http.compat.ts
import { Injectable, Logger } from '@nestjs/common';
import { AuthHttpService } from '../services/auth-http.service';

/**
 * @deprecated Use AuthHttpService instead. Will be removed in v2.0.
 */
@Injectable()
export class OAuth2HttpServiceCompat {
  private readonly logger = new Logger('OAuth2HttpService [DEPRECATED]');
  private hasLoggedDeprecation = false;

  constructor(private readonly authHttpService: AuthHttpService) {}

  private logDeprecationOnce(): void {
    if (!this.hasLoggedDeprecation) {
      this.logger.warn(
        'OAuth2HttpService is deprecated. ' +
        'Please migrate to AuthHttpService from "src/mkt-core/auth-client".'
      );
      this.hasLoggedDeprecation = true;
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig, userContext?: UserContext): Promise<T> {
    this.logDeprecationOnce();
    return this.authHttpService.get<T>(url, config, userContext);
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig, userContext?: UserContext): Promise<T> {
    this.logDeprecationOnce();
    return this.authHttpService.post<T>(url, data, config, userContext);
  }

  // ... other methods
}
```

### 5.5 Module with Backward Compatibility

```typescript
// auth-client.module.ts

@Module({})
export class AuthClientModule {
  static forRoot(): DynamicModule {
    return {
      module: AuthClientModule,
      imports: [
        ConfigModule.forFeature(authClientConfig),
        HttpModule,
        CacheLockModule,
        RedisInfrastructureModule,
      ],
      providers: [
        // Core services (shared)
        AuthCacheService,
        AuthLockService,
        AuthRateLimiterService,
        AuthCircuitBreakerService,

        // Strategies
        OAuth2Strategy,
        JwtPasswordStrategy,

        // Facade
        AuthClientService,
        AuthHttpService,

        // Backward compatibility (deprecated)
        OAuth2ClientServiceCompat,
        OAuth2HttpServiceCompat,

        // Resolver
        AuthManagementResolver,
      ],
      exports: [
        AuthClientService,
        AuthHttpService,
        // Deprecated exports for backward compatibility
        OAuth2ClientServiceCompat,
        OAuth2HttpServiceCompat,
      ],
    };
  }
}

// oauth2-client.module.ts (deprecated alias)
import { Module, Logger } from '@nestjs/common';
import { AuthClientModule } from '../auth-client/auth-client.module';

/**
 * @deprecated Use AuthClientModule instead. Will be removed in v2.0.
 */
@Module({})
export class OAuth2ClientModule {
  private static hasLoggedDeprecation = false;

  static forRoot() {
    if (!this.hasLoggedDeprecation) {
      const logger = new Logger('OAuth2ClientModule');
      logger.warn(
        'OAuth2ClientModule is deprecated. ' +
        'Please import AuthClientModule from "src/mkt-core/auth-client" instead.'
      );
      this.hasLoggedDeprecation = true;
    }

    return AuthClientModule.forRoot();
  }
}
```

---

## 6. Migration Plan

### Phase 1: Preparation (Backward Compatible)

1. **Create new directory structure** under `auth-client/`
2. **Copy existing services** with minimal changes
3. **Add AUTH_MODE constant** with default `oauth2`
4. **Create compatibility layer** (`compat/`) with re-exports and adapters
5. **Add deprecation logging** for old imports

### Phase 2: Strategy Implementation

1. **Create AuthStrategy interface**
2. **Add Zod validation schemas** for configuration
3. **Refactor OAuth2ClientService** → OAuth2Strategy
4. **Implement JwtPasswordStrategy**
5. **Create AuthClientService** facade
6. **Update AuthHttpService** for strategy switching

### Phase 3: Integration

1. **Update configuration** (add new env vars)
2. **Keep old module as alias** with deprecation warning
3. **Test both auth modes**
4. **Update consumers** (MktProductIntegration, etc.)

### Phase 4: Cleanup (Future Release v2.0)

1. **Remove deprecated oauth2-client** module
2. **Remove compatibility layer**
3. **Update all imports** project-wide
4. **Update CLAUDE.md**

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
// __tests__/oauth2.strategy.spec.ts
describe('OAuth2Strategy', () => {
  let strategy: OAuth2Strategy;
  let mockCacheService: jest.Mocked<AuthCacheService>;
  let mockHttpService: jest.Mocked<HttpService>;

  beforeEach(() => {
    // Setup mocks
    mockCacheService = createMock<AuthCacheService>();
    mockHttpService = createMock<HttpService>();
  });

  it('should fetch token with client_credentials grant');
  it('should cache token and return cached on subsequent calls');
  it('should refresh token when threshold reached');
  it('should handle circuit breaker open state');
  it('should use correct rate limit key (per clientId)');
  it('should use correct circuit breaker key (per clientId)');
});

// __tests__/jwt-password.strategy.spec.ts
describe('JwtPasswordStrategy', () => {
  it('should login with username/password');
  it('should refresh using refresh_token when available');
  it('should fall back to login when refresh fails');
  it('should call logout endpoint on invalidate');
  it('should use correct rate limit key (per username)');
  it('should use correct circuit breaker key (per serverUrl)');
});

// __tests__/auth-client.service.spec.ts
describe('AuthClientService', () => {
  it('should select OAuth2Strategy when mode=oauth2');
  it('should select JwtPasswordStrategy when mode=jwt_password');
  it('should delegate to selected strategy');
  it('should fail-fast when jwt_password mode missing required config');
});
```

### 7.2 AuthHttpService Tests

```typescript
// __tests__/auth-http.service.spec.ts
describe('AuthHttpService', () => {
  let service: AuthHttpService;
  let mockAuthClientService: jest.Mocked<AuthClientService>;
  let mockHttpService: jest.Mocked<HttpService>;

  describe('Header Injection', () => {
    it('should inject Authorization header with Bearer token');
    it('should inject X-User-Id header when userContext provided');
    it('should inject X-User-Name header when userContext provided');
    it('should merge custom headers with injected headers');
  });

  describe('Strategy Switch', () => {
    it('should work with OAuth2 strategy token');
    it('should work with JWT Password strategy token');
    it('should invalidate and retry on 401 response');
  });

  describe('Retry Logic', () => {
    it('should retry on 5xx errors');
    it('should retry on network errors (ECONNREFUSED, ETIMEDOUT)');
    it('should not retry on 4xx errors (except 401, 408, 429)');
    it('should calculate exponential backoff with jitter');
  });
});
```

### 7.3 Configuration Parsing Tests

```typescript
// __tests__/config/auth-client.validation.spec.ts
describe('Auth Client Config Validation', () => {
  describe('validateAuthClientConfig', () => {
    it('should pass with valid oauth2 config');
    it('should pass with valid jwt_password config');
    it('should fail when mode=jwt_password but missing AUTH_JWT_SERVER_URL');
    it('should fail when mode=jwt_password but missing AUTH_JWT_USERNAME');
    it('should fail when mode=jwt_password but missing AUTH_JWT_PASSWORD');
    it('should fail when mode=jwt_password but missing AUTH_JWT_LOGIN_ENDPOINT');
    it('should provide clear error message listing missing fields');
  });

  describe('Zod Schema', () => {
    it('should validate serverUrl is a valid URL');
    it('should validate endpoints start with /');
    it('should validate positive numbers for timeouts');
    it('should validate boolean for enabled flags');
  });
});
```

### 7.4 Integration Tests

```typescript
// __tests__/auth-client.integration.spec.ts
describe('AuthClientModule Integration', () => {
  // Mock Redis
  let redisClient: jest.Mocked<Redis>;

  // Mock HTTP responses
  let mockServer: nock.Scope;

  beforeEach(() => {
    redisClient = createMockRedis();
    mockServer = nock('http://localhost:3006');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should initialize with OAuth2 and fetch token from server');
  it('should initialize with JWT Password and login');
  it('should switch strategies via AUTH_CLIENT_MODE');
  it('should cache tokens in Redis');
  it('should emit TOKEN_ACQUIRED event');
});
```

### 7.5 Mock Strategy

| Dependency | Mock Approach |
|------------|---------------|
| Redis | `ioredis-mock` or jest mock |
| HTTP | `nock` for HTTP mocking |
| ConfigService | Jest mock with `get()` returning test values |
| EventEmitter2 | Jest mock to verify event emission |
| CacheLockService | Jest mock with `withLock` executing callback |

---

## 8. Security Considerations

### 8.1 Password Storage

| Concern | Mitigation |
|---------|------------|
| Password in logs | Never log password; use `[REDACTED]` placeholder |
| Password in memory | Clear from memory after use (not guaranteed in JS) |
| Password in config | Use environment variables only, not config files |

### 8.2 Token Storage in Redis

| Concern | Status | Notes |
|---------|--------|-------|
| Redis at-rest encryption | **Out of scope** | Infrastructure responsibility (Redis Enterprise, AWS ElastiCache) |
| App-level token encryption | **Out of scope** | Would require key management complexity |
| Token TTL | **In scope** | Tokens expire via Redis TTL |
| Token isolation | **In scope** | Cache keys include strategy type + identifier |

**Note**: Token encryption at app level is not implemented due to:
1. Key management complexity (where to store encryption key?)
2. Performance overhead for every cache read/write
3. Limited security benefit if Redis is already secured at infra level

If token encryption is required, consider:
- Redis Enterprise with encryption at rest
- AWS ElastiCache with encryption
- HashiCorp Vault for secrets management

### 8.3 Refresh Token Security

| Measure | Implementation |
|---------|----------------|
| Short TTL | Cache TTL matches token expiry |
| Single use | Clear refresh token after successful refresh |
| Scope isolation | Different cache keys per user/client |

---

## 9. Affected Files

### Files to Modify

| File | Change |
|------|--------|
| `mkt-product-integration.module.ts` | Import AuthClientModule (can keep old import during transition) |
| `mkt-license-integration.module.ts` | Import AuthClientModule |
| `.env.example` | Add new environment variables |

### Files to Create

| File | Purpose |
|------|---------|
| `auth-client/auth-client.module.ts` | New module definition |
| `auth-client/config/auth-client.validation.ts` | Zod validation schemas |
| `auth-client/services/strategies/auth-strategy.interface.ts` | Strategy contract |
| `auth-client/services/strategies/oauth2/oauth2.strategy.ts` | OAuth2 implementation |
| `auth-client/services/strategies/jwt-password/jwt-password.strategy.ts` | JWT Password implementation |
| `auth-client/services/auth-client.service.ts` | Facade service |
| `auth-client/compat/index.ts` | Backward compatibility re-exports |
| `auth-client/compat/oauth2-client.compat.ts` | OAuth2ClientService adapter |
| `auth-client/compat/oauth2-http.compat.ts` | OAuth2HttpService adapter |

### Files to Remove (Phase 4 - v2.0)

- `oauth2-client/` directory (after migration period)
- `auth-client/compat/` directory

---

## 10. Sequence Diagrams

### 10.1 OAuth2 Flow

```
┌────────┐    ┌─────────────┐    ┌────────────┐    ┌───────────┐    ┌──────────┐
│Consumer│    │AuthClient   │    │OAuth2      │    │AuthCache  │    │MKT Server│
│        │    │Service      │    │Strategy    │    │Service    │    │          │
└───┬────┘    └──────┬──────┘    └─────┬──────┘    └─────┬─────┘    └────┬─────┘
    │                │                 │                 │               │
    │ getAccessToken │                 │                 │               │
    │───────────────▶│                 │                 │               │
    │                │ getAccessToken  │                 │               │
    │                │────────────────▶│                 │               │
    │                │                 │ getToken        │               │
    │                │                 │────────────────▶│               │
    │                │                 │ cached/null     │               │
    │                │                 │◀────────────────│               │
    │                │                 │                 │               │
    │                │                 │ [cache miss]    │               │
    │                │                 │ POST /oauth/token               │
    │                │                 │────────────────────────────────▶│
    │                │                 │ { access_token, expires_in }    │
    │                │                 │◀────────────────────────────────│
    │                │                 │                 │               │
    │                │                 │ setToken        │               │
    │                │                 │────────────────▶│               │
    │                │ accessToken     │                 │               │
    │                │◀────────────────│                 │               │
    │ accessToken    │                 │                 │               │
    │◀───────────────│                 │                 │               │
```

### 10.2 JWT Password Flow

```
┌────────┐    ┌─────────────┐    ┌────────────┐    ┌───────────┐    ┌──────────┐
│Consumer│    │AuthClient   │    │JwtPassword │    │AuthCache  │    │Auth      │
│        │    │Service      │    │Strategy    │    │Service    │    │Server    │
└───┬────┘    └──────┬──────┘    └─────┬──────┘    └─────┬─────┘    └────┬─────┘
    │                │                 │                 │               │
    │ getAccessToken │                 │                 │               │
    │───────────────▶│                 │                 │               │
    │                │ getAccessToken  │                 │               │
    │                │────────────────▶│                 │               │
    │                │                 │ getToken        │               │
    │                │                 │────────────────▶│               │
    │                │                 │ cached (w/ refresh_token)       │
    │                │                 │◀────────────────│               │
    │                │                 │                 │               │
    │                │                 │ [token expired, has refresh]    │
    │                │                 │ POST /auth/refresh              │
    │                │                 │────────────────────────────────▶│
    │                │                 │ { access_token, refresh_token } │
    │                │                 │◀────────────────────────────────│
    │                │                 │                 │               │
    │                │                 │ [OR refresh failed]             │
    │                │                 │ POST /auth/login                │
    │                │                 │────────────────────────────────▶│
    │                │                 │ { access_token, refresh_token } │
    │                │                 │◀────────────────────────────────│
    │                │                 │                 │               │
    │                │                 │ setToken        │               │
    │                │                 │────────────────▶│               │
    │                │ accessToken     │                 │               │
    │                │◀────────────────│                 │               │
    │ accessToken    │                 │                 │               │
    │◀───────────────│                 │                 │               │
```

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes for consumers | High | Compatibility layer with re-exports, deprecation warnings, 2-phase removal |
| Token format differences | Medium | Use generic AuthToken type with ISO string dates |
| Password storage security | High | Environment variables only, never log credentials |
| Refresh token leak | Medium | Short TTL, cache isolation per user/client. Token encryption out of scope (infra responsibility) |
| Strategy misconfiguration | Medium | Zod validation, fail-fast on startup with clear error messages |
| Rate limit scope confusion | Low | Document scope per strategy, use descriptive cache keys |

---

## 12. Timeline Estimate

| Phase | Tasks | Duration |
|-------|-------|----------|
| Phase 1 | Preparation, compatibility layer | 1 day |
| Phase 2 | Strategy implementation, validation | 2 days |
| Phase 3 | Integration, testing | 1.5 days |
| Phase 4 | Cleanup (future release) | 0.5 day |
| **Total** | | **5 days** |

---

## 13. Checklist

### Pre-Implementation

- [ ] Review plan with team
- [ ] Confirm JWT endpoint specification from Auth Server
- [ ] Set up test environment with both OAuth2 and JWT servers

### Implementation

- [ ] Create `auth-client/` directory structure
- [ ] Add Zod validation schemas (`config/auth-client.validation.ts`)
- [ ] Implement `AuthStrategy` interface
- [ ] Implement `OAuth2Strategy` (with DateTimeUtils)
- [ ] Implement `JwtPasswordStrategy` (with DateTimeUtils)
- [ ] Implement `AuthClientService` facade
- [ ] Create compatibility layer (`compat/`)
- [ ] Add deprecation logging
- [ ] Update `AuthHttpService`
- [ ] Update resolver

### Testing

- [ ] Unit tests for OAuth2Strategy
- [ ] Unit tests for JwtPasswordStrategy
- [ ] Unit tests for AuthClientService (strategy selection)
- [ ] Unit tests for AuthHttpService (header injection, strategy switch)
- [ ] Unit tests for config validation (Zod schemas)
- [ ] Integration tests with mock Redis/HTTP
- [ ] Manual testing with both auth modes

### Documentation

- [ ] Update CLAUDE.md (DateTimeUtils patterns)
- [ ] Update .env.example with new variables
- [ ] Update API documentation

---

**Author**: Claude
**Created**: 2026-01-23
**Updated**: 2026-01-23
**Version**: 1.1

### Changelog

**v1.1** (2026-01-23)
- Added backward compatibility layer with re-exports and deprecation logging
- Added Zod validation schemas for JWT config with fail-fast behavior
- Changed AuthToken dates to ISO string (DateTimeUtils consistency)
- Clarified Rate Limiter/Circuit Breaker scope per strategy
- Added AuthHttpService tests (header injection, strategy switch)
- Added config validation tests
- Clarified token encryption as "out of scope" (infra responsibility)
- Removed "inline code comments" from documentation checklist
