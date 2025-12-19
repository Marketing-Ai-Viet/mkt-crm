import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_DEFAULT_LANGUAGE } from 'src/mkt-core/mkt-product-integration/constants';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga/order-saga.interface';
import { OrderCalculationService } from 'src/mkt-core/order/services/core';
import {
  CreateOrderWithItemsInput,
  ExternalMktProductInput,
} from 'src/mkt-core/order/types';
import { MktSupportedLanguage } from 'src/mkt-core/order/types/mkt-product-proxy.types';

// ============================================
// STEP OUTPUT TYPE
// ============================================

export type CreateOrderItemsStepOutput = {
  orderItems: MktOrderItemWorkspaceEntity[];
  totals: {
    subtotal: number;
    tax: number;
    discount: number;
    totalAmount: number;
  };
};

/**
 * CreateOrderItemsStep - Step 2: Tạo order items từ external products
 *
 * Thực hiện:
 * - Lấy thông tin products từ MKT Server
 * - Tạo order items với calculated values và snapshots
 * - Tính toán tổng order (subtotal, tax, discount, totalAmount)
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
    'Create order items from variants and calculate totals';

  private readonly logger = new Logger(CreateOrderItemsStep.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly calculationService: OrderCalculationService,
    private readonly recordPositionService: RecordPositionService,
    private readonly mktProductProxy: MktProductProxyService,
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

      // Handle TRIAL_TO_PAID: Clone từ trial order
      if (input.action === ORDER_ACTION.TRIAL_TO_PAID && input.trialOrderId) {
        return this.cloneOrderItemsFromTrial(context, input, queryRunner);
      }

      // Check if we have external products
      const hasExternalProducts =
        input.externalProducts && input.externalProducts.length > 0;

      if (!hasExternalProducts) {
        return {
          success: false,
          error: new Error('At least one external product is required'),
        };
      }

      // Create order items from external products
      return this.createOrderItemsFromExternalProducts(
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
    queryRunner: QueryRunner,
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

      await queryRunner.manager.delete(
        MktOrderItemWorkspaceEntity,
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
   * Create order items from external MKT products
   */
  private async createOrderItemsFromExternalProducts(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateOrderItemsStepOutput>> {
    const orderItemRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        context.workspaceId,
        MktOrderItemWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const orderLanguage = (input.orderLanguage ??
      MKT_DEFAULT_LANGUAGE) as MktSupportedLanguage;

    // Build order items from external products
    const orderItemsData = await this.buildOrderItemsFromExternalProducts(
      context,
      input.externalProducts ?? [],
      orderLanguage,
    );

    if (orderItemsData.length === 0) {
      return {
        success: false,
        error: new Error('No order items could be created'),
      };
    }

    // Save order items
    const orderItems = orderItemsData.map((data) =>
      orderItemRepository.create(data),
    );

    const savedOrderItems = await queryRunner.manager.save(orderItems);

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

    const totals = this.calculationService.calculateOrderTotals(
      calculatedItems,
      input.discountPercent,
    );

    // Update order with totals
    await this.updateOrderTotals(context, totals, queryRunner);

    // Store rollback data
    context.orderItemIds = savedOrderItems.map((item) => item.id);
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
          totalAmount: totals.totalAmount,
        },
      },
    };
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

      const quantity = productInput.quantity ?? 1;
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
        position,
      });
    }

    return orderItemsData;
  }

  /**
   * Clone order items từ trial order (TRIAL_TO_PAID flow)
   */
  private async cloneOrderItemsFromTrial(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateOrderItemsStepOutput>> {
    if (!input.trialOrderId) {
      return {
        success: false,
        error: new Error('Trial order ID is required'),
      };
    }

    // Get trial order with items
    const orderRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        context.workspaceId,
        MktOrderWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const trialOrder = await orderRepository.findOne({
      where: { id: input.trialOrderId },
      relations: ['orderItems'],
    });

    if (!trialOrder) {
      return {
        success: false,
        error: new Error(`Trial order ${input.trialOrderId} not found`),
      };
    }

    if (!trialOrder.orderItems || trialOrder.orderItems.length === 0) {
      return {
        success: false,
        error: new Error('Trial order has no items to clone'),
      };
    }

    // Clone order items
    const orderItemRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        context.workspaceId,
        MktOrderItemWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const clonedItemsData: Partial<MktOrderItemWorkspaceEntity>[] = [];

    for (const item of trialOrder.orderItems) {
      const position = await this.recordPositionService.buildRecordPosition({
        value: 'last',
        objectMetadata: {
          isCustom: false,
          nameSingular: 'mktOrderItem',
        },
        workspaceId: context.workspaceId,
      });

      clonedItemsData.push({
        mktOrderId: context.orderId,
        // External product references
        externalMktProductId: item.externalMktProductId,
        externalMktProductCode: item.externalMktProductCode,
        externalMktPackageId: item.externalMktPackageId,
        externalMktPackageCode: item.externalMktPackageCode,
        // Snapshots
        snapshotMktProduct: item.snapshotMktProduct,
        snapshotMktPackage: item.snapshotMktPackage,
        licenseSnapshot: item.licenseSnapshot,
        // Display fields
        name: item.name,
        snapshotProductName: item.snapshotProductName,
        snapshotPackageName: item.snapshotPackageName,
        orderLanguage: item.orderLanguage,
        unitName: item.unitName,
        // Values
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        taxPercentage: item.taxPercentage,
        taxAmount: item.taxAmount,
        totalAmountWithTax: item.totalAmountWithTax,
        position,
      });
    }

    const clonedItems = clonedItemsData.map((data) =>
      orderItemRepository.create(data),
    );

    const savedOrderItems = await queryRunner.manager.save(clonedItems);

    this.logger.log(
      `Cloned ${savedOrderItems.length} order items from trial order`,
    );

    // Use totals from trial order
    const totals = {
      subtotal: trialOrder.subtotal ?? 0,
      tax: trialOrder.tax ?? 0,
      discount: trialOrder.discount ?? 0,
      totalAmount: trialOrder.totalAmount ?? 0,
    };

    // Update new order with totals and trial order reference
    await this.updateOrderTotals(context, totals, queryRunner);
    await queryRunner.manager.update(
      MktOrderWorkspaceEntity,
      { id: context.orderId },
      {
        note: `Converted from trial order: ${input.trialOrderId}`,
        name: trialOrder.name,
        mktCustomerId: trialOrder.mktCustomerId,
      },
    );

    // Store rollback data
    context.orderItemIds = savedOrderItems.map((item) => item.id);
    context.metadata.set('trialOrderId', input.trialOrderId);
    context.rollbackData.set(this.name, {
      orderItemIds: context.orderItemIds,
    });

    return {
      success: true,
      data: {
        orderItems: savedOrderItems,
        totals,
      },
    };
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
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.update(
      MktOrderWorkspaceEntity,
      { id: context.orderId },
      {
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        totalAmount: totals.totalAmount,
      },
    );

    // Store in context for subsequent steps
    context.metadata.set('totalAmount', totals.totalAmount);
  }
}
