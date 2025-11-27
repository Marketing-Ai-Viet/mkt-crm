import { Injectable, Logger } from '@nestjs/common';

import { User } from 'src/engine/core-modules/user/user.entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

import { MktCoreUserUpdateService } from './mkt-core-user-update.service';
import { MktWorkspaceMemberUpdateService } from './mkt-workspace-member-update.service';

@Injectable()
export class MktPersonUserUpdateService {
  private readonly logger = new Logger(MktPersonUserUpdateService.name);

  constructor(
    private readonly coreUserUpdateService: MktCoreUserUpdateService,
    private readonly workspaceMemberUpdateService: MktWorkspaceMemberUpdateService,
  ) {}

  async updateUserFromPerson(
    workspaceId: string,
    person: PersonWorkspaceEntity,
    user: User,
    roleId?: string | null,
  ): Promise<void> {
    if (!person.emails?.primaryEmail) return;
    this.logger.log(`Updating user for person: ${person.emails.primaryEmail}`);

    await Promise.all([
      this.coreUserUpdateService.updateFromPerson(user, person),
      this.workspaceMemberUpdateService.updateFromPerson(
        user.id,
        workspaceId,
        person,
        roleId,
      ),
    ]);

    this.logger.log(`Updated user for person: ${person.emails.primaryEmail}`);
  }
}
