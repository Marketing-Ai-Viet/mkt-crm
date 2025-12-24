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
 * DraftState - Initial state for new orders
 *
 * Transitions:
 * - DRAFT → PENDING_PAYMENT (submit đơn hàng mới)
 * - DRAFT → TRIAL (tạo đơn trial)
 * - DRAFT → CANCELED (hủy đơn nháp)
 */
export class DraftState extends OrderState {
  constructor() {
    super(ORDER_STATUS.DRAFT);
  }

  canTransitionTo(
    newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    return [
      ORDER_STATUS.PENDING_PAYMENT,
      ORDER_STATUS.TRIAL,
      ORDER_STATUS.CANCELED,
      ORDER_STATUS.DRAFT, // Allow keeping same status
    ].includes(newStatus);
  }

  getAction(
    _context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    // Keep draft status (no change)
    if (
      input.status === null ||
      input.status === ORDER_STATUS.DRAFT ||
      input.status === undefined
    ) {
      return ORDER_ACTION.NEW_ORDER;
    }

    // DRAFT → PENDING_PAYMENT (submit đơn hàng)
    if (input.status === ORDER_STATUS.PENDING_PAYMENT) {
      return ORDER_ACTION.NEW_ORDER;
    }

    // DRAFT → TRIAL (tạo đơn trial)
    if (input.status === ORDER_STATUS.TRIAL) {
      return ORDER_ACTION.TRIAL;
    }

    // DRAFT → CANCELED
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
            trialLicense: false,
          },
        };

      case ORDER_ACTION.TRIAL:
        return {
          ...payload,
          data: {
            ...payload.data,
            status: ORDER_STATUS.TRIAL,
            trialLicense: true,
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
        throw new Error(`Invalid action ${action} for DraftState`);
    }
  }
}
