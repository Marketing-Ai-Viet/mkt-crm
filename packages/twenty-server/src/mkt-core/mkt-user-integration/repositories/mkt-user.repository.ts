import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OAuth2HttpService } from 'src/mkt-core/oauth2-client/services/oauth2-http.service';
import { UserContext } from 'src/mkt-core/oauth2-client/types';
import {
  MktCreateUserInput,
  MktPaginatedUsers,
  MktUpdateUserInput,
  MktUser,
  MktUserApiResponse,
  MktUserLoginHistory,
  MktUserQueryParams,
} from 'src/mkt-core/mkt-user-integration/types';
import {
  MKT_USER_ENDPOINTS,
  MKT_USER_LOG_CONTEXT,
  MKT_USER_URL_BUILDER,
} from 'src/mkt-core/mkt-user-integration/constants';
import { MKT_USER_LOG_MESSAGES } from 'src/mkt-core/mkt-user-integration/message';
import { buildUrl, getErrorMessage } from 'src/mkt-core/utils';

/**
 * MktUserRepository - Data access layer for MKT User API
 *
 * Responsibilities:
 * - HTTP calls to MKT Server for users
 * - URL building
 * - Error handling for API calls
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 */
@Injectable()
export class MktUserRepository {
  private readonly logger = new Logger(`${MKT_USER_LOG_CONTEXT}:Repository`);
  private readonly apiBaseUrl: string;

  constructor(
    private readonly oauth2Http: OAuth2HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiBaseUrl =
      this.configService.get<string>('oauth2Client.serverUrl') ?? '';
  }

  /**
   * Fetch user by ID from MKT Server
   */
  async findById(
    userId: string,
    userContext?: UserContext,
  ): Promise<MktUser | null> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USER_START(userId));

    try {
      const url = buildUrl(
        MKT_USER_URL_BUILDER.getById(userId),
        undefined,
        this.apiBaseUrl,
      );

      const response = await this.oauth2Http.get<MktUserApiResponse<MktUser>>(
        url,
        undefined,
        userContext,
      );

      if (!response.success || !response.data) {
        this.logger.warn(MKT_USER_LOG_MESSAGES.FETCH_USER_NOT_FOUND(userId));

        return null;
      }

      this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USER_SUCCESS(userId));

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_USER_LOG_MESSAGES.CREATE_USER_FAILED(
          userId,
          getErrorMessage(error),
        ),
        { userId },
      );
      throw error;
    }
  }

  /**
   * Fetch user by email from MKT Server
   */
  async findByEmail(
    email: string,
    userContext?: UserContext,
  ): Promise<MktUser | null> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USER_BY_EMAIL_START(email));

    try {
      const url = buildUrl(
        MKT_USER_URL_BUILDER.getByEmail(email),
        undefined,
        this.apiBaseUrl,
      );

      const response = await this.oauth2Http.get<MktUserApiResponse<MktUser>>(
        url,
        undefined,
        userContext,
      );

      if (!response.success || !response.data) {
        this.logger.warn(
          MKT_USER_LOG_MESSAGES.FETCH_USER_BY_EMAIL_NOT_FOUND(email),
        );

        return null;
      }

      this.logger.debug(
        MKT_USER_LOG_MESSAGES.FETCH_USER_BY_EMAIL_SUCCESS(email),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user by email ${email}: ${getErrorMessage(error)}`,
        { email },
      );
      throw error;
    }
  }

  /**
   * Fetch users list with pagination from MKT Server
   */
  async findAll(
    params: MktUserQueryParams = {},
    userContext?: UserContext,
  ): Promise<MktPaginatedUsers> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_USERS_START, { params });

    try {
      const url = buildUrl(MKT_USER_ENDPOINTS.LIST, undefined, this.apiBaseUrl);

      const response = await this.oauth2Http.get<
        MktUserApiResponse<MktPaginatedUsers>
      >(url, { params }, userContext);

      if (!response.success || !response.data) {
        return { users: [], total: 0, page: 1, limit: 10 };
      }

      this.logger.debug(
        MKT_USER_LOG_MESSAGES.FETCH_USERS_SUCCESS(response.data.users.length),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch users: ${getErrorMessage(error)}`, {
        params,
      });
      throw error;
    }
  }

  /**
   * Create new user on MKT Server
   */
  async create(
    input: MktCreateUserInput,
    userContext?: UserContext,
  ): Promise<MktUser> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.CREATE_USER_START(input.email));

    try {
      const url = buildUrl(
        MKT_USER_ENDPOINTS.CREATE,
        undefined,
        this.apiBaseUrl,
      );

      const response = await this.oauth2Http.post<MktUserApiResponse<MktUser>>(
        url,
        input,
        undefined,
        userContext,
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to create user');
      }

      this.logger.log(
        MKT_USER_LOG_MESSAGES.CREATE_USER_SUCCESS(response.data.id),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_USER_LOG_MESSAGES.CREATE_USER_FAILED(
          input.email,
          getErrorMessage(error),
        ),
        { input },
      );
      throw error;
    }
  }

  /**
   * Update user on MKT Server
   */
  async update(
    userId: string,
    input: MktUpdateUserInput,
    userContext?: UserContext,
  ): Promise<MktUser> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.UPDATE_USER_START(userId));

    try {
      const url = buildUrl(
        MKT_USER_URL_BUILDER.update(userId),
        undefined,
        this.apiBaseUrl,
      );

      const response = await this.oauth2Http.patch<MktUserApiResponse<MktUser>>(
        url,
        input,
        undefined,
        userContext,
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to update user');
      }

      this.logger.log(MKT_USER_LOG_MESSAGES.UPDATE_USER_SUCCESS(userId));

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_USER_LOG_MESSAGES.UPDATE_USER_FAILED(
          userId,
          getErrorMessage(error),
        ),
        { userId, input },
      );
      throw error;
    }
  }

  /**
   * Fetch user login history by email from MKT Server
   */
  async getLoginHistoryByEmail(
    email: string,
    userContext?: UserContext,
  ): Promise<MktUserLoginHistory | null> {
    this.logger.debug(MKT_USER_LOG_MESSAGES.FETCH_LOGIN_HISTORY_START(email));

    try {
      const url = buildUrl(
        MKT_USER_URL_BUILDER.loginHistoryByEmail(email),
        undefined,
        this.apiBaseUrl,
      );

      const response = await this.oauth2Http.get<
        MktUserApiResponse<MktUserLoginHistory>
      >(url, undefined, userContext);

      if (!response.success || !response.data) {
        this.logger.warn(
          MKT_USER_LOG_MESSAGES.FETCH_LOGIN_HISTORY_NOT_FOUND(email),
        );

        return null;
      }

      this.logger.debug(
        MKT_USER_LOG_MESSAGES.FETCH_LOGIN_HISTORY_SUCCESS(email),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch login history for user ${email}: ${getErrorMessage(error)}`,
        { email },
      );
      throw error;
    }
  }
}
