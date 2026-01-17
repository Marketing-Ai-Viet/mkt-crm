import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import {
  CheckResult,
  RbacAction,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import { MktPermissionAuditWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

export type AuditQueryOptions = {
  workspaceMemberId?: string;
  userId?: string;
  objectName?: string;
  action?: RbacAction;
  checkResult?: CheckResult;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
};

/**
 * MktPermissionAuditRepository - Data access layer for Permission Audit entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for audit log queries.
 */
@Injectable()
export class MktPermissionAuditRepository extends BaseWorkspaceRepository<MktPermissionAuditWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktPermissionAuditWorkspaceEntity,
      MktPermissionAuditRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByWorkspaceMemberId(
    workspaceId: string,
    workspaceMemberId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { workspaceMemberId },
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 100,
      skip: options?.offset ?? 0,
    });
  }

  async findByUserId(
    workspaceId: string,
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 100,
      skip: options?.offset ?? 0,
    });
  }

  async findByObjectName(
    workspaceId: string,
    objectName: string,
    options?: { limit?: number; offset?: number },
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { objectName },
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 100,
      skip: options?.offset ?? 0,
    });
  }

  async findByCheckResult(
    workspaceId: string,
    checkResult: CheckResult,
    options?: { limit?: number; offset?: number },
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { checkResult },
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 100,
      skip: options?.offset ?? 0,
    });
  }

  async findByDateRange(
    workspaceId: string,
    fromDate: Date,
    toDate: Date,
    options?: { limit?: number; offset?: number },
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('audit')
      .where('audit.createdAt >= :fromDate', { fromDate })
      .andWhere('audit.createdAt <= :toDate', { toDate })
      .orderBy('audit.createdAt', 'DESC')
      .take(options?.limit ?? 100)
      .skip(options?.offset ?? 0)
      .getMany();
  }

  async findDeniedAccess(
    workspaceId: string,
    options?: { limit?: number; offset?: number; fromDate?: Date },
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const qb = repository
      .createQueryBuilder('audit')
      .where('audit.checkResult = :checkResult', {
        checkResult: CheckResult.FAIL,
      });

    if (options?.fromDate) {
      qb.andWhere('audit.createdAt >= :fromDate', {
        fromDate: options.fromDate,
      });
    }

    return qb
      .orderBy('audit.createdAt', 'DESC')
      .take(options?.limit ?? 100)
      .skip(options?.offset ?? 0)
      .getMany();
  }

  async query(
    workspaceId: string,
    queryOptions: AuditQueryOptions,
  ): Promise<{ items: MktPermissionAuditWorkspaceEntity[]; total: number }> {
    const repository = await this.getRepository(workspaceId);

    const qb = repository.createQueryBuilder('audit');

    if (queryOptions.workspaceMemberId) {
      qb.andWhere('audit.workspaceMemberId = :workspaceMemberId', {
        workspaceMemberId: queryOptions.workspaceMemberId,
      });
    }
    if (queryOptions.userId) {
      qb.andWhere('audit.userId = :userId', { userId: queryOptions.userId });
    }
    if (queryOptions.objectName) {
      qb.andWhere('audit.objectName = :objectName', {
        objectName: queryOptions.objectName,
      });
    }
    if (queryOptions.action) {
      qb.andWhere('audit.action = :action', { action: queryOptions.action });
    }
    if (queryOptions.checkResult) {
      qb.andWhere('audit.checkResult = :checkResult', {
        checkResult: queryOptions.checkResult,
      });
    }
    if (queryOptions.fromDate) {
      qb.andWhere('audit.createdAt >= :fromDate', {
        fromDate: queryOptions.fromDate,
      });
    }
    if (queryOptions.toDate) {
      qb.andWhere('audit.createdAt <= :toDate', {
        toDate: queryOptions.toDate,
      });
    }

    const total = await qb.getCount();

    const items = await qb
      .orderBy('audit.createdAt', 'DESC')
      .take(queryOptions.limit ?? 100)
      .skip(queryOptions.offset ?? 0)
      .getMany();

    return { items, total };
  }

  async findByIdsAudit(
    workspaceId: string,
    ids: string[],
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  // ============================================
  // SPECIALIZED CREATE OPERATIONS
  // ============================================

  async createBatch(
    entities: Partial<MktPermissionAuditWorkspaceEntity>[],
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    return this.bulkCreate(entities);
  }

  // ============================================
  // SPECIALIZED COUNT OPERATIONS
  // ============================================

  /**
   * Count all audit entries for a workspace
   */
  async countWithWorkspace(workspaceId: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count();
  }

  /**
   * Count audit entries by check result
   */
  async countByCheckResult(
    workspaceId: string,
    checkResult: CheckResult,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where: { checkResult } });
  }

  // ============================================
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  async deleteOlderThan(workspaceId: string, date: Date): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('audit')
      .delete()
      .where('createdAt <= :date', { date })
      .execute();

    return result.affected ?? 0;
  }
}
