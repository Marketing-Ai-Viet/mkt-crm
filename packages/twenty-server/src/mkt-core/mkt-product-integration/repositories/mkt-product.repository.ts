import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OAuth2HttpService } from 'src/mkt-core/oauth2-client/services/oauth2-http.service';
import { UserContext } from 'src/mkt-core/oauth2-client/types';
import {
  MktApiResponse,
  MktPaginatedData,
  MktProduct,
  MktProductQueryParams,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  MKT_PRODUCT_ENDPOINTS,
  MKT_PRODUCT_ERROR_BUILDER,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MKT_PRODUCT_MESSAGES } from 'src/mkt-core/mkt-product-integration/message';
import { buildUrl, getErrorMessage } from 'src/mkt-core/utils';

/**
 * MktProductRepository - Data access layer for MKT Product API
 *
 * Responsibilities:
 * - HTTP calls to MKT Server for products
 * - URL building
 * - Error handling for API calls
 *
 * Does NOT handle:
 * - Caching (handled by CacheService)
 * - Business logic (handled by Service layer)
 */
@Injectable()
export class MktProductRepository {
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
   * Fetch product by ID from MKT Server
   */
  async findById(
    productId: string,
    userContext?: UserContext,
  ): Promise<MktProduct | null> {
    this.logger.debug(MKT_PRODUCT_MESSAGES.OPERATION.FETCH_FROM_MKT, {
      productId,
    });

    try {
      const url = buildUrl(
        MKT_PRODUCT_ENDPOINTS.GET_BY_ID,
        { id: productId },
        this.apiBaseUrl,
      );

      const response = await this.oauth2Http.get<MktApiResponse<MktProduct>>(
        url,
        undefined,
        userContext,
      );

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchFailed(getErrorMessage(error)),
        { productId },
      );

      throw error;
    }
  }

  /**
   * Fetch product by code from MKT Server
   */
  async findByCode(
    code: string,
    userContext?: UserContext,
  ): Promise<MktProduct | null> {
    this.logger.debug(MKT_PRODUCT_MESSAGES.OPERATION.FETCH_BY_CODE, { code });

    try {
      const url = buildUrl(
        MKT_PRODUCT_ENDPOINTS.GET_BY_CODE,
        { code },
        this.apiBaseUrl,
      );

      const response = await this.oauth2Http.get<MktApiResponse<MktProduct>>(
        url,
        undefined,
        userContext,
      );

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchFailed(getErrorMessage(error)),
        { code },
      );

      throw error;
    }
  }

  /**
   * Fetch products list with pagination from MKT Server
   */
  async findAll(
    params: MktProductQueryParams = {},
    userContext?: UserContext,
  ): Promise<MktPaginatedData<MktProduct>> {
    this.logger.debug(MKT_PRODUCT_MESSAGES.OPERATION.FETCH_LIST_FROM_MKT, {
      params,
    });

    try {
      const url = buildUrl(
        MKT_PRODUCT_ENDPOINTS.LIST,
        undefined,
        this.apiBaseUrl,
      );

      const response = await this.oauth2Http.get<
        MktApiResponse<MktPaginatedData<MktProduct>>
      >(url, { params }, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchFailed(getErrorMessage(error)),
        { params },
      );

      throw error;
    }
  }
}
