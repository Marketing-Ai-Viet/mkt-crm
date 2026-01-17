import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { RBAC_EVENTS } from 'src/mkt-core/mkt-rbac-enterprise-grade/events/rbac.events';
import {
  AuditQueryOptions,
  CasbinPolicy,
  ChangeRequestResult,
  CreateChangeRequestInput,
  GroupingPolicy,
  PolicyAuditEntry,
  ProcessApprovalInput,
  ProcessApprovalResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';
import {
  MktPolicyChangeRequestWorkspaceEntity,
  POLICY_CHANGE_REQUEST_STATUS,
  POLICY_CHANGE_TYPE,
  PolicyChangeType,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-change-request.workspace-entity';
import { APPROVAL_DECISION } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-approval.workspace-entity';
import { HighRiskPolicyValidator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/validators/high-risk-policy.validator';
import { WorkspaceCasbinRuleRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/workspace-casbin-rule.repository';
import { PolicyChangeRequestRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/policy-change-request.repository';
import { PolicyApprovalRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/policy-approval.repository';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';

/**
 * Policy Approval Service
 *
 * Manages high-risk policy change approval workflow.
 *
 * Features:
 * - Creates change requests for high-risk policies
 * - Processes approvals with dual-sign support
 * - Applies policies when fully approved
 * - Provides audit trail for SOC2 compliance
 *
 * Workflow:
 * 1. User submits policy change
 * 2. HighRiskPolicyValidator assesses risk
 * 3. If high-risk, create change request
 * 4. Approvers review and approve/reject
 * 5. When required approvals met, apply policy
 */
@Injectable()
export class PolicyApprovalService {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:PolicyApprovalService`,
  );

  constructor(
    private readonly changeRequestRepository: PolicyChangeRequestRepository,
    private readonly approvalRepository: PolicyApprovalRepository,
    private readonly highRiskValidator: HighRiskPolicyValidator,
    private readonly casbinRuleRepository: WorkspaceCasbinRuleRepository,
    private readonly enforcerService: CasbinEnforcerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a change request for a policy
   *
   * If policy is low-risk, it's applied immediately.
   * If high-risk, a change request is created requiring approval.
   */
  async createChangeRequest(
    input: CreateChangeRequestInput,
  ): Promise<ChangeRequestResult> {
    const { policy, changeType, requesterId, requestReason } = input;

    // Assess risk
    const riskAssessment = this.highRiskValidator.assessPolicy(policy);

    // Log assessment
    this.highRiskValidator.logAssessment(policy, riskAssessment, requesterId);

    // If low-risk and no approvals required, apply immediately
    if (!riskAssessment.isHighRisk && riskAssessment.requiredApprovals === 0) {
      await this.applyPolicyDirect(policy, changeType);

      return {
        id: '',
        status: POLICY_CHANGE_REQUEST_STATUS.APPLIED,
        riskAssessment,
        requiresApproval: false,
        requiredApprovals: 0,
      };
    }

    // Create change request using repository
    const saved = await this.changeRequestRepository.create({
      status: POLICY_CHANGE_REQUEST_STATUS.PENDING,
      changeType,
      policyData: policy,
      riskAssessment,
      requiredApprovals: riskAssessment.requiredApprovals,
      currentApprovals: 0,
      requestReason: requestReason ?? null,
      requestedById: requesterId,
    });

    this.logger.log(
      `Created change request ${saved.id} for ${changeType} policy, risk: ${riskAssessment.riskLevel}`,
    );

    // Emit event
    this.eventEmitter.emit(RBAC_EVENTS.POLICY_CHANGE_REQUESTED, {
      changeRequestId: saved.id,
      changeType,
      riskLevel: riskAssessment.riskLevel,
      requesterId,
      timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
    });

    return {
      id: saved.id,
      status: POLICY_CHANGE_REQUEST_STATUS.PENDING,
      riskAssessment,
      requiresApproval: true,
      requiredApprovals: riskAssessment.requiredApprovals,
    };
  }

  /**
   * Process an approval for a change request
   */
  async processApproval(
    input: ProcessApprovalInput,
  ): Promise<ProcessApprovalResult> {
    const { changeRequestId, approverId, decision, reason } = input;

    // Get change request with approvals
    const changeRequest =
      await this.changeRequestRepository.findByIdWithApprovals(changeRequestId);

    if (!changeRequest) {
      return {
        success: false,
        message: 'Change request not found',
      };
    }

    // Verify status is PENDING
    if (changeRequest.status !== POLICY_CHANGE_REQUEST_STATUS.PENDING) {
      return {
        success: false,
        message: `Change request is not pending (status: ${changeRequest.status})`,
      };
    }

    // Get policy from change request
    const policy = changeRequest.policyData as CasbinPolicy | GroupingPolicy;

    // Validate approver can approve
    const canApproveResult = this.highRiskValidator.canApprove(
      policy,
      approverId,
      changeRequest.requestedById,
    );

    if (!canApproveResult.canApprove) {
      return {
        success: false,
        message: canApproveResult.reason ?? 'Cannot approve',
      };
    }

    // Check for duplicate approval using repository
    const hasSubmitted = await this.approvalRepository.hasApproverSubmitted(
      changeRequestId,
      approverId,
    );

    if (hasSubmitted) {
      return {
        success: false,
        message: 'You have already submitted an approval for this request',
      };
    }

    // Create approval record using repository
    await this.approvalRepository.create({
      decision,
      reason: reason ?? null,
      changeRequestId,
      approverId,
    });

    // Update change request based on decision
    if (decision === APPROVAL_DECISION.REJECTED) {
      // One rejection = request rejected
      await this.changeRequestRepository.updateStatus(
        changeRequestId,
        POLICY_CHANGE_REQUEST_STATUS.REJECTED,
      );

      this.logger.log(
        `Change request ${changeRequestId} rejected by ${approverId}`,
      );

      // Emit event
      this.eventEmitter.emit(RBAC_EVENTS.POLICY_CHANGE_REJECTED, {
        changeRequestId,
        approverId,
        reason,
        timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
      });

      return {
        success: true,
        message: 'Change request rejected',
        changeRequest: {
          id: changeRequest.id,
          status: POLICY_CHANGE_REQUEST_STATUS.REJECTED,
          currentApprovals: changeRequest.currentApprovals,
          requiredApprovals: changeRequest.requiredApprovals,
        },
        policyApplied: false,
      };
    }

    // Approval - increment count
    const newApprovalCount = changeRequest.currentApprovals + 1;

    // Check if enough approvals
    if (newApprovalCount >= changeRequest.requiredApprovals) {
      // Apply the policy
      await this.applyPolicy(changeRequest);

      await this.changeRequestRepository.updateStatusAndApprovalCount(
        changeRequestId,
        POLICY_CHANGE_REQUEST_STATUS.APPLIED,
        newApprovalCount,
      );

      this.logger.log(
        `Change request ${changeRequestId} fully approved and applied`,
      );

      // Emit event
      this.eventEmitter.emit(RBAC_EVENTS.POLICY_CHANGE_APPLIED, {
        changeRequestId,
        changeType: changeRequest.changeType,
        timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
      });

      return {
        success: true,
        message: 'Change request approved and policy applied',
        changeRequest: {
          id: changeRequest.id,
          status: POLICY_CHANGE_REQUEST_STATUS.APPLIED,
          currentApprovals: newApprovalCount,
          requiredApprovals: changeRequest.requiredApprovals,
        },
        policyApplied: true,
      };
    }

    // Partial approval - waiting for more
    await this.changeRequestRepository.updateStatusAndApprovalCount(
      changeRequestId,
      POLICY_CHANGE_REQUEST_STATUS.APPROVED,
      newApprovalCount,
    );

    this.logger.log(
      `Change request ${changeRequestId} approved by ${approverId} (${newApprovalCount}/${changeRequest.requiredApprovals})`,
    );

    return {
      success: true,
      message: `Approval recorded (${newApprovalCount}/${changeRequest.requiredApprovals})`,
      changeRequest: {
        id: changeRequest.id,
        status: POLICY_CHANGE_REQUEST_STATUS.APPROVED,
        currentApprovals: newApprovalCount,
        requiredApprovals: changeRequest.requiredApprovals,
      },
      policyApplied: false,
    };
  }

  /**
   * Get change request by ID
   */
  async getChangeRequest(
    id: string,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity | null> {
    return this.changeRequestRepository.findByIdWithApprovals(id);
  }

  /**
   * Get pending change requests
   */
  async getPendingRequests(): Promise<MktPolicyChangeRequestWorkspaceEntity[]> {
    return this.changeRequestRepository.findPending();
  }

  /**
   * Get audit trail for policy changes
   */
  async getAuditTrail(
    options?: AuditQueryOptions,
  ): Promise<PolicyAuditEntry[]> {
    const requests = await this.changeRequestRepository.find({
      status: options?.status,
      requestedById: options?.requesterId,
      fromDate: options?.fromDate,
      toDate: options?.toDate,
      limit: options?.limit,
      offset: options?.offset,
    });

    return requests.map((r) => this.toAuditEntry(r));
  }

  /**
   * Export audit trail (for compliance reporting)
   */
  async exportAuditTrail(
    options?: AuditQueryOptions,
  ): Promise<{ json: string; csv: string }> {
    const entries = await this.getAuditTrail(options);

    // JSON export
    const json = safeJsonStringify(entries) ?? '[]';

    // CSV export
    const csvHeaders = [
      'id',
      'changeType',
      'status',
      'requesterId',
      'requestReason',
      'requiredApprovals',
      'currentApprovals',
      'createdAt',
    ];
    const csvRows = entries.map((e) => [
      e.id,
      e.changeType,
      e.status,
      e.requesterId,
      e.requestReason ?? '',
      e.requiredApprovals.toString(),
      e.currentApprovals.toString(),
      e.createdAt,
    ]);

    const csv = [
      csvHeaders.join(','),
      ...csvRows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    return { json, csv };
  }

  /**
   * Cancel expired pending requests
   */
  async expirePendingRequests(maxAgeHours = 72): Promise<number> {
    return this.changeRequestRepository.expirePendingRequests(maxAgeHours);
  }

  /**
   * Get statistics for change requests
   */
  async getStatistics(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    applied: number;
    expired: number;
    total: number;
  }> {
    return this.changeRequestRepository.getStatistics();
  }

  // ==================== Private Methods ====================

  /**
   * Apply policy directly (for low-risk policies)
   */
  private async applyPolicyDirect(
    policy: CasbinPolicy | GroupingPolicy,
    changeType: PolicyChangeType,
  ): Promise<void> {
    switch (changeType) {
      case POLICY_CHANGE_TYPE.CREATE:
        await this.addPolicy(policy);
        break;
      case POLICY_CHANGE_TYPE.UPDATE:
        // For update, we delete then add
        await this.removePolicy(policy);
        await this.addPolicy(policy);
        break;
      case POLICY_CHANGE_TYPE.DELETE:
        await this.removePolicy(policy);
        break;
    }

    // Invalidate cache and notify
    await this.enforcerService.invalidateAllCaches();
    await this.enforcerService.notifyPolicyUpdate();
  }

  /**
   * Apply policy from change request
   */
  private async applyPolicy(
    changeRequest: MktPolicyChangeRequestWorkspaceEntity,
  ): Promise<void> {
    const policy = changeRequest.policyData as CasbinPolicy | GroupingPolicy;
    const changeType = changeRequest.changeType as PolicyChangeType;

    await this.applyPolicyDirect(policy, changeType);
  }

  /**
   * Add a policy to the database
   */
  private async addPolicy(
    policy: CasbinPolicy | GroupingPolicy,
  ): Promise<void> {
    if (policy.ptype === 'p') {
      const pPolicy = policy as CasbinPolicy;
      const rule = [
        pPolicy.subject,
        pPolicy.object,
        pPolicy.action,
        pPolicy.effect,
        pPolicy.condition ?? '',
      ];

      await this.casbinRuleRepository.addRule('p', rule);
    } else if (policy.ptype === 'g') {
      const gPolicy = policy as GroupingPolicy;
      const rule = [gPolicy.subject, gPolicy.role];

      await this.casbinRuleRepository.addRule('g', rule);
    }
  }

  /**
   * Remove a policy from the database
   */
  private async removePolicy(
    policy: CasbinPolicy | GroupingPolicy,
  ): Promise<void> {
    if (policy.ptype === 'p') {
      const pPolicy = policy as CasbinPolicy;
      const rule = [
        pPolicy.subject,
        pPolicy.object,
        pPolicy.action,
        pPolicy.effect,
      ];

      await this.casbinRuleRepository.removeRule('p', rule);
    } else if (policy.ptype === 'g') {
      const gPolicy = policy as GroupingPolicy;
      const rule = [gPolicy.subject, gPolicy.role];

      await this.casbinRuleRepository.removeRule('g', rule);
    }
  }

  /**
   * Convert change request to audit entry
   */
  private toAuditEntry(
    request: MktPolicyChangeRequestWorkspaceEntity,
  ): PolicyAuditEntry {
    return {
      id: request.id,
      changeType: request.changeType,
      status: request.status,
      policyData: request.policyData,
      riskAssessment: request.riskAssessment,
      requesterId: request.requestedById,
      requestReason: request.requestReason,
      requiredApprovals: request.requiredApprovals,
      currentApprovals: request.currentApprovals,
      approvals:
        request.approvals?.map((a) => ({
          approverId: a.approverId,
          decision: a.decision,
          reason: a.reason,
          createdAt: a.createdAt,
        })) ?? [],
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }
}
