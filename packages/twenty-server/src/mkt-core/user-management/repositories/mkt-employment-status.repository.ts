import { Injectable } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktEmploymentStatusWorkspaceEntity } from 'src/mkt-core/user-management/workspace-entities/mkt-employment-status.workspace-entity';

const LOG_CONTEXT = 'MktEmploymentStatus';

/**
 * MktEmploymentStatusRepository - Data access layer for Employment Status entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktEmploymentStatusWorkspaceEntity
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktEmploymentStatusRepository extends BaseWorkspaceRepository<MktEmploymentStatusWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktEmploymentStatusWorkspaceEntity,
      `${LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find employment status by code
   */
  async findByCode(
    statusCode: string,
  ): Promise<MktEmploymentStatusWorkspaceEntity | null> {
    this.logger.debug(`Finding employment status by code: ${statusCode}`);

    return this.findOne({ statusCode });
  }

  /**
   * Find all active employment statuses
   */
  async findAllActive(): Promise<MktEmploymentStatusWorkspaceEntity[]> {
    this.logger.debug('Finding all active employment statuses');

    const repository = await this.getRepository();

    return repository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Find initial status (default for new employees)
   */
  async findInitialStatus(): Promise<MktEmploymentStatusWorkspaceEntity | null> {
    this.logger.debug('Finding initial employment status');

    return this.findOne({ isInitialStatus: true, isActive: true });
  }

  /**
   * Find final statuses (terminated statuses)
   */
  async findFinalStatuses(): Promise<MktEmploymentStatusWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { isFinalStatus: true, isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Find statuses by display order range
   */
  async findByDisplayOrderRange(
    minOrder: number,
    maxOrder: number,
  ): Promise<MktEmploymentStatusWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository
      .createQueryBuilder('status')
      .where('status.displayOrder >= :minOrder', { minOrder })
      .andWhere('status.displayOrder <= :maxOrder', { maxOrder })
      .andWhere('status.isActive = :isActive', { isActive: true })
      .orderBy('status.displayOrder', 'ASC')
      .getMany();
  }

  // ============================================
  // EXISTS OPERATIONS
  // ============================================

  /**
   * Check if status code exists
   */
  async existsByCode(statusCode: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findOne({ statusCode });

    if (!existing) {
      return false;
    }

    if (excludeId && existing.id === excludeId) {
      return false;
    }

    return true;
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count active employment statuses
   */
  async countActive(): Promise<number> {
    return this.count({ isActive: true });
  }

  /**
   * Count employees with a specific status
   */
  async countEmployeesByStatus(statusId: string): Promise<number> {
    try {
      const workspaceId =
        this.scopedWorkspaceContextFactory.create().workspaceId;

      if (!workspaceId) {
        return 0;
      }

      const memberRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          workspaceId,
          'workspaceMember',
          { shouldBypassPermissionChecks: true },
        );

      return memberRepository.count({
        where: { employmentStatusId: statusId },
      });
    } catch (error) {
      this.logger.warn(
        `Could not count employees for status ${statusId}: ${(error as Error).message}`,
      );

      return 0;
    }
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Activate employment status
   */
  async activate(statusId: string): Promise<void> {
    await this.update(statusId, { isActive: true });
  }

  /**
   * Deactivate employment status
   */
  async deactivate(statusId: string): Promise<void> {
    await this.update(statusId, { isActive: false });
  }

  /**
   * Update display order for multiple statuses
   */
  async updateDisplayOrders(
    statusOrders: Array<{ statusId: string; displayOrder: number }>,
  ): Promise<void> {
    this.logger.debug(
      `Updating display orders for ${statusOrders.length} statuses`,
    );

    for (const { statusId, displayOrder } of statusOrders) {
      await this.update(statusId, { displayOrder });
    }
  }
}
