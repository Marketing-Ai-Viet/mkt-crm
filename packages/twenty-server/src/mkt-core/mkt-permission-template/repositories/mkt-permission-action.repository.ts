import { Injectable, Logger } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { PERMISSION_TEMPLATE_LOG_CONTEXT } from 'src/mkt-core/mkt-permission-template/constants';
import { MktPermissionActionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * Repository for MktPermissionActionWorkspaceEntity
 * Handles database operations for permission actions
 */
@Injectable()
export class MktPermissionActionRepository {
  private readonly logger = new Logger(PERMISSION_TEMPLATE_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionActionWorkspaceEntity>(
      workspaceId,
      'mktPermissionAction',
    );
  }

  /**
   * Find action by ID
   */
  async findById(
    workspaceId: string,
    actionId: string,
  ): Promise<MktPermissionActionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        id: actionId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find action by key
   */
  async findByKey(
    workspaceId: string,
    actionKey: string,
  ): Promise<MktPermissionActionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        actionKey,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find all active actions
   */
  async findActive(
    workspaceId: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        actionName: 'ASC',
      },
    });
  }

  /**
   * Find actions by category
   */
  async findByCategory(
    workspaceId: string,
    actionCategory: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        actionCategory,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        actionName: 'ASC',
      },
    });
  }

  /**
   * Find actions by risk level
   */
  async findByRiskLevel(
    workspaceId: string,
    riskLevel: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        riskLevel,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        actionName: 'ASC',
      },
    });
  }

  /**
   * Find system actions
   */
  async findSystemActions(
    workspaceId: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        isSystemAction: true,
        deletedAt: IsNull(),
      },
      order: {
        actionName: 'ASC',
      },
    });
  }

  /**
   * Find actions requiring approval
   */
  async findRequiringApproval(
    workspaceId: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        requiresApproval: true,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        riskLevel: 'DESC',
        actionName: 'ASC',
      },
    });
  }

  /**
   * Check if action key exists
   */
  async keyExists(
    workspaceId: string,
    actionKey: string,
    excludeId?: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const query = repository
      .createQueryBuilder('action')
      .where('action.actionKey = :actionKey', { actionKey })
      .andWhere('action.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('action.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();

    return count > 0;
  }

  /**
   * Create a new action
   */
  async create(
    workspaceId: string,
    data: Partial<MktPermissionActionWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<MktPermissionActionWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const action = repository.create(data);

    let savedAction: MktPermissionActionWorkspaceEntity;

    if (queryRunner) {
      savedAction = await queryRunner.manager.save(action);
    } else {
      savedAction = await repository.save(action);
    }

    this.logger.log(`Created action ${savedAction.actionKey}`);

    return savedAction;
  }

  /**
   * Update action
   */
  async update(
    workspaceId: string,
    actionId: string,
    data: Partial<MktPermissionActionWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktPermissionActionWorkspaceEntity',
      { id: actionId },
      data,
    );

    this.logger.log(`Updated action ${actionId}`);
  }

  /**
   * Update action status
   */
  async updateStatus(
    workspaceId: string,
    actionId: string,
    isActive: boolean,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    await this.update(workspaceId, actionId, { isActive }, queryRunner);
  }

  /**
   * Soft delete action
   */
  async softDelete(
    workspaceId: string,
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktPermissionActionWorkspaceEntity', id);

    this.logger.log(`Soft deleted action ${id}`);
  }
}
