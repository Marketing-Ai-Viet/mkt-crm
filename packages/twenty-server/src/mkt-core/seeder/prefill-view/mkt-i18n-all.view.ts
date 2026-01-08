import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { MKT_I18N_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktI18nAllView = (objectMetadataItems: ObjectMetadataEntity[]) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktI18n,
  );

  if (!itemObjectMetadata) {
    throw new Error('I18n object metadata not found');
  }

  return {
    name: 'All I18n',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 10,
    icon: 'IconBox',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) => field.standardId === MKT_I18N_FIELD_IDS.key,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 180,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) => field.standardId === MKT_I18N_FIELD_IDS.locale,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) => field.standardId === MKT_I18N_FIELD_IDS.description,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) => field.standardId === MKT_I18N_FIELD_IDS.data,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) => field.standardId === MKT_I18N_FIELD_IDS.createdBy,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 120,
      },
    ],
  };
};
