import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_DEPARTMENT_SUB_MANAGER_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

/**
 * Entity representing sub-manager assignments for departments.
 * This is a join table that allows a department to have multiple sub-managers.
 *
 * Relationships:
 * - Each department can have multiple sub-managers (ONE_TO_MANY from department)
 * - Each workspace member can be a sub-manager of multiple departments (ONE_TO_MANY from member)
 */
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDepartmentSubManager,
  namePlural: 'mktDepartmentSubManagers',
  labelSingular: msg`Department Sub Manager`,
  labelPlural: msg`Department Sub Managers`,
  description: msg`Sub-manager assignments for departments`,
  icon: 'IconUserStar',
})
export class MktDepartmentSubManagerWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_DEPARTMENT_SUB_MANAGER_FIELD_IDS.isPrimary,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Primary`,
    description: msg`Whether this is the primary sub-manager for the department`,
    icon: 'IconStar',
    defaultValue: false,
  })
  @WorkspaceIsNullable()
  isPrimary?: boolean;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_SUB_MANAGER_FIELD_IDS.assignedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Assigned At`,
    description: msg`When this sub-manager was assigned`,
    icon: 'IconCalendar',
  })
  @WorkspaceIsNullable()
  assignedAt?: Date;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_SUB_MANAGER_FIELD_IDS.note,
    type: FieldMetadataType.TEXT,
    label: msg`Note`,
    description: msg`Additional notes about this assignment`,
    icon: 'IconNote',
  })
  @WorkspaceIsNullable()
  note?: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_SUB_MANAGER_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this assignment is currently active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  @WorkspaceIsNullable()
  isActive?: boolean;

  // Relations
  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_SUB_MANAGER_FIELD_IDS.department,
    type: RelationType.MANY_TO_ONE,
    label: msg`Department`,
    description: msg`The department this sub-manager is assigned to`,
    icon: 'IconBuilding',
    inverseSideTarget: () => MktDepartmentWorkspaceEntity,
    inverseSideFieldKey: 'subManagers',
  })
  department: Relation<MktDepartmentWorkspaceEntity>;

  @WorkspaceJoinColumn('department')
  departmentId: string | null;

  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_SUB_MANAGER_FIELD_IDS.workspaceMember,
    type: RelationType.MANY_TO_ONE,
    label: msg`Workspace Member`,
    description: msg`The workspace member who is the sub-manager`,
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'subManagerAssignments',
  })
  workspaceMember: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('workspaceMember')
  workspaceMemberId: string | null;
}
