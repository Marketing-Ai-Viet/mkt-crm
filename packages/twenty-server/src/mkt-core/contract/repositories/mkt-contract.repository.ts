import { Injectable, NotFoundException } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories/base-workspace.repository';
import {
  CONTRACT_MESSAGES,
  MKT_CONTRACT_LOG_CONTEXT,
} from 'src/mkt-core/contract/messages';
import {
  FindContractOptions,
  FindWithPaginationOptions,
  StatusDistributionItem,
} from 'src/mkt-core/contract/types';
import { MktContractWorkspaceEntity } from 'src/mkt-core/contract/workspace-entity/mkt-contract.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktContractRepository - Data access layer for Contract entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * WorkspaceId is automatically resolved from scoped context.
 *
 * Usage:
 * ```typescript
 * // No need to pass workspaceId
 * const contract = await repository.findById(id);
 * const contracts = await repository.findByCustomerId(customerId);
 * ```
 */
@Injectable()
export class MktContractRepository extends BaseWorkspaceRepository<MktContractWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktContractWorkspaceEntity,
      `${MKT_CONTRACT_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // WORKSPACE ID HELPER
  // ============================================

  /**
   * Get workspace ID from scoped context
   * @throws NotFoundException if workspace context is not available
   */
  private getWorkspaceId(): string {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      throw new NotFoundException(CONTRACT_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }

    return workspaceId;
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find contract by ID
   * @throws NotFoundException if contract not found
   */
  async findContractById(id: string): Promise<MktContractWorkspaceEntity> {
    this.logger.debug(CONTRACT_MESSAGES.LOG.FIND_BY_ID_START(id));

    const workspaceId = this.getWorkspaceId();
    const contract = await this.findById(workspaceId, id);

    if (!contract) {
      this.logger.debug(CONTRACT_MESSAGES.LOG.FIND_BY_ID_NOT_FOUND(id));
      throw new NotFoundException(
        CONTRACT_MESSAGES.ERROR.CONTRACT_NOT_FOUND(id),
      );
    }

    this.logger.debug(CONTRACT_MESSAGES.LOG.FIND_BY_ID_SUCCESS(id));

    return contract;
  }

  /**
   * Find contract by ID (returns null if not found)
   */
  async findByIdOrNull(id: string): Promise<MktContractWorkspaceEntity | null> {
    const workspaceId = this.getWorkspaceId();

    return this.findById(workspaceId, id);
  }

  /**
   * Find contract by ID with relations
   */
  async findByIdWithRelations(
    id: string,
    relations: string[],
  ): Promise<MktContractWorkspaceEntity | null> {
    const workspaceId = this.getWorkspaceId();

    return this.findById(workspaceId, id, { relations });
  }

  /**
   * Find contract by contract number
   */
  async findByContractNumber(
    contractNumber: string,
  ): Promise<MktContractWorkspaceEntity | null> {
    const workspaceId = this.getWorkspaceId();

    return this.findOne(workspaceId, { contractNumber } as never);
  }

  /**
   * Find all contracts with pagination
   */
  async findAllContracts(
    options?: FindContractOptions,
  ): Promise<MktContractWorkspaceEntity[]> {
    const workspaceId = this.getWorkspaceId();

    this.logger.debug(CONTRACT_MESSAGES.LOG.FIND_ALL_START(workspaceId));

    const repository = await this.getRepository(workspaceId);

    const contracts = await repository.find({
      where: { deletedAt: IsNull() },
      take: options?.take,
      skip: options?.skip,
      order: options?.order ?? { createdAt: 'ASC' },
    });

    this.logger.debug(CONTRACT_MESSAGES.LOG.FIND_ALL_SUCCESS(contracts.length));

    return contracts;
  }

  /**
   * Find all contract IDs (lightweight operation)
   */
  async findAllIds(): Promise<string[]> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('contract')
      .select('contract.id', 'id')
      .where('contract.deletedAt IS NULL')
      .getRawMany<{ id: string }>();

    return results.map((r) => r.id);
  }

  /**
   * Find contracts by customer ID
   */
  async findByCustomerId(
    customerId: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktContractWorkspaceEntity[]> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);

    const queryBuilder = repository
      .createQueryBuilder('contract')
      .where('contract.customerId = :customerId', { customerId })
      .andWhere('contract.deletedAt IS NULL')
      .orderBy('contract.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Find contracts by status
   */
  async findByStatus(
    status: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktContractWorkspaceEntity[]> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);

    const queryBuilder = repository
      .createQueryBuilder('contract')
      .where('contract.status = :status', { status })
      .andWhere('contract.deletedAt IS NULL')
      .orderBy('contract.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Find last contract number with prefix (for number generation)
   */
  async findLastNumberWithPrefix(prefix: string): Promise<string | null> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);

    const contract = await repository
      .createQueryBuilder('contract')
      .where('contract.contractNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('contract.contractNumber', 'DESC')
      .getOne();

    return contract?.contractNumber ?? null;
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new contract
   */
  async createContract(
    data: Partial<MktContractWorkspaceEntity>,
  ): Promise<MktContractWorkspaceEntity> {
    const workspaceId = this.getWorkspaceId();

    const savedContract = await this.create(workspaceId, data);

    this.logger.debug(CONTRACT_MESSAGES.LOG.CREATE_SUCCESS(savedContract.id));

    return savedContract;
  }

  /**
   * Create a new contract with ownership fields
   *
   * @param data - Contract data (without ownership fields)
   * @param workspaceMemberId - The workspace member ID for ownership
   * @param accountOwnerId - Optional: explicit account owner ID
   */
  async createContractWithOwnership(
    data: Partial<MktContractWorkspaceEntity>,
    workspaceMemberId: string | undefined,
    accountOwnerId?: string,
  ): Promise<MktContractWorkspaceEntity> {
    const workspaceId = this.getWorkspaceId();

    const ownershipFields = this.buildOwnershipFields({
      workspaceMemberId,
      accountOwnerId,
    });

    const savedContract = await this.create(workspaceId, {
      ...data,
      ...ownershipFields,
    });

    this.logger.debug(CONTRACT_MESSAGES.LOG.CREATE_SUCCESS(savedContract.id));

    return savedContract;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update contract by ID
   */
  async updateContract(
    id: string,
    data: Partial<MktContractWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktContractWorkspaceEntity',
      { id },
      {
        ...data,
        updatedAt: DateTimeUtils.now().toJSDate(),
      },
    );

    this.logger.debug(CONTRACT_MESSAGES.LOG.UPDATE_SUCCESS(id));
  }

  /**
   * Update and return the updated contract
   */
  async updateContractAndReturn(
    id: string,
    data: Partial<MktContractWorkspaceEntity>,
  ): Promise<MktContractWorkspaceEntity> {
    await this.updateContract(id, data);

    return this.findContractById(id);
  }

  /**
   * Soft delete contract
   */
  async softDeleteContract(
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktContractWorkspaceEntity', id);

    this.logger.log(CONTRACT_MESSAGES.LOG.SOFT_DELETE_SUCCESS(id));
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count all contracts
   */
  async countContracts(): Promise<number> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where: { deletedAt: IsNull() } });
  }

  /**
   * Count contracts by customer
   */
  async countByCustomer(customerId: string): Promise<number> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { customerId, deletedAt: IsNull() } as never,
    });
  }

  /**
   * Count contracts by status
   */
  async countByStatus(status: string): Promise<number> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { status, deletedAt: IsNull() } as never,
    });
  }

  // ============================================
  // CONTRACT NUMBER HELPERS
  // ============================================

  /**
   * Check if contract number exists
   */
  async isContractNumberExists(contractNumber: string): Promise<boolean> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);

    const count = await repository
      .createQueryBuilder('contract')
      .where('contract.contractNumber = :contractNumber', { contractNumber })
      .getCount();

    return count > 0;
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get status distribution statistics
   */
  async getStatusDistribution(): Promise<StatusDistributionItem[]> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('contract')
      .select('contract.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('contract.deletedAt IS NULL')
      .groupBy('contract.status')
      .getRawMany();

    return results.map((r) => ({
      status: r.status ?? 'UNKNOWN',
      count: parseInt(r.count, 10) || 0,
    }));
  }

  /**
   * Get contracts expiring within a date range
   */
  async findExpiringContracts(
    startDate: Date,
    endDate: Date,
  ): Promise<MktContractWorkspaceEntity[]> {
    const workspaceId = this.getWorkspaceId();
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('contract')
      .where('contract.endDate >= :startDate', { startDate })
      .andWhere('contract.endDate <= :endDate', { endDate })
      .andWhere('contract.deletedAt IS NULL')
      .orderBy('contract.endDate', 'ASC')
      .getMany();
  }
}
