import { GqlExecutionContext } from '@nestjs/graphql';

import { DateTime } from 'luxon';
import { Request } from 'express';

import { RESOURCE_TYPES } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  CheckResult,
  GraphQLOperationType,
  PermissionAction,
  PermissionSource,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

/**
 * Enhanced User Context for Step 2: User Context Resolution
 * Contains comprehensive user information for 15-step validation
 */
export type EnhancedUserContext = {
  // Basic identifiers
  workspaceMemberId: string;
  workspaceId: string;
  userId?: string;
  email?: string;
  disabled: boolean;

  // Hierarchy information (Critical for Step 7)
  hierarchyLevel: number; // 1-11 levels (1=CEO, 11=Intern)
  departmentId?: string;
  departmentName?: string;
  organizationLevelId?: string;

  // Role and status information
  isActive: boolean;
  roles?: string[];
  jobTitle?: string;

  // Reporting relationships (Step 7: Hierarchy Validation)
  managerId?: string;
  subordinateIds?: string[];
  reportingChain?: string[]; // Array of manager IDs up the chain

  // Security context
  lastLoginAt?: DateTime;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;

  // Permission context
  permissionTemplateIds?: string[];
  directPermissions?: string[];
  inheritedPermissions?: string[];
  temporaryElevations?: TemporaryElevation[];

  // Performance tracking
  contextLoadedAt?: DateTime;
  contextSource?: 'CACHE' | 'DATABASE' | 'HYBRID';

  // User enrichment fields (Step 2: User Context Resolution)
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatarUrl?: string;
  timeZone?: string;
  locale?: string;

  // Organizational context
  organizationLevel?: number;
  levelName?: string;
  isManager?: boolean;
  canDelegate?: boolean;
  isDepartmentManager?: boolean;
  canAccessCrossDepartment?: boolean;

  // Enrichment tracking
  isEnriched?: boolean;
  lastEnrichedAt?: DateTime;
  enrichmentSource?: string;
  contextMetadata?: Record<string, string | number | boolean | Date>;
};

/**
 * Temporary Elevation for emergency access (Step 9: Special Permissions)
 */
export type TemporaryElevation = {
  id: string;
  elevationType: 'EMERGENCY' | 'MAINTENANCE' | 'AUDIT' | 'ESCALATION';
  grantedBy: string;
  grantedAt: DateTime;
  expiresAt: DateTime;
  reason: string;
  permissions: string[];
  isActive: boolean;
  metadata?: Record<string, string | number | boolean | Date>;
};

/**
 * Resource Context for Step 3: Resource Identification
 * Contains comprehensive resource information
 */
export type ResourceContext = {
  // Basic resource identification
  objectName: string;
  recordId?: string;
  fieldName?: string;

  // Resource classification
  resourceType: keyof typeof RESOURCE_TYPES;
  resourceCategory: string;
  resourceSubcategory?: string;

  // Ownership and creation information
  ownerId?: string;
  createdBy?: string;
  departmentId?: string;
  organizationLevelId?: string;
  teamId?: string;

  // Security classification (Step 10: Sensitive Data)
  isSystemResource?: boolean;
  isSensitive?: boolean;
  confidentialityLevel?:
    | 'PUBLIC'
    | 'INTERNAL'
    | 'CONFIDENTIAL'
    | 'RESTRICTED'
    | 'TOP_SECRET';
  isFinancialData?: boolean;
  isSalaryData?: boolean;
  isPersonalData?: boolean;
  isAuditData?: boolean;

  // Resource state and metadata
  isActive?: boolean;
  isArchived?: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
  version?: string;

  // Cross-resource dependencies
  dependencies?: {
    requiredResources?: string[];
    blockedByResources?: string[];
    relatedResources?: string[];
  };

  // Data classification metadata
  dataClassification?: {
    containsPII?: boolean;
    containsFinancialInfo?: boolean;
    retentionPeriod?: number; // days
    encryptionRequired?: boolean;
    auditRequired?: boolean;
  };
};

/**
 * Dynamic Conditions for Step 12: Dynamic Conditions
 * Contains time, location, and business rule conditions
 */
