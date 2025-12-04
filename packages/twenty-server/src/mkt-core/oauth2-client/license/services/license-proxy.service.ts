import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LICENSE_API_ENDPOINTS } from 'src/mkt-core/oauth2-client/constants';
import { OAuth2HttpService } from 'src/mkt-core/oauth2-client/services/oauth2-http.service';
import { UserContext } from 'src/mkt-core/oauth2-client/types';
import {
  LICENSE_OPERATION_MESSAGES,
  LICENSE_ERROR_MESSAGE_BUILDER,
} from 'src/mkt-core/oauth2-client/license/constants';
import {
  LicenseResponse,
  PaginatedLicenseResponse,
  LicenseValidationResult,
  LicenseAnalytics,
  LicenseApiResponse,
} from 'src/mkt-core/oauth2-client/license/types';
import {
  QueryLicensesParams,
  CreateLicensePayload,
  UpdateLicensePayload,
  ValidateLicensePayload,
  BulkCreateLicensePayload,
  BulkUpdateLicensePayload,
  BulkDeleteLicensePayload,
  LicenseAnalyticsQueryParams,
} from 'src/mkt-core/oauth2-client/license/dto';

const LOG_CONTEXT = 'LicenseProxyService';

@Injectable()
export class LicenseProxyService {
  private readonly logger = new Logger(LOG_CONTEXT);
  private readonly apiBaseUrl: string;

  constructor(
    private readonly oauth2Http: OAuth2HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiBaseUrl =
      this.configService.get<string>('oauth2Client.serverUrl') ?? '';
  }

  // ==================== READ OPERATIONS ====================

