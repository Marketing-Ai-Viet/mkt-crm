// import { msg } from '@lingui/core/macro';
// import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
// import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
// import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
// import { IndexType } from 'src/engine/metadata-modules/index-metadata/index-metadata.entity';
// import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
// import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
// import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
// import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
// import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
// import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
// import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
// import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
// import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
// import {
//   FieldTypeAndNameMetadata,
//   getTsVectorColumnExpressionFromFields,
// } from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';

// import { ORDER_ITEM_STANDARD_FIELD_IDS } from 'src/mkt-core/common/constants/custom-field-ids';
// import { CUSTOM_OBJECT_IDS } from 'src/mkt-core/common/constants/custom-object-ids';
// import { OrderWorkspaceEntity } from 'src/mkt-core/libs/orders/entities/order.workspace-entity';
// import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';

// import { FieldMetadataType } from 'twenty-shared/types';
// import { Relation } from 'typeorm';

// const SEARCH_FIELDS_FOR_ORDER_ITEM: FieldTypeAndNameMetadata[] = [
//   { name: 'productVariantId', type: FieldMetadataType.TEXT },
// ];

// @WorkspaceEntity({
//   standardId: CUSTOM_OBJECT_IDS.orderItem,
//   namePlural: 'order-items',
//   labelSingular: msg`Order Item`,
//   labelPlural: msg`Order Items`,
//   description: msg`Represents an item within an order.`,
//   icon: 'IconListDetails',
//   labelIdentifierStandardId: ORDER_ITEM_STANDARD_FIELD_IDS.productVariantId,
// })
// @WorkspaceIsSearchable()
// export class OrderItemWorkspaceEntity extends BaseWorkspaceEntity {
//   @WorkspaceRelation({
//     standardId: ORDER_ITEM_STANDARD_FIELD_IDS.order,
//     type: RelationType.MANY_TO_ONE,
//     label: msg`Order`,
//     inverseSideTarget: () => OrderWorkspaceEntity,
//     inverseSideFieldKey: 'items',
//     icon: 'IconShoppingCart',
//     onDelete: RelationOnDeleteAction.CASCADE,
//   })
//   @WorkspaceIsNullable()
//   order: Relation<OrderWorkspaceEntity> | null;

//   @WorkspaceJoinColumn('order')
//   orderId: string | null;

//   @WorkspaceField({
//     standardId: ORDER_ITEM_STANDARD_FIELD_IDS.productVariantId,
//     type: FieldMetadataType.TEXT,
//     label: msg`Product Variant ID`,
//   })
//   productVariantId: string;

//   @WorkspaceField({
//     standardId: ORDER_ITEM_STANDARD_FIELD_IDS.productSnapshot,
//     type: FieldMetadataType.TEXT,
//     label: msg`Product Snapshot`,
//   })
//   productSnapshot: any;

//   @WorkspaceField({
//     standardId: ORDER_ITEM_STANDARD_FIELD_IDS.quantity,
//     type: FieldMetadataType.NUMBER,
//     label: msg`Quantity`,
//   })
//   quantity: number;

//   @WorkspaceField({
//     standardId: ORDER_ITEM_STANDARD_FIELD_IDS.unitPrice,
//     type: FieldMetadataType.NUMBER,
//     label: msg`Unit Price`,
//   })
//   unitPrice: number;

//   @WorkspaceRelation({
//     standardId: ORDER_ITEM_STANDARD_FIELD_IDS.timelineActivities,
//     type: RelationType.ONE_TO_MANY,
//     label: msg`Timeline Activities`,
//     description: msg`Timeline Activities linked to the order item`,
//     icon: 'IconIconTimelineEvent',
//     inverseSideTarget: () => TimelineActivityWorkspaceEntity,
//     onDelete: RelationOnDeleteAction.CASCADE,
//   })
//   @WorkspaceIsNullable()
//   @WorkspaceIsSystem()
//   timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

//   @WorkspaceField({
//     standardId: ORDER_ITEM_STANDARD_FIELD_IDS.searchVector,
//     type: FieldMetadataType.TS_VECTOR,
//     label: SEARCH_VECTOR_FIELD.label,
//     description: SEARCH_VECTOR_FIELD.description,
//     icon: 'IconSearch',
//     generatedType: 'STORED',
//     asExpression: getTsVectorColumnExpressionFromFields(
//       SEARCH_FIELDS_FOR_ORDER_ITEM,
//     ),
//   })
//   @WorkspaceIsNullable()
//   @WorkspaceIsSystem()
//   @WorkspaceFieldIndex({ indexType: IndexType.GIN })
//   searchVector: string;
// }
