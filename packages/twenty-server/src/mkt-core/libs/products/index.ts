import {
    MktProductVariantWorkspaceEntity,
    prefillProductVariants,
    productVariantsAllView,
    SeedVariantModuleCommand,
    PRODUCT_VARIANT_SEEDS_CONSTANT
} from './variant';

import { 
    prefillProducts, 
    productsAllView, 
    MktProductWorkspaceEntity,
    SeedProductModuleCommand,
    PRODUCT_SEEDS_CONSTANT
} from './product';

import { 
    MktProductAttributeWorkspaceEntity,
    prefillProductAttributes,
    PRODUCT_ATTRIBUTE_SEEDS_CONSTANT,
    productAttributesAllView,
    SeedAttributeModuleCommand
} from './attribute';

import { 
    MktAttributeValueWorkspaceEntity,
    prefillAttributeValues,
    attributeValuesAllView,
    SeedAttributeValueModuleCommand,
    ATTRIBUTE_VALUE_SEEDS_CONSTANT
} from './value';

import {
    MktVariantAttributeValueWorkspaceEntity,
    prefillVariantAttributeValues,
    variantAttributeValuesAllView,
    SeedVariantAttributeValueModuleCommand,
    VARIANT_ATTRIBUTE_VALUE_SEEDS_CONSTANT
} from './variant_attribute_value';

export const PRODUCT_COMMANDS = [
    SeedProductModuleCommand,
    SeedAttributeModuleCommand,
    SeedVariantModuleCommand,
    SeedAttributeValueModuleCommand,
    SeedVariantAttributeValueModuleCommand
];

export const PRODUCT_VIEWS = [
    productsAllView,
    productVariantsAllView,
    productAttributesAllView,
    attributeValuesAllView,
    variantAttributeValuesAllView
];

export const PRODUCT_ENTITIES = [
    MktProductWorkspaceEntity,
    MktProductVariantWorkspaceEntity,
    MktProductAttributeWorkspaceEntity,
    MktAttributeValueWorkspaceEntity,
    MktVariantAttributeValueWorkspaceEntity
];

export const PRODUCT_PREFILLS = [
    prefillProducts,
    prefillProductVariants,
    prefillProductAttributes,
    prefillAttributeValues,
    prefillVariantAttributeValues
];

export const PRODUCT_SEEDS = [
    PRODUCT_SEEDS_CONSTANT,
    PRODUCT_ATTRIBUTE_SEEDS_CONSTANT,
    PRODUCT_VARIANT_SEEDS_CONSTANT,
    ATTRIBUTE_VALUE_SEEDS_CONSTANT,
    VARIANT_ATTRIBUTE_VALUE_SEEDS_CONSTANT
];
