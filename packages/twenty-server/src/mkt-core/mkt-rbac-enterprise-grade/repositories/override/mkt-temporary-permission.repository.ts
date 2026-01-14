import { Injectable } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktTemporaryPermissionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktTemporaryPermissionRepository - Data access layer for Temporary Permission entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for temporary permission queries.
 */
@Injectable()
export class MktTemporaryPermissionRepository extends BaseWorkspaceRepository<MktTemporaryPermissionWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktTemporaryPermissionWorkspaceEntity,
      MktTemporaryPermissionRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByGranteeId(
    workspaceId: string,
    granteeWorkspaceMemberId: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { granteeWorkspaceMemberId, isActive: true },
      order: { expiresAt: 'ASC' },
    });
  }

  async findActiveByGranteeId(
    workspaceId: string,
    granteeWorkspaceMemberId: string,
    referenceDate?: Date,
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
    workspaceId: string,
    granterWorkspaceMemberId: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { granterWorkspaceMemberId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByObjectName(
    workspaceId: string,
    objectName: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { objectName, isActive: true },
      order: { expiresAt: 'ASC' },
    });
  }

  async findByObjectAndRecord(
    workspaceId: string,
    objectName: string,
    recordId?: string,
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
    workspaceId: string,
    granteeWorkspaceMemberId: string,
    objectName: string,
    recordId?: string,
    referenceDate?: Date,
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
    workspaceId: string,
    referenceDate?: Date,
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
    workspaceId: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('tp')
      .where('tp.revokedAt IS NOT NULL')
      .orderBy('tp.revokedAt', 'DESC')
      .getMany();
  }

  async findByPurpose(
    workspaceId: string,
    purpose: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { purpose, isActive: true },
      order: { expiresAt: 'ASC' },
    });
  }

  async findWithRelations(
    workspaceId: string,
    id: string,
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

  async findByIdsTemporary(
    workspaceId: string,
    ids: string[],
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  // ============================================
  // SPECIALIZED UPDATE OPERATIONS
  // ============================================

  async revoke(
    workspaceId: string,
    id: string,
    revokedById: string,
    revokeReason: string,
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

  async updateIsActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive });
  }

  async deactivateExpired(
    workspaceId: string,
    referenceDate?: Date,
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

  // ============================================
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  async hardDelete(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }

  // ============================================
  // SPECIALIZED COUNT OPERATIONS
  // ============================================

  async countActiveByGranteeId(
    workspaceId: string,
    granteeWorkspaceMemberId: string,
    referenceDate?: Date,
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
