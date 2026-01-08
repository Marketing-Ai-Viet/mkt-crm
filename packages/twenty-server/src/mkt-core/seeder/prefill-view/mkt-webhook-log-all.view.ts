import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { MKT_WEBHOOK_LOG_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktWebhookLogsAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const itemObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktWebhookLog,
  );

  if (!itemObjectMetadata) {
    throw new Error('WebhookLog object metadata not found');
  }

  return {
    name: 'All Webhook Logs',
    objectMetadataId: itemObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 0,
    icon: 'IconWebhook',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_WEBHOOK_LOG_FIELD_IDS.sepayTransactionId,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 140,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) => field.standardId === MKT_WEBHOOK_LOG_FIELD_IDS.gateway,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) => field.standardId === MKT_WEBHOOK_LOG_FIELD_IDS.status,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_WEBHOOK_LOG_FIELD_IDS.matchedOrderCode,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 150,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_WEBHOOK_LOG_FIELD_IDS.responseStatus,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_WEBHOOK_LOG_FIELD_IDS.processingTimeMs,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 120,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) => field.standardId === MKT_WEBHOOK_LOG_FIELD_IDS.ipAddress,
          )?.id ?? '',
        position: 6,
        isVisible: true,
        size: 130,
      },
      {
        fieldMetadataId:
          itemObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_WEBHOOK_LOG_FIELD_IDS.errorMessage,
          )?.id ?? '',
        position: 7,
        isVisible: false,
        size: 200,
      },
    ],
  };
};
