/**
 * Pre-Validation Service (Step 1)
 * Handles basic authentication, context validation, workspace validation, and action validation
 */

import { Injectable, Logger } from '@nestjs/common';

import { DateTime } from 'luxon';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import { EnhancedPermissionContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  PermissionAction,
  VALIDATION_STEPS,
  INCOMPATIBLE_COMBINATIONS,
  STEP_PERFORMANCE_CONFIG,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  VALIDATION_STEP_DESCRIPTIONS,
  VALIDATION_STEP_NAMES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';

/**
 * Pre-Validation Service - Step 1 in the 15-step validation process
 */
@Injectable()
export class Step1PreValidationService implements PermissionValidationStep {
  private readonly logger = new Logger(Step1PreValidationService.name);

  // Step identification
  readonly stepNumber = VALIDATION_STEPS.PRE_VALIDATION;
  readonly stepName = VALIDATION_STEP_NAMES[VALIDATION_STEPS.PRE_VALIDATION];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.PRE_VALIDATION];

  // Step configuration
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.PRE_VALIDATION].priority;

  // Dependencies
  readonly dependsOn = undefined;
  readonly conflicts = undefined;

  // Performance settings - using centralized configuration
  readonly maxExecutionTime =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.PRE_VALIDATION].maxExecutionTime;
  readonly enableCaching =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.PRE_VALIDATION].enableCaching;
  readonly defaultMaxRequestAge =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.PRE_VALIDATION]
      .defaultMaxRequestAge;
  readonly retryAttempts =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.PRE_VALIDATION].retryAttempts;

  // Validation patterns
  readonly workspaceIdPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i; // UUIDv4 pattern

  // Action-Resource compatibility rules
  private readonly INCOMPATIBLE_COMBINATIONS = INCOMPATIBLE_COMBINATIONS;
  /**
   * Determine if this step should be executed based on context
   */
  shouldExecute(_context: EnhancedPermissionContext): boolean {
    // Pre-validation should always execute as it's the first step
    return true;
  }

  /**
   * Get estimated execution time for this step
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    // Using centralized configuration for estimated execution time
    return STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.PRE_VALIDATION]
      .estimatedExecutionTime;
  }

  /**
   * Execute Step 1: Pre-validation checks
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    this.logger.debug(
      `Starting Step 1: ${this.stepName} for user ${context.userContext.workspaceMemberId}`,
    );

    try {
      // 1. Basic Authentication Check
      const authResult = await this.validateAuthentication(context);

      if (authResult.result === CheckResult.FAIL) {
        return this.createFailResult(
          this.stepName,
          authResult.reason || 'Authentication failed',
          stepStartTime,
        );
      }

      // 2. Context Validation
      const contextResult = await this.validateContext(context);

      if (contextResult.result === CheckResult.FAIL) {
        return this.createFailResult(
          this.stepName,
          contextResult.reason || 'Context validation failed',
          stepStartTime,
        );
      }

      // 3. Workspace Validation
      const workspaceResult = await this.validateWorkspace(context);

      if (workspaceResult.result === CheckResult.FAIL) {
        return this.createFailResult(
          this.stepName,
          workspaceResult.reason || 'Workspace validation failed',
          stepStartTime,
        );
      }

      // 4. Action Validation
      const actionResult = await this.validateAction(context);

      if (actionResult.result === CheckResult.FAIL) {
        return this.createFailResult(
          this.stepName,
          actionResult.reason || 'Action validation failed',
          stepStartTime,
        );
      }

      // All checks passed
      this.logger.debug(`Step 1: ${this.stepName} completed successfully`);

      return {
        result: CheckResult.PASS,
        reason: 'Pre-validation checks passed',
        continue: true,
        executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        metadata: {
          authenticationValid: true,
          contextValid: true,
          workspaceValid: true,
          actionValid: true,
        },
      };
    } catch (error) {
      this.logger.error(
        `Step 1: ${this.stepName} error: ${error.message}`,
        error.stack,
      );

      return this.createFailResult(
        this.stepName,
        `Pre-validation error: ${error.message}`,
        stepStartTime,
      );
    }
  }

  /**
   * Validate basic authentication requirements
   */
  private async validateAuthentication(
    context: EnhancedPermissionContext,
  ): Promise<{ result: CheckResult; reason?: string }> {
    // Check if user context exists
    if (!context.userContext) {
      return {
        result: CheckResult.FAIL,
        reason: 'User context is missing',
      };
    }

    // Check if user is authenticated
    if (!context.userContext.workspaceMemberId) {
      return {
        result: CheckResult.FAIL,
        reason: 'User is not authenticated (missing workspace member ID)',
      };
    }

    // Check if user is active
    if (context.userContext.disabled) {
      return {
        result: CheckResult.FAIL,
        reason: 'User account is inactive',
      };
    }

    // Check for disabled user (redundant check from guard, but important for security)
    if (context.request?.user?.disabled === true) {
      return {
        result: CheckResult.FAIL,
        reason: 'User account is disabled',
      };
    }

    return { result: CheckResult.PASS };
  }

  /**
   * Validate request context completeness
   */
  private async validateContext(
    context: EnhancedPermissionContext,
  ): Promise<{ result: CheckResult; reason?: string }> {
    // Check if required context fields are present
    if (!context.requestId) {
      return {
        result: CheckResult.FAIL,
        reason: 'Request ID is missing',
      };
    }

    if (!context.startTime || context.startTime <= 0) {
      return {
        result: CheckResult.FAIL,
        reason: 'Request start time is invalid',
      };
    }

    // Check if request is too old (potential replay attack)
    const requestAge = Date.now() - context.startTime;

    if (requestAge > this.defaultMaxRequestAge) {
      return {
        result: CheckResult.FAIL,
        reason: 'Request is too old (potential replay attack)',
      };
    }

    // Validate resource context if present
    if (context.resourceContext) {
      if (!context.resourceContext.objectName) {
        return {
          result: CheckResult.FAIL,
          reason: 'Resource object name is missing',
        };
      }
    }

    return { result: CheckResult.PASS };
  }

  /**
   * Validate workspace access and permissions
   */
  private async validateWorkspace(
    context: EnhancedPermissionContext,
  ): Promise<{ result: CheckResult; reason?: string }> {
    // Check if workspace ID is present
    if (!context.userContext.workspaceId) {
      return {
        result: CheckResult.FAIL,
        reason: 'Workspace ID is missing',
      };
    }

    // Check if user belongs to the workspace
    if (!context.userContext.workspaceMemberId) {
      return {
        result: CheckResult.FAIL,
        reason: 'User is not a member of the workspace',
      };
    }

    // Basic workspace validation (more complex checks in later steps)
    if (!this.workspaceIdPattern.test(context.userContext.workspaceId)) {
      return {
        result: CheckResult.FAIL,
        reason: 'Workspace ID format is invalid',
      };
    }

    return { result: CheckResult.PASS };
  }

  /**
   * Validate the requested action
   */
  private async validateAction(
    context: EnhancedPermissionContext,
  ): Promise<{ result: CheckResult; reason?: string }> {
    // Check if action is specified
    if (!context.action) {
      return {
        result: CheckResult.FAIL,
        reason: 'Permission action is not specified',
      };
    }

    // Check if action is valid
    const validActions = Object.values(PermissionAction);

    if (!validActions.includes(context.action)) {
      return {
        result: CheckResult.FAIL,
        reason: `Invalid permission action: ${context.action}`,
      };
    }

    // Basic action-resource compatibility check
    // Uses RESOURCE_TYPES constants for type-safe resource validation
    if (context.resourceContext) {
      for (const combination of this.INCOMPATIBLE_COMBINATIONS) {
        if (
          context.resourceContext.resourceType === combination.resourceType &&
          combination.forbiddenActions.includes(context.action)
        ) {
          return {
            result: CheckResult.FAIL,
            reason: combination.reason,
          };
        }
      }
    }

    return { result: CheckResult.PASS };
  }

  /**
   * Create a failure result
   */
  private createFailResult(
    _stepName: string,
    reason: string,
    startTime: DateTime,
  ): StepValidationResult {
    return {
      result: CheckResult.FAIL,
      reason,
      continue: false, // Stop execution on pre-validation failure
      executionTime: DateTime.now().diff(startTime).as('milliseconds'),
    };
  }
}
