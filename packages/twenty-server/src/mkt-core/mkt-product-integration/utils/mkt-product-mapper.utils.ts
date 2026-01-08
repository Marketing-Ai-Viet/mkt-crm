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
  licenseType: pkg.licenseType,
  packageCode: pkg.packageCode,
  packageName: pkg.packageName,
  packageDescription: pkg.packageDescription ?? undefined,
  packageType: pkg.packageType,
  currency: pkg.currency,
  billingCycle: pkg.billingCycle,
  durationDays: pkg.durationDays ?? undefined,
  isActive: pkg.isActive,
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
  productName: product.productName,
  productDescription: product.productDescription ?? undefined,
  productOverview: product.productOverview ?? undefined,
  code: product.code,
  status: product.status,
  version: product.version ?? undefined,
  basePrice: product.basePrice ?? undefined,
  iconUrl: product.iconUrl ?? undefined,
  bannerUrl: product.bannerUrl ?? undefined,
  gallery: product.gallery,
  sortOrder: product.sortOrder,
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
