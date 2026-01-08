import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {
  MKT_WEBHOOK_LOG_CONTEXT,
  MKT_WEBHOOK_LOG_LOG_MESSAGES,
} from 'src/mkt-core/payment/messages';
import {
  MktWebhookLogWorkspaceEntity,
  WebhookLogStatus,
} from 'src/mkt-core/payment/objects/mkt-webhook-log.workspace-entity';
import {
  CreateWebhookLogData,
  FindWebhookLogOptions,
  UpdateWebhookLogData,
} from 'src/mkt-core/payment/types/repository.types';

/**
 * MktWebhookLogRepository - Data access layer for WebhookLog entity
 *
 * Responsibilities:
 * - Database operations for MktWebhookLog entity
 * - Query building and execution
 * - Transaction support via QueryRunner
 *
 * Use cases:
 * - Audit trail for webhook processing
 * - Idempotency check by transaction ID
 * - Debugging and monitoring
 */
@Injectable()
export class MktWebhookLogRepository {
  private readonly logger = new Logger(`${MKT_WEBHOOK_LOG_CONTEXT}:Repository`);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find webhook log by ID
   */
  async findById(
    workspaceId: string,
    logId: string,
    options?: FindWebhookLogOptions,
  ): Promise<MktWebhookLogWorkspaceEntity | null> {
    this.logger.debug(MKT_WEBHOOK_LOG_LOG_MESSAGES.FIND_BY_ID_START(logId));

    const repository = await this.getRepository(workspaceId);

    const log = await repository.findOne({
      where: { id: logId },
      relations: options?.relations,
    });

    if (!log) {
      this.logger.debug(
        MKT_WEBHOOK_LOG_LOG_MESSAGES.FIND_BY_ID_NOT_FOUND(logId),
      );

      return null;
    }

    this.logger.debug(MKT_WEBHOOK_LOG_LOG_MESSAGES.FIND_BY_ID_SUCCESS(logId));

    return log;
  }

  /**
   * Find webhook log by SePay transaction ID
   */
  async findBySepayTransactionId(
    workspaceId: string,
    transactionId: number,
    options?: FindWebhookLogOptions,
  ): Promise<MktWebhookLogWorkspaceEntity | null> {
    this.logger.debug(
      MKT_WEBHOOK_LOG_LOG_MESSAGES.FIND_BY_TRANSACTION_ID_START(transactionId),
    );

    const repository = await this.getRepository(workspaceId);

    const log = await repository.findOne({
      where: { sepayTransactionId: transactionId },
      relations: options?.relations,
    });

    if (!log) {
      this.logger.debug(
        MKT_WEBHOOK_LOG_LOG_MESSAGES.FIND_BY_TRANSACTION_ID_NOT_FOUND(
          transactionId,
        ),
      );

      return null;
    }

    this.logger.debug(
      MKT_WEBHOOK_LOG_LOG_MESSAGES.FIND_BY_TRANSACTION_ID_SUCCESS(
        transactionId,
      ),
    );

    return log;
  }

  /**
   * Find webhook logs by matched order code
   */
  async findByOrderCode(
    workspaceId: string,
    orderCode: string,
    options?: FindWebhookLogOptions,
  ): Promise<MktWebhookLogWorkspaceEntity[]> {
    this.logger.debug(
      MKT_WEBHOOK_LOG_LOG_MESSAGES.FIND_BY_ORDER_CODE_START(orderCode),
    );

    const repository = await this.getRepository(workspaceId);

    const logs = await repository.find({
      where: { matchedOrderCode: orderCode },
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });

    this.logger.debug(
      MKT_WEBHOOK_LOG_LOG_MESSAGES.FIND_BY_ORDER_CODE_SUCCESS(
        orderCode,
        logs.length,
      ),
    );

    return logs;
  }

