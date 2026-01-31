# Multi-Gateway Payment Extension Design

**Ngày tạo:** 2026-01-30
**Vấn đề:** `sepayTransactionId` là SEPay-specific, không mở rộng được cho các cổng thanh toán khác

---

## 1. Thiết kế mới: Provider-Agnostic Fields

### 1.1 Schema thay đổi

**Thay thế `sepayTransactionId` bằng các fields generic:**

```typescript
// ============================================
// PROVIDER-AGNOSTIC TRANSACTION FIELDS
// ============================================

/**
 * providerType: Loại cổng thanh toán
 * Dùng để xác định provider nào xử lý payment này
 */
@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.providerType,
  type: FieldMetadataType.SELECT,
  label: msg`Provider Type`,
  description: msg`Payment gateway provider type`,
  icon: 'IconBuildingBank',
  options: PAYMENT_PROVIDER_OPTIONS,
})
@WorkspaceIsNullable()
providerType?: PaymentProviderType;

/**
 * providerTransactionId: Mã giao dịch từ provider
 * Generic field thay cho sepayTransactionId
 * Format: {provider}:{transactionId} hoặc chỉ {transactionId}
 */
@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.providerTransactionId,
  type: FieldMetadataType.TEXT,
  label: msg`Provider Transaction ID`,
  description: msg`Unique transaction ID from payment provider`,
  icon: 'IconHash',
})
@WorkspaceIsNullable()
@WorkspaceFieldIndex()
providerTransactionId?: string;

/**
 * providerResponse: Raw response từ provider
 * Lưu toàn bộ response để debug và audit
 */
@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.providerResponse,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Provider Response`,
  description: msg`Raw response data from payment provider`,
  icon: 'IconCode',
})
@WorkspaceIsNullable()
providerResponse?: Record<string, unknown>;

/**
 * providerMetadata: Provider-specific metadata
 * Mỗi provider có thể lưu data riêng của họ
 */
@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.providerMetadata,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Provider Metadata`,
  description: msg`Provider-specific configuration and data`,
  icon: 'IconSettings',
})
@WorkspaceIsNullable()
providerMetadata?: Record<string, unknown>;

// Giữ lại sepayTransactionId để backward compatible
// Đánh dấu deprecated
/**
 * @deprecated Use providerTransactionId instead
 */
@WorkspaceField({
  standardId: MKT_PAYMENT_FIELD_IDS.sepayTransactionId,
  type: FieldMetadataType.TEXT,
  label: msg`SePay Transaction ID (Deprecated)`,
  description: msg`[DEPRECATED] Use providerTransactionId instead`,
  icon: 'IconId',
})
@WorkspaceIsNullable()
@WorkspaceFieldIndex()
sepayTransactionId?: string;
```

### 1.2 Provider Type Enum

**File:** `packages/twenty-server/src/mkt-core/payment/constants/payment-provider.constants.ts`

