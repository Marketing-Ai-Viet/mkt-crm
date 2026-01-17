import { Field, ObjectType, Int } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

/**
 * Single audit log entry
 */
@ObjectType('AuditLogEntryOutput')
export class AuditLogEntryOutput {
  @Field(() => String, { description: 'Audit log ID' })
  id: string;

  @Field(() => String, { description: 'User ID who performed the action' })
  userId: string;

  @Field(() => String, { description: 'Action performed' })
  action: string;

  @Field(() => String, { description: 'Resource type' })
  resourceType: string;

  @Field(() => String, { nullable: true, description: 'Resource ID' })
  resourceId?: string;

  @Field(() => String, { description: 'Result (GRANTED, DENIED)' })
  result: string;

  @Field(() => String, { nullable: true, description: 'Reason for result' })
  reason?: string;

  @Field(() => String, { nullable: true, description: 'Permission source' })
  source?: string;

  @Field(() => Int, {
    nullable: true,
    description: 'Validation duration in ms',
  })
  durationMs?: number;

  @Field(() => String, { nullable: true, description: 'IP address' })
  ipAddress?: string;

  @Field(() => String, { nullable: true, description: 'User agent' })
  userAgent?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Additional context',
  })
  context?: Record<string, unknown>;

  @Field(() => Date, { description: 'Created at timestamp' })
  createdAt: Date;
}

/**
 * Pagination info
 */
@ObjectType('PaginationInfoOutput')
export class PaginationInfoOutput {
  @Field(() => Int, { description: 'Current page' })
  page: number;

  @Field(() => Int, { description: 'Page size' })
  pageSize: number;

  @Field(() => Int, { description: 'Total items' })
  totalItems: number;

  @Field(() => Int, { description: 'Total pages' })
  totalPages: number;

  @Field(() => Boolean, { description: 'Has next page' })
  hasNextPage: boolean;

  @Field(() => Boolean, { description: 'Has previous page' })
  hasPreviousPage: boolean;
}

/**
 * Paginated audit log output
 */
@ObjectType('PaginatedAuditLogOutput')
export class PaginatedAuditLogOutput {
  @Field(() => [AuditLogEntryOutput], { description: 'Audit log entries' })
  items: AuditLogEntryOutput[];

  @Field(() => PaginationInfoOutput, { description: 'Pagination info' })
  pagination: PaginationInfoOutput;
}
