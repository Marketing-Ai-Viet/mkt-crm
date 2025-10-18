import { Injectable, Logger } from '@nestjs/common';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { ObjectRecordCreateEvent } from 'src/engine/core-modules/event-emitter/types/object-record-create.event';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktOrderHistoryWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-history.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

@Injectable()
export class MktOrderEventListener {
  private readonly logger = new Logger(MktOrderEventListener.name);

  constructor(private mktRepo: MktRepositoryService) {}

  @OnDatabaseBatchEvent('mktOrder', DatabaseEventAction.UPDATED)
  async handleUpdateMktOrder(
    payload: WorkspaceEventBatch<
      ObjectRecordCreateEvent<MktOrderWorkspaceEntity>
    >,
  ) {
    this.logger.log(`Received updateMktOrder event`);

    for (const event of payload.events) {
      const updatedOrder = event.properties.after;

      this.logger.log(`Processing new order: ${updatedOrder.id}`);
      this.logger.log(`Order details: ${JSON.stringify(updatedOrder)}`);

      // Add your custom logic here to handle the createMktOrder event
      try {
        await this.processOrderCreation(updatedOrder, payload.workspaceId);
        this.logger.log(
          `Successfully processed order creation: ${updatedOrder.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process order creation: ${updatedOrder.id}`,
          error,
        );
      }
    }
  }

  private async processOrderCreation(
    order: MktOrderWorkspaceEntity,
    workspaceId: string,
  ): Promise<void> {
    // Implement your custom business logic here
    // For example:
    // - Send notifications
    // - Update related records
    // - Trigger external integrations
    // - Log analytics events

    // Update orderHistory.metadata = createdOrder
    this.mktRepo.workspaceId = workspaceId;
    const orderHistoryRepo = await this.mktRepo.getRepository(
      MktOrderHistoryWorkspaceEntity,
    );

    const orderRepo = await this.mktRepo.getRepository(MktOrderWorkspaceEntity);

    const createdOrder = await orderRepo.findOne({
      where: { id: order.id },
      relations: ['mktLicense', 'mktPayments'],
    });
    // const createdOrder =
    const orderHistory = orderHistoryRepo.create({
      name: `Order Created`,
      mktOrderId: order.id,
      action: null,
      metadata: createdOrder as MktOrderWorkspaceEntity as unknown as JSON,
      note: `Order ${order.id} created with total ${order.totalAmount}`,
    });

    await orderHistoryRepo.save(orderHistory);

    this.logger.log(`Processing order ${order.id} in workspace ${workspaceId}`);

    // Example: Log order metadata if available
    if (order.metadata) {
      this.logger.log(`Order metadata: ${JSON.stringify(order.metadata)}`);
    }

    // Add your specific logic here based on your requirements
  }
}
