import { msg } from '@lingui/core/macro';
import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { FieldMetadataType } from 'twenty-shared/types';

import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';
import { LICENSE_STATUS_HISTORY_STANDARD_FIELD_IDS } from 'src/mkt-core/common/constants/custom-field-ids';
import { CUSTOM_OBJECT_IDS } from 'src/mkt-core/common/constants/custom-object-ids';
import { LicenseWorkspaceEntity } from './license.workspace-entity';
export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@WorkspaceEntity({
  standardId: CUSTOM_OBJECT_IDS.licenseStatusHistory,
  namePlural: 'licenseStatusHistories',
  labelSingular: msg`License status history`,
  labelPlural: msg`License status histories`,
  description: msg`History of license status changes`,
  icon: 'IconTimeline',
  shortcut: 'L',
  labelIdentifierStandardId: LICENSE_STATUS_HISTORY_STANDARD_FIELD_IDS.status,
})
export class LicenseStatusHistoryWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: LICENSE_STATUS_HISTORY_STANDARD_FIELD_IDS.status,
    type: FieldMetadataType.TEXT,
    label: msg`Status`,
    description: msg`The status of the license`,
  })
  status: LicenseStatus;

  @WorkspaceField({
    standardId: LICENSE_STATUS_HISTORY_STANDARD_FIELD_IDS.changedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Changed At`,
    description: msg`The date when the status changed`,
  })
  changedAt: Date;

  @WorkspaceField({
    standardId: LICENSE_STATUS_HISTORY_STANDARD_FIELD_IDS.type,
    type: FieldMetadataType.TEXT,
    label: msg`Type`,
    description: msg`View type`,
    defaultValue: "'table'",
  })
  type: string;

  @WorkspaceField({
    standardId: LICENSE_STATUS_HISTORY_STANDARD_FIELD_IDS.changedBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Changed by`,
    description: msg`The user who changed the status`,
  })
  changedBy: ActorMetadata;

  @WorkspaceField({
    standardId: LICENSE_STATUS_HISTORY_STANDARD_FIELD_IDS.note,
    type: FieldMetadataType.TEXT,
    label: msg`Note`,
    description: msg`Optional note about the status change`,
  })
  @WorkspaceIsNullable()
  note?: string;

  @WorkspaceRelation({
    standardId: LICENSE_STATUS_HISTORY_STANDARD_FIELD_IDS.license,
    type: RelationType.MANY_TO_ONE,
    label: msg`License`,
    description: msg`The license this history belongs to`,
    icon: 'IconKey',
    inverseSideTarget: () => LicenseWorkspaceEntity,
    inverseSideFieldKey: 'statusHistories',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceJoinColumn('license')
  license: Relation<LicenseWorkspaceEntity>;
}
