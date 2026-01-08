import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_PROMOTION_FIELD_IDS } from 'src/mkt-core/mkt-promotion/constants';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktPromotionRulesAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktPromotionRule,
  );

  if (!itemObjectMetadata) {
    throw new Error('Promotion Rule object metadata not found');
  }

  return {
    name: 'All Promotion Rules',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 10,
    icon: 'IconRuler',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PROMOTION_FIELD_IDS.mktPromotionRule.name,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 180,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PROMOTION_FIELD_IDS.mktPromotionRule.ruleType,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PROMOTION_FIELD_IDS.mktPromotionRule.operator,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PROMOTION_FIELD_IDS.mktPromotionRule.isRequired,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PROMOTION_FIELD_IDS.mktPromotionRule.logicOperator,
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
              MKT_PROMOTION_FIELD_IDS.mktPromotionRule.position,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 80,
      },
    ],
  };
};
