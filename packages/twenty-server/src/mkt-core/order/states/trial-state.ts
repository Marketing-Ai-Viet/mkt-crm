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

export class TrialState extends OrderState {
  constructor() {
    super(ORDER_STATUS.TRIAL);
  }

  canTransitionTo(
    newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return [
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.REFUSE,
      ORDER_STATUS.OVERDUE,
    ].includes(newStatus);
  }

  getAction(
    _context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    // Trial -> Completed
    if (input.status === ORDER_STATUS.COMPLETED) {
      return ORDER_ACTION.CONFIRMED;
    }

    // Trial -> REFUSE
    if (input.status === ORDER_STATUS.REFUSE) {
      return ORDER_ACTION.REFUSE;
    }

    // Trial -> OVERDUE
    if (input.status === ORDER_STATUS.OVERDUE) {
      return ORDER_ACTION.OVERDUE;
    }

    return null;
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
            trialLicense: false,
          },
        };

      case ORDER_ACTION.REFUSE:
        return {
          ...payload,
          data: {
            status: ORDER_STATUS.REFUSE,
          },
        };

      case ORDER_ACTION.OVERDUE:
        return {
          ...payload,
          data: {
            status: ORDER_STATUS.OVERDUE,
          },
        };

      default:
        throw new Error(`Invalid action ${action} for TrialState`);
    }
  }
}
