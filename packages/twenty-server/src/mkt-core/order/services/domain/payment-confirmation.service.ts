/**
 * PaymentConfirmationService
 *
 * Handles sale and accounting payment confirmation for orders.
 *
 * Features:
 * - Transaction safety: All updates wrapped in transaction
 * - Optimistic locking: Detect concurrent modifications
 * - Idempotency: Handle duplicate requests gracefully
 * - Audit trail: Record all actions to OrderHistory
 *
 * Flow:
 * 1. Sale confirms → Order.salePaymentConfirmed = true + OrderHistory
 * 2. Accounting confirms → Order.accountingConfirmed = true + OrderHistory
 */

import { Injectable, Logger } from '@nestjs/common';

import { ORDER_HISTORY_ACTION } from 'src/mkt-core/order/constants';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { ORDER_PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import {
  CONFIRMATION_RULES,
  PAYMENT_CONFIRMATION_TYPE,
  IS_PROTECTED_FROM_AUTO_LOCK,
} from 'src/mkt-core/order/constants/confirmation-rules.constants';
import {
  OrderNotFoundError,
  OrderAlreadyConfirmedError,
  InvalidOrderStatusError,
  OrderAlreadyPaidError,
  NoConfirmationToRevokeError,
  CannotRevokeSaleError,
  ConcurrencyConflictError,
  MissingPaymentEvidenceError,
} from 'src/mkt-core/order/exceptions';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MktOrderHistoryRepository } from 'src/mkt-core/order/repositories/mkt-order-history.repository';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  ConfirmPaymentInput,
  ConfirmationResult,
  ConfirmationHistory,
  ConfirmationDetail,
  OrderConfirmationStatus,
  RevokeConfirmationInput,
  RevokeImpact,
  ActorInfo,
  ConfirmationActorMetadata,
} from 'src/mkt-core/order/types/payment-confirmation.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { IdempotencyService } from 'src/mkt-core/common/idempotency';
import { TransactionScopeService } from 'src/mkt-core/common/transaction';

const CONFIRMATION_ACTIONS = [
  ORDER_HISTORY_ACTION.SALE_PAYMENT_CONFIRMED,
  ORDER_HISTORY_ACTION.SALE_CONFIRMATION_REVOKED,
  ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMED,
  ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMATION_REVOKED,
];

/**
 * PaymentConfirmationService
 */
