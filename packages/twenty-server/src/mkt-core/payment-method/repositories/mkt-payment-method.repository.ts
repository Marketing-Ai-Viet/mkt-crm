import { Injectable, Logger } from '@nestjs/common';

import { FindOptionsWhere, QueryRunner } from 'typeorm';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
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
export class MktPaymentMethodRepository {
  private readonly logger = new Logger(
    `${MKT_PAYMENT_METHOD_LOG_CONTEXT}:Repository`,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find payment method by ID
   */
  async findById(
    workspaceId: string,
    paymentMethodId: string,
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity | null> {
    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_BY_ID_START(paymentMethodId),
    );

    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    paymentMethodId: string,
  ): Promise<MktPaymentMethodWorkspaceEntity | null> {
    return this.findById(workspaceId, paymentMethodId, {
      relations: [...DEFAULT_PAYMENT_METHOD_RELATIONS],
    });
  }

  /**
   * Find payment method by name
   */
  async findByName(
    workspaceId: string,
    name: string,
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity | null> {
    this.logger.debug(MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_BY_NAME_START(name));

    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    type: PaymentMethodType,
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity[]> {
    this.logger.debug(MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_BY_TYPE_START(type));

    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity[]> {
    this.logger.debug(MKT_PAYMENT_METHOD_LOG_MESSAGES.FIND_ACTIVE_START());

    const repository = await this.getRepository(workspaceId);

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
  async findAll(
    workspaceId: string,
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      relations: options?.relations,
      order: { position: 'ASC' },
    });
  }

  /**
   * Find payment methods with custom where clause
   */
  async findMany(
    workspaceId: string,
    where: FindOptionsWhere<MktPaymentMethodWorkspaceEntity>,
    options?: FindPaymentMethodOptions,
  ): Promise<MktPaymentMethodWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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
  async findManyByIds(
    workspaceId: string,
    ids: string[],
  ): Promise<Map<string, MktPaymentMethodWorkspaceEntity>> {
    if (ids.length === 0) {
      return new Map();
    }

    this.logger.debug(`Finding ${ids.length} payment methods by IDs`);

    const repository = await this.getRepository(workspaceId);

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
   * Check if payment method exists
   */
  async exists(workspaceId: string, paymentMethodId: string): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: { id: paymentMethodId },
    });

    return count > 0;
  }

  /**
   * Check if payment method exists by name
   */
  async existsByName(workspaceId: string, name: string): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: { name },
    });

    return count > 0;
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new payment method
   */
  async create(
    workspaceId: string,
    data: CreatePaymentMethodData,
    _queryRunner?: QueryRunner,
  ): Promise<MktPaymentMethodWorkspaceEntity> {
    this.logger.debug(MKT_PAYMENT_METHOD_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository(workspaceId);

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
   * Supports QueryRunner for transaction context
   */
  async update(
    workspaceId: string,
    paymentMethodId: string,
    data: UpdatePaymentMethodData,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.UPDATE_START(paymentMethodId),
    );

    // Use queryRunner for transaction context if provided
    if (queryRunner) {
      await queryRunner.manager.update(
        MktPaymentMethodWorkspaceEntity,
        { id: paymentMethodId },
        data,
      );
    } else {
      const repository = await this.getRepository(workspaceId);

      await repository.update(paymentMethodId, data);
    }

    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.UPDATE_SUCCESS(paymentMethodId),
    );
  }

  /**
   * Update payment method active status
   */
  async updateActiveStatus(
    workspaceId: string,
    paymentMethodId: string,
    isActive: boolean,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.debug(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.STATUS_UPDATE_START(
        paymentMethodId,
        isActive,
      ),
    );

    await this.update(workspaceId, paymentMethodId, { isActive }, queryRunner);

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
  async updateAndReturn(
    workspaceId: string,
    paymentMethodId: string,
    data: UpdatePaymentMethodData,
    queryRunner?: QueryRunner,
  ): Promise<MktPaymentMethodWorkspaceEntity | null> {
    await this.update(workspaceId, paymentMethodId, data, queryRunner);

    return this.findById(workspaceId, paymentMethodId);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Hard delete payment method (use with caution)
   */
  async hardDelete(
    workspaceId: string,
    paymentMethodId: string,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(
      MKT_PAYMENT_METHOD_LOG_MESSAGES.DELETE_START(paymentMethodId),
    );

    const repository = await this.getRepository(workspaceId);

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
  async countByType(
    workspaceId: string,
    type: PaymentMethodType,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { type },
    });
  }

  /**
   * Count active payment methods
   */
  async countActive(workspaceId: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { isActive: true },
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
  ): Promise<WorkspaceRepository<MktPaymentMethodWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktPaymentMethodWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }
}
