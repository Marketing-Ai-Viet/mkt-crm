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
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import {
  MKT_PROMOTION_FIELD_IDS,
  MKT_PROMOTION_RELATION_IDS,
} from 'src/mkt-core/mkt-promotion/constants';

import { MktPromotionWorkspaceEntity } from './mkt-promotion.workspace-entity';
import { MktCouponWorkspaceEntity } from './mkt-coupon.workspace-entity';

/**
 * MktPromotionUsageWorkspaceEntity
 *
 * Promotion usage history tracking:
 * - Discount amount applied
 * - Original amount before discount
 * - Application timestamp
 * - Snapshot metadata
 */
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPromotionUsage,
  namePlural: 'mktPromotionUsages',
  labelSingular: msg`Promotion Usage`,
  labelPlural: msg`Promotion Usages`,
  description: msg`Promotion usage history record`,
  icon: 'IconHistory',
  shortcut: 'PU',
})
export class MktPromotionUsageWorkspaceEntity extends BaseWorkspaceEntity {
  // ============================================
  // DISCOUNT INFORMATION
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionUsage.discountAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Discount Amount`,
    description: msg`Discount amount applied`,
    icon: 'IconDiscount',
    defaultValue: 0,
  })
  discountAmount: number;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionUsage.originalAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Original Amount`,
    description: msg`Original amount before discount`,
    icon: 'IconCurrencyDollar',
    defaultValue: 0,
  })
  originalAmount: number;

  // ============================================
  // TIMESTAMP
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionUsage.appliedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Applied At`,
    description: msg`When the promotion was applied`,
    icon: 'IconClock',
  })
  appliedAt: Date;

  // ============================================
  // METADATA
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionUsage.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`Application details snapshot`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  metadata: JSON | null;

  // Note: deletedAt is inherited from BaseWorkspaceEntity

  // ============================================
  // RELATIONS
  // ============================================

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktUsageToPromotion,
    type: RelationType.MANY_TO_ONE,
    label: msg`Promotion`,
    description: msg`Promotion used`,
    icon: 'IconTag',
    inverseSideTarget: () => MktPromotionWorkspaceEntity,
    inverseSideFieldKey: 'usages',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  promotion: Relation<MktPromotionWorkspaceEntity> | null;

  @WorkspaceJoinColumn('promotion')
  promotionId: string | null;

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktUsageToCoupon,
    type: RelationType.MANY_TO_ONE,
    label: msg`Coupon`,
    description: msg`Coupon used`,
    icon: 'IconTicket',
    inverseSideTarget: () => MktCouponWorkspaceEntity,
    inverseSideFieldKey: 'usages',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  coupon: Relation<MktCouponWorkspaceEntity> | null;

  @WorkspaceJoinColumn('coupon')
  couponId: string | null;

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktUsageToOrder,
    type: RelationType.MANY_TO_ONE,
    label: msg`Order`,
    description: msg`Order where promotion was applied`,
    icon: 'IconShoppingCart',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'promotionUsages',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  order: Relation<MktOrderWorkspaceEntity> | null;

  @WorkspaceJoinColumn('order')
  orderId: string | null;

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktUsageToCustomer,
    type: RelationType.MANY_TO_ONE,
    label: msg`Customer`,
    description: msg`Customer who used the promotion`,
    icon: 'IconUser',
    inverseSideTarget: () => MktCustomerWorkspaceEntity,
    inverseSideFieldKey: 'promotionUsages',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  customer: Relation<MktCustomerWorkspaceEntity> | null;

  @WorkspaceJoinColumn('customer')
  customerId: string | null;
}
