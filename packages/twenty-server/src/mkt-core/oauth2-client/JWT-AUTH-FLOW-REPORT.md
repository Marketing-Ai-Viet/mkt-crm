# Báo cáo Flow Xác thực JWT trong Auth-Client Module

> Tài liệu giải thích chi tiết cơ chế xác thực JWT Password trong module auth-client

---

## 1. Tổng quan

### 1.1 Mục đích

Module `auth-client` được thiết kế theo **Strategy Pattern** để hỗ trợ nhiều phương thức xác thực khác nhau:

| Strategy | Use Case | Đặc điểm |
|----------|----------|----------|
| **OAuth2** | Machine-to-machine (M2M) | Client credentials grant, không cần user interaction |
| **JWT Password** | User-based authentication | Username/password login, có refresh token |

### 1.2 Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                        AuthClientService                        │
│                         (Facade Layer)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │      Strategy Selection     │
              │   (AUTH_CLIENT_MODE env)    │
              └──────────────┬──────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   │                   ▼
┌─────────────────┐          │          ┌─────────────────┐
│  OAuth2Strategy │          │          │JwtPasswordStrategy│
│ (client_credentials)       │          │ (username/password)│
└────────┬────────┘          │          └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  AuthCacheService│
                    │    (Redis)       │
                    └─────────────────┘
```

---

## 2. JWT Password Authentication Flow

### 2.1 Cấu hình Environment Variables

```bash
# Chọn mode xác thực
AUTH_CLIENT_MODE=jwt_password

# Cấu hình JWT Password (bắt buộc khi mode=jwt_password)
AUTH_JWT_SERVER_URL=http://localhost:3006      # URL của Auth Server
AUTH_JWT_LOGIN_ENDPOINT=/auth/login            # Endpoint đăng nhập
AUTH_JWT_REFRESH_ENDPOINT=/auth/refresh        # Endpoint refresh token (optional)
AUTH_JWT_USERNAME=admin                        # Username
AUTH_JWT_PASSWORD=secret                       # Password
```

### 2.2 Cấu trúc Request/Response

#### Login Request
```typescript
// POST /auth/login
type JwtPasswordLoginRequest = {
  username: string;
  password: string;
};
```

#### Login Response
```typescript
type JwtPasswordTokenResponse = {
  access_token: string;      // JWT token
  refresh_token?: string;    // Optional refresh token
  token_type: string;        // Thường là "Bearer"
  expires_in: number;        // Thời gian hết hạn (seconds)
};
```

### 2.3 Flow chi tiết

```
┌────────┐    ┌─────────────┐    ┌────────────────┐    ┌───────────┐    ┌──────────┐
│Consumer│    │AuthClient   │    │JwtPassword     │    │AuthCache  │    │Auth      │
│        │    │Service      │    │Strategy        │    │Service    │    │Server    │
└───┬────┘    └──────┬──────┘    └───────┬────────┘    └─────┬─────┘    └────┬─────┘
    │                │                   │                   │               │
    │ (1) getAccessToken()               │                   │               │
    │───────────────▶│                   │                   │               │
    │                │                   │                   │               │
    │                │ (2) getAccessToken()                  │               │
    │                │──────────────────▶│                   │               │
    │                │                   │                   │               │
    │                │                   │ (3) getToken()    │               │
    │                │                   │──────────────────▶│               │
    │                │                   │                   │               │
    │                │                   │ (4) cached token  │               │
    │                │                   │◀──────────────────│               │
    │                │                   │                   │               │
    │                │                   │ (5) Token hết hạn?│               │
    │                │                   │────────┐          │               │
    │                │                   │        │ Check    │               │
    │                │                   │◀───────┘          │               │
    │                │                   │                   │               │
    │                │                   │ (6a) Có refresh_token, thử refresh │
    │                │                   │──────────────────────────────────▶│
    │                │                   │      POST /auth/refresh           │
    │                │                   │                   │               │
    │                │                   │ (6b) Refresh thành công           │
    │                │                   │◀──────────────────────────────────│
    │                │                   │                   │               │
    │                │                   │ (6c) HOẶC Refresh thất bại       │
    │                │                   │      → Login lại với username/pwd │
    │                │                   │──────────────────────────────────▶│
    │                │                   │      POST /auth/login             │
    │                │                   │                   │               │
    │                │                   │ (7) Token mới     │               │
    │                │                   │◀──────────────────────────────────│
    │                │                   │                   │               │
    │                │                   │ (8) setToken()    │               │
    │                │                   │──────────────────▶│               │
    │                │                   │                   │               │
    │                │ (9) accessToken   │                   │               │
    │                │◀──────────────────│                   │               │
    │                │                   │                   │               │
    │ (10) accessToken                   │                   │               │
    │◀───────────────│                   │                   │               │
