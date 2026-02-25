import { Injectable, Logger } from '@nestjs/common';

import { MktAuthHttpService } from 'src/mkt-core/mkt-auth-client';
import {
  AdminUserDto,
  MktCreateUserInput,
  MktPaginatedUsers,
  MktUpdateUserInput,
  MktUser,
  MktUserQueryParams,
} from 'src/mkt-core/mkt-user-integration/types';
import {
  MKT_USER_ENDPOINTS,
  MKT_USER_ERROR_BUILDER,
  MKT_USER_LOG_CONTEXT,
  MKT_USER_QUERY_DEFAULTS,
} from 'src/mkt-core/mkt-user-integration/constants';
import { MKT_USER_LOG_MESSAGES } from 'src/mkt-core/mkt-user-integration/message';
import { getErrorMessage } from 'src/mkt-core/utils';

// ============================================
// MAPPER
// ============================================

/**
 * Map AdminUserDto (Admin API) -> MktUser (internal type)
 */
const mapAdminUserToMktUser = (dto: AdminUserDto): MktUser => ({
  id: dto.id,
  email: dto.email,
  username: dto.username,
  firstName: dto.firstName ?? '',
  lastName: dto.lastName ?? '',
  role: dto.role,
  image: dto.image ?? null,
  bio: dto.bio ?? null,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
});

// ============================================
// REPOSITORY
// ============================================

/**
 * MktUserRepository - Data access layer for MKT User API
 *
 * Uses MktAuthHttpService (Better Auth) to call MKT Admin Backend API.
 *
 * NOTE: MktAuthHttpService.unwrapResponse() auto-unwraps { data: T } responses.
 * For paginated endpoints returning { data: T[], pagination: {...} },
 * the unwrapped result is T[] (array only, pagination is lost).
 * Repositories must type the response as T[] and build pagination locally.
 *
 * Responsibilities:
 * - HTTP calls to MKT Server for users
 * - Response mapping (AdminUserDto -> MktUser)
 * - Error handling for API calls
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 */
@Injectable()
export class MktUserRepository {
  private readonly logger = new Logger(`${MKT_USER_LOG_CONTEXT}:Repository`);

  constructor(private readonly authHttp: MktAuthHttpService) {}