  async findAll(
    query: QueryLicensesParams,
    userContext?: UserContext,
  ): Promise<PaginatedLicenseResponse> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSES);

    this.logger.debug(LICENSE_OPERATION_MESSAGES.FETCH_ALL, { url, query });

    try {
      const response = await this.oauth2Http.get<
        LicenseApiResponse<PaginatedLicenseResponse>
      >(url, { params: query }, userContext);

      this.logger.log(LICENSE_OPERATION_MESSAGES.FETCH_ALL, {
        count: response.data.data.length,
        total: response.data.total,
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.fetchFailed(this.getErrorMessage(error)),
        { query },
      );
      throw error;
    }
  }

  async findById(
    id: string,
    userContext?: UserContext,
  ): Promise<LicenseResponse> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSE_DETAIL, { id });

    this.logger.debug(LICENSE_OPERATION_MESSAGES.FETCH_BY_ID, { id });

    try {
      const response = await this.oauth2Http.get<
        LicenseApiResponse<LicenseResponse>
      >(url, undefined, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.fetchFailed(this.getErrorMessage(error)),
        { id },
      );
      throw error;
    }
  }

  async findByLicenseKey(
    licenseKey: string,
    userContext?: UserContext,
  ): Promise<LicenseResponse> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSE_BY_KEY, {
      licenseKey,
    });

    this.logger.debug(LICENSE_OPERATION_MESSAGES.FETCH_BY_KEY, { licenseKey });

    try {
      const response = await this.oauth2Http.get<
        LicenseApiResponse<LicenseResponse>
      >(url, undefined, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.fetchFailed(this.getErrorMessage(error)),
        { licenseKey },
      );
      throw error;
    }
  }

  async validate(
    payload: ValidateLicensePayload,
    userContext?: UserContext,
  ): Promise<LicenseValidationResult> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSE_VALIDATE);

    this.logger.debug(LICENSE_OPERATION_MESSAGES.VALIDATE, {
      licenseKey: payload.licenseKey,
    });

    try {
      const response = await this.oauth2Http.post<
        LicenseApiResponse<LicenseValidationResult>
      >(url, payload, undefined, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.validationFailed(
          this.getErrorMessage(error),
        ),
        { licenseKey: payload.licenseKey },
      );
      throw error;
    }
  }

  // ==================== WRITE OPERATIONS ====================

  async create(
    payload: CreateLicensePayload,
    userContext?: UserContext,
  ): Promise<LicenseResponse> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSES);

    this.logger.debug(LICENSE_OPERATION_MESSAGES.CREATE, { payload });

    try {
      const response = await this.oauth2Http.post<
        LicenseApiResponse<LicenseResponse>
      >(url, payload, undefined, userContext);

      this.logger.log(LICENSE_OPERATION_MESSAGES.CREATE, {
        licenseId: response.data.id,
        createdBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.createFailed(this.getErrorMessage(error)),
        { payload },
      );
      throw error;
    }
  }

  async update(
    id: string,
    payload: UpdateLicensePayload,
    userContext?: UserContext,
  ): Promise<LicenseResponse> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSE_DETAIL, { id });

    this.logger.debug(LICENSE_OPERATION_MESSAGES.UPDATE, { id, payload });

    try {
      const response = await this.oauth2Http.patch<
        LicenseApiResponse<LicenseResponse>
      >(url, payload, undefined, userContext);

      this.logger.log(LICENSE_OPERATION_MESSAGES.UPDATE, {
        licenseId: id,
        updatedBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.updateFailed(this.getErrorMessage(error)),
        { id, payload },
      );
      throw error;
    }
  }

  async remove(id: string, userContext?: UserContext): Promise<void> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSE_DETAIL, { id });

    this.logger.warn(LICENSE_OPERATION_MESSAGES.DELETE, { id });

    try {
      await this.oauth2Http.delete(url, undefined, userContext);

      this.logger.warn(LICENSE_OPERATION_MESSAGES.DELETE, {
        licenseId: id,
        deletedBy: userContext?.userName ?? 'System',
      });
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.deleteFailed(this.getErrorMessage(error)),
        { id },
      );
      throw error;
    }
  }

  // ==================== ACTIVATE OPERATIONS ====================

  async activate(
    id: string,
    userContext?: UserContext,
  ): Promise<LicenseResponse> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSE_ACTIVATE, { id });

    this.logger.debug(LICENSE_OPERATION_MESSAGES.ACTIVATE, { id });

    try {
      const response = await this.oauth2Http.patch<
        LicenseApiResponse<LicenseResponse>
      >(url, undefined, undefined, userContext);

      this.logger.log(LICENSE_OPERATION_MESSAGES.ACTIVATE, {
        licenseId: id,
        activatedBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.activateFailed(
          this.getErrorMessage(error),
        ),
        { id },
      );
      throw error;
    }
  }

  async revoke(
    id: string,
    userContext?: UserContext,
  ): Promise<LicenseResponse> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSE_REVOKE, { id });

    this.logger.warn(LICENSE_OPERATION_MESSAGES.REVOKE, { id });

    try {
      const response = await this.oauth2Http.patch<
        LicenseApiResponse<LicenseResponse>
      >(url, undefined, undefined, userContext);

      this.logger.warn(LICENSE_OPERATION_MESSAGES.REVOKE, {
        licenseId: id,
        revokedBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.revokeFailed(this.getErrorMessage(error)),
        { id },
      );
      throw error;
    }
  }

  // ==================== BULK OPERATIONS ====================

  async bulkCreate(
    payload: BulkCreateLicensePayload,
    userContext?: UserContext,
  ): Promise<LicenseResponse[]> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSES_BULK);

    this.logger.debug(LICENSE_OPERATION_MESSAGES.BULK_CREATE, {
      count: payload.items.length,
    });

    try {
      const response = await this.oauth2Http.post<
        LicenseApiResponse<LicenseResponse[]>
      >(url, payload, undefined, userContext);

      this.logger.log(LICENSE_OPERATION_MESSAGES.BULK_CREATE, {
        count: response.data.length,
        createdBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.createFailed(this.getErrorMessage(error)),
        { itemCount: payload.items.length },
      );
      throw error;
    }
  }

  async bulkUpdate(
    payload: BulkUpdateLicensePayload,
    userContext?: UserContext,
  ): Promise<LicenseResponse[]> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSES_BULK);

    this.logger.debug(LICENSE_OPERATION_MESSAGES.BULK_UPDATE, {
      count: payload.items.length,
    });

    try {
      const response = await this.oauth2Http.patch<
        LicenseApiResponse<LicenseResponse[]>
      >(url, payload, undefined, userContext);

      this.logger.log(LICENSE_OPERATION_MESSAGES.BULK_UPDATE, {
        count: response.data.length,
        updatedBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.updateFailed(this.getErrorMessage(error)),
        { itemCount: payload.items.length },
      );
      throw error;
    }
  }

  async bulkDelete(
    payload: BulkDeleteLicensePayload,
    userContext?: UserContext,
  ): Promise<void> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSES_BULK);

    this.logger.warn(LICENSE_OPERATION_MESSAGES.BULK_DELETE, {
      count: payload.ids.length,
    });

    try {
      await this.oauth2Http.delete(url, { data: payload }, userContext);

      this.logger.warn(LICENSE_OPERATION_MESSAGES.BULK_DELETE, {
        count: payload.ids.length,
        deletedBy: userContext?.userName ?? 'System',
      });
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.deleteFailed(this.getErrorMessage(error)),
        { idCount: payload.ids.length },
      );
      throw error;
    }
  }

  // ==================== ANALYTICS ====================

  async getAnalytics(
    query: LicenseAnalyticsQueryParams,
    userContext?: UserContext,
  ): Promise<LicenseAnalytics> {
    const url = this.buildUrl(LICENSE_API_ENDPOINTS.LICENSES_ANALYTICS);

    this.logger.debug(LICENSE_OPERATION_MESSAGES.ANALYTICS, { query });

    try {
      const response = await this.oauth2Http.get<
        LicenseApiResponse<LicenseAnalytics>
      >(url, { params: query }, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        LICENSE_ERROR_MESSAGE_BUILDER.analyticsFailure(
          this.getErrorMessage(error),
        ),
        { query },
      );
      throw error;
    }
  }

  // ==================== HELPERS ====================

  private buildUrl(
    path: string,
    params?: Record<string, string | number>,
  ): string {
    let processedPath = path;

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        processedPath = processedPath.replace(`:${key}`, String(value));
      }
    }

    return `${this.apiBaseUrl}${processedPath}`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
