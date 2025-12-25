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
} from 'src/mkt-core/order/types/order-state.interface';

/**
 * CompletedState - State for completed orders
 *
 * Transitions:
 * - COMPLETED → REFUND (hoàn tiền toàn bộ)
 * - COMPLETED → REFUND_PARTIAL (hoàn tiền một phần)
 */
export class CompletedState extends OrderState {
  constructor() {
    super(ORDER_STATUS.COMPLETED);
  }

  canTransitionTo(
    newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return [ORDER_STATUS.REFUND, ORDER_STATUS.REFUND_PARTIAL].includes(
      newStatus,
    );
  }

  getAction(
    context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    // COMPLETED → REFUND
    if (
      input.status === ORDER_STATUS.REFUND &&
      context.getAccountingConfirmed()
    ) {
      return ORDER_ACTION.REFUND;
    }

    // COMPLETED → REFUND_PARTIAL
    if (
      input.status === ORDER_STATUS.REFUND_PARTIAL &&
      context.getAccountingConfirmed()
    ) {
      return ORDER_ACTION.REFUND_PARTIAL;
    }

    return null;
  }

  getPayload(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    switch (action) {
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

      default:
        throw new Error(`Invalid action ${action} for CompletedState`);
    }
  }
}
