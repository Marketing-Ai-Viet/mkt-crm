import isEmpty from 'lodash.isempty';

import {
  MktLicenseResponse,
  MktLicenseTypeValue,
  MktLicenseStatusType,
} from 'src/mkt-core/mkt-license-integration/types';
import {
  MktLicenseOutput,
  MktLicenseTypeEnum,
  MktLicenseStatusEnum,
} from 'src/mkt-core/mkt-license-integration/dto';

/**
 * Check if value is a plain object (not array, null, Date, etc.)
 */
const isPlainObj = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.prototype.toString.call(value) === '[object Object]';

/**
 * Check if value is empty object {}
 */
const isEmptyObject = (value: unknown): boolean =>
  isPlainObj(value) && isEmpty(value);

/**
 * Convert empty object {} to undefined to avoid GraphQL serialization errors
 * "String cannot represent value: {}"
 */
export const emptyToUndefined = <T>(
  value: T | null | undefined,
): T | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (isEmptyObject(value)) {
    return undefined;
  }

  return value;
};

/**
 * Ensure string value - convert empty object {} to empty string
 * For required String fields that cannot be undefined
 */
const ensureString = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (isEmptyObject(value)) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }

  return String(value);
};

/**
 * Map product to output with empty object handling
 */
const mapProductToOutput = (
  product: MktLicenseResponse['product'],
): MktLicenseOutput['product'] => {
  if (!product || isEmptyObject(product)) {
    return undefined;
  }

  return {
    id: product.id,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    deletedAt: emptyToUndefined(product.deletedAt),
    createdBy: emptyToUndefined(product.createdBy),
    updatedBy: emptyToUndefined(product.updatedBy),
    productName: emptyToUndefined(product.productName) ?? { en: '' },
    productDescription: emptyToUndefined(product.productDescription) ?? {
      en: '',
    },
    productOverview: emptyToUndefined(product.productOverview) ?? { en: '' },
    code: product.code,
    status: product.status,
    version: product.version,
    entityVersion: product.entityVersion,
    basePrice: product.basePrice,
    iconUrl: emptyToUndefined(product.iconUrl),
    bannerUrl: emptyToUndefined(product.bannerUrl),
    gallery: product.gallery ?? [],
    sortOrder: product.sortOrder,
    metadata: emptyToUndefined(product.metadata),
    name: emptyToUndefined(product.name),
    description: emptyToUndefined(product.description),
  };
};

/**
 * Map MktLicenseResponse to MktLicenseOutput for GraphQL response
 */
export const mapLicenseToOutput = (
  license: MktLicenseResponse,
): MktLicenseOutput => ({
  id: ensureString(license.id),
  createdAt: ensureString(license.createdAt),
  updatedAt: ensureString(license.updatedAt),
  deletedAt: emptyToUndefined(license.deletedAt),
  createdBy: emptyToUndefined(license.createdBy),
  updatedBy: emptyToUndefined(license.updatedBy),
  version: license.version ?? 0,
  licenseKey: ensureString(license.licenseKey),
  type:
    (emptyToUndefined(license.type) as MktLicenseTypeEnum) ??
    MktLicenseTypeEnum.TRIAL,
  originalType:
    (emptyToUndefined(license.originalType) as MktLicenseTypeEnum) ??
    MktLicenseTypeEnum.TRIAL,
  status:
    (emptyToUndefined(license.status) as MktLicenseStatusEnum) ??
    MktLicenseStatusEnum.PENDING,
  startDate: emptyToUndefined(license.startDate),
  endDate: emptyToUndefined(license.endDate),
  maxDevices: license.maxDevices ?? 1,
  metadata: emptyToUndefined(license.metadata),
  userId: ensureString(license.userId),
  productId: ensureString(license.productId),
  product: mapProductToOutput(license.product),
});

/**
 * Map array of MktLicenseResponse to array of MktLicenseOutput
 */
export const mapLicensesToOutput = (
  licenses: MktLicenseResponse[],
): MktLicenseOutput[] => licenses.map(mapLicenseToOutput);

/**
 * Convert MktLicenseTypeEnum to MktLicenseTypeValue
 */
export const enumToLicenseType = (
  enumValue: MktLicenseTypeEnum,
): MktLicenseTypeValue => enumValue as MktLicenseTypeValue;

/**
 * Convert MktLicenseStatusEnum to MktLicenseStatusType
 */
export const enumToLicenseStatus = (
  enumValue: MktLicenseStatusEnum,
): MktLicenseStatusType => enumValue as MktLicenseStatusType;
