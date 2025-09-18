import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { BASE_OBJECT_STANDARD_FIELD_IDS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-field-ids';
import { MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktTemplateResourcePermissionsAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) =>
      object.standardId === MKT_OBJECT_IDS.mktTemplateResourcePermission,
  );

  if (!itemObjectMetadata) {
    throw new Error('Template Resource Permission object metadata not found');
  }

  return {
    name: 'All Template Resource Permissions',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 20,
    icon: 'IconShieldCheck',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.template,
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
              MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.resource,
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
              MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.allowedActions,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 250,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.deniedActions,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 200,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.isActive,
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
              MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.conditions,
          )?.id ?? '',
        position: 5,
        isVisible: false,
        size: 300,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.restrictions,
          )?.id ?? '',
        position: 6,
        isVisible: false,
        size: 300,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.createdAt,
          )?.id ?? '',
        position: 7,
        isVisible: false,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.updatedAt,
          )?.id ?? '',
        position: 8,
        isVisible: false,
        size: 150,
      },
    ],
  };
};
