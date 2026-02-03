import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { FieldActorSource } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { ORDER_HISTORY_ACTION } from 'src/mkt-core/order/constants';
import { MktOrderHistoryWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-history.workspace-entity';
import { CreateOrderHistoryData } from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

const LOG_CONTEXT = 'MktOrderHistory';

/**
 * MktOrderHistoryRepository - Data access layer for Order History entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktOrderHistoryWorkspaceEntity
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktOrderHistoryRepository extends BaseWorkspaceRepository<MktOrderHistoryWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktOrderHistoryWorkspaceEntity,
      `${LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find history by ID with logging
   */
  async findHistoryById(
    historyId: string,
  ): Promise<MktOrderHistoryWorkspaceEntity | null> {
    this.logger.debug(`Finding order history by ID: ${historyId}`);

    const history = await this.findById(historyId);

    if (history) {
      this.logger.debug(`Found order history: ${historyId}`);
    }

    return history;
  }

  /**
   * Find all history records for an order
   */
  async findByOrderId(
    orderId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<MktOrderHistoryWorkspaceEntity[]> {
    this.logger.debug(`Finding order history for order: ${orderId}`);

    const repository = await this.getRepository();

    return repository.find({
      where: { mktOrderId: orderId },
      order: { createdAt: 'DESC' },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  /**
   * Find history by action type for an order
   */
  async findByOrderIdAndAction(
    orderId: string,
    action: ORDER_HISTORY_ACTION,
  ): Promise<MktOrderHistoryWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { mktOrderId: orderId, action },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get latest history entry for an order
   */
  async findLatestByOrderId(
    orderId: string,
  ): Promise<MktOrderHistoryWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { mktOrderId: orderId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find the latest history record for a specific action
   * Used by PaymentConfirmationService to get confirmation details
   *
   * @param orderId - Order ID
   * @param action - Specific action to find
   */
  async findLatestByAction(
    orderId: string,
    action: ORDER_HISTORY_ACTION,
  ): Promise<MktOrderHistoryWorkspaceEntity | null> {
    this.logger.debug(`Finding latest ${action} history for order: ${orderId}`);

    const repository = await this.getRepository();

    return repository.findOne({
      where: {
        mktOrderId: orderId,
        action,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find all history records for an order with specific actions
   * Used by PaymentConfirmationService to get confirmation history
   *
   * @param orderId - Order ID
   * @param actions - Array of actions to filter by
   */
  async findByOrderAndActions(
    orderId: string,
    actions: ORDER_HISTORY_ACTION[],
  ): Promise<MktOrderHistoryWorkspaceEntity[]> {
    this.logger.debug(
      `Finding history for order ${orderId} with actions: ${actions.join(', ')}`,
    );

    const repository = await this.getRepository();

    return repository.find({
      where: {
        mktOrderId: orderId,
        action: In(actions),
      },
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new order history record
   */
  async createOrderHistory(
    data: CreateOrderHistoryData,
  ): Promise<MktOrderHistoryWorkspaceEntity> {
    this.logger.log(
      `Creating order history: ${data.action} for order ${data.orderId}`,
    );

    const repository = await this.getRepository();

    const history = repository.create({
      name: data.name,
      mktOrderId: data.orderId,
      action: data.action,
      note: data.note,
      fieldName: data.fieldName,
      oldValue: data.oldValue,
      newValue: data.newValue,
      metadata: data.metadata as never,
      createdBy: {
        source: data.workspaceMemberId
          ? FieldActorSource.MANUAL
          : FieldActorSource.SYSTEM,
        workspaceMemberId: data.workspaceMemberId,
        name: 'System',
        context: {},
      },
    });

    return repository.save(history);
  }

  /**
   * Create status change history
   */
  async createStatusChange(
    orderId: string,
    oldStatus: string,
    newStatus: string,
    note?: string,
    workspaceMemberId?: string,
  ): Promise<MktOrderHistoryWorkspaceEntity> {
    return this.createOrderHistory({
      orderId,
      action: ORDER_HISTORY_ACTION.STATUS_CHANGED,
      name: `Status changed from ${oldStatus} to ${newStatus}`,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      note,
      workspaceMemberId,
      metadata: {
        changedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      },
    });
  }

  /**
   * Create order creation history
   */
  async createOrderCreated(
    orderId: string,
    orderCode: string,
    workspaceMemberId?: string,
  ): Promise<MktOrderHistoryWorkspaceEntity> {
    return this.createOrderHistory({
      orderId,
      action: ORDER_HISTORY_ACTION.CREATED,
      name: `Order ${orderCode} created`,
      workspaceMemberId,
      metadata: {
        orderCode,
        createdAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      },
    });
  }

  /**
   * Create payment added history
   */
  async createPaymentAdded(
    orderId: string,
    amount: number,
    paymentMethod?: string,
  ): Promise<MktOrderHistoryWorkspaceEntity> {
    return this.createOrderHistory({
      orderId,
      action: ORDER_HISTORY_ACTION.PAYMENT_ADDED,
      name: `Payment added: ${amount}`,
      metadata: {
        amount,
        paymentMethod,
        addedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      },
    });
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count history records for an order
   */
  async countByOrderId(orderId: string): Promise<number> {
    return this.count({ mktOrderId: orderId });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete all history for an order by setting deletedAt timestamp
   */
  async softDeleteByOrderId(orderId: string): Promise<void> {
    this.logger.warn(`Soft deleting all history for order: ${orderId}`);

    await this.softDeleteWhere({ mktOrderId: orderId });
  }
}
