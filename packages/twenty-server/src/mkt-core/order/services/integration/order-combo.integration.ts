import { Injectable, Logger } from '@nestjs/common';

import { GenericComboService } from 'src/mkt-core/mkt-combo/services/generic-combo.service';
import {
  GenericComboSnapshot,
  GenericComboItemSnapshot,
} from 'src/mkt-core/mkt-combo/types/generic-combo.types';
import {
  COMBO_ITEM_TYPE,
  ComboItemType,
} from 'src/mkt-core/mkt-combo/constants/generic-combo.constants';
import { MktSupportedLanguage } from 'src/mkt-core/mkt-product-integration/types';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import {
  ComboOrderInput,
  CreateOrderItemFromComboData,
  FlattenedComboResult,
  ORDER_ITEM_SOURCE,
  ORDER_ITEM_TYPE,
  OrderItemType,
} from 'src/mkt-core/order/types/order-combo.types';

const ORDER_COMBO_LOG_CONTEXT = 'OrderComboIntegration';

/**
 * Default options for flattening combos
 */
const FLATTEN_DEFAULTS = {
  MAX_DEVICES: 1,
  SPLIT_LICENSES: false,
} as const;

/**
 * Options for flatten operation
 */
export type FlattenOptions = {
  defaultMaxDevices?: number;
  defaultSplitLicenses?: boolean;
};

/**
 * Result from flattening multiple combos
 */
export type FlattenCombosResult = {
  flattenedItems: CreateOrderItemFromComboData[];
  comboSnapshots: GenericComboSnapshot[];
  totalComboDiscount: number;
};

/**
 * OrderComboIntegrationService (ComboFlattenService)
 *
 * Integration service that bridges Order module with Combo module.
 * Provides unified API for:
 * - Validating combos for orders
 * - Flattening combos into order items
 * - Creating immutable snapshots at order time
 * - Calculating combo discounts
 *
 * Architecture:
 * - Uses GenericComboService for combo operations
 * - Maps ComboItemType to OrderItemType for consistency
 * - Supports all item types: DIGITAL_EXTERNAL, INTERNAL_PRODUCT, INTERNAL_VARIANT, SERVICE, CUSTOM
 */
@Injectable()
export class OrderComboIntegrationService {
  private readonly logger = new Logger(ORDER_COMBO_LOG_CONTEXT);

  constructor(private readonly genericComboService: GenericComboService) {}

  /**
   * Validate and flatten a single combo into order items
   *
   * @param workspaceId - Workspace ID
   * @param comboInput - Combo order input
   * @param language - Display language for snapshots
   * @param options - Flatten options
   * @returns Flattened combo result with order items, snapshot, and discount
   */
  async flattenCombo(
    workspaceId: string,
    comboInput: ComboOrderInput,
    language: MktSupportedLanguage = 'vi',
    options?: FlattenOptions,
  ): Promise<FlattenedComboResult> {
    this.logger.debug('Flattening combo for order', {
      comboId: comboInput.comboId,
      quantity: comboInput.quantity,
    });

    // Create snapshot (validates combo internally)
    const comboSnapshot = await this.genericComboService.createComboSnapshot(
      workspaceId,
      comboInput.comboId,
      language,
    );

    // Flatten combo items into order items
    const orderItems = this.flattenComboItems(
      comboSnapshot,
      comboInput,
      options,
    );

    // Calculate combo discount
    const comboDiscount = this.calculateComboDiscount(
      comboSnapshot,
      comboInput.quantity,
    );

    this.logger.log('Combo flattened successfully', {
      comboId: comboInput.comboId,
      orderItemsCount: orderItems.length,
      comboDiscount,
    });

    return {
      orderItems,
      comboSnapshot,
      comboDiscount,
    };
  }

