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

export class DraftState extends OrderState {
  constructor() {
    super(ORDER_STATUS.DRAFT);
  }

  canTransitionTo(
    newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    // Draft can convert to Confirmed
    if (newStatus === ORDER_STATUS.WAIT) {
      return true;
    }

    // Draft can convert to Draft (keep the same)
    if (newStatus === ORDER_STATUS.DRAFT) {
      return true;
    }

    return false;
  }

  getAction(
    _context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    // FREE action when there is no change
    if (
      input.status === null ||
      input.status === ORDER_STATUS.DRAFT ||
      input.status === undefined
    ) {
      return ORDER_ACTION.FREE;
    }

    // Wait action when converting from Draft to Wait
    if (input.status === ORDER_STATUS.WAIT) {
      return ORDER_ACTION.WAIT;
    }

    return null;
  }

  getPayload(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    switch (action) {
      case ORDER_ACTION.FREE:
        return {
          ...payload,
          data: {
            ...payload.data,
            trialLicense: false,
          },
        };

      case ORDER_ACTION.WAIT:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.WAIT,
            trialLicense: false,
          },
        };

      default:
        throw new Error(`Invalid action ${action} for DraftState`);
    }
  }
}
