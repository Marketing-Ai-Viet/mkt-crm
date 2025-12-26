import { Injectable, Logger } from '@nestjs/common';

import { FindOptionsWhere, QueryRunner } from 'typeorm';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {
  MKT_PAYMENT_LOG_CONTEXT,
  MKT_PAYMENT_LOG_MESSAGES,
} from 'src/mkt-core/payment/messages';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import {
  CreatePaymentData,
  DEFAULT_PAYMENT_RELATIONS,
  FindPaymentOptions,
  UpdatePaymentData,
} from 'src/mkt-core/payment/types/repository.types';
import { PaymentStatus } from 'src/mkt-core/payment/types';

/**
 * MktPaymentRepository - Data access layer for Payment entity
 *
 * Responsibilities:
 * - Database operations for MktPayment entity
 * - Query building and execution
 * - Transaction support via QueryRunner
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Validation (handled by Service layer)
 */
@Injectable()
export class MktPaymentRepository {
  private readonly logger = new Logger(`${MKT_PAYMENT_LOG_CONTEXT}:Repository`);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find payment by ID
   */
  async findById(
    workspaceId: string,
    paymentId: string,
    options?: FindPaymentOptions,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.FIND_BY_ID_START(paymentId));

    const repository = await this.getRepository(workspaceId);

    const payment = await repository.findOne({
      where: { id: paymentId },
      relations: options?.relations,
    });

