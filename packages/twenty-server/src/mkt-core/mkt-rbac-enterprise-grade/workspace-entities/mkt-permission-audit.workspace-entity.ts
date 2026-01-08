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
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_PERMISSION_AUDIT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import {
  PermissionAction,
  PermissionSource,
  CheckResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';

import {
  PERMISSION_SOURCE_OPTIONS,
  PERMISSION_ACTION_OPTIONS,
  CHECK_RESULT_OPTIONS,
} from './constants/permission-audit-options.constants';

@WorkspaceIndex(['userId', 'createdAt'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['workspaceMemberId', 'createdAt'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['checkResult', 'createdAt'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['requestContext'], {
  indexType: IndexType.GIN,
})
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPermissionAudit,
  namePlural: 'mktPermissionAudits',
  labelSingular: msg`Permission Audit`,
  labelPlural: msg`Permission Audits`,
  description: msg`Audit log for permission checks and access control decisions.`,
  icon: 'IconShieldSearch',
  shortcut: 'PA',
  labelIdentifierStandardId: MKT_PERMISSION_AUDIT_FIELD_IDS.objectName,
})
@WorkspaceIsSearchable()
@WorkspaceIsSystem()
export class MktPermissionAuditWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.workspaceMember,
    type: RelationType.MANY_TO_ONE,
    label: msg`Workspace Member`,
    description: msg`The workspace member who performed the action`,
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'permissionAudits',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  workspaceMember: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('workspaceMember')
  workspaceMemberId: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.userId,
    type: FieldMetadataType.TEXT,
    label: msg`User ID`,
    description: msg`ID from core.user table`,
    icon: 'IconKey',
  })
  @WorkspaceIsNullable()
  userId?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.action,
    type: FieldMetadataType.SELECT,
    label: msg`Action`,
    description: msg`The action that was attempted`,
    icon: 'IconPlayerPlay',
    options: PERMISSION_ACTION_OPTIONS,
  })
  action: PermissionAction;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.objectName,
    type: FieldMetadataType.TEXT,
    label: msg`Object Name`,
    description: msg`Name of the object being accessed`,
    icon: 'IconBox',
  })
  objectName: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.recordId,
    type: FieldMetadataType.TEXT,
    label: msg`Record ID`,
    description: msg`ID of the specific record being accessed`,
    icon: 'IconHash',
  })
  @WorkspaceIsNullable()
  recordId?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.permissionSource,
    type: FieldMetadataType.SELECT,
    label: msg`Permission Source`,
    description: msg`Source of the permission decision`,
    icon: 'IconShieldCheck',
    options: PERMISSION_SOURCE_OPTIONS,
  })
  @WorkspaceIsNullable()
  permissionSource?: PermissionSource;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.checkResult,
    type: FieldMetadataType.SELECT,
    label: msg`Check Result`,
    description: msg`Result of the permission check`,
    icon: 'IconCheck',
    options: CHECK_RESULT_OPTIONS,
  })
  checkResult: CheckResult;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.denialReason,
    type: FieldMetadataType.TEXT,
    label: msg`Denial Reason`,
    description: msg`Reason for permission denial`,
    icon: 'IconAlertTriangle',
  })
  @WorkspaceIsNullable()
  denialReason?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.requestContext,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Request Context`,
    description: msg`Additional context information for the request`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  requestContext?: object;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.ipAddress,
    type: FieldMetadataType.TEXT,
    label: msg`IP Address`,
    description: msg`IP address of the request`,
    icon: 'IconGlobe',
  })
  @WorkspaceIsNullable()
  ipAddress?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.userAgent,
    type: FieldMetadataType.TEXT,
    label: msg`User Agent`,
    description: msg`User agent string of the request`,
    icon: 'IconDeviceDesktop',
  })
  @WorkspaceIsNullable()
  userAgent?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.checkDurationMs,
    type: FieldMetadataType.NUMBER,
    label: msg`Check Duration (ms)`,
    description: msg`Time taken to perform the permission check`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  checkDurationMs?: number;

  @WorkspaceField({
    standardId: MKT_PERMISSION_AUDIT_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;
}
