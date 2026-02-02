# Thiết Kế Kiến Trúc: Payment Module với Virtual Account (VA) Support

**Ngày tạo:** 2026-02-02
**Phiên bản:** 2.0
**Tác giả:** AI Assistant
**Cập nhật:** 2026-02-02 - Tích hợp fixes từ code review assessment

---

## 0. Critical Fixes (từ Code Review)

> **⚠️ QUAN TRỌNG:** Các fixes này cần thực hiện TRƯỚC khi implement kiến trúc mới.

### 0.1 🔴 Xóa Duplicate Webhook Handler

**Vấn đề:** Có 2 webhook handlers với logic khác nhau:

| Component | File | Vấn đề |
|-----------|------|--------|
| `SepayWebhookHandler` | `providers/sepay/sepay-webhook.handler.ts` | ❌ Không có partial payment, chỉ log warning |
| `MktPaymentWebhookService` | `services/webhook/mkt-payment-webhook.service.ts` | ✅ Đầy đủ logic, đang được sử dụng |

**Giải pháp:** Xóa `SepayWebhookHandler`, giữ `MktPaymentWebhookService` và refactor thành `ProcessWebhookUseCase`

```
TRƯỚC:
Controller → SepayAuthService
         ├──→ SepayWebhookHandler (KHÔNG DÙNG, XÓA)
         └──→ MktPaymentWebhookService (ĐANG DÙNG)

SAU:
Controller → WebhookAuthService
         └──→ ProcessWebhookUseCase
                    ├──→ VAMatchingStrategy
                    ├──→ CodeMatchingStrategy
                    └──→ FuzzyMatchingStrategy
```

**Files cần xóa:**
- `providers/sepay/sepay-webhook.handler.ts`
- Remove from `PaymentProviderFactory` registration
- Update `mkt-payment.module.ts`

---

### 0.2 🔴 Migrate Idempotency sang `providerTransactionId`

**Vấn đề:** Entity có 2 fields cho transaction ID:

```typescript
// Hiện tại entity có:
sepayTransactionId?: string;      // ← DEPRECATED, đang dùng
providerTransactionId?: string;   // ← MỚI, chưa dùng
```

**Giải pháp:**

```typescript
// 1. Update repository methods
export interface IPaymentRepository {
  // Thay thế phương thức cũ
  findByProviderTransactionId(transactionId: string): Promise<Payment | null>;
  existsByProviderTransactionId(transactionId: string): Promise<boolean>;

  // Thêm composite unique check (Layer 2)
  existsByReferenceAndGateway(referenceCode: string, gateway: string): Promise<boolean>;
}

// 2. Update webhook service để dùng field mới
await this.paymentRepository.updatePayment(paymentId, {
  providerTransactionId: String(payload.id),  // ← Dùng field mới
  providerType: 'SEPAY_QR',
  providerResponse: payload,
});
```

**Migration SQL:**

```sql
-- Step 1: Migrate existing data
UPDATE mkt_payment
SET "providerTransactionId" = "sepayTransactionId"
WHERE "sepayTransactionId" IS NOT NULL
  AND "providerTransactionId" IS NULL;

-- Step 2: Add unique index
CREATE UNIQUE INDEX idx_provider_transaction_id
ON mkt_payment("providerTransactionId")
WHERE "providerTransactionId" IS NOT NULL;

-- Step 3: Add composite index for Layer 2 idempotency
CREATE UNIQUE INDEX idx_reference_gateway_unique
ON mkt_payment("referenceCode", "providerType")
WHERE "referenceCode" IS NOT NULL AND "providerType" IS NOT NULL;
```

---

### 0.3 🟠 Unified WebhookAuthService

**Vấn đề:** Auth logic rời rạc ở 3 nơi:
- `SepayWebhookHandler.validateWebhook()` (không dùng)
- `SepayAuthService.validateAuthorizationHeader()`
- `IpWhitelistGuard`

**Giải pháp:** Consolidate vào `WebhookAuthService`:

```typescript
// infrastructure/security/webhook-auth.service.ts

export type WebhookProvider = 'sepay' | 'bidv';

export type WebhookValidationResult = {
  valid: boolean;
  error?: 'IP_NOT_ALLOWED' | 'INVALID_API_KEY' | 'MISSING_AUTH' | 'INVALID_FORMAT';
  provider?: WebhookProvider;
};

export type WebhookRequest = {
  headers: Record<string, string | undefined>;
  ip: string;
  provider: WebhookProvider;
};

@Injectable()
export class WebhookAuthService {
  private static readonly API_KEY_PREFIX = 'Apikey ';

  constructor(
    @Inject(paymentConfig.KEY)
    private readonly config: ConfigType<typeof paymentConfig>,
  ) {}

  /**
   * Validate webhook request
   * Consolidates: IP whitelist + API key validation
   */
  validateRequest(request: WebhookRequest): WebhookValidationResult {
    // 1. Check IP whitelist (if enabled)
    if (!this.isIpAllowed(request.ip, request.provider)) {
      return { valid: false, error: 'IP_NOT_ALLOWED' };
    }

    // 2. Check Authorization header
    const authorization = request.headers['authorization'];

    if (!authorization) {
      return { valid: false, error: 'MISSING_AUTH' };
    }

    if (!authorization.startsWith(WebhookAuthService.API_KEY_PREFIX)) {
      return { valid: false, error: 'INVALID_FORMAT' };
    }

    const apiKey = authorization
      .substring(WebhookAuthService.API_KEY_PREFIX.length)
      .trim();

    if (!this.isApiKeyValid(apiKey, request.provider)) {
      return { valid: false, error: 'INVALID_API_KEY' };
    }

    return { valid: true, provider: request.provider };
  }

  private isIpAllowed(ip: string, provider: WebhookProvider): boolean {
    const whitelist = this.getIpWhitelist(provider);

    if (whitelist.length === 0) {
      return true; // No whitelist = allow all
    }

    return whitelist.includes(ip);
  }

  private getIpWhitelist(provider: WebhookProvider): string[] {
    const whitelistMap: Record<WebhookProvider, string[]> = {
      sepay: this.config.sepay.ipWhitelist ?? [],
      bidv: this.config.bidv?.ipWhitelist ?? [],
    };

    return whitelistMap[provider];
  }

  private isApiKeyValid(apiKey: string, provider: WebhookProvider): boolean {
    const keyMap: Record<WebhookProvider, string | undefined> = {
      sepay: this.config.sepay.webhookApiKey,
      bidv: this.config.bidv?.webhookApiKey,
    };

    const validKey = keyMap[provider];

    return !!validKey && apiKey === validKey;
  }
}
```

**Files cần sửa:**
- ✏️ Tạo: `infrastructure/security/webhook-auth.service.ts`
- ❌ Xóa: `SepayWebhookHandler.validateWebhook()` method (cùng với class)
- ✏️ Giữ và refactor: `SepayAuthService` → merge vào `WebhookAuthService`
- ✏️ Update: Controller để dùng `WebhookAuthService`

---

### 0.4 🟡 Thêm Reconciliation Entity

