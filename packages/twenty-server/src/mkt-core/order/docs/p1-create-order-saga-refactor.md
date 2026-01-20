# P1 — Refactor `CreateOrderSaga` extend `BaseSaga`

> **Priority**: P1
> **Effort**: ~4-6 giờ (bao gồm test)
> **Risk**: Low-Medium (refactor internal, không thay đổi external API)

## 1. Mục tiêu

Refactor `CreateOrderSaga` để extend `BaseSaga`, đảm bảo framework saga thống nhất trong toàn bộ order module với các tính năng:

- Step timeout protection (30s/step)
- Compensate retry với exponential backoff (max 3 retries)
- Critical error alerting khi compensation fail
- Response type chuẩn hóa (`SagaExecutionResult<T>`)
- Typed context thay vì `Map<string, unknown>`

## 2. Phân tích hiện trạng

### 2.1 So sánh `CreateOrderSaga` vs `BaseSaga`

| Feature | `BaseSaga` | `CreateOrderSaga` hiện tại |
|---------|------------|---------------------------|
| Step timeout | ✅ `executeStepWithTimeout` (30s) | ❌ Không có |
| Compensate retry | ✅ Max 3 retries + exponential backoff | ❌ Chỉ 1 lần |
| Config constants | ✅ `SAGA_CONFIG` | ❌ Hardcode `60000ms` |
| Compensation failure alert | ✅ Emit `saga.critical.error` | ❌ Chỉ log |
| Response type | ✅ `SagaExecutionResult<T>` | ❌ `CreateOrderResponse` riêng |
| Typed context | ✅ Override `createContext()` | ❌ Inline literal |

### 2.2 Files cần thay đổi

```
packages/twenty-server/src/mkt-core/order/
├── orchestration/
│   ├── context/
│   │   ├── create-order.context.ts          # NEW - typed context
│   │   └── index.ts                         # UPDATE - export
│   └── saga/
│       └── create-order.saga.ts             # UPDATE - extend BaseSaga
├── services/application/
│   └── order-orchestration.service.ts       # UPDATE - handle SagaExecutionResult
└── types/
    └── index.ts                             # UPDATE - export context type
```

## 3. Thiết kế chi tiết

### 3.1 `CreateOrderSagaContext` (NEW)

