import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_PROMOTION_FIELD_IDS } from 'src/mkt-core/mkt-promotion/constants';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktPromotionAuditsAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktPromotionAudit,
  );

  if (!itemObjectMetadata) {
    throw new Error('Promotion Audit object metadata not found');
  }

  return {
    name: 'All Promotion Audits',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 10,
    icon: 'IconFileText',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PROMOTION_FIELD_IDS.mktPromotionAudit.action,
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
              MKT_PROMOTION_FIELD_IDS.mktPromotionAudit.changedBy,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PROMOTION_FIELD_IDS.mktPromotionAudit.changedAt,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 180,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PROMOTION_FIELD_IDS.mktPromotionAudit.previousValues,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 200,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId ===
              MKT_PROMOTION_FIELD_IDS.mktPromotionAudit.newValues,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 200,
      },
    ],
  };
};
