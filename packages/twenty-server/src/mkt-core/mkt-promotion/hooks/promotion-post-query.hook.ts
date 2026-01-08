import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { PromotionCacheService } from 'src/mkt-core/mkt-promotion/services/infrastructure/promotion-cache.service';
import { PROMOTION_LOG_CONTEXT } from 'src/mkt-core/mkt-promotion/constants';
import { MktPromotionWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion.workspace-entity';

/**
 * PromotionCreateOnePostQueryHook - Post-query hook cho mktPromotion createOne
 *
 * Chức năng:
 * - Emit event khi tạo promotion mới
 * - Invalidate cache để đảm bảo data consistency
 */
@Injectable()
@WorkspaceQueryHook({
  key: 'mktPromotion.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class PromotionCreateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly promotionCacheService: PromotionCacheService,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktPromotionWorkspaceEntity[],
  ): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      return;
    }

    const createdPromotion = payload?.[0];

    if (!createdPromotion) {
      return;
    }

    try {
      // Emit event cho promotion được tạo
      this.eventEmitter.emit('promotion.created', {
        workspaceId,
        promotionId: createdPromotion.id,
        promotion: createdPromotion,
      });

      // Invalidate active promotions cache
      await this.promotionCacheService.invalidateActivePromotions(workspaceId);

      this.logger.debug('Promotion created and cache invalidated', {
        promotionId: createdPromotion.id,
        code: createdPromotion.code,
      });
    } catch (error) {
      this.logger.error('Failed to process promotion creation', {
        error: error.message,
        promotionId: createdPromotion.id,
      });
    }
  }
}

/**
 * PromotionUpdateOnePostQueryHook - Post-query hook cho mktPromotion updateOne
 *
 * Chức năng:
 * - Emit event khi cập nhật promotion
 * - Invalidate cache của promotion cụ thể và active promotions list
 */
@Injectable()
@WorkspaceQueryHook({
  key: 'mktPromotion.updateOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class PromotionUpdateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly promotionCacheService: PromotionCacheService,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktPromotionWorkspaceEntity[],
  ): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      return;
    }

    const updatedPromotion = payload?.[0];

    if (!updatedPromotion) {
      return;
    }

    try {
      // Emit event cho promotion được cập nhật
      this.eventEmitter.emit('promotion.updated', {
        workspaceId,
        promotionId: updatedPromotion.id,
        promotion: updatedPromotion,
      });

      // Invalidate cache cho promotion cụ thể
      await this.promotionCacheService.invalidatePromotion(
        workspaceId,
        updatedPromotion.id,
      );

      // Invalidate active promotions cache
      await this.promotionCacheService.invalidateActivePromotions(workspaceId);

      this.logger.debug('Promotion updated and cache invalidated', {
        promotionId: updatedPromotion.id,
        code: updatedPromotion.code,
      });
    } catch (error) {
      this.logger.error('Failed to process promotion update', {
        error: error.message,
        promotionId: updatedPromotion.id,
      });
    }
  }
}

/**
 * PromotionDeleteOnePostQueryHook - Post-query hook cho mktPromotion deleteOne
 *
 * Chức năng:
 * - Emit event khi xóa (soft delete) promotion
 * - Invalidate cache của promotion và active promotions list
 */
@Injectable()
@WorkspaceQueryHook({
  key: 'mktPromotion.deleteOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class PromotionDeleteOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly promotionCacheService: PromotionCacheService,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktPromotionWorkspaceEntity[],
  ): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      return;
    }

    const deletedPromotion = payload?.[0];

    if (!deletedPromotion) {
      return;
    }

    try {
      // Emit event cho promotion được xóa
      this.eventEmitter.emit('promotion.deleted', {
        workspaceId,
        promotionId: deletedPromotion.id,
        promotion: deletedPromotion,
      });

      // Invalidate cache cho promotion cụ thể
      await this.promotionCacheService.invalidatePromotion(
        workspaceId,
        deletedPromotion.id,
      );

      // Invalidate active promotions cache
      await this.promotionCacheService.invalidateActivePromotions(workspaceId);

      this.logger.debug('Promotion deleted and cache invalidated', {
        promotionId: deletedPromotion.id,
        code: deletedPromotion.code,
      });
    } catch (error) {
      this.logger.error('Failed to process promotion deletion', {
        error: error.message,
        promotionId: deletedPromotion.id,
      });
    }
  }
}