```typescript
// File: orchestration/context/create-order.context.ts

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { SagaContext } from 'src/mkt-core/order/types';
import {
  MktPackageSnapshot,
  MktProductSnapshot,
} from 'src/mkt-core/mkt-product-integration';
import { PromotionSnapshot } from 'src/mkt-core/mkt-promotion/types';

/**
 * Typed context for CreateOrderSaga
 *
 * Extends SagaContext with strongly typed fields
 * to replace Map<string, unknown> usage in steps
 *
 * Step data flow:
 * 1. CreateOrderStep → order, orderCode
 * 2. CreateSnapshotsStep → snapshots, snapshotsMap
 * 3. CreateOrderItemsStep → orderItems, totals
 * 4. CalculatePromotionStep → promotionResult, appliedPromotions
 * 5. CreateLicensesStep → licenses
 * 6. CreatePaymentStep → payments, paymentQrCode
 * 7. FinalizeOrderStep → finalStatus
 */
export type CreateOrderSagaContext = SagaContext & {
  // === Step 1: CreateOrderStep outputs ===
  /** Created order entity */
  order?: MktOrderWorkspaceEntity;

  // === Step 2: CreateSnapshotsStep outputs ===
  /** Product/package snapshots for order items */
  snapshots?: Array<{
    productId: string;
    packageId?: string;
    productSnapshot: MktProductSnapshot;
    packageSnapshot: MktPackageSnapshot | null;
  }>;
  /** Map for quick lookup: `${productId}:${packageId}` → snapshot */
  snapshotsMap?: Map<
    string,
    {
      productSnapshot: MktProductSnapshot;
      packageSnapshot: MktPackageSnapshot | null;
    }
  >;

  // === Step 3: CreateOrderItemsStep outputs ===
  /** Created order items */
  orderItems?: MktOrderItemWorkspaceEntity[];
  /** Calculated totals */
  totals?: {
    subtotal: number;
    tax: number;
    discount: number;
    comboDiscount: number;
    totalAmount: number;
  };
  /** Applied combo info */
  appliedCombos?: Array<{
    comboId: string;
    comboName: string;
    discount: number;
  }>;

  // === Step 4: CalculatePromotionStep outputs ===
  /** Promotion calculation result */
  promotionResult?: {
    totalDiscount: number;
    appliedPromotions: PromotionSnapshot[];
    couponUsed?: string;
  };
  /** Final amount after all discounts */
  finalAmount?: number;

  // === Step 5: CreateLicensesStep outputs ===
  /** Created license info */
  licenses?: Array<{
    id: string;
    licenseKey: string;
    orderItemId: string;
  }>;

  // === Step 6: CreatePaymentStep outputs ===
  /** Created payment IDs */
  paymentIds?: string[];
  /** Primary QR code URL for payment */
  paymentQrCode?: string;

  // === Step 7: FinalizeOrderStep outputs ===
  /** Final order status */
  finalStatus?: ORDER_STATUS;
  /** Whether this is a trial order */
  trialLicense?: boolean;

  // === Rollback data (typed) ===
  rollbackOrder?: {
    id: string;
    status: ORDER_STATUS;
  };
  rollbackOrderItems?: string[];
  rollbackLicenses?: string[];
  rollbackPayments?: string[];
  rollbackPromotionUsage?: string[];
};

/**
 * Factory function to create typed CreateOrderSagaContext
 */
export const createCreateOrderContext = (
  workspaceId: string,
  workspaceMemberId?: string,
): CreateOrderSagaContext => ({
  workspaceId,
  workspaceMemberId,
  rollbackData: new Map(),
  metadata: new Map(),
});
```

### 3.2 Refactored `CreateOrderSaga`

