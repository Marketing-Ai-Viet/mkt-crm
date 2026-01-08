import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  MktDigitalProductQueryInput,
  MktDigitalPackageQueryInput,
  MktDigitalSinglePackageInput,
} from 'src/mkt-core/mkt-product-integration/dto/mkt-digital-product.input';
import {
  MktDigitalProductResponseDto,
  MktDigitalProductListResponseDto,
  MktDigitalPackageResponseDto,
  MktDigitalPackageListResponseDto,
} from 'src/mkt-core/mkt-product-integration/dto/mkt-digital-product.output';
import {
  MKT_PACKAGE_MESSAGES,
  MKT_PRODUCT_MESSAGES,
} from 'src/mkt-core/mkt-product-integration/message';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import {
  mapProductToDto,
  mapProductsToDto,
  mapPackageToDto,
  mapPackagesToDto,
} from 'src/mkt-core/mkt-product-integration/utils';

/**
 * MktDigitalProductResolver - GraphQL resolver for digital products
 *
 * Provides queries for:
 * - mktDigitalProduct: Get single product by ID
 * - mktDigitalProductByCode: Get single product by code
 * - mktDigitalProducts: Get paginated list of products
 * - mktDigitalProductWithPackages: Get product with its packages
 * - mktDigitalPackage: Get single package by ID
 * - mktDigitalPackagesByProduct: Get packages by product ID
 */
@Resolver()
export class MktDigitalProductResolver {
  constructor(private readonly productProxyService: MktProductProxyService) {}

  /**
   * Get a single digital product by ID
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => MktDigitalProductResponseDto, {
    description: 'Get a single digital product by ID',
  })
  async mktDigitalProduct(
    @Args('productId') productId: string,
  ): Promise<MktDigitalProductResponseDto> {
    try {
      const product = await this.productProxyService.getProduct(productId);

      if (!product) {
        return {
          success: false,
          error: MKT_PRODUCT_MESSAGES.notFoundWithId(productId),
        };
      }

      return {
        success: true,
        data: mapProductToDto(product),
        message: MKT_PRODUCT_MESSAGES.SUCCESS.RETRIEVED,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get a single digital product by code
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => MktDigitalProductResponseDto, {
    description: 'Get a single digital product by code',
  })
  async mktDigitalProductByCode(
    @Args('code') code: string,
  ): Promise<MktDigitalProductResponseDto> {
    try {
      const product = await this.productProxyService.getProductByCode(code);

      if (!product) {
        return {
          success: false,
          error: MKT_PRODUCT_MESSAGES.error('NOT_FOUND_BY_CODE', { code }),
        };
      }

      return {
        success: true,
        data: mapProductToDto(product),
        message: MKT_PRODUCT_MESSAGES.SUCCESS.RETRIEVED,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get paginated list of digital products
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => MktDigitalProductListResponseDto, {
    description: 'Get paginated list of digital products',
  })
  async mktDigitalProducts(
    @AuthWorkspace() _workspace: Workspace,
    @Args('input', { nullable: true }) input?: MktDigitalProductQueryInput,
  ): Promise<MktDigitalProductListResponseDto> {
    try {
      const result = await this.productProxyService.getProducts({
        page: input?.page,
        limit: input?.limit,
        status: input?.status,
        search: input?.search,
        lang: input?.lang,
        sortBy: input?.sortBy,
        sortOrder: input?.sortOrder,
      });

      return {
        success: true,
        data: mapProductsToDto(result.data),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        message: MKT_PRODUCT_MESSAGES.SUCCESS.LIST_RETRIEVED,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get a single package by ID
   * Note: Providing productId improves cache efficiency
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => MktDigitalPackageResponseDto, {
    description: 'Get a single package by ID',
  })
  async mktDigitalPackage(
    @Args('input') input: MktDigitalSinglePackageInput,
  ): Promise<MktDigitalPackageResponseDto> {
    try {
      const pkg = await this.productProxyService.getPackage(
        input.packageId,
        undefined,
        input.productId,
      );

      if (!pkg) {
        return {
          success: false,
          error: MKT_PACKAGE_MESSAGES.notFoundWithId(input.packageId),
        };
      }

      return {
        success: true,
        data: mapPackageToDto(pkg),
        message: MKT_PACKAGE_MESSAGES.SUCCESS.RETRIEVED,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get packages by product ID
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => MktDigitalPackageListResponseDto, {
    description: 'Get packages by product ID',
  })
  async mktDigitalPackagesByProduct(
    @Args('input') input: MktDigitalPackageQueryInput,
  ): Promise<MktDigitalPackageListResponseDto> {
    try {
      if (!input.productId) {
        return {
          success: false,
          data: [],
          error: MKT_PACKAGE_MESSAGES.ERROR.PRODUCT_ID_REQUIRED,
        };
      }

      const packages = await this.productProxyService.getPackagesByProductId(
        input.productId,
      );

      // Filter by isActive if provided
      const filteredPackages =
        input.isActive !== undefined
          ? packages.filter((pkg) => pkg.isActive === input.isActive)
          : packages;

      return {
        success: true,
        data: mapPackagesToDto(filteredPackages),
        message: MKT_PACKAGE_MESSAGES.SUCCESS.LIST_RETRIEVED,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
