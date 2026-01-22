import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { PaymentDeadlineSourceType } from 'src/mkt-core/order/constants/payment-deadline.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { SagaContext, BulkLicenseResult } from 'src/mkt-core/order/types';

/**
 * Typed context for ConfirmOrderSaga
 *
 * Extends SagaContext with strongly typed fields
 * to replace Map<string, unknown> usage
 *
 * New Payment Flow fields:
 * - paymentDeadline: Calculated deadline for payment
 * - paymentDeadlineSource: Source of deadline configuration
 * - createdLicenses: Licenses created with PENDING_PAYMENT status
 * - scheduledReminderJobIds: IDs of scheduled reminder jobs
 */
export type ConfirmOrderSagaContext = SagaContext & {
  // Step outputs (typed)
  currentOrder?: MktOrderWorkspaceEntity;
  previousStatus?: ORDER_STATUS;
  targetStatus?: ORDER_STATUS;
  action?: ORDER_ACTION;

  // New Payment Flow fields
  /** Calculated payment deadline */
  paymentDeadline?: Date;
  /** Source of deadline configuration (MANUAL, RESELLER_TIER, CUSTOMER_TYPE, PRODUCT, GLOBAL) */
  paymentDeadlineSource?: PaymentDeadlineSourceType;
  /** Hours calculated for deadline */
  paymentDeadlineHours?: number;
  /** Licenses created with PENDING_PAYMENT status */
  createdLicenses?: BulkLicenseResult;
  /** IDs of scheduled reminder jobs for cleanup */
  scheduledReminderJobIds?: string[];

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
