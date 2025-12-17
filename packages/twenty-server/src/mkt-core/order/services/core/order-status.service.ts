import { Injectable, Logger } from '@nestjs/common';

import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  INITIAL_ORDER_STATUSES,
  MODIFIABLE_ORDER_STATUSES,
  ORDER_ACTION,
  ORDER_STATUS,
  REFUND_ACTIONS,
  STATUS_ACTION_MAP,
  TERMINAL_ORDER_STATUSES,
  TRIAL_ACTIONS,
  VALID_STATUS_TRANSITIONS,
  LICENSE_PROCESSING_ACTIONS,
  PAYMENT_PROCESSING_ACTIONS,
} from 'src/mkt-core/order/constants';
import {
  MKT_ORDER_STATUS_LOG_CONTEXT,
  MKT_ORDER_STATUS_LOG_MESSAGES,
} from 'src/mkt-core/order/messages';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderStateMachine } from 'src/mkt-core/order/states';
import { StatusInput, StatusTransitionResult } from 'src/mkt-core/order/types';

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
  private readonly logger = new Logger(MKT_ORDER_STATUS_LOG_CONTEXT);

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
        MKT_ORDER_STATUS_LOG_MESSAGES.DETERMINE_ACTION_SUCCESS(
          action,
          newStatus,
        ),
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
      return INITIAL_ORDER_STATUSES.includes(targetStatus);
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions) {
      this.logger.warn(
        MKT_ORDER_STATUS_LOG_MESSAGES.NO_TRANSITION_RULES(currentStatus),
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
      return [...INITIAL_ORDER_STATUSES];
    }

    return VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
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
        this.logger.warn(MKT_ORDER_STATUS_LOG_MESSAGES.UNKNOWN_ACTION(action));

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
    return TRIAL_ACTIONS.includes(action);
  }

  /**
   * Check if action is a refund-related action
   */
  isRefundAction(action: ORDER_ACTION): boolean {
    return REFUND_ACTIONS.includes(action);
  }

  /**
   * Check if action requires license processing
   */
  requiresLicenseProcessing(action: ORDER_ACTION): boolean {
    return LICENSE_PROCESSING_ACTIONS.includes(action);
  }

  /**
   * Check if action requires payment processing
   */
  requiresPaymentProcessing(action: ORDER_ACTION): boolean {
    return PAYMENT_PROCESSING_ACTIONS.includes(action);
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
    return TERMINAL_ORDER_STATUSES.includes(status);
  }

  /**
   * Check if status allows order modification
   */
  allowsModification(status: ORDER_STATUS | null): boolean {
    if (!status) return true;

    return MODIFIABLE_ORDER_STATUSES.includes(status);
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