@Injectable()
export class PaymentConfirmationService {
  private readonly logger = new Logger(PaymentConfirmationService.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderHistoryRepository: MktOrderHistoryRepository,
    private readonly transactionScopeService: TransactionScopeService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Sale confirms payment
   *
   * - Updates Order.salePaymentConfirmed = true
   * - Creates OrderHistory with action SALE_PAYMENT_CONFIRMED
   * - License is "protected" from auto-lock
   *
   * @throws OrderNotFoundError - Order doesn't exist
   * @throws OrderAlreadyConfirmedError - Already confirmed
   * @throws InvalidOrderStatusError - Invalid order status
   * @throws OrderAlreadyPaidError - Order is already PAID
   * @throws ConcurrencyConflictError - Concurrent modification
   */
  async confirmBySale(
    input: ConfirmPaymentInput,
    workspaceId: string,
    actor: ConfirmationActorMetadata,
  ): Promise<ConfirmationResult> {
    const { orderId, idempotencyKey, note, metadata } = input;

    this.logger.log(`Sale confirming payment for order ${orderId}`);

    // Use idempotency protection
    const result =
      await this.idempotencyService.executeWithIdempotency<ConfirmationResult>(
        {
          workspaceId,
          domain: 'order',
          action: 'salePaymentConfirm',
          requestBody: { orderId, actor: actor.workspaceMemberId },
          options: { clientKey: idempotencyKey },
        },
        async () => {
          return this.doConfirmBySale(
            orderId,
            workspaceId,
            actor,
            note,
            metadata,
          );
        },
      );

    return result.data;
  }

  /**
   * Accounting confirms payment
   *
   * - Updates Order.accountingConfirmed = true
   * - Creates OrderHistory with action ACCOUNTING_CONFIRMED
   * - If paymentStatus = PAID, moves order to COMPLETED
   *
   * @throws OrderNotFoundError - Order doesn't exist
   * @throws OrderAlreadyConfirmedError - Already confirmed
   * @throws InvalidOrderStatusError - Invalid order status
   * @throws MissingPaymentEvidenceError - No payment evidence
   * @throws ConcurrencyConflictError - Concurrent modification
   */
  async confirmByAccounting(
    input: ConfirmPaymentInput,
    workspaceId: string,
    actor: ConfirmationActorMetadata,
  ): Promise<ConfirmationResult> {
    const { orderId, idempotencyKey, note, metadata } = input;

    this.logger.log(`Accounting confirming payment for order ${orderId}`);

    const result =
      await this.idempotencyService.executeWithIdempotency<ConfirmationResult>(
        {
          workspaceId,
          domain: 'order',
          action: 'accountingPaymentConfirm',
          requestBody: { orderId, actor: actor.workspaceMemberId },
          options: { clientKey: idempotencyKey },
        },
        async () => {
          return this.doConfirmByAccounting(
            orderId,
            workspaceId,
            actor,
            note,
            metadata,
          );
        },
      );

    return result.data;
  }

  /**
   * Revoke confirmation
   *
   * WARNING: Revoking may cause order to be locked if past deadline!
   *
   * @throws OrderNotFoundError - Order doesn't exist
   * @throws NoConfirmationToRevokeError - Nothing to revoke
   * @throws CannotRevokeSaleError - Cannot revoke sale (accounting confirmed)
   * @throws ConcurrencyConflictError - Concurrent modification
   */
  async revokeConfirmation(
    input: RevokeConfirmationInput,
    workspaceId: string,
    actor: ConfirmationActorMetadata,
  ): Promise<ConfirmationResult> {
    const { orderId, type, reason, idempotencyKey } = input;

    this.logger.log(`Revoking ${type} confirmation for order ${orderId}`);

    const result =
      await this.idempotencyService.executeWithIdempotency<ConfirmationResult>(
        {
          workspaceId,
          domain: 'order',
          action: `revoke${type}Confirmation`,
          requestBody: { orderId, type, actor: actor.workspaceMemberId },
          options: { clientKey: idempotencyKey },
        },
        async () => {
          return this.doRevokeConfirmation(
            orderId,
            type,
            reason,
            workspaceId,
            actor,
          );
        },
      );

    return result.data;
  }

  /**
   * Get current confirmation status for an order
   */
  async getConfirmationStatus(
    orderId: string,
    workspaceId: string,
  ): Promise<OrderConfirmationStatus> {
    const order = await this.orderRepository.findByIdWithOptions(
      orderId,
      undefined,
      workspaceId,
    );

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    // Get latest confirmation history for each type
    const [saleHistory, accountingHistory] = await Promise.all([
      this.orderHistoryRepository.findLatestByAction(
        orderId,
        ORDER_HISTORY_ACTION.SALE_PAYMENT_CONFIRMED,
      ),
      this.orderHistoryRepository.findLatestByAction(
        orderId,
        ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMED,
      ),
    ]);

    const isProtected = IS_PROTECTED_FROM_AUTO_LOCK({
      salePaymentConfirmed: order.salePaymentConfirmed === true,
      accountingConfirmed: order.accountingConfirmed === true,
    });

    return {
      orderId,
      saleConfirmed: order.salePaymentConfirmed === true,
      saleConfirmedAt: saleHistory?.createdAt
        ? this.formatTimestamp(saleHistory.createdAt)
        : undefined,
      saleConfirmedBy: saleHistory?.createdBy
        ? this.mapActorInfo(saleHistory.createdBy)
        : undefined,
      accountingConfirmed: order.accountingConfirmed === true,
      accountingConfirmedAt: accountingHistory?.createdAt
        ? this.formatTimestamp(accountingHistory.createdAt)
        : undefined,
      accountingConfirmedBy: accountingHistory?.createdBy
        ? this.mapActorInfo(accountingHistory.createdBy)
        : undefined,
      isProtectedFromAutoLock: isProtected,
      protectionReason: this.getProtectionReason(order),
    };
  }

  /**
   * Get confirmation history for an order
   */
  async getConfirmationHistory(
    orderId: string,
    workspaceId: string,
  ): Promise<ConfirmationHistory> {
    const order = await this.orderRepository.findByIdWithOptions(
      orderId,
      undefined,
      workspaceId,
    );

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    const histories = await this.orderHistoryRepository.findByOrderAndActions(
      orderId,
      CONFIRMATION_ACTIONS,
    );

    const confirmations: ConfirmationDetail[] = histories.map((h) => ({
      id: h.id,
      action: h.action,
      confirmedAt: this.formatTimestamp(h.createdAt),
      confirmedBy: this.mapActorInfo(h.createdBy),
      note: h.note ?? undefined,
      reason: this.extractReason(h),
      metadata: h.metadata as Record<string, unknown> | undefined,
    }));

    return {
      orderId,
      confirmations,
    };
  }

  // ============================================
  // PRIVATE METHODS - CORE LOGIC
  // ============================================

  private async doConfirmBySale(
    orderId: string,
    workspaceId: string,
    actor: ConfirmationActorMetadata,
    note?: string,
    metadata?: Record<string, unknown>,
  ): Promise<ConfirmationResult> {
    return this.transactionScopeService.runInTransaction(
      workspaceId,
      async () => {
        // 1. Fetch with pessimistic lock
        const order = await this.orderRepository.findByIdForUpdate(
          orderId,
          workspaceId,
        );

        // 2. Validate
        this.validateSaleConfirmation(order, orderId);

        const now = DateTimeUtils.now();
        const confirmedAt = DateTimeUtils.toISO(now);
        const currentVersion = order?.version ?? 0;

        // 3. Update with optimistic lock
        const updateResult =
          await this.orderRepository.updateWithOptimisticLock(
            orderId,
            currentVersion,
            { salePaymentConfirmed: true },
            workspaceId,
          );

        if (updateResult.affected === 0) {
          throw new ConcurrencyConflictError(
            orderId,
            'Order was modified by another process',
          );
        }

        const newVersion = updateResult.newVersion;

        // 4. Create history record
        await this.orderHistoryRepository.createOrderHistory({
          orderId,
          action: ORDER_HISTORY_ACTION.SALE_PAYMENT_CONFIRMED,
          name: 'Sale confirmed payment',
          note:
            note ??
            'Payment confirmed by sale - license protected from auto-lock',
          workspaceMemberId: actor.workspaceMemberId,
          metadata: {
            confirmedAt,
            version: newVersion,
            ...metadata,
          },
        });

        this.logger.log(
          `Order ${orderId} payment confirmed by sale (version: ${newVersion})`,
        );

        return {
          success: true,
          orderId,
          confirmedAt,
          confirmedBy: actor,
          type: PAYMENT_CONFIRMATION_TYPE.SALE,
          version: newVersion,
          note,
        };
      },
    );
  }

  private async doConfirmByAccounting(
    orderId: string,
    workspaceId: string,
    actor: ConfirmationActorMetadata,
    note?: string,
    metadata?: Record<string, unknown>,
  ): Promise<ConfirmationResult> {
    return this.transactionScopeService.runInTransaction(
      workspaceId,
      async () => {
        // 1. Fetch with pessimistic lock
        const order = await this.orderRepository.findByIdForUpdate(
          orderId,
          workspaceId,
        );

        // 2. Validate
        this.validateAccountingConfirmation(order, orderId);

        const now = DateTimeUtils.now();
        const confirmedAt = DateTimeUtils.toISO(now);
        const currentVersion = order?.version ?? 0;

        // 3. Determine if should auto-complete
        const shouldComplete =
          order?.paymentStatus === ORDER_PAYMENT_STATUS.PAID;

        const updateData: Partial<MktOrderWorkspaceEntity> = {
          accountingConfirmed: true,
        };

        if (shouldComplete) {
          updateData.status = ORDER_STATUS.COMPLETED;
        }

        // 4. Update with optimistic lock
        const updateResult =
          await this.orderRepository.updateWithOptimisticLock(
            orderId,
            currentVersion,
            updateData,
            workspaceId,
          );

        if (updateResult.affected === 0) {
          throw new ConcurrencyConflictError(
            orderId,
            'Order was modified by another process',
          );
        }

        const newVersion = updateResult.newVersion;

        // 5. Create history record
        await this.orderHistoryRepository.createOrderHistory({
          orderId,
          action: ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMED,
          name: 'Accounting confirmed payment',
          note: note ?? 'Payment verified by accounting department',
          workspaceMemberId: actor.workspaceMemberId,
          metadata: {
            confirmedAt,
            orderCompleted: shouldComplete,
            previousStatus: order?.status,
            version: newVersion,
            ...metadata,
          },
        });

        this.logger.log(
          `Order ${orderId} payment confirmed by accounting (version: ${newVersion})` +
            `${shouldComplete ? ' - order completed' : ''}`,
        );

        return {
          success: true,
          orderId,
          confirmedAt,
          confirmedBy: actor,
          type: PAYMENT_CONFIRMATION_TYPE.ACCOUNTING,
          version: newVersion,
          note,
        };
      },
    );
  }

  private async doRevokeConfirmation(
    orderId: string,
    type: PAYMENT_CONFIRMATION_TYPE,
    reason: string,
    workspaceId: string,
    actor: ConfirmationActorMetadata,
  ): Promise<ConfirmationResult> {
    return this.transactionScopeService.runInTransaction(
      workspaceId,
      async () => {
        // 1. Fetch with pessimistic lock
        const order = await this.orderRepository.findByIdForUpdate(
          orderId,
          workspaceId,
        );

        if (!order) {
          throw new OrderNotFoundError(orderId);
        }

        const now = DateTimeUtils.now();
        const revokedAt = DateTimeUtils.toISO(now);

        let impact: RevokeImpact;

        if (type === PAYMENT_CONFIRMATION_TYPE.SALE) {
          impact = await this.revokeSaleConfirmation(
            order,
            reason,
            actor,
            revokedAt,
            workspaceId,
          );
        } else {
          impact = await this.revokeAccountingConfirmation(
            order,
            reason,
            actor,
            revokedAt,
            workspaceId,
          );
        }

        return {
          success: true,
          orderId,
          confirmedAt: revokedAt,
          confirmedBy: actor,
          type,
          version: (order.version ?? 0) + 1,
          note: reason,
          impact,
        };
      },
    );
  }

  private async revokeSaleConfirmation(
    order: MktOrderWorkspaceEntity,
    reason: string,
    actor: ConfirmationActorMetadata,
    revokedAt: string,
    workspaceId: string,
  ): Promise<RevokeImpact> {
    if (order.salePaymentConfirmed !== true) {
      throw new NoConfirmationToRevokeError(order.id, 'sale');
    }

    if (order.accountingConfirmed === true) {
      throw new CannotRevokeSaleError(
        order.id,
        'Accounting has already confirmed. Revoke accounting confirmation first.',
      );
    }

    const impact = this.calculateRevokeImpact(order, 'sale');
    const currentVersion = order.version ?? 0;

    const updateResult = await this.orderRepository.updateWithOptimisticLock(
      order.id,
      currentVersion,
      { salePaymentConfirmed: false },
      workspaceId,
    );

    if (updateResult.affected === 0) {
      throw new ConcurrencyConflictError(
        order.id,
        'Order was modified by another process',
      );
    }

    await this.orderHistoryRepository.createOrderHistory({
      orderId: order.id,
      action: ORDER_HISTORY_ACTION.SALE_CONFIRMATION_REVOKED,
      name: 'Sale confirmation revoked',
      note: reason,
      workspaceMemberId: actor.workspaceMemberId,
      metadata: {
        revokedAt,
        reason,
        impact,
        version: updateResult.newVersion,
      },
    });

    this.logger.warn(
      `Sale confirmation revoked for order ${order.id}. ` +
        `Will be locked: ${impact.willBeLocked}. Reason: ${reason}`,
    );

    return impact;
  }

  private async revokeAccountingConfirmation(
    order: MktOrderWorkspaceEntity,
    reason: string,
    actor: ConfirmationActorMetadata,
    revokedAt: string,
    workspaceId: string,
  ): Promise<RevokeImpact> {
    if (order.accountingConfirmed !== true) {
      throw new NoConfirmationToRevokeError(order.id, 'accounting');
    }

    const updateData: Partial<MktOrderWorkspaceEntity> = {
      accountingConfirmed: false,
    };

    let statusChanged = false;
    let previousStatus: string | undefined;
    let newStatus: string | undefined;

    if (order.status === ORDER_STATUS.COMPLETED) {
      statusChanged = true;
      previousStatus = order.status;
      newStatus = ORDER_STATUS.PROCESSING;
      updateData.status = ORDER_STATUS.PROCESSING;
    }

    const impact = this.calculateRevokeImpact(order, 'accounting');

    impact.statusChanged = statusChanged;
    impact.previousStatus = previousStatus;
    impact.newStatus = newStatus;

    const currentVersion = order.version ?? 0;

    const updateResult = await this.orderRepository.updateWithOptimisticLock(
      order.id,
      currentVersion,
      updateData,
      workspaceId,
    );

    if (updateResult.affected === 0) {
      throw new ConcurrencyConflictError(
        order.id,
        'Order was modified by another process',
      );
    }

    await this.orderHistoryRepository.createOrderHistory({
      orderId: order.id,
      action: ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMATION_REVOKED,
      name: 'Accounting confirmation revoked',
      note: reason,
      workspaceMemberId: actor.workspaceMemberId,
      metadata: {
        revokedAt,
        reason,
        statusChanged,
        previousStatus,
        newStatus,
        impact,
        version: updateResult.newVersion,
      },
    });

    this.logger.warn(
      `Accounting confirmation revoked for order ${order.id}. ` +
        `Status changed: ${statusChanged}. Will be locked: ${impact.willBeLocked}. Reason: ${reason}`,
    );

    return impact;
  }

  // ============================================
  // PRIVATE METHODS - VALIDATION
  // ============================================

  private validateSaleConfirmation(
    order: MktOrderWorkspaceEntity | null,
    orderId: string,
  ): void {
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    if (order.salePaymentConfirmed === true) {
      throw new OrderAlreadyConfirmedError(orderId, 'sale');
    }

    const { validOrderStatuses, excludePaymentStatuses } =
      CONFIRMATION_RULES.saleCanConfirm;

    if (!validOrderStatuses.includes(order.status as ORDER_STATUS)) {
      throw new InvalidOrderStatusError(
        orderId,
        order.status,
        validOrderStatuses,
      );
    }

    if (
      excludePaymentStatuses.includes(
        order.paymentStatus as ORDER_PAYMENT_STATUS,
      )
    ) {
      throw new OrderAlreadyPaidError(orderId);
    }
  }

  private validateAccountingConfirmation(
    order: MktOrderWorkspaceEntity | null,
    orderId: string,
  ): void {
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    if (order.accountingConfirmed === true) {
      throw new OrderAlreadyConfirmedError(orderId, 'accounting');
    }

    const { validOrderStatuses } = CONFIRMATION_RULES.accountingCanConfirm;

    if (!validOrderStatuses.includes(order.status as ORDER_STATUS)) {
      throw new InvalidOrderStatusError(
        orderId,
        order.status,
        validOrderStatuses,
      );
    }

    // Accounting needs payment evidence
    const hasPaymentEvidence =
      order.paymentStatus === ORDER_PAYMENT_STATUS.PAID ||
      order.salePaymentConfirmed === true;

    if (!hasPaymentEvidence) {
      throw new MissingPaymentEvidenceError(orderId);
    }
  }

  // ============================================
  // PRIVATE METHODS - HELPERS
  // ============================================

  private calculateRevokeImpact(
    order: MktOrderWorkspaceEntity,
    revokeType: 'sale' | 'accounting',
  ): RevokeImpact {
    const now = DateTimeUtils.now();
    const deadline = order.paymentDeadline
      ? DateTimeUtils.fromDate(order.paymentDeadline)
      : null;

    if (!deadline) {
      return {
        willBeLocked: false,
        reason: 'No payment deadline set',
      };
    }

    const isPastDeadline = DateTimeUtils.isBefore(deadline, now);

    // After revoke, check if still protected
    const stillProtected =
      revokeType === 'sale'
        ? order.accountingConfirmed === true
        : order.salePaymentConfirmed === true;

    if (isPastDeadline && !stillProtected) {
      return {
        willBeLocked: true,
        reason:
          'Order is past payment deadline and will lose protection after revoke',
      };
    }

    if (isPastDeadline && stillProtected) {
      return {
        willBeLocked: false,
        reason: `Order is past deadline but still protected by ${revokeType === 'sale' ? 'accounting' : 'sale'} confirmation`,
      };
    }

    return {
      willBeLocked: false,
      reason: 'Order is still within payment deadline',
    };
  }

  private getProtectionReason(order: MktOrderWorkspaceEntity): string {
    if (order.accountingConfirmed === true) {
      return 'Protected by accounting confirmation';
    }

    if (order.salePaymentConfirmed === true) {
      return 'Protected by sale confirmation';
    }

    return 'Not protected - may be auto-locked if past deadline';
  }

  private formatTimestamp(timestamp: Date | string | number): string {
    if (typeof timestamp === 'string') {
      return timestamp;
    }

    if (typeof timestamp === 'number') {
      return DateTimeUtils.toISO(DateTimeUtils.fromMillis(timestamp));
    }

    return DateTimeUtils.toISO(DateTimeUtils.fromDate(timestamp));
  }

  private mapActorInfo(actor: unknown): ActorInfo {
    if (!actor || typeof actor !== 'object') {
      return {
        id: 'unknown',
        name: 'Unknown',
      };
    }

    const actorObj = actor as Record<string, unknown>;

    return {
      id: (actorObj.workspaceMemberId as string) ?? 'system',
      name: (actorObj.name as string) ?? 'Unknown',
      email: undefined,
      role: undefined,
    };
  }

  private extractReason(history: {
    note?: string | null;
    metadata?: unknown;
  }): string | undefined {
    if (history.note) {
      return history.note;
    }

    const metadata = history.metadata as Record<string, unknown> | undefined;

    if (metadata?.reason && typeof metadata.reason === 'string') {
      return metadata.reason;
    }

    return undefined;
  }
}