```typescript
// domain/entities/payment-reconciliation.entity.ts

export const RECONCILIATION_ISSUE_TYPE = {
  UNDERPAID: 'UNDERPAID',
  OVERPAID: 'OVERPAID',
  DUPLICATE: 'DUPLICATE',
  UNMATCHED: 'UNMATCHED',
  EXPIRED: 'EXPIRED',
} as const;

export type ReconciliationIssueType = typeof RECONCILIATION_ISSUE_TYPE[keyof typeof RECONCILIATION_ISSUE_TYPE];

export const RECONCILIATION_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
} as const;

export type ReconciliationStatus = typeof RECONCILIATION_STATUS[keyof typeof RECONCILIATION_STATUS];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPaymentReconciliation,
  namePlural: 'paymentReconciliations',
  labelSingular: 'Payment Reconciliation',
  labelPlural: 'Payment Reconciliations',
  icon: 'IconFileCheck',
})
export class MktPaymentReconciliationWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_RECONCILIATION_FIELD_IDS.transactionId,
    type: FieldMetadataType.TEXT,
    label: 'Transaction ID',
    description: 'Provider transaction ID',
  })
  @WorkspaceFieldIndex()
  transactionId: string;

  @WorkspaceField({
    standardId: MKT_RECONCILIATION_FIELD_IDS.issueType,
    type: FieldMetadataType.SELECT,
    label: 'Issue Type',
    options: [
      { value: 'UNDERPAID', label: 'Underpaid', color: 'yellow' },
      { value: 'OVERPAID', label: 'Overpaid', color: 'blue' },
      { value: 'DUPLICATE', label: 'Duplicate', color: 'red' },
      { value: 'UNMATCHED', label: 'Unmatched', color: 'orange' },
      { value: 'EXPIRED', label: 'Expired', color: 'gray' },
    ],
  })
  issueType: ReconciliationIssueType;

  @WorkspaceField({
    standardId: MKT_RECONCILIATION_FIELD_IDS.originalAmount,
    type: FieldMetadataType.NUMBER,
    label: 'Original Amount',
    description: 'Actual received amount',
  })
  originalAmount: number;

  @WorkspaceField({
    standardId: MKT_RECONCILIATION_FIELD_IDS.expectedAmount,
    type: FieldMetadataType.NUMBER,
    label: 'Expected Amount',
    description: 'Expected amount from order',
  })
  @WorkspaceIsNullable()
  expectedAmount?: number;

  @WorkspaceField({
    standardId: MKT_RECONCILIATION_FIELD_IDS.difference,
    type: FieldMetadataType.NUMBER,
    label: 'Difference',
    description: 'Amount difference (received - expected)',
  })
  @WorkspaceIsNullable()
  difference?: number;

  @WorkspaceField({
    standardId: MKT_RECONCILIATION_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: 'Resolution Status',
    options: [
      { value: 'OPEN', label: 'Open', color: 'red' },
      { value: 'IN_PROGRESS', label: 'In Progress', color: 'yellow' },
      { value: 'RESOLVED', label: 'Resolved', color: 'green' },
      { value: 'REJECTED', label: 'Rejected', color: 'gray' },
    ],
    defaultValue: "'OPEN'",
  })
  status: ReconciliationStatus;

  @WorkspaceField({
    standardId: MKT_RECONCILIATION_FIELD_IDS.resolutionAction,
    type: FieldMetadataType.TEXT,
    label: 'Resolution Action',
    description: 'Action taken to resolve (refund, manual match, ignore)',
  })
  @WorkspaceIsNullable()
  resolutionAction?: string;

  @WorkspaceField({
    standardId: MKT_RECONCILIATION_FIELD_IDS.resolvedBy,
    type: FieldMetadataType.TEXT,
    label: 'Resolved By',
    description: 'User who resolved the issue',
  })
  @WorkspaceIsNullable()
  resolvedBy?: string;

  @WorkspaceField({
    standardId: MKT_RECONCILIATION_FIELD_IDS.resolvedAt,
    type: FieldMetadataType.DATE_TIME,
    label: 'Resolved At',
  })
  @WorkspaceIsNullable()
  resolvedAt?: string;

  @WorkspaceField({
    standardId: MKT_RECONCILIATION_FIELD_IDS.notes,
    type: FieldMetadataType.TEXT,
    label: 'Notes',
  })
  @WorkspaceIsNullable()
  notes?: string;

  @WorkspaceField({
    standardId: MKT_RECONCILIATION_FIELD_IDS.webhookPayload,
    type: FieldMetadataType.RAW_JSON,
    label: 'Webhook Payload',
    description: 'Original webhook payload for reference',
  })
  @WorkspaceIsNullable()
  webhookPayload?: object;

  // Relations
  @WorkspaceRelation({
    standardId: MKT_RECONCILIATION_FIELD_IDS.mktOrder,
    type: RelationType.MANY_TO_ONE,
    label: 'Order',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'reconciliations',
  })
  @WorkspaceIsNullable()
  mktOrder?: Relation<MktOrderWorkspaceEntity>;

  @WorkspaceJoinColumn('mktOrder')
  mktOrderId?: string;

  @WorkspaceRelation({
    standardId: MKT_RECONCILIATION_FIELD_IDS.mktPayment,
    type: RelationType.MANY_TO_ONE,
    label: 'Payment',
    inverseSideTarget: () => MktPaymentWorkspaceEntity,
    inverseSideFieldKey: 'reconciliations',
  })
  @WorkspaceIsNullable()
  mktPayment?: Relation<MktPaymentWorkspaceEntity>;

  @WorkspaceJoinColumn('mktPayment')
  mktPaymentId?: string;
}
```

---

### 0.5 🟡 Thêm Retry vào Webhook Log

```typescript
// Update mkt-webhook-log.workspace-entity.ts

@WorkspaceField({
  standardId: MKT_WEBHOOK_LOG_FIELD_IDS.retryCount,
  type: FieldMetadataType.NUMBER,
  label: 'Retry Count',
  description: 'Number of processing attempts',
  defaultValue: 0,
})
retryCount: number;

@WorkspaceField({
  standardId: MKT_WEBHOOK_LOG_FIELD_IDS.lastRetryAt,
  type: FieldMetadataType.DATE_TIME,
  label: 'Last Retry At',
})
@WorkspaceIsNullable()
lastRetryAt?: string;

@WorkspaceField({
  standardId: MKT_WEBHOOK_LOG_FIELD_IDS.nextRetryAt,
  type: FieldMetadataType.DATE_TIME,
  label: 'Next Retry At',
  description: 'Scheduled next retry time',
})
@WorkspaceIsNullable()
nextRetryAt?: string;

@WorkspaceField({
  standardId: MKT_WEBHOOK_LOG_FIELD_IDS.lastError,
  type: FieldMetadataType.TEXT,
  label: 'Last Error',
  description: 'Last error message',
})
@WorkspaceIsNullable()
lastError?: string;

@WorkspaceField({
  standardId: MKT_WEBHOOK_LOG_FIELD_IDS.processingStatus,
  type: FieldMetadataType.SELECT,
  label: 'Processing Status',
  options: [
    { value: 'PENDING', label: 'Pending', color: 'gray' },
    { value: 'PROCESSING', label: 'Processing', color: 'blue' },
    { value: 'COMPLETED', label: 'Completed', color: 'green' },
    { value: 'FAILED', label: 'Failed', color: 'red' },
    { value: 'RETRY_SCHEDULED', label: 'Retry Scheduled', color: 'yellow' },
    { value: 'MAX_RETRIES_EXCEEDED', label: 'Max Retries', color: 'orange' },
  ],
  defaultValue: "'PENDING'",
})
processingStatus: string;
```

---

## 1. Tổng Quan

### 1.1 Mục Tiêu

Thiết kế lại module payment theo **Clean Architecture** để:
- Hỗ trợ **Virtual Account (VA)** - Tài khoản ảo SePay
- Hỗ trợ **Regular Transfer** - Chuyển khoản thường (parse nội dung)
- Dễ dàng **chuyển đổi** giữa 2 mode
- Dễ **mở rộng** thêm payment method mới
- **Testable** và **maintainable**

### 1.2 So Sánh VA vs Regular Transfer

| Tiêu chí | Virtual Account (VA) | Regular Transfer |
|----------|:--------------------:|:----------------:|
| **Độ chính xác matching** | 99.9% | 70-80% |
| **Cần parse content** | ❌ Không | ✅ Có |
| **Cần fuzzy matching** | ❌ Không | ✅ Có |
| **Reconciliation effort** | Thấp | Cao |
| **Setup complexity** | Cao hơn | Đơn giản |
| **Cost** | Có phí VA | Miễn phí |
| **Unique identifier** | Số tài khoản ảo | Mã đơn trong nội dung |

### 1.3 Virtual Account Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VIRTUAL ACCOUNT FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. Tạo Order                                                                 │
│     └──▶ Gọi SePay API tạo VA ──▶ Nhận VA Number (VD: 1900123456789)        │
│                                                                               │
│  2. Hiển thị cho khách                                                       │
│     └──▶ QR Code + VA Number + Bank Info                                     │
│                                                                               │
│  3. Khách chuyển tiền                                                         │
│     └──▶ Chuyển đến VA Number (không cần ghi nội dung chuẩn)                │
│                                                                               │
│  4. SePay nhận tiền                                                           │
│     └──▶ Webhook gửi về với subAccount = VA Number                          │
│                                                                               │
│  5. Hệ thống match                                                            │
│     └──▶ Lookup Order by VA Number ──▶ 100% chính xác                       │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Regular Transfer Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REGULAR TRANSFER FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. Tạo Order                                                                 │
│     └──▶ Generate Order Code (VD: ORD20260202001)                           │
│                                                                               │
│  2. Hiển thị cho khách                                                       │
│     └──▶ QR Code + Bank Account + Nội dung: "ORD20260202001"                │
│                                                                               │
│  3. Khách chuyển tiền                                                         │
│     └──▶ Ghi nội dung (có thể sai/thiếu)                                    │
│                                                                               │
│  4. SePay nhận tiền                                                           │
│     └──▶ Webhook với code hoặc content chứa order code                      │
│                                                                               │
│  5. Hệ thống match                                                            │
│     └──▶ Parse code/content ──▶ Fuzzy match nếu cần ──▶ 70-90% chính xác   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Clean Architecture Design