```typescript
// File: orchestration/saga/create-order.saga.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { TransactionScopeService } from 'src/mkt-core/common/transaction';
import {
  CreateOrderSagaContext,
  createCreateOrderContext,
} from 'src/mkt-core/order/orchestration/context';
import {
  CreateOrderStep,
  CreateSnapshotsStep,
  CreateOrderItemsStep,
  CalculatePromotionStep,
  CreateLicensesStep,
  CreatePaymentStep,
  FinalizeOrderStep,
} from 'src/mkt-core/order/orchestration/steps';
import {
  MKT_ORDER_EVENT_TYPES,
  CreateOrderWithItemsInput,
  CreateOrderResponse,
  SagaContext,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

import { BaseSaga } from './base/base-saga';

/**
 * CreateOrderSaga - Saga orchestrator for creating orders
 *
 * Extends BaseSaga for unified step execution pattern:
 * - Step timeout protection (30s/step)
 * - Compensate retry with exponential backoff
 * - Critical error alerting
 *
 * Steps:
 * 1. CreateOrderStep - Create order entity
 * 2. CreateSnapshotsStep - Validate & create product/package snapshots
 * 3. CreateOrderItemsStep - Create order items with snapshots
 * 4. CalculatePromotionStep - Calculate and apply promotions
 * 5. CreateLicensesStep - Create licenses for order items
 * 6. CreatePaymentStep - Create payment (if not TRIAL)
 * 7. FinalizeOrderStep - Finalize order status
 */
@Injectable()
export class CreateOrderSaga
  extends BaseSaga<CreateOrderWithItemsInput, CreateOrderResponse>
  implements OnModuleInit
{
  protected readonly logger = new Logger(CreateOrderSaga.name);
  protected readonly sagaName = 'CreateOrderSaga';

  constructor(
    transactionScopeService: TransactionScopeService,
    eventEmitter: EventEmitter2,
    // Inject steps directly
    private readonly createOrderStep: CreateOrderStep,
    private readonly createSnapshotsStep: CreateSnapshotsStep,
    private readonly createOrderItemsStep: CreateOrderItemsStep,
    private readonly calculatePromotionStep: CalculatePromotionStep,
    private readonly createLicensesStep: CreateLicensesStep,
    private readonly createPaymentStep: CreatePaymentStep,
    private readonly finalizeOrderStep: FinalizeOrderStep,
  ) {
    super(transactionScopeService, eventEmitter);
    this.initializeSteps();
  }

  /**
   * Initialize and register steps
   */
  private initializeSteps(): void {
    // Validate all steps are injected
    const injectedSteps = [
      { name: 'createOrderStep', instance: this.createOrderStep },
      { name: 'createSnapshotsStep', instance: this.createSnapshotsStep },
      { name: 'createOrderItemsStep', instance: this.createOrderItemsStep },
      { name: 'calculatePromotionStep', instance: this.calculatePromotionStep },
      { name: 'createLicensesStep', instance: this.createLicensesStep },
      { name: 'createPaymentStep', instance: this.createPaymentStep },
      { name: 'finalizeOrderStep', instance: this.finalizeOrderStep },
    ];

    const missingSteps = injectedSteps
      .filter((s) => !s.instance)
      .map((s) => s.name);

    if (missingSteps.length > 0) {
      this.logger.error(
        `[${this.sagaName}] Failed to inject steps: ${missingSteps.join(', ')}`,
      );
      throw new Error(
        `${this.sagaName} initialization failed: Missing steps: ${missingSteps.join(', ')}`,
      );
    }

    this.registerSteps([
      this.createOrderStep,
      this.createSnapshotsStep,
      this.createOrderItemsStep,
      this.calculatePromotionStep,
      this.createLicensesStep,
      this.createPaymentStep,
      this.finalizeOrderStep,
    ]);
  }

  /**
   * OnModuleInit - fallback if constructor initialization didn't run
   */
  onModuleInit(): void {
    if (this.steps.length === 0) {
      this.initializeSteps();
    }
  }

  /**
   * Create typed context for CreateOrderSaga
   */
  protected createContext(
    workspaceId: string,
    workspaceMemberId?: string,
  ): CreateOrderSagaContext {
    return createCreateOrderContext(workspaceId, workspaceMemberId);
  }

  /**
   * Build success response from context
   */
  protected buildSuccessResponse(context: SagaContext): CreateOrderResponse {
    const typedContext = context as CreateOrderSagaContext;

    return {
      success: true,
      orderId: typedContext.orderId,
      orderCode: typedContext.orderCode,
      paymentQrCode: typedContext.paymentQrCode,
    };
  }

  /**
   * Emit success event after saga completion
   */
  protected emitSuccessEvent(
    context: SagaContext,
    _input: CreateOrderWithItemsInput,
  ): void {
    const typedContext = context as CreateOrderSagaContext;

    if (!typedContext.orderId) {
      return;
    }

    const now = DateTimeUtils.now();
    const nowDate = DateTimeUtils.toDate(now);

    this.eventEmitter.emit(MKT_ORDER_EVENT_TYPES.ORDER_CREATED, {
      name: MKT_ORDER_EVENT_TYPES.ORDER_CREATED,
      workspaceId: typedContext.workspaceId,
      events: [
        {
          eventType: MKT_ORDER_EVENT_TYPES.ORDER_CREATED,
          orderId: typedContext.orderId,
          workspaceId: typedContext.workspaceId,
          orderData: {
            id: typedContext.orderId,
            status: typedContext.finalStatus,
            trialLicense: typedContext.trialLicense,
            createdAt: nowDate,
            updatedAt: nowDate,
          },
          timestamp: DateTimeUtils.toISO(now),
        },
      ],
    });

    this.logger.log(
      `[${this.sagaName}] Emitted ORDER_CREATED event for order: ${typedContext.orderId}`,
    );
  }
}
```

