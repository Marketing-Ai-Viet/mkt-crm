import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIndex } from 'src/engine/twenty-orm/decorators/workspace-index.decorator';
import { MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import {
  SOURCE_TYPE_OPTIONS,
  SOURCE_SUBTYPE_OPTIONS,
} from 'src/mkt-core/mkt-permission-template/constants/permission-template-options.constants';

@WorkspaceIndex(['sourceType', 'sourceSubType'], {
  indexWhereClause: '"deletedAt" IS NULL AND "isActive" = true',
})
@WorkspaceIndex(['isActive'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPermissionPriorityConfig,
  namePlural: 'mktPermissionPriorityConfigs',
  labelSingular: msg`Permission Priority Config`,
  labelPlural: msg`Permission Priority Configs`,
  description: msg`Configuration for dynamic priority resolution in RBAC system`,
  icon: 'IconAdjustments',
  shortcut: 'PPC',
})
export class MktPermissionPriorityConfigWorkspaceEntity extends BaseWorkspaceEntity {
  // Source identification
  @WorkspaceField({
    standardId: MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS.sourceType,
    type: FieldMetadataType.SELECT,
    label: msg`Source Type`,
    description: msg`Type of permission source (TEMPLATE, OVERRIDE, POLICY)`,
    icon: 'IconCategory',
    options: SOURCE_TYPE_OPTIONS,
  })
  sourceType: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS.sourceSubType,
    type: FieldMetadataType.SELECT,
    label: msg`Source Sub Type`,
    description: msg`Specific subtype (EMERGENCY, COMPLIANCE, ROLE_BASED, etc.)`,
    icon: 'IconTag',
    options: SOURCE_SUBTYPE_OPTIONS,
  })
  @WorkspaceIsNullable()
  sourceSubType?: string;

  // Priority configuration
  @WorkspaceField({
    standardId: MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS.basePriority,
    type: FieldMetadataType.NUMBER,
    label: msg`Base Priority`,
    description: msg`Base priority value for this source type`,
    icon: 'IconNumber',
    defaultValue: 100,
  })
  basePriority: number;

  @WorkspaceField({
    standardId: MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS.priorityBoost,
    type: FieldMetadataType.NUMBER,
    label: msg`Priority Boost`,
    description: msg`Additional priority boost to apply`,
    icon: 'IconArrowUp',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  priorityBoost?: number;

  @WorkspaceField({
    standardId: MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS.maxPriority,
    type: FieldMetadataType.NUMBER,
    label: msg`Max Priority`,
    description: msg`Maximum priority cap (optional)`,
    icon: 'IconArrowBarToUp',
  })
  @WorkspaceIsNullable()
  maxPriority?: number;

  @WorkspaceField({
    standardId: MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS.minPriority,
    type: FieldMetadataType.NUMBER,
    label: msg`Min Priority`,
    description: msg`Minimum priority floor (optional)`,
    icon: 'IconArrowBarToDown',
  })
  @WorkspaceIsNullable()
  minPriority?: number;

  // Advanced configuration
  @WorkspaceField({
    standardId: MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS.priorityFormula,
    type: FieldMetadataType.TEXT,
    label: msg`Priority Formula`,
    description: msg`Formula to calculate priority: basePriority + boost * level`,
    icon: 'IconMath',
  })
  @WorkspaceIsNullable()
  priorityFormula?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS.conditions,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Conditions`,
    description: msg`Optional conditions to apply this config`,
    icon: 'IconFilter',
  })
  @WorkspaceIsNullable()
  conditions?: object;

  // Metadata
  @WorkspaceField({
    standardId: MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this configuration is currently active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Detailed description of this priority configuration`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  description?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;
}