    if (!payment) {
      this.logger.debug(
        MKT_PAYMENT_LOG_MESSAGES.FIND_BY_ID_NOT_FOUND(paymentId),
      );

      return null;
    }

    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.FIND_BY_ID_SUCCESS(paymentId));

    return payment;
  }

  /**
   * Find payment by ID with default relations
   */
  async findByIdWithRelations(
    workspaceId: string,
    paymentId: string,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    return this.findById(workspaceId, paymentId, {
      relations: [...DEFAULT_PAYMENT_RELATIONS],
    });
  }

  /**
   * Find payments by order ID
   */
  async findByOrderId(
    workspaceId: string,
    orderId: string,
    options?: FindPaymentOptions,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.FIND_BY_ORDER_START(orderId));

    const repository = await this.getRepository(workspaceId);

    const payments = await repository.find({
      where: { mktOrderId: orderId },
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });

    this.logger.debug(
      MKT_PAYMENT_LOG_MESSAGES.FIND_BY_ORDER_SUCCESS(orderId, payments.length),
    );

    return payments;
  }

  /**
   * Find payment by SePay transaction ID
   */
  async findBySepayTransactionId(
    workspaceId: string,
    transactionId: string,
    options?: FindPaymentOptions,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    this.logger.debug(
      MKT_PAYMENT_LOG_MESSAGES.FIND_BY_TRANSACTION_ID_START(transactionId),
    );

    const repository = await this.getRepository(workspaceId);

    const payment = await repository.findOne({
      where: { sepayTransactionId: transactionId },
      relations: options?.relations,
    });

    if (!payment) {
      this.logger.debug(
        MKT_PAYMENT_LOG_MESSAGES.FIND_BY_TRANSACTION_ID_NOT_FOUND(
          transactionId,
        ),
      );

      return null;
    }

    this.logger.debug(
      MKT_PAYMENT_LOG_MESSAGES.FIND_BY_TRANSACTION_ID_SUCCESS(transactionId),
    );

    return payment;
  }

  /**
   * Find payments by status
   */
  async findByStatus(
    workspaceId: string,
    status: PaymentStatus,
    options?: FindPaymentOptions,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { status },
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find payments with custom where clause
   */
  async findMany(
    workspaceId: string,
    where: FindOptionsWhere<MktPaymentWorkspaceEntity>,
    options?: FindPaymentOptions,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where,
      relations: options?.relations,
    });
  }

  /**
   * Check if payment exists
   */
  async exists(workspaceId: string, paymentId: string): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: { id: paymentId },
    });

    return count > 0;
  }

  /**
   * Check if payment exists by transaction ID
   */
  async existsByTransactionId(
    workspaceId: string,
    transactionId: string,
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
   * Create new payment
   */
  async create(
    workspaceId: string,
    data: CreatePaymentData,
    _queryRunner?: QueryRunner,
  ): Promise<MktPaymentWorkspaceEntity> {
    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository(workspaceId);

    const payment = repository.create({
      ...data,
      currency: data.currency ?? 'VND',
      status: data.status ?? 'PENDING',
    });

    const savedPayment = await repository.save(payment);

    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.CREATE_SUCCESS(savedPayment.id));

    return savedPayment;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update payment by ID
   * Supports QueryRunner for transaction context
   */
  async update(
    workspaceId: string,
    paymentId: string,
    data: UpdatePaymentData,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.UPDATE_START(paymentId));

    // Use queryRunner for transaction context if provided
    if (queryRunner) {
      await queryRunner.manager.update(
        MktPaymentWorkspaceEntity,
        { id: paymentId },
        data,
      );
    } else {
      const repository = await this.getRepository(workspaceId);

      await repository.update(paymentId, data);
    }

    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.UPDATE_SUCCESS(paymentId));
  }

  /**
   * Update payment status
   */
  async updateStatus(
    workspaceId: string,
    paymentId: string,
    status: PaymentStatus,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.debug(
      MKT_PAYMENT_LOG_MESSAGES.STATUS_UPDATE_START(paymentId, status),
    );

    await this.update(workspaceId, paymentId, { status }, queryRunner);

    this.logger.debug(
      MKT_PAYMENT_LOG_MESSAGES.STATUS_UPDATE_SUCCESS(paymentId, status),
    );
  }

  /**
   * Update and return the updated payment
   */
  async updateAndReturn(
    workspaceId: string,
    paymentId: string,
    data: UpdatePaymentData,
    queryRunner?: QueryRunner,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    await this.update(workspaceId, paymentId, data, queryRunner);

    return this.findById(workspaceId, paymentId);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Hard delete payment (use with caution)
   */
  async hardDelete(
    workspaceId: string,
    paymentId: string,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(MKT_PAYMENT_LOG_MESSAGES.DELETE_START(paymentId));

    const repository = await this.getRepository(workspaceId);

    await repository.delete(paymentId);

    this.logger.warn(MKT_PAYMENT_LOG_MESSAGES.DELETE_SUCCESS(paymentId));
  }

  /**
   * Hard delete multiple payments by IDs (use with caution)
   * Used for saga compensation
   */
  async deleteMany(workspaceId: string, paymentIds: string[]): Promise<void> {
    if (paymentIds.length === 0) {
      return;
    }

    this.logger.warn(`Hard deleting ${paymentIds.length} payments`);

    const repository = await this.getRepository(workspaceId);

    await repository.delete(paymentIds);

    this.logger.warn(`Successfully deleted ${paymentIds.length} payments`);
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get payment statistics for an order
   */
  async getPaymentStatsByOrder(
    workspaceId: string,
    orderId: string,
  ): Promise<{
    totalPaid: number;
    paymentCount: number;
    completedCount: number;
    pendingCount: number;
  }> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('payment')
      .select('COUNT(payment.id)', 'paymentCount')
      .addSelect(
        "COUNT(CASE WHEN payment.status = 'COMPLETED' THEN 1 END)",
        'completedCount',
      )
      .addSelect(
        "COUNT(CASE WHEN payment.status = 'PENDING' THEN 1 END)",
        'pendingCount',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN payment.status = 'COMPLETED' THEN payment.amount ELSE 0 END), 0)",
        'totalPaid',
      )
      .where('payment.mktOrderId = :orderId', { orderId })
      .getRawOne();

    return {
      totalPaid: parseFloat(result?.totalPaid) || 0,
      paymentCount: parseInt(result?.paymentCount, 10) || 0,
      completedCount: parseInt(result?.completedCount, 10) || 0,
      pendingCount: parseInt(result?.pendingCount, 10) || 0,
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
  ): Promise<WorkspaceRepository<MktPaymentWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktPaymentWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }
}
