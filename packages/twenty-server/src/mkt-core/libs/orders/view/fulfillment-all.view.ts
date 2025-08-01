import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { FULFILLMENT_STANDARD_FIELD_IDS } from 'src/mkt-core/common/constants/custom-field-ids';
import { CUSTOM_OBJECT_IDS } from 'src/mkt-core/common/constants/custom-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const fulfillmentsAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const fulfillmentObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === CUSTOM_OBJECT_IDS.fulfillment,
  );

  if (!fulfillmentObjectMetadata) {
    throw new Error('Fulfillment object metadata not found');
  }

  return {
    name: 'All Fulfillments',
    objectMetadataId: fulfillmentObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 0,
    icon: 'IconTruck',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId: fulfillmentObjectMetadata.fields.find(
          (f) => f.standardId === FULFILLMENT_STANDARD_FIELD_IDS.trackingNumber,
        )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 160,
      },
      {
        fieldMetadataId: fulfillmentObjectMetadata.fields.find(
          (f) => f.standardId === FULFILLMENT_STANDARD_FIELD_IDS.carrier,
        )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId: fulfillmentObjectMetadata.fields.find(
          (f) => f.standardId === FULFILLMENT_STANDARD_FIELD_IDS.fulfilledAt,
        )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId: fulfillmentObjectMetadata.fields.find(
          (f) => f.standardId === FULFILLMENT_STANDARD_FIELD_IDS.status,
        )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId: fulfillmentObjectMetadata.fields.find(
          (f) => f.standardId === FULFILLMENT_STANDARD_FIELD_IDS.notes,
        )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 200,
      },
    ],
  };
};
