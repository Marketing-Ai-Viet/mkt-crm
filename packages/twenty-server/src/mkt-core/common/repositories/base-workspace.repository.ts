import { Logger, NotFoundException } from '@nestjs/common';

import { DeepPartial, EntityManager, FindOptionsWhere } from 'typeorm';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {
  transactionContextStore,
  TRANSACTION_CONFIG,
} from 'src/mkt-core/common/transaction';
import { REPOSITORY_MESSAGES } from 'src/mkt-core/common/messages';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

// ============================================
// OWNERSHIP TYPES
// ============================================

/**
 * Input for building ownership fields
 */
export type OwnershipFieldsInput = {
  /** The workspace member ID who is creating/owning the entity */
  workspaceMemberId: string | undefined;
  /** Optional: explicitly set a different account owner */
  accountOwnerId?: string;
};

/**
 * Output ownership fields to spread into entity creation
 * - createdById can be null (nullable relation)
 * - accountOwnerId can be undefined (non-nullable relation, omit if not set)
 */
export type OwnershipFields = {
  createdById: string | null;
  accountOwnerId?: string;
};

// ============================================
// OWNERSHIP UTILITY FUNCTION
// ============================================

/**
 * Build ownership fields for entity creation
 *
 * By default:
 * - createdById = workspaceMemberId (null if not provided)
 * - accountOwnerId = workspaceMemberId (omitted if not provided)
 *
 * @param input - OwnershipFieldsInput
 * @returns OwnershipFields to spread into entity creation
 *
 * @example
 * const ownershipFields = buildOwnershipFields({
 *   workspaceMemberId: authContext.workspaceMemberId,
 * });
 *
 * const entity = {
 *   ...data,
 *   ...ownershipFields,
 * };
 */
export const buildOwnershipFields = (
  input: OwnershipFieldsInput,
): OwnershipFields => {
  const { workspaceMemberId, accountOwnerId } = input;

  const result: OwnershipFields = {
    createdById: workspaceMemberId ?? null,
  };

  const resolvedAccountOwnerId = accountOwnerId ?? workspaceMemberId;

  if (resolvedAccountOwnerId) {
    result.accountOwnerId = resolvedAccountOwnerId;
  }

  return result;
};

/**
 * Check if entity has valid ownership (createdById is set)
 *
 * @param entity - Entity with ownership fields
 * @returns true if entity has valid ownership
 */
export const hasValidOwnership = (entity: Partial<OwnershipFields>): boolean =>
  entity.createdById !== null && entity.createdById !== undefined;

/**
 * Base entity interface that workspace entities must implement
 * Note: Workspace entities use string for date fields (ISO format)
 */
export type BaseWorkspaceEntityLike = {
  id: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
};

/**
 * Options for repository operations
 */
export type BaseRepositoryOptions = {
  relations?: string[];
};

/**
 * BaseWorkspaceRepository - Abstract base class for workspace entity repositories
 *
 * Provides common CRUD operations:
 * - getRepository() with workspace context handling
 * - findById() / findByIds()
 * - findAll() / findMany()
 * - create() / bulkCreate()
 * - update() / updateAndReturn()
 * - exists()
 * - softDelete() / softDeleteMany()
 * - count()
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class MktDepartmentRepository extends BaseWorkspaceRepository<MktDepartmentWorkspaceEntity> {
 *   constructor(
 *     twentyORMGlobalManager: TwentyORMGlobalManager,
 *     scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
 *   ) {
 *     super(
 *       twentyORMGlobalManager,
 *       scopedWorkspaceContextFactory,
 *       MktDepartmentWorkspaceEntity,
 *       'MktDepartment:Repository',
 *     );
 *   }
 *
 *   // Add specialized methods here...
 * }
 * ```
 */
export abstract class BaseWorkspaceRepository<
  T extends BaseWorkspaceEntityLike,
