import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { MktSupportedLanguage } from 'src/mkt-core/mkt-product-integration/types';
import { GenericComboService } from 'src/mkt-core/mkt-combo/services/generic-combo.service';
import {
  CreateGenericComboInput,
  UpdateGenericComboInput,
  CreateGenericComboItemInput,
  GetGenericCombosInput,
  CalculateGenericComboPriceInput,
} from 'src/mkt-core/mkt-combo/dto/generic-combo.input';
import {
  GenericComboOutput,
  PaginatedGenericCombosOutput,
  GenericComboPriceCalculationOutput,
  GenericComboValidationOutput,
  GenericComboSnapshotOutput,
} from 'src/mkt-core/mkt-combo/dto/generic-combo.output';
import {
  CreateGenericComboData,
  CreateGenericComboItemData,
} from 'src/mkt-core/mkt-combo/types/generic-combo.types';
import {
  GenericComboPricingType,
  ComboItemType,
  GENERIC_COMBO_LOG_CONTEXT,
} from 'src/mkt-core/mkt-combo/constants/generic-combo.constants';
import {
  GENERIC_COMBO_MESSAGES,
  GENERIC_COMBO_GRAPHQL_DESCRIPTIONS,
} from 'src/mkt-core/mkt-combo/message';
import { mapGenericComboToOutput } from 'src/mkt-core/mkt-combo/utils';

/**
 * Generic Combo Resolver
 *
 * Xử lý combo với nhiều loại item:
 * - DIGITAL_EXTERNAL: Sản phẩm từ MKT Server
 * - INTERNAL_PRODUCT: Sản phẩm nội bộ CRM
 * - INTERNAL_VARIANT: Variant nội bộ CRM
 * - SERVICE: Dịch vụ
 * - CUSTOM: Item tùy chỉnh
 */
