import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import {
  MKT_GENERIC_COMBO_OBJECT_IDS,
  MKT_GENERIC_COMBO_FIELD_IDS,
  GenericComboPricingType,
  GENERIC_COMBO_PRICING_TYPE,
  GENERIC_COMBO_PRICING_TYPE_OPTIONS,
} from 'src/mkt-core/mkt-combo/constants';

import { MktGenericComboItemWorkspaceEntity } from './mkt-generic-combo-item.workspace-entity';

/**
 * MktGenericComboWorkspaceEntity
 *
 * Generic combo hỗ trợ nhiều loại item:
 * - DIGITAL_EXTERNAL: Sản phẩm từ MKT Server
 * - INTERNAL_PRODUCT: Sản phẩm nội bộ CRM
 * - INTERNAL_VARIANT: Variant nội bộ CRM
 * - SERVICE: Dịch vụ
 * - CUSTOM: Item tùy chỉnh
 */
@WorkspaceEntity({
  standardId: MKT_GENERIC_COMBO_OBJECT_IDS.mktGenericCombo,
  namePlural: 'mktGenericCombos',
  labelSingular: msg`Generic Combo`,
  labelPlural: msg`Generic Combos`,
  description: msg`Generic combo supporting multiple item types`,
  icon: 'IconPackages',
  shortcut: 'GC',
  labelIdentifierStandardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.name,
})
export class MktGenericComboWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.comboCode,
    type: FieldMetadataType.TEXT,
    label: msg`Combo Code`,
    description: msg`Unique combo identifier code`,
    icon: 'IconBarcode',
  })
  comboCode: string;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Combo display name`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Combo description`,
    icon: 'IconFileDescription',
  })
  @WorkspaceIsNullable()
  description: string | null;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.pricingType,
    type: FieldMetadataType.SELECT,
    label: msg`Pricing Type`,
    description: msg`How combo price is calculated`,
    icon: 'IconCalculator',
    options: GENERIC_COMBO_PRICING_TYPE_OPTIONS,
    defaultValue: `'${GENERIC_COMBO_PRICING_TYPE.SUM}'`,
  })
  pricingType: GenericComboPricingType;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.fixedPrice,
    type: FieldMetadataType.NUMBER,
    label: msg`Fixed Price`,
    description: msg`Fixed combo price (when pricingType is FIXED)`,
    icon: 'IconCurrencyDollar',
  })
  @WorkspaceIsNullable()
  fixedPrice: number | null;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.discountPercent,
    type: FieldMetadataType.NUMBER,
    label: msg`Discount Percent`,
    description: msg`Discount percentage (when pricingType is DISCOUNT)`,
    icon: 'IconPercentage',
  })
  @WorkspaceIsNullable()
  discountPercent: number | null;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.currency,
    type: FieldMetadataType.TEXT,
    label: msg`Currency`,
    description: msg`Currency code`,
    icon: 'IconCoin',
    defaultValue: "'VND'",
  })
  currency: string;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether the combo is active`,
    icon: 'IconToggleRight',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.validFrom,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Valid From`,
    description: msg`Start date of combo validity`,
    icon: 'IconCalendarEvent',
  })
  @WorkspaceIsNullable()
  validFrom: Date | null;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.validTo,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Valid To`,
    description: msg`End date of combo validity`,
    icon: 'IconCalendarOff',
  })
  @WorkspaceIsNullable()
  validTo: Date | null;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`Additional combo metadata`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  metadata: JSON | null;

  // ============================================
  // AUDIT & VERSIONING
  // ============================================

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.version,
    type: FieldMetadataType.NUMBER,
    label: msg`Version`,
    description: msg`Optimistic lock version`,
    icon: 'IconVersions',
    defaultValue: 1,
  })
  @WorkspaceIsSystem()
  version: number;

  @WorkspaceField({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.lastModifiedById,
    type: FieldMetadataType.UUID,
    label: msg`Last Modified By ID`,
    description: msg`ID of user who last modified this combo`,
    icon: 'IconUser',
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  lastModifiedById: string | null;

  // ============================================
  // OWNERSHIP RELATIONS
  // ============================================

  @WorkspaceRelation({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.createdBy,
    type: RelationType.MANY_TO_ONE,
    label: msg`Created By`,
    description: msg`The workspace member who created this combo`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'createdMktGenericCombos',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  createdBy: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('createdBy')
  createdById: string | null;

  @WorkspaceRelation({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.accountOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Account Owner`,
    description: msg`Your team member responsible for managing this combo`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'accountOwnerForMktGenericCombos',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('accountOwner')
  accountOwnerId: string | null;

  // ============================================
  // RELATIONS
  // ============================================

  @WorkspaceRelation({
    standardId: MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.items,
    type: RelationType.ONE_TO_MANY,
    label: msg`Combo Items`,
    description: msg`Items in this combo`,
    icon: 'IconListDetails',
    inverseSideTarget: () => MktGenericComboItemWorkspaceEntity,
    inverseSideFieldKey: 'genericCombo',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  items: Relation<MktGenericComboItemWorkspaceEntity[]>;
}
