import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

export interface CoreUserCreationResult {
  coreUser: User;
  userWorkspace: UserWorkspace;
}

@Injectable()
export class MktCoreUserCreationService {
  constructor(
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserWorkspace, 'core')
    private readonly userWorkspaceRepository: Repository<UserWorkspace>,
    @InjectRepository(RoleTargetsEntity, 'core')
    private readonly roleTargetsRepository: Repository<RoleTargetsEntity>,
  ) {}

  async createCoreUser(
    workspaceId: string,
    person: PersonWorkspaceEntity,
    passwordHash: string,
  ): Promise<CoreUserCreationResult> {
    const email = person.emails?.primaryEmail;

    if (!email) {
      throw new Error(`Person ${person.id} has no email`);
    }

    const coreUser = await this.userRepository.save({
      email,
      firstName: person.name?.firstName || '',
      lastName: person.name?.lastName || '',
      passwordHash,
      isEmailVerified: true,
      canImpersonate: false,
      canAccessFullAdminPanel: false,
      locale: 'en',
      defaultAvatarUrl: person.avatarUrl || undefined,
    });

    const userWorkspace = await this.userWorkspaceRepository.save({
      userId: coreUser.id,
      workspaceId,
      locale: 'en',
      defaultAvatarUrl: person.avatarUrl || undefined,
    });

    return { coreUser, userWorkspace };
  }

  async assignRole(
    userWorkspaceId: string,
    workspaceId: string,
    roleId: string,
  ): Promise<void> {
    await this.roleTargetsRepository.save({
      userWorkspaceId,
      workspaceId,
      roleId,
    });
  }

  async hashPassword(password: string): Promise<string> {
    return hashPassword(password);
  }
}
