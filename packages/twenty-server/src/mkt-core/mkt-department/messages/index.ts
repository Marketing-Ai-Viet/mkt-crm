/**
 * Centralized Messages for MktDepartment Module
 * Following MKT_CRM_Backend_Implementation_Guide pattern
 */

export const MKT_DEPARTMENT_LOG_CONTEXT = 'MktDepartment';
export const MKT_DEPARTMENT_HIERARCHY_LOG_CONTEXT = 'MktDepartmentHierarchy';

export const DEPARTMENT_MESSAGES = {
  LOG: {
    // Repository operations
    FIND_BY_ID_START: (departmentId: string) =>
      `Finding department by ID: ${departmentId}`,
    FIND_BY_ID_SUCCESS: (departmentId: string) =>
      `Found department: ${departmentId}`,
    FIND_BY_CODE_START: (code: string) => `Finding department by code: ${code}`,
    FIND_BY_CODE_SUCCESS: (code: string) => `Found department by code: ${code}`,
    FIND_ALL_START: (workspaceId: string) =>
      `Finding all departments for workspace: ${workspaceId}`,
    FIND_ALL_SUCCESS: (count: number) => `Found ${count} departments`,

    // Create operations
    CREATE_START: (code: string) => `Creating department: ${code}`,
    CREATE_SUCCESS: (departmentId: string) =>
      `Successfully created department: ${departmentId}`,

    // Update operations
    UPDATE_START: (departmentId: string) =>
      `Updating department: ${departmentId}`,
    UPDATE_SUCCESS: (departmentId: string) =>
      `Successfully updated department: ${departmentId}`,

    // Tree operations
    GET_TREE_START: (departmentId: string) =>
      `Getting department tree from: ${departmentId}`,
    GET_TREE_SUCCESS: (departmentId: string) =>
      `Successfully built tree for: ${departmentId}`,
    GET_SUBTREE_START: (departmentId: string) =>
      `Getting subtree from: ${departmentId}`,
    GET_SUBTREE_SUCCESS: (departmentId: string) =>
      `Successfully built subtree for: ${departmentId}`,
    GET_ANCESTORS_START: (departmentId: string) =>
      `Getting ancestors for: ${departmentId}`,
    GET_ANCESTORS_SUCCESS: (departmentId: string, count: number) =>
      `Found ${count} ancestors for: ${departmentId}`,
    GET_DESCENDANTS_START: (departmentId: string) =>
      `Getting descendants for: ${departmentId}`,
    GET_DESCENDANTS_SUCCESS: (departmentId: string, count: number) =>
      `Found ${count} descendants for: ${departmentId}`,
    GET_COMPLETE_STRUCTURE_START: (workspaceId: string) =>
      `Getting complete department structure for workspace: ${workspaceId}`,
    GET_COMPLETE_STRUCTURE_SUCCESS: (count: number) =>
      `Found ${count} root departments`,

    // Statistics
    GET_STATISTICS_START: (workspaceId: string) =>
      `Getting hierarchy statistics for workspace: ${workspaceId}`,
    GET_STATISTICS_SUCCESS: (workspaceId: string) =>
      `Successfully retrieved hierarchy statistics for: ${workspaceId}`,

    // Rebuild operations
    REBUILD_PATHS_START: (workspaceId: string) =>
      `Rebuilding hierarchy paths for workspace: ${workspaceId}`,
    REBUILD_PATHS_SUCCESS: (count: number) =>
      `Successfully rebuilt ${count} hierarchy paths`,

    // Hook operations (deprecated - use resolver messages instead)
    HOOK_CREATE_START: 'Starting department create post-query hook',
    HOOK_CREATE_SUCCESS: (metadata: string) =>
      `Department created with metadata: ${metadata}`,
    HOOK_UPDATE_START: 'Starting department update post-query hook',
    HOOK_UPDATE_SUCCESS: (metadata: string) =>
      `Department updated with metadata: ${metadata}`,

    // Resolver operations
    HIERARCHY_CREATED: (
      childDepartmentId: string,
      parentDepartmentId: string,
    ) =>
      `Hierarchy created: child=${childDepartmentId}, parent=${parentDepartmentId}`,
    HIERARCHY_UPDATED: (childDepartmentId?: string) =>
      `Hierarchy updated for department: ${childDepartmentId ?? 'unknown'}`,
    HIERARCHY_DELETED: (hierarchyId: string) =>
      `Hierarchy soft deleted: ${hierarchyId}`,
  },

  WARN: {
    // Department warnings
    DEPARTMENT_NOT_IN_HIERARCHY: (departmentId: string) =>
      `Department ${departmentId} is not in any hierarchy`,
    NO_ROOT_DEPARTMENTS: 'No root departments found',
    CIRCULAR_REFERENCE_DETECTED: (departmentId: string) =>
      `Circular reference detected for department: ${departmentId}`,
    ORPHANED_DEPARTMENTS_FOUND: (count: number) =>
      `Found ${count} orphaned departments`,
    MAX_DEPTH_REACHED: (maxDepth: number) =>
      `Maximum hierarchy depth (${maxDepth}) reached`,
  },

  ERROR: {
    // General errors
    DEPARTMENT_NOT_FOUND: (departmentId: string) =>
      `Department not found: ${departmentId}`,
    ROOT_DEPARTMENT_NOT_FOUND: (departmentId: string) =>
      `Root department not found for department: ${departmentId}`,
    BUILD_TREE_FAILED: (departmentId: string) =>
      `Could not build tree for department: ${departmentId}`,
    BUILD_SUBTREE_FAILED: (departmentId: string) =>
      `Could not build subtree for department: ${departmentId}`,

    // Repository errors
    WORKSPACE_NOT_FOUND: 'Workspace ID not found in context',

    // Validation errors
    INVALID_DEPARTMENT_DATA: 'Invalid department data provided',
    INVALID_HIERARCHY_DATA: 'Invalid hierarchy data provided',
    MISSING_REQUIRED_FIELDS: (fields: string) =>
      `Missing required fields: ${fields}`,
    CHILD_DEPARTMENT_ID_REQUIRED: 'Child department ID is required',
    WORKSPACE_MEMBER_NOT_FOUND: (memberIds: string) =>
      `Workspace member(s) not found: ${memberIds}`,

    // Hierarchy errors
    HIERARCHY_NOT_FOUND: (departmentId: string) =>
      `Hierarchy not found for department: ${departmentId}`,
    HIERARCHY_NOT_FOUND_BY_ID: (hierarchyId: string) =>
      `Hierarchy not found: ${hierarchyId}`,
    HIERARCHY_CREATE_FAILED: (childDepartmentId: string) =>
      `Failed to create hierarchy for department: ${childDepartmentId}`,
    HIERARCHY_UPDATE_FAILED: (childDepartmentId: string) =>
      `Failed to update hierarchy for department: ${childDepartmentId}`,
    HIERARCHY_DELETE_FAILED: (error: string) =>
      `Failed to delete hierarchy: ${error}`,
    PARENT_HIERARCHY_NOT_FOUND: (departmentId: string) =>
      `Parent hierarchy not found for department: ${departmentId}`,

    // Hook errors
    HOOK_CREATE_FAILED: (message: string) =>
      `Error processing metadata for created department: ${message}`,
    HOOK_UPDATE_FAILED: (message: string) =>
      `Error processing metadata for updated department: ${message}`,
  },

  INFO: {
    DEPARTMENT_CREATED: (code: string) => `Department ${code} has been created`,
    DEPARTMENT_UPDATED: (code: string) => `Department ${code} has been updated`,
    HIERARCHY_CREATED: (childCode: string, parentCode: string) =>
      `Hierarchy created: ${childCode} → ${parentCode}`,
    HIERARCHY_UPDATED: (childCode: string) =>
      `Hierarchy updated for: ${childCode}`,
  },
} as const;

