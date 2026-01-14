import { Injectable } from '@nestjs/common';

import { FindOptionsWhere } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import {
  MKT_PAYMENT_METHOD_LOG_CONTEXT,
  MKT_PAYMENT_METHOD_LOG_MESSAGES,
} from 'src/mkt-core/payment-method/messages';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import {
  CreatePaymentMethodData,
  DEFAULT_PAYMENT_METHOD_RELATIONS,
  FindPaymentMethodOptions,
  PaymentMethodType,
  UpdatePaymentMethodData,
} from 'src/mkt-core/payment-method/types';

/**
 * MktPaymentMethodRepository - Data access layer for PaymentMethod entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktPaymentMethod entity
 * - Query building and execution
 * - Transaction support via QueryRunner
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Validation (handled by Service layer)
 */
@Injectable()
export class MktPaymentMethodRepository extends BaseWorkspaceRepository<MktPaymentMethodWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktPaymentMethodWorkspaceEntity,
      `${MKT_PAYMENT_METHOD_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find payment method by ID with options (logging included)
   */
  async findByIdWithOptions(
    paymentMethodId: string,
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity | null> {
    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_BY_ID_START(paymentMethodId),
    );

    const repository = await this.getRepository();

    const paymentMethod = await repository.findOne({
      where: { id: paymentMethodId },
      relations: options?.relations,
    });

    if (!paymentMethod) {
      this.logger.debug(
        MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_BY_ID_NOT_FOUND(paymentMethodId),
      );

      return null;
    }

    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_BY_ID_SUCCESS(paymentMethodId),
    );

    return paymentMethod;
  }

  /**
   * Find payment method by ID with default relations
   */
  async findByIdWithRelations(
    paymentMethodId: string,
  ): Promise<MktPaymentMethodWorkspaceEntity | null> {
    return this.findByIdWithOptions(paymentMethodId, {
      relations: [...DEFAULT_PAYMENT_METHOD_RELATIONS],
    });
  }

  /**
   * Find payment method by name
   */
  async findByName(
    name: string,
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity | null> {
    this.logger.debug(MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_BY_NAME_START(name));

    const repository = await this.getRepository();

    const paymentMethod = await repository.findOne({
      where: { name },
      relations: options?.relations,
    });

    if (!paymentMethod) {
      this.logger.debug(
        MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_BY_NAME_NOT_FOUND(name),
      );

      return null;
    }

    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_BY_NAME_SUCCESS(name),
    );

    return paymentMethod;
  }

  /**
   * Find payment methods by type
   */
  async findByType(
    type: PaymentMethodType,
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity[]> {
    this.logger.debug(MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_BY_TYPE_START(type));

    const repository = await this.getRepository();

    const paymentMethods = await repository.find({
      where: { type },
      relations: options?.relations,
      order: { position: 'ASC' },
    });

    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_BY_TYPE_SUCCESS(
        type,
        paymentMethods.length,
      ),
    );

    return paymentMethods;
  }

  /**
   * Find all active payment methods
   */
  async findActive(
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity[]> {
    this.logger.debug(MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_ACTIVE_START());

    const repository = await this.getRepository();

    const paymentMethods = await repository.find({
      where: { isActive: true },
      relations: options?.relations,
      order: { position: 'ASC' },
    });

    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_ACTIVE_SUCCESS(
        paymentMethods.length,
      ),
    );

    return paymentMethods;
  }

  /**
   * Find all payment methods
   */
  async findAllMethods(
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      relations: options?.relations,
      order: { position: 'ASC' },
    });
  }

  /**
   * Find payment methods with custom where clause
   */
  async findManyWithOptions(
    where: FindOptionsWhere<MktPaymentMethodWorkspaceEntity>,
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where,
      relations: options?.relations,
      order: { position: 'ASC' },
    });
  }

  /**
   * Find payment methods by IDs (batch operation)
   * Returns a Map for efficient lookup
   */
  async findManyByIdsAsMap(
    ids: string[],
  ): Promise<Map<string, MktPaymentMethodWorkspaceEntity>> {
    if (ids.length === 0) {
      return new Map();
    }

    this.logger.debug(`Finding ${ids.length} payment methods by IDs`);

    const repository = await this.getRepository();

    const paymentMethods = await repository.find({
      where: ids.map((id) => ({ id })),
    });

    const result = new Map<string, MktPaymentMethodWorkspaceEntity>();

    for (const pm of paymentMethods) {
      result.set(pm.id, pm);
    }

    this.logger.debug(
      `Found ${result.size} payment methods out of ${ids.length} requested`,
    );

    return result;
  }

  /**
   * Check if payment method exists by name
   */
  async existsByName(name: string): Promise<boolean> {
    return this.existsWhere({ name });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new payment method
   */
  async createPaymentMethod(
    data: CreatePaymentMethodData,
  ): Promise<MktPaymentMethodWorkspaceEntity> {
    this.logger.debug(MKT_PAYMENT_METHOD_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository();

    const paymentMethod = repository.create({
      ...data,
      isActive: data.isActive ?? true,
    });

    const savedPaymentMethod = await repository.save(paymentMethod);

    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.CREATE_SUCCESS(savedPaymentMethod.id),
    );

    return savedPaymentMethod;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update payment method by ID
   */
  async updatePaymentMethod(
    paymentMethodId: string,
    data: UpdatePaymentMethodData,
  ): Promise<void> {
    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.UPDATE_START(paymentMethodId),
    );

    const repository = await this.getRepository();

    await repository.update(paymentMethodId, data);

    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.UPDATE_SUCCESS(paymentMethodId),
    );
  }

  /**
   * Update payment method active status
   */
  async updateActiveStatus(
    paymentMethodId: string,
    isActive: boolean,
  ): Promise<void> {
    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.STATUS_UPDATE_START(
        paymentMethodId,
        isActive,
      ),
    );

    await this.updatePaymentMethod(paymentMethodId, { isActive });

    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.STATUS_UPDATE_SUCCESS(
        paymentMethodId,
        isActive,
      ),
    );
  }

  /**
   * Update and return the updated payment method
   */
  async updatePaymentMethodAndReturn(
    paymentMethodId: string,
    data: UpdatePaymentMethodData,
  ): Promise<MktPaymentMethodWorkspaceEntity | null> {
    await this.updatePaymentMethod(paymentMethodId, data);

    return this.findById(paymentMethodId);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Hard delete payment method (use with caution)
   */
  async hardDeletePaymentMethod(paymentMethodId: string): Promise<void> {
    this.logger.warn(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.DELETE_START(paymentMethodId),
    );

    const repository = await this.getRepository();

    await repository.delete(paymentMethodId);

    this.logger.warn(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.DELETE_SUCCESS(paymentMethodId),
    );
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Count payment methods by type
   */
  async countByType(type: PaymentMethodType): Promise<number> {
    return this.count({ type });
  }

  /**
   * Count active payment methods
   */
  async countActive(): Promise<number> {
    return this.count({ isActive: true });
  }
}
