import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import {
  FieldTypeAndNameMetadata,
  getTsVectorColumnExpressionFromFields,
} from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { MKT_PAYMENT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/workspace-entities/mkt-payment-method.workspace-entity';
import { MktPaymentHistoryWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment-history.workspace-entity';
import { MktVirtualAccountWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-virtual-account.workspace-entity';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/mkt-email/workspace-entities';
import {
  PAYMENT_CURRENCY_OPTIONS,
  PAYMENT_TRANSACTION_STATUS_OPTIONS,
  PAYMENT_PROVIDER_OPTIONS,
  TRANSFER_TYPE_OPTIONS,
  MATCH_TYPE_OPTIONS,
  TransferTypeEntity,
  MatchTypeEntity,
} from 'src/mkt-core/payment/constants';
import { PaymentCurrency, PaymentStatus } from 'src/mkt-core/payment/types';
import { PaymentProviderType } from 'src/mkt-core/payment/constants/payment-provider.constants';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

const SEARCH_FIELDS_FOR_PAYMENT: FieldTypeAndNameMetadata[] = [
  { name: 'name', type: FieldMetadataType.TEXT },
  { name: 'description', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPayment,
  namePlural: 'payments',
  labelSingular: msg`Payment`,
  labelPlural: msg`Payments`,
  description: msg`Represents a payment transaction.`,
  icon: 'IconCash',
  shortcut: 'P',
  labelIdentifierStandardId: MKT_PAYMENT_FIELD_IDS.name,
})
//@WorkspaceIsSearchable()
export class MktPaymentWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Payment name or reference`,
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.amount,
    type: FieldMetadataType.NUMBER,
    label: msg`Amount`,
    description: msg`Payment amount`,
    icon: 'IconCash',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  amount: number;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.duration,
    type: FieldMetadataType.NUMBER,
    label: msg`Duration`,
    description: msg`Payment duration in seconds`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  duration?: number | null;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.expiredAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Expired At`,
    description: msg`Payment expiration date and time`,
    icon: 'IconAlarm',
  })
  @WorkspaceIsNullable()
  expiredAt?: string;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.currency,
    type: FieldMetadataType.SELECT,
    label: msg`Currency`,
    description: msg`Payment currency`,
    icon: 'IconCurrencyDollar',
    options: PAYMENT_CURRENCY_OPTIONS,
    defaultValue: "'VND'",
  })
  currency: PaymentCurrency;

  //QR Code URL
  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.qrCodeUrl,
    type: FieldMetadataType.TEXT,
    label: msg`QR Code URL`,
    description: msg`QR Code URL`,
    icon: 'IconQrcode',
  })
  @WorkspaceIsNullable()
  qrCodeUrl?: string;

  //paymentPageUrl
  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.paymentPageUrl,
    type: FieldMetadataType.TEXT,
    label: msg`Payment Page URL`,
    description: msg`Payment Page URL`,
    icon: 'IconLink',
  })
  @WorkspaceIsNullable()
  paymentPageUrl?: string | null;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Payment transaction status`,
    icon: 'IconCheck',
    options: PAYMENT_TRANSACTION_STATUS_OPTIONS,
  })
  @WorkspaceIsNullable()
  status?: PaymentStatus;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.paymentDate,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Payment Date`,
    description: msg`Date and time when payment was made`,
  })
  @WorkspaceIsNullable()
  paymentDate?: string;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Payment description or notes`,
  })
  @WorkspaceIsNullable()
  description?: string;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.invoiceId,
    type: FieldMetadataType.TEXT,
    label: msg`Invoice ID`,
    description: msg`Associated invoice ID (nullable)`,
  })
  @WorkspaceIsNullable()
  invoiceId?: string;

  // SePay integration - unique transaction ID for idempotency check
  // @deprecated Use providerTransactionId instead
  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.sepayTransactionId,
    type: FieldMetadataType.TEXT,
    label: msg`SePay Transaction ID`,
    description: msg`[DEPRECATED] Use providerTransactionId instead`,
    icon: 'IconId',
  })
  @WorkspaceIsNullable()
  @WorkspaceFieldIndex()
  sepayTransactionId?: string;

  // ============================================
  // MULTI-GATEWAY PROVIDER FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.providerType,
    type: FieldMetadataType.SELECT,
    label: msg`Provider Type`,
    description: msg`Payment gateway provider type`,
    icon: 'IconBuildingBank',
    options: PAYMENT_PROVIDER_OPTIONS,
  })
  @WorkspaceIsNullable()
  providerType?: PaymentProviderType;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.providerTransactionId,
    type: FieldMetadataType.TEXT,
    label: msg`Provider Transaction ID`,
    description: msg`Unique transaction ID from payment provider`,
    icon: 'IconHash',
  })
  @WorkspaceIsNullable()
  @WorkspaceFieldIndex()
  providerTransactionId?: string;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.providerResponse,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Provider Response`,
    description: msg`Raw response data from payment provider`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  providerResponse: JSON | null;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.providerMetadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Provider Metadata`,
    description: msg`Provider-specific configuration and data`,
    icon: 'IconSettings',
  })
  @WorkspaceIsNullable()
  providerMetadata: JSON | null;

  // ============================================
  // CONFIRMATION FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.confirmedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Confirmed At`,
    description: msg`Timestamp when payment was confirmed`,
    icon: 'IconCheck',
  })
  @WorkspaceIsNullable()
  confirmedAt?: string;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_FIELD_IDS.confirmedBy,
    type: RelationType.MANY_TO_ONE,
    label: msg`Confirmed By`,
    description: msg`User who confirmed the payment`,
    icon: 'IconUserCheck',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'confirmedPayments',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  confirmedBy: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('confirmedBy')
  confirmedById: string | null;

  // ============================================
  // REJECTION FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.rejectedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Rejected At`,
    description: msg`Timestamp when payment was rejected`,
    icon: 'IconX',
  })
  @WorkspaceIsNullable()
  rejectedAt?: string;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_FIELD_IDS.rejectedBy,
    type: RelationType.MANY_TO_ONE,
    label: msg`Rejected By`,
    description: msg`User who rejected the payment`,
    icon: 'IconUserX',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'rejectedPayments',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  rejectedBy: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('rejectedBy')
  rejectedById: string | null;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.rejectionReason,
    type: FieldMetadataType.TEXT,
    label: msg`Rejection Reason`,
    description: msg`Reason for payment rejection`,
    icon: 'IconAlertCircle',
  })
  @WorkspaceIsNullable()
  rejectionReason?: string;

  // ============================================
  // REFUND FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.refundedAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Refunded Amount`,
    description: msg`Amount that has been refunded`,
    icon: 'IconReceipt2',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  refundedAmount?: number;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.refundedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Refunded At`,
    description: msg`Thời điểm hoàn tiền`,
    icon: 'IconReceiptRefund',
  })
  @WorkspaceIsNullable()
  refundedAt?: Date | null;

  // ============================================
  // VA SUPPORT & MATCHING FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.transferType,
    type: FieldMetadataType.SELECT,
    label: msg`Transfer Type`,
    description: msg`Type of transfer (VA or Regular)`,
    icon: 'IconArrowsExchange',
    options: TRANSFER_TYPE_OPTIONS,
  })
  @WorkspaceIsNullable()
  transferType?: TransferTypeEntity;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.matchType,
    type: FieldMetadataType.SELECT,
    label: msg`Match Type`,
    description: msg`How the payment was matched to an order`,
    icon: 'IconLink',
    options: MATCH_TYPE_OPTIONS,
  })
  @WorkspaceIsNullable()
  matchType?: MatchTypeEntity;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.matchConfidence,
    type: FieldMetadataType.NUMBER,
    label: msg`Match Confidence`,
    description: msg`Confidence score of the match (0-1)`,
    icon: 'IconPercentage',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  matchConfidence?: number;

  // ============================================
  // METADATA
  // ============================================

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`Additional payment metadata`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  metadata: JSON | null;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_FIELD_IDS.mktPaymentMethod,
    type: RelationType.MANY_TO_ONE,
    label: msg`Payment Method`,
    description: msg`Payment method used for this payment`,
    icon: 'IconCreditCard',
    inverseSideTarget: () => MktPaymentMethodWorkspaceEntity,
    inverseSideFieldKey: 'mktPayments',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktPaymentMethod: Relation<MktPaymentMethodWorkspaceEntity>;

  @WorkspaceJoinColumn('mktPaymentMethod')
  mktPaymentMethodId: string;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_FIELD_IDS.mktOrder,
    type: RelationType.MANY_TO_ONE,
    label: msg`Order`,
    description: msg`Order linked to this payment`,
    icon: 'IconBox',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'mktPayments',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktOrder: Relation<MktOrderWorkspaceEntity>;
  @WorkspaceJoinColumn('mktOrder')
  mktOrderId: string;

  //timelineActivities
  @WorkspaceRelation({
    standardId: MKT_PAYMENT_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activities`,
    description: msg`Timeline activities of the payment`,
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    inverseSideFieldKey: 'mktPayment',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_FIELD_IDS.mktPaymentHistories,
    type: RelationType.ONE_TO_MANY,
    label: msg`Payment Histories`,
    description: msg`Payment histories linked to this payment`,
    icon: 'IconHistory',
    inverseSideTarget: () => MktPaymentHistoryWorkspaceEntity,
    inverseSideFieldKey: 'mktPayment',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktPaymentHistories: Relation<MktPaymentHistoryWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_FIELD_IDS.virtualAccount,
    type: RelationType.MANY_TO_ONE,
    label: msg`Virtual Account`,
    description: msg`Virtual account used for this payment`,
    icon: 'IconCreditCard',
    inverseSideTarget: () => MktVirtualAccountWorkspaceEntity,
    inverseSideFieldKey: 'mktPayments',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  virtualAccount: Relation<MktVirtualAccountWorkspaceEntity>;

  @WorkspaceJoinColumn('virtualAccount')
  virtualAccountId: string;

  @WorkspaceRelation({
    standardId: MKT_PAYMENT_FIELD_IDS.mktTemplate,
    type: RelationType.MANY_TO_ONE,
    label: msg`Templates`,
    description: msg`Templates associated with this payment`,
    inverseSideTarget: () => MktTemplateWorkspaceEntity,
    inverseSideFieldKey: 'mktPayments',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktTemplate: Relation<MktTemplateWorkspaceEntity[]>;
  @WorkspaceJoinColumn('mktTemplate')
  mktTemplateId: string;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(
      SEARCH_FIELDS_FOR_PAYMENT,
    ),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;

  @WorkspaceField({
    standardId: MKT_PAYMENT_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;
}
