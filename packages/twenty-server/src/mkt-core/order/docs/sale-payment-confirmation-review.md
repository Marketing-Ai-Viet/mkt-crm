# Sale Payment Confirmation - Review & Improvements

## Overview

Đây là review document cho `sale-payment-confirmation-implementation.md` dựa trên các concerns được nêu ra.

---

## 1. State Transition Rules (paymentStatus vs saleConfirmed)

### Issue
Document chưa định nghĩa rõ mối quan hệ giữa:
- `paymentStatus` (PENDING, PARTIAL, PAID, OVERPAID)
- `salePaymentConfirmed` (boolean)
- `accountingConfirmed` (boolean)
- `status` (ORDER_STATUS)

### Proposed Business Rules

```typescript
// State Machine Definition
export const CONFIRMATION_STATE_RULES = {
  // Sale có thể confirm khi:
  saleCanConfirm: {
    validOrderStatuses: [ORDER_STATUS.PROCESSING, ORDER_STATUS.PENDING_PAYMENT],
    validPaymentStatuses: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PARTIAL],
    // KHÔNG cho confirm nếu đã PAID (vì không cần protection nữa)
    excludePaymentStatuses: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.OVERPAID],
  },

  // Accounting có thể confirm khi:
  accountingCanConfirm: {
    validOrderStatuses: [ORDER_STATUS.PROCESSING, ORDER_STATUS.PENDING_PAYMENT],
    // Accounting confirm chỉ khi có chứng từ → thường là PAID hoặc có saleConfirmed
    requiresCondition: (order) =>
      order.paymentStatus === PAYMENT_STATUS.PAID ||
      order.salePaymentConfirmed === true,
  },

  // Khi accounting confirm → auto-complete nếu:
  autoCompleteConditions: {
    requiredPaymentStatus: [PAYMENT_STATUS.PAID],
    // HOẶC saleConfirmed = true (pending actual bank verification)
  },
} as const;
```

### Updated Service Logic

```typescript
// payment-confirmation.service.ts - confirmBySale()

async confirmBySale(input: ConfirmPaymentInput, ...): Promise<ConfirmationResult> {
  const order = await this.orderRepository.findById(orderId, workspaceId);

  // VALIDATION với business rules rõ ràng
  this.validateSaleConfirmation(order);

  // ... rest
}

private validateSaleConfirmation(order: MktOrderWorkspaceEntity): void {
  // 1. Order must exist
  if (!order) {
    throw new OrderNotFoundException(orderId);
  }

  // 2. Not already confirmed
  if (order.salePaymentConfirmed === true) {
    throw new OrderAlreadyConfirmedException(orderId, 'sale');
  }

  // 3. Valid order status
  const validStatuses = [ORDER_STATUS.PROCESSING, ORDER_STATUS.PENDING_PAYMENT];
  if (!validStatuses.includes(order.status as ORDER_STATUS)) {
    throw new InvalidOrderStatusException(orderId, order.status, validStatuses);
  }

  // 4. Payment chưa hoàn tất (nếu PAID thì không cần sale confirm)
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    throw new OrderAlreadyPaidException(orderId);
  }
}
```

---

## 2. Handling null/false of salePaymentConfirmed

### Issue
Document định nghĩa field là `@WorkspaceIsNullable()` nhưng logic check không nhất quán:
- Có chỗ check `!order.salePaymentConfirmed` (true nếu null hoặc false)
- Có chỗ check `order.salePaymentConfirmed === false`

### Proposed Solution

```typescript
// OPTION A: Strict Boolean (Recommended)
// Không cho phép null, default = false

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.salePaymentConfirmed,
  type: FieldMetadataType.BOOLEAN,
  label: msg`Sale Payment Confirmed`,
  description: msg`Whether sale has confirmed payment (protects license from auto-lock)`,
  icon: 'IconUserCheck',
  defaultValue: false,  // ALWAYS false, never null
})
// KHÔNG dùng @WorkspaceIsNullable()
salePaymentConfirmed: boolean;

// Helper method thống nhất
export const isProtectedFromAutoLock = (order: {
  salePaymentConfirmed: boolean;
  accountingConfirmed: boolean;
}): boolean => {
  // Strict comparison
  return order.salePaymentConfirmed === true || order.accountingConfirmed === true;
};
```

