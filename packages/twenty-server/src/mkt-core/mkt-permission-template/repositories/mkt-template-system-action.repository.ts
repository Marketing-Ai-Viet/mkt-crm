import { Injectable, Logger } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { PERMISSION_TEMPLATE_LOG_CONTEXT } from 'src/mkt-core/mkt-permission-template/constants';
import { MktTemplateSystemActionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * Repository for MktTemplateSystemActionWorkspaceEntity
 * Handles database operations for template system actions
 */
@Injectable()
export class MktTemplateSystemActionRepository {
  private readonly logger = new Logger(PERMISSION_TEMPLATE_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktTemplateSystemActionWorkspaceEntity>(
      workspaceId,
      'mktTemplateSystemAction',
    );
  }

  /**
   * Find system action by ID
   */
  async findById(
    workspaceId: string,
    systemActionId: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        id: systemActionId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find all system actions for a template
   */
  async findByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        templateId,
        deletedAt: IsNull(),
      },
      order: {
        actionKey: 'ASC',
      },
    });
  }

  /**
   * Find active system actions for a template
   */
  async findActiveByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        templateId,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        actionKey: 'ASC',
      },
    });
  }

  /**
   * Find allowed system actions for a template
   */
  async findAllowedByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        templateId,
        isAllowed: true,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        actionKey: 'ASC',
      },
    });
  }

  /**
   * Find system action by template and action key
   */
  async findByTemplateAndActionKey(
    workspaceId: string,
    templateId: string,
    actionKey: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        templateId,
        actionKey,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Create a new system action
   */
  async create(
    workspaceId: string,
    data: Partial<MktTemplateSystemActionWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<MktTemplateSystemActionWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const systemAction = repository.create(data);

    let savedSystemAction: MktTemplateSystemActionWorkspaceEntity;

    if (queryRunner) {
      savedSystemAction = await queryRunner.manager.save(systemAction);
    } else {
      savedSystemAction = await repository.save(systemAction);
    }

    this.logger.log(
      `Created system action ${savedSystemAction.actionKey} for template ${savedSystemAction.templateId}`,
    );

    return savedSystemAction;
  }

  /**
   * Create multiple system actions at once
   */
  async createMany(
    workspaceId: string,
    systemActionsData: Array<Partial<MktTemplateSystemActionWorkspaceEntity>>,
    queryRunner?: QueryRunner,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    if (systemActionsData.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    const systemActions = systemActionsData.map((data) =>
      repository.create(data),
    );

    let savedSystemActions: MktTemplateSystemActionWorkspaceEntity[];

    if (queryRunner) {
      savedSystemActions = await queryRunner.manager.save(systemActions);
    } else {
      savedSystemActions = await repository.save(systemActions);
    }

    this.logger.log(
      `Created ${savedSystemActions.length} system actions in bulk`,
    );

    return savedSystemActions;
  }

  /**
   * Update system action
   */
  async update(
    workspaceId: string,
    systemActionId: string,
    data: Partial<MktTemplateSystemActionWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktTemplateSystemActionWorkspaceEntity',
      { id: systemActionId },
      data,
    );

    this.logger.log(`Updated system action ${systemActionId}`);
  }

  /**
   * Update system action status
   */
  async updateStatus(
    workspaceId: string,
    systemActionId: string,
    isActive: boolean,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    await this.update(workspaceId, systemActionId, { isActive }, queryRunner);
  }

  /**
   * Update system action permission
   */
  async updatePermission(
    workspaceId: string,
    systemActionId: string,
    isAllowed: boolean,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    await this.update(workspaceId, systemActionId, { isAllowed }, queryRunner);
  }

  /**
   * Delete system actions by template ID
   */
  async deleteByTemplateId(
    workspaceId: string,
    templateId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.delete('MktTemplateSystemActionWorkspaceEntity', {
      templateId,
    });

    this.logger.log(`Deleted all system actions for template ${templateId}`);
  }

  /**
   * Soft delete system action
   */
  async softDelete(
    workspaceId: string,
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktTemplateSystemActionWorkspaceEntity', id);

    this.logger.log(`Soft deleted system action ${id}`);
  }
}
