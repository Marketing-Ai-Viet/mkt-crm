import { Injectable, Logger } from '@nestjs/common';

import { MktAuthHttpService } from 'src/mkt-core/mkt-auth-client';
import {
  AdminProductDto,
  AdminProductStatus,
  MktPaginatedData,
  MktProduct,
  MktProductQueryParams,
  MktProductStatus,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  MKT_PRODUCT_ENDPOINTS,
  MKT_PRODUCT_ERROR_BUILDER,
  MKT_PRODUCT_LOG_CONTEXT,
  MKT_PRODUCT_QUERY_DEFAULTS,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MKT_PRODUCT_MESSAGES } from 'src/mkt-core/mkt-product-integration/message';
import { getErrorMessage } from 'src/mkt-core/utils';

// ============================================
// STATUS MAPPING
// ============================================

const ADMIN_STATUS_MAP: Record<AdminProductStatus, MktProductStatus> = {
  Draft: 'inactive',
  Active: 'active',
  Deprecated: 'deprecated',
  Archived: 'inactive',
};

// ============================================
// MAPPER
// ============================================

/**
 * Map AdminProductDto (Admin API) -> MktProduct (internal type)
 */
const mapAdminProductToMktProduct = (dto: AdminProductDto): MktProduct => ({
  id: dto.id,
  productName: dto.name,
  productDescription: dto.description ?? null,
  productOverview: null,
  code: dto.code,
  status: ADMIN_STATUS_MAP[dto.status] ?? 'inactive',
  version: dto.version ?? null,
  basePrice: null,
  iconUrl: dto.icon ?? null,
  bannerUrl: dto.banner ?? null,
  gallery: [],
  sortOrder: 0,
  metadata: dto.metadata ?? {},
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
});

// ============================================
// REPOSITORY
// ============================================

/**
 * MktProductRepository - Data access layer for MKT Product API
 *
 * Uses MktAuthHttpService (Better Auth) to call MKT Admin Backend API.
 *
 * NOTE: MktAuthHttpService.unwrapResponse() auto-unwraps { data: T } responses.
 * For paginated endpoints returning { data: T[], pagination: {...} },
 * the unwrapped result is T[] (array only, pagination is lost).
 * Repositories must type the response as T[] and build pagination locally.
 *
 * Responsibilities:
 * - HTTP calls to MKT Server for products
 * - Response mapping (AdminProductDto -> MktProduct)
 * - Error handling for API calls
 *
 * Does NOT handle:
 * - Caching (handled by CacheService)
 * - Business logic (handled by Service layer)
 */
@Injectable()
export class MktProductRepository {
  private readonly logger = new Logger(`${MKT_PRODUCT_LOG_CONTEXT}:Repository`);

  constructor(private readonly authHttp: MktAuthHttpService) {}

  /**
   * Fetch product by ID from MKT Server
   */
  async findById(productId: string): Promise<MktProduct | null> {
    this.logger.debug(MKT_PRODUCT_MESSAGES.OPERATION.FETCH_FROM_MKT, {
      productId,
    });

    try {
      const endpoint = MKT_PRODUCT_ENDPOINTS.GET_BY_ID.replace(
        ':id',
        productId,
      );

      const dto = await this.authHttp.get<AdminProductDto>(endpoint);

      return mapAdminProductToMktProduct(dto);
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
   * Uses search endpoint since Admin API doesn't have a direct by-code endpoint
   *
   * NOTE: unwrapResponse auto-unwraps { data: [...] } -> returns AdminProductDto[]
   */
  async findByCode(code: string): Promise<MktProduct | null> {
    this.logger.debug(MKT_PRODUCT_MESSAGES.OPERATION.FETCH_BY_CODE, { code });

    try {
      // unwrapResponse unwraps { data: [...], pagination } -> AdminProductDto[]
      const items = await this.authHttp.get<AdminProductDto[]>(
        MKT_PRODUCT_ENDPOINTS.SEARCH,
        { params: { q: code, limit: 10 } },
      );

      // Find exact code match from search results
      const matched = items.find((p) => p.code === code);

      if (!matched) {
        return null;
      }

      return mapAdminProductToMktProduct(matched);
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
   *
   * NOTE: unwrapResponse auto-unwraps { data: [...], pagination } -> AdminProductDto[]
   * Pagination info is lost, so we build it from request params and result count.
   */
  async findAll(
    params: MktProductQueryParams = {},
  ): Promise<MktPaginatedData<MktProduct>> {
    this.logger.debug(MKT_PRODUCT_MESSAGES.OPERATION.FETCH_LIST_FROM_MKT, {
      params,
    });

    const page = params.page ?? MKT_PRODUCT_QUERY_DEFAULTS.PAGE;
    const limit = params.limit ?? MKT_PRODUCT_QUERY_DEFAULTS.LIMIT;

    try {
      // unwrapResponse unwraps { data: [...], pagination } -> AdminProductDto[]
      const items = await this.authHttp.get<AdminProductDto[]>(
        MKT_PRODUCT_ENDPOINTS.LIST,
        {
          params: {
            page,
            limit,
            q: params.search,
            order: params.sortOrder?.toLowerCase(),
            status: params.status
              ? mapMktStatusToAdminStatus(params.status)
              : undefined,
          },
        },
      );

      const data = items.map(mapAdminProductToMktProduct);

      return {
        data,
        total: data.length,
        page,
        limit,
        totalPages: data.length < limit ? page : page + 1,
      };
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchFailed(getErrorMessage(error)),
        { params },
      );

      throw error;
    }
  }
}

// ============================================
// HELPER
// ============================================

/**
 * Map internal status filter -> Admin API status enum
 */
const mapMktStatusToAdminStatus = (
  status: MktProductStatus,
): AdminProductStatus | undefined => {
  const reverseMap: Record<MktProductStatus, AdminProductStatus | undefined> = {
    active: 'Active',
    inactive: 'Draft',
    deprecated: 'Deprecated',
    beta: undefined, // Admin API doesn't have beta status
  };

  return reverseMap[status];
};
