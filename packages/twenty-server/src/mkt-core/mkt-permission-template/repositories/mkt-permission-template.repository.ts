import { Injectable, Logger } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { PERMISSION_TEMPLATE_LOG_CONTEXT } from 'src/mkt-core/mkt-permission-template/constants';
import {
  MktPermissionTemplateWorkspaceEntity,
  PermissionTemplateType,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * Repository for MktPermissionTemplateWorkspaceEntity
 * Handles database operations for permission templates
 */
@Injectable()
export class MktPermissionTemplateRepository {
  private readonly logger = new Logger(PERMISSION_TEMPLATE_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionTemplateWorkspaceEntity>(
      workspaceId,
      'mktPermissionTemplate',
    );
  }

  /**
   * Find template by ID
   */
  async findById(
    workspaceId: string,
    templateId: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        id: templateId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find template by key
   */
  async findByKey(
    workspaceId: string,
    templateKey: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        templateKey,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find active templates
   */
  async findActive(
    workspaceId: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        priority: 'DESC',
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Find templates by hierarchy level
   */
  async findByHierarchyLevel(
    workspaceId: string,
    hierarchyLevel: number,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        hierarchyLevel,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        priority: 'DESC',
      },
    });
  }

  /**
   * Find templates by department type
   */
  async findByDepartmentType(
    workspaceId: string,
    departmentType: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        departmentType,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        priority: 'DESC',
      },
    });
  }

  /**
   * Find templates by type
   */
  async findByTemplateType(
    workspaceId: string,
    templateType: PermissionTemplateType,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        templateType,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        priority: 'DESC',
      },
    });
  }

  /**
   * Find system templates
   */
  async findSystemTemplates(
    workspaceId: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        isSystemTemplate: true,
        deletedAt: IsNull(),
      },
      order: {
        hierarchyLevel: 'ASC',
      },
    });
  }

  /**
   * Find effective templates (considering effectiveFrom/effectiveTo dates)
   */
  async findEffectiveTemplates(
    workspaceId: string,
    atDate?: Date,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);
    const checkDate = atDate ?? new Date();

    return repository
      .createQueryBuilder('template')
      .where('template.isActive = :isActive', { isActive: true })
      .andWhere('template.deletedAt IS NULL')
      .andWhere(
        '(template.effectiveFrom IS NULL OR template.effectiveFrom <= :date)',
        { date: checkDate },
      )
      .andWhere(
        '(template.effectiveTo IS NULL OR template.effectiveTo >= :date)',
        { date: checkDate },
      )
      .orderBy('template.priority', 'DESC')
      .getMany();
  }

  /**
   * Check if template key exists
   */
  async keyExists(
    workspaceId: string,
    templateKey: string,
    excludeId?: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const query = repository
      .createQueryBuilder('template')
      .where('template.templateKey = :templateKey', { templateKey })
      .andWhere('template.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('template.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();

    return count > 0;
  }

  /**
   * Create a new template
   */
  async create(
    workspaceId: string,
    data: Partial<MktPermissionTemplateWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<MktPermissionTemplateWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const template = repository.create(data);

    let savedTemplate: MktPermissionTemplateWorkspaceEntity;

    if (queryRunner) {
      savedTemplate = await queryRunner.manager.save(template);
    } else {
      savedTemplate = await repository.save(template);
    }

    this.logger.log(`Created template ${savedTemplate.templateKey}`);

    return savedTemplate;
  }

  /**
   * Update template
   */
  async update(
    workspaceId: string,
    templateId: string,
    data: Partial<MktPermissionTemplateWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktPermissionTemplateWorkspaceEntity',
      { id: templateId },
      data,
    );

    this.logger.log(`Updated template ${templateId}`);
  }

  /**
   * Update template status
   */
  async updateStatus(
    workspaceId: string,
    templateId: string,
    isActive: boolean,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    await this.update(workspaceId, templateId, { isActive }, queryRunner);
  }

  /**
   * Soft delete template
   */
  async softDelete(
    workspaceId: string,
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktPermissionTemplateWorkspaceEntity', id);

    this.logger.log(`Soft deleted template ${id}`);
  }
}
