import { Logger } from '@nestjs/common';

import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  ORDER_ACTION,
  ORDER_METADATA,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderStateMachine } from 'src/mkt-core/order/states';
import { parseJsonOrNull } from 'src/mkt-core/utils';

export class OrderActionService {
  private readonly logger = new Logger(OrderActionService.name);
  constructor() {}

  async getAction(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    currentOrder: Partial<MktOrderWorkspaceEntity> | null,
  ): Promise<ORDER_ACTION | null> {
    try {
      // create state machine with current order
      const stateMachine = new OrderStateMachine(currentOrder);

      // use state machine to determine action
      const action = stateMachine.getAction(payload);

      this.logger.log(
        `Order action determined: ${action} for order status: ${currentOrder?.status || 'null'}`,
      );

      return action;
    } catch (error) {
      this.logger.error(
        `Error determining order action: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getActionFromORDER_METADATA(
    metadata: ORDER_METADATA,
  ): Promise<ORDER_ACTION | null> {
    if (!metadata) return null;

    const { orderAction } = metadata;

    if (orderAction && Object.values(ORDER_ACTION).includes(orderAction)) {
      return orderAction;
    }

    return ORDER_ACTION.WAIT;
  }

  async getOrderAction(metadata: unknown): Promise<ORDER_ACTION | null> {
    if (!metadata) return null;

    const parsedORDER_METADATA: ORDER_METADATA | null =
      typeof metadata === 'string'
        ? parseJsonOrNull<ORDER_METADATA>(metadata)
        : (metadata as ORDER_METADATA);

    if (!parsedORDER_METADATA) return null;

    const { orderAction } = parsedORDER_METADATA;

    if (orderAction && Object.values(ORDER_ACTION).includes(orderAction)) {
      return orderAction;
    }

    return null;
  }

  async getOrderStatusFromAction(action: ORDER_ACTION): Promise<ORDER_STATUS> {
    if (action === ORDER_ACTION.TRIAL) {
      return ORDER_STATUS.TRIAL;
    }

    return ORDER_STATUS.WAIT;
  }

  async isTrialAction(action: ORDER_ACTION): Promise<boolean> {
    return action === ORDER_ACTION.TRIAL;
  }
}
