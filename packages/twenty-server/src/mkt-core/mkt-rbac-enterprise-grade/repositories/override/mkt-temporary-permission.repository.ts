import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktTemporaryPermissionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

@Injectable()
export class MktTemporaryPermissionRepository {
  private readonly logger = new Logger(MktTemporaryPermissionRepository.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktTemporaryPermissionWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktTemporaryPermissionWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findByGranteeId(
    granteeWorkspaceMemberId: string,
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { granteeWorkspaceMemberId, isActive: true },
      order: { expiresAt: 'ASC' },
    });
  }

  async findActiveByGranteeId(
    granteeWorkspaceMemberId: string,
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('tp')
      .where('tp.granteeWorkspaceMemberId = :granteeWorkspaceMemberId', {
        granteeWorkspaceMemberId,
      })
      .andWhere('tp.isActive = :isActive', { isActive: true })
      .andWhere('tp.expiresAt >= :now', { now })
      .andWhere('tp.revokedAt IS NULL')
      .orderBy('tp.expiresAt', 'ASC')
      .getMany();
  }

  async findByGranterId(
    granterWorkspaceMemberId: string,
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { granterWorkspaceMemberId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByObjectName(
    objectName: string,
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { objectName, isActive: true },
      order: { expiresAt: 'ASC' },
    });
  }

  async findByObjectAndRecord(
    objectName: string,
    recordId?: string,
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const where: FindOptionsWhere<MktTemporaryPermissionWorkspaceEntity> = {
      objectName,
      isActive: true,
    };

    if (recordId) {
      where.recordId = recordId;
    }

    return repository.find({
      where,
      order: { expiresAt: 'ASC' },
    });
  }

  async findActiveForGranteeAndObject(
    granteeWorkspaceMemberId: string,
    objectName: string,
    recordId?: string,
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    const qb = repository
      .createQueryBuilder('tp')
      .where('tp.granteeWorkspaceMemberId = :granteeWorkspaceMemberId', {
        granteeWorkspaceMemberId,
      })
      .andWhere('tp.objectName = :objectName', { objectName })
      .andWhere('tp.isActive = :isActive', { isActive: true })
      .andWhere('tp.expiresAt >= :now', { now })
      .andWhere('tp.revokedAt IS NULL');

    if (recordId) {
      qb.andWhere('(tp.recordId = :recordId OR tp.recordId IS NULL)', {
        recordId,
      });
    }

    return qb.orderBy('tp.expiresAt', 'ASC').getMany();
  }

  async findExpired(
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('tp')
      .where('tp.isActive = :isActive', { isActive: true })
      .andWhere('tp.expiresAt <= :now', { now })
      .andWhere('tp.revokedAt IS NULL')
      .getMany();
  }

  async findRevoked(
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('tp')
      .where('tp.revokedAt IS NOT NULL')
      .orderBy('tp.revokedAt', 'DESC')
      .getMany();
  }

  async findByPurpose(
    purpose: string,
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { purpose, isActive: true },
      order: { expiresAt: 'ASC' },
    });
  }

  async findWithRelations(
    id: string,
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: [
        'granteeWorkspaceMember',
        'granterWorkspaceMember',
        'revokedBy',
      ],
    });
  }

  async findByIds(
    ids: string[],
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  async save(
    entity: Partial<MktTemporaryPermissionWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    return repository.save(entity);
  }

  async revoke(
    id: string,
    revokedById: string,
    revokeReason: string,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(
      { id },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedById,
        revokeReason,
      },
    );
  }

  async updateIsActive(
    id: string,
    isActive: boolean,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update({ id }, { isActive });
  }

  async deactivateExpired(
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<number> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('tp')
      .update()
      .set({ isActive: false })
      .where('isActive = :isActive', { isActive: true })
      .andWhere('expiresAt <= :now', { now })
      .andWhere('revokedAt IS NULL')
      .execute();

    return result.affected ?? 0;
  }

  async delete(id: string, workspaceId?: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }

  async softDelete(id: string, workspaceId?: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.softDelete({ id });
  }

  async count(
    where?: FindOptionsWhere<MktTemporaryPermissionWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }

  async countActiveByGranteeId(
    granteeWorkspaceMemberId: string,
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<number> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('tp')
      .where('tp.granteeWorkspaceMemberId = :granteeWorkspaceMemberId', {
        granteeWorkspaceMemberId,
      })
      .andWhere('tp.isActive = :isActive', { isActive: true })
      .andWhere('tp.expiresAt >= :now', { now })
      .andWhere('tp.revokedAt IS NULL')
      .getCount();
  }
}
