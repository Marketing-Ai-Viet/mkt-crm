import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_DASHBOARD_SNAPSHOT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import {
  MKT_DASHBOARD_SNAPSHOT_TYPE_OPTIONS,
  MKT_DASHBOARD_DATA_SOURCE_OPTIONS,
} from 'src/mkt-core/mkt-dashboard/constants/dashboard-options';

import { MktDashboardWidgetWorkspaceEntity } from './mkt-dashboard-widget.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDashboardSnapshot,
  namePlural: 'mktDashboardSnapshots',
  labelSingular: msg`Dashboard Snapshot`,
  labelPlural: msg`Dashboard Snapshots`,
  description: msg`Periodic snapshot of dashboard metrics for trend analysis`,
  icon: 'IconCamera',
})
export class MktDashboardSnapshotWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Snapshot Name`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.snapshotType,
    type: FieldMetadataType.SELECT,
    label: msg`Snapshot Type`,
    icon: 'IconCalendarRepeat',
    options: MKT_DASHBOARD_SNAPSHOT_TYPE_OPTIONS,
    defaultValue: "'DAILY'",
  })
  snapshotType: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.dataSource,
    type: FieldMetadataType.SELECT,
    label: msg`Data Source`,
    icon: 'IconDatabase',
    options: MKT_DASHBOARD_DATA_SOURCE_OPTIONS,
    defaultValue: "'COMBINED'",
  })
  dataSource: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.snapshotAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Snapshot At`,
    icon: 'IconClock',
  })
  snapshotAt: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.periodStart,
    type: FieldMetadataType.DATE,
    label: msg`Period Start`,
    icon: 'IconCalendarEvent',
  })
  @WorkspaceIsNullable()
  periodStart?: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.periodEnd,
    type: FieldMetadataType.DATE,
    label: msg`Period End`,
    icon: 'IconCalendarDue',
  })
  @WorkspaceIsNullable()
  periodEnd?: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.snapshotData,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Snapshot Data`,
    icon: 'IconBraces',
  })
  snapshotData: object;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.comparisonData,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Comparison Data`,
    icon: 'IconArrowsExchange',
  })
  @WorkspaceIsNullable()
  comparisonData?: object;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.checksum,
    type: FieldMetadataType.TEXT,
    label: msg`Checksum`,
    icon: 'IconFingerprint',
  })
  @WorkspaceIsNullable()
  checksum?: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
  })
  createdBy: ActorMetadata;

  @WorkspaceRelation({
    standardId: MKT_DASHBOARD_SNAPSHOT_FIELD_IDS.widget,
    type: RelationType.MANY_TO_ONE,
    label: msg`Widget`,
    icon: 'IconLayoutDashboard',
    inverseSideTarget: () => MktDashboardWidgetWorkspaceEntity,
    inverseSideFieldKey: 'snapshots',
  })
  @WorkspaceIsNullable()
  widget: Relation<MktDashboardWidgetWorkspaceEntity> | null;

  @WorkspaceJoinColumn('widget')
  widgetId: string | null;
}
