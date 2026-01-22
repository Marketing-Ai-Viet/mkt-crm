import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceIndex } from 'src/engine/twenty-orm/decorators/workspace-index.decorator';
import { MKT_DATA_ACCESS_POLICY_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department.workspace-entity';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/workspace-entity/mkt-organization-level.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { MktPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities/template/mkt-permission-template.workspace-entity';
import {
  POLICY_TYPE_OPTIONS,
  EVALUATION_MODE_OPTIONS,
  RISK_LEVEL_OPTIONS,
  CONFLICT_RESOLUTION_OPTIONS,
  DataAccessPolicyType,
  EvaluationMode,
  RiskLevel,
  ConflictResolution,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

@WorkspaceIndex(['policyType', 'isActive'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['objectName', 'priority'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDataAccessPolicy,
  namePlural: 'mktDataAccessPolicies',
  labelSingular: msg`Data Access Policy`,
  labelPlural: msg`Data Access Policies`,
  description: msg`Data access policies that define business rules for data filtering and access control.`,
  icon: 'IconShield',
  shortcut: 'DA',
  labelIdentifierStandardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.name,
})
@WorkspaceIsSearchable()
export class MktDataAccessPolicyWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Name of the data access policy`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Description of what this policy controls`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  description?: string;

  @WorkspaceRelation({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.department,
    type: RelationType.MANY_TO_ONE,
    label: msg`Department`,
    description: msg`Department this policy applies to`,
    icon: 'IconBuildingBank',
    inverseSideTarget: () => MktDepartmentWorkspaceEntity,
    inverseSideFieldKey: 'dataAccessPolicies',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  department?: Relation<MktDepartmentWorkspaceEntity>;

  @WorkspaceJoinColumn('department')
  departmentId?: string | null;

  @WorkspaceRelation({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.specificMember,
    type: RelationType.MANY_TO_ONE,
    label: msg`Specific Member`,
    description: msg`Specific workspace member this policy applies to`,
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'dataAccessPolicies',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  specificMember?: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('specificMember')
  specificMemberId?: string | null;

  @WorkspaceRelation({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.organizationLevel,
    type: RelationType.MANY_TO_ONE,
    label: msg`Organization Level`,
    description: msg`Organization level this policy applies to`,
    icon: 'IconHierarchy',
    inverseSideTarget: () => MktOrganizationLevelWorkspaceEntity,
    inverseSideFieldKey: 'dataAccessPolicies',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  organizationLevel?: Relation<MktOrganizationLevelWorkspaceEntity>;

  @WorkspaceJoinColumn('organizationLevel')
  organizationLevelId?: string | null;

  @WorkspaceRelation({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.permissionTemplate,
    type: RelationType.MANY_TO_ONE,
    label: msg`Permission Template`,
    description: msg`Permission template this policy is derived from`,
    icon: 'IconTemplate',
    inverseSideTarget: () => MktPermissionTemplateWorkspaceEntity,
    inverseSideFieldKey: 'dataAccessPolicies',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  permissionTemplate?: Relation<MktPermissionTemplateWorkspaceEntity>;

  @WorkspaceJoinColumn('permissionTemplate')
  permissionTemplateId?: string | null;

  @WorkspaceField({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.objectName,
    type: FieldMetadataType.TEXT,
    label: msg`Object Name`,
    description: msg`Name of the object this policy applies to`,
    icon: 'IconBox',
  })
  objectName: string;

  @WorkspaceField({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.filterConditions,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Filter Conditions`,
    description: msg`JSON object containing filter rules and conditions`,
    icon: 'IconFilter',
  })
  filterConditions: object;

  @WorkspaceField({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.priority,
    type: FieldMetadataType.NUMBER,
    label: msg`Priority`,
    description: msg`Priority of this policy (higher number = higher priority)`,
    icon: 'IconArrowUp',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  priority?: number;

  @WorkspaceField({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this policy is currently active`,
    icon: 'IconToggleRight',
    defaultValue: true,
  })
  @WorkspaceIsNullable()
  isActive?: boolean;

  // Phase 2: Policy Type
  @WorkspaceField({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.policyType,
    type: FieldMetadataType.SELECT,
    label: msg`Policy Type`,
    description: msg`Type of policy (ROW_LEVEL, FIELD_LEVEL, COLUMN_LEVEL)`,
    icon: 'IconLayersSubtract',
    options: POLICY_TYPE_OPTIONS,
    defaultValue: `'${DataAccessPolicyType.ROW_LEVEL}'`,
  })
  policyType: DataAccessPolicyType;

  // Phase 2: Evaluation Mode
  @WorkspaceField({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.evaluationMode,
    type: FieldMetadataType.SELECT,
    label: msg`Evaluation Mode`,
    description: msg`Mode for evaluating this policy (STRICT, PERMISSIVE, BALANCED)`,
    icon: 'IconAdjustments',
    options: EVALUATION_MODE_OPTIONS,
    defaultValue: `'${EvaluationMode.BALANCED}'`,
  })
  evaluationMode: EvaluationMode;

  // Phase 2: Risk Level
  @WorkspaceField({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.riskLevel,
    type: FieldMetadataType.SELECT,
    label: msg`Risk Level`,
    description: msg`Risk level of data protected by this policy (LOW, MEDIUM, HIGH, CRITICAL)`,
    icon: 'IconAlertTriangle',
    options: RISK_LEVEL_OPTIONS,
    defaultValue: `'${RiskLevel.LOW}'`,
  })
  riskLevel: RiskLevel;

  // Phase 2: Conflict Resolution
  @WorkspaceField({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.conflictResolution,
    type: FieldMetadataType.SELECT,
    label: msg`Conflict Resolution`,
    description: msg`Strategy for resolving conflicts between policies (DENY_WINS, ALLOW_WINS, HIGHEST_PRIORITY)`,
    icon: 'IconScale',
    options: CONFLICT_RESOLUTION_OPTIONS,
    defaultValue: `'${ConflictResolution.DENY_WINS}'`,
  })
  conflictResolution: ConflictResolution;

  @WorkspaceField({
    standardId: MKT_DATA_ACCESS_POLICY_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;
}