### 2.1 Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Controllers   │  │    Resolvers    │  │      DTOs       │              │
│  │ SepayWebhook    │  │ PaymentMutation │  │ Input/Output    │              │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘              │
├───────────┼────────────────────┼────────────────────────────────────────────┤
│           │                    │           APPLICATION LAYER                 │
│           ▼                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                      USE CASES                               │            │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │            │
│  │  │ProcessWebhook   │  │CreatePayment    │  │ConfirmPayment│ │            │
│  │  │UseCase          │  │UseCase          │  │UseCase       │ │            │
│  │  └────────┬────────┘  └────────┬────────┘  └──────────────┘ │            │
│  └───────────┼────────────────────┼────────────────────────────┘            │
│              │                    │                                          │
├──────────────┼────────────────────┼─────────────────────────────────────────┤
│              │                    │            DOMAIN LAYER                  │
│              ▼                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                    DOMAIN SERVICES                           │            │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │            │
│  │  │PaymentMatcher   │  │AmountValidator  │  │OrderResolver │ │            │
│  │  │Service          │  │Service          │  │Service       │ │            │
│  │  └─────────────────┘  └─────────────────┘  └──────────────┘ │            │
│  │                                                               │            │
│  │  ┌─────────────────────────────────────────────────────────┐ │            │
│  │  │                 MATCHING STRATEGIES                      │ │            │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │ │            │
│  │  │  │ VAMatcher   │  │CodeMatcher  │  │FuzzyMatcher │      │ │            │
│  │  │  │ Strategy    │  │Strategy     │  │Strategy     │      │ │            │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘      │ │            │
│  │  └─────────────────────────────────────────────────────────┘ │            │
│  │                                                               │            │
│  │  ┌─────────────────────────────────────────────────────────┐ │            │
│  │  │                    ENTITIES                              │ │            │
│  │  │  Payment │ Order │ VirtualAccount │ PaymentTransaction  │ │            │
│  │  └─────────────────────────────────────────────────────────┘ │            │
│  └───────────────────────────────────────────────────────────────┘            │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                          INFRASTRUCTURE LAYER                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Repositories   │  │ External APIs   │  │    Adapters     │              │
│  │ PaymentRepo     │  │ SepayVAClient   │  │ WebhookAdapter  │              │
│  │ VARepo          │  │ SepayQRClient   │  │ QueueAdapter    │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Structure

```
packages/twenty-server/src/mkt-core/payment/
├── payment.module.ts                    # Main module definition
│
├── domain/                              # DOMAIN LAYER
│   ├── entities/                        # Domain entities
│   │   ├── payment.entity.ts
│   │   ├── virtual-account.entity.ts
│   │   ├── payment-transaction.entity.ts
│   │   └── index.ts
│   │
│   ├── value-objects/                   # Value objects
│   │   ├── money.vo.ts
│   │   ├── payment-status.vo.ts
│   │   ├── transfer-type.vo.ts          # VA | REGULAR
│   │   └── index.ts
│   │
│   ├── services/                        # Domain services
│   │   ├── payment-matcher.service.ts   # Main matching orchestrator
│   │   ├── amount-validator.service.ts  # Amount validation with tolerance
│   │   ├── order-resolver.service.ts    # Resolve order from payment
│   │   └── index.ts
│   │
│   ├── strategies/                      # Matching strategies (Strategy Pattern)
│   │   ├── matching-strategy.interface.ts
│   │   ├── va-matching.strategy.ts      # VA-based matching
│   │   ├── code-matching.strategy.ts    # Order code matching
│   │   ├── fuzzy-matching.strategy.ts   # Fuzzy matching fallback
│   │   ├── composite-matching.strategy.ts # Chain of strategies
│   │   └── index.ts
│   │
│   ├── events/                          # Domain events
│   │   ├── payment-received.event.ts
│   │   ├── payment-matched.event.ts
│   │   ├── payment-completed.event.ts
│   │   └── index.ts
│   │
│   └── ports/                           # Ports (interfaces for infra)
│       ├── payment.repository.port.ts
│       ├── virtual-account.repository.port.ts
│       ├── va-provider.port.ts
│       ├── queue.port.ts
│       └── index.ts
│
├── application/                         # APPLICATION LAYER
│   ├── use-cases/                       # Use cases
│   │   ├── process-webhook/
│   │   │   ├── process-webhook.use-case.ts
│   │   │   ├── process-webhook.input.ts
│   │   │   └── process-webhook.output.ts
│   │   │
│   │   ├── create-payment/
│   │   │   ├── create-payment.use-case.ts
│   │   │   ├── create-payment.input.ts
│   │   │   └── create-payment.output.ts
│   │   │
│   │   ├── create-virtual-account/
│   │   │   ├── create-va.use-case.ts
│   │   │   ├── create-va.input.ts
│   │   │   └── create-va.output.ts
│   │   │
│   │   ├── confirm-payment/
│   │   │   └── confirm-payment.use-case.ts
│   │   │
│   │   ├── manual-match/
│   │   │   ├── manual-match.use-case.ts
│   │   │   ├── manual-match.input.ts
│   │   │   └── manual-match.output.ts
│   │   │
│   │   ├── reconciliation/              # NEW: Reconciliation use cases
│   │   │   ├── create-reconciliation.use-case.ts
│   │   │   ├── resolve-reconciliation.use-case.ts
│   │   │   ├── list-open-reconciliations.use-case.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── retry-webhook/               # NEW: Retry failed webhooks
│   │   │   ├── retry-webhook.use-case.ts
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── services/                        # Application services
│   │   ├── payment-facade.service.ts    # Facade for external use
│   │   ├── transfer-mode.service.ts     # Switch between VA/Regular
│   │   └── index.ts
│   │
│   └── dto/                             # Application DTOs
│       ├── webhook-payload.dto.ts
│       ├── payment-result.dto.ts
│       └── index.ts
│
├── infrastructure/                      # INFRASTRUCTURE LAYER
│   ├── persistence/                     # Database adapters
│   │   ├── repositories/
│   │   │   ├── payment.repository.ts
│   │   │   ├── virtual-account.repository.ts
│   │   │   ├── payment-transaction.repository.ts
│   │   │   ├── reconciliation.repository.ts    # NEW: Reconciliation repo
│   │   │   └── index.ts
│   │   │
│   │   └── entities/                    # TypeORM/Workspace entities
│   │       ├── mkt-payment.workspace-entity.ts
│   │       ├── mkt-virtual-account.workspace-entity.ts
│   │       ├── mkt-payment-transaction.workspace-entity.ts
│   │       ├── mkt-payment-reconciliation.workspace-entity.ts  # NEW
│   │       └── index.ts
│   │
│   ├── security/                        # NEW: Consolidated security
│   │   ├── webhook-auth.service.ts      # Unified auth (IP + API key)
│   │   ├── webhook-auth.guard.ts        # NestJS guard
│   │   └── index.ts
│   │
│   ├── external/                        # External service adapters
│   │   ├── sepay/
│   │   │   ├── sepay-va.client.ts       # VA API client
│   │   │   ├── sepay-qr.client.ts       # QR generation
│   │   │   ├── sepay-webhook.adapter.ts # Webhook parsing
│   │   │   ├── sepay.config.ts
│   │   │   └── index.ts
│   │   │   # NOTE: sepay-webhook.handler.ts DELETED (duplicate)
│   │   │
│   │   └── bidv/
│   │       ├── bidv.client.ts
│   │       └── index.ts
│   │
│   ├── queue/                           # Queue adapters
│   │   ├── bullmq/
│   │   │   ├── payment-queue.adapter.ts
│   │   │   ├── jobs/
│   │   │   │   ├── process-webhook.job.ts
│   │   │   │   ├── expire-payment.job.ts
│   │   │   │   ├── retry-webhook.job.ts       # NEW: Retry failed webhooks
│   │   │   │   ├── reconciliation-check.job.ts # NEW: Scheduled reconciliation
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   └── config/                          # Infrastructure config
│       ├── payment.config.ts
│       ├── transfer-mode.config.ts      # VA or REGULAR mode
│       └── index.ts
│
├── presentation/                        # PRESENTATION LAYER
│   ├── controllers/
│   │   ├── webhook.controller.ts
│   │   ├── payment-page.controller.ts
│   │   └── index.ts
│   │
│   ├── resolvers/
│   │   ├── payment.resolver.ts
│   │   ├── virtual-account.resolver.ts
│   │   └── index.ts
│   │
│   └── dto/                             # GraphQL DTOs
│       ├── inputs/
│       │   ├── create-payment.input.ts
│       │   ├── create-va.input.ts
│       │   └── index.ts
│       │
│       └── outputs/
│           ├── payment.output.ts
│           ├── va.output.ts
│           └── index.ts
│
└── shared/                              # Shared utilities
    ├── constants/
    │   ├── payment-status.constants.ts
    │   ├── transfer-type.constants.ts
    │   └── index.ts
    │
    ├── utils/
    │   ├── money.utils.ts
    │   ├── order-code-extractor.ts
    │   ├── levenshtein.utils.ts
    │   └── index.ts
    │
    └── types/
        ├── payment.types.ts
        └── index.ts
```

