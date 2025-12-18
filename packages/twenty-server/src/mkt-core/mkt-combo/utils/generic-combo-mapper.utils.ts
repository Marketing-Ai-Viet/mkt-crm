import { MktGenericComboWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo.workspace-entity';
import { MktGenericComboItemWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo-item.workspace-entity';
import {
  GenericComboOutput,
  GenericComboItemOutput,
} from 'src/mkt-core/mkt-combo/dto/generic-combo.output';

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
  // DIGITAL_EXTERNAL fields
  externalProductId: item.externalProductId,
  externalProductCode: item.externalProductCode,
  externalPackageId: item.externalPackageId,
  externalPackageCode: item.externalPackageCode,
  // INTERNAL_PRODUCT fields
  mktProductId: item.mktProductId,
  // INTERNAL_VARIANT fields
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
 * Map array of combos to outputs
 */
export const mapGenericCombosToOutput = (
  combos: MktGenericComboWorkspaceEntity[],
): GenericComboOutput[] =>
  combos.map((combo) => mapGenericComboToOutput(combo));
