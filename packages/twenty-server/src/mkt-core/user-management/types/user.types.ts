import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import {
  DepartmentBasicOutput,
  EmploymentStatusBasicOutput,
  OrganizationLevelBasicOutput,
  PermissionTemplateBasicOutput,
} from 'src/mkt-core/user-management/dto';

/**
 * Type for WorkspaceMember with loaded relations
 * Used when fetching members with joined department, organizationLevel, employmentStatus
 */
export type WorkspaceMemberWithRelations = WorkspaceMemberWorkspaceEntity & {
  department?: {
    id: string;
    departmentCode?: string;
    departmentName?: string;
    departmentNameEn?: string;
  } | null;
  organizationLevel?: {
    id: string;
    levelCode?: string;
    levelName?: string;
    levelNameEn?: string;
    hierarchyLevel?: number;
  } | null;
  employmentStatus?: {
    id: string;
    statusCode?: string;
    statusName?: string;
    statusNameEn?: string;
  } | null;
};

/**
 * Type for validated entities returned from validation
 */
export type ValidatedEntities = {
  department: DepartmentBasicOutput;
  permissionTemplate: PermissionTemplateBasicOutput;
  organizationLevel: OrganizationLevelBasicOutput | null;
  employmentStatus: EmploymentStatusBasicOutput | null;
};
