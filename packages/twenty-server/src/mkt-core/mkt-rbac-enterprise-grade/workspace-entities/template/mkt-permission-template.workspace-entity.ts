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
import { MKT_PERMISSION_TEMPLATE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { TEMPLATE_CREATED_BY_SOURCE_OPTIONS } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/permission-template/options.constants';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/workspace-entity/mkt-organization-level.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import {
  PERMISSION_TEMPLATE_TYPE_OPTIONS,
  RESOLUTION_STRATEGY_OPTIONS,
  PermissionTemplateType,
  ResolutionStrategy,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

import { MktTemplateResourcePermissionWorkspaceEntity } from './mkt-template-resource-permission.workspace-entity';
import { MktTemplateSystemActionWorkspaceEntity } from './mkt-template-system-action.workspace-entity';
import { MktTemplateAccessLimitationWorkspaceEntity } from './mkt-template-access-limitation.workspace-entity';
import { MktUserPermissionTemplateWorkspaceEntity } from './mkt-user-permission-template.workspace-entity';

@WorkspaceIndex(['isActive', 'hierarchyLevel'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['templateKey'], {
  indexWhereClause: '"deletedAt" IS NULL AND "isActive" = true',
})
@WorkspaceIndex(['departmentType', 'isActive'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPermissionTemplate,
  namePlural: 'mktPermissionTemplates',
  labelSingular: msg`Permission Template`,
  labelPlural: msg`Permission Templates`,
  description: msg`Templates defining permission sets for organization levels`,
  icon: 'IconShield',
  shortcut: 'PT',
  labelIdentifierStandardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.templateName,
})
@WorkspaceIsSearchable()
export class MktPermissionTemplateWorkspaceEntity extends BaseWorkspaceEntity {
  // Template identification
  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.templateKey,
    type: FieldMetadataType.TEXT,
    label: msg`Template Key`,
    description: msg`Unique identifier for template (CEO, VP, DIRECTOR, etc.)`,
    icon: 'IconKey',
  })
  templateKey: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.templateName,
    type: FieldMetadataType.TEXT,
    label: msg`Template Name`,
    description: msg`Human-readable name (Chief Executive Officer)`,
    icon: 'IconTag',
  })
  templateName: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Detailed description of template purpose`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  description?: string;

  // Phase 2: Template Type
  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.templateType,
    type: FieldMetadataType.SELECT,
    label: msg`Template Type`,
    description: msg`Type of permission template (ROLE_BASED, HIERARCHY_BASED, DEPARTMENT_BASED, CUSTOM)`,
    icon: 'IconCategory',
    options: PERMISSION_TEMPLATE_TYPE_OPTIONS,
    defaultValue: `'${PermissionTemplateType.ROLE_BASED}'`,
  })
  templateType: PermissionTemplateType;

  // Phase 2: Department Type
  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.departmentType,
    type: FieldMetadataType.TEXT,
    label: msg`Department Type`,
    description: msg`Department type this template applies to (EXECUTIVE, ENGINEERING, SALES, etc.)`,
    icon: 'IconBuilding',
  })
  @WorkspaceIsNullable()
  departmentType?: string;

  // Hierarchy mapping
  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.hierarchyLevel,
    type: FieldMetadataType.NUMBER,
    label: msg`Primary Hierarchy Level`,
    description: msg`Primary hierarchy level this template applies to`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  hierarchyLevel?: number;

  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.applicableToLevels,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Applicable Levels`,
    description: msg`Array of hierarchy levels this template can apply to`,
    icon: 'IconList',
  })
  applicableToLevels: number[];

  // Template metadata
  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.version,
    type: FieldMetadataType.TEXT,
    label: msg`Version`,
    description: msg`Template version for change tracking`,
    icon: 'IconVersions',
  })
  version: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.isSystemTemplate,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is System Template`,
    description: msg`Whether this is a built-in system template`,
    icon: 'IconSettings',
    defaultValue: false,
  })
  isSystemTemplate: boolean;

  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether template is currently active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.priority,
    type: FieldMetadataType.NUMBER,
    label: msg`Priority`,
    description: msg`Priority for template resolution conflicts`,
    icon: 'IconPriorityHigh',
    defaultValue: 100,
  })
  priority: number;

  // Phase 2: Resolution Strategy
  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.resolutionStrategy,
    type: FieldMetadataType.SELECT,
    label: msg`Resolution Strategy`,
    description: msg`Strategy for resolving permission conflicts (PRIORITY_BASED, MOST_RESTRICTIVE, MOST_PERMISSIVE)`,
    icon: 'IconScale',
    options: RESOLUTION_STRATEGY_OPTIONS,
    defaultValue: `'${ResolutionStrategy.PRIORITY_BASED}'`,
  })
  resolutionStrategy: ResolutionStrategy;

  // Phase 2: Effective dates
  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.effectiveFrom,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Effective From`,
    description: msg`Date/time when this template becomes effective`,
    icon: 'IconCalendarEvent',
  })
  @WorkspaceIsNullable()
  effectiveFrom?: Date;

  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.effectiveTo,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Effective To`,
    description: msg`Date/time when this template expires`,
    icon: 'IconCalendarOff',
  })
  @WorkspaceIsNullable()
  effectiveTo?: Date;

  // Phase 2: Metadata
  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`Additional metadata for this template`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  metadata?: object;

  // Audit fields
  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.createdBySource,
    type: FieldMetadataType.SELECT,
    label: msg`Created By Source`,
    description: msg`Source that created this template`,
    icon: 'IconUser',
    options: TEMPLATE_CREATED_BY_SOURCE_OPTIONS,
  })
  createdBySource: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.lastModifiedBy,
    type: FieldMetadataType.TEXT,
    label: msg`Last Modified By`,
    description: msg`User who last modified this template`,
    icon: 'IconUser',
  })
  @WorkspaceIsNullable()
  lastModifiedBy?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.lastModifiedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Last Modified At`,
    description: msg`When template was last modified`,
    icon: 'IconCalendar',
  })
  @WorkspaceIsNullable()
  lastModifiedAt?: Date;

  // Relationships
  @WorkspaceRelation({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.resourcePermissions,
    type: RelationType.ONE_TO_MANY,
    label: msg`Resource Permissions`,
    description: msg`Resource permissions for this template`,
    icon: 'IconLock',
    inverseSideTarget: () => MktTemplateResourcePermissionWorkspaceEntity,
    inverseSideFieldKey: 'template',
  })
  resourcePermissions: Relation<MktTemplateResourcePermissionWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.systemActions,
    type: RelationType.ONE_TO_MANY,
    label: msg`System Actions`,
    description: msg`System actions for this template`,
    icon: 'IconClick',
    inverseSideTarget: () => MktTemplateSystemActionWorkspaceEntity,
    inverseSideFieldKey: 'template',
  })
  systemActions: Relation<MktTemplateSystemActionWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.accessLimitations,
    type: RelationType.ONE_TO_MANY,
    label: msg`Access Limitations`,
    description: msg`Access limitations for this template`,
    icon: 'IconShieldLock',
    inverseSideTarget: () => MktTemplateAccessLimitationWorkspaceEntity,
    inverseSideFieldKey: 'template',
  })
  accessLimitations: Relation<MktTemplateAccessLimitationWorkspaceEntity[]>;

  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceRelation({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.dataAccessPolicies,
    type: RelationType.ONE_TO_MANY,
    label: msg`Data Access Policies`,
    description: msg`Data access policies generated from this template`,
    icon: 'IconShield',
    inverseSideTarget: () => MktDataAccessPolicyWorkspaceEntity,
    inverseSideFieldKey: 'permissionTemplate',
  })
  dataAccessPolicies: Relation<MktDataAccessPolicyWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.userAssignments,
    type: RelationType.ONE_TO_MANY,
    label: msg`User Assignments`,
    description: msg`Users assigned to this permission template`,
    icon: 'IconUsers',
    inverseSideTarget: () => MktUserPermissionTemplateWorkspaceEntity,
    inverseSideFieldKey: 'template',
  })
  userAssignments: Relation<MktUserPermissionTemplateWorkspaceEntity[]>;

  // Phase 2: Organization Level relation
  @WorkspaceRelation({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.organizationLevel,
    type: RelationType.MANY_TO_ONE,
    label: msg`Organization Level`,
    description: msg`Organization level this template is associated with`,
    icon: 'IconHierarchy',
    inverseSideTarget: () => MktOrganizationLevelWorkspaceEntity,
    inverseSideFieldKey: 'permissionTemplates',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  organizationLevel?: Relation<MktOrganizationLevelWorkspaceEntity>;

  @WorkspaceJoinColumn('organizationLevel')
  organizationLevelId?: string | null;

  // Phase 2: Created By relation
  @WorkspaceRelation({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.createdBy,
    type: RelationType.MANY_TO_ONE,
    label: msg`Created By`,
    description: msg`Workspace member who created this template`,
    icon: 'IconUserPlus',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'createdPermissionTemplates',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  createdBy?: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('createdBy')
  createdById?: string | null;
}
