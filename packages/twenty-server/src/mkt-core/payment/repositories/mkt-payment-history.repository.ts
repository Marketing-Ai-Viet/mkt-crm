import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { PAYMENT_HISTORY_TYPE } from 'src/mkt-core/payment/types/payment.type';
import { MktPaymentHistoryWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment-history.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

const MKT_PAYMENT_HISTORY_LOG_CONTEXT = 'MktPaymentHistory';

const MKT_PAYMENT_HISTORY_LOG_MESSAGES = {
  FIND_BY_ID_START: (id: string) => `Finding payment history by ID: ${id}`,
  FIND_BY_ID_NOT_FOUND: (id: string) => `Payment history not found: ${id}`,
  FIND_BY_ID_SUCCESS: (id: string) => `Found payment history: ${id}`,
  FIND_BY_ORDER_START: (orderId: string) =>
    `Finding payment histories for order: ${orderId}`,
  FIND_BY_ORDER_SUCCESS: (orderId: string, count: number) =>
    `Found ${count} payment histories for order: ${orderId}`,
  FIND_BY_PAYMENT_START: (paymentId: string) =>
    `Finding payment histories for payment: ${paymentId}`,
  FIND_BY_PAYMENT_SUCCESS: (paymentId: string, count: number) =>
    `Found ${count} payment histories for payment: ${paymentId}`,
  CREATE_START: () => `Creating payment history`,
  CREATE_SUCCESS: (id: string) => `Created payment history: ${id}`,
  UPDATE_START: (id: string) => `Updating payment history: ${id}`,
  UPDATE_SUCCESS: (id: string) => `Updated payment history: ${id}`,
  DELETE_START: (id: string) => `Deleting payment history: ${id}`,
  DELETE_SUCCESS: (id: string) => `Deleted payment history: ${id}`,
};

type CreatePaymentHistoryData = {
  name: string;
  paymentType: PAYMENT_HISTORY_TYPE;
  amount?: number;
  note?: string;
  mktOrderId?: string | null;
  mktPaymentId?: string | null;
  accountOwnerId?: string | null;
  position?: number;
};

type UpdatePaymentHistoryData = Partial<
  Pick<
    MktPaymentHistoryWorkspaceEntity,
    'name' | 'paymentType' | 'amount' | 'note' | 'accountOwnerId'
  >
>;

type FindPaymentHistoryOptions = {
  relations?: string[];
};

/**
 * MktPaymentHistoryRepository - Data access layer for PaymentHistory entity
 *
 * Responsibilities:
 * - Database operations for MktPaymentHistory entity
 * - Query building and execution
 * - Transaction support via QueryRunner
 *
 * Use cases:
 * - Tracking payment history entries
 * - Auditing payment changes
 * - Reporting payment activities
 */
@Injectable()
export class MktPaymentHistoryRepository {
  private readonly logger = new Logger(
    `${MKT_PAYMENT_HISTORY_LOG_CONTEXT}:Repository`,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find payment history by ID
   */
  async findById(
    workspaceId: string,
    historyId: string,
    options?: FindPaymentHistoryOptions,
  ): Promise<MktPaymentHistoryWorkspaceEntity | null> {
    this.logger.debug(
      MKT_PAYMENT_HISTORY_LOG_MESSAGES.FIND_BY_ID_START(historyId),
    );

    const repository = await this.getRepository(workspaceId);

    const history = await repository.findOne({
      where: { id: historyId },
      relations: options?.relations,
    });

    if (!history) {
      this.logger.debug(
        MKT_PAYMENT_HISTORY_LOG_MESSAGES.FIND_BY_ID_NOT_FOUND(historyId),
      );

      return null;
    }

    this.logger.debug(
      MKT_PAYMENT_HISTORY_LOG_MESSAGES.FIND_BY_ID_SUCCESS(historyId),
    );

    return history;
  }

  /**
   * Find payment histories by order ID
   */
  async findByOrderId(
    workspaceId: string,
    orderId: string,
    options?: FindPaymentHistoryOptions,
  ): Promise<MktPaymentHistoryWorkspaceEntity[]> {
    this.logger.debug(
      MKT_PAYMENT_HISTORY_LOG_MESSAGES.FIND_BY_ORDER_START(orderId),
    );

    const repository = await this.getRepository(workspaceId);

    const histories = await repository.find({
      where: { mktOrderId: orderId },
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });

    this.logger.debug(
      MKT_PAYMENT_HISTORY_LOG_MESSAGES.FIND_BY_ORDER_SUCCESS(
        orderId,
        histories.length,
      ),
    );

    return histories;
  }

  /**
   * Find payment histories by payment ID
   */
  async findByPaymentId(
    workspaceId: string,
    paymentId: string,
    options?: FindPaymentHistoryOptions,
  ): Promise<MktPaymentHistoryWorkspaceEntity[]> {
    this.logger.debug(
      MKT_PAYMENT_HISTORY_LOG_MESSAGES.FIND_BY_PAYMENT_START(paymentId),
    );

    const repository = await this.getRepository(workspaceId);

    const histories = await repository.find({
      where: { mktPaymentId: paymentId },
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });

    this.logger.debug(
      MKT_PAYMENT_HISTORY_LOG_MESSAGES.FIND_BY_PAYMENT_SUCCESS(
        paymentId,
        histories.length,
      ),
    );

    return histories;
  }

  /**
   * Find payment histories by type
   */
  async findByType(
    workspaceId: string,
    paymentType: PAYMENT_HISTORY_TYPE,
    options?: FindPaymentHistoryOptions,
  ): Promise<MktPaymentHistoryWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { paymentType },
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new payment history
   * Supports QueryRunner for transaction context
   */
  async create(
    workspaceId: string,
    data: CreatePaymentHistoryData,
    queryRunner?: QueryRunner,
  ): Promise<MktPaymentHistoryWorkspaceEntity> {
    this.logger.debug(MKT_PAYMENT_HISTORY_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository(workspaceId);

    const history = repository.create({
      name: data.name,
      paymentType: data.paymentType,
      amount: data.amount ?? 0,
      note: data.note ?? '',
      mktOrderId: data.mktOrderId ?? null,
      mktPaymentId: data.mktPaymentId ?? null,
      accountOwnerId: data.accountOwnerId ?? null,
      position: data.position,
    });

    // Use queryRunner for transaction context if provided
    const savedHistory = queryRunner
      ? await queryRunner.manager.save(history)
      : await repository.save(history);

    this.logger.debug(
      MKT_PAYMENT_HISTORY_LOG_MESSAGES.CREATE_SUCCESS(savedHistory.id),
    );

    return savedHistory;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update payment history by ID
   */
  async update(
    workspaceId: string,
    historyId: string,
    data: UpdatePaymentHistoryData,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.debug(MKT_PAYMENT_HISTORY_LOG_MESSAGES.UPDATE_START(historyId));

    const repository = await this.getRepository(workspaceId);

    await repository.update(historyId, data);

    this.logger.debug(
      MKT_PAYMENT_HISTORY_LOG_MESSAGES.UPDATE_SUCCESS(historyId),
    );
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete payment history by setting deletedAt timestamp
   */
  async softDelete(
    workspaceId: string,
    historyId: string,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(MKT_PAYMENT_HISTORY_LOG_MESSAGES.DELETE_START(historyId));

    const repository = await this.getRepository(workspaceId);

    await repository.update(historyId, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    });

    this.logger.warn(
      MKT_PAYMENT_HISTORY_LOG_MESSAGES.DELETE_SUCCESS(historyId),
    );
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get payment history statistics by order
   */
  async getStatsByOrder(
    workspaceId: string,
    orderId: string,
  ): Promise<{
    totalCount: number;
    totalAmount: number;
    paymentTypes: { type: PAYMENT_HISTORY_TYPE; count: number }[];
  }> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('history')
      .select('COUNT(history.id)', 'totalCount')
      .addSelect('COALESCE(SUM(history.amount), 0)', 'totalAmount')
      .where('history.mktOrderId = :orderId', { orderId })
      .getRawOne();

    const typeStats = await repository
      .createQueryBuilder('history')
      .select('history.paymentType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('history.mktOrderId = :orderId', { orderId })
      .groupBy('history.paymentType')
      .getRawMany();

    return {
      totalCount: parseInt(result?.totalCount, 10) || 0,
      totalAmount: parseFloat(result?.totalAmount) || 0,
      paymentTypes: typeStats.map((s) => ({
        type: s.type as PAYMENT_HISTORY_TYPE,
        count: parseInt(s.count, 10) || 0,
      })),
    };
  }

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get the underlying TypeORM repository
   */
  async getRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktPaymentHistoryWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktPaymentHistoryWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }
}
