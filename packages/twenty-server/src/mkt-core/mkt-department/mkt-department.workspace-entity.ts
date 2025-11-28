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
import { WorkspaceIsUnique } from 'src/engine/twenty-orm/decorators/workspace-is-unique.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import {
  FieldTypeAndNameMetadata,
  getTsVectorColumnExpressionFromFields,
} from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { MKT_DEPARTMENT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-data-access-policy/mkt-data-access-policy.workspace-entity';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department-hierarchy/mkt-department-hierarchy.workspace-entity';
import {
  DEPARTMENT_TYPE,
  DEPARTMENT_TYPE_OPTIONS,
} from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

//SEARCH_FIELDS_FOR_ENTITY
// Define fields to be used for search
const SEARCH_FIELDS_FOR_ENTITY: FieldTypeAndNameMetadata[] = [
  { name: 'departmentCode', type: FieldMetadataType.TEXT },
  { name: 'departmentName', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDepartment,
  namePlural: 'mktDepartments',
  labelSingular: msg`Department`,
  labelPlural: msg`Departments`,
  description: msg`Departments in the marketing system.`,
  icon: 'IconBuilding',
  shortcut: 'D',
  labelIdentifierStandardId: MKT_DEPARTMENT_FIELD_IDS.departmentCode,
})
@WorkspaceIsSearchable()
export class MktDepartmentWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.departmentCode,
    type: FieldMetadataType.TEXT,
    label: msg`Department Code`,
    description: msg`Unique department identifier`,
    icon: 'IconCode',
  })
  @WorkspaceIsUnique()
  departmentCode: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`Additional metadata for the department`,
    icon: 'IconInfoCircle',
  })
  @WorkspaceIsNullable()
  metadata?: JSON | null;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.departmentType,
    type: FieldMetadataType.SELECT,
    label: msg`Department Type`,
    description: msg`Type of the department`,
    icon: 'IconBuildingCommunity',
    options: DEPARTMENT_TYPE_OPTIONS,
  })
  @WorkspaceIsNullable()
  departmentType: DEPARTMENT_TYPE | null;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.departmentName,
    type: FieldMetadataType.TEXT,
    label: msg`Department Name`,
    description: msg`Display name of the department`,
    icon: 'IconTag',
  })
  departmentName: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.departmentNameEn,
    type: FieldMetadataType.TEXT,
    label: msg`Department Name (English)`,
    description: msg`English name of the department`,
    icon: 'IconLanguage',
  })
  @WorkspaceIsNullable()
  departmentNameEn?: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Detailed description of the department`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  description?: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.budgetCode,
    type: FieldMetadataType.TEXT,
    label: msg`Budget Code`,
    description: msg`Budget tracking code`,
    icon: 'IconCash',
  })
  @WorkspaceIsNullable()
  budgetCode?: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.costCenter,
    type: FieldMetadataType.TEXT,
    label: msg`Cost Center`,
    description: msg`Cost allocation center`,
    icon: 'IconCalculator',
  })
  @WorkspaceIsNullable()
  costCenter?: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.requiresKpiTracking,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Requires KPI Tracking`,
    description: msg`Whether KPI tracking is required`,
    icon: 'IconTarget',
  })
  @WorkspaceIsNullable()
  requiresKpiTracking?: boolean;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.allowsCrossDepartmentAccess,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Allows Cross-Department Access`,
    description: msg`Whether cross-department access is allowed`,
    icon: 'IconExchange',
  })
  @WorkspaceIsNullable()
  allowsCrossDepartmentAccess?: boolean;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.defaultKpiCategory,
    type: FieldMetadataType.TEXT,
    label: msg`Default KPI Category`,
    description: msg`Default KPI category for this department`,
    icon: 'IconCategory',
  })
  @WorkspaceIsNullable()
  defaultKpiCategory?: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.displayOrder,
    type: FieldMetadataType.NUMBER,
    label: msg`Display Order`,
    description: msg`Order of display in department list`,
    icon: 'IconList',
  })
  @WorkspaceIsNullable()
  displayOrder?: number;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.colorCode,
    type: FieldMetadataType.TEXT,
    label: msg`Color Code`,
    description: msg`Color for UI display`,
    icon: 'IconPalette',
  })
  @WorkspaceIsNullable()
  colorCode?: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.iconName,
    type: FieldMetadataType.TEXT,
    label: msg`Icon Name`,
    description: msg`Icon name for UI display`,
    icon: 'IconPhoto',
  })
  @WorkspaceIsNullable()
  iconName?: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this department is currently active`,
    icon: 'IconCheck',
  })
  @WorkspaceIsNullable()
  isActive?: boolean;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.address,
    type: FieldMetadataType.TEXT,
    label: msg`Address`,
    description: msg`Physical address of the department`,
    icon: 'IconMapPin',
  })
  @WorkspaceIsNullable()
  address?: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;

  // Relations
  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_FIELD_IDS.staffMembers,
    type: RelationType.ONE_TO_MANY,
    label: msg`People`,
    description: msg`People in this department`,
    icon: 'IconUsers',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'department',
  })
  people: Relation<WorkspaceMemberWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_FIELD_IDS.leader,
    type: RelationType.MANY_TO_ONE,
    label: msg`Leader`,
    description: msg`The leader of this department`,
    icon: 'IconCrown',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'leaderForMktDepartments',
  })
  leader: Relation<WorkspaceMemberWorkspaceEntity>;
  @WorkspaceJoinColumn('leader')
  leaderId: string | null;

  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_FIELD_IDS.subLeader,
    type: RelationType.MANY_TO_ONE,
    label: msg`Sub Leader`,
    description: msg`The sub-leader of this department`,
    icon: 'IconCrown',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'subLeaderForMktDepartments',
  })
  subLeader: Relation<WorkspaceMemberWorkspaceEntity>;
  @WorkspaceJoinColumn('subLeader')
  subLeaderId: string | null;

  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_FIELD_IDS.childHierarchies,
    type: RelationType.ONE_TO_MANY,
    label: msg`Child Hierarchies`,
    description: msg`Hierarchy entries where this department is the parent`,
    icon: 'IconHierarchy',
    inverseSideTarget: () => MktDepartmentHierarchyWorkspaceEntity,
    inverseSideFieldKey: 'parentDepartment',
  })
  childHierarchies: Relation<MktDepartmentHierarchyWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_FIELD_IDS.parentHierarchies,
    type: RelationType.ONE_TO_MANY,
    label: msg`Parent Hierarchies`,
    description: msg`Hierarchy entries where this department is the child`,
    icon: 'IconHierarchy2',
    inverseSideTarget: () => MktDepartmentHierarchyWorkspaceEntity,
    inverseSideFieldKey: 'childDepartment',
  })
  parentHierarchies: Relation<MktDepartmentHierarchyWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_FIELD_IDS.dataAccessPolicies,
    type: RelationType.ONE_TO_MANY,
    label: msg`Data Access Policies`,
    description: msg`Data access policies that apply to this department`,
    icon: 'IconShield',
    inverseSideTarget: () => MktDataAccessPolicyWorkspaceEntity,
    inverseSideFieldKey: 'department',
  })
  dataAccessPolicies: Relation<MktDataAccessPolicyWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_FIELD_IDS.departmentOwnerForMktLicenses,
    type: RelationType.ONE_TO_MANY,
    label: msg`Department Owner for Mkt Licenses`,
    description: msg`The owner of this department for Mkt Licenses`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => MktLicenseWorkspaceEntity,
    inverseSideFieldKey: 'departmentOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  departmentOwnerForMktLicenses: Relation<MktLicenseWorkspaceEntity[]> | null;

  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_FIELD_IDS.teamOwnerForMktLicenses,
    type: RelationType.ONE_TO_MANY,
    label: msg`Team Owner for Mkt Licenses`,
    description: msg`The team owner of this department for Mkt Licenses`,
    icon: 'IconUsers',
    inverseSideTarget: () => MktLicenseWorkspaceEntity,
    inverseSideFieldKey: 'teamOwner',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  teamOwnerForMktLicenses: Relation<MktLicenseWorkspaceEntity[]> | null;

  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_FIELD_IDS.teamMembers,
    type: RelationType.ONE_TO_MANY,
    label: msg`Team Members`,
    description: msg`Team members in this department`,
    icon: 'IconUserCheck',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'team',
  })
  @WorkspaceIsNullable()
  teamMembers: Relation<WorkspaceMemberWorkspaceEntity[]>;

  // ✅ Search vector field
  @WorkspaceField({
    standardId: MKT_DEPARTMENT_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(
      SEARCH_FIELDS_FOR_ENTITY,
    ),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
