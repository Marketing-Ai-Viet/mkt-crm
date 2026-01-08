import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OAuth2HttpService } from 'src/mkt-core/oauth2-client/services/oauth2-http.service';
import { UserContext } from 'src/mkt-core/oauth2-client/types';
import {
  MKT_LICENSE_ENDPOINTS,
  MKT_LICENSE_ERROR_BUILDER,
} from 'src/mkt-core/mkt-license-integration/constants';
import { MKT_LICENSE_MESSAGES } from 'src/mkt-core/mkt-license-integration/message';
import {
  MktLicenseResponse,
  MktPaginatedLicenseResponse,
  MktLicenseValidationResult,
  MktLicenseAnalytics,
  MktLicenseApiResponse,
  MktQueryLicensesParams,
  MktCreateLicensePayload,
  MktCreateTrialLicensePayload,
  MktUpgradeTrialLicensePayload,
  MktUpdateLicensePayload,
  MktValidateLicensePayload,
  MktBulkCreateLicensePayload,
  MktBulkUpdateLicensePayload,
  MktBulkDeleteLicensePayload,
  MktLicenseAnalyticsQueryParams,
  MktFindTrialByProductParams,
  MktCheckLicenseExistsResponse,
  MKT_LICENSE_TYPE,
} from 'src/mkt-core/mkt-license-integration/types';
import { buildFullUrl } from 'src/mkt-core/utils/url-builder.util';

/**
 * MKT License Repository
 *
 * Data Access Layer - handles all HTTP calls to MKT Server License API.
 * This repository is responsible for:
 * - Making HTTP requests to the License OAuth endpoints
 * - Error logging
 * - URL building
 *
 * NOTE: No caching or business logic here. Use MktLicenseProxyService for that.
 */
