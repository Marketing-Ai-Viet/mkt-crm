import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';

@Injectable()
export class MktRoleManagementService {
  private readonly logger = new Logger(MktRoleManagementService.name);
  private roleCache: Map<string, string> = new Map();

  constructor(
    @InjectRepository(RoleEntity, 'core')
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(RoleTargetsEntity, 'core')
    private readonly roleTargetsRepository: Repository<RoleTargetsEntity>,
  ) {}

  async getRoleIdByLabel(label: string): Promise<string | null> {
    // Check cache first
    if (this.roleCache.has(label)) {
      return this.roleCache.get(label) || null;
    }

    const role = await this.roleRepository.findOne({ where: { label } });

    if (role) {
      this.roleCache.set(label, role.id);

      return role.id;
    }

    this.logger.warn(`Role not found with label: ${label}`);

    return null;
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

  async updateUserWorkspaceRole(
    userWorkspaceId: string,
    workspaceId: string,
    newRoleLabel: string,
  ): Promise<void> {
    const newRoleId = await this.getRoleIdByLabel(newRoleLabel);

    if (!newRoleId) {
      throw new Error(`Role not found: ${newRoleLabel}`);
    }

    // Delete old role target
    await this.roleTargetsRepository.delete({
      userWorkspaceId,
      workspaceId,
    });

    // Create new role target
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

  async getRolesByLabels(labels: string[]): Promise<Map<string, string>> {
    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.label IN (:...labels)', { labels })
      .getMany();

    const roleMap = new Map<string, string>();

    for (const role of roles) {
      roleMap.set(role.label, role.id);
      this.roleCache.set(role.label, role.id);
    }

    return roleMap;
  }

  clearCache(): void {
    this.roleCache.clear();
    this.logger.log('Role cache cleared');
  }
}
