import { Injectable, Logger } from '@nestjs/common';

import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  MktOrderItemRepository,
  MktOrderRepository,
} from 'src/mkt-core/order/repositories';
import { safeJsonStringify } from 'src/mkt-core/utils';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly recordPositionService: RecordPositionService,
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly mktOrderItemRepository: MktOrderItemRepository,
  ) {}

  async cloneOrderItems(
    trialOrder: MktOrderWorkspaceEntity,
    createdOrder: MktOrderWorkspaceEntity,
    workspaceId: string,
  ) {
    if (trialOrder.orderItems?.length <= 0) {
      throw new Error('No order items to clone');
    }

    const newOrderItemsData = await Promise.all(
      trialOrder.orderItems.map(async (item) => {
        const position = await this.recordPositionService.buildRecordPosition({
          value: 'last',
          objectMetadata: {
            isCustom: false,
            nameSingular: 'mktOrderItem',
          },
          workspaceId,
        });

        return {
          mktOrderId: createdOrder.id,
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
        };
      }),
    );

    await this.mktOrderItemRepository.createMany(
      workspaceId,
      newOrderItemsData,
    );

    this.logger.log(
      `Copied ${newOrderItemsData.length} order items to new order: ${createdOrder.id}`,
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
    workspaceId: string,
    trialLicense?: boolean,
  ) {
    const updateData: Partial<MktOrderWorkspaceEntity> = {
      status,
      trialLicense: trialLicense ?? false,
    };

    this.logger.log(
      `Updating order ${orderId} with data: ${safeJsonStringify(updateData)}`,
    );

    await this.mktOrderRepository.update(workspaceId, orderId, updateData);
  }

  async cloneOrder(
    workspaceId: string,
    createdOrderId: string,
    generatedOrderCode: string | null,
    trialOrder: MktOrderWorkspaceEntity,
  ) {
    await this.mktOrderRepository.update(workspaceId, createdOrderId, {
      mktCustomerId: trialOrder.mktCustomerId || null,
      orderCode: generatedOrderCode ?? '',
      subtotal: trialOrder.subtotal,
      tax: trialOrder.tax,
      discount: trialOrder.discount,
      totalAmount: trialOrder.totalAmount,
      name: trialOrder.name ?? '',
      status: ORDER_STATUS.PENDING_PAYMENT,
      trialLicense: false,
      // Use note field to store the reference information
      note: `Converted from trial order: ${trialOrder.id}`,
    });

    this.logger.log(
      `Updated new order ${createdOrderId} with calculated values and set status to WAIT`,
    );

    // Update trial order status to reference the paid order
    await this.mktOrderRepository.update(workspaceId, trialOrder.id, {
      // Use note field to store the reference information
      note: `Converted to paid order: ${createdOrderId}`,
      status: ORDER_STATUS.COMPLETED, // Mark as completed since trial is converted
    });

    this.logger.log(
      `Updated trial order ${trialOrder.id} status to CONVERTED and referenced paid order`,
    );
  }
}
