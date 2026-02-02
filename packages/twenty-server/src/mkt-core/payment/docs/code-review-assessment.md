# Đánh Giá Code Review: Payment Module

**Ngày đánh giá:** 2026-02-02
**Trạng thái:** CẦN SỬA ĐỔI

---

## 1. Tóm Tắt Vấn Đề

| # | Vấn Đề | Mức Độ | Cần Sửa |
|:-:|--------|:------:|:-------:|
| 1 | Hai pipeline webhook trùng lặp | 🔴 Critical | ✅ |
| 2 | Idempotency không nhất quán | 🔴 Critical | ✅ |
| 3 | Amount validation khác nhau | 🟠 High | ✅ |
| 4 | Auth/Security rời rạc | 🟠 High | ✅ |
| 5 | Thiếu reconciliation/retry | 🟡 Medium | ✅ |
| 6 | Thiếu domain/application layers | 🟡 Medium | ✅ |

---

## 2. Chi Tiết Vấn Đề

### 2.1 🔴 Hai Pipeline Webhook Trùng Lặp

**Hiện trạng:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DUPLICATE WEBHOOK HANDLERS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  File 1: providers/sepay/sepay-webhook.handler.ts                            │
│  ─────────────────────────────────────────────────                           │
│  • Class: SepayWebhookHandler (implements IWebhookHandler)                   │
│  • Location: providers/sepay/                                                 │
│  • Flow: NormalizedWebhookPayload → processWebhook()                         │
│  • Amount: CHỈ LOG WARNING, KHÔNG XỬ LÝ                                      │
│  • Partial Payment: ❌ KHÔNG CÓ                                              │
│  • Events: ❌ KHÔNG EMIT                                                     │
│  • Status: LUÔN SET "COMPLETED" nếu match                                    │
│                                                                               │
│  File 2: services/webhook/mkt-payment-webhook.service.ts                     │
│  ─────────────────────────────────────────────────────                       │
│  • Class: MktPaymentWebhookService                                           │
│  • Location: services/webhook/                                                │
│  • Flow: SepayWebhookPayload → processWebhookPayment()                       │
│  • Amount: ✅ PHÂN TÍCH EXACT/UNDERPAID/OVERPAID                             │
│  • Partial Payment: ✅ CÓ HỖ TRỢ                                             │
│  • Events: ✅ EMIT payment.completed/partial/overpaid                        │
│  • Status: DYNAMIC based on analysis                                         │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**So sánh chi tiết:**

| Tính năng | SepayWebhookHandler | MktPaymentWebhookService |
|-----------|:-------------------:|:------------------------:|
| Content parsing | ❌ Không | ✅ Có (với config) |
| Partial payment | ❌ Không | ✅ Có |
| Amount analysis | ⚠️ Chỉ warn | ✅ Phân tích đầy đủ |
| Events emit | ❌ Không | ✅ Có |
| Transaction | ✅ QueryRunner | ✅ TransactionScopeService |
| Order status | Luôn CONFIRMED | Dựa trên analysis |

**Kết luận:** `MktPaymentWebhookService` hoàn thiện hơn → **GIỮ LẠI**
`SepayWebhookHandler` thiếu logic → **XÓA hoặc REFACTOR**

---

### 2.2 🔴 Idempotency Không Nhất Quán

**Vấn đề:**

```typescript
// Entity có 2 fields cho transaction ID:
// mkt-payment.workspace-entity.ts

// Field cũ (deprecated)
@WorkspaceField({...})
sepayTransactionId?: string;        // ← ĐANG DÙNG

// Field mới (multi-provider)
@WorkspaceField({...})
providerTransactionId?: string;     // ← CHƯA DÙNG
```

**Code đang dùng:**

```typescript
// SepayWebhookHandler (line 355)
sepayTransactionId: payload.providerTransactionId,  // Lưu vào field cũ

// MktPaymentWebhookService (line 244)
sepayTransactionId: String(payload.id),             // Lưu vào field cũ

// Repository (line 141)
where: { sepayTransactionId: transactionId },       // Query field cũ
```

**Rủi ro:**
- `providerTransactionId` field không được sử dụng
- Không có unique index trên `providerTransactionId`
- Không check `referenceCode + gateway` (Layer 2 của design)

---

### 2.3 🟠 Amount Validation Khác Nhau

**SepayWebhookHandler:**
```typescript
// Line 328-339 - CHỈ LOG WARNING
private validateAmount(
  expectedAmount: number | undefined,
  receivedAmount: number,
  orderCode: string,
): void {
  if (!MoneyUtils.equals(receivedAmount, expected)) {
    this.logger.warn(`Amount mismatch...`);  // ← KHÔNG LÀM GÌ THÊM
  }
}

// Line 346-357 - LUÔN SET COMPLETED
await queryRunner.manager.update(
  MktPaymentWorkspaceEntity,
  { id: paymentId },
  {
    status: MKT_PAYMENT_STATUS.COMPLETED,  // ← LUÔN COMPLETED!
    ...
  },
);
```

