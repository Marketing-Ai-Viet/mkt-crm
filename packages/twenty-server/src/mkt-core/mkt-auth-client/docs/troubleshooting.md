# MKT Auth Client - Troubleshooting Guide

## Self-Signed Certificate Error

### Triệu chứng

Khi khởi động ứng dụng, xuất hiện lỗi:

```
[Nest] Token fetch failed (attempt 1/3): self-signed certificate
[Nest] Token fetch failed (attempt 2/3): self-signed certificate
[Nest] Token fetch failed (attempt 3/3): self-signed certificate
[Nest] Failed to initialize MKT Auth Client
[Nest] Error: self-signed certificate
```

Hoặc trong stack trace:

```
Error: self-signed certificate
    at TLSSocket.onConnectSecure (node:_tls_wrap:1674:34)
    ...
code: 'DEPTH_ZERO_SELF_SIGNED_CERT'
```

### Nguyên nhân

Node.js/Axios mặc định **từ chối** kết nối HTTPS với certificate tự ký (self-signed) vì lý do bảo mật. Điều này xảy ra khi MKT Server sử dụng self-signed certificate (thường trong môi trường development).

```
┌─────────────┐     HTTPS Request      ┌─────────────────────────┐
│  CRM App    │ ────────────────────>  │ MKT Server              │
│             │                        │ (self-signed cert)      │
└─────────────┘                        └─────────────────────────┘
       │
       ▼
  ❌ REJECTED
  Certificate không được CA tin cậy
```

### Giải pháp

#### Option 1: Tắt kiểm tra certificate (Development only)

Thêm vào file `.env`:

```env
MKT_AUTH_REJECT_UNAUTHORIZED=false
```

| Giá trị | Hành vi | Môi trường |
|---------|---------|------------|
| `true` (default) | Từ chối self-signed cert | Production |
| `false` | Chấp nhận self-signed cert | Development |

#### Option 2: Sử dụng certificate hợp lệ (Production)

