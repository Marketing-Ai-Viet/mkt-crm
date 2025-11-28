import { Injectable } from '@nestjs/common';

import { MktCustomerCreationService } from 'src/mkt-core/customer/services/mkt-customer-creation.service';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

import { MktCoreUserCreationService } from './mkt-core-user-creation.service';
import { MktEmailNotificationService } from './mkt-email-notification.service';
import { MktPasswordService } from './mkt-password.service';
import { MktRoleCacheService } from './mkt-role-cache.service';
import { MktWorkspaceMemberService } from './mkt-workspace-member.service';

@Injectable()
export class MktPersonUserCreationService {
  constructor(
    private readonly coreUserCreationService: MktCoreUserCreationService,
    private readonly customerCreationService: MktCustomerCreationService,
    private readonly mktPasswordService: MktPasswordService,
    private readonly mktEmailNotificationService: MktEmailNotificationService,
    private readonly mktWorkspaceMemberService: MktWorkspaceMemberService,
    private readonly roleCacheService: MktRoleCacheService,
  ) {}

  async createUserFromPerson(
    workspaceId: string,
    person: PersonWorkspaceEntity,
    roleId: string,
  ): Promise<void> {
    const email = person.emails?.primaryEmail;

    if (!email) {
      return;
    }

    const passwordRandom = this.mktPasswordService.generatePassword();
    const passwordHash =
      await this.coreUserCreationService.hashPassword(passwordRandom);

    const { coreUser, userWorkspace } =
      await this.coreUserCreationService.createCoreUser(
        workspaceId,
        person,
        passwordHash,
      );

    const isCustomerRole =
      roleId && roleId === this.roleCacheService.getCustomerRoleId();

    if (isCustomerRole) {
      await this.customerCreationService.createCustomerFromPerson(
        workspaceId,
        coreUser.id,
        person,
      );
    }

    await this.coreUserCreationService.assignRole(
      userWorkspace.id,
      workspaceId,
      roleId,
    );

    await this.mktWorkspaceMemberService.createWorkspaceMember(workspaceId, {
      name: {
        firstName: person.name?.firstName || '',
        lastName: person.name?.lastName || '',
      },
      colorScheme: 'Light',
      locale: 'en',
      avatarUrl: person.avatarUrl ?? '',
      userId: coreUser.id,
      userEmail: email,
      timeZone: 'SYSTEM',
      dateFormat: 'SYSTEM',
      timeFormat: 'SYSTEM',
      teamId: person.teamId || null,
      status: person.status || '',
      memberType: person.memberType || '',
    });

    await this.mktEmailNotificationService.sendWelcomeEmail(
      workspaceId,
      email,
      passwordRandom,
    );
  }
}
