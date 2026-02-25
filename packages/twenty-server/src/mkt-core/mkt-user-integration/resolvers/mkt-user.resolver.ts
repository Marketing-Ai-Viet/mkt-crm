import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  MktCreateUserInputDto,
  MktUpdateUserInputDto,
} from 'src/mkt-core/mkt-user-integration/dto/mkt-user.input';
import { MktUserResponseDto } from 'src/mkt-core/mkt-user-integration/dto/mkt-user.output';
import { MKT_USER_MESSAGES } from 'src/mkt-core/mkt-user-integration/message';
import { MktUserProxyService } from 'src/mkt-core/mkt-user-integration/services';
import { mapUserToDto } from 'src/mkt-core/mkt-user-integration/utils';
import { getErrorMessage } from 'src/mkt-core/utils';

/**
 * MktUserResolver - GraphQL resolver for MKT users
 *
 * Uses mkt-auth-client (Better Auth) for authentication.
 * Auth is centrally managed by MktAuthHttpService.
 *
 * Provides:
 * Queries:
 * - mktUser: Get single user by ID
 * - mktUserByEmail: Get single user by email
 *
 * Mutations:
 * - mktCreateUser: Create new user via Better Auth sign-up
 * - mktUpdateUser: Update user profile
 * - mktDeleteUser: Delete user (Admin only)
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard)
export class MktUserResolver {
  constructor(private readonly userProxyService: MktUserProxyService) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get a single user by ID
   */
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

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Create a new user via Better Auth sign-up
   */
  @Mutation(() => MktUserResponseDto, {
    name: 'mktCreateUser',
    description: 'Create a new MKT user via Better Auth sign-up',
  })
  async createUser(
    @Args('input', { type: () => MktCreateUserInputDto })
    input: MktCreateUserInputDto,
  ): Promise<MktUserResponseDto> {
    try {
      const user = await this.userProxyService.createUser({
        email: input.email,
        password: input.password,
        name: input.name,
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
   * Update user profile
   */
  @Mutation(() => MktUserResponseDto, {
    name: 'mktUpdateUser',
    description: 'Update MKT user profile',
  })
  async updateUser(
    @Args('input', { type: () => MktUpdateUserInputDto })
    input: MktUpdateUserInputDto,
  ): Promise<MktUserResponseDto> {
    try {
      const user = await this.userProxyService.updateUser({
        username: input.username,
        firstName: input.firstName,
        lastName: input.lastName,
        image: input.image,
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

  /**
   * Delete a user (Admin role only)
   */
  @Mutation(() => MktUserResponseDto, {
    name: 'mktDeleteUser',
    description: 'Delete an MKT user (Admin only)',
  })
  async deleteUser(
    @Args('userId', { type: () => String }) userId: string,
  ): Promise<MktUserResponseDto> {
    try {
      await this.userProxyService.deleteUser(userId);

      return {
        success: true,
        message: MKT_USER_MESSAGES.SUCCESS.DELETED,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }
}
