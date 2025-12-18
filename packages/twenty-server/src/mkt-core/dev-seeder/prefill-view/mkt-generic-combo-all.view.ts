import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { BASE_OBJECT_STANDARD_FIELD_IDS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-field-ids';
import {
  MKT_GENERIC_COMBO_FIELD_IDS,
  MKT_GENERIC_COMBO_OBJECT_IDS,
} from 'src/mkt-core/mkt-combo/constants';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktGenericCombosAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) =>
      object.standardId === MKT_GENERIC_COMBO_OBJECT_IDS.mktGenericCombo,
  );

  if (!itemObjectMetadata) {
    throw new Error('Generic Combo object metadata not found');
  }

  return {
    name: 'All Generic Combos',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 0,
    icon: 'IconPackages',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.comboCode,
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
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.name,
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
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.pricingType,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.fixedPrice,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.discountPercent,
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
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.currency,
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
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.isActive,
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
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.validFrom,
          )?.id ?? '',
        position: 7,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_GENERIC_COMBO_FIELD_IDS.mktGenericCombo.validTo,
          )?.id ?? '',
        position: 8,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === BASE_OBJECT_STANDARD_FIELD_IDS.createdAt,
          )?.id ?? '',
        position: 9,
        isVisible: true,
        size: 150,
      },
    ],
  };
};