**MktPaymentWebhookService:**
```typescript
// Line 220-224 - PHÂN TÍCH ĐẦY ĐỦ
const amountAnalysis = paymentAmountAnalyzer.analyze(
  expectedAmount,
  receivedAmount,
  previouslyPaidAmount,  // ← Hỗ trợ multiple payments
);

// Line 233-234 - STATUS DYNAMIC
const paymentStatus = this.determinePaymentStatusFromAnalysis(amountAnalysis);
// Returns: COMPLETED | PARTIAL | OVERPAID
```

**Hệ quả:**
- Nếu dùng `SepayWebhookHandler`: Partial payment KHÔNG hoạt động
- Nếu dùng `MktPaymentWebhookService`: Partial payment hoạt động
- Có thể lệch trạng thái nếu ai đó gọi sai handler

---

### 2.4 🟠 Auth/Security Rời Rạc

**Có 3 nơi xử lý authentication:**

| Component | File | Cách xử lý |
|-----------|------|------------|
| SepayWebhookHandler | `providers/sepay/sepay-webhook.handler.ts:63` | `validateWebhook()` method |
| SepayAuthService | `services/sepay/sepay-auth.service.ts` | `validateAuthorizationHeader()` |
| IpWhitelistGuard | `guards/ip-whitelist.guard.ts` | IP whitelist check |

**Vấn đề:**
- Controller dùng `SepayAuthService`
- `SepayWebhookHandler` có riêng `validateWebhook()` method (không dùng)
- Logic validate giống nhau nhưng duplicate code

---

### 2.5 🟡 Thiếu Reconciliation/Retry

**Theo design document cần:**

| Feature | Trạng thái | Code |
|---------|:----------:|------|
| Reconciliation entity | ❌ | Chưa có |
| Manual match API | ❌ | Chưa có |
| Retry mechanism | ❌ | Chưa có |
| Webhook log với retry count | ❌ | Entity chưa có field |
| Scheduled reconciliation job | ❌ | Chưa có |

---

## 3. Đề Xuất Sửa Đổi

### 3.1 Hợp Nhất Webhook Flow (Priority 1)

**Action:** Xóa `SepayWebhookHandler`, giữ `MktPaymentWebhookService`

```
TRƯỚC:
┌──────────────┐     ┌─────────────────────┐
│  Controller  │────▶│ SepayAuthService    │
└──────┬───────┘     └─────────────────────┘
       │
       ├─────────────▶ SepayWebhookHandler (KHÔNG DÙNG)
       │
       └─────────────▶ MktPaymentWebhookService (ĐANG DÙNG)

SAU:
┌──────────────┐     ┌─────────────────────┐
│  Controller  │────▶│ SepayAuthService    │
└──────┬───────┘     └─────────────────────┘
       │
       └─────────────▶ ProcessWebhookUseCase
                              │
                              ├──▶ VAMatchingStrategy
                              ├──▶ CodeMatchingStrategy
                              └──▶ FuzzyMatchingStrategy
```

**Files cần sửa:**
1. ❌ Xóa: `providers/sepay/sepay-webhook.handler.ts`
2. ✏️ Refactor: `services/webhook/mkt-payment-webhook.service.ts` → `use-cases/process-webhook.use-case.ts`
3. ✏️ Update: `mkt-payment.module.ts` - remove SepayWebhookHandler

---

### 3.2 Đồng Bộ Idempotency (Priority 1)

**Action:** Migrate sang `providerTransactionId`

```typescript
// Step 1: Update repository
async findByProviderTransactionId(transactionId: string): Promise<...> {
  return repository.findOne({
    where: { providerTransactionId: transactionId },
  });
}

async existsByProviderTransactionId(transactionId: string): Promise<boolean> {
  return (await repository.count({
    where: { providerTransactionId: transactionId },
  })) > 0;
}

// Step 2: Add composite unique check
async existsByReferenceAndGateway(
  referenceCode: string,
  gateway: string,
): Promise<boolean> {
  // Layer 2 của design document
}

// Step 3: Update webhook service
await this.mktPaymentRepository.updatePayment(paymentId, {
  providerTransactionId: String(payload.id),  // ← Dùng field mới
  providerType: 'SEPAY_QR',
  providerResponse: payload,
});
```

**Migration needed:**
```sql
-- Migrate existing data
UPDATE mkt_payment
SET "providerTransactionId" = "sepayTransactionId"
WHERE "sepayTransactionId" IS NOT NULL;

-- Add unique index
CREATE UNIQUE INDEX idx_provider_transaction_id
ON mkt_payment("providerTransactionId")
WHERE "providerTransactionId" IS NOT NULL;
```

