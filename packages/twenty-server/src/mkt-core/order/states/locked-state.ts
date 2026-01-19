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
 * LockedState - State for orders locked due to overdue payment
 *
 * New Payment Flow:
 * - Order bị lock khi quá hạn thanh toán
 * - License trên MKT Server cũng bị lock
 * - Khi thanh toán muộn → unlock license → COMPLETED
 * - Hoặc có thể hủy đơn
 *
 * Transitions:
 * - LOCKED → COMPLETED (thanh toán muộn được xác nhận)
 * - LOCKED → CANCELED (hủy đơn)
 */
export class LockedState extends OrderState {
  constructor() {
    super(ORDER_STATUS.LOCKED);
  }

  canTransitionTo(
    newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELED].includes(newStatus);
  }

  getAction(
    _context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    // LOCKED → COMPLETED (thanh toán muộn OK, unlock license)
    if (input.status === ORDER_STATUS.COMPLETED) {
      return ORDER_ACTION.UNLOCK_AFTER_PAYMENT;
    }

    // LOCKED → CANCELED (hủy đơn)
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
      case ORDER_ACTION.UNLOCK_AFTER_PAYMENT:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.COMPLETED,
            accountingConfirmed: true,
            // Clear lock fields
            lockedAt: null,
            lockedReason: null,
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
        throw new Error(`Invalid action ${action} for LockedState`);
    }
  }
}
