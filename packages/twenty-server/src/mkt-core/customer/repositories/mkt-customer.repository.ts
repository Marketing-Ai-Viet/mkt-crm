import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { IsNull } from 'typeorm';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import {
  CUSTOMER_MESSAGES,
  MKT_CUSTOMER_LOG_CONTEXT,
} from 'src/mkt-core/customer/messages';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { FindCustomerOptions } from 'src/mkt-core/customer/types';

/**
 * MktCustomerRepository - Data access layer for Customer entity
 *
 * Responsibilities:
 * - Database operations for MktCustomer entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Validation (handled by Hook layer)
 */
@Injectable()
export class MktCustomerRepository {
  private readonly logger = new Logger(
    `${MKT_CUSTOMER_LOG_CONTEXT}:Repository`,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get repository for specific workspace
   * Thread-safe: Uses TwentyORMGlobalManager directly
   */
  async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktCustomerWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException(CUSTOMER_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktCustomerWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find customer by ID
   */
  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity> {
    this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_BY_ID_START(id));

    const repository = await this.getRepository(workspaceId);
    const customer = await repository.findOne({ where: { id } });

    if (!customer) {
      this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_BY_ID_NOT_FOUND(id));
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(id),
      );
    }

    this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_BY_ID_SUCCESS(id));

    return customer;
  }

  /**
   * Find customer by ID (returns null if not found)
   */
  async findByIdOrNull(
    id: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  /**
   * Find customer by email
   */
  async findByEmail(
    email: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { email } });
  }

  /**
   * Find all customers with pagination
   */
  async findAll(
    workspaceId?: string,
    options?: FindCustomerOptions,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_ALL_START(wsId ?? 'unknown'));

    const repository = await this.getRepository(workspaceId);

    const customers = await repository.find({
      where: { deletedAt: IsNull() },
      take: options?.take,
      skip: options?.skip,
      order: options?.order ?? { createdAt: 'ASC' },
    });

    this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_ALL_SUCCESS(customers.length));

    return customers;
  }

  /**
   * Find all customer IDs (lightweight operation)
   */
  async findAllIds(workspaceId?: string): Promise<string[]> {
    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('customer')
      .select('customer.id', 'id')
      .where('customer.deletedAt IS NULL')
      .getRawMany<{ id: string }>();

    return results.map((r) => r.id);
  }

  /**
   * Find customers by tier
   */
  async findByTier(
    tier: string,
    workspaceId?: string,
    options?: { limit?: number; offset?: number },
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const queryBuilder = repository
      .createQueryBuilder('customer')
      .where('customer.tier = :tier', { tier })
      .andWhere('customer.deletedAt IS NULL')
      .orderBy('customer.totalOrderValue', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getMany();
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update customer by ID
   */
  async update(
    id: string,
    data: Partial<MktCustomerWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, data);
  }

  /**
   * Update and return the updated customer
   */
  async updateAndReturn(
    id: string,
    data: Partial<MktCustomerWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity> {
    await this.update(id, data, workspaceId);

    return this.findById(id, workspaceId);
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count all customers
   */
  async count(workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where: { deletedAt: IsNull() } });
  }

  /**
   * Count customers by account owner
   */
  async countByAccountOwner(
    accountOwnerId: string,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { accountOwnerId, deletedAt: IsNull() },
    });
  }

  // ============================================
  // CODE GENERATION HELPERS
  // ============================================

  /**
   * Check if customer code exists
   */
  async isCodeExists(
    customerCode: string,
    workspaceId?: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository
      .createQueryBuilder('customer')
      .where('customer.mktCustomerCode = :customerCode', { customerCode })
      .getCount();

    return count > 0;
  }

  /**
   * Find last customer code with prefix
   */
  async findLastCodeWithPrefix(
    prefix: string,
    workspaceId?: string,
  ): Promise<string | null> {
    const repository = await this.getRepository(workspaceId);

    const customer = await repository
      .createQueryBuilder('customer')
      .where('customer.mktCustomerCode LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('customer.mktCustomerCode', 'DESC')
      .getOne();

    return customer?.mktCustomerCode ?? null;
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get tier distribution statistics
   * Single query for all tier counts
   */
  async getTierDistribution(
    workspaceId?: string,
  ): Promise<Array<{ tier: string; count: number }>> {
    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('customer')
      .select('customer.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where('customer.deletedAt IS NULL')
      .groupBy('customer.tier')
      .getRawMany();

    return results.map((r) => ({
      tier: r.tier ?? 'UNKNOWN',
      count: parseInt(r.count, 10) || 0,
    }));
  }

  /**
   * Get total order value sum for all customers
   */
  async getTotalOrderValueSum(workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('customer')
      .select('COALESCE(SUM(customer.totalOrderValue), 0)', 'total')
      .where('customer.deletedAt IS NULL')
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0') || 0;
  }
}
