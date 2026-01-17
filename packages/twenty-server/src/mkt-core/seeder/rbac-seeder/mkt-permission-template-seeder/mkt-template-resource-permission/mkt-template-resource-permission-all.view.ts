import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
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
    throw new Error('TemplateResourcePermission object metadata not found');
  }

  return {
    name: 'All Template Resource Permissions',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 10,
    icon: 'IconLock',
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
        size: 150,
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
        size: 150,
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
        size: 200,
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
        size: 150,
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
    ],
  };
};
