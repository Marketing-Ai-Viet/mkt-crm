import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_PERMISSION_TEMPLATE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { TEMPLATE_CREATED_BY_SOURCE_OPTIONS } from 'src/mkt-core/mkt-permission-template/constants/permission-template-options.constants';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-data-access-policy/mkt-data-access-policy.workspace-entity';

import { MktTemplateResourcePermissionWorkspaceEntity } from './mkt-template-resource-permission.workspace-entity';
import { MktTemplateSystemActionWorkspaceEntity } from './mkt-template-system-action.workspace-entity';
import { MktTemplateAccessLimitationWorkspaceEntity } from './mkt-template-access-limitation.workspace-entity';
import { MktUserPermissionTemplateWorkspaceEntity } from './mkt-user-permission-template.workspace-entity';

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

  // Hierarchy mapping
  @WorkspaceField({
    standardId: MKT_PERMISSION_TEMPLATE_FIELD_IDS.hierarchyLevel,
    type: FieldMetadataType.NUMBER,
    label: msg`Primary Hierarchy Level`,
    description: msg`Primary hierarchy level this template applies to`,
    icon: 'IconHierarchy',
  })
  hierarchyLevel: number;

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
}