---

## 3. Core Interfaces & Types

### 3.1 Transfer Type

```typescript
// domain/value-objects/transfer-type.vo.ts

export const TRANSFER_TYPE = {
  VIRTUAL_ACCOUNT: 'VIRTUAL_ACCOUNT',
  REGULAR: 'REGULAR',
} as const;

export type TransferType = typeof TRANSFER_TYPE[keyof typeof TRANSFER_TYPE];

/**
 * Transfer mode configuration
 */
export type TransferModeConfig = {
  /** Active transfer type */
  activeMode: TransferType;
  /** Fallback to regular if VA fails */
  fallbackToRegular: boolean;
  /** VA configuration */
  va: {
    enabled: boolean;
    provider: 'sepay' | 'bidv';
    autoCreate: boolean;
    expiryHours: number;
  };
  /** Regular transfer configuration */
  regular: {
    enabled: boolean;
    enableFuzzyMatch: boolean;
    fuzzyThreshold: number;
  };
};
```

### 3.2 Matching Strategy Interface

```typescript
// domain/strategies/matching-strategy.interface.ts

export type MatchResult = {
  matched: boolean;
  orderId?: string;
  orderCode?: string;
  confidence: number; // 0-1
  matchType: 'VA' | 'EXACT_CODE' | 'FUZZY' | 'MANUAL';
  details?: Record<string, unknown>;
};

export type MatchContext = {
  transactionId: string;
  amount: number;
  accountNumber: string;
  subAccount?: string; // VA number
  content?: string;
  code?: string;
  gateway: string;
  transactionDate: string;
};

/**
 * Matching strategy interface
 * Implements Strategy Pattern for different matching algorithms
 */
export interface IMatchingStrategy {
  /** Strategy name */
  readonly name: string;

  /** Priority (lower = higher priority) */
  readonly priority: number;

  /** Check if strategy can handle this context */
  canHandle(context: MatchContext): boolean;

  /** Execute matching */
  match(context: MatchContext): Promise<MatchResult>;
}
```

### 3.3 VA Provider Port

```typescript
// domain/ports/va-provider.port.ts

export type CreateVARequest = {
  orderId: string;
  orderCode: string;
  amount: number;
  expiryMinutes?: number;
  metadata?: Record<string, unknown>;
};

export type CreateVAResponse = {
  vaNumber: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  qrCodeUrl?: string;
  expiresAt: string;
};

export type VAStatus = {
  vaNumber: string;
  isActive: boolean;
  isPaid: boolean;
  paidAmount?: number;
  paidAt?: string;
};

/**
 * Virtual Account Provider Port
 * Implements Port pattern for VA service abstraction
 */
export interface IVAProvider {
  /** Provider name */
  readonly providerName: string;

  /** Create new virtual account */
  createVA(request: CreateVARequest): Promise<CreateVAResponse>;

  /** Get VA status */
  getVAStatus(vaNumber: string): Promise<VAStatus>;

  /** Deactivate VA (after payment or expiry) */
  deactivateVA(vaNumber: string): Promise<void>;

  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
}
```

### 3.4 Payment Repository Port

```typescript
// domain/ports/payment.repository.port.ts

export type PaymentFilter = {
  id?: string;
  orderId?: string;
  status?: PaymentStatus;
  transactionId?: string;
  vaNumber?: string;
};

export interface IPaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment[]>;
  findByTransactionId(transactionId: string): Promise<Payment | null>;
  findByVANumber(vaNumber: string): Promise<Payment | null>;
  save(payment: Payment): Promise<Payment>;
  update(id: string, data: Partial<Payment>): Promise<void>;
}

export interface IVirtualAccountRepository {
  findByVANumber(vaNumber: string): Promise<VirtualAccount | null>;
  findByOrderId(orderId: string): Promise<VirtualAccount | null>;
  findActiveByOrderId(orderId: string): Promise<VirtualAccount | null>;
  save(va: VirtualAccount): Promise<VirtualAccount>;
  update(id: string, data: Partial<VirtualAccount>): Promise<void>;
  deactivate(id: string): Promise<void>;
}
```

---

## 4. Matching Strategies Implementation

### 4.1 VA Matching Strategy

```typescript
// domain/strategies/va-matching.strategy.ts

@Injectable()
export class VAMatchingStrategy implements IMatchingStrategy {
  readonly name = 'VA_MATCHING';
  readonly priority = 1; // Highest priority

  constructor(
    private readonly vaRepository: IVirtualAccountRepository,
  ) {}

  canHandle(context: MatchContext): boolean {
    // Can handle if subAccount (VA number) is present
    return !!context.subAccount && context.subAccount.length > 0;
  }

  async match(context: MatchContext): Promise<MatchResult> {
    const va = await this.vaRepository.findByVANumber(context.subAccount!);

    if (!va) {
      return {
        matched: false,
        confidence: 0,
        matchType: 'VA',
        details: { reason: 'VA_NOT_FOUND', vaNumber: context.subAccount },
      };
    }

    if (!va.isActive) {
      return {
        matched: false,
        confidence: 0,
        matchType: 'VA',
        details: { reason: 'VA_INACTIVE', vaNumber: context.subAccount },
      };
    }

    return {
      matched: true,
      orderId: va.orderId,
      orderCode: va.orderCode,
      confidence: 1.0, // 100% confidence for VA match
      matchType: 'VA',
      details: { vaNumber: context.subAccount },
    };
  }
}
```

### 4.2 Code Matching Strategy

```typescript
// domain/strategies/code-matching.strategy.ts

@Injectable()
export class CodeMatchingStrategy implements IMatchingStrategy {
  readonly name = 'CODE_MATCHING';
  readonly priority = 2;

  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly orderCodeExtractor: OrderCodeExtractor,
  ) {}

  canHandle(context: MatchContext): boolean {
    // Can handle if code or content contains order code pattern
    return !!context.code || !!context.content;
  }

  async match(context: MatchContext): Promise<MatchResult> {
    // Priority 1: Use code field directly
    let orderCode = context.code;

    // Priority 2: Extract from content
    if (!orderCode && context.content) {
      orderCode = this.orderCodeExtractor.extract(context.content);
    }

    if (!orderCode) {
      return {
        matched: false,
        confidence: 0,
        matchType: 'EXACT_CODE',
        details: { reason: 'NO_CODE_FOUND' },
      };
    }

    const order = await this.orderRepository.findByOrderCode(orderCode);

    if (!order) {
      return {
        matched: false,
        confidence: 0.5, // Code found but order not exists
        matchType: 'EXACT_CODE',
        details: { reason: 'ORDER_NOT_FOUND', extractedCode: orderCode },
      };
    }

    return {
      matched: true,
      orderId: order.id,
      orderCode: order.orderCode,
      confidence: context.code ? 0.95 : 0.85, // Higher if from code field
      matchType: 'EXACT_CODE',
      details: { extractedCode: orderCode, source: context.code ? 'code_field' : 'content' },
    };
  }
}
```

### 4.3 Fuzzy Matching Strategy

