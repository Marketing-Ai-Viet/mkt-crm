import { msg } from '@lingui/core/macro';
import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/index-metadata.entity';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';
import {
  FieldTypeAndNameMetadata,
  getTsVectorColumnExpressionFromFields,
} from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { PAYMENT_STANDARD_FIELD_IDS } from 'src/mkt-core/common/constants/custom-field-ids';
import { CUSTOM_OBJECT_IDS } from 'src/mkt-core/common/constants/custom-object-ids';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { FieldMetadataType } from 'twenty-shared/types';
import { OrderWorkspaceEntity } from './order.workspace-entity';
// ✅ Define fields to be included in search vector
const SEARCH_FIELDS_FOR_PAYMENT: FieldTypeAndNameMetadata[] = [
  { name: 'method', type: FieldMetadataType.TEXT },
  { name: 'provider', type: FieldMetadataType.TEXT },
];

export enum PaymentStatusEnum {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@WorkspaceEntity({
  standardId: CUSTOM_OBJECT_IDS.payment,
  namePlural: 'payments',
  labelSingular: msg`Payment`,
  labelPlural: msg`Payments`,
  description: msg`Represents a payment record for an order.`,
  icon: 'IconCurrencyDollar',
  shortcut: 'P',
  labelIdentifierStandardId: PAYMENT_STANDARD_FIELD_IDS.method,
})
@WorkspaceIsSearchable()
export class PaymentWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: PAYMENT_STANDARD_FIELD_IDS.method,
    type: FieldMetadataType.TEXT,
    label: msg`Method`,
  })
  method: string;

  @WorkspaceField({
    standardId: PAYMENT_STANDARD_FIELD_IDS.provider,
    type: FieldMetadataType.TEXT,
    label: msg`Provider`,
  })
  provider: string;

  @WorkspaceField({
    standardId: PAYMENT_STANDARD_FIELD_IDS.amount,
    type: FieldMetadataType.NUMBER,
    label: msg`Amount`,
  })
  @WorkspaceIsNullable()
  amount?: number;

  @WorkspaceField({
    standardId: PAYMENT_STANDARD_FIELD_IDS.currency,
    type: FieldMetadataType.TEXT,
    label: msg`Currency`,
    defaultValue: "'USD'",
  })
  currency: string;

  @WorkspaceField({
    standardId: PAYMENT_STANDARD_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    options: [
      { value: PaymentStatusEnum.PENDING, label: 'Pending', color: 'gray', position: 0 },
      { value: PaymentStatusEnum.PAID, label: 'Paid', color: 'green', position: 1 },
      { value: PaymentStatusEnum.FAILED, label: 'Failed', color: 'red', position: 2 },
      { value: PaymentStatusEnum.CANCELLED, label: 'Cancelled', color: 'orange', position: 3 },
    ],
  })
  @WorkspaceIsNullable()
  status?: PaymentStatusEnum;

  @WorkspaceRelation({
    standardId: PAYMENT_STANDARD_FIELD_IDS.order,
    type: RelationType.MANY_TO_ONE,
    label: msg`order`,
    inverseSideTarget: () => OrderWorkspaceEntity,
    inverseSideFieldKey: 'payments',
    icon: 'IconShoppingCart',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  order: Relation<OrderWorkspaceEntity> | null;
  @WorkspaceJoinColumn('order')
  orderId: string | null;

  @WorkspaceRelation({
      standardId: PAYMENT_STANDARD_FIELD_IDS.timelineActivities,
      type: RelationType.ONE_TO_MANY,
      label: msg`Timeline Activities`,
      description: msg`Timeline Activities linked to the order`,
      icon: 'IconIconTimelineEvent',
      inverseSideTarget: () => TimelineActivityWorkspaceEntity,
      onDelete: RelationOnDeleteAction.CASCADE,
    })
    @WorkspaceIsNullable()
    @WorkspaceIsSystem()
    timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  // ✅ Search vector field
  @WorkspaceField({
    standardId: PAYMENT_STANDARD_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(SEARCH_FIELDS_FOR_PAYMENT),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
