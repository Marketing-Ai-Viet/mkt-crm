/**
 * Policy Evaluation Domain Service
 *
 * Business logic for evaluating data access policies
 */

import { Injectable, Logger } from '@nestjs/common';

import { MktDataAccessPolicyRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import {
  PolicyType,
  EvaluationMode,
  ConflictResolution,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities/constants';
import {
  PolicyCondition,
  evaluateCondition,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/utils/policy-evaluator.utils';

export type PolicyEvaluationInput = {
  workspaceMemberId: string;
  objectName: string;
  recordId?: string;
  departmentId?: string;
  organizationLevelId?: string;
  workspaceId: string;
  context?: Record<string, unknown>;
};

export type PolicyEvaluationResult = {
  isAllowed: boolean;
  appliedPolicies: AppliedPolicy[];
  filterConditions: object[];
  evaluationMode: EvaluationMode;
  conflictResolution: ConflictResolution;
  denyReason?: string;
};

export type AppliedPolicy = {
  policyId: string;
  policyName: string;
  policyType: PolicyType;
  priority: number;
  isAllowed: boolean;
};

@Injectable()
export class PolicyEvaluationService {
  private readonly logger = new Logger(PolicyEvaluationService.name);

  constructor(
    private readonly dataAccessPolicyRepository: MktDataAccessPolicyRepository,
  ) {}

  /**
   * Evaluate data access policies for a user and object
   */
  async evaluatePolicies(
    input: PolicyEvaluationInput,
  ): Promise<PolicyEvaluationResult> {
    this.logger.debug(
      `Evaluating policies for ${input.workspaceMemberId} on ${input.objectName}`,
    );

    const {
      workspaceMemberId,
      objectName,
      departmentId,
      organizationLevelId,
      workspaceId,
      context,
    } = input;

    // Get applicable policies
    const policies =
      await this.dataAccessPolicyRepository.findForMemberAndObject(
        workspaceMemberId,
        objectName,
        departmentId,
        organizationLevelId,
        workspaceId,
      );

    if (policies.length === 0) {
      this.logger.debug(`No policies found for ${objectName}`);

      return {
        isAllowed: true, // Default allow if no policy restricts
        appliedPolicies: [],
        filterConditions: [],
        evaluationMode: EvaluationMode.BALANCED,
        conflictResolution: ConflictResolution.DENY_WINS,
      };
    }

    // Sort policies by priority (highest first)
    const sortedPolicies = [...policies].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );

    const appliedPolicies: AppliedPolicy[] = [];
    const filterConditions: object[] = [];
    let conflictResolution = ConflictResolution.DENY_WINS;
    let evaluationMode = EvaluationMode.BALANCED;

    // Evaluate each policy
    for (const policy of sortedPolicies) {
      const policyResult = await this.evaluatePolicy(policy, context);

      appliedPolicies.push({
        policyId: policy.id,
        policyName: policy.name,
        policyType: policy.policyType,
        priority: policy.priority ?? 0,
        isAllowed: policyResult.isAllowed,
      });

      if (policyResult.filterCondition) {
        filterConditions.push(policyResult.filterCondition);
      }

      // Use conflict resolution from highest priority policy
      if (appliedPolicies.length === 1) {
        conflictResolution = policy.conflictResolution;
        evaluationMode = policy.evaluationMode;
      }
    }

    // Resolve conflicts based on strategy
    const finalResult = this.resolveConflicts(
      appliedPolicies,
      conflictResolution,
    );

    return {
      isAllowed: finalResult.isAllowed,
      appliedPolicies,
      filterConditions,
      evaluationMode,
      conflictResolution,
      denyReason: finalResult.denyReason,
    };
  }

  /**
   * Evaluate a single policy
   */
  private async evaluatePolicy(
    policy: MktDataAccessPolicyWorkspaceEntity,
    context?: Record<string, unknown>,
  ): Promise<{
    isAllowed: boolean;
    filterCondition?: object;
  }> {
    // If no filter conditions, policy allows by default
    if (!policy.filterConditions) {
      return { isAllowed: true };
    }

    const filterConditions = policy.filterConditions as PolicyCondition;

    // Evaluate filter conditions
    const isAllowed = evaluateCondition(filterConditions, context ?? {});

    return {
      isAllowed,
      filterCondition: policy.filterConditions,
    };
  }

  /**
   * Resolve conflicts between multiple policy results
   */
  private resolveConflicts(
    appliedPolicies: AppliedPolicy[],
    strategy: ConflictResolution,
  ): { isAllowed: boolean; denyReason?: string } {
    if (appliedPolicies.length === 0) {
      return { isAllowed: true };
    }

    const allowCount = appliedPolicies.filter((p) => p.isAllowed).length;
    const denyCount = appliedPolicies.length - allowCount;

    switch (strategy) {
      case ConflictResolution.DENY_WINS: {
        if (denyCount > 0) {
          const denyingPolicy = appliedPolicies.find((p) => !p.isAllowed);

          return {
            isAllowed: false,
            denyReason: `Policy "${denyingPolicy?.policyName}" denied access`,
          };
        }

        return { isAllowed: true };
      }

      case ConflictResolution.ALLOW_WINS: {
        if (allowCount > 0) {
          return { isAllowed: true };
        }

        return {
          isAllowed: false,
          denyReason: 'All policies denied access',
        };
      }

      case ConflictResolution.HIGHEST_PRIORITY: {
        // Policies are already sorted by priority
        const highestPriorityPolicy = appliedPolicies[0];

        return {
          isAllowed: highestPriorityPolicy.isAllowed,
          denyReason: highestPriorityPolicy.isAllowed
            ? undefined
            : `Highest priority policy "${highestPriorityPolicy.policyName}" denied access`,
        };
      }

      default:
        return {
          isAllowed: false,
          denyReason: 'Unknown conflict resolution strategy',
        };
    }
  }

  /**
   * Get aggregated filter conditions for a user and object
   */
  async getFilterConditions(
    workspaceMemberId: string,
    objectName: string,
    departmentId?: string,
    organizationLevelId?: string,
    workspaceId?: string,
  ): Promise<object[]> {
    const policies =
      await this.dataAccessPolicyRepository.findForMemberAndObject(
        workspaceMemberId,
        objectName,
        departmentId,
        organizationLevelId,
        workspaceId,
      );

    return policies
      .filter((p) => p.filterConditions && p.isActive)
      .map((p) => p.filterConditions);
  }

  /**
   * Check if a specific record passes policy filters
   */
  async checkRecordAccess(
    input: PolicyEvaluationInput,
    record: Record<string, unknown>,
  ): Promise<boolean> {
    const result = await this.evaluatePolicies(input);

    if (!result.isAllowed) {
      return false;
    }

    // If there are filter conditions, check if record matches
    if (result.filterConditions.length > 0) {
      return result.filterConditions.every((condition) =>
        evaluateCondition(condition as PolicyCondition, record),
      );
    }

    return true;
  }
}
