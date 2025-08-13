import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import {
  FieldTypeAndNameMetadata,
  getTsVectorColumnExpressionFromFields,
} from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktContractWorkspaceEntity } from 'src/mkt-core/contract/mkt-contract.workspace-entity';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MKT_ORDER_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order-item/mkt-order-item.workspace-entity';

import { ORDER_STATUS_OPTIONS, OrderStatus } from './constants';

// Define fields to be used for search
const SEARCH_FIELDS_FOR_ORDER: FieldTypeAndNameMetadata[] = [
  { name: 'orderCode', type: FieldMetadataType.TEXT },
  { name: 'note', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktOrder,
  namePlural: 'orders',
  labelSingular: msg`Order`,
  labelPlural: msg`Orders`,
  description: msg`Represents a customer order.`,
  icon: 'IconShoppingCart',
  shortcut: 'O',
  labelIdentifierStandardId: MKT_ORDER_FIELD_IDS.name,
})
@WorkspaceIsSearchable()
export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.orderCode,
    type: FieldMetadataType.TEXT,
    label: msg`Order Code`,
  })
  orderCode: string;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Current order status`,
    options: ORDER_STATUS_OPTIONS,
  })
  @WorkspaceIsNullable()
  status?: OrderStatus;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.totalAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Total Amount`,
  })
  @WorkspaceIsNullable()
  totalAmount?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.currency,
    type: FieldMetadataType.TEXT,
    label: msg`Currency`,
    defaultValue: "'USD'",
  })
  currency: string;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.note,
    type: FieldMetadataType.TEXT,
    label: msg`Note`,
  })
  @WorkspaceIsNullable()
  note?: string;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.requireContract,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Require Contract`,
  })
  @WorkspaceIsNullable()
  requireContract?: boolean;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.orderItems,
    type: RelationType.ONE_TO_MANY,
    label: msg`Order Items`,
    description: msg`Items included in this order`,
    icon: 'IconShoppingCartCog',
    inverseSideTarget: () => MktOrderItemWorkspaceEntity,
    inverseSideFieldKey: 'mktOrder',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  orderItems: Relation<MktOrderItemWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.mktLicense,
    type: RelationType.ONE_TO_MANY,
    label: msg`Licenses`,
    description: msg`Licenses linked to the order`,
    icon: 'IconBox',
    inverseSideTarget: () => MktLicenseWorkspaceEntity,
    inverseSideFieldKey: 'mktOrder',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktLicense: Relation<MktLicenseWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.mktContract,
    type: RelationType.MANY_TO_ONE,
    label: msg`Contracts`,
    description: msg`Contracts linked to the order`,
    icon: 'IconBox',
    inverseSideTarget: () => MktContractWorkspaceEntity,
    inverseSideFieldKey: 'mktOrders',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktContract: Relation<MktContractWorkspaceEntity[]>;

  @WorkspaceJoinColumn('mktContract')
  mktContractId: string | null;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activities`,
    description: msg`Timeline Activities linked to the order`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    inverseSideFieldKey: 'mktOrder',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  // ✅ Search vector field
  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(
      SEARCH_FIELDS_FOR_ORDER,
    ),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.accountOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Account Owner`,
    description: msg`Your team member responsible for managing the order account`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'accountOwnerForMktOrders',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('accountOwner')
  accountOwnerId: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;
}
