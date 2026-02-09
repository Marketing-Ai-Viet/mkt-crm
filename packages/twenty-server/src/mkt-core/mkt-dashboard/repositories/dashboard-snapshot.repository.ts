import { Injectable } from '@nestjs/common';

import { IsNull, LessThan } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories/base-workspace.repository';
import { MktDashboardSnapshotWorkspaceEntity } from 'src/mkt-core/mkt-dashboard/workspace-entity/mkt-dashboard-snapshot.workspace-entity';

@Injectable()
export class DashboardSnapshotRepository extends BaseWorkspaceRepository<MktDashboardSnapshotWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktDashboardSnapshotWorkspaceEntity,
      DashboardSnapshotRepository.name,
    );
  }

  async findByWidgetId(
    widgetId: string,
  ): Promise<MktDashboardSnapshotWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { widgetId, deletedAt: IsNull() } as never,
      order: { snapshotAt: 'DESC' },
    });
  }

  async findByType(
    snapshotType: string,
  ): Promise<MktDashboardSnapshotWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { snapshotType, deletedAt: IsNull() } as never,
      order: { snapshotAt: 'DESC' },
    });
  }

  async deleteSnapshotsBefore(
    snapshotType: string,
    beforeDate: string,
  ): Promise<number> {
    const repository = await this.getRepository();

    const result = await repository.softDelete({
      snapshotType,
      snapshotAt: LessThan(beforeDate),
      deletedAt: IsNull(),
    } as never);

    return result.affected ?? 0;
  }

  async findLatestByType(
    snapshotType: string,
  ): Promise<MktDashboardSnapshotWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { snapshotType, deletedAt: IsNull() } as never,
      order: { snapshotAt: 'DESC' },
    });
  }
}
