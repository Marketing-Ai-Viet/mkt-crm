import { Injectable, Logger } from '@nestjs/common';

import Big from 'big.js';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {
  MoneyUtils,
  MONEY_DECIMAL_PLACES,
} from 'src/mkt-core/utils/money.utils';
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

    // Tính giá gốc sử dụng MoneyUtils (tránh floating-point errors)
    const originalPrice = MoneyUtils.sumBy(itemCalculations, 'totalPrice');

    // Áp dụng pricing strategy
    const comboPrice = this.applyPricingStrategy(
      combo.pricingType as GenericComboPricingType,
      originalPrice,
      combo.fixedPrice,
      combo.discountPercent,
    );

    // Tính savings sử dụng MoneyUtils
    const savings = MoneyUtils.max(
      MoneyUtils.zero(),
      MoneyUtils.subtract(originalPrice, comboPrice),
    );

    // Tính % savings
    const savingsPercent = MoneyUtils.percentageOf(savings, originalPrice);

    // Tính adjusted prices (pro-rata) sử dụng MoneyUtils
    const discountRatio = MoneyUtils.isPositive(originalPrice)
      ? MoneyUtils.divideSafe(comboPrice, originalPrice)
      : MoneyUtils.from(1);

    const adjustedItems = itemCalculations.map((item) => ({
      ...item,
      adjustedUnitPrice: MoneyUtils.multiply(item.unitPrice, discountRatio)
        .round(MONEY_DECIMAL_PLACES.CURRENCY)
        .toNumber(),
      adjustedTotalPrice: MoneyUtils.multiply(item.totalPrice, discountRatio)
        .round(MONEY_DECIMAL_PLACES.CURRENCY)
        .toNumber(),
    }));

    return {
      originalPrice: MoneyUtils.round(originalPrice).toNumber(),
      comboPrice: MoneyUtils.round(comboPrice).toNumber(),
      savings: MoneyUtils.round(savings).toNumber(),
      savingsPercent: savingsPercent.toNumber(),
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

    // Fetch packages trước để lấy productIds từ packages
    const externalPackages =
      await this.fetchExternalPackagesBatch(digitalExternalItems);

    // Lấy productIds từ packages để fetch products
    const packageProductIds = externalPackages.map((pkg) => pkg.productId);

    // Parallel fetch products (từ items + từ packages) và internal entities
    const [externalProducts, internalProducts, internalVariants] =
      await Promise.all([
        this.fetchExternalProductsBatch(
          digitalExternalItems,
          packageProductIds,
        ),
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

    // Tính totalPrice sử dụng MoneyUtils để tránh floating-point errors
    const totalPrice = MoneyUtils.multiply(unitPrice, item.quantity)
      .round(MONEY_DECIMAL_PLACES.CURRENCY)
      .toNumber();

    return {
      id: item.id,
      itemType: item.itemType as ComboItemType,
      displayName,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      adjustedUnitPrice: unitPrice,
      adjustedTotalPrice: totalPrice,
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
        // Bán theo package - package là bắt buộc
        if (!item.externalPackageId) {
          this.logger.warn(
            `Digital external item ${item.id} missing externalPackageId`,
          );

          return { unitPrice: 0, displayName: '' };
        }

        const pkg = externalPackageMap.get(item.externalPackageId);

        if (!pkg) {
          this.logger.warn(
            `Package ${item.externalPackageId} not found for item ${item.id}`,
          );

          return { unitPrice: 0, displayName: '' };
        }

        // Lấy product name từ item.externalProductId hoặc package.productId
        const productId = item.externalProductId ?? pkg.productId;
        const product = externalProductMap.get(productId);
        const productName = product?.productName ?? '';

        // Display name: "Product Name - Package Name" hoặc chỉ "Package Name"
        const displayName = productName
          ? `${productName} - ${pkg.packageName}`
          : pkg.packageName;

        return {
          unitPrice: pkg.price,
          displayName,
        };
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
   * Lấy products từ items + products từ packages (để hiển thị tên product)
   */
  private async fetchExternalProductsBatch(
    items: MktGenericComboItemWorkspaceEntity[],
    additionalProductIds: string[] = [],
  ): Promise<MktProduct[]> {
    // Combine productIds từ items và từ packages
    const itemProductIds = items
      .map((i) => i.externalProductId)
      .filter((id): id is string => id !== null);

    const allProductIds = [
      ...new Set([...itemProductIds, ...additionalProductIds]),
    ];

    const results: MktProduct[] = [];

    for (const productId of allProductIds) {
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
   * Áp dụng pricing strategy sử dụng MoneyUtils
   * - FIXED: Sử dụng fixedPrice
   * - DISCOUNT: Áp dụng % giảm giá
   * - SUM: Giữ nguyên tổng giá
   */
  private applyPricingStrategy(
    pricingType: GenericComboPricingType,
    originalPrice: Big,
    fixedPrice: number | null,
    discountPercent: number | null,
  ): Big {
    switch (pricingType) {
      case GENERIC_COMBO_PRICING_TYPE.FIXED:
        return fixedPrice !== null
          ? MoneyUtils.from(fixedPrice)
          : originalPrice;

      case GENERIC_COMBO_PRICING_TYPE.DISCOUNT: {
        // Sử dụng MoneyUtils.applyDiscount để tính chính xác
        return MoneyUtils.applyDiscount(originalPrice, discountPercent ?? 0);
      }

      case GENERIC_COMBO_PRICING_TYPE.SUM:
      default:
        return originalPrice;
    }
  }
}
