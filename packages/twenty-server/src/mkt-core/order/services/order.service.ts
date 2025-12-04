import { Injectable, Logger } from '@nestjs/common';

import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { Metadata } from 'src/mkt-core/order/hooks/mkt-order-create-one.post-query.hook';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { FirebaseAuthResponse } from 'src/mkt-core/payment/integration/firebase-integration.service';
import { VariantService } from 'src/mkt-core/product/services/variant.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  constructor(
    private readonly variantService: VariantService,
    private readonly recordPositionService: RecordPositionService,
    private mktRepo: MktRepositoryService,
  ) {}

  async createOrderItemsFromVariants(
    variantsMeta: Metadata['variants'] | null,
    createdOrder: MktOrderWorkspaceEntity,
    workspaceId: string,
  ) {
    if (!variantsMeta || variantsMeta.length === 0) return [];
    const ids = variantsMeta.map((v) => v.mktVariantId).filter(Boolean);
    const variants = await this.variantService.getVariantValueById(
      ids,
      workspaceId,
    );
    const variantById = new Map(variants.map((v) => [v.id, v]));
    const orderItemRepository = await this.getOrderItemRepo(workspaceId);
    const itemsFromVariants = await Promise.all(
      variantsMeta.map(async (v, _index) => {
        const variant = variantById.get(v.mktVariantId);

        if (!variant) return [];

        const unitPrice = variant?.price ?? 0;
        const quantity = v.quantity ?? 1;
        const totalPrice = unitPrice * quantity;
        const position = await this.recordPositionService.buildRecordPosition({
          value: 'last',
          objectMetadata: {
            isCustom: false,
            nameSingular: 'mktOrderItem',
          },
          workspaceId,
        });

        return orderItemRepository.create({
          mktOrderId: createdOrder.id,
          mktVariantId: variant.id,
          name: variant.name ?? 'Item',
          snapshotProductName: variant.name ?? 'Item',
          unitName: 'unit',
          unitPrice,
          quantity,
          totalPrice,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmountWithTax: totalPrice,
          position,
        } as Partial<MktOrderItemWorkspaceEntity>);
      }),
    );

    const toCreate = itemsFromVariants.filter(
      Boolean,
    ) as MktOrderItemWorkspaceEntity[];

    if (toCreate.length > 0) {
      await orderItemRepository.save(toCreate);
    } else {
      throw new Error('No order items to create');
    }
  }

  async cloneOrderItems(
    trialOrder: MktOrderWorkspaceEntity,
    createdOrder: MktOrderWorkspaceEntity,
    workspaceId: string,
  ) {
    if (trialOrder.orderItems?.length <= 0)
      throw new Error('No order items to clone');
    const orderItemRepository = await this.getOrderItemRepo(workspaceId);
    const newOrderItems = await Promise.all(
      trialOrder.orderItems.map(async (item) => {
        const position = await this.recordPositionService.buildRecordPosition({
          value: 'last',
          objectMetadata: {
            isCustom: false,
            nameSingular: 'mktOrderItem',
          },
          workspaceId,
        });

        return orderItemRepository.create({
          mktOrderId: createdOrder.id,
          mktVariantId: item.mktVariantId,
          name: item.name,
          snapshotProductName: item.snapshotProductName,
          unitName: item.unitName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          taxPercentage: item.taxPercentage,
          taxAmount: item.taxAmount,
          totalAmountWithTax: item.totalAmountWithTax,
          position,
        } as Partial<MktOrderItemWorkspaceEntity>);
      }),
    );

    await orderItemRepository.save(newOrderItems);
    this.logger.log(
      `Copied ${newOrderItems.length} order items to new order: ${createdOrder.id}`,
    );
  }

  async updateOrderInformation(
    orderId: string,
    updateOrderInfo: Partial<MktOrderWorkspaceEntity>,
    orderRepository: WorkspaceRepository<MktOrderWorkspaceEntity>,
  ) {
    await orderRepository.update(orderId, {
      mktCustomerId: updateOrderInfo.mktCustomerId || null,
      orderCode: updateOrderInfo.orderCode ?? '',
      subtotal: updateOrderInfo.subtotal,
      tax: updateOrderInfo.tax,
      discount: updateOrderInfo.discount,
      totalAmount: updateOrderInfo.totalAmount,
      name: updateOrderInfo.name ?? '',
      mktContractId: updateOrderInfo.mktContractId || null,
    });
  }

  async updateOrderStatus(
    orderId: string,
    status: ORDER_STATUS,
    trialLicense?: boolean,
    authFirebase?: void | FirebaseAuthResponse,
    _workspaceId: string | null = null,
  ) {
    const orderRepository = await this.getOrderRepo();

    this.logger.log('authFirebase: ' + JSON.stringify(authFirebase));

    const updateData: Partial<MktOrderWorkspaceEntity> = {
      status,
      trialLicense: trialLicense ?? false,
    };

    // Nếu có authFirebase thì update vào metadata
    if (authFirebase) {
      updateData.metadata = JSON.stringify({ authFirebase }) as unknown as JSON;
      this.logger.log(
        `Updated metadata with Firebase auth info for order: ${orderId}`,
      );
    }

    this.logger.log(
      `Updating order ${orderId} with data: ${JSON.stringify(updateData)}`,
    );

    await orderRepository.update(orderId, updateData);
  }

  async cloneOrder(
    createdOrderId: string,
    generatedOrderCode: string | null,
    trialOrder: MktOrderWorkspaceEntity,
  ) {
    const orderRepository = await this.mktRepo.getOrderRepository();

    await orderRepository.update(createdOrderId, {
      mktCustomerId: trialOrder.mktCustomerId || null,
      orderCode: generatedOrderCode ?? '',
      subtotal: trialOrder.subtotal,
      tax: trialOrder.tax,
      discount: trialOrder.discount,
      totalAmount: trialOrder.totalAmount,
      name: trialOrder.name ?? '',
      status: ORDER_STATUS.WAIT,
      trialLicense: false,
      // Use note field to store the reference information
      note: `Converted from trial order: ${trialOrder.id}`,
    });
    this.logger.log(
      `Updated new order ${createdOrderId} with calculated values and set status to WAIT`,
    );

    // Update trial order status to reference the paid order
    await orderRepository.update(trialOrder.id, {
      // Use note field to store the reference information
      note: `Converted to paid order: ${createdOrderId}`,
      status: ORDER_STATUS.COMPLETED, // Mark as completed since trial is converted
    });

    this.logger.log(
      `Updated trial order ${trialOrder.id} status to CONVERTED and referenced paid order`,
    );
  }

  private async getOrderItemRepo(workspaceId: string) {
    if (!workspaceId) return this.mktRepo.getOrderItemRepository();

    return this.mktRepo.getOrderItemRepositoryByWorkspaceId(workspaceId);
  }

  private async getOrderRepo() {
    return await this.mktRepo.getOrderRepository();
  }
}
