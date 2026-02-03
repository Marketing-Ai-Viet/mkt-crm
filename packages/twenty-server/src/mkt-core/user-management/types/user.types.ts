import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import {
  DepartmentBasicOutput,
  EmploymentStatusBasicOutput,
  OrganizationLevelBasicOutput,
  PermissionTemplateBasicOutput,
} from 'src/mkt-core/user-management/dto';

/**
 * Type for department manager info within department relation
 * Sử dụng null để tương thích với WorkspaceMemberWorkspaceEntity
 */
type DepartmentManagerInfo = {
  id: string;
  name?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  memberCode?: string | null;
  jobTitle?: string | null;
};

/**
 * Type for WorkspaceMember with loaded relations
 * Used when fetching members with joined department, organizationLevel, employmentStatus
 * Includes department.manager for direct manager information
 */
export type WorkspaceMemberWithRelations = WorkspaceMemberWorkspaceEntity & {
  department?: {
    id: string;
    departmentCode?: string;
    departmentName?: string;
    departmentNameEn?: string;
    managerId?: string | null;
    manager?: DepartmentManagerInfo | null;
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
