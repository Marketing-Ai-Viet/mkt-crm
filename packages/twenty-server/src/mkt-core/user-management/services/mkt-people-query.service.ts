import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

@Injectable()
export class MktPeopleQueryService {
  private readonly logger = new Logger(MktPeopleQueryService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getPeopleRepository() {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      throw new Error('Workspace ID not found in context');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      PersonWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async getPendingSyncPeople(limit = 100): Promise<PersonWorkspaceEntity[]> {
    const peopleRepo = await this.getPeopleRepository();

    return await peopleRepo
      .createQueryBuilder('person')
      .where('person.emailsPrimaryEmail IS NOT NULL')
      .andWhere('person.deletedAt IS NULL')
      .andWhere('person.memberType in (:...memberTypes)', {
        memberTypes: ['SALES', 'SUPPORT', 'ACCOUNTANT', 'CUSTOMER', 'DELETED'],
      })
      .andWhere('person.syncStatus = :syncStatus', {
        syncStatus: true,
      })
      .orderBy('person.updatedAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  async updatePersonSyncStatus(
    personId: string,
    syncStatus: boolean,
  ): Promise<void> {
    const peopleRepo = await this.getPeopleRepository();

    await peopleRepo.update({ id: personId }, { syncStatus });
  }
}
