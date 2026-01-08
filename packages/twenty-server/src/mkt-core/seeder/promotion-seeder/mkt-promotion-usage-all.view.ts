import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_PROMOTION_FIELD_IDS } from 'src/mkt-core/mkt-promotion/constants';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktPromotionUsagesAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktPromotionUsage,
  );

  if (!itemObjectMetadata) {
    throw new Error('Promotion Usage object metadata not found');
  }

  return {
    name: 'All Promotion Usages',
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
              field.standardId ===
              MKT_PROMOTION_FIELD_IDS.mktPromotionUsage.discountAmount,
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
              MKT_PROMOTION_FIELD_IDS.mktPromotionUsage.originalAmount,
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
              MKT_PROMOTION_FIELD_IDS.mktPromotionUsage.appliedAt,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 180,
      },
    ],
  };
};
