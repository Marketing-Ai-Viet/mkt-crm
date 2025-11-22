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
    newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return [
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.BLOCKED,
      ORDER_STATUS.REFUND,
      ORDER_STATUS.REFUND_PARTIAL,
    ].includes(newStatus);
  }

  getAction(
    context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    if (input.sInvoiceStatus === SINVOICE_STATUS.SEND) {
      return ORDER_ACTION.SINVOICE;
    }
    if (input.status === ORDER_STATUS.BLOCKED) {
      return ORDER_ACTION.LOCKED;
    }

    if (
      input.status === ORDER_STATUS.REFUND &&
      context.getAccountingConfirmed()
    ) {
      return ORDER_ACTION.REFUND;
    }

    if (
      input.status === ORDER_STATUS.REFUND_PARTIAL &&
      context.getAccountingConfirmed()
    ) {
      return ORDER_ACTION.REFUND_PARTIAL;
    }

    if (input.accountingConfirmed) {
      return ORDER_ACTION.COMPLETED;
    }

    return null;
  }

  getPayload(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    // eslint-disable-next-line no-console
    console.log('=== CompletedState getPayload DEBUG ===');
    // eslint-disable-next-line no-console
    console.log('Input payload:', JSON.stringify(payload, null, 2));
    // eslint-disable-next-line no-console
    console.log('Action:', action);

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
      case ORDER_ACTION.COMPLETED:
        return {
          ...payload,
          data: {
            status: ORDER_STATUS.COMPLETED,
          },
        };
      case ORDER_ACTION.LOCKED:
        return {
          ...payload,
          data: {
            status: ORDER_STATUS.BLOCKED,
          },
        };

      case ORDER_ACTION.REFUND: {
        return {
          ...payload,
          data: {
            status: ORDER_STATUS.COMPLETED,
            accountingConfirmed: false,
          },
        };
      }

      case ORDER_ACTION.REFUND_PARTIAL: {
        return {
          ...payload,
          data: {
            status: ORDER_STATUS.COMPLETED,
            accountingConfirmed: false,
          },
        };
      }
      default:
        throw new Error(`Invalid action ${action} for ConfirmedState`);
    }
  }
}
