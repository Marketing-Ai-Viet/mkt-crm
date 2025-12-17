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
 * Map MktLicenseResponse to MktLicenseOutput for GraphQL response
 */
export const mapLicenseToOutput = (
  license: MktLicenseResponse,
): MktLicenseOutput => ({
  id: license.id,
  createdAt: license.createdAt,
  updatedAt: license.updatedAt,
  deletedAt: license.deletedAt ?? undefined,
  createdBy: license.createdBy ?? undefined,
  updatedBy: license.updatedBy ?? undefined,
  version: license.version,
  licenseKey: license.licenseKey,
  type: license.type as MktLicenseTypeEnum,
  originalType: license.originalType as MktLicenseTypeEnum,
  status: license.status as MktLicenseStatusEnum,
  startDate: license.startDate ?? undefined,
  endDate: license.endDate ?? undefined,
  maxDevices: license.maxDevices,
  metadata: license.metadata,
  userId: license.userId,
  productId: license.productId,
  product: license.product
    ? {
        ...license.product,
        deletedAt: license.product.deletedAt ?? undefined,
        createdBy: license.product.createdBy ?? undefined,
        updatedBy: license.product.updatedBy ?? undefined,
        iconUrl: license.product.iconUrl ?? undefined,
        bannerUrl: license.product.bannerUrl ?? undefined,
        name: license.product.name ?? undefined,
        description: license.product.description ?? undefined,
      }
    : undefined,
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
