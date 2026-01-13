import { Injectable, NotFoundException } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories/base-workspace.repository';
import {
  ACCOUNT_PROVIDER,
  LINKED_ACCOUNT_STATUS,
} from 'src/mkt-core/customer/constants/linked-account.constants';
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
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * WorkspaceId can be:
 * - Omitted: resolved from scoped context (for request handlers)
 * - Provided explicitly: for batch jobs running outside request context
 */
@Injectable()
export class MktCustomerRepository extends BaseWorkspaceRepository<MktCustomerWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktCustomerWorkspaceEntity,
      `${MKT_CUSTOMER_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // WORKSPACE ID HELPER
  // ============================================

  /**
   * Resolve workspace ID from provided value or scoped context
   */
  private resolveWorkspaceId(workspaceId?: string): string {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException(CUSTOMER_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }

    return wsId;
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find customer by ID
   * @throws NotFoundException if customer not found
   */
  async findCustomerById(
    id: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity> {
    this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_BY_ID_START(id));

    const wsId = this.resolveWorkspaceId(workspaceId);
    const customer = await this.findById(wsId, id);

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
    const wsId = this.resolveWorkspaceId(workspaceId);

    return this.findById(wsId, id);
  }

  /**
   * Find customer by email
   */
  async findByEmail(
    email: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    const wsId = this.resolveWorkspaceId(workspaceId);

    return this.findOne(wsId, { email } as never);
  }

  /**
   * Find all customers with pagination
   */
  async findAllCustomers(
    workspaceId?: string,
    options?: FindCustomerOptions,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const wsId = this.resolveWorkspaceId(workspaceId);

    this.logger.debug(CUSTOMER_MESSAGES.LOG.FIND_ALL_START(wsId));

    const repository = await this.getRepository(wsId);

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
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

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
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

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
   */
  async findByLinkedAccount(
    provider: string,
    externalId: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

    return repository
      .createQueryBuilder('customer')
      .where('customer.deletedAt IS NULL')
      .andWhere(`customer."linkedAccounts" @> :accountFilter::jsonb`, {
        accountFilter: JSON.stringify([{ provider, externalId }]),
      })
      .getOne();
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update customer by ID
   */
  async updateCustomer(
    id: string,
    data: Partial<MktCustomerWorkspaceEntity>,
    workspaceId?: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);
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
  async updateCustomerAndReturn(
    id: string,
    data: Partial<MktCustomerWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity> {
    await this.updateCustomer(id, data, workspaceId);

    return this.findCustomerById(id, workspaceId);
  }

  /**
   * Soft delete customer
   */
  async softDeleteCustomer(
    id: string,
    workspaceId?: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);
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
  async countCustomers(workspaceId?: string): Promise<number> {
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

    return repository.count({ where: { deletedAt: IsNull() } });
  }

  /**
   * Count customers by account owner
   */
  async countByAccountOwner(
    accountOwnerId: string,
    workspaceId?: string,
  ): Promise<number> {
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

    return repository.count({
      where: { accountOwnerId, deletedAt: IsNull() } as never,
    });
  }

  /**
   * Count customers by createdBy workspaceMemberId
   */
  async countByCreatedByMember(
    workspaceMemberId: string,
    workspaceId?: string,
  ): Promise<number> {
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

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
   */
  async countByCreatedByMemberIds(
    workspaceMemberIds: string[],
    workspaceId?: string,
  ): Promise<Map<string, number>> {
    if (workspaceMemberIds.length === 0) {
      return new Map();
    }

    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

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

    for (const memberId of workspaceMemberIds) {
      countMap.set(memberId, 0);
    }

    for (const result of results) {
      countMap.set(result.memberId, parseInt(result.count, 10));
    }

    return countMap;
  }

  /**
   * Count assigned customers (customers with createdBy set)
   */
  async countAssigned(workspaceId?: string): Promise<number> {
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

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
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

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
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

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
   */
  async getTierDistribution(
    workspaceId?: string,
  ): Promise<Array<{ tier: string; count: number }>> {
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

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
    const wsId = this.resolveWorkspaceId(workspaceId);
    const repository = await this.getRepository(wsId);

    const result = await repository
      .createQueryBuilder('customer')
      .select('COALESCE(SUM(customer.totalOrderValue), 0)', 'total')
      .where('customer.deletedAt IS NULL')
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0') || 0;
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Find customers with pagination for batch processing
   */
  async findAllWithPagination(
    workspaceId: string,
    options: { take: number; skip: number },
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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

    const repository = await this.getRepository(workspaceId);

    let successCount = 0;

    for (const updateItem of updates) {
      try {
        await repository.update(updateItem.customerId, {
          tier: updateItem.tier,
          totalOrderValue: updateItem.totalOrderValue,
          totalOrderCount: updateItem.totalOrderCount,
        });

        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to update tier for customer ${updateItem.customerId}:`,
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
   */
  async getCustomerNamesByIds(
    workspaceId: string,
    customerIds: string[],
  ): Promise<Map<string, string>> {
    if (customerIds.length === 0) {
      return new Map();
    }

    const repository = await this.getRepository(workspaceId);

    const customers = await repository
      .createQueryBuilder('customer')
      .select(['customer.id', 'customer.name'])
      .where('customer.id IN (:...ids)', { ids: customerIds })
      .getMany();

    return new Map(customers.map((c) => [c.id, c.name ?? '']));
  }

  /**
   * Bulk update customers by IDs with same data
   */
  async bulkUpdateCustomers(
    workspaceId: string,
    customerIds: string[],
    data: Partial<MktCustomerWorkspaceEntity>,
  ): Promise<number> {
    if (customerIds.length === 0) {
      return 0;
    }

    const repository = await this.getRepository(workspaceId);

    let successCount = 0;

    for (const customerId of customerIds) {
      try {
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

    const repository = await this.getRepository(workspaceId);

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
   */
  extractMktServerEmail(
    linkedAccounts: LinkedAccount[] | null | undefined,
    customerId: string,
  ): string {
    if (!linkedAccounts || linkedAccounts.length === 0) {
      throw new Error(
        CUSTOMER_MESSAGES.ERROR.MKT_SERVER_EMAIL_NO_LINKED_ACCOUNTS(customerId),
      );
    }

    const primaryMktAccount = linkedAccounts.find(
      (account) =>
        account.provider === ACCOUNT_PROVIDER.MKT_SERVER &&
        account.isPrimary &&
        account.status === LINKED_ACCOUNT_STATUS.ACTIVE,
    );

    if (primaryMktAccount?.email) {
      return primaryMktAccount.email;
    }

    const anyActiveMktAccount = linkedAccounts.find(
      (account) =>
        account.provider === ACCOUNT_PROVIDER.MKT_SERVER &&
        account.status === LINKED_ACCOUNT_STATUS.ACTIVE &&
        account.email,
    );

    if (anyActiveMktAccount?.email) {
      return anyActiveMktAccount.email;
    }

    throw new Error(
      CUSTOMER_MESSAGES.ERROR.MKT_SERVER_EMAIL_NOT_FOUND(customerId),
    );
  }
}
