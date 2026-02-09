import { Injectable } from '@nestjs/common';

import { IsNull } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories/base-workspace.repository';
import { MktDashboardWidgetWorkspaceEntity } from 'src/mkt-core/mkt-dashboard/workspace-entity/mkt-dashboard-widget.workspace-entity';

@Injectable()
export class DashboardWidgetRepository extends BaseWorkspaceRepository<MktDashboardWidgetWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktDashboardWidgetWorkspaceEntity,
      DashboardWidgetRepository.name,
    );
  }

  async findActiveWidgets(): Promise<MktDashboardWidgetWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { isActive: true, deletedAt: IsNull() } as never,
      order: { displayOrder: 'ASC' },
    });
  }

  async findByWidgetCode(
    widgetCode: string,
  ): Promise<MktDashboardWidgetWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { widgetCode, deletedAt: IsNull() } as never,
    });
  }

  async findSystemDefaultWidgets(): Promise<
    MktDashboardWidgetWorkspaceEntity[]
  > {
    const repository = await this.getRepository();

    return repository.find({
      where: { isSystemDefault: true, deletedAt: IsNull() } as never,
      order: { displayOrder: 'ASC' },
    });
  }

  async findByOwnerId(
    ownerId: string,
  ): Promise<MktDashboardWidgetWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { ownerId, deletedAt: IsNull() } as never,
      order: { displayOrder: 'ASC' },
    });
  }
}
