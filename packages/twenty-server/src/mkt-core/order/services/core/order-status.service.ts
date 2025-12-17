import { Injectable, Logger } from '@nestjs/common';

import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderStateMachine } from 'src/mkt-core/order/states';

/**
 * Result of status transition validation
 */
export type StatusTransitionResult = {
  valid: boolean;
  action: ORDER_ACTION | null;
  newStatus: ORDER_STATUS | null;
  error?: string;
};

/**
 * Input for determining action
 */
export type StatusInput = {
  status?: ORDER_STATUS | null;
  trialLicense?: boolean | null;
  licenseStatus?: string | null;
  sInvoiceStatus?: string | null;
  accountingConfirmed?: boolean | null;
  metadata?: unknown | null;
};

/**
 * Status to action mapping
 */
const STATUS_ACTION_MAP: Record<ORDER_STATUS, ORDER_ACTION> = {
  [ORDER_STATUS.DRAFT]: ORDER_ACTION.DRAFT,
  [ORDER_STATUS.TRIAL]: ORDER_ACTION.TRIAL,
  [ORDER_STATUS.WAIT]: ORDER_ACTION.WAIT,
  [ORDER_STATUS.COMPLETED]: ORDER_ACTION.COMPLETED,
  [ORDER_STATUS.CONFIRMED]: ORDER_ACTION.CONFIRMED,
  [ORDER_STATUS.BLOCKED]: ORDER_ACTION.LOCKED,
  [ORDER_STATUS.OVERDUE]: ORDER_ACTION.OVERDUE,
  [ORDER_STATUS.REFUSE]: ORDER_ACTION.REFUSE,
  [ORDER_STATUS.REFUND]: ORDER_ACTION.REFUND,
  [ORDER_STATUS.REFUND_PARTIAL]: ORDER_ACTION.REFUND_PARTIAL,
};

/**
 * Valid status transitions matrix
 * Key: current status, Value: array of allowed target statuses
 */
const VALID_TRANSITIONS: Record<ORDER_STATUS, ORDER_STATUS[]> = {
  [ORDER_STATUS.DRAFT]: [ORDER_STATUS.WAIT, ORDER_STATUS.TRIAL],
  [ORDER_STATUS.TRIAL]: [
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.WAIT,
    ORDER_STATUS.REFUSE,
  ],
  [ORDER_STATUS.WAIT]: [
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.OVERDUE,
    ORDER_STATUS.REFUSE,
    ORDER_STATUS.BLOCKED,
  ],
  [ORDER_STATUS.CONFIRMED]: [
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.REFUND,
    ORDER_STATUS.REFUND_PARTIAL,
    ORDER_STATUS.BLOCKED,
  ],
  [ORDER_STATUS.COMPLETED]: [ORDER_STATUS.REFUND, ORDER_STATUS.REFUND_PARTIAL],
  [ORDER_STATUS.OVERDUE]: [
    ORDER_STATUS.WAIT,
    ORDER_STATUS.REFUSE,
    ORDER_STATUS.BLOCKED,
  ],
  [ORDER_STATUS.BLOCKED]: [ORDER_STATUS.WAIT, ORDER_STATUS.REFUSE],
  [ORDER_STATUS.REFUSE]: [],
  [ORDER_STATUS.REFUND]: [],
  [ORDER_STATUS.REFUND_PARTIAL]: [ORDER_STATUS.REFUND],
};

/**
 * OrderStatusService - Centralized service for order status management
 *
 * Responsibilities:
 * - Determine valid actions based on current and target status
 * - Validate status transitions
 * - Map actions to statuses and vice versa
 * - Encapsulate state machine logic for resolver usage
 */
@Injectable()
export class OrderStatusService {
  private readonly logger = new Logger(OrderStatusService.name);

