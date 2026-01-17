import { Injectable } from '@nestjs/common';

import { FindOptionsWhere } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
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
 * Extends BaseWorkspaceRepository for common CRUD operations.
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
export class MktPaymentRepository extends BaseWorkspaceRepository<MktPaymentWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktPaymentWorkspaceEntity,
      `${MKT_PAYMENT_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find payment by ID with options (logging included)
   */
  async findByIdWithOptions(
    paymentId: string,
    options?: FindPaymentOptions,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.FIND_BY_ID_START(paymentId));

    const repository = await this.getRepository();

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
    paymentId: string,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    return this.findByIdWithOptions(paymentId, {
      relations: [...DEFAULT_PAYMENT_RELATIONS],
    });
  }

  /**
   * Find payments by order ID
   */
  async findByOrderId(
    orderId: string,
    options?: FindPaymentOptions,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.FIND_BY_ORDER_START(orderId));

    const repository = await this.getRepository();

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
    transactionId: string,
    options?: FindPaymentOptions,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    this.logger.debug(
      MKT_PAYMENT_LOG_MESSAGES.FIND_BY_TRANSACTION_ID_START(transactionId),
    );

    const repository = await this.getRepository();

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
    status: PaymentStatus,
    options?: FindPaymentOptions,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { status },
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find payments with custom where clause
   */
  async findManyWithOptions(
    where: FindOptionsWhere<MktPaymentWorkspaceEntity>,
    options?: FindPaymentOptions,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where,
      relations: options?.relations,
    });
  }

  /**
   * Check if payment exists by transaction ID
   */
  async existsByTransactionId(transactionId: string): Promise<boolean> {
    const repository = await this.getRepository();

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
  async createPayment(
    data: CreatePaymentData,
  ): Promise<MktPaymentWorkspaceEntity> {
    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository();

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
   */
  async updatePayment(
    paymentId: string,
    data: UpdatePaymentData,
  ): Promise<void> {
    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.UPDATE_START(paymentId));

    const repository = await this.getRepository();

    await repository.update(paymentId, data);

    this.logger.debug(MKT_PAYMENT_LOG_MESSAGES.UPDATE_SUCCESS(paymentId));
  }

  /**
   * Update payment status
   */
  async updateStatus(paymentId: string, status: PaymentStatus): Promise<void> {
    this.logger.debug(
      MKT_PAYMENT_LOG_MESSAGES.STATUS_UPDATE_START(paymentId, status),
    );

    await this.updatePayment(paymentId, { status });

    this.logger.debug(
      MKT_PAYMENT_LOG_MESSAGES.STATUS_UPDATE_SUCCESS(paymentId, status),
    );
  }

  /**
   * Update and return the updated payment
   */
  async updatePaymentAndReturn(
    paymentId: string,
    data: UpdatePaymentData,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    await this.updatePayment(paymentId, data);

    return this.findById(paymentId);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete payment by setting deletedAt timestamp
   */
  async softDeletePayment(paymentId: string): Promise<void> {
    this.logger.warn(MKT_PAYMENT_LOG_MESSAGES.DELETE_START(paymentId));

    await this.softDelete(paymentId);

    this.logger.warn(MKT_PAYMENT_LOG_MESSAGES.DELETE_SUCCESS(paymentId));
  }

  /**
   * Soft delete multiple payments by IDs
   * Used for saga compensation
   */
  async softDeleteManyPayments(paymentIds: string[]): Promise<void> {
    if (paymentIds.length === 0) {
      return;
    }

    this.logger.warn(`Soft deleting ${paymentIds.length} payments`);

    await this.softDeleteMany(paymentIds);

    this.logger.warn(`Successfully soft deleted ${paymentIds.length} payments`);
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get payment statistics for an order
   */
  async getPaymentStatsByOrder(orderId: string): Promise<{
    totalPaid: number;
    paymentCount: number;
    completedCount: number;
    pendingCount: number;
  }> {
    const repository = await this.getRepository();

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
}
