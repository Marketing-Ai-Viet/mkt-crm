import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIndex } from 'src/engine/twenty-orm/decorators/workspace-index.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_POLICY_CHANGE_REQUEST_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

import { MktPolicyApprovalWorkspaceEntity } from './mkt-policy-approval.workspace-entity';

/**
 * Policy change request status
 */
export const POLICY_CHANGE_REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  APPLIED: 'APPLIED',
  EXPIRED: 'EXPIRED',
} as const;

export type PolicyChangeRequestStatus =
  (typeof POLICY_CHANGE_REQUEST_STATUS)[keyof typeof POLICY_CHANGE_REQUEST_STATUS];

/**
 * Policy change type
 */
export const POLICY_CHANGE_TYPE = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;

export type PolicyChangeType =
  (typeof POLICY_CHANGE_TYPE)[keyof typeof POLICY_CHANGE_TYPE];

/**
 * MktPolicyChangeRequestWorkspaceEntity
 *
 * Tracks high-risk policy change requests that require approval.
 * Part of the approval workflow for policy changes with wildcards,
 * admin role assignments, or sensitive resource access.
 *
 * Workflow:
 * 1. User submits change request
 * 2. Risk assessment determines required approvals
 * 3. Approvers review and approve/reject
 * 4. Once approved, policy is applied
 *
 * Audit: Stored for 7 years for SOC2 compliance.
 */
@WorkspaceIndex(['status'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['requestedById'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPolicyChangeRequest,
  namePlural: 'mktPolicyChangeRequests',
  labelSingular: msg`Policy Change Request`,
  labelPlural: msg`Policy Change Requests`,
  description: msg`High-risk policy change requests requiring approval`,
  icon: 'IconShieldCheck',
  shortcut: 'PCR',
  labelIdentifierStandardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.title,
})
export class MktPolicyChangeRequestWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.title,
    type: FieldMetadataType.TEXT,
    label: msg`Title`,
    description: msg`Request title for identification`,
    icon: 'IconTextCaption',
  })
  title: string;

  @WorkspaceField({
    standardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Request status: PENDING, APPROVED, REJECTED, APPLIED, EXPIRED`,
    icon: 'IconStatusChange',
    options: [
      { value: 'PENDING', label: 'Pending', color: 'yellow', position: 0 },
      { value: 'APPROVED', label: 'Approved', color: 'green', position: 1 },
      { value: 'REJECTED', label: 'Rejected', color: 'red', position: 2 },
      { value: 'APPLIED', label: 'Applied', color: 'blue', position: 3 },
      { value: 'EXPIRED', label: 'Expired', color: 'gray', position: 4 },
    ],
    defaultValue: "'PENDING'",
  })
  status: PolicyChangeRequestStatus;

  @WorkspaceField({
    standardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.changeType,
    type: FieldMetadataType.SELECT,
    label: msg`Change Type`,
    description: msg`Type of change: CREATE, UPDATE, DELETE`,
    icon: 'IconEdit',
    options: [
      { value: 'CREATE', label: 'Create', color: 'green', position: 0 },
      { value: 'UPDATE', label: 'Update', color: 'yellow', position: 1 },
      { value: 'DELETE', label: 'Delete', color: 'red', position: 2 },
    ],
  })
  changeType: PolicyChangeType;

  @WorkspaceField({
    standardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.policyData,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Policy Data`,
    description: msg`JSON containing the policy to be created/updated/deleted`,
    icon: 'IconCode',
  })
  policyData: object;

  @WorkspaceField({
    standardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.riskAssessment,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Risk Assessment`,
    description: msg`Risk assessment result from HighRiskPolicyValidator`,
    icon: 'IconAlertTriangle',
  })
  riskAssessment: object;

  @WorkspaceField({
    standardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.requiredApprovals,
    type: FieldMetadataType.NUMBER,
    label: msg`Required Approvals`,
    description: msg`Number of approvals required (1 or 2 for dual-sign)`,
    icon: 'IconUsers',
    defaultValue: 1,
  })
  requiredApprovals: number;

  @WorkspaceField({
    standardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.currentApprovals,
    type: FieldMetadataType.NUMBER,
    label: msg`Current Approvals`,
    description: msg`Number of approvals received`,
    icon: 'IconUserCheck',
    defaultValue: 0,
  })
  currentApprovals: number;

  @WorkspaceField({
    standardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.requestReason,
    type: FieldMetadataType.TEXT,
    label: msg`Request Reason`,
    description: msg`Business justification for the change`,
    icon: 'IconNotes',
  })
  @WorkspaceIsNullable()
  requestReason: string | null;

  // ==================== Relations ====================

  @WorkspaceField({
    standardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.requestedBy,
    type: FieldMetadataType.UUID,
    label: msg`Requested By ID`,
    description: msg`ID of the workspace member who requested the change`,
    icon: 'IconUser',
  })
  requestedById: string;

  @WorkspaceRelation({
    standardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.approvals,
    type: RelationType.ONE_TO_MANY,
    label: msg`Approvals`,
    description: msg`List of approvals for this request`,
    icon: 'IconChecklist',
    inverseSideTarget: () => MktPolicyApprovalWorkspaceEntity,
    inverseSideFieldKey: 'changeRequest',
  })
  @WorkspaceIsNullable()
  approvals: MktPolicyApprovalWorkspaceEntity[] | null;

  @WorkspaceField({
    standardId: MKT_POLICY_CHANGE_REQUEST_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position: number | null;
}
