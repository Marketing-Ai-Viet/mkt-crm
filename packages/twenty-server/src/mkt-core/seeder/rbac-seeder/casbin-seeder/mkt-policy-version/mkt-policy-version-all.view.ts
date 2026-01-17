import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { MKT_POLICY_VERSION_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktPolicyVersionsAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktPolicyVersion,
  );

  if (!itemObjectMetadata) {
    throw new Error('PolicyVersion object metadata not found');
  }

  return {
    name: 'All Policy Versions',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 10,
    icon: 'IconHistory',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_POLICY_VERSION_FIELD_IDS.version,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_POLICY_VERSION_FIELD_IDS.policyHash,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 300,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_POLICY_VERSION_FIELD_IDS.policyCount,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_POLICY_VERSION_FIELD_IDS.syncedAt,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 180,
      },
    ],
  };
};