export type DynamicConditions = {
  // Time-based restrictions
  timeRestrictions?: {
    allowedHours?: { start: number; end: number }[]; // 24-hour format
    allowedDays?: number[]; // 0-6 (Sunday-Saturday)
    timezone?: string;
    businessHoursOnly?: boolean;
    blockWeekends?: boolean;
    blockHolidays?: boolean;
  };

  // Location-based restrictions
  locationRestrictions?: {
    allowedIPs?: string[];
    allowedCountries?: string[];
    allowedRegions?: string[];
    restrictedIPs?: string[];
    restrictedCountries?: string[];
    restrictedRegions?: string[];
    requireVPN?: boolean;
    requireCorporateNetwork?: boolean;
  };

  // Device-based restrictions
  deviceRestrictions?: {
    allowedUserAgents?: string[];
    restrictedUserAgents?: string[];
    allowedDeviceTypes?: string[];
    restrictedDeviceTypes?: string[];
    requireMFA?: boolean;
    trustedDevicesOnly?: boolean;
    requireCertificate?: boolean;
  };

  // Business rules and workflow
  businessRules?: {
    requireApproval?: boolean;
    approvalThreshold?: number;
    workflowRequired?: boolean;
    blockOnPendingReview?: boolean;
    escalationRequired?: boolean;
    requireJustification?: boolean;
    maxDailyAccess?: number;
    maxConcurrentSessions?: number;
  };

  // Session and rate limiting
  sessionLimits?: {
    maxSessionDuration?: number; // minutes
    maxIdleTime?: number; // minutes
    maxFailedAttempts?: number;
    cooldownPeriod?: number; // minutes
  };
};

/**
 * Permission Template Context for Step 4: Permission Template Check
 * Contains template resolution and hierarchy information
 */
export type PermissionTemplateContext = {
  // Template identification
  templateId?: string;
  templateKey?: string;
  templateName?: string;
  templateType?: 'SYSTEM' | 'CUSTOM' | 'INHERITED';

  // Hierarchy and assignment
  hierarchyLevel?: number;
  isSystemTemplate?: boolean;
  priority?: number;
  version?: string;
  applicableToLevels?: number[];

  // Template relationships and conflicts
  inheritedFrom?: string[];
  overrides?: string[];
  conflicts?: TemplateConflict[];
  resolution?: 'MERGE' | 'OVERRIDE' | 'DENY' | 'ESCALATE';

  // Template metadata
  createdAt?: DateTime;
  createdBy?: string;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
  isActive?: boolean;
  expiresAt?: DateTime;

  // Template collections and processing results
  applicableTemplates?: PermissionTemplateInterface[];
  hierarchyBasedTemplates?: PermissionTemplateInterface[];
  roleBasedTemplates?: PermissionTemplateInterface[];
  departmentBasedTemplates?: PermissionTemplateInterface[];
  customTemplates?: PermissionTemplateInterface[];
  templateConflicts?: TemplateConflict[];
  resolutionStrategy?:
    | 'PRIORITY_BASED'
    | 'MOST_RESTRICTIVE'
    | 'MOST_PERMISSIVE'
    | 'CUSTOM';
  effectivePermissions?: string[];
  inheritanceChain?: string[];
  applicabilityScore?: number;
  lastUpdated?: Date;
};

export type TemplateConflict = {
  conflictType: 'PERMISSION' | 'RESTRICTION' | 'LEVEL';
  templateIds: string[];
  resolution: 'DENY' | 'ALLOW' | 'ESCALATE';
  reason: string;
};

/**
 * Permission Template interface for Step 4
 */
export type PermissionTemplateInterface = {
  id: string;
  name: string;
  templateType:
    | 'ROLE_BASED'
    | 'HIERARCHY_BASED'
    | 'DEPARTMENT_BASED'
    | 'CUSTOM';
  priority: number;
  permissions: string[];
  actions: string[];
  resources: string[];
  conditions: TemplateCondition[];
  restrictions: TemplateRestriction[];
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  metadata: Record<string, string | number | boolean>;
};

/**
 * Template condition interface
 */
export type TemplateCondition = {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number | boolean | string[];
};

/**
 * Template restriction interface
 */
export type TemplateRestriction = {
  type: 'DEPARTMENT' | 'TIME' | 'LOCATION' | 'RESOURCE' | 'ACTION';
  value: string | number | boolean | string[];
};

/**
 * Action Permission Context for Step 5: Action Permission Validation
 * Contains action-specific validation information
 */
