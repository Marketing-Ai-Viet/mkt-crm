import { Injectable, Logger } from '@nestjs/common';

import { UserContext } from 'src/mkt-core/oauth2-client/types';
import {
  MktOrderValidationItem,
  MktProduct,
  MktProductPackage,
  MktValidationResult,
  PackageFetcher,
  ProductFetcher,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  MKT_ORDERABLE_STATUSES,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import {
  MKT_ORDER_VALIDATION_MESSAGES,
  MKT_PACKAGE_MESSAGES,
  MKT_PRODUCT_MESSAGES,
} from 'src/mkt-core/mkt-product-integration/message';

/**
 * MktValidationService - Order validation logic
 *
 * Responsibilities:
 * - Validate products and packages for order creation
 * - Check product/package status and availability
 *
 * Does NOT handle:
 * - Data fetching (injected via fetcher functions)
 * - Caching
 */
@Injectable()
export class MktValidationService {
  private readonly logger = new Logger(`${MKT_PRODUCT_LOG_CONTEXT}:Validation`);

  /**
   * Validate products and packages for order creation
   *
   * @param items - Items to validate
   * @param productFetcher - Function to fetch product by ID
   * @param packageFetcher - Function to fetch package by ID
   * @param userContext - Optional user context for API calls
   */
  async validateForOrder(
    items: MktOrderValidationItem[],
    productFetcher: ProductFetcher,
    packageFetcher: PackageFetcher,
    userContext?: UserContext,
  ): Promise<MktValidationResult> {
    this.logger.debug(MKT_ORDER_VALIDATION_MESSAGES.OPERATION.START, {
      itemCount: items.length,
    });

    const errors: MktValidationResult['errors'] = [];

    for (const item of items) {
      const validationErrors = await this.validateItem(
        item,
        productFetcher,
        packageFetcher,
        userContext,
      );

      errors.push(...validationErrors);
    }

    const isValid = errors.length === 0;

    if (isValid) {
      this.logger.debug(MKT_ORDER_VALIDATION_MESSAGES.SUCCESS.PASSED, {
        itemCount: items.length,
      });
    } else {
      this.logger.warn(MKT_ORDER_VALIDATION_MESSAGES.ERROR.FAILED, {
        errors,
      });
    }

    return { valid: isValid, errors };
  }

  /**
   * Validate a single order item
   */
  private async validateItem(
    item: MktOrderValidationItem,
    productFetcher: ProductFetcher,
    packageFetcher: PackageFetcher,
    userContext?: UserContext,
  ): Promise<MktValidationResult['errors']> {
    const errors: MktValidationResult['errors'] = [];

    // Validate product
    const product = await productFetcher(item.productId, userContext);
    const productError = this.validateProduct(product, item.productId);

    if (productError) {
      errors.push(productError);

      return errors; // Early return if product invalid
    }

    // Validate package if provided
    if (item.packageId) {
      const pkg = await packageFetcher(
        item.packageId,
        userContext,
        item.productId,
      );

      const packageErrors = this.validatePackage(
        pkg,
        item.productId,
        item.packageId,
      );

      errors.push(...packageErrors);
    }

    return errors;
  }

  /**
   * Validate product exists and is orderable
   */
  private validateProduct(
    product: MktProduct | null,
    productId: string,
  ): MktValidationResult['errors'][0] | null {
    if (!product) {
      return {
        productId,
        reason: MKT_PRODUCT_MESSAGES.ERROR.NOT_FOUND,
      };
    }

    if (!MKT_ORDERABLE_STATUSES.includes(product.status as never)) {
      return {
        productId,
        reason: MKT_PRODUCT_MESSAGES.error('STATUS_NOT_ORDERABLE', {
          status: product.status,
        }),
      };
    }

    return null;
  }

  /**
   * Validate package exists, belongs to product, and is active
   */
  private validatePackage(
    pkg: MktProductPackage | null,
    productId: string,
    packageId: string,
  ): MktValidationResult['errors'] {
    const errors: MktValidationResult['errors'] = [];

    if (!pkg) {
      errors.push({
        productId,
        packageId,
        reason: MKT_PACKAGE_MESSAGES.ERROR.NOT_FOUND,
      });

      return errors;
    }

    if (pkg.productId !== productId) {
      errors.push({
        productId,
        packageId,
        reason: MKT_PACKAGE_MESSAGES.ERROR.NOT_BELONG_TO_PRODUCT,
      });

      return errors;
    }

    if (!pkg.isActive) {
      errors.push({
        productId,
        packageId,
        reason: MKT_PACKAGE_MESSAGES.ERROR.INACTIVE,
      });
    }

    return errors;
  }

  /**
   * Quick check if product status is orderable
   */
  isProductOrderable(product: MktProduct): boolean {
    return MKT_ORDERABLE_STATUSES.includes(product.status as never);
  }

  /**
   * Quick check if package is valid for ordering
   */
  isPackageOrderable(pkg: MktProductPackage, productId: string): boolean {
    return pkg.isActive && pkg.productId === productId;
  }
}
