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
import { MKT_DASHBOARD_LAYOUT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_DASHBOARD_LAYOUT_TYPE_OPTIONS } from 'src/mkt-core/mkt-dashboard/constants/dashboard-options';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktDashboardLayout,
  namePlural: 'mktDashboardLayouts',
  labelSingular: msg`Dashboard Layout`,
  labelPlural: msg`Dashboard Layouts`,
  description: msg`Personal or role-based dashboard layout configuration`,
  icon: 'IconLayout',
})
export class MktDashboardLayoutWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Layout Name`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.layoutType,
    type: FieldMetadataType.SELECT,
    label: msg`Layout Type`,
    icon: 'IconCategory',
    options: MKT_DASHBOARD_LAYOUT_TYPE_OPTIONS,
    defaultValue: "'PERSONAL'",
  })
  layoutType: string;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.widgetOrder,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Widget Order`,
    description: msg`Ordered widget positions and visibility`,
    icon: 'IconLayoutGrid',
  })
  widgetOrder: object;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.globalFilters,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Global Filters`,
    icon: 'IconFilter',
  })
  @WorkspaceIsNullable()
  globalFilters?: object;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.isDefault,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Default`,
    icon: 'IconStar',
  })
  isDefault: boolean;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    icon: 'IconToggleRight',
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
  })
  createdBy: ActorMetadata;

  @WorkspaceRelation({
    standardId: MKT_DASHBOARD_LAYOUT_FIELD_IDS.owner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Owner`,
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'dashboardLayouts',
  })
  @WorkspaceIsNullable()
  owner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('owner')
  ownerId: string | null;
}
