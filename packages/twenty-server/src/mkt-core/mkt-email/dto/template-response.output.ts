/**
 * Template Response Output Types
 *
 * GraphQL output types for Template queries and mutations.
 */

import { Field, ObjectType } from '@nestjs/graphql';

// ============================================
// QUERY OUTPUT TYPES
// ============================================

/**
 * Template output for query responses
 */
@ObjectType()
export class TemplateOutput {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field(() => String, { nullable: true })
  templateKey?: string;

  @Field(() => String, { nullable: true })
  subject?: string;

  @Field(() => String, { nullable: true })
  content?: string;

  @Field(() => String, { nullable: true })
  version?: string;

  @Field(() => String, { nullable: true })
  locale?: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

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
 * Paginated templates list response
 */
@ObjectType()
export class TemplateListOutput {
  @Field(() => [TemplateOutput])
  templates: TemplateOutput[];

  @Field(() => Number)
  totalCount: number;
}

// ============================================
// MUTATION OUTPUT TYPES
// ============================================

/**
 * Create template response
 */
@ObjectType()
export class CreateTemplateResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  templateId?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Update template response
 */
@ObjectType()
export class UpdateTemplateResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  templateId?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Toggle template active response
 */
@ObjectType()
export class ToggleTemplateActiveResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  templateId?: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Delete template response
 */
@ObjectType()
export class DeleteTemplateResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  templateId?: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}
