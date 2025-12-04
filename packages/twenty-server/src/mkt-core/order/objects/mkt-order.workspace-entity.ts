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
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import {
  FieldTypeAndNameMetadata,
  getTsVectorColumnExpressionFromFields,
} from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { MKT_ORDER_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktSInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice.workspace-entity';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktContractWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-contract.workspace-entity';
import { MktOrderHistoryWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-history.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';
import { MktPaymentHistoryWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment-history.workspace-entity';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

// Define fields to be used for search
const SEARCH_FIELDS_FOR_ORDER: FieldTypeAndNameMetadata[] = [
  { name: 'orderCode', type: FieldMetadataType.TEXT },
  { name: 'note', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktOrder,
  namePlural: 'orders',
  labelSingular: msg`Order`,
  labelPlural: msg`Orders`,
  description: msg`Represents a customer order.`,
  icon: 'IconShoppingCart',
  shortcut: 'O',
  labelIdentifierStandardId: MKT_ORDER_FIELD_IDS.name,
})
@WorkspaceIsSearchable()
export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.trialLicense,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Trial License`,
    description: msg`Whether the order has a trial license`,
    icon: 'IconBox',
    defaultValue: false,
  })
  @WorkspaceIsNullable()
  trialLicense?: boolean;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.orderCode,
    type: FieldMetadataType.TEXT,
    label: msg`Order Code`,
  })
  @WorkspaceIsNullable()
  orderCode: string;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.status,
    type: FieldMetadataType.TEXT,
    label: msg`Status`,
    description: msg`Current order status`,
    icon: 'IconProgressCheck',
  })
  @WorkspaceIsNullable()
  status: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.totalAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Total Amount`,
  })
  @WorkspaceIsNullable()
  totalAmount?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.currency,
    type: FieldMetadataType.TEXT,
    label: msg`Currency`,
    defaultValue: "'VND'",
  })
  currency: string;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.note,
    type: FieldMetadataType.TEXT,
    label: msg`Note`,
  })
  @WorkspaceIsNullable()
  note?: string;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.subtotal,
    type: FieldMetadataType.NUMBER,
    label: msg`Subtotal`,
  })
  @WorkspaceIsNullable()
  subtotal?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.tax,
    type: FieldMetadataType.NUMBER,
    label: msg`Tax`,
  })
  @WorkspaceIsNullable()
  tax?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.discount,
    type: FieldMetadataType.NUMBER,
    label: msg`Discount`,
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  discount?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.refundAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Refund Amount`,
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  refundAmount?: number;

  //discount_percent
  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.discountPercent,
    type: FieldMetadataType.NUMBER,
    label: msg`Discount Percent`,
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  discountPercent?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.requireContract,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Require Contract`,
    defaultValue: false,
  })
  @WorkspaceIsNullable()
  requireContract?: boolean | null;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.sInvoiceStatus,
    type: FieldMetadataType.TEXT,
    label: msg`SInvoice Status`,
    description: msg`Status of the SInvoice`,
  })
  @WorkspaceIsNullable()
  sInvoiceStatus?: string;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.licenseStatus,
    type: FieldMetadataType.TEXT,
    label: msg`License Status`,
    description: msg`Status of the License`,
    icon: 'IconBox',
  })
  @WorkspaceIsNullable()
  licenseStatus?: string;

  //metadata
  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`Metadata for the product`,
    icon: 'IconBox',
  })
  @WorkspaceIsNullable()
  metadata: JSON | null;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.accountingConfirmed,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Accounting Confirmed`,
    description: msg`Whether accounting has confirmed payment`,
    icon: 'IconCheck',
    defaultValue: false,
  })
  @WorkspaceIsNullable()
  accountingConfirmed?: boolean;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.orderItems,
    type: RelationType.ONE_TO_MANY,
    label: msg`Order Items`,
    description: msg`Items included in this order`,
    icon: 'IconShoppingCartCog',
    inverseSideTarget: () => MktOrderItemWorkspaceEntity,
    inverseSideFieldKey: 'mktOrder',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  orderItems: Relation<MktOrderItemWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.mktLicense,
    type: RelationType.ONE_TO_MANY,
    label: msg`Licenses`,
    description: msg`Licenses linked to the order`,
    icon: 'IconBox',
    inverseSideTarget: () => MktLicenseWorkspaceEntity,
    inverseSideFieldKey: 'mktOrder',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktLicense: Relation<MktLicenseWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.mktContracts,
    type: RelationType.MANY_TO_ONE,
    label: msg`Contracts`,
    description: msg`Contracts linked to the order`,
    icon: 'IconFileContract',
    inverseSideTarget: () => MktContractWorkspaceEntity,
    inverseSideFieldKey: 'mktOrders',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktContract: Relation<MktContractWorkspaceEntity>;
  @WorkspaceJoinColumn('mktContract')
  mktContractId: string | null;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.mktSInvoice,
    type: RelationType.ONE_TO_MANY,
    label: msg`SInvoice`,
    description: msg`SInvoice linked to the order`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoiceWorkspaceEntity,
    inverseSideFieldKey: 'mktOrder',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktSInvoice: Relation<MktSInvoiceWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.mktPayments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Payments`,
    description: msg`Payments linked to the order`,
    icon: 'IconBox',
    inverseSideTarget: () => MktPaymentWorkspaceEntity,
    inverseSideFieldKey: 'mktOrder',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktPayments: Relation<MktPaymentWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.mktOrderHistories,
    type: RelationType.ONE_TO_MANY,
    label: msg`Order Histories`,
    description: msg`Order histories linked to the order`,
    icon: 'IconHistory',
    inverseSideTarget: () => MktOrderHistoryWorkspaceEntity,
    inverseSideFieldKey: 'mktOrder',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktOrderHistories: Relation<MktOrderHistoryWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.mktPaymentHistories,
    type: RelationType.ONE_TO_MANY,
    label: msg`Payment Histories`,
    description: msg`Payment histories linked to the order`,
    icon: 'IconHistory',
    inverseSideTarget: () => MktPaymentHistoryWorkspaceEntity,
    inverseSideFieldKey: 'mktOrder',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktPaymentHistories: Relation<MktPaymentHistoryWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.accountOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Account Owner`,
    description: msg`Your team member responsible for managing the order account`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'accountOwnerForMktOrders',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('accountOwner')
  accountOwnerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activities`,
    description: msg`Timeline Activities linked to the order`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    inverseSideFieldKey: 'mktOrder',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  // ✅ Search vector field
  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(
      SEARCH_FIELDS_FOR_ORDER,
    ),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.mktCustomer,
    type: RelationType.MANY_TO_ONE,
    label: msg`Customers`,
    description: msg`Customers linked to the order`,
    icon: 'IconBox',
    inverseSideTarget: () => MktCustomerWorkspaceEntity,
    inverseSideFieldKey: 'mktOrders',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktCustomer: Relation<MktCustomerWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktCustomer')
  mktCustomerId: string | null;
}
