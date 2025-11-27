import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';

@Injectable()
export class MktRoleUpdateService {
  private readonly logger = new Logger(MktRoleUpdateService.name);

  constructor(
    @InjectRepository(UserWorkspace, 'core')
    private readonly userWorkspaceRepository: Repository<UserWorkspace>,
    @InjectRepository(RoleTargetsEntity, 'core')
    private readonly roleTargetsRepository: Repository<RoleTargetsEntity>,
  ) {}

  async updateUserRole(
    userId: string,
    workspaceId: string,
    roleId: string,
  ): Promise<void> {
    const userWorkspace = await this.userWorkspaceRepository.findOne({
      where: { userId, workspaceId },
    });

    if (!userWorkspace) {
      this.logger.warn(
        `UserWorkspace not found for userId ${userId}, workspaceId ${workspaceId}`,
      );

      return;
    }

    const existingRoleTarget = await this.roleTargetsRepository.findOne({
      where: { userWorkspaceId: userWorkspace.id, workspaceId },
    });

    if (existingRoleTarget) {
      if (existingRoleTarget.roleId !== roleId) {
        await this.roleTargetsRepository.update(
          { id: existingRoleTarget.id },
          { roleId },
        );
        this.logger.log(
          `Updated role for userId ${userId} to roleId ${roleId}`,
        );
      }
    } else {
      await this.roleTargetsRepository.save({
        userWorkspaceId: userWorkspace.id,
        workspaceId,
        roleId,
      });
      this.logger.log(`Assigned role ${roleId} to userId ${userId}`);
    }
  }
}
