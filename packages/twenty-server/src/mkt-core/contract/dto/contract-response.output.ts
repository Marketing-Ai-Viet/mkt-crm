/**
 * Contract Response Output Types
 *
 * GraphQL output types for Contract queries and mutations.
 */

import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import {
  MKT_CONTRACT_STATUS,
  MKT_CONTRACT_TYPE,
} from 'src/mkt-core/contract/constants/mkt-contract-status.constants';

// Register enums for GraphQL
registerEnumType(MKT_CONTRACT_STATUS, {
  name: 'ContractStatus',
  description: 'Contract status values',
});

registerEnumType(MKT_CONTRACT_TYPE, {
  name: 'ContractType',
  description: 'Contract type values',
});

// ============================================
// QUERY OUTPUT TYPES
// ============================================

/**
 * Contract output for query responses
 */
@ObjectType()
export class ContractOutput {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  contractNumber?: string;

  @Field(() => MKT_CONTRACT_STATUS, { nullable: true })
  status?: MKT_CONTRACT_STATUS;

  @Field(() => MKT_CONTRACT_TYPE, { nullable: true })
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

  @Field(() => String, { nullable: true })
  filePath?: string;

  @Field(() => String, { nullable: true })
  fileName?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Number, { nullable: true })
  position?: number;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true })
  accountOwnerId?: string;

  @Field(() => String, { nullable: true })
  createdById?: string;

  @Field(() => String, { nullable: true })
  createdAt?: string;

  @Field(() => String, { nullable: true })
  updatedAt?: string;
}

/**
 * Paginated contracts list response
 */
@ObjectType()
export class ContractListOutput {
  @Field(() => [ContractOutput])
  contracts: ContractOutput[];

  @Field(() => Number)
  totalCount: number;
}

/**
 * Contract status distribution statistics
 */
@ObjectType()
export class ContractStatusDistributionItem {
  @Field(() => String)
  status: string;

  @Field(() => Number)
  count: number;
}

@ObjectType()
export class ContractStatusDistributionOutput {
  @Field(() => [ContractStatusDistributionItem])
  distribution: ContractStatusDistributionItem[];

  @Field(() => Number)
  totalCount: number;
}

/**
 * Customer contract statistics output
 */
@ObjectType()
export class CustomerContractStatsOutput {
  @Field(() => Number, { description: 'Total number of contracts' })
  contractCount: number;

  @Field(() => Number, { description: 'Number of active contracts' })
  activeCount: number;

  @Field(() => Number, { description: 'Number of expired contracts' })
  expiredCount: number;

  @Field(() => String, {
    nullable: true,
    description: 'Earliest contract date',
  })
  firstContractDate?: string;

  @Field(() => String, { nullable: true, description: 'Latest contract date' })
  lastContractDate?: string;
}

/**
 * Expiring contracts output
 */
@ObjectType()
export class ExpiringContractsOutput {
  @Field(() => [ContractOutput])
  contracts: ContractOutput[];

  @Field(() => Number, { description: 'Total number of expiring contracts' })
  totalCount: number;
}

// ============================================
// MUTATION OUTPUT TYPES
// ============================================

/**
 * Create contract response
 */
@ObjectType()
export class CreateContractResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  contractId?: string;

  @Field(() => String, { nullable: true })
  contractNumber?: string;

  @Field(() => MKT_CONTRACT_STATUS, { nullable: true })
  status?: MKT_CONTRACT_STATUS;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Update contract response
 */
@ObjectType()
export class UpdateContractResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  contractId?: string;

  @Field(() => MKT_CONTRACT_STATUS, { nullable: true })
  previousStatus?: MKT_CONTRACT_STATUS;

  @Field(() => MKT_CONTRACT_STATUS, { nullable: true })
  newStatus?: MKT_CONTRACT_STATUS;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Delete contract response
 */
@ObjectType()
export class DeleteContractResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  contractId?: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Restore contract response
 */
@ObjectType()
export class RestoreContractResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  contractId?: string;

  @Field(() => MKT_CONTRACT_STATUS, { nullable: true })
  status?: MKT_CONTRACT_STATUS;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Update contract status response
 */
@ObjectType()
export class UpdateContractStatusResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  contractId?: string;

  @Field(() => MKT_CONTRACT_STATUS, { nullable: true })
  previousStatus?: MKT_CONTRACT_STATUS;

  @Field(() => MKT_CONTRACT_STATUS, { nullable: true })
  newStatus?: MKT_CONTRACT_STATUS;

  @Field(() => String, { nullable: true, description: 'User-friendly message' })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}
