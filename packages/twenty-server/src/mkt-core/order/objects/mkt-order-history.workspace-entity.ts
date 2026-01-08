import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { Relation } from 'typeorm';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';

import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { RelationOnDeleteAction } from 'src/engine/metadata-modules/relation-metadata/relation-on-delete-action.type';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import {
  FieldTypeAndNameMetadata,
  getTsVectorColumnExpressionFromFields,
} from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { MKT_ORDER_HISTORY_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import {
  ORDER_HISTORY_ACTION,
  ORDER_HISTORY_ACTION_OPTIONS,
} from 'src/mkt-core/order/constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';

const TABLE_ORDER_HISTORY_NAME = 'mktOrderHistory';

export const SEARCH_FIELDS: FieldTypeAndNameMetadata[] = [
  { name: 'name', type: FieldMetadataType.TEXT },
  { name: 'note', type: FieldMetadataType.TEXT },
  { name: 'newValue', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktOrderHistory,
  namePlural: `${TABLE_ORDER_HISTORY_NAME}s`,
  labelSingular: msg`Order History`,
  labelPlural: msg`Orders Histories`,
  description: msg`Order History entity for tracking order changes`,
  icon: 'IconHistory',
  labelIdentifierStandardId: MKT_ORDER_HISTORY_FIELD_IDS.name,
})
//@WorkspaceIsSearchable()
export class MktOrderHistoryWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Order History Name`,
    description: msg`Order history name`,
    icon: 'IconFileText',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.action,
    type: FieldMetadataType.SELECT,
    label: msg`Order Action`,
    description: msg`Order action performed`,
    icon: 'IconHistory',
    options: ORDER_HISTORY_ACTION_OPTIONS,
  })
  @WorkspaceIsNullable()
  action: ORDER_HISTORY_ACTION | null;

  @WorkspaceField({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`Additional metadata for the order history`,
    icon: 'IconInfoCircle',
  })
  @WorkspaceIsNullable()
  metadata: JSON;

  @WorkspaceField({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.note,
    type: FieldMetadataType.TEXT,
    label: msg`Notes`,
    description: msg`Order History notes`,
    icon: 'IconNotes',
  })
  @WorkspaceIsNullable()
  note?: string;

  @WorkspaceField({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.oldValue,
    type: FieldMetadataType.TEXT,
    label: msg`Old Value`,
    description: msg`Previous value before change`,
    icon: 'IconRotateClockwise',
  })
  @WorkspaceIsNullable()
  oldValue?: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.newValue,
    type: FieldMetadataType.TEXT,
    label: msg`New Value`,
    description: msg`New value after change`,
    icon: 'IconRotateCounterClockwise',
  })
  @WorkspaceIsNullable()
  newValue?: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.fieldName,
    type: FieldMetadataType.TEXT,
    label: msg`Field Name`,
    description: msg`Name of the field that was changed`,
    icon: 'IconTag',
  })
  @WorkspaceIsNullable()
  fieldName?: string;

  @WorkspaceField({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;

  @WorkspaceField({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;

  // Relations
  @WorkspaceRelation({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.mktOrder,
    type: RelationType.MANY_TO_ONE,
    label: msg`Order`,
    description: msg`Order related to this history record`,
    icon: 'IconShoppingCart',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'mktOrderHistories',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktOrder: Relation<MktOrderWorkspaceEntity>;

  @WorkspaceJoinColumn('mktOrder')
  mktOrderId: string;

  @WorkspaceRelation({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activities`,
    description: msg`Timeline Activities linked to the order history`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    inverseSideFieldKey: 'mktOrderHistory',
  })
  @WorkspaceIsNullable()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  // ✅ Search vector field
  @WorkspaceField({
    standardId: MKT_ORDER_HISTORY_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(SEARCH_FIELDS),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
