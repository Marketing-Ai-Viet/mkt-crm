import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-data-access-policy/mkt-data-access-policy.workspace-entity';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/mkt-organization-level.workspace-entity';
import { PERMISSION_TEMPLATES } from 'src/mkt-core/mkt-organization-level/constants/permission-templates.constants';

interface OrganizationLevelPolicyFilterConditions {
  policyType: 'organization_level_default';
  organizationLevelId: string;
  hierarchyLevel: number;
  createdBy: 'system';
  version: string;
  permissions: object;
  accessLimitations: object;
  memberFilter: {
    organizationLevel: {
      eq: string;
    };
  };
}

@Injectable()
export class OrganizationLevelPolicyService {
  private readonly logger = new Logger(OrganizationLevelPolicyService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Tạo Data Access Policy mặc định cho organization level mới
   * Theo RBAC architecture, quyền nên được quản lý qua policies, không phải hardcode
   */
  async createDefaultDataAccessPolicy(
    organizationLevel: MktOrganizationLevelWorkspaceEntity,
    workspaceId: string,
  ): Promise<void> {
    try {
      const policyRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktDataAccessPolicyWorkspaceEntity>(
          workspaceId,
          'mktDataAccessPolicy',
          { shouldBypassPermissionChecks: true },
        );

      // Xác định template dựa trên hierarchy level
      const template = this.getPermissionTemplateByHierarchy(
        organizationLevel.hierarchyLevel,
      );

      const policy = policyRepository.create({
        name: `Default Policy - ${organizationLevel.levelName}`,
        description: `Auto-generated default data access policy for ${organizationLevel.levelName} (Level ${organizationLevel.hierarchyLevel})`,
        objectName: '*', // Áp dụng cho tất cả objects
        isActive: true,
        priority: 100, // Priority thấp (default)

        // Filter conditions - chứa tất cả thông tin về policy và permissions
        filterConditions: {
          // Metadata về policy
          policyType: 'organization_level_default',
          organizationLevelId: organizationLevel.id,
          hierarchyLevel: organizationLevel.hierarchyLevel,
          createdBy: 'system',
          version: '1.0.0',

          // Template permissions được embed vào filter conditions
          permissions: template.defaultPermissions,
          accessLimitations: template.accessLimitations,

          // Filter logic cho members thuộc level này
          memberFilter: {
            organizationLevel: {
              eq: organizationLevel.id,
            },
          },
        },

        // Không set department/member cụ thể vì đây là policy chung
        departmentId: null,
        specificMemberId: null,

        position: 0,
      });

      await policyRepository.save(policy);

      this.logger.log(
        `Created default data access policy for organization level: ${organizationLevel.levelName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create default data access policy for organization level ${organizationLevel.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Xác định permission template dựa trên hierarchy level
   */
  private getPermissionTemplateByHierarchy(hierarchyLevel: number) {
    // Level 1-2: Senior leadership
    if (hierarchyLevel <= 2) {
      return PERMISSION_TEMPLATES.SENIOR_STAFF;
    }

    // Level 3-4: Middle management
    if (hierarchyLevel <= 4) {
      return PERMISSION_TEMPLATES.MANAGER;
    }

    // Level 5-6: Team leads
    if (hierarchyLevel <= 6) {
      return PERMISSION_TEMPLATES.TEAM_LEAD;
    }

    // Level 7+: Junior staff
    return PERMISSION_TEMPLATES.JUNIOR_STAFF;
  }

  /**
   * Cập nhật policy khi organization level thay đổi
   */
  async updatePolicyOnLevelChange(
    organizationLevel: MktOrganizationLevelWorkspaceEntity,
    workspaceId: string,
  ): Promise<void> {
    try {
      const policyRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktDataAccessPolicyWorkspaceEntity>(
          workspaceId,
          'mktDataAccessPolicy',
          { shouldBypassPermissionChecks: true },
        );

      // Tìm policy hiện tại bằng cách query filterConditions
      const policies = await policyRepository.find({
        where: {
          objectName: '*',
          isActive: true,
        },
      });

      const existingPolicy = policies.find((policy) => {
        const filterConditions =
          policy.filterConditions as OrganizationLevelPolicyFilterConditions;

        return (
          filterConditions?.policyType === 'organization_level_default' &&
          filterConditions?.organizationLevelId === organizationLevel.id
        );
      });

      if (existingPolicy) {
        // Cập nhật template mới
        const newTemplate = this.getPermissionTemplateByHierarchy(
          organizationLevel.hierarchyLevel,
        );

        // Cập nhật filterConditions với template mới
        existingPolicy.filterConditions = {
          ...existingPolicy.filterConditions,
          permissions: newTemplate.defaultPermissions,
          accessLimitations: newTemplate.accessLimitations,
          hierarchyLevel: organizationLevel.hierarchyLevel,
          version: '1.0.1',
        };
        existingPolicy.description = `Auto-generated default data access policy for ${organizationLevel.levelName} (Level ${organizationLevel.hierarchyLevel})`;

        await policyRepository.save(existingPolicy);

        this.logger.log(
          `Updated data access policy for organization level: ${organizationLevel.levelName}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update data access policy for organization level ${organizationLevel.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Xóa policy khi organization level bị xóa
   */
  async deletePolicyOnLevelDelete(
    organizationLevelId: string,
    workspaceId: string,
  ): Promise<void> {
    try {
      const policyRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktDataAccessPolicyWorkspaceEntity>(
          workspaceId,
          'mktDataAccessPolicy',
          { shouldBypassPermissionChecks: true },
        );

      // Tìm và deactivate policies liên quan
      const policies = await policyRepository.find({
        where: {
          objectName: '*',
          isActive: true,
        },
      });

      const policiesToDeactivate = policies.filter((policy) => {
        const filterConditions =
          policy.filterConditions as OrganizationLevelPolicyFilterConditions;

        return (
          filterConditions?.policyType === 'organization_level_default' &&
          filterConditions?.organizationLevelId === organizationLevelId
        );
      });

      // Deactivate các policies tìm được
      for (const policy of policiesToDeactivate) {
        policy.isActive = false;
        policy.description = 'Deactivated - Organization level deleted';
        await policyRepository.save(policy);
      }

      this.logger.log(
        `Deactivated data access policies for deleted organization level: ${organizationLevelId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to deactivate data access policy for organization level ${organizationLevelId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
