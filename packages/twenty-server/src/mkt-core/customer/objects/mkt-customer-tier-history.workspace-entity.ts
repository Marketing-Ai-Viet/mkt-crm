import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { Relation } from 'typeorm';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/relation-metadata/relation-on-delete-action.type';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import {
  MKT_CUSTOMER_TIER,
  MKT_CUSTOMER_TIER_SELECT_OPTIONS,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';
import {
  TIER_CHANGE_REASON_OPTIONS,
  TierChangeReason,
} from 'src/mkt-core/customer/constants/mkt-customer-tier-history.constants';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';

/**
 * Entity name for mktCustomerTierHistory - used in GraphQL operations and hooks
 * Format: 'mkt{EntityName}' (camelCase)
 * Note: namePlural uses irregular plural 'Histories' instead of 'Historys'
 */
export const MKT_CUSTOMER_TIER_HISTORY_ENTITY_NAME = 'mktCustomerTierHistory';

/**
 * MktCustomerTierHistoryWorkspaceEntity
 *
 * Records customer tier changes with audit trail
 * - Tracks previousTier -> newTier transitions
 * - Records reason for change (order, cron, manual, downgrade)
 * - Captures order metrics at time of change
 */
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCustomerTierHistory,
  namePlural: 'mktCustomerTierHistories', // Irregular plural
  labelSingular: msg`Tier History`,
  labelPlural: msg`Tier Histories`,
  description: msg`Customer tier change history for audit trail`,
  icon: 'IconHistory',
})
export class MktCustomerTierHistoryWorkspaceEntity extends BaseWorkspaceEntity {
  // ============ TIER CHANGE INFO ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.previousTier,
    type: FieldMetadataType.SELECT,
    label: msg`Previous Tier`,
    description: msg`Tier before change`,
    icon: 'IconChevronDown',
    options: MKT_CUSTOMER_TIER_SELECT_OPTIONS,
  })
  @WorkspaceIsNullable()
  previousTier: MKT_CUSTOMER_TIER | null;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.newTier,
    type: FieldMetadataType.SELECT,
    label: msg`New Tier`,
    description: msg`Tier after change`,
    icon: 'IconChevronUp',
    options: MKT_CUSTOMER_TIER_SELECT_OPTIONS,
  })
  newTier: MKT_CUSTOMER_TIER;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.reason,
    type: FieldMetadataType.SELECT,
    label: msg`Change Reason`,
    description: msg`Reason for tier change`,
    icon: 'IconInfoCircle',
    options: TIER_CHANGE_REASON_OPTIONS,
  })
  reason: TierChangeReason;

  // ============ METRICS AT CHANGE TIME ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.orderValueAtChange,
    type: FieldMetadataType.NUMBER,
    label: msg`Order Value`,
    description: msg`Total order value at time of change (VND)`,
    icon: 'IconCurrencyDollar',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  orderValueAtChange: number;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.orderCountAtChange,
    type: FieldMetadataType.NUMBER,
    label: msg`Order Count`,
    description: msg`Total order count at time of change`,
    icon: 'IconShoppingCart',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  orderCountAtChange: number;

  // ============ RELATIONS ============

  @WorkspaceRelation({
    standardId: MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.customer,
    type: RelationType.MANY_TO_ONE,
    label: msg`Customer`,
    description: msg`Customer associated with tier change`,
    icon: 'IconUser',
    inverseSideTarget: () => MktCustomerWorkspaceEntity,
    inverseSideFieldKey: 'tierHistories',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  customer: Relation<MktCustomerWorkspaceEntity> | null;

  @WorkspaceJoinColumn('customer')
  customerId: string | null;
}
