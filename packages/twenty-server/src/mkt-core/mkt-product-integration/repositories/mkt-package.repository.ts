import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OAuth2HttpService } from 'src/mkt-core/oauth2-client/services/oauth2-http.service';
import { UserContext } from 'src/mkt-core/oauth2-client/types';
import {
  MktApiResponse,
  MktPaginatedData,
  MktProductPackage,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  MKT_PRODUCT_ENDPOINTS,
  MKT_PRODUCT_ERROR_BUILDER,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MKT_PACKAGE_MESSAGES } from 'src/mkt-core/mkt-product-integration/message';
import { buildUrl, getErrorMessage } from 'src/mkt-core/utils';

/**
 * MktPackageRepository - Data access layer for MKT Package API
 *
 * Responsibilities:
 * - HTTP calls to MKT Server for packages
 * - URL building
 * - Error handling for API calls
 *
 * Does NOT handle:
 * - Caching (handled by CacheService)
 * - Business logic (handled by Service layer)
 */
@Injectable()
export class MktPackageRepository {
  private readonly logger = new Logger(`${MKT_PRODUCT_LOG_CONTEXT}:Repository`);
  private readonly apiBaseUrl: string;

  constructor(
    private readonly oauth2Http: OAuth2HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiBaseUrl =
      this.configService.get<string>('oauth2Client.serverUrl') ?? '';
  }

  /**
   * Fetch package by ID from MKT Server
   */
  async findById(
    packageId: string,
    userContext?: UserContext,
  ): Promise<MktProductPackage | null> {
    this.logger.debug(MKT_PACKAGE_MESSAGES.OPERATION.FETCH_FROM_MKT, {
      packageId,
    });

    try {
      const url = buildUrl(
        MKT_PRODUCT_ENDPOINTS.GET_PACKAGE,
        { id: packageId },
        this.apiBaseUrl,
      );

      const response = await this.oauth2Http.get<
        MktApiResponse<MktProductPackage>
      >(url, undefined, userContext);

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchPackageFailed(getErrorMessage(error)),
        { packageId },
      );

      throw error;
    }
  }

  /**
   * Fetch packages by product ID from MKT Server
   */
  async findByProductId(
    productId: string,
    userContext?: UserContext,
  ): Promise<MktProductPackage[]> {
    this.logger.debug(MKT_PACKAGE_MESSAGES.OPERATION.FETCH_BY_PRODUCT, {
      productId,
    });

    try {
      const url = buildUrl(
        MKT_PRODUCT_ENDPOINTS.GET_PACKAGES_BY_PRODUCT,
        { productId },
        this.apiBaseUrl,
      );

      const response = await this.oauth2Http.get<
        MktApiResponse<MktProductPackage[]>
      >(url, undefined, userContext);

      return response.data ?? [];
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchPackageFailed(getErrorMessage(error)),
        { productId },
      );

      throw error;
    }
  }

  /**
   * Fetch packages list with pagination from MKT Server
   * Used by sync service for bulk operations
   */
  async findAll(
    params: { page?: number; limit?: number } = {},
    userContext?: UserContext,
  ): Promise<MktPaginatedData<MktProductPackage>> {
    this.logger.debug('Fetching packages list from MKT Server', { params });

    try {
      const url = buildUrl(
        MKT_PRODUCT_ENDPOINTS.PACKAGES_LIST,
        undefined,
        this.apiBaseUrl,
      );

      const response = await this.oauth2Http.get<
        MktApiResponse<MktPaginatedData<MktProductPackage>>
      >(url, { params }, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchPackageFailed(getErrorMessage(error)),
        { params },
      );

      throw error;
    }
  }
}
