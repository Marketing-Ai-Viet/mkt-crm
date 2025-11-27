import { Injectable } from '@nestjs/common';

import { MktPeopleQueryService } from 'src/mkt-core/user-management/services/mkt-people-query.service';
import { MktRoleCacheService } from 'src/mkt-core/user-management/services/mkt-role-cache.service';
import { MktPeopleProcessorService } from 'src/mkt-core/user-management/services/mkt-people-processor.service';

@Injectable()
export class MktPeopleSyncCoreService {
  constructor(
    private readonly mktPeopleQueryService: MktPeopleQueryService,
    private readonly mktRoleCacheService: MktRoleCacheService,
    private readonly mktPeopleProcessorService: MktPeopleProcessorService,
  ) {}

  async syncPeopleToUsers(workspaceId: string): Promise<void> {
    await this.mktRoleCacheService.initializeRoles();

    const people = await this.mktPeopleQueryService.getPendingSyncPeople(100);

    if (!people?.length) return;

    await this.mktPeopleProcessorService.processPeople(workspaceId, people);
  }
}
