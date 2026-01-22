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
 * ProcessingState - State for orders with licenses created, awaiting payment
 *
 * New Payment Flow:
 * - Order được confirm → License tạo ngay với PENDING_PAYMENT status
 * - Order chuyển sang PROCESSING
 * - Khi thanh toán OK → COMPLETED
 * - Khi quá hạn → LOCKED (license bị lock trên MKT Server)
 *
 * Transitions:
 * - PROCESSING → COMPLETED (thanh toán được xác nhận)
 * - PROCESSING → LOCKED (quá hạn thanh toán)
 * - PROCESSING → CANCELED (hủy đơn)
 */
export class ProcessingState extends OrderState {
  constructor() {
    super(ORDER_STATUS.PROCESSING);
  }

  canTransitionTo(
    newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return [
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.LOCKED,
      ORDER_STATUS.CANCELED,
    ].includes(newStatus);
  }

  getAction(
    _context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    // PROCESSING → COMPLETED (thanh toán OK)
    if (input.status === ORDER_STATUS.COMPLETED) {
      return ORDER_ACTION.PAYMENT_CONFIRMED;
    }

    // PROCESSING → LOCKED (quá hạn thanh toán)
    if (input.status === ORDER_STATUS.LOCKED) {
      return ORDER_ACTION.LOCK_OVERDUE;
    }

    // PROCESSING → CANCELED (hủy đơn)
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
      case ORDER_ACTION.PAYMENT_CONFIRMED:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.COMPLETED,
            accountingConfirmed: true,
          },
        };

      case ORDER_ACTION.LOCK_OVERDUE:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.LOCKED,
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
        throw new Error(`Invalid action ${action} for ProcessingState`);
    }
  }
}
