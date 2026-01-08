import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';

// ============================================
// ENUMS
// ============================================

export enum MktProductStatusFilter {
  ACTIVE = 'active',
  BETA = 'beta',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
}

registerEnumType(MktProductStatusFilter, {
  name: 'MktProductStatusFilter',
  description: 'Product status filter values',
});

export enum MktSupportedLanguageInput {
  VI = 'vi',
  EN = 'en',
  KO = 'ko',
}

registerEnumType(MktSupportedLanguageInput, {
  name: 'MktSupportedLanguageInput',
  description: 'Supported language input values',
});

export enum MktProductSortBy {
  SORT_ORDER = 'sortOrder',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  CODE = 'code',
}

registerEnumType(MktProductSortBy, {
  name: 'MktProductSortBy',
  description: 'Product sort by values',
});

export enum MktSortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(MktSortOrder, {
  name: 'MktSortOrder',
  description: 'Sort order values',
});

// ============================================
// INPUT TYPES
// ============================================

@InputType()
export class MktDigitalProductQueryInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit?: number;

  @Field(() => MktProductStatusFilter, { nullable: true })
  status?: MktProductStatusFilter;

  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => MktSupportedLanguageInput, { nullable: true })
  lang?: MktSupportedLanguageInput;

  @Field(() => MktProductSortBy, { nullable: true })
  sortBy?: MktProductSortBy;

  @Field(() => MktSortOrder, { nullable: true })
  sortOrder?: MktSortOrder;
}

@InputType()
export class MktDigitalPackageQueryInput {
  @Field(() => String, { nullable: true })
  productId?: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;
}

@InputType()
export class MktDigitalSinglePackageInput {
  @Field(() => String, { description: 'Package ID to retrieve' })
  packageId: string;

  @Field(() => String, {
    nullable: true,
    description: 'Product ID for cache efficiency (optional)',
  })
  productId?: string;
}