  /**
   * Validate and flatten multiple combos into order items
   *
   * @param workspaceId - Workspace ID
   * @param comboInputs - Array of combo order inputs
   * @param language - Display language for snapshots
   * @param options - Flatten options
   * @returns Combined result with all order items, snapshots, and total discount
   */
  async flattenCombos(
    workspaceId: string,
    comboInputs: ComboOrderInput[],
    language: MktSupportedLanguage = 'vi',
    options?: FlattenOptions,
  ): Promise<FlattenCombosResult> {
    this.logger.debug('Flattening combos for order', {
      comboCount: comboInputs.length,
    });

    if (comboInputs.length === 0) {
      return {
        flattenedItems: [],
        comboSnapshots: [],
        totalComboDiscount: 0,
      };
    }

    const flattenedItems: CreateOrderItemFromComboData[] = [];
    const comboSnapshots: GenericComboSnapshot[] = [];
    let totalComboDiscount = 0;

    // Process each combo sequentially to maintain order and handle errors properly
    for (const comboInput of comboInputs) {
      const result = await this.flattenCombo(
        workspaceId,
        comboInput,
        language,
        options,
      );

      flattenedItems.push(...result.orderItems);
      comboSnapshots.push(result.comboSnapshot);
      totalComboDiscount = MoneyUtils.add(
        totalComboDiscount,
        result.comboDiscount,
      ).toNumber();
    }

    this.logger.log('All combos flattened successfully', {
      totalItems: flattenedItems.length,
      totalSnapshots: comboSnapshots.length,
      totalComboDiscount,
    });

    return {
      flattenedItems,
      comboSnapshots,
      totalComboDiscount,
    };
  }

  /**
   * Flatten combo snapshot items into order item data
   * Multiplies by combo quantity
   */
  private flattenComboItems(
    comboSnapshot: GenericComboSnapshot,
    comboInput: ComboOrderInput,
    options?: FlattenOptions,
  ): CreateOrderItemFromComboData[] {
    const items: CreateOrderItemFromComboData[] = [];

    for (const itemSnapshot of comboSnapshot.items) {
      // Create order item for each combo quantity
      for (let i = 0; i < comboInput.quantity; i++) {
        const orderItemData = this.createOrderItemFromComboItem(
          itemSnapshot,
          comboSnapshot.id,
          comboInput,
          options,
        );

        items.push(orderItemData);
      }
    }

    return items;
  }

  /**
   * Create order item data from combo item snapshot
   */
  private createOrderItemFromComboItem(
    itemSnapshot: GenericComboItemSnapshot,
    comboId: string,
    comboInput: ComboOrderInput,
    options?: FlattenOptions,
  ): CreateOrderItemFromComboData {
    // Base data for all item types
    const baseData: CreateOrderItemFromComboData = {
      name: itemSnapshot.displayName,
      quantity: itemSnapshot.quantity,
      unitPrice: itemSnapshot.unitPrice,
      totalPrice: itemSnapshot.totalPrice,
      itemSource: ORDER_ITEM_SOURCE.COMBO_ITEM,
      itemType: this.mapComboItemTypeToOrderItemType(itemSnapshot.itemType),
      sourceComboId: comboId,
      sourceComboItemId: itemSnapshot.id,
      comboItemSnapshot: itemSnapshot,
    };

    // Add type-specific data
    return this.addTypeSpecificData(
      baseData,
      itemSnapshot,
      comboInput,
      options,
    );
  }

  /**
   * Add type-specific data to order item based on item type
   */
  private addTypeSpecificData(
    baseData: CreateOrderItemFromComboData,
    itemSnapshot: GenericComboItemSnapshot,
    comboInput: ComboOrderInput,
    options?: FlattenOptions,
  ): CreateOrderItemFromComboData {
    switch (itemSnapshot.itemType) {
      case COMBO_ITEM_TYPE.DIGITAL_EXTERNAL:
        return this.addDigitalExternalData(
          baseData,
          itemSnapshot,
          comboInput,
          options,
        );

      case COMBO_ITEM_TYPE.INTERNAL_PRODUCT:
        return this.addInternalProductData(baseData, itemSnapshot);

      case COMBO_ITEM_TYPE.INTERNAL_VARIANT:
        return this.addInternalVariantData(baseData, itemSnapshot);

      case COMBO_ITEM_TYPE.SERVICE:
        return this.addServiceData(baseData, itemSnapshot);

      case COMBO_ITEM_TYPE.CUSTOM:
        return this.addCustomData(baseData, itemSnapshot);

      default:
        this.logger.warn('Unknown combo item type', {
          itemType: itemSnapshot.itemType,
        });

        return baseData;
    }
  }