```typescript
import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Payment Provider Types
 * Mở rộng khi thêm provider mới
 */
export const PAYMENT_PROVIDER_TYPE = {
  SEPAY: 'SEPAY',
  VNPAY: 'VNPAY',
  MOMO: 'MOMO',
  ZALOPAY: 'ZALOPAY',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
  CREDIT_CARD: 'CREDIT_CARD',
  OTHER: 'OTHER',
} as const;

export type PaymentProviderType = typeof PAYMENT_PROVIDER_TYPE[keyof typeof PAYMENT_PROVIDER_TYPE];

export const PAYMENT_PROVIDER_OPTIONS = [
  {
    value: PAYMENT_PROVIDER_TYPE.SEPAY,
    label: 'SEPay',
    position: 0,
    color: 'blue' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.VNPAY,
    label: 'VNPay',
    position: 1,
    color: 'green' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.MOMO,
    label: 'MoMo',
    position: 2,
    color: 'pink' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.ZALOPAY,
    label: 'ZaloPay',
    position: 3,
    color: 'sky' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.BANK_TRANSFER,
    label: 'Bank Transfer',
    position: 4,
    color: 'gray' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.CASH,
    label: 'Cash',
    position: 5,
    color: 'yellow' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.CREDIT_CARD,
    label: 'Credit Card',
    position: 6,
    color: 'purple' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.OTHER,
    label: 'Other',
    position: 7,
    color: 'gray' as TagColor,
  },
];

/**
 * Provider capabilities configuration
 */
export const PROVIDER_CAPABILITIES: Record<PaymentProviderType, {
  supportsQrCode: boolean;
  supportsWebhook: boolean;
  supportsRefund: boolean;
  supportsPartialRefund: boolean;
  requiresManualConfirmation: boolean;
}> = {
  [PAYMENT_PROVIDER_TYPE.SEPAY]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.VNPAY]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: true,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.MOMO]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: false,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.ZALOPAY]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: true,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.BANK_TRANSFER]: {
    supportsQrCode: false,
    supportsWebhook: false,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: true,
  },
  [PAYMENT_PROVIDER_TYPE.CASH]: {
    supportsQrCode: false,
    supportsWebhook: false,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: true,
  },
  [PAYMENT_PROVIDER_TYPE.CREDIT_CARD]: {
    supportsQrCode: false,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: true,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.OTHER]: {
    supportsQrCode: false,
    supportsWebhook: false,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: true,
  },
};
```

---

## 2. Provider Interface Pattern (Đã có sẵn)

Hệ thống đã có sẵn Provider pattern tại:
- `packages/twenty-server/src/mkt-core/payment/types/payment-provider.interface.ts`
- `packages/twenty-server/src/mkt-core/payment/providers/base/base-payment.provider.ts`
- `packages/twenty-server/src/mkt-core/payment/factory/payment-provider.factory.ts`

### 2.1 Interface đã có

```typescript
// IPaymentProvider interface - providers phải implement
export type IPaymentProvider = {
  readonly providerType: PaymentProviderType;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;

  isEnabled(): boolean;
  initializePayment(request: InitializePaymentRequest): Promise<InitializePaymentResult>;
  generateQrCode(request: QrCodeRequest): Promise<QrCodeResult>;
  queryPaymentStatus(transactionId: string): Promise<PaymentStatusResult>;
  cancelPayment(transactionId: string): Promise<CancelPaymentResult>;
  refundPayment(request: RefundRequest): Promise<RefundResult>;
  validateConfiguration(): ValidationResult;
};
```

### 2.2 Thêm provider mới

Khi cần thêm VNPay, MoMo, ZaloPay:

```
packages/twenty-server/src/mkt-core/payment/providers/
├── base/
│   └── base-payment.provider.ts    ✅ Đã có
├── sepay/
│   ├── sepay.provider.ts           ✅ Đã có
│   └── sepay-webhook.handler.ts    ✅ Đã có
├── bidv/
│   └── bidv.provider.ts            ✅ Đã có
├── vnpay/                          🆕 Cần tạo
│   ├── vnpay.provider.ts
│   ├── vnpay-webhook.handler.ts
│   └── vnpay.config.ts
├── momo/                           🆕 Cần tạo
│   ├── momo.provider.ts
│   ├── momo-webhook.handler.ts
│   └── momo.config.ts
└── zalopay/                        🆕 Cần tạo
    ├── zalopay.provider.ts
    ├── zalopay-webhook.handler.ts
    └── zalopay.config.ts
```

---

## 3. Migration Strategy

### 3.1 Data Migration cho sepayTransactionId

```typescript
// Migration script để copy data sang field mới
async function migrateProviderTransactionIds(workspaceId: string) {
  const payments = await paymentRepository.find({
    where: {
      sepayTransactionId: Not(IsNull()),
      providerTransactionId: IsNull(),
    },
  });

  for (const payment of payments) {
    await paymentRepository.update(payment.id, {
      providerType: PAYMENT_PROVIDER_TYPE.SEPAY,
      providerTransactionId: payment.sepayTransactionId,
    });
  }
}
```

