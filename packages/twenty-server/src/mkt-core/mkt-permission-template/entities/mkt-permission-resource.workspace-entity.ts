import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { MKT_PERMISSION_RESOURCE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { PERMISSION_RESOURCE_CATEGORY_OPTIONS } from 'src/mkt-core/mkt-permission-template/constants/permission-template-options.constants';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MktTemplateResourcePermissionWorkspaceEntity } from 'src/mkt-core/mkt-permission-template/entities/mkt-template-resource-permission.workspace-entity';
import { MktUserPermissionOverrideWorkspaceEntity } from 'src/mkt-core/mkt-permission-template/entities/mkt-user-permission-override.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPermissionResource,
  namePlural: 'mktPermissionResources',
  labelSingular: msg`Permission Resource`,
  labelPlural: msg`Permission Resources`,
  description: msg`Defines resources that can have permissions applied`,
  icon: 'IconBox',
  shortcut: 'PR',
  labelIdentifierStandardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.resourceName,
})
@WorkspaceIsSearchable()
export class MktPermissionResourceWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.resourceKey,
    type: FieldMetadataType.TEXT,
    label: msg`Resource Key`,
    description: msg`Unique key for resource (CUSTOMERS, ORDERS, PRODUCTS)`,
    icon: 'IconKey',
  })
  resourceKey: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.resourceName,
    type: FieldMetadataType.TEXT,
    label: msg`Resource Name`,
    description: msg`Human-readable name (Customers, Orders, Products)`,
    icon: 'IconTag',
  })
  resourceName: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.resourceCategory,
    type: FieldMetadataType.SELECT,
    label: msg`Resource Category`,
    description: msg`Category for grouping resources`,
    icon: 'IconCategory',
    options: PERMISSION_RESOURCE_CATEGORY_OPTIONS,
  })
  resourceCategory: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Detailed description of the resource`,
    icon: 'IconFileText',
  })
  @WorkspaceIsNullable()
  description?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.isSystemResource,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is System Resource`,
    description: msg`Whether this is a core system resource`,
    icon: 'IconSettings',
    defaultValue: false,
  })
  isSystemResource: boolean;

  @WorkspaceField({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether resource is currently active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.displayOrder,
    type: FieldMetadataType.NUMBER,
    label: msg`Display Order`,
    description: msg`Order for UI display`,
    icon: 'IconArrowsSort',
    defaultValue: 0,
  })
  displayOrder: number;

  // UI metadata
  @WorkspaceField({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.icon,
    type: FieldMetadataType.TEXT,
    label: msg`Icon`,
    description: msg`Icon name for UI display`,
    icon: 'IconPhoto',
  })
  @WorkspaceIsNullable()
  icon?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.colorCode,
    type: FieldMetadataType.TEXT,
    label: msg`Color Code`,
    description: msg`Color code for UI theming`,
    icon: 'IconPalette',
  })
  @WorkspaceIsNullable()
  colorCode?: string;

  @WorkspaceField({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;

  // Relationships
  @WorkspaceRelation({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.templatePermissions,
    type: RelationType.ONE_TO_MANY,
    label: msg`Template Permissions`,
    description: msg`Template permissions that reference this resource`,
    icon: 'IconLock',
    inverseSideTarget: () => MktTemplateResourcePermissionWorkspaceEntity,
    inverseSideFieldKey: 'resource',
  })
  templatePermissions: Relation<MktTemplateResourcePermissionWorkspaceEntity[]>;

  @WorkspaceRelation({
    standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.userOverrides,
    type: RelationType.ONE_TO_MANY,
    label: msg`User Overrides`,
    description: msg`User permission overrides for this resource`,
    icon: 'IconUserX',
    inverseSideTarget: () => MktUserPermissionOverrideWorkspaceEntity,
    inverseSideFieldKey: 'resource',
  })
  userOverrides: Relation<MktUserPermissionOverrideWorkspaceEntity[]>;
}
