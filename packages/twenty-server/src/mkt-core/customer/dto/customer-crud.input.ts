import { Field, InputType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

import { CreateInitialNoteInput } from 'src/mkt-core/customer/dto/customer-note.dto';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';

/**
 * Input for creating a new customer
 *
 * Fields mapping to mktCustomer table columns
 */
@InputType()
export class CreateCustomerInput {
  // ============ BASIC INFO ============
  @Field(() => String, { description: 'Customer name (required)' })
  name: string;

  @Field(() => String, { nullable: true, description: 'Primary email' })
  email?: string;

  @Field(() => String, { nullable: true, description: 'Phone number' })
  phone?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Căn cước công dân (CCCD) - 9 hoặc 12 số',
  })
  citizenId?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Customer type: INDIVIDUAL, BUSINESS, ORGANIZATION (default: INDIVIDUAL)',
  })
  type?: string;

  // ============ BUSINESS INFO ============
  @Field(() => String, { nullable: true, description: 'Company name' })
  companyName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Tax code (10 or 13 digits)',
  })
  taxCode?: string;

  @Field(() => String, { nullable: true, description: 'Address' })
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
  @Field(() => String, {
    nullable: true,
    description: 'Status: ACTIVE, INACTIVE, PROSPECTIVE (default: ACTIVE)',
  })
  status?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Tier: BRONZE, SILVER, GOLD, DIAMOND (default: BRONZE)',
  })
  tier?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Lifecycle stage: PROSPECTIVE, TRIAL, CUSTOMER, LOYAL (default: PROSPECTIVE)',
  })
  lifecycleStage?: string;

  // ============ RELATIONS ============
  @Field(() => String, {
    nullable: true,
    description: 'Account owner ID (workspace member)',
  })
  accountOwnerId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Support owner ID (workspace member)',
  })
  supportOwnerId?: string;

  // ============ LINKED ACCOUNTS ============
  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Linked accounts (MKT, Google, Zalo, etc.)',
  })
  linkedAccounts?: LinkedAccount[];

  // ============ INITIAL NOTES ============
  @Field(() => [CreateInitialNoteInput], {
    nullable: true,
    description: 'Initial notes to create with the customer',
  })
  initialNotes?: CreateInitialNoteInput[];

  // Internal fields (set by resolver from auth context, not exposed in GraphQL)
  workspaceId?: string;
  workspaceMemberId?: string;
}

/**
 * Input for updating an existing customer
 *
 * All fields are optional except id
 */
@InputType()
export class UpdateCustomerInput {
  @Field(() => String, { description: 'Customer ID (required)' })
  id: string;

  // ============ BASIC INFO ============
  @Field(() => String, { nullable: true, description: 'Customer name' })
  name?: string;

  @Field(() => String, { nullable: true, description: 'Primary email' })
  email?: string;

  @Field(() => String, { nullable: true, description: 'Phone number' })
  phone?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Căn cước công dân (CCCD)',
  })
  citizenId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Customer type: INDIVIDUAL, BUSINESS, ORGANIZATION',
  })
  type?: string;

  // ============ BUSINESS INFO ============
  @Field(() => String, { nullable: true, description: 'Company name' })
  companyName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Tax code (10 or 13 digits)',
  })
  taxCode?: string;

  @Field(() => String, { nullable: true, description: 'Address' })
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
  @Field(() => String, { nullable: true, description: 'Status' })
  status?: string;

  @Field(() => String, { nullable: true, description: 'Tier' })
  tier?: string;

  @Field(() => String, { nullable: true, description: 'Lifecycle stage' })
  lifecycleStage?: string;

  // ============ RELATIONS ============
  @Field(() => String, {
    nullable: true,
    description: 'Account owner ID (workspace member)',
  })
  accountOwnerId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Support owner ID (workspace member)',
  })
  supportOwnerId?: string;

  // ============ LINKED ACCOUNTS ============
  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Linked accounts (MKT, Google, Zalo, etc.)',
  })
  linkedAccounts?: LinkedAccount[];

  // ============ NEW NOTES ============
  @Field(() => [CreateInitialNoteInput], {
    nullable: true,
    description: 'New notes to add to the customer',
  })
  newNotes?: CreateInitialNoteInput[];

  // Internal fields (set by resolver from auth context, not exposed in GraphQL)
  customerId?: string;
  workspaceId?: string;
}