export type ActionPermissionContext = {
  // Action classification
  actionType: PermissionAction;
  actionCategory:
    | 'BASIC_CRUD'
    | 'ADVANCED'
    | 'APPROVAL'
    | 'SYSTEM'
    | 'BULK_OPERATIONS'
    | 'TEAM_MANAGEMENT'
    | 'FINANCIAL';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Action requirements
  requiresApproval: boolean;
  isSystemAction: boolean;
  isBulkOperation: boolean;
  isFinancialAction: boolean;
  isSensitiveAction: boolean;

  // Action constraints and limits
  constraints?: {
    maxRecords?: number;
    maxAmount?: number; // for financial actions
    timeWindows?: { start: number; end: number }[];
    prerequisiteActions?: PermissionAction[];
    requiredRole?: string;
    requiredLevel?: number;
  };

  // Approval workflow
  approvalWorkflow?: {
    workflowId?: string;
    requiredApprovers?: string[];
    approvalLevels?: number;
    escalationRules?: ApprovalEscalation[];
  };
};

export type ApprovalEscalation = {
  level: number;
  timeoutHours: number;
  escalateTo: string[];
  autoApprove?: boolean;
};

/**
 * Organizational Hierarchy Context for Step 7: Hierarchy-based Validation
 * Contains organizational hierarchy validation information
 */
export type OrganizationalHierarchyContext = {
  // Thông tin cấp bậc của người dùng hiện tại
  userLevel: number; // Cấp độ trong tổ chức (1=cao nhất, số càng lớn càng thấp)
  userDepartment: string; // Tên phòng ban của người dùng
  userOrgLevel?: string; // Tên chức danh/vị trí (VD: "Manager", "Director")

  // Yêu cầu cấp bậc đích (cho validation)
  targetLevel?: number; // Cấp độ tối thiểu cần thiết để truy cập resource
  targetDepartment?: string; // Phòng ban được phép truy cập
  minimumRequired?: number; // Cấp độ tối thiểu được phép
  maximumAllowed?: number; // Cấp độ tối đa được phép

  // Quy tắc truy cập theo mối quan hệ cấp bậc
  canAccessSubordinates?: boolean; // Có thể truy cập data của cấp dưới không
  canAccessSuperiors?: boolean; // Có thể truy cập data của cấp trên không
  canAccessPeers?: boolean; // Có thể truy cập data của cùng cấp không
  crossDepartmentAccess?: boolean; // Có được truy cập data khác phòng ban không
  crossOrgLevelAccess?: boolean; // Có được truy cập khác cấp tổ chức không

  // Quy tắc điều hướng trong cây cấp bậc
  levelDifference?: number; // Số cấp chênh lệch được phép (VD: manager chỉ quản lý cách 2 cấp)
  reportingChainRequired?: boolean; // Có yêu cầu mối quan hệ báo cáo trực tiếp không
  directReportOnly?: boolean; // Chỉ cho phép truy cập cấp dưới trực tiếp
  skipLevelAllowed?: boolean; // Có cho phép bỏ qua cấp không (VD: Director -> Staff)

  // Quy tắc phòng ban và tổ chức
  departmentHierarchy?: string[]; // Cây phòng ban (từ cao xuống thấp)
  organizationPath?: string[]; // Đường dẫn tổ chức đầy đủ
  inheritanceRules?: HierarchyInheritance[]; // Quy tắc kế thừa quyền từ cấp trên
};

export type HierarchyInheritance = {
  sourceLevel: number; // Cấp nguồn (cấp được kế thừa từ)
  targetLevel: number; // Cấp đích (cấp sẽ kế thừa)
  inheritsPermissions: boolean; // Có kế thừa quyền không
  inheritsParentPermissions: boolean; // Có kế thừa quyền từ cấp cha không
  permissions: {
    canViewTeamData: boolean; // Có thể xem data team
    canEditTeamData: boolean; // Có thể sửa data team
    canExportTeamData: boolean; // Có thể export data team
  };
};

/**
 * Sensitive Data Context for Step 10: Financial/Sensitive Data Checks
 * Contains sensitive data access control information
 */
