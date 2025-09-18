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
import { MKT_PERMISSION_ACTION_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import {
  PERMISSION_ACTION_CATEGORY_OPTIONS,
  PERMISSION_RISK_LEVEL_OPTIONS,
} from 'src/mkt-core/mkt-permission-template/constants/permission-template-options.constants';
import { MktUserPermissionOverrideWorkspaceEntity } from 'src/mkt-core/mkt-permission-template/entities/mkt-user-permission-override.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPermissionAction,
  namePlural: 'mktPermissionActions',
  labelSingular: msg`Permission Action`,
  labelPlural: msg`Permission Actions`,
  description: msg`Defines actions that can be performed on resources`,
  icon: 'IconClick',
  shortcut: 'PA',
  labelIdentifierStandardId: MKT_PERMISSION_ACTION_FIELD_IDS.actionName,
})
@WorkspaceIsSearchable()
export class MktPermissionActionWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_PERMISSION_ACTION_FIELD_IDS.actionKey,
    type: FieldMetadataType.TEXT,
    label: msg`Action Key`,
    description: msg`Unique key for action (READ, CREATE, UPDATE, DELETE)`,
    icon: 'IconKey',
  })
  actionKey: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_ACTION_FIELD_IDS.actionName,
    type: FieldMetadataType.TEXT,
    label: msg`Action Name`,
    description: msg`Human-readable name (Read, Create, Update, Delete)`,
    icon: 'IconTag',
  })
  actionName: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_ACTION_FIELD_IDS.actionCategory,
    type: FieldMetadataType.SELECT,
    label: msg`Action Category`,
    description: msg`Category for grouping actions`,
    icon: 'IconCategory',
    options: PERMISSION_ACTION_CATEGORY_OPTIONS,
  })
  actionCategory: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_ACTION_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Detailed description of the action`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  description?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_ACTION_FIELD_IDS.riskLevel,
    type: FieldMetadataType.SELECT,
    label: msg`Risk Level`,
    description: msg`Risk level associated with this action`,
    icon: 'IconAlertTriangle',
    options: PERMISSION_RISK_LEVEL_OPTIONS,
  })
  riskLevel: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_ACTION_FIELD_IDS.requiresApproval,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Requires Approval`,
    description: msg`Whether this action requires approval by default`,
    icon: 'IconCheckbox',
    defaultValue: false,
  })
  requiresApproval: boolean;

  @WorkspaceField({
    standardId: MKT_PERMISSION_ACTION_FIELD_IDS.isSystemAction,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is System Action`,
    description: msg`Whether this is a core system action`,
    icon: 'IconSettings',
    defaultValue: false,
  })
  isSystemAction: boolean;

  @WorkspaceField({
    standardId: MKT_PERMISSION_ACTION_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether action is currently active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_PERMISSION_ACTION_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;

  // Relationships
  @WorkspaceRelation({
    standardId: MKT_PERMISSION_ACTION_FIELD_IDS.userOverrides,
    type: RelationType.ONE_TO_MANY,
    label: msg`User Overrides`,
    description: msg`User permission overrides for this action`,
    icon: 'IconUserX',
    inverseSideTarget: () => MktUserPermissionOverrideWorkspaceEntity,
    inverseSideFieldKey: 'action',
  })
  userOverrides: Relation<MktUserPermissionOverrideWorkspaceEntity[]>;
}
