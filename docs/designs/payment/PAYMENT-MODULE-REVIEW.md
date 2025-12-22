# Payment Module Review

**Module Path**: `packages/twenty-server/src/mkt-core/payment`  
**Review Date**: 2025-12-21  
**Reviewer**: AI Assistant

---

## 📋 Tổng Quan Module

Payment module xử lý thanh toán cho hệ thống CRM-MKT, tích hợp với SEPay và BIDV để tạo QR code thanh toán, nhận webhook xác nhận thanh toán, và đồng bộ trạng thái với Firebase.

### Cấu Trúc Thư Mục

```
payment/
├── constants/                    # Constants và options
│   ├── index.ts
│   ├── payment-status.constants.ts
│   └── payment.type.ts
├── guards/
│   └── sepay-auth.guard.ts       # Guard xác thực API key
├── hooks/
│   ├── mkt-payment-create-one.pre-query.hook.ts
│   └── mkt-payment-update-one.pre-query.hook.ts
├── integration/
│   └── firebase-integration.service.ts
├── middleware/
│   └── apikey-to-bearer.middleware.ts
├── objects/
│   └── mkt-payment-history.workspace-entity.ts
├── sepay-payment/
│   └── sepay-payment.controller.ts
├── services/
│   ├── mkt-payment-listener.service.ts
│   ├── mkt-payment-prepare.service.ts
│   └── mkt-payment.service.ts
├── types/
│   ├── bidv-sepay.types.ts
│   ├── index.ts
│   ├── payment-status.type.ts
│   └── payment-status.types.ts   # Duplicate?
├── mkt-payment.module.ts
└── mkt-payment.workspace-entity.ts
```

---

## ✅ Điểm Mạnh

### 1. **Kiến Trúc Rõ Ràng**
- Phân chia thư mục logic: `services/`, `hooks/`, `guards/`, `types/`
- Sử dụng WorkspaceEntity pattern đúng cách của Twenty CRM
- Pre-query hooks cho create/update operations

### 2. **Tích Hợp Đa Dạng**
- SEPay QR code generation (cả standard và BIDV business mode)
- Firebase real-time sync cho trạng thái đơn hàng
- Webhook endpoint để nhận callback từ payment gateway

### 3. **Security**
- API key validation trong webhook controller
- Guard cho authentication (SepayAuthGuard)
- Environment-based configuration

### 4. **Event-Driven Architecture**
- `MktPaymentListenerService` sử dụng `@OnEvent` decorator
- Tự động tạo payment history khi có event

### 5. **Workspace Entity Đầy Đủ**
- Full-text search với `searchVector`
- Timeline activities relation
- CreatedBy actor metadata

---

## ⚠️ Vấn Đề Cần Khắc Phục

### 1. **🔴 CRITICAL: Duplicate Type Files**

**Vị trí**: `types/payment-status.type.ts` và `types/payment-status.types.ts`

Hai file định nghĩa type tương tự nhau gây confusion:
- `payment-status.type.ts` - định nghĩa `PaymentStatus` type
- `payment-status.types.ts` - file khác (chưa xem nội dung)

**Đề xuất**: Hợp nhất thành một file duy nhất.

---

### 2. **🔴 CRITICAL: Hardcoded Process.env Trực Tiếp**

**Vị trí**: Nhiều nơi trong module

```typescript
// sepay-payment.controller.ts
const workspaceId = process.env.SEPAY_WORKSPACE_ID;
const validApiKey = process.env.SEPAY_WEBHOOK_API_KEY;

// mkt-payment-prepare.service.ts
const isBidvBusiness = process.env.IS_BIDV_BUSINESS === 'true';
const sepayAcc = process.env.SEPAY_ACC || '';
```

**Vấn đề**:
- Vi phạm dependency injection principle
- Khó test (mock env variables)
- Không sử dụng `TwentyConfigService` của hệ thống

**Đề xuất**: Inject `TwentyConfigService` và đăng ký config keys.

---

### 3. **🟠 HIGH: Không Sử Dụng MoneyUtils**

**Vị trí**: `mkt-payment.service.ts`, `mkt-payment-prepare.service.ts`

