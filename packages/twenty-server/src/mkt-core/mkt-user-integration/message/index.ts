import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// USER MESSAGES
// ============================================

export const MKT_USER_MESSAGES = createModuleMessages({
  entityName: 'User',
  entityNamePlural: 'Users',
  customSuccess: {
    LIST_FETCHED: 'Users list fetched successfully',
    LIST_EMPTY: 'No users found',
  },
  customError: {
    NOT_FOUND_BY_EMAIL: 'User not found with email: {email}',
    EMAIL_ALREADY_EXISTS: 'User with email {email} already exists',
    UNAUTHORIZED: 'Unauthorized to access user data',
    INVALID_INPUT: 'Invalid input data',
  },
  customOperation: {
    FETCH_FROM_MKT: 'Fetching user from MKT Server',
    FETCH_LIST_FROM_MKT: 'Fetching users list from MKT Server',
    CREATE_ON_MKT: 'Creating user on MKT Server',
    UPDATE_ON_MKT: 'Updating user on MKT Server',
    DELETE_ON_MKT: 'Deleting user on MKT Server',
  },
});

// ============================================
// LOG MESSAGES
// ============================================

export const MKT_USER_LOG_MESSAGES = {
  FETCH_USER_START: (userId: string) => `Fetching user: ${userId}`,
  FETCH_USER_SUCCESS: (userId: string) =>
    `User fetched successfully: ${userId}`,
  FETCH_USER_NOT_FOUND: (userId: string) => `User not found: ${userId}`,

  FETCH_USER_BY_EMAIL_START: (email: string) =>
    `Fetching user by email: ${email}`,
  FETCH_USER_BY_EMAIL_SUCCESS: (email: string) =>
    `User fetched successfully by email: ${email}`,
  FETCH_USER_BY_EMAIL_NOT_FOUND: (email: string) =>
    `User not found with email: ${email}`,

  FETCH_USERS_START: 'Fetching users list',
  FETCH_USERS_SUCCESS: (count: number) => `Fetched ${count} users`,

  CREATE_USER_START: (email: string) => `Creating user: ${email}`,
  CREATE_USER_SUCCESS: (userId: string) =>
    `User created successfully: ${userId}`,
  CREATE_USER_FAILED: (email: string, error: string) =>
    `Failed to create user ${email}: ${error}`,

  UPDATE_USER_START: (userId: string) => `Updating user: ${userId}`,
  UPDATE_USER_SUCCESS: (userId: string) =>
    `User updated successfully: ${userId}`,
  UPDATE_USER_FAILED: (userId: string, error: string) =>
    `Failed to update user ${userId}: ${error}`,

  DELETE_USER_START: (userId: string) => `Deleting user: ${userId}`,
  DELETE_USER_SUCCESS: (userId: string) =>
    `User deleted successfully: ${userId}`,
  DELETE_USER_FAILED: (userId: string, error: string) =>
    `Failed to delete user ${userId}: ${error}`,
} as const;