### 3.3 Update `OrderOrchestrationService`

```typescript
// File: services/application/order-orchestration.service.ts
// Thay đổi trong method executeCreateOrder

/**
 * Execute order creation (validation + saga)
 *
 * CHANGED: Handle SagaExecutionResult<CreateOrderResponse> from BaseSaga
 */
private async executeCreateOrder(
  workspaceId: string,
  workspaceMemberId: string | undefined,
  input: CreateOrderWithItemsInput,
): Promise<CreateOrderResponse> {
  // Validate input
  const validationResult =
    await this.validationService.validateCreateOrderInput(input);

  this.logger.debug(LOG.CREATE_VALIDATION_RESULT(validationResult.valid));

  if (!validationResult.valid) {
    const errorMessages = validationResult.errors
      .map((e) => `${e.field}: ${e.message}`)
      .join('; ');

    this.logger.warn(LOG.CREATE_VALIDATION_FAILED(errorMessages));

    return {
      success: false,
      error: LOG.CREATE_VALIDATION_FAILED(errorMessages),
    };
  }

  // Execute saga
  try {
    const sagaResult = await this.createOrderSaga.execute(
      workspaceId,
      workspaceMemberId,
      input,
    );

    // CHANGED: Extract data from SagaExecutionResult
    if (sagaResult.success && sagaResult.data) {
      this.logger.log(
        LOG.CREATE_SUCCESS(
          sagaResult.data.orderId ?? '',
          sagaResult.data.orderCode ?? '',
        ),
      );

      return sagaResult.data;
    }

    // Handle saga failure
    this.logger.error(LOG.CREATE_FAILED(sagaResult.error ?? ''));

    return {
      success: false,
      error: sagaResult.error ?? 'Saga execution failed',
    };
  } catch (error) {
    this.logger.error(LOG.CREATE_UNEXPECTED_ERROR(), error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### 3.4 Update exports

```typescript
// File: orchestration/context/index.ts