```typescript
// OPTION B: Nếu giữ nullable (for migration)
// Chuẩn hóa cách check

export const isSaleConfirmed = (order: { salePaymentConfirmed?: boolean | null }): boolean => {
  // Treat null as false
  return order.salePaymentConfirmed === true;
};

export const isNotConfirmed = (order: {
  salePaymentConfirmed?: boolean | null;
  accountingConfirmed?: boolean | null;
}): boolean => {
  // For overdue scan - only lock if BOTH are not true
  return order.salePaymentConfirmed !== true && order.accountingConfirmed !== true;
};
```

### Migration Backfill

```sql
-- Backfill existing orders: set null → false
UPDATE "_20202020-1c25-4d02-bf25-6aeccf7ea419"."mktOrder"
SET "salePaymentConfirmed" = false
WHERE "salePaymentConfirmed" IS NULL;
```

---

## 3. Permission/Guard Enforcement

### Issue
Document chỉ liệt kê permissions cần thiết nhưng chưa implement:
- `order:confirm:sale`
- `order:confirm:accounting`
- `order:confirm:revoke`

### Proposed Implementation

```typescript
// payment-confirmation.resolver.ts

import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import { WorkspaceAuthGuard, UserAuthGuard } from 'src/engine/guards';

const CONFIRMATION_RESOURCE = 'mktOrderConfirmation';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class PaymentConfirmationResolver {

  /**
   * Sale confirm - requires 'sale' or 'manager' role
   */
  @Mutation(() => ConfirmationResultOutput)
  @DataScope({
    resource: CONFIRMATION_RESOURCE,
    action: 'confirm:sale',
    mode: 'AUTO',
    auditLevel: 'high',  // High audit vì ảnh hưởng license
  })
  async confirmPaymentBySale(
    @Args('input') input: ConfirmPaymentInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMember() workspaceMember: WorkspaceMember,
    @Context() ctx: GraphQLContext,
  ): Promise<ConfirmationResultOutput> {
    // Validate caller has permission via DataScope
    this.validatePermission(ctx, 'confirm:sale');

    // ... rest
  }

  /**
   * Accounting confirm - requires 'accounting' role
   */
  @Mutation(() => ConfirmationResultOutput)
  @DataScope({
    resource: CONFIRMATION_RESOURCE,
    action: 'confirm:accounting',
    mode: 'AUTO',
    auditLevel: 'high',
  })
  async confirmPaymentByAccounting(...) { ... }

  /**
   * Revoke - requires 'manager' or 'admin' role
   */
  @Mutation(() => ConfirmationResultOutput)
  @DataScope({
    resource: CONFIRMATION_RESOURCE,
    action: 'confirm:revoke',
    mode: 'AUTO',
    auditLevel: 'critical',  // Critical vì có thể gây lock license
  })
  async revokePaymentConfirmation(...) { ... }
}
```

### Add Permission Constants

```typescript
// mkt-core/mkt-rbac-enterprise-grade/constants/permissions.constants.ts

export const ORDER_CONFIRMATION_PERMISSIONS = {
  CONFIRM_SALE: 'order:confirm:sale',
  CONFIRM_ACCOUNTING: 'order:confirm:accounting',
  CONFIRM_REVOKE: 'order:confirm:revoke',
  VIEW_HISTORY: 'order:confirm:view-history',
} as const;

// Role mapping
export const CONFIRMATION_ROLE_PERMISSIONS = {
  sale: [ORDER_CONFIRMATION_PERMISSIONS.CONFIRM_SALE],
  accounting: [ORDER_CONFIRMATION_PERMISSIONS.CONFIRM_ACCOUNTING],
  manager: [
    ORDER_CONFIRMATION_PERMISSIONS.CONFIRM_SALE,
    ORDER_CONFIRMATION_PERMISSIONS.CONFIRM_REVOKE,
  ],
  admin: Object.values(ORDER_CONFIRMATION_PERMISSIONS),
} as const;
```

---

## 4. Transaction + Optimistic Lock

### Issue
Document không đề cập transaction boundary và optimistic locking cho update order + create history.

### Proposed Implementation

