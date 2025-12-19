import { Injectable, Logger } from '@nestjs/common';

import { PROMOTION_LOG_CONTEXT } from 'src/mkt-core/mkt-promotion/constants';
import { CreatePromotionUsageData } from 'src/mkt-core/mkt-promotion/repositories';
import { PromotionUsageStats } from 'src/mkt-core/mkt-promotion/types';
import { MktPromotionUsageWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion-usage.workspace-entity';

/**
 * PromotionUsageApplicationService - Service theo dõi usage của promotions
 */
@Injectable()
export class PromotionUsageApplicationService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor() {} // private readonly usageRepository: MktPromotionUsageRepository,

  /**
   * Ghi lại promotion usage
   */
  async recordUsage(
    workspaceId: string,
    data: CreatePromotionUsageData,
  ): Promise<MktPromotionUsageWorkspaceEntity> {
    // const usage = await this.usageRepository.create(workspaceId, data);

    this.logger.log('Recorded promotion usage', {
      workspaceId,
      promotionId: data.promotionId,
      customerId: data.customerId,
      discountAmount: data.discountAmount,
    });

    // return usage;
    return {} as MktPromotionUsageWorkspaceEntity;
  }

  /**
   * Lấy số lần customer đã sử dụng promotion
   */
  async getCustomerUsageCount(
    _workspaceId: string,
    _promotionId: string,
    _customerId: string,
  ): Promise<number> {
    // return this.usageRepository.getCustomerUsageCount(
    //   workspaceId,
    //   promotionId,
    //   customerId,
    // );
    return 0;
  }

  /**
   * Lấy thống kê usage của promotion
   */
  async getPromotionUsageStats(
    _workspaceId: string,
    _promotionId: string,
  ): Promise<PromotionUsageStats> {
    // return this.usageRepository.getPromotionStats(workspaceId, promotionId);
    return {
      totalUsageCount: 0,
      totalDiscountAmount: 0,
      uniqueCustomerCount: 0,
      averageDiscountAmount: 0,
      lastUsedAt: null,
    };
  }
}