export * from './confirm-order.context';
export * from './create-order.context';  // NEW
```

## 4. Migration Steps

### Phase 1: Preparation (30 phút)

1. **Tạo `CreateOrderSagaContext`**
   ```bash
   # Tạo file mới
   touch packages/twenty-server/src/mkt-core/order/orchestration/context/create-order.context.ts
   ```

2. **Update exports**
   - `orchestration/context/index.ts`
   - `types/index.ts` (nếu cần)

### Phase 2: Refactor CreateOrderSaga (1-2 giờ)

1. **Backup file hiện tại**
   ```bash
   cp create-order.saga.ts create-order.saga.ts.backup
   ```

2. **Refactor theo design section 3.2**
   - Thay đổi class declaration: `extends BaseSaga<...>`
   - Remove duplicate methods: `executeSteps`, `compensate`
   - Implement abstract methods: `createContext`, `buildSuccessResponse`, `emitSuccessEvent`
   - Update constructor: call `super()`

3. **Verify compilation**
   ```bash
   npx nx typecheck twenty-server
   ```

### Phase 3: Update Caller (30 phút)

1. **Update `OrderOrchestrationService.executeCreateOrder`**
   - Handle `SagaExecutionResult<CreateOrderResponse>` thay vì `CreateOrderResponse`

2. **Verify API contract không đổi**
   - `createOrderWithItems` vẫn return `CreateOrderResponse`

### Phase 4: Testing (2-3 giờ)

1. **Unit tests**
   ```bash
   npx nx test twenty-server --testPathPattern="create-order.saga"
   ```

2. **Integration tests**
   ```bash
   npx nx run twenty-server:test:integration:with-db-reset
   ```

3. **Manual testing scenarios**
   - Create order success (all steps pass)
   - Create order fail at step N (verify compensation)
   - Create order with step timeout (verify timeout handling)

## 5. Rollback Plan

Nếu có issue sau khi deploy:

1. **Immediate rollback**
   ```bash
   # Restore backup
   mv create-order.saga.ts.backup create-order.saga.ts

   # Revert orchestration service changes
   git checkout -- order-orchestration.service.ts
   ```

2. **Verify**
   ```bash
   npx nx typecheck twenty-server
   npx nx test twenty-server
   ```

## 6. Testing Checklist

### 6.1 Unit Tests

- [ ] `CreateOrderSaga` khởi tạo đúng với tất cả steps
- [ ] `createContext()` trả về `CreateOrderSagaContext` typed
- [ ] `buildSuccessResponse()` map đúng fields từ context
- [ ] `emitSuccessEvent()` emit event với đúng payload

### 6.2 Integration Tests

| Scenario | Expected Behavior |
|----------|-------------------|
| Create order success | All steps pass, return success response |
| Fail at CreateOrderStep | No compensation needed, return error |
| Fail at CreateOrderItemsStep | Compensate CreateOrderStep |
| Fail at CreateLicensesStep | Compensate items + snapshots + order |
| Step timeout (mock) | Step fails with timeout error, compensation runs |
| Compensation retry (mock network error) | Retry up to 3 times with backoff |
| Compensation exhausted | Emit `saga.critical.error` event |

### 6.3 E2E Tests

- [ ] GraphQL mutation `createOrderWithItems` works correctly
- [ ] Response shape unchanged for API consumers
- [ ] Error messages clear and actionable

## 7. Monitoring & Alerting

Sau khi deploy, monitor các metrics:

1. **Success rate**
   - `order.create.success` count
   - `order.create.failure` count

2. **Step duration**
   - Log `[CreateOrderSaga] Step X completed` với timing

3. **Compensation events**
   - Listen `saga.critical.error` event
   - Alert nếu compensation exhausted

## 8. Dependencies

### Modules cần import

```typescript
// Không có dependency mới - BaseSaga đã có sẵn
import { BaseSaga } from './base/base-saga';
```

### External services

Không có thay đổi - các steps giữ nguyên logic.

## 9. Future Improvements

Sau khi hoàn thành P1 này, có thể tiếp tục:

1. **P2: Typed metadata cho steps** - Thay `Map<string, unknown>` bằng typed fields trong context (xem Section 10)
2. **P1: Re-enable idempotency** - Uncomment và test idempotency trong `OrderOrchestrationService`
3. **P0: Fix orderItems trong CalculatePromotionStep** - Đảm bảo promotion có items để evaluate

---

## 10. P2 — Migrate Steps to Typed Context (Loại bỏ `Map<string, unknown>`)

> **Priority**: P2
> **Effort**: ~2-3 giờ (sau khi hoàn thành P1)
> **Prerequisite**: P1 phải hoàn thành trước

### 10.1 Vấn đề hiện tại

Các steps trong `CreateOrderSaga` đang sử dụng `context.metadata: Map<string, unknown>` để truyền dữ liệu:

```typescript
// CreateOrderItemsStep - SET data
context.metadata.set('totalAmount', totals.totalAmount);
context.metadata.set('subtotal', totals.subtotal);
context.metadata.set('comboDiscount', totals.comboDiscount);

// CalculatePromotionStep - GET data (có thể fail silent!)
const orderItems = context.metadata.get('orderItems') as OrderItem[] | undefined;
const totalAmount = context.metadata.get('totalAmount') as number | undefined;
```

**Rủi ro:**

| Vấn đề | Hậu quả |
|--------|---------|
| Typo trong key string | Step B nhận `undefined`, rẽ nhánh sai silently |
| Step A đổi key name | Step B fail mà không có compile-time error |
| Type casting sai | Runtime error hoặc logic sai |
| Khó trace data flow | Phải search string trong codebase |
| IDE không hỗ trợ autocomplete | Dễ sai khi code |

**Ví dụ bug thực tế (P0 trong review):**

```typescript
// CreateOrderItemsStep KHÔNG set 'orderItems' vào metadata
// → CalculatePromotionStep nhận undefined
// → Promotion evaluation chạy với items=[] → discount sai!
```

### 10.2 Giải pháp: Typed Context Fields

Thay vì dùng `Map<string, unknown>`, sử dụng typed fields trong `CreateOrderSagaContext`:

```typescript
// BEFORE: Map-based (unsafe)
context.metadata.set('orderItems', items);
const items = context.metadata.get('orderItems') as OrderItem[];

