import { Injectable, NotFoundException } from '@nestjs/common';

import { Between, IsNull } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import {
  EMAIL_MESSAGES,
  MKT_EMAIL_LOG_CONTEXT,
} from 'src/mkt-core/email/messages';
import { MktEmailWorkspaceEntity } from 'src/mkt-core/email/objects/mkt-email.workspace-entity';
import {
  FindEmailOptions,
  FindWithPaginationOptions,
  StatusDistributionItem,
} from 'src/mkt-core/email/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktEmailRepository - Data access layer for Email entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktEmail entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Email sending (handled by Service layer)
 */
@Injectable()
export class MktEmailRepository extends BaseWorkspaceRepository<MktEmailWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktEmailWorkspaceEntity,
      `${MKT_EMAIL_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find email by ID
   * @throws NotFoundException if email not found
   */
  async findEmailById(id: string): Promise<MktEmailWorkspaceEntity> {
    this.logger.debug(EMAIL_MESSAGES.LOG.FIND_BY_ID_START(id));

    const email = await this.findById(id);

    if (!email) {
      this.logger.debug(EMAIL_MESSAGES.LOG.FIND_BY_ID_NOT_FOUND(id));
      throw new NotFoundException(EMAIL_MESSAGES.ERROR.EMAIL_NOT_FOUND(id));
    }

    this.logger.debug(EMAIL_MESSAGES.LOG.FIND_BY_ID_SUCCESS(id));

    return email;
  }

  /**
   * Find email by ID (returns null if not found)
   */
  async findByIdOrNull(id: string): Promise<MktEmailWorkspaceEntity | null> {
    return this.findById(id);
  }

  /**
   * Find all emails with pagination
   */
  async findAllEmails(
    options?: FindEmailOptions,
  ): Promise<MktEmailWorkspaceEntity[]> {
    this.logger.debug(EMAIL_MESSAGES.LOG.FIND_ALL_START('current'));

    const repository = await this.getRepository();

    const emails = await repository.find({
      where: { deletedAt: IsNull() },
      take: options?.take,
      skip: options?.skip,
      order: options?.order ?? { createdAt: 'DESC' },
    });

    this.logger.debug(EMAIL_MESSAGES.LOG.FIND_ALL_SUCCESS(emails.length));

    return emails;
  }

  /**
   * Find all email IDs (lightweight operation)
   */
  async findAllIds(): Promise<string[]> {
    const repository = await this.getRepository();

    const results = await repository
      .createQueryBuilder('email')
      .select('email.id', 'id')
      .where('email.deletedAt IS NULL')
      .getRawMany<{ id: string }>();

    return results.map((r) => r.id);
  }

  /**
   * Find emails by recipient
   */
  async findByRecipient(
    to: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktEmailWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { to, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  /**
   * Find emails by status
   */
  async findByStatus(
    status: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktEmailWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { status, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  /**
   * Find emails by email type
   */
  async findByEmailType(
    emailType: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktEmailWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { emailType, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new email record
   */
  async createEmail(
    data: Partial<MktEmailWorkspaceEntity>,
  ): Promise<MktEmailWorkspaceEntity> {
    const repository = await this.getRepository();

    const email = repository.create(data);
    const savedEmail = await repository.save(email);

    this.logger.debug(EMAIL_MESSAGES.LOG.CREATE_SUCCESS(savedEmail.id));

    return savedEmail;
  }

  /**
   * Save email record (alias for create, for backward compatibility)
   */
  async save(
    data: Partial<MktEmailWorkspaceEntity>,
  ): Promise<MktEmailWorkspaceEntity> {
    return this.createEmail(data);
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update email by ID
   */
  async updateEmail(
    id: string,
    data: Partial<MktEmailWorkspaceEntity>,
  ): Promise<void> {
    const repository = await this.getRepository();

    await repository.update(id, {
      ...data,
      updatedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    });

    this.logger.debug(EMAIL_MESSAGES.LOG.UPDATE_SUCCESS(id));
  }

  /**
   * Update and return the updated email
   */
  async updateEmailAndReturn(
    id: string,
    data: Partial<MktEmailWorkspaceEntity>,
  ): Promise<MktEmailWorkspaceEntity> {
    await this.updateEmail(id, data);

    return this.findEmailById(id);
  }

  /**
   * Soft delete email
   */
  async softDeleteEmail(id: string): Promise<void> {
    await this.softDelete(id);

    this.logger.log(EMAIL_MESSAGES.LOG.SOFT_DELETE_SUCCESS(id));
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count all emails
   */
  async countEmails(): Promise<number> {
    return this.count({ deletedAt: IsNull() } as never);
  }

  /**
   * Count emails by status
   */
  async countByStatus(status: string): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: { status, deletedAt: IsNull() },
    });
  }

  /**
   * Count emails by recipient
   */
  async countByRecipient(to: string): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: { to, deletedAt: IsNull() },
    });
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get status distribution statistics
   */
  async getStatusDistribution(): Promise<StatusDistributionItem[]> {
    const repository = await this.getRepository();

    const results = await repository
      .createQueryBuilder('email')
      .select('email.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('email.deletedAt IS NULL')
      .groupBy('email.status')
      .getRawMany();

    return results.map((r) => ({
      status: r.status ?? 'UNKNOWN',
      count: parseInt(r.count, 10) || 0,
    }));
  }

  /**
   * Get emails sent within a date range
   */
  async findSentInRange(
    startDate: Date,
    endDate: Date,
  ): Promise<MktEmailWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        sentAt: Between(startDate, endDate),
        deletedAt: IsNull(),
      },
      order: { sentAt: 'DESC' },
    });
  }
}
