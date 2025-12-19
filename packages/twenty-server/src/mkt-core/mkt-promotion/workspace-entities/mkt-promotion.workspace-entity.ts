import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import {
  MKT_PROMOTION_FIELD_IDS,
  MKT_PROMOTION_RELATION_IDS,
  PROMOTION_STATUS,
  PROMOTION_STATUS_OPTIONS,
  PROMOTION_TYPE,
  PROMOTION_TYPE_OPTIONS,
  PROMOTION_DEFAULTS,
  PromotionStatus,
  PromotionType,
} from 'src/mkt-core/mkt-promotion/constants';

import { MktPromotionRuleWorkspaceEntity } from './mkt-promotion-rule.workspace-entity';
import { MktCouponWorkspaceEntity } from './mkt-coupon.workspace-entity';
import { MktPromotionUsageWorkspaceEntity } from './mkt-promotion-usage.workspace-entity';
import { MktPromotionAuditWorkspaceEntity } from './mkt-promotion-audit.workspace-entity';

/**
 * MktPromotionWorkspaceEntity
 *
 * Main promotion campaign entity supporting:
 * - Multiple discount types (PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y, FREE_SHIPPING)
 * - Usage limits (total and per customer)
 * - Date-based validity
 * - Priority and stackability
 * - Auto-apply functionality
 */
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPromotion,
  namePlural: 'mktPromotions',
  labelSingular: msg`Promotion`,
  labelPlural: msg`Promotions`,
  description: msg`Promotion campaign with discount rules`,
  icon: 'IconTag',
  shortcut: 'PM',
  labelIdentifierStandardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.name,
})
export class MktPromotionWorkspaceEntity extends BaseWorkspaceEntity {
  // ============================================
  // BASIC INFORMATION
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Promotion name`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.code,
    type: FieldMetadataType.TEXT,
    label: msg`Code`,
    description: msg`Unique promotion code`,
    icon: 'IconBarcode',
  })
  code: string;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Detailed description`,
    icon: 'IconFileDescription',
  })
  @WorkspaceIsNullable()
  description: string | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Promotion status`,
    icon: 'IconCircleDot',
    options: PROMOTION_STATUS_OPTIONS,
    defaultValue: `'${PROMOTION_STATUS.DRAFT}'`,
  })
  status: PromotionStatus;

  // ============================================
  // DISCOUNT CONFIGURATION
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.promotionType,
    type: FieldMetadataType.SELECT,
    label: msg`Promotion Type`,
    description: msg`Type of discount`,
    icon: 'IconDiscount',
    options: PROMOTION_TYPE_OPTIONS,
    defaultValue: `'${PROMOTION_TYPE.PERCENTAGE}'`,
  })
  promotionType: PromotionType;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.discountValue,
    type: FieldMetadataType.NUMBER,
    label: msg`Discount Value`,
    description: msg`Discount value (percentage or amount)`,
    icon: 'IconPercentage',
    defaultValue: 0,
  })
  discountValue: number;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.maxDiscountAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Max Discount Amount`,
    description: msg`Maximum discount amount for percentage discounts`,
    icon: 'IconCurrencyDollar',
  })
  @WorkspaceIsNullable()
  maxDiscountAmount: number | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.minOrderAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Min Order Amount`,
    description: msg`Minimum order value required`,
    icon: 'IconShoppingCart',
  })
  @WorkspaceIsNullable()
  minOrderAmount: number | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.currency,
    type: FieldMetadataType.TEXT,
    label: msg`Currency`,
    description: msg`Currency code`,
    icon: 'IconCoin',
    defaultValue: `'${PROMOTION_DEFAULTS.CURRENCY}'`,
  })
  currency: string;

  // ============================================
  // VALIDITY & USAGE
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.startDate,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Start Date`,
    description: msg`Promotion start date`,
    icon: 'IconCalendarEvent',
  })
  startDate: Date;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.endDate,
    type: FieldMetadataType.DATE_TIME,
    label: msg`End Date`,
    description: msg`Promotion end date`,
    icon: 'IconCalendarOff',
  })
  @WorkspaceIsNullable()
  endDate: Date | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.usageLimit,
    type: FieldMetadataType.NUMBER,
    label: msg`Usage Limit`,
    description: msg`Total usage limit`,
    icon: 'IconUsers',
  })
  @WorkspaceIsNullable()
  usageLimit: number | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.usageLimitPerCustomer,
    type: FieldMetadataType.NUMBER,
    label: msg`Usage Limit Per Customer`,
    description: msg`Usage limit per customer`,
    icon: 'IconUser',
  })
  @WorkspaceIsNullable()
  usageLimitPerCustomer: number | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.currentUsageCount,
    type: FieldMetadataType.NUMBER,
    label: msg`Current Usage Count`,
    description: msg`Current usage count`,
    icon: 'IconHash',
    defaultValue: PROMOTION_DEFAULTS.CURRENT_USAGE_COUNT,
  })
  currentUsageCount: number;

  // ============================================
  // APPLICATION SETTINGS
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.priority,
    type: FieldMetadataType.NUMBER,
    label: msg`Priority`,
    description: msg`Priority order (higher = more priority)`,
    icon: 'IconArrowsSort',
    defaultValue: PROMOTION_DEFAULTS.PRIORITY,
  })
  priority: number;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.stackable,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Stackable`,
    description: msg`Can combine with other promotions`,
    icon: 'IconStack',
    defaultValue: PROMOTION_DEFAULTS.STACKABLE,
  })
  stackable: boolean;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.isAutoApply,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Auto Apply`,
    description: msg`Auto-apply without code`,
    icon: 'IconAutomation',
    defaultValue: PROMOTION_DEFAULTS.IS_AUTO_APPLY,
  })
  isAutoApply: boolean;

  // ============================================
  // METADATA & SEARCH
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`Additional metadata`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  metadata: JSON | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: msg`Search Vector`,
    description: msg`Full-text search vector`,
    icon: 'IconSearch',
  })
  @WorkspaceIsNullable()
  searchVector: string | null;

  // ============================================
  // RELATIONS
  // ============================================

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktPromotionToRules,
    type: RelationType.ONE_TO_MANY,
    label: msg`Rules`,
    description: msg`Promotion rules`,
    icon: 'IconRuler',
    inverseSideTarget: () => MktPromotionRuleWorkspaceEntity,
    inverseSideFieldKey: 'promotion',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  rules: Relation<MktPromotionRuleWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktPromotionToCoupons,
    type: RelationType.ONE_TO_MANY,
    label: msg`Coupons`,
    description: msg`Promotion coupons`,
    icon: 'IconTicket',
    inverseSideTarget: () => MktCouponWorkspaceEntity,
    inverseSideFieldKey: 'promotion',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  coupons: Relation<MktCouponWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktPromotionToUsages,
    type: RelationType.ONE_TO_MANY,
    label: msg`Usages`,
    description: msg`Promotion usage history`,
    icon: 'IconHistory',
    inverseSideTarget: () => MktPromotionUsageWorkspaceEntity,
    inverseSideFieldKey: 'promotion',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  usages: Relation<MktPromotionUsageWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktPromotionToAudits,
    type: RelationType.ONE_TO_MANY,
    label: msg`Audits`,
    description: msg`Audit trail`,
    icon: 'IconFileText',
    inverseSideTarget: () => MktPromotionAuditWorkspaceEntity,
    inverseSideFieldKey: 'promotion',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  audits: Relation<MktPromotionAuditWorkspaceEntity[]>;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotion.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;
}
