import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { BASE_OBJECT_STANDARD_FIELD_IDS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-field-ids';
import {
  MKT_GENERIC_COMBO_FIELD_IDS,
  MKT_GENERIC_COMBO_OBJECT_IDS,
} from 'src/mkt-core/mkt-combo/constants';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktGenericComboItemsAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) =>
      object.standardId === MKT_GENERIC_COMBO_OBJECT_IDS.mktGenericComboItem,
  );

  if (!itemObjectMetadata) {
    throw new Error('Generic Combo Item object metadata not found');
  }

  return {
    name: 'All Generic Combo Items',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 0,
    icon: 'IconBox',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.displayName,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 200,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.itemType,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.quantity,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 80,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.overridePrice,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.position,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 80,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem
                .externalProductCode,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.serviceName,
          )?.id ?? '',
        position: 6,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericComboItem.customName,
          )?.id ?? '',
        position: 7,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.createdAt,
          )?.id ?? '',
        position: 8,
        isVisible: true,
        size: 150,
      },
    ],
  };
};
