import {
  MktDigitalProductDto,
  MktDigitalPackageDto,
} from 'src/mkt-core/mkt-product-integration/dto/mkt-digital-product.output';
import {
  MktProduct,
  MktProductPackage,
} from 'src/mkt-core/mkt-product-integration/types';

/**
 * Map MktProductPackage to MktDigitalPackageDto
 * Converts null values to undefined for GraphQL compatibility
 */
export const mapPackageToDto = (
  pkg: MktProductPackage,
): MktDigitalPackageDto => ({
  id: pkg.id,
  packageCode: pkg.packageCode,
  packageName: pkg.packageName,
  packageDescription: pkg.packageDescription ?? undefined,
  status: pkg.packageType,
  currency: pkg.currency,
  billingPeriod: pkg.billingCycle,
  trialDays: pkg.durationDays ?? 0,
  price: pkg.price,
  metadata: pkg.metadata,
  productId: pkg.productId,
  createdAt: pkg.createdAt,
  updatedAt: pkg.updatedAt,
});

/**
 * Map MktProduct to MktDigitalProductDto
 * Converts null values to undefined for GraphQL compatibility
 */
export const mapProductToDto = (product: MktProduct): MktDigitalProductDto => ({
  id: product.id,
  name: product.productName,
  description: product.productDescription ?? undefined,
  code: product.code,
  status: product.status,
  version: product.version ?? undefined,
  iconUrl: product.iconUrl ?? undefined,
  bannerUrl: product.bannerUrl ?? undefined,
  metadata: product.metadata,
  packages: product.packages?.map(mapPackageToDto),
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

/**
 * Map array of MktProduct to array of MktDigitalProductDto
 */
export const mapProductsToDto = (
  products: MktProduct[],
): MktDigitalProductDto[] => products.map(mapProductToDto);

/**
 * Map array of MktProductPackage to array of MktDigitalPackageDto
 */
export const mapPackagesToDto = (
  packages: MktProductPackage[],
): MktDigitalPackageDto[] => packages.map(mapPackageToDto);
