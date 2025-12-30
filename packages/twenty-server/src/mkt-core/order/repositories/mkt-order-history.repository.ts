import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { FieldActorSource } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ORDER_HISTORY_ACTION } from 'src/mkt-core/order/constants';
import { MktOrderHistoryWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-history.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { CreateOrderHistoryData } from 'src/mkt-core/order/types';

const LOG_CONTEXT = 'MktOrderHistory:Repository';

/**
 * MktOrderHistoryRepository - Data access layer for Order History entity
 *
 * Responsibilities:
 * - Database operations for MktOrderHistoryWorkspaceEntity
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktOrderHistoryRepository {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get repository for specific workspace
   */
  async getRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktOrderHistoryWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktOrderHistoryWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find history by ID
   */
  async findById(
    workspaceId: string,
    historyId: string,
  ): Promise<MktOrderHistoryWorkspaceEntity | null> {
    this.logger.debug(`Finding order history by ID: ${historyId}`);

    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id: historyId },
    });
  }

  /**
   * Find all history records for an order
   */
  async findByOrderId(
    workspaceId: string,
    orderId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<MktOrderHistoryWorkspaceEntity[]> {
    this.logger.debug(`Finding order history for order: ${orderId}`);

    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    orderId: string,
    action: ORDER_HISTORY_ACTION,
  ): Promise<MktOrderHistoryWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { mktOrderId: orderId, action },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get latest history entry for an order
   */
  async findLatestByOrderId(
    workspaceId: string,
    orderId: string,
  ): Promise<MktOrderHistoryWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { mktOrderId: orderId },
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new order history record
   */
  async create(
    workspaceId: string,
    data: CreateOrderHistoryData,
    queryRunner?: QueryRunner,
  ): Promise<MktOrderHistoryWorkspaceEntity> {
    this.logger.log(
      `Creating order history: ${data.action} for order ${data.orderId}`,
    );

    const repository = await this.getRepository(workspaceId);

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

    if (queryRunner) {
      return queryRunner.manager.save(history);
    }

    return repository.save(history);
  }

  /**
   * Create status change history
   */
  async createStatusChange(
    workspaceId: string,
    orderId: string,
    oldStatus: string,
    newStatus: string,
    note?: string,
    workspaceMemberId?: string,
    queryRunner?: QueryRunner,
  ): Promise<MktOrderHistoryWorkspaceEntity> {
    return this.create(
      workspaceId,
      {
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
      },
      queryRunner,
    );
  }

  /**
   * Create order creation history
   */
  async createOrderCreated(
    workspaceId: string,
    orderId: string,
    orderCode: string,
    workspaceMemberId?: string,
    queryRunner?: QueryRunner,
  ): Promise<MktOrderHistoryWorkspaceEntity> {
    return this.create(
      workspaceId,
      {
        orderId,
        action: ORDER_HISTORY_ACTION.CREATED,
        name: `Order ${orderCode} created`,
        workspaceMemberId,
        metadata: {
          orderCode,
          createdAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        },
      },
      queryRunner,
    );
  }

  /**
   * Create payment added history
   */
  async createPaymentAdded(
    workspaceId: string,
    orderId: string,
    amount: number,
    paymentMethod?: string,
    queryRunner?: QueryRunner,
  ): Promise<MktOrderHistoryWorkspaceEntity> {
    return this.create(
      workspaceId,
      {
        orderId,
        action: ORDER_HISTORY_ACTION.PAYMENT_ADDED,
        name: `Payment added: ${amount}`,
        metadata: {
          amount,
          paymentMethod,
          addedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        },
      },
      queryRunner,
    );
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count history records for an order
   */
  async countByOrderId(workspaceId: string, orderId: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { mktOrderId: orderId },
    });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete all history for an order by setting deletedAt timestamp
   */
  async softDeleteByOrderId(
    workspaceId: string,
    orderId: string,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(`Soft deleting all history for order: ${orderId}`);

    const repository = await this.getRepository(workspaceId);

    await repository.update(
      { mktOrderId: orderId },
      { deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()) },
    );
  }
}
