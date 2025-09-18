import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_PERMISSION_CONTEXT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { CONTEXT_TYPE_OPTIONS } from 'src/mkt-core/mkt-permission-template/constants/permission-template-options.constants';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';

import { MktTemplateResourcePermissionWorkspaceEntity } from './mkt-template-resource-permission.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPermissionContext,
  namePlural: 'mktPermissionContexts',
  labelSingular: msg`Permission Context`,
  labelPlural: msg`Permission Contexts`,
  description: msg`Context definitions for permissions`,
  icon: 'IconContext',
  shortcut: 'PC',
})
export class MktPermissionContextWorkspaceEntity extends BaseWorkspaceEntity {
  // Basic context information
  @WorkspaceField({
    standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Name of the permission context`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Description of what this context represents`,
    icon: 'IconFileText',
  })
  description?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.contextType,
    type: FieldMetadataType.SELECT,
    label: msg`Context Type`,
    description: msg`Type of permission context`,
    icon: 'IconCategory',
    options: CONTEXT_TYPE_OPTIONS,
  })
  contextType: string;

  // Context configuration
  @WorkspaceField({
    standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.filterExpression,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Filter Expression`,
    description: msg`JSON expression defining the context filter`,
    icon: 'IconFilter',
  })
  filterExpression?: object;

  @WorkspaceField({
    standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.contextKey,
    type: FieldMetadataType.TEXT,
    label: msg`Context Key`,
    description: msg`Unique key identifier for this context`,
    icon: 'IconKey',
  })
  contextKey: string; // 'own', 'department', 'all', 'custom'

  @WorkspaceField({
    standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.priority,
    type: FieldMetadataType.NUMBER,
    label: msg`Priority`,
    description: msg`Priority order for context evaluation`,
    icon: 'IconArrowUp',
    defaultValue: 0,
  })
  priority: number;

  // Status fields
  @WorkspaceField({
    standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this context is currently active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.isSystemDefault,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is System Default`,
    description: msg`Whether this is a system-provided default context`,
    icon: 'IconSettings',
    defaultValue: false,
  })
  isSystemDefault: boolean;

  @WorkspaceField({
    standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;

  // Reverse relationships
  @WorkspaceRelation({
    standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.templateResourcePermissions,
    type: RelationType.ONE_TO_MANY,
    label: msg`Template Resource Permissions`,
    description: msg`Template resource permissions using this context`,
    icon: 'IconShield',
    inverseSideTarget: () => MktTemplateResourcePermissionWorkspaceEntity,
    inverseSideFieldKey: 'context',
  })
  templateResourcePermissions: Relation<
    MktTemplateResourcePermissionWorkspaceEntity[]
  >;

  @WorkspaceField({
    standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.validationRules,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Validation Rules`,
    description: msg`Rules to validate context usage`,
    icon: 'IconShieldCheck',
  })
  validationRules?: object;
}