### 3.2 Backward Compatibility trong Repository

```typescript
// MktPaymentRepository - hỗ trợ cả 2 cách
async findByTransactionId(
  transactionId: string,
  providerType?: PaymentProviderType,
): Promise<MktPaymentWorkspaceEntity | null> {
  // Ưu tiên tìm theo providerTransactionId mới
  let payment = await this.repository.findOne({
    where: {
      providerTransactionId: transactionId,
      ...(providerType && { providerType }),
      deletedAt: IsNull(),
    },
  });

  // Fallback: tìm theo sepayTransactionId cũ (backward compatible)
  if (!payment && (!providerType || providerType === PAYMENT_PROVIDER_TYPE.SEPAY)) {
    payment = await this.repository.findOne({
      where: {
        sepayTransactionId: transactionId,
        deletedAt: IsNull(),
      },
    });
  }

  return payment;
}
```

---

## 4. Webhook Handler Pattern

### 4.1 Generic Webhook Controller

```typescript
@Controller('webhooks')
export class PaymentWebhookController {
  constructor(
    private readonly paymentFacadeService: PaymentFacadeService,
  ) {}

  // SEPay webhook (existing)
  @Post('sepay')
  async handleSepayWebhook(@Body() payload: SepayWebhookDto) {
    return this.paymentFacadeService.processWebhook(
      PAYMENT_PROVIDER_TYPE.SEPAY,
      payload,
    );
  }

  // VNPay webhook (future)
  @Post('vnpay')
  async handleVnpayWebhook(@Body() payload: VnpayWebhookDto) {
    return this.paymentFacadeService.processWebhook(
      PAYMENT_PROVIDER_TYPE.VNPAY,
      payload,
    );
  }

  // MoMo webhook (future)
  @Post('momo')
  async handleMomoWebhook(@Body() payload: MomoWebhookDto) {
    return this.paymentFacadeService.processWebhook(
      PAYMENT_PROVIDER_TYPE.MOMO,
      payload,
    );
  }

  // ZaloPay webhook (future)
  @Post('zalopay')
  async handleZalopayWebhook(@Body() payload: ZalopayWebhookDto) {
    return this.paymentFacadeService.processWebhook(
      PAYMENT_PROVIDER_TYPE.ZALOPAY,
      payload,
    );
  }
}
```

### 4.2 Webhook Handler Interface

```typescript
/**
 * Interface cho webhook handlers của các provider
 */
export type IWebhookHandler = {
  readonly providerType: PaymentProviderType;

  /**
   * Validate webhook signature/authentication
   */
  validateWebhook(request: WebhookValidationRequest): Promise<WebhookValidationResult>;

  /**
   * Parse raw webhook payload thành structured data
   */
  parseWebhookPayload(rawPayload: unknown): Promise<WebhookPayload>;

  /**
   * Process webhook và update payment status
   */
  processWebhook(payload: WebhookPayload, context: WebhookContext): Promise<WebhookProcessResult>;

  /**
   * Extract order code từ webhook payload
   */
  extractOrderCode(payload: WebhookPayload): string | null;

  /**
   * Get transaction ID từ payload
   */
  getTransactionId(payload: WebhookPayload): string;
};
```

---

## 5. Environment Configuration

### 5.1 Cấu trúc ENV cho multiple providers

