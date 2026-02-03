import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// LOG CONTEXTS
// ============================================

export const USER_MANAGEMENT_LOG_CONTEXT = 'UserManagement';
export const WORKSPACE_MEMBER_LOG_CONTEXT = 'WorkspaceMember';

// ============================================
// USER MESSAGES
// ============================================

export const USER_MESSAGES = createModuleMessages({
  entityName: 'User',
  entityNamePlural: 'Users',
  customSuccess: {
    CREATED: 'User created successfully',
    UPDATED: 'User updated successfully',
    DELETED: 'User deleted successfully',
    PASSWORD_GENERATED: 'Password generated successfully',
    WELCOME_EMAIL_SENT: 'Welcome email sent successfully',
    PERMISSION_ASSIGNED: 'Permission template assigned successfully',
    PERMISSION_UPDATED: 'Permission template updated successfully',
    ROLE_ASSIGNED: 'Role assigned successfully',
  },
  customError: {
    EMAIL_ALREADY_EXISTS: 'An account already exists with this email',
    EMAIL_ALREADY_EXISTS_UPDATE:
      'Cannot update: this email is already used by another account',
    INVALID_EMAIL: 'Invalid email format',
    MEMBER_NOT_FOUND: 'Workspace member not found',
    FAILED_TO_RETRIEVE: 'Failed to retrieve updated member',
    FAILED_TO_CREATE: 'Failed to create user',
    ROLE_NOT_FOUND: 'Role not found in workspace',
    DEPARTMENT_NOT_FOUND: 'Department not found',
    PERMISSION_TEMPLATE_NOT_FOUND: 'Permission template not found',
    PERMISSION_TEMPLATE_INACTIVE: 'Permission template is not active',
    ORGANIZATION_LEVEL_NOT_FOUND: 'Organization level not found',
    EMPLOYMENT_STATUS_NOT_FOUND: 'Employment status not found',
    WELCOME_EMAIL_FAILED:
      'User created successfully, but failed to send welcome email',
    CLEANUP_WORKSPACE_FAILED: 'Failed to cleanup user workspace',
    CLEANUP_USER_FAILED: 'Failed to cleanup core user',
    PASSWORD_LENGTH_INVALID:
      'Password length must be between 8 and 16 characters',
  },
  customOperation: {
    CREATE_USER: 'Create user',
    UPDATE_USER: 'Update user',
    DELETE_USER: 'Delete user',
    SEARCH_USERS: 'Search users',
    GET_USER_BY_ID: 'Get user by ID',
    GENERATE_PASSWORD: 'Generate password',
    SEND_WELCOME_EMAIL: 'Send welcome email',
    ASSIGN_PERMISSION: 'Assign permission template',
    UPDATE_PERMISSION: 'Update permission template',
    ASSIGN_ROLE: 'Assign role',
  },
});

// ============================================
// USER LOG MESSAGES
// ============================================

export const USER_LOG_MESSAGES = {
  // Create operations
  CREATE_START: (email: string) =>
    `[CREATE USER] Starting creation for: ${email}`,
  CREATE_INPUT: (input: string) => `[CREATE USER] Received input: ${input}`,
  CREATE_SUCCESS: (email: string) => `Created core user: ${email}`,
  CREATE_FAILED: (error: string) =>
    `[CREATE USER] Error creating user: ${error}`,
  DUPLICATE_EMAIL: (email: string) =>
    `Attempt to create user with existing email: ${email}`,

  // Update operations
  UPDATE_START: (memberId: string) => `Updating user: ${memberId}`,
  UPDATE_SUCCESS: (memberId: string) => `User updated: ${memberId}`,
  EMAIL_UPDATED: (oldEmail: string, newEmail: string) =>
    `Email updated from ${oldEmail} to ${newEmail}`,
  EMAIL_DUPLICATE_UPDATE: (email: string) =>
    `Cannot update: email ${email} is already used by another account`,

  // Delete operations
  DELETE_START: (memberId: string) => `Deleting user: ${memberId}`,
  DELETE_SUCCESS: (memberId: string) =>
    `Deleted user (workspace member): ${memberId}`,

  // Workspace operations
  WORKSPACE_CREATED: (userId: string) =>
    `Created user workspace for user: ${userId}`,
  WORKSPACE_DELETED: (userId: string) =>
    `Soft deleted user workspace for user: ${userId}`,
  WORKSPACE_NOT_FOUND: (userId: string, workspaceId: string) =>
    `User workspace not found for user ${userId} in workspace ${workspaceId}`,

  // User cleanup
  USER_DELETED: (userId: string) => `Soft deleted user: ${userId}`,
  USER_HAS_WORKSPACES: (userId: string, count: number) =>
    `User ${userId} still has ${count} workspaces`,

  // Role operations
  ROLE_ASSIGNED: (roleId: string, userWorkspaceId: string) =>
    `Assigned role ${roleId} to user workspace ${userWorkspaceId}`,

  // Permission operations
  PERMISSION_ASSIGNED: (templateId: string, memberId: string, deptId: string) =>
    `Assigned permission template ${templateId} to member ${memberId} in department ${deptId}`,
  PERMISSION_UPDATED: (templateId: string, memberId: string, deptId: string) =>
    `Updated permission template to ${templateId} for member ${memberId} in department ${deptId}`,
  PERMISSION_DEACTIVATED: (memberId: string) =>
    `Deactivated permission template assignments for member ${memberId}`,

  // Cleanup operations
  CLEANUP_START: () => `Failed to create user, performing cleanup`,
  CLEANUP_WORKSPACE_FAILED: () => `Failed to cleanup user workspace`,
  CLEANUP_USER_FAILED: () => `Failed to cleanup core user`,

  // Email operations
  EMAIL_FAILED: () =>
    `User created successfully, but failed to send welcome email`,
} as const;

// ============================================
// USER ERROR MESSAGES WITH ID
// ============================================

export const USER_ERROR_MESSAGES = {
  DEPARTMENT_NOT_FOUND: (id: string) => `Department with ID ${id} not found`,
  PERMISSION_TEMPLATE_NOT_FOUND: (id: string) =>
    `Permission template with ID ${id} not found`,
  PERMISSION_TEMPLATE_INACTIVE: (id: string) =>
    `Permission template with ID ${id} is not active`,
  ORGANIZATION_LEVEL_NOT_FOUND: (id: string) =>
    `Organization level with ID ${id} not found`,
  EMPLOYMENT_STATUS_NOT_FOUND: (id: string) =>
    `Employment status with ID ${id} not found`,
  MEMBER_NOT_FOUND: (id: string) => `Workspace member not found: ${id}`,
  ROLE_NOT_FOUND: (roleLabel: string, workspaceId: string) =>
    `Role "${roleLabel}" not found in workspace ${workspaceId}`,
} as const;