export const SUB_MANAGER_MESSAGES = {
  LOG: {
    // Find operations
    FIND_BY_ID_START: (id: string) => `Finding sub-manager by ID: ${id}`,
    FIND_BY_ID_SUCCESS: (id: string) => `Found sub-manager: ${id}`,
    FIND_BY_DEPARTMENT_START: (departmentId: string) =>
      `Finding sub-managers for department: ${departmentId}`,
    FIND_BY_DEPARTMENT_SUCCESS: (departmentId: string, count: number) =>
      `Found ${count} sub-managers for department: ${departmentId}`,
    FIND_BY_MEMBER_START: (memberId: string) =>
      `Finding sub-manager assignments for member: ${memberId}`,
    FIND_BY_MEMBER_SUCCESS: (memberId: string, count: number) =>
      `Found ${count} assignments for member: ${memberId}`,
    FIND_PRIMARY_START: (departmentId: string) =>
      `Finding primary sub-manager for department: ${departmentId}`,
    FIND_PRIMARY_SUCCESS: (departmentId: string) =>
      `Found primary sub-manager for department: ${departmentId}`,

    // Create operations
    CREATE_START: (departmentId: string, memberId: string) =>
      `Creating sub-manager assignment: department=${departmentId}, member=${memberId}`,
    CREATE_SUCCESS: (id: string) =>
      `Successfully created sub-manager assignment: ${id}`,

    // Update operations
    UPDATE_START: (id: string) => `Updating sub-manager assignment: ${id}`,
    UPDATE_SUCCESS: (id: string) =>
      `Successfully updated sub-manager assignment: ${id}`,

    // Delete operations
    DELETE_START: (id: string) => `Deleting sub-manager assignment: ${id}`,
    DELETE_SUCCESS: (id: string) =>
      `Successfully deleted sub-manager assignment: ${id}`,

    // Set primary operations
    SET_PRIMARY_START: (departmentId: string, subManagerId: string) =>
      `Setting primary sub-manager: department=${departmentId}, subManager=${subManagerId}`,
    SET_PRIMARY_SUCCESS: (departmentId: string, subManagerId: string) =>
      `Successfully set primary sub-manager: department=${departmentId}, subManager=${subManagerId}`,

    // Activate/Deactivate
    ACTIVATE_START: (id: string) => `Activating sub-manager assignment: ${id}`,
    ACTIVATE_SUCCESS: (id: string) =>
      `Successfully activated sub-manager assignment: ${id}`,
    DEACTIVATE_START: (id: string) =>
      `Deactivating sub-manager assignment: ${id}`,
    DEACTIVATE_SUCCESS: (id: string) =>
      `Successfully deactivated sub-manager assignment: ${id}`,
  },

  WARN: {
    NOT_FOUND: (id: string) => `Sub-manager assignment not found: ${id}`,
    NO_PRIMARY: (departmentId: string) =>
      `No primary sub-manager found for department: ${departmentId}`,
    ALREADY_EXISTS: (departmentId: string, memberId: string) =>
      `Sub-manager assignment already exists: department=${departmentId}, member=${memberId}`,
    DEPARTMENT_MISMATCH: (subManagerId: string, departmentId: string) =>
      `Sub-manager ${subManagerId} does not belong to department ${departmentId}`,
  },

  ERROR: {
    NOT_FOUND: (id: string) => `Sub-manager assignment not found: ${id}`,
    ALREADY_EXISTS:
      'Sub-manager assignment already exists for this department and member',
    DEPARTMENT_MISMATCH:
      'Sub-manager does not belong to the specified department',
    FIND_BY_ID_FAILED: (id: string, error: string) =>
      `Failed to find sub-manager ${id}: ${error}`,
    FIND_BY_DEPARTMENT_FAILED: (departmentId: string, error: string) =>
      `Failed to find sub-managers for department ${departmentId}: ${error}`,
    FIND_BY_MEMBER_FAILED: (memberId: string, error: string) =>
      `Failed to find assignments for member ${memberId}: ${error}`,
    FIND_PRIMARY_FAILED: (departmentId: string, error: string) =>
      `Failed to find primary sub-manager for department ${departmentId}: ${error}`,
    CREATE_FAILED: (error: string) =>
      `Failed to create sub-manager assignment: ${error}`,
    UPDATE_FAILED: (id: string, error: string) =>
      `Failed to update sub-manager assignment ${id}: ${error}`,
    DELETE_FAILED: (id: string, error: string) =>
      `Failed to delete sub-manager assignment ${id}: ${error}`,
    SET_PRIMARY_FAILED: (error: string) =>
      `Failed to set primary sub-manager: ${error}`,
    ACTIVATE_FAILED: (id: string, error: string) =>
      `Failed to activate sub-manager assignment ${id}: ${error}`,
    DEACTIVATE_FAILED: (id: string, error: string) =>
      `Failed to deactivate sub-manager assignment ${id}: ${error}`,
  },
} as const;

