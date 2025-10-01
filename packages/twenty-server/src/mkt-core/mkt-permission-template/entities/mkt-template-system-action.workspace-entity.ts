import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { MKT_TEMPLATE_SYSTEM_ACTION_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

import { MktPermissionTemplateWorkspaceEntity } from './mkt-permission-template.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktTemplateSystemAction,
  namePlural: 'mktTemplateSystemActions',
  labelSingular: msg`Template System Action`,
  labelPlural: msg`Template System Actions`,
  description: msg`System-level actions for templates`,
  icon: 'IconSettings',
  shortcut: 'TSA',
})
export class MktTemplateSystemActionWorkspaceEntity extends BaseWorkspaceEntity {
  // Relationship
  @WorkspaceRelation({
    standardId: MKT_TEMPLATE_SYSTEM_ACTION_FIELD_IDS.template,
    type: RelationType.MANY_TO_ONE,
    label: msg`Permission Template`,
    description: msg`Template this system action belongs to`,
    icon: 'IconShield',
    inverseSideTarget: () => MktPermissionTemplateWorkspaceEntity,
    inverseSideFieldKey: 'systemActions',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  template: Relation<MktPermissionTemplateWorkspaceEntity>;

  @WorkspaceJoinColumn('template')
  templateId: string;

  // System action configuration
  @WorkspaceField({
    standardId: MKT_TEMPLATE_SYSTEM_ACTION_FIELD_IDS.actionKey,
    type: FieldMetadataType.TEXT,
    label: msg`Action Key`,
    description: msg`System action identifier`,
    icon: 'IconKey',
  })
  actionKey: string;

  @WorkspaceField({
    standardId: MKT_TEMPLATE_SYSTEM_ACTION_FIELD_IDS.isAllowed,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Allowed`,
    description: msg`Whether this system action is allowed`,
    icon: 'IconCheck',
    defaultValue: false,
  })
  isAllowed: boolean;

  @WorkspaceField({
    standardId: MKT_TEMPLATE_SYSTEM_ACTION_FIELD_IDS.configuration,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Configuration`,
    description: msg`JSON configuration for the action`,
    icon: 'IconSettings',
  })
  @WorkspaceIsNullable()
  configuration?: object; // Action-specific config

  @WorkspaceField({
    standardId: MKT_TEMPLATE_SYSTEM_ACTION_FIELD_IDS.restrictions,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Restrictions`,
    description: msg`JSON restrictions for the action`,
    icon: 'IconShieldLock',
  })
  @WorkspaceIsNullable()
  restrictions?: object; // Action restrictions

  @WorkspaceField({
    standardId: MKT_TEMPLATE_SYSTEM_ACTION_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this system action is active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;
}
