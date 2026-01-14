import { Injectable, Logger } from '@nestjs/common';

import { LessThan } from 'typeorm';

import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import {
  MktPolicyChangeRequestWorkspaceEntity,
  PolicyChangeRequestStatus,
  POLICY_CHANGE_REQUEST_STATUS,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-change-request.workspace-entity';
import {
  ChangeRequestQueryOptions,
  CreateChangeRequestData,
  DEFAULT_EXPIRATION_HOURS,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types/policy-change-request.types';

/**
 * Repository for Policy Change Requests
 *
 * Manages CRUD operations for high-risk policy change requests.
 * Provides query methods for approval workflow and audit trail.
 */
@Injectable()
export class PolicyChangeRequestRepository {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:PolicyChangeRequestRepository`,
  );

  constructor(private readonly twentyORMManager: TwentyORMManager) {}

  /**
   * Get repository for current workspace context
   */
  private async getRepository() {
    return this.twentyORMManager.getRepository<MktPolicyChangeRequestWorkspaceEntity>(
      'mktPolicyChangeRequest',
    );
  }

  // ==================== Create Operations ====================

  /**
   * Create a new change request
   */
  async create(
    data: CreateChangeRequestData,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity> {
    const repository = await this.getRepository();

    const entity = repository.create({
      status: data.status,
      changeType: data.changeType,
      policyData: data.policyData as object,
      riskAssessment: data.riskAssessment as unknown as object,
      requiredApprovals: data.requiredApprovals,
      currentApprovals: data.currentApprovals,
      requestReason: data.requestReason ?? null,
      requestedById: data.requestedById,
    });

    const saved = await repository.save(entity);

    this.logger.debug(`Created change request: ${saved.id}`);

    return saved;
  }

  // ==================== Read Operations ====================

  /**
   * Find by ID
   */
  async findById(
    id: string,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { id },
    });
  }

  /**
   * Find by ID with approvals relation
   */
  async findByIdWithApprovals(
    id: string,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { id },
      relations: ['approvals'],
    });
  }

  /**
   * Find all pending requests
   */
  async findPending(): Promise<MktPolicyChangeRequestWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { status: POLICY_CHANGE_REQUEST_STATUS.PENDING },
      relations: ['approvals'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find all requests by status
   */
  async findByStatus(
    status: PolicyChangeRequestStatus,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { status },
      relations: ['approvals'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find requests by requester
   */
  async findByRequester(
    requestedById: string,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { requestedById },
      relations: ['approvals'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find with query options
   */
  async find(
    options?: ChangeRequestQueryOptions,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity[]> {
    const repository = await this.getRepository();
    const queryBuilder = repository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.approvals', 'approval');

    // Apply filters
    if (options?.status) {
      if (Array.isArray(options.status)) {
        queryBuilder.andWhere('request.status IN (:...statuses)', {
          statuses: options.status,
        });
      } else {
        queryBuilder.andWhere('request.status = :status', {
          status: options.status,
        });
      }
    }

    if (options?.requestedById) {
      queryBuilder.andWhere('request.requestedById = :requestedById', {
        requestedById: options.requestedById,
      });
    }

    if (options?.changeType) {
      queryBuilder.andWhere('request.changeType = :changeType', {
        changeType: options.changeType,
      });
    }

    if (options?.fromDate) {
      queryBuilder.andWhere('request.createdAt >= :fromDate', {
        fromDate: options.fromDate,
      });
    }

    if (options?.toDate) {
      queryBuilder.andWhere('request.createdAt <= :toDate', {
        toDate: options.toDate,
      });
    }

    // Order
    queryBuilder.orderBy('request.createdAt', 'DESC');

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
   * Count by status
   */
  async countByStatus(status: PolicyChangeRequestStatus): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: { status },
    });
  }

  /**
   * Count pending requests
   */
  async countPending(): Promise<number> {
    return this.countByStatus(POLICY_CHANGE_REQUEST_STATUS.PENDING);
  }

  // ==================== Update Operations ====================

  /**
   * Update status
   */
  async updateStatus(
    id: string,
    status: PolicyChangeRequestStatus,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity | null> {
    const repository = await this.getRepository();

    await repository.update(id, { status });

    return this.findById(id);
  }

  /**
   * Increment approval count
   */
  async incrementApprovalCount(
    id: string,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity | null> {
    const repository = await this.getRepository();

    const request = await this.findById(id);

    if (!request) {
      return null;
    }

    await repository.update(id, {
      currentApprovals: request.currentApprovals + 1,
    });

    return this.findById(id);
  }

  /**
   * Update status and approval count
   */
  async updateStatusAndApprovalCount(
    id: string,
    status: PolicyChangeRequestStatus,
    currentApprovals: number,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity | null> {
    const repository = await this.getRepository();

    await repository.update(id, { status, currentApprovals });

    return this.findById(id);
  }

  /**
   * Save entity
   */
  async save(
    entity: MktPolicyChangeRequestWorkspaceEntity,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity> {
    const repository = await this.getRepository();

    return repository.save(entity);
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

  // ==================== Expiration Operations ====================

  /**
   * Expire pending requests older than specified hours
   */
  async expirePendingRequests(
    maxAgeHours = DEFAULT_EXPIRATION_HOURS,
  ): Promise<number> {
    const repository = await this.getRepository();

    const cutoffDate = DateTimeUtils.toISO(
      DateTimeUtils.subtract(DateTimeUtils.now(), { hours: maxAgeHours }),
    );

    const result = await repository.update(
      {
        status: POLICY_CHANGE_REQUEST_STATUS.PENDING,
        createdAt: LessThan(cutoffDate),
      },
      { status: POLICY_CHANGE_REQUEST_STATUS.EXPIRED },
    );

    const expiredCount = result.affected ?? 0;

    if (expiredCount > 0) {
      this.logger.log(`Expired ${expiredCount} pending change requests`);
    }

    return expiredCount;
  }

  /**
   * Find expired requests
   */
  async findExpiredPending(
    maxAgeHours = DEFAULT_EXPIRATION_HOURS,
  ): Promise<MktPolicyChangeRequestWorkspaceEntity[]> {
    const repository = await this.getRepository();

    const cutoffDate = DateTimeUtils.toISO(
      DateTimeUtils.subtract(DateTimeUtils.now(), { hours: maxAgeHours }),
    );

    return repository.find({
      where: {
        status: POLICY_CHANGE_REQUEST_STATUS.PENDING,
        createdAt: LessThan(cutoffDate),
      },
      order: { createdAt: 'ASC' },
    });
  }

  // ==================== Statistics ====================

  /**
   * Get statistics summary
   */
  async getStatistics(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    applied: number;
    expired: number;
    total: number;
  }> {
    const repository = await this.getRepository();

    const [pending, approved, rejected, applied, expired] = await Promise.all([
      repository.count({
        where: { status: POLICY_CHANGE_REQUEST_STATUS.PENDING },
      }),
      repository.count({
        where: { status: POLICY_CHANGE_REQUEST_STATUS.APPROVED },
      }),
      repository.count({
        where: { status: POLICY_CHANGE_REQUEST_STATUS.REJECTED },
      }),
      repository.count({
        where: { status: POLICY_CHANGE_REQUEST_STATUS.APPLIED },
      }),
      repository.count({
        where: { status: POLICY_CHANGE_REQUEST_STATUS.EXPIRED },
      }),
    ]);

    return {
      pending,
      approved,
      rejected,
      applied,
      expired,
      total: pending + approved + rejected + applied + expired,
    };
  }
}
