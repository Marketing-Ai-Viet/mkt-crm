import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import {
  MKT_CUSTOMER_CATEGORIZATION_THRESHOLDS,
  MKT_CUSTOMER_LIFECYCLE_STAGE,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

export type CustomerOrderStats = {
  customerId: string;
  totalOrders: number;
  totalValue: number;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
  completedOrders: number;
};

export type CategorizationResult = {
  customerId: string;
  previousStage: string | null;
  newStage: string;
  wasUpdated: boolean;
};

const COMPLETED_ORDER_STATUSES = [
  'COMPLETED',
  'DELIVERED',
  'PAID',
  'FINISHED',
  'SUCCESS',
];

/**
 * MktCustomerCategorizationService - Categorize customers by lifecycle stage
 *
 * FIXED: Thread-safe by using TwentyORMGlobalManager directly
 * instead of setting shared mktRepo.workspaceId property
 */
@Injectable()
export class MktCustomerCategorizationService {
  private readonly logger = new Logger(MktCustomerCategorizationService.name);

  constructor(
    private readonly mktRepo: MktRepositoryService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Get order statistics for a customer
   */
  async getCustomerOrderStats(customerId: string): Promise<CustomerOrderStats> {
    const orderRepo = await this.mktRepo.getOrderRepository();

    const stats = await orderRepo
      .createQueryBuilder('order')
      .select('COUNT(order.id)', 'totalOrders')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalValue')
      .addSelect('MIN(order.createdAt)', 'firstOrderAt')
      .addSelect('MAX(order.createdAt)', 'lastOrderAt')
      .addSelect(
        `COUNT(CASE WHEN order.status IN (${COMPLETED_ORDER_STATUSES.map((s) => `'${s}'`).join(',')}) THEN 1 END)`,
        'completedOrders',
      )
      .where('order.mktCustomerId = :customerId', { customerId })
      .getRawOne();

    return {
      customerId,
      totalOrders: parseInt(stats?.totalOrders ?? '0', 10),
      totalValue: parseFloat(stats?.totalValue ?? '0'),
      firstOrderAt: stats?.firstOrderAt ? new Date(stats.firstOrderAt) : null,
      lastOrderAt: stats?.lastOrderAt ? new Date(stats.lastOrderAt) : null,
      completedOrders: parseInt(stats?.completedOrders ?? '0', 10),
    };
  }

  /**
   * Determine lifecycle stage based on order statistics
   */
  determineLifecycleStage(stats: CustomerOrderStats): string {
    const { CHURNED_DAYS, RETENTION_DAYS, LOYAL_MIN_ORDERS, LOYAL_MIN_VALUE } =
      MKT_CUSTOMER_CATEGORIZATION_THRESHOLDS;

    const now = DateTimeUtils.now();

    // No orders at all - prospective
    if (stats.totalOrders === 0) {
      return MKT_CUSTOMER_LIFECYCLE_STAGE.PROSPECTIVE;
    }

    // Check if churned (no orders in last CHURNED_DAYS days)
    if (stats.lastOrderAt) {
      const lastOrderDateTime = DateTimeUtils.fromDate(stats.lastOrderAt);
      const daysSinceLastOrder = DateTimeUtils.diffInDays(
        lastOrderDateTime,
        now,
      );

      if (daysSinceLastOrder >= CHURNED_DAYS) {
        return MKT_CUSTOMER_LIFECYCLE_STAGE.CHURNED;
      }

      // At risk - needs retention (no orders in RETENTION_DAYS days)
      if (daysSinceLastOrder >= RETENTION_DAYS) {
        return MKT_CUSTOMER_LIFECYCLE_STAGE.RETENTION;
      }
    }

    // Check if loyal (enough orders and value)
    if (
      stats.completedOrders >= LOYAL_MIN_ORDERS &&
      MoneyUtils.greaterThanOrEqual(stats.totalValue, LOYAL_MIN_VALUE)
    ) {
      return MKT_CUSTOMER_LIFECYCLE_STAGE.LOYAL;
    }

    // Has completed orders - active customer
    if (stats.completedOrders > 0) {
      return MKT_CUSTOMER_LIFECYCLE_STAGE.CUSTOMER;
    }

    // Has orders but none completed - trial
    return MKT_CUSTOMER_LIFECYCLE_STAGE.TRIAL;
  }

  /**
   * Categorize a single customer
   */
  async categorizeCustomer(
    customer: MktCustomerWorkspaceEntity,
  ): Promise<CategorizationResult> {
    const stats = await this.getCustomerOrderStats(customer.id);
    const newStage = this.determineLifecycleStage(stats);
    const previousStage = customer.lifecycleStage;

    if (previousStage === newStage) {
      return {
        customerId: customer.id,
        previousStage,
        newStage,
        wasUpdated: false,
      };
    }

    // Update customer's lifecycle stage
    const customerRepo = await this.mktRepo.getCustomerRepository();

    await customerRepo.update(customer.id, {
      lifecycleStage: newStage,
    } as never);

    this.logger.log(
      CUSTOMER_MESSAGES.LOG.CUSTOMER_STAGE_CHANGED(
        customer.id,
        previousStage ?? 'NONE',
        newStage,
      ),
    );

    return {
      customerId: customer.id,
      previousStage,
      newStage,
      wasUpdated: true,
    };
  }

  /**
   * Categorize all customers in a workspace
   * Thread-safe: Uses TwentyORMGlobalManager directly
   */
  async categorizeAllCustomers(
    workspaceId: string,
    batchSize = 100,
  ): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    this.logger.log(
      CUSTOMER_MESSAGES.LOG.CATEGORIZATION_JOB_START(workspaceId),
    );

    // Thread-safe: Get repository for specific workspace directly
    const customerRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktCustomerWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const orderRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktOrderWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    let processed = 0;
    let updated = 0;
    let errors = 0;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const customers = await customerRepo
        .createQueryBuilder('customer')
        .where('customer.deletedAt IS NULL')
        .orderBy('customer.createdAt', 'ASC')
        .skip(offset)
        .take(batchSize)
        .getMany();

      if (customers.length === 0) {
        hasMore = false;
        break;
      }

      for (const customer of customers) {
        try {
          // Inline stats calculation to use thread-safe orderRepo
          const stats = await orderRepo
            .createQueryBuilder('order')
            .select('COUNT(order.id)', 'totalOrders')
            .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalValue')
            .addSelect('MIN(order.createdAt)', 'firstOrderAt')
            .addSelect('MAX(order.createdAt)', 'lastOrderAt')
            .addSelect(
              `COUNT(CASE WHEN order.status IN (${COMPLETED_ORDER_STATUSES.map((s) => `'${s}'`).join(',')}) THEN 1 END)`,
              'completedOrders',
            )
            .where('order.mktCustomerId = :customerId', {
              customerId: customer.id,
            })
            .getRawOne();

          const orderStats: CustomerOrderStats = {
            customerId: customer.id,
            totalOrders: parseInt(stats?.totalOrders ?? '0', 10),
            totalValue: parseFloat(stats?.totalValue ?? '0'),
            firstOrderAt: stats?.firstOrderAt
              ? new Date(stats.firstOrderAt)
              : null,
            lastOrderAt: stats?.lastOrderAt
              ? new Date(stats.lastOrderAt)
              : null,
            completedOrders: parseInt(stats?.completedOrders ?? '0', 10),
          };

          const newStage = this.determineLifecycleStage(orderStats);
          const previousStage = customer.lifecycleStage;

          if (previousStage !== newStage) {
            await customerRepo.update(customer.id, {
              lifecycleStage: newStage,
            } as never);

            this.logger.log(
              CUSTOMER_MESSAGES.LOG.CUSTOMER_STAGE_CHANGED(
                customer.id,
                previousStage ?? 'NONE',
                newStage,
              ),
            );
            updated++;
          }

          processed++;
        } catch (error) {
          errors++;
          this.logger.error(
            CUSTOMER_MESSAGES.ERROR.CATEGORIZATION_FAILED(customer.id),
            error,
          );
        }
      }

      offset += batchSize;

      if (customers.length < batchSize) {
        hasMore = false;
      }
    }

    this.logger.log(
      CUSTOMER_MESSAGES.LOG.CATEGORIZATION_JOB_COMPLETE(processed, updated),
    );

    return { processed, updated, errors };
  }

  /**
   * Get customers by lifecycle stage
   */
  async getCustomersByStage(
    stage: string,
    limit = 100,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const customerRepo = await this.mktRepo.getCustomerRepository();

    return customerRepo
      .createQueryBuilder('customer')
      .where('customer.lifecycleStage = :stage', { stage })
      .andWhere('customer.deletedAt IS NULL')
      .orderBy('customer.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Get customers at risk (retention stage)
   */
  async getAtRiskCustomers(limit = 100): Promise<MktCustomerWorkspaceEntity[]> {
    return this.getCustomersByStage(
      MKT_CUSTOMER_LIFECYCLE_STAGE.RETENTION,
      limit,
    );
  }

  /**
   * Get churned customers for reactivation campaigns
   */
  async getChurnedCustomers(
    limit = 100,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    return this.getCustomersByStage(
      MKT_CUSTOMER_LIFECYCLE_STAGE.CHURNED,
      limit,
    );
  }

  /**
   * Get stage distribution statistics
   */
  async getStageDistribution(): Promise<Record<string, number>> {
    const customerRepo = await this.mktRepo.getCustomerRepository();

    const stats = await customerRepo
      .createQueryBuilder('customer')
      .select('customer.lifecycleStage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('customer.deletedAt IS NULL')
      .groupBy('customer.lifecycleStage')
      .getRawMany();

    return stats.reduce(
      (acc, item) => {
        acc[item.stage ?? 'UNKNOWN'] = parseInt(item.count, 10);

        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