  /**
   * Find webhook logs by status
   */
  async findByStatus(
    workspaceId: string,
    status: WebhookLogStatus,
    options?: FindWebhookLogOptions,
  ): Promise<MktWebhookLogWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { status },
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find webhook logs by gateway
   */
  async findByGateway(
    workspaceId: string,
    gateway: string,
    options?: FindWebhookLogOptions,
  ): Promise<MktWebhookLogWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { gateway },
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check if webhook log exists by transaction ID
   */
  async existsByTransactionId(
    workspaceId: string,
    transactionId: number,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: { sepayTransactionId: transactionId },
    });

    return count > 0;
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new webhook log
   * Supports QueryRunner for transaction context
   */
  async create(
    workspaceId: string,
    data: CreateWebhookLogData,
    queryRunner?: QueryRunner,
  ): Promise<MktWebhookLogWorkspaceEntity> {
    this.logger.debug(
      MKT_WEBHOOK_LOG_LOG_MESSAGES.CREATE_START(data.sepayTransactionId),
    );

    const repository = await this.getRepository(workspaceId);

    const log = repository.create({
      ...data,
      status: data.status ?? 'RECEIVED',
    });

    // Use queryRunner for transaction context if provided
    const savedLog = queryRunner
      ? await queryRunner.manager.save(log)
      : await repository.save(log);

    this.logger.debug(MKT_WEBHOOK_LOG_LOG_MESSAGES.CREATE_SUCCESS(savedLog.id));

    return savedLog;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update webhook log by ID
   */
  async update(
    workspaceId: string,
    logId: string,
    data: UpdateWebhookLogData,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.debug(
      MKT_WEBHOOK_LOG_LOG_MESSAGES.UPDATE_STATUS_START(
        logId,
        data.status ?? 'unknown',
      ),
    );

    const repository = await this.getRepository(workspaceId);

    await repository.update(logId, data);

    this.logger.debug(
      MKT_WEBHOOK_LOG_LOG_MESSAGES.UPDATE_STATUS_SUCCESS(
        logId,
        data.status ?? 'updated',
      ),
    );
  }

  /**
   * Update webhook log status
   */
  async updateStatus(
    workspaceId: string,
    logId: string,
    status: WebhookLogStatus,
    additionalData?: Omit<UpdateWebhookLogData, 'status'>,
  ): Promise<void> {
    await this.update(workspaceId, logId, { status, ...additionalData });
  }

  /**
   * Mark webhook log as success
   */
  async markAsSuccess(
    workspaceId: string,
    logId: string,
    data: {
      responseStatus: number;
      responseBody?: object;
      processingTimeMs?: number;
      matchedOrderCode?: string;
    },
  ): Promise<void> {
    await this.update(workspaceId, logId, {
      status: 'SUCCESS',
      ...data,
    });
  }

  /**
   * Mark webhook log as failed
   */
  async markAsFailed(
    workspaceId: string,
    logId: string,
    data: {
      responseStatus: number;
      responseBody?: object;
      processingTimeMs?: number;
      errorMessage: string;
    },
  ): Promise<void> {
    await this.update(workspaceId, logId, {
      status: 'FAILED',
      ...data,
    });
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get webhook statistics by gateway
   */
  async getStatsByGateway(
    workspaceId: string,
    gateway: string,
  ): Promise<{
    totalCount: number;
    successCount: number;
    failedCount: number;
    avgProcessingTimeMs: number;
  }> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('log')
      .select('COUNT(log.id)', 'totalCount')
      .addSelect(
        "COUNT(CASE WHEN log.status = 'SUCCESS' THEN 1 END)",
        'successCount',
      )
      .addSelect(
        "COUNT(CASE WHEN log.status = 'FAILED' THEN 1 END)",
        'failedCount',
      )
      .addSelect('AVG(log.processingTimeMs)', 'avgProcessingTimeMs')
      .where('log.gateway = :gateway', { gateway })
      .getRawOne();

    return {
      totalCount: parseInt(result?.totalCount, 10) || 0,
      successCount: parseInt(result?.successCount, 10) || 0,
      failedCount: parseInt(result?.failedCount, 10) || 0,
      avgProcessingTimeMs: parseFloat(result?.avgProcessingTimeMs) || 0,
    };
  }

  /**
   * Get recent webhook logs for monitoring
   */
  async getRecentLogs(
    workspaceId: string,
    limit = 50,
  ): Promise<MktWebhookLogWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get the underlying TypeORM repository
   */
  async getRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktWebhookLogWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktWebhookLogWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }
}
