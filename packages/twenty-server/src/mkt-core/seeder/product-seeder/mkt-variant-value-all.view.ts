import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { MKT_VARIANT_VALUE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktVariantValuesAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const variantValueObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktVariantValue,
  );

  if (!variantValueObjectMetadata) {
    throw new Error('Product Variant Value object metadata not found');
  }

  return {
    name: 'All Variant Values',
    objectMetadataId: variantValueObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 2,
    icon: 'IconTag',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          variantValueObjectMetadata.fields.find(
            (field) => field.standardId === MKT_VARIANT_VALUE_FIELD_IDS.name,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 180,
      },
      {
        fieldMetadataId:
          variantValueObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_VARIANT_VALUE_FIELD_IDS.mktVariant,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 180,
      },
      {
        fieldMetadataId:
          variantValueObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_VARIANT_VALUE_FIELD_IDS.mktValue,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 180,
      },
    ],
  };
};
