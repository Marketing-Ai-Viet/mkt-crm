import {
  MktUserDto,
  MktUserListResponseDto,
  MktUserLoginHistoryDto,
} from 'src/mkt-core/mkt-user-integration/dto/mkt-user.output';
import {
  MktPaginatedUsers,
  MktUser,
  MktUserLoginHistory,
} from 'src/mkt-core/mkt-user-integration/types';

/**
 * Map MktUser to MktUserDto
 * Converts null values to undefined for GraphQL compatibility
 */
export const mapUserToDto = (user: MktUser): MktUserDto => ({
  id: user.id,
  email: user.email,
  username: user.username ?? undefined,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,
  code: user.code ?? undefined,
  phone: user.phone ?? undefined,
  avatarUrl: user.avatarUrl ?? undefined,
  roleId: user.roleId ?? undefined,
  status: user.status,
  authMethod: user.authMethod,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
  twoFactorEnabled: user.twoFactorEnabled,
  crmCustomerId: user.crmCustomerId ?? undefined,
  crmSyncEnabled: user.crmSyncEnabled,
  preferences: user.preferences,
  settings: user.settings,
  lastLoginAt: user.lastLoginAt ?? undefined,
  lastLoginIp: user.lastLoginIp ?? undefined,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Map array of MktUser to array of MktUserDto
 */
export const mapUsersToDto = (users: MktUser[]): MktUserDto[] =>
  users.map(mapUserToDto);

/**
 * Map MktPaginatedUsers to MktUserListResponseDto
 * Creates a flat response structure matching the GraphQL schema
 */
export const mapPaginatedUsersToDto = (
  result: MktPaginatedUsers,
  message?: string,
): Omit<MktUserListResponseDto, 'error'> => ({
  success: true,
  users: mapUsersToDto(result.users),
  total: result.total,
  page: result.page,
  limit: result.limit,
  message,
});

/**
 * Create error response for user list
 */
export const createUserListErrorResponse = (
  error: string,
): MktUserListResponseDto => ({
  success: false,
  users: [],
  total: 0,
  page: 1,
  limit: 10,
  error,
});

/**
 * Map MktUserLoginHistory to MktUserLoginHistoryDto
 * Converts null values to undefined for GraphQL compatibility
 */
export const mapLoginHistoryToDto = (
  history: MktUserLoginHistory,
): MktUserLoginHistoryDto => ({
  userId: history.userId,
  lastLoginAt: history.lastLoginAt ?? undefined,
  lastLoginIp: history.lastLoginIp ?? undefined,
  lockedUntil: history.lockedUntil ?? undefined,
});