```env
# ============================================
# SEPAY (existing)
# ============================================
SEPAY_ENABLED=true
SEPAY_API_KEY=xxx
SEPAY_WORKSPACE_ID=xxx
SEPAY_WEBHOOK_SECRET=xxx

# ============================================
# VNPAY (future)
# ============================================
VNPAY_ENABLED=false
VNPAY_TMN_CODE=xxx
VNPAY_HASH_SECRET=xxx
VNPAY_API_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://your-domain.com/payment/vnpay/return

# ============================================
# MOMO (future)
# ============================================
MOMO_ENABLED=false
MOMO_PARTNER_CODE=xxx
MOMO_ACCESS_KEY=xxx
MOMO_SECRET_KEY=xxx
MOMO_API_URL=https://test-payment.momo.vn

# ============================================
# ZALOPAY (future)
# ============================================
ZALOPAY_ENABLED=false
ZALOPAY_APP_ID=xxx
ZALOPAY_KEY1=xxx
ZALOPAY_KEY2=xxx
ZALOPAY_API_URL=https://sb-openapi.zalopay.vn
```

### 5.2 Config Module

```typescript
// payment-providers.config.ts
import { registerAs } from '@nestjs/config';

export const paymentProvidersConfig = registerAs('paymentProviders', () => ({
  sepay: {
    enabled: process.env.SEPAY_ENABLED === 'true',
    apiKey: process.env.SEPAY_API_KEY,
    workspaceId: process.env.SEPAY_WORKSPACE_ID,
    webhookSecret: process.env.SEPAY_WEBHOOK_SECRET,
  },
  vnpay: {
    enabled: process.env.VNPAY_ENABLED === 'true',
    tmnCode: process.env.VNPAY_TMN_CODE,
    hashSecret: process.env.VNPAY_HASH_SECRET,
    apiUrl: process.env.VNPAY_API_URL,
    returnUrl: process.env.VNPAY_RETURN_URL,
  },
  momo: {
    enabled: process.env.MOMO_ENABLED === 'true',
    partnerCode: process.env.MOMO_PARTNER_CODE,
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    apiUrl: process.env.MOMO_API_URL,
  },
  zalopay: {
    enabled: process.env.ZALOPAY_ENABLED === 'true',
    appId: process.env.ZALOPAY_APP_ID,
    key1: process.env.ZALOPAY_KEY1,
    key2: process.env.ZALOPAY_KEY2,
    apiUrl: process.env.ZALOPAY_API_URL,
  },
}));
```

---

## 6. Tóm tắt thay đổi

### 6.1 Schema Changes

| Field cũ | Field mới | Mô tả |
|----------|-----------|-------|
| `sepayTransactionId` | `providerTransactionId` | Generic transaction ID |
| - | `providerType` | Loại provider (SEPAY, VNPAY, MOMO...) |
| - | `providerResponse` | Raw response từ provider |
| - | `providerMetadata` | Provider-specific data |

### 6.2 Code Changes

| Component | Action | Priority |
|-----------|--------|----------|
| `MktPaymentWorkspaceEntity` | Thêm 4 fields mới, deprecate sepayTransactionId | HIGH |
| `MktPaymentRepository` | Support cả 2 cách tìm transaction | HIGH |
| `payment-provider.constants.ts` | Thêm provider types và capabilities | HIGH |
| `PaymentWebhookController` | Thêm endpoints cho providers mới | MEDIUM |
| Migration script | Copy sepayTransactionId → providerTransactionId | HIGH |

### 6.3 Backward Compatibility

1. **Giữ lại `sepayTransactionId`** - đánh dấu deprecated
2. **Repository fallback** - tìm theo cả 2 fields
3. **Webhook existing** - vẫn hoạt động bình thường
4. **Migration script** - copy data sang field mới

---

## 7. Checklist triển khai

- [ ] Thêm fields mới vào MktPaymentWorkspaceEntity
- [ ] Tạo payment-provider.constants.ts
- [ ] Update MktPaymentRepository với dual-lookup
- [ ] Tạo migration script
- [ ] Update webhook service để set providerType
- [ ] Test backward compatibility
- [ ] Documentation

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-30 | 1.0.0 | Initial multi-gateway extension design |
