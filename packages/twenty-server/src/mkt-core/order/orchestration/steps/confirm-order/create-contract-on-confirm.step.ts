import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { MktContractService } from 'src/mkt-core/contract/services/mkt-contract.service';
import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import { ConfirmOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import {
  ConfirmOrderInput,
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types';

/**
 * Output type for CreateContractOnConfirmStep
 */
type CreateContractStepOutput = {
  contractId: string;
  contractNumber: string;
};

/**
 * CreateContractOnConfirmStep - Create contract when order is confirmed
 *
 * This step is triggered ONLY when:
 * - Action is CONFIRM_ORDER
 * - Order doesn't already have a contract linked
 *
 * Flow:
 * 1. Create new contract for the order
 * 2. Link contract to order via mktContractId
 *
 * Compensate:
 * - Unlink contract from order (soft approach - contract remains for audit)
 */
@Injectable()
export class CreateContractOnConfirmStep extends SagaStep<
  ConfirmOrderInput,
  CreateContractStepOutput
> {
  // ============================================
  // STEP CONSTANTS
  // ============================================
  private static readonly STEP_NAME = 'create_contract_on_confirm';
  private static readonly STEP_DESCRIPTION =
    'Create contract when accounting confirms payment';

  readonly name = CreateContractOnConfirmStep.STEP_NAME;
  readonly description = CreateContractOnConfirmStep.STEP_DESCRIPTION;

  private readonly logger = new Logger(CreateContractOnConfirmStep.name);

  constructor(
    private readonly contractService: MktContractService,
    private readonly orderRepository: MktOrderRepository,
  ) {
    super();
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Skip this step if:
   * - Action is NOT CONFIRM_ORDER
   * - Order already has a contract linked
   */
  shouldSkip(context: SagaContext, input: ConfirmOrderInput): boolean {
    const typedContext = context as ConfirmOrderSagaContext;

    // Only create contract when order is confirmed
    if (input.action !== ORDER_ACTION.CONFIRM_ORDER) {
      this.logger.debug(
        `Skipping: Action "${input.action}" does not trigger contract creation`,
      );

      return true;
    }

    // Skip if order already has a contract
    if (typedContext.currentOrder?.mktContractId) {
      this.logger.debug(
        `Skipping: Order ${typedContext.orderId} already has contract ${typedContext.currentOrder.mktContractId}`,
      );

      return true;
    }

    this.logger.debug(
      'Proceeding with contract creation for CONFIRM_ORDER action',
    );

    return false;
  }

  async execute(
    context: SagaContext,
    _input: ConfirmOrderInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateContractStepOutput>> {
    const typedContext = context as ConfirmOrderSagaContext;

    try {
      const order = typedContext.currentOrder;

      if (!order) {
        return {
          success: false,
          error: new Error('Order not found in context'),
        };
      }

      this.logger.log(`Creating contract for order: ${order.id}`);

      // Create contract for the order
      // Infer original order action from order properties:
      // - trialLicense === true → TRIAL_TO_PAID (converts trial to paid) → ORIGIN
      // - Otherwise → NEW_ORDER (default for new orders) → ORIGIN
      // Note: LICENSE_RENEWING and CHANGE_VARIANT orders are handled differently
      const inferredAction = order.trialLicense ? 'TRIAL_TO_PAID' : 'NEW_ORDER';

      const contract = await this.contractService.createContractForOrder(
        order,
        context.workspaceId,
        order.mktCustomerId ?? null,
        order.orderCode ?? null,
        inferredAction,
      );

      // Link contract to order
      await this.contractService.linkContractToOrder(contract.id, order.id);

      // Store rollback data
      context.rollbackData.set(this.name, {
        contractId: contract.id,
        orderId: order.id,
      });

      // Update context with contract info
      typedContext.contractId = contract.id;
      typedContext.contractNumber = contract.contractNumber ?? undefined;

      this.logger.log(
        `Successfully created contract ${contract.contractNumber} (${contract.id}) for order ${order.id}`,
      );

      return {
        success: true,
        data: {
          contractId: contract.id,
          contractNumber: contract.contractNumber ?? '',
        },
      };
    } catch (error) {
      this.logger.error('Failed to create contract on confirm', error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  async compensate(
    context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    const data = context.rollbackData.get(this.name) as {
      contractId?: string;
      orderId?: string;
    } | null;

    if (!data?.contractId || !data?.orderId) {
      this.logger.warn('No contract data to compensate');

      return;
    }

    try {
      this.logger.warn(
        `Compensating: Unlinking contract ${data.contractId} from order ${data.orderId}`,
      );

      // Unlink contract from order (set mktContractId to null)
      await this.orderRepository.update(data.orderId, {
        mktContractId: null,
      });

      // Note: We don't delete the contract - it remains for audit purposes
      // The contract can be manually deleted later if needed

      this.logger.log(
        `Contract ${data.contractId} unlinked from order ${data.orderId}`,
      );
    } catch (error) {
      this.logger.error('Failed to compensate contract creation', error);
      throw error;
    }
  }
}
