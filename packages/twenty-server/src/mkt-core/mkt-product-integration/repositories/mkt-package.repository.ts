import { Injectable, Logger } from '@nestjs/common';

import { MktAuthHttpService } from 'src/mkt-core/mkt-auth-client';
import {
  AdminPlanBillingPeriod,
  AdminPlanDto,
  AdminProductPlansDto,
  MktBillingCycle,
  MktCurrency,
  MktPaginatedData,
  MktProductPackage,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  MKT_PRODUCT_ENDPOINTS,
  MKT_PRODUCT_ERROR_BUILDER,
  MKT_PRODUCT_LOG_CONTEXT,
  MKT_PRODUCT_QUERY_DEFAULTS,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MKT_PACKAGE_MESSAGES } from 'src/mkt-core/mkt-product-integration/message';
import { getErrorMessage } from 'src/mkt-core/utils';

// ============================================
// BILLING PERIOD MAPPING
// ============================================

const ADMIN_BILLING_PERIOD_MAP: Record<
  AdminPlanBillingPeriod,
  MktBillingCycle
> = {
  Monthly: 'monthly',
};

// ============================================
// MAPPER
// ============================================

/**
 * Map AdminPlanDto (Admin API) -> MktProductPackage (internal type)
 *
 * @param dto - PlanDto from Admin API
 * @param productId - Product ID (from context, since PlanDto doesn't always include it)
 */
const mapAdminPlanToMktPackage = (
  dto: AdminPlanDto,
  productId = '',
): MktProductPackage => ({
  id: dto.id,
  licenseType: dto.tier.toLowerCase(),
  packageCode: dto.code,
  packageName: dto.name,
  packageDescription: dto.description ?? null,
  packageType: 'subscription',
  currency: (dto.currency as MktCurrency) || 'VND',
  billingCycle: ADMIN_BILLING_PERIOD_MAP[dto.billingPeriod] ?? 'monthly',
  durationDays: dto.trialDays > 0 ? dto.trialDays : null,
  isActive: dto.status === 'Active',
  price: dto.price,
  metadata: dto.metadata ?? {},
  productId,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
});

// ============================================
// REPOSITORY
// ============================================

/**
 * MktPackageRepository - Data access layer for MKT Plan (Package) API
 *
 * Uses MktAuthHttpService (Better Auth) to call MKT Admin Backend API.
 *
 * NOTE: MktAuthHttpService.unwrapResponse() auto-unwraps { data: T } responses.
 * For paginated endpoints returning { data: T[], pagination: {...} },
 * the unwrapped result is T[] (array only, pagination is lost).
 * Repositories must type the response as T[] and build pagination locally.
 *
 * Responsibilities:
 * - HTTP calls to MKT Server for plans (packages)
 * - Response mapping (AdminPlanDto -> MktProductPackage)
 * - Error handling for API calls
 *
 * Does NOT handle:
 * - Caching (handled by CacheService)
 * - Business logic (handled by Service layer)
 */
@Injectable()
export class MktPackageRepository {
  private readonly logger = new Logger(`${MKT_PRODUCT_LOG_CONTEXT}:Repository`);

  constructor(private readonly authHttp: MktAuthHttpService) {}

  /**
   * Fetch package (plan) by ID from MKT Server
   */
  async findById(packageId: string): Promise<MktProductPackage | null> {
    this.logger.debug(MKT_PACKAGE_MESSAGES.OPERATION.FETCH_FROM_MKT, {
      packageId,
    });

    try {
      const endpoint = MKT_PRODUCT_ENDPOINTS.GET_PLAN.replace(':id', packageId);

      const dto = await this.authHttp.get<AdminPlanDto>(endpoint);

      return mapAdminPlanToMktPackage(dto);
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchPackageFailed(getErrorMessage(error)),
        { packageId },
      );

      throw error;
    }
  }

  /**
   * Fetch packages (plans) by product ID from MKT Server
   * Uses GET /api/v1/products/:productId/plans
   *
   * NOTE: This endpoint returns ProductPlansDto (not paginated),
   * so unwrapResponse returns the full object (no 'data' key at top level).
   */
  async findByProductId(productId: string): Promise<MktProductPackage[]> {
    this.logger.debug(MKT_PACKAGE_MESSAGES.OPERATION.FETCH_BY_PRODUCT, {
      productId,
    });

    try {
      const endpoint = MKT_PRODUCT_ENDPOINTS.GET_PLANS_BY_PRODUCT.replace(
        ':productId',
        productId,
      );

      const response = await this.authHttp.get<AdminProductPlansDto>(endpoint);

      if (!response.plans || response.plans.length === 0) {
        return [];
      }

      return response.plans.map((plan) =>
        mapAdminPlanToMktPackage(plan, productId),
      );
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchPackageFailed(getErrorMessage(error)),
        { productId },
      );

      throw error;
    }
  }

  /**
   * Fetch packages (plans) list with pagination from MKT Server
   * Used by sync service for bulk operations
   *
   * NOTE: unwrapResponse auto-unwraps { data: [...], pagination } -> AdminPlanDto[]
   * Pagination info is lost, so we build it from request params and result count.
   */
  async findAll(
    params: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<MktPaginatedData<MktProductPackage>> {
    this.logger.debug('Fetching plans list from MKT Server', { params });

    const page = params.page ?? MKT_PRODUCT_QUERY_DEFAULTS.PAGE;
    const limit = params.limit ?? MKT_PRODUCT_QUERY_DEFAULTS.LIMIT;

    try {
      // unwrapResponse unwraps { data: [...], pagination } -> AdminPlanDto[]
      const items = await this.authHttp.get<AdminPlanDto[]>(
        MKT_PRODUCT_ENDPOINTS.PLANS_LIST,
        { params: { page, limit } },
      );

      const data = items.map((dto) => mapAdminPlanToMktPackage(dto));

      return {
        data,
        total: data.length,
        page,
        limit,
        totalPages: data.length < limit ? page : page + 1,
      };
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchPackageFailed(getErrorMessage(error)),
        { params },
      );

      throw error;
    }
  }
}
