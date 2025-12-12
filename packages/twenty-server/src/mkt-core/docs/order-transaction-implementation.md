# Implementation Guide: Order Creation Transaction

## Mục tiêu

Đảm bảo tính nhất quán dữ liệu (data consistency) khi tạo Order bằng cách sử dụng Database Transaction. Nếu bất kỳ bước nào trong Post-Query Hook thất bại, toàn bộ thay đổi sẽ được rollback.

---

## Vấn đề hiện tại

```
Pre-Query Hook (success) → Database Save (success) → Post-Query Hook (FAIL)
                                    ↑
                          Order đã được lưu với status=DRAFT
                          nhưng không có OrderItems, Payment, License
```

**Hậu quả:**
- Order tồn tại với `status = DRAFT` (orphan order)
- Không có OrderItems, Licenses, Payments
- Dữ liệu không nhất quán

---

## Giải pháp: Database Transaction

### Kiến trúc mới

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRANSACTION BOUNDARY                             │
├─────────────────────────────────────────────────────────────────────┤
│  BEGIN TRANSACTION                                                  │
│  │                                                                  │
│  ├── 1. Create Order (từ Pre-Hook + DB Save)                        │
│  │                                                                  │
│  ├── 2. Create OrderItems                                           │
│  │                                                                  │
│  ├── 3. Create Licenses                                             │
│  │                                                                  │
│  ├── 4. Create Contract (if required)                               │
│  │                                                                  │
│  ├── 5. Create Payment                                              │
│  │                                                                  │
│  ├── 6. Update Order status                                         │
│  │                                                                  │
│  └── COMMIT (success) / ROLLBACK (failure)                          │
└─────────────────────────────────────────────────────────────────────┘

External calls (Firebase, SEPay) → Sau khi COMMIT thành công
```

---

## Implementation Steps

### Step 1: Tạo Transaction Service

**File:** `src/mkt-core/order/services/order-transaction.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

import { InjectDataSource } from '@nestjs/typeorm';

type TransactionCallback<T> = (queryRunner: QueryRunner) => Promise<T>;

@Injectable()
export class OrderTransactionService {
  private readonly logger = new Logger(OrderTransactionService.name);

  constructor(
    @InjectDataSource('workspace')
    private readonly dataSource: DataSource,
  ) {}

  async executeInTransaction<T>(
    callback: TransactionCallback<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner);

