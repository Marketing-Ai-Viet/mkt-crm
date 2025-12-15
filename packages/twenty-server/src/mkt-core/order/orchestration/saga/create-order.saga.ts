import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_ORDER_EVENT_TYPES } from 'src/mkt-core/common/common.type';
import {
  CreateOrderWithItemsInput,
  CreateOrderResponse,
} from 'src/mkt-core/order/types';

import { SagaContext, SagaStep, SagaStepResult } from './order-saga.interface';

/**
 * CreateOrderSaga - Saga orchestrator for creating orders
 *
 * Quản lý việc tạo order với các steps theo thứ tự:
 * 1. CreateOrderStep - Tạo order entity
 * 2. CreateOrderItemsStep - Tạo order items từ variants
 * 3. CreateLicensesStep - Tạo licenses cho order items
 * 4. CreatePaymentStep - Tạo payment (nếu không phải TRIAL)
 * 5. FinalizeOrderStep - Finalize order status
 *
 * Nếu bất kỳ step nào fail, saga sẽ rollback tất cả steps đã thực thi
 * theo thứ tự ngược lại (compensate pattern)
 */
@Injectable()
export class CreateOrderSaga {
  private readonly logger = new Logger(CreateOrderSaga.name);
  private steps: SagaStep<CreateOrderWithItemsInput, unknown>[] = [];

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Đăng ký các steps cho saga
   * Được gọi từ module để inject các steps
   */
  registerSteps(steps: SagaStep<CreateOrderWithItemsInput, unknown>[]): void {
    this.steps = steps;
    this.logger.log(`Registered ${steps.length} saga steps`);
  }

  /**
   * Thực thi saga để tạo order
   */
  async execute(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: CreateOrderWithItemsInput,
  ): Promise<CreateOrderResponse> {
    // Get workspace-specific DataSource
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId,
      });

    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const context: SagaContext = {
      workspaceId,
      workspaceMemberId,
      rollbackData: new Map(),
      metadata: new Map(),
    };

    const executedSteps: SagaStep<CreateOrderWithItemsInput, unknown>[] = [];
    let lastResult: SagaStepResult = { success: true };

    try {
      for (const step of this.steps) {
        // Check if step should be skipped
        if (step.shouldSkip(context, input)) {
          this.logger.log(`Skipping step: ${step.name}`);
          continue;
        }

        this.logger.log(`Executing step: ${step.name}`);

        // Tạo savepoint trước mỗi step
        const savepointName = `sp_${step.name}_${Date.now()}`;

        await queryRunner.query(`SAVEPOINT "${savepointName}"`);

        lastResult = await step.execute(context, input, queryRunner);

        if (!lastResult.success) {
          this.logger.error(
            `Step ${step.name} failed: ${lastResult.error?.message}`,
          );
          // Rollback to savepoint
          await queryRunner.query(`ROLLBACK TO SAVEPOINT "${savepointName}"`);
          break;
        }

        executedSteps.push(step);
        this.logger.log(`Step ${step.name} completed successfully`);
      }

      if (lastResult.success) {
        await queryRunner.commitTransaction();
        this.logger.log('Saga completed successfully');

        // Emit event cho async tasks (email, history)
        this.emitOrderCreatedEvent(context);

        return {
          success: true,
          orderId: context.orderId,
          orderCode: context.orderCode,
          paymentQrCode: context.metadata.get('paymentQrCode') as
            | string
            | undefined,
        };
      }

      // Rollback theo thứ tự ngược
      await this.compensate(executedSteps, context, queryRunner);
      await queryRunner.rollbackTransaction();

      return {
        success: false,
        error: lastResult.error?.message ?? 'Saga execution failed',
      };
    } catch (error) {
      this.logger.error('Saga execution error', error);
      await this.compensate(executedSteps, context, queryRunner);
      await queryRunner.rollbackTransaction();

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Compensate các steps đã thực thi theo thứ tự ngược
   */
  private async compensate(
    executedSteps: SagaStep<CreateOrderWithItemsInput, unknown>[],
    context: SagaContext,
    queryRunner: QueryRunner,
  ): Promise<void> {
    this.logger.warn(`Compensating ${executedSteps.length} steps`);

    // Rollback theo thứ tự ngược
    for (const step of [...executedSteps].reverse()) {
      try {
        this.logger.log(`Compensating step: ${step.name}`);
        await step.compensate(context, queryRunner);
        this.logger.log(`Step ${step.name} compensated successfully`);
      } catch (compensateError) {
        this.logger.error(
          `Failed to compensate step ${step.name}`,
          compensateError,
        );
        // Continue compensating other steps even if one fails
      }
    }
  }

  /**
   * Emit event sau khi order được tạo thành công
   */
  private emitOrderCreatedEvent(context: SagaContext): void {
    if (!context.orderId) return;

    this.eventEmitter.emit(MKT_ORDER_EVENT_TYPES.ORDER_CREATED, {
      name: MKT_ORDER_EVENT_TYPES.ORDER_CREATED,
      workspaceId: context.workspaceId,
      events: [
        {
          eventType: MKT_ORDER_EVENT_TYPES.ORDER_CREATED,
          orderId: context.orderId,
          workspaceId: context.workspaceId,
          orderData: {
            id: context.orderId,
            status: context.metadata.get('orderStatus') as string,
            trialLicense: context.metadata.get('trialLicense') as boolean,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    this.logger.log(
      `Emitted ORDER_CREATED event for order: ${context.orderId}`,
    );
  }
}
