import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { BASE_OBJECT_STANDARD_FIELD_IDS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-field-ids';
import { MKT_PERMISSION_ACTION_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktPermissionActionsAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktPermissionAction,
  );

  if (!itemObjectMetadata) {
    throw new Error('Permission Action object metadata not found');
  }

  return {
    name: 'All Permission Actions',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 18,
    icon: 'IconClick',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_ACTION_FIELD_IDS.actionKey,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_ACTION_FIELD_IDS.actionName,
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
              MKT_PERMISSION_ACTION_FIELD_IDS.actionCategory,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_ACTION_FIELD_IDS.description,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 300,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_ACTION_FIELD_IDS.riskLevel,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_ACTION_FIELD_IDS.requiresApproval,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 140,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PERMISSION_ACTION_FIELD_IDS.isSystemAction,
          )?.id ?? '',
        position: 6,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_PERMISSION_ACTION_FIELD_IDS.isActive,
          )?.id ?? '',
        position: 7,
        isVisible: true,
        size: 80,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.createdAt,
          )?.id ?? '',
        position: 8,
        isVisible: false,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.updatedAt,
          )?.id ?? '',
        position: 9,
        isVisible: false,
        size: 150,
      },
    ],
  };
};