---

### 3.3 Thống Nhất Security (Priority 2)

**Action:** Consolidate vào một service

```typescript
// infrastructure/security/webhook-auth.service.ts

@Injectable()
export class WebhookAuthService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate webhook request
   * - API Key validation
   * - IP whitelist (optional)
   * - Signature verification (if provider supports)
   */
  validateRequest(request: {
    headers: Record<string, string>;
    ip: string;
    provider: 'sepay' | 'bidv';
  }): ValidationResult {
    // 1. Check IP whitelist
    if (!this.isIpAllowed(request.ip, request.provider)) {
      return { valid: false, error: 'IP_NOT_ALLOWED' };
    }

    // 2. Check API key
    const apiKey = this.extractApiKey(request.headers);
    if (!this.isApiKeyValid(apiKey, request.provider)) {
      return { valid: false, error: 'INVALID_API_KEY' };
    }

    return { valid: true };
  }
}
```

---

### 3.4 Thêm Reconciliation (Priority 2)

**Action:** Tạo entity và service mới

```typescript
// domain/entities/payment-reconciliation.entity.ts
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPaymentReconciliation,
  namePlural: 'paymentReconciliations',
  labelSingular: 'Payment Reconciliation',
})
export class MktPaymentReconciliationWorkspaceEntity {
  transactionId: string;
  orderId?: string;
  issueType: 'UNDERPAID' | 'OVERPAID' | 'DUPLICATE' | 'UNMATCHED' | 'EXPIRED';
  originalAmount: number;
  expectedAmount?: number;
  resolutionStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  resolutionAction?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
}
```

---

## 4. Checklist Sửa Đổi

### Phase 1: Critical Fixes (1 tuần)

- [ ] **Xóa duplicate handler**
  - [ ] Remove `SepayWebhookHandler` class
  - [ ] Update `mkt-payment.module.ts`
  - [ ] Remove from `PaymentProviderFactory` registration

- [ ] **Migrate idempotency field**
  - [ ] Update repository methods
  - [ ] Create migration script
  - [ ] Update webhook service to use `providerTransactionId`

- [ ] **Add composite unique check**
  - [ ] Add `referenceCode` field to entity
  - [ ] Add unique index on `(providerTransactionId, providerType)`
  - [ ] Update idempotency check logic

### Phase 2: Improvements (1 tuần)

- [ ] **Consolidate auth**
  - [ ] Create unified `WebhookAuthService`
  - [ ] Merge IP whitelist + API key validation
  - [ ] Update controller

- [ ] **Add reconciliation**
  - [ ] Create entity
  - [ ] Create repository
  - [ ] Create service
  - [ ] Add GraphQL resolver

### Phase 3: Architecture (2 tuần)

- [ ] **Implement Clean Architecture**
  - [ ] Create domain layer (entities, strategies, ports)
  - [ ] Create application layer (use cases)
  - [ ] Refactor infrastructure layer
  - [ ] Add matching strategies (VA, Code, Fuzzy)

---

## 5. Impact Analysis

### Nếu KHÔNG sửa:

| Risk | Probability | Impact | Scenario |
|------|:-----------:|:------:|----------|
| Duplicate payment processing | Low | High | Nếu ai đó gọi `SepayWebhookHandler` thay vì `MktPaymentWebhookService` |
| Partial payment fail | Medium | High | Dùng sai handler → order confirm khi chưa đủ tiền |
| Data inconsistency | Medium | Medium | `sepayTransactionId` vs `providerTransactionId` |
| Security gap | Low | Medium | Auth logic rời rạc, khó audit |

### Nếu SỬA:

| Benefit | Effort | Priority |
|---------|:------:|:--------:|
| Single source of truth cho webhook | 4h | P1 |
| Consistent idempotency | 4h | P1 |
| Unified security layer | 2h | P2 |
| Extensible matching (VA support) | 8h | P2 |
| Reconciliation support | 8h | P3 |

---

## 6. Kết Luận

**Review assessment: ĐÚNG ✅**

Các nhận xét trong review hoàn toàn chính xác:

1. ✅ Có 2 pipeline webhook khác logic
2. ✅ Idempotency dùng `sepayTransactionId` nhưng entity có `providerTransactionId`
3. ✅ Amount validation chỉ ở `MktPaymentWebhookService`
4. ✅ Auth rời rạc (3 nơi khác nhau)
5. ✅ Không có retry/reconciliation

**Đề xuất hành động:**

1. **NGAY LẬP TỨC:** Xóa `SepayWebhookHandler` để tránh confusion
2. **TUẦN NÀY:** Migrate sang `providerTransactionId`
3. **THÁNG NÀY:** Implement Clean Architecture với matching strategies

---

*Document được tạo từ phân tích mã nguồn thực tế.*
