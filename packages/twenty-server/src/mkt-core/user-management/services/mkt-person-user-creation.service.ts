import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';
import { MktEmailNotificationService } from 'src/mkt-core/user-management/services/mkt-email-notification.service';
import { MktPasswordService } from 'src/mkt-core/user-management/services/mkt-password.service';
import { MktWorkspaceMemberService } from 'src/mkt-core/user-management/services/mkt-workspace-member.service';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

@Injectable()
export class MktPersonUserCreationService {
  private readonly logger = new Logger(MktPersonUserCreationService.name);

  constructor(
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserWorkspace, 'core')
    private readonly userWorkspaceRepository: Repository<UserWorkspace>,
    @InjectRepository(RoleTargetsEntity, 'core')
    private readonly roleTargetsRepository: Repository<RoleTargetsEntity>,
    private readonly mktPasswordService: MktPasswordService,
    private readonly mktEmailNotificationService: MktEmailNotificationService,
    private readonly mktWorkspaceMemberService: MktWorkspaceMemberService,
  ) {}

  async createUserFromPerson(
    workspaceId: string,
    person: PersonWorkspaceEntity,
    roleId: string,
  ): Promise<void> {
    const email = person.emails?.primaryEmail;

    if (!email) {
      this.logger.warn(`Person ${person.id} has no email`);

      return;
    }

    const passwordRandom = this.mktPasswordService.generatePassword();

    // Create core user
    const coreUser = await this.userRepository.save({
      email,
      firstName: person.name?.firstName || '',
      lastName: person.name?.lastName || '',
      passwordHash: await hashPassword(passwordRandom),
      isEmailVerified: true,
      canImpersonate: false,
      canAccessFullAdminPanel: false,
      locale: 'en',
      defaultAvatarUrl: person.avatarUrl || undefined,
    });

    // Create user workspace
    const userWorkspace = await this.userWorkspaceRepository.save({
      userId: coreUser.id,
      workspaceId,
      locale: 'en',
      defaultAvatarUrl: person.avatarUrl || undefined,
    });

    // Assign role
    await this.roleTargetsRepository.save({
      userWorkspaceId: userWorkspace.id,
      workspaceId,
      roleId,
    });

    // Create workspace member with full fields
    // Note: departmentId will be looked up from teamId in MktWorkspaceMemberService
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

    // Send welcome email
    await this.mktEmailNotificationService.sendWelcomeEmail(
      workspaceId,
      email,
      passwordRandom,
    );

    this.logger.log(`Created user for person: ${email}`);
  }
}
