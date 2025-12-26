import { Injectable, Logger } from '@nestjs/common';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity';

const LOG_CONTEXT = 'MktTemplate:Repository';

/**
 * MktTemplateRepository - Data access layer for MktTemplate entity
 *
 * Responsibilities:
 * - Database operations for MktTemplateWorkspaceEntity
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktTemplateRepository {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get repository for specific workspace
   */
  async getRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktTemplateWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktTemplateWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find template by ID
   */
  async findById(
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateWorkspaceEntity | null> {
    this.logger.debug(`Finding template by ID: ${templateId}`);

    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id: templateId },
    });
  }

  /**
   * Find template by template key
   */
  async findByKey(
    workspaceId: string,
    templateKey: string,
  ): Promise<MktTemplateWorkspaceEntity | null> {
    this.logger.debug(`Finding template by key: ${templateKey}`);

    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { templateKey },
    });
  }

  /**
   * Find template by type
   */
  async findByType(
    workspaceId: string,
    type: string,
  ): Promise<MktTemplateWorkspaceEntity[]> {
    this.logger.debug(`Finding templates by type: ${type}`);

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { type },
      order: { position: 'ASC' },
    });
  }

  /**
   * Find template by type and locale
   */
  async findByTypeAndLocale(
    workspaceId: string,
    type: string,
    locale: string,
  ): Promise<MktTemplateWorkspaceEntity | null> {
    this.logger.debug(`Finding template by type: ${type}, locale: ${locale}`);

    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { type, locale },
    });
  }

  /**
   * Find all templates
   */
  async findAll(
    workspaceId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<MktTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      order: { position: 'ASC' },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  // ============================================
  // CREATE/UPDATE OPERATIONS
  // ============================================

  /**
   * Create new template
   */
  async create(
    workspaceId: string,
    data: Partial<MktTemplateWorkspaceEntity>,
  ): Promise<MktTemplateWorkspaceEntity> {
    this.logger.log(`Creating template: ${data.name}`);

    const repository = await this.getRepository(workspaceId);
    const template = repository.create(data);

    return repository.save(template);
  }

  /**
   * Update template by ID
   */
  async update(
    workspaceId: string,
    templateId: string,
    data: Partial<MktTemplateWorkspaceEntity>,
  ): Promise<void> {
    this.logger.log(`Updating template: ${templateId}`);

    const repository = await this.getRepository(workspaceId);

    await repository.update(templateId, data);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete template
   */
  async softDelete(workspaceId: string, templateId: string): Promise<void> {
    this.logger.warn(`Soft deleting template: ${templateId}`);

    const repository = await this.getRepository(workspaceId);

    await repository.softDelete(templateId);
  }
}
