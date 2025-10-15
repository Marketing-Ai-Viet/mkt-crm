import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import {
  FieldTypeAndNameMetadata,
  getTsVectorColumnExpressionFromFields,
} from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { MKT_PAYMENT_HISTORY_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  PAYMENT_HISTORY_OPTIONS,
  PAYMENT_HISTORY_TYPE,
} from 'src/mkt-core/payment/constants/payment.type';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';
import { MktVariantWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant.workspace-entity';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

const TABLE_NAME = 'mktPaymentHistory';

export const SEARCH_FIELDS: FieldTypeAndNameMetadata[] = [
  { name: 'name', type: FieldMetadataType.TEXT },
  { name: 'note', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPaymentHistory,
  namePlural: `${TABLE_NAME}s`,
  labelSingular: msg`Payment History`,
  labelPlural: msg`Payment Histories`,
  description: msg`Assign payment histories to your workspace`,
  icon: 'IconTag',
  labelIdentifierStandardId: MKT_PAYMENT_HISTORY_FIELD_IDS.name,
})
@WorkspaceIsSearchable()
export class MktPaymentHistoryWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Payment history name`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.paymentType,
    type: FieldMetadataType.SELECT,
    label: msg`Payment Type`,
    description: msg`Payment type`,
    icon: 'IconListDetails',
    options: PAYMENT_HISTORY_OPTIONS,
  })
  @WorkspaceIsNullable()
  paymentType: PAYMENT_HISTORY_TYPE;

  @WorkspaceField({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.amount,
    type: FieldMetadataType.NUMBER,
    label: msg`Amount`,
    description: msg`Payment amount`,
    icon: 'IconCash',
  })
  @WorkspaceIsNullable()
  amount: number;

  @WorkspaceField({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.note,
    type: FieldMetadataType.TEXT,
    label: msg`Note`,
    description: msg`Payment description`,
    icon: 'IconNotes',
  })
  @WorkspaceIsNullable()
  note: string;

  @WorkspaceField({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in the list`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  @WorkspaceIsNullable()
  createdBy: ActorMetadata;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.mktLicense,
    type: RelationType.MANY_TO_ONE,
    label: msg`License`,
    description: msg`The license associated with this payment history`,
    icon: 'IconCertificate',
    inverseSideTarget: () => MktLicenseWorkspaceEntity,
    inverseSideFieldKey: 'mktPaymentHistories',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktLicense: Relation<MktLicenseWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktLicense')
  mktLicenseId: string | null;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.mktOrder,
    type: RelationType.MANY_TO_ONE,
    label: msg`Order`,
    description: msg`The order associated with this payment history`,
    icon: 'IconShoppingCart',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'mktPaymentHistories',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktOrder: Relation<MktOrderWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktOrder')
  mktOrderId: string | null;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.mktVariant,
    type: RelationType.MANY_TO_ONE,
    label: msg`Variant`,
    description: msg`The variant associated with this payment history`,
    icon: 'IconBox',
    inverseSideTarget: () => MktVariantWorkspaceEntity,
    inverseSideFieldKey: 'mktPaymentHistories',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktVariant: Relation<MktVariantWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktVariant')
  mktVariantId: string | null;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.mktPayment,
    type: RelationType.MANY_TO_ONE,
    label: msg`Payment`,
    description: msg`The payment associated with this payment history`,
    icon: 'IconCreditCard',
    inverseSideTarget: () => MktPaymentWorkspaceEntity,
    inverseSideFieldKey: 'mktPaymentHistories',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktPayment: Relation<MktPaymentWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktPayment')
  mktPaymentId: string | null;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.accountOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Account Owner`,
    description: msg`Your team member responsible for managing the payment history`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'accountOwnerForMktPaymentHistories',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('accountOwner')
  accountOwnerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activities`,
    description: msg`Timeline Activities linked to the payment history`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    inverseSideFieldKey: 'mktPaymentHistory',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  @WorkspaceField({
    standardId: MKT_PAYMENT_HISTORY_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconUser',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(SEARCH_FIELDS),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
