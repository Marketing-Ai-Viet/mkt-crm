import { DateTime } from 'luxon';

import {
  HierarchyLevel,
  DepartmentType,
  ReportingRelationship,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/hierarchy.constants';

/**
 * Organization Level Structure
 */
export type OrganizationLevel = {
  id: string;
  name: string;
  level: HierarchyLevel;
  description?: string;
  permissions: string[];
  canDelegate: boolean;
  canEscalate: boolean;
  maxSubordinates?: number;
  departmentRestrictions?: DepartmentType[];
};

/**
 * Department Structure
 */
export type Department = {
  id: string;
  name: string;
  type: DepartmentType;
  parentDepartmentId?: string;
  children?: string[];
  headId?: string; // Department head user ID
  budgetAccess?: boolean;
  crossDepartmentAccess?: boolean;
  sensitiveDataAccess?: boolean;
};

/**
 * Team Structure within Department
 */
export type Team = {
  id: string;
  name: string;
  departmentId: string;
  leadId?: string; // Team lead user ID
  memberIds: string[];
  specialPermissions?: string[];
  resourceAccess?: string[];
};

/**
 * User Hierarchy Position
 */
export type UserHierarchyPosition = {
  userId: string;
  workspaceMemberId: string;

  // Hierarchy information
  hierarchyLevel: HierarchyLevel;
  organizationLevelId: string;
  jobTitle?: string;

  // Department and team
  departmentId: string;
  departmentType: DepartmentType;
  teamId?: string;

  // Reporting relationships
  managerId?: string;
  subordinateIds: string[];
  reportingChain: string[]; // From direct manager to CEO

  // Authority scope
  canManageSubordinates: boolean;
  canAccessPeerData: boolean;
  canEscalateDecisions: boolean;
  canDelegatePermissions: boolean;

  // Cross-department access
  crossDepartmentPermissions: DepartmentType[];
  restrictedDepartments: DepartmentType[];

  // Special authorities
  hasFinancialAuthority?: boolean;
  hasHRAuthority?: boolean;
  hasLegalAuthority?: boolean;
  hasSecurityAuthority?: boolean;

  // Effective from/to dates
  effectiveFrom: DateTime;
  effectiveTo?: DateTime;

  // Last updated
  lastUpdated: DateTime;
  updatedBy: string;
};

/**
 * Hierarchy Access Rules
 */
export type HierarchyAccessRule = {
  id: string;
  name: string;
  description?: string;

  // Source and target levels
  sourceLevel: HierarchyLevel;
  targetLevel: HierarchyLevel;

  // Access type
  accessType: 'READ' | 'WRITE' | 'DELETE' | 'MANAGE';

  // Department restrictions
  sourceDepartments?: DepartmentType[];
  targetDepartments?: DepartmentType[];
  crossDepartmentAllowed: boolean;

  // Conditions
  requiresDirectReporting?: boolean;
  maxLevelDifference?: number;
  requiresApproval?: boolean;

  // Resource restrictions
  resourceTypes?: string[];
  excludedResources?: string[];

  // Time restrictions
  timeRestrictions?: {
    allowedHours?: { start: number; end: number }[];
    allowedDays?: number[];
    businessHoursOnly?: boolean;
  };

  // Status
  isActive: boolean;
  priority: number;

  // Metadata
  createdAt: DateTime;
  createdBy: string;
  lastModified: DateTime;
  modifiedBy: string;
};

/**
 * Hierarchy Validation Context
 */
export type HierarchyValidationContext = {
  // User requesting access
  user: UserHierarchyPosition;

  // Target user/resource being accessed
  target?: {
    userId?: string;
    hierarchyLevel?: HierarchyLevel;
    departmentId?: string;
    teamId?: string;
  };

  // Access details
  accessType: 'READ' | 'WRITE' | 'DELETE' | 'MANAGE';
  resourceType?: string;
  resourceId?: string;

  // Validation rules
  applicableRules: HierarchyAccessRule[];
  requiresEscalation: boolean;
  escalationChain?: string[];

  // Department context
  isDepartmentHead: boolean;
  isTeamLead: boolean;
  isCrossDepartment: boolean;
  isCrossTeam: boolean;

  // Special permissions
  hasEmergencyOverride: boolean;
  hasTemporaryElevation: boolean;
  bypassHierarchy: boolean;
};

/**
 * Hierarchy Validation Result
 */
export type HierarchyValidationResult = {
  // Result
  allowed: boolean;
  reason: string;

  // Applied rules
  appliedRules: string[];
  conflictingRules: string[];

  // Escalation information
  requiresEscalation: boolean;
  escalationTo?: string[];
  escalationReason?: string;

  // Restrictions
  restrictions?: {
    timeLimit?: number; // minutes
    approvalRequired?: boolean;
    monitoringLevel?: 'BASIC' | 'ENHANCED';
    auditRequired?: boolean;
  };

  // Recommendations
  recommendations?: string[];
  alternatives?: string[];

  // Metadata
  validationPath: string[];
  processingTime: number;
};

/**
 * Permission Inheritance Rules
 */
export type PermissionInheritanceRule = {
  id: string;
  name: string;

  // Source hierarchy level that grants permission
  sourceLevel: HierarchyLevel;

  // Target levels that inherit permission
  inheritedByLevels: HierarchyLevel[];

  // Permission details
  permissionType: string;
  permissionScope: 'FULL' | 'LIMITED' | 'READ_ONLY';

  // Inheritance conditions
  conditions: {
    requiresDirectReporting?: boolean;
    sameDepartmentOnly?: boolean;
    maxInheritanceDepth?: number; // How many levels down
    requiresApproval?: boolean;
  };

  // Restrictions on inherited permission
  restrictions?: {
    timeLimit?: number; // minutes
    resourceLimitations?: string[];
    actionLimitations?: string[];
  };

  // Status
  isActive: boolean;
  priority: number;
};

/**
 * Cross-Department Access Matrix
 */
export type CrossDepartmentAccessMatrix = {
  // Source department
  sourceDepartment: DepartmentType;

  // Target department access rules
  targetAccess: {
    [key in DepartmentType]: {
      allowed: boolean;
      requiredLevel?: HierarchyLevel;
      requiresApproval?: boolean;
      approverLevel?: HierarchyLevel;
      restrictions?: string[];
      conditions?: Record<string, unknown>;
    };
  };

  // Special cases
  emergencyAccess: boolean;
  auditOverride: boolean;

  // Last updated
  lastUpdated: DateTime;
  updatedBy: string;
};

/**
 * Hierarchy Navigation Helper
 */
export type HierarchyNavigator = {
  /**
   * Get all subordinates for a user (direct and indirect)
   */
  getSubordinates(
    userId: string,
    direct?: boolean,
  ): Promise<UserHierarchyPosition[]>;

  /**
   * Get reporting chain up to specified level
   */
  getReportingChain(
    userId: string,
    toLevel?: HierarchyLevel,
  ): Promise<UserHierarchyPosition[]>;

  /**
   * Check if user can access target user's data
   */
  canAccessUser(sourceUserId: string, targetUserId: string): Promise<boolean>;

  /**
   * Get relationship between two users
   */
  getRelationship(
    user1Id: string,
    user2Id: string,
  ): Promise<ReportingRelationship>;

  /**
   * Find common manager between users
   */
  findCommonManager(userIds: string[]): Promise<UserHierarchyPosition | null>;

  /**
   * Get users by hierarchy level and department
   */
  getUsersByLevelAndDepartment(
    level: HierarchyLevel,
    department?: DepartmentType,
  ): Promise<UserHierarchyPosition[]>;
};
