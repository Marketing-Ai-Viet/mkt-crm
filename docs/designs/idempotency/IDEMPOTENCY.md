# Idempotency Module

Generic idempotency service cho tất cả domains (Order, Payment, License, Invoice), ngăn chặn duplicate requests và đảm bảo tính nhất quán dữ liệu.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Cài đặt](#cài-đặt)
- [Cách hoạt động](#cách-hoạt-động)
- [Canonical Hashing](#canonical-hashing)
- [Per-Action Configuration](#per-action-configuration)
- [Response Caching Policy](#response-caching-policy)
- [Cache Failure Handling](#cache-failure-handling)
- [Stuck PENDING Handling](#stuck-pending-handling)
- [Header Contract (Frontend)](#header-contract-frontend)
- [API Reference](#api-reference)
- [Ví dụ sử dụng](#ví-dụ-sử-dụng)
- [Troubleshooting](#troubleshooting)

## Tổng quan

### Vấn đề cần giải quyết

1. **Duplicate requests**: User click nút submit nhiều lần do network lag
2. **Retry requests**: Client retry khi không nhận được response
3. **Concurrent requests**: Nhiều requests cùng lúc cho cùng một operation
4. **Intentional duplicates**: User cố tình tạo 2 đơn hàng giống nhau
5. **Stuck PENDING**: Process crash giữa chừng, record bị kẹt
6. **Response size**: Cache phình to với response lớn

### Giải pháp

| Feature | Mô tả |
|---------|-------|
| **Canonical Hash** | Sort keys, loại bỏ volatile fields → hash ổn định |
| **Per-Action Config** | TTL, lock timeout, failure mode riêng cho từng action |
| **Response Sanitization** | Size limit, field allowlist, redact sensitive data |
| **FAIL_SAFE/STRICT** | Chọn mode phù hợp cho từng loại operation |
| **Stuck PENDING Cleanup** | Background job tự động cleanup records bị kẹt |
| **Client Key Support** | Hỗ trợ X-Idempotency-Key header từ frontend |

### Domains hỗ trợ

- `order` - Đơn hàng
- `payment` - Thanh toán
- `license` - License
- `invoice` - Hóa đơn
- `customer` - Khách hàng
- `product` - Sản phẩm

## Cài đặt

### Import Module

```typescript
// order.module.ts
import { Module } from '@nestjs/common';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';

import { IdempotencyModule } from 'src/mkt-core/common/idempotency';

@Module({
  imports: [
    IdempotencyModule.register({
      namespace: CacheStorageNamespace.MktOrder,
      enableCleanup: true,
    }),
  ],
})
export class OrderModule {}
```

### Global Registration

```typescript
// mkt-core.module.ts
@Module({
  imports: [
    IdempotencyModule.forRoot({
      namespace: CacheStorageNamespace.MktOrder,
    }),
  ],
})
export class MktCoreModule {}
```

## Cách hoạt động

### Flow xử lý request

```
┌─────────────────────────────────────────────────────────────┐
│                         REQUEST                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  1. Generate Key    │
                   │  (canonical hash)   │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  2. Check Duplicate │◄──────┐
                   └─────────────────────┘       │
                              │                  │
              ┌───────────────┴───────────────┐  │
              ▼                               ▼  │
     ┌─────────────────┐             ┌─────────────────┐
     │  Not Duplicate  │             │   Duplicate     │
     └─────────────────┘             └─────────────────┘
              │                               │
              ▼                               ▼
     ┌─────────────────┐             ┌─────────────────┐
     │  3. Acquire     │             │  Return cached  │
     │     Lock        │             │  (sanitized)    │
     └─────────────────┘             └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │  4. Store       │
     │     PENDING     │
     └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │  5. Execute     │
     │     Operation   │
     └─────────────────┘
              │
       ┌──────┴──────┐
       ▼             ▼
┌────────────┐ ┌────────────┐
│  Success   │ │  Failed    │
└────────────┘ └────────────┘
       │             │
       ▼             ▼
┌────────────┐ ┌────────────┐
│ 6. Store   │ │ 6. Store   │
│ COMPLETED  │ │ FAILED     │
│ (sanitized)│ │            │
└────────────┘ └────────────┘
              │
              ▼
     ┌─────────────────┐
     │  7. Release     │
     │     Lock        │
     └─────────────────┘
```

### Idempotency Key Format

```
{workspaceId}:{domain}:{action}:{canonicalHash}[:nonce]
```

**Ví dụ:**
- Mặc định: `ws_123:order:createOrder:a1b2c3d4`
- Với nonce: `ws_123:order:createOrder:a1b2c3d4:renewal-2024-01`
- Client key: `ws_123:order:createOrder:550e8400-e29b-41d4-a716-446655440000`

## Canonical Hashing

### Vấn đề với hash thông thường

```typescript
// Cùng data nhưng key order khác → hash khác!
JSON.stringify({ b: 2, a: 1 }) // '{"b":2,"a":1}'
JSON.stringify({ a: 1, b: 2 }) // '{"a":1,"b":2}'
```

### Giải pháp: Canonical JSON

```typescript
import { canonicalHash, toCanonicalJson } from 'src/mkt-core/common/idempotency';

// Sort keys recursively + loại bỏ volatile fields
toCanonicalJson({ b: 2, a: 1, timestamp: 123 })
// → '{"a":1,"b":2}' (timestamp bị loại, keys sorted)

// Same hash cho cùng data
canonicalHash({ b: 2, a: 1 }) === canonicalHash({ a: 1, b: 2 }) // true
```

### Volatile Fields (tự động loại bỏ)

- `timestamp`
- `createdAt`, `updatedAt`
- `requestId`, `traceId`, `correlationId`
- `_meta`

## Per-Action Configuration

### Bảng cấu hình theo Action

| Domain:Action | TTL | Lock Timeout | Failure Mode | Max Response |
|---------------|-----|--------------|--------------|--------------|
| `order:createOrder` | 48h | 10min | FAIL_STRICT | 5KB |
| `order:confirmOrder` | 2h | 5min | FAIL_STRICT | 5KB |
| `order:updateOrderStatus` | 1h | 5min | FAIL_SAFE | 10KB |
| `order:refundOrder` | 48h | 15min | FAIL_STRICT | 5KB |
| `payment:createPayment` | 48h | 5min | FAIL_STRICT | 5KB |
| `payment:processPayment` | 48h | 15min | FAIL_STRICT | 5KB |
| `license:createLicense` | 24h | 5min | FAIL_STRICT | 10KB |
| `license:renewLicense` | 48h | 5min | FAIL_STRICT | 5KB |
| `invoice:createInvoice` | 48h | 5min | FAIL_STRICT | 5KB |

### Custom Config

```typescript
// idempotency.config.ts
export const ACTION_CONFIGS: Record<string, Partial<IdempotencyActionConfig>> = {
  'order:createOrder': {
    ttlSeconds: 172800,      // 48 hours
    lockTimeoutMs: 600000,   // 10 minutes
    failureMode: 'FAIL_STRICT',
    maxResponseSizeBytes: 5120,
    responseAllowedFields: ['id', 'orderNumber', 'status', 'totalAmount'],
  },
};
```

## Response Caching Policy

### Size Limiting

```typescript
// Tự động truncate response > maxResponseSizeBytes
{
  _truncated: true,
  _originalSize: 15360,
  id: 'order_123'  // Chỉ giữ id
}
```

### Field Allowlist

```typescript
// Chỉ cache các fields được phép
responseAllowedFields: ['id', 'orderNumber', 'status', 'totalAmount']
```

### Sensitive Data Redaction

Tự động loại bỏ:
- `password`, `token`, `secret`
- `apiKey`, `accessToken`, `refreshToken`
- `privateKey`

## Cache Failure Handling

### Decision Table

| Domain:Action | Mode | Lý do |
|---------------|------|-------|
| `order:createOrder` | FAIL_STRICT | Financial - không cho phép duplicate |
| `order:confirmOrder` | FAIL_STRICT | Financial |
| `order:updateOrderStatus` | FAIL_SAFE | Non-critical, có thể retry |
| `payment:*` | FAIL_STRICT | Financial |
| `license:activateLicense` | FAIL_SAFE | Có thể retry |

### Behavior theo Mode

| Operation | FAIL_SAFE | FAIL_STRICT |
|-----------|-----------|-------------|
| `checkDuplicate` | Return `isDuplicate: false` | Throw error |
| `acquireLock` | Return `true` (assume acquired) | Throw error |
| `releaseLock` | Log warning | Log warning |
| `storePending` | Log warning, continue | Throw error |
| `storeSuccess` | Log warning, continue | Throw error |

### Alert Khi FAIL_SAFE

```
Cache operation failed [checkDuplicate] for key: ws_123:order:createOrder:abc123.
Error: Redis connection refused.
Mode: FAIL_SAFE - continuing without idempotency protection
```

## Stuck PENDING Handling

### Vấn đề

Records có thể bị kẹt ở PENDING khi:
- Process crash sau `storePending` nhưng trước `storeSuccess/Failed`
- Network issues
- Lock expire nhưng process vẫn chạy

### Giải pháp: StuckPendingCleanupService

```typescript
// Tự động chạy mỗi 5 phút
// Tìm PENDING records > (lockTimeout + graceTime)
// Mark as EXPIRED

@Injectable()
export class StuckPendingCleanupService implements OnModuleInit {
  // Interval: 5 minutes
  // Grace time: 1 minute after lock expires
}
```

### Monitoring

```bash
# Check stuck PENDING records
redis-cli KEYS "idempotency:*" | xargs -I {} redis-cli GET {} | grep PENDING
```

## Header Contract (Frontend)

### X-Idempotency-Key Header

```typescript
// Format: UUID v4
// Regex: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// React hook example
const useCreateOrder = () => {
  const [idempotencyKey] = useState(() => uuidv4());

  return useMutation(CREATE_ORDER, {
    context: {
      headers: {
        'X-Idempotency-Key': idempotencyKey,
      },
    },
  });
};
```

### Rules

1. **Generate once per user action** - không reuse key
2. **Stable trong retries** - cùng action = cùng key
3. **UUID v4 format** - server validate format
4. **Fallback** - server auto-generate nếu không có header

## API Reference

### executeWithIdempotency()

High-level API xử lý toàn bộ flow.

```typescript
const result = await idempotencyService.executeWithIdempotency(
  {
    workspaceId: 'ws_123',
    domain: 'order',
    action: 'createOrder',
    requestBody: input,
    options: { clientKey: req.headers['x-idempotency-key'] },
  },
  async () => orderService.create(input),
);

// result.data - Kết quả operation
// result.fromCache - true nếu từ cache
// result.key - Idempotency key đã dùng
// result.cacheAvailable - Cache có available không
```

### generateKey()

```typescript
const key = idempotencyService.generateKey({
  workspaceId: 'ws_123',
  domain: 'order',
  action: 'createOrder',
  requestBody: input,
  options: {
    bypassIdempotency: true,  // Force new
    nonce: 'renewal-2024-01', // Custom nonce
    clientKey: 'uuid-v4',     // From header
  },
});
```

### checkDuplicate()

```typescript
const { isDuplicate, record, cacheAvailable } =
  await idempotencyService.checkDuplicate<Order>(key, 'FAIL_STRICT');
```

### getConfig()

```typescript
const config = idempotencyService.getConfig('order', 'createOrder');
// config.ttlSeconds, config.lockTimeoutMs, config.failureMode, ...
```

## Ví dụ sử dụng

### Basic Usage

```typescript
@Injectable()
export class OrderCreationService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async createOrder(
    workspaceId: string,
    input: CreateOrderInput,
    clientKey?: string,
  ): Promise<Order> {
    const result = await this.idempotencyService.executeWithIdempotency(
      {
        workspaceId,
        domain: 'order',
        action: 'createOrder',
        requestBody: input,
        options: { clientKey },
      },
      async () => this.doCreateOrder(input),
    );

    if (result.fromCache) {
      this.logger.log(`Returned cached order: ${result.key}`);
    }

    return result.data;
  }
}
```

### With Nonce (Scheduled Jobs)

```typescript
async createRenewalOrder(
  workspaceId: string,
  licenseId: string,
  period: string,
): Promise<Order> {
  return this.idempotencyService.executeWithIdempotency(
    {
      workspaceId,
      domain: 'order',
      action: 'createOrder',
      requestBody: { licenseId, type: 'renewal' },
      options: { nonce: `renewal-${licenseId}-${period}` },
    },
    async () => this.doCreateRenewalOrder(licenseId),
  );
}
```

### Bypass Idempotency

```typescript
// User explicitly wants duplicate order
const result = await this.idempotencyService.executeWithIdempotency(
  {
    workspaceId,
    domain: 'order',
    action: 'createOrder',
    requestBody: input,
    options: { bypassIdempotency: true },
  },
  async () => this.doCreateOrder(input),
);
```

## Troubleshooting

### 1. Duplicate vẫn xảy ra

**Nguyên nhân:**
- Object key order khác nhau
- Volatile field không được loại bỏ
- Redis unavailable + FAIL_SAFE mode

**Giải pháp:**
- Verify canonical hash: `console.log(canonicalHash(input))`
- Thêm volatile fields vào `VOLATILE_FIELDS` set
- Check Redis health, consider FAIL_STRICT

### 2. Stuck PENDING records

**Debug:**
```bash
redis-cli KEYS "idempotency:*" | while read key; do
  status=$(redis-cli GET "$key" | jq -r '.status')
  if [ "$status" = "PENDING" ]; then
    echo "$key: PENDING"
  fi
done
```

**Fix:**
- Wait for StuckPendingCleanupService (mỗi 5 phút)
- Manual: `redis-cli DEL "idempotency:ws_123:order:createOrder:abc123"`

### 3. Response quá lớn

**Debug:**
```bash
redis-cli GET "idempotency:ws_123:order:createOrder:abc123" | jq '.responseTruncated'
```

**Fix:**
- Thêm `responseAllowedFields` vào config
- Giảm `maxResponseSizeBytes`

### 4. Lock không release

**Debug:**
```bash
redis-cli KEYS "idempotency_lock:*"
redis-cli TTL "idempotency_lock:ws_123:order:createOrder:abc123"
```

**Fix:**
- Lock tự expire theo `lockTimeoutMs`
- Emergency: `redis-cli DEL "idempotency_lock:..."`

---

## Changelog

### v2.0.0 (Current)
- Tách thành generic module (`mkt-core/common/idempotency`)
- Canonical hash với sorted keys
- Per-action configuration
- Response size limiting và sanitization
- StuckPendingCleanupService
- EXPIRED status cho stuck records
- Client key support (X-Idempotency-Key header)
- Decision table cho FAIL_SAFE/STRICT

### v1.0.0
- Initial implementation trong order module
- Basic duplicate detection
- FAIL_SAFE mode
