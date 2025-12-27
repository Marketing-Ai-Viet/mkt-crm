import { Injectable, Logger } from '@nestjs/common';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {
  MktTemplateType,
  MktTemplateWorkspaceEntity,
} from 'src/mkt-core/mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity';

const LOG_CONTEXT = 'MktTemplate:Repository';

type FindOptions = {
  limit?: number;
  offset?: number;
  isActive?: boolean;
};

type CreateTemplateData = Partial<MktTemplateWorkspaceEntity>;

type UpdateTemplateData = Partial<MktTemplateWorkspaceEntity>;

/**
 * MktTemplateRepository - Unified data access layer for MktTemplate entity
 *
 * Responsibilities:
 * - Database operations for MktTemplateWorkspaceEntity
 * - Email template operations (previously in MktSendmailTemplateRepository)
 * - General template operations (invoice, contract, etc.)
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
  // EMAIL TEMPLATE OPERATIONS
  // (Migrated from MktSendmailTemplateRepository)
  // ============================================

  /**
   * Find email template by type and locale
   * Primary lookup method for email sending
   * Replaces: MktSendmailTemplateRepository.findByTypeAndLanguage
   */
  async findEmailTemplate(
    workspaceId: string,
    type: MktTemplateType,
    locale: string,
  ): Promise<MktTemplateWorkspaceEntity | null> {
    this.logger.debug(
      `Finding email template by type: ${type}, locale: ${locale}`,
    );

    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { type, locale, isActive: true },
    });
  }

  /**
   * Find all email templates by type
   */
  async findEmailTemplatesByType(
    workspaceId: string,
    type: MktTemplateType,
  ): Promise<MktTemplateWorkspaceEntity[]> {
    this.logger.debug(`Finding email templates by type: ${type}`);

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { type, isActive: true },
      order: { locale: 'ASC' },
    });
  }

  /**
   * Find all templates by locale
   */
  async findByLocale(
    workspaceId: string,
    locale: string,
  ): Promise<MktTemplateWorkspaceEntity[]> {
    this.logger.debug(`Finding templates by locale: ${locale}`);

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { locale, isActive: true },
    });
  }

  // ============================================
  // GENERAL FIND OPERATIONS
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
   * Find templates by type
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
    options?: FindOptions,
  ): Promise<MktTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const where: Record<string, unknown> = {};

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return repository.find({
      where,
      order: { type: 'ASC', locale: 'ASC', position: 'ASC' },
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
    data: CreateTemplateData,
  ): Promise<MktTemplateWorkspaceEntity> {
    this.logger.log(`Creating template: ${data.name}`);

    const repository = await this.getRepository(workspaceId);
    const template = repository.create({
      ...data,
      isActive: data.isActive ?? true,
    });

    return repository.save(template);
  }

  /**
   * Update template by ID
   */
  async update(
    workspaceId: string,
    templateId: string,
    data: UpdateTemplateData,
  ): Promise<void> {
    this.logger.log(`Updating template: ${templateId}`);

    const repository = await this.getRepository(workspaceId);

    await repository.update(templateId, data);
  }

  /**
   * Upsert template by type and locale
   * Creates if not exists, updates if exists
   * Migrated from MktSendmailTemplateRepository.upsert
   */
  async upsertByTypeAndLocale(
    workspaceId: string,
    type: string,
    locale: string,
    data: UpdateTemplateData,
  ): Promise<MktTemplateWorkspaceEntity> {
    const existing = await this.findByTypeAndLocale(workspaceId, type, locale);

    if (existing) {
      await this.update(workspaceId, existing.id, data);

      return { ...existing, ...data } as MktTemplateWorkspaceEntity;
    }

    return this.create(workspaceId, { ...data, type, locale });
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

  /**
   * Deactivate template (set isActive to false)
   */
  async deactivate(workspaceId: string, templateId: string): Promise<void> {
    this.logger.log(`Deactivating template: ${templateId}`);

    await this.update(workspaceId, templateId, { isActive: false });
  }

  /**
   * Activate template (set isActive to true)
   */
  async activate(workspaceId: string, templateId: string): Promise<void> {
    this.logger.log(`Activating template: ${templateId}`);

    await this.update(workspaceId, templateId, { isActive: true });
  }

  // ============================================
  // EXISTENCE CHECKS
  // ============================================

  /**
   * Check if template exists by type and locale
   * Migrated from MktSendmailTemplateRepository.exists
   */
  async exists(
    workspaceId: string,
    type: string,
    locale: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: { type, locale },
    });

    return count > 0;
  }

  /**
   * Count templates by type
   */
  async countByType(workspaceId: string, type: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { type },
    });
  }
}