@Injectable()
export class MktLicenseRepository {
  private readonly logger = new Logger(MktLicenseRepository.name);
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
    query: MktQueryLicensesParams,
    userContext?: UserContext,
  ): Promise<MktPaginatedLicenseResponse> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSES);

    this.logger.debug(MKT_LICENSE_MESSAGES.OPERATION.FETCH_ALL, { url, query });

    try {
      const response = await this.oauth2Http.get<
        MktLicenseApiResponse<MktPaginatedLicenseResponse>
      >(url, { params: query }, userContext);

      this.logger.log(MKT_LICENSE_MESSAGES.OPERATION.FETCH_ALL, {
        count: response.data.data.length,
        total: response.data.total,
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.fetchAllFailed(this.getErrorMessage(error)),
        { query },
      );
      throw error;
    }
  }

  async findById(
    id: string,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSE_DETAIL, { id });

    this.logger.debug(MKT_LICENSE_MESSAGES.OPERATION.FETCH_BY_ID, { id });

    try {
      const response = await this.oauth2Http.get<
        MktLicenseApiResponse<MktLicenseResponse>
      >(url, undefined, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.fetchFailed(this.getErrorMessage(error)),
        { id },
      );
      throw error;
    }
  }

  async findByLicenseKey(
    licenseKey: string,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSE_BY_KEY, {
      licenseKey,
    });

    this.logger.debug(MKT_LICENSE_MESSAGES.OPERATION.FETCH_BY_KEY, {
      licenseKey,
    });

    try {
      const response = await this.oauth2Http.get<
        MktLicenseApiResponse<MktLicenseResponse>
      >(url, undefined, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.fetchFailed(this.getErrorMessage(error)),
        { licenseKey },
      );
      throw error;
    }
  }

  /**
   * Check if a license exists by productId and email.
   *
   * Uses the optimized check-exists API endpoint.
   * POST /api/oauth/licenses/check-exists
   */
  async checkLicenseExists(
    params: MktFindTrialByProductParams,
    userContext?: UserContext,
  ): Promise<MktCheckLicenseExistsResponse> {
    const { productId, email } = params;
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSE_CHECK_EXISTS);

    this.logger.debug('Checking license exists', { productId, email });

    try {
      const response = await this.oauth2Http.post<
        MktLicenseApiResponse<MktCheckLicenseExistsResponse>
      >(url, { productId, email }, undefined, userContext);

      this.logger.debug('Check license exists result', {
        productId,
        email,
        exists: response.data.exists,
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to check license exists: ${this.getErrorMessage(error)}`,
        { productId, email },
      );

      // Return not exists on error (allow trial creation to proceed)
      return { exists: false, license: null };
    }
  }

  /**
   * Find existing trial license by product and email.
   *
   * Uses the check-exists API and filters for trial licenses only.
   * Returns the license if it's a trial, or null otherwise.
   *
   * Business Rule: 1 user can only have 1 active trial per product
   */
  async findTrialByProductAndEmail(
    params: MktFindTrialByProductParams,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse | null> {
    const { productId, email } = params;

    this.logger.debug('Finding existing trial license', { productId, email });

    const result = await this.checkLicenseExists(params, userContext);

    if (!result.exists || !result.license) {
      this.logger.debug(
        `No existing license found for product ${productId} and email ${email}`,
      );

      return null;
    }

    // Check if it's a trial license
    if (result.license.type !== MKT_LICENSE_TYPE.TRIAL) {
      this.logger.debug(
        `Found license ${result.license.id} but it's not a trial (type: ${result.license.type})`,
      );

      return null;
    }

    this.logger.log(
      `Found existing trial license ${result.license.id} for product ${productId}`,
    );

    return result.license;
  }

  async validate(
    payload: MktValidateLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseValidationResult> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSE_VALIDATE);

    this.logger.debug(MKT_LICENSE_MESSAGES.OPERATION.VALIDATE, {
      licenseKey: payload.licenseKey,
    });

    try {
      const response = await this.oauth2Http.post<
        MktLicenseApiResponse<MktLicenseValidationResult>
      >(url, payload, undefined, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.validationFailed(this.getErrorMessage(error)),
        { licenseKey: payload.licenseKey },
      );
      throw error;
    }
  }

  // ==================== WRITE OPERATIONS ====================

  async create(
    payload: MktCreateLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSES);

    this.logger.debug(MKT_LICENSE_MESSAGES.SUCCESS.CREATED, { payload });

    try {
      const response = await this.oauth2Http.post<
        MktLicenseApiResponse<MktLicenseResponse>
      >(url, payload, undefined, userContext);

      this.logger.log(MKT_LICENSE_MESSAGES.SUCCESS.CREATED, {
        licenseId: response.data.id,
        createdBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.createFailed(this.getErrorMessage(error)),
        { payload },
      );
      throw error;
    }
  }

  /**
   * Create a trial license on MKT Server
   *
   * Trial license does NOT require productPackageId.
   * Default: maxDevices = 1 (single device only)
   */
  async createTrial(
    payload: MktCreateTrialLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSE_TRIAL);

    this.logger.debug('Creating trial license', {
      productId: payload.productId,
      email: payload.email,
      trialDays: payload.trialDays,
      maxDevices: payload.maxDevices ?? 1,
    });

    try {
      const response = await this.oauth2Http.post<
        MktLicenseApiResponse<MktLicenseResponse>
      >(url, payload, undefined, userContext);

      this.logger.log('Trial license created', {
        licenseId: response.data.id,
        licenseKey: response.data.licenseKey,
        trialDays: payload.trialDays,
        maxDevices: payload.maxDevices ?? 1,
        createdBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.createFailed(this.getErrorMessage(error)),
        { payload },
      );
      throw error;
    }
  }

  async update(
    id: string,
    payload: MktUpdateLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSE_DETAIL, { id });

    this.logger.debug(MKT_LICENSE_MESSAGES.SUCCESS.UPDATED, { id, payload });

    try {
      const response = await this.oauth2Http.patch<
        MktLicenseApiResponse<MktLicenseResponse>
      >(url, payload, undefined, userContext);

      this.logger.log(MKT_LICENSE_MESSAGES.SUCCESS.UPDATED, {
        licenseId: id,
        updatedBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.updateFailed(this.getErrorMessage(error)),
        { id, payload },
      );
      throw error;
    }
  }

  async remove(id: string, userContext?: UserContext): Promise<void> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSE_DETAIL, { id });

    this.logger.warn(MKT_LICENSE_MESSAGES.SUCCESS.DELETED, { id });

    try {
      await this.oauth2Http.delete(url, undefined, userContext);

      this.logger.warn(MKT_LICENSE_MESSAGES.SUCCESS.DELETED, {
        licenseId: id,
        deletedBy: userContext?.userName ?? 'System',
      });
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.deleteFailed(this.getErrorMessage(error)),
        { id },
      );
      throw error;
    }
  }

  // ==================== ACTIVATE OPERATIONS ====================

  async activate(
    id: string,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSE_ACTIVATE, { id });

    this.logger.debug(MKT_LICENSE_MESSAGES.OPERATION.ACTIVATE, { id });

    try {
      const response = await this.oauth2Http.patch<
        MktLicenseApiResponse<MktLicenseResponse>
      >(url, undefined, undefined, userContext);

      this.logger.log(MKT_LICENSE_MESSAGES.SUCCESS.ACTIVATED, {
        licenseId: id,
        activatedBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.activateFailed(this.getErrorMessage(error)),
        { id },
      );
      throw error;
    }
  }

  async revoke(
    id: string,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSE_REVOKE, { id });

    this.logger.warn(MKT_LICENSE_MESSAGES.OPERATION.REVOKE, { id });

    try {
      const response = await this.oauth2Http.patch<
        MktLicenseApiResponse<MktLicenseResponse>
      >(url, undefined, undefined, userContext);

      this.logger.warn(MKT_LICENSE_MESSAGES.SUCCESS.REVOKED, {
        licenseId: id,
        revokedBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.revokeFailed(this.getErrorMessage(error)),
        { id },
      );
      throw error;
    }
  }

  /**
   * Upgrade a trial license to official license
   *
   * This is an atomic operation on MKT Server that:
   * 1. Validates the trial license
   * 2. Converts it to official license with productPackageId
   * 3. Updates license type, duration, maxDevices
   *
   * The license key remains the same after upgrade.
   */
  async upgradeTrial(
    id: string,
    payload: MktUpgradeTrialLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSE_UPGRADE, { id });

    this.logger.debug('Upgrading trial license', {
      licenseId: id,
      productPackageId: payload.productPackageId,
      maxDevices: payload.maxDevices,
    });

    try {
      const response = await this.oauth2Http.patch<
        MktLicenseApiResponse<MktLicenseResponse>
      >(url, payload, undefined, userContext);

      this.logger.log('Trial license upgraded to official', {
        licenseId: id,
        newType: response.data.type,
        productPackageId: payload.productPackageId,
        upgradedBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to upgrade trial license: ${this.getErrorMessage(error)}`,
        { id, payload },
      );
      throw error;
    }
  }

  // ==================== BULK OPERATIONS ====================

  async bulkCreate(
    payload: MktBulkCreateLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse[]> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSES_BULK);

    this.logger.debug(MKT_LICENSE_MESSAGES.OPERATION.BULK_CREATE, {
      count: payload.items.length,
    });

    try {
      const response = await this.oauth2Http.post<
        MktLicenseApiResponse<MktLicenseResponse[]>
      >(url, payload, undefined, userContext);

      this.logger.log(MKT_LICENSE_MESSAGES.SUCCESS.BULK_CREATED, {
        count: response.data.length,
        createdBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.createFailed(this.getErrorMessage(error)),
        { itemCount: payload.items.length },
      );
      throw error;
    }
  }

  async bulkUpdate(
    payload: MktBulkUpdateLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse[]> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSES_BULK);

    this.logger.debug(MKT_LICENSE_MESSAGES.OPERATION.BULK_UPDATE, {
      count: payload.items.length,
    });

    try {
      const response = await this.oauth2Http.patch<
        MktLicenseApiResponse<MktLicenseResponse[]>
      >(url, payload, undefined, userContext);

      this.logger.log(MKT_LICENSE_MESSAGES.SUCCESS.BULK_UPDATED, {
        count: response.data.length,
        updatedBy: userContext?.userName ?? 'System',
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.updateFailed(this.getErrorMessage(error)),
        { itemCount: payload.items.length },
      );
      throw error;
    }
  }

  async bulkDelete(
    payload: MktBulkDeleteLicensePayload,
    userContext?: UserContext,
  ): Promise<void> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSES_BULK);

    this.logger.warn(MKT_LICENSE_MESSAGES.OPERATION.BULK_DELETE, {
      count: payload.ids.length,
    });

    try {
      await this.oauth2Http.delete(url, { data: payload }, userContext);

      this.logger.warn(MKT_LICENSE_MESSAGES.SUCCESS.BULK_DELETED, {
        count: payload.ids.length,
        deletedBy: userContext?.userName ?? 'System',
      });
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.deleteFailed(this.getErrorMessage(error)),
        { idCount: payload.ids.length },
      );
      throw error;
    }
  }

  // ==================== ANALYTICS ====================

  async getAnalytics(
    query: MktLicenseAnalyticsQueryParams,
    userContext?: UserContext,
  ): Promise<MktLicenseAnalytics> {
    const url = this.buildUrl(MKT_LICENSE_ENDPOINTS.LICENSES_ANALYTICS);

    this.logger.debug(MKT_LICENSE_MESSAGES.OPERATION.ANALYTICS, { query });

    try {
      const response = await this.oauth2Http.get<
        MktLicenseApiResponse<MktLicenseAnalytics>
      >(url, { params: query }, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_LICENSE_ERROR_BUILDER.analyticsFailure(this.getErrorMessage(error)),
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
    return buildFullUrl(this.apiBaseUrl, path, params);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
