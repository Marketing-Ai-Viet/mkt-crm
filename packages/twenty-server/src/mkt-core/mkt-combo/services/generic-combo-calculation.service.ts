import { Injectable, Logger } from '@nestjs/common';

import round from 'lodash.round';
import sumBy from 'lodash.sumby';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services/mkt-product-proxy.service';
import {
  MktSupportedLanguage,
  MktProduct,
  MktProductPackage,
} from 'src/mkt-core/mkt-product-integration/types';
import { MktProductWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-product.workspace-entity';
import { MktVariantWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant.workspace-entity';
import { MktGenericComboWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo.workspace-entity';
import { MktGenericComboItemWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo-item.workspace-entity';
import {
  GenericComboCalculationResult,
  GenericComboItemCalculation,
} from 'src/mkt-core/mkt-combo/types/generic-combo.types';
import {
  GenericComboPricingType,
  GENERIC_COMBO_PRICING_TYPE,
  GENERIC_COMBO_LOG_CONTEXT,
  GENERIC_COMBO_RETRY,
  COMBO_ITEM_TYPE,
  ComboItemType,
} from 'src/mkt-core/mkt-combo/constants/generic-combo.constants';

/**
 * Service tính toán giá combo cho nhiều loại item
 * Xử lý parallel fetching và áp dụng pricing strategy
 */
@Injectable()
export class GenericComboCalculationService {
  private readonly logger = new Logger(GENERIC_COMBO_LOG_CONTEXT);

  constructor(
    private readonly mktProductProxy: MktProductProxyService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Tính giá combo với parallel fetching
   */
  async calculateComboPrice(
    workspaceId: string,
    combo: MktGenericComboWorkspaceEntity,
    items: MktGenericComboItemWorkspaceEntity[],
    _language: MktSupportedLanguage = 'vi',
  ): Promise<GenericComboCalculationResult> {
    if (items.length === 0) {
      return {
        originalPrice: 0,
        comboPrice: 0,
        savings: 0,
        savingsPercent: 0,
        currency: combo.currency,
        itemDetails: [],
        calculatedAt: new Date(),
      };
    }

    // Parallel fetch và tính giá cho từng item
    const itemCalculations = await this.calculateItemPricesParallel(
      workspaceId,
      items,
    );

    // Tính giá gốc
    const originalPrice = sumBy(itemCalculations, 'totalPrice');

    // Áp dụng pricing strategy
    const comboPrice = this.applyPricingStrategy(
      combo.pricingType as GenericComboPricingType,
      originalPrice,
      combo.fixedPrice,
      combo.discountPercent,
    );

    // Tính savings
    const savings = Math.max(0, originalPrice - comboPrice);
    const savingsPercent =
      originalPrice > 0 ? round((savings / originalPrice) * 100, 2) : 0;

    // Tính adjusted prices (pro-rata)
    const discountRatio = originalPrice > 0 ? comboPrice / originalPrice : 1;
    const adjustedItems = itemCalculations.map((item) => ({
      ...item,
      adjustedUnitPrice: round(item.unitPrice * discountRatio, 2),
      adjustedTotalPrice: round(item.totalPrice * discountRatio, 2),
    }));

    return {
      originalPrice: round(originalPrice, 2),
      comboPrice: round(comboPrice, 2),
      savings: round(savings, 2),
      savingsPercent,
      currency: combo.currency,
      itemDetails: adjustedItems,
      calculatedAt: new Date(),
    };
  }

  /**
   * Parallel fetch và tính giá cho từng item dựa trên item type
   */
  private async calculateItemPricesParallel(
    workspaceId: string,
    items: MktGenericComboItemWorkspaceEntity[],
  ): Promise<GenericComboItemCalculation[]> {
    // Group items by type để batch fetch
    const digitalExternalItems = items.filter(
      (i) => i.itemType === COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
    );
    const internalProductItems = items.filter(
      (i) => i.itemType === COMBO_ITEM_TYPE.INTERNAL_PRODUCT,
    );
    const internalVariantItems = items.filter(
      (i) => i.itemType === COMBO_ITEM_TYPE.INTERNAL_VARIANT,
    );
    const _serviceItems = items.filter(
      (i) => i.itemType === COMBO_ITEM_TYPE.SERVICE,
    );
    const _customItems = items.filter(
      (i) => i.itemType === COMBO_ITEM_TYPE.CUSTOM,
    );

    // Parallel fetch external products
    const [
      externalProducts,
      externalPackages,
      internalProducts,
      internalVariants,
    ] = await Promise.all([
      this.fetchExternalProductsBatch(digitalExternalItems),
      this.fetchExternalPackagesBatch(digitalExternalItems),
      this.fetchInternalProductsBatch(workspaceId, internalProductItems),
      this.fetchInternalVariantsBatch(workspaceId, internalVariantItems),
    ]);

    // Build lookup maps
    const externalProductMap = new Map(externalProducts.map((p) => [p.id, p]));
    const externalPackageMap = new Map(externalPackages.map((p) => [p.id, p]));
    const internalProductMap = new Map(internalProducts.map((p) => [p.id, p]));
    const internalVariantMap = new Map(internalVariants.map((v) => [v.id, v]));

    // Tính giá cho mỗi item
    return items.map((item) =>
      this.calculateSingleItemPrice(
        item,
        externalProductMap,
        externalPackageMap,
        internalProductMap,
        internalVariantMap,
      ),
    );
  }

  /**
   * Tính giá cho một item dựa trên type
   */
  private calculateSingleItemPrice(
    item: MktGenericComboItemWorkspaceEntity,
    externalProductMap: Map<string, MktProduct>,
    externalPackageMap: Map<string, MktProductPackage>,
    internalProductMap: Map<string, MktProductWorkspaceEntity>,
    internalVariantMap: Map<string, MktVariantWorkspaceEntity>,
  ): GenericComboItemCalculation {
    let unitPrice = item.overridePrice ?? 0;
    let displayName = item.displayName ?? '';

    // Nếu không có override price, lấy giá từ source tương ứng
    if (item.overridePrice === null) {
      const priceAndName = this.getPriceByItemType(
        item,
        externalProductMap,
        externalPackageMap,
        internalProductMap,
        internalVariantMap,
      );

      unitPrice = priceAndName.unitPrice;
      displayName = displayName || priceAndName.displayName;
    }

    return {
      id: item.id,
      itemType: item.itemType as ComboItemType,
      displayName,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
      adjustedUnitPrice: unitPrice,
      adjustedTotalPrice: unitPrice * item.quantity,
    };
  }

  /**
   * Lấy giá và tên dựa trên item type
   */
  private getPriceByItemType(
    item: MktGenericComboItemWorkspaceEntity,
    externalProductMap: Map<string, MktProduct>,
    externalPackageMap: Map<string, MktProductPackage>,
    internalProductMap: Map<string, MktProductWorkspaceEntity>,
    internalVariantMap: Map<string, MktVariantWorkspaceEntity>,
  ): { unitPrice: number; displayName: string } {
    switch (item.itemType) {
      case COMBO_ITEM_TYPE.DIGITAL_EXTERNAL: {
        // Package có priority cao hơn product
        if (item.externalPackageId) {
          const pkg = externalPackageMap.get(item.externalPackageId);

          if (pkg) {
            return {
              unitPrice: pkg.price,
              displayName: pkg.packageName,
            };
          }
        }

        // Fallback to product
        if (item.externalProductId) {
          const product = externalProductMap.get(item.externalProductId);

          if (product) {
            return {
              unitPrice: product.basePrice ?? 0,
              displayName: product.productName,
            };
          }
        }

        return { unitPrice: 0, displayName: '' };
      }

      case COMBO_ITEM_TYPE.INTERNAL_PRODUCT: {
        if (item.mktProductId) {
          const product = internalProductMap.get(item.mktProductId);

          if (product) {
            return {
              unitPrice: product.price ?? 0,
              displayName: product.name ?? '',
            };
          }
        }

        return { unitPrice: 0, displayName: '' };
      }

      case COMBO_ITEM_TYPE.INTERNAL_VARIANT: {
        if (item.mktVariantId) {
          const variant = internalVariantMap.get(item.mktVariantId);

          if (variant) {
            return {
              unitPrice: variant.price ?? 0,
              displayName: variant.name ?? '',
            };
          }
        }

        return { unitPrice: 0, displayName: '' };
      }

      case COMBO_ITEM_TYPE.SERVICE: {
        return {
          unitPrice: item.servicePrice ?? 0,
          displayName: item.serviceName ?? '',
        };
      }

      case COMBO_ITEM_TYPE.CUSTOM: {
        return {
          unitPrice: item.customPrice ?? 0,
          displayName: item.customName ?? '',
        };
      }

      default:
        return { unitPrice: 0, displayName: '' };
    }
  }

  /**
   * Batch fetch external products với retry
   */
  private async fetchExternalProductsBatch(
    items: MktGenericComboItemWorkspaceEntity[],
  ): Promise<MktProduct[]> {
    const productIds = [
      ...new Set(
        items
          .map((i) => i.externalProductId)
          .filter((id): id is string => id !== null),
      ),
    ];

    const results: MktProduct[] = [];

    for (const productId of productIds) {
      try {
        const product = await this.fetchWithRetry(() =>
          this.mktProductProxy.getProduct(productId),
        );

        if (product) {
          results.push(product);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch external product ${productId}`,
          error,
        );
      }
    }

    return results;
  }

  /**
   * Batch fetch external packages với retry
   */
  private async fetchExternalPackagesBatch(
    items: MktGenericComboItemWorkspaceEntity[],
  ): Promise<MktProductPackage[]> {
    const packageIds = [
      ...new Set(
        items
          .map((i) => i.externalPackageId)
          .filter((id): id is string => id !== null),
      ),
    ];

    const results: MktProductPackage[] = [];

    for (const packageId of packageIds) {
      try {
        const pkg = await this.fetchWithRetry(() =>
          this.mktProductProxy.getPackage(packageId),
        );

        if (pkg) {
          results.push(pkg);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch external package ${packageId}`,
          error,
        );
      }
    }

    return results;
  }

  /**
   * Batch fetch internal products
   */
  private async fetchInternalProductsBatch(
    workspaceId: string,
    items: MktGenericComboItemWorkspaceEntity[],
  ): Promise<MktProductWorkspaceEntity[]> {
    const productIds = [
      ...new Set(
        items
          .map((i) => i.mktProductId)
          .filter((id): id is string => id !== null),
      ),
    ];

    if (productIds.length === 0) {
      return [];
    }

    try {
      const repository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktProductWorkspaceEntity>(
          workspaceId,
          'mktProduct',
        );

      return repository
        .createQueryBuilder('product')
        .where('product.id IN (:...ids)', { ids: productIds })
        .getMany();
    } catch (error) {
      this.logger.warn('Failed to fetch internal products', error);

      return [];
    }
  }

  /**
   * Batch fetch internal variants
   */
  private async fetchInternalVariantsBatch(
    workspaceId: string,
    items: MktGenericComboItemWorkspaceEntity[],
  ): Promise<MktVariantWorkspaceEntity[]> {
    const variantIds = [
      ...new Set(
        items
          .map((i) => i.mktVariantId)
          .filter((id): id is string => id !== null),
      ),
    ];

    if (variantIds.length === 0) {
      return [];
    }

    try {
      const repository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktVariantWorkspaceEntity>(
          workspaceId,
          'mktVariant',
        );

      return repository
        .createQueryBuilder('variant')
        .where('variant.id IN (:...ids)', { ids: variantIds })
        .getMany();
    } catch (error) {
      this.logger.warn('Failed to fetch internal variants', error);

      return [];
    }
  }

  /**
   * Retry wrapper với exponential backoff
   */
  private async fetchWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = GENERIC_COMBO_RETRY.MAX_RETRIES,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const delay = Math.min(
          GENERIC_COMBO_RETRY.INITIAL_DELAY_MS * Math.pow(2, attempt),
          GENERIC_COMBO_RETRY.MAX_DELAY_MS,
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Áp dụng pricing strategy
   */
  private applyPricingStrategy(
    pricingType: GenericComboPricingType,
    originalPrice: number,
    fixedPrice: number | null,
    discountPercent: number | null,
  ): number {
    switch (pricingType) {
      case GENERIC_COMBO_PRICING_TYPE.FIXED:
        return fixedPrice ?? originalPrice;

      case GENERIC_COMBO_PRICING_TYPE.DISCOUNT: {
        const discount = (discountPercent ?? 0) / 100;

        return originalPrice * (1 - discount);
      }

      case GENERIC_COMBO_PRICING_TYPE.SUM:
      default:
        return originalPrice;
    }
  }
}
