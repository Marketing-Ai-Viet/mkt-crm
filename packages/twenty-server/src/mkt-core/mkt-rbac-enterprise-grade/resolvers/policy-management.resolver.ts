import {
  Resolver,
  Query,
  Mutation,
  Args,
  ObjectType,
  Field,
  InputType,
  Int,
  registerEnumType,
} from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import GraphQLJSON from 'graphql-type-json';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { User } from 'src/engine/core-modules/user/user.entity';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { PolicyApprovalService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/policy-approval.service';
import { WorkspaceCasbinRuleRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/workspace-casbin-rule.repository';
import { PolicyValidator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/validators/policy.validator';
import { HighRiskPolicyValidator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/validators/high-risk-policy.validator';
import { POLICY_CHANGE_TYPE } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-change-request.workspace-entity';
import { APPROVAL_DECISION } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-approval.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

// ==================== Enums ====================

enum PolicyType {
  PERMISSION = 'p',
  ROLE_ASSIGNMENT = 'g',
  RESOURCE_GROUP = 'g2',
}

enum PolicyEffect {
  ALLOW = 'allow',
  DENY = 'deny',
}

enum ChangeRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  APPLIED = 'APPLIED',
  EXPIRED = 'EXPIRED',
}

enum ApprovalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

registerEnumType(PolicyType, { name: 'PolicyType' });
registerEnumType(PolicyEffect, { name: 'PolicyEffect' });
registerEnumType(ChangeRequestStatus, { name: 'ChangeRequestStatus' });
registerEnumType(ApprovalDecision, { name: 'ApprovalDecision' });

// ==================== Input Types ====================

@InputType('CreatePolicyInput')
class CreatePolicyInput {
  @Field(() => PolicyType, { description: 'Policy type (p, g, g2)' })
  @IsEnum(PolicyType)
  ptype: PolicyType;

  @Field(() => String, { description: 'Subject (user:id or role:name)' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @Field(() => String, {
    nullable: true,
    description: 'Object (resource) - required for p type',
  })
  @IsString()
  @IsOptional()
  object?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Action - required for p type',
  })
  @IsString()
  @IsOptional()
  action?: string;

  @Field(() => PolicyEffect, {
    nullable: true,
    description: 'Effect (allow/deny)',
    defaultValue: PolicyEffect.ALLOW,
  })
  @IsOptional()
  effect?: PolicyEffect;

  @Field(() => String, { nullable: true, description: 'ABAC condition' })
  @IsString()
  @IsOptional()
  condition?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Role name - required for g type',
  })
  @IsString()
  @IsOptional()
  role?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Reason for this policy change',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

@InputType('DeletePolicyInput')
class DeletePolicyInput {
  @Field(() => PolicyType, { description: 'Policy type' })
  @IsEnum(PolicyType)
  ptype: PolicyType;

  @Field(() => String, { description: 'Subject' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @Field(() => String, { nullable: true, description: 'Object' })
  @IsString()
  @IsOptional()
  object?: string;

  @Field(() => String, { nullable: true, description: 'Action' })
  @IsString()
  @IsOptional()
  action?: string;

  @Field(() => String, { nullable: true, description: 'Effect' })
  @IsString()
  @IsOptional()
  effect?: string;

  @Field(() => String, { nullable: true, description: 'Role' })
  @IsString()
  @IsOptional()
  role?: string;

  @Field(() => String, { nullable: true, description: 'Reason for deletion' })
  @IsString()
  @IsOptional()
  reason?: string;
}

@InputType('ProcessApprovalInput')
class ProcessApprovalInputDTO {
  @Field(() => String, { description: 'Change request ID' })
  @IsString()
  @IsNotEmpty()
  changeRequestId: string;

  @Field(() => ApprovalDecision, { description: 'Approval decision' })
  @IsEnum(ApprovalDecision)
  decision: ApprovalDecision;

  @Field(() => String, { nullable: true, description: 'Reason for decision' })
  @IsString()
  @IsOptional()
  reason?: string;
}

@InputType('PolicyFilterInput')
class PolicyFilterInput {
  @Field(() => PolicyType, { nullable: true, description: 'Filter by type' })
  @IsOptional()
  ptype?: PolicyType;

  @Field(() => String, { nullable: true, description: 'Filter by subject' })
  @IsString()
  @IsOptional()
  subject?: string;

  @Field(() => String, { nullable: true, description: 'Filter by resource' })
  @IsString()
  @IsOptional()
  resource?: string;
}

// ==================== Output Types ====================

@ObjectType('CasbinPolicyOutput')
class CasbinPolicyOutput {
  @Field(() => String, { description: 'Policy ID' })
  id: string;

  @Field(() => String, { description: 'Policy type' })
  ptype: string;

  @Field(() => String, { description: 'Subject' })
  subject: string;

  @Field(() => String, { nullable: true, description: 'Object' })
  object?: string;

  @Field(() => String, { nullable: true, description: 'Action' })
  action?: string;

  @Field(() => String, { nullable: true, description: 'Effect' })
  effect?: string;

  @Field(() => String, { nullable: true, description: 'Condition' })
  condition?: string;

  @Field(() => Date, { description: 'Created at' })
  createdAt: Date;
}

@ObjectType('RiskAssessmentOutput')
class RiskAssessmentOutput {
  @Field(() => Boolean, { description: 'Is high risk' })
  isHighRisk: boolean;

  @Field(() => String, { description: 'Risk level' })
  riskLevel: string;

  @Field(() => [String], { description: 'Detected patterns' })
  detectedPatterns: string[];

  @Field(() => Int, { description: 'Required approvals' })
  requiredApprovals: number;

  @Field(() => [String], { description: 'Warnings' })
  warnings: string[];

  @Field(() => [String], { description: 'Recommendations' })
  recommendations: string[];
}

@ObjectType('CreatePolicyResultOutput')
class CreatePolicyResultOutput {
  @Field(() => Boolean, { description: 'Success' })
  success: boolean;

  @Field(() => String, { nullable: true, description: 'Message' })
  message?: string;

  @Field(() => String, { nullable: true, description: 'Change request ID' })
  changeRequestId?: string;

  @Field(() => String, { description: 'Status' })
  status: string;

  @Field(() => Boolean, { description: 'Requires approval' })
  requiresApproval: boolean;

  @Field(() => RiskAssessmentOutput, {
    nullable: true,
    description: 'Risk assessment',
  })
  riskAssessment?: RiskAssessmentOutput;
}

@ObjectType('PolicyValidationResultOutput')
class PolicyValidationResultOutput {
  @Field(() => Boolean, { description: 'Is valid' })
  valid: boolean;

  @Field(() => [String], { description: 'Validation errors' })
  errors: string[];

  @Field(() => [String], { nullable: true, description: 'Warnings' })
  warnings?: string[];
}

@ObjectType('ApprovalOutput')
class ApprovalOutput {
  @Field(() => String, { description: 'Approver ID' })
  approverId: string;

  @Field(() => String, { description: 'Decision' })
  decision: string;

  @Field(() => String, { nullable: true, description: 'Reason' })
  reason?: string;

  @Field(() => Date, { description: 'Created at' })
  createdAt: Date;
}

@ObjectType('ChangeRequestOutput')
class ChangeRequestOutput {
  @Field(() => String, { description: 'ID' })
  id: string;

  @Field(() => String, { description: 'Status' })
  status: string;

  @Field(() => String, { description: 'Change type' })
  changeType: string;

  @Field(() => GraphQLJSON, { description: 'Policy data' })
  policyData: Record<string, unknown>;

  @Field(() => GraphQLJSON, { nullable: true, description: 'Risk assessment' })
  riskAssessment?: Record<string, unknown>;

  @Field(() => Int, { description: 'Required approvals' })
  requiredApprovals: number;

  @Field(() => Int, { description: 'Current approvals' })
  currentApprovals: number;

  @Field(() => String, { description: 'Requester ID' })
  requesterId: string;

  @Field(() => String, { nullable: true, description: 'Request reason' })
  requestReason?: string;

  @Field(() => [ApprovalOutput], { nullable: true, description: 'Approvals' })
  approvals?: ApprovalOutput[];

  @Field(() => Date, { description: 'Created at' })
  createdAt: Date;
}

@ObjectType('ProcessApprovalResultOutput')
class ProcessApprovalResultOutput {
  @Field(() => Boolean, { description: 'Success' })
  success: boolean;

  @Field(() => String, { description: 'Message' })
  message: string;

  @Field(() => Boolean, { nullable: true, description: 'Policy applied' })
  policyApplied?: boolean;

  @Field(() => ChangeRequestOutput, {
    nullable: true,
    description: 'Updated change request',
  })
  changeRequest?: ChangeRequestOutput;
}

@ObjectType('PolicyStatisticsOutput')
class PolicyStatisticsOutput {
  @Field(() => Int, { description: 'Total permission policies' })
  totalPolicies: number;

  @Field(() => Int, { description: 'Total role assignments' })
  roleAssignments: number;

  @Field(() => Int, { description: 'Total resource groups' })
  resourceGroups: number;
}

@ObjectType('ChangeRequestStatisticsOutput')
class ChangeRequestStatisticsOutput {
  @Field(() => Int, { description: 'Pending requests' })
  pending: number;

  @Field(() => Int, { description: 'Approved requests' })
  approved: number;

  @Field(() => Int, { description: 'Rejected requests' })
  rejected: number;

  @Field(() => Int, { description: 'Applied requests' })
  applied: number;

  @Field(() => Int, { description: 'Expired requests' })
  expired: number;

  @Field(() => Int, { description: 'Total requests' })
  total: number;
}

/**
 * Policy Management Resolver
 *
 * GraphQL resolver for policy CRUD and approval workflow.
 *
 * Queries:
 * - rbacPolicies: Get all policies
 * - rbacPendingApprovals: Get pending change requests
 * - rbacChangeRequest: Get single change request
 * - rbacPolicyStatistics: Get policy statistics
 *
 * Mutations:
 * - rbacCreatePolicy: Create new policy (may require approval)
 * - rbacDeletePolicy: Delete policy (may require approval)
 * - rbacProcessApproval: Approve or reject change request
 * - rbacValidatePolicy: Validate policy without creating
 * - rbacAssessRisk: Assess risk of a policy
 */
@Resolver()
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class PolicyManagementResolver {
  private readonly logger = new Logger(PolicyManagementResolver.name);

  constructor(
    private readonly enforcerService: CasbinEnforcerService,
    private readonly approvalService: PolicyApprovalService,
    private readonly casbinRuleRepository: WorkspaceCasbinRuleRepository,
    private readonly policyValidator: PolicyValidator,
    private readonly highRiskValidator: HighRiskPolicyValidator,
  ) {}

  // ==================== Queries ====================

  /**
   * Get all policies in workspace
   */
  @Query(() => [CasbinPolicyOutput], {
    name: 'rbacPolicies',
    description: 'Get all Casbin policies in the workspace',
  })
  async getPolicies(
    @Args('filter', { type: () => PolicyFilterInput, nullable: true })
    filter: PolicyFilterInput | undefined,
    @AuthWorkspace() _workspace: Workspace,
  ): Promise<CasbinPolicyOutput[]> {
    let rules = await this.casbinRuleRepository.findAll();

    // Apply filters
    if (filter?.ptype) {
      rules = rules.filter((r) => r.ptype === filter.ptype);
    }
    if (filter?.subject) {
      rules = rules.filter((r) => r.v0.includes(filter.subject ?? ''));
    }
    if (filter?.resource) {
      rules = rules.filter((r) => r.v1.includes(filter.resource ?? ''));
    }

    return rules.map((r) => ({
      id: String(r.id),
      ptype: r.ptype,
      subject: r.v0,
      object: r.v1 || undefined,
      action: r.v2 || undefined,
      effect: r.v3 || undefined,
      condition: r.v4 || undefined,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
    }));
  }

  /**
   * Get pending change requests
   */
  @Query(() => [ChangeRequestOutput], {
    name: 'rbacPendingApprovals',
    description: 'Get pending policy change requests',
  })
  async getPendingApprovals(
    @AuthWorkspace() _workspace: Workspace,
  ): Promise<ChangeRequestOutput[]> {
    const requests = await this.approvalService.getPendingRequests();

    return requests.map((r) => ({
      id: r.id,
      status: r.status,
      changeType: r.changeType,
      policyData: r.policyData as Record<string, unknown>,
      riskAssessment: r.riskAssessment as Record<string, unknown> | undefined,
      requiredApprovals: r.requiredApprovals,
      currentApprovals: r.currentApprovals,
      requesterId: r.requestedById,
      requestReason: r.requestReason ?? undefined,
      approvals: r.approvals?.map((a) => ({
        approverId: a.approverId,
        decision: a.decision,
        reason: a.reason ?? undefined,
        createdAt: DateTimeUtils.toDateRequired(
          DateTimeUtils.parse(a.createdAt),
        ),
      })),
      createdAt: DateTimeUtils.toDateRequired(DateTimeUtils.parse(r.createdAt)),
    }));
  }

  /**
   * Get single change request
   */
  @Query(() => ChangeRequestOutput, {
    name: 'rbacChangeRequest',
    description: 'Get a specific change request',
    nullable: true,
  })
  async getChangeRequest(
    @Args('id') id: string,
    @AuthWorkspace() _workspace: Workspace,
  ): Promise<ChangeRequestOutput | null> {
    const request = await this.approvalService.getChangeRequest(id);

    if (!request) {
      return null;
    }

    return {
      id: request.id,
      status: request.status,
      changeType: request.changeType,
      policyData: request.policyData as Record<string, unknown>,
      riskAssessment: request.riskAssessment as
        | Record<string, unknown>
        | undefined,
      requiredApprovals: request.requiredApprovals,
      currentApprovals: request.currentApprovals,
      requesterId: request.requestedById,
      requestReason: request.requestReason ?? undefined,
      approvals: request.approvals?.map((a) => ({
        approverId: a.approverId,
        decision: a.decision,
        reason: a.reason ?? undefined,
        createdAt: DateTimeUtils.toDateRequired(
          DateTimeUtils.parse(a.createdAt),
        ),
      })),
      createdAt: DateTimeUtils.toDateRequired(
        DateTimeUtils.parse(request.createdAt),
      ),
    };
  }

  /**
   * Get policy statistics
   */
  @Query(() => PolicyStatisticsOutput, {
    name: 'rbacPolicyStatistics',
    description: 'Get policy statistics for the workspace',
  })
  async getPolicyStatistics(
    @AuthWorkspace() _workspace: Workspace,
  ): Promise<PolicyStatisticsOutput> {
    return this.casbinRuleRepository.getStatistics();
  }

  /**
   * Get change request statistics
   */
  @Query(() => ChangeRequestStatisticsOutput, {
    name: 'rbacChangeRequestStatistics',
    description: 'Get change request statistics',
  })
  async getChangeRequestStatistics(
    @AuthWorkspace() _workspace: Workspace,
  ): Promise<ChangeRequestStatisticsOutput> {
    return this.approvalService.getStatistics();
  }

  // ==================== Mutations ====================

  /**
   * Create a new policy
   */
  @Mutation(() => CreatePolicyResultOutput, {
    name: 'rbacCreatePolicy',
    description: 'Create a new Casbin policy (may require approval)',
  })
  async createPolicy(
    @Args('input') input: CreatePolicyInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ): Promise<CreatePolicyResultOutput> {
    // Build policy object based on type
    const policy = this.buildPolicyFromInput(input);

    // Validate policy
    const validationResult = this.policyValidator.validatePolicyRule(
      input.ptype as 'p' | 'g' | 'g2',
      this.policyToRuleArray(input),
      { workspaceId: workspace.id, strictMode: true },
    );

    if (!validationResult.valid) {
      return {
        success: false,
        message: validationResult.errors.join('; '),
        status: 'VALIDATION_FAILED',
        requiresApproval: false,
      };
    }

    // Create change request
    const result = await this.approvalService.createChangeRequest({
      policy,
      changeType: POLICY_CHANGE_TYPE.CREATE,
      requesterId: user.id,
      requestReason: input.reason,
    });

    return {
      success: true,
      changeRequestId: result.id || undefined,
      status: result.status,
      requiresApproval: result.requiresApproval,
      riskAssessment: {
        isHighRisk: result.riskAssessment.isHighRisk,
        riskLevel: result.riskAssessment.riskLevel,
        detectedPatterns: result.riskAssessment.detectedPatterns,
        requiredApprovals: result.riskAssessment.requiredApprovals,
        warnings: result.riskAssessment.warnings,
        recommendations: result.riskAssessment.recommendations,
      },
    };
  }

  /**
   * Delete a policy
   */
  @Mutation(() => CreatePolicyResultOutput, {
    name: 'rbacDeletePolicy',
    description: 'Delete a Casbin policy (may require approval)',
  })
  async deletePolicy(
    @Args('input') input: DeletePolicyInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ): Promise<CreatePolicyResultOutput> {
    const policy = this.buildPolicyFromDeleteInput(input);

    // Create change request for deletion
    const result = await this.approvalService.createChangeRequest({
      policy,
      changeType: POLICY_CHANGE_TYPE.DELETE,
      requesterId: user.id,
      requestReason: input.reason,
    });

    return {
      success: true,
      changeRequestId: result.id || undefined,
      status: result.status,
      requiresApproval: result.requiresApproval,
      riskAssessment: {
        isHighRisk: result.riskAssessment.isHighRisk,
        riskLevel: result.riskAssessment.riskLevel,
        detectedPatterns: result.riskAssessment.detectedPatterns,
        requiredApprovals: result.riskAssessment.requiredApprovals,
        warnings: result.riskAssessment.warnings,
        recommendations: result.riskAssessment.recommendations,
      },
    };
  }

  /**
   * Process approval for change request
   */
  @Mutation(() => ProcessApprovalResultOutput, {
    name: 'rbacProcessApproval',
    description: 'Approve or reject a policy change request',
  })
  async processApproval(
    @Args('input') input: ProcessApprovalInputDTO,
    @AuthUser() user: User,
  ): Promise<ProcessApprovalResultOutput> {
    const result = await this.approvalService.processApproval({
      changeRequestId: input.changeRequestId,
      approverId: user.id,
      decision:
        input.decision === ApprovalDecision.APPROVED
          ? APPROVAL_DECISION.APPROVED
          : APPROVAL_DECISION.REJECTED,
      reason: input.reason,
    });

    return {
      success: result.success,
      message: result.message,
      policyApplied: result.policyApplied,
      changeRequest: result.changeRequest
        ? {
            id: result.changeRequest.id,
            status: result.changeRequest.status,
            changeType: '',
            policyData: {},
            requiredApprovals: result.changeRequest.requiredApprovals,
            currentApprovals: result.changeRequest.currentApprovals,
            requesterId: '',
            createdAt: new Date(),
          }
        : undefined,
    };
  }

  /**
   * Validate policy without creating
   */
  @Mutation(() => PolicyValidationResultOutput, {
    name: 'rbacValidatePolicy',
    description: 'Validate a policy without creating it',
  })
  async validatePolicy(
    @Args('input') input: CreatePolicyInput,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<PolicyValidationResultOutput> {
    const result = this.policyValidator.validatePolicyRule(
      input.ptype as 'p' | 'g' | 'g2',
      this.policyToRuleArray(input),
      { workspaceId: workspace.id, strictMode: true },
    );

    return {
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  /**
   * Assess risk of a policy
   */
  @Mutation(() => RiskAssessmentOutput, {
    name: 'rbacAssessRisk',
    description: 'Assess risk level of a policy',
  })
  async assessRisk(
    @Args('input') input: CreatePolicyInput,
  ): Promise<RiskAssessmentOutput> {
    const policy = this.buildPolicyFromInput(input);
    const assessment = this.highRiskValidator.assessPolicy(policy);

    return {
      isHighRisk: assessment.isHighRisk,
      riskLevel: assessment.riskLevel,
      detectedPatterns: assessment.detectedPatterns,
      requiredApprovals: assessment.requiredApprovals,
      warnings: assessment.warnings,
      recommendations: assessment.recommendations,
    };
  }

  // ==================== Private Methods ====================

  private buildPolicyFromInput(input: CreatePolicyInput):
    | {
        ptype: 'p';
        subject: string;
        object: string;
        action: string;
        effect: 'allow' | 'deny';
        condition?: string;
      }
    | { ptype: 'g'; subject: string; role: string } {
    if (input.ptype === PolicyType.PERMISSION) {
      return {
        ptype: 'p',
        subject: input.subject,
        object: input.object ?? '',
        action: input.action ?? '',
        effect: (input.effect ?? PolicyEffect.ALLOW) as 'allow' | 'deny',
        condition: input.condition,
      };
    }

    // Role assignment (g type)
    return {
      ptype: 'g',
      subject: input.subject,
      role: input.role ?? '',
    };
  }

  private buildPolicyFromDeleteInput(input: DeletePolicyInput):
    | {
        ptype: 'p';
        subject: string;
        object: string;
        action: string;
        effect: 'allow' | 'deny';
      }
    | { ptype: 'g'; subject: string; role: string } {
    if (input.ptype === PolicyType.PERMISSION) {
      return {
        ptype: 'p',
        subject: input.subject,
        object: input.object ?? '',
        action: input.action ?? '',
        effect: (input.effect ?? 'allow') as 'allow' | 'deny',
      };
    }

    return {
      ptype: 'g',
      subject: input.subject,
      role: input.role ?? '',
    };
  }

  private policyToRuleArray(input: CreatePolicyInput): string[] {
    if (input.ptype === PolicyType.PERMISSION) {
      return [
        input.subject,
        input.object ?? '',
        input.action ?? '',
        input.effect ?? PolicyEffect.ALLOW,
        input.condition ?? '',
      ];
    }

    return [input.subject, input.role ?? ''];
  }
}
