import { GqlExecutionContext } from '@nestjs/graphql';

import { Request } from 'express';

import {
  PermissionAction,
  GraphQLOperationType,
  CheckResult,
  PermissionSource,
} from 'src/mkt-core/mkt-rbac/enums/rbac.enums';

// Use centralized enums
export type PermissionCheckResult = CheckResult;

// Use centralized enum
export { PermissionAction, GraphQLOperationType, PermissionSource };

export interface GraphQLPermissionContext {
  action: PermissionAction;
  operationType: GraphQLOperationType;
  operationName: string;
  objectName: string;
  recordId?: string;
  fieldName?: string;
  parentType?: string;
  workspaceMemberId: string;
  workspaceId: string;
  gqlContext?: GqlExecutionContext;
  variables?: Record<string, unknown>;
  selectionSet?: string[];
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface PermissionContext extends GraphQLPermissionContext {
  request?: Request;
}

export interface PermissionResult {
  result: PermissionCheckResult;
  source: PermissionSource;
  reason: string;
  grantedFields?: string[];
  deniedFields?: string[];
  filteredData?: Record<string, unknown> | unknown[];
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface GraphQLAuditContext {
  ipAddress?: string;
  userAgent?: string;
  operationType?: GraphQLOperationType;
  operationName?: string;
  query?: string;
  variables?: Record<string, unknown>;
  sessionId?: string;
  additionalMetadata?: Record<
    string,
    string | number | boolean | null | undefined
  >;
}

export interface AuditContext extends GraphQLAuditContext {
  requestMethod?: string;
  requestPath?: string;
}
