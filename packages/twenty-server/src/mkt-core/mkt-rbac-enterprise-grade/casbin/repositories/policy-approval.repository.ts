import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';
import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import {
  MktPolicyApprovalWorkspaceEntity,
  ApprovalDecision,
  APPROVAL_DECISION,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-approval.workspace-entity';
import {
  ApprovalQueryOptions,
  CreateApprovalData,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types/policy-sync.types';

/**
 * Repository for Policy Approvals
 *
 * Manages CRUD operations for approval records.
 * Provides query methods for approval workflow and audit trail.
 */
@Injectable()
export class PolicyApprovalRepository {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:PolicyApprovalRepository`,
  );

  constructor(private readonly twentyORMManager: TwentyORMManager) {}

  /**
   * Get repository for current workspace context
   */
  private async getRepository() {
    return this.twentyORMManager.getRepository<MktPolicyApprovalWorkspaceEntity>(
      'mktPolicyApproval',
    );
  }

  // ==================== Create Operations ====================

  /**
   * Create a new approval record
   */
  async create(
    data: CreateApprovalData,
  ): Promise<MktPolicyApprovalWorkspaceEntity> {
    const repository = await this.getRepository();

    const entity = repository.create({
      decision: data.decision,
      reason: data.reason ?? null,
      changeRequestId: data.changeRequestId,
      approverId: data.approverId,
    });

    const saved = await repository.save(entity);

    this.logger.debug(
      `Created approval: ${saved.id} (${data.decision} by ${data.approverId})`,
    );

    return saved;
  }

  // ==================== Read Operations ====================

  /**
   * Find by ID
   */
  async findById(id: string): Promise<MktPolicyApprovalWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { id },
    });
  }

  /**
   * Find by ID with change request relation
   */
  async findByIdWithChangeRequest(
    id: string,
  ): Promise<MktPolicyApprovalWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { id },
      relations: ['changeRequest'],
    });
  }

  /**
   * Find all approvals for a change request
   */
  async findByChangeRequest(
    changeRequestId: string,
  ): Promise<MktPolicyApprovalWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { changeRequestId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find all approvals by an approver
   */
  async findByApprover(
    approverId: string,
  ): Promise<MktPolicyApprovalWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { approverId },
      relations: ['changeRequest'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find approval by change request and approver
   */
  async findByChangeRequestAndApprover(
    changeRequestId: string,
    approverId: string,
  ): Promise<MktPolicyApprovalWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { changeRequestId, approverId },
    });
  }

  /**
   * Check if approver has already submitted approval
   */
  async hasApproverSubmitted(
    changeRequestId: string,
    approverId: string,
  ): Promise<boolean> {
    const approval = await this.findByChangeRequestAndApprover(
      changeRequestId,
      approverId,
    );

    return approval !== null;
  }

  /**
   * Find with query options
   */
  async find(
    options?: ApprovalQueryOptions,
  ): Promise<MktPolicyApprovalWorkspaceEntity[]> {
    const repository = await this.getRepository();
    const queryBuilder = repository
      .createQueryBuilder('approval')
      .leftJoinAndSelect('approval.changeRequest', 'changeRequest');

    // Apply filters
    if (options?.changeRequestId) {
      queryBuilder.andWhere('approval.changeRequestId = :changeRequestId', {
        changeRequestId: options.changeRequestId,
      });
    }

    if (options?.approverId) {
      queryBuilder.andWhere('approval.approverId = :approverId', {
        approverId: options.approverId,
      });
    }

    if (options?.decision) {
      queryBuilder.andWhere('approval.decision = :decision', {
        decision: options.decision,
      });
    }

    if (options?.fromDate) {
      queryBuilder.andWhere('approval.createdAt >= :fromDate', {
        fromDate: options.fromDate,
      });
    }

    if (options?.toDate) {
      queryBuilder.andWhere('approval.createdAt <= :toDate', {
        toDate: options.toDate,
      });
    }

    // Order
    queryBuilder.orderBy('approval.createdAt', 'DESC');

    // Pagination
    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    return queryBuilder.getMany();
  }

  /**
   * Count approvals for a change request
   */
  async countByChangeRequest(changeRequestId: string): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: { changeRequestId },
    });
  }

  /**
   * Count approvals by decision for a change request
   */
  async countByDecision(
    changeRequestId: string,
    decision: ApprovalDecision,
  ): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: { changeRequestId, decision },
    });
  }

  /**
   * Count approved approvals for a change request
   */
  async countApproved(changeRequestId: string): Promise<number> {
    return this.countByDecision(changeRequestId, APPROVAL_DECISION.APPROVED);
  }

  /**
   * Count rejected approvals for a change request
   */
  async countRejected(changeRequestId: string): Promise<number> {
    return this.countByDecision(changeRequestId, APPROVAL_DECISION.REJECTED);
  }

  /**
   * Check if change request has any rejection
   */
  async hasRejection(changeRequestId: string): Promise<boolean> {
    const count = await this.countRejected(changeRequestId);

    return count > 0;
  }

  // ==================== Delete Operations ====================

  /**
   * Delete by ID
   */
  async delete(id: string): Promise<boolean> {
    const repository = await this.getRepository();

    const result = await repository.delete(id);

    return (result.affected ?? 0) > 0;
  }

  /**
   * Delete all approvals for a change request
   */
  async deleteByChangeRequest(changeRequestId: string): Promise<number> {
    const repository = await this.getRepository();

    const result = await repository.delete({ changeRequestId });

    return result.affected ?? 0;
  }

  // ==================== Statistics ====================

  /**
   * Get approval statistics for a change request
   */
  async getChangeRequestStats(changeRequestId: string): Promise<{
    total: number;
    approved: number;
    rejected: number;
    approverIds: string[];
  }> {
    const approvals = await this.findByChangeRequest(changeRequestId);

    const approved = approvals.filter(
      (a) => a.decision === APPROVAL_DECISION.APPROVED,
    ).length;
    const rejected = approvals.filter(
      (a) => a.decision === APPROVAL_DECISION.REJECTED,
    ).length;
    const approverIds = approvals.map((a) => a.approverId);

    return {
      total: approvals.length,
      approved,
      rejected,
      approverIds,
    };
  }

  /**
   * Get approver activity statistics
   */
  async getApproverStats(approverId: string): Promise<{
    total: number;
    approved: number;
    rejected: number;
  }> {
    const repository = await this.getRepository();

    const [total, approved, rejected] = await Promise.all([
      repository.count({ where: { approverId } }),
      repository.count({
        where: { approverId, decision: APPROVAL_DECISION.APPROVED },
      }),
      repository.count({
        where: { approverId, decision: APPROVAL_DECISION.REJECTED },
      }),
    ]);

    return { total, approved, rejected };
  }
}
