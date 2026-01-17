import { Field, InputType, Int } from '@nestjs/graphql';

import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

/**
 * Input for granting temporary permission
 */
@InputType('GrantTemporaryPermissionInput')
export class GrantTemporaryPermissionInput {
  @Field(() => String, { description: 'User ID to grant permission to' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @Field(() => String, {
    description: 'Action to grant (e.g., "read", "write")',
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @Field(() => String, { description: 'Resource type' })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @Field(() => String, { nullable: true, description: 'Specific resource ID' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @Field(() => Int, {
    description: 'Duration in minutes for temporary permission',
  })
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @Field(() => String, {
    description: 'Reason for granting temporary permission',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Additional conditions',
  })
  @IsOptional()
  conditions?: Record<string, unknown>;
}

/**
 * Input for revoking temporary permission
 */
@InputType('RevokeTemporaryPermissionInput')
export class RevokeTemporaryPermissionInput {
  @Field(() => String, { description: 'Temporary permission ID to revoke' })
  @IsString()
  @IsNotEmpty()
  permissionId: string;

  @Field(() => String, { description: 'Reason for revoking' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
