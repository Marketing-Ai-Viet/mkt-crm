import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';

import { PRODUCT_ATTRIBUTE_STANDARD_FIELD_IDS, ATTRIBUTE_TABLE_NAME } from './constants';
import {ActorMetadata} from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';

@WorkspaceEntity({
  standardId: PRODUCT_ATTRIBUTE_STANDARD_FIELD_IDS.id,
  namePlural: `${ATTRIBUTE_TABLE_NAME}s`,
  labelSingular: msg`Product Attribute`,
  labelPlural: msg`Product Attributes`,
  description: msg`Gán thuộc tính vào sản phẩm`,
  icon: 'IconTag',
  labelIdentifierStandardId: PRODUCT_ATTRIBUTE_STANDARD_FIELD_IDS.name,
})
export class MktProductAttributeWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: PRODUCT_ATTRIBUTE_STANDARD_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Tên thuộc tính hiển thị`,
    icon: 'IconTag',
  })
  name: string;
  @WorkspaceField({
    standardId: PRODUCT_ATTRIBUTE_STANDARD_FIELD_IDS.productId,
    type: FieldMetadataType.UUID,
    label: msg`Product`,
    description: msg`ID của sản phẩm`,
    icon: 'IconBox',
  })
  productId: string;

  @WorkspaceField({
    standardId: PRODUCT_ATTRIBUTE_STANDARD_FIELD_IDS.displayOrder,
    type: FieldMetadataType.NUMBER,
    label: msg`Display Order`,
    description: msg`Thứ tự hiển thị`,
    icon: 'IconSortAscending',
  })
  @WorkspaceIsNullable()
  displayOrder?: number;

  @WorkspaceField({
    standardId: PRODUCT_ATTRIBUTE_STANDARD_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;
}
