import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from 'src/engine/core-modules/user/user.entity';
import { MktPersonUserCreationService } from 'src/mkt-core/user-management/services/mkt-person-user-creation.service';
import { MktPersonUserUpdateService } from 'src/mkt-core/user-management/services/mkt-person-user-update.service';
import { MktPersonDeletionService } from 'src/mkt-core/user-management/services/mkt-person-deletion.service';
import { MktPeopleQueryService } from 'src/mkt-core/user-management/services/mkt-people-query.service';
import { MktRoleCacheService } from 'src/mkt-core/user-management/services/mkt-role-cache.service';
import { SyncStats } from 'src/mkt-core/user-management/types/people-sync.types';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

@Injectable()
export class MktPeopleProcessorService {
  constructor(
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    private readonly mktPersonUserCreationService: MktPersonUserCreationService,
    private readonly mktPersonUserUpdateService: MktPersonUserUpdateService,
    private readonly mktPersonDeletionService: MktPersonDeletionService,
    private readonly mktPeopleQueryService: MktPeopleQueryService,
    private readonly mktRoleCacheService: MktRoleCacheService,
  ) {}

  async processPeople(
    workspaceId: string,
    people: PersonWorkspaceEntity[],
  ): Promise<SyncStats> {
    let successCount = 0;
    let failureCount = 0;

    for (const person of people) {
      try {
        if (person.memberType === 'DELETED') {
          await this.handleDeletedPerson(workspaceId, person);
          successCount++;
          continue;
        }

        const email = person.emails?.primaryEmail;

        if (!email) continue;

        const existingUser = await this.userRepository.findOne({
          where: { email },
        });
        const roleId = this.mktRoleCacheService.getRoleIdByMemberType(
          person.memberType || 'SALES',
        );

        if (existingUser) {
          await this.mktPersonUserUpdateService.updateUserFromPerson(
            workspaceId,
            person,
            existingUser,
            roleId,
          );
        } else {
          if (!roleId) continue;

          await this.mktPersonUserCreationService.createUserFromPerson(
            workspaceId,
            person,
            roleId,
          );
        }

        await this.mktPeopleQueryService.updatePersonSyncStatus(
          person.id,
          false,
        );
        successCount++;
      } catch {
        failureCount++;
      }
    }

    return { successCount, failureCount };
  }

  private async handleDeletedPerson(
    workspaceId: string,
    person: PersonWorkspaceEntity,
  ): Promise<void> {
    await this.mktPersonDeletionService.softDeleteByPerson(workspaceId, person);
    await this.mktPeopleQueryService.updatePersonSyncStatus(person.id, false);
  }
}
