/**
 * Service-level types for department operations
 */

/**
 * Input data for creating hierarchy entry via metadata
 * Fields match MktDepartmentHierarchyWorkspaceEntity
 */
export type CreateDepartmentHierarchyInput = {
  name?: string;
  relationshipType?: string | null;
  parentDepartmentId: string;
  hierarchyLevel?: number | null;
  inheritsPermissions?: boolean;
  canEscalateToParent?: boolean;
  allowsCrossBranchAccess?: boolean;
  displayOrder?: number;
  notes?: string;
  isActive?: boolean;
};

/**
 * Metadata structure for department creation hook
 */
export type DepartmentCreateMetadata = {
  CreateOneMktDepartmentHierarchy?: CreateDepartmentHierarchyInput;
};

/**
 * Input data for updating hierarchy entry via metadata
 */
export type UpdateDepartmentHierarchyInput = CreateDepartmentHierarchyInput & {
  childDepartmentId?: string;
};

/**
 * Metadata structure for department update hook
 */
export type DepartmentUpdateMetadata = {
  UpdateOneMktDepartmentHierarchy?: UpdateDepartmentHierarchyInput;
};

export type DepartmentPathInfo = {
  departmentId: string;
  departmentCode: string;
  level: number;
  path: string[];
};

export type CircularReferenceInfo = {
  departmentId: string;
  circularPath: string[];
  detectedAt: Date;
};

export type RebuildResult = {
  processedCount: number;
  errorCount: number;
  errors: Array<{
    departmentId: string;
    error: string;
  }>;
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};
