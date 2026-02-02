/**
 * Virtual Account GraphQL Output DTOs
 *
 * Output types for VA GraphQL mutations and queries.
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

/**
 * VA details in response
 */
@ObjectType()
export class VADetailsDto {
  @Field(() => ID, { description: 'VA ID in database' })
  id: string;

  @Field({ description: 'Virtual account number' })
  vaNumber: string;

  @Field({ description: 'Bank code' })
  bankCode: string;

  @Field({ description: 'Bank name' })
  bankName: string;

  @Field({ description: 'Account holder name' })
  accountName: string;

  @Field(() => Int, { description: 'Expected payment amount' })
  amount: number;

  @Field({ nullable: true, description: 'QR code URL for payment' })
  qrCodeUrl?: string;

  @Field({ description: 'VA expiration time (ISO string)' })
  expiresAt: string;

  @Field({ description: 'Provider name (SEPAY, BIDV)' })
  provider: string;
}

/**
 * Output for create VA mutation
 */
@ObjectType()
export class CreateVAOutputDto {
  @Field({ description: 'Whether operation was successful' })
  success: boolean;

  @Field({ description: 'Human-readable message' })
  message: string;

  @Field({ description: 'Creation status code' })
  status: string;

  @Field(() => VADetailsDto, {
    nullable: true,
    description: 'VA details (if created or exists)',
  })
  vaDetails?: VADetailsDto;

  @Field({ nullable: true, description: 'Error message (if failed)' })
  error?: string;

  @Field({ description: 'Whether this is an existing VA (not newly created)' })
  isExisting: boolean;
}

/**
 * Output for deactivate VA mutation
 */
@ObjectType()
export class DeactivateVAOutputDto {
  @Field({ description: 'Whether deactivation was successful' })
  success: boolean;

  @Field({ description: 'Human-readable message' })
  message: string;

  @Field({ nullable: true, description: 'Error message (if failed)' })
  error?: string;
}

/**
 * Output for VA status query
 */
@ObjectType()
export class VAStatusOutputDto {
  @Field({ description: 'VA number' })
  vaNumber: string;

  @Field({ description: 'Whether VA is still active' })
  isActive: boolean;

  @Field({ description: 'Whether VA has been paid' })
  isPaid: boolean;

  @Field(() => Int, { nullable: true, description: 'Amount paid (if paid)' })
  paidAmount?: number;

  @Field({ nullable: true, description: 'Payment time (if paid)' })
  paidAt?: string;
}
