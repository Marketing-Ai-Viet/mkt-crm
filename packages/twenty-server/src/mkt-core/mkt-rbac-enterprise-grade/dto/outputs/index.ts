/**
 * DTO Output types barrel export
 */

export * from './permission-result.output';
export * from './validation-result.output';
export * from './paginated-audit-log.output';
export * from './temporary-permission.output';
export * from './user-permission-summary.output';

// Type aliases for resolver compatibility
export { PermissionResultOutput as PermissionCheckResult } from './permission-result.output';
export { AuditLogEntryOutput as AuditLogResult } from './paginated-audit-log.output';
export { PaginatedAuditLogOutput as PaginatedAuditLogs } from './paginated-audit-log.output';
export { TemporaryPermissionOutput as TemporaryPermissionResult } from './temporary-permission.output';
export { UserPermissionSummaryOutput as UserPermissionSummary } from './user-permission-summary.output';

// Batch permission check result
import { ObjectType, Field, Int } from '@nestjs/graphql';

import { PermissionResultOutput } from './permission-result.output';

@ObjectType('BatchPermissionCheckResultOutput')
export class BatchPermissionCheckResult {
  @Field(() => [PermissionResultOutput], {
    description: 'Permission check results',
  })
  results: PermissionResultOutput[];

  @Field(() => Int, { description: 'Total evaluation time in ms' })
  totalTimeMs: number;
}
