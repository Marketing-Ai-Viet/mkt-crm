import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { MKT_DEFAULT_LANGUAGE } from 'src/mkt-core/mkt-product-integration/constants';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { CreateOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types/order-saga.interface';
import {
  MktOrderItemRepository,
  MktOrderRepository,
} from 'src/mkt-core/order/repositories';
import { OrderCalculationService } from 'src/mkt-core/order/services/core';
import { OrderComboIntegrationService } from 'src/mkt-core/order/services/integration';
import {
  CreateOrderItemsStepOutput,
  CreateOrderWithItemsInput,
  ExternalMktProductInput,
  ComboOrderInputType,
} from 'src/mkt-core/order/types';
import { MktSupportedLanguage } from 'src/mkt-core/order/types/mkt-product-proxy.types';
import {
  ORDER_ITEM_SOURCE,
  ORDER_ITEM_TYPE,
  CreateOrderItemFromComboData,
  GenericComboSnapshot,
} from 'src/mkt-core/order/types/order-combo.types';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

/**
 * CreateOrderItemsStep - Step 2: Tạo order items từ external products và combos
 *
 * Thực hiện:
 * - Lấy thông tin products từ MKT Server
 * - Flatten combos thành order items (nếu có)
 * - Tạo order items với calculated values và snapshots
 * - Tính toán tổng order (subtotal, tax, discount, totalAmount, comboDiscount)
 * - Update order với các giá trị đã tính
 *
 * Compensate:
 * - Hard delete order items đã tạo
 */
@Injectable()
export class CreateOrderItemsStep extends SagaStep<
  CreateOrderWithItemsInput,
  CreateOrderItemsStepOutput
> {
  readonly name = 'create_order_items';
  readonly description =
    'Create order items from external products/combos and calculate totals';

  private readonly logger = new Logger(CreateOrderItemsStep.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderItemRepository: MktOrderItemRepository,
    private readonly calculationService: OrderCalculationService,
    private readonly recordPositionService: RecordPositionService,
    private readonly mktProductProxy: MktProductProxyService,
    private readonly comboIntegrationService: OrderComboIntegrationService,
  ) {
    super();
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateOrderItemsStepOutput>> {
    try {
      if (!context.orderId) {
        return {
          success: false,
          error: new Error('Order ID is required from previous step'),
        };
      }

      this.logger.log(`Creating order items for order: ${context.orderId}`);

      // Check if we have external products or combos
      const hasExternalProducts =
        input.externalProducts && input.externalProducts.length > 0;
      const hasCombos = input.combos && input.combos.length > 0;

      if (!hasExternalProducts && !hasCombos) {
        return {
          success: false,
          error: new Error(
            'At least one external product or combo is required',
          ),
        };
      }

      // Create order items from products and/or combos
      return this.createOrderItemsFromProductsAndCombos(
        context,
        input,
        queryRunner,
      );
    } catch (error) {
      this.logger.error('Failed to create order items', error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  async compensate(
    context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    const data = context.rollbackData.get(this.name) as {
      orderItemIds: string[];
    } | null;

    if (!data?.orderItemIds?.length) {
      this.logger.warn('No order items to compensate');

      return;
    }

    try {
      this.logger.warn(`Hard deleting ${data.orderItemIds.length} order items`);

      // Use repository for delete - queryRunner.manager doesn't have workspace entity metadata
      await this.orderItemRepository.softDeleteManyOrderItems(
        data.orderItemIds,
      );

      this.logger.log('Order items deleted successfully');
    } catch (error) {
      this.logger.error('Failed to delete order items', error);
      throw error;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Create order items from external products and/or combos
   */
  private async createOrderItemsFromProductsAndCombos(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateOrderItemsStepOutput>> {
    const orderLanguage = (input.orderLanguage ??
      MKT_DEFAULT_LANGUAGE) as MktSupportedLanguage;

    const allOrderItemsData: Partial<MktOrderItemWorkspaceEntity>[] = [];
    let totalComboDiscount = 0;
    const comboSnapshots: GenericComboSnapshot[] = [];

    // 1. Build order items from external products (if any)
    if (input.externalProducts && input.externalProducts.length > 0) {
      const productItemsData = await this.buildOrderItemsFromExternalProducts(
        context,
        input.externalProducts,
        orderLanguage,
      );

      allOrderItemsData.push(...productItemsData);
    }

    // 2. Build order items from combos (if any)
    if (input.combos && input.combos.length > 0) {
      const comboResult = await this.buildOrderItemsFromCombos(
        context,
        input.combos,
        orderLanguage,
      );

      allOrderItemsData.push(...comboResult.orderItemsData);
      totalComboDiscount = comboResult.totalComboDiscount;
      comboSnapshots.push(...comboResult.comboSnapshots);
    }

    if (allOrderItemsData.length === 0) {
      return {
        success: false,
        error: new Error('No order items could be created'),
      };
    }

    // Save order items using repository
    const savedOrderItems =
      await this.orderItemRepository.createManyOrderItems(allOrderItemsData);

    this.logger.log(`Created ${savedOrderItems.length} order items`);

    // Calculate order totals
    const calculatedItems = savedOrderItems.map((item) => ({
      variantId: item.externalMktProductId ?? '',
      name: item.name,
      unitPrice: item.unitPrice ?? 0,
      quantity: item.quantity ?? 1,
      totalPrice: item.totalPrice ?? 0,
      taxPercentage: item.taxPercentage ?? 0,
      taxAmount: item.taxAmount ?? 0,
      totalAmountWithTax: item.totalAmountWithTax ?? 0,
    }));

    // Calculate totals (discount is handled by promotion system separately)
    const totals =
      this.calculationService.calculateOrderTotals(calculatedItems);

    // Calculate adjusted total (after combo discount)
    const adjustedTotalAmount = MoneyUtils.subtract(
      totals.totalAmount,
      totalComboDiscount,
    ).toNumber();

    // Update order with totals and combo data
    await this.updateOrderTotalsWithCombo(
      context,
      totals,
      totalComboDiscount,
      comboSnapshots,
    );

    // Cast to typed context for type safety
    const typedContext = context as CreateOrderSagaContext;

    // Store order items in typed context (P0 fix: required by CalculatePromotionStep)
    typedContext.orderItems = savedOrderItems;
    typedContext.totals = {
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      comboDiscount: totalComboDiscount,
      totalAmount: adjustedTotalAmount,
    };

    // Store rollback data
    context.orderItemIds = savedOrderItems.map((item) => item.id);
    typedContext.rollbackOrderItems = context.orderItemIds;
    context.rollbackData.set(this.name, {
      orderItemIds: context.orderItemIds,
    });

    return {
      success: true,
      data: {
        orderItems: savedOrderItems,
        totals: {
          subtotal: totals.subtotal,
          tax: totals.tax,
          discount: totals.discount,
          totalAmount: adjustedTotalAmount,
        },
      },
    };
  }

  /**
   * Build order items from combos using ComboFlattenService
   */
  private async buildOrderItemsFromCombos(
    context: SagaContext,
    combos: ComboOrderInputType[],
    language: MktSupportedLanguage,
  ): Promise<{
    orderItemsData: Partial<MktOrderItemWorkspaceEntity>[];
    totalComboDiscount: number;
    comboSnapshots: GenericComboSnapshot[];
  }> {
    // Convert ComboOrderInputType to ComboOrderInput
    const comboInputs = combos.map((combo) => ({
      comboId: combo.comboId,
      quantity: combo.quantity,
      maxDevices: combo.maxDevices,
      splitLicenses: combo.splitLicenses,
    }));

    // Flatten combos
    const flattenResult = await this.comboIntegrationService.flattenCombos(
      context.workspaceId,
      comboInputs,
      language,
    );

    // Convert flattened items to order item data
    const orderItemsData: Partial<MktOrderItemWorkspaceEntity>[] = [];

    for (const flattenedItem of flattenResult.flattenedItems) {
      const orderItemData = await this.convertComboItemToOrderItem(
        context,
        flattenedItem,
        language,
      );

      orderItemsData.push(orderItemData);
    }

    return {
      orderItemsData,
      totalComboDiscount: flattenResult.totalComboDiscount,
      comboSnapshots: flattenResult.comboSnapshots,
    };
  }

  /**
   * Convert flattened combo item to order item entity data
   */
  private async convertComboItemToOrderItem(
    context: SagaContext,
    flattenedItem: CreateOrderItemFromComboData,
    language: MktSupportedLanguage,
  ): Promise<Partial<MktOrderItemWorkspaceEntity>> {
    const position = await this.recordPositionService.buildRecordPosition({
      value: 'last',
      objectMetadata: {
        isCustom: false,
        nameSingular: 'mktOrderItem',
      },
      workspaceId: context.workspaceId,
    });

    // Calculate tax
    const calculatedItem = this.calculationService.calculateOrderItem(
      {
        id: flattenedItem.sourceComboItemId,
        name: flattenedItem.name,
        price: flattenedItem.unitPrice,
      },
      flattenedItem.quantity,
    );

    // Base order item data
    const orderItemData: Partial<MktOrderItemWorkspaceEntity> = {
      mktOrderId: context.orderId,
      name: flattenedItem.name,
      orderLanguage: language,
      unitName: 'unit',
      // Calculated values
      unitPrice: calculatedItem.unitPrice,
      quantity: calculatedItem.quantity,
      totalPrice: calculatedItem.totalPrice,
      taxPercentage: calculatedItem.taxPercentage,
      taxAmount: calculatedItem.taxAmount,
      totalAmountWithTax: calculatedItem.totalAmountWithTax,
      // Combo fields
      itemSource: flattenedItem.itemSource,
      itemType: flattenedItem.itemType,
      sourceComboId: flattenedItem.sourceComboId,
      sourceComboItemId: flattenedItem.sourceComboItemId,
      comboItemSnapshot: flattenedItem.comboItemSnapshot,
      position,
    };

    // Add type-specific fields based on itemType
    this.addTypeSpecificFieldsToOrderItem(orderItemData, flattenedItem);

    return orderItemData;
  }

  /**
   * Add type-specific fields to order item based on item type
   */
  private addTypeSpecificFieldsToOrderItem(
    orderItemData: Partial<MktOrderItemWorkspaceEntity>,
    flattenedItem: CreateOrderItemFromComboData,
  ): void {
    switch (flattenedItem.itemType) {
      case ORDER_ITEM_TYPE.DIGITAL_EXTERNAL:
        orderItemData.externalMktProductId = flattenedItem.externalMktProductId;
        orderItemData.externalMktProductCode =
          flattenedItem.externalMktProductCode;
        orderItemData.externalMktPackageId = flattenedItem.externalMktPackageId;
        orderItemData.externalMktPackageCode =
          flattenedItem.externalMktPackageCode;
        orderItemData.snapshotMktProduct = flattenedItem.snapshotMktProduct;
        orderItemData.snapshotMktPackage = flattenedItem.snapshotMktPackage;
        orderItemData.snapshotProductName =
          flattenedItem.snapshotMktProduct?.displayName ?? undefined;
        orderItemData.snapshotPackageName =
          flattenedItem.snapshotMktPackage?.displayName ?? undefined;
        orderItemData.maxDevices = flattenedItem.maxDevices ?? 1;
        break;

      case ORDER_ITEM_TYPE.INTERNAL_PRODUCT:
        orderItemData.internalProductSnapshot =
          flattenedItem.internalProductSnapshot;
        break;

      case ORDER_ITEM_TYPE.INTERNAL_VARIANT:
        orderItemData.internalVariantSnapshot =
          flattenedItem.internalVariantSnapshot;
        break;

      case ORDER_ITEM_TYPE.SERVICE:
        // SERVICE items use the comboItemSnapshot for service details
        break;

      case ORDER_ITEM_TYPE.CUSTOM:
        // CUSTOM items use the comboItemSnapshot for custom details
        break;
    }
  }

  /**
   * Build order item data from external MKT products
   */
  private async buildOrderItemsFromExternalProducts(
    context: SagaContext,
    externalProducts: ExternalMktProductInput[],
    language: MktSupportedLanguage,
  ): Promise<Partial<MktOrderItemWorkspaceEntity>[]> {
    const orderItemsData: Partial<MktOrderItemWorkspaceEntity>[] = [];

    for (const productInput of externalProducts) {
      // Fetch product from MKT Server
      const product = await this.mktProductProxy.getProduct(
        productInput.productId,
      );

      if (!product) {
        this.logger.warn(
          `External product ${productInput.productId} not found, skipping`,
        );
        continue;
      }

      // Create product snapshot
      const productSnapshot = this.mktProductProxy.createProductSnapshot(
        product,
        language,
      );

      // Determine price and package snapshot
      let unitPrice = product.basePrice ?? 0;
      let packageSnapshot = null;

      if (productInput.packageId) {
        const pkg = await this.mktProductProxy.getPackage(
          productInput.packageId,
        );

        if (pkg) {
          packageSnapshot = this.mktProductProxy.createPackageSnapshot(pkg);
          unitPrice = pkg.price;
        } else {
          this.logger.warn(
            `Package ${productInput.packageId} not found, using product base price`,
          );
        }
      }

      // For digital products, quantity is always 1 (each license is 1 unit)
      // maxDevices is used for license creation, not for order item quantity
      const quantity = 1;
      const calculatedItem = this.calculationService.calculateOrderItem(
        {
          id: product.id,
          name: productSnapshot.displayName,
          price: unitPrice,
        },
        quantity,
      );

      const position = await this.recordPositionService.buildRecordPosition({
        value: 'last',
        objectMetadata: {
          isCustom: false,
          nameSingular: 'mktOrderItem',
        },
        workspaceId: context.workspaceId,
      });

      orderItemsData.push({
        mktOrderId: context.orderId,
        // Item source and type (PRODUCT source, DIGITAL_EXTERNAL type)
        itemSource: ORDER_ITEM_SOURCE.PRODUCT,
        itemType: ORDER_ITEM_TYPE.DIGITAL_EXTERNAL,
        // External product references
        externalMktProductId: product.id,
        externalMktProductCode: product.code,
        externalMktPackageId: productInput.packageId ?? null,
        externalMktPackageCode: packageSnapshot?.packageCode ?? null,
        // Snapshots (immutable)
        snapshotMktProduct: productSnapshot,
        snapshotMktPackage: packageSnapshot,
        // Display fields
        name: productSnapshot.displayName,
        snapshotProductName: productSnapshot.displayName,
        snapshotPackageName: packageSnapshot?.displayName ?? null,
        orderLanguage: language,
        unitName: 'unit',
        // Calculated values
        unitPrice: calculatedItem.unitPrice,
        quantity: calculatedItem.quantity,
        totalPrice: calculatedItem.totalPrice,
        taxPercentage: calculatedItem.taxPercentage,
        taxAmount: calculatedItem.taxAmount,
        totalAmountWithTax: calculatedItem.totalAmountWithTax,
        // License configuration
        maxDevices: productInput.maxDevices ?? 1,
        position,
      });
    }

    return orderItemsData;
  }

  /**
   * Update order với totals đã tính
   */
  private async updateOrderTotals(
    context: SagaContext,
    totals: {
      subtotal: number;
      tax: number;
      discount: number;
      totalAmount: number;
    },
  ): Promise<void> {
    if (!context.orderId) {
      throw new Error('Order ID is required');
    }

    // Use repository for update - queryRunner.manager doesn't have workspace entity metadata
    await this.orderRepository.updateOrder(context.orderId, {
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      totalAmount: totals.totalAmount,
      // Set remainingAmount = totalAmount (no payment yet)
      remainingAmount: totals.totalAmount,
    });

    // Store in context for subsequent steps
    context.metadata.set('totalAmount', totals.totalAmount);
  }

  /**
   * Update order với totals và combo data
   */
  private async updateOrderTotalsWithCombo(
    context: SagaContext,
    totals: {
      subtotal: number;
      tax: number;
      discount: number;
      totalAmount: number;
    },
    comboDiscount: number,
    comboSnapshots: GenericComboSnapshot[],
  ): Promise<void> {
    if (!context.orderId) {
      throw new Error('Order ID is required');
    }

    // Apply combo discount to total
    const adjustedTotalAmount = MoneyUtils.subtract(
      totals.totalAmount,
      comboDiscount,
    ).toNumber();

    // Use repository for update
    await this.orderRepository.updateOrder(context.orderId, {
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      totalAmount: adjustedTotalAmount,
      // Set remainingAmount = totalAmount (no payment yet)
      remainingAmount: adjustedTotalAmount,
      // Combo fields
      comboDiscount: comboDiscount > 0 ? comboDiscount : undefined,
      appliedCombos: comboSnapshots.length > 0 ? comboSnapshots : undefined,
    });

    // Store in context for subsequent steps
    context.metadata.set('totalAmount', adjustedTotalAmount);
    context.metadata.set('comboDiscount', comboDiscount);

    if (comboSnapshots.length > 0) {
      context.metadata.set('appliedCombos', comboSnapshots);
    }
  }
}
