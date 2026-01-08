import { Field, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

/**
 * Generic linked account output (supports all providers)
 */
@ObjectType()
export class LinkedAccountOutput {
  @Field(() => String, { description: 'Account link ID' })
  id: string;

  @Field(() => String, {
    description: 'Provider (MKT_SERVER, GOOGLE, ZALO, etc.)',
  })
  provider: string;

  @Field(() => String, { description: 'External ID from the provider' })
  externalId: string;

  @Field(() => String, { nullable: true, description: 'Email' })
  email: string | null;

  @Field(() => String, { nullable: true, description: 'Display name' })
  displayName: string | null;

  @Field(() => String, { nullable: true, description: 'Avatar URL' })
  avatarUrl: string | null;

  @Field(() => Boolean, {
    description: 'Whether this is the primary account for this provider',
  })
  isPrimary: boolean;

  @Field(() => String, { description: 'Account link status' })
  status: string;

  @Field(() => String, {
    nullable: true,
    description: 'When the account was linked',
  })
  linkedAt: string | null;

  @Field(() => String, { nullable: true, description: 'Last sync timestamp' })
  lastSyncAt: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Account expiration date',
  })
  expiresAt: string | null;

  @Field(() => String, { nullable: true, description: 'Notes' })
  notes: string | null;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Provider-specific metadata',
  })
  metadata: Record<string, unknown> | null;
}

/**
 * MKT Customer Account Output (legacy compatibility)
 */
@ObjectType()
export class MktCustomerAccountOutput {
  @Field(() => String, { description: 'Account link ID' })
  id: string;

  @Field(() => String, { description: 'MKT Server account ID' })
  mktAccountId: string;

  @Field(() => String, { nullable: true, description: 'MKT Account email' })
  mktAccountEmail: string | null;

  @Field(() => String, { nullable: true, description: 'MKT Account name' })
  mktAccountName: string | null;

  @Field(() => Boolean, {
    description: 'Whether this is the primary account',
  })
  isPrimary: boolean;

  @Field(() => String, { description: 'Account link status' })
  status: string;

  @Field(() => String, {
    nullable: true,
    description: 'When the account was linked',
  })
  linkedAt: string | null;

  @Field(() => String, { nullable: true, description: 'Last sync timestamp' })
  lastSyncAt: string | null;

  @Field(() => String, { nullable: true, description: 'Notes' })
  notes: string | null;

  @Field(() => String, { nullable: true, description: 'Customer ID' })
  mktCustomerId: string | null;
}

@ObjectType()
export class CustomerAccountsOutput {
  @Field(() => [LinkedAccountOutput], {
    description: 'List of linked accounts',
  })
  accounts: LinkedAccountOutput[];

  @Field(() => Number, { description: 'Total number of accounts' })
  totalCount: number;

  @Field(() => LinkedAccountOutput, {
    nullable: true,
    description: 'Primary account',
  })
  primaryAccount: LinkedAccountOutput | null;
}

@ObjectType()
export class LinkAccountOutput {
  @Field(() => Boolean, { description: 'Whether the operation was successful' })
  success: boolean;

  @Field(() => LinkedAccountOutput, {
    nullable: true,
    description: 'The created account link',
  })
  account: LinkedAccountOutput | null;

  @Field(() => String, { nullable: true, description: 'Error message if any' })
  error: string | null;
}

@ObjectType()
export class LinkMktAccountOutput {
  @Field(() => Boolean, { description: 'Whether the operation was successful' })
  success: boolean;

  @Field(() => MktCustomerAccountOutput, {
    nullable: true,
    description: 'The created account link',
  })
  account: MktCustomerAccountOutput | null;

  @Field(() => String, { nullable: true, description: 'Error message if any' })
  error: string | null;
}

@ObjectType()
export class UnlinkAccountOutput {
  @Field(() => Boolean, { description: 'Whether the operation was successful' })
  success: boolean;

  @Field(() => String, { nullable: true, description: 'Error message if any' })
  error: string | null;
}

@ObjectType()
export class UnlinkMktAccountOutput {
  @Field(() => Boolean, { description: 'Whether the operation was successful' })
  success: boolean;

  @Field(() => String, { nullable: true, description: 'Error message if any' })
  error: string | null;
}
