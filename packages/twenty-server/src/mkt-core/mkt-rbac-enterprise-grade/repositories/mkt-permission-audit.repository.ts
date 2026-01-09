import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktPermissionAuditWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import {
  CheckResult,
  PermissionAction,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';

export type AuditQueryOptions = {
  workspaceMemberId?: string;
  userId?: string;
  objectName?: string;
  action?: PermissionAction;
  checkResult?: CheckResult;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
};

@Injectable()
export class MktPermissionAuditRepository {
  private readonly logger = new Logger(MktPermissionAuditRepository.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktPermissionAuditWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktPermissionAuditWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktPermissionAuditWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findByWorkspaceMemberId(
    workspaceMemberId: string,
    options?: { limit?: number; offset?: number },
    workspaceId?: string,
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
    userId: string,
    options?: { limit?: number; offset?: number },
    workspaceId?: string,
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
    objectName: string,
    options?: { limit?: number; offset?: number },
    workspaceId?: string,
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
    checkResult: CheckResult,
    options?: { limit?: number; offset?: number },
    workspaceId?: string,
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
    fromDate: Date,
    toDate: Date,
    options?: { limit?: number; offset?: number },
    workspaceId?: string,
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
    options?: {
      limit?: number;
      offset?: number;
      fromDate?: Date;
    },
    workspaceId?: string,
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
    queryOptions: AuditQueryOptions,
    workspaceId?: string,
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

  async findByIds(
    ids: string[],
    workspaceId?: string,
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  async create(
    entity: Partial<MktPermissionAuditWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktPermissionAuditWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    return repository.save(entity);
  }

  async createBatch(
    entities: Partial<MktPermissionAuditWorkspaceEntity>[],
    workspaceId?: string,
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.save(entities);
  }

  async count(
    where?: FindOptionsWhere<MktPermissionAuditWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }

  async countByCheckResult(
    checkResult: CheckResult,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where: { checkResult } });
  }

  async deleteOlderThan(date: Date, workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('audit')
      .delete()
      .where('createdAt <= :date', { date })
      .execute();

    return result.affected ?? 0;
  }
}
