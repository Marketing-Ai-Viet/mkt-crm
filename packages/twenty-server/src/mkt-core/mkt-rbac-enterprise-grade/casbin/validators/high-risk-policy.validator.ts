import { Injectable, Logger } from '@nestjs/common';

import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CASBIN_RESOURCES } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/constants/resources.constant';
import { CASBIN_ACTIONS } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/constants/actions.constant';
import {
  CasbinPolicy,
  GroupingPolicy,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';

/**
 * Risk level for policy changes
 */
export type PolicyRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Risk pattern that was detected
 */
export type RiskPattern =
  | 'WILDCARD_ACTION'
  | 'WILDCARD_RESOURCE'
  | 'ROLE_GRANT'
  | 'ADMIN_ROLE'
  | 'RBAC_MANAGE'
  | 'PERMISSION_TEMPLATE_MODIFY'
  | 'BULK_POLICY_CHANGE'
  | 'CROSS_WORKSPACE';

/**
 * High-risk assessment result
 */
export type HighRiskAssessment = {
  isHighRisk: boolean;
  riskLevel: PolicyRiskLevel;
  detectedPatterns: RiskPattern[];
  requiredApprovals: number;
  warnings: string[];
  recommendations: string[];
};

/**
 * Risk pattern detector function type
 */
type RiskPatternDetector = (policy: CasbinPolicy | GroupingPolicy) => boolean;

/**
 * Risk pattern configuration
 */
type RiskPatternConfig = {
  pattern: RiskPattern;
  detector: RiskPatternDetector;
  riskLevel: PolicyRiskLevel;
  description: string;
};

/**
 * Approval requirements by risk level
 */
const APPROVAL_REQUIREMENTS: Record<PolicyRiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 1,
  CRITICAL: 2,
} as const;

/**
 * Sensitive resources that require extra scrutiny
 */
const SENSITIVE_RESOURCES = new Set<string>([
  CASBIN_RESOURCES.RBAC_POLICY,
  CASBIN_RESOURCES.MKT_PERMISSION_TEMPLATE,
  CASBIN_RESOURCES.SYSTEM_CONFIG,
  CASBIN_RESOURCES.WORKSPACE_MEMBER,
  CASBIN_RESOURCES.MKT_USER_TEMPLATE,
]);

/**
 * Admin-level actions
 */
const ADMIN_ACTIONS = new Set<string>([
  CASBIN_ACTIONS.MANAGE,
  CASBIN_ACTIONS.CONFIGURE,
  CASBIN_ACTIONS.ASSIGN,
]);

/**
 * High-Risk Policy Validator
 *
 * Detects high-risk policy changes that require approval workflow.
 *
 * Risk Patterns:
 * - WILDCARD_ACTION: Policy grants all actions (*)
 * - WILDCARD_RESOURCE: Policy grants access to all resources (*)
 * - ROLE_GRANT: Assigning roles to users (g-type policies)
 * - ADMIN_ROLE: Policies involving admin/superadmin roles
 * - RBAC_MANAGE: Full RBAC management access
 * - PERMISSION_TEMPLATE_MODIFY: Modifying permission templates
 * - BULK_POLICY_CHANGE: Large number of policies changed at once
 *
 * Risk Levels:
 * - LOW: No approval required
 * - MEDIUM: 1 approval required
 * - HIGH: 1 approval required + audit
 * - CRITICAL: 2 approvals required (dual-sign)
 */
