import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { ConfirmOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import {
  ConfirmOrderInput,
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types';

/**
 * ValidateOrderStep - Step 1: Validate order exists and load current state
 *
 * Responsibilities:
 * - Verify order exists in database
 * - Load order with relations
 * - Store current state for potential rollback
 *
 * Compensate:
 * - No compensation needed (read-only step)
 */
@Injectable()
export class ValidateOrderStep extends SagaStep<
  ConfirmOrderInput,
  MktOrderWorkspaceEntity
> {
  readonly name = 'validate_order';
  readonly description = 'Validate order exists and load current state';

  private readonly logger = new Logger(ValidateOrderStep.name);

  constructor(private readonly orderRepository: MktOrderRepository) {
    super();
  }

  async execute(
    context: SagaContext,
    input: ConfirmOrderInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<MktOrderWorkspaceEntity>> {
    const typedContext = context as ConfirmOrderSagaContext;

    try {
      this.logger.log(`Validating order: ${input.orderId}`);

      // Use repository to find order with relations
      const order = await this.orderRepository.findByIdWithOptions(
        context.workspaceId,
        input.orderId,
        { relations: { orderItems: true } },
      );

      if (!order) {
        return {
          success: false,
          error: new Error(`Order ${input.orderId} not found`),
        };
      }

      // Store in typed context
      typedContext.orderId = order.id;
      typedContext.orderCode = order.orderCode;
      typedContext.currentOrder = order;
      typedContext.previousStatus = order.status as ORDER_STATUS;

      // Store rollback data (including payment fields for compensation)
      typedContext.rollbackOrder = {
        status: order.status as ORDER_STATUS,
        accountingConfirmed: order.accountingConfirmed,
        note: order.note,
        // Payment fields for rollback
        paymentStatus: order.paymentStatus as string | undefined,
        paidAmount: order.paidAmount ?? undefined,
        remainingAmount: order.remainingAmount ?? undefined,
      };

      this.logger.log(
        `Order validated: ${order.id}, current status: ${order.status}`,
      );

      return {
        success: true,
        data: order,
      };
    } catch (error) {
      this.logger.error(`Failed to validate order: ${input.orderId}`, error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Validation failed'),
      };
    }
  }

  async compensate(
    _context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    // Validation step doesn't modify data, no compensation needed
    this.logger.log('ValidateOrderStep: No compensation needed (read-only)');
  }
}
