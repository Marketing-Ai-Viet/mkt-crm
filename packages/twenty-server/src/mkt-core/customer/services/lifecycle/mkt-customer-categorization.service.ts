import { Injectable, Logger } from '@nestjs/common';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import {
  MKT_CUSTOMER_CATEGORIZATION_THRESHOLDS,
  MKT_CUSTOMER_LIFECYCLE_STAGE,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';
import {
  COMPLETED_ORDER_STATUSES,
  TIER_BULK_PROCESSING_CONFIG,
} from 'src/mkt-core/customer/constants/mkt-customer-tier.constants';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

// ============================================
// TYPES
// ============================================

/**
 * Thống kê đơn hàng của khách hàng
 * Dùng để xác định lifecycle stage
 */
export type CustomerOrderStats = {
  customerId: string;
  /** Tổng số đơn hàng */
  totalOrders: number;
  /** Tổng giá trị đơn hàng (VND) */
  totalValue: number;
  /** Ngày đặt đơn đầu tiên */
  firstOrderAt: Date | null;
  /** Ngày đặt đơn gần nhất */
  lastOrderAt: Date | null;
  /** Số đơn hàng đã hoàn thành */
  completedOrders: number;
};

/**
 * Kết quả sau khi categorize customer
 */
export type CategorizationResult = {
  customerId: string;
  previousStage: string | null;
  newStage: string;
  wasUpdated: boolean;
};

/**
 * Kết quả của batch categorization job
 */
export type BatchCategorizationResult = {
  processed: number;
  updated: number;
  errors: number;
};

// ============================================
// SERVICE
// ============================================

/**
 * MktCustomerCategorizationService - Phân loại khách hàng theo lifecycle stage
 *
 * Service này xác định và cập nhật lifecycle stage của khách hàng dựa trên
 * lịch sử đơn hàng. Thread-safe bằng cách sử dụng repository.getRepository(workspaceId)
 * để lấy repository cho workspace cụ thể.
 *
 * Lifecycle Stages:
 * - PROSPECTIVE: Chưa có đơn hàng nào
 * - TRIAL: Có đơn hàng nhưng chưa hoàn thành
 * - CUSTOMER: Có đơn hàng hoàn thành
 * - LOYAL: Khách hàng trung thành (đủ số đơn và giá trị)
 * - RETENTION: Cần giữ chân (không mua hàng trong 90 ngày)
 * - CHURNED: Đã rời bỏ (không mua hàng trong 180 ngày)
 */
@Injectable()
export class MktCustomerCategorizationService {
  private readonly logger = new Logger(MktCustomerCategorizationService.name);

  constructor(
    private readonly customerRepository: MktCustomerRepository,
    private readonly orderRepository: MktOrderRepository,
  ) {}

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Lấy thống kê đơn hàng của một khách hàng
   * Dùng để xác định lifecycle stage
   */
  async getCustomerOrderStats(customerId: string): Promise<CustomerOrderStats> {
    const orderRepo = await this.orderRepository.getRepository();

    return this.buildOrderStatsQuery(customerId, orderRepo);
  }

  /**
   * Xác định lifecycle stage dựa trên thống kê đơn hàng
   * Áp dụng business rules theo thứ tự ưu tiên
   */
  determineLifecycleStage(stats: CustomerOrderStats): string {
    const { CHURNED_DAYS, RETENTION_DAYS, LOYAL_MIN_ORDERS, LOYAL_MIN_VALUE } =
      MKT_CUSTOMER_CATEGORIZATION_THRESHOLDS;

    // Rule 1: Không có đơn hàng => PROSPECTIVE
    if (stats.totalOrders === 0) {
      return MKT_CUSTOMER_LIFECYCLE_STAGE.PROSPECTIVE;
    }

    // Rule 2: Kiểm tra thời gian từ đơn hàng cuối
    if (stats.lastOrderAt) {
      const daysSinceLastOrder = this.calculateDaysSinceLastOrder(
        stats.lastOrderAt,
      );

      // Rule 2a: Không mua hàng >= CHURNED_DAYS => CHURNED
      if (daysSinceLastOrder >= CHURNED_DAYS) {
        return MKT_CUSTOMER_LIFECYCLE_STAGE.CHURNED;
      }

      // Rule 2b: Không mua hàng >= RETENTION_DAYS => RETENTION
      if (daysSinceLastOrder >= RETENTION_DAYS) {
        return MKT_CUSTOMER_LIFECYCLE_STAGE.RETENTION;
      }
    }

    // Rule 3: Đủ điều kiện loyal
    const isLoyalByOrders = stats.completedOrders >= LOYAL_MIN_ORDERS;
    const isLoyalByValue = MoneyUtils.greaterThanOrEqual(
      stats.totalValue,
      LOYAL_MIN_VALUE,
    );

    if (isLoyalByOrders && isLoyalByValue) {
      return MKT_CUSTOMER_LIFECYCLE_STAGE.LOYAL;
    }

    // Rule 4: Có đơn hàng hoàn thành => CUSTOMER
    if (stats.completedOrders > 0) {
      return MKT_CUSTOMER_LIFECYCLE_STAGE.CUSTOMER;
    }

    // Rule 5: Có đơn hàng nhưng chưa hoàn thành => TRIAL
    return MKT_CUSTOMER_LIFECYCLE_STAGE.TRIAL;
  }

  /**
   * Categorize một khách hàng
   * Cập nhật lifecycle stage nếu thay đổi
   */
  async categorizeCustomer(
    customer: MktCustomerWorkspaceEntity,
  ): Promise<CategorizationResult> {
    const stats = await this.getCustomerOrderStats(customer.id);
    const newStage = this.determineLifecycleStage(stats);
    const previousStage = customer.lifecycleStage;

    // Early return nếu không thay đổi
    if (previousStage === newStage) {
      return {
        customerId: customer.id,
        previousStage,
        newStage,
        wasUpdated: false,
      };
    }

    // Cập nhật lifecycle stage
    const customerRepo = await this.customerRepository.getRepository();

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
   * Categorize tất cả khách hàng trong workspace
   * Thread-safe: Sử dụng repository.getRepository(workspaceId)
   *
   * @param workspaceId - ID của workspace
   * @param batchSize - Số khách hàng xử lý mỗi batch (default: 100)
   */
  async categorizeAllCustomers(
    workspaceId: string,
    batchSize = TIER_BULK_PROCESSING_CONFIG.BATCH_SIZE,
  ): Promise<BatchCategorizationResult> {
    this.logger.log(
      CUSTOMER_MESSAGES.LOG.CATEGORIZATION_JOB_START(workspaceId),
    );

    // Thread-safe: Lấy repository cho workspace cụ thể thông qua module repository
    const customerRepo =
      await this.customerRepository.getRepository(workspaceId);
    const orderRepo = await this.orderRepository.getRepository(workspaceId);

    let processed = 0;
    let updated = 0;
    let errors = 0;
    let offset = 0;
    let hasMore = true;

    // Batch processing loop
    while (hasMore) {
      const customers = await this.fetchCustomerBatch(
        customerRepo,
        offset,
        batchSize,
      );

      // Không còn khách hàng => kết thúc
      if (customers.length === 0) {
        hasMore = false;
        continue;
      }

      // Xử lý từng customer trong batch
      for (const customer of customers) {
        try {
          const result = await this.processSingleCustomer(
            customer,
            customerRepo,
            orderRepo,
          );

          processed++;
          if (result.wasUpdated) {
            updated++;
          }
        } catch (error) {
          errors++;
          this.logger.error(
            CUSTOMER_MESSAGES.ERROR.CATEGORIZATION_FAILED(customer.id),
            error,
          );
        }
      }

      offset += batchSize;

      // Batch cuối cùng => kết thúc
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
   * Lấy danh sách khách hàng theo lifecycle stage
   */
  async getCustomersByStage(
    stage: string,
    limit = 100,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const customerRepo = await this.customerRepository.getRepository();

    return customerRepo
      .createQueryBuilder('customer')
      .where('customer.lifecycleStage = :stage', { stage })
      .andWhere('customer.deletedAt IS NULL')
      .orderBy('customer.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Lấy khách hàng cần giữ chân (RETENTION stage)
   */
  async getAtRiskCustomers(limit = 100): Promise<MktCustomerWorkspaceEntity[]> {
    return this.getCustomersByStage(
      MKT_CUSTOMER_LIFECYCLE_STAGE.RETENTION,
      limit,
    );
  }

  /**
   * Lấy khách hàng đã rời bỏ (CHURNED stage)
   * Dùng cho chiến dịch reactivation
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
   * Lấy thống kê phân bố lifecycle stage
   */
  async getStageDistribution(): Promise<Record<string, number>> {
    const customerRepo = await this.customerRepository.getRepository();

    const stats = await customerRepo
      .createQueryBuilder('customer')
      .select('customer.lifecycleStage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('customer.deletedAt IS NULL')
      .groupBy('customer.lifecycleStage')
      .getRawMany();

    // Chuyển đổi kết quả sang Record
    const distribution: Record<string, number> = {};

    for (const item of stats) {
      const stageName = item.stage ?? 'UNKNOWN';

      distribution[stageName] = parseInt(item.count, 10);
    }

    return distribution;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Build và execute query lấy order stats cho một customer
   */
  private async buildOrderStatsQuery(
    customerId: string,
    orderRepo: WorkspaceRepository<MktOrderWorkspaceEntity>,
  ): Promise<CustomerOrderStats> {
    const completedStatusList = COMPLETED_ORDER_STATUSES.map(
      (s) => `'${s}'`,
    ).join(',');

    const stats = await orderRepo
      .createQueryBuilder('order')
      .select('COUNT(order.id)', 'totalOrders')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalValue')
      .addSelect('MIN(order.createdAt)', 'firstOrderAt')
      .addSelect('MAX(order.createdAt)', 'lastOrderAt')
      .addSelect(
        `COUNT(CASE WHEN order.status IN (${completedStatusList}) THEN 1 END)`,
        'completedOrders',
      )
      .where('order.mktCustomerId = :customerId', { customerId })
      .getRawOne();

    return this.parseOrderStats(customerId, stats);
  }

  /**
   * Parse raw query result thành CustomerOrderStats
   */
  private parseOrderStats(
    customerId: string,
    rawStats: Record<string, unknown> | undefined,
  ): CustomerOrderStats {
    return {
      customerId,
      totalOrders: parseInt(String(rawStats?.totalOrders ?? '0'), 10),
      totalValue: parseFloat(String(rawStats?.totalValue ?? '0')),
      firstOrderAt: rawStats?.firstOrderAt
        ? new Date(rawStats.firstOrderAt as string)
        : null,
      lastOrderAt: rawStats?.lastOrderAt
        ? new Date(rawStats.lastOrderAt as string)
        : null,
      completedOrders: parseInt(String(rawStats?.completedOrders ?? '0'), 10),
    };
  }

  /**
   * Tính số ngày kể từ đơn hàng cuối cùng
   */
  private calculateDaysSinceLastOrder(lastOrderAt: Date): number {
    const now = DateTimeUtils.now();
    const lastOrderDateTime = DateTimeUtils.fromDate(lastOrderAt);

    return DateTimeUtils.diffInDays(lastOrderDateTime, now);
  }

  /**
   * Fetch một batch khách hàng
   */
  private async fetchCustomerBatch(
    customerRepo: WorkspaceRepository<MktCustomerWorkspaceEntity>,
    offset: number,
    batchSize: number,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    return customerRepo
      .createQueryBuilder('customer')
      .where('customer.deletedAt IS NULL')
      .orderBy('customer.createdAt', 'ASC')
      .skip(offset)
      .take(batchSize)
      .getMany();
  }

  /**
   * Xử lý categorization cho một khách hàng
   * Sử dụng repo đã được inject để đảm bảo thread-safe
   */
  private async processSingleCustomer(
    customer: MktCustomerWorkspaceEntity,
    customerRepo: WorkspaceRepository<MktCustomerWorkspaceEntity>,
    orderRepo: WorkspaceRepository<MktOrderWorkspaceEntity>,
  ): Promise<CategorizationResult> {
    // Lấy thống kê đơn hàng
    const orderStats = await this.buildOrderStatsQuery(customer.id, orderRepo);

    // Xác định stage mới
    const newStage = this.determineLifecycleStage(orderStats);
    const previousStage = customer.lifecycleStage;

    // Early return nếu không thay đổi
    if (previousStage === newStage) {
      return {
        customerId: customer.id,
        previousStage,
        newStage,
        wasUpdated: false,
      };
    }

    // Cập nhật stage
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
}