```

---

## 3. Chi tiết các bước

### Bước 1-2: Consumer yêu cầu Access Token

Consumer (ví dụ: `MktProductIntegrationService`) gọi `AuthClientService.getAccessToken()`. Service này là **Facade** và sẽ delegate sang strategy phù hợp dựa trên `AUTH_CLIENT_MODE`.

### Bước 3-4: Kiểm tra Cache

Strategy kiểm tra token đã được cache trong Redis chưa:

```typescript
const cacheKey = `jwt:${this.username}`;  // Cache key theo username
const cachedToken = await this.cacheService.getToken(cacheKey);
```

### Bước 5: Kiểm tra Token hết hạn

Sử dụng `DateTimeUtils` để kiểm tra token còn hạn không:

```typescript
private shouldRefresh(token: AuthToken): boolean {
  const expiresAt = DateTimeUtils.fromISO(token.expiresAt);
  const now = DateTimeUtils.now();
  const secondsUntilExpiry = DateTimeUtils.diff(expiresAt, now, 'seconds');

  // Refresh trước khi hết hạn 5 phút (AUTH_REFRESH_THRESHOLD_SECONDS)
  return secondsUntilExpiry <= this.refreshThresholdSeconds;
}
```

### Bước 6: Refresh hoặc Login

**Flow quyết định:**

```
                    ┌─────────────────────┐
                    │ Token cần refresh?  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Có refresh_token?   │
                    └──────────┬──────────┘
                       YES     │     NO
                  ┌────────────┼────────────┐
                  ▼            │            ▼
         ┌────────────────┐    │    ┌────────────────┐
         │ POST /refresh  │    │    │ POST /login    │
         └───────┬────────┘    │    └───────┬────────┘
                 │             │            │
         ┌───────▼────────┐    │            │
         │ Refresh OK?    │    │            │
         └───────┬────────┘    │            │
            YES  │  NO         │            │
             ┌───┴───┐         │            │
             │       ▼         │            │
             │  ┌──────────────▼────────────▼┐
             │  │     POST /auth/login       │
             │  └─────────────┬──────────────┘
             │                │
             ▼                ▼
         ┌────────────────────────┐
         │   Lưu token mới vào    │
         │   cache và trả về      │
         └────────────────────────┘
```

### Bước 7-8: Lưu Token vào Cache

Token mới được parse và lưu vào Redis với TTL:

```typescript
private parseTokenResponse(response: JwtPasswordTokenResponse): AuthToken {
  const now = DateTimeUtils.now();
  const expiresAt = DateTimeUtils.add(now, { seconds: response.expires_in });

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    tokenType: response.token_type ?? 'Bearer',
    expiresIn: response.expires_in,
    expiresAt: DateTimeUtils.toISO(expiresAt),  // ISO string
    issuedAt: DateTimeUtils.toISO(now),         // ISO string
  };
}

