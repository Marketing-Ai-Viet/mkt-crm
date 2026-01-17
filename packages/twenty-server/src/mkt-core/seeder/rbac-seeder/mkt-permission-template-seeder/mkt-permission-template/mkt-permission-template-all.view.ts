import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { MKT_PERMISSION_TEMPLATE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktPermissionTemplatesAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktPermissionTemplate,
  );

  if (!itemObjectMetadata) {
    throw new Error('PermissionTemplate object metadata not found');
  }

  return {
    name: 'All Permission Templates',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 10,
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
              MKT_PERMISSION_TEMPLATE_FIELD_IDS.templateKey,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_TEMPLATE_FIELD_IDS.templateName,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 180,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_TEMPLATE_FIELD_IDS.hierarchyLevel,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_TEMPLATE_FIELD_IDS.priority,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 80,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_TEMPLATE_FIELD_IDS.isSystemTemplate,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_TEMPLATE_FIELD_IDS.isActive,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 80,
      },
    ],
  };
};
