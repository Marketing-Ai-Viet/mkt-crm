/**
 * Manager information type
 */
export type ManagerInfo = {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
};

/**
 * Sub-manager information with member details
 */
export type SubManagerInfo = {
  id: string;
  workspaceMemberId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  isPrimary: boolean;
  isActive: boolean;
  note?: string;
  assignedAt?: Date;
};

export type DepartmentTreeNode = {
  id: string;
  departmentCode: string;
  departmentName: string;
  level: number;
  children: DepartmentTreeNode[];
  relationshipType?: string;
  hierarchyId?: string;
  parent?: DepartmentTreeNode;
  // New fields
  departmentType?: string;
  address?: string;
  manager?: ManagerInfo;
  subManagers?: SubManagerInfo[];
  memberCount?: number;
};

export interface DepartmentAncestor {
  id: string;
  departmentCode: string;
  departmentName: string;
  level: number;
  relationshipType: string;
  hierarchyId: string;
  distance: number;
}

export interface DepartmentDescendant {
  id: string;
  departmentCode: string;
  departmentName: string;
  level: number;
  relationshipType: string;
  hierarchyId: string;
  distance: number;
  path: string[];
}

export interface HierarchyStatistics {
  totalHierarchies: number;
  activeHierarchies: number;
  maxDepth: number;
  averageDepth: number;
  orphanedDepartments: number;
  circularReferences: number;
}

export interface DepartmentTreeOptions {
  maxDepth?: number;
  includeInactive?: boolean;
  relationshipTypes?: string[];
  sortBy?: 'displayOrder' | 'departmentName' | 'createdAt';
  sortDirection?: 'ASC' | 'DESC';
}

/**
 * Department tree node (simplified for RBAC)
 */
export type RbacDepartmentNode = {
  id: string;
  code: string;
  name: string;
  level: number;
  children: RbacDepartmentNode[];
};

/**
 * Department tree structure for workspace
 */
export type WorkspaceDepartmentTree = {
  roots: RbacDepartmentNode[];
  flatMap: Map<string, RbacDepartmentNode>;
  buildAt: number;
  version: number;
};

/**
 * Serializable tree for cache storage
 */
export type SerializedDepartmentTree = {
  roots: RbacDepartmentNode[];
  flatMapEntries: Array<[string, RbacDepartmentNode]>;
  buildAt: number;
  version: number;
};

/**
 * Local cache entry with timestamp
 */
export type LocalCacheEntry<T> = {
  data: T;
  timestamp: number;
};
