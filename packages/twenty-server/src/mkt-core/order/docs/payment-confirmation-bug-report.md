# Payment Confirmation Bug Report

**Date**: 2026-02-04
**Feature**: Payment Confirmation (Sale & Accounting)
**Status**: RESOLVED

---

## Executive Summary

Trong quá trình test Payment Confirmation feature, đã phát hiện 2 vấn đề chính:
1. **Transaction Timeout** - Mutations timeout do xung đột giữa ALS transaction binding và engine's query_timeout
2. **Idempotency Cache** - Cached results trả về data cũ khi test lại

---

## Bug #1: Transaction Timeout

### Symptoms
```json
{
  "errors": [{
    "message": "Transaction timed out after 30000ms",
    "extensions": {"code": "INTERNAL_SERVER_ERROR"}
  }]
}
```

Sau khi giảm timeout xuống 8000ms:
```
Query read timeout after ~8 seconds
```

### Root Cause Analysis

#### 1. Timeout Configuration Mismatch

| Component | Timeout | Location |
|-----------|---------|----------|
| Engine query_timeout | 10,000ms | `workspace-datasource.factory.ts:213` |
| Transaction statement_timeout | 30,000ms (default) | `transaction.config.ts` |
| .env override | 30,000ms | `TRANSACTION_DEFAULT_TIMEOUT_MS` |

**Problem**: Khi `statement_timeout > query_timeout`:
- Client (pg driver) disconnect sau 10s
- PostgreSQL transaction vẫn chạy → "idle in transaction" (zombie)
- Transaction giữ locks vô thời hạn

#### 2. ALS (AsyncLocalStorage) Binding Failure

`TransactionScopeService` sử dụng ALS để bind repositories vào transaction context:

```typescript
// TransactionScopeService.runInTransaction()
return transactionContextStore.run(store, async () => {
  // Repositories should use transaction-bound connection
  await callback();
});
```

**Problem**: Trong callback, repositories không nhận được transaction-bound connection:
- `getRepository()` trả về connection mới thay vì transaction connection
- Mỗi query tạo connection riêng → không atomic
- Transaction timeout vì operations không hoàn thành trong cùng connection

#### 3. WorkspaceDataSource Query Timeout

```typescript
// workspace-datasource.factory.ts:213
extra: {
  query_timeout: 10000,  // 10 seconds - client-side timeout
}
```

Engine's pg driver cắt connection sau 10s, nhưng PostgreSQL không nhận được signal này.

### Resolution

#### Workaround Applied (không sửa engine)

Bypass `TransactionScopeService`, thực hiện sequential operations với optimistic locking:

```typescript
// BEFORE (with transaction - FAILED)
private async doConfirmBySale(...) {
  return this.transactionScopeService.runInTransaction(workspaceId, async () => {
    const order = await this.orderRepository.findByIdForUpdate(orderId);
    // ... other operations
  });
}

// AFTER (without transaction - WORKING)
private async doConfirmBySale(...) {
  // 1. Fetch order
  const order = await this.orderRepository.findByIdWithOptions(orderId, undefined, workspaceId);

  // 2. Validate
  this.validateSaleConfirmation(order, orderId);

  // 3. Update with optimistic locking (version increment)
  await this.orderRepository.updateOrder(orderId, { salePaymentConfirmed: true }, workspaceId);

  // 4. Create history
  await this.orderHistoryRepository.createOrderHistory({...}, workspaceId);
}
```

#### Config Changes

```bash
# .env
TRANSACTION_DEFAULT_TIMEOUT_MS=8000  # < query_timeout (10000ms)
```

```typescript
// transaction.config.ts
const DEFAULT_TIMEOUT_MS = 8000; // Must be < pg driver's query_timeout
```

### Proper Fix (requires engine changes - NOT APPLIED)

```typescript
// workspace-datasource.factory.ts
extra: {
  query_timeout: 35000,  // Increase to > statement_timeout
}
```

### Files Modified

| File | Change |
|------|--------|
| `payment-confirmation.service.ts` | Bypass transaction in doConfirmBySale, doConfirmByAccounting, doRevokeConfirmation |
| `mkt-order-history.repository.ts` | Add optional workspaceId parameter to createOrderHistory |
| `transaction.config.ts` | Change default timeout from 30s to 8s |
| `.env` | Set TRANSACTION_DEFAULT_TIMEOUT_MS=8000 |
| `base-workspace.repository.ts` | Remove verbose debug logs |

---

