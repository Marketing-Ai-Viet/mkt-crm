import { BadRequestException, Injectable } from '@nestjs/common';

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { OrderStatusGraphQL } from 'src/mkt-core/order/graphql/order-status.enum';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderStateMachine } from 'src/mkt-core/order/states/order-state-machine';

import { mapGraphQLOrderStatusToEntity } from './order-status.mapper';

export interface StatusTransitionValidation {
  orderId: string;
  currentStatus: ORDER_STATUS;
  newStatus: ORDER_STATUS;
  isValid: boolean;
  errorMessage?: string;
}

@Injectable()
export class OrderStatusValidationService {
  /**
   * Validate if an order can transition from current status to new status
   */
  validateSingleStatusTransition(
    order: MktOrderWorkspaceEntity,
    newStatus: OrderStatusGraphQL,
  ): StatusTransitionValidation {
    const currentStatus = order.status;
    const targetStatus = mapGraphQLOrderStatusToEntity(newStatus);

    if (!targetStatus) {
      return {
        orderId: order.id,
        currentStatus,
        newStatus: targetStatus || ORDER_STATUS.DRAFT,
        isValid: false,
        errorMessage: 'Invalid target status',
      };
    }

    // Create state machine with current order
    const stateMachine = new OrderStateMachine(order);

    const canTransition = stateMachine.canTransitionTo(targetStatus);

    return {
      orderId: order.id,
      currentStatus,
      newStatus: targetStatus,
      isValid: canTransition,
      errorMessage: canTransition
        ? undefined
        : `Cannot transition from ${currentStatus} to ${targetStatus}`,
    };
  }

  /**
   * Validate multiple status transitions
   */
  validateBulkStatusTransitions(
    orders: MktOrderWorkspaceEntity[],
    newStatus: OrderStatusGraphQL,
  ): {
    validTransitions: StatusTransitionValidation[];
    invalidTransitions: StatusTransitionValidation[];
    allValid: boolean;
  } {
    const validTransitions: StatusTransitionValidation[] = [];
    const invalidTransitions: StatusTransitionValidation[] = [];

    for (const order of orders) {
      const validation = this.validateSingleStatusTransition(order, newStatus);

      if (validation.isValid) {
        validTransitions.push(validation);
      } else {
        invalidTransitions.push(validation);
      }
    }

    return {
      validTransitions,
      invalidTransitions,
      allValid: invalidTransitions.length === 0,
    };
  }

  /**
   * Special validation for WAIT -> CONFIRMED transition
   */
  validateWaitToConfirmedTransition(orders: MktOrderWorkspaceEntity[]): {
    validOrders: MktOrderWorkspaceEntity[];
    invalidOrders: Array<{ order: MktOrderWorkspaceEntity; reason: string }>;
  } {
    const validOrders: MktOrderWorkspaceEntity[] = [];
    const invalidOrders: Array<{
      order: MktOrderWorkspaceEntity;
      reason: string;
    }> = [];

    for (const order of orders) {
      if (order.status !== ORDER_STATUS.WAIT) {
        invalidOrders.push({
          order,
          reason: `Order ${order.id} has status ${order.status}, but only orders with WAIT status can be confirmed`,
        });
      } else {
        // Additional business logic checks can be added here
        // For example: check if payment is received, documents are complete, etc.
        validOrders.push(order);
      }
    }

    return { validOrders, invalidOrders };
  }

  /**
   * Validate and throw error if any invalid transitions
   */
  validateAndThrowIfInvalid(
    orders: MktOrderWorkspaceEntity[],
    newStatus: OrderStatusGraphQL,
  ): void {
    const validation = this.validateBulkStatusTransitions(orders, newStatus);

    if (!validation.allValid) {
      const errorMessages = validation.invalidTransitions.map(
        (v) => `Order ${v.orderId}: ${v.errorMessage}`,
      );

      throw new BadRequestException(
        `Invalid status transitions detected:\n${errorMessages.join('\n')}`,
      );
    }
  }

  /**
   * Special validation for CONFIRMED status - only allow WAIT -> CONFIRMED
   */
  validateConfirmTransition(orders: MktOrderWorkspaceEntity[]): void {
    const validation = this.validateWaitToConfirmedTransition(orders);

    if (validation.invalidOrders.length > 0) {
      const errorMessages = validation.invalidOrders.map((item) => item.reason);

      throw new BadRequestException(
        `Invalid orders for confirmation:\n${errorMessages.join('\n')}`,
      );
    }
  }

  /**
   * Validate bulk update operations - ONLY allow WAIT -> CONFIRMED
   */
  validateBulkUpdateStatusTransition(
    order: MktOrderWorkspaceEntity,
    newStatus: OrderStatusGraphQL,
  ): { isValid: boolean; errorMessage?: string } {
    // For bulk updates, only allow CONFIRMED status
    if (newStatus !== OrderStatusGraphQL.CONFIRMED) {
      return {
        isValid: false,
        errorMessage: `Bulk status update only supports WAIT -> CONFIRMED transition. Requested status: ${newStatus}`,
      };
    }

    // For CONFIRMED status, must be from WAIT
    if (order.status !== ORDER_STATUS.WAIT) {
      return {
        isValid: false,
        errorMessage: `Cannot update status to CONFIRMED from ${order.status}. Only WAIT -> CONFIRMED is allowed.`,
      };
    }

    return { isValid: true };
  }
}
