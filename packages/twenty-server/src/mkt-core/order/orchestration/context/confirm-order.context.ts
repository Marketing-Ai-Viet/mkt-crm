import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { SagaContext } from 'src/mkt-core/order/types';

/**
 * Typed context for ConfirmOrderSaga
 *
 * Extends SagaContext with strongly typed fields
 * to replace Map<string, unknown> usage
 */
export type ConfirmOrderSagaContext = SagaContext & {
  // Step outputs (typed)
  currentOrder?: MktOrderWorkspaceEntity;
  previousStatus?: ORDER_STATUS;
  targetStatus?: ORDER_STATUS;
  action?: ORDER_ACTION;

  // Rollback data (typed)
  rollbackOrder?: {
    status: ORDER_STATUS;
    accountingConfirmed?: boolean;
    note?: string;
    // Payment fields for rollback
    paymentStatus?: string;
    paidAmount?: number;
    remainingAmount?: number;
  };
};

/**
 * Factory function to create typed ConfirmOrderSagaContext
 */
export const createConfirmOrderContext = (
  workspaceId: string,
  workspaceMemberId?: string,
): ConfirmOrderSagaContext => ({
  workspaceId,
  workspaceMemberId,
  rollbackData: new Map(),
  metadata: new Map(),
});
