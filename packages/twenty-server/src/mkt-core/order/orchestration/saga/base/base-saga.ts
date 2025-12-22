import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  SAGA_CONFIG,
  SagaContext,
  SagaExecutionResult,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga';

/**
 * BaseSaga - Abstract base class for all order sagas
 *
 * Features:
 * - Unified step execution pattern
 * - Savepoint-based rollback
 * - Compensation with retry
 * - Event emission after commit
 * - Step timeout support
 *
 * Usage:
 * 1. Extend this class
 * 2. Implement abstract methods: buildSuccessResponse, emitSuccessEvent
 * 3. Register steps via registerSteps()
 * 4. Call execute() from resolver/service
 */
export abstract class BaseSaga<TInput, TOutput> {
  protected abstract readonly logger: Logger;
  protected abstract readonly sagaName: string;
  protected steps: SagaStep<TInput, unknown>[] = [];

  constructor(
    protected readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    protected readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Register steps for this saga
   * Called from module initialization
   */
  registerSteps(steps: SagaStep<TInput, unknown>[]): void {
    this.steps = steps;
    this.logger.log(
      `[${this.sagaName}] Registered ${steps.length} steps: ${steps.map((s) => s.name).join(', ')}`,
    );
  }

  /**
   * Execute the saga with all registered steps
   */
  async execute(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: TInput,
  ): Promise<SagaExecutionResult<TOutput>> {
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId,
      });

    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const context = this.createContext(workspaceId, workspaceMemberId);
    const executedSteps: SagaStep<TInput, unknown>[] = [];
    let lastResult: SagaStepResult = { success: true };

    try {
      for (const step of this.steps) {
        // Check skip condition
        if (step.shouldSkip(context, input)) {
          this.logger.log(`[${this.sagaName}] Skipping step: ${step.name}`);
          continue;
        }

        this.logger.log(`[${this.sagaName}] Executing step: ${step.name}`);

        // Create savepoint before each step
        const savepointName = `sp_${step.name}_${DateTimeUtils.toMillis(DateTimeUtils.now())}`;

        await queryRunner.query(`SAVEPOINT "${savepointName}"`);

        // Execute step with timeout
        lastResult = await this.executeStepWithTimeout(
          step,
          context,
          input,
          queryRunner,
        );

        if (!lastResult.success) {
          this.logger.error(
            `[${this.sagaName}] Step ${step.name} failed: ${lastResult.error?.message}`,
          );
          await queryRunner.query(`ROLLBACK TO SAVEPOINT "${savepointName}"`);
          break;
        }

        executedSteps.push(step);
        this.logger.log(`[${this.sagaName}] Step ${step.name} completed`);
      }

      if (lastResult.success) {
        await queryRunner.commitTransaction();
        this.logger.log(`[${this.sagaName}] Saga completed successfully`);

        // Emit event after commit
        this.emitSuccessEvent(context, input);

        return {
          success: true,
          data: this.buildSuccessResponse(context) as TOutput,
          executedSteps: executedSteps.map((s) => s.name),
        };
      }

      // Compensate and rollback
      await this.compensateWithRetry(executedSteps, context, queryRunner);
      await queryRunner.rollbackTransaction();

      return {
        success: false,
        error: lastResult.error?.message ?? 'Saga execution failed',
        failedStep: this.steps[executedSteps.length]?.name,
        executedSteps: executedSteps.map((s) => s.name),
      };
    } catch (error) {
      this.logger.error(`[${this.sagaName}] Saga error`, error);
      await this.compensateWithRetry(executedSteps, context, queryRunner);
      await queryRunner.rollbackTransaction();

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedSteps: executedSteps.map((s) => s.name),
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute step with timeout protection
   */
  private async executeStepWithTimeout(
    step: SagaStep<TInput, unknown>,
    context: SagaContext,
    input: TInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult> {
    const timeoutPromise = new Promise<SagaStepResult>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Step ${step.name} timeout after ${SAGA_CONFIG.STEP_TIMEOUT_MS}ms`,
            ),
          ),
        SAGA_CONFIG.STEP_TIMEOUT_MS,
      ),
    );

    try {
      return await Promise.race([
        step.execute(context, input, queryRunner),
        timeoutPromise,
      ]);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error('Step execution failed'),
      };
    }
  }

  /**
   * Compensate executed steps with retry mechanism
   * Uses exponential backoff for retries
   */
  private async compensateWithRetry(
    executedSteps: SagaStep<TInput, unknown>[],
    context: SagaContext,
    queryRunner: QueryRunner,
  ): Promise<void> {
    this.logger.warn(
      `[${this.sagaName}] Compensating ${executedSteps.length} steps`,
    );

    // Compensate in reverse order
    for (const step of [...executedSteps].reverse()) {
      let retries = 0;
      let success = false;

      while (retries < SAGA_CONFIG.MAX_COMPENSATE_RETRIES && !success) {
        try {
          this.logger.log(
            `[${this.sagaName}] Compensating: ${step.name} (attempt ${retries + 1})`,
          );
          await step.compensate(context, queryRunner);
          success = true;
          this.logger.log(`[${this.sagaName}] Compensated: ${step.name}`);
        } catch (error) {
          retries++;
          this.logger.error(
            `[${this.sagaName}] Compensate failed (attempt ${retries}): ${step.name}`,
            error,
          );

          if (retries < SAGA_CONFIG.MAX_COMPENSATE_RETRIES) {
            // Exponential backoff
            const delay =
              SAGA_CONFIG.COMPENSATE_RETRY_DELAY_MS * Math.pow(2, retries - 1);

            await this.delay(delay);
          }
        }
      }

      if (!success) {
        this.logger.error(
          `[${this.sagaName}] Compensate exhausted for: ${step.name}. Manual intervention may be required.`,
        );
        // TODO: Send alert to monitoring system
      }
    }
  }

  /**
   * Delay helper for exponential backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create initial context
   * Override in subclass for typed context
   */
  protected createContext(
    workspaceId: string,
    workspaceMemberId?: string,
  ): SagaContext {
    return {
      workspaceId,
      workspaceMemberId,
      rollbackData: new Map(),
      metadata: new Map(),
    };
  }

  /**
   * Build success response from context
   * Must be implemented by subclass
   */
  protected abstract buildSuccessResponse(context: SagaContext): unknown;

  /**
   * Emit success event after saga completion
   * Must be implemented by subclass
   */
  protected abstract emitSuccessEvent(
    context: SagaContext,
    input: TInput,
  ): void;
}
