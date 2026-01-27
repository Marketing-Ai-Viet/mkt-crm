import { Field, InputType } from '@nestjs/graphql';

import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';

/**
 * Input for creating a new customer
 */
@InputType()
export class CreateCustomerInput {
  @Field(() => String, { description: 'Customer name (required)' })
  name: string;

  @Field(() => String, { nullable: true, description: 'Primary email' })
  email?: string;

  @Field(() => String, { nullable: true, description: 'Phone number' })
  phone?: string;

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
    description: 'Status (default: ACTIVE)',
  })
  status?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Tier (default: BRONZE)',
  })
  tier?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Lifecycle stage (default: PROSPECTIVE)',
  })
  lifecycleStage?: string;

  @Field(() => String, { nullable: true, description: 'Notes' })
  notes?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Account owner ID (workspace member)',
  })
  accountOwnerId?: string;

  // Internal fields (set by resolver from auth context, not exposed in GraphQL)
  workspaceId?: string;
  workspaceMemberId?: string;
}

/**
 * Input for updating an existing customer
 */
@InputType()
export class UpdateCustomerInput {
  @Field(() => String, { description: 'Customer ID (required)' })
  id: string;

  @Field(() => String, { nullable: true, description: 'Customer name' })
  name?: string;

  @Field(() => String, { nullable: true, description: 'Primary email' })
  email?: string;

  @Field(() => String, { nullable: true, description: 'Phone number' })
  phone?: string;

  @Field(() => String, { nullable: true, description: 'Company name' })
  companyName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Tax code (10 or 13 digits)',
  })
  taxCode?: string;

  @Field(() => String, { nullable: true, description: 'Address' })
  address?: string;

  @Field(() => String, { nullable: true, description: 'Status' })
  status?: string;

  @Field(() => String, { nullable: true, description: 'Tier' })
  tier?: string;

  @Field(() => String, { nullable: true, description: 'Lifecycle stage' })
  lifecycleStage?: string;

  @Field(() => String, { nullable: true, description: 'Notes' })
  notes?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Account owner ID (workspace member)',
  })
  accountOwnerId?: string;

  // Internal fields (set by resolver from auth context, not exposed in GraphQL)
  customerId?: string;
  workspaceId?: string;
  linkedAccounts?: LinkedAccount[];
}