  /**
   * Determine valid action based on current order and target input
   * Uses existing OrderStateMachine internally
   */
  determineAction(
    currentOrder: Partial<MktOrderWorkspaceEntity> | null,
    input: StatusInput,
  ): StatusTransitionResult {
    try {
      const stateMachine = new OrderStateMachine(currentOrder);
      const currentStatus = currentOrder?.status as ORDER_STATUS | null;

      // Build payload for state machine with required type casting
      const payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity> = {
        id: currentOrder?.id ?? '',
        data: {
          status: input.status,
          trialLicense: input.trialLicense,
          licenseStatus: input.licenseStatus,
          sInvoiceStatus: input.sInvoiceStatus,
          accountingConfirmed: input.accountingConfirmed,
          metadata: input.metadata,
        } as unknown as MktOrderWorkspaceEntity,
      };

      const action = stateMachine.getAction(payload);

      if (!action) {
        return {
          valid: false,
          action: null,
          newStatus: null,
          error: `Invalid state transition: Cannot transition from ${currentStatus ?? 'null'} to ${input.status ?? 'unknown'}`,
        };
      }

      const newStatus = this.getStatusFromAction(action, currentStatus);

      this.logger.debug(
        `Determined action: ${action} for transition ${currentStatus ?? 'null'} -> ${newStatus}`,
      );

      return {
        valid: true,
        action,
        newStatus,
      };
    } catch (error) {
      this.logger.error(`Error determining action: ${error.message}`);

      return {
        valid: false,
        action: null,
        newStatus: null,
        error: error.message,
      };
    }
  }

  /**
   * Validate if status transition is allowed
   */
  validateTransition(
    currentStatus: ORDER_STATUS | null,
    targetStatus: ORDER_STATUS,
  ): boolean {
    // From null/undefined -> any initial status is allowed
    if (!currentStatus) {
      return [
        ORDER_STATUS.DRAFT,
        ORDER_STATUS.WAIT,
        ORDER_STATUS.TRIAL,
      ].includes(targetStatus);
    }

    const allowedTransitions = VALID_TRANSITIONS[currentStatus];

    if (!allowedTransitions) {
      this.logger.warn(
        `No transition rules defined for status: ${currentStatus}`,
      );

      return false;
    }

    return allowedTransitions.includes(targetStatus);
  }

  /**
   * Get all allowed target statuses from current status
   */
  getAllowedTransitions(currentStatus: ORDER_STATUS | null): ORDER_STATUS[] {
    if (!currentStatus) {
      return [ORDER_STATUS.DRAFT, ORDER_STATUS.WAIT, ORDER_STATUS.TRIAL];
    }

    return VALID_TRANSITIONS[currentStatus] ?? [];
  }

  /**
   * Get ORDER_STATUS from ORDER_ACTION
   */
  getStatusFromAction(
    action: ORDER_ACTION,
    currentStatus?: ORDER_STATUS | null,
  ): ORDER_STATUS {
    switch (action) {
      case ORDER_ACTION.DRAFT:
        return ORDER_STATUS.DRAFT;

      case ORDER_ACTION.TRIAL:
        return ORDER_STATUS.TRIAL;

      case ORDER_ACTION.WAIT:
        return ORDER_STATUS.WAIT;

      case ORDER_ACTION.CONFIRMED:
      case ORDER_ACTION.TRIAL_TO_CONFIRMED:
        return ORDER_STATUS.CONFIRMED;

      case ORDER_ACTION.COMPLETED:
      case ORDER_ACTION.PAID:
        return ORDER_STATUS.COMPLETED;

      case ORDER_ACTION.LOCKED:
        return ORDER_STATUS.BLOCKED;

      case ORDER_ACTION.OVERDUE:
        return ORDER_STATUS.OVERDUE;

      case ORDER_ACTION.REFUSE:
      case ORDER_ACTION.CANCELLED:
        return ORDER_STATUS.REFUSE;

      case ORDER_ACTION.REFUND:
        return ORDER_STATUS.REFUND;

      case ORDER_ACTION.REFUND_PARTIAL:
        return ORDER_STATUS.REFUND_PARTIAL;

      // Actions that don't change status
      case ORDER_ACTION.LICENSE:
      case ORDER_ACTION.SINVOICE:
      case ORDER_ACTION.LICENSE_RENEWING:
      case ORDER_ACTION.CHANGE_VARIANT:
        return currentStatus ?? ORDER_STATUS.WAIT;

      case ORDER_ACTION.TRIAL_TO_PAID:
        return ORDER_STATUS.WAIT;

      case ORDER_ACTION.FREE:
        return ORDER_STATUS.COMPLETED;

      default:
        this.logger.warn(
          `Unknown action: ${action}, defaulting to current status`,
        );

        return currentStatus ?? ORDER_STATUS.DRAFT;
    }
  }

