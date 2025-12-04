import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { User } from 'src/engine/core-modules/user/user.entity';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';

@Injectable()
export class MktUserCreationService {
  private readonly logger = new Logger(MktUserCreationService.name);

  constructor(
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserWorkspace, 'core')
    private readonly userWorkspaceRepository: Repository<UserWorkspace>,
    @InjectRepository(RoleTargetsEntity, 'core')
    private readonly roleTargetsRepository: Repository<RoleTargetsEntity>,
  ) {}

  async createCoreUser(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    avatarUrl?: string,
  ): Promise<User> {
    const coreUser = await this.userRepository.save({
      email,
      firstName,
      lastName,
      passwordHash: await hashPassword(password),
      isEmailVerified: true,
      canImpersonate: false,
      canAccessFullAdminPanel: false,
      locale: 'en',
      defaultAvatarUrl: avatarUrl,
    });

    this.logger.log(`Created core user: ${email}`);

    return coreUser;
  }

  async createUserWorkspace(
    userId: string,
    workspaceId: string,
    avatarUrl?: string,
  ): Promise<UserWorkspace> {
    const userWorkspace = await this.userWorkspaceRepository.save({
      userId,
      workspaceId,
      locale: 'en',
      defaultAvatarUrl: avatarUrl,
    });

    this.logger.log(`Created user workspace for user: ${userId}`);

    return userWorkspace;
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

    this.logger.log(
      `Assigned role ${roleId} to user workspace ${userWorkspaceId}`,
    );
  }

  async updateCoreUser(
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
    avatarUrl?: string,
  ): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      { firstName, lastName, defaultAvatarUrl: avatarUrl, email },
    );

    this.logger.log(`Updated core user: ${email}`);
  }

  async findCoreUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findUserWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<UserWorkspace | null> {
    return await this.userWorkspaceRepository.findOne({
      where: { userId, workspaceId },
    });
  }
}
