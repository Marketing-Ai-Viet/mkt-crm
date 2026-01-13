import { Logger, NotFoundException } from '@nestjs/common';

import { DeepPartial, FindOptionsWhere } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
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
   * Thread-safe: Uses TwentyORMGlobalManager directly
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

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      this.entityClass,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find entity by ID
   */
  async findById(
    workspaceId: string,
    id: string,
    options?: BaseRepositoryOptions,
  ): Promise<T | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id } as FindOptionsWhere<T>,
      relations: options?.relations,
    });
  }

  /**
   * Find entities by IDs
   */
  async findByIds(
    workspaceId: string,
    ids: string[],
    options?: BaseRepositoryOptions,
  ): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: ids.map((id) => ({ id }) as FindOptionsWhere<T>),
      relations: options?.relations,
    });
  }

  /**
   * Find all entities
   */
  async findAll(
    workspaceId: string,
    options?: BaseRepositoryOptions,
  ): Promise<T[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      relations: options?.relations,
    });
  }

  /**
   * Find entities with custom where clause
   */
  async findMany(
    workspaceId: string,
    where: FindOptionsWhere<T>,
    options?: BaseRepositoryOptions,
  ): Promise<T[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where,
      relations: options?.relations,
    });
  }

  /**
   * Find one entity with custom where clause
   */
  async findOne(
    workspaceId: string,
    where: FindOptionsWhere<T>,
    options?: BaseRepositoryOptions,
  ): Promise<T | null> {
    const repository = await this.getRepository(workspaceId);

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
  async create(workspaceId: string, data: DeepPartial<T>): Promise<T> {
    const repository = await this.getRepository(workspaceId);
    const entity = repository.create(data);

    return repository.save(entity);
  }

  /**
   * Bulk create entities
   */
  async bulkCreate(workspaceId: string, items: DeepPartial<T>[]): Promise<T[]> {
    if (items.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);
    const entities = items.map((item) => repository.create(item));

    return repository.save(entities);
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update entity by ID
   */
  async update(
    workspaceId: string,
    id: string,
    data: DeepPartial<T>,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, data as never);
  }

  /**
   * Update and return the updated entity
   */
  async updateAndReturn(
    workspaceId: string,
    id: string,
    data: DeepPartial<T>,
    options?: BaseRepositoryOptions,
  ): Promise<T | null> {
    await this.update(workspaceId, id, data);

    return this.findById(workspaceId, id, options);
  }

  /**
   * Update entities matching where clause
   */
  async updateWhere(
    workspaceId: string,
    where: FindOptionsWhere<T>,
    data: DeepPartial<T>,
  ): Promise<{ affected: number }> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository.update(where, data as never);

    return { affected: result.affected ?? 0 };
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Check if entity exists
   */
  async exists(workspaceId: string, id: string): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    return repository.existsBy({ id } as FindOptionsWhere<T>);
  }

  /**
   * Check if entity exists by where clause
   */
  async existsWhere(
    workspaceId: string,
    where: FindOptionsWhere<T>,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    return repository.existsBy(where);
  }

  /**
   * Soft delete entity by setting deletedAt timestamp
   */
  async softDelete(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    this.logger.log(`Soft deleted entity ${id}`);
  }

  /**
   * Soft delete multiple entities by IDs
   */
  async softDeleteMany(workspaceId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const repository = await this.getRepository(workspaceId);

    await repository.update(ids, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    this.logger.log(`Soft deleted ${ids.length} entities`);
  }

  /**
   * Soft delete entities matching where clause
   */
  async softDeleteWhere(
    workspaceId: string,
    where: FindOptionsWhere<T>,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

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
  async count(
    workspaceId: string,
    where?: FindOptionsWhere<T>,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

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
   * @param workspaceId - Workspace ID
   * @param data - Entity data (without ownership fields)
   * @param workspaceMemberId - The workspace member ID for ownership
   * @param accountOwnerId - Optional: explicit account owner ID
   * @returns Created entity with ownership fields
   */
  async createWithOwnership(
    workspaceId: string,
    data: DeepPartial<T>,
    workspaceMemberId: string | undefined,
    accountOwnerId?: string,
  ): Promise<T> {
    const ownershipFields = this.buildOwnershipFields({
      workspaceMemberId,
      accountOwnerId,
    });

    return this.create(workspaceId, {
      ...data,
      ...ownershipFields,
    } as DeepPartial<T>);
  }

  /**
   * Bulk create entities with ownership fields automatically set
   *
   * @param workspaceId - Workspace ID
   * @param items - Entity data items (without ownership fields)
   * @param workspaceMemberId - The workspace member ID for ownership
   * @param accountOwnerId - Optional: explicit account owner ID
   * @returns Created entities with ownership fields
   */
  async bulkCreateWithOwnership(
    workspaceId: string,
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

    return this.bulkCreate(workspaceId, itemsWithOwnership);
  }
}