  /**
   * Fetch user by ID from MKT Server
   */
  async findById(userId: string): Promise<MktUser | null> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USER_START(userId));

    try {
      const endpoint = MKT_USER_ENDPOINTS.GET_BY_ID.replace(':id', userId);

      const dto = await this.authHttp.get<AdminUserDto>(endpoint);

      this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USER_SUCCESS(userId));

      return mapAdminUserToMktUser(dto);
    } catch (error) {
      this.logger.error(
        MKT_USER_ERROR_BUILDER.fetchFailed(getErrorMessage(error)),
        { userId },
      );

      throw error;
    }
  }

  /**
   * Fetch user by email from MKT Server
   *
   * Admin API has no search/filter param on /api/v1/user/all,
   * so we fetch all users and find the exact email match locally.
   *
   * NOTE: unwrapResponse auto-unwraps { data: [...], pagination } -> AdminUserDto[]
   */
  async findByEmail(email: string): Promise<MktUser | null> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USER_BY_EMAIL_START(email));

    try {
      const items = await this.authHttp.get<AdminUserDto[]>(
        MKT_USER_ENDPOINTS.LIST,
        { params: { page: 1, limit: MKT_USER_QUERY_DEFAULTS.MAX_LIMIT } },
      );

      // Find exact email match from results
      const matched = items.find((u) => u.email === email);

      if (!matched) {
        this.logger.warn(
          MKT_USER_LOG_MESSAGES.FETCH_USER_BY_EMAIL_NOT_FOUND(email),
        );

        return null;
      }

      this.logger.debug(
        MKT_USER_LOG_MESSAGES.FETCH_USER_BY_EMAIL_SUCCESS(email),
      );

      return mapAdminUserToMktUser(matched);
    } catch (error) {
      this.logger.error(
        MKT_USER_ERROR_BUILDER.fetchByEmailFailed(getErrorMessage(error)),
        { email },
      );

      throw error;
    }
  }

  /**
   * Fetch users list with pagination from MKT Server
   *
   * NOTE: Admin API /api/v1/user/all only supports page + limit params (no search).
   * Search filtering is done locally after fetching.
   * unwrapResponse auto-unwraps { data: [...], pagination } -> AdminUserDto[]
   */
  async findAll(params: MktUserQueryParams = {}): Promise<MktPaginatedUsers> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USERS_START, { params });

    const page = params.page ?? MKT_USER_QUERY_DEFAULTS.PAGE;
    const limit = params.limit ?? MKT_USER_QUERY_DEFAULTS.LIMIT;

    try {
      const items = await this.authHttp.get<AdminUserDto[]>(
        MKT_USER_ENDPOINTS.LIST,
        { params: { page, limit } },
      );

      let data = items.map(mapAdminUserToMktUser);

      // Local search filtering (API does not support search param)
      if (params.search) {
        const searchLower = params.search.toLowerCase();

        data = data.filter(
          (u) =>
            u.email.toLowerCase().includes(searchLower) ||
            u.username.toLowerCase().includes(searchLower) ||
            u.firstName.toLowerCase().includes(searchLower) ||
            u.lastName.toLowerCase().includes(searchLower),
        );
      }

      this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USERS_SUCCESS(data.length));

      return {
        data,
        total: data.length,
        page,
        limit,
        totalPages: data.length < limit ? page : page + 1,
      };
    } catch (error) {
      this.logger.error(
        MKT_USER_ERROR_BUILDER.fetchFailed(getErrorMessage(error)),
        { params },
      );

      throw error;
    }
  }

  /**
   * Create new user via Better Auth sign-up endpoint
   * POST /api/auth/sign-up/email
   */
  async create(input: MktCreateUserInput): Promise<MktUser> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.CREATE_USER_START(input.email));

    try {
      const dto = await this.authHttp.post<AdminUserDto>(
        MKT_USER_ENDPOINTS.SIGN_UP,
        {
          email: input.email,
          password: input.password,
          name: input.name,
        },
      );

      this.logger.log(MKT_USER_LOG_MESSAGES.CREATE_USER_SUCCESS(dto.id));

      return mapAdminUserToMktUser(dto);
    } catch (error) {
      this.logger.error(
        MKT_USER_ERROR_BUILDER.createFailed(getErrorMessage(error)),
        { email: input.email },
      );

      throw error;
    }
  }

  /**
   * Update current user's profile
   * PATCH /api/v1/user/profile
   */
  async update(input: MktUpdateUserInput): Promise<MktUser> {
    this.logger.debug('Updating user profile');

    try {
      const dto = await this.authHttp.patch<AdminUserDto>(
        MKT_USER_ENDPOINTS.UPDATE_PROFILE,
        {
          username: input.username,
          firstName: input.firstName,
          lastName: input.lastName,
          image: input.image,
        },
      );

      this.logger.log(MKT_USER_LOG_MESSAGES.UPDATE_USER_SUCCESS(dto.id));

      return mapAdminUserToMktUser(dto);
    } catch (error) {
      this.logger.error(
        MKT_USER_ERROR_BUILDER.updateFailed(getErrorMessage(error)),
      );

      throw error;
    }
  }

  /**
   * Delete user by ID (Admin role only)
   * DELETE /api/v1/user/:id
   */
  async delete(userId: string): Promise<void> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.DELETE_USER_START(userId));

    try {
      const endpoint = MKT_USER_ENDPOINTS.DELETE.replace(':id', userId);

      await this.authHttp.delete<void>(endpoint);

      this.logger.log(MKT_USER_LOG_MESSAGES.DELETE_USER_SUCCESS(userId));
    } catch (error) {
      this.logger.error(
        MKT_USER_ERROR_BUILDER.deleteFailed(getErrorMessage(error)),
        { userId },
      );

      throw error;
    }
  }
}