```typescript
// domain/strategies/fuzzy-matching.strategy.ts

@Injectable()
export class FuzzyMatchingStrategy implements IMatchingStrategy {
  readonly name = 'FUZZY_MATCHING';
  readonly priority = 3; // Lowest priority, fallback

  constructor(
    private readonly orderRepository: IOrderRepository,
    @Inject(FUZZY_CONFIG) private readonly config: FuzzyMatchConfig,
  ) {}

  canHandle(context: MatchContext): boolean {
    // Always can try fuzzy matching as fallback
    return !!context.content || !!context.amount;
  }

  async match(context: MatchContext): Promise<MatchResult> {
    // Get candidate orders (pending, within 7 days, amount ±50%)
    const candidates = await this.orderRepository.findCandidates({
      status: 'PENDING',
      createdWithinDays: 7,
      amountRange: {
        min: context.amount * 0.5,
        max: context.amount * 1.5,
      },
    });

    if (candidates.length === 0) {
      return {
        matched: false,
        confidence: 0,
        matchType: 'FUZZY',
        details: { reason: 'NO_CANDIDATES' },
      };
    }

    // Calculate similarity scores
    const scored = candidates.map(order => ({
      order,
      score: this.calculateScore(order, context),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    if (best.score >= this.config.autoMatchThreshold) {
      return {
        matched: true,
        orderId: best.order.id,
        orderCode: best.order.orderCode,
        confidence: best.score,
        matchType: 'FUZZY',
        details: {
          scores: scored.slice(0, 3).map(s => ({
            orderCode: s.order.orderCode,
            score: s.score,
          })),
        },
      };
    }

    if (best.score >= this.config.suggestThreshold) {
      return {
        matched: false,
        confidence: best.score,
        matchType: 'FUZZY',
        details: {
          suggestion: {
            orderId: best.order.id,
            orderCode: best.order.orderCode,
            score: best.score,
          },
          requiresManualReview: true,
        },
      };
    }

    return {
      matched: false,
      confidence: best.score,
      matchType: 'FUZZY',
      details: { reason: 'BELOW_THRESHOLD', bestScore: best.score },
    };
  }

  private calculateScore(order: Order, context: MatchContext): number {
    let score = 0;

    // Amount similarity (40% weight)
    const amountDiff = Math.abs(order.totalAmount - context.amount);
    const amountScore = 1 - (amountDiff / order.totalAmount);
    score += amountScore * 0.4;

    // Content similarity (30% weight)
    if (context.content) {
      const contentScore = this.calculateContentSimilarity(
        context.content,
        order.orderCode,
        order.customerName,
      );
      score += contentScore * 0.3;
    }

    // Time proximity (20% weight)
    const hoursAgo = this.getHoursAgo(order.createdAt);
    const timeScore = Math.max(0, 1 - (hoursAgo / 168)); // 168 hours = 7 days
    score += timeScore * 0.2;

    // Account history (10% weight)
    // TODO: Check if account number matches previous payments
    score += 0.05; // Placeholder

    return Math.min(1, score);
  }

  private calculateContentSimilarity(
    content: string,
    orderCode: string,
    customerName?: string,
  ): number {
    const normalized = content.toUpperCase();

    // Exact order code in content
    if (normalized.includes(orderCode.toUpperCase())) {
      return 1;
    }

    // Levenshtein distance
    const distance = levenshtein(normalized, orderCode.toUpperCase());
    const maxLen = Math.max(normalized.length, orderCode.length);
    const similarity = 1 - (distance / maxLen);

    // Customer name match bonus
    if (customerName && normalized.includes(customerName.toUpperCase())) {
      return Math.min(1, similarity + 0.2);
    }

    return similarity;
  }

  private getHoursAgo(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60);
  }
}
```

### 4.4 Composite Matching Strategy

```typescript
// domain/strategies/composite-matching.strategy.ts

@Injectable()
export class CompositeMatchingStrategy {
  private strategies: IMatchingStrategy[] = [];

  constructor(
    private readonly vaStrategy: VAMatchingStrategy,
    private readonly codeStrategy: CodeMatchingStrategy,
    private readonly fuzzyStrategy: FuzzyMatchingStrategy,
    @Inject(TRANSFER_MODE_CONFIG) private readonly config: TransferModeConfig,
  ) {
    this.initStrategies();
  }

  private initStrategies(): void {
    this.strategies = [];

    // Add strategies based on config
    if (this.config.va.enabled) {
      this.strategies.push(this.vaStrategy);
    }

    if (this.config.regular.enabled) {
      this.strategies.push(this.codeStrategy);

      if (this.config.regular.enableFuzzyMatch) {
        this.strategies.push(this.fuzzyStrategy);
      }
    }

    // Sort by priority
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  async match(context: MatchContext): Promise<MatchResult> {
    for (const strategy of this.strategies) {
      if (!strategy.canHandle(context)) {
        continue;
      }

      const result = await strategy.match(context);

      if (result.matched) {
        return result;
      }

      // If fuzzy suggests manual review, return it
      if (result.details?.requiresManualReview) {
        return result;
      }
    }

    return {
      matched: false,
      confidence: 0,
      matchType: 'MANUAL',
      details: { reason: 'NO_STRATEGY_MATCHED' },
    };
  }
}
```

---

## 5. Use Cases

### 5.1 Process Webhook Use Case

```typescript
// application/use-cases/process-webhook/process-webhook.use-case.ts

@Injectable()
export class ProcessWebhookUseCase {
  constructor(
    private readonly matchingStrategy: CompositeMatchingStrategy,
    private readonly amountValidator: AmountValidatorService,
    private readonly paymentRepository: IPaymentRepository,
    private readonly orderRepository: IOrderRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly transactionScope: TransactionScopeService,
  ) {}

  async execute(input: ProcessWebhookInput): Promise<ProcessWebhookOutput> {
    return this.transactionScope.runInTransaction(async () => {
      // 1. Idempotency check
      const existing = await this.paymentRepository.findByTransactionId(
        input.transactionId,
      );

      if (existing) {
        return { status: 'ALREADY_PROCESSED', paymentId: existing.id };
      }

      // 2. Build match context
      const context: MatchContext = {
        transactionId: input.transactionId,
        amount: input.amount,
        accountNumber: input.accountNumber,
        subAccount: input.subAccount,
        content: input.content,
        code: input.code,
        gateway: input.gateway,
        transactionDate: input.transactionDate,
      };

      // 3. Execute matching
      const matchResult = await this.matchingStrategy.match(context);

      // 4. Handle match result
      if (!matchResult.matched) {
        return this.handleUnmatched(input, matchResult);
      }

      // 5. Validate amount
      const order = await this.orderRepository.findById(matchResult.orderId!);
      const amountResult = this.amountValidator.validate(
        order!.totalAmount,
        input.amount,
      );

      // 6. Create/Update payment
      const payment = await this.processPayment(input, matchResult, amountResult);

      // 7. Update order if needed
      if (amountResult.shouldConfirmOrder) {
        await this.orderRepository.update(order!.id, {
          status: 'CONFIRMED',
          paymentStatus: amountResult.paymentStatus,
        });
      }

      // 8. Emit events
      this.emitEvents(payment, order!, matchResult, amountResult);

      return {
        status: 'MATCHED',
        paymentId: payment.id,
        orderId: order!.id,
        orderCode: order!.orderCode,
        matchType: matchResult.matchType,
        confidence: matchResult.confidence,
        amountStatus: amountResult.status,
      };
    });
  }

  private async handleUnmatched(
    input: ProcessWebhookInput,
    matchResult: MatchResult,
  ): Promise<ProcessWebhookOutput> {
    // Create unmatched transaction record
    const transaction = await this.paymentRepository.createTransaction({
      ...input,
      status: 'UNMATCHED',
      matchConfidence: matchResult.confidence,
      suggestedOrderId: matchResult.details?.suggestion?.orderId,
    });

    // Emit unmatched event for manual review
    this.eventEmitter.emit('payment.unmatched', {
      transactionId: input.transactionId,
      amount: input.amount,
      suggestion: matchResult.details?.suggestion,
    });

    return {
      status: 'UNMATCHED',
      transactionId: transaction.id,
      suggestion: matchResult.details?.suggestion,
    };
  }
}
```

### 5.2 Retry Webhook Use Case (NEW)

```typescript
// application/use-cases/retry-webhook/retry-webhook.use-case.ts

export const RETRY_CONFIG = {
  MAX_RETRIES: 5,
  BACKOFF_BASE_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
} as const;

@Injectable()
export class RetryWebhookUseCase {
  constructor(
    private readonly webhookLogRepository: IWebhookLogRepository,
    private readonly processWebhookUseCase: ProcessWebhookUseCase,
    private readonly logger: Logger,
  ) {}

  async execute(webhookLogId: string): Promise<RetryResult> {
    const webhookLog = await this.webhookLogRepository.findById(webhookLogId);

    if (!webhookLog) {
      return { success: false, error: 'WEBHOOK_LOG_NOT_FOUND' };
    }

    // Check retry count
    if (webhookLog.retryCount >= RETRY_CONFIG.MAX_RETRIES) {
      await this.webhookLogRepository.update(webhookLogId, {
        processingStatus: 'MAX_RETRIES_EXCEEDED',
        lastError: `Exceeded max retries (${RETRY_CONFIG.MAX_RETRIES})`,
      });

      return { success: false, error: 'MAX_RETRIES_EXCEEDED' };
    }

    // Update status to processing
    await this.webhookLogRepository.update(webhookLogId, {
      processingStatus: 'PROCESSING',
      retryCount: webhookLog.retryCount + 1,
      lastRetryAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    });

    try {
      // Re-process webhook
      const result = await this.processWebhookUseCase.execute(
        webhookLog.payload as ProcessWebhookInput,
      );

      // Update success status
      await this.webhookLogRepository.update(webhookLogId, {
        processingStatus: 'COMPLETED',
        processedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      });

      return { success: true, result };
    } catch (error) {
      const nextRetryAt = this.calculateNextRetry(webhookLog.retryCount + 1);

      await this.webhookLogRepository.update(webhookLogId, {
        processingStatus: 'RETRY_SCHEDULED',
        lastError: error instanceof Error ? error.message : String(error),
        nextRetryAt: DateTimeUtils.toISO(nextRetryAt),
      });

      this.logger.warn(
        `Webhook retry failed for ${webhookLogId}, scheduling next retry at ${nextRetryAt}`,
      );

      return { success: false, error: 'RETRY_FAILED', nextRetryAt };
    }
  }

  private calculateNextRetry(retryCount: number): DateTime {
    const delayMs = RETRY_CONFIG.BACKOFF_BASE_MS *
      Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount - 1);

    return DateTimeUtils.add(DateTimeUtils.now(), { milliseconds: delayMs });
  }
}
```

