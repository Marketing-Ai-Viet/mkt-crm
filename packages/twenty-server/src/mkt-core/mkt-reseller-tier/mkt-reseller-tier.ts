import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { MKT_RESELLER_TIER_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktResellerTier,
  namePlural: 'mktResellerTiers',
  labelSingular: msg`Reseller Tier`,
  labelPlural: msg`Reseller Tiers`,
  description: msg`Represents a reseller tier in the marketing system.`,
  icon: 'IconStar',
  shortcut: 'R',
})
@WorkspaceIsSearchable()
export class MktResellerTierWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.tierCode,
    type: FieldMetadataType.TEXT,
    label: msg`Tier Code`,
    description: msg`Unique tier code`,
    icon: 'IconCode',
  })
  tierCode: string;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.tierName,
    type: FieldMetadataType.TEXT,
    label: msg`Tier Name`,
    description: msg`Display name of the tier`,
    icon: 'IconTag',
  })
  tierName: string;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.tierNameEn,
    type: FieldMetadataType.TEXT,
    label: msg`Tier Name (English)`,
    description: msg`English name of the tier`,
    icon: 'IconLanguage',
  })
  @WorkspaceIsNullable()
  tierNameEn?: string;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.minCommitmentAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Min Commitment Amount`,
    description: msg`Minimum commitment amount required for this tier`,
    icon: 'IconCurrency',
  })
  minCommitmentAmount: number;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.maxCommitmentAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Max Commitment Amount`,
    description: msg`Maximum commitment amount for this tier`,
    icon: 'IconCurrency',
  })
  @WorkspaceIsNullable()
  maxCommitmentAmount?: number;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.commissionRate,
    type: FieldMetadataType.NUMBER,
    label: msg`Commission Rate`,
    description: msg`Commission rate percentage for this tier`,
    icon: 'IconPercentage',
  })
  commissionRate: number;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.systemFeeRate,
    type: FieldMetadataType.NUMBER,
    label: msg`System Fee Rate`,
    description: msg`System fee rate percentage for this tier`,
    icon: 'IconPercentage',
  })
  @WorkspaceIsNullable()
  systemFeeRate?: number;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.allowedProducts,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Allowed Products`,
    description: msg`List of products allowed for this tier`,
    icon: 'IconShoppingCart',
  })
  @WorkspaceIsNullable()
  allowedProducts?: Record<string, unknown>;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.specialBenefits,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Special Benefits`,
    description: msg`Special benefits and privileges for this tier`,
    icon: 'IconGift',
  })
  @WorkspaceIsNullable()
  specialBenefits?: Record<string, unknown>;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.displayOrder,
    type: FieldMetadataType.NUMBER,
    label: msg`Display Order`,
    description: msg`Order of display in tier list`,
    icon: 'IconList',
  })
  @WorkspaceIsNullable()
  displayOrder?: number;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this tier is currently active`,
    icon: 'IconCheck',
  })
  @WorkspaceIsNullable()
  isActive?: boolean;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Detailed description of the tier`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  description?: string;

  @WorkspaceField({
    standardId: MKT_RESELLER_TIER_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;
}
