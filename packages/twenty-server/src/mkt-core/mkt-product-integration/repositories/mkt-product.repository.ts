import { Injectable, Logger } from '@nestjs/common';

import { MktAuthHttpService } from 'src/mkt-core/mkt-auth-client';
import {
  MktProduct,
  MktProductQueryParams,
  OffsetPaginatedProductDto,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  MKT_PRODUCT_ENDPOINTS,
  MKT_PRODUCT_ERROR_BUILDER,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MKT_PRODUCT_MESSAGES } from 'src/mkt-core/mkt-product-integration/message';
import { buildEndpoint, getErrorMessage } from 'src/mkt-core/utils';

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
 *
 * Uses MktAuthHttpService which automatically:
 * - Injects Bearer token
 * - Handles 401 with re-login
 * - Retries on 5xx errors
 */
@Injectable()
export class MktProductRepository {
  private readonly logger = new Logger(`${MKT_PRODUCT_LOG_CONTEXT}:Repository`);

  constructor(private readonly httpService: MktAuthHttpService) {}

  /**
   * Fetch product by ID from MKT Server
   */
  async findById(productId: string): Promise<MktProduct | null> {
    this.logger.debug(MKT_PRODUCT_MESSAGES.OPERATION.FETCH_FROM_MKT, {
      productId,
    });

    try {
      const endpoint = buildEndpoint(MKT_PRODUCT_ENDPOINTS.GET_BY_ID, {
        id: productId,
      });

      const product = await this.httpService.get<MktProduct>(endpoint);

      return product ?? null;
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
  async findByCode(code: string): Promise<MktProduct | null> {
    this.logger.debug(MKT_PRODUCT_MESSAGES.OPERATION.FETCH_BY_CODE, { code });

    try {
      const endpoint = buildEndpoint(MKT_PRODUCT_ENDPOINTS.GET_BY_CODE, {
        code,
      });

      const product = await this.httpService.get<MktProduct>(endpoint);

      return product ?? null;
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
  ): Promise<OffsetPaginatedProductDto> {
    this.logger.debug(MKT_PRODUCT_MESSAGES.OPERATION.FETCH_LIST_FROM_MKT, {
      params,
    });

    try {
      const endpoint = buildEndpoint(MKT_PRODUCT_ENDPOINTS.LIST);

      const result = await this.httpService.get<OffsetPaginatedProductDto>(
        endpoint,
        { params },
      );

      return result;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchFailed(getErrorMessage(error)),
        { params },
      );

      throw error;
    }
  }
}
