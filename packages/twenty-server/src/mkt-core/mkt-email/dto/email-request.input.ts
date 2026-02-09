/**
 * Email Request Input Types
 *
 * GraphQL input types for Email mutations.
 */

import { Field, InputType } from '@nestjs/graphql';

import { MKT_EMAIL_STATUS } from 'src/mkt-core/mkt-email/constants/mkt-email.constant';

// ============================================
// MUTATION INPUT TYPES
// ============================================

/**
 * Create email input
 */
@InputType()
export class CreateEmailInput {
  @Field(() => String, { description: 'Email subject' })
  subject: string;

  @Field(() => String, { nullable: true, description: 'Email recipient' })
  to?: string;

  @Field(() => String, { nullable: true, description: 'Email sender' })
  from?: string;

  @Field(() => String, { nullable: true, description: 'Email body content' })
  body?: string;

  @Field(() => String, { nullable: true, description: 'Type of the email' })
  emailType?: string;

  @Field(() => String, { nullable: true, description: 'Account owner ID' })
  accountOwnerId?: string;
}

/**
 * Update email input
 */
@InputType()
export class UpdateEmailInput {
  @Field(() => String, { description: 'Email ID' })
  id: string;

  @Field(() => String, { nullable: true, description: 'Email subject' })
  subject?: string;

  @Field(() => String, { nullable: true, description: 'Email recipient' })
  to?: string;

  @Field(() => String, { nullable: true, description: 'Email sender' })
  from?: string;

  @Field(() => String, { nullable: true, description: 'Email body content' })
  body?: string;

  @Field(() => MKT_EMAIL_STATUS, {
    nullable: true,
    description: 'Email status',
  })
  status?: MKT_EMAIL_STATUS;

  @Field(() => String, { nullable: true, description: 'Type of the email' })
  emailType?: string;

  @Field(() => String, { nullable: true, description: 'Account owner ID' })
  accountOwnerId?: string;
}

/**
 * Update email status input
 */
@InputType()
export class UpdateEmailStatusInput {
  @Field(() => String, { description: 'Email ID' })
  id: string;

  @Field(() => MKT_EMAIL_STATUS, { description: 'New status' })
  status: MKT_EMAIL_STATUS;
}
