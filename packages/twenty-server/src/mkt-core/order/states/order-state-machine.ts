import { Logger } from '@nestjs/common';

import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { WaitState } from 'src/mkt-core/order/states';

import { DraftState } from './draft-state';
import {
  OrderState,
  OrderStateContext,
  OrderStateInput,
} from './order-state.interface';
import { TrialState } from './trial-state';

export class OrderStateMachine implements OrderStateContext {
  private readonly logger = new Logger(OrderStateMachine.name);
  private currentState: OrderState;
  private currentOrder: Partial<MktOrderWorkspaceEntity> | null;

  constructor(currentOrder: Partial<MktOrderWorkspaceEntity> | null = null) {
    this.currentOrder = currentOrder;
    this.currentState = this.createStateFromOrder(currentOrder);
  }

  getCurrentStatus(): ORDER_STATUS | null {
    return this.currentOrder?.status || null;
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

  /**
   * create state from current order
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
      case ORDER_STATUS.TRIAL:
        return new TrialState();
      case ORDER_STATUS.WAIT:
        return new WaitState();

      default:
        this.logger.warn(
          `Unknown order status: ${order.status}, defaulting to DraftState`,
        );

        return new DraftState();
    }
  }

  /**
   * determine action to perform
   */
  getAction(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
  ): ORDER_ACTION | null {
    const input: OrderStateInput = {
      status: payload.data?.status,
      trialLicense: payload.data?.trialLicense,
      licenseStatus: payload.data?.licenseStatus,
      sInvoiceStatus: payload.data?.sInvoiceStatus,
    };

    return this.currentState.getAction(this, input);
  }

  /**
   * create new payload based on action
   */
  getPayload(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    action: ORDER_ACTION,
  ): UpdateOneResolverArgs<Partial<MktOrderWorkspaceEntity>> {
    return this.currentState.getPayload(payload, action);
  }

  /**
   * check if can transition to new status
   */
  canTransitionTo(newStatus: ORDER_STATUS): boolean {
    const input: OrderStateInput = {
      status: newStatus,
    };

    return this.currentState.canTransitionTo(newStatus, this, input);
  }

  /**
   * transition to new status
   */
  transitionTo(newStatus: ORDER_STATUS): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.currentState.getStatus()} to ${newStatus}`,
      );
    }

    this.logger.log(
      `Transitioning from ${this.currentState.getStatus()} to ${newStatus}`,
    );

    // update currentOrder
    if (this.currentOrder) {
      this.currentOrder.status = newStatus;
    }

    // create new state
    this.currentState = this.createStateFromOrder(this.currentOrder);
  }

  /**
   * get current state
   */
  getCurrentState(): OrderState {
    return this.currentState;
  }

  /**
   * update current order
   */
  updateOrder(order: Partial<MktOrderWorkspaceEntity> | null): void {
    this.currentOrder = order;
    this.currentState = this.createStateFromOrder(order);
  }
}
