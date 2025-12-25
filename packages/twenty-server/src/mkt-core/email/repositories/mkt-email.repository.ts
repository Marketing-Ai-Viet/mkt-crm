import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
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
export class MktEmailRepository {
  private readonly logger = new Logger(`${MKT_EMAIL_LOG_CONTEXT}:Repository`);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get repository for specific workspace
   * Thread-safe: Uses TwentyORMGlobalManager directly
   */
  async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktEmailWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException(EMAIL_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktEmailWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find email by ID
   */
  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktEmailWorkspaceEntity> {
    this.logger.debug(EMAIL_MESSAGES.LOG.FIND_BY_ID_START(id));

    const repository = await this.getRepository(workspaceId);
    const email = await repository.findOne({ where: { id } });

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
  async findByIdOrNull(
    id: string,
    workspaceId?: string,
  ): Promise<MktEmailWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  /**
   * Find all emails with pagination
   */
  async findAll(
    workspaceId?: string,
    options?: FindEmailOptions,
  ): Promise<MktEmailWorkspaceEntity[]> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    this.logger.debug(EMAIL_MESSAGES.LOG.FIND_ALL_START(wsId ?? 'unknown'));

    const repository = await this.getRepository(workspaceId);

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
  async findAllIds(workspaceId?: string): Promise<string[]> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId?: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktEmailWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const queryBuilder = repository
      .createQueryBuilder('email')
      .where('email.to = :to', { to })
      .andWhere('email.deletedAt IS NULL')
      .orderBy('email.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Find emails by status
   */
  async findByStatus(
    status: string,
    workspaceId?: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktEmailWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const queryBuilder = repository
      .createQueryBuilder('email')
      .where('email.status = :status', { status })
      .andWhere('email.deletedAt IS NULL')
      .orderBy('email.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Find emails by email type
   */
  async findByEmailType(
    emailType: string,
    workspaceId?: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktEmailWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const queryBuilder = repository
      .createQueryBuilder('email')
      .where('email.emailType = :emailType', { emailType })
      .andWhere('email.deletedAt IS NULL')
      .orderBy('email.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getMany();
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new email record
   */
  async create(
    data: Partial<MktEmailWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktEmailWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId?: string,
  ): Promise<MktEmailWorkspaceEntity> {
    return this.create(data, workspaceId);
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update email by ID
   */
  async update(
    id: string,
    data: Partial<MktEmailWorkspaceEntity>,
    workspaceId?: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktEmailWorkspaceEntity',
      { id },
      {
        ...data,
        updatedAt: DateTimeUtils.now().toJSDate(),
      },
    );

    this.logger.debug(EMAIL_MESSAGES.LOG.UPDATE_SUCCESS(id));
  }

  /**
   * Update and return the updated email
   */
  async updateAndReturn(
    id: string,
    data: Partial<MktEmailWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktEmailWorkspaceEntity> {
    await this.update(id, data, workspaceId);

    return this.findById(id, workspaceId);
  }

  /**
   * Soft delete email
   */
  async softDelete(
    id: string,
    workspaceId?: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktEmailWorkspaceEntity', id);

    this.logger.log(EMAIL_MESSAGES.LOG.SOFT_DELETE_SUCCESS(id));
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count all emails
   */
  async count(workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where: { deletedAt: IsNull() } });
  }

  /**
   * Count emails by status
   */
  async countByStatus(status: string, workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { status, deletedAt: IsNull() },
    });
  }

  /**
   * Count emails by recipient
   */
  async countByRecipient(to: string, workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

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
  async getStatusDistribution(
    workspaceId?: string,
  ): Promise<StatusDistributionItem[]> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId?: string,
  ): Promise<MktEmailWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('email')
      .where('email.sentAt >= :startDate', { startDate })
      .andWhere('email.sentAt <= :endDate', { endDate })
      .andWhere('email.deletedAt IS NULL')
      .orderBy('email.sentAt', 'DESC')
      .getMany();
  }
}