// AFTER: Typed fields (safe)
context.orderItems = items;
const items = context.orderItems; // TypeScript biết type!
```

### 10.3 Metadata Keys Mapping

Mapping từ `metadata.get/set` sang typed fields trong `CreateOrderSagaContext`:

| Metadata Key (OLD) | Typed Field (NEW) | Type | Set by Step | Used by Step |
|-------------------|-------------------|------|-------------|--------------|
| `'order'` | `context.order` | `MktOrderWorkspaceEntity` | CreateOrderStep | All |
| `'orderItems'` | `context.orderItems` | `MktOrderItemWorkspaceEntity[]` | CreateOrderItemsStep | CalculatePromotionStep |
| `'totalAmount'` | `context.totals.totalAmount` | `number` | CreateOrderItemsStep | CalculatePromotionStep, CreatePaymentStep |
| `'subtotal'` | `context.totals.subtotal` | `number` | CreateOrderItemsStep | CalculatePromotionStep |
| `'comboDiscount'` | `context.totals.comboDiscount` | `number` | CreateOrderItemsStep | FinalizeOrderStep |
| `'appliedCombos'` | `context.appliedCombos` | `ComboInfo[]` | CreateOrderItemsStep | - |
| `'snapshotsMap'` | `context.snapshotsMap` | `Map<string, Snapshot>` | CreateSnapshotsStep | CreateOrderItemsStep |
| `'promotionResult'` | `context.promotionResult` | `PromotionResult` | CalculatePromotionStep | FinalizeOrderStep |
| `'paymentQrCode'` | `context.paymentQrCode` | `string` | CreatePaymentStep | Saga response |
| `'orderStatus'` | `context.finalStatus` | `ORDER_STATUS` | FinalizeOrderStep | Event emission |
| `'trialLicense'` | `context.trialLicense` | `boolean` | FinalizeOrderStep | Event emission |

### 10.4 Step Migration Guide

#### Step 1: CreateOrderStep

```typescript
// File: orchestration/steps/create-order.step.ts

// BEFORE
async execute(context: SagaContext, input: CreateOrderWithItemsInput, queryRunner: QueryRunner) {
  const order = await this.createOrder(...);
  context.orderId = order.id;
  context.orderCode = order.orderCode;
  context.metadata.set('order', order);
  context.rollbackData.set('orderId', order.id);
  // ...
}

// AFTER
async execute(context: SagaContext, input: CreateOrderWithItemsInput, queryRunner: QueryRunner) {
  const typedContext = context as CreateOrderSagaContext;

  const order = await this.createOrder(...);

  // Use typed fields instead of metadata
  typedContext.orderId = order.id;
  typedContext.orderCode = order.orderCode;
  typedContext.order = order;

  // Typed rollback data
  typedContext.rollbackOrder = {
    id: order.id,
    status: order.status as ORDER_STATUS,
  };

  return { success: true, data: { order, orderCode: order.orderCode } };
}
```

#### Step 2: CreateSnapshotsStep

```typescript
// BEFORE
context.metadata.set('snapshotsMap', snapshotsMap);
context.metadata.set('snapshots', snapshots);

// AFTER
const typedContext = context as CreateOrderSagaContext;
typedContext.snapshotsMap = snapshotsMap;
typedContext.snapshots = snapshots;
```

#### Step 3: CreateOrderItemsStep (CRITICAL - fix P0)

```typescript
// BEFORE (BUG: không set orderItems!)
context.metadata.set('totalAmount', totals.totalAmount);
context.metadata.set('subtotal', totals.subtotal);
context.metadata.set('comboDiscount', totals.comboDiscount);
context.metadata.set('appliedCombos', appliedCombos);
// Missing: context.metadata.set('orderItems', savedItems);

