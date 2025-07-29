import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { VARIANT_ATTRIBUTE_VALUE_STANDARD_FIELD_IDS, VARIANT_ATTRIBUTE_VALUE_TABLE_NAME } from './constants';
import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';

@WorkspaceEntity({
  standardId: VARIANT_ATTRIBUTE_VALUE_STANDARD_FIELD_IDS.id,
  namePlural: `${VARIANT_ATTRIBUTE_VALUE_TABLE_NAME}s`,
  labelSingular: msg`Variant Attribute Value`,
  labelPlural: msg`Variant Attribute Values`,
  description: msg`Gán giá trị thuộc tính cho biến thể sản phẩm`,
  icon: 'IconListDetails',
  labelIdentifierStandardId: VARIANT_ATTRIBUTE_VALUE_STANDARD_FIELD_IDS.name,
})
export class MktVariantAttributeValueWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: VARIANT_ATTRIBUTE_VALUE_STANDARD_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Tên gán giá trị thuộc tính cho biến thể`,
    icon: 'IconAbc',
  })
  name: string;

  @WorkspaceField({
    standardId: VARIANT_ATTRIBUTE_VALUE_STANDARD_FIELD_IDS.variantId,
    type: FieldMetadataType.UUID,
    label: msg`Variant`,
    description: msg`ID của biến thể sản phẩm`,
    icon: 'IconList',
  })
  variantId: string;

  @WorkspaceField({
    standardId: VARIANT_ATTRIBUTE_VALUE_STANDARD_FIELD_IDS.attributeValueId,
    type: FieldMetadataType.UUID,
    label: msg`Attribute Value`,
    description: msg`ID của giá trị thuộc tính`,
    icon: 'IconList',
  })
  attributeValueId: string;

  @WorkspaceField({
    standardId: VARIANT_ATTRIBUTE_VALUE_STANDARD_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created By`,
    description: msg`Người tạo`,
    icon: 'IconUserCircle',
  })
  createdBy: ActorMetadata;
}
