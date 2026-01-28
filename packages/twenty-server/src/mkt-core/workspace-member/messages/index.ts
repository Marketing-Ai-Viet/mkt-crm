import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// LOG CONTEXTS
// ============================================

export const MKT_WORKSPACE_MEMBER_LOG_CONTEXT = 'MktWorkspaceMember';

// ============================================
// WORKSPACE MEMBER MESSAGES
// ============================================

export const MKT_WORKSPACE_MEMBER_MESSAGES = createModuleMessages({
  entityName: 'Workspace Member',
  entityNamePlural: 'Workspace Members',
  customSuccess: {
    CODE_GENERATED: 'Member code generated successfully',
    STATUS_UPDATED: 'Member status updated successfully',
    DEPARTMENT_ASSIGNED: 'Member assigned to department successfully',
  },
  customError: {
    CODE_EXISTS: 'Member code already exists',
    INVALID_DEPARTMENT: 'Invalid department specified',
    EMAIL_EXISTS: 'User email already exists in workspace',
    INVALID_STATUS: 'Invalid member status',
  },
  customOperation: {
    FETCH_BY_EMAIL: 'Fetch member by email',
    FETCH_BY_CODE: 'Fetch member by code',
    FETCH_BY_USER_ID: 'Fetch member by user ID',
    FETCH_BY_DEPARTMENT: 'Fetch members by department',
    GENERATE_CODE: 'Generate member code',
  },
});

// ============================================
// WORKSPACE MEMBER LOG MESSAGES
// ============================================

export const MKT_WORKSPACE_MEMBER_LOG_MESSAGES = {
  // Find operations
  FIND_BY_ID_START: (memberId: string) =>
    `Finding workspace member by ID: ${memberId}`,
  FIND_BY_ID_SUCCESS: (memberId: string) =>
    `Workspace member found: ${memberId}`,
  FIND_BY_ID_NOT_FOUND: (memberId: string) =>
    `Workspace member not found: ${memberId}`,
  FIND_BY_EMAIL_START: (email: string) =>
    `Finding workspace member by email: ${email}`,
  FIND_BY_EMAIL_SUCCESS: (email: string) =>
    `Workspace member found by email: ${email}`,
  FIND_BY_EMAIL_NOT_FOUND: (email: string) =>
    `Workspace member not found by email: ${email}`,
  FIND_BY_CODE_START: (code: string) =>
    `Finding workspace member by code: ${code}`,
  FIND_BY_CODE_SUCCESS: (code: string) =>
    `Workspace member found by code: ${code}`,
  FIND_BY_CODE_NOT_FOUND: (code: string) =>
    `Workspace member not found by code: ${code}`,
  FIND_BY_USER_ID_START: (userId: string) =>
    `Finding workspace member by user ID: ${userId}`,
  FIND_BY_USER_ID_SUCCESS: (userId: string) =>
    `Workspace member found by user ID: ${userId}`,
  FIND_BY_USER_ID_NOT_FOUND: (userId: string) =>
    `Workspace member not found by user ID: ${userId}`,
  FIND_BY_DEPARTMENT_START: (departmentId: string) =>
    `Finding workspace members by department: ${departmentId}`,
  FIND_BY_DEPARTMENT_SUCCESS: (departmentId: string, count: number) =>
    `Found ${count} workspace members in department: ${departmentId}`,

  // Create operations
  CREATE_START: () => `Creating new workspace member`,
  CREATE_SUCCESS: (memberId: string) => `Workspace member created: ${memberId}`,
  CREATE_FAILED: (error: string) =>
    `Failed to create workspace member: ${error}`,

  // Update operations
  UPDATE_START: (memberId: string) => `Updating workspace member: ${memberId}`,
  UPDATE_SUCCESS: (memberId: string) => `Workspace member updated: ${memberId}`,
  UPDATE_FAILED: (memberId: string, error: string) =>
    `Failed to update workspace member ${memberId}: ${error}`,
  STATUS_UPDATE_START: (memberId: string, status: string) =>
    `Updating workspace member ${memberId} status to: ${status}`,
  STATUS_UPDATE_SUCCESS: (memberId: string, status: string) =>
    `Workspace member ${memberId} status updated to: ${status}`,

  // Delete operations
  DELETE_START: (memberId: string) => `Deleting workspace member: ${memberId}`,
  DELETE_SUCCESS: (memberId: string) => `Workspace member deleted: ${memberId}`,
} as const;
