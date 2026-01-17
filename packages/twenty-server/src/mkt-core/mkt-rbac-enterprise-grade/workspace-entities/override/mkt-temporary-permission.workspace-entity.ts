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
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceIndex } from 'src/engine/twenty-orm/decorators/workspace-index.decorator';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_TEMPORARY_PERMISSION_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import {
  TEMPORARY_PERMISSION_PURPOSE_OPTIONS,
  REVOKE_REASON_OPTIONS,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/temporary-permission-options.constants';

@WorkspaceIndex(['granteeWorkspaceMemberId', 'isActive', 'expiresAt'], {
  indexWhereClause: '"deletedAt" IS NULL AND "revokedAt" IS NULL',
})
@WorkspaceIndex(['expiresAt', 'isActive'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['objectName', 'recordId'], {
  indexWhereClause: '"deletedAt" IS NULL AND "isActive" = true',
})
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktTemporaryPermission,
  namePlural: 'mktTemporaryPermissions',
  labelSingular: msg`Temporary Permission`,
  labelPlural: msg`Temporary Permissions`,
  description: msg`Temporary permission grants for time-limited access elevation.`,
  icon: 'IconClockShield',
  shortcut: 'TP',
  labelIdentifierStandardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.objectName,
})
@WorkspaceIsSearchable()
@WorkspaceIsSystem()
export class MktTemporaryPermissionWorkspaceEntity extends BaseWorkspaceEntity {
  // Grantee - Who receives the permission
  @WorkspaceRelation({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.granteeWorkspaceMember,
    type: RelationType.MANY_TO_ONE,
    label: msg`Grantee`,
    description: msg`The workspace member who receives this temporary permission`,
    icon: 'IconUserCheck',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'receivedTemporaryPermissions',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  granteeWorkspaceMember: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('granteeWorkspaceMember')
  granteeWorkspaceMemberId: string;

  // Granter - Who grants the permission
  @WorkspaceRelation({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.granterWorkspaceMember,
    type: RelationType.MANY_TO_ONE,
    label: msg`Granter`,
    description: msg`The workspace member who grants this temporary permission`,
    icon: 'IconUserPlus',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'grantedTemporaryPermissions',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  granterWorkspaceMember?: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('granterWorkspaceMember')
  @WorkspaceIsNullable()
  granterWorkspaceMemberId?: string;

  // Permission Scope - What object/resource is being accessed
  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.objectName,
    type: FieldMetadataType.TEXT,
    label: msg`Object Name`,
    description: msg`Name of the object this permission applies to`,
    icon: 'IconBox',
  })
  objectName: string;

  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.recordId,
    type: FieldMetadataType.UUID,
    label: msg`Record ID`,
    description: msg`ID of the specific record (optional, null means all records of objectName)`,
    icon: 'IconHash',
  })
  @WorkspaceIsNullable()
  recordId?: string;

  // Permissions Granted
  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.canRead,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Can Read`,
    description: msg`Whether read access is granted`,
    icon: 'IconEye',
    defaultValue: false,
  })
  canRead: boolean;

  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.canUpdate,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Can Update`,
    description: msg`Whether update access is granted`,
    icon: 'IconEdit',
    defaultValue: false,
  })
  canUpdate: boolean;

  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.canDelete,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Can Delete`,
    description: msg`Whether delete access is granted`,
    icon: 'IconTrash',
    defaultValue: false,
  })
  canDelete: boolean;

  // Time Control
  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.expiresAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Expires At`,
    description: msg`When this temporary permission expires`,
    icon: 'IconCalendarX',
  })
  expiresAt: Date;

  // Justification
  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.reason,
    type: FieldMetadataType.TEXT,
    label: msg`Reason`,
    description: msg`Reason for granting this temporary permission`,
    icon: 'IconNotes',
  })
  reason: string;

  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.purpose,
    type: FieldMetadataType.SELECT,
    label: msg`Purpose`,
    description: msg`Purpose category for this temporary permission`,
    icon: 'IconTag',
    options: TEMPORARY_PERMISSION_PURPOSE_OPTIONS,
  })
  @WorkspaceIsNullable()
  purpose?: string;

  // Status Tracking
  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this temporary permission is currently active`,
    icon: 'IconToggleRight',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.revokedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Revoked At`,
    description: msg`When this permission was revoked`,
    icon: 'IconCalendarOff',
  })
  @WorkspaceIsNullable()
  revokedAt?: Date;

  // Revoked By - Who revoked the permission
  @WorkspaceRelation({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.revokedBy,
    type: RelationType.MANY_TO_ONE,
    label: msg`Revoked By`,
    description: msg`The workspace member who revoked this permission`,
    icon: 'IconUserX',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'revokedTemporaryPermissions',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  revokedBy?: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('revokedBy')
  @WorkspaceIsNullable()
  revokedById?: string;

  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.revokeReason,
    type: FieldMetadataType.SELECT,
    label: msg`Revoke Reason`,
    description: msg`Reason for revoking this temporary permission`,
    icon: 'IconAlertTriangle',
    options: REVOKE_REASON_OPTIONS,
  })
  @WorkspaceIsNullable()
  revokeReason?: string;

  // Standard fields
  @WorkspaceField({
    standardId: MKT_TEMPORARY_PERMISSION_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position?: number;
}
