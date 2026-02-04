import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceIsUnique } from 'src/engine/twenty-orm/decorators/workspace-is-unique.decorator';
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
import { MktContractWorkspaceEntity } from 'src/mkt-core/contract/workspace-entity/mkt-contract.workspace-entity';
import { MktOrderHistoryWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-history.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { MktPaymentHistoryWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment-history.workspace-entity';
import { MktVirtualAccountWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-virtual-account.workspace-entity';
import { MktPromotionUsageWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion-usage.workspace-entity';
import { PromotionSnapshot } from 'src/mkt-core/mkt-promotion/types/promotion.types';
import { GenericComboSnapshot } from 'src/mkt-core/mkt-combo/types/generic-combo.types';
import { PAYMENT_STATUS_OPTIONS } from 'src/mkt-core/order/constants/payment-status.constants';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

// Define fields to be used for search
const SEARCH_FIELDS_FOR_ORDER: FieldTypeAndNameMetadata[] = [
  { name: 'orderCode', type: FieldMetadataType.TEXT },
  { name: 'note', type: FieldMetadataType.TEXT },
];

/**
 * Entity name for mktOrder
 * Used by block hooks and other configurations
 */
export const MKT_ORDER_ENTITY_NAME = 'mktOrder';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktOrder,
  namePlural: `${MKT_ORDER_ENTITY_NAME}s`,
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
    description: msg`Unique order code (format: PREFIX + YYYYMMDD + sequence)`,
    icon: 'IconBarcode',
  })
  @WorkspaceIsUnique()
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

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.salePaymentConfirmed,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Sale Payment Confirmed`,
    description: msg`Whether sale has confirmed payment (protects license from auto-lock)`,
    icon: 'IconCheck',
    defaultValue: false,
  })
  @WorkspaceIsNullable()
  salePaymentConfirmed?: boolean;

  // ============================================
  // MULTI-PAYMENT FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.paidAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Paid Amount`,
    description: msg`Total confirmed payment amount`,
    icon: 'IconCash',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  paidAmount?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.remainingAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Remaining Amount`,
    description: msg`Remaining amount to be paid (totalAmount - paidAmount)`,
    icon: 'IconCashBanknote',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  remainingAmount?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.paymentStatus,
    type: FieldMetadataType.SELECT,
    label: msg`Payment Status`,
    description: msg`Payment status of the order`,
    icon: 'IconCreditCard',
    options: PAYMENT_STATUS_OPTIONS.options,
    defaultValue: "'PENDING'",
  })
  @WorkspaceIsNullable()
  paymentStatus?: string;

  // ============================================
  // PROMOTION FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.couponCode,
    type: FieldMetadataType.TEXT,
    label: msg`Coupon Code`,
    description: msg`Applied coupon code for this order`,
    icon: 'IconTicket',
  })
  @WorkspaceIsNullable()
  couponCode?: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.promotionDiscount,
    type: FieldMetadataType.NUMBER,
    label: msg`Promotion Discount`,
    description: msg`Total discount from promotions`,
    icon: 'IconDiscount',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  promotionDiscount?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.appliedPromotions,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Applied Promotions`,
    description: msg`Immutable snapshot of applied promotions at order time`,
    icon: 'IconGift',
  })
  @WorkspaceIsNullable()
  appliedPromotions?: PromotionSnapshot[] | null;

  // ============================================
  // COMBO FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.appliedCombos,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Applied Combos`,
    description: msg`Immutable snapshots of applied combos at order time`,
    icon: 'IconPackages',
  })
  @WorkspaceIsNullable()
  appliedCombos?: GenericComboSnapshot[] | null;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.comboDiscount,
    type: FieldMetadataType.NUMBER,
    label: msg`Combo Discount`,
    description: msg`Total discount from combo pricing`,
    icon: 'IconDiscount',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  comboDiscount?: number;

  // ============================================
  // PAYMENT DEADLINE FIELDS (New Payment Flow)
  // ============================================

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.paymentDeadline,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Payment Deadline`,
    description: msg`Payment deadline for this order`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  paymentDeadline?: Date | null;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.paymentDeadlineSource,
    type: FieldMetadataType.SELECT,
    label: msg`Payment Deadline Source`,
    description: msg`Source of deadline configuration`,
    icon: 'IconSettings',
    options: [
      { value: 'GLOBAL', label: 'Global Setting', position: 0, color: 'gray' },
      { value: 'PRODUCT', label: 'Product Config', position: 1, color: 'blue' },
      {
        value: 'CUSTOMER_TYPE',
        label: 'Customer Type',
        position: 2,
        color: 'green',
      },
      {
        value: 'RESELLER_TIER',
        label: 'Reseller Tier',
        position: 3,
        color: 'purple',
      },
      {
        value: 'MANUAL',
        label: 'Manual Override',
        position: 4,
        color: 'orange',
      },
    ],
  })
  @WorkspaceIsNullable()
  paymentDeadlineSource?: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.lockedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Locked At`,
    description: msg`Timestamp when order was locked due to overdue payment`,
    icon: 'IconLock',
  })
  @WorkspaceIsNullable()
  lockedAt?: Date | null;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.lockedReason,
    type: FieldMetadataType.TEXT,
    label: msg`Locked Reason`,
    description: msg`Reason for order lock`,
    icon: 'IconAlertTriangle',
  })
  @WorkspaceIsNullable()
  lockedReason?: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.remindersSent,
    type: FieldMetadataType.NUMBER,
    label: msg`Reminders Sent`,
    description: msg`Number of payment reminders sent`,
    icon: 'IconBell',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  remindersSent?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.lastReminderAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Last Reminder At`,
    description: msg`Timestamp of last payment reminder`,
    icon: 'IconBellRinging',
  })
  @WorkspaceIsNullable()
  lastReminderAt?: Date | null;

  // ============================================
  // OPTIMISTIC LOCKING
  // ============================================

  @WorkspaceField({
    standardId: MKT_ORDER_FIELD_IDS.version,
    type: FieldMetadataType.NUMBER,
    label: msg`Version`,
    description: msg`Version number for optimistic locking`,
    icon: 'IconGitBranch',
    defaultValue: 1,
  })
  version: number;

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
    standardId: MKT_ORDER_FIELD_IDS.mktVirtualAccounts,
    type: RelationType.ONE_TO_MANY,
    label: msg`Virtual Accounts`,
    description: msg`Virtual accounts linked to the order`,
    icon: 'IconCreditCard',
    inverseSideTarget: () => MktVirtualAccountWorkspaceEntity,
    inverseSideFieldKey: 'mktOrder',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktVirtualAccounts: Relation<MktVirtualAccountWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.accountOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Account Owner`,
    description: msg`Your team member responsible for managing the order account`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'accountOwnerForMktOrders',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('accountOwner')
  accountOwnerId: string;

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

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.createdBy,
    type: RelationType.MANY_TO_ONE,
    label: msg`Created By`,
    description: msg`The workspace member who created this order`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'createdMktOrders',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  createdBy: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('createdBy')
  createdById: string | null;

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

  @WorkspaceRelation({
    standardId: MKT_ORDER_FIELD_IDS.promotionUsages,
    type: RelationType.ONE_TO_MANY,
    label: msg`Promotion Usages`,
    description: msg`Promotion usages linked to this order`,
    icon: 'IconTag',
    inverseSideTarget: () => MktPromotionUsageWorkspaceEntity,
    inverseSideFieldKey: 'order',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  promotionUsages: Relation<MktPromotionUsageWorkspaceEntity[]>;
}
