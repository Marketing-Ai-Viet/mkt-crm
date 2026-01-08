import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktCustomerTierHistoriesAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktCustomerTierHistory,
  );

  if (!itemObjectMetadata) {
    return null;
  }

  return {
    name: 'All Tier Histories',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 0,
    icon: 'IconHistory',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.customer,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 180,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.previousTier,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.newTier,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.reason,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.orderValueAtChange,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 140,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS.orderCountAtChange,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 120,
      },
    ],
  };
};
