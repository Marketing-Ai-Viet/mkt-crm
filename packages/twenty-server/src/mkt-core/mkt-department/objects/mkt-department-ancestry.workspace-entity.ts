import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIndex } from 'src/engine/twenty-orm/decorators/workspace-index.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_DEPARTMENT_ANCESTRY_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

import { MktDepartmentWorkspaceEntity } from './mkt-department.workspace-entity';

/**
 * Entity name for mktDepartmentAncestry - used in GraphQL operations and hooks
 * Format: 'mkt{EntityName}' (camelCase)
 * Note: namePlural uses irregular plural 'Ancestries' instead of 'Ancestrys'
 */
export const MKT_DEPARTMENT_ANCESTRY_ENTITY_NAME = 'mktDepartmentAncestry';

/**
 * MktDepartmentAncestryWorkspaceEntity
 *
 * Materialized view of department ancestry for RBAC hierarchy checks.
 * Pre-computed ancestor relationships for efficient tree traversal.
 *
 * Features:
 * - Stores all ancestor-descendant pairs
 * - Distance field for hierarchy depth
 * - computedAt timestamp for staleness detection
 * - Event-driven refresh on hierarchy changes
 *
 * Usage:
 * - Fast O(1) lookup for "is dept A an ancestor of dept B?"
 * - Get all ancestors with distances in single query
 * - Check ancestry staleness via computedAt
 *
 * Refresh triggers:
 * - department.created event
 * - department.hierarchy.changed event
 * - department.deleted event
 *
 * Cache contract:
 * - Redis key: rbac:dept:ancestors:{deptId}
 * - TTL: 1 hour
 * - Fallback: Query this table on cache miss
 * - SLA: Data should not be stale > 5 min
 */
@WorkspaceIndex(['departmentId'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['ancestorId'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['departmentId', 'ancestorId'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDepartmentAncestry,
  namePlural: 'mktDepartmentAncestries',
  labelSingular: msg`Department Ancestry`,
  labelPlural: msg`Department Ancestries`,
  description: msg`Materialized department ancestry for RBAC hierarchy checks`,
  icon: 'IconHierarchy',
  shortcut: 'DA',
  labelIdentifierStandardId: MKT_DEPARTMENT_ANCESTRY_FIELD_IDS.departmentId,
})
export class MktDepartmentAncestryWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_DEPARTMENT_ANCESTRY_FIELD_IDS.departmentId,
    type: FieldMetadataType.UUID,
    label: msg`Department ID`,
    description: msg`ID of the descendant department`,
    icon: 'IconBuilding',
  })
  departmentId: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_ANCESTRY_FIELD_IDS.ancestorId,
    type: FieldMetadataType.UUID,
    label: msg`Ancestor ID`,
    description: msg`ID of the ancestor department`,
    icon: 'IconBuildingCommunity',
  })
  ancestorId: string;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_ANCESTRY_FIELD_IDS.distance,
    type: FieldMetadataType.NUMBER,
    label: msg`Distance`,
    description: msg`Number of levels between descendant and ancestor (1 = parent, 2 = grandparent, etc.)`,
    icon: 'IconRuler',
    defaultValue: 1,
  })
  distance: number;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_ANCESTRY_FIELD_IDS.computedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Computed At`,
    description: msg`When this ancestry record was computed (for staleness detection)`,
    icon: 'IconClock',
  })
  computedAt: Date;

  // ==================== Relations ====================

  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_ANCESTRY_FIELD_IDS.department,
    type: RelationType.MANY_TO_ONE,
    label: msg`Department`,
    description: msg`The descendant department`,
    icon: 'IconBuilding',
    inverseSideTarget: () => MktDepartmentWorkspaceEntity,
    inverseSideFieldKey: 'ancestryRecordsAsDescendant',
  })
  @WorkspaceIsNullable()
  department: Relation<MktDepartmentWorkspaceEntity> | null;

  @WorkspaceJoinColumn('department')
  departmentJoinId: string | null;

  @WorkspaceRelation({
    standardId: MKT_DEPARTMENT_ANCESTRY_FIELD_IDS.ancestor,
    type: RelationType.MANY_TO_ONE,
    label: msg`Ancestor`,
    description: msg`The ancestor department`,
    icon: 'IconBuildingCommunity',
    inverseSideTarget: () => MktDepartmentWorkspaceEntity,
    inverseSideFieldKey: 'ancestryRecordsAsAncestor',
  })
  @WorkspaceIsNullable()
  ancestor: Relation<MktDepartmentWorkspaceEntity> | null;

  @WorkspaceJoinColumn('ancestor')
  ancestorJoinId: string | null;

  @WorkspaceField({
    standardId: MKT_DEPARTMENT_ANCESTRY_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconList',
  })
  @WorkspaceIsNullable()
  position: number | null;
}
