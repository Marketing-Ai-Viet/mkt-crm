import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktUserPermissionTemplatesAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktUserPermissionTemplate,
  );

  if (!itemObjectMetadata) {
    throw new Error('UserPermissionTemplate object metadata not found');
  }

  return {
    name: 'All User Permission Templates',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 10,
    icon: 'IconUserShield',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.workspaceMember,
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
              MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.template,
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
              MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.assignedAt,
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
              MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.expiresAt,
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
              MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.assignmentReason,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 200,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.isActive,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 80,
      },
    ],
  };
};
