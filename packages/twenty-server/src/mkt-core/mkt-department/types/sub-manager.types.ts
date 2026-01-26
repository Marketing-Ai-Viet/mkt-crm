import { MktDepartmentSubManagerWorkspaceEntity } from 'src/mkt-core/mkt-department/objects';

export type CreateSubManagerData = {
  departmentId: string;
  workspaceMemberId: string;
  isPrimary?: boolean;
  note?: string;
  isActive?: boolean;
};

export type UpdateSubManagerData = {
  isPrimary?: boolean;
  note?: string;
  isActive?: boolean;
};

export type SubManagerResult = {
  success: boolean;
  subManager?: MktDepartmentSubManagerWorkspaceEntity;
  error?: string;
};

export type DeleteSubManagerResult = {
  success: boolean;
  deletedId?: string;
  error?: string;
};
