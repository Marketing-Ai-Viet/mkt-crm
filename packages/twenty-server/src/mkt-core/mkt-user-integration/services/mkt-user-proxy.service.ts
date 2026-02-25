import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import {
  MktCreateUserInput,
  MktPaginatedUsers,
  MktUpdateUserInput,
  MktUser,
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
 * - Uses Repository layer for data access (HTTP calls via mkt-auth-client)
 * - No caching (user data needs real-time accuracy)
 * - No UserContext needed (auth is centrally managed by MktAuthHttpService)
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
  async getUser(userId: string): Promise<MktUser> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USER_START(userId));

    const user = await this.userRepository.findById(userId);

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
  async getUserOrNull(userId: string): Promise<MktUser | null> {
    return this.userRepository.findById(userId);
  }

  /**
   * Get user by email
   * @throws NotFoundException if user not found
   */
  async getUserByEmail(email: string): Promise<MktUser> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USER_BY_EMAIL_START(email));

    const user = await this.userRepository.findByEmail(email);

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
  async getUserByEmailOrNull(email: string): Promise<MktUser | null> {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Get paginated users list
   */
  async getUsers(params: MktUserQueryParams = {}): Promise<MktPaginatedUsers> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USERS_START, { params });

    const result = await this.userRepository.findAll(params);

    this.logger.debug(
      MKT_USER_LOG_MESSAGES.FETCH_USERS_SUCCESS(result.data.length),
    );

    return result;
  }

  /**
   * Create new user via Better Auth sign-up
   */
  async createUser(input: MktCreateUserInput): Promise<MktUser> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.CREATE_USER_START(input.email));

    const user = await this.userRepository.create(input);

    this.logger.log(MKT_USER_LOG_MESSAGES.CREATE_USER_SUCCESS(user.id));

    return user;
  }

  /**
   * Update user profile
   */
  async updateUser(input: MktUpdateUserInput): Promise<MktUser> {
    this.logger.debug('Updating user profile');

    const user = await this.userRepository.update(input);

    this.logger.log(MKT_USER_LOG_MESSAGES.UPDATE_USER_SUCCESS(user.id));

    return user;
  }

  /**
   * Delete user by ID
   * @throws NotFoundException if user not found
   */
  async deleteUser(userId: string): Promise<void> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.DELETE_USER_START(userId));

    // Verify user exists first
    await this.getUser(userId);

    await this.userRepository.delete(userId);

    this.logger.log(MKT_USER_LOG_MESSAGES.DELETE_USER_SUCCESS(userId));
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if user exists by ID
   */
  async userExists(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);

    return user !== null;
  }

  /**
   * Check if user exists by email
   */
  async userExistsByEmail(email: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);

    return user !== null;
  }
}
