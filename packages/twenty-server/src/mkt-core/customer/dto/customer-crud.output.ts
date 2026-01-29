import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

import { CustomerNoteOutput } from 'src/mkt-core/customer/dto/customer-note.dto';
import { PurchasedProductOutput } from 'src/mkt-core/customer/dto/purchase-history.dto';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';

// ============================================
// NESTED OBJECT TYPES
// ============================================

/**
 * Basic workspace member info for relations
 */
@ObjectType({ description: 'Basic workspace member information' })
export class WorkspaceMemberBasicOutput {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => String)
  email: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => String, { nullable: true })
  memberCode?: string;
}

/**
 * Customer output for GraphQL queries
 *
 * Type mapping:
 * - Date fields (Entity: Date) → Output: String (ISO 8601)
 * - Currency fields (VND) → Float
 * - Count/Score fields → Int
 * - JSONB → GraphQLJSON
 */
@ObjectType()
export class CustomerOutput {
  // ============ BASIC INFO ============
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

  @Field(() => String, { nullable: true, description: 'Căn cước công dân' })
  citizenId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Customer type: INDIVIDUAL, BUSINESS, ORGANIZATION',
  })
  type?: string;

  // ============ BUSINESS INFO ============
  @Field(() => String, { nullable: true })
  companyName?: string;

  @Field(() => String, { nullable: true })
  taxCode?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Company size: MICRO, SMALL, MEDIUM, LARGE, ENTERPRISE',
  })
  companySize?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Industry: IT, FINANCE, RETAIL, MANUFACTURING, etc.',
  })
  industry?: string;

  @Field(() => String, { nullable: true, description: 'Contact position' })
  contactPosition?: string;

  @Field(() => String, { nullable: true, description: 'Contact department' })
  contactDepartment?: string;

  // ============ STATUS & TIER ============
  @Field(() => String, { description: 'Status: ACTIVE, INACTIVE, PROSPECTIVE' })
  status: string;

  @Field(() => String, {
    description: 'Tier: BRONZE, SILVER, GOLD, DIAMOND, CHURNED',
  })
  tier: string;

  @Field(() => String, {
    nullable: true,
    description: 'Last tier upgrade date (ISO 8601)',
  })
  lastTierUpgradeAt?: string;

  @Field(() => String, {
    description:
      'Lifecycle stage: PROSPECTIVE, TRIAL, CUSTOMER, LOYAL, CHURNED',
  })
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
  @Field(() => Int, { nullable: true, description: 'Number of licenses' })
  licensesCount?: number;

  @Field(() => Int, { nullable: true, description: 'Total completed orders' })
  totalOrderCount?: number;

  @Field(() => Int, { nullable: true, description: 'Churn risk score (0-100)' })
  churnRiskScore?: number;

  @Field(() => Int, { nullable: true, description: 'Engagement score (0-100)' })
  engagementScore?: number;

  // ============ DATES - ISO 8601 String ============
  @Field(() => String, {
    nullable: true,
    description: 'Registration date (ISO 8601)',
  })
  registrationDate?: string;

  @Field(() => String, {
    nullable: true,
    description: 'First purchase date (ISO 8601)',
  })
  firstPurchase?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Last purchase date (ISO 8601)',
  })
  lastPurchase?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Assigned date (ISO 8601)',
  })
  assignedDate?: string;

  @Field(() => String, { nullable: true, description: 'Assignment reason' })
  assignedReason?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Created at (ISO 8601)',
  })
  createdAt?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Updated at (ISO 8601)',
  })
  updatedAt?: string;

  // ============ RELATIONS - NESTED OBJECTS ============
  @Field(() => WorkspaceMemberBasicOutput, {
    nullable: true,
    description: 'Account owner (sales responsible)',
  })
  accountOwner?: WorkspaceMemberBasicOutput;

  @Field(() => WorkspaceMemberBasicOutput, {
    nullable: true,
    description: 'Support owner (support responsible)',
  })
  supportOwner?: WorkspaceMemberBasicOutput;

  // ============ CREATED BY ============
  @Field(() => String, {
    nullable: true,
    description: 'Created by source: MANUAL, SYSTEM, IMPORT, API',
  })
  createdBySource?: string;

  @Field(() => String, { nullable: true, description: 'Created by name' })
  createdByName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Created by workspace member ID',
  })
  createdByWorkspaceMemberId?: string;

  // ============ LINKED ACCOUNTS ============
  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Linked accounts (MKT, Google, Zalo, etc.)',
  })
  linkedAccounts?: LinkedAccount[];

  // ============ CUSTOMER NOTES ============
  @Field(() => [CustomerNoteOutput], {
    nullable: true,
    description: 'Customer notes and interaction records',
  })
  customerNotes?: CustomerNoteOutput[];

  // ============ PURCHASED PRODUCTS ============
  @Field(() => [PurchasedProductOutput], {
    nullable: true,
    description:
      'List of products purchased by customer (aggregated from COMPLETED/CONFIRMED orders)',
  })
  purchasedProducts?: PurchasedProductOutput[];
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
