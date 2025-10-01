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
import { MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';

import { MktPermissionTemplateWorkspaceEntity } from './mkt-permission-template.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktUserPermissionTemplate,
  namePlural: 'mktUserPermissionTemplates',
  labelSingular: msg`User Permission Template`,
  labelPlural: msg`User Permission Templates`,
  description: msg`Assignment of users to permission templates`,
  icon: 'IconUserShield',
  shortcut: 'UPT',
})
export class MktUserPermissionTemplateWorkspaceEntity extends BaseWorkspaceEntity {
  // Workspace Member relationship
  @WorkspaceRelation({
    standardId: MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.workspaceMember,
    type: RelationType.MANY_TO_ONE,
    label: msg`Workspace Member`,
    description: msg`Workspace member assigned to this template`,
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'permissionTemplateAssignments',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  workspaceMember: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('workspaceMember')
  workspaceMemberId: string;

  // Permission Template relationship
  @WorkspaceRelation({
    standardId: MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.template,
    type: RelationType.MANY_TO_ONE,
    label: msg`Permission Template`,
    description: msg`Template assigned to the user`,
    icon: 'IconShield',
    inverseSideTarget: () => MktPermissionTemplateWorkspaceEntity,
    inverseSideFieldKey: 'userAssignments',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  template: Relation<MktPermissionTemplateWorkspaceEntity>;

  @WorkspaceJoinColumn('template')
  templateId: string;

  // Assignment details
  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this assignment is currently active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.assignedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Assigned At`,
    description: msg`When this template was assigned to the user`,
    icon: 'IconCalendar',
  })
  assignedAt: Date;

  @WorkspaceRelation({
    standardId: MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.assignedBy,
    type: RelationType.MANY_TO_ONE,
    label: msg`Assigned By`,
    description: msg`Workspace member who made this assignment`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'permissionTemplateAssignmentsMade',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  assignedBy?: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('assignedBy')
  @WorkspaceIsNullable()
  assignedById?: string;

  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.expiresAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Expires At`,
    description: msg`When this assignment expires (optional)`,
    icon: 'IconCalendarX',
  })
  @WorkspaceIsNullable()
  expiresAt?: Date;

  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.assignmentReason,
    type: FieldMetadataType.TEXT,
    label: msg`Assignment Reason`,
    description: msg`Reason for this assignment`,
    icon: 'IconNotes',
  })
  assignmentReason?: string;

  @WorkspaceField({
    standardId: MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;
}
