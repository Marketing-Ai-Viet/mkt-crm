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
 * PendingPaymentState - State for orders waiting for payment confirmation
 *
 * Transitions:
 * - PENDING_PAYMENT → CONFIRMED (kế toán xác nhận thanh toán)
 * - PENDING_PAYMENT → CANCELED (hủy đơn)
 * - PENDING_PAYMENT → OVERDUE (quá hạn thanh toán)
 */
export class PendingPaymentState extends OrderState {
  constructor() {
    super(ORDER_STATUS.PENDING_PAYMENT);
  }

  canTransitionTo(
    newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return [
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.CANCELED,
      ORDER_STATUS.OVERDUE,
    ].includes(newStatus);
  }

  getAction(
    context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    // PENDING_PAYMENT → CONFIRMED (kế toán xác nhận)
    if (
      input.status === ORDER_STATUS.CONFIRMED ||
      input.accountingConfirmed === true
    ) {
      return ORDER_ACTION.ACCOUNTING_CONFIRMED;
    }

    // PENDING_PAYMENT → CANCELED
    if (input.status === ORDER_STATUS.CANCELED) {
      return ORDER_ACTION.CANCEL;
    }

    // PENDING_PAYMENT → OVERDUE
    if (input.status === ORDER_STATUS.OVERDUE) {
      return ORDER_ACTION.CANCEL;
    }

    return null;
  }

  getPayload(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    switch (action) {
      case ORDER_ACTION.ACCOUNTING_CONFIRMED:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.CONFIRMED,
            accountingConfirmed: true,
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
        throw new Error(`Invalid action ${action} for PendingPaymentState`);
    }
  }
}
