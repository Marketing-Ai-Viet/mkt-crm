/**
 * RBAC System Constants
 * Contains all hard-coded values used throughout the RBAC module
 */
import {
  CheckResult,
  GraphQLOperationType,
  PermissionSource,
} from 'src/mkt-core/mkt-rbac/enums/rbac.enums';

// Use enum values consistent with database
export const PERMISSION_SOURCE_MAPPING = {
  ROLE_BASED: PermissionSource.ROLE,
  DATA_ACCESS_POLICY: PermissionSource.DATA_ACCESS_POLICY,
  TEMPORARY_PERMISSION: PermissionSource.TEMPORARY,
  OWNER_ACCESS: PermissionSource.OWNER_ACCESS,
  PUBLIC_ACCESS: PermissionSource.PUBLIC_ACCESS,
  DEPARTMENT_ACCESS: PermissionSource.DEPARTMENT_ACCESS,
} as const;

// Use centralized enum
export const PERMISSION_RESULT_MAPPING = {
  GRANTED: CheckResult.GRANTED,
  DENIED: CheckResult.DENIED,
  PARTIAL: CheckResult.PARTIAL,
} as const;

// Default permission policies
export const DEFAULT_PERMISSION_SETTINGS = {
  CACHE_ENABLED: true,
  AUDIT_ENABLED: true,
  SECURITY_MONITORING_ENABLED: true,
  DEFAULT_DENIAL_REASON: 'No explicit permission found - default deny',
  BULK_ERROR_REASON_PREFIX: 'Bulk check error',
} as const;

// Safe fields that don't require permission checks
export const SAFE_FIELDS = [
  'id',
  '_id',
  'createdAt',
  'updatedAt',
  'position',
] as const;

// Security threat patterns
export const SECURITY_PATTERNS = {
  SQL_INJECTION: [
    /(\\b(union|select|insert|update|delete|drop|create|alter)\\s+)/i,
    /(;|\\|\\||&&)/,
    /(['"`])/,
  ],
  XSS: [/<script/i, /javascript:/i, /on\\w+\\s*=/i],
  SUSPICIOUS_AGENTS: ['sqlmap', 'nikto', 'nmap', 'masscan'],
} as const;

// HTTP status codes for audit
export const HTTP_STATUS_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
} as const;

// Permission check performance thresholds (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
  SLOW_QUERY_WARNING: 1000,
  VERY_SLOW_QUERY_ERROR: 5000,
} as const;

// GraphQL operation types
export const GRAPHQL_OPERATIONS = {
  QUERY: GraphQLOperationType.QUERY,
  MUTATION: GraphQLOperationType.MUTATION,
  SUBSCRIPTION: GraphQLOperationType.SUBSCRIPTION,
} as const;

// Audit metadata keys
export const AUDIT_METADATA_KEYS = {
  MIDDLEWARE: 'middleware',
  PLUGIN: 'GraphQLPermissionPlugin',
  ENDPOINT: 'endpoint',
  QUERY: 'query',
  OPERATION_PATH: 'operationPath',
  PARENT_TYPE: 'parentType',
  PARENT_DATA: 'parentData',
  FIELD_PATH: 'fieldPath',
  FIELD_ACCESS: 'fieldAccess',
  FORCE_AUDIT: 'forceAudit',
  SKIP_AUDIT: 'skipAudit',
  AUDIT_ONLY: 'auditOnly',
  FAILURE_STATUS_CODE: 'failureStatusCode',
  PERMISSION_RESULT: 'permissionResult',
  FIELD_PERMISSION_DENIED: 'fieldPermissionDenied',
} as const;

// Sensitive objects that require audit
export const SENSITIVE_OBJECTS = [
  'mktDataAccessPolicy',
  'mktTemporaryPermission',
  'workspaceMember',
  'mktPermissionAudit',
] as const;

// Sensitive metadata keys to redact in logs
export const SENSITIVE_METADATA_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
] as const;

// Request paths to skip in logging
export const SKIP_LOGGING_PATHS = [
  '/health',
  '/metrics',
  '/favicon.ico',
] as const;

// Request path patterns to skip in logging
export const SKIP_LOGGING_PATTERNS = [
  /^\/static\//,
  /^\/public\//,
  /\.(js|css|png|jpg|jpeg|gif|ico|svg)$/i,
] as const;

// GraphQL endpoint
export const GRAPHQL_ENDPOINT = '/api/graphql';

// Default values for permission responses
export const DEFAULT_VALUES = {
  MASKED_ID: 'masked',
  REDACTED_VALUE: '[REDACTED]',
  TRUNCATED_SUFFIX: '... [TRUNCATED]',
  UNKNOWN_OBJECT_TYPE: 'unknown',
  UNKNOWN_IP: 'unknown',
  UNKNOWN_USER_AGENT: 'unknown',
  UNKNOWN_LANGUAGE: 'unknown',
} as const;

// String length limits
export const STRING_LIMITS = {
  MIN_ID_LENGTH: 8,
  MASK_PREFIX_LENGTH: 4,
  MASK_SUFFIX_LENGTH: 4,
  MAX_METADATA_STRING_LENGTH: 100,
  MAX_FINGERPRINT_LENGTH: 16,
} as const;

// Permission context field names for extraction
export const USER_EXTRACTION_FIELDS = {
  WORKSPACE_MEMBER_ID: 'x-workspace-member-id',
  WORKSPACE_ID: 'x-workspace-id',
  USER_WORKSPACE_MEMBER_ID: 'workspaceMemberId',
  USER_ID: 'id',
  USER_WORKSPACE_ID: 'workspaceId',
  USER_CURRENT_WORKSPACE_ID: 'currentWorkspaceId',
  WORKSPACE_MEMBER: 'workspaceMember',
  CURRENT_WORKSPACE: 'currentWorkspace',
  CURRENT_USER_WORKSPACE: 'currentUserWorkspace',
} as const;
