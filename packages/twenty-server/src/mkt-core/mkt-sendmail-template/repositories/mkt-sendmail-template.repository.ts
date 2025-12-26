import { Injectable, Logger } from '@nestjs/common';

import { APP_LOCALES } from 'twenty-shared/translations';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktSendmailTemplateWorkspaceEntity } from 'src/mkt-core/mkt-sendmail-template/workspace-entity/mkt-sendmail-template.workpace-entity';

const LOG_CONTEXT = 'MktSendmailTemplate:Repository';

/**
 * MktSendmailTemplateRepository - Data access layer for MktSendmailTemplate entity
 *
 * Responsibilities:
 * - Database operations for MktSendmailTemplateWorkspaceEntity
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktSendmailTemplateRepository {
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
  ): Promise<WorkspaceRepository<MktSendmailTemplateWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktSendmailTemplateWorkspaceEntity,
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
  ): Promise<MktSendmailTemplateWorkspaceEntity | null> {
    this.logger.debug(`Finding sendmail template by ID: ${templateId}`);

    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id: templateId },
    });
  }

  /**
   * Find template by type and language
   * Primary lookup method for email sending
   */
  async findByTypeAndLanguage(
    workspaceId: string,
    type: string,
    language: keyof typeof APP_LOCALES,
  ): Promise<MktSendmailTemplateWorkspaceEntity | null> {
    this.logger.debug(
      `Finding sendmail template by type: ${type}, language: ${language}`,
    );

    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { type, language },
    });
  }

  /**
   * Find all templates by type
   */
  async findByType(
    workspaceId: string,
    type: string,
  ): Promise<MktSendmailTemplateWorkspaceEntity[]> {
    this.logger.debug(`Finding sendmail templates by type: ${type}`);

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { type },
    });
  }

  /**
   * Find all templates by language
   */
  async findByLanguage(
    workspaceId: string,
    language: keyof typeof APP_LOCALES,
  ): Promise<MktSendmailTemplateWorkspaceEntity[]> {
    this.logger.debug(`Finding sendmail templates by language: ${language}`);

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { language },
    });
  }

  /**
   * Find all templates
   */
  async findAll(
    workspaceId: string,
  ): Promise<MktSendmailTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      order: { type: 'ASC', language: 'ASC' },
    });
  }

  // ============================================
  // CREATE/UPDATE OPERATIONS
  // ============================================

  /**
   * Create new sendmail template
   */
  async create(
    workspaceId: string,
    data: Partial<MktSendmailTemplateWorkspaceEntity>,
  ): Promise<MktSendmailTemplateWorkspaceEntity> {
    this.logger.log(`Creating sendmail template: ${data.name}`);

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
    data: Partial<MktSendmailTemplateWorkspaceEntity>,
  ): Promise<void> {
    this.logger.log(`Updating sendmail template: ${templateId}`);

    const repository = await this.getRepository(workspaceId);

    await repository.update(templateId, data);
  }

  /**
   * Upsert template by type and language
   * Creates if not exists, updates if exists
   */
  async upsert(
    workspaceId: string,
    type: string,
    language: keyof typeof APP_LOCALES,
    data: Partial<MktSendmailTemplateWorkspaceEntity>,
  ): Promise<MktSendmailTemplateWorkspaceEntity> {
    const existing = await this.findByTypeAndLanguage(
      workspaceId,
      type,
      language,
    );

    if (existing) {
      await this.update(workspaceId, existing.id, data);

      return { ...existing, ...data } as MktSendmailTemplateWorkspaceEntity;
    }

    return this.create(workspaceId, { ...data, type, language });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete template
   */
  async softDelete(workspaceId: string, templateId: string): Promise<void> {
    this.logger.warn(`Soft deleting sendmail template: ${templateId}`);

    const repository = await this.getRepository(workspaceId);

    await repository.softDelete(templateId);
  }

  // ============================================
  // EXISTENCE CHECKS
  // ============================================

  /**
   * Check if template exists by type and language
   */
  async exists(
    workspaceId: string,
    type: string,
    language: keyof typeof APP_LOCALES,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: { type, language },
    });

    return count > 0;
  }
}
