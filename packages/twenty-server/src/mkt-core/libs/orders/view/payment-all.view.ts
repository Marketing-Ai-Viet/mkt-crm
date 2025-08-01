import { AggregateOperations } from 'src/engine/api/graphql/graphql-query-runner/constants/aggregate-operations.constant';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { PAYMENT_STANDARD_FIELD_IDS } from 'src/mkt-core/common/constants/custom-field-ids';
import { CUSTOM_OBJECT_IDS } from 'src/mkt-core/common/constants/custom-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const paymentsAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const paymentObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === CUSTOM_OBJECT_IDS.payment,
  );

  if (!paymentObjectMetadata) {
    throw new Error('Payment object metadata not found');
  }

  // Build raw fields
  const rawFields = [
    {
      standardId: PAYMENT_STANDARD_FIELD_IDS.method,
      position: 0,
      size: 120,
    },
    {
      standardId: PAYMENT_STANDARD_FIELD_IDS.provider,
      position: 1,
      size: 130,
    },
    {
      standardId: PAYMENT_STANDARD_FIELD_IDS.amount,
      position: 2,
      size: 130,
      aggregateOperation: AggregateOperations.SUM,
    },
    {
      standardId: PAYMENT_STANDARD_FIELD_IDS.currency,
      position: 3,
      size: 100,
    },
    {
      standardId: PAYMENT_STANDARD_FIELD_IDS.status,
      position: 4,
      size: 120,
    },
    {
      standardId: PAYMENT_STANDARD_FIELD_IDS.transactionId,
      position: 5,
      size: 180,
    },
    {
      standardId: PAYMENT_STANDARD_FIELD_IDS.paidAt,
      position: 6,
      size: 150,
    },
  ];

  // Resolve and filter fields
  const resolvedFields = rawFields
    .map((field) => {
      const meta = paymentObjectMetadata.fields.find(
        (f) => f.standardId === field.standardId,
      );
      if (!meta) {
        console.warn(
          `[paymentsAllView] Field with standardId "${field.standardId}" not found in metadata`,
        );
        return null;
      }

      return {
        fieldMetadataId: meta.id,
        position: field.position,
        isVisible: true,
        size: field.size,
        aggregateOperation: field.aggregateOperation,
      };
    })
    .filter((field): field is Exclude<typeof field, null> => !!field); // Remove nulls

  return {
    name: 'All Payments',
    objectMetadataId: paymentObjectMetadata.id,
    type: 'table',
    key: 'INDEX',
    position: 0,
    icon: 'IconCurrencyDollar',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: resolvedFields,
  };
};
