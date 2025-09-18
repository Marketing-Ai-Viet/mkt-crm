import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/mkt-organization-level.workspace-entity';
import {
  PERMISSION_TEMPLATES,
  HIERARCHY_LEVEL_MAPPING,
} from 'src/mkt-core/mkt-organization-level/constants/permission-templates.constants';

// Type definitions for filter conditions
interface LegacyPermissions {
  read?: boolean;
  write?: boolean;
  delete?: boolean;
  create?: boolean;
  [key: string]: unknown;
}

interface LegacyAccessLimitations {
  departments?: string[];
  hierarchyLevels?: number[];
  specificMembers?: string[];
  [key: string]: unknown;
}

interface PolicyFilterConditions {
  policyType?: string;
  createdBy?: string;
  version?: string;
  timestamp?: string;
  templateUsed?: string;
  organizationLevelId?: string;
  legacyPermissions?: LegacyPermissions;
  legacyAccessLimitations?: LegacyAccessLimitations;
}

interface PolicyCreationSummaryItem {
  levelCode: string;
  levelName: string;
  hierarchyLevel: number;
  hasPolicyCreated: boolean;
  templateUsed: string;
}

interface PolicyCreationSummary {
  totalLevels: number;
  policiesCreated: number;
  missingPolicies: string[];
  summary: PolicyCreationSummaryItem[];
}

