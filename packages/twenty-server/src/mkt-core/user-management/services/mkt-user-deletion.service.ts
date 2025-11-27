import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from 'src/engine/core-modules/user/user.entity';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';

@Injectable()
export class MktUserDeletionService {
  private readonly logger = new Logger(MktUserDeletionService.name);

  constructor(
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserWorkspace, 'core')
    private readonly userWorkspaceRepository: Repository<UserWorkspace>,
    @InjectRepository(RoleTargetsEntity, 'core')
    private readonly roleTargetsRepository: Repository<RoleTargetsEntity>,
  ) {}

  async deleteUserWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const userWorkspace = await this.userWorkspaceRepository.findOne({
      where: { userId, workspaceId },
    });

    if (!userWorkspace) {
      this.logger.warn(
        `User workspace not found for user ${userId} in workspace ${workspaceId}`,
      );

      return;
    }

    // Delete role targets first
    await this.roleTargetsRepository.delete({
      userWorkspaceId: userWorkspace.id,
      workspaceId,
    });

    // Delete user workspace
    await this.userWorkspaceRepository.delete({ id: userWorkspace.id });
    this.logger.log(`Deleted user workspace for user: ${userId}`);
  }

  async softDeleteUserIfNoWorkspaces(userId: string): Promise<void> {
    const remainingUserWorkspaces = await this.userWorkspaceRepository.find({
      where: { userId },
    });

    if (remainingUserWorkspaces.length === 0) {
      await this.userRepository.softDelete({ id: userId });
      this.logger.log(`Soft deleted user: ${userId}`);
    } else {
      this.logger.log(
        `User ${userId} still has ${remainingUserWorkspaces.length} workspaces`,
      );
    }
  }
}
