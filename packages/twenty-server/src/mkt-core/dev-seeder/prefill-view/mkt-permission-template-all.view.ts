import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { BASE_OBJECT_STANDARD_FIELD_IDS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-field-ids';
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
    throw new Error('Permission Template object metadata not found');
  }

  return {
    name: 'All Permission Templates',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 19,
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
        size: 150,
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
        size: 250,
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
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_TEMPLATE_FIELD_IDS.version,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_TEMPLATE_FIELD_IDS.priority,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_TEMPLATE_FIELD_IDS.isSystemTemplate,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_TEMPLATE_FIELD_IDS.isActive,
          )?.id ?? '',
        position: 6,
        isVisible: true,
        size: 80,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_TEMPLATE_FIELD_IDS.createdBySource,
          )?.id ?? '',
        position: 7,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_TEMPLATE_FIELD_IDS.description,
          )?.id ?? '',
        position: 8,
        isVisible: false,
        size: 300,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_TEMPLATE_FIELD_IDS.applicableToLevels,
          )?.id ?? '',
        position: 9,
        isVisible: false,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_TEMPLATE_FIELD_IDS.lastModifiedBy,
          )?.id ?? '',
        position: 10,
        isVisible: false,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_TEMPLATE_FIELD_IDS.lastModifiedAt,
          )?.id ?? '',
        position: 11,
        isVisible: false,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.createdAt,
          )?.id ?? '',
        position: 12,
        isVisible: false,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.updatedAt,
          )?.id ?? '',
        position: 13,
        isVisible: false,
        size: 150,
      },
    ],
  };
};
