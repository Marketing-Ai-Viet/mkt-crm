import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);
  private roleCache: Map<string, string> = new Map();

  constructor(
    @InjectRepository(RoleEntity, 'core')
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(RoleTargetsEntity, 'core')
    private readonly roleTargetsRepository: Repository<RoleTargetsEntity>,
    @InjectRepository(UserWorkspace, 'core')
    private readonly userWorkspaceRepository: Repository<UserWorkspace>,
  ) {}

  async getRoleIdByLabel(label: string): Promise<string | null> {
    if (this.roleCache.has(label)) {
      return this.roleCache.get(label) ?? null;
    }

    const role = await this.roleRepository.findOne({ where: { label } });

    if (role) {
      this.roleCache.set(label, role.id);

      return role.id;
    }

    this.logger.warn(`Role not found with label: ${label}`);

    return null;
  }

  async getRolesByLabels(labels: string[]): Promise<Map<string, string>> {
    const roles = await this.roleRepository.find({
      where: { label: In(labels) },
    });

    const roleMap = new Map<string, string>();

    for (const role of roles) {
      roleMap.set(role.label, role.id);
      this.roleCache.set(role.label, role.id);
    }

    return roleMap;
  }

  async assignRoleToUserWorkspace(
    userWorkspaceId: string,
    workspaceId: string,
    roleLabel: string,
  ): Promise<void> {
    const roleId = await this.getRoleIdByLabel(roleLabel);

    if (!roleId) {
      throw new Error(`Role not found: ${roleLabel}`);
    }

    await this.roleTargetsRepository.save({
      userWorkspaceId,
      workspaceId,
      roleId,
    });

    this.logger.log(
      `Assigned role ${roleLabel} to user workspace ${userWorkspaceId}`,
    );
  }

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

  async updateUserWorkspaceRole(
    userWorkspaceId: string,
    workspaceId: string,
    newRoleLabel: string,
  ): Promise<void> {
    const newRoleId = await this.getRoleIdByLabel(newRoleLabel);

    if (!newRoleId) {
      throw new Error(`Role not found: ${newRoleLabel}`);
    }

    await this.roleTargetsRepository.delete({
      userWorkspaceId,
      workspaceId,
    });

    await this.roleTargetsRepository.save({
      userWorkspaceId,
      workspaceId,
      roleId: newRoleId,
    });

    this.logger.log(
      `Updated role to ${newRoleLabel} for user workspace ${userWorkspaceId}`,
    );
  }

  async deleteUserWorkspaceRole(
    userWorkspaceId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.roleTargetsRepository.delete({
      userWorkspaceId,
      workspaceId,
    });

    this.logger.log(`Deleted role for user workspace ${userWorkspaceId}`);
  }

  clearCache(): void {
    this.roleCache.clear();
    this.logger.log('Role cache cleared');
  }
}