      await queryRunner.commitTransaction();
      this.logger.log('Transaction committed successfully');

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Transaction rolled back due to error:', error);

      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

---

### Step 2: Tạo Order Creation Transaction Handler

**File:** `src/mkt-core/order/services/order-creation-transaction.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';

import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import { Metadata } from 'src/mkt-core/order/hooks/mkt-order-create-one.post-query.hook';
import { OrderTransactionService } from './order-transaction.service';
import { OrderConfirmService } from './order.confirm.service';
import { OrderService } from './order.service';
import { OrderActionService } from './order.action.service';
import { MktLicenseService } from 'src/mkt-core/license/services/mkt-license.service';
import { MktPaymentService } from 'src/mkt-core/payment/services/mkt-payment.service';
import { callFireBaseType } from 'src/mkt-core/payment/constants/payment.type';

type OrderCreationResult = {
  order: MktOrderWorkspaceEntity;
  firebaseData: callFireBaseType | null;
};

type OrderCreationParams = {
  createdOrder: MktOrderWorkspaceEntity;
  workspaceId: string;
  metadata: Metadata;
};

@Injectable()
export class OrderCreationTransactionService {
  private readonly logger = new Logger(OrderCreationTransactionService.name);

  constructor(
    private readonly transactionService: OrderTransactionService,
    private readonly orderConfirmService: OrderConfirmService,
    private readonly orderService: OrderService,
    private readonly orderActionService: OrderActionService,
    private readonly licenseService: MktLicenseService,
    private readonly paymentService: MktPaymentService,
  ) {}

  async createOrderWithTransaction(
    params: OrderCreationParams,
  ): Promise<OrderCreationResult> {
    const { createdOrder, workspaceId, metadata } = params;

    const action = await this.orderActionService.getActionFromMetadata(metadata);
    const variantsMeta = metadata?.variants;
    const customerMeta = metadata?.customer;
    const paymentMethodsMeta = metadata?.paymentMethods;

    // Execute all database operations in a transaction
    const result = await this.transactionService.executeInTransaction(
      async (queryRunner: QueryRunner) => {
        return this.executeOrderCreation(queryRunner, {
          createdOrder,
          workspaceId,
          action,
          variantsMeta,
          customerMeta,
          paymentMethodsMeta,
        });
      },
    );

    return result;
  }

  private async executeOrderCreation(
    queryRunner: QueryRunner,
    params: {
      createdOrder: MktOrderWorkspaceEntity;
      workspaceId: string;
      action: ORDER_ACTION;
      variantsMeta: Metadata['variants'];
      customerMeta: Metadata['customer'];
      paymentMethodsMeta: Metadata['paymentMethods'];
    },
  ): Promise<OrderCreationResult> {
    const {
      createdOrder,
      workspaceId,
      action,
      variantsMeta,
      customerMeta,
      paymentMethodsMeta,
    } = params;

    // 1. Create OrderItems
    this.logger.log(`Creating order items for order ${createdOrder.id}`);
    await this.orderService.createOrderItemsFromVariantsWithRunner(
      queryRunner,
      variantsMeta,
      createdOrder,
      workspaceId,
    );

    // 2. Create Licenses
    this.logger.log(`Creating licenses for order ${createdOrder.id}`);
    if (action !== ORDER_ACTION.LICENSE_RENEWING) {
      await this.licenseService.createLicensesForOrderItemsWithRunner(
        queryRunner,
        createdOrder,
        customerMeta?.mktCustomerId ?? null,
        workspaceId,
      );
    }

    // 3. Generate order code and calculate values
    const orderCode = await this.orderConfirmService.generateOrderCode(workspaceId);
    const orderName = await this.orderConfirmService.generateOrderName(createdOrder);
    const calculatedValues = await this.orderConfirmService.calculateOrderValues(createdOrder);

    // 4. Create Contract if required
    let mktContractId: string | undefined;

    if (createdOrder.requireContract) {
      this.logger.log(`Creating contract for order ${createdOrder.id}`);
      // Contract creation logic here
    }

    // 5. Update Order information
    await this.orderService.updateOrderInformationWithRunner(
      queryRunner,
      createdOrder.id,
      {
        orderCode: orderCode ?? '',
        name: orderName ?? '',
        subtotal: calculatedValues.subtotal,
        tax: calculatedValues.tax,
        discount: calculatedValues.discount,
        totalAmount: calculatedValues.totalAmount,
        mktCustomerId: customerMeta?.mktCustomerId ?? null,
        mktContractId,
      },
    );

    // 6. Create Payment (if not TRIAL)
    let firebaseData: callFireBaseType | null = null;

    if (action !== ORDER_ACTION.TRIAL) {
      this.logger.log(`Creating payment for order ${createdOrder.id}`);
      firebaseData = await this.paymentService.createPaymentFromOrderWithRunner(
        queryRunner,
        {
          paymentName: `${orderCode}-${orderName}`,
          totalAmount: calculatedValues.totalAmount,
          currency: createdOrder.currency ?? 'VND',
          generatedOrderCode: orderCode,
          orderId: createdOrder.id,
          workspaceId,
          createdBy: createdOrder.createdBy,
          discount: calculatedValues.discount,
        },
        paymentMethodsMeta,
      );
    }

    // 7. Update Order status
    const newStatus = await this.orderActionService.getOrderStatusFromAction(action);
    const isTrial = await this.orderActionService.isTrialAction(action);

    await this.orderService.updateOrderStatusWithRunner(
      queryRunner,
      createdOrder.id,
      newStatus,
      isTrial,
      workspaceId,
    );

    return {
      order: createdOrder,
      firebaseData,
    };
  }
}
```

---

### Step 3: Update Services với QueryRunner support

**File:** `src/mkt-core/order/services/order.service.ts`

Thêm các methods mới hỗ trợ QueryRunner:

```typescript
import { QueryRunner } from 'typeorm';

// Existing method
async createOrderItemsFromVariants(...) { ... }

// New method với QueryRunner
async createOrderItemsFromVariantsWithRunner(
  queryRunner: QueryRunner,
  variantsMeta: Array<{ mktVariantId: string; quantity?: number }> | undefined,
  order: MktOrderWorkspaceEntity,
  workspaceId: string,
): Promise<void> {
  if (!variantsMeta || variantsMeta.length === 0) return;

  const orderItemRepo = queryRunner.manager.getRepository(MktOrderItemWorkspaceEntity);
  const variantRepo = queryRunner.manager.getRepository(MktVariantWorkspaceEntity);

  for (const variantMeta of variantsMeta) {
    const variant = await variantRepo.findOne({
      where: { id: variantMeta.mktVariantId },
      relations: ['mktProduct'],
    });

    if (!variant) {
      throw new Error(`Variant ${variantMeta.mktVariantId} not found`);
    }

    const orderItem = orderItemRepo.create({
      mktOrder: order,
      mktVariant: variant,
      mktProduct: variant.mktProduct,
      quantity: variantMeta.quantity ?? 1,
      unitPrice: variant.price ?? 0,
      snapshotProductName: variant.mktProduct?.name ?? '',
      snapshotVariantName: variant.name ?? '',
    });

    await orderItemRepo.save(orderItem);
  }
}

async updateOrderInformationWithRunner(
  queryRunner: QueryRunner,
  orderId: string,
  updateData: Partial<MktOrderWorkspaceEntity>,
): Promise<void> {
  const orderRepo = queryRunner.manager.getRepository(MktOrderWorkspaceEntity);

  await orderRepo.update(orderId, updateData);
}

async updateOrderStatusWithRunner(
  queryRunner: QueryRunner,
  orderId: string,
  status: ORDER_STATUS,
  isTrial: boolean,
  workspaceId: string,
): Promise<void> {
  const orderRepo = queryRunner.manager.getRepository(MktOrderWorkspaceEntity);

  await orderRepo.update(orderId, {
    status,
    trialLicense: isTrial,
  });
}
```

---

### Step 4: Update License Service

**File:** `src/mkt-core/license/services/mkt-license.service.ts`

```typescript
import { QueryRunner } from 'typeorm';

async createLicensesForOrderItemsWithRunner(
  queryRunner: QueryRunner,
  order: MktOrderWorkspaceEntity,
  mktCustomerId: string | null,
  workspaceId: string,
): Promise<void> {
  const orderItems = order.orderItems ?? [];
  const licenseRepo = queryRunner.manager.getRepository(MktLicenseWorkspaceEntity);

  for (const orderItem of orderItems) {
    const licenseData = await this.buildLicenseData(
      orderItem,
      order,
      mktCustomerId,
    );

    const license = licenseRepo.create(licenseData);

    await licenseRepo.save(license);
  }
}
```

---

### Step 5: Update Payment Service

**File:** `src/mkt-core/payment/services/mkt-payment.service.ts`

```typescript
import { QueryRunner } from 'typeorm';

async createPaymentFromOrderWithRunner(
  queryRunner: QueryRunner,
  paymentData: PaymentData,
  paymentMethodsMeta: Array<{ mktPaymentMethodId: string; name?: string }> | null,
): Promise<callFireBaseType | null> {
  const paymentRepo = queryRunner.manager.getRepository(MktPaymentWorkspaceEntity);

  // Create payment record
  const payment = paymentRepo.create({
    name: paymentData.paymentName,
    amount: paymentData.totalAmount,
    currency: paymentData.currency,
    mktOrderId: paymentData.orderId,
    status: PAYMENT_STATUS.PENDING,
    // ... other fields
  });

  await paymentRepo.save(payment);

  // Call external SEPay API (outside transaction - handled separately)
  // Return data for Firebase call after commit
  return {
    orderCode: paymentData.generatedOrderCode,
    QRCodeUrl: null, // Will be populated after SEPay call
  };
}
```

---

### Step 6: Update Post-Query Hook

**File:** `src/mkt-core/order/hooks/mkt-order-create-one.post-query.hook.ts`

```typescript
import { OrderCreationTransactionService } from '../services/order-creation-transaction.service';

@Injectable()
@WorkspaceQueryHook({
  key: 'mktOrder.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktOrderCreateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  constructor(
    // ... existing dependencies
    private readonly orderCreationTransactionService: OrderCreationTransactionService,
    private readonly fireBaseIntegrationService: FireBaseIntegrationService,
    private readonly mktCommonOrderService: MktCommonOrderService,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktOrderWorkspaceEntity[],
  ): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) return;

    const created = payload?.[0];

    if (!created) return;

    try {
      let metadata: Metadata = created?.metadata || {};

      if (typeof metadata === 'string') {
        metadata = JSON.parse(metadata);
      }

      await this.validateMetadata(metadata);

      // Execute all DB operations in transaction
      const result = await this.orderCreationTransactionService.createOrderWithTransaction({
        createdOrder: created,
        workspaceId,
        metadata,
      });

      // External calls AFTER successful transaction commit
      if (result.firebaseData) {
        await this.callFireBase(result.firebaseData);
      }

      // Emit events after successful commit
      this.mktCommonOrderService.eventUpdated(
        created.id,
        workspaceId,
        MKT_ORDER_EVENT_TYPES.ORDER_CREATED,
      );

      const action = await this.orderActionService.getActionFromMetadata(metadata);

      if (action !== ORDER_ACTION.TRIAL) {
        await this.mktCommonOrderService.paymentUpdated(
          created.id,
          workspaceId,
          PAYMENT_HISTORY_TYPE.PAYMENT,
        );
      }
    } catch (error) {
      this.logger.error(
        '[Order POST HOOK] Transaction failed, all changes rolled back',
        error,
      );
      throw error;
    }
  }
}
```

---

### Step 7: Update Module

**File:** `src/mkt-core/order/mkt-order.module.ts`

```typescript
import { OrderTransactionService } from './services/order-transaction.service';
import { OrderCreationTransactionService } from './services/order-creation-transaction.service';

@Module({
  imports: [
    // ... existing imports
  ],
  providers: [
    // ... existing providers
    OrderTransactionService,
    OrderCreationTransactionService,
  ],
  exports: [
    // ... existing exports
    OrderTransactionService,
    OrderCreationTransactionService,
  ],
})
export class MktOrderModule {}
```

---

## Testing

### Unit Test

**File:** `src/mkt-core/order/services/__tests__/order-creation-transaction.service.spec.ts`

```typescript
describe('OrderCreationTransactionService', () => {
  describe('createOrderWithTransaction', () => {
    it('should rollback all changes when license creation fails', async () => {
      // Arrange
      jest.spyOn(licenseService, 'createLicensesForOrderItemsWithRunner')
        .mockRejectedValue(new Error('License API failed'));

      // Act & Assert
      await expect(
        service.createOrderWithTransaction(params),
      ).rejects.toThrow('License API failed');

      // Verify no OrderItems were created
      const orderItems = await orderItemRepo.find({
        where: { mktOrderId: params.createdOrder.id },
      });
      expect(orderItems).toHaveLength(0);
    });

    it('should commit all changes when successful', async () => {
      // Arrange & Act
      const result = await service.createOrderWithTransaction(params);

      // Assert
      expect(result.order).toBeDefined();

      const orderItems = await orderItemRepo.find({
        where: { mktOrderId: params.createdOrder.id },
      });
      expect(orderItems.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Rollback Scenarios

| Scenario | Behavior |
|----------|----------|
| OrderItems creation fails | Rollback: Order remains DRAFT, no OrderItems |
| License creation fails | Rollback: Order remains DRAFT, no OrderItems, no Licenses |
| Payment creation fails | Rollback: Order remains DRAFT, no OrderItems, no Licenses, no Payment |
| Contract creation fails | Rollback: All previous changes reverted |
| Firebase call fails | **NO rollback** (external call after commit) |
| SEPay API fails | **NO rollback** (payment record created with PENDING status) |

---

## Migration Strategy

### Phase 1: Parallel Implementation
1. Tạo các services mới với suffix `WithRunner`
2. Giữ nguyên code cũ hoạt động
3. Test transaction service riêng

### Phase 2: Feature Flag
```typescript
const USE_TRANSACTION = process.env.ORDER_USE_TRANSACTION === 'true';

if (USE_TRANSACTION) {
  await this.orderCreationTransactionService.createOrderWithTransaction(params);
} else {
  await this.orderConfirmService.confirmOrder(...);
}
```

### Phase 3: Full Migration
1. Enable feature flag
2. Monitor for issues
3. Remove old code

---

## Considerations

### External API Calls
- **SEPay API**: Gọi trong transaction có thể gây timeout
- **Firebase**: Nên gọi SAU khi commit thành công
- **License API**: Nên wrap trong transaction nếu có thể

### Performance
- Transaction lock có thể ảnh hưởng đến concurrent requests
- Cân nhắc sử dụng optimistic locking cho high-traffic scenarios

### Error Handling
- Log đầy đủ để debug khi rollback xảy ra
- Notify admin khi có transaction failures

---

## References

- [TypeORM Transactions](https://typeorm.io/transactions)
- [NestJS Database Transactions](https://docs.nestjs.com/techniques/database#transactions)
- [ACID Properties](https://en.wikipedia.org/wiki/ACID)
