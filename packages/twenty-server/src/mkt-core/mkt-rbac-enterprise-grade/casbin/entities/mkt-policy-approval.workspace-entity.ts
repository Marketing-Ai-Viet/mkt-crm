import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIndex } from 'src/engine/twenty-orm/decorators/workspace-index.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_POLICY_APPROVAL_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

import { MktPolicyChangeRequestWorkspaceEntity } from './mkt-policy-change-request.workspace-entity';

/**
 * Approval decision
 */
export const APPROVAL_DECISION = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type ApprovalDecision =
  (typeof APPROVAL_DECISION)[keyof typeof APPROVAL_DECISION];

/**
 * MktPolicyApprovalWorkspaceEntity
 *
 * Records individual approvals for policy change requests.
 * Part of the dual-sign approval workflow for high-risk policies.
 *
 * Features:
 * - Links to change request
 * - Records approver decision (APPROVED/REJECTED)
 * - Captures reason for audit trail
 * - Prevents self-approval (enforced by service)
 *
 * Audit: Stored for 7 years for SOC2 compliance.
 */
@WorkspaceIndex(['changeRequestId'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['approverId'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPolicyApproval,
  namePlural: 'mktPolicyApprovals',
  labelSingular: msg`Policy Approval`,
  labelPlural: msg`Policy Approvals`,
  description: msg`Approval records for policy change requests`,
  icon: 'IconUserCheck',
  shortcut: 'PA',
  labelIdentifierStandardId: MKT_POLICY_APPROVAL_FIELD_IDS.decision,
})
export class MktPolicyApprovalWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_POLICY_APPROVAL_FIELD_IDS.decision,
    type: FieldMetadataType.SELECT,
    label: msg`Decision`,
    description: msg`Approval decision: APPROVED or REJECTED`,
    icon: 'IconThumbUp',
    options: [
      { value: 'APPROVED', label: 'Approved', color: 'green', position: 0 },
      { value: 'REJECTED', label: 'Rejected', color: 'red', position: 1 },
    ],
  })
  decision: ApprovalDecision;

  @WorkspaceField({
    standardId: MKT_POLICY_APPROVAL_FIELD_IDS.reason,
    type: FieldMetadataType.TEXT,
    label: msg`Reason`,
    description: msg`Reason for the approval or rejection`,
    icon: 'IconNotes',
  })
  @WorkspaceIsNullable()
  reason: string | null;

  // ==================== Relations ====================

  @WorkspaceRelation({
    standardId: MKT_POLICY_APPROVAL_FIELD_IDS.changeRequest,
    type: RelationType.MANY_TO_ONE,
    label: msg`Change Request`,
    description: msg`The change request this approval belongs to`,
    icon: 'IconFileCheck',
    inverseSideTarget: () => MktPolicyChangeRequestWorkspaceEntity,
    inverseSideFieldKey: 'approvals',
  })
  @WorkspaceIsNullable()
  changeRequest: MktPolicyChangeRequestWorkspaceEntity | null;

  @WorkspaceJoinColumn('changeRequest')
  changeRequestId: string | null;

  @WorkspaceField({
    standardId: MKT_POLICY_APPROVAL_FIELD_IDS.approver,
    type: FieldMetadataType.UUID,
    label: msg`Approver ID`,
    description: msg`ID of the workspace member who approved/rejected`,
    icon: 'IconUser',
  })
  approverId: string;

  @WorkspaceField({
    standardId: MKT_POLICY_APPROVAL_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position: number | null;
}
