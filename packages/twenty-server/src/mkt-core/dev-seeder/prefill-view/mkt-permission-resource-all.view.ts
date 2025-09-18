import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { BASE_OBJECT_STANDARD_FIELD_IDS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-field-ids';
import { MKT_PERMISSION_RESOURCE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktPermissionResourcesAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktPermissionResource,
  );

  if (!itemObjectMetadata) {
    throw new Error('Permission Resource object metadata not found');
  }

  return {
    name: 'All Permission Resources',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 17,
    icon: 'IconShield',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_RESOURCE_FIELD_IDS.resourceKey,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_RESOURCE_FIELD_IDS.resourceName,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 200,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_RESOURCE_FIELD_IDS.resourceCategory,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_RESOURCE_FIELD_IDS.description,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 300,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_RESOURCE_FIELD_IDS.isSystemResource,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_RESOURCE_FIELD_IDS.isActive,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 80,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_RESOURCE_FIELD_IDS.displayOrder,
          )?.id ?? '',
        position: 6,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_RESOURCE_FIELD_IDS.icon,
          )?.id ?? '',
        position: 7,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_RESOURCE_FIELD_IDS.colorCode,
          )?.id ?? '',
        position: 8,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_RESOURCE_FIELD_IDS.position,
          )?.id ?? '',
        position: 9,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.createdAt,
          )?.id ?? '',
        position: 10,
        isVisible: false,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.updatedAt,
          )?.id ?? '',
        position: 11,
        isVisible: false,
        size: 150,
      },
    ],
  };
};
