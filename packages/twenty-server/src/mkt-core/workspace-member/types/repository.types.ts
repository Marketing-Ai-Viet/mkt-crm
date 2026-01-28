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
 * Note: Twenty ORM stores composite types as flattened columns:
 * - name.firstName → nameFirstName
 * - name.lastName → nameLastName
 */
export type CreateWorkspaceMemberData = Partial<
  Pick<
    WorkspaceMemberWorkspaceEntity,
    | 'userEmail'
    | 'userId'
    | 'memberCode'
    | 'memberType'
    | 'status'
    | 'grade'
    | 'address'
    | 'departmentId'
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
 * Flattened data for Twenty ORM repository operations
 * This is the actual format used when saving to database
 */
export type FlattenedWorkspaceMemberData = Omit<
  CreateWorkspaceMemberData,
  'name'
> & {
  nameFirstName: string;
  nameLastName: string;
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
    | 'organizationLevelId'
    | 'employmentStatusId'
    | 'avatarUrl'
    | 'colorScheme'
    | 'locale'
    | 'timeZone'
    | 'startDate'
    | 'endDate'
    | 'position'
    | 'calendarStartDay'
  >
>;

/**
 * Params for searching workspace members
 */
export type SearchMemberParams = {
  keyword?: string;
  email?: string;
  memberCode?: string;
  status?: string;
  memberType?: string;
  departmentId?: string;
  organizationLevelId?: string;
  employmentStatusId?: string;
  page?: number;
  limit?: number;
};

/**
 * Result of search workspace members
 */
export type SearchMemberResult = {
  items: WorkspaceMemberWorkspaceEntity[];
  total: number;
};
