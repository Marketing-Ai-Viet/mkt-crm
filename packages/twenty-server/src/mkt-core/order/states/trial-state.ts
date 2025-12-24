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
 * TrialState - State for trial orders
 *
 * Transitions:
 * - TRIAL → PENDING_PAYMENT (chuyển sang trả phí)
 * - TRIAL → TRIAL_EXPIRED (trial hết hạn)
 * - TRIAL → CANCELED (hủy đơn trial)
 */
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
      ORDER_STATUS.PENDING_PAYMENT,
      ORDER_STATUS.TRIAL_EXPIRED,
      ORDER_STATUS.CANCELED,
    ].includes(newStatus);
  }

  getAction(
    _context: OrderStateContext,
    input: OrderStateInput,
  ): ORDER_ACTION | null {
    // TRIAL → PENDING_PAYMENT (chuyển sang trả phí)
    if (input.status === ORDER_STATUS.PENDING_PAYMENT) {
      return ORDER_ACTION.TRIAL_TO_PAID;
    }

    // TRIAL → TRIAL_EXPIRED
    if (input.status === ORDER_STATUS.TRIAL_EXPIRED) {
      return ORDER_ACTION.TRIAL;
    }

    // TRIAL → CANCELED
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
      case ORDER_ACTION.TRIAL_TO_PAID:
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
            status: ORDER_STATUS.TRIAL_EXPIRED,
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
        throw new Error(`Invalid action ${action} for TrialState`);
    }
  }
}
