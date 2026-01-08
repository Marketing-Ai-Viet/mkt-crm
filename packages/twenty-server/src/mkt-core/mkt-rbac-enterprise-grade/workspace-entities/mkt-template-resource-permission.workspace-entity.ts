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
import { MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

import { MktPermissionTemplateWorkspaceEntity } from './mkt-permission-template.workspace-entity';
import { MktPermissionResourceWorkspaceEntity } from './mkt-permission-resource.workspace-entity';
import { MktPermissionContextWorkspaceEntity } from './mkt-permission-context.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktTemplateResourcePermission,
  namePlural: 'mktTemplateResourcePermissions',
  labelSingular: msg`Template Resource Permission`,
  labelPlural: msg`Template Resource Permissions`,
  description: msg`Maps template permissions to specific resources`,
  icon: 'IconLock',
  shortcut: 'TRP',
})
export class MktTemplateResourcePermissionWorkspaceEntity extends BaseWorkspaceEntity {
  // Relationships
  @WorkspaceRelation({
    standardId: MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.template,
    type: RelationType.MANY_TO_ONE,
    label: msg`Permission Template`,
    description: msg`Template this permission belongs to`,
    icon: 'IconShield',
    inverseSideTarget: () => MktPermissionTemplateWorkspaceEntity,
    inverseSideFieldKey: 'resourcePermissions',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  template: Relation<MktPermissionTemplateWorkspaceEntity>;

  @WorkspaceJoinColumn('template')
  templateId: string;

  @WorkspaceRelation({
    standardId: MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.resource,
    type: RelationType.MANY_TO_ONE,
    label: msg`Permission Resource`,
    description: msg`Resource this permission applies to`,
    icon: 'IconBox',
    inverseSideTarget: () => MktPermissionResourceWorkspaceEntity,
    inverseSideFieldKey: 'templatePermissions',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  resource: Relation<MktPermissionResourceWorkspaceEntity>;

  @WorkspaceJoinColumn('resource')
  resourceId: string;

  // Context relationship (optional)
  @WorkspaceRelation({
    standardId: MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.context,
    type: RelationType.MANY_TO_ONE,
    label: msg`Permission Context`,
    description: msg`Context this permission applies to`,
    icon: 'IconContext',
    inverseSideTarget: () => MktPermissionContextWorkspaceEntity,
    inverseSideFieldKey: 'templateResourcePermissions',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  context?: Relation<MktPermissionContextWorkspaceEntity>;

  @WorkspaceJoinColumn('context')
  @WorkspaceIsNullable()
  contextId?: string;

  // Permission configuration
  @WorkspaceField({
    standardId: MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.allowedActions,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Allowed Actions`,
    description: msg`Array of allowed action keys`,
    icon: 'IconCheck',
  })
  allowedActions: string[]; // ['READ', 'CREATE', 'UPDATE']

  @WorkspaceField({
    standardId: MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.deniedActions,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Denied Actions`,
    description: msg`Array of explicitly denied action keys`,
    icon: 'IconX',
  })
  @WorkspaceIsNullable()
  deniedActions?: string[]; // ['DELETE'] - explicit denial

  @WorkspaceField({
    standardId: MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.conditions,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Conditions`,
    description: msg`JSON conditions for conditional access`,
    icon: 'IconFilter',
  })
  @WorkspaceIsNullable()
  conditions?: object; // Conditional logic

  @WorkspaceField({
    standardId: MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.restrictions,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Restrictions`,
    description: msg`JSON restrictions (time, IP, etc.)`,
    icon: 'IconShieldLock',
  })
  @WorkspaceIsNullable()
  restrictions?: object; // Access restrictions

  @WorkspaceField({
    standardId: MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this permission is active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;
}
