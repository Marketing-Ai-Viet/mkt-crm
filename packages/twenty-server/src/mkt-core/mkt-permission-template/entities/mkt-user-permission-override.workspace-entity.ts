import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { OVERRIDE_REASON_OPTIONS } from 'src/mkt-core/mkt-permission-template/constants/permission-template-options.constants';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

import { MktPermissionResourceWorkspaceEntity } from './mkt-permission-resource.workspace-entity';
import { MktPermissionActionWorkspaceEntity } from './mkt-permission-action.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktUserPermissionOverride,
  namePlural: 'mktUserPermissionOverrides',
  labelSingular: msg`User Permission Override`,
  labelPlural: msg`User Permission Overrides`,
  description: msg`User-specific permission overrides`,
  icon: 'IconUserX',
  shortcut: 'UPO',
})
export class MktUserPermissionOverrideWorkspaceEntity extends BaseWorkspaceEntity {
  // Workspace Member relationship
  @WorkspaceRelation({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.workspaceMember,
    type: RelationType.MANY_TO_ONE,
    label: msg`Workspace Member`,
    description: msg`Workspace member this override applies to`,
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'permissionOverrides',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  workspaceMember: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('workspaceMember')
  workspaceMemberId: string;

  // Resource relationship
  @WorkspaceRelation({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.resource,
    type: RelationType.MANY_TO_ONE,
    label: msg`Permission Resource`,
    description: msg`Resource this override applies to`,
    icon: 'IconFolder',
    inverseSideTarget: () => MktPermissionResourceWorkspaceEntity,
    inverseSideFieldKey: 'userOverrides',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  resource: Relation<MktPermissionResourceWorkspaceEntity>;

  @WorkspaceJoinColumn('resource')
  resourceId: string;

  // Action relationship
  @WorkspaceRelation({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.action,
    type: RelationType.MANY_TO_ONE,
    label: msg`Permission Action`,
    description: msg`Action this override applies to`,
    icon: 'IconClick',
    inverseSideTarget: () => MktPermissionActionWorkspaceEntity,
    inverseSideFieldKey: 'userOverrides',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  action: Relation<MktPermissionActionWorkspaceEntity>;

  @WorkspaceJoinColumn('action')
  actionId: string;

  // Override configuration
  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.isAllowed,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Allowed`,
    description: msg`Whether this permission is allowed or denied`,
    icon: 'IconCheck',
    defaultValue: false,
  })
  isAllowed: boolean;

  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.contextFilter,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Context Filter`,
    description: msg`JSON filter for contextual permissions (e.g., own records only)`,
    icon: 'IconFilter',
  })
  contextFilter?: object;

  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.expiresAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Expires At`,
    description: msg`When this override expires (optional)`,
    icon: 'IconCalendarX',
  })
  expiresAt?: Date;

  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.reason,
    type: FieldMetadataType.SELECT,
    label: msg`Reason`,
    description: msg`Reason for this override`,
    icon: 'IconNotes',
    options: OVERRIDE_REASON_OPTIONS,
  })
  reason: string;

  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.reasonDescription,
    type: FieldMetadataType.TEXT,
    label: msg`Reason Description`,
    description: msg`Detailed description of the override reason`,
    icon: 'IconFileText',
  })
  reasonDescription?: string;

  @WorkspaceRelation({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.approvedBy,
    type: RelationType.MANY_TO_ONE,
    label: msg`Approved By`,
    description: msg`Workspace member who approved this override`,
    icon: 'IconUserCheck',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'approvedPermissionOverrides',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  approvedBy?: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('approvedBy')
  @WorkspaceIsNullable()
  approvedById?: string;

  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.approvedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Approved At`,
    description: msg`When this override was approved`,
    icon: 'IconCalendarCheck',
  })
  approvedAt?: Date;

  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this override is currently active`,
    icon: 'IconToggleRight',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;
}
