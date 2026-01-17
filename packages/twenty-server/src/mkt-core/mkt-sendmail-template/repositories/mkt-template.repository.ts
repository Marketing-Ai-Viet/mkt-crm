import { Injectable } from '@nestjs/common';

import { DeepPartial } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
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

/**
 * MktTemplateRepository - Unified data access layer for MktTemplate entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktTemplateWorkspaceEntity
 * - Email template operations (previously in MktSendmailTemplateRepository)
 * - General template operations (invoice, contract, etc.)
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktTemplateRepository extends BaseWorkspaceRepository<MktTemplateWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktTemplateWorkspaceEntity,
      LOG_CONTEXT,
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
   * Find template by template key
   */
  async findByKey(
    templateKey: string,
  ): Promise<MktTemplateWorkspaceEntity | null> {
    this.logger.debug(`Finding template by key: ${templateKey}`);

    return this.findOne({ templateKey });
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
    type: string,
    locale: string,
  ): Promise<MktTemplateWorkspaceEntity | null> {
    this.logger.debug(`Finding template by type: ${type}, locale: ${locale}`);

    return this.findOne({ type, locale });
  }

  /**
   * Find all templates with options
   */
  async findAllWithOptions(
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
  async createEntity(
    data: DeepPartial<MktTemplateWorkspaceEntity>,
  ): Promise<MktTemplateWorkspaceEntity> {
    this.logger.log(`Creating template: ${data.name}`);

    const repository = await this.getRepository();
    const template = repository.create({
      ...data,
      isActive: data.isActive ?? true,
    });

    return repository.save(template);
  }

  /**
   * Upsert template by type and locale
   * Creates if not exists, updates if exists
   * Migrated from MktSendmailTemplateRepository.upsert
   */
  async upsertByTypeAndLocale(
    type: string,
    locale: string,
    data: DeepPartial<MktTemplateWorkspaceEntity>,
  ): Promise<MktTemplateWorkspaceEntity> {
    const existing = await this.findByTypeAndLocale(type, locale);

    if (existing) {
      await this.update(existing.id, data);

      return { ...existing, ...data } as MktTemplateWorkspaceEntity;
    }

    return this.createEntity({ ...data, type, locale });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Deactivate template (set isActive to false)
   */
  async deactivate(templateId: string): Promise<void> {
    this.logger.log(`Deactivating template: ${templateId}`);

    await this.update(templateId, { isActive: false });
  }

  /**
   * Activate template (set isActive to true)
   */
  async activate(templateId: string): Promise<void> {
    this.logger.log(`Activating template: ${templateId}`);

    await this.update(templateId, { isActive: true });
  }

  // ============================================
  // EXISTENCE CHECKS
  // ============================================

  /**
   * Check if template exists by type and locale
   * Migrated from MktSendmailTemplateRepository.exists
   */
  async existsByTypeAndLocale(type: string, locale: string): Promise<boolean> {
    return this.existsWhere({ type, locale });
  }

  /**
   * Count templates by type
   */
  async countByType(type: string): Promise<number> {
    return this.count({ type });
  }
}
