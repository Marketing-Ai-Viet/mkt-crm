import { Field, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

/**
 * Output for temporary permission
 */
@ObjectType('TemporaryPermissionOutput')
export class TemporaryPermissionOutput {
  @Field(() => String, { description: 'Temporary permission ID' })
  id: string;

  @Field(() => String, { description: 'User ID' })
  userId: string;

  @Field(() => String, { description: 'Action granted' })
  action: string;

  @Field(() => String, { description: 'Resource type' })
  resourceType: string;

  @Field(() => String, { nullable: true, description: 'Resource ID' })
  resourceId?: string;

  @Field(() => String, { description: 'Granted by user ID' })
  grantedBy: string;

  @Field(() => String, { description: 'Reason for granting' })
  reason: string;

  @Field(() => Date, { description: 'Expires at timestamp' })
  expiresAt: Date;

  @Field(() => Date, { description: 'Created at timestamp' })
  createdAt: Date;

  @Field(() => Boolean, { description: 'Whether permission is still active' })
  isActive: boolean;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Additional conditions',
  })
  conditions?: Record<string, unknown>;
}

/**
 * Result of granting temporary permission
 */
@ObjectType('GrantTemporaryPermissionOutput')
export class GrantTemporaryPermissionOutput {
  @Field(() => Boolean, { description: 'Whether grant was successful' })
  success: boolean;

  @Field(() => TemporaryPermissionOutput, {
    nullable: true,
    description: 'Created temporary permission',
  })
  permission?: TemporaryPermissionOutput;

  @Field(() => String, {
    nullable: true,
    description: 'Error message if failed',
  })
  error?: string;
}

/**
 * Result of revoking temporary permission
 */
@ObjectType('RevokeTemporaryPermissionOutput')
export class RevokeTemporaryPermissionOutput {
  @Field(() => Boolean, { description: 'Whether revoke was successful' })
  success: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Error message if failed',
  })
  error?: string;
}
