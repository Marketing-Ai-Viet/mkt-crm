import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceDuplicateCriteria } from 'src/engine/twenty-orm/decorators/workspace-duplicate-criteria.decorator';
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
import { MKT_LICENSE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/mkt-department.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentHistoryWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment-history.workspace-entity';
import { MktVariantWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant.workspace-entity';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

const TABLE_LICENSE_NAME = 'mktLicense';
const NAME_FIELD_NAME = 'name';
const LICENSE_KEY_FIELD_NAME = 'licenseKey';

export const SEARCH_FIELDS_FOR_MKT_LICENSE: FieldTypeAndNameMetadata[] = [
  { name: NAME_FIELD_NAME, type: FieldMetadataType.TEXT },
  { name: LICENSE_KEY_FIELD_NAME, type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktLicense,
  namePlural: `${TABLE_LICENSE_NAME}s`,
  labelSingular: msg`License`,
  labelPlural: msg`Licenses`,
  description: msg`License entity for catalog`,
  icon: 'IconBox',
  labelIdentifierStandardId: MKT_LICENSE_FIELD_IDS.name,
})
@WorkspaceDuplicateCriteria([['licenseKey']])
@WorkspaceIsSearchable()
export class MktLicenseWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`License Name`,
    description: msg`License name`,
    icon: 'IconFileText',
  })
  name: string;

  //metadata
  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`License metadata`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  metadata?: JSON | null;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.status,
    type: FieldMetadataType.TEXT,
    label: msg`License Status`,
    description: msg`License status (active, inactive, expired, revoked)`,
    icon: 'IconTags',
  })
  @WorkspaceIsNullable()
  status?: string | null;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.licenseKey,
    type: FieldMetadataType.TEXT,
    label: msg`License Key`,
    description: msg`License key`,
    icon: 'IconBarcode',
  })
  @WorkspaceIsNullable()
  licenseKey?: string;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.activatedAt,
    type: FieldMetadataType.DATE,
    label: msg`Activated At`,
    description: msg`License activated at`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  activatedAt?: Date;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.lastLoginAt,
    type: FieldMetadataType.DATE,
    label: msg`Last Login At`,
    description: msg`License last login at`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  lastLoginAt?: Date;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.deviceInfo,
    type: FieldMetadataType.TEXT,
    label: msg`Device Info`,
    description: msg`License device info`,
    icon: 'IconDeviceDesktop',
  })
  @WorkspaceIsNullable()
  deviceInfo?: string;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.notes,
    type: FieldMetadataType.TEXT,
    label: msg`Notes`,
    description: msg`License notes`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  notes?: string;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.expiresAt,
    type: FieldMetadataType.DATE,
    label: msg`Expires At`,
    description: msg`License expires at`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  expiresAt?: Date;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.licenseUuid,
    type: FieldMetadataType.TEXT,
    label: msg`License UUID`,
    description: msg`License UUID`,
    icon: 'IconUuid',
  })
  @WorkspaceIsNullable()
  licenseUuid?: string;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.history,
    type: FieldMetadataType.RAW_JSON,
    label: msg`History`,
    description: msg`License history log`,
    icon: 'IconHistory',
  })
  @WorkspaceIsNullable()
  history?: JSON | null;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_FIELD_IDS.mktVariant,
    type: RelationType.MANY_TO_ONE,
    label: msg`Variant`,
    description: msg`License variant`,
    icon: 'IconBox',
    inverseSideTarget: () => MktVariantWorkspaceEntity,
    inverseSideFieldKey: 'mktLicenses',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktVariant: Relation<MktVariantWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktVariant')
  mktVariantId: string | null;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_FIELD_IDS.mktCustomer,
    type: RelationType.MANY_TO_ONE,
    label: msg`Customer`,
    description: msg`License customer`,
    icon: 'IconUser',
    inverseSideTarget: () => MktCustomerWorkspaceEntity,
    inverseSideFieldKey: 'mktLicenses',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktCustomer: Relation<MktCustomerWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktCustomer')
  mktCustomerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_FIELD_IDS.mktOrder,
    type: RelationType.MANY_TO_ONE,
    label: msg`Order`,
    description: msg`License order`,
    icon: 'IconShoppingCart',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'mktLicense',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktOrder: Relation<MktOrderWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktOrder')
  mktOrderId: string | null;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_FIELD_IDS.mktPaymentHistories,
    type: RelationType.ONE_TO_MANY,
    label: msg`Payment Histories`,
    description: msg`Payment history records linked to the license`,
    icon: 'IconHistory',
    inverseSideTarget: () => MktPaymentHistoryWorkspaceEntity,
    inverseSideFieldKey: 'mktLicense',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktPaymentHistories: Relation<MktPaymentHistoryWorkspaceEntity[]>;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_FIELD_IDS.accountOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Account Owner`,
    description: msg`Your team member responsible for managing the license`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'accountOwnerForMktLicenses',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('accountOwner')
  accountOwnerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_FIELD_IDS.departmentOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Department Owner`,
    description: msg`The department responsible for managing the license`,
    icon: 'IconUsersGroup',
    inverseSideTarget: () => MktDepartmentWorkspaceEntity,
    inverseSideFieldKey: 'departmentOwnerForMktLicenses',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  departmentOwner: Relation<MktDepartmentWorkspaceEntity> | null;

  @WorkspaceJoinColumn('departmentOwner')
  departmentOwnerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_FIELD_IDS.teamOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Team Owner`,
    description: msg`The team responsible for managing the license`,
    icon: 'IconUsers',
    inverseSideTarget: () => MktDepartmentWorkspaceEntity,
    inverseSideFieldKey: 'teamOwnerForMktLicenses',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  teamOwner: Relation<MktDepartmentWorkspaceEntity> | null;

  @WorkspaceJoinColumn('teamOwner')
  teamOwnerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_FIELD_IDS.mktLicenseHistories,
    type: RelationType.ONE_TO_MANY,
    label: msg`License Histories`,
    description: msg`License history records linked to the license`,
    icon: 'IconHistory',
    inverseSideTarget: () => MktLicenseHistoryWorkspaceEntity,
    inverseSideFieldKey: 'mktLicense',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  mktLicenseHistories: Relation<MktLicenseHistoryWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activities`,
    description: msg`Timeline Activities linked to the license`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    inverseSideFieldKey: 'mktLicense',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  @WorkspaceField({
    standardId: MKT_LICENSE_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconUser',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(
      SEARCH_FIELDS_FOR_MKT_LICENSE,
    ),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