@Injectable()
export class DefaultPolicyCreationService {
  private readonly logger = new Logger(DefaultPolicyCreationService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Tạo Data Access Policies mặc định cho tất cả 8 organization levels
   */
  async createDefaultPoliciesForAllLevels(workspaceId: string): Promise<void> {
    try {
      this.logger.log(
        'Starting creation of default policies for all organization levels',
      );

      const dataAccessPolicyRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          workspaceId,
          'mktDataAccessPolicy',
        );

      const organizationLevelRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          workspaceId,
          'mktOrganizationLevel',
        );

      // Lấy tất cả organization levels
      const organizationLevels = (await organizationLevelRepository.find({
        where: { isActive: true },
        order: { hierarchyLevel: 'ASC' },
      })) as MktOrganizationLevelWorkspaceEntity[];

      if (organizationLevels.length === 0) {
        this.logger.warn(
          'No organization levels found, skipping policy creation',
        );

        return;
      }

      let policiesCreated = 0;
      let policiesSkipped = 0;

      for (const orgLevel of organizationLevels) {
        try {
          // Kiểm tra xem policy đã tồn tại chưa với new organization level targeting
          const existingPolicy = await dataAccessPolicyRepository.findOne({
            where: {
              objectName: '*',
              isActive: true,
              organizationLevelId: orgLevel.id, // Direct field check instead of JSON search
            },
          });

          if (existingPolicy) {
            this.logger.debug(
              `Policy already exists for organization level: ${orgLevel.levelCode}`,
            );
            policiesSkipped++;
            continue;
          }

          // Tạo policy mới
          const policyCreated = await this.createPolicyForOrganizationLevel(
            workspaceId,
            orgLevel,
          );

          if (policyCreated) {
            policiesCreated++;
            this.logger.log(
              `Created default policy for ${orgLevel.levelCode} (Level ${orgLevel.hierarchyLevel})`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to create policy for ${orgLevel.levelCode}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `Default policy creation completed. Created: ${policiesCreated}, Skipped: ${policiesSkipped}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create default policies: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Tạo Data Access Policy cho một organization level cụ thể
   */
  private async createPolicyForOrganizationLevel(
    workspaceId: string,
    organizationLevel: MktOrganizationLevelWorkspaceEntity,
  ): Promise<boolean> {
    try {
      const dataAccessPolicyRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          workspaceId,
          'mktDataAccessPolicy',
        );

      // Lấy permission template
      const template = this.getPermissionTemplateByHierarchy(
        organizationLevel.hierarchyLevel,
      );

      if (!template) {
        this.logger.error(
          `No permission template found for hierarchy level: ${organizationLevel.hierarchyLevel}`,
        );

        return false;
      }

      // Tạo policy với organization level targeting mới
      const newPolicy = dataAccessPolicyRepository.create({
        name: `Default Policy - ${organizationLevel.levelName}`,
        description: `Auto-generated default data access policy for ${organizationLevel.levelName} (Level ${organizationLevel.hierarchyLevel})`,
        objectName: '*', // Áp dụng cho tất cả objects
        departmentId: null, // Áp dụng cho tất cả departments
        specificMemberId: null, // Không riêng cho user nào

        // Organization Level Targeting (new fields)
        organizationLevelId: organizationLevel.id,
        minHierarchyLevel: organizationLevel.hierarchyLevel,
        maxHierarchyLevel: organizationLevel.hierarchyLevel,
        permissionTemplateId: null, // Will be set when template system is implemented

        priority: 100 + organizationLevel.hierarchyLevel, // Higher level = higher priority
        isActive: true,
        filterConditions: {
          // Essential metadata only
          policyType: 'organization_level_default',
          createdBy: 'system',
          version: '2.0.0', // Updated version for new field structure
          timestamp: new Date().toISOString(),
          templateUsed: this.getTemplateName(organizationLevel.hierarchyLevel),

          // Permissions now referenced via permissionTemplate relation instead of storing inline
          // This improves maintainability and consistency
          legacyPermissions: template.defaultPermissions, // Keep for migration compatibility
          legacyAccessLimitations: template.accessLimitations, // Keep for migration compatibility
        },
        position: organizationLevel.hierarchyLevel * 100, // Position for sorting
      });

      await dataAccessPolicyRepository.save(newPolicy);

      this.logger.debug(
        `Successfully created policy for ${organizationLevel.levelCode}: ${newPolicy.id}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Error creating policy for ${organizationLevel.levelCode}: ${error.message}`,
        error.stack,
      );

      return false;
    }
  }

  /**
   * Xác định permission template dựa trên hierarchy level
   */
  private getPermissionTemplateByHierarchy(hierarchyLevel: number) {
    const templateKey =
      HIERARCHY_LEVEL_MAPPING[
        hierarchyLevel as keyof typeof HIERARCHY_LEVEL_MAPPING
      ];

    if (!templateKey) {
      this.logger.warn(
        `Unknown hierarchy level: ${hierarchyLevel}, defaulting to INTERN template`,
      );

      return PERMISSION_TEMPLATES.INTERN;
    }

    const template =
      PERMISSION_TEMPLATES[templateKey as keyof typeof PERMISSION_TEMPLATES];

    if (!template) {
      this.logger.warn(
        `Template not found for level: ${templateKey}, defaulting to INTERN template`,
      );

      return PERMISSION_TEMPLATES.INTERN;
    }

    return template;
  }

  /**
   * Lấy tên template từ hierarchy level
   */
  private getTemplateName(hierarchyLevel: number): string {
    return (
      HIERARCHY_LEVEL_MAPPING[
        hierarchyLevel as keyof typeof HIERARCHY_LEVEL_MAPPING
      ] || 'INTERN'
    );
  }

  /**
   * Xóa tất cả default policies (dùng cho testing hoặc reset)
   */
  async removeAllDefaultPolicies(workspaceId: string): Promise<void> {
    try {
      this.logger.log('Removing all default organization level policies');

      const dataAccessPolicyRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          workspaceId,
          'mktDataAccessPolicy',
        );

      // Tìm tất cả default policies sử dụng direct field query
      const allPolicies = await dataAccessPolicyRepository.find({
        where: {
          objectName: '*',
          isActive: true,
        },
      });

      // Filter for organization level default policies
      const defaultPolicies = allPolicies.filter((policy) => {
        // Check both new structure (organizationLevelId) and legacy structure (filterConditions)
        if (policy.organizationLevelId) {
          return true; // New structure
        }

        const filterConditions =
          policy.filterConditions as PolicyFilterConditions;

        return filterConditions?.policyType === 'organization_level_default'; // Legacy structure
      });

      if (defaultPolicies.length === 0) {
        this.logger.log('No default policies found to remove');

        return;
      }

      // Soft delete bằng cách set isActive = false
      for (const policy of defaultPolicies) {
        policy.isActive = false;
        await dataAccessPolicyRepository.save(policy);
      }

      this.logger.log(
        `Removed ${defaultPolicies.length} default organization level policies`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove default policies: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Lấy summary của tất cả default policies
   */
  async getPolicyCreationSummary(
    workspaceId: string,
  ): Promise<PolicyCreationSummary> {
    try {
      const organizationLevelRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          workspaceId,
          'mktOrganizationLevel',
        );

      const dataAccessPolicyRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          workspaceId,
          'mktDataAccessPolicy',
        );

      // Lấy tất cả organization levels
      const organizationLevels = (await organizationLevelRepository.find({
        where: { isActive: true },
        order: { hierarchyLevel: 'ASC' },
      })) as MktOrganizationLevelWorkspaceEntity[];

      // Lấy tất cả default policies với improved query
      const allPolicies = await dataAccessPolicyRepository.find({
        where: {
          objectName: '*',
          isActive: true,
        },
      });

      // Filter for organization level default policies
      const defaultPolicies = allPolicies.filter((policy) => {
        // Check both new structure (organizationLevelId) and legacy structure (filterConditions)
        if (policy.organizationLevelId) {
          return true; // New structure
        }

        const filterConditions =
          policy.filterConditions as PolicyFilterConditions;

        return filterConditions?.policyType === 'organization_level_default'; // Legacy structure
      });

      const summary = organizationLevels.map((level) => {
        const hasPolicy = defaultPolicies.some((policy) => {
          // Check new structure first, then fallback to legacy
          if (policy.organizationLevelId === level.id) {
            return true; // New structure
          }

          const filterConditions =
            policy.filterConditions as PolicyFilterConditions;

          return filterConditions?.organizationLevelId === level.id; // Legacy structure
        });

        return {
          levelCode: level.levelCode,
          levelName: level.levelName,
          hierarchyLevel: level.hierarchyLevel,
          hasPolicyCreated: hasPolicy,
          templateUsed: this.getTemplateName(level.hierarchyLevel),
        };
      });

      const missingPolicies = summary
        .filter((item) => !item.hasPolicyCreated)
        .map((item) => item.levelCode);

      return {
        totalLevels: organizationLevels.length,
        policiesCreated: summary.filter((item) => item.hasPolicyCreated).length,
        missingPolicies,
        summary,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get policy creation summary: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