export type SensitiveDataContext = {
  // Data classification
  dataClassification:
    | 'PUBLIC'
    | 'INTERNAL'
    | 'CONFIDENTIAL'
    | 'RESTRICTED'
    | 'TOP_SECRET';

  // Specific data types
  isSalaryData?: boolean;
  isFinancialData?: boolean;
  isPersonalData?: boolean;
  isAuditData?: boolean;
  isHealthData?: boolean;
  isLegalData?: boolean;

  // Access requirements
  requiresSpecialClearance?: boolean;
  requiresJustification?: boolean;
  requiresWitness?: boolean;
  requiresSecondaryAuth?: boolean;

  // Time and access limits
  maximumAccessDuration?: number; // minutes
  maxDailyAccess?: number;
  accessExpirationTime?: DateTime;

  // Audit and monitoring
  auditLevel?: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
  monitoringRequired?: boolean;
  alertThreshold?: number;

  // Legal and compliance
  complianceFramework?: string[]; // GDPR, HIPAA, SOX, etc.
  legalRetentionPeriod?: number; // days
  disposalMethod?: 'SECURE_DELETE' | 'ARCHIVE' | 'RETAIN';
};

/**
 * Department & Team Context for Step 11: Department & Team Restrictions
 * Contains department and team-based access control information
 */
export type DepartmentTeamContext = {
  // User's department and team information
  userDepartmentId: string;
  userDepartmentName?: string;
  userTeamId?: string;
  userTeamName?: string;

  // Target department and team
  targetDepartmentId?: string;
  targetDepartmentName?: string;
  targetTeamId?: string;
  targetTeamName?: string;

  // Cross-department access
  isCrossDepartment: boolean;
  isCrossTeam?: boolean;
  allowCrossDepartmentAccess?: boolean;
  allowCrossTeamAccess?: boolean;

  // Department hierarchy and relationships
  departmentHierarchy?: string[];
  departmentRelationship?: 'PARENT' | 'CHILD' | 'SIBLING' | 'UNRELATED';
  sharedResources?: boolean;

  // Team management and permissions
  isTeamLead?: boolean;
  isDepartmentHead?: boolean;
  teamMembers?: string[];
  canManageTeam?: boolean;
  canManageDepartment?: boolean;

  // Approval and escalation
  requiresManagerApproval?: boolean;
  requiresDepartmentHeadApproval?: boolean;
  approvalChain?: string[];
};

/**
 * Enhanced Permission Context supporting all 15 validation steps
 * This is the main context object used throughout the validation process
 */
export type EnhancedPermissionContext = {
  // Step 1: Basic validation data
  action: PermissionAction;
  operationType?: GraphQLOperationType;
  operationName?: string;
  requestId?: string; // For tracking

  // Step 2: Enhanced user context
  userContext: EnhancedUserContext;

  // Step 3: Resource context
  resourceContext: ResourceContext;

  // Step 4: Permission template context
  templateContext?: PermissionTemplateContext;

  // Step 5: Action permission context
  actionContext?: ActionPermissionContext;

  // Step 7: Hierarchy validation context
  hierarchyContext?: OrganizationalHierarchyContext;

  // Step 8: Data access policy context
  policyContext?: {
    applicablePolicies?: string[];
    filterConditions?: Record<string, string | number | boolean | Date>;
    priority?: number;
    isDynamic?: boolean;
    evaluationMode?: 'STRICT' | 'PERMISSIVE' | 'BALANCED';
  };

  // Step 9: Special permissions context
  specialPermissions?: {
    hasEmergencyAccess?: boolean;
    hasSystemMaintenance?: boolean;
    hasAuditOverride?: boolean;
    hasComplianceOverride?: boolean;
    temporaryElevation?: TemporaryElevation;
    bypassRestrictions?: string[];
  };

  // Step 10: Sensitive data context
  sensitiveDataContext?: SensitiveDataContext;

  // Step 11: Department & team context
  departmentTeamContext?: DepartmentTeamContext;

  // Step 12: Dynamic conditions
  dynamicConditions?: DynamicConditions;

  // Step 13: Cache context
  cacheContext?: {
    enabled: boolean;
    ttl?: number;
    key?: string;
    useExisting?: boolean;
    forceRefresh?: boolean;
    cacheLevel?: 'MEMORY' | 'REDIS' | 'DATABASE';
  };

  // Step 14: Audit context
  auditContext?: {
    forceAudit?: boolean;
    skipAudit?: boolean;
    auditLevel?: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
    customTags?: string[];
    retentionPeriod?: number; // days
    notificationRequired?: boolean;
  };

  // Request context (REST/GraphQL)
  request?: Request;
  gqlContext?: GqlExecutionContext;

  // Additional context data
  variables?: Record<string, string | number | boolean | Date>;
  selectionSet?: string[];
  parentType?: string;
  metadata?: Record<string, string | number | boolean | Date>;

  // Performance and execution control
  startTime?: number;
  timeoutMs?: number;
  maxExecutionTime?: number;
  skipSteps?: number[]; // Allow skipping specific steps for performance
  priorityLevel?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  executionMode?: 'SYNC' | 'ASYNC' | 'BACKGROUND';

  // Validation control
  validationMode?: 'STRICT' | 'PERMISSIVE' | 'AUDIT_ONLY';
  failFast?: boolean; // Stop at first failure
  continueOnError?: boolean; // Continue validation even on errors
};

