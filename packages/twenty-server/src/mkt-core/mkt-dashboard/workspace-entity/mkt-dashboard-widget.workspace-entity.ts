import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_DASHBOARD_WIDGET_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import {
  MKT_DASHBOARD_WIDGET_TYPE_OPTIONS,
  MKT_DASHBOARD_DATA_SOURCE_OPTIONS,
  MKT_DASHBOARD_PERIOD_OPTIONS,
  MKT_DASHBOARD_VISIBILITY_OPTIONS,
} from 'src/mkt-core/mkt-dashboard/constants/dashboard-options';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

import { MktDashboardSnapshotWorkspaceEntity } from './mkt-dashboard-snapshot.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDashboardWidget,
  namePlural: 'mktDashboardWidgets',
  labelSingular: msg`Dashboard Widget`,
  labelPlural: msg`Dashboard Widgets`,
  description: msg`Configurable dashboard widget for displaying business metrics`,
  icon: 'IconLayoutDashboard',
})
@WorkspaceIsSearchable()
export class MktDashboardWidgetWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.widgetName,
    type: FieldMetadataType.TEXT,
    label: msg`Widget Name`,
    description: msg`Display name of the widget`,
    icon: 'IconTag',
  })
  widgetName: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.widgetCode,
    type: FieldMetadataType.TEXT,
    label: msg`Widget Code`,
    description: msg`Unique code for programmatic reference`,
    icon: 'IconCode',
  })
  widgetCode: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.widgetType,
    type: FieldMetadataType.SELECT,
    label: msg`Widget Type`,
    description: msg`Visual type of the widget`,
    icon: 'IconCategory',
    options: MKT_DASHBOARD_WIDGET_TYPE_OPTIONS,
    defaultValue: "'STAT_CARD'",
  })
  widgetType: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.dataSource,
    type: FieldMetadataType.SELECT,
    label: msg`Data Source`,
    description: msg`Data source for the widget`,
    icon: 'IconDatabase',
    options: MKT_DASHBOARD_DATA_SOURCE_OPTIONS,
    defaultValue: "'COMBINED'",
  })
  dataSource: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.defaultColSpan,
    type: FieldMetadataType.NUMBER,
    label: msg`Default Width (columns)`,
    description: msg`Default number of grid columns this widget occupies (1-12)`,
    icon: 'IconColumns',
  })
  defaultColSpan: number;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.defaultRowSpan,
    type: FieldMetadataType.NUMBER,
    label: msg`Default Height (rows)`,
    description: msg`Default number of grid rows this widget occupies`,
    icon: 'IconRows',
  })
  defaultRowSpan: number;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.defaultPeriod,
    type: FieldMetadataType.SELECT,
    label: msg`Default Period`,
    description: msg`Default time period for data`,
    icon: 'IconCalendar',
    options: MKT_DASHBOARD_PERIOD_OPTIONS,
    defaultValue: "'THIS_MONTH'",
  })
  defaultPeriod: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.filterConfig,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Filter Config`,
    description: msg`Default filter configuration`,
    icon: 'IconFilter',
  })
  @WorkspaceIsNullable()
  filterConfig?: object;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.visibility,
    type: FieldMetadataType.SELECT,
    label: msg`Visibility`,
    description: msg`Who can see this widget`,
    icon: 'IconEye',
    options: MKT_DASHBOARD_VISIBILITY_OPTIONS,
    defaultValue: "'ALL'",
  })
  visibility: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether the widget is active`,
    icon: 'IconToggleRight',
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.isSystemDefault,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is System Default`,
    description: msg`System default widget, cannot be deleted`,
    icon: 'IconShield',
  })
  isSystemDefault: boolean;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.displayOrder,
    type: FieldMetadataType.NUMBER,
    label: msg`Display Order`,
    description: msg`Default order in the dashboard`,
    icon: 'IconSortAscending',
  })
  displayOrder: number;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.cacheTtlSeconds,
    type: FieldMetadataType.NUMBER,
    label: msg`Cache TTL (seconds)`,
    description: msg`Override default cache TTL for this widget`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  cacheTtlSeconds?: number;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.widgetConfig,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Widget Config`,
    description: msg`Extended configuration for rendering`,
    icon: 'IconSettings',
  })
  @WorkspaceIsNullable()
  widgetConfig?: object;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Widget description`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  description?: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: msg`Search Vector`,
    description: msg`Search vector for full-text search`,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: `setweight(to_tsvector('simple', COALESCE("widgetName", '')), 'A') || setweight(to_tsvector('simple', COALESCE("widgetCode", '')), 'B')`,
  })
  @WorkspaceIsNullable()
  searchVector?: string;

  @WorkspaceRelation({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.owner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Owner`,
    description: msg`Owner of this widget`,
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'dashboardWidgets',
  })
  @WorkspaceIsNullable()
  owner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('owner')
  ownerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_DASHBOARD_WIDGET_FIELD_IDS.snapshots,
    type: RelationType.ONE_TO_MANY,
    label: msg`Snapshots`,
    description: msg`Snapshots captured from this widget`,
    icon: 'IconCamera',
    inverseSideTarget: () => MktDashboardSnapshotWorkspaceEntity,
    inverseSideFieldKey: 'widget',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  snapshots: Relation<MktDashboardSnapshotWorkspaceEntity[]>;
}
