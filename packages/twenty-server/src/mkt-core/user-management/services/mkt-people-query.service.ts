import { Injectable, Logger } from '@nestjs/common';

import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';

@Injectable()
export class MktPeopleQueryService {
  private readonly logger = new Logger(MktPeopleQueryService.name);

  constructor(private readonly mktRepo: MktRepositoryService) {}

  async getPendingSyncPeople(limit = 100): Promise<PersonWorkspaceEntity[]> {
    const peopleRepo = await this.mktRepo.getPeopleRepository();

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
    const peopleRepo = await this.mktRepo.getPeopleRepository();

    await peopleRepo.update({ id: personId }, { syncStatus });
  }
}
