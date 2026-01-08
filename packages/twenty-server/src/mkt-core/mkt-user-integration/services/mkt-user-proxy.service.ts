import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { UserContext } from 'src/mkt-core/oauth2-client/types';
import {
  MktCreateUserInput,
  MktPaginatedUsers,
  MktUpdateUserInput,
  MktUser,
  MktUserLoginHistory,
  MktUserQueryParams,
} from 'src/mkt-core/mkt-user-integration/types';
import { MKT_USER_LOG_CONTEXT } from 'src/mkt-core/mkt-user-integration/constants';
import {
  MKT_USER_LOG_MESSAGES,
  MKT_USER_MESSAGES,
} from 'src/mkt-core/mkt-user-integration/message';
import { MktUserRepository } from 'src/mkt-core/mkt-user-integration/repositories';

/**
 * MktUserProxyService - Facade service for user operations
 *
 * Responsibilities:
 * - Orchestrate repository layer
 * - Provide unified API for user operations
 * - Handle business logic validation
 *
 * Architecture:
 * - Uses Repository layer for data access (HTTP calls)
 * - No caching (user data needs real-time accuracy)
 */
@Injectable()
export class MktUserProxyService {
  private readonly logger = new Logger(MKT_USER_LOG_CONTEXT);

  constructor(private readonly userRepository: MktUserRepository) {}

  // ============================================
  // USER OPERATIONS
  // ============================================

  /**
   * Get user by ID
   * @throws NotFoundException if user not found
   */
  async getUser(userId: string, userContext?: UserContext): Promise<MktUser> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USER_START(userId));

    const user = await this.userRepository.findById(userId, userContext);

    if (!user) {
      throw new NotFoundException(
        MKT_USER_MESSAGES.error('NOT_FOUND', { id: userId }),
      );
    }

    return user;
  }

  /**
   * Get user by ID (nullable version - no exception)
   * Returns null if user not found
   */
  async getUserOrNull(
    userId: string,
    userContext?: UserContext,
  ): Promise<MktUser | null> {
    return this.userRepository.findById(userId, userContext);
  }

  /**
   * Get user by email
   * @throws NotFoundException if user not found
   */
  async getUserByEmail(
    email: string,
    userContext?: UserContext,
  ): Promise<MktUser> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USER_BY_EMAIL_START(email));

    const user = await this.userRepository.findByEmail(email, userContext);

    if (!user) {
      throw new NotFoundException(
        MKT_USER_MESSAGES.ERROR.NOT_FOUND_BY_EMAIL.replace('{email}', email),
      );
    }

    return user;
  }

  /**
   * Get user by email (nullable version - no exception)
   * Returns null if user not found
   */
  async getUserByEmailOrNull(
    email: string,
    userContext?: UserContext,
  ): Promise<MktUser | null> {
    return this.userRepository.findByEmail(email, userContext);
  }

  /**
   * Get paginated users list
   */
  async getUsers(
    params: MktUserQueryParams = {},
    userContext?: UserContext,
  ): Promise<MktPaginatedUsers> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USERS_START, { params });

    const result = await this.userRepository.findAll(params, userContext);

    this.logger.debug(
      MKT_USER_LOG_MESSAGES.FETCH_USERS_SUCCESS(result.users.length),
    );

    return result;
  }

  /**
   * Create new user
   */
  async createUser(
    input: MktCreateUserInput,
    userContext?: UserContext,
  ): Promise<MktUser> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.CREATE_USER_START(input.email));

    const user = await this.userRepository.create(input, userContext);

    this.logger.log(MKT_USER_LOG_MESSAGES.CREATE_USER_SUCCESS(user.id));

    return user;
  }

  /**
   * Update user
   * @throws NotFoundException if user not found
   */
  async updateUser(
    userId: string,
    input: MktUpdateUserInput,
    userContext?: UserContext,
  ): Promise<MktUser> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.UPDATE_USER_START(userId));

    // Verify user exists first
    await this.getUser(userId, userContext);

    const user = await this.userRepository.update(userId, input, userContext);

    this.logger.log(MKT_USER_LOG_MESSAGES.UPDATE_USER_SUCCESS(userId));

    return user;
  }

  // ============================================
  // LOGIN HISTORY OPERATIONS
  // ============================================

  /**
   * Get user login history by email
   * @throws NotFoundException if user or login history not found
   */
  async getUserLoginHistoryByEmail(
    email: string,
    userContext?: UserContext,
  ): Promise<MktUserLoginHistory> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_LOGIN_HISTORY_START(email));

    // Verify user exists first
    await this.getUserByEmail(email, userContext);

    const history = await this.userRepository.getLoginHistoryByEmail(
      email,
      userContext,
    );

    if (!history) {
      throw new NotFoundException(
        MKT_USER_MESSAGES.ERROR.LOGIN_HISTORY_NOT_FOUND.replace(
          '{userId}',
          email,
        ),
      );
    }

    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_LOGIN_HISTORY_SUCCESS(email));

    return history;
  }

  /**
   * Get user login history by email (nullable version - no exception)
   * Returns null if not found
   */
  async getUserLoginHistoryByEmailOrNull(
    email: string,
    userContext?: UserContext,
  ): Promise<MktUserLoginHistory | null> {
    // First check if user exists
    const user = await this.getUserByEmailOrNull(email, userContext);

    if (!user) {
      return null;
    }

    return this.userRepository.getLoginHistoryByEmail(email, userContext);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if user exists by ID
   */
  async userExists(
    userId: string,
    userContext?: UserContext,
  ): Promise<boolean> {
    const user = await this.userRepository.findById(userId, userContext);

    return user !== null;
  }

  /**
   * Check if user exists by email
   */
  async userExistsByEmail(
    email: string,
    userContext?: UserContext,
  ): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email, userContext);

    return user !== null;
  }
}
