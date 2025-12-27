import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { ACCOUNT_PROVIDER } from 'src/mkt-core/customer/constants/linked-account.constants';
import {
  CUSTOMER_MESSAGES,
  MKT_CUSTOMER_LOG_CONTEXT,
} from 'src/mkt-core/customer/messages';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { FindCustomerOptions } from 'src/mkt-core/customer/types';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktCustomerRepository - Data access layer for Customer entity
 *
 * Responsibilities:
 * - Database operations for MktCustomer entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Validation (handled by Hook layer)
 */
@Injectable()
export class MktCustomerRepository {
  private readonly logger = new Logger(
    `${MKT_CUSTOMER_LOG_CONTEXT}:Repository`,
  );

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
  ): Promise<WorkspaceRepository<MktCustomerWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException(CUSTOMER_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktCustomerWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find customer by ID
   */
  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity> {
    this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_BY_ID_START(id));

    const repository = await this.getRepository(workspaceId);
    const customer = await repository.findOne({ where: { id } });

    if (!customer) {
      this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_BY_ID_NOT_FOUND(id));
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(id),
      );
    }

    this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_BY_ID_SUCCESS(id));

    return customer;
  }

  /**
   * Find customer by ID (returns null if not found)
   */
  async findByIdOrNull(
    id: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  /**
   * Find customer by email
   */
  async findByEmail(
    email: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { email } });
  }

  /**
   * Find all customers with pagination
   */
  async findAll(
    workspaceId?: string,
    options?: FindCustomerOptions,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_ALL_START(wsId ?? 'unknown'));

    const repository = await this.getRepository(workspaceId);

    const customers = await repository.find({
      where: { deletedAt: IsNull() },
      take: options?.take,
      skip: options?.skip,
      order: options?.order ?? { createdAt: 'ASC' },
    });

    this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_ALL_SUCCESS(customers.length));

    return customers;
  }

  /**
   * Find all customer IDs (lightweight operation)
   */
  async findAllIds(workspaceId?: string): Promise<string[]> {
    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('customer')
      .select('customer.id', 'id')
      .where('customer.deletedAt IS NULL')
      .getRawMany<{ id: string }>();

    return results.map((r) => r.id);
  }

  /**
   * Find customers by tier
   */
  async findByTier(
    tier: string,
    workspaceId?: string,
    options?: { limit?: number; offset?: number },
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const queryBuilder = repository
      .createQueryBuilder('customer')
      .where('customer.tier = :tier', { tier })
      .andWhere('customer.deletedAt IS NULL')
      .orderBy('customer.totalOrderValue', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Find customer by linked account (searches JSONB array)
   * @param provider - Account provider (MKT_SERVER, GOOGLE, etc.)
   * @param externalId - External account ID on the provider
   */
  async findByLinkedAccount(
    provider: string,
    externalId: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    // Use JSONB query to find customer with matching linked account
    const customer = await repository
      .createQueryBuilder('customer')
      .where('customer.deletedAt IS NULL')
      .andWhere(`customer."linkedAccounts" @> :accountFilter::jsonb`, {
        accountFilter: JSON.stringify([{ provider, externalId }]),
      })
      .getOne();

    return customer;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update customer by ID
   * Pattern: Follow mkt-promotion repository pattern with manager.update()
   */
  async update(
    id: string,
    data: Partial<MktCustomerWorkspaceEntity>,
    workspaceId?: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktCustomerWorkspaceEntity',
      { id },
      {
        ...data,
        updatedAt: DateTimeUtils.now().toJSDate(),
      },
    );
  }

  /**
   * Update and return the updated customer
   */
  async updateAndReturn(
    id: string,
    data: Partial<MktCustomerWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity> {
    await this.update(id, data, workspaceId);

    return this.findById(id, workspaceId);
  }

  /**
   * Soft delete customer
   */
  async softDelete(
    id: string,
    workspaceId?: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktCustomerWorkspaceEntity', id);

    this.logger.log(`Soft deleted customer ${id}`);
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count all customers
   */
  async count(workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where: { deletedAt: IsNull() } });
  }

  /**
   * Count customers by account owner
   */
  async countByAccountOwner(
    accountOwnerId: string,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { accountOwnerId, deletedAt: IsNull() },
    });
  }

  /**
   * Count customers by createdBy workspaceMemberId
   * Used for auto-assign load balancing
   */
  async countByCreatedByMember(
    workspaceMemberId: string,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('customer')
      .where("customer.createdBy->>'workspaceMemberId' = :memberId", {
        memberId: workspaceMemberId,
      })
      .andWhere('customer.deletedAt IS NULL')
      .getCount();
  }

  /**
   * Batch count customers by multiple createdBy workspaceMemberIds
   * Returns a Map of memberId -> count
   * Used for auto-assign load balancing (prevents N+1 queries)
   */
  async countByCreatedByMemberIds(
    workspaceMemberIds: string[],
    workspaceId?: string,
  ): Promise<Map<string, number>> {
    if (workspaceMemberIds.length === 0) {
      return new Map();
    }

    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('customer')
      .select("customer.createdBy->>'workspaceMemberId'", 'memberId')
      .addSelect('COUNT(*)', 'count')
      .where("customer.createdBy->>'workspaceMemberId' IN (:...memberIds)", {
        memberIds: workspaceMemberIds,
      })
      .andWhere('customer.deletedAt IS NULL')
      .groupBy("customer.createdBy->>'workspaceMemberId'")
      .getRawMany();

    const countMap = new Map<string, number>();

    // Initialize all member IDs with 0
    for (const memberId of workspaceMemberIds) {
      countMap.set(memberId, 0);
    }

    // Set actual counts from results
    for (const result of results) {
      countMap.set(result.memberId, parseInt(result.count, 10));
    }

    return countMap;
  }

  /**
   * Count assigned customers (customers with createdBy set)
   */
  async countAssigned(workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('customer')
      .where('customer.createdBy IS NOT NULL')
      .andWhere('customer.deletedAt IS NULL')
      .getCount();
  }

  // ============================================
  // CODE GENERATION HELPERS
  // ============================================

  /**
   * Check if customer code exists
   */
  async isCodeExists(
    customerCode: string,
    workspaceId?: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository
      .createQueryBuilder('customer')
      .where('customer.mktCustomerCode = :customerCode', { customerCode })
      .getCount();

    return count > 0;
  }

  /**
   * Find last customer code with prefix
   */
  async findLastCodeWithPrefix(
    prefix: string,
    workspaceId?: string,
  ): Promise<string | null> {
    const repository = await this.getRepository(workspaceId);

    const customer = await repository
      .createQueryBuilder('customer')
      .where('customer.mktCustomerCode LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('customer.mktCustomerCode', 'DESC')
      .getOne();

    return customer?.mktCustomerCode ?? null;
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get tier distribution statistics
   * Single query for all tier counts
   */
  async getTierDistribution(
    workspaceId?: string,
  ): Promise<Array<{ tier: string; count: number }>> {
    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('customer')
      .select('customer.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where('customer.deletedAt IS NULL')
      .groupBy('customer.tier')
      .getRawMany();

    return results.map((r) => ({
      tier: r.tier ?? 'UNKNOWN',
      count: parseInt(r.count, 10) || 0,
    }));
  }

  /**
   * Get total order value sum for all customers
   */
  async getTotalOrderValueSum(workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('customer')
      .select('COALESCE(SUM(customer.totalOrderValue), 0)', 'total')
      .where('customer.deletedAt IS NULL')
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0') || 0;
  }

  // ============================================
  // BULK TIER UPDATE OPERATIONS
  // ============================================

  /**
   * Find customers with pagination for batch processing
   * Returns customers ordered by createdAt for consistent batch processing
   */
  async findAllWithPagination(
    workspaceId: string,
    options: { take: number; skip: number },
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktCustomerWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    return repository
      .createQueryBuilder('customer')
      .where('customer.deletedAt IS NULL')
      .orderBy('customer.createdAt', 'ASC')
      .skip(options.skip)
      .take(options.take)
      .getMany();
  }

  /**
   * Bulk update customer tier data
   * Uses single update statement per customer for safety
   *
   * @param workspaceId - Workspace ID
   * @param updates - Array of tier updates { customerId, tier, totalOrderValue, totalOrderCount }
   * @returns Number of successfully updated customers
   */
  async bulkUpdateTiers(
    workspaceId: string,
    updates: Array<{
      customerId: string;
      tier: string;
      totalOrderValue: number;
      totalOrderCount: number;
    }>,
  ): Promise<number> {
    if (updates.length === 0) {
      return 0;
    }

    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktCustomerWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    let successCount = 0;

    for (const update of updates) {
      try {
        await repository.update(update.customerId, {
          tier: update.tier,
          totalOrderValue: update.totalOrderValue,
          totalOrderCount: update.totalOrderCount,
        });

        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to update tier for customer ${update.customerId}:`,
          error,
        );
      }
    }

    this.logger.debug(
      `Bulk updated ${successCount}/${updates.length} customer tiers`,
    );

    return successCount;
  }

  /**
   * Get customer names by IDs
   * Lightweight operation for bulk tier calculation
   */
  async getCustomerNamesByIds(
    workspaceId: string,
    customerIds: string[],
  ): Promise<Map<string, string>> {
    if (customerIds.length === 0) {
      return new Map();
    }

    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktCustomerWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const customers = await repository
      .createQueryBuilder('customer')
      .select(['customer.id', 'customer.name'])
      .where('customer.id IN (:...ids)', { ids: customerIds })
      .getMany();

    return new Map(customers.map((c) => [c.id, c.name ?? '']));
  }

  // ============================================
  // BULK UPDATE OPERATIONS (DOWNGRADE POLICY)
  // ============================================

  /**
   * Bulk update customers by IDs with same data
   * Used for batch operations like updating lastTierUpgradeAt
   */
  async bulkUpdate(
    workspaceId: string,
    customerIds: string[],
    data: Partial<MktCustomerWorkspaceEntity>,
  ): Promise<number> {
    if (customerIds.length === 0) {
      return 0;
    }

    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktCustomerWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    let successCount = 0;

    for (const customerId of customerIds) {
      try {
        // Convert Date fields to ISO strings for TypeORM compatibility
        const updateData: Record<string, unknown> = { ...data };

        for (const [key, value] of Object.entries(updateData)) {
          if (value instanceof Date) {
            updateData[key] = value.toISOString();
          }
        }

        await repository.update(customerId, updateData);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to bulk update customer ${customerId}:`,
          error,
        );
      }
    }

    this.logger.debug(
      `Bulk updated ${successCount}/${customerIds.length} customers`,
    );

    return successCount;
  }

  /**
   * Get customers with tier and lastTierUpgradeAt for downgrade policy check
   */
  async getCustomersForDowngradeCheck(
    workspaceId: string,
    customerIds: string[],
  ): Promise<
    Array<{
      id: string;
      tier: string | null;
      lastTierUpgradeAt: Date | null;
      lastPurchase: Date | null;
    }>
  > {
    if (customerIds.length === 0) {
      return [];
    }

    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktCustomerWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const customers = await repository
      .createQueryBuilder('customer')
      .select([
        'customer.id',
        'customer.tier',
        'customer.lastTierUpgradeAt',
        'customer.lastPurchase',
      ])
      .where('customer.id IN (:...ids)', { ids: customerIds })
      .getMany();

    return customers.map((c) => ({
      id: c.id,
      tier: c.tier,
      lastTierUpgradeAt: c.lastTierUpgradeAt ?? null,
      lastPurchase: c.lastPurchase ?? null,
    }));
  }

  // ============================================
  // LINKED ACCOUNT HELPERS
  // ============================================

  /**
   * Extract MKT_SERVER email from linkedAccounts
   * Falls back to customer email if no MKT_SERVER account found
   *
   * Priority:
   * 1. Primary MKT_SERVER account email
   * 2. Any MKT_SERVER account with email
   * 3. Fallback email (usually customer.email)
   *
   * @param linkedAccounts - Array of linked accounts from customer
   * @param fallbackEmail - Fallback email if no MKT_SERVER account found
   * @returns Email string (empty string if no email found)
   */
  extractMktServerEmail(
    linkedAccounts: LinkedAccount[] | null | undefined,
    fallbackEmail: string | null,
  ): string {
    if (!linkedAccounts || linkedAccounts.length === 0) {
      return fallbackEmail ?? '';
    }

    // Find primary MKT_SERVER account first
    const primaryMktAccount = linkedAccounts.find(
      (account) =>
        account.provider === ACCOUNT_PROVIDER.MKT_SERVER && account.isPrimary,
    );

    if (primaryMktAccount?.email) {
      return primaryMktAccount.email;
    }

    // Fall back to any active MKT_SERVER account
    const anyMktAccount = linkedAccounts.find(
      (account) =>
        account.provider === ACCOUNT_PROVIDER.MKT_SERVER && account.email,
    );

    if (anyMktAccount?.email) {
      return anyMktAccount.email;
    }

    // Fall back to customer email
    return fallbackEmail ?? '';
  }
}
