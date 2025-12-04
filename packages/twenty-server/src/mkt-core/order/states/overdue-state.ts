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

export class OverdueState extends OrderState {
  constructor() {
    super(ORDER_STATUS.OVERDUE);
  }

  canTransitionTo(
    _newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return false;
  }

  getAction(
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): ORDER_ACTION | null {
    return ORDER_ACTION.OVERDUE;
  }

  getPayload(
    _payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    switch (action) {
      default:
        throw new Error(`Invalid action ${action} for OverdueState`);
    }
  }
}
