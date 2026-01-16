import { APP_LOCALES } from 'twenty-shared/translations';

import { FullNameMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/full-name.composite-type';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

// ============================================
// WORKSPACE MEMBER REPOSITORY TYPES
// ============================================

/**
 * Locale type from the entity
 */
export type WorkspaceMemberLocale = keyof typeof APP_LOCALES;

/**
 * Default relations for workspace member queries
 */
export const DEFAULT_WORKSPACE_MEMBER_RELATIONS = [
  'department',
  'team',
  'organizationLevel',
  'employmentStatus',
] as const;

/**
 * Options for finding workspace members
 */
export type FindWorkspaceMemberOptions = {
  relations?: string[];
};

/**
 * Data for creating a new workspace member
 */
export type CreateWorkspaceMemberData = Partial<
  Pick<
    WorkspaceMemberWorkspaceEntity,
    | 'name'
    | 'userEmail'
    | 'userId'
    | 'memberCode'
    | 'memberType'
    | 'status'
    | 'grade'
    | 'address'
    | 'departmentId'
    | 'teamId'
    | 'organizationLevelId'
    | 'employmentStatusId'
    | 'avatarUrl'
    | 'colorScheme'
    | 'locale'
    | 'timeZone'
    | 'position'
    | 'calendarStartDay'
    | 'dateFormat'
    | 'timeFormat'
    | 'startDate'
    | 'endDate'
  >
> & {
  name: FullNameMetadata;
  userEmail: string;
  userId: string;
  startDate: Date;
};

/**
 * Data for updating a workspace member
 */
export type UpdateWorkspaceMemberData = Partial<
  Pick<
    WorkspaceMemberWorkspaceEntity,
    | 'name'
    | 'memberCode'
    | 'memberType'
    | 'status'
    | 'grade'
    | 'address'
    | 'supportForMemberId'
    | 'departmentId'
    | 'teamId'
    | 'organizationLevelId'
    | 'employmentStatusId'
    | 'avatarUrl'
    | 'colorScheme'
    | 'locale'
    | 'timeZone'
    | 'startDate'
    | 'endDate'
  >
>;
