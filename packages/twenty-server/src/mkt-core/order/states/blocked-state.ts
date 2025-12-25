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
 * BlockedState - State for blocked orders
 *
 * Transitions:
 * - BLOCKED → PENDING_PAYMENT (mở khóa và chờ thanh toán lại)
 * - BLOCKED → CANCELED (hủy đơn)
 */
export class BlockedState extends OrderState {
  constructor() {
    super(ORDER_STATUS.BLOCKED);
  }

  canTransitionTo(
    newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CANCELED].includes(
      newStatus,
    );
  }

  getAction(
    _context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    // BLOCKED → PENDING_PAYMENT (mở khóa)
    if (input.status === ORDER_STATUS.PENDING_PAYMENT) {
      return ORDER_ACTION.NEW_ORDER;
    }

    // BLOCKED → CANCELED
    if (input.status === ORDER_STATUS.CANCELED) {
      return ORDER_ACTION.CANCEL;
    }

    return null;
  }

  getPayload(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    switch (action) {
      case ORDER_ACTION.NEW_ORDER:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.PENDING_PAYMENT,
          },
        };

      case ORDER_ACTION.CANCEL:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.CANCELED,
          },
        };

      default:
        throw new Error(`Invalid action ${action} for BlockedState`);
    }
  }
}