  /**
   * Get ORDER_ACTION from ORDER_STATUS
   */
  getActionFromStatus(status: ORDER_STATUS): ORDER_ACTION {
    return STATUS_ACTION_MAP[status] ?? ORDER_ACTION.DRAFT;
  }

  /**
   * Check if action is a trial-related action
   */
  isTrialAction(action: ORDER_ACTION): boolean {
    return [
      ORDER_ACTION.TRIAL,
      ORDER_ACTION.TRIAL_TO_CONFIRMED,
      ORDER_ACTION.TRIAL_TO_PAID,
    ].includes(action);
  }

  /**
   * Check if action is a refund-related action
   */
  isRefundAction(action: ORDER_ACTION): boolean {
    return [ORDER_ACTION.REFUND, ORDER_ACTION.REFUND_PARTIAL].includes(action);
  }

  /**
   * Check if action requires license processing
   */
  requiresLicenseProcessing(action: ORDER_ACTION): boolean {
    return [
      ORDER_ACTION.COMPLETED,
      ORDER_ACTION.PAID,
      ORDER_ACTION.FREE,
      ORDER_ACTION.REFUND,
      ORDER_ACTION.REFUND_PARTIAL,
      ORDER_ACTION.LICENSE,
      ORDER_ACTION.LICENSE_RENEWING,
    ].includes(action);
  }

  /**
   * Check if action requires payment processing
   */
  requiresPaymentProcessing(action: ORDER_ACTION): boolean {
    return [
      ORDER_ACTION.WAIT,
      ORDER_ACTION.TRIAL_TO_PAID,
      ORDER_ACTION.LICENSE_RENEWING,
    ].includes(action);
  }

  /**
   * Check if action requires S-Invoice sync
   */
  requiresSInvoiceSync(action: ORDER_ACTION): boolean {
    return action === ORDER_ACTION.SINVOICE;
  }

  /**
   * Check if status is terminal (no further transitions allowed)
   */
  isTerminalStatus(status: ORDER_STATUS): boolean {
    return [ORDER_STATUS.REFUSE, ORDER_STATUS.REFUND].includes(status);
  }

  /**
   * Check if status allows order modification
   */
  allowsModification(status: ORDER_STATUS | null): boolean {
    if (!status) return true;

    return [ORDER_STATUS.DRAFT].includes(status);
  }

  /**
   * Get human-readable status label
   */
  getStatusLabel(status: ORDER_STATUS, lang: 'VI' | 'EN' = 'VI'): string {
    const labels: Record<'VI' | 'EN', Record<ORDER_STATUS, string>> = {
      VI: {
        [ORDER_STATUS.DRAFT]: 'Nháp',
        [ORDER_STATUS.TRIAL]: 'Dùng thử',
        [ORDER_STATUS.COMPLETED]: 'Hoàn thành',
        [ORDER_STATUS.WAIT]: 'Chờ xử lý',
        [ORDER_STATUS.OVERDUE]: 'Quá hạn',
        [ORDER_STATUS.REFUSE]: 'Từ chối',
        [ORDER_STATUS.REFUND]: 'Hoàn tiền',
        [ORDER_STATUS.CONFIRMED]: 'Đã xác nhận',
        [ORDER_STATUS.BLOCKED]: 'Khóa đơn hàng',
        [ORDER_STATUS.REFUND_PARTIAL]: 'Hoàn tiền một phần',
      },
      EN: {
        [ORDER_STATUS.DRAFT]: 'Draft',
        [ORDER_STATUS.TRIAL]: 'Trial',
        [ORDER_STATUS.COMPLETED]: 'Completed',
        [ORDER_STATUS.WAIT]: 'Waiting',
        [ORDER_STATUS.OVERDUE]: 'Overdue',
        [ORDER_STATUS.REFUSE]: 'Refused',
        [ORDER_STATUS.REFUND]: 'Refunded',
        [ORDER_STATUS.CONFIRMED]: 'Confirmed',
        [ORDER_STATUS.BLOCKED]: 'Blocked',
        [ORDER_STATUS.REFUND_PARTIAL]: 'Partial Refund',
      },
    };

    return labels[lang][status] ?? status;
  }
}