```typescript
// payment-confirmation.service.ts

import { TransactionScopeService } from 'src/mkt-core/infrastructure/transaction';

@Injectable()
export class PaymentConfirmationService {
  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderHistoryRepository: MktOrderHistoryRepository,
    private readonly transactionScope: TransactionScopeService,
  ) {}

  async confirmBySale(
    input: ConfirmPaymentInput,
    workspaceId: string,
    actor: ActorMetadata,
  ): Promise<ConfirmationResult> {
    const { orderId, note, metadata } = input;

    // WRAP trong transaction
    return this.transactionScope.runInTransaction(async () => {
      // 1. Fetch with pessimistic lock để prevent race
      const order = await this.orderRepository.findByIdForUpdate(
        orderId,
        workspaceId,
      );

      this.validateSaleConfirmation(order);

      const now = DateTimeUtils.now();
      const confirmedAt = DateTimeUtils.toISO(now);

      // 2. Update với optimistic lock (check version)
      const updateResult = await this.orderRepository.updateWithVersion(
        orderId,
        { salePaymentConfirmed: true },
        order.version,  // Expected version
      );

      if (!updateResult.affected) {
        throw new ConcurrencyException(orderId, 'Order was modified by another process');
      }

      // 3. Create history TRONG CÙNG transaction
      await this.orderHistoryRepository.create({
        mktOrderId: orderId,
        action: ORDER_HISTORY_ACTION.SALE_PAYMENT_CONFIRMED,
        name: 'Sale confirmed payment',
        note: note ?? 'Payment confirmed by sale - license protected from auto-lock',
        createdBy: actor,
        oldValue: 'false',
        newValue: 'true',
        fieldName: 'salePaymentConfirmed',
        metadata: { confirmedAt, version: order.version + 1, ...metadata },
      });

      return {
        success: true,
        orderId,
        confirmedAt,
        confirmedBy: actor,
        type: PaymentConfirmationType.SALE,
        version: order.version + 1,
      };
    });
  }
}
```

### Repository Method

```typescript
// mkt-order.repository.ts

/**
 * Find order with pessimistic lock (FOR UPDATE)
 */
async findByIdForUpdate(
  orderId: string,
  workspaceId: string,
): Promise<MktOrderWorkspaceEntity | null> {
  return this.getQueryBuilder(workspaceId)
    .setLock('pessimistic_write')
    .where('order.id = :orderId', { orderId })
    .getOne();
}

/**
 * Update with optimistic locking
 */
async updateWithVersion(
  orderId: string,
  data: Partial<MktOrderWorkspaceEntity>,
  expectedVersion: number,
): Promise<UpdateResult> {
  return this.repository.update(
    {
      id: orderId,
      version: expectedVersion,  // WHERE version = expectedVersion
    },
    {
      ...data,
      version: expectedVersion + 1,  // Increment version
    },
  );
}
```

---

## 5. Idempotency

### Issue
Chưa handle trường hợp client gửi request confirm trùng (network retry, double-click).

### Proposed Implementation

```typescript
// payment-confirmation.service.ts

import { IdempotencyService } from 'src/mkt-core/common/idempotency';

@Injectable()
export class PaymentConfirmationService {
  constructor(
    // ...
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async confirmBySale(
    input: ConfirmPaymentInput & { idempotencyKey?: string },
    workspaceId: string,
    actor: ActorMetadata,
  ): Promise<ConfirmationResult> {
    const { orderId, idempotencyKey } = input;

    // Generate key nếu không có
    const key = idempotencyKey ?? `sale-confirm:${orderId}:${actor.workspaceMemberId}`;

    // Check và lock idempotency
    const cached = await this.idempotencyService.checkAndLock<ConfirmationResult>(
      key,
      { ttlSeconds: 300 },  // 5 minutes
    );

    if (cached.exists) {
      this.logger.log(`Duplicate request detected for ${key}, returning cached result`);
      return cached.result;
    }

    try {
      const result = await this.doConfirmBySale(input, workspaceId, actor);

      // Store result for idempotency
      await this.idempotencyService.storeResult(key, result);

      return result;
    } catch (error) {
      // Release lock on error
      await this.idempotencyService.releaseLock(key);
      throw error;
    }
  }
}
```

### DTO Update

```typescript
// payment-confirmation.dto.ts

@InputType()
export class ConfirmPaymentInput {
  @Field()
  orderId: string;

  @Field({ nullable: true, description: 'Idempotency key to prevent duplicate processing' })
  idempotencyKey?: string;

  @Field({ nullable: true })
  note?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;
}
```

