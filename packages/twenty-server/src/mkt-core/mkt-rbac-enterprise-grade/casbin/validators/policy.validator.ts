import { Injectable, Logger } from '@nestjs/common';

import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CASBIN_RESOURCES } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/casbin-resources.constant';
import { CASBIN_ACTIONS } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/casbin-actions.constant';
import { PolicyValidationResult } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/policy-sync.types';
import {
  CasbinPolicy,
  GroupingPolicy,
  CasbinPolicyType,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/casbin.types';

/**
 * Regex patterns cho validation
 */
const PATTERNS = {
  // Subject format: user:{uuid} hoặc role:{roleName}
  SUBJECT: /^(user|role):[a-zA-Z0-9-_]+$/,
  // Domain format: ws:{uuid}
  DOMAIN: /^ws:[a-f0-9-]{36}$/,
  // Object format: {resource} hoặc {resource}:{id}
  OBJECT: /^[a-zA-Z][a-zA-Z0-9_]*(:([a-f0-9-]{36}|\*))?$/,
  // UUID format
  UUID: /^[a-f0-9-]{36}$/,
} as const;

/**
 * Validation options
 */
type PolicyValidatorOptions = {
  // Workspace ID để validate domain
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
 * - Cross-tenant access prevention
 * - Privilege escalation detection
 * - Valid resource/action check
 * - Self-escalation prevention
 * - Format validation
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
   */
  validatePolicy(
    policy: CasbinPolicy,
    options: PolicyValidatorOptions,
  ): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const expectedDomain = `ws:${options.workspaceId}`;

    // 1. Validate subject format
    if (!PATTERNS.SUBJECT.test(policy.subject)) {
      errors.push(CASBIN_MESSAGES.ERROR.INVALID_SUBJECT_FORMAT(policy.subject));
    }

    // 2. Validate domain - CRITICAL for multi-tenancy
    if (policy.domain !== expectedDomain) {
      errors.push(
        `Cross-tenant policy rejected: expected ${expectedDomain}, got ${policy.domain}`,
      );
      this.logger.warn(
        CASBIN_MESSAGES.WARN.CROSS_TENANT_REJECTED(policy.domain),
      );
    }

    // 3. Validate domain format
    if (!PATTERNS.DOMAIN.test(policy.domain)) {
      errors.push(CASBIN_MESSAGES.ERROR.INVALID_DOMAIN_FORMAT(policy.domain));
    }

    // 4. Validate object (resource) format
    if (!PATTERNS.OBJECT.test(policy.object)) {
      errors.push(`Invalid object format: ${policy.object}`);
    }

    // 5. Validate resource exists (strict mode)
    if (options.strictMode) {
      const resourceBase = policy.object.split(':')[0];

      if (!this.validResources.has(resourceBase)) {
        warnings.push(`Unknown resource: ${resourceBase}`);
      }
    }

    // 6. Validate action
    if (!this.validActions.has(policy.action) && policy.action !== '*') {
      if (options.strictMode) {
        errors.push(`Unknown action: ${policy.action}`);
      } else {
        warnings.push(`Unknown action: ${policy.action}`);
      }
    }

    // 7. Validate effect
    if (!['allow', 'deny'].includes(policy.effect)) {
      errors.push(`Invalid effect: ${policy.effect}`);
    }

    // 8. Check self-escalation
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

    // 9. Check privilege escalation patterns
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
   */
  validateGroupingPolicy(
    policy: GroupingPolicy,
    options: PolicyValidatorOptions,
  ): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const expectedDomain = `ws:${options.workspaceId}`;

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

    // 3. Validate domain
    if (policy.domain !== expectedDomain) {
      errors.push(
        `Cross-tenant role assignment rejected: expected ${expectedDomain}, got ${policy.domain}`,
      );
    }

    // 4. Check self-escalation for role assignments
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
   * Format: [subject, domain, object, action, effect]
   */
  validatePolicyRule(
    ptype: CasbinPolicyType,
    rule: string[],
    options: PolicyValidatorOptions,
  ): PolicyValidationResult {
    if (ptype === 'p') {
      // Permission policy
      if (rule.length < 4) {
        return {
          valid: false,
          errors: ['Policy rule must have at least 4 values'],
        };
      }

      const policy: CasbinPolicy = {
        ptype: 'p',
        subject: rule[0],
        domain: rule[1],
        object: rule[2],
        action: rule[3],
        effect: (rule[4] as 'allow' | 'deny') ?? 'allow',
      };

      return this.validatePolicy(policy, options);
    }

    if (ptype === 'g') {
      // Grouping policy
      if (rule.length < 3) {
        return {
          valid: false,
          errors: ['Grouping rule must have at least 3 values'],
        };
      }

      const policy: GroupingPolicy = {
        ptype: 'g',
        subject: rule[0],
        role: rule[1],
        domain: rule[2],
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
   * Validate domain format
   */
  isValidDomain(domain: string): boolean {
    return PATTERNS.DOMAIN.test(domain);
  }

  /**
   * Extract workspace ID from domain
   */
  extractWorkspaceId(domain: string): string | null {
    if (!PATTERNS.DOMAIN.test(domain)) {
      return null;
    }

    return domain.substring(3); // Remove 'ws:'
  }
}