1. Cấu hình MKT Server với certificate từ CA (Let's Encrypt, etc.)
2. Giữ `MKT_AUTH_REJECT_UNAUTHORIZED=true` hoặc không set (default)

### Cách hoạt động của fix

```typescript
// Tạo HTTPS Agent với config
this.httpsAgent = new https.Agent({
  rejectUnauthorized: config.http.rejectUnauthorized, // từ env var
});

// Sử dụng trong HTTP request
this.httpService.post(url, data, {
  httpsAgent: this.httpsAgent,
});
```

### Lưu ý bảo mật

> ⚠️ **CẢNH BÁO**: Không bao giờ set `MKT_AUTH_REJECT_UNAUTHORIZED=false` trong production!
>
> Điều này vô hiệu hóa xác thực SSL/TLS, khiến ứng dụng dễ bị tấn công man-in-the-middle (MITM).

---

## Circuit Breaker Open

### Triệu chứng

```
Error: Circuit breaker OPEN - authentication temporarily disabled.
Will retry in 45s. Check MKT_AUTH_EMAIL and MKT_AUTH_PASSWORD.
```

### Nguyên nhân

Circuit breaker mở khi có quá nhiều lỗi liên tiếp (default: 5 lần).

### Giải pháp

1. **Kiểm tra credentials**:
   ```env
   MKT_AUTH_EMAIL=correct-email@example.com
   MKT_AUTH_PASSWORD=correct-password
   ```

2. **Kiểm tra MKT Server**:
   - Server có đang chạy không?
   - URL có đúng không? (`MKT_SERVER_BASE_URL`)

3. **Đợi circuit breaker reset** (default: 60 giây)

4. **Điều chỉnh cấu hình** (nếu cần):
   ```env
   MKT_AUTH_CIRCUIT_BREAKER_FAILURE_THRESHOLD=10  # Tăng ngưỡng lỗi
   MKT_AUTH_CIRCUIT_BREAKER_RESET_TIMEOUT_MS=30000  # Giảm thời gian chờ
   ```

---

## Missing Configuration

### Triệu chứng

```
[MktAuthClientConfig] Missing required environment variables: ['MKT_SERVER_BASE_URL', 'MKT_AUTH_EMAIL', 'MKT_AUTH_PASSWORD']
[MktAuthClientConfig] Module will be disabled
```

### Giải pháp

Thêm các biến môi trường bắt buộc vào `.env`:

```env
# Required
MKT_SERVER_BASE_URL=https://mkt-admin-be.local
MKT_AUTH_EMAIL=service@example.com
MKT_AUTH_PASSWORD=your-secure-password
```

---

## Token Acquisition Timeout

### Triệu chứng

```
Error: timeout of 30000ms exceeded
```

### Nguyên nhân

MKT Server phản hồi quá chậm hoặc không phản hồi.

### Giải pháp

1. **Kiểm tra network connectivity** đến MKT Server
2. **Tăng timeout** (nếu server chậm):
   ```env
   MKT_AUTH_RETRY_MAX_DELAY_MS=60000  # 60 giây
   ```
3. **Kiểm tra MKT Server performance**

---

## Authentication Failed After Re-login

### Triệu chứng

```
Error: Authentication failed after re-login: Invalid credentials.
Please verify MKT_AUTH_EMAIL and MKT_AUTH_PASSWORD are correct.
```

### Nguyên nhân

- Credentials không đúng
- Tài khoản bị disable trên MKT Server
- Password đã thay đổi

### Giải pháp

1. Xác nhận credentials với admin MKT Server
2. Cập nhật `.env` với credentials đúng
3. Restart ứng dụng

---

## Debug Mode

Để xem chi tiết logs, set log level trong NestJS:

```typescript
// main.ts hoặc app.module.ts
app.useLogger(['debug', 'log', 'warn', 'error']);
```

Logs sẽ hiển thị:
- Cache hits/misses
- Token acquisition attempts
- Circuit breaker state changes
- Retry attempts với backoff timing

---

## Cấu hình tham khảo

```env
# === MKT Auth Client Configuration ===

# Required
MKT_SERVER_BASE_URL=https://mkt-admin-be.local
MKT_AUTH_EMAIL=service@example.com
MKT_AUTH_PASSWORD=your-secure-password

# HTTP (Development)
MKT_AUTH_REJECT_UNAUTHORIZED=false  # Allow self-signed certs

# Token
# MKT_AUTH_TOKEN_SERVER_TTL_MS=86400000   # 24 hours
# MKT_AUTH_TOKEN_BUFFER_MS=3600000        # 1 hour

# Retry
# MKT_AUTH_RETRY_MAX_ATTEMPTS=3
# MKT_AUTH_RETRY_INITIAL_DELAY_MS=1000
# MKT_AUTH_RETRY_MAX_DELAY_MS=30000

# Circuit Breaker
# MKT_AUTH_CIRCUIT_BREAKER_ENABLED=true
# MKT_AUTH_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
# MKT_AUTH_CIRCUIT_BREAKER_RESET_TIMEOUT_MS=60000
```

---

## Scheduled Sync Job không chạy

### Triệu chứng

Job `MktProductScheduledSyncJob` đã được đăng ký trong Redis nhưng không chạy theo lịch.

```bash
# Kiểm tra job đã đăng ký
redis-cli HGETALL "bull:cron-queue:repeat:MktProductScheduledSyncJob"
# Kết quả: có data nhưng job không execute
```

### Nguyên nhân 1: Worker không chạy

BullMQ hoạt động theo mô hình Producer-Consumer:

```
┌─────────────────┐    Đăng ký job    ┌─────────────┐
│  Server         │ ───────────────>  │   Redis     │
│  (Producer)     │                   │   Queue     │
└─────────────────┘                   └─────────────┘
                                            │
                                            │ Consume job
                                            ▼
                                      ┌─────────────┐
                                      │   Worker    │  ❌ Không chạy
                                      │  (Consumer) │
                                      └─────────────┘
```

**Chẩn đoán:**

```bash
# Kiểm tra Worker process
ps aux | grep "queue-worker" | grep -v grep

# Kiểm tra port 9230 (Worker debug port)
lsof -i :9230
```

**Giải pháp:**

```bash
# Chạy Worker
npx nx run twenty-server:worker
```

### Nguyên nhân 2: Docker Worker thiếu OAuth2 credentials

**Triệu chứng trong Docker logs:**

```bash
docker logs twenty-dev-worker 2>&1 | grep -E "OAuth|client_id|client_secret"

# Output:
# ERROR: client_id should not be empty
# ERROR: client_secret should not be empty
# WARN: OAuth2 client credentials not configured
# WARN: Circuit breaker is open
```

**Chẩn đoán:**

```bash
# Kiểm tra env vars trong Docker container
docker inspect twenty-dev-worker --format '{{range .Config.Env}}{{println .}}{{end}}' | grep MKT_OAUTH

# Output (nếu rỗng):
# MKT_OAUTH_CLIENT_ID=
# MKT_OAUTH_CLIENT_SECRET=
```

**Nguyên nhân:**

`docker-compose.dev.yml` lấy giá trị từ host env vars nhưng chúng không được set:

```yaml
environment:
  MKT_OAUTH_CLIENT_ID: ${MKT_OAUTH_CLIENT_ID:-}      # Rỗng nếu không set
  MKT_OAUTH_CLIENT_SECRET: ${MKT_OAUTH_CLIENT_SECRET:-}
```

**Giải pháp:**

1. Thêm vào file `.env` (root project):
   ```env
   MKT_OAUTH_CLIENT_ID=your-client-id
   MKT_OAUTH_CLIENT_SECRET=your-client-secret
   ```

2. Restart Docker container:
   ```bash
   cd packages/twenty-docker
   docker-compose -f docker-compose.dev.yml up -d twenty-dev-worker
   ```

### Nguyên nhân 3: Hai Worker instances cùng chạy

**Triệu chứng:**

```bash
ps aux | grep "queue-worker" | grep -v grep

# Output: 2 processes
# node --inspect=0.0.0.0:9230 dist/src/queue-worker/queue-worker  (Docker)
# node dist/src/queue-worker/queue-worker.js                      (Terminal)
```

**Nguyên nhân:**

- Docker container `twenty-dev-worker` có `restart: unless-stopped`
- User chạy thêm worker từ terminal
- Kết quả: duplicate job processing hoặc race conditions

**Giải pháp:**

Chọn một trong hai:

```bash
# Option 1: Dùng Docker worker (production-like)
# Kill terminal worker, giữ Docker worker
kill <terminal_worker_pid>

# Option 2: Dùng Terminal worker (development)
docker stop twenty-dev-worker
npx nx run twenty-server:worker
```

### Debug: Kiểm tra trạng thái job trong Redis

```bash
# Xem tất cả repeat jobs
redis-cli ZRANGE "bull:cron-queue:repeat" 0 -1 WITHSCORES

# Xem delayed jobs (đang chờ execute)
redis-cli ZRANGE "bull:cron-queue:delayed" 0 -1 WITHSCORES

# Xem chi tiết job config
redis-cli HGETALL "bull:cron-queue:repeat:MktProductScheduledSyncJob"

# Xem metrics (số jobs completed)
redis-cli LRANGE "bull:cron-queue:metrics:completed:data" 0 20
```

### Kiểm tra job đã chạy thành công

```bash
# Xem Docker worker logs
docker logs twenty-dev-worker 2>&1 | grep -E "ScheduledSync|Sync completed" | tail -20

# Expected output khi thành công:
# [MktProductIntegration:ScheduledSync] Scheduled sync triggered
# [MktProductIntegration:Sync] Starting product sync from MKT Server...
# [MktProductIntegration:Sync] Synced 10 products
# [MktProductIntegration:Sync] Sync completed: 10 products, 25 packages in 1234ms
# [MktProductIntegration:ScheduledSync] Scheduled sync completed
```
