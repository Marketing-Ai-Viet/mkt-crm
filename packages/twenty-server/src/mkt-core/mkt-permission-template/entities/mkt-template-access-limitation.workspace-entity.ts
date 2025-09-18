import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { MKT_TEMPLATE_ACCESS_LIMITATION_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import {
  ACCESS_LIMITATION_TYPE_OPTIONS,
  LIMITATION_SEVERITY_OPTIONS,
} from 'src/mkt-core/mkt-permission-template/constants/permission-template-options.constants';

import { MktPermissionTemplateWorkspaceEntity } from './mkt-permission-template.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktTemplateAccessLimitation,
  namePlural: 'mktTemplateAccessLimitations',
  labelSingular: msg`Template Access Limitation`,
  labelPlural: msg`Template Access Limitations`,
  description: msg`Access limitations for templates`,
  icon: 'IconShieldLock',
  shortcut: 'TAL',
})
export class MktTemplateAccessLimitationWorkspaceEntity extends BaseWorkspaceEntity {
  // Relationship
  @WorkspaceRelation({
    standardId: MKT_TEMPLATE_ACCESS_LIMITATION_FIELD_IDS.template,
    type: RelationType.MANY_TO_ONE,
    label: msg`Permission Template`,
    description: msg`Template this limitation belongs to`,
    icon: 'IconShield',
    inverseSideTarget: () => MktPermissionTemplateWorkspaceEntity,
    inverseSideFieldKey: 'accessLimitations',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  template: Relation<MktPermissionTemplateWorkspaceEntity>;

  @WorkspaceJoinColumn('template')
  templateId: string;

  // Limitation configuration
  @WorkspaceField({
    standardId: MKT_TEMPLATE_ACCESS_LIMITATION_FIELD_IDS.limitationType,
    type: FieldMetadataType.SELECT,
    label: msg`Limitation Type`,
    description: msg`Category of limitation`,
    icon: 'IconCategory',
    options: ACCESS_LIMITATION_TYPE_OPTIONS,
  })
  limitationType: string;

  @WorkspaceField({
    standardId: MKT_TEMPLATE_ACCESS_LIMITATION_FIELD_IDS.limitationKey,
    type: FieldMetadataType.TEXT,
    label: msg`Limitation Key`,
    description: msg`Specific limitation identifier`,
    icon: 'IconKey',
  })
  limitationKey: string; // 'working_hours', 'session_timeout', etc.

  @WorkspaceField({
    standardId: MKT_TEMPLATE_ACCESS_LIMITATION_FIELD_IDS.limitationValue,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Limitation Value`,
    description: msg`JSON configuration for the limitation`,
    icon: 'IconSettings',
  })
  limitationValue: object; // Limitation-specific config

  @WorkspaceField({
    standardId: MKT_TEMPLATE_ACCESS_LIMITATION_FIELD_IDS.isEnforced,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Enforced`,
    description: msg`Whether limitation is currently enforced`,
    icon: 'IconShieldCheck',
    defaultValue: true,
  })
  isEnforced: boolean; // Can be temporarily disabled

  @WorkspaceField({
    standardId: MKT_TEMPLATE_ACCESS_LIMITATION_FIELD_IDS.severity,
    type: FieldMetadataType.SELECT,
    label: msg`Severity`,
    description: msg`Severity level of limitation`,
    icon: 'IconAlertTriangle',
    options: LIMITATION_SEVERITY_OPTIONS,
  })
  severity: string;

  @WorkspaceField({
    standardId: MKT_TEMPLATE_ACCESS_LIMITATION_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether limitation is active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;
}
