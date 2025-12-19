import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  PROMOTION_LOG_CONTEXT,
  PROMOTION_STATUS,
  PromotionStatus,
} from 'src/mkt-core/mkt-promotion/constants';
import { PromotionCacheService } from 'src/mkt-core/mkt-promotion/services/infrastructure';
import {
  PromotionWithRules,
  CreatePromotionData,
  UpdatePromotionData,
  PromotionFilter,
  PaginatedResult,
  PromotionEvaluationContext,
  AppliedPromotionsResult,
  PromotionCalculationResult,
  CreatePromotionRuleData,
} from 'src/mkt-core/mkt-promotion/types';
import { MktPromotionWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion.workspace-entity';
import { MktPromotionRuleWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion-rule.workspace-entity';
import {
  MktPromotionRepository,
  MktPromotionRuleRepository,
} from 'src/mkt-core/mkt-promotion/repositories';
import { PromotionCalculationService } from 'src/mkt-core/mkt-promotion/services/domain/promotion-calculation.service';
import { PromotionValidationService } from 'src/mkt-core/mkt-promotion/services/domain/promotion-validation.service';
import {
  PromotionCreatedEvent,
  PromotionActivatedEvent,
  PromotionPausedEvent,
  PromotionCancelledEvent,
} from 'src/mkt-core/mkt-promotion/events/promotion.events';
import {
  PromotionNotFoundError,
  PromotionCodeDuplicateError,
  PromotionValidationException,
} from 'src/mkt-core/mkt-promotion/errors';

import { PromotionUsageApplicationService } from './promotion-usage-application.service';
import { CouponApplicationService } from './coupon-application.service';

/**
 * PromotionApplicationService - Facade service cho Promotion module
 * Orchestrates các services con:
 * - Repository: Data access
 * - CalculationService: Tính discount
 * - ValidationService: Validation
 * - UsageService: Usage tracking
 * - CacheService: Caching
 */
@Injectable()
export class PromotionApplicationService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly promotionRepository: MktPromotionRepository,
    private readonly ruleRepository: MktPromotionRuleRepository,
    private readonly calculationService: PromotionCalculationService,
    private readonly validationService: PromotionValidationService,
    private readonly usageService: PromotionUsageApplicationService,
    private readonly couponService: CouponApplicationService,
    private readonly cacheService: PromotionCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Lấy promotion theo ID với rules
   */
  async getPromotionById(
    workspaceId: string,
    promotionId: string,
  ): Promise<PromotionWithRules | null> {
    return this.promotionRepository.findByIdWithRules(workspaceId, promotionId);
  }

  /**
   * Lấy active promotions
   */
  async getActivePromotions(
    workspaceId: string,
  ): Promise<MktPromotionWorkspaceEntity[]> {
    // Check cache first
    const cached = await this.cacheService.getActivePromotions(workspaceId);

    if (cached) {
      return cached;
    }

    // Fetch from DB
    const promotions =
      await this.promotionRepository.findActiveAutoApply(workspaceId);

    // Cache result
    await this.cacheService.setActivePromotions(workspaceId, promotions);

    return promotions;
  }

  /**
   * Lấy promotion theo code với rules
   */
  async getPromotionByCode(
    workspaceId: string,
    code: string,
  ): Promise<PromotionWithRules | null> {
    // Check cache first
    const cached = await this.cacheService.getPromotionByCode(
      workspaceId,
      code,
    );

    if (cached) {
      return this.promotionRepository.findByIdWithRules(workspaceId, cached.id);
    }

    // Fetch from DB
    const promotion = await this.promotionRepository.findByCode(
      workspaceId,
      code,
    );

    if (!promotion) {
      return null;
    }

    // Cache result
    await this.cacheService.setPromotionByCode(workspaceId, code, promotion);

    return this.promotionRepository.findByIdWithRules(
      workspaceId,
      promotion.id,
    );
  }

  /**
   * Lấy danh sách promotions với phân trang
   */
  async listPromotions(
    workspaceId: string,
    filter: PromotionFilter,
    pagination: { limit: number; offset: number },
  ): Promise<PaginatedResult<MktPromotionWorkspaceEntity>> {
    return this.promotionRepository.findAllPaginated(
      workspaceId,
      pagination,
      filter,
    );
  }

  /**
   * Lấy danh sách promotions - alias for listPromotions
   */
  async getPromotions(
    workspaceId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      search?: string;
    },
  ): Promise<PaginatedResult<MktPromotionWorkspaceEntity>> {
    const filter: PromotionFilter = {
      status: options.status as PromotionStatus | undefined,
      search: options.search,
    };
    const pagination = {
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
    };

    return this.listPromotions(workspaceId, filter, pagination);
  }

  /**
   * Thay đổi trạng thái promotion
   */
  async changePromotionStatus(
    workspaceId: string,
    promotionId: string,
    status: PromotionStatus,
  ): Promise<MktPromotionWorkspaceEntity> {
    switch (status) {
      case PROMOTION_STATUS.ACTIVE:
        return this.activatePromotion(workspaceId, promotionId, 'system');
      case PROMOTION_STATUS.PAUSED:
        return this.pausePromotion(workspaceId, promotionId, 'system');
      case PROMOTION_STATUS.CANCELLED:
        return this.cancelPromotion(workspaceId, promotionId, 'system');
      default:
        this.logger.warn('Unknown status', { status });

        return {} as MktPromotionWorkspaceEntity;
    }
  }

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  /**
   * Tạo promotion mới
   */
  async createPromotion(
    workspaceId: string,
    data: CreatePromotionData,
    createdBy: string,
  ): Promise<PromotionWithRules> {
    // Validate data
    const validation = this.validationService.validateCreateData(data);

    if (!validation.isValid) {
      throw new PromotionValidationException(
        'Invalid promotion data',
        validation.errors.map((e) => ({
          field: e.field ?? '',
          message: e.message,
          code: e.code,
        })),
      );
    }

    // Check code uniqueness
    const codeExists = await this.promotionRepository.codeExists(
      workspaceId,
      data.code,
    );

    if (codeExists) {
      throw new PromotionCodeDuplicateError(data.code);
    }

    // Create promotion
    const promotion = await this.promotionRepository.create(workspaceId, data);

    // Create rules if provided
    let rules: MktPromotionRuleWorkspaceEntity[] = [];

    if (data.rules && data.rules.length > 0) {
      rules = await this.ruleRepository.createMany(
        workspaceId,
        promotion.id,
        data.rules,
      );
    }

    this.logger.log('Created promotion', {
      workspaceId,
      promotionId: promotion.id,
      createdBy,
    });

    // Emit event
    this.eventEmitter.emit(
      'promotion.created',
      new PromotionCreatedEvent(
        workspaceId,
        promotion.id,
        promotion.code,
        createdBy,
      ),
    );

    // Invalidate cache
    await this.cacheService.invalidateActivePromotions(workspaceId);

    return { promotion, rules };
  }

  /**
   * Cập nhật promotion
   * Note: code cannot be changed after creation (excluded from UpdatePromotionData)
   */
  async updatePromotion(
    workspaceId: string,
    data: UpdatePromotionData,
    updatedBy: string,
  ): Promise<PromotionWithRules> {
    const { id: promotionId } = data;

    const existing = await this.promotionRepository.findById(
      workspaceId,
      promotionId,
    );

    if (!existing) {
      throw new PromotionNotFoundError(promotionId);
    }

    // Update promotion
    await this.promotionRepository.update(workspaceId, data);

    this.logger.log('Updated promotion', {
      workspaceId,
      promotionId,
      updatedBy,
    });

    // Invalidate cache
    await this.cacheService.invalidatePromotion(workspaceId, promotionId);
    await this.cacheService.invalidateActivePromotions(workspaceId);

    const result = await this.promotionRepository.findByIdWithRules(
      workspaceId,
      promotionId,
    );

    return result ?? { promotion: existing, rules: [] };
  }

  /**
   * Activate promotion
   */
  async activatePromotion(
    workspaceId: string,
    promotionId: string,
    activatedBy: string,
  ): Promise<MktPromotionWorkspaceEntity> {
    const existing = await this.promotionRepository.findById(
      workspaceId,
      promotionId,
    );

    if (!existing) {
      throw new PromotionNotFoundError(promotionId);
    }

    await this.promotionRepository.updateStatus(
      workspaceId,
      promotionId,
      PROMOTION_STATUS.ACTIVE,
    );

    this.logger.log('Activated promotion', {
      workspaceId,
      promotionId,
      activatedBy,
    });

    // Emit event
    this.eventEmitter.emit(
      'promotion.activated',
      new PromotionActivatedEvent(workspaceId, promotionId, activatedBy),
    );

    // Invalidate cache
    await this.cacheService.invalidatePromotion(workspaceId, promotionId);
    await this.cacheService.invalidateActivePromotions(workspaceId);

    const updated = await this.promotionRepository.findById(
      workspaceId,
      promotionId,
    );

    return updated ?? existing;
  }

  /**
   * Pause promotion
   */
  async pausePromotion(
    workspaceId: string,
    promotionId: string,
    pausedBy: string,
  ): Promise<MktPromotionWorkspaceEntity> {
    const existing = await this.promotionRepository.findById(
      workspaceId,
      promotionId,
    );

    if (!existing) {
      throw new PromotionNotFoundError(promotionId);
    }

    await this.promotionRepository.updateStatus(
      workspaceId,
      promotionId,
      PROMOTION_STATUS.PAUSED,
    );

    this.logger.log('Paused promotion', {
      workspaceId,
      promotionId,
      pausedBy,
    });

    // Emit event
    this.eventEmitter.emit(
      'promotion.paused',
      new PromotionPausedEvent(workspaceId, promotionId, pausedBy),
    );

    // Invalidate cache
    await this.cacheService.invalidatePromotion(workspaceId, promotionId);
    await this.cacheService.invalidateActivePromotions(workspaceId);

    const updated = await this.promotionRepository.findById(
      workspaceId,
      promotionId,
    );

    return updated ?? existing;
  }

  /**
   * Cancel promotion
   */
  async cancelPromotion(
    workspaceId: string,
    promotionId: string,
    cancelledBy: string,
  ): Promise<MktPromotionWorkspaceEntity> {
    const existing = await this.promotionRepository.findById(
      workspaceId,
      promotionId,
    );

    if (!existing) {
      throw new PromotionNotFoundError(promotionId);
    }

    await this.promotionRepository.updateStatus(
      workspaceId,
      promotionId,
      PROMOTION_STATUS.CANCELLED,
    );

    this.logger.log('Cancelled promotion', {
      workspaceId,
      promotionId,
      cancelledBy,
    });

    // Emit event
    this.eventEmitter.emit(
      'promotion.cancelled',
      new PromotionCancelledEvent(workspaceId, promotionId, cancelledBy),
    );

    // Invalidate cache
    await this.cacheService.invalidatePromotion(workspaceId, promotionId);
    await this.cacheService.invalidateActivePromotions(workspaceId);

    const updated = await this.promotionRepository.findById(
      workspaceId,
      promotionId,
    );

    return updated ?? existing;
  }

  // ============================================
  // CALCULATION & APPLICATION
  // ============================================

  /**
   * Tính discount cho order
   */
  async calculateDiscount(
    workspaceId: string,
    context: PromotionEvaluationContext,
  ): Promise<AppliedPromotionsResult> {
    // Get active promotions
    const activePromotions = await this.getActivePromotions(workspaceId);

    // Filter applicable promotions based on validation
    const applicablePromotions: MktPromotionWorkspaceEntity[] = [];

    for (const promotion of activePromotions) {
      const validation = await this.validationService.validatePromotion(
        promotion,
        context,
      );

      if (validation.isValid) {
        applicablePromotions.push(promotion);
      }
    }

    // Calculate discount using calculation service
    return this.calculationService.calculateOrderDiscount(
      applicablePromotions,
      context,
    );
  }

  /**
   * Apply promotion to order
   */
  async applyPromotionToOrder(
    workspaceId: string,
    orderId: string,
    promotionId: string,
    context: PromotionEvaluationContext,
    couponCode?: string,
  ): Promise<PromotionCalculationResult> {
    // Get promotion
    const promotionResult = await this.getPromotionById(
      workspaceId,
      promotionId,
    );

    if (!promotionResult) {
      return {
        applicable: false,
        promotion: null,
        coupon: null,
        discountAmount: 0,
        errors: [
          { code: 'PROMOTION_NOT_FOUND', message: 'Promotion not found' },
        ],
      };
    }

    const { promotion } = promotionResult;

    // Validate promotion
    const validation = await this.validationService.validatePromotion(
      promotion,
      context,
    );

    if (!validation.isValid) {
      return {
        applicable: false,
        promotion: null,
        coupon: null,
        discountAmount: 0,
        errors: validation.errors,
      };
    }

    // Calculate discount
    const discountResult = await this.calculationService.calculateOrderDiscount(
      [promotion],
      context,
    );

    this.logger.log('Applied promotion to order', {
      workspaceId,
      orderId,
      promotionId,
      couponCode,
      discountAmount: discountResult.totalDiscount,
    });

    // Increment usage count
    await this.promotionRepository.incrementUsageCount(
      workspaceId,
      promotionId,
    );

    return {
      applicable: true,
      promotion,
      coupon: null,
      discountAmount: discountResult.totalDiscount,
    };
  }

  /**
   * Remove promotion from order
   */
  async removePromotionFromOrder(
    workspaceId: string,
    orderId: string,
    promotionId: string,
  ): Promise<void> {
    this.logger.log('Removed promotion from order', {
      workspaceId,
      orderId,
      promotionId,
    });
  }

  // ============================================
  // RULE MANAGEMENT
  // ============================================

  /**
   * Thêm rule vào promotion
   */
  async addRule(
    workspaceId: string,
    promotionId: string,
    ruleData: CreatePromotionRuleData,
  ): Promise<MktPromotionRuleWorkspaceEntity> {
    // Verify promotion exists
    const promotion = await this.promotionRepository.findById(
      workspaceId,
      promotionId,
    );

    if (!promotion) {
      throw new PromotionNotFoundError(promotionId);
    }

    const rule = await this.ruleRepository.create(
      workspaceId,
      promotionId,
      ruleData,
    );

    this.logger.log('Added rule to promotion', {
      workspaceId,
      promotionId,
      ruleType: ruleData.ruleType,
    });

    // Invalidate cache
    await this.cacheService.invalidatePromotion(workspaceId, promotionId);

    return rule;
  }

  /**
   * Cập nhật rule
   */
  async updateRule(
    workspaceId: string,
    ruleId: string,
    ruleData: Partial<CreatePromotionRuleData>,
  ): Promise<MktPromotionRuleWorkspaceEntity> {
    // Find existing rule to get promotionId
    const existingRule = await this.ruleRepository.findById(
      workspaceId,
      ruleId,
    );

    if (!existingRule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    const rule = await this.ruleRepository.update(
      workspaceId,
      ruleId,
      ruleData,
    );

    this.logger.log('Updated rule', {
      workspaceId,
      ruleId,
    });

    // Invalidate cache
    await this.cacheService.invalidatePromotion(
      workspaceId,
      existingRule.promotionId,
    );

    return rule ?? existingRule;
  }

  /**
   * Xóa rule
   */
  async removeRule(workspaceId: string, ruleId: string): Promise<void> {
    // Find existing rule to get promotionId
    const existingRule = await this.ruleRepository.findById(
      workspaceId,
      ruleId,
    );

    if (!existingRule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    await this.ruleRepository.softDelete(workspaceId, ruleId);

    this.logger.log('Removed rule', {
      workspaceId,
      ruleId,
    });

    // Invalidate cache
    await this.cacheService.invalidatePromotion(
      workspaceId,
      existingRule.promotionId,
    );
  }
}
