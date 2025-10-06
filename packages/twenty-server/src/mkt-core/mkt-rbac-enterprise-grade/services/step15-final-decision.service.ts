/**
 * Step 15: Final Decision Service
 * Final step in the 15-step Enterprise RBAC validation process
 * Aggregates results from all previous steps and makes the ultimate permission decision
 * Uses workspace entities only, no core module dependencies
 */

import { Injectable, Logger } from '@nestjs/common';

import { DateTime } from 'luxon';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import {
  EnhancedPermissionContext,
  EnhancedPermissionResult,
  ValidationStepResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  PermissionSource,
  VALIDATION_STEPS,
  STEP_PERFORMANCE_CONFIG,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  VALIDATION_STEP_DESCRIPTIONS,
  VALIDATION_STEP_NAMES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import {
  ConfidenceLevel,
  FinalDecision,
  STEP_WEIGHTS,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

/**
 * Decision rationale structure
 */
type DecisionRationale = {
  primaryReason: string;
  supportingReasons: string[];
  blockingReasons: string[];
  conditionalRequirements: string[];
  riskFactors: string[];
  complianceConsiderations: string[];
};

/**
 * Aggregated validation results
 */
type AggregatedResults = {
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  warningSteps: number;
  errorSteps: number;
  weightedScore: number;
  criticalFailures: ValidationStepResult[];
  highImpactWarnings: ValidationStepResult[];
  processingTime: number;
};

@Injectable()
export class Step15FinalDecisionService implements PermissionValidationStep {
  private readonly logger = new Logger(Step15FinalDecisionService.name);
  readonly stepNumber = VALIDATION_STEPS.FINAL_DECISION;
  readonly stepName = VALIDATION_STEP_NAMES[VALIDATION_STEPS.FINAL_DECISION];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.FINAL_DECISION];
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority = 100; // Highest priority as final step

  // Decision thresholds - Tuned for CRM business logic
  private readonly GRANT_THRESHOLD = 75; // Minimum score to grant (lowered for SIMPLIFIED mode)
  private readonly CONDITIONAL_THRESHOLD = 55; // Minimum for conditional grant
  private readonly HIGH_CONFIDENCE_THRESHOLD = 85; // High confidence level
  private readonly CRITICAL_FAILURE_THRESHOLD = 2; // Max critical failures allowed (stricter for CRM)

  // CRM-specific thresholds
  private readonly CUSTOMER_DATA_THRESHOLD = 80; // Higher bar for customer/contact data
  private readonly FINANCIAL_DATA_THRESHOLD = 85; // Highest bar for financial data
  private readonly BULK_OPERATION_THRESHOLD = 70; // Special threshold for bulk operations

  constructor() {}

  /**
   * Determine if step should execute (always true for final decision)
   */
  shouldExecute(_context: EnhancedPermissionContext): boolean {
    return true;
  }

  /**
   * Get estimated execution time for performance planning
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return (
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.FINAL_DECISION]
        ?.estimatedExecutionTime || 50
    );
  }

  /**
   * Main validation method - makes final permission decision
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step ${this.stepNumber}: Making final permission decision for user ${context.userContext?.id}`,
      );

      // Extract validation results from previous steps
      const stepResults = this.extractStepResults(context);

      if (stepResults.length === 0) {
        return {
          result: CheckResult.ERROR,
          continue: false,
          reason: 'No previous validation results found',
          executionTime: DateTime.now().diff(stepStartTime).toMillis(),
          metadata: { error: 'missing_step_results' },
        };
      }

      // Aggregate results from all previous steps
      const aggregatedResults = this.aggregateResults(stepResults);

      // Make final decision based on aggregated results
      const finalDecision = this.makeFinalDecision(aggregatedResults, context);

      // Calculate confidence level
      const confidence = this.calculateConfidence(
        aggregatedResults,
        finalDecision,
      );

      // Generate decision rationale
      const rationale = this.generateRationale(
        aggregatedResults,
        finalDecision,
        stepResults,
      );

      // Create enhanced permission result
      const enhancedResult = this.createEnhancedResult(
        finalDecision,
        confidence,
        rationale,
        aggregatedResults,
        stepResults,
        context,
      );

      const executionTime = DateTime.now().diff(stepStartTime).toMillis();

      this.logger.debug('Final decision completed', {
        userId: context.userContext?.id,
        decision: finalDecision,
        confidence,
        weightedScore: aggregatedResults.weightedScore,
        executionTime,
      });

      // Convert final decision to CheckResult
      const checkResult = this.mapDecisionToCheckResult(finalDecision);
      const shouldContinue = this.shouldContinueProcessing(finalDecision);

      return {
        result: checkResult,
        continue: shouldContinue,
        reason: rationale.primaryReason,
        executionTime,
        metadata: {
          finalDecision,
          confidence,
          weightedScore: aggregatedResults.weightedScore,
          totalSteps: aggregatedResults.totalSteps,
          passedSteps: aggregatedResults.passedSteps,
          failedSteps: aggregatedResults.failedSteps,
          criticalFailures: aggregatedResults.criticalFailures.length,
          processingTime: aggregatedResults.processingTime,
          enhancedResult: JSON.stringify(enhancedResult),
        },
      };
    } catch (error) {
      const executionTime = DateTime.now().diff(stepStartTime).toMillis();

      this.logger.error('Step 15 final decision failed', {
        error: error.message,
        workspaceId: context.userContext?.workspaceId,
        userId: context.userContext?.id,
        executionTime,
      });

      return {
        result: CheckResult.ERROR,
        continue: false,
        reason: `Final decision error: ${error.message}`,
        executionTime,
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Extract validation results from previous steps
   */
  private extractStepResults(
    context: EnhancedPermissionContext,
  ): ValidationStepResult[] {
    // First check direct stepResults property
    if (context.stepResults && Array.isArray(context.stepResults)) {
      return context.stepResults;
    }

    // Extract from context metadata as fallback
    const results: ValidationStepResult[] = [];

    if (context.metadata?.stepResults) {
      if (Array.isArray(context.metadata.stepResults)) {
        return context.metadata.stepResults as ValidationStepResult[];
      }
    }

    // If no step results in metadata, try to reconstruct from available data
    // This is a fallback in case step results weren't properly stored
    for (let step = 1; step <= 14; step++) {
      const stepKey = `step${step}Result`;

      if (context.metadata?.[stepKey]) {
        const stepData = context.metadata[stepKey];

        if (typeof stepData === 'string') {
          try {
            const parsed = JSON.parse(stepData);

            results.push({
              step,
              name: `Step ${step}`,
              result: parsed.result || 'SKIP',
              duration: parsed.duration || 0,
              reason: parsed.reason,
              details: parsed.details || {},
            });
          } catch {
            // Skip invalid step data
          }
        }
      }
    }

    return results;
  }

  /**
   * Aggregate results from all validation steps
   */
  private aggregateResults(
    stepResults: ValidationStepResult[],
  ): AggregatedResults {
    let totalScore = 0;
    let totalWeight = 0;
    let totalTime = 0;

    const criticalFailures: ValidationStepResult[] = [];
    const highImpactWarnings: ValidationStepResult[] = [];

    let passedSteps = 0;
    let failedSteps = 0;
    let skippedSteps = 0;
    let warningSteps = 0;
    let errorSteps = 0;

    for (const stepResult of stepResults) {
      const weight =
        (STEP_WEIGHTS as Record<number, number>)[stepResult.step] || 50;

      totalTime += stepResult.duration || 0;

      // Count step outcomes
      switch (stepResult.result) {
        case 'PASS':
          passedSteps++;
          totalScore += weight;
          break;
        case 'FAIL':
          failedSteps++;
          if (weight >= 70) {
            criticalFailures.push(stepResult);
          }
          break;
        case 'SKIP':
          skippedSteps++;
          // Skipped steps get partial credit
          totalScore += weight * 0.5;
          break;
        case 'WARNING':
          warningSteps++;
          totalScore += weight * 0.8;
          if (weight >= 70) {
            highImpactWarnings.push(stepResult);
          }
          break;
        default:
          errorSteps++;
          break;
      }

      totalWeight += weight;
    }

    const weightedScore =
      totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

    return {
      totalSteps: stepResults.length,
      passedSteps,
      failedSteps,
      skippedSteps,
      warningSteps,
      errorSteps,
      weightedScore,
      criticalFailures,
      highImpactWarnings,
      processingTime: totalTime,
    };
  }

  /**
   * Make final decision based on aggregated results
   * Enhanced for CRM business logic with data sensitivity and resource type awareness
   */
  private makeFinalDecision(
    aggregated: AggregatedResults,
    context: EnhancedPermissionContext,
  ): FinalDecision {
    // Critical failures block access entirely (stricter threshold for CRM: 2 vs 3)
    if (aggregated.criticalFailures.length >= this.CRITICAL_FAILURE_THRESHOLD) {
      return FinalDecision.DENY;
    }

    // Check for specific blocking conditions
    if (this.hasBlockingFailures(aggregated.criticalFailures)) {
      return FinalDecision.DENY;
    }

    // Error in processing
    if (aggregated.errorSteps > 0) {
      return FinalDecision.ERROR;
    }

    // CRM-SPECIFIC: Apply stricter thresholds for sensitive data types
    const requiredThreshold = this.getRequiredThreshold(context);

    // High score = grant access
    if (aggregated.weightedScore >= requiredThreshold) {
      // Check if any warnings require special attention
      if (aggregated.highImpactWarnings.length > 0) {
        return this.requiresApproval(context, aggregated)
          ? FinalDecision.REQUIRE_APPROVAL
          : FinalDecision.CONDITIONAL_GRANT;
      }

      // CRM-SPECIFIC: Bulk operations on customer data need approval even with high score
      if (this.isBulkCustomerOperation(context)) {
        return FinalDecision.REQUIRE_APPROVAL;
      }

      return FinalDecision.GRANT;
    }

    // Medium score = conditional grant or approval required
    if (aggregated.weightedScore >= this.CONDITIONAL_THRESHOLD) {
      return this.requiresApproval(context, aggregated)
        ? FinalDecision.REQUIRE_APPROVAL
        : FinalDecision.CONDITIONAL_GRANT;
    }

    // Low score = deny or escalate
    if (this.shouldEscalate(context, aggregated)) {
      return FinalDecision.ESCALATE;
    }

    return FinalDecision.DENY;
  }

  /**
   * CRM-SPECIFIC: Get required threshold based on resource type and data sensitivity
   */
  private getRequiredThreshold(context: EnhancedPermissionContext): number {
    const resourceType = context.resourceContext?.resourceType || '';

    // Financial data (invoices, payments, pricing)
    if (
      this.isFinancialResource(resourceType) ||
      context.resourceContext?.isFinancialData
    ) {
      return this.FINANCIAL_DATA_THRESHOLD;
    }

    // Customer/Contact/Company data (PII, personal info)
    if (this.isCustomerResource(resourceType)) {
      return this.CUSTOMER_DATA_THRESHOLD;
    }

    // Bulk operations
    if (this.isBulkOperation(context)) {
      return this.BULK_OPERATION_THRESHOLD;
    }

    // Default threshold
    return this.GRANT_THRESHOLD;
  }

  /**
   * CRM-SPECIFIC: Check if resource is financial data
   */
  private isFinancialResource(resourceType: string): boolean {
    const financialResources = [
      'INVOICE',
      'PAYMENT',
      'PRICING',
      'SUBSCRIPTION',
      'ORDER',
      'QUOTE',
      'FINANCIAL',
    ];

    return financialResources.some((type) =>
      resourceType.toUpperCase().includes(type),
    );
  }

  /**
   * CRM-SPECIFIC: Check if resource is customer-related (PII)
   */
  private isCustomerResource(resourceType: string): boolean {
    const customerResources = [
      'CUSTOMER',
      'CONTACT',
      'PERSON',
      'COMPANY',
      'LEAD',
      'ACCOUNT',
    ];

    return customerResources.some((type) =>
      resourceType.toUpperCase().includes(type),
    );
  }

  /**
   * CRM-SPECIFIC: Check if operation is bulk
   */
  private isBulkOperation(context: EnhancedPermissionContext): boolean {
    const bulkActions = [
      'BULK_CREATE',
      'BULK_UPDATE',
      'BULK_DELETE',
      'EXPORT',
      'IMPORT',
      'MASS_UPDATE',
    ];

    return bulkActions.includes(context.action);
  }

  /**
   * CRM-SPECIFIC: Check if bulk operation on customer data
   */
  private isBulkCustomerOperation(context: EnhancedPermissionContext): boolean {
    return (
      this.isBulkOperation(context) &&
      this.isCustomerResource(context.resourceContext?.resourceType || '')
    );
  }

  /**
   * Check if there are blocking failures
   */
  private hasBlockingFailures(
    criticalFailures: ValidationStepResult[],
  ): boolean {
    const blockingSteps = [
      VALIDATION_STEPS.PRE_VALIDATION,
      VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
      VALIDATION_STEPS.RESOURCE_IDENTIFICATION,
    ];

    return criticalFailures.some((failure) =>
      blockingSteps.includes(
        failure.step as typeof VALIDATION_STEPS.PRE_VALIDATION,
      ),
    );
  }

  /**
   * Determine if approval is required
   * CRM-SPECIFIC: Enhanced for customer data protection and compliance
   */
  private requiresApproval(
    context: EnhancedPermissionContext,
    aggregated: AggregatedResults,
  ): boolean {
    // CRM-SPECIFIC: High-risk actions (includes CRM-specific operations)
    const highRiskActions = [
      'DELETE',
      'BULK_DELETE',
      'EXPORT',
      'ADMIN_OVERRIDE',
      'BULK_UPDATE', // CRM: Mass updates to customer records
      'MASS_EMAIL', // CRM: Mass email campaigns
      'DATA_MERGE', // CRM: Merging customer records
      'GDPR_DELETE', // CRM: GDPR right to be forgotten
    ];
    const isSensitiveData = context.resourceContext?.isSensitive || false;
    const isHighRiskAction = highRiskActions.includes(context.action);

    // CRM-SPECIFIC: Financial data (invoices, payments) requires approval
    const isFinancialData =
      context.resourceContext?.isFinancialData ||
      this.isFinancialResource(context.resourceContext?.resourceType || '');

    // CRM-SPECIFIC: Customer PII requires approval for destructive operations
    const isCustomerPII =
      this.isCustomerResource(context.resourceContext?.resourceType || '') &&
      ['DELETE', 'EXPORT', 'BULK_DELETE', 'BULK_UPDATE'].includes(
        context.action,
      );

    // CRM-SPECIFIC: Cross-department access requires approval
    const isCrossDepartmentAccess =
      context.userContext?.departmentId &&
      context.resourceContext?.departmentId &&
      context.userContext.departmentId !== context.resourceContext.departmentId;

    // Multiple warnings suggest need for human review
    const hasMultipleWarnings = aggregated.warningSteps >= 2;

    // CRM-SPECIFIC: Any critical failures require approval (not just block)
    const hasCriticalConcerns =
      aggregated.criticalFailures.length > 0 &&
      aggregated.criticalFailures.length < this.CRITICAL_FAILURE_THRESHOLD;

    return (
      (isHighRiskAction && isSensitiveData) ||
      isFinancialData ||
      isCustomerPII ||
      isCrossDepartmentAccess ||
      hasMultipleWarnings ||
      hasCriticalConcerns
    );
  }

  /**
   * Determine if situation should be escalated
   */
  private shouldEscalate(
    context: EnhancedPermissionContext,
    aggregated: AggregatedResults,
  ): boolean {
    // Escalate if user has special permissions but validation failed
    const hasSpecialPermissions =
      context.specialPermissions?.hasEmergencyAccess ||
      context.specialPermissions?.hasSystemMaintenance ||
      context.specialPermissions?.hasAuditOverride;

    // Escalate for high-hierarchy users
    const isHighHierarchy = (context.userContext?.hierarchyLevel || 0) <= 3;

    // Escalate for system-critical operations
    const isSystemCritical =
      context.resourceContext?.resourceType === 'SYSTEM_CONFIG';

    return (
      hasSpecialPermissions ||
      (isHighHierarchy && aggregated.weightedScore >= 50) ||
      isSystemCritical
    );
  }

  /**
   * Calculate confidence level in the decision
   */
  private calculateConfidence(
    aggregated: AggregatedResults,
    decision: FinalDecision,
  ): ConfidenceLevel {
    let confidenceScore = 0;

    // Base confidence from weighted score
    confidenceScore += aggregated.weightedScore * 0.6;

    // Penalty for failures and warnings
    confidenceScore -= aggregated.failedSteps * 10;
    confidenceScore -= aggregated.warningSteps * 5;
    confidenceScore -= aggregated.errorSteps * 15;

    // Bonus for complete processing
    if (aggregated.totalSteps >= 14) {
      confidenceScore += 10;
    }

    // Decision-specific adjustments
    switch (decision) {
      case FinalDecision.GRANT:
        if (aggregated.weightedScore >= 90) confidenceScore += 10;
        break;
      case FinalDecision.DENY:
        if (aggregated.criticalFailures.length > 0) confidenceScore += 15;
        break;
      case FinalDecision.ERROR:
        confidenceScore = Math.min(confidenceScore, 30);
        break;
    }

    // Map to confidence levels
    if (confidenceScore >= 85) return ConfidenceLevel.VERY_HIGH;
    if (confidenceScore >= 70) return ConfidenceLevel.HIGH;
    if (confidenceScore >= 50) return ConfidenceLevel.MEDIUM;
    if (confidenceScore >= 30) return ConfidenceLevel.LOW;

    return ConfidenceLevel.VERY_LOW;
  }

  /**
   * Generate decision rationale
   */
  private generateRationale(
    aggregated: AggregatedResults,
    decision: FinalDecision,
    stepResults: ValidationStepResult[],
  ): DecisionRationale {
    const primaryReason = this.getPrimaryReason(decision, aggregated);
    const supportingReasons: string[] = [];
    const blockingReasons: string[] = [];
    const conditionalRequirements: string[] = [];
    const riskFactors: string[] = [];
    const complianceConsiderations: string[] = [];

    // Analyze step results for detailed rationale
    for (const step of stepResults) {
      switch (step.result) {
        case 'PASS':
          if ((STEP_WEIGHTS as Record<number, number>)[step.step] >= 70) {
            supportingReasons.push(
              `${step.name}: ${step.reason || 'Passed validation'}`,
            );
          }
          break;
        case 'FAIL':
          if ((STEP_WEIGHTS as Record<number, number>)[step.step] >= 70) {
            blockingReasons.push(
              `${step.name}: ${step.reason || 'Failed validation'}`,
            );
          }
          break;
        case 'WARNING':
          if (step.step === VALIDATION_STEPS.SENSITIVE_DATA_CHECKS) {
            complianceConsiderations.push(
              `${step.name}: ${step.reason || 'Compliance concern'}`,
            );
          } else {
            riskFactors.push(
              `${step.name}: ${step.reason || 'Warning detected'}`,
            );
          }
          break;
      }
    }

    // Add conditional requirements based on decision
    if (decision === FinalDecision.CONDITIONAL_GRANT) {
      conditionalRequirements.push('Enhanced monitoring required');
      if (aggregated.warningSteps > 0) {
        conditionalRequirements.push('Address warning conditions');
      }
    }

    if (decision === FinalDecision.REQUIRE_APPROVAL) {
      conditionalRequirements.push('Manager approval required');
      conditionalRequirements.push('Justification documentation required');
    }

    return {
      primaryReason,
      supportingReasons,
      blockingReasons,
      conditionalRequirements,
      riskFactors,
      complianceConsiderations,
    };
  }

  /**
   * Get primary reason for decision
   */
  private getPrimaryReason(
    decision: FinalDecision,
    aggregated: AggregatedResults,
  ): string {
    switch (decision) {
      case FinalDecision.GRANT:
        return `Access granted - passed ${aggregated.passedSteps}/${aggregated.totalSteps} validation steps (score: ${aggregated.weightedScore.toFixed(1)}%)`;
      case FinalDecision.DENY:
        return `Access denied - ${aggregated.failedSteps} validation failures including ${aggregated.criticalFailures.length} critical failures`;
      case FinalDecision.CONDITIONAL_GRANT:
        return `Conditional access granted - passed validation with ${aggregated.warningSteps} warnings requiring monitoring`;
      case FinalDecision.REQUIRE_APPROVAL:
        return `Approval required - access involves sensitive data or high-risk operations`;
      case FinalDecision.ESCALATE:
        return `Escalation required - special circumstances detected requiring senior review`;
      case FinalDecision.ERROR:
        return `Decision error - ${aggregated.errorSteps} processing errors encountered during validation`;
      default:
        return 'Unknown decision outcome';
    }
  }

  /**
   * Create enhanced permission result
   */
  private createEnhancedResult(
    decision: FinalDecision,
    confidence: ConfidenceLevel,
    rationale: DecisionRationale,
    aggregated: AggregatedResults,
    stepResults: ValidationStepResult[],
    context: EnhancedPermissionContext,
  ): EnhancedPermissionResult {
    const result: EnhancedPermissionResult = {
      result: this.mapDecisionToCheckResult(decision),
      source: this.determinePermissionSource(stepResults),
      reason: rationale.primaryReason,
      confidence: this.mapConfidenceToNumber(confidence),
      stepResults,
      metadata: {
        totalDuration: aggregated.processingTime,
        stepCount: aggregated.totalSteps,
        validationPath: stepResults.map((s) => s.name).join(' → '),
        cacheHit: false,
        cacheLevel: 'MEMORY',
        policiesApplied: [],
        templatesUsed: [],
      },
    };

    // Add approval info if required
    if (decision === FinalDecision.REQUIRE_APPROVAL) {
      result.approvalInfo = {
        required: true,
        estimatedDuration: 240, // 4 hours
        approvers: this.determineApprovers(context),
      };
    }

    // Add warnings and recommendations
    if (rationale.riskFactors.length > 0) {
      result.warnings = rationale.riskFactors.map((factor) => ({
        type: 'SECURITY',
        message: factor,
        severity: 'MEDIUM',
      }));
    }

    if (rationale.conditionalRequirements.length > 0) {
      result.recommendations = rationale.conditionalRequirements;
    }

    return result;
  }

  /**
   * Helper methods
   */
  private mapDecisionToCheckResult(decision: FinalDecision): CheckResult {
    switch (decision) {
      case FinalDecision.GRANT:
      case FinalDecision.CONDITIONAL_GRANT:
        return CheckResult.PASS;
      case FinalDecision.DENY:
        return CheckResult.FAIL;
      case FinalDecision.REQUIRE_APPROVAL:
      case FinalDecision.ESCALATE:
        return CheckResult.WARNING;
      case FinalDecision.ERROR:
        return CheckResult.ERROR;
      default:
        return CheckResult.ERROR;
    }
  }

  private shouldContinueProcessing(decision: FinalDecision): boolean {
    return decision !== FinalDecision.ERROR;
  }

  private determinePermissionSource(
    stepResults: ValidationStepResult[],
  ): PermissionSource {
    // Determine primary source based on which steps passed
    const passedSteps = stepResults.filter((s) => s.result === 'PASS');

    if (
      passedSteps.some(
        (s) => s.step === VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK,
      )
    ) {
      return PermissionSource.PERMISSION_TEMPLATE;
    }
    if (
      passedSteps.some((s) => s.step === VALIDATION_STEPS.HIERARCHY_VALIDATION)
    ) {
      return PermissionSource.HIERARCHY_INHERITANCE;
    }
    if (
      passedSteps.some((s) => s.step === VALIDATION_STEPS.SPECIAL_PERMISSIONS)
    ) {
      return PermissionSource.SPECIAL_OVERRIDE;
    }

    return PermissionSource.SYSTEM;
  }

  private mapConfidenceToNumber(confidence: ConfidenceLevel): number {
    switch (confidence) {
      case ConfidenceLevel.VERY_HIGH:
        return 95;
      case ConfidenceLevel.HIGH:
        return 80;
      case ConfidenceLevel.MEDIUM:
        return 60;
      case ConfidenceLevel.LOW:
        return 40;
      case ConfidenceLevel.VERY_LOW:
        return 20;
      default:
        return 50;
    }
  }

  private determineApprovers(context: EnhancedPermissionContext): string[] {
    const approvers: string[] = [];

    // Add manager if available
    if (context.userContext?.managerId) {
      approvers.push(context.userContext.managerId);
    }

    // Add department head for sensitive operations
    if (context.resourceContext?.isSensitive) {
      approvers.push('department_head');
    }

    return approvers.length > 0 ? approvers : ['system_admin'];
  }
}
