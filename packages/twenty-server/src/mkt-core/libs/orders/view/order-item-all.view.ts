import { AggregateOperations } from 'src/engine/api/graphql/graphql-query-runner/constants/aggregate-operations.constant';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { BASE_OBJECT_STANDARD_FIELD_IDS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-field-ids';
import { ORDER_ITEM_STANDARD_FIELD_IDS } from 'src/mkt-core/common/constants/custom-field-ids';
import { CUSTOM_OBJECT_IDS } from 'src/mkt-core/common/constants/custom-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const orderItemsAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const orderItemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === CUSTOM_OBJECT_IDS.orderItem,
  );

  if (!orderItemObjectMetadata) {
    throw new Error('Order Item object metadata not found');
  }

  return {
    name: 'All Order Items',
    objectMetadataId: orderItemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 0,
    icon: 'IconListDetails',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          orderItemObjectMetadata.fields.find(
            (field) =>
              field.standardId === ORDER_ITEM_STANDARD_FIELD_IDS.order,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          orderItemObjectMetadata.fields.find(
            (field) =>
              field.standardId === ORDER_ITEM_STANDARD_FIELD_IDS.productVariantId,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 180,
      },
      {
        fieldMetadataId:
          orderItemObjectMetadata.fields.find(
            (field) =>
              field.standardId === ORDER_ITEM_STANDARD_FIELD_IDS.productSnapshot,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          orderItemObjectMetadata.fields.find(
            (field) =>
              field.standardId === ORDER_ITEM_STANDARD_FIELD_IDS.quantity,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 100,
        aggregateOperation: AggregateOperations.SUM,
      },
      {
        fieldMetadataId:
          orderItemObjectMetadata.fields.find(
            (field) =>
              field.standardId === ORDER_ITEM_STANDARD_FIELD_IDS.unitPrice,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 150,
        aggregateOperation: AggregateOperations.SUM,
      },
      {
        fieldMetadataId:
          orderItemObjectMetadata.fields.find(
            (field) =>
              field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.createdAt,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 150,
      },
    ],
  };
};