---

### 5.3 Reconciliation Use Case (NEW)

```typescript
// application/use-cases/reconciliation/create-reconciliation.use-case.ts

@Injectable()
export class CreateReconciliationUseCase {
  constructor(
    private readonly reconciliationRepository: IReconciliationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: CreateReconciliationInput): Promise<Reconciliation> {
    const reconciliation = await this.reconciliationRepository.save({
      transactionId: input.transactionId,
      issueType: input.issueType,
      originalAmount: input.originalAmount,
      expectedAmount: input.expectedAmount,
      difference: input.expectedAmount
        ? MoneyUtils.subtract(input.originalAmount, input.expectedAmount).toNumber()
        : undefined,
      status: 'OPEN',
      webhookPayload: input.webhookPayload,
      mktOrderId: input.orderId,
      mktPaymentId: input.paymentId,
    });

    this.eventEmitter.emit('reconciliation.created', {
      reconciliationId: reconciliation.id,
      issueType: reconciliation.issueType,
      amount: reconciliation.originalAmount,
    });

    return reconciliation;
  }
}

// application/use-cases/reconciliation/resolve-reconciliation.use-case.ts

@Injectable()
export class ResolveReconciliationUseCase {
  constructor(
    private readonly reconciliationRepository: IReconciliationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ResolveReconciliationInput): Promise<Reconciliation> {
    const reconciliation = await this.reconciliationRepository.findById(input.id);

    if (!reconciliation) {
      throw new Error(`Reconciliation not found: ${input.id}`);
    }

    if (reconciliation.status === 'RESOLVED') {
      throw new Error('Reconciliation already resolved');
    }

    const updated = await this.reconciliationRepository.update(input.id, {
      status: 'RESOLVED',
      resolutionAction: input.action,
      resolvedBy: input.resolvedBy,
      resolvedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      notes: input.notes,
    });

    this.eventEmitter.emit('reconciliation.resolved', {
      reconciliationId: input.id,
      action: input.action,
      resolvedBy: input.resolvedBy,
    });

    return updated;
  }
}
```

---

### 5.4 Create Virtual Account Use Case

```typescript
// application/use-cases/create-virtual-account/create-va.use-case.ts

@Injectable()
export class CreateVirtualAccountUseCase {
  constructor(
    @Inject(VA_PROVIDER) private readonly vaProvider: IVAProvider,
    private readonly vaRepository: IVirtualAccountRepository,
    private readonly orderRepository: IOrderRepository,
    @Inject(TRANSFER_MODE_CONFIG) private readonly config: TransferModeConfig,
  ) {}

  async execute(input: CreateVAInput): Promise<CreateVAOutput> {
    // 1. Check if VA mode is enabled
    if (!this.config.va.enabled) {
      throw new Error('Virtual Account mode is not enabled');
    }

    // 2. Get order
    const order = await this.orderRepository.findById(input.orderId);

    if (!order) {
      throw new Error(`Order not found: ${input.orderId}`);
    }

    // 3. Check for existing active VA
    const existingVA = await this.vaRepository.findActiveByOrderId(input.orderId);

    if (existingVA) {
      return {
        vaNumber: existingVA.vaNumber,
        bankCode: existingVA.bankCode,
        bankName: existingVA.bankName,
        accountName: existingVA.accountName,
        qrCodeUrl: existingVA.qrCodeUrl,
        expiresAt: existingVA.expiresAt,
        isExisting: true,
      };
    }

    // 4. Create VA via provider
    const vaResponse = await this.vaProvider.createVA({
      orderId: order.id,
      orderCode: order.orderCode,
      amount: order.totalAmount,
      expiryMinutes: this.config.va.expiryHours * 60,
    });

    // 5. Save VA to database
    const va = await this.vaRepository.save({
      orderId: order.id,
      orderCode: order.orderCode,
      vaNumber: vaResponse.vaNumber,
      bankCode: vaResponse.bankCode,
      bankName: vaResponse.bankName,
      accountName: vaResponse.accountName,
      amount: order.totalAmount,
      qrCodeUrl: vaResponse.qrCodeUrl,
      expiresAt: vaResponse.expiresAt,
      isActive: true,
    });

    return {
      ...vaResponse,
      isExisting: false,
    };
  }
}
```

---

## 6. Configuration

### 6.1 Transfer Mode Configuration

```typescript
// infrastructure/config/transfer-mode.config.ts

import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const transferModeSchema = z.object({
  TRANSFER_MODE: z.enum(['VA', 'REGULAR', 'HYBRID']).default('REGULAR'),

  // VA Config
  VA_ENABLED: z.coerce.boolean().default(false),
  VA_PROVIDER: z.enum(['sepay', 'bidv']).default('sepay'),
  VA_AUTO_CREATE: z.coerce.boolean().default(true),
  VA_EXPIRY_HOURS: z.coerce.number().default(24),
  VA_FALLBACK_TO_REGULAR: z.coerce.boolean().default(true),

  // Regular Config
  REGULAR_ENABLED: z.coerce.boolean().default(true),
  REGULAR_ENABLE_FUZZY: z.coerce.boolean().default(true),
  REGULAR_FUZZY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
});

export const transferModeConfig = registerAs('transferMode', () => {
  const env = transferModeSchema.parse(process.env);

  return {
    activeMode: env.TRANSFER_MODE,
    fallbackToRegular: env.VA_FALLBACK_TO_REGULAR,

    va: {
      enabled: env.VA_ENABLED || env.TRANSFER_MODE === 'VA' || env.TRANSFER_MODE === 'HYBRID',
      provider: env.VA_PROVIDER,
      autoCreate: env.VA_AUTO_CREATE,
      expiryHours: env.VA_EXPIRY_HOURS,
    },

    regular: {
      enabled: env.REGULAR_ENABLED || env.TRANSFER_MODE === 'REGULAR' || env.TRANSFER_MODE === 'HYBRID',
      enableFuzzyMatch: env.REGULAR_ENABLE_FUZZY,
      fuzzyThreshold: env.REGULAR_FUZZY_THRESHOLD,
    },
  };
});
```

### 6.2 Environment Variables

```bash
# .env.example

# ============================================
# TRANSFER MODE CONFIGURATION
# ============================================

# Options: VA | REGULAR | HYBRID
TRANSFER_MODE=REGULAR

# ============================================
# VIRTUAL ACCOUNT (VA) CONFIGURATION
# ============================================

VA_ENABLED=false
VA_PROVIDER=sepay
VA_AUTO_CREATE=true
VA_EXPIRY_HOURS=24
VA_FALLBACK_TO_REGULAR=true

# SePay VA API
SEPAY_VA_API_URL=https://api.sepay.vn/v1/va
SEPAY_VA_API_KEY=your-va-api-key

# ============================================
# REGULAR TRANSFER CONFIGURATION
# ============================================

REGULAR_ENABLED=true
REGULAR_ENABLE_FUZZY=true
REGULAR_FUZZY_THRESHOLD=0.7

# ============================================
# AMOUNT TOLERANCE
# ============================================

AMOUNT_TOLERANCE_PERCENT=0.01
AMOUNT_TOLERANCE_ABSOLUTE=1000
```

---

## 7. Database Schema

### 7.1 Virtual Account Entity

