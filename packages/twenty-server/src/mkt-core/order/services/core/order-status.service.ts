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

      // Check for terminal status early - cannot transition from CANCELED or REFUND
      if (currentStatus && this.isTerminalStatus(currentStatus)) {
        return {
          valid: false,
          action: null,
          newStatus: null,
          error:
            MKT_ORDER_STATUS_LOG_MESSAGES.TERMINAL_STATUS_ERROR(currentStatus),
        };
      }

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
   *
   * Flow chính:
   * - NEW_ORDER: DRAFT → PENDING_PAYMENT → CONFIRMED → COMPLETED
   * - TRIAL: TRIAL → (TRIAL_EXPIRED | PENDING_PAYMENT)
   */
  getStatusFromAction(
    action: ORDER_ACTION,
    currentStatus?: ORDER_STATUS | null,
  ): ORDER_STATUS {
    switch (action) {
      case ORDER_ACTION.NEW_ORDER:
        return ORDER_STATUS.PENDING_PAYMENT;

      case ORDER_ACTION.TRIAL:
        return ORDER_STATUS.TRIAL;

      case ORDER_ACTION.ACCOUNTING_CONFIRMED:
        return ORDER_STATUS.CONFIRMED;

      case ORDER_ACTION.COMPLETE:
        return ORDER_STATUS.COMPLETED;

      case ORDER_ACTION.BLOCK:
        return ORDER_STATUS.BLOCKED;

      case ORDER_ACTION.CANCEL:
        return ORDER_STATUS.CANCELED;

      case ORDER_ACTION.REFUND:
        return ORDER_STATUS.REFUND;

      case ORDER_ACTION.REFUND_PARTIAL:
        return ORDER_STATUS.REFUND_PARTIAL;

      // TRIAL_TO_PAID: Trial chuyển sang chờ thanh toán
      case ORDER_ACTION.TRIAL_TO_PAID:
        return ORDER_STATUS.PENDING_PAYMENT;

      // Actions that don't change status (keep current or default)
      case ORDER_ACTION.LICENSE_RENEWING:
      case ORDER_ACTION.CHANGE_VARIANT:
        return currentStatus ?? ORDER_STATUS.PENDING_PAYMENT;

      default:
        this.logger.warn(MKT_ORDER_STATUS_LOG_MESSAGES.UNKNOWN_ACTION(action));

        return currentStatus ?? ORDER_STATUS.DRAFT;
    }
  }

  /**
   * Get ORDER_ACTION from ORDER_STATUS
   */
  getActionFromStatus(status: ORDER_STATUS): ORDER_ACTION {
    return STATUS_ACTION_MAP[status] ?? ORDER_ACTION.NEW_ORDER;
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
        [ORDER_STATUS.PENDING_PAYMENT]: 'Chờ thanh toán',
        [ORDER_STATUS.TRIAL]: 'Dùng thử',
        [ORDER_STATUS.TRIAL_EXPIRED]: 'Trial hết hạn',
        [ORDER_STATUS.CONFIRMED]: 'Đã xác nhận',
        [ORDER_STATUS.PROCESSING]: 'Đang xử lý',
        [ORDER_STATUS.COMPLETED]: 'Hoàn thành',
        [ORDER_STATUS.LOCKED]: 'Khóa do quá hạn',
        [ORDER_STATUS.CANCELED]: 'Đã hủy',
        [ORDER_STATUS.OVERDUE]: 'Quá hạn',
        [ORDER_STATUS.BLOCKED]: 'Bị khóa',
        [ORDER_STATUS.REFUND]: 'Hoàn tiền',
        [ORDER_STATUS.REFUND_PARTIAL]: 'Hoàn tiền một phần',
      },
      EN: {
        [ORDER_STATUS.DRAFT]: 'Draft',
        [ORDER_STATUS.PENDING_PAYMENT]: 'Pending Payment',
        [ORDER_STATUS.TRIAL]: 'Trial',
        [ORDER_STATUS.TRIAL_EXPIRED]: 'Trial Expired',
        [ORDER_STATUS.CONFIRMED]: 'Confirmed',
        [ORDER_STATUS.PROCESSING]: 'Processing',
        [ORDER_STATUS.COMPLETED]: 'Completed',
        [ORDER_STATUS.LOCKED]: 'Locked (Overdue)',
        [ORDER_STATUS.CANCELED]: 'Canceled',
        [ORDER_STATUS.OVERDUE]: 'Overdue',
        [ORDER_STATUS.BLOCKED]: 'Blocked',
        [ORDER_STATUS.REFUND]: 'Refunded',
        [ORDER_STATUS.REFUND_PARTIAL]: 'Partial Refund',
      },
    };

    return labels[lang][status] ?? status;
  }
}
