import { Field, InputType, Int } from '@nestjs/graphql';

import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

/**
 * Sort direction enum
 */
export enum AuditLogSortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Sort field enum
 */
export enum AuditLogSortField {
  CREATED_AT = 'createdAt',
  ACTION = 'action',
  RESOURCE_TYPE = 'resourceType',
  USER_ID = 'userId',
}

/**
 * Input for querying audit logs
 */
@InputType('QueryAuditLogInput')
export class QueryAuditLogInput {
  @Field(() => String, { nullable: true, description: 'Filter by user ID' })
  @IsString()
  @IsOptional()
  userId?: string;

  @Field(() => String, { nullable: true, description: 'Filter by action' })
  @IsString()
  @IsOptional()
  action?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by resource type',
  })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @Field(() => String, { nullable: true, description: 'Filter by resource ID' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by result (GRANTED, DENIED)',
  })
  @IsString()
  @IsOptional()
  result?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Start date filter (ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @Field(() => String, {
    nullable: true,
    description: 'End date filter (ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @Field(() => Int, { nullable: true, description: 'Page number (default: 1)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Page size (default: 20, max: 100)',
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Sort field (default: createdAt)',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Sort direction (ASC, DESC)',
  })
  @IsString()
  @IsOptional()
  sortDirection?: string;
}