// AFTER (FIX: set orderItems)
const typedContext = context as CreateOrderSagaContext;

typedContext.orderItems = savedItems;  // <-- FIX P0!
typedContext.totals = {
  subtotal: totals.subtotal,
  tax: totals.tax,
  discount: totals.discount,
  comboDiscount: totals.comboDiscount,
  totalAmount: totals.totalAmount,
};
typedContext.appliedCombos = appliedCombos;

// Store for rollback
typedContext.rollbackOrderItems = savedItems.map(item => item.id);
```

#### Step 4: CalculatePromotionStep

```typescript
// BEFORE (BUG: orderItems có thể undefined!)
const orderItems = context.metadata.get('orderItems') as OrderItem[] | undefined;
const totalAmount = context.metadata.get('totalAmount') as number | undefined;

if (!orderItems || orderItems.length === 0) {
  // Fallback empty → promotion không chạy đúng!
}

// AFTER (SAFE: TypeScript báo lỗi nếu access wrong field)
const typedContext = context as CreateOrderSagaContext;

// TypeScript compiler sẽ báo nếu orderItems chưa được định nghĩa trong type
const orderItems = typedContext.orderItems;
const totalAmount = typedContext.totals?.totalAmount;

if (!orderItems || orderItems.length === 0) {
  this.logger.warn('No order items found - skipping promotion calculation');
  return { success: true, data: { skipped: true } };
}

// Process promotions...
typedContext.promotionResult = {
  totalDiscount,
  appliedPromotions,
  couponUsed: input.couponCode,
};
typedContext.finalAmount = totalAmount - totalDiscount;
```

#### Step 5: CreateLicensesStep

```typescript
// BEFORE
const orderItems = context.metadata.get('orderItems') as OrderItem[];
context.metadata.set('licenses', createdLicenses);
context.rollbackData.set('licenseIds', licenseIds);

// AFTER
const typedContext = context as CreateOrderSagaContext;

const orderItems = typedContext.orderItems;
if (!orderItems) {
  return { success: false, error: new Error('Order items not found in context') };
}

// ... create licenses ...

typedContext.licenses = createdLicenses;
typedContext.rollbackLicenses = licenseIds;
```

#### Step 6: CreatePaymentStep

```typescript
// BEFORE
const totalAmount = context.metadata.get('totalAmount') as number;
context.metadata.set('paymentQrCode', qrCodeUrl);
context.rollbackData.set('paymentIds', paymentIds);

// AFTER
const typedContext = context as CreateOrderSagaContext;

const totalAmount = typedContext.finalAmount ?? typedContext.totals?.totalAmount;
if (!totalAmount) {
  return { success: false, error: new Error('Total amount not found in context') };
}

// ... create payment ...

typedContext.paymentQrCode = qrCodeUrl;
typedContext.paymentIds = paymentIds;
typedContext.rollbackPayments = paymentIds;
```

#### Step 7: FinalizeOrderStep

```typescript
// BEFORE
context.metadata.set('orderStatus', finalStatus);
context.metadata.set('trialLicense', isTrialOrder);

// AFTER
const typedContext = context as CreateOrderSagaContext;

typedContext.finalStatus = finalStatus;
typedContext.trialLicense = isTrialOrder;
```

### 10.5 Compensate Methods Update

```typescript
// BEFORE: Using rollbackData Map
async compensate(context: SagaContext, queryRunner: QueryRunner): Promise<void> {
  const orderId = context.rollbackData.get('orderId') as string;
  const licenseIds = context.rollbackData.get('licenseIds') as string[];
  // ...
}