## Bug #2: Idempotency Cache Returns Stale Data

### Symptoms

Mutation trả về `success: true` với `version: 2`, nhưng database không được update:

```json
// Mutation response
{"data":{"confirmPaymentBySale":{"success":true,"version":2}}}

// Database state
{"salePaymentConfirmed": false, "version": 3}
```

### Root Cause

`IdempotencyService` cache results theo hash của requestBody:

```typescript
// IdempotencyService.executeWithIdempotency()
const cacheKey = this.buildCacheKey({
  workspaceId,
  domain: 'order',
  action: 'salePaymentConfirm',
  requestBody: { orderId, actor: actor.workspaceMemberId },
  options: { clientKey: idempotencyKey }
});
```

**Problem**:
- Test lần đầu: Cache `{ orderId, actor }` → result với `version: 2`
- Revoke confirmation: Database updated to `version: 3`
- Test lần sau: Same `{ orderId, actor }` hash → Return cached result `version: 2`
- Database không được update vì callback không được gọi

### Cache Keys Found

```
mkt:order:idempotency:20202020-1c25-4d02-bf25-6aeccf7ea419:salePaymentConfirm:ddd83b260074fb8e
mkt:order:idempotency:20202020-1c25-4d02-bf25-6aeccf7ea419:salePaymentConfirm:0193e4a9bdd6f490
```

### Resolution

#### For Testing

Xóa idempotency keys trước khi test lại:

```bash
# Scan keys
redis-cli KEYS "*salePaymentConfirm*"

# Delete specific key
redis-cli DEL "mkt:order:idempotency:...:salePaymentConfirm:..."
```

#### For Production

Sử dụng unique `idempotencyKey` trong input:

```graphql
mutation {
  confirmPaymentBySale(input: {
    orderId: "...",
    idempotencyKey: "unique-key-per-request",  # Required for retry safety
    note: "..."
  }) {
    success
  }
}
```

### Idempotency Behavior

| Scenario | Behavior |
|----------|----------|
| Same idempotencyKey + same requestBody | Return cached result (no DB operation) |
| Different idempotencyKey | Execute operation (update DB) |
| No idempotencyKey | Hash from requestBody → may hit cache |

---

## Test Results After Fix

| Test Case | Result | Details |
|-----------|--------|---------|
| confirmPaymentBySale | PASS | version: 4, salePaymentConfirmed: true |
| confirmPaymentByAccounting | PASS | version: 5, accountingConfirmed: true |
| revokePaymentConfirmation(SALE) | PASS | version: 3 (earlier test) |
| revokePaymentConfirmation(ACCOUNTING) | PASS | version: 6, accountingConfirmed: false |
| getPaymentConfirmationStatus | PASS | Returns correct status |

### Order History Verification

```sql
SELECT action, note, "createdAt" FROM "mktOrderHistory"
WHERE "mktOrderId" = 'e3c4d5e6-...' ORDER BY "createdAt" DESC;
```

| Action | Note | Time |
|--------|------|------|
| ACCOUNTING_CONFIRMATION_REVOKED | Test revoke accounting | 03:41:44 |
| ACCOUNTING_CONFIRMED | Accounting confirms | 03:41:24 |
| SALE_PAYMENT_CONFIRMED | After clearing all cache | 03:41:08 |
| SALE_CONFIRMATION_REVOKED | Test revoke sale confirmation | 03:36:55 |
| SALE_PAYMENT_CONFIRMED | TC-SALE-002: Test with workaround | 03:28:30 |

---

## Recommendations

### Short-term (Applied)

1. Bypass TransactionScopeService cho Payment Confirmation operations
2. Sử dụng optimistic locking (version field) thay pessimistic lock
3. Pass workspaceId explicitly thay vì rely on ALS context
4. Set `TRANSACTION_DEFAULT_TIMEOUT_MS < query_timeout`

### Long-term (TODO)

1. **Fix ALS Binding**: Investigate why transaction context không được propagate correctly
2. **Increase Engine query_timeout**: Cho phép longer-running transactions
3. **Idempotency Key Design**:
   - Consider shorter TTL cho idempotency cache
   - Document requirement for unique keys per logical operation
4. **Add Integration Tests**: Cover transaction + idempotency scenarios

---

## Appendix: Environment

```
Node.js: v20.x
PostgreSQL: 15.x
Redis: 7.x
Twenty Server: custom mkt-core module
Transaction ALS: enabled
Optimistic Locking: enabled
```