---

## 6. Revoke Flow ảnh hưởng License/Order

### Issue
Document chưa mô tả rõ khi revoke confirmation:
- License sẽ bị ảnh hưởng như thế nào?
- Order status sẽ thay đổi ra sao?
- Có trigger auto-lock không?

### Proposed Business Logic

```typescript
// payment-confirmation.service.ts - revokeConfirmation()

async revokeConfirmation(
  input: RevokeConfirmationInput,
  workspaceId: string,
  actor: ActorMetadata,
): Promise<ConfirmationResult> {
  const { orderId, type, reason } = input;

  return this.transactionScope.runInTransaction(async () => {
    const order = await this.orderRepository.findByIdForUpdate(orderId, workspaceId);

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    const now = DateTimeUtils.now();
    const revokedAt = DateTimeUtils.toISO(now);

    if (type === PaymentConfirmationType.SALE) {
      await this.revokeSaleConfirmation(order, reason, actor, revokedAt);
    } else {
      await this.revokeAccountingConfirmation(order, reason, actor, revokedAt);
    }

    // IMPORTANT: Check và schedule re-evaluation
    await this.scheduleOverdueCheck(orderId, workspaceId);

    return { success: true, orderId, confirmedAt: revokedAt, confirmedBy: actor, type };
  });
}

private async revokeSaleConfirmation(
  order: MktOrderWorkspaceEntity,
  reason: string,
  actor: ActorMetadata,
  revokedAt: string,
): Promise<void> {
  if (order.salePaymentConfirmed !== true) {
    throw new NoConfirmationToRevokeException(order.id, 'sale');
  }

  // Update order
  await this.orderRepository.updateWithVersion(order.id, {
    salePaymentConfirmed: false,
  }, order.version);

  // Create history
  await this.orderHistoryRepository.create({
    mktOrderId: order.id,
    action: ORDER_HISTORY_ACTION.SALE_CONFIRMATION_REVOKED,
    name: 'Sale confirmation revoked',
    note: reason,
    createdBy: actor,
    oldValue: 'true',
    newValue: 'false',
    fieldName: 'salePaymentConfirmed',
    metadata: {
      revokedAt,
      reason,
      // Cảnh báo về impact
      potentialImpact: this.calculateRevokeImpact(order),
    },
  });

  this.logger.warn(
    `Sale confirmation revoked for order ${order.id}. ` +
    `Order may be auto-locked if past deadline. Reason: ${reason}`,
  );
}

private async revokeAccountingConfirmation(
  order: MktOrderWorkspaceEntity,
  reason: string,
  actor: ActorMetadata,
  revokedAt: string,
): Promise<void> {
  if (order.accountingConfirmed !== true) {
    throw new NoConfirmationToRevokeException(order.id, 'accounting');
  }

  const updateData: Partial<MktOrderWorkspaceEntity> = {
    accountingConfirmed: false,
  };

  // Nếu order đã COMPLETED, revert về PROCESSING
  if (order.status === ORDER_STATUS.COMPLETED) {
    updateData.status = ORDER_STATUS.PROCESSING;

    // IMPORTANT: Cân nhắc có cần deactivate licenses không?
    // Depends on business rule
    this.logger.warn(
      `Accounting revoke will revert COMPLETED order ${order.id} to PROCESSING. ` +
      `Licenses remain ACTIVE but may be locked if payment not resolved.`,
    );
  }

  await this.orderRepository.updateWithVersion(order.id, updateData, order.version);

  await this.orderHistoryRepository.create({
    mktOrderId: order.id,
    action: ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMATION_REVOKED,
    name: 'Accounting confirmation revoked',
    note: reason,
    createdBy: actor,
    oldValue: 'true',
    newValue: 'false',
    fieldName: 'accountingConfirmed',
    metadata: {
      revokedAt,
      reason,
      statusReverted: order.status === ORDER_STATUS.COMPLETED,
      previousStatus: order.status,
    },
  });
}

/**
 * Schedule immediate re-check for overdue
 * Nếu order đã quá deadline và giờ không còn protection → sẽ bị lock
 */
private async scheduleOverdueCheck(orderId: string, workspaceId: string): Promise<void> {
  // Emit event để overdue scan job xử lý ngay
  await this.orderEventService.emit({
    type: MKT_EVENT_TYPE.CONFIRMATION_REVOKED,
    payload: { orderId, workspaceId },
  });
}

private calculateRevokeImpact(order: MktOrderWorkspaceEntity): {
  willBeLocked: boolean;
  reason: string;
} {
  const now = DateTimeUtils.now();
  const deadline = order.paymentDeadline
    ? DateTimeUtils.fromDate(order.paymentDeadline)
    : null;

  if (!deadline) {
    return { willBeLocked: false, reason: 'No payment deadline set' };
  }

  const isPastDeadline = DateTimeUtils.isBefore(deadline, now);
  const hasAccountingConfirm = order.accountingConfirmed === true;

  if (isPastDeadline && !hasAccountingConfirm) {
    return {
      willBeLocked: true,
      reason: 'Order is past payment deadline and no accounting confirmation',
    };
  }

  return { willBeLocked: false, reason: 'Order is still within deadline or has accounting confirmation' };
}
```