```typescript
// Hiện tại - arithmetic trực tiếp
amount: totalAmount || 0
amount: payment.amount ?? order.totalAmount ?? 0
```

**Theo CLAUDE.md**: Phải sử dụng `MoneyUtils` cho tất cả financial calculations.

**Đề xuất**:
```typescript
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
const amount = MoneyUtils.round(totalAmount, 2).toNumber();
```

---

### 4. **🟠 HIGH: Không Sử Dụng DateTimeUtils**

**Vị trí**: `sepay-payment.controller.ts`

```typescript
// Hiện tại - new Date() trực tiếp
const expiredDate = new Date(formattedExpiredAt);
```

**Theo CLAUDE.md**: Phải sử dụng `DateTimeUtils` cho date/time operations.

**Đề xuất**:
```typescript
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
const expiredDate = DateTimeUtils.fromISO(formattedExpiredAt);
```

---

### 5. **🟠 HIGH: Error Handling Inconsistent**

**Vị trí**: `firebase-integration.service.ts`

```typescript
// Có chỗ throw error
throw new Error(`Firebase user retrieval failed: ${error.message}`);

// Có chỗ return silently
return; // Don't throw here to prevent breaking the main order flow
```

**Vấn đề**: Không nhất quán trong cách xử lý lỗi.

**Đề xuất**: Định nghĩa strategy rõ ràng:
- Critical operations → throw custom exception
- Non-critical (Firebase sync) → log và return, sử dụng Result pattern

---

### 6. **🟠 HIGH: Missing Input Validation**

**Vị trí**: `sepay-payment.controller.ts`

```typescript
@Post('hooks/sepay-payment')
async handleSepayPayment(@Body() payload: SepayWebhookPayload) {
  // Không validate payload structure
}
```

**Đề xuất**: Sử dụng class-validator với DTO:
```typescript
class SepayWebhookPayloadDto {
  @IsString()
  @IsNotEmpty()
  code: string;
  
  @IsNumber()
  @Min(0)
  transferAmount: number;
  // ...
}
```

---

### 7. **🟡 MEDIUM: Unused Code/Imports**

**Vị trí**: `sepay-payment.controller.ts`

```typescript
// Line 119: eslint-disable comment
// eslint-disable-next-line @nx/workspace-rest-api-methods-should-be-guarded

// Unused imports có thể tồn tại
```

**Đề xuất**: Clean up unused code và review eslint-disable comments.

---

### 8. **🟡 MEDIUM: Magic Strings**

**Vị trí**: Nhiều nơi

```typescript
if (newPaymentMethod.name === 'SEPay QR') { ... }
if (mktPaymentMethod?.name !== 'SEPay QR') return result;
```

**Đề xuất**: Tạo constant:
```typescript
// constants/payment-method.constants.ts
export const PAYMENT_METHOD_NAMES = {
  SEPAY_QR: 'SEPay QR',
  BIDV_TRANSFER: 'BIDV Transfer',
} as const;
```

---

### 9. **🟡 MEDIUM: Middleware Không Được Sử Dụng**

**Vị trí**: `middleware/apikey-to-bearer.middleware.ts`

Middleware được định nghĩa nhưng không thấy đăng ký trong module.

**Đề xuất**: Xác nhận có sử dụng không, nếu không thì xóa.

---

### 10. **🟡 MEDIUM: Guard Không Được Đăng Ký**

**Vị trí**: `guards/sepay-auth.guard.ts`

Guard được tạo nhưng không thấy sử dụng trong controller (controller dùng `PublicEndpointGuard`).

**Đề xuất**: Xác nhận flow authentication và dọn dẹp code không sử dụng.

---

### 11. **🟡 MEDIUM: Duplicate QR Generation Logic**

**Vị trí**: 
- `mkt-payment-prepare.service.ts` → `_draftSepayQrCodeUrl()`
- `mkt-payment-update-one.pre-query.hook.ts` → `draftSepayQrCodeUrl()`

Hai method gần như giống nhau.

**Đề xuất**: Di chuyển logic vào service dùng chung.

---

### 12. **🟢 LOW: Naming Convention**

```typescript
// Inconsistent naming
_draftSepayQrCodeUrl()  // underscore prefix
generateBidvSepayQr()   // no prefix
```