// Lưu vào cache
await this.cacheService.setToken(cacheKey, newToken);
```

---

## 4. So sánh OAuth2 vs JWT Password

| Aspect | OAuth2 | JWT Password |
|--------|--------|--------------|
| **Grant Type** | `client_credentials` | Username/Password |
| **Refresh Mechanism** | Không (lấy token mới) | Có `refresh_token` |
| **Cache Key** | `oauth2:{clientId}` | `jwt:{username}` |
| **Rate Limit Scope** | Per clientId | Per username |
| **Circuit Breaker Scope** | Per clientId | Per serverUrl |
| **Use Case** | Service-to-service | User authentication |

---

## 5. Cơ chế bảo vệ

### 5.1 Rate Limiter

Giới hạn số lần request xác thực trong một khoảng thời gian:

```typescript
// Cache key cho rate limiter (per username)
private getRateLimitKey(): string {
  return `jwt:rate:${this.username}`;
}
```

**Cấu hình:**
```bash
AUTH_RATE_LIMIT_ENABLED=true
AUTH_RATE_LIMIT_MAX_ATTEMPTS=10      # Tối đa 10 lần
AUTH_RATE_LIMIT_WINDOW_MS=60000      # Trong 60 giây
```

### 5.2 Circuit Breaker

Ngắt kết nối khi Auth Server gặp lỗi liên tục:

```typescript
// Cache key cho circuit breaker (per serverUrl)
private getCircuitBreakerKey(): string {
  return `jwt:cb:${this.serverUrl}`;
}
```

**Cấu hình:**
```bash
AUTH_CIRCUIT_BREAKER_ENABLED=true
AUTH_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5    # 5 lần thất bại
AUTH_CIRCUIT_BREAKER_RESET_TIMEOUT_MS=60000 # Reset sau 60 giây
```

### 5.3 Distributed Lock

Đảm bảo chỉ có một process refresh token cùng lúc:

```typescript
return this.lockService.executeWithLock(
  `jwt:refresh:${this.username}`,  // Lock key
  async () => {
    // Double-check sau khi có lock
    const recheckedToken = await this.cacheService.getToken(cacheKey);
    if (recheckedToken && !this.shouldRefresh(recheckedToken)) {
      return recheckedToken.accessToken;
    }
    // Proceed với refresh/login
  }
);
```

---

## 6. AuthHttpService - HTTP Client với Auto Authentication

### 6.1 Header Injection

Service tự động inject authentication headers vào mọi request:

```typescript
// Headers được inject tự động
{
  'Authorization': `Bearer ${accessToken}`,
  'X-User-Id': userContext?.userId,           // Optional
  'X-User-Name': userContext?.userName,       // Optional
}
```

### 6.2 Auto Retry trên 401

Khi nhận 401 Unauthorized, service tự động:
1. Invalidate token hiện tại
2. Lấy token mới
3. Retry request

```
┌────────────┐        ┌────────────┐        ┌────────────┐
│ Consumer   │        │AuthHttp    │        │ API Server │
│            │        │Service     │        │            │
└─────┬──────┘        └─────┬──────┘        └─────┬──────┘
      │                     │                     │
      │ GET /api/products   │                     │
      │────────────────────▶│                     │
      │                     │ GET + Bearer token  │
      │                     │────────────────────▶│
      │                     │                     │
      │                     │ 401 Unauthorized    │
      │                     │◀────────────────────│
      │                     │                     │
      │                     │ invalidateToken()   │
      │                     │────────┐            │
      │                     │        │            │
      │                     │◀───────┘            │
      │                     │                     │
      │                     │ getAccessToken()    │
      │                     │────────┐ (new token)│
      │                     │        │            │
      │                     │◀───────┘            │
      │                     │                     │
      │                     │ GET + new token     │
      │                     │────────────────────▶│
      │                     │                     │
      │                     │ 200 OK              │
      │                     │◀────────────────────│
      │                     │                     │
      │ Response data       │                     │
      │◀────────────────────│                     │
