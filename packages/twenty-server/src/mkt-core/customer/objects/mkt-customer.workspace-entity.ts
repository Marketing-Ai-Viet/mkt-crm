import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { Relation } from 'typeorm';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';

import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { RelationOnDeleteAction } from 'src/engine/metadata-modules/relation-metadata/relation-on-delete-action.type';
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
import { getTsVectorColumnExpressionFromFields } from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { MKT_CUSTOMER_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { SEARCH_FIELDS_FOR_MKT_CUSTOMER } from 'src/mkt-core/customer/constants/linked-account.constants';
import {
  MKT_CUSTOMER_COMPANY_SIZE_SELECT_OPTIONS,
  MKT_CUSTOMER_INDUSTRY_SELECT_OPTIONS,
  MKT_CUSTOMER_LIFECYCLE_STAGE_DEFAULT,
  MKT_CUSTOMER_LIFECYCLE_STAGE_SELECT_OPTIONS,
  MKT_CUSTOMER_STATUS_DEFAULT,
  MKT_CUSTOMER_STATUS_SELECT_OPTIONS,
  MKT_CUSTOMER_TIER_DEFAULT,
  MKT_CUSTOMER_TIER_SELECT_OPTIONS,
  MKT_CUSTOMER_TYPE_DEFAULT,
  MKT_CUSTOMER_TYPE_SELECT_OPTIONS,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MktCustomerTagWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-tag.workspace-entity';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';
import { MktCustomerTierHistoryWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-tier-history.workspace-entity';
import { MktCustomerNoteWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-note.workspace-entity';
import { MktCouponWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-coupon.workspace-entity';
import { MktPromotionUsageWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion-usage.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktContractWorkspaceEntity } from 'src/mkt-core/contract/workspace-entity/mkt-contract.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

// Re-export for backward compatibility
export { SEARCH_FIELDS_FOR_MKT_CUSTOMER } from 'src/mkt-core/customer/constants/linked-account.constants';
export {
  ACCOUNT_PROVIDER,
  LINKED_ACCOUNT_STATUS,
} from 'src/mkt-core/customer/constants/linked-account.constants';
export type {
  AccountProvider,
  LinkedAccount,
  LinkedAccountStatus,
} from 'src/mkt-core/customer/types/linked-account.types';

/**
 * Entity name for mktCustomer - used in GraphQL operations and hooks
 * Format: 'mkt{EntityName}' (camelCase)
 */
export const MKT_CUSTOMER_ENTITY_NAME = 'mktCustomer';

/**
 * MktCustomerWorkspaceEntity - OPTIMIZED
 *
 * Changes from previous version:
 * - Removed 22 unused fields (mktWorkspaceId, syncStatus, userId, etc.)
 * - Changed TEXT to SELECT for: status, tier, lifecycleStage, type
 * - Added default values
 * - Added linkedAccounts JSONB for multi-provider accounts (MKT, Google, Zalo...)
 * - Primary account tracked via isPrimary field in linkedAccounts array
 * - Removed unused relations (promotionUsages, assignedCoupons)
 */
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCustomer,
  namePlural: `${MKT_CUSTOMER_ENTITY_NAME}s`,
  labelSingular: msg`Customer`,
  labelPlural: msg`Customers`,
  description: msg`Customer entity for CRM`,
  icon: 'IconUser',
  labelIdentifierStandardId: MKT_CUSTOMER_FIELD_IDS.name,
})
@WorkspaceIsSearchable()
export class MktCustomerWorkspaceEntity extends BaseWorkspaceEntity {
  // ============ BASIC INFO (6 fields) ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.mktCustomerCode,
    type: FieldMetadataType.TEXT,
    label: msg`Customer Code`,
    description: msg`Format: CUS-YYYY-NNNNNN`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  @WorkspaceIsUnique()
  mktCustomerCode: string;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Customer or company name`,
    icon: 'IconUser',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.email,
    type: FieldMetadataType.TEXT,
    label: msg`Email`,
    description: msg`Primary email (unique per workspace)`,
    icon: 'IconMail',
  })
  @WorkspaceIsUnique()
  @WorkspaceIsNullable()
  email: string;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.phone,
    type: FieldMetadataType.TEXT,
    label: msg`Phone`,
    description: msg`Primary phone number`,
    icon: 'IconPhone',
  })
  @WorkspaceIsNullable()
  phone: string;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.personalIdNumber,
    type: FieldMetadataType.TEXT,
    label: msg`Citizen ID`,
    description: msg`Căn cước công dân (CCCD) hoặc CMND - 9 hoặc 12 số`,
    icon: 'IconId',
  })
  @WorkspaceIsNullable()
  @WorkspaceIsUnique()
  citizenId: string | null;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.type,
    type: FieldMetadataType.SELECT,
    label: msg`Type`,
    description: msg`Customer type`,
    icon: 'IconUser',
    options: MKT_CUSTOMER_TYPE_SELECT_OPTIONS,
    defaultValue: MKT_CUSTOMER_TYPE_DEFAULT,
  })
  @WorkspaceIsNullable()
  type: string;

  // ============ BUSINESS INFO (7 fields) ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.companyName,
    type: FieldMetadataType.TEXT,
    label: msg`Company Name`,
    description: msg`Company or organization name`,
    icon: 'IconBuilding',
  })
  @WorkspaceIsNullable()
  companyName: string;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.taxCode,
    type: FieldMetadataType.TEXT,
    label: msg`Tax Code`,
    description: msg`Tax code (10 or 13 digits)`,
    icon: 'IconReceipt',
  })
  @WorkspaceIsNullable()
  taxCode: string;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.address,
    type: FieldMetadataType.TEXT,
    label: msg`Address`,
    description: msg`Primary address`,
    icon: 'IconMapPin',
  })
  @WorkspaceIsNullable()
  address: string;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.companySize,
    type: FieldMetadataType.SELECT,
    label: msg`Company Size`,
    description: msg`Quy mô công ty`,
    icon: 'IconUsers',
    options: MKT_CUSTOMER_COMPANY_SIZE_SELECT_OPTIONS,
  })
  @WorkspaceIsNullable()
  companySize: string | null;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.industry,
    type: FieldMetadataType.SELECT,
    label: msg`Industry`,
    description: msg`Ngành nghề kinh doanh`,
    icon: 'IconCategory',
    options: MKT_CUSTOMER_INDUSTRY_SELECT_OPTIONS,
  })
  @WorkspaceIsNullable()
  industry: string | null;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.contactPosition,
    type: FieldMetadataType.TEXT,
    label: msg`Contact Position`,
    description: msg`Chức vụ người liên hệ`,
    icon: 'IconBriefcase',
  })
  @WorkspaceIsNullable()
  contactPosition: string | null;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.contactDepartment,
    type: FieldMetadataType.TEXT,
    label: msg`Contact Department`,
    description: msg`Phòng ban người liên hệ`,
    icon: 'IconBuilding',
  })
  @WorkspaceIsNullable()
  contactDepartment: string | null;

  // ============ SYSTEM STATUS (3 fields) ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Customer status`,
    icon: 'IconStatusChange',
    options: MKT_CUSTOMER_STATUS_SELECT_OPTIONS,
    defaultValue: MKT_CUSTOMER_STATUS_DEFAULT,
  })
  @WorkspaceIsNullable()
  status: string;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.tier,
    type: FieldMetadataType.SELECT,
    label: msg`Tier`,
    description: msg`Customer tier based on order value`,
    icon: 'IconMedal',
    options: MKT_CUSTOMER_TIER_SELECT_OPTIONS,
    defaultValue: MKT_CUSTOMER_TIER_DEFAULT,
  })
  @WorkspaceIsNullable()
  tier: string;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.lastTierUpgradeAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Last Tier Upgrade`,
    description: msg`Date when customer was last upgraded to a higher tier`,
    icon: 'IconArrowUp',
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  lastTierUpgradeAt: Date | null;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.lifecycleStage,
    type: FieldMetadataType.SELECT,
    label: msg`Lifecycle Stage`,
    description: msg`Customer lifecycle stage`,
    icon: 'IconRefresh',
    options: MKT_CUSTOMER_LIFECYCLE_STAGE_SELECT_OPTIONS,
    defaultValue: MKT_CUSTOMER_LIFECYCLE_STAGE_DEFAULT,
  })
  @WorkspaceIsNullable()
  lifecycleStage: string;

  // ============ ANALYTICS & TRACKING (6 fields) ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.totalOrderValue,
    type: FieldMetadataType.NUMBER,
    label: msg`Total Order Value`,
    description: msg`Tổng giá trị đơn hàng (VND)`,
    icon: 'IconCash',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  totalOrderValue: number;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.totalOrderCount,
    type: FieldMetadataType.NUMBER,
    label: msg`Total Order Count`,
    description: msg`Số lượng đơn hàng hoàn thành`,
    icon: 'IconShoppingCart',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  totalOrderCount: number;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.licensesCount,
    type: FieldMetadataType.NUMBER,
    label: msg`Licenses Count`,
    description: msg`Số lượng license`,
    icon: 'IconLicense',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  licensesCount: number;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.firstPurchase,
    type: FieldMetadataType.DATE_TIME,
    label: msg`First Purchase`,
    description: msg`Ngày mua hàng đầu tiên`,
    icon: 'IconCalendarEvent',
  })
  @WorkspaceIsNullable()
  firstPurchase: Date;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.lastPurchase,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Last Purchase`,
    description: msg`Ngày mua hàng gần nhất`,
    icon: 'IconCalendar',
  })
  @WorkspaceIsNullable()
  lastPurchase: Date;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.customerLtv,
    type: FieldMetadataType.NUMBER,
    label: msg`Customer LTV`,
    description: msg`Customer Lifetime Value (VND)`,
    icon: 'IconTrendingUp',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  customerLtv: number;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.churnRiskScore,
    type: FieldMetadataType.NUMBER,
    label: msg`Churn Risk Score`,
    description: msg`Điểm rủi ro rời bỏ (0-100)`,
    icon: 'IconAlertTriangle',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  churnRiskScore: number;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.engagementScore,
    type: FieldMetadataType.NUMBER,
    label: msg`Engagement Score`,
    description: msg`Điểm tương tác (0-100)`,
    icon: 'IconHeartHandshake',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  engagementScore: number;

  // ============ ASSIGNMENT (3 fields) ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.registrationDate,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Registration Date`,
    description: msg`Ngày đăng ký`,
    icon: 'IconCalendar',
  })
  @WorkspaceIsNullable()
  registrationDate: Date;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.assignedDate,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Assigned Date`,
    description: msg`Ngày assign cho sales`,
    icon: 'IconCalendar',
  })
  @WorkspaceIsNullable()
  assignedDate: Date;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.assignmentReason,
    type: FieldMetadataType.TEXT,
    label: msg`Assignment Reason`,
    description: msg`Lý do assign`,
    icon: 'IconNote',
  })
  @WorkspaceIsNullable()
  assignedReason: string;

  // ============ NOTES (1 field) ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.notes,
    type: FieldMetadataType.RICH_TEXT,
    label: msg`Notes`,
    description: msg`Ghi chú về khách hàng`,
    icon: 'IconNote',
  })
  @WorkspaceIsNullable()
  notes: string;

  // ============ COMMON FIELDS (2 fields) ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Vị trí trong danh sách`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`Người tạo`,
  })
  createdBy: ActorMetadata;

  // ============ RELATIONS (6 relations) ============

  @WorkspaceRelation({
    standardId: MKT_CUSTOMER_FIELD_IDS.accountOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Account Owner`,
    description: msg`Sales phụ trách khách hàng`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'accountOwnerForMktCustomers',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('accountOwner')
  accountOwnerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_CUSTOMER_FIELD_IDS.supportOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Support Owner`,
    description: msg`Support phụ trách khách hàng`,
    icon: 'IconLifebuoy',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'supportOwnerForMktCustomers',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  supportOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('supportOwner')
  supportOwnerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_CUSTOMER_FIELD_IDS.mktOrders,
    type: RelationType.ONE_TO_MANY,
    label: msg`Orders`,
    description: msg`Đơn hàng của khách hàng`,
    icon: 'IconShoppingCart',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'mktCustomer',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktOrders: Relation<MktOrderWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_CUSTOMER_FIELD_IDS.mktCustomerTags,
    type: RelationType.ONE_TO_MANY,
    label: msg`Customer Tags`,
    description: msg`Tags của khách hàng`,
    icon: 'IconTag',
    inverseSideTarget: () => MktCustomerTagWorkspaceEntity,
    inverseSideFieldKey: 'mktCustomer',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktCustomerTags: Relation<MktCustomerTagWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_CUSTOMER_FIELD_IDS.contracts,
    type: RelationType.ONE_TO_MANY,
    label: msg`Contracts`,
    description: msg`Hợp đồng của khách hàng`,
    icon: 'IconFileContract',
    inverseSideTarget: () => MktContractWorkspaceEntity,
    inverseSideFieldKey: 'customer',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  contracts: Relation<MktContractWorkspaceEntity[]>;

  /**
   * Linked Accounts - Stored as JSONB array
   * Supports multiple providers: MKT_SERVER, GOOGLE, MICROSOFT, FACEBOOK, ZALO, etc.
   *
   * @see LinkedAccount type for structure
   */
  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.linkedAccounts,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Linked Accounts`,
    description: msg`External accounts from various providers (MKT, Google, Zalo, etc.)`,
    icon: 'IconLink',
  })
  @WorkspaceIsNullable()
  linkedAccounts: LinkedAccount[] | null;

  // ============ PROMOTION RELATIONS (System) ============

  @WorkspaceRelation({
    standardId: MKT_CUSTOMER_FIELD_IDS.promotionUsages,
    type: RelationType.ONE_TO_MANY,
    label: msg`Promotion Usages`,
    description: msg`Lịch sử sử dụng khuyến mãi`,
    icon: 'IconDiscount',
    inverseSideTarget: () => MktPromotionUsageWorkspaceEntity,
    inverseSideFieldKey: 'customer',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  promotionUsages: Relation<MktPromotionUsageWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_CUSTOMER_FIELD_IDS.assignedCoupons,
    type: RelationType.ONE_TO_MANY,
    label: msg`Assigned Coupons`,
    description: msg`Coupon được gán cho khách hàng`,
    icon: 'IconTicket',
    inverseSideTarget: () => MktCouponWorkspaceEntity,
    inverseSideFieldKey: 'assignedCustomer',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  assignedCoupons: Relation<MktCouponWorkspaceEntity[]>;

  // ============ TIER HISTORY (System) ============

  @WorkspaceRelation({
    standardId: MKT_CUSTOMER_FIELD_IDS.tierHistories,
    type: RelationType.ONE_TO_MANY,
    label: msg`Tier Histories`,
    description: msg`Customer tier change history`,
    icon: 'IconHistory',
    inverseSideTarget: () => MktCustomerTierHistoryWorkspaceEntity,
    inverseSideFieldKey: 'customer',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  tierHistories: Relation<MktCustomerTierHistoryWorkspaceEntity[]>;

  // ============ CUSTOMER NOTES ============

  @WorkspaceRelation({
    standardId: MKT_CUSTOMER_FIELD_IDS.customerNotes,
    type: RelationType.ONE_TO_MANY,
    label: msg`Customer Notes`,
    description: msg`Ghi chú về khách hàng`,
    icon: 'IconNotes',
    inverseSideTarget: () => MktCustomerNoteWorkspaceEntity,
    inverseSideFieldKey: 'customer',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  customerNotes: Relation<MktCustomerNoteWorkspaceEntity[]>;

  // ============ SYSTEM FIELDS (1 field) ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(
      SEARCH_FIELDS_FOR_MKT_CUSTOMER,
    ),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