/**
 * Enhanced Permission Result with detailed step-by-step information
 * Contains comprehensive result data from 15-step validation
 */
export type EnhancedPermissionResult = {
  // Final result
  result: CheckResult;
  source: PermissionSource;
  reason: string;
  confidence?: number; // 0-100% confidence in result

  // Step-by-step validation results
  stepResults?: ValidationStepResult[];

  // Granted/denied specifics
  grantedFields?: string[];
  deniedFields?: string[];
  filteredData?: Record<string, unknown> | unknown[];
  partialPermissions?: PartialPermission[];

  // Execution metadata
  metadata?: {
    totalDuration?: number;
    stepCount?: number;
    cacheHit?: boolean;
    cacheLevel?: string;
    policiesApplied?: string[];
    templatesUsed?: string[];
    validationPath?: string;
  };

  // Approval and workflow information
  approvalInfo?: {
    required: boolean;
    workflowId?: string;
    approvers?: string[];
    estimatedDuration?: number; // minutes
    escalationRules?: ApprovalEscalation[];
  };

  // Restrictions and conditions
  restrictions?: {
    timeWindows?: { start: DateTime; end: DateTime }[];
    locationLimits?: string[];
    deviceLimits?: string[];
    sessionLimits?: {
      maxDuration?: number;
      maxConcurrent?: number;
    };
  };

  // Warnings, recommendations, and next actions
  warnings?: ValidationWarning[];
  recommendations?: string[];
  nextActions?: string[];

  // Security and audit
  securityFlags?: string[];
  auditRequired?: boolean;
  monitoringLevel?: 'NONE' | 'BASIC' | 'ENHANCED';
};

/**
 * Individual validation step result
 */
export type ValidationStepResult = {
  step: number;
  name: string;
  result: 'PASS' | 'FAIL' | 'SKIP' | 'WARNING';
  duration?: number;
  reason?: string;
  details?: Record<string, string | number | boolean | Date>;
  metadata?: Record<string, string | number | boolean | Date>;
  errors?: string[];
  warnings?: string[];
};

/**
 * Partial permission for granular access control
 */
export type PartialPermission = {
  field: string;
  access: 'READ' | 'WRITE' | 'DELETE';
  conditions?: Record<string, string | number | boolean | Date>;
  restrictions?: string[];
};

/**
 * Validation warning for non-blocking issues
 */
export type ValidationWarning = {
  type: 'SECURITY' | 'PERFORMANCE' | 'COMPLIANCE' | 'POLICY';
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  step?: number;
  metadata?: Record<string, string | number | boolean | Date>;
};

/**
 * Legacy Permission Context for backwards compatibility
 * Maps to existing PermissionContext interface
 */
export type LegacyPermissionContext = {
  action: PermissionAction;
  operationType?: GraphQLOperationType;
  operationName?: string;
  objectName: string;
  recordId?: string;
  fieldName?: string;
  workspaceMemberId: string;
  workspaceId: string;
  request?: Request;
  gqlContext?: GqlExecutionContext;
  variables?: Record<string, string | number | boolean | Date>;
  selectionSet?: string[];
  parentType?: string;
  metadata?: Record<string, string | number | boolean | Date>;
};

/**
 * Context conversion utilities
 */
export type ContextConverter = {
  /**
   * Convert legacy context to enhanced context
   */
  fromLegacy(
    legacy: LegacyPermissionContext,
  ): Promise<EnhancedPermissionContext>;

  /**
   * Convert enhanced context to legacy context (for backwards compatibility)
   */
  toLegacy(enhanced: EnhancedPermissionContext): LegacyPermissionContext;

  /**
   * Merge multiple contexts
   */
  merge(
    contexts: Partial<EnhancedPermissionContext>[],
  ): EnhancedPermissionContext;
};
