/**
 * Permission Check Application Service
 *
 * Main entry point for permission checking operations.
 * This is an application-layer service that orchestrates domain services
 * and validation steps to provide a clean API for permission checks.
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  RBAC_LOG_CONTEXT,
  CheckResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';
import { CheckPermissionInput } from 'src/mkt-core/mkt-rbac-enterprise-grade/dto/inputs';
import {
  PermissionResultOutput,
  ValidationResultOutput,
  ValidationStepResultOutput,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/dto/outputs';
import {
  EnhancedPermissionContext,
  EnhancedPermissionResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/infrastructure/rbac-cache.service';
import { ValidationOrchestratorService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/validation-orchestrator.service';

/**
 * Permission Check Service
 *
 * Application-layer service that provides a clean interface for permission checking.
 * It handles:
 * - Input transformation to internal context
 * - Orchestrating validation through ValidationOrchestratorService
 * - Output transformation to GraphQL-friendly format
 * - Caching logic coordination
 */
@Injectable()
export class PermissionCheckService {
  private readonly logger = new Logger(RBAC_LOG_CONTEXT);

  constructor(
    private readonly validationOrchestrator: ValidationOrchestratorService,
    private readonly rbacCacheService: RbacCacheService,
  ) {
    this.logger.log('Permission Check Application Service initialized');
  }

