import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIndex } from 'src/engine/twenty-orm/decorators/workspace-index.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { MKT_POLICY_VERSION_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

/**
 * MktPolicyVersionWorkspaceEntity
 *
 * Tracks policy sync versions for each workspace.
 * Used for cache invalidation and sync coordination.
 *
 * Features:
 * - Version tracking for optimistic locking
 * - Policy hash for change detection
 * - Sync timestamp for audit
 */
@WorkspaceIndex(['version'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPolicyVersion,
  namePlural: 'mktPolicyVersions',
  labelSingular: msg`Policy Version`,
  labelPlural: msg`Policy Versions`,
  description: msg`Tracks RBAC policy sync versions for cache invalidation`,
  icon: 'IconHistory',
  shortcut: 'PV',
  labelIdentifierStandardId: MKT_POLICY_VERSION_FIELD_IDS.version,
})
export class MktPolicyVersionWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_POLICY_VERSION_FIELD_IDS.version,
    type: FieldMetadataType.NUMBER,
    label: msg`Version`,
    description: msg`Policy version number (incremented on each sync)`,
    icon: 'IconVersions',
    defaultValue: 0,
  })
  version: number;

  @WorkspaceField({
    standardId: MKT_POLICY_VERSION_FIELD_IDS.policyHash,
    type: FieldMetadataType.TEXT,
    label: msg`Policy Hash`,
    description: msg`SHA-256 hash of all policies for change detection`,
    icon: 'IconHash',
  })
  @WorkspaceIsNullable()
  policyHash: string | null;

  @WorkspaceField({
    standardId: MKT_POLICY_VERSION_FIELD_IDS.policyCount,
    type: FieldMetadataType.NUMBER,
    label: msg`Policy Count`,
    description: msg`Total number of policies at this version`,
    icon: 'IconNumber',
    defaultValue: 0,
  })
  policyCount: number;

  @WorkspaceField({
    standardId: MKT_POLICY_VERSION_FIELD_IDS.syncedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Synced At`,
    description: msg`Timestamp of last policy sync`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  syncedAt: Date | null;

  @WorkspaceField({
    standardId: MKT_POLICY_VERSION_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position: number | null;
}
