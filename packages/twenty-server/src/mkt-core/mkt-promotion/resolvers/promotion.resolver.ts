import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  CreatePromotionInput,
  UpdatePromotionInput,
  GetPromotionsInput,
} from 'src/mkt-core/mkt-promotion/dto/inputs';
import {
  PromotionOutput,
  PaginatedPromotionsOutput,
} from 'src/mkt-core/mkt-promotion/dto/outputs';
import { PromotionApplicationService } from 'src/mkt-core/mkt-promotion/services/application/promotion-application.service';
import { PromotionCacheService } from 'src/mkt-core/mkt-promotion/services/infrastructure/promotion-cache.service';
import {
  PROMOTION_MESSAGES,
  PROMOTION_GRAPHQL_DESCRIPTIONS,
} from 'src/mkt-core/mkt-promotion/message';
import {
  PROMOTION_LOG_CONTEXT,
  PROMOTION_STATUS,
  PromotionType,
  PromotionRuleType,
  RuleOperator,
  LogicOperator,
} from 'src/mkt-core/mkt-promotion/constants';
import { CreatePromotionRuleData } from 'src/mkt-core/mkt-promotion/types';
import { MktPromotionWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion.workspace-entity';
import { MktPromotionRuleWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion-rule.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Promotion Resolver
 *
 * Xử lý các GraphQL queries và mutations cho promotion:
 * - Queries: Lấy promotion theo ID, code, danh sách, danh sách active
 * - Mutations: Tạo, cập nhật, kích hoạt, tạm dừng, hủy promotion
 *
 * Business logic:
 * - Tạo promotion với các rules tùy chỉnh
 * - Quản lý trạng thái promotion lifecycle
 * - Cache promotion data để tối ưu performance
 * - Validate promotion rules trước khi apply
 */
@Resolver()
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class PromotionResolver {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly promotionApplicationService: PromotionApplicationService,
    private readonly promotionCacheService: PromotionCacheService,
  ) {}

  // ==================== QUERIES ====================

  /**
   * Lấy promotion theo ID
   */
  @Query(() => PromotionOutput, {
    name: 'mktPromotion',
    nullable: true,
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.PROMOTION_QUERY,
  })
  async mktPromotion(
    @AuthWorkspace() workspace: Workspace,
    @Args('id') id: string,
  ): Promise<PromotionOutput | null> {
    this.logger.log(
      `${PROMOTION_MESSAGES.operation('FETCH_BY_ID')} - ID: ${id}, workspace: ${workspace.id}`,
    );

    const result = await this.promotionApplicationService.getPromotionById(
      workspace.id,
      id,
    );

    if (!result) {
      this.logger.warn(
        `${PROMOTION_MESSAGES.error('PROMOTION_NOT_FOUND')} - ID: ${id}`,
      );

      return null;
    }

    // Map PromotionWithRules to PromotionOutput
    return this.mapToPromotionOutput(result.promotion, result.rules);
  }

  /**
   * Lấy danh sách promotions có phân trang
   */
  @Query(() => PaginatedPromotionsOutput, {
    name: 'mktPromotions',
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.PROMOTION_LIST_QUERY,
  })
  async mktPromotions(
    @AuthWorkspace() workspace: Workspace,
    @Args('input', { nullable: true }) input?: GetPromotionsInput,
  ): Promise<PaginatedPromotionsOutput> {
    this.logger.log(
      `${PROMOTION_MESSAGES.operation('FETCH_ALL')} - workspace: ${workspace.id}`,
    );

    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;

    const result = await this.promotionApplicationService.getPromotions(
      workspace.id,
      {
        limit,
        offset,
        status: input?.status,
        search: input?.search,
      },
    );

    return {
      items: result.items.map((p) => this.mapToPromotionOutput(p)),
      total: result.total,
      limit,
      offset,
      hasMore: offset + limit < result.total,
    };
  }

  /**
   * Lấy danh sách promotions đang active
   */
  @Query(() => [PromotionOutput], {
    name: 'mktActivePromotions',
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.ACTIVE_PROMOTIONS_QUERY,
  })
  async mktActivePromotions(
    @AuthWorkspace() workspace: Workspace,
  ): Promise<PromotionOutput[]> {
    this.logger.log(
      `${PROMOTION_MESSAGES.operation('FETCH_ALL')} active promotions - workspace: ${workspace.id}`,
    );

    const result = await this.promotionApplicationService.getActivePromotions(
      workspace.id,
    );

    return result.map((p) => this.mapToPromotionOutput(p));
  }

  // ==================== MUTATIONS ====================

  /**
   * Tạo promotion mới
   */
  @Mutation(() => PromotionOutput, {
    name: 'mktCreatePromotion',
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.CREATE_PROMOTION_MUTATION,
  })
  async mktCreatePromotion(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CreatePromotionInput,
  ): Promise<PromotionOutput> {
    this.logger.log(
      `${PROMOTION_MESSAGES.operation('CREATE_PROMOTION')} - workspace: ${workspace.id}`,
    );

    // Map input rules to CreatePromotionRuleData với proper type casting
    const mappedRules: CreatePromotionRuleData[] = (input.rules ?? []).map(
      (rule) => ({
        name: rule.name,
        ruleType: rule.ruleType as PromotionRuleType,
        operator: rule.operator as RuleOperator,
        targetIds: rule.targetIds ?? null,
        targetValues: rule.targetValues ?? null,
        isRequired: rule.isRequired,
        logicOperator: rule.logicOperator as LogicOperator | undefined,
        position: rule.position,
      }),
    );

    const result = await this.promotionApplicationService.createPromotion(
      workspace.id,
      {
        name: input.name,
        code: input.code,
        description: input.description ?? null,
        promotionType: input.promotionType as PromotionType,
        discountValue: input.discountValue,
        maxDiscountAmount: input.maxDiscountAmount ?? null,
        minOrderAmount: input.minOrderAmount ?? null,
        currency: input.currency ?? 'VND',
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        usageLimit: input.usageLimit ?? null,
        usageLimitPerCustomer: input.usageLimitPerCustomer ?? null,
        priority: input.priority ?? 0,
        stackable: input.stackable ?? false,
        isAutoApply: input.isAutoApply ?? false,
        rules: mappedRules,
      },
      'resolver', // createdBy
    );

    this.logger.log(
      `${PROMOTION_MESSAGES.success('PROMOTION_CREATED')} - ID: ${result.promotion.id}, code: ${result.promotion.code}`,
    );

    return this.mapToPromotionOutput(result.promotion, result.rules);
  }

  /**
   * Cập nhật promotion
   */
  @Mutation(() => PromotionOutput, {
    name: 'mktUpdatePromotion',
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.UPDATE_PROMOTION_MUTATION,
  })
  async mktUpdatePromotion(
    @AuthWorkspace() workspace: Workspace,
    @Args('id') id: string,
    @Args('input') input: UpdatePromotionInput,
  ): Promise<PromotionOutput> {
    this.logger.log(
      `${PROMOTION_MESSAGES.operation('UPDATE_PROMOTION')} - ID: ${id}, workspace: ${workspace.id}`,
    );

    const result = await this.promotionApplicationService.updatePromotion(
      workspace.id,
      {
        id,
        name: input.name,
        description: input.description,
        promotionType: input.promotionType
          ? (input.promotionType as PromotionType)
          : undefined,
        discountValue: input.discountValue,
        maxDiscountAmount: input.maxDiscountAmount,
        minOrderAmount: input.minOrderAmount,
        currency: input.currency,
        startDate: input.startDate,
        endDate: input.endDate,
        usageLimit: input.usageLimit,
        usageLimitPerCustomer: input.usageLimitPerCustomer,
        priority: input.priority,
        stackable: input.stackable,
        isAutoApply: input.isAutoApply,
      },
      'resolver', // updatedBy
    );

    // Invalidate cache sau khi update
    await this.promotionCacheService.invalidatePromotion(workspace.id, id);

    this.logger.log(
      `${PROMOTION_MESSAGES.success('PROMOTION_UPDATED')} - ID: ${id}`,
    );

    return this.mapToPromotionOutput(result.promotion, result.rules);
  }

  /**
   * Kích hoạt promotion
   */
  @Mutation(() => PromotionOutput, {
    name: 'mktActivatePromotion',
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.ACTIVATE_PROMOTION_MUTATION,
  })
  async mktActivatePromotion(
    @AuthWorkspace() workspace: Workspace,
    @Args('id') id: string,
  ): Promise<PromotionOutput> {
    this.logger.log(
      `${PROMOTION_MESSAGES.operation('ACTIVATE_PROMOTION')} - ID: ${id}, workspace: ${workspace.id}`,
    );

    const promotion =
      await this.promotionApplicationService.changePromotionStatus(
        workspace.id,
        id,
        PROMOTION_STATUS.ACTIVE,
      );

    // Invalidate cache
    await this.promotionCacheService.invalidatePromotion(workspace.id, id);

    this.logger.log(
      `${PROMOTION_MESSAGES.success('PROMOTION_ACTIVATED')} - ID: ${id}`,
    );

    return this.mapToPromotionOutput(promotion);
  }

  /**
   * Tạm dừng promotion
   */
  @Mutation(() => PromotionOutput, {
    name: 'mktPausePromotion',
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.PAUSE_PROMOTION_MUTATION,
  })
  async mktPausePromotion(
    @AuthWorkspace() workspace: Workspace,
    @Args('id') id: string,
  ): Promise<PromotionOutput> {
    this.logger.log(
      `${PROMOTION_MESSAGES.operation('PAUSE_PROMOTION')} - ID: ${id}, workspace: ${workspace.id}`,
    );

    const promotion =
      await this.promotionApplicationService.changePromotionStatus(
        workspace.id,
        id,
        PROMOTION_STATUS.PAUSED,
      );

    // Invalidate cache
    await this.promotionCacheService.invalidatePromotion(workspace.id, id);

    this.logger.log(
      `${PROMOTION_MESSAGES.success('PROMOTION_PAUSED')} - ID: ${id}`,
    );

    return this.mapToPromotionOutput(promotion);
  }

  /**
   * Hủy promotion
   */
  @Mutation(() => PromotionOutput, {
    name: 'mktCancelPromotion',
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.CANCEL_PROMOTION_MUTATION,
  })
  async mktCancelPromotion(
    @AuthWorkspace() workspace: Workspace,
    @Args('id') id: string,
  ): Promise<PromotionOutput> {
    this.logger.log(
      `${PROMOTION_MESSAGES.operation('CANCEL_PROMOTION')} - ID: ${id}, workspace: ${workspace.id}`,
    );

    const promotion =
      await this.promotionApplicationService.changePromotionStatus(
        workspace.id,
        id,
        PROMOTION_STATUS.CANCELLED,
      );

    // Invalidate cache
    await this.promotionCacheService.invalidatePromotion(workspace.id, id);

    this.logger.log(
      `${PROMOTION_MESSAGES.success('PROMOTION_CANCELLED')} - ID: ${id}`,
    );

    return this.mapToPromotionOutput(promotion);
  }

  // ==================== HELPERS ====================

  /**
   * Map workspace entity to GraphQL output
   */
  private mapToPromotionOutput(
    promotion: MktPromotionWorkspaceEntity,
    rules?: MktPromotionRuleWorkspaceEntity[],
  ): PromotionOutput {
    return {
      id: promotion.id,
      name: promotion.name,
      code: promotion.code,
      description: promotion.description,
      status: promotion.status,
      promotionType: promotion.promotionType,
      discountValue: promotion.discountValue,
      maxDiscountAmount: promotion.maxDiscountAmount,
      minOrderAmount: promotion.minOrderAmount,
      currency: promotion.currency,
      startDate: promotion.startDate,
      endDate: promotion.endDate ?? null,
      usageLimit: promotion.usageLimit,
      usageLimitPerCustomer: promotion.usageLimitPerCustomer,
      currentUsageCount: promotion.currentUsageCount,
      priority: promotion.priority,
      stackable: promotion.stackable,
      isAutoApply: promotion.isAutoApply,
      rules: rules?.map((r) => ({
        id: r.id,
        name: r.name,
        ruleType: r.ruleType,
        operator: r.operator,
        targetIds: r.targetIds,
        targetValues: r.targetValues,
        isRequired: r.isRequired,
        logicOperator: r.logicOperator,
        position: r.position,
      })),
      createdAt: DateTimeUtils.toDateRequired(
        DateTimeUtils.fromISO(promotion.createdAt),
      ),
      updatedAt: DateTimeUtils.toDateRequired(
        DateTimeUtils.fromISO(promotion.updatedAt),
      ),
    };
  }
}
