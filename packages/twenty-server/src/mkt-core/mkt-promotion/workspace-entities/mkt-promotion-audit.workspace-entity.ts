import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import {
  MKT_PROMOTION_FIELD_IDS,
  MKT_PROMOTION_RELATION_IDS,
  PROMOTION_AUDIT_ACTION,
  PROMOTION_AUDIT_ACTION_OPTIONS,
  PromotionAuditAction,
} from 'src/mkt-core/mkt-promotion/constants';

import { MktPromotionWorkspaceEntity } from './mkt-promotion.workspace-entity';

/**
 * MktPromotionAuditWorkspaceEntity
 *
 * Audit trail for promotion changes:
 * - Action type (CREATE, UPDATE, ACTIVATE, PAUSE, CANCEL, EXPIRE)
 * - Previous and new values
 * - Who made the change
 * - When the change occurred
 */
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPromotionAudit,
  namePlural: 'mktPromotionAudits',
  labelSingular: msg`Promotion Audit`,
  labelPlural: msg`Promotion Audits`,
  description: msg`Promotion audit trail record`,
  icon: 'IconFileText',
  shortcut: 'PA',
})
export class MktPromotionAuditWorkspaceEntity extends BaseWorkspaceEntity {
  // ============================================
  // AUDIT INFORMATION
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionAudit.action,
    type: FieldMetadataType.SELECT,
    label: msg`Action`,
    description: msg`Action type`,
    icon: 'IconActivity',
    options: PROMOTION_AUDIT_ACTION_OPTIONS,
    defaultValue: `'${PROMOTION_AUDIT_ACTION.UPDATE}'`,
  })
  action: PromotionAuditAction;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionAudit.previousValues,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Previous Values`,
    description: msg`Previous field values before change`,
    icon: 'IconHistory',
  })
  @WorkspaceIsNullable()
  previousValues: JSON | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionAudit.newValues,
    type: FieldMetadataType.RAW_JSON,
    label: msg`New Values`,
    description: msg`New field values after change`,
    icon: 'IconRefresh',
  })
  @WorkspaceIsNullable()
  newValues: JSON | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionAudit.changedBy,
    type: FieldMetadataType.TEXT,
    label: msg`Changed By`,
    description: msg`User who made the change`,
    icon: 'IconUser',
  })
  @WorkspaceIsNullable()
  changedBy: string | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionAudit.changedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Changed At`,
    description: msg`When the change occurred`,
    icon: 'IconClock',
  })
  changedAt: Date;

  // ============================================
  // RELATIONS
  // ============================================

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktAuditToPromotion,
    type: RelationType.MANY_TO_ONE,
    label: msg`Promotion`,
    description: msg`Promotion being audited`,
    icon: 'IconTag',
    inverseSideTarget: () => MktPromotionWorkspaceEntity,
    inverseSideFieldKey: 'audits',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  promotion: Relation<MktPromotionWorkspaceEntity>;

  @WorkspaceJoinColumn('promotion')
  promotionId: string;
}
