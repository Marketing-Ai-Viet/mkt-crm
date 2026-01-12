import { Injectable, Logger } from '@nestjs/common';

import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CASBIN_RESOURCES } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/constants/resources.constant';
import { CASBIN_ACTIONS } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/constants/actions.constant';
import {
  PolicyValidationResult,
  CasbinPolicy,
  GroupingPolicy,
  CasbinPolicyType,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';

/**
 * Regex patterns cho validation
 */
const PATTERNS = {
  // Subject format: user:{uuid} hoặc role:{roleName}
  SUBJECT: /^(user|role):[a-zA-Z0-9-_]+$/,
  // Object format: {resource} hoặc {resource}:{id}
  OBJECT: /^[a-zA-Z][a-zA-Z0-9_]*(:([a-f0-9-]{36}|\*))?$/,
  // UUID format
  UUID: /^[a-f0-9-]{36}$/,
  // Condition format: valid JavaScript expression or empty
  CONDITION: /^[\w\s.,()[\]<>=!&|'"+\-*/]*$/,
} as const;

/**
 * Validation options
 *
 * Note: No domain validation - workspace isolation via schema
 */
type PolicyValidatorOptions = {
  // Workspace ID for context (not used for domain validation)
  workspaceId: string;
  // Strict mode - reject unknown resources/actions
  strictMode?: boolean;
  // User ID nếu cần validate self-escalation
  actingUserId?: string;
};

/**
 * Policy Validator cho Casbin
 *
 * Thực hiện validation:
 * - Privilege escalation detection
 * - Valid resource/action check
 * - Self-escalation prevention
 * - Format validation
 * - ABAC condition validation
 *
 * Note: No cross-tenant validation - workspace isolation via schema
 *
 * Security: Fail-closed pattern - reject if any check fails
 */
@Injectable()
export class PolicyValidator {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:PolicyValidator`);

  private readonly validResources: Set<string>;
  private readonly validActions: Set<string>;

  constructor() {
    // Build valid resources and actions sets
    this.validResources = new Set(Object.values(CASBIN_RESOURCES));
    this.validActions = new Set(Object.values(CASBIN_ACTIONS));
  }

  /**
   * Validate a permission policy (p type)
   *
   * Note: No domain validation - workspace isolation via schema
   */
  validatePolicy(
    policy: CasbinPolicy,
    options: PolicyValidatorOptions,
  ): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate subject format
    if (!PATTERNS.SUBJECT.test(policy.subject)) {
      errors.push(CASBIN_MESSAGES.ERROR.INVALID_SUBJECT_FORMAT(policy.subject));
    }

    // 2. Validate object (resource) format
    if (!PATTERNS.OBJECT.test(policy.object)) {
      errors.push(`Invalid object format: ${policy.object}`);
    }

    // 3. Validate resource exists (strict mode)
    if (options.strictMode) {
      const resourceBase = policy.object.split(':')[0];

      if (!this.validResources.has(resourceBase)) {
        warnings.push(`Unknown resource: ${resourceBase}`);
      }
    }

    // 4. Validate action
    if (!this.validActions.has(policy.action) && policy.action !== '*') {
      if (options.strictMode) {
        errors.push(`Unknown action: ${policy.action}`);
      } else {
        warnings.push(`Unknown action: ${policy.action}`);
      }
    }

    // 5. Validate effect
    if (!['allow', 'deny'].includes(policy.effect)) {
      errors.push(`Invalid effect: ${policy.effect}`);
    }

    // 6. Validate ABAC condition format (if present)
    if (policy.condition && !PATTERNS.CONDITION.test(policy.condition)) {
      errors.push(`Invalid condition format: ${policy.condition}`);
    }

    // 7. Check self-escalation
    if (options.actingUserId) {
      const selfEscalation = this.checkSelfEscalation(
        policy,
        options.actingUserId,
      );

      if (selfEscalation) {
        errors.push(selfEscalation);
        this.logger.warn(
          CASBIN_MESSAGES.WARN.SELF_ESCALATION_BLOCKED(options.actingUserId),
        );
      }
    }

    // 8. Check privilege escalation patterns
    const escalationCheck = this.checkPrivilegeEscalation(policy);

    if (escalationCheck) {
      warnings.push(escalationCheck);
      this.logger.warn(
        CASBIN_MESSAGES.WARN.ESCALATION_DETECTED(policy.subject),
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate a grouping policy (g type - role assignment)
   *
   * Note: No domain validation - workspace isolation via schema
   */
  validateGroupingPolicy(
    policy: GroupingPolicy,
    options: PolicyValidatorOptions,
  ): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate subject format
    if (!PATTERNS.SUBJECT.test(policy.subject)) {
      errors.push(CASBIN_MESSAGES.ERROR.INVALID_SUBJECT_FORMAT(policy.subject));
    }

    // 2. Validate role format
    if (!policy.role.startsWith('role:')) {
      errors.push(
        `Invalid role format: ${policy.role} (should start with role:)`,
      );
    }

    // 3. Check self-escalation for role assignments
    if (options.actingUserId) {
      if (policy.subject === `user:${options.actingUserId}`) {
        errors.push('Cannot assign roles to yourself');
        this.logger.warn(
          CASBIN_MESSAGES.WARN.SELF_ESCALATION_BLOCKED(options.actingUserId),
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate batch policies
   */
  validatePolicies(
    policies: CasbinPolicy[],
    options: PolicyValidatorOptions,
  ): PolicyValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const [index, policy] of policies.entries()) {
      const result = this.validatePolicy(policy, options);

      if (!result.valid) {
        allErrors.push(...result.errors.map((e) => `Policy[${index}]: ${e}`));
      }

      if (result.warnings) {
        allWarnings.push(
          ...result.warnings.map((w) => `Policy[${index}]: ${w}`),
        );
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    };
  }

  /**
   * Validate policy rule array (from Casbin)
   *
   * Format (no domain - workspace isolation via schema):
   * - p: [subject, object, action, effect, condition]
   * - g: [subject, role]
   * - g2: [resource, group]
   */
  validatePolicyRule(
    ptype: CasbinPolicyType,
    rule: string[],
    options: PolicyValidatorOptions,
  ): PolicyValidationResult {
    if (ptype === 'p') {
      // Permission policy: subject, object, action, effect, condition
      if (rule.length < 4) {
        return {
          valid: false,
          errors: [
            'Policy rule must have at least 4 values (subject, object, action, effect)',
          ],
        };
      }

      const policy: CasbinPolicy = {
        ptype: 'p',
        subject: rule[0],
        object: rule[1],
        action: rule[2],
        effect: (rule[3] as 'allow' | 'deny') ?? 'allow',
        condition: rule[4],
      };

      return this.validatePolicy(policy, options);
    }

    if (ptype === 'g') {
      // Grouping policy: subject, role
      if (rule.length < 2) {
        return {
          valid: false,
          errors: ['Grouping rule must have at least 2 values (subject, role)'],
        };
      }

      const policy: GroupingPolicy = {
        ptype: 'g',
        subject: rule[0],
        role: rule[1],
      };

      return this.validateGroupingPolicy(policy, options);
    }

    // g2 - resource grouping (less strict)
    if (ptype === 'g2') {
      if (rule.length < 2) {
        return {
          valid: false,
          errors: ['Resource grouping rule must have at least 2 values'],
        };
      }

      return { valid: true, errors: [] };
    }

    return {
      valid: false,
      errors: [`Unknown policy type: ${ptype}`],
    };
  }

  // ==================== Private Methods ====================

  /**
   * Check for self-escalation attempts
   */
  private checkSelfEscalation(
    policy: CasbinPolicy,
    actingUserId: string,
  ): string | null {
    const actorSubject = `user:${actingUserId}`;

    // Không cho phép tự cấp quyền cho mình
    if (policy.subject === actorSubject && policy.effect === 'allow') {
      // Check sensitive resources
      const sensitiveResources: string[] = [
        CASBIN_RESOURCES.RBAC_POLICY,
        CASBIN_RESOURCES.MKT_PERMISSION_TEMPLATE,
        CASBIN_RESOURCES.SYSTEM_CONFIG,
      ];

      const resourceBase = policy.object.split(':')[0];

      if (sensitiveResources.includes(resourceBase)) {
        return `Self-escalation blocked: cannot grant ${policy.action} on ${policy.object} to yourself`;
      }

      // Check admin actions
      if (['manage', 'configure', 'assign'].includes(policy.action)) {
        return `Self-escalation blocked: cannot grant admin action ${policy.action} to yourself`;
      }
    }

    return null;
  }

  /**
   * Check for potential privilege escalation patterns
   */
  private checkPrivilegeEscalation(policy: CasbinPolicy): string | null {
    // Wildcard policies cần review
    if (policy.object === '*' || policy.action === '*') {
      return 'Wildcard policy detected - review required';
    }

    // Full access to RBAC policies
    if (
      policy.object.startsWith(CASBIN_RESOURCES.RBAC_POLICY) &&
      policy.action === CASBIN_ACTIONS.MANAGE
    ) {
      return 'Full RBAC management access - high privilege';
    }

    // Full access to permission templates
    if (
      policy.object.startsWith(CASBIN_RESOURCES.MKT_PERMISSION_TEMPLATE) &&
      ['create', 'update', 'delete'].includes(policy.action)
    ) {
      return 'Permission template modification - review required';
    }

    return null;
  }

  /**
   * Validate UUID format
   */
  isValidUUID(value: string): boolean {
    return PATTERNS.UUID.test(value);
  }

  /**
   * Validate subject format
   */
  isValidSubject(subject: string): boolean {
    return PATTERNS.SUBJECT.test(subject);
  }

  /**
   * Validate ABAC condition format
   */
  isValidCondition(condition: string): boolean {
    if (!condition) {
      return true; // Empty condition is valid (pure RBAC)
    }

    return PATTERNS.CONDITION.test(condition);
  }
}
