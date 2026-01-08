import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
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
 * Responsibilities:
 * - Database operations for MktContract entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Validation (handled by Hook layer)
 */
@Injectable()
export class MktContractRepository {
  private readonly logger = new Logger(
    `${MKT_CONTRACT_LOG_CONTEXT}:Repository`,
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
  ): Promise<WorkspaceRepository<MktContractWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException(CONTRACT_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktContractWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find contract by ID
   */
  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktContractWorkspaceEntity> {
    this.logger.debug(CONTRACT_MESSAGES.LOG.FIND_BY_ID_START(id));

    const repository = await this.getRepository(workspaceId);
    const contract = await repository.findOne({ where: { id } });

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
  async findByIdOrNull(
    id: string,
    workspaceId?: string,
  ): Promise<MktContractWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  /**
   * Find contract by ID with relations
   */
  async findByIdWithRelations(
    id: string,
    relations: string[],
    workspaceId?: string,
  ): Promise<MktContractWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations,
    });
  }

  /**
   * Find contract by contract number
   */
  async findByContractNumber(
    contractNumber: string,
    workspaceId?: string,
  ): Promise<MktContractWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { contractNumber } });
  }

  /**
   * Find all contracts with pagination
   */
  async findAll(
    workspaceId?: string,
    options?: FindContractOptions,
  ): Promise<MktContractWorkspaceEntity[]> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    this.logger.debug(CONTRACT_MESSAGES.LOG.FIND_ALL_START(wsId ?? 'unknown'));

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
  async findAllIds(workspaceId?: string): Promise<string[]> {
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
    workspaceId?: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktContractWorkspaceEntity[]> {
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
    workspaceId?: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktContractWorkspaceEntity[]> {
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
  async findLastNumberWithPrefix(
    prefix: string,
    workspaceId?: string,
  ): Promise<string | null> {
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
  async create(
    data: Partial<MktContractWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktContractWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const contract = repository.create(data);
    const savedContract = await repository.save(contract);

    this.logger.debug(CONTRACT_MESSAGES.LOG.CREATE_SUCCESS(savedContract.id));

    return savedContract;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update contract by ID
   * Pattern: Follow mkt-customer repository pattern with manager.update()
   */
  async update(
    id: string,
    data: Partial<MktContractWorkspaceEntity>,
    workspaceId?: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
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
  async updateAndReturn(
    id: string,
    data: Partial<MktContractWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktContractWorkspaceEntity> {
    await this.update(id, data, workspaceId);

    return this.findById(id, workspaceId);
  }

  /**
   * Soft delete contract
   */
  async softDelete(
    id: string,
    workspaceId?: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
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
  async count(workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where: { deletedAt: IsNull() } });
  }

  /**
   * Count contracts by customer
   */
  async countByCustomer(
    customerId: string,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { customerId, deletedAt: IsNull() },
    });
  }

  /**
   * Count contracts by status
   */
  async countByStatus(status: string, workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { status, deletedAt: IsNull() },
    });
  }

  // ============================================
  // CONTRACT NUMBER HELPERS
  // ============================================

  /**
   * Check if contract number exists
   */
  async isContractNumberExists(
    contractNumber: string,
    workspaceId?: string,
  ): Promise<boolean> {
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
   * Single query for all status counts
   */
  async getStatusDistribution(
    workspaceId?: string,
  ): Promise<StatusDistributionItem[]> {
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
    workspaceId?: string,
  ): Promise<MktContractWorkspaceEntity[]> {
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