**Đề xuất**: Thống nhất naming convention, bỏ underscore prefix cho private methods.

---

### 13. **🟢 LOW: TODO Comments**

**Vị trí**: `mkt-payment-listener.service.ts`

```typescript
// TODO: Update PaymentHistory entity to use relation instead of ActorMetadata for createdBy
```

**Đề xuất**: Tạo issue/task để track và xử lý.

---

### 14. **🟢 LOW: Missing Unit Tests**

Không thấy thư mục `__tests__/` trong module.

**Đề xuất**: Thêm unit tests cho:
- `MktPaymentService`
- `MktPaymentPrepareService`
- `SepayPaymentController` (webhook handling)

---

## 🔧 Đề Xuất Cải Thiện

### Priority 1: Critical (Cần làm ngay)

1. **Consolidate type files**: Hợp nhất `payment-status.type.ts` và `payment-status.types.ts`

2. **Sử dụng TwentyConfigService**:
```typescript
// payment.config.ts
export const PAYMENT_CONFIG_KEYS = {
  SEPAY_ACC: 'SEPAY_ACC',
  SEPAY_BANK: 'SEPAY_BANK',
  SEPAY_WORKSPACE_ID: 'SEPAY_WORKSPACE_ID',
  // ...
} as const;

// service
constructor(private readonly configService: TwentyConfigService) {}

const sepayAcc = this.configService.get(PAYMENT_CONFIG_KEYS.SEPAY_ACC);
```

3. **Input Validation cho Webhook**:
```typescript
import { IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SepayWebhookPayloadDto {
  @IsString()
  gateway: string;

  @IsString()
  code: string;

  @IsNumber()
  transferAmount: number;

  @IsString()
  transactionDate: string;
  // ...
}
```

### Priority 2: High (Sprint này)

4. **Áp dụng MoneyUtils và DateTimeUtils**: Refactor tất cả financial calculations và date operations

5. **Tạo QR Generation Service riêng**:
```typescript
// services/mkt-qr-generation.service.ts
@Injectable()
export class MktQrGenerationService {
  async generateSepayQr(params: SepayQrParams): Promise<QrResult> {}
  async generateBidvQr(params: BidvQrParams): Promise<QrResult> {}
}
```

6. **Standardize Error Handling**:
```typescript
// exceptions/payment.exceptions.ts
export class PaymentProcessingException extends HttpException {}
export class QrGenerationException extends HttpException {}
export class WebhookValidationException extends HttpException {}
```

### Priority 3: Medium (Backlog)

7. **Clean up unused code**: Remove unused guard, middleware nếu không dùng

8. **Add Unit Tests**: Cover critical paths

9. **Extract Constants**: Magic strings → constants

10. **Documentation**: Thêm JSDoc cho public methods

### Priority 4: Low (Nice to have)

11. **Naming convention audit**

12. **Resolve TODO comments**

---

## 📊 Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Files | 15 | Hợp lý |
| Services | 3 | OK |
| Entities | 2 | OK |
| Hooks | 2 | OK |
| Test Coverage | 0% | ❌ Cần cải thiện |
| Type Safety | ~70% | Cần cải thiện |
| Code Duplication | ~15% | Cần refactor |

---

## 🎯 Action Items

### Immediate (1-2 days)
- [ ] Hợp nhất duplicate type files
- [ ] Thêm DTO validation cho webhook
- [ ] Review và xóa unused guard/middleware

### Short-term (1 week)
- [ ] Refactor sang TwentyConfigService
- [ ] Áp dụng MoneyUtils/DateTimeUtils
- [ ] Tạo QR Generation Service chung

### Mid-term (2-4 weeks)
- [ ] Thêm unit tests (target: 60% coverage)
- [ ] Standardize error handling
- [ ] Extract magic strings to constants

---

## 📝 Notes

1. Module hoạt động nhưng cần refactoring để tuân thủ coding standards của dự án
2. Security cơ bản đã có (API key validation) nhưng cần improve
3. Integration với Firebase đang silent fail - cần xem xét có cần notification khi fail không
4. Consider sử dụng BullMQ cho async payment processing thay vì sync