> {
  protected readonly logger: Logger;

  constructor(
    protected readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    protected readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    protected readonly entityClass: new () => T,
    logContext: string,
  ) {
    this.logger = new Logger(logContext);
  }

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get repository for specific workspace
   *
   * When running inside a transaction scope (via TransactionScopeService),
   * this method automatically returns a repository bound to the active transaction.
   * This ensures all database operations within the transaction use the same connection.
   *
   * @param workspaceId - Optional workspace ID (uses scoped context if not provided)
   */
  async getRepository(workspaceId?: string): Promise<WorkspaceRepository<T>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException(
        REPOSITORY_MESSAGES.ERROR.WORKSPACE_NOT_FOUND,
      );
    }

    // Check if ALS-based transaction binding is enabled
    if (TRANSACTION_CONFIG.ALS_ENABLED) {
      const txBoundRepo = this.tryGetTransactionBoundRepository(wsId);

      if (txBoundRepo) {
        return txBoundRepo;
      }
    }

    // Default behavior: get repository from TwentyORMGlobalManager
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      this.entityClass,
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Try to get a repository bound to the current transaction context.
   *
   * @param workspaceId - The workspace ID to validate against transaction context
   * @returns WorkspaceRepository if in valid transaction context, undefined otherwise
   */
  private tryGetTransactionBoundRepository(
    workspaceId: string,
  ): WorkspaceRepository<T> | undefined {
    const store = transactionContextStore.get();

    // Not in transaction context
    if (!store?.queryRunner?.isTransactionActive) {
      return undefined;
    }

    // Workspace mismatch - prevent cross-workspace transaction leaks
    if (store.workspaceId !== workspaceId) {
      this.logger.warn({
        message:
          'Workspace mismatch in transaction context, using default repository',
        txId: store.txId,
        txWorkspaceId: store.workspaceId,
        requestedWorkspaceId: workspaceId,
        entity: this.entityClass.name,
      });

      return undefined;
    }

    const manager = store.queryRunner.manager;

    // Validate manager is WorkspaceEntityManager
    if (!this.isWorkspaceEntityManager(manager)) {
      this.logger.warn({
        message:
          'QueryRunner manager is not WorkspaceEntityManager, using default repository',
        txId: store.txId,
        workspaceId: store.workspaceId,
        entity: this.entityClass.name,
      });

      return undefined;
    }

    // Try to get repository from transaction-bound manager
    // May fail if entity metadata is not properly loaded
    try {
      const repository = manager.getRepository(this.entityClass, {
        shouldBypassPermissionChecks: true,
      }) as WorkspaceRepository<T>;

      this.logger.debug({
        message: 'Using transaction-bound repository',
        txId: store.txId,
        workspaceId: store.workspaceId,
        entity: this.entityClass.name,
        elapsedMs: transactionContextStore.getElapsedMs(),
      });

      return repository;
    } catch (error) {
      // Entity metadata not found - fallback to default repository
      // This can happen when QueryRunner's manager doesn't have workspace entity metadata
      this.logger.warn({
        message:
          'Failed to get transaction-bound repository, using default repository',
        txId: store.txId,
        workspaceId: store.workspaceId,
        entity: this.entityClass.name,
        error: error instanceof Error ? error.message : String(error),
      });

      return undefined;
    }
  }

  /**
   * Type guard to check if manager is WorkspaceEntityManager
   *
   * Checks for WorkspaceEntityManager-specific method `getFeatureFlagMap`
   * which is not present in base EntityManager.
   */
  private isWorkspaceEntityManager(
    manager: EntityManager,
  ): manager is WorkspaceEntityManager {
    return (
      manager !== null &&
      typeof manager === 'object' &&
      'getRepository' in manager &&
      typeof manager.getRepository === 'function' &&
      // WorkspaceEntityManager has getFeatureFlagMap method
      'getFeatureFlagMap' in manager &&
      typeof (manager as WorkspaceEntityManager).getFeatureFlagMap ===
        'function'
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find entity by ID
   */
  async findById(
    id: string,
    options?: BaseRepositoryOptions,
  ): Promise<T | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { id } as FindOptionsWhere<T>,
      relations: options?.relations,
    });
  }

  /**
   * Find entities by IDs
   */
  async findByIds(
    ids: string[],
    options?: BaseRepositoryOptions,
  ): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository();

    return repository.find({
      where: ids.map((id) => ({ id }) as FindOptionsWhere<T>),
      relations: options?.relations,
    });
  }

  /**
   * Find all entities
   */
  async findAll(options?: BaseRepositoryOptions): Promise<T[]> {
    const repository = await this.getRepository();

    return repository.find({
      relations: options?.relations,
    });
  }

  /**
   * Find entities with custom where clause
   */
  async findMany(
    where: FindOptionsWhere<T>,
    options?: BaseRepositoryOptions,
  ): Promise<T[]> {
    const repository = await this.getRepository();

    return repository.find({
      where,
      relations: options?.relations,
    });
  }

  /**
   * Find one entity with custom where clause
   */
  async findOne(
    where: FindOptionsWhere<T>,
    options?: BaseRepositoryOptions,
  ): Promise<T | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where,
      relations: options?.relations,
    });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new entity
   */
  async create(data: DeepPartial<T>): Promise<T> {
    const repository = await this.getRepository();
    const entity = repository.create(data);

    return repository.save(entity);
  }

  /**
   * Bulk create entities
   */
  async bulkCreate(items: DeepPartial<T>[]): Promise<T[]> {
    if (items.length === 0) {
      return [];
    }

    const repository = await this.getRepository();
    const entities = items.map((item) => repository.create(item));

    return repository.save(entities);
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update entity by ID
   */
  async update(id: string, data: DeepPartial<T>): Promise<void> {
    const repository = await this.getRepository();

    await repository.update(id, data as never);
  }

  /**
   * Update and return the updated entity
   */
  async updateAndReturn(
    id: string,
    data: DeepPartial<T>,
    options?: BaseRepositoryOptions,
  ): Promise<T | null> {
    await this.update(id, data);

    return this.findById(id, options);
  }

  /**
   * Update entities matching where clause
   */
  async updateWhere(
    where: FindOptionsWhere<T>,
    data: DeepPartial<T>,
  ): Promise<{ affected: number }> {
    const repository = await this.getRepository();

    const result = await repository.update(where, data as never);

    return { affected: result.affected ?? 0 };
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const repository = await this.getRepository();

    return repository.existsBy({ id } as FindOptionsWhere<T>);
  }

  /**
   * Check if entity exists by where clause
   */
  async existsWhere(where: FindOptionsWhere<T>): Promise<boolean> {
    const repository = await this.getRepository();

    return repository.existsBy(where);
  }

  /**
   * Soft delete entity by setting deletedAt timestamp
   */
  async softDelete(id: string): Promise<void> {
    const repository = await this.getRepository();

    await repository.update(id, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    this.logger.log(`Soft deleted entity ${id}`);
  }

  /**
   * Soft delete multiple entities by IDs
   */
  async softDeleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const repository = await this.getRepository();

    await repository.update(ids, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    this.logger.log(`Soft deleted ${ids.length} entities`);
  }

  /**
   * Soft delete entities matching where clause
   */
  async softDeleteWhere(where: FindOptionsWhere<T>): Promise<number> {
    const repository = await this.getRepository();

    const result = await repository.update(where, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    this.logger.log(`Soft deleted ${result.affected ?? 0} entities`);

    return result.affected ?? 0;
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count all entities
   */
  async count(where?: FindOptionsWhere<T>): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({ where });
  }

  // ============================================
  // OWNERSHIP OPERATIONS (Optional)
  // ============================================

  /**
   * Build ownership fields for entity creation
   *
   * By default:
   * - createdById = workspaceMemberId (null if not provided)
   * - accountOwnerId = workspaceMemberId (omitted if not provided)
   *
   * @param input - OwnershipFieldsInput
   * @returns OwnershipFields to spread into entity creation
   *
   * @example
   * const ownershipFields = this.buildOwnershipFields({
   *   workspaceMemberId: context.workspaceMemberId,
   * });
   *
   * const order = await this.create(workspaceId, {
   *   ...orderData,
   *   ...ownershipFields,
   * });
   */
  protected buildOwnershipFields(input: OwnershipFieldsInput): OwnershipFields {
    return buildOwnershipFields(input);
  }

  /**
   * Check if entity has valid ownership (createdById is set)
   *
   * @param entity - Entity with ownership fields
   * @returns true if entity has valid ownership
   */
  protected hasValidOwnership(entity: Partial<OwnershipFields>): boolean {
    return hasValidOwnership(entity);
  }

  /**
   * Create entity with ownership fields automatically set
   *
   * @param data - Entity data (without ownership fields)
   * @param workspaceMemberId - The workspace member ID for ownership
   * @param accountOwnerId - Optional: explicit account owner ID
   * @returns Created entity with ownership fields
   */
  async createWithOwnership(
    data: DeepPartial<T>,
    workspaceMemberId: string | undefined,
    accountOwnerId?: string,
  ): Promise<T> {
    const ownershipFields = this.buildOwnershipFields({
      workspaceMemberId,
      accountOwnerId,
    });

    return this.create({
      ...data,
      ...ownershipFields,
    } as DeepPartial<T>);
  }

  /**
   * Bulk create entities with ownership fields automatically set
   *
   * @param items - Entity data items (without ownership fields)
   * @param workspaceMemberId - The workspace member ID for ownership
   * @param accountOwnerId - Optional: explicit account owner ID
   * @returns Created entities with ownership fields
   */
  async bulkCreateWithOwnership(
    items: DeepPartial<T>[],
    workspaceMemberId: string | undefined,
    accountOwnerId?: string,
  ): Promise<T[]> {
    if (items.length === 0) {
      return [];
    }

    const ownershipFields = this.buildOwnershipFields({
      workspaceMemberId,
      accountOwnerId,
    });

    const itemsWithOwnership = items.map((item) => ({
      ...item,
      ...ownershipFields,
    })) as DeepPartial<T>[];

    return this.bulkCreate(itemsWithOwnership);
  }
}
