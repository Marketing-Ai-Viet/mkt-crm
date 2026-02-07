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
import {
  MktEmailWorkspaceEntity,
  MktTemplateWorkspaceEntity,
} from 'src/mkt-core/mkt-email/workspace-entities';
import { MktI18nWorkspaceEntity } from 'src/mkt-core/i18n/objects/mkt-i18n.workspace-entity';
import { MktSInvoiceAuthWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-auth.workspace-entity';
import { MktSInvoiceFileWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-file.workspace-entity';
import { MktSInvoiceItemWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-item.workspace-entity';
import { MktSInvoiceMetadataWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-metadata.workspace-entity';
import { MktSInvoicePaymentWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-payment.workspace-entity';
import { MktSInvoiceTaxBreakdownWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-tax-breakdown.workspace-entity';
import { MktSInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice.workspace-entity';
import {
  MktDataAccessPolicyWorkspaceEntity,
  MktPermissionAuditWorkspaceEntity,
  MktTemporaryPermissionWorkspaceEntity,
  MktUserPermissionTemplateWorkspaceEntity,
  MktUserPermissionOverrideWorkspaceEntity,
  MktPermissionTemplateWorkspaceEntity,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department.workspace-entity';
import { MktDepartmentSubManagerWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-sub-manager.workspace-entity';
import { MktEmploymentStatusWorkspaceEntity } from 'src/mkt-core/user-management/workspace-entities/mkt-employment-status.workspace-entity';
import { MktKpiTemplateWorkspaceEntity } from 'src/mkt-core/mkt-kpi/workspace-entity/mkt-kpi-template.workspace-entity';
import { MktKpiWorkspaceEntity } from 'src/mkt-core/mkt-kpi/workspace-entity/mkt-kpi.workspace-entity';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/workspace-entity/mkt-organization-level.workspace-entity';
import { MktEmploymentStatusHistoryWorkspaceEntity } from 'src/mkt-core/user-management/workspace-entities/mkt-employment-status-history.workspace-entity';
import { MktContractWorkspaceEntity } from 'src/mkt-core/contract/workspace-entity/mkt-contract.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentHistoryWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment-history.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { MktReportWorkspaceEntity } from 'src/mkt-core/report/objects/mkt-report.workspace-entity';
import { MktOptionWorkspaceEntity } from 'src/mkt-core/setting/objects/mkt-option.workspace-entity';
import { MktGenericComboWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo.workspace-entity';
import {
  MktDashboardWidgetWorkspaceEntity,
  MktDashboardLayoutWorkspaceEntity,
} from 'src/mkt-core/mkt-dashboard/workspace-entity';
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
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.officialStartDate,
    type: FieldMetadataType.DATE,
    label: msg`Official Start Date`,
    description: msg`The official start date after probation period`,
    icon: 'IconCalendarCheck',
  })
  @WorkspaceIsNullable()
  officialStartDate: Date | null;

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
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.supportOwnerForMktCustomers,
    type: RelationType.ONE_TO_MANY,
    label: msg`Support Owner For Customers`,
    description: msg`Support phụ trách customers`,
    icon: 'IconLifebuoy',
    inverseSideTarget: () => MktCustomerWorkspaceEntity,
    inverseSideFieldKey: 'supportOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  supportOwnerForMktCustomers: Relation<MktCustomerWorkspaceEntity[]>;

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
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.createdMktContracts,
    type: RelationType.ONE_TO_MANY,
    label: msg`Created Contracts`,
    description: msg`Contracts created by this workspace member`,
    icon: 'IconFilePlus',
    inverseSideTarget: () => MktContractWorkspaceEntity,
    inverseSideFieldKey: 'createdBy',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsSystem()
  createdMktContracts: Relation<MktContractWorkspaceEntity[]>;

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
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.createdMktOrders,
    type: RelationType.ONE_TO_MANY,
    label: msg`Created Orders`,
    description: msg`Orders created by this workspace member`,
    icon: 'IconShoppingCartPlus',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'createdBy',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsSystem()
  createdMktOrders: Relation<MktOrderWorkspaceEntity[]>;

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

  // Payment confirmation/rejection inverse relations
  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.confirmedPayments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Confirmed Payments`,
    description: msg`Payments confirmed by this member`,
    icon: 'IconUserCheck',
    inverseSideTarget: () => MktPaymentWorkspaceEntity,
    inverseSideFieldKey: 'confirmedBy',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsSystem()
  confirmedPayments: Relation<MktPaymentWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.rejectedPayments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Rejected Payments`,
    description: msg`Payments rejected by this member`,
    icon: 'IconUserX',
    inverseSideTarget: () => MktPaymentWorkspaceEntity,
    inverseSideFieldKey: 'rejectedBy',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsSystem()
  rejectedPayments: Relation<MktPaymentWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.performedPaymentHistoryActions,
    type: RelationType.ONE_TO_MANY,
    label: msg`Payment History Actions`,
    description: msg`Payment history actions performed by this member`,
    icon: 'IconActivity',
    inverseSideTarget: () => MktPaymentHistoryWorkspaceEntity,
    inverseSideFieldKey: 'performedBy',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsSystem()
  performedPaymentHistoryActions: Relation<MktPaymentHistoryWorkspaceEntity[]>;

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
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.managerForMktDepartments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Manager For Departments`,
    description: msg`Manager for departments`,
    icon: 'IconBox',
    inverseSideTarget: () => MktDepartmentWorkspaceEntity,
    inverseSideFieldKey: 'manager',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  managerForMktDepartments: Relation<MktDepartmentWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.subManagerAssignments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Sub Manager Assignments`,
    description: msg`Sub-manager assignments for this workspace member`,
    icon: 'IconUserStar',
    inverseSideTarget: () => MktDepartmentSubManagerWorkspaceEntity,
    inverseSideFieldKey: 'workspaceMember',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  subManagerAssignments: Relation<MktDepartmentSubManagerWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_STANDARD_FIELD_IDS.staffStatusHistories,
    type: RelationType.ONE_TO_MANY,
    label: msg`Staff Status Histories`,
    description: msg`Staff employment status change history`,
    icon: 'IconHistory',
    inverseSideTarget: () => MktEmploymentStatusHistoryWorkspaceEntity,
    inverseSideFieldKey: 'staff',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsSystem()
  staffStatusHistories: Relation<MktEmploymentStatusHistoryWorkspaceEntity[]>;

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
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.permissionTemplateAssignments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Permission Template Assignments`,
    description: msg`Permission templates assigned to this member`,
    icon: 'IconShieldCheck',
    inverseSideTarget: () => MktUserPermissionTemplateWorkspaceEntity,
    inverseSideFieldKey: 'workspaceMember',
  })
  @WorkspaceIsSystem()
  permissionTemplateAssignments: Relation<
    MktUserPermissionTemplateWorkspaceEntity[]
  >;

  @WorkspaceRelation({
    standardId:
      WORKSPACE_MEMBER_MKT_FIELD_IDS.permissionTemplateAssignmentsMade,
    type: RelationType.ONE_TO_MANY,
    label: msg`Permission Template Assignments Made`,
    description: msg`Permission template assignments made by this member`,
    icon: 'IconShieldPlus',
    inverseSideTarget: () => MktUserPermissionTemplateWorkspaceEntity,
    inverseSideFieldKey: 'assignedBy',
  })
  @WorkspaceIsSystem()
  permissionTemplateAssignmentsMade: Relation<
    MktUserPermissionTemplateWorkspaceEntity[]
  >;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.permissionOverrides,
    type: RelationType.ONE_TO_MANY,
    label: msg`Permission Overrides`,
    description: msg`Permission overrides for this member`,
    icon: 'IconShieldX',
    inverseSideTarget: () => MktUserPermissionOverrideWorkspaceEntity,
    inverseSideFieldKey: 'workspaceMember',
  })
  @WorkspaceIsSystem()
  permissionOverrides: Relation<MktUserPermissionOverrideWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.approvedPermissionOverrides,
    type: RelationType.ONE_TO_MANY,
    label: msg`Approved Permission Overrides`,
    description: msg`Permission overrides approved by this member`,
    icon: 'IconShieldCheck',
    inverseSideTarget: () => MktUserPermissionOverrideWorkspaceEntity,
    inverseSideFieldKey: 'approvedBy',
  })
  @WorkspaceIsSystem()
  approvedPermissionOverrides: Relation<
    MktUserPermissionOverrideWorkspaceEntity[]
  >;

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

  // === GENERIC COMBO RELATIONS ===
  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.createdMktGenericCombos,
    type: RelationType.ONE_TO_MANY,
    label: msg`Created Generic Combos`,
    description: msg`Generic combos created by this workspace member`,
    icon: 'IconPackages',
    inverseSideTarget: () => MktGenericComboWorkspaceEntity,
    inverseSideFieldKey: 'createdBy',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsSystem()
  createdMktGenericCombos: Relation<MktGenericComboWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.accountOwnerForMktGenericCombos,
    type: RelationType.ONE_TO_MANY,
    label: msg`Account Owner For Generic Combos`,
    description: msg`Account owner for generic combos`,
    icon: 'IconPackages',
    inverseSideTarget: () => MktGenericComboWorkspaceEntity,
    inverseSideFieldKey: 'accountOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  accountOwnerForMktGenericCombos: Relation<MktGenericComboWorkspaceEntity[]>;

  // === PHASE 2: CREATED PERMISSION TEMPLATES ===
  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.createdPermissionTemplates,
    type: RelationType.ONE_TO_MANY,
    label: msg`Created Permission Templates`,
    description: msg`Permission templates created by this workspace member`,
    icon: 'IconShieldPlus',
    inverseSideTarget: () => MktPermissionTemplateWorkspaceEntity,
    inverseSideFieldKey: 'createdBy',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsSystem()
  createdPermissionTemplates: Relation<MktPermissionTemplateWorkspaceEntity[]>;

  // === DASHBOARD MODULE ===
  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.dashboardWidgets,
    type: RelationType.ONE_TO_MANY,
    label: msg`Dashboard Widgets`,
    description: msg`Dashboard widgets owned by this member`,
    icon: 'IconLayoutDashboard',
    inverseSideTarget: () => MktDashboardWidgetWorkspaceEntity,
    inverseSideFieldKey: 'owner',
  })
  dashboardWidgets: Relation<MktDashboardWidgetWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.dashboardLayouts,
    type: RelationType.ONE_TO_MANY,
    label: msg`Dashboard Layouts`,
    description: msg`Dashboard layouts owned by this member`,
    icon: 'IconLayout',
    inverseSideTarget: () => MktDashboardLayoutWorkspaceEntity,
    inverseSideFieldKey: 'owner',
  })
  dashboardLayouts: Relation<MktDashboardLayoutWorkspaceEntity[]>;
}
