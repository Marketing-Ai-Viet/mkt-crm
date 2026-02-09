/**
 * Email Response Output Types
 *
 * GraphQL output types for Email queries and mutations.
 */

import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { MKT_EMAIL_STATUS } from 'src/mkt-core/mkt-email/constants/mkt-email.constant';

// Register enum for GraphQL
registerEnumType(MKT_EMAIL_STATUS, {
  name: 'EmailStatus',
  description: 'Email status values',
});

// ============================================
// QUERY OUTPUT TYPES
// ============================================

/**
 * Email output for query responses
 */
@ObjectType()
export class EmailOutput {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  subject?: string;

  @Field(() => String, { nullable: true })
  to?: string;

  @Field(() => String, { nullable: true })
  from?: string;

  @Field(() => String, { nullable: true })
  body?: string;

  @Field(() => String, { nullable: true, description: 'Date email was sent' })
  sentAt?: string;

  @Field(() => MKT_EMAIL_STATUS, { nullable: true })
  status?: MKT_EMAIL_STATUS;

  @Field(() => String, { nullable: true })
  emailType?: string;

  @Field(() => Number, { nullable: true })
  position?: number;

  @Field(() => String, { nullable: true })
  accountOwnerId?: string;

  @Field(() => String, { nullable: true })
  createdAt?: string;

  @Field(() => String, { nullable: true })
  updatedAt?: string;
}

/**
 * Paginated emails list response
 */
@ObjectType()
export class EmailListOutput {
  @Field(() => [EmailOutput])
  emails: EmailOutput[];

  @Field(() => Number)
  totalCount: number;
}

/**
 * Email status distribution statistics
 */
@ObjectType()
export class EmailStatusDistributionItem {
  @Field(() => String)
  status: string;

  @Field(() => Number)
  count: number;
}

@ObjectType()
export class EmailStatusDistributionOutput {
  @Field(() => [EmailStatusDistributionItem])
  distribution: EmailStatusDistributionItem[];

  @Field(() => Number)
  totalCount: number;
}

// ============================================
// MUTATION OUTPUT TYPES
// ============================================

/**
 * Create email response
 */
@ObjectType()
export class CreateEmailResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  emailId?: string;

  @Field(() => MKT_EMAIL_STATUS, { nullable: true })
  status?: MKT_EMAIL_STATUS;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Update email response
 */
@ObjectType()
export class UpdateEmailResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  emailId?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Delete email response
 */
@ObjectType()
export class DeleteEmailResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  emailId?: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}
