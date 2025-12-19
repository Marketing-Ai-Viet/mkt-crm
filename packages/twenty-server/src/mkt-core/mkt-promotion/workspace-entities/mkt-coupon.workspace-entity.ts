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
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import {
  MKT_PROMOTION_FIELD_IDS,
  MKT_PROMOTION_RELATION_IDS,
  COUPON_STATUS,
  COUPON_STATUS_OPTIONS,
  CouponStatus,
  PROMOTION_DEFAULTS,
} from 'src/mkt-core/mkt-promotion/constants';

import { MktPromotionWorkspaceEntity } from './mkt-promotion.workspace-entity';
import { MktPromotionUsageWorkspaceEntity } from './mkt-promotion-usage.workspace-entity';

/**
 * MktCouponWorkspaceEntity
 *
 * Coupon/voucher codes with:
 * - Unique code
 * - Status tracking
 * - Usage limits
 * - Validity period
 * - Optional customer assignment
 */
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCoupon,
  namePlural: 'mktCoupons',
  labelSingular: msg`Coupon`,
  labelPlural: msg`Coupons`,
  description: msg`Coupon/voucher code`,
  icon: 'IconTicket',
  shortcut: 'CP',
  labelIdentifierStandardId: MKT_PROMOTION_FIELD_IDS.mktCoupon.code,
})
export class MktCouponWorkspaceEntity extends BaseWorkspaceEntity {
  // ============================================
  // BASIC INFORMATION
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktCoupon.code,
    type: FieldMetadataType.TEXT,
    label: msg`Code`,
    description: msg`Unique coupon code`,
    icon: 'IconBarcode',
  })
  code: string;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktCoupon.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Coupon status`,
    icon: 'IconCircleDot',
    options: COUPON_STATUS_OPTIONS,
    defaultValue: `'${COUPON_STATUS.ACTIVE}'`,
  })
  status: CouponStatus;

  // ============================================
  // USAGE TRACKING
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktCoupon.usageLimit,
    type: FieldMetadataType.NUMBER,
    label: msg`Usage Limit`,
    description: msg`Maximum number of times this coupon can be used`,
    icon: 'IconUsers',
  })
  @WorkspaceIsNullable()
  usageLimit: number | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktCoupon.currentUsageCount,
    type: FieldMetadataType.NUMBER,
    label: msg`Current Usage Count`,
    description: msg`Current usage count`,
    icon: 'IconHash',
    defaultValue: PROMOTION_DEFAULTS.CURRENT_USAGE_COUNT,
  })
  currentUsageCount: number;

  // ============================================
  // VALIDITY PERIOD
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktCoupon.validFrom,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Valid From`,
    description: msg`Coupon valid from date`,
    icon: 'IconCalendarEvent',
  })
  @WorkspaceIsNullable()
  validFrom: Date | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktCoupon.validTo,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Valid To`,
    description: msg`Coupon valid to date`,
    icon: 'IconCalendarOff',
  })
  @WorkspaceIsNullable()
  validTo: Date | null;

  // ============================================
  // CUSTOMER ASSIGNMENT
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktCoupon.assignedCustomerId,
    type: FieldMetadataType.UUID,
    label: msg`Assigned Customer ID`,
    description: msg`Customer ID if assigned to specific customer`,
    icon: 'IconUser',
  })
  @WorkspaceIsNullable()
  assignedCustomerId: string | null;

  // ============================================
  // METADATA
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktCoupon.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`Additional metadata`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  metadata: JSON | null;

  // Note: deletedAt is inherited from BaseWorkspaceEntity

  // ============================================
  // RELATIONS
  // ============================================

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktCouponToPromotion,
    type: RelationType.MANY_TO_ONE,
    label: msg`Promotion`,
    description: msg`Parent promotion`,
    icon: 'IconTag',
    inverseSideTarget: () => MktPromotionWorkspaceEntity,
    inverseSideFieldKey: 'coupons',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  promotion: Relation<MktPromotionWorkspaceEntity>;

  @WorkspaceJoinColumn('promotion')
  promotionId: string;

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktCouponToAssignedCustomer,
    type: RelationType.MANY_TO_ONE,
    label: msg`Assigned Customer`,
    description: msg`Customer this coupon is assigned to`,
    icon: 'IconUser',
    inverseSideTarget: () => MktCustomerWorkspaceEntity,
    inverseSideFieldKey: 'assignedCoupons',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  assignedCustomer: Relation<MktCustomerWorkspaceEntity> | null;

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktCouponToUsages,
    type: RelationType.ONE_TO_MANY,
    label: msg`Usages`,
    description: msg`Usage history`,
    icon: 'IconHistory',
    inverseSideTarget: () => MktPromotionUsageWorkspaceEntity,
    inverseSideFieldKey: 'coupon',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  usages: Relation<MktPromotionUsageWorkspaceEntity[]>;
}