```

---

## 7. Cấu trúc Token trong Cache

### 7.1 AuthToken Type

```typescript
type AuthToken = {
  accessToken: string;       // JWT access token
  tokenType: string;         // "Bearer"
  expiresIn: number;         // Seconds until expiry
  expiresAt: string;         // ISO 8601 string (để serialize vào Redis)
  issuedAt: string;          // ISO 8601 string
  refreshToken?: string;     // Optional refresh token
  scopes?: string[];         // Optional scopes (OAuth2)
};
```

### 7.2 Cache Storage

```
Redis Key: jwt:admin
Redis Value: {
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "expiresAt": "2026-01-23T15:00:00.000Z",
  "issuedAt": "2026-01-23T14:00:00.000Z",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
TTL: 3600 seconds (AUTH_CACHE_REDIS_TTL_SECONDS)
```

---

## 8. Validation và Fail-Fast

### 8.1 Zod Schema Validation

Module validate cấu hình khi khởi động:

```typescript
const jwtPasswordConfigSchema = z.object({
  serverUrl: z.string().url('AUTH_JWT_SERVER_URL must be a valid URL'),
  loginEndpoint: z.string().startsWith('/', 'Must start with /'),
  refreshEndpoint: z.string().startsWith('/').optional(),
  username: z.string().min(1, 'AUTH_JWT_USERNAME is required'),
  password: z.string().min(1, 'AUTH_JWT_PASSWORD is required'),
});
```

### 8.2 Error Messages

Khi thiếu cấu hình bắt buộc:

```
Error: AUTH_CLIENT_MODE=jwt_password requires these environment variables:
  - AUTH_JWT_SERVER_URL
  - AUTH_JWT_USERNAME
  - AUTH_JWT_PASSWORD
  - AUTH_JWT_LOGIN_ENDPOINT
```

---

## 9. Event System

### 9.1 Token Acquired Event

Khi lấy token thành công, emit event để các module khác biết:

```typescript
// Event được emit khi có token mới
this.eventEmitter.emit('auth.token.acquired', {
  mode: 'jwt_password',
  username: this.username,
  issuedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
  expiresIn: token.expiresIn,
});
```

**Use case:** Module `MktProductIntegration` lắng nghe event này để trigger sync products khi có token.

---

## 10. Backward Compatibility

### 10.1 Migration Path

Code cũ vẫn hoạt động trong giai đoạn chuyển đổi:

```typescript
// Code cũ (deprecated, vẫn hoạt động)
import { OAuth2ClientService } from 'src/mkt-core/oauth2-client';

// Code mới (recommended)
import { AuthClientService } from 'src/mkt-core/auth-client';
```

### 10.2 Deprecation Warning

Khi dùng API cũ, sẽ có warning trong log:

```
[WARN] OAuth2ClientService is deprecated.
Please migrate to AuthClientService from "src/mkt-core/auth-client".
This compatibility layer will be removed in v2.0.
```

---

## 11. Checklist Integration

Khi tích hợp JWT Password authentication:

- [ ] Set `AUTH_CLIENT_MODE=jwt_password`
- [ ] Cấu hình `AUTH_JWT_SERVER_URL`
- [ ] Cấu hình `AUTH_JWT_LOGIN_ENDPOINT`
- [ ] Cấu hình `AUTH_JWT_USERNAME` và `AUTH_JWT_PASSWORD`
- [ ] (Optional) Cấu hình `AUTH_JWT_REFRESH_ENDPOINT`
- [ ] Verify Auth Server endpoint trả về đúng format `JwtPasswordTokenResponse`
- [ ] Test cache hoạt động (Redis)
- [ ] Test rate limiter không block request hợp lệ
- [ ] Test circuit breaker khi Auth Server down

---

**Tài liệu tham khảo:** `REFACTORING-PLAN.md`
**Ngày tạo:** 2026-01-23
**Phiên bản:** 1.0
