import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

/**
 * Customer output for GraphQL queries
 *
 * Type mapping:
 * - Date fields (Entity: Date) → Output: String (ISO 8601)
 * - Currency fields (VND) → Float
 * - Count/Score fields → Int
 */
@ObjectType()
export class CustomerOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  mktCustomerCode: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  companyName?: string;

  @Field(() => String, { nullable: true })
  taxCode?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String)
  status: string;

  @Field(() => String)
  tier: string;

  @Field(() => String)
  lifecycleStage: string;

  // ============ ANALYTICS - Currency (Float) ============
  @Field(() => Float, {
    nullable: true,
    description: 'Total order value in VND',
  })
  totalOrderValue?: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Customer lifetime value in VND',
  })
  customerLtv?: number;

  // ============ ANALYTICS - Integers ============
  @Field(() => Int, { nullable: true })
  licensesCount?: number;

  @Field(() => Int, { nullable: true })
  totalOrderCount?: number;

  @Field(() => Int, { nullable: true, description: 'Churn risk score (0-100)' })
  churnRiskScore?: number;

  @Field(() => Int, { nullable: true, description: 'Engagement score (0-100)' })
  engagementScore?: number;

  // ============ DATES - ISO 8601 String ============
  @Field(() => String, {
    nullable: true,
    description: 'ISO 8601 date string',
  })
  registrationDate?: string;

  @Field(() => String, {
    nullable: true,
    description: 'ISO 8601 date string',
  })
  lastPurchase?: string;

  @Field(() => String, {
    nullable: true,
    description: 'ISO 8601 date string',
  })
  createdAt?: string;

  @Field(() => String, {
    nullable: true,
    description: 'ISO 8601 date string',
  })
  updatedAt?: string;

  // ============ RELATIONS ============
  @Field(() => String, { nullable: true })
  accountOwnerId?: string;

  @Field(() => String, { nullable: true })
  createdById?: string;
}

/**
 * Customer list with pagination info
 */
@ObjectType()
export class CustomerListOutput {
  @Field(() => [CustomerOutput])
  customers: CustomerOutput[];

  @Field(() => Int)
  totalCount: number;
}

/**
 * Response for createCustomer mutation
 */
@ObjectType()
export class CreateCustomerResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true })
  customerCode?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Response for updateCustomer mutation
 */
@ObjectType()
export class UpdateCustomerResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => [String], { nullable: true })
  updatedFields?: string[];

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Response for deleteCustomer mutation
 */
@ObjectType()
export class DeleteCustomerResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Response for restoreCustomer mutation
 */
@ObjectType()
export class RestoreCustomerResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}
