import { Field, InputType } from '@nestjs/graphql';

import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

import { LinkedAccountMetadata } from 'src/mkt-core/customer/types/linked-account.types';

/**
 * Generic input for linking any external account
 */
@InputType()
export class LinkAccountInput {
  @Field(() => String, { description: 'Customer ID to link the account to' })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @Field(() => String, {
    description: 'Account provider (MKT_SERVER, GOOGLE, ZALO, etc.)',
  })
  @IsNotEmpty()
  @IsString()
  provider: string;

  @Field(() => String, { description: 'External account ID from the provider' })
  @IsNotEmpty()
  @IsString()
  externalId: string;

  @Field(() => String, { nullable: true, description: 'Email on the account' })
  @IsOptional()
  @IsString()
  email?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Display name on the account',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @Field(() => String, { nullable: true, description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether this should be the primary account for this provider',
    defaultValue: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Additional notes about this account link',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Provider-specific metadata',
  })
  @IsOptional()
  metadata?: LinkedAccountMetadata;
}

/**
 * Input for linking MKT Server account (legacy compatibility)
 */
@InputType()
export class LinkMktAccountInput {
  @Field(() => String, { description: 'Customer ID to link the account to' })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @Field(() => String, { description: 'MKT Server account ID' })
  @IsNotEmpty()
  @IsString()
  mktAccountId: string;

  @Field(() => String, {
    nullable: true,
    description: 'Email on MKT Server account',
  })
  @IsOptional()
  @IsString()
  mktAccountEmail?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Display name on MKT Server account',
  })
  @IsOptional()
  @IsString()
  mktAccountName?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether this should be the primary account',
    defaultValue: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Additional notes about this account link',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class SetPrimaryAccountInput {
  @Field(() => String, { description: 'Customer ID' })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @Field(() => String, { description: 'Account ID to set as primary' })
  @IsNotEmpty()
  @IsString()
  accountId: string;
}

@InputType()
export class UnlinkAccountInput {
  @Field(() => String, { description: 'Customer ID' })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @Field(() => String, { description: 'Account ID to unlink' })
  @IsNotEmpty()
  @IsString()
  accountId: string;
}

/**
 * Legacy input for unlinking MKT account by externalId
 */
@InputType()
export class UnlinkMktAccountInput {
  @Field(() => String, { description: 'Customer ID' })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @Field(() => String, { description: 'MKT Account ID to unlink' })
  @IsNotEmpty()
  @IsString()
  mktAccountId: string;
}