  /**
   * Add DIGITAL_EXTERNAL specific data
   */
  private addDigitalExternalData(
    baseData: CreateOrderItemFromComboData,
    itemSnapshot: GenericComboItemSnapshot,
    comboInput: ComboOrderInput,
    options?: FlattenOptions,
  ): CreateOrderItemFromComboData {
    const productSnap = itemSnapshot.externalProductSnapshot;
    const packageSnap = itemSnapshot.externalPackageSnapshot;

    return {
      ...baseData,
      externalMktProductId: productSnap?.id ?? null,
      externalMktPackageId: packageSnap?.id ?? null,
      externalMktProductCode: productSnap?.code ?? null,
      externalMktPackageCode: packageSnap?.packageCode ?? null,
      snapshotMktProduct: productSnap,
      snapshotMktPackage: packageSnap,
      maxDevices:
        comboInput.maxDevices ??
        options?.defaultMaxDevices ??
        FLATTEN_DEFAULTS.MAX_DEVICES,
      splitLicenses:
        comboInput.splitLicenses ??
        options?.defaultSplitLicenses ??
        FLATTEN_DEFAULTS.SPLIT_LICENSES,
    };
  }

  /**
   * Add INTERNAL_PRODUCT specific data
   */
  private addInternalProductData(
    baseData: CreateOrderItemFromComboData,
    itemSnapshot: GenericComboItemSnapshot,
  ): CreateOrderItemFromComboData {
    const internalProductSnap = itemSnapshot.internalProductSnapshot;

    return {
      ...baseData,
      mktProductId: internalProductSnap?.id ?? null,
      internalProductSnapshot: internalProductSnap,
    };
  }

  /**
   * Add INTERNAL_VARIANT specific data
   */
  private addInternalVariantData(
    baseData: CreateOrderItemFromComboData,
    itemSnapshot: GenericComboItemSnapshot,
  ): CreateOrderItemFromComboData {
    const internalVariantSnap = itemSnapshot.internalVariantSnapshot;

    return {
      ...baseData,
      mktVariantId: internalVariantSnap?.id ?? null,
      mktProductId: internalVariantSnap?.productId ?? null,
      internalVariantSnapshot: internalVariantSnap,
    };
  }

  /**
   * Add SERVICE specific data
   */
  private addServiceData(
    baseData: CreateOrderItemFromComboData,
    itemSnapshot: GenericComboItemSnapshot,
  ): CreateOrderItemFromComboData {
    const serviceSnap = itemSnapshot.serviceSnapshot;

    return {
      ...baseData,
      serviceName: serviceSnap?.serviceName ?? null,
      serviceDescription: serviceSnap?.serviceDescription ?? null,
      servicePrice: serviceSnap?.servicePrice ?? null,
    };
  }

  /**
   * Add CUSTOM specific data
   */
  private addCustomData(
    baseData: CreateOrderItemFromComboData,
    itemSnapshot: GenericComboItemSnapshot,
  ): CreateOrderItemFromComboData {
    const customSnap = itemSnapshot.customSnapshot;

    return {
      ...baseData,
      customName: customSnap?.customName ?? null,
      customDescription: customSnap?.customDescription ?? null,
      customPrice: customSnap?.customPrice ?? null,
    };
  }

  /**
   * Map ComboItemType to OrderItemType
   * They are aligned but kept as separate constants for module independence
   */
  private mapComboItemTypeToOrderItemType(
    comboItemType: ComboItemType,
  ): OrderItemType {
    const mapping: Record<ComboItemType, OrderItemType> = {
      [COMBO_ITEM_TYPE.DIGITAL_EXTERNAL]: ORDER_ITEM_TYPE.DIGITAL_EXTERNAL,
      [COMBO_ITEM_TYPE.INTERNAL_PRODUCT]: ORDER_ITEM_TYPE.INTERNAL_PRODUCT,
      [COMBO_ITEM_TYPE.INTERNAL_VARIANT]: ORDER_ITEM_TYPE.INTERNAL_VARIANT,
      [COMBO_ITEM_TYPE.SERVICE]: ORDER_ITEM_TYPE.SERVICE,
      [COMBO_ITEM_TYPE.CUSTOM]: ORDER_ITEM_TYPE.CUSTOM,
    };

    return mapping[comboItemType];
  }

  /**
   * Calculate combo discount based on snapshot pricing
   * Discount = (originalPrice - comboPrice) * quantity
   */
  private calculateComboDiscount(
    comboSnapshot: GenericComboSnapshot,
    quantity: number,
  ): number {
    const singleComboDiscount = MoneyUtils.subtract(
      comboSnapshot.originalPrice,
      comboSnapshot.comboPrice,
    ).toNumber();

    return MoneyUtils.multiply(singleComboDiscount, quantity).toNumber();
  }

  /**
   * Verify combo snapshot integrity
   */
  verifyComboSnapshot(snapshot: GenericComboSnapshot): boolean {
    return this.genericComboService.verifySnapshot(snapshot);
  }
}
