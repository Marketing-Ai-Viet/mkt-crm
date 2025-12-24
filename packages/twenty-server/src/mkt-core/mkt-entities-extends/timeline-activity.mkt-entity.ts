import { msg } from '@lingui/core/macro';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { TIMELINE_ACTIVITY_MKT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MktCustomerTagWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-tag.workspace-entity';
import { MktTagWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-tag.workspace-entity';
import { MktEmailWorkspaceEntity } from 'src/mkt-core/email/objects/mkt-email.workspace-entity';
import { MktI18nWorkspaceEntity } from 'src/mkt-core/i18n/objects/mkt-i18n.workspace-entity';
import { MktSInvoiceAuthWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-auth.workspace-entity';
import { MktSInvoiceFileWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-file.workspace-entity';
import { MktSInvoiceItemWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-item.workspace-entity';
import { MktSInvoiceMetadataWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-metadata.workspace-entity';
import { MktSInvoicePaymentWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-payment.workspace-entity';
import { MktSInvoiceTaxBreakdownWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-tax-breakdown.workspace-entity';
import { MktSInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice.workspace-entity';
import { MktContractWorkspaceEntity } from 'src/mkt-core/contract/workspace-entity/mkt-contract.workspace-entity';
import { MktOrderHistoryWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-history.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { MktPaymentHistoryWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment-history.workspace-entity';
import { MktReportWorkspaceEntity } from 'src/mkt-core/report/objects/mkt-report.workspace-entity';
import { MktOptionWorkspaceEntity } from 'src/mkt-core/setting/objects/mkt-option.workspace-entity';

export class TimelineActivityMktEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktOption,
    type: RelationType.MANY_TO_ONE,
    label: msg`Option`,
    description: msg`Event option`,
    icon: 'IconTag',
    inverseSideTarget: () => MktOptionWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  mktOption: Relation<MktOptionWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktOption')
  mktOptionId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktI18n,
    type: RelationType.MANY_TO_ONE,
    label: msg`I18n`,
    description: msg`Event i18n`,
    icon: 'IconTag',
    inverseSideTarget: () => MktI18nWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktI18n: Relation<MktI18nWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktI18n')
  mktI18nId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktTag,
    type: RelationType.MANY_TO_ONE,
    label: msg`Tag`,
    description: msg`Event tag`,
    icon: 'IconUser',
    inverseSideTarget: () => MktTagWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktTag: Relation<MktTagWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktTag')
  mktTagId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktCustomerTag,
    type: RelationType.MANY_TO_ONE,
    label: msg`Customer Tag`,
    description: msg`Event customer tag`,
    icon: 'IconUser',
    inverseSideTarget: () => MktCustomerTagWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktCustomerTag: Relation<MktCustomerTagWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktCustomerTag')
  mktCustomerTagId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktOrder,
    type: RelationType.MANY_TO_ONE,
    label: msg`Order`,
    description: msg`Event order`,
    icon: 'IconShoppingCart',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktOrder: Relation<MktOrderWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktOrder')
  mktOrderId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktOrderItem,
    type: RelationType.MANY_TO_ONE,
    label: msg`Order Item`,
    description: msg`Event order item`,
    icon: 'IconShoppingCartCog',
    inverseSideTarget: () => MktOrderItemWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktOrderItem: Relation<MktOrderItemWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktOrderItem')
  mktOrderItemId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktPayment,
    type: RelationType.MANY_TO_ONE,
    label: msg`Payment`,
    description: msg`Event payment`,
    icon: 'IconBox',
    inverseSideTarget: () => MktPaymentWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktPayment: Relation<MktPaymentWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktPayment')
  mktPaymentId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktPaymentHistory,
    type: RelationType.MANY_TO_ONE,
    label: msg`Payment History`,
    description: msg`Event payment history`,
    icon: 'IconBox',
    inverseSideTarget: () => MktPaymentHistoryWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktPaymentHistory: Relation<MktPaymentHistoryWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktPaymentHistory')
  mktPaymentHistoryId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktOrderHistory,
    type: RelationType.MANY_TO_ONE,
    label: msg`Order History`,
    description: msg`Event order history`,
    icon: 'IconHistory',
    inverseSideTarget: () => MktOrderHistoryWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktOrderHistory: Relation<MktOrderHistoryWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktOrderHistory')
  mktOrderHistoryId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktSInvoiceAuth,
    type: RelationType.MANY_TO_ONE,
    label: msg`SInvoice Auth`,
    description: msg`Event SInvoice Auth`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoiceAuthWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  mktSInvoiceAuth: Relation<MktSInvoiceAuthWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktSInvoiceAuth')
  mktSInvoiceAuthId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktSInvoice,
    type: RelationType.MANY_TO_ONE,
    label: msg`SInvoice`,
    description: msg`Event SInvoice`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoiceWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  mktSInvoice: Relation<MktSInvoiceWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktSInvoice')
  mktSInvoiceId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktSInvoicePayment,
    type: RelationType.MANY_TO_ONE,
    label: msg`SInvoice Payment`,
    description: msg`Event SInvoice Payment`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoicePaymentWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  mktSInvoicePayment: Relation<MktSInvoicePaymentWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktSInvoicePayment')
  mktSInvoicePaymentId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktSInvoiceItem,
    type: RelationType.MANY_TO_ONE,
    label: msg`SInvoice Item`,
    description: msg`Event SInvoice Item`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoiceItemWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  mktSInvoiceItem: Relation<MktSInvoiceItemWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktSInvoiceItem')
  mktSInvoiceItemId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktSInvoiceTaxBreakdown,
    type: RelationType.MANY_TO_ONE,
    label: msg`SInvoice Tax Breakdown`,
    description: msg`Event SInvoice Tax Breakdown`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoiceTaxBreakdownWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  mktSInvoiceTaxBreakdown: Relation<MktSInvoiceTaxBreakdownWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktSInvoiceTaxBreakdown')
  mktSInvoiceTaxBreakdownId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktSInvoiceMetadata,
    type: RelationType.MANY_TO_ONE,
    label: msg`SInvoice Metadata`,
    description: msg`Event SInvoice Metadata`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoiceMetadataWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  mktSInvoiceMetadata: Relation<MktSInvoiceMetadataWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktSInvoiceMetadata')
  mktSInvoiceMetadataId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktSInvoiceFile,
    type: RelationType.MANY_TO_ONE,
    label: msg`SInvoice File`,
    description: msg`Event SInvoice File`,
    icon: 'IconFile',
    inverseSideTarget: () => MktSInvoiceFileWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  mktSInvoiceFile: Relation<MktSInvoiceFileWorkspaceEntity> | null;
  @WorkspaceJoinColumn('mktSInvoiceFile')
  mktSInvoiceFileId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktTemplate,
    type: RelationType.MANY_TO_ONE,
    label: msg`Template`,
    description: msg`Event template`,
    icon: 'IconBox',
    inverseSideTarget: () => MktTemplateWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktTemplate: Relation<MktTemplateWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktTemplate')
  mktTemplateId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktReport,
    type: RelationType.MANY_TO_ONE,
    label: msg`Report`,
    description: msg`Event report`,
    icon: 'IconReportAnalytics',
    inverseSideTarget: () => MktReportWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktReport: Relation<MktReportWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktReport')
  mktReportId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktContract,
    type: RelationType.MANY_TO_ONE,
    label: msg`Contract`,
    description: msg`Event contract`,
    icon: 'IconFileContract',
    inverseSideTarget: () => MktContractWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktContract: Relation<MktContractWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktContract')
  mktContractId: string | null;

  @WorkspaceRelation({
    standardId: TIMELINE_ACTIVITY_MKT_FIELD_IDS.mktEmail,
    type: RelationType.MANY_TO_ONE,
    label: msg`Email`,
    description: msg`Event email`,
    icon: 'IconMail',
    inverseSideTarget: () => MktEmailWorkspaceEntity,
    inverseSideFieldKey: 'timelineActivities',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktEmail: Relation<MktEmailWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktEmail')
  mktEmailId: string | null;
}
