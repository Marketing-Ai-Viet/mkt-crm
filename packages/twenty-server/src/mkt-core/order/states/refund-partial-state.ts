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

export class RefundPartialState extends OrderState {
  constructor() {
    super(ORDER_STATUS.REFUND);
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
    return ORDER_ACTION.REFUND_PARTIAL;
  }

  getPayload(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    switch (action) {
      case ORDER_ACTION.REFUND_PARTIAL:
        return {
          ...payload,
          data: {
            status: ORDER_STATUS.REFUND_PARTIAL,
            accountingConfirmed: true,
          },
        };
      default:
        throw new Error(`Invalid action ${action} for RefundState`);
    }
  }
}
