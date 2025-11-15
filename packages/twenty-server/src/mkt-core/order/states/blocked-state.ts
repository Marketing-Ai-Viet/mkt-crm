import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

import {
  OrderState,
  OrderStateContext,
  OrderStateInput,
} from './order-state.interface';

export class BlockedState extends OrderState {
  constructor() {
    super(ORDER_STATUS.BLOCKED);
  }

  canTransitionTo(
    newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return [ORDER_STATUS.COMPLETED].includes(newStatus);
  }

  getAction(
    _context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    if (input.status === ORDER_STATUS.COMPLETED) {
      return ORDER_ACTION.COMPLETED;
    }

    return ORDER_ACTION.LOCKED;
  }

  getPayload(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    switch (action) {
      case ORDER_ACTION.COMPLETED:
        return {
          ...payload,
          data: {
            status: ORDER_STATUS.COMPLETED,
          },
        };
      default:
        throw new Error(`Invalid action ${action} for BlockedState`);
    }
  }
}
