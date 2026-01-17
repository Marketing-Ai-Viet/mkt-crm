import { Field, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

/**
 * Output for permission check result
 */
@ObjectType('PermissionResultOutput')
export class PermissionResultOutput {
  @Field(() => Boolean, { description: 'Whether permission is granted' })
  granted: boolean;

  @Field(() => String, {
    description: 'Permission source (ROLE, TEMPLATE, POLICY, TEMPORARY, etc.)',
  })
  source: string;

  @Field(() => String, { nullable: true, description: 'Reason for decision' })
  reason?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Required permissions that were checked',
  })
  requiredPermissions?: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Missing permissions if denied',
  })
  missingPermissions?: string[];

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Additional metadata',
  })
  metadata?: Record<string, unknown>;

  @Field(() => Number, {
    nullable: true,
    description: 'Validation execution time in ms',
  })
  executionTimeMs?: number;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether result was from cache',
  })
  fromCache?: boolean;
}
