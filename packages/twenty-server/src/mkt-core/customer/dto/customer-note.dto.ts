import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

import {
  MktCustomerNoteType,
  MktCustomerNoteTypeEnum,
} from 'src/mkt-core/customer/constants';

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input for creating a customer note
 */
@InputType()
export class CreateCustomerNoteInput {
  @Field(() => String, { description: 'Customer ID to attach note to' })
  customerId: string;

  @Field(() => String, { description: 'Note content (rich text)' })
  content: string;

  @Field(() => MktCustomerNoteTypeEnum, {
    nullable: true,
    description: 'Note type: GENERAL, CALL, MEETING, ISSUE, FOLLOWUP, OTHER',
    defaultValue: MktCustomerNoteTypeEnum.GENERAL,
  })
  noteType?: MktCustomerNoteType;
}

/**
 * Input for updating a customer note
 */
@InputType()
export class UpdateCustomerNoteInput {
  @Field(() => String, { description: 'Note ID to update' })
  noteId: string;

  @Field(() => String, { nullable: true, description: 'New content' })
  content?: string;

  @Field(() => MktCustomerNoteTypeEnum, {
    nullable: true,
    description: 'New note type',
  })
  noteType?: MktCustomerNoteType;
}

/**
 * Input for querying customer notes
 */
@InputType()
export class GetCustomerNotesInput {
  @Field(() => String, { description: 'Customer ID to get notes for' })
  customerId: string;

  @Field(() => MktCustomerNoteTypeEnum, {
    nullable: true,
    description: 'Filter by note type',
  })
  noteType?: MktCustomerNoteType;

  @Field(() => Int, {
    nullable: true,
    description: 'Maximum records to return',
    defaultValue: 50,
  })
  limit?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Offset for pagination',
    defaultValue: 0,
  })
  offset?: number;
}

// ============================================
// OUTPUT TYPES
// ============================================

/**
 * Single customer note output
 */
@ObjectType()
export class CustomerNoteOutput {
  @Field(() => String, { description: 'Note ID' })
  id: string;

  @Field(() => String, { description: 'Note content' })
  content: string;

  @Field(() => String, { description: 'Note type' })
  noteType: string;

  @Field(() => String, { nullable: true, description: 'Customer ID' })
  customerId: string | null;

  @Field(() => Date, { description: 'Created date' })
  createdAt: Date;

  @Field(() => Date, { description: 'Updated date' })
  updatedAt: Date;
}

/**
 * Paginated customer notes output
 */
@ObjectType()
export class CustomerNoteListOutput {
  @Field(() => [CustomerNoteOutput], { description: 'List of notes' })
  items: CustomerNoteOutput[];

  @Field(() => Int, { description: 'Total count of notes' })
  totalCount: number;
}

/**
 * Delete note result
 */
@ObjectType()
export class DeleteCustomerNoteOutput {
  @Field(() => Boolean, { description: 'Whether deletion was successful' })
  success: boolean;

  @Field(() => String, { nullable: true, description: 'Message' })
  message?: string;
}

/**
 * Note count by type output
 */
@ObjectType()
export class CustomerNoteCountByTypeOutput {
  @Field(() => String, { description: 'Note type' })
  noteType: string;

  @Field(() => Int, { description: 'Count of notes' })
  count: number;
}

/**
 * Customer note statistics output
 */
@ObjectType()
export class CustomerNoteStatisticsOutput {
  @Field(() => Int, { description: 'Total notes for customer' })
  totalNotes: number;

  @Field(() => [CustomerNoteCountByTypeOutput], {
    description: 'Breakdown by note type',
  })
  countByType: CustomerNoteCountByTypeOutput[];
}