---

## 7. Exception Standardization

### Issue
Document sử dụng generic `Error` thay vì custom exceptions.

### Proposed Exception Classes

```typescript
// mkt-core/order/exceptions/payment-confirmation.exceptions.ts

import { HttpStatus } from '@nestjs/common';
import { MktBusinessException } from 'src/mkt-core/common/exceptions';

export class OrderNotFoundException extends MktBusinessException {
  constructor(orderId: string) {
    super({
      code: 'ORDER_NOT_FOUND',
      message: `Order ${orderId} not found`,
      httpStatus: HttpStatus.NOT_FOUND,
      metadata: { orderId },
    });
  }
}

export class OrderAlreadyConfirmedException extends MktBusinessException {
  constructor(orderId: string, confirmationType: 'sale' | 'accounting') {
    super({
      code: 'ORDER_ALREADY_CONFIRMED',
      message: `Order ${orderId} already confirmed by ${confirmationType}`,
      httpStatus: HttpStatus.CONFLICT,
      metadata: { orderId, confirmationType },
    });
  }
}

export class InvalidOrderStatusException extends MktBusinessException {
  constructor(orderId: string, currentStatus: string, validStatuses: string[]) {
    super({
      code: 'INVALID_ORDER_STATUS',
      message: `Cannot perform operation on order ${orderId} in status ${currentStatus}. Valid statuses: ${validStatuses.join(', ')}`,
      httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
      metadata: { orderId, currentStatus, validStatuses },
    });
  }
}

export class OrderAlreadyPaidException extends MktBusinessException {
  constructor(orderId: string) {
    super({
      code: 'ORDER_ALREADY_PAID',
      message: `Order ${orderId} is already fully paid. Sale confirmation not needed.`,
      httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
      metadata: { orderId },
    });
  }
}

export class NoConfirmationToRevokeException extends MktBusinessException {
  constructor(orderId: string, confirmationType: 'sale' | 'accounting') {
    super({
      code: 'NO_CONFIRMATION_TO_REVOKE',
      message: `Order ${orderId} has no ${confirmationType} confirmation to revoke`,
      httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
      metadata: { orderId, confirmationType },
    });
  }
}

export class ConcurrencyException extends MktBusinessException {
  constructor(orderId: string, detail: string) {
    super({
      code: 'CONCURRENCY_CONFLICT',
      message: `Concurrency conflict on order ${orderId}: ${detail}`,
      httpStatus: HttpStatus.CONFLICT,
      metadata: { orderId, detail },
    });
  }
}

export class InsufficientPermissionException extends MktBusinessException {
  constructor(action: string, requiredPermission: string) {
    super({
      code: 'INSUFFICIENT_PERMISSION',
      message: `Insufficient permission to ${action}. Required: ${requiredPermission}`,
      httpStatus: HttpStatus.FORBIDDEN,
      metadata: { action, requiredPermission },
    });
  }
}
```

---

## 8. DTO Enhancement (actorId/role + reason)

### Issue
Output DTOs thiếu thông tin về actor và reason.

### Proposed DTO Updates

