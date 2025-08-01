import { msg } from '@lingui/core/macro';
import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/index-metadata.entity';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';
import {
  FieldTypeAndNameMetadata,
  getTsVectorColumnExpressionFromFields,
} from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { ORDER_STANDARD_FIELD_IDS } from 'src/mkt-core/common/constants/custom-field-ids';
import { CUSTOM_OBJECT_IDS } from 'src/mkt-core/common/constants/custom-object-ids';
import { FulfillmentWorkspaceEntity } from 'src/mkt-core/libs/orders/entities/fulfillment.workspace-entity';
import { PaymentWorkspaceEntity } from 'src/mkt-core/libs/orders/entities/payment.workspace-entity';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { FieldMetadataType } from 'twenty-shared/types';

// ✅ Define fields to be used for search
const SEARCH_FIELDS_FOR_ORDER: FieldTypeAndNameMetadata[] = [
  { name: 'orderCode', type: FieldMetadataType.TEXT },
  { name: 'note', type: FieldMetadataType.TEXT },
];

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  FULFILLED = 'fulfilled',
}

@WorkspaceEntity({
  standardId: CUSTOM_OBJECT_IDS.order,
  namePlural: 'orders',
  labelSingular: msg`Order`,
  labelPlural: msg`Orders`,
  description: msg`Represents a customer order.`,
  icon: 'IconShoppingCart',
  shortcut: 'O',
  labelIdentifierStandardId: ORDER_STANDARD_FIELD_IDS.orderCode,
})
@WorkspaceIsSearchable()
export class OrderWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: ORDER_STANDARD_FIELD_IDS.orderCode,
    type: FieldMetadataType.TEXT,
    label: msg`Order Code`,
  })
  orderCode: string;

  @WorkspaceField({
    standardId: ORDER_STANDARD_FIELD_IDS.customerId,
    type: FieldMetadataType.TEXT,
    label: msg`Customer ID`,
  })
  @WorkspaceIsNullable()
  customerId?: string;

  @WorkspaceField({
    standardId: ORDER_STANDARD_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Current order status`,
    options: [
      { value: OrderStatus.PENDING, label: 'Pending', color: 'gray', position: 0 },
      { value: OrderStatus.PAID, label: 'Paid', color: 'green', position: 1 },
      { value: OrderStatus.FAILED, label: 'Failed', color: 'red', position: 2 },
      { value: OrderStatus.CANCELLED, label: 'Cancelled', color: 'orange', position: 3 },
      { value: OrderStatus.FULFILLED, label: 'Fulfilled', color: 'blue', position: 4 },
    ],
  })
  @WorkspaceIsNullable()
  status?: OrderStatus;

  @WorkspaceField({
    standardId: ORDER_STANDARD_FIELD_IDS.totalAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Total Amount`,
  })
  @WorkspaceIsNullable()
  totalAmount?: number;

  @WorkspaceField({
    standardId: ORDER_STANDARD_FIELD_IDS.currency,
    type: FieldMetadataType.TEXT,
    label: msg`Currency`,
    defaultValue: "'USD'",
  })
  currency: string;

  @WorkspaceField({
    standardId: ORDER_STANDARD_FIELD_IDS.note,
    type: FieldMetadataType.TEXT,
    label: msg`Note`,
  })
  @WorkspaceIsNullable()
  note?: string;

  @WorkspaceField({
    standardId: ORDER_STANDARD_FIELD_IDS.requireContract,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Require Contract`,
  })
  @WorkspaceIsNullable()
  requireContract?: boolean;

  // @WorkspaceRelation({
  //   standardId: ORDER_STANDARD_FIELD_IDS.items,
  //   type: RelationType.ONE_TO_MANY,
  //   label: msg`Timeline items`,
  //   description: msg`Timeline items linked to the order`,
  //   icon: 'IconIconTimelineEvent',
  //   inverseSideTarget: () => OrderItemWorkspaceEntity,
  //   onDelete: RelationOnDeleteAction.CASCADE,
  // })
  // @WorkspaceIsNullable()
  // items: Relation<OrderItemWorkspaceEntity[]> | null;

  @WorkspaceRelation({
    standardId: ORDER_STANDARD_FIELD_IDS.fulfillments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline fulfillments`,
    description: msg`Timeline fulfillments linked to the order`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => FulfillmentWorkspaceEntity,
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  fulfillments: Relation<FulfillmentWorkspaceEntity[]> | null;

  @WorkspaceRelation({
    standardId: ORDER_STANDARD_FIELD_IDS.payments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Payments`,
    description: msg`Timeline Payments linked to the order`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => PaymentWorkspaceEntity,
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  payments: Relation<PaymentWorkspaceEntity[]> | null;

  @WorkspaceRelation({
    standardId: ORDER_STANDARD_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activities`,
    description: msg`Timeline Activities linked to the order`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  // ✅ Search vector field
  @WorkspaceField({
    standardId: ORDER_STANDARD_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(SEARCH_FIELDS_FOR_ORDER),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
