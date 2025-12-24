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

/**
 * ConfirmedState - State for confirmed orders (payment verified, license created)
 *
 * Transitions:
 * - CONFIRMED → COMPLETED (hoàn thành đơn hàng)
 * - CONFIRMED → REFUND (hoàn tiền toàn bộ)
 * - CONFIRMED → REFUND_PARTIAL (hoàn tiền một phần)
 * - CONFIRMED → BLOCKED (khóa đơn)
 */
export class ConfirmedState extends OrderState {
  constructor() {
    super(ORDER_STATUS.CONFIRMED);
  }

  canTransitionTo(
    newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return [
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.REFUND,
      ORDER_STATUS.REFUND_PARTIAL,
      ORDER_STATUS.BLOCKED,
    ].includes(newStatus);
  }

  getAction(
    context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    // CONFIRMED → COMPLETED
    if (input.status === ORDER_STATUS.COMPLETED) {
      return ORDER_ACTION.COMPLETE;
    }

    // CONFIRMED → REFUND
    if (
      input.status === ORDER_STATUS.REFUND &&
      context.getAccountingConfirmed()
    ) {
      return ORDER_ACTION.REFUND;
    }

    // CONFIRMED → REFUND_PARTIAL
    if (
      input.status === ORDER_STATUS.REFUND_PARTIAL &&
      context.getAccountingConfirmed()
    ) {
      return ORDER_ACTION.REFUND_PARTIAL;
    }

    // CONFIRMED → BLOCKED
    if (input.status === ORDER_STATUS.BLOCKED) {
      return ORDER_ACTION.BLOCK;
    }

    return null;
  }

  getPayload(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    switch (action) {
      case ORDER_ACTION.COMPLETE:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.COMPLETED,
          },
        };

      case ORDER_ACTION.REFUND:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.REFUND,
            accountingConfirmed: false,
          },
        };

      case ORDER_ACTION.REFUND_PARTIAL:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.REFUND_PARTIAL,
            accountingConfirmed: false,
          },
        };

      case ORDER_ACTION.BLOCK:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.BLOCKED,
          },
        };

      default:
        throw new Error(`Invalid action ${action} for ConfirmedState`);
    }
  }
}
