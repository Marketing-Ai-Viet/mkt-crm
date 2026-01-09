/**
 * DTO Input types barrel export
 */

export * from './check-permission.input';
export * from './query-audit-log.input';
export * from './temporary-permission.input';
export * from './role-assignment.input';

// Type aliases for resolver compatibility
export { CheckPermissionInput as PermissionCheckInput } from './check-permission.input';
export { QueryAuditLogInput as AuditLogQueryInput } from './query-audit-log.input';

// Batch permission check input
import { InputType, Field } from '@nestjs/graphql';

import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';

import { CheckPermissionInput } from './check-permission.input';

@InputType('BatchPermissionCheckInput')
export class BatchPermissionCheckInput {
  @Field(() => [CheckPermissionInput], {
    description: 'List of permission checks',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckPermissionInput)
  checks: CheckPermissionInput[];
}
