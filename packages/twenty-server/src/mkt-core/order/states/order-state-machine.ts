import { Logger } from '@nestjs/common';

import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { BlockedState } from 'src/mkt-core/order/states/blocked-state';
import { CanceledState } from 'src/mkt-core/order/states/canceled-state';
import { CompletedState } from 'src/mkt-core/order/states/completed-state';
import { ConfirmedState } from 'src/mkt-core/order/states/confirm-state';
import { DraftState } from 'src/mkt-core/order/states/draft-state';
import {
  OrderState,
  OrderStateContext,
  OrderStateInput,
} from 'src/mkt-core/order/types/order-state.interface';
import { OverdueState } from 'src/mkt-core/order/states/overdue-state';
import { PendingPaymentState } from 'src/mkt-core/order/states/pending-payment-state';
import { RefundPartialState } from 'src/mkt-core/order/states/refund-partial-state';
import { RefundState } from 'src/mkt-core/order/states/refund-state';
import { TrialExpiredState } from 'src/mkt-core/order/states/trial-expired-state';
import { TrialState } from 'src/mkt-core/order/states/trial-state';

export class OrderStateMachine implements OrderStateContext {
  private readonly logger = new Logger(OrderStateMachine.name);
  private currentState: OrderState;
  private currentOrder: Partial<MktOrderWorkspaceEntity> | null;

  constructor(currentOrder: Partial<MktOrderWorkspaceEntity> | null = null) {
    this.currentOrder = currentOrder;
    this.currentState = this.createStateFromOrder(currentOrder);
  }

  getCurrentStatus(): ORDER_STATUS | null {
    return (this.currentOrder?.status as ORDER_STATUS) || null;
  }

  getTrialLicense(): boolean | null {
    return this.currentOrder?.trialLicense ?? null;
  }

  getLicenseStatus(): string | null {
    return this.currentOrder?.licenseStatus || null;
  }

  getSInvoiceStatus(): string | null {
    return this.currentOrder?.sInvoiceStatus || null;
  }

  getAccountingConfirmed(): boolean | null {
    return this.currentOrder?.accountingConfirmed ?? null;
  }

  /**
   * Create state from current order status
   *
   * Flow chính:
   * - NEW_ORDER: DRAFT → PENDING_PAYMENT → CONFIRMED → COMPLETED
   * - TRIAL: TRIAL → (TRIAL_EXPIRED | PENDING_PAYMENT)
   */
  private createStateFromOrder(
    order: Partial<MktOrderWorkspaceEntity> | null,
  ): OrderState {
    if (!order || !order.status) {
      return new DraftState();
    }

    switch (order.status) {
      case ORDER_STATUS.DRAFT:
        return new DraftState();
      case ORDER_STATUS.PENDING_PAYMENT:
        return new PendingPaymentState();
      case ORDER_STATUS.TRIAL:
        return new TrialState();
      case ORDER_STATUS.TRIAL_EXPIRED:
        return new TrialExpiredState();
      case ORDER_STATUS.CONFIRMED:
        return new ConfirmedState();
      case ORDER_STATUS.COMPLETED:
        return new CompletedState();
      case ORDER_STATUS.CANCELED:
        return new CanceledState();
      case ORDER_STATUS.BLOCKED:
        return new BlockedState();
      case ORDER_STATUS.OVERDUE:
        return new OverdueState();
      case ORDER_STATUS.REFUND:
        return new RefundState();
      case ORDER_STATUS.REFUND_PARTIAL:
        return new RefundPartialState();
      default:
        this.logger.warn(
          `Unknown order status: ${order.status}, defaulting to DraftState`,
        );

        return new DraftState();
    }
  }

  /**
   * Determine action to perform based on input
   */
  getAction(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
  ): ORDER_ACTION | null {
    const input: OrderStateInput = {
      status: payload.data?.status as ORDER_STATUS,
      trialLicense: payload.data?.trialLicense,
      licenseStatus: payload.data?.licenseStatus,
      sInvoiceStatus: payload.data?.sInvoiceStatus,
      accountingConfirmed: payload.data?.accountingConfirmed,
      metadata: payload.data?.metadata,
    };

    return this.currentState.getAction(this, input);
  }

  /**
   * Create new payload based on action
   */
  getPayload(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    return this.currentState.getPayload(payload, action);
  }

  /**
   * Check if transition to new status is allowed
   */
  canTransitionTo(newStatus: ORDER_STATUS): boolean {
    const input: OrderStateInput = {
      status: newStatus,
    };

    return this.currentState.canTransitionTo(newStatus, this, input);
  }

  /**
   * Transition to new status
   */
  _transitionTo(newStatus: ORDER_STATUS): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.currentState.getStatus()} to ${newStatus}`,
      );
    }

    this.logger.log(
      `Transitioning from ${this.currentState.getStatus()} to ${newStatus}`,
    );

    // Update currentOrder
    if (this.currentOrder) {
      this.currentOrder.status = newStatus;
    }

    // Create new state
    this.currentState = this.createStateFromOrder(this.currentOrder);
  }

  /**
   * Get current state
   */
  _getCurrentState(): OrderState {
    return this.currentState;
  }

  /**
   * Update current order
   */
  _updateOrder(order: Partial<MktOrderWorkspaceEntity> | null): void {
    this.currentOrder = order;
    this.currentState = this.createStateFromOrder(order);
  }
}
