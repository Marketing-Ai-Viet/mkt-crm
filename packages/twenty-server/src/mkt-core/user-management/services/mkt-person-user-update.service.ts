import { Injectable, Logger } from '@nestjs/common';

import { User } from 'src/engine/core-modules/user/user.entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { MktCustomerUpdateService } from 'src/mkt-core/customer/services/mkt-customer-update.service';

import { MktCoreUserUpdateService } from './mkt-core-user-update.service';
import { MktRoleCacheService } from './mkt-role-cache.service';
import { MktWorkspaceMemberUpdateService } from './mkt-workspace-member-update.service';

@Injectable()
export class MktPersonUserUpdateService {
  private readonly logger = new Logger(MktPersonUserUpdateService.name);

  constructor(
    private readonly coreUserUpdateService: MktCoreUserUpdateService,
    private readonly workspaceMemberUpdateService: MktWorkspaceMemberUpdateService,
    private readonly customerUpdateService: MktCustomerUpdateService,
    private readonly roleCacheService: MktRoleCacheService,
  ) {}

  async updateUserFromPerson(
    workspaceId: string,
    person: PersonWorkspaceEntity,
    user: User,
    roleId?: string | null,
  ): Promise<void> {
    if (!person.emails?.primaryEmail) return;
    this.logger.log(`Updating user for person: ${person.emails.primaryEmail}`);

    const isCustomerRole =
      roleId && roleId === this.roleCacheService.getCustomerRoleId();

    await Promise.all([
      this.coreUserUpdateService.updateFromPerson(user, person),
      this.workspaceMemberUpdateService.updateFromPerson(
        user.id,
        workspaceId,
        person,
        roleId,
      ),
      isCustomerRole &&
        this.customerUpdateService.updateFromPerson(user.id, person),
    ]);

    this.logger.log(`Updated user for person: ${person.emails.primaryEmail}`);
  }
}
