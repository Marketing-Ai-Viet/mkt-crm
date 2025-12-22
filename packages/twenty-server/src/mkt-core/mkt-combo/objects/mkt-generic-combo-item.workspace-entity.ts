import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import {
  MKT_GENERIC_COMBO_OBJECT_IDS,
  MKT_GENERIC_COMBO_FIELD_IDS,
  ComboItemType,
  COMBO_ITEM_TYPE,
  COMBO_ITEM_TYPE_OPTIONS,
} from 'src/mkt-core/mkt-combo/constants';

import { MktGenericComboWorkspaceEntity } from './mkt-generic-combo.workspace-entity';

/**
 * MktGenericComboItemWorkspaceEntity
 *
 * Item trong generic combo với polymorphic references dựa trên itemType:
 * - DIGITAL_EXTERNAL: externalProductId, externalPackageId
 * - INTERNAL_PRODUCT: mktProduct relation
 * - INTERNAL_VARIANT: mktVariant relation
 * - SERVICE: serviceName, servicePrice
 * - CUSTOM: customName, customPrice
 */
@WorkspaceEntity({
  standardId: MKT_GENERIC_COMBO_OBJECT_IDS.mktGenericComboItem,
  namePlural: 'mktGenericComboItems',
  labelSingular: msg`Generic Combo Item`,
  labelPlural: msg`Generic Combo Items`,
  description: msg`Item in a generic combo with polymorphic references`,
  icon: 'IconBox',
  shortcut: 'GI',
  labelIdentifierStandardId:
    MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.displayName,
})
export class MktGenericComboItemWorkspaceEntity extends BaseWorkspaceEntity {
  // ============================================
  // DISCRIMINATOR FIELD
  // ============================================

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.itemType,
    type: FieldMetadataType.SELECT,
    label: msg`Item Type`,
    description: msg`Type of item in this combo`,
    icon: 'IconCategory',
    options: COMBO_ITEM_TYPE_OPTIONS,
    defaultValue: `'${COMBO_ITEM_TYPE.DIGITAL_EXTERNAL}'`,
  })
  itemType: ComboItemType;

  // ============================================
  // COMMON FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.displayName,
    type: FieldMetadataType.TEXT,
    label: msg`Display Name`,
    description: msg`Display name for the item`,
    icon: 'IconTag',
  })
  @WorkspaceIsNullable()
  displayName: string | null;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.quantity,
    type: FieldMetadataType.NUMBER,
    label: msg`Quantity`,
    description: msg`Quantity of this item in the combo`,
    icon: 'IconHash',
    defaultValue: 1,
  })
  quantity: number;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.overridePrice,
    type: FieldMetadataType.NUMBER,
    label: msg`Override Price`,
    description: msg`Override the calculated price for this item`,
    icon: 'IconCurrencyDollar',
  })
  @WorkspaceIsNullable()
  overridePrice: number | null;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.position,
    type: FieldMetadataType.NUMBER,
    label: msg`Position`,
    description: msg`Display order position`,
    icon: 'IconArrowsSort',
    defaultValue: 0,
  })
  position: number;

  // ============================================
  // DIGITAL_EXTERNAL FIELDS (MKT Server)
  // ============================================

  @WorkspaceField({
    standardId:
      MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.externalProductId,
    type: FieldMetadataType.TEXT,
    label: msg`External Product ID`,
    description: msg`Product ID from MKT Server (for DIGITAL_EXTERNAL type)`,
    icon: 'IconId',
  })
  @WorkspaceIsNullable()
  externalProductId: string | null;

  @WorkspaceField({
    standardId:
      MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.externalProductCode,
    type: FieldMetadataType.TEXT,
    label: msg`External Product Code`,
    description: msg`Product code from MKT Server (for DIGITAL_EXTERNAL type)`,
    icon: 'IconBarcode',
  })
  @WorkspaceIsNullable()
  externalProductCode: string | null;

  @WorkspaceField({
    standardId:
      MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.externalPackageId,
    type: FieldMetadataType.TEXT,
    label: msg`External Package ID`,
    description: msg`Package ID from MKT Server (for DIGITAL_EXTERNAL type)`,
    icon: 'IconId',
  })
  @WorkspaceIsNullable()
  externalPackageId: string | null;

  @WorkspaceField({
    standardId:
      MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.externalPackageCode,
    type: FieldMetadataType.TEXT,
    label: msg`External Package Code`,
    description: msg`Package code from MKT Server (for DIGITAL_EXTERNAL type)`,
    icon: 'IconBarcode',
  })
  @WorkspaceIsNullable()
  externalPackageCode: string | null;

  // ============================================
  // INTERNAL_PRODUCT FIELDS (deprecated - use externalProductId)
  // ============================================

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.mktProductId,
    type: FieldMetadataType.UUID,
    label: msg`Internal Product ID`,
    description: msg`CRM Product ID reference (for INTERNAL_PRODUCT type)`,
    icon: 'IconBox',
  })
  @WorkspaceIsNullable()
  mktProductId: string | null;

  // ============================================
  // INTERNAL_VARIANT FIELDS (deprecated - use externalPackageId)
  // ============================================

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.mktVariantId,
    type: FieldMetadataType.UUID,
    label: msg`Internal Variant ID`,
    description: msg`CRM Variant ID reference (for INTERNAL_VARIANT type)`,
    icon: 'IconBoxMultiple',
  })
  @WorkspaceIsNullable()
  mktVariantId: string | null;

  // ============================================
  // SERVICE FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.serviceName,
    type: FieldMetadataType.TEXT,
    label: msg`Service Name`,
    description: msg`Service name (for SERVICE type)`,
    icon: 'IconBriefcase',
  })
  @WorkspaceIsNullable()
  serviceName: string | null;

  @WorkspaceField({
    standardId:
      MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.serviceDescription,
    type: FieldMetadataType.TEXT,
    label: msg`Service Description`,
    description: msg`Service description (for SERVICE type)`,
    icon: 'IconFileDescription',
  })
  @WorkspaceIsNullable()
  serviceDescription: string | null;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.servicePrice,
    type: FieldMetadataType.NUMBER,
    label: msg`Service Price`,
    description: msg`Service price (for SERVICE type)`,
    icon: 'IconCurrencyDollar',
  })
  @WorkspaceIsNullable()
  servicePrice: number | null;

  // ============================================
  // CUSTOM FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.customName,
    type: FieldMetadataType.TEXT,
    label: msg`Custom Name`,
    description: msg`Custom item name (for CUSTOM type)`,
    icon: 'IconPencil',
  })
  @WorkspaceIsNullable()
  customName: string | null;

  @WorkspaceField({
    standardId:
      MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.customDescription,
    type: FieldMetadataType.TEXT,
    label: msg`Custom Description`,
    description: msg`Custom item description (for CUSTOM type)`,
    icon: 'IconFileDescription',
  })
  @WorkspaceIsNullable()
  customDescription: string | null;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.customPrice,
    type: FieldMetadataType.NUMBER,
    label: msg`Custom Price`,
    description: msg`Custom item price (for CUSTOM type)`,
    icon: 'IconCurrencyDollar',
  })
  @WorkspaceIsNullable()
  customPrice: number | null;

  // ============================================
  // PARENT RELATION
  // ============================================

  @WorkspaceRelation({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.genericComboId,
    type: RelationType.MANY_TO_ONE,
    label: msg`Generic Combo`,
    description: msg`Parent combo`,
    icon: 'IconPackages',
    inverseSideTarget: () => MktGenericComboWorkspaceEntity,
    inverseSideFieldKey: 'items',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  genericCombo: Relation<MktGenericComboWorkspaceEntity>;

  @WorkspaceJoinColumn('genericCombo')
  genericComboId: string;
}
