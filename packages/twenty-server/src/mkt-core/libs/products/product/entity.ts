import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { PRODUCT_STANDARD_FIELD_IDS, TABLE_NAME } from './constants';


@WorkspaceEntity({
  standardId: PRODUCT_STANDARD_FIELD_IDS.id,
  namePlural: `${TABLE_NAME}s`,
  labelSingular: msg`Product`,
  labelPlural: msg`Products`,
  description: msg`Product entity for catalog`,
  icon: 'IconBox',
  labelIdentifierStandardId: PRODUCT_STANDARD_FIELD_IDS.productName,
})
export class MktProductWorkspaceEntity extends BaseWorkspaceEntity {

  @WorkspaceField({
    standardId: PRODUCT_STANDARD_FIELD_IDS.productCode,
    type: FieldMetadataType.TEXT,
    label: msg`Product Code`,
    description: msg`Product code`,
    icon: 'IconBarcode',
  })
  productCode: string;

  @WorkspaceField({
    standardId: PRODUCT_STANDARD_FIELD_IDS.productName,
    type: FieldMetadataType.TEXT,
    label: msg`Product Name`,
    description: msg`Product name`,
    icon: 'IconBox',
  })
  productName: string;

  @WorkspaceField({
    standardId: PRODUCT_STANDARD_FIELD_IDS.productCategory,
    type: FieldMetadataType.TEXT,
    label: msg`Product Category`,
    description: msg`Product category`,
    icon: 'IconCategory',
  })
  @WorkspaceIsNullable()
  productCategory?: string;

  @WorkspaceField({
    standardId: PRODUCT_STANDARD_FIELD_IDS.basePrice,
    type: FieldMetadataType.NUMBER,
    label: msg`Base Price`,
    description: msg`Base price`,
    icon: 'IconCurrencyDollar',
  })
  basePrice: number;

  @WorkspaceField({
    standardId: PRODUCT_STANDARD_FIELD_IDS.licenseDurationMonths,
    type: FieldMetadataType.NUMBER,
    label: msg`License Duration (months)`,
    description: msg`License duration in months`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  licenseDurationMonths?: number;

  @WorkspaceField({
    standardId: PRODUCT_STANDARD_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Is product active?`,
    icon: 'IconCheck',
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: PRODUCT_STANDARD_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;
}
