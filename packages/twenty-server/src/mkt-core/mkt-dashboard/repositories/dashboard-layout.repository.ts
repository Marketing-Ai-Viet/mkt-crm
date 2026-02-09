import { Injectable } from '@nestjs/common';

import { IsNull } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories/base-workspace.repository';
import { MktDashboardLayoutWorkspaceEntity } from 'src/mkt-core/mkt-dashboard/workspace-entity/mkt-dashboard-layout.workspace-entity';

@Injectable()
export class DashboardLayoutRepository extends BaseWorkspaceRepository<MktDashboardLayoutWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktDashboardLayoutWorkspaceEntity,
      DashboardLayoutRepository.name,
    );
  }

  async findByOwnerId(
    ownerId: string,
  ): Promise<MktDashboardLayoutWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { ownerId, deletedAt: IsNull() } as never,
      order: { createdAt: 'DESC' },
    });
  }

  async findDefaultLayout(
    ownerId: string,
  ): Promise<MktDashboardLayoutWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { ownerId, isDefault: true, deletedAt: IsNull() } as never,
    });
  }

  async findActiveLayouts(): Promise<MktDashboardLayoutWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { isActive: true, deletedAt: IsNull() } as never,
      order: { createdAt: 'DESC' },
    });
  }

  async findSystemDefaultLayouts(): Promise<
    MktDashboardLayoutWorkspaceEntity[]
  > {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        layoutType: 'SYSTEM_DEFAULT',
        isActive: true,
        deletedAt: IsNull(),
      } as never,
    });
  }
}