@Resolver()
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class GenericComboResolver {
  private readonly logger = new Logger(GENERIC_COMBO_LOG_CONTEXT);

  constructor(private readonly genericComboService: GenericComboService) {}

  // ==================== QUERIES ====================

  /**
   * Lấy combo theo ID
   */
  @Query(() => GenericComboOutput, {
    name: 'mktGenericCombo',
    nullable: true,
    description: GENERIC_COMBO_GRAPHQL_DESCRIPTIONS.COMBO_QUERY,
  })
  async mktGenericCombo(
    @AuthWorkspace() workspace: Workspace,
    @Args('comboId') comboId: string,
  ): Promise<GenericComboOutput | null> {
    const result = await this.genericComboService.getComboById(
      workspace.id,
      comboId,
    );

    if (!result) {
      return null;
    }

    return mapGenericComboToOutput(result.combo, result.items);
  }

  /**
   * Lấy combo theo code
   */
  @Query(() => GenericComboOutput, {
    name: 'mktGenericComboByCode',
    nullable: true,
    description: GENERIC_COMBO_GRAPHQL_DESCRIPTIONS.COMBO_BY_CODE_QUERY,
  })
  async mktGenericComboByCode(
    @AuthWorkspace() workspace: Workspace,
    @Args('comboCode') comboCode: string,
  ): Promise<GenericComboOutput | null> {
    const result = await this.genericComboService.getComboByCode(
      workspace.id,
      comboCode,
    );

    if (!result) {
      return null;
    }

    return mapGenericComboToOutput(result.combo, result.items);
  }

  /**
   * Lấy danh sách combos có phân trang
   */
  @Query(() => PaginatedGenericCombosOutput, {
    name: 'mktGenericCombos',
    description: GENERIC_COMBO_GRAPHQL_DESCRIPTIONS.COMBOS_QUERY,
  })
  async mktGenericCombos(
    @AuthWorkspace() workspace: Workspace,
    @Args('input', { nullable: true }) input?: GetGenericCombosInput,
  ): Promise<PaginatedGenericCombosOutput> {
    const pagination = {
      limit: input?.limit ?? 20,
      offset: input?.offset ?? 0,
    };

    const result = await this.genericComboService.getCombosPaginated(
      workspace.id,
      pagination,
      input?.filter,
    );

    return {
      items: result.items.map((combo) => mapGenericComboToOutput(combo)),
      total: result.total,
      hasMore: result.hasMore,
    };
  }

  /**
   * Tính giá combo
   */
  @Query(() => GenericComboPriceCalculationOutput, {
    name: 'mktCalculateGenericComboPrice',
    description: GENERIC_COMBO_GRAPHQL_DESCRIPTIONS.CALCULATE_PRICE_QUERY,
  })
  async mktCalculateGenericComboPrice(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CalculateGenericComboPriceInput,
  ): Promise<GenericComboPriceCalculationOutput> {
    const language = (input.language as MktSupportedLanguage) ?? 'vi';

    return this.genericComboService.calculateComboPrice(
      workspace.id,
      input.comboId,
      language,
    );
  }

  /**
   * Validate combo cho order
   */
  @Query(() => GenericComboValidationOutput, {
    name: 'mktValidateGenericCombo',
    description: GENERIC_COMBO_GRAPHQL_DESCRIPTIONS.VALIDATE_COMBO_QUERY,
  })
  async mktValidateGenericCombo(
    @AuthWorkspace() workspace: Workspace,
    @Args('comboId') comboId: string,
  ): Promise<GenericComboValidationOutput> {
    const result = await this.genericComboService.validateForOrder(
      workspace.id,
      comboId,
    );

    return {
      valid: result.valid,
      errors: result.errors.map((e) => ({
        field: e.field,
        message: e.message,
        code: e.code,
      })),
      combo: result.combo
        ? mapGenericComboToOutput(result.combo.combo, result.combo.items)
        : undefined,
    };
  }

  /**
   * Lấy preview snapshot (không lưu)
   */
  @Query(() => GenericComboSnapshotOutput, {
    name: 'mktPreviewGenericComboSnapshot',
    description: GENERIC_COMBO_GRAPHQL_DESCRIPTIONS.PREVIEW_SNAPSHOT_QUERY,
  })
  async mktPreviewGenericComboSnapshot(
    @AuthWorkspace() workspace: Workspace,
    @Args('comboId') comboId: string,
    @Args('language', { nullable: true, defaultValue: 'vi' })
    language?: string,
  ): Promise<GenericComboSnapshotOutput> {
    const lang = (language as MktSupportedLanguage) ?? 'vi';

    return this.genericComboService.createComboSnapshot(
      workspace.id,
      comboId,
      lang,
    );
  }

  // ==================== MUTATIONS ====================

  /**
   * Tạo combo mới
   */
  @Mutation(() => GenericComboOutput, {
    name: 'mktCreateGenericCombo',
    description: GENERIC_COMBO_GRAPHQL_DESCRIPTIONS.CREATE_COMBO_MUTATION,
  })
  async mktCreateGenericCombo(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CreateGenericComboInput,
  ): Promise<GenericComboOutput> {
    const data: CreateGenericComboData = {
      comboCode: input.comboCode,
      name: input.name,
      description: input.description ?? null,
      pricingType: input.pricingType as GenericComboPricingType,
      fixedPrice: input.fixedPrice ?? null,
      discountPercent: input.discountPercent ?? null,
      currency: input.currency ?? 'VND',
      isActive: input.isActive ?? true,
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
      items: input.items.map((item) => this.mapItemInputToData(item)),
    };

    const combo = await this.genericComboService.createCombo(
      workspace.id,
      data,
    );

    this.logger.log(
      `${GENERIC_COMBO_MESSAGES.SUCCESS.CREATED} - ID: ${combo.id}, workspace: ${workspace.id}`,
    );

    return mapGenericComboToOutput(combo);
  }

  /**
   * Cập nhật combo
   */
  @Mutation(() => GenericComboOutput, {
    name: 'mktUpdateGenericCombo',
    description: GENERIC_COMBO_GRAPHQL_DESCRIPTIONS.UPDATE_COMBO_MUTATION,
  })
  async mktUpdateGenericCombo(
    @AuthWorkspace() workspace: Workspace,
    @Args('comboId') comboId: string,
    @Args('input') input: UpdateGenericComboInput,
  ): Promise<GenericComboOutput> {
    const combo = await this.genericComboService.updateCombo(
      workspace.id,
      comboId,
      {
        name: input.name,
        description: input.description,
        pricingType: input.pricingType as GenericComboPricingType | undefined,
        fixedPrice: input.fixedPrice,
        discountPercent: input.discountPercent,
        currency: input.currency,
        isActive: input.isActive,
        validFrom: input.validFrom,
        validTo: input.validTo,
        expectedVersion: input.expectedVersion,
      },
    );

    this.logger.log(
      `${GENERIC_COMBO_MESSAGES.SUCCESS.UPDATED} - ID: ${comboId}, workspace: ${workspace.id}`,
    );

    return mapGenericComboToOutput(combo);
  }

  /**
   * Xóa combo
   */
  @Mutation(() => Boolean, {
    name: 'mktDeleteGenericCombo',
    description: GENERIC_COMBO_GRAPHQL_DESCRIPTIONS.DELETE_COMBO_MUTATION,
  })
  async mktDeleteGenericCombo(
    @AuthWorkspace() workspace: Workspace,
    @Args('comboId') comboId: string,
  ): Promise<boolean> {
    await this.genericComboService.deleteCombo(workspace.id, comboId);

    this.logger.log(
      `${GENERIC_COMBO_MESSAGES.SUCCESS.DELETED} - ID: ${comboId}, workspace: ${workspace.id}`,
    );

    return true;
  }

  /**
   * Thêm items vào combo
   */
  @Mutation(() => Boolean, {
    name: 'mktAddGenericComboItems',
    description: GENERIC_COMBO_GRAPHQL_DESCRIPTIONS.ADD_ITEMS_MUTATION,
  })
  async mktAddGenericComboItems(
    @AuthWorkspace() workspace: Workspace,
    @Args('comboId') comboId: string,
    @Args({ name: 'items', type: () => [CreateGenericComboItemInput] })
    items: CreateGenericComboItemInput[],
  ): Promise<boolean> {
    await this.genericComboService.addItemsToCombo(
      workspace.id,
      comboId,
      items.map((item) => this.mapItemInputToData(item)),
    );

    this.logger.log(
      `${GENERIC_COMBO_MESSAGES.SUCCESS.ITEMS_ADDED} - ${items.length} items to combo ${comboId}, workspace: ${workspace.id}`,
    );

    return true;
  }

  /**
   * Xóa item khỏi combo
   */
  @Mutation(() => Boolean, {
    name: 'mktRemoveGenericComboItem',
    description: GENERIC_COMBO_GRAPHQL_DESCRIPTIONS.REMOVE_ITEM_MUTATION,
  })
  async mktRemoveGenericComboItem(
    @AuthWorkspace() workspace: Workspace,
    @Args('comboId') comboId: string,
    @Args('itemId') itemId: string,
  ): Promise<boolean> {
    await this.genericComboService.removeItemFromCombo(
      workspace.id,
      comboId,
      itemId,
    );

    this.logger.log(
      `${GENERIC_COMBO_MESSAGES.SUCCESS.ITEM_REMOVED} - item ${itemId} from combo ${comboId}, workspace: ${workspace.id}`,
    );

    return true;
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Map input item to data
   */
  private mapItemInputToData(
    item: CreateGenericComboItemInput,
  ): CreateGenericComboItemData {
    return {
      itemType: item.itemType as ComboItemType,
      displayName: item.displayName ?? null,
      quantity: item.quantity ?? 1,
      overridePrice: item.overridePrice ?? null,
      position: item.position ?? 0,
      // DIGITAL_EXTERNAL fields
      externalProductId: item.externalProductId ?? null,
      externalProductCode: item.externalProductCode ?? null,
      externalPackageId: item.externalPackageId ?? null,
      externalPackageCode: item.externalPackageCode ?? null,
      // INTERNAL_PRODUCT fields
      mktProductId: item.mktProductId ?? null,
      // INTERNAL_VARIANT fields
      mktVariantId: item.mktVariantId ?? null,
      // SERVICE fields
      serviceName: item.serviceName ?? null,
      serviceDescription: item.serviceDescription ?? null,
      servicePrice: item.servicePrice ?? null,
      // CUSTOM fields
      customName: item.customName ?? null,
      customDescription: item.customDescription ?? null,
      customPrice: item.customPrice ?? null,
    };
  }
}