```typescript
// infrastructure/persistence/entities/mkt-virtual-account.workspace-entity.ts

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktVirtualAccount,
  namePlural: 'virtualAccounts',
  labelSingular: 'Virtual Account',
  labelPlural: 'Virtual Accounts',
  icon: 'IconCreditCard',
})
export class MktVirtualAccountWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_VA_FIELD_IDS.vaNumber,
    type: FieldMetadataType.TEXT,
    label: 'VA Number',
    description: 'Virtual Account number from provider',
  })
  @WorkspaceFieldIndex()
  vaNumber: string;

  @WorkspaceField({
    standardId: MKT_VA_FIELD_IDS.bankCode,
    type: FieldMetadataType.TEXT,
    label: 'Bank Code',
  })
  bankCode: string;

  @WorkspaceField({
    standardId: MKT_VA_FIELD_IDS.bankName,
    type: FieldMetadataType.TEXT,
    label: 'Bank Name',
  })
  bankName: string;

  @WorkspaceField({
    standardId: MKT_VA_FIELD_IDS.accountName,
    type: FieldMetadataType.TEXT,
    label: 'Account Name',
  })
  accountName: string;

  @WorkspaceField({
    standardId: MKT_VA_FIELD_IDS.amount,
    type: FieldMetadataType.NUMBER,
    label: 'Expected Amount',
  })
  amount: number;

  @WorkspaceField({
    standardId: MKT_VA_FIELD_IDS.qrCodeUrl,
    type: FieldMetadataType.TEXT,
    label: 'QR Code URL',
  })
  @WorkspaceIsNullable()
  qrCodeUrl?: string;

  @WorkspaceField({
    standardId: MKT_VA_FIELD_IDS.expiresAt,
    type: FieldMetadataType.DATE_TIME,
    label: 'Expires At',
  })
  expiresAt: string;

  @WorkspaceField({
    standardId: MKT_VA_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: 'Is Active',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_VA_FIELD_IDS.provider,
    type: FieldMetadataType.TEXT,
    label: 'Provider',
  })
  provider: string; // 'sepay' | 'bidv'

  @WorkspaceField({
    standardId: MKT_VA_FIELD_IDS.providerResponse,
    type: FieldMetadataType.RAW_JSON,
    label: 'Provider Response',
  })
  @WorkspaceIsNullable()
  providerResponse?: object;

  // Relations
  @WorkspaceRelation({
    standardId: MKT_VA_FIELD_IDS.mktOrder,
    type: RelationType.MANY_TO_ONE,
    label: 'Order',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'virtualAccounts',
  })
  mktOrder: Relation<MktOrderWorkspaceEntity>;

  @WorkspaceJoinColumn('mktOrder')
  mktOrderId: string;
}
```

### 7.2 Updated Payment Entity

```typescript
// Thêm vào mkt-payment.workspace-entity.ts

@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.transferType,
  type: FieldMetadataType.SELECT,
  label: 'Transfer Type',
  options: [
    { value: 'VIRTUAL_ACCOUNT', label: 'Virtual Account', color: 'blue' },
    { value: 'REGULAR', label: 'Regular Transfer', color: 'gray' },
  ],
})
@WorkspaceIsNullable()
transferType?: TransferType;

@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.matchConfidence,
  type: FieldMetadataType.NUMBER,
  label: 'Match Confidence',
  description: 'Confidence score of order matching (0-1)',
})
@WorkspaceIsNullable()
matchConfidence?: number;

@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.matchType,
  type: FieldMetadataType.SELECT,
  label: 'Match Type',
  options: [
    { value: 'VA', label: 'Virtual Account', color: 'green' },
    { value: 'EXACT_CODE', label: 'Exact Code', color: 'blue' },
    { value: 'FUZZY', label: 'Fuzzy Match', color: 'yellow' },
    { value: 'MANUAL', label: 'Manual', color: 'orange' },
  ],
})
@WorkspaceIsNullable()
matchType?: string;

// Relation to Virtual Account
@WorkspaceRelation({
  standardId: MKT_PAYMENT_FIELD_IDS.virtualAccount,
  type: RelationType.MANY_TO_ONE,
  label: 'Virtual Account',
  inverseSideTarget: () => MktVirtualAccountWorkspaceEntity,
  inverseSideFieldKey: 'payments',
})
@WorkspaceIsNullable()
virtualAccount: Relation<MktVirtualAccountWorkspaceEntity>;

@WorkspaceJoinColumn('virtualAccount')
virtualAccountId?: string;
```

---

## 8. Switching Between Modes

### 8.1 Quick Switch

```bash
# Switch to Virtual Account mode
TRANSFER_MODE=VA
VA_ENABLED=true

# Switch to Regular Transfer mode
TRANSFER_MODE=REGULAR
REGULAR_ENABLED=true

# Enable both (Hybrid mode)
TRANSFER_MODE=HYBRID
VA_ENABLED=true
REGULAR_ENABLED=true
```

### 8.2 Runtime Switch (Optional)

```typescript
// application/services/transfer-mode.service.ts

@Injectable()
export class TransferModeService {
  constructor(
    @Inject(TRANSFER_MODE_CONFIG) private config: TransferModeConfig,
    private readonly configService: ConfigService,
  ) {}

  getActiveMode(): TransferType {
    return this.config.activeMode;
  }

  isVAEnabled(): boolean {
    return this.config.va.enabled;
  }

  isRegularEnabled(): boolean {
    return this.config.regular.enabled;
  }

  // For dynamic switching (if needed)
  async switchMode(mode: TransferType): Promise<void> {
    // Update config in database/cache
    // Reload strategies
  }
}
```

---

## 9. Migration Plan

> **⚠️ LƯU Ý:** Migration plan đã được cập nhật để ưu tiên các critical fixes từ code review.

### 9.1 Phase 0: Critical Fixes (NGAY LẬP TỨC - 2-3 ngày)

**Mục tiêu:** Sửa các vấn đề critical trước khi tiếp tục phát triển.

| Task | Effort | Priority |
|------|:------:|:--------:|
| ❌ Xóa `SepayWebhookHandler` class | 1h | P0 |
| ❌ Remove from `PaymentProviderFactory` | 30m | P0 |
| ✏️ Update `mkt-payment.module.ts` providers | 30m | P0 |
| ✏️ Migrate `sepayTransactionId` → `providerTransactionId` | 2h | P0 |
| 📝 Create SQL migration script | 1h | P0 |
| ✏️ Update repository methods to use new field | 2h | P0 |
| ✏️ Add unique index on `providerTransactionId` | 30m | P0 |
| 🧪 Test idempotency với new field | 1h | P0 |

**Deliverables:**
- [ ] Single webhook handler (MktPaymentWebhookService)
- [ ] Consistent idempotency với providerTransactionId
- [ ] Unique index để prevent duplicates

---

### 9.2 Phase 1: Security & Entities (1 tuần)

**Mục tiêu:** Consolidate security và tạo missing entities.

| Task | Effort | Priority |
|------|:------:|:--------:|
| ✨ Create `WebhookAuthService` | 3h | P1 |
| ✏️ Merge `SepayAuthService` logic | 1h | P1 |
| ✏️ Update controller to use new auth | 1h | P1 |
| ✨ Create `MktPaymentReconciliationWorkspaceEntity` | 2h | P1 |
| ✨ Create reconciliation repository | 2h | P1 |
| ✏️ Add retry fields to `MktWebhookLogWorkspaceEntity` | 1h | P1 |
| ✨ Create `ReconciliationService` | 3h | P1 |
| 🧪 Unit tests for new services | 2h | P1 |

**Deliverables:**
- [ ] Unified `WebhookAuthService`
- [ ] Reconciliation entity với GraphQL resolver
- [ ] Retry mechanism trong webhook log

---

### 9.3 Phase 2: Domain Layer & Strategies (1 tuần)

| Task | Effort | Priority |
|------|:------:|:--------:|
| 📁 Tạo domain layer structure | 2h | P2 |
| ✨ Tạo `IMatchingStrategy` interface | 1h | P2 |
| ✨ Tạo `IVAProvider` port | 1h | P2 |
| ✨ Implement `VAMatchingStrategy` | 3h | P2 |
| ✏️ Refactor existing code → `CodeMatchingStrategy` | 2h | P2 |
| ✨ Implement `FuzzyMatchingStrategy` | 4h | P2 |
| ✨ Implement `CompositeMatchingStrategy` | 2h | P2 |
| 🧪 Unit tests cho strategies | 4h | P2 |

**Deliverables:**
- [ ] Clean domain layer với strategies
- [ ] Strategy pattern cho matching algorithms
- [ ] 100% test coverage cho strategies

---

### 9.4 Phase 3: Use Cases & VA Support (1 tuần)

| Task | Effort | Priority |
|------|:------:|:--------:|
| ✨ Create `MktVirtualAccountWorkspaceEntity` | 2h | P2 |
| ✏️ Update `MktPaymentWorkspaceEntity` (matchType, confidence, transferType) | 1h | P2 |
| ✏️ Refactor `MktPaymentWebhookService` → `ProcessWebhookUseCase` | 4h | P2 |
| ✨ Implement `CreateVAUseCase` | 3h | P2 |
| ✏️ Update `CreatePaymentUseCase` | 2h | P2 |
| ✨ Create `transfer-mode.config.ts` | 1h | P2 |
| 🧪 Integration tests | 4h | P2 |

