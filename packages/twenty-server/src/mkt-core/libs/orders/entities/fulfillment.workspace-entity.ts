import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { RelationOnDeleteAction } from 'src/engine/metadata-modules/relation-metadata/relation-on-delete-action.type';

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

import { IndexType } from 'src/engine/metadata-modules/index-metadata/index-metadata.entity';

import { FULFILLMENT_STANDARD_FIELD_IDS } from 'src/mkt-core/common/constants/custom-field-ids';
import { CUSTOM_OBJECT_IDS } from 'src/mkt-core/common/constants/custom-object-ids';
import { OrderWorkspaceEntity } from 'src/mkt-core/libs/orders/entities/order.workspace-entity';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { Relation } from 'typeorm';

const SEARCH_FIELDS_FOR_FULFILLMENT: FieldTypeAndNameMetadata[] = [
  { name: 'trackingNumber', type: FieldMetadataType.TEXT },
  { name: 'carrier', type: FieldMetadataType.TEXT },
  { name: 'notes', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: CUSTOM_OBJECT_IDS.fulfillment,
  namePlural: 'fulfillments',
  labelSingular: msg`Fulfillment`,
  labelPlural: msg`Fulfillments`,
  description: msg`Information about the delivery or shipping of the order.`,
  icon: 'IconTruckDelivery',
  labelIdentifierStandardId: FULFILLMENT_STANDARD_FIELD_IDS.trackingNumber,
})
@WorkspaceIsSearchable()
export class FulfillmentWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: FULFILLMENT_STANDARD_FIELD_IDS.trackingNumber,
    type: FieldMetadataType.TEXT,
    label: msg`Tracking Number`,
  })
  trackingNumber: string;

  @WorkspaceField({
    standardId: FULFILLMENT_STANDARD_FIELD_IDS.carrier,
    type: FieldMetadataType.TEXT,
    label: msg`Carrier`,
  })
  carrier: string;

  @WorkspaceField({
    standardId: FULFILLMENT_STANDARD_FIELD_IDS.fulfilledAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Fulfilled At`,
  })
  @WorkspaceIsNullable()
  fulfilledAt: Date;

  @WorkspaceField({
    standardId: FULFILLMENT_STANDARD_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    options: [
      { value: 'delivered', label: 'Đã giao', color: 'green', position: 1 },
      { value: 'shipping', label: 'Đang giao', color: 'blue', position: 2 },
      { value: 'cancelled', label: 'Đã hủy', color: 'red', position: 3 },
      { value: 'return', label: 'Trả hàng', color: 'gray', position: 4 },
    ],
  })
  @WorkspaceIsNullable()
  status?: 'processing' | 'shipped' | 'delivered' | 'returned';

  @WorkspaceField({
    standardId: FULFILLMENT_STANDARD_FIELD_IDS.notes,
    type: FieldMetadataType.TEXT,
    label: msg`Notes`,
  })
  @WorkspaceIsNullable()
  notes: string;

  @WorkspaceRelation({
    standardId: FULFILLMENT_STANDARD_FIELD_IDS.order,
    type: RelationType.MANY_TO_ONE,
    label: msg`Order`,
    inverseSideTarget: () => OrderWorkspaceEntity,
    inverseSideFieldKey: 'fulfillments',
    icon: 'IconShoppingCart',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  order: Relation<OrderWorkspaceEntity> | null;
  @WorkspaceJoinColumn('order')
  orderId: string | null;

  @WorkspaceRelation({
    standardId: FULFILLMENT_STANDARD_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activities`,
    description: msg`Timeline Activities linked to the order fulfillment.`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  @WorkspaceField({
    standardId: FULFILLMENT_STANDARD_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(
      SEARCH_FIELDS_FOR_FULFILLMENT,
    ),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
