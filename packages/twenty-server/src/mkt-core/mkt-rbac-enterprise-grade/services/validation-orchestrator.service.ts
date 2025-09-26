/**
 * Validation Orchestrator Service
 * Central coordinator for 15-step permission validation process
 * Manages execution order, dependencies, and results aggregation
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  PermissionValidationOrchestrator,
  PermissionValidationStep,
  StepValidationResult,
  ValidationExecutionPlan,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import {
  EnhancedPermissionContext,
  EnhancedPermissionResult,
  ValidationStepResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  ENTERPRISE_RBAC_CONFIG,
  PERFORMANCE_THRESHOLDS,
  PermissionSource,
  VALIDATION_STEPS,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';

import { Step1PreValidationService } from './step1-pre-validation.service';
import { Step2UserContextResolutionService } from './step2-user-context-resolution.service';
import { Step3ResourceIdentificationService } from './step3-resource-identification.service';
import { Step4PermissionTemplateCheckService } from './step4-permission-template-check.service';
import { Step5ActionPermissionValidationService } from './step5-action-permission-validation.service';
import { Step6ResourcePermissionCheckService } from './step6-resource-permission-check.service';
import { PermissionTemplateService } from './permission-template.service';
// import { RbacCacheService } from './rbac-cache.service';
import { AuditLoggingService } from './audit-logging.service';

/**
 * Step execution metadata
 */
interface StepExecution {
  stepNumber: number;
  stepName: string;
  started: boolean;
  completed: boolean;
  skipped: boolean;
  result?: StepValidationResult;
  executionTime?: number;
  error?: Error;
  dependencies?: number[];
  parallel?: boolean;
}

/**
 * Validation session state
 */
interface ValidationSession {
  sessionId: string;
  context: EnhancedPermissionContext;
  startTime: Date;
  endTime?: Date;
  totalExecutionTime?: number;
  steps: Map<number, StepExecution>;
  currentStep?: number;
  finalResult?: EnhancedPermissionResult;
  errors: Error[];
  warnings: string[];
  performance: {
    cacheHits: number;
    cacheMisses: number;
    slowSteps: number[];
    parallelSteps: number;
  };
}

/**
 * Validation Orchestrator Service
 */
