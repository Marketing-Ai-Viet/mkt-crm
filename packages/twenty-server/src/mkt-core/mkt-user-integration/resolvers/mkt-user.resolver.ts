import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  MktCreateUserInputDto,
  MktUpdateUserInputDto,
  MktUserQueryInput,
} from 'src/mkt-core/mkt-user-integration/dto/mkt-user.input';
import {
  MktUserResponseDto,
  MktUserListResponseDto,
  MktUserLoginHistoryResponseDto,
} from 'src/mkt-core/mkt-user-integration/dto/mkt-user.output';
import { MKT_USER_MESSAGES } from 'src/mkt-core/mkt-user-integration/message';
import { MktUserProxyService } from 'src/mkt-core/mkt-user-integration/services';
import {
  mapUserToDto,
  mapPaginatedUsersToDto,
  mapLoginHistoryToDto,
  createUserListErrorResponse,
} from 'src/mkt-core/mkt-user-integration/utils';
import { getErrorMessage } from 'src/mkt-core/utils';

/**
 * MktUserResolver - GraphQL resolver for MKT users
 *
 * Provides:
 * Queries:
 * - mktUser: Get single user by ID
 * - mktUserByEmail: Get single user by email
 * - mktUsers: Get paginated list of users
 * - mktUserLoginHistory: Get user login history by email
 *
 * Mutations:
 * - mktCreateUser: Create new user
 * - mktUpdateUser: Update existing user
 */
@Resolver()
export class MktUserResolver {
  constructor(private readonly userProxyService: MktUserProxyService) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get a single user by ID
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => MktUserResponseDto, {
    name: 'mktUser',
    description: 'Get a single MKT user by ID',
  })
  async getUser(
    @Args('userId', { type: () => String }) userId: string,
  ): Promise<MktUserResponseDto> {
    try {
      const user = await this.userProxyService.getUser(userId);

      return {
        success: true,
        data: mapUserToDto(user),
        message: MKT_USER_MESSAGES.SUCCESS.RETRIEVED,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Get a single user by email
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => MktUserResponseDto, {
    name: 'mktUserByEmail',
    description: 'Get a single MKT user by email',
  })
  async getUserByEmail(
    @Args('email', { type: () => String }) email: string,
  ): Promise<MktUserResponseDto> {
    try {
      const user = await this.userProxyService.getUserByEmail(email);

      return {
        success: true,
        data: mapUserToDto(user),
        message: MKT_USER_MESSAGES.SUCCESS.RETRIEVED,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Get user login history by email
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => MktUserLoginHistoryResponseDto, {
    name: 'mktUserLoginHistory',
    description: 'Get MKT user login history by email',
  })
  async getUserLoginHistory(
    @Args('email', { type: () => String }) email: string,
  ): Promise<MktUserLoginHistoryResponseDto> {
    try {
      const history =
        await this.userProxyService.getUserLoginHistoryByEmail(email);

      return {
        success: true,
        data: mapLoginHistoryToDto(history),
        message: MKT_USER_MESSAGES.SUCCESS.LOGIN_HISTORY_FETCHED,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Get paginated list of users
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => MktUserListResponseDto, {
    name: 'mktUsers',
    description: 'Get paginated list of MKT users',
  })
  async getUsers(
    @Args('input', { type: () => MktUserQueryInput, nullable: true })
    input?: MktUserQueryInput,
  ): Promise<MktUserListResponseDto> {
    try {
      const result = await this.userProxyService.getUsers({
        page: input?.page,
        limit: input?.limit,
        search: input?.search,
        status: input?.status,
      });

      return mapPaginatedUsersToDto(
        result,
        MKT_USER_MESSAGES.SUCCESS.LIST_FETCHED,
      );
    } catch (error) {
      return createUserListErrorResponse(getErrorMessage(error));
    }
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Create a new user
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => MktUserResponseDto, {
    name: 'mktCreateUser',
    description: 'Create a new MKT user',
  })
  async createUser(
    @Args('input', { type: () => MktCreateUserInputDto })
    input: MktCreateUserInputDto,
  ): Promise<MktUserResponseDto> {
    try {
      const user = await this.userProxyService.createUser({
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        fullName: input.fullName,
        phone: input.phone,
        code: input.code,
        roleId: input.roleId,
        status: input.status,
      });

      return {
        success: true,
        data: mapUserToDto(user),
        message: MKT_USER_MESSAGES.SUCCESS.CREATED,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Update an existing user
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => MktUserResponseDto, {
    name: 'mktUpdateUser',
    description: 'Update an existing MKT user',
  })
  async updateUser(
    @Args('userId', { type: () => String }) userId: string,
    @Args('input', { type: () => MktUpdateUserInputDto })
    input: MktUpdateUserInputDto,
  ): Promise<MktUserResponseDto> {
    try {
      const user = await this.userProxyService.updateUser(userId, {
        email: input.email,
        username: input.username,
        fullName: input.fullName,
        phone: input.phone,
        role: input.role,
        status: input.status,
        avatarUrl: input.avatarUrl,
      });

      return {
        success: true,
        data: mapUserToDto(user),
        message: MKT_USER_MESSAGES.SUCCESS.UPDATED,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }
}
