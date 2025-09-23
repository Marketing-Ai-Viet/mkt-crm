import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  ORDER_ACTION,
  ORDER_STATUS,
  SINVOICE_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

import {
  OrderState,
  OrderStateContext,
  OrderStateInput,
} from './order-state.interface';

export class CompletedState extends OrderState {
  constructor() {
    super(ORDER_STATUS.COMPLETED);
  }

  canTransitionTo(
    _newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return false;
  }

  getAction(
    context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    // Completed -> OVERDUE
    if (input.sInvoiceStatus === SINVOICE_STATUS.SEND) {
      return ORDER_ACTION.SINVOICE;
    }

    return null;
  }

  getPayload(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    switch (action) {
      case ORDER_ACTION.SINVOICE:
        return {
          ...payload,
          data: {
            status: ORDER_STATUS.COMPLETED,
            trialLicense: false,
            sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
          },
        };
      default:
        throw new Error(`Invalid action ${action} for ConfirmedState`);
    }
  }
}