```typescript
// payment-confirmation.dto.ts

@ObjectType()
export class ActorInfoOutput {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true, description: 'Role of the actor (sale, accounting, manager, etc.)' })
  role?: string;
}

@ObjectType()
export class ConfirmationResultOutput {
  @Field()
  success: boolean;

  @Field()
  orderId: string;

  @Field()
  confirmedAt: string;

  @Field(() => PaymentConfirmationType)
  type: PaymentConfirmationType;

  @Field(() => ActorInfoOutput, { description: 'Who performed this action' })
  actor: ActorInfoOutput;

  @Field({ nullable: true, description: 'Note or reason for the action' })
  note?: string;

  @Field(() => Int, { nullable: true, description: 'New order version after update' })
  version?: number;

  @Field(() => GraphQLJSON, { nullable: true, description: 'Additional impact info for revoke' })
  impact?: {
    willBeLocked: boolean;
    reason: string;
    statusChanged?: boolean;
    previousStatus?: string;
  };
}

@ObjectType()
export class OrderConfirmationStatusOutput {
  @Field()
  orderId: string;

  // Sale confirmation
  @Field()
  saleConfirmed: boolean;

  @Field({ nullable: true })
  saleConfirmedAt?: string;

  @Field(() => ActorInfoOutput, { nullable: true })
  saleConfirmedBy?: ActorInfoOutput;

  // Accounting confirmation
  @Field()
  accountingConfirmed: boolean;

  @Field({ nullable: true })
  accountingConfirmedAt?: string;

  @Field(() => ActorInfoOutput, { nullable: true })
  accountingConfirmedBy?: ActorInfoOutput;

  // Protection status
  @Field({ description: 'Whether order is protected from auto-lock' })
  isProtectedFromAutoLock: boolean;

  @Field({ nullable: true, description: 'Reason for protection or vulnerability' })
  protectionReason?: string;
}

@ObjectType()
export class ConfirmationDetailOutput {
  @Field()
  id: string;

  @Field()
  action: string;

  @Field()
  confirmedAt: string;

  @Field(() => ActorInfoOutput)
  actor: ActorInfoOutput;

  @Field({ nullable: true })
  note?: string;

  @Field({ nullable: true, description: 'Reason (for revoke actions)' })
  reason?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;
}
```

---

## 9. Database Index

### Issue
Document không đề cập index cho performance.

### Proposed Indexes

```sql
-- Index cho overdue scan query
-- findOverdueOrders() cần filter: status, paymentDeadline, salePaymentConfirmed, accountingConfirmed
CREATE INDEX CONCURRENTLY idx_mkt_order_overdue_scan
ON "mktOrder" (
  "status",
  "paymentDeadline",
  "salePaymentConfirmed",
  "accountingConfirmed"
)
WHERE "deletedAt" IS NULL;

-- Index cho confirmation history lookup
CREATE INDEX CONCURRENTLY idx_mkt_order_history_confirmation
ON "mktOrderHistory" (
  "mktOrderId",
  "action",
  "createdAt" DESC
)
WHERE "action" IN (
  'SALE_PAYMENT_CONFIRMED',
  'SALE_CONFIRMATION_REVOKED',
  'ACCOUNTING_CONFIRMED',
  'ACCOUNTING_CONFIRMATION_REVOKED'
);
```

### Migration File

```typescript
// migrations/YYYYMMDDHHMMSS-add-sale-payment-confirmed.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalePaymentConfirmed1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add column (nullable initially for safe migration)
    await queryRunner.query(`
      ALTER TABLE "mktOrder"
      ADD COLUMN IF NOT EXISTS "salePaymentConfirmed" BOOLEAN DEFAULT false
    `);

    // 2. Backfill: set null to false
    await queryRunner.query(`
      UPDATE "mktOrder"
      SET "salePaymentConfirmed" = false
      WHERE "salePaymentConfirmed" IS NULL
    `);

    // 3. Set NOT NULL constraint
    await queryRunner.query(`
      ALTER TABLE "mktOrder"
      ALTER COLUMN "salePaymentConfirmed" SET NOT NULL
    `);

    // 4. Add index
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mkt_order_overdue_scan
      ON "mktOrder" ("status", "paymentDeadline", "salePaymentConfirmed", "accountingConfirmed")
      WHERE "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_mkt_order_overdue_scan`);
    await queryRunner.query(`ALTER TABLE "mktOrder" DROP COLUMN IF EXISTS "salePaymentConfirmed"`);
  }
}
```

---

## 10. Test Cases

### Unit Tests

```typescript
// payment-confirmation.service.spec.ts

