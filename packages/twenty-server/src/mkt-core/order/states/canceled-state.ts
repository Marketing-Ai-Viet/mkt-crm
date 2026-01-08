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
 * CanceledState - Terminal state for canceled orders
 *
 * Transitions: None (terminal state)
 */
export class CanceledState extends OrderState {
  constructor() {
    super(ORDER_STATUS.CANCELED);
  }

  canTransitionTo(
    _newStatus: ORDER_STATUS,
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): boolean {
    // Terminal state - no transitions allowed
    return false;
  }

  getAction(
    _context: OrderStateContext,
    _input: OrderStateInput,
  ): ORDER_ACTION | null {
    // No actions allowed for canceled orders
    return null;
  }

  getPayload(
    _payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    throw new Error(
      `Invalid action ${action} for CanceledState - terminal state`,
    );
  }
}