export const HIERARCHY_MESSAGES = {
  LOG: {
    // Repository operations
    FIND_BY_ID_START: (hierarchyId: string) =>
      `Finding hierarchy by ID: ${hierarchyId}`,
    FIND_BY_ID_SUCCESS: (hierarchyId: string) =>
      `Found hierarchy: ${hierarchyId}`,
    FIND_PARENT_START: (childDepartmentId: string) =>
      `Finding parent hierarchy for: ${childDepartmentId}`,
    FIND_PARENT_SUCCESS: (childDepartmentId: string) =>
      `Found parent hierarchy for: ${childDepartmentId}`,
    FIND_CHILDREN_START: (parentDepartmentId: string) =>
      `Finding child hierarchies for: ${parentDepartmentId}`,
    FIND_CHILDREN_SUCCESS: (parentDepartmentId: string, count: number) =>
      `Found ${count} child hierarchies for: ${parentDepartmentId}`,
    FIND_BY_LEVEL_START: (level: number) =>
      `Finding hierarchies at level: ${level}`,
    FIND_BY_LEVEL_SUCCESS: (level: number, count: number) =>
      `Found ${count} hierarchies at level ${level}`,

    // Aggregation
    COUNT_START: (workspaceId: string) =>
      `Counting hierarchies for workspace: ${workspaceId}`,
    COUNT_SUCCESS: (count: number) => `Total hierarchies: ${count}`,
    GET_MAX_LEVEL_START: (workspaceId: string) =>
      `Getting max hierarchy level for workspace: ${workspaceId}`,
    GET_MAX_LEVEL_SUCCESS: (maxLevel: number) =>
      `Max hierarchy level: ${maxLevel}`,
    GET_AVG_LEVEL_START: (workspaceId: string) =>
      `Getting average hierarchy level for workspace: ${workspaceId}`,
    GET_AVG_LEVEL_SUCCESS: (avgLevel: number) =>
      `Average hierarchy level: ${avgLevel}`,

    // Create operations
    CREATE_START: (childDepartmentId: string) =>
      `Creating hierarchy for child: ${childDepartmentId}`,
    CREATE_SUCCESS: (hierarchyId: string) =>
      `Successfully created hierarchy: ${hierarchyId}`,

    // Update operations
    UPDATE_START: (hierarchyId: string) => `Updating hierarchy: ${hierarchyId}`,
    UPDATE_SUCCESS: (hierarchyId: string) =>
      `Successfully updated hierarchy: ${hierarchyId}`,
    UPDATE_BY_CHILD_START: (childDepartmentId: string) =>
      `Updating hierarchy by child department: ${childDepartmentId}`,
    UPDATE_BY_CHILD_SUCCESS: (childDepartmentId: string) =>
      `Successfully updated hierarchy for child: ${childDepartmentId}`,
  },

  WARN: {
    HIERARCHY_NOT_FOUND: (hierarchyId: string) =>
      `Hierarchy not found: ${hierarchyId}`,
    PARENT_NOT_FOUND: (childDepartmentId: string) =>
      `Parent hierarchy not found for: ${childDepartmentId}`,
    NO_CHILDREN_FOUND: (parentDepartmentId: string) =>
      `No child hierarchies found for: ${parentDepartmentId}`,
  },

  ERROR: {
    HIERARCHY_NOT_FOUND: (hierarchyId: string) =>
      `Hierarchy not found: ${hierarchyId}`,
    CREATE_FAILED: (childDepartmentId: string) =>
      `Failed to create hierarchy for: ${childDepartmentId}`,
    UPDATE_FAILED: (hierarchyId: string) =>
      `Failed to update hierarchy: ${hierarchyId}`,
  },
} as const;