**Deliverables:**
- [ ] VA entity với full CRUD
- [ ] Process webhook use case với strategies
- [ ] Configurable transfer mode

---

### 9.5 Phase 4: Infrastructure & Production (1 tuần)

| Task | Effort | Priority |
|------|:------:|:--------:|
| ✨ Implement `SepayVAClient` | 4h | P3 |
| ✏️ Update repositories với new methods | 3h | P3 |
| ✏️ Update controllers/resolvers | 2h | P3 |
| ✨ Add BullMQ jobs (retry, expiration) | 4h | P3 |
| 🧪 End-to-end tests | 4h | P3 |
| 📝 Documentation update | 2h | P3 |

**Deliverables:**
- [ ] Full VA support với SePay API
- [ ] Background jobs for retry/expiration
- [ ] Production-ready deployment

---

### 9.6 Migration Checklist

```
Phase 0: Critical Fixes
├── [ ] SepayWebhookHandler deleted
├── [ ] providerTransactionId migration completed
├── [ ] Unique index added
└── [ ] All tests passing

Phase 1: Security & Entities
├── [ ] WebhookAuthService created
├── [ ] ReconciliationEntity created
├── [ ] Retry fields added to webhook log
└── [ ] GraphQL resolvers updated

Phase 2: Strategies
├── [ ] Domain layer structure created
├── [ ] All matching strategies implemented
├── [ ] CompositeMatchingStrategy working
└── [ ] Strategy tests passing

Phase 3: VA Support
├── [ ] VirtualAccountEntity created
├── [ ] ProcessWebhookUseCase refactored
├── [ ] CreateVAUseCase implemented
└── [ ] Transfer mode config working

Phase 4: Production
├── [ ] SepayVAClient integrated
├── [ ] BullMQ jobs scheduled
├── [ ] E2E tests passing
└── [ ] Documentation updated
```

---

## 10. Sơ Đồ Sequence

### 10.1 VA Mode Flow

```
┌────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────┐
│ Client │     │ Controller │     │  UseCase   │     │ VAProvider │     │   DB   │
└───┬────┘     └─────┬──────┘     └─────┬──────┘     └─────┬──────┘     └───┬────┘
    │                │                  │                  │                │
    │ Create Order   │                  │                  │                │
    │───────────────>│                  │                  │                │
    │                │ CreateVAUseCase  │                  │                │
    │                │─────────────────>│                  │                │
    │                │                  │ createVA()       │                │
    │                │                  │─────────────────>│                │
    │                │                  │                  │ API call       │
    │                │                  │                  │───────────────>│
    │                │                  │<─────────────────│                │
    │                │                  │ VA Number        │                │
    │                │                  │                  │                │
    │                │                  │ Save VA          │                │
    │                │                  │─────────────────────────────────>│
    │                │<─────────────────│                  │                │
    │<───────────────│ {vaNumber, QR}   │                  │                │
    │                │                  │                  │                │
    │                │                  │                  │                │
    │ Customer transfers to VA Number   │                  │                │
    │                │                  │                  │                │
    │                │ Webhook          │                  │                │
    │                │ (subAccount=VA)  │                  │                │
    │                │─────────────────>│                  │                │
    │                │                  │ VAMatchStrategy  │                │
    │                │                  │─────────────────────────────────>│
    │                │                  │ Find by VANumber │                │
    │                │                  │<─────────────────────────────────│
    │                │                  │ Order found!     │                │
    │                │                  │ confidence: 1.0  │                │
    │                │                  │                  │                │
    │                │                  │ Update Payment   │                │
    │                │                  │─────────────────────────────────>│
    │                │<─────────────────│                  │                │
    │                │ {success: true}  │                  │                │
```

### 10.2 Regular Mode Flow

```
┌────────┐     ┌────────────┐     ┌────────────────────┐     ┌────────┐
│ Client │     │ Controller │     │     UseCase        │     │   DB   │
└───┬────┘     └─────┬──────┘     └─────────┬──────────┘     └───┬────┘
    │                │                      │                    │
    │ Customer transfers with content       │                    │
    │                │                      │                    │
    │                │ Webhook              │                    │
    │                │ (code/content)       │                    │
    │                │─────────────────────>│                    │
    │                │                      │                    │
    │                │                      │ 1. CodeMatchStrategy
    │                │                      │ Extract order code │
    │                │                      │───────────────────>│
    │                │                      │ Find by orderCode  │
    │                │                      │<───────────────────│
    │                │                      │                    │
    │                │                      │ [If found]         │
    │                │                      │ confidence: 0.95   │
    │                │                      │                    │
    │                │                      │ [If not found]     │
    │                │                      │ 2. FuzzyMatchStrategy
    │                │                      │───────────────────>│
    │                │                      │ Get candidates     │
    │                │                      │<───────────────────│
    │                │                      │ Calculate scores   │
    │                │                      │                    │
    │                │                      │ [If score >= 0.7]  │
    │                │                      │ Auto-match         │
    │                │                      │                    │
    │                │                      │ [If score < 0.7]   │
    │                │                      │ Queue for review   │
    │                │                      │                    │
    │                │<─────────────────────│                    │
    │                │ {success: true}      │                    │
```

---

## 11. Kết Luận

### 11.1 Lợi Ích Kiến Trúc Mới

Kiến trúc mới (v2.0) mang lại:

| # | Benefit | Description |
|:-:|---------|-------------|
| 1 | **Single Source of Truth** | Một webhook handler duy nhất, không duplicate logic |
| 2 | **Consistent Idempotency** | `providerTransactionId` với unique index |
| 3 | **Unified Security** | `WebhookAuthService` consolidate IP + API key |
| 4 | **Reconciliation Support** | Entity và workflow để xử lý exceptions |
| 5 | **Retry Mechanism** | Webhook log với retry count và scheduling |
| 6 | **Flexibility** | Dễ dàng switch giữa VA và Regular mode qua config |
| 7 | **Extensibility** | Thêm strategy mới không ảnh hưởng code hiện có |
| 8 | **Testability** | Mỗi layer có thể test độc lập |
| 9 | **Maintainability** | Separation of concerns rõ ràng |
| 10 | **Accuracy** | VA mode đạt 99.9% accuracy matching |

### 11.2 Critical Fixes Summary

**Đã sửa trong v2.0:**

| Issue | Status | Action |
|-------|:------:|--------|
| 🔴 Duplicate webhook handlers | ✅ | Xóa `SepayWebhookHandler`, giữ `MktPaymentWebhookService` |
| 🔴 Idempotency inconsistent | ✅ | Migrate sang `providerTransactionId` với unique index |
| 🟠 Amount validation scattered | ✅ | Consolidate vào `ProcessWebhookUseCase` |
| 🟠 Auth logic rời rạc | ✅ | Tạo `WebhookAuthService` unified |
| 🟡 Missing reconciliation | ✅ | Thêm `MktPaymentReconciliationWorkspaceEntity` |
| 🟡 Missing retry mechanism | ✅ | Thêm retry fields vào webhook log |

### 11.3 Recommended Deployment Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT PHASES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Phase 0: Critical Fixes (NGAY LẬP TỨC)                          │
│  └──▶ Deploy fixes, không thay đổi business logic               │
│                                                                   │
│  Phase 1-2: Internal Testing                                     │
│  └──▶ Test strategies trong staging environment                 │
│                                                                   │
│  Phase 3: Soft Launch                                            │
│  └──▶ HYBRID mode: VA cho high-value orders (>5M VND)           │
│       Regular cho small orders                                   │
│                                                                   │
│  Phase 4: Full Rollout                                           │
│  └──▶ VA làm primary, Regular làm fallback                      │
│       Monitor reconciliation rate < 1%                           │
│                                                                   │
│  Phase 5: Optimization                                           │
│  └──▶ Disable Regular nếu VA hoạt động ổn định                  │
│       Reduce fuzzy matching threshold                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 11.4 Success Metrics

| Metric | Target | Current |
|--------|:------:|:-------:|
| Webhook matching accuracy | >98% | ~85% |
| Auto-match rate (no manual) | >95% | ~70% |
| Reconciliation queue size | <10/day | N/A |
| Webhook retry success rate | >90% | N/A |
| P99 webhook processing time | <500ms | TBD |

### 11.5 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| VA API downtime | Fallback to Regular mode (config) |
| Migration data loss | Backup before migration, rollback script ready |
| Duplicate processing | Unique index + idempotency check at Layer 1 & 2 |
| Performance regression | Load test before production, gradual rollout |

---

**Document History:**
- v1.0 (2026-02-02): Initial VA architecture design
- v2.0 (2026-02-02): Integrated critical fixes from code review assessment

*Tài liệu được tạo cho MKT Software CRM Payment Module*