describe('PaymentConfirmationService', () => {
  describe('confirmBySale', () => {
    it('should confirm when order is PROCESSING and not paid', async () => { });
    it('should throw OrderNotFoundException when order not exists', async () => { });
    it('should throw OrderAlreadyConfirmedException when already confirmed', async () => { });
    it('should throw InvalidOrderStatusException when order is COMPLETED', async () => { });
    it('should throw OrderAlreadyPaidException when paymentStatus is PAID', async () => { });
    it('should handle concurrent requests with optimistic lock', async () => { });
    it('should be idempotent with same idempotencyKey', async () => { });
  });

  describe('revokeConfirmation', () => {
    it('should revoke sale confirmation and calculate impact', async () => { });
    it('should revert COMPLETED order to PROCESSING when revoking accounting', async () => { });
    it('should throw NoConfirmationToRevokeException when nothing to revoke', async () => { });
    it('should schedule overdue check after revoke', async () => { });
  });

  describe('isProtectedFromAutoLock', () => {
    it('should return true when salePaymentConfirmed is true', async () => { });
    it('should return true when accountingConfirmed is true', async () => { });
    it('should return false when both are false', async () => { });
    it('should treat null as false', async () => { });
  });
});
```

### Integration Tests

```typescript
// payment-confirmation.integration.spec.ts

describe('PaymentConfirmation Integration', () => {
  describe('Permission Tests', () => {
    it('should allow sale role to confirmBySale', async () => { });
    it('should deny sale role from confirmByAccounting', async () => { });
    it('should allow accounting role to confirmByAccounting', async () => { });
    it('should require manager role to revokeConfirmation', async () => { });
  });

  describe('Race Condition Tests', () => {
    it('should handle concurrent sale confirmations gracefully', async () => { });
    it('should handle confirm + revoke race condition', async () => { });
  });

  describe('Transaction Rollback Tests', () => {
    it('should rollback order update if history creation fails', async () => { });
    it('should not create history if order update fails', async () => { });
  });

  describe('Overdue Scan Integration', () => {
    it('should skip confirmed orders in overdue scan', async () => { });
    it('should lock order after revoke if past deadline', async () => { });
  });
});
```

### E2E Tests

```typescript
// payment-confirmation.e2e.spec.ts

describe('PaymentConfirmation E2E', () => {
  it('Full flow: Create → Sale confirm → Deadline passes → License NOT locked', async () => { });
  it('Full flow: Create → No confirm → Deadline passes → License locked', async () => { });
  it('Full flow: Sale confirm → Revoke → Deadline passes → License locked', async () => { });
  it('Full flow: Sale confirm → Accounting confirm → Order completed', async () => { });
});
```

---

## Summary Checklist

| # | Issue | Status | Priority |
|---|-------|--------|----------|
| 1 | State transition rules undefined | **NEEDS FIX** | High |
| 2 | null/false handling inconsistent | **NEEDS FIX** | High |
| 3 | Permission/guard not implemented | **NEEDS FIX** | High |
| 4 | No transaction for update+history | **NEEDS FIX** | Critical |
| 5 | No idempotency handling | **NEEDS FIX** | Medium |
| 6 | Revoke impact on license unclear | **NEEDS FIX** | High |
| 7 | Generic Error exceptions | **NEEDS FIX** | Medium |
| 8 | DTO missing actor/reason | **NEEDS FIX** | Low |
| 9 | No database index | **NEEDS FIX** | Medium |
| 10 | Permission/race tests missing | **NEEDS FIX** | High |

---

## Recommended Implementation Order

1. **Phase 1 - Critical** (Day 1-2)
   - Add exceptions
   - Add transaction wrapper
   - Add optimistic lock
   - Standardize null/false handling

2. **Phase 2 - High Priority** (Day 3-4)
   - Add permission decorators
   - Clarify state transition rules
   - Document revoke impact
   - Add unit tests

3. **Phase 3 - Medium Priority** (Day 5)
   - Add idempotency
   - Add database index
   - Enhance DTOs
   - Add integration tests

4. **Phase 4 - Polish** (Day 6)
   - E2E tests
   - Documentation update
   - Migration script
   - Code review
