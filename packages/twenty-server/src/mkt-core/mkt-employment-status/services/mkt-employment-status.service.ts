import { Injectable } from '@nestjs/common';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktEmploymentStatusWorkspaceEntity } from 'src/mkt-core/mkt-employment-status/mkt-employment-status.workspace-entity';

@Injectable()
export class MktEmploymentStatusService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  async getEmploymentStatus(workspaceId: string) {
    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktEmploymentStatusWorkspaceEntity>(
        workspaceId,
        'mktEmploymentStatus',
        {
          shouldBypassPermissionChecks: true,
        },
      );
    return await repository.find({});
  }
}
