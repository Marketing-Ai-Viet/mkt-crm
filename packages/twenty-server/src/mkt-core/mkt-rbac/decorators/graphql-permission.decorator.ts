import { SetMetadata } from '@nestjs/common';

import {
  GraphQLOperationType,
  PermissionAction,
} from 'src/mkt-core/mkt-rbac/enums/rbac.enums';

export const GRAPHQL_PERMISSION_KEY = 'mkt_graphql_rbac_permission';
export const GRAPHQL_FIELD_PERMISSION_KEY = 'mkt_graphql_field_permission';

export interface GraphQLPermissionRequirement {
  action: PermissionAction;
  objectName: string;
  operationType?: GraphQLOperationType;
  recordIdVariable?: string; // Variable name to extract record ID from GraphQL variables
  allowPartial?: boolean;
  skipAudit?: boolean;
  requireOwnership?: boolean;
}

export interface GraphQLFieldPermissionRequirement {
  action: PermissionAction;
  fieldName: string;
  objectName: string;
  allowNull?: boolean; // Return null instead of throwing error
  defaultValue?: string | number | boolean | null | undefined; // Default value when permission denied
}

/**
 * Decorator to require specific permissions for GraphQL resolvers
 *
 * @param requirement - Permission requirement configuration
 *
 * @example
 * ```typescript
 * @Query(() => [MktKpi])
 * @RequireGraphQLPermission({
 *   action: 'QUERY',
 *   objectName: 'mktKpi',
 *   operationType: 'query'
 * })
 * async findMktKpis() { ... }
 *
 * @Mutation(() => MktKpi)
 * @RequireGraphQLPermission({
 *   action: 'MUTATION',
 *   objectName: 'mktKpi',
 *   operationType: 'mutation',
 *   recordIdVariable: 'id'
 * })
 * async updateMktKpi(@Args('id') id: string, @Args('data') data: UpdateMktKpiInput) { ... }
 * ```
 */

export const RequireGraphQLPermission = (
  requirement: GraphQLPermissionRequirement,
) => SetMetadata(GRAPHQL_PERMISSION_KEY, requirement);

/**
 * Decorator for field-level permissions in GraphQL
 *
 * @param requirement - Field permission requirement
 *
 * @example
 * ```typescript
 * @ResolveField(() => String)
 * @RequireFieldPermission({
 *   action: 'FIELD_READ',
 *   fieldName: 'sensitiveData',
 *   objectName: 'mktKpi',
 *   allowNull: true
 * })
 * async sensitiveData(@Parent() kpi: MktKpi) { ... }
 * ```
 */
export const RequireFieldPermission = (
  requirement: GraphQLFieldPermissionRequirement,
) => SetMetadata(GRAPHQL_FIELD_PERMISSION_KEY, requirement);

/**
 * Convenience decorators for GraphQL operations
 */

// Query decorators
export const RequireQuery = (objectName: string, recordIdVariable?: string) =>
  RequireGraphQLPermission({
    action: PermissionAction.QUERY,
    objectName,
    operationType: GraphQLOperationType.QUERY,
    recordIdVariable,
  });

export const RequireQueryList = (objectName: string) =>
  RequireGraphQLPermission({
    action: PermissionAction.QUERY,
    objectName,
    operationType: GraphQLOperationType.QUERY,
  });

// Mutation decorators
export const RequireMutation = (
  objectName: string,
  recordIdVariable?: string,
  requireOwnership = false,
) =>
  RequireGraphQLPermission({
    action: PermissionAction.MUTATION,
    objectName,
    operationType: GraphQLOperationType.MUTATION,
    recordIdVariable,
    requireOwnership,
  });

// Specifically for create mutations where no record ID exists yet
export const RequireCreateMutation = (objectName: string) =>
  RequireGraphQLPermission({
    action: PermissionAction.MUTATION,
    objectName,
    operationType: GraphQLOperationType.MUTATION,
  });

// Specifically for update mutations where record ID is required
export const RequireUpdateMutation = (
  objectName: string,
  recordIdVariable: string,
) =>
  RequireGraphQLPermission({
    action: PermissionAction.MUTATION,
    objectName,
    operationType: GraphQLOperationType.MUTATION,
    recordIdVariable,
    requireOwnership: true,
  });

// Specifically for delete mutations where record ID is required
export const RequireDeleteMutation = (
  objectName: string,
  recordIdVariable: string,
) =>
  RequireGraphQLPermission({
    action: PermissionAction.MUTATION,
    objectName,
    operationType: GraphQLOperationType.MUTATION,
    recordIdVariable,
    requireOwnership: true,
  });

// Subscription decorators
export const RequireSubscription = (objectName: string) =>
  RequireGraphQLPermission({
    action: PermissionAction.SUBSCRIPTION,
    objectName,
    operationType: GraphQLOperationType.SUBSCRIPTION,
  });

// Field permission decorators
export const RequireFieldRead = (
  fieldName: string,
  objectName: string,
  allowNull = false,
) =>
  RequireFieldPermission({
    action: PermissionAction.FIELD_READ,
    fieldName,
    objectName,
    allowNull,
  });

// For fields that require write access (e.g. sensitive fields)
export const RequireFieldWrite = (fieldName: string, objectName: string) =>
  RequireFieldPermission({
    action: PermissionAction.FIELD_WRITE,
    fieldName,
    objectName,
  });

// For sensitive fields where we want to allow null return instead of error
export const RequireSensitiveField = (
  fieldName: string,
  objectName: string,
  defaultValue: string | number | boolean | null | undefined = null,
) =>
  RequireFieldPermission({
    action: PermissionAction.FIELD_READ,
    fieldName,
    objectName,
    allowNull: true,
    defaultValue,
  });
