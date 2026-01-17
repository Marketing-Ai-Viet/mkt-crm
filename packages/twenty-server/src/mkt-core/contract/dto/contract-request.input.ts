/**
 * Contract Request Input Types
 *
 * GraphQL input types for Contract queries and mutations.
 */

import { Field, InputType } from '@nestjs/graphql';

import {
  MKT_CONTRACT_STATUS,
  MKT_CONTRACT_TYPE,
} from 'src/mkt-core/contract/constants/mkt-contract-status.constants';

// ============================================
// MUTATION INPUT TYPES
// ============================================

/**
 * Create contract input
 */
@InputType()
export class CreateContractInput {
  @Field(() => String, { description: 'Contract name' })
  name: string;

  @Field(() => String, { nullable: true, description: 'Contract number' })
  contractNumber?: string;

  @Field(() => MKT_CONTRACT_TYPE, {
    nullable: true,
    description: 'Type of contract',
  })
  contractType?: MKT_CONTRACT_TYPE;

  @Field(() => String, { nullable: true, description: 'Contract start date' })
  startDate?: string;

  @Field(() => String, { nullable: true, description: 'Contract end date' })
  endDate?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Date when contract was signed',
  })
  signedDate?: string;

  @Field(() => String, { nullable: true, description: 'Path to contract file' })
  filePath?: string;

  @Field(() => String, { nullable: true, description: 'Contract file name' })
  fileName?: string;

  @Field(() => String, { nullable: true, description: 'Contract description' })
  description?: string;

  @Field(() => String, { nullable: true, description: 'Customer ID' })
  customerId?: string;

  @Field(() => String, { nullable: true, description: 'Account owner ID' })
  accountOwnerId?: string;
}

/**
 * Update contract input
 */
@InputType()
export class UpdateContractInput {
  @Field(() => String, { description: 'Contract ID' })
  id: string;

  @Field(() => String, { nullable: true, description: 'Contract name' })
  name?: string;

  @Field(() => String, { nullable: true, description: 'Contract number' })
  contractNumber?: string;

  @Field(() => MKT_CONTRACT_STATUS, {
    nullable: true,
    description: 'Contract status',
  })
  status?: MKT_CONTRACT_STATUS;

  @Field(() => MKT_CONTRACT_TYPE, {
    nullable: true,
    description: 'Type of contract',
  })
  contractType?: MKT_CONTRACT_TYPE;

  @Field(() => String, { nullable: true, description: 'Contract start date' })
  startDate?: string;

  @Field(() => String, { nullable: true, description: 'Contract end date' })
  endDate?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Date when contract was signed',
  })
  signedDate?: string;

  @Field(() => String, { nullable: true, description: 'Path to contract file' })
  filePath?: string;

  @Field(() => String, { nullable: true, description: 'Contract file name' })
  fileName?: string;

  @Field(() => String, { nullable: true, description: 'Contract description' })
  description?: string;

  @Field(() => String, { nullable: true, description: 'Customer ID' })
  customerId?: string;

  @Field(() => String, { nullable: true, description: 'Account owner ID' })
  accountOwnerId?: string;
}

/**
 * Update contract status input
 */
@InputType()
export class UpdateContractStatusInput {
  @Field(() => String, { description: 'Contract ID' })
  id: string;

  @Field(() => MKT_CONTRACT_STATUS, { description: 'New status' })
  status: MKT_CONTRACT_STATUS;

  @Field(() => String, {
    nullable: true,
    description: 'Reason for status change',
  })
  reason?: string;
}
