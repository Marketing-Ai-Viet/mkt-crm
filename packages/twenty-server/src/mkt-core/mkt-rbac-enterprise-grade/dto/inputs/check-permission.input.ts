import { Field, InputType } from '@nestjs/graphql';

import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

/**
 * Input for checking permission
 */
@InputType('CheckPermissionInput')
export class CheckPermissionInput {
  @Field(() => String, { description: 'User ID to check permission for' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @Field(() => String, {
    description: 'Action to perform (e.g., "read", "write", "delete")',
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @Field(() => String, {
    description: 'Resource type (e.g., "order", "customer")',
  })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @Field(() => String, {
    nullable: true,
    description: 'Resource ID (optional)',
  })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Additional context (optional)',
  })
  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;
}