@Injectable()
export class HighRiskPolicyValidator {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:HighRiskPolicyValidator`,
  );

  /**
   * Risk pattern configurations
   */
  private readonly riskPatterns: RiskPatternConfig[] = [
    {
      pattern: 'WILDCARD_ACTION',
      detector: (p) => this.isPPolicy(p) && p.action === '*',
      riskLevel: 'HIGH',
      description: 'Policy grants all actions (*)',
    },
    {
      pattern: 'WILDCARD_RESOURCE',
      detector: (p) => this.isPPolicy(p) && p.object === '*',
      riskLevel: 'CRITICAL',
      description: 'Policy grants access to all resources (*)',
    },
    {
      pattern: 'ROLE_GRANT',
      detector: (p) => this.isGPolicy(p),
      riskLevel: 'MEDIUM',
      description: 'Role assignment to user',
    },
    {
      pattern: 'ADMIN_ROLE',
      detector: (p) =>
        this.isGPolicy(p) &&
        (p.role.includes('admin') || p.role.includes('superadmin')),
      riskLevel: 'CRITICAL',
      description: 'Admin role assignment',
    },
    {
      pattern: 'RBAC_MANAGE',
      detector: (p) =>
        this.isPPolicy(p) &&
        p.object.startsWith(CASBIN_RESOURCES.RBAC_POLICY) &&
        p.action === CASBIN_ACTIONS.MANAGE,
      riskLevel: 'CRITICAL',
      description: 'Full RBAC management access',
    },
    {
      pattern: 'PERMISSION_TEMPLATE_MODIFY',
      detector: (p) =>
        this.isPPolicy(p) &&
        p.object.startsWith(CASBIN_RESOURCES.MKT_PERMISSION_TEMPLATE) &&
        ADMIN_ACTIONS.has(p.action),
      riskLevel: 'HIGH',
      description: 'Permission template modification',
    },
  ];

  /**
   * Assess risk level of a single policy
   */
  assessPolicy(policy: CasbinPolicy | GroupingPolicy): HighRiskAssessment {
    const detectedPatterns: RiskPattern[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let maxRiskLevel: PolicyRiskLevel = 'LOW';

    // Check all risk patterns
    for (const config of this.riskPatterns) {
      if (config.detector(policy)) {
        detectedPatterns.push(config.pattern);
        warnings.push(config.description);

        // Track highest risk level
        if (this.compareRiskLevel(config.riskLevel, maxRiskLevel) > 0) {
          maxRiskLevel = config.riskLevel;
        }
      }
    }

    // Check sensitive resources
    if (this.isPPolicy(policy) && this.isSensitiveResource(policy.object)) {
      warnings.push(`Involves sensitive resource: ${policy.object}`);
      if (this.compareRiskLevel('HIGH', maxRiskLevel) > 0) {
        maxRiskLevel = 'HIGH';
      }
    }

    // Generate recommendations
    if (detectedPatterns.length > 0) {
      recommendations.push(
        'Review policy carefully before approval',
        'Verify the requesting user has legitimate need',
        'Consider time-limiting the policy if temporary access is needed',
      );

      if (maxRiskLevel === 'CRITICAL') {
        recommendations.push(
          'Requires dual-sign approval from two authorized approvers',
          'Document business justification for audit trail',
        );
      }
    }

    const isHighRisk =
      detectedPatterns.length > 0 &&
      this.compareRiskLevel(maxRiskLevel, 'LOW') > 0;

    return {
      isHighRisk,
      riskLevel: maxRiskLevel,
      detectedPatterns,
      requiredApprovals: APPROVAL_REQUIREMENTS[maxRiskLevel],
      warnings,
      recommendations,
    };
  }

  /**
   * Assess risk level of multiple policies (batch change)
   */
  assessPolicies(
    policies: Array<CasbinPolicy | GroupingPolicy>,
  ): HighRiskAssessment {
    const allPatterns = new Set<RiskPattern>();
    const allWarnings: string[] = [];
    const allRecommendations = new Set<string>();
    let maxRiskLevel: PolicyRiskLevel = 'LOW';

    // Assess each policy
    for (const policy of policies) {
      const assessment = this.assessPolicy(policy);

      for (const pattern of assessment.detectedPatterns) {
        allPatterns.add(pattern);
      }

      allWarnings.push(...assessment.warnings);

      for (const rec of assessment.recommendations) {
        allRecommendations.add(rec);
      }

      if (this.compareRiskLevel(assessment.riskLevel, maxRiskLevel) > 0) {
        maxRiskLevel = assessment.riskLevel;
      }
    }

    // Check for bulk change pattern
    if (policies.length >= 10) {
      allPatterns.add('BULK_POLICY_CHANGE');
      allWarnings.push(`Bulk change: ${policies.length} policies affected`);

      if (this.compareRiskLevel('HIGH', maxRiskLevel) > 0) {
        maxRiskLevel = 'HIGH';
      }

      allRecommendations.add('Review bulk change impact carefully');
      allRecommendations.add('Consider splitting into smaller batches');
    }

    const isHighRisk =
      allPatterns.size > 0 && this.compareRiskLevel(maxRiskLevel, 'LOW') > 0;

    return {
      isHighRisk,
      riskLevel: maxRiskLevel,
      detectedPatterns: Array.from(allPatterns),
      requiredApprovals: APPROVAL_REQUIREMENTS[maxRiskLevel],
      warnings: allWarnings,
      recommendations: Array.from(allRecommendations),
    };
  }

  /**
   * Check if policy requires approval
   */
  requiresApproval(policy: CasbinPolicy | GroupingPolicy): boolean {
    const assessment = this.assessPolicy(policy);

    return assessment.requiredApprovals > 0;
  }

  /**
   * Get required number of approvals for a policy
   */
  getRequiredApprovals(policy: CasbinPolicy | GroupingPolicy): number {
    const assessment = this.assessPolicy(policy);

    return assessment.requiredApprovals;
  }

  /**
   * Validate that approver can approve this policy
   * Prevents self-approval and ensures approver has sufficient privilege
   */
  canApprove(
    policy: CasbinPolicy | GroupingPolicy,
    approverId: string,
    requesterId: string,
  ): { canApprove: boolean; reason?: string } {
    // Self-approval not allowed
    if (approverId === requesterId) {
      return {
        canApprove: false,
        reason: 'Self-approval is not allowed',
      };
    }

    // For critical policies, check if approver is being granted access
    if (this.isPPolicy(policy)) {
      const targetUserId = policy.subject.replace('user:', '');

      if (targetUserId === approverId) {
        return {
          canApprove: false,
          reason: 'Cannot approve policy that grants access to yourself',
        };
      }
    }

    // For role grants, check if approver is being granted the role
    if (this.isGPolicy(policy)) {
      const targetUserId = policy.subject.replace('user:', '');

      if (targetUserId === approverId) {
        return {
          canApprove: false,
          reason: 'Cannot approve role assignment to yourself',
        };
      }
    }

    return { canApprove: true };
  }

  // ==================== Private Methods ====================

  /**
   * Type guard for p-type policy
   */
  private isPPolicy(
    policy: CasbinPolicy | GroupingPolicy,
  ): policy is CasbinPolicy {
    return policy.ptype === 'p';
  }

  /**
   * Type guard for g-type policy
   */
  private isGPolicy(
    policy: CasbinPolicy | GroupingPolicy,
  ): policy is GroupingPolicy {
    return policy.ptype === 'g';
  }

  /**
   * Check if resource is sensitive
   */
  private isSensitiveResource(resource: string): boolean {
    const baseResource = resource.split(':')[0];

    return SENSITIVE_RESOURCES.has(baseResource);
  }

  /**
   * Compare risk levels
   * Returns positive if a > b, negative if a < b, 0 if equal
   */
  private compareRiskLevel(a: PolicyRiskLevel, b: PolicyRiskLevel): number {
    const order: Record<PolicyRiskLevel, number> = {
      LOW: 0,
      MEDIUM: 1,
      HIGH: 2,
      CRITICAL: 3,
    };

    return order[a] - order[b];
  }

  /**
   * Log high-risk policy assessment
   */
  logAssessment(
    policy: CasbinPolicy | GroupingPolicy,
    assessment: HighRiskAssessment,
    requesterId: string,
  ): void {
    if (assessment.isHighRisk) {
      this.logger.warn('High-risk policy detected', {
        ptype: policy.ptype,
        subject: this.isPPolicy(policy) ? policy.subject : policy.subject,
        riskLevel: assessment.riskLevel,
        patterns: assessment.detectedPatterns,
        requiredApprovals: assessment.requiredApprovals,
        requesterId,
      });
    }
  }
}
