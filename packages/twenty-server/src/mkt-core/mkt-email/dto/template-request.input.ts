/**
 * Template Request Input Types
 *
 * GraphQL input types for Template mutations.
 */

import { Field, InputType } from '@nestjs/graphql';

// ============================================
// MUTATION INPUT TYPES
// ============================================

/**
 * Create template input
 */
@InputType()
export class CreateTemplateInput {
  @Field(() => String, { description: 'Template name' })
  name: string;

  @Field(() => String, { nullable: true, description: 'Template type' })
  type?: string;

  @Field(() => String, { nullable: true, description: 'Template key' })
  templateKey?: string;

  @Field(() => String, { nullable: true, description: 'Email subject' })
  subject?: string;

  @Field(() => String, { nullable: true, description: 'Template content' })
  content?: string;

  @Field(() => String, { nullable: true, description: 'Template version' })
  version?: string;

  @Field(() => String, { nullable: true, description: 'Template locale' })
  locale?: string;

  @Field(() => String, { nullable: true, description: 'Account owner ID' })
  accountOwnerId?: string;
}

/**
 * Update template input
 */
@InputType()
export class UpdateTemplateInput {
  @Field(() => String, { description: 'Template ID' })
  id: string;

  @Field(() => String, { nullable: true, description: 'Template name' })
  name?: string;

  @Field(() => String, { nullable: true, description: 'Template type' })
  type?: string;

  @Field(() => String, { nullable: true, description: 'Template key' })
  templateKey?: string;

  @Field(() => String, { nullable: true, description: 'Email subject' })
  subject?: string;

  @Field(() => String, { nullable: true, description: 'Template content' })
  content?: string;

  @Field(() => String, { nullable: true, description: 'Template version' })
  version?: string;

  @Field(() => String, { nullable: true, description: 'Template locale' })
  locale?: string;

  @Field(() => String, { nullable: true, description: 'Account owner ID' })
  accountOwnerId?: string;
}
