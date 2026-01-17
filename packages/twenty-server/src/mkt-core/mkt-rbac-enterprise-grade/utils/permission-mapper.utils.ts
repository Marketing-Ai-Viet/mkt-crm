/**
 * Permission Mapper Utilities
 *
 * Functions for mapping between different permission data structures
 */

import {
  PermissionResultOutput,
  ValidationResultOutput,
  ValidationStepResultOutput,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/dto/outputs';

/**
 * Maps internal permission result to GraphQL output
 */
export const mapToPermissionResultOutput = (result: {
  granted: boolean;
  source: string;
  reason?: string;
  requiredPermissions?: string[];
  missingPermissions?: string[];
  metadata?: Record<string, unknown>;
  executionTimeMs?: number;
  fromCache?: boolean;
}): PermissionResultOutput => ({
  granted: result.granted,
  source: result.source,
  reason: result.reason,
  requiredPermissions: result.requiredPermissions,
  missingPermissions: result.missingPermissions,
  metadata: result.metadata,
  executionTimeMs: result.executionTimeMs,
  fromCache: result.fromCache,
});

/**
 * Maps step result to output format
 */
export const mapToValidationStepResultOutput = (step: {
  stepNumber: number;
  stepName: string;
  result: string;
  reason?: string;
  executionTime?: number;
  cacheHit?: boolean;
  stepData?: Record<string, unknown>;
}): ValidationStepResultOutput => ({
  stepNumber: step.stepNumber,
  stepName: step.stepName,
  result: step.result,
  passed: step.result === 'PASS' || step.result === 'SKIP',
  reason: step.reason,
  executionTimeMs: step.executionTime,
  cacheHit: step.cacheHit,
  stepData: step.stepData,
});

/**
 * Maps full validation result to output format
 */
export const mapToValidationResultOutput = (validation: {
  success: boolean;
  decision: string;
  steps: Array<{
    stepNumber: number;
    stepName: string;
    result: string;
    reason?: string;
    executionTime?: number;
    cacheHit?: boolean;
    stepData?: Record<string, unknown>;
  }>;
  totalExecutionTimeMs: number;
  metadata?: Record<string, unknown>;
  warnings?: string[];
  errors?: string[];
}): ValidationResultOutput => {
  const steps = validation.steps.map(mapToValidationStepResultOutput);
  const passed = steps.filter((s) => s.passed).length;
  const failed = steps.filter(
    (s) => s.result === 'FAIL' || s.result === 'ERROR',
  ).length;
  const skipped = steps.filter((s) => s.result === 'SKIP').length;

  return {
    success: validation.success,
    decision: validation.decision,
    steps,
    stepsExecuted: steps.length,
    stepsPassed: passed,
    stepsFailed: failed,
    stepsSkipped: skipped,
    totalExecutionTimeMs: validation.totalExecutionTimeMs,
    metadata: validation.metadata,
    warnings: validation.warnings,
    errors: validation.errors,
  };
};

/**
 * Creates a denied permission result
 */
export const createDeniedResult = (
  reason: string,
  missingPermissions?: string[],
): PermissionResultOutput => ({
  granted: false,
  source: 'VALIDATION',
  reason,
  missingPermissions,
});

/**
 * Creates a granted permission result
 */
export const createGrantedResult = (
  source: string,
  metadata?: Record<string, unknown>,
): PermissionResultOutput => ({
  granted: true,
  source,
  metadata,
});
