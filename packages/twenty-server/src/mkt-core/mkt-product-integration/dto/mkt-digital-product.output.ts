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
  licenseType: string;

  @Field(() => String)
  packageCode: string;

  @Field(() => String)
  packageName: string;

  @Field(() => String, { nullable: true })
  packageDescription?: string;

  @Field(() => String, {
    description: 'Package type: subscription, perpetual, trial, addon',
  })
  packageType: string;

  @Field(() => String, { description: 'Currency: VND, USD, EUR' })
  currency: string;

  @Field(() => String, {
    description:
      'Billing cycle: monthly, quarterly, yearly, one_time, lifetime',
  })
  billingCycle: string;

  @Field(() => Int, { nullable: true, description: 'Duration in days' })
  durationDays?: number;

  @Field(() => Boolean)
  isActive: boolean;

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
  productName: string;

  @Field(() => String, { nullable: true })
  productDescription?: string;

  @Field(() => String, { nullable: true })
  productOverview?: string;

  @Field(() => String)
  code: string;

  @Field(() => String, {
    description: 'Status: active, beta, inactive, deprecated',
  })
  status: string;

  @Field(() => String, { nullable: true })
  version?: string;

  @Field(() => Float, { nullable: true })
  basePrice?: number;

  @Field(() => String, { nullable: true })
  iconUrl?: string;

  @Field(() => String, { nullable: true })
  bannerUrl?: string;

  @Field(() => [String], { nullable: true })
  gallery?: string[];

  @Field(() => Int)
  sortOrder: number;

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
