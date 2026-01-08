import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { OrderStatusService } from 'src/mkt-core/order/services/core';
import {
  ConfirmOrderInput,
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types';
import { ConfirmOrderSagaContext } from 'src/mkt-core/order/orchestration/context';

/**
 * Result type for transition validation
 */
type TransitionResult = {
  action: ORDER_ACTION;
  newStatus: ORDER_STATUS;
};

/**
 * ValidateTransitionStep - Step 2: Validate status transition is allowed
 *
 * Responsibilities:
 * - Determine target status from action
 * - Validate transition is allowed per state machine rules
 * - Store action and target status in context
 *
 * Compensate:
 * - No compensation needed (validation-only step)
 */
@Injectable()
export class ValidateTransitionStep extends SagaStep<
  ConfirmOrderInput,
  TransitionResult
> {
  readonly name = 'validate_transition';
  readonly description = 'Validate status transition is allowed';

  private readonly logger = new Logger(ValidateTransitionStep.name);

  constructor(private readonly orderStatusService: OrderStatusService) {
    super();
  }

  async execute(
    context: SagaContext,
    input: ConfirmOrderInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<TransitionResult>> {
    const typedContext = context as ConfirmOrderSagaContext;

    try {
      if (!typedContext.currentOrder) {
        return {
          success: false,
          error: new Error('Current order not loaded from previous step'),
        };
      }

      this.logger.log(
        `Validating transition for order: ${typedContext.orderId}, action: ${input.action}`,
      );

      // Get target status from action
      const targetStatus = this.orderStatusService.getStatusFromAction(
        input.action,
      );

      // Validate transition using state machine
      const transitionResult = this.orderStatusService.determineAction(
        typedContext.currentOrder,
        {
          status: targetStatus,
          accountingConfirmed: input.accountingConfirmed,
        },
      );

      if (
        !transitionResult.valid ||
        !transitionResult.action ||
        !transitionResult.newStatus
      ) {
        const errorMessage =
          transitionResult.error ??
          `Invalid transition: ${typedContext.previousStatus} -> ${targetStatus}`;

        this.logger.warn(errorMessage);

        return {
          success: false,
          error: new Error(errorMessage),
        };
      }

      // Store in context for next steps
      typedContext.action = transitionResult.action;
      typedContext.targetStatus = transitionResult.newStatus;

      this.logger.log(
        `Transition validated: ${typedContext.previousStatus} -> ${transitionResult.newStatus} (action: ${transitionResult.action})`,
      );

      return {
        success: true,
        data: {
          action: transitionResult.action,
          newStatus: transitionResult.newStatus,
        },
      };
    } catch (error) {
      this.logger.error('Failed to validate transition', error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error('Transition validation failed'),
      };
    }
  }

  async compensate(
    _context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    // Validation step doesn't modify data, no compensation needed
    this.logger.log(
      'ValidateTransitionStep: No compensation needed (validation-only)',
    );
  }
}
