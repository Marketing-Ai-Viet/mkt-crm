/**
 * Rule Engine Domain Service
 *
 * Core business logic for evaluating complex permission rules
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  CheckResult,
  PermissionAction,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  MktTemplateAccessLimitationRepository,
  MktPermissionPriorityConfigRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

export type RuleContext = {
  workspaceMemberId: string;
  action: PermissionAction;
  resourceKey: string;
  recordId?: string;
  templateIds: string[];
  departmentId?: string;
  hierarchyLevel?: number;
  currentTime?: Date;
  ipAddress?: string;
  userAgent?: string;
  workspaceId: string;
  metadata?: Record<string, unknown>;
};

export type RuleEvaluationResult = {
  isAllowed: boolean;
  checkResult: CheckResult;
  appliedRules: AppliedRule[];
  violations: RuleViolation[];
  effectivePriority: number;
};

export type AppliedRule = {
  ruleType: string;
  ruleName: string;
  result: CheckResult;
  priority: number;
};

export type RuleViolation = {
  ruleType: string;
  ruleName: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
};

export type LimitationValue = {
  startHour?: number;
  endHour?: number;
  allowedDays?: number[];
  maxSessionDuration?: number;
  allowedIps?: string[];
  deniedIps?: string[];
  [key: string]: unknown;
};

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    private readonly accessLimitationRepository: MktTemplateAccessLimitationRepository,
    private readonly priorityConfigRepository: MktPermissionPriorityConfigRepository,
  ) {}

  /**
   * Evaluate all rules for a given context
   */
  async evaluateRules(context: RuleContext): Promise<RuleEvaluationResult> {
    this.logger.debug(
      `Evaluating rules for ${context.workspaceMemberId} on ${context.resourceKey}`,
    );

    const appliedRules: AppliedRule[] = [];
    const violations: RuleViolation[] = [];

    // Step 1: Evaluate access limitations
    const limitationResult = await this.evaluateAccessLimitations(context);

    appliedRules.push(...limitationResult.appliedRules);
    violations.push(...limitationResult.violations);

    // Step 2: Calculate effective priority
    const effectivePriority = await this.calculateEffectivePriority(context);

    // Step 3: Determine final result
    const hasBlockingViolation = violations.some(
      (v) => v.severity === 'HIGH' || v.severity === 'CRITICAL',
    );

    const checkResult = hasBlockingViolation
      ? CheckResult.FAIL
      : violations.length > 0
        ? CheckResult.WARNING
        : CheckResult.PASS;

    return {
      isAllowed: !hasBlockingViolation,
      checkResult,
      appliedRules,
      violations,
      effectivePriority,
    };
  }

  /**
   * Evaluate access limitations (time-based, IP-based, etc.)
   */
  private async evaluateAccessLimitations(context: RuleContext): Promise<{
    appliedRules: AppliedRule[];
    violations: RuleViolation[];
  }> {
    const appliedRules: AppliedRule[] = [];
    const violations: RuleViolation[] = [];

    if (context.templateIds.length === 0) {
      return { appliedRules, violations };
    }

    // Get enforced limitations for user's templates
    const limitations =
      await this.accessLimitationRepository.findEnforcedByTemplateIds(
        context.templateIds,
        context.workspaceId,
      );

    const now = context.currentTime ?? new Date();

    for (const limitation of limitations) {
      const ruleResult = this.evaluateLimitation(limitation, context, now);

      appliedRules.push({
        ruleType: limitation.limitationType,
        ruleName: limitation.limitationKey,
        result: ruleResult.passed ? CheckResult.PASS : CheckResult.FAIL,
        priority: 0,
      });

      if (!ruleResult.passed) {
        violations.push({
          ruleType: limitation.limitationType,
          ruleName: limitation.limitationKey,
          reason: ruleResult.reason,
          severity: limitation.severity as
            | 'LOW'
            | 'MEDIUM'
            | 'HIGH'
            | 'CRITICAL',
        });
      }
    }

    return { appliedRules, violations };
  }

  /**
   * Evaluate a single limitation rule
   */
  private evaluateLimitation(
    limitation: {
      limitationType: string;
      limitationKey: string;
      limitationValue: object;
    },
    context: RuleContext,
    now: Date,
  ): { passed: boolean; reason: string } {
    const value = limitation.limitationValue as LimitationValue;

    switch (limitation.limitationType) {
      case 'TIME_BASED':
        return this.evaluateTimeLimitation(value, now);

      case 'IP_BASED':
        return this.evaluateIpLimitation(value, context.ipAddress);

      case 'SESSION_BASED':
        return this.evaluateSessionLimitation(value, context);

      default:
        return { passed: true, reason: '' };
    }
  }

  /**
   * Evaluate time-based limitations (working hours)
   */
  private evaluateTimeLimitation(
    value: LimitationValue,
    now: Date,
  ): { passed: boolean; reason: string } {
    const dateTime = DateTimeUtils.fromDate(now);

    // Check day of week
    if (value.allowedDays) {
      const dayOfWeek = dateTime.weekday; // 1-7 (Monday-Sunday)

      if (!value.allowedDays.includes(dayOfWeek)) {
        return {
          passed: false,
          reason: `Access not allowed on this day of week (${dayOfWeek})`,
        };
      }
    }

    // Check hour of day
    if (value.startHour !== undefined && value.endHour !== undefined) {
      const hour = dateTime.hour;

      if (hour < value.startHour || hour >= value.endHour) {
        return {
          passed: false,
          reason: `Access only allowed between ${value.startHour}:00 and ${value.endHour}:00`,
        };
      }
    }

    return { passed: true, reason: '' };
  }

  /**
   * Evaluate IP-based limitations
   */
  private evaluateIpLimitation(
    value: LimitationValue,
    ipAddress?: string,
  ): { passed: boolean; reason: string } {
    if (!ipAddress) {
      return { passed: true, reason: '' };
    }

    // Check denied IPs
    if (value.deniedIps?.includes(ipAddress)) {
      return {
        passed: false,
        reason: `IP address ${ipAddress} is denied`,
      };
    }

    // Check allowed IPs (if specified, only these are allowed)
    if (value.allowedIps && value.allowedIps.length > 0) {
      if (!value.allowedIps.includes(ipAddress)) {
        return {
          passed: false,
          reason: `IP address ${ipAddress} is not in allowed list`,
        };
      }
    }

    return { passed: true, reason: '' };
  }

  /**
   * Evaluate session-based limitations
   */
  private evaluateSessionLimitation(
    _value: LimitationValue,
    _context: RuleContext,
  ): { passed: boolean; reason: string } {
    // Session limitations would typically be checked at authentication level
    // This is a placeholder for session-related checks
    return { passed: true, reason: '' };
  }

  /**
   * Calculate effective priority for the permission decision
   */
  private async calculateEffectivePriority(
    context: RuleContext,
  ): Promise<number> {
    // Get priority configurations
    const configs = await this.priorityConfigRepository.findActive(
      context.workspaceId,
    );

    if (configs.length === 0) {
      return 100; // Default priority
    }

    let basePriority = 100;
    let totalBoost = 0;

    for (const config of configs) {
      // Apply base priority from highest matching config
      if (config.basePriority > basePriority) {
        basePriority = config.basePriority;
      }

      // Apply priority boosts
      if (config.priorityBoost) {
        totalBoost += config.priorityBoost;
      }
    }

    const effectivePriority = basePriority + totalBoost;

    // Apply min/max constraints
    const highestConfig = configs[0];
    const minPriority = highestConfig?.minPriority ?? 0;
    const maxPriority = highestConfig?.maxPriority ?? 1000;

    return Math.min(Math.max(effectivePriority, minPriority), maxPriority);
  }

  /**
   * Check if an action requires approval based on rules
   */
  async requiresApproval(context: RuleContext): Promise<boolean> {
    const limitations =
      await this.accessLimitationRepository.findEnforcedByTemplateIds(
        context.templateIds,
        context.workspaceId,
      );

    // Check for approval-required limitation type
    return limitations.some(
      (l) =>
        l.limitationType === 'APPROVAL_REQUIRED' ||
        (l.limitationValue as LimitationValue).requiresApproval === true,
    );
  }
}
