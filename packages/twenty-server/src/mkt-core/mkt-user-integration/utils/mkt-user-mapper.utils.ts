import {
  MktUserDto,
  MktUserListResponseDto,
} from 'src/mkt-core/mkt-user-integration/dto/mkt-user.output';
import {
  MktPaginatedUsers,
  MktUser,
} from 'src/mkt-core/mkt-user-integration/types';

/**
 * Map MktUser to MktUserDto
 * Converts null values to undefined for GraphQL compatibility
 */
export const mapUserToDto = (user: MktUser): MktUserDto => ({
  id: user.id,
  role: user.role,
  username: user.username,
  email: user.email,
  firstName: user.firstName || undefined,
  lastName: user.lastName || undefined,
  image: user.image ?? undefined,
  bio: user.bio ?? undefined,
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
  data: mapUsersToDto(result.data),
  total: result.total,
  page: result.page,
  limit: result.limit,
  totalPages: result.totalPages,
  message,
});

/**
 * Create error response for user list
 */
export const createUserListErrorResponse = (
  error: string,
): MktUserListResponseDto => ({
  success: false,
  data: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  error,
});
