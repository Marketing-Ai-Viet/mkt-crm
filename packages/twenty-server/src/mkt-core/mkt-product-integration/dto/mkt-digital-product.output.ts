import {
  Field,
  Float,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

import { MKT_PRODUCT_TYPE } from 'src/mkt-core/mkt-product-integration/constants';

// Register enum for GraphQL
registerEnumType(MKT_PRODUCT_TYPE, {
  name: 'MktProductType',
  description: 'Product type values',
});

// ============================================
// MULTI-LANGUAGE FIELD
// ============================================

@ObjectType({ description: 'Multi-language field with vi, en, ko support' })
export class MktMultiLangFieldDto {
  @Field(() => String)
  vi: string;

  @Field(() => String)
  en: string;

  @Field(() => String)
  ko: string;
}

// ============================================
// PRODUCT PACKAGE OUTPUT
// ============================================

@ObjectType({ description: 'Digital product package from MKT Server' })
export class MktDigitalPackageDto {
  @Field(() => String)
  id: string;

  @Field(() => String)
  packageCode: string;

  @Field(() => String)
  packageName: string;

  @Field(() => String, { nullable: true })
  packageDescription?: string;

  // TODO: Change to enum type later
  @Field(() => String, {
    description: 'Package type: subscription, perpetual, trial, addon',
  })
  status: string;

  @Field(() => String, { description: 'Currency: VND, USD, EUR' })
  currency: string;

  // TODO: Change to enum type later
  @Field(() => String, {
    description:
      'Billing cycle: monthly, quarterly, yearly, one_time, lifetime',
  })
  billingPeriod: string;

  @Field(() => Int, { nullable: true, description: 'Duration in days' })
  trialDays: number;

  @Field(() => Float)
  price: number;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field(() => String)
  productId: string;

  @Field(() => String)
  createdAt: string;

  @Field(() => String, { nullable: true })
  updatedAt?: string;
}

// ============================================
// PRODUCT OUTPUT
// ============================================

@ObjectType({ description: 'Digital product from MKT Server' })
export class MktDigitalProductDto {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  code: string;

  @Field(() => String, {
    description: 'Draft, Active, Deprecated, Archived',
  })
  status: string;

  @Field(() => String, { nullable: true })
  version?: string;

  @Field(() => String, { nullable: true })
  iconUrl?: string;

  @Field(() => String, { nullable: true })
  bannerUrl?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field(() => [MktDigitalPackageDto], { nullable: true })
  packages?: MktDigitalPackageDto[];

  @Field(() => String)
  createdAt: string;

  @Field(() => String, { nullable: true })
  updatedAt?: string;
}

// ============================================
// RESPONSE WRAPPERS
// ============================================

@ObjectType({ description: 'Single product response' })
export class MktDigitalProductResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => MktDigitalProductDto, { nullable: true })
  data?: MktDigitalProductDto;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType({ description: 'Single package response' })
export class MktDigitalPackageResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => MktDigitalPackageDto, { nullable: true })
  data?: MktDigitalPackageDto;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType({ description: 'Paginated product list response' })
export class MktDigitalProductListResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => [MktDigitalProductDto])
  data: MktDigitalProductDto[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType({ description: 'Package list response' })
export class MktDigitalPackageListResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => [MktDigitalPackageDto])
  data: MktDigitalPackageDto[];

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}
