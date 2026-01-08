import { MktGenericComboWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo.workspace-entity';
import { MktGenericComboItemWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo-item.workspace-entity';
import {
  GenericComboOutput,
  GenericComboItemOutput,
  ExternalProductInfoOutput,
  ExternalPackageInfoOutput,
  GenericComboItemSnapshotOutput,
  ProductSnapshotOutput,
  PackageSnapshotOutput,
} from 'src/mkt-core/mkt-combo/dto/generic-combo.output';
import {
  MktProduct,
  MktProductPackage,
  MktProductSnapshot,
  MktPackageSnapshot,
} from 'src/mkt-core/mkt-product-integration/types';
import { GenericComboItemSnapshot } from 'src/mkt-core/mkt-combo/types/generic-combo.types';

/**
 * Map MktGenericComboWorkspaceEntity to GenericComboOutput
 */
export const mapGenericComboToOutput = (
  combo: MktGenericComboWorkspaceEntity,
  items?: MktGenericComboItemWorkspaceEntity[],
): GenericComboOutput => ({
  id: combo.id,
  comboCode: combo.comboCode,
  name: combo.name,
  description: combo.description,
  pricingType: combo.pricingType,
  fixedPrice: combo.fixedPrice,
  discountPercent: combo.discountPercent,
  currency: combo.currency,
  isActive: combo.isActive,
  validFrom: combo.validFrom,
  validTo: combo.validTo,
  version: combo.version,
  createdAt: new Date(combo.createdAt),
  updatedAt: new Date(combo.updatedAt),
  items: items?.map(mapGenericComboItemToOutput),
});

/**
 * Map MktGenericComboItemWorkspaceEntity to GenericComboItemOutput
 * externalProduct và externalPackage sẽ được populate bởi field resolver
 */
export const mapGenericComboItemToOutput = (
  item: MktGenericComboItemWorkspaceEntity,
): GenericComboItemOutput => ({
  id: item.id,
  itemType: item.itemType,
  displayName: item.displayName,
  quantity: item.quantity,
  overridePrice: item.overridePrice,
  position: item.position,
  // DIGITAL_EXTERNAL fields (bán theo package)
  externalProductId: item.externalProductId,
  externalProductCode: item.externalProductCode,
  externalPackageId: item.externalPackageId,
  externalPackageCode: item.externalPackageCode,
  // Resolved info (populate separately)
  externalProduct: null,
  externalPackage: null,
  // INTERNAL_PRODUCT fields (deprecated)
  mktProductId: item.mktProductId,
  // INTERNAL_VARIANT fields (deprecated)
  mktVariantId: item.mktVariantId,
  // SERVICE fields
  serviceName: item.serviceName,
  serviceDescription: item.serviceDescription,
  servicePrice: item.servicePrice,
  // CUSTOM fields
  customName: item.customName,
  customDescription: item.customDescription,
  customPrice: item.customPrice,
  // Timestamps
  createdAt: new Date(item.createdAt),
  updatedAt: new Date(item.updatedAt),
});

/**
 * Map MktProduct to ExternalProductInfoOutput
 */
export const mapProductToOutput = (
  product: MktProduct,
): ExternalProductInfoOutput => ({
  id: product.id,
  code: product.code,
  productName: product.productName,
  productDescription: product.productDescription,
  status: product.status,
  basePrice: product.basePrice,
  iconUrl: product.iconUrl,
});

/**
 * Map MktProductPackage to ExternalPackageInfoOutput
 */
export const mapPackageToOutput = (
  pkg: MktProductPackage,
): ExternalPackageInfoOutput => ({
  id: pkg.id,
  packageCode: pkg.packageCode,
  packageName: pkg.packageName,
  packageDescription: pkg.packageDescription,
  packageType: pkg.packageType,
  licenseType: pkg.licenseType,
  billingCycle: pkg.billingCycle,
  durationDays: pkg.durationDays,
  price: pkg.price,
  currency: pkg.currency,
  isActive: pkg.isActive,
  productId: pkg.productId,
});

/**
 * Map MktProductSnapshot to ProductSnapshotOutput
 */
export const mapProductSnapshotToOutput = (
  snapshot: MktProductSnapshot,
): ProductSnapshotOutput => ({
  id: snapshot.id,
  code: snapshot.code,
  displayName: snapshot.displayName,
  displayDescription: snapshot.displayDescription,
  displayLanguage: snapshot.displayLanguage,
  basePrice: snapshot.basePrice,
  status: snapshot.status,
  iconUrl: snapshot.iconUrl,
  capturedAt: snapshot.capturedAt,
  checksum: snapshot.checksum,
});

/**
 * Map MktPackageSnapshot to PackageSnapshotOutput
 */
export const mapPackageSnapshotToOutput = (
  snapshot: MktPackageSnapshot,
): PackageSnapshotOutput => ({
  id: snapshot.id,
  packageCode: snapshot.packageCode,
  productId: snapshot.productId,
  displayName: snapshot.displayName,
  displayDescription: snapshot.displayDescription,
  packageType: snapshot.packageType,
  licenseType: snapshot.licenseType,
  billingCycle: snapshot.billingCycle,
  durationDays: snapshot.durationDays,
  price: snapshot.price,
  currency: snapshot.currency,
  capturedAt: snapshot.capturedAt,
});

/**
 * Map GenericComboItemSnapshot to GenericComboItemSnapshotOutput
 */
export const mapItemSnapshotToOutput = (
  snapshot: GenericComboItemSnapshot,
): GenericComboItemSnapshotOutput => ({
  id: snapshot.id,
  itemType: snapshot.itemType,
  displayName: snapshot.displayName,
  quantity: snapshot.quantity,
  unitPrice: snapshot.unitPrice,
  totalPrice: snapshot.totalPrice,
  position: snapshot.position,
  externalProductSnapshot: snapshot.externalProductSnapshot
    ? mapProductSnapshotToOutput(snapshot.externalProductSnapshot)
    : null,
  externalPackageSnapshot: snapshot.externalPackageSnapshot
    ? mapPackageSnapshotToOutput(snapshot.externalPackageSnapshot)
    : null,
});

/**
 * Map array of combos to outputs
 */
export const mapGenericCombosToOutput = (
  combos: MktGenericComboWorkspaceEntity[],
): GenericComboOutput[] =>
  combos.map((combo) => mapGenericComboToOutput(combo));
