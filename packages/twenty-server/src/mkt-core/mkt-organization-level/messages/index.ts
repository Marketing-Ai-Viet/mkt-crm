/**
 * Centralized messages for Organization Level module
 * Log messages, warning messages, and error messages
 */

export const MKT_ORGANIZATION_LEVEL_LOG_CONTEXT = 'MktOrganizationLevel';

export const ORGANIZATION_LEVEL_MESSAGES = {
  LOG: {
    CREATE_START: (code: string) => `Creating organization level: ${code}`,
    CREATE_SUCCESS: (id: string) =>
      `Successfully created organization level: ${id}`,
    UPDATE_START: (id: string) => `Updating organization level: ${id}`,
    UPDATE_SUCCESS: (id: string) =>
      `Successfully updated organization level: ${id}`,
    DELETE_START: (id: string) => `Deleting organization level: ${id}`,
    DELETE_SUCCESS: (id: string) =>
      `Successfully deleted organization level: ${id}`,
    VALIDATION_START: 'Validating organization level data',
    VALIDATION_SUCCESS: 'Validation completed successfully',
  },

  WARN: {
    EMPLOYEE_CHECK_FAILED: (error: string) =>
      `Could not check workspace member assignments: ${error}`,
  },

  ERROR: {
    LEVEL_NOT_FOUND: (id: string) =>
      `Organization level with ID '${id}' not found`,
    CODE_EXISTS: (code: string) =>
      `Organization level with code '${code}' already exists`,
    PARENT_NOT_FOUND: (id: string) => `Parent level with ID '${id}' not found`,
    PARENT_INACTIVE: 'Cannot set inactive organization level as parent',
    PARENT_HIERARCHY_INVALID: (parentLevel: number, currentLevel: number) =>
      `Parent level hierarchy (${parentLevel}) must be lower than current level hierarchy (${currentLevel})`,
    LEVEL_1_NO_PARENT:
      'Level 1 (highest hierarchy level) cannot have a parent level',
    LEVEL_NEEDS_PARENT: 'Hierarchy levels below 1 must have a parent level',
    CIRCULAR_REFERENCE:
      'Cannot set parent level: this would create a circular reference in the hierarchy',
    HIERARCHY_CHANGE_INVALID:
      'Cannot change hierarchy level: this would create invalid parent-child relationships. ' +
      'Please update child levels first or ensure new hierarchy level maintains valid structure.',
    DEACTIVATE_HAS_CHILDREN:
      'Cannot deactivate organization level: it has active child levels. ' +
      'Please deactivate child levels first.',
    ACTIVATE_PARENT_INACTIVE:
      'Cannot activate organization level: parent level is inactive. ' +
      'Please activate parent level first.',
    DELETE_HAS_CHILDREN: (count: number, names: string) =>
      `Cannot delete organization level: it has ${count} child level(s): ${names}. ` +
      'Please delete or reassign child levels first.',
    DELETE_HAS_MEMBERS: (count: number) =>
      `Cannot delete organization level: it is assigned to ${count} workspace member(s). ` +
      'Please reassign these members to other levels first.',
    DELETE_LAST_ACTIVE:
      'Cannot delete the last active organization level. ' +
      'Please create another active level before deleting this one.',
    INVALID_INPUT: 'Invalid input data or workspace context',
    WORKSPACE_NOT_FOUND: 'Workspace not found in context',
  },

  INFO: {
    OPERATION_BLOCKED: (operation: string) =>
      `Auto-generated operation '${operation}' is blocked. Use custom resolver instead.`,
  },
} as const;
