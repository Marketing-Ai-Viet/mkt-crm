import { AggregateOperations } from 'src/engine/api/graphql/graphql-query-runner/constants/aggregate-operations.constant';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { BASE_OBJECT_STANDARD_FIELD_IDS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-field-ids';
import { ORDER_STANDARD_FIELD_IDS } from 'src/mkt-core/common/constants/custom-field-ids';
import { CUSTOM_OBJECT_IDS } from 'src/mkt-core/common/constants/custom-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const ordersAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const orderObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === CUSTOM_OBJECT_IDS.order,
  );

  if (!orderObjectMetadata) {
    throw new Error('Order object metadata not found');
  }

  return {
    name: 'All Orders',
    objectMetadataId: orderObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 0,
    icon: 'IconClipboardList',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          orderObjectMetadata.fields.find(
            (field) => field.standardId === ORDER_STANDARD_FIELD_IDS.orderCode,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          orderObjectMetadata.fields.find(
            (field) => field.standardId === ORDER_STANDARD_FIELD_IDS.customerId,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 180,
      },
      {
        fieldMetadataId:
          orderObjectMetadata.fields.find(
            (field) => field.standardId === ORDER_STANDARD_FIELD_IDS.status,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          orderObjectMetadata.fields.find(
            (field) => field.standardId === ORDER_STANDARD_FIELD_IDS.totalAmount,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 150,
        aggregateOperation: AggregateOperations.SUM,
      },
      {
        fieldMetadataId:
          orderObjectMetadata.fields.find(
            (field) => field.standardId === ORDER_STANDARD_FIELD_IDS.currency,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          orderObjectMetadata.fields.find(
            (field) => field.standardId === ORDER_STANDARD_FIELD_IDS.requireContract,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 130,
      },
      {
        fieldMetadataId:
          orderObjectMetadata.fields.find(
            (field) => field.standardId === ORDER_STANDARD_FIELD_IDS.note,
          )?.id ?? '',
        position: 6,
        isVisible: true,
        size: 200,
      },
      {
        fieldMetadataId:
          orderObjectMetadata.fields.find(
            (field) => field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.createdAt,
          )?.id ?? '',
        position: 7,
        isVisible: true,
        size: 150,
      },
    ],
  };
};
