import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { Relation } from 'typeorm';
import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { FieldTypeAndNameMetadata, getTsVectorColumnExpressionFromFields } from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';

import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';

import { MktProductWorkspaceEntity } from 'src/mkt-core/product/standard-objects/mkt-product.workspace-entity';
import { MKT_OBJECT_IDS } from 'src/mkt-core/dev-seeder/constants/mkt-object-ids';
import { MKT_VARIANT_FIELD_IDS } from 'src/mkt-core/dev-seeder/constants/mkt-field-ids';

const TABLE_ATTRIBUTE_NAME = 'mktVariant';
const NAME_FIELD_NAME = 'name';
const DESCRIPTION_FIELD_NAME = 'description';
const SKU_FIELD_NAME = 'sku';

export const SEARCH_FIELDS_FOR_MKT_VARIANT: FieldTypeAndNameMetadata[] = [
  { name: NAME_FIELD_NAME, type: FieldMetadataType.TEXT },
  { name: DESCRIPTION_FIELD_NAME, type: FieldMetadataType.TEXT },
  { name: SKU_FIELD_NAME, type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktVariant,
  namePlural: `${TABLE_ATTRIBUTE_NAME}s`,
  labelSingular: msg`Product Variant`,
  labelPlural: msg`Product Variants`,
  description: msg`Product specific variations`,
  icon: 'IconBoxMultiple',
  labelIdentifierStandardId: MKT_VARIANT_FIELD_IDS.name,
})

@WorkspaceIsSearchable()    
export class MktVariantWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_VARIANT_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Name of the variant`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_VARIANT_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Description of the variant`,
    icon: 'IconDescription',
  })    
  @WorkspaceIsNullable()
  description: string;

  @WorkspaceField({
    standardId: MKT_VARIANT_FIELD_IDS.sku,
    type: FieldMetadataType.TEXT,
    label: msg`SKU`,
    description: msg`Stock Keeping Unit - variant identifier`,
    icon: 'IconBarcode',
  })
  sku: string;

  @WorkspaceField({
    standardId: MKT_VARIANT_FIELD_IDS.price,
    type: FieldMetadataType.NUMBER,
    label: msg`Price`,
    description: msg`Price of the variant`,
    icon: 'IconCurrencyDollar',
  })
  @WorkspaceIsNullable()
  price?: number;

  @WorkspaceField({
    standardId: MKT_VARIANT_FIELD_IDS.inStock,
    type: FieldMetadataType.NUMBER,
    label: msg`Stock`,
    description: msg`Stock of the variant`,
    icon: 'IconStack',
  })
  @WorkspaceIsNullable()
  inStock?: number;

  @WorkspaceField({
    standardId: MKT_VARIANT_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Is the variant active?`,
    icon: 'IconCheck',
  })
  @WorkspaceIsNullable()
  isActive?: boolean;

  @WorkspaceField({
    standardId: MKT_VARIANT_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in the list`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_VARIANT_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created By`,
    description: msg`The creator of the variant`,
    icon: 'IconCreativeCommonsSa',
  })
  @WorkspaceIsNullable()
  createdBy: ActorMetadata;

    // Relations
  @WorkspaceRelation({
    standardId: MKT_VARIANT_FIELD_IDS.mktProduct,
    type: RelationType.MANY_TO_ONE,
    label: msg`Product`,
    description: msg`Parent product`,
    icon: 'IconBox',
    inverseSideTarget: () => MktProductWorkspaceEntity,
    inverseSideFieldKey: 'mktVariants',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktProduct: Relation<MktProductWorkspaceEntity> | null;

  @WorkspaceJoinColumn('mktProduct')
  mktProductId: string | null;
  
//   @WorkspaceRelation({
//     standardId: MKT_OBJECT_IDS.variantAttributeValues,
//     type: RelationType.ONE_TO_MANY,
//     label: msg`Variant Attribute Values`,
//     description: msg`Các giá trị thuộc tính của biến thể này`,
//     icon: 'IconListDetails',
//     inverseSideTarget: () => MktVariantAttributeValueWorkspaceEntity,
//     inverseSideFieldKey: 'variant',
//     onDelete: RelationOnDeleteAction.SET_NULL,
//   })
//   @WorkspaceIsNullable()
//   variantAttributeValues: Relation<MktVariantAttributeValueWorkspaceEntity[]>;

@WorkspaceField({
    standardId: MKT_VARIANT_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconUser',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(
      SEARCH_FIELDS_FOR_MKT_VARIANT,
    ),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
