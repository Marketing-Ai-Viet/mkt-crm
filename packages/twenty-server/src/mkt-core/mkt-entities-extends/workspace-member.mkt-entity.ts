import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { WORKSPACE_MEMBER_STANDARD_FIELD_IDS } from 'src/engine/workspace-manager/workspace-sync-metadata/constants/standard-field-ids';
import { WORKSPACE_MEMBER_MKT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MktCustomerTagWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-tag.workspace-entity';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
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
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-data-access-policy/mkt-data-access-policy.workspace-entity';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/mkt-department.workspace-entity';
import { MktEmploymentStatusWorkspaceEntity } from 'src/mkt-core/mkt-employment-status/mkt-employment-status.workspace-entity';
import { MktKpiTemplateWorkspaceEntity } from 'src/mkt-core/mkt-kpi-template/mkt-kpi-template.workspace-entity';
import { MktKpiWorkspaceEntity } from 'src/mkt-core/mkt-kpi/mkt-kpi.workspace-entity';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/mkt-organization-level.workspace-entity';
import { MktPermissionAuditWorkspaceEntity } from 'src/mkt-core/mkt-permission-audit/mkt-permission-audit.workspace-entity';
import { MktStaffStatusHistoryWorkspaceEntity } from 'src/mkt-core/mkt-staff-status-history/mkt-staff-status-history.workspace-entity';
import { MktTemporaryPermissionWorkspaceEntity } from 'src/mkt-core/mkt-temporary-permission/mkt-temporary-permission.workspace-entity';
import { MktContractWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-contract.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-template.workspace-entity';
import { MktPaymentHistoryWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment-history.workspace-entity';
import { MktAttributeWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-attribute.workspace-entity';
import { MktCategoryWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-category.workspace-entity';
import { MktComboVariantWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-combo-variant.workspace-entity';
import { MktComboWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-combo.workspace-entity';
import { MktProductWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-product.workspace-entity';
import { MktValueWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-value.workspace-entity';
import { MktVariantValueWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant-value.workspace-entity';
import { MktVariantWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant.workspace-entity';
import { MktReportWorkspaceEntity } from 'src/mkt-core/report/objects/mkt-report.workspace-entity';
import { MktOptionWorkspaceEntity } from 'src/mkt-core/setting/objects/mkt-option.workspace-entity';
import { WorkspaceIsUnique } from 'src/engine/twenty-orm/decorators/workspace-is-unique.decorator';

export class WorkspaceMemberMktEntity extends BaseWorkspaceEntity {
  // core fields
  @WorkspaceField({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.memberType,
    type: FieldMetadataType.TEXT,
    label: msg`Member Type`,
    description: msg`The type of the workspace member in the marketing module`,
    icon: 'IconUserCheck',
  })
  @WorkspaceIsNullable()
  memberType: string;

  @WorkspaceField({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.grade,
    type: FieldMetadataType.TEXT,
    label: msg`Grade`,
    description: msg`The grade of the workspace member`,
    icon: 'IconCertificate',
  })
  @WorkspaceIsNullable()
  grade: string | null;

  @WorkspaceField({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.address,
    type: FieldMetadataType.TEXT,
    label: msg`Address`,
    description: msg`The address of the workspace member`,
    icon: 'IconHome',
  })
  @WorkspaceIsNullable()
  address: string | null;

  @WorkspaceField({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.memberCode,
    type: FieldMetadataType.TEXT,
    label: msg`Member Code`,
    description: msg`The code assigned to the workspace member`,
    icon: 'IconIdBadge',
  })
  @WorkspaceIsNullable()
  @WorkspaceIsUnique()
  memberCode: string | null;

  @WorkspaceField({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.supportForMemberId,
    type: FieldMetadataType.TEXT,
    label: msg`Support For Member ID`,
    description: msg`The member ID that this workspace member provides support for`,
    icon: 'IconLifebuoy',
  })
  @WorkspaceIsNullable()
  supportForMemberId: string | null;

  @WorkspaceField({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.status,
    type: FieldMetadataType.TEXT,
    label: msg`Status`,
    description: msg`The current status of the workspace member`,
    icon: 'IconInfoCircle',
  })
  @WorkspaceIsNullable()
  status: string | null;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_STANDARD_FIELD_IDS.department,
    type: RelationType.MANY_TO_ONE,
    label: msg`Department`,
    description: msg`Person's department`,
    icon: 'IconBuilding',
    inverseSideTarget: () => MktDepartmentWorkspaceEntity,
    inverseSideFieldKey: 'people',
  })
  @WorkspaceIsNullable()
  department: Relation<MktDepartmentWorkspaceEntity> | null;

  @WorkspaceJoinColumn('department')
  departmentId: string | null;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.team,
    type: RelationType.MANY_TO_ONE,
    label: msg`Team`,
    description: msg`Person's team`,
    icon: 'IconUsers',
    inverseSideTarget: () => MktDepartmentWorkspaceEntity,
    inverseSideFieldKey: 'teamMembers',
  })
  @WorkspaceIsNullable()
  team: Relation<MktDepartmentWorkspaceEntity> | null;
  @WorkspaceJoinColumn('team')
  teamId: string | null;

  // other relations

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktOptions,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Options`,
    description: msg`Account owner for options`,
    icon: 'IconTag',
    inverseSideTarget: () => MktOptionWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktOptions: Relation<MktOptionWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForI18ns,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For I18ns`,
    description: msg`Account owner for i18ns`,
    icon: 'IconUser',
    inverseSideTarget: () => MktI18nWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktI18ns: Relation<MktI18nWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktCustomers,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Customers`,
    description: msg`Account owner for customers`,
    icon: 'IconUser',
    inverseSideTarget: () => MktCustomerWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktCustomers: Relation<MktCustomerWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktTags,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Tags`,
    description: msg`Account owner for tags`,
    icon: 'IconUser',
    inverseSideTarget: () => MktTagWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktTags: Relation<MktTagWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktCustomerTags,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Customer Tags`,
    description: msg`Account owner for customer tags`,
    icon: 'IconUser',
    inverseSideTarget: () => MktCustomerTagWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktCustomerTags: Relation<MktCustomerTagWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktProducts,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Products`,
    description: msg`Account owner for products`,
    icon: 'IconBox',
    inverseSideTarget: () => MktProductWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktProducts: Relation<MktProductWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktCategories,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Categories`,
    description: msg`Account owner for categories`,
    icon: 'IconBox',
    inverseSideTarget: () => MktCategoryWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktCategories: Relation<MktCategoryWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktAttributes,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Attributes`,
    description: msg`Account owner for attributes`,
    icon: 'IconBox',
    inverseSideTarget: () => MktAttributeWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktAttributes: Relation<MktAttributeWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktVariants,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Variants`,
    description: msg`Account owner for variants`,
    icon: 'IconBoxMultiple',
    inverseSideTarget: () => MktVariantWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktVariants: Relation<MktVariantWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktCombos,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Combos`,
    description: msg`Account owner for combos`,
    icon: 'IconBox',
    inverseSideTarget: () => MktComboWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktCombos: Relation<MktComboWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktComboVariants,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Combo Variants`,
    description: msg`Account owner for combo variants`,
    icon: 'IconBox',
    inverseSideTarget: () => MktComboVariantWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktComboVariants: Relation<MktComboVariantWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktValues,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Values`,
    description: msg`Account owner for values`,
    icon: 'IconListDetails',
    inverseSideTarget: () => MktValueWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktValues: Relation<MktValueWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktVariantValues,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Variant Values`,
    description: msg`Account owner for variant values`,
    icon: 'IconListDetails',
    inverseSideTarget: () => MktVariantValueWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktVariantValues: Relation<MktVariantValueWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktLicenses,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Licenses`,
    description: msg`Account owner for licenses`,
    icon: 'IconBox',
    inverseSideTarget: () => MktLicenseWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktLicenses: Relation<MktLicenseWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId:
      WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktLicenseHistories,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For License Histories`,
    description: msg`Account owner for license histories`,
    icon: 'IconBox',
    inverseSideTarget: () => MktLicenseHistoryWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktLicenseHistories: Relation<
    MktLicenseHistoryWorkspaceEntity[]
  >;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktContracts,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Contracts`,
    description: msg`Account owner for contracts`,
    icon: 'IconBox',
    inverseSideTarget: () => MktContractWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktContracts: Relation<MktContractWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktOrders,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Orders`,
    description: msg`Account owner for orders`,
    icon: 'IconShoppingCart',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktOrders: Relation<MktOrderWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktOrderItems,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Order Items`,
    description: msg`Account owner for order items`,
    icon: 'IconShoppingCartCog',
    inverseSideTarget: () => MktOrderItemWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktOrderItems: Relation<MktOrderItemWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId:
      WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktPaymentHistories,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner for Payment Histories`,
    description: msg`The account owner for the payment histories created by this member`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => MktPaymentHistoryWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
  })
  @WorkspaceIsSystem()
  accountOwnerForMktPaymentHistories: Relation<
    MktPaymentHistoryWorkspaceEntity[]
  >;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktSInvoiceAuths,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For SInvoice Auths`,
    description: msg`Account owner for SInvoice Auths`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoiceAuthWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktSInvoiceAuths: Relation<MktSInvoiceAuthWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktSInvoices,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For SInvoices`,
    description: msg`Account owner for SInvoices`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoiceWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktSInvoices: Relation<MktSInvoiceWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId:
      WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktSInvoicePayments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For SInvoice Payments`,
    description: msg`Account owner for SInvoice Payments`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoicePaymentWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktSInvoicePayments: Relation<
    MktSInvoicePaymentWorkspaceEntity[]
  >;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktSInvoiceItems,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For SInvoice Items`,
    description: msg`Account owner for SInvoice Items`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoiceItemWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktSInvoiceItems: Relation<MktSInvoiceItemWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId:
      WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktSInvoiceTaxBreakdowns,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For SInvoice Tax Breakdowns`,
    description: msg`Account owner for SInvoice Tax Breakdowns`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoiceTaxBreakdownWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktSInvoiceTaxBreakdowns: Relation<
    MktSInvoiceTaxBreakdownWorkspaceEntity[]
  >;

  @WorkspaceRelation({
    standardId:
      WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktSInvoiceMetadata,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For SInvoice Metadata`,
    description: msg`Account owner for SInvoice Metadata`,
    icon: 'IconBox',
    inverseSideTarget: () => MktSInvoiceMetadataWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktSInvoiceMetadata: Relation<
    MktSInvoiceMetadataWorkspaceEntity[]
  >;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktSInvoiceFiles,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For SInvoice Files`,
    description: msg`Account owner for SInvoice Files`,
    icon: 'IconFile',
    inverseSideTarget: () => MktSInvoiceFileWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktSInvoiceFiles: Relation<MktSInvoiceFileWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktReports,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Reports`,
    description: msg`Account owner for reports`,
    icon: 'IconFile',
    inverseSideTarget: () => MktReportWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktReports: Relation<MktReportWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktTemplates,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Templates`,
    description: msg`Account owner for templates`,
    icon: 'IconBox',
    inverseSideTarget: () => MktTemplateWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktTemplates: Relation<MktTemplateWorkspaceEntity[]>;

  // @WorkspaceRelation({
  //   standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktKpiTemplates,
  //   type: RelationType.ONE_TO_MANY,
  //   label: msg`Account Owner For KPI Templates`,
  //   description: msg`Account owner for KPI templates`,
  //   icon: 'IconTemplate',
  //   inverseSideTarget: () => MktKpiTemplateWorkspaceEntity,
  //   inverseSideFieldKey: 'accountOwner',
  //   onDelete: RelationOnDeleteAction.SET_NULL,
  // })
  // accountOwnerForMktKpiTemplates: Relation<MktKpiTemplateWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.leaderForMktDepartments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Leader For Departments`,
    description: msg`Leader for departments`,
    icon: 'IconBox',
    inverseSideTarget: () => MktDepartmentWorkspaceEntity,
    inverseSideFieldKey: 'leader',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  leaderForMktDepartments: Relation<MktDepartmentWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.subLeaderForMktDepartments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Sub Leader For Departments`,
    description: msg`Sub leader for departments`,
    icon: 'IconBox',
    inverseSideTarget: () => MktDepartmentWorkspaceEntity,
    inverseSideFieldKey: 'subLeader',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  subLeaderForMktDepartments: Relation<MktDepartmentWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_STANDARD_FIELD_IDS.staffStatusHistories,
    type: RelationType.ONE_TO_MANY,
    label: msg`Staff Status Histories`,
    description: msg`Staff employment status change history`,
    icon: 'IconHistory',
    inverseSideTarget: () => MktStaffStatusHistoryWorkspaceEntity,
    inverseSideFieldKey: 'staff',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsSystem()
  staffStatusHistories: Relation<MktStaffStatusHistoryWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_STANDARD_FIELD_IDS.organizationLevel,
    type: RelationType.MANY_TO_ONE,
    label: msg`Organization Level`,
    description: msg`Person's organization level`,
    icon: 'IconHierarchy',
    inverseSideTarget: () => MktOrganizationLevelWorkspaceEntity,
    inverseSideFieldKey: 'people',
  })
  @WorkspaceIsNullable()
  organizationLevel: Relation<MktOrganizationLevelWorkspaceEntity> | null;

  @WorkspaceJoinColumn('organizationLevel')
  organizationLevelId: string | null;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_STANDARD_FIELD_IDS.employmentStatus,
    type: RelationType.MANY_TO_ONE,
    label: msg`Employment Status`,
    description: msg`Person's employment status`,
    icon: 'IconUserCheck',
    inverseSideTarget: () => MktEmploymentStatusWorkspaceEntity,
    inverseSideFieldKey: 'people',
  })
  @WorkspaceIsNullable()
  employmentStatus: Relation<MktEmploymentStatusWorkspaceEntity> | null;

  @WorkspaceJoinColumn('employmentStatus')
  employmentStatusId: string | null;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_STANDARD_FIELD_IDS.createdKpis,
    type: RelationType.ONE_TO_MANY,
    label: msg`Created KPIs`,
    description: msg`KPIs created by this person`,
    icon: 'IconTarget',
    inverseSideTarget: () => MktKpiWorkspaceEntity,
    inverseSideFieldKey: 'assignedTo',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsSystem()
  createdKpis: Relation<MktKpiWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_STANDARD_FIELD_IDS.createdKpiTemplates,
    type: RelationType.ONE_TO_MANY,
    label: msg`Created KPI Templates`,
    description: msg`KPI templates created by this person`,
    icon: 'IconTemplate',
    inverseSideTarget: () => MktKpiTemplateWorkspaceEntity,
    inverseSideFieldKey: 'assignedTo',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsSystem()
  createdKpiTemplates: Relation<MktKpiTemplateWorkspaceEntity[]>;

  // === TEMPORARY PERMISSIONS RELATIONS ===
  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.grantedTemporaryPermissions,
    type: RelationType.ONE_TO_MANY,
    label: msg`Granted Temporary Permissions`,
    description: msg`Temporary permissions granted by this user`,
    icon: 'IconUserCheck',
    inverseSideTarget: () => MktTemporaryPermissionWorkspaceEntity,
    inverseSideFieldKey: 'granterWorkspaceMember',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsSystem()
  grantedTemporaryPermissions: Relation<
    MktTemporaryPermissionWorkspaceEntity[]
  >;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.receivedTemporaryPermissions,
    type: RelationType.ONE_TO_MANY,
    label: msg`Received Temporary Permissions`,
    description: msg`Temporary permissions received by this user`,
    icon: 'IconUser',
    inverseSideTarget: () => MktTemporaryPermissionWorkspaceEntity,
    inverseSideFieldKey: 'granteeWorkspaceMember',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsSystem()
  receivedTemporaryPermissions: Relation<
    MktTemporaryPermissionWorkspaceEntity[]
  >;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.revokedTemporaryPermissions,
    type: RelationType.ONE_TO_MANY,
    label: msg`Revoked Temporary Permissions`,
    description: msg`Temporary permissions revoked by this user`,
    icon: 'IconUserX',
    inverseSideTarget: () => MktTemporaryPermissionWorkspaceEntity,
    inverseSideFieldKey: 'revokedBy',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsSystem()
  revokedTemporaryPermissions: Relation<
    MktTemporaryPermissionWorkspaceEntity[]
  >;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.dataAccessPolicies,
    type: RelationType.ONE_TO_MANY,
    label: msg`Data Access Policies`,
    description: msg`Data access policies specifically assigned to this member`,
    icon: 'IconShield',
    inverseSideTarget: () => MktDataAccessPolicyWorkspaceEntity,
    inverseSideFieldKey: 'specificMember',
  })
  @WorkspaceIsSystem()
  dataAccessPolicies: Relation<MktDataAccessPolicyWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.permissionAudits,
    type: RelationType.ONE_TO_MANY,
    label: msg`Permission Audits`,
    description: msg`Permission audit logs for this workspace member`,
    icon: 'IconShieldSearch',
    inverseSideTarget: () => MktPermissionAuditWorkspaceEntity,
    inverseSideFieldKey: 'workspaceMember',
  })
  @WorkspaceIsSystem()
  permissionAudits: Relation<MktPermissionAuditWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktEmails,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Emails`,
    description: msg`Account owner for emails`,
    icon: 'IconMail',
    inverseSideTarget: () => MktEmailWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsSystem()
  accountOwnerForMktEmails: Relation<MktEmailWorkspaceEntity[]>;
}