  /**
   * Check if a user has permission for a specific action on a resource
   *
   * @param input - Permission check input
   * @returns Permission result output
   */
  async checkPermission(
    input: CheckPermissionInput,
  ): Promise<PermissionResultOutput> {
    this.logger.debug('Checking permission', {
      userId: input.userId,
      action: input.action,
      resourceType: input.resourceType,
    });

    const startTime = Date.now();

    try {
      // Build context from input
      const context = this.buildContext(input);

      // Check cache first
      const forceRefresh = input.context?.forceRefresh as boolean | undefined;
      const cachedResult = await this.rbacCacheService.getValidationResult(
        input.userId,
        input.action,
        input.resourceType,
      );

      if (cachedResult && !forceRefresh) {
        this.logger.debug('Permission check cache hit', {
          userId: input.userId,
        });

        return this.transformToOutput(cachedResult);
      }

      // Execute validation
      const result =
        await this.validationOrchestrator.executeValidation(context);

      // Cache result if granted
      if (result.result === CheckResult.PASS) {
        await this.rbacCacheService.setValidationResult(
          input.userId,
          input.action,
          input.resourceType,
          result,
        );
      }

      const duration = Date.now() - startTime;

      this.logger.debug('Permission check completed', {
        userId: input.userId,
        granted: result.result === CheckResult.PASS,
        duration,
      });

      return this.transformToOutput(result);
    } catch (error) {
      this.logger.error('Permission check failed', {
        userId: input.userId,
        error: error.message,
        stack: error.stack,
      });

      // Return denied on error for security
      return {
        granted: false,
        source: 'ERROR',
        reason: `Permission check failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate permission with detailed step results
   *
   * @param input - Permission check input
   * @returns Detailed validation result with all steps
   */
  async validateDetailed(
    input: CheckPermissionInput,
  ): Promise<ValidationResultOutput> {
    this.logger.debug('Performing detailed validation', {
      userId: input.userId,
      action: input.action,
      resourceType: input.resourceType,
    });

    const startTime = Date.now();

    try {
      // Build context from input with forced refresh
      const context = this.buildContextWithForceRefresh(input);

      // Execute validation
      const result =
        await this.validationOrchestrator.executeValidation(context);

      const totalExecutionTimeMs = Date.now() - startTime;
      const stepResults = result.stepResults || [];

      // Transform step results to output format
      const steps: ValidationStepResultOutput[] = stepResults.map((step) => ({
        stepNumber: step.step,
        stepName: step.name,
        result: step.result,
        passed: step.result === 'PASS',
        reason: step.reason,
        executionTimeMs: step.duration,
      }));

      // Calculate statistics
      const stepsExecuted = steps.length;
      const stepsPassed = steps.filter((s) => s.passed).length;
      const stepsFailed = steps.filter((s) => s.result === 'FAIL').length;
      const stepsSkipped = steps.filter((s) => s.result === 'SKIP').length;

      return {
        success: result.result === CheckResult.PASS,
        decision: result.result === CheckResult.PASS ? 'ALLOW' : 'DENY',
        steps,
        stepsExecuted,
        stepsPassed,
        stepsFailed,
        stepsSkipped,
        totalExecutionTimeMs,
        metadata: result.metadata as Record<string, unknown> | undefined,
      };
    } catch (error) {
      this.logger.error('Detailed validation failed', {
        userId: input.userId,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        decision: 'DENY',
        steps: [],
        stepsExecuted: 0,
        stepsPassed: 0,
        stepsFailed: 0,
        stepsSkipped: 0,
        totalExecutionTimeMs: Date.now() - startTime,
        metadata: { error: error.message },
        errors: [error.message],
      };
    }
  }

  /**
   * Check multiple permissions at once
   *
   * @param inputs - Array of permission check inputs
   * @returns Array of permission results
   */
  async checkMultiplePermissions(
    inputs: CheckPermissionInput[],
  ): Promise<PermissionResultOutput[]> {
    this.logger.debug(`Checking ${inputs.length} permissions`);

    const results = await Promise.all(
      inputs.map((input) => this.checkPermission(input)),
    );

    return results;
  }

  /**
   * Check if user has any of the specified permissions
   *
   * @param userId - User ID
   * @param permissions - Array of { action, resourceType } to check
   * @returns True if user has at least one permission
   */
  async hasAnyPermission(
    userId: string,
    permissions: Array<{ action: string; resourceType: string }>,
  ): Promise<boolean> {
    for (const perm of permissions) {
      const result = await this.checkPermission({
        userId,
        action: perm.action,
        resourceType: perm.resourceType,
      });

      if (result.granted) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has all of the specified permissions
   *
   * @param userId - User ID
   * @param permissions - Array of { action, resourceType } to check
   * @returns True if user has all permissions
   */
  async hasAllPermissions(
    userId: string,
    permissions: Array<{ action: string; resourceType: string }>,
  ): Promise<boolean> {
    for (const perm of permissions) {
      const result = await this.checkPermission({
        userId,
        action: perm.action,
        resourceType: perm.resourceType,
      });

      if (!result.granted) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clear permission cache
   */
  async clearCache(): Promise<void> {
    this.logger.log('Clearing RBAC permission cache');
    await this.rbacCacheService.invalidateAll();
    this.logger.log('RBAC permission cache cleared');
  }

  /**
   * Clear cache for specific user
   *
   * @param userId - User ID to clear cache for
   */
  async clearUserCache(userId: string): Promise<void> {
    this.logger.debug(`Clearing cache for user: ${userId}`);
    await this.rbacCacheService.invalidateByUser(userId);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Build EnhancedPermissionContext from CheckPermissionInput
   */
  private buildContext(input: CheckPermissionInput): EnhancedPermissionContext {
    return {
      action: input.action,
      userContext: {
        id: input.userId,
        workspaceMemberId: input.userId,
        workspaceId: '',
        disabled: false,
        hierarchyLevel: 0,
        isActive: true,
      },
      resourceContext: {
        objectName: input.resourceType,
        recordId: input.resourceId,
        resourceType: 'BUSINESS_DATA',
        resourceCategory: 'general',
      },
      additionalContext: input.context,
      cacheContext: {
        enabled: true,
        forceRefresh: false,
      },
    } as EnhancedPermissionContext;
  }

  /**
   * Build EnhancedPermissionContext with force refresh enabled
   */
  private buildContextWithForceRefresh(
    input: CheckPermissionInput,
  ): EnhancedPermissionContext {
    const context = this.buildContext(input);

    context.cacheContext = {
      enabled: true,
      forceRefresh: true,
    };

    return context;
  }

  /**
   * Transform internal result to GraphQL output
   */
  private transformToOutput(
    result: EnhancedPermissionResult,
  ): PermissionResultOutput {
    return {
      granted: result.result === CheckResult.PASS,
      source: result.source,
      reason: result.reason,
      requiredPermissions: undefined, // Can be added if needed
      metadata: result.metadata as Record<string, unknown> | undefined,
    };
  }
}