// AFTER: Using typed rollback fields
async compensate(context: SagaContext, queryRunner: QueryRunner): Promise<void> {
  const typedContext = context as CreateOrderSagaContext;

  if (typedContext.rollbackOrder) {
    await this.orderRepository.delete(typedContext.rollbackOrder.id);
  }

  if (typedContext.rollbackLicenses?.length) {
    await this.licenseRepository.deleteMany(typedContext.rollbackLicenses);
  }
  // ...
}
```

### 10.6 Migration Checklist

| Step | File | Changes | Status |
|------|------|---------|--------|
| CreateOrderStep | `create-order.step.ts` | Use typed context | ⬜ |
| CreateSnapshotsStep | `create-snapshots.step.ts` | Use typed context | ⬜ |
| CreateOrderItemsStep | `create-order-items.step.ts` | **FIX P0** + typed context | ⬜ |
| CalculatePromotionStep | `calculate-promotion.step.ts` | Use typed context | ⬜ |
| CreateLicensesStep | `create-licenses.step.ts` | Use typed context | ⬜ |
| CreatePaymentStep | `create-payment.step.ts` | Use typed context | ⬜ |
| FinalizeOrderStep | `finalize-order.step.ts` | Use typed context | ⬜ |

### 10.7 Benefits After Migration

1. **Compile-time safety**: TypeScript báo lỗi nếu access field không tồn tại
2. **IDE autocomplete**: Dễ code hơn, ít typo
3. **Refactor-friendly**: Rename field → compiler báo tất cả nơi cần update
4. **Self-documenting**: Type definition cho biết data flow giữa steps
5. **Easier debugging**: Không cần search string trong codebase

### 10.8 Testing sau P2

```bash
# 1. Type check
npx nx typecheck twenty-server

# 2. Unit tests
npx nx test twenty-server --testPathPattern="order.*step"

# 3. Integration tests - đặc biệt test promotion với order items
npx nx run twenty-server:test:integration:with-db-reset

# 4. Manual test: Create order với coupon → verify discount applied
```

---

## Appendix A: File Diff Preview

### `create-order.saga.ts` (key changes)

```diff
- @Injectable()
- export class CreateOrderSaga implements OnModuleInit {
+ @Injectable()
+ export class CreateOrderSaga
+   extends BaseSaga<CreateOrderWithItemsInput, CreateOrderResponse>
+   implements OnModuleInit
+ {
+   protected readonly logger = new Logger(CreateOrderSaga.name);
+   protected readonly sagaName = 'CreateOrderSaga';

    constructor(
-     private readonly transactionScopeService: TransactionScopeService,
-     private readonly eventEmitter: EventEmitter2,
+     transactionScopeService: TransactionScopeService,
+     eventEmitter: EventEmitter2,
      // ... steps
    ) {
+     super(transactionScopeService, eventEmitter);
      this.initializeSteps();
    }

-   // REMOVE: executeSteps, compensate methods (now in BaseSaga)
-   private async executeSteps(...) { ... }
-   private async compensate(...) { ... }

+   // ADD: Abstract method implementations
+   protected createContext(...): CreateOrderSagaContext { ... }
+   protected buildSuccessResponse(context: SagaContext): CreateOrderResponse { ... }
+   protected emitSuccessEvent(...): void { ... }
```

### `order-orchestration.service.ts` (key changes)

```diff
  private async executeCreateOrder(...): Promise<CreateOrderResponse> {
    // ... validation ...

    try {
      const sagaResult = await this.createOrderSaga.execute(...);

-     if (result.success) {
-       this.logger.log(LOG.CREATE_SUCCESS(result.orderId ?? '', result.orderCode ?? ''));
+     if (sagaResult.success && sagaResult.data) {
+       this.logger.log(LOG.CREATE_SUCCESS(
+         sagaResult.data.orderId ?? '',
+         sagaResult.data.orderCode ?? '',
+       ));
+       return sagaResult.data;
      }

-     return result;
+     return {
+       success: false,
+       error: sagaResult.error ?? 'Saga execution failed',
+     };
    } catch (error) {
      // ... error handling ...
    }
  }
```
