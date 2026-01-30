import { Injectable, Logger } from '@nestjs/common';

import { MktAuthHttpService } from 'src/mkt-core/mkt-auth-client';
import {
  MktPaginatedData,
  MktProductPackage,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  MKT_PRODUCT_ENDPOINTS,
  MKT_PRODUCT_ERROR_BUILDER,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MKT_PACKAGE_MESSAGES } from 'src/mkt-core/mkt-product-integration/message';
import { buildEndpoint, getErrorMessage } from 'src/mkt-core/utils';

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
 *
 * Uses MktAuthHttpService which automatically:
 * - Injects Bearer token
 * - Handles 401 with re-login
 * - Retries on 5xx errors
 */
@Injectable()
export class MktPackageRepository {
  private readonly logger = new Logger(`${MKT_PRODUCT_LOG_CONTEXT}:Repository`);

  constructor(private readonly httpService: MktAuthHttpService) {}

  /**
   * Fetch package by ID from MKT Server
   */
  async findById(packageId: string): Promise<MktProductPackage | null> {
    this.logger.debug(MKT_PACKAGE_MESSAGES.OPERATION.FETCH_FROM_MKT, {
      packageId,
    });

    try {
      const endpoint = buildEndpoint(MKT_PRODUCT_ENDPOINTS.GET_PACKAGE, {
        id: packageId,
      });

      const pkg = await this.httpService.get<MktProductPackage>(endpoint);

      return pkg ?? null;
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
  async findByProductId(productId: string): Promise<MktProductPackage[]> {
    this.logger.debug(MKT_PACKAGE_MESSAGES.OPERATION.FETCH_BY_PRODUCT, {
      productId,
    });

    try {
      const endpoint = buildEndpoint(
        MKT_PRODUCT_ENDPOINTS.GET_PACKAGES_BY_PRODUCT,
        { productId },
      );

      const packages =
        await this.httpService.get<MktProductPackage[]>(endpoint);

      return packages ?? [];
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
  ): Promise<MktPaginatedData<MktProductPackage>> {
    this.logger.debug('Fetching packages list from MKT Server', { params });

    try {
      const endpoint = buildEndpoint(MKT_PRODUCT_ENDPOINTS.PACKAGES_LIST);

      const result = await this.httpService.get<
        MktPaginatedData<MktProductPackage>
      >(endpoint, { params });

      return result;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchPackageFailed(getErrorMessage(error)),
        { params },
      );

      throw error;
    }
  }
}
