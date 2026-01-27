/**
 * Service-level types for department operations
 */

import {
  MktDepartmentSubManagerWorkspaceEntity,
  MktDepartmentWorkspaceEntity,
} from 'src/mkt-core/mkt-department/objects';

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Input type for sub-manager when creating a department
 */
export type SubManagerData = {
  workspaceMemberId: string;
  isPrimary?: boolean;
  note?: string;
  isActive?: boolean;
};

/**
 * Input type for creating a department
 * Note: departmentCode is auto-generated internally
 */
export type CreateDepartmentData = {
  departmentName: string;
  departmentNameEn?: string;
  departmentType?: string | null;
  description?: string;
  budgetCode?: string;
  costCenter?: string;
  requiresKpiTracking?: boolean;
  allowsCrossDepartmentAccess?: boolean;
  defaultKpiCategory?: string;
  displayOrder?: number;
  colorCode?: string;
  iconName?: string;
  address?: string;
  isActive?: boolean;
  managerId?: string | null;
  subManagers?: SubManagerData[];
};

/**
 * Input type for updating a department
 * Note: departmentCode cannot be updated
 */
export type UpdateDepartmentData = Partial<CreateDepartmentData>;

/**
 * Result type for CRUD operations
 */
export type DepartmentCrudResult = {
  success: boolean;
  department?: MktDepartmentWorkspaceEntity;
  createdSubManagers?: MktDepartmentSubManagerWorkspaceEntity[];
  error?: string;
};

/**
 * Result type for delete operation
 */
export type DeleteDepartmentResult = {
  success: boolean;
  deletedId?: string;
  error?: string;
};

/**
 * Search parameters for department search
 */
export type SearchDepartmentParams = {
  keyword?: string;
  departmentCode?: string;
  departmentType?: string;
  managerId?: string;
  isActive?: boolean;
  requiresKpiTracking?: boolean;
  page?: number;
  limit?: number;
};

/**
 * Result type for search operations
 */
export type SearchDepartmentResult = {
  items: MktDepartmentWorkspaceEntity[];
  total: number;
};