@Injectable()
export class ValidationOrchestratorService
  implements PermissionValidationOrchestrator
{
  private readonly logger = new Logger(ValidationOrchestratorService.name);

  // Registered validation steps
  private readonly steps = new Map<number, PermissionValidationStep>();
  private readonly activeSessions = new Map<string, ValidationSession>();

  constructor(
    private readonly preValidationService: Step1PreValidationService,
    private readonly userContextService: Step2UserContextResolutionService,
    private readonly resourceIdentificationService: Step3ResourceIdentificationService,
    private readonly permissionTemplateCheckService: Step4PermissionTemplateCheckService,
    private readonly actionPermissionValidationService: Step5ActionPermissionValidationService,
    private readonly resourcePermissionCheckService: Step6ResourcePermissionCheckService,
    private readonly permissionTemplateService: PermissionTemplateService,
    // private readonly cacheService: RbacCacheService,
    private readonly auditService: AuditLoggingService,
  ) {
    this.initializeSteps();
    this.logger.log('Validation Orchestrator Service initialized');
  }

  /**
   * Execute complete 15-step validation
   */
  async executeValidation(
    context: EnhancedPermissionContext,
  ): Promise<EnhancedPermissionResult> {
    const sessionId = this.generateSessionId();
    const session = this.createValidationSession(sessionId, context);

    try {
      this.logger.debug(`Starting 15-step validation session: ${sessionId}`);

      // Check cache first
      const cachedResult = await this.checkCache(context);

      if (cachedResult && !context.cacheContext?.forceRefresh) {
        return this.createCachedResult(cachedResult, session);
      }

      // Get execution plan
      const plan = await this.getExecutionPlan(context);

      // Execute validation steps according to plan
      const result = await this.executeStepsWithPlan(session, plan);

      // Cache result if successful
      if (
        result.result === CheckResult.PASS &&
        ENTERPRISE_RBAC_CONFIG.ENABLE_CACHING
      ) {
        await this.cacheResult(context, result);
      }

      // Complete session
      session.endTime = new Date();
      session.totalExecutionTime = Date.now() - session.startTime.getTime();
      session.finalResult = result;

      this.logger.debug(
        `Validation session completed: ${sessionId} - ${result.result === CheckResult.PASS ? 'ALLOWED' : 'DENIED'}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Validation session failed: ${sessionId} - ${error.message}`,
        error.stack,
      );
      session.errors.push(error);

      return this.createErrorResult(error, session);
    } finally {
      // Cleanup session after a delay
      setTimeout(() => {
        this.activeSessions.delete(sessionId);
      }, 300000); // 5 minutes
    }
  }

  /**
   * Execute specific validation steps only
   */
  async executeSteps(
    context: EnhancedPermissionContext,
    stepNumbers: number[],
  ): Promise<EnhancedPermissionResult> {
    const sessionId = this.generateSessionId();
    const session = this.createValidationSession(sessionId, context);

    try {
      this.logger.debug(`Executing specific steps: ${stepNumbers.join(', ')}`);

      // Validate step numbers
      const validSteps = stepNumbers.filter((num) => this.steps.has(num));

      if (validSteps.length === 0) {
        throw new Error('No valid steps provided');
      }

      // Execute steps in order
      for (const stepNumber of validSteps.sort((a, b) => a - b)) {
        const step = this.steps.get(stepNumber)!;

        await this.executeStep(session, step);
      }

      // Generate result based on executed steps
      const result = this.aggregateStepResults(session);

      session.finalResult = result;

      return result;
    } catch (error) {
      this.logger.error(
        `Specific steps execution failed: ${error.message}`,
        error.stack,
      );

      return this.createErrorResult(error, session);
    }
  }

  /**
   * Get execution plan for given context
   */
  async getExecutionPlan(
    context: EnhancedPermissionContext,
  ): Promise<ValidationExecutionPlan> {
    try {
      const steps: {
        stepNumber: number;
        stepName: string;
        estimatedTime: number;
        dependencies: number[];
        canRunInParallel: boolean;
      }[] = [];
      const executionGroups: number[][] = [];
      let totalEstimatedTime = 0;

      // Group steps by dependencies and parallel execution capability
      const parallelGroup1 = [VALIDATION_STEPS.PRE_VALIDATION];
      const parallelGroup2 = [
        VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
        VALIDATION_STEPS.RESOURCE_IDENTIFICATION,
      ];
      const parallelGroup3 = [
        VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK,
        VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION,
        VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK,
      ];
      const parallelGroup4 = [
        VALIDATION_STEPS.HIERARCHY_VALIDATION,
        VALIDATION_STEPS.DATA_ACCESS_POLICY_CHECK,
      ];
      const parallelGroup5 = [
        VALIDATION_STEPS.SPECIAL_PERMISSIONS,
        VALIDATION_STEPS.SENSITIVE_DATA_CHECKS,
        VALIDATION_STEPS.DEPARTMENT_RESTRICTIONS,
        VALIDATION_STEPS.DYNAMIC_CONDITIONS,
      ];
      const parallelGroup6 = [VALIDATION_STEPS.CACHE_PERFORMANCE];
      const parallelGroup7 = [VALIDATION_STEPS.AUDIT_LOGGING];
      const parallelGroup8 = [VALIDATION_STEPS.FINAL_DECISION];

      const groups = [
        parallelGroup1,
        parallelGroup2,
        parallelGroup3,
        parallelGroup4,
        parallelGroup5,
        parallelGroup6,
        parallelGroup7,
        parallelGroup8,
      ];

      // Build step details and groups
      for (const group of groups) {
        executionGroups.push(group);

        for (const stepNumber of group) {
          const step = this.steps.get(stepNumber);

          if (step) {
            const estimatedTime = step.getEstimatedExecutionTime(context);

            totalEstimatedTime += estimatedTime;

            steps.push({
              stepNumber,
              stepName: step.stepName,
              estimatedTime,
              dependencies: this.getStepDependencies(stepNumber),
              canRunInParallel: group.length > 1,
            });
          }
        }
      }

      const plan: ValidationExecutionPlan = {
        steps,
        executionGroups,
        totalEstimatedTime,
        optimizations: {
          cacheEnabled: ENTERPRISE_RBAC_CONFIG.ENABLE_CACHING,
          parallelExecution: ENTERPRISE_RBAC_CONFIG.ENABLE_PARALLEL_EXECUTION,
          earlyExit: ENTERPRISE_RBAC_CONFIG.ENABLE_EARLY_EXIT,
          skipOptional: false,
        },
      };

      this.logger.debug(
        `Generated execution plan with ${steps.length} steps, estimated time: ${totalEstimatedTime}ms`,
      );

      return plan;
    } catch (error) {
      this.logger.error(
        `Error creating execution plan: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Register a validation step
   */
  registerStep(step: PermissionValidationStep): void {
    if (this.steps.has(step.stepNumber)) {
      this.logger.warn(
        `Step ${step.stepNumber} already registered, overwriting`,
      );
    }

    this.steps.set(step.stepNumber, step);
    this.logger.debug(`Registered step ${step.stepNumber}: ${step.stepName}`);
  }

  /**
   * Unregister a validation step
   */
  unregisterStep(stepNumber: number): void {
    if (this.steps.has(stepNumber)) {
      this.steps.delete(stepNumber);
      this.logger.debug(`Unregistered step ${stepNumber}`);
    }
  }

  /**
   * Get all registered steps
   */
  getRegisteredSteps(): PermissionValidationStep[] {
    return Array.from(this.steps.values()).sort(
      (a, b) => a.stepNumber - b.stepNumber,
    );
  }

  /**
   * Execute steps according to execution plan
   */
  private async executeStepsWithPlan(
    session: ValidationSession,
    plan: ValidationExecutionPlan,
  ): Promise<EnhancedPermissionResult> {
    try {
      // Execute groups sequentially, steps within groups in parallel if enabled
      for (const group of plan.executionGroups) {
        if (plan.optimizations.parallelExecution && group.length > 1) {
          // Execute steps in parallel
          const promises = group.map((stepNumber) => {
            const step = this.steps.get(stepNumber);

            return step ? this.executeStep(session, step) : Promise.resolve();
          });

          await Promise.all(promises);
          session.performance.parallelSteps += group.length;
        } else {
          // Execute steps sequentially
          for (const stepNumber of group) {
            const step = this.steps.get(stepNumber);

            if (step) {
              const result = await this.executeStep(session, step);

              // Early exit if step fails and early exit is enabled
              if (
                plan.optimizations.earlyExit &&
                result &&
                result.result === 'FAIL' &&
                !result.continue
              ) {
                this.logger.debug(`Early exit triggered at step ${stepNumber}`);
                break;
              }
            }
          }
        }
      }

      // Aggregate all step results
      return this.aggregateStepResults(session);
    } catch (error) {
      this.logger.error(
        `Error executing steps with plan: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Execute a single validation step
   */
  private async executeStep(
    session: ValidationSession,
    step: PermissionValidationStep,
  ): Promise<StepValidationResult | null> {
    const execution: StepExecution = {
      stepNumber: step.stepNumber,
      stepName: step.stepName,
      started: false,
      completed: false,
      skipped: false,
      dependencies: this.getStepDependencies(step.stepNumber),
      parallel: false,
    };

    session.steps.set(step.stepNumber, execution);

    try {
      // Check if step should be executed
      if (!step.shouldExecute(session.context)) {
        execution.skipped = true;
        execution.result = {
          result: 'SKIP',
          reason: 'Step execution not required',
          continue: true,
          executionTime: 0,
        };

        return execution.result;
      }

      execution.started = true;
      session.currentStep = step.stepNumber;
      const startTime = Date.now();

      this.logger.debug(`Executing step ${step.stepNumber}: ${step.stepName}`);

      // Execute the step
      const result = await step.validate(session.context);

      execution.executionTime = Date.now() - startTime;
      execution.result = result;
      execution.completed = true;

      // Update context if step provides modifications
      if (result.modifyContext) {
        session.context = { ...session.context, ...result.modifyContext };
      }

      // Check performance thresholds
      if (execution.executionTime > PERFORMANCE_THRESHOLDS.STEP_WARNING_MS) {
        session.performance.slowSteps.push(step.stepNumber);
        this.logger.warn(
          `Step ${step.stepNumber} exceeded performance threshold: ${execution.executionTime}ms`,
        );
      }

      this.logger.debug(
        `Step ${step.stepNumber} completed: ${result.result} in ${execution.executionTime}ms`,
      );

      return result;
    } catch (error) {
      execution.error = error;
      execution.result = {
        result: 'ERROR',
        reason: `Step execution error: ${error.message}`,
        continue: false,
        executionTime:
          Date.now() - (execution.started ? Date.now() - 1000 : Date.now()),
        errors: [error.message],
      };

      session.errors.push(error);
      this.logger.error(
        `Step ${step.stepNumber} failed: ${error.message}`,
        error.stack,
      );

      return execution.result;
    }
  }

  /**
   * Aggregate results from all executed steps
   */
  private aggregateStepResults(
    session: ValidationSession,
  ): EnhancedPermissionResult {
    const stepResults: ValidationStepResult[] = [];
    let allowed = true;
    let confidence = 100;
    const reasons: string[] = [];
    const warningMessages: string[] = [];
    const errors: string[] = [];

    // Collect results from all steps
    for (const [stepNumber, execution] of session.steps.entries()) {
      if (execution.result) {
        const stepResult: ValidationStepResult = {
          step: stepNumber,
          name: execution.stepName,
          result:
            execution.result.result === 'ERROR'
              ? 'FAIL'
              : (execution.result.result as
                  | 'PASS'
                  | 'FAIL'
                  | 'SKIP'
                  | 'WARNING'),
          reason: execution.result.reason,
          duration: execution.executionTime || 0,
          details: execution.result.stepData as
            | Record<string, string | number | boolean | Date>
            | undefined,
        };

        stepResults.push(stepResult);

        // Aggregate decision logic
        if (
          execution.result.result === 'FAIL' ||
          execution.result.result === 'ERROR'
        ) {
          allowed = false;
          reasons.push(`Step ${stepNumber}: ${execution.result.reason}`);
        }

        if (execution.result.result === 'WARNING') {
          confidence -= 10;
          warningMessages.push(
            `Step ${stepNumber}: ${execution.result.reason}`,
          );
        }

        if (execution.result.errors) {
          errors.push(...execution.result.errors);
        }

        if (execution.result.warnings) {
          warningMessages.push(...execution.result.warnings);
        }
      }
    }

    // Build final result

    return {
      result: allowed ? CheckResult.PASS : CheckResult.FAIL,
      source: PermissionSource.PERMISSION_TEMPLATE,
      reason: allowed ? 'Permission granted' : reasons.join('; '),
      confidence: Math.max(0, confidence),

      // Validation details
      stepResults,

      warnings:
        warningMessages.length > 0
          ? warningMessages.map((w) => ({
              type: 'POLICY' as const,
              message: w,
              severity: 'MEDIUM' as const,
            }))
          : undefined,

      // Audit and monitoring
      auditRequired: true,
      monitoringLevel: this.determineMonitoringLevel(
        session.context,
        stepResults,
      ),

      metadata: {
        totalDuration:
          session.totalExecutionTime ||
          Date.now() - session.startTime.getTime(),
        stepCount: Array.from(session.steps.values()).filter((e) => e.completed)
          .length,
        cacheHit: false,
        cacheLevel: 'MEMORY',
        policiesApplied: this.extractAppliedPolicies(stepResults),
        templatesUsed: this.extractAppliedTemplates(stepResults),
        validationPath: 'ENTERPRISE_RBAC',
      },
    };
  }

  /**
   * Helper methods
   */
  private initializeSteps(): void {
    // Register available steps
    this.registerStep(this.preValidationService);
    this.registerStep(this.userContextService);
    this.registerStep(this.resourceIdentificationService);
    this.registerStep(this.permissionTemplateCheckService);
    this.registerStep(this.actionPermissionValidationService);
    this.registerStep(this.resourcePermissionCheckService);
    this.registerStep(this.auditService);

    this.logger.log(`Initialized ${this.steps.size} validation steps`);
  }

  private generateSessionId(): string {
    return `rbac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createValidationSession(
    sessionId: string,
    context: EnhancedPermissionContext,
  ): ValidationSession {
    const session: ValidationSession = {
      sessionId,
      context: { ...context },
      startTime: new Date(),
      steps: new Map(),
      errors: [],
      warnings: [],
      performance: {
        cacheHits: 0,
        cacheMisses: 0,
        slowSteps: [],
        parallelSteps: 0,
      },
    };

    this.activeSessions.set(sessionId, session);

    return session;
  }

  private async checkCache(
    context: EnhancedPermissionContext,
  ): Promise<EnhancedPermissionResult | null> {
    try {
      // const cacheKey = this.cacheService.generatePermissionKey(context);
      //
      // return await this.cacheService.getPermissionResult(cacheKey);
      return null;
    } catch (error) {
      this.logger.debug(`Cache check failed: ${error.message}`);

      return null;
    }
  }

  private async cacheResult(
    context: EnhancedPermissionContext,
    result: EnhancedPermissionResult,
  ): Promise<void> {
    try {
      // const cacheKey = this.cacheService.generatePermissionKey(context);
      //
      // await this.cacheService.cachePermissionResult(cacheKey, result);
    } catch (error) {
      this.logger.debug(`Failed to cache result: ${error.message}`);
    }
  }

  private createCachedResult(
    cachedResult: EnhancedPermissionResult,
    session: ValidationSession,
  ): EnhancedPermissionResult {
    session.performance.cacheHits++;

    return {
      ...cachedResult,
      // cacheHit: true, // Removed - not part of EnhancedPermissionResult interface
      // sessionId: session.sessionId, // Removed - not part of EnhancedPermissionResult interface
      // timestamp: new Date(), // Removed - not part of EnhancedPermissionResult interface
      // executionTime: 1, // Removed - not part of EnhancedPermissionResult interface
    };
  }

  private createErrorResult(
    error: Error,
    session: ValidationSession,
  ): EnhancedPermissionResult {
    return {
      result: CheckResult.FAIL,
      source: PermissionSource.PERMISSION_TEMPLATE,
      reason: `Validation error: ${error.message}`,
      confidence: 0,

      stepResults: [],

      warnings: [
        {
          type: 'SECURITY' as const,
          message: `Validation error: ${error.message}`,
          severity: 'HIGH' as const,
        },
      ],

      auditRequired: true,
      monitoringLevel: 'ENHANCED',

      metadata: {
        totalDuration: Date.now() - session.startTime.getTime(),
        stepCount: 0,
        cacheHit: false,
        cacheLevel: 'MEMORY',
        policiesApplied: [],
        templatesUsed: [],
        validationPath: 'ENTERPRISE_RBAC_ERROR',
      },
    };
  }

  private getStepDependencies(stepNumber: number): number[] {
    // Define step dependencies
    const dependencies: Record<number, number[]> = {
      [VALIDATION_STEPS.USER_CONTEXT_RESOLUTION]: [
        VALIDATION_STEPS.PRE_VALIDATION,
      ],
      [VALIDATION_STEPS.RESOURCE_IDENTIFICATION]: [
        VALIDATION_STEPS.PRE_VALIDATION,
      ],
      [VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK]: [
        VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
      ],
      [VALIDATION_STEPS.HIERARCHY_VALIDATION]: [
        VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
      ],
      [VALIDATION_STEPS.AUDIT_LOGGING]: [], // Can run independently
      [VALIDATION_STEPS.FINAL_DECISION]: [VALIDATION_STEPS.AUDIT_LOGGING],
    };

    return dependencies[stepNumber] || [];
  }

  private determineMonitoringLevel(
    context: EnhancedPermissionContext,
    stepResults: ValidationStepResult[],
  ): 'NONE' | 'BASIC' | 'ENHANCED' {
    if (stepResults.some((r) => r.result === 'FAIL')) {
      return 'ENHANCED';
    }

    if (context.resourceContext?.confidentialityLevel === 'TOP_SECRET') {
      return 'ENHANCED';
    }

    return 'BASIC';
  }

  private extractAppliedPolicies(
    stepResults: ValidationStepResult[],
  ): string[] {
    return stepResults
      .filter((r) => r.details?.appliedPolicies)
      .flatMap((r) => r.details?.appliedPolicies || [])
      .map((policy) =>
        typeof policy === 'string' ? policy : JSON.stringify(policy),
      );
  }

  private extractAppliedTemplates(
    stepResults: ValidationStepResult[],
  ): string[] {
    return stepResults
      .filter((r) => r.details?.appliedTemplates)
      .flatMap((r) => r.details?.appliedTemplates || [])
      .map((template) =>
        typeof template === 'string' ? template : JSON.stringify(template),
      );
  }

  /**
   * Get validation session status
   */
  getSessionStatus(sessionId: string): ValidationSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get validation statistics
   */
  getValidationStatistics(): {
    totalSessions: number;
    completedSessions: number;
    averageExecutionTime: number;
    successRate: number;
    cacheHitRate: number;
  } {
    const sessions = Array.from(this.activeSessions.values());

    return {
      totalSessions: sessions.length,
      completedSessions: sessions.filter((s) => s.finalResult).length,
      averageExecutionTime:
        sessions.reduce((sum, s) => sum + (s.totalExecutionTime || 0), 0) /
          sessions.length || 0,
      successRate:
        (sessions.filter((s) => s.finalResult?.result === CheckResult.PASS)
          .length /
          sessions.length) *
          100 || 0,
      cacheHitRate:
        (sessions.reduce((sum, s) => sum + s.performance.cacheHits, 0) /
          Math.max(
            1,
            sessions.reduce(
              (sum, s) =>
                sum + s.performance.cacheHits + s.performance.cacheMisses,
              0,
            ),
          )) *
        100,
    };
  }
}
